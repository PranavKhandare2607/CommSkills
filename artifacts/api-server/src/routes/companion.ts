import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const INTERVIEW_PROMPT = `You are Aisha, a warm, professional female interview coach from India who speaks Indian English. You are conducting a realistic mock job interview with the user.

## Your Role
- You are a senior HR interviewer at a top company
- Your tone is professional, polite, encouraging but evaluative
- You speak naturally in Indian English (occasional "actually", "see", "tell me na")
- Keep responses SHORT (2-4 sentences max) — this is a SPOKEN conversation, not an essay

## Interview Flow
1. If this is the first message, greet the user warmly and ask the first question: "Tell me about yourself."
2. Listen to their answer, acknowledge it briefly with one specific compliment or note (e.g. "Good, I like how you mentioned X.")
3. Then ask the NEXT question naturally. Rotate through these:
   - Tell me about yourself
   - What are your strengths?
   - What are your weaknesses?
   - Why should we hire you?
   - Describe a challenge you faced and how you handled it
   - Where do you see yourself in 5 years?
   - Why do you want to work with us?
   - Tell me about a time you worked in a team
   - Do you have any questions for me?

## Feedback Style
- After each answer, give 1 short, actionable tip in italics like *(Tip: try using the STAR method — Situation, Task, Action, Result.)*
- Comment on confidence, clarity, structure when relevant
- Keep it constructive and warm

## Important
- NEVER write long paragraphs — this is voice conversation
- ALWAYS end your turn with a clear question for the user
- Stay in character as Aisha, a real human interviewer
- Use simple natural language — no bullet points or markdown headers in your replies
- If user asks something off-topic, gently steer back: "That's interesting, but let me ask you another question..."`;

const FRIEND_PROMPT = `You are Priya, a sweet, caring female best friend from India who speaks Indian English. You're chatting with the user like a real friend would.

## Your Personality
- Warm, friendly, supportive, full of positive energy
- You speak in casual Indian English with natural expressions ("yaar", "hmm", "haan", "actually", "you know what...")
- You CARE about the user — ask about their day, feelings, dreams
- You celebrate their wins, listen when they're down, give honest advice when asked
- You're like that one friend who always knows the right thing to say

## Conversation Style
- Keep responses SHORT (2-4 sentences) — this is a SPOKEN conversation
- Always sound natural, never robotic or formal
- Ask follow-up questions to keep the conversation flowing
- Share little stories or your own thoughts to feel real
- Use occasional emojis sparingly (😊 ✨ 💪 ❤️) — but don't overdo it

## Topics You Love
- Studies, exams, college life
- Career dreams and confusions
- Daily life, fun stories, weekend plans
- Motivation when user feels low
- Communication tips (you secretly know a lot!)
- Movies, books, music, food
- Relationships (friends, family — keep it positive)

## Important
- Be a FRIEND first, coach second — don't lecture
- If user shares something sad, validate their feelings before giving advice
- If user asks for help with communication or English, gently correct/improve their sentences
- NEVER write long paragraphs — keep it like a real chat
- ALWAYS keep the conversation going by asking something or sharing your view
- No markdown formatting — speak naturally
- Stay positive and safe — if user shares something concerning, encourage them to talk to someone they trust`;

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  english: `\n\n## LANGUAGE
- Respond in clear, natural ENGLISH only.
- The user may speak English, Hindi, or a mix — but ALWAYS reply in English.
- Keep your English warm and easy to understand.`,
  hindi: `\n\n## LANGUAGE / भाषा
- सिर्फ हिंदी (देवनागरी लिपि) में जवाब दीजिए।
- उपयोगकर्ता हिंदी, अंग्रेज़ी या मिक्स में बात कर सकता है, लेकिन आप हमेशा शुद्ध हिंदी (देवनागरी) में ही जवाब दीजिए।
- भाषा सरल, गर्मजोशी भरी और बातचीत जैसी रखिए। बहुत कठिन शब्द मत इस्तेमाल कीजिए।
- तकनीकी शब्द (interview, resume, communication, software, etc.) अंग्रेज़ी में रखे जा सकते हैं, बाकी सब हिंदी में।`,
  hinglish: `\n\n## LANGUAGE — HINGLISH (Hindi + English mix in Roman script)
- Respond in HINGLISH — Hindi written in English/Roman letters mixed naturally with English words. This is how young Indians chat.
- Examples: "Haan bilkul, tell me about yourself.", "Achha, that's a great point yaar!", "Aap apne strengths ke baare mein bata sakte hain?"
- Do NOT use Devanagari script. Write Hindi words in Roman letters (e.g. "kaise ho", "matlab", "samjha").
- Mix English and Hindi naturally — don't force either language.
- Keep it casual, warm, and easy to understand.`,
};

