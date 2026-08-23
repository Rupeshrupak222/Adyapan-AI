"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { AIContent } from "@/components/ai/AIContent";
import CountUp from "react-countup";
import {
  Sparkles, Brain, AlertTriangle, RotateCcw, Search, Zap,
  ChevronRight, CheckCircle, XCircle, Lightbulb, ArrowRight,
  Target, Trophy, TrendingUp, Star, Flame, BookOpen,
  Plus, Timer,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";

const mkColors = (theme: string) => {
  const isDark = theme === "dark";
  return {
    isDark,
    text: isDark ? "#e5e7eb" : "#0f172a",
    textSec: isDark ? "#9ca3af" : "#475569",
    textMuted: isDark ? "#828fa3" : "#5f6368",
    textOnAmber: "#000000",
    bg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
    bgHover: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    borderHover: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)",
    inputBg: isDark ? "rgba(0,0,0,0.35)" : "#f1f5f9",
    cardBg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
    cardBgAlt: isDark ? "rgba(0,0,0,0.25)" : "#f8fafc",
    stickyBg: isDark ? "rgba(10,10,20,0.88)" : "rgba(248,250,252,0.92)",
    amber: "#f59e0b",
    amberBg: isDark ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.08)",
    amberBorder: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.25)",
    amberActive: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
    purpleBg: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.05)",
    purpleBorder: isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.15)",
    green: "#10b981",
    greenBg: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
    red: "#ef4444",
    redBg: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)",
    divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    pill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    pillBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type QuizMode = "beginner" | "intermediate" | "interview" | "revision";
type QuizDuration = "5m" | "10m" | "20m" | "30m";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  follow_up?: string;
}

interface QuizData {
  quiz_title: string;
  topic: string;
  difficulty: string;
  estimated_time: string;
  mode: QuizMode;
  questions: QuizQuestion[];
  performance_insights_template: {
    strengths: string[];
    weak_areas: string[];
    recommended_next_step: string;
  };
}

interface QuizAnswer {
  questionIndex: number;
  selectedOption: string;
  isCorrect: boolean;
}

interface QuizResultData {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  accuracy: string;
  answers: QuizAnswer[];
  xpEarned: number;
  badge: string;
  completedAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MODES: { key: QuizMode; label: string; description: string; color: string; icon: string }[] = [
  { key: "beginner", label: "Beginner", description: "Concept checks, definitions, basic examples", color: "emerald", icon: "🌱" },
  { key: "intermediate", label: "Intermediate", description: "Application questions, real-world scenarios", color: "violet", icon: "⚡" },
  { key: "interview", label: "Interview Prep", description: "Frequently asked interview questions, scenarios", color: "amber", icon: "🎯" },
  { key: "revision", label: "Quick Revision", description: "High-yield facts, exam-style rapid-fire", color: "rose", icon: "📝" },
];

const DURATIONS: { key: QuizDuration; label: string; hint: string }[] = [
  { key: "5m", label: "5 min", hint: "3 questions" },
  { key: "10m", label: "10 min", hint: "5 questions" },
  { key: "20m", label: "20 min", hint: "8 questions" },
  { key: "30m", label: "30 min", hint: "10 questions" },
];

const TOPIC_PRESETS = [
  "Gradient Descent", "SQL Joins", "React Hooks", "Binary Search",
  "Neural Networks", "REST vs GraphQL", "Docker Containers", "CSS Flexbox",
];

const LOADING_STEPS = [
  { label: "Analyzing topic", sub: "Building concept map…" },
  { label: "Selecting question types", sub: "Matching to your learning mode…" },
  { label: "Crafting questions", sub: "Ensuring reasoning over memorization…" },
  { label: "Generating distractors", sub: "Making wrong answers plausibly wrong…" },
  { label: "Writing explanations", sub: "Adding educational insights…" },
  { label: "Generating performance insights", sub: "Personalizing your assessment…" },
];

const DURATION_SECONDS: Record<QuizDuration, number> = {
  "5m": 5 * 60,
  "10m": 10 * 60,
  "20m": 20 * 60,
  "30m": 30 * 60,
};

// ─── Utility functions ────────────────────────────────────────────────────────

function calculateXP(score: number, mode: QuizMode, duration: QuizDuration): number {
  const base: Record<QuizDuration, number> = { "5m": 30, "10m": 50, "20m": 80, "30m": 120 };
  const modeMultiplier: Record<QuizMode, number> = {
    beginner: 1.0,
    intermediate: 1.3,
    interview: 1.6,
    revision: 1.2,
  };
  const accuracyBonus = score >= 90 ? 1.5 : score >= 70 ? 1.2 : score >= 50 ? 1.0 : 0.7;
  return Math.round(base[duration] * modeMultiplier[mode] * accuracyBonus);
}

function getBadge(score: number): string {
  if (score === 100) return "Perfect Score";
  if (score >= 90) return "Expert";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Progressing";
  if (score >= 40) return "Keep Studying";
  return "Try Again";
}

function getPerformanceLabel(score: number) {
  if (score === 100) return { label: "Perfect", sub: "Flawless execution" };
  if (score >= 90) return { label: "Expert", sub: "Outstanding performance" };
  if (score >= 75) return { label: "Strong", sub: "Above average understanding" };
  if (score >= 60) return { label: "Progressing", sub: "Good foundation, keep going" };
  if (score >= 40) return { label: "Developing", sub: "Review the weak areas below" };
  return { label: "Needs Work", sub: "Don't give up — retry the quiz" };
}

function getModeAccent(mode: QuizMode) {
  switch (mode) {
    case "beginner": return { text: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", gradient: "from-emerald-500 to-teal-400" };
    case "intermediate": return { text: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.2)", gradient: "from-violet-500 to-indigo-400" };
    case "interview": return { text: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.2)", gradient: "from-amber-500 to-orange-400" };
    case "revision": return { text: "#f43f5e", bg: "rgba(244,63,94,0.1)", border: "rgba(244,63,94,0.2)", gradient: "from-rose-500 to-pink-400" };
  }
}

// ─── Inline Confetti (no external dependency) ──────────────────────────────────

function fireConfetti(colors: string[], count = 80) {
  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string; rotation: number; rotationSpeed: number; opacity: number }[] = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width * (0.3 + Math.random() * 0.4),
      y: canvas.height * (0.3 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 10 - 4,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      opacity: 1,
    });
  }

  let frame = 0;
  const maxFrames = 100;

  function animate() {
    frame++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.15;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.opacity = Math.max(0, 1 - frame / maxFrames);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (frame < maxFrames) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  }
  animate();
}

