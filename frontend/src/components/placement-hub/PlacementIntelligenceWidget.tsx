"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { cn } from "@/lib/cn";
import {
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumProgressBar,
  AIThinkingScreen,
} from "@/components/ui/PremiumComponents";
import { fadeUp } from "@/utils/animations";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  Target, TrendingUp, ArrowUpRight, ArrowDownRight,
  Zap, Clock, AlertTriangle, ChevronRight, RefreshCw,
  Trophy, Brain, Rocket, CheckCircle, XCircle,
  BarChart3, Activity, Sparkles, DollarSign,
  Shield, Award, Lightbulb, Code2, FileText,
  Mic, Globe, GraduationCap, Briefcase,
  Building2, Star,
} from "lucide-react";

interface SubScores {
  coding: number;
  aptitude: number;
  interview: number;
  resume: number;
  learning: number;
  softSkills: number;
}

interface CompanyMatch {
  company: string;
  matchPercent: number;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  difficulty: string;
  avgPackage: string;
}

interface SkillWeight {
  skill: string;
  weight: number;
  direction: "positive" | "negative";
  source: string;
}

interface PlacementRecommendation {
  type: string;
  title: string;
  description: string;
  impact: string;
  estimatedImprovement: number;
  action: string;
  icon: string;
  color: string;
}

interface HighestImpactTask {
  title: string;
  description: string;
  estimatedImpact: number;
  category: string;
  action: string;
}

interface SalaryEstimate {
  min: number;
  max: number;
  median: number;
  confidence: string;
  basedOn: string;
}

interface ReadinessTimelineEntry {
  stage: string;
  completed: boolean;
  score: number;
  description: string;
}

interface PlacementIntelligenceData {
  placementScore: number;
  subScores: SubScores;
  companyMatches: CompanyMatch[];
  skillWeights: SkillWeight[];
  strengths: string[];
  weaknesses: string[];
  recommendations: PlacementRecommendation[];
  highestImpactTask: HighestImpactTask | null;
  salaryEstimate: SalaryEstimate;
  readinessTimeline: ReadinessTimelineEntry[];
  aiInsights: any;
  cached?: boolean;
}

const LOADING_STEPS = [
  "Aggregating Coding Data",
  "Analyzing Aptitude Progress",
  "Reviewing Interview History",
  "Scoring Resume & ATS",
  "Computing Company Matches",
  "Calculating Placement Score",
  "Ready",
];

function ChartComponent({ type, data, options, height = 200 }: {
  type: string; data: any; options?: any; height?: number;
}) {
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
            legend: { display: data.datasets?.length > 1, labels: { color: "rgba(255,255,255,0.5)", font: { size: 10 } } },
            tooltip: {
              backgroundColor: "rgba(0,0,0,0.8)",
              titleColor: "#fff",
              bodyColor: "rgba(255,255,255,0.7)",
              borderColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
            },
          },
          scales: type !== "doughnut" && type !== "pie" && type !== "radar" ? {
            x: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.4)", font: { size: 9 } } },
            y: { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.4)", font: { size: 9 } } },
          } : undefined,
          ...options,
        },
      });
    };

    loadChart();
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [type, JSON.stringify(data), JSON.stringify(options)]);

  return (
    <div style={{ height }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const config: Record<string, { bg: string; color: string }> = {
    easy: { bg: "rgba(34,197,94,0.15)", color: "#4ade80" },
    medium: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24" },
    hard: { bg: "rgba(239,68,68,0.15)", color: "#f87171" },
  };
  const c = config[difficulty] || config.medium;
  return (
    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: c.bg, color: c.color }}>
      {difficulty}
    </span>
  );
}

