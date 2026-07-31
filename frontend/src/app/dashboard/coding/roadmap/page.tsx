"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Code2, Play, Sparkles, Trophy, Clock, RefreshCw, X, ChevronRight,
  HelpCircle, ExternalLink, Check, Award, ChevronDown, CheckCircle2,
  BookOpen, Star, AlertCircle, ShieldAlert, BrainCircuit, Target,
  GraduationCap, Briefcase, Compass, Flame, Zap, BarChart3, Lightbulb,
  ArrowRight, Map, Route
} from "lucide-react";
import {
  FloatingOrbs,
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumProgressBar
} from "@/components/ui/PremiumComponents";
import {
  CodingEmptyState,
  codingFadeUp
} from "@/components/coding-hub/CodingHubShared";
import {
  DashboardSidebar,
  DashboardTopNav,
  AdyapanUser
} from "../../user/page";
import { useConfirm } from "@/components/ui/ConfirmModal";

const FALLBACK_TOPICS = [
  "Arrays", "Strings", "Hashing", "Linked Lists", "Stacks", "Queues",
  "Trees", "BST", "Heaps", "Recursion", "Backtracking",
  "Greedy", "Dynamic Programming", "Graphs", "Tries", "Sliding Window",
  "Two Pointers", "Bit Manipulation", "Binary Search"
];

const LOADING_STEPS = [
  "Analyzing Coding History",
  "Evaluating Skill Level",
  "Detecting Weak Topics",
  "Generating Roadmap",
  "Building Timeline",
  "Preparing Recommendations",
  "Roadmap Ready!"
];

