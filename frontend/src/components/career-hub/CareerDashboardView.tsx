"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, useInView } from "framer-motion";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { mkColors } from "@/utils/themeColors";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumProgressBar,
  AIThinkingScreen,
  EmptyState,
} from "@/components/ui/PremiumComponents";
import { fadeUp } from "@/utils/animations";
import {
  Target, TrendingUp, ArrowUpRight, ArrowDownRight,
  BookOpen, Code2, FileText, Mic, BarChart3, Award,
  Zap, Circle, Clock, AlertTriangle,
  ChevronRight, RefreshCw, Trophy, Globe,
  Calendar, Flame, Brain, Rocket, GraduationCap,
  Sparkles, MessageCircle, Lightbulb,
  Users, LineChart, PieChart, Activity,
  CheckCircle, MapPin, Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ScoreRing, MiniScoreRing } from "@/components/ui/ScoreRing";
import { PlacementIntelligenceWidget } from "@/components/placement-hub/PlacementIntelligenceWidget";
import { CompanyMatchWidget } from "@/components/placement-hub/CompanyMatchWidget";

interface CareerDashboardData {
  scores: {
    overall: number;
    coding: number;
    learning: number;
    resume: number;
    interview: number;
    recruiter: number;
    portfolio: number;
    ats: number;
    linkedin: number;
    profileCompletion: number;
  };
  dailyBrief: {
    greeting: string;
    userName: string;
    lines: string[];
  };
  todayActions: Array<{
    title: string;
    priority: string;
    category: string;
    icon: string;
    estimatedMinutes: number;
  }>;
  timeline: Array<{
    type: string;
    title: string;
    date: string;
    icon: string;
    color: string;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    targetValue: number;
    currentValue: number;
    category: string;
    completed: boolean;
    icon: string;
    color: string;
  }>;
  recommendations: Array<{
    type: string;
    title: string;
    description: string;
    impact: string;
    icon: string;
    color: string;
    action: string;
  }>;
  insights: string[];
  careerCoach: {
    biggestWin: string;
    biggestRisk: string;
    focusArea: string;
    completedMilestones: number;
    totalMilestones: number;
    overallAssessment: string;
  };
  interviewSummary?: {
    totalCompleted: number;
    avgScore: number;
    latestReadiness: number;
    biggestStrength: string;
    biggestWeakness: string;
    improvementDelta: number;
  };
  learningSummary: {
    topicsCompleted: number;
    studyHours: number;
    weakTopics: string[];
    recommendedTopic: string;
    studySessions: number;
    notesGenerated: number;
    quizzesCreated: number;
    flashcardsCreated: number;
    presentationsCreated: number;
    mindMapsCreated: number;
  };
  codingSummary: {
    problemsSolved: number;
    currentStreak: number;
    challengesCompleted: number;
    aiReviewAverage: number;
    roadmapProgress: number;
    accuracy: number;
    totalSubmissions: number;
    codingSessions: number;
  };
  resumeSummary: {
    resumeScore: number;
    atsScore: number;
    improvementSuggestionsRemaining: number;
    resumeVersions: number;
    resumesCreated: number;
    coverLettersCount: number;
    resumeAnalyses: number;
    resumeImprovements: number;
  };
  professionalBrand: {
    linkedinScore: number;
    coverLettersGenerated: number;
    profileCompleteness: number;
    networkingProgress: number;
    githubConnected: boolean;
  };
  charts: {
    weeklyActivity: Array<{
      date: string;
      learning: number;
      coding: number;
      resume: number;
    }>;
    atsHistory: Array<{
      date: string;
      score: number;
    }>;
    resumeHistory: Array<{
      version: number;
      date: string;
      title: string;
    }>;
  };
  weakTopics: Array<{
    name: string;
    score: number;
    risk: string;
  }>;
}

const LOADING_STEPS = [
  "Collecting Learning Data",
  "Reviewing Coding Progress",
  "Analyzing Resume",
  "Calculating Career Readiness",
  "Generating AI Insights",
  "Building Dashboard",
  "Ready",
];

