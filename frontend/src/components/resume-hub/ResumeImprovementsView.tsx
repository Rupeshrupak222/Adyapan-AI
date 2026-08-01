"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import confetti from "canvas-confetti";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { mkColors } from "@/utils/themeColors";
import { fadeUp, scaleIn, buttonHover } from "@/utils/animations";
import { EmptyState } from "@/components/ui/PremiumComponents";
import {
  Sparkles, FileText, Target, Zap, CheckCircle2, ArrowRight,
  RotateCcw, ChevronDown, ChevronUp, Eye, EyeOff, Copy, Check,
  TrendingUp, BarChart3, AlertTriangle, Lightbulb, Award,
  RefreshCw, Download, History, GitCompare, Layers, Search,
  Star, Briefcase, GraduationCap, Code2, Trophy, X, Plus,
  ArrowLeftRight, Undo2, Redo2, BookOpen, Wrench, Type
} from "lucide-react";

interface SectionImprovement {
  section: string;
  sectionTitle: string;
  currentContent: string;
  improvedContent: string;
  whyImprove: string;
  recruiterPerspective: string;
  atsImpact: string;
  interviewImpact: string;
  expectedBenefit: string;
  scoreBefore: number;
  scoreAfter: number;
  category: string;
  priority: "high" | "medium" | "low";
  applied: boolean;
}

interface ImprovementResult {
  overallScoreBefore: number;
  overallScoreAfter: number;
  improvements: SectionImprovement[];
  summaryImprovements: {
    versions: Array<{ label: string; content: string; targetRole: string }>;
  };
  keywordOptimization: {
    missingKeywords: string[];
    suggestedKeywords: string[];
    weakKeywords: string[];
    strongKeywords: string[];
    oneClickInsertions: Array<{ keyword: string; where: string; reason: string }>;
  };
  bulletRewrites: Array<{
    original: string;
    shortVersion: string;
    professionalVersion: string;
    impactVersion: string;
    faangVersion: string;
    section: string;
  }>;
  actionVerbReplacements: Array<{
    original: string;
    improved: string;
    section: string;
  }>;
  metricEnhancements: Array<{
    original: string;
    suggested: string;
    metric: string;
    section: string;
  }>;
  improvementScore: {
    resumeQuality: { before: number; after: number };
    atsScore: { before: number; after: number };
    recruiterAppeal: { before: number; after: number };
    technicalQuality: { before: number; after: number };
    readability: { before: number; after: number };
  };
}

const LOAD_STEPS = [
  "Analyzing Resume",
  "Reviewing ATS Report",
  "Scanning Sections",
  "Generating Improvements",
  "Optimizing Keywords",
  "Rewriting Bullets",
  "Calculating New Scores",
  "Preparing Suggestions",
];

