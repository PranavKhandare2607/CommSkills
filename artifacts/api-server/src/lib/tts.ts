const TTS_BASE_URL = process.env.TTS_BASE_URL ?? "http://tts:8080";

export type TtsVoice = "en_US" | "hi_IN";

export async function synthesizeSpeech(text: string, voice: TtsVoice): Promise<Buffer> {
  const response = await fetch(`${TTS_BASE_URL}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TTS service error: ${response.status} ${text}`);
  }

  return Buffer.from(await response.arrayBuffer());
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