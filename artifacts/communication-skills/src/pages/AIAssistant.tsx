import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Sparkles } from "lucide-react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { generateBotResponse } from "@/lib/chatbot-logic";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

const SUGGESTIONS = [
  "Improve my sentence",
  "Interview tips",
  "Email writing help",
  "7C's of Communication",
  "Grammar correction"
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "bot",
      text: "Hello! 👋 I'm your AI Communication Coach.\n\nI can help you with:\n• 7C's of Communication\n• Grammar & sentence improvement\n• Vocabulary building\n• Interview preparation\n• Professional email writing\n\nType your question, or type **'improve: [your sentence]'** for direct feedback!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (text: string = input) => {
    if (!text.trim()) return;

    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    // Simulate AI thinking delay
    setTimeout(() => {
      const responseText = generateBotResponse(text);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "bot", text: responseText };
      setMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900 leading-tight">AI Communication Coach</h2>
          <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Online and ready to help
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar">
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
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Quick Suggestions */}
          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 custom-scrollbar">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 border border-transparent hover:border-indigo-200 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="flex items-end gap-3 bg-slate-50 p-2 md:p-3 rounded-2xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
            <button
              onClick={handleVoiceInput}
              className={cn(
                "p-3 rounded-xl transition-colors shrink-0",
                isListening 
                  ? "bg-rose-100 text-rose-600 animate-pulse" 
                  : "bg-white text-slate-400 hover:bg-slate-200 hover:text-slate-600 border border-slate-200 shadow-sm"
              )}
              title="Click to speak"
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
              placeholder={isListening ? "Listening..." : "Ask me anything or say 'improve: [your sentence]'..."}
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none resize-none outline-none py-2 text-slate-800 placeholder:text-slate-400 text-sm md:text-base custom-scrollbar"
              rows={1}
            />

            <button
              onClick={() => handleSend()}
              disabled={!input.trim() && !isListening}
              className="p-3 rounded-xl bg-indigo-600 text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-slate-400 mt-3 font-medium">
            AI responses are generated locally. No internet needed for the knowledge base.
          </p>
        </div>
      </div>
    </div>
  );
}
