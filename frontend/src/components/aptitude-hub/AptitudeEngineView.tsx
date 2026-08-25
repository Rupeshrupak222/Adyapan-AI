"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, Brain, BookOpen, BarChart3, Lightbulb, Hash,
  Play, Timer, Target, Building2, Sparkles, Flame, RotateCcw,
  CheckCircle2, ChevronRight, ArrowLeft, ArrowRight, Clock,
  Trophy, Zap, Bookmark, BookmarkCheck, Flag, TrendingUp,
  Star, AlertTriangle, RefreshCw, XCircle, Send, History,
  Shield, Award, Eye, EyeOff, ChevronDown, ChevronUp,
  Copy, ExternalLink, Users, CalendarDays, Medal, Layers,
  Grid3X3, ListChecks, GraduationCap, CircleDot, Shuffle,
  ArrowUpRight, X, Info
} from "lucide-react";
import { api } from "@/services/api";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";
import { FeatureLimitBanner } from "@/components/shared/FeatureLimitBanner";
import QuestionCard from "./QuestionCard";
import SessionReviewComponent from "./SessionReview";
import AptitudeAnalytics from "./AptitudeAnalytics";
import CompanyLogo from "@/components/interview-hub/CompanyLogo";
import { PlacementImpactCard } from "@/components/placement-hub/PlacementImpactCard";
import type {
  AptitudeQuestion, AptitudeCategory, TestMode, AptitudeSession,
  AptitudeAnswer, SessionProgress, PerformanceAnalytics,
  SessionReview as SessionReviewType, AptitudeView
} from "./types";
import {
  APTITUDE_CATEGORIES, TOPICS_BY_CATEGORY,
  COMPANY_PRESETS, DIFFICULTY_CONFIG
} from "./types";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }),
};

const LOADING_STEPS = [
  "Preparing Questions",
  "Personalizing Difficulty",
  "Loading Company Patterns",
  "Generating AI Insights",
  "Building Session",
  "Ready!"
];

const ICON_MAP: Record<string, any> = {
  Calculator, Brain, BookOpen, BarChart3, Lightbulb, Hash,
  Play, Timer, Target, Building2, Sparkles, Flame, RotateCcw
};

const CATEGORY_ICON_MAP: Record<string, any> = {
  Calculator, Brain, BookOpen, BarChart3, Lightbulb, Hash
};

const MODE_ICON_MAP: Record<string, any> = {
  Play, Timer, Target, Building2, Sparkles, Flame, RotateCcw
};

