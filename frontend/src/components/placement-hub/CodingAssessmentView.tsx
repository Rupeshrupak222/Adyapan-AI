"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { renderMarkdown } from "@/utils/renderMarkdown";
import {
  Code2, CheckCircle2, AlertTriangle, Sparkles, RefreshCw,
  Trophy, Rocket, Terminal, BookOpen, Target, ArrowRight,
  ClipboardCheck, Zap, BrainCircuit, Lightbulb, Flame, Mic,
  Maximize,   Shield, Wifi, Play, Pause, Bookmark, Flag, ChevronRight,
  ChevronLeft, Copy, Check, Clock, RotateCcw, Award, BarChart3,
  Building2, Cpu, FileCode2, ArrowUpRight, HelpCircle, Layers,
  History, Star, TrendingUp, Eye, EyeOff, Send, ChevronDown, X,
  Brain, UserCheck, PieChart, Activity
} from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import { cn } from "@/lib/cn";
import {
  DifficultyBadge,
  codingFadeUp,
} from "../coding-hub/CodingHubShared";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const RadarChart = dynamic(() => import("react-chartjs-2").then(m => m.Radar), { ssr: false });
const BarChart = dynamic(() => import("react-chartjs-2").then(m => m.Bar), { ssr: false });
const DoughnutChart = dynamic(() => import("react-chartjs-2").then(m => m.Doughnut), { ssr: false });
// LineChart available for future analytics expansion

import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
} from "chart.js";

ChartJS.register(
  RadialLinearScale, PointElement, LineElement, Filler,
  ChartTooltip, Legend, CategoryScale, LinearScale, BarElement, ArcElement
);

// ─── Company & Type Data ───────────────────────────────────────────────────────

interface Preset {
  id: string;
  name: string;
  category: "service" | "product" | "faang" | "startup";
  questionCount: number;
  timeLimitMinutes: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  focusTopics: string[];
  description: string;
  passingScore: number;
}

const PRESETS: Preset[] = [
  { id: "tcs", name: "TCS (Ninja & Digital)", category: "service", questionCount: 2, timeLimitMinutes: 45, difficulty: "Easy", focusTopics: ["Arrays", "Strings", "Basic Math"], description: "Fundamental problem solving and array logic.", passingScore: 70 },
  { id: "infosys", name: "Infosys (DSE & SP)", category: "service", questionCount: 3, timeLimitMinutes: 60, difficulty: "Mixed", focusTopics: ["Greedy", "DP", "Strings"], description: "Algorithm efficiency and problem formulation.", passingScore: 75 },
  { id: "wipro", name: "Wipro (Elite & Turbo)", category: "service", questionCount: 2, timeLimitMinutes: 45, difficulty: "Easy", focusTopics: ["Pattern Printing", "Arrays"], description: "Syntax fluency and clean logic flow.", passingScore: 70 },
  { id: "accenture", name: "Accenture", category: "service", questionCount: 2, timeLimitMinutes: 45, difficulty: "Easy", focusTopics: ["Data Structures", "Strings"], description: "Rapid coding ability and basic DSA.", passingScore: 70 },
  { id: "capgemini", name: "Capgemini", category: "service", questionCount: 2, timeLimitMinutes: 40, difficulty: "Easy", focusTopics: ["Pseudocode", "Arrays"], description: "Logic correction and basic algorithms.", passingScore: 65 },
  { id: "cognizant", name: "Cognizant", category: "service", questionCount: 2, timeLimitMinutes: 50, difficulty: "Easy", focusTopics: ["Arrays", "SQL Basics"], description: "Standard coding and SQL concepts.", passingScore: 70 },
  { id: "google", name: "Google", category: "faang", questionCount: 3, timeLimitMinutes: 90, difficulty: "Hard", focusTopics: ["Graphs", "DP", "Segment Trees"], description: "High-bar time/space complexity evaluation.", passingScore: 85 },
  { id: "microsoft", name: "Microsoft", category: "faang", questionCount: 3, timeLimitMinutes: 75, difficulty: "Hard", focusTopics: ["Trees", "LinkedList", "System Logic"], description: "Production-ready code and edge case handling.", passingScore: 80 },
  { id: "amazon", name: "Amazon", category: "faang", questionCount: 2, timeLimitMinutes: 70, difficulty: "Hard", focusTopics: ["BFS/DFS", "Heaps", "Sliding Window"], description: "Optimal time complexity and heap queues.", passingScore: 80 },
  { id: "adobe", name: "Adobe", category: "product", questionCount: 2, timeLimitMinutes: 60, difficulty: "Medium", focusTopics: ["Arrays", "Trees", "Binary Search"], description: "Mathematical reasoning and tree structures.", passingScore: 75 },
  { id: "uber", name: "Uber", category: "faang", questionCount: 3, timeLimitMinutes: 80, difficulty: "Hard", focusTopics: ["Graph Traversals", "Concurrency Logic"], description: "Scalable data structures and spatial queries.", passingScore: 85 },
  { id: "startup", name: "High-Growth Startup", category: "startup", questionCount: 3, timeLimitMinutes: 60, difficulty: "Medium", focusTopics: ["Fullstack Logic", "Debugging", "APIs"], description: "Practical fullstack problem solving.", passingScore: 75 },
  { id: "custom", name: "Custom Company Round", category: "product", questionCount: 3, timeLimitMinutes: 60, difficulty: "Mixed", focusTopics: ["DSA", "SQL", "Frontend", "Backend"], description: "Customizable company simulation.", passingScore: 70 },
];

