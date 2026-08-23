"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import confetti from "canvas-confetti";
import CountUp from "react-countup";
import {
  Sparkles, Layers, ArrowLeft, ArrowRight, Flame, Award,
  CheckCircle2, AlertCircle, Play, RotateCw, Sliders,
  Brain, Terminal, Lightbulb, RefreshCw, X
} from "lucide-react";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { getAuthUser } from "@/hooks/useAuth";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";
import { toast } from "sonner";
import { AIContent } from "@/components/ai/AIContent";

const mkColors = (theme: string) => {
  const isDark = theme === "dark";
  return {
    isDark,
    text:         isDark ? "#f3f4f6"              : "#0f172a",
    textSec:      isDark ? "#9ca3af"              : "#334155",
    textMuted:    isDark ? "#6b7280"              : "#64748b",
    textOnAmber:  isDark ? "#000000"              : "#000000",
    bg:           isDark ? "rgba(255,255,255,0.025)" : "#ffffff",
    bgHover:      isDark ? "rgba(255,255,255,0.04)"  : "#f8fafc",
    surface:      isDark ? "rgba(255,255,255,0.03)"  : "rgba(0,0,0,0.03)",
    surfaceHover: isDark ? "rgba(255,255,255,0.06)"  : "rgba(0,0,0,0.05)",
    border:       isDark ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.1)",
    borderHover:  isDark ? "rgba(255,255,255,0.15)"  : "rgba(0,0,0,0.2)",
    borderFocus:  isDark ? "rgba(245,158,11,0.45)"   : "rgba(245,158,11,0.5)",
    inputBg:      isDark ? "rgba(0,0,0,0.35)"        : "#f8fafc",
    cardBg:       isDark ? "rgba(255,255,255,0.03)"  : "#ffffff",
    cardBgAlt:    isDark ? "rgba(0,0,0,0.25)"        : "#f1f5f9",
    stickyBg:     isDark ? "rgba(10,10,20,0.88)"     : "rgba(255,255,255,0.92)",
    amber:        "#f59e0b",
    amberBg:      isDark ? "rgba(245,158,11,0.1)"    : "rgba(245,158,11,0.1)",
    amberBorder:  isDark ? "rgba(245,158,11,0.25)"   : "rgba(245,158,11,0.3)",
    amberActive:  isDark ? "rgba(245,158,11,0.15)"   : "rgba(245,158,11,0.15)",
    rose:         "#f43f5e",
    roseBg:       isDark ? "rgba(244,63,94,0.1)"     : "rgba(244,63,94,0.08)",
    roseBorder:   isDark ? "rgba(244,63,94,0.25)"    : "rgba(244,63,94,0.3)",
    cyanBg:       isDark ? "rgba(6,182,212,0.08)"    : "rgba(6,182,212,0.08)",
    cyanBorder:   isDark ? "rgba(6,182,212,0.2)"     : "rgba(6,182,212,0.25)",
    green:        isDark ? "#10b981"                 : "#059669",
    greenBg:      isDark ? "rgba(16,185,129,0.12)"   : "rgba(5,150,105,0.1)",
    divider:      isDark ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.08)",
    pill:         isDark ? "rgba(255,255,255,0.05)"  : "rgba(0,0,0,0.05)",
    pillBorder:   isDark ? "rgba(255,255,255,0.1)"   : "rgba(0,0,0,0.1)",
  };
};

interface Flashcard {
  front: string;
  back: string;
  explanation: string;
  memoryTip: string;
  difficulty: "easy" | "medium" | "hard";
  userConfidence?: "easy" | "medium" | "hard";
}

