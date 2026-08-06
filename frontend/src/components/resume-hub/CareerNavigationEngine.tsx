"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import type { ResumeHubViewType } from "@/types/resume";
import { useTheme } from "@/hooks/useTheme";
import { useConfig } from "@/hooks/useConfig";
import { getAuthUser } from "@/hooks/useAuth";
import { mkColors } from "@/utils/themeColors";
import { fadeUp, scaleIn, slideRight, buttonHover } from "@/utils/animations";
import { EmptyState } from "@/components/ui/PremiumComponents";
import confetti from "canvas-confetti";
import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip as CT, Legend as CL, CategoryScale, LinearScale, BarElement, ArcElement,
} from "chart.js";
import { Radar, Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Compass, Sparkles, RefreshCw, Check, Award, Target,
  TrendingUp, Users, FileText, Briefcase, Code2, GraduationCap,
  Link2, Zap, Eye, ChevronDown, ChevronRight, History,
  Lightbulb, Star, ArrowRight, BarChart3,
  Trash2, BookOpen, Calendar, Circle, CheckCircle, AlertTriangle, X,
  Rocket, Brain, Globe, Shield, Map, Route, Clock, Flag,
  ArrowLeft, Download, Play, Pause, RotateCcw, Trophy,
  Layers, GitBranch, BookOpenCheck, PenTool, Layers3,
  CircleDot, ListTodo, Presentation, Award as AwardIcon,
  LayoutDashboard,
} from "lucide-react";

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler, CT, CL,
  CategoryScale, LinearScale, BarElement, ArcElement
);

const LOADING_STEPS = [
  "Analyzing Resume Quality",
  "Reading Coding Progress",
  "Reviewing Learning Analytics",
  "Calculating Career Readiness",
  "Generating Personalized Roadmap",
  "Planning Weekly Tasks",
  "Preparing Market Insights",
  "Ready",
];

const mkC = (t: string) => {
  const base = mkColors(t);
  return {
    ...base,
    tx: base.text, tx2: base.textSec, txM: base.textMuted,
    sf: base.surface, sfH: base.surfaceHover,
    bd: base.border, bdH: base.borderHover,
    cb: base.cardBg, cs: base.shadow, dv: base.divider,
    am: base.amber, amBg: base.amberBg,
    gn: base.green, gnBg: base.greenBg,
    rd: base.red, rdBg: base.redBg,
    bl: base.blue, blBg: base.blueBg,
    pp: base.purple, ppBg: base.purpleBg,
    cy: base.cyan, cyBg: base.cyanBg,
  };
};


function ScoreRing({ score, size = 120, stroke = 10, color, label, c }: {
  score: number; size?: number; stroke?: number; color: string; label: string; c: ReturnType<typeof mkC>;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke={c.bd} strokeWidth={stroke} fill="transparent" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="transparent"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.5 }}
            className="font-extrabold" style={{ fontSize: size * 0.22, color }}>
            {score}
          </motion.span>
          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.txM }}>/100</span>
        </div>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: c.tx2 }}>{label}</span>
    </div>
  );
}