interface AptitudeEngineViewProps {
  setView: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

const formatTimeMs = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatTimeSec = (sec: number): string => {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export function AptitudeEngineView({ setView, activeModule = "aptitude-engine", theme = "dark" }: AptitudeEngineViewProps) {
  const router = useRouter();
  const isDark = theme === "dark";
  const quota = useFeatureQuota("AI_APTITUDE_ENGINE");
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

  const [view, setViewState] = useState<AptitudeView | "topic_select" | "topic_tests_list">("home");
  const [selectedCategory, setSelectedCategory] = useState<AptitudeCategory | null>(null);
  const [selectedMode, setSelectedMode] = useState<TestMode | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [topicTests, setTopicTests] = useState<any[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [session, setSession] = useState<AptitudeSession | null>(null);
  const [progress, setProgress] = useState<SessionProgress>({
    currentIdx: 0, answers: [], timeElapsed: 0, timeRemaining: 0, bookmarkedCount: 0, flaggedCount: 0
  });
  const [analytics, setAnalytics] = useState<PerformanceAnalytics | null>(null);
  const [review, setReview] = useState<SessionReviewType | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "analytics" | "history">("home");
  const [loadingStep, setLoadingStep] = useState(0);
  const [history, setHistory] = useState<AptitudeSession[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTopicTests = async (topic: string, cat?: string) => {
    setTestsLoading(true);
    try {
      const { data } = await api.get(`/aptitude/topic-tests?topic=${encodeURIComponent(topic)}&category=${encodeURIComponent(cat || selectedCategory || "quantitative")}`);
      if (data.success && data.tests) {
        setTopicTests(data.tests);
      }
    } catch (err) {
      console.error("Failed to load topic tests", err);
    } finally {
      setTestsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data } = await api.get("/aptitude/analytics");
      if (data.success && data.analytics) setAnalytics(data.analytics);
    } catch {}
  };

  const loadHistory = async () => {
    try {
      const { data } = await api.get("/aptitude/history");
      if (data.success && data.history) setHistory(data.history);
    } catch {}
  };

  useEffect(() => {
    if (view === "home" || view === "analytics" || view === "history") {
      loadAnalytics();
    }
  }, [view]);

  useEffect(() => {
    if (view === "history" && history.length === 0) {
      loadHistory();
    }
  }, [view]);

  useEffect(() => {
    if (aiLoading) {
      setLoadingStep(0);
      loadingTimerRef.current = setInterval(() => {
        setLoadingStep(prev => {
          if (prev >= LOADING_STEPS.length - 1) {
            clearInterval(loadingTimerRef.current!);
            return prev;
          }
          return prev + 1;
        });
      }, 600);
    }
    return () => {
      if (loadingTimerRef.current) clearInterval(loadingTimerRef.current);
    };
  }, [aiLoading]);

  const startSession = useCallback(async (
    mode: TestMode,
    category?: AptitudeCategory,
    topic?: string,
    company?: string,
    diff?: string,
    count?: number,
    testId?: string
  ) => {
    if (quota.exhausted) return;
    setAiLoading(true);
    setShowExplanation(false);
    try {
      const requestId = quota.newRequestId();
      const { data } = await api.post("/aptitude/session/start", {
        mode,
        category,
        topic,
        company,
        difficulty: diff || difficulty,
        count: count || 30,
        testId,
        requestId
      });
      if (data.success && data.session) {
        quota.onSuccess();
        setSession(data.session);
        const timeLimit = (mode === "timed_quiz" || mode === "company_test")
          ? (data.session.totalQuestions * 90 * 1000)
          : 0;
        setProgress({
          currentIdx: 0,
          answers: [],
          timeElapsed: 0,
          timeRemaining: timeLimit,
          bookmarkedCount: 0,
          flaggedCount: 0
        });
        setSessionStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setViewState("active_session");
      }
    } catch (err: any) {
      if (!quota.handleQuotaError(err)) {
        await quota.onFailure();
        const msg = err?.response?.data?.error || "Failed to start session";
        alert(msg);
      }
    } finally {
      setAiLoading(false);
    }
  }, [difficulty, quota]);

  const startDailyChallenge = useCallback(async () => {
    setAiLoading(true);
    try {
      const { data } = await api.post("/aptitude/daily-challenge");
      if (data.success && data.session) {
        setSession(data.session);
        setProgress({
          currentIdx: 0, answers: [], timeElapsed: 0, timeRemaining: data.session.totalQuestions * 60 * 1000,
          bookmarkedCount: 0, flaggedCount: 0
        });
        setSessionStartTime(Date.now());
        setQuestionStartTime(Date.now());
        setViewState("active_session");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to start daily challenge";
      alert(msg);
    } finally {
      setAiLoading(false);
    }
  }, []);

  const submitAnswer = useCallback(async (selectedIdx: number | null) => {
    if (!session) return;
    const currentQ = session.questions[progress.currentIdx];
    if (!currentQ) return;
    const timeTakenMs = Date.now() - questionStartTime;
    const isCorrect = selectedIdx !== null && selectedIdx === currentQ.correctIdx;

    setProgress(prev => {
      const existing = prev.answers.find(a => a.questionIdx === progress.currentIdx);
      const updatedAnswer: AptitudeAnswer = {
        questionIdx: progress.currentIdx,
        questionId: currentQ.id,
        selectedIdx,
        correct: isCorrect,
        timeTakenMs,
        bookmarked: existing?.bookmarked ?? false,
        flagged: existing?.flagged ?? false,
        notes: existing?.notes ?? ""
      };
      const filtered = prev.answers.filter(a => a.questionIdx !== progress.currentIdx);
      return {
        ...prev,
        answers: [...filtered, updatedAnswer]
      };
    });

    try {
      await api.post("/aptitude/session/answer", {
        sessionId: session.id,
        questionIdx: progress.currentIdx,
        selectedIdx,
        timeTakenMs
      });
    } catch {}

    setQuestionStartTime(Date.now());
  }, [session, progress.currentIdx, questionStartTime]);

  const handleCompleteSession = useCallback(async () => {
    if (!session) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const totalTimeMs = Date.now() - sessionStartTime;
    const answers = progress.answers;

    const correctCount = answers.filter(a => a.correct).length;
    const incorrectCount = answers.filter(a => !a.correct && a.selectedIdx !== null).length;
    const skippedCount = session.totalQuestions - answers.length;
    const accuracy = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
    const avgTime = answers.length > 0 ? Math.round(answers.reduce((s, a) => s + a.timeTakenMs, 0) / answers.length) : 0;

    const fallbackReview = {
      sessionId: session.id,
      score: correctCount,
      accuracy,
      totalTimeMs,
      avgTimePerQMs: avgTime,
      xpEarned: Math.round(accuracy * session.totalQuestions * 0.1),
      correctCount,
      incorrectCount,
      skippedCount,
      weakTopics: [] as string[],
      strongTopics: [] as string[],
      questionReviews: answers.map((a) => ({
        question: session.questions[a.questionIdx],
        userAnswer: a.selectedIdx,
        isCorrect: a.correct,
        timeTakenMs: a.timeTakenMs,
        commonMistakes: session.questions[a.questionIdx]?.commonMistakes || []
      })),
      aiInsights: `You scored ${accuracy}% on this session. Keep practicing to improve!`,
      studyPlan: "Focus on the topics where you scored below 60%.",
      improvementSuggestions: ["Practice more questions daily", "Review explanations for incorrect answers"]
    };

    try {
      const { data } = await api.post("/aptitude/session/complete", {
        sessionId: session.id,
        answers,
        totalTimeMs
      });
      if (data.success) {
        const aiReview = data.review || {};
        const mappedReview = {
          sessionId: data.sessionId || session.id,
          score: data.score ?? correctCount,
          accuracy: data.accuracy ?? accuracy,
          totalTimeMs: data.timeTakenMs ?? totalTimeMs,
          avgTimePerQMs: data.avgTimePerQMs ?? avgTime,
          xpEarned: data.xpEarned ?? fallbackReview.xpEarned,
          correctCount: correctCount,
          incorrectCount,
          skippedCount,
          weakTopics: data.weakTopics ?? [],
          strongTopics: data.strongTopics ?? [],
          questionReviews: fallbackReview.questionReviews,
          aiInsights: aiReview.coachMessage || aiReview.improvementAreas?.join(". ") || fallbackReview.aiInsights,
          studyPlan: aiReview.nextSteps?.join(". ") || fallbackReview.studyPlan,
          improvementSuggestions: aiReview.improvementAreas || aiReview.missedConcepts || fallbackReview.improvementSuggestions
        };
        setReview(mappedReview);
        setViewState("session_review");
      }
    } catch {
      setReview(fallbackReview);
      setViewState("session_review");
    }
    setSession(null);
  }, [session, progress.answers, sessionStartTime]);

  const handleNextQuestion = useCallback(() => {
    if (!session) return;
    const nextIdx = progress.currentIdx + 1;
    if (nextIdx >= session.questions.length) {
      handleCompleteSession();
    } else {
      setProgress(prev => ({ ...prev, currentIdx: nextIdx }));
      setQuestionStartTime(Date.now());
      setShowExplanation(false);
    }
  }, [session, progress.currentIdx]);

  useEffect(() => {
    if (session && view === "active_session") {
      if (session.mode === "timed_quiz" || session.mode === "company_test") {
        timerRef.current = setInterval(() => {
          setProgress(prev => {
            if (prev.timeRemaining <= 1000) {
              clearInterval(timerRef.current!);
              handleCompleteSession();
              return { ...prev, timeRemaining: 0 };
            }
            return { ...prev, timeElapsed: prev.timeElapsed + 1000, timeRemaining: prev.timeRemaining - 1000 };
          });
        }, 1000);
      } else {
        timerRef.current = setInterval(() => {
          setProgress(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 1000 }));
        }, 1000);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.id, view]);

  const toggleBookmark = useCallback((idx: number) => {
    setProgress(prev => {
      const existing = prev.answers.find(a => a.questionIdx === idx);
      const filtered = prev.answers.filter(a => a.questionIdx !== idx);
      const updated: AptitudeAnswer = existing
        ? { ...existing, bookmarked: !existing.bookmarked }
        : {
            questionIdx: idx,
            questionId: session?.questions[idx]?.id || "",
            selectedIdx: null,
            correct: false,
            timeTakenMs: 0,
            bookmarked: true,
            flagged: false,
            notes: ""
          };
      const newAnswers = [...filtered, updated];
      const bookmarkedCount = newAnswers.filter(a => a.bookmarked).length;
      return { ...prev, answers: newAnswers, bookmarkedCount };
    });
  }, [session]);

  const toggleFlag = useCallback((idx: number) => {
    setProgress(prev => {
      const existing = prev.answers.find(a => a.questionIdx === idx);
      const filtered = prev.answers.filter(a => a.questionIdx !== idx);
      const updated: AptitudeAnswer = existing
        ? { ...existing, flagged: !existing.flagged }
        : {
            questionIdx: idx,
            questionId: session?.questions[idx]?.id || "",
            selectedIdx: null,
            correct: false,
            timeTakenMs: 0,
            bookmarked: false,
            flagged: true,
            notes: ""
          };
      const newAnswers = [...filtered, updated];
      const flaggedCount = newAnswers.filter(a => a.flagged).length;
      return { ...prev, answers: newAnswers, flaggedCount };
    });
  }, [session]);

  const addNote = useCallback((idx: number, note: string) => {
    setProgress(prev => {
      const existing = prev.answers.find(a => a.questionIdx === idx);
      const filtered = prev.answers.filter(a => a.questionIdx !== idx);
      const updated: AptitudeAnswer = existing
        ? { ...existing, notes: note }
        : {
            questionIdx: idx,
            questionId: session?.questions[idx]?.id || "",
            selectedIdx: null,
            correct: false,
            timeTakenMs: 0,
            bookmarked: false,
            flagged: false,
            notes: note
          };
      const newAnswers = [...filtered, updated];
      return { ...prev, answers: newAnswers };
    });
  }, [session]);

  const navigateToQuestion = useCallback((idx: number) => {
    setProgress(prev => ({ ...prev, currentIdx: idx }));
    setQuestionStartTime(Date.now());
    setShowExplanation(false);
  }, []);

  const handleGoHome = useCallback(() => {
    setViewState("home");
    setSession(null);
    setReview(null);
    setActiveTab("home");
  }, []);

  const handlePracticeAgain = useCallback(() => {
    if (review && review.weakTopics.length > 0) {
      setViewState("home");
      setReview(null);
    } else {
      handleGoHome();
    }
  }, [review]);

  const handleViewAnalytics = useCallback(() => {
    setViewState("analytics");
    setActiveTab("analytics");
    setReview(null);
  }, []);

  const handleNextRecommended = useCallback(() => {
    setReview(null);
    setViewState("home");
  }, []);

  const currentQuestion = session?.questions[progress.currentIdx] || null;
  const currentAnswer = progress.answers.find(a => a.questionIdx === progress.currentIdx) || null;
  const isTimedMode = session?.mode === "timed_quiz" || session?.mode === "company_test";
  const progressPercent = session ? Math.round(((progress.answers.length) / session.totalQuestions) * 100) : 0;

  const getAnswerStatusForNav = (idx: number): "correct" | "incorrect" | "skipped" | "current" | "unanswered" => {
    if (idx === progress.currentIdx) return "current";
    const answer = progress.answers.find(a => a.questionIdx === idx);
    if (!answer) return "unanswered";
    if (answer.selectedIdx === null) return "skipped";
    if (answer.correct) return "correct";
    return "incorrect";
  };

  const navColors: Record<string, { bg: string; border: string; text: string }> = {
    current: { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.5)", text: "#f59e0b" },
    correct: { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.4)", text: "#10b981" },
    incorrect: { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.4)", text: "#ef4444" },
    skipped: { bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.3)", text: "#94a3b8" },
    unanswered: { bg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", text: c.textMuted }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative flex flex-col h-full min-h-[calc(100vh-120px)]" style={{ color: c.text }}>

      <AnimatePresence>
        {aiLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{ background: isDark ? "rgba(8,7,16,0.92)" : "rgba(240,244,255,0.92)" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="p-8 rounded-3xl border max-w-sm w-full mx-4 space-y-6"
              style={{ background: c.cardBg, borderColor: c.border }}
            >
              <div className="text-center space-y-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-14 h-14 mx-auto rounded-full border-2 border-t-transparent flex items-center justify-center"
                  style={{ borderColor: `${c.primary}40`, borderTopColor: "transparent" }}
                >
                  <Sparkles size={22} className="text-amber-500" />
                </motion.div>
                <h3 className="text-sm font-extrabold" style={{ color: c.text }}>Setting Up Your Session</h3>
                <p className="text-xs" style={{ color: c.textMuted }}>AI is crafting personalized questions...</p>
              </div>

              <div className="space-y-2">
                {LOADING_STEPS.map((step, idx) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: idx <= loadingStep ? 1 : 0.3, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{
                      background: idx < loadingStep ? `${c.green}20` : idx === loadingStep ? `${c.primary}20` : "transparent",
                      border: `1.5px solid ${idx < loadingStep ? c.green : idx === loadingStep ? c.primary : c.border}`
                    }}>
                      {idx < loadingStep ? (
                        <CheckCircle2 size={11} style={{ color: c.green }} />
                      ) : idx === loadingStep ? (
                        <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
                          <CircleDot size={9} style={{ color: c.primary }} />
                        </motion.div>
                      ) : (
                        <div className="w-2 h-2 rounded-full" style={{ background: c.border }} />
                      )}
                    </div>
                    <span className="text-xs font-semibold" style={{
                      color: idx <= loadingStep ? c.text : c.textMuted
                    }}>
                      {step}
                    </span>
                  </motion.div>
                ))}
              </div>

              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                <motion.div
                  animate={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${c.primary}, ${c.primaryDark})` }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b pb-2.5 shrink-0" style={{ borderColor: c.border }}>
          <div className="flex items-center gap-3">
            {view !== "home" && view !== "analytics" && view !== "history" && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleGoHome}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                style={{ borderColor: c.border, color: c.textSec }}
              >
                <ArrowLeft size={14} />
              </motion.button>
            )}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">AI Aptitude Engine</p>
              <h2 className="text-base font-extrabold" style={{ fontFamily: "var(--font-sans)" }}>
                {view === "home" && activeTab === "home" && "Aptitude Hub"}
                {view === "home" && activeTab === "analytics" && "Performance Analytics"}
                {view === "home" && activeTab === "history" && "Session History"}
                {view === "topic_select" && "Select Topic"}
                {view === "active_session" && session?.mode?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                {view === "session_review" && "Session Review"}
                {view === "analytics" && "Analytics Dashboard"}
                {view === "company_select" && "Company Tests"}
                {view === "daily_challenge" && "Daily Challenge"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view === "active_session" && session && (
              <div className="flex items-center gap-3">
                {isTimedMode && (
                  <motion.div
                    animate={progress.timeRemaining < 60000 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-black"
                    style={{
                      background: progress.timeRemaining < 60000 ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                      borderColor: progress.timeRemaining < 60000 ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)",
                      color: progress.timeRemaining < 60000 ? "#ef4444" : "#f59e0b"
                    }}
                  >
                    <Clock size={13} />
                    {formatTimeMs(progress.timeRemaining)}
                  </motion.div>
                )}
                {!isTimedMode && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold" style={{
                    background: "rgba(16,185,129,0.1)",
                    borderColor: "rgba(16,185,129,0.3)",
                    color: "#10b981"
                  }}>
                    <Clock size={13} />
                    {formatTimeMs(progress.timeElapsed)}
                  </div>
                )}
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                  <motion.div
                    animate={{ width: `${progressPercent}%` }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${c.primary}, ${c.primaryDark})` }}
                  />
                </div>
                <span className="text-[10px] font-black" style={{ color: c.textMuted }}>
                  {progress.answers.length}/{session.totalQuestions}
                </span>
              </div>
            )}
            {view !== "active_session" && (
              <FeatureCreditBadge featureKey="AI_APTITUDE_ENGINE" isDark={isDark} compact />
            )}
            {view !== "active_session" && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  if (activeTab === "analytics") {
                    setActiveTab("home");
                    setViewState("home");
                  } else {
                    setActiveTab("analytics");
                    setViewState("home");
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20"
              >
                <BarChart3 size={12} />
                {activeTab === "analytics" ? "Home" : "Analytics"}
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">

            {view === "home" && activeTab === "home" && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">

                <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-6 rounded-2xl border text-center relative overflow-hidden" style={{
                  background: `linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))`,
                  borderColor: "rgba(245,158,11,0.2)"
                }}>
                  <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                    <Brain size={30} className="text-amber-500" />
                  </motion.div>
                  <h2 className="text-lg font-black" style={{ color: c.text }}>AI Aptitude Engine</h2>
                  <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: c.textSec }}>
                    Master placement aptitude with AI-powered personalized practice, company-specific tests, and adaptive learning.
                  </p>
                </motion.div>

                {analytics && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: "Sessions", value: analytics.totalSessions, icon: Layers, color: "#3b82f6" },
                      { label: "Accuracy", value: `${analytics.overallAccuracy}%`, icon: Target, color: analytics.overallAccuracy >= 70 ? "#10b981" : "#f59e0b" },
                      { label: "XP", value: analytics.xp, icon: Zap, color: "#f59e0b" },
                      { label: "Streak", value: `${analytics.streak}d`, icon: Flame, color: "#ef4444" },
                      { label: "Level", value: analytics.level, icon: Award, color: "#8b5cf6" }
                    ].map((stat, i) => (
                      <motion.div key={stat.label} variants={scaleIn} initial="hidden" animate="visible" custom={i} className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}>
                            <stat.icon size={14} style={{ color: stat.color }} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>{stat.label}</span>
                        </div>
                        <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {/* ─── PLACEMENT IMPACT ──────────────────────────── */}
                <div style={{ background: "transparent" }}>
                  <PlacementImpactCard accentColor="#8b5cf6" onNavigate={(v) => {
                    try { localStorage.setItem("dashboard-active-view", v); } catch {}
                    router.push("/dashboard/user");
                  }} />
                </div>

                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Categories</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {APTITUDE_CATEGORIES.map((cat, i) => {
                      const IconComp = CATEGORY_ICON_MAP[cat.icon] || Brain;
                      return (
                        <motion.div
                          key={cat.id}
                          variants={scaleIn}
                          initial="hidden"
                          animate="visible"
                          custom={i}
                          whileHover={{ y: -4, scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { setSelectedCategory(cat.id); setViewState("topic_select"); }}
                          className="p-5 border rounded-2xl cursor-pointer transition-all"
                          style={{ background: c.cardBg, borderColor: c.border }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${cat.color}15` }}>
                            <IconComp size={20} style={{ color: cat.color }} />
                          </div>
                          <p className="text-xs font-extrabold" style={{ color: c.text }}>{cat.name}</p>
                          <p className="text-[10px] mt-1 leading-relaxed" style={{ color: c.textMuted }}>{cat.description}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${cat.color}15`, color: cat.color }}>
                              {TOPICS_BY_CATEGORY[cat.id]?.length || 0} topics
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>


                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="p-5 rounded-2xl border relative overflow-hidden cursor-pointer" style={{
                  background: `linear-gradient(135deg, rgba(239,68,68,0.08), rgba(236,72,153,0.06))`,
                  borderColor: "rgba(239,68,68,0.2)"
                }} onClick={startDailyChallenge}>
                  <div className="flex items-center gap-4">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.15)" }}>
                      <Flame size={26} className="text-red-500" />
                    </motion.div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold" style={{ color: c.text }}>Daily Challenge</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Today</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: c.textSec }}>Mixed topics from all categories. Compete and earn bonus XP!</p>
                    </div>
                    <ArrowRight size={18} className="text-red-500 shrink-0" />
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Company Tests</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {COMPANY_PRESETS.slice(0, 8).map((company, i) => (
                      <motion.div
                        key={company.id}
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setSelectedCompany(company.id); setSelectedMode("company_test"); setViewState("company_select"); }}
                        className="p-4 border rounded-2xl cursor-pointer transition-all"
                        style={{ background: c.cardBg, borderColor: c.border }}
                      >
                        <CompanyLogo companyId={company.id} companyName={company.name} size={40} color={company.color} className="mb-2" theme={theme} />
                        <p className="text-[11px] font-extrabold" style={{ color: c.text }}>{company.name}</p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                            {company.difficulty}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                            {company.questionCount}Q
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {COMPANY_PRESETS.length > 8 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setViewState("company_select")}
                      className="w-full p-3 border rounded-2xl text-center text-xs font-bold transition-colors"
                      style={{ borderColor: c.border, color: c.primary, background: `${c.primary}08` }}
                    >
                      View All {COMPANY_PRESETS.length} Companies
                    </motion.button>
                  )}
                </motion.div>

                {analytics && (analytics.weakTopics?.length || 0) > 0 && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6} className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-purple-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-purple-500">AI Recommendations</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)" }}>
                        <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-red-500 mb-0.5">Weak Areas Detected</p>
                          <p className="text-[11px] leading-relaxed" style={{ color: c.textSec }}>
                            Focus on: {analytics.weakTopics.slice(0, 3).join(", ")}
                            {analytics.weakTopics.length > 3 && ` +${analytics.weakTopics.length - 3} more`}
                          </p>
                        </div>
                      </div>
                      {(analytics.strongTopics?.length || 0) > 0 && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.06)" }}>
                          <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider text-green-500 mb-0.5">Strong Areas</p>
                            <p className="text-[11px] leading-relaxed" style={{ color: c.textSec }}>
                              {analytics.strongTopics.slice(0, 3).join(", ")} — keep it up!
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2.5 p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.06)" }}>
                        <Target size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 mb-0.5">Readiness Score</p>
                          <p className="text-[11px] leading-relaxed" style={{ color: c.textSec }}>
                            Placement readiness: {analytics.placementReadiness}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {analytics && analytics.weeklyProgress && analytics.weeklyProgress.length > 0 && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7} className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center gap-2">
                      <TrendingUp size={15} className="text-amber-500" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Weekly Progress</h3>
                    </div>
                    <div className="flex items-end gap-2 h-24">
                      {analytics.weeklyProgress.slice(-7).map((week, idx) => {
                        const maxAccuracy = 100;
                        const barHeight = (week.accuracy / maxAccuracy) * 100;
                        return (
                          <motion.div
                            key={week.week}
                            initial={{ height: 0 }}
                            animate={{ height: `${barHeight}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.05 }}
                            className="flex-1 rounded-t-lg relative group"
                            style={{ background: `linear-gradient(180deg, ${c.primary}, ${c.primaryDark})` }}
                          >
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.primary }}>
                              {week.accuracy}%
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      {analytics.weeklyProgress.slice(-7).map(week => (
                        <div key={week.week} className="flex-1 text-center">
                          <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                            {week.week.split("-").pop()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="h-4" />
              </motion.div>
            )}

            {view === "home" && activeTab === "analytics" && (
              <motion.div key="analytics-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                <AptitudeAnalytics
                  analytics={analytics}
                  theme={theme}
                  onBack={() => { setActiveTab("home"); }}
                  onPracticeTopic={(topic) => { setSelectedTopic(topic); setActiveTab("home"); startSession("practice", undefined, topic); }}
                  onCompanyTest={(company) => { setSelectedCompany(company); startSession("company_test", undefined, undefined, company); }}
                />
              </motion.div>
            )}

            {view === "home" && activeTab === "history" && (
              <motion.div key="history-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                <div className="grid grid-cols-3 gap-3">
                  <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Total Sessions</p>
                    <p className="text-2xl font-black mt-1" style={{ color: c.text }}>{history.length}</p>
                  </motion.div>
                  <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={1} className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Avg Accuracy</p>
                    <p className="text-2xl font-black mt-1" style={{ color: c.primary }}>
                      {history.length > 0 ? Math.round(history.reduce((s, h) => s + h.accuracy, 0) / history.length) : 0}%
                    </p>
                  </motion.div>
                  <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={2} className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Total XP</p>
                    <p className="text-2xl font-black mt-1 text-amber-500">{history.reduce((s, h) => s + h.xpEarned, 0)}</p>
                  </motion.div>
                </div>

                {history.length > 0 ? (
                  <div className="space-y-2">
                    {history.map((session, i) => (
                      <motion.div
                        key={session.id || i}
                        variants={fadeUp}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        className="p-4 border rounded-2xl flex items-center gap-4"
                        style={{ background: c.cardBg, borderColor: c.border }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                          background: session.accuracy >= 70 ? "rgba(16,185,129,0.12)" : session.accuracy >= 40 ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)"
                        }}>
                          {session.accuracy >= 70 ? <Trophy size={18} className="text-green-500" /> : session.accuracy >= 40 ? <Target size={18} className="text-amber-500" /> : <RotateCcw size={18} className="text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-extrabold truncate" style={{ color: c.text }}>
                              {session.mode?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                              {session.company && ` — ${session.company}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[9px] font-bold" style={{ color: session.accuracy >= 70 ? c.green : session.accuracy >= 40 ? c.primary : c.red }}>
                              {session.accuracy}%
                            </span>
                            <span className="text-[9px]" style={{ color: c.textMuted }}>
                              {session.totalQuestions}Q
                            </span>
                            <span className="text-[9px]" style={{ color: c.textMuted }}>
                              {session.xpEarned} XP
                            </span>
                            {session.startedAt && (
                              <span className="text-[9px]" style={{ color: c.textMuted }}>
                                {new Date(session.startedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} style={{ color: c.textMuted }} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="p-10 border rounded-2xl text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                    <History size={28} className="text-amber-500/40 mx-auto mb-2" />
                    <p className="text-sm font-extrabold" style={{ color: c.text }}>No sessions yet</p>
                    <p className="text-xs mt-1" style={{ color: c.textMuted }}>Complete your first session to see history.</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {view === "topic_select" && (
              <motion.div key="topic-select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                {selectedCategory && (
                  <>
                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                        background: `${APTITUDE_CATEGORIES.find(c => c.id === selectedCategory)?.color || c.primary}15`
                      }}>
                        {(() => {
                          const cat = APTITUDE_CATEGORIES.find(c => c.id === selectedCategory);
                          const Icon = cat ? CATEGORY_ICON_MAP[cat.icon] || Brain : Brain;
                          return <Icon size={20} style={{ color: cat?.color || c.primary }} />;
                        })()}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
                          {selectedMode?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || "Practice"} Mode
                        </p>
                        <h3 className="text-sm font-extrabold" style={{ color: c.text }}>
                          {APTITUDE_CATEGORIES.find(c => c.id === selectedCategory)?.name || "Select Topic"}
                        </h3>
                      </div>
                    </motion.div>

                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Difficulty:</span>
                      {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
                        <motion.button
                          key={key}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setDifficulty(key)}
                          className="px-3 py-1 rounded-full text-[10px] font-bold border transition-all"
                          style={{
                            background: difficulty === key ? `${config.color}20` : "transparent",
                            borderColor: difficulty === key ? `${config.color}40` : c.border,
                            color: difficulty === key ? config.color : c.textMuted
                          }}
                        >
                          {config.label}
                        </motion.button>
                      ))}
                    </motion.div>

                    <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => startSession(selectedMode || "practice", selectedCategory, undefined, undefined, difficulty)}
                        className="w-full p-4 rounded-2xl border text-left flex items-center gap-4 transition-all"
                        style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.25)" }}
                      >
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                          <Shuffle size={22} className="text-amber-500" />
                        </div>
                        <div>
                          <p className="text-xs font-extrabold" style={{ color: c.text }}>Mixed Practice</p>
                          <p className="text-[10px]" style={{ color: c.textSec }}>AI-selected questions across all topics in this category</p>
                        </div>
                        <ArrowRight size={16} className="text-amber-500 ml-auto shrink-0" />
                      </motion.button>
                    </motion.div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {(TOPICS_BY_CATEGORY[selectedCategory] || []).map((topic, i) => {
                        const topicMastery = analytics?.topicMastery?.find(tm => tm.topic === topic);
                        return (
                          <motion.div
                            key={topic}
                            variants={scaleIn}
                            initial="hidden"
                            animate="visible"
                            custom={i}
                            whileHover={{ y: -3, scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                              setSelectedTopic(topic);
                              setViewState("topic_tests_list");
                              loadTopicTests(topic, selectedCategory || undefined);
                            }}
                            className="p-4 border rounded-2xl cursor-pointer transition-all"
                            style={{ background: c.cardBg, borderColor: c.border }}
                          >
                            <p className="text-[11px] font-extrabold" style={{ color: c.text }}>{topic}</p>
                            {topicMastery ? (
                              <div className="mt-2 space-y-1">
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                                  <div className="h-full rounded-full" style={{
                                    width: `${topicMastery.accuracy}%`,
                                    background: topicMastery.accuracy >= 70 ? c.green : topicMastery.accuracy >= 40 ? c.primary : c.red
                                  }} />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold" style={{ color: c.textMuted }}>
                                  <span>{topicMastery.totalCorrect}/{topicMastery.totalAttempted}</span>
                                  <span style={{ color: topicMastery.accuracy >= 70 ? c.green : topicMastery.accuracy >= 40 ? c.primary : c.red }}>
                                    {topicMastery.accuracy}%
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-[9px] mt-1.5" style={{ color: c.textMuted }}>Click to view tests (30 Qs)</p>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {view === "topic_tests_list" && (
              <motion.div key="topic-tests-list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewState("topic_select")}
                    className="w-8 h-8 rounded-lg flex items-center justify-center border"
                    style={{ borderColor: c.border, color: c.textSec }}
                  >
                    <ArrowLeft size={14} />
                  </motion.button>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">{selectedCategory || "Aptitude"}</span>
                    <h3 className="text-base font-extrabold" style={{ color: c.text }}>{selectedTopic} — Available Tests</h3>
                  </div>
                </div>

                {testsLoading ? (
                  <div className="p-8 text-center text-xs text-amber-500 animate-pulse font-bold">
                    Fetching stored tests from database...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {topicTests.map((t, idx) => (
                      <motion.div
                        key={t.id || idx}
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-5 border rounded-2xl flex flex-col justify-between space-y-4"
                        style={{ background: c.cardBg, borderColor: c.border }}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                              {t.difficulty || "medium"}
                            </span>
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">30 Questions</span>
                          </div>
                          <h4 className="text-sm font-extrabold" style={{ color: c.text }}>{t.title || `Test ${t.testNumber || idx + 1}`}</h4>
                          <p className="text-[11px]" style={{ color: c.textMuted }}>30 placement questions • Stored in DB</p>
                        </div>

                        {t.completed ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span style={{ color: c.textSec }}>Last Score:</span>
                              <span className="text-emerald-400 font-extrabold">{t.score}/30 ({Math.round((t.score / 30) * 100)}%)</span>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => startSession("topic_test", selectedCategory || undefined, selectedTopic, undefined, t.difficulty, 30, t.id)}
                              className="w-full py-2.5 rounded-xl text-xs font-bold text-amber-500 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
                            >
                              Retake {t.title || `Test ${idx + 1}`}
                            </motion.button>
                          </div>
                        ) : (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => startSession("topic_test", selectedCategory || undefined, selectedTopic, undefined, t.difficulty, 30, t.id)}
                            className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-md hover:from-amber-400 hover:to-amber-500"
                          >
                            Start {t.title || `Test ${idx + 1}`}
                          </motion.button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {view === "active_session" && session && currentQuestion && (
              <motion.div key="active-session" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex gap-4 h-[calc(100vh-160px)]">
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <QuestionCard
                    question={currentQuestion}
                    questionNumber={progress.currentIdx + 1}
                    totalQuestions={session.totalQuestions}
                    answer={currentAnswer}
                    theme={theme}
                    showExplanation={showExplanation}
                    timeElapsed={Math.floor((Date.now() - questionStartTime) / 1000)}
                    onSelectOption={(idx) => {
                      // Handled locally in QuestionCard for smooth state transition
                    }}
                    onSubmit={(selectedIdx) => {
                      submitAnswer(selectedIdx ?? null);
                    }}
                    onNext={handleNextQuestion}
                    onBookmark={() => toggleBookmark(progress.currentIdx)}
                    onFlag={() => toggleFlag(progress.currentIdx)}
                    onAddNote={(note) => addNote(progress.currentIdx, note)}
                    onToggleExplanation={() => setShowExplanation(!showExplanation)}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hidden lg:flex flex-col w-56 shrink-0 border rounded-2xl p-3 space-y-3 overflow-y-auto custom-scrollbar"
                  style={{ background: c.cardBg, borderColor: c.border }}
                >
                  <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Questions</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {session.questions.map((_, idx) => {
                        const status = getAnswerStatusForNav(idx);
                        const colors = navColors[status];
                        return (
                          <motion.button
                            key={idx}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigateToQuestion(idx)}
                            className="w-full aspect-square rounded-lg text-[9px] font-black flex items-center justify-center transition-all border"
                            style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}
                          >
                            {idx + 1}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t pt-2 space-y-1.5" style={{ borderColor: c.border }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded" style={{ background: navColors.current.bg, border: `1px solid ${navColors.current.border}` }} />
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Current</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded" style={{ background: navColors.correct.bg, border: `1px solid ${navColors.correct.border}` }} />
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Correct</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded" style={{ background: navColors.incorrect.bg, border: `1px solid ${navColors.incorrect.border}` }} />
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Incorrect</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded" style={{ background: navColors.skipped.bg, border: `1px solid ${navColors.skipped.border}` }} />
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Skipped</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded" style={{ background: navColors.unanswered.bg, border: `1px solid ${navColors.unanswered.border}` }} />
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Unanswered</span>
                    </div>
                  </div>

                  {progress.bookmarkedCount > 0 && (
                    <div className="border-t pt-2 space-y-1.5" style={{ borderColor: c.border }}>
                      <div className="flex items-center gap-1.5">
                        <BookmarkCheck size={11} className="text-amber-500" />
                        <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>Bookmarked ({progress.bookmarkedCount})</span>
                      </div>
                      <div className="space-y-1">
                        {progress.answers.filter(a => a.bookmarked).map((a) => (
                          <motion.button
                            key={a.questionIdx}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => navigateToQuestion(a.questionIdx)}
                            className="w-full text-left p-1.5 rounded-lg text-[9px] font-bold truncate"
                            style={{ background: "rgba(245,158,11,0.08)", color: c.primary }}
                          >
                            Q{a.questionIdx + 1}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {progress.flaggedCount > 0 && (
                    <div className="border-t pt-2 space-y-1.5" style={{ borderColor: c.border }}>
                      <div className="flex items-center gap-1.5">
                        <Flag size={11} className="text-red-500" />
                        <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>Flagged ({progress.flaggedCount})</span>
                      </div>
                      <div className="space-y-1">
                        {progress.answers.filter(a => a.flagged).map((a) => (
                          <motion.button
                            key={a.questionIdx}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => navigateToQuestion(a.questionIdx)}
                            className="w-full text-left p-1.5 rounded-lg text-[9px] font-bold truncate"
                            style={{ background: "rgba(239,68,68,0.08)", color: c.red }}
                          >
                            Q{a.questionIdx + 1}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-2" style={{ borderColor: c.border }}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCompleteSession}
                      className="w-full py-2 px-3 rounded-xl text-[10px] font-extrabold transition-colors"
                      style={{ background: `${c.red}15`, color: c.red, border: `1px solid ${c.red}25` }}
                    >
                      Submit Test
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {view === "session_review" && review && (
              <motion.div key="session-review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                <SessionReviewComponent
                  review={review}
                  theme={theme}
                  onPracticeAgain={handlePracticeAgain}
                  onGoHome={handleGoHome}
                  onViewAnalytics={handleViewAnalytics}
                  onNextRecommended={handleNextRecommended}
                />
              </motion.div>
            )}

            {view === "analytics" && (
              <motion.div key="analytics-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                <AptitudeAnalytics
                  analytics={analytics}
                  theme={theme}
                  onBack={handleGoHome}
                  onPracticeTopic={(topic) => { setSelectedTopic(topic); setActiveTab("home"); startSession("practice", undefined, topic); }}
                  onCompanyTest={(company) => { setSelectedCompany(company); startSession("company_test", undefined, undefined, company); }}
                />
              </motion.div>
            )}

            {view === "company_select" && (
              <motion.div key="company-select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)" }}>
                    <Building2 size={20} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Company Specific</p>
                    <h3 className="text-sm font-extrabold" style={{ color: c.text }}>Select Company</h3>
                  </div>
                </motion.div>

                {analytics?.companyReadiness && analytics.companyReadiness.length > 0 && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {analytics.companyReadiness.map((cr, i) => (
                      <motion.div key={cr.company} variants={scaleIn} initial="hidden" animate="visible" custom={i} className="p-3 border rounded-xl" style={{ background: c.cardBg, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-black" style={{ color: cr.ready ? c.green : c.primary }}>{cr.company}</span>
                          {cr.ready && <CheckCircle2 size={12} className="text-green-500" />}
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${cr.score}%`, background: cr.score >= 70 ? c.green : cr.score >= 40 ? c.primary : c.red }} />
                        </div>
                        <p className="text-[9px] font-bold mt-1" style={{ color: c.textMuted }}>{cr.score}% ready</p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {COMPANY_PRESETS.map((company, i) => {
                    const readiness = analytics?.companyReadiness?.find(cr => cr.company === company.id);
                    return (
                      <motion.div
                        key={company.id}
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        whileHover={{ y: -4, scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setSelectedCompany(company.id);
                          setSelectedMode("company_test");
                          startSession("company_test", undefined, undefined, company.id, company.difficulty, company.questionCount);
                        }}
                        className="p-5 border rounded-2xl cursor-pointer transition-all relative overflow-hidden"
                        style={{ background: c.cardBg, borderColor: c.border }}
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[40px]" style={{ background: `${company.color}10` }} />
                        <div className="relative z-10">
                          <CompanyLogo companyId={company.id} companyName={company.name} size={48} color={company.color} className="mb-3" theme={theme} />
                          <p className="text-sm font-extrabold" style={{ color: c.text }}>{company.name}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                              {company.difficulty}
                            </span>
                            <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
                              {company.questionCount}Q · {company.durationMin}min
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {company.focusCategories.map(cat => (
                              <span key={cat} className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ background: `${APTITUDE_CATEGORIES.find(ac => ac.id === cat)?.color || c.primary}15`, color: APTITUDE_CATEGORIES.find(ac => ac.id === cat)?.color || c.primary }}>
                                {cat.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                          {readiness && (
                            <div className="mt-2.5 pt-2 border-t" style={{ borderColor: c.border }}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Readiness</span>
                                <span className="text-[9px] font-black" style={{ color: readiness.ready ? c.green : c.primary }}>
                                  {readiness.score}%
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {view === "daily_challenge" && (
              <motion.div key="daily-challenge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
                <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-8 rounded-2xl border text-center relative overflow-hidden" style={{
                  background: `linear-gradient(135deg, rgba(239,68,68,0.1), rgba(236,72,153,0.06))`,
                  borderColor: "rgba(239,68,68,0.25)"
                }}>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.15)" }}
                  >
                    <Flame size={36} className="text-red-500" />
                  </motion.div>
                  <h2 className="text-xl font-black" style={{ color: c.text }}>Daily Challenge</h2>
                  <p className="text-xs mt-2 max-w-md mx-auto" style={{ color: c.textSec }}>
                    A curated mix of questions from all categories. Earn bonus XP and maintain your streak!
                  </p>
                  <div className="flex items-center justify-center gap-6 mt-5">
                    <div className="text-center">
                      <p className="text-lg font-black text-amber-500">15</p>
                      <p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Questions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-green-500">+50</p>
                      <p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Bonus XP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-red-500">15m</p>
                      <p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Time Limit</p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={startDailyChallenge}
                    className="mt-6 py-3 px-8 rounded-xl bg-red-500 text-white font-extrabold text-sm hover:bg-red-400 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Play size={16} /> Start Challenge
                  </motion.button>
                </motion.div>

                {analytics && analytics.streak > 0 && (
                  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="p-5 rounded-2xl border flex items-center gap-4" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                      <Flame size={22} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold" style={{ color: c.text }}>{analytics.streak} Day Streak!</p>
                      <p className="text-[10px]" style={{ color: c.textSec }}>Keep it going — complete today&apos;s challenge to maintain your streak.</p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
