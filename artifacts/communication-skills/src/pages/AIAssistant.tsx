import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Mic, Volume2, VolumeX, Bot, MicOff, GraduationCap,
  Code2, PenLine, Briefcase, Calculator, HelpCircle, MessageSquare,
  RotateCcw, ChevronDown, ChevronUp
} from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useLocalRecorder } from "@/hooks/useLocalRecorder";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const TOPIC_CATEGORIES = [
  {
    id: "communication",
    label: "Communication",
    icon: MessageSquare,
    color: "indigo",
    prompts: [
      "Explain the 7 C's of Communication with real-life examples",
      "Tips for effective public speaking",
      "How to write a professional email",
      "How to improve active listening skills",
    ],
  },
  {
    id: "academics",
    label: "Academics",
    icon: GraduationCap,
    color: "emerald",
    prompts: [
      "Explain the water cycle in simple terms",
      "What are Newton's 3 Laws of Motion?",
      "Summarize World War II causes and effects",
      "Explain photosynthesis step by step",
      "What is the difference between mitosis and meiosis?",
      "Explain the French Revolution briefly",
    ],
  },
  {
    id: "coding",
    label: "Coding",
    icon: Code2,
    color: "violet",
    prompts: [
      "What is recursion? Explain with a Python example",
      "Explain REST APIs and how they work",
      "What are the differences between SQL and NoSQL?",
      "Explain OOP concepts: classes, inheritance, polymorphism",
      "Write a function to reverse a string in JavaScript",
      "What is Big O notation? Explain with examples",
    ],
  },
  {
    id: "writing",
    label: "Writing",
    icon: PenLine,
    color: "amber",
    prompts: [
      "Help me write a strong essay introduction",
      "How do I structure a persuasive essay?",
      "What makes a good cover letter?",
      "Help me improve this sentence: 'The meeting was good and we talked about stuff'",
      "Explain the PEEL paragraph structure",
    ],
  },
  {
    id: "career",
    label: "Career",
    icon: Briefcase,
    color: "blue",
    prompts: [
      "How do I prepare for a job interview? Give me your best tips",
      "What are common behavioral interview questions?",
      "How to use the STAR method in interviews?",
      "How to negotiate a salary offer?",
      "How to write a strong LinkedIn summary?",
      "How do I switch careers effectively?",
    ],
  },
  {
    id: "math",
    label: "Math",
    icon: Calculator,
    color: "rose",
    prompts: [
      "Solve: What is the derivative of x² + 3x + 5?",
      "Explain the Pythagorean theorem with examples",
      "How do I solve quadratic equations?",
      "What is the difference between permutation and combination?",
      "Explain probability with a coin flip example",
      "How does integration work in calculus?",
    ],
  },
  {
    id: "doubts",
    label: "Doubts",
    icon: HelpCircle,
    color: "teal",
    prompts: [
      "How does the internet actually work?",
      "What is artificial intelligence in simple terms?",
      "How do vaccines work?",
      "What causes inflation?",
      "How does a computer processor work?",
      "Explain blockchain in simple words",
    ],
  },
];

