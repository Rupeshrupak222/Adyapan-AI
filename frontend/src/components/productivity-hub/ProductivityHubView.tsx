"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { toast } from "sonner";
import { api } from "@/services/api";
import {
  Search, Calendar, DollarSign, Send, Sparkles, CheckCircle2,
  XCircle, Info, Heart, ArrowRight, Share2, Trash2, Plus, Clock,
  MessageSquare, Award, ArrowLeft, ArrowRightLeft, ChevronRight,
  AlertCircle, FileText, UserCheck, Play, PlusCircle, Check, RefreshCw,
  Copy, Download, FileSpreadsheet, Eye, Save, Edit3, Clipboard, CheckSquare
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }),
};

interface Document {
  id: string;
  title: string;
  type: "Email" | "SOP" | "LinkedIn" | "Content";
  content: string;
  dateCreated: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProductivityHubViewProps {
  setView: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

export function ProductivityHubView({ setView, activeModule = "productivity-hub", theme = "dark" }: ProductivityHubViewProps) {
  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f0f4ff",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    surfaceHover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8",
    primary: "#f59e0b",
    primaryDark: "#d97706",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
  };

  // Tab State: "email" | "sop" | "linkedin" | "content"
  const [tab, setTab] = useState<"email" | "sop" | "linkedin" | "content">("email");

  // Output Workspace
  const [generatedOutput, setGeneratedOutput] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editingContent, setEditingContent] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  // Email state
  const [emailCat, setEmailCat] = useState("Job Application");
  const [emailTone, setEmailTone] = useState("Professional");
  const [emailLength, setEmailLength] = useState("Detailed");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailDetails, setEmailDetails] = useState("");

  // SOP state
  const [sopCat, setSopCat] = useState("Master's Program");
  const [sopBackground, setSopBackground] = useState("");
  const [sopGoals, setSopGoals] = useState("");
  const [sopTargetUni, setSopTargetUni] = useState("");
  const [sopCourse, setSopCourse] = useState("");

  // LinkedIn state
  const [liCat, setLiCat] = useState("Project Showcase");
  const [liFormat, setLiFormat] = useState("Storytelling");
  const [liIncludeEmojis, setLiIncludeEmojis] = useState(true);
  const [liIncludeHashtags, setLiIncludeHashtags] = useState(true);
  const [liTopic, setLiTopic] = useState("");

  // Content state
  const [contentCat, setContentCat] = useState("Blog Article");
  const [contentStyle, setContentStyle] = useState("SEO Optimized");
  const [contentKeywords, setContentKeywords] = useState("");
  const [contentOutline, setContentOutline] = useState("");

  // Saved Documents
  const [savedDocs, setSavedDocs] = useState<Document[]>([]);
  const [creditsUsed, setCreditsUsed] = useState(64);

  // AI Assistant panel state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hello! I am your AI Productivity Coach. Ask me to draft emails, compile Statements of Purpose, structure articles, or write LinkedIn posts!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync tab with activeModule from props
  useEffect(() => {
    if (activeModule === "prod-email") setTab("email");
    else if (activeModule === "prod-sop") setTab("sop");
    else if (activeModule === "prod-linkedin") setTab("linkedin");
    else if (activeModule === "prod-content") setTab("content");
  }, [activeModule]);

  // Load drafts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ady-productivity-docs");
    if (saved) {
      try { setSavedDocs(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleCopyText = () => {
    const textToCopy = subjectLine ? `Subject: ${subjectLine}\n\n${editingContent}` : editingContent;
    navigator.clipboard.writeText(textToCopy);
    alert("📋 Copied to clipboard successfully!");
  };

  const handleSaveDraft = () => {
    if (!editingContent.trim()) return;
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: subjectLine ? `Email: ${subjectLine.slice(0, 30)}...` : `${tab.toUpperCase()} Draft - ${new Date().toLocaleDateString()}`,
      type: tab === "email" ? "Email" : tab === "sop" ? "SOP" : tab === "linkedin" ? "LinkedIn" : "Content",
      content: editingContent,
      dateCreated: new Date().toISOString()
    };
    const updated = [newDoc, ...savedDocs];
    setSavedDocs(updated);
    localStorage.setItem("ady-productivity-docs", JSON.stringify(updated));
    setCreditsUsed(prev => Math.min(prev + 2, 100));
    alert("💾 Draft saved successfully to your dashboard history.");
  };

  // Generate handlers
  const handleGenerateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post("/productivity/generate-email", {
        category: emailCat || "General",
        tone: emailTone || "Professional",
        length: emailLength || "Detailed",
        recipient: emailRecipient || "Hiring Manager",
        details: emailDetails || "Requesting an update or details regarding application status."
      });
      const data = res.data;
      setSubjectLine(data.subject || "");
      setGeneratedOutput(data.content || "");
      setEditingContent(data.content || "");
      setIsPreview(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Email generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSop = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post("/productivity/generate-sop", {
        category: sopCat || "Master's Program",
        background: sopBackground || "Academic and professional background in software engineering and computer science.",
        goals: sopGoals || "To achieve mastery in computer science principles and advance key technical leadership goals.",
        targetUniversity: sopTargetUni || "Target University",
        course: sopCourse || "Master of Science in Computer Science"
      });
      const data = res.data;
      setSubjectLine("");
      setGeneratedOutput(data.content || "");
      setEditingContent(data.content || "");
      setIsPreview(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "SOP generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateLinkedIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post("/productivity/generate-linkedin", {
        category: liCat || "Project Showcase",
        format: liFormat || "Storytelling",
        topic: liTopic || "Building innovative full-stack application and key engineering takeaways.",
        includeEmojis: liIncludeEmojis,
        includeHashtags: liIncludeHashtags
      });
      const data = res.data;
      setSubjectLine("");
      setGeneratedOutput(data.content || "");
      setEditingContent(data.content || "");
      setIsPreview(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "LinkedIn post generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await api.post("/productivity/generate-content", {
        category: contentCat || "Blog Article",
        style: contentStyle || "SEO Optimized",
        keywords: contentKeywords || "AI, Software Architecture, Web Development",
        outline: contentOutline || "Introduction, Key Concepts, Best Practices, Practical Examples, Conclusion"
      });
      const data = res.data;
      setSubjectLine("");
      setGeneratedOutput(data.content || "");
      setEditingContent(data.content || "");
      setIsPreview(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Content generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleAssistantSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const promptText = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: promptText }]);
    setChatLoading(true);

    try {
      const res = await api.post("/productivity/chat", {
        message: promptText,
        context: { tab }
      });
      const data = res.data;
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response || "No response received." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I ran into an error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative flex flex-col h-full min-h-[calc(100vh-120px)]"
      style={{ color: c.text }}
    >
      <div className="flex-1 flex flex-col gap-4">

        {/* Compact Module Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex flex-wrap justify-between items-center gap-3 border-b pb-2.5 shrink-0" style={{ borderColor: c.border }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Productivity Workspace</p>
            <h2 className="text-base font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {tab === "email" && "Email Writer"}
              {tab === "sop" && "SOP Generator"}
              {tab === "linkedin" && "LinkedIn Post Generator"}
              {tab === "content" && "Content Writer"}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
              {[
                { id: "email", label: "Email Writer" },
                { id: "sop", label: "SOP Generator" },
                { id: "linkedin", label: "LinkedIn Post" },
                { id: "content", label: "Content Writer" },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                    tab === t.id
                      ? "bg-amber-500 text-black shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <motion.button
              onClick={() => setAssistantOpen(!assistantOpen)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
            >
              <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Sparkles size={12} className="animate-pulse" /></motion.span> AI Assistant
            </motion.button>
          </div>
        </motion.div>

        {/* ==================== 3. SPLIT PANEL: INPUT FORM & LIVE EDITOR ==================== */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LEFT SIDE: INPUT OPTIONS */}
          <div className="overflow-y-auto pr-2 custom-scrollbar">
            <AnimatePresence mode="wait">

              {/* EMAIL WRITER FORM */}
              {tab === "email" && (
                <motion.form
                  key="email-form"
                  onSubmit={handleGenerateEmail}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  custom={0}
                  whileHover={{ y: -3, scale: 1.008 }}
                  className="space-y-4 p-5 border rounded-2xl"
                  style={{ background: c.cardBg, borderColor: c.border }}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-amber-500">Email Configuration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Category</label>
                      <select
                        value={emailCat}
                        onChange={(e) => setEmailCat(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      >
                        <option value="Job Application">Job Application</option>
                        <option value="Internship Application">Internship Application</option>
                        <option value="Leave Request">Leave Request</option>
                        <option value="Follow-up Email">Follow-up Email</option>
                        <option value="HR Communication">HR Communication</option>
                        <option value="Interview Invitation Reply">Interview Reply</option>
                        <option value="Cold Outreach">Cold Outreach</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Tone</label>
                      <select
                        value={emailTone}
                        onChange={(e) => setEmailTone(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      >
                        <option value="Professional">Professional</option>
                        <option value="Friendly">Friendly</option>
                        <option value="Formal">Formal</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Details / Background</label>
                    <textarea
                      required
                      value={emailDetails}
                      onChange={(e) => setEmailDetails(e.target.value)}
                      placeholder="e.g. Applying for Software Intern position, listing my project credentials..."
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs resize-none h-28"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={generating}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full py-2.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {generating ? "Generating..." : "Generate Email"}
                  </motion.button>
                </motion.form>
              )}

              {/* SOP GENERATOR FORM */}
              {tab === "sop" && (
                <motion.form
                  key="sop-form"
                  onSubmit={handleGenerateSop}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  custom={1}
                  whileHover={{ y: -3, scale: 1.008 }}
                  className="space-y-4 p-5 border rounded-2xl"
                  style={{ background: c.cardBg, borderColor: c.border }}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-amber-500">SOP Parameters</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Category</label>
                      <select
                        value={sopCat}
                        onChange={(e) => setSopCat(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      >
                        <option value="Study Abroad">Study Abroad</option>
                        <option value="University Admission">University Admission</option>
                        <option value="Master's Program">Master&apos;s Program</option>
                        <option value="Scholarship Application">Scholarship Application</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Target Course</label>
                      <input
                        required
                        value={sopCourse}
                        onChange={(e) => setSopCourse(e.target.value)}
                        placeholder="e.g. Master's in CS"
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Target University / Company</label>
                    <input
                      required
                      value={sopTargetUni}
                      onChange={(e) => setSopTargetUni(e.target.value)}
                      placeholder="e.g. Stanford University"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Academic Background</label>
                    <textarea
                      value={sopBackground}
                      onChange={(e) => setSopBackground(e.target.value)}
                      placeholder="Major projects, scores, key courses..."
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs resize-none h-16"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Career Goals</label>
                    <textarea
                      value={sopGoals}
                      onChange={(e) => setSopGoals(e.target.value)}
                      placeholder="Target milestones, research objectives..."
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs resize-none h-16"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={generating}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full py-2.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {generating ? "Generating..." : "Generate SOP"}
                  </motion.button>
                </motion.form>
              )}

              {/* LINKEDIN POST WRITER */}
              {tab === "linkedin" && (
                <motion.form
                  key="li-form"
                  onSubmit={handleGenerateLinkedIn}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  custom={2}
                  whileHover={{ y: -3, scale: 1.008 }}
                  className="space-y-4 p-5 border rounded-2xl"
                  style={{ background: c.cardBg, borderColor: c.border }}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-amber-500">LinkedIn Post Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Post Category</label>
                      <select
                        value={liCat}
                        onChange={(e) => setLiCat(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      >
                        <option value="Project Showcase">Project Showcase</option>
                        <option value="Internship Announcement">Internship Announcement</option>
                        <option value="Job Update">Job Update</option>
                        <option value="Certification">Certification</option>
                        <option value="Career Advice">Career Advice</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Format Style</label>
                      <select
                        value={liFormat}
                        onChange={(e) => setLiFormat(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      >
                        <option value="Storytelling">Storytelling</option>
                        <option value="Motivational">Motivational</option>
                        <option value="Technical">Technical</option>
                        <option value="Short Format">Short Format</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Post Topic / Details</label>
                    <textarea
                      required
                      value={liTopic}
                      onChange={(e) => setLiTopic(e.target.value)}
                      placeholder="Describe what you built or achieved..."
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs resize-none h-24"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={liIncludeEmojis}
                        onChange={(e) => setLiIncludeEmojis(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>Include Emojis</span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={liIncludeHashtags}
                        onChange={(e) => setLiIncludeHashtags(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>Include Hashtags</span>
                    </label>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={generating}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full py-2.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {generating ? "Generating..." : "Generate LinkedIn Post"}
                  </motion.button>
                </motion.form>
              )}

              {/* GENERAL CONTENT WRITER */}
              {tab === "content" && (
                <motion.form
                  key="content-form"
                  onSubmit={handleGenerateContent}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  custom={3}
                  whileHover={{ y: -3, scale: 1.008 }}
                  className="space-y-4 p-5 border rounded-2xl"
                  style={{ background: c.cardBg, borderColor: c.border }}
                >
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2 text-amber-500">Content Composer</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Content Type</label>
                      <select
                        value={contentCat}
                        onChange={(e) => setContentCat(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      >
                        <option value="Blog Article">Blog Article</option>
                        <option value="Technical Documentation">Technical Docs</option>
                        <option value="Research Summary">Research Summary</option>
                        <option value="Case Study">Case Study</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Style Option</label>
                      <select
                        value={contentStyle}
                        onChange={(e) => setContentStyle(e.target.value)}
                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      >
                        <option value="SEO Optimized">SEO Optimized</option>
                        <option value="Technical">Technical</option>
                        <option value="Academic">Academic</option>
                        <option value="Creative">Creative</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Target Keywords</label>
                    <input
                      value={contentKeywords}
                      onChange={(e) => setContentKeywords(e.target.value)}
                      placeholder="e.g. Generative AI, Next.js, API scaling (comma separated)"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: c.textSec }}>Outline Instructions</label>
                    <textarea
                      required
                      value={contentOutline}
                      onChange={(e) => setContentOutline(e.target.value)}
                      placeholder="Outline sections or paragraphs targets..."
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs resize-none h-24"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <motion.button
                    type="submit"
                    disabled={generating}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="w-full py-2.5 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 disabled:opacity-50 transition-colors"
                  >
                    {generating ? "Generating..." : "Generate Content"}
                  </motion.button>
                </motion.form>
              )}

            </AnimatePresence>
          </div>

          {/* RIGHT SIDE: LIVE PREVIEW & EDIT CONSOLE */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            whileHover={{ y: -4, scale: 1.01 }}
            className="flex flex-col border rounded-2xl overflow-hidden h-[450px]"
            style={{ background: c.cardBg, borderColor: c.border }}
          >
            {/* Header controls */}
            <div className="px-4 py-3 border-b flex justify-between items-center bg-white/[0.01]" style={{ borderColor: c.border }}>
              <span className="text-xs font-extrabold" style={{ color: c.text }}>Output Workspace</span>
              <div className="flex gap-2">
                <motion.button
                  onClick={() => setIsPreview(true)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all ${
                    isPreview ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "border-white/10 hover:bg-white/5"
                  }`}
                  style={{ borderColor: c.border }}
                >
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Eye size={12} className="inline mr-1" /></motion.span> Preview
                </motion.button>
                <motion.button
                  onClick={() => setIsPreview(false)}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-bold border transition-all ${
                    !isPreview ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "border-white/10 hover:bg-white/5"
                  }`}
                  style={{ borderColor: c.border }}
                >
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Edit3 size={12} className="inline mr-1" /></motion.span> Edit
                </motion.button>
              </div>
            </div>

            {/* Content Display/Edit */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="wait">
                {isPreview ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -10 }}
                    className="text-xs leading-relaxed whitespace-pre-wrap p-2 h-full select-text"
                    style={{ color: c.textSec }}
                  >
                  {subjectLine && (
                    <div className="font-extrabold pb-2 mb-2 border-b" style={{ borderColor: c.border }}>
                      Subject: {subjectLine}
                    </div>
                  )}
                  {editingContent || <span className="italic" style={{ color: c.textMuted }}>Draft content will be rendered here...</span>}
                  </motion.div>
                ) : (
                  <motion.textarea
                    key="edit"
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -10 }}
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    placeholder="Draft content will generate here. You can manually type and tweak details here directly..."
                    className="w-full h-full bg-transparent border-0 focus:outline-none focus:ring-0 text-xs leading-relaxed resize-none p-1"
                    style={{ color: c.text }}
                  />
              )}
              </AnimatePresence>
            </div>

            {/* Quick Actions Bar */}
            <div className="p-3 border-t bg-white/[0.01] flex justify-between items-center gap-2" style={{ borderColor: c.border }}>
              <div className="flex gap-2">
                <motion.button
                  onClick={handleCopyText}
                  disabled={!editingContent.trim()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="py-1.5 px-3 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-30 transition-colors"
                  style={{ borderColor: c.border, color: c.text }}
                >
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Copy size={12} /></motion.span> Copy
                </motion.button>
                <motion.button
                  onClick={handleSaveDraft}
                  disabled={!editingContent.trim()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="py-1.5 px-3 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-30 transition-colors"
                  style={{ borderColor: c.border, color: c.text }}
                >
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Save size={12} /></motion.span> Save Draft
                </motion.button>
              </div>

              {tab === "sop" && (
                <motion.button
                  onClick={() => alert("💾 Downloading PDF Statement of Purpose.")}
                  disabled={!editingContent.trim()}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="py-1.5 px-3 rounded bg-amber-500 text-black hover:bg-amber-400 text-[10px] font-bold flex items-center gap-1.5 disabled:opacity-30 transition-colors"
                >
                  <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Download size={12} /></motion.span> Download PDF
                </motion.button>
              )}
            </div>
          </motion.div>

        </div>

      </div>

      {/* ==================== 4. FLOATING CHAT SIDEBAR PANEL ==================== */}
      <AnimatePresence>
        {assistantOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-[70px] right-0 bottom-0 z-[190] w-80 border-l flex flex-col shadow-2xl"
            style={{ background: isDark ? "#0d1117" : "#ffffff", borderColor: c.border }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-1.5">
                <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Sparkles size={14} className="text-amber-500" /></motion.span>
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: c.text }}>AI Productivity Coach</span>
              </div>
              <motion.button
                onClick={() => setAssistantOpen(false)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><XCircle size={14} /></motion.span>
              </motion.button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {chatMessages.map((msg, idx) => {
                const isAI = msg.role === "assistant";
                return (
                  <motion.div
                    key={idx}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={idx}
                    className={`flex ${isAI ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                        isAI
                          ? "bg-white/5 border border-white/10 rounded-tl-sm"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-tr-sm"
                      }`}
                      style={{ borderColor: c.border }}
                    >
                      <p className="whitespace-pre-line">{stripMarkdown(msg.content)}</p>
                    </div>
                  </motion.div>
                );
              })}
              {chatLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-3 flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-500 animate-spin" />
                    <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Drafting response...</span>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="p-3 border-t bg-white/[0.01] flex flex-col gap-1.5"
              style={{ borderColor: c.border }}
            >
              <span className="text-[8px] uppercase tracking-wider font-extrabold" style={{ color: c.textMuted }}>Suggestions</span>
              {[
                "Write a professional internship email",
                "Generate an SOP for MS in Computer Science",
                "Create a LinkedIn post for ML project"
              ].map(s => (
                <motion.button
                  key={s}
                  onClick={() => { setChatInput(s); }}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="w-full text-left p-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-[10px] font-semibold truncate transition-colors"
                  style={{ borderColor: c.border, color: c.textSec }}
                >
                  {s}
                </motion.button>
              ))}
            </motion.div>

            {/* Input form */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="p-3 border-t flex gap-1.5"
              style={{ borderColor: c.border }}
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask productivity coach..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAssistantSend();
                }}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
              />
              <motion.button
                onClick={handleAssistantSend}
                disabled={!chatInput.trim() || chatLoading}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="w-8 h-8 rounded-lg bg-amber-500 text-black hover:bg-amber-400 flex items-center justify-center shrink-0 disabled:opacity-30 transition-colors"
              >
                <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} style={{ display: "inline-flex", verticalAlign: "middle" }}><Send size={12} /></motion.span>
              </motion.button>
            </motion.div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

