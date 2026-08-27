"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check, AlertTriangle, X, Info, Trophy, Zap, RefreshCw, Volume2 } from "lucide-react";
import CountUp from "react-countup";
import confetti from "canvas-confetti";
import { cn } from "@/lib/cn";

// ─── Play Hover Sound Readiness Hook ──────────────────────────────────────
export function useHoverSound() {
  const playSound = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch (e) {
        // AudioContext blocked
      }
    }
  }, []);

  return playSound;
}

// ─── Floating Orbs background ─────────────────────────────────────────────
export function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        className="absolute top-[-10%] left-[10%] w-[380px] h-[380px] rounded-full bg-amber-500/10 blur-[130px] dark:bg-amber-500/5 animate-pulse"
        animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[20%] right-[10%] w-[420px] h-[420px] rounded-full bg-orange-500/10 blur-[150px] dark:bg-orange-500/5 animate-pulse"
        animate={{ scale: [1, 1.15, 1], x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <motion.div
        className="absolute top-[40%] left-[50%] w-[250px] h-[250px] rounded-full bg-purple-500/5 blur-[100px]"
        animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
    </div>
  );
}

// ─── Premium Card ─────────────────────────────────────────────────────────
interface PremiumCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onDragOver" | "onDragLeave" | "onDrop" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"> {
  children: React.ReactNode;
  tilt?: boolean;
  glow?: boolean;
  variant?: "glass" | "bordered" | "interactive";
}


export function PremiumCard({
  children,
  tilt = false,
  glow = true,
  variant = "glass",
  className,
  ...props
}: PremiumCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const playHoverSound = useHoverSound();
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!tilt || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateY(x * 10);
    setRotateX(-y * 10);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={playHoverSound}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      transition={{ type: "spring", stiffness: 220, damping: 20 }}
      className={cn(
        "relative rounded-2xl transition-all duration-300 border backdrop-blur-md overflow-hidden",
        variant === "glass" &&
          "bg-white/70 border-black/5 dark:bg-white/[0.025] dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] dark:shadow-none hover:bg-white/80 dark:hover:bg-white/[0.04]",
        variant === "bordered" &&
          "bg-white border-amber-500/20 dark:bg-black/40 dark:border-amber-500/10 shadow-sm dark:shadow-[0_0_20px_rgba(0,0,0,0.3)]",
        variant === "interactive" &&
          "bg-white/60 border-black/8 hover:border-amber-500/30 dark:bg-white/[0.02] dark:border-white/8 dark:hover:border-amber-500/20 cursor-pointer shadow-md dark:shadow-none hover:shadow-lg hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {glow && (
        <div className="absolute -inset-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06)_0%,transparent_60%)]" />
      )}
      <div className="relative z-10 w-full h-full">{children}</div>
    </motion.div>
  );
}

// ─── Premium Button ───────────────────────────────────────────────────────
interface PremiumButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onDragOver" | "onDragLeave" | "onDrop" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "glow" | "ghost";
  loading?: boolean;
  icon?: React.ReactNode;
}


export function PremiumButton({
  children,
  variant = "primary",
  loading = false,
  icon,
  className,
  ...props
}: PremiumButtonProps) {
  const playHoverSound = useHoverSound();

  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={playHoverSound}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold tracking-wide transition-all shadow-md active:shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none",
        variant === "primary" &&
          "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-amber-500/15 border border-amber-400/20",
        variant === "secondary" &&
          "bg-slate-100 border border-slate-200/80 hover:bg-slate-200 dark:bg-white/[0.05] dark:border-white/10 dark:hover:bg-white/[0.08] text-slate-700 dark:text-gray-100",
        variant === "glow" &&
          "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] font-extrabold",
        variant === "ghost" &&
          "bg-transparent text-slate-600 hover:text-slate-800 dark:text-gray-400 dark:hover:text-gray-200 border border-transparent hover:bg-white/5",
        className
      )}
      {...props}
    >
      {loading ? (
        <RefreshCw size={14} className="animate-spin text-current animate-duration-1000" />
      ) : (
        icon && <span className="flex shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </motion.button>
  );
}

