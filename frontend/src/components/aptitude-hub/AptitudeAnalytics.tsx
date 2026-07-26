"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Radar, Bar, Doughnut } from "react-chartjs-2";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Award,
  Clock,
  Flame,
  Target,
  Sparkles,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Brain,
  Zap,
  Users,
  Briefcase,
  CheckCircle2,
  Play,
  Crown,
  Shield,
  Activity,
  Layers,
  BookOpen,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
} from "lucide-react";
import type {
  PerformanceAnalytics,
  TopicMastery,
  CompanyReadiness,
  WeeklyProgress,
  AptitudeCategory,
} from "./types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AptitudeAnalyticsProps {
  analytics: PerformanceAnalytics | null;
  theme?: string;
  onBack: () => void;
  onPracticeTopic: (topic: string) => void;
  onCompanyTest: (company: string) => void;
}

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

const CATEGORY_LABELS: Record<AptitudeCategory, string> = {
  quantitative: "Quantitative",
  logical: "Logical",
  verbal: "Verbal",
  data_interpretation: "Data Interpretation",
  analytical: "Analytical",
  number_systems: "Number Systems",
};

const CATEGORY_COLORS: Record<AptitudeCategory, string> = {
  quantitative: "#f59e0b",
  logical: "#8b5cf6",
  verbal: "#3b82f6",
  data_interpretation: "#10b981",
  analytical: "#ec4899",
  number_systems: "#06b6d4",
};

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 80) return "#10b981";
  if (accuracy >= 50) return "#f59e0b";
  return "#ef4444";
}

function getCompanyScoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function formatTimeMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

