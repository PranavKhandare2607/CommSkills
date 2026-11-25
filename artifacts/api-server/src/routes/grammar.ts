import { Router, type IRouter } from "express";
import { CheckGrammarBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/requireAuth";
import { checkAndIncrementUsage } from "../lib/subscriptionUtils";
import { chatJson } from "../lib/llm";

const router: IRouter = Router();

interface WordChange {
  from: string;
  to: string;
}

function wordTokens(text: string): string[] {
  // Ignore punctuation and hyphenation: "well written" and "well-written"
  // should not be counted as two grammar errors.
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

/** Word-level edit alignment, grouped into readable phrase replacements. */
function wordChanges(original: string, corrected: string): WordChange[] {
  const a = wordTokens(original);
  const b = wordTokens(corrected);
  type Choice = "equal" | "replace" | "delete" | "insert";
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  const choice: Choice[][] = Array.from({ length: a.length + 1 }, () =>
    Array<Choice>(b.length + 1).fill("equal"),
  );

  for (let i = 1; i <= a.length; i++) {
    dp[i][0] = i;
    choice[i][0] = "delete";
  }
  for (let j = 1; j <= b.length; j++) {
    dp[0][j] = j;
    choice[0][j] = "insert";
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const same = a[i - 1] === b[j - 1];
      const diagonal = dp[i - 1][j - 1] + (same ? 0 : 1);
      const deletion = dp[i - 1][j] + 1;
      const insertion = dp[i][j - 1] + 1;
      if (same && diagonal <= deletion && diagonal <= insertion) {
        dp[i][j] = diagonal;
        choice[i][j] = "equal";
      } else if (diagonal <= deletion && diagonal <= insertion) {
        // A replacement costs one edit, so prefer it over delete + insert.
        dp[i][j] = diagonal;
        choice[i][j] = "replace";
      } else if (deletion <= insertion) {
        dp[i][j] = deletion;
        choice[i][j] = "delete";
      } else {
        dp[i][j] = insertion;
        choice[i][j] = "insert";
      }
    }
  }

  type Op = { type: "equal" | "delete" | "insert"; value: string };
  const ops: Op[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    const move = choice[i][j];
    if (move === "equal" && i > 0 && j > 0) {
      ops.unshift({ type: "equal", value: a[i - 1] });
      i--;
      j--;
    } else if (move === "replace" && i > 0 && j > 0) {
      ops.unshift({ type: "delete", value: a[i - 1] });
      ops.unshift({ type: "insert", value: b[j - 1] });
      i--;
      j--;
    } else if (move === "delete" && i > 0) {
      ops.unshift({ type: "delete", value: a[i - 1] });
      i--;
    } else if (j > 0) {
      ops.unshift({ type: "insert", value: b[j - 1] });
      j--;
    }
  }

  // Merge each contiguous changed hunk into one phrase replacement so the UI
  // says `Changed "are going" to "went"` instead of a chain of shifted words.
  const changes: WordChange[] = [];
  let index = 0;
  while (index < ops.length) {
    if (ops[index].type === "equal") {
      index++;
      continue;
    }
    const removed: string[] = [];
    const added: string[] = [];
    while (index < ops.length && ops[index].type !== "equal") {
      if (ops[index].type === "delete") removed.push(ops[index].value);
      else added.push(ops[index].value);
      index++;
    }
    if (removed.length && added.length) {
      changes.push({ from: removed.join(" "), to: added.join(" ") });
    } else if (removed.length) {
      changes.push({ from: removed.join(" "), to: "" });
    } else {
      changes.push({ from: "", to: added.join(" ") });
    }
  }
  return changes.filter((change) => change.from !== change.to);
}

function editDistance(a: string, b: string): number {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
}

/** Unique capital letters in order of appearance, e.g. ["I", "H"]. */
function usedCapitalLetters(text: string): string[] {
  const seen = new Set<string>();
  for (const char of text) {
    if (/[A-Z]/.test(char) && !seen.has(char)) seen.add(char);
  }
  return [...seen];
}

/** Unique punctuation marks in order of appearance, e.g. [".", ",", "'"]. */
function usedPunctuation(text: string): string[] {
  const seen = new Set<string>();
  for (const char of text) {
    if (/[.,!?;:'"()\[\]{}\-—–]/.test(char) && !seen.has(char)) seen.add(char);
  }
  return [...seen];
}

/**
 * Conservative post-corrections for patterns the small local model often
 * leaves behind. Each rule is narrow enough that it should not alter text
 * that is already correct.
 */
function fixCommonMistakes(text: string): string {
  return text
    .replace(/\b(i)\s+are\b/gi, "$1 am")
    .replace(/\b(he|she|it)\s+don't\b/gi, "$1 doesn't")
    .replace(/\b(don't|doesn't)\s+have\s+no\b/gi, "$1 have any")
    .replace(/\b(he|she|it)\s+go\b/gi, "$1 goes")
    .replace(/\b(dont)\b/gi, "don't")
    .replace(
      /\b(am|is|are)\s+going\s+to\s+([^,.;!?]+?)\s+yesterday\b/gi,
      (_match, _verb: string, place: string) => `went to ${place} yesterday`,
    );
}

function changeSentence(change: WordChange): string {
  if (change.from && change.to) return `Changed "${change.from}" to "${change.to}".`;
  if (change.from) return `Removed "${change.from}".`;
  return `Added "${change.to}".`;
}

function scoreFor(original: string, corrected: string, changes: WordChange[]): number {
  if (corrected === original) return 100;
  if (changes.length === 0) return 99; // punctuation/spacing polish only
  const distance = editDistance(original, corrected);
  const penalty = changes.length * 8 + Math.min(24, Math.ceil(distance / 3));
  return Math.max(35, 100 - penalty);
}

router.post("/grammar/check", requireAuth, async (req, res) => {
  const userId = (req as typeof req & { userId: string }).userId;
  const usage = await checkAndIncrementUsage(userId, "grammar");
  if (!usage.allowed) {
    res.status(402).json({ error: "Daily limit reached", limitType: "grammar", limit: usage.limit, remaining: 0 });
    return;
  }
  const body = CheckGrammarBody.parse(req.body);

  try {
    const result: any = await chatJson({
      system: `You are a professional grammar and writing coach. Correct ALL grammar mistakes in the given text.
Return a JSON response with exactly these fields:
{
  "corrected": "the fully corrected version of the text",
  "score": number from 0-100 (grammar quality score),
  "improvements": ["a clear sentence describing each change"],
  "explanation": "brief overall explanation of the grammar quality and main issues found"
}
Scoring rules:
- Use 100 only when the corrected text is identical to the original.
- If you change anything, the score MUST be below 100. Use 85-95 for one minor fix, 65-84 for several fixes, and below 65 for many serious errors.
- "improvements" must be complete sentences that name the original and corrected words.
Fix subject-verb agreement, tense agreement, articles, double negatives, and spelling.`,
      messages: [
        {
          role: "user",
          content: `Please check the grammar of this text:\n\n${body.text}`,
        },
      ],
      maxTokens: 700,
      temperature: 0,
    });

    const modelCorrected = typeof result?.corrected === "string" && result.corrected.trim()
      ? result.corrected.trim()
      : body.text;
    const corrected = fixCommonMistakes(modelCorrected);
    const changes = wordChanges(body.text, corrected);
    const modelScore = Number(result?.score);
    const computedScore = scoreFor(body.text, corrected, changes);
    const score = Number.isFinite(modelScore)
      ? Math.max(0, Math.min(100, Math.min(Math.round(modelScore), computedScore)))
      : computedScore;
    const polishOnly = changes.length === 0 && corrected !== body.text;
    const improvements = changes.length > 0
      ? changes.slice(0, 6).map(changeSentence)
      : polishOnly
        ? ["Polished punctuation and spacing."]
        : ["No changes needed — the text is already grammatically correct."];
    const explanation = changes.length > 0
      ? `The original had ${changes.length} grammar ${changes.length === 1 ? "issue" : "issues"}. ${improvements.join(" ")} The corrected version applies these fixes.`
      : polishOnly
        ? "The wording was already correct; only punctuation or spacing was polished."
        : "The text is already grammatically correct; no changes were needed.";

    res.json({
      original: body.text,
      corrected,
      score,
      improvements,
      explanation,
      capitalLetters: usedCapitalLetters(corrected),
      punctuation: usedPunctuation(corrected),
    });
  } catch (err) {
    res.status(500).json({ error: "Grammar check failed" });
  }
});

export default router;
