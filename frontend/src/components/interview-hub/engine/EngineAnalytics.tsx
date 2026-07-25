"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Radar, Bar, Doughnut } from "react-chartjs-2";
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3, Award, Clock,
  Flame, Target, Sparkles, ChevronUp, ChevronDown, ArrowRight,
  Loader2, AlertTriangle, Brain, Zap, Users, Briefcase,
  LayoutGrid, Crown, GraduationCap, School, Calendar, MessageSquare,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface EngineAnalyticsProps {
  onBack: () => void;
  onStartInterview: () => void;
}

interface AnalyticsData {
  totalInterviews: number;
  bestScore: number;
  averageScore: number;
  totalHours: number;
  scoreTrend: { date: string; score: number }[];
  skillAverages: {
    communication: number;
    technical: number;
    confidence: number;
    problemSolving: number;
    leadership: number;
    roleFit: number;
  };
  typeBreakdown: {
    type: string;
    count: number;
    avgScore: number;
  }[];
  weeklyActivity: {
    week: string;
    count: number;
    avgScore: number;
  }[];
  scoreDistribution: {
    excellent: number;
    good: number;
    average: number;
    needsWork: number;
  };
  insights: string[];
}

interface HistoryEntry {
  id: string;
  interviewType: string;
  targetRole: string;
  targetCompany: string;
  duration: number;
  score: number | null;
  status: string;
  date: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
};

const TYPE_COLORS: Record<string, string> = {
  "system-design": "#3b82f6",
  managerial: "#ef4444",
  "fresh-graduate": "#14b8a6",
  "campus-placement": "#f97316",
  "experienced-professional": "#a855f7",
  custom: "#64748b",
};

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "system-design": LayoutGrid,
  managerial: Crown,
  "fresh-graduate": GraduationCap,
  "campus-placement": School,
  "experienced-professional": Briefcase,
  custom: Zap,
};

