"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { api } from "@/services/api";
import {
  ArrowLeft, FileText, Upload, Sparkles, RefreshCw, Check, Copy, Download,
  Send, Trash2, Calendar, ChevronDown, ChevronUp,
  Zap, Briefcase, Building2, History, Star, Heart, Undo2, Redo2,
  MessageSquare, TrendingUp, Target, BarChart3, BookOpen, Lightbulb, Award,
  X, Save, Layers, Clock, Brain, FileUp,
} from "lucide-react";
import type { ResumeHubViewType } from "@/types/resume";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useTheme } from "@/hooks/useTheme";
import { useConfig } from "@/hooks/useConfig";
import { mkColors as centralizedMkColors } from "@/utils/themeColors";
import { fadeUp, scaleIn, pageTransition, buttonHover } from "@/utils/animations";
import {
  Chart as ChartJS,
  RadialLinearScale, PointElement, LineElement, Filler,
  Tooltip as ChartTooltip, Legend as ChartLegend,
  CategoryScale, LinearScale, BarElement,
} from "chart.js";
import { Radar, Bar } from "react-chartjs-2";
import { EmptyState } from "@/components/ui/PremiumComponents";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  ChartTooltip, ChartLegend,
  CategoryScale, LinearScale, BarElement
);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ResumeBrief {
  id: string;
  title: string;
  template: string;
  updatedAt: string;
  type: "builder";
}

interface UploadedResumeBrief {
  id: string;
  fileName: string;
  fileType: string;
  createdAt: string;
  type: "uploaded";
}

interface ParsedJD {
  companyName: string;
  role: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: string;
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];
  techStack: string[];
  softSkills: string[];
  summary: string;
}

interface CompanyInsights {
  name: string;
  industry: string;
  size: string;
  culture: string;
  summary: string;
  mission: string;
  values: string[];
  recentNews: string[];
  hiringTrends: string[];
  techStack: string[];
  glassdoorRating: number;
  benefits: string[];
}

interface RoleMatch {
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  partialMatchSkills: string[];
  recommendedFocusAreas: string[];
  experienceAlignment: string;
  strengthsToHighlight: string[];
  gapsToAddress: string[];
  overallAssessment: string;
}

interface HighlightItem {
  id: string;
  type: "strength" | "warning" | "suggestion" | "keyword";
  text: string;
  section: string;
  applied: boolean;
}

interface CoverLetterScore {
  overallScore: number;
  personalizationScore: number;
  atsCompatibility: number;
  professionalTone: number;
  grammar: number;
  roleAlignment: number;
  impactScore: number;
  improvements: string[];
  strengths: string[];
}

interface CoverLetterItem {
  id: string;
  companyName: string;
  role: string;
  tone: string;
  letterType: string;
  length?: string;
  mode?: string;
  greeting?: string;
  introduction?: string;
  body?: string;
  closing?: string;
  content: string;
  createdAt: string;
  isFavorite?: boolean;
  qualityScore?: number;
  roleMatchScore?: number;
  atsScore?: number;
  personalizationScore?: number;
  versionNumber?: number;
}

interface CoverLetterViewProps {
  setView: (v: ResumeHubViewType) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const GENERATING_STEPS = [
  "Reading Resume",
  "Analyzing Job Description",
  "Researching Company",
  "Matching Role Requirements",
  "Personalizing Tone & Style",
  "Drafting Cover Letter",
  "Optimizing for ATS",
  "Final Review & Scoring",
];

// ═══════════════════════════════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════════════════════════════

const mkColors = (theme: string) => {
  const base = centralizedMkColors(theme);
  return {
    ...base,
    redBg: base.d ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)",
    blueBg: base.d ? "rgba(59,130,246,0.1)" : "rgba(59,130,246,0.06)",
    purpleBg: base.d ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.05)",
    borderLight: base.d ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════════



// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function CoverLetterView({ setView }: CoverLetterViewProps) {
  const theme = useTheme();
  const c = mkColors(theme);
  const cfg = useConfig();
  const quota = useFeatureQuota("COVER_LETTER_GENERATOR");

  const [confirm, confirmModal] = useConfirm();

  // ── Screen ────────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<"configure" | "generating" | "editor">("configure");

  // ── Resume ────────────────────────────────────────────────────────────────
  const [resumes, setResumes] = useState<ResumeBrief[]>([]);
  const [uploadedResumes, setUploadedResumes] = useState<UploadedResumeBrief[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingCV, setUploadingCV] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Job Description ───────────────────────────────────────────────────────
  const [jobDescription, setJobDescription] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [parsingJD, setParsingJD] = useState(false);
  const [jdExpanded, setJdExpanded] = useState(false);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  // ── Company ───────────────────────────────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [companyInsights, setCompanyInsights] = useState<CompanyInsights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);

  // ── Role ──────────────────────────────────────────────────────────────────
  const [role, setRole] = useState("");
  const [roleMatch, setRoleMatch] = useState<RoleMatch | null>(null);
  const [loadingRoleMatch, setLoadingRoleMatch] = useState(false);
  const [roleMatchExpanded, setRoleMatchExpanded] = useState(false);

  // ── Config ────────────────────────────────────────────────────────────────
  const [tone, setTone] = useState("Professional");
  const [letterType, setLetterType] = useState("Full-Time");
  const [length, setLength] = useState("Standard");
  const [mode, setMode] = useState("Custom");

  // ── Letter Content ────────────────────────────────────────────────────────
  const [coverLetter, setCoverLetter] = useState<CoverLetterItem | null>(null);
  const [greeting, setGreeting] = useState("");
  const [introduction, setIntroduction] = useState("");
  const [body, setBody] = useState("");
  const [closing, setClosing] = useState("");

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const [undoStack, setUndoStack] = useState<Array<{ greeting: string; introduction: string; body: string; closing: string }>>([]);
  const [redoStack, setRedoStack] = useState<Array<{ greeting: string; introduction: string; body: string; closing: string }>>([]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false);

