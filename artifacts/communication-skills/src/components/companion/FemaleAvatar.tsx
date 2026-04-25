import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface FemaleAvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  mode: "interview" | "friend";
  expression?: "neutral" | "smile" | "serious" | "surprised";
}

// ============== MOUTH SHAPES for lip-sync ==============
type MouthShape = "closed" | "smile" | "small_o" | "wide_o" | "ee" | "ah";

const MOUTH_PATHS: Record<MouthShape, string> = {
  closed:  "M 105 168 Q 120 170 135 168 Q 132 172 120 172 Q 108 172 105 168 Z",
  smile:   "M 100 166 Q 120 178 140 166 Q 132 174 120 175 Q 108 174 100 166 Z",
  small_o: "M 114 168 Q 120 165 126 168 Q 126 175 120 176 Q 114 175 114 168 Z",
  wide_o:  "M 108 167 Q 120 163 132 167 Q 132 178 120 180 Q 108 178 108 167 Z",
  ee:      "M 102 167 Q 120 169 138 167 Q 134 173 120 174 Q 106 173 102 167 Z",
  ah:      "M 110 165 Q 120 161 130 165 Q 130 180 120 184 Q 110 180 110 165 Z",
};

const MOUTH_OPEN: Record<MouthShape, boolean> = {
  closed: false, smile: false, small_o: true, wide_o: true, ee: true, ah: true,
};

const SHAPE_CYCLE: MouthShape[] = ["small_o", "ah", "ee", "wide_o", "small_o", "ah", "smile"];

