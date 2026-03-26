import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListOpenaiConversationsQueryKey, getGetProgressQueryKey } from "@workspace/api-client-react";

export interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome",
    role: "bot",
    text: "Hi! 👋 I'm Buddy, your AI Communication Coach.\n\nI can help you with the 7 C's of Communication, grammar, vocabulary, interview prep, email writing, and more. What would you like to work on today? 💬"
  }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const initConversation = async () => {
    if (conversationId) return conversationId;
    
    try {
      const res = await fetch("/api/openai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Chat with Buddy" })
      });
      const data = await res.json();
      setConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      return data.id as number;
    } catch (err) {
      console.error("Failed to initialize conversation", err);
      return null;
    }
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isGenerating) return;

    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, role: "user", text }]);
    setIsGenerating(true);

    const botMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: botMsgId, role: "bot", text: "" }]);

    abortControllerRef.current = new AbortController();

    try {
      const cid = await initConversation();
      if (!cid) throw new Error("No conversation ID");

      const response = await fetch(`/api/openai/conversations/${cid}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr.trim() === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                setMessages(prev => prev.map(m => 
                  m.id === botMsgId ? { ...m, text: m.text + data.content } : m
                ));
              }
              if (data.done) {
                break;
              }
            } catch (e) {
              // Ignore parse errors on partial chunks
            }
          }
        }
      }

      // Log points for interacting with AI coach occasionally
      if (Math.random() > 0.5) {
        fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "ai_coach",
            pointsEarned: 2,
            description: "Chatted with Buddy AI"
          })
        }).then(() => queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() }));
      }

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Stream error:", err);
        setMessages(prev => prev.map(m => 
          m.id === botMsgId && !m.text ? { ...m, text: "I'm having trouble connecting right now. Please try again." } : m
        ));
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, isGenerating, queryClient]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  return { messages, isGenerating, sendMessage, stopGeneration };
}
