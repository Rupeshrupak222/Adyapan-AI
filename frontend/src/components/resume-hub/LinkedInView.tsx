"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { api } from "@/services/api";
import type { ResumeHubViewType } from "@/types/resume";
import { useTheme } from "@/hooks/useTheme";
import { mkColors } from "@/utils/themeColors";
import { fadeUp, scaleIn, buttonHover } from "@/utils/animations";
import confetti from "canvas-confetti";
import { EmptyState } from "@/components/ui/PremiumComponents";
import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip as CT, Legend as CL, CategoryScale, LinearScale, BarElement, ArcElement,
} from "chart.js";
import { Radar, Bar, Doughnut } from "react-chartjs-2";
import {
  Layers, Sparkles, RefreshCw, Copy, Check, Award, Target,
  TrendingUp, Users, FileText, Briefcase, Code2, GraduationCap,
  Link2, Zap, Eye, ChevronDown, ChevronRight, Download, History,
  Lightbulb, Star, Send, ArrowRight, Search, BarChart3,
  GitCompare, RotateCcw, Trash2, BookOpen, MessageCircle,
  Calendar, Circle, CheckCircle, AlertTriangle, X, Save,
  Layout, PenTool, Rocket, Brain, Globe, Shield,
  ChevronLeft, ExternalLink, Hash, Megaphone,
} from "lucide-react";

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler, CT, CL,
  CategoryScale, LinearScale, BarElement, ArcElement
);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LinkedInProfile {
  headline: string;
  aboutSection: string;
  headlineVariants: string[];
  aboutVariants: { label: string; content: string }[];
  experience: { company: string; role: string; description: string; achievements: string[] }[];
  projects: { name: string; description: string; technologies: string[]; impact: string; media: string }[];
  skills: { name: string; endorsed: boolean; priority: number }[];
  skillRecommendations: string[];
  featured: { type: string; title: string; description: string; url: string }[];
  networking: {
    connectionRequests: string[];
    thankYouMessages: string[];
    recruiterOutreach: string[];
    referralRequests: string[];
  };
  contentIdeas: { title: string; hook: string; body: string; cta: string; hashtags: string[] }[];
  completeness: {
    score: number;
    checklist: { item: string; present: boolean; suggestion: string }[];
  };
  scores: {
    headline: number; about: number; experience: number; projects: number;
    skills: number; keyword: number; visibility: number; overall: number;
  };
  recommendations: { priority: string; title: string; reason: string; impact: string; difficulty: string; improvement: string }[];
}

interface LinkedInReportRecord {
  id: string;
  score: number;
  headline: string;
  aboutSection: string;
  skills: any;
  recommendations: any;
  experienceJson: any;
  projectsJson: any;
  featuredJson: any;
  networkingJson: any;
  contentIdeasJson: any;
  headlineScore: number | null;
  aboutScore: number | null;
  experienceScore: number | null;
  projectsScore: number | null;
  skillsScore: number | null;
  keywordScore: number | null;
  visibilityScore: number | null;
  completenessScore: number | null;
  completenessJson: any;
  targetRole: string | null;
  versionNumber: number;
  versionLabel: string | null;
  createdAt: string;
}