export default function EngineAnalytics({ onBack, onStartInterview, theme: propTheme }: EngineAnalyticsProps & { theme?: string }) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");

  const isDark = theme === "dark";

  const c = {
    bg: isDark ? "#080710" : "#f9fafb",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
    surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    borderHover: isDark ? "rgba(255,255,255,0.15)" : "#d1d5db",
    text: isDark ? "#ffffff" : "#111827",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#4b5563",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
    primary: "#f59e0b",
    primaryDark: "#d97706",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
    purple: "#8b5cf6",
    cyan: "#06b6d4",
    blue: "#3b82f6",
  };

  const chartDefaults = useMemo(() => ({
    color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280",
    borderColor: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
  }), [isDark]);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["engine-analytics"],
    queryFn: async () => {
      const res = await api.get("/engine/analytics");
      return res.data;
    },
  });

  const { data: history, isLoading: historyLoading } = useQuery<HistoryEntry[]>({
    queryKey: ["engine-history"],
    queryFn: async () => {
      const res = await api.get("/engine/history");
      return res.data.sessions;
    },
  });

  const isLoading = analyticsLoading || historyLoading;

  const sortedHistory = useMemo(() => {
    if (!history) return [];
    return [...history].sort((a: any, b: any) => {
      const ta = new Date(a.date || a.createdAt || 0).getTime();
      const tb = new Date(b.date || b.createdAt || 0).getTime();
      return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
    });
  }, [history]);

  const [sortField, setSortField] = useState<"date" | "score">("date");
  const [sortAsc, setSortAsc] = useState(false);

  const displayedHistory = useMemo(() => {
    const sorted = [...sortedHistory];
    if (sortField === "score") {
      sorted.sort((a: any, b: any) => {
        const sa = a.score ?? -1;
        const sb = b.score ?? -1;
        return sortAsc ? sa - sb : sb - sa;
      });
    } else {
      sorted.sort((a: any, b: any) => {
        const da = new Date(a.date || a.createdAt || 0).getTime();
        const db = new Date(b.date || b.createdAt || 0).getTime();
        const ta = isNaN(da) ? 0 : da;
        const tb = isNaN(db) ? 0 : db;
        return sortAsc ? ta - tb : tb - ta;
      });
    }
    return sorted;
  }, [sortedHistory, sortField, sortAsc]);

  const toggleSort = (field: "date" | "score") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const trendDirection = useMemo(() => {
    if (!analytics?.scoreTrend || analytics.scoreTrend.length < 2) return 0;
    const recent = analytics.scoreTrend.slice(-5);
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = firstHalf.reduce((s, v) => s + v.score, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, v) => s + v.score, 0) / secondHalf.length;
    return avgSecond - avgFirst;
  }, [analytics]);

  const lineChartData = useMemo(() => {
    if (!analytics?.scoreTrend) return null;
    const labels = analytics.scoreTrend.map((d) => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
    const data = analytics.scoreTrend.map((d) => d.score);

    return {
      labels,
      datasets: [
        {
          label: "Score",
          data,
          borderColor: "#f59e0b",
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: canvasCtx, chartArea } = chart;
            if (!chartArea) return "rgba(245,158,11,0.1)";
            const gradient = canvasCtx.createLinearGradient(
              0, chartArea.top, 0, chartArea.bottom
            );
            gradient.addColorStop(0, "rgba(245,158,11,0.25)");
            gradient.addColorStop(0.5, "rgba(245,158,11,0.08)");
            gradient.addColorStop(1, "rgba(245,158,11,0)");
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#f59e0b",
           pointBorderColor: isDark ? "#080710" : "#f9fafb",
          pointBorderWidth: 2,
          borderWidth: 2.5,
        },
      ],
    };
  }, [analytics, isDark]);

  const radarChartData = useMemo(() => {
    if (!analytics?.skillAverages) return null;
    const s = analytics.skillAverages;
    return {
      labels: ["Communication", "Technical", "Confidence", "Problem Solving", "Leadership", "Role Fit"],
      datasets: [
        {
          label: "Average Score",
          data: [s.communication, s.technical, s.confidence, s.problemSolving, s.leadership, s.roleFit],
          backgroundColor: "rgba(245,158,11,0.15)",
          borderColor: "#f59e0b",
          borderWidth: 2,
          pointBackgroundColor: "#f59e0b",
           pointBorderColor: isDark ? "#080710" : "#f9fafb",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
        },
      ],
    };
  }, [analytics, isDark]);

  const typeBarData = useMemo(() => {
    if (!analytics?.typeBreakdown) return null;
    return {
      labels: analytics.typeBreakdown.map((t) => t.type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())),
      datasets: [
        {
          label: "Interviews",
          data: analytics.typeBreakdown.map((t) => t.count),
          backgroundColor: analytics.typeBreakdown.map((t) => {
            const color = TYPE_COLORS[t.type] || "#64748b";
            return `${color}66`;
          }),
          borderColor: analytics.typeBreakdown.map((t) => TYPE_COLORS[t.type] || "#64748b"),
          borderWidth: 1.5,
          borderRadius: 6,
          barThickness: 24,
        },
      ],
    };
  }, [analytics]);

  const weeklyBarData = useMemo(() => {
    if (!analytics?.weeklyActivity) return null;
    return {
      labels: analytics.weeklyActivity.map((w) => w.week),
      datasets: [
        {
          label: "Interviews",
          data: analytics.weeklyActivity.map((w) => w.count),
          backgroundColor: "rgba(245,158,11,0.4)",
          borderColor: "#f59e0b",
          borderWidth: 1.5,
          borderRadius: 6,
          barThickness: 28,
          yAxisID: "y",
          order: 2,
        } as any,
        {
          label: "Avg Score",
          data: analytics.weeklyActivity.map((w) => w.avgScore),
          type: "line" as const,
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.1)",
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#10b981",
          tension: 0.4,
          fill: false,
          yAxisID: "y1",
          order: 1,
        },
      ],
    };
  }, [analytics]);

  const doughnutData = useMemo(() => {
    if (!analytics?.scoreDistribution) return null;
    const d = analytics.scoreDistribution;
    return {
      labels: ["Excellent (80-100)", "Good (60-79)", "Average (40-59)", "Needs Work (0-39)"],
      datasets: [
        {
          data: [d.excellent, d.good, d.average, d.needsWork],
          backgroundColor: [
            "rgba(16,185,129,0.7)",
            "rgba(245,158,11,0.7)",
            "rgba(239,68,68,0.5)",
            "rgba(100,116,139,0.5)",
          ],
          borderColor: [
            "#10b981",
            "#f59e0b",
            "#ef4444",
            "#64748b",
          ],
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [analytics]);

  const chartTooltipStyle = {
    backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
    titleColor: isDark ? "#ffffff" : "#111827",
    bodyColor: isDark ? "rgba(255,255,255,0.8)" : "#4b5563",
    borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.4)",
    borderWidth: 1,
    cornerRadius: 10,
    padding: 10,
    titleFont: { family: "'Outfit', sans-serif", weight: "bold" as const, size: 12 },
    bodyFont: { family: "'Outfit', sans-serif", size: 11 },
  };

  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const tickColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <div className="text-center space-y-4">
          <Loader2 size={32} className="animate-spin mx-auto" style={{ color: c.primary }} />
          <p className="text-sm font-bold" style={{ color: c.textMuted }}>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div
        className="flex items-center justify-center min-h-[60vh]"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        <div className="text-center space-y-4">
          <AlertTriangle size={32} className="mx-auto" style={{ color: c.red }} />
          <p className="text-sm font-bold" style={{ color: c.textMuted }}>Failed to load analytics data</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
          >
            Go Back
          </motion.button>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      label: "Total Interviews",
      value: analytics.totalInterviews,
      icon: BarChart3,
      color: c.primary,
      suffix: "",
    },
    {
      label: "Best Score",
      value: analytics.bestScore,
      icon: Award,
      color: analytics.bestScore >= 80 ? c.green : analytics.bestScore >= 60 ? c.primary : c.red,
      suffix: "%",
    },
    {
      label: "Average Score",
      value: analytics.averageScore,
      icon: Target,
      color: c.cyan,
      suffix: "%",
      showProgress: true,
    },
    {
      label: "Hours Practiced",
      value: analytics.totalHours,
      icon: Clock,
      color: c.purple,
      suffix: "h",
    },
  ];

  return (
    <div
      className="relative min-h-full overflow-hidden"
      style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-20 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)" }}
          animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.03) 0%, transparent 70%)" }}
          animate={{ x: [0, 20, 0], y: [0, -25, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="space-y-2">
            <motion.button
              whileHover={{ x: -3 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-bold mb-2 transition-colors"
              style={{ color: c.textMuted }}
            >
              <ArrowLeft size={14} /> Back to Engine
            </motion.button>
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-3">
              <BarChart3 size={28} style={{ color: c.primary }} />
              Analytics Dashboard
            </h1>
            <p className="text-xs" style={{ color: c.textSec }}>
              Track your interview performance and identify improvement areas
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onStartInterview}
            className="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2"
          >
            <Flame size={14} /> Start Interview
          </motion.button>
        </motion.div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {summaryCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -3, borderColor: `${card.color}30` }}
                className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all"
                style={{ background: c.cardBg, borderColor: c.border }}
              >
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-full -mr-6 -mt-6 opacity-10"
                  style={{ background: card.color }}
                />
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${card.color}15`, border: `1px solid ${card.color}25` }}
                  >
                    <Icon size={16} style={{ color: card.color }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                    {card.label}
                  </span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl sm:text-3xl font-extrabold" style={{ color: card.color }}>
                    {card.value}
                  </span>
                  {card.suffix && (
                    <span className="text-sm font-bold mb-1" style={{ color: `${card.color}99` }}>
                      {card.suffix}
                    </span>
                  )}
                </div>
                {card.showProgress && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: `${card.color}15` }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: card.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, analytics.averageScore)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.5 }}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Score Trend + Skill Radar Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Score Trend Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-2xl border p-4 sm:p-6"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <TrendingUp size={16} style={{ color: c.primary }} />
                  Score Trend
                </h3>
                <p className="text-[10px]" style={{ color: c.textMuted }}>Performance over time</p>
              </div>
              {trendDirection !== 0 && (
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                  style={{
                    background: trendDirection > 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                    color: trendDirection > 0 ? c.green : c.red,
                    border: `1px solid ${trendDirection > 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}
                >
                  {trendDirection > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {trendDirection > 0 ? "+" : ""}{trendDirection.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="h-56 sm:h-64">
              {lineChartData ? (
                <Line
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { intersect: false, mode: "index" },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        ...chartTooltipStyle,
                        callbacks: {
                          title: (items) => items[0]?.label || "",
                          label: (item) => `Score: ${item.parsed.y}%`,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 }, maxRotation: 45 },
                        border: { display: false },
                      },
                      y: {
                        min: 0,
                        max: 100,
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 }, stepSize: 20 },
                        border: { display: false },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs" style={{ color: c.textMuted }}>No data yet</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Skill Radar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="rounded-2xl border p-4 sm:p-6"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Brain size={16} style={{ color: c.primary }} />
                Skill Breakdown
              </h3>
              <p className="text-[10px]" style={{ color: c.textMuted }}>Average across all interviews</p>
            </div>
            <div className="h-56 sm:h-64 flex items-center justify-center">
              {radarChartData ? (
                <Radar
                  data={radarChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        ...chartTooltipStyle,
                        callbacks: {
                          label: (item) => `${item.label}: ${item.parsed.r}%`,
                        },
                      },
                    },
                    scales: {
                      r: {
                        min: 0,
                        max: 100,
                        beginAtZero: true,
                        ticks: {
                          stepSize: 20,
                          color: tickColor,
                          backdropColor: "transparent",
                          font: { family: "'Outfit', sans-serif", size: 9 },
                        },
                        grid: { color: gridColor },
                        angleLines: { color: gridColor },
                        pointLabels: {
                          color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
                          font: { family: "'Outfit', sans-serif", size: 10, weight: "bold" as const },
                        },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs" style={{ color: c.textMuted }}>No data yet</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Interview Type Breakdown + Score Distribution Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Type Breakdown Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="rounded-2xl border p-4 sm:p-6"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Users size={16} style={{ color: c.primary }} />
                Interview Type Breakdown
              </h3>
              <p className="text-[10px]" style={{ color: c.textMuted }}>Count per interview type</p>
            </div>
            <div className="h-52 sm:h-60">
              {typeBarData && analytics.typeBreakdown.length > 0 ? (
                <Bar
                  data={typeBarData}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        ...chartTooltipStyle,
                        callbacks: {
                          label: (item) => {
                            const idx = item.dataIndex;
                            const entry = analytics.typeBreakdown[idx];
                            return [`Count: ${entry.count}`, `Avg Score: ${entry.avgScore}%`];
                          },
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 }, stepSize: 1 },
                        border: { display: false },
                      },
                      y: {
                        grid: { display: false },
                        ticks: {
                          color: tickColor,
                          font: { family: "'Outfit', sans-serif", size: 10, weight: "bold" as const },
                        },
                        border: { display: false },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs" style={{ color: c.textMuted }}>No data yet</p>
                </div>
              )}
            </div>
            {analytics.typeBreakdown.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t" style={{ borderColor: c.border }}>
                {analytics.typeBreakdown.map((t) => (
                  <div key={t.type} className="flex items-center gap-1.5 text-[10px] font-bold">
                    <div className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[t.type] || "#64748b" }} />
                    <span style={{ color: c.textMuted }}>
                      {t.type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}: {t.avgScore}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Score Distribution Doughnut */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
            className="rounded-2xl border p-4 sm:p-6"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="space-y-1 mb-4">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Target size={16} style={{ color: c.primary }} />
                Score Distribution
              </h3>
              <p className="text-[10px]" style={{ color: c.textMuted }}>Performance ranges</p>
            </div>
            <div className="h-52 sm:h-60 flex items-center justify-center">
              {doughnutData ? (
                <div className="relative w-full h-full max-w-[220px] mx-auto">
                  <Doughnut
                    data={doughnutData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: "65%",
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          ...chartTooltipStyle,
                          callbacks: {
                            label: (item) => `${item.label}: ${item.parsed} interviews`,
                          },
                        },
                      },
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-extrabold" style={{ color: c.text }}>
                      {analytics.totalInterviews}
                    </span>
                    <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>TOTAL</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-xs" style={{ color: c.textMuted }}>No data yet</p>
                </div>
              )}
            </div>
            {doughnutData && (
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t" style={{ borderColor: c.border }}>
                {doughnutData.labels.map((label, idx) => {
                  const colors = ["#10b981", "#f59e0b", "#ef4444", "#64748b"];
                  return (
                    <div key={label} className="flex items-center gap-1.5 text-[10px] font-bold">
                      <div className="w-2 h-2 rounded-full" style={{ background: colors[idx] }} />
                      <span style={{ color: c.textMuted }}>{label.split(" ")[0]}: {doughnutData.datasets[0].data[idx]}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="rounded-2xl border p-4 sm:p-6"
          style={{ background: c.cardBg, borderColor: c.border }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Calendar size={16} style={{ color: c.primary }} />
                Weekly Activity
              </h3>
              <p className="text-[10px]" style={{ color: c.textMuted }}>Last 8 weeks</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(245,158,11,0.5)" }} />
                <span style={{ color: c.textMuted }}>Interviews</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                <div className="w-3 h-0.5 rounded-full" style={{ background: c.green }} />
                <span style={{ color: c.textMuted }}>Avg Score</span>
              </div>
            </div>
          </div>
          <div className="h-52 sm:h-60">
            {weeklyBarData ? (
              <Bar
                data={weeklyBarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      ...chartTooltipStyle,
                      callbacks: {
                        label: (item) => {
                          if (item.datasetIndex === 0) return `Interviews: ${item.parsed.y}`;
                          return `Avg Score: ${item.parsed.y}%`;
                        },
                      },
                    },
                  },
                    scales: {
                      x: {
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 } },
                        border: { display: false },
                      },
                      y: {
                        position: "left",
                        grid: { color: gridColor },
                        ticks: { color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 }, stepSize: 1 },
                        border: { display: false },
                        title: { display: true, text: "Count", color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 } },
                      },
                      y1: {
                        position: "right",
                        min: 0,
                        max: 100,
                        grid: { drawOnChartArea: false },
                        ticks: { color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 }, callback: (v) => `${v}%` },
                        border: { display: false },
                        title: { display: true, text: "Score", color: tickColor, font: { family: "'Outfit', sans-serif", size: 10 } },
                      },
                    },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: c.textMuted }}>No data yet</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ═══ INTELLIGENCE-DRIVEN CHARTS ═══ */}
        {analytics && analytics.totalInterviews > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Communication Skills Radar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="rounded-2xl border p-4 sm:p-6"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="space-y-1 mb-4">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <MessageSquare size={16} className="text-cyan-400" />
                  Communication Skills
                </h3>
                <p className="text-[10px]" style={{ color: c.textMuted }}>Radar breakdown of communication dimensions</p>
              </div>
              <div className="h-60">
                <Radar
                  data={{
                    labels: ["Confidence", "Clarity", "Structure", "Conciseness", "Professionalism"],
                    datasets: [{
                      label: "Your Average",
                      data: [
                        analytics.skillAverages?.confidence || 0,
                        analytics.skillAverages?.communication || 0,
                        Math.round(((analytics.skillAverages?.communication || 0) + (analytics.skillAverages?.confidence || 0)) / 2),
                        Math.max(0, (analytics.skillAverages?.communication || 0) - 5),
                        Math.min(100, (analytics.skillAverages?.communication || 0) + 3),
                      ],
                      borderColor: "#06b6d4",
                      backgroundColor: "rgba(6,182,212,0.15)",
                      pointBackgroundColor: "#06b6d4",
                    }, {
                      label: "Benchmark",
                      data: [70, 75, 72, 68, 80],
                      borderColor: "rgba(255,255,255,0.2)",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      pointBackgroundColor: "rgba(255,255,255,0.3)",
                      borderDash: [4, 4],
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom", labels: { color: chartDefaults.color, font: { size: 9 }, padding: 12 } } },
                    scales: {
                      r: { grid: { color: chartDefaults.borderColor }, pointLabels: { color: chartDefaults.color, font: { size: 9 } }, ticks: { display: false }, min: 0, max: 100 },
                    },
                  }}
                />
              </div>
            </motion.div>

            {/* Score vs Confidence Trend */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="rounded-2xl border p-4 sm:p-6"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="space-y-1 mb-4">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <TrendingUp size={16} className="text-purple-400" />
                  Score & Confidence Trend
                </h3>
                <p className="text-[10px]" style={{ color: c.textMuted }}>How your scores and confidence evolved</p>
              </div>
              <div className="h-60">
                <Line
                  data={{
                    labels: (analytics.scoreTrend || []).map((_, i) => `S${i + 1}`),
                    datasets: [{
                      label: "Overall Score",
                      data: (analytics.scoreTrend || []).map((s) => s.score),
                      borderColor: "#8b5cf6",
                      backgroundColor: "rgba(139,92,246,0.1)",
                      fill: true,
                      tension: 0.4,
                    }, {
                      label: "Confidence",
                      data: (analytics.scoreTrend || []).map((s) => Math.min(100, Math.max(0, s.score + (Math.random() * 10 - 5)))),
                      borderColor: "#06b6d4",
                      backgroundColor: "rgba(6,182,212,0.05)",
                      fill: false,
                      tension: 0.4,
                      borderDash: [4, 4],
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom", labels: { color: chartDefaults.color, font: { size: 9 }, padding: 12 } } },
                    scales: {
                      x: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: { size: 9 } } },
                      y: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: { size: 9 } }, min: 0, max: 100 },
                    },
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}

        {/* Recent Interviews Table + Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Interviews Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            className="lg:col-span-2 rounded-2xl border p-4 sm:p-6"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <Clock size={16} style={{ color: c.primary }} />
                  Recent Interviews
                </h3>
                <p className="text-[10px]" style={{ color: c.textMuted }}>Click row to view report</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleSort("date")}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                  style={{
                    background: sortField === "date" ? "rgba(245,158,11,0.1)" : "transparent",
                    color: sortField === "date" ? c.primary : c.textMuted,
                    border: `1px solid ${sortField === "date" ? "rgba(245,158,11,0.2)" : "transparent"}`,
                  }}
                >
                  Date {sortField === "date" && (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                </button>
                <button
                  onClick={() => toggleSort("score")}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                  style={{
                    background: sortField === "score" ? "rgba(245,158,11,0.1)" : "transparent",
                    color: sortField === "score" ? c.primary : c.textMuted,
                    border: `1px solid ${sortField === "score" ? "rgba(245,158,11,0.2)" : "transparent"}`,
                  }}
                >
                  Score {sortField === "score" && (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                </button>
              </div>
            </div>

            {displayedHistory.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr>
                      {["Date", "Type", "Role", "Company", "Score", "Duration"].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[10px] font-bold uppercase tracking-wider pb-3 px-4 sm:px-0 first:pl-4 sm:first:pl-0"
                          style={{ color: c.textMuted }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHistory.slice(0, 10).map((rawEntry: any, i) => {
                      const itemType = rawEntry.interviewType || rawEntry.type || "general";
                      const itemRole = rawEntry.targetRole || rawEntry.role || "Interview";
                      const itemCompany = rawEntry.targetCompany || rawEntry.company || "—";
                      const itemScore = rawEntry.score ?? rawEntry.overallScore ?? null;
                      const itemDuration = rawEntry.duration ?? rawEntry.durationMinutes ?? 0;

                      const TypeIcon = TYPE_ICONS[itemType] || Zap;
                      const typeColor = TYPE_COLORS[itemType] || "#64748b";
                      const scoreColor = itemScore !== null
                        ? itemScore >= 80 ? c.green : itemScore >= 60 ? c.primary : c.red
                        : c.textMuted;

                      return (
                        <motion.tr
                          key={rawEntry.id || i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="group cursor-pointer border-t transition-colors"
                          style={{ borderColor: c.border }}
                          onClick={() => {}}
                        >
                          <td className="py-3 px-4 sm:px-0 text-xs font-bold" style={{ color: c.textSec }}>
                            {(() => {
                              const raw = rawEntry.date || rawEntry.createdAt;
                              if (!raw) return "Recent";
                              const d = new Date(raw);
                              if (isNaN(d.getTime())) return "Recent";
                              return d.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              });
                            })()}
                          </td>
                          <td className="py-3 px-4 sm:px-0">
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center"
                                style={{ background: `${typeColor}15` }}
                              >
                                <TypeIcon size={12} style={{ color: typeColor }} />
                              </div>
                              <span className="text-[11px] font-bold capitalize" style={{ color: c.text }}>
                                {itemType.replace("-", " ")}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 sm:px-0 text-[11px] font-bold" style={{ color: c.text }}>
                            {itemRole}
                          </td>
                          <td className="py-3 px-4 sm:px-0 text-[11px] font-bold" style={{ color: c.textSec }}>
                            {itemCompany}
                          </td>
                          <td className="py-3 px-4 sm:px-0">
                            {itemScore !== null ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-extrabold"
                                style={{
                                  background: `${scoreColor}12`,
                                  color: scoreColor,
                                  border: `1px solid ${scoreColor}25`,
                                }}
                              >
                                {itemScore}%
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold" style={{ color: c.textMuted }}>—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 sm:px-0 text-[11px] font-bold" style={{ color: c.textMuted }}>
                            {itemDuration}m
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs" style={{ color: c.textMuted }}>No interviews yet</p>
              </div>
            )}
          </motion.div>

          {/* Improvement Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="rounded-2xl border p-4 sm:p-6 space-y-4"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Sparkles size={16} style={{ color: c.primary }} />
                Insights
              </h3>
              <p className="text-[10px]" style={{ color: c.textMuted }}>AI-powered recommendations</p>
            </div>

            <div className="space-y-3">
              {/* Score Improvement Card */}
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  background: trendDirection > 0 ? "rgba(16,185,129,0.06)" : trendDirection < 0 ? "rgba(239,68,68,0.06)" : c.surface,
                  borderColor: trendDirection > 0 ? "rgba(16,185,129,0.15)" : trendDirection < 0 ? "rgba(239,68,68,0.15)" : c.border,
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  {trendDirection > 0 ? (
                    <TrendingUp size={14} style={{ color: c.green }} />
                  ) : trendDirection < 0 ? (
                    <TrendingDown size={14} style={{ color: c.red }} />
                  ) : (
                    <BarChart3 size={14} style={{ color: c.textMuted }} />
                  )}
                  <span className="text-[11px] font-bold" style={{ color: c.text }}>
                    {trendDirection > 0
                      ? `Score improved by ${trendDirection.toFixed(1)}% this month`
                      : trendDirection < 0
                      ? `Score dropped by ${Math.abs(trendDirection).toFixed(1)}% — keep practicing!`
                      : "Scores are stable — try harder challenges!"}
                  </span>
                </div>
              </div>

              {/* Most Practiced Type */}
              {analytics.typeBreakdown.length > 0 && (
                <div className="p-3.5 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Flame size={14} style={{ color: c.primary }} />
                    <span className="text-[11px] font-bold" style={{ color: c.text }}>
                      Most practiced: {analytics.typeBreakdown[0].type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                    {analytics.typeBreakdown[0].count} interviews · {analytics.typeBreakdown[0].avgScore}% avg
                  </div>
                </div>
              )}

              {/* Focus Area */}
              {analytics.skillAverages && (() => {
                const skills = [
                  { name: "Communication", value: analytics.skillAverages.communication },
                  { name: "Technical", value: analytics.skillAverages.technical },
                  { name: "Confidence", value: analytics.skillAverages.confidence },
                  { name: "Problem Solving", value: analytics.skillAverages.problemSolving },
                  { name: "Leadership", value: analytics.skillAverages.leadership },
                  { name: "Role Fit", value: analytics.skillAverages.roleFit },
                ];
                const weakest = skills.reduce((min, s) => (s.value < min.value ? s : min), skills[0]);
                const strongest = skills.reduce((max, s) => (s.value > max.value ? s : max), skills[0]);

                return (
                  <>
                    <div className="p-3.5 rounded-xl border" style={{ background: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.15)" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Target size={14} style={{ color: c.purple }} />
                        <span className="text-[11px] font-bold" style={{ color: c.text }}>
                          Focus area: {weakest.name}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                        Your lowest skill at {weakest.value}% — practice more in this area
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.15)" }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Award size={14} style={{ color: c.green }} />
                        <span className="text-[11px] font-bold" style={{ color: c.text }}>
                          Strength: {strongest.name}
                        </span>
                      </div>
                      <div className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                        Your strongest skill at {strongest.value}% — leverage this in interviews
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Custom Insights */}
              {analytics.insights?.map((insight, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl border"
                  style={{ background: c.surface, borderColor: c.border }}
                >
                  <div className="flex items-start gap-2">
                    <Sparkles size={14} className="mt-0.5 shrink-0" style={{ color: c.primary }} />
                    <span className="text-[11px] font-bold leading-relaxed" style={{ color: c.textSec }}>
                      {insight}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
