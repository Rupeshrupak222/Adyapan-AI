"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Presentation, Copy, FileDown, RefreshCw, ChevronRight, Search, Plus, History,
  CheckCircle2, Sparkles, Brain, Zap, Star, X, FileText, Layers, Trash2, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/context/SocketContext";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { getAuthUser } from "@/hooks/useAuth";

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
    green: "#10b981", greenBg: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
    divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    pill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", pillBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };
};

interface PresentationCard {
  title: string;
  value?: string;
  description: string;
  icon?: string;
}

interface PresentationImage {
  url: string;
  alt: string;
  caption?: string;
}

interface Slide {
  id?: number;
  layout?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  bullets: string[];
  cards?: PresentationCard[];
  images?: PresentationImage[];
  icons?: string[];
  notes?: string;
  speakerNotes?: string;
}

const THEME_OPTIONS = [
  { id: "tech-premium", label: "⚡ Tech Premium", desc: "Gold/Amber Accent, Dark Canvas" },
  { id: "dark-glass", label: "🔮 Dark Glass", desc: "Cyan/Purple Accent, Glassmorphism" },
  { id: "corporate-blue", label: "💼 Corporate Blue", desc: "Sapphire Blue, Executive Clean" },
  { id: "cyberpunk-amber", label: "🔥 Cyberpunk", desc: "Neon Gold, High Tech Layout" },
  { id: "minimal-emerald", label: "🌿 Minimal Emerald", desc: "Emerald Accent, Modern Academic" }
];

