import { Router, type IRouter } from "express";
import { LookupVocabularyBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { checkAndIncrementUsage } from "../lib/subscriptionUtils";
import { chatJson } from "../lib/llm";

const router: IRouter = Router();

const VOCAB_SYSTEM = `You are a dictionary and vocabulary expert. Look up the given English word and return a JSON response with exactly these fields:
{
  "found": true,
  "word": "the word",
  "pronunciation": "/phonetic pronunciation/",
  "verbs": [
    { "word": "the verb form", "meaning": "what this verb means", "example": "a natural sentence using it" },
    { "word": "the verb form", "meaning": "a DIFFERENT verb meaning", "example": "a different natural sentence using it" }
  ],
  "nouns": [
    { "word": "the noun form", "meaning": "what this noun means", "example": "a natural sentence using it" },
    { "word": "the noun form", "meaning": "a DIFFERENT noun meaning", "example": "a different natural sentence using it" }
  ],
  "synonyms": ["synonym1", "synonym2", "synonym3", "synonym4"],
  "antonyms": ["antonym1", "antonym2", "antonym3", "antonym4"]
}

STRICT RULES:
- "verbs" MUST contain EXACTLY 2 items. "nouns" MUST contain EXACTLY 2 items. No more, no fewer.
- The TWO verb meanings MUST be different senses of the word, and the TWO noun meanings MUST be different senses. Put the most common sense first and a clearly different second sense. Never repeat the same meaning or the same example.
- Every verb and noun item MUST have a short "meaning" and a natural example "example" sentence that uses the word.
- If the word is not normally used as a verb or noun, use the closest related derived form with the same root.
- "synonyms" and "antonyms" MUST contain ONLY single words (plain strings). Never put meanings, explanations, or sentences in them, and never include the headword itself.
- If the word doesn't exist or is not a real English word, set "found" to false and use empty arrays.
- Always include the pronunciation in standard IPA notation.`;

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

function asDefinitions(items: any[], pos: "verb" | "noun") {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      partOfSpeech: pos,
      definition: String(item.meaning ?? item.definition ?? "").trim(),
      example: String(item.example ?? "").trim(),
    }))
    .filter((item) => item.definition.length > 0)
    .slice(0, 2);
}

function hasTwoDistinctEach(result: any): boolean {
  const valid = (items: any[]) =>
    Array.isArray(items) &&
    items.length === 2 &&
    items.every((item) => normalize(String(item?.meaning ?? "")) && normalize(String(item?.example ?? ""))) &&
    normalize(String(items[0]?.meaning ?? "")) !== normalize(String(items[1]?.meaning ?? ""));

  return valid(result?.verbs) && valid(result?.nouns);
}

function cleanWords(items: any[], headword: string): string[] {
  const head = normalize(headword);
  const seen = new Set<string>();
  return (Array.isArray(items) ? items : [])
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .map((item) => item.trim())
    .filter((item) => {
      const key = normalize(item);
      if (!key || key === head || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((item) => !/\s/.test(item)) // single words only
    .slice(0, 6);
}

router.post("/vocabulary/lookup", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const usage = await checkAndIncrementUsage(userId, "vocabulary");
  if (!usage.allowed) {
    res.status(402).json({ error: "Daily limit reached", limitType: "vocabulary", limit: usage.limit, remaining: 0 });
    return;
  }
  const body = LookupVocabularyBody.parse(req.body);

  try {
    let result: any = await chatJson({
      system: VOCAB_SYSTEM,
      messages: [{ role: "user", content: `Look up this word: ${body.word}` }],
      maxTokens: 1200,
      temperature: 0.1,
    });

    // Retry once with the rejected draft attached so the model can replace
    // repeated senses instead of regenerating the same answer.
    if (result?.found !== false && !hasTwoDistinctEach(result)) {
      result = await chatJson({
        system: `${VOCAB_SYSTEM}\n\nCORRECTION: Rewrite the draft so each pair has two clearly DIFFERENT meanings (the common sense first, then a distinct second sense) with different example sentences. Do not include the headword in synonyms or antonyms.`,
        messages: [{
          role: "user",
          // A nonce keeps the corrective call from replaying a cached bad answer.
          content: `Look up "${body.word}" (retry ${Date.now()}). This draft repeats a meaning: ${JSON.stringify(result)}. Return the corrected full JSON with two distinct verb senses and two distinct noun senses.`,
        }],
        maxTokens: 1200,
        temperature: 0,
      });
    }

    const definitions = [
      ...asDefinitions(result?.verbs, "verb"),
      ...asDefinitions(result?.nouns, "noun"),
    ];
    const word = String(result?.word ?? body.word);

    res.json({
      found: result?.found ?? false,
      word,
      pronunciation: result?.pronunciation ?? "",
      definitions,
      synonyms: cleanWords(result?.synonyms, word),
      antonyms: cleanWords(result?.antonyms, word),
    });
  } catch (err) {
    res.status(500).json({ error: "Vocabulary lookup failed" });
  }
});

export default router;
