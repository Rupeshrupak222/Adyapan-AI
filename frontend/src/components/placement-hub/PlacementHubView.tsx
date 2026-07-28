"use client";

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  Search, Calendar, DollarSign, Send, Sparkles, CheckCircle2,
  XCircle, Info, Heart, ArrowRight, Share2, Trash2, Plus, Clock,
  MessageSquare, Award, ArrowLeft, ArrowRightLeft, ChevronRight,
  AlertCircle, FileText, UserCheck, Play, PlusCircle, Check, RefreshCw,
  HelpCircle, ShieldAlert, Award as BadgeIcon, Lightbulb, BookOpen, Target, Flame
} from "lucide-react";
import { api } from "@/services/api";

const AptitudeEngineView = lazy(() =>
  import("@/components/aptitude-hub/AptitudeEngineView").then(m => ({ default: m.AptitudeEngineView }))
);

const TechnicalMCQsModuleView = lazy(() =>
  import("./TechnicalMCQsModuleView").then(m => ({ default: m.TechnicalMCQsModuleView }))
);

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }),
};

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  trick?: string;
}

interface PracticeSession {
  topic: string;
  questions: Question[];
  currentIdx: number;
  selectedOptionIdx: number | null;
  submitted: boolean;
  score: number;
  history: { questionIdx: number; selectedIdx: number; correct: boolean }[];
}