function StepLoader({ steps, currentStep, c }: { steps: string[]; currentStep: number; c: ReturnType<typeof mkC> }) {
  return (
    <div className="w-full max-w-lg mx-auto my-12 space-y-4">
      <div className="text-center mb-6">
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 mx-auto mb-4 rounded-full border-3 border-t-transparent" style={{ borderColor: `${c.am} transparent transparent transparent`, borderWidth: 3 }} />
        <h3 className="text-lg font-bold" style={{ color: c.tx }}>Generating Your Career Roadmap</h3>
        <p className="text-xs mt-1" style={{ color: c.txM }}>AI is analyzing your complete profile</p>
      </div>
      {steps.map((step, i) => (
        <motion.div key={step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{
            background: i < currentStep ? c.gnBg : i === currentStep ? c.amBg : c.sf,
            border: `1px solid ${i < currentStep ? `${c.gn}30` : i === currentStep ? `${c.am}30` : c.bd}`,
          }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{
            background: i < currentStep ? c.gn : i === currentStep ? c.am : c.dv,
            color: i <= currentStep ? "#fff" : c.txM,
          }}>
            {i < currentStep ? <Check size={12} /> : i + 1}
          </div>
          <span className="text-xs font-semibold" style={{ color: i <= currentStep ? c.tx : c.txM }}>{step}</span>
          {i === currentStep && (
            <motion.div className="ml-auto w-2 h-2 rounded-full" style={{ background: c.am }}
              animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1, repeat: Infinity }} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

interface RoadmapPhase {
  title: string; description: string; duration: string; objectives: string[];
  expectedOutcomes: string[]; completionPercentage: number; dependencies: string[];
}
interface WeeklyTask {
  title: string; description: string; category: string; priority: string;
  estimatedHours: number; impactScore: number; status: string;
}
interface GapSkill { skill: string; importance: string; priority: number; reason: string; }
interface SkillMapItem { name: string; currentLevel: number; targetLevel: number; status: string; dependencies: string[]; category: string; }
interface ProjectRec { title: string; description: string; skillsGained: string[]; resumeImpact: string; interviewValue: string; estimatedTime: string; difficulty: string; whyItMatters: string; }
interface CertRec { name: string; issuer: string; why: string; difficulty: string; roi: string; studyTime: string; }
interface Milestone { title: string; description: string; targetDate: string; category: string; status: string; }

interface RoadmapResponse {
  readinessScores: { overall: number; technical: number; resume: number; interview: number; placement: number; recruiter: number };
  roadmap: { phases: RoadmapPhase[]; totalDuration: string };
  weeklyPlan: { tasks: WeeklyTask[]; dailyMicroTasks: string[]; totalEstimatedHours: number };
  gapAnalysis: { missingSkills: GapSkill[]; missingProjects: { project: string; impact: string; effort: string }[]; missingCertifications: CertRec[]; missingExperience: { area: string; suggestion: string }[]; missingSoftSkills: { skill: string; importance: string }[] };
  skillMap: { skills: SkillMapItem[] };
  projectRecommendations: ProjectRec[];
  certRecommendations: CertRec[];
  marketInsights: { currentDemand: string; averageSalary: string; topSkillCombinations: string[]; resumeExpectations: string[]; portfolioExpectations: string[]; interviewTrends: string[]; topHiringCompanies: string[]; growthOutlook: string };
  coachFeedback: { weeklyFeedback: string; progressSummary: string; motivationalGuidance: string; focusAreas: string[]; risks: string[]; nextBestAction: string };
  milestones: Milestone[];
}

interface RoadmapRecord {
  id: string; targetRole: string; timeline: string; readinessScore: number; createdAt: string; versionNumber: number;
}
interface TaskRecord {
  id: string; title: string; description: string; category: string; priority: string; status: string;
  estimatedHours: number; impactScore: number;
}

interface Props { setView: (v: ResumeHubViewType) => void; }

function SkillNode({ skill, c }: { skill: SkillMapItem; c: ReturnType<typeof mkC> }) {
  if (!skill) return null;
  const current = skill.currentLevel || 0;
  const target = skill.targetLevel || 0;
  const isCompleted = skill.status === "completed" || current >= 80;
  const isInProgress = skill.status === "in_progress" || (current > 0 && current < 80);
  const isLocked = skill.status === "locked" || (!isCompleted && !isInProgress);

  return (
    <motion.div whileHover={{ scale: 1.02 }} className="w-full max-w-[170px] p-3 rounded-xl relative transition-all"
      style={{
        background: isCompleted ? c.gnBg : isInProgress ? c.amBg : c.sf,
        border: `1px solid ${isCompleted ? `${c.gn}40` : isInProgress ? `${c.am}40` : c.bd}`,
        boxShadow: isInProgress ? `0 0 15px ${c.am}15` : "none",
      }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-extrabold truncate pr-1" style={{ color: isLocked ? c.txM : c.tx }}>{skill.name || "Skill"}</span>
        {isCompleted ? (
          <CheckCircle size={12} style={{ color: c.gn }} />
        ) : isInProgress ? (
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-3.5 h-3.5 rounded-full border border-t-transparent animate-spin" style={{ borderColor: `${c.am} transparent transparent transparent`, borderWidth: 1.5 }} />
        ) : (
          <Shield size={10} style={{ color: c.txM }} className="opacity-40" />
        )}
      </div>
      <div className="space-y-1">
        <div className="h-1.5 rounded-full" style={{ background: c.dv }}>
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${current}%`, background: isCompleted ? c.gn : isInProgress ? c.am : c.txM }} />
        </div>
        <div className="flex justify-between text-[8px] font-bold" style={{ color: c.txM }}>
          <span>Cur: {current}%</span>
          <span>Tar: {target}%</span>
        </div>
      </div>
    </motion.div>
  );
}

export function CareerNavigationEngine({ setView }: Props) {
  const theme = useTheme();
  const c = mkC(theme);
  const cfg = useConfig();

  const [tab, setTab] = useState<"setup" | "overview" | "roadmap" | "weekly" | "skills" | "gaps" | "projects" | "insights" | "coach" | "history" | "milestones">("setup");
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [error, setError] = useState("");

  const [targetRole, setTargetRole] = useState("");
  const [timeline, setTimeline] = useState("90 Days");
  const [customRole, setCustomRole] = useState("");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState("Entry-level");
  const [showExpDropdown, setShowExpDropdown] = useState(false);
  const [customTimeline, setCustomTimeline] = useState("");

  const [roadmapData, setRoadmapData] = useState<RoadmapResponse | null>(null);
  const [roadmapRecord, setRoadmapRecord] = useState<RoadmapRecord | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [history, setHistory] = useState<RoadmapRecord[]>([]);
  const [localMilestones, setLocalMilestones] = useState<Milestone[]>([]);
  const [milestoneCategoryFilter, setMilestoneCategoryFilter] = useState("all");
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState("all");

  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const [activeTaskFilter, setActiveTaskFilter] = useState("all");
  const [checkedMicroTasks, setCheckedMicroTasks] = useState<Record<string, boolean>>({});
  const [checkedObjectives, setCheckedObjectives] = useState<Record<string, boolean>>({});

  const scores = roadmapData?.readinessScores || { overall: 0, technical: 0, resume: 0, interview: 0, placement: 0, recruiter: 0 };
  const phases = roadmapData?.roadmap?.phases || [];
  const gapSkills = roadmapData?.gapAnalysis?.missingSkills || [];
  const skillItems = roadmapData?.skillMap?.skills || [];

  const getSkillColumns = useCallback(() => {
    const cols = { foundation: [] as SkillMapItem[], core: [] as SkillMapItem[], advanced: [] as SkillMapItem[], specialized: [] as SkillMapItem[] };
    skillItems.forEach(s => {
      if (!s) return;
      const name = (s.name || "").toLowerCase();
      const deps = s.dependencies || [];
      if (deps.length === 0) {
        cols.foundation.push(s);
      } else if (name.includes("system") || name.includes("distributed") || name.includes("cloud") || name.includes("devops") || name.includes("scale")) {
        cols.specialized.push(s);
      } else if (name.includes("algorithm") || name.includes("structure") || name.includes("pattern") || name.includes("python") || name.includes("javascript")) {
        cols.core.push(s);
      } else {
        cols.advanced.push(s);
      }
    });

    if (cols.foundation.length === 0 && skillItems.length > 0) {
      cols.foundation = skillItems.slice(0, Math.ceil(skillItems.length / 4));
      cols.core = skillItems.slice(Math.ceil(skillItems.length / 4), Math.ceil(skillItems.length / 2));
      cols.advanced = skillItems.slice(Math.ceil(skillItems.length / 2), Math.ceil(skillItems.length * 3 / 4));
      cols.specialized = skillItems.slice(Math.ceil(skillItems.length * 3 / 4));
    }
    return cols;
  }, [skillItems]);

  const projRecs = roadmapData?.projectRecommendations || [];
  const certRecs = roadmapData?.certRecommendations || [];
  const marketInsights = roadmapData?.marketInsights;
  const coach = roadmapData?.coachFeedback;
  const milestones = roadmapData?.milestones || [];

  const getUserScopedKey = (prefix: string, roadmapId?: string) => {
    try {
      const u = getAuthUser();
      const userId = u?.id || u?.email || "guest";
      return `${prefix}-${userId}-${roadmapId || "default"}`;
    } catch {
      return `${prefix}-${roadmapId || "default"}`;
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getUserScopedKey("adyapan-microtasks", roadmapRecord?.id));
      if (saved) setCheckedMicroTasks(JSON.parse(saved));
      else setCheckedMicroTasks({});
    } catch { }
  }, [roadmapRecord?.id]);

  const toggleMicroTask = (taskText: string) => {
    const next = { ...checkedMicroTasks, [taskText]: !checkedMicroTasks[taskText] };
    setCheckedMicroTasks(next);
    try {
      localStorage.setItem(getUserScopedKey("adyapan-microtasks", roadmapRecord?.id), JSON.stringify(next));
    } catch { }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(getUserScopedKey("adyapan-objectives", roadmapRecord?.id));
      if (saved) setCheckedObjectives(JSON.parse(saved));
      else setCheckedObjectives({});
    } catch { }
  }, [roadmapRecord?.id]);

  const toggleObjective = (phaseIndex: number, objText: string) => {
    const key = `${phaseIndex}-${objText}`;
    const wasChecked = !!checkedObjectives[key];
    const next = { ...checkedObjectives, [key]: !checkedObjectives[key] };
    setCheckedObjectives(next);
    try {
      localStorage.setItem(getUserScopedKey("adyapan-objectives", roadmapRecord?.id), JSON.stringify(next));
    } catch { }

    const phase = phases[phaseIndex];
    if (phase && !wasChecked) {
      const objectives = phase.objectives || [];
      const completedCount = objectives.filter(obj => next[`${phaseIndex}-${obj}`]).length;
      if (completedCount === objectives.length && objectives.length > 0) {
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      }
    }
  };

  const getPhaseCompletion = useCallback((phaseIndex: number, phase: RoadmapPhase) => {
    const objectives = phase.objectives || [];
    if (objectives.length === 0) return 0;
    const completed = objectives.filter(obj => checkedObjectives[`${phaseIndex}-${obj}`]).length;
    return Math.round((completed / objectives.length) * 100);
  }, [checkedObjectives]);

  useEffect(() => {
    if (roadmapData?.milestones) {
      setLocalMilestones(roadmapData.milestones);
    } else {
      setLocalMilestones([]);
    }
  }, [roadmapData]);

  const toggleMilestone = (idx: number) => {
    const next = [...localMilestones];
    const item = next[idx];
    if (!item) return;
    const isCompleted = item.status === "completed";
    item.status = isCompleted ? "pending" : "completed";
    setLocalMilestones(next);

    if (!isCompleted) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.65 },
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f97316"]
      });
    }
  };

  useEffect(() => { loadLatest(); loadHistory(); }, []);

  const loadLatest = async () => {
    try {
      const res = await api.get("/career/latest");
      if (res.data.success && res.data.roadmap) {
        setRoadmapRecord(res.data.roadmap);
        setRoadmapData(res.data.roadmapData);
        setTasks(res.data.tasks || []);
        setTab("overview");
      }
    } catch { }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get("/career/history");
      if (res.data.success) setHistory(res.data.roadmaps || []);
    } catch { }
  };

  const generateRoadmap = async () => {
    const role = targetRole === "Custom Goal" ? customRole : targetRole;
    if (!role) { setError("Please select or enter a target role"); return; }
    setError(""); setLoading(true); setLoadStep(0);
    const stepTimer = setInterval(() => { setLoadStep(p => Math.min(p + 1, LOADING_STEPS.length - 1)); }, 1200);
    try {
      const tl = timeline === "Custom" ? customTimeline : timeline;
      const res = await api.post("/career/generate", { targetRole: role, timeline: tl, experienceLevel });
      if (res.data.success) {
        setRoadmapRecord(res.data.roadmap);
        setRoadmapData(res.data.roadmapData);
        setTasks(res.data.roadmapData?.weeklyPlan?.tasks?.map((t: any, i: number) => ({
          id: `task-${i}`, ...t,
        })) || []);
        setTab("overview");
        loadHistory();
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to generate roadmap. Please try again.");
    } finally {
      clearInterval(stepTimer); setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const res = await api.post("/career/update-task", { taskId, status });
      if (res.data.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      }
    } catch { }
  };

  const deleteRoadmapAction = async (id: string) => {
    try { await api.delete(`/career/${id}`); loadHistory(); } catch { }
  };

  const loadFromHistory = async (id: string) => {
    try {
      const res = await api.get(`/career/${id}`);
      if (res.data.success) {
        setRoadmapRecord(res.data.roadmap);
        setRoadmapData(res.data.roadmapData);
        setTasks(res.data.tasks || []);
        setTab("overview");
      }
    } catch { }
  };

  const filteredTasks = tasks.filter(t => activeTaskFilter === "all" || t.category === activeTaskFilter || t.status === activeTaskFilter);

  if (loading) {
    return (
      <div style={{ background: c.bg, padding: "2rem", position: "relative", zIndex: 0 }}>
        <StepLoader steps={LOADING_STEPS} currentStep={loadStep} c={c} />
      </div>
    );
  }

  if (tab === "setup") {
    return (
      <div style={{ background: c.bg, padding: "1.5rem", position: "relative", zIndex: 0 }}>
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.amBg }}>
              <Compass size={20} style={{ color: c.am }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.am }}>CAREER NAVIGATION ENGINE</p>
              <h1 className="text-xl font-extrabold" style={{ color: c.tx }}>AI Career Roadmap</h1>
            </div>
          </div>
          <p className="text-xs mb-8" style={{ color: c.txM }}>
            Get a personalized career strategy built from your learning progress, coding performance, resume quality, and target role.
          </p>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-xs font-semibold"
              style={{ background: c.rdBg, color: c.rd, border: `1px solid ${c.rd}30` }}>
              <AlertTriangle size={14} /> {error}
            </motion.div>
          )}

          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: c.txM }}>Target Role</label>
              <div className="relative">
                <button onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-semibold"
                  style={{ background: c.sf, border: `1px solid ${c.bd}`, color: targetRole ? c.tx : c.txM }}>
                  {targetRole || "Select your target role..."} <ChevronDown size={14} style={{ color: c.txM }} />
                </button>
                {showRoleDropdown && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 max-h-64 overflow-y-auto"
                    style={{ background: c.d ? "#111827" : "#fff", border: `1px solid ${c.bd}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                    {cfg.careerTargetRoles.map(role => (
                      <button key={role} onClick={() => { setTargetRole(role); setShowRoleDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors"
                        style={{ color: targetRole === role ? c.am : c.tx2, background: targetRole === role ? c.amBg : "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = c.sfH)}
                        onMouseLeave={e => (e.currentTarget.style.background = targetRole === role ? c.amBg : "transparent")}>
                        {role}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
              {targetRole === "Custom Goal" && (
                <input value={customRole} onChange={e => setCustomRole(e.target.value)} placeholder="Enter your custom career goal..."
                  className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-medium outline-none"
                  style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx }} />
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: c.txM }}>Target Experience Level</label>
              <div className="relative">
                <button onClick={() => setShowExpDropdown(!showExpDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left text-sm font-semibold"
                  style={{ background: c.sf, border: `1px solid ${c.bd}`, color: experienceLevel ? c.tx : c.txM }}>
                  {experienceLevel || "Select experience level..."} <ChevronDown size={14} style={{ color: c.txM }} />
                </button>
                {showExpDropdown && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 right-0 mt-1 rounded-xl z-50 max-h-64 overflow-y-auto"
                    style={{ background: c.d ? "#111827" : "#fff", border: `1px solid ${c.bd}`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
                    {["Intern", "Entry-level", "Junior", "Mid-level", "Senior", "Lead"].map(level => (
                      <button key={level} onClick={() => { setExperienceLevel(level); setShowExpDropdown(false); }}
                        className="w-full text-left px-4 py-2.5 text-xs font-medium transition-colors"
                        style={{ color: experienceLevel === level ? c.am : c.tx2, background: experienceLevel === level ? c.amBg : "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = c.sfH)}
                        onMouseLeave={e => (e.currentTarget.style.background = experienceLevel === level ? c.amBg : "transparent")}>
                        {level}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: c.txM }}>Timeline</label>
              <div className="flex flex-wrap gap-2">
                {cfg.careerTimelines.map(t => (
                  <button key={t} onClick={() => setTimeline(t)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: timeline === t ? c.amBg : c.sf,
                      border: `1px solid ${timeline === t ? `${c.am}50` : c.bd}`,
                      color: timeline === t ? c.am : c.tx2,
                    }}>
                    {t}
                  </button>
                ))}
              </div>
              {timeline === "Custom" && (
                <input value={customTimeline} onChange={e => setCustomTimeline(e.target.value)} placeholder="Enter custom timeline (e.g., 45 Days, 8 Weeks)..."
                  className="w-full mt-2 px-4 py-3 rounded-xl text-sm font-medium outline-none"
                  style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx }} />
              )}
            </div>

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              onClick={generateRoadmap} disabled={!targetRole || (targetRole === "Custom Goal" && !customRole) || (timeline === "Custom" && !customTimeline)}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: targetRole ? `linear-gradient(135deg, ${c.am}, #f97316)` : c.dv,
                color: targetRole ? "#fff" : c.txM,
                cursor: targetRole ? "pointer" : "not-allowed",
                boxShadow: targetRole ? `0 4px 20px ${c.am}40` : "none",
              }}>
              <Sparkles size={16} /> Generate AI Career Roadmap
            </motion.button>
          </div>

          {history.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.txM }}>Previous Roadmaps</h3>
              <div className="space-y-2">
                {history.map(h => (
                  <motion.button key={h.id} whileHover={{ scale: 1.01 }} onClick={() => loadFromHistory(h.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left"
                    style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                    <div>
                      <p className="text-xs font-bold" style={{ color: c.tx }}>{h.targetRole}</p>
                      <p className="text-[10px]" style={{ color: c.txM }}>{h.timeline} &middot; Score: {h.readinessScore}% &middot; {new Date(h.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amBg, color: c.am }}>v{h.versionNumber}</span>
                      <button onClick={e => { e.stopPropagation(); deleteRoadmapAction(h.id); }}
                        className="p-1 rounded-lg hover:bg-red-500/10" style={{ color: c.rd }}><Trash2 size={12} /></button>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }



  const stats = (roadmapData?.roadmap as any)?.platformStats || {
    coding: { dsaSolved: 0, dsaAccuracy: 0, totalSubmissions: 0, weakTopics: [] },
    learning: { conceptsLearned: 0, learningScore: 0, studySessions: 0, quizAttempts: 0 },
    ats: { score: scores.resume || 0, reportsCount: 0 },
    linkedin: { score: 0, headline: "" },
    resume: { hasResume: false }
  };

  const trendData = (() => {
    if (history.length > 1) {
      return {
        labels: [...history].reverse().map(h => new Date(h.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
        data: [...history].reverse().map(h => h.readinessScore),
      };
    }
    return {
      labels: [],
      data: [],
    };
  })();

  const weeklyCompletionData = (() => {
    const completed = tasks.filter(t => t.status === "completed").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const skipped = tasks.filter(t => t.status === "skipped").length;
    const notStarted = tasks.filter(t => t.status === "not_started" || !t.status).length;

    if (tasks.length === 0) {
      return {
        labels: ["Completed", "In Progress", "Not Started", "Skipped"],
        data: [0, 0, 0, 0],
      };
    }
    return {
      labels: ["Completed", "In Progress", "Not Started", "Skipped"],
      data: [completed, inProgress, notStarted, skipped],
    };
  })();

  const learningVsCodingData = {
    labels: ["DSA Solved", "Submissions", "Study Sessions", "Concepts Learned", "Quizzes Done"],
    data: [
      stats.coding?.dsaSolved || 0,
      stats.coding?.totalSubmissions || 0,
      stats.learning?.studySessions || 0,
      stats.learning?.conceptsLearned || 0,
      stats.learning?.quizAttempts || 0,
    ]
  };

  const tabItems = [
    { id: "overview" as const, label: "Overview", icon: <LayoutDashboard size={14} /> },
    { id: "roadmap" as const, label: "Roadmap", icon: <Route size={14} /> },
    { id: "weekly" as const, label: "Weekly Plan", icon: <Calendar size={14} /> },
    { id: "skills" as const, label: "Skills", icon: <Code2 size={14} /> },
    { id: "gaps" as const, label: "Gap Analysis", icon: <Target size={14} /> },
    { id: "projects" as const, label: "Projects", icon: <Rocket size={14} /> },
    { id: "insights" as const, label: "Market", icon: <Globe size={14} /> },
    { id: "coach" as const, label: "AI Coach", icon: <Brain size={14} /> },
    { id: "milestones" as const, label: "Milestones", icon: <Flag size={14} /> },
    { id: "history" as const, label: "History", icon: <History size={14} /> },
  ];

  return (
    <div style={{ background: c.bg, position: "relative", zIndex: 0 }}>
      {/* Header */}
      <div className="px-4 md:px-6 pt-5 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        style={{ borderBottom: `1px solid ${c.bd}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.amBg }}>
            <Compass size={18} style={{ color: c.am }} />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: c.am }}>CAREER ROADMAP</p>
            <h2 className="text-sm font-extrabold" style={{ color: c.tx }}>{roadmapRecord?.targetRole || targetRole}</h2>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amBg, color: c.am }}>
            {roadmapRecord?.timeline || timeline}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setTab("setup"); setRoadmapData(null); setRoadmapRecord(null); setTasks([]); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold"
            style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx2 }}>
            <RotateCcw size={12} /> New Roadmap
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 py-2 flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${c.bd}` }}>
        {tabItems.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all"
            style={{
              background: tab === t.id ? c.amBg : "transparent",
              color: tab === t.id ? c.am : c.txM,
              border: `1px solid ${tab === t.id ? `${c.am}30` : "transparent"}`,
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6">
        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div key="overview" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-6">
              {/* Overall Readiness */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {([
                  { label: "Overall", score: scores.overall, color: c.am },
                  { label: "Technical", score: scores.technical, color: c.bl },
                  { label: "Resume", score: scores.resume, color: c.gn },
                  { label: "Interview", score: scores.interview, color: c.pp },
                  { label: "Placement", score: scores.placement, color: c.cy },
                  { label: "Recruiter", score: scores.recruiter, color: "#f97316" },
                ]).map((item, i) => (
                  <motion.div key={item.label} variants={scaleIn} custom={i}
                    className="flex flex-col items-center p-4 rounded-2xl"
                    style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <ScoreRing score={item.score} size={90} stroke={7} color={item.color} label={item.label} c={c} />
                  </motion.div>
                ))}
              </div>

              {/* Unified Platform Activity Metrics Summary */}
              <motion.div variants={fadeUp} custom={5.5} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl flex items-center gap-3 animate-fade-in" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.bl}15`, color: c.bl }}><Code2 size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.txM }}>Coding Hub Activity</p>
                    <p className="text-xs font-extrabold truncate" style={{ color: c.tx }}>{stats.coding?.dsaSolved || 0} Solved <span className="text-[10px] font-medium opacity-65">({stats.coding?.totalSubmissions || 0} subs)</span></p>
                  </div>
                </div>
                <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.pp}15`, color: c.pp }}><GraduationCap size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.txM }}>Learning Hub Streak</p>
                    <p className="text-xs font-extrabold truncate" style={{ color: c.tx }}>{stats.learning?.studySessions || 0} Sessions &middot; {stats.learning?.conceptsLearned || 0} Concepts</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.gn}15`, color: c.gn }}><FileText size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.txM }}>Resume ATS Engine</p>
                    <p className="text-xs font-extrabold truncate" style={{ color: c.tx }}>{stats.ats?.score || scores.resume || 0}% Score <span className="text-[10px] font-medium opacity-65">({stats.ats?.reportsCount || 0} reports)</span></p>
                  </div>
                </div>
                <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.am}15`, color: c.am }}><Users size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.txM }}>LinkedIn Optimizer</p>
                    <p className="text-xs font-extrabold truncate" style={{ color: c.tx }}>{stats.linkedin?.score || 0}% Grade <span className="text-[9px] font-medium opacity-60">({stats.linkedin?.headline ? "Set" : "Not Set"})</span></p>
                  </div>
                </div>
              </motion.div>

              {/* Advanced Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Radar Chart: Readiness Breakdown */}
                <motion.div variants={fadeUp} custom={6} className="p-5 rounded-2xl flex flex-col justify-between"
                  style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: c.txM }}>Readiness Breakdown</h3>
                  <div className="max-w-xs mx-auto w-full flex items-center justify-center">
                    <Radar data={{
                      labels: ["Technical", "Resume", "Interview", "Placement", "Recruiter"],
                      datasets: [{
                        label: "Your Score",
                        data: [scores.technical, scores.resume, scores.interview, scores.placement, scores.recruiter],
                        backgroundColor: `${c.am}25`,
                        borderColor: c.am,
                        borderWidth: 2,
                        pointBackgroundColor: c.am,
                        pointRadius: 4,
                      }]
                    }} options={{
                      responsive: true,
                      scales: { r: { beginAtZero: true, max: 100, ticks: { display: false, stepSize: 20 }, grid: { color: c.bd }, pointLabels: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                      plugins: { legend: { display: false } },
                    }} />
                  </div>
                </motion.div>

                {/* Line Chart: Career Readiness Trend */}
                <motion.div variants={fadeUp} custom={6.2} className="p-5 rounded-2xl"
                  style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: c.txM }}>Career Readiness Trend</h3>
                  <div className="h-64 w-full">
                    <Line data={{
                      labels: trendData.labels,
                      datasets: [{
                        label: "Readiness Score",
                        data: trendData.data,
                        fill: true,
                        backgroundColor: `${c.bl}20`,
                        borderColor: c.bl,
                        tension: 0.35,
                        pointBackgroundColor: c.bl,
                        pointHoverRadius: 6,
                        borderWidth: 3,
                      }]
                    }} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { y: { min: 0, max: 100, grid: { color: c.bd }, ticks: { color: c.tx2, font: { size: 9, weight: "bold" } } }, x: { grid: { display: false }, ticks: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                      plugins: { legend: { display: false } },
                    }} />
                  </div>
                </motion.div>

                {/* Bar Chart: Learning vs Coding progress */}
                <motion.div variants={fadeUp} custom={6.4} className="p-5 rounded-2xl"
                  style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: c.txM }}>Learning vs Coding Progress</h3>
                  <div className="h-64 w-full">
                    <Bar data={{
                      labels: learningVsCodingData.labels,
                      datasets: [{
                        label: "Telemetry Count",
                        data: learningVsCodingData.data,
                        backgroundColor: [c.bl, `${c.bl}dd`, c.pp, `${c.pp}dd`, c.am],
                        borderRadius: 6,
                      }]
                    }} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { y: { min: 0, grid: { color: c.bd }, ticks: { color: c.tx2, font: { size: 9, weight: "bold" } } }, x: { grid: { display: false }, ticks: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                      plugins: { legend: { display: false } },
                    }} />
                  </div>
                </motion.div>

                {/* Doughnut Chart: Weekly completion */}
                <motion.div variants={fadeUp} custom={6.6} className="p-5 rounded-2xl flex flex-col justify-between"
                  style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: c.txM }}>Weekly Task Completion Rate</h3>
                  <div className="max-w-[190px] mx-auto w-full flex items-center justify-center">
                    <Doughnut data={{
                      labels: weeklyCompletionData.labels,
                      datasets: [{
                        data: weeklyCompletionData.data,
                        backgroundColor: [c.gn, c.am, `${c.txM}50`, c.rd],
                        borderWidth: 0,
                      }]
                    }} options={{
                      responsive: true,
                      cutout: "70%",
                      plugins: { legend: { position: "right" as const, labels: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                    }} />
                  </div>
                </motion.div>
              </div>

              {/* Coach Summary + Milestones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {coach && (
                  <motion.div variants={fadeUp} custom={7} className="p-5 rounded-2xl"
                    style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.txM }}>
                      <Brain size={14} style={{ color: c.am }} /> AI Career Coach
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase mb-1" style={{ color: c.am }}>Next Best Action</p>
                        <p className="text-xs font-medium" style={{ color: c.tx }}>{coach.nextBestAction}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase mb-1" style={{ color: c.gn }}>Focus Areas</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(coach.focusAreas || []).slice(0, 4).map((f, i) => (
                            <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amBg, color: c.am }}>{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.div variants={fadeUp} custom={8} className="p-5 rounded-2xl"
                  style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.txM }}>
                    <Flag size={14} style={{ color: c.am }} /> Milestones
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {localMilestones.slice(0, 5).map((m, i) => (
                      <button key={i} onClick={() => toggleMilestone(i)}
                        className="w-full flex items-start gap-2 p-2 rounded-lg text-left transition-colors cursor-pointer hover:bg-slate-500/5"
                        style={{ background: c.sf }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0"
                          style={{ background: m.status === "completed" ? c.gn : c.dv }}>
                          {m.status === "completed" ? <Check size={10} style={{ color: "#fff" }} /> : <Circle size={8} style={{ color: c.txM }} />}
                        </div>
                        <div>
                          <p className="text-[11px] font-bold" style={{ color: c.tx, textDecoration: m.status === "completed" ? "line-through" : "none", opacity: m.status === "completed" ? 0.6 : 1 }}>{m.title}</p>
                          <p className="text-[9px]" style={{ color: c.txM }}>{m.targetDate}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {tab === "roadmap" && (
            <motion.div key="roadmap" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: c.txM }}>
                  Career Roadmap &middot; {roadmapData?.roadmap?.totalDuration}
                </h3>
              </div>
              {phases.map((phase, i) => {
                const pct = getPhaseCompletion(i, phase);
                return (
                  <motion.div key={i} variants={fadeUp} custom={i} className="rounded-2xl overflow-hidden"
                    style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <button onClick={() => setExpandedPhase(expandedPhase === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-extrabold"
                          style={{ background: pct >= 100 ? c.gnBg : c.amBg, color: pct >= 100 ? c.gn : c.am }}>
                          {pct >= 100 ? <Check size={14} /> : i + 1}
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: c.tx }}>{phase.title}</p>
                          <p className="text-[10px]" style={{ color: c.txM }}>{phase.duration} &middot; {phase.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold" style={{ color: c.am }}>{pct}%</span>
                        <ChevronDown size={14} style={{ color: c.txM, transform: expandedPhase === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
                      </div>
                    </button>
                    <AnimatePresence>
                      {expandedPhase === i && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 space-y-3 overflow-hidden">
                          <div className="w-full h-1.5 rounded-full" style={{ background: c.dv }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c.am}, #f97316)` }} />
                          </div>
                          {phase.objectives.length > 0 && (
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.txM }}>Objectives (Click to complete)</p>
                              <div className="space-y-1">
                                {phase.objectives.map((obj, j) => {
                                  const isObjChecked = !!checkedObjectives[`${i}-${obj}`];
                                  return (
                                    <button key={j} onClick={() => toggleObjective(i, obj)}
                                      className="w-full flex items-center gap-2 text-[11px] text-left py-1 hover:bg-slate-500/5 rounded px-1 transition-all"
                                      style={{ color: isObjChecked ? c.txM : c.tx2 }}>
                                      <div className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
                                        style={{
                                          borderColor: isObjChecked ? c.gn : c.am,
                                          background: isObjChecked ? `${c.gn}20` : "transparent"
                                        }}>
                                        {isObjChecked && <Check size={10} style={{ color: c.gn }} />}
                                      </div>
                                      <span style={{ textDecoration: isObjChecked ? "line-through" : "none", opacity: isObjChecked ? 0.6 : 1 }}>
                                        {obj}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {phase.expectedOutcomes.length > 0 && (
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.txM }}>Expected Outcomes</p>
                              <div className="space-y-1">
                                {phase.expectedOutcomes.map((out, j) => (
                                  <div key={j} className="flex items-center gap-2 text-[11px]" style={{ color: c.gn }}>
                                    <CheckCircle size={10} /> {out}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {phase.dependencies && phase.dependencies.length > 0 && (
                            <div>
                              <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color: c.txM }}>Dependencies</p>
                              <div className="flex flex-wrap gap-1.5">
                                {phase.dependencies.map((dep, j) => (
                                  <span key={j} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.sf, color: c.tx2, border: `1px solid ${c.bd}` }}>
                                    Prerequisite: {dep}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {tab === "weekly" && (
            <motion.div key="weekly" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-5">
              {/* Daily Micro Tasks */}
              {roadmapData?.weeklyPlan?.dailyMicroTasks && roadmapData.weeklyPlan.dailyMicroTasks.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.am }}>
                    <Zap size={14} /> Daily Micro Tasks
                  </h3>
                  <div className="space-y-2">
                    {roadmapData.weeklyPlan.dailyMicroTasks.map((task, i) => {
                      const isChecked = !!checkedMicroTasks[task];
                      return (
                        <button key={i} onClick={() => toggleMicroTask(task)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium text-left transition-all"
                          style={{
                            background: isChecked ? `${c.gn}08` : c.sf,
                            color: isChecked ? c.txM : c.tx2,
                            border: `1px solid ${isChecked ? `${c.gn}20` : "transparent"}`,
                          }}>
                          {isChecked ? (
                            <CheckCircle size={12} style={{ color: c.gn }} />
                          ) : (
                            <CircleDot size={12} style={{ color: c.am }} />
                          )}
                          <span style={{ textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.6 : 1 }}>{task}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Task Filters */}
              <div className="flex flex-wrap gap-1.5">
                {["all", "learning", "coding", "resume", "interview", "project", "not_started", "in_progress", "completed"].map(f => (
                  <button key={f} onClick={() => setActiveTaskFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize"
                    style={{
                      background: activeTaskFilter === f ? c.amBg : c.sf,
                      border: `1px solid ${activeTaskFilter === f ? `${c.am}30` : c.bd}`,
                      color: activeTaskFilter === f ? c.am : c.txM,
                    }}>
                    {f.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Task List */}
              <div className="space-y-2">
                {filteredTasks.map((task, i) => (
                  <motion.div key={task.id || i} variants={fadeUp} custom={i}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: task.status === "completed" ? c.gnBg : task.status === "in_progress" ? c.amBg : task.status === "skipped" ? `${c.txM}20` : "transparent",
                          border: `1.5px solid ${task.status === "completed" ? c.gn : task.status === "in_progress" ? c.am : task.status === "skipped" ? c.tx2 : c.bd}`,
                          color: task.status === "completed" ? c.gn : task.status === "in_progress" ? c.am : task.status === "skipped" ? c.tx2 : c.txM,
                        }}>
                        {task.status === "completed" ? <Check size={10} /> : task.status === "in_progress" ? <Zap size={10} /> : task.status === "skipped" ? <X size={10} /> : <Circle size={8} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate" style={{
                          color: c.tx,
                          textDecoration: task.status === "completed" ? "line-through" : "none",
                          opacity: task.status === "completed" ? 0.6 : 1,
                        }}>{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                            style={{ background: c.sf, color: c.txM }}>{task.category}</span>
                          <span className="text-[9px] font-bold opacity-75" style={{ color: c.txM }}>{task.estimatedHours}h</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value)}
                        className="text-[9px] font-bold px-2 py-1 rounded-lg outline-none cursor-pointer border-0"
                        style={{
                          background: task.status === "completed" ? c.gnBg : task.status === "in_progress" ? c.amBg : task.status === "skipped" ? `${c.rdBg}` : c.sf,
                          color: task.status === "completed" ? c.gn : task.status === "in_progress" ? c.am : task.status === "skipped" ? c.rd : c.txM,
                        }}>
                        <option value="not_started" style={{ background: c.d ? "#111827" : "#fff", color: c.tx }}>Not Started</option>
                        <option value="in_progress" style={{ background: c.d ? "#111827" : "#fff", color: c.tx }}>In Progress</option>
                        <option value="completed" style={{ background: c.d ? "#111827" : "#fff", color: c.tx }}>Completed</option>
                        <option value="skipped" style={{ background: c.d ? "#111827" : "#fff", color: c.tx }}>Skipped</option>
                      </select>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: task.priority === "High" ? c.rdBg : task.priority === "Medium" ? c.amBg : c.gnBg,
                          color: task.priority === "High" ? c.rd : task.priority === "Medium" ? c.am : c.gn,
                        }}>{task.priority}</span>
                    </div>
                  </motion.div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8" style={{ color: c.txM }}>
                    <ListTodo size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">No tasks match this filter</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {tab === "skills" && (
            <motion.div key="skills" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-6">
              {/* Skill Charts Grid */}
              {skillItems.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="p-5 rounded-2xl flex flex-col justify-between" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: c.txM }}>Skill Assessment Radar</h3>
                    <div className="max-w-xs mx-auto w-full flex items-center justify-center">
                      <Radar data={{
                        labels: skillItems.slice(0, 8).map(s => s.name),
                        datasets: [
                          { label: "Current", data: skillItems.slice(0, 8).map(s => s.currentLevel), backgroundColor: `${c.bl}20`, borderColor: c.bl, borderWidth: 2, pointBackgroundColor: c.bl },
                          { label: "Target", data: skillItems.slice(0, 8).map(s => s.targetLevel), backgroundColor: `${c.am}15`, borderColor: c.am, borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: c.am },
                        ]
                      }} options={{
                        responsive: true,
                        scales: { r: { beginAtZero: true, max: 100, ticks: { display: false }, grid: { color: c.bd }, pointLabels: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                        plugins: { legend: { labels: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                      }} />
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl flex flex-col justify-between" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: c.txM }}>Skill Target Comparison</h3>
                    <div className="h-64 w-full">
                      <Bar data={{
                        labels: skillItems.slice(0, 6).map(s => s.name),
                        datasets: [
                          { label: "Current Level", data: skillItems.slice(0, 6).map(s => s.currentLevel), backgroundColor: c.bl, borderRadius: 4 },
                          { label: "Target Level", data: skillItems.slice(0, 6).map(s => s.targetLevel), backgroundColor: c.am, borderRadius: 4 },
                        ]
                      }} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { min: 0, max: 100, grid: { color: c.bd }, ticks: { color: c.tx2, font: { size: 9, weight: "bold" } } }, x: { grid: { display: false }, ticks: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                        plugins: { legend: { labels: { color: c.tx2, font: { size: 9, weight: "bold" } } } },
                      }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Dependency Flowchart */}
              {skillItems.length > 0 && (
                <div className="p-5 rounded-2xl overflow-x-auto" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: c.txM }}>
                    <GitBranch size={14} style={{ color: c.am }} /> Skill Progression flowchart
                  </h3>
                  <div className="flex justify-between items-start min-w-[750px] gap-6 relative py-4">
                    {/* Foundation Column */}
                    <div className="flex-1 flex flex-col gap-4 items-center">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest mb-2 px-2 py-0.5 rounded" style={{ background: c.sf, color: c.txM }}>Foundation</div>
                      {getSkillColumns().foundation.map((skill) => (
                        <SkillNode key={skill.name} skill={skill} c={c} />
                      ))}
                    </div>
                    <div className="flex items-center justify-center pt-16 opacity-30"><ArrowRight size={16} /></div>

                    {/* Core Column */}
                    <div className="flex-1 flex flex-col gap-4 items-center">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest mb-2 px-2 py-0.5 rounded" style={{ background: c.sf, color: c.txM }}>Core Skills</div>
                      {getSkillColumns().core.map((skill) => (
                        <SkillNode key={skill.name} skill={skill} c={c} />
                      ))}
                    </div>
                    <div className="flex items-center justify-center pt-16 opacity-30"><ArrowRight size={16} /></div>

                    {/* Advanced Column */}
                    <div className="flex-1 flex flex-col gap-4 items-center">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest mb-2 px-2 py-0.5 rounded" style={{ background: c.sf, color: c.txM }}>Advanced</div>
                      {getSkillColumns().advanced.map((skill) => (
                        <SkillNode key={skill.name} skill={skill} c={c} />
                      ))}
                    </div>
                    <div className="flex items-center justify-center pt-16 opacity-30"><ArrowRight size={16} /></div>

                    {/* Specialized Column */}
                    <div className="flex-1 flex flex-col gap-4 items-center">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest mb-2 px-2 py-0.5 rounded" style={{ background: c.sf, color: c.txM }}>Specialized</div>
                      {getSkillColumns().specialized.map((skill) => (
                        <SkillNode key={skill.name} skill={skill} c={c} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Skill Details Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {skillItems.map((skill, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i} className="p-4 rounded-2xl"
                    style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold" style={{ color: c.tx }}>{skill.name}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full capitalize" style={{
                        background: skill.status === "completed" || skill.currentLevel >= 80 ? c.gnBg : skill.status === "in_progress" ? c.amBg : c.dv,
                        color: skill.status === "completed" || skill.currentLevel >= 80 ? c.gn : skill.status === "in_progress" ? c.am : c.txM,
                      }}>{skill.status.replace("_", " ")}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-medium" style={{ color: c.txM }}>
                        <span>Current: {skill.currentLevel}%</span><span>Target: {skill.targetLevel}%</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: c.dv }}>
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${skill.currentLevel}%`, background: `linear-gradient(90deg, ${c.bl}, ${c.am})` }} />
                      </div>
                    </div>
                    {skill.dependencies.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {skill.dependencies.map((dep, j) => (
                          <span key={j} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.sf, color: c.txM }}>
                            requires: {dep}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === "gaps" && (
            <motion.div key="gaps" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-5">
              {/* Missing Skills */}
              {gapSkills.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.txM }}>
                    <Target size={14} style={{ color: c.rd }} /> Missing Technical Skills
                  </h3>
                  <div className="space-y-2">
                    {gapSkills.sort((a, b) => a.priority - b.priority).map((skill, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: c.sf }}>
                        <div>
                          <p className="text-[11px] font-bold" style={{ color: c.tx }}>{skill.skill}</p>
                          <p className="text-[10px]" style={{ color: c.txM }}>{skill.reason}</p>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{
                          background: skill.importance === "Critical" ? c.rdBg : skill.importance === "High" ? c.amBg : c.blBg,
                          color: skill.importance === "Critical" ? c.rd : skill.importance === "High" ? c.am : c.bl,
                        }}>{skill.importance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Projects */}
              {roadmapData?.gapAnalysis?.missingProjects && roadmapData.gapAnalysis.missingProjects.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.txM }}>
                    <Rocket size={14} style={{ color: c.pp }} /> Missing Projects
                  </h3>
                  <div className="space-y-2">
                    {roadmapData.gapAnalysis.missingProjects.map((p, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ background: c.sf }}>
                        <div className="flex justify-between items-center">
                          <p className="text-[11px] font-bold" style={{ color: c.tx }}>{p.project}</p>
                          <div className="flex gap-1.5">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amBg, color: c.am }}>{p.impact} Impact</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.blBg, color: c.bl }}>{p.effort} Effort</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Soft Skills */}
              {roadmapData?.gapAnalysis?.missingSoftSkills && roadmapData.gapAnalysis.missingSoftSkills.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.txM }}>
                    <Users size={14} style={{ color: c.cy }} /> Missing Soft Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {roadmapData.gapAnalysis.missingSoftSkills.map((s, i) => (
                      <span key={i} className="text-[11px] font-bold px-3 py-1.5 rounded-xl" style={{ background: c.cyBg, color: c.cy }}>
                        {s.skill} <span className="opacity-60">({s.importance})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Experience */}
              {roadmapData?.gapAnalysis?.missingExperience && roadmapData.gapAnalysis.missingExperience.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.txM }}>
                    <Briefcase size={14} style={{ color: c.am }} /> Missing Experience / Profile Gaps
                  </h3>
                  <div className="space-y-3">
                    {roadmapData.gapAnalysis.missingExperience.map((exp, i) => (
                      <div key={i} className="p-3 rounded-xl" style={{ background: c.sf }}>
                        <p className="text-[11px] font-bold" style={{ color: c.tx }}>{exp.area}</p>
                        <p className="text-[10px] mt-1" style={{ color: c.tx2 }}>{exp.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Certifications */}
              {((roadmapData?.gapAnalysis as any)?.missingCertifications || certRecs).length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.txM }}>
                    <Award size={14} style={{ color: c.bl }} /> Missing Professional Certifications
                  </h3>
                  <div className="space-y-2">
                    {((roadmapData?.gapAnalysis as any)?.missingCertifications || certRecs).map((cert: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-xl" style={{ background: c.sf }}>
                        <div>
                          <p className="text-[11px] font-bold" style={{ color: c.tx }}>{cert.cert || cert.name}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: c.txM }}>{cert.why}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.gnBg, color: c.gn }}>ROI: {cert.roi}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.blBg, color: c.bl }}>{cert.studyTime || "Self-study"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === "projects" && (
            <motion.div key="projects" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: c.txM }}>Recommended Projects</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projRecs.map((proj, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i} className="p-5 rounded-2xl"
                    style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.ppBg }}>
                        <Rocket size={16} style={{ color: c.pp }} />
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amBg, color: c.am }}>{proj.difficulty}</span>
                    </div>
                    <h4 className="text-xs font-bold mb-1" style={{ color: c.tx }}>{proj.title}</h4>
                    <p className="text-[10px] mb-3" style={{ color: c.txM }}>{proj.description}</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[9px] font-bold uppercase mb-1" style={{ color: c.txM }}>Why It Matters</p>
                        <p className="text-[10px]" style={{ color: c.tx2 }}>{proj.whyItMatters}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {proj.skillsGained.map((s, j) => (
                          <span key={j} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.blBg, color: c.bl }}>{s}</span>
                        ))}
                      </div>
                      <div className="text-[9px] font-bold space-y-1" style={{ color: c.txM }}>
                        <div><span style={{ color: c.pp }}>Interview Value:</span> {proj.interviewValue}</div>
                        <div className="flex items-center gap-4">
                          <span>Resume: {proj.resumeImpact}</span>
                          <span>Time: {proj.estimatedTime}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Certifications */}
              {certRecs.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.txM }}>Certification Recommendations</h3>
                  <div className="space-y-2">
                    {certRecs.map((cert, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: c.cb, border: `1px solid ${c.bd}` }}>
                        <div>
                          <p className="text-[11px] font-bold" style={{ color: c.tx }}>{cert.name}</p>
                          <p className="text-[10px]" style={{ color: c.txM }}>{cert.why} &middot; {cert.issuer}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.gnBg, color: c.gn }}>ROI: {cert.roi}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.blBg, color: c.bl }}>{cert.studyTime}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.sf, color: c.tx2, border: `1px solid ${c.bd}` }}>{cert.difficulty}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === "insights" && marketInsights && (
            <motion.div key="insights" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Market Demand", value: marketInsights.currentDemand, color: c.gn },
                  { label: "Salary Range", value: marketInsights.averageSalary, color: c.am },
                  { label: "Growth Outlook", value: marketInsights.growthOutlook, color: c.bl },
                  { label: "Top Companies", value: `${marketInsights.topHiringCompanies?.length || 0}+`, color: c.pp },
                ].map((item, i) => (
                  <motion.div key={i} variants={scaleIn} custom={i} className="p-4 rounded-2xl text-center"
                    style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: c.txM }}>{item.label}</p>
                    <p className="text-sm font-extrabold" style={{ color: item.color }}>{item.value}</p>
                  </motion.div>
                ))}
              </div>

              {marketInsights.topSkillCombinations?.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.txM }}>Top Skill Combinations</h3>
                  <div className="flex flex-wrap gap-2">
                    {marketInsights.topSkillCombinations.map((s, i) => (
                      <span key={i} className="text-[11px] font-bold px-3 py-1.5 rounded-xl" style={{ background: c.amBg, color: c.am }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {marketInsights.interviewTrends?.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.txM }}>Interview Trends</h3>
                  <div className="space-y-1.5">
                    {marketInsights.interviewTrends.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: c.tx2 }}>
                        <TrendingUp size={12} style={{ color: c.gn }} /> {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {marketInsights.resumeExpectations?.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.txM }}>Resume Expectations</h3>
                  <div className="space-y-1.5">
                    {marketInsights.resumeExpectations.map((exp, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: c.tx2 }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.bl }} /> {exp}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {marketInsights.portfolioExpectations?.length > 0 && (
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: c.txM }}>Portfolio Expectations</h3>
                  <div className="space-y-1.5">
                    {marketInsights.portfolioExpectations.map((exp, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]" style={{ color: c.tx2 }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: c.pp }} /> {exp}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === "coach" && coach && (
            <motion.div key="coach" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-5">
              <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.am }}>
                  <Brain size={14} /> AI Career Coach Feedback
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color: c.txM }}>Weekly Feedback</p>
                    <p className="text-xs leading-relaxed" style={{ color: c.tx }}>{coach.weeklyFeedback}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color: c.txM }}>Progress Summary</p>
                    <p className="text-xs leading-relaxed" style={{ color: c.tx }}>{coach.progressSummary}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase mb-1.5" style={{ color: c.gn }}>Motivation</p>
                    <p className="text-xs leading-relaxed italic" style={{ color: c.tx2 }}>&ldquo;{coach.motivationalGuidance}&rdquo;</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.gn }}>
                    <Target size={14} /> Focus Areas
                  </h3>
                  <div className="space-y-2">
                    {(coach.focusAreas || []).map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium" style={{ background: c.gnBg, color: c.gn }}>
                        <CheckCircle size={12} /> {f}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 rounded-2xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: c.rd }}>
                    <AlertTriangle size={14} /> Risks to Watch
                  </h3>
                  <div className="space-y-2">
                    {(coach.risks || []).map((r, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium" style={{ background: c.rdBg, color: c.rd }}>
                        <AlertTriangle size={12} /> {r}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: `linear-gradient(135deg, ${c.am}10, ${c.pp}10)`, border: `1px solid ${c.am}30` }}>
                <h3 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2" style={{ color: c.am }}>
                  <Zap size={14} /> Next Best Action
                </h3>
                <p className="text-sm font-bold" style={{ color: c.tx }}>{coach.nextBestAction}</p>
              </div>
            </motion.div>
          )}

          {tab === "milestones" && (
            <motion.div key="milestones" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-5">
              {/* Milestones Stats Dashboard Card */}
              <div className="p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in"
                style={{ background: `linear-gradient(135deg, ${c.bl}15, ${c.pp}15)`, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: c.tx }}>Milestones Progress Tracker</h3>
                  <p className="text-xs" style={{ color: c.txM }}>Complete target tasks to progress through phases and unlock rewards</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-extrabold" style={{ color: c.gn }}>
                      {localMilestones.filter(m => m.status === "completed").length} / {localMilestones.length}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.txM }}>Milestones Completed</p>
                  </div>
                  <div className="w-16 h-16 relative flex items-center justify-center">
                    <svg width="64" height="64" className="transform -rotate-90">
                      <circle cx="32" cy="32" r="26" stroke={c.dv} strokeWidth="4" fill="transparent" />
                      <circle cx="32" cy="32" r="26" stroke={c.gn} strokeWidth="4" fill="transparent"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 * (1 - (localMilestones.length > 0 ? localMilestones.filter(m => m.status === "completed").length / localMilestones.length : 0))}
                        style={{ transition: "stroke-dashoffset 1s ease-out" }} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xs font-bold" style={{ color: c.tx }}>
                      {localMilestones.length > 0 ? Math.round((localMilestones.filter(m => m.status === "completed").length / localMilestones.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Category Filters */}
                <div className="flex flex-wrap gap-1.5">
                  {["all", "learning", "coding", "resume", "linkedin", "interview", "application"].map(cat => (
                    <button key={cat} onClick={() => setMilestoneCategoryFilter(cat)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all"
                      style={{
                        background: milestoneCategoryFilter === cat ? c.blBg : c.sf,
                        border: `1px solid ${milestoneCategoryFilter === cat ? `${c.bl}30` : c.bd}`,
                        color: milestoneCategoryFilter === cat ? c.bl : c.txM,
                      }}>
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Status Filters */}
                <div className="flex gap-1.5">
                  {["all", "completed", "pending"].map(st => (
                    <button key={st} onClick={() => setMilestoneStatusFilter(st)}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all"
                      style={{
                        background: milestoneStatusFilter === st ? c.amBg : c.sf,
                        border: `1px solid ${milestoneStatusFilter === st ? `${c.am}30` : c.bd}`,
                        color: milestoneStatusFilter === st ? c.am : c.txM,
                      }}>
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Milestones List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localMilestones
                  .map((m, idx) => ({ ...m, originalIndex: idx }))
                  .filter(m => {
                    const titleLower = m.title.toLowerCase();
                    const cat = titleLower.includes("learn") || titleLower.includes("course") || titleLower.includes("study") || titleLower.includes("concept") ? "learning" :
                      titleLower.includes("code") || titleLower.includes("dsa") || titleLower.includes("leet") || titleLower.includes("solve") ? "coding" :
                        titleLower.includes("resume") || titleLower.includes("ats") ? "resume" :
                          titleLower.includes("linkedin") || titleLower.includes("profile") ? "linkedin" :
                            titleLower.includes("interview") || titleLower.includes("mock") || titleLower.includes("behavior") ? "interview" : "application";
                    const matchesCat = milestoneCategoryFilter === "all" || cat === milestoneCategoryFilter;
                    const matchesStatus = milestoneStatusFilter === "all" || m.status === milestoneStatusFilter;
                    return matchesCat && matchesStatus;
                  })
                  .map((m, i) => {
                    const titleLower = m.title.toLowerCase();
                    const cat = titleLower.includes("learn") || titleLower.includes("course") || titleLower.includes("study") || titleLower.includes("concept") ? "learning" :
                      titleLower.includes("code") || titleLower.includes("dsa") || titleLower.includes("leet") || titleLower.includes("solve") ? "coding" :
                        titleLower.includes("resume") || titleLower.includes("ats") ? "resume" :
                          titleLower.includes("linkedin") || titleLower.includes("profile") ? "linkedin" :
                            titleLower.includes("interview") || titleLower.includes("mock") || titleLower.includes("behavior") ? "interview" : "application";
                    const isCompleted = m.status === "completed";
                    const badgeStyles =
                      cat === "learning" ? { bg: c.blBg, text: c.bl } :
                        cat === "coding" ? { bg: c.ppBg, text: c.pp } :
                          cat === "resume" ? { bg: c.gnBg, text: c.gn } :
                            cat === "linkedin" ? { bg: c.amBg, text: c.am } :
                              cat === "interview" ? { bg: c.rdBg, text: c.rd } :
                                { bg: c.cyBg, text: c.cy };

                    return (
                      <motion.div key={i} variants={fadeUp} custom={i}
                        className="p-4 rounded-2xl flex items-start justify-between gap-4 transition-all"
                        style={{
                          background: c.cb,
                          border: `1px solid ${isCompleted ? `${c.gn}30` : c.bd}`,
                          boxShadow: isCompleted ? `0 0 15px ${c.gn}08` : c.cs,
                        }}>
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <button onClick={() => toggleMilestone(m.originalIndex)}
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
                            style={{
                              background: isCompleted ? c.gn : "transparent",
                              border: `2px solid ${isCompleted ? c.gn : c.bd}`,
                            }}>
                            {isCompleted && <Check size={12} style={{ color: "#fff" }} />}
                          </button>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold leading-normal truncate"
                              style={{
                                color: c.tx,
                                textDecoration: isCompleted ? "line-through" : "none",
                                opacity: isCompleted ? 0.6 : 1
                              }}>{m.title}</h4>
                            <p className="text-[10px] mt-0.5" style={{ color: c.txM }}>Target Date: {m.targetDate}</p>
                            <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full capitalize mt-2"
                              style={{ background: badgeStyles.bg, color: badgeStyles.text }}>
                              {cat}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {tab === "history" && (
            <motion.div key="history" initial="hidden" animate="visible" exit="hidden" variants={fadeUp} className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: c.txM }}>Roadmap History</h3>
              {history.length === 0 ? (
                <EmptyState illustration={<History size={48} />} title="No roadmaps yet" description="Generate your first AI career roadmap to get started." />
              ) : (
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <motion.div key={h.id} variants={fadeUp} custom={i}
                      className="flex items-center justify-between p-4 rounded-2xl"
                      style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.amBg }}>
                          <Compass size={18} style={{ color: c.am }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: c.tx }}>{h.targetRole}</p>
                          <p className="text-[10px]" style={{ color: c.txM }}>
                            {h.timeline} &middot; Score: {h.readinessScore}% &middot; {new Date(h.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amBg, color: c.am }}>v{h.versionNumber}</span>
                        <button onClick={() => loadFromHistory(h.id)}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: c.amBg, color: c.am }}>
                          View
                        </button>
                        <button onClick={() => deleteRoadmapAction(h.id)}
                          className="p-1.5 rounded-lg" style={{ color: c.rd }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
