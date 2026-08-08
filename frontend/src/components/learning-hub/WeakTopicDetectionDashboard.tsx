"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { AIContent } from "@/components/ai/AIContent";
import { api } from "@/services/api";
import CountUp from "react-countup";
import {
  AlertTriangle, Brain, Target, BookOpen, Zap, TrendingUp, TrendingDown,
  RefreshCw, CheckCircle, Clock, Activity, Award, BarChart2, ChevronRight, Trophy,
  Flame, Shield, Cpu, Database, Sparkles, ArrowUp, ArrowDown, Circle,
  BookMarked, ListChecks, FileText, MessageSquare, Star, Eye, Play
} from "lucide-react";
import {
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumInput,
  PremiumDialog,
  PremiumTabs,
  PremiumProgressRing,
  PremiumProgressBar,
  AnimatedSkeleton,
  AIThinkingScreen,
  EmptyState as PremiumEmptyState,
  SuccessCelebration,
  ErrorState,
  FloatingOrbs
} from "@/components/ui/PremiumComponents";
import { useTheme } from "@/hooks/useTheme";


// ─── Color System ─────────────────────────────────────────────────────────────

const mkColors = (theme: string) => {
  const d = theme === "dark";
  return {
    isDark: d,
    bg: d ? "rgba(255,255,255,0.025)" : "#ffffff",
    surface: d ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    border: d ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    borderHover: d ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)",
    text: d ? "#e5e7eb" : "#0f172a",
    textSec: d ? "#9ca3af" : "#475569",
    textMuted: d ? "#6b7280" : "#94a3b8",
    cardBg: d ? "rgba(255,255,255,0.025)" : "#ffffff",
    stickyBg: d ? "rgba(10,10,20,0.88)" : "rgba(248,250,252,0.92)",
    divider: d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    rose: "#f43f5e",
    roseBg: d ? "rgba(244,63,94,0.08)" : "rgba(244,63,94,0.06)",
    roseBorder: d ? "rgba(244,63,94,0.18)" : "rgba(244,63,94,0.20)",
    amber: "#f59e0b",
    amberBg: d ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.06)",
    amberBorder: d ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.22)",
    emerald: "#10b981",
    emeraldBg: d ? "rgba(16,185,129,0.07)" : "rgba(16,185,129,0.06)",
    violet: "#8b5cf6",
    violetBg: d ? "rgba(139,92,246,0.07)" : "rgba(139,92,246,0.06)",
    violetBorder: d ? "rgba(139,92,246,0.16)" : "rgba(139,92,246,0.18)",
    inputBg: d ? "rgba(0,0,0,0.35)" : "#f1f5f9",
  };
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface WeakTopicItem {
  topicName: string;
  strengthScore: number;
  status: string;
  riskLevel: string;
  revisionPriority: string;
  retentionProbability: number;
  lastStudied: string | null;
  daysSinceStudied: number;
  questionAccuracy: number;
  revisionCount: number;
  recommendedAction: string;
}

interface WeakConceptItem {
  topicName: string;
  conceptName: string;
  masteryScore: number;
  riskLevel: string;
  recommendedAction: string;
}

interface RevisionQueueItem {
  topicName: string;
  priority: string;
  recommendedDate: string;
  reason: string;
  status: string;
}

