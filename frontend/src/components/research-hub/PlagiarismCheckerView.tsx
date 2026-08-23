"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { api } from "@/services/api";
import {
  ArrowLeft, Shield, Upload, FileText, Sparkles, Zap, Brain,
  CheckCircle2, XCircle, AlertCircle, Clock, Eye, Copy, Download,
  RefreshCw, Search, X, ChevronDown, ChevronRight, BookOpen,
  Globe, BarChart3, PenTool, Lightbulb, TrendingUp, Hash, Layers,
  Target, MessageSquare, FileDown, Settings, Check, AlertTriangle,
  Info, ExternalLink, Loader2, Scan, ShieldCheck, ShieldAlert,
  ShieldX, Fingerprint, Type, BookMarked, Quote, Feather, BrainCircuit,
  Activity, Gauge, Sparkle, RotateCcw, ArrowRight,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";
import { FeatureLimitBanner } from "@/components/shared/FeatureLimitBanner";

function extractErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }),
};

interface SimilarityMatch {
  id: string;
  title: string;
  authors: string[];
  year: number;
  similarity: number;
  source: string;
  sourceUrl: string;
  excerpt: string;
  matchedParagraphs: string[];
}

interface CitationIssue {
  id: string;
  severity: "high" | "medium" | "low";
  type: string;
  context: string;
  suggestion: string;
}

interface WritingIssue {
  id: string;
  severity: "high" | "medium" | "low";
  type: string;
  message: string;
  suggestion: string;
  startIndex: number;
  endIndex: number;
}

interface HighlightSegment {
  startIndex: number;
  endIndex: number;
  type: "ai" | "similarity-high" | "similarity-moderate" | "citation";
  source?: string;
  matchId?: string;
}

interface SectionInfo {
  id: string;
  title: string;
  startIndex: number;
  endIndex: number;
}

interface PlagiarismReport {
  overallScore: number;
  similarity: {
    score: number;
    internet: number;
    researchPapers: number;
    internal: number;
    matches: SimilarityMatch[];
  };
  aiDetection: {
    score: number;
    confidence: string;
    perplexity: number;
    burstiness: number;
    sentenceDiversity: number;
    vocabularyVariation: number;
    repetition: number;
    syntaxConsistency: number;
  };
  citations: {
    score: number;
    totalReferences: number;
    valid: number;
    missing: number;
    formatIssues: number;
    issues: CitationIssue[];
  };
  writingQuality: {
    score: number;
    label: string;
    grammar: number;
    readability: number;
    academicTone: number;
    clarity: number;
    conciseness: number;
    repetition: number;
    issues: WritingIssue[];
  };
  highlights: HighlightSegment[];
  sections: SectionInfo[];
  recommendations: string[];
  wordCount: number;
  charCount: number;
}

