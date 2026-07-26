"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  PenTool, Copy, FileDown, RefreshCw, ChevronRight, Search, Plus, History,
  CheckCircle2, Sparkles, Brain, Zap, Star, X, FileText, Layers, Quote, Trash2, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/context/SocketContext";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";

const mkColors = (theme: string) => {
  const isDark = theme === "dark";
  return {
    isDark, text: isDark ? "#e5e7eb" : "#0f172a", textSec: isDark ? "#9ca3af" : "#475569", textMuted: isDark ? "#828fa3" : "#5f6368", textOnAmber: "#000000",
    bg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", bgHover: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderHover: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)",
    inputBg: isDark ? "rgba(0,0,0,0.35)" : "#f1f5f9", cardBg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", cardBgAlt: isDark ? "rgba(0,0,0,0.25)" : "#f8fafc",
    stickyBg: isDark ? "rgba(10,10,20,0.88)" : "rgba(248,250,252,0.92)",
    amber: "#f59e0b", amberBg: isDark ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.08)", amberBorder: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.25)", amberActive: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
    purpleBg: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.05)", purpleBorder: isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.15)",
    cyanBg: isDark ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.05)", cyanBorder: isDark ? "rgba(6,182,212,0.14)" : "rgba(6,182,212,0.15)",
    green: "#10b981", greenBg: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
    divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    pill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", pillBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };
};

interface AssignmentSection {
  sectionNumber: number;
  title: string;
  pageEstimate: string;
  wordCount: number;
  content: string;
}

interface AssignmentContent {
  title?: string;
  academicLevel?: string;
  targetPages?: number;
  totalWords?: number;
  tableOfContents?: { title: string; pages: string }[];
  sections?: AssignmentSection[];
  introduction: string;
  body: string;
  conclusion: string;
  references: string[];
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }) };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }) };
const slideRight = { hidden: { opacity: 0, x: -24 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { delay: i * 0.07, duration: 0.4 } }) };

