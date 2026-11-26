import { useCallback, useRef, useState } from "react";
import { apiFetch } from "@workspace/api-client-react";

type RecorderState = "idle" | "recording" | "processing" | "error";

function friendlyMicError(err: any): string {
  if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
    return "Microphone permission denied. Allow microphone access for this site in your browser, then try again.";
  }
  if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
    return "No microphone was found. Connect one and try again.";
  }
  if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
    return "The microphone is busy or blocked by another app. Close it and try again.";
  }
  return err?.message || "Microphone access failed";
}

interface UseLocalRecorderOptions {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  language?: string;
}

/**
 * Records audio via MediaRecorder and sends it to the local STT service
 * for transcription. Replaces the browser's built-in SpeechRecognition API
 * which requires a network connection to Google's servers.
 */
export function useLocalRecorder({
  onTranscript,
  onError,
  language = "en-IN",
}: UseLocalRecorderOptions) {
  const [state, setState] = useState<RecorderState>("idle");
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      setState("idle");
      return;
    }

    setState("processing");

    // Wait for MediaRecorder's final dataavailable + stop events before reading
    // the chunks. Reading them synchronously after stop() silently drops the
    // last part of the recording (and everything for short utterances).
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () =>
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
      recorder.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];

    if (blob.size < 200) {
      setState("idle");
      onError?.("No audio was captured. Hold the mic button while you speak.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("language", language);

      const res = await apiFetch("/api/stt/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Transcription failed (${res.status})`);
      }

      const data = await res.json();
      const text = data.text?.trim() ?? "";
      setTranscript(text);
      if (text) {
        onTranscript(text);
      } else {
        onError?.("No speech detected. Move closer to the mic and try again.");
      }
      setState("idle");
    } catch (err: any) {
      setState("error");
      onError?.(err.message || "Transcription failed");
    }
  }, [onTranscript, onError, language]);

  const startRecording = useCallback(async () => {
    setTranscript("");
    chunksRef.current = [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone needs a secure context. Use localhost or HTTPS, not a plain HTTP address.",
        );
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250);
      setState("recording");
    } catch (err: any) {
      setState("error");
      onError?.(friendlyMicError(err));
    }
  }, [onError]);

  const toggleRecording = useCallback(() => {
    if (state === "recording") {
      stopRecording();
    } else {
      startRecording();
    }
  }, [state, startRecording, stopRecording]);

  return {
    state,
    transcript,
    isRecording: state === "recording",
    startRecording,
    stopRecording,
    toggleRecording,
  };
}