"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Code2, Search, BookMarked, CheckCircle2, AlertCircle, Play, Sparkles,
  Trophy, Clock, RefreshCw, X, ChevronRight, HelpCircle, ExternalLink,
  Check, Award, Lightbulb, Zap
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
} from "@/components/dashboard-shell";
import type { AdyapanUser } from "@/components/dashboard-shell";
import { renderMarkdown, inlineFormat } from "@/utils/renderMarkdown";

const CodingDashboardView = dynamic(
  () => import("@/components/coding-hub/CodingDashboardView").then((m) => m.CodingDashboardView),
  { ssr: false }
);

const CodingRoadmapPage = dynamic(
  () => import("@/app/dashboard/coding/roadmap/page").then((m) => m.default),
  { ssr: false }
);

// ─── Loading checklist steps ──────────────────────────────────────────────────
const loadingSteps = [
  "Connecting to Question Repository",
  "Loading DSA Topics",
  "Fetching Coding Problems",
  "Preparing Recommendations",
  "Building Dashboard"
];

// ─── Typewriter text animation for AI reveal ──────────────────────────────────
function TypewriterText({ text, speed = 4, isDark = true }: { text: string; speed?: number; isDark?: boolean }) {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    if (!text) return;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(prev => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return (
    <div className="text-xs md:text-sm leading-relaxed text-[var(--text-primary)] opacity-90">
      {renderMarkdown(displayedText, isDark)}
    </div>
  );
}

function CodingHubContent() {
  useRequireAuth("USER");

  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || searchParams.get("view") || "dsa";
  const currentTab = rawTab === "dashboard" || rawTab === "coding-dashboard" ? "dashboard"
    : rawTab === "roadmap" || rawTab === "coding-roadmap" ? "roadmap"
    : "dsa";

  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Loading screen states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingIndex, setLoadingIndex] = useState(0);

  // Coding dashboard data states
  const [stats, setStats] = useState({
    questionsAvailable: 0,
    topicsCovered: 0,
    solved: 0,
    attempted: 0,
    bookmarks: 0
  });
  const [topicExplorer, setTopicExplorer] = useState<any[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);

  // Question list and filter states
  const [questions, setQuestions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bookmarkFilter, setBookmarkFilter] = useState(false);
  const [placementFilter, setPlacementFilter] = useState("all"); // "all", "placement", "interview"
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [fetchingQuestions, setFetchingQuestions] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [selectedQuestionDetails, setSelectedQuestionDetails] = useState<any>(null);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [drawerActiveTab, setDrawerActiveTab] = useState<"explanation" | "hints" | "approach">("explanation");
  const [timeSpent, setTimeSpent] = useState(0);
  const [activeTimer, setActiveTimer] = useState<any>(null);

  // Restore user & theme settings
  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    // User details
    try {
      const rawUser = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (rawUser) {
        setUser(JSON.parse(rawUser));
      }
    } catch { /* ignore */ }

    // Fetch notifications
    api.get("/notifications?limit=5")
      .then(res => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.notifications?.filter((n: any) => !n.read).length || 0);
      })
      .catch(() => {});
  }, []);

  // Loading screen checklist simulation
  useEffect(() => {
    if (loadingIndex < loadingSteps.length) {
      const timer = setTimeout(() => {
        setLoadingIndex(prev => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
      // Fetch initial data
      fetchDashboardData();
      fetchQuestions();
    }
  }, [loadingIndex]);

  // Timer logic for selected question time spent tracking
  useEffect(() => {
    if (drawerOpen && selectedQuestion) {
      setTimeSpent(0);
      const interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
      setActiveTimer(interval);
      return () => clearInterval(interval);
    } else {
      if (activeTimer) {
        clearInterval(activeTimer);
        setActiveTimer(null);
      }
    }
  }, [drawerOpen, selectedQuestion]);

  // Fetch stats & dashboard data
  const fetchDashboardData = async () => {
    try {
      const res = await api.get("/coding/dashboard");
      setStats(res.data.stats);
      setTopicExplorer(res.data.topicExplorer || []);
      setDailyChallenge(res.data.dailyChallenge);
      setRecentActivity(res.data.recentActivity || []);
      setAiRecommendations(res.data.aiRecommendations);
    } catch (err) {
      toast.error("Failed to load dashboard data");
    }
  };

  // Fetch paginated, filterable questions
  const fetchQuestions = async (page = 1) => {
    setFetchingQuestions(true);
    try {
      const params: any = {
        page,
        limit: 12,
        search: searchQuery || undefined,
        topic: topicFilter || undefined,
        difficulty: difficultyFilter || undefined,
        status: statusFilter || undefined,
        bookmarked: bookmarkFilter ? "true" : undefined
      };

      const res = await api.get("/coding/questions", { params });
      
      let filteredQs = res.data.questions || [];
      if (placementFilter === "placement") {
        filteredQs = filteredQs.filter((q: any) => q.placementImportance);
      } else if (placementFilter === "interview") {
        filteredQs = filteredQs.filter((q: any) => q.interviewImportance);
      }

      setQuestions(filteredQs);
      setCurrentPage(res.data.pagination?.page || 1);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      toast.error("Failed to load questions list");
    } finally {
      setFetchingQuestions(false);
    }
  };

  // Trigger Codeforces Sync
  const handleSyncRepository = async () => {
    setSyncing(true);
    toast.info("Syncing Codeforces repository...");
    try {
      const res = await api.post("/coding/sync-codeforces");
      if (res.data.success) {
        toast.success(`Successfully synced ${res.data.syncedCount} questions!`);
        fetchDashboardData();
        fetchQuestions();
      } else {
        toast.error("Synchronization failed");
      }
    } catch (err) {
      toast.error("Failed to sync Codeforces problems");
    } finally {
      setSyncing(false);
    }
  };

  // Handle Theme Toggle
  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleViewProfile = () => router.push("/profile");
  const handlePremium = () => router.push("/premium");
  const handleViewDashboard = () => router.push("/dashboard/user");
  const handleAdyChat = () => {
    localStorage.setItem("dashboard-active-view", "ady-chat");
    router.push("/dashboard/user");
  };

  const handleViewTool = (tool: string) => {
    localStorage.setItem("dashboard-active-view", tool);
    router.push("/dashboard/user");
  };

  // Question details operations
  const handleOpenQuestion = async (q: any) => {
    setSelectedQuestion(q);
    setSelectedQuestionDetails(null);
    setDrawerOpen(true);
    setDrawerActiveTab("explanation");

    try {
      const res = await api.get(`/coding/question/${q.id}`);
      setSelectedQuestionDetails(res.data);
    } catch (err) {
      toast.error("Failed to load question details");
    }
  };

  const handleSolveQuestion = (q: any) => {
    if (!q || !q.id) return;
    router.push(`/dashboard/coding/problem/${q.id}`);
  };

  const handleBookmarkToggle = async () => {
    if (!selectedQuestion) return;
    const isBookmarked = !selectedQuestionDetails?.progress?.bookmarked;
    try {
      await api.post(`/coding/question/${selectedQuestion.id}/bookmark`, { bookmarked: isBookmarked });
      
      setSelectedQuestionDetails((prev: any) => ({
        ...prev,
        progress: { ...prev.progress, bookmarked: isBookmarked }
      }));

      // Update question list item
      setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? {
        ...q, progress: { ...q.progress, bookmarked: isBookmarked }
      } : q));

      toast.success(isBookmarked ? "Question bookmarked!" : "Bookmark removed");
      fetchDashboardData();
    } catch (err) {
      toast.error("Failed to toggle bookmark");
    }
  };

  const handleMarkAttempted = async () => {
    if (!selectedQuestion) return;
    try {
      await api.post(`/coding/question/${selectedQuestion.id}/attempt`, { timeSpent });
      
      setSelectedQuestionDetails((prev: any) => ({
        ...prev,
        progress: { ...prev.progress, status: "attempted", attempted: true }
      }));

      setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? {
        ...q, progress: { ...q.progress, status: "attempted", attempted: true }
      } : q));

      toast.success("Marked as attempted!");
      fetchDashboardData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleMarkSolved = async () => {
    if (!selectedQuestion) return;
    try {
      await api.post(`/coding/question/${selectedQuestion.id}/solve`, { timeSpent });
      
      setSelectedQuestionDetails((prev: any) => ({
        ...prev,
        progress: { ...prev.progress, status: "solved", solved: true }
      }));

      setQuestions(prev => prev.map(q => q.id === selectedQuestion.id ? {
        ...q, progress: { ...q.progress, status: "solved", solved: true }
      } : q));

      toast.success("Congratulations! Marked as solved! 🎉");
      fetchDashboardData();
    } catch (err) {
      toast.error("Failed to mark solved");
    }
  };

  const handleGenerateAIAnalysis = async () => {
    if (!selectedQuestion) return;
    setGeneratingAnalysis(true);
    try {
      const res = await api.post(`/coding/question/${selectedQuestion.id}/analyze`);
      if (res.data.success) {
        setSelectedQuestionDetails((prev: any) => ({
          ...prev,
          aiAnalysis: res.data.analysis
        }));
        toast.success("AI Explanation ready!");
      }
    } catch (err) {
      toast.error("Failed to generate AI explanation");
    } finally {
      setGeneratingAnalysis(false);
    }
  };

  // Trigger search filter
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (!isLoading) {
        fetchQuestions(1);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, topicFilter, difficultyFilter, statusFilter, bookmarkFilter, placementFilter, isLoading]);



  // Active view layout shell
  return (
    <div className="relative overflow-hidden" style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      <FloatingOrbs />
      
      {/* Top Navbar */}
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

      {/* Sidebar */}
      <DashboardSidebar
        activeView="coding"
        onViewDashboard={handleViewDashboard}
        onViewTool={handleViewTool}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main workspace */}
      <main className="dash-main relative z-10 font-sans px-4 md:px-8 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
            <div className="relative w-full max-w-md p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6"
              >
                <Code2 size={32} className="text-black" />
              </motion.div>
              
              <h2 className="text-xl font-black mb-1 bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-primary)]/70 bg-clip-text text-transparent">
                Adyapan Coding Engine
              </h2>
              <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black mb-6">
                Building DSA Intelligence Layer
              </p>

              <div className="w-full flex flex-col gap-3">
                {loadingSteps.map((step, idx) => {
                  const isDone = idx < loadingIndex;
                  const isCurrent = idx === loadingIndex;
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs font-semibold py-1">
                      <span className={isDone ? "text-[var(--text-primary)]/40 line-through" : isCurrent ? "text-amber-500" : "text-[var(--text-primary)]/20"}>
                        {step}
                      </span>
                      <div>
                        {isDone ? (
                          <Check size={14} className="text-emerald-500" />
                        ) : isCurrent ? (
                          <RefreshCw size={12} className="animate-spin text-amber-500" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)]" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Sub-navigation Tabs with Query Strings */}
            <div className="flex items-center gap-2 mb-6 border-b border-[var(--border-color)] pb-3">
              {[
                { id: "dashboard", label: "Coding Dashboard", href: "/dashboard/coding?tab=dashboard" },
                { id: "roadmap", label: "Coding Roadmap", href: "/dashboard/coding?tab=roadmap" },
                { id: "dsa", label: "DSA Practice", href: "/dashboard/coding?tab=dsa" },
              ].map((tabItem) => {
                const isActive = currentTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => router.push(tabItem.href)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      isActive
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                    }`}
                  >
                    {tabItem.label}
                  </button>
                );
              })}
            </div>

            {currentTab === "dashboard" ? (
              <CodingDashboardView />
            ) : currentTab === "roadmap" ? (
              <CodingRoadmapPage />
            ) : (
              <>
            {/* Header Overview Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-2">
          <div>

            <motion.h1
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-3xl font-black tracking-tight text-[var(--text-primary)]"
            >
              DSA Question Bank
            </motion.h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Select a topic, view guided hints and optimal approaches, and complete placements preparation!
            </p>
          </div>
        </div>

        {/* Hero Statistics Panels */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Available Questions", value: `${stats.questionsAvailable}+`, color: "text-amber-500", desc: "synced problems" },
            { label: "DSA Topics", value: stats.topicsCovered, color: "text-purple-500", desc: "core conceptual paths" },
            { label: "Questions Solved", value: stats.solved, color: "text-emerald-500", desc: "completed exercises" },
            { label: "Attempted", value: stats.attempted, color: "text-blue-500", desc: "problems in progress" },
            { label: "Bookmarked", value: stats.bookmarks, color: "text-rose-500", desc: "saved for revision" }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm dark:shadow-none backdrop-blur-md flex flex-col justify-between min-h-[110px] hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)] transition-all duration-300"
            >
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">{card.label}</span>
              <div className="mt-2 flex flex-col">
                <span className={`text-2xl font-black ${card.color}`}>{card.value}</span>
                <span className="text-[10px] text-[var(--text-secondary)]/80 font-medium">{card.desc}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Daily Challenge & Recommendations Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Daily Challenge Card */}
          <PremiumCard glow className="lg:col-span-2 flex flex-col p-6 h-full justify-between bg-[var(--bg-card)] border-[var(--border-color)] shadow-md dark:shadow-none">
            <div className="flex justify-between items-start">
              <div>
                <PremiumBadge variant="amber" pulse className="mb-3">Daily Challenge</PremiumBadge>
                {dailyChallenge ? (
                  <>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] hover:text-amber-500 transition-colors cursor-pointer" onClick={() => handleOpenQuestion(dailyChallenge)}>
                      {dailyChallenge.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                      <span className="font-semibold text-purple-500">{dailyChallenge.topic}</span>
                      <span>·</span>
                      <span className={`font-semibold ${
                        dailyChallenge.difficulty === "Easy" ? "text-emerald-500" :
                        dailyChallenge.difficulty === "Medium" ? "text-amber-500" : "text-rose-500"
                      }`}>{dailyChallenge.difficulty}</span>
                      <span>·</span>
                      <span className="bg-slate-200 dark:bg-white/5 px-2 py-0.5 rounded text-[10px] font-bold">Rating: {dailyChallenge.rating || "N/A"}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> ~25-40 min</span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-secondary)] mt-2">No daily challenge generated. Sync database to resolve challenge.</p>
                )}
              </div>
              {dailyChallenge?.progress?.status === "solved" && (
                <CheckCircle2 size={32} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-bounce" />
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {dailyChallenge && (
                <>
                  <PremiumButton variant="primary" onClick={() => handleSolveQuestion(dailyChallenge)} icon={<Play size={12} />}>
                    Solve Problem
                  </PremiumButton>
                  <PremiumButton variant="secondary" onClick={() => handleOpenQuestion(dailyChallenge)}>
                    View Details
                  </PremiumButton>
                </>
              )}
            </div>
          </PremiumCard>

          {/* AI Recommendations Panel */}
          <PremiumCard className="p-6 h-full flex flex-col justify-between bg-[var(--bg-card)] border-[var(--border-color)] shadow-md dark:shadow-none hover:border-purple-500/20 hover:shadow-[0_0_24px_rgba(168,85,247,0.04)] transition-all duration-300">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-500 tracking-wider uppercase mb-3">
                <Sparkles size={14} /> AI Recommendation
              </div>
              <p className="text-xs text-[var(--text-primary)] font-semibold mb-4 leading-relaxed">
                {aiRecommendations?.message || "Analyze your progress to generate specific placement recommendation."}
              </p>
              
              <div className="flex flex-col gap-2">
                {aiRecommendations?.questions?.map((q: any) => (
                  <div
                    key={q.id}
                    onClick={() => handleOpenQuestion(q)}
                    className="flex justify-between items-center p-2.5 rounded-lg bg-[var(--bg-dark)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] cursor-pointer transition-all"
                  >
                    <div className="truncate pr-2">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">{q.title}</p>
                      <span className="text-[10px] text-[var(--text-secondary)] font-medium">{q.topic} · {q.difficulty}</span>
                    </div>
                    <ChevronRight size={14} className="text-[var(--text-secondary)] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-3">
              <span>Weak Area: {aiRecommendations?.topic || "None"}</span>
              <span>Next Difficulty: {aiRecommendations?.difficulty || "Easy"}</span>
            </div>
          </PremiumCard>
        </div>

        {/* DSA Topic Explorer Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-extrabold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            DSA Topic Explorer
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topicExplorer.map((t, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -4, boxShadow: "0 10px 20px rgba(245,158,11,0.06)" }}
                onClick={() => {
                  setTopicFilter(t.topicName);
                  const element = document.getElementById("dsa-repository-section");
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                  }
                  toast.success(`Filtered questions by: ${t.topicName}`);
                }}
                className="p-4 rounded-2xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] shadow-sm hover:border-amber-500/40 cursor-pointer backdrop-blur-md flex flex-col justify-between group transition-all"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-amber-500 transition-colors">{t.topicName}</h3>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">{t.solvedCount}/{t.questionCount} solved</span>
                  </div>

                  <PremiumProgressBar value={t.completionPercentage} color={t.completionPercentage >= 60 ? "green" : "amber"} height={4} className="my-3" />

                  {/* Difficulty Breakdown display */}
                  <div className="flex gap-2 text-[8px] uppercase tracking-wider font-extrabold text-[var(--text-secondary)] mt-2 justify-between">
                    <span className="text-emerald-500/80">E: {t.difficultyDistribution?.Easy || 0}</span>
                    <span className="text-amber-500/80">M: {t.difficultyDistribution?.Medium || 0}</span>
                    <span className="text-rose-500/80">H: {t.difficultyDistribution?.Hard || 0}</span>
                    <span className="text-purple-500/80">X: {t.difficultyDistribution?.Expert || 0}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-2">
                  <span>Completion %</span>
                  <span className="font-bold text-[var(--text-primary)]">{t.completionPercentage}%</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Question Bank with Filters */}
        <div id="dsa-repository-section" className="mb-12 scroll-mt-24">
          <h2 className="text-lg font-extrabold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Code2 size={18} className="text-amber-500" />
            DSA Repository
          </h2>

          <PremiumCard className="p-6 bg-[var(--bg-card)] border-[var(--border-color)] shadow-md dark:shadow-none">
            
            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center mb-6">
              
              <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
                {/* Search */}
                <div className="relative min-w-[200px] w-full sm:w-auto">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search problems or contest..."
                    className="pl-9 pr-4 py-2 w-full rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none focus:border-amber-500 text-xs text-[var(--text-primary)]"
                  />
                </div>

                {/* Topic filter */}
                <select
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none text-xs text-[var(--text-primary)] cursor-pointer hover:border-amber-500"
                >
                  <option value="">All Topics</option>
                  {[
                    "Arrays", "Strings", "Hashing", "Linked Lists", "Stacks", "Queues",
                    "Trees", "Binary Trees", "BST", "Heaps", "Recursion", "Backtracking",
                    "Greedy", "Dynamic Programming", "Graphs", "Tries", "Sliding Window",
                    "Two Pointers", "Bit Manipulation"
                  ].map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {/* Difficulty filter */}
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none text-xs text-[var(--text-primary)] cursor-pointer hover:border-amber-500"
                >
                  <option value="">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                  <option value="Expert">Expert</option>
                </select>

                {/* Status filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] outline-none text-xs text-[var(--text-primary)] cursor-pointer hover:border-amber-500"
                >
                  <option value="">All Statuses</option>
                  <option value="solved">Solved</option>
                  <option value="attempted">Attempted</option>
                  <option value="unsolved">Unsolved</option>
                </select>

                {/* Bookmark Filter */}
                <button
                  onClick={() => setBookmarkFilter(prev => !prev)}
                  className={`px-3 py-2 rounded-xl border outline-none text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                    bookmarkFilter ? "border-rose-500 bg-rose-500/10 text-rose-500" : "border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-dark)] hover:border-amber-500"
                  }`}
                >
                  <BookMarked size={12} />
                  Bookmarked
                </button>
              </div>

              {/* Placement Filter */}
              <div className="flex bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-1 gap-0.5 w-full sm:w-auto mt-2 lg:mt-0">
                {[
                  { id: "all", label: "All Questions" },
                  { id: "placement", label: "Placement Fav" },
                  { id: "interview", label: "Interview Fav" }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setPlacementFilter(item.id)}
                    className={`flex-1 sm:flex-none text-[10px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      placementFilter === item.id ? "bg-amber-500 text-black shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-widest text-[var(--text-secondary)] font-black">
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Problem</th>
                    <th className="py-3 px-2">Topic</th>
                    <th className="py-3 px-2">Difficulty</th>
                    <th className="py-3 px-2">Rating</th>
                    <th className="py-3 px-2">Focus Tags</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fetchingQuestions ? (
                    [...Array(6)].map((_, idx) => (
                      <tr key={idx} className="border-b border-[var(--border-color)] animate-pulse">
                        <td className="py-4 px-2"><div className="w-4 h-4 bg-[var(--border-color)] rounded" /></td>
                        <td className="py-4 px-2"><div className="w-48 h-4 bg-[var(--border-color)] rounded" /></td>
                        <td className="py-4 px-2"><div className="w-24 h-4 bg-[var(--border-color)] rounded" /></td>
                        <td className="py-4 px-2"><div className="w-16 h-4 bg-[var(--border-color)] rounded" /></td>
                        <td className="py-4 px-2"><div className="w-12 h-4 bg-[var(--border-color)] rounded" /></td>
                        <td className="py-4 px-2"><div className="w-32 h-4 bg-[var(--border-color)] rounded" /></td>
                        <td className="py-4 px-2"><div className="w-16 h-4 bg-[var(--border-color)] rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : questions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[var(--text-secondary)]">
                        <div className="flex flex-col items-center justify-center">
                          <Code2 size={32} className="text-[var(--text-secondary)]/25 mb-2" />
                          <p className="font-bold text-sm text-[var(--text-primary)]">No Questions Available Yet</p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">Sync Codeforces Repository to begin.</p>
                          <PremiumButton variant="primary" onClick={handleSyncRepository} icon={<RefreshCw size={12} />}>
                            Sync Problems
                          </PremiumButton>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => {
                      const isSolved = q.progress?.status === "solved";
                      const isAttempted = q.progress?.status === "attempted";
                      return (
                        <tr key={q.id} className="border-b border-[var(--border-color)] hover:bg-slate-100 dark:hover:bg-white/[0.015] transition-all text-xs font-semibold text-[var(--text-primary)]">
                          <td className="py-4 px-2">
                            {isSolved ? (
                              <CheckCircle2 size={16} className="text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.2)]" />
                            ) : isAttempted ? (
                              <div className="w-4 h-4 rounded-full border border-blue-500/50 flex items-center justify-center text-[8px] text-blue-400 animate-spin">
                                ⏳
                              </div>
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)]" />
                            )}
                          </td>
                          <td className="py-4 px-2">
                            <span className="font-bold text-[var(--text-primary)] hover:text-amber-500 cursor-pointer transition-colors block max-w-sm truncate" onClick={() => handleOpenQuestion(q)}>
                              {q.title}
                            </span>
                            <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 block">{q.externalId}</span>
                          </td>
                          <td className="py-4 px-2 text-purple-500 font-semibold">{q.topic}</td>
                          <td className="py-4 px-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              q.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                              q.difficulty === "Medium" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                              q.difficulty === "Hard" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                              "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                            }`}>{q.difficulty}</span>
                          </td>
                          <td className="py-4 px-2 text-[var(--text-secondary)]">{q.rating || "N/A"}</td>
                          <td className="py-4 px-2 flex flex-wrap gap-1">
                            {q.tagsJson?.slice(0, 2).map((t: string) => (
                              <span key={t} className="text-[8px] font-bold bg-slate-200 dark:bg-white/5 border border-[var(--border-color)] text-[var(--text-secondary)] uppercase tracking-widest px-1.5 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </td>
                          <td className="py-4 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <PremiumButton variant="ghost" onClick={() => handleOpenQuestion(q)} className="p-1 px-2.5">
                                Details
                              </PremiumButton>
                              <PremiumButton variant="primary" onClick={() => handleSolveQuestion(q)} className="p-1 px-3">
                                Solve
                              </PremiumButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center border-t border-[var(--border-color)] pt-4 mt-4">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                  Page {currentPage} of {totalPages}
                </span>
                
                <div className="flex gap-2">
                  <PremiumButton variant="secondary" disabled={currentPage <= 1} onClick={() => fetchQuestions(currentPage - 1)} className="px-3 py-1.5 bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-primary)]">
                    Previous
                  </PremiumButton>
                  <PremiumButton variant="secondary" disabled={currentPage >= totalPages} onClick={() => fetchQuestions(currentPage + 1)} className="px-3 py-1.5 bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-primary)]">
                    Next
                  </PremiumButton>
                </div>
              </div>
            )}
          </PremiumCard>
        </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Slide-out Question Details Drawer */}
      <AnimatePresence>
        {drawerOpen && selectedQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
            onClick={() => setDrawerOpen(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-[var(--bg-dark)] border-l border-[var(--border-color)] h-full overflow-y-auto p-6 flex flex-col justify-between shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar inside Drawer */}
              <div>
                <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-black font-extrabold">
                      CF
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--text-primary)] leading-tight">{selectedQuestion.title}</h3>
                      <p className="text-[10px] text-[var(--text-secondary)] font-medium">Contest Codeforces · {selectedQuestion.externalId}</p>
                    </div>
                  </div>
                  
                  <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-full border border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors text-[var(--text-primary)]">
                    <X size={16} />
                  </button>
                </div>

                {/* Core Details badge display */}
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-[var(--bg-card)] border border-[var(--border-color)] p-3.5 rounded-xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Topic</span>
                    <span className="text-xs font-bold text-purple-500">{selectedQuestion.topic}</span>
                  </div>
                  <div className="w-[1px] h-6 bg-[var(--border-color)] mx-2" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Difficulty</span>
                    <span className={`text-xs font-bold ${
                      selectedQuestion.difficulty === "Easy" ? "text-emerald-500" :
                      selectedQuestion.difficulty === "Medium" ? "text-amber-500" : "text-rose-500"
                    }`}>{selectedQuestion.difficulty}</span>
                  </div>
                  <div className="w-[1px] h-6 bg-[var(--border-color)] mx-2" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Rating</span>
                    <span className="text-xs font-bold text-[var(--text-primary)]">{selectedQuestion.rating || "N/A"}</span>
                  </div>
                  <div className="w-[1px] h-6 bg-[var(--border-color)] mx-2" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">Solve Timer</span>
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-1 font-mono">
                      <Clock size={12} /> {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                    </span>
                  </div>
                </div>

                {/* Drawer Menu Options */}
                <div className="flex gap-2 border-b border-[var(--border-color)] mb-6">
                  {["explanation", "hints", "approach"].map((tab: any) => (
                    <button
                      key={tab}
                      onClick={() => setDrawerActiveTab(tab)}
                      className={`py-2.5 px-4 font-bold uppercase tracking-wider text-[10px] border-b-2 transition-all cursor-pointer ${
                        drawerActiveTab === tab
                          ? "border-amber-500 text-amber-500 font-extrabold"
                          : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {tab === "explanation" ? "AI Explanation" : tab === "hints" ? "Hints Library" : "Brute vs Optimal"}
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <div className="min-h-[220px]">
                  
                  {/* AI Explanation Tab */}
                  {drawerActiveTab === "explanation" && (
                    <div className="space-y-4">
                      {selectedQuestionDetails?.aiAnalysis ? (
                        <>
                          <div>
                            <h4 className="text-[11px] font-black uppercase text-amber-500 tracking-wider mb-1.5 flex items-center gap-1">
                              <Sparkles size={12} /> Problem Breakdown
                            </h4>
                            <TypewriterText text={selectedQuestionDetails.aiAnalysis.problem_explanation} isDark={theme === "dark"} />
                          </div>
                          
                          <div className="mt-4 border-t border-[var(--border-color)] pt-4">
                            <h4 className="text-[11px] font-black uppercase text-purple-500 tracking-wider mb-2 flex items-center gap-1">
                              <Award size={12} /> FAANG Interview Importance
                            </h4>
                            <div className="text-xs text-[var(--text-primary)] opacity-95 leading-relaxed bg-purple-500/5 border border-purple-500/10 p-3 rounded-lg">
                              {renderMarkdown(selectedQuestionDetails.aiAnalysis.interview_importance, theme === "dark")}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[var(--border-color)] rounded-xl">
                          <Sparkles size={28} className="text-amber-500/30 mb-2 animate-pulse" />
                          <p className="text-xs text-[var(--text-primary)] font-bold">Need AI problem explanation & coaching?</p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 mb-4">Instant analysis powered by Gemini.</p>
                          
                          <PremiumButton variant="glow" onClick={handleGenerateAIAnalysis} loading={generatingAnalysis} icon={<Sparkles size={12} />}>
                            Generate AI Explanation
                          </PremiumButton>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hints Library Tab */}
                  {drawerActiveTab === "hints" && (
                    <div className="space-y-4">
                      {selectedQuestionDetails?.aiAnalysis ? (
                        <div className="flex flex-col gap-3">
                          {[
                            { label: "Hint 1 (Basic Guidance)", text: selectedQuestionDetails.aiAnalysis.hint_1 },
                            { label: "Hint 2 (Core Strategy)", text: selectedQuestionDetails.aiAnalysis.hint_2 },
                            { label: "Hint 3 (Optimization/Data Structure)", text: selectedQuestionDetails.aiAnalysis.hint_3 }
                          ].map((hint, idx) => (
                            <div key={idx} className="p-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl">
                              <span className="text-[9px] uppercase font-black text-amber-500 tracking-widest block mb-1">
                                {hint.label}
                              </span>
                              <div className="text-xs text-[var(--text-primary)] opacity-90 leading-relaxed">
                                {renderMarkdown(hint.text, theme === "dark")}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[var(--border-color)] rounded-xl">
                          <Lightbulb size={28} className="text-amber-500/30 mb-2" />
                          <p className="text-xs text-[var(--text-primary)] font-bold">Analyze question to retrieve sequential hints</p>
                          <PremiumButton variant="glow" className="mt-4" onClick={handleGenerateAIAnalysis} loading={generatingAnalysis} icon={<Sparkles size={12} />}>
                            Analyze Question
                          </PremiumButton>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Brute vs Optimal Tab */}
                  {drawerActiveTab === "approach" && (
                    <div className="space-y-4">
                      {selectedQuestionDetails?.aiAnalysis ? (
                        <div className="flex flex-col gap-4">
                          <div className="p-3 bg-slate-100 dark:bg-white/[0.01] border border-[var(--border-color)] rounded-xl">
                            <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] block mb-1">Brute Force Method</span>
                            <div className="text-xs text-[var(--text-primary)] opacity-90 leading-relaxed">
                              {renderMarkdown(selectedQuestionDetails.aiAnalysis.brute_force, theme === "dark")}
                            </div>
                          </div>

                          <div className="p-3 bg-amber-500/5 dark:bg-amber-500/[0.02] border border-amber-500/20 rounded-xl">
                            <span className="text-[10px] font-black uppercase text-amber-500 block mb-1">Optimal Approach</span>
                            <div className="text-xs text-[var(--text-primary)] opacity-90 leading-relaxed">
                              {renderMarkdown(selectedQuestionDetails.aiAnalysis.optimal_approach, theme === "dark")}
                            </div>
                          </div>

                          {/* Complexities and Mistakes */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-100 dark:bg-white/[0.02] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                              <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">Time Complexity</span>
                              <span className="text-sm font-black text-amber-500 mt-1 font-mono">{inlineFormat(selectedQuestionDetails.aiAnalysis.time_complexity)}</span>
                            </div>
                            <div className="p-3 bg-slate-100 dark:bg-white/[0.02] border border-[var(--border-color)] rounded-xl flex flex-col justify-between">
                              <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">Space Complexity</span>
                              <span className="text-sm font-black text-orange-500 mt-1 font-mono">{inlineFormat(selectedQuestionDetails.aiAnalysis.space_complexity)}</span>
                            </div>
                          </div>

                          <div className="p-3.5 bg-rose-500/5 dark:bg-rose-500/[0.02] border border-rose-500/20 rounded-xl">
                            <span className="text-[10px] font-black uppercase text-rose-500 block mb-2">Common Student Mistakes</span>
                            <ul className="list-disc pl-4 text-xs text-[var(--text-primary)] opacity-90 space-y-1.5 leading-relaxed">
                              {selectedQuestionDetails.aiAnalysis.common_mistakes?.map((mistake: string, idx: number) => (
                                <li key={idx}>{inlineFormat(mistake)}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[var(--border-color)] rounded-xl">
                          <Zap size={28} className="text-amber-500/30 mb-2" />
                          <p className="text-xs text-[var(--text-primary)] font-bold">Generate analysis for optimal algorithmic choices</p>
                          <PremiumButton variant="glow" className="mt-4" onClick={handleGenerateAIAnalysis} loading={generatingAnalysis} icon={<Sparkles size={12} />}>
                            Analyze Question
                          </PremiumButton>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons in Drawer Footer */}
              <div className="border-t border-[var(--border-color)] pt-4 mt-8 flex flex-wrap gap-3 items-center justify-between">
                
                {/* Left actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleBookmarkToggle}
                    className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
                      selectedQuestionDetails?.progress?.bookmarked
                        ? "border-rose-500 text-rose-500 bg-rose-500/15 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
                        : "border-[var(--border-color)] hover:border-amber-500 text-[var(--text-secondary)] hover:text-white bg-[var(--bg-card)]"
                    }`}
                  >
                    <BookMarked size={16} />
                  </button>

                  <a
                    href={selectedQuestion.problemUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all flex items-center gap-1.5 text-xs font-bold"
                  >
                    Codeforces <ExternalLink size={12} />
                  </a>
                </div>

                {/* Right actions */}
                <div className="flex gap-2.5">
                  <PremiumButton 
                    variant="glow" 
                    onClick={() => {
                      setDrawerOpen(false);
                      handleSolveQuestion(selectedQuestion);
                    }}
                    icon={<Play size={12} />}
                  >
                    Solve in AI Workspace
                  </PremiumButton>
                  <PremiumButton variant="secondary" onClick={handleMarkAttempted} className="bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)]">
                    Mark Attempted
                  </PremiumButton>
                  <PremiumButton variant="primary" onClick={handleMarkSolved} icon={<CheckCircle2 size={13} />}>
                    Mark Solved
                  </PremiumButton>
                </div>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CodingHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-dark)] flex items-center justify-center text-[var(--text-secondary)] font-bold text-xs uppercase tracking-widest">Loading...</div>}>
      <CodingHubContent />
    </Suspense>
  );
}
