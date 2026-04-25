import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import aishaClosed from "@/assets/aisha-closed.png";
import aishaOpen from "@/assets/aisha-open.png";
import priyaClosed from "@/assets/priya-closed.png";
import priyaOpen from "@/assets/priya-open.png";

interface FemaleAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  mode: "interview" | "friend";
}

export function FemaleAvatar({ isSpeaking, isListening, mode }: FemaleAvatarProps) {
  const [mouthFrame, setMouthFrame] = useState<"closed" | "open">("closed");
  const [headTilt, setHeadTilt] = useState(0);

  // Lip-sync — switch frames when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthFrame("closed");
      return;
    }
    const interval = setInterval(() => {
      setMouthFrame(Math.random() > 0.45 ? "open" : "closed");
    }, 140);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Subtle head movement when speaking (lifelike)
  useEffect(() => {
    if (!isSpeaking) {
      setHeadTilt(0);
      return;
    }
    const interval = setInterval(() => {
      setHeadTilt((Math.random() - 0.5) * 1.4);
    }, 800);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const closedSrc = mode === "interview" ? aishaClosed : priyaClosed;
  const openSrc = mode === "interview" ? aishaOpen : priyaOpen;
  const currentSrc = mouthFrame === "open" ? openSrc : closedSrc;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer pulsing glow ring */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.08, 1] : isSpeaking ? [1, 1.04, 1] : [1, 1.01, 1],
          opacity: isListening || isSpeaking ? 0.7 : 0.3,
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 rounded-full blur-2xl ${
          isListening
            ? "bg-rose-400"
            : isSpeaking
            ? mode === "interview" ? "bg-blue-400" : "bg-pink-400"
            : mode === "interview" ? "bg-blue-300/40" : "bg-pink-300/40"
        }`}
      />

      {/* Sound wave rings (when speaking) */}
      {isSpeaking && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.92, opacity: 0.6 }}
              animate={{ scale: 1.18, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
              className={`absolute inset-0 rounded-full border-2 ${
                mode === "interview" ? "border-blue-400" : "border-pink-400"
              }`}
            />
          ))}
        </>
      )}

      {/* Listening ring (red pulse) */}
      {isListening && (
        <>
          {[0, 1].map((i) => (
            <motion.div
              key={`l-${i}`}
              initial={{ scale: 0.95, opacity: 0.7 }}
              animate={{ scale: 1.15, opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-rose-500"
            />
          ))}
        </>
      )}

      {/* Avatar Photo */}
      <motion.div
        animate={{ rotate: headTilt, scale: isSpeaking ? 1.005 : 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="relative w-full aspect-square rounded-full overflow-hidden border-4 border-white shadow-2xl"
        style={{
          boxShadow: isSpeaking
            ? mode === "interview"
              ? "0 0 60px rgba(59, 130, 246, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.25)"
              : "0 0 60px rgba(236, 72, 153, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        {/* Base photo (always visible to prevent flicker) */}
        <img
          src={closedSrc}
          alt={mode === "interview" ? "Aisha" : "Priya"}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {/* Open-mouth photo (fades in/out for lip sync) */}
        <motion.img
          src={openSrc}
          alt=""
          animate={{ opacity: mouthFrame === "open" ? 1 : 0 }}
          transition={{ duration: 0.08 }}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {/* Listening overlay tint */}
        {isListening && (
          <div className="absolute inset-0 bg-rose-500/10 mix-blend-overlay pointer-events-none" />
        )}

        {/* Bottom status bar */}
        {(isSpeaking || isListening) && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 flex items-center justify-center gap-2">
            {isListening && (
              <>
                <div className="flex items-end gap-0.5 h-4">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [4, 14, 6, 16, 8][i] }}
                      transition={{
                        duration: 0.4,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: i * 0.08,
                      }}
                      className="w-1 bg-rose-400 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-white text-xs font-semibold">Listening to you...</span>
              </>
            )}
            {isSpeaking && !isListening && (
              <>
                <div className="flex items-end gap-0.5 h-4">
                  {[0, 1, 2, 3, 4].map(i => (
                    <motion.div
                      key={i}
                      animate={{ height: [6, 14, 8, 16, 10][i] }}
                      transition={{
                        duration: 0.3,
                        repeat: Infinity,
                        repeatType: "reverse",
                        delay: i * 0.06,
                      }}
                      className={`w-1 rounded-full ${mode === "interview" ? "bg-blue-300" : "bg-pink-300"}`}
                    />
                  ))}
                </div>
                <span className="text-white text-xs font-semibold">Speaking...</span>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
