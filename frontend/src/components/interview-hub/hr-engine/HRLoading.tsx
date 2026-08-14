"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Target, Brain, Mic, Sparkles, Check, Loader2,
} from "lucide-react";
import type { HRConfig } from "./HRTypes";

interface HRLoadingProps {
  config: HRConfig;
  onComplete: () => void;
  theme?: string;
}

const LOADING_STEPS = [
  { label: "Reading Resume", icon: FileText, detail: "Analyzing your background and experience" },
  { label: "Understanding Career Goals", icon: Target, detail: "Mapping your aspirations to the role" },
  { label: "Preparing HR Questions", icon: Brain, detail: "Generating personalized behavioral questions" },
  { label: "Configuring Voice", icon: Mic, detail: "Setting up interview voice preferences" },
  { label: "Initializing Interview", icon: Sparkles, detail: "Everything is ready" },
];

export default function HRLoading({ config, onComplete, theme: propTheme }: HRLoadingProps) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const isDark = theme === "dark";

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    LOADING_STEPS.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setActiveStep(i);
          if (i > 0) setCompletedSteps((prev) => [...prev, i - 1]);
        }, i * 900)
      );
    });
    timers.push(
      setTimeout(() => {
        setCompletedSteps((prev) => [...prev, LOADING_STEPS.length - 1]);
        onComplete();
      }, LOADING_STEPS.length * 900 + 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: isDark
          ? "radial-gradient(ellipse at center, rgba(245,158,11,0.05) 0%, #080710 70%)"
          : "radial-gradient(ellipse at center, rgba(245,158,11,0.03) 0%, #f9fafb 70%)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-3">
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles size={28} className="text-black" />
          </motion.div>
          <h2 className="text-xl font-extrabold" style={{ color: isDark ? "#fff" : "#111827" }}>
            Preparing Your HR Interview
          </h2>
          <p className="text-xs" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
            {config.targetCompany
              ? `Tailoring questions for ${config.targetCompany}`
              : "Generating personalized behavioral questions"}
          </p>
        </div>

        <div className="space-y-3">
          {LOADING_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = i === activeStep;
            const isCompleted = completedSteps.includes(i);

            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
                style={{
                  background: isActive
                    ? "rgba(245,158,11,0.08)"
                    : isCompleted
                      ? "rgba(16,185,129,0.05)"
                      : isDark
                        ? "rgba(255,255,255,0.02)"
                        : "#ffffff",
                  borderColor: isActive
                    ? "rgba(245,158,11,0.3)"
                    : isCompleted
                      ? "rgba(16,185,129,0.2)"
                      : isDark
                        ? "rgba(255,255,255,0.06)"
                        : "#e5e7eb",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: isCompleted
                      ? "rgba(16,185,129,0.15)"
                      : isActive
                        ? "rgba(245,158,11,0.15)"
                        : isDark
                          ? "rgba(255,255,255,0.04)"
                          : "#f3f4f6",
                  }}
                >
                  {isCompleted ? (
                    <Check size={18} className="text-emerald-400" />
                  ) : isActive ? (
                    <Loader2 size={18} className="text-amber-500 animate-spin" />
                  ) : (
                    <Icon size={18} style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-xs font-bold"
                    style={{
                      color: isCompleted
                        ? "#34d399"
                        : isActive
                          ? "#f59e0b"
                          : isDark
                            ? "rgba(255,255,255,0.3)"
                            : "#9ca3af",
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    className="text-[10px] mt-0.5"
                    style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#9ca3af" }}
                  >
                    {step.detail}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