function CountUp({ target, duration = 1500, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.round(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

// ScoreRing is now imported from @/components/ui/ScoreRing

function MetricCard({ icon: Icon, label, value, trend, trendValue, color, delay = 0 }: {
  icon: any; label: string; value: string | number; trend?: "up" | "down" | "neutral";
  trendValue?: string; color: string; delay?: number;
}) {
  const C = useThemeColors();
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={delay}
    >
      <PremiumCard tilt glow className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
            <Icon size={18} />
          </div>
          {trend && trendValue && (
            <span className={cn("text-[10px] font-bold flex items-center gap-0.5",
              trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-gray-400"
            )}>
              {trend === "up" && <ArrowUpRight size={11} />}
              {trend === "down" && <ArrowDownRight size={11} />}
              {trendValue}
            </span>
          )}
        </div>
        <div className="text-xl font-extrabold mb-1" style={{ color: C.text }}>{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.textMuted }}>{label}</div>
      </PremiumCard>
    </motion.div>
  );
}

function ActionPriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    High: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "HIGH" },
    Medium: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", label: "MED" },
    Low: { bg: "rgba(34,197,94,0.15)", color: "#4ade80", label: "LOW" },
  };
  const c = config[priority] || config.Medium;
  return (
    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function TimelineItem({ event, index }: { event: CareerDashboardData["timeline"][0]; index: number }) {
  const C = useThemeColors();
  const iconMap: Record<string, any> = {
    book: BookOpen, code: Code2, file: FileText, chart: BarChart3,
    letter: Send, linkedin: Globe, mic: Mic, trophy: Trophy,
  };
  const Icon = iconMap[event.icon] || Circle;
  const d = new Date(event.date);
  const timeStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-start gap-3 py-3"
    >
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: `${event.color}20`, color: event.color }}>
          <Icon size={14} />
        </div>
        {index < 9 && <div className="w-px h-full min-h-[20px] mt-1" style={{ background: C.border }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{event.title}</p>
        <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{timeStr}</p>
      </div>
    </motion.div>
  );
}

function MilestoneItem({ milestone, index }: { milestone: CareerDashboardData["milestones"][0]; index: number }) {
  const C = useThemeColors();
  const progress = Math.min(100, Math.round((milestone.currentValue / milestone.targetValue) * 100));

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={index}
      className="flex items-center gap-3 p-3 rounded-xl border transition-all"
      style={{
        background: milestone.completed ? undefined : C.surface,
        borderColor: milestone.completed ? undefined : C.border,
      }}
    >
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
        milestone.completed ? "bg-emerald-500/20" : ""
      )}
        style={!milestone.completed ? { background: C.surface } : undefined}
      >
        {milestone.completed ? (
          <CheckCircle size={18} className="text-emerald-400" />
        ) : (
          <div className="relative">
            <Circle size={18} style={{ color: C.textMuted }} />
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: C.textMuted }}>
              {Math.round(progress)}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: milestone.completed ? undefined : C.text }}>
          {milestone.title}
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>{milestone.description}</p>
      </div>
      {!milestone.completed && (
        <div className="w-16">
          <PremiumProgressBar value={progress} color="amber" height={3} />
        </div>
      )}
    </motion.div>
  );
}

