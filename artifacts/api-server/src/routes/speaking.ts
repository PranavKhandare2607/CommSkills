import { Router, type IRouter } from "express";
import { SaveSpeakingSessionBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { checkAndIncrementUsage } from "../lib/subscriptionUtils";
import { chatJson } from "../lib/llm";

const router: IRouter = Router();

router.post("/speaking/session", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const usage = await checkAndIncrementUsage(userId, "speaking");
  if (!usage.allowed) {
    res.status(402).json({ error: "Daily limit reached", limitType: "speaking", limit: usage.limit, remaining: 0 });
    return;
  }
  const body = SaveSpeakingSessionBody.parse(req.body);

  try {
    const result = await chatJson({
      system: `You are a professional speaking coach. Analyze the given speech transcript and return a JSON response with exactly these fields:
{
  "feedback": "comprehensive feedback paragraph about clarity, pacing, word choice, and delivery",
  "clarityScore": number 0-100,
  "pacingScore": number 0-100
}
Be encouraging but specific about improvements.`,
      messages: [
        {
          role: "user",
          content: `Analyze this speech transcript (${body.wordCount} words, ${body.duration ?? 0} seconds):\n\n${body.transcript}`,
        },
      ],
      maxTokens: 2048,
    });

    res.json({
      feedback: (result as any).feedback ?? "Good speaking practice session!",
      wordCount: body.wordCount,
      pointsEarned: 10,
      clarityScore: (result as any).clarityScore ?? 75,
      pacingScore: (result as any).pacingScore ?? 75,
    });
  } catch (err) {
    res.status(500).json({ error: "Speaking session analysis failed" });
  }
});

export default router;