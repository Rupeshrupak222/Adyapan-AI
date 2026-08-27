"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown, cleanMarkdown } from "@/utils/stripMarkdown";
import { FormattedText } from "@/components/ui/FormattedText";
import {
  BookOpen, Copy, FileDown, RefreshCw, ChevronRight, Search, Plus, History,
  CheckCircle2, Sparkles, Brain, Zap, Star, X, FileText, Layers, Download, Loader2, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/context/SocketContext";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { getAuthUser } from "@/hooks/useAuth";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";

const mkColors = (theme: string) => {
  const isDark = theme === "dark";
  return {
    isDark,
    text: isDark ? "#e5e7eb" : "#0f172a", textSec: isDark ? "#9ca3af" : "#475569", textMuted: isDark ? "#828fa3" : "#5f6368", textOnAmber: "#000000",
    bg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", bgHover: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderHover: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)",
    borderFocus: isDark ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.5)", inputBg: isDark ? "#121214" : "#f1f5f9",
    cardBg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", cardBgAlt: isDark ? "rgba(0,0,0,0.25)" : "#f8fafc",
    stickyBg: isDark ? "rgba(10,10,20,0.88)" : "rgba(248,250,252,0.92)",
    amber: "#f59e0b", amberBg: isDark ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.08)", amberBorder: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.25)", amberActive: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
    purpleBg: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.05)", purpleBorder: isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.15)",
    cyanBg: isDark ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.05)", cyanBorder: isDark ? "rgba(6,182,212,0.14)" : "rgba(6,182,212,0.15)",
    green: "#10b981", greenBg: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
    divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    pill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", pillBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };
};

interface NoteSection { title: string; content: string; bulletPoints: string[]; }

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }) };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }) };
const slideRight = { hidden: { opacity: 0, x: -24 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { delay: i * 0.07, duration: 0.4 } }) };