function parseAssignmentSections(result: AssignmentContent | null, c: ReturnType<typeof mkColors>) {
  if (!result) return [];

  if (result.sections && result.sections.length > 0) {
    const list = result.sections.map((s, i) => ({
      title: s.title,
      content: s.content,
      pageEstimate: s.pageEstimate || `Page ${i + 1}`,
      wordCount: s.wordCount || (s.content ? s.content.split(/\s+/).length : 250),
      color: i === 0 ? c.purpleBg : i === result.sections!.length - 1 ? c.amberBg : c.cyanBg,
      border: i === 0 ? c.purpleBorder : i === result.sections!.length - 1 ? c.amberBorder : c.cyanBorder,
      accent: i === 0 ? "#a78bfa" : i === result.sections!.length - 1 ? c.amber : "#22d3ee",
      isRefs: false,
    }));

    if (result.references && result.references.length > 0) {
      list.push({
        title: "References",
        content: result.references.join("\n\n"),
        pageEstimate: `Page ${result.targetPages ? result.targetPages : "End"}`,
        wordCount: result.references.length * 15,
        color: c.surface,
        border: c.border,
        accent: c.textMuted,
        isRefs: true,
      });
    }
    return list;
  }

  const sectionsList: Array<{
    title: string;
    content: string;
    pageEstimate: string;
    wordCount: number;
    color: string;
    border: string;
    accent: string;
    isRefs?: boolean;
  }> = [];

  if (result.introduction) {
    sectionsList.push({
      title: "Introduction & Research Objectives",
      content: result.introduction,
      pageEstimate: "Pages 1–2",
      wordCount: result.introduction.split(/\s+/).length,
      color: c.purpleBg,
      border: c.purpleBorder,
      accent: "#a78bfa",
    });
  }

  if (result.body) {
    const bodyChapters = result.body.split(/(?=\n##\s+|\n#\s+)/).filter(b => b.trim().length > 20);
    if (bodyChapters.length > 1) {
      bodyChapters.forEach((ch, idx) => {
        const firstLine = ch.trim().split("\n")[0].replace(/^#+\s*/, "");
        const title = firstLine || `Chapter ${idx + 1}`;
        sectionsList.push({
          title,
          content: ch.trim(),
          pageEstimate: `Pages ${idx * 2 + 3}–${idx * 2 + 4}`,
          wordCount: ch.split(/\s+/).length,
          color: c.cyanBg,
          border: c.cyanBorder,
          accent: "#22d3ee",
        });
      });
    } else {
      sectionsList.push({
        title: "Main Body Content",
        content: result.body,
        pageEstimate: "Pages 3–14",
        wordCount: result.body.split(/\s+/).length,
        color: c.cyanBg,
        border: c.cyanBorder,
        accent: "#22d3ee",
      });
    }
  }

  if (result.conclusion) {
    sectionsList.push({
      title: "Conclusion & Future Research Directions",
      content: result.conclusion,
      pageEstimate: "Page End",
      wordCount: result.conclusion.split(/\s+/).length,
      color: c.amberBg,
      border: c.amberBorder,
      accent: c.amber,
    });
  }

  if (result.references && result.references.length > 0) {
    sectionsList.push({
      title: "References",
      content: result.references.join("\n\n"),
      pageEstimate: "Page End",
      wordCount: result.references.length * 15,
      color: c.surface,
      border: c.border,
      accent: c.textMuted,
      isRefs: true,
    });
  }

  return sectionsList;
}

export function AssignmentGeneratorView() {
  const theme = useTheme();
  const c = mkColors(theme);

  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<AssignmentContent | null>(null);
  const [topic, setTopic] = useState("Quantum Computing & Cryptography");
  const [level, setLevel] = useState("Undergraduate");
  const [wordCount, setWordCount] = useState("4500 words (15-20 pages)");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeSection, setActiveSection] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState<Array<{ name: string; date: string; level: string; words: string; data: AssignmentContent }>>([]);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const fullMarkdown = sections.map(s => `## ${s.title} (${s.pageEstimate || ""})\n\n${s.content}`).join("\n\n");
      const res = await api.post("/export/assignment/pdf", {
        assignmentTitle: result.title || topic,
        topic: result.title || topic,
        academicLevel: result.academicLevel || level,
        wordCount: result.totalWords || parseInt(wordCount) || 3500,
        content: fullMarkdown,
        format: "pdf"
      }, { responseType: "blob", timeout: 120000 });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(result.title || topic).replace(/\s+/g, "_")}_AdyapanAI.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Assignment PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("PDF export failed. Downloading Markdown fallback.");
      const txt = `# ${result.title || topic}\n\n` + sections.map(s => `## ${s.title}\n\n${s.content}`).join("\n\n");
      const blob = new Blob([txt], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${(result.title || topic).replace(/\s+/g, "_")}_assignment.md`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportDocx = async () => {
    if (!result) return;
    setExportingDocx(true);
    try {
      const fullMarkdown = sections.map(s => `## ${s.title} (${s.pageEstimate || ""})\n\n${s.content}`).join("\n\n");
      const res = await api.post("/export/assignment/docx", {
        assignmentTitle: result.title || topic,
        topic: result.title || topic,
        academicLevel: result.academicLevel || level,
        wordCount: result.totalWords || parseInt(wordCount) || 3500,
        content: fullMarkdown,
        format: "docx"
      }, { responseType: "blob", timeout: 120000 });

      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(result.title || topic).replace(/\s+/g, "_")}_AdyapanAI.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Assignment DOCX downloaded successfully!");
    } catch (err) {
      console.error("DOCX export error:", err);
      toast.error("Failed to generate DOCX. Try downloading PDF or copying content.");
    } finally {
      setExportingDocx(false);
    }
  };

  const { socket, isConnected } = useSocket();
  const userIdRef = useRef<string>("");
  const topicRef = useRef(topic);
  const levelRef = useRef(level);
  const wordCountRef = useRef(wordCount);

  useEffect(() => { topicRef.current = topic; }, [topic]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { wordCountRef.current = wordCount; }, [wordCount]);

  const addToHistory = useCallback((assignment: AssignmentContent) => {
    setHistory(prev => {
      const newItem = { name: topicRef.current, date: "Just now", level: levelRef.current, words: wordCountRef.current, data: assignment };
      const updated = [newItem, ...prev.filter(h => h.name !== topicRef.current)].slice(0, 10);
      localStorage.setItem("adyapan-assign-history", JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    try { const raw = localStorage.getItem("adyapan-user"); if (raw) userIdRef.current = (JSON.parse(raw) as { id?: string })?.id ?? ""; } catch { }
    try { const stored = localStorage.getItem("adyapan-assign-history"); if (stored) setHistory(JSON.parse(stored)); } catch {}
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleProgress = ({ progress: p, statusMessage }: { progress: number; statusMessage: string }) => { setProgress(p); setStatusMsg(statusMessage); };
    const handleComplete = ({ assignment }: { assignment: AssignmentContent }) => {
      setGenerating(false);
      setResult(assignment);
      const parsed = parseAssignmentSections(assignment, c);
      if (parsed.length > 0) setActiveSection(parsed[0].title);
      addToHistory(assignment);
    };
    const handleError = ({ error }: { error: string }) => { setGenerating(false); toast.error(`Generation error: ${error}`); };
    socket.on("generate:progress", handleProgress);
    socket.on("generate:complete", handleComplete);
    socket.on("generate:error", handleError);
    return () => { socket.off("generate:progress", handleProgress); socket.off("generate:complete", handleComplete); socket.off("generate:error", handleError); };
  }, [socket, addToHistory, c]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true); setProgress(0); setStatusMsg("Initializing Assignment Generator...");
    if (socket && isConnected) {
      socket.emit("generate:start", { moduleName: "assignment", payload: { topic, level, wordCount: wordCount.split(" ")[0], userId: userIdRef.current } });
    } else {
      try {
        setStatusMsg("Calling API directly...");
        const res = await api.post("/assignment/generate", { topic, academicLevel: level, wordCount: wordCount.split(" ")[0] });
        if (res.data?.success && res.data?.assignment?.content) {
          const assignment: AssignmentContent = res.data.assignment.content;
          setResult(assignment);
          const parsed = parseAssignmentSections(assignment, c);
          if (parsed.length > 0) setActiveSection(parsed[0].title);
          addToHistory(assignment);
        } else throw new Error("Invalid response");
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        toast.error(e?.response?.data?.error || "Failed to generate assignment via API.");
      } finally {
        setGenerating(false);
      }
    }
  }, [socket, isConnected, topic, level, wordCount, addToHistory, c]);

  const handleScrollToSection = (title: string) => {
    setActiveSection(prev => (prev === title ? "" : title));
  };

  const loadHistoryItem = (item: typeof history[0]) => {
    setTopic(item.name); setLevel(item.level); setWordCount(item.words); setResult(item.data);
    const parsed = parseAssignmentSections(item.data, c);
    if (parsed.length > 0) setActiveSection(parsed[0].title);
    setShowHistory(false);
  };

  const sections = parseAssignmentSections(result, c);

  const stages = ["Research Topic", "Structure Pages", "Draft Sections", "Add References", "Compile Output", "Completed"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col antialiased" style={{ color: c.text }}>
      <style>{`.ag-scroll { scrollbar-width: none; -ms-overflow-style: none; } .ag-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <PenTool size={18} style={{ color: "#000" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>Assignment Generator</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-xs leading-tight" style={{ color: c.textMuted }}>AI-powered academic drafts with references</motion.p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setResult(null); }} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
              <Plus size={14} /> New Topic
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setShowHistory(!showHistory)} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            style={{ background: showHistory ? c.amberActive : c.surface, border: `1px solid ${showHistory ? c.amberBorder : c.border}`, color: showHistory ? c.amber : c.text }}>
            <History size={14} /> History
            {history.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: c.amberBg, color: c.amber }}>{history.length}</span>}
          </motion.button>
        </div>
      </div>

      {/* HISTORY PANEL */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowHistory(false)}
              style={{
                position: "fixed", top: "70px", left: 0, right: 0, bottom: 0, zIndex: 98,
                background: "rgba(0,0,0,0.4)",
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              style={{
                position: "fixed", top: "70px", right: 0, bottom: 0, zIndex: 99,
                width: "min(420px, 90vw)",
                background: c.isDark ? "rgba(18, 17, 26, 0.95)" : "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(20px)",
                borderLeft: `1px solid ${c.border}`,
                display: "flex", flexDirection: "column",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: `1px solid ${c.divider}`,
                background: c.surface,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <History size={16} style={{ color: c.amber }} />
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: c.text }}>Recent Assignments</span>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, color: c.amber,
                    background: c.amberBg, padding: "1px 7px", borderRadius: 999,
                  }}>
                    {history.length}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowHistory(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: c.textMuted, padding: 4 }}
                >
                  <X size={18} />
                </motion.button>
              </div>
              <div style={{ padding: "0.75rem 1.25rem" }}>
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: c.textMuted }} />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    style={{
                      width: "100%", padding: "0.55rem 0.75rem 0.55rem 2rem",
                      borderRadius: 10, fontSize: "0.8rem", outline: "none",
                      background: c.pill, border: `1px solid ${c.border}`,
                      color: c.text, boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem 1rem" }}>
                {history.filter(doc => doc.name.toLowerCase().includes(historySearch.toLowerCase())).length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: 8 }}>
                    <FileText size={32} style={{ color: c.textMuted, opacity: 0.3 }} />
                    <p style={{ fontSize: "0.82rem", color: c.textMuted, textAlign: "center" }}>No assignments generated yet. Submit a topic to begin.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {history.filter(doc => doc.name.toLowerCase().includes(historySearch.toLowerCase())).map((doc, i) => (
                      <motion.div
                        key={doc.name}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => {
                          loadHistoryItem(doc);
                          setShowHistory(false);
                        }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.65rem 0.75rem", borderRadius: 12, cursor: "pointer",
                          background: c.cardBg, border: `1px solid ${c.border}`,
                        }}
                        whileHover={{ borderColor: c.amberBorder, background: c.amberBg }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                            <FileText size={13} style={{ color: c.amber, margin: "auto" }} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: c.text, margin: 0 }} className="truncate">{doc.name}</p>
                            <p style={{ fontSize: "0.68rem", color: c.textMuted, margin: "2px 0 0" }}>{doc.date} · {doc.level} · {doc.words}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <motion.button
                            whileHover={{ scale: 1.15, color: "#ef4444" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = history.filter(h => h.name !== doc.name);
                              setHistory(updated);
                              try {
                                localStorage.setItem("adyapan-assignment-history", JSON.stringify(updated));
                                toast.success(`Removed "${doc.name}" from history`);
                              } catch { /* ignore */ }
                            }}
                            title="Delete from history"
                            style={{
                              background: "transparent", border: "none", color: c.textMuted,
                              padding: "4px 6px", borderRadius: 6, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                          <ChevronRight size={14} style={{ color: c.textMuted }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1">
        <AnimatePresence mode="wait">

          {/* EMPTY STATE */}
          {!generating && !result && (
            <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Config Form */}
              <motion.div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: c.surface, border: `2px solid ${c.border}` }}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-8 w-24 h-24 rounded-full" style={{ opacity: c.isDark ? 0.05 : 0.08, background: "radial-gradient(circle, #f59e0b, transparent)" }} />
                  <div className="absolute bottom-4 left-8 w-16 h-16 rounded-full" style={{ opacity: c.isDark ? 0.04 : 0.06, background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
                </div>
                <div className="relative z-10 space-y-4">
                  <h3 className="text-lg font-extrabold text-center" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>Configure Assignment Draft</h3>
                  <div className="space-y-3 max-w-xl mx-auto">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: c.textSec }}>Assignment Topic</label>
                      <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The impact of quantum computing on cryptography"
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: c.textSec }}>Academic Level</label>
                        <select value={level} onChange={e => setLevel(e.target.value)}
                          className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none appearance-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                          <option>High School</option>
                          <option>Undergraduate</option>
                          <option>Master&apos;s</option>
                          <option>PhD / Doctorate</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: c.textSec }}>Target Length / Pages</label>
                        <select value={wordCount} onChange={e => setWordCount(e.target.value)}
                          className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none appearance-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}>
                          <option>500 words (1-2 pages)</option>
                          <option>1500 words (5-6 pages)</option>
                          <option>3000 words (10-12 pages)</option>
                          <option>4500 words (15-20 pages)</option>
                          <option>5500 words (18-22 pages)</option>
                        </select>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleGenerate}
                      className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                      <PenTool size={16} /> Generate Assignment
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Presets */}
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Zap size={15} style={{ color: c.amber }} /> Choose Preset Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Scientific Report Outlines", desc: "Formats assignment briefs into introduction, experimental body paragraphs, and conclusion blocks.", icon: <Star size={18} style={{ color: c.amber }} /> },
                    { title: "Literature Review Drafts", desc: "Synthesizes existing papers, highlights critical differences, and references source databases.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { title: "Analytical Essays Reviews", desc: "Constructs essays focused on comparing conceptual parameters, detailing arguments, and citing sources.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
                  ].map((item, i) => (
                    <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => setTopic(item.title)} className="p-5 rounded-2xl relative overflow-hidden cursor-pointer group transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                        <div><h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>{item.title}</h4></div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* How It Works */}
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Zap size={15} style={{ color: c.amber }} /> How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: "01", title: "Outline Topic", desc: "State the research assignment questions and specify academic degree level.", icon: <PenTool size={18} style={{ color: c.amber }} /> },
                    { step: "02", title: "Process Context", desc: "AI references publications, writes cohesive paragraphs, and matches styles.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { step: "03", title: "Export Outputs", desc: "Review the full essay draft, copy sections, or download formatted documents.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
                  ].map((item, i) => (
                    <motion.div key={item.step} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }} className="p-5 rounded-2xl relative overflow-hidden group transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                        <div><span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.amber }}>Step {item.step}</span><h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>{item.title}</h4></div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Star size={14} style={{ color: c.amber }} /> Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {["Introduction", "Page-Based Sections", "Conclusion", "References", "Multiple Academic Levels", "Copy & Export"].map((feat, i) => (
                    <motion.div key={feat} custom={i} variants={scaleIn} initial="hidden" animate="visible" className="flex items-center gap-2 text-sm" style={{ color: c.textSec }}>
                      <CheckCircle2 size={14} style={{ color: c.amber }} className="shrink-0" />
                      <span>{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* PROCESSING */}
          {generating && (
            <motion.div key="generating" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 gap-8">
              <div className="relative w-24 h-24">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full" style={{ border: `3px solid transparent`, borderTopColor: c.amber, borderRightColor: c.amberBg }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-3 rounded-full" style={{ border: `2px solid transparent`, borderTopColor: "rgba(139,92,246,0.6)", borderLeftColor: "rgba(139,92,246,0.2)" }} />
                <div className="absolute inset-0 flex items-center justify-center"><Brain size={28} style={{ color: c.amber }} /></div>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>Writing Assignment...</h3>
                <p className="text-sm" style={{ color: c.textMuted }}>{statusMsg}</p>
              </div>
              <div className="w-full max-w-lg grid grid-cols-3 gap-3">
                {stages.map((step, idx) => {
                  const currentStage = progress === 0 ? -1 : Math.min(Math.floor((progress / 100) * (stages.length - 1)), stages.length - 1);
                  const isActive = idx <= currentStage;
                  return (
                    <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                      className="p-3 rounded-xl text-center space-y-1.5 transition-all duration-500" style={{ background: isActive ? c.amberBg : c.surface, border: `1px solid ${isActive ? c.amberBorder : c.border}` }}>
                      <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: c.amber }}>Stage {idx + 1}</span>
                      <span className="text-xs font-semibold block" style={{ color: c.text }}>{step}</span>
                      {isActive && idx === currentStage && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2 h-2 rounded-full mx-auto" style={{ background: c.amber }} />}
                      {isActive && idx < currentStage && <CheckCircle2 size={12} style={{ color: c.green }} className="mx-auto" />}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* READY — 30/70 SPLIT */}
          {!generating && result && (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-0" style={{ minHeight: "600px" }}>
              {/* LEFT PANEL 30% */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                className="ag-scroll flex flex-col gap-3 overflow-y-auto pr-3" style={{ width: "30%", minWidth: "200px", maxHeight: "80vh", position: "sticky", top: 0 }}>
                {/* Info Card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-2xl shrink-0" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                      <FileText size={14} style={{ color: c.amber }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: c.text }}>{result.title || topic}</p>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: c.greenBg, color: c.green }}>Generated</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Sections", value: sections.length },
                      { label: "Level", value: result.academicLevel || level },
                      { label: "Est. Pages", value: result.targetPages ? `${result.targetPages} Pages` : wordCount.split(" ")[1] || "15-20 pages" },
                      { label: "References", value: result.references?.length || 0 }
                    ].map(stat => (
                      <div key={stat.label} className="p-2 rounded-lg text-center" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                        <span className="text-[10px] block" style={{ color: c.textMuted }}>{stat.label}</span>
                        <span className="text-xs font-extrabold truncate block" style={{ color: c.text }}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Sections Nav */}
                <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: c.divider, background: c.stickyBg }}>
                    <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.amber }}>Page Sections ({sections.length})</span>
                  </div>
                  <div className="p-2 space-y-1">
                    {sections.map((s, i) => (
                      <motion.button key={s.title} custom={i} variants={slideRight} initial="hidden" animate="visible"
                        onClick={() => handleScrollToSection(s.title)} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                        className="w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between transition-all duration-200"
                        style={{ background: activeSection === s.title ? c.amberActive : "transparent", border: activeSection === s.title ? `1px solid ${c.amberBorder}` : "1px solid transparent" }}>
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="text-xs font-semibold block truncate" style={{ color: activeSection === s.title ? c.amber : c.textSec }}>{s.title}</span>
                          <span className="text-[9px] font-mono block text-amber-500/80 mt-0.5">{s.pageEstimate}</span>
                        </div>
                        <motion.div animate={{ rotate: activeSection === s.title ? 90 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight size={12} style={{ color: activeSection === s.title ? c.amber : c.textMuted }} />
                        </motion.div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="p-3 rounded-2xl shrink-0" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                  <span className="text-[10px] font-black uppercase tracking-widest block mb-2.5 flex items-center gap-1.5" style={{ color: c.amber }}><Sparkles size={11} /> Document Breakdown</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Academic Level", value: result.academicLevel || level },
                      { label: "References", value: result.references?.length || 0 },
                      { label: "Page Sections", value: sections.length },
                      { label: "Est. Words", value: result.totalWords ? `${result.totalWords} words` : wordCount }
                    ].map((insight, i) => (
                      <motion.div key={insight.label} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.08 }}
                        className="p-2 rounded-xl text-center" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                        <span className="text-[10px] block leading-tight" style={{ color: c.textMuted }}>{insight.label}</span>
                        <span className="text-xs font-extrabold block truncate mt-0.5" style={{ color: c.text }}>{insight.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="p-3 rounded-2xl shrink-0 space-y-2" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.textMuted }}>Export Options</span>
                  
                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    disabled={exportingPdf}
                    onClick={handleExportPdf}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm font-bold transition-all text-left" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.amber }}>
                    <span className="flex items-center gap-2">
                      {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                      Download PDF
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">PDF</span>
                  </motion.button>

                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    disabled={exportingDocx}
                    onClick={handleExportDocx}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm font-bold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
                    <span className="flex items-center gap-2">
                      {exportingDocx ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} style={{ color: c.amber }} />}
                      Download DOCX
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-slate-500/10 px-1.5 py-0.5 rounded">DOCX</span>
                  </motion.button>

                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const txt = `# ${result.title || topic}\n\nLevel: ${result.academicLevel || level}\nPages: ${result.targetPages || "Custom"}\n\n` + sections.map(s => `## ${s.title} (${s.pageEstimate})\n\n${s.content}`).join("\n\n");
                      navigator.clipboard.writeText(txt);
                      toast.success("Full assignment copied to clipboard!");
                    }}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                    <span style={{ color: c.amber }} className="shrink-0"><Copy size={12} /></span> Copy Full Assignment
                  </motion.button>

                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const txt = `# ${result.title || topic}\n\nLevel: ${result.academicLevel || level}\nPages: ${result.targetPages || "Custom"}\n\n` + sections.map(s => `## ${s.title} (${s.pageEstimate})\n\n${s.content}`).join("\n\n");
                      const blob = new Blob([txt], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `${(result.title || topic).replace(/\s+/g, "_")}_assignment.md`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Assignment exported as Markdown!");
                    }}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                    <span style={{ color: c.amber }} className="shrink-0"><FileDown size={12} /></span> Download Markdown
                  </motion.button>

                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setResult(null); }}
                    className="w-full py-2 rounded-lg text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 mt-1" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                    <RefreshCw size={13} /> New Topic
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* RIGHT PANEL 70% */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="flex-1 flex flex-col min-w-0 pl-4">
                <div className="space-y-3 pb-4">
                  {sections.map((s, idx) => {
                    const isOpen = activeSection === s.title;
                    return (
                      <motion.div key={s.title} id={`assign-${s.title.replace(/\s+/g, "-")}`} custom={idx} variants={scaleIn} initial="hidden" animate="visible"
                        className="rounded-2xl overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${isOpen ? c.amberBorder : c.border}` }}>
                        <motion.button onClick={() => handleScrollToSection(s.title)} whileHover={{ background: isOpen ? c.amberBg : c.bgHover }} whileTap={{ scale: 0.995 }}
                          className="w-full flex items-center justify-between px-5 py-4 text-left transition-all" style={{ background: isOpen ? c.amberBg : c.surface, borderBottom: isOpen ? `1px solid ${c.divider}` : "none" }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: isOpen ? `${s.accent}20` : c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                              {s.isRefs ? <Quote size={14} style={{ color: c.amber }} /> : <Layers size={14} style={{ color: c.amber }} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>{s.title}</h3>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: c.amberBg, color: c.amber, border: `1px solid ${c.amberBorder}` }}>{s.pageEstimate}</span>
                              </div>
                              {!isOpen && !s.isRefs && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: c.textMuted }}>{stripMarkdown(s.content).slice(0, 90)}…</p>}
                              {!isOpen && s.isRefs && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: c.textMuted }}>{result.references?.length || 0} reference citations</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full hidden sm:block" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textMuted }}>{s.wordCount} words</span>
                            <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.25 }}><ChevronRight size={16} style={{ color: isOpen ? c.amber : c.textMuted }} /></motion.div>
                          </div>
                        </motion.button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                              <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between pb-2" style={{ borderBottom: `1px solid ${c.divider}` }}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold" style={{ color: c.textMuted }}>Section {idx + 1} of {sections.length}</span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={{ background: c.surface, color: c.amber }}>{s.pageEstimate}</span>
                                  </div>
                                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(s.content); toast.success(`Section "${s.title}" copied!`); }}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                                    <Copy size={12} style={{ color: c.amber }} /> Copy Section
                                  </motion.button>
                                </div>

                                {s.isRefs ? (
                                  <ul className="space-y-2.5 pt-1">
                                    {(result.references || []).map((ref, ri) => (
                                      <li key={ri} className="flex items-start gap-2 text-sm leading-relaxed" style={{ color: c.textSec }}>
                                        <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: c.amber }}>[{ri + 1}]</span>
                                        <span>{ref}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="space-y-3">
                                    {s.content.split("\n\n").map((para, pi) => {
                                      const trimmed = para.trim();
                                      if (!trimmed) return null;
                                      if (trimmed.startsWith("#")) {
                                        return <h4 key={pi} className="text-sm font-extrabold mt-3" style={{ color: c.amber }}>{trimmed.replace(/^#+\s*/, "")}</h4>;
                                      }
                                      return (
                                        <p key={pi} className="text-[14px] leading-[1.8]" style={{ color: c.textSec }}>
                                          {stripMarkdown(trimmed)}
                                        </p>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