const COLOR_MAP: Record<string, { tab: string; prompt: string; dot: string }> = {
  indigo: { tab: "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200", prompt: "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300", dot: "bg-indigo-500" },
  emerald: { tab: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200", prompt: "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300", dot: "bg-emerald-500" },
  violet: { tab: "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200", prompt: "hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300", dot: "bg-violet-500" },
  amber: { tab: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200", prompt: "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300", dot: "bg-amber-500" },
  blue: { tab: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200", prompt: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300", dot: "bg-blue-500" },
  rose: { tab: "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200", prompt: "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300", dot: "bg-rose-500" },
  teal: { tab: "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200", prompt: "hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300", dot: "bg-teal-500" },
};

export default function AIAssistant() {
  const { messages, isGenerating, sendMessage, stopGeneration, clearChat } = useChatStream();
  const [input, setInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeCategory, setActiveCategory] = useState("communication");
  const [showAllPrompts, setShowAllPrompts] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenIdRef = useRef<string>("");

  const { state, transcript, isRecording, startRecording, stopRecording, toggleRecording } = useLocalRecorder({
    onTranscript: (text) => {
      setInput(text);
      if (voiceMode) {
        setTimeout(() => handleSend(text.trim()), 100);
      }
    },
    onError: (message) => {
      alert(message);
    },
    language: "en-IN",
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    if (isMuted || isGenerating) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg &&
      lastMsg.role === "bot" &&
      lastMsg.text &&
      lastMsg.id !== "welcome" &&
      lastMsg.id !== lastSpokenIdRef.current
    ) {
      lastSpokenIdRef.current = lastMsg.id;
      speakText(lastMsg.text);
    }
  }, [messages, isGenerating, isMuted]);

  const speakText = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`>]/g, "").replace(/\n{2,}/g, ". ").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-IN";
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;

    // Pick the best Indian English female voice available
    const voices = window.speechSynthesis.getVoices();
    const isFemale = (name: string) => /female|woman|girl|heera|raveena|kalpana|priya|veena|aditi|leela|shelley|samantha|zira|susan|karen|tessa|fiona|moira|catherine|allison|ava|serena|victoria|rishi/i.test(name);

    const preferred =
      // 1. Indian English female voices (Google or system)
      voices.find(v => v.lang === "en-IN" && isFemale(v.name)) ||
      voices.find(v => v.lang.startsWith("en-IN") && isFemale(v.name)) ||
      // 2. Any Indian English voice (Google's "Heera" or "Raveena" are female by default)
      voices.find(v => v.lang === "en-IN" && v.name.toLowerCase().includes("google")) ||
      voices.find(v => v.lang === "en-IN") ||
      voices.find(v => v.lang.startsWith("en-IN")) ||
      // 3. Fallback: any English female voice
      voices.find(v => v.lang.startsWith("en") && isFemale(v.name)) ||
      voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
      voices.find(v => v.lang.startsWith("en")) ||
      voices[0];

    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

const handleSend = useCallback((text: string = input) => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;
    window.speechSynthesis.cancel();
    sendMessage(trimmed);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [input, isGenerating, sendMessage]);

  const toggleMute = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsMuted(prev => !prev);
  }, []);

  const toggleVoiceMode = useCallback(() => {
    const next = !voiceMode;
    setVoiceMode(next);
    if (!next) {
      stopRecording();
    } else if (!isGenerating) {
      void startRecording();
    }
  }, [voiceMode, isGenerating, startRecording, stopRecording]);

  const activeCat = TOPIC_CATEGORIES.find(c => c.id === activeCategory) || TOPIC_CATEGORIES[0];
  const colors = COLOR_MAP[activeCat.color] || COLOR_MAP["indigo"];
  const promptsToShow = showAllPrompts ? activeCat.prompts : activeCat.prompts.slice(0, 4);
  const showSuggestions = messages.length <= 2;

  // Detect if running inside an iframe (e.g., Replit preview pane) — speech recognition is blocked there
  const [inIframe, setInIframe] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useEffect(() => {
    try { setInIframe(window.self !== window.top); } catch { setInIframe(true); }
  }, []);
  const showIframeBanner = inIframe && !bannerDismissed;
  const openInNewTab = () => window.open(window.location.href, "_blank", "noopener,noreferrer");

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white px-4 md:px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}images/ai-avatar.png`}
              alt="Buddy"
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-base leading-tight">Buddy AI</h2>
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">Universal Coach</span>
              {isSpeaking && !isMuted && (
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium animate-pulse flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Speaking...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
              Online · Academics · Coding · Writing · Career · Math
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Voice mode toggle */}
          <button
            onClick={() => setVoiceMode(prev => !prev)}
            title={voiceMode ? "Voice Mode ON (auto-send)" : "Voice Mode OFF"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              voiceMode
                ? "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
            )}
          >
            {voiceMode ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{voiceMode ? "Voice ON" : "Voice OFF"}</span>
          </button>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            title={isMuted ? "Unmute Buddy" : "Mute Buddy"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
              isMuted
                ? "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"
            )}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
          </button>

          {/* Clear chat */}
          <button
            onClick={() => { clearChat(); window.speechSynthesis.cancel(); }}
            title="Clear conversation"
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <ChatMessage role={msg.role} text={msg.text} />
              </motion.div>
            ))}
          </AnimatePresence>

          {isGenerating && (
            <div className="flex items-center gap-3 ml-14 mb-4">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-sm text-slate-400">Buddy is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 md:px-6 shrink-0">
        <div className="max-w-4xl mx-auto">

          {/* Topic suggestions — shown when chat is new */}
          {showSuggestions && (
            <div className="mb-4">
              {/* Category tabs */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {TOPIC_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  const c = COLOR_MAP[cat.color];
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); setShowAllPrompts(false); }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                        activeCategory === cat.id
                          ? c.tab
                          : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      <Icon className="w-3 h-3" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Prompts for active category */}
              <div className="flex flex-wrap gap-2">
                {promptsToShow.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={isGenerating}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 transition-all text-left disabled:opacity-50",
                      colors.prompt
                    )}
                  >
                    {prompt}
                  </button>
                ))}
                {activeCat.prompts.length > 4 && (
                  <button
                    onClick={() => setShowAllPrompts(prev => !prev)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 border border-dashed border-slate-200 hover:border-slate-300 transition-all flex items-center gap-1"
                  >
                    {showAllPrompts ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showAllPrompts ? "Less" : "More"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Listening indicator */}
          {isRecording && (
            <div className="mb-2 flex items-center gap-2 text-rose-600 text-xs font-medium">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              Listening... speak clearly, then stop to send
              {voiceMode && <span className="text-slate-400">(auto-send when done)</span>}
            </div>
          )}

          {/* Input box */}
          <div className={cn(
            "flex items-end gap-2 rounded-2xl border p-2 transition-all",
            isRecording
              ? "bg-rose-50 border-rose-300 ring-4 ring-rose-500/10"
              : "bg-slate-50 border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10"
          )}>
            {/* Mic button */}
            <button
              onClick={toggleRecording}
              disabled={isGenerating}
              title={isRecording ? "Stop listening" : voiceMode ? "Speak (auto-sends)" : "Voice input"}
              className={cn(
                "p-3 rounded-xl transition-all shrink-0 relative",
                isRecording
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-110"
                  : "bg-white text-slate-400 hover:bg-slate-100 hover:text-indigo-600 border border-slate-200 shadow-sm disabled:opacity-40"
              )}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5" />
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-400 rounded-full animate-ping" />
                </>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                isRecording
                  ? "Listening... speak now 🎙️"
                  : voiceMode
                  ? "Voice Mode ON — click mic and speak, I'll answer! 🎤"
                  : "Ask Buddy anything — Academics, Code, Math, Career... 💬"
              }
              disabled={isGenerating}
              rows={1}
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none outline-none py-2.5 text-slate-800 placeholder:text-slate-400 text-sm custom-scrollbar disabled:opacity-50"
            />

            {/* Send / Stop */}
            {isGenerating ? (
              <button
                onClick={stopGeneration}
                title="Stop generating"
                className="p-3 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all shrink-0"
              >
                <div className="w-4 h-4 bg-slate-600 rounded-sm" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() && !isRecording}
                title="Send"
                className="p-3 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-2">
            Buddy knows Academics · Coding · Writing · Career · Math · Everything — ask anything!
          </p>
        </div>
      </div>
    </div>
  );
}
