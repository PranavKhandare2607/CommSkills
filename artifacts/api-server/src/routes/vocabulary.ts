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
  const seen = new Set<string>();
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      partOfSpeech: pos,
      definition: String(item.meaning ?? item.definition ?? "").trim(),
      example: String(item.example ?? "").trim(),
    }))
    .filter((item) => {
      const key = normalize(item.definition);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);
}

// The UI only shows two senses, so extra items from the model are fine as long
// as there are two usable, distinct ones. Avoiding a retry for "too many"
// keeps a lookup fast; the model is only asked again when it is truly short.
function hasTwoDistinctEach(result: any): boolean {
  const valid = (items: any[]) => {
    if (!Array.isArray(items)) return false;
    const usable = items.filter(
      (item) => normalize(String(item?.meaning ?? "")) && normalize(String(item?.example ?? "")),
    );
    return (
      usable.length >= 2 &&
      normalize(String(usable[0].meaning)) !== normalize(String(usable[1].meaning))
    );
  };

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

const DICTIONARY_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";

function exampleFromDefinition(word: string, definition: string): string {
  const short = definition
    .replace(/^\([^)]*\)\s*/, "")
    .replace(/[.;:]\s*$/, "")
    .slice(0, 110);
  const lower = short.charAt(0).toLowerCase() + short.slice(1);
  return `The word "${word}" can mean ${lower}.`;
}

/**
 * Fast path: the free dictionary API returns structured senses in under a
 * second, while the local model takes several seconds per lookup. Keep the
 * exact same response shape so the UI does not change; use the model only
 * when the dictionary has no usable verb/noun pair.
 */
async function lookupDictionary(word: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(
      `${DICTIONARY_URL}/${encodeURIComponent(word.trim().toLowerCase())}`,
      { signal: controller.signal },
    );
    if (!response.ok) return null;
    const entries: any = await response.json();
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const collect = (pos: "verb" | "noun") => {
      const picked: any[] = [];
      const seen = new Set<string>();
      for (const entry of entries) {
        for (const meaning of entry?.meanings ?? []) {
          if (String(meaning?.partOfSpeech ?? "").toLowerCase() !== pos) continue;
          for (const def of meaning?.definitions ?? []) {
            const text = String(def?.definition ?? "").trim();
            const key = normalize(text);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            picked.push({
              word,
              meaning: text,
              example: String(def?.example ?? "").trim() || exampleFromDefinition(word, text),
            });
            if (picked.length === 2) return picked;
          }
        }
      }
      return picked;
    };

    const verbs = collect("verb");
    const nouns = collect("noun");
    if (verbs.length < 2 || nouns.length < 2) return null;

    const meanings = entries.flatMap((e: any) => Array.isArray(e?.meanings) ? e.meanings : []);
    const definitions = meanings.flatMap((m: any) => Array.isArray(m?.definitions) ? m.definitions : []);
    const phonetics = entries.flatMap((e: any) => Array.isArray(e?.phonetics) ? e.phonetics : []);
    const pronunciation = String(
      entries.find((e: any) => e?.phonetic)?.phonetic ??
      phonetics.find((p: any) => p?.text)?.text ??
      "",
    );
    const synonyms = [
      ...meanings.flatMap((m: any) => Array.isArray(m?.synonyms) ? m.synonyms : []),
      ...definitions.flatMap((d: any) => Array.isArray(d?.synonyms) ? d.synonyms : []),
    ];
    const antonyms = [
      ...meanings.flatMap((m: any) => Array.isArray(m?.antonyms) ? m.antonyms : []),
      ...definitions.flatMap((d: any) => Array.isArray(d?.antonyms) ? d.antonyms : []),
    ];

    return { found: true, word, pronunciation, verbs, nouns, synonyms, antonyms };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
    let result: any = await lookupDictionary(body.word);

    if (!result) {
      result = await chatJson({
        system: VOCAB_SYSTEM,
        messages: [{ role: "user", content: `Look up this word: ${body.word}` }],
        maxTokens: 900,
        temperature: 0.1,
      });

      // Only retry when a pair is genuinely missing/duplicated. The correction
      // asks for just the two arrays, so this second call stays short and fast.
      if (result?.found !== false && !hasTwoDistinctEach(result)) {
        const correction: any = await chatJson({
          system:
            "Return JSON with only \"verbs\" and \"nouns\", exactly 2 items each. " +
            "Each item: { \"word\", \"meaning\", \"example\" }. Meanings must be DIFFERENT senses; examples must differ. Be concise.",
          messages: [{
            role: "user",
            // A nonce keeps the corrective call from replaying a cached bad answer.
            content: `Word: "${body.word}" (retry ${Date.now()}). Replace these weak pairs: ${JSON.stringify({ verbs: result?.verbs, nouns: result?.nouns })}`,
          }],
          maxTokens: 500,
          temperature: 0,
        });
        if (correction && typeof correction === "object") {
          result = { ...result, verbs: correction.verbs, nouns: correction.nouns };
        }
      }
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
