"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, TrendingUp, TrendingDown, Check, AlertTriangle, Lightbulb,
  BookOpen, MessageSquare, Zap, Target, Download, BarChart3,
  RotateCcw, ChevronDown, Award, Star, Brain, Sparkles, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { generateInterviewPDF } from "@/utils/interview-pdf";
import InterviewIntelligence from "@/components/interview-hub/shared/InterviewIntelligence";
import { api } from "@/services/api";
import FormattedMarkdown from "@/components/shared/FormattedMarkdown";
import type { EngineEvaluation, IntelligenceData } from "./EngineTypes";

interface EngineReportProps {
  sessionId: string;
  evaluation: EngineEvaluation;
  messages: Array<{
    role: string;
    content: string;
  }>;
  config: {
    interviewType: string;
    targetRole: string;
    targetCompany: string;
    difficulty: string;
    durationMinutes: number;
    technology?: string;
  };
  onRetry: () => void;
  onViewAnalytics: () => void;
  onNewInterview: () => void;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getRecommendationInfo(rec: string): { label: string; color: string; bg: string } {
  const lower = (rec || "").toLowerCase().replace(/_/g, " ");
  if (
    lower.includes("no hire") ||
    lower.includes("not recommend") ||
    lower.includes("non recommendation") ||
    lower.includes("do not") ||
    lower.includes("reject") ||
    lower.includes("no_hire")
  ) {
    return { label: "No Hire", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
  }
  if (lower.includes("strong")) return { label: "Strong Hire", color: "#10b981", bg: "rgba(16,185,129,0.12)" };
  if (lower.includes("maybe") || lower.includes("consider")) return { label: "Maybe", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  if (lower.includes("hire") || lower.includes("recommend")) return { label: "Hire", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" };
  return { label: "No Hire", color: "#ef4444", bg: "rgba(239,68,68,0.12)" };
}

function getTagStyle(tag: string): { color: string; bg: string } {
  const t = (tag || "").toLowerCase();
  if (t.includes("strong") || t.includes("excellent") || t.includes("deep")) return { color: "#10b981", bg: "rgba(16,185,129,0.1)" };
  if (t.includes("vague") || t.includes("weak") || t.includes("poor")) return { color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
  if (t.includes("technical")) return { color: "#06b6d4", bg: "rgba(6,182,212,0.1)" };
  if (t.includes("example")) return { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" };
  return { color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
}

function AnimatedNumber({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const dur = duration * 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * (value || 0)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function EngineReport({
  sessionId,
  evaluation,
  messages,
  config,
  onRetry,
  onViewAnalytics,
  onNewInterview,
  theme: propTheme,
}: EngineReportProps & { theme?: string }) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [openBreakdowns, setOpenBreakdowns] = useState<Set<number>>(new Set());
  const [showAllBreakdowns, setShowAllBreakdowns] = useState(false);
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  const isDark = theme === "dark";
  const c = useMemo(
    () => ({
      bg: isDark ? "#080710" : "#f9fafb",
      surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
      surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
      border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
      borderLight: isDark ? "rgba(255,255,255,0.04)" : "#d1d5db",
      text: isDark ? "#ffffff" : "#111827",
      textSec: isDark ? "rgba(255,255,255,0.65)" : "#4b5563",
      textMuted: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af",
      amber: "#f59e0b",
      green: "#10b981",
      red: "#ef4444",
      purple: "#8b5cf6",
      cyan: "#06b6d4",
      blue: "#3b82f6",
      cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
      inputBg: isDark ? "rgba(0,0,0,0.3)" : "#ffffff",
    }),
    [isDark]
  );

  const evalAny = (evaluation as any) || {};
  const detailed = evalAny?.detailedAnalysis || {};
  const sub = evalAny?.subScores || detailed?.subScores || {};
  const baseOverall = evalAny.overallScore ?? detailed.overallScore ?? 0;

  const safeEval = {
    overallScore: baseOverall,
    communicationScore: evalAny.communicationScore ?? sub.communication ?? evalAny.communication ?? detailed.communicationScore ?? baseOverall,
    technicalScore: evalAny.technicalScore ?? sub.technical ?? evalAny.technical ?? detailed.technicalScore ?? baseOverall,
    hrScore: evalAny.hrScore ?? sub.hr ?? evalAny.hr ?? detailed.hrScore ?? baseOverall,
    confidenceScore: evalAny.confidenceScore ?? sub.confidence ?? evalAny.confidence ?? detailed.confidenceScore ?? baseOverall,
    fluencyScore: evalAny.fluencyScore ?? sub.fluency ?? evalAny.fluency ?? detailed.fluencyScore ?? baseOverall,
    bodyLanguageScore: evalAny.bodyLanguageScore ?? sub.bodyLanguage ?? evalAny.bodyLanguage ?? detailed.bodyLanguageScore ?? baseOverall,
    communication: evalAny.communication ?? sub.communication ?? evalAny.communicationScore ?? detailed.communication ?? baseOverall,
    technical: evalAny.technical ?? sub.technical ?? evalAny.technicalScore ?? detailed.technical ?? baseOverall,
    confidence: evalAny.confidence ?? sub.confidence ?? evalAny.confidenceScore ?? detailed.confidence ?? baseOverall,
    problemSolving: sub.problemSolving ?? evalAny.problemSolving ?? detailed.problemSolving ?? baseOverall,
    leadership: sub.leadership ?? evalAny.leadership ?? detailed.leadership ?? 0,
    roleFit: sub.roleFit ?? evalAny.roleFit ?? detailed.roleFit ?? baseOverall,
    strengths: Array.isArray(evalAny.strengths) && evalAny.strengths.length > 0
      ? evalAny.strengths
      : Array.isArray(detailed.strengths) && detailed.strengths.length > 0
      ? detailed.strengths
      : baseOverall > 50 ? ["Demonstrated foundational domain awareness"] : ["Attempted interview session"],
    weaknesses: Array.isArray(evalAny.weaknesses) && evalAny.weaknesses.length > 0
      ? evalAny.weaknesses
      : Array.isArray(detailed.weaknesses) && detailed.weaknesses.length > 0
      ? detailed.weaknesses
      : baseOverall < 50 ? ["Did not provide sufficient technical depth to evaluate competencies"] : ["Could improve space/time optimization"],
    improvements: Array.isArray(evalAny.improvements) && evalAny.improvements.length > 0
      ? evalAny.improvements
      : Array.isArray(evalAny.areasForImprovement) && evalAny.areasForImprovement.length > 0
      ? evalAny.areasForImprovement
      : Array.isArray(detailed.improvements) && detailed.improvements.length > 0
      ? detailed.improvements
      : ["Answer each question thoroughly with concrete examples"],
    missedOpportunities: Array.isArray(evalAny.missedOpportunities)
      ? evalAny.missedOpportunities
      : Array.isArray(detailed.missedOpportunities)
      ? detailed.missedOpportunities
      : [],
    answerBreakdowns: Array.isArray(evalAny.answerBreakdowns)
      ? evalAny.answerBreakdowns
      : Array.isArray(detailed.answerBreakdowns)
      ? detailed.answerBreakdowns
      : [],
    recommendedTopics: Array.isArray(evalAny.recommendedTopics)
      ? evalAny.recommendedTopics
      : Array.isArray(detailed.recommendedTopics)
      ? detailed.recommendedTopics
      : [],
    communicationTips: Array.isArray(evalAny.communicationTips)
      ? evalAny.communicationTips
      : Array.isArray(detailed.communicationTips)
      ? detailed.communicationTips
      : [],
    technicalImprovements: Array.isArray(evalAny.technicalImprovements)
      ? evalAny.technicalImprovements
      : Array.isArray(detailed.technicalImprovements)
      ? detailed.technicalImprovements
      : [],
    nextPracticePlan: evalAny.nextPracticePlan || detailed.nextPracticePlan || "Practice core problem solving and system design questions.",
    summary: evalAny.summary || detailed.summary || "The technical interview was completed and evaluated.",
    hiringRecommendation: evalAny.hiringRecommendation || detailed.hiringRecommendation || (baseOverall >= 70 ? "recommend" : "do_not_recommend"),
  };

  const overallScore = safeEval.overallScore;
  const scoreColor = useMemo(() => getScoreColor(overallScore), [overallScore]);
  const recInfo = useMemo(() => getRecommendationInfo(safeEval.hiringRecommendation), [safeEval.hiringRecommendation]);

  const scoreBreakdowns = useMemo(() => {
    const comm = safeEval.communication;
    const conf = safeEval.confidence;
    const prob = safeEval.problemSolving;
    const lead = safeEval.leadership;
    const fit = safeEval.roleFit;
    const tech = safeEval.technical;

    const items: Array<{ label: string; value: number; icon: React.ComponentType<{ className?: string }> }> = [
      { label: "Communication", value: comm, icon: MessageSquare },
    ];

    if (config.interviewType === "system-design" || config.interviewType === "technical" || config.interviewType === "coding") {
      items.push({ label: "Technical", value: tech, icon: Zap });
    }

    items.push(
      { label: "Confidence", value: conf, icon: Star },
      { label: "Problem Solving", value: prob, icon: Brain }
    );

    // Only include Leadership for HR/Behavioral interviews or if explicitly provided (>0)
    if (
      config.interviewType === "hr" ||
      config.interviewType === "behavioral" ||
      config.interviewType === "leadership" ||
      (lead > 0 && (sub.leadership !== undefined || evalAny.leadership !== undefined))
    ) {
      items.push({ label: "Leadership", value: lead, icon: Award });
    }

    items.push({ label: "Role Fit", value: fit, icon: Target });

    return items;
  }, [safeEval, config.interviewType, sub.leadership, evalAny.leadership]);

  const visibleBreakdowns = useMemo(() => {
    const list = safeEval.answerBreakdowns;
    if (showAllBreakdowns) return list;
    return list.slice(0, 5);
  }, [safeEval.answerBreakdowns, showAllBreakdowns]);

  const toggleBreakdown = useCallback((idx: number) => {
    setOpenBreakdowns((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  useEffect(() => {
    const fetchIntelligence = async () => {
      if (!sessionId) return;
      setLoadingIntelligence(true);
      try {
        const token = localStorage.getItem("adyapan-token");
        const res = await fetch(`${api.defaults.baseURL}/engine/${sessionId}/coach`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success && data.intelligence) {
          setIntelligence(data.intelligence);
        }
      } catch (err) {
        console.warn("Failed to load intelligence data:", err);
      } finally {
        setLoadingIntelligence(false);
      }
    };
    fetchIntelligence();
  }, [sessionId]);

  const handleDownloadPDF = useCallback(() => {
    try {
      generateInterviewPDF({
        sessionId: sessionId || "tech-session",
        role: config.targetRole,
        company: config.targetCompany,
        type: config.interviewType,
        difficulty: config.difficulty,
        language: "english",
        durationMinutes: config.durationMinutes,
        technology: config.technology,
        createdAt: new Date().toISOString(),
        evaluation: {
          overallScore: safeEval.overallScore,
          communicationScore: safeEval.communication,
          technicalScore: safeEval.technical,
          confidenceScore: safeEval.confidence,
          strengths: safeEval.strengths,
          weaknesses: safeEval.weaknesses,
          improvements: [...safeEval.recommendedTopics, ...safeEval.technicalImprovements],
          summary: safeEval.summary,
          hiringRecommendation: safeEval.hiringRecommendation,
        },
      });
      toast.success("PDF report downloaded!");
    } catch {
      toast.error("Failed to generate PDF");
    }
  }, [sessionId, config, safeEval]);

  const SVG_SCORE_SIZE = 160;
  const SVG_SCORE_RADIUS = 68;
  const SVG_SCORE_CIRCUMFERENCE = 2 * Math.PI * SVG_SCORE_RADIUS;
  const SVG_SCORE_OFFSET = SVG_SCORE_CIRCUMFERENCE - ((safeEval.overallScore || 0) / 100) * SVG_SCORE_CIRCUMFERENCE;

  return (
    <div
      className="min-h-full"
      style={{ fontFamily: "var(--font-sans)", background: c.bg }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .report-print-area, .report-print-area * { visibility: visible; }
          .report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="report-print-area max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* ═══ HEADER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
            style={{ background: "rgba(245,158,11,0.1)", color: c.amber }}
          >
            <Trophy className="w-3.5 h-3.5" />
            Interview Report
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: c.text }}>
            Performance Report
          </h1>
          <p className="text-xs" style={{ color: c.textSec }}>
            {config.targetRole}
            {config.targetCompany && ` @ ${config.targetCompany}`}
            {" · "}
            {config.interviewType.replace(/-/g, " ")} Interview
            {" · "}
            {config.difficulty}
          </p>
        </motion.div>

        {/* ═══ SCORE OVERVIEW ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6"
        >
          {/* Score Ring */}
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl border"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="relative">
              <svg width={SVG_SCORE_SIZE} height={SVG_SCORE_SIZE} className="-rotate-90">
                <circle
                  cx={SVG_SCORE_SIZE / 2}
                  cy={SVG_SCORE_SIZE / 2}
                  r={SVG_SCORE_RADIUS}
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                  strokeWidth="10"
                />
                <motion.circle
                  cx={SVG_SCORE_SIZE / 2}
                  cy={SVG_SCORE_SIZE / 2}
                  r={SVG_SCORE_RADIUS}
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={SVG_SCORE_CIRCUMFERENCE}
                  initial={{ strokeDashoffset: SVG_SCORE_CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: SVG_SCORE_OFFSET }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold" style={{ color: scoreColor }}>
                  <AnimatedNumber value={safeEval.overallScore} />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                  Overall
                </span>
              </div>
            </div>

            {/* Recommendation badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider"
              style={{ background: recInfo.bg, color: recInfo.color, border: `1px solid ${recInfo.color}30` }}
            >
              {recInfo.label}
            </motion.div>
          </div>

          {/* Score Breakdown Bars */}
          <div className="p-6 rounded-3xl border space-y-4"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
              Score Breakdown
            </h3>
            <div className="space-y-3">
              {scoreBreakdowns.map((item, idx) => {
                const Icon = item.icon;
                const col = getScoreColor(item.value);
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 inline-block rounded-full" style={{ backgroundColor: col }} />
                        <span className="text-xs font-medium" style={{ color: c.textSec }}>{item.label}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: col }}>
                        <AnimatedNumber value={item.value} duration={1.2} />
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: `linear-gradient(90deg, ${col}cc, ${col})`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: 0.3 + idx * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ═══ AI SUMMARY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="p-6 rounded-3xl border"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.05), rgba(59,130,246,0.03))",
            borderColor: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4" style={{ color: c.purple }} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.purple }}>
              AI Summary
            </h3>
          </div>
          <FormattedMarkdown content={safeEval.summary} isDark={isDark} />
        </motion.div>

        {/* ═══ STRENGTHS & WEAKNESSES ═══ */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Strengths */}
          <motion.div
            variants={fadeUp}
            className="p-6 rounded-3xl border"
            style={{
              background: isDark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.02)",
              borderColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                <TrendingUp className="w-4 h-4" style={{ color: c.green }} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.green }}>
                Strengths
              </h3>
            </div>
            <div className="space-y-2">
              {safeEval.strengths.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)",
                    border: `1px solid ${isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)"}`,
                  }}
                >
                  <Check className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: c.green }} />
                  <span className="text-xs leading-relaxed" style={{ color: c.textSec }}>{s}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Weaknesses */}
          <motion.div
            variants={fadeUp}
            className="p-6 rounded-3xl border"
            style={{
              background: isDark ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.02)",
              borderColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}>
                <TrendingDown className="w-4 h-4" style={{ color: c.red }} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.red }}>
                Areas to Improve
              </h3>
            </div>
            <div className="space-y-2">
              {safeEval.weaknesses.map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)",
                    border: `1px solid ${isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)"}`,
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: c.red }} />
                  <span className="text-xs leading-relaxed" style={{ color: c.textSec }}>{w}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* ═══ MISSED OPPORTUNITIES ═══ */}
        {safeEval.missedOpportunities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-3xl border"
            style={{
              background: isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.02)",
              borderColor: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                <Lightbulb className="w-4 h-4" style={{ color: c.amber }} />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.amber }}>
                Missed Opportunities
              </h3>
            </div>
            <div className="space-y-2">
              {safeEval.missedOpportunities.map((m, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.04)",
                    border: `1px solid ${isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.06)"}`,
                  }}
                >
                  <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: c.amber }} />
                  <span className="text-xs leading-relaxed" style={{ color: c.textSec }}>{m}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ ANSWER BREAKDOWNS ═══ */}
        {safeEval.answerBreakdowns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: c.purple }} />
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: c.text }}>
                Answer Breakdowns
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: c.surface, color: c.textMuted }}>
                {safeEval.answerBreakdowns.length} questions
              </span>
            </div>

            <div className="space-y-3">
              {visibleBreakdowns.map((bd, idx) => {
                const col = getScoreColor(bd.score);
                const isOpen = openBreakdowns.has(idx);

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.05 }}
                    className="rounded-2xl border overflow-hidden"
                    style={{
                      background: c.cardBg,
                      borderColor: isOpen ? `${col}30` : c.border,
                    }}
                  >
                    {/* Collapsed header */}
                    <button
                      onClick={() => toggleBreakdown(idx)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] cursor-pointer"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-extrabold"
                        style={{ background: `${col}18`, color: col }}
                      >
                        Q{bd.questionNumber || idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: c.text }}>
                          {bd.question}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1 w-16 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${bd.score}%`, background: col }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: col }}>{bd.score}%</span>
                          {Array.isArray(bd.tags) && bd.tags.slice(0, 2).map((tag) => {
                            const tc = getTagStyle(tag);
                            return (
                              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: tc.bg, color: tc.color }}>
                                {tag}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4" style={{ color: c.textMuted }} />
                      </motion.div>
                    </button>

                    {/* Expanded body */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: c.borderLight }}>
                            {/* Question */}
                            <div className="pt-4">
                              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.purple }}>
                                Question
                              </label>
                              <p className="text-xs leading-relaxed px-3 py-2 rounded-xl" style={{ background: c.surface, color: c.text }}>
                                {bd.question}
                              </p>
                            </div>

                            {/* Candidate Response */}
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.cyan }}>
                                Your Response
                              </label>
                              <p className="text-xs leading-relaxed px-3 py-2 rounded-xl" style={{ background: isDark ? "rgba(6,182,212,0.04)" : "rgba(6,182,212,0.02)", color: c.textSec, border: `1px solid ${isDark ? "rgba(6,182,212,0.08)" : "rgba(6,182,212,0.06)"}` }}>
                                {bd.candidateResponse || bd.answer || "Answer recorded in session."}
                              </p>
                            </div>

                            {/* AI Analysis */}
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.amber }}>
                                AI Analysis
                              </label>
                              <div className="px-3 py-2 rounded-xl" style={{ background: isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.02)", border: `1px solid ${isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)"}` }}>
                                <FormattedMarkdown content={bd.aiAnalysis} isDark={isDark} />
                              </div>
                            </div>

                            {/* Suggested Better Answer */}
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.green }}>
                                Suggested Better Answer
                              </label>
                              <div className="px-3 py-2 rounded-xl" style={{ background: isDark ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.03)", border: `1px solid ${isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)"}` }}>
                                <FormattedMarkdown content={bd.suggestedBetterAnswer} isDark={isDark} />
                              </div>
                            </div>

                            {/* Interviewer Perspective */}
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.purple }}>
                                Interviewer Perspective
                              </label>
                              <div className="px-3 py-2 rounded-xl" style={{ background: isDark ? "rgba(139,92,246,0.04)" : "rgba(139,92,246,0.02)", border: `1px solid ${isDark ? "rgba(139,92,246,0.08)" : "rgba(139,92,246,0.06)"}` }}>
                                <FormattedMarkdown content={bd.interviewerPerspective} isDark={isDark} />
                              </div>
                            </div>

                            {/* Score + Tags */}
                            <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: c.borderLight }}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold"
                                  style={{ background: `${col}15`, color: col }}
                                >
                                  {bd.score}
                                </div>
                                <span className="text-[10px]" style={{ color: c.textMuted }}>/ 100</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(bd.tags) && bd.tags.map((tag) => {
                                  const tc = getTagStyle(tag);
                                  return (
                                    <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: tc.bg, color: tc.color, border: `1px solid ${tc.color}20` }}>
                                      {tag}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {safeEval.answerBreakdowns.length > 5 && (
              <div className="text-center">
                <button
                  onClick={() => setShowAllBreakdowns(!showAllBreakdowns)}
                  className="text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  style={{ color: c.amber, background: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)" }}
                >
                  {showAllBreakdowns
                    ? "Show Less"
                    : `Show All ${safeEval.answerBreakdowns.length} Answers`}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ RECOMMENDATIONS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Topics to Study */}
          {safeEval.recommendedTopics.length > 0 && (
            <div className="p-6 rounded-3xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4" style={{ color: c.blue }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.blue }}>
                  Recommended Topics
                </h3>
              </div>
              <div className="space-y-2">
                {safeEval.recommendedTopics.map((topic, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isDark ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.03)" }}>
                    <ArrowRight className="w-3 h-3 flex-shrink-0" style={{ color: c.blue }} />
                    <span className="text-xs" style={{ color: c.textSec }}>{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Communication Tips */}
          {safeEval.communicationTips.length > 0 && (
            <div className="p-6 rounded-3xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4" style={{ color: c.cyan }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.cyan }}>
                  Communication Tips
                </h3>
              </div>
              <div className="space-y-2">
                {safeEval.communicationTips.map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isDark ? "rgba(6,182,212,0.05)" : "rgba(6,182,212,0.03)" }}>
                    <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: c.cyan }} />
                    <span className="text-xs" style={{ color: c.textSec }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Improvements */}
          {safeEval.technicalImprovements.length > 0 && (
            <div className="p-6 rounded-3xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4" style={{ color: c.amber }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.amber }}>
                  Technical Improvements
                </h3>
              </div>
              <div className="space-y-2">
                {safeEval.technicalImprovements.map((imp, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)" }}>
                    <TrendingUp className="w-3 h-3 flex-shrink-0" style={{ color: c.amber }} />
                    <span className="text-xs" style={{ color: c.textSec }}>{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Practice Plan */}
          {safeEval.nextPracticePlan && (
            <div className="p-6 rounded-3xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4" style={{ color: c.green }} />
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.green }}>
                  Next Practice Plan
                </h3>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                {safeEval.nextPracticePlan}
              </p>
            </div>
          )}
        </motion.div>

        {/* ═══ INTELLIGENCE LAYER ═══ */}
        {(intelligence || loadingIntelligence) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
          >
            {loadingIntelligence && !intelligence ? (
              <div className="p-8 rounded-3xl border text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: c.purple, borderTopColor: "transparent" }} />
                <p className="text-xs" style={{ color: c.textMuted }}>Generating AI coaching intelligence...</p>
              </div>
            ) : intelligence ? (
              <InterviewIntelligence intelligence={intelligence} isDark={isDark} />
            ) : null}
          </motion.div>
        )}

        {/* ═══ ACTION BUTTONS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-4 pb-8 no-print"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
            style={{
              background: "linear-gradient(135deg, #6d28d9, #3b82f6)",
              color: "#ffffff",
              boxShadow: "0 4px 20px rgba(109,40,217,0.3)",
            }}
          >
            <Download className="w-4 h-4" />
            Download PDF Report
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onViewAnalytics}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer"
            style={{ borderColor: c.border, color: c.textSec, background: c.cardBg }}
          >
            <BarChart3 className="w-4 h-4" />
            View Analytics
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer"
            style={{ borderColor: isDark ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.15)", color: c.cyan, background: isDark ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.04)" }}
          >
            <RotateCcw className="w-4 h-4" />
            Practice Again
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onNewInterview}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer"
            style={{ borderColor: isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)", color: c.purple, background: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)" }}
          >
            <Zap className="w-4 h-4" />
            New Interview
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