router.post("/companion/respond", async (req, res) => {
  try {
    const { mode, history, message, language } = req.body || {};
    if (mode !== "interview" && mode !== "friend") {
      return res.status(400).json({ error: "mode must be 'interview' or 'friend'" });
    }
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    const safeHistory = Array.isArray(history)
      ? history
          .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
          .map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content }))
      : [];

    const langKey = language === "hindi" || language === "hinglish" ? language : "english";
    const langInstruction = LANGUAGE_INSTRUCTIONS[langKey] || LANGUAGE_INSTRUCTIONS.english;
    const basePrompt = mode === "interview" ? INTERVIEW_PROMPT : FRIEND_PROMPT;
    const systemPrompt = basePrompt + langInstruction;

    const chatMessages = [
      { role: "system" as const, content: systemPrompt },
      ...safeHistory,
      { role: "user" as const, content: message },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 800,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Companion error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || "Companion error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Failed to respond" })}\n\n`);
      res.end();
    }
  }
});

router.post("/companion/feedback", async (req, res) => {
  try {
    const { mode, transcript, observations } = req.body || {};
    if (mode !== "interview" && mode !== "friend") {
      return res.status(400).json({ error: "mode must be 'interview' or 'friend'" });
    }
    const safeTranscript = Array.isArray(transcript)
      ? transcript.filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      : [];
    const userMessages = safeTranscript.filter((m: any) => m.role === "user");
    const userText = userMessages.map((m: any) => m.content).join(" ");
    const obs = observations || {};

    const prompt = mode === "interview"
      ? `Analyze this mock interview session and provide feedback as a JSON object only (no markdown, no explanation).

Transcript of user's answers: "${userText}"
Questions answered: ${obs.questionsAnswered ?? userMessages.length}
Camera on: ${obs.cameraOnPercent ?? 100}% of session
Speaking time: ${obs.speakingTime ?? 0} seconds

Return ONLY valid JSON in this EXACT shape:
{"communicationScore": <0-100>, "confidenceLevel": <0-100>, "clarityScore": <0-100>, "grammarScore": <0-100>, "summary": "<2-sentence overall feedback>", "strengths": ["<3 specific strengths>"], "improvements": ["<3 specific actionable suggestions>"]}`
      : `Analyze this casual conversation and provide friendly feedback as a JSON object only (no markdown, no explanation).

Transcript of user's messages: "${userText}"
Camera on: ${obs.cameraOnPercent ?? 100}% of session

Return ONLY valid JSON in this EXACT shape:
{"communicationScore": <0-100>, "confidenceLevel": <0-100>, "clarityScore": <0-100>, "grammarScore": <0-100>, "summary": "<2-sentence warm friendly summary>", "strengths": ["<3 things user did well>"], "improvements": ["<3 gentle suggestions to improve communication>"]}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 1000,
      messages: [
        { role: "system", content: "You are a communication skills assessor. Always respond with valid JSON only, no markdown wrappers." },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    res.json({
      communicationScore: parsed.communicationScore ?? 70,
      confidenceLevel: parsed.confidenceLevel ?? 70,
      clarityScore: parsed.clarityScore ?? 70,
      grammarScore: parsed.grammarScore ?? 70,
      summary: parsed.summary ?? "You did a great job in this session!",
      strengths: parsed.strengths ?? ["Clear voice", "Good engagement", "Stayed on topic"],
      improvements: parsed.improvements ?? ["Maintain steady eye contact", "Speak with more confidence", "Use the STAR method for answers"],
    });
  } catch (err: any) {
    console.error("Feedback error:", err);
    res.status(500).json({ error: err.message || "Feedback error" });
  }
});

export default router;
