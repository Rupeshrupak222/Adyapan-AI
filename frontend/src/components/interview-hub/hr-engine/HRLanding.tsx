"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Crown, Users, GraduationCap, Briefcase, Building2,
  Rocket, Target, Globe, Sliders, BookOpen, Search,
  ChevronRight, ChevronLeft, ArrowRight, Play, Flame,
  Clock, Settings2, Check, AlertTriangle, Loader2,
  MessageSquare, Shield, Brain, Heart, RefreshCw, Award, Scale,
  Zap, Mic, MicOff, Volume2, Star, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import {
  HRConfig, HRInterviewType, HRDifficultyLevel, HRExperienceLevel,
  HR_INTERVIEW_TYPES, HR_COMPANY_PRESETS, HR_BEHAVIORAL_TOPICS,
} from "./HRTypes";
import CompanyLogo from "../CompanyLogo";

interface HRLandingProps {
  onStart: (config: HRConfig) => void;
  onViewHistory: () => void;
  onViewAnalytics: () => void;
}

const HR_TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  GraduationCap, Building2, User, Briefcase, BookOpen, Crown,
  Rocket, Target, Sliders,
};

const DIFFICULTY_OPTIONS: { value: HRDifficultyLevel; label: string; color: string; icon: string }[] = [
  { value: "easy", label: "Easy", color: "#10b981", icon: "🟢" },
  { value: "medium", label: "Medium", color: "#f59e0b", icon: "🟡" },
  { value: "hard", label: "Hard", color: "#ef4444", icon: "🔴" },
];

const EXPERIENCE_OPTIONS: { value: HRExperienceLevel; label: string; description: string }[] = [
  { value: "fresher", label: "Fresher", description: "0 years" },
  { value: "entry", label: "Entry", description: "0-2 years" },
  { value: "mid", label: "Mid", description: "3-5 years" },
  { value: "senior", label: "Senior", description: "6-10 years" },
  { value: "lead", label: "Lead", description: "10+ years" },
];

const DURATION_OPTIONS = [15, 20, 25, 30, 45, 60];

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