function ImpactBadge({ impact }: { impact: string }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    high: { bg: "rgba(239,68,68,0.15)", color: "#f87171", label: "HIGH IMPACT" },
    medium: { bg: "rgba(245,158,11,0.15)", color: "#fbbf24", label: "MED IMPACT" },
    low: { bg: "rgba(34,197,94,0.15)", color: "#4ade80", label: "LOW IMPACT" },
  };
  const c = config[impact] || config.medium;
  return (
    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

const iconMap: Record<string, any> = {
  code: Code2, brain: Brain, mic: Mic, file: FileText,
  globe: Globe, book: GraduationCap, send: Briefcase, alert: AlertTriangle,
};

export function PlacementIntelligenceWidget({
  compact = false,
  onViewChange,
}: {
  compact?: boolean;
  onViewChange?: (view: string) => void;
}) {
  const [data, setData] = useState<PlacementIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchIntelligence = useCallback(async () => {
    try {
      const res = await api.get("/placement/intelligence");
      if (res.data.success) setData(res.data.intelligence);
    } catch (err) {
      console.error("Failed to load placement intelligence:", err);
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
    }, 600);
    fetchIntelligence();
    return () => clearInterval(timer);
  }, [fetchIntelligence]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.post("/placement/intelligence/refresh");
      if (res.data.success) setData(res.data.intelligence);
    } catch (err) {
      console.error("Failed to refresh:", err);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const navigateTo = (view: string) => {
    if (onViewChange) onViewChange(view);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <AIThinkingScreen
          steps={LOADING_STEPS}
          currentStep={loadingStep}
          title="Analyzing Placement Intelligence..."
          subtitle="Aggregating data from all hubs"
        />
      </div>
    );
  }

  if (!data) return null;

  // Radar chart data
  const radarData = {
    labels: ["Coding", "Aptitude", "Interview", "Resume", "Learning", "Soft Skills"],
    datasets: [{
      data: [
        data.subScores.coding,
        data.subScores.aptitude,
        data.subScores.interview,
        data.subScores.resume,
        data.subScores.learning,
        data.subScores.softSkills,
      ],
      backgroundColor: "rgba(245,158,11,0.2)",
      borderColor: "#f59e0b",
      borderWidth: 2,
      pointBackgroundColor: "#f59e0b",
      pointBorderColor: "#f59e0b",
      pointRadius: 4,
    }],
  };

  // Skill weights bar chart
  const topWeights = data.skillWeights.slice(0, 8);
  const skillBarData = {
    labels: topWeights.map(w => w.skill.length > 15 ? w.skill.slice(0, 15) + "..." : w.skill),
    datasets: [{
      data: topWeights.map(w => Math.round(w.weight * 100)),
      backgroundColor: topWeights.map(w =>
        w.direction === "positive" ? "rgba(16,185,129,0.7)" : "rgba(239,68,68,0.7)"
      ),
      borderWidth: 0,
      borderRadius: 4,
    }],
  };

  // Readiness timeline bar chart
  const timelineBarData = {
    labels: data.readinessTimeline.map(t => t.stage),
    datasets: [{
      data: data.readinessTimeline.map(t => t.score),
      backgroundColor: data.readinessTimeline.map(t =>
        t.completed ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.1)"
      ),
      borderColor: data.readinessTimeline.map(t =>
        t.completed ? "#10b981" : "rgba(255,255,255,0.2)"
      ),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  if (compact) {
    return (
      <motion.div variants={fadeUp} initial="hidden" animate="visible">
        <PremiumCard glow className="p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Target size={16} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Placement Intelligence</h3>
                  <p className="text-[10px] text-white/40">Cross-hub analysis</p>
                </div>
              </div>
              <PremiumButton variant="secondary" onClick={handleRefresh}
                icon={<RefreshCw size={10} className={cn(refreshing && "animate-spin")} />}>
                Refresh
              </PremiumButton>
            </div>

            <div className="flex items-center gap-6 mb-4">
              <ScoreRing score={data.placementScore} size={100} strokeWidth={7} label="Overall" />
              <div className="flex-1 grid grid-cols-3 gap-3">
                {[
                  { label: "Coding", score: data.subScores.coding, color: "#f59e0b" },
                  { label: "Aptitude", score: data.subScores.aptitude, color: "#8b5cf6" },
                  { label: "Interview", score: data.subScores.interview, color: "#f43f5e" },
                  { label: "Resume", score: data.subScores.resume, color: "#3b82f6" },
                  { label: "Learning", score: data.subScores.learning, color: "#10b981" },
                  { label: "Soft Skills", score: data.subScores.softSkills, color: "#06b6d4" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-sm font-extrabold" style={{ color: s.color }}>{s.score}%</div>
                    <div className="text-[9px] text-white/40 font-bold uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {data.highestImpactTask && (
              <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-amber-400" />
                  <span className="text-[10px] font-extrabold text-amber-400 uppercase">Highest Impact: {data.highestImpactTask.title}</span>
                  <span className="text-[10px] font-bold text-emerald-400 ml-auto">+{data.highestImpactTask.estimatedImpact}%</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <PremiumButton variant="secondary" className="flex-1 text-xs" onClick={() => navigateTo("placement-hub")}>
                Full Analysis
              </PremiumButton>
              <PremiumButton variant="secondary" className="flex-1 text-xs" onClick={() => navigateTo("aptitude-engine")}>
                Practice Now
              </PremiumButton>
            </div>
          </div>
        </PremiumCard>
      </motion.div>
    );
  }

  // Full view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-[0.2em] mb-1">PLACEMENT INTELLIGENCE</p>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Placement Readiness Engine</h1>
        </div>
        <PremiumButton variant="secondary" onClick={handleRefresh}
          icon={<RefreshCw size={12} className={cn(refreshing && "animate-spin")} />}>
          Refresh Intelligence
        </PremiumButton>
      </div>

      {/* Hero: Overall Score + Radar */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
        <PremiumCard glow className="p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <Target size={16} className="text-amber-500" />
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Placement Readiness Overview</span>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="flex flex-col items-center">
                <ScoreRing score={data.placementScore} size={160} strokeWidth={10} label="Overall" />
                <div className="mt-3 text-center">
                  <span className={cn("text-xs font-bold px-3 py-1 rounded-full",
                    data.placementScore >= 70 ? "bg-emerald-500/15 text-emerald-400" :
                    data.placementScore >= 40 ? "bg-amber-500/15 text-amber-400" :
                    "bg-rose-500/15 text-rose-400"
                  )}>
                    {data.placementScore >= 70 ? "Placement Ready" : data.placementScore >= 40 ? "Making Progress" : "Building Foundations"}
                  </span>
                </div>
              </div>
              <div className="flex-1 w-full">
                <ChartComponent type="radar" data={radarData} height={280}
                  options={{
                    scales: {
                      r: {
                        angleLines: { color: "rgba(255,255,255,0.06)" },
                        grid: { color: "rgba(255,255,255,0.06)" },
                        pointLabels: { color: "rgba(255,255,255,0.6)", font: { size: 11 } },
                        ticks: { display: false },
                        suggestedMin: 0, suggestedMax: 100,
                      },
                    },
                    plugins: { legend: { display: false } },
                  }} />
              </div>
            </div>
          </div>
        </PremiumCard>
      </motion.div>

      {/* AI Insights Brief */}
      {data.aiInsights && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
          <PremiumCard glow className="p-5 border-amber-500/15 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-purple-500" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider mb-2">AI Assessment</h3>
                <p className="text-sm text-white/80 leading-relaxed">{data.aiInsights.overallAssessment}</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="text-center">
                    <div className="text-lg font-extrabold text-emerald-400">{data.aiInsights.estimatedWeeksToReady}w</div>
                    <div className="text-[9px] text-white/40 font-bold uppercase">Est. to Ready</div>
                  </div>
                  {data.aiInsights.targetCompanies?.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-white/40 font-bold uppercase mr-1">Target:</span>
                      {data.aiInsights.targetCompanies.slice(0, 4).map((c: string) => (
                        <span key={c} className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-medium">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Placement Score", value: `${data.placementScore}%`, icon: Target, color: "#f59e0b" },
          { label: "Top Company", value: data.companyMatches[0]?.company || "N/A", icon: Building2, color: "#8b5cf6" },
          { label: "Est. Salary", value: `${data.salaryEstimate.min}-${data.salaryEstimate.max}L`, icon: DollarSign, color: "#10b981" },
          { label: "Strengths", value: data.strengths.length, icon: Award, color: "#3b82f6" },
        ].map((m, i) => (
          <motion.div key={m.label} variants={fadeUp} initial="hidden" animate="visible" custom={i}>
            <PremiumCard glow className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}15`, color: m.color }}>
                  <m.icon size={18} />
                </div>
              </div>
              <div className="text-xl font-extrabold text-white mb-1 truncate">{m.value}</div>
              <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{m.label}</div>
            </PremiumCard>
          </motion.div>
        ))}
      </div>

      {/* Skill Weights + Readiness Timeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-emerald-400" />
              <h3 className="text-xs font-extrabold text-white/70 uppercase tracking-wider">Skill Contribution</h3>
            </div>
            <ChartComponent type="bar" data={skillBarData} height={260}
              options={{
                indexAxis: "y",
                plugins: { legend: { display: false } },
                scales: {
                  x: { beginAtZero: true, max: 100, grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.4)", font: { size: 9 } } },
                  y: { grid: { display: false }, ticks: { color: "rgba(255,255,255,0.5)", font: { size: 9 } } },
                },
              }} />
          </PremiumCard>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-amber-400" />
              <h3 className="text-xs font-extrabold text-white/70 uppercase tracking-wider">Readiness Timeline</h3>
            </div>
            <ChartComponent type="bar" data={timelineBarData} height={260}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, max: 100, grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.4)", font: { size: 9 } } },
                  x: { grid: { display: false }, ticks: { color: "rgba(255,255,255,0.5)", font: { size: 9 } } },
                },
              }} />
          </PremiumCard>
        </motion.div>
      </div>

      {/* Strengths + Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}>
          <PremiumCard glow className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle size={16} className="text-emerald-400" />
              </div>
              <h3 className="text-xs font-extrabold text-white/70 uppercase tracking-wider">Strengths</h3>
            </div>
            <div className="space-y-2">
              {data.strengths.length > 0 ? data.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  <CheckCircle size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-white/80">{s}</span>
                </div>
              )) : (
                <p className="text-xs text-white/40 italic">Complete more activities to identify strengths</p>
              )}
            </div>
          </PremiumCard>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}>
          <PremiumCard glow className="p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center">
                <AlertTriangle size={16} className="text-rose-400" />
              </div>
              <h3 className="text-xs font-extrabold text-white/70 uppercase tracking-wider">Areas to Improve</h3>
            </div>
            <div className="space-y-2">
              {data.weaknesses.length > 0 ? data.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-rose-500/5 border border-rose-500/10">
                  <AlertTriangle size={12} className="text-rose-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-white/80">{w}</span>
                </div>
              )) : (
                <p className="text-xs text-white/40 italic">No critical weaknesses identified</p>
              )}
            </div>
          </PremiumCard>
        </motion.div>
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={8}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={16} className="text-amber-500" />
              <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">Placement Recommendations</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recommendations.map((rec, i) => {
                const Icon = iconMap[rec.icon] || Zap;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-amber-500/20 transition-all cursor-pointer group"
                    onClick={() => navigateTo(rec.action)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color: rec.color }} />
                      <ImpactBadge impact={rec.impact} />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">{rec.title}</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">{rec.description}</p>
                    <div className="mt-2 text-[10px] font-bold text-emerald-400">+{rec.estimatedImprovement}% impact</div>
                  </motion.div>
                );
              })}
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* Company Matches */}
      {data.companyMatches.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}>
          <PremiumCard glow className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={16} className="text-purple-400" />
              <h3 className="text-xs font-extrabold text-white/70 uppercase tracking-wider">Company Match Analysis</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.companyMatches.slice(0, 9).map((match, i) => (
                <motion.div
                  key={match.company}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-purple-500/20 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-purple-400" />
                      <span className="text-xs font-bold text-white">{match.company}</span>
                    </div>
                    <DifficultyBadge difficulty={match.difficulty} />
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-white/40 font-bold">Match</span>
                      <span className={cn("text-xs font-extrabold",
                        match.matchPercent >= 70 ? "text-emerald-400" :
                        match.matchPercent >= 40 ? "text-amber-400" :
                        "text-rose-400"
                      )}>{match.matchPercent}%</span>
                    </div>
                    <PremiumProgressBar value={match.matchPercent}
                      color={match.matchPercent >= 70 ? "green" : match.matchPercent >= 40 ? "amber" : "rose"} height={3} />
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-white/40">{match.avgPackage}</span>
                    <span className="text-white/40">{match.matchedSkills.length}/{match.requiredSkills.length} skills</span>
                  </div>
                  {match.missingSkills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {match.missingSkills.slice(0, 3).map(s => (
                        <span key={s} className="text-[8px] px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-medium">{s}</span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </PremiumCard>
        </motion.div>
      )}

      {/* Salary Estimate */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={10}>
        <PremiumCard glow className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-emerald-400" />
            <h3 className="text-xs font-extrabold text-white/70 uppercase tracking-wider">AI Salary Estimate</h3>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center">
              <div className="text-3xl font-extrabold text-emerald-400">{data.salaryEstimate.median} LPA</div>
              <div className="text-[10px] text-white/40 font-bold uppercase">Median Package</div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Range</span>
                <span className="font-bold text-white">{data.salaryEstimate.min} - {data.salaryEstimate.max} LPA</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Confidence</span>
                <span className={cn("font-bold",
                  data.salaryEstimate.confidence === "high" ? "text-emerald-400" :
                  data.salaryEstimate.confidence === "medium" ? "text-amber-400" :
                  "text-rose-400"
                )}>{data.salaryEstimate.confidence}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Based on</span>
                <span className="text-white/70 text-right flex-1 ml-4">{data.salaryEstimate.basedOn}</span>
              </div>
            </div>
          </div>
        </PremiumCard>
      </motion.div>
    </div>
  );
}
