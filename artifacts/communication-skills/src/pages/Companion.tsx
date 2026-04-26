import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Mic, MicOff, Camera, CameraOff, Volume2, VolumeX,
  Briefcase, Heart, Send, RotateCcw, AlertCircle, Trophy,
  CheckCircle2, TrendingUp, Award, MessageSquareText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FemaleAvatar } from "@/components/companion/FemaleAvatar";
import { useUpdateProgress } from "@workspace/api-client-react";
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

type LangKey = "english" | "hindi" | "hinglish";

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

export default function Companion() {
  const [mode, setMode] = useState<Mode>("interview");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTip, setActiveTip] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [language, setLanguage] = useState<"english" | "hindi" | "hinglish">("english");
  const languageRef = useRef<"english" | "hindi" | "hinglish">("english");
  useEffect(() => { languageRef.current = language; }, [language]);
  // Track which voices are actually available so we can warn the user when Hindi is missing
  const [hasHindiVoice, setHasHindiVoice] = useState(false);
  const [hasIndianEnglishVoice, setHasIndianEnglishVoice] = useState(false);
  const [activeVoiceName, setActiveVoiceName] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const sessionStartTime = useRef<number>(0);
  const lastSpokenIdRef = useRef<string>("");
  const voiceModeRef = useRef<boolean>(false);
  const isMutedRef = useRef<boolean>(false);
  const isStreamingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const sendMessageRef = useRef<((t: string) => void) | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);

  // Sync refs with state for use inside callbacks/event handlers
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  const queryClient = useQueryClient();
  const { mutate: updateProgress } = useUpdateProgress();
  const modeInfo = MODE_INFO[mode];

  // Iframe detection
  useEffect(() => {
    try { setInIframe(window.self !== window.top); } catch { setInIframe(true); }
  }, []);

  // Preload speech voices and detect Hindi/Indian English availability
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setHasHindiVoice(voices.some(v => v.lang === "hi-IN" || v.lang.startsWith("hi")));
      setHasIndianEnglishVoice(voices.some(v => v.lang === "en-IN"));
      // Helpful debug: list all available voices once loaded
      if (voices.length > 0) {
        // eslint-disable-next-line no-console
        console.log("[CommSkills] Available voices:", voices.map(v => `${v.name} (${v.lang})`));
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Auto scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      stopCamera();
      recognitionRef.current?.stop();
    };
  }, []);

  // Auto-speak last assistant message
  useEffect(() => {
    if (isMuted || isStreaming) return;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.content && last.id !== lastSpokenIdRef.current) {
      lastSpokenIdRef.current = last.id;
      speakText(last.content);
    }
  }, [messages, isStreaming, isMuted]);

  // ============================================================
  // SPEECH SYNTHESIS — Standard English Female (US/UK)
  // ============================================================
  const speakText = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`>]/g, "").replace(/\([^)]*\)/g, "").replace(/\n{2,}/g, ". ").trim();
    if (!clean) return;

    // ===== Detect Devanagari script (Hindi) per-utterance =====
    const hasDevanagari = /[\u0900-\u097F]/.test(clean);
    const lang = languageRef.current;
    const wantHindiVoice = lang === "hindi" || (lang === "hinglish" && hasDevanagari);

    const voices = window.speechSynthesis.getVoices();
    const isFemale = (n: string) =>
      /female|woman|girl|samantha|zira|susan|karen|tessa|fiona|moira|catherine|allison|ava|serena|victoria|jenny|aria|nancy|amber|emma|sara|amy|joanna|salli|kimberly|kendra|ivy|hazel|libby|swara|kalpana|heera|veena|priya|raveena|isha|aditi|lekha|google.*hindi|google.*india|microsoft.*heera|microsoft.*kalpana/i.test(n);

    let preferred: SpeechSynthesisVoice | undefined;
    let actualLang = "en-IN"; // default to Indian English accent

    if (wantHindiVoice) {
      // 1) Prefer real Hindi female voice
      preferred =
        voices.find(v => v.lang === "hi-IN" && isFemale(v.name)) ||
        voices.find(v => v.lang === "hi-IN" && /google/i.test(v.name)) ||
        voices.find(v => v.lang === "hi-IN") ||
        voices.find(v => v.lang.startsWith("hi") && isFemale(v.name)) ||
        voices.find(v => v.lang.startsWith("hi"));
      if (preferred) {
        actualLang = "hi-IN";
      } else {
        // 2) No Hindi voice on this device — use Indian English voice but tag as hi-IN
        // so the OS may still pronounce Devanagari correctly if it has any Hindi support.
        preferred =
          voices.find(v => v.lang === "en-IN" && isFemale(v.name)) ||
          voices.find(v => v.lang === "en-IN") ||
          voices.find(v => v.lang.startsWith("en") && isFemale(v.name)) ||
          voices.find(v => v.lang.startsWith("en"));
        actualLang = "hi-IN";
      }
    } else {
      // English or Hinglish (Roman script) — use INDIAN ENGLISH (en-IN) for Indian accent
      preferred =
        voices.find(v => v.lang === "en-IN" && isFemale(v.name)) ||
        voices.find(v => v.lang === "en-IN" && /google|microsoft/i.test(v.name)) ||
        voices.find(v => v.lang === "en-IN") ||
        // Hindi voice can also speak English in Indian accent — use as fallback
        voices.find(v => v.lang === "hi-IN" && isFemale(v.name)) ||
        voices.find(v => v.lang === "hi-IN") ||
        // British English female (closer to Indian than US)
        voices.find(v => v.lang === "en-GB" && isFemale(v.name)) ||
        voices.find(v => v.lang === "en-GB") ||
        // Last resort: any English female
        voices.find(v => v.lang.startsWith("en") && isFemale(v.name)) ||
        voices.find(v => v.lang.startsWith("en"));
      actualLang = "en-IN";
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = actualLang;
    utterance.rate = mode === "interview" ? (wantHindiVoice ? 0.88 : 0.92) : (wantHindiVoice ? 0.95 : 1.0);
    utterance.pitch = mode === "interview" ? 1.1 : 1.2;
    utterance.volume = 1;
    if (preferred) {
      utterance.voice = preferred;
      setActiveVoiceName(`${preferred.name} (${preferred.lang})`);
    } else {
      setActiveVoiceName(`default ${actualLang}`);
    }

    // eslint-disable-next-line no-console
    console.log("[CommSkills] Speaking:", { lang: actualLang, voice: preferred?.name || "default", text: clean.slice(0, 60) });

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      autoListenAfterSpeakRef.current?.();
    };
    utterance.onerror = (e: any) => {
      console.warn("[CommSkills] TTS error:", e?.error || e);
      setIsSpeaking(false);
    };
    window.speechSynthesis.speak(utterance);
  }, [mode]);

  // Ref to call the latest auto-listen handler from speakText.onend
  const autoListenAfterSpeakRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    autoListenAfterSpeakRef.current = () => {
      if (voiceModeRef.current && !isMutedRef.current && !isListeningRef.current && !isStreamingRef.current) {
        setTimeout(() => {
          startListeningRef.current?.();
        }, 350);
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
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported. Try Chrome, Edge, or Safari.");
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
    window.speechSynthesis.cancel();

    const recognition = new SR();
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
    recognition.onstart = () => { setIsListening(true); finalT = ""; };
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
      setIsListening(false);
      const txt = finalT.trim();
      if (voiceModeRef.current && txt) {
        setTimeout(() => sendMessageRef.current?.(txt), 300);
      }
    };
    try { recognition.start(); } catch { setIsListening(false); }
  }, [voiceMode]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ============================================================
  // CHAT — Stream from /api/companion/respond
  // ============================================================
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    if (!sessionStarted) {
      setSessionStarted(true);
      sessionStartTime.current = Date.now();
    }

    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: trimmed };
    const botId = `a-${Date.now() + 1}`;
    const botMsg: Msg = { id: botId, role: "assistant", content: "" };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInput("");
    setIsStreaming(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/companion/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, history, message: trimmed, language }),
      });
      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { value, done: rd } = await reader.read();
        if (rd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const json = t.slice(5).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const data = JSON.parse(json);
            if (data.error) {
              setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: `⚠️ ${data.error}` } : m));
              done = true; break;
            }
            if (data.content) {
              setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: m.content + data.content } : m));
            }
            if (data.done) { done = true; break; }
          } catch {}
        }
      }
    } catch (err: any) {
      console.error("Companion stream error:", err);
      setMessages(prev => prev.map(m => m.id === botId ? { ...m, content: "⚠️ I couldn't respond right now. Please try again." } : m));
    } finally {
      setIsStreaming(false);
    }
  }, [messages, mode, language, isStreaming, sessionStarted]);

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
    const welcome = WELCOME_MSGS[mode][language];
    setMessages([{ id: "welcome", role: "assistant", content: welcome }]);
    setSessionStarted(true);
    sessionStartTime.current = Date.now();
    setShowFeedback(false);
    setFeedback(null);
    // Auto-start camera (best effort) so user sees themselves immediately
    if (!cameraOn) {
      startCamera().catch(() => {});
    }
  }, [mode, language, cameraOn, startCamera]);

  const switchMode = useCallback((newMode: Mode) => {
    if (newMode === mode) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setMode(newMode);
    setMessages([]);
    setShowFeedback(false);
    setFeedback(null);
    setSessionStarted(false);
  }, [mode]);

  const endSession = useCallback(async () => {
    if (messages.length < 2) {
      alert("Talk a bit first! Have at least one exchange before getting feedback.");
      return;
    }
    setLoadingFeedback(true);
    try {
      const sessionDuration = Math.round((Date.now() - sessionStartTime.current) / 1000);
      const userMsgCount = messages.filter(m => m.role === "user").length;
      const res = await fetch("/api/companion/feedback", {
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
    window.speechSynthesis.cancel();
    setMessages([]);
    setShowFeedback(false);
    setFeedback(null);
    setSessionStarted(false);
    setInput("");
  }, []);

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
          </div>
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
                        window.speechSynthesis.cancel();
                        setIsSpeaking(false);
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
                  onClick={() => setVoiceMode(v => !v)}
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
                  onClick={() => { setIsMuted(m => !m); window.speechSynthesis.cancel(); setIsSpeaking(false); }}
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
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mb-4",
                    mode === "interview" ? "bg-indigo-100 text-indigo-600" : "bg-rose-100 text-rose-600"
                  )}>
                    <modeInfo.icon className="w-10 h-10" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-slate-900 mb-2">
                    {mode === "interview" ? "Ready for your mock interview?" : "Wanna chat with Priya?"}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mb-6">
                    {mode === "interview"
                      ? "Aisha will ask real interview questions one by one and give you feedback on each answer."
                      : "Priya is your AI bestie — share your day, ask for motivation, or just have a fun chat."
                    }
                  </p>
                  <button
                    onClick={startSession}
                    className={cn(
                      "px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105",
                      mode === "interview"
                        ? "bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-500/30"
                        : "bg-gradient-to-r from-rose-500 to-pink-500 shadow-rose-500/30"
                    )}
                  >
                    Start {mode === "interview" ? "Interview" : "Chat"}
                  </button>
                </div>
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
                    <div className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-800 rounded-tl-sm"
                    )}>
                      {m.content || <span className="text-slate-400">...</span>}
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
                    onClick={isListening ? stopListening : startListening}
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
                  <span className="text-slate-500 truncate">
                    {voiceMode && <>🎙️ Voice mode ON · </>}
                    {language === "hindi" ? "हिंदी" : language === "hinglish" ? "Hinglish" : "English"}
                    {" · "}
                    Indian female voice
                    {activeVoiceName && <span className="text-slate-400"> · {activeVoiceName}</span>}
                    {language === "hindi" && !hasHindiVoice && (
                      <span className="ml-1 text-amber-600 font-medium">
                        · ⚠ No Hindi voice on this device — using English fallback
                      </span>
                    )}
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
      </div>
    </div>
  );
}
