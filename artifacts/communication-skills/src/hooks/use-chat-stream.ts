import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl, getListOpenaiConversationsQueryKey, getGetProgressQueryKey } from "@workspace/api-client-react";

export interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "bot",
  text: "Hi! 👋 I'm **Buddy**, your AI Universal Coach.\n\nI can help you with **anything** — Academics, Coding, Writing, Career guidance, Math problems, or any question you have. What would you like to work on today? 💬",
};

export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const initConversation = async (): Promise<number | null> => {
    if (conversationId) return conversationId;
    try {
      const res = await fetch(apiUrl("/api/openai/conversations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Chat with Buddy" }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      const data = await res.json();
      setConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
      return data.id as number;
    } catch (err) {
      console.error("Failed to initialize conversation:", err);
      return null;
    }
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating) return;

      const userMsgId = `user-${Date.now()}`;
      const botMsgId = `bot-${Date.now() + 1}`;

      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", text: trimmed },
        { id: botMsgId, role: "bot", text: "" },
      ]);
      setIsGenerating(true);

      abortControllerRef.current = new AbortController();

      try {
        const cid = await initConversation();
        if (!cid) throw new Error("No conversation ID");

        const response = await fetch(apiUrl(`/api/openai/conversations/${cid}/messages`), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Stream failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let isDone = false;

        while (!isDone) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data:")) continue;
            const jsonStr = trimmedLine.slice(5).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const data = JSON.parse(jsonStr);
              if (data.error) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId && !m.text
                      ? { ...m, text: `⚠️ ${data.error}` }
                      : m,
                  ),
                );
                isDone = true;
                break;
              }
              if (data.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId
                      ? { ...m, text: m.text + data.content }
                      : m,
                  ),
                );
              }
              if (data.done) {
                isDone = true;
                break;
              }
            } catch {
              // ignore partial JSON
            }
          }
        }

        // Award points for AI coach usage
        if (Math.random() > 0.6) {
          fetch(apiUrl("/api/progress"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "ai_coach",
              pointsEarned: 2,
              description: "Chatted with Buddy AI",
            }),
          }).then(() =>
            queryClient.invalidateQueries({ queryKey: getGetProgressQueryKey() }),
          );
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === botMsgId && !m.text
                ? {
                    ...m,
                    text: "⚠️ I'm having trouble connecting right now. Please check your connection and try again.",
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, isGenerating, queryClient],
  );

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  }, []);

  const clearChat = useCallback(() => {
    // Abort any ongoing generation
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setMessages([WELCOME_MESSAGE]);
    setConversationId(null);
  }, []);

  return { messages, isGenerating, sendMessage, stopGeneration, clearChat };
}
