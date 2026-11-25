import { apiUrl } from "@workspace/api-client-react";

/**
 * Server-generated speech fallback. Used when the browser has no usable
 * speech voice or blocks speech synthesis (common in embedded previews).
 * `/api/tts/speak` only requires login, not a Premium subscription.
 */

type ServerVoice = "en_US" | "hi_IN";

export interface ServerSpeechOptions {
  voice?: ServerVoice;
  signal?: AbortSignal;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;

function releaseAudio(audio: HTMLAudioElement, url: string) {
  if (activeAudio === audio) {
    activeAudio = null;
    activeUrl = null;
  }
  try { URL.revokeObjectURL(url); } catch { /* ignore */ }
}

export function stopServerSpeech(): void {
  if (activeAudio) {
    try {
      activeAudio.onplay = null;
      activeAudio.onended = null;
      activeAudio.onerror = null;
      activeAudio.pause();
    } catch { /* ignore */ }
  }
  activeAudio = null;
  if (activeUrl) {
    try { URL.revokeObjectURL(activeUrl); } catch { /* ignore */ }
    activeUrl = null;
  }
}

/** Returns true when the browser accepted the audio for playback. */
export function speakViaServer(text: string, options: ServerSpeechOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    void (async () => {
      try {
        const response = await fetch(apiUrl("/api/tts/speak"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text, voice: options.voice ?? "en_US" }),
          signal: options.signal,
        });
        if (!response.ok) {
          options.onError?.();
          finish(false);
          return;
        }

        const blob = await response.blob();
        stopServerSpeech();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeAudio = audio;
        activeUrl = url;
        audio.onplay = () => options.onStart?.();
        audio.onended = () => {
          releaseAudio(audio, url);
          options.onEnd?.();
        };
        audio.onerror = () => {
          releaseAudio(audio, url);
          options.onError?.();
          finish(false);
        };

        try {
          await audio.play();
          finish(true);
        } catch {
          releaseAudio(audio, url);
          options.onError?.();
          finish(false);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") options.onError?.();
        finish(false);
      }
    })();
  });
}
