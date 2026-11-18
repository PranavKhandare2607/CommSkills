/**
 * Local speech-to-text adapter.
 *
 * Exposes the small subset of the Web Speech API surface that the Companion
 * page uses (start / stop / onstart / onresult / onend / onerror plus the
 * `lang` / `interimResults` / `continuous` / `maxAlternatives` fields), but
 * records audio with MediaRecorder and transcribes it through the local STT
 * service at POST /api/stt/transcribe. This replaces the browser's built-in
 * SpeechRecognition, which sends audio to Google's servers.
 *
 * Because MediaRecorder records until explicitly stopped, the caller must call
 * stop() (e.g. the mic button toggles start/stop) to end a turn.
 */

export interface LocalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  __commSkillsDiscardResult?: boolean;
  start(): void;
  stop(): void;
}

export function createLocalSpeechRecognition(): LocalSpeechRecognition {
  const rec: any = {
    lang: "en-IN",
    interimResults: true,
    continuous: false,
    maxAlternatives: 1,
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,
    __commSkillsDiscardResult: false,
    _recorder: null as MediaRecorder | null,
    _stream: null as MediaStream | null,
    _chunks: [] as Blob[],
    _stopRequested: false,
  };

  const releaseStream = () => {
    try {
      rec._stream?.getTracks().forEach((t: MediaStreamTrack) => t.stop());
    } catch {
      /* ignore */
    }
    rec._stream = null;
  };

  rec.start = () => {
    if (rec._recorder) return;
    rec._stopRequested = false;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      rec.onerror?.({
        error: "not-allowed",
        message: "Microphone needs a secure context (localhost or HTTPS).",
      });
      rec.onend?.();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream: MediaStream) => {
        rec._stream = stream;
        rec._chunks = [];

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const recorder = new MediaRecorder(stream, { mimeType });
        rec._recorder = recorder;

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data.size > 0) rec._chunks.push(e.data);
        };

        recorder.onstop = async () => {
          releaseStream();
          const blob = new Blob(rec._chunks, { type: "audio/webm" });
          rec._chunks = [];
          rec._recorder = null;

          try {
            if (blob.size < 200) {
              rec.onerror?.({
                error: "no-speech",
                message: "No audio was captured. Hold the mic button while you speak.",
              });
              return;
            }

            const formData = new FormData();
            formData.append("file", blob, "recording.webm");
            formData.append("language", rec.lang || "en-IN");
            const res = await fetch("/api/stt/transcribe", {
              method: "POST",
              body: formData,
              credentials: "include",
            });
            if (!res.ok) throw new Error(`Transcription failed (${res.status})`);
            const data = await res.json();
            const text: string = (data.text ?? "").trim();

            if (!text) {
              rec.onerror?.({
                error: "no-speech",
                message: "No speech detected. Move closer to the mic and try again.",
              });
              return;
            }

            if (rec.onresult) {
              const resultList: any = [{ transcript: text }];
              resultList.isFinal = true;
              const event: any = { results: [resultList] };
              rec.onresult(event);
            }
          } catch (err: any) {
            rec.onerror?.({ error: "service-not-allowed", message: err?.message });
          } finally {
            rec.onend?.();
          }
        };

        recorder.start(250);
        rec.onstart?.();
        if (rec._stopRequested && recorder.state === "recording") {
          recorder.stop();
        }
      })
      .catch((err: any) => {
        if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
          rec.onerror?.({
            error: "not-allowed",
            message: "Microphone permission denied. Allow it in your browser, then retry.",
          });
        } else {
          rec.onerror?.({ error: "audio-capture", message: err?.message });
        }
        rec.onend?.();
      });
  };

  rec.stop = () => {
    if (rec._recorder && rec._recorder.state !== "inactive") {
      rec._recorder.stop();
    } else {
      // getUserMedia may still be pending when the user taps stop.
      rec._stopRequested = true;
      releaseStream();
    }
  };

  return rec as LocalSpeechRecognition;
}
