import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { SaveSpeakingSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/speaking/session", async (req, res) => {
  const body = SaveSpeakingSessionBody.parse(req.body);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a professional speaking coach. Analyze the given speech transcript and return a JSON response with exactly these fields:
{
  "feedback": "comprehensive feedback paragraph about clarity, pacing, word choice, and delivery",
  "clarityScore": number 0-100,
  "pacingScore": number 0-100
}
Be encouraging but specific about improvements.`,
        },
        {
          role: "user",
          content: `Analyze this speech transcript (${body.wordCount} words, ${body.duration ?? 0} seconds):\n\n${body.transcript}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0]?.message?.content ?? "{}",
    );

    res.json({
      feedback: result.feedback ?? "Good speaking practice session!",
      wordCount: body.wordCount,
      pointsEarned: 10,
      clarityScore: result.clarityScore ?? 75,
      pacingScore: result.pacingScore ?? 75,
    });
  } catch (err) {
    res.status(500).json({ error: "Speaking session analysis failed" });
  }
});

export default router;
