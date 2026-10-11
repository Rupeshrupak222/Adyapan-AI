"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, CheckCircle2, AlertTriangle, Sparkles, RefreshCw,
  Trophy, Rocket, Terminal, BookOpen, Target, ArrowRight,
  ClipboardCheck, Zap, BrainCircuit, Lightbulb, Flame
} from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "@/lib/cn";

// ─── Shared Motion Variants ────────────────────────────────────────────────

export const codingFadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
  }),
};

export const codingScaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.35 }
  }),
};

export const codingSlideRight = {
  hidden: { opacity: 0, x: -20 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.05, duration: 0.4 }
  }),
};

// ─── Empty State Library ───────────────────────────────────────────────────

interface CodingEmptyStateProps {
  type: "questions" | "challenges" | "roadmap" | "workspace" | "dashboard" | "reviews" | "history" | "search";
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EMPTY_STATE_CONFIG = {
  questions: {
    icon: BookOpen,
    title: "No problems loaded yet",
    description: "Your question bank is being prepared. Start solving to build your coding foundation.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-500",
  },
  challenges: {
    icon: Trophy,
    title: "No active challenges",
    description: "Weekly coding challenges will appear here. Compete with peers and earn XP!",
    gradient: "from-purple-500/10 to-violet-500/10",
    iconBg: "bg-purple-500/10 border-purple-500/20",
    iconColor: "text-purple-500",
  },
  roadmap: {
    icon: Rocket,
    title: "No roadmap generated yet",
    description: "Create your personalized AI-powered learning roadmap to get started.",
    gradient: "from-blue-500/10 to-indigo-500/10",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-blue-500",
  },
  workspace: {
    icon: Terminal,
    title: "Workspace is empty",
    description: "Select a problem to open your coding workspace with AI coaching and execution.",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-500",
  },
  dashboard: {
    icon: BrainCircuit,
    title: "Dashboard is warming up",
    description: "Start solving problems to unlock your coding analytics and AI insights.",
    gradient: "from-cyan-500/10 to-blue-500/10",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-500",
  },
  reviews: {
    icon: ClipboardCheck,
    title: "No code reviews yet",
    description: "Submit your code for AI review to get feedback on quality, efficiency, and best practices.",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-500",
  },
  history: {
    icon: Flame,
    title: "No execution history",
    description: "Run or submit your code to create execution snapshots and version history.",
    gradient: "from-orange-500/10 to-red-500/10",
    iconBg: "bg-orange-500/10 border-orange-500/20",
    iconColor: "text-orange-500",
  },
  search: {
    icon: Target,
    title: "No results found",
    description: "Try adjusting your search filters or browse all available problems.",
    gradient: "from-slate-500/10 to-zinc-500/10",
    iconBg: "bg-slate-500/10 border-slate-500/20",
    iconColor: "text-slate-500",
  },
};

export function CodingEmptyState({ type, title, description, actionLabel, onAction }: CodingEmptyStateProps) {
  const config = EMPTY_STATE_CONFIG[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center",
        "border border-dashed border-[var(--border-color)] rounded-2xl",
        "min-h-[280px] bg-gradient-to-br",
        config.gradient,
        "backdrop-blur-sm"
      )}
    >
      <div className="relative mb-6">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={cn(
            "w-16 h-16 rounded-2xl flex items-center justify-center border shadow-lg",
            config.iconBg
          )}
        >
          <Icon size={28} className={config.iconColor} />
        </motion.div>
        <motion.div
          className={cn("absolute -inset-1 rounded-2xl border opacity-20", config.iconBg)}
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.1, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>

      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2">{title || config.title}</h4>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed mb-6">
        {description || config.description}
      </p>