export function NotesGeneratorView() {
  const theme = useTheme();
  const c = mkColors(theme);
  const quota = useFeatureQuota("NOTES_GENERATOR");

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [notesData, setNotesData] = useState<{ topic: string; sections: NoteSection[]; wordCount: number; studyTime: string; difficulty: string; rawContent?: string; formattedHtml?: string; } | null>(null);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [noteType, setNoteType] = useState("Detailed Notes");
  const [activeSection, setActiveSection] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState<Array<{ name: string; date: string; type: string; sections: number; data: { topic: string; sections: NoteSection[]; wordCount: number; studyTime: string; difficulty: string; rawContent?: string; formattedHtml?: string } }>>([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const { socket, isConnected } = useSocket();
  const userIdRef = useRef<string>("");
  const topicRef = useRef(topic);
  const difficultyRef = useRef(difficulty);
  const noteTypeRef = useRef(noteType);

  useEffect(() => { topicRef.current = topic; }, [topic]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { noteTypeRef.current = noteType; }, [noteType]);

  function parseMarkdownToSections(md: string): NoteSection[] {
    const sections: NoteSection[] = [];
    const lines = md.split("\n");
    let currentSection: NoteSection | null = null;
    for (const line of lines) {
      if (line.startsWith("## ") || line.startsWith("### ") || line.startsWith("# ")) {
        if (currentSection) sections.push(currentSection);
        currentSection = { title: line.replace(/^#+\s+/, "").replace(/\*+/g, "").trim(), content: "", bulletPoints: [] };
      } else if (currentSection) {
        if (line.trim().startsWith("-") || line.trim().startsWith("*")) currentSection.bulletPoints.push(line.replace(/^[-*]\s+/, ""));
        else currentSection.content += line + "\n";
      }
    }
    if (currentSection) sections.push(currentSection);
    if (sections.length === 0) return [{ title: "Generated Notes", content: md, bulletPoints: [] }];
    return sections;
  }

  const getUserScopedKey = (baseKey: string) => {
    try {
      const u = getAuthUser();
      const id = u?.id || u?.email;
      return id ? `${baseKey}-${id}` : baseKey;
    } catch { return baseKey; }
  };

  const addToHistory = useCallback((newNotes: { topic: string; sections: NoteSection[]; wordCount: number; studyTime: string; difficulty: string; rawContent?: string; formattedHtml?: string }, content: string, parsedSections: NoteSection[]) => {
    setHistory(prev => {
      const newItem = { name: topicRef.current, date: "Just now", type: noteTypeRef.current, sections: parsedSections.length, data: newNotes };
      const updated = [newItem, ...prev.filter(h => h.name !== topicRef.current)].slice(0, 10);
      localStorage.setItem(getUserScopedKey("adyapan-notes-history"), JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    try { const raw = localStorage.getItem("adyapan-user"); if (raw) userIdRef.current = (JSON.parse(raw) as { id?: string })?.id ?? ""; } catch { }
    try { const stored = localStorage.getItem(getUserScopedKey("adyapan-notes-history")); if (stored) setHistory(JSON.parse(stored)); } catch {}
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleProgress = ({ progress: p, statusMessage }: { progress: number; statusMessage: string }) => { setProgress(p); setStatusMsg(statusMessage); };
    const handleComplete = ({ content, formattedContent }: { content: string; formattedContent?: string }) => {
      setGenerating(false);
      quota.onSuccess();
      const parsedSections = parseMarkdownToSections(content);
      const newNotes = { topic: topicRef.current, sections: parsedSections, wordCount: content.split(/\s+/).length, studyTime: `${Math.ceil(content.split(/\s+/).length / 200)} mins`, difficulty: difficultyRef.current, rawContent: content, formattedHtml: formattedContent || "" };
      setNotesData(newNotes);
      if (parsedSections.length > 0) setActiveSection(parsedSections[0].title);
      addToHistory(newNotes, content, parsedSections);
    };
    const handleError = ({ error, code }: { error: string; code?: string }) => {
      setGenerating(false);
      if (code === "FEATURE_LIMIT_REACHED") quota.refresh();
      toast.error(`Generation error: ${error}`);
    };
    socket.on("generate:progress", handleProgress);
    socket.on("generate:complete", handleComplete);
    socket.on("generate:error", handleError);
    return () => { socket.off("generate:progress", handleProgress); socket.off("generate:complete", handleComplete); socket.off("generate:error", handleError); };
  }, [socket, addToHistory]);

  const handleGenerate = useCallback(async () => {
    if (quota.exhausted) {
      toast.error("You've used all free AI Notes Generator attempts this month.", {
        description: "Upgrade to Premium for 30 monthly notes generations.",
      });
      return;
    }
    setGenerating(true); setProgress(0); setStatusMsg("Starting notes generator pipeline...");
    if (socket && isConnected) {
      socket.emit("generate:start", { moduleName: "notes", payload: { topic, difficulty, type: noteType, userId: userIdRef.current } });
    } else {
      const requestId = quota.newRequestId();
      try {
        setStatusMsg("Calling API directly...");
        const res = await api.post("/notes/generate", { topic, difficulty, type: noteType, requestId });
        if (res.data?.success && res.data?.note?.content) {
          quota.onSuccess();
          const content = res.data.note.content;
          const formattedContent = res.data.note.formattedContent || "";
          const parsedSections = parseMarkdownToSections(content);
          const newNotes = { topic, sections: parsedSections, wordCount: content.split(/\s+/).length, studyTime: `${Math.ceil(content.split(/\s+/).length / 200)} mins`, difficulty, rawContent: content, formattedHtml: formattedContent };
          setNotesData(newNotes);
          if (parsedSections.length > 0) setActiveSection(parsedSections[0].title);
          addToHistory(newNotes, content, parsedSections);
        } else throw new Error("Invalid response");
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        if (!quota.handleQuotaError(err)) {
          await quota.onFailure();
          toast.error(e?.response?.data?.error || "Failed to generate notes via API.");
        }
      } finally {
        setGenerating(false);
      }
    }
  }, [socket, isConnected, topic, difficulty, noteType, addToHistory, quota]);

  const handleScrollToSection = (title: string) => {
    setActiveSection(prev => (prev === title ? "" : title));
  };

  const [downloadingDocx, setDownloadingDocx] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    if (!notesData?.rawContent) {
      toast.error("No notes content available for PDF export.");
      return;
    }
    setDownloadingPdf(true);
    try {
      const res = await api.post("/notes/export/pdf", {
        content: notesData.rawContent,
        topic: notesData.topic,
        difficulty: notesData.difficulty,
        type: noteType,
      }, { responseType: "blob" });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${notesData.topic.replace(/\s+/g, "_")}_AdyapanAI_Notes.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      console.error("PDF download error:", err);
      toast.error(e?.response?.data?.error || "Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  }, [notesData, noteType]);

  const handleDownloadDocx = useCallback(async () => {
    if (!notesData?.rawContent) {
      toast.error("No notes content available for DOCX export.");
      return;
    }
    setDownloadingDocx(true);
    try {
      const res = await api.post("/notes/export/docx", {
        content: notesData.rawContent,
        topic: notesData.topic,
        difficulty: notesData.difficulty,
        type: noteType,
        format: "docx",
      }, { responseType: "blob" });

      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${notesData.topic.replace(/\s+/g, "_")}_Notes.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("DOCX downloaded successfully!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      console.error("DOCX download error:", err);
      toast.error(e?.response?.data?.error || "Failed to generate DOCX. Please try again.");
    } finally {
      setDownloadingDocx(false);
    }
  }, [notesData, noteType]);

  const loadHistoryItem = (item: typeof history[0]) => {
    setTopic(item.name); setNoteType(item.type); setNotesData(item.data); setActiveSection(item.data.sections[0]?.title || ""); setShowHistory(false);
  };

  const filteredSections = notesData?.sections.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const stages = ["Research Topic", "Extract Syllabus", "Structure Layout", "Generate Notes", "Compile Output", "Completed"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col antialiased" style={{ color: c.text }}>
      <style>{`.ng-scroll { scrollbar-width: none; -ms-overflow-style: none; } .ng-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <BookOpen size={18} style={{ color: "#000" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Notes Generator</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-xs leading-tight" style={{ color: c.textMuted }}>AI-powered comprehensive study notes</motion.p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FeatureCreditBadge featureKey="NOTES_GENERATOR" compact isDark={theme === "dark"} />
          {notesData && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setNotesData(null); setSearchQuery(""); }} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
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
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: c.text }}>Recent Notes</span>
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
                    <p style={{ fontSize: "0.82rem", color: c.textMuted, textAlign: "center" }}>No notes generated yet. Submit a topic to begin.</p>
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
                            <p style={{ fontSize: "0.68rem", color: c.textMuted, margin: "2px 0 0" }}>{doc.date} · {doc.type} · {doc.sections} sections</p>
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
                                localStorage.setItem(getUserScopedKey("adyapan-notes-history"), JSON.stringify(updated));
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
          {!generating && !notesData && (
            <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              {/* Config Form */}
              <motion.div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: c.surface, border: `2px solid ${c.border}` }}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-8 w-24 h-24 rounded-full" style={{ opacity: c.isDark ? 0.05 : 0.08, background: "radial-gradient(circle, #f59e0b, transparent)" }} />
                  <div className="absolute bottom-4 left-8 w-16 h-16 rounded-full" style={{ opacity: c.isDark ? 0.04 : 0.06, background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
                </div>
                <div className="relative z-10 space-y-4">
                  <h3 className="text-lg font-extrabold text-center" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Configure Notes Outline</h3>
                  <div className="space-y-3 max-w-xl mx-auto">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: c.textSec }}>Topic or Subject</label>
                      <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Operating Systems, Advanced Data Structures"
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: c.textSec }}>Difficulty</label>
                        <div className="relative">
                          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                            className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition-all focus:outline-none appearance-none cursor-pointer" style={{ background: c.isDark ? "#121214" : "#ffffff", border: `1px solid ${c.border}`, color: c.text }}>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Beginner</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Intermediate</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Advanced</option>
                          </select>
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: c.textSec }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: c.textSec }}>Note Type</label>
                        <div className="relative">
                          <select value={noteType} onChange={e => setNoteType(e.target.value)}
                            className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition-all focus:outline-none appearance-none cursor-pointer" style={{ background: c.isDark ? "#121214" : "#ffffff", border: `1px solid ${c.border}`, color: c.text }}>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Detailed Notes</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Short Revision</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Formulas Only</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Exam Cheat Sheet</option>
                          </select>
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: c.textSec }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                          </span>
                        </div>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleGenerate}
                      className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                      <BookOpen size={16} /> Generate Notes
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Presets */}
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Zap size={15} style={{ color: c.amber }} /> Choose from Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Exam Study Guide", desc: "Structured to highlight essential exam components, sample review formulations, and critical milestones.", icon: <Star size={18} style={{ color: c.amber }} /> },
                    { title: "Key Terms & Glossaries", desc: "Filters subject files to isolate definitions, equations, algorithms, and core keywords.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { title: "Interview Prep Notes", desc: "Formulates questions, brief code samples, and conceptual outlines suitable for placement audits.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
                  ].map((item, i) => (
                    <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => setTopic(item.title)} className="p-5 rounded-2xl relative overflow-hidden cursor-pointer group transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                        <div><h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>{item.title}</h4></div>
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
                    { step: "01", title: "Configure", desc: "Input a study module brief or syllabus guidelines, choose details level.", icon: <BookOpen size={18} style={{ color: c.amber }} /> },
                    { step: "02", title: "Draft Outline", desc: "The generator designs structure partitions and details theoretical summaries.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { step: "03", title: "Review & Export", desc: "Open notes directly, copy sections, or download formatted study materials.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
                  ].map((item, i) => (
                    <motion.div key={item.step} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }} className="p-5 rounded-2xl relative overflow-hidden group transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                        <div><span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.amber }}>Step {item.step}</span><h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>{item.title}</h4></div>
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
                  {["Topic-wise Sections", "Bullet Points", "Structured Layout", "Multiple Levels", "Search Content", "Copy & Export"].map((feat, i) => (
                    <motion.div key={feat} custom={i} variants={scaleIn} initial="hidden" animate="visible" className="flex items-center gap-2 text-sm" style={{ color: c.textSec }}>
                      <CheckCircle2 size={14} style={{ color: c.amber }} className="shrink-0" />
                      <span>{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* PROCESSING STATE */}
          {generating && (
            <motion.div key="generating" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 gap-8">
              <div className="relative w-24 h-24">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full" style={{ border: `3px solid transparent`, borderTopColor: c.amber, borderRightColor: c.amberBg }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-3 rounded-full" style={{ border: `2px solid transparent`, borderTopColor: "rgba(139,92,246,0.6)", borderLeftColor: "rgba(139,92,246,0.2)" }} />
                <div className="absolute inset-0 flex items-center justify-center"><Brain size={28} style={{ color: c.amber }} /></div>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Generating Notes...</h3>
                <p className="text-sm" style={{ color: c.textMuted }}>{statusMsg}</p>
              </div>
              <div className="w-full max-w-lg grid grid-cols-3 gap-3">
                {stages.map((step, idx) => {
                  const stageIdx = progress === 0 ? -1 : Math.min(Math.floor((progress / 100) * (stages.length - 1)), stages.length - 1);
                  const isActive = idx <= stageIdx;
                  return (
                    <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                      className="p-3 rounded-xl text-center space-y-1.5 transition-all duration-500" style={{ background: isActive ? c.amberBg : c.surface, border: `1px solid ${isActive ? c.amberBorder : c.border}` }}>
                      <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: c.amber }}>Stage {idx + 1}</span>
                      <span className="text-xs font-semibold block" style={{ color: c.text }}>{step}</span>
                      {isActive && idx === stageIdx && <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }} className="w-2 h-2 rounded-full mx-auto" style={{ background: c.amber }} />}
                      {isActive && idx < stageIdx && <CheckCircle2 size={12} style={{ color: c.green }} className="mx-auto" />}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* READY STATE — 30/70 SPLIT */}
          {!generating && notesData && (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-0" style={{ minHeight: "600px" }}>
              {/* LEFT PANEL 30% */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                className="ng-scroll flex flex-col gap-3 overflow-y-auto pr-3" style={{ width: "30%", minWidth: "200px", maxHeight: "80vh", position: "sticky", top: 0 }}>
                {/* Info card */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-2xl shrink-0" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                      <FileText size={14} style={{ color: c.amber }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: c.text }}>{notesData.topic}</p>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase" style={{ background: c.greenBg, color: c.green }}>Generated</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Sections", value: notesData.sections.length },
                      { label: "Words", value: notesData.wordCount.toLocaleString() },
                      { label: "Study Time", value: notesData.studyTime },
                      { label: "Difficulty", value: notesData.difficulty }
                    ].map(stat => (
                      <div key={stat.label} className="p-2 rounded-lg text-center" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                        <span className="text-[10px] block" style={{ color: c.textMuted }}>{stat.label}</span>
                        <span className="text-xs font-extrabold" style={{ color: c.text }}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Sections Nav */}
                <div className="flex-1 rounded-2xl overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <div className="p-3 border-b sticky top-0 z-10" style={{ borderColor: c.divider, background: c.stickyBg, backdropFilter: "blur(12px)" }}>
                    <span className="text-[10px] font-black uppercase tracking-widest block mb-2" style={{ color: c.amber }}>Sections</span>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                      <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search sections..."
                        className="w-full rounded-lg pl-7 pr-2 py-1.5 text-xs focus:outline-none transition-colors" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                  </div>
                  <div className="p-2 space-y-0.5">
                    {notesData.sections.map((s, i) => (
                      <motion.button key={s.title} custom={i} variants={slideRight} initial="hidden" animate="visible"
                        onClick={() => handleScrollToSection(s.title)} whileHover={{ x: 3 }} whileTap={{ scale: 0.98 }}
                        className="w-full text-left py-2.5 px-3 rounded-xl flex items-center justify-between transition-all duration-200"
                        style={{ background: activeSection === s.title ? c.amberActive : "transparent", border: activeSection === s.title ? `1px solid ${c.amberBorder}` : "1px solid transparent" }}>
                        <span className="text-sm font-semibold truncate" style={{ color: activeSection === s.title ? c.amber : c.textSec }}>{s.title}</span>
                        <motion.div animate={{ rotate: activeSection === s.title ? 90 : 0 }} transition={{ duration: 0.2 }}>
                          <ChevronRight size={12} style={{ color: activeSection === s.title ? c.amber : c.textMuted }} />
                        </motion.div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Insights */}
                <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="p-3 rounded-2xl shrink-0" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                  <span className="text-[10px] font-black uppercase tracking-widest block mb-2.5 flex items-center gap-1.5" style={{ color: c.amber }}><Sparkles size={11} /> Notes Insights</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: "Total Sections", value: notesData.sections.length },
                      { label: "Word Count", value: notesData.wordCount.toLocaleString() },
                      { label: "Est. Study Time", value: notesData.studyTime },
                      { label: "Difficulty", value: notesData.difficulty }
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
                  <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.textMuted }}>Export & Share</span>
                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDownloadPdf}
                    disabled={downloadingPdf}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all text-left" style={{ background: downloadingPdf ? c.surface : "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))", border: `1px solid ${downloadingPdf ? c.border : "rgba(245,158,11,0.3)"}`, color: downloadingPdf ? c.textMuted : c.amber, opacity: downloadingPdf ? 0.7 : 1 }}>
                    <span className="shrink-0">{downloadingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}</span> {downloadingPdf ? "Generating PDF..." : "Download PDF"}
                  </motion.button>
                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDownloadDocx}
                    disabled={downloadingDocx}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all text-left" style={{ background: downloadingDocx ? c.surface : "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.06))", border: `1px solid ${downloadingDocx ? c.border : "rgba(139,92,246,0.25)"}`, color: downloadingDocx ? c.textMuted : "#a78bfa", opacity: downloadingDocx ? 0.7 : 1 }}>
                    <span className="shrink-0">{downloadingDocx ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}</span> {downloadingDocx ? "Generating DOCX..." : "Download DOCX"}
                  </motion.button>
                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const txt = notesData.sections.map(s => `## ${s.title}\n${s.content}\n${s.bulletPoints.map(b => `- ${b}`).join("\n")}`).join("\n\n");
                      const blob = new Blob([txt], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `${notesData.topic.replace(/\s+/g, "_")}_notes.md`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Notes exported as Markdown!");
                    }}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                    <span style={{ color: c.amber }} className="shrink-0"><FileDown size={13} /></span> Download Markdown
                  </motion.button>
                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { const txt = notesData.sections.map(s => `## ${s.title}\n${s.content}\n${s.bulletPoints.map(b => `- ${b}`).join("\n")}`).join("\n\n"); navigator.clipboard.writeText(txt); toast.success("Notes copied to clipboard!"); }}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                    <span style={{ color: c.amber }} className="shrink-0"><Copy size={13} /></span> Copy Notes
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setNotesData(null); setSearchQuery(""); }}
                    className="w-full py-2 mt-1 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                    <RefreshCw size={13} /> New Topic
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* RIGHT PANEL 70% */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="flex-1 flex flex-col min-w-0 pl-4">
                {/* Search */}
                <div className="pb-3">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search notes content..."
                      className="w-full rounded-xl pl-10 pr-10 py-3 text-sm transition-all focus:outline-none"
                      style={{ background: c.inputBg, border: `1px solid ${searchQuery ? c.amber : c.border}`, color: c.text, boxShadow: searchQuery ? `0 0 0 2px ${c.amberBg}` : "none" }} />
                    {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }}><X size={14} /></button>}
                  </div>
                </div>

                {/* Accordion sections */}
                <div className="space-y-3 pb-4">
                  {filteredSections.map((s, idx) => {
                    const isOpen = activeSection === s.title;
                    return (
                      <motion.div key={s.title} id={`section-${s.title.replace(/\s+/g, "-")}`} custom={idx} variants={scaleIn} initial="hidden" animate="visible"
                        className="rounded-2xl overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${isOpen ? c.amberBorder : c.border}` }}>
                        <motion.button onClick={() => handleScrollToSection(s.title)} whileHover={{ background: isOpen ? c.amberBg : c.bgHover }} whileTap={{ scale: 0.995 }}
                          className="w-full flex items-center justify-between px-5 py-4 text-left transition-all" style={{ background: isOpen ? c.amberBg : c.surface, borderBottom: isOpen ? `1px solid ${c.divider}` : "none" }}>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: isOpen ? "rgba(245,158,11,0.2)" : c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                              <Layers size={14} style={{ color: c.amber }} />
                            </div>
                            <div>
                              <h3 className="text-base font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>{s.title}</h3>
                              {!isOpen && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: c.textMuted }}>{s.content.slice(0, 80)}…</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full hidden sm:block" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textMuted }}>
                              {String(idx + 1).padStart(2, "0")}
                            </span>
                            <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.25 }}><ChevronRight size={16} style={{ color: isOpen ? c.amber : c.textMuted }} /></motion.div>
                          </div>
                        </motion.button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} style={{ overflow: "hidden" }}>
                              <div className="p-5 space-y-5">
                                <div>
                                  <span className="text-[10px] uppercase tracking-widest font-black block mb-2" style={{ color: c.amber }}>Content</span>
                                  <FormattedText content={s.content} />
                                </div>
                                {s.bulletPoints && s.bulletPoints.length > 0 && (
                                  <div className="p-4 rounded-xl" style={{ background: c.purpleBg, border: `1px solid ${c.purpleBorder}` }}>
                                    <span className="text-[10px] uppercase tracking-widest font-black block mb-3" style={{ color: "#a78bfa" }}>✦ Key Takeaways & Points</span>
                                    <ul className="space-y-2">
                                      {s.bulletPoints.map((b, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm" style={{ color: c.textSec }}>
                                          <span style={{ color: "#a78bfa" }} className="mt-1 shrink-0 font-bold">▸</span>
                                          <span className="flex-1"><FormattedText content={b} /></span>
                                        </li>
                                      ))}
                                    </ul>
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

