import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Mic, MicOff, Camera, CameraOff, Volume2, VolumeX,
  Briefcase, Heart, Send, RotateCcw, AlertCircle, Trophy,
  CheckCircle2, TrendingUp, Award, MessageSquareText, Phone, PhoneOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FemaleAvatar } from "@/components/companion/FemaleAvatar";
import { createLocalSpeechRecognition } from "@/lib/localSpeechRecognition";
import {
  apiUrl,
  useScoreCompanionAnswer,
  useUpdateProgress,
  type CompanionAnswerScore,
  type CompanionInterviewProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetProgressQueryKey } from "@workspace/api-client-react";
import aishaThumb from "@/assets/aisha-closed.png";
import priyaThumb from "@/assets/priya-closed.png";

type Mode = "interview" | "friend";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface FeedbackResult {
  communicationScore: number;
  confidenceLevel: number;
  clarityScore: number;
  grammarScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

type InterviewProfile = Required<CompanionInterviewProfile>;

interface AnswerScorecardEntry {
  status: "loading" | "ready" | "error";
  question: string;
  answer: string;
  profile: InterviewProfile;
  score?: CompanionAnswerScore;
}

type LangKey = "english" | "hindi" | "hinglish";

function interviewQuestionFor(index: number, roleTitle: string): string {
  const role = roleTitle.trim() || "the role you're targeting";
  const questions = [
    `Tell me about yourself and what interests you about the ${role} role.`,
    `Which strength would help you most in the ${role} role, and can you give a specific example?`,
    `Which skill related to the ${role} role are you working to improve, and what are you doing about it?`,
    `What evidence from your experience shows that you are ready to succeed as a ${role}?`,
    `Tell me about a challenging situation relevant to ${role} work and how you handled it.`,
    `How would you like to grow over the next few years in the ${role} role?`,
    `What would you focus on during your first 90 days as a ${role}?`,
    "Tell me about a time you worked with others to deliver a result relevant to this role.",
    "What questions do you have about the role or team?",
  ];
  return questions[index] ?? questions[questions.length - 1];
}

function interviewWelcomeFor(profile: InterviewProfile, language: LangKey): string {
  const role = profile.roleTitle.trim();
  if (language === "hindi") {
    return `नमस्ते! मैं आइशा हूं, आपकी इंटरव्यू कोच। आज हम ${role} भूमिका के लिए mock interview करेंगे। अपने बारे में बताइए और इस भूमिका से जुड़ा अपना अनुभव साझा कीजिए।`;
  }
  if (language === "hinglish") {
    return `Hello! Main Aisha hoon, aapki interview coach. Aaj hum ${role} role ke liye mock interview karenge (${profile.experienceLevel}). Apne baare mein batayein aur is role se related apna experience share kijiye.`;
  }
  return `Hello! I'm Aisha, your interview coach. We'll practice for the ${role} role at the ${profile.experienceLevel} level. ${interviewQuestionFor(0, role)}`;
}

function AnswerScorecardPanel({
  entry,
  onRetry,
}: {
  entry: AnswerScorecardEntry;
  onRetry: () => void;
}) {
  if (entry.status === "loading") {
    return (
      <div role="status" aria-live="polite" className="w-full rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs font-medium text-indigo-700">
        Aisha is scoring this answer…
      </div>
    );
  }

  if (entry.status === "error" || !entry.score) {
    return (
      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <div className="flex items-center justify-between gap-3">
          <span>Couldn’t score this answer right now.</span>
          <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const score = entry.score;
  const dimensions = [
    { label: "Relevance", value: score.relevanceScore },
    { label: "Structure", value: score.structureScore },
    { label: "Clarity", value: score.clarityScore },
    { label: "Specificity", value: score.specificityScore },
  ];

  return (
    <div className="w-full rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Answer scorecard</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{score.summary}</p>
        </div>
        <div className="shrink-0 rounded-xl bg-indigo-50 px-3 py-2 text-center">
          <span className="block text-lg font-bold leading-none text-indigo-700">{score.overallScore}</span>
          <span className="text-[9px] font-semibold uppercase text-indigo-500">/ 100</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {dimensions.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-slate-50 px-2.5 py-2">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-medium text-slate-600">
              <span>{label}</span><span>{value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${value}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 text-xs">
        <p className="text-slate-700"><span className="font-semibold text-emerald-700">Strength: </span>{score.strength}</p>
        <p className="text-slate-700"><span className="font-semibold text-indigo-700">Next step: </span>{score.improvement}</p>
      </div>
    </div>
  );
}

const WELCOME_MSGS: Record<"interview" | "friend", Record<LangKey, string>> = {
  interview: {
    english: "Hello! I'm Aisha, your interview coach. We'll do a mock interview today. Take a deep breath, sit confidently, and let's begin. Tell me about yourself.",
    hindi: "नमस्ते! मैं आइशा हूं, आपकी इंटरव्यू कोच। आज हम एक मॉक इंटरव्यू करेंगे। एक गहरी सांस लीजिए, आत्मविश्वास से बैठिए, और शुरू करते हैं। अपने बारे में बताइए।",
    hinglish: "Hello! Main Aisha hoon, aapki interview coach. Aaj hum ek mock interview karenge. Ek deep breath lijiye, confidently baithiye, aur shuru karte hain. Tell me about yourself.",
  },
  friend: {
    english: "Hey there! So happy to chat with you today. Tell me — how are you feeling right now? What's on your mind?",
    hindi: "अरे हाय! आज तुमसे बात करके बहुत खुशी हो रही है। बताओ — अभी कैसा महसूस कर रहे हो? क्या चल रहा है दिमाग में?",
    hinglish: "Arey hi! Aaj tumse baat karke bahut khushi ho rahi hai. Batao — abhi kaisa feel kar rahe ho? Kya chal raha hai mann mein?",
  },
};

const MODE_INFO = {
  interview: {
    title: "Aisha — Interview Coach",
    subtitle: "Senior HR · Professional Mock Interview",
    btnLabel: "Mock Interview",
    btnDesc: "Practice with HR coach",
    color: "indigo",
    icon: Briefcase,
    startBtn: "Start Interview",
  },
  friend: {
    title: "Priya — Your Friendly Companion",
    subtitle: "Best Friend · Casual Chat & Motivation",
    btnLabel: "Talk with Friend",
    btnDesc: "Chat casually with bestie",
    color: "rose",
    icon: Heart,
    startBtn: "Start Chatting",
  },
};

const CAMERA_TIPS = [
  { check: "face-visible", message: "Please sit in front of the camera so I can see you", icon: AlertCircle },
  { check: "stay-steady", message: "Sit steady and confident — try not to move too much", icon: AlertCircle },
  { check: "eye-contact", message: "Maintain eye contact with the camera", icon: AlertCircle },
];

function prepareCompanionSpeech(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/[*_`]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/[ \t]*\n[ \t]*/g, ". ")
    .trim();
}

function normalizedSpeechText(text: string): string {
  return prepareCompanionSpeech(text)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyAssistantEcho(
  transcript: string,
  latestAssistantSpeech: { text: string; at: number },
): boolean {
  if (!latestAssistantSpeech.text || Date.now() - latestAssistantSpeech.at > 20000) return false;
  const heard = normalizedSpeechText(transcript);
  if (!heard) return false;
  if (latestAssistantSpeech.text.includes(heard) && heard.split(" ").length >= 3) return true;

  const heardWords = heard.split(" ").filter(word => word.length > 1);
  if (heardWords.length < 5) return false;
  const spokenWords = new Set(latestAssistantSpeech.text.split(" "));
  const overlap = heardWords.filter(word => spokenWords.has(word)).length / heardWords.length;
  return overlap >= 0.78;
}

export default function Companion() {
  const [mode, setMode] = useState<Mode>("interview");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionSupported =
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [interviewProfile, setInterviewProfile] = useState<InterviewProfile>({
    roleTitle: "",
    experienceLevel: "Early career",
    jobDescription: "",
  });
  const [answerScorecards, setAnswerScorecards] = useState<Record<string, AnswerScorecardEntry>>({});
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  void inIframe;
  void bannerDismissed;
  const [language, setLanguage] = useState<"english" | "hindi" | "hinglish">("english");
  const languageRef = useRef<"english" | "hindi" | "hinglish">("english");
  useEffect(() => { languageRef.current = language; }, [language]);
  const [activeVoiceName, setActiveVoiceName] = useState<string>("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState<"ringing" | "connected">("ringing");
  const [callSeconds, setCallSeconds] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [callInput, setCallInput] = useState("");
  const sessionStartedRef = useRef(false);

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const sessionStartTime = useRef<number>(0);
  const voiceModeRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const isStreamingRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const responseAbortRef = useRef<AbortController | null>(null);
  const sessionGenerationRef = useRef(0);
  const lastSubmittedRef = useRef<{ text: string; at: number } | null>(null);
  const interviewQuestionIndexRef = useRef(0);
  const sendMessageRef = useRef<((t: string) => void) | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);
  // HTMLAudioElement for server-generated TTS playback (real Indian voice)
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const audioResolveRef = useRef<(() => void) | null>(null);
  const speechGenerationRef = useRef(0);
  const audioUnlockGenerationRef = useRef(0);
  const audioUnlockPromiseRef = useRef<Promise<void> | null>(null);
  const audioPlaybackUnlockedRef = useRef(false);
  // Sentence-chunked speech queue — lets us start speaking the first sentence
  // as soon as it streams in, instead of waiting for the whole reply.
  const speechQueueRef = useRef<string[]>([]);
  const queueRunningRef = useRef(false);
  const spokenUpToRef = useRef(0);
  const latestAssistantSpeechRef = useRef({ text: "", at: 0 });

  // Sync refs with state for use inside callbacks/event handlers
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);
  useEffect(() => { sessionStartedRef.current = sessionStarted; }, [sessionStarted]);

  const queryClient = useQueryClient();
  const { mutate: updateProgress } = useUpdateProgress();
  const { mutateAsync: scoreCompanionAnswer } = useScoreCompanionAnswer();
  const modeInfo = MODE_INFO[mode];

  // Iframe detection
  useEffect(() => {
    try { setInIframe(window.self !== window.top); } catch { setInIframe(true); }
  }, []);

  // Auto scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      responseAbortRef.current?.abort();
      sessionGenerationRef.current += 1;
      audioUnlockGenerationRef.current += 1;
      audioUnlockPromiseRef.current = null;
      ttsAbortRef.current?.abort();
      audioResolveRef.current?.();
      audioResolveRef.current = null;
      if (audioElRef.current) {
        try { audioElRef.current.pause(); } catch {}
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
      stopCamera();
      recognitionRef.current?.stop();
    };
  }, []);

  // Note: speech is now enqueued sentence-by-sentence as the assistant's
  // reply streams in (see sendMessage), so there's no separate "speak the
  // full message after streaming ends" effect anymore — that was the
  // source of the noticeable delay before audio started.

  // ============================================================
  // SPEECH SYNTHESIS — Standard English Female (US/UK)
  // ============================================================
  // Cleanly stop any ongoing server-generated speech.
  const stopAllSpeech = useCallback(() => {
    speechGenerationRef.current += 1;
    audioUnlockGenerationRef.current += 1;
    audioUnlockPromiseRef.current = null;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    audioResolveRef.current?.();
    audioResolveRef.current = null;
    if (audioElRef.current) {
      try {
        audioElRef.current.pause();
        audioElRef.current.onplay = null;
        audioElRef.current.onended = null;
        audioElRef.current.onerror = null;
        audioElRef.current.removeAttribute("src");
        audioElRef.current.load();
      } catch {}
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    speechQueueRef.current = [];
    queueRunningRef.current = false;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const cancelActiveResponse = useCallback(() => {
    sessionGenerationRef.current += 1;
    responseAbortRef.current?.abort();
    responseAbortRef.current = null;
    isStreamingRef.current = false;
    setIsStreaming(false);
  }, []);

  // Mobile browsers (especially iOS Safari) only allow audio.play() when it's
  // triggered synchronously by a user gesture. Our TTS playback happens after
  // an async fetch(), which breaks that chain and gets silently blocked.
  // The fix: "unlock" the shared <audio> element with a real (silent) play/pause
  // cycle directly inside the click handler — after that, later programmatic
  // play() calls on the same element are allowed even from async code.
  const SILENT_WAV = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
  const unlockAudioPlayback = useCallback((): Promise<void> => {
    if (audioPlaybackUnlockedRef.current) return Promise.resolve();
    if (audioUnlockPromiseRef.current) return audioUnlockPromiseRef.current;
    if (!audioElRef.current) audioElRef.current = new Audio();

    const audio = audioElRef.current;
    const generation = audioUnlockGenerationRef.current;
    audio.muted = true;
    audio.src = SILENT_WAV;

    let playPromise: Promise<void>;
    try {
      // Call play synchronously so mobile browsers associate it with the
      // user's click/tap. Speech playback waits for this promise to settle.
      playPromise = audio.play();
    } catch {
      audio.muted = false;
      return Promise.resolve();
    }

    let trackedPromise: Promise<void>;
    trackedPromise = Promise.resolve(playPromise)
      .then(() => {
        if (generation === audioUnlockGenerationRef.current) {
          audioPlaybackUnlockedRef.current = true;
        }
      })
      .catch(() => {
        // The actual playback path reports a useful error if sound is blocked.
      })
      .finally(() => {
        // Never restore a previous audio URL: it may be a newer reply.
        if (
          generation === audioUnlockGenerationRef.current &&
          audio.getAttribute("src") === SILENT_WAV
        ) {
          try {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
            audio.removeAttribute("src");
            audio.load();
          } catch {}
        }
        if (audioUnlockPromiseRef.current === trackedPromise) {
          audioUnlockPromiseRef.current = null;
        }
      });

    audioUnlockPromiseRef.current = trackedPromise;
    return trackedPromise;
  }, []);

  // Plays a single chunk of text and resolves once playback (or fallback) ends.
  const playChunk = useCallback((text: string, generation: number): Promise<void> => {
    return new Promise((resolve) => {
      const clean = prepareCompanionSpeech(text);
      if (!clean || generation !== speechGenerationRef.current) {
        resolve();
        return;
      }

      const lang = languageRef.current;
      setActiveVoiceName(lang === "hindi" ? "Indian Hindi voice" : lang === "hinglish" ? "Indian Hinglish voice" : "Indian English voice");
      setVoiceError(null);

      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (audioResolveRef.current === finish) audioResolveRef.current = null;
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        resolve();
      };
      audioResolveRef.current = finish;

      const run = async () => {
        const ctrl = new AbortController();
        ttsAbortRef.current = ctrl;
        try {
          const res = await fetch(apiUrl("/api/companion/speak"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: clean, language: lang, mode }),
            signal: ctrl.signal,
          });
          if (!res.ok) {
            let detail = "";
            try {
              const payload = await res.json();
              detail = typeof payload?.error === "string" ? payload.error : "";
            } catch {}
            throw new Error(detail || `TTS HTTP ${res.status}`);
          }
          const blob = await res.blob();
          if (ctrl.signal.aborted || generation !== speechGenerationRef.current) {
            finish();
            return;
          }

          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          if (!audioElRef.current) audioElRef.current = new Audio();
          const audio = audioElRef.current;
          audio.src = url;
          audio.onplay = () => setIsSpeaking(true);
          audio.onended = finish;
          audio.onerror = () => {
            setVoiceError("The AI voice audio could not be played. The text reply is still available.");
            finish();
          };
          try {
            await audio.play();
          } catch (playErr) {
            if (!ctrl.signal.aborted) {
              console.warn("[CommSkills] audio.play() rejected:", playErr);
              setVoiceError("Audio playback was blocked by the browser. Open the app in a new tab and allow sound.");
            }
            finish();
          }
        } catch (err: any) {
          if (err?.name !== "AbortError" && generation === speechGenerationRef.current) {
            console.warn("[CommSkills] Server TTS failed:", err?.message || err);
            setVoiceError("AI voice is temporarily unavailable. The text reply is still available.");
          }
          finish();
        } finally {
          if (ttsAbortRef.current === ctrl) ttsAbortRef.current = null;
        }
      };
      run().catch(() => finish());
    });
  }, [mode]);

  // Drains the speech queue in order — plays chunk 1 while chunk 2/3 may
  // still be arriving from the stream, so audio starts as early as possible.
  const runSpeechQueue = useCallback(async () => {
    if (queueRunningRef.current) return;
    const generation = speechGenerationRef.current;
    queueRunningRef.current = true;
    // A user-triggered unlock may still be completing. Do not let the unlock
    // clip pause or replace a real reply that has already started.
    const pendingUnlock = audioUnlockPromiseRef.current;
    if (pendingUnlock) await pendingUnlock;
    if (generation !== speechGenerationRef.current) return;
    while (generation === speechGenerationRef.current && speechQueueRef.current.length > 0) {
      const next = speechQueueRef.current.shift()!;
      await playChunk(next, generation);
    }
    if (generation === speechGenerationRef.current) {
      queueRunningRef.current = false;
      setIsSpeaking(false);
      autoListenAfterSpeakRef.current?.();
    }
  }, [playChunk]);

  const enqueueChunk = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    speechQueueRef.current.push(trimmed);
    runSpeechQueue();
  }, [runSpeechQueue]);

  // Kept for the (rare) case a full message needs to be spoken in one shot.
  const speakText = useCallback(async (text: string) => {
    stopAllSpeech();
    const generation = speechGenerationRef.current;
    latestAssistantSpeechRef.current = {
      text: normalizedSpeechText(text),
      at: Date.now(),
    };
    await unlockAudioPlayback();
    if (generation !== speechGenerationRef.current) return;
    enqueueChunk(text);
  }, [stopAllSpeech, unlockAudioPlayback, enqueueChunk]);

  // Ref to call the latest auto-listen handler from speakText.onend
  const autoListenAfterSpeakRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    autoListenAfterSpeakRef.current = () => {
      if (voiceModeRef.current && !isMutedRef.current && !isListeningRef.current && !isStreamingRef.current && !queueRunningRef.current) {
        setTimeout(() => {
          if (voiceModeRef.current && !isMutedRef.current && !isListeningRef.current && !isStreamingRef.current && !queueRunningRef.current) {
            startListeningRef.current?.();
          }
        }, 250);
      }
    };
  }, []);

  // ============================================================
  // CAMERA
  // ============================================================
  const attachStream = useCallback((stream: MediaStream) => {
    const v = videoRef.current;
    if (!v) return false;
    if (v.srcObject !== stream) v.srcObject = stream;
    v.muted = true;
    v.playsInline = true;
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
    return true;
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Your browser doesn't support camera access.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      // Try attaching immediately; if video element isn't mounted yet,
      // retry on the next frames until it is.
      if (!attachStream(stream)) {
        let attempts = 0;
        const tryAttach = () => {
          if (attachStream(stream)) return;
          attempts++;
          if (attempts < 30) requestAnimationFrame(tryAttach);
        };
        requestAnimationFrame(tryAttach);
      }

      // Posture/eye-contact tips at intervals
      setTimeout(() => {
        const tips = ["Maintain eye contact with the camera", "Sit steady and confident", "Smile naturally — you're doing great"];
        let tipIdx = 0;
        const tipInterval = setInterval(() => {
          if (!streamRef.current) { clearInterval(tipInterval); return; }
          setActiveTip(tips[tipIdx % tips.length]);
          tipIdx++;
          setTimeout(() => setActiveTip(null), 4000);
        }, 25000);
      }, 10000);
    } catch (err: any) {
      console.error("Camera error:", err);
      const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setCameraError(isInIframe
          ? "Camera blocked inside preview. Click 'Open in new tab' at the top to use the camera."
          : "Camera blocked. Click the camera icon in your browser's address bar and allow access.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else if (err.name === "NotReadableError") {
        setCameraError("Camera is being used by another app. Close it and retry.");
      } else {
        setCameraError(`Camera error: ${err.message || err.name}`);
      }
      setCameraOn(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setActiveTip(null);
  }, []);

  // ============================================================
  // SPEECH RECOGNITION
  // ============================================================
  const startListening = useCallback(async () => {
    if (!speechRecognitionSupported) {
      alert("Voice input isn't supported in this browser. Please type instead.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        alert("Microphone blocked. Please allow microphone access.");
      } else {
        alert(`Mic error: ${err.message}`);
      }
      return;
    }
    stopAllSpeech();

    const recognition = createLocalSpeechRecognition();
    recognitionRef.current = recognition;
    // Use the user's selected language for speech recognition.
    // Hindi → hi-IN. Hinglish → en-IN (better for Roman-script speakers who mix Hindi+English).
    // English → en-IN (Indian English accent — much better than en-US for Indian users).
    const lang = languageRef.current;
    recognition.lang = lang === "hindi" ? "hi-IN" : lang === "hinglish" ? "en-IN" : "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalT = "";
    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      finalT = "";
    };
    recognition.onresult = (event: any) => {
      let interim = "";
      finalT = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalT += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInput(finalT || interim);
    };
    recognition.onerror = (event: any) => {
      console.warn("Recognition error:", event.error);
      isListeningRef.current = false;
      setIsListening(false);
      if (event.error === "not-allowed") {
        alert("Microphone permission denied.");
      } else if (event.error === "network") {
        if (window.self !== window.top) {
          alert("Voice is blocked inside the preview pane. Click 'Open in new tab' button at the top of the preview.");
        }
      }
    };
    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
      if (recognition.__commSkillsDiscardResult) {
        recognition.__commSkillsDiscardResult = false;
        setInput("");
        return;
      }
      const txt = finalT.trim();
      if (voiceModeRef.current && txt) {
        if (isLikelyAssistantEcho(txt, latestAssistantSpeechRef.current)) {
          setInput("");
          setVoiceError("I heard the coach’s voice through the microphone and ignored it. Please answer when you’re ready.");
          setTimeout(() => {
            if (voiceModeRef.current && !isMutedRef.current && !isStreamingRef.current && !isListeningRef.current) {
              startListeningRef.current?.();
            }
          }, 600);
          return;
        }
        setVoiceError(null);
        setTimeout(() => {
          if (voiceModeRef.current && !isStreamingRef.current) sendMessageRef.current?.(txt);
        }, 75);
      }
    };
    try { recognition.start(); } catch {
      isListeningRef.current = false;
      setIsListening(false);
    }
  }, [voiceMode]);

  const stopListening = useCallback((discard = false) => {
    const recognition = recognitionRef.current;
    if (recognition && isListeningRef.current && discard) {
      recognition.__commSkillsDiscardResult = true;
    }
    recognition?.stop();
    isListeningRef.current = false;
    setIsListening(false);
  }, []);

  const toggleVoiceMode = useCallback(() => {
    const next = !voiceModeRef.current;
    voiceModeRef.current = next;
    setVoiceMode(next);
    if (!next) {
      stopListening(true);
    } else if (sessionStartedRef.current && !isSpeakingRef.current && !isStreamingRef.current) {
      void startListening();
    }
  }, [startListening, stopListening]);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next) stopAllSpeech();
  }, [stopAllSpeech]);

  // ============================================================
  // CHAT — Stream from /api/companion/respond
  // ============================================================
  const requestAnswerScore = useCallback(async (
    assistantMessageId: string,
    question: string,
    answer: string,
    profile: InterviewProfile,
    requestGeneration: number,
  ) => {
    setAnswerScorecards(previous => ({
      ...previous,
      [assistantMessageId]: { status: "loading", question, answer, profile },
    }));
    try {
      const score = await scoreCompanionAnswer({
        data: {
          roleTitle: profile.roleTitle.trim(),
          experienceLevel: profile.experienceLevel,
          jobDescription: profile.jobDescription.trim() || undefined,
          question,
          answer,
        },
      });
      if (requestGeneration !== sessionGenerationRef.current) return;
      setAnswerScorecards(previous => ({
        ...previous,
        [assistantMessageId]: { status: "ready", question, answer, profile, score },
      }));
    } catch {
      if (requestGeneration !== sessionGenerationRef.current) return;
      setAnswerScorecards(previous => ({
        ...previous,
        [assistantMessageId]: { status: "error", question, answer, profile },
      }));
    }
  }, [scoreCompanionAnswer]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreamingRef.current) return;

    const now = Date.now();
    const previous = lastSubmittedRef.current;
    if (previous && previous.text === trimmed && now - previous.at < 1500) return;
    lastSubmittedRef.current = { text: trimmed, at: now };
    const requestGeneration = sessionGenerationRef.current;
    const answerQuestionIndex = interviewQuestionIndexRef.current;
    const profileForThisAnswer = { ...interviewProfile };
    const responseController = new AbortController();
    responseAbortRef.current = responseController;
    isStreamingRef.current = true;

    if (!sessionStartedRef.current) {
      setSessionStarted(true);
      sessionStartedRef.current = true;
      sessionStartTime.current = Date.now();
    }

    stopAllSpeech();
    // Begin the silent unlock while this send is still inside the user's
    // click/tap handler. Streamed speech waits for it before using the element.
    void unlockAudioPlayback();

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const botId = `a-${Date.now() + 1}`;
    const botMsg: Msg = { id: botId, role: "assistant", content: "" };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput("");
    setIsStreaming(true);

    // Reset sentence-chunk cursor for this new reply
    let fullText = "";
    let shouldAdvanceInterview = true;
    spokenUpToRef.current = 0;

    // Scans any newly-arrived text for complete sentences and queues them
    // for speech immediately, instead of waiting for the whole reply.
    const flushSpeakableSentences = (finalFlush = false) => {
      if (isMutedRef.current) return;
      const unspoken = fullText.slice(spokenUpToRef.current);
      if (finalFlush) {
        if (unspoken.trim()) {
          enqueueChunk(unspoken);
          spokenUpToRef.current = fullText.length;
        }
        return;
      }
      const sentenceRe = /[^.!?\n]+[.!?\n]+/g;
      let match: RegExpExecArray | null;
      let lastEnd = 0;
      while ((match = sentenceRe.exec(unspoken)) !== null) {
        const sentence = match[0];
        if (sentence.trim()) enqueueChunk(sentence);
        lastEnd = match.index + sentence.length;
      }
      if (lastEnd > 0) spokenUpToRef.current += lastEnd;
    };

    try {
      // The welcome card and an empty assistant placeholder are UI-only. Do
      // not send them as conversation turns because they confuse interview
      // question progression and can make the model repeat itself.
      const history = messages
        .filter(m => m.id !== "welcome" && m.content.trim() && !m.content.trim().startsWith("⚠️"))
        .slice(-12)
        .map(m => ({ role: m.role, content: m.content }));
      const res = await fetch(apiUrl("/api/companion/respond"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          history,
          message: trimmed,
          language,
          questionIndex: mode === "interview" ? interviewQuestionIndexRef.current : undefined,
          interviewProfile: mode === "interview" ? profileForThisAnswer : undefined,
        }),
        signal: responseController.signal,
      });
      if (requestGeneration !== sessionGenerationRef.current) return;
      if (res.status === 402) {
        setMessages(prev => prev.map(m => m.id === botId
          ? { ...m, content: "AI Companion access is currently locked because your Premium trial has ended. Open Pricing to renew access, then try the interview again." }
          : m
        ));
        return;
      }
      if (!res.ok || !res.body) throw new Error(`Stream failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      let responseFailed = false;
      const processSseLine = (line: string) => {
        const t = line.trim();
        if (!t.startsWith("data:")) return;
        const json = t.slice(5).trim();
        if (!json || json === "[DONE]") return;
        try {
          const data = JSON.parse(json);
          if (data.interviewAdvance === false) shouldAdvanceInterview = false;
          if (data.error) {
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: `⚠️ ${data.error}` } : m));
            responseFailed = true;
            done = true;
            return;
          }
          if (data.content) {
            fullText += data.content;
            setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: m.content + data.content } : m));
            flushSpeakableSentences();
          }
          if (data.done) {
            flushSpeakableSentences(true);
            done = true;
          }
        } catch {}
      };
      while (!done) {
        const { value, done: rd } = await reader.read();
        if (rd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          processSseLine(line);
          if (done) break;
        }
      }
      if (buffer.trim() && !done) processSseLine(buffer);
      if (!done) {
        flushSpeakableSentences(true);
      }
      if (fullText.trim()) {
        latestAssistantSpeechRef.current = {
          text: normalizedSpeechText(fullText),
          at: Date.now(),
        };
      }
      if (!responseFailed && shouldAdvanceInterview && fullText.trim() && mode === "interview" && requestGeneration === sessionGenerationRef.current) {
        void requestAnswerScore(
          botId,
          interviewQuestionFor(answerQuestionIndex, profileForThisAnswer.roleTitle),
          trimmed,
          profileForThisAnswer,
          requestGeneration,
        );
        interviewQuestionIndexRef.current = Math.min(interviewQuestionIndexRef.current + 1, 8);
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || requestGeneration !== sessionGenerationRef.current) return;
      console.error("Companion stream error:", err);
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: "⚠️ I couldn't respond right now. Please try again." } : m));
    } finally {
      if (responseAbortRef.current === responseController) responseAbortRef.current = null;
      if (requestGeneration === sessionGenerationRef.current) {
        isStreamingRef.current = false;
        setIsStreaming(false);
        if (fullText.trim()) autoListenAfterSpeakRef.current?.();
      }
    }
  }, [messages, mode, language, interviewProfile, enqueueChunk, stopAllSpeech, unlockAudioPlayback, requestAnswerScore]);

  const handleSend = () => {
    if (input.trim()) sendMessage(input.trim());
  };

  // Sync function refs for use inside event handlers
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  // ============================================================
  // SESSION MANAGEMENT
  // ============================================================
  const startSession = useCallback(() => {
    const welcome = mode === "interview"
      ? interviewWelcomeFor(interviewProfile, language)
      : WELCOME_MSGS.friend[language];
    setMessages([{ id: "welcome", role: "assistant", content: welcome }]);
    setSessionStarted(true);
    sessionStartedRef.current = true;
    sessionStartTime.current = Date.now();
    setShowFeedback(false);
    setFeedback(null);
    if (!isMutedRef.current) speakText(welcome);
    // Auto-start camera (best effort) so user sees themselves immediately
    if (!cameraOn) {
      startCamera().catch(() => {});
    }
  }, [mode, language, interviewProfile, cameraOn, startCamera, speakText]);

  // ============================================================
  // "CALL" — in-app, phone-call-style voice conversation
  // (no real phone number involved — this rings & connects inside the browser)
  // ============================================================
  const startCall = useCallback(() => {
    if (mode === "interview" && !interviewProfile.roleTitle.trim()) {
      alert("Enter a target job role before starting the interview.");
      return;
    }
    // Must run synchronously inside the click handler (before any async work)
    // so mobile browsers treat subsequent audio playback as user-initiated.
    stopAllSpeech();
    setIsCallActive(true);
    setCallStatus("ringing");
    setCallSeconds(0);
    setVoiceMode(true);
    voiceModeRef.current = true;
    setIsMuted(false);
    isMutedRef.current = false;
    setCallInput("");
    try { document.body.style.overflow = "hidden"; } catch {}
    const hadActiveSession = sessionStartedRef.current;
    if (!hadActiveSession) {
      startSession();
    } else {
      void unlockAudioPlayback();
    }
    // Brief "ringing" beat for realism, then connect and let her speak first.
    if (callStartTimeoutRef.current) clearTimeout(callStartTimeoutRef.current);
    callStartTimeoutRef.current = setTimeout(() => {
      setCallStatus("connected");
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
       if (hadActiveSession && speechRecognitionSupported && !isSpeakingRef.current) {
        // Session already running (e.g. resumed) — jump straight into listening.
        setTimeout(() => startListeningRef.current?.(), 300);
      }
    }, 900);
  }, [mode, interviewProfile, startSession, stopAllSpeech, unlockAudioPlayback, speechRecognitionSupported]);

  const endCall = useCallback(() => {
    cancelActiveResponse();
    stopAllSpeech();
    stopListening(true);
    setIsCallActive(false);
    setVoiceMode(false);
    voiceModeRef.current = false;
    setCallStatus("ringing");
    setCallSeconds(0);
    try { document.body.style.overflow = ""; } catch {}
    if (callStartTimeoutRef.current) {
      clearTimeout(callStartTimeoutRef.current);
      callStartTimeoutRef.current = null;
    }
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
  }, [cancelActiveResponse, stopAllSpeech, stopListening]);

  // Safety net: always restore body scroll if the component unmounts mid-call.
  useEffect(() => {
    return () => { try { document.body.style.overflow = ""; } catch {} };
  }, []);

  const sendCallText = useCallback(() => {
    const txt = callInput.trim();
    if (!txt || isStreamingRef.current) return;
    setCallInput("");
    sendMessageRef.current?.(txt);
  }, [callInput, isStreaming]);

  useEffect(() => () => { if (callTimerRef.current) clearInterval(callTimerRef.current); }, []);

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const switchMode = useCallback((newMode: Mode) => {
    if (newMode === mode) return;
    cancelActiveResponse();
    stopAllSpeech();
    stopListening(true);
    setIsCallActive(false);
    setVoiceMode(false);
    voiceModeRef.current = false;
    try { document.body.style.overflow = ""; } catch {}
    if (callStartTimeoutRef.current) clearTimeout(callStartTimeoutRef.current);
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    setMode(newMode);
    setMessages([]);
    setShowFeedback(false);
    setFeedback(null);
    setAnswerScorecards({});
    setSessionStarted(false);
    sessionStartedRef.current = false;
    interviewQuestionIndexRef.current = 0;
  }, [mode, cancelActiveResponse, stopAllSpeech, stopListening]);

  const endSession = useCallback(async () => {
    if (messages.length < 2) {
      alert("Talk a bit first! Have at least one exchange before getting feedback.");
      return;
    }
    setLoadingFeedback(true);
    try {
      const sessionDuration = Math.round((Date.now() - sessionStartTime.current) / 1000);
      const userMsgCount = messages.filter(m => m.role === "user").length;
      const res = await fetch(apiUrl("/api/companion/feedback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          transcript: messages.map(m => ({ role: m.role, content: m.content })),
          observations: {
            cameraOnPercent: cameraOn ? 100 : 0,
            speakingTime: sessionDuration,
            questionsAnswered: userMsgCount,
          },
        }),
      });
      if (!res.ok) throw new Error("Feedback failed");
      const data: FeedbackResult = await res.json();
      setFeedback(data);
      setShowFeedback(true);

      // Award progress points
      const points = Math.round(data.communicationScore / 10);
      updateProgress({
        data: {
          type: "speaking",
          description: `Completed ${mode} session with AI Companion (${userMsgCount} exchanges)`,
          pointsEarned: points,
          accuracy: data.communicationScore,
        },
      }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() }),
      });
    } catch (err) {
      console.error("Feedback error:", err);
      alert("Couldn't generate feedback. Please try again.");
    } finally {
      setLoadingFeedback(false);
    }
  }, [messages, mode, cameraOn, updateProgress, queryClient]);

  const resetSession = useCallback(() => {
    cancelActiveResponse();
    stopAllSpeech();
    setMessages([]);
    setShowFeedback(false);
    setFeedback(null);
    setAnswerScorecards({});
    setSessionStarted(false);
    sessionStartedRef.current = false;
    interviewQuestionIndexRef.current = 0;
    setInput("");
  }, [cancelActiveResponse, stopAllSpeech]);

  const openInNewTab = () => window.open(window.location.href, "_blank", "noopener,noreferrer");
  const showIframeBanner = inIframe && !bannerDismissed;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 pb-12">
      {/* Iframe banner — BIG and obvious so user knows mic/camera need a new tab */}
      {showIframeBanner && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 px-4 py-4 shadow-lg"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-white min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0 animate-pulse">
                <Mic className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-base sm:text-lg leading-tight">Mic & Camera blocked here!</div>
                <div className="text-xs sm:text-sm text-white/90 leading-tight">Browsers don't allow camera/mic inside preview frames. Click the button to open in a real tab →</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={openInNewTab}
                className="font-bold px-5 py-2.5 rounded-xl bg-white text-orange-700 hover:bg-amber-50 shadow-lg hover:scale-105 transition-all text-sm whitespace-nowrap"
              >
                Open in new tab ↗
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="text-white/80 hover:text-white px-2 text-lg"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-2">
                AI Female Companion
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gradient-to-r from-indigo-100 to-pink-100 text-indigo-700">PREMIUM</span>
              </h1>
              <p className="text-slate-500 text-base mt-0.5">Practice interviews or chat with a friendly AI companion — voice, camera & feedback</p>
            </div>
            <button
              onClick={startCall}
              className={cn(
                "ml-auto hidden sm:flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-105 shrink-0",
                mode === "interview"
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-500/30"
                  : "bg-gradient-to-r from-rose-500 to-pink-500 shadow-rose-500/30"
              )}
              title="Start a live voice call in-app (no real phone number needed)"
            >
              <Phone className="w-5 h-5" />
              Call {mode === "interview" ? "Aisha" : "Priya"}
            </button>
          </div>
          <button
            onClick={startCall}
            className={cn(
              "sm:hidden w-full flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-white shadow-lg transition-all",
              mode === "interview"
                ? "bg-gradient-to-r from-indigo-600 to-blue-600"
                : "bg-gradient-to-r from-rose-500 to-pink-500"
            )}
          >
            <Phone className="w-5 h-5" />
            Call {mode === "interview" ? "Aisha" : "Priya"}
          </button>
        </motion.div>

        {/* Mode Selector — choose your companion */}
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">Choose your companion:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {(Object.keys(MODE_INFO) as Mode[]).map(m => {
            const info = MODE_INFO[m];
            const isActive = mode === m;
            const thumb = m === "interview" ? aishaThumb : priyaThumb;
            return (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={cn(
                  "relative p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 group",
                  isActive
                    ? m === "interview"
                      ? "border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-500/20 scale-[1.02]"
                      : "border-rose-500 bg-rose-50 shadow-xl shadow-rose-500/20 scale-[1.02]"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
                )}
              >
                {/* Avatar thumbnail */}
                <div className={cn(
                  "w-16 h-16 rounded-full overflow-hidden border-2 shrink-0 shadow-md",
                  isActive
                    ? m === "interview" ? "border-indigo-300" : "border-rose-300"
                    : "border-slate-200"
                )}>
                  <img src={thumb} alt={m} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <info.icon className={cn(
                      "w-4 h-4",
                      m === "interview" ? "text-indigo-600" : "text-rose-600"
                    )} />
                    <span className="font-display font-bold text-slate-900 text-base">{info.btnLabel}</span>
                  </div>
                  <div className="text-xs text-slate-600 mb-1">
                    {m === "interview" ? "with Aisha (HR Coach)" : "with Priya (Bestie)"}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{info.btnDesc}</div>
                </div>
                {isActive && (
                  <div className={cn(
                    "absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg",
                    m === "interview" ? "bg-indigo-600" : "bg-rose-500"
                  )}>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: Avatar + Camera */}
          <div className="lg:col-span-2 space-y-4">
            {/* Avatar Card */}
            <div className={cn(
              "rounded-3xl p-6 border-2 shadow-xl relative overflow-hidden",
              mode === "interview"
                ? "bg-gradient-to-br from-indigo-50 to-blue-100 border-indigo-200"
                : "bg-gradient-to-br from-rose-50 to-pink-100 border-rose-200"
            )}>
              <div className="text-center mb-3">
                <h3 className="font-display font-bold text-xl text-slate-900">{modeInfo.title}</h3>
                <p className="text-xs text-slate-600 mt-1">{modeInfo.subtitle}</p>
              </div>
              <div className="aspect-square w-full max-w-[280px] mx-auto">
                <FemaleAvatar
                  isSpeaking={isSpeaking}
                  isListening={isListening}
                  mode={mode}
                  expression={isStreaming ? "neutral" : isListening ? "smile" : mode === "friend" ? "smile" : "neutral"}
                />
              </div>
              <div className="flex justify-center mt-3">
                {isSpeaking && (
                  <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold flex items-center gap-1.5 animate-pulse">
                    <Volume2 className="w-3 h-3" /> Speaking...
                  </span>
                )}
                {isListening && !isSpeaking && (
                  <span className="text-xs px-3 py-1 bg-rose-100 text-rose-700 rounded-full font-semibold flex items-center gap-1.5 animate-pulse">
                    <Mic className="w-3 h-3" /> Listening...
                  </span>
                )}
                {!isSpeaking && !isListening && (
                  <span className="text-xs px-3 py-1 bg-slate-100 text-slate-600 rounded-full font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Ready
                  </span>
                )}
              </div>
            </div>

            {/* Camera Card */}
            <div className="rounded-3xl p-4 bg-slate-900 border-2 border-slate-800 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Your Camera
                </span>
                <button
                  onClick={cameraOn ? stopCamera : startCamera}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5",
                    cameraOn
                      ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                  )}
                >
                  {cameraOn ? <><CameraOff className="w-3 h-3" /> Off</> : <><Camera className="w-3 h-3" /> On</>}
                </button>
              </div>
              <div className="aspect-video w-full bg-slate-800 rounded-xl overflow-hidden relative">
                {/* Video is ALWAYS mounted so the ref is ready before getUserMedia returns.
                    We just hide it when the camera is off. */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover scale-x-[-1] bg-black",
                    cameraOn ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                />
                {cameraOn ? (
                  <>
                    {/* Camera tip overlay */}
                    <AnimatePresence>
                      {activeTip && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute top-2 left-2 right-2 bg-amber-500/90 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 shadow-lg backdrop-blur-sm z-10"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{activeTip}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Recording indicator */}
                    <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm z-10">
                      <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                      LIVE
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                    <CameraOff className="w-10 h-10 mb-3 text-slate-500" />
                    {cameraError ? (
                      <>
                        <p className="text-xs text-amber-300 mb-3 leading-relaxed">{cameraError}</p>
                        {inIframe ? (
                          <button
                            onClick={openInNewTab}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600"
                          >
                            Open in new tab ↗
                          </button>
                        ) : (
                          <button
                            onClick={startCamera}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                          >
                            Try again
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xs mb-3">Turn on camera to see yourself</p>
                        <button
                          onClick={startCamera}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/90 text-white hover:bg-emerald-500"
                        >
                          <Camera className="w-3 h-3 inline mr-1" /> Turn on camera
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Chat + Controls */}
          <div className="lg:col-span-3 flex flex-col rounded-3xl bg-white border-2 border-slate-200 shadow-xl overflow-hidden" style={{ minHeight: "650px" }}>
            {/* Chat Header */}
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MessageSquareText className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Conversation</span>
                {sessionStarted && (
                  <span className="text-xs text-slate-500">· {messages.filter(m => m.role === "user").length} {mode === "interview" ? "questions answered" : "messages"}</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Language selector — English / Hindi / Hinglish */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200" role="tablist" aria-label="Language">
                  {([
                    { id: "english" as const, label: "EN", title: "English" },
                    { id: "hinglish" as const, label: "Hinglish", title: "Hindi + English mix" },
                    { id: "hindi" as const, label: "हिंदी", title: "Hindi" },
                  ]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setLanguage(opt.id);
                        stopAllSpeech();
                      }}
                      title={opt.title}
                      className={cn(
                        "text-[11px] px-2 py-1 rounded-md font-bold transition-all",
                        language === opt.id
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={toggleVoiceMode}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1",
                    voiceMode ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-500 border-slate-200"
                  )}
                  title="Voice mode auto-sends after you stop speaking"
                >
                  {voiceMode ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                  {voiceMode ? "Voice ON" : "Voice OFF"}
                </button>
                <button
                  onClick={toggleMute}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1",
                    isMuted ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-indigo-50 text-indigo-600 border-indigo-100"
                  )}
                >
                  {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  {isMuted ? "Muted" : "Sound"}
                </button>
                <button
                  onClick={resetSession}
                  className="text-xs p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                  title="Reset conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[300px]">
              {!sessionStarted && messages.length === 0 ? (
                mode === "interview" ? (
                  <div className="w-full max-w-xl mx-auto flex flex-col justify-center gap-4 py-4">
                    <div className="text-center">
                      <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Briefcase className="w-7 h-7" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-slate-900">Set up your job-specific interview</h3>
                      <p className="text-sm text-slate-500 mt-1">Aisha will tailor questions and score each answer for this role.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="block text-left">
                        <span className="block text-xs font-semibold text-slate-700 mb-1.5">Target job role <span className="text-rose-500">*</span></span>
                        <input
                          value={interviewProfile.roleTitle}
                          onChange={(event) => setInterviewProfile(profile => ({ ...profile, roleTitle: event.target.value.slice(0, 100) }))}
                          maxLength={100}
                          placeholder="e.g. Frontend Engineer"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>
                      <label className="block text-left">
                        <span className="block text-xs font-semibold text-slate-700 mb-1.5">Experience level</span>
                        <select
                          value={interviewProfile.experienceLevel}
                          onChange={(event) => setInterviewProfile(profile => ({ ...profile, experienceLevel: event.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        >
                          {["Student / New graduate", "Early career", "Mid-career", "Senior / Leadership"].map(level => (
                            <option key={level} value={level}>{level}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="block text-left">
                      <span className="block text-xs font-semibold text-slate-700 mb-1.5">Job description <span className="font-normal text-slate-400">· optional</span></span>
                      <textarea
                        value={interviewProfile.jobDescription}
                        onChange={(event) => setInterviewProfile(profile => ({ ...profile, jobDescription: event.target.value.slice(0, 3000) }))}
                        maxLength={3000}
                        rows={3}
                        placeholder="Paste responsibilities or key skills to make the questions more specific."
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                      <span className="mt-1 block text-right text-[11px] text-slate-400">{interviewProfile.jobDescription.length}/3000</span>
                    </label>
                    <p className="text-[11px] text-slate-400 text-center">These details are used for this interview session and aren’t saved to your profile.</p>
                    <button
                      onClick={startSession}
                      disabled={!interviewProfile.roleTitle.trim()}
                      className="self-center px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-500/30 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Start job-specific interview
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 bg-rose-100 text-rose-600">
                      <modeInfo.icon className="w-10 h-10" />
                    </div>
                    <h3 className="font-display font-bold text-xl text-slate-900 mb-2">Wanna chat with Priya?</h3>
                    <p className="text-sm text-slate-500 max-w-md mb-6">Priya is your AI bestie — share your day, ask for motivation, or just have a fun chat.</p>
                    <button
                      onClick={startSession}
                      className="px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-500/30"
                    >
                      Start Chat
                    </button>
                  </div>
                )
              ) : (
                messages.map(m => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}
                  >
                    {m.role === "assistant" && (
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1",
                        mode === "interview" ? "bg-indigo-100 text-indigo-600" : "bg-rose-100 text-rose-600"
                      )}>
                        {mode === "interview" ? "A" : "P"}
                      </div>
                    )}
                    <div className={cn("flex flex-col items-start gap-1.5", m.role === "user" ? "max-w-[80%]" : "max-w-[96%] md:max-w-[90%]")}>
                      <div className={cn(
                        "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-tr-sm"
                          : "bg-slate-100 text-slate-800 rounded-tl-sm"
                      )}>
                        {m.content || <span className="text-slate-400">...</span>}
                      </div>
                      {m.role === "assistant" && m.content.trim() && (
                        <button
                          type="button"
                           onClick={() => { void speakText(m.content); }}
                          disabled={isStreaming}
                          aria-label={`Read ${mode === "interview" ? "Aisha's" : "Priya's"} message aloud`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                          Read aloud
                        </button>
                      )}
                      {m.role === "assistant" && mode === "interview" && answerScorecards[m.id] && (
                        <AnswerScorecardPanel
                          entry={answerScorecards[m.id]}
                          onRetry={() => {
                            const entry = answerScorecards[m.id];
                            if (entry) {
                              void requestAnswerScore(
                                m.id,
                                entry.question,
                                entry.answer,
                                entry.profile,
                                sessionGenerationRef.current,
                              );
                            }
                          }}
                        />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input + End Session */}
            {sessionStarted && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="flex items-end gap-2 mb-2">
                  <button
                    onClick={isListening ? () => stopListening() : () => void startListening()}
                    disabled={isStreaming}
                    className={cn(
                      "p-3 rounded-xl shadow-md transition-all shrink-0",
                      isListening
                        ? "bg-rose-500 text-white animate-pulse"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    )}
                    title={isListening ? "Stop" : "Talk"}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={mode === "interview" ? "Type or speak your answer..." : "Say something to Priya..."}
                    rows={1}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    disabled={isStreaming}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isStreaming}
                    className={cn(
                      "p-3 rounded-xl shadow-md shrink-0 transition-all",
                      input.trim() && !isStreaming
                        ? mode === "interview"
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "bg-rose-500 text-white hover:bg-rose-600"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                  <span className={cn("truncate", voiceError ? "text-amber-700" : "text-slate-500")}>
                    {voiceMode && <>🎙️ Voice mode ON · </>}
                    {language === "hindi" ? "हिंदी" : language === "hinglish" ? "Hinglish" : "English"}
                    {" · "}
                    {voiceError || activeVoiceName || "Indian female voice (AI-generated)"}
                  </span>
                  <button
                    onClick={endSession}
                    disabled={loadingFeedback || messages.length < 2}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                      messages.length >= 2 && !loadingFeedback
                        ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-md"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    {loadingFeedback ? "Analyzing..." : "End & Get Feedback"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Modal */}
        <AnimatePresence>
          {showFeedback && feedback && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowFeedback(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className={cn(
                  "p-6 text-white relative",
                  mode === "interview"
                    ? "bg-gradient-to-br from-indigo-600 to-blue-700"
                    : "bg-gradient-to-br from-rose-500 to-pink-600"
                )}>
                  <button onClick={() => setShowFeedback(false)} className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl">×</button>
                  <Trophy className="w-12 h-12 mb-3 text-amber-300" />
                  <h2 className="text-2xl font-display font-bold mb-1">Session Complete!</h2>
                  <p className="text-white/90 text-sm">{feedback.summary}</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Scores grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Communication", value: feedback.communicationScore, color: "indigo" },
                      { label: "Confidence", value: feedback.confidenceLevel, color: "emerald" },
                      { label: "Clarity", value: feedback.clarityScore, color: "amber" },
                      { label: "Grammar", value: feedback.grammarScore, color: "rose" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl border border-slate-200 p-3 text-center">
                        <div className={cn(
                          "text-3xl font-bold mb-1",
                          s.color === "indigo" && "text-indigo-600",
                          s.color === "emerald" && "text-emerald-600",
                          s.color === "amber" && "text-amber-600",
                          s.color === "rose" && "text-rose-600",
                        )}>{s.value}</div>
                        <div className="text-xs font-medium text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Strengths */}
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <Award className="w-4 h-4 text-emerald-500" /> Strengths
                    </h3>
                    <ul className="space-y-1.5">
                      {feedback.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Improvements */}
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" /> Suggestions to Improve
                    </h3>
                    <ul className="space-y-1.5">
                      {feedback.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => { setShowFeedback(false); resetSession(); }}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => setShowFeedback(false)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-white font-semibold",
                        mode === "interview" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-500 hover:bg-rose-600"
                      )}
                    >
                      Continue Session
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* In-App Call Overlay — full-screen phone-call-style voice session */}
        <AnimatePresence>
          {isCallActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "fixed inset-0 z-[100] flex flex-col items-center justify-between text-white overflow-hidden",
                "h-[100dvh] px-4 sm:px-10",
                "pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]",
                mode === "interview"
                  ? "bg-gradient-to-br from-indigo-950 via-indigo-900 to-blue-950"
                  : "bg-gradient-to-br from-rose-950 via-rose-900 to-pink-950"
              )}
              style={{ touchAction: "manipulation" }}
            >
              {/* Top: status */}
              <div className="text-center mt-2 sm:mt-6 shrink-0">
                <p className="text-sm font-medium text-white/60 uppercase tracking-wide">
                  {callStatus === "ringing" ? "Calling..." : "In-app voice call"}
                </p>
                <p className="text-3xl font-display font-bold mt-1">
                  {mode === "interview" ? "Aisha" : "Priya"}
                </p>
                <p className="text-white/50 text-sm mt-1">
                  {callStatus === "ringing" ? "Connecting inside CommSkills" : formatCallTime(callSeconds)}
                </p>
              </div>

              {/* Middle: avatar */}
              <div className="flex flex-col items-center min-h-0 flex-1 justify-center">
                <motion.div
                  animate={callStatus === "ringing" ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                  transition={callStatus === "ringing" ? { duration: 1.1, repeat: Infinity } : {}}
                  className={cn(
                    "w-40 h-40 sm:w-64 sm:h-64 rounded-full p-1.5 max-h-[38vh]",
                    isSpeaking
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 animate-pulse"
                      : isListening
                      ? "bg-gradient-to-br from-rose-400 to-rose-600 animate-pulse"
                      : "bg-white/10"
                  )}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-white/5">
                    <FemaleAvatar
                      isSpeaking={isSpeaking}
                      isListening={isListening}
                      mode={mode}
                      expression={isStreaming ? "neutral" : isListening ? "smile" : "smile"}
                    />
                  </div>
                </motion.div>
                <div className="mt-4 text-sm font-medium text-center px-4">
                  {callStatus === "ringing" ? (
                    <span className="text-white/70">Ringing...</span>
                  ) : isSpeaking ? (
                    <span className="text-emerald-300 flex items-center gap-1.5 justify-center"><Volume2 className="w-4 h-4" /> Speaking...</span>
                  ) : isListening ? (
                    <span className="text-rose-300 flex items-center gap-1.5 justify-center animate-pulse"><Mic className="w-4 h-4" /> Listening...</span>
                  ) : speechRecognitionSupported ? (
                    <span className="text-white/60">Go ahead, say something</span>
                  ) : (
                    <span className="text-white/60">Voice typing isn't supported on this browser — type below instead</span>
                  )}
                </div>
              </div>

              {/* Text fallback is always available, including browsers where
                  speech recognition exists but is blocked by permissions or network policy. */}
              {callStatus === "connected" && (
                <div className="w-full max-w-md flex items-center gap-2 mb-3 shrink-0">
                  <input
                    value={callInput}
                    onChange={(e) => setCallInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendCallText(); } }}
                    placeholder="Type your reply..."
                    disabled={isStreaming}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-white/40"
                  />
                  <button
                    onClick={sendCallText}
                    disabled={!callInput.trim() || isStreaming}
                    className="p-3 rounded-xl bg-white/20 disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Bottom: controls */}
              <div className="flex items-center gap-5 sm:gap-6 mb-1 shrink-0">
                <button
                  onClick={toggleMute}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95",
                    isMuted ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
                  )}
                  title={isMuted ? "Unmute" : "Mute her voice"}
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                <button
                  onClick={endCall}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 flex items-center justify-center shadow-xl shadow-rose-900/50 transition-all active:scale-95"
                  title="End call"
                >
                  <PhoneOff className="w-7 h-7 text-white" />
                </button>
                <button
                  onClick={() => {
                    if (!speechRecognitionSupported) return;
                    unlockAudioPlayback();
                    isListening ? stopListening() : startListening();
                  }}
                  disabled={callStatus === "ringing" || isStreaming || !speechRecognitionSupported}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-30",
                    isListening ? "bg-rose-500 text-white animate-pulse" : "bg-white/15 text-white hover:bg-white/25"
                  )}
                  title={!speechRecognitionSupported ? "Voice typing unsupported — use the text box" : isListening ? "Stop talking" : "Talk now"}
                >
                  {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