const THEME_STYLES: Record<string, {
  bgGradient: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  titleAccent: string;
  subtitleAccent: string;
  bulletDot: string;
  cardBg: string;
  cardBorder: string;
  cardTitle: string;
  cardValBg: string;
  cardValText: string;
  notesBg: string;
  notesBorder: string;
  notesText: string;
}> = {
  "tech-premium": {
    bgGradient: "linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)",
    border: "rgba(245, 158, 11, 0.3)",
    badgeBg: "rgba(245, 158, 11, 0.12)",
    badgeText: "#fbbf24",
    badgeBorder: "rgba(245, 158, 11, 0.25)",
    titleAccent: "#f59e0b",
    subtitleAccent: "#fbbf24",
    bulletDot: "#f59e0b",
    cardBg: "rgba(12, 10, 9, 0.8)",
    cardBorder: "rgba(245, 158, 11, 0.2)",
    cardTitle: "#fbbf24",
    cardValBg: "rgba(245, 158, 11, 0.2)",
    cardValText: "#fef3c7",
    notesBg: "rgba(245, 158, 11, 0.05)",
    notesBorder: "rgba(245, 158, 11, 0.2)",
    notesText: "#f59e0b"
  },
  "dark-glass": {
    bgGradient: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    border: "rgba(139, 92, 246, 0.35)",
    badgeBg: "rgba(139, 92, 246, 0.15)",
    badgeText: "#c084fc",
    badgeBorder: "rgba(139, 92, 246, 0.3)",
    titleAccent: "#a855f7",
    subtitleAccent: "#38bdf8",
    bulletDot: "#38bdf8",
    cardBg: "rgba(15, 23, 42, 0.75)",
    cardBorder: "rgba(56, 189, 248, 0.25)",
    cardTitle: "#38bdf8",
    cardValBg: "rgba(139, 92, 246, 0.25)",
    cardValText: "#e9d5ff",
    notesBg: "rgba(139, 92, 246, 0.08)",
    notesBorder: "rgba(139, 92, 246, 0.25)",
    notesText: "#c084fc"
  },
  "corporate-blue": {
    bgGradient: "linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)",
    border: "rgba(59, 130, 246, 0.35)",
    badgeBg: "rgba(59, 130, 246, 0.15)",
    badgeText: "#60a5fa",
    badgeBorder: "rgba(59, 130, 246, 0.3)",
    titleAccent: "#3b82f6",
    subtitleAccent: "#93c5fd",
    bulletDot: "#3b82f6",
    cardBg: "rgba(11, 25, 44, 0.8)",
    cardBorder: "rgba(59, 130, 246, 0.25)",
    cardTitle: "#60a5fa",
    cardValBg: "rgba(59, 130, 246, 0.2)",
    cardValText: "#dbeafe",
    notesBg: "rgba(59, 130, 246, 0.08)",
    notesBorder: "rgba(59, 130, 246, 0.25)",
    notesText: "#60a5fa"
  },
  "cyberpunk-amber": {
    bgGradient: "linear-gradient(135deg, #180000 0%, #2a0800 100%)",
    border: "rgba(255, 107, 0, 0.4)",
    badgeBg: "rgba(255, 107, 0, 0.18)",
    badgeText: "#ff8c00",
    badgeBorder: "rgba(255, 107, 0, 0.35)",
    titleAccent: "#ff6b00",
    subtitleAccent: "#facc15",
    bulletDot: "#ff6b00",
    cardBg: "rgba(24, 0, 0, 0.85)",
    cardBorder: "rgba(255, 107, 0, 0.3)",
    cardTitle: "#facc15",
    cardValBg: "rgba(255, 107, 0, 0.25)",
    cardValText: "#fef08a",
    notesBg: "rgba(255, 107, 0, 0.1)",
    notesBorder: "rgba(255, 107, 0, 0.3)",
    notesText: "#ff8c00"
  },
  "minimal-emerald": {
    bgGradient: "linear-gradient(135deg, #062319 0%, #02140e 100%)",
    border: "rgba(16, 185, 129, 0.35)",
    badgeBg: "rgba(16, 185, 129, 0.15)",
    badgeText: "#34d399",
    badgeBorder: "rgba(16, 185, 129, 0.3)",
    titleAccent: "#10b981",
    subtitleAccent: "#6ee7b7",
    bulletDot: "#10b981",
    cardBg: "rgba(2, 20, 14, 0.85)",
    cardBorder: "rgba(16, 185, 129, 0.25)",
    cardTitle: "#34d399",
    cardValBg: "rgba(16, 185, 129, 0.2)",
    cardValText: "#d1fae5",
    notesBg: "rgba(16, 185, 129, 0.08)",
    notesBorder: "rgba(16, 185, 129, 0.25)",
    notesText: "#34d399"
  }
};

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }) };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }) };
const slideRight = { hidden: { opacity: 0, x: -24 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { delay: i * 0.07, duration: 0.4 } }) };