// ─── Timer Ring ────────────────────────────────────────────────────────────────

function TimerRing({ pct, color, size, urgent, warning }: { pct: number; color: string; size: number; urgent: boolean; warning: boolean }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeColor = urgent ? "#ef4444" : warning ? "#f59e0b" : color;

  return (
    <svg width={size} height={size} className="rotate-[-90deg] shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
        transition={{ duration: 0.8, ease: "linear" }}
        style={{ filter: `drop-shadow(0 0 4px ${strokeColor}66)` }}
      />
    </svg>
  );
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── QuizTimer Component ──────────────────────────────────────────────────────

function QuizTimer({ duration, mode, isRunning, onTimeUp }: { duration: QuizDuration; mode: QuizMode; isRunning: boolean; onTimeUp: () => void }) {
  const total = DURATION_SECONDS[duration];
  const [remaining, setRemaining] = useState(total);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const calledTimeUp = useRef(false);
  const accent = getModeAccent(mode);

  useEffect(() => {
    setRemaining(total);
    calledTimeUp.current = false;
  }, [total, duration, mode]);

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        if (!calledTimeUp.current) { calledTimeUp.current = true; setTimeout(onTimeUp, 0); }
        return 0;
      }
      return prev - 1;
    });
  }, [onTimeUp]);

  useEffect(() => {
    if (isRunning && remaining > 0) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, remaining, tick]);

  const pct = remaining / total;
  const warning = pct < 0.25;
  const urgent = remaining <= 60 && remaining > 0;
  const done = remaining === 0;

  const textColor = done ? "#71717a" : urgent ? "#ef4444" : warning ? "#f59e0b" : accent.text;
  const bgColor = done ? "rgba(39,39,42,0.4)" : urgent ? "rgba(239,68,68,0.08)" : warning ? "rgba(245,158,11,0.08)" : accent.bg;
  const borderColor = done ? "rgba(39,39,42,0.6)" : urgent ? "rgba(239,68,68,0.3)" : warning ? "rgba(245,158,11,0.3)" : accent.border;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors duration-700 ${urgent && !done ? "animate-pulse" : ""}`}>
      <TimerRing pct={pct} color={done ? "#3f3f46" : urgent ? "#ef4444" : warning ? "#f59e0b" : accent.text} size={28} urgent={urgent && !done} warning={warning && !urgent} />
      <div className="flex flex-col leading-none">
        <AnimatePresence mode="wait">
          <motion.span key={remaining} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }} style={{ color: textColor }}
            className="text-sm font-black tabular-nums tracking-tight">
            {done ? "0:00" : fmtTime(remaining)}
          </motion.span>
        </AnimatePresence>
        <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest mt-0.5">
          {done ? "Time's up" : urgent ? "Hurry!" : warning ? "Running low" : "Remaining"}
        </span>
      </div>
      <Timer size={13} style={{ color: textColor }} className="shrink-0 ml-0.5" />
    </motion.div>
  );
}

// ─── Score Ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, mode, size }: { score: number; mode: QuizMode; size: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const accent = getModeAccent(mode);
  const theme = useTheme();
  const c = mkColors(theme);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={c.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} strokeWidth={6} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={accent.text} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          style={{ filter: `drop-shadow(0 0 6px ${accent.text}55)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
          className="text-xl sm:text-2xl font-black leading-none" style={{ color: c.text }}>{score}%</motion.span>
        <span className="text-[9px] font-mono mt-0.5" style={{ color: c.textMuted }}>SCORE</span>
      </div>
    </div>
  );
}