export function ResumeImprovementsView({ setView }: { setView: (v: string) => void }) {
  const theme = useTheme();
  const c = mkColors(theme);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState<ImprovementResult | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [targetRole, setTargetRole] = useState("Software Engineer");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [activeTab, setActiveTab] = useState<"improvements" | "summary" | "keywords" | "bullets" | "verbs" | "metrics" | "versions">("improvements");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [appliedImprovements, setAppliedImprovements] = useState<Set<number>>(new Set());
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [selectedSummary, setSelectedSummary] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [resumes, setResumes] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get("/resume/list"),
      api.get("/resume-upload/list"),
    ]).then(([builderRes, uploadRes]) => {
      const builderResumes = builderRes.status === "fulfilled"
        ? (builderRes.value.data.resumes || [])
        : [];
      const uploadedResumes = uploadRes.status === "fulfilled" && uploadRes.value.data.success
        ? (uploadRes.value.data.resumes || []).map((u: any) => ({
            id: u.id,
            title: u.fileName,
            template: "Uploaded",
            updatedAt: u.createdAt,
          }))
        : [];
      const allIds = new Set(builderResumes.map((r: any) => r.id));
      const merged = [...builderResumes, ...uploadedResumes.filter((u: any) => !allIds.has(u.id))];
      setResumes(merged);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const pendingId = sessionStorage.getItem("pendingResumeUploadId");
    if (pendingId) {
      sessionStorage.removeItem("pendingResumeUploadId");
      setResumeId(pendingId);
      const timer = setTimeout(() => generateImprovementsWithId(pendingId), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  // Theme colors now come from centralized mkColors via `c`
  const isDark = c.d;
  const bg = c.d ? "#070913" : "#f8fafc";
  const cardBg = c.cardBg;
  const cardBorder = c.border;
  const textPrimary = c.text;
  const textSecondary = c.textSec;
  const textMuted = c.textMuted;
  const amber = c.amber;
  const green = c.green;
  const rose = c.rose;
  const cyan = c.cyan;
  const purple = c.purple;
  const inputBg = c.inputBg;
  const inputBorder = c.border;

  // Animate loading steps
  useEffect(() => {
    if (!loading) return;
    setLoadStep(0);
    const interval = setInterval(() => {
      setLoadStep(prev => {
        if (prev >= LOAD_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const generateImprovements = async () => {
    await generateImprovementsWithId(resumeId);
  };

  const generateImprovementsWithId = async (explicitResumeId: string) => {
    setLoading(true);
    try {
      const res = await api.post("/resume-improvements/generate", {
        resumeId: explicitResumeId || undefined,
        targetRole,
        targetIndustry: targetIndustry || undefined,
        targetCompany: targetCompany || undefined,
      });
      if (res.data?.result) {
        setResult(res.data.result);
        showToast("Improvements generated successfully!");
        try {
          confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 }, colors: ["#f59e0b", "#ea580c", "#10b981"] });
        } catch { /* confetti blocked */ }
      } else {
        console.error("[ResumeImprovements] No result in response:", res.data);
        showToast("No improvements returned. Please try again.");
      }
    } catch (err: any) {
      console.error("[ResumeImprovements] Generate error:", err?.response?.data || err.message || err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to generate improvements";
      showToast(msg);
    } finally {
      setLoading(false);
    }
  };

  const applyImprovement = async (improvement: SectionImprovement, index: number) => {
    try {
      await api.post("/resume-improvements/apply", {
        resumeId: resumeId || undefined,
        improvementId: result?.improvements?.[index]?.section,
        section: improvement.section,
        currentContent: improvement.currentContent,
        improvedContent: improvement.improvedContent,
      });
      setAppliedImprovements(prev => new Set([...prev, index]));
      showToast(`Applied: ${improvement.sectionTitle}`);
      setTimeout(() => {
        sessionStorage.setItem("pendingResumeId", resumeId || "");
        setView("resume-builder");
      }, 1200);
    } catch {
      showToast("Failed to apply improvement");
    }
  };

  const applyAllImprovements = async () => {
    if (!result) return;
    try {
      const improvements = result.improvements
        .filter((_, i) => !appliedImprovements.has(i))
        .map(imp => ({
          section: imp.section,
          currentContent: imp.currentContent,
          improvedContent: imp.improvedContent,
        }));
      if (improvements.length === 0) {
        showToast("All improvements already applied!");
        return;
      }
      await api.post("/resume-improvements/apply-all", {
        resumeId: resumeId || undefined,
        improvements,
      });
      setAppliedImprovements(new Set(result.improvements.map((_, i) => i)));
      showToast(`Applied ${improvements.length} improvements!`);
      setTimeout(() => {
        sessionStorage.setItem("pendingResumeId", resumeId || "");
        setView("resume-builder");
      }, 1200);
    } catch {
      showToast("Failed to apply all improvements");
    }
  };

  const applyKeyword = async (keyword: string, where: string) => {
    try {
      await api.post("/resume-improvements/apply", {
        resumeId: resumeId || undefined,
        section: where.toLowerCase(),
        currentContent: "",
        improvedContent: keyword,
      });
      showToast(`Added keyword: ${keyword}`);
      setTimeout(() => {
        sessionStorage.setItem("pendingResumeId", resumeId || "");
        setView("resume-builder");
      }, 1200);
    } catch {
      showToast("Failed to add keyword");
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const [histRes, verRes] = await Promise.all([
        api.get("/resume-improvements/history"),
        api.get("/resume-improvements/versions"),
      ]);
      setHistory(histRes.data.improvements || []);
      setVersions(verRes.data.versions || []);
    } catch {
      showToast("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      await api.post("/resume-improvements/restore", { versionId });
      showToast("Version restored successfully!");
      loadHistory();
    } catch {
      showToast("Failed to restore version");
    }
  };

  const loadComparison = async (vA: string, vB: string) => {
    try {
      const res = await api.post("/resume-improvements/compare", {
        versionIdA: vA,
        versionIdB: vB,
      });
      setComparisonData(res.data.comparison);
      setShowComparison(true);
    } catch {
      showToast("Failed to load comparison");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return green;
    if (score >= 60) return amber;
    return rose;
  };

  const getPriorityColor = (p: string) => {
    if (p === "high") return rose;
    if (p === "medium") return amber;
    return cyan;
  };

  const getSectionIcon = (section: string) => {
    const map: Record<string, any> = {
      summary: FileText,
      projects: Code2,
      experience: Briefcase,
      skills: Wrench,
      keywords: Search,
      education: GraduationCap,
      achievements: Trophy,
      certifications: Award,
      formatting: Type,
    };
    return map[section] || Sparkles;
  };

  // ─── Loading Screen ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: "1.5rem", padding: "2rem" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ width: 56, height: 56, borderRadius: "50%", border: `3px solid ${cardBorder}`, borderTopColor: amber }}
        />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: "center" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: textPrimary, marginBottom: "0.5rem" }}>
            AI Resume Improvement Engine
          </h3>
          <p style={{ fontSize: "0.85rem", color: textSecondary }}>
            {LOAD_STEPS[loadStep]}...
          </p>
        </motion.div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%", maxWidth: 320 }}>
          {LOAD_STEPS.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: i <= loadStep ? 1 : 0.3, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.78rem" }}
            >
              {i < loadStep ? (
                <CheckCircle2 size={14} color={green} />
              ) : i === loadStep ? (
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${amber}`, borderTopColor: "transparent" }} />
                </motion.div>
              ) : (
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${cardBorder}` }} />
              )}
              <span style={{ color: i <= loadStep ? textPrimary : textMuted, fontWeight: i === loadStep ? 600 : 400 }}>
                {step}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Setup Screen ──────────────────────────────────────────────────────
  if (!result) {
    return (
      <div style={{ padding: "1.5rem", maxWidth: 800, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <button onClick={() => setView("ats-checker")} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary, display: "flex" }}>
              <ArrowLeftRight size={18} style={{ transform: "rotate(180deg)" }} />
            </button>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: textPrimary, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Sparkles size={22} color={amber} /> Resume Improvement Engine
              </h1>
              <p style={{ fontSize: "0.85rem", color: textSecondary, marginTop: "0.25rem" }}>
                Transform your resume with AI-powered coaching
              </p>
            </div>
          </div>

          {/* Workflow diagram */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {["Resume", "ATS Analysis", "AI Improvements", "Preview", "Apply", "Better Resume"].map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{
                  padding: "0.35rem 0.75rem", borderRadius: 8, fontSize: "0.72rem", fontWeight: 600,
                  background: i < 3 ? `${amber}15` : `${green}15`,
                  color: i < 3 ? amber : green,
                  border: `1px solid ${i < 3 ? amber : green}30`,
                }}>
                  {step}
                </div>
                {i < 5 && <ArrowRight size={12} color={textMuted} />}
              </div>
            ))}
          </div>

          {/* Form */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: textPrimary, marginBottom: "1rem" }}>
              Configure Improvement Analysis
            </h3>

            {/* Resume selector */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: textSecondary, marginBottom: "0.35rem" }}>
                Select Resume
              </label>
              <select
                value={resumeId}
                onChange={e => setResumeId(e.target.value)}
                style={{
                  width: "100%", padding: "0.6rem 0.8rem", borderRadius: 10,
                  background: inputBg, border: `1px solid ${inputBorder}`,
                  color: textPrimary, fontSize: "0.85rem", outline: "none",
                }}
              >
                <option value="">Use Latest Resume</option>
                {resumes.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            {/* Target role */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: textSecondary, marginBottom: "0.35rem" }}>
                Target Role
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
                placeholder="e.g. Software Engineer, AI Engineer, Data Analyst"
                style={{
                  width: "100%", padding: "0.6rem 0.8rem", borderRadius: 10,
                  background: inputBg, border: `1px solid ${inputBorder}`,
                  color: textPrimary, fontSize: "0.85rem", outline: "none",
                }}
              />
            </div>

            {/* Target industry & company */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: textSecondary, marginBottom: "0.35rem" }}>
                  Target Industry
                </label>
                <input
                  type="text"
                  value={targetIndustry}
                  onChange={e => setTargetIndustry(e.target.value)}
                  placeholder="e.g. Tech, Finance, Healthcare"
                  style={{
                    width: "100%", padding: "0.6rem 0.8rem", borderRadius: 10,
                    background: inputBg, border: `1px solid ${inputBorder}`,
                    color: textPrimary, fontSize: "0.85rem", outline: "none",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: textSecondary, marginBottom: "0.35rem" }}>
                  Target Company
                </label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={e => setTargetCompany(e.target.value)}
                  placeholder="e.g. Google, Amazon, Microsoft"
                  style={{
                    width: "100%", padding: "0.6rem 0.8rem", borderRadius: 10,
                    background: inputBg, border: `1px solid ${inputBorder}`,
                    color: textPrimary, fontSize: "0.85rem", outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Generate button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={generateImprovements}
              style={{
                width: "100%", padding: "0.75rem", borderRadius: 12,
                background: `linear-gradient(135deg, ${amber}, #d97706)`,
                color: "#fff", fontWeight: 700, fontSize: "0.9rem",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              <Sparkles size={18} /> Generate AI Improvements
            </motion.button>

            {/* History link */}
            <button
              onClick={() => { loadHistory(); setActiveTab("versions"); }}
              style={{
                width: "100%", padding: "0.6rem", borderRadius: 12,
                background: "transparent", border: `1px solid ${inputBorder}`,
                color: textSecondary, fontWeight: 600, fontSize: "0.82rem",
                cursor: "pointer", marginTop: "0.75rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              }}
            >
              <History size={15} /> View Improvement History
            </button>
          </div>
        </motion.div>

        {toast && <Toast message={toast} onClose={() => setToast("")} />}

        <style>{`
          select option {
            background: ${isDark ? "#0d151c" : "#fff"};
            color: ${textPrimary};
          }
        `}</style>
      </div>
    );
  }

  // ─── Results View ──────────────────────────────────────────────────────
  const tabs = [
    { id: "improvements" as const, label: "Improvements", icon: Sparkles, count: result.improvements.length },
    { id: "summary" as const, label: "Summary", icon: FileText, count: result.summaryImprovements.versions.length },
    { id: "keywords" as const, label: "Keywords", icon: Search, count: result.keywordOptimization.missingKeywords.length },
    { id: "bullets" as const, label: "Bullets", icon: Target, count: result.bulletRewrites.length },
    { id: "verbs" as const, label: "Action Verbs", icon: Zap, count: result.actionVerbReplacements.length },
    { id: "metrics" as const, label: "Metrics", icon: BarChart3, count: result.metricEnhancements.length },
    { id: "versions" as const, label: "Versions", icon: History, count: versions.length },
  ];

  return (
    <div style={{ padding: "1rem 1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button onClick={() => setResult(null)} style={{ background: "none", border: "none", cursor: "pointer", color: textSecondary, display: "flex" }}>
              <ArrowLeftRight size={18} style={{ transform: "rotate(180deg)" }} />
            </button>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: textPrimary, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Sparkles size={20} color={amber} /> Resume Improvements
            </h2>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={applyAllImprovements}
              style={{
                padding: "0.5rem 1rem", borderRadius: 10,
                background: `linear-gradient(135deg, ${green}, #16a34a)`,
                color: "#fff", fontWeight: 700, fontSize: "0.8rem",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              <CheckCircle2 size={15} /> Apply All
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setResult(null); loadHistory(); }}
              style={{
                padding: "0.5rem 1rem", borderRadius: 10,
                background: inputBg, border: `1px solid ${inputBorder}`,
                color: textSecondary, fontWeight: 600, fontSize: "0.8rem",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: "0.4rem",
              }}
            >
              <RefreshCw size={14} /> Re-Analyze
            </motion.button>
          </div>
        </div>

        {/* Score comparison card */}
        {result.improvements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: cardBg, border: `1px solid ${cardBorder}`,
            borderRadius: 16, padding: "1.25rem", marginBottom: "1rem",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem",
          }}
        >
          {Object.entries(result.improvementScore).map(([key, val]) => {
            const labels: Record<string, string> = {
              resumeQuality: "Resume Quality",
              atsScore: "ATS Score",
              recruiterAppeal: "Recruiter Appeal",
              technicalQuality: "Technical Quality",
              readability: "Readability",
            };
            const delta = val.after - val.before;
            return (
              <div key={key} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.3rem" }}>
                  {labels[key] || key}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "1.4rem", fontWeight: 800, color: getScoreColor(val.before) }}>{val.before}</span>
                  <ArrowRight size={14} color={textMuted} />
                  <span style={{ fontSize: "1.4rem", fontWeight: 800, color: getScoreColor(val.after) }}>{val.after}</span>
                </div>
                <div style={{
                  fontSize: "0.72rem", fontWeight: 700, color: green,
                  marginTop: "0.2rem",
                }}>
                  +{delta} points
                </div>
              </div>
            );
          })}
        </motion.div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex", gap: "0.25rem", marginBottom: "1rem",
          overflowX: "auto", paddingBottom: "0.25rem",
          borderBottom: `1px solid ${cardBorder}`,
        }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "versions" && versions.length === 0) loadHistory();
                }}
                style={{
                  padding: "0.5rem 0.9rem", borderRadius: "10px 10px 0 0",
                  background: isActive ? (isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.08)") : "transparent",
                  border: "none", cursor: "pointer",
                  color: isActive ? amber : textSecondary,
                  fontWeight: 600, fontSize: "0.78rem",
                  display: "flex", alignItems: "center", gap: "0.35rem",
                  borderBottom: isActive ? `2px solid ${amber}` : "2px solid transparent",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} /> {tab.label}
                {tab.count > 0 && (
                  <span style={{
                    fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: 10,
                    background: isActive ? `${amber}20` : `${textMuted}20`,
                    color: isActive ? amber : textMuted,
                  }}>
                    {tab.count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>

            {/* ── IMPROVEMENTS TAB ──────────────────────────────────── */}
            {activeTab === "improvements" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {result.improvements.length === 0 ? (
                  <EmptyStateCard text="No improvements found. Your resume is already well-optimized!" />
                ) : (
                  result.improvements.map((imp, i) => {
                    const Icon = getSectionIcon(imp.section);
                    const isExpanded = expandedCard === i;
                    const isApplied = appliedImprovements.has(i);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                          background: cardBg,
                          border: `1px solid ${isApplied ? `${green}40` : cardBorder}`,
                          borderRadius: 14,
                          overflow: "hidden",
                          transition: "border-color 0.3s",
                        }}
                      >
                        {/* Card header */}
                        <div
                          onClick={() => setExpandedCard(isExpanded ? null : i)}
                          style={{
                            padding: "0.9rem 1rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: `${getPriorityColor(imp.priority)}12`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Icon size={18} color={getPriorityColor(imp.priority)} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: textPrimary }}>
                                {imp.sectionTitle}
                              </span>
                              <span style={{
                                fontSize: "0.65rem", padding: "0.1rem 0.45rem", borderRadius: 6,
                                background: `${getPriorityColor(imp.priority)}15`,
                                color: getPriorityColor(imp.priority),
                                fontWeight: 600, textTransform: "uppercase",
                              }}>
                                {imp.priority}
                              </span>
                              {isApplied && (
                                <span style={{ fontSize: "0.65rem", padding: "0.1rem 0.45rem", borderRadius: 6, background: `${green}15`, color: green, fontWeight: 600 }}>
                                  Applied
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                              <ScorePill label="Before" score={imp.scoreBefore} />
                              <ArrowRight size={10} color={textMuted} />
                              <ScorePill label="After" score={imp.scoreAfter} />
                              <span style={{ fontSize: "0.72rem", color: green, fontWeight: 700 }}>+{imp.atsImpact}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
                            {!isApplied && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={e => { e.stopPropagation(); applyImprovement(imp, i); }}
                                style={{
                                  padding: "0.35rem 0.7rem", borderRadius: 8,
                                  background: `linear-gradient(135deg, ${amber}, #d97706)`,
                                  color: "#fff", fontWeight: 700, fontSize: "0.72rem",
                                  border: "none", cursor: "pointer",
                                }}
                              >
                                Apply
                              </motion.button>
                            )}
                            {isExpanded ? <ChevronUp size={16} color={textMuted} /> : <ChevronDown size={16} color={textMuted} />}
                          </div>
                        </div>

                        {/* Expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div style={{ padding: "0 1rem 1rem", borderTop: `1px solid ${cardBorder}` }}>
                                {/* Before / After comparison */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                                  <ComparisonBox label="Current" content={imp.currentContent} bg={`${rose}08`} border={`${rose}20`} textColor={textPrimary} onCopy={() => copyText(imp.currentContent, `current-${i}`)} copied={copiedIndex === `current-${i}`} />
                                  <ComparisonBox label="AI Improved" content={imp.improvedContent} bg={`${green}08`} border={`${green}20`} textColor={textPrimary} onCopy={() => copyText(imp.improvedContent, `improved-${i}`)} copied={copiedIndex === `improved-${i}`} />
                                </div>

                                {/* Explanations */}
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.75rem" }}>
                                  <ExplanationCard icon={<AlertTriangle size={14} color={amber} />} label="Why Improve?" text={imp.whyImprove} />
                                  <ExplanationCard icon={<Eye size={14} color={purple} />} label="Recruiter Perspective" text={imp.recruiterPerspective} />
                                  <ExplanationCard icon={<TrendingUp size={14} color={green} />} label="ATS Impact" text={imp.atsImpact} />
                                  <ExplanationCard icon={<Target size={14} color={cyan} />} label="Interview Impact" text={imp.interviewImpact} />
                                  <ExplanationCard icon={<Lightbulb size={14} color={amber} />} label="Expected Benefit" text={imp.expectedBenefit} />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {/* ── SUMMARY TAB ──────────────────────────────────── */}
            {activeTab === "summary" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {result.summaryImprovements.versions.length === 0 ? (
                  <EmptyStateCard text="No summary versions generated." />
                ) : (
                  result.summaryImprovements.versions.map((ver, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedSummary(i)}
                      style={{
                        background: selectedSummary === i ? `${amber}08` : cardBg,
                        border: `1px solid ${selectedSummary === i ? `${amber}40` : cardBorder}`,
                        borderRadius: 14, padding: "1rem",
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: textPrimary }}>{ver.label}</span>
                          {selectedSummary === i && <CheckCircle2 size={14} color={amber} />}
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={e => { e.stopPropagation(); applyImprovement({ section: "summary", sectionTitle: "Summary", currentContent: "", improvedContent: ver.content, whyImprove: "", recruiterPerspective: "", atsImpact: "", interviewImpact: "", expectedBenefit: "", scoreBefore: 0, scoreAfter: 0, category: "summary", priority: "high", applied: false }, i); }}
                          style={{
                            padding: "0.3rem 0.65rem", borderRadius: 8,
                            background: `${green}15`, color: green,
                            fontWeight: 700, fontSize: "0.72rem",
                            border: `1px solid ${green}30`, cursor: "pointer",
                          }}
                        >
                          Use This
                        </motion.button>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: textSecondary, lineHeight: 1.6 }}>
                        {stripMarkdown(ver.content)}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ── KEYWORDS TAB ──────────────────────────────────── */}
            {activeTab === "keywords" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <KeywordSection
                  title="Missing Keywords"
                  subtitle="Add these to improve ATS matching"
                  keywords={result.keywordOptimization.missingKeywords}
                  color={rose}
                  icon={<Plus size={14} />}
                  onAction={(kw) => {
                    const insertion = result.keywordOptimization.oneClickInsertions.find(s => s.keyword === kw);
                    applyKeyword(kw, insertion?.where || "skills");
                  }}
                  isDark={isDark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />
                <KeywordSection
                  title="Suggested Keywords"
                  subtitle="Consider adding naturally"
                  keywords={result.keywordOptimization.suggestedKeywords}
                  color={amber}
                  icon={<Lightbulb size={14} />}
                  onAction={(kw) => applyKeyword(kw, "skills")}
                  isDark={isDark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />
                <KeywordSection
                  title="Weak Keywords"
                  subtitle="Mentioned but not well supported"
                  keywords={result.keywordOptimization.weakKeywords}
                  color={purple}
                  icon={<AlertTriangle size={14} />}
                  isDark={isDark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />
                <KeywordSection
                  title="Strong Keywords"
                  subtitle="Well supported by your content"
                  keywords={result.keywordOptimization.strongKeywords}
                  color={green}
                  icon={<CheckCircle2 size={14} />}
                  isDark={isDark}
                  textPrimary={textPrimary}
                  textSecondary={textSecondary}
                  cardBg={cardBg}
                  cardBorder={cardBorder}
                />

                {/* One-click insertions */}
                {result.keywordOptimization.oneClickInsertions.length > 0 && (
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "1rem" }}>
                    <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: textPrimary, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <Zap size={15} color={amber} /> One-Click Insertions
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {result.keywordOptimization.oneClickInsertions.map((ins, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.7rem", borderRadius: 10, background: inputBg, border: `1px solid ${cardBorder}` }}>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: "0.82rem", color: textPrimary }}>{ins.keyword}</span>
                            <span style={{ fontSize: "0.72rem", color: textMuted, marginLeft: "0.5rem" }}>→ {ins.where}</span>
                            <p style={{ fontSize: "0.72rem", color: textSecondary, margin: "0.15rem 0 0" }}>{ins.reason}</p>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => applyKeyword(ins.keyword, ins.where)}
                            style={{
                              padding: "0.3rem 0.65rem", borderRadius: 8,
                              background: `${green}15`, color: green,
                              fontWeight: 700, fontSize: "0.72rem",
                              border: `1px solid ${green}30`, cursor: "pointer", flexShrink: 0,
                            }}
                          >
                            + Add
                          </motion.button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── BULLETS TAB ──────────────────────────────────── */}
            {activeTab === "bullets" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {result.bulletRewrites.length === 0 ? (
                  <EmptyStateCard text="No bullet rewrites generated." />
                ) : (
                  result.bulletRewrites.map((bullet, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "1rem" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.45rem", borderRadius: 6, background: `${cyan}15`, color: cyan, fontWeight: 600 }}>{bullet.section}</span>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: textSecondary, marginBottom: "0.75rem", lineHeight: 1.5 }}>
                        <span style={{ color: textMuted, fontWeight: 600 }}>Original: </span>{bullet.original}
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        {[
                          { label: "Short", content: bullet.shortVersion, color: cyan },
                          { label: "Professional", content: bullet.professionalVersion, color: amber },
                          { label: "Impact", content: bullet.impactVersion, color: green },
                          { label: "FAANG", content: bullet.faangVersion, color: purple },
                        ].map((v) => (
                          <div key={v.label} style={{ padding: "0.6rem", borderRadius: 10, background: `${v.color}08`, border: `1px solid ${v.color}20`, position: "relative" }}>
                            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: v.color, marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{v.label}</div>
                            <p style={{ fontSize: "0.78rem", color: textPrimary, lineHeight: 1.5 }}>{stripMarkdown(v.content)}</p>
                            <button
                              onClick={() => copyText(v.content, `bullet-${i}-${v.label}`)}
                              style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: textMuted, padding: 2 }}
                            >
                              {copiedIndex === `bullet-${i}-${v.label}` ? <Check size={12} color={green} /> : <Copy size={12} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ── ACTION VERBS TAB ──────────────────────────────── */}
            {activeTab === "verbs" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {result.actionVerbReplacements.length === 0 ? (
                  <EmptyStateCard text="No verb replacements needed." />
                ) : (
                  <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: "0.5rem", padding: "0.75rem 1rem", borderBottom: `1px solid ${cardBorder}`, fontSize: "0.72rem", fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span>Weak Verb</span><span />
                      <span>Strong Verb</span><span>Section</span>
                    </div>
                    {result.actionVerbReplacements.map((rep, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        style={{
                          display: "grid", gridTemplateColumns: "1fr auto 1fr auto",
                          gap: "0.5rem", padding: "0.6rem 1rem",
                          borderBottom: i < result.actionVerbReplacements.length - 1 ? `1px solid ${cardBorder}` : "none",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "0.82rem", color: rose, textDecoration: "line-through" }}>{rep.original}</span>
                        <ArrowRight size={14} color={textMuted} />
                        <span style={{ fontSize: "0.82rem", color: green, fontWeight: 700 }}>{rep.improved}</span>
                        <span style={{ fontSize: "0.72rem", color: textMuted, padding: "0.1rem 0.45rem", borderRadius: 6, background: inputBg }}>{rep.section}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── METRICS TAB ──────────────────────────────────── */}
            {activeTab === "metrics" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {result.metricEnhancements.length === 0 ? (
                  <EmptyStateCard text="No metric enhancements needed." />
                ) : (
                  result.metricEnhancements.map((met, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "1rem" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                        <BarChart3 size={14} color={amber} />
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: textMuted, textTransform: "uppercase" }}>{met.section}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "0.75rem", alignItems: "center" }}>
                        <div style={{ padding: "0.6rem", borderRadius: 10, background: `${rose}08`, border: `1px solid ${rose}20` }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: rose, marginBottom: "0.2rem" }}>Before</div>
                          <p style={{ fontSize: "0.82rem", color: textPrimary }}>{met.original}</p>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
                          <ArrowRight size={16} color={amber} />
                          <span style={{ fontSize: "0.65rem", color: amber, fontWeight: 700 }}>{met.metric}</span>
                        </div>
                        <div style={{ padding: "0.6rem", borderRadius: 10, background: `${green}08`, border: `1px solid ${green}20` }}>
                          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: green, marginBottom: "0.2rem" }}>Suggested</div>
                          <p style={{ fontSize: "0.82rem", color: textPrimary }}>{met.suggested}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* ── VERSIONS TAB ──────────────────────────────────── */}
            {activeTab === "versions" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {historyLoading ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: textMuted }}>
                    <RefreshCw size={20} className="animate-spin" style={{ marginBottom: "0.5rem" }} />
                    <p style={{ fontSize: "0.82rem" }}>Loading history...</p>
                  </div>
                ) : versions.length === 0 ? (
                  <EmptyStateCard text="No versions yet. Improvements are saved as versions when applied." />
                ) : (
                  versions.map((ver: any, i: number) => (
                    <motion.div
                      key={ver.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "1rem" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: textPrimary }}>Version {ver.versionNumber}</span>
                            {ver.atsScoreBefore && ver.atsScoreAfter && (
                              <span style={{ fontSize: "0.72rem", color: green, fontWeight: 700 }}>
                                ATS {ver.atsScoreBefore} → {ver.atsScoreAfter}
                              </span>
                            )}
                          </div>
                          <p style={{ fontSize: "0.78rem", color: textSecondary, marginTop: "0.2rem" }}>{ver.changeSummary || "No description"}</p>
                          <p style={{ fontSize: "0.7rem", color: textMuted, marginTop: "0.15rem" }}>
                            {new Date(ver.createdAt).toLocaleDateString()} {new Date(ver.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => restoreVersion(ver.id)}
                            style={{
                              padding: "0.35rem 0.7rem", borderRadius: 8,
                              background: `${amber}15`, color: amber,
                              fontWeight: 700, fontSize: "0.72rem",
                              border: `1px solid ${amber}30`, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: "0.3rem",
                            }}
                          >
                            <Undo2 size={12} /> Restore
                          </motion.button>
                          {i > 0 && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => loadComparison(versions[i - 1].id, ver.id)}
                              style={{
                                padding: "0.35rem 0.7rem", borderRadius: 8,
                                background: inputBg, border: `1px solid ${cardBorder}`,
                                color: textSecondary, fontWeight: 600, fontSize: "0.72rem",
                                cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "0.3rem",
                              }}
                            >
                              <GitCompare size={12} /> Compare
                            </motion.button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Comparison modal */}
        <AnimatePresence>
          {showComparison && comparisonData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", padding: "1rem" }}
              onClick={() => setShowComparison(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                  width: "100%", maxWidth: 800, maxHeight: "80vh", overflow: "auto",
                  background: isDark ? "#0d151c" : "#ffffff",
                  border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "1.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: textPrimary }}>Version Comparison</h3>
                  <button onClick={() => setShowComparison(false)} style={{ background: "none", border: "none", cursor: "pointer", color: textMuted }}>
                    <X size={18} />
                  </button>
                </div>
                {comparisonData.identical ? (
                  <p style={{ color: textSecondary, textAlign: "center", padding: "2rem" }}>Versions are identical.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {comparisonData.differences?.map((diff: any, i: number) => (
                      <div key={i} style={{ padding: "0.75rem", borderRadius: 10, background: inputBg, border: `1px solid ${cardBorder}` }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: amber, marginBottom: "0.5rem", textTransform: "capitalize" }}>{diff.section}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          <div style={{ padding: "0.5rem", borderRadius: 8, background: `${rose}08`, border: `1px solid ${rose}20` }}>
                            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: rose, marginBottom: "0.2rem" }}>Version A</div>
                            <pre style={{ fontSize: "0.75rem", color: textPrimary, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
                              {JSON.stringify(diff.versionA, null, 2)?.substring(0, 200)}
                            </pre>
                          </div>
                          <div style={{ padding: "0.5rem", borderRadius: 8, background: `${green}08`, border: `1px solid ${green}20` }}>
                            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: green, marginBottom: "0.2rem" }}>Version B</div>
                            <pre style={{ fontSize: "0.75rem", color: textPrimary, whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
                              {JSON.stringify(diff.versionB, null, 2)?.substring(0, 200)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}

      <style>{`
        @media (max-width: 768px) {
          .resume-improvement-grid { grid-template-columns: 1fr !important; }
        }
        select option {
          background: ${isDark ? "#0d151c" : "#fff"};
          color: ${textPrimary};
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScorePill({ label, score }: { label: string; score: number }) {
  const color = score >= 8 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#f43f5e";
  return (
    <span style={{ fontSize: "0.68rem", color, fontWeight: 700 }}>
      {score}/10
    </span>
  );
}

function ComparisonBox({ label, content, bg, border, textColor, onCopy, copied }: {
  label: string; content: string; bg: string; border: string; textColor: string; onCopy: () => void; copied: boolean;
}) {
  return (
    <div style={{ padding: "0.7rem", borderRadius: 10, background: bg, border: `1px solid ${border}`, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: border.replace("20", ""), textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <button onClick={onCopy} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.6, padding: 2 }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <p style={{ fontSize: "0.82rem", color: textColor, lineHeight: 1.6 }}>{content}</p>
    </div>
  );
}

function ExplanationCard({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", padding: "0.6rem", borderRadius: 10, background: "rgba(255,255,255,0.02)" }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#9ca3af", marginBottom: "0.15rem" }}>{label}</div>
        <p style={{ fontSize: "0.8rem", color: "#d1d5db", lineHeight: 1.5 }}>{text}</p>
      </div>
    </div>
  );
}

function KeywordSection({ title, subtitle, keywords, color, icon, onAction, isDark, textPrimary, textSecondary, cardBg, cardBorder }: {
  title: string; subtitle: string; keywords: string[]; color: string; icon: React.ReactNode;
  onAction?: (kw: string) => void; isDark: boolean; textPrimary: string; textSecondary: string; cardBg: string; cardBorder: string;
}) {
  if (keywords.length === 0) return null;
  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.15rem" }}>
        <span style={{ color }}>{icon}</span>
        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: textPrimary }}>{title}</h4>
      </div>
      <p style={{ fontSize: "0.72rem", color: textSecondary, marginBottom: "0.6rem" }}>{subtitle}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {keywords.map((kw, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            padding: "0.3rem 0.6rem", borderRadius: 8,
            background: `${color}10`, border: `1px solid ${color}25`,
            fontSize: "0.78rem", color, fontWeight: 600,
          }}>
            {kw}
            {onAction && (
              <button onClick={() => onAction(kw)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, display: "flex" }}>
                <Plus size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyStateCard({ text }: { text: string }) {
  return (
    <div style={{
      textAlign: "center", padding: "3rem 2rem",
      background: "rgba(255,255,255,0.02)", borderRadius: 16,
      border: "1px dashed rgba(255,255,255,0.08)",
    }}>
      <CheckCircle2 size={36} color="#22c55e" style={{ marginBottom: "0.75rem" }} />
      <p style={{ fontSize: "0.88rem", color: "#9ca3af", maxWidth: 320, margin: "0 auto" }}>{text}</p>
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
      style={{
        background: "rgba(245,158,11,0.15)",
        backdropFilter: "blur(16px)",
        color: "#f59e0b",
        border: "1px solid rgba(245,158,11,0.35)",
        boxShadow: "0 8px 32px rgba(245,158,11,0.2)",
        animation: "slideUpFade 0.3s ease",
      }}>
      <Sparkles size={14} />
      {message}
    </div>
  );
}