interface MockTest {
  id: string;
  name: string;
  company?: string;
  durationMs: number;
  totalQuestions?: number;
  sections: { name: string; questions: Question[] }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PlacementHubViewProps {
  setView: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

const APTITUDE_TOPICS = [
  { name: "Number System", icon: null },
  { name: "Percentages", icon: null },
  { name: "Profit & Loss", icon: null },
  { name: "Time & Work", icon: null },
  { name: "Time, Speed & Distance", icon: null },
  { name: "Simple & Compound Interest", icon: null },
  { name: "Ratio & Proportion", icon: null },
  { name: "Probability", icon: null },
  { name: "Permutations & Combinations", icon: null },
  { name: "Data Interpretation", icon: null }
];

const REASONING_TOPICS = [
  { name: "Puzzles", icon: null },
  { name: "Seating Arrangement", icon: null },
  { name: "Blood Relations", icon: null },
  { name: "Coding-Decoding", icon: null },
  { name: "Direction Sense", icon: null },
  { name: "Syllogisms", icon: null },
  { name: "Number Series", icon: null },
  { name: "Analogy", icon: null },
  { name: "Statement & Conclusion", icon: null },
  { name: "Logical Deduction", icon: null }
];

const TECHNICAL_TOPICS = [
  { name: "Programming Fundamentals", icon: null },
  { name: "OOP Concepts", icon: null },
  { name: "Data Structures", icon: null },
  { name: "Algorithms", icon: null },
  { name: "DBMS & SQL", icon: null },
  { name: "Operating Systems", icon: null },
  { name: "Computer Networks", icon: null }
];

export function PlacementHubView({ setView, activeModule = "placement-hub", theme = "dark" }: PlacementHubViewProps) {
  const isDark = theme === "dark";
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

  // Tab State: "aptitude" | "mcqs"
  const [tab, setTab] = useState<"aptitude" | "mcqs">("aptitude");

  // Practice session state
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [showTrick, setShowTrick] = useState(false);

  // Stats / History
  const [completedMocksCount, setCompletedMocksCount] = useState(0);
  const [avgAccuracy, setAvgAccuracy] = useState(0);

  // AI Assistant panel state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hello! I am your Adyapan AI Placement Coach. Ask me to explain a math problem or recommend study resources!" }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync tab with activeModule from props
  useEffect(() => {
    if (activeModule === "placement-aptitude" || activeModule === "aptitude-engine") setTab("aptitude");
    else if (activeModule === "placement-mcqs") setTab("mcqs");
  }, [activeModule]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleStartPractice = async (topicName: string, category: "aptitude" | "reasoning" | "mcqs") => {
    try {
      const { data } = await api.post("/placement/practice/start", {
        topic: topicName,
        category,
        count: 10,
      });

      if (data.success && data.questions?.length > 0) {
        setPracticeSession({
          topic: topicName,
          questions: data.questions,
          currentIdx: 0,
          selectedOptionIdx: null,
          submitted: false,
          score: 0,
          history: [],
        });
      } else {
        alert("Failed to generate questions. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to start practice.";
      alert(`Error: ${msg}`);
    }
  };

  const handlePracticeSubmit = () => {
    if (!practiceSession || practiceSession.selectedOptionIdx === null || practiceSession.submitted) return;

    const currentQ = practiceSession.questions[practiceSession.currentIdx];
    const isCorrect = practiceSession.selectedOptionIdx === currentQ.correctIdx;

    setPracticeSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        submitted: true,
        score: isCorrect ? prev.score + 1 : prev.score,
        history: [...prev.history, { questionIdx: prev.currentIdx, selectedIdx: prev.selectedOptionIdx!, correct: isCorrect }]
      };
    });
  };

  const handlePracticeNext = async () => {
    if (!practiceSession) return;
    const nextIdx = practiceSession.currentIdx + 1;
    if (nextIdx < practiceSession.questions.length) {
      setPracticeSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentIdx: nextIdx,
          selectedOptionIdx: null,
          submitted: false
        };
      });
      setShowTrick(false);
    } else {
      // Practice finished — submit to backend
      try {
        await api.post("/placement/practice/submit", {
          topic: practiceSession.topic,
          category: tab === "aptitude" ? "aptitude" : "mcqs",
          questions: practiceSession.questions,
          answers: practiceSession.history.map(h => ({ questionIdx: h.questionIdx, selectedIdx: h.selectedIdx })),
          score: practiceSession.score,
        });
      } catch {}
      alert(`🎉 Practice Completed! Your Score: ${practiceSession.score}/${practiceSession.questions.length}`);
      setPracticeSession(null);
    }
  };

  const handleAssistantSend = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const promptText = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: promptText }]);
    setChatLoading(true);

    try {
      const { data } = await api.post("/placement/coach/chat", {
        messages: [...chatMessages, { role: "user", content: promptText }].map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      if (data.success && data.reply) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't generate a response. Please try again." }]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Service unavailable.";
      setChatMessages(prev => [...prev, { role: "assistant", content: `⚠️ **Error**: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative flex flex-col h-full min-h-[calc(100vh-120px)]" style={{ color: c.text }}>
      <div className="flex-1 flex flex-col gap-4">



        {/* ==================== 3. CONTENT AREA ==================== */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">

            {/* TAB A: APTITUDE ENGINE (replaces old topic grid) */}
            {tab === "aptitude" && !practiceSession && (
              <motion.div
                key="aptitude-engine"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <Suspense fallback={
                  <div className="p-10 border rounded-2xl text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                    <Clock size={20} className="text-amber-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold" style={{ color: c.textMuted }}>Loading AI Aptitude Engine...</p>
                  </div>
                }>
                  <AptitudeEngineView setView={setView} activeModule="aptitude-engine" theme={theme} />
                </Suspense>
              </motion.div>
            )}

            {/* TAB C: TECHNICAL MCQS (Redesigned Placement Hub Module) */}
            {tab === "mcqs" && !practiceSession && (
              <motion.div
                key="mcqs-module"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <Suspense fallback={
                  <div className="p-10 border rounded-2xl text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                    <Clock size={20} className="text-amber-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs font-bold" style={{ color: c.textMuted }}>Loading Technical MCQs Module...</p>
                  </div>
                }>
                  <TechnicalMCQsModuleView setView={setView} theme={theme} />
                </Suspense>
              </motion.div>
            )}

            {/* PRACTICE SESSION ACTIVE INTERFACE */}
            {practiceSession && (
              <motion.div
                key="practice-active"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -2, scale: 1.005 }}
                className="p-6 border rounded-2xl space-y-6"
                style={{ background: c.cardBg, borderColor: c.border }}
              >
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: c.border }}>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Practice Module</span>
                    <h3 className="text-sm font-extrabold" style={{ color: c.text }}>{practiceSession.topic}</h3>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setPracticeSession(null)}
                    className="text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Exit Session
                  </motion.button>
                </div>

                {/* Question Details */}
                <div className="space-y-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                    Question {practiceSession.currentIdx + 1} of {practiceSession.questions.length}
                  </div>
                  <p className="text-sm font-semibold leading-relaxed whitespace-pre-line" style={{ color: c.text }}>
                    {practiceSession.questions[practiceSession.currentIdx].text}
                  </p>

                  {/* Options List */}
                  <div className="space-y-2">
                    {practiceSession.questions[practiceSession.currentIdx].options.map((opt, oIdx) => {
                      const isSelected = practiceSession.selectedOptionIdx === oIdx;
                      const isCorrectAnswer = oIdx === practiceSession.questions[practiceSession.currentIdx].correctIdx;
                      const isSubmitted = practiceSession.submitted;

                      let optBg = "bg-white/5 border-white/10";
                      let optText = c.text;

                      if (isSelected) {
                        optBg = "bg-amber-500/10 border-amber-500/30";
                        optText = "var(--primary)";
                      }

                      if (isSubmitted) {
                        if (isCorrectAnswer) {
                          optBg = "bg-emerald-500/10 border-emerald-500/30";
                          optText = "#10b981";
                        } else if (isSelected) {
                          optBg = "bg-red-500/10 border-red-500/30";
                          optText = "#ef4444";
                        }
                      }

                      return (
                        <motion.div
                          key={oIdx}
                          whileHover={{ y: -2, scale: 1.005 }}
                          onClick={() => {
                            if (!isSubmitted) {
                              setPracticeSession(prev => {
                                if (!prev) return null;
                                return { ...prev, selectedOptionIdx: oIdx };
                              });
                            }
                          }}
                          className={`p-3 border rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-bold ${optBg}`}
                          style={{ color: optText }}
                        >
                          <span>{opt}</span>
                          {isSubmitted && isCorrectAnswer && <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="inline-flex"><CheckCircle2 size={14} className="text-emerald-500" /></motion.span>}
                          {isSubmitted && isSelected && !isCorrectAnswer && <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="inline-flex"><XCircle size={14} className="text-red-500" /></motion.span>}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Explanations & Action controls */}
                <div className="pt-4 border-t flex flex-wrap justify-between items-center gap-4" style={{ borderColor: c.border }}>
                  <div className="flex gap-2">
                    {!practiceSession.submitted ? (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handlePracticeSubmit}
                        disabled={practiceSession.selectedOptionIdx === null}
                        className="py-2 px-4 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 disabled:opacity-40 transition-colors"
                      >
                        Submit Answer
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={handlePracticeNext}
                        className="py-2 px-4 rounded-lg bg-amber-500 text-black font-extrabold text-xs hover:bg-amber-400 transition-colors"
                      >
                        {practiceSession.currentIdx + 1 < practiceSession.questions.length ? "Next Question" : "Finish Practice"}
                      </motion.button>
                    )}

                    {practiceSession.submitted && (
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowTrick(!showTrick)}
                        className="py-2 px-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        style={{ borderColor: c.border }}
                      >
                        <Lightbulb size={13} className="text-amber-500" />
                        {showTrick ? "Show Solution" : "Show Trick/Shortcut"}
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* Solution Box */}
                {practiceSession.submitted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="p-4 bg-white/5 border rounded-xl space-y-2 text-xs leading-relaxed"
                    style={{ borderColor: c.border }}
                  >
                    {showTrick && practiceSession.questions[practiceSession.currentIdx].trick ? (
                      <>
                        <h4 className="font-extrabold text-amber-500 uppercase tracking-wider text-[10px]">AI Mathematical Shortcut:</h4>
                        <p style={{ color: c.textSec }}>{practiceSession.questions[practiceSession.currentIdx].trick}</p>
                      </>
                    ) : (
                      <>
                        <h4 className="font-extrabold text-emerald-500 uppercase tracking-wider text-[10px]">Step-by-step Solution:</h4>
                        <p style={{ color: c.textSec }}>{practiceSession.questions[practiceSession.currentIdx].explanation}</p>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ==================== 4. FLOATING CHAT SIDEBAR PANEL ==================== */}
      <AnimatePresence>
        {assistantOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-[70px] right-0 bottom-0 z-[190] w-80 border-l flex flex-col shadow-2xl"
            style={{ background: isDark ? "#0d1117" : "#ffffff", borderColor: c.border }}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-1.5">
                <motion.span initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="inline-flex">
                  <Sparkles size={14} className="text-amber-500" />
                </motion.span>
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: c.text }}>AI Placement Coach</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setAssistantOpen(false)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <XCircle size={14} />
              </motion.button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {chatMessages.map((msg, idx) => {
                const isAI = msg.role === "assistant";
                return (
                  <motion.div
                    key={idx}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={idx}
                    className={`flex ${isAI ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                        isAI
                          ? "bg-white/5 border border-white/10 rounded-tl-sm"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-tr-sm"
                      }`}
                      style={{ borderColor: c.border }}
                    >
                      <p className="whitespace-pre-line">{stripMarkdown(msg.content)}</p>
                    </div>
                  </motion.div>
                );
              })}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-xl rounded-tl-sm p-3 flex items-center gap-1.5">
                    <Clock size={12} className="text-amber-500 animate-spin" />
                    <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Drafting response...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggestions */}
            <div className="p-3 border-t bg-white/[0.01] flex flex-col gap-1.5" style={{ borderColor: c.border }}>
              <span className="text-[8px] uppercase tracking-wider font-extrabold" style={{ color: c.textMuted }}>Suggestions</span>
              {[
                "Create a mock test for TCS",
                "Explain percentages shortcuts",
                "Generate SQL technical MCQs"
              ].map((s, i) => (
                <motion.button
                  key={s}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setChatInput(s); }}
                  className="w-full text-left p-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 text-[10px] font-semibold truncate transition-colors"
                  style={{ borderColor: c.border, color: c.textSec }}
                >
                  {s}
                </motion.button>
              ))}
            </div>

            {/* Input form */}
            <div className="p-3 border-t flex gap-1.5" style={{ borderColor: c.border }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask placement coach..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAssistantSend();
                }}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] focus:border-[#f59e0b] focus:outline-none rounded-lg p-2 text-xs"
                style={{ background: c.inputBg, color: c.text, borderColor: c.border }}
              />
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleAssistantSend}
                disabled={!chatInput.trim() || chatLoading}
                className="w-8 h-8 rounded-lg bg-amber-500 text-black hover:bg-amber-400 flex items-center justify-center shrink-0 disabled:opacity-30 transition-colors"
              >
                <Send size={12} />
              </motion.button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

