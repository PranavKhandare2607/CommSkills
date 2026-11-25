/**
 * Browser speech synthesis with an Indian-accent preference.
 *
 * Chrome/Edge on Indian systems expose voices such as "Microsoft Heera",
 * "Microsoft Raveena" or Google's en-IN voice. Preferring them gives Buddy AI
 * and the AI Companion a natural Indian accent without sending audio to a
 * third-party service. If no en-IN voice exists, we fall back to any English
 * voice and let the browser apply its closest locale match.
 */

const FEMALE_VOICE_HINT =
  /female|woman|girl|heera|raveena|kalpana|priya|veena|aditi|leela|shelley|samantha|zira|susan|karen|tessa|fiona|moira|catherine|allison|ava|serena|victoria|neerja/i;

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

/** Pick the most natural Indian voice for the requested language. */
export function pickAccentedVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = getSpeechVoices();
  if (voices.length === 0) return undefined;

  const matches = (prefix: string) =>
    voices.filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(prefix));

  if (lang.toLowerCase().startsWith("hi")) {
    return (
      matches("hi").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) ||
      matches("hi")[0] ||
      matches("en-in").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) ||
      matches("en-in")[0]
    );
  }

  // English / Hinglish: prefer an Indian English female voice.
  return (
    matches("en-in").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) ||
    matches("en-in")[0] ||
    matches("en").find((voice) => FEMALE_VOICE_HINT.test(voice.name)) ||
    matches("en")[0]
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
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

/**
 * Speak `text` with an Indian-accent voice and report when playback ends.
 * Returns null when the browser has no speech synthesis support (callers can
 * then fall back to server-generated audio).
 */
export function speakWithAccent(text: string, options: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (!isBrowserSpeechSupported()) {
    options.onEnd?.();
    return null;
  }

  const clean = cleanSpeechText(text);
  if (!clean) {
    options.onEnd?.();
    return null;
  }

  const utterance = new SpeechSynthesisUtterance(clean);
  const voice = pickAccentedVoice(options.lang ?? "en-IN");
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || options.lang || "en-IN";
  utterance.rate = options.rate ?? 0.95;
  utterance.pitch = options.pitch ?? 1.05;
  utterance.volume = 1;
  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = () => options.onError?.();

  window.speechSynthesis.speak(utterance);
  return utterance;
}