// ─── Premium Badge ────────────────────────────────────────────────────────
export function PremiumBadge({
  children,
  variant = "amber",
  pulse = false,
  className,
}: {
  children: React.ReactNode;
  variant?: "amber" | "green" | "purple" | "rose" | "cyan";
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0",
        variant === "amber" &&
          "bg-amber-500/8 text-amber-500 border-amber-500/20 dark:bg-amber-500/10 dark:border-amber-500/30",
        variant === "green" &&
          "bg-emerald-500/8 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/10 dark:border-emerald-500/30",
        variant === "purple" &&
          "bg-purple-500/8 text-purple-500 border-purple-500/20 dark:bg-purple-500/10 dark:border-purple-500/30",
        variant === "rose" &&
          "bg-rose-500/8 text-rose-500 border-rose-500/20 dark:bg-rose-500/10 dark:border-rose-500/30",
        variant === "cyan" &&
          "bg-cyan-500/8 text-cyan-500 border-cyan-500/20 dark:bg-cyan-500/10 dark:border-cyan-500/30",
        className
      )}
    >
      {pulse && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            variant === "amber" && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
            variant === "green" && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
            variant === "purple" && "bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]",
            variant === "rose" && "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
            variant === "cyan" && "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"
          )}
        />
      )}
      {children}
    </span>
  );
}

// ─── Premium Input ────────────────────────────────────────────────────────
interface PremiumInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function PremiumInput({ label, error, icon, className, ...props }: PremiumInputProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-[11px] font-bold text-slate-700 dark:text-gray-400 uppercase tracking-wider pl-1">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 text-slate-500 dark:text-gray-500 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          className={cn(
            "w-full text-xs rounded-xl px-4 py-3 bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-black/5 focus:border-amber-500/40 outline-none text-slate-800 dark:text-gray-100 dark:bg-black/35 dark:hover:bg-black/50 dark:focus:bg-black/60 dark:border-white/5 dark:focus:border-amber-500/35 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]",
            icon && "pl-10",
            error && "border-rose-500/50 dark:border-rose-500/40 focus:border-rose-500",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] text-rose-500 pl-1 flex items-center gap-1 font-medium">
          <AlertTriangle size={10} /> {error}
        </span>
      )}
    </div>
  );
}