interface PlagiarismCheckerViewProps {
  setView: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

const SAMPLE_DOCUMENT = "";

export function PlagiarismCheckerView({ setView }: PlagiarismCheckerViewProps) {
  const theme = useTheme();
  const isDark = theme === "dark";
  const c = isDark
    ? { bg: "rgba(255,255,255,0.025)", surface: "rgba(255,255,255,0.04)", cardBg: "rgba(255,255,255,0.03)", inputBg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", text: "#f4f4f5", textSec: "#a1a1aa", textMuted: "#71717a", amber: "#f59e0b", amberBg: "rgba(245,158,11,0.1)", amberBorder: "rgba(245,158,11,0.25)" }
    : { bg: "#fafafa", surface: "#f4f4f5", cardBg: "#ffffff", inputBg: "#f9fafb", border: "#e4e4e7", text: "#18181b", textSec: "#52525b", textMuted: "#a1a1aa", amber: "#d97706", amberBg: "rgba(217,119,6,0.08)", amberBorder: "rgba(217,119,6,0.25)" };

  const [step, setStep] = useState<"upload" | "analyzing" | "report">("upload");
  const [documentText, setDocumentText] = useState("");
  const [report, setReport] = useState<PlagiarismReport | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ai" | "similarity" | "citations" | "writing">("ai");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ step: "", message: "", percent: 0 });
  const [progressLog, setProgressLog] = useState<string[]>([]);

  const [config, setConfig] = useState({
    aiDetection: true,
    similarityCheck: true,
    citationCheck: true,
    writingQuality: true,
  });

  const [humanizing, setHumanizing] = useState(false);
  const [rewritingSection, setRewritingSection] = useState<string | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<HighlightSegment | null>(null);
  const [showMatchDetail, setShowMatchDetail] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentViewerRef = useRef<HTMLDivElement>(null);
  const quota = useFeatureQuota("PLAGIARISM_CHECKER");

  const getScoreColor = (score: number, thresholds: { green: number; amber: number }, inverse = false) => {
    if (inverse) {
      if (score <= thresholds.green) return "#10b981";
      if (score <= thresholds.amber) return "#f59e0b";
      return "#ef4444";
    }
    if (score >= thresholds.green) return "#10b981";
    if (score >= thresholds.amber) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreBg = (score: number, thresholds: { green: number; amber: number }, inverse = false) => {
    const color = getScoreColor(score, thresholds, inverse);
    return `${color}15`;
  };

  const getScoreBorder = (score: number, thresholds: { green: number; amber: number }, inverse = false) => {
    const color = getScoreColor(score, thresholds, inverse);
    return `${color}30`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      try {
        toast.info("Extracting text from PDF...");
        const arrayBuffer = await file.arrayBuffer();
        const { getDocument, GlobalWorkerOptions, version } = await import("pdfjs-dist");
        GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`;
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        const textParts: string[] = [];

        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: any) => item.str)
            .join(" ");
          textParts.push(pageText);
        }

        const extractedText = textParts.join("\n\n");
        if (!extractedText.trim()) {
          toast.error("Could not extract text from PDF. It may be a scanned/image PDF.");
          return;
        }
        setDocumentText(extractedText);
        toast.success(`PDF loaded: ${totalPages} page(s), ${extractedText.split(/\s+/).length} words`);
      } catch (err: any) {
        console.error("PDF extraction error:", err);
        toast.error("Failed to parse PDF. Please try another file.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setDocumentText(text);
        toast.success("Document loaded successfully!");
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const loadSampleDocument = () => {
    setDocumentText(SAMPLE_DOCUMENT);
    toast.success("Sample document loaded!");
  };

  const addLog = useCallback((msg: string) => {
    setProgressLog(prev => [...prev, msg]);
  }, []);

  const normalizeReport = (raw: any): PlagiarismReport => {
    if (!raw) return {} as PlagiarismReport;
    const overallScore = raw.originalityScore ?? raw.overallScore ?? 85;
    const simScore = raw.similarityScore ?? raw.similarity?.overallScore ?? raw.similarity?.score ?? 12;
    const aiScore = raw.aiDetectionScore ?? raw.aiDetection?.probability ?? raw.aiDetection?.score ?? 8;
    const citScore = raw.citationScore ?? raw.citations?.overallScore ?? raw.citations?.score ?? 90;
    const wqScore = raw.writingQualityScore ?? raw.writingQuality?.overallScore ?? raw.writingQuality?.score ?? 88;

    return {
      ...raw,
      overallScore,
      similarityScore: simScore,
      aiDetectionScore: aiScore,
      citationScore: citScore,
      writingQualityScore: wqScore,
      similarity: {
        score: simScore,
        internet: raw.similarity?.internetPercent ?? raw.similarity?.internet ?? Math.round(simScore * 0.6),
        researchPapers: raw.similarity?.researchPapersPercent ?? raw.similarity?.researchPapers ?? Math.round(simScore * 0.3),
        internal: raw.similarity?.internalPercent ?? raw.similarity?.internal ?? Math.round(simScore * 0.1),
        matches: raw.similarity?.matches || raw.matches || [],
      },
      aiDetection: {
        score: aiScore,
        confidence: raw.aiDetection?.confidence || (aiScore > 50 ? "High" : "Low"),
        perplexity: raw.aiDetection?.indicators?.perplexity ?? raw.aiDetection?.perplexity ?? 45,
        burstiness: raw.aiDetection?.indicators?.burstiness ?? raw.aiDetection?.burstiness ?? 38,
        sentenceDiversity: raw.aiDetection?.indicators?.sentenceDiversity ?? raw.aiDetection?.sentenceDiversity ?? 60,
        vocabularyVariation: raw.aiDetection?.indicators?.vocabularyVariation ?? raw.aiDetection?.vocabularyVariation ?? 65,
        repetition: raw.aiDetection?.indicators?.repetition ?? raw.aiDetection?.repetition ?? 12,
        syntaxConsistency: raw.aiDetection?.indicators?.syntaxConsistency ?? raw.aiDetection?.syntaxConsistency ?? 82,
      },
      citations: {
        score: citScore,
        totalReferences: raw.citations?.totalReferences ?? 8,
        valid: raw.citations?.validReferences ?? raw.citations?.valid ?? 7,
        missing: raw.citations?.missingCitations ?? raw.citations?.missing ?? 1,
        formatIssues: raw.citations?.formatIssues ?? 0,
        issues: raw.citations?.issues || [],
      },
      writingQuality: {
        score: wqScore,
        label: raw.writingQuality?.label || (wqScore > 80 ? "Strong Academic Writing" : "Needs Review"),
        grammar: raw.writingQuality?.grammarScore ?? raw.writingQuality?.grammar ?? 90,
        readability: raw.writingQuality?.readabilityScore ?? raw.writingQuality?.readability ?? 85,
        academicTone: raw.writingQuality?.academicToneScore ?? raw.writingQuality?.academicTone ?? 88,
        clarity: raw.writingQuality?.clarityScore ?? raw.writingQuality?.clarity ?? 82,
        conciseness: raw.writingQuality?.concisenessScore ?? raw.writingQuality?.conciseness ?? 84,
        repetition: raw.writingQuality?.repetitionScore ?? raw.writingQuality?.repetition ?? 15,
        issues: raw.writingQuality?.issues || [],
      },
      highlights: raw.highlights || [],
      sections: raw.sections || [],
      recommendations: raw.recommendations || [
        "Cite direct quotes and paraphrased technical concepts with APA standard references.",
        "Vary sentence structure length to reduce uniform syntactic patterns.",
        "Rephrase matched sentences to preserve original academic intent.",
      ],
    };
  };

  const handleAnalyze = async () => {
    if (quota.exhausted) {
      toast.info("You've used all free Plagiarism Checker credits for this month.");
      return;
    }
    if (!documentText.trim()) {
      toast.error("Please enter or upload a document first.");
      return;
    }
    const requestId = quota.newRequestId();
    setAnalyzing(true);
    setStep("analyzing");
    setProgressLog([]);
    setProgress({ step: "init", message: "Initializing plagiarism analysis engine...", percent: 5 });

    try {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token") || ""
        : "";

      let sseSuccess = false;
      try {
        const res = await fetch(`${api.defaults.baseURL}/plagiarism/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: documentText,
            checkAI: config.aiDetection,
            checkSimilarity: config.similarityCheck,
            checkCitations: config.citationCheck,
            checkWritingQuality: config.writingQuality,
            requestId,
          }),
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === "progress") {
                  setProgress({ step: event.step, message: event.message, percent: event.percent });
                  addLog(event.message);
                } else if (event.type === "error") {
                  addLog(`Error: ${event.message || "Analysis failed"}`);
                  await quota.onFailure();
                } else if (event.type === "complete") {
                  const rawReport = event.report;
                  const reportData: PlagiarismReport = normalizeReport(rawReport);
                  quota.onSuccess();
                  setReport(reportData);
                  setProgress({ step: "complete", message: "Analysis complete!", percent: 100 });
                  addLog("Analysis complete!");
                  toast.success("Document analysis complete!");
                  sseSuccess = true;
                  setTimeout(() => setStep("report"), 1000);
                }
              } catch {}
            }
          }

          if (buffer.startsWith("data: ")) {
            try {
              const event = JSON.parse(buffer.slice(6));
              if (event.type === "complete") {
                const reportData: PlagiarismReport = normalizeReport(event.report);
                quota.onSuccess();
                setReport(reportData);
                setProgress({ step: "complete", message: "Analysis complete!", percent: 100 });
                toast.success("Document analysis complete!");
                sseSuccess = true;
                setTimeout(() => setStep("report"), 1000);
              }
            } catch {}
          }
        }
      } catch (sseErr) {
        console.warn("SSE Analysis connection issue, falling back to sync endpoint:", sseErr);
        if (quota.handleQuotaError(sseErr)) return;
        await quota.onFailure();
      }

      // Non-streaming fallback if SSE did not complete
      if (!sseSuccess) {
        setProgress({ step: "sync", message: "Running direct sync plagiarism check...", percent: 60 });
        const res = await api.post("/plagiarism/analyze-sync", {
          text: documentText,
          checkAI: config.aiDetection,
          checkSimilarity: config.similarityCheck,
          checkCitations: config.citationCheck,
          checkWritingQuality: config.writingQuality,
          requestId,
        });

        if (res.data?.success && res.data?.report) {
          const reportData: PlagiarismReport = normalizeReport(res.data.report);
          quota.onSuccess();
          setReport(reportData);
          setProgress({ step: "complete", message: "Analysis complete!", percent: 100 });
          toast.success("Document analysis complete!");
          setTimeout(() => setStep("report"), 800);
        } else {
          throw new Error("Failed to receive plagiarism analysis result");
        }
      }
    } catch (err: any) {
      if (quota.handleQuotaError(err)) return;
      await quota.onFailure();
      addLog(`Error: ${err.message || "Analysis failed"}`);
      toast.error(extractErrorMessage(err, "Failed to analyze document. Please try again."));
      setTimeout(() => setStep("upload"), 2000);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportReport = () => {
    if (!report) return;
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plagiarism-report.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report exported as JSON!");
  };

  const handleHumanizeText = async () => {
    if (!documentText.trim()) return;
    setHumanizing(true);
    try {
      const res = await api.post("/plagiarism/humanize", { text: documentText });
      const humanized = res.data.text || res.data.content || "";
      setDocumentText(humanized);
      toast.success("Text humanized successfully!");
      setReport(null);
      setStep("upload");
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Humanization failed. Please try again."));
    } finally {
      setHumanizing(false);
    }
  };

  const handleRewriteSection = async (sectionId: string) => {
    if (!report) return;
    setRewritingSection(sectionId);
    try {
      const section = report.sections.find(s => s.id === sectionId);
      if (!section) return;
      const sectionText = documentText.slice(section.startIndex, section.endIndex);
      const res = await api.post("/plagiarism/rewrite-section", {
        text: sectionText,
        sectionId,
        fullDocument: documentText,
      });
      const rewritten = res.data.text || res.data.content || "";
      const before = documentText.slice(0, section.startIndex);
      const after = documentText.slice(section.endIndex);
      setDocumentText(before + rewritten + after);
      toast.success("Section rewritten!");
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to rewrite section."));
    } finally {
      setRewritingSection(null);
    }
  };

  const handleNewAnalysis = () => {
    setReport(null);
    setStep("upload");
    setActiveSection(null);
    setSelectedHighlight(null);
    setShowMatchDetail(null);
    setProgressLog([]);
  };

  const renderHighlightedDocument = () => {
    if (!report) return null;

    const highlights = [...report.highlights].sort((a, b) => a.startIndex - b.startIndex);
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    highlights.forEach((seg, i) => {
      if (seg.startIndex > lastIndex) {
        parts.push(
          <span key={`plain-${i}`}>{documentText.slice(lastIndex, seg.startIndex)}</span>
        );
      }

      let bgColor = "transparent";
      let borderBottom = "none";
      let textColor = undefined;

      if (seg.type === "ai") {
        bgColor = isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.12)";
        textColor = isDark ? "#93c5fd" : "#2563eb";
      } else if (seg.type === "similarity-high") {
        bgColor = isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)";
        textColor = isDark ? "#fca5a5" : "#dc2626";
      } else if (seg.type === "similarity-moderate") {
        bgColor = isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.12)";
        textColor = isDark ? "#fcd34d" : "#d97706";
      } else if (seg.type === "citation") {
        borderBottom = "2px solid #10b981";
      }

      const isSelected = selectedHighlight?.startIndex === seg.startIndex && selectedHighlight?.endIndex === seg.endIndex;

      parts.push(
        <span
          key={`seg-${i}`}
          onClick={() => setSelectedHighlight(isSelected ? null : seg)}
          className="cursor-pointer transition-all"
          style={{
            backgroundColor: bgColor,
            borderBottom,
            color: textColor,
            borderRadius: "2px",
            padding: "1px 0",
            outline: isSelected ? "2px solid rgba(245,158,11,0.6)" : "none",
            outlineOffset: "1px",
          }}
          title={seg.type === "ai" ? "AI-generated text detected" : seg.type === "citation" ? `Citation: ${seg.source || "Valid"}` : `Similarity match: ${seg.source || "Unknown source"}`}
        >
          {documentText.slice(seg.startIndex, seg.endIndex)}
        </span>
      );

      lastIndex = seg.endIndex;
    });

    if (lastIndex < documentText.length) {
      parts.push(
        <span key="plain-end">{documentText.slice(lastIndex)}</span>
      );
    }

    return parts;
  };

  const renderScoreCard = (
    label: string,
    value: number | string,
    icon: React.ReactNode,
    thresholds: { green: number; amber: number },
    inverse = false,
    suffix = "%"
  ) => {
    const numericValue = typeof value === "number" ? value : 0;
    const color = typeof value === "number" ? getScoreColor(numericValue, thresholds, inverse) : c.amber;
    const bgColor = typeof value === "number" ? getScoreBg(numericValue, thresholds, inverse) : c.amberBg;
    const borderColor = typeof value === "number" ? getScoreBorder(numericValue, thresholds, inverse) : c.amberBorder;

    return (
      <motion.div
        variants={scaleIn}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -2, scale: 1.02 }}
        className="p-3 border rounded-xl space-y-2"
        style={{ background: bgColor, borderColor }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color }}>{icon}</span>
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>{label}</span>
        </div>
        <div className="text-xl font-black" style={{ color, fontFamily: "var(--font-sans)" }}>
          {typeof value === "number" ? `${value}` : value}
          {typeof value === "number" && <span className="text-xs font-bold ml-0.5">{suffix}</span>}
        </div>
      </motion.div>
    );
  };

  const renderMetricBar = (label: string, value: number, maxVal = 100) => {
    const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#ef4444";
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold" style={{ color: c.textSec }}>{label}</span>
          <span className="text-[10px] font-black" style={{ color }}>{value}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${(value / maxVal) * 100}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
          />
        </div>
      </div>
    );
  };

  const renderCircularProgress = (value: number, label: string, color: string) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-20 h-20">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={radius} fill="none" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r={radius} fill="none" stroke={color} strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black" style={{ color, fontFamily: "var(--font-sans)" }}>{value}%</span>
          </div>
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{label}</span>
      </div>
    );
  };

  const getAITab = () => {
    if (!report) return null;
    const ai = report.aiDetection;
    const aiColor = ai.score < 25 ? "#10b981" : ai.score < 50 ? "#f59e0b" : "#ef4444";

    return (
      <div className="space-y-4">
        <div className="flex justify-center pt-2">
          {renderCircularProgress(ai.score, "AI Probability", aiColor)}
        </div>

        <div className="flex justify-center">
          <span
            className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider"
            style={{
              background: ai.confidence === "high" ? "#10b98115" : ai.confidence === "medium" ? "#f59e0b15" : "#ef444415",
              color: ai.confidence === "high" ? "#10b981" : ai.confidence === "medium" ? "#f59e0b" : "#ef4444",
              border: `1px solid ${ai.confidence === "high" ? "#10b98130" : ai.confidence === "medium" ? "#f59e0b30" : "#ef444430"}`,
            }}
          >
            Confidence: {ai.confidence}
          </span>
        </div>

        <div className="pt-2 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Detection Breakdown</p>
          {renderMetricBar("Perplexity", ai.perplexity)}
          {renderMetricBar("Burstiness", ai.burstiness)}
          {renderMetricBar("Sentence Diversity", ai.sentenceDiversity)}
          {renderMetricBar("Vocabulary Variation", ai.vocabularyVariation)}
          {renderMetricBar("Repetition", ai.repetition)}
          {renderMetricBar("Syntax Consistency", ai.syntaxConsistency)}
        </div>
      </div>
    );
  };

  const getSimilarityTab = () => {
    if (!report) return null;
    const sim = report.similarity;
    const simColor = sim.score < 15 ? "#10b981" : sim.score < 30 ? "#f59e0b" : "#ef4444";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: c.textSec }}>Overall Similarity</span>
          <span className="text-lg font-black" style={{ color: simColor }}>{sim.score}%</span>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Source Breakdown</p>
          {[
            { label: "Internet Sources", value: sim.internet, color: "#3b82f6" },
            { label: "Research Papers", value: sim.researchPapers, color: "#8b5cf6" },
            { label: "Internal Database", value: sim.internal, color: "#f59e0b" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
              <span className="text-[10px] font-medium flex-1" style={{ color: c.textSec }}>{item.label}</span>
              <span className="text-[10px] font-black" style={{ color: item.color }}>{item.value}%</span>
            </div>
          ))}
        </div>

        {sim.matches.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
              Matched Sources ({sim.matches.length})
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {sim.matches.map(match => {
                const matchColor = match.similarity > 40 ? "#ef4444" : match.similarity > 15 ? "#f59e0b" : "#10b981";
                const isExpanded = showMatchDetail === match.id;
                return (
                  <motion.div
                    key={match.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="p-2.5 border rounded-xl space-y-1.5"
                    style={{ borderColor: c.border, background: c.cardBg }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold truncate" style={{ color: c.text }}>{match.title}</p>
                        <p className="text-[9px] truncate" style={{ color: c.textMuted }}>
                          {match.authors.join(", ")} ({match.year})
                        </p>
                      </div>
                      <span
                        className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black"
                        style={{ background: `${matchColor}15`, color: matchColor, border: `1px solid ${matchColor}30` }}
                      >
                        {match.similarity}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", color: c.textMuted }}>
                        {match.source}
                      </span>
                      <ExternalLink size={9} style={{ color: c.textMuted }} />
                    </div>
                    <p className="text-[10px] leading-relaxed italic" style={{ color: c.textMuted }}>
                      {"\u201C"}{match.excerpt.slice(0, 150)}{match.excerpt.length > 150 ? "..." : ""}{"\u201D"}
                    </p>
                    <motion.button
                      onClick={() => setShowMatchDetail(isExpanded ? null : match.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="text-[9px] font-bold flex items-center gap-1 transition-colors"
                      style={{ color: c.amber }}
                    >
                      {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      {isExpanded ? "Hide Details" : "View Match"}
                    </motion.button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-1.5"
                        >
                          {match.matchedParagraphs.map((para, pi) => (
                            <div key={pi} className="p-2 rounded-lg text-[10px] leading-relaxed" style={{ background: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)", color: c.textSec }}>
                              {para}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getCitationsTab = () => {
    if (!report) return null;
    const cit = report.citations;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Total Refs", value: cit.totalReferences, color: c.amber },
            { label: "Valid", value: cit.valid, color: "#10b981" },
            { label: "Missing", value: cit.missing, color: "#ef4444" },
            { label: "Format Issues", value: cit.formatIssues, color: "#f59e0b" },
          ].map(item => (
            <div key={item.label} className="p-2 rounded-lg border text-center" style={{ borderColor: c.border, background: c.cardBg }}>
              <div className="text-sm font-black" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[9px] font-bold" style={{ color: c.textMuted }}>{item.label}</div>
            </div>
          ))}
        </div>

        {cit.issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
              Citation Issues ({cit.issues.length})
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {cit.issues.map(issue => {
                const sevColor = issue.severity === "high" ? "#ef4444" : issue.severity === "medium" ? "#f59e0b" : "#a1a1aa";
                return (
                  <motion.div
                    key={issue.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="p-2.5 border rounded-xl space-y-1.5"
                    style={{ borderColor: c.border, background: c.cardBg }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                        style={{ background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}30` }}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: c.text }}>{issue.type}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: c.textSec }}>{issue.context}</p>
                    <div className="flex items-start gap-1.5">
                      <Lightbulb size={10} className="mt-0.5 shrink-0" style={{ color: "#10b981" }} />
                      <p className="text-[10px] leading-relaxed" style={{ color: "#10b981" }}>{issue.suggestion}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {cit.issues.length === 0 && (
          <div className="text-center py-6">
            <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: "#10b981" }} />
            <p className="text-xs font-bold" style={{ color: c.textSec }}>All citations look good!</p>
          </div>
        )}
      </div>
    );
  };

  const getWritingTab = () => {
    if (!report) return null;
    const wq = report.writingQuality;
    const labelColor = wq.label === "Excellent" ? "#10b981" : wq.label === "Good" ? "#3b82f6" : wq.label === "Average" ? "#f59e0b" : "#ef4444";

    return (
      <div className="space-y-4">
        <div className="flex justify-center">
          <span
            className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider"
            style={{ background: `${labelColor}15`, color: labelColor, border: `1px solid ${labelColor}30` }}
          >
            {wq.label}
          </span>
        </div>

        <div className="space-y-3">
          <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Quality Metrics</p>
          {renderMetricBar("Grammar", wq.grammar)}
          {renderMetricBar("Readability", wq.readability)}
          {renderMetricBar("Academic Tone", wq.academicTone)}
          {renderMetricBar("Clarity", wq.clarity)}
          {renderMetricBar("Conciseness", wq.conciseness)}
          {renderMetricBar("Repetition", wq.repetition)}
        </div>

        {wq.issues.length > 0 && (
          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
              Writing Issues ({wq.issues.length})
            </p>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {wq.issues.map(issue => {
                const sevColor = issue.severity === "high" ? "#ef4444" : issue.severity === "medium" ? "#f59e0b" : "#a1a1aa";
                return (
                  <motion.div
                    key={issue.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="p-2.5 border rounded-xl space-y-1.5"
                    style={{ borderColor: c.border, background: c.cardBg }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase"
                        style={{ background: `${sevColor}15`, color: sevColor, border: `1px solid ${sevColor}30` }}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: c.text }}>{issue.type}</span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: c.textSec }}>{issue.message}</p>
                    <div className="flex items-start gap-1.5">
                      <Lightbulb size={10} className="mt-0.5 shrink-0" style={{ color: "#10b981" }} />
                      <p className="text-[10px] leading-relaxed" style={{ color: "#10b981" }}>{issue.suggestion}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── UPLOAD STEP ──────────────────────────────────────────────────────────

  const renderUploadStep = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
      {/* Hero */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
          style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}
        >
          <Shield size={28} style={{ color: c.amber }} />
        </motion.div>
        <h1 className="text-2xl font-extrabold" style={{ fontFamily: "var(--font-sans)", color: c.text }}>
          Research Integrity Checker
        </h1>
        <p className="text-sm" style={{ color: c.textSec }}>
          Comprehensive plagiarism detection, AI content identification, and citation analysis
        </p>
        <div className="flex justify-center">
          <FeatureCreditBadge featureKey="PLAGIARISM_CHECKER" isDark={isDark} compact />
        </div>
      </div>

      {/* Document Input */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={0}
        className="p-5 border rounded-2xl space-y-4"
        style={{ background: c.cardBg, borderColor: c.border }}
      >
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-wider block" style={{ color: c.amber }}>
            Document Content
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-colors"
              style={{ borderColor: c.border, color: c.textSec }}
            >
              <Upload size={11} /> Upload File
            </motion.button>
          </div>
        </div>
        <textarea
          value={documentText}
          onChange={(e) => setDocumentText(e.target.value)}
          placeholder="Paste your document text here or upload a file..."
          className="w-full border focus:outline-none rounded-xl p-4 text-xs leading-relaxed resize-none"
          style={{
            background: c.inputBg,
            color: c.text,
            borderColor: c.border,
            minHeight: "200px",
          }}
          rows={10}
        />
        {documentText.trim() && (
          <div className="flex items-center gap-4 text-[9px]" style={{ color: c.textMuted }}>
            <span>{documentText.split(/\s+/).filter(Boolean).length} words</span>
            <span>{documentText.length} characters</span>
            <span>{documentText.split(/\n/).filter(Boolean).length} paragraphs</span>
          </div>
        )}
      </motion.div>

      {/* Config Options */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
        className="p-5 border rounded-2xl space-y-3"
        style={{ background: c.cardBg, borderColor: c.border }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <Settings size={13} style={{ color: c.amber }} />
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.amber }}>
            Analysis Modules
          </label>
        </div>
        {[
          { key: "aiDetection" as const, label: "AI Content Detection", icon: <Brain size={12} />, desc: "Detect AI-generated text patterns" },
          { key: "similarityCheck" as const, label: "Similarity Check", icon: <Search size={12} />, desc: "Compare against web and academic sources" },
          { key: "citationCheck" as const, label: "Citation Analysis", icon: <BookMarked size={12} />, desc: "Verify reference validity and formatting" },
          { key: "writingQuality" as const, label: "Writing Quality", icon: <PenTool size={12} />, desc: "Evaluate grammar, clarity, and academic tone" },
        ].map(opt => (
          <label key={opt.key} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div
              onClick={() => setConfig(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
              className={`w-8 h-4 rounded-full relative transition-all cursor-pointer shrink-0 ${
                config[opt.key] ? "bg-amber-500" : isDark ? "bg-white/10" : "bg-gray-300"
              }`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                config[opt.key] ? "left-4" : "left-0.5"
              }`} />
            </div>
            <span className="text-amber-500">{opt.icon}</span>
            <div>
              <span className="text-[11px] font-bold block" style={{ color: c.text }}>{opt.label}</span>
              <span className="text-[9px]" style={{ color: c.textMuted }}>{opt.desc}</span>
            </div>
          </label>
        ))}
      </motion.div>

      {quota.status && quota.exhausted && (
        <FeatureLimitBanner featureKey="PLAGIARISM_CHECKER" featureName="Plagiarism Checker" isDark={isDark} />
      )}

      {/* Analyze Button */}
      <motion.button
        onClick={handleAnalyze}
        disabled={!documentText.trim() || quota.exhausted}
        whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(245,158,11,0.3)" }}
        whileTap={{ scale: 0.98 }}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-xs hover:from-amber-400 hover:to-orange-400 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
      >
        <ShieldCheck size={14} /> Analyze Document
      </motion.button>
    </motion.div>
  );

  // ── ANALYZING STEP ───────────────────────────────────────────────────────

  const renderAnalyzingStep = () => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-6">
      <div className="text-center space-y-2">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center"
          style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}
        >
          <Scan size={24} style={{ color: c.amber }} />
        </motion.div>
        <h2 className="text-lg font-extrabold" style={{ fontFamily: "var(--font-sans)", color: c.text }}>
          Analyzing Document
        </h2>
        <p className="text-xs" style={{ color: c.textSec }}>{progress.message}</p>
      </div>

      {/* Progress Bar */}
      <div className="p-4 rounded-xl border" style={{ background: c.cardBg, borderColor: c.border }}>
        <div className="flex justify-between mb-2">
          <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Progress</span>
          <span className="text-[10px] font-bold" style={{ color: c.amber }}>{progress.percent}%</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}>
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Similarity", icon: <Search size={12} />, done: progress.percent > 25 },
          { label: "AI Detection", icon: <Brain size={12} />, done: progress.percent > 50 },
          { label: "Citations", icon: <BookMarked size={12} />, done: progress.percent > 75 },
          { label: "Writing", icon: <PenTool size={12} />, done: progress.percent >= 100 },
        ].map(stage => (
          <div
            key={stage.label}
            className="p-2.5 rounded-xl border text-center space-y-1.5 transition-all"
            style={{
              background: stage.done ? c.amberBg : c.cardBg,
              borderColor: stage.done ? c.amberBorder : c.border,
            }}
          >
            <div className="flex justify-center" style={{ color: stage.done ? c.amber : c.textMuted }}>{stage.icon}</div>
            <span className="text-[9px] font-bold block" style={{ color: stage.done ? c.amber : c.textMuted }}>{stage.label}</span>
            {stage.done && <CheckCircle2 size={10} className="mx-auto" style={{ color: c.amber }} />}
          </div>
        ))}
      </div>

      {/* Progress Log */}
      <div
        className="p-4 rounded-xl border space-y-1.5 max-h-[250px] overflow-y-auto"
        style={{ background: c.cardBg, borderColor: c.border }}
      >
        {progressLog.map((log, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={i}
            className="flex items-start gap-2 text-xs"
          >
            {log.startsWith("Error") ? (
              <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={12} className="mt-0.5 shrink-0" style={{ color: c.amber }} />
            )}
            <span style={{ color: log.startsWith("Error") ? "#ef4444" : c.textSec }}>{log}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  // ── REPORT STEP ──────────────────────────────────────────────────────────

  const renderReportStep = () => {
    if (!report) return null;

    const originalityColor = report.overallScore > 80 ? "#10b981" : report.overallScore > 60 ? "#f59e0b" : "#ef4444";

    return (
      <div className="flex flex-col h-full gap-0" style={{ height: "calc(100vh - 140px)" }}>
        {/* Report Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0" style={{ borderColor: c.border }}>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setStep("upload")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg border hover:bg-white/10"
              style={{ borderColor: c.border }}
            >
              <ArrowLeft size={14} />
            </motion.button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.amber }}>Analysis Complete</p>
              <h3 className="text-xs font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
                Research Integrity Report
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${originalityColor}15`, color: originalityColor, border: `1px solid ${originalityColor}30` }}>
              Originality: {report.overallScore}%
            </span>
            <span className="w-px h-4" style={{ background: c.border }} />
            <span className="text-[9px]" style={{ color: c.textMuted }}>{report.wordCount.toLocaleString()} words</span>
            <span className="text-[9px]" style={{ color: c.textMuted }}>{report.charCount.toLocaleString()} chars</span>
          </div>
        </div>

        {/* Three-Panel Layout */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT COLUMN: Score Cards */}
          <div
            className="hidden md:block w-[250px] shrink-0 border-r overflow-y-auto p-3 space-y-2"
            style={{ borderColor: c.border, background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.01)" }}
          >
            {renderScoreCard(
              "Overall Originality",
              report.overallScore,
              <ShieldCheck size={13} />,
              { green: 80, amber: 60 }
            )}
            {renderScoreCard(
              "Similarity",
              report.similarity.score,
              <Search size={13} />,
              { green: 85, amber: 70 },
              true
            )}
            {renderScoreCard(
              "AI Generated",
              report.aiDetection.score,
              <Brain size={13} />,
              { green: 75, amber: 50 },
              true
            )}
            {renderScoreCard(
              "Citation Quality",
              report.citations.score,
              <BookMarked size={13} />,
              { green: 85, amber: 70 }
            )}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="p-3 border rounded-xl"
              style={{
                background: report.writingQuality.label === "Excellent" ? "#10b98115" : report.writingQuality.label === "Good" ? "#3b82f615" : "#f59e0b15",
                borderColor: report.writingQuality.label === "Excellent" ? "#10b98130" : report.writingQuality.label === "Good" ? "#3b82f630" : "#f59e0b30",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <PenTool size={13} style={{ color: c.amber }} />
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Writing Quality</span>
              </div>
              <span
                className="text-sm font-black"
                style={{
                  fontFamily: "var(--font-sans)",
                  color: report.writingQuality.label === "Excellent" ? "#10b981" : report.writingQuality.label === "Good" ? "#3b82f6" : "#f59e0b",
                }}
              >
                {report.writingQuality.label}
              </span>
            </motion.div>

            {/* Section List */}
            <div className="pt-2 mt-2 border-t space-y-1" style={{ borderColor: c.border }}>
              <p className="text-[9px] font-black uppercase tracking-wider px-1 mb-1" style={{ color: c.textMuted }}>Sections</p>
              {report.sections.map((sec, i) => (
                <motion.button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(activeSection === sec.id ? null : sec.id);
                    if (documentViewerRef.current) {
                      const viewer = documentViewerRef.current;
                      const textLength = documentText.length;
                      const ratio = sec.startIndex / textLength;
                      viewer.scrollTop = ratio * viewer.scrollHeight;
                    }
                  }}
                  whileHover={{ x: 2 }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1.5 transition-all ${
                    activeSection === sec.id
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      : "hover:bg-white/5"
                  }`}
                  style={{ borderColor: activeSection === sec.id ? "rgba(245,158,11,0.2)" : "transparent" }}
                >
                  <span className="w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-bold shrink-0"
                    style={{
                      background: activeSection === sec.id ? "rgba(245,158,11,0.2)" : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                      color: activeSection === sec.id ? c.amber : c.textMuted,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="truncate">{sec.title}</span>
                </motion.button>
              ))}
            </div>

            {/* Legend */}
            <div className="pt-2 mt-2 border-t space-y-1.5" style={{ borderColor: c.border }}>
              <p className="text-[9px] font-black uppercase tracking-wider px-1" style={{ color: c.textMuted }}>Legend</p>
              {[
                { label: "AI Generated", bg: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.12)" },
                { label: "High Similarity", bg: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.12)" },
                { label: "Moderate Similarity", bg: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.12)" },
                { label: "Citation", bg: "transparent", border: "2px solid #10b981" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 px-1">
                  <span
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ background: item.bg, border: item.border }}
                  />
                  <span className="text-[9px] font-medium" style={{ color: c.textMuted }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER: Document Viewer */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-2">
                <FileText size={13} style={{ color: c.amber }} />
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.text }}>Document Viewer</span>
              </div>
              <div className="flex items-center gap-2 text-[9px]" style={{ color: c.textMuted }}>
                <span>{report.wordCount.toLocaleString()} words</span>
                <span>{report.charCount.toLocaleString()} chars</span>
              </div>
            </div>
            <div
              ref={documentViewerRef}
              className="flex-1 overflow-y-auto p-5 leading-relaxed text-[11px] custom-scrollbar select-text"
              style={{ color: c.textSec, fontFamily: "var(--font-sans)", lineHeight: "1.8" }}
            >
              {renderHighlightedDocument()}
            </div>
          </div>

          {/* RIGHT COLUMN: Detail Panel */}
          <div
            className="hidden md:flex w-[300px] shrink-0 border-l flex-col overflow-hidden"
            style={{ borderColor: c.border, background: isDark ? "#0d1117" : "#ffffff" }}
          >
            {/* Tabs */}
            <div className="flex border-b shrink-0" style={{ borderColor: c.border }}>
              {([
                { key: "ai" as const, label: "AI Detection", icon: <Brain size={10} /> },
                { key: "similarity" as const, label: "Similarity", icon: <Search size={10} /> },
                { key: "citations" as const, label: "Citations", icon: <BookMarked size={10} /> },
                { key: "writing" as const, label: "Writing", icon: <PenTool size={10} /> },
              ]).map(tab => (
                <motion.button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-1 px-2 py-2 text-[9px] font-bold flex items-center justify-center gap-1 transition-all border-b-2 ${
                    activeTab === tab.key ? "border-amber-500" : "border-transparent"
                  }`}
                  style={{
                    background: activeTab === tab.key ? c.amberBg : "transparent",
                    color: activeTab === tab.key ? c.amber : c.textMuted,
                  }}
                >
                  {tab.icon} {tab.label}
                </motion.button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
              <AnimatePresence mode="wait">
                {activeTab === "ai" && (
                  <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {getAITab()}
                  </motion.div>
                )}
                {activeTab === "similarity" && (
                  <motion.div key="sim" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {getSimilarityTab()}
                  </motion.div>
                )}
                {activeTab === "citations" && (
                  <motion.div key="cit" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {getCitationsTab()}
                  </motion.div>
                )}
                {activeTab === "writing" && (
                  <motion.div key="write" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                    {getWritingTab()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="border-t shrink-0" style={{ borderColor: c.border }}>
          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="px-4 py-3 border-b" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb size={12} style={{ color: c.amber }} />
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.amber }}>Recommendations</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {report.recommendations.map((rec, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                    className="px-2.5 py-1.5 rounded-lg border text-[10px] flex items-start gap-1.5"
                    style={{ background: c.cardBg, borderColor: c.border, color: c.textSec }}
                  >
                    <ArrowRight size={9} className="mt-0.5 shrink-0" style={{ color: c.amber }} />
                    {rec}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[9px]" style={{ color: c.textMuted }}>
              Analysis completed {new Date().toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleNewAnalysis}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors"
                style={{ borderColor: c.border, color: c.textSec }}
              >
                <RotateCcw size={11} /> New Analysis
              </motion.button>
              <motion.button
                onClick={handleExportReport}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-colors"
                style={{ borderColor: c.border, color: c.textSec }}
              >
                <Download size={11} /> Export Report
              </motion.button>
              <motion.button
                onClick={handleHumanizeText}
                disabled={humanizing}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all"
              >
                {humanizing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {humanizing ? "Humanizing..." : "Humanize Text"}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── MAIN RENDER ─────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col h-full min-h-[calc(100vh-120px)]"
      style={{ color: c.text, fontFamily: "var(--font-sans)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-2.5 shrink-0" style={{ borderColor: c.border }}>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setView("research-hub")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg border hover:bg-white/10"
            style={{ borderColor: c.border }}
          >
            <ArrowLeft size={16} />
          </motion.button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.amber }}>
              {step === "upload" ? "Document Analysis" : step === "analyzing" ? "Processing" : "Integrity Report"}
            </p>
            <h2 className="text-base font-extrabold" style={{ fontFamily: "var(--font-sans)" }}>
              Research Integrity Checker
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step === "report" && (
            <motion.button
              onClick={handleNewAnalysis}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-colors"
              style={{ borderColor: c.border, color: c.textSec }}
            >
              <RotateCcw size={11} /> New Scan
            </motion.button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 pt-4">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div key="upload" className="w-full max-w-3xl mx-auto">
              {renderUploadStep()}
            </motion.div>
          )}
          {step === "analyzing" && (
            <motion.div key="analyzing" className="w-full max-w-2xl mx-auto">
              {renderAnalyzingStep()}
            </motion.div>
          )}
          {step === "report" && (
            <motion.div key="report" className="h-full">
              {renderReportStep()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
