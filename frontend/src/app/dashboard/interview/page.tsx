"use client";

import { useEffect, useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/services/api";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useUsageStore } from "@/store/usage-store";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { InterviewDomainSelector } from "@/components/interview-hub/shared/InterviewDomainSelector";
import {
  DashboardSidebar,
  DashboardTopNav,
  type AdyapanUser,
} from "@/components/dashboard-shell";
import { FloatingOrbs } from "@/components/ui/PremiumComponents";
import Link from "next/link";
import {
  Code, User, Sparkles, ChevronRight,
  BarChart3, ArrowLeft, Loader2, CheckCircle2,
  AlertTriangle, Crown
} from "lucide-react";
import { toast } from "sonner";

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
    route: "/dashboard/interview/technical",
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
    route: "/dashboard/interview/hr",
  },
  {
    id: "general" as const,
    title: "AI Interview Engine",
    subtitle: "Comprehensive role & domain simulation",
    description: "Multi-round simulated interview covering core technical skills, situational judgement, communication, and domain readiness.",
    icon: Sparkles,
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.2)",
    tags: ["Full-Spectrum", "Domain Ready", "Adaptive AI"],
    route: "/dashboard/interview/engine",
  },
];

function InterviewPageContent() {
  useRequireAuth("USER");

  const router = useRouter();
  const searchParams = useSearchParams();
  const completedSessionId = searchParams?.get("completed");
  const { isPremium } = useUserPlan();
  const openPremiumModal = useUsageStore((s) => s.openPremiumRequiredModal);

  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [selectedType, setSelectedType] = useState<"technical" | "behavioral" | "general" | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [completedSession, setCompletedSession] = useState<Record<string, unknown> | null>(null);

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

  useEffect(() => {
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    try {
      const rawUser = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {}

    api.get("/notifications?limit=5")
      .then(res => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.notifications?.filter((n: any) => !n.read).length || 0);
      })
      .catch(() => {});
  }, []);

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleViewTool = (tool: string) => {
    if (tool === "dashboard") {
      router.push("/dashboard/user");
      return;
    }
    if (tool === "settings") {
      router.push("/dashboard/user/settings/account");
      return;
    }
    if (tool === "support" || tool === "help-support" || tool === "help" || tool === "contact") {
      router.push("/dashboard/user/settings/help");
      return;
    }
    if (tool === "interview-technical" || tool === "technical-interview") {
      router.push("/dashboard/interview/technical");
      return;
    }
    if (tool === "interview-hr" || tool === "hr-interview") {
      router.push("/dashboard/interview/hr");
      return;
    }
    if (tool === "interview-engine") {
      router.push("/dashboard/interview/engine");
      return;
    }
    if (tool === "interview-hub" || tool === "interview") {
      router.push("/dashboard/interview");
      return;
    }
    router.push(`/dashboard/user?view=${tool}`);
  };

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
    if (!isPremium) {
      openPremiumModal({ code: "PREMIUM_REQUIRED" as any, featureKey: "mock-interview", requiredPlan: "premium", upgradeUrl: "/premium", upgrade: true });
      return;
    }
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

  return (
    <div
      suppressHydrationWarning
      className="relative overflow-hidden"
      style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}
    >
      <FloatingOrbs />

      {/* Top Navbar */}
      <DashboardTopNav
        user={user}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onViewProfile={() => router.push("/dashboard/user?view=profile")}
        onAdyChat={() => router.push("/dashboard/user?view=ady-chat")}
        onViewDashboard={() => router.push("/dashboard/user")}
        onViewTool={handleViewTool}
        onMenuToggle={() => setSidebarOpen(prev => !prev)}
        notifications={notifications}
        setNotifications={setNotifications}
        unreadCount={unreadCount}
        onMarkAllRead={() => {}}
        onClearAll={() => {}}
        onPremium={() => router.push("/premium")}
        onViewSettings={() => handleViewTool("settings")}
      />

      {/* Dashboard Sidebar */}
      <DashboardSidebar
        activeView="interview"
        onViewDashboard={() => router.push("/dashboard/user")}
        onViewTool={handleViewTool}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main Workspace within Dashboard Layout */}
      <main className="dash-main relative z-10 font-sans px-4 sm:px-6 md:px-8 py-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Completed session banner */}
          <AnimatePresence>
            {completedSession && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="p-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 flex items-center justify-between"
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
                  <Link
                    href="/dashboard/interview/analytics"
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors"
                  >
                    View Report
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clean Dashboard Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/5">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                <Sparkles size={12} className="animate-pulse" /> AI Interview Hub
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Choose Your Interview Practice
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Practice coding, system design, HR behavioral rounds, or full-domain simulated interviews with AI proctoring.
              </p>
            </div>
            <Link
              href="/dashboard/interview/analytics"
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-amber-500/30 bg-white/5 hover:bg-white/10 text-xs font-bold transition-all text-white/90 hover:text-white"
            >
              <BarChart3 size={15} className="text-amber-500" />
              <span>Interview Analytics</span>
            </Link>
          </div>

          {/* Cards & Config */}
          <AnimatePresence mode="wait">
            {!showConfig ? (
              <motion.div
                key="cards-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2"
              >
                {INTERVIEW_TYPES.map((type, i) => (
                  <motion.div
                    key={type.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => router.push(type.route)}
                    className="group p-6 rounded-2xl border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all relative overflow-hidden flex flex-col justify-between"
                    style={{ background: type.bg, borderColor: type.border }}
                  >
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: `radial-gradient(ellipse at top left, ${type.color}15, transparent 60%)` }}
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
                        <p className="text-[11px] text-white/60 mt-0.5">{type.subtitle}</p>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed">{type.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {type.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[9px] px-2 py-0.5 rounded-full font-bold border"
                            style={{ borderColor: `${type.color}30`, color: `${type.color}E6`, background: `${type.color}0D` }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="relative z-10 pt-4 flex items-center justify-between border-t border-white/5 mt-5">
                      <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: type.color }}>
                        Start Full Interview <ChevronRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTypeSelect(type.id);
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 hover:border-white/25 text-white/70 hover:text-white transition-colors"
                      >
                        Custom Setup
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* Custom Configuration Form */
              <motion.div
                key="config-form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="space-y-4 pt-2"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors text-white"
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Configure {INTERVIEW_TYPES.find(t => t.id === selectedType)?.title}
                    </h3>
                    <p className="text-xs text-white/40">Set your preferences to begin</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] space-y-5">
                    {/* Domain Selector */}
                    <div className="space-y-1.5 pb-2 border-b border-white/5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500" />
                        Select Domain / Field:
                      </label>
                      <InterviewDomainSelector
                        selectedRole={watch("role")}
                        onSelect={(d) => {
                          setValue("role", d.role);
                          if (d.tech) setValue("technology", d.tech);
                        }}
                        theme="dark"
                        showTechDetails={true}
                        maxHeight="max-h-36"
                      />
                    </div>

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
                          className="w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
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
                          className="w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
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
                          className="w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
                        >
                          {[15, 30, 45, 60].map(m => <option key={m} value={m}>{m} minutes</option>)}
                        </select>
                      </div>

                      {/* Language */}
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Language</label>
                        <select
                          {...register("language")}
                          className="w-full mt-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/40 cursor-pointer"
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
                          <><Sparkles size={15} /> Launch Interview Room {!isPremium && <span className="ml-1 text-[8px] bg-black/20 px-1.5 py-0.5 rounded-full font-black flex items-center gap-0.5"><Crown size={8} /> PRO</span>}</>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
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
