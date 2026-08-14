"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { mkColors } from "@/utils/themeColors";
import { fadeUp, scaleIn, springConfig, buttonHover } from "@/utils/animations";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  Upload, FileText, X, Check, AlertCircle, Sparkles, Zap,
  ChevronRight, Eye, Trash2, Target, BookOpen,
  Briefcase, Code2, UserCircle, Globe, Languages, Trophy,
  RefreshCw, Loader2, Shield, Lightbulb, ExternalLink,
  CheckCircle2, AlertTriangle, ArrowUpRight, FileCheck,
  Award, BarChart3,
} from "lucide-react";
import type { ResumeHubViewType } from "@/types/resume";

interface ResumeUploadViewProps {
  setView: (v: ResumeHubViewType) => void;
}

const col = "#f59e0b";

const PARSING_STEPS = [
  { label: "Uploading Resume", desc: "Securely transferring file to cloud storage", icon: <Upload size={14} /> },
  { label: "Extracting Content", desc: "Reading and parsing document text", icon: <FileText size={14} /> },
  { label: "Analyzing Structure", desc: "Identifying sections and formatting", icon: <BarChart3 size={14} /> },
  { label: "AI Profile Extraction", desc: "Extracting structured career data", icon: <Sparkles size={14} /> },
  { label: "Building Candidate Profile", desc: "Organizing extracted information", icon: <UserCircle size={14} /> },
  { label: "Calculating Scores", desc: "Generating completeness and strength metrics", icon: <Target size={14} /> },
  { label: "Profile Ready", desc: "Your career intelligence is ready", icon: <Check size={14} /> },
];

type UploadedResume = {
  id: string;
  cloudinaryUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  versionNumber: number;
  isActive: boolean;
  createdAt: string;
  candidateProfile?: CandidateProfile | null;
};

