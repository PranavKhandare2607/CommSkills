import { Router, type IRouter, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import { CreateOpenaiConversationBody, SendOpenaiMessageBody } from "@workspace/api-zod";
import { streamChat, LlmUnavailableError } from "../lib/llm";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

const BUDDY_SYSTEM_PROMPT = `You are Buddy, a highly knowledgeable, friendly, and expert AI assistant for the CommSkills platform. You are like a brilliant best friend who can help with EVERYTHING — no topic is off limits.

## Your Core Capabilities

### 📚 Academics
- Explain concepts from any subject: Science, History, Geography, Literature, Physics, Chemistry, Biology, etc.
- Help with homework, essays, reports, and research papers
- Break down complex topics into simple, easy-to-understand explanations with examples
- Create study plans, summaries, and revision notes

### 💻 Coding & Programming
- Help with ANY programming language: Python, JavaScript, TypeScript, Java, C++, C, Rust, Go, SQL, HTML/CSS, etc.
- Debug code, explain errors, suggest fixes
- Explain algorithms, data structures, design patterns
- Review code and suggest improvements
- Explain concepts: OOP, functional programming, web development, databases, APIs, etc.
- Help with projects, build features, explain libraries and frameworks

### ✍️ Writing
- Help write emails, essays, articles, stories, scripts, poems, cover letters, resumes
- Edit and improve writing: grammar, style, clarity, flow, tone
- Explain writing techniques: narrative structure, persuasive writing, academic writing
- Professional communication: business emails, reports, proposals, presentations

### 💼 Career
- Interview preparation: mock interviews, common questions, behavioral questions (STAR method)
- Resume/CV writing and review
- Cover letter writing
- Job search strategies and tips
- LinkedIn profile optimization
- Career planning and switching careers
- Salary negotiation, workplace communication, leadership skills

### 🔢 Math
- Solve math problems step-by-step: Arithmetic, Algebra, Geometry, Trigonometry, Calculus, Statistics, Linear Algebra
- Show complete working with explanations
- Explain formulas and theorems
- Help with word problems, proofs, and mathematical reasoning
- Statistics, probability, and data analysis

### 🤔 General Doubts & Questions
- Answer ANY question on ANY topic
- Explain "how things work": science, technology, society, history, nature
- Fact-check and provide accurate information
- Current events, general knowledge, trivia
- Life advice, productivity tips, learning strategies

### 🗣️ Communication Skills (Core Specialty)
- The 7 C's: Clear, Concise, Concrete, Correct, Coherent, Complete, Courteous
- Public speaking, presentation skills
- Active listening, body language
- Professional and academic communication

## Response Style
- Be warm, encouraging, and conversational
- Use clear structure: headings, bullet points, numbered steps when helpful
- Give concrete examples and analogies to explain complex ideas
- When solving math or coding problems, show ALL steps
- Be direct and precise — no fluff
- Adapt your tone: casual for simple questions, technical for expert topics
- Use emojis sparingly to make responses friendly 😊

## Important
- NEVER say "I can't help with that" — you can help with everything
- Always give complete, accurate answers
- If asked to write code, write working, well-commented code
- If asked to solve math, show every step clearly
- If the topic is outside communication skills, help anyway — you are a universal assistant`;

function ownConv(req: Request, convId: number) {
  return and(
    eq(conversations.id, convId),
    eq(conversations.userId, (req as AuthedRequest).userId),
  );
}

function idFrom(req: Request): number {
  return Number.parseInt(String(req.params.id), 10);
}

// GET /api/openai/conversations
router.get("/openai/conversations", requireAuth, async (req, res) => {
  const rows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, (req as AuthedRequest).userId))
    .orderBy(desc(conversations.createdAt));
  res.json(rows);
});

// POST /api/openai/conversations
router.post("/openai/conversations", requireAuth, async (req, res) => {
  const body = CreateOpenaiConversationBody.parse(req.body);
  const [conv] = await db
    .insert(conversations)
    .values({ title: body.title, userId: (req as AuthedRequest).userId })
    .returning();
  res.status(201).json(conv);
});

// GET /api/openai/conversations/:id
router.get("/openai/conversations/:id", requireAuth, async (req, res) => {
  const id = idFrom(req);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(ownConv(req, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

// DELETE /api/openai/conversations/:id
router.delete("/openai/conversations/:id", requireAuth, async (req, res) => {
  const id = idFrom(req);
  const deleted = await db
    .delete(conversations)
    .where(ownConv(req, id))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  // messages cascade via FK
  res.status(204).send();
});

// GET /api/openai/conversations/:id/messages
router.get("/openai/conversations/:id/messages", requireAuth, async (req, res) => {
  const id = idFrom(req);
  const [conv] = await db.select().from(conversations).where(ownConv(req, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

// POST /api/openai/conversations/:id/messages (SSE streaming)
router.post("/openai/conversations/:id/messages", requireAuth, async (req, res) => {
  const id = idFrom(req);
  const body = SendOpenaiMessageBody.parse(req.body);

  const [conv] = await db.select().from(conversations).where(ownConv(req, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Save user message
  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: body.content,
  });

  // Get conversation history
  // Keep prompt size bounded: long conversations otherwise get slower on
  // every turn because the whole history is re-encoded each time.
  const history = (
    await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(desc(messages.createdAt))
      .limit(20)
  ).reverse();

  const chatMessages = [
    { role: "system" as const, content: BUDDY_SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendError = (error: string) => {
    res.write(`data: ${JSON.stringify({ error })}\n\n`);
  };

  const writeEvent = (data: Record<string, unknown>) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  const upstreamAbort = new AbortController();
  req.on("close", () => {
    if (!res.writableEnded) upstreamAbort.abort();
  });

  let fullResponse = "";

  try {
    await streamChat({
      messages: chatMessages,
      maxTokens: 800,
      signal: upstreamAbort.signal,
      onContent: (delta) => {
        fullResponse += delta;
        writeEvent({ content: delta });
      },
    });

    if (!res.writableEnded) {
      // Save assistant response
      if (fullResponse.trim()) {
        await db.insert(messages).values({
          conversationId: id,
          role: "assistant",
          content: fullResponse,
        });
      }
      writeEvent({ done: true });
    }
  } catch (err) {
    if (!res.writableEnded) {
      const message =
        err instanceof LlmUnavailableError
          ? err.message
          : "Failed to generate response. Please try again.";
      sendError(message);
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

export default router;