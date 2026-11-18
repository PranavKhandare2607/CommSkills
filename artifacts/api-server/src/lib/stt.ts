const STT_BASE_URL = process.env.STT_BASE_URL ?? "http://stt:8080";

export interface TranscribeResult {
  text: string;
  language?: string;
  duration?: number;
}

export async function transcribeAudio(audioBuffer: Buffer, filename = "audio.webm"): Promise<TranscribeResult> {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" }), filename);

  const response = await fetch(`${STT_BASE_URL}/transcribe`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`STT service error: ${response.status} ${text}`);
  }

  return response.json() as Promise<TranscribeResult>;
}

export async function getSttStatus(): Promise<{ ok: boolean; baseUrl: string; error?: string }> {
  try {
    const response = await fetch(`${STT_BASE_URL}/health`);
    if (!response.ok) return { ok: false, baseUrl: STT_BASE_URL, error: `HTTP ${response.status}` };
    return { ok: true, baseUrl: STT_BASE_URL };
  } catch (err: any) {
    return { ok: false, baseUrl: STT_BASE_URL, error: err.message };
  }
}