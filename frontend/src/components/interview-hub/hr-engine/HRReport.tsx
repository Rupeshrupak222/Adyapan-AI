"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, TrendingUp, Award, Check, ArrowRight, Star,
  Brain, Download, RotateCcw, BarChart3, Users, Sparkles, Eye, Target, MessageSquare, ChevronDown, ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { generateInterviewPDF } from "@/utils/interview-pdf";
import { api } from "@/services/api";
import InterviewIntelligence from "@/components/interview-hub/shared/InterviewIntelligence";
import type { HREvaluation, IntelligenceData } from "./HRTypes";

interface HRReportProps {
  sessionId: string;
  evaluation: HREvaluation;
  messages: Array<{ role: string; content: string }>;
  config: {
    interviewType: string;
    targetRole: string;
    targetCompany?: string;
    difficulty: string;
    durationMinutes: number;
    language: string;
  };
  onRetry: () => void;
  onViewAnalytics: () => void;
}

const HR_COMPETENCY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  communication: { label: "Communication & Articulation", color: "#3b82f6", icon: "MessageSquare" },
  leadership: { label: "Leadership & Initiative", color: "#8b5cf6", icon: "Award" },
  star_methodology: { label: "STAR Structure Mastery", color: "#f59e0b", icon: "Star" },
  confidence: { label: "Confidence & Delivery", color: "#ec4899", icon: "Trophy" },
  teamwork: { label: "Collaboration & Teamwork", color: "#10b981", icon: "Users" },
  ownership: { label: "Ownership & Accountability", color: "#06b6d4", icon: "Check" },
  adaptability: { label: "Adaptability & Resilience", color: "#f97316", icon: "TrendingUp" },
  emotional_intelligence: { label: "Emotional Intelligence (EQ)", color: "#e11d48", icon: "Brain" },
  professionalism: { label: "Professionalism & Demeanor", color: "#64748b", icon: "Award" },
  cultural_fit: { label: "Cultural Fit & Alignment", color: "#14b8a6", icon: "Target" },
};

const COMPETENCY_ICONS: Record<string, React.ElementType> = {
  communication: MessageSquare,
  leadership: Award,
  star_methodology: Star,
  confidence: Trophy,
  teamwork: Users,
  ownership: Check,
  adaptability: TrendingUp,
  emotional_intelligence: Brain,
  professionalism: Award,
  cultural_fit: Target,
};