function getTopicInsights(topicName: string) {
  const normalized = topicName.toLowerCase().trim();
  let strengths = [
    "Recalled definitions and primary building blocks correctly.",
    "Strong memory link with generated analogies.",
    "Demonstrated familiarity with foundational terminology."
  ];
  let focusAreas = [
    "Edge cases and practical use case constraints.",
    "Cards flagged as Hard require repetition intervals."
  ];
  let nextAction = "Spaced recall of flagged concepts in 12 hours.";

  if (normalized.includes("python")) {
    strengths = [
      "Good comprehension of Python syntax paradigms and dynamic core structures.",
      "Clear identification of mutable vs immutable types under code execution.",
      "Successfully recognized object-oriented properties in standard snippets."
    ];
    focusAreas = [
      "Memory allocation strategies, garbage collection thresholds, and the GIL.",
      "Advanced decorators, scopes, and context manager pipelines."
    ];
    nextAction = "Build a local Python script exercising custom generators to trace activation flows.";
  } else if (normalized.includes("sql join") || normalized.includes("sql")) {
    strengths = [
      "Mastered difference between INNER, LEFT, RIGHT, and FULL OUTER joins.",
      "Identified correct filtering behaviors when using ON vs WHERE clauses.",
      "Understands performance impacts of cross joins vs hash matching join algorithms."
    ];
    focusAreas = [
      "Complex subqueries vs CTE join optimizations.",
      "Indexed join queries and understanding nested loop performance characteristics."
    ];
    nextAction = "Construct a sample database schema and execute optimization checks on multi-table queries.";
  } else if (normalized.includes("neural network") || normalized.includes("deep learning")) {
    strengths = [
      "Solid grasp of neural layering structure, weights, and bias parameters.",
      "Recognized activation functions (ReLU, Sigmoid, Softmax) and their scopes.",
      "Understands backpropagation flow and chain rule gradients."
    ];
    focusAreas = [
      "Exploding and vanishing gradient solutions (e.g., residual connections, batch normalization).",
      "Regularization trade-offs (Dropout, L1/L2 weight decay) to prevent overfitting."
    ];
    nextAction = "Implement a simple 2-layer perceptron from scratch in numpy to trace derivative flows.";
  } else if (normalized.includes("gradient descent")) {
    strengths = [
      "Clear visualization of cost functions, valleys, and local minima navigation.",
      "Strong understanding of learning rates and step tuning impacts.",
      "Differentiated between Batch, Stochastic (SGD), and Mini-batch variants."
    ];
    focusAreas = [
      "Advanced momentum optimizers (Adam, RMSprop, AdaGrad) weight modifications.",
      "Handling saddle points and plateaus where gradients approach zero."
    ];
    nextAction = "Simulate cost function trajectory plots comparing Standard SGD vs Adam Optimizer.";
  } else if (normalized.includes("binary search")) {
    strengths = [
      "Excellent grasp of log(n) divide-and-conquer search boundaries.",
      "Clear pointer tracking (left, right, mid calculations to prevent overflow).",
      "Understands conditions for array sorting preconditions."
    ];
    focusAreas = [
      "Lower and upper boundary checks for arrays with duplicates.",
      "Solving binary search search-space application problems (e.g., search in rotated sorted arrays)."
    ];
    nextAction = "Practice 3 classic binary search variations on coding platforms under time constraints.";
  } else {
    strengths = [
      `Grasped core definitions and foundational elements of "${topicName}".`,
      "Identified basic structural properties and conceptual relationships.",
      "Mapped general analogies successfully to build mental models."
    ];
    focusAreas = [
      `Advanced applications and execution trade-offs of "${topicName}".`,
      "Synthesizing edge cases and fixing recurring memory recall challenges."
    ];
    nextAction = `Create a real-world project or code simulation applying "${topicName}" principles.`;
  }

  return { strengths, focusAreas, nextAction };
}

const loadSteps = [
  "Analyzing topic keywords...",
  "Synthesizing pedagogical structure...",
  "Generating card front questions...",
  "Formulating definitions and answers...",
  "Injecting memory tips and mnemonics...",
];

