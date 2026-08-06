"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/services/api";
import Link from "next/link";
import {
  Mic, Code, Briefcase, User, Sparkles, ChevronRight, History,
  BarChart3, ArrowLeft, Loader2, CheckCircle2, Flame, Award,
  Clock, Calendar, Star, TrendingUp, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const EngineView = dynamic(
  () => import("@/components/interview-hub/engine/EngineView").then(m => m.default),
  { ssr: false }
);

const HRView = dynamic(
  () => import("@/components/interview-hub/hr-engine/HRView").then(m => m.default),
  { ssr: false }
);

const TechnicalInterviewView = dynamic(
  () => import("@/components/interview-hub/technical-engine/TechnicalInterviewView").then(m => m.default),
  { ssr: false }
);

// ── SCHEMA ──────────────────────────────────────────────────
const interviewConfigSchema = z.object({
  role: z.string().min(2, "Role is required"),
  company: z.string().optional(),
  type: z.enum(["technical", "behavioral", "general"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  language: z.enum(["english", "hindi"]),
  durationMinutes: z.number().min(10).max(90),
  technology: z.string().optional(),
  experience: z.enum(["entry", "mid", "senior"]),
  aiVoiceEnabled: z.boolean(),
  videoEnabled: z.boolean(),
});

type InterviewConfig = z.infer<typeof interviewConfigSchema>;

interface SessionSummary {
  id: string;
  role: string;
  company?: string;
  type: string;
  difficulty: string;
  status: string;
  evaluation?: { overallScore: number };
  createdAt: string;
}

const INTERVIEW_TYPES = [
  {
    id: "technical" as const,
    title: "Technical Interview",
    subtitle: "Coding, system design & architecture",
    description: "Deep-dive into algorithms, data structures, system design, and technical problem-solving. Best for software engineering roles.",
    icon: Code,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.2)",
    tags: ["Algorithms", "System Design", "Code Review"],
  },
  {
    id: "behavioral" as const,
    title: "HR Interview",
    subtitle: "STAR method, leadership & culture fit",
    description: "Behavioral questions using STAR method, cultural fit assessment, leadership scenarios, and teamwork evaluation.",
    icon: User,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.2)",
    tags: ["STAR Method", "Leadership", "Culture Fit"],
  },
];

import { Suspense } from "react";

function InterviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completedSessionId = searchParams?.get("completed");
  const rawTab = searchParams?.get("tab") || searchParams?.get("type") || searchParams?.get("view") || "general";
  const activeTab = rawTab === "engine" || rawTab === "interview-engine" ? "engine"
    : rawTab === "hr" || rawTab === "interview-hr" || rawTab === "behavioral" ? "hr"
    : rawTab === "technical" || rawTab === "interview-technical" ? "technical"
    : "general";

  const [selectedType, setSelectedType] = useState<"technical" | "behavioral" | "general" | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [completedSession, setCompletedSession] = useState<Record<string, unknown> | null>(null);

  const orbs = useRef([
    { x: "10%", y: "20%", size: 300, color: "rgba(245,158,11,0.06)", delay: 0 },
    { x: "80%", y: "15%", size: 200, color: "rgba(6,182,212,0.05)", delay: 1 },
    { x: "60%", y: "70%", size: 250, color: "rgba(16,185,129,0.04)", delay: 2 },
  ]).current;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<InterviewConfig>({
    resolver: zodResolver(interviewConfigSchema),
    defaultValues: {
      role: "Software Engineer",
      company: "",
      type: "technical",
      difficulty: "medium",
      language: "english",
      durationMinutes: 30,
      technology: "",
      experience: "mid",
      aiVoiceEnabled: true,
      videoEnabled: true,
    },
  });

  const watchType = watch("type");

  // Recent history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["interview-history"],
    queryFn: async () => {
      const res = await api.get("/interview/history");
      return res.data.sessions as SessionSummary[];
    },
  });

  // Load completed session if redirected from room
  useEffect(() => {
    if (!completedSessionId) return;
    api.get(`/interview/${completedSessionId}`)
      .then(res => { if (res.data.success) setCompletedSession(res.data.session); })
      .catch(() => {});
  }, [completedSessionId]);

  const handleTypeSelect = (type: "technical" | "behavioral" | "general") => {
    setSelectedType(type);
    setValue("type", type);
    setShowConfig(true);
  };

  const onSubmit = async (data: InterviewConfig) => {
    setLaunching(true);
    try {
      const res = await api.post("/interview/start", {
        role: data.role,
        company: data.company?.trim() || null,
        type: data.type,
        difficulty: data.difficulty,
        language: data.language,
        durationMinutes: data.durationMinutes,
        technology: data.technology?.trim() || null,
        aiVoiceEnabled: data.aiVoiceEnabled,
        videoEnabled: data.videoEnabled,
      });

      if (res.data.success) {
        const sessionId = res.data.session.id;
        // Accept rules first (skip individual steps for streamlined flow)
        await api.post(`/interview/${sessionId}/accept-rules`);
        toast.success("Interview room ready! Launching...");
        router.push(`/dashboard/interview/room/${sessionId}`);
      }
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(errorMsg || "Failed to start interview");
    } finally {
      setLaunching(false);
    }
  };

  const completedSessions = (history || []).filter(s => s.evaluation?.overallScore);
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((acc, s) => acc + (s.evaluation?.overallScore || 0), 0) / completedSessions.length)
    : null;

  const scoreColor = (score: number) => score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen bg-[#080710] text-white relative overflow-x-hidden" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Animated background orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{ left: orb.x, top: orb.y, width: orb.size, height: orb.size, background: orb.color, filter: "blur(80px)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 6 + orb.delay, repeat: Infinity, ease: "easeInOut", delay: orb.delay }}
        />
      ))}

      {/* Header */}
      <div className="relative z-10 border-b border-white/8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/user" className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-black">AI Interview Hub</h1>
              <p className="text-xs text-white/40">Practice with AI. Get hired faster.</p>
            </div>
          </div>
          <Link
            href="/dashboard/interview/analytics"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs font-bold text-white/60 hover:bg-white/5 hover:text-white transition-all"
          >
            <BarChart3 size={13} /> Analytics
          </Link>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Navigation Tabs with Query Strings */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 pb-4">
          {[
            { id: "engine", label: "Interview Engine", href: "/dashboard/interview?tab=engine" },
            { id: "hr", label: "AI HR Interview", href: "/dashboard/interview?tab=hr" },
            { id: "technical", label: "AI Technical Interview", href: "/dashboard/interview?tab=technical" },
            { id: "general", label: "Interview Launcher", href: "/dashboard/interview?tab=general" },
          ].map((tabItem) => {
            const isActive = activeTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                onClick={() => router.push(tabItem.href)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  isActive
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {tabItem.label}
              </button>
            );
          })}
        </div>

        {activeTab === "engine" ? (
          <EngineView theme="dark" />
        ) : activeTab === "hr" ? (
          <HRView theme="dark" />
        ) : activeTab === "technical" ? (
          <TechnicalInterviewView theme="dark" />
        ) : (
          <>
        {/* Completed session banner */}
        <AnimatePresence>
          {completedSession && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-400">Interview Completed!</h3>
                  <p className="text-xs text-white/50 mt-0.5">
                    {(completedSession as any).role} interview finished
                    {(completedSession as any).evaluation?.overallScore
                      ? ` — Score: ${(completedSession as any).evaluation?.overallScore}%`
                      : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(completedSession as any).evaluation?.overallScore && (
                  <button
                    onClick={async () => {
                      const { generateInterviewPDF } = await import("@/utils/interview-pdf");
                      generateInterviewPDF({
                        sessionId: (completedSession as any).id,
                        role: (completedSession as any).role,
                        type: (completedSession as any).type,
                        difficulty: (completedSession as any).difficulty,
                        language: "english",
                        durationMinutes: 30,
                        createdAt: (completedSession as any).createdAt,
                        evaluation: (completedSession as any).evaluation,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors"
                  >
                    Download PDF
                  </button>
                )}
                <Link
                  href="/dashboard/interview/analytics"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-[10px] font-bold hover:bg-emerald-400 transition-colors"
                >
                  View Full Report
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero / Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Hero banner */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-3 relative overflow-hidden p-7 rounded-3xl border border-amber-500/15 bg-gradient-to-br from-amber-500/10 via-orange-500/4 to-transparent"
          >
            <div className="relative z-10 space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/12 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-widest border border-amber-500/20">
                <Flame size={11} className="animate-pulse" /> AI-Powered Interview Coach
              </div>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight">
                Practice Like It&apos;s The{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                  Real Thing
                </span>
              </h2>
              <p className="text-sm text-white/50 leading-relaxed">
                Get grilled by our AI interviewer, receive instant evaluation, and download your performance report — all for free.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["Live webcam proctoring", "Voice & text answers", "Code editor", "PDF reports"].map(f => (
                  <span key={f} className="text-[10px] px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50">{f}</span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Stats card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-3xl border border-white/8 bg-white/3 flex flex-col justify-between"
          >
            {historyLoading ? (
              <div className="flex items-center justify-center h-full py-6">
                <Loader2 size={20} className="animate-spin text-amber-500" />
              </div>
            ) : (
              <>
                <div>
                  <div className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Your Stats</div>
                  <div className="text-3xl font-black text-amber-400">{history?.length ?? 0}</div>
                  <div className="text-xs text-white/40">total interviews</div>
                </div>
                {avgScore !== null && (
                  <div className="mt-4">
                    <div className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-1">Avg Score</div>
                    <div className="text-2xl font-black" style={{ color: scoreColor(avgScore) }}>{avgScore}%</div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${avgScore}%`, background: scoreColor(avgScore) }} />
                    </div>
                  </div>
                )}
                <Link
                  href="/dashboard/interview/analytics"
                  className="mt-4 text-[10px] text-amber-500 font-bold flex items-center gap-1 hover:gap-2 transition-all"
                >
                  View Analytics <ChevronRight size={11} />
                </Link>
              </>
            )}
          </motion.div>
        </div>

        {/* Interview type cards */}
        <AnimatePresence mode="wait">
          {!showConfig ? (
            <motion.div
              key="type-select"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold">Choose Interview Type</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {INTERVIEW_TYPES.map((type, i) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => handleTypeSelect(type.id)}
                    className="group p-6 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden"
                    style={{ background: type.bg, borderColor: type.border }}
                  >
                    {/* Hover shimmer */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(ellipse at top left, ${type.color}10, transparent 60%)` }}
                    />
                    <div className="relative z-10 space-y-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110"
                        style={{ background: `${type.color}15`, borderColor: `${type.color}30` }}
                      >
                        <type.icon size={22} style={{ color: type.color }} />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base" style={{ color: type.color }}>{type.title}</h3>
                        <p className="text-[11px] text-white/40 mt-0.5">{type.subtitle}</p>
                      </div>
                      <p className="text-xs text-white/55 leading-relaxed">{type.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {type.tags.map(tag => (
                          <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full font-bold border" style={{ borderColor: `${type.color}30`, color: `${type.color}CC`, background: `${type.color}0A` }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold pt-1" style={{ color: type.color }}>
                        Configure & Start <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Configuration Form */
            <motion.div
              key="config-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfig(false)}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft size={15} />
                </button>
                <div>
                  <h3 className="text-base font-bold">
                    Configure {INTERVIEW_TYPES.find(t => t.id === selectedType)?.title}
                  </h3>
                  <p className="text-xs text-white/40">Set your preferences to begin</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="p-6 rounded-2xl border border-white/8 bg-white/3 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Role */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Job Role *</label>
                      <input
                        {...register("role")}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors"
                        placeholder="e.g. Software Engineer"
                      />
                      {errors.role && <p className="text-[9px] text-red-400 mt-1">{errors.role.message}</p>}
                    </div>

                    {/* Company */}
                    {watchType !== "behavioral" && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Target Company</label>
                        <input
                          {...register("company")}
                          className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors"
                          placeholder="Google, Microsoft, etc."
                        />
                      </div>
                    )}

                    {/* Technology (technical only) */}
                    {watchType === "technical" && (
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Technology Stack</label>
                        <input
                          {...register("technology")}
                          className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-amber-500/40 transition-colors"
                          placeholder="React, Node.js, Python..."
                        />
                      </div>
                    )}

                    {/* Difficulty */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Difficulty</label>
                      <select
                        {...register("difficulty")}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>

                    {/* Experience */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Experience Level</label>
                      <select
                        {...register("experience")}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
                      >
                        <option value="entry">Entry Level</option>
                        <option value="mid">Mid Level</option>
                        <option value="senior">Senior</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Duration</label>
                      <select
                        {...register("durationMinutes", { valueAsNumber: true })}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
                      >
                        {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                      </select>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Language</label>
                      <select
                        {...register("language")}
                        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
                      >
                        <option value="english">English</option>
                        <option value="hindi">Hindi</option>
                      </select>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        onClick={() => setValue("aiVoiceEnabled", !watch("aiVoiceEnabled"))}
                        className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${watch("aiVoiceEnabled") ? "bg-amber-500" : "bg-white/10"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${watch("aiVoiceEnabled") ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs text-white/60">AI Voice Enabled</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <div
                        onClick={() => setValue("videoEnabled", !watch("videoEnabled"))}
                        className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${watch("videoEnabled") ? "bg-amber-500" : "bg-white/10"}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${watch("videoEnabled") ? "translate-x-5" : "translate-x-0.5"}`} />
                      </div>
                      <span className="text-xs text-white/60">Video Interview</span>
                    </label>
                  </div>

                  {/* Notice */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                    <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-400/80 leading-relaxed">
                      The interview room uses your camera and microphone for proctoring. AI will monitor for violations like tab switching and multiple faces. By starting, you consent to this.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowConfig(false)}
                      className="px-5 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white/50 hover:bg-white/5 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={launching}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {launching ? (
                        <><Loader2 size={15} className="animate-spin" /> Launching Interview Room...</>
                      ) : (
                        <><Sparkles size={15} /> Launch Interview Room</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent history */}
        {!showConfig && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={15} className="text-amber-500" />
                <h3 className="text-sm font-bold">Recent Interviews</h3>
              </div>
              <Link href="/dashboard/interview/analytics" className="text-[10px] text-amber-500 font-bold hover:text-amber-400 transition-colors flex items-center gap-1">
                View All <ChevronRight size={11} />
              </Link>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={20} className="animate-spin text-amber-500" />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                <Mic className="w-8 h-8 mx-auto mb-2 text-white/15" />
                <p className="text-sm text-white/25">No interviews yet. Start your first one above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {history.slice(0, 6).map(session => (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl border border-white/8 bg-white/3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/interview/analytics`)}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="text-xs font-bold truncate">{session.role}{session.company && ` @ ${session.company}`}</div>
                      <div className="text-[10px] text-white/40 capitalize mt-0.5 flex items-center gap-1.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: session.type === "technical" ? "#06b6d4" : session.type === "behavioral" ? "#f59e0b" : "#10b981" }} />
                        {session.type} · {session.difficulty}
                      </div>
                      <div className="text-[9px] text-white/25 mt-0.5 flex items-center gap-1">
                        <Calendar size={9} />
                        {new Date(session.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </div>
                    </div>
                    {session.evaluation?.overallScore ? (
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-[11px] shrink-0"
                        style={{ background: `${scoreColor(session.evaluation.overallScore)}20`, color: scoreColor(session.evaluation.overallScore) }}
                      >
                        {session.evaluation.overallScore}%
                      </div>
                    ) : (
                      <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                        {session.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080710] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    }>
      <InterviewPageContent />
    </Suspense>
  );
}
