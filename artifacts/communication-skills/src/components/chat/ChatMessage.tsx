import React from "react";
import { cn } from "@/lib/utils";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "bot";
  text: string;
}

export function ChatMessage({ role, text }: ChatMessageProps) {
  const isBot = role === "bot";

  return (
    <div className={cn(
      "flex w-full mb-6",
      isBot ? "justify-start" : "justify-end"
    )}>
      <div className={cn(
        "flex gap-4 max-w-[85%]",
        isBot ? "flex-row" : "flex-row-reverse"
      )}>
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10",
          isBot ? "bg-indigo-50 border border-indigo-100" : "bg-indigo-600"
        )}>
          {isBot ? (
            <img 
              src={`${import.meta.env.BASE_URL}images/ai-avatar.png`} 
              alt="Buddy AI Avatar" 
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>

        {/* Message Bubble */}
        <div className={cn(
          "relative px-5 py-4 rounded-2xl text-sm md:text-[15px] leading-relaxed",
          isBot 
            ? "bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm" 
            : "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 rounded-tr-sm"
        )}>
          {isBot ? (
            <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-slate-50 prose-pre:border prose-pre:border-slate-200 prose-pre:text-slate-800">
              <ReactMarkdown>{text || "..."}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
