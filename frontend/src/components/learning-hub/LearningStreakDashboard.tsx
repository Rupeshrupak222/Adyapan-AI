"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import confetti from "canvas-confetti";
import CountUp from "react-countup";
import {
  Flame,
  Trophy,
  Activity,
  Award,
  Download,
  Share2,
  Lock,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Brain,
  Sparkles,
  Info,
  Calendar,
  X,
  FileSpreadsheet,
  Clock,
  Zap
} from "lucide-react";

import { cn } from "@/lib/cn";
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
  EmptyState,
  SuccessCelebration,
  ErrorState,
  FloatingOrbs
} from "@/components/ui/PremiumComponents";


// Milestone Achievement Rarity Colors
const rarityColorsDark = {
  Common: "from-zinc-500/20 to-zinc-600/30 border-zinc-500/30 text-zinc-300",
  Rare: "from-blue-500/20 to-indigo-600/30 border-blue-500/30 text-blue-300",
  Epic: "from-purple-500/20 to-pink-600/30 border-purple-500/30 text-purple-300",
  Legendary: "from-amber-500/25 to-yellow-600/35 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
};

const rarityColorsLight = {
  Common: "from-zinc-100 to-zinc-200 border-zinc-300 text-zinc-700",
  Rare: "from-blue-50 to-indigo-100 border-blue-200 text-blue-800",
  Epic: "from-purple-50 to-pink-100 border-purple-200 text-purple-800",
  Legendary: "from-amber-50 to-yellow-100 border-amber-300 text-amber-800 shadow-sm",
};

interface Achievement {
  name: string;
  type: string;
  description: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
  days: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface HeatmapDay {
  date: string;
  count: number;
  points: number;
  details: string;
}

interface DashboardData {
  currentStreak: number;
  longestStreak: number;
  consistencyScore: number;
  activeDaysCount: number;
  monthlyActiveCount: number;
  monthlyTotalDays: number;
  previousStreak: number;
  streakRule: string;
  timeRequirement: number;
  streakFreezes: number;
  freezeActive: boolean;
  points: number;
  globalRank: number | null;
  campusRank: number | null;
  weeklyReport: { day: string; active: boolean; date: string }[];
  monthlyReport: {
    activeDays: number;
    missedDays: number;
    averageSessionDuration: number;
    mostActiveDay: string;
    leastActiveDay: string;
  };
  habitAnalytics: {
    preferredStudyTime: string;
    mostActiveDay: string;
    mostProductiveDay: string;
    averageDailyUsage: number;
  };
  recentAchievements: {
    achievementName: string;
    achievementType: string;
    rarity: string;
    unlockedAt: string;
  }[];
  motivationalMessage: string;
}

const DEFAULT_DASHBOARD_DATA: DashboardData = {
  currentStreak: 0,
  longestStreak: 0,
  consistencyScore: 0,
  activeDaysCount: 0,
  monthlyActiveCount: 0,
  monthlyTotalDays: 30,
  previousStreak: 0,
  streakRule: "action",
  timeRequirement: 10,
  streakFreezes: 1,
  freezeActive: false,
  points: 0,
  globalRank: null,
  campusRank: null,
  weeklyReport: [
    { day: "Mon", active: false, date: "" },
    { day: "Tue", active: false, date: "" },
    { day: "Wed", active: false, date: "" },
    { day: "Thu", active: false, date: "" },
    { day: "Fri", active: false, date: "" },
    { day: "Sat", active: false, date: "" },
    { day: "Sun", active: false, date: "" },
  ],
  monthlyReport: {
    activeDays: 0,
    missedDays: 30,
    averageSessionDuration: 30,
    mostActiveDay: "Wednesday",
    leastActiveDay: "Saturday"
  },
  habitAnalytics: {
    preferredStudyTime: "Morning",
    mostActiveDay: "Wednesday",
    mostProductiveDay: "Wednesday",
    averageDailyUsage: 1.2
  },
  recentAchievements: [],
  motivationalMessage: "Start learning today! Build your first learning streak and develop a powerful study habit."
};

export function LearningStreakDashboard() {
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [data, setData] = useState<DashboardData | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [insights, setInsights] = useState<{
    habitAnalysis: string;
    suggestions: string[];
    motivationalMessage: string;
  } | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [timezone, setTimezone] = useState("UTC");
  const [sharingModalOpen, setSharingModalOpen] = useState(false);
  const [theme, setTheme] = useState("dark");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snakeActive, setSnakeActive] = useState(true);
  const [snakeHeadIndex, setSnakeHeadIndex] = useState(0);

  // Snake animation loop
  useEffect(() => {
    if (!snakeActive) return;
    const interval = setInterval(() => {
      setSnakeHeadIndex((prev) => prev + 1);
    }, 130);
    return () => clearInterval(interval);
  }, [snakeActive]);

  const loadingChecklist = [
    "Analyzing Learning Activity",
    "Calculating Current Streak",
    "Measuring Consistency",
    "Generating Insights",
    "Preparing Achievements",
    "Complete"
  ];