// ─── Premium Dialog ───────────────────────────────────────────────────────
export function PremiumDialog({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-[6px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-lg rounded-2xl border bg-white border-black/5 dark:bg-[#0c0d16] dark:border-white/8 shadow-2xl p-6 relative overflow-hidden",
              className
            )}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold tracking-wide text-slate-800 dark:text-gray-100">{title}</h3>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-gray-200 transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
              >
                <X size={15} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Premium Tabs ─────────────────────────────────────────────────────────
export function PremiumTabs<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; icon?: React.ReactNode }[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex p-1 bg-slate-200/50 dark:bg-black/40 border border-black/5 dark:border-white/5 rounded-xl gap-0.5", className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer select-none outline-none",
              isActive ? "text-amber-500 dark:text-amber-400" : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute inset-0 bg-white dark:bg-[#151722] border border-black/5 dark:border-white/5 rounded-lg shadow-sm"
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Premium Progress Ring ────────────────────────────────────────────────
export function PremiumProgressRing({
  value,
  size = 72,
  strokeWidth = 6,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-neutral-800"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="url(#progress-ring-gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="progress-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center flex flex-col items-center justify-center">
        <span className="text-[11px] font-extrabold tracking-tighter text-slate-800 dark:text-gray-100">
          <CountUp end={value} duration={1.5} suffix="%" />
        </span>
      </div>
    </div>
  );
}

// ─── Premium Progress Bar ─────────────────────────────────────────────────
export function PremiumProgressBar({
  value,
  color = "amber",
  height = 6,
  className,
}: {
  value: number;
  color?: "amber" | "green" | "rose" | "purple";
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full bg-slate-200 dark:bg-neutral-800/80 rounded-full overflow-hidden relative", className)} style={{ height }}>
      <motion.div
        className={cn(
          "h-full rounded-full relative",
          color === "amber" && "bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
          color === "green" && "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
          color === "rose" && "bg-gradient-to-r from-rose-500 to-pink-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]",
          color === "purple" && "bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.3)]"
        )}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-[pulse_2s_infinite]" />
      </motion.div>
    </div>
  );
}

// ─── Animated Skeleton ────────────────────────────────────────────────────
export function AnimatedSkeleton({ className, type = "card" }: { className?: string; type?: "card" | "line" | "circle" }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-200/50 dark:bg-white/[0.025] animate-pulse border border-black/5 dark:border-white/5",
        type === "card" && "rounded-2xl min-h-[160px] p-5 flex flex-col justify-between",
        type === "line" && "h-3 rounded-md w-full",
        type === "circle" && "rounded-full w-12 h-12 shrink-0",
        className
      )}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent dark:via-white/[0.015]" />
      {type === "card" && (
        <>
          <div className="h-4 w-1/3 bg-slate-300/60 dark:bg-white/[0.04] rounded" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-300/40 dark:bg-white/[0.03] rounded" />
            <div className="h-3 w-5/6 bg-slate-300/40 dark:bg-white/[0.03] rounded" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── AI Thinking screen ───────────────────────────────────────────────────
export function AIThinkingScreen({
  steps = [
    "Analyzing Document Context",
    "Extracting Concepts and Entities",
    "Structuring Custom Learning Graph",
    "Generating Interactive Content",
    "Polishing Visual Worksheets"
  ],
  currentStep = 0,
  title = "AI Engine is Synthesizing Insights...",
  subtitle = "Structuring cognitive parameters dynamically",
}: {
  steps?: string[];
  currentStep: number;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px] relative overflow-hidden bg-slate-50/50 border border-black/5 dark:bg-[#070912]/80 dark:border-white/5 rounded-2xl w-full">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/10 dark:bg-amber-500/5 blur-[90px] rounded-full pointer-events-none" />

      <div className="relative mb-8">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.25)]"
        >
          <Sparkles className="w-7 h-7 text-amber-500 animate-pulse" />
        </motion.div>
        <span className="absolute -inset-1 rounded-full border border-amber-500/20 animate-ping opacity-45" />
      </div>

      <h3 className="text-base font-extrabold text-slate-800 dark:text-gray-100 mb-1">{title}</h3>
      <p className="text-[10px] font-mono text-slate-400 dark:text-gray-500 uppercase tracking-widest mb-8">{subtitle}</p>

      <div className="w-full max-w-sm text-left bg-white/70 dark:bg-black/30 p-5 rounded-2xl border border-black/5 dark:border-white/5 backdrop-blur-md shadow-sm space-y-4">
        {steps.map((step, idx) => {
          const isDone = currentStep > idx;
          const isActive = currentStep === idx;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex items-center gap-3"
            >
              <div className="flex shrink-0">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0.7 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500"
                  >
                    <Check size={11} strokeWidth={3} />
                  </motion.div>
                ) : isActive ? (
                  <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-500 animate-spin">
                    <RefreshCw size={10} />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-black/5 dark:bg-neutral-800 dark:border-white/5 text-[9px] font-bold text-slate-400 dark:text-gray-500 flex items-center justify-center">
                    {idx + 1}
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-xs transition-colors duration-300",
                  isDone && "text-emerald-500/90 line-through dark:text-emerald-500/70",
                  isActive && "text-amber-500 font-bold",
                  !isDone && !isActive && "text-slate-400 dark:text-gray-500"
                )}
              >
                {step}
              </span>
            </motion.div>
          );
        })}
      </div>

      <div className="w-full max-w-sm mt-5">
        <PremiumProgressBar value={Math.min(100, Math.round((currentStep / steps.length) * 100))} color="amber" height={5} />
      </div>
    </div>
  );
}