      {actionLabel && onAction && (
        <motion.button
          onClick={onAction}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold",
            "bg-gradient-to-r from-amber-500 to-orange-500 text-black",
            "shadow-lg shadow-amber-500/15 hover:shadow-amber-500/25 transition-all"
          )}
        >
          {actionLabel}
          <ArrowRight size={14} />
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── Success Celebration Library ───────────────────────────────────────────

interface CodingSuccessStateProps {
  type: "problem_solved" | "challenge_completed" | "milestone" | "streak" | "achievement" | "review_complete";
  title?: string;
  description?: string;
  xp?: number;
  badge?: string;
  onClose?: () => void;
}

const SUCCESS_CONFIG = {
  problem_solved: {
    icon: CheckCircle2,
    title: "Problem Solved!",
    description: "Excellent work! Your solution passed all test cases.",
    gradient: "from-emerald-500 to-teal-500",
    bgGradient: "from-emerald-500/10 to-teal-500/10",
  },
  challenge_completed: {
    icon: Trophy,
    title: "Challenge Completed!",
    description: "You conquered this coding challenge. Keep the momentum going!",
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-500/10 to-orange-500/10",
  },
  milestone: {
    icon: Rocket,
    title: "Milestone Achieved!",
    description: "You've reached a significant checkpoint in your learning journey.",
    gradient: "from-purple-500 to-violet-500",
    bgGradient: "from-purple-500/10 to-violet-500/10",
  },
  streak: {
    icon: Flame,
    title: "Streak Extended!",
    description: "Your consistency is building momentum. Keep coding daily!",
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-500/10 to-red-500/10",
  },
  achievement: {
    icon: Sparkles,
    title: "Achievement Unlocked!",
    description: "You've earned a new badge. Your hard work is paying off!",
    gradient: "from-cyan-500 to-blue-500",
    bgGradient: "from-cyan-500/10 to-blue-500/10",
  },
  review_complete: {
    icon: ClipboardCheck,
    title: "Review Complete!",
    description: "AI has analyzed your code. Check the insights below.",
    gradient: "from-violet-500 to-purple-500",
    bgGradient: "from-violet-500/10 to-purple-500/10",
  },
};

export function CodingSuccessState({ type, title, description, xp, badge, onClose }: CodingSuccessStateProps) {
  const config = SUCCESS_CONFIG[type];
  const Icon = config.icon;

  useEffect(() => {
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#ea580c", "#10b981", "#8b5cf6"],
      });
    } catch {}
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl",
        "border border-[var(--border-color)] bg-gradient-to-br",
        config.bgGradient
      )}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [1, 1.15, 1], rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg",
          "bg-gradient-to-br", config.gradient,
          type === "problem_solved" ? "shadow-emerald-500/30" :
          type === "challenge_completed" ? "shadow-amber-500/30" :
          "shadow-purple-500/30"
        )}
      >
        <Icon size={28} className="text-white" />
      </motion.div>

      <h3 className="text-lg font-black text-[var(--text-primary)] mb-1">
        {title || config.title}
      </h3>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm leading-relaxed mb-4">
        {description || config.description}
      </p>

      {xp && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4"
        >
          <Zap size={14} className="text-amber-500" />
          <span className="text-sm font-black text-amber-500">+{xp} XP</span>
        </motion.div>
      )}

      {badge && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4"
        >
          <Trophy size={20} className="text-amber-500" />
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500 block">Badge Unlocked</span>
            <span className="text-xs font-bold text-[var(--text-primary)]">{badge}</span>
          </div>
        </motion.div>
      )}

      {onClose && (
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/15"
        >
          Continue
        </motion.button>
      )}
    </motion.div>
  );
}

// ─── Execution Progress Steps ─────────────────────────────────────────────

interface ExecutionStepsProps {
  steps: string[];
  currentStep: number;
  isDark?: boolean;
}

export function ExecutionProgressSteps({ steps, currentStep, isDark = true }: ExecutionStepsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{
                scale: idx === currentStep ? [1, 1.2, 1] : 1,
              }}
              transition={{
                duration: 0.5,
                repeat: idx === currentStep ? Infinity : 0,
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                idx < currentStep && "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]",
                idx === currentStep && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
                idx > currentStep && (isDark ? "bg-white/10" : "bg-black/10")
              )}
            />
            {idx < steps.length - 1 && (
              <div className={cn(
                "w-6 h-0.5 rounded-full transition-all duration-500",
                idx < currentStep ? "bg-emerald-500/50" : isDark ? "bg-white/5" : "bg-black/5"
              )} />
            )}
          </div>
        ))}
      </div>
      <motion.span
        key={currentStep}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs font-bold text-amber-500"
      >
        {steps[Math.min(currentStep, steps.length - 1)]}
      </motion.span>
    </div>
  );
}

// ─── Run Button Component ─────────────────────────────────────────────────

interface RunButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: "run" | "submit" | "stop";
  size?: "sm" | "md";
}