interface Props { setView: (v: ResumeHubViewType) => void; }

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function ScoreRing({ score, size = 100, stroke = 8, color, label, c }: {
  score: number; size?: number; stroke?: number; color: string; label: string; c: ReturnType<typeof mkC>;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={c.bd} strokeWidth={stroke} fill="transparent" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="transparent"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold" style={{ color: c.tx }}>{score}</span>
        <span className="text-[8px] uppercase tracking-wider font-bold" style={{ color: c.txM }}>{label}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children, c, delay = 0, accent }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; c: ReturnType<typeof mkC>; delay?: number; accent?: string;
}) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={delay}
      className="rounded-2xl overflow-hidden" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${c.dv}` }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent || c.amBg, color: accent ? "#fff" : c.am }}>
          {icon}
        </div>
        <h3 className="text-xs font-extrabold" style={{ color: c.tx, fontFamily: "'Outfit', sans-serif" }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

function CopyButton({ text, k, copiedKey, setCopiedKey, c }: {
  text: string; k: string; copiedKey: string | null; setCopiedKey: (v: string | null) => void; c: ReturnType<typeof mkC>;
}) {
  return (
    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
      onClick={() => { navigator.clipboard.writeText(text); setCopiedKey(k); setTimeout(() => setCopiedKey(null), 2000); }}
      className="p-1.5 rounded-lg transition-all"
      style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.txM }}>
      {copiedKey === k ? <Check size={12} style={{ color: c.gn }} /> : <Copy size={12} />}
    </motion.button>
  );
}

function TabBar({ tabs, active, onChange, c }: { tabs: string[]; active: string; onChange: (t: string) => void; c: ReturnType<typeof mkC> }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: c.sf }}>
      {tabs.map(t => (
        <motion.button key={t} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => onChange(t)}
          className="px-3 py-1.5 text-[10px] font-bold rounded-lg whitespace-nowrap transition-all"
          style={{
            background: active === t ? c.am : "transparent",
            color: active === t ? "#000" : c.tx2,
          }}>
          {t}
        </motion.button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING STEPS
// ═══════════════════════════════════════════════════════════════════════════════

const LOADING_STEPS = [
  "Reading Resume",
  "Analyzing ATS Report",
  "Understanding Career Profile",
  "Optimizing LinkedIn Profile",
  "Improving Keywords",
  "Calculating Visibility Score",
  "Preparing Suggestions",
  "Ready",
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LinkedInView({ setView }: Props) {
  const theme = useTheme();
  const c = mkC(theme);

  // ── State ──────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [history, setHistory] = useState<LinkedInReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [resumes, setResumes] = useState<any[]>([]);

  // Active tab for section navigation
  const [activeTab, setActiveTab] = useState("Overview");
  const tabs = ["Overview", "Headline", "About", "Experience", "Projects", "Skills", "Visibility", "Networking", "Content", "Settings"];

  // Individual section states
  const [headlineVariants, setHeadlineVariants] = useState<string[]>([]);
  const [aboutVariants, setAboutVariants] = useState<{ label: string; content: string }[]>([]);
  const [selectedHeadline, setSelectedHeadline] = useState("");
  const [selectedAbout, setSelectedAbout] = useState("");
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded items
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [expandedExp, setExpandedExp] = useState<number | null>(null);
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [expandedContent, setExpandedContent] = useState<number | null>(null);
  const [networkingTab, setNetworkingTab] = useState("Connection Requests");

  // ── Refs ───────────────────────────────────────────────────────────────────
  const loadStepRef = useRef<NodeJS.Timeout | null>(null);

  const loadHistory = async () => {
    try {
      const res = await api.get("/linkedin/history");
      setHistory(res.data.reports || []);
    } catch {}
  };

  // ── Load resumes & history ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.allSettled([
      api.get("/resume/list"),
      api.get("/resume-upload/list"),
    ]).then(([builderRes, uploadRes]) => {
      const builderResumes = builderRes.status === "fulfilled" ? (builderRes.value.data.resumes || []) : [];
      const uploadedResumes = uploadRes.status === "fulfilled" && uploadRes.value.data.success
        ? (uploadRes.value.data.resumes || []).map((u: any) => ({
            id: u.id, title: u.fileName, template: "Uploaded", updatedAt: u.createdAt, isUploaded: true,
          }))
        : [];
      const allIds = new Set(builderResumes.map((r: any) => r.id));
      setResumes([...builderResumes, ...uploadedResumes.filter((u: any) => !allIds.has(u.id))]);
    }).catch(() => {});
    loadHistory();
  }, []);

  // ── Generate full profile ──────────────────────────────────────────────────
  const handleGenerate = async () => {
    setLoading(true);
    setLoadStep(0);
    setError(null);
    let step = 0;
    loadStepRef.current = setInterval(() => {
      step++;
      if (step < LOADING_STEPS.length) setLoadStep(step);
    }, 2500);

    try {
      const res = await api.post("/linkedin/generate", {
        resumeId: selectedResumeId || undefined,
        targetRole,
      });
      if (res.data.success && res.data.profile) {
        setProfile(res.data.profile);
        setSelectedHeadline(res.data.profile.headline);
        setSelectedAbout(res.data.profile.aboutSection);
        setHeadlineVariants(res.data.profile.headlineVariants || []);
        setAboutVariants(res.data.profile.aboutVariants || []);
        loadHistory();
      } else {
        setError(res.data.error || "Failed to generate profile. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to generate LinkedIn profile. Please check your resume and try again.";
      console.error("[LinkedIn] Generation error:", msg);
      setError(msg);
    } finally {
      clearInterval(loadStepRef.current);
      setLoadStep(LOADING_STEPS.length - 1);
      setLoading(false);
    }
  };

  // ── Generate headlines ─────────────────────────────────────────────────────
  const handleGenerateHeadlines = async () => {
    setSectionLoading(true);
    try {
      const res = await api.post("/linkedin/generate-headline", {
        targetRole,
        skills: profile?.skills?.map(s => s.name).join(", ") || "",
        experience: profile?.experience?.map(e => e.role).join(", ") || "",
        count: 5,
      });
      if (res.data.success) setHeadlineVariants(res.data.headlines);
    } catch {} finally { setSectionLoading(false); }
  };

  // ── Generate about variants ────────────────────────────────────────────────
  const handleGenerateAbout = async (variant: string) => {
    setSectionLoading(true);
    try {
      const res = await api.post("/linkedin/generate-about", {
        targetRole,
        resumeText: profile?.aboutSection || "",
        variant,
      });
      if (res.data.success && res.data.about) {
        setAboutVariants(prev => {
          const existing = prev.filter(v => v.label !== variant);
          return [...existing, { label: variant, content: res.data.about }];
        });
      }
    } catch {} finally { setSectionLoading(false); }
  };

  // ── Load from history ──────────────────────────────────────────────────────
  const loadFromHistory = (report: LinkedInReportRecord) => {
    const parsed: LinkedInProfile = {
      headline: report.headline,
      aboutSection: report.aboutSection,
      headlineVariants: [],
      aboutVariants: [],
      experience: safeParse(report.experienceJson),
      projects: safeParse(report.projectsJson),
      skills: safeParse(report.skills),
      skillRecommendations: [],
      featured: safeParse(report.featuredJson),
      networking: safeParse(report.networkingJson) || { connectionRequests: [], thankYouMessages: [], recruiterOutreach: [], referralRequests: [] },
      contentIdeas: safeParse(report.contentIdeasJson),
      completeness: safeParse(report.completenessJson) || { score: report.completenessScore || 0, checklist: [] },
      scores: {
        headline: report.headlineScore || 0,
        about: report.aboutScore || 0,
        experience: report.experienceScore || 0,
        projects: report.projectsScore || 0,
        skills: report.skillsScore || 0,
        keyword: report.keywordScore || 0,
        visibility: report.visibilityScore || 0,
        overall: report.score,
      },
      recommendations: safeParse(report.recommendations),
    };
    setProfile(parsed);
    setSelectedHeadline(parsed.headline);
    setSelectedAbout(parsed.aboutSection);
    setActiveTab("Overview");
  };

  // ── Delete from history ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/linkedin/${id}`);
      setHistory(prev => prev.filter(h => h.id !== id));
      if (profile) setProfile(null);
    } catch {}
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const safeParse = (val: any): any => {
    if (!val) return typeof val === "object" ? val : [];
    if (typeof val === "string") { try { return JSON.parse(val); } catch { return val; } }
    return val;
  };

  const sc = (s: number) => s >= 80 ? c.gn : s >= 60 ? c.am : c.rd;
  const scBg = (s: number) => s >= 80 ? c.gnBg : s >= 60 ? c.amBg : c.rdBg;
  const scLb = (s: number) => s >= 90 ? "Excellent" : s >= 80 ? "Very Good" : s >= 65 ? "Good" : s >= 50 ? "Fair" : "Needs Work";

  const copyAll = () => {
    if (!profile) return;
    const text = [
      `HEADLINE:\n${profile.headline}`,
      `\nABOUT:\n${profile.aboutSection}`,
      `\nEXPERIENCE:\n${profile.experience.map(e => `${e.role} at ${e.company}\n${e.description}\n${e.achievements.map(a => `• ${a}`).join("\n")}`).join("\n\n")}`,
      `\nSKILLS:\n${profile.skills.map(s => s.name).join(", ")}`,
    ].join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedKey("all");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ── Chart data ─────────────────────────────────────────────────────────────
  const radarData = profile ? {
    labels: ["Headline", "About", "Experience", "Projects", "Skills", "Keywords", "Visibility"],
    datasets: [{
      data: [
        profile.scores.headline, profile.scores.about, profile.scores.experience,
        profile.scores.projects, profile.scores.skills, profile.scores.keyword, profile.scores.visibility,
      ],
      backgroundColor: c.d ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.12)",
      borderColor: c.am,
      borderWidth: 2,
      pointBackgroundColor: c.am,
      pointRadius: 3,
    }],
  } : null;

  const barData = profile ? {
    labels: ["Headline", "About", "Experience", "Projects", "Skills", "Keyword", "Visibility"],
    datasets: [{
      data: [
        profile.scores.headline, profile.scores.about, profile.scores.experience,
        profile.scores.projects, profile.scores.skills, profile.scores.keyword, profile.scores.visibility,
      ],
      backgroundColor: [
        "rgba(245,158,11,0.7)", "rgba(59,130,246,0.7)", "rgba(16,185,129,0.7)",
        "rgba(139,92,246,0.7)", "rgba(6,182,212,0.7)", "rgba(236,72,153,0.7)", "rgba(249,115,22,0.7)",
      ],
      borderRadius: 6,
      barThickness: 20,
    }],
  } : null;

  const completenessData = profile ? {
    labels: ["Complete", "Remaining"],
    datasets: [{
      data: [profile.completeness.score, 100 - profile.completeness.score],
      backgroundColor: [c.gn, c.d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"],
      borderWidth: 0,
    }],
  } : null;

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const radarOpts = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: { display: false, stepSize: 20 },
        grid: { color: c.d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        angleLines: { color: c.d ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
        pointLabels: { color: c.tx2, font: { size: 9, weight: "bold" as const } },
      },
    },
    plugins: { legend: { display: false } },
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="flex flex-col antialiased min-h-[calc(100vh-120px)]" style={{ color: c.tx }}>

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.dv}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b, #0077b5)" }}>
            <Linkedin size={18} style={{ color: "#fff" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              className="text-base font-extrabold leading-tight"
              style={{ color: c.tx, fontFamily: "'Outfit', sans-serif" }}>
              LinkedIn Career Optimizer
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="text-xs leading-tight" style={{ color: c.txM }}>
              Transform your resume into a recruiter-ready LinkedIn profile
            </motion.p>
          </div>
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={copyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
              style={{ background: c.gnBg, color: c.gn, border: `1px solid ${c.gn}30` }}>
              {copiedKey === "all" ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy All</>}
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setProfile(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
              style={{ background: c.sf, color: c.tx2, border: `1px solid ${c.bd}` }}>
              <RefreshCw size={11} /> New
            </motion.button>
          </div>
        )}
      </div>

      {/* ── LOADING STATE ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-sm">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #f59e0b, #0077b5)" }}>
                <Brain size={28} style={{ color: "#fff" }} />
              </motion.div>
              <div>
                <h3 className="text-sm font-extrabold mb-1" style={{ color: c.tx, fontFamily: "'Outfit', sans-serif" }}>
                  Optimizing Your LinkedIn Profile
                </h3>
                <p className="text-[10px]" style={{ color: c.txM }}>AI is analyzing and generating your professional brand</p>
              </div>
              <div className="space-y-2">
                {LOADING_STEPS.map((step, i) => (
                  <motion.div key={step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-2 text-[10px]"
                    style={{ color: i <= loadStep ? c.am : c.txM }}>
                    {i < loadStep ? <CheckCircle size={12} style={{ color: c.gn }} />
                      : i === loadStep ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                          <Circle size={12} style={{ color: c.am }} />
                        </motion.div>
                      : <Circle size={12} style={{ opacity: 0.3 }} />}
                    <span className={i <= loadStep ? "font-semibold" : ""}>{step}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── EMPTY STATE ──────────────────────────────────────────────────── */}
        {!loading && !profile && (
          <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center gap-6 py-8">


            {/* Error Banner */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="w-full max-w-md p-3 rounded-xl flex items-center justify-between gap-2"
                  style={{ background: c.rdBg, border: `1px solid ${c.rd}30` }}>
                  <div className="flex items-center gap-2 text-[10px]" style={{ color: c.rd }}>
                    <AlertTriangle size={14} />
                    <span className="font-semibold">{error}</span>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} onClick={() => setError(null)} style={{ color: c.rd }}>
                    <X size={12} />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Config Card */}
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="w-full max-w-md p-5 rounded-2xl space-y-3"
              style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold" style={{ color: c.tx2 }}>Target Role</label>
                <input type="text" value={targetRole} onChange={e => setTargetRole(e.target.value)}
                  placeholder="e.g. Software Engineer, Data Scientist"
                  className="w-full rounded-xl px-3 py-2 text-xs transition-all focus:outline-none"
                  style={{ background: c.inputBg, border: `1px solid ${c.bd}`, color: c.tx }} />
              </div>
              {resumes.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold" style={{ color: c.tx2 }}>Select Resume</label>
                  <select value={selectedResumeId} onChange={e => setSelectedResumeId(e.target.value)}
                    className="w-full rounded-xl px-3 py-2 text-xs transition-all focus:outline-none"
                    style={{ background: c.inputBg, border: `1px solid ${c.bd}`, color: c.tx }}>
                    <option value="">Auto-detect active resume</option>
                    {resumes.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.title} ({r.template})</option>
                    ))}
                  </select>
                </div>
              )}
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGenerate}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #f59e0b, #0077b5)", color: "#fff" }}>
                <Sparkles size={14} /> Generate Full LinkedIn Profile
              </motion.button>
            </motion.div>

            {/* Quick stats if history */}
            {history.length > 0 && (
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}
                className="w-full max-w-md p-4 rounded-2xl"
                style={{ background: c.cb, border: `1px solid ${c.bd}` }}>
                <h3 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: c.tx }}>
                  <History size={12} style={{ color: c.am }} /> Previous Optimizations
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {history.slice(0, 5).map((h, i) => (
                    <motion.div key={h.id} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                      whileHover={{ y: -1, scale: 1.01 }}
                      onClick={() => loadFromHistory(h)}
                      className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all"
                      style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-[11px] font-bold truncate" style={{ color: c.tx }}>{h.headline || "Untitled"}</div>
                        <div className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: c.txM }}>
                          <Calendar size={9} /> {new Date(h.createdAt).toLocaleDateString()}
                          {h.targetRole && <><span className="mx-0.5">·</span>{h.targetRole}</>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-[10px]"
                          style={{ background: scBg(h.score), color: sc(h.score) }}>{h.score}</div>
                        <motion.button whileHover={{ scale: 1.2 }} onClick={(e) => { e.stopPropagation(); handleDelete(h.id); }}
                          className="p-1 rounded" style={{ color: c.txM }}>
                          <Trash2 size={10} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── RESULTS ──────────────────────────────────────────────────────── */}
        {!loading && profile && (
          <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col min-h-0">

            {/* Tab Navigation */}
            <div className="flex-shrink-0 mb-4">
              <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} c={c} />
            </div>

            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              <AnimatePresence mode="wait">
                {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
                {activeTab === "Overview" && (
                  <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* Left: Score + Charts */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Overall Score Card */}
                      <SectionCard title="LinkedIn Profile Score" icon={<Award size={14} />} c={c} delay={0}>
                        <div className="flex items-center gap-5">
                          <ScoreRing score={profile.scores.overall} size={110} stroke={10} color={sc(profile.scores.overall)} label="Overall" c={c} />
                          <div className="flex-1 space-y-2">
                            <div className="text-xs font-bold" style={{ color: c.tx }}>{scLb(profile.scores.overall)}</div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { l: "Headline", s: profile.scores.headline },
                                { l: "About", s: profile.scores.about },
                                { l: "Experience", s: profile.scores.experience },
                                { l: "Projects", s: profile.scores.projects },
                              ].map(({ l, s }) => (
                                <div key={l} className="flex items-center justify-between">
                                  <span className="text-[9px]" style={{ color: c.txM }}>{l}</span>
                                  <span className="text-[10px] font-bold" style={{ color: sc(s) }}>{s}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </SectionCard>

                      {/* Radar Chart */}
                      {radarData && (
                        <SectionCard title="Section Analysis" icon={<BarChart3 size={14} />} c={c} delay={1}>
                          <div className="h-52"><Radar data={radarData} options={radarOpts} /></div>
                        </SectionCard>
                      )}

                      {/* Completeness */}
                      {completenessData && (
                        <SectionCard title="Profile Completeness" icon={<Target size={14} />} c={c} delay={2}>
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-24"><Doughnut data={completenessData} options={{ ...chartOpts, cutout: "70%" }} /></div>
                            <div className="flex-1 space-y-1.5">
                              <div className="text-xl font-extrabold" style={{ color: c.gn }}>{profile.completeness.score}%</div>
                              <div className="text-[9px]" style={{ color: c.txM }}>Profile Complete</div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {(profile.completeness.checklist || []).slice(0, 6).map((ch, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[9px]" style={{ color: ch.present ? c.gn : c.rd }}>
                                    {ch.present ? <CheckCircle size={9} /> : <AlertTriangle size={9} />}
                                    <span>{ch.item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </SectionCard>
                      )}
                    </div>

                    {/* Right: Recommendations + Quick Actions */}
                    <div className="lg:col-span-7 space-y-4">
                      {/* Bar Chart */}
                      {barData && (
                        <SectionCard title="Score Breakdown" icon={<BarChart3 size={14} />} c={c} delay={0}>
                          <div className="h-48"><Bar data={barData} options={chartOpts} /></div>
                        </SectionCard>
                      )}

                      {/* Recommendations */}
                      <SectionCard title="Optimization Recommendations" icon={<Lightbulb size={14} />} c={c} delay={1}>
                        <div className="space-y-2">
                          {(profile.recommendations || []).map((rec, i) => (
                            <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                              className="p-3 rounded-xl transition-all cursor-pointer"
                              style={{ background: c.sf, border: `1px solid ${c.bd}` }}
                              onClick={() => setExpandedRec(expandedRec === i ? null : i)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 text-[8px] font-bold rounded"
                                    style={{
                                      background: rec.priority === "high" ? c.rdBg : rec.priority === "medium" ? c.amBg : c.gnBg,
                                      color: rec.priority === "high" ? c.rd : rec.priority === "medium" ? c.am : c.gn,
                                    }}>{rec.priority?.toUpperCase()}</span>
                                  <span className="text-[11px] font-bold" style={{ color: c.tx }}>{rec.title}</span>
                                </div>
                                <motion.div animate={{ rotate: expandedRec === i ? 90 : 0 }}>
                                  <ChevronRight size={12} style={{ color: c.txM }} />
                                </motion.div>
                              </div>
                              <AnimatePresence>
                                {expandedRec === i && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }} className="mt-2 pt-2 space-y-1.5 text-[10px]"
                                    style={{ borderTop: `1px solid ${c.dv}`, color: c.tx2 }}>
                                    <p><strong>Why:</strong> {rec.reason}</p>
                                    <p><strong>Impact:</strong> {rec.impact}</p>
                                    <p><strong>Difficulty:</strong> {rec.difficulty}</p>
                                    <p><strong>Improvement:</strong> {rec.improvement}</p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ))}
                          {(!profile.recommendations || profile.recommendations.length === 0) && (
                            <div className="text-center py-4 text-[10px]" style={{ color: c.txM }}>No recommendations yet</div>
                          )}
                        </div>
                      </SectionCard>

                      {/* Quick Actions */}
                      <SectionCard title="Quick Actions" icon={<Zap size={14} />} c={c} delay={2}>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { label: "Headline", icon: <PenTool size={12} />, tab: "Headline" },
                            { label: "About", icon: <FileText size={12} />, tab: "About" },
                            { label: "Experience", icon: <Briefcase size={12} />, tab: "Experience" },
                            { label: "Projects", icon: <Code2 size={12} />, tab: "Projects" },
                            { label: "Skills", icon: <Star size={12} />, tab: "Skills" },
                            { label: "Networking", icon: <Users size={12} />, tab: "Networking" },
                            { label: "Content Ideas", icon: <Megaphone size={12} />, tab: "Content" },
                            { label: "Visibility", icon: <Eye size={12} />, tab: "Visibility" },
                          ].map(({ label, icon, tab }) => (
                            <motion.button key={label} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                              onClick={() => setActiveTab(tab)}
                              className="flex items-center gap-1.5 p-2.5 rounded-xl text-[10px] font-bold transition-all"
                              style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx2 }}>
                              <span style={{ color: c.am }}>{icon}</span> {label}
                            </motion.button>
                          ))}
                        </div>
                      </SectionCard>
                    </div>
                  </motion.div>
                )}

                {/* ── HEADLINE TAB ─────────────────────────────────────── */}
                {activeTab === "Headline" && (
                  <motion.div key="headline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <SectionCard title="Optimized Headline" icon={<PenTool size={14} />} c={c} delay={0}>
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl text-xs leading-relaxed"
                          style={{ background: c.inputBg, border: `1px solid ${c.bd}`, color: c.tx }}>
                          {selectedHeadline || profile.headline}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold" style={{ color: c.txM }}>
                            {(selectedHeadline || profile.headline).length}/220 characters
                          </span>
                          <CopyButton text={selectedHeadline || profile.headline} k="hl" copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title="Headline Variants" icon={<Sparkles size={14} />} c={c} delay={1}>
                      <div className="space-y-2">
                        {headlineVariants.map((h, i) => (
                          <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            whileHover={{ scale: 1.01 }}
                            onClick={() => setSelectedHeadline(h)}
                            className="p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-2"
                            style={{
                              background: selectedHeadline === h ? c.amBg : c.sf,
                              border: `1px solid ${selectedHeadline === h ? c.am + "40" : c.bd}`,
                            }}>
                            <span className="text-[11px] leading-relaxed" style={{ color: c.tx }}>{h}</span>
                            <div className="flex items-center gap-1 shrink-0 mt-0.5">
                              {selectedHeadline === h && <Check size={12} style={{ color: c.gn }} />}
                              <CopyButton text={h} k={`hl-${i}`} copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                            </div>
                          </motion.div>
                        ))}
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGenerateHeadlines}
                          disabled={sectionLoading}
                          className="w-full py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5"
                          style={{ background: c.sf, border: `1px dashed ${c.bd}`, color: c.am }}>
                          {sectionLoading ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                          Generate More Variants
                        </motion.button>
                      </div>
                    </SectionCard>
                  </motion.div>
                )}

                {/* ── ABOUT TAB ────────────────────────────────────────── */}
                {activeTab === "About" && (
                  <motion.div key="about" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <SectionCard title="Optimized About Section" icon={<FileText size={14} />} c={c} delay={0}>
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl text-xs leading-relaxed whitespace-pre-line"
                          style={{ background: c.inputBg, border: `1px solid ${c.bd}`, color: c.tx }}>
                          {selectedAbout || profile.aboutSection}
                        </div>
                        <div className="flex justify-end">
                          <CopyButton text={selectedAbout || profile.aboutSection} k="about" copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard title="About Variants" icon={<Sparkles size={14} />} c={c} delay={1}>
                      <div className="space-y-2">
                        {aboutVariants.map((v, i) => (
                          <motion.div key={v.label + i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            className="p-3 rounded-xl cursor-pointer transition-all"
                            style={{
                              background: selectedAbout === v.content ? c.amBg : c.sf,
                              border: `1px solid ${selectedAbout === v.content ? c.am + "40" : c.bd}`,
                            }}
                            onClick={() => setSelectedAbout(v.content)}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: c.blBg, color: c.bl }}>{v.label}</span>
                              <CopyButton text={v.content} k={`ab-${v.label}`} copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                            </div>
                            <p className="text-[10px] leading-relaxed line-clamp-3" style={{ color: c.tx2 }}>{stripMarkdown(v.content)}</p>
                          </motion.div>
                        ))}
                        {/* Generate new variant buttons */}
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {["Professional", "Recruiter-Focused", "Startup", "Technical", "Student"].map(v => (
                            <motion.button key={v} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                              onClick={() => handleGenerateAbout(v)} disabled={sectionLoading}
                              className="px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all"
                              style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.am }}>
                              {sectionLoading ? <RefreshCw size={9} className="animate-spin" /> : <><Sparkles size={9} /> {v}</>}
                            </motion.button>
                          ))}
                        </div>
                      </div>
                    </SectionCard>
                  </motion.div>
                )}

                {/* ── EXPERIENCE TAB ───────────────────────────────────── */}
                {activeTab === "Experience" && (
                  <motion.div key="experience" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <SectionCard title="Optimized Experience" icon={<Briefcase size={14} />} c={c} delay={0}>
                      <div className="space-y-3">
                        {(profile.experience || []).map((exp, i) => (
                          <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            className="p-4 rounded-xl" style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-[11px] font-extrabold" style={{ color: c.tx }}>{exp.role}</div>
                                <div className="text-[10px]" style={{ color: c.am }}>{exp.company}</div>
                              </div>
                              <CopyButton text={`${exp.role} at ${exp.company}\n${exp.description}\n${exp.achievements.join("\n")}`}
                                k={`exp-${i}`} copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                            </div>
                            <p className="text-[10px] leading-relaxed mb-2" style={{ color: c.tx2 }}>{exp.description}</p>
                            {exp.achievements.length > 0 && (
                              <div className="space-y-1">
                                {exp.achievements.map((a, j) => (
                                  <div key={j} className="flex items-start gap-1.5 text-[10px]" style={{ color: c.tx2 }}>
                                    <span style={{ color: c.am }}>•</span> {a}
                                  </div>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        ))}
                        {(!profile.experience || profile.experience.length === 0) && (
                          <div className="text-center py-6 text-[10px]" style={{ color: c.txM }}>No experience data available</div>
                        )}
                      </div>
                    </SectionCard>
                  </motion.div>
                )}

                {/* ── PROJECTS TAB ─────────────────────────────────────── */}
                {activeTab === "Projects" && (
                  <motion.div key="projects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <SectionCard title="Optimized Projects" icon={<Code2 size={14} />} c={c} delay={0}>
                      <div className="space-y-3">
                        {(profile.projects || []).map((proj, i) => (
                          <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            className="p-4 rounded-xl" style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[11px] font-extrabold" style={{ color: c.tx }}>{proj.name}</div>
                              <CopyButton text={`${proj.name}\n${proj.description}\nTech: ${proj.technologies.join(", ")}\nImpact: ${proj.impact}`}
                                k={`proj-${i}`} copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                            </div>
                            <p className="text-[10px] leading-relaxed mb-2" style={{ color: c.tx2 }}>{proj.description}</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                              {proj.technologies.map(t => (
                                <span key={t} className="px-1.5 py-0.5 text-[8px] font-semibold rounded-full"
                                  style={{ background: c.ppBg, color: c.pp, border: `1px solid ${c.pp}20` }}>{t}</span>
                              ))}
                            </div>
                            {proj.impact && (
                              <div className="text-[10px] flex items-center gap-1" style={{ color: c.gn }}>
                                <TrendingUp size={10} /> {proj.impact}
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </SectionCard>

                    {/* Featured Section */}
                    <SectionCard title="Featured Section Recommendations" icon={<Star size={14} />} c={c} delay={1}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(profile.featured || []).map((f, i) => (
                          <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            className="p-3 rounded-xl" style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="px-1.5 py-0.5 text-[8px] font-bold rounded"
                                style={{ background: c.cyBg, color: c.cy }}>{f.type}</span>
                              <span className="text-[10px] font-bold" style={{ color: c.tx }}>{f.title}</span>
                            </div>
                            <p className="text-[9px]" style={{ color: c.tx2 }}>{f.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    </SectionCard>
                  </motion.div>
                )}

                {/* ── SKILLS TAB ───────────────────────────────────────── */}
                {activeTab === "Skills" && (
                  <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <SectionCard title="Optimized Skills" icon={<Star size={14} />} c={c} delay={0}>
                      <div className="flex flex-wrap gap-2">
                        {(profile.skills || []).sort((a, b) => a.priority - b.priority).map((s, i) => (
                          <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold"
                            style={{ background: i < 3 ? c.amBg : c.sf, color: i < 3 ? c.am : c.tx2, border: `1px solid ${i < 3 ? c.am + "30" : c.bd}` }}>
                            {i < 3 && <Zap size={9} style={{ color: c.am }} />}
                            {s.name}
                          </motion.div>
                        ))}
                      </div>
                    </SectionCard>

                    {profile.skillRecommendations?.length > 0 && (
                      <SectionCard title="Recommended Skills to Add" icon={<TrendingUp size={14} />} c={c} delay={1}>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.skillRecommendations.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 text-[9px] font-semibold rounded-full"
                              style={{ background: c.gnBg, color: c.gn, border: `1px solid ${c.gn}20` }}>
                              + {s}
                            </span>
                          ))}
                        </div>
                      </SectionCard>
                    )}
                  </motion.div>
                )}

                {/* ── VISIBILITY TAB ──────────────────────────────────── */}
                {activeTab === "Visibility" && (
                  <motion.div key="visibility" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Visibility", score: profile.scores.visibility, icon: <Eye size={14} /> },
                        { label: "Keyword Coverage", score: profile.scores.keyword, icon: <Search size={14} /> },
                        { label: "Overall", score: profile.scores.overall, icon: <Target size={14} /> },
                      ].map(({ label, score, icon }, i) => (
                        <SectionCard key={label} title="" icon={icon} c={c} delay={i} accent={sc(score)}>
                          <div className="text-center py-2">
                            <ScoreRing score={score} size={70} stroke={6} color={sc(score)} label={label} c={c} />
                          </div>
                        </SectionCard>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── NETWORKING TAB ──────────────────────────────────── */}
                {activeTab === "Networking" && (
                  <motion.div key="networking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <TabBar tabs={["Connection Requests", "Thank You", "Recruiter Outreach", "Referral Requests"]}
                      active={networkingTab} onChange={setNetworkingTab} c={c} />
                    <SectionCard title={networkingTab} icon={<Users size={14} />} c={c} delay={0}>
                      <div className="space-y-2">
                        {(() => {
                          const nw: any = profile.networking || {};
                          let templates: string[] = [];
                          if (networkingTab === "Connection Requests") templates = nw.connectionRequests || [];
                          else if (networkingTab === "Thank You") templates = nw.thankYouMessages || [];
                          else if (networkingTab === "Recruiter Outreach") templates = nw.recruiterOutreach || [];
                          else templates = nw.referralRequests || [];

                          return templates.map((t, i) => (
                            <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                              className="p-3 rounded-xl flex items-start justify-between gap-2"
                              style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                              <p className="text-[10px] leading-relaxed" style={{ color: c.tx2 }}>{t}</p>
                              <CopyButton text={t} k={`nw-${networkingTab}-${i}`} copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                            </motion.div>
                          ));
                        })()}
                      </div>
                    </SectionCard>
                  </motion.div>
                )}

                {/* ── CONTENT TAB ──────────────────────────────────────── */}
                {activeTab === "Content" && (
                  <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <SectionCard title="LinkedIn Post Ideas" icon={<Megaphone size={14} />} c={c} delay={0}>
                      <div className="space-y-3">
                        {(profile.contentIdeas || []).map((idea, i) => (
                          <motion.div key={i} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            className="p-4 rounded-xl" style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-extrabold" style={{ color: c.tx }}>{idea.title}</span>
                              <CopyButton text={`${idea.title}\n\n${idea.hook}\n\n${idea.body}\n\n${idea.cta}\n\n${idea.hashtags.join(" ")}`}
                                k={`content-${i}`} copiedKey={copiedKey} setCopiedKey={setCopiedKey} c={c} />
                            </div>
                            <div className="space-y-1.5 text-[10px]" style={{ color: c.tx2 }}>
                              <p className="font-semibold" style={{ color: c.am }}>&ldquo;{idea.hook}&rdquo;</p>
                              <p className="leading-relaxed">{idea.body}</p>
                              <p className="font-semibold" style={{ color: c.gn }}>{idea.cta}</p>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {idea.hashtags.map(h => (
                                  <span key={h} className="text-[9px]" style={{ color: c.bl }}>{h}</span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </SectionCard>
                  </motion.div>
                )}

                {/* ── SETTINGS TAB ─────────────────────────────────────── */}
                {activeTab === "Settings" && (
                  <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-4 max-w-3xl mx-auto">
                    <SectionCard title="Version History" icon={<History size={14} />} c={c} delay={0}>
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {history.map((h, i) => (
                          <motion.div key={h.id} custom={i} variants={scaleIn} initial="hidden" animate="visible"
                            className="flex items-center justify-between p-3 rounded-xl"
                            style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="text-[10px] font-bold truncate" style={{ color: c.tx }}>
                                {h.versionLabel || `Version ${h.versionNumber}`} — {h.headline?.substring(0, 50)}
                              </div>
                              <div className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: c.txM }}>
                                <Calendar size={9} /> {new Date(h.createdAt).toLocaleString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-extrabold text-[9px]"
                                style={{ background: scBg(h.score), color: sc(h.score) }}>{h.score}</div>
                              <motion.button whileHover={{ scale: 1.1 }} onClick={() => loadFromHistory(h)}
                                className="p-1.5 rounded-lg" style={{ background: c.blBg, color: c.bl }}>
                                <RotateCcw size={10} />
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.1 }}
                                onClick={async () => {
                                  try {
                                    await api.post(`/linkedin/${h.id}/duplicate`);
                                    loadHistory();
                                  } catch {}
                                }}
                                className="p-1.5 rounded-lg" style={{ background: c.amBg, color: c.am }}>
                                <Copy size={10} />
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleDelete(h.id)}
                                className="p-1.5 rounded-lg" style={{ background: c.rdBg, color: c.rd }}>
                                <Trash2 size={10} />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </SectionCard>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Inline SVG Linkedin Icon ─────────────────────────────────────────────────
function Linkedin({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
