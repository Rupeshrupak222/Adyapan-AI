"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Brain, Volume2, Loader2, Wifi } from "lucide-react";

type AIStatus = "listening" | "thinking" | "speaking" | "idle";
type AvatarSize = "sm" | "md" | "lg";

const SIZE_MAP = {
  sm: { outer: 80, label: "text-xs" },
  md: { outer: 160, label: "text-sm" },
  lg: { outer: 220, label: "text-base" },
};

interface AIAvatarProps {
  aiStatus: AIStatus;
  avatarId?: string;
  videoUrl?: string | null;
  audioUrl?: string | null;
  speechEnergy?: number; // 0-100
  companyName?: string;
  size?: AvatarSize;
  theme?: string;
  className?: string;
}

// ─── Animated SVG Face (fallback) ────────────────────────────────────────────
function AnimatedFace({
  aiStatus,
  speechEnergy = 0,
  size,
  isDark,
}: {
  aiStatus: AIStatus;
  speechEnergy: number;
  size: AvatarSize;
  isDark: boolean;
}) {
  const px = SIZE_MAP[size].outer;
  const scale = px / 160; // design base = 160px

  const mouthOpenness =
    aiStatus === "speaking" ? Math.max(3, speechEnergy * 0.18) : 2;

  // Mouth path: bezier curve that opens based on mouthOpenness
  const mouthY = 112;
  const mouthWidth = 28;
  const mouthPath = `M ${80 - mouthWidth} ${mouthY} Q 80 ${mouthY + mouthOpenness * 2} ${80 + mouthWidth} ${mouthY}`;

  return (
    <svg
      viewBox="0 0 160 160"
      width={px}
      height={px}
      style={{ display: "block" }}
    >
      {/* Background circle */}
      <defs>
        <radialGradient id="faceGrad" cx="50%" cy="42%" r="55%">
          <stop offset="0%" stopColor={isDark ? "#f59e0b" : "#fbbf24"} />
          <stop offset="100%" stopColor={isDark ? "#78350f" : "#92400e"} />
        </radialGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow ring */}
      {aiStatus === "speaking" && (
        <motion.circle
          cx="80"
          cy="80"
          r="76"
          fill="url(#glowGrad)"
          animate={{ r: [74, 78, 74] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Face base */}
      <circle cx="80" cy="80" r="72" fill="url(#faceGrad)" />

      {/* Subtle face highlight */}
      <ellipse cx="60" cy="52" rx="18" ry="12" fill="white" opacity="0.07" />

      {/* Eyes */}
      <BlinkingEye cx={60} cy={72} aiStatus={aiStatus} />
      <BlinkingEye cx={100} cy={72} aiStatus={aiStatus} />

      {/* Eyebrows */}
      <motion.line
        x1="50"
        y1={aiStatus === "thinking" ? 60 : 63}
        x2="70"
        y2={aiStatus === "thinking" ? 61 : 63}
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
        animate={{ y1: aiStatus === "thinking" ? 60 : 63 }}
        transition={{ duration: 0.3 }}
      />
      <motion.line
        x1="90"
        y1={aiStatus === "thinking" ? 61 : 63}
        x2="110"
        y2={aiStatus === "thinking" ? 60 : 63}
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.7"
        animate={{ y1: aiStatus === "thinking" ? 61 : 63 }}
        transition={{ duration: 0.3 }}
      />

      {/* Nose */}
      <path
        d="M 78 88 Q 80 93 82 88"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.4"
      />

      {/* Mouth — animated lip-sync */}
      <motion.path
        d={mouthPath}
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity={aiStatus === "idle" ? 0.5 : 0.9}
        animate={{ d: mouthPath }}
        transition={{ duration: 0.05, ease: "linear" }}
      />

      {/* Thinking dots */}
      {aiStatus === "thinking" && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={72 + i * 8}
              cy={136}
              r={3}
              fill="white"
              animate={{ opacity: [0.2, 1, 0.2], cy: [136, 133, 136] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </>
      )}

      {/* Listening indicator — ear waves */}
      {aiStatus === "listening" && (
        <>
          <motion.path
            d="M 14 68 Q 6 80 14 92"
            stroke="#fbbf24"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <motion.path
            d="M 8 62 Q -2 80 8 98"
            stroke="#fbbf24"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
          <motion.path
            d="M 146 68 Q 154 80 146 92"
            stroke="#fbbf24"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <motion.path
            d="M 152 62 Q 162 80 152 98"
            stroke="#fbbf24"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
          />
        </>
      )}
    </svg>
  );
}

function BlinkingEye({
  cx,
  cy,
  aiStatus,
}: {
  cx: number;
  cy: number;
  aiStatus: AIStatus;
}) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const blinkCycle = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
      const next = 2500 + Math.random() * 3000;
      setTimeout(blinkCycle, next);
    };
    const t = setTimeout(blinkCycle, 1000 + Math.random() * 2000);
    return () => clearTimeout(t);
  }, []);

  const ry = blink ? 0.5 : aiStatus === "speaking" ? 6 : 5.5;

  return (
    <motion.ellipse
      cx={cx}
      cy={cy}
      rx={6}
      ry={ry}
      fill="white"
      animate={{ ry }}
      transition={{ duration: 0.07 }}
    />
  );
}

