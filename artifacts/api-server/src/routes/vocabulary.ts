import { Router, type IRouter } from "express";
import { LookupVocabularyBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { checkAndIncrementUsage } from "../lib/subscriptionUtils";
import { chatJson } from "../lib/llm";

const router: IRouter = Router();

router.post("/vocabulary/lookup", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const usage = await checkAndIncrementUsage(userId, "vocabulary");
  if (!usage.allowed) {
    res.status(402).json({ error: "Daily limit reached", limitType: "vocabulary", limit: usage.limit, remaining: 0 });
    return;
  }
  const body = LookupVocabularyBody.parse(req.body);

  try {
    const result = await chatJson({
      system: `You are a dictionary and vocabulary expert. Look up the given word and return a JSON response with exactly these fields:
{
  "found": true,
  "word": "the word",
  "pronunciation": "/phonetic pronunciation/",
  "definitions": [
    {
      "partOfSpeech": "noun/verb/adjective/etc",
      "definition": "the definition",
      "example": "example sentence using the word"
    }
  ],
  "synonyms": ["synonym1", "synonym2", "synonym3", "synonym4", "synonym5"],
  "antonyms": ["antonym1", "antonym2", "antonym3"]
}
If the word doesn't exist or is not a real word, set "found" to false and provide empty arrays.
Provide 1-3 definitions. Always include the pronunciation in standard IPA notation.`,
      messages: [
        {
          role: "user",
          content: `Look up this word: ${body.word}`,
        },
      ],
      maxTokens: 2048,
    });

    res.json({
      found: (result as any).found ?? false,
      word: (result as any).word ?? body.word,
      pronunciation: (result as any).pronunciation ?? "",
      definitions: (result as any).definitions ?? [],
      synonyms: (result as any).synonyms ?? [],
      antonyms: (result as any).antonyms ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: "Vocabulary lookup failed" });
  }
});

export default router;