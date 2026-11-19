import { Router, type IRouter } from "express";
import { CheckGrammarBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { checkAndIncrementUsage } from "../lib/subscriptionUtils";
import { chatJson } from "../lib/llm";

const router: IRouter = Router();

router.post("/grammar/check", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const usage = await checkAndIncrementUsage(userId, "grammar");
  if (!usage.allowed) {
    res.status(402).json({ error: "Daily limit reached", limitType: "grammar", limit: usage.limit, remaining: 0 });
    return;
  }
  const body = CheckGrammarBody.parse(req.body);

  try {
    const result = await chatJson({
      system: `You are a professional grammar and writing coach. Analyze the given text for grammar issues and return a JSON response with exactly these fields:
{
  "corrected": "the corrected version of the text",
  "score": number from 0-100 (grammar quality score),
  "improvements": ["array", "of", "specific", "improvements", "made"],
  "explanation": "brief overall explanation of the grammar quality and main issues found"
}
Be specific about what was corrected. If the text is already perfect, set score to 100 and say so in improvements.`,
      messages: [
        {
          role: "user",
          content: `Please check the grammar of this text:\n\n${body.text}`,
        },
      ],
      maxTokens: 700,
    });

    res.json({
      original: body.text,
      corrected: (result as any).corrected ?? body.text,
      score: (result as any).score ?? 75,
      improvements: (result as any).improvements ?? [],
      explanation: (result as any).explanation ?? "Analysis complete.",
    });
  } catch (err) {
    res.status(500).json({ error: "Grammar check failed" });
  }
});

export default router;