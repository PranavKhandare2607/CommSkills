const TTS_BASE_URL = process.env.TTS_BASE_URL ?? "http://tts:8080";

export type TtsVoice = "en_US" | "hi_IN" | "en_IN";

export interface SynthesizedSpeech {
  audio: Buffer;
  contentType: string;
}

/** Edge-TTS prosody strings, e.g. rate "-3%", pitch "+2Hz", volume "+0%". */
export interface TtsStyle {
  rate?: string;
  pitch?: string;
  volume?: string;
}

const PERCENT_PATTERN = /^[+-]\d{1,3}%$/;
const PITCH_PATTERN = /^[+-]\d{1,3}Hz$/;

// Only forward known-safe Edge-TTS values; ignore anything else from a client.
function sanitizeStyle(style?: TtsStyle): TtsStyle | undefined {
  if (!style || typeof style !== "object") return undefined;
  const clean: TtsStyle = {};
  if (typeof style.rate === "string" && PERCENT_PATTERN.test(style.rate)) clean.rate = style.rate;
  if (typeof style.pitch === "string" && PITCH_PATTERN.test(style.pitch)) clean.pitch = style.pitch;
  if (typeof style.volume === "string" && PERCENT_PATTERN.test(style.volume)) clean.volume = style.volume;
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export async function synthesizeSpeech(
  text: string,
  voice: TtsVoice,
  style?: TtsStyle,
): Promise<SynthesizedSpeech> {
  const response = await fetch(`${TTS_BASE_URL}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, style: sanitizeStyle(style) }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`TTS service error: ${response.status} ${detail}`);
  }

  return {
    audio: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/wav",
  };
}

export async function getTtsStatus(): Promise<{ ok: boolean; baseUrl: string; error?: string }> {
  try {
    const response = await fetch(`${TTS_BASE_URL}/health`);
    if (!response.ok) return { ok: false, baseUrl: TTS_BASE_URL, error: `HTTP ${response.status}` };
    return { ok: true, baseUrl: TTS_BASE_URL };
  } catch (err: any) {
    return { ok: false, baseUrl: TTS_BASE_URL, error: err.message };
  }
}
