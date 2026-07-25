"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Star, TrendingUp, MessageSquare, Crown, Users, Shield,
  Brain, Heart, Globe, Flame, Target, Award, ChevronDown, ChevronUp,
  Download, RotateCcw, BarChart3, Eye, Check, X, ArrowRight,
} from "lucide-react";
import type { HREvaluation, HRAnswerBreakdown, IntelligenceData } from "./HRTypes";
import { HR_COMPETENCY_CONFIG } from "./HRTypes";
import { generateInterviewPDF } from "@/utils/interview-pdf";
import InterviewIntelligence from "@/components/interview-hub/shared/InterviewIntelligence";

interface HRReportProps {
  sessionId: string;
  evaluation: HREvaluation;
  messages: any[];
  config: any;
  onRetry: () => void;
  onViewAnalytics: () => void;
}

const COMPETENCY_ICONS: Record<string, React.ComponentType<any>> = {
  communication: MessageSquare,
  leadership: Crown,
  teamwork: Users,
  ownership: Shield,
  problem_solving: Brain,
  adaptability: TrendingUp,
  emotional_intelligence: Heart,
  professionalism: Award,
  cultural_fit: Globe,
  motivation: Flame,
};

function ScoreRing({ score, size = 120, strokeWidth = 8, label }: { score: number; size?: number; strokeWidth?: number; label?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="font-extrabold"
          style={{ fontSize: size * 0.28, color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        {label && <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>}
      </div>
    </div>
  );
}

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

  const getRecommendationConfig = (rec: string) => {
    switch (rec) {
      case "strong_recommend": return { label: "Strong Hire", color: "#10b981", bg: "rgba(16,185,129,0.1)" };
      case "recommend": return { label: "Hire", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
      case "maybe": return { label: "Maybe", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
      default: return { label: "No Hire", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    }
  };

  const recConfig = getRecommendationConfig(evaluation.hiringRecommendation);

  useEffect(() => {
    const fetchIntelligence = async () => {
      if (!sessionId) return;
      setLoadingIntelligence(true);
      try {
        const token = localStorage.getItem("adyapan-token");
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
        const res = await fetch(`${base}/api/hr-interview/${sessionId}/coach`, {
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
    <div className="min-h-full" style={{ background: c.bg, fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(139,92,246,0.05) 50%, rgba(59,130,246,0.05) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={evaluation.overallScore} size={140} strokeWidth={10} label="Overall" />
            <div className="flex-1 text-left space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: recConfig.bg, color: recConfig.color }}>
                <Award size={12} /> {recConfig.label}
              </div>
              <h1 className="text-2xl font-extrabold">HR Interview Report</h1>
              <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                {evaluation.summary}
              </p>
              <div className="flex flex-wrap gap-4">
                {[
                  { label: "Communication", score: evaluation.communicationScore },
                  { label: "STAR", score: evaluation.starScore },
                  { label: "Leadership", score: evaluation.leadershipScore },
                  { label: "Confidence", score: evaluation.confidenceScore },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-lg font-extrabold" style={{ color: s.score >= 70 ? c.green : s.score >= 50 ? c.amber : c.red }}>
                      {s.score}
                    </div>
                    <div className="text-[9px] font-bold uppercase" style={{ color: c.textMuted }}>{s.label}</div>
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
              className="flex-1 py-2 rounded-lg text-[11px] font-bold transition-all"
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
                  { label: "Teamwork", score: evaluation.teamworkScore, color: "#10b981" },
                  { label: "Ownership", score: evaluation.ownershipScore, color: "#f59e0b" },
                  { label: "Adaptability", score: evaluation.adaptabilityScore, color: "#06b6d4" },
                  { label: "EQ", score: evaluation.emotionalIntelligence, color: "#ec4899" },
                  { label: "Professionalism", score: evaluation.professionalism, color: "#6366f1" },
                  { label: "Cultural Fit", score: evaluation.culturalFit, color: "#f97316" },
                  { label: "Motivation", score: evaluation.motivation, color: "#ef4444" },
                  { label: "STAR Score", score: evaluation.starScore, color: "#8b5cf6" },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl border text-center"
                    style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="text-lg font-extrabold" style={{ color: item.color }}>{item.score}</div>
                    <div className="text-[9px] font-bold" style={{ color: c.textMuted }}>{item.label}</div>
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
                  {evaluation.strengths.map((s, i) => (
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
                  {evaluation.weaknesses.map((w, i) => (
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
                  {evaluation.nextPracticeTopics.map((topic, i) => (
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
              {evaluation.answerBreakdowns.map((bd, i) => {
                const expanded = expandedBreakdown === i;
                return (
                  <div key={i} className="rounded-2xl border overflow-hidden"
                    style={{ background: c.cardBg, borderColor: c.border }}>
                    <button
                      onClick={() => setExpandedBreakdown(expanded ? null : i)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: `${bd.score >= 70 ? "#10b981" : bd.score >= 50 ? "#f59e0b" : "#ef4444"}15`, color: bd.score >= 70 ? "#10b981" : bd.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-bold truncate">{bd.question}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: c.textMuted }}>
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
                              <div className="text-[9px] font-bold uppercase mb-1" style={{ color: c.textMuted }}>Your Answer</div>
                              <p className="text-[11px] leading-relaxed p-3 rounded-xl" style={{ background: c.surface }}>
                                {bd.answer}
                              </p>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold uppercase mb-1" style={{ color: c.textMuted }}>AI Analysis</div>
                              <p className="text-[11px] leading-relaxed" style={{ color: c.textSec }}>{bd.aiAnalysis}</p>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold uppercase mb-1" style={{ color: "#10b981" }}>Suggested Better Answer</div>
                              <p className="text-[11px] leading-relaxed p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.1)" }}>
                                {bd.suggestedBetterAnswer}
                              </p>
                            </div>
                            <div>
                              <div className="text-[9px] font-bold uppercase mb-1" style={{ color: c.textMuted }}>Recruiter Perspective</div>
                              <p className="text-[11px] leading-relaxed italic" style={{ color: c.textSec }}>
                                "{bd.interviewerPerspective}"
                              </p>
                            </div>
                            {/* STAR & Communication in breakdown */}
                            <div className="grid grid-cols-2 gap-3">
                              {bd.starAnalysis && (
                                <div className="p-3 rounded-xl" style={{ background: c.surface }}>
                                  <div className="text-[9px] font-bold mb-1.5 flex items-center gap-1">
                                    <Star size={9} className="text-amber-500" /> STAR: {bd.starAnalysis.score}%
                                  </div>
                                  <div className="flex gap-2 text-[8px]">
                                    {(["hasSituation", "hasTask", "hasAction", "hasResult"] as const).map((k) => (
                                      <span key={k} className={`px-1.5 py-0.5 rounded ${bd.starAnalysis[k] ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                                        {k.replace("has", "")}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {bd.communicationAnalysis && (
                                <div className="p-3 rounded-xl" style={{ background: c.surface }}>
                                  <div className="text-[9px] font-bold mb-1.5 flex items-center gap-1">
                                    <MessageSquare size={9} className="text-blue-500" /> Comm: {bd.communicationAnalysis.overallScore}%
                                  </div>
                                  <p className="text-[8px]" style={{ color: c.textMuted }}>{bd.communicationAnalysis.feedback}</p>
                                </div>
                              )}
                            </div>
                            {bd.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {bd.tags.map((tag) => (
                                  <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded font-bold"
                                    style={{ background: "rgba(255,255,255,0.04)", color: c.textMuted }}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === "competencies" && (
            <motion.div key="competencies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {evaluation.competencyMatrix?.map((comp) => {
                const config = HR_COMPETENCY_CONFIG[comp.competency] || { label: comp.competency, color: "#6b7280", icon: "Target" };
                const Icon = COMPETENCY_ICONS[comp.competency] || Target;
                return (
                  <motion.div
                    key={comp.competency}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border flex items-center gap-4"
                    style={{ background: c.cardBg, borderColor: c.border }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${config.color}15`, border: `1px solid ${config.color}25` }}>
                      <Icon size={16} style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold">{config.label}</div>
                      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: config.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${comp.score}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                        />
                      </div>
                      <div className="text-[9px] mt-1" style={{ color: c.textMuted }}>{comp.evidence}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-extrabold" style={{ color: config.color }}>{comp.score}</div>
                      <div className="text-[8px] capitalize" style={{ color: comp.trend === "improving" ? "#10b981" : comp.trend === "declining" ? "#ef4444" : c.textMuted }}>
                        {comp.trend}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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
                  {evaluation.recruiterPerspective || evaluation.summary}
                </p>
              </div>

              <div className="p-6 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <Target size={14} className="text-purple-500" />
                  <span className="text-sm font-bold">Actionable Improvements</span>
                </div>
                {evaluation.improvements.map((imp, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px]" style={{ color: c.textSec }}>
                    <ArrowRight size={12} className="text-purple-500 mt-0.5 shrink-0" />
                    {imp}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ INTELLIGENCE LAYER ═══ */}
        {(intelligence || loadingIntelligence) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {loadingIntelligence && !intelligence ? (
              <div className="p-8 rounded-3xl border text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3" style={{ borderColor: "#8b5cf6", borderTopColor: "transparent" }} />
                <p className="text-xs" style={{ color: c.textMuted }}>Generating AI coaching intelligence...</p>
              </div>
            ) : intelligence ? (
              <InterviewIntelligence intelligence={intelligence} isDark={isDark} isHR />
            ) : null}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border text-xs font-bold"
            style={{ borderColor: c.border, color: c.textSec }}
          >
            <RotateCcw size={14} /> Practice Again
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onViewAnalytics}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border text-xs font-bold"
            style={{ borderColor: c.border, color: c.textSec }}
          >
            <BarChart3 size={14} /> View Analytics
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => generateInterviewPDF({
              sessionId,
              role: config?.targetRole || "HR Interview",
              company: config?.targetCompany || "",
              type: config?.interviewType || "general_hr",
              difficulty: config?.difficulty || "medium",
              language: config?.language || "en",
              durationMinutes: config?.durationMinutes || 30,
              createdAt: new Date().toISOString(),
              evaluation: {
                overallScore: evaluation.overallScore || 0,
                communicationScore: evaluation.communicationScore || 0,
                hrScore: evaluation.overallScore || 0,
                strengths: evaluation.strengths || [],
                weaknesses: evaluation.weaknesses || [],
                improvements: evaluation.improvements || [],
                summary: evaluation.summary || "",
                hiringRecommendation: evaluation.hiringRecommendation || "",
              },
            } as any)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-black"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <Download size={14} /> Download PDF
          </motion.button>
        </div>
      </div>
    </div>
  );
}