type CandidateProfile = {
  id: string;
  resumeId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  education: any[];
  experience: any[];
  projects: any[];
  skills: string[];
  certifications: any[];
  achievements: string[];
  languages: string[];
  links: any;
  completenessScore: number;
  strengthScore: number;
  missingSections: string[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
};

type Screen = "dashboard" | "upload" | "parsing" | "profile";

export function ResumeUploadView({ setView }: ResumeUploadViewProps) {
  const theme = useTheme();
  const c = mkColors(theme);

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [resumes, setResumes] = useState<UploadedResume[]>([]);
  const [activeResume, setActiveResume] = useState<UploadedResume | null>(null);
  const [selectedResume, setSelectedResume] = useState<UploadedResume | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsingStep, setParsingStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchResumes() {
    setLoadingResumes(true);
    try {
      const res = await api.get("/resume-upload/list");
      if (res.data.success) {
        setResumes(res.data.resumes);
        const active = res.data.resumes.find((r: UploadedResume) => r.isActive);
        if (active) setActiveResume(active);
      }
    } catch { /* silent */ } finally {
      setLoadingResumes(false);
    }
  }

  useEffect(() => { fetchResumes(); }, []);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  }, []);

  async function handleFileUpload(file: File) {
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Please upload a PDF or DOCX file", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("File size must be under 5MB", "error");
      return;
    }
    if (file.size === 0) {
      showToast("File is empty. Please select a valid resume.", "error");
      return;
    }

    setScreen("parsing");
    setParsingStep(0);

    const stepTimers: NodeJS.Timeout[] = [];
    for (let i = 1; i < PARSING_STEPS.length; i++) {
      stepTimers.push(setTimeout(() => setParsingStep(i), i * 1400));
    }

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await api.post("/resume-upload/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        stepTimers.forEach(clearTimeout);
        setParsingStep(PARSING_STEPS.length - 1);
        await new Promise(r => setTimeout(r, 600));

        const newResume = { ...res.data.resume, candidateProfile: res.data.profile };
        setResumes(prev => [newResume, ...prev]);
        setSelectedResume(newResume);
        setActiveResume(newResume);
        setScreen("profile");
        showToast("Resume parsed successfully!");

        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ["#f59e0b", "#ea580c", "#fbbf24", "#10b981"] });
        } catch { /* confetti blocked */ }
      }
    } catch (err: any) {
      stepTimers.forEach(clearTimeout);
      showToast(err?.response?.data?.message || "Upload failed. Please try again.", "error");
      setScreen("dashboard");
    }
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSetActive(id: string) {
    try {
      await api.post(`/resume-upload/set-active/${id}`);
      setResumes(prev => prev.map(r => ({ ...r, isActive: r.id === id })));
      const target = resumes.find(r => r.id === id);
      if (target) setActiveResume(target);
      showToast("Active resume updated");
    } catch { showToast("Failed to update", "error"); }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/resume-upload/${id}`);
      setResumes(prev => prev.filter(r => r.id !== id));
      if (activeResume?.id === id) {
        const next = resumes.find(r => r.id !== id);
        setActiveResume(next || null);
      }
      if (selectedResume?.id === id) {
        setSelectedResume(null);
        setScreen("dashboard");
      }
      setDeleteConfirm(null);
      showToast("Resume deleted");
    } catch { showToast("Delete failed", "error"); }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}
      style={{ color: c.text, background: "transparent", minHeight: "calc(100vh - 120px)" }}
      className="flex flex-col antialiased"
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold shadow-2xl"
            style={{
              background: c.d ? "rgba(24, 24, 27, 0.95)" : "#fff",
              border: `1px solid ${toast.type === "error" ? c.redBorder : c.amberBorder}`,
              color: toast.type === "error" ? c.red : c.text,
              boxShadow: c.shadowLg,
            }}>
            {toast.type === "error" ? <AlertCircle size={14} /> : <Sparkles size={14} style={{ color: col }} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-3 pb-2" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={springConfig}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <FileText size={18} style={{ color: "#000" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
              className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
              Resume Upload & Intelligence
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="text-xs leading-tight" style={{ color: c.textMuted }}>
              Upload your resume to unlock AI-powered career analysis
            </motion.p>
          </div>
        </div>
        {screen === "profile" && (
          <motion.button whileHover={buttonHover.whileHover} whileTap={buttonHover.whileTap}
            onClick={() => { setSelectedResume(null); setScreen("dashboard"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            style={{ border: `1px solid ${c.border}`, background: "transparent", color: c.textSec }}>
            <BarChart3 size={14} /> Dashboard
          </motion.button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: "1rem 1.25rem" }}>
        <AnimatePresence mode="wait">
          {/* ─── PARSING SCREEN ─── */}
          {screen === "parsing" && (
            <motion.div key="parsing" variants={fadeUp} initial="hidden" animate="visible" exit="exit" style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 0" }}>
              <div className="text-center" style={{ marginBottom: "1.5rem" }}>
                <motion.div animate={{ rotate: parsingStep >= PARSING_STEPS.length - 1 ? 0 : 360 }}
                  transition={{ repeat: parsingStep >= PARSING_STEPS.length - 1 ? 0 : Infinity, duration: 1.5, ease: "linear" }}
                  className="mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{
                    width: 72, height: 72,
                    background: parsingStep >= PARSING_STEPS.length - 1 ? c.greenBg : c.amberBg,
                    border: `2px solid ${parsingStep >= PARSING_STEPS.length - 1 ? c.greenBorder : c.amberBorder}`,
                  }}>
                  {parsingStep >= PARSING_STEPS.length - 1
                    ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={30} style={{ color: c.green }} /></motion.div>
                    : <Loader2 size={30} style={{ color: col }} className="animate-spin" />}
                </motion.div>
                <h2 className="text-xl font-extrabold" style={{ color: c.text, margin: 0 }}>
                  {parsingStep >= PARSING_STEPS.length - 1 ? "Profile Ready!" : "Analyzing Your Resume"}
                </h2>
                <p className="text-sm mt-1" style={{ color: c.textMuted }}>
                  {parsingStep >= PARSING_STEPS.length - 1 ? "Your career intelligence profile has been created" : "AI is extracting and structuring your career data"}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                {PARSING_STEPS.map((step, i) => (
                  <motion.div key={step.label}
                    animate={{
                      background: i < parsingStep ? c.amberBg : i === parsingStep ? c.amberBg : "transparent",
                      borderColor: i <= parsingStep ? c.amberBorder : c.border,
                    }}
                    className="flex items-center gap-3 rounded-xl transition-all"
                    style={{ padding: "0.7rem 1rem", border: "1px solid" }}>
                    <motion.div animate={{
                      background: i < parsingStep ? col : i === parsingStep ? "rgba(245,158,11,0.2)" : c.surface,
                      scale: i === parsingStep ? [1, 1.15, 1] : 1,
                    }}
                      transition={{ repeat: i === parsingStep ? Infinity : 0, duration: 1 }}
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{ width: 30, height: 30 }}>
                      {i < parsingStep ? <Check size={12} style={{ color: "#000" }} /> : i === parsingStep ? <Loader2 size={12} style={{ color: col }} className="animate-spin" /> : <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.textMuted, opacity: 0.4 }} />}
                    </motion.div>
                    <div>
                      <div className="text-xs font-bold" style={{ color: i <= parsingStep ? c.text : c.textMuted }}>{step.label}</div>
                      <div className="text-[11px]" style={{ color: c.textMuted }}>{step.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── DASHBOARD / UPLOAD SCREEN ─── */}
          {screen === "dashboard" && (
            <motion.div key="dashboard" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
              {loadingResumes ? (
                /* Loading Skeleton */
                <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: 300 }}>
                  <RefreshCw className="animate-spin" size={24} style={{ color: col }} />
                  <span className="text-sm font-semibold" style={{ color: c.textMuted }}>Loading resumes...</span>
                </div>
              ) : resumes.length === 0 ? (
                /* ─── Empty State ─── */
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                  {/* Upload Zone */}
                  <motion.div variants={scaleIn} initial="hidden" animate="visible"
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="relative cursor-pointer transition-all overflow-hidden"
                    style={{
                      border: `2px dashed ${isDragging ? col : c.border}`,
                      borderRadius: 20,
                      padding: "3rem 2rem",
                      textAlign: "center",
                      background: isDragging ? c.amberBg : c.d ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)",
                      boxShadow: isDragging ? c.shadowGlow : "none",
                    }}
                    role="button" aria-label="Upload resume by clicking or dragging a file"
                    tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                  >
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileInput} onClick={(e) => e.stopPropagation()} aria-hidden="true" />

                    {/* Decorative bg */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="absolute rounded-full" style={{ top: 16, right: 32, width: 140, height: 140, opacity: 0.06, background: "radial-gradient(circle, #f59e0b, transparent 70%)" }} />
                      <div className="absolute rounded-full" style={{ bottom: 16, left: 32, width: 120, height: 120, opacity: 0.06, background: "radial-gradient(circle, #a78bfa, transparent 70%)" }} />
                    </div>

                    <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                      className="mx-auto mb-5 rounded-2xl flex items-center justify-center"
                      style={{ width: 80, height: 80, background: c.amberBg, border: `1.5px solid ${c.amberBorder}` }}>
                      <Upload size={34} style={{ color: col }} />
                    </motion.div>

                    <h2 className="text-xl font-extrabold mb-1" style={{ color: c.text }}>
                      {isDragging ? "Drop your resume here!" : "Upload Your Resume"}
                    </h2>
                    <p className="text-sm mb-4 max-w-md mx-auto" style={{ color: c.textSec }}>
                      Drag & drop or <span style={{ color: col, fontWeight: 700 }}>browse files</span> to unlock AI-powered career analysis, ATS scoring, and improvement suggestions.
                    </p>
                    <div className="flex justify-center gap-2">
                      {["PDF", "DOCX"].map((fmt) => (
                        <span key={fmt} className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: c.pill, border: `1px solid ${c.pillBorder}`, color: c.textSec }}>{fmt}</span>
                      ))}
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold" style={{ background: c.pill, border: `1px solid ${c.pillBorder}`, color: c.textMuted }}>Max 5MB</span>
                    </div>
                  </motion.div>

                  {/* How it works */}
                  <div className="mt-6">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: c.textSec }}>
                      <Zap size={13} style={{ color: col }} /> How It Works
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { step: "01", title: "Upload Resume", desc: "Drop your PDF or DOCX resume file", icon: <Upload size={18} style={{ color: col }} /> },
                        { step: "02", title: "AI Extraction", desc: "AI parses and extracts structured career data", icon: <Sparkles size={18} style={{ color: c.purple }} /> },
                        { step: "03", title: "Career Profile", desc: "Get scores, insights, and improvement tips", icon: <Target size={18} style={{ color: c.cyan }} /> },
                      ].map((item, i) => (
                        <motion.div key={item.step} variants={fadeUp} custom={i} initial="hidden" animate="visible"
                          className="rs-card-hover rounded-2xl p-4"
                          style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                              {item.icon}
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: col }}>Step {item.step}</span>
                              <div className="text-sm font-bold" style={{ color: c.text }}>{item.title}</div>
                            </div>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: c.textMuted, margin: 0 }}>{item.desc}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* ─── Resume List ─── */
                <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                  {/* Upload new button */}
                  <motion.div variants={fadeUp} initial="hidden" animate="visible"
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-center cursor-pointer transition-all rounded-2xl mb-5"
                    style={{
                      border: `2px dashed ${isDragging ? col : c.border}`,
                      padding: "1rem",
                      background: isDragging ? c.amberBg : "transparent",
                      boxShadow: isDragging ? c.shadowGlow : "none",
                    }}
                    role="button" aria-label="Upload new resume" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}>
                    <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileInput} onClick={(e) => e.stopPropagation()} />
                    <div className="flex items-center justify-center gap-2.5">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
                        <Upload size={20} style={{ color: col }} />
                      </motion.div>
                      <span className="text-sm font-bold" style={{ color: c.text }}>
                        {isDragging ? "Drop to upload new resume" : "Upload New Resume"}
                      </span>
                      <span className="text-xs" style={{ color: c.textMuted }}>(PDF, DOCX, Max 5MB)</span>
                    </div>
                  </motion.div>

                  {/* Section header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
                      Your Resumes ({resumes.length})
                    </h3>
                    {activeResume && (
                      <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: c.green }}>
                        <CheckCircle2 size={12} /> Active: v{activeResume.versionNumber}
                      </span>
                    )}
                  </div>

                  {/* Resume cards */}
                  <div className="flex flex-col gap-2">
                    {resumes.map((resume, i) => {
                      const profile = resume.candidateProfile;
                      const isActive = resume.isActive;
                      return (
                        <motion.div key={resume.id} variants={fadeUp} custom={i} initial="hidden" animate="visible"
                          whileHover={{ borderColor: c.borderHover, y: -2 }}
                          className="rounded-2xl cursor-pointer transition-all relative overflow-hidden"
                          style={{ background: c.cardBg, border: `1px solid ${isActive ? c.amberBorder : c.border}`, padding: "1rem 1.25rem" }}
                          onClick={() => { setSelectedResume(resume); setScreen("profile"); }}
                          role="button" tabIndex={0} aria-label={`View resume ${resume.fileName}`}
                          onKeyDown={(e) => { if (e.key === "Enter") { setSelectedResume(resume); setScreen("profile"); } }}>
                          {isActive && (
                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }} />
                          )}
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: isActive ? c.amberBg : c.surface, border: `1px solid ${isActive ? c.amberBorder : c.border}` }}>
                              <FileText size={20} style={{ color: isActive ? col : c.textMuted }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold truncate" style={{ color: c.text }}>{resume.fileName}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: c.pill, border: `1px solid ${c.pillBorder}`, color: c.textMuted }}>v{resume.versionNumber}</span>
                                {isActive && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: col }}>Active</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[11px]" style={{ color: c.textMuted }}>{formatSize(resume.fileSize)}</span>
                                <span className="text-[11px]" style={{ color: c.textMuted }}>{resume.fileType.includes("pdf") ? "PDF" : "DOCX"}</span>
                                <span className="text-[11px]" style={{ color: c.textMuted }}>{new Date(resume.createdAt).toLocaleDateString()}</span>
                                {profile && (
                                  <span className="text-[11px] font-bold" style={{ color: profile.completenessScore >= 80 ? c.green : profile.completenessScore >= 60 ? col : c.red }}>
                                    {profile.completenessScore}% complete
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              {!isActive && (
                                <motion.button whileHover={buttonHover.whileHover} whileTap={buttonHover.whileTap}
                                  onClick={() => handleSetActive(resume.id)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                                  style={{ border: `1px solid ${c.border}`, background: "transparent", color: c.textSec }}>
                                  Set Active
                                </motion.button>
                              )}
                              <motion.button whileHover={buttonHover.whileHover} whileTap={buttonHover.whileTap}
                                onClick={() => { setSelectedResume(resume); setScreen("profile"); }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1"
                                style={{ border: `1px solid ${c.amberBorder}`, background: c.amberBg, color: col }}>
                                <Eye size={11} /> View
                              </motion.button>
                              <motion.button whileHover={buttonHover.whileHover} whileTap={buttonHover.whileTap}
                                onClick={() => setDeleteConfirm(resume.id)}
                                className="p-1 rounded-lg cursor-pointer flex items-center"
                                style={{ border: `1px solid ${c.redBorder}`, background: c.redBg, color: c.red }}>
                                <Trash2 size={11} />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── PROFILE SCREEN ─── */}
          {screen === "profile" && selectedResume && selectedResume.candidateProfile && (
            <ProfileScreen
              resume={selectedResume}
              profile={selectedResume.candidateProfile}
              c={c}
              onBack={() => setScreen("dashboard")}
              onCheckATS={() => { sessionStorage.setItem("pendingResumeUploadId", selectedResume.id); setView("ats-checker"); }}
              onCoverLetter={() => setView("cover-letter")}
              onLinkedIn={() => setView("linkedin-optimizer")}
              showToast={showToast}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setDeleteConfirm(null)}
            role="dialog" aria-modal="true" aria-label="Delete resume confirmation">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="rounded-2xl p-6"
              style={{ background: c.d ? "#1a1a2e" : "#fff", border: `1px solid ${c.border}`, maxWidth: 400, width: "90%" }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: c.redBg }}>
                  <AlertTriangle size={20} style={{ color: c.red }} />
                </div>
                <h3 className="text-base font-extrabold" style={{ color: c.text, margin: 0 }}>Delete Resume</h3>
              </div>
              <p className="text-sm leading-relaxed mb-4" style={{ color: c.textSec }}>
                This will permanently delete this resume and its associated candidate profile. This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <motion.button whileHover={buttonHover.whileHover} whileTap={buttonHover.whileTap}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ border: `1px solid ${c.border}`, background: "transparent", color: c.textSec }}>
                  Cancel
                </motion.button>
                <motion.button whileHover={buttonHover.whileHover} whileTap={buttonHover.whileTap}
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  style={{ border: "none", background: c.red, color: "#fff" }}>
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 768px) {
          .ru-score-grid { grid-template-columns: 1fr !important; }
          .ru-profile-grid { grid-template-columns: 1fr !important; }
          .ru-actions-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 1024px) {
          .ru-score-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </motion.div>
  );
}

// ─── Profile Sub-Component ────────────────────────────────────────────────────

function ProfileScreen({ resume, profile, c, onBack, onCheckATS, onCoverLetter, onLinkedIn, showToast }: {
  resume: UploadedResume;
  profile: CandidateProfile;
  c: ReturnType<typeof mkColors>;
  onBack: () => void;
  onCheckATS: () => void;
  onCoverLetter: () => void;
  onLinkedIn: () => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "details" | "health">("overview");

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" exit="exit">
      {/* Profile Header */}
      <div className="flex items-center gap-3.5 mb-4">
        <motion.div variants={scaleIn} initial="hidden" animate="visible"
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <UserCircle size={28} style={{ color: "#000" }} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <motion.h2 variants={fadeUp} initial="hidden" animate="visible" custom={0}
            className="text-lg font-extrabold truncate" style={{ color: c.text, margin: 0 }}>
            {profile.name || resume.fileName}
          </motion.h2>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="flex items-center gap-2.5 mt-0.5 flex-wrap">
            {profile.email && <span className="text-xs" style={{ color: c.textSec }}>{profile.email}</span>}
            {profile.phone && <span className="text-xs" style={{ color: c.textMuted }}>{profile.phone}</span>}
            {profile.location && <span className="text-xs" style={{ color: c.textMuted }}>{profile.location}</span>}
          </motion.div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <motion.button whileHover={buttonHover.whileHover} whileTap={buttonHover.whileTap} onClick={onCheckATS}
            className="px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
            style={{ border: `1px solid ${c.amberBorder}`, background: c.amberBg, color: col }}>
            <Target size={13} /> ATS Score
          </motion.button>
        </div>
      </div>

      {/* Score Cards Row */}
      <div className="ru-score-grid grid grid-cols-3 gap-3 mb-4">
        <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0}
          className="rounded-2xl p-4 text-center"
          style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <ScoreRing score={profile.completenessScore} label="Completeness" size={90} strokeWidth={7} />
        </motion.div>

        <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={1}
          className="rounded-2xl p-4 text-center"
          style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <ScoreRing score={profile.strengthScore} label="Profile Strength" size={90} strokeWidth={7} />
        </motion.div>

        <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={2}
          className="rounded-2xl p-4 text-center"
          style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div className="mx-auto mb-2 rounded-full flex items-center justify-center"
            style={{ width: 90, height: 90, background: c.greenBg, border: `3px solid ${c.greenBorder}` }}>
            <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, type: "spring" }}
              className="text-2xl font-extrabold" style={{ color: c.green }}>
              {(profile.skills || []).length}
            </motion.span>
          </div>
          <div className="text-xs font-bold" style={{ color: c.text }}>Skills Found</div>
          <div className="text-[10px]" style={{ color: c.textMuted }}>Extracted</div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 p-1 rounded-xl" style={{ background: c.surface }}>
        {(["overview", "details", "health"] as const).map((tab) => (
          <motion.button key={tab} whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all"
            style={{
              background: activeTab === tab ? (c.d ? "rgba(255,255,255,0.08)" : "#fff") : "transparent",
              color: activeTab === tab ? c.text : c.textMuted,
              boxShadow: activeTab === tab ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}>
            {tab === "overview" ? "Overview" : tab === "details" ? "Details" : "Health Check"}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div key="overview" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {(profile.skills || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Zap size={13} style={{ color: col }} /> Skills ({(profile.skills || []).length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.skills || []).map((skill, i) => (
                    <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: col }}>
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {(profile.education || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <BookOpen size={13} style={{ color: c.purple }} /> Education
                </h4>
                {(profile.education || []).map((edu, i) => (
                  <div key={i} className="rounded-lg p-2.5 mb-1.5" style={{ background: c.surface }}>
                    <div className="text-xs font-bold" style={{ color: c.text }}>{edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}</div>
                    <div className="text-[11px]" style={{ color: c.textSec }}>{edu.institution}</div>
                    <div className="text-[10px]" style={{ color: c.textMuted }}>{edu.startDate} - {edu.endDate}</div>
                  </div>
                ))}
              </div>
            )}

            {(profile.experience || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Briefcase size={13} style={{ color: c.cyan }} /> Experience ({(profile.experience || []).length})
                </h4>
                {(profile.experience || []).map((exp, i) => (
                  <div key={i} className="rounded-lg p-2.5 mb-1.5" style={{ background: c.surface }}>
                    <div className="text-xs font-bold" style={{ color: c.text }}>{exp.role}</div>
                    <div className="text-[11px]" style={{ color: c.textSec }}>{exp.company}</div>
                    <div className="text-[10px]" style={{ color: c.textMuted }}>{exp.startDate} - {exp.endDate}</div>
                  </div>
                ))}
              </div>
            )}

            {(profile.projects || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Code2 size={13} style={{ color: c.green }} /> Projects ({(profile.projects || []).length})
                </h4>
                {(profile.projects || []).map((proj, i) => (
                  <div key={i} className="rounded-lg p-2.5 mb-1.5" style={{ background: c.surface }}>
                    <div className="text-xs font-bold" style={{ color: c.text }}>{proj.name}</div>
                    {proj.techStack && <div className="text-[10px] font-semibold" style={{ color: col }}>{proj.techStack}</div>}
                  </div>
                ))}
              </div>
            )}

            {(profile.certifications || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Award size={13} style={{ color: col }} /> Certifications ({(profile.certifications || []).length})
                </h4>
                {(profile.certifications || []).map((cert, i) => (
                  <div key={i} className="text-xs py-1 px-2 rounded-lg mb-1" style={{ background: c.surface }}>
                    <span className="font-bold" style={{ color: c.text }}>{cert.name}</span>
                    {cert.issuer && <span style={{ color: c.textSec }}> - {cert.issuer}</span>}
                  </div>
                ))}
              </div>
            )}

            {(profile.achievements || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Trophy size={13} style={{ color: c.amber }} /> Achievements ({(profile.achievements || []).length})
                </h4>
                {(profile.achievements || []).map((ach, i) => (
                  <div key={i} className="text-xs flex items-start gap-2 py-1" style={{ color: c.textSec }}>
                    <CheckCircle2 size={12} style={{ color: c.green, marginTop: 2, flexShrink: 0 }} /> {ach}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "details" && (
          <motion.div key="details" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {profile.summary && (
              <div className="rounded-2xl p-4 sm:col-span-2" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <FileText size={13} style={{ color: col }} /> Professional Summary
                </h4>
                <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: c.textSec, margin: 0 }}>{profile.summary}</p>
              </div>
            )}

            {(profile.experience || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Briefcase size={13} style={{ color: c.cyan }} /> Experience Details
                </h4>
                {(profile.experience || []).map((exp, i) => (
                  <div key={i} className="rounded-lg p-3 mb-1.5" style={{ background: c.surface }}>
                    <div className="text-xs font-bold" style={{ color: c.text }}>{exp.role} @ {exp.company}</div>
                    <div className="text-[10px] mb-1" style={{ color: c.textMuted }}>{exp.startDate} - {exp.endDate}</div>
                    {exp.description && <div className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: c.textSec }}>{exp.description}</div>}
                  </div>
                ))}
              </div>
            )}

            {(profile.projects || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Code2 size={13} style={{ color: c.green }} /> Project Details
                </h4>
                {(profile.projects || []).map((proj, i) => (
                  <div key={i} className="rounded-lg p-3 mb-1.5" style={{ background: c.surface }}>
                    <div className="text-xs font-bold" style={{ color: c.text }}>{proj.name}</div>
                    {proj.techStack && <div className="text-[10px] font-semibold" style={{ color: col }}>{proj.techStack}</div>}
                    {proj.description && <div className="text-[11px] leading-relaxed whitespace-pre-wrap mt-1" style={{ color: c.textSec }}>{proj.description}</div>}
                  </div>
                ))}
              </div>
            )}

            {(profile.languages || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Languages size={13} style={{ color: c.purple }} /> Languages
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {(profile.languages || []).map((lang, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                      style={{ background: c.purpleBg, border: `1px solid ${c.purpleBorder}`, color: c.purple }}>{lang}</span>
                  ))}
                </div>
              </div>
            )}

            {profile.links && Object.keys(profile.links).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Globe size={13} style={{ color: c.cyan }} /> Links
                </h4>
                {Object.entries(profile.links).filter(([_, v]) => v).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 py-1 text-xs">
                    <ExternalLink size={11} style={{ color: col, flexShrink: 0 }} />
                    <span className="font-semibold capitalize" style={{ color: c.textSec }}>{key}:</span>
                    <span className="break-all" style={{ color: col }}>{val as string}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "health" && (
          <motion.div key="health" variants={fadeUp} initial="hidden" animate="visible" exit="exit"
            className="flex flex-col gap-3">

            {(profile.missingSections || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{ color: c.text }}>
                  <AlertCircle size={13} style={{ color: c.amber }} /> Missing Information
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(profile.missingSections || []).map((section, i) => (
                    <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: col }}>
                      <AlertCircle size={12} /> {section}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {(profile.strengths || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Shield size={13} style={{ color: c.green }} /> Strengths
                </h4>
                <div className="flex flex-col gap-1.5">
                  {(profile.strengths || []).map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: c.greenBg, color: c.green }}>
                      <CheckCircle2 size={13} /> {s}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {(profile.weaknesses || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{ color: c.text }}>
                  <AlertTriangle size={13} style={{ color: c.amber }} /> Areas for Improvement
                </h4>
                <div className="flex flex-col gap-1.5">
                  {(profile.weaknesses || []).map((w, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                      style={{ background: c.amberBg, color: c.amber }}>
                      <AlertTriangle size={13} /> {w}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {(profile.recommendations || []).length > 0 && (
              <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h4 className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{ color: c.text }}>
                  <Lightbulb size={13} style={{ color: c.cyan }} /> Recommendations
                </h4>
                <div className="flex flex-col gap-2">
                  {(profile.recommendations || []).map((rec, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs leading-relaxed"
                      style={{ background: c.cyanBg, color: c.cyan }}>
                      <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {rec}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="rounded-2xl p-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
              <h4 className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: c.text }}>
                <Zap size={13} style={{ color: col }} /> Quick Actions
              </h4>
              <div className="ru-actions-grid grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { label: "Check ATS Score", icon: <Target size={18} />, color: col, bg: c.amberBg, border: c.amberBorder, onClick: onCheckATS },
                  { label: "Cover Letter", icon: <FileText size={18} />, color: c.cyan, bg: c.cyanBg, border: c.cyanBorder, onClick: onCoverLetter },
                  { label: "LinkedIn Optimize", icon: <Globe size={18} />, color: c.green, bg: c.greenBg, border: c.greenBorder, onClick: onLinkedIn },
                ].map((action) => (
                  <motion.button key={action.label} whileHover={{ scale: 1.03, y: -2 }} whileTap={buttonHover.whileTap}
                    onClick={action.onClick}
                    className="p-3 rounded-xl cursor-pointer flex flex-col items-center gap-2 text-center transition-all"
                    style={{ border: `1px solid ${action.border}`, background: action.bg }}>
                    <div style={{ color: action.color }}>{action.icon}</div>
                    <span className="text-[11px] font-bold" style={{ color: action.color }}>{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