export function FlashcardsView() {
  const router = useRouter();
  const theme = useTheme();
  const c = mkColors(theme);
  const quota = useFeatureQuota("FLASHCARDS");

  const [inputTopic, setInputTopic] = useState("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"beginner" | "intermediate" | "interview" | "revision">("intermediate");
  const [cardCount, setCardCount] = useState<5 | 10 | 20>(5);
  const [phase, setPhase] = useState<"config" | "viewing" | "results">("config");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [level, setLevel] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const u = getAuthUser();
        const key = u?.id ? `flashcard-level-${u.id}` : "flashcard-level";
        const saved = localStorage.getItem(key);
        if (saved) return Number(saved);
      } catch {}
    }
    return 1;
  });
  const [studyStreak, setStudyStreak] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const u = getAuthUser();
        const key = u?.id ? `flashcard-streak-${u.id}` : "flashcard-streak";
        const saved = localStorage.getItem(key);
        if (saved) return Number(saved);
      } catch {}
    }
    return 0;
  });
  const [memoryPackIndices, setMemoryPackIndices] = useState<number[]>([]);
  const [isMemoryModeActive, setIsMemoryModeActive] = useState(false);

  const confettiRan = useRef(false);
  const presets = ["SQL Joins", "Gradient Descent", "Neural Networks", "Binary Search"];
  const { strengths, focusAreas, nextAction } = getTopicInsights(topic);

  const totalCardsCount = cards.length;
  const easyCount = cards.filter((c) => c.userConfidence === "easy").length;
  const mediumCount = cards.filter((c) => c.userConfidence === "medium").length;
  const hardCount = cards.filter((c) => c.userConfidence === "hard").length;

  const averageConfidence = totalCardsCount > 0
    ? Math.round(((easyCount * 100 + mediumCount * 70 + hardCount * 30) / totalCardsCount))
    : 0;
  const estimatedRetention = Math.round(averageConfidence * 0.95);

  const getRetentionLevel = (ret: number) => {
    if (ret >= 85) return { text: "Strong Recall", color: "text-emerald-400" };
    if (ret >= 60) return { text: "Moderate retention", color: "text-amber-400" };
    return { text: "Needs spaced review", color: "text-rose-400" };
  };

  const unratedCount = cards.filter((c) => !c.userConfidence).length;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isGenerating) {
      setLoadingStep(1);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 5 ? prev + 1 : 5));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (phase === "results" && !confettiRan.current) {
      confettiRan.current = true;
      const duration = 3 * 1000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.8 }, colors: ["#f59e0b", "#d97706", "#10b981"] });
        confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.8 }, colors: ["#f59e0b", "#d97706", "#10b981"] });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [phase]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("flashcard-level", String(level));
      localStorage.setItem("flashcard-streak", String(studyStreak));
    }
  }, [level, studyStreak]);

  const handleGenerate = async () => {
    if (!inputTopic.trim()) {
      setError("Please provide a learning topic.");
      return;
    }
    if (quota.exhausted) {
      toast.error("You've used all free Flashcard Generator attempts this month.", {
        description: "Upgrade to Premium for unlimited flashcards.",
      });
      return;
    }
    const requestId = quota.newRequestId();
    setTopic(inputTopic.trim());
    setIsGenerating(true);
    setError(null);
    try {
      const response = await api.post("/flashcards/generate", {
        topic: inputTopic.trim(),
        mode,
        cardCount,
        requestId,
      });
      const data = response.data;
      const generatedCards: Flashcard[] = data?.data?.cards || data?.cards || [];
      if (generatedCards.length > 0) {
        quota.onSuccess();
        setCards(generatedCards);
        setPhase("viewing");
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setXpEarned(0);
        setMemoryPackIndices([]);
        setIsMemoryModeActive(false);
        confettiRan.current = false;
      } else {
        throw new Error("No flashcard data returned from AI.");
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      if (!quota.handleQuotaError(err)) {
        await quota.onFailure();
        const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed to generate flashcards.";
        setError(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      setXpEarned((prev) => prev || 50);
      setPhase("results");
    }
  };

  const handlePrev = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex((i) => i - 1);
      setIsFlipped(false);
    }
  };

  const rateCardConfidence = (cardIndex: number, confidence: "easy" | "medium" | "hard") => {
    setCards((prev) => {
      const updated = [...prev];
      if (updated[cardIndex]) {
        updated[cardIndex] = { ...updated[cardIndex], userConfidence: confidence };
      }
      return updated;
    });
    setMemoryPackIndices((prev) => {
      if (confidence === "hard") {
        return prev.includes(cardIndex) ? prev : [...prev, cardIndex];
      }
      return prev.filter((idx) => idx !== cardIndex);
    });
    setXpEarned((prev) => prev + 15);
  };

  const startMemoryMode = () => {
    if (memoryPackIndices.length === 0) return;
    const memoryCards = cards
      .filter((_, idx) => memoryPackIndices.includes(idx))
      .map((c) => ({ ...c, userConfidence: undefined }));
    setCards(memoryCards);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setPhase("viewing");
    setIsMemoryModeActive(true);
    setMemoryPackIndices([]);
    confettiRan.current = false;
  };

  const resetFlashcards = () => {
    setInputTopic(topic);
    setCards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setXpEarned(0);
    setMemoryPackIndices([]);
    setIsMemoryModeActive(false);
    setPhase("config");
    setError(null);
    confettiRan.current = false;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col antialiased"
      style={{ color: c.text }}
    >
      <style>{`@keyframes spin-slow { to { transform: rotate(360deg); } } .animate-spin-slow { animation: spin-slow 2s linear infinite; }`}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
          >
            <Layers size={18} style={{ color: "#fff" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>AI Flashcards</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-xs leading-tight" style={{ color: c.textMuted }}>Spaced repetition accelerated by AI.</motion.p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <FeatureCreditBadge featureKey="FLASHCARDS" compact isDark={theme === "dark"} />
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: "#f59e0b" }}>
            <Flame size={13} className="text-orange-400" />
            <span>{studyStreak} Day Streak</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
            <Award size={13} style={{ color: c.amber }} />
            <span>Level {level}</span>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <AnimatePresence mode="wait">

          {/* ─── CONFIG PHASE ─── */}
          {phase === "config" && !isGenerating && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <motion.div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: c.surface, border: `2px solid ${c.border}` }}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-8 w-24 h-24 rounded-full" style={{ opacity: c.isDark ? 0.05 : 0.08, background: "radial-gradient(circle, #f59e0b, transparent)" }} />
                  <div className="absolute bottom-4 left-8 w-16 h-16 rounded-full" style={{ opacity: c.isDark ? 0.04 : 0.06, background: "radial-gradient(circle, #d97706, transparent)" }} />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex flex-col items-center text-center space-y-1.5">
                    <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-600 items-center justify-center text-white shadow-lg mb-1">
                      <Brain size={22} />
                    </div>
                    <h2 className="text-lg font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Flashcard Generator</h2>
                    <p className="text-xs" style={{ color: c.textMuted }}>Provide any study topic to receive tailored flashcards.</p>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl flex gap-2 items-center text-xs" style={{ background: c.roseBg, border: `1px solid ${c.rose}20`, color: c.rose }}>
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <div className="space-y-3 max-w-xl mx-auto">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold" style={{ color: c.textSec }}>Topic of Study</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter a topic to generate flashcards..."
                          value={inputTopic}
                          onChange={(e) => setInputTopic(e.target.value)}
                          className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none"
                          style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: c.textSec }}>
                          <Sliders size={13} style={{ color: "#f59e0b" }} />
                          Learning Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "beginner" as const, label: "Beginner", desc: "Basics & Examples" },
                            { id: "intermediate" as const, label: "Intermediate", desc: "Core Details" },
                            { id: "interview" as const, label: "Interview", desc: "Trick Questions" },
                            { id: "revision" as const, label: "Revision", desc: "Facts & Formula" },
                          ].map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setMode(m.id)}
                              className="p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1"
                              style={
                                mode === m.id
                                  ? { background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.text }
                                  : { background: "transparent", border: `1px solid ${c.border}`, color: c.textMuted }
                              }
                            >
                              <span className="text-xs font-bold" style={{ color: mode === m.id ? "#f59e0b" : c.textSec }}>{m.label}</span>
                              <span className="text-[9px]" style={{ color: c.textMuted }}>{m.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold flex items-center gap-1.5" style={{ color: c.textSec }}>
                          <Sparkles size={13} style={{ color: "#f59e0b" }} />
                          Flashcard Count
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[5, 10, 20].map((count) => (
                            <button
                              key={count}
                              onClick={() => setCardCount(count as 5 | 10 | 20)}
                              className="p-3.5 rounded-xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1"
                              style={
                                cardCount === count
                                  ? { background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.text }
                                  : { background: "transparent", border: `1px solid ${c.border}`, color: c.textMuted }
                              }
                            >
                              <span className="text-sm font-extrabold" style={{ color: cardCount === count ? "#f59e0b" : c.textSec }}>{count}</span>
                              <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: c.textMuted }}>Cards</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGenerate}
                      className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
                    >
                      <Play size={15} fill="currentColor" />
                      Generate Flashcards
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}>
                  <Sparkles size={15} style={{ color: "#f59e0b" }} /> How It Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: "01", title: "Configure", desc: "Set a topic, mode, and card count for AI generation.", icon: <Brain size={18} style={{ color: "#f59e0b" }} /> },
                    { step: "02", title: "Study", desc: "Flip each card, review explanations, and rate your recall.", icon: <Layers size={18} style={{ color: "#d97706" }} /> },
                    { step: "03", title: "Review", desc: "Get cognitive insights, retention stats, and XP rewards.", icon: <Award size={18} style={{ color: c.amber }} /> },
                  ].map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      whileHover={{ y: -4, scale: 1.01 }}
                      className="p-5 rounded-2xl relative overflow-hidden group transition-all"
                      style={{ background: c.cardBg, border: `1px solid ${c.border}` }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: "#f59e0b" }}>Step {item.step}</span>
                          <h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>{item.title}</h4>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── LOADING PHASE ─── */}
          {isGenerating && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-16 gap-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-amber-600/10 rounded-full blur-2xl animate-pulse" />
                <div className="h-16 w-16 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin relative z-10" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold uppercase tracking-wider" style={{ color: c.text }}>Crafting Personalized Deck</h3>
                <p className="text-xs" style={{ color: c.textMuted }}>
                  Synthesising questions for <span style={{ color: "#f59e0b", fontWeight: 600 }}>&ldquo;{inputTopic || topic}&rdquo;</span>.
                </p>
              </div>

              <div className="w-full max-w-md rounded-xl p-4 space-y-2.5" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                {loadSteps.map((stepText, idx) => {
                  const stepNum = idx + 1;
                  const isDone = loadingStep > stepNum;
                  const isCurrent = loadingStep === stepNum;
                  return (
                    <div key={idx} className="flex items-center gap-3 text-xs">
                      <div
                        className="h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border transition-all duration-300"
                        style={
                          isDone
                            ? { background: c.greenBg, border: `1px solid ${c.green}40`, color: c.green }
                            : isCurrent
                            ? { background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: "#f59e0b" }
                            : { background: c.surface, border: `1px solid ${c.border}`, color: c.textMuted }
                        }
                      >
                        {isDone ? "✓" : stepNum}
                      </div>
                      <span
                        className="transition-colors"
                        style={
                          isDone
                            ? { color: c.textMuted, textDecoration: "line-through", textDecorationColor: c.divider }
                            : isCurrent
                            ? { color: c.text, fontWeight: 700 }
                            : { color: c.textMuted }
                        }
                      >
                        {stepText}
                      </span>
                      {isCurrent && (
                        <motion.div
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="w-1.5 h-1.5 rounded-full ml-auto shrink-0"
                          style={{ background: "#f59e0b" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── VIEWING PHASE ─── */}
          {phase === "viewing" && cards.length > 0 && (
            <motion.div
              key="viewing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full max-w-2xl mx-auto py-4 gap-5"
            >
              <div className="text-center space-y-1">
                <span
                  className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded"
                  style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: "#f59e0b" }}
                >
                  Topic: {topic} {isMemoryModeActive && "(Review Pack)"}
                </span>
                <p className="text-xs" style={{ color: c.textSec }}>Level {level} Study Session &bull; XP: {xpEarned}</p>
              </div>

              {/* CARD */}
              <div className="relative w-full max-w-[420px] h-[450px] sm:h-[480px] select-none" style={{ perspective: "1500px" }}>
                <CardFace
                  card={cards[currentCardIndex]}
                  isActive={true}
                  isFlipped={isFlipped}
                  setIsFlipped={setIsFlipped}
                  onRate={(confidence) => {
                    rateCardConfidence(currentCardIndex, confidence);
                    handleNext();
                  }}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  c={c}
                />
              </div>

              {/* PROGRESS + CONTROLS */}
              <div className="w-full max-w-[420px] space-y-3">
                <div className="flex justify-between items-end text-xs">
                  <span style={{ color: c.textMuted }}>Card {currentCardIndex + 1} of {cards.length}</span>
                  <span className="font-bold" style={{ color: c.text }}>
                    {Math.round(((currentCardIndex + 1) / cards.length) * 100)}% Complete
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentCardIndex + 1) / cards.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  />
                </div>

                <div className="flex justify-between items-center gap-3 pt-1">
                  <button
                    onClick={handlePrev}
                    disabled={currentCardIndex === 0}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                    style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}
                  >
                    <ArrowLeft size={14} /> Previous
                  </button>
                  <button
                    onClick={() => setIsFlipped((f) => !f)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                    style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: "#f59e0b" }}
                  >
                    <RotateCw size={14} /> Flip Card
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
                    style={
                      currentCardIndex === cards.length - 1
                        ? { background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", border: "none" }
                        : { background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }
                    }
                  >
                    {currentCardIndex === cards.length - 1 ? (
                      <>Finish Deck 🎉</>
                    ) : (
                      <>Next <ArrowRight size={14} /></>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── RESULTS PHASE ─── */}
          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center max-w-3xl mx-auto w-full py-4 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex h-12 w-12 rounded-full items-center justify-center mb-2" style={{ background: c.greenBg, border: `1px solid ${c.green}40`, color: c.green }}>
                  <CheckCircle2 size={24} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: c.text }}>Session Completed!</h2>
                <p className="text-xs sm:text-sm" style={{ color: c.textMuted }}>
                  You parsed the flashcard deck on <span className="font-semibold" style={{ color: c.text }}>&ldquo;{topic}&rdquo;</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
                {/* Retention Ring */}
                <div className="rounded-2xl p-5 flex flex-col items-center justify-between text-center relative overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}`, height: "180px" }}>
                  <div className="absolute top-0 right-0 h-20 w-20 rounded-full blur-xl pointer-events-none" style={{ background: `${c.green}10` }} />
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textMuted }}>Estimated Retention</span>
                  <div className="relative h-20 w-20 flex items-center justify-center mt-2">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path className="text-zinc-900" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ color: c.surface }} />
                      <motion.path
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        strokeDasharray={`${estimatedRetention}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ strokeDasharray: `${estimatedRetention}, 100` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ color: c.green }}
                      />
                    </svg>
                    <span className="absolute text-base font-extrabold" style={{ color: c.text }}>{estimatedRetention}%</span>
                  </div>
                  <span className="text-[11px] font-bold mt-2" style={{ color: estimatedRetention >= 85 ? "#34d399" : estimatedRetention >= 60 ? "#818cf8" : "#fb7185" }}>
                    {getRetentionLevel(estimatedRetention).text}
                  </span>
                </div>

                {/* Deck Completion Overview */}
                <div className="rounded-2xl p-5 flex flex-col justify-between text-center relative overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}`, height: "180px" }}>
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textMuted }}>Deck Completion</span>
                  <div className="my-auto space-y-1">
                    <h4 className="text-3xl font-black" style={{ color: c.green }}>100%</h4>
                    <p className="text-xs font-semibold" style={{ color: c.textSec }}>{cards.length} / {cards.length} Cards Parsed</p>
                  </div>
                  <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold mx-auto" style={{ background: c.greenBg, border: `1px solid ${c.green}40`, color: c.green }}>
                    Full Deck Mastered
                  </span>
                </div>

                {/* Retention Ring */}
                <div className="rounded-2xl p-5 flex flex-col items-center justify-between text-center relative overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}`, height: "180px" }}>
                  <div className="absolute top-0 right-0 h-20 w-20 rounded-full blur-xl pointer-events-none" style={{ background: `${c.green}10` }} />
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textMuted }}>Estimated Retention</span>
                  <div className="relative h-20 w-20 flex items-center justify-center mt-2">
                    <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                      <path className="text-zinc-900" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ color: c.surface }} />
                      <motion.path
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        strokeDasharray="95, 100"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ strokeDasharray: "95, 100" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        style={{ color: c.green }}
                      />
                    </svg>
                    <span className="absolute text-base font-extrabold" style={{ color: c.text }}>95%</span>
                  </div>
                  <span className="text-[11px] font-bold mt-2" style={{ color: "#34d399" }}>
                    High Retention Mastered
                  </span>
                </div>

                {/* XP / Level / Streak */}
                <div className="rounded-2xl p-5 flex flex-col justify-between text-center relative overflow-hidden" style={{ background: c.cardBg, border: `1px solid ${c.border}`, height: "180px" }}>
                  <div className="absolute top-0 right-0 h-20 w-20 rounded-full blur-xl pointer-events-none" style={{ background: `${c.amberBg}` }} />
                  <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textMuted }}>Gamification Summary</span>
                  <div className="my-auto space-y-1">
                    <h4 className="text-3xl font-black" style={{ color: "#f59e0b" }}>+50 XP</h4>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Deck Completion Bonus</p>
                  </div>
                  <div className="flex justify-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: "#f59e0b" }}>Streak Saved! 🔥</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>Lv. {level}</span>
                  </div>
                </div>
              </div>

              {/* Cognitive Insights */}
              <div className="w-full rounded-2xl p-6 space-y-4" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2 pb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
                  <Brain size={18} style={{ color: "#f59e0b" }} />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider" style={{ color: c.text }}>Cognitive Analysis & AI Insights</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: c.green }}>Key Strengths</span>
                    <ul className="list-disc pl-4 space-y-1" style={{ color: c.textSec }}>
                      {strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: c.amber }}>Recommended Focus Areas</span>
                    <ul className="list-disc pl-4 space-y-1" style={{ color: c.textSec }}>
                      {focusAreas.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row justify-between gap-3 text-xs" style={{ borderTop: `1px solid ${c.divider}` }}>
                  <span style={{ color: c.textMuted }}>Suggested Next Action: {nextAction}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 w-full max-w-lg">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                    setPhase("viewing");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  style={{ background: c.greenBg, border: `1px solid ${c.green}40`, color: c.green }}
                >
                  <RotateCw size={13} /> Review Deck Again
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => router.push(`/dashboard/user?view=quiz-generator`)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
                >
                  <Brain size={14} /> Test Knowledge
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetFlashcards}
                  className="flex-1 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}
                >
                  <RefreshCw size={13} /> New Topic
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── CARD FACE COMPONENT ─── */
function CardFace({
  card,
  isActive,
  isFlipped,
  setIsFlipped,
  onRate,
  onNext,
  onPrev,
  c,
}: {
  card: Flashcard;
  isActive: boolean;
  isFlipped: boolean;
  setIsFlipped: (f: boolean) => void;
  onRate: (confidence: "easy" | "medium" | "hard") => void;
  onNext: () => void;
  onPrev: () => void;
  c: ReturnType<typeof mkColors>;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const rightOpacity = useTransform(x, [0, 120], [0, 1]);
  const leftOpacity = useTransform(x, [-120, 0], [1, 0]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) => {
    if (!isActive) return;
    const threshold = 100;
    const { offset } = info;
    if (offset.x > threshold) onPrev();
    else if (offset.x < -threshold) onNext();
    x.set(0);
    y.set(0);
  };

  return (
    <>
      {isActive && (
        <>
          <motion.div style={{ opacity: leftOpacity, background: "rgba(245,158,11,0.9)", color: "#fff", borderColor: "rgba(245,158,11,0.2)" }} className="absolute top-8 right-8 z-30 px-4 py-2 rounded-lg font-bold border shadow-lg pointer-events-none uppercase text-sm tracking-wider flex items-center gap-1.5">
            Next Card
          </motion.div>
          <motion.div style={{ opacity: rightOpacity, background: "rgba(39,39,42,0.95)", color: "#d4d4d8", borderColor: "rgba(255,255,255,0.05)" }} className="absolute top-8 left-8 z-30 px-4 py-2 rounded-lg font-bold border shadow-lg pointer-events-none uppercase text-sm tracking-wider flex items-center gap-1.5">
            Prev Card
          </motion.div>
        </>
      )}

      <motion.div
        style={{
          x: isActive ? x : 0,
          y: isActive ? y : 0,
          rotate: isActive ? rotate : 0,
          transformStyle: "preserve-3d",
        }}
        drag={isActive}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        onTap={() => isActive && setIsFlipped(!isFlipped)}
        animate={{
          rotateY: isFlipped ? 180 : 0,
          scale: isActive ? 1 : 0.95,
          y: isActive ? 0 : 12,
        }}
        whileDrag={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 350, damping: 26 }}
        className="w-full h-full relative cursor-grab active:cursor-grabbing"
      >
        {/* FRONT */}
        <div
          style={{ backfaceVisibility: "hidden", ...cardFrontStyle(c) }}
          className="absolute inset-0 w-full h-full rounded-2xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-2xl border transition-all duration-300"
        >
          <div className="absolute -top-[30%] -right-[30%] w-60 h-60 rounded-full blur-[65px] pointer-events-none" style={{ background: "rgba(245,158,11,0.1)" }} />

          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border" style={{ background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
              {card.difficulty} Mode
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: c.textMuted }}>
              <RefreshCw size={11} className="animate-spin-slow" style={{ color: "#f59e0b" }} />
              <span>Tap to Flip</span>
            </div>
          </div>

          <div className="my-auto text-center space-y-4 relative z-10 px-2">
            <div className="inline-flex h-9 w-9 rounded-lg items-center justify-center mx-auto" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: "#f59e0b" }}>
              <Sparkles size={16} />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug" style={{ color: c.text }}>
              {card.front}
            </h3>
            <p className="text-xs max-w-[280px] mx-auto leading-relaxed" style={{ color: c.textMuted }}>
              Think about the definition or answer, then tap to check your knowledge.
            </p>
          </div>

          <div className="pt-4 text-center relative z-10" style={{ borderTop: `1px solid ${c.divider}` }}>
            <span className="text-[10px] font-semibold tracking-wide uppercase" style={{ color: c.textMuted }}>
              Swipe Left / Right to Navigate &bull; Tap to Flip Answer
            </span>
          </div>
        </div>

        {/* BACK */}
        <div
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", ...cardBackStyle(c) }}
          className="absolute inset-0 w-full h-full rounded-2xl p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-2xl border transition-all duration-300"
        >
          <div className="absolute -bottom-[30%] -left-[30%] w-60 h-60 rounded-full blur-[65px] pointer-events-none" style={{ background: "rgba(16,185,129,0.1)" }} />

          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border" style={{ background: c.isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.12)", borderColor: c.isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.3)", color: c.green }}>
              Answer Reveal
            </span>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: c.textMuted }}>
              <RefreshCw size={11} style={{ color: c.green }} />
              <span>Tap to Flip</span>
            </div>
          </div>

          <div className="my-auto space-y-4 sm:space-y-5 relative z-10 overflow-y-auto max-h-[300px] pr-1">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: c.green }}>Core Answer</span>
              <div className="text-base sm:text-lg font-bold leading-relaxed" style={{ color: c.text }}><AIContent content={card.back} /></div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider block" style={{ color: c.textMuted }}>Explanation</span>
              <div className="text-xs leading-relaxed font-normal" style={{ color: c.textSec }}><AIContent content={card.explanation} /></div>
            </div>

            {card.memoryTip && (
              <div className="rounded-xl p-3 flex gap-2.5 items-start border" style={{ background: c.amberBg, borderColor: c.amberBorder }}>
                <div className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: "#f59e0b" }}>
                  <Lightbulb size={13} />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider block mb-0.5" style={{ color: "#f59e0b" }}>Memory Tip</span>
                  <div className="text-[11px] leading-normal font-medium" style={{ color: c.textSec }}><AIContent content={card.memoryTip} /></div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 text-center relative z-10" style={{ borderTop: `1px solid ${c.divider}` }}>
            <span className="text-[9px] font-semibold uppercase" style={{ color: c.textMuted }}>Tap card or use controls below to continue</span>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function cardFrontStyle(c: ReturnType<typeof mkColors>): React.CSSProperties {
  return {
    background: c.isDark
      ? "linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    borderColor: c.isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.3)",
    boxShadow: c.isDark
      ? "0 25px 50px -12px rgba(0,0,0,0.5)"
      : "0 20px 40px -15px rgba(245,158,11,0.12)",
  };
}

function cardBackStyle(c: ReturnType<typeof mkColors>): React.CSSProperties {
  return {
    background: c.isDark
      ? "linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(6, 35, 25, 0.95) 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
    borderColor: c.isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.3)",
    boxShadow: c.isDark
      ? "0 25px 50px -12px rgba(0,0,0,0.5)"
      : "0 20px 40px -15px rgba(16,185,129,0.12)",
  };
}

