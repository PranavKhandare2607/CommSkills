import { Router, type IRouter } from "express";
import { AnalyzeCommunicationBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { checkLockedFeatureAccess } from "../lib/subscriptionUtils";
import { chatJson } from "../lib/llm";

const router: IRouter = Router();

router.post("/analyze", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const hasAccess = await checkLockedFeatureAccess(userId);
  if (!hasAccess) {
    res.status(402).json({ error: "Premium required", limitType: "analyzer", locked: true });
    return;
  }
  const body = AnalyzeCommunicationBody.parse(req.body);

  try {
    const result = await chatJson({
      system: `You are an expert communication analyst. Analyze the given text based on the 7 C's of Communication and return a JSON response with exactly these fields:
{
  "overallScore": number 0-100,
  "clarityScore": number 0-100,
  "conciseness": number 0-100,
  "concreteness": number 0-100,
  "correctness": number 0-100,
  "courtesy": number 0-100,
  "grammarScore": number 0-100,
  "feedback": "overall feedback paragraph",
  "improvements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"]
}
Be constructive and specific. Analyze each C of Communication separately.`,
      messages: [
        {
          role: "user",
          content: `Analyze this communication text:\n\n${body.text}`,
        },
      ],
      maxTokens: 900,
    });

    res.json({
      overallScore: (result as any).overallScore ?? 70,
      clarityScore: (result as any).clarityScore ?? 70,
      conciseness: (result as any).conciseness ?? 70,
      concreteness: (result as any).concreteness ?? 70,
      correctness: (result as any).correctness ?? 70,
      courtesy: (result as any).courtesy ?? 70,
      grammarScore: (result as any).grammarScore ?? 70,
      feedback: (result as any).feedback ?? "Analysis complete.",
      improvements: (result as any).improvements ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: "Communication analysis failed" });
  }
});

export default router;