  // ── Scoring ───────────────────────────────────────────────────────────────
  const [scores, setScores] = useState<CoverLetterScore | null>(null);
  const [scoringLetter, setScoringLetter] = useState(false);

  // ── Highlights ────────────────────────────────────────────────────────────
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);

  // ── Improvements ──────────────────────────────────────────────────────────
  const [improvements, setImprovements] = useState<string[]>([]);
  const [loadingImprovements, setLoadingImprovements] = useState(false);

  // ── Loading ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // ── History ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<CoverLetterItem[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "favorites">("all");

  // ── Export ────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  // ── Right Panel Tab ───────────────────────────────────────────────────────
  const [activeRightTab, setActiveRightTab] = useState<"history" | "scores" | "highlights">("history");

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const fullLetterText = useMemo(() => {
    return [greeting, introduction, body, closing].filter(Boolean).join("\n\n");
  }, [greeting, introduction, body, closing]);

  const wordCount = useMemo(() => {
    return fullLetterText ? fullLetterText.split(/\s+/).filter(Boolean).length : 0;
  }, [fullLetterText]);

  const charCount = useMemo(() => {
    return fullLetterText.length;
  }, [fullLetterText]);

  const readingTime = useMemo(() => {
    const minutes = Math.ceil(wordCount / 200);
    return minutes < 1 ? "< 1 min" : `${minutes} min`;
  }, [wordCount]);

  const filteredHistory = useMemo(() => {
    if (filterTab === "favorites") return history.filter((h) => h.isFavorite);
    return history;
  }, [history, filterTab]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  const loadResumes = useCallback(async () => {
    try {
      const res = await api.get("/resume/list");
      setResumes((res.data.resumes || []).map((r: any) => ({ ...r, type: "builder" as const })));
    } catch (err) { console.error(err); }
  }, []);

  const loadUploadedResumes = useCallback(async () => {
    try {
      const res = await api.get("/resume-upload/list");
      setUploadedResumes((res.data.resumes || []).map((r: any) => ({ id: r.id, fileName: r.fileName, fileType: r.fileType, createdAt: r.createdAt, type: "uploaded" as const })));
    } catch (err) { console.error(err); }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get("/cover-letter/history");
      setHistory(res.data.coverLetters || []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadResumes(); loadUploadedResumes(); loadHistory(); }, [loadResumes, loadUploadedResumes, loadHistory]);

  // ═══════════════════════════════════════════════════════════════════════════
  // UNDO / REDO
  // ═══════════════════════════════════════════════════════════════════════════

  const pushUndo = useCallback(() => {
    setUndoStack((prev) => [...prev.slice(-49), { greeting, introduction, body, closing }]);
    setRedoStack([]);
  }, [greeting, introduction, body, closing]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, { greeting, introduction, body, closing }]);
    setGreeting(prev.greeting);
    setIntroduction(prev.introduction);
    setBody(prev.body);
    setClosing(prev.closing);
  }, [undoStack, greeting, introduction, body, closing]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, { greeting, introduction, body, closing }]);
    setGreeting(next.greeting);
    setIntroduction(next.introduction);
    setBody(next.body);
    setClosing(next.closing);
  }, [redoStack, greeting, introduction, body, closing]);

  // ═══════════════════════════════════════════════════════════════════════════
  // JD PARSING
  // ═══════════════════════════════════════════════════════════════════════════

  const handleParseJD = useCallback(async () => {
    if (!jobDescription.trim() && !jdFile) return;
    setParsingJD(true);
    try {
      let text = jobDescription;
      if (jdFile) {
        text = await jdFile.text();
      }
      const res = await api.post("/cover-letter/parse-jd", { jobDescription: text });
      if (res.data.success && res.data.parsed) {
        setParsedJD(res.data.parsed);
        if (res.data.parsed.companyName && !companyName) setCompanyName(res.data.parsed.companyName);
        if (res.data.parsed.role && !role) setRole(res.data.parsed.role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParsingJD(false);
    }
  }, [jobDescription, jdFile, companyName, role]);

  const handleJDFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setJdFile(f);
    setParsingJD(true);
    try {
      const text = await f.text();
      setJobDescription(text);
      const res = await api.post("/cover-letter/parse-jd", { jobDescription: text });
      if (res.data.success && res.data.parsed) {
        setParsedJD(res.data.parsed);
        if (res.data.parsed.companyName) setCompanyName(res.data.parsed.companyName);
        if (res.data.parsed.role) setRole(res.data.parsed.role);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setParsingJD(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY INSIGHTS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleGetCompanyInsights = useCallback(async () => {
    if (!companyName.trim()) return;
    setLoadingInsights(true);
    try {
      const res = await api.post("/cover-letter/company-insights", { companyName, jobDescription });
      if (res.data.success && res.data.insights) {
        setCompanyInsights(res.data.insights);
        setInsightsExpanded(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInsights(false);
    }
  }, [companyName, jobDescription]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE MATCH
  // ═══════════════════════════════════════════════════════════════════════════

  const handleRoleMatch = useCallback(async () => {
    if (!role.trim() || !parsedJD) return;
    setLoadingRoleMatch(true);
    try {
      const res = await api.post("/cover-letter/role-match", {
        resumeId: selectedResumeId, parsedJD,
      });
      if (res.data.success && res.data.match) {
        setRoleMatch(res.data.match);
        setRoleMatchExpanded(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRoleMatch(false);
    }
  }, [role, parsedJD, selectedResumeId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORING
  // ═══════════════════════════════════════════════════════════════════════════

  const autoScore = useCallback(async () => {
    if (!coverLetter) return;
    setScoringLetter(true);
    try {
      const res = await api.post("/cover-letter/score", {
        coverLetterId: coverLetter.id,
        resumeId: selectedResumeId,
        parsedJD,
      });
      if (res.data.success && res.data.scores) {
        setScores(res.data.scores);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScoringLetter(false);
    }
  }, [coverLetter, selectedResumeId, parsedJD]);

  const handleScoreLetter = useCallback(async () => {
    setScoringLetter(true);
    try {
      const payload: Record<string, unknown> = {};
      if (coverLetter?.id) payload.coverLetterId = coverLetter.id;
      if (selectedResumeId) payload.resumeId = selectedResumeId;
      if (parsedJD) payload.parsedJD = parsedJD;
      const res = await api.post("/cover-letter/score", payload);
      if (res.data.success && res.data.scores) {
        setScores(res.data.scores);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setScoringLetter(false);
    }
  }, [coverLetter, selectedResumeId, parsedJD]);

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPROVEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleGetImprovements = useCallback(async () => {
    setLoadingImprovements(true);
    try {
      const payload: Record<string, unknown> = {};
      if (coverLetter?.id) payload.coverLetterId = coverLetter.id;
      if (selectedResumeId) payload.resumeId = selectedResumeId;
      const res = await api.post("/cover-letter/improvements", payload);
      if (res.data.success && res.data.improvements) {
        setImprovements(res.data.improvements);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImprovements(false);
    }
  }, [coverLetter, selectedResumeId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  const startGeneration = useCallback(async () => {
    if (quota.exhausted) {
      setGenerationError("You've used all free Cover Letter generations this month. Upgrade to Premium for unlimited generations.");
      setScreen("configure");
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    setGenerationError(null);
    setScreen("generating");
    let stepInterval: ReturnType<typeof setInterval> | null = null;
    const requestId = quota.newRequestId();
    let quotaSucceeded = false;
    try {
      let finalResumeId = selectedResumeId;

      if (!finalResumeId && uploadFile) {
        setLoadingStep(0);
        const formData = new FormData();
        formData.append("resume", uploadFile);
        const uploadRes = await api.post("/resume-upload/upload", formData, {
          headers: { "Content-Type": "multipart/form-data", "x-request-id": quota.newRequestId() },
        });
        if (uploadRes.data.success && uploadRes.data.resume) {
          finalResumeId = uploadRes.data.resume.id;
          setSelectedResumeId(finalResumeId);
          loadUploadedResumes();
        }
      }

      setLoadingStep(0);
      stepInterval = setInterval(() => setLoadingStep((prev) => Math.min(prev + 1, GENERATING_STEPS.length - 1)), 1500);

      const res = await api.post("/cover-letter/generate", {
        resumeId: finalResumeId || undefined,
        companyName,
        role,
        jobDescription,
        tone,
        letterType,
        length: length.toLowerCase(),
        mode,
        parsedJD: parsedJD || undefined,
        companyInsights: companyInsights || undefined,
        roleMatch: roleMatch || undefined,
        requestId,
      });
      if (stepInterval) clearInterval(stepInterval);
      if (res.data.success && res.data.coverLetter) {
        quotaSucceeded = true;
        quota.onSuccess();
        const cl = res.data.coverLetter;
        setCoverLetter(cl);
        setGreeting(cl.greeting || "");
        setIntroduction(cl.introduction || "");
        setBody(cl.body || "");
        setClosing(cl.closing || "");
        if (cl.highlightMap && Array.isArray(cl.highlightMap)) setHighlights(cl.highlightMap);
        setScreen("editor");
        loadHistory();
        autoScore();
      } else {
        await quota.onFailure();
        const errMsg = res.data?.message || res.data?.error || "Generation returned no data. Please try again.";
        setGenerationError(errMsg);
        setScreen("configure");
      }
    } catch (err: any) {
      if (stepInterval) clearInterval(stepInterval);
      if (quota.handleQuotaError(err)) {
        setScreen("configure");
        return;
      }
      if (!quotaSucceeded) await quota.onFailure();
      const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Something went wrong. Please try again.";
      console.error(err);
      setGenerationError(errMsg);
      setScreen("configure");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedResumeId, uploadFile, companyName, role, jobDescription, tone, letterType, length, mode, parsedJD, companyInsights, roleMatch, loadHistory, loadUploadedResumes, quota]);

  // ═══════════════════════════════════════════════════════════════════════════
  // AI CHAT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleChatSend = useCallback(async (preset?: string) => {
    const msg = preset || chatMessage;
    if (!msg.trim() || !coverLetter) return;
    pushUndo();
    setChatLoading(true);
    try {
      const res = await api.post("/cover-letter/chat", {
        coverLetterId: coverLetter.id,
        message: msg,
      });
      if (res.data.success && res.data.coverLetter) {
        const cl = res.data.coverLetter;
        setCoverLetter(cl);
        setGreeting(cl.greeting || "");
        setIntroduction(cl.introduction || "");
        setBody(cl.body || "");
        setClosing(cl.closing || "");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to refine letter.");
    } finally {
      setChatLoading(false);
      setChatMessage("");
    }
  }, [chatMessage, coverLetter, pushUndo]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE / DELETE / DUPLICATE / FAVORITE
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSave = useCallback(async () => {
    if (!coverLetter) return;
    try {
      const res = await api.post("/cover-letter/save", {
        coverLetterId: coverLetter.id,
        greeting, introduction, body, closing,
      });
      if (res.data.success) {
        setCoverLetter(res.data.coverLetter);
        loadHistory();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    }
  }, [coverLetter, greeting, introduction, body, closing, loadHistory]);

  const handleDelete = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!(await confirm("Delete this cover letter?", { danger: true, confirmLabel: "Delete" }))) return;
    try {
      await api.delete(`/cover-letter/${id}`);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (coverLetter?.id === id) {
        setCoverLetter(null);
        setGreeting("");
        setIntroduction("");
        setBody("");
        setClosing("");
        setScores(null);
        setHighlights([]);
        setScreen("configure");
      }
    } catch (err) {
      console.error(err);
    }
  }, [confirm, coverLetter]);

  const handleDuplicate = useCallback(async (item: CoverLetterItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.post(`/cover-letter/${item.id}/duplicate`);
      if (res.data.success) {
        loadHistory();
      }
    } catch (err) {
      console.error(err);
    }
  }, [loadHistory]);

  const handleToggleFavorite = useCallback(async (item: CoverLetterItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.post(`/cover-letter/${item.id}/favorite`);
      if (res.data.success) {
        setHistory((prev) =>
          prev.map((h) => (h.id === item.id ? { ...h, isFavorite: !h.isFavorite } : h))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COPY / EXPORT
  // ═══════════════════════════════════════════════════════════════════════════

  const handleCopy = useCallback(() => {
    const text = [greeting, introduction, body, closing].filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [greeting, introduction, body, closing]);

  const handleExportText = useCallback(() => {
    setExporting(true);
    try {
      const text = [greeting, introduction, body, closing].filter(Boolean).join("\n\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CoverLetter_${companyName || "Draft"}_${role || "Role"}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }, [greeting, introduction, body, closing, companyName, role]);

  const handleExportMarkdown = useCallback(() => {
    setExporting(true);
    try {
      const md = [
        `# Cover Letter — ${companyName || "Company"} — ${role || "Role"}`,
        "",
        greeting ? `**${greeting}**` : "",
        "",
        introduction || "",
        "",
        body || "",
        "",
        closing || "",
      ].filter(Boolean).join("\n\n");
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CoverLetter_${companyName || "Draft"}_${role || "Role"}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  }, [greeting, introduction, body, closing, companyName, role]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  const openHistoryItem = useCallback((item: CoverLetterItem) => {
    setCoverLetter(item);
    setGreeting(item.greeting || "");
    setIntroduction(item.introduction || "");
    setBody(item.body || "");
    setClosing(item.closing || "");
    setCompanyName(item.companyName);
    setRole(item.role);
    setTone(item.tone);
    setLetterType(item.letterType);
    if (item.length) setLength(item.length);
    if (item.mode) setMode(item.mode);
    if (item.qualityScore) setScores({
      overallScore: item.qualityScore,
      personalizationScore: item.personalizationScore || 0,
      atsCompatibility: item.atsScore || 0,
      professionalTone: 0,
      grammar: 0,
      roleAlignment: item.roleMatchScore || 0,
      impactScore: 0,
      improvements: [],
      strengths: [],
    });
    setUndoStack([]);
    setRedoStack([]);
    setScreen("editor");
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CHART DATA
  // ═══════════════════════════════════════════════════════════════════════════

  const radarData = useMemo(() => {
    if (!scores) return null;
    return {
      labels: ["Personalization", "ATS", "Tone", "Grammar", "Role Fit", "Impact"],
      datasets: [
        {
          label: "Score",
          data: [scores.personalizationScore, scores.atsCompatibility, scores.professionalTone, scores.grammar, scores.roleAlignment, scores.impactScore],
          backgroundColor: c.isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.12)",
          borderColor: "#f59e0b",
          borderWidth: 2,
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#f59e0b",
          pointHoverBackgroundColor: "#f59e0b",
          pointHoverBorderColor: "#f59e0b",
          pointRadius: 3,
        },
      ],
    };
  }, [scores, c.isDark]);

  const radarOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: { display: false },
          grid: { color: c.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
          angleLines: { color: c.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
          pointLabels: { color: c.textSec, font: { size: 10, family: "'Inter', sans-serif", weight: "bold" as const } },
        },
      },
    };
  }, [c.isDark, c.textSec]);

  const matchBarData = useMemo(() => {
    if (!roleMatch) return null;
    return {
      labels: ["Match Score", "Gap"],
      datasets: [
        {
          label: "Role Match",
          data: [roleMatch.matchScore, 100 - roleMatch.matchScore],
          backgroundColor: ["rgba(245,158,11,0.7)", c.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"],
          borderRadius: 6,
          borderWidth: 0,
        },
      ],
    };
  }, [roleMatch, c.isDark]);

  const matchBarOptions = useMemo(() => {
    return {
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false, max: 100 },
        y: { display: false },
      },
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — HEADER
  // ═══════════════════════════════════════════════════════════════════════════

  const renderHeader = () => (
    <div className="flex-shrink-0 flex items-center gap-2.5 pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
      <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
        <FileText size={18} style={{ color: "#000" }} />
      </motion.div>
      <div className="flex-1 min-w-0">
        <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
          className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
          AI Cover Letter Intelligence
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="text-xs leading-tight" style={{ color: c.textMuted }}>
          Personalized, ATS-optimized cover letters powered by AI analysis.
        </motion.p>
      </div>
      {screen === "configure" && (
        <FeatureCreditBadge featureKey="COVER_LETTER_GENERATOR" compact isDark={theme === "dark"} />
      )}
      {coverLetter && screen === "editor" && (
        <div className="flex items-center gap-1.5">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleUndo} disabled={undoStack.length === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center" title="Undo"
            style={{ background: c.surface, color: undoStack.length === 0 ? c.textMuted : c.text, border: `1px solid ${c.border}` }}>
            <Undo2 size={13} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleRedo} disabled={redoStack.length === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center" title="Redo"
            style={{ background: c.surface, color: redoStack.length === 0 ? c.textMuted : c.text, border: `1px solid ${c.border}` }}>
            <Redo2 size={13} />
          </motion.button>
          <div className="w-px h-5 mx-1" style={{ background: c.divider }} />
          <div className="text-[10px] flex items-center gap-2" style={{ color: c.textMuted }}>
            <span className="font-semibold">{wordCount} words</span>
            <span>·</span>
            <span>{charCount} chars</span>
            <span>·</span>
            <Clock size={10} className="inline" />
            <span>{readingTime}</span>
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — CONFIGURE SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  const renderConfigure = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-7 space-y-4">
        {/* Resume Selection */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: c.amber }} />
            <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Select Resume</h3>
          </div>
          {resumes.length > 0 && (
            <div className="space-y-2 mb-3">
              {resumes.map((r, i) => (
                <motion.button key={r.id} variants={fadeUp} custom={i} whileHover={{ y: -2, scale: 1.005 }}
                  onClick={() => { setSelectedResumeId(r.id); setUploadFile(null); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{ background: selectedResumeId === r.id ? c.amberBg : "transparent", border: `1px solid ${selectedResumeId === r.id ? c.amber : "transparent"}`, color: c.text }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.amberBg }}><FileText size={14} style={{ color: c.amber }} /></div>
                  <div className="flex-1 min-w-0"><div className="text-xs font-bold truncate">{r.title}</div><div className="text-[10px]" style={{ color: c.textMuted }}>{r.template}</div></div>
                  {selectedResumeId === r.id && <Check size={14} style={{ color: c.amber }} />}
                </motion.button>
              ))}
            </div>
          )}
          {uploadedResumes.length > 0 && (
            <div className="space-y-2 mb-3">
              {uploadedResumes.map((r, i) => (
                <motion.button key={r.id} variants={fadeUp} custom={resumes.length + i} whileHover={{ y: -2, scale: 1.005 }}
                  onClick={() => { setSelectedResumeId(r.id); setUploadFile(null); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{ background: selectedResumeId === r.id ? c.amberBg : "transparent", border: `1px solid ${selectedResumeId === r.id ? c.amber : "transparent"}`, color: c.text }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.greenBg }}><FileUp size={14} style={{ color: c.green }} /></div>
                  <div className="flex-1 min-w-0"><div className="text-xs font-bold truncate">{r.fileName}</div><div className="text-[10px]" style={{ color: c.textMuted }}>Uploaded · {r.fileType.toUpperCase()}</div></div>
                  {selectedResumeId === r.id && <Check size={14} style={{ color: c.amber }} />}
                </motion.button>
              ))}
            </div>
          )}
          <motion.div whileHover={{ y: -2 }} onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-xl text-center cursor-pointer" style={{ background: uploadFile ? c.amberBg : "transparent", border: `1px dashed ${uploadFile ? c.amber : c.border}` }}>
            <Upload size={24} className="mx-auto mb-1.5" style={{ color: uploadFile ? c.amber : c.textMuted }} />
            <p className="text-[10px] font-bold" style={{ color: uploadFile ? c.amber : c.textSec }}>{uploadFile ? uploadFile.name : "Upload PDF / DOCX"}</p>
            {uploadFile && <p className="text-[9px] mt-1 font-semibold" style={{ color: c.textMuted }}>Will be uploaded & saved on Generate</p>}
          </motion.div>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setSelectedResumeId(null); } }} />
        </motion.div>

        {/* Job Description */}
        <motion.div variants={fadeUp} custom={1} initial="hidden" animate="visible" className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Briefcase size={16} style={{ color: c.amber }} />
              <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Job Description</h3></div>
            <button onClick={() => setJdExpanded(!jdExpanded)} className="p-1 rounded" style={{ color: c.textMuted }}>{jdExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
          </div>
          <AnimatePresence>
            {jdExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                <textarea rows={4} value={jobDescription} onChange={e => { setJobDescription(e.target.value); setParsedJD(null); }}
                  placeholder="Paste the full job description here..."
                  className="w-full border rounded-xl p-3 text-xs resize-none focus:outline-none" style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                <div className="flex items-center gap-3 flex-wrap">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => jdFileInputRef.current?.click()}
                    className="text-[10px] font-semibold flex items-center gap-1.5" style={{ color: c.amber }}><FileUp size={12} /> Upload PDF/DOCX</motion.button>
                  <input ref={jdFileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={handleJDFileUpload} />
                  {jobDescription.trim() && (
                    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleParseJD} disabled={parsingJD}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                      style={{ background: c.amberBg, color: c.amber, border: `1px solid ${c.amberBorder}` }}>
                      {parsingJD ? <><RefreshCw size={10} className="animate-spin" /> Parsing...</> : <><Brain size={10} /> Parse with AI</>}
                    </motion.button>
                  )}
                </div>
                {jdFile && <div className="text-[10px] font-semibold" style={{ color: c.green }}><Check size={10} className="inline mr-1" />{jdFile.name}</div>}
                {parsedJD && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" className="rounded-xl p-4 space-y-2" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                    <div className="flex items-center gap-2"><Brain size={14} style={{ color: c.purple }} /><span className="text-xs font-bold" style={{ color: c.text }}>Parsed Job Data</span></div>
                    {parsedJD.companyName && <div className="text-[10px]"><span className="font-bold" style={{ color: c.textSec }}>Company:</span> <span style={{ color: c.text }}>{parsedJD.companyName}</span></div>}
                    {parsedJD.role && <div className="text-[10px]"><span className="font-bold" style={{ color: c.textSec }}>Role:</span> <span style={{ color: c.text }}>{parsedJD.role}</span></div>}
                    {parsedJD.requiredSkills.length > 0 && (<div className="flex flex-wrap gap-1">{parsedJD.requiredSkills.map(s => <span key={s} className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: c.greenBg, color: c.green }}>{s}</span>)}</div>)}
                    {parsedJD.preferredSkills.length > 0 && (<div className="flex flex-wrap gap-1">{parsedJD.preferredSkills.map(s => <span key={s} className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: c.blueBg, color: c.blue }}>{s}</span>)}</div>)}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Company & Role */}
        <motion.div variants={fadeUp} custom={2} initial="hidden" animate="visible" className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 mb-3"><Building2 size={16} style={{ color: c.amber }} />
            <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Company & Role</h3></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: c.textSec }}>Company</label>
              <input type="text" value={companyName} onChange={e => { setCompanyName(e.target.value); setCompanyInsights(null); }} placeholder="e.g. Google"
                className="w-full border rounded-lg p-2.5 text-xs focus:outline-none" style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: c.textSec }}>Role</label>
              <input type="text" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Software Engineer"
                className="w-full border rounded-lg p-2.5 text-xs focus:outline-none" style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            {companyName && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleGetCompanyInsights} disabled={loadingInsights}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                style={{ background: c.purpleBg, color: c.purple, border: `1px solid ${c.isDark ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.25)"}` }}>
                {loadingInsights ? <RefreshCw size={10} className="animate-spin" /> : <Building2 size={10} />}
                {companyInsights ? "Refresh Insights" : "Get Company Insights"}
              </motion.button>
            )}
            {role && (
              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleRoleMatch} disabled={loadingRoleMatch}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5"
                style={{ background: c.blueBg, color: c.blue, border: `1px solid ${c.isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.25)"}` }}>
                {loadingRoleMatch ? <RefreshCw size={10} className="animate-spin" /> : <Target size={10} />}
                {roleMatch ? "Refresh Match" : "Analyze Role Match"}
              </motion.button>
            )}
          </div>
          <AnimatePresence>
            {companyInsights && insightsExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="rounded-xl p-4 space-y-2 mb-3" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="text-[10px] font-bold" style={{ color: c.purple }}>Company Insights</div>
                {companyInsights.summary && <p className="text-[10px] leading-relaxed" style={{ color: c.textSec }}>{companyInsights.summary}</p>}
                {companyInsights.values.length > 0 && <div className="flex flex-wrap gap-1">{companyInsights.values.map(v => <span key={v} className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: c.purpleBg, color: c.purple }}>{v}</span>)}</div>}
                {companyInsights.mission && <p className="text-[10px] italic" style={{ color: c.textMuted }}>{companyInsights.mission}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Generation Settings */}
        <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center gap-2 mb-3"><Sparkles size={16} style={{ color: c.amber }} />
            <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Generation Settings</h3></div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: c.textSec }}>Tone</label>
              <div className="flex flex-wrap gap-1.5">{cfg.coverLetterTones.map(t => (
                <motion.button key={t} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setTone(t)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{ background: tone === t ? c.amberBg : "transparent", border: `1px solid ${tone === t ? c.amber : c.border}`, color: tone === t ? c.amber : c.textSec }}>{t}</motion.button>
              ))}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: c.textSec }}>Length</label>
                <div className="flex gap-1.5">{cfg.coverLetterLengths.map(l => (
                  <motion.button key={l} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setLength(l)}
                    className="flex-1 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                    style={{ background: length === l ? c.amberBg : "transparent", border: `1px solid ${length === l ? c.amber : c.border}`, color: length === l ? c.amber : c.textSec }}>{l}</motion.button>
                ))}</div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: c.textSec }}>Letter Type</label>
              <div className="flex flex-wrap gap-1.5">{cfg.coverLetterTypes.map(lt => (
                <motion.button key={lt} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setLetterType(lt)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                  style={{ background: letterType === lt ? c.amberBg : "transparent", border: `1px solid ${letterType === lt ? c.amber : c.border}`, color: letterType === lt ? c.amber : c.textSec }}>{lt}</motion.button>
              ))}</div>
            </div>
          </div>
        </motion.div>

        {/* Generate Button */}
        {generationError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 p-3 rounded-xl text-xs font-semibold"
            style={{ background: c.redBg, color: c.red, border: `1px solid ${c.red}33` }}>
            <X size={14} className="shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{generationError}</span>
            </div>
            <button onClick={() => setGenerationError(null)} className="shrink-0"><X size={12} /></button>
          </motion.div>
        )}
        <motion.div variants={fadeUp} custom={4} initial="hidden" animate="visible">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={startGeneration}
            disabled={!companyName || !role}
            className="w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: !companyName || !role ? c.surface : "linear-gradient(135deg, #f59e0b, #d97706)",
              color: !companyName || !role ? c.textMuted : "#000",
              border: `1px solid ${!companyName || !role ? c.border : "transparent"}`,
            }}>
            <Sparkles size={16} /> Generate AI Cover Letter
          </motion.button>
        </motion.div>
      </div>

      {/* RIGHT: History Panel */}
      <div className="lg:col-span-5">{renderHistoryPanel()}</div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — GENERATING SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  const renderGenerating = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-8 max-w-md">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: c.amberBg }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
            <Sparkles size={32} style={{ color: c.amber }} />
          </motion.div>
        </div>
        <h2 className="text-xl font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Generating Cover Letter</h2>
        <div className="space-y-2">
          {GENERATING_STEPS.map((step, i) => (
            <motion.div key={step} className="flex items-center gap-3 p-3 rounded-xl transition-all"
              style={{ background: loadingStep >= i ? c.amberBg : "transparent", color: loadingStep >= i ? c.amber : c.textMuted }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: loadingStep > i ? c.green : loadingStep === i ? c.amberBg : c.surface, color: loadingStep > i ? "#fff" : loadingStep === i ? c.amber : c.textMuted }}>
                {loadingStep > i ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-xs font-bold">{step}</span>
            </motion.div>
          ))}
        </div>
        <p className="text-[10px] font-semibold" style={{ color: c.textMuted }}>
          This may take up to a minute as AI analyzes your resume and job description...
        </p>
      </motion.div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — EDITOR SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  const renderEditor = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <div className="lg:col-span-7 space-y-4">
        {/* Editor Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setScreen("configure")}
              className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.surface, color: c.text, border: `1px solid ${c.border}` }}><ArrowLeft size={16} /></motion.button>
            <div>
              <h3 className="text-sm font-extrabold" style={{ color: c.text }}>{coverLetter?.role} @ {coverLetter?.companyName}</h3>
              <span className="text-[10px]" style={{ color: c.textMuted }}>{coverLetter?.tone} · {coverLetter?.letterType}{coverLetter?.length ? ` · ${coverLetter.length}` : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleSave}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
              style={{ background: c.surface, color: c.text, border: `1px solid ${c.border}` }}><Save size={11} /> Save</motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
              style={{ background: c.surface, color: c.text, border: `1px solid ${c.border}` }}>
              {copied ? <Check size={11} style={{ color: c.green }} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}</motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setChatOpen(!chatOpen)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
              style={{ background: chatOpen ? c.amberBg : c.surface, color: chatOpen ? c.amber : c.text, border: `1px solid ${chatOpen ? c.amber : c.border}` }}><MessageSquare size={11} /> AI Chat</motion.button>
          </div>
        </div>

        {/* Letter Editor */}
        <motion.div variants={scaleIn} initial="hidden" animate="visible" className="rounded-2xl p-5 space-y-4" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          {(["greeting", "introduction", "body", "closing"] as const).map((field) => (
            <div key={field}>
              <label className="block text-[10px] uppercase font-semibold mb-1.5" style={{ color: c.textSec }}>{field}</label>
              <textarea
                rows={field === "greeting" ? 1 : field === "closing" ? 2 : field === "introduction" ? 3 : 6}
                value={field === "greeting" ? greeting : field === "introduction" ? introduction : field === "body" ? body : closing}
                onChange={e => { pushUndo(); if (field === "greeting") setGreeting(e.target.value); else if (field === "introduction") setIntroduction(e.target.value); else if (field === "body") setBody(e.target.value); else setClosing(e.target.value); }}
                className="w-full border rounded-xl p-3 text-xs resize-none focus:outline-none"
                style={{ background: c.inputBg, borderColor: c.border, color: c.text, fontFamily: "'Georgia', serif" }}
              />
            </div>
          ))}
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {["Make it shorter", "More professional", "Optimize for company", "Highlight projects", "Rewrite intro", "Stronger closing"].map(action => (
              <motion.button key={action} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleChatSend(action)} disabled={chatLoading}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: c.surface, color: c.textSec, border: `1px solid ${c.border}` }}>{action}</motion.button>
            ))}
          </div>
          {/* Action Bar */}
          <div className="flex gap-2 pt-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={startGeneration}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
              style={{ background: c.surface, color: c.text, border: `1px solid ${c.border}` }}><RefreshCw size={12} /> Regenerate</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCopy}
              className="flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}><Download size={12} /> Export</motion.button>
          </div>
        </motion.div>

        {/* AI Chat Panel */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="rounded-2xl p-4" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
              <div className="flex gap-2">
                <input value={chatMessage} onChange={e => setChatMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChatSend()}
                  placeholder="Ask AI to refine your letter..." className="flex-1 border rounded-lg p-2.5 text-xs focus:outline-none" style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleChatSend()} disabled={chatLoading || !chatMessage.trim()}
                  className="px-4 rounded-lg font-bold text-xs flex items-center gap-1.5"
                  style={{ background: chatLoading || !chatMessage.trim() ? c.surface : c.amber, color: chatLoading || !chatMessage.trim() ? c.textMuted : "#000" }}><Send size={12} /> Send</motion.button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {["Make it shorter", "More professional", "Highlight projects", "Mention leadership"].map(hint => (
                  <motion.button key={hint} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setChatMessage(hint)}
                    className="px-2 py-1 rounded text-[9px] font-semibold" style={{ background: c.surface, color: c.textMuted, border: `1px solid ${c.border}` }}>{hint}</motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Improvements Panel */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Lightbulb size={16} style={{ color: c.amber }} /><span className="text-xs font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Improvements</span></div>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleGetImprovements} disabled={loadingImprovements}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
              style={{ background: c.amberBg, color: c.amber, border: `1px solid ${c.amberBorder}` }}>
              {loadingImprovements ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />} Analyze
            </motion.button>
          </div>
          {improvements.length > 0 ? (
            <div className="space-y-2">{improvements.map((imp, i) => (
              <motion.div key={i} variants={fadeUp} custom={i} className="flex items-start gap-2 p-2.5 rounded-lg"
                style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <Lightbulb size={12} className="shrink-0 mt-0.5" style={{ color: c.amber }} />
                <span className="text-[10px] leading-relaxed" style={{ color: c.textSec }}>{imp}</span>
              </motion.div>
            ))}</div>
          ) : (
            <p className="text-[10px] text-center py-4" style={{ color: c.textMuted }}>Click "Analyze" to get AI improvement suggestions.</p>
          )}
        </motion.div>
      </div>

      {/* RIGHT: Scores & Highlights Panel */}
      <div className="lg:col-span-5 space-y-4">
        {/* Tab Bar */}
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          {(["history", "scores", "highlights"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveRightTab(tab)} className="flex-1 py-2 text-[10px] font-bold rounded-lg transition-all capitalize"
              style={{ background: activeRightTab === tab ? c.amberBg : "transparent", color: activeRightTab === tab ? c.amber : c.textMuted }}>{tab}</button>
          ))}
        </div>
        {activeRightTab === "history" && renderHistoryPanel()}
        {activeRightTab === "scores" && renderScoresPanel()}
        {activeRightTab === "highlights" && renderHighlightsPanel()}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — HISTORY PANEL
  // ═══════════════════════════════════════════════════════════════════════════

  const renderHistoryPanel = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
          <History size={14} style={{ color: c.amber }} /> Library
        </h3>
        <div className="flex gap-1">
          {(["all", "favorites"] as const).map(tab => (
            <button key={tab} onClick={() => setFilterTab(tab)} className="px-2 py-1 rounded text-[10px] font-bold capitalize"
              style={{ background: filterTab === tab ? c.amberBg : "transparent", color: filterTab === tab ? c.amber : c.textMuted }}>{tab}</button>
          ))}
        </div>
      </div>
      <div className="rounded-2xl p-3 space-y-2 max-h-[600px] overflow-y-auto" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        {filteredHistory.length === 0 ? (
          <EmptyState title="No cover letters yet" description="Generate your first AI cover letter to get started."
            illustration={<FileText size={32} />} />
        ) : filteredHistory.map((h, i) => (
          <motion.div key={h.id} variants={fadeUp} custom={i} whileHover={{ y: -2, scale: 1.005 }} onClick={() => openHistoryItem(h)}
            className="p-3 rounded-xl cursor-pointer group transition-all"
            style={{ background: coverLetter?.id === h.id ? c.amberBg : "transparent", border: `1px solid ${coverLetter?.id === h.id ? c.amber : "transparent"}` }}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-xs font-bold truncate" style={{ color: c.text }}>{h.role} @ {h.companyName}</div>
                <div className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: c.textMuted }}>
                  <Calendar size={9} /> {new Date(h.createdAt).toLocaleDateString()} · {h.tone}
                  {h.qualityScore && <><span>·</span><span style={{ color: c.amber }}>{h.qualityScore}/100</span></>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <motion.button whileHover={{ scale: 1.1 }} onClick={e => handleToggleFavorite(h, e)} className="p-1 rounded"
                  style={{ color: h.isFavorite ? c.amber : c.textMuted }}><Star size={12} fill={h.isFavorite ? c.amber : "none"} /></motion.button>
                <motion.button whileHover={{ scale: 1.1 }} onClick={e => handleDuplicate(h, e)} className="p-1 rounded" style={{ color: c.textMuted }}><Copy size={12} /></motion.button>
                <motion.button whileHover={{ scale: 1.1 }} onClick={e => handleDelete(h.id, e)} className="p-1 rounded" style={{ color: c.red }}><Trash2 size={12} /></motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — SCORES PANEL
  // ═══════════════════════════════════════════════════════════════════════════

  const renderScoresPanel = () => (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
            <BarChart3 size={14} style={{ color: c.amber }} /> Quality Score
          </h3>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleScoreLetter} disabled={scoringLetter}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
            style={{ background: c.amberBg, color: c.amber, border: `1px solid ${c.amberBorder}` }}>
            {scoringLetter ? <RefreshCw size={10} className="animate-spin" /> : <Target size={10} />} {scores ? "Rescore" : "Score Now"}
          </motion.button>
        </div>
        {scores ? (
          <>
            <div className="text-center mb-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-4xl font-extrabold" style={{ color: c.amber, fontFamily: "var(--font-sans)" }}>{scores.overallScore}<span className="text-lg">/100</span></motion.div>
              <div className="text-[10px] font-semibold" style={{ color: c.textMuted }}>Overall Score</div>
            </div>
            <div className="h-[200px]"><Radar data={radarData!} options={radarOptions} /></div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {[
                { label: "Personalization", value: scores.personalizationScore, color: c.amber },
                { label: "ATS", value: scores.atsCompatibility, color: c.green },
                { label: "Tone", value: scores.professionalTone, color: c.blue },
                { label: "Grammar", value: scores.grammar, color: c.purple },
                { label: "Role Fit", value: scores.roleAlignment, color: c.amber },
                { label: "Impact", value: scores.impactScore, color: c.green },
              ].map(s => (
                <div key={s.label} className="p-2 rounded-lg" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>{s.label}</span>
                    <span className="text-[10px] font-extrabold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: c.pill }}><div className="h-full rounded-full transition-all" style={{ width: `${s.value}%`, background: s.color }} /></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8"><Target size={32} className="mx-auto mb-2" style={{ color: c.textMuted, opacity: 0.5 }} />
            <p className="text-[10px] font-semibold" style={{ color: c.textMuted }}>Click "Score Now" to analyze your cover letter.</p></div>
        )}
      </div>
      {roleMatch && (
        <div className="rounded-2xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <h3 className="text-xs font-extrabold mb-3 flex items-center gap-1.5" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
            <Target size={14} style={{ color: c.amber }} /> Role Match</h3>
          <div className="text-center mb-3">
            <div className="text-3xl font-extrabold" style={{ color: c.amber, fontFamily: "var(--font-sans)" }}>{roleMatch.matchScore}%</div>
            <div className="text-[10px] font-semibold" style={{ color: c.textMuted }}>Match Score</div>
          </div>
          <div className="h-[60px]"><Bar data={matchBarData!} options={matchBarOptions} /></div>
          {roleMatch.matchingSkills.length > 0 && (
            <div className="mt-3"><div className="text-[9px] font-bold mb-1" style={{ color: c.textMuted }}>Matched Skills</div>
              <div className="flex flex-wrap gap-1">{roleMatch.matchingSkills.map(s => <span key={s} className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: c.greenBg, color: c.green }}>{s}</span>)}</div></div>
          )}
          {roleMatch.missingSkills.length > 0 && (
            <div className="mt-2"><div className="text-[9px] font-bold mb-1" style={{ color: c.textMuted }}>Missing Skills</div>
              <div className="flex flex-wrap gap-1">{roleMatch.missingSkills.map(s => <span key={s} className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: c.redBg, color: c.red }}>{s}</span>)}</div></div>
          )}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — HIGHLIGHTS PANEL
  // ═══════════════════════════════════════════════════════════════════════════

  const renderHighlightsPanel = () => (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <h3 className="text-xs font-extrabold flex items-center gap-1.5" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
        <Layers size={14} style={{ color: c.amber }} /> Highlight Map
      </h3>
      <p className="text-[10px]" style={{ color: c.textMuted }}>Shows where AI sourced each part of your cover letter from your resume.</p>
      {highlights.length > 0 ? (
        <div className="space-y-2">{highlights.map((h, i) => (
          <motion.div key={i} variants={fadeUp} custom={i} className="p-3 rounded-xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold capitalize" style={{
                background: h.type === "strength" ? c.greenBg : h.type === "warning" ? c.redBg : c.blueBg,
                color: h.type === "strength" ? c.green : h.type === "warning" ? c.red : c.blue,
              }}>{h.type}</span>
              <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>{h.section}</span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: c.textSec }}>{stripMarkdown(h.text)}</p>
          </motion.div>
        ))}</div>
      ) : (
        <div className="text-center py-8"><Layers size={32} className="mx-auto mb-2" style={{ color: c.textMuted, opacity: 0.5 }} />
          <p className="text-[10px] font-semibold" style={{ color: c.textMuted }}>Highlights will appear after scoring.</p></div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER — EMPTY STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const renderEmptyState = () => (
    <EmptyState
      title="AI Cover Letter Intelligence Engine"
      description="Upload a resume and paste a job description to generate a personalized AI cover letter that feels genuinely written for that company, role, and candidate."
      illustration={<FileText size={32} />}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RETURN
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
      className="flex flex-col antialiased min-h-[calc(100vh-120px)]" style={{ color: c.text }}>
      {renderHeader()}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {screen === "configure" && renderConfigure()}
        {screen === "generating" && renderGenerating()}
        {screen === "editor" && renderEditor()}
      </div>
      {confirmModal}
    </motion.div>
  );
}