// ─── Speaking Waveform Bars ───────────────────────────────────────────────────
function SpeakingWaveform({
  energy,
  isDark,
}: {
  energy: number;
  isDark: boolean;
}) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-8">
      {[...Array(9)].map((_, i) => {
        const center = 4;
        const dist = Math.abs(i - center) / center;
        const factor = 1 - dist * 0.5;
        const minH = 4;
        const maxH = 28;
        const h = minH + (energy / 100) * (maxH - minH) * factor;
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${Math.max(minH, h)}px`,
              background: isDark
                ? "rgba(251,191,36,0.85)"
                : "rgba(217,119,6,0.75)",
              transition: "height 0.08s ease-out",
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Main AIAvatar Component ──────────────────────────────────────────────────
export default function AIAvatar({
  aiStatus,
  videoUrl,
  audioUrl,
  speechEnergy = 0,
  companyName,
  size = "md",
  theme,
  className = "",
}: AIAvatarProps) {
  const isDark = theme === "dark";
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const px = SIZE_MAP[size].outer;

  // Play ElevenLabs audio when URL changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(() => {});
    }
  }, [audioUrl]);

  // Play D-ID video when URL changes
  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.src = videoUrl;
      videoRef.current.play().catch(() => {});
    }
  }, [videoUrl]);

  const statusColors: Record<AIStatus, string> = {
    speaking: isDark ? "#22c55e" : "#16a34a",
    thinking: isDark ? "#f59e0b" : "#d97706",
    listening: isDark ? "#fbbf24" : "#d97706",
    idle: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
  };

  const statusLabels: Record<AIStatus, string> = {
    speaking: "Speaking",
    thinking: "Thinking...",
    listening: "Listening",
    idle: "Ready",
  };

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      style={{ width: px }}
    >
      {/* Avatar Frame */}
      <div className="relative" style={{ width: px, height: px }}>
        {/* Outer glow ring when speaking */}
        <AnimatePresence>
          {aiStatus === "speaking" && (
            <motion.div
              className="absolute inset-0 rounded-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [1, 1.04, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background: isDark
                  ? "radial-gradient(circle, rgba(251,191,36,0.45) 0%, transparent 70%)"
                  : "radial-gradient(circle, rgba(217,119,6,0.3) 0%, transparent 70%)",
                borderRadius: "50%",
              }}
            />
          )}
        </AnimatePresence>

        {/* Video mode (D-ID) */}
        {videoUrl ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full rounded-full overflow-hidden"
            style={{
              border: `3px solid ${isDark ? "rgba(251,191,36,0.65)" : "rgba(217,119,6,0.45)"}`,
              boxShadow: isDark
                ? "0 0 32px rgba(251,191,36,0.45), 0 8px 32px rgba(0,0,0,0.5)"
                : "0 0 24px rgba(217,119,6,0.25), 0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted={!!audioUrl} // mute D-ID video if using ElevenLabs audio separately
            />
          </motion.div>
        ) : (
          /* SVG Animated Face (fallback / no D-ID) */
          <motion.div
            className="w-full h-full rounded-full overflow-hidden flex items-center justify-center"
            style={{
              border: `3px solid ${isDark ? "rgba(251,191,36,0.55)" : "rgba(217,119,6,0.4)"}`,
              boxShadow: isDark
                ? "0 0 32px rgba(251,191,36,0.4), 0 8px 32px rgba(0,0,0,0.45)"
                : "0 0 24px rgba(217,119,6,0.2), 0 6px 20px rgba(0,0,0,0.12)",
            }}
            animate={
              aiStatus === "speaking"
                ? { scale: [1, 1.015, 1] }
                : aiStatus === "thinking"
                  ? { scale: [1, 1.008, 1] }
                  : { scale: [1, 1.005, 1] }
            }
            transition={{
              duration: aiStatus === "speaking" ? 0.5 : 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <AnimatedFace
              aiStatus={aiStatus}
              speechEnergy={speechEnergy}
              size={size}
              isDark={isDark}
            />
          </motion.div>
        )}

        {/* Status badge */}
        <motion.div
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full"
          style={{
            width: size === "sm" ? 20 : size === "md" ? 28 : 36,
            height: size === "sm" ? 20 : size === "md" ? 28 : 36,
            background: statusColors[aiStatus],
            border: `2px solid ${isDark ? "#0f0f1a" : "#ffffff"}`,
            boxShadow: `0 2px 8px ${statusColors[aiStatus]}80`,
          }}
          animate={
            aiStatus === "listening" ? { scale: [1, 1.2, 1] } : { scale: 1 }
          }
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {aiStatus === "speaking" ? (
            <Volume2
              style={{
                width: size === "sm" ? 10 : 14,
                height: size === "sm" ? 10 : 14,
                color: "white",
              }}
            />
          ) : aiStatus === "thinking" ? (
            <Loader2
              style={{
                width: size === "sm" ? 10 : 14,
                height: size === "sm" ? 10 : 14,
                color: "white",
                animation: "spin 1s linear infinite",
              }}
            />
          ) : aiStatus === "listening" ? (
            <Mic
              style={{
                width: size === "sm" ? 10 : 14,
                height: size === "sm" ? 10 : 14,
                color: "white",
              }}
            />
          ) : (
            <div
              style={{
                width: size === "sm" ? 6 : 8,
                height: size === "sm" ? 6 : 8,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.7)",
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Waveform (only when speaking, only for md/lg) */}
      {aiStatus === "speaking" && size !== "sm" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <SpeakingWaveform energy={speechEnergy} isDark={isDark} />
        </motion.div>
      )}

      {/* Name + Status label */}
      {size !== "sm" && (
        <div className="flex flex-col items-center gap-0.5">
          <span
            className="font-bold tracking-tight"
            style={{
              color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)",
              fontSize: size === "lg" ? "15px" : "12px",
            }}
          >
            {companyName ? `${companyName} AI Interviewer` : "AI Interviewer"}
          </span>
          <motion.span
            key={aiStatus}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-medium"
            style={{
              color: statusColors[aiStatus],
              fontSize: size === "lg" ? "13px" : "11px",
            }}
          >
            {statusLabels[aiStatus]}
          </motion.span>
        </div>
      )}

      {/* Hidden audio player for ElevenLabs */}
      <audio ref={audioRef} style={{ display: "none" }} />
    </div>
  );
}