function TypewriterText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    let idx = 0;
    setDisplayed("");
    if (!text) return;
    const interval = setInterval(() => {
      if (idx < text.length) {
        setDisplayed(prev => prev + text.charAt(idx));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <>{displayed}<span className="inline-block w-0.5 h-3 bg-amber-500 ml-0.5 animate-pulse" /></>;
}

function TopicLibraryCard({ topics, topicProgress }: { topics: string[]; topicProgress: Record<string, number> }) {
  return (
    <PremiumCard variant="glass" className="p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <Map className="w-5 h-5 text-amber-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Topic Library</h3>
        <span className="text-xxs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold">{topics.length}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {topics.map(topic => {
          const pct = topicProgress[topic] || 0;
          const done = pct >= 100;
          const active = pct > 0 && pct < 100;
          return (
            <div key={topic} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xxs font-semibold transition-all"
              style={{
                background: done ? "rgba(34,197,94,0.08)" : active ? "rgba(245,158,11,0.08)" : "var(--bg-card)",
                border: `1px solid ${done ? "rgba(34,197,94,0.2)" : active ? "rgba(245,158,11,0.2)" : "var(--border-color)"}`,
                color: done ? "#4ade80" : active ? "#fbbf24" : "var(--text-secondary)"
              }}
            >
              {done ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : active ? <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin flex-shrink-0" /> : <div className="w-3 h-3 rounded-full border flex-shrink-0" style={{ borderColor: "var(--border-color)" }} />}
              <span className="truncate">{topic}</span>
              {pct > 0 && <span className="ml-auto text-xxs opacity-60">{pct}%</span>}
            </div>
          );
        })}
      </div>
    </PremiumCard>
  );
}

export default function CodingRoadmapPage() {
  useRequireAuth("USER");

  const router = useRouter();
  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>({
    placementReadiness: 0,
    interviewReadiness: 0,
    stats: { solvedCount: 0, challengesCompleted: 0, avgComplexity: 0, avgReview: 0, topicCoverage: 0 }
  });
  const [recommendations, setRecommendations] = useState<any>(null);
  const [streakData, setStreakData] = useState<any>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const [formData, setFormData] = useState({
    skillLevel: "Intermediate",
    targetRole: "SDE-1",
    targetCompany: "FAANG",
    dailyStudyTime: "2 hours",
    targetTimeline: 8,
    preferredLanguage: "C++"
  });

  const [confirm, confirmModal] = useConfirm();
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true });

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

    fetchData();
  }, []);

  const handleThemeToggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }, [theme]);

  const handleViewProfile = () => router.push("/profile");
  const handlePremium = () => router.push("/premium");
  const handleViewDashboard = () => router.push("/dashboard/user");
  const handleAdyChat = () => {
    localStorage.setItem("dashboard-active-view", "ady-chat");
    router.push("/dashboard/user");
  };
  const handleViewTool = (tool: string) => {
    if (tool === "dsa-practice") router.push("/dashboard/coding");
    else { localStorage.setItem("dashboard-active-view", tool); router.push("/dashboard/user"); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const roadmapRes = await api.get("/coding/roadmap");
      if (roadmapRes.data.roadmap) {
        setRoadmap(roadmapRes.data.roadmap);

        const [readinessRes, recRes, streakRes] = await Promise.all([
          api.get("/coding/roadmap/readiness"),
          api.get("/coding/roadmap/recommendations"),
          api.get("/streak/dashboard").catch(() => ({ data: { data: null } }))
        ]);
        setReadiness(readinessRes.data.readiness);
        setRecommendations(recRes.data.recommendations);
        setStreakData(streakRes.data?.data || streakRes.data?.streak || null);
      }
    } catch (err) {
      console.error("Failed to load roadmap data", err);
      toast.error("Could not fetch roadmap details");
    } finally {
      setLoading(false);
    }
  };

  const triggerGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setLoadingStepIdx(0);

    const stepInterval = setInterval(() => {
      setLoadingStepIdx((prev) => prev < LOADING_STEPS.length - 2 ? prev + 1 : prev);
    }, 700);

    try {
      const res = await api.post("/coding/roadmap/generate", formData);

      clearInterval(stepInterval);
      setLoadingStepIdx(LOADING_STEPS.length - 2);

      setTimeout(() => {
        setLoadingStepIdx(LOADING_STEPS.length - 1);
        setTimeout(() => {
          setRoadmap(res.data.roadmap);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          setIsGenerating(false);
          fetchData();
        }, 600);
      }, 500);
    } catch (err) {
      clearInterval(stepInterval);
      setIsGenerating(false);
      toast.error("AI Roadmap generation failed. Please try again.");
    }
  };

  const handleUpdateProgress = async () => {
    try {
      toast.loading("Syncing roadmap progress with workspace...", { id: "sync" });
      const res = await api.post("/coding/roadmap/update");
      setRoadmap(res.data.roadmap);

      const [readinessRes, recRes] = await Promise.all([
        api.get("/coding/roadmap/readiness"),
        api.get("/coding/roadmap/recommendations")
      ]);
      setReadiness(readinessRes.data.readiness);
      setRecommendations(recRes.data.recommendations);

      toast.success("Progress synced successfully!", { id: "sync" });
      if (res.data.roadmap?.completionPercentage === 100) {
        confetti({ particleCount: 200, spread: 100 });
      }
    } catch {
      toast.error("Failed to sync progress", { id: "sync" });
    }
  };

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  const handleResetRoadmap = async () => {
    const ok = await confirm("Are you sure you want to discard your current roadmap and generate a new one?", { danger: true, confirmLabel: "Regenerate" });
    if (ok) {
      setRoadmap(null);
    }
  };

  const topicProgressMap: Record<string, number> = {};
  if (roadmap?.weeks) {
    roadmap.weeks.forEach((week: any) => {
      week.topics?.forEach((t: string) => {
        topicProgressMap[t] = Math.max(topicProgressMap[t] || 0, week.completion_percentage || 0);
      });
    });
  }

  const isDark = theme === "dark";
  const optionStyle = { background: isDark ? "#0e1025" : "#ffffff", color: isDark ? "#e5e7eb" : "#1f2937" };

  return (
    <div className="relative overflow-hidden font-sans" style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      <FloatingOrbs />

      <DashboardSidebar
        activeView="coding"
        onViewDashboard={handleViewDashboard}
        onViewTool={handleViewTool}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <DashboardTopNav
        user={user}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onViewProfile={handleViewProfile}
        onAdyChat={handleAdyChat}
        onViewTool={handleViewTool}
        onMenuToggle={() => setSidebarOpen(prev => !prev)}
        notifications={notifications}
        setNotifications={setNotifications}
        unreadCount={unreadCount}
        onMarkAllRead={() => {}}
        onClearAll={() => {}}
        onPremium={handlePremium}
        onViewSettings={() => handleViewTool("settings")}
      />

      <main className="dash-main relative z-10 font-sans">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-8" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ backgroundImage: "linear-gradient(135deg, #f59e0b, #d97706)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                <Compass className="w-8 h-8 text-amber-500" style={{ WebkitTextFillColor: "#f59e0b" }} />
                AI Coding Roadmap
              </h1>
              <p className="text-xs md:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Your personalized pathway to interview-ready proficiency. Optimized with learning analytics.
              </p>
            </div>

            <div className="flex items-center gap-3 h-9">
              {roadmap && (
                <>
                  <PremiumButton
                    variant="secondary"
                    className="text-xs h-9 whitespace-nowrap"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={handleUpdateProgress}
                  >
                    Sync Progress
                  </PremiumButton>
                  <PremiumButton variant="secondary" className="text-xs h-9 !border-red-500/20 !text-red-400 hover:!bg-red-500/10" onClick={handleResetRoadmap}>
                    Regenerate
                  </PremiumButton>
                </>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
                <div className="relative w-full max-w-md p-8 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col items-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6"
                  >
                    <Compass size={32} className="text-black" />
                  </motion.div>
                  <h2 className="text-xl font-black mb-1" style={{ backgroundImage: "linear-gradient(135deg, var(--text-primary), var(--text-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Adyapan Roadmap Engine
                  </h2>
                  <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black mb-6">
                    Building Personalized Path
                  </p>
                  <div className="w-full flex flex-col gap-3">
                    {LOADING_STEPS.slice(0, 5).map((step, idx) => {
                      const isDone = idx < loadingStepIdx;
                      const isCurrent = idx === loadingStepIdx;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs font-semibold py-1">
                          <span className={isDone ? "line-through" : ""} style={{ color: isDone ? "var(--text-primary)" : isCurrent ? "#f59e0b" : "var(--text-primary)", opacity: isDone ? 0.4 : isCurrent ? 1 : 0.2 }}>
                            {step}
                          </span>
                          <div>
                            {isDone ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : isCurrent ? (
                              <RefreshCw size={12} className="animate-spin text-amber-500" />
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full" style={{ border: "1px solid var(--border-color)" }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 min-h-[50vh]">
                <div className="relative w-full max-w-lg p-10 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col items-center text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/10 rounded-full blur-[80px] animate-pulse" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-orange-500/10 rounded-full blur-[80px] animate-pulse" />
                  </div>

                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-6 relative z-10"
                  >
                    <BrainCircuit size={32} className="text-black" />
                  </motion.div>

                  <h3 className="text-lg font-black mb-1 relative z-10" style={{ backgroundImage: "linear-gradient(135deg, var(--text-primary), var(--text-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Building Your Personalized Path
                  </h3>
                  <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black mb-8 relative z-10">
                    AI Roadmap Generation
                  </p>

                  <div className="w-full space-y-3 text-left max-w-xs mx-auto mb-8 relative z-10">
                    {LOADING_STEPS.map((step, idx) => {
                      const isDone = idx < loadingStepIdx;
                      const isActive = idx === loadingStepIdx;
                      return (
                        <motion.div
                          key={step}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: isDone || isActive ? 1 : 0.25, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between text-xs font-semibold py-1"
                        >
                          <span className={isDone ? "line-through" : ""} style={{ color: isDone ? "var(--text-primary)" : isActive ? "#f59e0b" : "var(--text-primary)", opacity: isDone ? 0.4 : isActive ? 1 : 0.2 }}>
                            {step}
                          </span>
                          <div className="flex-shrink-0 ml-3">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : isActive ? (
                              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded-full" style={{ border: "1px solid var(--border-color)" }} />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="w-full rounded-full h-1.5 overflow-hidden relative z-10" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500"
                      style={{ backgroundSize: "200% 100%" }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${(loadingStepIdx / (LOADING_STEPS.length - 1)) * 100}%` }}
                      transition={{ ease: "easeInOut", duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            ) : !roadmap ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto w-full"
              >
                <div className="relative w-full rounded-2xl backdrop-blur-xl shadow-2xl overflow-hidden p-8 md:p-10" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/8 rounded-full blur-[100px]" />
                    <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-orange-500/6 rounded-full blur-[100px]" />
                    <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                      <GraduationCap className="w-40 h-40" />
                    </div>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Route className="w-5 h-5 text-black" />
                      </div>
                      <h2 className="text-xl font-black" style={{ backgroundImage: "linear-gradient(135deg, var(--text-primary), var(--text-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Setup Coding Roadmap
                      </h2>
                    </div>
                    <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black mb-4">
                      Personalized DSA Preparation Path
                    </p>

                    <p className="text-xs md:text-sm mb-8 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      Answer a few questions about your preparation status and targeted placements. Our AI agent will analyze your coding history, detect weak topics, and map out an optimized roadmap timeline.
                    </p>

                  <form onSubmit={triggerGeneration} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Current Skill Level</label>
                        <select
                          value={formData.skillLevel}
                          onChange={(e) => setFormData({ ...formData, skillLevel: e.target.value })}
                          className="rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:border-amber-500 transition"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                        >
                          <option style={optionStyle} value="Beginner">Beginner (No core DSA knowledge)</option>
                          <option style={optionStyle} value="Intermediate">Intermediate (Familiar with arrays/stacks, weak on tree/graph)</option>
                          <option style={optionStyle} value="Advanced">Advanced (Strong logic, practicing hard/optimization)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Target Track</label>
                        <select
                          value={formData.targetCompany}
                          onChange={(e) => setFormData({ ...formData, targetCompany: e.target.value })}
                          className="rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:border-amber-500 transition"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                        >
                          <option style={optionStyle} value="FAANG">FAANG Track (Google, Amazon, Microsoft)</option>
                          <option style={optionStyle} value="Product Companies">Product Companies (Uber, Atlassian, Stripe)</option>
                          <option style={optionStyle} value="Startup">Startup Track (Rapid problem solving)</option>
                          <option style={optionStyle} value="TCS">TCS Track</option>
                          <option style={optionStyle} value="Infosys">Infosys Track</option>
                          <option style={optionStyle} value="Accenture">Accenture Track</option>
                          <option style={optionStyle} value="Competitive Programming">Competitive Programming Track</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Target Role</label>
                        <select
                          value={formData.targetRole}
                          onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                          className="rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:border-amber-500 transition"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                        >
                          <option style={optionStyle} value="Internship">Internship Placement</option>
                          <option style={optionStyle} value="Placement">Campus Placement (Entry level SDE)</option>
                          <option style={optionStyle} value="SDE-1">SDE-1 Role (Full-time placement)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Timeline Weeks</label>
                        <select
                          value={formData.targetTimeline}
                          onChange={(e) => setFormData({ ...formData, targetTimeline: Number(e.target.value) })}
                          className="rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:border-amber-500 transition"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                        >
                          <option style={optionStyle} value="4">4 Weeks (Fast Crash Course)</option>
                          <option style={optionStyle} value="6">6 Weeks (Standard path)</option>
                          <option style={optionStyle} value="8">8 Weeks (Thorough prep - Recommended)</option>
                          <option style={optionStyle} value="12">12 Weeks (Extended deep dive)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Preferred Language</label>
                        <select
                          value={formData.preferredLanguage}
                          onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                          className="rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:border-amber-500 transition"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                        >
                          <option style={optionStyle} value="C++">C++</option>
                          <option style={optionStyle} value="Java">Java</option>
                          <option style={optionStyle} value="Python">Python</option>
                          <option style={optionStyle} value="JavaScript">JavaScript</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Daily Study Time</label>
                        <select
                          value={formData.dailyStudyTime}
                          onChange={(e) => setFormData({ ...formData, dailyStudyTime: e.target.value })}
                          className="rounded-xl px-4 py-3 text-xs md:text-sm focus:outline-none focus:border-amber-500 transition"
                          style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                        >
                          <option style={optionStyle} value="1 hour">1 Hour / Day</option>
                          <option style={optionStyle} value="2 hours">2 Hours / Day</option>
                          <option style={optionStyle} value="4 hours">4 Hours / Day</option>
                          <option style={optionStyle} value="6+ hours">6+ Hours / Day</option>
                        </select>
                      </div>
                    </div>

                    <PremiumButton
                      type="submit"
                      className="w-full py-4 text-sm mt-6 relative z-10 whitespace-nowrap"
                      icon={<Sparkles className="w-4 h-4" />}
                    >
                      Generate AI Roadmap
                    </PremiumButton>
                  </form>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12"
              >
                {/* Left & Center */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Readiness Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PremiumCard variant="glass" className="p-5 flex flex-col justify-between hover:border-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.04)] transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Placement Readiness</span>
                        <Trophy className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex items-center gap-5 my-2">
                        <div className="relative w-18 h-18 flex items-center justify-center rounded-full" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                          <span className="text-2xl font-extrabold text-amber-400">{readiness?.placementReadiness}</span>
                          <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 pointer-events-none" />
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Ready Track</div>
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Targeting {roadmap?.targetCompany}</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xxs mb-1" style={{ color: "var(--text-muted)" }}>
                          <span>Roadmap Completion</span>
                          <span>{roadmap?.completionPercentage}%</span>
                        </div>
                        <PremiumProgressBar value={roadmap?.completionPercentage || 0} />
                      </div>
                    </PremiumCard>

                    <PremiumCard variant="glass" className="p-5 flex flex-col justify-between hover:border-orange-500/20 hover:shadow-[0_0_24px_rgba(249,115,22,0.04)] transition-all duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Interview Readiness</span>
                        <Target className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex items-center gap-5 my-2">
                        <div className="relative w-18 h-18 flex items-center justify-center rounded-full" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                          <span className="text-2xl font-extrabold text-orange-400">{readiness?.interviewReadiness}</span>
                          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20 pointer-events-none" />
                        </div>
                        <div>
                          <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>DSA Coverage</div>
                          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{readiness?.stats?.topicCoverage} core categories covered</div>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xxs" style={{ color: "var(--text-muted)" }}>
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>Code Review: {readiness?.stats?.avgReview}/100</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BrainCircuit className="w-3.5 h-3.5 text-orange-500" />
                          <span>Complexity: {readiness?.stats?.avgComplexity}/100</span>
                        </div>
                      </div>
                    </PremiumCard>
                  </div>

                  {/* Topic Library */}
                  <TopicLibraryCard topics={readiness?.topics?.length ? readiness.topics : FALLBACK_TOPICS} topicProgress={topicProgressMap} />

                  {/* Timeline */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Roadmap Path Weeks</h3>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{roadmap?.weeks?.length} weeks structured</span>
                    </div>

                    <div className="space-y-3">
                      {roadmap?.weeks?.map((week: any) => {
                        const isOpen = expandedWeeks[week.week];
                        const isWeekCompleted = week.status === "completed";
                        const isWeekInProgress = week.status === "in_progress";

                        return (
                          <motion.div
                            key={week.week}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: week.week * 0.05 }}
                          >
                            <PremiumCard
                              variant={isWeekInProgress ? "bordered" : "glass"}
                              className="transition-all duration-300"
                            >
                              <div
                                onClick={() => toggleWeek(week.week)}
                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.015]"
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    isWeekCompleted ? "bg-green-500/20 text-green-400" :
                                    isWeekInProgress ? "bg-amber-500/20 text-amber-400" : ""
                                  }`} style={!isWeekCompleted && !isWeekInProgress ? { background: "var(--bg-card)", color: "var(--text-muted)" } : {}}>
                                    {isWeekCompleted ? <Check className="w-4 h-4" /> : `W${week.week}`}
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                                      {week.title}
                                      {isWeekCompleted && <span className="text-xxs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Completed</span>}
                                      {isWeekInProgress && <span className="text-xxs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Active</span>}
                                    </h4>
                                    <p className="text-xxs mt-0.5" style={{ color: "var(--text-muted)" }}>{week.description}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{week.completion_percentage}%</span>
                                  <ChevronDown className="w-4 h-4 transition-transform" style={{ color: "var(--text-muted)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                                </div>
                              </div>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                    style={{ borderTop: "1px solid var(--border-color)" }}
                                  >
                                    <div className="p-5 space-y-4">
                                      <div className="flex flex-wrap gap-4 text-xxs" style={{ color: "var(--text-muted)" }}>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-card)" }}>
                                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Target: {week.target_question_count} problems</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-card)" }}>
                                          <BrainCircuit className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Progression: {week.difficulty_progression}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: "var(--bg-card)" }}>
                                          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                                          <span>Topics: {week.topics.join(", ")}</span>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        <div className="text-xxs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Recommended Workspace Tasks</div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {week.recommended_questions?.map((q: any) => {
                                            const isSolved = q.solved;
                                            return (
                                              <motion.div
                                                key={q.id}
                                                whileHover={{ scale: 1.01 }}
                                                className="p-3 rounded-xl flex items-center justify-between gap-3 transition"
                                                style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}
                                              >
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                  {isSolved ? (
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                  ) : (
                                                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ border: "1px solid var(--border-hover)" }} />
                                                  )}
                                                  <div className="overflow-hidden">
                                                    <div className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{q.title}</div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                      <span className={`text-[10px] ${
                                                        q.difficulty === "Easy" ? "text-green-400" :
                                                        q.difficulty === "Medium" ? "text-amber-400" : "text-red-400"
                                                      }`}>{q.difficulty}</span>
                                                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>•</span>
                                                      <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{q.topic}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                                <PremiumButton
                                                  variant={isSolved ? "ghost" : "glow"}
                                                  className="text-[10px] py-1 px-3"
                                                  onClick={() => router.push(`/dashboard/coding/problem/${q.id}`)}
                                                >
                                                  {isSolved ? "Review" : "Solve"} <Play className="w-2.5 h-2.5 ml-1 fill-current" />
                                                </PremiumButton>
                                              </motion.div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </PremiumCard>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Sidebar: AI Coach + Recommendations */}
                <div className="space-y-6">
                  {/* AI Coach Guidance */}
                  <PremiumCard variant="bordered" className="p-5 hover:border-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.04)] transition-all duration-300" style={{ borderColor: "rgba(245,158,11,0.1)" }}>
                    <div className="flex items-center gap-2.5 mb-3 text-amber-500">
                      <BrainCircuit className="w-5 h-5" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">AI Placement Mentor</h3>
                    </div>

                    <div className="text-xs leading-relaxed italic p-3 rounded-lg mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                      <TypewriterText text={roadmap?.guidance || ""} speed={15} />
                    </div>

                    {/* Streak Indicators */}
                    {streakData && (
                      <div className="flex items-center gap-3 p-3 rounded-lg mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)" }}>
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{streakData.currentStreak || 0}</span>
                          <span className="text-xxs" style={{ color: "var(--text-muted)" }}>day streak</span>
                        </div>
                        <div className="w-px h-4" style={{ background: "var(--border-color)" }} />
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{streakData.points || 0}</span>
                          <span className="text-xxs" style={{ color: "var(--text-muted)" }}>pts</span>
                        </div>
                        <div className="w-px h-4" style={{ background: "var(--border-color)" }} />
                        <div className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{streakData.longestStreak || 0}</span>
                          <span className="text-xxs" style={{ color: "var(--text-muted)" }}>best</span>
                        </div>
                      </div>
                    )}

                    <div className="text-xxs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      Overall roadmap completed: <strong style={{ color: "var(--text-primary)" }}>{roadmap?.completionPercentage}%</strong>. Complete weekly milestones by solving recommended question cards to unlock higher readiness statistics.
                    </div>
                  </PremiumCard>

                  {/* Recommendations */}
                  {recommendations && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>AI Recommendations</h3>

                      <PremiumCard variant="glass" className="p-4 flex gap-3.5 items-start hover:border-amber-500/20 transition-all duration-200">
                        <BookOpen className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Study Next</div>
                          <div className="text-xs font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{recommendations.studyNext?.topic}</div>
                          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{recommendations.studyNext?.reason}</div>
                        </div>
                      </PremiumCard>

                      <PremiumCard variant="glass" className="p-4 flex gap-3.5 items-start hover:border-orange-500/20 transition-all duration-200">
                        <Play className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 overflow-hidden">
                          <div className="text-[10px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Practice Next</div>
                          <div className="text-xs font-bold mt-0.5 truncate" style={{ color: "var(--text-primary)" }}>{recommendations.practiceNext?.title}</div>
                          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{recommendations.practiceNext?.reason}</div>
                          {recommendations.practiceNext?.id && (
                            <PremiumButton
                              variant="primary"
                              className="text-[10px] py-1 px-3 mt-3 w-full"
                              onClick={() => router.push(`/dashboard/coding/problem/${recommendations.practiceNext.id}`)}
                            >
                              Solve Problem <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </PremiumButton>
                          )}
                        </div>
                      </PremiumCard>

                      <PremiumCard variant="glass" className="p-4 flex gap-3.5 items-start hover:border-purple-500/20 transition-all duration-200">
                        <RefreshCw className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Revise Next</div>
                          <div className="text-xs font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{recommendations.reviseNext?.topic}</div>
                          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{recommendations.reviseNext?.reason}</div>
                        </div>
                      </PremiumCard>

                      <PremiumCard variant="glass" className="p-4 flex gap-3.5 items-start hover:border-red-500/20 transition-all duration-200">
                        <Trophy className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>Challenge Next</div>
                          <div className="text-xs font-bold mt-0.5" style={{ color: "var(--text-primary)" }}>{recommendations.challengeNext?.title}</div>
                          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{recommendations.challengeNext?.reason}</div>
                        </div>
                      </PremiumCard>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <PremiumCard variant="glass" className="p-5 hover:border-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.04)] transition-all duration-300">
                    <div className="flex items-center gap-2.5 mb-3">
                      <BarChart3 className="w-5 h-5 text-amber-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>Quick Stats</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Questions Solved</span>
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{readiness?.stats?.solvedCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Challenges Done</span>
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{readiness?.stats?.challengesCompleted || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>Topic Coverage</span>
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{readiness?.stats?.topicCoverage || 0}/{readiness?.stats?.totalTopics || FALLBACK_TOPICS.length}</span>
                      </div>
                    </div>
                  </PremiumCard>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {confirmModal}
    </div>
  );
}