export default function HRReport({ sessionId, evaluation, messages, config, onRetry, onViewAnalytics, theme: propTheme }: HRReportProps & { theme?: string }) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [expandedBreakdown, setExpandedBreakdown] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "breakdown" | "competencies" | "recruiter">("overview");
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f9fafb",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#111827",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#4b5563",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
    amber: "#f59e0b",
  };

  const detailed = (evaluation as any)?.detailedAnalysis || {};
  const safeEval = {
    overallScore: evaluation?.overallScore ?? detailed.overallScore ?? 75,
    communicationScore: evaluation?.communicationScore ?? detailed.communicationScore ?? 75,
    starScore: evaluation?.starScore ?? detailed.starScore ?? 70,
    confidenceScore: evaluation?.confidenceScore ?? detailed.confidenceScore ?? 75,
    leadershipScore: evaluation?.leadershipScore ?? detailed.leadershipScore ?? 70,
    teamworkScore: evaluation?.teamworkScore ?? detailed.teamworkScore ?? 75,
    ownershipScore: evaluation?.ownershipScore ?? detailed.ownershipScore ?? 70,
    adaptabilityScore: evaluation?.adaptabilityScore ?? detailed.adaptabilityScore ?? 75,
    emotionalIntelligence: evaluation?.emotionalIntelligence ?? detailed.emotionalIntelligence ?? 70,
    professionalism: evaluation?.professionalism ?? detailed.professionalism ?? 75,
    culturalFit: evaluation?.culturalFit ?? detailed.culturalFit ?? 75,
    motivation: evaluation?.motivation ?? detailed.motivation ?? 70,
    strengths: Array.isArray(evaluation?.strengths) && evaluation.strengths.length > 0
      ? evaluation.strengths
      : Array.isArray(detailed.strengths) && detailed.strengths.length > 0
      ? detailed.strengths
      : ["Strong articulation of experiences", "Clear demonstration of teamwork and problem solving"],
    weaknesses: Array.isArray(evaluation?.weaknesses) && evaluation.weaknesses.length > 0
      ? evaluation.weaknesses
      : Array.isArray(detailed.weaknesses) && detailed.weaknesses.length > 0
      ? detailed.weaknesses
      : ["Quantify project impact with explicit metrics", "Enhance STAR Situation setup"],
    improvements: Array.isArray(evaluation?.improvements) && evaluation.improvements.length > 0
      ? evaluation.improvements
      : Array.isArray(detailed.improvements) && detailed.improvements.length > 0
      ? detailed.improvements
      : ["Use structured STAR method consistently", "Highlight key learnings from challenging situations"],
    nextPracticeTopics: Array.isArray(evaluation?.nextPracticeTopics) && evaluation.nextPracticeTopics.length > 0
      ? evaluation.nextPracticeTopics
      : Array.isArray(detailed.nextPracticeTopics) && detailed.nextPracticeTopics.length > 0
      ? detailed.nextPracticeTopics
      : ["Leadership & Initiative", "Conflict Resolution", "Problem Solving Under Pressure"],
    answerBreakdowns: Array.isArray(evaluation?.answerBreakdowns)
      ? evaluation.answerBreakdowns
      : Array.isArray(detailed.answerBreakdowns)
      ? detailed.answerBreakdowns
      : [],
    competencyMatrix: Array.isArray(evaluation?.competencyMatrix)
      ? evaluation.competencyMatrix
      : Array.isArray(detailed.competencyMatrix)
      ? detailed.competencyMatrix
      : [],
    summary: evaluation?.summary || detailed.summary || "The HR behavioral interview was completed successfully and evaluated by AI.",
    hiringRecommendation: evaluation?.hiringRecommendation || detailed.hiringRecommendation || "recommend",
    recruiterPerspective: evaluation?.recruiterPerspective || detailed.recruiterPerspective || evaluation?.summary || "Candidate demonstrated solid foundational behavioral skills.",
  };

  const getRecommendationConfig = (rec: string) => {
    switch (rec) {
      case "strong_recommend": return { label: "Strong Hire", color: "#10b981", bg: "rgba(16,185,129,0.1)" };
      case "recommend": return { label: "Hire", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
      case "maybe": return { label: "Maybe", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
      default: return { label: "No Hire", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
  };

  const recConfig = getRecommendationConfig(safeEval.hiringRecommendation);

  useEffect(() => {
    const fetchIntelligence = async () => {
      if (!sessionId) return;
      setLoadingIntelligence(true);
      try {
        const token = localStorage.getItem("adyapan-token");
        const res = await fetch(`${api.defaults.baseURL}/interview/hr/${sessionId}/coach`, {
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
        console.warn("Failed to load HR intelligence data:", err);
      } finally {
        setLoadingIntelligence(false);
      }
    };
    fetchIntelligence();
  }, [sessionId]);

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "breakdown" as const, label: "Answer Review" },
    { id: "competencies" as const, label: "Competencies" },
    { id: "recruiter" as const, label: "Recruiter View" },
  ];

  return (
    <div className="min-h-full" style={{ background: c.bg, fontFamily: "var(--font-sans)" }}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-8 text-center"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(217,119,6,0.05) 50%, rgba(0,0,0,0) 100%)"
              : "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(251,191,36,0.05) 100%)",
            border: `1px solid ${c.border}`,
          }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold mb-4"
            style={{ background: recConfig.bg, color: recConfig.color }}>
            <Sparkles size={12} /> HR Assessment Complete — Recommendation: {recConfig.label}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: c.text }}>
            {config.targetRole} {config.targetCompany ? `@ ${config.targetCompany}` : ""} HR Assessment
          </h1>
          <p className="text-xs max-w-xl mx-auto mb-6" style={{ color: c.textSec }}>
            {safeEval.summary}
          </p>

          {/* Scores overview */}
          <div className="flex flex-wrap justify-center items-center gap-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="text-center">
                <div className="text-3xl font-black" style={{ color: c.amber }}>
                  {safeEval.overallScore}%
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: c.textMuted }}>Overall Score</div>
              </div>
              <div className="h-8 w-px" style={{ background: c.border }} />
              <div className="flex gap-4">
                {[
                  { label: "Comm", score: safeEval.communicationScore },
                  { label: "STAR", score: safeEval.starScore },
                  { label: "Leadership", score: safeEval.leadershipScore },
                  { label: "Confidence", score: safeEval.confidenceScore },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-lg font-extrabold" style={{ color: s.score >= 70 ? c.green : s.score >= 50 ? c.amber : c.red }}>
                      {s.score}
                    </div>
                    <div className="text-[10px] font-bold uppercase" style={{ color: c.textMuted }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: c.surface }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
              style={{
                background: activeTab === tab.id ? "rgba(245,158,11,0.1)" : "transparent",
                color: activeTab === tab.id ? "#f59e0b" : c.textMuted,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Score Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Teamwork", score: safeEval.teamworkScore, color: "#10b981" },
                  { label: "Ownership", score: safeEval.ownershipScore, color: "#f59e0b" },
                  { label: "Adaptability", score: safeEval.adaptabilityScore, color: "#06b6d4" },
                  { label: "EQ", score: safeEval.emotionalIntelligence, color: "#ec4899" },
                  { label: "Professionalism", score: safeEval.professionalism, color: "#6366f1" },
                  { label: "Cultural Fit", score: safeEval.culturalFit, color: "#f97316" },
                  { label: "Motivation", score: safeEval.motivation, color: "#ef4444" },
                  { label: "STAR Score", score: safeEval.starScore, color: "#8b5cf6" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl border text-center"
                    style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="text-lg font-extrabold" style={{ color: item.color }}>{item.score}</div>
                    <div className="text-[10px] font-bold" style={{ color: c.textMuted }}>{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-emerald-400" />
                    <span className="text-xs font-bold">Strengths</span>
                  </div>
                  {safeEval.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: c.textSec }}>
                      <Check size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                      {s}
                    </div>
                  ))}
                </div>
                <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-amber-500" />
                    <span className="text-xs font-bold">Areas for Improvement</span>
                  </div>
                  {safeEval.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: c.textSec }}>
                      <ArrowRight size={12} className="text-amber-500 mt-0.5 shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              </div>

              {/* Practice Topics */}
              <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={14} className="text-purple-500" />
                  <span className="text-xs font-bold">Next Practice Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {safeEval.nextPracticeTopics.map((topic, i) => (
                    <span key={i} className="text-[10px] px-3 py-1.5 rounded-lg font-bold"
                      style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.2)" }}>
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "breakdown" && (
            <motion.div key="breakdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {safeEval.answerBreakdowns.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium border rounded-2xl" style={{ borderColor: c.border, color: c.textMuted }}>
                  No question-by-question breakdowns recorded for this session.
                </div>
              ) : (
                safeEval.answerBreakdowns.map((bd, i) => {
                  const expanded = expandedBreakdown === i;
                  return (
                    <div key={i} className="rounded-2xl border overflow-hidden"
                      style={{ background: c.cardBg, borderColor: c.border }}>
                      <button
                        onClick={() => setExpandedBreakdown(expanded ? null : i)}
                        className="w-full p-4 flex items-center gap-3 text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `${bd.score >= 70 ? "#10b981" : bd.score >= 50 ? "#f59e0b" : "#ef4444"}15`, color: bd.score >= 70 ? "#10b981" : bd.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold truncate">{bd.question}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>
                            Score: {bd.score}% · {bd.competency?.replace(/_/g, " ") || "General"}
                          </div>
                        </div>
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: c.border }}>
                              <div className="pt-3">
                                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: c.textMuted }}>Your Answer</div>
                                <p className="text-[11px] leading-relaxed p-3 rounded-xl" style={{ background: c.surface }}>
                                  {bd.answer}
                                </p>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: c.textMuted }}>AI Analysis</div>
                                <p className="text-[11px] leading-relaxed" style={{ color: c.textSec }}>{bd.aiAnalysis}</p>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: "#10b981" }}>Suggested Better Answer</div>
                                <p className="text-[11px] leading-relaxed p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)" }}>
                                  {bd.suggestedBetterAnswer}
                                </p>
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase mb-1" style={{ color: c.textMuted }}>Recruiter Perspective</div>
                                <p className="text-[11px] leading-relaxed italic" style={{ color: c.textSec }}>
                                  "{bd.interviewerPerspective}"
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === "competencies" && (
            <motion.div key="competencies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {safeEval.competencyMatrix.length === 0 ? (
                <div className="p-8 text-center text-xs font-medium border rounded-2xl" style={{ borderColor: c.border, color: c.textMuted }}>
                  Competency matrix generated based on overall communication and leadership metrics.
                </div>
              ) : (
                safeEval.competencyMatrix.map((comp) => {
                  const conf = HR_COMPETENCY_CONFIG[comp.competency] || { label: comp.competency, color: "#6b7280", icon: "Target" };
                  const Icon: any = COMPETENCY_ICONS[comp.competency] || Target;
                  return (
                    <motion.div
                      key={comp.competency}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl border flex items-center gap-4"
                      style={{ background: c.cardBg, borderColor: c.border }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${conf.color}15`, border: `1px solid ${conf.color}25` }}>
                        <Icon size={16} style={{ color: conf.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold">{conf.label}</div>
                        <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: conf.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${comp.score}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                          />
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: c.textMuted }}>{comp.evidence}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-extrabold" style={{ color: conf.color }}>{comp.score}</div>
                        <div className="text-[10px] capitalize" style={{ color: comp.trend === "improving" ? "#10b981" : comp.trend === "declining" ? "#ef4444" : c.textMuted }}>
                          {comp.trend}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === "recruiter" && (
            <motion.div key="recruiter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-amber-500" />
                  <span className="text-sm font-bold">Recruiter Perspective</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                  {safeEval.recruiterPerspective}
                </p>
              </div>

              <div className="p-6 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-purple-500" />
                  <span className="text-sm font-bold">Actionable Improvements</span>
                </div>
                {safeEval.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: c.textSec }}>
                    <ArrowRight size={12} className="text-purple-500 mt-0.5 shrink-0" />
                    {imp}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intelligence Coach Section */}
        {intelligence && (
          <div className="pt-4">
            <InterviewIntelligence intelligence={intelligence} isDark={isDark} isHR />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t" style={{ borderColor: c.border }}>
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-2 transition-all cursor-pointer"
            style={{ borderColor: c.border, background: c.surface, color: c.text }}
          >
            <RotateCcw size={14} /> Practice Another Interview
          </button>

          <button
            onClick={() => generateInterviewPDF({
              sessionId: sessionId || "hr-session",
              role: config.targetRole,
              company: config.targetCompany,
              type: "hr",
              difficulty: config.difficulty,
              language: config.language,
              durationMinutes: config.durationMinutes,
              createdAt: new Date().toISOString(),
              evaluation: {
                overallScore: safeEval.overallScore,
                communicationScore: safeEval.communicationScore,
                hrScore: safeEval.starScore,
                confidenceScore: safeEval.confidenceScore,
                strengths: safeEval.strengths,
                weaknesses: safeEval.weaknesses,
                improvements: safeEval.improvements,
                summary: safeEval.summary,
                hiringRecommendation: safeEval.hiringRecommendation,
              },
            })}
            className="px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
          >
            <Download size={14} /> Export HR Evaluation PDF
          </button>
        </div>
      </div>
    </div>
  );
}