interface DashboardData {
  overview: {
    weakTopicsCount: number;
    criticalTopicsCount: number;
    needRevisionCount: number;
    learningHealthScore: number;
    atRiskTopicsCount: number;
  };
  weakTopics: WeakTopicItem[];
  criticalTopics: WeakTopicItem[];
  revisionQueue: {
    immediate: RevisionQueueItem[];
    thisWeek: RevisionQueueItem[];
    thisMonth: RevisionQueueItem[];
    optional: RevisionQueueItem[];
  };
  weakConcepts: WeakConceptItem[];
  examRisk: { riskLevel: string; riskScore: number; affectedTopics: string[]; topRisks: string[] };
  interviewRisk: { riskLevel: string; riskScore: number; affectedTopics: string[]; topRisks: string[] };
  recommendations: {
    studyNext: { topic: string; reason: string }[];
    reviseNext: { topic: string; reason: string }[];
    practiceNext: { topic: string; reason: string }[];
    improveNext: { topic: string; reason: string }[];
  };
  coachInsight: string;
  lastAnalyzedAt: string;
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" } }),
};
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.06, duration: 0.4 } }),
};
const slideRight: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i = 0) => ({ opacity: 1, x: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getStatusColor(status: string, c: ReturnType<typeof mkColors>) {
  switch (status) {
    case "Critical": return { text: c.rose, bg: c.roseBg, border: c.roseBorder };
    case "Weak": return { text: c.amber, bg: c.amberBg, border: c.amberBorder };
    case "Average": return { text: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.18)" };
    case "Strong": return { text: c.emerald, bg: c.emeraldBg, border: "rgba(16,185,129,0.18)" };
    case "Excellent": return { text: "#a78bfa", bg: c.violetBg, border: c.violetBorder };
    default: return { text: c.textSec, bg: c.surface, border: c.border };
  }
}

function getPriorityColor(priority: string, c: ReturnType<typeof mkColors>) {
  switch (priority) {
    case "Immediate": return c.rose;
    case "This Week": return c.amber;
    case "This Month": return "#60a5fa";
    default: return c.textSec;
  }
}

function getRiskIcon(risk: string) {
  switch (risk) {
    case "Critical": return <AlertTriangle size={13} className="text-red-400" />;
    case "High": return <ArrowUp size={13} className="text-amber-400" />;
    case "Medium": return <Circle size={13} className="text-blue-400" />;
    default: return <ArrowDown size={13} className="text-emerald-400" />;
  }
}

function formatLastStudied(days: number): string {
  if (days >= 999) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ─── Animated Strength Ring ───────────────────────────────────────────────────

function StrengthRing({ score, size = 60 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const stroke = circ - (score / 100) * circ;
  const color = score < 40 ? "#f43f5e" : score < 60 ? "#f59e0b" : score < 75 ? "#60a5fa" : "#10b981";
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: stroke }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
    </svg>
  );
}

// ─── Floating Particles ───────────────────────────────────────────────────────

function FloatingParticles() {
  const [particles] = React.useState(() => Array.from({ length: 18 }, (_, i) => ({
    width: Math.random() * 4 + 1,
    height: Math.random() * 4 + 1,
    left: Math.random() * 100,
    top: Math.random() * 100,
    duration: 5 + Math.random() * 8,
    delay: Math.random() * 5,
    color: i % 3 === 0 ? "rgba(244,63,94,0.35)" : i % 3 === 1 ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.3)",
  })));

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.width,
            height: p.height,
            background: p.color,
            left: `${p.left}%`,
            top: `${p.top}%`,
          }}
          animate={{ y: [0, -40, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Pulse Ring ───────────────────────────────────────────────────────────────

function PulseRing({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
    </span>
  );
}

// ─── Loading Screen ───────────────────────────────────────────────────────────

const LOADING_STEPS = [
  "Analyzing Learning Activity",
  "Evaluating Topic Mastery",
  "Measuring Knowledge Retention",
  "Detecting Weak Topics",
  "Calculating Risk Scores",
  "Building Revision Queue",
  "Generating Recommendations",
  "Complete",
];

function LoadingScreen({ step }: { step: number }) {
  return (
    <div className="w-full max-w-lg mx-auto py-12 px-6">
      <AIThinkingScreen
        steps={LOADING_STEPS.slice(0, -1)}
        currentStep={step}
        title="AI Diagnostic Engine..."
        subtitle="Scanning your learning data..."
      />
    </div>
  );
}

function EmptyState({ onAnalyze, analyzing }: { onAnalyze: () => void; analyzing: boolean }) {
  return (
    <div className="w-full max-w-lg mx-auto py-8">
      <PremiumEmptyState
        title="No Weak Topics Detected"
        description="Your learning performance looks strong. Run a full AI analysis to get personalized insights, or continue studying to build more data."
        illustration={<Trophy className="w-8 h-8 text-amber-500" />}
        actionLabel={analyzing ? "Analyzing..." : "Run AI Analysis"}
        onAction={onAnalyze}
      />
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function WeakTopicDetectionDashboard() {
  const theme = useTheme();
  const c = mkColors(theme);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<"studyNext" | "reviseNext" | "practiceNext" | "improveNext">("studyNext");
  const [coachTyped, setCoachTyped] = useState("");
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const coachRef = useRef<NodeJS.Timeout | null>(null);

  // Load dashboard data
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadingStep(0);

    const stepInt = setInterval(() => {
      setLoadingStep((p) => (p < LOADING_STEPS.length - 2 ? p + 1 : p));
    }, 600);

    api.get("/weak-topics/dashboard")
      .then((res) => {
        if (!active) return;
        setData(res.data.data);
        setLoadingStep(LOADING_STEPS.length - 1);
        setTimeout(() => setLoading(false), 400);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; clearInterval(stepInt); };
  }, []);

  // Typing effect for coach insight
  useEffect(() => {
    if (!data?.coachInsight) return;
    setCoachTyped("");
    let i = 0;
    coachRef.current = setInterval(() => {
      setCoachTyped(data.coachInsight.slice(0, i + 1));
      i++;
      if (i >= data.coachInsight.length) clearInterval(coachRef.current!);
    }, 25);
    return () => { if (coachRef.current) clearInterval(coachRef.current); };
  }, [data?.coachInsight]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await api.post("/weak-topics/analyze");
      setData(res.data.data);
    } catch (e) {
      console.error("Analysis failed:", e);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <FloatingParticles />
        <LoadingScreen step={loadingStep} />
      </div>
    );
  }

  // ── Empty ──
  if (!data || data.weakTopics.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <FloatingParticles />
        <EmptyState onAnalyze={handleAnalyze} analyzing={analyzing} />
      </div>
    );
  }

  const { overview, weakTopics, criticalTopics, revisionQueue, weakConcepts, examRisk, interviewRisk, recommendations, coachInsight, lastAnalyzedAt } = data;

  const healthColor = overview.learningHealthScore >= 75 ? c.emerald : overview.learningHealthScore >= 55 ? c.amber : c.rose;

  // ── Dashboard ──
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 relative">
      <FloatingParticles />

      {/* ─── Analyze Button ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/30 font-bold tracking-widest uppercase">
            Last analyzed: {lastAnalyzedAt ? new Date(lastAnalyzedAt).toLocaleString() : "—"}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAnalyze}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
          style={{ background: "rgba(244,63,94,0.12)", border: "1px solid rgba(244,63,94,0.25)", color: c.rose }}
        >
          {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {analyzing ? "Analyzing..." : "Re-Analyze"}
        </motion.button>
      </div>

      {/* ─── SECTION 1: OVERVIEW CARDS ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: "Weak Topics", value: overview.weakTopicsCount, icon: <AlertTriangle size={16} />, color: c.rose, sub: "Need attention" },
          { label: "Critical Topics", value: overview.criticalTopicsCount, icon: <Flame size={16} />, color: "#ef4444", sub: "Urgent action" },
          { label: "Need Revision", value: overview.needRevisionCount, icon: <BookOpen size={16} />, color: c.amber, sub: "Scheduled" },
          { label: "At-Risk Topics", value: overview.atRiskTopicsCount, icon: <Activity size={16} />, color: "#a78bfa", sub: "Decaying knowledge" },
          { label: "Learning Health", value: overview.learningHealthScore, icon: <Shield size={16} />, color: healthColor, sub: "Overall score", isPercent: true },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, scale: 1.02 }}
            className="rounded-2xl p-4 relative overflow-hidden cursor-default"
            style={{ background: c.cardBg, border: `1px solid ${c.border}` }}
          >
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{ opacity: [0, 0.06, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
              style={{ background: `radial-gradient(circle at 50% 0%, ${card.color}, transparent 70%)` }}
            />
            <div className="flex items-center gap-2 mb-3" style={{ color: card.color }}>
              {card.icon}
              <span className="text-[10px] font-black tracking-widest uppercase text-white/40">{card.label}</span>
            </div>
            <div className="text-2xl font-black text-white">
              <CountUp end={card.value} duration={1.5} suffix={card.isPercent ? "%" : ""} />
            </div>
            <p className="text-[10px] text-white/30 font-semibold mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── SECTION 2: WEAK TOPICS TABLE ───────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
        className="rounded-2xl overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: c.divider }}>
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-rose-400" />
            <h2 className="font-black text-sm text-white">Weak Topics Analysis</h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: c.roseBg, color: c.rose, border: `1px solid ${c.roseBorder}` }}>
              {weakTopics.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${c.divider}` }}>
                {["Topic", "Strength", "Status", "Priority", "Last Studied", "Retention", "Action"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black tracking-widest uppercase" style={{ color: c.textMuted }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {weakTopics.map((topic, i) => {
                  const sc = getStatusColor(topic.status, c);
                  const isExpanded = expandedTopic === topic.topicName;
                  return (
                    <React.Fragment key={topic.topicName}>
                      <motion.tr
                        custom={i}
                        variants={slideRight}
                        initial="hidden"
                        animate="visible"
                        className="group cursor-pointer"
                        style={{ borderBottom: `1px solid ${c.divider}` }}
                        onClick={() => setExpandedTopic(isExpanded ? null : topic.topicName)}
                      >
                        {/* Topic name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <PulseRing color={topic.strengthScore < 40 ? c.rose : c.amber} />
                            <span className="text-sm font-bold" style={{ color: c.text }}>{topic.topicName}</span>
                            <ChevronRight size={12} className={`transition-transform ${isExpanded ? "rotate-90" : ""}`} style={{ color: c.textMuted }} />
                          </div>
                        </td>
                        {/* Strength bar */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${sc.text}99, ${sc.text})` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${topic.strengthScore}%` }}
                                transition={{ duration: 1, delay: i * 0.04 }}
                              />
                            </div>
                            <span className="text-xs font-black" style={{ color: sc.text }}>{topic.strengthScore}%</span>
                          </div>
                        </td>
                        {/* Status badge */}
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black"
                            style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            {topic.status}
                          </span>
                        </td>
                        {/* Priority */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold" style={{ color: getPriorityColor(topic.revisionPriority, c) }}>
                            {topic.revisionPriority}
                          </span>
                        </td>
                        {/* Last studied */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold" style={{ color: c.textSec }}>
                            {formatLastStudied(topic.daysSinceStudied)}
                          </span>
                        </td>
                        {/* Retention */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-black" style={{
                            color: topic.retentionProbability < 50 ? c.rose : topic.retentionProbability < 70 ? c.amber : c.emerald
                          }}>
                            {topic.retentionProbability}%
                          </span>
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-semibold text-white/40 max-w-[160px] block truncate">{topic.recommendedAction}</span>
                        </td>
                      </motion.tr>

                      {/* Expanded detail row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                          >
                            <td colSpan={7} className="px-4 pb-4">
                              <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-xl p-4 mt-2 grid grid-cols-3 gap-4"
                                style={{ background: c.surface, border: `1px solid ${c.border}` }}
                              >
                                <div>
                                  <p className="text-[10px] text-white/30 font-black tracking-widest uppercase mb-1">Question Accuracy</p>
                                  <p className="text-lg font-black" style={{ color: topic.questionAccuracy < 50 ? c.rose : c.emerald }}>{topic.questionAccuracy}%</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-white/30 font-black tracking-widest uppercase mb-1">Revision Count</p>
                                  <p className="text-lg font-black text-white">{topic.revisionCount}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-white/30 font-black tracking-widest uppercase mb-1">Risk Level</p>
                                  <div className="flex items-center gap-1.5">
                                    {getRiskIcon(topic.riskLevel)}
                                    <span className="text-sm font-black text-white">{topic.riskLevel}</span>
                                  </div>
                                </div>
                                <div className="col-span-3">
                                  <p className="text-[10px] text-white/30 font-black tracking-widest uppercase mb-1">Recommended Action</p>
                                  <div className="text-xs font-semibold" style={{ color: c.text }}><AIContent content={topic.recommendedAction} /></div>
                                </div>
                              </motion.div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ─── SECTION 3: CRITICAL TOPICS ─────────────────────────────────────── */}
      {criticalTopics.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-red-400" />
            <h2 className="font-black text-sm text-white">Critical Topics — Urgent Action Required</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {criticalTopics.map((topic, i) => (
              <motion.div
                key={topic.topicName}
                custom={i}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -5, scale: 1.02 }}
                className="rounded-2xl p-4 relative overflow-hidden"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)" }}
              >
                <motion.div
                  className="absolute inset-0"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  style={{ background: "radial-gradient(circle at 30% 0%, rgba(239,68,68,0.12), transparent 60%)" }}
                />
                <div className="flex items-center justify-between mb-3">
                  <PulseRing color="#ef4444" />
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-red-400" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    CRITICAL
                  </span>
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <StrengthRing score={topic.strengthScore} size={52} />
                  <div>
                    <p className="text-base font-black text-white">{topic.topicName}</p>
                    <p className="text-xs text-red-400 font-bold">{topic.strengthScore}% strength</p>
                  </div>
                </div>
                <p className="text-[10px] text-white/40 font-semibold">
                  {formatLastStudied(topic.daysSinceStudied)} · {topic.retentionProbability}% retention
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── SECTION 4: KNOWLEDGE DECAY + CONCEPTS (2-col) ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Knowledge Decay Analysis */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
          className="rounded-2xl p-5" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown size={16} className="text-amber-400" />
            <h2 className="font-black text-sm text-white">Knowledge Decay Analysis</h2>
          </div>
          <div className="space-y-3">
            {weakTopics.slice(0, 7).map((t, i) => (
              <motion.div key={t.topicName} custom={i} variants={slideRight} initial="hidden" animate="visible"
                className="flex items-center gap-3">
                <div className="w-28 flex-shrink-0">
                  <p className="text-xs font-bold text-white/80 truncate">{t.topicName}</p>
                </div>
                <div className="flex-1 h-3 rounded-full overflow-hidden relative" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full rounded-full relative overflow-hidden"
                    style={{
                      background: t.retentionProbability < 40
                        ? "linear-gradient(90deg, #dc2626, #f43f5e)"
                        : t.retentionProbability < 65
                          ? "linear-gradient(90deg, #d97706, #f59e0b)"
                          : "linear-gradient(90deg, #059669, #10b981)"
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${t.retentionProbability}%` }}
                    transition={{ duration: 1.2, delay: i * 0.07 }}
                  >
                    <motion.div
                      className="absolute inset-0"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }}
                    />
                  </motion.div>
                </div>
                <div className="w-12 text-right">
                  <span className="text-xs font-black" style={{
                    color: t.retentionProbability < 40 ? c.rose : t.retentionProbability < 65 ? c.amber : c.emerald
                  }}>
                    {t.retentionProbability}%
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="text-[10px] text-white/30 font-semibold mt-4 pt-3" style={{ borderTop: `1px solid ${c.divider}` }}>
            Retention probability calculated using Ebbinghaus forgetting curve model
          </p>
        </motion.div>

        {/* Weak Concepts */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}
          className="rounded-2xl p-5" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 mb-5">
            <Cpu size={16} className="text-violet-400" />
            <h2 className="font-black text-sm text-white">Weak Concepts Detected</h2>
          </div>

          {weakConcepts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Brain size={28} className="text-white/10 mb-2" />
              <p className="text-xs text-white/30">Run AI Analysis to detect weak concepts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {weakConcepts.map((c2, i) => {
                const sc = getStatusColor(
                  c2.masteryScore < 40 ? "Critical" : c2.masteryScore < 60 ? "Weak" : c2.masteryScore < 75 ? "Average" : "Strong",
                  c
                );
                return (
                  <motion.div
                    key={`${c2.topicName}-${c2.conceptName}`}
                    custom={i}
                    variants={slideRight}
                    initial="hidden"
                    animate="visible"
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: c.surface, border: `1px solid ${c.border}` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{c2.conceptName}</p>
                      <p className="text-[10px] font-semibold text-white/40 truncate">{c2.topicName}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {getRiskIcon(c2.riskLevel)}
                      <span className="text-xs font-black" style={{ color: sc.text }}>{c2.masteryScore}%</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* ─── SECTION 5: REVISION QUEUE ──────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}
        className="rounded-2xl p-5" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
        <div className="flex items-center gap-2 mb-5">
          <ListChecks size={16} className="text-blue-400" />
          <h2 className="font-black text-sm text-white">Revision Priority Queue</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { key: "immediate", label: "Immediate", color: c.rose, items: revisionQueue.immediate, icon: <AlertTriangle size={13} /> },
            { key: "thisWeek", label: "This Week", color: c.amber, items: revisionQueue.thisWeek, icon: <Clock size={13} /> },
            { key: "thisMonth", label: "This Month", color: "#60a5fa", items: revisionQueue.thisMonth, icon: <BookMarked size={13} /> },
            { key: "optional", label: "Optional", color: c.textSec, items: revisionQueue.optional, icon: <Star size={13} /> },
          ].map((bucket, bi) => (
            <div key={bucket.key}>
              <div className="flex items-center gap-1.5 mb-3" style={{ color: bucket.color }}>
                {bucket.icon}
                <span className="text-xs font-black tracking-wide">{bucket.label}</span>
                <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: `${bucket.color}18`, color: bucket.color }}>
                  {bucket.items.length}
                </span>
              </div>
              <div className="space-y-2">
                {bucket.items.length === 0 ? (
                  <p className="text-[10px] text-white/20 font-semibold">No topics</p>
                ) : (
                  bucket.items.map((item, ii) => (
                    <motion.div
                      key={item.topicName}
                      custom={bi * 5 + ii}
                      variants={fadeUp}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ x: 3 }}
                      className="p-2.5 rounded-xl cursor-pointer"
                      style={{ background: c.surface, border: `1px solid ${c.border}` }}
                    >
                      <p className="text-xs font-black text-white mb-0.5 truncate">{item.topicName}</p>
                      <p className="text-[10px] text-white/35 font-semibold truncate">{item.reason}</p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── SECTION 6: EXAM + INTERVIEW RISK ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { risk: examRisk, label: "Exam Risk Analysis", icon: <FileText size={16} />, color: c.rose },
          { risk: interviewRisk, label: "Interview Risk Analysis", icon: <MessageSquare size={16} />, color: c.violet },
        ].map((item, ri) => {
          const riskColor = item.risk.riskLevel === "Critical" ? "#ef4444"
            : item.risk.riskLevel === "High" ? c.rose
              : item.risk.riskLevel === "Medium" ? c.amber
                : c.emerald;

          return (
            <motion.div
              key={item.label}
              custom={ri + 5}
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="rounded-2xl p-5"
              style={{ background: c.cardBg, border: `1px solid ${c.border}` }}
            >
              <div className="flex items-center gap-2 mb-4" style={{ color: item.color }}>
                {item.icon}
                <h2 className="font-black text-sm text-white">{item.label}</h2>
              </div>

              <div className="flex items-end gap-4 mb-4">
                <div className="relative">
                  <StrengthRing score={100 - item.risk.riskScore} size={72} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-black" style={{ color: riskColor }}>
                      {item.risk.riskScore}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/40 font-semibold">Risk Level</p>
                  <p className="text-lg font-black" style={{ color: riskColor }}>{item.risk.riskLevel}</p>
                  <p className="text-[10px] text-white/30 font-semibold">{item.risk.affectedTopics.length} topics affected</p>
                </div>
              </div>

              {item.risk.topRisks.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black tracking-widest uppercase text-white/30 mb-2">Top Risks</p>
                  {item.risk.topRisks.map((r, ri2) => (
                    <motion.div key={ri2} custom={ri2} variants={slideRight} initial="hidden" animate="visible"
                      className="flex items-center gap-2 text-xs font-semibold p-2 rounded-lg"
                      style={{ background: c.surface, color: c.textSec }}>
                      <ChevronRight size={11} style={{ color: riskColor }} />
                      {r}
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ─── SECTION 7: AI RECOMMENDATIONS ─────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}
        className="rounded-2xl p-5" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={16} className="text-amber-400" />
          <h2 className="font-black text-sm text-white">Recovery Recommendations</h2>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { key: "studyNext", label: "Study Next", icon: <BookOpen size={12} />, color: c.rose },
            { key: "reviseNext", label: "Revise Next", icon: <RefreshCw size={12} />, color: c.amber },
            { key: "practiceNext", label: "Practice Next", icon: <Target size={12} />, color: "#60a5fa" },
            { key: "improveNext", label: "Improve Next", icon: <TrendingUp size={12} />, color: c.emerald },
          ].map((tab) => (
            <motion.button
              key={tab.key}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all"
              style={{
                background: activeTab === tab.key ? `${tab.color}18` : c.surface,
                color: activeTab === tab.key ? tab.color : c.textSec,
                border: `1px solid ${activeTab === tab.key ? `${tab.color}35` : c.border}`,
              }}
            >
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Recommendations List */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {(recommendations[activeTab] ?? []).map((rec, i) => (
              <motion.div
                key={rec.topic}
                custom={i}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -3, scale: 1.02 }}
                className="p-4 rounded-xl"
                style={{ background: c.surface, border: `1px solid ${c.border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Play size={12} className="text-rose-400" />
                  <p className="text-sm font-black text-white truncate">{rec.topic}</p>
                </div>
                <p className="text-xs text-white/40 font-semibold leading-relaxed">{rec.reason}</p>
              </motion.div>
            ))}
            {(recommendations[activeTab] ?? []).length === 0 && (
              <p className="text-xs text-white/30 col-span-3">No recommendations available. Run AI Analysis first.</p>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ─── SECTION 8: AI LEARNING COACH ───────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={7}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(244,63,94,0.06) 100%)", border: "1px solid rgba(139,92,246,0.18)" }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
          style={{ background: "radial-gradient(ellipse at 0% 0%, rgba(139,92,246,0.12) 0%, transparent 60%)" }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center shadow-lg"
            >
              <Brain size={18} className="text-white" />
            </motion.div>
            <div>
              <p className="text-sm font-black text-white">AI Learning Coach</p>
              <p className="text-[10px] text-white/40 font-semibold tracking-widest uppercase">Personalized Guidance</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black text-violet-300"
              style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <Sparkles size={10} />
              AI Generated
            </div>
          </div>

          <div className="p-4 rounded-xl" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-sm text-white/80 font-medium leading-relaxed min-h-[2.5rem]">
              {coachTyped}
              {coachTyped.length < (coachInsight?.length ?? 0) && (
                <motion.span
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="inline-block w-0.5 h-4 bg-violet-400 ml-0.5 align-middle"
                />
              )}
            </p>
          </div>

          {/* Coaching stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { icon: <AlertTriangle size={13} />, label: "Weak Topics", value: overview.weakTopicsCount, color: c.rose },
              { icon: <Activity size={13} />, label: "At Risk", value: overview.atRiskTopicsCount, color: c.amber },
              { icon: <Shield size={13} />, label: "Health Score", value: `${overview.learningHealthScore}%`, color: healthColor },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 p-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: stat.color }}>{stat.icon}</span>
                <div>
                  <p className="text-[10px] text-white/30 font-semibold">{stat.label}</p>
                  <p className="text-sm font-black text-white">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

    </div>
  );
}

