"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  BookOpen,
  FileText,
  Sparkles,
  Star,
  ArrowRight,
  Calendar,
  BarChart3,
  Compass,
  Code2,
  Terminal,
  Cpu,
  Layers,
  Award,
  Zap,
  ExternalLink,
  Flame,
  Check,
  X,
  HelpCircle,
  Activity,
  PieChart,
} from "lucide-react";
import Link from "next/link";
import FormattedMarkdown from "@/components/shared/FormattedMarkdown";

// ─── Intelligence Layer Types ────────────────────────────────────────────

export interface CommunicationInsight {
  confidence: number;
  clarity: number;
  professionalism: number;
  answerStructure: number;
  conciseness: number;
  fillerWordsDetected: boolean;
  speakingPace: string;
  feedback: string;
  suggestions: string[];
}

export interface InterviewFlowPhase {
  phase: string;
  startTime: number;
  endTime: number;
  questionCount: number;
  averageScore: number;
  trend: "improving" | "declining" | "stable";
  notes: string;
}

export interface FollowUpAnalysis {
  questionsAnsweredConfidently: Array<{ question: string; score: number }>;
  questionsRequiringHints: Array<{ question: string; score: number; hint: string }>;
  questionsWithIncompleteReasoning: Array<{ question: string; score: number; issue: string }>;
  questionsAvoided: Array<{ question: string; reason: string }>;
  questionsAnsweredIncorrectly: Array<{ question: string; score: number; correction: string }>;
}

export interface AICoachOutput {
  topPriorities: Array<{ priority: number; area: string; action: string; impact: string; timeframe: string }>;
  topicsToRevise: string[];
  codingTopics: string[];
  behavioralTopics: string[];
  communicationExercises: string[];
  resumeImprovements: string[];
  learningHubRecommendations: string[];
  codingHubRecommendations: string[];
  careerRoadmapUpdates: string[];
  biggestStrength: string;
  biggestWeakness: string;
  interviewReadiness: number;
  nextRecommendedInterview: string;
  overallSummary: string;
}

export interface PracticePlan {
  todayGoal: string;
  todayTasks: Array<{ task: string; category: string; estimatedMinutes: number }>;
  thisWeek: Array<{ goal: string; tasks: string[]; deadline: string }>;
  thisMonth: Array<{ milestone: string; targetDate: string; checkpoints: string[] }>;
  suggestedInterviewType: string;
  recommendedCodingProblems: string[];
  learningModules: string[];
  resumeTasks: string[];
}

export interface ResumeImpact {
  projectImprovements: string[];
  resumeBulletRewrites: string[];
  experienceClarifications: string[];
  linkedInUpdates: string[];
  overallResumeAdvice: string;
}

export interface CompetencyRadarItem {
  competency: string;
  score: number;
  benchmark: number;
}

export interface QuestionByQuestionItem {
  questionNumber: number;
  question: string;
  candidateResponse: string;
  transcriptSnippet: string;
  aiAnalysis: string;
  idealAnswer: string;
  commonMistakes: string[];
  improvedAnswer: string;
  recruiterPerspective: string;
  score: number;
}

export interface STARAnalysisItem {
  questionNumber: number;
  question: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  missingComponents: string[];
  suggestedSTARRewrite: string;
  recruiterPerspective: string;
}

export interface AlternativeSolution {
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
}

export interface TechnicalFeedbackDetails {
  codeCorrectnessScore: number;
  optimizationScore: number;
  namingScore: number;
  architectureScore: number;
  edgeCasesHandled: string[];
  testingAdvice: string[];
  timeComplexity: string;
  spaceComplexity: string;
  alternativeSolutions: AlternativeSolution[];
  faangExpectations: string;
}

export interface ChartAnalyticsData {
  performanceByQuestion: Array<{ question: string; score: number }>;
  technicalVsCommunication: Array<{ metric: string; technicalScore: number; communicationScore: number }>;
  confidenceTrend: Array<{ questionIndex: number; confidenceScore: number }>;
  speakingTimeDistribution: Array<{ category: string; percentage: number }>;
  topicPerformance: Array<{ topic: string; score: number }>;
}

