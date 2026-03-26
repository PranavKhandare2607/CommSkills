import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Sparkles, Volume2, VolumeX, Bot } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { useChatStream } from "@/hooks/use-chat-stream";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Explain the 7 C's of Communication with real-life examples",
  "How do I prepare for a job interview? Give me your best tips",
  "Help me write a professional email asking for a meeting",
  "Tips for public speaking"
];

export default function AIAssistant() {
  const { messages, isGenerating, sendMessage, stopGeneration } = useChatStream();
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // TTS implementation for Buddy's responses
  useEffect(() => {
    if (isMuted || isGenerating) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === "bot" && lastMsg.text && lastMsg.id !== "welcome") {
      const utterance = new SpeechSynthesisUtterance(lastMsg.text.replace(/[*_#]/g, ''));
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }, [messages, isGenerating, isMuted]);

  const handleSend = (text: string = input) => {
    if (!text.trim() || isGenerating) return;
    sendMessage(text);
    setInput("");
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] md:h-screen bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center relative overflow-hidden">
             <img src={`${import.meta.env.BASE_URL}images/ai-avatar.png`} alt="Buddy" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-900 leading-tight flex items-center gap-2">
              Buddy AI
              <span className="text-xs font-normal px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Coach</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span> 
              Online and ready to help
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setIsMuted(!isMuted);
            window.speechSynthesis.cancel();
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            isMuted ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
          )}
          title={isMuted ? "Unmute Buddy" : "Mute Buddy"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          <span className="hidden sm:inline">{isMuted ? "Unmute" : "Mute"}</span>
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChatMessage role={msg.role} text={msg.text} />
            </motion.div>
          ))}
          {isGenerating && (
            <div className="flex items-center gap-2 text-slate-400 text-sm ml-16 mb-6">
              <Bot className="w-4 h-4 animate-bounce" /> Buddy is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 md:px-8 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
        <div className="max-w-4xl mx-auto">
          
          {/* Suggestions */}
          {messages.length < 3 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Buddy can help with:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-all text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Box */}
          <div className="flex items-end gap-2 md:gap-3 bg-slate-50 p-2 md:p-3 rounded-2xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all relative">
            <button
              onClick={handleVoiceInput}
              disabled={isGenerating}
              className={cn(
                "p-3 rounded-xl transition-all shrink-0",
                isListening 
                  ? "bg-rose-100 text-rose-600 animate-pulse shadow-inner" 
                  : "bg-white text-slate-400 hover:bg-slate-100 hover:text-indigo-600 border border-slate-200 shadow-sm disabled:opacity-50"
              )}
              title={isListening ? "Listening... Click to stop" : "Speak to Buddy"}
            >
              <Mic className="w-5 h-5" />
            </button>
            
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening..." : "Ask Buddy anything... 💬"}
              disabled={isGenerating}
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none outline-none py-2.5 text-slate-800 placeholder:text-slate-400 text-sm md:text-base custom-scrollbar disabled:opacity-50"
              rows={1}
            />

            {isGenerating ? (
              <button
                onClick={stopGeneration}
                className="p-3 rounded-xl bg-slate-200 text-slate-600 shadow-sm hover:bg-slate-300 transition-all shrink-0"
              >
                <div className="w-5 h-5 bg-slate-600 rounded-sm"></div>
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() && !isListening}
                className="p-3 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95"
              >
                <Send className="w-5 h-5" />
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-3 font-medium">
            Select an option from the sidebar and ask me anything directly!
          </p>
        </div>
      </div>
    </div>
  );
}
