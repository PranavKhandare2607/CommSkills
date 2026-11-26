import { apiFetch } from "@workspace/api-client-react";

/**
 * Server-generated speech fallback. Used when the browser has no usable
 * speech voice or blocks speech synthesis (common in embedded previews).
 * `/api/tts/speak` only requires login, not a Premium subscription.
 */

type ServerVoice = "en_US" | "hi_IN" | "en_IN";

/** Edge-TTS strings: e.g. rate "-3%", pitch "+2Hz", volume "+0%". */
export interface SpeechStyle {
  rate?: string;
  pitch?: string;
  volume?: string;
}

export interface ServerSpeechOptions {
  voice?: ServerVoice;
  style?: SpeechStyle;
  signal?: AbortSignal;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

export interface ServerSpeechAttempt {
  /** True only when the browser actually began playing the audio. */
  started: boolean;
  /** Resolves when playback finishes, fails, or is stopped. */
  waitForEnd: () => Promise<void>;
}

let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let activeEnd: (() => void) | null = null;

function releaseAudio(audio: HTMLAudioElement, url: string) {
  if (activeAudio === audio) {
    activeAudio = null;
    activeUrl = null;
    activeEnd?.();
    activeEnd = null;
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
  activeEnd?.();
  activeEnd = null;
  if (activeUrl) {
    try { URL.revokeObjectURL(activeUrl); } catch { /* ignore */ }
    activeUrl = null;
  }
}

/**
 * Fetch and play server audio. Resolves as soon as playback starts so callers
 * can report a failure immediately, while `waitForEnd()` keeps the caller's
 * queue (and any speaking animation) alive until the audio actually finishes.
 */
export function speakViaServer(text: string, options: ServerSpeechOptions = {}): Promise<ServerSpeechAttempt> {
  return new Promise<ServerSpeechAttempt>((resolveAttempt) => {
    let resolveEnd!: () => void;
    const ended = new Promise<void>((resolve) => { resolveEnd = resolve; });
    const attempt = (started: boolean): ServerSpeechAttempt => ({ started, waitForEnd: () => ended });
    let settled = false;
    const finishAttempt = (started: boolean) => {
      if (!settled) {
        settled = true;
        resolveAttempt(attempt(started));
      }
    };
    const end = () => {
      resolveEnd();
      options.onEnd?.();
    };

    void (async () => {
      try {
        const response = await apiFetch("/api/tts/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: options.voice ?? "en_US",
            style: options.style,
          }),
          signal: options.signal,
        });
        if (!response.ok || options.signal?.aborted) {
          options.onError?.();
          finishAttempt(false);
          resolveEnd();
          return;
        }

        const blob = await response.blob();
        stopServerSpeech();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        activeAudio = audio;
        activeUrl = url;
        activeEnd = resolveEnd;

        let notifiedStart = false;
        const notifyStart = () => {
          if (notifiedStart) return;
          notifiedStart = true;
          options.onStart?.();
        };
        audio.onplay = notifyStart;
        audio.onended = () => {
          releaseAudio(audio, url);
          end();
        };
        audio.onerror = () => {
          releaseAudio(audio, url);
          options.onError?.();
          finishAttempt(false);
          resolveEnd();
        };

        try {
          await audio.play();
          // Some browsers skip onplay; treat a resolved play() as started.
          notifyStart();
          finishAttempt(true);
        } catch {
          releaseAudio(audio, url);
          options.onError?.();
          finishAttempt(false);
          resolveEnd();
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") options.onError?.();
        finishAttempt(false);
        resolveEnd();
      }
    })();
  });
}
