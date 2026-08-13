"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { stripMarkdown } from "@/utils/stripMarkdown";
import CountUp from "react-countup";
import confetti from "canvas-confetti";
import { api } from "@/services/api";
import type { ResumeHubViewType } from "@/types/resume";
import {
  ArrowLeft, Upload, FileText, CheckCircle, XCircle, AlertTriangle,
  Star, Sparkles, RefreshCw, MessageCircle, Send, X, ChevronRight,
  ChevronDown, ChevronUp, Download, Save, Eye, RotateCcw, Target,
  BarChart3, Search, BookOpen, Code2, Briefcase, GraduationCap,
  Award, Link2, Zap, FileCheck2, Lightbulb, Users, Shield,
  TrendingUp, TrendingDown, AlertCircle, CheckSquare, CircleDot,
  Brain, GitCompare, History, FileSearch, Activity, PieChart,
  Circle,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useConfig } from "@/hooks/useConfig";
import { ATS_ROLES, ATS_ROLE_ICONS } from "@/config/resume-config";
import { mkColors } from "@/utils/themeColors";
import { fadeUp, fadeIn, scaleIn, buttonHover } from "@/utils/animations";
import { EmptyState } from "@/components/ui/PremiumComponents";
import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip as CT, Legend as CL, CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler, CT, CL,
  CategoryScale, LinearScale, BarElement
);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SectionScore { score: number; suggestions: string[]; }

interface ATSDeepAnalysis {
  score: number; scoreLabel: string;
  keywordsFound: string[]; keywordsMissing: string[];
  readability: string; length: string; formatting: string; recruiterScore: number;
  sectionScores: {
    summary: SectionScore; skills: SectionScore; experience: SectionScore;
    projects: SectionScore; education: SectionScore;
  };
  keywordAnalysis: { found: string[]; missing: string[] };
  formattingCheck: {
    onePage: boolean; fontsConsistent: boolean; atsFriendly: boolean;
    headingsCorrect: boolean; contactPresent: boolean;
  };
  strengthBars: {
    summary: number; projects: number; skills: number;
    experience: number; education: number;
  };
  recommendations: string[]; formattingIssues: string[]; strengths: string[];
  formattingScore?: number;
  keywordScore?: number;
  projectScore?: number;
  skillsScore?: number;
  experienceScore?: number;
  educationScore?: number;
  readabilityScore?: number;
  strongKeywords?: string[];
  weakKeywords?: string[];
}

interface ATSIntelligence {
  recruiterView: {
    firstImpression: string; topStrengths: string[];
    redFlags: string[]; interviewWorthy: boolean; hiringDecision: string;
  };
  insights: {
    strengths: string[]; weaknesses: string[];
    risks: string[]; opportunities: string[];
  };
  missingSections: Array<{
    section: string; importance: "critical" | "important" | "nice-to-have"; reason: string;
  }>;
  structureAnalysis: {
    isAtsCompatible: boolean;
    issues: Array<{ issue: string; severity: "high" | "medium" | "low"; fix: string }>;
    overallFormat: string;
  };
  detailedAnalysis: {
    contactInfo: { present: boolean; score: number; notes: string[] };
    summary: { present: boolean; score: number; quality: string; notes: string[] };
    skills: { present: boolean; score: number; count: number; notes: string[] };
    projects: { present: boolean; score: number; count: number; quality: string; notes: string[] };
    experience: { present: boolean; score: number; count: number; notes: string[] };
    education: { present: boolean; score: number; notes: string[] };
    certifications: { present: boolean; score: number; count: number; notes: string[] };
    achievements: { present: boolean; score: number; count: number; notes: string[] };
    links: { present: boolean; score: number; notes: string[] };
  };
  readabilityAnalysis: {
    overallGrade: string; sentenceLength: string; bulletUsage: string;
    formattingConsistency: string; scanningEase: string; recruiterFriendliness: string;
  };
  improvementRecommendations: Array<{
    priority: "high" | "medium" | "low"; category: string;
    title: string; description: string; impact: string;
  }>;
  jobTargetAnalysis?: {
    role: string; matchScore: number; alignedSkills: string[];
    gapSkills: string[]; roleSpecificAdvice: string[];
  };
}

interface ATSSuggestion {
  id: string; section: string; title: string; description: string;
  impact: "high" | "medium" | "low"; original: string; improved: string;
}

interface ResumeBrief { id: string; title: string; template: string; updatedAt: string; }
interface ATSReportBrief { id: string; score: number; createdAt: string; resume?: { title: string }; }

interface Props { setView: (v: ResumeHubViewType) => void; }

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════

