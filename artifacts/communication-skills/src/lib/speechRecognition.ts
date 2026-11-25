import { createLocalSpeechRecognition, type LocalSpeechRecognition } from "./localSpeechRecognition";

/**
 * Live speech recognition used by the Companion and Analyzer pages.
 *
 * The local STT adapter (MediaRecorder -> /api/stt/transcribe) is very accurate
 * but only returns text after the user stops recording. Browsers with the Web
 * Speech API can stream interim results while the user is still talking, so we
 * use the browser engine for live words and the local STT result as the final,
 * higher-accuracy transcript.
 */

export interface LiveSpeechRecognition extends LocalSpeechRecognition {
  /** A readable name for the engine currently in use. */
  engine: "browser" | "local";
}

type BrowserSpeechRecognition = any;

function getBrowserRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function toBcp47(lang: string): string {
  const normalized = lang.toLowerCase();
  if (normalized.startsWith("hi")) return "hi-IN";
  if (normalized.includes("hinglish")) return "en-IN";
  // English: en-US gives the most reliable accuracy for standard English.
  return "en-US";
}

/** Create a recognizer that streams interim words while speaking. */
export function createLiveSpeechRecognition(initialLang = "en-US"): LiveSpeechRecognition {
  const Ctor = getBrowserRecognitionCtor();

  if (Ctor) {
    const browser = new Ctor() as BrowserSpeechRecognition;
    const rec: any = {
      engine: "browser",
      lang: toBcp47(initialLang),
      interimResults: true,
      continuous: false,
      maxAlternatives: 1,
      onstart: null,
      onresult: null,
      onerror: null,
      onend: null,
      __commSkillsDiscardResult: false,
      _finalText: "",
      _aborted: false,
      start() {
        rec._finalText = "";
        rec._aborted = false;
        browser.lang = rec.lang;
        browser.interimResults = rec.interimResults;
        browser.continuous = rec.continuous;
        browser.maxAlternatives = rec.maxAlternatives;
        browser.onstart = () => rec.onstart?.();
        browser.onresult = (event: any) => {
          let interim = "";
          let final = "";
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0]?.transcript ?? "";
            if (result.isFinal) final += transcript;
            else interim += transcript;
          }
          rec._finalText = final;
          const payload: any = [];
          if (final) {
            const finalItem: any = [{ transcript: final, confidence: event.results[0]?.[0]?.confidence ?? 1 }];
            finalItem.isFinal = true;
            payload.push(finalItem);
          }
          if (interim) {
            const interimItem: any = [{ transcript: interim, confidence: 0 }];
            interimItem.isFinal = false;
            payload.push(interimItem);
          }
          payload.isFinal = Boolean(final);
          rec.onresult?.({ results: payload });
        };
        browser.onerror = (event: any) => rec.onerror?.(event);
        browser.onend = () => rec.onend?.();
        try {
          browser.start();
        } catch (err: any) {
          rec.onerror?.({ error: err?.name || "start-failed", message: err?.message });
          rec.onend?.();
        }
      },
      stop() {
        try { browser.stop(); } catch { /* ignore */ }
      },
      abort() {
        rec._aborted = true;
        try { browser.abort(); } catch { /* ignore */ }
      },
    };
    return rec as LiveSpeechRecognition;
  }

  // Fallback: local STT. Live words aren't available without the Web Speech
  // API, but the final transcript is produced by the accurate local model.
  const local = createLocalSpeechRecognition() as any;
  local.engine = "local";
  return local as LiveSpeechRecognition;
}
