"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import {
  FileText, Save, Sparkles, Download, Plus, Trash2,
  ChevronLeft, ChevronRight, ArrowRight, Eye, ZoomIn, ZoomOut, Maximize2,
  Check, MessageCircle, Send, X, Bot, User, Loader2, Zap,
  Globe, BookOpen, Award, Languages,
  GraduationCap, Briefcase, Code2, UserCircle, Settings,
  Monitor, Tablet, Smartphone, Trophy, RefreshCw, AlertCircle, Star, Target,
} from "lucide-react";
import type { ResumeHubViewType } from "@/types/resume";
import { formStateToJSONResume, jsonResumeToFormState } from "@/types/resume";
import { useTheme } from "@/hooks/useTheme";
import { mkColors as centralizedMkColors } from "@/utils/themeColors";
import { fadeUp, scaleIn, pageTransition, buttonHover } from "@/utils/animations";

interface ResumeBuilderViewProps {
  setView: (v: ResumeHubViewType) => void;
  selectedTemplate: string;
}

const COMPANIES = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Uber", "Tesla", "Spotify", "Adobe", "Stripe", "LinkedIn", "Nvidia", "Salesforce", "Oracle", "IBM", "Cisco", "Morgan Stanley", "Goldman Sachs", "Deloitte", "Accenture", "TCS", "Infosys", "Wipro", "Other"];
const PROFESSIONS = ["Software Engineer", "ML Engineer", "Data Scientist", "Full Stack Developer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "Cloud Engineer", "AI Engineer", "Product Manager", "UI/UX Designer", "Data Analyst", "SDE", "SRE", "Systems Engineer", "Research Scientist", "Other"];
const CAREER_LEVELS = ["Fresher", "Junior (1-2 yrs)", "Mid-Level (3-5 yrs)", "Senior (6-8 yrs)", "Lead (8+ yrs)"];
const RESUME_STYLES = ["ATS Modern", "ATS Professional", "ATS Minimal", "ATS Developer", "ATS Student"];
const CHAT_SUGGESTIONS = ["Optimize for Amazon", "Reduce to one page", "Improve summary", "Improve project descriptions", "Add stronger action verbs", "Rewrite achievements"];

const mkColors = (theme: string) => {
  const base = centralizedMkColors(theme);
  return {
    ...base,
    chatBg: base.d ? "#0a0e14" : "#f8fafc",
    genBg: base.d ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    textSecondary: base.textSec,
    textDim: base.textMuted,
  };
};



const col = "#f59e0b";

function ToastBar({ toastMsg, isDark, text }: { toastMsg: string | null; isDark: boolean; text: string }) {
  return (
    <AnimatePresence>
      {toastMsg && (
        <motion.div initial={{ opacity: 0, y: -16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.95 }} style={{ position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: isDark ? "#1a1a2e" : "#fff", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "0.55rem 1.1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", fontWeight: 600, color: text }}>
          <Sparkles size={14} style={{ color: col }} /> {toastMsg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ResumeBuilderView({ setView, selectedTemplate }: ResumeBuilderViewProps) {
  const theme = useTheme();
  const c = mkColors(theme);
  const [screen, setScreen] = useState(1);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [zoom, setZoom] = useState(75);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [setup, setSetup] = useState({ company: "Google", profession: "Software Engineer", careerLevel: "Fresher", resumeStyle: selectedTemplate || "ATS Modern" });
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const genSteps = [
    { label: "Analyzing Profile", desc: "Extracting key achievements", icon: <UserCircle size={14} /> },
    { label: `Optimizing for ${setup.company}`, desc: `Tailoring to ${setup.company} standards`, icon: <Briefcase size={14} /> },
    { label: `Optimizing for ${setup.profession}`, desc: `Matching ${setup.profession} requirements`, icon: <Code2 size={14} /> },
    { label: "Generating ATS Resume", desc: "Creating final ATS-compatible layout", icon: <FileText size={14} /> },
  ];
  const [personalInfo, setPersonalInfo] = useState({ fullName: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "" });
  const [summary, setSummary] = useState("");
  const [education, setEducation] = useState<Array<{ institution: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string; grade: string }>>([{ institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", grade: "" }]);
  const [experience, setExperience] = useState<Array<{ company: string; role: string; startDate: string; endDate: string; description: string }>>([{ company: "", role: "", startDate: "", endDate: "", description: "" }]);
  const [projects, setProjects] = useState<Array<{ name: string; techStack: string; description: string }>>([{ name: "", techStack: "", description: "" }]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [certifications, setCertifications] = useState<Array<{ name: string; issuer: string; date: string }>>([{ name: "", issuer: "", date: "" }]);
  const [achievements, setAchievements] = useState<string[]>([""]);
  const [languages, setLanguages] = useState<string[]>([""]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const accumulatedTextRef = useRef("");
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); }, []);

  // Load resume from sessionStorage when navigated from ResumeImprovements (Apply button)
  useEffect(() => {
    const pendingId = sessionStorage.getItem("pendingResumeId");
    if (pendingId) {
      sessionStorage.removeItem("pendingResumeId");
      (async () => {
        try {
          const res = await api.get(`/resume/${pendingId}`);
          if (res.data?.success && res.data?.resume) {
            const r = res.data.resume;
            // Convert JSON Resume format to form state
            if (r.resumeData) {
              const form = jsonResumeToFormState(r.resumeData);
              setPersonalInfo({ ...form.personalInfo, linkedin: "", github: "", portfolio: "" });
              setSummary(form.summary);
              if (form.education.length) setEducation(form.education);
              if (form.experience.length) setExperience(form.experience);
              if (form.projects.length) setProjects(form.projects);
              if (form.skills.length) setSkills(form.skills);
              if (form.certifications.length) setCertifications(form.certifications);
              if (form.achievements.length) setAchievements(form.achievements);
              if (form.languages.length) setLanguages(form.languages);
            } else if (r.personalInfo) {
              // Legacy format fallback
              setPersonalInfo(r.personalInfo);
              if (r.summary) setSummary(r.summary);
              if (r.education?.length) setEducation(r.education);
              if (r.experience?.length) setExperience(r.experience);
              if (r.projects?.length) setProjects(r.projects);
              if (r.skills?.length) setSkills(r.skills);
              if (r.certifications?.length) setCertifications(r.certifications);
              if (r.achievements?.length) setAchievements(r.achievements);
              if (r.languages?.length) setLanguages(r.languages);
            }
            if (r.template) setSetup((prev) => ({ ...prev, resumeStyle: r.template }));
            setResumeId(pendingId);
            setScreen(4);
            showToast("Resume loaded with applied improvements!");
          }
        } catch {
          console.warn("[ResumeBuilder] Failed to load pending resume:", pendingId);
        }
      })();
    }
  }, []);

  const resumeJSON = { personalInfo, summary, education, experience, projects, skills, certifications, achievements, languages };

  // AI
  const handleAISummary = async () => {
    setGeneratingAI(true);
    try { const res = await api.post("/resume/generate-summary", { personalInfo, education, experience, skills }); if (res.data.success && res.data.summary) setSummary(res.data.summary); showToast("Summary generated!"); } catch { showToast("AI generation failed"); } finally { setGeneratingAI(false); }
  };
  const handleAIExperience = async (index: number) => {
    setGeneratingAI(true);
    try { const item = experience[index]; const res = await api.post("/resume/enhance-experience", { role: item.role, company: item.company, description: item.description }); if (res.data.success && res.data.description) { const u = [...experience]; u[index].description = res.data.description; setExperience(u); showToast("Experience enhanced!"); } } catch {} finally { setGeneratingAI(false); }
  };
  const handleAIProject = async (index: number) => {
    setGeneratingAI(true);
    try { const item = projects[index]; const res = await api.post("/resume/enhance-project", { name: item.name, techStack: item.techStack, description: item.description }); if (res.data.success && res.data.description) { const u = [...projects]; u[index].description = res.data.description; setProjects(u); showToast("Project enhanced!"); } } catch {} finally { setGeneratingAI(false); }
  };
  const handleAIOptimizeCompany = async () => {
    setGeneratingAI(true);
    try { const res = await api.post("/resume/optimize-resume", { resumeJson: resumeJSON, targetCompany: setup.company }); if (res.data.success && res.data.resume) { const r = res.data.resume; if (r.personalInfo) setPersonalInfo(r.personalInfo); if (r.summary) setSummary(r.summary); if (r.education) setEducation(r.education); if (r.experience) setExperience(r.experience); if (r.projects) setProjects(r.projects); if (r.skills) setSkills(r.skills); if (r.certifications) setCertifications(r.certifications); if (r.achievements) setAchievements(r.achievements); if (r.languages) setLanguages(r.languages); showToast("Optimized for " + setup.company); } } catch {} finally { setGeneratingAI(false); }
  };
  const handleAIChat = async (msg?: string) => {
    const message = msg || chatInput;
    if (!message.trim() || chatLoading) return;
    setChatInput(""); setChatMessages((prev) => [...prev, { role: "user", text: message }]); setChatLoading(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("adyapan-token") : null;
    setChatMessages((prev) => [...prev, { role: "ai", text: "" }]);
    try {
      const res = await fetch(`${api.defaults.baseURL}/resume/ai-chat/stream`, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ resumeData: resumeJSON, message }) });
      if (!res.ok) {
        let data: unknown = null;
        try { data = await res.json(); } catch { data = null; }
        if (data && typeof data === "object" && (data as { code?: string }).code === "LIMIT_EXCEEDED") {
          import("@/store/usage-store").then(({ useUsageStore }) =>
            useUsageStore.getState().openLimitModal(data as import("@/store/usage-store").LimitSnapshot)
          );
        }
        throw new Error("Stream failed");
      }
      const reader = res.body?.getReader(); if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder(); let buffer = ""; accumulatedTextRef.current = "";
      while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const lines = buffer.split("\n"); buffer = lines.pop() || ""; for (const line of lines) { const trimmed = line.trim(); if (!trimmed.startsWith("data: ")) continue; try { const data = JSON.parse(trimmed.slice(6)); if (data.type === "chunk") { accumulatedTextRef.current += data.text; setChatMessages((prev) => { const n = [...prev]; n[n.length - 1] = { role: "ai", text: accumulatedTextRef.current }; return n; }); } else if (data.type === "result") { if (data.summary) setSummary(data.summary); if (data.experience) setExperience(data.experience); if (data.projects) setProjects(data.projects); if (data.skills) setSkills(data.skills); const updated = Object.keys({ summary: data.summary, experience: data.experience, projects: data.projects, skills: data.skills }).filter(k => data[k]).join(", "); if (updated) { accumulatedTextRef.current += `\n\nUpdated: ${updated}`; setChatMessages((prev) => { const n = [...prev]; n[n.length - 1] = { role: "ai", text: accumulatedTextRef.current }; return n; }); } } else if (data.type === "error") throw new Error(data.message); } catch {} } }
    } catch { setChatMessages((prev) => { const n = [...prev]; n[n.length - 1] = { role: "ai", text: "Something went wrong. Try again." }; return n; }); } finally { setChatLoading(false); }
  };
  const handleGenerate = async () => {
    setGenerating(true); setGenStep(0);
    const snap = { personalInfo, summary, education, experience, projects, skills, certifications: [...certifications], achievements: [...achievements], languages: [...languages], company: setup.company, profession: setup.profession, resumeStyle: setup.resumeStyle };
    const snapJSON = { personalInfo: snap.personalInfo, summary: snap.summary, education: snap.education, experience: snap.experience, projects: snap.projects, skills: snap.skills, certifications: snap.certifications, achievements: snap.achievements, languages: snap.languages };
    try { const r = await api.post("/resume/generate-summary", { personalInfo: snap.personalInfo, education: snap.education, experience: snap.experience, skills: snap.skills }); if (r.data.success && r.data.summary) setSummary(r.data.summary); } catch {}
    setGenStep(1);
    try { const r = await api.post("/resume/optimize-resume", { resumeJson: snapJSON, targetCompany: snap.company }); if (r.data.success && r.data.resume) { const d = r.data.resume; if (d.summary) setSummary(d.summary); if (d.experience) setExperience(d.experience || snap.experience); if (d.projects) setProjects(d.projects || snap.projects); if (d.skills) setSkills(d.skills || snap.skills); } } catch {}
    setGenStep(3);
    try {
      const jr = formStateToJSONResume(snapJSON);
      const r = await api.post("/resume/create", { title: `My ${snap.profession} Resume`, template: snap.resumeStyle, resumeData: jr, targetCompany: snap.company });
      if (r.data.success && r.data.resume) setResumeId(r.data.resume.id);
    } catch {}
    setGenStep(4); setGenerating(false); setScreen(4);
  };
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const jr = formStateToJSONResume(resumeJSON);
      const payload = { title: `My ${setup.profession} Resume`, template: setup.resumeStyle, resumeData: jr, targetCompany: setup.company };
      if (resumeId) await api.put(`/resume/update/${resumeId}`, payload);
      else { const r = await api.post("/resume/create", payload); if (r.data?.success && r.data.resume) setResumeId(r.data.resume.id); }
      showToast("Draft saved!");
    } catch { showToast("Save failed"); } finally { setSaving(false); }
  };
  const handleExport = async (type: "pdf" | "docx") => {
    if (!resumeId) await handleSaveDraft();
    setExporting(type);
    try {
      const id = resumeId; if (!id) return;
      const r = await api.post(`/resume/export-${type}`, { resumeId: id }, { responseType: "blob" });
      const blob = new Blob([r.data], { type: type === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${setup.company}_${setup.profession}_Resume.${type}`; link.click();
      showToast(`Exported as ${type.toUpperCase()}`);
    } catch { showToast("Export failed"); } finally { setExporting(null); }
  };

  const addEdu = () => setEducation([...education, { institution: "", degree: "", fieldOfStudy: "", startDate: "", endDate: "", grade: "" }]);
  const removeEdu = (i: number) => setEducation(education.filter((_, idx) => idx !== i));
  const updateEdu = (i: number, k: string, v: string) => { const u = [...education]; (u[i] as Record<string, string>)[k] = v; setEducation(u); };
  const addExp = () => setExperience([...experience, { company: "", role: "", startDate: "", endDate: "", description: "" }]);
  const removeExp = (i: number) => setExperience(experience.filter((_, idx) => idx !== i));
  const updateExp = (i: number, k: string, v: string) => { const u = [...experience]; (u[i] as Record<string, string>)[k] = v; setExperience(u); };
  const addProj = () => setProjects([...projects, { name: "", techStack: "", description: "" }]);
  const removeProj = (i: number) => setProjects(projects.filter((_, idx) => idx !== i));
  const updateProj = (i: number, k: string, v: string) => { const u = [...projects]; (u[i] as Record<string, string>)[k] = v; setProjects(u); };
  const addCert = () => setCertifications([...certifications, { name: "", issuer: "", date: "" }]);
  const removeCert = (i: number) => setCertifications(certifications.filter((_, idx) => idx !== i));
  const updateCert = (i: number, k: string, v: string) => { const u = [...certifications]; (u[i] as Record<string, string>)[k] = v; setCertifications(u); };
  const addAchievement = () => setAchievements([...achievements, ""]);
  const removeAchievement = (i: number) => setAchievements(achievements.filter((_, idx) => idx !== i));
  const updateAchievement = (i: number, v: string) => { const u = [...achievements]; u[i] = v; setAchievements(u); };
  const addLanguage = () => setLanguages([...languages, ""]);
  const removeLanguage = (i: number) => setLanguages(languages.filter((_, idx) => idx !== i));
  const updateLanguage = (i: number, v: string) => { const u = [...languages]; u[i] = v; setLanguages(u); };
  const addSkill = () => { if (skillInput.trim() && !skills.includes(skillInput.trim())) { setSkills([...skills, skillInput.trim()]); setSkillInput(""); } };
  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));
  const canContinue = (screenNum: number) => { if (screenNum === 1) return setup.company && setup.profession && setup.careerLevel; if (screenNum === 2) return personalInfo.fullName && personalInfo.email; return true; };

  const inputSx: React.CSSProperties = { width: "100%", backgroundColor: c.inputBg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "0.6rem 0.85rem", fontSize: "0.82rem", color: c.text, outline: "none", boxSizing: "border-box" as const, transition: "border-color 0.15s, box-shadow 0.15s" };



  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col antialiased min-h-[calc(100vh-120px)]" style={{ color: c.text, background: c.bg }}>
      <ToastBar toastMsg={toastMsg} isDark={c.isDark} text={c.text} />
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-2.5 px-5 pt-3 pb-2" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
          <FileText size={18} style={{ color: "#000" }} />
        </motion.div>
        <div>
          <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>
            Resume Builder
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className="text-xs leading-tight" style={{ color: c.textMuted }}>
            AI-powered, ATS-optimized resume tailored to your target role
          </motion.p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden" style={{ position: "relative" }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={pageTransition} className="h-full">

            {/* ─── SCREEN 1 — Setup ─── */}
            {screen === 1 && (
              <div className="h-full grid grid-cols-1 lg:grid-cols-5 gap-0">
                <div className="lg:col-span-3 h-full flex flex-col p-6 overflow-y-auto">


                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.75rem" }}>
                    {[
                      { label: "Target Company", value: setup.company, onChange: (v: string) => setSetup({ ...setup, company: v }), options: COMPANIES, icon: <Briefcase size={14} /> },
                      { label: "Target Profession", value: setup.profession, onChange: (v: string) => setSetup({ ...setup, profession: v }), options: PROFESSIONS, icon: <Code2 size={14} /> },
                      { label: "Career Level", value: setup.careerLevel, onChange: (v: string) => setSetup({ ...setup, careerLevel: v }), options: CAREER_LEVELS, icon: <Target size={14} /> },
                      { label: "Resume Style", value: setup.resumeStyle, onChange: (v: string) => setSetup({ ...setup, resumeStyle: v }), options: RESUME_STYLES, icon: <FileText size={14} /> },
                    ].map((field) => (
                      <div key={field.label} style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "0.7rem 1rem" }}>
                        <label style={{ fontSize: "0.68rem", fontWeight: 700, color: c.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ color: col }}>{field.icon}</span> {field.label}
                        </label>
                        <select value={field.value} onChange={(e) => field.onChange(e.target.value)}
                          style={{ ...inputSx, cursor: "pointer", appearance: "none" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", paddingRight: "2rem" }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.08)"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
                        >
                          {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <motion.button whileHover={canContinue(1) ? { scale: 1.01, boxShadow: "0 8px 24px rgba(245,158,11,0.3)" } : {}} whileTap={canContinue(1) ? { scale: 0.98 } : {}}
                    onClick={() => canContinue(1) && setScreen(2)}
                    disabled={!canContinue(1)}
                    style={{ width: "100%", padding: "0.7rem", borderRadius: 12, border: "none", fontWeight: 700, fontSize: "0.85rem", cursor: canContinue(1) ? "pointer" : "not-allowed", background: canContinue(1) ? "linear-gradient(135deg, #f59e0b, #d97706)" : c.surface, color: canContinue(1) ? "#000" : c.textDim, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: "0.75rem" }}
                  >
                    Continue <ChevronRight size={16} />
                  </motion.button>
                </div>

                <div className="lg:col-span-2 hidden lg:flex flex-col p-6 h-full overflow-y-auto" style={{ borderLeft: `1px solid ${c.border}`, background: c.surface }}>
                  <h3 style={{ fontSize: "0.7rem", fontWeight: 700, color: c.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>Template Preview</h3>
                    <div style={{ background: "#fff", borderRadius: 10, padding: "1.5rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", flex: 1, minHeight: 300, fontSize: "0.65rem", color: "#334155" }}>
                      <div style={{ textAlign: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem", marginBottom: "0.75rem" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.9rem", color: setup.resumeStyle.includes("Developer") ? "#d97706" : "#1e293b" }}>{personalInfo.fullName || "Your Name"}</div>
                        <div style={{ color: "#64748b", marginTop: 2 }}>{personalInfo.email || "email@example.com"} {personalInfo.phone && `• ${personalInfo.phone}`}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {summary && (
                          <div>
                            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 2, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Professional Summary</div>
                            <div style={{ height: 1, background: "#e2e8f0", marginBottom: 4 }} />
                            <p style={{ color: "#475569", lineHeight: 1.5 }}>{summary}</p>
                          </div>
                        )}
                        {experience.some((e) => e.role || e.company) && (
                          <div>
                            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 2, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Experience</div>
                            <div style={{ height: 1, background: "#e2e8f0", marginBottom: 4 }} />
                            {experience.filter((e) => e.role || e.company).slice(0, 2).map((e, i) => (
                              <div key={i} style={{ marginBottom: 4 }}>
                                <div style={{ fontWeight: 600 }}>{e.role || "Role"} @ {e.company || "Company"}</div>
                                <div style={{ color: "#64748b" }}>{e.description?.slice(0, 80) || "Description..."}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {skills.length > 0 && (
                          <div>
                            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 2, fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>Skills</div>
                            <div style={{ height: 1, background: "#e2e8f0", marginBottom: 4 }} />
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{skills.slice(0, 6).map((s) => <span key={s} style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontSize: "0.55rem" }}>{s}</span>)}{skills.length > 6 && <span style={{ fontSize: "0.55rem", color: "#64748b" }}>+{skills.length - 6} more</span>}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {RESUME_STYLES.map((s) => (
                      <motion.button key={s} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setSetup({ ...setup, resumeStyle: s })}
                        style={{ padding: "0.3rem 0.7rem", borderRadius: 20, fontSize: "0.65rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${setup.resumeStyle === s ? "rgba(245,158,11,0.4)" : c.border}`, background: setup.resumeStyle === s ? "rgba(245,158,11,0.1)" : "transparent", color: setup.resumeStyle === s ? col : c.textSecondary }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── SCREEN 2 — Information ─── */}
            {screen === 2 && (
              <div className="h-full flex flex-col">
                <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.25rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 10, alignItems: "start" }}>
                    {/* Left column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Personal Info */}
                      <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "1rem" }}>
                        <h3 style={{ fontSize: "0.72rem", fontWeight: 700, color: c.text, margin: "0 0 0.65rem", display: "flex", alignItems: "center", gap: 6 }}><UserCircle size={14} style={{ color: col }} /> Personal Info</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          {[{ p: "Full Name *", v: personalInfo.fullName, set: (v: string) => setPersonalInfo({ ...personalInfo, fullName: v }) }, { p: "Email *", v: personalInfo.email, set: (v: string) => setPersonalInfo({ ...personalInfo, email: v }) }, { p: "Phone", v: personalInfo.phone, set: (v: string) => setPersonalInfo({ ...personalInfo, phone: v }) }, { p: "Location", v: personalInfo.location, set: (v: string) => setPersonalInfo({ ...personalInfo, location: v }) }].map((f, i) => (
                            <input key={i} placeholder={f.p} value={f.v} onChange={e => f.set(e.target.value)} style={inputSx} />
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
                          {[{ p: "LinkedIn URL", v: personalInfo.linkedin, set: (v: string) => setPersonalInfo({ ...personalInfo, linkedin: v }) }, { p: "GitHub URL", v: personalInfo.github, set: (v: string) => setPersonalInfo({ ...personalInfo, github: v }) }, { p: "Portfolio URL", v: personalInfo.portfolio, set: (v: string) => setPersonalInfo({ ...personalInfo, portfolio: v }) }].map((f, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: c.textMuted, display: "flex" }}><Globe size={12} /></span>
                              <input placeholder={f.p} value={f.v} onChange={e => f.set(e.target.value)} style={{ ...inputSx, paddingLeft: "1.8rem" }} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Education */}
                      <CollapsibleSection title="Education" icon={<GraduationCap size={14} />} color={col} t={c} onAdd={addEdu}>
                        {education.map((item, idx) => (
                          <div key={idx} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: "0.7rem", position: "relative", marginBottom: 6 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <input placeholder="Institution" value={item.institution} onChange={e => updateEdu(idx, "institution", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                              <input placeholder="Degree" value={item.degree} onChange={e => updateEdu(idx, "degree", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                              <input placeholder="Field of Study" value={item.fieldOfStudy} onChange={e => updateEdu(idx, "fieldOfStudy", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                              <input placeholder="CGPA/Grade" value={item.grade} onChange={e => updateEdu(idx, "grade", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                              <input placeholder="Start Date" value={item.startDate} onChange={e => updateEdu(idx, "startDate", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                              <input placeholder="End Date" value={item.endDate} onChange={e => updateEdu(idx, "endDate", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            </div>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeEdu(idx)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 5, padding: 3, cursor: "pointer", color: "#ef4444", display: "flex" }}><Trash2 size={11} /></motion.button>
                          </div>
                        ))}
                      </CollapsibleSection>

                      {/* Experience */}
                      <CollapsibleSection title="Experience" icon={<Briefcase size={14} />} color={col} t={c} onAdd={addExp}>
                        {experience.map((item, idx) => (
                          <div key={idx} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: "0.7rem", position: "relative", marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 6 }}>
                              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleAIExperience(idx)} disabled={generatingAI} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "0.2rem 0.5rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 5, color: col, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}><Sparkles size={8} /> AI Enhance</motion.button>
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeExp(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 5, padding: 3, cursor: "pointer", color: "#ef4444", display: "flex" }}><Trash2 size={11} /></motion.button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <input placeholder="Company" value={item.company} onChange={e => updateExp(idx, "company", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                              <input placeholder="Role" value={item.role} onChange={e => updateExp(idx, "role", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 6 }}>
                              <input placeholder="Start Date" value={item.startDate} onChange={e => updateExp(idx, "startDate", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                              <input placeholder="End Date" value={item.endDate} onChange={e => updateExp(idx, "endDate", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            </div>
                            <textarea placeholder="Description (responsibilities, achievements, technologies used)..."
                              value={item.description} onChange={e => updateExp(idx, "description", e.target.value)}
                              style={{ ...inputSx, height: 56, resize: "vertical", fontSize: "0.78rem", padding: "0.45rem 0.65rem", marginTop: 6 }}
                            />
                          </div>
                        ))}
                      </CollapsibleSection>

                      {/* Achievements */}
                      <CollapsibleSection title="Achievements" icon={<Trophy size={14} />} color={col} t={c} onAdd={addAchievement}>
                        {achievements.map((ach, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <input placeholder="e.g. Secured 1st place in National Hackathon" value={ach} onChange={e => updateAchievement(idx, e.target.value)} style={{ ...inputSx, flex: 1, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeAchievement(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 5, padding: 5, cursor: "pointer", color: "#ef4444", display: "flex" }}><Trash2 size={12} /></motion.button>
                          </div>
                        ))}
                      </CollapsibleSection>
                    </div>

                    {/* Right column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Summary */}
                      <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "1rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                          <h3 style={{ fontSize: "0.72rem", fontWeight: 700, color: c.text, margin: 0, display: "flex", alignItems: "center", gap: 6 }}><BookOpen size={14} style={{ color: col }} /> Professional Summary</h3>
                          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleAISummary} disabled={generatingAI}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.25rem 0.6rem", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 6, color: col, fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}>
                            <Sparkles size={10} /> {generatingAI ? "..." : "AI Generate"}
                          </motion.button>
                        </div>
                        <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Summarize your professional experience, key skills, and career objectives..."
                          style={{ ...inputSx, height: 72, resize: "vertical", fontSize: "0.8rem" }}
                        />
                      </div>

                      {/* Projects */}
                      <CollapsibleSection title="Projects" icon={<Code2 size={14} />} color={col} t={c} onAdd={addProj}>
                        {projects.map((item, idx) => (
                          <div key={idx} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: "0.7rem", position: "relative", marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginBottom: 6 }}>
                              <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleAIProject(idx)} disabled={generatingAI} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "0.2rem 0.5rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 5, color: col, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}><Sparkles size={8} /> AI Enhance</motion.button>
                              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeProj(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 5, padding: 3, cursor: "pointer", color: "#ef4444", display: "flex" }}><Trash2 size={11} /></motion.button>
                            </div>
                            <input placeholder="Project Name" value={item.name} onChange={e => updateProj(idx, "name", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            <input placeholder="Technologies (comma separated)" value={item.techStack} onChange={e => updateProj(idx, "techStack", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem", marginTop: 6 }} />
                            <textarea placeholder="Description (key features, your contributions, results)"
                              value={item.description} onChange={e => updateProj(idx, "description", e.target.value)}
                              style={{ ...inputSx, height: 56, resize: "vertical", fontSize: "0.78rem", padding: "0.45rem 0.65rem", marginTop: 6 }}
                            />
                          </div>
                        ))}
                      </CollapsibleSection>

                      {/* Skills */}
                      <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "1rem" }}>
                        <h3 style={{ fontSize: "0.72rem", fontWeight: 700, color: c.text, margin: "0 0 0.65rem", display: "flex", alignItems: "center", gap: 6 }}><Zap size={14} style={{ color: col }} /> Skills</h3>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input placeholder="Add a skill..." value={skillInput} onChange={e => setSkillInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && addSkill()}
                            style={{ ...inputSx, flex: 1, fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
                          />
                          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={addSkill}
                            style={{ padding: "0.5rem 1rem", background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", borderRadius: 10, color: "#000", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                            Add
                          </motion.button>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                          {skills.map((s) => (
                            <motion.span key={s} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.25rem 0.6rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.18)", borderRadius: 16, fontSize: "0.72rem", color: c.textSecondary, fontWeight: 600 }}>
                              {s}
                              <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.8 }} onClick={() => removeSkill(s)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, fontSize: "0.85rem", lineHeight: 1 }}>&times;</motion.button>
                            </motion.span>
                          ))}
                        </div>
                      </div>

                      {/* Certifications */}
                      <CollapsibleSection title="Certifications" icon={<Award size={14} />} color={col} t={c} onAdd={addCert}>
                        {certifications.map((item, idx) => (
                          <div key={idx} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10, padding: "0.7rem", position: "relative", marginBottom: 6 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                              <input placeholder="Certification Name" value={item.name} onChange={e => updateCert(idx, "name", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                              <input placeholder="Issuer" value={item.issuer} onChange={e => updateCert(idx, "issuer", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            </div>
                            <input placeholder="Date" value={item.date} onChange={e => updateCert(idx, "date", e.target.value)} style={{ ...inputSx, fontSize: "0.78rem", padding: "0.45rem 0.65rem", marginTop: 6 }} />
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeCert(idx)} style={{ position: "absolute", top: 6, right: 6, background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 5, padding: 3, cursor: "pointer", color: "#ef4444", display: "flex" }}><Trash2 size={11} /></motion.button>
                          </div>
                        ))}
                      </CollapsibleSection>

                      {/* Languages */}
                      <CollapsibleSection title="Languages" icon={<Languages size={14} />} color={col} t={c} onAdd={addLanguage}>
                        {languages.map((lang, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                            <input placeholder="e.g. English (Fluent), Hindi (Native)" value={lang} onChange={e => updateLanguage(idx, e.target.value)} style={{ ...inputSx, flex: 1, fontSize: "0.78rem", padding: "0.45rem 0.65rem" }} />
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeLanguage(idx)} style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 5, padding: 5, cursor: "pointer", color: "#ef4444", display: "flex" }}><Trash2 size={12} /></motion.button>
                          </div>
                        ))}
                      </CollapsibleSection>
                    </div>
                  </div>
                </div>

                {/* Bottom nav */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 1.25rem", borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setScreen(1)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.45rem 1rem", borderRadius: 10, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", background: c.surface, border: `1px solid ${c.border}`, color: c.textSecondary }}>
                    <ChevronLeft size={14} /> Back
                  </motion.button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSaveDraft} disabled={saving} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.45rem 1rem", borderRadius: 10, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", background: "transparent", border: `1px solid ${c.borderLight}`, color: c.textSecondary }}>
                      <Save size={13} /> {saving ? "Saving..." : "Save Draft"}
                    </motion.button>
                    <motion.button whileHover={canContinue(2) ? { scale: 1.02, boxShadow: "0 8px 20px rgba(245,158,11,0.25)" } : {}} whileTap={canContinue(2) ? { scale: 0.98 } : {}}
                      onClick={() => { if (canContinue(2)) { setScreen(3); handleGenerate(); } }} disabled={!canContinue(2)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.45rem 1.2rem", borderRadius: 10, fontWeight: 700, fontSize: "0.78rem", cursor: canContinue(2) ? "pointer" : "not-allowed", background: canContinue(2) ? "linear-gradient(135deg, #f59e0b, #d97706)" : c.surface, color: canContinue(2) ? "#000" : c.textDim, border: "none" }}>
                      Generate Resume <Sparkles size={13} />
                    </motion.button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ─── SCREEN 3 — Generation ─── */}
            {screen === 3 && (
              <div className="h-full" style={{ padding: "1.5rem", overflowY: "auto" }}>
                <div style={{ maxWidth: 800, margin: "0 auto" }}>
                  {/* Status card */}
                  <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
                    <motion.div animate={{ rotate: genStep >= 4 ? 0 : 360 }} transition={{ repeat: genStep >= 4 ? 0 : Infinity, duration: 1.5, ease: "linear" }}
                      style={{ width: 60, height: 60, borderRadius: "50%", background: genStep >= 4 ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", border: `2px solid ${genStep >= 4 ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.85rem" }}>
                      {genStep >= 4 ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><Check size={28} style={{ color: "#10b981" }} /></motion.div> : <Loader2 size={28} style={{ color: col }} />}
                    </motion.div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: c.text, margin: 0 }}>{genStep >= 4 ? "Resume Generated!" : "Crafting Your Resume"}</h2>
                    <p style={{ fontSize: "0.85rem", color: c.textMuted, margin: "0.25rem 0 0" }}>{genStep >= 4 ? "Your ATS-optimized resume is ready for review" : "AI is analyzing and optimizing your profile"}</p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {genSteps.map((step, i) => (
                      <motion.div key={step.label} animate={{ background: i <= genStep ? c.genBg : c.surface, borderColor: i <= genStep ? "rgba(245,158,11,0.2)" : c.border }}
                        style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "0.85rem 1rem", borderRadius: 12, border: "1px solid" }}>
                        <motion.div animate={{ background: i < genStep ? col : i === genStep ? "rgba(245,158,11,0.2)" : c.surface, scale: i === genStep ? [1, 1.15, 1] : 1 }} transition={{ repeat: i === genStep ? Infinity : 0, duration: 1 }}
                          style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {i < genStep ? <Check size={14} style={{ color: "#000" }} /> : i === genStep ? <Loader2 size={12} style={{ color: col }} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.textDim }} />}
                        </motion.div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: i <= genStep ? c.text : c.textDim, display: "flex", alignItems: "center", gap: 6 }}>
                            {i <= genStep && <span style={{ color: col }}>{step.icon}</span>} {step.label}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: i <= genStep ? c.textMuted : c.textDim, marginTop: 3, lineHeight: 1.5 }}>{step.desc}</div>
                        </div>
                        {i < genStep && <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />}
                      </motion.div>
                    ))}
                  </div>

                  {/* Bottom action */}
                  {genStep >= 4 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginTop: "1.5rem" }}>
                      <motion.button whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(245,158,11,0.25)" }} whileTap={{ scale: 0.98 }} onClick={() => setScreen(4)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0.65rem 1.5rem", borderRadius: 12, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none" }}>
                        Continue to Editor <ArrowRight size={16} />
                      </motion.button>
                    </motion.div>
                  )}
                </div>
              </div>
            )}

            {/* ─── SCREEN 4 — Editor ─── */}
            {screen === 4 && (
              <div className="h-full flex" style={{ flexDirection: "row" }}>
                {/* Editor panel - 40% */}
                <div style={{ width: "40%", borderRight: `1px solid ${c.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <div style={{ padding: "0.6rem 0.85rem", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <h3 style={{ fontSize: "0.68rem", fontWeight: 700, color: c.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      <Settings size={12} style={{ color: col }} /> Editor
                    </h3>
                    <div style={{ display: "flex", gap: 5 }}>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleSaveDraft} disabled={saving}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.3rem 0.6rem", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 7, color: col, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
                        <Save size={10} /> {saving ? "..." : "Save"}
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleAIOptimizeCompany} disabled={generatingAI}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.3rem 0.6rem", background: c.surface, border: `1px solid ${c.borderLight}`, borderRadius: 7, color: c.textSecondary, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
                        <Zap size={10} /> {generatingAI ? "..." : "Optimize"}
                      </motion.button>
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "0.65rem" }}>
                    {/* Summary */}
                    <div style={{ marginBottom: "0.65rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <h4 style={{ fontSize: "0.65rem", fontWeight: 700, color: c.textSecondary, margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>Professional Summary</h4>
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleAISummary} disabled={generatingAI} style={{ background: "none", border: "none", color: col, fontSize: "0.6rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}><Sparkles size={8} /> AI</motion.button>
                      </div>
                      <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Professional summary..."
                        style={{ ...inputSx, height: 60, resize: "vertical", fontSize: "0.72rem", padding: "0.4rem 0.6rem" }}
                      />
                    </div>

                    {/* Quick edit sections */}
                    {[
                      { label: "Experience", data: experience, setData: setExperience as (d: Array<Record<string, string>>) => void, fields: ["company", "role"] },
                      { label: "Projects", data: projects, setData: setProjects as (d: Array<Record<string, string>>) => void, fields: ["name", "techStack"] },
                      { label: "Education", data: education, setData: setEducation as (d: Array<Record<string, string>>) => void, fields: ["degree", "institution"] },
                    ].map((section) => (
                      <div key={section.label} style={{ marginBottom: "0.65rem" }}>
                        <h4 style={{ fontSize: "0.65rem", fontWeight: 700, color: c.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>{section.label}</h4>
                        {(section.data as Array<Record<string, string>>).map((item, idx) => (
                          <div key={idx} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: "0.45rem", marginBottom: 4 }}>
                            {section.fields.map((f) => (
                              <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={item[f] || ""}
                                onChange={e => { const u = [...section.data]; (u[idx] as Record<string, string>)[f] = e.target.value; section.setData(u); }}
                                style={{ ...inputSx, fontSize: "0.68rem", padding: "0.3rem 0.5rem", marginBottom: 3 }}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Skills */}
                    <div>
                      <h4 style={{ fontSize: "0.65rem", fontWeight: 700, color: c.textSecondary, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.03em" }}>Skills</h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {skills.map((s) => (
                          <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "0.2rem 0.45rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 12, fontSize: "0.62rem", color: c.textSecondary, fontWeight: 600 }}>
                            {s}
                            <button onClick={() => removeSkill(s)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0, fontSize: "0.75rem" }}>&times;</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview panel - 60% */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  {/* Toolbar */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0.85rem", borderBottom: `1px solid ${c.border}`, flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 700, color: c.textSecondary, display: "flex", alignItems: "center", gap: 5 }}>
                        <Eye size={13} style={{ color: col }} /> Live Preview
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ display: "flex", gap: 2, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 7, padding: 2 }}>
                        {(["desktop", "tablet", "mobile"] as const).map((d) => {
                          const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                          const isSel = previewDevice === d;
                          return (
                            <motion.button key={d} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setPreviewDevice(d)}
                              title={`${d.charAt(0).toUpperCase() + d.slice(1)} View`}
                              style={{ padding: "0.25rem 0.45rem", borderRadius: 5, border: "none", cursor: "pointer", background: isSel ? "rgba(245,158,11,0.2)" : "transparent", color: isSel ? col : c.textMuted, display: "flex" }}>
                              <Icon size={11} />
                            </motion.button>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 2, background: c.surface, border: `1px solid ${c.border}`, borderRadius: 7, padding: "2px 4px" }}>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setZoom(prev => Math.max(40, prev - 10))} style={{ background: "none", border: "none", cursor: "pointer", color: c.textMuted, padding: 3, display: "flex" }}><ZoomOut size={11} /></motion.button>
                        <span style={{ fontSize: "0.58rem", fontWeight: 700, color: c.textMuted, minWidth: 26, textAlign: "center" }}>{zoom}%</span>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setZoom(prev => Math.min(160, prev + 10))} style={{ background: "none", border: "none", cursor: "pointer", color: c.textMuted, padding: 3, display: "flex" }}><ZoomIn size={11} /></motion.button>
                      </div>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setChatOpen(true)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "0.3rem 0.6rem", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 7, color: col, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
                        <MessageCircle size={10} /> AI Chat
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => { const el = document.querySelector('.dash-main'); if (el) { el.classList.toggle('!overflow-hidden'); } }}
                        style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 7, padding: 5, cursor: "pointer", color: c.textSecondary, display: "flex" }}>
                        <Maximize2 size={12} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="flex-1" style={{ overflow: "auto", padding: "0.75rem", display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                    <div style={{ background: "#ffffff", color: "#1e293b", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", width: "100%", maxWidth: 595, minHeight: 842, transform: `scale(${zoom / 100})`, transformOrigin: "top center", overflow: "hidden", margin: "0 auto" }}>
                      <div style={{ padding: 36 }}>
                        <ResumePreviewTemplate personalInfo={personalInfo} summary={summary} education={education} experience={experience} projects={projects} skills={skills} certifications={certifications} achievements={achievements} languages={languages} template={setup.resumeStyle} />
                      </div>
                    </div>
                  </div>

                  {/* Bottom nav */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.85rem", borderTop: `1px solid ${c.border}`, flexShrink: 0 }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setScreen(2)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.4rem 0.9rem", borderRadius: 8, fontWeight: 600, fontSize: "0.75rem", cursor: "pointer", background: c.surface, border: `1px solid ${c.border}`, color: c.textSecondary }}>
                      <ChevronLeft size={13} /> Edit Info
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(245,158,11,0.25)" }} whileTap={{ scale: 0.98 }} onClick={() => setScreen(5)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.4rem 0.9rem", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none" }}>
                      Review & Export <ChevronRight size={13} />
                    </motion.button>
                  </motion.div>
                </div>
              </div>
            )}

            {/* ─── SCREEN 5 — Review ─── */}
            {screen === 5 && (
              <div className="h-full" style={{ padding: "1.5rem", overflowY: "auto" }}>
                <div style={{ maxWidth: 1000, margin: "0 auto" }}>
                  {/* Header */}
                  <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}
                      style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 0.75rem" }}>
                      <Check size={26} style={{ color: "#10b981" }} />
                    </motion.div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: c.text, margin: 0 }}>Resume Complete</h2>
                    <p style={{ fontSize: "0.82rem", color: c.textMuted, margin: "0.2rem 0 0" }}>Your AI-optimized ATS resume is ready to export</p>
                  </div>

                  {/* Two-column layout for details + export */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: "1rem" }}>
                    {/* Resume Details */}
                    <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "1.1rem" }}>
                      <h3 style={{ fontSize: "0.7rem", fontWeight: 700, color: c.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.75rem" }}>Resume Details</h3>
                      {[
                        { label: "Template", value: setup.resumeStyle },
                        { label: "Target Company", value: setup.company },
                        { label: "Target Profession", value: setup.profession },
                        { label: "Career Level", value: setup.careerLevel },
                      ].map((item) => (
                        <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: `1px solid ${c.border}`, fontSize: "0.78rem" }}>
                          <span style={{ color: c.textMuted, fontWeight: 600 }}>{item.label}</span>
                          <span style={{ color: c.text, fontWeight: 700 }}>{item.value}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", fontSize: "0.78rem" }}>
                        <span style={{ color: c.textMuted, fontWeight: 600 }}>Sections Included</span>
                        <span style={{ color: c.text, fontWeight: 700 }}>{[personalInfo.fullName && "Personal", summary && "Summary", experience.some(e => e.company) && "Experience", projects.some(p => p.name) && "Projects", education.some(e => e.institution) && "Education", skills.length && "Skills"].filter(Boolean).length} / 6</span>
                      </div>
                    </div>

                    {/* Export Options */}
                    <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, padding: "1.1rem" }}>
                      <h3 style={{ fontSize: "0.7rem", fontWeight: 700, color: c.textSecondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: 6 }}>
                        <Download size={14} style={{ color: col }} /> Export Options
                      </h3>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        {[
                          { type: "pdf" as const, label: "PDF", desc: "Download as PDF", color: col, bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
                          { type: "docx" as const, label: "DOCX", desc: "Word document", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
                          { type: "save" as const, label: "Save Draft", desc: "Save to account", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)" },
                        ].map((opt) => (
                          <motion.button key={opt.label} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                            onClick={() => { if (opt.type === "save") handleSaveDraft(); else if (opt.type === "pdf" || opt.type === "docx") handleExport(opt.type); }}
                            disabled={exporting !== null || saving}
                            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "1rem", borderRadius: 12, cursor: "pointer", background: opt.bg, border: `1px solid ${opt.border}` }}>
                            {opt.type === "save" ? <Save size={22} style={{ color: opt.color }} /> : <FileText size={22} style={{ color: opt.color }} />}
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: c.text }}>{exporting === opt.type || saving ? "..." : opt.label}</span>
                            <span style={{ fontSize: "0.58rem", color: c.textMuted }}>{opt.desc}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setScreen(4)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.55rem 1.2rem", borderRadius: 10, fontWeight: 600, fontSize: "0.78rem", cursor: "pointer", background: c.surface, border: `1px solid ${c.border}`, color: c.textSecondary }}>
                      <ChevronLeft size={14} /> Back to Editor
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02, boxShadow: "0 8px 20px rgba(245,158,11,0.25)" }} whileTap={{ scale: 0.98 }} onClick={() => setView("resume-hub")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0.55rem 1.2rem", borderRadius: 10, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", border: "none" }}>
                      Done <Check size={14} />
                    </motion.button>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── AI Chat Panel ─── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", justifyContent: "flex-end" }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChatOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{ width: "100%", maxWidth: 400, height: "100%", background: c.chatBg, borderLeft: `1px solid ${c.borderLight}`, position: "relative", zIndex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1rem", borderBottom: `1px solid ${c.borderLight}`, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Bot size={14} style={{ color: col }} />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: c.text }}>AI Assistant</span>
                    <span style={{ fontSize: "0.62rem", color: c.textMuted, display: "block" }}>Resume Optimization</span>
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => setChatOpen(false)}
                  style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 8, padding: 5, cursor: "pointer", color: c.textMuted, display: "flex" }}>
                  <X size={15} />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto" style={{ padding: "0.65rem" }}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3 }}><Bot size={36} style={{ color: col, margin: "0 auto 0.65rem", opacity: 0.5 }} /></motion.div>
                    <p style={{ fontSize: "0.8rem", color: c.textMuted, marginBottom: "0.85rem" }}>Ask AI to improve your resume</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
                      {CHAT_SUGGESTIONS.map((s) => (
                        <motion.button key={s} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleAIChat(s)}
                          style={{ padding: "0.35rem 0.65rem", background: c.surface, border: `1px solid ${c.border}`, borderRadius: 16, fontSize: "0.65rem", color: c.textSecondary, cursor: "pointer", fontWeight: 500 }}>
                          {s}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {chatMessages.map((msg, idx) => (
                      <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: "flex", gap: 6, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                        {msg.role === "ai" && <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}><Bot size={11} style={{ color: col }} /></div>}
                        <div style={{ maxWidth: "80%", padding: "0.6rem 0.8rem", borderRadius: 12, fontSize: "0.75rem", lineHeight: 1.5, background: msg.role === "user" ? "rgba(245,158,11,0.12)" : c.surface, border: `1px solid ${msg.role === "user" ? "rgba(245,158,11,0.2)" : c.border}`, color: c.text, whiteSpace: "pre-wrap" }}>
                          {msg.text || <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}>Thinking...</motion.span>}
                        </div>
                        {msg.role === "user" && <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(245,158,11,0.2)", border: "2px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}><User size={11} style={{ color: col }} /></div>}
                      </motion.div>
                    ))}
                    {chatLoading && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><Bot size={11} style={{ color: col }} /></div>
                        <div style={{ padding: "0.6rem 0.8rem", borderRadius: 12, background: c.surface, border: `1px solid ${c.border}` }}><Loader2 size={13} className="animate-spin" style={{ color: col }} /></div>
                      </motion.div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </div>

              <div style={{ padding: "0.65rem 0.85rem", borderTop: `1px solid ${c.borderLight}`, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAIChat()} placeholder="Ask AI to improve..." disabled={chatLoading}
                    style={{ flex: 1, ...inputSx, fontSize: "0.75rem", padding: "0.5rem 0.7rem" }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(245,158,11,0.08)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={() => handleAIChat()} disabled={chatLoading || !chatInput.trim()}
                    style={{ padding: "0.5rem 0.7rem", borderRadius: 8, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", color: "#000", cursor: "pointer", opacity: chatLoading || !chatInput.trim() ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Send size={15} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────
function CollapsibleSection({ title, icon, children, onAdd, t: c, color }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; onAdd?: () => void; t: ReturnType<typeof mkColors>; color: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.65rem 1rem", cursor: "pointer", userSelect: "none" }}>
        <h3 style={{ fontSize: "0.72rem", fontWeight: 700, color: c.text, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color }}>{icon}</span> {title}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {onAdd && (
            <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} onClick={(e) => { e.stopPropagation(); onAdd(); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "0.2rem 0.55rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 5, color, fontSize: "0.62rem", fontWeight: 700, cursor: "pointer" }}>
              <Plus size={10} /> Add
            </motion.button>
          )}
          <motion.div animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.12 }}><ChevronRight size={12} style={{ color: c.textMuted }} /></motion.div>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.12 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 1rem 0.85rem" }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Preview Template ─────────────────────────────────────────────────────────
function ResumePreviewTemplate({ personalInfo, summary, education, experience, projects, skills, certifications, achievements, languages, template }: {
  personalInfo: { fullName: string; email: string; phone: string; location: string; linkedin: string; github: string; portfolio: string }; summary: string; education: Array<Record<string, string>>; experience: Array<Record<string, string>>; projects: Array<Record<string, string>>;
  skills: string[]; certifications: Array<Record<string, string>>; achievements: string[]; languages: string[]; template: string;
}) {
  const isMinimal = template.includes("Minimal");
  const isDeveloper = template.includes("Developer");
  const isStudent = template.includes("Student");
  const isProfessional = template.includes("Professional");

  // ─── Color schemes per template ───
  const accentColor = isDeveloper ? "#d97706" : isStudent ? "#6366f1" : isProfessional ? "#1e40af" : "#1e293b";
  const sectionTitleColor = isDeveloper ? "#92400e" : isStudent ? "#4338ca" : isProfessional ? "#1e3a8a" : "#111827";
  const headerBg = isMinimal ? "transparent" : isDeveloper ? "rgba(245,158,11,0.04)" : isStudent ? "rgba(99,102,241,0.04)" : isProfessional ? "rgba(30,64,175,0.04)" : "transparent";
  const dividerColor = isDeveloper ? "rgba(217,119,6,0.25)" : isStudent ? "rgba(99,102,241,0.25)" : isProfessional ? "rgba(30,64,175,0.2)" : "#e5e7eb";

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      {!isMinimal && <div style={{ width: 3, height: 14, borderRadius: 2, background: accentColor, flexShrink: 0 }} />}
      <div style={{ fontSize: 9, fontWeight: 800, color: sectionTitleColor, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{children}</div>
      {isMinimal && <div style={{ flex: 1, height: 1, background: dividerColor }} />}
    </div>
  );

  return (
    <div style={{ fontSize: 10, color: "#1f2937", lineHeight: 1.5, fontFamily: isProfessional ? "Georgia, serif" : "system-ui, sans-serif" }}>
      {/* ─── Header ─── */}
      <div style={{ textAlign: isMinimal ? "left" : "center", padding: isMinimal ? "0 0 8px" : "8px 0", marginBottom: 8, borderBottom: isMinimal ? `1px solid ${dividerColor}` : `2px solid ${accentColor}`, background: headerBg, borderRadius: isMinimal ? 0 : 4 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: accentColor, letterSpacing: isMinimal ? "-0.01em" : "-0.02em" }}>{personalInfo.fullName || "Candidate Name"}</div>
        <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2, display: "flex", flexWrap: "wrap", justifyContent: isMinimal ? "flex-start" : "center", gap: 4 }}>
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span style={{ color: dividerColor }}>•</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span style={{ color: dividerColor }}>•</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
        </div>
        {(personalInfo.linkedin || personalInfo.github || personalInfo.portfolio) && (
          <div style={{ fontSize: 8.5, color: "#9ca3af", marginTop: 2, display: "flex", flexWrap: "wrap", justifyContent: isMinimal ? "flex-start" : "center", gap: 6 }}>
            {personalInfo.linkedin && <span>{personalInfo.linkedin}</span>}
            {personalInfo.github && <span>{personalInfo.github}</span>}
            {personalInfo.portfolio && <span>{personalInfo.portfolio}</span>}
          </div>
        )}
      </div>

      {/* ─── Summary ─── */}
      {summary && (
        <div style={{ marginBottom: 8 }}>
          <SectionTitle>Professional Summary</SectionTitle>
          <p style={{ fontSize: 9, color: "#374151", textAlign: "justify" }}>{summary}</p>
        </div>
      )}

      {/* ─── Experience ─── */}
      {experience.some((e) => e.role || e.company) && (
        <div style={{ marginBottom: 8 }}>
          <SectionTitle>Work Experience</SectionTitle>
          {experience.filter((e) => e.role || e.company).map((item, idx) => (
            <div key={idx} style={{ marginBottom: 6, paddingLeft: isMinimal ? 0 : 8, borderLeft: isMinimal ? "none" : `2px solid ${dividerColor}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#111827" }}>
                  {item.role || "Role"}
                  {item.company && <span style={{ fontWeight: 400, color: "#6b7280" }}> @ {item.company}</span>}
                </div>
                <div style={{ fontSize: 8, color: "#9ca3af", whiteSpace: "nowrap" }}>{item.startDate}{item.endDate ? ` — ${item.endDate}` : ""}</div>
              </div>
              {item.description && <p style={{ fontSize: 8.5, color: "#4b5563", marginTop: 2, whiteSpace: "pre-line" }}>{item.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ─── Projects ─── */}
      {projects.some((p) => p.name || p.techStack) && (
        <div style={{ marginBottom: 8 }}>
          <SectionTitle>Projects</SectionTitle>
          {projects.filter((p) => p.name || p.techStack).map((item, idx) => (
            <div key={idx} style={{ marginBottom: 4, paddingLeft: isMinimal ? 0 : 8, borderLeft: isMinimal ? "none" : `2px solid ${dividerColor}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#111827" }}>{item.name || "Project Title"}</div>
              {item.techStack && <div style={{ fontSize: 8, color: accentColor, fontStyle: "italic", marginTop: 1 }}>{item.techStack}</div>}
              {item.description && <p style={{ fontSize: 8.5, color: "#4b5563", marginTop: 2, whiteSpace: "pre-line" }}>{item.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* ─── Education ─── */}
      {education.some((e) => e.institution || e.degree) && (
        <div style={{ marginBottom: 8 }}>
          <SectionTitle>Education</SectionTitle>
          {education.filter((e) => e.institution || e.degree).map((item, idx) => (
            <div key={idx} style={{ marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#111827" }}>
                  {item.degree || "Degree"}{item.fieldOfStudy ? ` in ${item.fieldOfStudy}` : ""}
                </div>
                <div style={{ fontSize: 8, color: "#9ca3af", whiteSpace: "nowrap" }}>{item.startDate}{item.endDate ? ` — ${item.endDate}` : ""}</div>
              </div>
              {item.institution && <div style={{ fontSize: 8.5, color: "#6b7280" }}>{item.institution}</div>}
              {item.grade && <div style={{ fontSize: 8, color: "#9ca3af" }}>GPA: {item.grade}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ─── Skills ─── */}
      {skills.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <SectionTitle>Technical Skills</SectionTitle>
          {isDeveloper || isStudent ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {skills.filter(Boolean).map((s, i) => (
                <span key={i} style={{ fontSize: 8, padding: "2px 6px", borderRadius: 3, background: `${accentColor}10`, color: sectionTitleColor, border: `1px solid ${accentColor}20` }}>{s}</span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 9, color: "#374151" }}>{skills.filter(Boolean).join(" • ")}</p>
          )}
        </div>
      )}

      {/* ─── Certifications ─── */}
      {certifications.some((c) => c.name || c.issuer) && (
        <div style={{ marginBottom: 8 }}>
          <SectionTitle>Certifications</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, color: "#374151" }}>
            {certifications.filter((c) => c.name || c.issuer).map((c, idx) => (
              <li key={idx} style={{ marginBottom: 1 }}>
                {c.name}{c.issuer ? ` — ${c.issuer}` : ""}{c.date ? ` (${c.date})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ─── Achievements ─── */}
      {achievements.some((a) => a) && (
        <div style={{ marginBottom: 8 }}>
          <SectionTitle>Key Achievements</SectionTitle>
          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, color: "#374151" }}>
            {achievements.filter(Boolean).map((ach, idx) => <li key={idx} style={{ marginBottom: 1 }}>{ach}</li>)}
          </ul>
        </div>
      )}

      {/* ─── Languages ─── */}
      {languages.some((l) => l) && (
        <div style={{ marginBottom: 4 }}>
          <SectionTitle>Languages</SectionTitle>
          <p style={{ fontSize: 9, color: "#374151" }}>{languages.filter(Boolean).join(" • ")}</p>
        </div>
      )}
    </div>
  );
}