function ChartComponent({ type, data, options, height = 200 }: {
  type: string; data: any; options?: any; height?: number;
}) {
  const C = useThemeColors();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const loadChart = async () => {
      const { Chart: ChartJS, registerables } = await import("chart.js");
      ChartJS.register(...registerables);

      if (chartRef.current) chartRef.current.destroy();

      chartRef.current = new ChartJS(canvasRef.current!, {
        type: type as any,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: data.datasets?.length > 1, labels: { color: C.textSec, font: { size: 10 } } },
            tooltip: {
              backgroundColor: C.isDark ? "rgba(0,0,0,0.8)" : "#ffffff",
              titleColor: C.text,
              bodyColor: C.textSec,
              borderColor: C.border,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              titleFont: { size: 11, weight: 700 },
              bodyFont: { size: 10 },
            },
          },
          scales: type !== "doughnut" && type !== "pie" && type !== "radar" ? {
            x: { grid: { color: C.border }, ticks: { color: C.textMuted, font: { size: 10 } } },
            y: { grid: { color: C.border }, ticks: { color: C.textMuted, font: { size: 10 } } },
          } : undefined,
          ...options,
        },
      });
    };

    loadChart();
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [type, JSON.stringify(data), JSON.stringify(options), C.isDark]);

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export function CareerDashboardView({ setView }: { setView?: (v: string) => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<CareerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [theme, setTheme] = useState("dark");
  const [refreshing, setRefreshing] = useState(false);
  const C = useMemo(() => mkColors(theme), [theme]);

  const userFirstName = useMemo(() => {
    if (user?.name) return user.name.split(" ")[0].trim();
    if ((user as any)?.firstName) return (user as any).firstName;
    return "";
  }, [user]);

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(t);
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const fetchDashboard = useCallback(async (forceRefresh = false) => {
    try {
      const endpoint = forceRefresh ? "/career/dashboard?refresh=true" : "/career/dashboard";
      const res = await api.get(endpoint);
      if (res.data.success) setData(res.data.dashboard);
    } catch (err) {
      console.error("Failed to load career dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let step = 0;
    const timer = setInterval(() => {
      if (step < LOADING_STEPS.length - 1) {
        step++;
        setLoadingStep(step);
      }
    }, 700);
    fetchDashboard(true);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const navigateTo = (view: string) => {
    if (setView) setView(view);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <AIThinkingScreen
          steps={LOADING_STEPS}
          currentStep={loadingStep}
          title="Building Your Career Dashboard..."
          subtitle="Analyzing your progress across all hubs"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          illustration={<Target size={48} />}
          title="Career Dashboard Unavailable"
          description="We couldn't load your career dashboard data. Please try again later."
        />
      </div>
    );
  }

  const hasMinimalData = data.scores.overall === 0 && data.codingSummary.problemsSolved === 0 && data.resumeSummary.resumesCreated === 0;

  if (hasMinimalData) {
    return (
      <div className="space-y-6">
        <EmptyState
          illustration={<Rocket size={48} />}
          title="Welcome to Your Career Command Center"
          description="Complete your resume, solve coding problems, and finish learning modules to unlock personalized career analytics and AI-powered insights."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button variants={fadeUp} initial="hidden" animate="visible" custom={0}
            onClick={() => navigateTo("resume-builder")} className="text-left">
            <PremiumCard tilt glow className="p-5 hover:border-blue-500/30 transition-colors cursor-pointer">
              <FileText size={24} className="text-blue-400 mb-3" />
               <h3 className="text-sm font-bold mb-1" style={{ color: C.text }}>Build Your Resume</h3>
              <p className="text-xs" style={{ color: C.textMuted }}>Create an ATS-optimized resume to get started</p>
            </PremiumCard>
          </motion.button>
          <motion.button variants={fadeUp} initial="hidden" animate="visible" custom={1}
            onClick={() => navigateTo("dsa-practice")} className="text-left">
            <PremiumCard tilt glow className="p-5 hover:border-amber-500/30 transition-colors cursor-pointer">
              <Code2 size={24} className="text-amber-400 mb-3" />
               <h3 className="text-sm font-bold mb-1" style={{ color: C.text }}>Start Coding Practice</h3>
              <p className="text-xs" style={{ color: C.textMuted }}>Solve DSA problems to build technical readiness</p>
            </PremiumCard>
          </motion.button>
          <motion.button variants={fadeUp} initial="hidden" animate="visible" custom={2}
            onClick={() => navigateTo("study-assistant")} className="text-left">
            <PremiumCard tilt glow className="p-5 hover:border-purple-500/30 transition-colors cursor-pointer">
              <GraduationCap size={24} className="text-purple-400 mb-3" />
               <h3 className="text-sm font-bold mb-1" style={{ color: C.text }}>Start Learning</h3>
              <p className="text-xs" style={{ color: C.textMuted }}>Begin study sessions to build foundational knowledge</p>
            </PremiumCard>
          </motion.button>
        </div>
      </div>
    );
  }

  // ─── Chart Data ───────────────────────────────────────────────────
  const weeklyLabels = data.charts.weeklyActivity.map(w => {
    const d = new Date(w.date);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  });

  const weeklyChartData = {
    labels: weeklyLabels,
    datasets: [
      { label: "Learning", data: data.charts.weeklyActivity.map(w => w.learning), borderColor: "#8b5cf6", backgroundColor: "rgba(139,92,246,0.1)", fill: true, tension: 0.4, pointRadius: 3 },
      { label: "Coding", data: data.charts.weeklyActivity.map(w => w.coding), borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)", fill: true, tension: 0.4, pointRadius: 3 },
      { label: "Resume", data: data.charts.weeklyActivity.map(w => w.resume), borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", fill: true, tension: 0.4, pointRadius: 3 },
    ],
  };

  const readinessChartData = {
    labels: ["Coding", "Learning", "Resume", "Interview", "Recruiter", "Portfolio"],
    datasets: [{
      data: [data.scores.coding, data.scores.learning, data.scores.resume, data.scores.interview, data.scores.recruiter, data.scores.portfolio],
      backgroundColor: ["rgba(245,158,11,0.3)", "rgba(139,92,246,0.3)", "rgba(59,130,246,0.3)", "rgba(244,63,94,0.3)", "rgba(16,185,129,0.3)", "rgba(6,182,212,0.3)"],
      borderColor: ["#f59e0b", "#8b5cf6", "#3b82f6", "#f43f5e", "#10b981", "#06b6d4"],
      borderWidth: 2,
    }],
  };

  const atsChartData = data.charts.atsHistory.length > 1 ? {
    labels: data.charts.atsHistory.map(a => new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
    datasets: [{
      label: "ATS Score",
      data: data.charts.atsHistory.map(a => a.score),
      borderColor: "#10b981",
      backgroundColor: "rgba(16,185,129,0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: "#10b981",
    }],
  } : null;

  const productivityChartData = {
    labels: ["DSA Problems", "Study Sessions", "Notes", "Quizzes", "Challenges", "Cover Letters"],
    datasets: [{
      data: [
        data.codingSummary.problemsSolved,
        data.learningSummary.studySessions,
        data.learningSummary.notesGenerated,
        data.learningSummary.quizzesCreated,
        data.codingSummary.challengesCompleted,
        data.resumeSummary.coverLettersCount,
      ],
      backgroundColor: [
        "rgba(245,158,11,0.7)", "rgba(139,92,246,0.7)", "rgba(59,130,246,0.7)",
        "rgba(236,72,153,0.7)", "rgba(16,185,129,0.7)", "rgba(244,63,94,0.7)",
      ],
      borderWidth: 0,
      borderRadius: 6,
    }],
  };

  const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-8"
    >
      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-[0.2em] mb-1">CAREER COMMAND CENTER</p>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: C.text }}>Career Dashboard</h1>
        </div>
        <PremiumButton variant="secondary" onClick={handleRefresh} icon={<RefreshCw size={12} className={cn(refreshing && "animate-spin")} />}>
          Refresh
        </PremiumButton>
      </div>

      {/* ─── Hero Section: Overall Score + Score Rings ───────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
        <PremiumCard glow className="p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Target size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Career Readiness Overview</span>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Main Score Ring */}
              <div className="flex flex-col items-center">
                <ScoreRing score={data.scores.overall} size={160} strokeWidth={10} label="Overall" delay={0} />
                <div className="mt-3 text-center">
                  <span className={cn("text-xs font-bold px-3 py-1 rounded-full",
                    data.scores.overall >= 70 ? "bg-emerald-500/15 text-emerald-400" :
                    data.scores.overall >= 40 ? "bg-amber-500/15 text-amber-400" :
                    "bg-rose-500/15 text-rose-400"
                  )}>
                    {data.scores.overall >= 70 ? "Job Ready" : data.scores.overall >= 40 ? "Making Progress" : "Getting Started"}
                  </span>
                </div>
              </div>

              {/* Individual Score Rings */}
              <div className="flex flex-wrap justify-center gap-6 flex-1">
                <ScoreRing score={data.scores.coding} size={90} strokeWidth={6} color="#f59e0b" label="Coding" delay={0.1} />
                <ScoreRing score={data.scores.learning} size={90} strokeWidth={6} color="#8b5cf6" label="Learning" delay={0.2} />
                <ScoreRing score={data.scores.resume} size={90} strokeWidth={6} color="#3b82f6" label="Resume" delay={0.3} />
                <ScoreRing score={data.scores.interview} size={90} strokeWidth={6} color="#f43f5e" label="Interview" delay={0.4} />
                <ScoreRing score={data.scores.recruiter} size={90} strokeWidth={6} color="#10b981" label="Recruiter" delay={0.5} />
                <ScoreRing score={data.scores.portfolio} size={90} strokeWidth={6} color="#06b6d4" label="Portfolio" delay={0.6} />
              </div>
            </div>
          </div>
        </PremiumCard>
      </motion.div>

      {/* ─── Placement Intelligence (Compact) ────────────────────── */}
      <PlacementIntelligenceWidget compact onViewChange={navigateTo} />

      {/* ─── AI Daily Brief ─────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
        <PremiumCard glow className="p-5 border-amber-500/15 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-500/10">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Sparkles size={16} className="text-amber-400" />
            </div>
            <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">AI Daily Brief</h3>
            <div className="h-[2px] flex-1 bg-gradient-to-r from-amber-500/40 via-orange-500/25 to-transparent rounded-full ml-2" />
          </div>

          <div className="space-y-2">
            {data.dailyBrief.lines.map((line, i) => {
              let displayLine = line;
              if (i === 0 && userFirstName) {
                displayLine = displayLine.replace(/Good (Morning|Afternoon|Evening),?\s*(User|there|Honey|Learner|Student)?/i, (match, p1) => `Good ${p1}, ${userFirstName}`);
              }
              return (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="text-sm leading-relaxed"
                  style={{ color: C.textSec }}
                >
                  {i === 0 ? (
                    <span className="font-bold text-base block mb-1" style={{ color: C.text }}>{displayLine}</span>
                  ) : (
                    displayLine
                  )}
                </motion.p>
              );
            })}
          </div>
        </PremiumCard>
      </motion.div>

      {/* ─── Key Metrics Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={BarChart3} label="ATS Score" value={`${data.scores.ats}%`}
          trend={data.scores.ats > 50 ? "up" : "neutral"} trendValue={`${data.resumeSummary.resumesCreated} resumes`}
          color="#10b981" delay={0} />
        <MetricCard icon={Code2} label="DSA Solved" value={data.codingSummary.problemsSolved}
          trend={data.codingSummary.currentStreak > 0 ? "up" : "neutral"}
          trendValue={`${data.codingSummary.currentStreak} day streak`} color="#f59e0b" delay={1} />
        <MetricCard icon={Globe} label="LinkedIn Score" value={`${data.scores.linkedin}%`}
          trend={data.scores.linkedin > 50 ? "up" : "neutral"} trendValue="optimized"
          color="#0077b5" delay={2} />
        <MetricCard icon={Award} label="Readiness" value={`${data.scores.overall}%`}
          trend={data.scores.overall > 40 ? "up" : "neutral"} trendValue={data.careerCoach.overallAssessment}
          color="#8b5cf6" delay={3} />
      </div>

      {/* ─── Today's Actions ───────────────────────────────────── */}
      {data.todayActions.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-500" />
              <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Today's Actions</h3>
            </div>
            <div className="space-y-2">
              {[...data.todayActions]
                .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1))
                .map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-3 p-3 rounded-xl border hover:border-amber-500/20 hover:bg-amber-500/[0.03] transition-all cursor-pointer group"
                  style={{ background: C.surface, borderColor: C.border }}
                  onClick={() => navigateTo(action.category === "coding" ? "dsa-practice" : action.category === "resume" ? "ats-checker" : action.category === "career" ? "cover-letter" : action.category === "brand" ? "linkedin-optimizer" : action.category === "learning" ? "study-assistant" : "interview-hub")}
                >
                  <ActionPriorityBadge priority={action.priority} />
                  <span className="text-xs font-semibold flex-1 group-hover:text-amber-400 transition-colors" style={{ color: C.text }}>{action.title}</span>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: C.textMuted }}>
                    <Clock size={10} /> {action.estimatedMinutes}m
                  </span>
                   <ChevronRight size={14} className="group-hover:text-amber-400 transition-colors" style={{ color: C.textMuted }} />
                </motion.div>
              ))}
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* ─── Cross-Hub Analytics + Readiness Radar ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-purple-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>Readiness Breakdown</h3>
            </div>
            <ChartComponent type="radar" data={readinessChartData} height={260}
              options={{
                scales: {
                  r: {
                    angleLines: { color: C.border },
                    grid: { color: C.border },
                    pointLabels: { color: C.textMuted, font: { size: 10 } },
                    ticks: { display: false },
                    suggestedMin: 0, suggestedMax: 100,
                  },
                },
                plugins: { legend: { display: false } },
              }} />
          </PremiumCard>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <LineChart size={16} className="text-amber-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>Weekly Activity</h3>
            </div>
            <ChartComponent type="line" data={weeklyChartData} height={260} />
          </PremiumCard>
        </motion.div>
      </div>

      {/* ─── Learning + Coding + Resume Summaries ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Learning Summary */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
          <PremiumCard glow className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <GraduationCap size={16} className="text-purple-400" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>Learning</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Study Hours</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.learningSummary.studyHours}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Topics Completed</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.learningSummary.topicsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Notes Generated</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.learningSummary.notesGenerated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Quizzes Created</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.learningSummary.quizzesCreated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Flashcards</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.learningSummary.flashcardsCreated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Mind Maps</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.learningSummary.mindMapsCreated}</span>
              </div>
              {data.learningSummary.weakTopics.length > 0 && (
                <div className="pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                  <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Weak Topics</p>
                  <div className="flex flex-wrap gap-1">
                    {data.learningSummary.weakTopics.map((t, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-medium">{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <PremiumButton variant="secondary" className="w-full mt-2 text-xs" onClick={() => navigateTo("study-assistant")}>
                Continue Learning
              </PremiumButton>
            </div>
          </PremiumCard>
        </motion.div>

        {/* Coding Summary */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
          <PremiumCard glow className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Code2 size={16} className="text-amber-400" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>Coding</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Problems Solved</span>
                <span className="text-sm font-bold text-amber-400">{data.codingSummary.problemsSolved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Current Streak</span>
                <span className="text-sm font-bold flex items-center gap-1" style={{ color: C.text }}>
                  <Flame size={12} className="text-orange-400" /> {data.codingSummary.currentStreak} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Challenges Done</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.codingSummary.challengesCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>AI Review Avg</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.codingSummary.aiReviewAverage}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Accuracy</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.codingSummary.accuracy}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Total Submissions</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.codingSummary.totalSubmissions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Coding Sessions</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.codingSummary.codingSessions}</span>
              </div>
              {data.codingSummary.roadmapProgress > 0 && (
                <div className="pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px]" style={{ color: C.textMuted }}>Roadmap Progress</span>
                    <span className="text-[10px] font-bold text-amber-400">{data.codingSummary.roadmapProgress}%</span>
                  </div>
                  <PremiumProgressBar value={data.codingSummary.roadmapProgress} color="amber" height={4} />
                </div>
              )}
              <PremiumButton variant="secondary" className="w-full mt-2 text-xs" onClick={() => navigateTo("dsa-practice")}>
                Open Coding Dashboard
              </PremiumButton>
            </div>
          </PremiumCard>
        </motion.div>

        {/* Resume Summary */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}>
          <PremiumCard glow className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <FileText size={16} className="text-blue-400" />
              </div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>Resume</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Resume Score</span>
                <span className="text-sm font-bold text-blue-400">{data.resumeSummary.resumeScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>ATS Score</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.resumeSummary.atsScore}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Resumes Created</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.resumeSummary.resumesCreated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Cover Letters</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.resumeSummary.coverLettersCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Resume Versions</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.resumeSummary.resumeVersions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: C.textMuted }}>Improvements Applied</span>
                <span className="text-sm font-bold" style={{ color: C.text }}>{data.resumeSummary.resumeImprovements}</span>
              </div>
              {data.resumeSummary.improvementSuggestionsRemaining > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/15">
                  <Lightbulb size={12} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] text-amber-300 font-medium">
                    {data.resumeSummary.improvementSuggestionsRemaining} improvements remaining
                  </span>
                </div>
              )}
              <PremiumButton variant="secondary" className="w-full mt-2 text-xs" onClick={() => navigateTo("ats-checker")}>
                Run ATS Analysis
              </PremiumButton>
            </div>
          </PremiumCard>
        </motion.div>
      </div>

      {/* ─── Professional Brand Summary ─────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={8}>
        <PremiumCard glow className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-cyan-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>Professional Brand</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-lg font-extrabold text-cyan-400">{data.professionalBrand.linkedinScore}%</div>
              <div className="text-[10px] font-bold uppercase" style={{ color: C.textMuted }}>LinkedIn Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-extrabold text-pink-400">{data.professionalBrand.coverLettersGenerated}</div>
              <div className="text-[10px] font-bold uppercase" style={{ color: C.textMuted }}>Cover Letters</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-extrabold text-purple-400">{data.professionalBrand.profileCompleteness}%</div>
              <div className="text-[10px] font-bold uppercase" style={{ color: C.textMuted }}>Profile Complete</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-extrabold text-emerald-400">{data.professionalBrand.githubConnected ? "Yes" : "No"}</div>
              <div className="text-[10px] font-bold uppercase" style={{ color: C.textMuted }}>GitHub Connected</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-extrabold text-amber-400">{data.professionalBrand.profileCompleteness >= 70 ? "Active" : "Needed"}</div>
              <div className="text-[10px] font-bold uppercase" style={{ color: C.textMuted }}>Networking</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <PremiumButton variant="secondary" className="flex-1 text-xs" onClick={() => navigateTo("linkedin-optimizer")}>
              Optimize LinkedIn
            </PremiumButton>
            <PremiumButton variant="secondary" className="flex-1 text-xs" onClick={() => navigateTo("cover-letter")}>
              Generate Cover Letter
            </PremiumButton>
            <PremiumButton variant="secondary" className="flex-1 text-xs" onClick={() => navigateTo("github-portfolio")}>
              Connect GitHub
            </PremiumButton>
          </div>
        </PremiumCard>
      </motion.div>

      {/* ─── Company Match Widget ─────────────────────────────── */}
      <CompanyMatchWidget onViewChange={navigateTo} />

      {/* ─── ATS History Chart + Productivity Chart ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {atsChartData ? (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}>
            <PremiumCard glow className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-emerald-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>ATS Score History</h3>
              </div>
              <ChartComponent type="line" data={atsChartData} height={220} />
            </PremiumCard>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}>
            <PremiumCard glow className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-emerald-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>ATS Score History</h3>
              </div>
              <div className="flex items-center justify-center h-[220px] text-xs" style={{ color: C.textMuted }}>
                Run your first ATS analysis to see score trends
              </div>
            </PremiumCard>
          </motion.div>
        )}

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={10}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieChart size={16} className="text-pink-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: C.textSec }}>Productivity Overview</h3>
            </div>
            <ChartComponent type="bar" data={productivityChartData} height={220}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: C.border }, ticks: { color: C.textMuted, font: { size: 10 } } },
                  x: { grid: { display: false }, ticks: { color: C.textMuted, font: { size: 10 } } },
                },
              }} />
          </PremiumCard>
        </motion.div>
      </div>

      {/* ─── Recommendations Engine ─────────────────────────────── */}
      {data.recommendations.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={11}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={16} className="text-amber-500" />
              <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">AI Recommendations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recommendations.map((rec, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="p-4 rounded-xl border hover:border-amber-500/20 transition-all cursor-pointer group"
                  style={{ background: C.surface, borderColor: C.border }}
                  onClick={() => navigateTo(rec.action)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${rec.color}15` }}>
                      {rec.icon === "code" && <Code2 size={13} style={{ color: rec.color }} />}
                      {rec.icon === "file" && <FileText size={13} style={{ color: rec.color }} />}
                      {rec.icon === "mic" && <Mic size={13} style={{ color: rec.color }} />}
                      {rec.icon === "linkedin" && <Globe size={13} style={{ color: rec.color }} />}
                      {rec.icon === "letter" && <Send size={13} style={{ color: rec.color }} />}
                      {rec.icon === "book" && <BookOpen size={13} style={{ color: rec.color }} />}
                      {rec.icon === "alert" && <AlertTriangle size={13} style={{ color: rec.color }} />}
                      {rec.icon === "globe" && <Globe size={13} style={{ color: rec.color }} />}
                    </div>
                    <PremiumBadge variant={rec.impact === "high" ? "amber" : "purple"}>
                      {rec.impact}
                    </PremiumBadge>
                  </div>
                  <h4 className="text-xs font-bold mb-1 group-hover:text-amber-400 transition-colors" style={{ color: C.text }}>{rec.title}</h4>
                  <p className="text-[10px] leading-relaxed" style={{ color: C.textMuted }}>{rec.description}</p>
                </motion.div>
              ))}
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* ─── Career Insights + AI Career Coach ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Career Insights */}
        {data.insights.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={12}>
            <PremiumCard glow className="p-5 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={16} className="text-purple-400" />
                <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">Career Insights</h3>
              </div>
              <div className="space-y-3">
                {data.insights.map((insight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10"
                  >
                    <Sparkles size={12} className="text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed" style={{ color: C.textSec }}>{insight}</p>
                  </motion.div>
                ))}
              </div>
            </PremiumCard>
          </motion.div>
        )}

        {/* AI Career Coach */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={13}>
          <PremiumCard glow className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={16} className="text-amber-400" />
              <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">AI Career Coach</h3>
            </div>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Biggest Win</p>
                <p className="text-xs" style={{ color: C.textSec }}>{data.careerCoach.biggestWin}</p>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Biggest Risk</p>
                <p className="text-xs" style={{ color: C.textSec }}>{data.careerCoach.biggestRisk}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">Focus Area</p>
                <p className="text-xs" style={{ color: C.textSec }}>{data.careerCoach.focusArea}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] font-bold text-blue-400 uppercase mb-1">Assessment</p>
                <p className="text-xs" style={{ color: C.textSec }}>{data.careerCoach.overallAssessment}</p>
              </div>
              {data.interviewSummary && data.interviewSummary.totalCompleted > 0 && (
                <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <p className="text-[10px] font-bold text-rose-400 uppercase mb-1">Interview Intelligence</p>
                  <div className="space-y-1">
                    <p className="text-xs" style={{ color: C.textSec }}>
                      {data.interviewSummary.totalCompleted} interviews · {data.interviewSummary.avgScore}% avg
                      {data.interviewSummary.improvementDelta !== 0 && (
                        <span className={data.interviewSummary.improvementDelta > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {" "}({data.interviewSummary.improvementDelta > 0 ? "+" : ""}{data.interviewSummary.improvementDelta})
                        </span>
                      )}
                    </p>
                    {data.interviewSummary.biggestStrength && (
                      <p className="text-[10px]" style={{ color: C.textMuted }}>
                        <span className="text-emerald-400 font-bold">Strength:</span> {data.interviewSummary.biggestStrength}
                      </p>
                    )}
                    {data.interviewSummary.biggestWeakness && (
                      <p className="text-[10px]" style={{ color: C.textMuted }}>
                        <span className="text-rose-400 font-bold">Focus:</span> {data.interviewSummary.biggestWeakness}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </PremiumCard>
        </motion.div>
      </div>

      {/* ─── Milestone Tracker ─────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={14}>
        <PremiumCard glow className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" />
              <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Milestone Tracker</h3>
            </div>
            <span className="text-[10px] font-bold" style={{ color: C.textMuted }}>
              {data.careerCoach.completedMilestones}/{data.careerCoach.totalMilestones} completed
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {data.milestones.map((m, i) => (
              <MilestoneItem key={m.id} milestone={m} index={i} />
            ))}
          </div>
        </PremiumCard>
      </motion.div>

      {/* ─── Progress Timeline ─────────────────────────────────── */}
      {data.timeline.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={15}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-cyan-400" />
              <h3 className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">Progress Timeline</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto pr-2 space-y-0" style={{ scrollbarWidth: "thin", scrollbarColor: C.border }}>
              {data.timeline.slice(0, 20).map((event, i) => (
                <TimelineItem key={i} event={event} index={i} />
              ))}
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* ─── Weak Topics (if any) ──────────────────────────────── */}
      {data.weakTopics.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={16}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-rose-400" />
              <h3 className="text-xs font-extrabold text-rose-400 uppercase tracking-wider">Weak Topics Detected</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.weakTopics.map((topic, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: C.text }}>{topic.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <PremiumProgressBar value={topic.score} color="rose" height={3} />
                      <span className="text-[10px] font-bold text-rose-400">{topic.score}%</span>
                    </div>
                  </div>
                  <PremiumBadge variant={topic.risk === "Critical" ? "rose" : topic.risk === "High" ? "amber" : "purple"}>
                    {topic.risk}
                  </PremiumBadge>
                </div>
              ))}
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* ─── Quick Actions ─────────────────────────────────────── */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={17}>
        <PremiumCard glow className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Rocket size={16} className="text-amber-500" />
            <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { label: "Continue Learning", icon: GraduationCap, color: "#8b5cf6", target: "study-assistant" },
              { label: "Coding Dashboard", icon: Code2, color: "#f59e0b", target: "dsa-practice" },
              { label: "Improve Resume", icon: FileText, color: "#3b82f6", target: "resume-builder" },
              { label: "Run ATS Analysis", icon: BarChart3, color: "#10b981", target: "ats-checker" },
              { label: "Cover Letter", icon: Send, color: "#ec4899", target: "cover-letter" },
              { label: "Optimize LinkedIn", icon: Globe, color: "#0077b5", target: "linkedin-optimizer" },
              { label: "Career Roadmap", icon: MapPin, color: "#f43f5e", target: "career-roadmap" },
            ].map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigateTo(action.target)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border hover:border-amber-500/20 transition-all cursor-pointer group"
                style={{ background: C.surface, borderColor: C.border }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                  style={{ background: `${action.color}15` }}>
                  <action.icon size={18} style={{ color: action.color }} />
                </div>
                <span className="text-[10px] font-bold group-hover:text-amber-400 transition-colors text-center leading-tight" style={{ color: C.textMuted }}>
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </PremiumCard>
      </motion.div>
    </motion.div>
  );
}