export default function HRLanding({ onStart, onViewHistory, onViewAnalytics, theme: propTheme }: HRLandingProps & { theme?: string }) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [step, setStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);
  const [config, setConfig] = useState<HRConfig>({
    interviewType: "general_hr",
    targetRole: "Software Engineer",
    targetCompany: "",
    difficulty: "medium",
    experienceLevel: "mid",
    durationMinutes: 30,
    language: "english",
    aiVoiceEnabled: true,
    voiceGender: "neutral",
    voiceSpeed: 0.95,
    voicePitch: 1.0,
    resumeAware: true,
    customInstructions: "",
  });
  const [companySearch, setCompanySearch] = useState("");
  const [isCustomCompany, setIsCustomCompany] = useState(false);
  const [customCompanyName, setCustomCompanyName] = useState("");

  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f9fafb",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#111827",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#4b5563",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
    primary: "#f59e0b",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    greenBg: isDark ? "rgba(16,185,129,0.1)" : "#ecfdf5",
  };

  const goToStep = (next: number) => { setStepDir(next > step ? 1 : -1); setStep(next); };
  const updateConfig = (partial: Partial<HRConfig>) => setConfig((prev) => ({ ...prev, ...partial }));

  const filteredCompanies = HR_COMPANY_PRESETS.filter((co) =>
    co.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const selectedType = HR_INTERVIEW_TYPES[config.interviewType];
  const selectedCompany = HR_COMPANY_PRESETS.find((co) => co.id === config.targetCompany || co.name.toLowerCase() === config.targetCompany?.toLowerCase());

  const STEP_TITLES = ["Interview Type", "Company & Role", "Configure", "Review"];
  const STEP_ICONS = [Zap, Target, Settings2, Play];

  const handleLaunch = () => {
    toast.success("HR Interview configured! Launching...");
    onStart(config);
  };

  return (
    <div className="relative min-h-full overflow-hidden" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
          animate={{ x: [0, -25, 0], y: [0, 30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(139,92,246,0.05) 50%, rgba(59,130,246,0.05) 100%)", border: "1px solid rgba(245,158,11,0.12)" }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full uppercase tracking-wider">
                <Flame size={12} className="animate-pulse" /> AI HR Interview
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">AI HR Interview Engine</h1>
              <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>
                Practice behavioral interviews with an AI that understands your resume, asks personalized follow-ups, and evaluates using STAR methodology.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Practice STAR", icon: Star, color: "#f59e0b", onClick: () => updateConfig({ interviewType: "general_hr" }) },
            { label: "Leadership", icon: Crown, color: "#8b5cf6", onClick: () => updateConfig({ interviewType: "leadership_assessment" }) },
            { label: "Fresh Graduate", icon: GraduationCap, color: "#14b8a6", onClick: () => updateConfig({ interviewType: "fresh_graduate" }) },
            { label: "View Analytics", icon: BarChart3, color: "#3b82f6", onClick: onViewAnalytics },
          ].map((q) => (
            <motion.button key={q.label} whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.97 }}
              onClick={q.onClick}
              className="p-4 rounded-2xl border text-left transition-colors group"
              style={{ background: c.cardBg, borderColor: c.border }}>
              <q.icon size={20} style={{ color: q.color }} className="mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold">{q.label}</div>
            </motion.button>
          ))}
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEP_TITLES.map((title, i) => {
            const Icon = STEP_ICONS[i];
            const active = i === step;
            const done = i < step;
            return (
              <button key={title} onClick={() => { if (done || active) goToStep(i); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${done || active ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}
                style={{
                  background: active ? "rgba(245,158,11,0.15)" : done ? c.greenBg : c.surface,
                  border: `1px solid ${active ? "rgba(245,158,11,0.3)" : done ? "rgba(16,185,129,0.2)" : c.border}`,
                  color: active ? c.primary : done ? c.green : c.textMuted,
                }}>
                {done ? <Check size={14} /> : <Icon size={14} />}
                <span className="hidden sm:inline">{title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait" custom={stepDir}>
          {/* Step 1: Interview Type */}
          {step === 0 && (
            <motion.div key="step0" custom={stepDir} variants={pageVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold flex items-center gap-2"><Zap size={20} className="text-amber-500" /> Choose HR Interview Type</h2>
                <p className="text-xs" style={{ color: c.textSec }}>Select the type of HR interview you want to practice</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(Object.keys(HR_INTERVIEW_TYPES) as HRInterviewType[]).map((type) => {
                  const cfg = HR_INTERVIEW_TYPES[type];
                  const TypeIcon = HR_TYPE_ICONS[cfg.icon] || User;
                  const selected = config.interviewType === type;
                  return (
                    <motion.button key={type} type="button" whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.97 }}
                      onClick={() => { updateConfig({ interviewType: type, durationMinutes: cfg.suggestedDuration }); }}
                      className="p-4 rounded-2xl border text-left transition-all relative overflow-hidden group"
                      style={{ background: selected ? `${cfg.color}10` : c.cardBg, borderColor: selected ? `${cfg.color}40` : c.border }}>
                      {selected && (
                        <motion.div layoutId="hrTypeIndicator" className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: cfg.color }}>
                          <Check size={12} className="text-black" />
                        </motion.div>
                      )}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                        style={{ background: selected ? `${cfg.color}20` : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? `${cfg.color}30` : "rgba(255,255,255,0.08)"}` }}>
                        <TypeIcon size={18} style={{ color: cfg.color }} />
                      </div>
                      <div className="text-xs font-bold mb-1">{cfg.label}</div>
                      <div className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>{cfg.description}</div>
                      <div className="flex items-center gap-2 mt-2 text-[9px] font-bold" style={{ color: c.textMuted }}>
                        <Clock size={10} /> {cfg.suggestedDuration}m
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => goToStep(1)}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2">
                  Next <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Company & Role */}
          {step === 1 && (
            <motion.div key="step1" custom={stepDir} variants={pageVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }} className="space-y-8">
              {/* Company */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold flex items-center gap-2"><Building2 size={20} className="text-amber-500" /> Target Company</h2>
                  <p className="text-xs" style={{ color: c.textSec }}>Choose a company to tailor the interview style</p>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                  <input value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder="Search companies..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                    style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredCompanies.map((co) => {
                    const selected = !isCustomCompany && (config.targetCompany === co.id || config.targetCompany === co.name);
                    return (
                      <motion.button key={co.id} type="button" whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setIsCustomCompany(false);
                          updateConfig({ targetCompany: co.name });
                        }}
                        className="p-3 rounded-2xl border text-left transition-all"
                        style={{ background: selected ? `${co.color}10` : c.cardBg, borderColor: selected ? `${co.color}40` : c.border }}>
                        <CompanyLogo companyId={co.id} companyName={co.name} logo={co.logo} color={co.color} size={48} theme={theme} />
                        <div className="text-[11px] font-bold truncate">{co.name}</div>
                        <div className="text-[9px] mt-0.5" style={{ color: c.textMuted }}>{co.culture.slice(0, 30)}...</div>
                      </motion.button>
                    );
                  })}
                  <motion.button type="button" whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setIsCustomCompany(true);
                      const initialCustom = customCompanyName || config.targetCompany || "";
                      updateConfig({ targetCompany: initialCustom });
                    }}
                    className="p-3 rounded-2xl border text-left transition-all border-dashed"
                    style={{ background: isCustomCompany ? "rgba(245,158,11,0.08)" : c.cardBg, borderColor: isCustomCompany ? "rgba(245,158,11,0.4)" : c.border }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border border-dashed" style={{ borderColor: isCustomCompany ? "rgba(245,158,11,0.5)" : c.border }}>
                      <span className="text-lg font-bold" style={{ color: isCustomCompany ? c.primary : c.textMuted }}>+</span>
                    </div>
                    <div className="text-[11px] font-bold" style={{ color: isCustomCompany ? c.primary : c.textSec }}>Custom Company</div>
                  </motion.button>
                </div>

                {/* Custom Company Input */}
                {isCustomCompany && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl border space-y-2"
                    style={{ background: c.cardBg, borderColor: "rgba(245,158,11,0.2)" }}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold flex items-center gap-2" style={{ color: c.primary }}>
                        <Building2 size={14} /> Enter Custom Company Name
                      </label>
                      {config.targetCompany && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: "rgba(245,158,11,0.1)", color: c.primary }}>
                          Selected: {config.targetCompany}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={customCompanyName || config.targetCompany}
                      onChange={(e) => {
                        setCustomCompanyName(e.target.value);
                        updateConfig({ targetCompany: e.target.value });
                      }}
                      placeholder="e.g. Stripe, Netflix, Uber, Tesla, OpenAI, My Startup..."
                      className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      autoFocus
                    />
                  </motion.div>
                )}

                {/* Search fallback for custom company */}
                {filteredCompanies.length === 0 && companySearch.trim() && (
                  <div className="p-4 rounded-2xl border text-center space-y-2" style={{ background: c.cardBg, borderColor: c.border }}>
                    <p className="text-xs" style={{ color: c.textMuted }}>No preset company matching &quot;{companySearch}&quot;</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCompany(true);
                        setCustomCompanyName(companySearch.trim());
                        updateConfig({ targetCompany: companySearch.trim() });
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold hover:bg-amber-500/20 transition-colors"
                    >
                      + Set &quot;{companySearch.trim()}&quot; as Target Company
                    </button>
                  </div>
                )}
              </div>

              {/* Role */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold flex items-center gap-2"><Briefcase size={20} className="text-amber-500" /> Target Role</h2>
                </div>
                <input value={config.targetRole} onChange={(e) => updateConfig({ targetRole: e.target.value })}
                  placeholder="Enter your target role..."
                  className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                  style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
              </div>

              <div className="flex justify-between">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => goToStep(0)}
                  className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2" style={{ borderColor: c.border, color: c.textSec }}>
                  <ChevronLeft size={14} /> Back
                </motion.button>
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => goToStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2">
                  Next <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Configuration */}
          {step === 2 && (
            <motion.div key="step2" custom={stepDir} variants={pageVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold flex items-center gap-2"><Settings2 size={20} className="text-amber-500" /> Configure Settings</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Difficulty */}
                  <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Difficulty</label>
                    <div className="flex gap-2">
                      {DIFFICULTY_OPTIONS.map((d) => {
                        const selected = config.difficulty === d.value;
                        return (
                          <motion.button key={d.value} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => updateConfig({ difficulty: d.value })}
                            className="flex-1 py-2.5 rounded-xl border text-xs font-bold text-center transition-all"
                            style={{ background: selected ? `${d.color}15` : c.surface, borderColor: selected ? `${d.color}40` : c.border, color: selected ? d.color : c.textSec }}>
                            {d.icon} {d.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Experience */}
                  <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Experience Level</label>
                    <div className="flex gap-1.5">
                      {EXPERIENCE_OPTIONS.map((ex) => {
                        const selected = config.experienceLevel === ex.value;
                        return (
                          <motion.button key={ex.value} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => updateConfig({ experienceLevel: ex.value })}
                            className="flex-1 py-2 rounded-lg border text-center transition-all"
                            style={{ background: selected ? "rgba(245,158,11,0.1)" : c.surface, borderColor: selected ? "rgba(245,158,11,0.3)" : c.border }}>
                            <div className="text-[11px] font-bold" style={{ color: selected ? c.primary : c.text }}>{ex.label}</div>
                            <div className="text-[9px]" style={{ color: c.textMuted }}>{ex.description}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Duration</label>
                    <div className="flex gap-2 flex-wrap">
                      {DURATION_OPTIONS.map((m) => {
                        const selected = config.durationMinutes === m;
                        return (
                          <motion.button key={m} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => updateConfig({ durationMinutes: m })}
                            className="px-4 py-2 rounded-xl border text-xs font-bold transition-all"
                            style={{ background: selected ? "rgba(245,158,11,0.1)" : c.surface, borderColor: selected ? "rgba(245,158,11,0.3)" : c.border, color: selected ? c.primary : c.textSec }}>
                            <Clock size={11} className="inline mr-1" />{m}m
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* AI Voice */}
                  <div className="p-5 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>AI Voice</label>
                      <button type="button" onClick={() => updateConfig({ aiVoiceEnabled: !config.aiVoiceEnabled })}
                        className="relative w-11 h-6 rounded-full transition-colors"
                        style={{ background: config.aiVoiceEnabled ? "rgba(245,158,11,0.3)" : c.surface }}>
                        <motion.div className="absolute top-0.5 w-5 h-5 rounded-full"
                          style={{ background: config.aiVoiceEnabled ? c.primary : c.textMuted }}
                          animate={{ left: config.aiVoiceEnabled ? "22px" : "2px" }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </button>
                    </div>
                    {config.aiVoiceEnabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold" style={{ color: c.textMuted }}>Voice Gender</label>
                          <div className="flex gap-2 mt-1.5">
                            {(["male", "female", "neutral"] as const).map((g) => {
                              const selected = config.voiceGender === g;
                              return (
                                <motion.button key={g} type="button" whileTap={{ scale: 0.95 }}
                                  onClick={() => updateConfig({ voiceGender: g })}
                                  className="flex-1 py-2 rounded-lg border text-[11px] font-bold capitalize transition-all"
                                  style={{ background: selected ? "rgba(245,158,11,0.1)" : c.surface, borderColor: selected ? "rgba(245,158,11,0.3)" : c.border, color: selected ? c.primary : c.textSec }}>
                                  {g === "male" ? "♂ Male" : g === "female" ? "♀ Female" : "⟐ Neutral"}
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold" style={{ color: c.textMuted }}>Speed</label>
                            <span className="text-[10px] font-bold" style={{ color: c.primary }}>{config.voiceSpeed.toFixed(1)}x</span>
                          </div>
                          <input type="range" min={0.5} max={2} step={0.1} value={config.voiceSpeed}
                            onChange={(e) => updateConfig({ voiceSpeed: parseFloat(e.target.value) })}
                            className="w-full mt-1 accent-amber-500 h-1" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resume-Aware */}
                  <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Resume-Aware Mode</label>
                        <p className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>AI asks questions based on your resume</p>
                      </div>
                      <button type="button" onClick={() => updateConfig({ resumeAware: !config.resumeAware })}
                        className="relative w-11 h-6 rounded-full transition-colors"
                        style={{ background: config.resumeAware ? "rgba(245,158,11,0.3)" : c.surface }}>
                        <motion.div className="absolute top-0.5 w-5 h-5 rounded-full"
                          style={{ background: config.resumeAware ? c.primary : c.textMuted }}
                          animate={{ left: config.resumeAware ? "22px" : "2px" }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </button>
                    </div>
                  </div>

                  {/* Custom Instructions */}
                  <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Custom Instructions</label>
                    <textarea value={config.customInstructions} onChange={(e) => updateConfig({ customInstructions: e.target.value })}
                      placeholder="e.g., Focus on leadership questions. Be tough on follow-ups..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => goToStep(1)}
                  className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2" style={{ borderColor: c.border, color: c.textSec }}>
                  <ChevronLeft size={14} /> Back
                </motion.button>
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => goToStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2">
                  Review <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <motion.div key="step3" custom={stepDir} variants={pageVariants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.35, ease: "easeInOut" }} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold flex items-center gap-2"><Play size={20} className="text-amber-500" /> Review & Launch</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Interview Configuration</h3>
                  <div className="space-y-3">
                    {[
                      { label: "Type", value: selectedType?.label, color: selectedType?.color },
                      { label: "Role", value: config.targetRole },
                      { label: "Company", value: selectedCompany?.name || config.targetCompany || "General / Any Company" },
                      { label: "Difficulty", value: config.difficulty, color: DIFFICULTY_OPTIONS.find((d) => d.value === config.difficulty)?.color },
                      { label: "Experience", value: config.experienceLevel },
                      { label: "Duration", value: `${config.durationMinutes} minutes` },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold" style={{ color: c.textMuted }}>{item.label}</span>
                        <span className="text-xs font-bold capitalize" style={{ color: item.color || c.text }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Features</h3>
                  <div className="space-y-2">
                    {[
                      { label: "AI Voice", enabled: config.aiVoiceEnabled },
                      { label: "Resume-Aware Mode", enabled: config.resumeAware },
                      { label: "STAR Analysis", enabled: true },
                      { label: "Communication Analysis", enabled: true },
                      { label: "Competency Matrix", enabled: true },
                    ].map((f) => (
                      <div key={f.label} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: f.enabled ? "rgba(16,185,129,0.06)" : c.surface, border: `1px solid ${f.enabled ? "rgba(16,185,129,0.15)" : c.border}` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: f.enabled ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)" }}>
                            {f.enabled ? <Check size={10} className="text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.textMuted }} />}
                          </div>
                          <span className="text-xs font-bold">{f.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <motion.button type="button" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => goToStep(2)}
                  className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2" style={{ borderColor: c.border, color: c.textSec }}>
                  <ChevronLeft size={14} /> Back
                </motion.button>
                <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleLaunch}
                  className="px-8 py-3 rounded-xl bg-amber-500 text-black font-extrabold text-sm hover:bg-amber-400 transition-colors flex items-center gap-2 shadow-lg"
                  style={{ boxShadow: "0 0 30px rgba(245,158,11,0.25)" }}>
                  <Play size={16} /> Launch HR Interview
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