export function RunButton({ onClick, disabled, loading, loadingText, variant = "run", size = "md" }: RunButtonProps) {
  const isSubmit = variant === "submit";

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled ? { scale: 1.02, y: -1 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-bold transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "px-3 py-1.5 text-[10px] rounded-lg" : "px-5 py-2.5 text-xs rounded-xl",
        isSubmit
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 border border-amber-400/20"
          : "bg-white/5 border border-white/10 text-slate-100 hover:bg-white/10 hover:border-white/20"
      )}
    >
      {loading ? (
        <>
          <RefreshCw size={size === "sm" ? 10 : 14} className="animate-spin" />
          <span>{loadingText || (isSubmit ? "Evaluating..." : "Running...")}</span>
        </>
      ) : (
        <>
          {isSubmit ? <Sparkles size={size === "sm" ? 10 : 14} /> : <Terminal size={size === "sm" ? 10 : 14} />}
          <span>{isSubmit ? "Submit" : "Run"}</span>
        </>
      )}
    </motion.button>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ReactNode;
  color: string;
  description?: string;
  index?: number;
}

export function CodingMetricCard({ label, value, suffix, icon, color, description, index = 0 }: MetricCardProps) {
  return (
    <motion.div
      custom={index}
      variants={codingFadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, scale: 1.01 }}
      className={cn(
        "p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]",
        "shadow-sm backdrop-blur-md flex flex-col justify-between min-h-[110px] group",
        "hover:border-amber-500/30 transition-all duration-300"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
          {label}
        </span>
        <span className={cn(color, "opacity-40 group-hover:opacity-80 transition-opacity")}>
          {icon}
        </span>
      </div>
      <div className="mt-3">
        <span className={cn("text-2xl font-black", color)}>
          {value}{suffix || ""}
        </span>
        {description && (
          <span className="text-[10px] text-[var(--text-secondary)]/80 font-medium block mt-1">
            {description}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Difficulty Badge ─────────────────────────────────────────────────────

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors: Record<string, string> = {
    Easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    Hard: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  return (
    <span className={cn(
      "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
      colors[difficulty] || colors.Easy
    )}>
      {difficulty}
    </span>
  );
}

// ─── XP Badge ─────────────────────────────────────────────────────────────

export function XPBadge({ xp, size = "sm" }: { xp: number; size?: "sm" | "md" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-black text-amber-500",
      size === "sm" ? "text-[10px]" : "text-xs"
    )}>
      <Zap size={size === "sm" ? 10 : 12} className="fill-amber-500" />
      {xp} XP
    </span>
  );
}

// ─── Timer Display ────────────────────────────────────────────────────────

export function TimerDisplay({ seconds, pulse = false }: { seconds: number; pulse?: boolean }) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const formatted = hrs > 0
    ? `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    : `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-mono text-xs font-bold",
      pulse ? "text-red-400" : "text-[var(--text-secondary)]"
    )}>
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#f43f5e]" />
      )}
      {formatted}
    </span>
  );
}

// ─── Code Step Progress ───────────────────────────────────────────────────

interface CodeStepProgressProps {
  steps: string[];
  currentStep: number;
  status?: "running" | "passed" | "failed" | null;
}

export function CodeStepProgress({ steps, currentStep, status }: CodeStepProgressProps) {
  return (
    <div className="flex items-center gap-1.5 bg-black/20 dark:bg-white/5 border border-[var(--border-color)] px-3 py-2 rounded-xl">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: idx === currentStep ? [1, 1.15, 1] : 1 }}
            transition={{ duration: 0.5, repeat: idx === currentStep && status === "running" ? Infinity : 0 }}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              idx < currentStep && "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]",
              idx === currentStep && status === "running" && "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]",
              idx === currentStep && status === "passed" && "bg-emerald-500",
              idx === currentStep && status === "failed" && "bg-rose-500",
              idx > currentStep && "bg-white/8 dark:bg-white/5"
            )}
          />
          {idx < steps.length - 1 && (
            <div className={cn(
              "w-4 h-0.5 rounded-full transition-all",
              idx < currentStep ? "bg-emerald-500/40" : "bg-white/5 dark:bg-white/5"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Glow Card Wrapper ────────────────────────────────────────────────────

export function GlowCard({
  children,
  className,
  glowColor = "amber",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "amber" | "purple" | "emerald" | "blue" | "rose";
}) {
  const glowColors = {
    amber: "hover:shadow-[0_0_30px_rgba(245,158,11,0.08)]",
    purple: "hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]",
    emerald: "hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]",
    blue: "hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]",
    rose: "hover:shadow-[0_0_30px_rgba(244,63,94,0.08)]",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]",
        "transition-all duration-300",
        glowColors[glowColor],
        className
      )}
    >
      {children}
    </motion.div>
  );
}