export interface IntelligenceData {
  communicationInsights: CommunicationInsight;
  interviewFlow: InterviewFlowPhase[];
  followUpAnalysis: FollowUpAnalysis;
  aiCoach: AICoachOutput;
  practicePlan: PracticePlan;
  resumeImpact: ResumeImpact;
  competencyRadar: CompetencyRadarItem[];
  improvementSinceLast: {
    scoreDelta: number;
    newStrengths: string[];
    persistentWeaknesses: string[];
  };
  questionReviews?: QuestionByQuestionItem[];
  starAnalysis?: STARAnalysisItem[];
  technicalFeedback?: TechnicalFeedbackDetails;
  charts?: ChartAnalyticsData;
}

interface InterviewIntelligenceProps {
  intelligence: IntelligenceData;
  isDark: boolean;
  isHR?: boolean;
  isTechnical?: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

// ─── Stage Loading Experience Component ─────────────────────────────────────

export function StageLoadingOverlay({
  currentStage,
  isDark,
}: {
  currentStage: number;
  isDark: boolean;
}) {
  const stages = [
    "Analyzing Responses",
    "Reviewing Transcript",
    "Evaluating Technical Depth",
    "Assessing Communication",
    "Generating Personalized Coaching",
    "Preparing Practice Plan",
    "Ready",
  ];

  return (
    <div
      className="p-8 rounded-3xl border flex flex-col items-center justify-center text-center space-y-6"
      style={{
        background: isDark ? "rgba(15,13,25,0.95)" : "#ffffff",
        borderColor: isDark ? "rgba(139,92,246,0.2)" : "#e5e7eb",
      }}
    >
      <div className="relative flex items-center justify-center">
        <motion.div
          className="w-20 h-20 rounded-full border-4 border-t-purple-500 border-r-cyan-400 border-b-amber-400 border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
        <Brain className="w-8 h-8 text-purple-400 absolute" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-lg font-extrabold" style={{ color: isDark ? "#fff" : "#111827" }}>
          AI Interview Intelligence Engine
        </h3>
        <p className="text-xs font-semibold text-purple-400 animate-pulse">
          {stages[Math.min(currentStage, stages.length - 1)]}...
        </p>
      </div>

      <div className="w-full max-w-md space-y-2">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #8b5cf6, #06b6d4)" }}
            initial={{ width: "5%" }}
            animate={{ width: `${Math.min(100, Math.round(((currentStage + 1) / stages.length) * 100))}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-bold text-gray-400 px-1">
          <span>Processing session metrics</span>
          <span>{Math.min(100, Math.round(((currentStage + 1) / stages.length) * 100))}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components & SVG Charts ──────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  isDark,
  badge,
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  title: string;
  isDark: boolean;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{
          background: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)",
          border: `1px solid ${isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)"}`,
        }}
      >
        <Icon size={18} className="text-purple-400" />
      </div>
      <h3 className="text-base font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
        {title}
      </h3>
      {badge && (
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto"
          style={{
            background: "rgba(139,92,246,0.12)",
            color: "#8b5cf6",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

function TrendIcon({ trend }: { trend: "improving" | "declining" | "stable" }) {
  if (trend === "improving") return <TrendingUp size={14} className="text-green-400" />;
  if (trend === "declining") return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-yellow-400" />;
}

// Interactive SVG Bar Chart for Question Scores
function QuestionScoreChart({
  data,
  isDark,
}: {
  data: Array<{ question: string; score: number }>;
  isDark: boolean;
}) {
  if (!data || data.length === 0) return null;
  const maxScore = 100;

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5 mb-2">
        <BarChart3 size={13} /> Performance by Question
      </div>
      <div className="h-40 flex items-end gap-3 pt-6 pb-2 px-3 rounded-2xl" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
        {data.map((item, idx) => {
          const heightPct = Math.max(10, Math.min(100, (item.score / maxScore) * 100));
          const col = item.score >= 80 ? "#10b981" : item.score >= 60 ? "#f59e0b" : "#ef4444";
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
              <span className="text-[10px] font-extrabold transition-transform group-hover:scale-110" style={{ color: col }}>
                {item.score}%
              </span>
              <motion.div
                className="w-full rounded-t-lg relative"
                style={{ background: `linear-gradient(180deg, ${col}, ${col}88)` }}
                initial={{ height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={{ duration: 0.8, delay: idx * 0.1 }}
              />
              <span className="text-[10px] font-medium truncate max-w-full" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
                {item.question}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Line Chart for Confidence Trend across questions
function ConfidenceTrendChart({
  data,
  isDark,
}: {
  data: Array<{ questionIndex: number; confidenceScore: number }>;
  isDark: boolean;
}) {
  if (!data || data.length === 0) return null;
  const points = data.map((d, i) => {
    const x = (i / Math.max(1, data.length - 1)) * 260 + 20;
    const y = 110 - (d.confidenceScore / 100) * 90;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
        <Activity size={13} /> Confidence Trend Across Session
      </div>
      <div className="relative rounded-2xl p-4 flex flex-col items-center" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
        <svg width="300" height="120" className="overflow-visible">
          {/* Grid lines */}
          <line x1="20" y1="20" x2="280" y2="20" stroke={isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb"} strokeDasharray="3 3" />
          <line x1="20" y1="65" x2="280" y2="65" stroke={isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb"} strokeDasharray="3 3" />
          <line x1="20" y1="110" x2="280" y2="110" stroke={isDark ? "rgba(255,255,255,0.05)" : "#e5e7eb"} strokeDasharray="3 3" />

          {/* Polyline */}
          <motion.polyline
            fill="none"
            stroke="#06b6d4"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />

          {/* Points */}
          {data.map((d, i) => {
            const cx = (i / Math.max(1, data.length - 1)) * 260 + 20;
            const cy = 110 - (d.confidenceScore / 100) * 90;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r="4"
                fill="#06b6d4"
                stroke={isDark ? "#080710" : "#ffffff"}
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Donut Chart for Speaking Time Distribution
function SpeakingTimeChart({
  data,
  isDark,
}: {
  data: Array<{ category: string; percentage: number }>;
  isDark: boolean;
}) {
  if (!data || data.length === 0) return null;
  const colors = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981"];

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
        <PieChart size={13} /> Speaking Time & Pace Distribution
      </div>
      <div className="p-4 rounded-2xl flex items-center justify-around gap-4" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb" }}>
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg width="96" height="96" viewBox="0 0 36 36" className="-rotate-90">
            {data.map((item, idx) => {
              const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
              const offset = data.slice(0, idx).reduce((acc, curr) => acc + curr.percentage, 0);
              return (
                <circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="transparent"
                  stroke={colors[idx % colors.length]}
                  strokeWidth="3.8"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={-offset}
                />
              );
            })}
          </svg>
          <div className="absolute text-[10px] font-extrabold" style={{ color: isDark ? "#fff" : "#111827" }}>
            Pace
          </div>
        </div>

        <div className="space-y-1.5 flex-1">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors[idx % colors.length] }} />
                <span style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#4b5563" }}>{item.category}</span>
              </div>
              <span className="font-bold" style={{ color: colors[idx % colors.length] }}>
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export default function InterviewIntelligence({
  intelligence,
  isDark,
  isHR = false,
  isTechnical = false,
}: InterviewIntelligenceProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["coach", "questions", "star", "technical", "practice", "charts"])
  );
  const [openQuestionIndex, setOpenQuestionIndex] = useState<number | null>(0);
  const [openStarIndex, setOpenStarIndex] = useState<number | null>(0);
  const [expandedFollowUps, setExpandedFollowUps] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleFollowUp = (key: string) => {
    setExpandedFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const {
    communicationInsights,
    interviewFlow,
    followUpAnalysis,
    aiCoach,
    practicePlan,
    resumeImpact,
    competencyRadar,
    improvementSinceLast,
    questionReviews = [],
    starAnalysis = [],
    technicalFeedback,
    charts,
  } = intelligence;

  const readinessColor =
    aiCoach.interviewReadiness >= 80
      ? "#10b981"
      : aiCoach.interviewReadiness >= 60
        ? "#f59e0b"
        : "#ef4444";

  const followUpSections = useMemo(() => {
    const sections: Array<{
      key: string;
      label: string;
      icon: React.ComponentType<{ size?: number }>;
      items: any[];
      color: string;
    }> = [];
    if (followUpAnalysis?.questionsAnsweredConfidently?.length > 0) {
      sections.push({
        key: "confident",
        label: "Confidently Answered",
        icon: CheckCircle2,
        items: followUpAnalysis.questionsAnsweredConfidently,
        color: "#10b981",
      });
    }
    if (followUpAnalysis?.questionsRequiringHints?.length > 0) {
      sections.push({
        key: "hints",
        label: "Required Hints",
        icon: Lightbulb,
        items: followUpAnalysis.questionsRequiringHints,
        color: "#f59e0b",
      });
    }
    if (followUpAnalysis?.questionsWithIncompleteReasoning?.length > 0) {
      sections.push({
        key: "incomplete",
        label: "Incomplete Reasoning",
        icon: AlertTriangle,
        items: followUpAnalysis.questionsWithIncompleteReasoning,
        color: "#f97316",
      });
    }
    if (followUpAnalysis?.questionsAvoided?.length > 0) {
      sections.push({
        key: "avoided",
        label: "Questions Avoided",
        icon: AlertTriangle,
        items: followUpAnalysis.questionsAvoided,
        color: "#ef4444",
      });
    }
    if (followUpAnalysis?.questionsAnsweredIncorrectly?.length > 0) {
      sections.push({
        key: "incorrect",
        label: "Answered Incorrectly",
        icon: AlertTriangle,
        items: followUpAnalysis.questionsAnsweredIncorrectly,
        color: "#dc2626",
      });
    }
    return sections;
  }, [followUpAnalysis]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 font-['Outfit',sans-serif]">

      {/* ─── IMPROVEMENT & DELTA BANNER ────────────────────────────────── */}
      {improvementSinceLast && improvementSinceLast.scoreDelta !== 0 && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{
            background:
              improvementSinceLast.scoreDelta > 0
                ? isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)"
                : isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)",
            border: `1px solid ${improvementSinceLast.scoreDelta > 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          {improvementSinceLast.scoreDelta > 0 ? (
            <TrendingUp size={24} className="text-green-400" />
          ) : (
            <TrendingDown size={24} className="text-red-400" />
          )}
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
              {improvementSinceLast.scoreDelta > 0 ? "+" : ""}
              {improvementSinceLast.scoreDelta} points improvement since previous session
            </div>
            <div className="text-xs mt-1" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
              {improvementSinceLast.newStrengths?.length > 0 &&
                `New Strengths: ${improvementSinceLast.newStrengths.join(", ")}`}
              {improvementSinceLast.newStrengths?.length > 0 &&
                improvementSinceLast.persistentWeaknesses?.length > 0 &&
                " · "}
              {improvementSinceLast.persistentWeaknesses?.length > 0 &&
                `Persistent Weaknesses: ${improvementSinceLast.persistentWeaknesses.join(", ")}`}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── AI COACH ─────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl overflow-hidden border"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
        }}
      >
        <button
          onClick={() => toggleSection("coach")}
          className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)",
              border: `1px solid ${isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)"}`,
            }}
          >
            <Brain size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
              AI Coach & Executive Feedback
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
              Actionable coaching strategy to pass your next FAANG interview
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: `${readinessColor}20`, color: readinessColor }}
            >
              {aiCoach.interviewReadiness}% Readiness
            </div>
            {expandedSections.has("coach") ? (
              <ChevronUp size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            ) : (
              <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            )}
          </div>
        </button>

        <AnimatePresence>
          {expandedSections.has("coach") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {/* Overall Assessment */}
                <div
                  className="rounded-xl p-4 border"
                  style={{
                    background: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)",
                    borderColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)",
                  }}
                >
                  <div className="text-xs font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                    <Sparkles size={14} /> Overall Performance Summary
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#374151" }}>
                    {aiCoach.overallSummary}
                  </p>
                </div>

                {/* Strength & Weakness */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3.5 border"
                    style={{
                      background: isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)",
                      borderColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Star size={14} className="text-green-400" />
                      <span className="text-[11px] font-bold text-green-400 uppercase tracking-wider">Biggest Strength</span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#4b5563" }}>
                      {aiCoach.biggestStrength}
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-3.5 border"
                    style={{
                      background: isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)",
                      borderColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)",
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlertTriangle size={14} className="text-red-400" />
                      <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Biggest Weakness</span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#4b5563" }}>
                      {aiCoach.biggestWeakness}
                    </p>
                  </div>
                </div>

                {/* Top Priorities */}
                {aiCoach.topPriorities?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider mb-2.5 text-purple-400 flex items-center gap-1.5">
                      <Target size={14} /> What should you improve before your next interview?
                    </div>
                    <div className="space-y-2">
                      {aiCoach.topPriorities.map((p, i) => (
                        <div
                          key={i}
                          className="rounded-xl p-3 flex items-start gap-3 border"
                          style={{
                            background: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb",
                            borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-extrabold mt-0.5"
                            style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}
                          >
                            {p.priority}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
                              {p.area}
                            </div>
                            <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#6b7280" }}>
                              {p.action}
                            </div>
                            <div className="flex gap-2 mt-1.5">
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}
                              >
                                Impact: {p.impact}
                              </span>
                              <span
                                className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
                              >
                                Timeframe: {p.timeframe}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── QUESTION-BY-QUESTION REVIEW (8-STEP EXPANDABLE) ─────────── */}
      {questionReviews.length > 0 && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl overflow-hidden border"
          style={{
            background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          }}
        >
          <button
            onClick={() => toggleSection("questions")}
            className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(6,182,212,0.12)" : "rgba(6,182,212,0.08)",
                border: `1px solid ${isDark ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.15)"}`,
              }}
            >
              <BookOpen size={20} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
                Question-by-Question Deep Review
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                Full breakdown: Candidate Response → AI Analysis → Ideal Answer → Common Mistakes → Improved Answer → Recruiter Perspective
              </div>
            </div>
            {expandedSections.has("questions") ? (
              <ChevronUp size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            ) : (
              <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.has("questions") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {questionReviews.map((q, idx) => {
                    const isOpen = openQuestionIndex === idx;
                    const scoreCol = q.score >= 80 ? "#10b981" : q.score >= 60 ? "#f59e0b" : "#ef4444";
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border overflow-hidden transition-all"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.02)" : "#f9fafb",
                          borderColor: isOpen ? `${scoreCol}40` : isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
                        }}
                      >
                        <button
                          onClick={() => setOpenQuestionIndex(isOpen ? null : idx)}
                          className="w-full p-4 flex items-center justify-between text-left gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-extrabold"
                              style={{ background: `${scoreCol}20`, color: scoreCol }}
                            >
                              Q{q.questionNumber || idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate" style={{ color: isDark ? "#fff" : "#111827" }}>
                                {q.question}
                              </p>
                              <span className="text-[10px] font-bold" style={{ color: scoreCol }}>
                                Score: {q.score}%
                              </span>
                            </div>
                          </div>
                          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                            <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-4 border-t space-y-3 pt-3"
                              style={{ borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}
                            >
                              {/* 1. Candidate Response */}
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                                  ↓ Candidate Response
                                </label>
                                <p className="text-xs leading-relaxed p-2.5 rounded-lg" style={{ background: isDark ? "rgba(0,0,0,0.3)" : "#ffffff", color: isDark ? "rgba(255,255,255,0.8)" : "#374151" }}>
                                  {q.candidateResponse}
                                </p>
                              </div>

                              {/* 2. Live Transcript Snippet */}
                              {q.transcriptSnippet && (
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                                    ↓ Live Transcript
                                  </label>
                                  <p className="text-[11px] italic leading-relaxed p-2 rounded-lg" style={{ background: isDark ? "rgba(6,182,212,0.05)" : "rgba(6,182,212,0.03)", color: isDark ? "rgba(255,255,255,0.65)" : "#4b5563" }}>
                                    "{q.transcriptSnippet}"
                                  </p>
                                </div>
                              )}

                              {/* 3. AI Analysis */}
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                                  ↓ AI Analysis
                                </label>
                                <div className="p-2.5 rounded-lg" style={{ background: isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)" }}>
                                  <FormattedMarkdown content={q.aiAnalysis} isDark={isDark} />
                                </div>
                              </div>

                              {/* 4. Ideal Answer */}
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-green-400 block mb-1">
                                  ↓ Ideal Answer
                                </label>
                                <div className="p-2.5 rounded-lg" style={{ background: isDark ? "rgba(16,185,129,0.05)" : "rgba(16,185,129,0.03)" }}>
                                  <FormattedMarkdown content={q.idealAnswer} isDark={isDark} />
                                </div>
                              </div>

                              {/* 5. Common Mistakes */}
                              {q.commonMistakes?.length > 0 && (
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 block mb-1">
                                    ↓ Common Mistakes to Avoid
                                  </label>
                                  <div className="space-y-1">
                                    {q.commonMistakes.map((m, i) => (
                                      <div key={i} className="flex items-center gap-2 text-xs" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#4b5563" }}>
                                        <X size={12} className="text-red-400 shrink-0" />
                                        <FormattedMarkdown content={m} isDark={isDark} />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 6. Improved Answer */}
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
                                  ↓ Improved Answer Rewrite
                                </label>
                                <div className="p-2.5 rounded-lg border" style={{ background: isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.03)", borderColor: "rgba(59,130,246,0.15)" }}>
                                  <FormattedMarkdown content={q.improvedAnswer} isDark={isDark} />
                                </div>
                              </div>

                              {/* 7. Recruiter Perspective */}
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-pink-400 block mb-1">
                                  ↓ Recruiter Perspective
                                </label>
                                <div className="p-2 rounded-lg" style={{ background: isDark ? "rgba(236,72,153,0.05)" : "rgba(236,72,153,0.03)" }}>
                                  <FormattedMarkdown content={q.recruiterPerspective} isDark={isDark} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── HR STAR ANALYSIS INTEGRATION ──────────────────────────── */}
      {(isHR || starAnalysis.length > 0) && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl overflow-hidden border"
          style={{
            background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          }}
        >
          <button
            onClick={() => toggleSection("star")}
            className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.15)"}`,
              }}
            >
              <Star size={20} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
                Behavioral STAR Analysis & Rewrites
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                Situation → Task → Action → Result breakdown with missing component callouts
              </div>
            </div>
            {expandedSections.has("star") ? (
              <ChevronUp size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            ) : (
              <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.has("star") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-3">
                  {starAnalysis.map((star, idx) => {
                    const isOpen = openStarIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border overflow-hidden p-3.5 space-y-3"
                        style={{
                          background: isDark ? "rgba(245,158,11,0.03)" : "#fcf8f2",
                          borderColor: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.2)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400">
                            Q{star.questionNumber || idx + 1}: {star.question}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="p-2 rounded-lg" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff" }}>
                            <span className="text-[9px] font-bold text-purple-400 block uppercase">Situation</span>
                            <span className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#4b5563" }}>
                              {star.situation}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff" }}>
                            <span className="text-[9px] font-bold text-cyan-400 block uppercase">Task</span>
                            <span className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#4b5563" }}>
                              {star.task}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff" }}>
                            <span className="text-[9px] font-bold text-amber-400 block uppercase">Action</span>
                            <span className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#4b5563" }}>
                              {star.action}
                            </span>
                          </div>
                          <div className="p-2 rounded-lg" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff" }}>
                            <span className="text-[9px] font-bold text-green-400 block uppercase">Result</span>
                            <span className="text-[11px]" style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#4b5563" }}>
                              {star.result}
                            </span>
                          </div>
                        </div>

                        {star.missingComponents?.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] text-red-400">
                            <AlertTriangle size={12} />
                            <span>Missing: {star.missingComponents.join(", ")}</span>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider block mb-1">
                            Suggested STAR Rewrite:
                          </span>
                          <p className="text-xs font-mono p-2 rounded-lg border" style={{ background: isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.03)", borderColor: "rgba(16,185,129,0.15)", color: isDark ? "#6ee7b7" : "#047857" }}>
                            "{star.suggestedSTARRewrite}"
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── TECHNICAL FEEDBACK INTEGRATION ──────────────────────────── */}
      {(isTechnical || technicalFeedback) && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl overflow-hidden border"
          style={{
            background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          }}
        >
          <button
            onClick={() => toggleSection("technical")}
            className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(6,182,212,0.12)" : "rgba(6,182,212,0.08)",
                border: `1px solid ${isDark ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.15)"}`,
              }}
            >
              <Code2 size={20} className="text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
                Technical & Code Evaluation Deep-Dive
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                Monaco/Piston execution, Complexity analysis, Naming, Edge cases, and FAANG Expectations
              </div>
            </div>
            {expandedSections.has("technical") ? (
              <ChevronUp size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            ) : (
              <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.has("technical") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4">
                  {/* Scores grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl border text-center" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase block">Correctness</span>
                      <span className="text-xl font-extrabold text-cyan-400">{technicalFeedback?.codeCorrectnessScore || 75}%</span>
                    </div>
                    <div className="p-3 rounded-xl border text-center" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                      <span className="text-[10px] font-bold text-green-400 uppercase block">Optimization</span>
                      <span className="text-xl font-extrabold text-green-400">{technicalFeedback?.optimizationScore || 70}%</span>
                    </div>
                    <div className="p-3 rounded-xl border text-center" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                      <span className="text-[10px] font-bold text-purple-400 uppercase block">Naming</span>
                      <span className="text-xl font-extrabold text-purple-400">{technicalFeedback?.namingScore || 80}%</span>
                    </div>
                    <div className="p-3 rounded-xl border text-center" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                      <span className="text-[10px] font-bold text-amber-400 uppercase block">Architecture</span>
                      <span className="text-xl font-extrabold text-amber-400">{technicalFeedback?.architectureScore || 75}%</span>
                    </div>
                  </div>

                  {/* Complexity */}
                  <div className="flex gap-4 p-3 rounded-xl border" style={{ background: isDark ? "rgba(6,182,212,0.04)" : "rgba(6,182,212,0.02)", borderColor: "rgba(6,182,212,0.12)" }}>
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-cyan-400">Time Complexity: </span>
                      <span className="font-mono" style={{ color: isDark ? "#fff" : "#111827" }}>{technicalFeedback?.timeComplexity || "O(N log N)"}</span>
                    </div>
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-cyan-400">Space Complexity: </span>
                      <span className="font-mono" style={{ color: isDark ? "#fff" : "#111827" }}>{technicalFeedback?.spaceComplexity || "O(N)"}</span>
                    </div>
                  </div>

                  {/* Alternative solutions */}
                  {technicalFeedback?.alternativeSolutions?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-2">
                        Alternative Approaches & Trade-offs
                      </span>
                      <div className="space-y-2">
                        {technicalFeedback.alternativeSolutions.map((sol, i) => (
                          <div key={i} className="p-2.5 rounded-lg border text-xs flex justify-between items-center" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#ffffff", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb" }}>
                            <div>
                              <span className="font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>{sol.approach}</span>
                              <p className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>{sol.summary}</p>
                            </div>
                            <div className="text-[10px] text-right font-mono text-cyan-400 shrink-0 ml-3">
                              <div>{sol.timeComplexity}</div>
                              <div className="text-gray-400">{sol.spaceComplexity}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAANG Expectations */}
                  {technicalFeedback?.faangExpectations && (
                    <div className="p-3 rounded-xl border" style={{ background: isDark ? "rgba(139,92,246,0.05)" : "rgba(139,92,246,0.03)", borderColor: "rgba(139,92,246,0.12)" }}>
                      <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                        FAANG Bar Raiser Perspective
                      </span>
                      <p className="text-xs leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.8)" : "#374151" }}>
                        {technicalFeedback.faangExpectations}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── EMBEDDED VISUAL ANALYTICS (CHARTS) ───────────────────────── */}
      {charts && (
        <motion.div
          variants={fadeUp}
          className="rounded-2xl overflow-hidden border"
          style={{
            background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
          }}
        >
          <button
            onClick={() => toggleSection("charts")}
            className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)",
                border: `1px solid ${isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)"}`,
              }}
            >
              <BarChart3 size={20} className="text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
                Session Performance & Competency Charts
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
                Visual trend analysis, speaking time, and competency benchmarks
              </div>
            </div>
            {expandedSections.has("charts") ? (
              <ChevronUp size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            ) : (
              <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
            )}
          </button>

          <AnimatePresence>
            {expandedSections.has("charts") && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {charts.performanceByQuestion?.length > 0 && (
                      <QuestionScoreChart data={charts.performanceByQuestion} isDark={isDark} />
                    )}
                    {charts.confidenceTrend?.length > 0 && (
                      <ConfidenceTrendChart data={charts.confidenceTrend} isDark={isDark} />
                    )}
                  </div>

                  {charts.speakingTimeDistribution?.length > 0 && (
                    <SpeakingTimeChart data={charts.speakingTimeDistribution} isDark={isDark} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ─── PERSONALIZED PRACTICE PLAN ─────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl overflow-hidden border"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
        }}
      >
        <button
          onClick={() => toggleSection("practice")}
          className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.08)",
              border: `1px solid ${isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)"}`,
            }}
          >
            <Calendar size={20} className="text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
              Personalized Practice Plan
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
              Today's Goal → This Week → This Month roadmap
            </div>
          </div>
          {expandedSections.has("practice") ? (
            <ChevronUp size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
          ) : (
            <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has("practice") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-4">
                {/* Today's Goal */}
                {practicePlan.todayGoal && (
                  <div
                    className="p-3.5 rounded-xl border"
                    style={{
                      background: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)",
                      borderColor: "rgba(139,92,246,0.15)",
                    }}
                  >
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                      🎯 Today's Primary Goal
                    </span>
                    <p className="text-xs font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
                      {practicePlan.todayGoal}
                    </p>
                  </div>
                )}

                {/* Today's Tasks */}
                {practicePlan.todayTasks?.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Today's Action Tasks
                    </span>
                    {practicePlan.todayTasks.map((t, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg border flex items-center justify-between text-xs"
                        style={{
                          background: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb",
                          borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                          <span style={{ color: isDark ? "#fff" : "#111827" }}>{t.task}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold">{t.estimatedMinutes}m</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommended Coding Problems */}
                {practicePlan.recommendedCodingProblems?.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1.5">
                      💻 Recommended Coding Problems
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {practicePlan.recommendedCodingProblems.map((prob, i) => (
                        <span
                          key={i}
                          className="text-[10px] font-mono px-2.5 py-1 rounded-full border"
                          style={{
                            background: "rgba(6,182,212,0.1)",
                            color: "#06b6d4",
                            borderColor: "rgba(6,182,212,0.2)",
                          }}
                        >
                          {prob}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── RESUME IMPACT & RESUME HUB LINK ─────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl overflow-hidden border"
        style={{
          background: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
        }}
      >
        <button
          onClick={() => toggleSection("resume")}
          className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isDark ? "rgba(249,115,22,0.12)" : "rgba(249,115,22,0.08)",
              border: `1px solid ${isDark ? "rgba(249,115,22,0.2)" : "rgba(249,115,22,0.15)"}`,
            }}
          >
            <FileText size={20} className="text-orange-400" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: isDark ? "#fff" : "#111827" }}>
              Resume Impact & Bullet Rewrites
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }}>
              Connect interview gaps directly to your resume achievements
            </div>
          </div>
          {expandedSections.has("resume") ? (
            <ChevronUp size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
          ) : (
            <ChevronDown size={16} style={{ color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af" }} />
          )}
        </button>

        <AnimatePresence>
          {expandedSections.has("resume") && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {resumeImpact.overallResumeAdvice && (
                  <p className="text-xs p-3 rounded-lg border" style={{ background: "rgba(249,115,22,0.05)", borderColor: "rgba(249,115,22,0.15)", color: isDark ? "rgba(255,255,255,0.85)" : "#374151" }}>
                    {resumeImpact.overallResumeAdvice}
                  </p>
                )}

                {resumeImpact.resumeBulletRewrites?.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-orange-400 uppercase block">Suggested Bullet Rewrites</span>
                    {resumeImpact.resumeBulletRewrites.map((b, i) => (
                      <div key={i} className="text-xs p-2 rounded-lg border font-mono" style={{ background: isDark ? "rgba(0,0,0,0.2)" : "#f9fafb", borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb", color: isDark ? "#fdba74" : "#c2410c" }}>
                        {b}
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <Link href="/resume-hub" className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl text-white transition-opacity hover:opacity-90" style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                    Update Resume in Resume Hub <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