function ResponsiveScoreRing({ score, mode }: { score: number; mode: QuizMode }) {
  const [size, setSize] = useState(100);
  useEffect(() => {
    const update = () => setSize(window.innerWidth < 400 ? 88 : window.innerWidth < 640 ? 96 : 116);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return <ScoreRing score={score} mode={mode} size={size} />;
}

// ─── Answer Review Row ────────────────────────────────────────────────────────

function AnswerRow({ index, question, selected, correct, isCorrect, explanation }: {
  index: number; question: string; selected: string; correct: string; isCorrect: boolean; explanation: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const c = mkColors(theme);

  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
      style={{
        border: `1px solid ${isCorrect ? (c.isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.3)") : (c.isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.3)")}`,
        background: isCorrect ? (c.isDark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.08)") : (c.isDark ? "rgba(239,68,68,0.03)" : "rgba(239,68,68,0.06)")
      }}
      className="rounded-xl border overflow-hidden transition-colors duration-200">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-start gap-3 p-4 text-left cursor-pointer group">
        <span className="shrink-0 mt-0.5">
          {isCorrect ? <CheckCircle size={15} className="text-emerald-500" /> : <XCircle size={15} className="text-red-500" />}
        </span>
        <div className="flex-1 space-y-0.5 min-w-0">
          <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: c.text }}>{index + 1}. {question}</p>
          {!isCorrect && <p className="text-[10px]" style={{ color: c.textSec }}>Your answer: <span className="text-red-500 font-semibold">{selected}</span></p>}
        </div>
        <ChevronRight size={13} className={`shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} style={{ color: c.textMuted }} />
      </button>
      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-4 space-y-2 pt-3" style={{ borderTop: `1px solid ${c.divider}` }}>
          {!isCorrect && <p className="text-[10px]" style={{ color: c.textSec }}>Correct answer: <span className="text-emerald-500 font-semibold">{correct}</span></p>}
          <div className="text-xs leading-relaxed" style={{ color: c.text }}><AIContent content={explanation} /></div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function QuizSkeleton({ step, mode, topic }: { step: number; mode: QuizMode; topic: string }) {
  const accent = getModeAccent(mode);
  const currentStep = LOADING_STEPS[Math.min(step, LOADING_STEPS.length - 1)];

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="space-y-4">
        <div className="flex justify-center">
          <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center border"
            style={{ background: accent.bg, border: `1px solid ${accent.border}` }}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 border-transparent border-t-current" style={{ color: accent.text }} />
          </motion.div>
        </div>
        <div className="text-center space-y-1 px-4">
          <motion.p key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="text-sm font-bold" style={{ color: accent.text }}>{currentStep.label}</motion.p>
          <motion.p key={`${step}-sub`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="text-xs" style={{ color: "#71717a" }}>{currentStep.sub}</motion.p>
          {topic && <p className="text-[10px] font-mono pt-1" style={{ color: "#52525b" }}>Topic: <span style={{ color: "#a1a1aa" }}>{topic}</span></p>}
        </div>
        <div className="flex justify-center gap-1.5">
          {LOADING_STEPS.map((_, i) => (
            <motion.div key={i} className="rounded-full transition-all duration-500"
              style={{
                width: i <= step ? 20 : 6,
                height: 6,
                background: i <= step ? accent.text + "99" : "#27272a",
              }}
              animate={i === step ? { opacity: [0.6, 1, 0.6] } : {}}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border p-4 sm:p-6 space-y-4 sm:space-y-6" style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 rounded-md" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-5 w-full rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
            <div className="h-5 w-4/5 rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div className="shrink-0 h-7 w-7 sm:h-9 sm:w-9 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="space-y-2 sm:space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-4 sm:p-3.5 rounded-xl min-h-[52px]" style={{ border: "1px solid rgba(113,113,122,0.1)", background: "rgba(0,0,0,0.25)" }}>
              <div className="shrink-0 h-7 w-7 sm:h-6 sm:w-6 rounded-md" style={{ background: "rgba(255,255,255,0.06)" }} />
              <div className="h-3.5 rounded" style={{ width: i % 2 === 0 ? "66%" : "50%", background: "rgba(255,255,255,0.06)" }} />
            </motion.div>
          ))}
        </div>
        <div className="h-12 w-full rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-3 w-20 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
          <div className="h-3 w-16 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "#27272a" }}>
          <motion.div className="h-full rounded-full" style={{
            background: `linear-gradient(90deg, ${accent.text}66, ${accent.text}33)`,
          }}
            animate={{ width: ["0%", "45%", "20%", "55%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function QuizGeneratorView({ onViewTool }: { onViewTool?: (tool: string) => void }) {
  const router = useRouter();
  const theme = useTheme();
  const c = mkColors(theme);
  const quota = useFeatureQuota("QUIZ_GENERATOR");

  // Quiz config
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<QuizMode>("intermediate");
  const [duration, setDuration] = useState<QuizDuration>("10m");

  // Quiz state
  const [phase, setPhase] = useState<"config" | "generating" | "active" | "results">("config");
  const [loadingStep, setLoadingStep] = useState(0);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});
  const [quizResult, setQuizResult] = useState<QuizResultData | null>(null);

  // Derived
  const accent = getModeAccent(mode);
  const currentQuestion = quizData?.questions[currentIndex] ?? null;
  const selectedOption = userAnswers[currentIndex] ?? null;
  const isSubmitted = !!submittedQuestions[currentIndex];
  const isLastQuestion = quizData ? currentIndex >= quizData.questions.length - 1 : false;
  const questionCount = DURATIONS.find(d => d.key === duration)?.hint?.split(" ")[0] ?? "5";

  const generateQuiz = useCallback(async (overrideTopic?: string) => {
    const topicVal = (overrideTopic || topic).trim();
    if (!topicVal) return;
    if (quota.exhausted) {
      toast.error("You've used all free AI Quiz Generator attempts this month.", {
        description: "Upgrade to Premium for unlimited quizzes.",
      });
      return;
    }
    const requestId = quota.newRequestId();
    setQuizError(null);
    setQuizData(null);
    setQuizResult(null);
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmittedQuestions({});
    setPhase("generating");
    setLoadingStep(0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STEPS.forEach((_, i) => timers.push(setTimeout(() => setLoadingStep(i), i * 800)));

    try {
      const res = await api.post("/quiz/generate", {
        topic: topicVal,
        mode,
        duration,
        questionCount: parseInt(questionCount),
        requestId,
      });
      timers.forEach(clearTimeout);
      quota.onSuccess();
      const data = res.data;
      if (data.quiz) {
        setQuizData(data.quiz);
        setPhase("active");
      } else if (data.questions) {
        setQuizData({
          quiz_title: `${topicVal} — ${mode.charAt(0).toUpperCase() + mode.slice(1)} Quiz`,
          topic: topicVal,
          difficulty: "medium",
          estimated_time: duration,
          mode,
          questions: data.questions,
          performance_insights_template: data.performance_insights_template ?? {
            strengths: ["Good foundational understanding", "Clear reasoning ability"],
            weak_areas: ["Review edge cases", "Practice more complex scenarios"],
            recommended_next_step: "Review related topics and try a longer quiz",
          },
        });
        setPhase("active");
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: unknown) {
      timers.forEach(clearTimeout);
      if (quota.handleQuotaError(err)) {
        setPhase("config");
        return;
      }
      await quota.onFailure();
      const msg = err instanceof Error ? err.message : "Unexpected error. Please try again.";
      setQuizError(msg);
      setPhase("config");
      toast.error(msg);
    }
  }, [topic, mode, duration, questionCount, quota]);

  const handleSelect = (option: string) => {
    if (submittedQuestions[currentIndex]) return;
    setUserAnswers(prev => ({ ...prev, [currentIndex]: option }));
  };

  const handleSubmit = () => {
    if (!quizData) return;
    const q = quizData.questions[currentIndex];
    if (!q || !userAnswers[currentIndex]) return;
    setSubmittedQuestions(prev => ({ ...prev, [currentIndex]: true }));
    const isCorrect = userAnswers[currentIndex] === q.correct_answer;
    if (isCorrect) {
      const confettiColors = mode === "beginner" ? ["#10b981", "#34d399"]
        : mode === "interview" ? ["#f59e0b", "#fbbf24"]
        : mode === "revision" ? ["#f43f5e", "#fb7185"]
        : ["#8b5cf6", "#6366f1"];
      fireConfetti(confettiColors, 60);
    }
  };

  const handleNext = () => {
    if (!quizData) return;
    if (isLastQuestion) {
      finishQuiz();
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  const finishQuiz = () => {
    if (!quizData) return;
    const answers: QuizAnswer[] = quizData.questions.map((q, i) => ({
      questionIndex: i,
      selectedOption: userAnswers[i] ?? "",
      isCorrect: userAnswers[i] === q.correct_answer,
    }));
    const correct = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correct / quizData.questions.length) * 100);
    setQuizResult({
      totalQuestions: quizData.questions.length,
      correctAnswers: correct,
      score,
      accuracy: `${score}%`,
      answers,
      xpEarned: calculateXP(score, mode, duration),
      badge: getBadge(score),
      completedAt: new Date().toISOString(),
    });
    setPhase("results");
  };

  const handleTimeUp = () => {
    finishQuiz();
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmittedQuestions({});
    setQuizResult(null);
    setPhase("active");
  };

  const handleNewQuiz = () => {
    setQuizData(null);
    setQuizResult(null);
    setPhase("config");
    setCurrentIndex(0);
    setUserAnswers({});
    setSubmittedQuestions({});
  };

  // Confetti on good results
  useEffect(() => {
    if (phase === "results" && quizResult && quizResult.score >= 75) {
      const colorMap: Record<QuizMode, string[]> = {
        beginner: ["#10b981", "#34d399", "#6ee7b7"],
        intermediate: ["#8b5cf6", "#6366f1", "#a78bfa"],
        interview: ["#f59e0b", "#fbbf24", "#fcd34d"],
        revision: ["#f43f5e", "#fb7185", "#fda4af"],
      };
      const timeout = setTimeout(() => {
        fireConfetti(colorMap[mode], quizResult.score === 100 ? 200 : 120);
      }, 400);
      return () => clearTimeout(timeout);
    }
  }, [phase, quizResult, mode]);

  const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }) };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col antialiased" style={{ color: c.text }}>
      <style>{`.qz-scroll::-webkit-scrollbar { width: 5px; } .qz-scroll::-webkit-scrollbar-track { background: transparent; } .qz-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.4); border-radius: 4px; } .qz-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.7); } .qz-scroll { scrollbar-width: thin; scrollbar-color: rgba(139,92,246,0.4) transparent; }`}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Brain size={18} style={{ color: "#000" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
              AI Smart Quiz Engine
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="text-xs leading-tight" style={{ color: c.textMuted }}>
              Personalized Assessment Engine
            </motion.p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FeatureCreditBadge featureKey="QUIZ_GENERATOR" compact isDark={theme === "dark"} />
          {(quizData || quizResult) && (
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={handleNewQuiz}
            className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
            <Plus size={14} /> New Quiz
          </motion.button>
        )}
        </div>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">

          {/* ── CONFIG PHASE ── */}
          {phase === "config" && (
            <motion.div key="config" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">

              {/* Error banner */}
              <AnimatePresence>
                {quizError && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-3 p-4 rounded-xl" style={{ border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)" }}>
                    <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-bold text-red-400">Quiz Generation Failed</p>
                      <p className="text-xs leading-relaxed" style={{ color: c.textMuted }}>{quizError}</p>
                    </div>
                    <button onClick={() => setQuizError(null)} className="text-xs" style={{ color: "#52525b" }}>✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Topic Input */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}
                className="p-6 rounded-3xl relative overflow-hidden" style={{ background: c.surface, border: `1px solid ${accent.border}` }}>
                <div className="relative z-10 space-y-4">
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: c.textMuted }}>What do you want to be quizzed on?</p>
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#52525b" }} />
                    <input type="text" placeholder="Enter a topic to generate quiz..." value={topic}
                      onChange={e => setTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && topic.trim() && generateQuiz()}
                      className="w-full rounded-xl pl-10 pr-4 py-3 text-sm transition-all focus:outline-none"
                      style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                  </div>
                </div>
              </motion.div>

              {/* Mode & Duration Config */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="space-y-6">
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: c.textMuted }}>Learning Mode</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {MODES.map(m => {
                      const active = mode === m.key;
                      const modeAccent = getModeAccent(m.key);
                      return (
                        <motion.button key={m.key} whileTap={{ scale: 0.97 }} onClick={() => setMode(m.key)}
                          className="relative flex flex-col items-start gap-1.5 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer overflow-hidden"
                          style={{
                            background: active ? modeAccent.bg : c.pill,
                            border: `1px solid ${active ? modeAccent.border : c.pillBorder}`,
                          }}>
                          {active && (
                            <motion.div layoutId="active-mode" className="absolute inset-0 rounded-xl pointer-events-none opacity-20"
                              style={{ background: `linear-gradient(135deg, ${modeAccent.text}22, transparent)` }}
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className="text-[10px] font-black uppercase tracking-wider relative z-10" style={{ color: active ? modeAccent.text : c.textMuted }}>
                            {m.label}
                          </span>
                          <span className="text-[9px] leading-tight relative z-10 line-clamp-2" style={{ color: c.textMuted }}>
                            {m.description}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: c.textMuted }}>Quiz Duration</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DURATIONS.map(d => {
                      const active = duration === d.key;
                      return (
                        <motion.button key={d.key} whileTap={{ scale: 0.96 }} onClick={() => setDuration(d.key)}
                          className="flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 cursor-pointer"
                          style={{
                            background: active ? accent.bg : c.pill,
                            border: `1px solid ${active ? accent.border : c.pillBorder}`,
                          }}>
                          <span className="text-sm font-black" style={{ color: active ? accent.text : c.text }}>{d.label}</span>
                          <span className="text-[9px] font-mono" style={{ color: c.textMuted }}>{d.hint}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              {/* Summary bar */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}
                className="flex items-center justify-between p-3.5 rounded-xl border"
                style={{ background: accent.bg, border: `1px solid ${accent.border}` }}>
                <div className="flex items-center gap-2 text-xs">
                  <Zap size={13} style={{ color: accent.text }} />
                  <span style={{ color: c.textMuted }}>
                    <span className="font-bold" style={{ color: accent.text }}>{DURATIONS.find(d => d.key === duration)?.hint}</span>
                    {" · "}{MODES.find(m => m.key === mode)?.label}{" · "}{DURATIONS.find(d => d.key === duration)?.label} session
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider hidden sm:block" style={{ color: accent.text }}>
                  {MODES.find(m => m.key === mode)?.description.split(",")[0]}
                </span>
              </motion.div>

              {/* Generate Button */}
              <motion.button variants={fadeUp} initial="hidden" animate="visible" custom={3}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                disabled={!topic.trim()}
                onClick={() => generateQuiz()}
                className="w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                <Sparkles size={16} /> Generate & Start Quiz
              </motion.button>
            </motion.div>
          )}

          {/* ── GENERATING PHASE ── */}
          {phase === "generating" && (
            <motion.div key="generating" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
              <QuizSkeleton step={loadingStep} mode={mode} topic={topic} />
            </motion.div>
          )}

          {/* ── ACTIVE QUIZ PHASE ── */}
          {phase === "active" && quizData && currentQuestion && (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-0" style={{ minHeight: "600px" }}>

                {/* LEFT PANEL 30% */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex flex-col gap-3 shrink-0" style={{ width: "30%", minWidth: "220px", position: "sticky", top: 0 }}>

                  {/* Quiz info */}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-2xl shrink-0" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: accent.bg, border: `1px solid ${accent.border}` }}>
                        <Brain size={14} style={{ color: accent.text }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: c.text }}>{quizData.quiz_title}</p>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: accent.bg, color: accent.text }}>{MODES.find(m => m.key === mode)?.label}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "Questions", value: quizData.questions.length },
                        { label: "Answered", value: `${currentIndex + (isSubmitted ? 1 : 0)}/${quizData.questions.length}` },
                        { label: "Duration", value: DURATIONS.find(d => d.key === duration)?.label },
                        { label: "Score", value: <CountUp start={0} end={quizData.questions.filter((q, i) => submittedQuestions[i] && userAnswers[i] === q.correct_answer).length} duration={0.5} /> }
                      ].map(stat => (
                        <div key={stat.label} className="p-2 rounded-lg text-center" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                          <span className="text-[10px] block" style={{ color: c.textMuted }}>{stat.label}</span>
                          <span className="text-xs font-extrabold" style={{ color: c.text }}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Question Navigation */}
                  <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                    <div className="p-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: c.divider, background: c.stickyBg, backdropFilter: "blur(12px)" }}>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accent.text }}>Questions List</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: accent.bg, color: accent.text }}>{quizData.questions.length} Items</span>
                    </div>
                    <div className="p-2 space-y-1 overflow-y-auto qz-scroll" style={{ maxHeight: "250px" }}>
                      {quizData.questions.map((q, idx) => {
                        const isCorrect = submittedQuestions[idx] && userAnswers[idx] === q.correct_answer;
                        const isWrong = submittedQuestions[idx] && userAnswers[idx] !== q.correct_answer;
                        return (
                          <motion.button key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                            onClick={() => { if (!submittedQuestions[idx]) { setCurrentIndex(idx); } }}
                            whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                            className="w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between transition-all duration-200"
                            style={{
                              background: currentIndex === idx ? accent.bg : "transparent",
                              border: currentIndex === idx ? `1px solid ${accent.border}` : "1px solid transparent",
                            }}>
                            <div className="flex items-center gap-2 min-w-0">
                              {isCorrect && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                              {isWrong && <XCircle size={12} className="text-red-400 shrink-0" />}
                              <span className="text-sm font-semibold truncate" style={{ color: currentIndex === idx ? accent.text : isSubmitted ? c.textSec : c.textSec }}>
                                Question {idx + 1}
                              </span>
                            </div>
                            <ChevronRight size={12} style={{ color: currentIndex === idx ? accent.text : c.textMuted }}
                              className={`transition-transform duration-200 ${currentIndex === idx ? "rotate-90" : ""}`} />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timer */}
                  <QuizTimer duration={duration} mode={mode} isRunning={phase === "active"} onTimeUp={handleTimeUp} />
                </motion.div>

                {/* RIGHT PANEL 70% */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }}
                  className="flex-1 flex flex-col min-w-0 pl-4">
                  <motion.div key={currentIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${accent.border}` }}>

                    {/* Question header */}
                    <div className="flex justify-between items-center pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
                      <span className="text-xs font-semibold" style={{ color: c.textMuted }}>
                        Question {currentIndex + 1} of {quizData.questions.length}
                      </span>
                      <span className="text-sm font-extrabold flex items-center gap-1.5" style={{ color: accent.text }}>
                        <Trophy size={14} /> Score:{' '}
                        <CountUp start={0} end={quizData.questions.filter((q, i) => submittedQuestions[i] && userAnswers[i] === q.correct_answer).length} duration={0.5} />
                      </span>
                    </div>

                    <h3 className="text-sm font-bold mb-4 leading-relaxed" style={{ color: c.text }}>{currentQuestion.question}</h3>

                    {/* Options */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentQuestion.options.map((opt, idx) => {
                        const optSelected = selectedOption === opt;
                        const optCorrect = opt === currentQuestion.correct_answer;
                        let optBg = c.surface;
                        let optBorder = c.border;
                        let optColor = c.text;

                        if (!isSubmitted) {
                          if (optSelected) {
                            optBg = accent.bg;
                            optBorder = accent.border;
                            optColor = accent.text;
                          } else {
                            optBg = c.surface;
                            optBorder = c.border;
                          }
                        } else {
                          if (optCorrect) {
                            optBg = c.greenBg;
                            optBorder = c.green;
                            optColor = c.text;
                          } else if (optSelected && !optCorrect) {
                            optBg = c.redBg;
                            optBorder = c.red;
                            optColor = c.text;
                          } else {
                            optBg = c.surface;
                            optBorder = c.border;
                            optColor = c.textMuted;
                          }
                        }

                        return (
                          <motion.button key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.06 }}
                            onClick={() => handleSelect(opt)} whileHover={isSubmitted ? {} : { x: 2 }}
                            className="p-3 rounded-xl text-left font-semibold text-sm transition-all flex items-center gap-3"
                            style={{ background: optBg, border: `1px solid ${optBorder}`, color: optColor }}>
                            <span className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-black border"
                              style={{
                                background: optSelected && !isSubmitted ? accent.bg : "transparent",
                                borderColor: optSelected && !isSubmitted ? accent.border : c.borderHover,
                                color: optSelected && !isSubmitted ? accent.text : c.textMuted,
                              }}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1">{opt}</span>
                            {isSubmitted && optCorrect && <CheckCircle size={16} className="text-emerald-400 shrink-0" />}
                            {isSubmitted && optSelected && !optCorrect && <XCircle size={16} className="text-red-400 shrink-0" />}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Feedback & Action */}
                    <AnimatePresence>
                      {isSubmitted && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.35 }} className="overflow-hidden">
                          <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${c.divider}` }}>

                            {/* Feedback panel */}
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                              className="p-4 rounded-xl space-y-2" style={{
                                background: userAnswers[currentIndex] === currentQuestion.correct_answer ? c.greenBg : c.redBg,
                                border: `1px solid ${userAnswers[currentIndex] === currentQuestion.correct_answer ? c.green : c.red}`,
                              }}>
                              <div className="flex items-center gap-2">
                                {userAnswers[currentIndex] === currentQuestion.correct_answer ? (
                                  <><CheckCircle size={15} className="text-emerald-400 shrink-0" /><span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Correct!</span></>
                                ) : (
                                  <><XCircle size={15} className="text-red-400 shrink-0" /><span className="text-[11px] font-black uppercase tracking-wider text-red-400">Incorrect</span></>
                                )}
                              </div>
                              <div className="text-sm leading-relaxed" style={{ color: c.textSec }}><AIContent content={currentQuestion.explanation} /></div>
                              {currentQuestion.follow_up && (
                                <div className="pt-2 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                                  <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: c.amber }}>
                                    <Lightbulb size={10} /> Strong Interview Answer
                                  </span>
                                  <div className="text-xs leading-relaxed italic" style={{ color: c.textMuted }}><AIContent content={currentQuestion.follow_up} /></div>
                                </div>
                              )}
                            </motion.div>

                            {/* Next / Results button */}
                            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                              onClick={handleNext}
                              className="w-full mt-3 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all"
                              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                              {isLastQuestion ? <>See Results <Trophy size={16} /></> : <>Next Question <ArrowRight size={16} /></>}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit button (shown before submit) */}
                    {!isSubmitted && (
                      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        disabled={!selectedOption}
                        onClick={handleSubmit}
                        className="w-full mt-4 py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                        <CheckCircle size={16} /> Submit Answer
                      </motion.button>
                    )}
                  </motion.div>

                  {/* Question dots progress */}
                  <div className="flex items-center justify-center gap-1.5 pt-3">
                    {quizData.questions.map((q, i) => {
                      const isCur = i === currentIndex;
                      const isSubmittedQ = !!submittedQuestions[i];
                      const isCorrectQ = isSubmittedQ && userAnswers[i] === q.correct_answer;
                      return (
                        <div key={i} className="rounded-full transition-all duration-300"
                          style={{
                            width: isCur ? 20 : 6,
                            height: 6,
                            background: isCur ? accent.text + "bb" : isSubmittedQ ? (isCorrectQ ? c.green + "88" : c.red + "88") : "#3f3f46",
                          }}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ── RESULTS PHASE ── */}
          {phase === "results" && quizResult && quizData && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, type: "spring", stiffness: 200, damping: 20 }}
              className="max-w-xl mx-auto space-y-5 sm:space-y-8 py-6">

              {/* Hero */}
              <motion.div className="p-5 rounded-2xl border relative overflow-hidden" style={{ background: c.surface, border: `1px solid ${accent.border}` }}>
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <div className="shrink-0"><ResponsiveScoreRing score={quizResult.score} mode={mode} /></div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest mb-2"
                        style={{ background: accent.bg, border: `1px solid ${accent.border}`, color: accent.text }}>
                        {MODES.find(m => m.key === mode)?.label} Quiz Complete
                      </span>
                    </motion.div>
                    <motion.h2 initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                      className="text-xl sm:text-3xl font-black" style={{ color: accent.text }}>
                      {quizResult.badge}
                    </motion.h2>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                      className="text-xs sm:text-sm" style={{ color: c.textMuted }}>
                      {getPerformanceLabel(quizResult.score).sub} — {quizResult.correctAnswers} of {quizResult.totalQuestions} correct
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { icon: <Target size={15} />, label: "Accuracy", value: quizResult.accuracy, color: accent.text, bg: accent.bg, border: accent.border, delay: 0.1 },
                  { icon: <CheckCircle size={15} />, label: "Correct", value: quizResult.correctAnswers, color: c.green, bg: c.greenBg, border: c.green, delay: 0.15 },
                  { icon: <Zap size={15} />, label: "XP Earned", value: `+${quizResult.xpEarned}`, color: c.amber, bg: c.amberBg, border: c.amberBorder, delay: 0.2 },
                  { icon: <Flame size={15} />, label: "Streak", value: "🔥 3", color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.2)", delay: 0.25 },
                ].map((stat) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: stat.delay, duration: 0.3 }}
                    className="flex flex-col items-center gap-1 p-3 sm:p-4 rounded-xl border text-center"
                    style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                    <span style={{ color: stat.color }} className="mb-0.5">{stat.icon}</span>
                    <span className="text-base sm:text-xl font-black" style={{ color: stat.color }}>{stat.value}</span>
                    <span className="text-[9px] font-mono uppercase tracking-widest leading-tight" style={{ color: "#71717a" }}>{stat.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* AI Insights */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-3 sm:space-y-4">
                <h3 className="text-xs uppercase font-black tracking-widest flex items-center gap-1.5" style={{ color: c.textMuted }}>
                  <TrendingUp size={12} style={{ color: accent.text }} /> AI Performance Insights
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 rounded-xl border space-y-3" style={{ border: `1px solid ${c.isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.3)"}`, background: c.isDark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.08)" }}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      <Star size={11} /> Your Strengths
                    </div>
                    <ul className="space-y-2">
                      {quizData.performance_insights_template.strengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: c.text }}>
                          <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />{s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl border space-y-3" style={{ border: `1px solid ${c.isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.3)"}`, background: c.isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.08)" }}>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={11} /> Areas to Review
                    </div>
                    <ul className="space-y-2">
                      {quizData.performance_insights_template.weak_areas.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: c.text }}>
                          <AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="p-4 rounded-xl border space-y-1.5" style={{ background: c.isDark ? accent.bg : "rgba(245,158,11,0.08)", border: `1px solid ${accent.border}` }}>
                  <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: accent.text }}>
                    <ArrowRight size={11} /> Recommended Next Step
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: c.text }}>{quizData.performance_insights_template.recommended_next_step}</p>
                </div>
              </motion.div>

              {/* Answer Review */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="space-y-3">
                <h3 className="text-xs uppercase font-black tracking-widest flex items-center gap-1.5" style={{ color: c.textMuted }}>
                  <BookOpen size={12} style={{ color: accent.text }} /> Question Review
                </h3>
                <div className="space-y-2">
                  {quizResult.answers.map((ans, i) => {
                    const q = quizData.questions[i];
                    if (!q) return null;
                    return (
                      <AnswerRow key={i} index={i} question={q.question}
                        selected={ans.selectedOption} correct={q.correct_answer}
                        isCorrect={ans.isCorrect} explanation={q.explanation} />
                    );
                  })}
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleRetry}
                  className="py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
                  <RotateCcw size={15} /> Retry Quiz
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    const topicToLearn = quizData?.topic || topic;
                    if (topicToLearn) {
                      try {
                        localStorage.setItem("adyapan-study-topic", topicToLearn);
                      } catch { /* ignore */ }
                    }
                    if (onViewTool) {
                      onViewTool("study-assistant");
                    } else {
                      const url = new URL(window.location.href);
                      url.searchParams.set("view", "study-assistant");
                      if (topicToLearn) {
                        url.searchParams.set("studyMode", "topic");
                        url.searchParams.set("topic", encodeURIComponent(topicToLearn));
                      }
                      router.push(url.pathname + url.search);
                    }
                  }}
                  className="py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background: accent.bg, border: `1px solid ${accent.border}`, color: accent.text }}>
                  <BookOpen size={15} /> Learn More
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleNewQuiz}
                  className="py-2.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                  <Plus size={15} /> New Quiz
                </motion.button>
              </motion.div>

            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