  // Setup client-side timezone query and theme state tracking
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(tz || "UTC");
      } catch (e) {
        setTimezone("UTC");
      }

      // Track active theme
      const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
      setTheme(savedTheme);
      
      const observer = new MutationObserver(() => {
        const t = document.documentElement.getAttribute("data-theme") ?? "dark";
        setTheme(t);
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => observer.disconnect();
    }
  }, []);

  // Initial data loading sequence
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => {
        if (prev < loadingChecklist.length - 2) return prev + 1;
        return prev;
      });
    }, 700);

  const fetchData = async () => {
    try {
      const headers = { "x-timezone": timezone };
      
      const [dashRes, achRes, heatRes] = await Promise.allSettled([
        api.get("/streak/dashboard", { headers }),
        api.get("/streak/achievements"),
        api.get(`/streak/heatmap?days=365`, { headers }),
      ]);

      if (active) {
        let dashData = DEFAULT_DASHBOARD_DATA;
        if (dashRes.status === "fulfilled" && dashRes.value.data?.data) {
          dashData = dashRes.value.data.data;
        }
        setData(dashData);

        if (achRes.status === "fulfilled" && achRes.value.data?.achievements) {
          setAchievements(achRes.value.data.achievements);
        }

        if (heatRes.status === "fulfilled" && heatRes.value.data?.heatmap) {
          setHeatmap(heatRes.value.data.heatmap);
        }
        
        setLoadingStep(loadingChecklist.length - 1);
        setTimeout(() => {
          setLoading(false);
        }, 400);

        if (dashData.currentStreak > 0) {
          setTimeout(() => {
            fireConfettiCelebration();
          }, 800);
        }
      }
    } catch (err) {
      console.error("Failed to load learning streak data:", err);
      if (active) {
        setData(DEFAULT_DASHBOARD_DATA);
        setLoading(false);
      }
    }
  };

    fetchData();

    return () => {
      active = false;
      clearInterval(stepInterval);
    };
  }, [timezone]);

  // Fetch AI insights
  const loadInsights = async () => {
    if (insightsLoading) return;
    setInsightsLoading(true);
    try {
      const headers = { "x-timezone": timezone };
      const res = await api.get("/streak/insights", { headers });
      setInsights(res.data.insights);
    } catch (error) {
      console.error("Failed to generate AI insights:", error);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && data) {
      loadInsights();
    }
  }, [loading]);

  const fireConfettiCelebration = () => {
    const end = Date.now() + 1.2 * 1000;
    const colors = ["#f59e0b", "#f97316", "#ef4444", "#a78bfa"];

    (function frame() {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // CSV downloads
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportStreakReport = () => {
    if (!data) return;
    let csv = "Metric,Value\n";
    csv += `Current Streak,${data.currentStreak} Days\n`;
    csv += `Longest Streak,${data.longestStreak} Days\n`;
    csv += `Consistency Score,${data.consistencyScore}%\n`;
    csv += `Total Active Days,${data.activeDaysCount}\n`;
    csv += `Learning Points,${data.points}\n`;
    csv += `Rule Configuration,${data.streakRule === "action" ? "1 Action = Active Day" : `Minimum ${data.timeRequirement} mins activity`}\n`;
    downloadCSV(csv, "adyapan_streak_report.csv");
  };

  const handleExportConsistencyReport = () => {
    if (!data) return;
    let csv = "Metric,Count/Performance\n";
    csv += `Active Days (Current Month),${data.monthlyReport.activeDays}\n`;
    csv += `Missed Days (Current Month),${data.monthlyReport.missedDays}\n`;
    csv += `Average Session Duration,${data.monthlyReport.averageSessionDuration} mins\n`;
    csv += `Most Productive Day,${data.monthlyReport.mostActiveDay}\n`;
    csv += `Weekly Activity Score,${data.weeklyReport.filter(d=>d.active).length}/7 active\n`;
    downloadCSV(csv, "adyapan_consistency_report.csv");
  };

  const handleExportHabitReport = () => {
    if (!data) return;
    let csv = "Habit Dimension,Details\n";
    csv += `Preferred Study Time,${data.habitAnalytics.preferredStudyTime}\n`;
    csv += `Most Active Day,${data.habitAnalytics.mostActiveDay}\n`;
    csv += `Most Productive Day,${data.habitAnalytics.mostProductiveDay}\n`;
    csv += `Average Daily Interactions,${data.habitAnalytics.averageDailyUsage}\n`;
    downloadCSV(csv, "adyapan_habit_analytics.csv");
  };

  const handleExportAchievementsSummary = () => {
    let csv = "Achievement Name,Rarity,Status,Unlock Date\n";
    achievements.forEach(ach => {
      csv += `"${ach.name}","${ach.rarity}","${ach.unlocked ? "Unlocked" : "Locked"}","${ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : "-"}"\n`;
    });
    downloadCSV(csv, "adyapan_achievements_summary.csv");
  };

  // HTML5 Canvas draw share card
  const generateShareCard = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 600;
    canvas.height = 400;

    const isLight = theme === "light";

    // Gradient background based on active theme
    const gradient = ctx.createLinearGradient(0, 0, 600, 400);
    if (isLight) {
      gradient.addColorStop(0, "#f8fafc");
      gradient.addColorStop(0.5, "#f1f5f9");
      gradient.addColorStop(1, "#e2e8f0");
    } else {
      gradient.addColorStop(0, "#080710");
      gradient.addColorStop(0.5, "#151329");
      gradient.addColorStop(1, "#0d0b16");
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 600, 400);

    // Border
    ctx.lineWidth = 2;
    ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.08)";
    ctx.strokeRect(10, 10, 580, 380);

    // Glow spots
    ctx.beginPath();
    ctx.arc(500, 100, 120, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? "rgba(99, 102, 241, 0.05)" : "rgba(139, 92, 246, 0.12)";
    ctx.filter = "blur(50px)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, 300, 100, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? "rgba(249, 115, 22, 0.05)" : "rgba(245, 158, 11, 0.08)";
    ctx.fill();
    ctx.filter = "none";

    // Text Header
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("ADYAPAN AI", 40, 50);

    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.4)";
    ctx.fillText("AI ACCELERATOR ENGINE", 40, 68);

    // Flame Circle
    ctx.beginPath();
    ctx.arc(160, 220, 65, 0, Math.PI * 2);
    ctx.fillStyle = isLight ? "rgba(249, 115, 22, 0.05)" : "rgba(249, 115, 22, 0.08)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fill();

    // Stats
    ctx.font = "black 80px Inter, sans-serif";
    ctx.fillStyle = isLight ? "#0f172a" : "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(String(data.currentStreak), 160, 235);

    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillStyle = "#f97316";
    ctx.fillText("🔥 DAYS STREAK", 160, 275);

    ctx.textAlign = "left";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.5)";
    ctx.fillText("LONG RECORD", 340, 150);

    ctx.font = "black 32px Inter, sans-serif";
    ctx.fillStyle = isLight ? "#0f172a" : "#ffffff";
    ctx.fillText(`${data.longestStreak} Days`, 340, 185);

    ctx.font = "bold 13px Inter, sans-serif";
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.5)";
    ctx.fillText("CONSISTENCY SCORE", 340, 240);

    ctx.font = "black 32px Inter, sans-serif";
    ctx.fillStyle = "#10b981";
    ctx.fillText(`${data.consistencyScore}%`, 340, 275);

    ctx.font = "italic 12px Inter, sans-serif";
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.35)";
    ctx.fillText('"Learning becomes effective when it becomes a habit."', 340, 335);

    ctx.font = "bold 9px Inter, sans-serif";
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.25)";
    ctx.fillText("GENERATE YOUR OWN AT ADYAPAN.COM", 40, 360);
  };

  useEffect(() => {
    if (sharingModalOpen) {
      setTimeout(() => {
        generateShareCard();
      }, 300);
    }
  }, [sharingModalOpen, data, theme]);

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `adyapan_streak_${data?.currentStreak}_days.png`;
    link.href = url;
    link.click();
  };

  const handleCopyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        alert("📋 Copied to clipboard! You can now paste it into Discord, Slack, or Twitter.");
      });
    } catch (e) {
      alert("Browser blocked clipboard write. Please download the image instead!");
    }
  };

  const filteredHeatmap = () => {
    if (!heatmap.length) return [];
    return heatmap.filter(d => d.date && new Date(d.date).getFullYear() === selectedYear);
  };

  // Get dynamic cell color based on active theme
  const getHeatmapIntensity = (day: HeatmapDay) => {
    const isLight = theme === "light";
    if (day.count === 0) {
      return isLight 
        ? "bg-slate-200/50 hover:bg-slate-300 border border-slate-300/10" 
        : "bg-white/[0.02] hover:bg-white/[0.08] border border-white/[0.01]";
    }
    if (day.count <= 2) {
      return isLight 
        ? "bg-emerald-100 text-emerald-800 border border-emerald-200/40 hover:bg-emerald-200" 
        : "bg-emerald-950/40 text-emerald-400 border border-emerald-500/10 hover:bg-emerald-900/60";
    }
    if (day.count <= 5) {
      return isLight 
        ? "bg-emerald-300 text-emerald-900 border border-emerald-400/40 hover:bg-emerald-400" 
        : "bg-emerald-800/60 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-700";
    }
    return isLight 
      ? "bg-emerald-500 text-black border border-emerald-600 hover:bg-emerald-600 shadow-sm" 
      : "bg-emerald-500 text-black border border-emerald-400 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]";
    };

    if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center relative w-full max-w-lg mx-auto py-12">
        <AIThinkingScreen
          steps={loadingChecklist.slice(0, -1)}
          currentStep={loadingStep}
          title="Analyzing Learning Activity Logs..."
          subtitle="Compiling daily briefing logs and metrics"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 w-full max-w-md mx-auto">
        <ErrorState
          title="Failed to Load Streak Dashboard"
          description="There was a problem querying the database for your daily study activity logs."
          onRetry={() => {
            setData(DEFAULT_DASHBOARD_DATA);
            setLoading(false);
          }}
        />
      </div>
    );
  }

  const isLightTheme = theme === "light";

  return (
    <div className={cn(
      "space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 transition-colors duration-350",
      isLightTheme ? "text-slate-900" : "text-white"
    )}>
      
      {/* ─── Hero Stats Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Current Streak */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "md:col-span-2 relative overflow-hidden rounded-3xl border p-6 flex flex-col justify-between min-h-[250px] transition-all shadow-xl",
            isLightTheme 
              ? "bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-rose-500/10 border-orange-500/20" 
              : "bg-gradient-to-br from-orange-950/40 via-amber-950/20 to-red-950/30 border-orange-500/20"
          )}
        >
          {/* Flame aura backglow */}
          <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[80%] rounded-full bg-radial-gradient from-orange-500/25 via-amber-500/10 to-transparent blur-[50px] pointer-events-none" />
          
          <div className="flex justify-between items-start z-10">
            <div>
              <span className="text-xs text-orange-500 font-extrabold tracking-widest uppercase flex items-center gap-1.5">
                <Zap size={13} className="fill-orange-500" /> Active learning streak
              </span>
              <h3 className={cn("text-sm font-bold mt-1", isLightTheme ? "text-slate-500" : "text-white/60")}>Current Streak</h3>
            </div>
            
            <motion.div 
              animate={{ 
                scale: [1, 1.12, 1], 
                y: [0, -4, 0],
                filter: ["drop-shadow(0 0 6px rgba(249,115,22,0.3))", "drop-shadow(0 0 20px rgba(249,115,22,0.7))", "drop-shadow(0 0 6px rgba(249,115,22,0.3))"]
              }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className={cn(
                "w-13 h-13 rounded-2xl flex items-center justify-center border transition-colors shadow-lg",
                isLightTheme ? "bg-orange-500/15 border-orange-500/30 text-orange-600" : "bg-orange-500/25 border-orange-500/40 text-orange-400"
              )}
            >
              <Flame size={26} className="fill-orange-500" />
            </motion.div>
          </div>

          <div className="z-10 mt-3">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-6xl font-black tracking-tighter", isLightTheme ? "text-slate-900" : "text-white")}>
                <CountUp start={0} end={data.currentStreak} duration={1.5} />
              </span>
              <span className="text-2xl font-black text-orange-500">Days</span>
            </div>
            
            <p className={cn("text-xs font-medium mt-2 leading-relaxed max-w-md", isLightTheme ? "text-slate-600" : "text-white/70")}>
              {data.motivationalMessage}
            </p>

            {/* Streak Milestone Progress Bar */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex justify-between text-[11px] font-extrabold" style={{ color: isLightTheme ? "#475569" : "#9ca3af" }}>
                <span>Next Milestone: {data.currentStreak < 3 ? 3 : data.currentStreak < 7 ? 7 : data.currentStreak < 14 ? 14 : data.currentStreak < 30 ? 30 : data.currentStreak + 10} Days</span>
                <span className="text-orange-500 font-extrabold">
                  {data.currentStreak}/{data.currentStreak < 3 ? 3 : data.currentStreak < 7 ? 7 : data.currentStreak < 14 ? 14 : data.currentStreak < 30 ? 30 : data.currentStreak + 10} Days
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: isLightTheme ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${Math.min(100, Math.max(10, (data.currentStreak / (data.currentStreak < 3 ? 3 : data.currentStreak < 7 ? 7 : data.currentStreak < 14 ? 14 : data.currentStreak < 30 ? 30 : data.currentStreak + 10)) * 100))}%`
                  }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center mt-3 z-10 pt-3 border-t border-white/10">
            <div className={cn("flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl border", isLightTheme ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/10 text-white/80")}>
              <Clock size={13} className="text-orange-500" /> 
              <span>Rule:</span> <span className="text-orange-500 font-extrabold">{data.streakRule === "action" ? "1 Action = Active Day" : `>= ${data.timeRequirement} mins`}</span>
            </div>
            {data.streakFreezes > 0 && (
              <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-xs text-sky-400 font-extrabold tracking-wider uppercase flex items-center gap-1">
                ❄️ Streak Freeze Active ({data.streakFreezes})
              </span>
            )}
          </div>
        </motion.div>

        {/* Longest Streak */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            "rounded-3xl border p-6 flex flex-col justify-between min-h-[250px] transition-colors shadow-lg",
            isLightTheme ? "border-slate-200 bg-white/80" : "border-white/10 bg-[#0e0d1b]/70"
          )}
        >
          <div className="flex justify-between items-start">
            <span className={cn("text-xs font-extrabold uppercase tracking-wider", isLightTheme ? "text-slate-500" : "text-white/50")}>Longest Streak</span>
            <div className={cn(
              "w-11 h-11 rounded-2xl border flex items-center justify-center shadow-sm transition-colors",
              isLightTheme ? "bg-amber-500/15 border-amber-500/30 text-amber-600" : "bg-amber-500/20 border-amber-500/30 text-amber-400"
            )}>
              <Trophy size={20} />
            </div>
          </div>
          
          <div className="my-2">
            <div className={cn("text-5xl font-black tracking-tight", isLightTheme ? "text-slate-950" : "text-white")}>
              <CountUp start={0} end={data.longestStreak} duration={1.5} /> <span className="text-xl font-extrabold text-amber-500">Days</span>
            </div>
            <p className={cn("text-xs font-medium mt-1", isLightTheme ? "text-slate-500" : "text-white/50")}>Your record since registering.</p>
          </div>

          <div className={cn(
            "border rounded-2xl p-3 flex items-center justify-between text-xs font-semibold transition-colors",
            isLightTheme ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-white/[0.03] border-white/10 text-white/70"
          )}>
            <span>Previous record:</span>
            <strong className={isLightTheme ? "text-slate-900" : "text-white"}>{data.previousStreak} Days</strong>
          </div>
        </motion.div>

        {/* Consistency Score Circular Ring */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "rounded-3xl border p-6 flex flex-col justify-between min-h-[250px] items-center text-center transition-colors shadow-lg",
            isLightTheme ? "border-slate-200 bg-white/80" : "border-white/10 bg-[#0e0d1b]/70"
          )}
        >
          <span className={cn("text-xs font-extrabold uppercase tracking-wider w-full text-left", isLightTheme ? "text-slate-500" : "text-white/50")}>Consistency Score</span>
          
          <div className="relative w-28 h-28 flex items-center justify-center my-1.5">
            <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
              <path
                className={isLightTheme ? "text-slate-200" : "text-white/10"}
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <motion.path
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${data.consistencyScore}, 100` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="text-emerald-500"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={cn("text-2xl font-black", isLightTheme ? "text-slate-900" : "text-white")}>{data.consistencyScore}%</span>
              <span className="text-[9px] font-extrabold text-emerald-500 tracking-widest uppercase">rolling</span>
            </div>
          </div>

          <div className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-extrabold text-emerald-500">
            {data.consistencyScore >= 80 ? "Learning Machine" : 
             data.consistencyScore >= 60 ? "Consistent Learner" :
             data.consistencyScore >= 40 ? "Building Habit" : "Getting Started"}
          </div>
        </motion.div>
      </div>

      {/* ─── Contribution Calendar Heatmap ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className={cn(
          "rounded-3xl border p-6 space-y-6 transition-colors shadow-xl relative overflow-hidden",
          isLightTheme ? "border-slate-200 bg-white/80" : "border-white/10 bg-[#0e0d1b]/70"
        )}
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <Calendar size={20} className="text-orange-500" /> Learning Contribution Heatmap
            </h3>
            <p className={cn("text-xs font-medium mt-1", isLightTheme ? "text-slate-500" : "text-white/60")}>Track the volume of daily uploads, generations, planner commits, and chats.</p>
          </div>

          {/* Dynamic Year selector pills (LeetCode Style) */}
          <div className={cn(
            "flex p-1 rounded-xl border transition-colors self-start sm:self-center gap-1",
            isLightTheme ? "border-slate-200 bg-slate-100" : "border-white/10 bg-white/[0.03]"
          )}>
            {(() => {
              const curY = new Date().getFullYear();
              const yearSet = new Set<number>([curY, curY - 1, curY - 2]);
              heatmap.forEach(d => {
                if (d.date) {
                  const y = new Date(d.date).getFullYear();
                  if (y && !isNaN(y)) yearSet.add(y);
                }
              });
              return Array.from(yearSet).sort((a, b) => b - a).map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                    selectedYear === year 
                      ? "bg-orange-500 text-black shadow-sm" 
                      : (isLightTheme ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white")
                  )}
                >
                  {year}
                </button>
              ));
            })()}
          </div>
        </div>

        {/* LeetCode-Style Single-Frame 12-Month Heatmap Calendar ending at TODAY */}
        <div className="w-full overflow-x-auto pb-1 custom-scrollbar">
          <div className="w-full min-w-[760px] flex gap-2 pt-1 items-start">
            
            {/* Left Day Labels Column */}
            <div className="flex flex-col pt-5 shrink-0 justify-between select-none" style={{ height: "94px", width: "26px" }}>
              <span className={cn("text-[10px] font-extrabold leading-none", isLightTheme ? "text-slate-700" : "text-white/80")}>Mon</span>
              <span className={cn("text-[10px] font-extrabold leading-none", isLightTheme ? "text-slate-700" : "text-white/80")}>Wed</span>
              <span className={cn("text-[10px] font-extrabold leading-none", isLightTheme ? "text-slate-700" : "text-white/80")}>Fri</span>
              <span className={cn("text-[10px] font-extrabold leading-none", isLightTheme ? "text-slate-700" : "text-white/80")}>Sun</span>
            </div>

            {/* Months Container (12 Months in ONE FRAME ending at TODAY) */}
            <div className="flex items-start justify-between flex-grow gap-1 sm:gap-1.5">
              {(() => {
                const dayMap = new Map<string, HeatmapDay>();
                heatmap.forEach(d => {
                  if (d.date) dayMap.set(d.date.split("T")[0], d);
                });

                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                let totalGlobalIndex = 0;

                // Calendar Months JAN to DEC for selectedYear
                const yearMonthsData = months.map((monthName, monthIdx) => {
                  const yr = selectedYear;
                  const daysCount = new Date(yr, monthIdx + 1, 0).getDate();

                  // Start weekday offset (Mon=0..Sun=6)
                  const rawFirstDay = new Date(yr, monthIdx, 1).getDay();
                  const startOffset = rawFirstDay === 0 ? 6 : rawFirstDay - 1;

                  const monthDaysList: { day?: HeatmapDay; globalIdx?: number; isPadding?: boolean }[] = [];

                  for (let p = 0; p < startOffset; p++) {
                    monthDaysList.push({ isPadding: true });
                  }

                  for (let dayNum = 1; dayNum <= daysCount; dayNum++) {
                    const mm = String(monthIdx + 1).padStart(2, "0");
                    const dd = String(dayNum).padStart(2, "0");
                    const dateKey = `${yr}-${mm}-${dd}`;

                    const existing = dayMap.get(dateKey);
                    monthDaysList.push({
                      day: existing || { date: dateKey, count: 0, points: 0, details: "No activity logged" },
                      globalIdx: totalGlobalIndex++,
                    });
                  }

                  return { monthName, year: yr, days: monthDaysList };
                });

                const totalYearDays = totalGlobalIndex || 365;

                return yearMonthsData.map(({ monthName, days }, mIdx) => (
                  <div key={`${monthName}-${mIdx}`} className="flex flex-col items-center flex-grow">
                    {/* Month Header Label Above Month Block */}
                    <span className={cn("text-[10px] font-black uppercase tracking-wider mb-1.5", isLightTheme ? "text-slate-800" : "text-white/90")}>
                      {monthName}
                    </span>

                    {/* 7-Row Grid for this Month */}
                    <div 
                      className="grid gap-[2px]"
                      style={{
                        gridTemplateRows: "repeat(7, 11px)",
                        gridAutoFlow: "column",
                        gridAutoColumns: "11px",
                        height: "94px",
                      }}
                    >
                      {days.map((item, idx) => {
                        if (item.isPadding || !item.day) {
                          return (
                            <div
                              key={`pad-${idx}`}
                              className="w-[11px] h-[11px] opacity-0 pointer-events-none"
                            />
                          );
                        }

                        const { day, globalIdx = 0 } = item;
                        const colorClass = getHeatmapIntensity(day);
                        const isSnakeHead = snakeActive && globalIdx === (snakeHeadIndex % totalYearDays);
                        const isSnakeTail =
                          snakeActive &&
                          [
                            (snakeHeadIndex - 1 + totalYearDays) % totalYearDays,
                            (snakeHeadIndex - 2 + totalYearDays) % totalYearDays,
                            (snakeHeadIndex - 3 + totalYearDays) % totalYearDays,
                          ].includes(globalIdx);

                        const rowIdx = idx % 7;
                        const isTopHalf = rowIdx < 4;
                        const isFirstMonth = mIdx === 0;
                        const isLastMonth = mIdx >= 10;

                        return (
                          <div
                            key={day.date}
                            className={cn(
                              "w-[11px] h-[11px] rounded-[2.5px] transition-all cursor-pointer relative group flex items-center justify-center",
                              colorClass,
                              isSnakeHead && "bg-emerald-400 shadow-[0_0_12px_#10b981] scale-125 z-20 border border-white",
                              isSnakeTail && "bg-emerald-500/80 shadow-[0_0_8px_#10b981] scale-110"
                            )}
                          >
                            {/* Snake Head Icon */}
                            {isSnakeHead && <span className="text-[7px] leading-none">🐍</span>}

                            {/* Tooltip (Smart positioned below for top rows to avoid clipping/overlapping header) */}
                            <div
                              className={cn(
                                "absolute w-48 p-2 rounded-xl bg-zinc-950/95 border border-white/15 text-xs text-white font-medium shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all z-50 leading-normal",
                                isTopHalf ? "top-full mt-2" : "bottom-full mb-2",
                                isFirstMonth ? "left-0" : isLastMonth ? "right-0" : "left-1/2 -translate-x-1/2"
                              )}
                            >
                              <div className="font-extrabold text-white/90 border-b border-white/10 pb-1 mb-1">
                                {new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div>{day.details || "No activity logged"}</div>
                              {day.count > 0 && (
                                <div className="text-orange-400 font-extrabold mt-1">
                                  +{day.points} XP · {day.count} action{day.count > 1 ? "s" : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className={cn("flex justify-between items-center text-xs font-semibold select-none pt-2 border-t border-white/10", isLightTheme ? "text-slate-500" : "text-white/40")}>
          <span>Jan 1, {selectedYear}</span>
          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className={cn("w-[11px] h-[11px] rounded-[3px]", isLightTheme ? "bg-slate-200" : "bg-white/[0.04]")} />
            <div className="w-[11px] h-[11px] rounded-[3px] bg-emerald-900/30 border border-emerald-500/20" />
            <div className="w-[11px] h-[11px] rounded-[3px] bg-emerald-700/60 border border-emerald-500/30" />
            <div className="w-[11px] h-[11px] rounded-[3px] bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
            <span>More</span>
          </div>
          <span>Dec 31, {selectedYear}</span>
        </div>
      </motion.div>

      {/* ─── Two-Column Section: Reports & Insights ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: Reports */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Consistency Reports */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={cn(
              "rounded-3xl border p-6 space-y-6 transition-colors",
              isLightTheme ? "border-slate-200 bg-white/70" : "border-white/5 bg-[#0e0d1b]/60"
            )}
          >
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Activity size={18} className="text-orange-500" /> Weekly & Monthly Activity Reports
              </h3>
              <p className={cn("text-xs mt-1", isLightTheme ? "text-slate-400" : "text-white/40")}>Your consistency performance evaluated week-over-week.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Weekly Tracker */}
              <div className={cn(
                "p-4 rounded-2xl border transition-colors space-y-4",
                isLightTheme ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]"
              )}>
                <h4 className={cn("text-xs font-extrabold uppercase tracking-wider", isLightTheme ? "text-slate-400" : "text-white/70")}>Weekly Streak Status</h4>
                
                <div className="flex justify-between items-center">
                  {data.weeklyReport.map((day, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <span className={cn("text-[10px] font-bold", isLightTheme ? "text-slate-400" : "text-white/30")}>{day.day}</span>
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all border",
                        day.active 
                          ? (isLightTheme 
                              ? "bg-orange-500/10 border-orange-300 text-orange-600 shadow-sm" 
                              : "bg-orange-500/20 border-orange-500/40 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.1)]")
                          : (isLightTheme 
                              ? "bg-slate-200/50 border-slate-200/20 text-slate-300" 
                              : "bg-white/[0.01] border-white/5 text-white/20")
                      )}>
                        {day.active ? "✓" : "✕"}
                      </div>
                    </div>
                  ))}
                </div>

                <div className={cn("text-xs flex justify-between items-center select-none pt-2", isLightTheme ? "text-slate-400" : "text-white/40")}>
                  <span>Weekly completion score:</span>
                  <strong className="text-orange-500">{Math.round((data.weeklyReport.filter(d=>d.active).length / 7) * 100)}%</strong>
                </div>
              </div>

              {/* Monthly Stats */}
              <div className={cn(
                "p-4 rounded-2xl border transition-colors flex flex-col justify-between",
                isLightTheme ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]"
              )}>
                <h4 className={cn("text-xs font-extrabold uppercase tracking-wider mb-2", isLightTheme ? "text-slate-400" : "text-white/70")}>Monthly Consistency</h4>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className={cn("p-2 rounded-xl border transition-colors", isLightTheme ? "bg-white border-slate-200" : "bg-white/[0.02] border-white/5")}>
                    <span className={cn("text-lg font-bold", isLightTheme ? "text-slate-900" : "text-white")}>{data.monthlyReport.activeDays}</span>
                    <p className={cn("text-[9px] font-semibold uppercase mt-0.5", isLightTheme ? "text-slate-400" : "text-white/30")}>Active Days</p>
                  </div>
                  <div className={cn("p-2 rounded-xl border transition-colors", isLightTheme ? "bg-white border-slate-200" : "bg-white/[0.02] border-white/5")}>
                    <span className="text-lg font-bold text-rose-500">{data.monthlyReport.missedDays}</span>
                    <p className={cn("text-[9px] font-semibold uppercase mt-0.5", isLightTheme ? "text-slate-400" : "text-white/30")}>Missed</p>
                  </div>
                  <div className={cn("p-2 rounded-xl border transition-colors", isLightTheme ? "bg-white border-slate-200" : "bg-white/[0.02] border-white/5")}>
                    <span className="text-lg font-bold text-orange-500">{data.monthlyReport.averageSessionDuration}m</span>
                    <p className={cn("text-[9px] font-semibold uppercase mt-0.5", isLightTheme ? "text-slate-400" : "text-white/30")}>Avg Time</p>
                  </div>
                </div>

                <div className={cn("text-xs flex justify-between items-center mt-3 pt-3 border-t", isLightTheme ? "border-slate-100 text-slate-400" : "border-white/5 text-white/40")}>
                  <span>Active day rule:</span>
                  <span className={cn("font-bold", isLightTheme ? "text-slate-700" : "text-white/60")}>{data.streakRule === "action" ? "1 Action (Min)" : `>= ${data.timeRequirement}m`}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Habit Analytics */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={cn(
              "rounded-3xl border p-6 space-y-6 transition-colors",
              isLightTheme ? "border-slate-200 bg-white/70" : "border-white/5 bg-[#0e0d1b]/60"
            )}
          >
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <TrendingUp size={18} className="text-orange-500" /> Learning Habit Analytics
              </h3>
              <p className={cn("text-xs mt-1", isLightTheme ? "text-slate-400" : "text-white/40")}>Detailed breakdown of study timers and source activity.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className={cn("p-4 rounded-2xl border transition-colors text-center space-y-1", isLightTheme ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]")}>
                <span className={cn("text-[10px] font-bold uppercase", isLightTheme ? "text-slate-400" : "text-white/30")}>Preferred Time</span>
                <div className={cn("text-base font-extrabold", isLightTheme ? "text-slate-900" : "text-white")}>{data.habitAnalytics.preferredStudyTime}</div>
                <div className={cn("text-[9px]", isLightTheme ? "text-slate-450" : "text-white/30")}>Peak action hours</div>
              </div>

              <div className={cn("p-4 rounded-2xl border transition-colors text-center space-y-1", isLightTheme ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]")}>
                <span className={cn("text-[10px] font-bold uppercase", isLightTheme ? "text-slate-400" : "text-white/30")}>Most Active Day</span>
                <div className={cn("text-base font-extrabold", isLightTheme ? "text-slate-900" : "text-white")}>{data.habitAnalytics.mostActiveDay}</div>
                <div className={cn("text-[9px]", isLightTheme ? "text-slate-450" : "text-white/30")}>Highest volume day</div>
              </div>

              <div className={cn("p-4 rounded-2xl border transition-colors text-center space-y-1", isLightTheme ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]")}>
                <span className={cn("text-[10px] font-bold uppercase", isLightTheme ? "text-slate-400" : "text-white/30")}>Productive Day</span>
                <div className={cn("text-base font-extrabold", isLightTheme ? "text-slate-900" : "text-white")}>{data.habitAnalytics.mostProductiveDay}</div>
                <div className={cn("text-[9px]", isLightTheme ? "text-slate-450" : "text-white/30")}>Highest XP/points day</div>
              </div>

              <div className={cn("p-4 rounded-2xl border transition-colors text-center space-y-1", isLightTheme ? "border-slate-100 bg-slate-50/50" : "border-white/5 bg-white/[0.01]")}>
                <span className={cn("text-[10px] font-bold uppercase", isLightTheme ? "text-slate-400" : "text-white/30")}>Avg Usage/Day</span>
                <div className="text-base font-extrabold text-orange-500">{data.habitAnalytics.averageDailyUsage}</div>
                <div className={cn("text-[9px]", isLightTheme ? "text-slate-450" : "text-white/30")}>Generations/Sessions</div>
              </div>

            </div>
          </motion.div>

        </div>

        {/* Column 3: AI Insights & Quick Action Exports */}
        <div className="space-y-6">
          
          {/* AI Insights Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className={cn(
              "rounded-3xl border p-6 space-y-5 relative overflow-hidden transition-all",
              isLightTheme 
                ? "border-orange-500/20 bg-gradient-to-br from-violet-500/5 to-orange-500/5" 
                : "border-orange-500/10 bg-gradient-to-br from-violet-950/10 to-orange-950/10"
            )}
          >
            <div className="absolute top-0 right-0 p-3 text-orange-500 opacity-20 pointer-events-none">
              <Brain size={80} />
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-orange-500/15 border border-orange-500/20 text-orange-500">
                <Sparkles size={16} />
              </div>
              <div>
                <h3 className={cn("text-sm font-extrabold", isLightTheme ? "text-slate-900" : "text-white")}>AI Habit Insights</h3>
                <p className={cn("text-[10px]", isLightTheme ? "text-slate-400" : "text-white/40")}>Personalized behavior analytics</p>
              </div>
            </div>

            <div className="space-y-4 z-10 relative">
              {insightsLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/40">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="w-5 h-5 rounded-full border border-t-transparent border-orange-505"
                  />
                  <span className={cn("text-xs font-medium", isLightTheme ? "text-slate-400" : "text-white/40")}>Drafting advice...</span>
                </div>
              ) : insights ? (
                <>
                  <div className={cn("text-xs leading-relaxed font-medium", isLightTheme ? "text-slate-650" : "text-white/70")}>
                    {insights.habitAnalysis}
                  </div>
                  
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest block", isLightTheme ? "text-slate-400" : "text-white/40")}>Recommendations</span>
                    {insights.suggestions.map((sug, i) => (
                      <div key={i} className="flex gap-2 text-xs font-semibold text-orange-600 leading-normal">
                        <span className="text-orange-500">•</span>
                        <span>{sug}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className={cn("py-6 text-center text-xs space-y-3", isLightTheme ? "text-slate-400" : "text-white/30")}>
                  <p>Insights require study activity logs.</p>
                  <button 
                    onClick={loadInsights}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors",
                      isLightTheme 
                        ? "border-slate-200 bg-white hover:bg-slate-50 text-slate-700" 
                        : "border-white/10 bg-white/[0.02] hover:bg-white/10 text-white"
                    )}
                  >
                    Analyze Logs
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Export & Sharing Card */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className={cn(
              "rounded-3xl border p-6 space-y-4 transition-colors",
              isLightTheme ? "border-slate-200 bg-white/70" : "border-white/5 bg-[#0e0d1b]/60"
            )}
          >
            <h3 className="text-sm font-extrabold">Exports & Reporting</h3>
            
            <div className="space-y-2">
              <button 
                onClick={() => setSharingModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black text-xs font-extrabold cursor-pointer transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95"
              >
                <Share2 size={14} /> Share Streak Card
              </button>

              <button 
                onClick={handleExportStreakReport}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                  isLightTheme 
                    ? "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900" 
                    : "border-white/5 bg-white/[0.01] hover:bg-white/[0.05] text-white/70 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2 font-bold"><FileSpreadsheet size={13} className="text-orange-500" /> Export Streak Report</span>
                <Download size={13} className="opacity-40" />
              </button>

              <button 
                onClick={handleExportConsistencyReport}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                  isLightTheme 
                    ? "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900" 
                    : "border-white/5 bg-white/[0.01] hover:bg-white/[0.05] text-white/70 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2 font-bold"><Activity size={13} className="text-emerald-500" /> Export Consistency</span>
                <Download size={13} className="opacity-40" />
              </button>

              <button 
                onClick={handleExportHabitReport}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                  isLightTheme 
                    ? "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900" 
                    : "border-white/5 bg-white/[0.01] hover:bg-white/[0.05] text-white/70 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2 font-bold"><TrendingUp size={13} className="text-blue-500" /> Export Habits</span>
                <Download size={13} className="opacity-40" />
              </button>

              <button 
                onClick={handleExportAchievementsSummary}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all",
                  isLightTheme 
                    ? "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900" 
                    : "border-white/5 bg-white/[0.01] hover:bg-white/[0.05] text-white/70 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2 font-bold"><Award size={13} className="text-purple-500" /> Export Achievements</span>
                <Download size={13} className="opacity-40" />
              </button>
            </div>
          </motion.div>

        </div>

      </div>

      {/* ─── Achievements Shelf ─── */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={cn(
          "rounded-3xl border p-6 space-y-6 transition-colors",
          isLightTheme ? "border-slate-200 bg-white/70" : "border-white/5 bg-[#0e0d1b]/60"
        )}
      >
        <div>
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <Award size={18} className="text-orange-500" /> Gamification Streak Milestones
          </h3>
          <p className={cn("text-xs mt-1", isLightTheme ? "text-slate-400" : "text-white/40")}>Unlock badges and rare credentials as your daily learning habit matures.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((ach) => {
            const rarityClass = isLightTheme ? rarityColorsLight[ach.rarity] : rarityColorsDark[ach.rarity];
            return (
              <div 
                key={ach.type}
                className={cn(
                  "p-4 rounded-2xl border flex flex-col justify-between h-[155px] transition-all relative overflow-hidden group",
                  ach.unlocked 
                    ? (isLightTheme 
                        ? "bg-white border-slate-200 shadow-sm hover:border-orange-500/40 hover:-translate-y-1" 
                        : "bg-white/[0.01] border-white/10 hover:border-orange-500/30 hover:shadow-[0_4px_20px_rgba(249,115,22,0.05)] hover:-translate-y-1")
                    : (isLightTheme 
                        ? "bg-slate-100/50 border-slate-200/50 opacity-60 select-none" 
                        : "bg-[#0b0a14] border-white/5 opacity-50 select-none")
                )}
              >
                <div className="flex justify-between items-start z-10">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full border text-[9px] font-extrabold tracking-widest uppercase",
                    rarityClass
                  )}>
                    {ach.rarity}
                  </span>
                  
                  {ach.unlocked ? (
                    <motion.div 
                      whileHover={{ scale: 1.15, rotate: 10 }}
                      className="text-orange-500 text-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.3)] cursor-help"
                    >
                      🔥
                    </motion.div>
                  ) : (
                    <div className={isLightTheme ? "text-slate-300" : "text-white/20"}>
                      <Lock size={14} />
                    </div>
                  )}
                </div>

                <div className="z-10 mt-3">
                  <h4 className={cn(
                    "text-sm font-black tracking-tight",
                    ach.unlocked ? (isLightTheme ? "text-slate-900" : "text-white") : (isLightTheme ? "text-slate-400" : "text-white/40")
                  )}>
                    {ach.name}
                  </h4>
                  <p className={cn("text-[10px] leading-snug mt-1 max-w-[170px]", isLightTheme ? "text-slate-500" : "text-white/40")}>
                    {ach.description}
                  </p>
                </div>

                <div className="text-[9px] font-bold border-t border-white/5 pt-2 mt-2 z-10">
                  {ach.unlocked ? (
                    <span className="text-emerald-600 font-extrabold">Unlocked: {ach.unlockedAt ? new Date(ach.unlockedAt).toLocaleDateString() : ""}</span>
                  ) : (
                    <span className={isLightTheme ? "text-slate-400" : "text-white/30"}>Requires: {ach.days} day streak</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Share Streak Modal ─── */}
      <AnimatePresence>
        {sharingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSharingModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={cn(
                "relative w-full max-w-2xl rounded-3xl border p-6 z-10 shadow-2xl flex flex-col items-center transition-colors",
                isLightTheme ? "bg-white border-slate-200 text-slate-900" : "bg-[#0c0b16] border-white/10 text-white"
              )}
            >
              <button 
                onClick={() => setSharingModalOpen(false)}
                className={cn(
                  "absolute top-4 right-4 p-2 rounded-xl cursor-pointer transition-colors",
                  isLightTheme ? "hover:bg-slate-100 text-slate-400 hover:text-slate-900" : "hover:bg-white/5 text-white/40 hover:text-white"
                )}
              >
                <X size={18} />
              </button>

              <h2 className="text-lg font-black tracking-tight mb-1.5 flex items-center gap-2">
                <Sparkles size={16} className="text-orange-500" /> Share Learning Streak Card
              </h2>
              <p className={cn("text-xs mb-6 text-center", isLightTheme ? "text-slate-500" : "text-white/40")}>Share your learning consistency with peers on social platforms.</p>

              {/* Canvas Preview */}
              <div className={cn(
                "w-full flex justify-center border rounded-2xl p-4 mb-6 transition-colors",
                isLightTheme ? "bg-slate-100 border-slate-200" : "bg-zinc-950/40 border-white/5"
              )}>
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full rounded-xl border shadow-xl"
                  style={{ width: "450px", height: "300px" }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full justify-end">
                <button
                  onClick={handleCopyToClipboard}
                  className={cn(
                    "px-4 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors flex items-center gap-2",
                    isLightTheme 
                      ? "border-slate-200 hover:bg-slate-50 text-slate-700" 
                      : "border-white/10 hover:bg-white/5 text-white"
                  )}
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={handleDownloadPNG}
                  className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-black cursor-pointer transition-colors flex items-center gap-2 active:scale-95"
                >
                  <Download size={14} /> Download PNG
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

