"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Code2,
  Check,
  Sparkles,
  Terminal,
  Cpu,
  Mic,
  BarChart3,
  Rocket,
  FileText,
} from "lucide-react";

interface TechnicalLoadingProps {
  config: {
    topic: string;
    role: string;
    company: string;
    difficulty: string;
    codingLanguage: string;
    aiVoiceEnabled: boolean;
    resumeAware: boolean;
  };
  onComplete: () => void;
  theme?: string;
}

export const TechnicalLoading: React.FC<TechnicalLoadingProps> = ({
  config,
  onComplete,
  theme: propTheme,
}) => {
  const theme =
    propTheme ||
    (typeof window !== "undefined"
      ? localStorage.getItem("adyapan-theme") || "dark"
      : "dark");
  const [currentStep, setCurrentStep] = useState(-1);
  const [allComplete, setAllComplete] = useState(false);
  const [, setProgress] = useState(0);

  const isDark = theme === "dark";

  const steps = [
    {
      id: 0,
      label: "Preparing Technical Environment",
      description: `Setting up workspace for ${config.role}`,
      icon: <Sparkles className="w-4 h-4" />,
    },
    ...(config.resumeAware
      ? [
          {
            id: 1,
            label: "Loading Tech Stack & Resume",
            description: "Analyzing technical profile and resume highlights",
            icon: <FileText className="w-4 h-4" />,
          },
        ]
      : []),
    {
      id: config.resumeAware ? 2 : 1,
      label: "Configuring Code Workspace",
      description: `Initializing ${config.codingLanguage.toUpperCase()} compiler & editor`,
      icon: <Terminal className="w-4 h-4" />,
    },
    ...(config.aiVoiceEnabled
      ? [
          {
            id: config.resumeAware ? 3 : 2,
            label: "Configuring VAD Voice Engine",
            description: "Setting up real-time voice & speech recognition",
            icon: <Mic className="w-4 h-4" />,
          },
        ]
      : []),
    {
      id: config.resumeAware
        ? config.aiVoiceEnabled
          ? 4
          : 3
        : config.aiVoiceEnabled
        ? 3
        : 2,
      label: "Calibrating Problem Difficulty",
      description: `Adjusting ${config.difficulty.toUpperCase()} questions for ${config.topic}`,
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: config.resumeAware
        ? config.aiVoiceEnabled
          ? 5
          : 4
        : config.aiVoiceEnabled
        ? 4
        : 3,
      label: "Starting Session",
      description: "AI Technical Recruiter connected",
      icon: <Rocket className="w-4 h-4" />,
    },
  ];

  const totalSteps = steps.length;

  useEffect(() => {
    if (currentStep >= totalSteps) {
      setAllComplete(true);
      const t = setTimeout(() => onComplete(), 1000);
      return () => clearTimeout(t);
    }

    if (currentStep < 0) {
      const t = setTimeout(() => setCurrentStep(0), 300);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setCurrentStep(totalSteps);
      }
    }, 1200);

    return () => clearTimeout(t);
  }, [currentStep, totalSteps, onComplete]);

  useEffect(() => {
    if (currentStep < 0) {
      setProgress(0);
      return;
    }
    const pct = Math.min(((currentStep + 1) / totalSteps) * 100, 100);
    setProgress(pct);
  }, [currentStep, totalSteps]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden z-50"
      style={{
        fontFamily: "var(--font-sans)",
        background: isDark ? "#080710" : "#f9fafb",
      }}
    >
      {/* Ambient background glows */}
      <div
        className="absolute rounded-full blur-[120px] opacity-30"
        style={{
          width: 500,
          height: 500,
          top: "15%",
          left: "20%",
          background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full blur-[100px] opacity-20"
        style={{
          width: 400,
          height: 400,
          bottom: "10%",
          right: "15%",
          background: "radial-gradient(circle, #0284c7 0%, transparent 70%)",
        }}
      />

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6">
        {/* Animated Icon Container */}
        <motion.div
          className="relative mb-8"
          animate={
            allComplete
              ? { scale: [1, 1.15, 1] }
              : { scale: [1, 1.06, 1] }
          }
          transition={
            allComplete
              ? { duration: 0.5, ease: "easeInOut" }
              : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{
              background: isDark
                ? "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)"
                : "linear-gradient(135deg, #6d28d9 0%, #0284c7 100%)",
              boxShadow: "0 0 50px rgba(124, 58, 237, 0.4)",
            }}
          >
            {allComplete ? (
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            ) : (
              <Code2 className="w-10 h-10 text-white" />
            )}
          </div>

          {!allComplete && (
            <motion.div
              className="absolute -inset-3 rounded-[28px] border-2 border-transparent"
              style={{
                borderTopColor: "#a855f7",
                borderRightColor: "rgba(168, 85, 247, 0.3)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          className={`text-2xl font-extrabold mb-2 ${
            isDark ? "text-white" : "text-slate-900"
          }`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {allComplete
            ? "Technical Workspace Ready!"
            : "Initializing AI Technical Recruiter"}
        </motion.h1>

        <p
          className={`text-xs mb-6 font-medium ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {allComplete
            ? "Launching your coding workspace and live interviewer"
            : "Setting up real-time compiler, speech recognition & proctoring"}
        </p>

        {/* Config Badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
              isDark
                ? "bg-slate-900 border-slate-800 text-purple-300"
                : "bg-white border-slate-200 text-purple-700 shadow-sm"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{config.role}</span>
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
              isDark
                ? "bg-slate-900 border-slate-800 text-cyan-300"
                : "bg-white border-slate-200 text-cyan-700 shadow-sm"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{config.codingLanguage.toUpperCase()}</span>
          </span>
          {config.company && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-amber-300"
                  : "bg-white border-slate-200 text-amber-700 shadow-sm"
              }`}
            >
              {config.company}
            </span>
          )}
        </div>

        {/* Step Progress Checklist */}
        <div className="w-full space-y-2.5">
          {steps.map((step, index) => {
            const isFinished = currentStep > index || allComplete;
            const isCurrent = currentStep === index && !allComplete;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center p-3 rounded-2xl border transition-all ${
                  isFinished
                    ? isDark
                      ? "bg-purple-950/20 border-purple-800/40 text-purple-200"
                      : "bg-purple-50 border-purple-200 text-purple-900"
                    : isCurrent
                    ? isDark
                      ? "bg-slate-900 border-purple-500/50 text-white shadow-md shadow-purple-950/50"
                      : "bg-white border-purple-400 text-slate-900 shadow-md"
                    : isDark
                    ? "bg-slate-950/40 border-slate-900 text-slate-600 opacity-40"
                    : "bg-slate-100/60 border-slate-200 text-slate-400 opacity-50"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center mr-3 shrink-0 text-xs font-bold ${
                    isFinished
                      ? "bg-purple-600 text-white"
                      : isCurrent
                      ? "bg-purple-500 text-white animate-pulse"
                      : isDark
                      ? "bg-slate-800 text-slate-500"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isFinished ? <Check className="w-4 h-4 stroke-[3]" /> : step.icon}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-bold truncate">{step.label}</div>
                  <div
                    className={`text-[10px] truncate ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {step.description}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TechnicalLoading;