const TYPES = [
  { id: "practice", label: "Practice Assessment", desc: "Untimed practice with hints" },
  { id: "company", label: "Company Assessment", desc: "Simulates exact company rounds" },
  { id: "timed", label: "Timed Coding Round", desc: "Strict exam timer & auto submit" },
  { id: "dsa", label: "DSA Assessment", desc: "Focuses on Data Structures & Algorithms" },
  { id: "sql", label: "SQL Assessment", desc: "Focuses on Database Queries" },
  { id: "frontend", label: "Frontend Logic", desc: "DOM & JS logic algorithms" },
  { id: "backend", label: "Backend Logic", desc: "API logic & JSON processing" },
  { id: "fullstack", label: "Full Stack Assessment", desc: "End-to-end fullstack test" },
  { id: "custom", label: "Custom Assessment", desc: "Fully configurable" }
];

const LOADING_CHECKLIST = [
  "Preparing Assessment Workspace",
  "Compiling Company Question Matrix",
  "Configuring Monaco Editor & Language Extensions",
  "Initializing Piston Execution Sandbox",
  "Connecting Centralized AI Multi-LLM Orchestrator",
  "Ready for Assessment"
];

const CATEGORY_COLORS: Record<string, string> = {
  service: "#10b981",
  product: "#8b5cf6",
  faang: "#f59e0b",
  startup: "#06b6d4",
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface CodingAssessmentViewProps {
  setView?: (v: string) => void;
}

export function CodingAssessmentView({ setView }: CodingAssessmentViewProps) {
  const [step, setStep] = useState<"preset" | "env_check" | "loading" | "assessment" | "report" | "history">("preset");
  const [theme, setTheme] = useState("dark");

  const [selectedCompany, setSelectedCompany] = useState<Preset>(PRESETS[0]);
  const [selectedType, setSelectedType] = useState(TYPES[1].id);
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [micGranted, setMicGranted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const [loadingCheckIndex, setLoadingCheckIndex] = useState(0);

  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userCodes, setUserCodes] = useState<Record<string, string>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({ "0": true });
  const [showHiddenTests, setShowHiddenTests] = useState<Record<string, boolean>>({});

  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [questionResults, setQuestionResults] = useState<Record<string, any>>({});
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);

  const [secondsRemaining, setSecondsRemaining] = useState(3600);
  const [isPaused, setIsPaused] = useState(false);
  const [warningAlert, setWarningAlert] = useState<string | null>(null);

  const [report, setReport] = useState<any | null>(null);
  const [isSubmittingSession, setIsSubmittingSession] = useState(false);

  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<any | null>(null);

  const editorRef = useRef<any>(null);
  const isDark = theme === "dark";

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(t);
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (step !== "assessment" || isPaused || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        const next = prev - 1;
        if (next === 1800) setWarningAlert("30 Minutes Remaining!");
        else if (next === 600) setWarningAlert("10 Minutes Remaining!");
        else if (next === 300) setWarningAlert("5 Minutes Remaining! Finalize your code.");
        else if (next === 60) setWarningAlert("1 Minute Remaining! Auto-submitting soon.");
        else if (next <= 0) { handleAutoSubmit(); }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, isPaused, secondsRemaining]);

  useEffect(() => {
    if (step !== "loading") return;
    if (loadingCheckIndex < LOADING_CHECKLIST.length - 1) {
      const t = setTimeout(() => setLoadingCheckIndex(prev => prev + 1), 600);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setStep("assessment"), 800);
      return () => clearTimeout(t);
    }
  }, [step, loadingCheckIndex]);

  const requestMic = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      toast.success("Microphone verified.");
    } catch { setMicGranted(false); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleStartSession = async () => {
    if (!rulesAccepted) { toast.error("Please accept the assessment rules."); return; }
    setStep("loading");
    setLoadingCheckIndex(0);
    try {
      const res = await api.post("/placement/coding-assessment/start", {
        companyId: selectedCompany.id,
        assessmentType: selectedType,
        language: selectedLanguage,
        durationMinutes: selectedCompany.timeLimitMinutes
      });
      if (res.data?.success) {
        setAssessmentId(res.data.id);
        setQuestions(res.data.questions || []);
        setSecondsRemaining((res.data.timeLimitMinutes || 60) * 60);
        const initialCodes: Record<string, string> = {};
        (res.data.questions || []).forEach((q: any) => { initialCodes[q.id] = q.starterCode || ""; });
        setUserCodes(initialCodes);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to initialize assessment.");
    }
  };

  const handleRunCode = async () => {
    const currentQ = questions[currentQIndex];
    if (!currentQ) return;
    setIsExecuting(true);
    setExecutionOutput(null);
    try {
      const res = await api.post("/placement/coding-assessment/run", {
        language: selectedLanguage,
        code: userCodes[currentQ.id] || "",
        stdin: customInput || (currentQ.examples && currentQ.examples[0]?.input) || ""
      });
      if (res.data?.success) {
        const out = res.data.stdout || res.data.stderr || res.data.compile_output || "Program finished with no output.";
        setExecutionOutput(out);
        toast.success(`Execution completed (${res.data.executionTime || 0}ms)`);
      } else {
        setExecutionOutput(res.data?.compile_output || "Execution failed.");
      }
    } catch {
      setExecutionOutput("Piston Sandbox Connection Error.");
      toast.error("Code execution failed.");
    } finally { setIsExecuting(false); }
  };

  const handleSubmitQuestion = async () => {
    const currentQ = questions[currentQIndex];
    if (!currentQ || !assessmentId) return;
    setIsSubmittingQuestion(true);
    try {
      const res = await api.post("/placement/coding-assessment/submit-question", {
        assessmentId, questionId: currentQ.id, code: userCodes[currentQ.id] || "", language: selectedLanguage
      });
      if (res.data?.success) {
        setQuestionResults(prev => ({ ...prev, [currentQ.id]: res.data }));
        if (res.data.allPassed) {
          toast.success(`All ${res.data.passedTests} Testcases Passed!`);
          confetti({ particleCount: 50, spread: 60 });
        } else {
          toast.warning(`Passed ${res.data.passedTests} / ${res.data.totalTests} testcases.`);
        }
      }
    } catch { toast.error("Failed to submit question."); }
    finally { setIsSubmittingQuestion(false); }
  };

  const handleFinalSubmit = async () => {
    if (!assessmentId) return;
    setIsSubmittingSession(true);
    try {
      const submissions = questions.map(q => ({ questionId: q.id, code: userCodes[q.id] || "", language: selectedLanguage }));
      const timeSpentSeconds = selectedCompany.timeLimitMinutes * 60 - secondsRemaining;
      const res = await api.post("/placement/coding-assessment/submit", {
        assessmentId, submissions, timeSpentSeconds: Math.max(30, timeSpentSeconds)
      });
      if (res.data?.success) {
        setReport(res.data.report);
        setStep("report");
        toast.success("Assessment Completed & AI Evaluation Generated!");
        confetti({ particleCount: 100, spread: 80 });
      }
    } catch { toast.error("Failed to generate assessment report."); }
    finally { setIsSubmittingSession(false); }
  };

  const handleAutoSubmit = () => {
    toast.info("Assessment time limit reached. Auto-submitting...");
    handleFinalSubmit();
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/placement/coding-assessment/history");
      if (res.data?.success) setHistoryData(res.data.history || []);
    } catch { toast.error("Failed to load assessment history."); }
    finally { setHistoryLoading(false); }
  };

  const loadHistoryResult = async (id: string) => {
    try {
      const res = await api.get(`/placement/coding-assessment/result/${id}`);
      if (res.data?.success) { setSelectedHistory(res.data); }
    } catch { toast.error("Failed to load assessment details."); }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className={cn("min-h-screen p-4 md:p-8 space-y-6 transition-colors duration-300", isDark ? "text-slate-100" : "text-slate-900")}>
      <AnimatePresence>
        {warningAlert && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md flex items-center justify-between gap-4 text-amber-500 shadow-xl">
            <div className="flex items-center gap-2">
              <AlertTriangle className="animate-bounce" size={20} />
              <span className="font-semibold text-sm">{warningAlert}</span>
            </div>
            <button onClick={() => setWarningAlert(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ STEP 1: PRESET SELECTION ═══════════════ */}
      {step === "preset" && (
        <motion.div initial="hidden" animate="visible" variants={codingFadeUp} className="max-w-6xl mx-auto space-y-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-3">
                  <Sparkles size={14} /> Official Company Placement Round Simulator
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">AI Coding Assessment Platform</h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
                  Simulate actual online coding rounds for TCS, Infosys, Wipro, Google, Microsoft, and Amazon. Evaluated with Piston sandbox execution and Centralized AI Multi-LLM Orchestration.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setStep("history"); loadHistory(); }}
                  className="self-start md:self-auto px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] transition-colors flex items-center gap-2">
                  <History size={16} /> Past Assessments
                </button>
                {setView && (
                  <button onClick={() => setView("placement-hub")}
                    className="self-start md:self-auto px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] transition-colors flex items-center gap-2">
                    <ChevronLeft size={16} /> Placement Hub
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Assessment Type Tabs */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2"><Layers className="text-amber-500" size={20} /> Select Assessment Round Type</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {TYPES.map(t => (
                <button key={t.id} onClick={() => setSelectedType(t.id)}
                  className={cn("p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-2",
                    selectedType === t.id ? "border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/5" : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-amber-500/30"
                  )}>
                  <span className="font-bold text-sm">{t.label}</span>
                  <span className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Company Presets Grid */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2"><Building2 className="text-cyan-500" size={20} /> Select Company Placement Preset</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PRESETS.map(preset => {
                const isSelected = selectedCompany.id === preset.id;
                return (
                  <motion.div key={preset.id} whileHover={{ scale: 1.01 }} onClick={() => setSelectedCompany(preset)}
                    className={cn("p-6 rounded-2xl border cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between gap-4",
                      isSelected ? "border-cyan-500 bg-cyan-500/10 shadow-xl shadow-cyan-500/5" : "border-[var(--border-color)] bg-[var(--card-bg)] hover:border-cyan-500/40"
                    )}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-extrabold text-base flex items-center gap-2">{preset.name}</h4>
                        <DifficultyBadge difficulty={preset.difficulty} />
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mb-3">{preset.description}</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {preset.focusTopics.map((topic, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-secondary)] font-mono">{topic}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-3 border-t border-[var(--border-color)]">
                      <span className="flex items-center gap-1 font-semibold"><Code2 size={14} className="text-amber-500" /> {preset.questionCount} Questions</span>
                      <span className="flex items-center gap-1 font-semibold"><Clock size={14} className="text-purple-500" /> {preset.timeLimitMinutes} Mins</span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-500"><Target size={14} /> Pass: {preset.passingScore}%</span>
                    </div>
                    <div className="absolute top-3 right-3">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: `${CATEGORY_COLORS[preset.category]}20`, color: CATEGORY_COLORS[preset.category], border: `1px solid ${CATEGORY_COLORS[preset.category]}40` }}>
                        {preset.category}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Start CTA Footer */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]">
            <div>
              <div className="font-bold text-sm">Selected Config: <span className="text-amber-500">{selectedCompany.name}</span> ({selectedCompany.questionCount} Questions, {selectedCompany.timeLimitMinutes} Mins)</div>
              <p className="text-xs text-[var(--text-secondary)]">Proceed to system environment check before opening live exam workspace.</p>
            </div>
            <button onClick={() => setStep("env_check")}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform flex items-center gap-2">
              Proceed to Environment Check <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══════════════ STEP 2: ENVIRONMENT CHECK ═══════════════ */}
      {step === "env_check" && (
        <motion.div initial="hidden" animate="visible" variants={codingFadeUp} className="max-w-3xl mx-auto space-y-6">
          <div className="p-8 rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <h2 className="text-2xl font-extrabold flex items-center gap-2"><Shield className="text-amber-500" /> System & Environment Verification</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Ensure your browser and environment meet company exam guidelines.</p>
              </div>
              <button onClick={() => setStep("preset")} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Back</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mic size={20} className={micGranted ? "text-emerald-500" : "text-[var(--text-secondary)]"} />
                  <div><div className="text-xs font-bold">Microphone (Optional)</div><div className="text-[10px] text-[var(--text-secondary)]">{micGranted ? "Verified & Ready" : "Unverified"}</div></div>
                </div>
                <button onClick={requestMic} className="px-3 py-1 rounded-lg text-xs font-semibold border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--border-color)]">{micGranted ? "Re-check" : "Enable"}</button>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Maximize size={20} className={isFullscreen ? "text-emerald-500" : "text-[var(--text-secondary)]"} />
                  <div><div className="text-xs font-bold">Fullscreen Mode</div><div className="text-[10px] text-[var(--text-secondary)]">{isFullscreen ? "Fullscreen Enabled" : "Recommended for assessment"}</div></div>
                </div>
                <button onClick={toggleFullscreen} className="px-3 py-1 rounded-lg text-xs font-semibold border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--border-color)]">{isFullscreen ? "Exit" : "Enter"}</button>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wifi size={20} className="text-emerald-500" />
                  <div><div className="text-xs font-bold">Internet Connection</div><div className="text-[10px] text-emerald-500 font-semibold">Stable (Piston Sandbox Reachable)</div></div>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileCode2 size={20} className="text-purple-500" />
                  <div><div className="text-xs font-bold">Primary Language</div>
                    <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} className="text-xs bg-transparent text-amber-500 font-semibold outline-none cursor-pointer">
                      <option value="javascript">JavaScript (Node.js)</option>
                      <option value="python">Python 3</option>
                      <option value="cpp">C++ (GCC 10.2)</option>
                      <option value="java">Java 15</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2 text-xs">
              <div className="font-bold text-amber-500 flex items-center gap-2"><AlertTriangle size={16} /> Placement Assessment Honor Code</div>
              <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)] text-[11px]">
                <li>Code is evaluated using Piston sandbox with hidden test cases and edge cases.</li>
                <li>Timer runs continuously. Assessment auto-submits when time expires.</li>
                <li>AI Multi-LLM Orchestrator will analyze code quality, optimization, and time complexity.</li>
              </ul>
              <label className="flex items-center gap-2 pt-2 cursor-pointer">
                <input type="checkbox" checked={rulesAccepted} onChange={e => setRulesAccepted(e.target.checked)} className="rounded accent-amber-500" />
                <span className="font-semibold text-xs text-[var(--text-primary)]">I agree to the assessment rules and honor code.</span>
              </label>
            </div>

            <button onClick={handleStartSession} disabled={!rulesAccepted}
              className={cn("w-full py-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl transition-all",
                rulesAccepted ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black shadow-amber-500/20 hover:scale-[1.01]" : "bg-gray-500/20 text-gray-400 cursor-not-allowed"
              )}>
              Start Placement Assessment Now <Play size={18} />
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══════════════ STEP 3: LOADING ═══════════════ */}
      {step === "loading" && (
        <div className="min-h-[60vh] flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-full border-4 border-amber-500/20 border-t-amber-500 flex items-center justify-center shadow-2xl">
            <Cpu className="text-amber-500" size={32} />
          </motion.div>
          <h3 className="text-xl font-extrabold">Configuring Company Exam Sandbox</h3>
          <div className="w-full space-y-2 text-left">
            {LOADING_CHECKLIST.map((item, index) => {
              const isDone = index < loadingCheckIndex;
              const isCurrent = index === loadingCheckIndex;
              return (
                <div key={index} className={cn("p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-300",
                  isDone ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500" :
                  isCurrent ? "border-amber-500/50 bg-amber-500/10 text-amber-500 animate-pulse" :
                  "border-[var(--border-color)] bg-[var(--bg-dark)] opacity-40 text-[var(--text-secondary)]"
                )}>
                  <span>{item}</span>
                  {isDone && <CheckCircle2 size={16} />}
                  {isCurrent && <RefreshCw className="animate-spin" size={16} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 4: LIVE ASSESSMENT ═══════════════ */}
      {step === "assessment" && currentQ && (
        <div className="space-y-4 max-w-[1600px] mx-auto">
          {/* Top Exam Header & Timer */}
          <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black">
                {selectedCompany.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">{selectedCompany.name} Assessment</h3>
                <div className="text-xs text-[var(--text-secondary)]">Question {currentQIndex + 1} of {questions.length} &bull; Language: <span className="text-amber-500 font-bold uppercase">{selectedLanguage}</span></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedType === "practice" && (
                <button onClick={() => setIsPaused(!isPaused)} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold flex items-center gap-1.5">
                  {isPaused ? <Play size={14} className="text-emerald-500" /> : <Pause size={14} className="text-amber-500" />}
                  {isPaused ? "Resume" : "Pause"}
                </button>
              )}
              <div className={cn("px-4 py-2 rounded-xl border font-mono font-bold text-sm flex items-center gap-2 shadow-inner",
                secondsRemaining < 300 ? "border-red-500/50 bg-red-500/10 text-red-500 animate-pulse" :
                secondsRemaining < 600 ? "border-amber-500/50 bg-amber-500/10 text-amber-500" :
                "border-[var(--border-color)] bg-[var(--bg-dark)] text-emerald-400"
              )}>
                <Clock size={16} /><span>{formatTime(secondsRemaining)}</span>
              </div>
              <button onClick={handleFinalSubmit} disabled={isSubmittingSession}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-extrabold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform flex items-center gap-1.5">
                {isSubmittingSession ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                Submit Round
              </button>
            </div>
          </div>

          {/* Main Assessment Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Panel: Question Details */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DifficultyBadge difficulty={currentQ.difficulty} />
                    {currentQ.type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 font-semibold">{currentQ.type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setBookmarked(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
                      className={cn("p-1.5 rounded-lg border", bookmarked[currentQ.id] ? "border-amber-500 text-amber-500 bg-amber-500/10" : "border-[var(--border-color)] text-[var(--text-secondary)]")}>
                      <Bookmark size={14} />
                    </button>
                    <button onClick={() => setFlagged(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }))}
                      className={cn("p-1.5 rounded-lg border", flagged[currentQ.id] ? "border-red-500 text-red-500 bg-red-500/10" : "border-[var(--border-color)] text-[var(--text-secondary)]")}>
                      <Flag size={14} />
                    </button>
                  </div>
                </div>
                <h2 className="text-xl font-extrabold">{currentQ.title}</h2>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{renderMarkdown(currentQ.description, isDark)}</div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                  <div className="text-xs font-bold text-amber-500">Input Format</div>
                  <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-dark)] p-2.5 rounded-xl border border-[var(--border-color)] font-mono whitespace-pre-wrap">{currentQ.inputFormat}</div>
                  <div className="text-xs font-bold text-cyan-500">Output Format</div>
                  <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-dark)] p-2.5 rounded-xl border border-[var(--border-color)] font-mono whitespace-pre-wrap">{currentQ.outputFormat}</div>
                </div>

                {currentQ.constraints && (
                  <div className="space-y-1 text-xs">
                    <div className="font-bold text-purple-500">Constraints</div>
                    <ul className="list-disc list-inside text-[var(--text-secondary)] font-mono text-[11px]">
                      {currentQ.constraints.map((c: string, i: number) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}

                {currentQ.examples && (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold">Sample Examples</div>
                    {currentQ.examples.map((ex: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] space-y-1 font-mono text-xs">
                        <div><span className="text-[var(--text-secondary)]">Input:</span> <span className="text-amber-400">{ex.input}</span></div>
                        <div><span className="text-[var(--text-secondary)]">Output:</span> <span className="text-emerald-400">{ex.output}</span></div>
                        {ex.explanation && <div className="text-[11px] text-[var(--text-secondary)] font-sans pt-1 border-t border-[var(--border-color)]">{ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Review from submitQuestion */}
                {questionResults[currentQ.id]?.aiFeedback && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                    <div className="text-xs font-bold text-amber-500 flex items-center gap-1"><BrainCircuit size={14} /> AI Code Review</div>
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] space-y-2">
                      <p className="text-[11px] text-[var(--text-secondary)]">{questionResults[currentQ.id].aiFeedback.summary}</p>
                      <div className="flex gap-2 flex-wrap">
                        {questionResults[currentQ.id].aiFeedback.qualityScore && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">Quality: {questionResults[currentQ.id].aiFeedback.qualityScore}/100</span>
                        )}
                      </div>
                      {questionResults[currentQ.id].aiFeedback.optimizations?.length > 0 && (
                        <div className="space-y-1">
                          {questionResults[currentQ.id].aiFeedback.optimizations.map((opt: string, i: number) => (
                            <div key={i} className="text-[10px] text-[var(--text-secondary)] flex items-start gap-1">
                              <Lightbulb size={10} className="text-amber-500 mt-0.5 shrink-0" /> {opt}
                            </div>
                          ))}
                        </div>
                      )}
                      {questionResults[currentQ.id].aiFeedback.interviewPerspective && (
                        <div className="text-[10px] text-cyan-400 pt-1 border-t border-[var(--border-color)]">
                          <span className="font-bold">Interview:</span> {questionResults[currentQ.id].aiFeedback.interviewPerspective}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Question Navigation Palette */}
              <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-3">
                <div className="text-xs font-bold flex items-center justify-between">
                  <span>Question Palette</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">Completed {Object.keys(questionResults).length} of {questions.length}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {questions.map((q, idx) => {
                    const isCurrent = idx === currentQIndex;
                    const isEvaluated = questionResults[q.id]?.allPassed;
                    const isPart = questionResults[q.id] && !questionResults[q.id]?.allPassed;
                    const isFlg = flagged[q.id];
                    return (
                      <button key={q.id} onClick={() => { setCurrentQIndex(idx); setVisited(prev => ({ ...prev, [idx]: true })); }}
                        className={cn("w-9 h-9 rounded-xl font-bold text-xs border transition-all flex items-center justify-center relative",
                          isCurrent ? "border-amber-500 bg-amber-500/20 text-amber-500 shadow-md shadow-amber-500/20 scale-105" :
                          isEvaluated ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" :
                          isPart ? "border-orange-500/50 bg-orange-500/10 text-orange-500" :
                          "border-[var(--border-color)] bg-[var(--bg-dark)] hover:border-amber-500/30"
                        )}>
                        {idx + 1}
                        {isFlg && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-4 text-[10px] text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50" /> Answered</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/50" /> Partial</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[var(--bg-dark)] border border-[var(--border-color)]" /> Unvisited</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Flagged</span>
                </div>
              </div>
            </div>

            {/* Right Panel: Monaco Editor & Results */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] overflow-hidden shadow-2xl">
                <div className="p-3 border-b border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <Terminal size={14} className="text-amber-500" />
                    <span>solution.{selectedLanguage === "javascript" ? "js" : selectedLanguage === "python" ? "py" : selectedLanguage === "cpp" ? "cpp" : "java"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowCustomInput(!showCustomInput)}
                      className="text-[11px] text-[var(--text-secondary)] font-mono hover:text-amber-500 transition-colors flex items-center gap-1">
                      <Terminal size={12} /> Custom Input
                    </button>
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono">Auto-saved</span>
                  </div>
                </div>

                <AnimatePresence>
                  {showCustomInput && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-b border-[var(--border-color)] overflow-hidden">
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Custom Input</span>
                          <button onClick={() => { setCustomInput(""); setShowCustomInput(false); }}><X size={12} className="text-[var(--text-secondary)]" /></button>
                        </div>
                        <textarea value={customInput} onChange={e => setCustomInput(e.target.value)}
                          placeholder="Enter custom input for testing..."
                          className="w-full h-20 p-2 text-xs font-mono bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] resize-none focus:outline-none focus:border-amber-500/50" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="h-[450px]">
                  <Editor
                    height="100%"
                    language={selectedLanguage === "cpp" ? "cpp" : selectedLanguage}
                    theme={isDark ? "vs-dark" : "light"}
                    value={userCodes[currentQ.id] || ""}
                    onChange={(val) => setUserCodes(prev => ({ ...prev, [currentQ.id]: val || "" }))}
                    onMount={(editor) => { editorRef.current = editor; }}
                    options={{
                      fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false,
                      automaticLayout: true, fontLigatures: true, bracketPairColorization: { enabled: true },
                      smoothScrolling: true, cursorSmoothCaretAnimation: "on",
                    }}
                  />
                </div>

                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between gap-3">
                  <button onClick={handleRunCode} disabled={isExecuting}
                    className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:bg-[var(--border-color)] text-xs font-bold flex items-center gap-1.5 transition-colors">
                    {isExecuting ? <RefreshCw className="animate-spin text-amber-500" size={14} /> : <Play size={14} className="text-emerald-500" />}
                    Run Sample
                  </button>
                  <button onClick={handleSubmitQuestion} disabled={isSubmittingQuestion}
                    className="px-5 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow-md shadow-amber-500/20 hover:scale-105 transition-transform flex items-center gap-1.5">
                    {isSubmittingQuestion ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Submit Question
                  </button>
                </div>
              </div>

              {/* Execution Output & Test Results */}
              {(executionOutput || questionResults[currentQ.id]) && (
                <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-3 font-mono text-xs">
                  <div className="font-bold text-amber-500 flex items-center gap-2"><Cpu size={16} /> Evaluation Output</div>
                  {executionOutput && (
                    <div className="p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-secondary)] whitespace-pre-wrap max-h-40 overflow-y-auto">{executionOutput}</div>
                  )}
                  {questionResults[currentQ.id] && (
                    <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
                      <div className="flex items-center justify-between text-xs font-sans">
                        <span className="font-bold">{questionResults[currentQ.id].verdict}</span>
                        <span className={questionResults[currentQ.id].allPassed ? "text-emerald-500 font-bold" : "text-amber-500 font-bold"}>
                          Passed {questionResults[currentQ.id].passedTests} / {questionResults[currentQ.id].totalTests} Test Cases
                        </span>
                      </div>

                      {/* Test case details */}
                      {questionResults[currentQ.id].testDetails && (
                        <div className="space-y-1">
                          {questionResults[currentQ.id].testDetails.map((tc: any) => (
                            <div key={tc.testNumber} className={cn("flex items-center justify-between p-2 rounded-lg text-[11px] font-sans",
                              tc.passed ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-red-500/5 border border-red-500/20"
                            )}>
                              <span className="flex items-center gap-2">
                                {tc.passed ? <CheckCircle2 size={12} className="text-emerald-500" /> : <AlertTriangle size={12} className="text-red-500" />}
                                Test {tc.testNumber} {tc.isHidden ? <EyeOff size={10} className="text-[var(--text-secondary)]" /> : <Eye size={10} className="text-[var(--text-secondary)]" />}
                              </span>
                              {!tc.passed && <span className="text-[10px] text-[var(--text-secondary)] font-mono">Got: {tc.actualOutput?.slice(0, 50)}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
                        <div className="p-2 rounded-lg bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <span className="text-[var(--text-secondary)]">Time: </span>
                          <span className="font-bold text-purple-400">{questionResults[currentQ.id].complexity?.timeComplexity || "O(N)"}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <span className="text-[var(--text-secondary)]">Space: </span>
                          <span className="font-bold text-cyan-400">{questionResults[currentQ.id].complexity?.spaceComplexity || "O(1)"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Pagination */}
          <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)]">
            <button onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))} disabled={currentQIndex === 0}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold disabled:opacity-30 flex items-center gap-1.5">
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-xs text-[var(--text-secondary)] font-semibold">Question {currentQIndex + 1} / {questions.length}</span>
            <button onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))} disabled={currentQIndex === questions.length - 1}
              className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold disabled:opacity-30 flex items-center gap-1.5">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ STEP 5: ASSESSMENT REPORT ═══════════════ */}
      {step === "report" && report && (
        <motion.div initial="hidden" animate="visible" variants={codingFadeUp} className="max-w-6xl mx-auto space-y-8">

          {/* Result Banner */}
          <div className="p-8 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Trophy size={14} /> Official Session Report Generated
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold">{selectedCompany.name} Assessment Result</h1>
              <p className="text-sm text-[var(--text-secondary)] max-w-xl">{report.summary}</p>
              {/* XP & Badges */}
              <div className="flex items-center gap-3 pt-2">
                {report.xpAwarded && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                    <Zap size={14} /> +{report.xpAwarded} XP
                  </span>
                )}
                {report.badgesEarned?.map((badge: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
                    <Award size={14} /> {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <motion.circle cx="60" cy="60" r="52" fill="none" stroke={report.score >= 70 ? "#10b981" : "#f59e0b"} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 52}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - report.score / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
                  className="text-3xl font-black text-emerald-400">{report.score}</motion.span>
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Score</span>
              </div>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
              <div className="text-xs text-[var(--text-secondary)] font-semibold">Testcase Accuracy</div>
              <div className="text-2xl font-extrabold text-amber-500">{report.passedTestcases}/{report.totalTestcases}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">{report.accuracyScore}% accuracy</div>
            </div>
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
              <div className="text-xs text-[var(--text-secondary)] font-semibold">Code Quality</div>
              <div className="text-2xl font-extrabold text-cyan-400">{report.codeQualityGrade}</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Grade rating</div>
            </div>
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
              <div className="text-xs text-[var(--text-secondary)] font-semibold">Company Readiness</div>
              <div className="text-2xl font-extrabold text-purple-400">{report.companyReadiness}%</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Target company match</div>
            </div>
            <div className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-1">
              <div className="text-xs text-[var(--text-secondary)] font-semibold">Placement Confidence</div>
              <div className="text-2xl font-extrabold text-emerald-400">{report.placementConfidence}%</div>
              <div className="text-[10px] text-[var(--text-secondary)]">Overall readiness</div>
            </div>
          </div>

          {/* Chart.js Analytics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Skill Radar */}
            {report.skillBreakdown && (
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-amber-500"><Activity size={16} /> Skill Breakdown</h3>
                <div className="h-[250px]">
                  <RadarChart
                    data={{
                      labels: ["Problem Solving", "Code Efficiency", "Code Quality", "Edge Cases", "Time Mgmt"],
                      datasets: [{
                        label: "Your Score",
                        data: [
                          report.skillBreakdown.problemSolving || 0,
                          report.skillBreakdown.codeEfficiency || 0,
                          report.skillBreakdown.codeQuality || 0,
                          report.skillBreakdown.edgeCaseHandling || 0,
                          report.skillBreakdown.timeManagement || 0,
                        ],
                        backgroundColor: "rgba(245, 158, 11, 0.15)",
                        borderColor: "#f59e0b",
                        borderWidth: 2,
                        pointBackgroundColor: "#f59e0b",
                        pointRadius: 4,
                      }]
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false,
                      scales: { r: { beginAtZero: true, max: 100, ticks: { display: false, stepSize: 20 }, grid: { color: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }, pointLabels: { color: isDark ? "#9ca3af" : "#4b5563", font: { size: 10 } } } },
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Question Performance Bar */}
            {report.evaluatedQuestions && (
              <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-cyan-500"><BarChart3 size={16} /> Question Performance</h3>
                <div className="h-[250px]">
                  <BarChart
                    data={{
                      labels: report.evaluatedQuestions.map((q: any) => q.title?.slice(0, 15) + "..."),
                      datasets: [{
                        label: "Passed %",
                        data: report.evaluatedQuestions.map((q: any) => q.totalTests > 0 ? Math.round((q.passedTests / q.totalTests) * 100) : 0),
                        backgroundColor: report.evaluatedQuestions.map((q: any) => q.passed ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)"),
                        borderColor: report.evaluatedQuestions.map((q: any) => q.passed ? "#10b981" : "#ef4444"),
                        borderWidth: 1,
                        borderRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true, maintainAspectRatio: false, indexAxis: "y",
                      scales: { x: { beginAtZero: true, max: 100, grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }, ticks: { color: isDark ? "#6b7280" : "#9ca3af", font: { size: 10 } } }, y: { grid: { display: false }, ticks: { color: isDark ? "#9ca3af" : "#4b5563", font: { size: 10 } } } },
                      plugins: { legend: { display: false } }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Readiness Doughnut */}
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] shadow-xl">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4 text-purple-500"><PieChart size={16} /> Readiness Breakdown</h3>
              <div className="h-[250px]">
                <DoughnutChart
                  data={{
                    labels: ["Coding", "Company", "Interview", "Placement"],
                    datasets: [{
                      data: [report.codingReadiness || 0, report.companyReadiness || 0, report.interviewReadiness || 0, report.placementConfidence || 0],
                      backgroundColor: ["rgba(245, 158, 11, 0.7)", "rgba(139, 92, 246, 0.7)", "rgba(6, 182, 212, 0.7)", "rgba(16, 185, 129, 0.7)"],
                      borderColor: ["#f59e0b", "#8b5cf6", "#06b6d4", "#10b981"],
                      borderWidth: 2,
                    }]
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false, cutout: "65%",
                    plugins: { legend: { position: "bottom", labels: { color: isDark ? "#9ca3af" : "#4b5563", font: { size: 10 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } } }
                  }}
                />
              </div>
            </div>
          </div>

          {/* AI Insights & Coach Advice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-4 shadow-xl">
              <h3 className="text-lg font-bold flex items-center gap-2 text-amber-500"><BrainCircuit /> DeepSeek & Nemotron AI Insights</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{report.aiCoachAdvice}</p>
              <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                <div className="text-xs font-bold text-emerald-500">Strong Topics</div>
                <div className="flex flex-wrap gap-2">
                  {(report.strongTopics || []).map((t: string, i: number) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">{t}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
                <div className="text-xs font-bold text-red-400">Weak Topics to Improve</div>
                <div className="flex flex-wrap gap-2">
                  {(report.weakTopics || []).map((t: string, i: number) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 font-semibold">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Per-Question Breakdown */}
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-4 shadow-xl">
              <h3 className="text-lg font-bold flex items-center gap-2 text-cyan-500"><FileCode2 /> Question Breakdown</h3>
              <div className="space-y-3">
                {report.evaluatedQuestions?.map((q: any, i: number) => (
                  <div key={i} className={cn("p-3 rounded-xl border text-xs space-y-1",
                    q.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{q.title}</span>
                      {q.passed ? <CheckCircle2 size={14} className="text-emerald-500" /> : <AlertTriangle size={14} className="text-red-500" />}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                      <span>{q.passedTests}/{q.totalTests} tests</span>
                      <span>Time: {q.timeComplexity}</span>
                      <span>Space: {q.spaceComplexity}</span>
                      <span>{q.runtimeMs}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended Next Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-4 shadow-xl">
              <h3 className="text-lg font-bold flex items-center gap-2 text-cyan-500"><Rocket /> Recommended Next Steps</h3>
              <div className="space-y-3">
                {(report.suggestedInterviews || []).map((interview: string, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCheck size={16} className="text-cyan-500" />
                      <div>
                        <div className="text-xs font-bold">{interview}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">Practice interview to improve weak areas</div>
                      </div>
                    </div>
                    <button onClick={() => setView && setView("technical-interview")} className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black text-xs font-bold">Start</button>
                  </div>
                ))}
                {(report.suggestedChallenges || []).map((challenge: string, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code2 size={16} className="text-amber-500" />
                      <div>
                        <div className="text-xs font-bold">{challenge}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">Coding challenge to strengthen skills</div>
                      </div>
                    </div>
                    <button onClick={() => setView && setView("dsa-practice")} className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-bold">Practice</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] space-y-4 shadow-xl">
              <h3 className="text-lg font-bold flex items-center gap-2 text-purple-500"><TrendingUp /> Placement Insights</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)]">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Recommended Companies</div>
                  <div className="flex flex-wrap gap-2">
                    {(report.recommendedCompanies || []).map((c: string, i: number) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)]">
                  <div className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Readiness Scores</div>
                  <div className="space-y-2 mt-2">
                    {[
                      { label: "Coding Readiness", value: report.codingReadiness, color: "amber" },
                      { label: "Company Readiness", value: report.companyReadiness, color: "purple" },
                      { label: "Interview Readiness", value: report.interviewReadiness, color: "cyan" },
                    ].map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-[var(--text-secondary)]">{item.label}</span>
                          <span className={`font-bold text-${item.color}-400`}>{item.value}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--border-color)] overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ duration: 1, delay: i * 0.2 }}
                            className={`h-full rounded-full bg-${item.color}-500`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setView && setView("career-dashboard")}
                  className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] text-xs font-bold text-center hover:border-purple-500/30 transition-colors flex items-center justify-center gap-2">
                  <BarChart3 size={14} /> View Career Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-center gap-4">
            <button onClick={() => { setStep("preset"); setReport(null); }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-sm shadow-xl">
              Take Another Assessment
            </button>
            <button onClick={() => { setStep("history"); loadHistory(); }}
              className="px-6 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] font-bold text-sm flex items-center gap-2">
              <History size={16} /> View History
            </button>
          </div>
        </motion.div>
      )}

      {/* ═══════════════ STEP 6: ASSESSMENT HISTORY ═══════════════ */}
      {step === "history" && (
        <motion.div initial="hidden" animate="visible" variants={codingFadeUp} className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-extrabold flex items-center gap-2"><History className="text-amber-500" size={24} /> Assessment History</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1">View your past coding assessment sessions and performance trends.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setStep("preset"); setSelectedHistory(null); }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg">
                New Assessment
              </button>
              {setView && (
                <button onClick={() => setView("placement-hub")}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)]">
                  Placement Hub
                </button>
              )}
            </div>
          </div>

          {historyLoading ? (
            <div className="p-10 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] text-center space-y-3">
              <RefreshCw className="animate-spin mx-auto text-amber-500" size={24} />
              <p className="text-xs font-bold text-[var(--text-secondary)]">Loading assessment history...</p>
            </div>
          ) : historyData.length === 0 ? (
            <div className="p-10 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] text-center space-y-3">
              <Trophy className="mx-auto text-amber-500/40" size={40} />
              <p className="text-sm font-extrabold">No assessments yet</p>
              <p className="text-xs text-[var(--text-secondary)]">Start your first coding assessment to track your progress.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyData.map((h: any, i: number) => {
                const report = h.reportJson as any;
                return (
                  <motion.div key={h.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => loadHistoryResult(h.id)}
                    className="p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--card-bg)] hover:border-amber-500/30 cursor-pointer transition-all">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm">{h.company}</h4>
                          <DifficultyBadge difficulty={h.status === "completed" ? (report?.codeQualityGrade || "B") : "Medium"} />
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold",
                            h.status === "completed" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          )}>{h.status}</span>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          {h.assessmentType} &bull; {h.language} &bull; {new Date(h.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-black text-amber-500">{h.score || 0}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">{h.passedTestcases}/{h.totalTestcases} tests</div>
                        </div>
                        <ArrowUpRight size={16} className="text-[var(--text-secondary)]" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* History Detail Modal */}
          <AnimatePresence>
            {selectedHistory && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setSelectedHistory(null)}>
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                  className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6 space-y-6 custom-scrollbar"
                  onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                    <div>
                      <h3 className="text-xl font-extrabold">{selectedHistory.company} - Assessment Result</h3>
                      <p className="text-xs text-[var(--text-secondary)]">Completed {new Date(selectedHistory.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setSelectedHistory(null)} className="p-2 rounded-lg hover:bg-[var(--bg-dark)]"><X size={16} /></button>
                  </div>

                  {selectedHistory.report && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] text-center">
                          <div className="text-2xl font-black text-amber-500">{selectedHistory.report.score || selectedHistory.score}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">Score</div>
                        </div>
                        <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] text-center">
                          <div className="text-2xl font-black text-cyan-400">{selectedHistory.report.codeQualityGrade || "B"}</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">Grade</div>
                        </div>
                        <div className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] text-center">
                          <div className="text-2xl font-black text-emerald-400">{selectedHistory.report.placementConfidence || 0}%</div>
                          <div className="text-[10px] text-[var(--text-secondary)]">Placement</div>
                        </div>
                      </div>

                      {selectedHistory.report.aiCoachAdvice && (
                        <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-dark)] space-y-2">
                          <div className="text-xs font-bold text-amber-500 flex items-center gap-1"><BrainCircuit size={14} /> AI Coach Advice</div>
                          <p className="text-xs text-[var(--text-secondary)]">{selectedHistory.report.aiCoachAdvice}</p>
                        </div>
                      )}

                      {selectedHistory.report.evaluatedQuestions && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-cyan-500">Question Results</div>
                          {selectedHistory.report.evaluatedQuestions.map((q: any, i: number) => (
                            <div key={i} className={cn("p-3 rounded-xl border text-xs", q.passed ? "border-emerald-500/30" : "border-red-500/30")}>
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{q.title}</span>
                                <span className={q.passed ? "text-emerald-500" : "text-red-500"}>{q.passedTests}/{q.totalTests}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
