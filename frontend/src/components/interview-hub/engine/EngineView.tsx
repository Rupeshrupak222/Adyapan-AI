"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import { ArrowLeft, BarChart3, Sparkles } from "lucide-react";
import EngineLanding from "./EngineLanding";
import EngineLoading from "./EngineLoading";
import EngineInterview from "./EngineInterview";
import EngineReport from "./EngineReport";
import EngineTranscript from "./EngineTranscript";
import EngineAnalytics from "./EngineAnalytics";
import type { EngineConfig, EngineEvaluation } from "./EngineTypes";
import {
  useInterviewLifecycle,
  PermissionGateScreen,
  InterviewRouteGuard,
} from "@/components/interview-hub/shared/lifecycle";

type ViewScreen = "landing" | "permission_gate" | "loading" | "active" | "report" | "analytics";

interface EngineViewProps {
  theme: string;
}

export default function EngineView({ theme }: EngineViewProps) {
  const isDark = theme === "dark";
  const [screen, setScreen] = useState<ViewScreen>("landing");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EngineEvaluation | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [launching, setLaunching] = useState(false);

  const lifecycle = useInterviewLifecycle({
    interviewType: "general",
    onTerminationCleanup: () => {
      setSessionId(null);
    },
  });

  const handleStart = useCallback(async (interviewConfig: EngineConfig) => {
    setConfig(interviewConfig);
    setScreen("permission_gate");
    await lifecycle.validateAndRequestPermissions();
  }, [lifecycle]);

  const handleLoadingComplete = useCallback(async () => {
    if (!config) return;
    setLaunching(true);
    try {
      const res = await api.post("/engine/start", {
        interviewType: config.interviewType,
        targetRole: config.targetRole,
        targetCompany: config.targetCompany || null,
        difficulty: config.difficulty,
        experienceLevel: config.experienceLevel,
        durationMinutes: config.durationMinutes,
        technology: config.technology || null,
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
        lifecycle.markInterviewStarted();
      } else {
        toast.error("Failed to start interview");
        setScreen("landing");
      }
    } catch {
      toast.error("Failed to start interview session");
      setScreen("landing");
    } finally {
      setLaunching(false);
    }
  }, [config, lifecycle]);

  const DEFAULT_EVALUATION: EngineEvaluation = {
    overallScore: 40,
    communication: 45,
    technical: 40,
    confidence: 40,
    problemSolving: 40,
    leadership: 40,
    roleFit: 40,
    strengths: ["Interview session recorded"],
    weaknesses: ["Session concluded early or ended due to proctoring rules"],
    missedOpportunities: [],
    recommendedTopics: [],
    communicationTips: [],
    technicalImprovements: [],
    nextPracticePlan: "Practice full interview session for complete performance metrics.",
    summary: "The interview session was concluded early or terminated due to proctoring rules.",
    hiringRecommendation: "maybe",
    answerBreakdowns: [],
  };

  const handleInterviewComplete = useCallback(async (completedSessionId: string) => {
    try {
      toast.info("Generating your evaluation report...");
      const res = await api.post(`/engine/${completedSessionId}/evaluate`);
      setEvaluation(res.data?.evaluation || DEFAULT_EVALUATION);
      if (res.data?.session?.messages) {
        setMessages(res.data.session.messages);
      }
      toast.success("Evaluation complete!");
      setScreen("report");
    } catch {
      setEvaluation(DEFAULT_EVALUATION);
      toast.info("Generated summary report");
      setScreen("report");
    }
  }, []);

  const handleInterviewEnd = useCallback(async () => {
    if (!sessionId) return;
    try {
      toast.info("Wrapping up interview & generating report...");
      let res = await api.post(`/engine/${sessionId}/evaluate`);
      if (!res.data?.evaluation) {
        res = await api.post(`/engine/${sessionId}/end`);
      }
      setEvaluation(res.data?.evaluation || DEFAULT_EVALUATION);
      if (res.data?.session?.messages) {
        setMessages(res.data.session.messages);
      }
      setScreen("report");
    } catch {
      setEvaluation(DEFAULT_EVALUATION);
      toast.info("Generated summary report");
      setScreen("report");
    }
  }, [sessionId]);

  const handleReset = useCallback(() => {
    if (screen === "active") {
      lifecycle.requestExitWithConfirmation(() => {
        setScreen("landing");
        setSessionId(null);
        setEvaluation(null);
        setMessages([]);
        setConfig(null);
      });
    } else {
      lifecycle.executeAtomicTerminationSequence();
      setScreen("landing");
      setSessionId(null);
      setEvaluation(null);
      setMessages([]);
      setConfig(null);
    }
  }, [screen, lifecycle]);

  return (
    <div
      className="relative"
      style={{
        background: "var(--bg-dark)",
        color: "var(--text-primary)",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <InterviewRouteGuard
        isOpen={lifecycle.showExitConfirm}
        onConfirmExit={() => {
          lifecycle.confirmExitAndTerminate();
          setScreen("landing");
          setSessionId(null);
          setEvaluation(null);
          setMessages([]);
          setConfig(null);
        }}
        onCancelExit={lifecycle.cancelExit}
        isDark={isDark}
      />

      {/* Header — hidden during active interview (EngineInterview has its own) */}
      {screen !== "landing" && screen !== "permission_gate" && screen !== "active" && (
        <div className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", background: "transparent" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: isDark ? "#ffffff" : "#111827" }}
              >
                <ArrowLeft size={14} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Sparkles size={13} className="text-black" />
                </div>
                <span className="text-sm font-bold hidden sm:inline">AI Interview Engine</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sessionId && (
                <span className="text-[10px] px-2 py-1 rounded-lg border font-bold" style={{ background: isDark ? "rgba(16,185,129,0.1)" : "#ecfdf5", borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.25)", color: isDark ? "#34d399" : "#059669" }}>
                  SESSION ACTIVE
                </span>
              )}
              <button
                onClick={() => setScreen("analytics")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}
              >
                <BarChart3 size={12} /> Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Content */}
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <EngineLanding
              onStart={handleStart}
              onViewHistory={() => setScreen("analytics")}
              onViewAnalytics={() => setScreen("analytics")}
              theme={theme}
            />
          </motion.div>
        )}

        {screen === "permission_gate" && (
          <motion.div
            key="permission_gate"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <PermissionGateScreen
              interviewTitle={`${config?.targetRole || "AI"} Interview Room`}
              mediaStatus={lifecycle.mediaStatus}
              onRequestPermissions={lifecycle.validateAndRequestPermissions}
              onProceedToInterview={() => setScreen("loading")}
              onCancel={() => {
                lifecycle.executeAtomicTerminationSequence();
                setScreen("landing");
              }}
              isDark={isDark}
            />
          </motion.div>
        )}

        {screen === "loading" && config && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <EngineLoading config={config} onComplete={handleLoadingComplete} theme={theme} />
          </motion.div>
        )}

        {screen === "active" && sessionId && config && (
          <motion.div
            key="active"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
          >
            <EngineInterview
              sessionId={sessionId}
              config={config}
              onComplete={handleInterviewComplete}
              onEnd={handleInterviewEnd}
              theme={theme}
            />
          </motion.div>
        )}

        {screen === "report" && sessionId && config && (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {evaluation ? (
              <EngineReport
                sessionId={sessionId}
                evaluation={evaluation}
                messages={messages}
                config={config}
                onRetry={handleReset}
                onViewAnalytics={() => setScreen("analytics")}
                onNewInterview={handleReset}
                theme={theme}
              />
            ) : (
              <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
                <Sparkles className="w-10 h-10 text-amber-500 animate-bounce mx-auto" />
                <h3 className="text-xl font-bold">Generating Detailed Assessment Report...</h3>
                <p className="text-xs text-gray-400">Analyzing responses, scoring technical depth, and preparing recommendations.</p>
              </div>
            )}
            <div className="max-w-5xl mx-auto px-4 pb-12">
              <EngineTranscript
                messages={messages}
                sessionId={sessionId}
                theme={theme}
                config={{
                  interviewType: config.interviewType,
                  targetRole: config.targetRole,
                  targetCompany: config.targetCompany,
                }}
              />
            </div>
          </motion.div>
        )}

        {screen === "analytics" && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <EngineAnalytics
              onBack={handleReset}
              onStartInterview={handleReset}
              theme={theme}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
