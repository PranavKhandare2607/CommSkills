import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { CheckGrammarBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/grammar/check", async (req, res) => {
  const body = CheckGrammarBody.parse(req.body);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a professional grammar and writing coach. Analyze the given text for grammar issues and return a JSON response with exactly these fields:
{
  "corrected": "the corrected version of the text",
  "score": number from 0-100 (grammar quality score),
  "improvements": ["array", "of", "specific", "improvements", "made"],
  "explanation": "brief overall explanation of the grammar quality and main issues found"
}
Be specific about what was corrected. If the text is already perfect, set score to 100 and say so in improvements.`,
        },
        {
          role: "user",
          content: `Please check the grammar of this text:\n\n${body.text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0]?.message?.content ?? "{}",
    );

    res.json({
      original: body.text,
      corrected: result.corrected ?? body.text,
      score: result.score ?? 75,
      improvements: result.improvements ?? [],
      explanation: result.explanation ?? "Analysis complete.",
    });
  } catch (err) {
    res.status(500).json({ error: "Grammar check failed" });
  }
});

export default router;