export default function AptitudeAnalytics({
  analytics,
  theme = "dark",
  onBack,
  onPracticeTopic,
  onCompanyTest,
}: AptitudeAnalyticsProps) {
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
    blue: "#3b82f6",
    purple: "#8b5cf6",
    pink: "#ec4899",
    cyan: "#06b6d4",
  };

  const [activeTab, setActiveTab] = useState<"overview" | "topics" | "companies" | "progress">("overview");

  const animatedSessions = useAnimatedCounter(analytics?.totalSessions ?? 0);
  const animatedQuestions = useAnimatedCounter(analytics?.totalQuestions ?? 0);
  const animatedAccuracy = useAnimatedCounter(analytics?.overallAccuracy ?? 0);
  const animatedXp = useAnimatedCounter(analytics?.xp ?? 0);
  const animatedLevel = useAnimatedCounter(analytics?.level ?? 0);
  const animatedStreak = useAnimatedCounter(analytics?.streak ?? 0);
  const animatedBestStreak = useAnimatedCounter(analytics?.bestStreak ?? 0);
  const animatedReadiness = useAnimatedCounter(analytics?.placementReadiness ?? 0);

  const sortedTopicMastery = useMemo(() => {
    if (!analytics) return [];
    return [...analytics.topicMastery].sort((a, b) => a.accuracy - b.accuracy);
  }, [analytics]);

  const weakTopicsList = useMemo(() => {
    if (!analytics) return [];
    return analytics.topicMastery
      .filter((t) => t.accuracy < 50)
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [analytics]);

  const strongTopicsList = useMemo(() => {
    if (!analytics) return [];
    return analytics.topicMastery
      .filter((t) => t.accuracy >= 80)
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [analytics]);

  const difficultyDistribution = useMemo(() => {
    if (!analytics) return { easy: 0, medium: 0, hard: 0 };
    const dist = { easy: 0, medium: 0, hard: 0 };
    analytics.topicMastery.forEach((t) => {
      if (t.difficulty === "easy") dist.easy += t.totalAttempted;
      else if (t.difficulty === "hard") dist.hard += t.totalAttempted;
      else dist.medium += t.totalAttempted;
    });
    return dist;
  }, [analytics]);

  const aiInsight = useMemo(() => {
    if (!analytics) return "";
    const lines: string[] = [];
    if (analytics.overallAccuracy >= 80) {
      lines.push("Your accuracy is excellent. You're performing at a placement-ready level.");
    } else if (analytics.overallAccuracy >= 60) {
      lines.push("Good progress overall. Focus on your weak topics to reach 80%+ accuracy.");
    } else {
      lines.push("You're building your foundation. Consistent daily practice will significantly improve your scores.");
    }
    if ((analytics.weakTopics?.length || 0) > 0) {
      lines.push(`Priority areas: ${analytics.weakTopics.slice(0, 3).join(", ")}. Dedicate extra sessions to these.`);
    }
    if (analytics.streak >= 7) {
      lines.push(`Impressive ${analytics.streak}-day streak! Consistency is your biggest strength.`);
    } else if (analytics.streak >= 3) {
      lines.push(`${analytics.streak}-day streak going. Push for 7 days to build an unbreakable habit.`);
    }
    const bestCompany = analytics.companyReadiness.reduce(
      (best, cr) => (cr.score > best.score ? cr : best),
      analytics.companyReadiness[0]
    );
    const worstCompany = analytics.companyReadiness.reduce(
      (worst, cr) => (cr.score < worst.score ? cr : worst),
      analytics.companyReadiness[0]
    );
    if (bestCompany) {
      lines.push(`Strongest company match: ${bestCompany.company} at ${bestCompany.score}%.`);
    }
    if (worstCompany && worstCompany.company !== bestCompany?.company) {
      lines.push(`Needs work for ${worstCompany.company} (${worstCompany.score}%). Focus on gap topics.`);
    }
    if (analytics.placementReadiness >= 70) {
      lines.push(`Placement readiness at ${analytics.placementReadiness}% — you're interview-ready!`);
    }
    return lines.join("\n");
  }, [analytics]);

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color: c.text }}>
        <Loader2 size={32} className="animate-spin text-amber-500" />
        <p className="text-sm font-bold" style={{ color: c.textMuted }}>
          Loading analytics...
        </p>
      </div>
    );
  }

  const accuracyTrendData = {
    labels: analytics.weeklyProgress.map((w) => w.week),
    datasets: [
      {
        label: "Accuracy %",
        data: analytics.weeklyProgress.map((w) => w.accuracy),
        borderColor: c.primary,
        backgroundColor: (ctx: any) => {
          const chart = ctx.chart;
          const { ctx: canvasCtx, chartArea } = chart;
          if (!chartArea) return `${c.primary}20`;
          const gradient = canvasCtx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, `${c.primary}40`);
          gradient.addColorStop(1, `${c.primary}05`);
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: c.primary,
        pointBorderColor: isDark ? "#080710" : "#f0f4ff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      },
    ],
  };

  const topicMasteryData = {
    labels: sortedTopicMastery.map((t) => t.topic.length > 16 ? t.topic.slice(0, 15) + "…" : t.topic),
    datasets: [
      {
        label: "Accuracy %",
        data: sortedTopicMastery.map((t) => t.accuracy),
        backgroundColor: sortedTopicMastery.map((t) => {
          const col = getAccuracyColor(t.accuracy);
          return `${col}90`;
        }),
        borderColor: sortedTopicMastery.map((t) => getAccuracyColor(t.accuracy)),
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 18,
      },
    ],
  };

  const categoryRadarData = {
    labels: (Object.keys(analytics.categoryScores) as AptitudeCategory[]).map(
      (k) => CATEGORY_LABELS[k]
    ),
    datasets: [
      {
        label: "Your Score",
        data: (Object.keys(analytics.categoryScores) as AptitudeCategory[]).map(
          (k) => analytics.categoryScores[k]
        ),
        backgroundColor: `${c.primary}25`,
        borderColor: c.primary,
        borderWidth: 2,
        pointBackgroundColor: c.primary,
        pointBorderColor: isDark ? "#080710" : "#f0f4ff",
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const weeklyProgressData = {
    labels: analytics.weeklyProgress.map((w) => w.week),
    datasets: [
      {
        label: "Sessions",
        data: analytics.weeklyProgress.map((w) => w.sessionsCompleted),
        backgroundColor: `${c.blue}80`,
        borderColor: c.blue,
        borderWidth: 1,
        borderRadius: 4,
        barThickness: 20,
        yAxisID: "y",
      },
      {
        label: "Accuracy %",
        data: analytics.weeklyProgress.map((w) => w.accuracy),
        type: "line" as const,
        borderColor: c.primary,
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.primary,
        yAxisID: "y1",
      },
    ],
  };

  const difficultyDoughnutData = {
    labels: ["Easy", "Medium", "Hard"],
    datasets: [
      {
        data: [difficultyDistribution.easy, difficultyDistribution.medium, difficultyDistribution.hard],
        backgroundColor: ["#10b98190", "#f59e0b90", "#ef444490"],
        borderColor: ["#10b981", "#f59e0b", "#ef4444"],
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? `${c.primary}18` : "transparent",
    color: active ? c.primary : c.textMuted,
    borderBottom: active ? `2px solid ${c.primary}` : "2px solid transparent",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-5 pb-8"
      style={{ color: c.text }}
    >
      {/* ═══════════════════ HEADER ═══════════════════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors"
            style={{ borderColor: c.border, color: c.textSec, background: c.cardBg }}
          >
            <ArrowLeft size={16} />
          </motion.button>
          <div>
            <h1 className="text-lg font-black tracking-tight" style={{ color: c.text }}>
              Performance Analytics
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
              Aptitude Engine Dashboard
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-amber-500" />
        </div>
      </motion.div>

      {/* ═══════════════════ TABS ═══════════════════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0.5}
        className="flex gap-1 p-1 rounded-xl border overflow-x-auto"
        style={{ background: c.surface, borderColor: c.border }}
      >
        {(["overview", "topics", "companies", "progress"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all"
            style={tabStyle(activeTab === tab)}
          >
            {tab === "overview" && <Activity size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab === "topics" && <BookOpen size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab === "companies" && <Briefcase size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab === "progress" && <TrendingUp size={12} className="inline mr-1.5 -mt-0.5" />}
            {tab}
          </button>
        ))}
      </motion.div>

      {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-5">
          {/* Placement Readiness Score */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            custom={0}
            className="relative p-6 border rounded-2xl overflow-hidden text-center"
            style={{
              background: `linear-gradient(135deg, ${isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.05)"}, ${c.cardBg})`,
              borderColor: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.15)",
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown size={16} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                Placement Readiness
              </span>
            </div>
            <div className="relative mx-auto mb-3" style={{ width: 140, height: 140 }}>
              <svg width="140" height="140" className="absolute inset-0">
                <circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                  strokeWidth="8"
                />
                <motion.circle
                  cx="70"
                  cy="70"
                  r="60"
                  fill="none"
                  stroke={getAccuracyColor(analytics.placementReadiness)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={377}
                  initial={{ strokeDashoffset: 377 }}
                  animate={{ strokeDashoffset: 377 - (377 * analytics.placementReadiness) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                  className="text-3xl font-black"
                  style={{ color: getAccuracyColor(analytics.placementReadiness) }}
                >
                  {animatedReadiness}%
                </motion.span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                  Ready
                </span>
              </div>
            </div>
            <p className="text-xs font-semibold" style={{ color: c.textSec }}>
              {analytics.placementReadiness >= 80
                ? "You're well-prepared for campus placements!"
                : analytics.placementReadiness >= 50
                ? "Good progress. Keep practicing to reach placement-ready level."
                : "Focus on consistent practice to improve your readiness."}
            </p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {[
              { label: "Total Sessions", value: animatedSessions, icon: Layers, color: c.blue },
              { label: "Questions Done", value: animatedQuestions, icon: Target, color: c.purple },
              {
                label: "Avg Accuracy",
                value: `${animatedAccuracy}%`,
                icon: TrendingUp,
                color: getAccuracyColor(analytics.overallAccuracy),
              },
              {
                label: "Avg Time/Q",
                value: formatTimeMs(analytics.avgTimePerQMs),
                icon: Clock,
                color: c.cyan,
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                custom={idx}
                className="p-4 border rounded-2xl"
                style={{ background: c.cardBg, borderColor: c.border }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${stat.color}15` }}
                  >
                    <stat.icon size={14} style={{ color: stat.color }} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
                    {stat.label}
                  </span>
                </div>
                <p className="text-xl font-black" style={{ color: c.text }}>
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* XP & Streak Row */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1.5}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {[
              { label: "Total XP", value: animatedXp.toLocaleString(), icon: Zap, color: c.primary },
              { label: "Level", value: animatedLevel, icon: Award, color: c.purple },
              { label: "Current Streak", value: `${animatedStreak}d`, icon: Flame, color: c.red },
              { label: "Best Streak", value: `${animatedBestStreak}d`, icon: Crown, color: c.primary },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                initial="hidden"
                animate="visible"
                custom={idx}
                className="p-4 border rounded-2xl"
                style={{ background: c.cardBg, borderColor: c.border }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${stat.color}15` }}
                  >
                    <stat.icon size={14} style={{ color: stat.color }} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
                    {stat.label}
                  </span>
                </div>
                <p className="text-xl font-black" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Accuracy Trend + Category Radar (side by side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Accuracy Trend */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="p-6 border rounded-2xl"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Accuracy Trend</h3>
              </div>
              <div className="h-52">
                <Line
                  data={accuracyTrendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
                        titleColor: c.text,
                        bodyColor: c.textSec,
                        borderColor: c.border,
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { weight: "bold" as const, size: 11 },
                        bodyFont: { size: 11 },
                      },
                    },
                    scales: {
                      x: {
                        ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const } },
                        grid: { color: `${c.border}` },
                      },
                      y: {
                        min: 0,
                        max: 100,
                        ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const }, stepSize: 25 },
                        grid: { color: `${c.border}` },
                      },
                    },
                  }}
                />
              </div>
            </motion.div>

            {/* Category Radar */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2.5}
              className="p-6 border rounded-2xl"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} className="text-purple-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-500">Category Scores</h3>
              </div>
              <div className="h-52">
                <Radar
                  data={categoryRadarData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
                        titleColor: c.text,
                        bodyColor: c.textSec,
                        borderColor: c.border,
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { weight: "bold" as const, size: 11 },
                        bodyFont: { size: 11 },
                      },
                    },
                    scales: {
                      r: {
                        min: 0,
                        max: 100,
                        ticks: {
                          stepSize: 25,
                          color: c.textMuted,
                          font: { size: 8, weight: "bold" as const },
                          backdropColor: "transparent",
                        },
                        grid: { color: `${c.border}` },
                        angleLines: { color: `${c.border}` },
                        pointLabels: {
                          color: c.textSec,
                          font: { size: 9, weight: "bold" as const },
                        },
                      },
                    },
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* Difficulty Distribution + AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Difficulty Distribution */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="p-6 border rounded-2xl"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Layers size={16} className="text-cyan-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-cyan-500">Difficulty Split</h3>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <Doughnut
                    data={difficultyDoughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "65%",
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
                          titleColor: c.text,
                          bodyColor: c.textSec,
                          borderColor: c.border,
                          borderWidth: 1,
                          padding: 10,
                          cornerRadius: 8,
                          titleFont: { weight: "bold" as const, size: 11 },
                          bodyFont: { size: 11 },
                        },
                      },
                    }}
                  />
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "Easy", value: difficultyDistribution.easy, color: "#10b981" },
                    { label: "Medium", value: difficultyDistribution.medium, color: "#f59e0b" },
                    { label: "Hard", value: difficultyDistribution.hard, color: "#ef4444" },
                  ].map((d) => {
                    const total = difficultyDistribution.easy + difficultyDistribution.medium + difficultyDistribution.hard;
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <div key={d.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase" style={{ color: c.textMuted }}>
                            {d.label}
                          </span>
                          <span className="text-xs font-black" style={{ color: c.text }}>
                            {d.value} <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>({pct}%)</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* AI Insights */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3.5}
              className="p-6 border rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.04)"}, ${c.cardBg})`,
                borderColor: isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-purple-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-500">AI Insights</h3>
              </div>
              <div className="space-y-3">
                {aiInsight.split("\n").filter(Boolean).map((line, idx) => (
                  <motion.div
                    key={idx}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={idx}
                    className="flex items-start gap-2"
                  >
                    <Lightbulb size={12} className="text-purple-500 mt-0.5 shrink-0" />
                    <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                      {line}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Weak & Strong Topics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Weak Topics */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4}
              className="p-6 border rounded-2xl"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-red-500">Needs Work</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${c.red}15`, color: c.red }}>
                  {weakTopicsList.length}
                </span>
              </div>
              {weakTopicsList.length === 0 ? (
                <p className="text-xs font-semibold py-4 text-center" style={{ color: c.textMuted }}>
                  No weak topics identified yet. Keep practicing!
                </p>
              ) : (
                <div className="space-y-2">
                  {weakTopicsList.slice(0, 6).map((topic) => (
                    <motion.div
                      key={topic.topic}
                      whileHover={{ x: 3 }}
                      className="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors"
                      style={{
                        background: `${c.red}06`,
                        borderColor: `${c.red}18`,
                      }}
                      onClick={() => onPracticeTopic(topic.topic)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: c.text }}>
                          {topic.topic}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold" style={{ color: c.red }}>
                            {topic.accuracy}%
                          </span>
                          <span className="text-[10px]" style={{ color: c.textMuted }}>
                            {topic.totalCorrect}/{topic.totalAttempted} correct
                          </span>
                          {topic.trend === "improving" && (
                            <ArrowUpRight size={10} className="text-green-500" />
                          )}
                          {topic.trend === "declining" && (
                            <ArrowDownRight size={10} className="text-red-500" />
                          )}
                          {topic.trend === "stable" && (
                            <Minus size={10} style={{ color: c.textMuted }} />
                          )}
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${c.red}15` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onPracticeTopic(topic.topic);
                        }}
                      >
                        <Play size={13} className="text-red-500" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Strong Topics */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={4.5}
              className="p-6 border rounded-2xl"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Award size={16} className="text-green-500" />
                <h3 className="text-xs font-black uppercase tracking-wider text-green-500">Mastery Topics</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${c.green}15`, color: c.green }}>
                  {strongTopicsList.length}
                </span>
              </div>
              {strongTopicsList.length === 0 ? (
                <p className="text-xs font-semibold py-4 text-center" style={{ color: c.textMuted }}>
                  Keep practicing to build mastery in topics.
                </p>
              ) : (
                <div className="space-y-2">
                  {strongTopicsList.slice(0, 6).map((topic) => (
                    <motion.div
                      key={topic.topic}
                      whileHover={{ x: 3 }}
                      className="flex items-center justify-between p-3 rounded-xl border"
                      style={{
                        background: `${c.green}06`,
                        borderColor: `${c.green}18`,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: c.text }}>
                          {topic.topic}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold" style={{ color: c.green }}>
                            {topic.accuracy}%
                          </span>
                          <span className="text-[10px]" style={{ color: c.textMuted }}>
                            {topic.totalCorrect}/{topic.totalAttempted} correct
                          </span>
                          <CheckCircle2 size={10} className="text-green-500" />
                        </div>
                      </div>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${c.green}15` }}
                      >
                        <Crown size={13} className="text-green-500" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}

      {/* ═══════════════════ TOPICS TAB ═══════════════════ */}
      {activeTab === "topics" && (
        <div className="flex flex-col gap-5">
          {/* Topic Mastery Bar Chart */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="p-6 border rounded-2xl"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Topic Mastery Overview</h3>
            </div>
            <div style={{ height: Math.max(300, sortedTopicMastery.length * 30) }}>
              <Bar
                data={topicMasteryData}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
                      titleColor: c.text,
                      bodyColor: c.textSec,
                      borderColor: c.border,
                      borderWidth: 1,
                      padding: 10,
                      cornerRadius: 8,
                      titleFont: { weight: "bold" as const, size: 11 },
                      bodyFont: { size: 11 },
                      callbacks: {
                        label: (ctx) => {
                          const topic = sortedTopicMastery[ctx.dataIndex];
                          return [
                            `Accuracy: ${topic.accuracy}%`,
                            `Attempted: ${topic.totalAttempted}`,
                            `Correct: ${topic.totalCorrect}`,
                            `Avg Time: ${formatTimeMs(topic.avgTimeMs)}`,
                          ];
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      min: 0,
                      max: 100,
                      ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const }, stepSize: 25 },
                      grid: { color: c.border },
                    },
                    y: {
                      ticks: { color: c.textSec, font: { size: 10, weight: "bold" as const } },
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Detailed Topic Cards */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="space-y-2"
          >
            {sortedTopicMastery.map((topic, idx) => {
              const accColor = getAccuracyColor(topic.accuracy);
              return (
                <motion.div
                  key={topic.topic}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={idx * 0.3}
                  className="p-4 border rounded-2xl cursor-pointer transition-all hover:scale-[1.005]"
                  style={{ background: c.cardBg, borderColor: c.border }}
                  onClick={() => onPracticeTopic(topic.topic)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: accColor }} />
                      <span className="text-xs font-bold" style={{ color: c.text }}>
                        {topic.topic}
                      </span>
                      {topic.trend === "improving" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: `${c.green}15`, color: c.green }}>
                          Improving
                        </span>
                      )}
                      {topic.trend === "declining" && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: `${c.red}15`, color: c.red }}>
                          Declining
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black" style={{ color: accColor }}>
                        {topic.accuracy}%
                      </span>
                      <ChevronRight size={14} style={{ color: c.textMuted }} />
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${topic.accuracy}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ background: accColor }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px]" style={{ color: c.textMuted }}>
                    <span>
                      Attempted: <span className="font-bold" style={{ color: c.textSec }}>{topic.totalAttempted}</span>
                    </span>
                    <span>
                      Correct: <span className="font-bold" style={{ color: c.green }}>{topic.totalCorrect}</span>
                    </span>
                    <span>
                      Avg: <span className="font-bold" style={{ color: c.textSec }}>{formatTimeMs(topic.avgTimeMs)}</span>
                    </span>
                    <span className="ml-auto">
                      Last: <span className="font-bold" style={{ color: c.textSec }}>{new Date(topic.lastPracticed).toLocaleDateString()}</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* ═══════════════════ COMPANIES TAB ═══════════════════ */}
      {activeTab === "companies" && (
        <div className="flex flex-col gap-5">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {analytics.companyReadiness.map((cr, idx) => {
              const scoreColor = getCompanyScoreColor(cr.score);
              return (
                <motion.div
                  key={cr.company}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  custom={idx}
                  whileHover={{ y: -3, scale: 1.01 }}
                  className="p-5 border rounded-2xl cursor-pointer transition-all"
                  style={{
                    background: c.cardBg,
                    borderColor: c.border,
                    boxShadow: `0 0 0 0 transparent`,
                  }}
                  onClick={() => onCompanyTest(cr.company)}
                >
                  {/* Company Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
                        style={{ background: `${scoreColor}15`, color: scoreColor }}
                      >
                        {cr.company.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black" style={{ color: c.text }}>
                          {cr.company}
                        </p>
                        <p className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                          {cr.ready ? "Ready" : "Not Ready"}
                        </p>
                      </div>
                    </div>
                    <div className="relative" style={{ width: 56, height: 56 }}>
                      <svg width="56" height="56" className="absolute inset-0">
                        <circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                          strokeWidth="4"
                        />
                        <motion.circle
                          cx="28"
                          cy="28"
                          r="22"
                          fill="none"
                          stroke={scoreColor}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={138}
                          initial={{ strokeDashoffset: 138 }}
                          animate={{ strokeDashoffset: 138 - (138 * cr.score) / 100 }}
                          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 + idx * 0.1 }}
                          style={{ transform: "rotate(-90deg)", transformOrigin: "28px 28px" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black" style={{ color: scoreColor }}>
                          {cr.score}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <p className="text-[10px] leading-relaxed mb-3" style={{ color: c.textSec }}>
                    {cr.recommendation}
                  </p>

                  {/* Gap Topics */}
                  {cr.gapTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {cr.gapTopics.slice(0, 4).map((gap) => (
                        <span
                          key={gap}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: `${c.red}10`,
                            color: c.red,
                            border: `1px solid ${c.red}25`,
                          }}
                        >
                          {gap}
                        </span>
                      ))}
                      {cr.gapTopics.length > 4 && (
                        <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                          +{cr.gapTopics.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Start Test Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompanyTest(cr.company);
                    }}
                    className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    style={{
                      background: cr.ready ? `${c.green}15` : `${c.primary}15`,
                      color: cr.ready ? c.green : c.primary,
                      border: `1px solid ${cr.ready ? `${c.green}30` : `${c.primary}30`}`,
                    }}
                  >
                    <Play size={11} />
                    {cr.ready ? "Take Test" : "Start Preparation"}
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {/* ═══════════════════ PROGRESS TAB ═══════════════════ */}
      {activeTab === "progress" && (
        <div className="flex flex-col gap-5">
          {/* Weekly Progress Chart */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="p-6 border rounded-2xl"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-blue-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-500">Weekly Progress</h3>
            </div>
            <div className="h-64">
              <Bar
                data={weeklyProgressData as any}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      labels: {
                        color: c.textMuted,
                        font: { size: 10, weight: "bold" as const },
                        boxWidth: 12,
                        padding: 12,
                      },
                    },
                    tooltip: {
                      backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
                      titleColor: c.text,
                      bodyColor: c.textSec,
                      borderColor: c.border,
                      borderWidth: 1,
                      padding: 10,
                      cornerRadius: 8,
                      titleFont: { weight: "bold" as const, size: 11 },
                      bodyFont: { size: 11 },
                      callbacks: {
                        label: (ctx) => {
                          if (ctx.dataset.label === "Sessions") return `Sessions: ${ctx.raw}`;
                          return `Accuracy: ${ctx.raw}%`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const } },
                      grid: { color: c.border },
                    },
                    y: {
                      position: "left",
                      ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const } },
                      grid: { color: c.border },
                      title: {
                        display: true,
                        text: "Sessions",
                        color: c.textMuted,
                        font: { size: 9, weight: "bold" as const },
                      },
                    },
                    y1: {
                      position: "right",
                      min: 0,
                      max: 100,
                      ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const } },
                      grid: { display: false },
                      title: {
                        display: true,
                        text: "Accuracy %",
                        color: c.textMuted,
                        font: { size: 9, weight: "bold" as const },
                      },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Weekly XP Chart */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="p-6 border rounded-2xl"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Weekly XP Earned</h3>
            </div>
            <div className="h-48">
              <Bar
                data={{
                  labels: analytics.weeklyProgress.map((w) => w.week),
                  datasets: [
                    {
                      label: "XP",
                      data: analytics.weeklyProgress.map((w) => w.xpEarned),
                      backgroundColor: `${c.primary}70`,
                      borderColor: c.primary,
                      borderWidth: 1,
                      borderRadius: 6,
                      barThickness: 28,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
                      titleColor: c.text,
                      bodyColor: c.textSec,
                      borderColor: c.border,
                      borderWidth: 1,
                      padding: 10,
                      cornerRadius: 8,
                      titleFont: { weight: "bold" as const, size: 11 },
                      bodyFont: { size: 11 },
                      callbacks: {
                        label: (ctx) => `XP: ${ctx.raw}`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const } },
                      grid: { color: c.border },
                    },
                    y: {
                      ticks: { color: c.textMuted, font: { size: 9, weight: "bold" as const } },
                      grid: { color: c.border },
                    },
                  },
                }}
              />
            </div>
          </motion.div>

          {/* Weekly Breakdown Cards */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="space-y-2"
          >
            {analytics.weeklyProgress.map((week, idx) => {
              const accColor = getAccuracyColor(week.accuracy);
              return (
                <motion.div
                  key={week.week}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={idx * 0.3}
                  className="p-4 border rounded-2xl"
                  style={{ background: c.cardBg, borderColor: c.border }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-blue-500" />
                      <span className="text-xs font-bold" style={{ color: c.text }}>
                        Week of {week.week}
                      </span>
                    </div>
                    <span className="text-xs font-black" style={{ color: accColor }}>
                      {week.accuracy}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${week.accuracy}%` }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + idx * 0.05 }}
                      className="h-full rounded-full"
                      style={{ background: accColor }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px]" style={{ color: c.textMuted }}>
                    <span className="flex items-center gap-1">
                      <Layers size={10} /> {week.sessionsCompleted} sessions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> Avg {formatTimeMs(week.avgTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={10} className="text-amber-500" /> +{week.xpEarned} XP
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