// ─── Empty State Component ────────────────────────────────────────────────
export function EmptyState({
  title = "No study material found",
  description = "Upload your study notes, guides, or textbook files to activate AI diagnostics.",
  illustration,
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  illustration?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-black/8 dark:border-white/10 rounded-2xl min-h-[300px] bg-slate-50/40 dark:bg-white/[0.015] backdrop-blur-sm w-full">
      <div className="mb-6 relative text-amber-500/80">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-md"
        >
          {illustration || <Trophy className="w-8 h-8" />}
        </motion.div>
        <div className="absolute top-0 left-0 w-2 h-2 bg-amber-500 rounded-full blur-[2px] animate-ping opacity-35" />
      </div>

      <h4 className="text-sm font-bold text-slate-800 dark:text-gray-200 mb-1.5">{title}</h4>
      <p className="text-[11px] text-slate-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">{description}</p>

      {actionLabel && onAction && (
        <PremiumButton variant="primary" onClick={onAction}>
          {actionLabel}
        </PremiumButton>
      )}
    </div>
  );
}

// ─── Success Celebration Overlay / Popup ──────────────────────────────────
export function SuccessCelebration({
  open,
  onClose,
  title = "Mission Accomplished!",
  description = "Your new learning target has been updated and structured successfully.",
  badgeName,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  badgeName?: string;
}) {
  useEffect(() => {
    if (open) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f59e0b", "#ea580c", "#fbbf24"],
        });
      } catch (e) {
        // Confetti blocked
      }
    }
  }, [open]);

  return (
    <PremiumDialog open={open} onClose={onClose} title="Success Celebration">
      <div className="flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.3, rotate: -30 }}
          animate={{ scale: [1, 1.15, 1], rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 mb-6 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
        >
          <Check size={28} strokeWidth={4} />
        </motion.div>

        <h3 className="text-base font-extrabold text-slate-800 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 mb-6 leading-relaxed max-w-xs">{description}</p>

        {badgeName && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-center gap-3.5 mb-8 w-full max-w-xs justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <Trophy className="w-8 h-8 text-amber-500 animate-bounce shrink-0" />
            <div className="text-left">
              <span className="block text-[9px] uppercase tracking-wider font-extrabold text-amber-500">Badge Unlocked</span>
              <span className="block text-xs font-bold text-slate-800 dark:text-white">{badgeName}</span>
            </div>
          </div>
        )}

        <PremiumButton variant="primary" onClick={onClose} className="w-full max-w-xs">
          Continue
        </PremiumButton>
      </div>
    </PremiumDialog>
  );
}

// ─── Settings Toggle ─────────────────────────────────────────────────────
export function SettingsToggle({
  enabled,
  onToggle,
  label,
  description,
  icon,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 min-w-0">
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 dark:bg-white/5 dark:border-white/5 flex items-center justify-center text-amber-500 shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <span className="text-xs font-bold block dark:text-gray-100">{label}</span>
          {description && (
            <span className="text-[10px] dark:text-gray-500 block mt-0.5">{description}</span>
          )}
        </div>
      </div>
      <motion.button
        onClick={onToggle}
        whileTap={{ scale: 0.9 }}
        className="relative shrink-0 cursor-pointer"
        style={{ width: 40, height: 22 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            background: enabled
              ? "linear-gradient(135deg, #f59e0b, #ea580c)"
              : "rgba(255,255,255,0.1)",
            boxShadow: enabled
              ? "0 0 12px rgba(245,158,11,0.35)"
              : "none",
          }}
          transition={{ duration: 0.2 }}
        />
        <motion.div
          className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: enabled ? 21 : 3 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        />
      </motion.button>
    </div>
  );
}

// ─── Settings Select ─────────────────────────────────────────────────────
export function SettingsSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-wider dark:text-gray-400 flex items-center gap-1.5 pl-1">
        {icon}
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-xs rounded-xl px-4 py-2.5 bg-black/35 dark:bg-black/35 border border-white/5 dark:border-white/5 text-gray-100 dark:text-gray-100 outline-none focus:border-amber-500/40 transition-all cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Error State Overlay / Alert ──────────────────────────────────────────
export function ErrorState({
  title = "Something went sideways",
  description = "Our server could not compile this data right now. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/15 flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-6 shadow-sm w-full">
      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 text-center sm:text-left space-y-1.5">
        <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200">{title}</h4>
        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-gray-400">{description}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 outline-none mt-2 cursor-pointer transition-colors"
          >
            <RefreshCw size={11} /> Retry Request
          </button>
        )}
      </div>
    </div>
  );
}
