"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Trophy,
  Target,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Lightbulb,
  Flame,
  Star,
  BarChart3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  Sparkles,
  Brain,
  Award,
  ArrowLeft,
  Play,
} from "lucide-react";
import type { SessionReview as SessionReviewType, QuestionReview } from "./types";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.07, duration: 0.35 },
  }),
};

const confettiParticle: any = {
  hidden: { opacity: 0, y: 0, x: 0, rotate: 0, scale: 0 },
  visible: (i: number) => ({
    opacity: [0, 1, 1, 0],
    y: [0, -60 - Math.random() * 80, -80 - Math.random() * 60, -40 - Math.random() * 40],
    x: [0, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 160, (Math.random() - 0.5) * 100],
    rotate: [0, Math.random() * 360, Math.random() * 720, Math.random() * 540],
    scale: [0, 1.2, 0.9, 0],
    transition: {
      delay: i * 0.04,
      duration: 1.8,
      ease: "easeOut",
    },
  }),
};

interface SessionReviewProps {
  review: SessionReviewType;
  theme?: string;
  onPracticeAgain: () => void;
  onGoHome: () => void;
  onViewAnalytics: () => void;
  onNextRecommended: () => void;
}

function getPerformanceRating(accuracy: number): { label: string; color: string; icon: typeof Star } {
  if (accuracy >= 85) return { label: "Excellent", color: "#10b981", icon: Trophy };
  if (accuracy >= 65) return { label: "Good", color: "#3b82f6", icon: Star };
  if (accuracy >= 45) return { label: "Average", color: "#f59e0b", icon: Target };
  return { label: "Needs Work", color: "#ef4444", icon: AlertTriangle };
}

function getTopicColor(accuracy: number): string {
  if (accuracy >= 80) return "#10b981";
  if (accuracy >= 50) return "#f59e0b";
  return "#ef4444";
}

function formatTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export default function SessionReview({
  review,
  theme = "dark",
  onPracticeAgain,
  onGoHome,
  onViewAnalytics,
  onNextRecommended,
}: SessionReviewProps) {
  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f0f4ff",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    surfaceHover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8",
    primary: "#f59e0b",
    primaryDark: "#d97706",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
  };

  const [showConfetti, setShowConfetti] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [displayedXp, setDisplayedXp] = useState(0);
  const [typedInsight, setTypedInsight] = useState("");
  const [typedStudyPlan, setTypedStudyPlan] = useState("");

  const rating = useMemo(() => getPerformanceRating(review.accuracy), [review.accuracy]);
  const RatingIcon = rating.icon;

  // Animated XP counter
  useEffect(() => {
    if (review.xpEarned <= 0) return;
    const step = Math.max(1, Math.floor(review.xpEarned / 30));
    const timer = setInterval(() => {
      setDisplayedXp((prev) => {
        const next = prev + step;
        if (next >= review.xpEarned) {
          clearInterval(timer);
          return review.xpEarned;
        }
        return next;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [review.xpEarned]);

  // Typing animation for AI insights
  useEffect(() => {
    if (!review.aiInsights) return;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setTypedInsight(review.aiInsights.slice(0, idx));
      if (idx >= review.aiInsights.length) clearInterval(timer);
    }, 12);
    return () => clearInterval(timer);
  }, [review.aiInsights]);

  // Typing animation for study plan
  useEffect(() => {
    if (!review.studyPlan) return;
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      setTypedStudyPlan(review.studyPlan.slice(0, idx));
      if (idx >= review.studyPlan.length) clearInterval(timer);
    }, 12);
    return () => clearInterval(timer);
  }, [review.studyPlan]);

  // Clear confetti after animation
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Topic stats derived from question reviews
  const topicStats = useMemo(() => {
    const map: Record<string, { total: number; correct: number; timeMs: number }> = {};
    review.questionReviews.forEach((qr) => {
      const topic = qr.question.topic;
      if (!map[topic]) map[topic] = { total: 0, correct: 0, timeMs: 0 };
      map[topic].total++;
      if (qr.isCorrect) map[topic].correct++;
      map[topic].timeMs += qr.timeTakenMs;
    });
    return Object.entries(map).map(([topic, stats]) => ({
      topic,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      correct: stats.correct,
      total: stats.total,
      avgTimeMs: stats.total > 0 ? Math.round(stats.timeMs / stats.total) : 0,
    }));
  }, [review.questionReviews]);

  const totalQuestions = review.correctCount + review.incorrectCount + review.skippedCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col gap-5 pb-8"
      style={{ color: c.text }}
    >
      {/* ═══════════════════════ CONFETTI PARTICLES ═══════════════════════ */}
      <AnimatePresence>
        {showConfetti && review.accuracy >= 50 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {Array.from({ length: 40 }).map((_, i) => {
              const colors = ["#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444"];
              return (
                <motion.div
                  key={i}
                  custom={i}
                  variants={confettiParticle}
                  initial="hidden"
                  animate="visible"
                  className="absolute rounded-sm"
                  style={{
                    width: 6 + Math.random() * 6,
                    height: 6 + Math.random() * 6,
                    backgroundColor: colors[i % colors.length],
                    left: `${10 + Math.random() * 80}%`,
                    top: `${20 + Math.random() * 30}%`,
                  }}
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════ 1. SCORE CELEBRATION HEADER ═══════════════════════ */}
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        custom={0}
        className="relative p-8 border rounded-2xl text-center overflow-hidden"
        style={{ background: c.cardBg, borderColor: c.border }}
      >
        <div className="relative z-10">
          {/* Large circular score display */}
          <div className="relative mx-auto mb-5" style={{ width: 160, height: 160 }}>
            <svg width="160" height="160" className="absolute inset-0">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                strokeWidth="10"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke={rating.color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={440}
                initial={{ strokeDashoffset: 440 }}
                animate={{ strokeDashoffset: 440 - (440 * review.accuracy) / 100 }}
                transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                style={{ transform: "rotate(-90deg)", transformOrigin: "80px 80px" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                className="text-4xl font-black"
                style={{ color: rating.color }}
              >
                {review.accuracy}%
              </motion.span>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                Accuracy
              </span>
            </div>
          </div>

          {/* Performance rating */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 mb-4"
          >
            <RatingIcon size={18} style={{ color: rating.color }} />
            <span className="text-lg font-extrabold" style={{ color: rating.color }}>
              {rating.label}
            </span>
          </motion.div>

          {/* XP earned */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-6 flex-wrap"
          >
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full border" style={{ borderColor: `${c.primary}30`, background: `${c.primary}10` }}>
              <Zap size={14} className="text-amber-500" />
              <span className="text-sm font-black text-amber-500">+{displayedXp} XP</span>
            </div>
            {review.skippedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ borderColor: `${c.textMuted}30`, background: `${c.textMuted}10` }}>
                <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                  {review.skippedCount} skipped
                </span>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* ═══════════════════════ 2. PERFORMANCE SUMMARY CARDS ═══════════════════════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {/* Correct / Total */}
        <div className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${c.green}15` }}>
              <CheckCircle2 size={14} style={{ color: c.green }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
              Score
            </span>
          </div>
          <p className="text-xl font-black" style={{ color: c.text }}>
            {review.correctCount}
            <span className="text-sm font-bold" style={{ color: c.textMuted }}>
              /{totalQuestions}
            </span>
          </p>
          <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>
            {review.incorrectCount} incorrect
          </p>
        </div>

        {/* Avg time per question */}
        <div className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#3b82f615" }}>
              <Clock size={14} className="text-blue-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
              Avg Time
            </span>
          </div>
          <p className="text-xl font-black" style={{ color: c.text }}>
            {formatTimeMs(review.avgTimePerQMs)}
          </p>
          <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>
            per question
          </p>
        </div>

        {/* Accuracy */}
        <div className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${rating.color}15` }}>
              <TrendingUp size={14} style={{ color: rating.color }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
              Accuracy
            </span>
          </div>
          <p className="text-xl font-black" style={{ color: rating.color }}>
            {review.accuracy}%
          </p>
          <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${review.accuracy}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
              className="h-full rounded-full"
              style={{ background: rating.color }}
            />
          </div>
        </div>

        {/* XP & Level */}
        <div className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${c.primary}15` }}>
              <Flame size={14} className="text-amber-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
              XP Earned
            </span>
          </div>
          <p className="text-xl font-black text-amber-500">+{review.xpEarned}</p>
          <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>
            {totalQuestions} questions completed
          </p>
        </div>
      </motion.div>

      {/* ═══════════════════════ 3. TOPIC BREAKDOWN ═══════════════════════ */}
      {topicStats.length > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="p-6 border rounded-2xl space-y-4"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-amber-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Topic Breakdown</h3>
          </div>

          <div className="space-y-3">
            {topicStats.map((ts, idx) => {
              const barColor = getTopicColor(ts.accuracy);
              const isStrong = review.strongTopics.includes(ts.topic);
              const isWeak = review.weakTopics.includes(ts.topic);

              return (
                <motion.div
                  key={ts.topic}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={idx}
                  className="space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: c.text }}>
                        {ts.topic}
                      </span>
                      {isStrong && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase" style={{ background: `${c.green}20`, color: c.green }}>
                          Strong
                        </span>
                      )}
                      {isWeak && (
                        <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase" style={{ background: `${c.red}20`, color: c.red }}>
                          Needs Work
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                        {ts.correct}/{ts.total}
                      </span>
                      <span className="text-xs font-black" style={{ color: barColor }}>
                        {ts.accuracy}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ts.accuracy}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 + idx * 0.1 }}
                      className="h-full rounded-full"
                      style={{ background: barColor }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Weak topics improvement suggestion */}
          {review.weakTopics.length > 0 && (
            <div className="mt-3 p-3 rounded-xl border" style={{ background: `${c.red}08`, borderColor: `${c.red}20` }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-1">
                    Topics to Focus On
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                    {review.weakTopics.join(", ")} — consider spending extra practice time on these areas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Strong topics highlight */}
          {review.strongTopics.length > 0 && (
            <div className="p-3 rounded-xl border" style={{ background: `${c.green}08`, borderColor: `${c.green}20` }}>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-green-500 mb-1">
                    Strong Areas
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                    {review.strongTopics.join(", ")} — keep up the excellent work!
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════ 4. AI INSIGHTS CARD ═══════════════════════ */}
      {review.aiInsights && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="p-6 border rounded-2xl space-y-3"
          style={{
            background: `linear-gradient(135deg, ${isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)"}, ${c.cardBg})`,
            borderColor: isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-purple-500">AI Insights</h3>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: c.textSec }}>
            {typedInsight}
            {typedInsight.length < review.aiInsights.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-0.5 h-3 ml-0.5 align-middle"
                style={{ background: "#8b5cf6" }}
              />
            )}
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════ 5. QUESTION REVIEW LIST ═══════════════════════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={4}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-amber-500" />
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Question Review</h3>
          <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
            ({review.questionReviews.length} questions)
          </span>
        </div>

        <div className="space-y-2">
          {review.questionReviews.map((qr, idx) => {
            const isExpanded = expandedQuestion === idx;
            const userAnswerText =
              qr.userAnswer !== null && qr.userAnswer !== undefined
                ? qr.question.options[qr.userAnswer]
                : "Skipped";
            const correctAnswerText = qr.question.options[qr.question.correctIdx];

            return (
              <motion.div
                key={idx}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={idx}
                className="border rounded-2xl overflow-hidden"
                style={{ background: c.cardBg, borderColor: c.border }}
              >
                {/* Collapsed header */}
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: qr.isCorrect ? `${c.green}15` : qr.userAnswer === null ? `${c.textMuted}15` : `${c.red}15`,
                    }}
                  >
                    {qr.isCorrect ? (
                      <CheckCircle2 size={14} style={{ color: c.green }} />
                    ) : qr.userAnswer === null ? (
                      <XCircle size={14} style={{ color: c.textMuted }} />
                    ) : (
                      <XCircle size={14} style={{ color: c.red }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: c.text }}>
                      Q{idx + 1}. {qr.question.text.slice(0, 80)}
                      {qr.question.text.length > 80 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                        style={{
                          background: qr.isCorrect ? `${c.green}15` : `${c.red}15`,
                          color: qr.isCorrect ? c.green : c.red,
                        }}
                      >
                        {qr.isCorrect ? "Correct" : qr.userAnswer === null ? "Skipped" : "Incorrect"}
                      </span>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: c.textMuted }}>
                        <Clock size={10} /> {formatTimeMs(qr.timeTakenMs)}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${c.primary}15`, color: c.primary }}>
                        {qr.question.difficulty}
                      </span>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} style={{ color: c.textMuted }} />
                  </motion.div>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: c.border }}>
                        {/* Full question text */}
                        <p className="text-xs font-semibold leading-relaxed pt-3 whitespace-pre-line" style={{ color: c.text }}>
                          {qr.question.text}
                        </p>

                        {/* Options */}
                        <div className="space-y-1.5">
                          {qr.question.options.map((opt, oIdx) => {
                            const isUserChoice = oIdx === qr.userAnswer;
                            const isCorrectChoice = oIdx === qr.question.correctIdx;
                            let optBg = "bg-white/5 border-white/10";
                            let optText = c.textSec;

                            if (isCorrectChoice) {
                              optBg = "bg-emerald-500/10 border-emerald-500/30";
                              optText = "#10b981";
                            } else if (isUserChoice && !isCorrectChoice) {
                              optBg = "bg-red-500/10 border-red-500/30";
                              optText = "#ef4444";
                            }

                            return (
                              <div
                                key={oIdx}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold ${optBg}`}
                                style={{ color: optText }}
                              >
                                {isCorrectChoice && <CheckCircle2 size={12} className="shrink-0" />}
                                {isUserChoice && !isCorrectChoice && <XCircle size={12} className="shrink-0" />}
                                <span>{opt}</span>
                                {isUserChoice && isCorrectChoice && (
                                  <span className="ml-auto text-[9px] font-black uppercase" style={{ color: c.green }}>
                                    Your answer
                                  </span>
                                )}
                                {isUserChoice && !isCorrectChoice && (
                                  <span className="ml-auto text-[9px] font-black uppercase" style={{ color: c.red }}>
                                    Your answer
                                  </span>
                                )}
                                {!isUserChoice && isCorrectChoice && (
                                  <span className="ml-auto text-[9px] font-black uppercase" style={{ color: c.green }}>
                                    Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Answer summary */}
                        <div className="flex items-center gap-4 text-[10px]" style={{ color: c.textMuted }}>
                          <span>
                            Your answer:{" "}
                            <span className="font-bold" style={{ color: qr.isCorrect ? c.green : c.red }}>
                              {userAnswerText}
                            </span>
                          </span>
                          {!qr.isCorrect && (
                            <span>
                              Correct:{" "}
                              <span className="font-bold" style={{ color: c.green }}>
                                {correctAnswerText}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Shortcut */}
                        {(qr.shortcut || qr.question.shortcut) && (
                          <div className="p-3 rounded-xl border" style={{ background: `${c.primary}08`, borderColor: `${c.primary}20` }}>
                            <div className="flex items-start gap-2">
                              <Lightbulb size={12} className="text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-amber-500 mb-0.5">Shortcut</p>
                                <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                                  {qr.shortcut || qr.question.shortcut}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* AI Explanation */}
                        {qr.aiExplanation && (
                          <div className="p-3 rounded-xl border" style={{ background: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)", borderColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)" }}>
                            <div className="flex items-start gap-2">
                              <Brain size={12} className="text-purple-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-purple-500 mb-0.5">AI Explanation</p>
                                <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: c.textSec }}>
                                  {qr.aiExplanation}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Common mistakes */}
                        {qr.commonMistakes.length > 0 && (
                          <div className="p-3 rounded-xl border" style={{ background: `${c.red}06`, borderColor: `${c.red}15` }}>
                            <div className="flex items-start gap-2">
                              <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black uppercase tracking-wider text-red-400 mb-0.5">Common Mistakes</p>
                                <ul className="text-xs leading-relaxed space-y-0.5" style={{ color: c.textSec }}>
                                  {qr.commonMistakes.map((m, mi) => (
                                    <li key={mi}>• {m}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ═══════════════════════ 6. RECOMMENDED NEXT STEPS ═══════════════════════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={5}
        className="p-6 border rounded-2xl space-y-4"
        style={{ background: c.cardBg, borderColor: c.border }}
      >
        <div className="flex items-center gap-2">
          <ArrowRight size={16} className="text-amber-500" />
          <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Recommended Next Steps</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Practice weak topics */}
          {review.weakTopics.length > 0 && (
            <motion.button
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              custom={0}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={onPracticeAgain}
              className="p-4 border rounded-xl text-left hover:shadow-lg transition-all"
              style={{ background: `${c.red}08`, borderColor: `${c.red}20` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={14} className="text-red-500" />
                <span className="text-xs font-black" style={{ color: c.text }}>
                  Practice Weak Topics
                </span>
              </div>
              <p className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>
                Focus on {review.weakTopics.slice(0, 2).join(", ")}
                {review.weakTopics.length > 2 && ` and ${review.weakTopics.length - 2} more`}
              </p>
            </motion.button>
          )}

          {/* Try similar company test */}
          <motion.button
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            custom={1}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onNextRecommended}
            className="p-4 border rounded-xl text-left hover:shadow-lg transition-all"
            style={{ background: `${c.primary}08`, borderColor: `${c.primary}20` }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-amber-500" />
              <span className="text-xs font-black" style={{ color: c.text }}>
                Try Similar Challenge
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>
              AI-recommended next session based on your performance
            </p>
          </motion.button>

          {/* View full analytics */}
          <motion.button
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            custom={2}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onViewAnalytics}
            className="p-4 border rounded-xl text-left hover:shadow-lg transition-all"
            style={{ background: isDark ? "rgba(59,130,246,0.06)" : "rgba(59,130,246,0.04)", borderColor: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.15)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-blue-500" />
              <span className="text-xs font-black" style={{ color: c.text }}>
                View Full Analytics
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>
              Deep dive into your performance trends and readiness
            </p>
          </motion.button>

          {/* Start daily challenge */}
          <motion.button
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            custom={3}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPracticeAgain}
            className="p-4 border rounded-xl text-left hover:shadow-lg transition-all"
            style={{ background: isDark ? "rgba(236,72,153,0.06)" : "rgba(236,72,153,0.04)", borderColor: isDark ? "rgba(236,72,153,0.2)" : "rgba(236,72,153,0.15)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame size={14} className="text-pink-500" />
              <span className="text-xs font-black" style={{ color: c.text }}>
                Daily Challenge
              </span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>
              Test your skills with today&apos;s mixed-topic challenge
            </p>
          </motion.button>
        </div>
      </motion.div>

      {/* ═══════════════════════ 7. STUDY PLAN CARD ═══════════════════════ */}
      {review.studyPlan && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="p-6 border rounded-2xl space-y-3"
          style={{
            background: `linear-gradient(135deg, ${isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)"}, ${c.cardBg})`,
            borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)",
          }}
        >
          <div className="flex items-center gap-2">
            <Award size={16} className="text-green-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-green-500">AI Study Plan</h3>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-line" style={{ color: c.textSec }}>
            {typedStudyPlan}
            {typedStudyPlan.length < review.studyPlan.length && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-0.5 h-3 ml-0.5 align-middle"
                style={{ background: "#10b981" }}
              />
            )}
          </div>

          {/* Priority topics */}
          {review.weakTopics.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {review.weakTopics.map((topic) => (
                <span
                  key={topic}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border"
                  style={{ background: `${c.red}10`, borderColor: `${c.red}25`, color: c.red }}
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Improvement suggestions */}
          {review.improvementSuggestions.length > 0 && (
            <div className="space-y-2 pt-2">
              {review.improvementSuggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <Lightbulb size={12} className="text-green-500 mt-0.5 shrink-0" />
                  <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                    {suggestion}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════ BOTTOM ACTIONS ═══════════════════════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={7}
        className="flex flex-wrap items-center justify-center gap-3 pt-2"
      >
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onGoHome}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl border text-xs font-bold transition-all"
          style={{ borderColor: c.border, color: c.textSec, background: c.cardBg }}
        >
          <ArrowLeft size={14} />
          Back to Home
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onPracticeAgain}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-extrabold transition-all"
          style={{ background: c.primary, color: "#000" }}
        >
          <Play size={14} />
          Practice Again
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onViewAnalytics}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl border text-xs font-bold transition-all"
          style={{ borderColor: `${c.primary}40`, color: c.primary, background: `${c.primary}10` }}
        >
          <BarChart3 size={14} />
          View Analytics
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={onNextRecommended}
          className="flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-extrabold transition-all"
          style={{ background: "#8b5cf6", color: "#fff" }}
        >
          <Sparkles size={14} />
          Next Challenge
          <ArrowRight size={14} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