export function PptGeneratorView() {
  const theme = useTheme();
  const c = mkColors(theme);

  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [topic, setTopic] = useState("Artificial Intelligence & Neural Networks");
  const [slideCount, setSlideCount] = useState("5 Slides");
  const [selectedTheme, setSelectedTheme] = useState("tech-premium");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState<Array<{ name: string; date: string; count: number; data: Slide[] }>>([]);
  const [exportingPptx, setExportingPptx] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    if (!slides) return;
    setExportingPdf(true);
    try {
      const res = await api.post("/ppt/export/pdf", {
        topic,
        presentation: {
          title: topic,
          themeId: selectedTheme,
          slides: slides.map((s, i) => ({
            id: i + 1,
            title: s.title,
            subtitle: s.subtitle,
            badge: s.badge || `Slide ${i + 1}`,
            bullets: s.bullets,
            speakerNotes: s.speakerNotes || s.notes,
            cards: s.cards || [
              { title: "Module Focus", description: s.title },
              { title: "Key Metric", value: `${(i + 1) * 20}%`, description: "Performance Score" }
            ],
            images: s.images || []
          }))
        }
      }, { responseType: "blob", timeout: 120000 });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.replace(/\s+/g, "_")}_Presentation.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Presentation PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF file.");
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportPptx = async () => {
    if (!slides) return;
    setExportingPptx(true);
    try {
      const res = await api.post("/ppt/export/pptx", {
        topic,
        presentation: {
          title: topic,
          themeId: selectedTheme,
          slides: slides.map((s, i) => ({
            id: i + 1,
            title: s.title,
            subtitle: s.subtitle,
            badge: s.badge || `Slide ${i + 1}`,
            bullets: s.bullets,
            speakerNotes: s.speakerNotes || s.notes,
            cards: s.cards || [
              { title: "Module Overview", description: s.title },
              { title: "Slide", value: `Slide ${i + 1}`, description: "Presentation Card" }
            ],
            images: s.images || []
          }))
        }
      }, { responseType: "blob", timeout: 120000 });

      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${topic.replace(/\s+/g, "_")}_Presentation.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PowerPoint (.pptx) downloaded successfully!");
    } catch (err) {
      console.error("PPTX export error:", err);
      toast.error("Failed to generate PPTX file.");
    } finally {
      setExportingPptx(false);
    }
  };



  const { socket, isConnected } = useSocket();
  const userIdRef = useRef<string>("");
  const topicRef = useRef(topic);
  const slideCountRef = useRef(slideCount);

  useEffect(() => { topicRef.current = topic; }, [topic]);
  useEffect(() => { slideCountRef.current = slideCount; }, [slideCount]);

  const getUserScopedKey = (baseKey: string) => {
    try {
      const u = getAuthUser();
      const id = u?.id || u?.email;
      return id ? `${baseKey}-${id}` : baseKey;
    } catch { return baseKey; }
  };

  const addToHistory = useCallback((slideList: Slide[]) => {
    setHistory(prev => {
      const newItem = { name: topicRef.current, date: "Just now", count: slideList.length, data: slideList };
      const updated = [newItem, ...prev.filter(h => h.name !== topicRef.current)].slice(0, 10);
      localStorage.setItem(getUserScopedKey("adyapan-ppt-history"), JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    try { const raw = localStorage.getItem("adyapan-user"); if (raw) userIdRef.current = (JSON.parse(raw) as { id?: string })?.id ?? ""; } catch { }
    try { const stored = localStorage.getItem(getUserScopedKey("adyapan-ppt-history")); if (stored) setHistory(JSON.parse(stored)); } catch {}
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleProgress = ({ progress: p, statusMessage }: { progress: number; statusMessage: string }) => { setProgress(p); setStatusMsg(statusMessage); };
    const handleComplete = ({ slides: slideList, presentation }: { slides: Slide[]; presentation?: any }) => {
      setGenerating(false);
      const list = presentation?.slides || slideList;
      setSlides(list);
      if (presentation?.themeId) setSelectedTheme(presentation.themeId);
      setActiveSlide(0);
      addToHistory(list);
    };
    const handleError = ({ error }: { error: string }) => { setGenerating(false); toast.error(`Generation error: ${error}`); };
    socket.on("generate:progress", handleProgress);
    socket.on("generate:complete", handleComplete);
    socket.on("generate:error", handleError);
    return () => { socket.off("generate:progress", handleProgress); socket.off("generate:complete", handleComplete); socket.off("generate:error", handleError); };
  }, [socket, addToHistory]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true); setProgress(0); setStatusMsg("Starting Presentation Generator with Kimi AI...");
    if (socket && isConnected) {
      socket.emit("generate:start", { moduleName: "ppt", payload: { topic, slideCount: slideCount.split(" ")[0], themePreference: selectedTheme, userId: userIdRef.current } });
    } else {
      try {
        setStatusMsg("Calling AI Presentation API...");
        const res = await api.post("/ppt/generate", { topic, slideCount: slideCount.split(" ")[0], themePreference: selectedTheme });
        if (res.data?.success && res.data?.presentation) {
          const p = res.data.presentation;
          const slideList = p.slides || p;
          setSlides(slideList);
          if (p.themeId) setSelectedTheme(p.themeId);
          setActiveSlide(0);
          addToHistory(slideList);
        } else throw new Error("Invalid response");
      } catch (err: unknown) {
        const e = err as { response?: { data?: { error?: string } } };
        toast.error(e?.response?.data?.error || "Failed to generate presentation via API.");
      } finally {
        setGenerating(false);
      }
    }
  }, [socket, isConnected, topic, slideCount, selectedTheme, addToHistory]);


  const loadHistoryItem = (item: typeof history[0]) => {
    setTopic(item.name); setSlideCount(`${item.count} Slides`); setSlides(item.data); setActiveSlide(0); setShowHistory(false);
  };

  const stages = ["Research Topic", "Structure Outline", "Write Slides", "Add Notes", "Format Output", "Completed"];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col antialiased" style={{ color: c.text }}>
      <style>{`.pg-scroll { scrollbar-width: none; -ms-overflow-style: none; } .pg-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Presentation size={18} style={{ color: "#000" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>PPT Generator</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-xs leading-tight" style={{ color: c.textMuted }}>AI-powered presentation slides with speaker notes</motion.p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slides && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setSlides(null); }} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
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
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: c.text }}>Recent Presentations</span>
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
                    <p style={{ fontSize: "0.82rem", color: c.textMuted, textAlign: "center" }}>No presentations generated yet. Submit a topic to begin.</p>
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
                            <p style={{ fontSize: "0.68rem", color: c.textMuted, margin: "2px 0 0" }}>{doc.date} · {doc.count} slides</p>
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
                                localStorage.setItem(getUserScopedKey("adyapan-ppt-history"), JSON.stringify(updated));
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
          {!generating && !slides && (
            <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <motion.div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: c.surface, border: `2px solid ${c.border}` }}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-8 w-24 h-24 rounded-full" style={{ opacity: c.isDark ? 0.05 : 0.08, background: "radial-gradient(circle, #f59e0b, transparent)" }} />
                  <div className="absolute bottom-4 left-8 w-16 h-16 rounded-full" style={{ opacity: c.isDark ? 0.04 : 0.06, background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
                </div>
                <div className="relative z-10 space-y-4">
                  <h3 className="text-lg font-extrabold text-center" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>Configure Slides Outline</h3>
                  <div className="space-y-3 max-w-xl mx-auto">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: c.textSec }}>Presentation Topic</label>
                      <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Pitch Deck for an EdTech Startup"
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: c.textSec }}>Slide Count</label>
                      <select value={slideCount} onChange={e => setSlideCount(e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none appearance-none" style={{ background: c.isDark ? "#121214" : "#ffffff", border: `1px solid ${c.border}`, color: c.text }}>
                        <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>5 Slides</option>
                        <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>10 Slides</option>
                        <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>15 Slides</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: c.textSec }}>Visual Theme</label>
                      <select value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none appearance-none" style={{ background: c.isDark ? "#121214" : "#ffffff", border: `1px solid ${c.border}`, color: c.text }}>
                        {THEME_OPTIONS.map(th => (
                          <option key={th.id} value={th.id} style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>{th.label} - {th.desc}</option>
                        ))}
                      </select>
                    </div>

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleGenerate}
                      className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                      <Presentation size={16} /> Generate Presentation
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Presets */}
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Zap size={15} style={{ color: c.amber }} /> Choose Slide Presets</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "🚀 Startup Pitch Deck", desc: "Constructs slides maps showing introduction, market analysis, products, and financials.", icon: <Star size={18} style={{ color: c.amber }} /> },
                    { title: "🧠 Academic Lecture Presentation", desc: "Partitions lecture modules into key concept maps, explanations, and summarization points.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { title: "⚡ Product Feature Slides", desc: "Focuses on detailing technical attributes, advantages, and user guides layouts.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
                  ].map((item, i) => (
                    <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => setTopic(item.title.replace(/^[\s\S]*?\s+/, ""))} className="p-5 rounded-2xl relative overflow-hidden cursor-pointer group transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
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
                    { step: "01", title: "Brief Slide Topic", desc: "State the presentation goal and select target page/slide count.", icon: <Presentation size={18} style={{ color: c.amber }} /> },
                    { step: "02", title: "Formulate Content", desc: "AI maps logical sequences, designs bullet outlines, and appends notes.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { step: "03", title: "Export Presentation", desc: "Preview all generated slide templates and export files to PowerPoint.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
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
                  {["Slide Preview", "Speaker Notes", "Bullet Points", "Multiple Counts", "Copy Slides", "Export Markdown"].map((feat, i) => (
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
                <h3 className="text-lg font-extrabold" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>Generating Presentation Slides...</h3>
                <p className="text-sm" style={{ color: c.textMuted }}>{statusMsg}</p>
              </div>
              <div className="w-64 h-2 rounded-full overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
            </motion.div>
          )}

          {/* SLIDES PREVIEW */}
          {slides && (
            <motion.div key="slides" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex flex-col md:flex-row gap-4">
              {/* LEFT METADATA & ACTIONS PANEL */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="w-full md:w-80 shrink-0 space-y-3">
                {/* Active Slide Summary */}
                <div className="p-4 rounded-2xl space-y-2" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <div className="flex items-center gap-2">
                    <Presentation size={15} style={{ color: c.amber }} />
                    <span className="text-xs font-bold truncate" style={{ color: c.text }}>{topic}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl text-center" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                      <span className="text-[10px] block" style={{ color: c.textMuted }}>Total Slides</span>
                      <span className="text-xs font-extrabold" style={{ color: c.amber }}>{slides.length}</span>
                    </div>
                    <div className="p-2 rounded-xl text-center" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}` }}>
                      <span className="text-[10px] block" style={{ color: c.textMuted }}>Current</span>
                      <span className="text-xs font-extrabold" style={{ color: c.text }}>{activeSlide + 1}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="p-3 rounded-2xl shrink-0 space-y-2" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.textMuted }}>Export Options</span>

                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    disabled={exportingPptx}
                    onClick={handleExportPptx}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm font-bold transition-all text-left" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.amber }}>
                    <span className="flex items-center gap-2">
                      {exportingPptx ? <Loader2 size={13} className="animate-spin" /> : <Presentation size={13} />}
                      Download PPTX
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">PowerPoint</span>
                  </motion.button>

                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    disabled={exportingPdf}
                    onClick={handleExportPdf}
                    className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm font-bold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
                    <span className="flex items-center gap-2">
                      {exportingPdf ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} style={{ color: c.amber }} />}
                      Download PDF
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-slate-500/20 px-1.5 py-0.5 rounded">PDF</span>
                  </motion.button>

                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { const txt = slides.map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.bullets.map(b => `- ${b}`).join("\n")}\nNotes: ${s.speakerNotes || s.notes}`).join("\n\n"); navigator.clipboard.writeText(txt); toast.success("Slides copied to clipboard!"); }}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                    <span style={{ color: c.amber }} className="shrink-0"><Copy size={12} /></span> Copy Slides
                  </motion.button>
                  <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const txt = slides.map((s, i) => `# Slide ${i + 1}: ${s.title}\n${s.bullets.map(b => `- ${b}`).join("\n")}\n\nSpeaker Notes: ${s.speakerNotes || s.notes}`).join("\n\n---\n\n");
                      const blob = new Blob([txt], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `${topic.replace(/\s+/g, "_")}_slides.md`; a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Slides exported as Markdown!");
                    }}
                    className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all text-left" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                    <span style={{ color: c.amber }} className="shrink-0"><FileDown size={12} /></span> Export Markdown
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setSlides(null); }}
                    className="w-full py-2 rounded-lg text-sm font-extrabold transition-all flex items-center justify-center gap-1.5 mt-1" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                    <RefreshCw size={13} /> New Topic
                  </motion.button>
                </motion.div>
              </motion.div>

              {/* RIGHT PANEL SLIDE CANVAS */}

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.15 }} className="flex-1 flex flex-col min-w-0">
                <div className="space-y-3 pb-4">
                  {(() => {
                    const currentSlide = slides[activeSlide] || slides[0];
                    const tStyle = THEME_STYLES[selectedTheme] || THEME_STYLES["tech-premium"];
                    return (
                      <motion.div key={activeSlide} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-500"
                        style={{ background: tStyle.bgGradient, border: `1px solid ${tStyle.border}`, minHeight: "440px" }}>
                        <div>
                          {/* Badge & Layout Tag */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5 border"
                              style={{ background: tStyle.badgeBg, color: tStyle.badgeText, borderColor: tStyle.badgeBorder }}>
                              {currentSlide.badge || `🤖 SLIDE ${activeSlide + 1} OF ${slides.length}`}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-slate-900/80 text-slate-300 border border-slate-700">
                              {currentSlide.layout || "Keynote Spec"}
                            </span>
                          </div>

                          {/* Title & Subtitle with Emojis */}
                          <div className="mb-4">
                            <h3 className="text-xl font-extrabold tracking-tight mb-1 text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                              {currentSlide.title}
                            </h3>
                            {currentSlide.subtitle && (
                              <p className="text-xs font-semibold" style={{ color: tStyle.subtitleAccent }}>{currentSlide.subtitle}</p>
                            )}
                          </div>

                          {/* Bullets with Emojis */}
                          <div className="space-y-2 mb-4">
                            {currentSlide.bullets?.map((bullet, j) => (
                              <div key={j} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-200">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tStyle.bulletDot }} />
                                <span>{bullet}</span>
                              </div>
                            ))}
                          </div>

                          {/* Cards Grid */}
                          {currentSlide.cards && currentSlide.cards.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 my-3">
                              {currentSlide.cards.map((card, ci) => (
                                <div key={ci} className="p-3 rounded-xl border flex flex-col justify-between"
                                  style={{ background: tStyle.cardBg, borderColor: tStyle.cardBorder }}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold truncate" style={{ color: tStyle.cardTitle }}>{card.title}</span>
                                    {card.value && <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ background: tStyle.cardValBg, color: tStyle.cardValText }}>{card.value}</span>}
                                  </div>
                                  <p className="text-[11px] text-slate-300 mt-1 line-clamp-2">{card.description}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Stock Image Preview */}
                          {currentSlide.images && currentSlide.images.length > 0 && (
                            <div className="my-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3">
                              <img src={currentSlide.images[0].url} alt={currentSlide.images[0].alt} className="w-16 h-12 object-cover rounded-lg shrink-0 border" style={{ borderColor: tStyle.border }} />
                              <div>
                                <span className="text-[10px] font-bold block uppercase" style={{ color: tStyle.titleAccent }}>Visual Asset</span>
                                <p className="text-xs text-slate-200 line-clamp-1">{currentSlide.images[0].caption || currentSlide.images[0].alt}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Speaker Notes */}
                        {(currentSlide.speakerNotes || currentSlide.notes) && (
                          <div className="mt-4 p-3 rounded-xl border" style={{ background: tStyle.notesBg, borderColor: tStyle.notesBorder }}>
                            <span className="text-[10px] uppercase tracking-widest font-black block mb-1" style={{ color: tStyle.notesText }}>🎙️ Speaker Notes</span>
                            <p className="text-xs italic text-slate-200">&quot;{currentSlide.speakerNotes || currentSlide.notes}&quot;</p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })()}

                  {/* Slide navigation footer */}
                  <div className="flex items-center justify-between p-2 rounded-xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                    <div className="flex gap-1.5">
                      {slides.map((_, idx) => (
                        <motion.button key={idx} onClick={() => setActiveSlide(idx)}
                          className="w-2.5 h-2.5 rounded-full transition-all"
                          style={{ background: activeSlide === idx ? c.amber : c.border }}
                          whileHover={{ scale: 1.3 }} />
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                        Prev
                      </motion.button>
                      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                        Next
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
