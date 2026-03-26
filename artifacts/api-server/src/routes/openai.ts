import { Router, type IRouter } from "express";
import { db, conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import {
  CreateOpenaiConversationBody,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /openai/conversations
router.get("/openai/conversations", async (req, res) => {
  const convs = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.createdAt));
  res.json(convs);
});

// POST /openai/conversations
router.post("/openai/conversations", async (req, res) => {
  const body = CreateOpenaiConversationBody.parse(req.body);
  const [conv] = await db
    .insert(conversations)
    .values({ title: body.title })
    .returning();
  res.status(201).json(conv);
});

// GET /openai/conversations/:id
router.get("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id));
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

// DELETE /openai/conversations/:id
router.delete("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(messages).where(eq(messages.conversationId, id));
  const deleted = await db
    .delete(conversations)
    .where(eq(conversations.id, id))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(204).send();
});

// GET /openai/conversations/:id/messages
router.get("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);
  res.json(msgs);
});

// POST /openai/conversations/:id/messages (SSE streaming)
router.post("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const body = SendOpenaiMessageBody.parse(req.body);

  // Save user message
  await db.insert(messages).values({
    conversationId: id,
    role: "user",
    content: body.content,
  });

  // Get conversation history
  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // Add system prompt for Buddy AI
  chatMessages.unshift({
    role: "system",
    content: `You are Buddy, a friendly and expert AI Communication Coach for the CommSkills platform. 
You help users improve their communication skills including:
- The 7 C's of Communication (Clear, Concise, Concrete, Correct, Coherent, Complete, Courteous)
- Grammar correction and improvement
- Vocabulary building and word usage
- Interview preparation and tips
- Professional email writing
- Public speaking and presentation skills

Be encouraging, practical, and give specific examples. Keep responses clear and well-structured using bullet points or numbered lists when appropriate. Always relate advice back to real-world communication situations.`,
  });

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Save assistant response
    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`,
    );
  } finally {
    res.end();
  }
});

export default router;
