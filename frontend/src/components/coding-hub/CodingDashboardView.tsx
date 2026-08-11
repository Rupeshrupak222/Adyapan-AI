"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Code2, Sparkles, Trophy, Clock, RefreshCw, Check, TrendingUp,
  Target, Flame, Zap, BarChart3, Brain, Lightbulb, ArrowRight,
  AlertTriangle, Star, ChevronRight, BookOpen, Award, Calendar,
  Activity, LineChart as LineChartIcon, Shield, Rocket, CheckCircle2,
  X, Hash, ArrowUpRight, Eye
} from "lucide-react";
import {
  FloatingOrbs,
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumProgressBar
} from "@/components/ui/PremiumComponents";
import {
  CodingEmptyState,
  codingFadeUp
} from "@/components/coding-hub/CodingHubShared";
import { PlacementImpactCard } from "@/components/placement-hub/PlacementImpactCard";
import {
  DashboardSidebar,
  DashboardTopNav,
} from "@/components/dashboard-shell";
import type { AdyapanUser } from "@/components/dashboard-shell";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Line, Radar, Doughnut, Bar } from "react-chartjs-2";
import CountUp from "react-countup";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  RadialLinearScale, ArcElement, BarElement,
  Title, Tooltip, Legend, Filler
);

const LOADING_STEPS = [
  "Analyzing Coding Activity",
  "Calculating Readiness Scores",
  "Generating AI Insights",
  "Building Analytics",
  "Preparing Dashboard",
  "Ready"
];

const ALL_TOPICS = [
  "Arrays", "Strings", "Hashing", "Linked Lists", "Stacks", "Queues",
  "Trees", "BST", "Heaps", "Recursion", "Backtracking",
  "Greedy", "Dynamic Programming", "Graphs", "Tries", "Sliding Window",
  "Two Pointers", "Bit Manipulation", "Binary Search"
];

