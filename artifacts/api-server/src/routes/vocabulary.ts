import { Router, type IRouter } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { LookupVocabularyBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/vocabulary/lookup", async (req, res) => {
  const body = LookupVocabularyBody.parse(req.body);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `You are a dictionary and vocabulary expert. Look up the given word and return a JSON response with exactly these fields:
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
        },
        {
          role: "user",
          content: `Look up this word: ${body.word}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      response.choices[0]?.message?.content ?? "{}",
    );

    res.json({
      found: result.found ?? false,
      word: result.word ?? body.word,
      pronunciation: result.pronunciation ?? "",
      definitions: result.definitions ?? [],
      synonyms: result.synonyms ?? [],
      antonyms: result.antonyms ?? [],
    });
  } catch (err) {
    res.status(500).json({ error: "Vocabulary lookup failed" });
  }
});

export default router;