// mkColors is now imported from centralized themeColors.ts
// Wrapper adds backward-compatible shorthand aliases for the AtsCheckerView
const mkC = (t: string) => {
  const base = mkColors(t);
  return {
    ...base,
    tx: base.text,
    tx2: base.textSec,
    txM: base.textMuted,
    sf: base.surface,
    sfH: base.surfaceHover,
    bd: base.border,
    bdH: base.borderHover,
    cb: base.cardBg,
    cs: base.shadow,
    dv: base.divider,
    am: base.amber,
    amBg: base.amberBg,
    gn: base.green,
    gnBg: base.greenBg,
    rd: base.red,
    rdBg: base.redBg,
    bl: base.blue,
    blBg: base.blueBg,
    pp: base.purple,
    ppBg: base.purpleBg,
    chat: base.d ? "#0a0e14" : "#f8fafc",
    selectBg: base.surface,
    selectOpt: base.d ? "#1a2035" : "#ffffff",
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// CountUp is now imported from react-countup at the top of the file

function Dots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map(i => (
        <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b" }}
          animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </span>
  );
}

function FloatingOrbs({ theme }: { theme: string }) {
  const d = theme === "dark";
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        className="absolute rounded-full blur-[120px]"
        style={{ top: "-8%", right: "10%", width: 320, height: 320, background: d ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)" }}
        animate={{ scale: [1, 1.15, 1], x: [0, 25, 0], y: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full blur-[140px]"
        style={{ bottom: "5%", left: "5%", width: 360, height: 360, background: d ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.05)" }}
        animate={{ scale: [1, 1.12, 1], x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{ top: "35%", left: "45%", width: 250, height: 250, background: d ? "rgba(59,130,246,0.05)" : "rgba(59,130,246,0.04)" }}
        animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 3 + i * 1.5,
            height: 3 + i * 1.5,
            background: i % 2 === 0 ? "rgba(245,158,11,0.3)" : "rgba(139,92,246,0.25)",
            top: `${15 + i * 12}%`,
            left: `${10 + i * 15}%`,
          }}
          animate={{
            y: [0, -20 - i * 5, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 4 + i * 0.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.6,
          }}
        />
      ))}
    </div>
  );
}

function CustomRoleDropdown({ value, onChange, theme }: { value: string; onChange: (v: string) => void; theme: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const d = theme === "dark";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative" style={{ zIndex: open ? 50 : "auto" }}>
      <motion.button
        whileHover={{ scale: 1.01, borderColor: "rgba(245,158,11,0.5)" }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between p-3.5 rounded-xl text-sm outline-none cursor-pointer"
        style={{
          background: d ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${d ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
          color: d ? "#e5e7eb" : "#0f172a",
          textAlign: "left",
        }}
      >
        <span className="flex items-center gap-2.5">
          <span className="text-base">{ATS_ROLE_ICONS[value] || "\u{1F3AF}"}</span>
          <span className="font-semibold text-sm">{value}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: d ? "#6b7280" : "#94a3b8" }} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute w-full mt-2 rounded-xl overflow-hidden"
            style={{
              zIndex: 9999,
              background: d ? "rgba(15,20,35,0.98)" : "#ffffff",
              border: `1px solid ${d ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              boxShadow: d
                ? "0 16px 48px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)"
                : "0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
              maxHeight: "240px",
              overflowY: "auto",
            }}
          >
            {ATS_ROLES.map((r) => (
              <button
                key={r}
                onMouseDown={(e) => { e.preventDefault(); onChange(r); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors"
                style={{
                  background: r === value
                    ? d ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.08)"
                    : "transparent",
                  color: d ? "#e5e7eb" : "#0f172a",
                  borderBottom: `1px solid ${d ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                }}
              >
                <span className="text-base w-7 text-center">{ATS_ROLE_ICONS[r] || "\u{1F3AF}"}</span>
                <span className="text-sm font-medium flex-1">{r}</span>
                {r === value && (
                  <CheckCircle size={14} style={{ color: "#f59e0b" }} />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Animation variants now imported from @/utils/animations
const AP = {
  page: { init: { opacity: 0, y: 24 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -24 } },
  card: { init: fadeUp.hidden, in: fadeUp.visible },
  fade: { init: fadeIn.hidden, in: fadeIn.visible },
  stagger: { in: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } } },
  spring: { type: "spring" as const, stiffness: 260, damping: 20 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AtsCheckerView({ setView }: Props) {
  const theme = useTheme();
  const c = mkC(theme);
  const cfg = useConfig();

  // ── State ──────────────────────────────────────────────────────────────────
  type Screen = "home" | "jd" | "loading" | "dashboard" | "history" | "compare" | "final";
  const [screen, setScreen] = useState<Screen>("home");
  const [tab, setTab] = useState<"overview" | "sections" | "keywords" | "recruiter" | "insights">("overview");

  const [role, setRole] = useState("General ATS");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [resumes, setResumes] = useState<ResumeBrief[]>([]);
  const [selId, setSelId] = useState("");
  const [jd, setJd] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [incJD, setIncJD] = useState<"yes" | "skip" | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [analysis, setAnalysis] = useState<ATSDeepAnalysis | null>(null);
  const [intel, setIntel] = useState<ATSIntelligence | null>(null);
  const [suggestions, setSuggestions] = useState<ATSSuggestion[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [updScore, setUpdScore] = useState(0);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState<{ role: string; content: string }[]>([]);
  const [chatIn, setChatIn] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

  const [history, setHistory] = useState<ATSReportBrief[]>([]);
  const [histLoad, setHistLoad] = useState(false);
  const [cmpA, setCmpA] = useState("");
  const [cmpB, setCmpB] = useState("");
  const [cmpRes, setCmpRes] = useState<any>(null);
  const [cmpBusy, setCmpBusy] = useState(false);

  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const jdRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  const loadSteps = [
    "Analyzing Resume",
    "Evaluating ATS Structure",
    "Checking Keywords",
    "Reviewing Sections",
    "Generating Insights",
    "Preparing Recommendations",
    "Analysis Complete",
  ];

  useEffect(() => {
    Promise.allSettled([
      api.get("/resume/list"),
      api.get("/resume-upload/list"),
      api.get("/ats/latest"),
    ]).then(([builderRes, uploadRes, latestAtsRes]) => {
      const builderResumes = builderRes.status === "fulfilled"
        ? (builderRes.value.data.resumes || [])
        : [];
      const uploadedResumes = uploadRes.status === "fulfilled" && uploadRes.value.data.success
        ? (uploadRes.value.data.resumes || []).map((u: any) => ({
          id: u.id,
          title: u.fileName,
          template: "Uploaded",
          updatedAt: u.createdAt,
          isUploaded: true,
        }))
        : [];
      const allIds = new Set(builderResumes.map((r: any) => r.id));
      const merged = [...builderResumes, ...uploadedResumes.filter((u: any) => !allIds.has(u.id))];
      setResumes(merged);

      if (latestAtsRes.status === "fulfilled" && latestAtsRes.value.data?.report) {
        const rep = latestAtsRes.value.data.report;
        const repAnalysis = rep.reportJson || rep;
        if (repAnalysis && repAnalysis.score !== undefined) {
          setAnalysis(repAnalysis);
          setUpdScore(rep.score || rep.overallScore || repAnalysis.score || 75);
          setScreen("dashboard");
        }
      }
    }).catch(() => { });
  }, []);
  useEffect(() => {
    const pendingId = sessionStorage.getItem("pendingResumeUploadId");
    if (pendingId) {
      sessionStorage.removeItem("pendingResumeUploadId");
      setSelId(pendingId);
      const timer = setTimeout(() => startAnalysisWithId(pendingId), 300);
      return () => clearTimeout(timer);
    }
  }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const sc = (s: number) => s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";
  const scBg = (s: number) => s >= 80 ? "rgba(16,185,129,0.1)" : s >= 60 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  const scLb = (s: number) => s >= 90 ? "Excellent" : s >= 80 ? "Very Good" : s >= 65 ? "Good" : s >= 50 ? "Fair" : "Poor";
  // Micro-interaction presets
  const hov = buttonHover.whileHover;
  const btnH = buttonHover.whileHover;
  const btnT = buttonHover.whileTap;

  // ── Chart config ───────────────────────────────────────────────────────────
  const radarData = analysis ? {
    labels: ["Summary", "Skills", "Experience", "Projects", "Education"],
    datasets: [{
      data: [
        (analysis.sectionScores?.summary?.score ?? 0) * 10,
        (analysis.sectionScores?.skills?.score ?? 0) * 10,
        (analysis.sectionScores?.experience?.score ?? 0) * 10,
        (analysis.sectionScores?.projects?.score ?? 0) * 10,
        (analysis.sectionScores?.education?.score ?? 0) * 10,
      ],
      backgroundColor: "rgba(245,158,11,0.12)",
      borderColor: "#f59e0b",
      borderWidth: 2,
      pointBackgroundColor: "#f59e0b",
      pointRadius: 4,
    }],
  } : null;

  const barData = analysis ? {
    labels: ["Found", "Missing"],
    datasets: [{
      data: [
        (analysis.keywordAnalysis?.found || analysis.keywordsFound || []).length,
        (analysis.keywordAnalysis?.missing || analysis.keywordsMissing || []).length
      ],
      backgroundColor: ["rgba(16,185,129,0.7)", "rgba(239,68,68,0.7)"],
      borderColor: ["#10b981", "#ef4444"],
      borderWidth: 1,
      borderRadius: 8,
    }],
  } : null;

  const categoryScores = analysis ? [
    { label: "Formatting Score", score: analysis.formattingScore ?? (analysis.formatting === "Excellent" ? 95 : analysis.formatting === "Good" ? 80 : analysis.formatting === "Fair" ? 60 : 40), color: "#8b5cf6" },
    { label: "Keyword Score", score: analysis.keywordScore ?? Math.round((analysis.keywordsFound.length / Math.max(1, analysis.keywordsFound.length + (analysis.keywordsMissing || []).length)) * 100), color: "#3b82f6" },
    { label: "Project Score", score: analysis.projectScore ?? (analysis.sectionScores.projects?.score ? analysis.sectionScores.projects.score * 10 : 0), color: "#10b981" },
    { label: "Skills Score", score: analysis.skillsScore ?? (analysis.sectionScores.skills?.score ? analysis.sectionScores.skills.score * 10 : 0), color: "#f59e0b" },
    { label: "Experience Score", score: analysis.experienceScore ?? (analysis.sectionScores.experience?.score ? analysis.sectionScores.experience.score * 10 : 0), color: "#ef4444" },
    { label: "Education Score", score: analysis.educationScore ?? (analysis.sectionScores.education?.score ? analysis.sectionScores.education.score * 10 : 0), color: "#ec4899" },
    { label: "Readability Score", score: analysis.readabilityScore ?? (analysis.readability === "Excellent" ? 95 : analysis.readability === "Good" ? 80 : analysis.readability === "Fair" ? 60 : 40), color: "#06b6d4" },
  ] : [];

  const radarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      r: {
        beginAtZero: true, max: 100,
        ticks: { display: false, stepSize: 20 },
        grid: { color: c.d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        pointLabels: {
          color: c.d ? "#9ca3af" : "#475569",
          font: { size: 11, weight: "bold" as const },
        },
        angleLines: { color: c.d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
      },
    },
  };

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { color: c.d ? "#9ca3af" : "#475569", font: { size: 11 } }, grid: { color: c.d ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" } },
      x: { ticks: { color: c.d ? "#9ca3af" : "#475569", font: { size: 11, weight: "bold" as const } }, grid: { display: false } },
    },
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type === "application/pdf" || f.name.endsWith(".docx") || f.name.endsWith(".doc"))) setFile(f);
  };

  const startAnalysis = async () => {
    await startAnalysisWithId(selId);
  };

  const startAnalysisWithId = async (explicitId: string) => {
    let effectiveSelId = explicitId || selId;
    if (!file && !effectiveSelId && resumes.length > 0) {
      effectiveSelId = resumes[0].id;
      setSelId(effectiveSelId);
    }

    if (!file && !effectiveSelId) {
      toast.error("Please upload a resume file or select a saved resume to analyze.");
      return;
    }

    setScreen("loading");
    setErrorMsg(null);
    setLoading(true);
    setLoadStep(0);
    const iv = setInterval(() => setLoadStep(p => Math.min(p + 1, loadSteps.length - 1)), 700);

    try {
      const fd = new FormData();
      if (file) fd.append("resume", file);
      if (effectiveSelId) fd.append("resumeId", effectiveSelId);
      fd.append("targetRole", role);
      if (incJD === "yes") {
        if (jdFile) fd.append("jobDescription", await jdFile.text());
        else if (jd) fd.append("jobDescription", jd);
      }
      const hdrs = { "Content-Type": "multipart/form-data" };
      const [aR, iR] = await Promise.allSettled([
        api.post("/ats/analyze", fd, { headers: hdrs }),
        api.post("/ats/intelligence", fd, { headers: hdrs }),
      ]);
      clearInterval(iv);
      setLoadStep(loadSteps.length - 1);

      if (aR.status === "rejected") {
        const errMsg = aR.reason?.response?.data?.message || aR.reason?.message || "Failed to analyze resume.";
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      const resAnalysis = aR.value.data.analysis || aR.value.data.report?.reportJson || aR.value.data.report;
      if (resAnalysis) {
        setAnalysis(resAnalysis);
        setUpdScore(resAnalysis.score || 75);
      }

      if (iR.status === "fulfilled" && iR.value.data.intelligence) {
        setIntel(iR.value.data.intelligence);
      }

      await new Promise(r => setTimeout(r, 600));
      setScreen("dashboard");

      if (resAnalysis) genSuggestions(resAnalysis);
      try {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 }, colors: ["#f59e0b", "#ea580c", "#10b981"] });
      } catch { /* confetti blocked */ }
    } catch (err: any) {
      clearInterval(iv);
      setScreen("home");
      const msg = err?.response?.data?.message || err?.message || "Analysis failed. Please try again.";
      setErrorMsg(msg);
      console.error("ATS Analysis failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const genSuggestions = async (a?: ATSDeepAnalysis) => {
    try {
      const r = await api.post("/ats/suggestions", { targetRole: role, analysis: a || analysis, resumeId: selId || undefined });
      if (r.data.suggestions) setSuggestions(r.data.suggestions);
    } catch { }
  };

  const applySugg = async (s: ATSSuggestion) => {
    try {
      const r = await api.post("/ats/apply-improvement", { section: s.section, originalContent: s.original, suggestionText: s.description });
      if (r.data.improved) {
        const delta = s.impact === "high" ? 3 : s.impact === "medium" ? 2 : 1;
        setApplied(p => new Set(p).add(s.id));
        setUpdScore(p => Math.min(100, p + delta));
      }
    } catch { }
  };

  const sendChat = async () => {
    if (!chatIn.trim()) return;
    const m = chatIn.trim(); setChatIn("");
    setChatMsgs(p => [...p, { role: "user", content: m }]); setChatBusy(true);
    try {
      const r = await api.post("/ats/chat", { message: m, resumeId: selId || undefined, analysis });
      if (r.data.reply) setChatMsgs(p => [...p, { role: "assistant", content: r.data.reply }]);
    } catch { setChatMsgs(p => [...p, { role: "assistant", content: "Sorry, couldn't process that." }]); }
    finally { setChatBusy(false); }
  };

  const loadHistory = async () => {
    setHistLoad(true);
    try { const r = await api.get("/ats/history"); setHistory(r.data.reports || []); } catch { }
    finally { setHistLoad(false); }
  };

  const runCompare = async () => {
    if (!cmpA || !cmpB) return;
    setCmpBusy(true);
    try { const r = await api.post("/ats/compare", { resumeIdA: cmpA, resumeIdB: cmpB, targetRole: role }); setCmpRes(r.data.comparison); } catch { }
    finally { setCmpBusy(false); }
  };

  const resetAll = () => {
    setScreen("home"); setAnalysis(null); setIntel(null); setFile(null);
    setSelId(""); setSuggestions([]); setApplied(new Set()); setErrorMsg(null);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARED CARD WRAPPER
  // ═══════════════════════════════════════════════════════════════════════════
  const Card = ({ children, className = "", style = {}, ...motionProps }: any) => (
    <motion.div
      variants={AP.card} initial="init" animate="in"
      transition={{ duration: 0.35 }}
      className={`rounded-2xl ${className}`}
      style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: c.shadow, ...style }}
      {...motionProps}
    >{children}</motion.div>
  );

  const Pill = ({ color, children }: { color: string; children: React.ReactNode }) => (
    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>{children}</span>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col min-h-[calc(100vh-120px)] antialiased relative"
      style={{ color: c.tx, backgroundColor: c.bg, backgroundAttachment: "fixed" }}>

      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-5 pt-3 pb-2 relative z-20"
        style={{
          borderBottom: `1px solid ${c.dv}`,
          background: c.d ? "rgba(10,14,26,0.8)" : "rgba(255,255,255,0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
        {screen !== "home" && (
          <motion.button whileHover={btnH} whileTap={btnT}
            onClick={() => { if (screen === "dashboard") setScreen("home"); else if (screen === "history" || screen === "compare") setScreen("home"); else setScreen("home"); }}
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx }}>
            <ArrowLeft size={15} />
          </motion.button>
        )}
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={AP.spring}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>
          <BarChart3 size={18} style={{ color: "#000" }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <motion.h1 key={screen} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="text-base font-extrabold" style={{ fontFamily: "'Outfit',sans-serif" }}>
            {screen === "home" ? "ATS Intelligence Engine" : screen === "jd" ? "Job Description" :
              screen === "loading" ? "Analyzing..." : screen === "dashboard" ? "ATS Dashboard" :
                screen === "history" ? "Analysis History" : screen === "compare" ? "Resume Comparison" : "Complete"}
          </motion.h1>
          <p className="text-[11px]" style={{ color: c.txM }}>
            {screen === "home" ? "Analyze your resume like a real ATS system" :
              screen === "jd" ? "Compare against a job description" :
                screen === "loading" ? "Running comprehensive analysis..." :
                  screen === "dashboard" ? "Detailed audit with recruiter insights" :
                    screen === "history" ? "Your past analysis reports" :
                      screen === "compare" ? "Compare two resume versions" : "Resume improved"}
          </p>
        </div>
        {screen === "home" && (
          <div className="flex gap-1.5 shrink-0">
            <motion.button whileHover={btnH} whileTap={btnT} onClick={() => { setScreen("history"); loadHistory(); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.txM }} title="History">
              <History size={14} />
            </motion.button>
            <motion.button whileHover={btnH} whileTap={btnT} onClick={() => setScreen("compare")}
              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.txM }} title="Compare">
              <GitCompare size={14} />
            </motion.button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 relative z-10">
        <AnimatePresence mode="wait">

          {/* ═══════ HOME ═══════ */}
          {screen === "home" && (
            <motion.div key="home" {...AP.page} transition={{ duration: 0.4 }} className="pt-4 relative">
              <FloatingOrbs theme={theme} />

              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="text-center mb-8 relative z-10"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
                  className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center relative"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706, #b45309)",
                    boxShadow: "0 8px 32px rgba(245,158,11,0.35), 0 2px 8px rgba(245,158,11,0.2)",
                  }}
                >
                  <BarChart3 size={36} style={{ color: "#000" }} />
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    style={{ border: "2px solid rgba(245,158,11,0.3)" }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="text-2xl font-extrabold mb-2"
                  style={{ fontFamily: "'Outfit',sans-serif", color: c.tx }}
                >
                  ATS Intelligence Engine
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="text-sm max-w-md mx-auto leading-relaxed"
                  style={{ color: c.tx2 }}
                >
                  Analyze your resume like a real ATS system. Discover weaknesses, missing keywords, and get AI-powered improvement recommendations.
                </motion.p>

                {/* Feature pills */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.5 }}
                  className="flex flex-wrap justify-center gap-2 mt-4"
                >
                  {[
                    { icon: <BarChart3 size={10} />, label: "ATS Score", cl: "#f59e0b" },
                    { icon: <Search size={10} />, label: "Keyword Analysis", cl: "#3b82f6" },
                    { icon: <Users size={10} />, label: "Recruiter View", cl: "#8b5cf6" },
                    { icon: <Lightbulb size={10} />, label: "AI Insights", cl: "#10b981" },
                  ].map((f, i) => (
                    <motion.span
                      key={f.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: `${f.cl}12`,
                        color: f.cl,
                        border: `1px solid ${f.cl}25`,
                      }}
                    >
                      {f.icon} {f.label}
                    </motion.span>
                  ))}
                </motion.div>
              </motion.div>

              <div className="space-y-5 relative z-10">
                {/* Error Banner */}
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-3 p-4 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}
                  >
                    <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: "#ef4444" }}>Analysis Failed</p>
                      <p className="text-xs mt-0.5" style={{ color: c.tx2 }}>{errorMsg}</p>
                    </div>
                    <button onClick={() => setErrorMsg(null)} style={{ color: c.txM }}>
                      <X size={14} />
                    </button>
                  </motion.div>
                )}

                {/* Empty state */}
                {!file && !selId && resumes.length === 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <EmptyState
                      title="Upload a resume to generate ATS analysis"
                      description="Upload your resume or create one with Resume Builder to get started."
                      actionLabel="Resume Builder"
                      onAction={() => setView("resume-builder")}
                      illustration={<BarChart3 size={32} />}
                    />
                  </motion.div>
                )}

                {/* Role Selector */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="relative"
                  style={{ zIndex: 30 }}
                >
                  <Card className="p-3 relative" style={{
                    background: c.d
                      ? "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)"
                      : "rgba(255,255,255,0.85)",
                    boxShadow: c.d
                      ? "0 4px 24px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)"
                      : "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)",
                  }}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: c.tx2 }}>
                      <Target size={11} style={{ color: c.am }} /> Target Job Role
                    </label>
                    <CustomRoleDropdown value={role} onChange={setRole} theme={theme} />
                  </Card>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Existing Resumes */}
                  {resumes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                    >
                      <Card className="p-3" style={{
                        background: c.d
                          ? "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)"
                          : "rgba(255,255,255,0.85)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                      }}>
                        <h3 className="text-xs font-bold mb-2 flex items-center gap-2"><FileText size={13} style={{ color: c.am }} /> Choose Resume</h3>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {resumes.map((r, i) => (
                            <motion.button key={r.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.65 + i * 0.05 }}
                              whileHover={{ scale: 1.015, borderColor: "rgba(245,158,11,0.4)" }}
                              whileTap={{ scale: 0.985 }}
                              onClick={() => { setSelId(r.id); setFile(null); }}
                              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                              style={{
                                background: selId === r.id ? "rgba(245,158,11,0.08)" : c.sf,
                                border: `1px solid ${selId === r.id ? "rgba(245,158,11,0.3)" : c.bd}`,
                              }}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.1)" }}>
                                <FileText size={14} style={{ color: c.am }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">{r.title}</div>
                                <div className="text-[10px]" style={{ color: c.txM }}>{r.template} · {new Date(r.updatedAt).toLocaleDateString()}</div>
                              </div>
                              {selId === r.id && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={AP.spring}>
                                  <CheckCircle size={16} style={{ color: c.am }} />
                                </motion.div>
                              )}
                            </motion.button>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Upload */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                  >
                    <Card className="p-2" style={{
                      background: c.d
                        ? "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)"
                        : "rgba(255,255,255,0.85)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                    }}>
                      <h3 className="text-xs font-bold mb-1.5 flex items-center gap-2"><Upload size={13} style={{ color: c.am }} /> Upload Resume</h3>
                      <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all relative overflow-hidden"
                        style={{ borderColor: drag ? c.am : c.bd, background: drag ? "rgba(245,158,11,0.04)" : c.sf }}>
                        {/* Decorative corner glow on hover */}
                        <motion.div
                          className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none"
                          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15), transparent 70%)" }}
                          animate={{ scale: drag ? 1.5 : 1, opacity: drag ? 1 : 0.3 }}
                          transition={{ duration: 0.4 }}
                        />
                        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setSelId(""); } }} className="hidden" />
                        {file ? (
                          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-2 relative z-10">
                            <motion.div
                              animate={{ rotate: [0, -5, 5, 0] }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                            >
                              <FileText size={32} className="mx-auto" style={{ color: c.am }} />
                            </motion.div>
                            <p className="text-sm font-bold">{file.name}</p>
                            <p className="text-[10px]" style={{ color: c.txM }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button onClick={e => { e.stopPropagation(); setFile(null); }}
                              className="text-[10px] font-bold inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"
                              style={{ background: c.rdBg, color: c.rd, border: `1px solid ${c.rd}30` }}><X size={11} /> Remove</button>
                          </motion.div>
                        ) : (
                          <div className="space-y-1.5 relative z-10">
                            <motion.div
                              animate={{ y: [0, -4, 0] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Upload size={22} className="mx-auto" style={{ color: drag ? c.am : c.txM }} />
                            </motion.div>
                            <p className="text-xs font-bold" style={{ color: drag ? c.am : c.tx }}>Drag & drop your resume</p>
                            <p className="text-[9px]" style={{ color: c.txM }}>PDF, DOCX up to 5MB</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                </div>

                {/* Feature Highlights */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.75, duration: 0.4 }}
                  className="grid grid-cols-3 gap-3"
                >
                  {[
                    { icon: <Search size={16} />, title: "Keyword Analysis", desc: "Find missing technical & soft skills", cl: "#3b82f6" },
                    { icon: <Users size={16} />, title: "Recruiter View", desc: "See what recruiters notice first", cl: "#8b5cf6" },
                    { icon: <Lightbulb size={16} />, title: "AI Improvements", desc: "Get actionable fix recommendations", cl: "#10b981" },
                  ].map((f, i) => (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="p-3.5 rounded-xl text-center"
                      style={{
                        background: c.d ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                        border: `1px solid ${c.bd}`,
                      }}
                    >
                      <div className="w-9 h-9 rounded-lg mx-auto mb-2 flex items-center justify-center" style={{ background: `${f.cl}15`, color: f.cl }}>
                        {f.icon}
                      </div>
                      <div className="text-[11px] font-bold mb-0.5" style={{ color: c.tx }}>{f.title}</div>
                      <div className="text-[9px] leading-tight" style={{ color: c.txM }}>{f.desc}</div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Continue */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.4 }}
                >
                  <motion.button whileHover={file || selId ? { scale: 1.02, boxShadow: "0 6px 20px rgba(245,158,11,0.3)" } : {}} whileTap={btnT} disabled={!file && !selId}
                    onClick={() => setScreen("jd")}
                    className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: (!file && !selId) ? c.sf : "linear-gradient(135deg,#f59e0b,#d97706)",
                      color: (!file && !selId) ? c.txM : "#000",
                      border: (!file && !selId) ? `1px solid ${c.bd}` : "none",
                      opacity: (!file && !selId) ? 0.5 : 1,
                      boxShadow: (!file && !selId) ? "none" : "0 4px 16px rgba(245,158,11,0.25)",
                    }}>
                    <Zap size={14} /> Continue to Analysis <ChevronRight size={14} />
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ═══════ JD ═══════ */}
          {screen === "jd" && (
            <motion.div key="jd" {...AP.page} transition={{ duration: 0.3 }} className="space-y-5 pt-5 max-w-xl mx-auto">
              <Card className="p-8 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={AP.spring}>
                  <Target size={44} className="mx-auto mb-4" style={{ color: c.am }} />
                </motion.div>
                <h2 className="text-xl font-extrabold mb-2">Compare with Job Description?</h2>
                <p className="text-sm mb-6" style={{ color: c.tx2 }}>Adds targeted keyword matching and role-specific gap analysis.</p>
                <div className="flex gap-3 justify-center">
                  <motion.button whileHover={btnH} whileTap={btnT} onClick={() => setIncJD("yes")}
                    className="px-8 py-2.5 rounded-xl font-bold text-xs"
                    style={{ background: incJD === "yes" ? c.am : c.sf, color: incJD === "yes" ? "#000" : c.tx, border: `1px solid ${incJD === "yes" ? c.am : c.bd}` }}>
                    Yes, include JD
                  </motion.button>
                  <motion.button whileHover={btnH} whileTap={btnT} onClick={() => setIncJD("skip")}
                    className="px-8 py-2.5 rounded-xl font-bold text-xs"
                    style={{ background: c.sf, color: c.tx, border: `1px solid ${c.bd}` }}>
                    Skip
                  </motion.button>
                </div>
              </Card>

              <AnimatePresence>
                {incJD === "yes" && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <Card className="p-5 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: c.tx2 }}>Paste Job Description</label>
                        <textarea value={jd} onChange={e => setJd(e.target.value)} rows={6} placeholder="Paste the job description here..."
                          className="w-full p-3 rounded-xl text-sm outline-none resize-none"
                          style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx }}
                          onFocus={e => e.currentTarget.style.borderColor = c.am}
                          onBlur={e => e.currentTarget.style.borderColor = c.bd} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: c.bd }} />
                        <span className="text-[10px] font-bold" style={{ color: c.txM }}>OR</span>
                        <div className="flex-1 h-px" style={{ background: c.bd }} />
                      </div>
                      <div onClick={() => jdRef.current?.click()}
                        className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer"
                        style={{ borderColor: c.bd, background: c.sf }}>
                        <input ref={jdRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden"
                          onChange={e => { if (e.target.files?.[0]) setJdFile(e.target.files[0]); }} />
                        {jdFile ? <p className="text-sm font-bold">{jdFile.name}</p> : (
                          <div><Upload size={22} className="mx-auto mb-1" style={{ color: c.txM }} /><p className="text-[10px]" style={{ color: c.txM }}>Upload JD file</p></div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3">
                <motion.button whileHover={btnH} whileTap={btnT} onClick={() => setScreen("home")}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs" style={{ background: c.sf, color: c.tx, border: `1px solid ${c.bd}` }}>Back</motion.button>
                <motion.button whileHover={btnH} whileTap={btnT} disabled={incJD === null} onClick={startAnalysis}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  style={{
                    background: incJD === null ? c.sf : "linear-gradient(135deg,#f59e0b,#d97706)",
                    color: incJD === null ? c.txM : "#000",
                    border: incJD === null ? `1px solid ${c.bd}` : "none",
                    opacity: incJD === null ? 0.5 : 1,
                  }}><Zap size={15} /> Analyze Resume</motion.button>
              </div>
            </motion.div>
          )}

          {/* ═══════ LOADING ═══════ */}
          {screen === "loading" && (
            <motion.div key="loading" {...AP.fade} transition={{ duration: 0.3 }} className="max-w-md mx-auto pt-8">
              <Card className="p-8 text-center">
                {/* Spinner */}
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="w-full h-full rounded-full border-3 animate-spin" style={{ border: `3px solid ${c.bd}`, borderTopColor: c.am }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <BarChart3 size={22} style={{ color: c.am }} />
                  </div>
                </div>
                <h2 className="text-lg font-extrabold mb-6 animate-pulse">Analyzing Resume...</h2>
                <div className="space-y-2.5 text-left">
                  {loadSteps.map((step, i) => (
                    <div key={step} className="flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300"
                      style={{ background: i <= loadStep ? "rgba(245,158,11,0.04)" : "transparent" }}>
                      {i < loadStep ? <CheckCircle size={16} style={{ color: c.gn }} /> :
                        i === loadStep ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: `${c.am} transparent ${c.am} ${c.am}` }} /> :
                          <div className="w-4 h-4 rounded-full" style={{ background: c.sf, border: `1px solid ${c.bd}` }} />}
                      <span className="text-xs" style={{ color: i <= loadStep ? c.tx : c.txM, fontWeight: i <= loadStep ? 700 : 400 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ═══════ DASHBOARD ═══════ */}
          {screen === "dashboard" && analysis && (
            <motion.div key="dash" {...AP.page} transition={{ duration: 0.3 }} className="space-y-5 pt-4">

              {/* ─── TABS ─── */}
              <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                {([
                  ["overview", "Overview", <BarChart3 size={12} />],
                  ["sections", "Sections", <FileSearch size={12} />],
                  ["keywords", "Keywords", <Search size={12} />],
                  ["recruiter", "Recruiter", <Users size={12} />],
                  ["insights", "Insights", <Brain size={12} />],
                ] as const).map(([id, label, icon]) => (
                  <motion.button key={id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setTab(id)}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap"
                    style={{ background: tab === id ? "linear-gradient(135deg,#f59e0b,#d97706)" : "transparent", color: tab === id ? "#000" : c.txM }}>
                    {icon} {label}
                  </motion.button>
                ))}
              </div>

              {/* ═══ TAB: OVERVIEW ═══ */}
              {tab === "overview" && (
                <motion.div key="t-over" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                  {/* Score + Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* SCORE RING */}
                    <Card className="p-6 flex flex-col items-center justify-center">
                      <div className="relative w-40 h-40 mb-3">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="80" cy="80" r="68" stroke={c.d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} strokeWidth="10" fill="transparent" />
                          <motion.circle cx="80" cy="80" r="68" fill="transparent"
                            stroke={sc(analysis.score)} strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 68}
                            initial={{ strokeDashoffset: 2 * Math.PI * 68 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 68 * (1 - analysis.score / 100) }}
                            transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-extrabold"><CountUp end={analysis.score} /></span>
                          <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: c.txM }}>ATS Score</span>
                        </div>
                      </div>
                      <div className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: scBg(analysis.score), color: sc(analysis.score) }}>{scLb(analysis.score)}</div>
                      {intel?.recruiterView && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: intel.recruiterView.interviewWorthy ? c.gn : c.rd }} />
                          <span className="text-[10px] font-bold" style={{ color: intel.recruiterView.interviewWorthy ? c.gn : c.rd }}>
                            {intel.recruiterView.interviewWorthy ? "Interview Worthy" : "Needs Improvement"}
                          </span>
                        </div>
                      )}
                    </Card>

                    {/* RADAR */}
                    <Card className="p-4 flex flex-col">
                      <h3 className="text-[11px] font-bold mb-2">Section Scores</h3>
                      <div className="flex-1" style={{ minHeight: 200 }}>{radarData && <Radar data={radarData} options={radarOpts as any} />}</div>
                    </Card>

                    {/* BAR */}
                    <Card className="p-4 flex flex-col">
                      <h3 className="text-[11px] font-bold mb-2">Keyword Coverage</h3>
                      <div className="flex-1" style={{ minHeight: 200 }}>{barData && <Bar data={barData} options={barOpts as any} />}</div>
                    </Card>
                  </div>

                  {/* QUICK STATS */}
                  <motion.div variants={AP.stagger.in} initial="init" animate="in" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { l: "Keywords Found", v: String(analysis.keywordsFound.length), ic: <Search size={14} />, cl: c.gn },
                      { l: "Keywords Missing", v: String(analysis.keywordsMissing.length), ic: <AlertTriangle size={14} />, cl: c.rd },
                      { l: "Readability", v: analysis.readability, ic: <Activity size={14} />, cl: c.am },
                      { l: "Recruiter Score", v: `${analysis.recruiterScore}/10`, ic: <Users size={14} />, cl: c.bl },
                    ].map((s, i) => (
                      <motion.div key={s.l} variants={AP.card} className="p-4 rounded-xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span style={{ color: s.cl }}>{s.ic}</span>
                          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: c.txM }}>{s.l}</span>
                        </div>
                        <div className="text-xl font-extrabold">{s.v}</div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* ATS CATEGORY SCORES */}
                  <Card className="p-5">
                    <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
                      <BarChart3 size={14} style={{ color: c.am }} /> ATS Category Scores
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {categoryScores.map((cat, i) => (
                        <div key={cat.label} className="p-3 rounded-xl transition-all" style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold" style={{ color: c.tx2 }}>{cat.label}</span>
                            <span className="text-xs font-extrabold" style={{ color: cat.color }}>
                              <CountUp end={cat.score} />%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${cat.score}%` }} transition={{ duration: 1.2, delay: i * 0.08, ease: "easeOut" }}
                              className="h-full rounded-full" style={{ background: cat.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* MISSING SECTIONS ALERT */}
                  {intel?.missingSections && intel.missingSections.length > 0 && (
                    <Card className="p-5" style={{ background: "rgba(239,68,68,0.02)", borderColor: "rgba(239,68,68,0.15)" }}>
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: c.rd }}>
                        <AlertTriangle size={14} /> Missing Critical Sections Detected
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {intel.missingSections.map((ms, i) => (
                          <div key={ms.section} className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: c.sf, border: `1px solid ${c.bd}` }}>
                            <XCircle size={14} className="mt-0.5 shrink-0" style={{ color: c.rd }} />
                            <div>
                              <div className="text-[11px] font-bold" style={{ color: c.tx }}>{ms.section}</div>
                              <div className="text-[9px]" style={{ color: c.tx2 }}>{ms.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* FORMATTING CHECK */}
                  <Card className="p-5">
                    <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                      <FileCheck2 size={14} style={{ color: c.am }} /> ATS Formatting Check
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {([
                        ["One Page", analysis.formattingCheck?.onePage],
                        ["Fonts OK", analysis.formattingCheck?.fontsConsistent],
                        ["ATS Friendly", analysis.formattingCheck?.atsFriendly],
                        ["Headings OK", analysis.formattingCheck?.headingsCorrect],
                        ["Contact OK", analysis.formattingCheck?.contactPresent],
                      ] as const).map(([l, ok]) => (
                        <div key={l} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: c.sf }}>
                          {ok ? <CheckCircle size={13} style={{ color: c.gn }} /> : <XCircle size={13} style={{ color: c.rd }} />}
                          <span className="text-[10px] font-semibold">{l}</span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* ACTIONS */}
                  <div className="flex">
                    <motion.button whileHover={btnH} whileTap={btnT} onClick={() => setTab("insights")}
                      className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                      style={{ background: c.ppBg, color: c.pp, border: `1px solid ${c.pp}30` }}>
                      <Brain size={15} /> Deep Insights
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ═══ TAB: SECTIONS ═══ */}
              {tab === "sections" && (
                <motion.div key="t-sec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Section Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {([
                      ["summary", "Professional Summary", <BookOpen size={15} />, analysis.sectionScores?.summary || { score: 0, suggestions: ["Run an ATS analysis to get section scores."] }],
                      ["skills", "Technical Skills", <Code2 size={15} />, analysis.sectionScores?.skills || { score: 0, suggestions: ["Run an ATS analysis to get section scores."] }],
                      ["experience", "Work Experience", <Briefcase size={15} />, analysis.sectionScores?.experience || { score: 0, suggestions: ["Run an ATS analysis to get section scores."] }],
                      ["projects", "Projects", <Lightbulb size={15} />, analysis.sectionScores?.projects || { score: 0, suggestions: ["Run an ATS analysis to get section scores."] }],
                      ["education", "Education", <GraduationCap size={15} />, analysis.sectionScores?.education || { score: 0, suggestions: ["Run an ATS analysis to get section scores."] }],
                    ] as const).map(([k, lbl, ic, data], i) => (
                      <motion.div key={k} variants={AP.card} initial="init" animate="in" transition={{ delay: i * 0.06 }}
                        className="p-4 rounded-xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span style={{ color: c.am }}>{ic}</span>
                            <span className="text-xs font-bold">{lbl}</span>
                          </div>
                          <span className="text-sm font-extrabold" style={{ color: sc(data.score * 10) }}>{data.score}/10</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: c.sf }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${data.score * 10}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }} className="h-full rounded-full" style={{ background: sc(data.score * 10) }} />
                        </div>
                        {data.suggestions?.map((s, j) => (
                          <div key={j} className="text-[10px] flex items-start gap-1.5 mb-1" style={{ color: c.tx2 }}>
                            <span style={{ color: c.am }} className="mt-0.5">•</span> {s}
                          </div>
                        ))}
                      </motion.div>
                    ))}
                  </div>

                  {/* Detailed from Intelligence */}
                  {intel?.detailedAnalysis && (
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-4 flex items-center gap-2">
                        <FileSearch size={14} style={{ color: c.am }} /> Detailed Section Analysis
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(intel.detailedAnalysis).map(([key, d]: [string, any]) => (
                          <div key={key} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: c.sf }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: d.present ? c.gnBg : c.rdBg }}>
                              {d.present ? <CheckCircle size={13} style={{ color: c.gn }} /> : <XCircle size={13} style={{ color: c.rd }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                                <span className="text-[10px] font-bold" style={{ color: sc(d.score * 10) }}>{d.score}/10</span>
                              </div>
                              {d.notes?.slice(0, 2).map((n: string, i: number) => (
                                <div key={i} className="text-[10px] mt-0.5" style={{ color: c.tx2 }}>• {n}</div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* ═══ TAB: KEYWORDS ═══ */}
              {tab === "keywords" && (
                <motion.div key="t-kw" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {incJD === "yes" && (
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><Target size={14} style={{ color: c.am }} /> JD Match</h3>
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="32" cy="32" r="26" stroke={c.bd} strokeWidth="5" fill="transparent" />
                            <circle cx="32" cy="32" r="26" stroke={c.am} strokeWidth="5" fill="transparent"
                              strokeDasharray={2 * Math.PI * 26} strokeDashoffset={2 * Math.PI * 26 * (1 - analysis.score / 100)} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-extrabold" style={{ color: c.am }}>{analysis.score}%</span></div>
                        </div>
                        <div className="text-xs" style={{ color: c.tx2 }}>{analysis.keywordAnalysis.found.length} matched · {analysis.keywordAnalysis.missing.length} missing</div>
                      </div>
                    </Card>
                  )}

                  <Card className="p-5">
                    <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                      <CheckCircle size={14} style={{ color: c.gn }} /> Strong Keywords ({(analysis.strongKeywords || []).length || Math.ceil(analysis.keywordAnalysis.found.length / 2)})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis.strongKeywords && analysis.strongKeywords.length > 0 ? analysis.strongKeywords : analysis.keywordAnalysis.found.slice(0, Math.ceil(analysis.keywordAnalysis.found.length / 2))).map(kw => (
                        <Pill key={kw} color="#10b981">✓ {kw}</Pill>
                      ))}
                      {analysis.keywordAnalysis.found.length === 0 && <span className="text-[10px]" style={{ color: c.txM }}>No strong keywords detected</span>}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                      <AlertTriangle size={14} style={{ color: c.am }} /> Weak Keywords ({(analysis.weakKeywords || []).length || Math.floor(analysis.keywordAnalysis.found.length / 2)})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis.weakKeywords && analysis.weakKeywords.length > 0 ? analysis.weakKeywords : analysis.keywordAnalysis.found.slice(Math.ceil(analysis.keywordAnalysis.found.length / 2))).map(kw => (
                        <Pill key={kw} color="#f59e0b">⚠ {kw}</Pill>
                      ))}
                      {analysis.keywordAnalysis.found.length === 0 && <span className="text-[10px]" style={{ color: c.txM }}>No weak keywords detected</span>}
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                      <XCircle size={14} style={{ color: c.rd }} /> Missing Keywords ({analysis.keywordAnalysis.missing.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keywordAnalysis.missing.map(kw => (
                        <Pill key={kw} color="#ef4444">✗ {kw}</Pill>
                      ))}
                      {analysis.keywordAnalysis.missing.length === 0 && <span className="text-[10px]" style={{ color: c.txM }}>No missing keywords</span>}
                    </div>
                  </Card>

                  {intel?.jobTargetAnalysis && (
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                        <Target size={14} style={{ color: c.am }} /> {intel.jobTargetAnalysis.role} Match
                      </h3>
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-extrabold" style={{ color: sc(intel.jobTargetAnalysis.matchScore) }}>
                          <CountUp end={intel.jobTargetAnalysis.matchScore} />%
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: c.txM }}>Match Score</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] font-bold mb-2" style={{ color: c.gn }}>Aligned Skills</div>
                          <div className="flex flex-wrap gap-1">{intel.jobTargetAnalysis.alignedSkills.map(s => <Pill key={s} color="#10b981">{s}</Pill>)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold mb-2" style={{ color: c.rd }}>Gap Skills</div>
                          <div className="flex flex-wrap gap-1">{intel.jobTargetAnalysis.gapSkills.map(s => <Pill key={s} color="#ef4444">{s}</Pill>)}</div>
                        </div>
                      </div>
                      {intel.jobTargetAnalysis.roleSpecificAdvice.length > 0 && (
                        <div className="mt-4">
                          <div className="text-[10px] font-bold mb-2" style={{ color: c.am }}>Role-Specific Advice</div>
                          {intel.jobTargetAnalysis.roleSpecificAdvice.map((a, i) => (
                            <div key={i} className="text-[10px] flex items-start gap-1.5 mb-1" style={{ color: c.tx2 }}><span style={{ color: c.am }}>→</span> {a}</div>
                          ))}
                        </div>
                      )}
                    </Card>
                  )}
                </motion.div>
              )}

              {/* ═══ TAB: RECRUITER ═══ */}
              {tab === "recruiter" && intel?.recruiterView && (
                <motion.div key="t-rec" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* First Impression */}
                  <Card className="p-6">
                    <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><Eye size={14} style={{ color: c.am }} /> First Impression (6-Second Scan)</h3>
                    <p className="text-sm leading-relaxed" style={{ color: c.tx2 }}>{intel.recruiterView.firstImpression}</p>
                  </Card>

                  {/* Hiring Decision */}
                  <Card className="p-5" style={{
                    background: intel.recruiterView.interviewWorthy ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
                    border: `1px solid ${intel.recruiterView.interviewWorthy ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      {intel.recruiterView.interviewWorthy ? <CheckSquare size={16} style={{ color: c.gn }} /> : <AlertCircle size={16} style={{ color: c.rd }} />}
                      <span className="text-xs font-bold" style={{ color: intel.recruiterView.interviewWorthy ? c.gn : c.rd }}>
                        {intel.recruiterView.interviewWorthy ? "Interview Worthy" : "Needs Improvement Before Applying"}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: c.tx2 }}>{intel.recruiterView.hiringDecision}</p>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top Strengths */}
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><TrendingUp size={14} style={{ color: c.gn }} /> Top Strengths</h3>
                      <div className="space-y-2">
                        {intel.recruiterView.topStrengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: c.sf }}>
                            <CheckCircle size={13} className="shrink-0 mt-0.5" style={{ color: c.gn }} />
                            <span className="text-[11px]" style={{ color: c.tx2 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                    {/* Red Flags */}
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><AlertTriangle size={14} style={{ color: c.rd }} /> Red Flags</h3>
                      <div className="space-y-2">
                        {intel.recruiterView.redFlags.length > 0 ? intel.recruiterView.redFlags.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl" style={{ background: c.sf }}>
                            <XCircle size={13} className="shrink-0 mt-0.5" style={{ color: c.rd }} />
                            <span className="text-[11px]" style={{ color: c.tx2 }}>{r}</span>
                          </div>
                        )) : <p className="text-[11px]" style={{ color: c.gn }}>No red flags detected</p>}
                      </div>
                    </Card>
                  </div>

                  {/* Readability */}
                  {intel.readabilityAnalysis && (
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><Activity size={14} style={{ color: c.am }} /> Readability Analysis</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {Object.entries(intel.readabilityAnalysis).map(([k, v]) => (
                          <div key={k} className="p-3 rounded-xl" style={{ background: c.sf }}>
                            <div className="text-[8px] font-bold uppercase tracking-widest mb-1" style={{ color: c.txM }}>{k.replace(/([A-Z])/g, " $1").trim()}</div>
                            <div className="text-xs font-semibold">{v}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </motion.div>
              )}

              {/* ═══ TAB: INSIGHTS ═══ */}
              {tab === "insights" && intel?.insights && (
                <motion.div key="t-ins" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* Missing Sections */}
                  {intel.missingSections.length > 0 && (
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2"><AlertCircle size={14} style={{ color: c.rd }} /> Missing Sections</h3>
                      <div className="space-y-2">
                        {intel.missingSections.map((ms, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: c.sf }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: ms.importance === "critical" ? c.rdBg : ms.importance === "important" ? c.amBg : c.blBg }}>
                              {ms.importance === "critical" ? <XCircle size={12} style={{ color: c.rd }} /> :
                                ms.importance === "important" ? <AlertTriangle size={12} style={{ color: c.am }} /> :
                                  <CircleDot size={12} style={{ color: c.bl }} />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-bold">{ms.section}</span>
                                <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded"
                                  style={{ background: ms.importance === "critical" ? c.rdBg : ms.importance === "important" ? c.amBg : c.blBg, color: ms.importance === "critical" ? c.rd : ms.importance === "important" ? c.am : c.bl }}>
                                  {ms.importance}
                                </span>
                              </div>
                              <div className="text-[10px] mt-0.5" style={{ color: c.tx2 }}>{ms.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Structure Analysis */}
                  {intel.structureAnalysis && (
                    <Card className="p-5">
                      <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
                        <Shield size={14} style={{ color: intel.structureAnalysis.isAtsCompatible ? c.gn : c.rd }} /> ATS Structure Analysis
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: intel.structureAnalysis.isAtsCompatible ? c.gn : c.rd }} />
                        <span className="text-[11px] font-bold" style={{ color: intel.structureAnalysis.isAtsCompatible ? c.gn : c.rd }}>
                          {intel.structureAnalysis.isAtsCompatible ? "ATS Compatible" : "ATS Incompatible"}
                        </span>
                        <span className="text-[10px]" style={{ color: c.txM }}>· {intel.structureAnalysis.overallFormat}</span>
                      </div>
                      <div className="space-y-2">
                        {intel.structureAnalysis.issues.map((iss, i) => (
                          <div key={i} className="p-3 rounded-xl" style={{ background: c.sf }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase rounded"
                                style={{ background: iss.severity === "high" ? c.rdBg : iss.severity === "medium" ? c.amBg : c.blBg, color: iss.severity === "high" ? c.rd : iss.severity === "medium" ? c.am : c.bl }}>
                                {iss.severity}
                              </span>
                              <span className="text-[11px] font-bold">{iss.issue}</span>
                            </div>
                            <div className="text-[10px] ml-6" style={{ color: c.tx2 }}>Fix: {iss.fix}</div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* 4 Quadrant Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {([
                      ["Strengths", <TrendingUp size={13} />, c.gn, intel.insights.strengths],
                      ["Weaknesses", <TrendingDown size={13} />, c.rd, intel.insights.weaknesses],
                      ["Risks", <AlertTriangle size={13} />, c.am, intel.insights.risks],
                      ["Opportunities", <Lightbulb size={13} />, c.bl, intel.insights.opportunities],
                    ] as const).map(([lbl, ic, cl, data], i) => (
                      <motion.div key={lbl} variants={AP.card} initial="init" animate="in" transition={{ delay: i * 0.06 }}
                        className="p-4 rounded-xl" style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                        <h3 className="text-[11px] font-bold mb-3 flex items-center gap-2">
                          <span style={{ color: cl }}>{ic}</span> {lbl}
                        </h3>
                        <div className="space-y-1.5">
                          {data.map((item, j) => (
                            <div key={j} className="text-[10px] flex items-start gap-1.5" style={{ color: c.tx2 }}>
                              <span style={{ color: cl }} className="mt-0.5">•</span> {item}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}


            </motion.div>
          )}

          {/* ═══════ HISTORY ═══════ */}
          {screen === "history" && (
            <motion.div key="hist" {...AP.page} transition={{ duration: 0.3 }} className="space-y-4 pt-5">
              {histLoad ? (
                <div className="flex items-center justify-center py-16">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 rounded-full border-2" style={{ borderColor: `${c.am} transparent ${c.am} ${c.am}` }} />
                </div>
              ) : history.length === 0 ? (
                <EmptyState title="No ATS Reports Yet" description="Analyze your first resume to start tracking your ATS performance."
                  actionLabel="Analyze Resume" onAction={() => setScreen("home")} illustration={<BarChart3 size={32} />} />
              ) : (
                <div className="space-y-3">
                  {history.map((r, i) => (
                    <motion.div key={r.id} variants={AP.card} initial="init" animate="in" transition={{ delay: i * 0.04 }}
                      className="p-4 rounded-xl flex items-center gap-4"
                      style={{ background: c.cb, border: `1px solid ${c.bd}`, boxShadow: c.cs }}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: scBg(r.score) }}>
                        <span className="text-lg font-extrabold" style={{ color: sc(r.score) }}>{r.score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{r.resume?.title || "Resume"}</div>
                        <div className="text-[10px]" style={{ color: c.txM }}>{new Date(r.createdAt).toLocaleDateString()} · {new Date(r.createdAt).toLocaleTimeString()}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase" style={{ background: scBg(r.score), color: sc(r.score) }}>{scLb(r.score)}</span>
                    </motion.div>
                  ))}
                </div>
              )}
              <motion.button whileHover={btnH} whileTap={btnT} onClick={() => setScreen("home")}
                className="w-full py-2.5 rounded-xl font-bold text-xs" style={{ background: c.sf, color: c.tx, border: `1px solid ${c.bd}` }}>Back to Home</motion.button>
            </motion.div>
          )}

          {/* ═══════ COMPARE ═══════ */}
          {screen === "compare" && (
            <motion.div key="cmp" {...AP.page} transition={{ duration: 0.3 }} className="space-y-5 pt-5 max-w-2xl mx-auto">
              <Card className="p-6">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><GitCompare size={16} style={{ color: c.am }} /> Compare Resume Versions</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[["Version A", cmpA, setCmpA], ["Version B", cmpB, setCmpB]].map(([lbl, val, set]) => (
                    <div key={lbl as string}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: c.tx2 }}>{lbl as string}</label>
                      <select value={val as string} onChange={e => (set as any)(e.target.value)}
                        className="w-full p-3 rounded-xl text-sm outline-none" style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx }}>
                        <option value="">Select resume...</option>
                        {resumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <motion.button whileHover={btnH} whileTap={btnT} onClick={runCompare}
                  disabled={!cmpA || !cmpB || cmpBusy}
                  className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  style={{ background: (!cmpA || !cmpB) ? c.sf : "linear-gradient(135deg,#f59e0b,#d97706)", color: (!cmpA || !cmpB) ? c.txM : "#000", border: (!cmpA || !cmpB) ? `1px solid ${c.bd}` : "none", opacity: (!cmpA || !cmpB) ? 0.5 : 1 }}>
                  <GitCompare size={14} /> {cmpBusy ? "Comparing..." : "Compare Resumes"}
                </motion.button>
              </Card>

              {cmpRes && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[{ l: "Version A", d: cmpRes.versionA }, { l: "Version B", d: cmpRes.versionB }].map(v => (
                      <Card key={v.l} className="p-5">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: c.txM }}>{v.l}</div>
                        <div className="text-3xl font-extrabold mb-2" style={{ color: sc(v.d.score) }}><CountUp end={v.d.score} /></div>
                        {v.d.strengths?.slice(0, 2).map((s: string, i: number) => (
                          <div key={i} className="text-[10px] flex items-start gap-1 mb-1" style={{ color: c.gn }}>✓ {s}</div>
                        ))}
                      </Card>
                    ))}
                  </div>
                  <Card className="p-5">
                    <div className="text-xs font-bold mb-2">Recommendation</div>
                    <p className="text-[11px]" style={{ color: c.tx2 }}>{cmpRes.recommendation}</p>
                    {cmpRes.overallImprovement !== 0 && (
                      <div className="mt-2 text-[11px] font-bold" style={{ color: cmpRes.overallImprovement > 0 ? c.gn : c.rd }}>
                        {cmpRes.overallImprovement > 0 ? "+" : ""}{cmpRes.overallImprovement} points overall
                      </div>
                    )}
                  </Card>
                </motion.div>
              )}
              <motion.button whileHover={btnH} whileTap={btnT} onClick={() => setScreen("home")}
                className="w-full py-2.5 rounded-xl font-bold text-xs" style={{ background: c.sf, color: c.tx, border: `1px solid ${c.bd}` }}>Back to Home</motion.button>
            </motion.div>
          )}

          {/* ═══════ FINAL ═══════ */}
          {screen === "final" && (
            <motion.div key="final" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto text-center space-y-6 pt-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center"
                style={{ background: c.gnBg, border: `3px solid ${c.gn}40` }}>
                <CheckCircle size={48} style={{ color: c.gn }} />
              </motion.div>
              <div>
                <h2 className="text-xl font-extrabold mb-1">Resume Improved</h2>
                <p className="text-sm" style={{ color: c.tx2 }}>Applied {applied.size} of {suggestions.length} suggestions</p>
              </div>
              <Card className="p-6">
                <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: c.txM }}>Updated ATS Score</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-5xl font-extrabold"><CountUp end={updScore} /></span>
                  <div>
                    <span className="text-lg" style={{ color: c.txM }}>/ 100</span>
                    <div className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase" style={{ background: scBg(updScore), color: sc(updScore) }}>{scLb(updScore)}</div>
                  </div>
                </div>
                {updScore > (analysis?.score || 0) && (
                  <div className="mt-2 text-sm font-bold" style={{ color: c.gn }}>+{updScore - (analysis?.score || 0)} points improved</div>
                )}
              </Card>
              <motion.div variants={AP.stagger.in} initial="init" animate="in" className="grid grid-cols-2 gap-3">
                {[
                  ["Save Resume", <Save size={14} />],
                  ["Download PDF", <Download size={14} />],
                  ["Download DOCX", <Download size={14} />],
                  ["Resume Builder", <FileText size={14} />],
                ].map(([l, ic], i) => (
                  <motion.button key={l as string} variants={AP.card} whileHover={btnH} whileTap={btnT}
                    onClick={i === 3 ? () => setView("resume-builder") : undefined}
                    className="py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                    style={{ background: i === 3 ? c.am : c.sf, color: i === 3 ? "#000" : c.tx, border: `1px solid ${c.bd}` }}>
                    {ic} {l}
                  </motion.button>
                ))}
              </motion.div>
              <motion.button whileHover={btnH} whileTap={btnT} onClick={resetAll}
                className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: c.am }}>
                <RefreshCw size={14} /> Analyze Another Resume
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ═══════ AI CHAT ═══════ */}
      {(screen === "dashboard") && (
        <>
          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={() => setChatOpen(!chatOpen)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-50"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#000", boxShadow: "0 4px 24px rgba(245,158,11,0.35)" }}>
            {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.button>
          <AnimatePresence>
            {chatOpen && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.2 }}
                className="fixed bottom-24 right-6 w-80 sm:w-96 rounded-2xl shadow-2xl z-50 overflow-hidden"
                style={{ background: c.chat, border: `1px solid ${c.bd}`, maxHeight: "60vh", display: "flex", flexDirection: "column" }}>
                <div className="flex items-center justify-between p-3" style={{ borderBottom: `1px solid ${c.dv}` }}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} style={{ color: c.am }} />
                    <span className="text-sm font-bold">AI ATS Assistant</span>
                  </div>
                  <button onClick={() => setChatOpen(false)} className="p-1 rounded-lg" style={{ color: c.txM }}><X size={14} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 200, maxHeight: 350 }}>
                  {chatMsgs.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px]" style={{ color: c.txM }}>Ask me anything. Try:</p>
                      {["Improve ATS score", "Optimize for Google", "Rewrite Summary", "Add Missing Keywords"].map((s, i) => (
                        <motion.button key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                          whileHover={{ scale: 1.02 }} onClick={() => setChatIn(s)}
                          className="block w-full text-left p-2 rounded-lg text-[11px] font-medium"
                          style={{ background: "rgba(245,158,11,0.06)", color: c.am, border: `1px solid rgba(245,158,11,0.12)` }}>
                          <Sparkles size={9} className="inline mr-1.5" />{s}
                        </motion.button>
                      ))}
                    </div>
                  )}
                  {chatMsgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${m.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                        style={{ background: m.role === "user" ? c.am : c.sf, color: m.role === "user" ? "#000" : c.tx, border: m.role === "user" ? "none" : `1px solid ${c.bd}` }}>
                        {stripMarkdown(m.content)}
                      </div>
                    </div>
                  ))}
                  {chatBusy && <div className="flex justify-start"><div className="p-2.5 rounded-xl rounded-bl-sm" style={{ background: c.sf, border: `1px solid ${c.bd}` }}><Dots /></div></div>}
                  <div ref={chatEnd} />
                </div>
                <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${c.dv}` }}>
                  <input value={chatIn} onChange={e => setChatIn(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendChat()}
                    placeholder="Ask about your ATS score..."
                    className="flex-1 p-2.5 rounded-xl text-xs outline-none"
                    style={{ background: c.sf, border: `1px solid ${c.bd}`, color: c.tx }} />
                  <motion.button whileHover={btnH} whileTap={btnT} onClick={sendChat}
                    disabled={chatBusy || !chatIn.trim()}
                    className="p-2.5 rounded-xl flex items-center justify-center"
                    style={{ background: c.am, color: "#000", opacity: chatBusy || !chatIn.trim() ? 0.5 : 1 }}>
                    <Send size={14} />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
