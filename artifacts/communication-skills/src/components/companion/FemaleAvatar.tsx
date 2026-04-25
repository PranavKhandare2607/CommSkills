import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface FemaleAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  mode: "interview" | "friend";
  expression?: "neutral" | "smile" | "serious";
}

export function FemaleAvatar({ isSpeaking, isListening, mode, expression = "neutral" }: FemaleAvatarProps) {
  const [mouthOpen, setMouthOpen] = useState(0);
  const [blinkState, setBlinkState] = useState(false);

  // Lip-sync animation — randomly vary mouth opening when speaking
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(0);
      return;
    }
    const interval = setInterval(() => {
      setMouthOpen(Math.random() * 0.9 + 0.1);
    }, 110);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Eye blink animation
  useEffect(() => {
    const blink = () => {
      setBlinkState(true);
      setTimeout(() => setBlinkState(false), 140);
    };
    const interval = setInterval(blink, 3500 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  // Outfit colors based on mode
  const outfitMain = mode === "interview" ? "#1e3a8a" : "#ec4899"; // navy blazer vs pink kurti
  const outfitAccent = mode === "interview" ? "#1e293b" : "#fbbf24"; // dark vs gold trim
  const skinTone = "#f4c1a0";
  const hairColor = "#1f1310";
  const lipColor = mode === "interview" ? "#a52a4a" : "#dc2626";

  // Mouth shape based on speaking
  const mouthHeight = 2 + mouthOpen * 14;
  const mouthY = 158 - mouthOpen * 4;

  // Smile based on expression / mode
  const isSmile = expression === "smile" || (mode === "friend" && expression === "neutral");
  const smileCurve = isSmile ? 4 : expression === "serious" ? -2 : 1;

  // Subtle head bob when speaking
  const headBobY = isSpeaking ? Math.sin(Date.now() / 400) * 1.5 : 0;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Outer glow ring when listening or speaking */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.05, 1] : isSpeaking ? [1, 1.03, 1] : 1,
          opacity: isListening || isSpeaking ? 1 : 0.4,
        }}
        transition={{ duration: 1.2, repeat: Infinity }}
        className={`absolute inset-0 rounded-full blur-2xl ${
          isListening ? "bg-rose-400/30" : isSpeaking ? "bg-emerald-400/30" : "bg-indigo-400/20"
        }`}
      />

      <motion.svg
        viewBox="0 0 240 280"
        className="relative w-full h-full max-w-[280px] drop-shadow-2xl"
        animate={{ y: headBobY }}
        transition={{ duration: 0.4 }}
      >
        {/* Background circle */}
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={mode === "interview" ? "#dbeafe" : "#fce7f3"} />
            <stop offset="100%" stopColor={mode === "interview" ? "#bfdbfe" : "#fbcfe8"} />
          </radialGradient>
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2d1b14" />
            <stop offset="100%" stopColor={hairColor} />
          </linearGradient>
          <linearGradient id="outfitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={outfitMain} />
            <stop offset="100%" stopColor={outfitAccent} />
          </linearGradient>
        </defs>

        <circle cx="120" cy="120" r="115" fill="url(#bgGrad)" opacity="0.6" />

        {/* Body / Outfit */}
        <g>
          {mode === "interview" ? (
            <>
              {/* Blazer */}
              <path
                d="M 50 280 L 70 220 Q 120 200 170 220 L 190 280 Z"
                fill="url(#outfitGrad)"
              />
              {/* Lapel */}
              <path d="M 95 215 L 120 240 L 145 215 L 130 220 L 120 230 L 110 220 Z" fill="#0f172a" />
              {/* Inner shirt */}
              <path d="M 105 218 L 120 230 L 135 218 L 135 280 L 105 280 Z" fill="#ffffff" />
              {/* Tie/scarf */}
              <path d="M 113 232 L 127 232 L 130 280 L 110 280 Z" fill="#dc2626" opacity="0.85" />
            </>
          ) : (
            <>
              {/* Kurti */}
              <path
                d="M 50 280 L 65 215 Q 120 198 175 215 L 190 280 Z"
                fill="url(#outfitGrad)"
              />
              {/* Kurti V-neck */}
              <path d="M 105 215 L 120 245 L 135 215 L 130 215 L 120 232 L 110 215 Z" fill={skinTone} />
              {/* Decorative trim */}
              <path d="M 50 280 L 190 280 L 188 273 L 52 273 Z" fill={outfitAccent} opacity="0.8" />
              <circle cx="80" cy="240" r="2" fill={outfitAccent} />
              <circle cx="160" cy="240" r="2" fill={outfitAccent} />
              <circle cx="100" cy="260" r="2" fill={outfitAccent} />
              <circle cx="140" cy="260" r="2" fill={outfitAccent} />
              <circle cx="120" cy="250" r="2" fill={outfitAccent} />
            </>
          )}
        </g>

        {/* Neck */}
        <rect x="108" y="195" width="24" height="28" fill={skinTone} rx="4" />
        {/* Neck shadow */}
        <ellipse cx="120" cy="200" rx="14" ry="3" fill="#000" opacity="0.1" />

        {/* Hair back */}
        <path
          d="M 60 130 Q 50 90 80 60 Q 120 35 160 60 Q 190 90 180 130 L 180 200 Q 175 215 165 215 L 75 215 Q 65 215 60 200 Z"
          fill="url(#hairGrad)"
        />

        {/* Face */}
        <ellipse cx="120" cy="125" rx="48" ry="58" fill={skinTone} />

        {/* Hair front bangs */}
        {mode === "interview" ? (
          <path
            d="M 75 95 Q 90 70 120 68 Q 150 70 165 95 Q 145 85 120 87 Q 95 85 75 95 Z"
            fill="url(#hairGrad)"
          />
        ) : (
          <>
            {/* Side-parted bangs for friend */}
            <path
              d="M 72 95 Q 95 70 130 80 Q 140 88 120 92 Q 95 90 72 95 Z"
              fill="url(#hairGrad)"
            />
            {/* Bindi */}
            <circle cx="120" cy="92" r="2.5" fill="#dc2626" />
          </>
        )}

        {/* Hair side strands */}
        <path d="M 70 130 Q 65 165 75 195 L 80 195 Q 75 165 78 130 Z" fill="url(#hairGrad)" />
        <path d="M 170 130 Q 175 165 165 195 L 160 195 Q 165 165 162 130 Z" fill="url(#hairGrad)" />

        {/* Earrings (friend mode) */}
        {mode === "friend" && (
          <>
            <circle cx="73" cy="145" r="3" fill="#fbbf24" />
            <circle cx="167" cy="145" r="3" fill="#fbbf24" />
          </>
        )}

        {/* Eyebrows */}
        <path
          d={`M 92 110 Q 102 ${expression === "serious" ? 105 : 107} 112 110`}
          stroke="#3a1f12"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 128 110 Q 138 ${expression === "serious" ? 105 : 107} 148 110`}
          stroke="#3a1f12"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Eyes */}
        {blinkState ? (
          <>
            <line x1="95" y1="125" x2="111" y2="125" stroke="#3a1f12" strokeWidth="2" strokeLinecap="round" />
            <line x1="129" y1="125" x2="145" y2="125" stroke="#3a1f12" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* Eye whites */}
            <ellipse cx="103" cy="125" rx="8" ry="6" fill="white" />
            <ellipse cx="137" cy="125" rx="8" ry="6" fill="white" />
            {/* Iris */}
            <circle cx="103" cy="125" r="4.5" fill="#5b3a1c" />
            <circle cx="137" cy="125" r="4.5" fill="#5b3a1c" />
            {/* Pupil */}
            <circle cx="103" cy="125" r="2.2" fill="#000" />
            <circle cx="137" cy="125" r="2.2" fill="#000" />
            {/* Eye highlight */}
            <circle cx="104.5" cy="123" r="1" fill="white" />
            <circle cx="138.5" cy="123" r="1" fill="white" />
            {/* Eyelashes */}
            <path d="M 95 122 L 93 119" stroke="#3a1f12" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 111 122 L 113 119" stroke="#3a1f12" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 129 122 L 127 119" stroke="#3a1f12" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M 145 122 L 147 119" stroke="#3a1f12" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}

        {/* Nose */}
        <path d="M 118 138 Q 117 150 120 152 Q 123 150 122 138" stroke="#c9a085" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <ellipse cx="118" cy="153" rx="1" ry="0.8" fill="#c9a085" />
        <ellipse cx="122" cy="153" rx="1" ry="0.8" fill="#c9a085" />

        {/* Cheeks (light blush) */}
        <ellipse cx="92" cy="148" rx="6" ry="4" fill="#f8a6a0" opacity="0.5" />
        <ellipse cx="148" cy="148" rx="6" ry="4" fill="#f8a6a0" opacity="0.5" />

        {/* Mouth — animated */}
        <g>
          {/* Lip outline */}
          <path
            d={`M 110 ${mouthY} Q 120 ${mouthY - smileCurve} 130 ${mouthY} Q 130 ${mouthY + mouthHeight} 120 ${mouthY + mouthHeight + smileCurve} Q 110 ${mouthY + mouthHeight} 110 ${mouthY} Z`}
            fill={lipColor}
          />
          {/* Inner mouth (only visible when open) */}
          {mouthOpen > 0.3 && (
            <ellipse
              cx="120"
              cy={mouthY + mouthHeight / 2}
              rx={5 * mouthOpen}
              ry={mouthHeight / 3}
              fill="#5c1a1a"
            />
          )}
          {/* Teeth hint when speaking */}
          {mouthOpen > 0.5 && (
            <rect x={117} y={mouthY + 1} width={6} height={2} fill="white" rx="1" />
          )}
        </g>

        {/* Chin highlight */}
        <ellipse cx="120" cy="180" rx="14" ry="4" fill="#fff" opacity="0.15" />

        {/* Status mic indicator on body */}
        {isListening && (
          <g>
            <circle cx="120" cy="265" r="14" fill="#dc2626" opacity="0.9">
              <animate attributeName="r" values="14;16;14" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle cx="120" cy="265" r="6" fill="white" />
            <rect x="117" y="259" width="6" height="10" rx="3" fill="#dc2626" />
          </g>
        )}
      </motion.svg>
    </div>
  );
}