export function FemaleAvatar({ isSpeaking, isListening, mode, expression = "neutral" }: FemaleAvatarProps) {
  const [mouthShape, setMouthShape] = useState<MouthShape>("smile");
  const [blinkClosed, setBlinkClosed] = useState(false);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState(0);
  const [browLift, setBrowLift] = useState(0);
  const cycleRef = useRef(0);

  // ============ LIP SYNC ============
  useEffect(() => {
    if (!isSpeaking) {
      setMouthShape(mode === "friend" || expression === "smile" ? "smile" : "closed");
      return;
    }
    cycleRef.current = 0;
    const tick = () => {
      const r = Math.random();
      if (r < 0.22) setMouthShape("small_o");
      else if (r < 0.45) setMouthShape("ah");
      else if (r < 0.65) setMouthShape("ee");
      else if (r < 0.82) setMouthShape("wide_o");
      else if (r < 0.93) setMouthShape("smile");
      else setMouthShape(SHAPE_CYCLE[cycleRef.current++ % SHAPE_CYCLE.length]);
    };
    tick();
    const id = setInterval(tick, 130 + Math.random() * 80);
    return () => clearInterval(id);
  }, [isSpeaking, mode, expression]);

  // ============ BLINKING ============
  useEffect(() => {
    let timeoutId: number;
    const scheduleBlink = () => {
      const delay = 2200 + Math.random() * 3500;
      timeoutId = window.setTimeout(() => {
        setBlinkClosed(true);
        const double = Math.random() < 0.18;
        window.setTimeout(() => {
          setBlinkClosed(false);
          if (double) {
            window.setTimeout(() => {
              setBlinkClosed(true);
              window.setTimeout(() => setBlinkClosed(false), 110);
            }, 160);
          }
        }, 130);
        scheduleBlink();
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // ============ EYE GAZE ============
  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.random();
      if (r < 0.45) setEyeOffset({ x: 0, y: 0 });
      else if (r < 0.65) setEyeOffset({ x: 1.8, y: 0 });
      else if (r < 0.85) setEyeOffset({ x: -1.8, y: 0 });
      else if (r < 0.93) setEyeOffset({ x: 0, y: -1 });
      else setEyeOffset({ x: 0.6, y: 0.6 });
    }, 1900 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, []);

  // ============ HEAD TILT ============
  useEffect(() => {
    const interval = setInterval(() => {
      const range = isSpeaking ? 1.8 : isListening ? 1.2 : 0.6;
      setHeadTilt((Math.random() - 0.5) * range);
    }, isSpeaking ? 700 : 1500);
    return () => clearInterval(interval);
  }, [isSpeaking, isListening]);

  // ============ BROW EXPRESSION ============
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setBrowLift((Math.random() - 0.3) * 2.5);
      }, 900);
      return () => clearInterval(interval);
    } else if (expression === "surprised") {
      setBrowLift(-3);
    } else if (expression === "serious") {
      setBrowLift(1);
    } else {
      setBrowLift(0);
    }
  }, [isSpeaking, expression]);

  // ============ COLORS ============
  const isInterview = mode === "interview";
  const skinTone = "#ecbb9c";
  const skinShadow = "#c79478";
  const hairColor = "#1a0d08";
  const hairHighlight = "#4a2818";
  const lipColor = isInterview ? "#a8324f" : "#d2425d";
  const lipHighlight = isInterview ? "#c4475e" : "#e85a72";
  const blushColor = "#f4a3a3";

  const outfitMain = isInterview ? "#1e3a8a" : "#ec4899";
  const outfitDark = isInterview ? "#0f1f4a" : "#be185d";
  const outfitAccent = isInterview ? "#dc2626" : "#fbbf24";
  const bgColorA = isInterview ? "#dbeafe" : "#fce7f3";
  const bgColorB = isInterview ? "#93c5fd" : "#f9a8d4";

  const isOpenMouth = MOUTH_OPEN[mouthShape];
  const isSmile = mouthShape === "smile";

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Aura / glow */}
      <motion.div
        animate={{
          scale: isSpeaking || isListening ? [1, 1.05, 1] : [1, 1.02, 1],
          opacity: isSpeaking || isListening ? 0.65 : 0.3,
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 rounded-full blur-3xl ${
          isListening ? "bg-rose-400" : isSpeaking ? (isInterview ? "bg-blue-400" : "bg-pink-400") : (isInterview ? "bg-blue-300/50" : "bg-pink-300/50")
        }`}
      />

      {/* Sound rings */}
      {isSpeaking && [0, 1, 2].map(i => (
        <motion.div
          key={`s-${i}`}
          initial={{ scale: 0.92, opacity: 0.55 }}
          animate={{ scale: 1.18, opacity: 0 }}
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
          className={`absolute inset-0 rounded-full border-2 ${isInterview ? "border-blue-400" : "border-pink-400"}`}
        />
      ))}
      {isListening && [0, 1].map(i => (
        <motion.div
          key={`l-${i}`}
          initial={{ scale: 0.95, opacity: 0.7 }}
          animate={{ scale: 1.16, opacity: 0 }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
          className="absolute inset-0 rounded-full border-2 border-rose-500"
        />
      ))}

      <motion.svg
        viewBox="0 0 240 280"
        className="relative w-full h-full max-w-[300px] drop-shadow-2xl"
        animate={{ rotate: headTilt }}
        transition={{ duration: 0.7, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={bgColorA} />
            <stop offset="100%" stopColor={bgColorB} />
          </radialGradient>
          <linearGradient id="hairGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor={hairHighlight} />
            <stop offset="100%" stopColor={hairColor} />
          </linearGradient>
          <linearGradient id="skinGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#f4cbac" />
            <stop offset="100%" stopColor={skinTone} />
          </linearGradient>
          <linearGradient id="outfitGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={outfitMain} />
            <stop offset="100%" stopColor={outfitDark} />
          </linearGradient>
          <linearGradient id="lipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lipHighlight} />
            <stop offset="100%" stopColor={lipColor} />
          </linearGradient>
          <radialGradient id="cheekGrad">
            <stop offset="0%" stopColor={blushColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={blushColor} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5a3018" />
            <stop offset="70%" stopColor="#3d1f0e" />
            <stop offset="100%" stopColor="#1a0d08" />
          </radialGradient>
        </defs>

        {/* Background circle */}
        <circle cx="120" cy="120" r="116" fill="url(#bgGrad)" opacity="0.7" />

        {/* ====== BODY / OUTFIT ====== */}
        {isInterview ? (
          <g>
            {/* Blazer */}
            <path d="M 40 280 L 62 220 Q 120 198 178 220 L 200 280 Z" fill="url(#outfitGrad)" />
            {/* Lapels */}
            <path d="M 95 218 L 120 252 L 145 218 L 138 222 L 130 235 L 120 240 L 110 235 L 102 222 Z" fill={outfitDark} />
            {/* Shirt */}
            <path d="M 108 220 L 120 240 L 132 220 L 132 280 L 108 280 Z" fill="#fafafa" />
            {/* Red tie */}
            <path d="M 115 240 Q 120 238 125 240 L 128 280 L 112 280 Z" fill={outfitAccent} />
            <path d="M 117 240 Q 120 244 123 240 L 122 248 L 118 248 Z" fill={outfitDark} opacity="0.5" />
          </g>
        ) : (
          <g>
            {/* Pink kurti */}
            <path d="M 40 280 L 58 218 Q 120 196 182 218 L 200 280 Z" fill="url(#outfitGrad)" />
            {/* V-neck cutout showing skin */}
            <path d="M 105 218 L 120 248 L 135 218 L 130 218 L 120 235 L 110 218 Z" fill="url(#skinGrad)" />
            {/* Gold hem */}
            <path d="M 40 280 L 200 280 L 198 270 L 42 270 Z" fill={outfitAccent} opacity="0.85" />
            {/* Embroidery dots */}
            {[[72, 240], [168, 240], [88, 254], [152, 254], [104, 264], [136, 264], [120, 260]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="2" fill={outfitAccent} />
            ))}
            <path d="M 110 220 Q 120 224 130 220" stroke={outfitAccent} strokeWidth="1.5" fill="none" opacity="0.7" />
          </g>
        )}

        {/* Neck */}
        <path d="M 108 196 L 132 196 L 134 222 Q 120 226 106 222 Z" fill="url(#skinGrad)" />
        <ellipse cx="120" cy="200" rx="14" ry="2.5" fill={skinShadow} opacity="0.4" />

        {/* ====== HAIR BACK LAYER (behind face — flows past shoulders) ====== */}
        <path
          d="M 65 120 Q 60 70 100 55 Q 120 48 140 55 Q 180 70 175 120 L 195 230 Q 200 245 175 240 L 165 215 L 165 175 Q 165 165 160 165 L 80 165 Q 75 165 75 175 L 75 215 L 65 240 Q 40 245 45 230 Z"
          fill="url(#hairGrad)"
        />

        {/* ====== FACE OVAL (BIG and visible) ====== */}
        <ellipse cx="120" cy="135" rx="52" ry="58" fill="url(#skinGrad)" />

        {/* Face soft shading */}
        <ellipse cx="120" cy="183" rx="36" ry="8" fill={skinShadow} opacity="0.18" />
        <ellipse cx="80" cy="145" rx="6" ry="22" fill={skinShadow} opacity="0.12" />
        <ellipse cx="160" cy="145" rx="6" ry="22" fill={skinShadow} opacity="0.12" />
        {/* Jawline */}
        <path d="M 75 160 Q 78 180 95 192 Q 120 200 145 192 Q 162 180 165 160" stroke={skinShadow} strokeWidth="1" fill="none" opacity="0.25" />

        {/* ====== HAIR FRONT BANGS ====== */}
        {isInterview ? (
          <g>
            {/* Side-swept bangs — leaves forehead partially visible */}
            <path d="M 75 100 Q 90 78 130 82 Q 158 88 168 105 Q 155 92 130 90 Q 100 90 75 100 Z" fill="url(#hairGrad)" />
            <path d="M 75 100 Q 88 90 110 95 Q 95 105 78 110 Z" fill={hairColor} opacity="0.9" />
          </g>
        ) : (
          <g>
            {/* Center-parted bangs */}
            <path d="M 75 100 Q 92 80 118 88 Q 120 92 118 95 Q 100 92 75 100 Z" fill="url(#hairGrad)" />
            <path d="M 165 100 Q 148 80 122 88 Q 120 92 122 95 Q 140 92 165 100 Z" fill="url(#hairGrad)" />
            {/* Bindi */}
            <circle cx="120" cy="98" r="3" fill="#dc2626" />
            <circle cx="120" cy="98" r="1.2" fill="#fbbf24" opacity="0.7" />
          </g>
        )}

        {/* Ears */}
        <ellipse cx="72" cy="148" rx="5" ry="9" fill="url(#skinGrad)" />
        <ellipse cx="168" cy="148" rx="5" ry="9" fill="url(#skinGrad)" />
        <path d="M 73 144 Q 71 150 73 154" stroke={skinShadow} strokeWidth="1" fill="none" opacity="0.5" />
        <path d="M 167 144 Q 169 150 167 154" stroke={skinShadow} strokeWidth="1" fill="none" opacity="0.5" />

        {/* Earrings (friend mode) */}
        {!isInterview && (
          <g>
            <circle cx="72" cy="158" r="3.5" fill="#fbbf24" />
            <circle cx="72" cy="163" r="2" fill="#f59e0b" />
            <circle cx="168" cy="158" r="3.5" fill="#fbbf24" />
            <circle cx="168" cy="163" r="2" fill="#f59e0b" />
          </g>
        )}
        {/* Stud earrings (interview mode) */}
        {isInterview && (
          <g>
            <circle cx="72" cy="152" r="1.8" fill="#e5e7eb" />
            <circle cx="168" cy="152" r="1.8" fill="#e5e7eb" />
          </g>
        )}

        {/* ====== EYEBROWS ====== */}
        <motion.path
          initial={false}
          animate={{ d: `M 90 ${118 - browLift} Q 102 ${114 - browLift - (expression === "surprised" ? 4 : 0)} 113 ${118 - browLift}` }}
          transition={{ duration: 0.3 }}
          stroke="#1a0d08"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
        <motion.path
          initial={false}
          animate={{ d: `M 127 ${118 - browLift} Q 138 ${114 - browLift - (expression === "surprised" ? 4 : 0)} 150 ${118 - browLift}` }}
          transition={{ duration: 0.3 }}
          stroke="#1a0d08"
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />

        {/* ====== EYES ====== */}
        <g>
          {/* Eye whites */}
          <ellipse cx="103" cy="135" rx="9.5" ry="6.8" fill="white" />
          <ellipse cx="137" cy="135" rx="9.5" ry="6.8" fill="white" />
          <ellipse cx="103" cy="135" rx="9.5" ry="6.8" fill="none" stroke={skinShadow} strokeWidth="0.5" opacity="0.5" />
          <ellipse cx="137" cy="135" rx="9.5" ry="6.8" fill="none" stroke={skinShadow} strokeWidth="0.5" opacity="0.5" />

          {/* Iris (animated) */}
          <motion.g
            initial={false}
            animate={{ x: eyeOffset.x, y: eyeOffset.y }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Left eye iris */}
            <circle cx="103" cy="135" r="5.2" fill="url(#irisGrad)" />
            <circle cx="103" cy="135" r="2.5" fill="#0a0503" />
            <circle cx="104.5" cy="133" r="1.6" fill="white" />
            <circle cx="101.5" cy="136.5" r="0.7" fill="white" opacity="0.7" />

            {/* Right eye iris */}
            <circle cx="137" cy="135" r="5.2" fill="url(#irisGrad)" />
            <circle cx="137" cy="135" r="2.5" fill="#0a0503" />
            <circle cx="138.5" cy="133" r="1.6" fill="white" />
            <circle cx="135.5" cy="136.5" r="0.7" fill="white" opacity="0.7" />
          </motion.g>

          {/* Eyelids — close on blink */}
          <motion.ellipse
            cx="103"
            cy="135"
            rx="10"
            initial={{ ry: 0 }}
            animate={{ ry: blinkClosed ? 7 : 0 }}
            transition={{ duration: 0.06 }}
            fill={skinTone}
          />
          <motion.ellipse
            cx="137"
            cy="135"
            rx="10"
            initial={{ ry: 0 }}
            animate={{ ry: blinkClosed ? 7 : 0 }}
            transition={{ duration: 0.06 }}
            fill={skinTone}
          />

          {/* Top eyelashes */}
          <path d="M 95 129 L 92 126" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 99 128 L 97 124" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 103 127.5 L 103 123" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 107 128 L 109 124" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 111 129 L 114 126" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />

          <path d="M 129 129 L 126 126" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 133 128 L 131 124" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 137 127.5 L 137 123" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 141 128 L 143 124" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M 145 129 L 148 126" stroke="#1a0d08" strokeWidth="1.6" strokeLinecap="round" />

          {/* Bottom lash hint */}
          <path d="M 96 141 Q 103 144 110 141" stroke="#1a0d08" strokeWidth="0.8" fill="none" opacity="0.4" />
          <path d="M 130 141 Q 137 144 144 141" stroke="#1a0d08" strokeWidth="0.8" fill="none" opacity="0.4" />
        </g>

        {/* ====== NOSE ====== */}
        <path d="M 117 145 Q 116 158 119 161 Q 121 161 121 161 Q 124 158 123 145" stroke={skinShadow} strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.7" />
        <ellipse cx="117.5" cy="161" rx="1.3" ry="1" fill={skinShadow} opacity="0.6" />
        <ellipse cx="122.5" cy="161" rx="1.3" ry="1" fill={skinShadow} opacity="0.6" />
        <path d="M 118 160 Q 120 162 122 160" stroke={skinShadow} strokeWidth="1" fill="none" opacity="0.5" />

        {/* ====== CHEEKS BLUSH ====== */}
        <ellipse cx="92" cy="158" rx="9" ry="5" fill="url(#cheekGrad)" />
        <ellipse cx="148" cy="158" rx="9" ry="5" fill="url(#cheekGrad)" />

        {/* ====== MOUTH (lip-sync animated) ====== */}
        <g>
          {/* Upper lip shadow */}
          <path d="M 102 165 Q 120 163 138 165 Q 132 168 120 169 Q 108 168 102 165 Z" fill={lipColor} opacity="0.25" />

          {/* Inner mouth (dark cavity when open) */}
          {isOpenMouth && (
            <motion.path
              key={`inner-${mouthShape}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.06 }}
              d={MOUTH_PATHS[mouthShape]}
              fill="#3a0a0a"
            />
          )}

          {/* Teeth showing on certain shapes */}
          {(mouthShape === "ee" || mouthShape === "wide_o" || mouthShape === "ah") && (
            <motion.rect
              key={`teeth-${mouthShape}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95 }}
              transition={{ duration: 0.06 }}
              x={mouthShape === "ee" ? 108 : 113}
              y={mouthShape === "ah" ? 167 : 167}
              width={mouthShape === "ee" ? 24 : 14}
              height={mouthShape === "ah" ? 4 : 3}
              rx="1.5"
              fill="white"
            />
          )}

          {/* Lips outline (animated mouth shape) */}
          <motion.path
            initial={false}
            animate={{ d: MOUTH_PATHS[mouthShape] }}
            transition={{ duration: 0.08 }}
            fill="url(#lipGrad)"
            stroke={lipColor}
            strokeWidth="0.5"
          />

          {/* Cupid's bow */}
          <path d="M 110 167 Q 115 165 120 166 Q 125 165 130 167" stroke={lipColor} strokeWidth="0.8" fill="none" opacity="0.7" />

          {/* Smile dimples (when smiling) */}
          {(isSmile || mode === "friend") && (
            <>
              <path d="M 100 167 Q 102 172 104 175" stroke={skinShadow} strokeWidth="0.8" fill="none" opacity="0.5" />
              <path d="M 140 167 Q 138 172 136 175" stroke={skinShadow} strokeWidth="0.8" fill="none" opacity="0.5" />
            </>
          )}

          {/* Lip highlight */}
          <ellipse cx="120" cy="166" rx="3" ry="0.7" fill="white" opacity="0.5" />
        </g>

        {/* Chin shadow */}
        <ellipse cx="120" cy="186" rx="20" ry="3" fill={skinShadow} opacity="0.18" />
      </motion.svg>
    </div>
  );
}
