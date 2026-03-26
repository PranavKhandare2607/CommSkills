import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { AnalyzeCommunicationBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/analyze", async (req, res) => {
  const body = AnalyzeCommunicationBody.parse(req.body);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are an expert communication analyst. Analyze the given text based on the 7 C's of Communication and return a JSON response with exactly these fields:
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
        },
        {
          role: "user",
          content: `Analyze this communication text:\n\n${body.text}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0]?.message?.content ?? "{}",
    );

    res.json({
      overallScore: result.overallScore ?? 70,
      clarityScore: result.clarityScore ?? 70,
      conciseness: result.conciseness ?? 70,
      concreteness: result.concreteness ?? 70,
      correctness: result.correctness ?? 70,
      courtesy: result.courtesy ?? 70,
      grammarScore: result.grammarScore ?? 70,
      feedback: result.feedback ?? "Analysis complete.",
      improvements: result.improvements ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: "Communication analysis failed" });
  }
});

export default router;