function TypewriterText({ text, speed = 4 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let idx = 0;
    setDisplayed("");
    if (!text) return;
    const interval = setInterval(() => {
      if (idx < text.length) {
        setDisplayed((prev) => prev + text.charAt(idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return (
    <span className="text-sm text-[var(--text-primary)] opacity-90 leading-relaxed">
      {displayed}
      <span className="inline-block w-0.5 h-3 bg-amber-500 ml-0.5 animate-pulse" />
    </span>
  );
}

export function CodingDashboardView() {
  useRequireAuth("USER");

  const router = useRouter();
  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);

  const [analytics, setAnalytics] = useState<any>(null);

  const isDark = theme === "dark";

  useEffect(() => {
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    try {
      const rawUser = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {}
    api.get("/notifications?limit=5").then((res) => {
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.notifications?.filter((n: any) => !n.read).length || 0);
    }).catch(() => {});

    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/coding/dashboard/analytics");
      setAnalytics(res.data);
    } catch {
      toast.error("Failed to load dashboard analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleViewProfile = () => router.push("/profile");
  const handlePremium = () => router.push("/premium");
  const handleViewDashboard = () => router.push("/dashboard/user");
  const handleAdyChat = () => {
    localStorage.setItem("dashboard-active-view", "ady-chat");
    router.push("/dashboard/user");
  };
  const handleViewTool = (tool: string) => {
    localStorage.setItem("dashboard-active-view", tool);
    router.push("/dashboard/user");
  };

  return (
    <div className="w-full font-sans relative">
      {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
            <RefreshCw size={24} className="animate-spin text-amber-500 mb-3" />
            <p className="text-xs font-bold text-[var(--text-secondary)]">Loading Coding Dashboard...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-8">
            {/* ─── HEADER ────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
                  Coding Dashboard
                </h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Your central intelligence layer for coding mastery and placement readiness.
                </p>
              </div>
              <div className="flex gap-2">
                <PremiumButton variant="secondary" onClick={() => router.push("/dashboard/coding")} icon={<Code2 size={14} />}>
                  DSA Practice
                </PremiumButton>
                <PremiumButton variant="primary" onClick={() => router.push("/dashboard/coding/roadmap")} icon={<Rocket size={14} />}>
                  My Roadmap
                </PremiumButton>
              </div>
            </motion.div>

            {/* ─── HERO METRICS ──────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: "Questions Solved", value: analytics.overview.questionsSolved, color: "text-emerald-500", icon: <CheckCircle2 size={18} />, desc: "completed exercises" },
                { label: "Challenges Done", value: analytics.overview.challengesCompleted, color: "text-amber-500", icon: <Trophy size={18} />, desc: "competitions won" },
                { label: "Current Streak", value: analytics.overview.currentStreak, color: "text-orange-500", icon: <Flame size={18} />, suffix: " days", desc: "coding momentum" },
                { label: "Roadmap Progress", value: analytics.overview.roadmapCompletion, color: "text-purple-500", icon: <Target size={18} />, suffix: "%", desc: "on track" },
                { label: "Interview Ready", value: analytics.overview.interviewReadiness, color: "text-blue-500", icon: <Shield size={18} />, suffix: "%", desc: "confidence score" },
                { label: "Placement Ready", value: analytics.overview.placementReadiness, color: "text-rose-500", icon: <Award size={18} />, suffix: "%", desc: "hireability score" }
              ].map((card, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={codingFadeUp}
                  initial="hidden"
                  animate="visible"
                  className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm backdrop-blur-md flex flex-col justify-between min-h-[120px] group hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">{card.label}</span>
                    <span className={`${card.color} opacity-40 group-hover:opacity-80 transition-opacity`}>{card.icon}</span>
                  </div>
                  <div className="mt-3 flex flex-col">
                    <span className={`text-3xl font-black ${card.color}`}>
                      <CountUp end={card.value} duration={1.8} enableScrollSpy />{card.suffix || ""}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]/80 font-medium mt-1">{card.desc}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ─── AI BRIEF ──────────────────────────────────────── */}
            <motion.div custom={6} variants={codingFadeUp} initial="hidden" animate="visible">
              <PremiumCard glow className="p-6 bg-[var(--bg-card)] border-[var(--border-color)]">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 animate-pulse">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-2">AI Coding Brief</p>
                    <TypewriterText
                      text={`${analytics.aiBrief.greeting}. You solved ${analytics.aiBrief.weeklySolved} questions this week. ${analytics.aiBrief.weakestTopic} remains your weakest topic (${analytics.aiBrief.weakestTopicMastery}% mastery). Focus areas could improve your placement readiness by ~${analytics.aiBrief.improvementPotential}%. You are currently ${analytics.aiBrief.interviewReadiness}% interview ready.`}
                    />
                  </div>
                </div>
              </PremiumCard>
            </motion.div>

            {/* ─── PLACEMENT IMPACT ─────────────────────────────── */}
            <PlacementImpactCard accentColor="#f59e0b" onNavigate={(v) => { localStorage.setItem("dashboard-active-view", v); router.push("/dashboard/user"); }} />

            {/* ─── CHARTS ROW 1: Activity + Topic Mastery ──────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Activity Chart */}
              <motion.div custom={7} variants={codingFadeUp} initial="hidden" animate="visible" className="lg:col-span-2">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] hover:border-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.04)] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Activity size={18} className="text-amber-500" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Coding Activity</h3>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Last 30 Days</span>
                  </div>
                  <div className="h-[280px]">
                    <Line
                      data={{
                        labels: analytics.activityChart.labels.map((l: string) => {
                          const d = new Date(l);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }),
                        datasets: [
                          {
                            label: "Questions Solved",
                            data: analytics.activityChart.questionsSolved,
                            borderColor: "#10b981",
                            backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.05)",
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            borderWidth: 2
                          },
                          {
                            label: "Sessions",
                            data: analytics.activityChart.sessions,
                            borderColor: "#f59e0b",
                            backgroundColor: isDark ? "rgba(245,158,11,0.05)" : "rgba(245,158,11,0.03)",
                            fill: true,
                            tension: 0.4,
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            borderWidth: 2
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { intersect: false, mode: "index" },
                        plugins: {
                          legend: {
                            display: true,
                            position: "top",
                            align: "end",
                            labels: {
                              color: isDark ? "#9ca3af" : "#475569",
                              font: { size: 10, weight: "bold" },
                              boxWidth: 8,
                              boxHeight: 8,
                              borderRadius: 2,
                              useBorderRadius: true,
                              padding: 12
                            }
                          },
                          tooltip: {
                            backgroundColor: isDark ? "#1a1c29" : "#ffffff",
                            titleColor: isDark ? "#f3f4f6" : "#0f172a",
                            bodyColor: isDark ? "#9ca3af" : "#475569",
                            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                            borderWidth: 1,
                            cornerRadius: 10,
                            padding: 10,
                            titleFont: { size: 11, weight: "bold" },
                            bodyFont: { size: 10 }
                          }
                        },
                        scales: {
                          x: {
                            grid: { display: false },
                            ticks: { color: isDark ? "#6b7280" : "#94a3b8", font: { size: 9 }, maxTicksLimit: 8 }
                          },
                          y: {
                            grid: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
                            ticks: { color: isDark ? "#6b7280" : "#94a3b8", font: { size: 9 }, stepSize: 1 },
                            beginAtZero: true
                          }
                        }
                      }}
                    />
                  </div>
                </PremiumCard>
              </motion.div>

              {/* Topic Mastery Radar */}
              <motion.div custom={8} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-purple-500/20 hover:shadow-[0_0_24px_rgba(168,85,247,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain size={18} className="text-purple-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Topic Mastery</h3>
                  </div>
                  <div className="h-[280px]">
                    <Radar
                      data={{
                        labels: analytics.topicMastery.slice(0, 10).map((t: any) => t.topic.length > 10 ? t.topic.slice(0, 10) + "..." : t.topic),
                        datasets: [
                          {
                            label: "Mastery %",
                            data: analytics.topicMastery.slice(0, 10).map((t: any) => t.score),
                            backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)",
                            borderColor: "#f59e0b",
                            borderWidth: 2,
                            pointBackgroundColor: "#f59e0b",
                            pointBorderColor: "#f59e0b",
                            pointRadius: 3,
                            pointHoverRadius: 6
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: isDark ? "#1a1c29" : "#ffffff",
                            titleColor: isDark ? "#f3f4f6" : "#0f172a",
                            bodyColor: isDark ? "#9ca3af" : "#475569",
                            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 8,
                            titleFont: { size: 10, weight: "bold" },
                            bodyFont: { size: 10 }
                          }
                        },
                        scales: {
                          r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              stepSize: 25,
                              color: isDark ? "#6b7280" : "#94a3b8",
                              font: { size: 8 },
                              backdropColor: "transparent"
                            },
                            grid: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
                            angleLines: { color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
                            pointLabels: { color: isDark ? "#9ca3af" : "#475569", font: { size: 9, weight: "bold" } }
                          }
                        }
                      }}
                    />
                  </div>
                </PremiumCard>
              </motion.div>
            </div>

            {/* ─── CHARTS ROW 2: Difficulty Distribution + Efficiency Trend ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Difficulty Doughnut */}
              <motion.div custom={9} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-emerald-500/20 hover:shadow-[0_0_24px_rgba(16,185,129,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Hash size={18} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Difficulty Distribution</h3>
                  </div>
                  <div className="h-[250px] flex items-center justify-center">
                    <Doughnut
                      data={{
                        labels: ["Easy", "Medium", "Hard", "Expert"],
                        datasets: [{
                          data: [
                            analytics.difficultyDistribution.Easy,
                            analytics.difficultyDistribution.Medium,
                            analytics.difficultyDistribution.Hard,
                            analytics.difficultyDistribution.Expert
                          ],
                          backgroundColor: ["#10b981", "#f59e0b", "#f43f5e", "#a855f7"],
                          borderColor: isDark ? "#0a0a0f" : "#ffffff",
                          borderWidth: 3,
                          hoverOffset: 6
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: "68%",
                        plugins: {
                          legend: {
                            position: "bottom",
                            labels: {
                              color: isDark ? "#9ca3af" : "#475569",
                              font: { size: 10, weight: "bold" },
                              boxWidth: 10,
                              boxHeight: 10,
                              borderRadius: 3,
                              useBorderRadius: true,
                              padding: 14
                            }
                          },
                          tooltip: {
                            backgroundColor: isDark ? "#1a1c29" : "#ffffff",
                            titleColor: isDark ? "#f3f4f6" : "#0f172a",
                            bodyColor: isDark ? "#9ca3af" : "#475569",
                            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                            borderWidth: 1,
                            cornerRadius: 8,
                            padding: 10,
                            titleFont: { size: 11, weight: "bold" },
                            bodyFont: { size: 10 }
                          }
                        }
                      }}
                    />
                  </div>
                </PremiumCard>
              </motion.div>

              {/* Efficiency Trend */}
              <motion.div custom={10} variants={codingFadeUp} initial="hidden" animate="visible" className="lg:col-span-2">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] hover:border-blue-500/20 hover:shadow-[0_0_24px_rgba(59,130,246,0.04)] transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={18} className="text-blue-500" />
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">Efficiency Trend</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Avg Score:</span>
                      <span className="text-xs font-black text-amber-500">{analytics.complexityAnalytics.avgEfficiencyScore}%</span>
                    </div>
                  </div>
                  <div className="h-[220px]">
                    {analytics.complexityAnalytics.efficiencyTrend.length > 0 ? (
                      <Bar
                        data={{
                          labels: analytics.complexityAnalytics.efficiencyTrend.map((_: any, i: number) => `#${i + 1}`),
                          datasets: [{
                            label: "Efficiency Score",
                            data: analytics.complexityAnalytics.efficiencyTrend.map((t: any) => t.score),
                            backgroundColor: analytics.complexityAnalytics.efficiencyTrend.map((t: any) =>
                              t.score >= 80 ? "rgba(16,185,129,0.6)" : t.score >= 60 ? "rgba(245,158,11,0.6)" : "rgba(244,63,94,0.6)"
                            ),
                            borderRadius: 6,
                            borderSkipped: false,
                            maxBarThickness: 30
                          }]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              backgroundColor: isDark ? "#1a1c29" : "#ffffff",
                              titleColor: isDark ? "#f3f4f6" : "#0f172a",
                              bodyColor: isDark ? "#9ca3af" : "#475569",
                              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                              borderWidth: 1,
                              cornerRadius: 8,
                              padding: 10,
                              titleFont: { size: 11, weight: "bold" },
                              bodyFont: { size: 10 }
                            }
                          },
                          scales: {
                            x: {
                              grid: { display: false },
                              ticks: { color: isDark ? "#6b7280" : "#94a3b8", font: { size: 9 } }
                            },
                            y: {
                              grid: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" },
                              ticks: { color: isDark ? "#6b7280" : "#94a3b8", font: { size: 9 } },
                              beginAtZero: true,
                              max: 100
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-xs font-bold">
                        Complete complexity analyses to see your efficiency trend.
                      </div>
                    )}
                  </div>
                </PremiumCard>
              </motion.div>
            </div>

            {/* ─── ROADMAP + CHALLENGES + READINESS ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Roadmap Progress */}
              <motion.div custom={11} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-purple-500/20 hover:shadow-[0_0_24px_rgba(168,85,247,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Rocket size={18} className="text-purple-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Roadmap Progress</h3>
                  </div>
                  {analytics.roadmapProgress ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block">Stage</span>
                          <span className="text-xs font-bold text-amber-500 mt-1 block capitalize">{analytics.roadmapProgress.skillLevel}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block">Target</span>
                          <span className="text-xs font-bold text-purple-500 mt-1 block capitalize">{analytics.roadmapProgress.targetCompany}</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Overall</span>
                          <span className="text-xs font-black text-amber-500">{analytics.roadmapProgress.completionPercentage}%</span>
                        </div>
                        <PremiumProgressBar value={analytics.roadmapProgress.completionPercentage} color="amber" height={6} />
                      </div>
                      <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
                        <span className="text-[9px] uppercase font-bold text-purple-500 block mb-1">Current Topic</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{analytics.roadmapProgress.currentTopic}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                        <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Next Milestone</span>
                        <span className="text-xs font-bold text-[var(--text-primary)]">{analytics.roadmapProgress.nextMilestone}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-bold border-t border-[var(--border-color)] pt-3">
                        <span className="flex items-center gap-1"><Calendar size={11} /> {analytics.roadmapProgress.totalWeeks} Week Plan</span>
                        <span>Est: {analytics.roadmapProgress.estimatedCompletion}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Target size={28} className="text-[var(--text-secondary)]/40 mb-3" />
                      <p className="text-xs font-bold text-[var(--text-primary)] mb-2">No roadmap yet</p>
                      <PremiumButton variant="primary" onClick={() => router.push("/dashboard/coding/roadmap")} icon={<Rocket size={12} />}>
                        Generate Roadmap
                      </PremiumButton>
                    </div>
                  )}
                </PremiumCard>
              </motion.div>

              {/* Challenge Analytics */}
              <motion.div custom={12} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={18} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Challenge Analytics</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "Started", value: analytics.challengeAnalytics.started, color: "text-blue-500" },
                      { label: "Completed", value: analytics.challengeAnalytics.completed, color: "text-emerald-500" },
                      { label: "Success Rate", value: analytics.challengeAnalytics.successRate, suffix: "%", color: "text-amber-500" },
                      { label: "XP Earned", value: analytics.challengeAnalytics.xpEarned, color: "text-purple-500" }
                    ].map((item, i) => (
                      <div key={i} className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                        <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block">{item.label}</span>
                        <span className={`text-lg font-black ${item.color} mt-1 block`}>
                          <CountUp end={item.value} duration={1.5} />{item.suffix || ""}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-amber-500" />
                      <span className="text-xs font-bold text-[var(--text-primary)]">Achievements</span>
                    </div>
                    <span className="text-sm font-black text-amber-500">{analytics.challengeAnalytics.achievementsUnlocked}</span>
                  </div>
                </PremiumCard>
              </motion.div>

              {/* AI Review Insights */}
              <motion.div custom={13} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-blue-500/20 hover:shadow-[0_0_24px_rgba(59,130,246,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye size={18} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">AI Review Insights</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">Code Quality Score</span>
                      <span className="text-sm font-black text-emerald-500">{analytics.reviewInsights.avgCodeQuality}%</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">Optimization Found</span>
                      <span className="text-sm font-black text-amber-500">{analytics.reviewInsights.optimizationOpportunities}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">Total Reviews</span>
                      <span className="text-sm font-black text-purple-500">{analytics.reviewInsights.totalReviews}</span>
                    </div>
                    {analytics.reviewInsights.commonMistakes.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                        <span className="text-[9px] uppercase font-bold text-rose-500 block mb-2">Common Mistakes</span>
                        {analytics.reviewInsights.commonMistakes.slice(0, 3).map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <AlertTriangle size={10} className="text-rose-500/60 shrink-0" />
                            <span className="text-[10px] text-[var(--text-secondary)] truncate">{m.mistake}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </PremiumCard>
              </motion.div>
            </div>

            {/* ─── WEAK TOPICS + STRONG TOPICS + RECOMMENDATIONS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Weak Topics */}
              <motion.div custom={14} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-rose-500/20 hover:shadow-[0_0_24px_rgba(244,63,94,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={18} className="text-rose-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Weak Topics</h3>
                  </div>
                  {analytics.weakTopics.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.weakTopics.map((wt: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{wt.topic}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                              wt.riskLevel === "Critical" ? "bg-rose-500/10 text-rose-500" :
                              wt.riskLevel === "High" ? "bg-orange-500/10 text-orange-500" :
                              "bg-amber-500/10 text-amber-500"
                            }`}>{wt.riskLevel}</span>
                          </div>
                          <PremiumProgressBar value={wt.mastery} color={wt.mastery >= 50 ? "amber" : "rose"} height={4} />
                          <div className="flex justify-between mt-1.5">
                            <span className="text-[9px] text-[var(--text-secondary)]">Mastery: {wt.mastery}%</span>
                            <span className="text-[9px] font-bold text-rose-400">{wt.solved ?? 0}/{wt.total ?? 0} solved</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                      <CheckCircle2 size={24} className="text-emerald-500/40 mb-2" />
                      <p className="text-xs font-bold text-[var(--text-primary)]">No weak topics detected</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">Solve more problems to unlock analysis.</p>
                    </div>
                  )}
                </PremiumCard>
              </motion.div>

              {/* Strong Topics */}
              <motion.div custom={15} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <Star size={18} className="text-amber-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Strong Topics</h3>
                  </div>
                  {analytics.strongTopics.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.strongTopics.map((st: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-[var(--text-primary)]">{st.topic}</span>
                            <span className="text-xs font-black text-emerald-500">{st.score}%</span>
                          </div>
                          <PremiumProgressBar value={st.score} color="green" height={4} />
                          <span className="text-[9px] text-[var(--text-secondary)] block mt-1">{st.solved}/{st.total} solved</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6">
                      <BookOpen size={24} className="text-[var(--text-secondary)]/40 mb-2" />
                      <p className="text-xs font-bold text-[var(--text-primary)]">No strong topics yet</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">Start solving to build strengths.</p>
                    </div>
                  )}
                </PremiumCard>
              </motion.div>

              {/* Complexity Summary */}
              <motion.div custom={16} variants={codingFadeUp} initial="hidden" animate="visible">
                <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] h-full hover:border-blue-500/20 hover:shadow-[0_0_24px_rgba(59,130,246,0.04)] transition-all duration-300">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 size={18} className="text-blue-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Complexity Analytics</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                      <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Most Common Time</span>
                      <span className="text-sm font-black text-amber-500 font-mono">{analytics.complexityAnalytics.mostCommonTimeComplexity}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                      <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] block mb-1">Most Common Space</span>
                      <span className="text-sm font-black text-orange-500 font-mono">{analytics.complexityAnalytics.mostCommonSpaceComplexity}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">Total Analyses</span>
                      <span className="text-sm font-black text-blue-500">{analytics.complexityAnalytics.totalAnalyses}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] flex justify-between items-center">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)]">Avg Efficiency</span>
                      <span className={`text-sm font-black ${analytics.complexityAnalytics.avgEfficiencyScore >= 70 ? "text-emerald-500" : "text-amber-500"}`}>
                        {analytics.complexityAnalytics.avgEfficiencyScore}%
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <span className="text-[9px] uppercase font-bold text-emerald-500 block mb-1">Execution Stats</span>
                      <div className="flex justify-between">
                        <span className="text-[10px] text-[var(--text-secondary)]">Total Runs</span>
                        <span className="text-xs font-black text-emerald-500">{analytics.executionStats.totalExecutions}</span>
                      </div>
                    </div>
                  </div>
                </PremiumCard>
              </motion.div>
            </div>

            {/* ─── HEATMAP ───────────────────────────────────────── */}
            <motion.div custom={17} variants={codingFadeUp} initial="hidden" animate="visible">
              <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] hover:border-emerald-500/20 hover:shadow-[0_0_24px_rgba(16,185,129,0.04)] transition-all duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Coding Activity Heatmap</h3>
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Last 365 Days</span>
                </div>
                <HeatmapGrid heatmap={analytics.heatmap} isDark={isDark} />
              </PremiumCard>
            </motion.div>

            {/* ─── RECENT ACTIVITY ───────────────────────────────── */}
            <motion.div custom={18} variants={codingFadeUp} initial="hidden" animate="visible">
              <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] hover:border-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.04)] transition-all duration-300">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={18} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Recent Activity</h3>
                </div>
                {analytics.recentActivity.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {analytics.recentActivity.slice(0, 8).map((activity: any, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] hover:border-amber-500/30 transition-all cursor-pointer"
                        onClick={() => router.push(`/dashboard/coding/problem/${activity.questionId}`)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {activity.status === "solved" ? (
                            <CheckCircle2 size={12} className="text-emerald-500" />
                          ) : activity.status === "attempted" ? (
                            <Clock size={12} className="text-amber-500" />
                          ) : (
                            <Eye size={12} className="text-blue-500" />
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            activity.status === "solved" ? "text-emerald-500" :
                            activity.status === "attempted" ? "text-amber-500" : "text-blue-500"
                          }`}>{activity.status}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">{activity.questionId.slice(0, 16)}...</p>
                        <p className="text-[9px] text-[var(--text-secondary)]/60 mt-1">
                          {new Date(activity.updatedAt).toLocaleDateString()} {new Date(activity.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Code2 size={28} className="text-[var(--text-secondary)]/40 mb-2" />
                    <p className="text-xs font-bold text-[var(--text-primary)]">No recent activity</p>
                    <p className="text-[10px] text-[var(--text-secondary)]">Start solving problems to see your activity here.</p>
                  </div>
                )}
              </PremiumCard>
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 min-h-[40vh]">
            <CodingEmptyState
              type="dashboard"
              actionLabel="Start Solving"
              onAction={() => router.push("/dashboard/coding")}
            />
          </div>
        )}
    </div>
  );
}

// ─── Heatmap Grid Component ──────────────────────────────────────────────────
function HeatmapGrid({ heatmap, isDark }: { heatmap: Record<string, number>; isDark: boolean }) {
  const weeks = 53;
  const days = 7;
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const cells: { date: string; count: number; day: number; week: number }[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (weeks * 7 - 1) + (6 - today.getDay()));

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < days; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      const dateStr = cellDate.toISOString().split("T")[0];
      const count = heatmap[dateStr] || 0;
      cells.push({ date: dateStr, count, day: d, week: w });
    }
  }

  const maxCount = Math.max(1, ...Object.values(heatmap));
  const getColor = (count: number) => {
    if (count === 0) return isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    const intensity = count / maxCount;
    if (intensity <= 0.25) return isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)";
    if (intensity <= 0.5) return isDark ? "rgba(16,185,129,0.4)" : "rgba(16,185,129,0.3)";
    if (intensity <= 0.75) return isDark ? "rgba(16,185,129,0.65)" : "rgba(16,185,129,0.5)";
    return "#10b981";
  };

  const totalSolved = Object.values(heatmap).reduce((s, c) => s + c, 0);
  const activeDays = Object.keys(heatmap).length;

  return (
    <div className="relative">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[10px] text-[var(--text-secondary)]">{totalSolved} questions solved across {activeDays} active days</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-[3px]">
          {Array.from({ length: weeks }, (_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-[3px]">
              {cells.filter(c => c.week === weekIdx).map((cell) => (
                <div
                  key={cell.date}
                  className="w-[11px] h-[11px] rounded-[2px] hover:ring-1 hover:ring-[var(--text-secondary)]/30 transition-all cursor-default"
                  style={{ backgroundColor: getColor(cell.count) }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ date: cell.date, count: cell.count, x: rect.left + rect.width / 2, y: rect.top - 8 });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-lg border"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
              background: isDark ? "#1a1c29" : "#ffffff",
              color: isDark ? "#f3f4f6" : "#0f172a",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
            }}
          >
            {tooltip.count} solved on {tooltip.date}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-end gap-2 mt-3">
        <span className="text-[9px] text-[var(--text-secondary)]">Less</span>
        {[0, 1, 2, 3, 4].map((level) => {
          const counts = [0, 0.25, 0.5, 0.75, 1];
          return (
            <div
              key={level}
              className="w-[11px] h-[11px] rounded-[2px]"
              style={{ backgroundColor: getColor(counts[level] * maxCount) }}
            />
          );
        })}
        <span className="text-[9px] text-[var(--text-secondary)]">More</span>
      </div>
    </div>
  );
}
