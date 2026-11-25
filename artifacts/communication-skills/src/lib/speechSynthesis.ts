/**
 * Browser speech synthesis with an Indian-accent preference.
 *
 * Chrome/Edge on Indian systems expose voices such as "Microsoft Heera",
 * "Microsoft Raveena" or Google's en-IN voice. Preferring them gives Buddy AI
 * and the AI Companion a natural Indian accent without sending audio to a
 * third-party service. If no Indian voice exists (or speech is blocked) the
 * caller gets `started: false` and can fall back to server-generated audio.
 */

const FEMALE_VOICE_HINT =
  /female|woman|girl|heera|raveena|kalpana|priya|veena|aditi|leela|shelley|samantha|zira|susan|karen|tessa|fiona|moira|catherine|allison|ava|serena|victoria|neerja|swara|ananya|diya|meera|sneha/i;

export function isBrowserSpeechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export function getSpeechVoices(): SpeechSynthesisVoice[] {
  if (!isBrowserSpeechSupported()) return [];
  return window.speechSynthesis.getVoices() || [];
}

/** Voices load asynchronously in Chrome; wait briefly before deciding. */
export function waitForVoices(timeoutMs = 900): Promise<void> {
  if (!isBrowserSpeechSupported() || getSpeechVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.removeEventListener?.("voiceschanged", finish);
      clearTimeout(timer);
      resolve();
    };
    window.speechSynthesis.addEventListener?.("voiceschanged", finish);
    const timer = setTimeout(finish, timeoutMs);
  });
}

/**
 * Pick the most natural Indian voice for the requested language.
 * When `requireIndian` is true, a generic en-US/en-GB voice is deliberately
 * skipped so the caller can use the server's Indian neural voice instead of
 * speaking with the wrong accent.
 */
export function pickAccentedVoice(lang: string, requireIndian = false): SpeechSynthesisVoice | undefined {
  const voices = getSpeechVoices();
  if (voices.length === 0) return undefined;

  const matches = (prefix: string) =>
    voices.filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(prefix));

  if (lang.toLowerCase().startsWith("hi")) {
    return (
      matches("hi").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) ||
      matches("hi")[0] ||
      matches("en-in").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) ||
      matches("en-in")[0] ||
      (requireIndian ? undefined : matches("en")[0])
    );
  }

  // English / Hinglish: prefer an Indian English female voice.
  return (
    matches("en-in").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) ||
    matches("en-in")[0] ||
    (requireIndian
      ? undefined
      : matches("en").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) || matches("en")[0])
  );
}

export function cleanSpeechText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/```[\s\S]*?```/g, " code block ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/[*_#>]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/[ \t]*\n[ \t]*/g, ". ")
    .trim();
}

export interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  /** Reject generic non-Indian browser voices so a caller can use server audio. */
  requireIndianVoice?: boolean;
  /** How long to wait for the browser to confirm playback before failing over. */
  startTimeoutMs?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export interface SpeechAttempt {
  utterance: SpeechSynthesisUtterance | null;
  /** True only when the browser actually began speaking. */
  started: boolean;
  /** Resolves when playback ends (or fails). */
  waitForEnd: () => Promise<void>;
}

export function stopBrowserSpeech(): void {
  if (!isBrowserSpeechSupported()) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
}

/**
 * Speak `text` with the best available voice. Resolves once the browser
 * confirms playback started (or reports that it cannot) so callers can fall
 * back to server audio when speech is unavailable or blocked.
 */
export async function speakWithAccent(text: string, options: SpeakOptions = {}): Promise<SpeechAttempt> {
  const empty: SpeechAttempt = { utterance: null, started: false, waitForEnd: async () => {} };
  const clean = cleanSpeechText(text);
  if (!clean) {
    options.onEnd?.();
    return empty;
  }
  if (!isBrowserSpeechSupported()) {
    options.onError?.();
    return empty;
  }

  await waitForVoices();
  const voice = pickAccentedVoice(options.lang ?? "en-IN", options.requireIndianVoice);
  if (!voice) {
    options.onError?.();
    return empty;
  }

  let resolveStarted!: (started: boolean) => void;
  let resolveEnded!: () => void;
  const startedPromise = new Promise<boolean>((resolve) => { resolveStarted = resolve; });
  const endedPromise = new Promise<void>((resolve) => { resolveEnded = resolve; });

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.voice = voice;
  // Use the voice's real locale. Forcing "en-IN" when no such voice exists
  // makes Chrome silently drop the utterance.
  utterance.lang = voice.lang || options.lang || "en-IN";
  utterance.rate = options.rate ?? 0.95;
  utterance.pitch = options.pitch ?? 1.05;
  utterance.volume = options.volume ?? 1;

  let settled = false;
  const markStarted = () => {
    if (!settled) {
      settled = true;
      resolveStarted(true);
    }
    options.onStart?.();
  };
  const markFailed = () => {
    if (!settled) {
      settled = true;
      resolveStarted(false);
    }
    resolveEnded();
    options.onError?.();
  };

  utterance.onstart = markStarted;
  utterance.onend = () => {
    markStarted();
    resolveEnded();
    options.onEnd?.();
  };
  utterance.onerror = markFailed;

  // Chrome sometimes drops a speak() that immediately follows cancel().
  stopBrowserSpeech();
  await new Promise((resolve) => setTimeout(resolve, 60));

  try {
    window.speechSynthesis.speak(utterance);
  } catch {
    markFailed();
    return { utterance, started: false, waitForEnd: () => endedPromise };
  }

  // Some browsers never fire onstart/onerror when audio is blocked.
  const guard = setTimeout(() => {
    if (!settled) {
      settled = true;
      resolveStarted(false);
      resolveEnded();
      stopBrowserSpeech();
      options.onError?.();
    }
  }, options.startTimeoutMs ?? 1500);
  void startedPromise.then(() => clearTimeout(guard));

  return {
    utterance,
    started: await startedPromise,
    waitForEnd: () => endedPromise,
  };
}
