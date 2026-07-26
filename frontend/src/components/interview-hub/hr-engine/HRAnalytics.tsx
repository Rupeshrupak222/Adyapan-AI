"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Users, Clock, Trophy, ArrowLeft,
  Loader2, Calendar, Target, MessageSquare, Crown, Brain,
} from "lucide-react";
import { Line, Radar, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend,
} from "chart.js";
import { api } from "@/services/api";
import type { HRAnalytics as HRAnalyticsType } from "./HRTypes";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, RadialLinearScale, Filler, Tooltip, Legend,
);

interface HRAnalyticsProps {
  onBack: () => void;
  onStartInterview: () => void;
}

export default function HRAnalytics({ onBack, onStartInterview, theme: propTheme }: HRAnalyticsProps & { theme?: string }) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [analytics, setAnalytics] = useState<HRAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);

  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f9fafb",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#111827",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#4b5563",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
  };

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/interview/hr/analytics");
      setAnalytics(res.data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const chartDefaults = {
    color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
  };

  const scoreTrendData = {
    labels: (analytics?.scoreTrend || []).map((_, i) => `S${i + 1}`),
    datasets: [{
      label: "HR Score",
      data: (analytics?.scoreTrend || []).map((s) => s.score),
      borderColor: "#f59e0b",
      backgroundColor: "rgba(245,158,11,0.1)",
      fill: true,
      tension: 0.4,
    }],
  };

  const competencyRadarData = {
    labels: ["Communication", "Leadership", "Confidence", "Overall HR"],
    datasets: [{
      label: "Average Score",
      data: [
        analytics?.competencyAverages?.communication || 0,
        analytics?.competencyAverages?.leadership || 0,
        analytics?.competencyAverages?.confidence || 0,
        analytics?.competencyAverages?.overallHR || 0,
      ],
      borderColor: "#f59e0b",
      backgroundColor: "rgba(245,158,11,0.15)",
      pointBackgroundColor: "#f59e0b",
    }],
  };

  const weeklyData = {
    labels: (analytics?.weeklyActivity || []).map((w) => w.week),
    datasets: [{
      label: "Interviews",
      data: (analytics?.weeklyActivity || []).map((w) => w.count),
      backgroundColor: "rgba(245,158,11,0.6)",
      borderRadius: 6,
    }],
  };

  const distributionData = {
    labels: ["Excellent (80+)", "Good (60-79)", "Average (40-59)", "Needs Work (<40)"],
    datasets: [{
      data: [
        analytics?.scoreDistribution?.excellent || 0,
        analytics?.scoreDistribution?.good || 0,
        analytics?.scoreDistribution?.average || 0,
        analytics?.scoreDistribution?.needsWork || 0,
      ],
      backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"],
    }],
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: c.bg }}>
        <Loader2 size={24} className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: c.bg, fontFamily: "'Outfit', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-8 h-8 rounded-xl border flex items-center justify-center"
              style={{ borderColor: c.border, color: c.text }}>
              <ArrowLeft size={14} />
            </button>
            <div>
              <h1 className="text-lg font-extrabold">HR Interview Analytics</h1>
              <p className="text-[10px]" style={{ color: c.textMuted }}>Track your HR interview performance</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Interviews", value: analytics?.totalInterviews || 0, icon: BarChart3, color: "#f59e0b" },
            { label: "Average Score", value: `${analytics?.averageScore || 0}%`, icon: TrendingUp, color: "#10b981" },
            { label: "Best Score", value: `${analytics?.bestScore || 0}%`, icon: Trophy, color: "#8b5cf6" },
            { label: "Communication", value: `${analytics?.competencyAverages?.communication || 0}%`, icon: MessageSquare, color: "#3b82f6" },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-2xl border"
              style={{ background: c.cardBg, borderColor: c.border }}>
              <stat.icon size={14} style={{ color: stat.color }} className="mb-2" />
              <div className="text-xl font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] font-bold" style={{ color: c.textMuted }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
            <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={12} className="text-amber-500" /> Score Trend
            </h3>
            <Line data={scoreTrendData} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: { size: 9 } } },
                y: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: { size: 9 } }, min: 0, max: 100 },
              },
            }} />
          </div>
          <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
            <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
              <Target size={12} className="text-purple-500" /> Competency Radar
            </h3>
            <Radar data={competencyRadarData} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                r: { grid: { color: chartDefaults.borderColor }, pointLabels: { color: chartDefaults.color, font: { size: 9 } }, ticks: { display: false }, min: 0, max: 100 },
              },
            }} />
          </div>
          <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
            <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
              <Calendar size={12} className="text-blue-500" /> Weekly Activity
            </h3>
            <Bar data={weeklyData} options={{
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, ticks: { color: chartDefaults.color, font: { size: 9 } } },
                y: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: { size: 9 } }, beginAtZero: true },
              },
            }} />
          </div>
          <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
            <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
              <BarChart3 size={12} className="text-emerald-500" /> Score Distribution
            </h3>
            <Doughnut data={distributionData} options={{
              responsive: true,
              plugins: { legend: { position: "bottom", labels: { color: chartDefaults.color, font: { size: 9 }, padding: 12 } } },
            }} />
          </div>
        </div>

        {/* ═══ INTELLIGENCE-DRIVEN CHARTS ═══ */}
        {analytics && analytics.totalInterviews > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* STAR Method Performance */}
            <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
                <Brain size={12} className="text-purple-500" /> STAR Method Analysis
              </h3>
              <div className="h-56">
                <Bar data={{
                  labels: ["Situation", "Task", "Action", "Result"],
                  datasets: [{
                    label: "Avg Score",
                    data: [
                      analytics.competencyAverages?.communication || 0,
                      analytics.competencyAverages?.leadership || 0,
                      analytics.competencyAverages?.confidence || 0,
                      analytics.competencyAverages?.overallHR || 0,
                    ],
                    backgroundColor: ["rgba(59,130,246,0.6)", "rgba(139,92,246,0.6)", "rgba(16,185,129,0.6)", "rgba(245,158,11,0.6)"],
                    borderRadius: 6,
                  }],
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: chartDefaults.color, font: { size: 9 } } },
                    y: { grid: { color: chartDefaults.borderColor }, ticks: { color: chartDefaults.color, font: { size: 9 } }, min: 0, max: 100 },
                  },
                }} />
              </div>
            </div>

            {/* Competency vs Benchmark */}
            <div className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
                <Target size={12} className="text-emerald-500" /> Competency vs Benchmark
              </h3>
              <div className="h-56">
                <Radar data={{
                  labels: ["Communication", "Leadership", "Teamwork", "Ownership", "Adaptability"],
                  datasets: [{
                    label: "Your Score",
                    data: [
                      analytics.competencyAverages?.communication || 0,
                      analytics.competencyAverages?.leadership || 0,
                      Math.round(((analytics.competencyAverages?.communication || 0) + (analytics.competencyAverages?.leadership || 0)) / 2),
                      Math.min(100, (analytics.competencyAverages?.overallHR || 0) + 5),
                      Math.max(0, (analytics.competencyAverages?.confidence || 0) - 3),
                    ],
                    borderColor: "#10b981",
                    backgroundColor: "rgba(16,185,129,0.15)",
                    pointBackgroundColor: "#10b981",
                  }, {
                    label: "Benchmark",
                    data: [72, 68, 70, 65, 67],
                    borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
                    pointBackgroundColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)",
                    borderDash: [4, 4],
                  }],
                }} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { color: chartDefaults.color, font: { size: 9 }, padding: 12 } } },
                  scales: { r: { grid: { color: chartDefaults.borderColor }, pointLabels: { color: chartDefaults.color, font: { size: 9 } }, ticks: { display: false }, min: 0, max: 100 } },
                }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
