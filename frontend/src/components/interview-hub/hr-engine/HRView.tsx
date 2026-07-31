"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import HRLanding from "./HRLanding";
import HRLoading from "./HRLoading";
import HRInterviewActive from "./HRInterviewActive";
import HRReport from "./HRReport";
import HRAnalytics from "./HRAnalytics";
import type { HRConfig, HREvaluation } from "./HRTypes";

type ViewScreen = "landing" | "loading" | "active" | "report" | "analytics";

interface HRViewProps {
  theme: string;
}

export default function HRView({ theme }: HRViewProps) {
  const isDark = theme === "dark";
  const [screen, setScreen] = useState<ViewScreen>("landing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<HREvaluation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [config, setConfig] = useState<HRConfig | null>(null);

  const handleStart = useCallback((hrConfig: HRConfig) => {
    setConfig(hrConfig);
    setScreen("loading");
  }, []);

  const handleLoadingComplete = useCallback(async () => {
    if (!config) return;
    try {
      const res = await api.post("/interview/hr/start", {
        interviewType: config.interviewType,
        targetRole: config.targetRole,
        targetCompany: config.targetCompany || null,
        difficulty: config.difficulty,
        experienceLevel: config.experienceLevel,
        durationMinutes: config.durationMinutes,
        language: config.language,
        aiVoiceEnabled: config.aiVoiceEnabled,
        voiceGender: config.voiceGender,
        voiceSpeed: config.voiceSpeed,
        voicePitch: config.voicePitch,
        resumeAware: config.resumeAware,
        customInstructions: config.customInstructions || "",
      });
      if (res.data.success) {
        setSessionId(res.data.session.id);
        setMessages(res.data.messages || []);
        setScreen("active");
      } else {
        toast.error("Failed to start HR interview");
        setScreen("landing");
      }
    } catch {
      toast.error("Failed to start HR interview session");
      setScreen("landing");
    }
  }, [config]);

  const DEFAULT_HR_EVALUATION: HREvaluation = {
    overallScore: 40,
    communicationScore: 45,
    leadershipScore: 40,
    starScore: 40,
    confidenceScore: 40,
    teamworkScore: 40,
    ownershipScore: 40,
    adaptabilityScore: 40,
    emotionalIntelligence: 40,
    professionalism: 45,
    culturalFit: 40,
    motivation: 45,
    strengths: ["HR interview session initialized"],
    weaknesses: ["Session completed early or terminated due to proctoring rules"],
    improvements: ["Answer all behavioral questions for detailed STAR evaluation"],
    summary: "The HR interview session was concluded early or ended due to security rules.",
    hiringRecommendation: "maybe",
    competencyMatrix: [],
    answerBreakdowns: [],
    nextPracticeTopics: [],
    recruiterPerspective: "Interview concluded early.",
  };

  const handleInterviewComplete = useCallback(async (completedSessionId: string) => {
    try {
      toast.info("Generating your HR evaluation...");
      const res = await api.post(`/interview/hr/${completedSessionId}/evaluate`);
      setEvaluation(res.data?.evaluation || DEFAULT_HR_EVALUATION);
      setScreen("report");
      toast.success("Evaluation complete!");
    } catch {
      setEvaluation(DEFAULT_HR_EVALUATION);
      setScreen("report");
    }
  }, []);

  const handleInterviewEnd = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await api.post(`/interview/hr/${sessionId}/end`);
      setEvaluation(res.data?.evaluation || DEFAULT_HR_EVALUATION);
      setScreen("report");
    } catch {
      setEvaluation(DEFAULT_HR_EVALUATION);
      setScreen("report");
    }
  }, [sessionId]);

  const handleReset = useCallback(() => {
    setScreen("landing");
    setSessionId(null);
    setEvaluation(null);
    setMessages([]);
    setConfig(null);
  }, []);

  return (
    <div
      className="relative"
      style={{
        background: "var(--bg-dark)",
        color: "var(--text-primary)",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Header */}
      {screen !== "landing" && screen !== "active" && (
        <div className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", background: "transparent" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleReset}
                className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: isDark ? "#ffffff" : "#111827" }}>
                <ArrowLeft size={14} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Sparkles size={13} className="text-black" />
                </div>
                <span className="text-sm font-bold hidden sm:inline">AI HR Interview</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sessionId && (
                <span className="text-[9px] px-2 py-1 rounded-lg border font-bold"
                  style={{ background: isDark ? "rgba(16,185,129,0.1)" : "#ecfdf5", borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.25)", color: isDark ? "#34d399" : "#059669" }}>
                  SESSION ACTIVE
                </span>
              )}
              <button onClick={() => setScreen("analytics")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
                <BarChart3 size={12} /> Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screens */}
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <HRLanding onStart={handleStart} onViewHistory={() => setScreen("analytics")} onViewAnalytics={() => setScreen("analytics")} theme={theme} />
          </motion.div>
        )}
        {screen === "loading" && config && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <HRLoading config={config} onComplete={handleLoadingComplete} theme={theme} />
          </motion.div>
        )}
        {screen === "active" && sessionId && config && (
          <motion.div key="active" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}>
            <HRInterviewActive sessionId={sessionId} config={config} initialMessages={messages} onComplete={handleInterviewComplete} onEnd={handleInterviewEnd} theme={theme} />
          </motion.div>
        )}
        {screen === "report" && sessionId && evaluation && config && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <HRReport sessionId={sessionId} evaluation={evaluation} messages={messages} config={config} onRetry={handleReset} onViewAnalytics={() => setScreen("analytics")} theme={theme} />
          </motion.div>
        )}
        {screen === "analytics" && (
          <motion.div key="analytics" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <HRAnalytics onBack={handleReset} onStartInterview={handleReset} theme={theme} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
