"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/services/api";
import {
  User, Code, Terminal, LayoutGrid, Users, Crown, GraduationCap,
  School, Briefcase, Sliders, Search, ChevronRight, ChevronLeft,
  ArrowRight, Play, History as HistoryIcon, BarChart3, Sparkles,
  Volume2, FileText, Clock, Flame, Target, Building2, Settings2,
  Loader2, Check, AlertTriangle, RotateCcw, Mic, MicOff, Zap,
  Brain, Code2, Server, Monitor, Layers, Cpu, FlaskConical,
  Container, Bug, Shield, Package, Globe,
} from "lucide-react";
import CompanyLogo from "../CompanyLogo";
import {
  EngineConfig,
  COMPANY_PRESETS,
  ROLE_PRESETS,
  INTERVIEW_TYPE_CONFIG,
  InterviewType,
  DifficultyLevel,
  ExperienceLevel,
} from "./EngineTypes";

interface EngineLandingProps {
  onStart: (config: EngineConfig) => void;
  onViewHistory: () => void;
  onViewAnalytics: () => void;
}

const ROLE_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Code2, Server, Monitor, Layers, Brain, Cpu, FlaskConical,
  Container, Bug, Shield, Package, BarChart3,
};

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; color: string; icon: string }[] = [
  { value: "easy", label: "Easy", color: "#10b981", icon: "🟢" },
  { value: "medium", label: "Medium", color: "#f59e0b", icon: "🟡" },
  { value: "hard", label: "Hard", color: "#ef4444", icon: "🔴" },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: "fresher", label: "Fresher", description: "0 years" },
  { value: "entry", label: "Entry", description: "0-2 years" },
  { value: "mid", label: "Mid", description: "3-5 years" },
  { value: "senior", label: "Senior", description: "6-10 years" },
  { value: "lead", label: "Lead", description: "10+ years" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

const configSchema = z.object({
  interviewType: z.string().min(1),
  targetRole: z.string().min(1),
  targetCompany: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  experienceLevel: z.enum(["fresher", "entry", "mid", "senior", "lead"]),
  durationMinutes: z.number().min(10).max(90),
  technology: z.string().optional(),
  language: z.enum(["english", "hindi"]),
  aiVoiceEnabled: z.boolean(),
  voiceGender: z.enum(["male", "female", "neutral"]),
  voiceSpeed: z.number().min(0.5).max(2),
  voicePitch: z.number().min(0.5).max(2),
  resumeAware: z.boolean(),
  customInstructions: z.string().optional(),
});

type ConfigFormData = z.infer<typeof configSchema>;

const pageVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const cardTap = { scale: 0.97 };
const cardHover = { scale: 1.015, y: -2 };

export default function EngineLanding({ onStart, onViewHistory, onViewAnalytics, theme: propTheme }: EngineLandingProps & { theme?: string }) {
  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const [step, setStep] = useState(0);
  const [stepDir, setStepDir] = useState(1);
  const [launching, setLaunching] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [customCompany, setCustomCompany] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [showCustomCompany, setShowCustomCompany] = useState(false);
  const [showCustomRole, setShowCustomRole] = useState(false);

  const [stats, setStats] = useState({ total: 0, avgScore: 0, bestScore: 0 });
  const [recentHistory, setRecentHistory] = useState<
    { id: string; type: string; score: number | null; date: string; role: string }[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<ConfigFormData>({
    defaultValues: {
      interviewType: "system-design",
      targetRole: "Software Engineer",
      targetCompany: "",
      difficulty: "medium",
      experienceLevel: "mid",
      durationMinutes: 30,
      technology: "",
      language: "english",
      aiVoiceEnabled: true,
      voiceGender: "neutral",
      voiceSpeed: 0.95,
      voicePitch: 1.0,
      resumeAware: true,
      customInstructions: "",
    },
  });

  const formValues = watch();

  const isDark = theme === "dark";
  const c = {
    bg: isDark ? "#080710" : "#f9fafb",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#f3f4f6",
    surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "#e5e7eb",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
    borderHover: isDark ? "rgba(255,255,255,0.15)" : "#d1d5db",
    text: isDark ? "#ffffff" : "#111827",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#4b5563",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
    primary: "#f59e0b",
    primaryDark: "#d97706",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
    greenBg: isDark ? "rgba(16,185,129,0.1)" : "#ecfdf5",
    amberBg: isDark ? "rgba(245,158,11,0.07)" : "#fffbeb",
    purple: "#8b5cf6",
  };

  const loadAnalytics = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/engine/analytics");
      if (res.data) {
        setStats({
          total: res.data.totalInterviews || 0,
          avgScore: res.data.averageScore || 0,
          bestScore: res.data.bestScore || 0,
        });
      }
    } catch { /* ignore */ }
    try {
      const histRes = await api.get("/engine/history");
      if (histRes.data) {
        setRecentHistory((histRes.data.sessions || []).slice(0, 6));
      }
    } catch { /* ignore */ }
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const goToStep = (next: number) => {
    setStepDir(next > step ? 1 : -1);
    setStep(next);
  };

  const onSubmit = (data: ConfigFormData) => {
    const config: EngineConfig = {
      interviewType: data.interviewType as InterviewType,
      targetRole: data.targetRole,
      targetCompany: data.targetCompany || "",
      difficulty: data.difficulty,
      experienceLevel: data.experienceLevel,
      durationMinutes: data.durationMinutes,
      technology: data.technology || "",
      language: data.language,
      aiVoiceEnabled: data.aiVoiceEnabled,
      voiceGender: data.voiceGender,
      voiceSpeed: data.voiceSpeed,
      voicePitch: data.voicePitch,
      resumeAware: data.resumeAware,
      customInstructions: data.customInstructions || "",
    };
    setLaunching(true);
    setTimeout(() => {
      toast.success("Interview configured! Launching...");
      onStart(config);
    }, 800);
  };

  const filteredCompanies = COMPANY_PRESETS.filter(co =>
    co.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredRoles = ROLE_PRESETS.filter(r =>
    r.title.toLowerCase().includes(roleSearch.toLowerCase()) ||
    r.category.toLowerCase().includes(roleSearch.toLowerCase())
  );

  const selectedTypeConfig = INTERVIEW_TYPE_CONFIG[formValues.interviewType as InterviewType];
  const selectedCompany = COMPANY_PRESETS.find(co => co.id === formValues.targetCompany);

  const STEP_TITLES = ["Interview Type", "Target & Role", "Configuration", "Review & Launch"];
  const STEP_ICONS = [Zap, Target, Settings2, Play];

  return (
    <div className="relative min-h-full overflow-hidden" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 -right-20 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
          animate={{ x: [0, -25, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)" }}
          animate={{ x: [0, 20, 0], y: [0, -25, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ═══ HERO ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl p-8 sm:p-10"
          style={{
            background: "linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(139,92,246,0.05) 50%, rgba(59,130,246,0.05) 100%)",
            border: "1px solid rgba(245,158,11,0.12)",
          }}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full uppercase tracking-wider">
                <Flame size={12} className="animate-pulse" /> AI Interview Engine
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                AI Interview Engine
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>
                Real AI. Real pressure. Real preparation.
              </p>
            </div>

            <div className="flex items-center gap-6">
              {[
                { label: "Total", value: stats.total, color: c.primary },
                { label: "Avg Score", value: `${stats.avgScore}%`, color: c.green },
                { label: "Best", value: `${stats.bestScore}%`, color: c.purple },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c.textMuted }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ═══ QUICK START CARDS ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: "Resume Last", icon: RotateCcw, color: c.textSec, onClick: () => toast.info("Resuming last interview...") },
            { label: "View Reports", icon: BarChart3, color: "#8b5cf6", onClick: onViewAnalytics },
          ].map(q => (
            <motion.button
              key={q.label}
              whileHover={cardHover}
              whileTap={cardTap}
              onClick={q.onClick}
              className="p-4 rounded-2xl border text-left transition-colors group"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <q.icon size={20} style={{ color: q.color }} className="mb-2 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold" style={{ color: c.text }}>{q.label}</div>
            </motion.button>
          ))}
        </motion.div>

        {/* ═══ STEP INDICATOR ═══ */}
        <div className="flex items-center justify-center gap-2">
          {STEP_TITLES.map((title, i) => {
            const Icon = STEP_ICONS[i];
            const active = i === step;
            const done = i < step;
            return (
              <button
                key={title}
                onClick={() => { if (done || active) goToStep(i); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  done || active ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
                }`}
                style={{
                  background: active ? "rgba(245,158,11,0.15)" : done ? c.greenBg : c.surface,
                  border: `1px solid ${active ? "rgba(245,158,11,0.3)" : done ? "rgba(16,185,129,0.2)" : c.border}`,
                  color: active ? c.primary : done ? c.green : c.textMuted,
                }}
              >
                {done ? <Check size={14} /> : <Icon size={14} />}
                <span className="hidden sm:inline">{title}</span>
              </button>
            );
          })}
        </div>

        {/* ═══ FORM ═══ */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait" custom={stepDir}>
            {/* ═══ STEP 1: INTERVIEW TYPE ═══ */}
            {step === 0 && (
              <motion.div
                key="step0"
                custom={stepDir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold flex items-center gap-2">
                    <Zap size={20} className="text-amber-500" /> Choose Interview Type
                  </h2>
                  <p className="text-xs" style={{ color: c.textSec }}>Select the type of interview you want to practice</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {(Object.keys(INTERVIEW_TYPE_CONFIG) as InterviewType[]).map(type => {
                    const cfg = INTERVIEW_TYPE_CONFIG[type];
                    const IconComp = (User || Code) as React.ComponentType<{ size?: number; className?: string }>;
                    const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
                      User, Code, Terminal, LayoutGrid, Users, Crown,
                      GraduationCap, School, Briefcase, Sliders,
                    };
                    const TypeIcon = iconMap[cfg.icon] || User;
                    const selected = formValues.interviewType === type;
                    return (
                      <motion.button
                        key={type}
                        type="button"
                        whileHover={cardHover}
                        whileTap={cardTap}
                        onClick={() => {
                          setValue("interviewType", type);
                          if (cfg.suggestedDuration) {
                            setValue("durationMinutes", cfg.suggestedDuration);
                          }
                        }}
                        className="p-4 rounded-2xl border text-left transition-all relative overflow-hidden group"
                        style={{
                          background: selected ? `${cfg.color}10` : c.cardBg,
                          borderColor: selected ? `${cfg.color}40` : c.border,
                        }}
                      >
                        {selected && (
                          <motion.div
                            layoutId="typeIndicator"
                            className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: cfg.color }}
                          >
                            <Check size={12} className="text-white" />
                          </motion.div>
                        )}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors"
                          style={{
                            background: selected ? `${cfg.color}20` : "rgba(255,255,255,0.04)",
                            border: `1px solid ${selected ? `${cfg.color}30` : "rgba(255,255,255,0.08)"}`,
                          }}
                        >
                          <TypeIcon size={18} style={{ color: cfg.color }} />
                        </div>
                        <div className="text-xs font-bold mb-1">{cfg.label}</div>
                        <div className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>{cfg.description}</div>
                        <div className="flex items-center gap-2 mt-2 text-[9px] font-bold" style={{ color: c.textMuted }}>
                          <Clock size={10} />
                          {cfg.suggestedDuration}m
                          <span className="ml-1 opacity-60">·</span>
                          <span>{cfg.difficultyRange.join(", ")}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(1)}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2"
                  >
                    Next <ArrowRight size={14} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 2: COMPANY & ROLE ═══ */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={stepDir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-8"
              >
                {/* Company Selection */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold flex items-center gap-2">
                      <Building2 size={20} className="text-amber-500" /> Target Company
                    </h2>
                    <p className="text-xs" style={{ color: c.textSec }}>Choose a company to tailor the interview questions</p>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                    <input
                      value={companySearch}
                      onChange={e => setCompanySearch(e.target.value)}
                      placeholder="Search companies..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {filteredCompanies.map(co => {
                      const selected = formValues.targetCompany === co.id && !showCustomCompany;
                      return (
                        <motion.button
                          key={co.id}
                          type="button"
                          whileHover={cardHover}
                          whileTap={cardTap}
                          onClick={() => {
                            setValue("targetCompany", co.id);
                            setShowCustomCompany(false);
                          }}
                          className="p-3 rounded-2xl border text-left transition-all"
                          style={{
                            background: selected ? `${co.color}10` : c.cardBg,
                            borderColor: selected ? `${co.color}40` : c.border,
                          }}
                        >
                          <CompanyLogo companyId={co.id} companyName={co.name} logo={co.logo} color={co.color} size={48} theme={theme} />
                          <div className="text-[11px] font-bold truncate">{co.name}</div>
                          <div className="text-[9px] capitalize mt-0.5" style={{ color: c.textMuted }}>{co.difficulty}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {co.focus.slice(0, 2).map(f => (
                              <span key={f} className="text-[8px] px-1.5 py-0.5 rounded-md font-bold"
                                style={{ background: "rgba(255,255,255,0.05)", color: c.textMuted }}>{f}</span>
                            ))}
                          </div>
                        </motion.button>
                      );
                    })}

                    {/* Custom Company */}
                    <motion.button
                      type="button"
                      whileHover={cardHover}
                      whileTap={cardTap}
                      onClick={() => {
                        setShowCustomCompany(true);
                        setValue("targetCompany", "");
                      }}
                      className="p-3 rounded-2xl border text-left transition-all border-dashed"
                      style={{
                        background: showCustomCompany ? "rgba(245,158,11,0.05)" : c.cardBg,
                        borderColor: showCustomCompany ? "rgba(245,158,11,0.3)" : c.border,
                      }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 border border-dashed"
                        style={{ borderColor: c.border }}>
                        <span className="text-lg" style={{ color: c.textMuted }}>+</span>
                      </div>
                      <div className="text-[11px] font-bold" style={{ color: c.textMuted }}>Custom Company</div>
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {showCustomCompany && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          value={customCompany}
                          onChange={e => {
                            setCustomCompany(e.target.value);
                            setValue("targetCompany", e.target.value);
                          }}
                          placeholder="Enter company name..."
                          autoFocus
                          className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                          style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Role Selection */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-extrabold flex items-center gap-2">
                      <Briefcase size={20} className="text-amber-500" /> Target Role
                    </h2>
                    <p className="text-xs" style={{ color: c.textSec }}>Select the role you are preparing for</p>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                    <input
                      value={roleSearch}
                      onChange={e => setRoleSearch(e.target.value)}
                      placeholder="Search roles..."
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                      style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredRoles.map(role => {
                      const selected = formValues.targetRole === role.title && !showCustomRole;
                      const RoleIcon = ROLE_ICON_MAP[role.icon] || Code2;
                      return (
                        <motion.button
                          key={role.id}
                          type="button"
                          whileHover={cardHover}
                          whileTap={cardTap}
                          onClick={() => {
                            setValue("targetRole", role.title);
                            setShowCustomRole(false);
                          }}
                          className="p-4 rounded-2xl border text-left transition-all"
                          style={{
                            background: selected ? "rgba(245,158,11,0.06)" : c.cardBg,
                            borderColor: selected ? "rgba(245,158,11,0.3)" : c.border,
                          }}
                        >
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                            style={{
                              background: selected ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${selected ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.08)"}`,
                            }}
                          >
                            <RoleIcon size={16} style={{ color: selected ? c.primary : c.textMuted }} />
                          </div>
                          <div className="text-[11px] font-bold">{role.title}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: c.textMuted }}>{role.category}</div>
                        </motion.button>
                      );
                    })}

                    {/* Custom Role */}
                    <motion.button
                      type="button"
                      whileHover={cardHover}
                      whileTap={cardTap}
                      onClick={() => {
                        setShowCustomRole(true);
                        setValue("targetRole", "");
                      }}
                      className="p-4 rounded-2xl border text-left transition-all border-dashed"
                      style={{
                        background: showCustomRole ? "rgba(245,158,11,0.05)" : c.cardBg,
                        borderColor: showCustomRole ? "rgba(245,158,11,0.3)" : c.border,
                      }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 border border-dashed"
                        style={{ borderColor: c.border }}>
                        <span className="text-lg" style={{ color: c.textMuted }}>+</span>
                      </div>
                      <div className="text-[11px] font-bold" style={{ color: c.textMuted }}>Custom Role</div>
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {showCustomRole && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          value={customRole}
                          onChange={e => {
                            setCustomRole(e.target.value);
                            setValue("targetRole", e.target.value);
                          }}
                          placeholder="Enter role title..."
                          autoFocus
                          className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                          style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex justify-between">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(0)}
                    className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2"
                    style={{ borderColor: c.border, color: c.textSec }}
                  >
                    <ChevronLeft size={14} /> Back
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(2)}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2"
                  >
                    Next <ArrowRight size={14} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 3: CONFIGURATION ═══ */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={stepDir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold flex items-center gap-2">
                    <Settings2 size={20} className="text-amber-500" /> Configure Settings
                  </h2>
                  <p className="text-xs" style={{ color: c.textSec }}>Fine-tune your interview parameters</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Difficulty */}
                    <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Difficulty</label>
                      <div className="flex gap-2">
                        {DIFFICULTY_OPTIONS.map(d => {
                          const selected = formValues.difficulty === d.value;
                          return (
                            <motion.button
                              key={d.value}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setValue("difficulty", d.value)}
                              className="flex-1 py-2.5 rounded-xl border text-xs font-bold text-center transition-all"
                              style={{
                                background: selected ? `${d.color}15` : c.surface,
                                borderColor: selected ? `${d.color}40` : c.border,
                                color: selected ? d.color : c.textSec,
                              }}
                            >
                              <span className="mr-1">{d.icon}</span> {d.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Experience Level */}
                    <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Experience Level</label>
                      <div className="flex gap-1.5">
                        {EXPERIENCE_OPTIONS.map(ex => {
                          const selected = formValues.experienceLevel === ex.value;
                          return (
                            <motion.button
                              key={ex.value}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setValue("experienceLevel", ex.value)}
                              className="flex-1 py-2 rounded-lg border text-center transition-all"
                              style={{
                                background: selected ? "rgba(245,158,11,0.1)" : c.surface,
                                borderColor: selected ? "rgba(245,158,11,0.3)" : c.border,
                              }}
                            >
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
                        {DURATION_OPTIONS.map(m => {
                          const selected = formValues.durationMinutes === m;
                          return (
                            <motion.button
                              key={m}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setValue("durationMinutes", m)}
                              className="px-4 py-2 rounded-xl border text-xs font-bold transition-all"
                              style={{
                                background: selected ? "rgba(245,158,11,0.1)" : c.surface,
                                borderColor: selected ? "rgba(245,158,11,0.3)" : c.border,
                                color: selected ? c.primary : c.textSec,
                              }}
                            >
                              <Clock size={11} className="inline mr-1" />{m}m
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Language */}
                    <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Language</label>
                      <div className="flex gap-2">
                        {(["english", "hindi"] as const).map(lang => {
                          const selected = formValues.language === lang;
                          return (
                            <motion.button
                              key={lang}
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setValue("language", lang)}
                              className="flex-1 py-2.5 rounded-xl border text-xs font-bold capitalize text-center transition-all flex items-center justify-center gap-1.5"
                              style={{
                                background: selected ? "rgba(245,158,11,0.1)" : c.surface,
                                borderColor: selected ? "rgba(245,158,11,0.3)" : c.border,
                                color: selected ? c.primary : c.textSec,
                              }}
                            >
                              <Globe size={13} /> {lang}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Technology (conditional) */}
                    {["system-design"].includes(formValues.interviewType) && (
                      <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Technology Stack</label>
                        <input
                          {...register("technology")}
                          placeholder="e.g., React, Node.js, Python, AWS..."
                          className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors"
                          style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                        />
                      </div>
                    )}

                    {/* AI Voice */}
                    <div className="p-5 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>AI Voice</label>
                        <button
                          type="button"
                          onClick={() => setValue("aiVoiceEnabled", !formValues.aiVoiceEnabled)}
                          className="relative w-11 h-6 rounded-full transition-colors"
                          style={{ background: formValues.aiVoiceEnabled ? "rgba(245,158,11,0.3)" : c.surface }}
                        >
                          <motion.div
                            className="absolute top-0.5 w-5 h-5 rounded-full"
                            style={{ background: formValues.aiVoiceEnabled ? c.primary : c.textMuted }}
                            animate={{ left: formValues.aiVoiceEnabled ? "22px" : "2px" }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      <AnimatePresence>
                        {formValues.aiVoiceEnabled && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 overflow-hidden"
                          >
                            {/* Voice Gender */}
                            <div>
                              <label className="text-[10px] font-bold" style={{ color: c.textMuted }}>Voice Gender</label>
                              <div className="flex gap-2 mt-1.5">
                                {(["male", "female", "neutral"] as const).map(g => {
                                  const selected = formValues.voiceGender === g;
                                  return (
                                    <motion.button
                                      key={g}
                                      type="button"
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => setValue("voiceGender", g)}
                                      className="flex-1 py-2 rounded-lg border text-[11px] font-bold capitalize transition-all"
                                      style={{
                                        background: selected ? "rgba(245,158,11,0.1)" : c.surface,
                                        borderColor: selected ? "rgba(245,158,11,0.3)" : c.border,
                                        color: selected ? c.primary : c.textSec,
                                      }}
                                    >
                                      {g === "male" ? "♂ Male" : g === "female" ? "♀ Female" : "⟐ Neutral"}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Voice Speed */}
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold" style={{ color: c.textMuted }}>Speed</label>
                                <span className="text-[10px] font-bold" style={{ color: c.primary }}>{formValues.voiceSpeed.toFixed(1)}x</span>
                              </div>
                              <input
                                type="range"
                                min={0.5}
                                max={2}
                                step={0.1}
                                value={formValues.voiceSpeed}
                                onChange={e => setValue("voiceSpeed", parseFloat(e.target.value))}
                                className="w-full mt-1 accent-amber-500 h-1"
                              />
                            </div>

                            {/* Voice Pitch */}
                            <div>
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold" style={{ color: c.textMuted }}>Pitch</label>
                                <span className="text-[10px] font-bold" style={{ color: c.primary }}>{formValues.voicePitch.toFixed(1)}</span>
                              </div>
                              <input
                                type="range"
                                min={0.5}
                                max={2}
                                step={0.1}
                                value={formValues.voicePitch}
                                onChange={e => setValue("voicePitch", parseFloat(e.target.value))}
                                className="w-full mt-1 accent-amber-500 h-1"
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Resume-Aware */}
                    <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Resume-Aware Mode</label>
                          <p className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>AI asks questions based on your resume</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setValue("resumeAware", !formValues.resumeAware)}
                          className="relative w-11 h-6 rounded-full transition-colors"
                          style={{ background: formValues.resumeAware ? "rgba(245,158,11,0.3)" : c.surface }}
                        >
                          <motion.div
                            className="absolute top-0.5 w-5 h-5 rounded-full"
                            style={{ background: formValues.resumeAware ? c.primary : c.textMuted }}
                            animate={{ left: formValues.resumeAware ? "22px" : "2px" }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Custom Instructions */}
                    <div className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Custom Instructions</label>
                      <textarea
                        {...register("customInstructions")}
                        placeholder="e.g., Focus on system design questions. Ask follow-ups. Be tough on edge cases..."
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                        style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(1)}
                    className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2"
                    style={{ borderColor: c.border, color: c.textSec }}
                  >
                    <ChevronLeft size={14} /> Back
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors flex items-center gap-2"
                  >
                    Review <ArrowRight size={14} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ═══ STEP 4: REVIEW & LAUNCH ═══ */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={stepDir}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="space-y-6"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-extrabold flex items-center gap-2">
                    <Play size={20} className="text-amber-500" /> Review & Launch
                  </h2>
                  <p className="text-xs" style={{ color: c.textSec }}>Confirm your settings before starting</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Summary Card */}
                  <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Interview Configuration</h3>

                    <div className="space-y-3">
                      {[
                        { label: "Type", value: selectedTypeConfig?.label, color: selectedTypeConfig?.color },
                        { label: "Role", value: formValues.targetRole },
                        { label: "Company", value: selectedCompany?.name || formValues.targetCompany || "Any" },
                        { label: "Difficulty", value: formValues.difficulty, color: DIFFICULTY_OPTIONS.find(d => d.value === formValues.difficulty)?.color },
                        { label: "Experience", value: formValues.experienceLevel },
                        { label: "Duration", value: `${formValues.durationMinutes} minutes` },
                        { label: "Language", value: formValues.language },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold" style={{ color: c.textMuted }}>{item.label}</span>
                          <span className="text-xs font-bold capitalize" style={{ color: item.color || c.text }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {formValues.technology && (
                      <div className="pt-2 border-t" style={{ borderColor: c.border }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: c.textMuted }}>Technologies</div>
                        <div className="flex flex-wrap gap-1.5">
                          {formValues.technology.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                            <span key={t} className="text-[10px] px-2 py-1 rounded-lg font-bold"
                              style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", border: "1px solid rgba(6,182,212,0.2)" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Features Card */}
                  <div className="p-6 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Features</h3>

                    <div className="space-y-2">
                      {[
                        { label: "AI Voice", enabled: formValues.aiVoiceEnabled, detail: formValues.aiVoiceEnabled ? `${formValues.voiceGender} · ${formValues.voiceSpeed.toFixed(1)}x speed` : null },
                        { label: "Resume-Aware Mode", enabled: formValues.resumeAware, detail: null },
                        { label: "Custom Instructions", enabled: !!formValues.customInstructions, detail: formValues.customInstructions || null },
                      ].map(f => (
                        <div key={f.label} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: f.enabled ? "rgba(16,185,129,0.06)" : c.surface, border: `1px solid ${f.enabled ? "rgba(16,185,129,0.15)" : c.border}` }}>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: f.enabled ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)" }}>
                              {f.enabled ? <Check size={10} className="text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.textMuted }} />}
                            </div>
                            <span className="text-xs font-bold">{f.label}</span>
                          </div>
                          {f.detail && <span className="text-[10px] font-bold capitalize" style={{ color: c.textMuted }}>{f.detail}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {errors.interviewType && (
                  <div className="flex items-center gap-2 p-3 rounded-xl text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: c.red }}>
                    <AlertTriangle size={14} /> Please select an interview type
                  </div>
                )}

                <div className="flex justify-between">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep(2)}
                    className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2"
                    style={{ borderColor: c.border, color: c.textSec }}
                  >
                    <ChevronLeft size={14} /> Back
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={launching}
                    whileHover={!launching ? { scale: 1.03 } : {}}
                    whileTap={!launching ? { scale: 0.97 } : {}}
                    className="px-8 py-3 rounded-xl bg-amber-500 text-black font-extrabold text-sm hover:bg-amber-400 transition-colors disabled:opacity-60 flex items-center gap-2 shadow-lg"
                    style={{ boxShadow: "0 0 30px rgba(245,158,11,0.25)" }}
                  >
                    {launching ? (
                      <><Loader2 size={16} className="animate-spin" /> Launching...</>
                    ) : (
                      <><Play size={16} /> Launch Interview</>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>

        {/* ═══ RECENT HISTORY ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <HistoryIcon size={16} className="text-amber-500" /> Recent History
            </h3>
            <button
              onClick={onViewHistory}
              className="text-[10px] font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border"
              style={{ borderColor: c.border, color: c.primary }}
            >
              View All <ChevronRight size={11} />
            </button>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-amber-500" />
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-2xl" style={{ borderColor: c.border }}>
              <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <span className="text-xs font-semibold" style={{ color: c.textMuted }}>No interviews yet. Start your first one!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentHistory.map((h) => {
                const scoreColor = (h.score ?? 0) >= 80 ? c.green : (h.score ?? 0) >= 60 ? c.primary : c.red;
                return (
                  <motion.div
                    key={h.id}
                    whileHover={{ scale: 1.01, y: -1 }}
                    className="p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all"
                    style={{ background: c.cardBg, borderColor: c.border }}
                    onClick={onViewAnalytics}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-xs font-bold truncate">{h.role || "Interview"}</div>
                      <div className="text-[10px] flex items-center gap-1.5" style={{ color: c.textSec }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: INTERVIEW_TYPE_CONFIG[h.type as InterviewType]?.color || c.textMuted }} />
                        {h.type} · <Clock size={9} /> {(() => {
                          const raw = (h as any).date || (h as any).createdAt;
                          if (!raw) return "Recent";
                          const d = new Date(raw);
                          return isNaN(d.getTime()) ? "Recent" : d.toLocaleDateString();
                        })()}
                      </div>
                    </div>
                    {h.score != null ? (
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-[11px] shrink-0"
                        style={{ background: `${scoreColor}15`, color: scoreColor }}
                      >
                        {h.score}%
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">In Progress</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
