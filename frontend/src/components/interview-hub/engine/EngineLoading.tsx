"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Check,
  Sparkles,
  Briefcase,
  Building2,
  Mic,
  BarChart3,
  Play,
  Rocket,
  FileText,
} from "lucide-react";

interface EngineLoadingProps {
  config: {
    interviewType: string;
    targetRole: string;
    targetCompany: string;
    difficulty: string;
    aiVoiceEnabled: boolean;
    resumeAware: boolean;
  };
  onComplete: () => void;
  theme?: string;
}

const EngineLoading: React.FC<EngineLoadingProps> = ({ config, onComplete, theme: propTheme }) => {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [currentStep, setCurrentStep] = useState(-1);
  const [allComplete, setAllComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  const isDark = theme === "dark";

  const steps = [
    {
      id: 0,
      label: "Preparing Interview Environment",
      description: "Setting up your personalized interview session",
      icon: <Sparkles className="w-4 h-4" />,
    },
    ...(config.resumeAware
      ? [
          {
            id: 1,
            label: "Loading Resume Context",
            description: "Analyzing your resume, projects, and experience",
            icon: <FileText className="w-4 h-4" />,
          },
        ]
      : []),
    {
      id: config.resumeAware ? 2 : 1,
      label: "Generating Smart Questions",
      description: "Creating personalized questions based on your profile",
      icon: <Brain className="w-4 h-4" />,
    },
    ...(config.aiVoiceEnabled
      ? [
          {
            id: config.resumeAware ? 3 : 2,
            label: "Configuring AI Voice",
            description: "Setting up natural voice interaction",
            icon: <Mic className="w-4 h-4" />,
          },
        ]
      : []),
    {
      id: config.resumeAware ? (config.aiVoiceEnabled ? 4 : 3) : (config.aiVoiceEnabled ? 3 : 2),
      label: "Calibrating Difficulty",
      description: "Adjusting to your experience level and target role",
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: config.resumeAware ? (config.aiVoiceEnabled ? 5 : 4) : (config.aiVoiceEnabled ? 4 : 3),
      label: "Starting Session",
      description: "All systems ready",
      icon: <Rocket className="w-4 h-4" />,
    },
  ];

  const totalSteps = steps.length;

  useEffect(() => {
    if (currentStep >= totalSteps) {
      setAllComplete(true);
      const t = setTimeout(() => onComplete(), 1200);
      return () => clearTimeout(t);
    }

    if (currentStep < 0) {
      const t = setTimeout(() => setCurrentStep(0), 400);
      return () => clearTimeout(t);
    }

    const t = setTimeout(() => {
      if (currentStep < totalSteps - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setCurrentStep(totalSteps);
      }
    }, 1500);

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

  const difficultyLabel =
    config.difficulty === "easy"
      ? "Beginner"
      : config.difficulty === "medium"
        ? "Intermediate"
        : config.difficulty === "hard"
          ? "Advanced"
          : "Expert";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{
        fontFamily: "var(--font-sans)",
        background: isDark ? "#080710" : "#f9fafb",
      }}
    >
      {/* Ambient glow orbs */}
      <div
        className="absolute rounded-full blur-[120px] opacity-30"
        style={{
          width: 500,
          height: 500,
          top: "15%",
          left: "20%",
          background: "radial-gradient(circle, #6d28d9 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full blur-[100px] opacity-20"
        style={{
          width: 400,
          height: 400,
          bottom: "10%",
          right: "15%",
          background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full blur-[80px] opacity-15"
        style={{
          width: 300,
          height: 300,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full px-6">
        {/* Brain icon */}
        <motion.div
          className="relative mb-8"
          animate={
            allComplete
              ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
              : { scale: [1, 1.08, 1] }
          }
          transition={
            allComplete
              ? { duration: 0.6, ease: "easeInOut" }
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: isDark
                ? "linear-gradient(135deg, #6d28d9 0%, #3b82f6 100%)"
                : "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
              boxShadow: allComplete
                ? "0 0 60px rgba(109, 40, 217, 0.6), 0 0 120px rgba(59, 130, 246, 0.3)"
                : "0 0 40px rgba(109, 40, 217, 0.4), 0 0 80px rgba(59, 130, 246, 0.2)",
            }}
          >
            {allComplete ? (
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            ) : (
              <Brain className="w-10 h-10 text-white" />
            )}
          </div>

          {/* Rotating ring */}
          {!allComplete && (
            <motion.div
              className="absolute -inset-3 rounded-[28px] border-2 border-transparent"
              style={{
                borderTopColor: "#8b5cf6",
                borderRightColor: "rgba(139, 92, 246, 0.3)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.div>

        {/* Title */}
        <motion.h1
          className={`text-2xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {allComplete ? "Ready!" : "Preparing Your Interview"}
        </motion.h1>

        <motion.p
          className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {allComplete
            ? "Everything is set. Good luck!"
            : "Setting up a personalized experience for you"}
        </motion.p>

        {/* Config badges */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Badge
            icon={<Briefcase className="w-3 h-3" />}
            text={config.targetRole || config.interviewType}
            isDark={isDark}
          />
          {config.targetCompany && (
            <Badge
              icon={<Building2 className="w-3 h-3" />}
              text={config.targetCompany}
              isDark={isDark}
            />
          )}
          <Badge
            icon={<BarChart3 className="w-3 h-3" />}
            text={difficultyLabel}
            isDark={isDark}
          />
          {config.aiVoiceEnabled && (
            <Badge icon={<Mic className="w-3 h-3" />} text="Voice AI" isDark={isDark} />
          )}
          {config.resumeAware && (
            <Badge icon={<FileText className="w-3 h-3" />} text="Resume Aware" isDark={isDark} />
          )}
        </motion.div>

        {/* Steps */}
        <div className="w-full space-y-1 mb-8">
          <AnimatePresence>
            {steps.map((step, idx) => {
              const isCompleted = currentStep > idx;
              const isCurrent = currentStep === idx;
              const isVisible = idx <= currentStep;

              if (!isVisible) return null;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    isCurrent
                      ? isDark
                        ? "bg-white/5 border border-white/10"
                        : "bg-violet-50 border border-violet-200"
                      : isCompleted
                        ? ""
                        : ""
                  }`}
                >
                  {/* Status icon */}
                  <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center"
                      >
                        <motion.div
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                        >
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        </motion.div>
                      </motion.div>
                    ) : isCurrent ? (
                      <motion.div
                        className="w-6 h-6 rounded-full border-2 border-violet-500"
                        animate={{ borderColor: ["#8b5cf6", "#6d28d9", "#8b5cf6"] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <motion.div
                          className="w-full h-full rounded-full border-t-2 border-transparent"
                          style={{ borderTopColor: "#a78bfa" }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        />
                      </motion.div>
                    ) : null}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        isCompleted
                          ? "text-emerald-400"
                          : isCurrent
                            ? isDark
                              ? "text-white"
                              : "text-gray-900"
                            : isDark
                              ? "text-gray-500"
                              : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </div>
                    {isCurrent && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                      >
                        {step.description}
                      </motion.div>
                    )}
                  </div>

                  {/* Step icon */}
                  <div
                    className={`flex-shrink-0 ${
                      isCompleted
                        ? "text-emerald-400"
                        : isCurrent
                          ? "text-violet-400"
                          : isDark
                            ? "text-gray-600"
                            : "text-gray-300"
                    }`}
                  >
                    {step.icon}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div
            className={`h-1.5 rounded-full overflow-hidden ${
              isDark ? "bg-white/10" : "bg-gray-200"
            }`}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: allComplete
                  ? "linear-gradient(90deg, #10b981, #34d399)"
                  : "linear-gradient(90deg, #7c3aed, #3b82f6)",
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span
              className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              {allComplete ? "Complete" : `Step ${Math.min(currentStep + 1, totalSteps)} of ${totalSteps}`}
            </span>
            <span
              className={`text-xs font-medium ${
                allComplete ? "text-emerald-400" : "text-violet-400"
              }`}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Badge: React.FC<{
  icon: React.ReactNode;
  text: string;
  isDark: boolean;
}> = ({ icon, text, isDark }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
      isDark
        ? "bg-white/5 text-gray-300 border border-white/10"
        : "bg-violet-50 text-violet-700 border border-violet-200"
    }`}
  >
    {icon}
    {text}
  </div>
);

export default EngineLoading;
