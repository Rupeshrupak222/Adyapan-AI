"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
import {
  Mic, MicOff, Send, PhoneOff, Clock, MessageSquare, Brain, Volume2, VolumeX,
  Code2, Terminal, Play, RotateCcw, BarChart3, Sparkles, Zap, Target, Settings2,
  ArrowRight, ChevronLeft, ChevronRight, ChevronDown, Check, Loader2, AlertTriangle, Trophy,
  TrendingUp, TrendingDown, Lightbulb, BookOpen, ArrowLeft, FileText, Star,
  Award, RefreshCw, Copy, CheckCircle2, XCircle, User, Bot, Info, Flame,
  Globe, Server, Monitor, Layers, Cpu, Database, Network, BrainCircuit,
  Braces, Binary, LayoutGrid, Shield, Briefcase, Download, Building2, Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { COMPANY_PRESETS, ROLE_PRESETS } from "../engine/EngineTypes";
import EngineAnalytics from "../engine/EngineAnalytics";
import CompanyLogo from "../CompanyLogo";
import InterviewIntelligence, { IntelligenceData } from "../shared/InterviewIntelligence";
import FormattedMarkdown from "@/components/shared/FormattedMarkdown";

// ─── Types ──────────────────────────────────────────────────────────────────

type TechnicalTopic =
  | "dsa" | "backend" | "frontend" | "fullstack"
  | "python" | "java" | "cpp" | "javascript"
  | "react" | "node" | "sql" | "database-design"
  | "rest-apis" | "system-design-basics" | "oop"
  | "operating-systems" | "dbms" | "computer-networks"
  | "machine-learning" | "ai-engineering" | "custom";

type CodingLanguage = "javascript" | "python" | "java" | "cpp" | "typescript";
type InterviewMode = "voice" | "coding" | "voice+coding";
type ViewScreen = "landing" | "loading" | "active" | "report" | "analytics";

interface TechnicalConfig {
  topic: TechnicalTopic;
  role: string;
  company: string;
  difficulty: "easy" | "medium" | "hard";
  experienceLevel: string;
  durationMinutes: number;
  language: string;
  codingLanguage: CodingLanguage;
  mode: InterviewMode;
  aiVoiceEnabled: boolean;
  voiceGender: "male" | "female" | "neutral";
  voiceSpeed: number;
  voicePitch: number;
  resumeAware: boolean;
  customInstructions: string;
}

interface CodingProblem {
  title: string;
  description: string;
  examples: Array<{ input: string; output: string; explanation: string }>;
  constraints: string[];
  starterCode: string;
  testCases: Array<{ input: string; expectedOutput: string }>;
}

interface TechnicalQuestionData {
  question: string;
  category: string;
  difficulty: string;
  isCodingChallenge: boolean;
  codingProblem: CodingProblem | null;
  expectedTopics: string[];
  followUpHint: string;
  timeEstimate: string;
  tips: string[];
}

interface EngineMessage {
  id: string;
  role: "interviewer" | "candidate" | "system";
  content: string;
  timestamp: number;
  questionNumber?: number;
  isFollowUp?: boolean;
}

interface TechnicalEvaluation {
  overallScore: number;
  technicalDepth: number;
  codeQuality: number;
  problemSolving: number;
  communication: number;
  timeComplexity: string;
  spaceComplexity: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  recommendedTopics: string[];
  hiringRecommendation: string;
  summary: string;
  answerBreakdowns: Array<{
    questionNumber: number;
    question: string;
    answer: string;
    score: number;
    analysis: string;
    tags: string[];
  }>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TOPICS: { id: TechnicalTopic; label: string; icon: any; color: string; category: string }[] = [
  { id: "dsa", label: "DSA", icon: Braces, color: "#8b5cf6", category: "CS Fundamentals" },
  { id: "oop", label: "OOP", icon: Layers, color: "#06b6d4", category: "CS Fundamentals" },
  { id: "operating-systems", label: "OS", icon: Cpu, color: "#10b981", category: "CS Fundamentals" },
  { id: "dbms", label: "DBMS", icon: Database, color: "#f59e0b", category: "CS Fundamentals" },
  { id: "computer-networks", label: "CN", icon: Network, color: "#3b82f6", category: "CS Fundamentals" },
  { id: "sql", label: "SQL", icon: Database, color: "#f59e0b", category: "Database" },
  { id: "database-design", label: "DB Design", icon: LayoutGrid, color: "#ef4444", category: "Database" },
  { id: "python", label: "Python", icon: Code2, color: "#10b981", category: "Languages" },
  { id: "java", label: "Java", icon: Code2, color: "#f59e0b", category: "Languages" },
  { id: "cpp", label: "C++", icon: Code2, color: "#3b82f6", category: "Languages" },
  { id: "javascript", label: "JavaScript", icon: Code2, color: "#f59e0b", category: "Languages" },
  { id: "react", label: "React", icon: Monitor, color: "#06b6d4", category: "Frameworks" },
  { id: "node", label: "Node.js", icon: Server, color: "#10b981", category: "Frameworks" },
  { id: "backend", label: "Backend", icon: Server, color: "#8b5cf6", category: "Engineering" },
  { id: "frontend", label: "Frontend", icon: Monitor, color: "#06b6d4", category: "Engineering" },
  { id: "fullstack", label: "Full Stack", icon: Layers, color: "#f59e0b", category: "Engineering" },
  { id: "rest-apis", label: "REST APIs", icon: Globe, color: "#10b981", category: "Architecture" },
  { id: "system-design-basics", label: "System Design", icon: LayoutGrid, color: "#3b82f6", category: "Architecture" },
  { id: "machine-learning", label: "ML", icon: BrainCircuit, color: "#a855f7", category: "AI/ML" },
  { id: "ai-engineering", label: "AI Engineering", icon: Brain, color: "#ec4899", category: "AI/ML" },
  { id: "custom", label: "Custom", icon: Settings2, color: "#64748b", category: "Other" },
];

const CODING_LANGS: { id: CodingLanguage; label: string; color: string }[] = [
  { id: "javascript", label: "JavaScript", color: "#f59e0b" },
  { id: "typescript", label: "TypeScript", color: "#3b82f6" },
  { id: "python", label: "Python", color: "#10b981" },
  { id: "java", label: "Java", color: "#ef4444" },
  { id: "cpp", label: "C++", color: "#8b5cf6" },
];

const MODES: { id: InterviewMode; label: string; icon: any; description: string }[] = [
  { id: "voice", label: "Voice Only", icon: Volume2, description: "AI asks questions, you answer verbally" },
  { id: "coding", label: "Coding Only", icon: Terminal, description: "All coding challenges with editor" },
  { id: "voice+coding", label: "Voice + Coding", icon: Zap, description: "Mixed voice questions and coding challenges" },
];

const DIFFICULTY_OPTIONS = [
  { value: "easy" as const, label: "Easy", color: "#10b981", icon: "🟢" },
  { value: "medium" as const, label: "Medium", color: "#f59e0b", icon: "🟡" },
  { value: "hard" as const, label: "Hard", color: "#ef4444", icon: "🔴" },
];

const EXPERIENCE_OPTIONS = [
  { value: "fresher", label: "Fresher", description: "0 years" },
  { value: "entry", label: "Entry", description: "0-2 years" },
  { value: "mid", label: "Mid", description: "3-5 years" },
  { value: "senior", label: "Senior", description: "6-10 years" },
  { value: "lead", label: "Lead", description: "10+ years" },
];

const DEFAULT_CODE: Record<CodingLanguage, string> = {
  javascript: `// Write your JavaScript solution here\nfunction solve(input) {\n  \n}\n`,
  typescript: `// Write your TypeScript solution here\nfunction solve(input: string): string {\n  \n}\n`,
  python: `# Write your Python solution here\ndef solve(input_data):\n    pass\n`,
  java: `// Write your Java solution here\npublic class Solution {\n    public static String solve(String input) {\n        return "";\n    }\n}\n`,
  cpp: `// Write your C++ solution here\n#include <iostream>\n#include <string>\nusing namespace std;\n\nstring solve(string input) {\n    return "";\n}\n`,
};

const LANG_MAP: Record<CodingLanguage, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "cpp",
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TechnicalInterviewView({ theme: propTheme }: { theme?: string } = {}) {
  const [theme, setTheme] = useState("dark");
  const [screen, setScreen] = useState<ViewScreen>("landing");
  const [config, setConfig] = useState<TechnicalConfig | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EngineMessage[]>([]);
  const [evaluation, setEvaluation] = useState<TechnicalEvaluation | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(15);
  const [currentQuestion, setCurrentQuestion] = useState<TechnicalQuestionData | null>(null);

  useEffect(() => {
    if (propTheme) {
      setTheme(propTheme);
    } else {
      const saved = localStorage.getItem("adyapan-theme") || "dark";
      setTheme(saved);
    }
  }, [propTheme]);

  const isDark = theme === "dark";
  const c = useMemo(() => ({
    bg: isDark ? "#080710" : "#f8fafc",
    surface: isDark ? "rgba(255,255,255,0.03)" : "#f1f5f9",
    surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
    border: isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0",
    borderHover: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.65)" : "#334155",
    textMuted: isDark ? "rgba(255,255,255,0.35)" : "#64748b",
    primary: "#06b6d4",
    primaryDark: "#0891b2",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
    amber: "#f59e0b",
    purple: "#8b5cf6",
    cyan: "#06b6d4",
    blue: "#3b82f6",
    greenBg: isDark ? "rgba(16,185,129,0.1)" : "#ecfdf5",
    amberBg: isDark ? "rgba(245,158,11,0.07)" : "#fffbeb",
    candidateBubble: isDark ? "rgba(59,130,246,0.12)" : "#eff6ff",
    candidateBorder: isDark ? "rgba(59,130,246,0.2)" : "#bfdbfe",
    candidateText: isDark ? "#ffffff" : "#1e40af",
    interviewerBubble: isDark ? "rgba(6,182,212,0.1)" : "#ecfeff",
    interviewerBorder: isDark ? "rgba(6,182,212,0.15)" : "#a5f3fc",
    interviewerText: isDark ? "#ffffff" : "#0e7490",
  }), [isDark]);

  const handleStart = useCallback(async (startConfig: TechnicalConfig) => {
    setConfig(startConfig);
    setScreen("loading");

    // Simulate loading
    await new Promise(r => setTimeout(r, 2500));

    try {
      const res = await api.post("/technical-engine/start", {
        topic: startConfig.topic,
        role: startConfig.role,
        company: startConfig.company || null,
        difficulty: startConfig.difficulty,
        experienceLevel: startConfig.experienceLevel,
        durationMinutes: startConfig.durationMinutes,
        language: startConfig.language,
        codingLanguage: startConfig.codingLanguage,
        mode: startConfig.mode,
        aiVoiceEnabled: startConfig.aiVoiceEnabled,
        voiceGender: startConfig.voiceGender,
        voiceSpeed: startConfig.voiceSpeed,
        voicePitch: startConfig.voicePitch,
        resumeAware: startConfig.resumeAware,
        customInstructions: startConfig.customInstructions || "",
      });

      if (res.data.success) {
        setSessionId(res.data.session.id);
        setMessages(res.data.messages || []);
        setQuestionNumber(1);
        setTotalQuestions(Math.ceil(startConfig.durationMinutes / 5));
        setCurrentQuestion(res.data.firstQuestion);
        setScreen("active");
      } else {
        toast.error("Failed to start interview");
        setScreen("landing");
      }
    } catch {
      toast.error("Failed to start technical interview");
      setScreen("landing");
    }
  }, []);

  const handleComplete = useCallback(async (completedSessionId: string) => {
    try {
      toast.info("Generating evaluation report...");
      const res = await api.post(`/technical-engine/${completedSessionId}/evaluate`);
      if (res.data.evaluation) {
        setEvaluation(res.data.evaluation);
        toast.success("Evaluation complete!");
      }
      setScreen("report");
    } catch {
      toast.error("Generating technical evaluation summary...");
      setScreen("report");
    }
  }, []);

  const handleEnd = useCallback(async () => {
    if (!sessionId) return;
    try {
      toast.info("Wrapping up technical interview & generating report...");
      let res = await api.post(`/technical-engine/${sessionId}/evaluate`);
      if (!res.data.evaluation) {
        res = await api.post(`/technical-engine/${sessionId}/end`);
      }
      if (res.data.evaluation) setEvaluation(res.data.evaluation);
      setScreen("report");
    } catch {
      setScreen("report");
    }
  }, [sessionId]);

  const handleReset = useCallback(() => {
    setScreen("landing");
    setSessionId(null);
    setEvaluation(null);
    setMessages([]);
    setConfig(null);
    setQuestionNumber(0);
    setCurrentQuestion(null);
  }, []);

  return (
    <div className="relative min-h-full" style={{ background: c.bg, color: c.text, fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      {screen !== "landing" && screen !== "active" && (
        <div className="sticky top-0 z-50 border-b backdrop-blur-md"
          style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", background: "transparent" }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleReset}
                className="w-8 h-8 rounded-xl border flex items-center justify-center transition-colors"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: isDark ? "#ffffff" : "#111827" }}>
                <ArrowLeft size={14} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <span className="text-sm font-bold hidden sm:inline">AI Technical Interview</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sessionId && (
                <span className="text-[9px] px-2 py-1 rounded-lg border font-bold"
                  style={{ background: isDark ? "rgba(16,185,129,0.1)" : "#ecfdf5", borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.25)", color: isDark ? "#34d399" : "#059669" }}>
                  SESSION ACTIVE
                </span>
              )}
              <button onClick={() => setScreen("analytics")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all"
                style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb", color: isDark ? "rgba(255,255,255,0.5)" : "#6b7280" }}>
                <BarChart3 size={12} /> Analytics
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <motion.div key="landing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <TechnicalLanding onStart={handleStart} theme={theme} colors={c} />
          </motion.div>
        )}

        {screen === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <LoadingScreen config={config} colors={c} />
          </motion.div>
        )}

        {screen === "active" && sessionId && config && (
          <motion.div key="active" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4 }}>
            <ActiveInterview
              sessionId={sessionId}
              config={config}
              messages={messages}
              setMessages={setMessages}
              questionNumber={questionNumber}
              setQuestionNumber={setQuestionNumber}
              totalQuestions={totalQuestions}
              setTotalQuestions={setTotalQuestions}
              currentQuestion={currentQuestion}
              setCurrentQuestion={setCurrentQuestion}
              onComplete={handleComplete}
              onEnd={handleEnd}
              theme={theme}
              colors={c}
            />
          </motion.div>
        )}

        {screen === "report" && sessionId && config && (
          <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
            <ReportView
              sessionId={sessionId}
              evaluation={evaluation}
              config={config}
              messages={messages}
              onRetry={handleReset}
              onNewInterview={handleReset}
              onViewAnalytics={() => setScreen("analytics")}
              theme={theme}
              colors={c}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Landing ────────────────────────────────────────────────────────────────

function TechnicalLanding({ onStart, theme, colors: c }: { onStart: (config: TechnicalConfig) => void; theme: string; colors: any }) {
  const isDark = theme === "dark";
  const [step, setStep] = useState(0);
  const [topic, setTopic] = useState<TechnicalTopic>("dsa");
  const [role, setRole] = useState("Software Engineer");
  const [company, setCompany] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [codingLanguage, setCodingLanguage] = useState<CodingLanguage>("javascript");
  const [mode, setMode] = useState<InterviewMode>("voice+coding");
  const [aiVoiceEnabled, setAiVoiceEnabled] = useState(true);
  const [resumeAware, setResumeAware] = useState(true);
  const [customInstructions, setCustomInstructions] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const selectedTopic = TOPICS.find(t => t.id === topic);

  const filteredCompanies = COMPANY_PRESETS.filter(co =>
    co.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const cardHover = { scale: 1.015, y: -2 };
  const cardTap = { scale: 0.97 };

  const handleLaunch = () => {
    const config: TechnicalConfig = {
      topic, role, company, difficulty, experienceLevel, durationMinutes,
      language: "english", codingLanguage, mode, aiVoiceEnabled,
      voiceGender: "neutral", voiceSpeed: 1, voicePitch: 1,
      resumeAware, customInstructions,
    };
    onStart(config);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div className="absolute -top-32 -left-32 w-96 h-96 rounded-full" style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)" }} animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }} animate={{ x: [0, -25, 0], y: [0, 30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} />
      </div>

      <div className="relative z-10">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative overflow-hidden rounded-3xl p-8 sm:p-10" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.05) 50%, rgba(59,130,246,0.05) 100%)", border: "1px solid rgba(6,182,212,0.12)" }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-500 text-xs font-bold rounded-full uppercase tracking-wider">
                <Flame size={12} className="animate-pulse" /> Technical Interview Engine
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">AI Technical Interview</h1>
              <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>
                Voice questions + Live coding + AI Code Review + Follow-ups. Company-tailored. Resume-aware.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {MODES.map(m => {
                const ModeIcon = m.icon;
                return (
                  <motion.button key={m.id} whileHover={cardHover} whileTap={cardTap} onClick={() => setMode(m.id)} className={`p-3 rounded-2xl border transition-all ${mode === m.id ? "border-cyan-500/40" : ""}`} style={{ background: mode === m.id ? "rgba(6,182,212,0.1)" : c.cardBg, borderColor: mode === m.id ? "rgba(6,182,212,0.4)" : c.border }}>
                    <ModeIcon size={18} style={{ color: mode === m.id ? c.cyan : c.textMuted }} />
                    <div className="text-[10px] font-bold mt-1" style={{ color: mode === m.id ? c.cyan : c.textMuted }}>{m.label}</div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {["Topic", "Company & Role", "Config", "Launch"].map((title, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <button key={title} onClick={() => { if (done || active) setStep(i); }} className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${done || active ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`} style={{ background: active ? "rgba(6,182,212,0.15)" : done ? c.greenBg : c.surface, border: `1px solid ${active ? "rgba(6,182,212,0.3)" : done ? "rgba(16,185,129,0.2)" : c.border}`, color: active ? c.cyan : done ? c.green : c.textMuted }}>
                {done ? <Check size={14} /> : <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]">{i + 1}</span>}
                <span className="hidden sm:inline">{title}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="mt-6">
          {step === 0 && (
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold flex items-center gap-2"><Code2 size={20} className="text-cyan-500" /> Choose Topic</h2>
                <p className="text-xs" style={{ color: c.textSec }}>Select the technical area you want to be interviewed on</p>
              </div>
              {["CS Fundamentals", "Database", "Languages", "Frameworks", "Engineering", "Architecture", "AI/ML", "Other"].map(cat => {
                const topics = TOPICS.filter(t => t.category === cat);
                if (topics.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: c.textMuted }}>{cat}</div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {topics.map(t => {
                        const Icon = t.icon;
                        const selected = topic === t.id;
                        return (
                          <motion.button key={t.id} whileHover={cardHover} whileTap={cardTap} onClick={() => setTopic(t.id)} className="p-4 rounded-2xl border text-left transition-all" style={{ background: selected ? `${t.color}10` : c.cardBg, borderColor: selected ? `${t.color}40` : c.border }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: selected ? `${t.color}20` : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? `${t.color}30` : "rgba(255,255,255,0.08)"}` }}>
                              <Icon size={18} style={{ color: selected ? t.color : c.textMuted }} />
                            </div>
                            <div className="text-[11px] font-bold">{t.label}</div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs hover:bg-cyan-400 transition-colors flex items-center gap-2">
                  Next <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold flex items-center gap-2"><Building2 size={20} className="text-cyan-500" /> Company & Role</h2>
              </div>

              {/* Company */}
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Target Company (optional)</div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
                  <input value={companySearch} onChange={e => setCompanySearch(e.target.value)} placeholder="Search companies..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-cyan-500/50 transition-colors" style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {filteredCompanies.slice(0, 12).map(co => (
                    <motion.button key={co.id} whileTap={cardTap} onClick={() => setCompany(co.id)} className="p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1" style={{ background: company === co.id ? `${co.color}15` : c.cardBg, borderColor: company === co.id ? `${co.color}50` : c.border }}>
                      <CompanyLogo companyId={co.id} companyName={co.name} logo={co.logo} color={co.color} size={44} theme={theme} />
                      <div className="text-[11px] font-extrabold truncate w-full text-center">{co.name}</div>
                    </motion.button>
                  ))}
                </div>
                {company && <button onClick={() => setCompany("")} className="text-[10px] font-bold" style={{ color: c.textMuted }}>Clear selection</button>}
              </div>

              {/* Role */}
              <div className="space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Target Role</div>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g., Software Engineer" className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-cyan-500/50 transition-colors" style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
              </div>

              <div className="flex justify-between">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(0)} className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2" style={{ borderColor: c.border, color: c.textSec }}>
                  <ChevronLeft size={14} /> Back
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(2)} className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs hover:bg-cyan-400 transition-colors flex items-center gap-2">
                  Next <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold flex items-center gap-2"><Settings2 size={20} className="text-cyan-500" /> Configuration</h2>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Difficulty */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Difficulty</label>
                    <div className="flex gap-2">
                      {DIFFICULTY_OPTIONS.map(d => (
                        <motion.button key={d.value} whileTap={cardTap} onClick={() => setDifficulty(d.value)} className="flex-1 py-2.5 rounded-xl border text-xs font-bold text-center transition-all" style={{ background: difficulty === d.value ? `${d.color}15` : c.surface, borderColor: difficulty === d.value ? `${d.color}40` : c.border, color: difficulty === d.value ? d.color : c.textSec }}>
                          {d.icon} {d.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  {/* Experience */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Experience</label>
                    <div className="flex gap-1.5">
                      {EXPERIENCE_OPTIONS.map(ex => (
                        <motion.button key={ex.value} whileTap={cardTap} onClick={() => setExperienceLevel(ex.value)} className="flex-1 py-2 rounded-lg border text-center transition-all" style={{ background: experienceLevel === ex.value ? "rgba(6,182,212,0.1)" : c.surface, borderColor: experienceLevel === ex.value ? "rgba(6,182,212,0.3)" : c.border }}>
                          <div className="text-[11px] font-bold" style={{ color: experienceLevel === ex.value ? c.cyan : c.text }}>{ex.label}</div>
                          <div className="text-[9px]" style={{ color: c.textMuted }}>{ex.description}</div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  {/* Duration */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Duration</label>
                    <div className="flex gap-2 flex-wrap">
                      {[15, 30, 45, 60].map(m => (
                        <motion.button key={m} whileTap={cardTap} onClick={() => setDurationMinutes(m)} className="px-4 py-2 rounded-xl border text-xs font-bold transition-all" style={{ background: durationMinutes === m ? "rgba(6,182,212,0.1)" : c.surface, borderColor: durationMinutes === m ? "rgba(6,182,212,0.3)" : c.border, color: durationMinutes === m ? c.cyan : c.textSec }}>
                          <Clock size={11} className="inline mr-1" />{m}m
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Coding Language */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Coding Language</label>
                    <div className="flex gap-2 flex-wrap">
                      {CODING_LANGS.map(l => (
                        <motion.button key={l.id} whileTap={cardTap} onClick={() => setCodingLanguage(l.id)} className="px-4 py-2 rounded-xl border text-xs font-bold transition-all" style={{ background: codingLanguage === l.id ? `${l.color}15` : c.surface, borderColor: codingLanguage === l.id ? `${l.color}40` : c.border, color: codingLanguage === l.id ? l.color : c.textSec }}>
                          {l.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  {/* Voice Toggle */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>AI Voice</label>
                      <button onClick={() => setAiVoiceEnabled(!aiVoiceEnabled)} className="relative w-11 h-6 rounded-full transition-colors" style={{ background: aiVoiceEnabled ? "rgba(6,182,212,0.3)" : c.surface }}>
                        <motion.div className="absolute top-0.5 w-5 h-5 rounded-full" style={{ background: aiVoiceEnabled ? c.cyan : c.textMuted }} animate={{ left: aiVoiceEnabled ? "22px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </button>
                    </div>
                  </div>
                  {/* Resume-Aware */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Resume-Aware</label>
                        <p className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>AI asks based on your resume</p>
                      </div>
                      <button onClick={() => setResumeAware(!resumeAware)} className="relative w-11 h-6 rounded-full transition-colors" style={{ background: resumeAware ? "rgba(6,182,212,0.3)" : c.surface }}>
                        <motion.div className="absolute top-0.5 w-5 h-5 rounded-full" style={{ background: resumeAware ? c.cyan : c.textMuted }} animate={{ left: resumeAware ? "22px" : "2px" }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </button>
                    </div>
                  </div>
                  {/* Custom Instructions */}
                  <div className="p-4 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Custom Instructions</label>
                    <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder="e.g., Focus on system design. Be tough on edge cases..." rows={3} className="w-full px-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-cyan-500/50 transition-colors resize-none" style={{ background: c.inputBg, color: c.text, borderColor: c.border }} />
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2" style={{ borderColor: c.border, color: c.textSec }}>
                  <ChevronLeft size={14} /> Back
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(3)} className="px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-extrabold text-xs hover:bg-cyan-400 transition-colors flex items-center gap-2">
                  Review <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold flex items-center gap-2"><Play size={20} className="text-cyan-500" /> Review & Launch</h2>
              </div>
              <div className="p-6 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="space-y-3">
                  {[
                    { label: "Topic", value: selectedTopic?.label, color: selectedTopic?.color },
                    { label: "Role", value: role },
                    { label: "Company", value: company || "Any" },
                    { label: "Difficulty", value: difficulty, color: DIFFICULTY_OPTIONS.find(d => d.value === difficulty)?.color },
                    { label: "Experience", value: experienceLevel },
                    { label: "Duration", value: `${durationMinutes}m` },
                    { label: "Mode", value: MODES.find(m => m.id === mode)?.label },
                    { label: "Language", value: CODING_LANGS.find(l => l.id === codingLanguage)?.label },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: c.border }}>
                      <span className="text-[11px] font-semibold" style={{ color: c.textMuted }}>{item.label}</span>
                      <span className="text-xs font-bold capitalize" style={{ color: item.color || c.text }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2" style={{ borderColor: c.border, color: c.textSec }}>
                  <ChevronLeft size={14} /> Back
                </motion.button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleLaunch} className="px-8 py-3 rounded-xl text-sm font-extrabold flex items-center gap-2" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "#ffffff", boxShadow: "0 4px 20px rgba(6,182,212,0.3)" }}>
                  <Play size={16} fill="currentColor" /> Launch Interview
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Screen ─────────────────────────────────────────────────────────

function LoadingScreen({ config, colors: c }: { config: TechnicalConfig | null; colors: any }) {
  const [progress, setProgress] = useState(0);
  const topic = TOPICS.find(t => t.id === config?.topic);

  useEffect(() => {
    const interval = setInterval(() => setProgress(p => Math.min(p + 2, 100)), 40);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    { label: "Loading resume context", done: progress > 15 },
    { label: "Initializing AI interviewer", done: progress > 35 },
    { label: `Preparing ${topic?.label || "technical"} questions`, done: progress > 55 },
    { label: "Configuring voice engine", done: progress > 75 },
    { label: "Setting up coding environment", done: progress > 90 },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: c.bg }}>
      <div className="text-center space-y-6 max-w-sm mx-auto px-4">
        <motion.div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }} animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <Brain size={36} className="text-white" />
        </motion.div>
        <h2 className="text-lg font-extrabold">Preparing Your Interview</h2>
        <p className="text-xs" style={{ color: c.textSec }}>{topic?.label || "Technical"} · {config?.difficulty || "medium"} · {config?.mode || "voice+coding"}</p>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="flex items-center gap-2 text-xs" style={{ color: s.done ? c.green : c.textMuted }}>
              {s.done ? <CheckCircle2 size={14} /> : <Loader2 size={14} className="animate-spin" />}
              <span className="font-medium">{s.label}</span>
            </motion.div>
          ))}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #06b6d4, #3b82f6)" }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
        </div>
      </div>
    </div>
  );
}

// ─── Active Interview ───────────────────────────────────────────────────────

function ActiveInterview({
  sessionId, config, messages, setMessages, questionNumber, setQuestionNumber,
  totalQuestions, setTotalQuestions, currentQuestion, setCurrentQuestion, onComplete, onEnd,
  theme, colors: c,
}: {
  sessionId: string;
  config: TechnicalConfig;
  messages: EngineMessage[];
  setMessages: (msgs: EngineMessage[] | ((prev: EngineMessage[]) => EngineMessage[])) => void;
  questionNumber: number;
  setQuestionNumber: (n: number) => void;
  totalQuestions: number;
  setTotalQuestions: (n: number) => void;
  currentQuestion: TechnicalQuestionData | null;
  setCurrentQuestion: (q: TechnicalQuestionData | null) => void;
  onComplete: (sessionId: string) => void;
  onEnd: () => void;
  theme: string;
  colors: any;
}) {
  const isDark = theme === "dark";
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [aiStatus, setAiStatus] = useState<"idle" | "thinking" | "speaking" | "listening">("idle");
  const [micEnabled, setMicEnabled] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(config.aiVoiceEnabled);

  // Coding state
  const [code, setCode] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [showCoding, setShowCoding] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const totalDuration = config.durationMinutes * 60;
  const timeRemaining = Math.max(0, totalDuration - elapsedSeconds);
  const isTimeCritical = timeRemaining <= 300 && timeRemaining > 0;

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsedSeconds(p => Math.min(p + 1, totalDuration)), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [totalDuration]);

  // Scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Cleanup
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {}
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Mic level
  useEffect(() => {
    if (!micEnabled || !micStreamRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setMicLevel(0);
      return;
    }
    const startMonitoring = async () => {
      try {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext();
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") await ctx.resume();
        if (!analyserRef.current) { analyserRef.current = ctx.createAnalyser(); analyserRef.current.fftSize = 256; }
        const analyser = analyserRef.current;
        if (micStreamRef.current) { const source = ctx.createMediaStreamSource(micStreamRef.current); source.connect(analyser); }
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setMicLevel(Math.min(Math.round((avg / 255) * 100), 100));
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch { setMicLevel(0); }
    };
    startMonitoring();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [micEnabled]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const speak = useCallback((text: string) => {
    if (!voiceEnabled) return;
    window.speechSynthesis.cancel();
    const cleaned = text.replace(/[*_#`]/g, "").replace(/\n+/g, ". ");
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = config.voiceSpeed;
    utterance.pitch = config.voicePitch;
    utterance.lang = config.language === "hindi" ? "hi-IN" : "en-US";
    utterance.onstart = () => setAiStatus("speaking");
    utterance.onend = () => setAiStatus("listening");
    utterance.onerror = () => setAiStatus("listening");
    setAiStatus("speaking");
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled, config]);

  // Speak initial question on load
  const hasSpokenFirstRef = useRef(false);
  useEffect(() => {
    if (!hasSpokenFirstRef.current && currentQuestion?.question && voiceEnabled) {
      hasSpokenFirstRef.current = true;
      const timer = setTimeout(() => {
        speak(currentQuestion.question);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion?.question, voiceEnabled, speak]);

  const micEnabledRef = useRef(micEnabled);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = config.language === "hindi" ? "hi-IN" : "en-US";

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      const trimmed = currentTranscript.trim();
      if (trimmed) {
        setInputText(trimmed);
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === "no-speech" || err.error === "aborted") return;
      if (err.error === "not-allowed") {
        toast.error("Microphone permission denied.");
        setMicEnabled(false);
      }
    };

    recognition.onend = () => {
      if (micEnabledRef.current) {
        setTimeout(() => {
          if (micEnabledRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {}
  }, [config.language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  }, []);

  const toggleMic = useCallback(async () => {
    if (micEnabled) {
      micEnabledRef.current = false;
      setMicEnabled(false);
      stopListening();
      if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      micEnabledRef.current = true;
      setMicEnabled(true);
      startListening();
      toast.success("Microphone active — start speaking");
    } catch { toast.error("Could not access microphone"); }
  }, [micEnabled, startListening, stopListening]);

  const handleSubmitAnswer = useCallback(async () => {
    const answer = inputText.trim();
    if (!answer || sending) return;

    const candidateMsg: EngineMessage = {
      id: `candidate-${Date.now()}`, role: "candidate", content: answer,
      timestamp: Date.now(), questionNumber,
    };
    setMessages(prev => [...prev, candidateMsg]);
    setInputText("");
    setSending(true);
    setAiStatus("thinking");

    try {
      const { data } = await api.post(`/technical-engine/${sessionId}/answer`, {
        answer, questionNumber,
      });

      if (data.isComplete) {
        setAiStatus("idle");
        toast.success("Interview complete! Generating report...");
        onComplete(sessionId);
        return;
      }

      const aiMsg: EngineMessage = {
        id: `ai-${Date.now()}`, role: "interviewer",
        content: data.nextQuestion?.question || data.nextQuestion,
        timestamp: Date.now(), questionNumber: data.questionNumber || questionNumber + 1,
      };
      setMessages(prev => [...prev, aiMsg]);
      setCurrentQuestion(data.nextQuestion);
      setQuestionNumber(data.questionNumber || questionNumber + 1);
      if (data.totalQuestions && setTotalQuestions) setTotalQuestions(data.totalQuestions);

      // Auto-open coding if it's a coding challenge
      if (data.nextQuestion?.isCodingChallenge && data.nextQuestion?.codingProblem) {
        setShowCoding(true);
        setCode(data.nextQuestion.codingProblem.starterCode || DEFAULT_CODE[config.codingLanguage]);
      }

      speak(aiMsg.content);
    } catch (err: any) {
      setAiStatus("idle");
      toast.error(err?.response?.data?.message || "Failed to submit answer");
    } finally {
      setSending(false);
    }
  }, [inputText, sending, questionNumber, sessionId, onComplete, speak, config.codingLanguage, setMessages, setCurrentQuestion, setQuestionNumber, setTotalQuestions]);

  const handleRunCode = useCallback(async () => {
    if (!code || isRunning) return;
    setIsRunning(true);
    setCodeOutput("");
    try {
      const lang = LANG_MAP[config.codingLanguage] || "javascript";
      const res = await api.post("/coding/run", { code, language: lang, stdin: "" });
      setCodeOutput(res.data.output || res.data.stdout || "Code executed successfully.");
      toast.success("Code executed!");
    } catch (err: any) {
      setCodeOutput(err?.response?.data?.error || "Execution failed");
      toast.error("Code execution failed");
    } finally {
      setIsRunning(false);
    }
  }, [code, isRunning, config.codingLanguage]);

  const handleRequestReview = useCallback(async () => {
    if (!code) return;
    try {
      const res = await api.post(`/technical-engine/${sessionId}/review`, {
        code, language: config.codingLanguage, problem: currentQuestion?.question || "",
        topic: config.topic, output: codeOutput, passed: true,
      });
      setReviewResult(res.data.review);
      toast.success("Code review complete!");
    } catch {
      toast.error("Failed to get code review");
    }
  }, [code, sessionId, config.codingLanguage, config.topic, currentQuestion, codeOutput]);

  const handleEndInterview = useCallback(() => {
    setShowEndConfirm(false);
    isActiveRef.current = false;
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    window.speechSynthesis.cancel();
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(t => t.stop());
    onEnd();
  }, [onEnd]);

  // Initialize code editor when a coding challenge appears
  useEffect(() => {
    if (currentQuestion?.isCodingChallenge) {
      const starterCode = currentQuestion.codingProblem?.starterCode || DEFAULT_CODE[config.codingLanguage];
      setCode(starterCode);
      setShowCoding(true);
      setCodeOutput("");
      setReviewResult(null);
    } else if (currentQuestion && !currentQuestion.isCodingChallenge && code === "") {
      setShowCoding(false);
    }
  }, [currentQuestion?.question, config.codingLanguage]);


  const completionPct = totalQuestions > 0 ? Math.min((questionNumber / totalQuestions) * 100, 100) : 0;

  return (
    <div className="flex flex-col overflow-hidden" style={{ fontFamily: "'Outfit', sans-serif", background: c.bg, minHeight: "100vh" }}>
      {/* Top Bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 h-14 border-b" style={{ background: isDark ? "rgba(8,7,16,0.95)" : "rgba(255,255,255,0.95)", borderBottomColor: c.border, backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <motion.div className="w-2.5 h-2.5 rounded-full" style={{ background: c.green }} animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="text-xs font-bold tracking-wider" style={{ color: c.green }}>LIVE</span>
          </div>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(6,182,212,0.15)", color: c.cyan, border: "1px solid rgba(6,182,212,0.2)" }}>
            <Code2 className="w-3 h-3" /> {TOPICS.find(t => t.id === config.topic)?.label || "Technical"}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: c.text }}>{config.role}</span>
            {config.company && <><span style={{ color: c.textMuted }}>@</span><span className="text-sm font-medium" style={{ color: c.cyan }}>{config.company}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold" style={{ background: isTimeCritical ? "rgba(239,68,68,0.15)" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: isTimeCritical ? c.red : c.text, border: `1px solid ${isTimeCritical ? "rgba(239,68,68,0.3)" : c.border}` }}>
            <Clock className="w-3.5 h-3.5" /> {formatTime(timeRemaining)}
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", color: c.textSec, border: `1px solid ${c.border}` }}>
            <MessageSquare className="w-3.5 h-3.5" /> Q {questionNumber}/{totalQuestions}
          </div>
          <button
            onClick={() => {
              if (!showCoding && !code) {
                setCode(currentQuestion?.codingProblem?.starterCode || DEFAULT_CODE[config.codingLanguage]);
              }
              setShowCoding(v => !v);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: showCoding ? "rgba(139,92,246,0.2)" : isDark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
              color: showCoding ? c.purple : c.textSec,
              border: `1px solid ${showCoding ? "rgba(139,92,246,0.4)" : c.border}`,
            }}
          >
            <Terminal className="w-3.5 h-3.5" style={{ color: c.purple }} />
            <span className="hidden sm:inline">{showCoding ? "Close Editor" : "Code Editor"}</span>
          </button>
          <button onClick={() => setVoiceEnabled(v => !v)} className="p-2 rounded-lg transition-colors" style={{ background: voiceEnabled ? "rgba(6,182,212,0.15)" : "transparent", color: voiceEnabled ? c.cyan : c.textMuted }}>
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button onClick={() => setShowEndConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "rgba(239,68,68,0.12)", color: c.red, border: "1px solid rgba(239,68,68,0.2)" }}>
            <PhoneOff className="w-3.5 h-3.5" /> <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Conversation */}
        <div className={`flex-1 flex flex-col min-w-0 ${showCoding ? "max-w-[50%]" : ""}`}>
          {/* Current Question */}
          <div className="flex-shrink-0 px-4 md:px-8 pt-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <motion.div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", boxShadow: "0 0 40px rgba(6,182,212,0.3)" }} animate={aiStatus === "thinking" ? { scale: [1, 1.03, 1] } : {}} transition={{ duration: 2, repeat: Infinity }}>
                  <Brain className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </motion.div>
                <motion.div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: aiStatus === "speaking" ? c.green : aiStatus === "thinking" ? c.amber : aiStatus === "listening" ? c.cyan : c.textMuted, border: `2px solid ${c.bg}` }}>
                  {aiStatus === "speaking" ? <Volume2 className="w-3 h-3 text-white" /> : aiStatus === "thinking" ? <Brain className="w-3 h-3 text-white" /> : <div className="w-2 h-2 rounded-full bg-white/60" />}
                </motion.div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: c.cyan }}>Current Question</span>
                  {currentQuestion?.isCodingChallenge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.15)", color: c.purple }}>Coding Challenge</span>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <motion.p key={currentQuestion?.question || "empty"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="text-base md:text-lg leading-relaxed" style={{ color: c.text }}>
                    {currentQuestion?.question || <span style={{ color: c.textMuted }}>Waiting for interview to begin...</span>}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mx-4 md:mx-8 h-px" style={{ background: c.border }} />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={`flex ${msg.role === "candidate" ? "justify-end" : msg.role === "system" ? "justify-center" : "justify-start"}`}>
                  {msg.role === "system" ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs" style={{ background: c.surface, color: c.textMuted, border: `1px solid ${c.border}` }}>
                      <Info className="w-3 h-3" /> {msg.content}
                    </div>
                  ) : (
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === "candidate" ? "flex-row-reverse" : ""}`}>
                      {msg.role === "interviewer" && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-1" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div>
                        <div className="px-4 py-3 rounded-2xl text-sm leading-relaxed space-y-3" style={{ background: msg.role === "candidate" ? c.candidateBubble : c.interviewerBubble, color: msg.role === "candidate" ? c.candidateText : c.interviewerText, border: `1px solid ${msg.role === "candidate" ? c.candidateBorder : c.interviewerBorder}`, borderTopRightRadius: msg.role === "candidate" ? "6px" : undefined, borderTopLeftRadius: msg.role === "interviewer" ? "6px" : undefined }}>
                          <FormattedMarkdown content={msg.content} isDark={isDark} />
                          {msg.role === "interviewer" && currentQuestion?.codingProblem && (msg.questionNumber === questionNumber || messages[messages.length - 1]?.id === msg.id) && (
                            <div className="p-3 rounded-xl border mt-2 space-y-2" style={{ background: isDark ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.04)", borderColor: "rgba(6,182,212,0.2)" }}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: c.cyan }}>
                                  <Code2 className="w-3.5 h-3.5" /> {currentQuestion.codingProblem.title || "Coding Challenge"}
                                </span>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase" style={{ background: "rgba(6,182,212,0.15)", color: c.cyan }}>
                                  {currentQuestion.difficulty || config.difficulty}
                                </span>
                              </div>
                              <p className="text-xs font-medium leading-relaxed" style={{ color: c.textSec }}>
                                {currentQuestion.codingProblem.description}
                              </p>
                              {currentQuestion.codingProblem.examples && currentQuestion.codingProblem.examples.length > 0 && (
                                <div className="space-y-1 text-[11px] p-2 rounded-lg" style={{ background: c.surface, color: c.textMuted }}>
                                  <span className="font-bold block" style={{ color: c.textSec }}>Example:</span>
                                  <div>Input: <code>{currentQuestion.codingProblem.examples[0].input}</code></div>
                                  <div>Output: <code>{currentQuestion.codingProblem.examples[0].output}</code></div>
                                </div>
                              )}
                              {!showCoding && (
                                <button
                                  onClick={() => {
                                    setCode(currentQuestion.codingProblem?.starterCode || DEFAULT_CODE[config.codingLanguage]);
                                    setShowCoding(true);
                                  }}
                                  className="w-full mt-1 py-1.5 rounded-lg text-xs font-bold text-black flex items-center justify-center gap-1.5 transition-all"
                                  style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}
                                >
                                  <Terminal className="w-3.5 h-3.5" /> Open Code Workspace
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center gap-2 mt-1 ${msg.role === "candidate" ? "justify-end" : ""}`}>
                          {msg.questionNumber && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: c.surface, color: c.textMuted }}>Q{msg.questionNumber}</span>}
                          <span className="text-[10px]" style={{ color: c.textMuted }}>{(() => {
                            if (!msg.timestamp) return "";
                            const d = new Date(msg.timestamp);
                            return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          })()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {aiStatus === "thinking" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-tl-md" style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <div className="flex gap-1.5 items-center h-5">
                    {[0, 1, 2].map(i => (
                      <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: c.cyan }} animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 px-4 md:px-8 pb-4 pt-2">
            {micEnabled && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 40, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center justify-center gap-0.5 mb-2 overflow-hidden">
                {[...Array(24)].map((_, i) => {
                  const center = 11.5;
                  const distFromCenter = Math.abs(i - center) / center;
                  const barFactor = 1 - distFromCenter * 0.6;
                  const height = 3 + (micLevel / 100) * 33 * barFactor;
                  const intensity = micLevel / 100;
                  const barColor = intensity > 0.75 ? c.red : intensity > 0.45 ? c.amber : c.cyan;
                  return <div key={i} className="rounded-full" style={{ width: 2, height: `${Math.max(3, height)}px`, background: barColor, transition: "height 0.06s ease-out" }} />;
                })}
              </motion.div>
            )}
            <div className="flex items-end gap-3 p-3 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${micEnabled ? "rgba(6,182,212,0.2)" : c.border}` }}>
              <motion.button onClick={toggleMic} whileTap={{ scale: 0.92 }} className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: micEnabled ? "rgba(6,182,212,0.2)" : c.surface, color: micEnabled ? c.cyan : c.textMuted, border: `1px solid ${micEnabled ? "rgba(6,182,212,0.3)" : c.border}` }}>
                {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </motion.button>
              <textarea ref={inputRef} value={inputText} onChange={e => setInputText(e.target.value)} placeholder={micEnabled ? "Listening... or type here..." : "Type your answer..."} rows={1} className="flex-1 resize-none bg-transparent border-none outline-none text-sm py-2.5 px-1" style={{ color: c.text, minHeight: "40px", maxHeight: "120px" }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitAnswer(); } }} />
              <motion.button onClick={handleSubmitAnswer} disabled={!inputText.trim() || sending} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-40" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "white" }}>
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right Panel: Coding (when active) */}
        {showCoding && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "50%", opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="border-l flex flex-col" style={{ borderColor: c.border, background: isDark ? "rgba(0,0,0,0.3)" : "#ffffff" }}>
            {/* Problem Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-2">
                <Terminal size={14} style={{ color: c.purple }} />
                <span className="text-xs font-bold" style={{ color: c.text }}>
                  {currentQuestion?.codingProblem?.title || `${TOPICS.find(t => t.id === config.topic)?.label || "Technical"} Code Workspace`}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: `${DIFFICULTY_OPTIONS.find(d => d.value === (currentQuestion?.difficulty || config.difficulty))?.color}15`, color: DIFFICULTY_OPTIONS.find(d => d.value === (currentQuestion?.difficulty || config.difficulty))?.color }}>
                  {currentQuestion?.difficulty || config.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button onClick={handleRunCode} disabled={isRunning} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: "rgba(16,185,129,0.12)", color: c.green, border: "1px solid rgba(16,185,129,0.2)" }}>
                  {isRunning ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} fill="currentColor" />} Run
                </motion.button>
                <motion.button onClick={handleRequestReview} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ background: "rgba(139,92,246,0.12)", color: c.purple, border: "1px solid rgba(139,92,246,0.2)" }}>
                  <Brain size={11} /> Review
                </motion.button>
              </div>
            </div>

            {/* Problem Description */}
            <div className="px-4 py-3 border-b max-h-32 overflow-y-auto" style={{ borderColor: c.border }}>
              <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                {currentQuestion?.codingProblem?.description || `Write and execute your ${config.codingLanguage} solution for the current technical question. Use the AI Review button to evaluate time/space complexity.`}
              </p>
              {currentQuestion?.codingProblem?.examples && currentQuestion.codingProblem.examples.length > 0 && (
                <div className="mt-2 space-y-1">
                  {currentQuestion.codingProblem.examples.map((ex, i) => (
                    <div key={i} className="text-[10px] p-2 rounded-lg" style={{ background: c.surface, color: c.textMuted }}>
                      <span className="font-bold">Example {i + 1}:</span> Input: {ex.input} → Output: {ex.output}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monaco Editor */}
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                language={LANG_MAP[config.codingLanguage] || "javascript"}
                value={code || DEFAULT_CODE[config.codingLanguage]}
                onChange={v => setCode(v || "")}
                theme={isDark ? "vs-dark" : "light"}
                options={{ minimap: { enabled: false }, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", padding: { top: 12 }, scrollBeyondLastLine: false }}
              />
            </div>

            {/* Output Panel */}
            {(codeOutput || reviewResult) && (
              <div className="border-t max-h-48 overflow-y-auto" style={{ borderColor: c.border }}>
                {codeOutput && (
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: c.green }}>Output</div>
                    <pre className="text-xs p-2 rounded-lg overflow-x-auto" style={{ background: c.surface, color: c.textSec }}>{codeOutput}</pre>
                  </div>
                )}
                {reviewResult && (
                  <div className="px-4 py-3 border-t" style={{ borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain size={12} style={{ color: c.purple }} />
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.purple }}>AI Code Review</span>
                      <span className="text-[10px] font-bold" style={{ color: reviewResult.score >= 70 ? c.green : reviewResult.score >= 50 ? c.amber : c.red }}>{reviewResult.score}/100</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>{reviewResult.analysis}</p>
                    <div className="flex gap-4 mt-1 text-[10px] font-bold" style={{ color: c.textMuted }}>
                      <span>Time: {reviewResult.timeComplexity}</span>
                      <span>Space: {reviewResult.spaceComplexity}</span>
                    </div>
                    {reviewResult.suggestions?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {reviewResult.suggestions.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: c.textSec }}>
                            <Lightbulb size={10} className="mt-0.5 shrink-0" style={{ color: c.amber }} /> {s}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Show coding button when there's a coding challenge but panel is hidden */}
        {!showCoding && currentQuestion?.isCodingChallenge && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { setShowCoding(true); setCode(currentQuestion.codingProblem?.starterCode || DEFAULT_CODE[config.codingLanguage]); }} className="fixed right-4 bottom-24 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold" style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)", color: "white", boxShadow: "0 4px 20px rgba(139,92,246,0.4)" }}>
            <Terminal size={14} /> Open Code Editor
          </motion.button>
        )}
      </div>

      {/* End Confirm Modal */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="p-6 rounded-2xl border max-w-sm mx-4" style={{ background: c.cardBg, borderColor: c.border }}>
              <h3 className="text-sm font-extrabold mb-2">End Interview?</h3>
              <p className="text-xs mb-4" style={{ color: c.textSec }}>You've answered {questionNumber} questions. Ending now will generate your evaluation.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-2 rounded-xl border text-xs font-bold" style={{ borderColor: c.border, color: c.textSec }}>Cancel</button>
                <button onClick={handleEndInterview} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: "rgba(239,68,68,0.15)", color: c.red, border: "1px solid rgba(239,68,68,0.25)" }}>End & Get Report</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Report View ────────────────────────────────────────────────────────────

function ReportView({ sessionId, evaluation, config, messages, onRetry, onNewInterview, onViewAnalytics, theme, colors: c }: {
  sessionId: string;
  evaluation: TechnicalEvaluation | null;
  config: TechnicalConfig;
  messages: EngineMessage[];
  onRetry: () => void;
  onNewInterview: () => void;
  onViewAnalytics: () => void;
  theme: string;
  colors: any;
}) {
  const isDark = theme === "dark";
  const [openBreakdowns, setOpenBreakdowns] = useState<Set<number>>(new Set());
  const [intelligence, setIntelligence] = useState<IntelligenceData | null>(null);
  const [loadingIntelligence, setLoadingIntelligence] = useState(false);

  useEffect(() => {
    const fetchIntelligence = async () => {
      if (!sessionId) return;
      setLoadingIntelligence(true);
      try {
        const token = localStorage.getItem("adyapan-token");
        const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
        const res = await fetch(`${base}/api/technical-engine/${sessionId}/coach`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success && data.intelligence) {
          setIntelligence(data.intelligence);
        }
      } catch (err) {
        console.warn("Failed to load technical intelligence data:", err);
      } finally {
        setLoadingIntelligence(false);
      }
    };
    fetchIntelligence();
  }, [sessionId]);

  const toggleBreakdown = useCallback((idx: number) => {
    setOpenBreakdowns(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  if (!evaluation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: c.bg }}>
        <div className="text-center space-y-4 max-w-sm">
          <Sparkles size={36} className="animate-spin mx-auto text-cyan-400" />
          <h3 className="text-lg font-bold" style={{ color: c.text }}>Generating Assessment Report...</h3>
          <p className="text-xs leading-relaxed" style={{ color: c.textMuted }}>
            Analyzing technical accuracy, code performance, and problem-solving metrics.
          </p>
        </div>
      </div>
    );
  }

  const overallScore = evaluation.overallScore ?? 0;
  const scoreColor = overallScore >= 80 ? c.green : overallScore >= 60 ? c.amber : c.red;
  const recLabel = evaluation.hiringRecommendation?.includes("strong") ? "Strong Hire" : evaluation.hiringRecommendation?.includes("recommend") ? "Hire" : evaluation.hiringRecommendation?.includes("maybe") ? "Maybe" : "No Hire";
  const recColor = evaluation.hiringRecommendation?.includes("strong") ? c.green : evaluation.hiringRecommendation?.includes("recommend") ? c.cyan : evaluation.hiringRecommendation?.includes("maybe") ? c.amber : c.red;

  const scoreBreakdowns = [
    { label: "Technical Depth", value: evaluation.technicalDepth ?? overallScore, icon: Code2 },
    { label: "Code Quality", value: evaluation.codeQuality ?? overallScore, icon: Terminal },
    { label: "Problem Solving", value: evaluation.problemSolving ?? overallScore, icon: Brain },
    { label: "Communication", value: evaluation.communication ?? overallScore, icon: MessageSquare },
  ];

  const SVG_SIZE = 160;
  const SVG_RADIUS = 68;
  const SVG_CIRCUMFERENCE = 2 * Math.PI * SVG_RADIUS;
  const SVG_OFFSET = SVG_CIRCUMFERENCE - (overallScore / 100) * SVG_CIRCUMFERENCE;
  const answerBreakdowns = Array.isArray(evaluation.answerBreakdowns) ? evaluation.answerBreakdowns : [];

  return (
    <div className="min-h-full" style={{ fontFamily: "'Outfit', sans-serif", background: c.bg }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(6,182,212,0.1)", color: c.cyan }}>
            <Trophy className="w-3.5 h-3.5" /> Technical Interview Report
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: c.text }}>Performance Report</h1>
          <p className="text-xs" style={{ color: c.textSec }}>{config.role}{config.company && ` @ ${config.company}`} · {TOPICS.find(t => t.id === config.topic)?.label} · {config.difficulty}</p>
        </motion.div>

        {/* Score + Breakdown */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
          <div className="flex flex-col items-center justify-center p-8 rounded-3xl border" style={{ background: c.cardBg, borderColor: c.border }}>
            <div className="relative">
              <svg width={SVG_SIZE} height={SVG_SIZE} className="-rotate-90">
                <circle cx={SVG_SIZE / 2} cy={SVG_SIZE / 2} r={SVG_RADIUS} fill="none" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth="10" />
                <motion.circle cx={SVG_SIZE / 2} cy={SVG_SIZE / 2} r={SVG_RADIUS} fill="none" stroke={scoreColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={SVG_CIRCUMFERENCE} initial={{ strokeDashoffset: SVG_CIRCUMFERENCE }} animate={{ strokeDashoffset: SVG_OFFSET }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold" style={{ color: scoreColor }}>{overallScore}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Overall</span>
              </div>
            </div>
            <div className="mt-4 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider" style={{ background: `${recColor}15`, color: recColor, border: `1px solid ${recColor}30` }}>{recLabel}</div>
          </div>

          <div className="p-6 rounded-3xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSec }}>Score Breakdown</h3>
            <div className="space-y-3">
              {scoreBreakdowns.map((item, idx) => {
                const col = item.value >= 80 ? c.green : item.value >= 60 ? c.amber : c.red;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col }} />
                        <span className="text-xs font-medium" style={{ color: c.textSec }}>{item.label}</span>
                      </div>
                      <span className="text-xs font-bold" style={{ color: col }}>{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${col}cc, ${col})` }} initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ duration: 1, delay: 0.3 + idx * 0.1, ease: "easeOut" }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 pt-2 border-t" style={{ borderColor: c.border }}>
              <div className="text-[10px] font-bold" style={{ color: c.textMuted }}>Avg Time Complexity: <span style={{ color: c.text }}>{evaluation.timeComplexity || "O(N)"}</span></div>
              <div className="text-[10px] font-bold" style={{ color: c.textMuted }}>Avg Space: <span style={{ color: c.text }}>{evaluation.spaceComplexity || "O(1)"}</span></div>
            </div>
          </div>
        </motion.div>

        {/* Intelligence Coaching Layer */}
        {intelligence && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <InterviewIntelligence intelligence={intelligence} isDark={isDark} isTechnical={true} />
          </motion.div>
        )}

        {/* Summary */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="p-6 rounded-3xl border" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.05), rgba(59,130,246,0.03))", borderColor: isDark ? "rgba(6,182,212,0.12)" : "rgba(6,182,212,0.08)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4" style={{ color: c.cyan }} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.cyan }}>AI Summary</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{evaluation.summary || "Evaluation summary generated."}</p>
        </motion.div>

        {/* Strengths & Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-6 rounded-3xl border" style={{ background: isDark ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.02)", borderColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}><TrendingUp className="w-4 h-4" style={{ color: c.green }} /></div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.green }}>Strengths</h3>
            </div>
            <div className="space-y-2">
              {(evaluation.strengths || []).map((s, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: isDark ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.04)" }}>
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: c.green }} />
                  <span className="text-xs leading-relaxed" style={{ color: c.textSec }}>{s}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="p-6 rounded-3xl border" style={{ background: isDark ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.02)", borderColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.1)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(239,68,68,0.15)" }}><TrendingDown className="w-4 h-4" style={{ color: c.red }} /></div>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.red }}>Areas to Improve</h3>
            </div>
            <div className="space-y-2">
              {(evaluation.weaknesses || []).map((w, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.04)" }}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: c.red }} />
                  <span className="text-xs leading-relaxed" style={{ color: c.textSec }}>{w}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Answer Breakdowns */}
        {answerBreakdowns.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" style={{ color: c.purple }} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Answer Breakdowns</h3>
            </div>
            <div className="space-y-3">
              {answerBreakdowns.map((bd, idx) => {
                const scoreVal = bd.score ?? 50;
                const col = scoreVal >= 80 ? c.green : scoreVal >= 60 ? c.amber : c.red;
                const isOpen = openBreakdowns.has(idx);
                return (
                  <div key={idx} className="rounded-2xl border overflow-hidden" style={{ background: c.cardBg, borderColor: isOpen ? `${col}30` : c.border }}>
                    <button onClick={() => toggleBreakdown(idx)} className="w-full flex items-center gap-3 px-5 py-4 text-left">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-extrabold" style={{ background: `${col}18`, color: col }}>Q{bd.questionNumber || idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: c.text }}>{bd.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="h-1 w-16 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                            <div className="h-full rounded-full" style={{ width: `${scoreVal}%`, background: col }} />
                          </div>
                          <span className="text-[10px] font-bold" style={{ color: col }}>{scoreVal}%</span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={14} style={{ color: c.textMuted }} /></motion.div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="px-5 pb-5 space-y-3 border-t" style={{ borderColor: c.border }}>
                            <div className="pt-3"><label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: c.cyan }}>Your Answer</label><p className="text-xs leading-relaxed px-3 py-2 rounded-xl" style={{ background: c.surface, color: c.textSec }}>{bd.answer}</p></div>
                            <div><label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: c.amber }}>Analysis</label><p className="text-xs leading-relaxed px-3 py-2 rounded-xl" style={{ background: c.surface, color: c.textSec }}>{bd.analysis}</p></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Technical Analytics ─────────────────────────────────────────────────────

function TechnicalAnalytics({ onBack, onStartInterview, theme, colors: c }: {
  onBack: () => void;
  onStartInterview: () => void;
  theme: string;
  colors: any;
}) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/technical-engine/analytics/overview");
        if (res.data?.success) setAnalytics(res.data.analytics);
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center" style={{ background: c.bg }}>
        <Loader2 size={28} className="animate-spin" style={{ color: c.cyan }} />
      </div>
    );
  }

  const stats = [
    { label: "Total Sessions", value: analytics?.totalSessions ?? 0, icon: Layers, color: c.cyan },
    { label: "Completed", value: analytics?.completedSessions ?? 0, icon: CheckCircle2, color: c.green },
    { label: "Average Score", value: `${analytics?.avgScore ?? 0}%`, icon: TrendingUp, color: c.amber },
    { label: "Best Score", value: `${analytics?.bestScore ?? 0}%`, icon: Trophy, color: c.blue },
  ];

  return (
    <div className="min-h-full" style={{ fontFamily: "'Outfit', sans-serif", background: c.bg }}>
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl border" style={{ borderColor: c.border, color: c.textMuted }}>
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-extrabold" style={{ color: c.text }}>Technical Interview Analytics</h2>
            <p className="text-xs" style={{ color: c.textMuted }}>Your coding and technical performance over time.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
              <s.icon size={20} style={{ color: s.color }} className="mb-2" />
              <div className="text-2xl font-extrabold" style={{ color: c.text }}>{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: c.textMuted }}>{s.label}</div>
            </motion.div>
          ))}
        </div>

        {(analytics?.topicBreakdown || []).length > 0 && (
          <div className="p-6 rounded-3xl border" style={{ background: c.cardBg, borderColor: c.border }}>
            <h3 className="text-sm font-extrabold mb-4 flex items-center gap-2" style={{ color: c.text }}>
              <Target size={16} style={{ color: c.cyan }} /> Topic Breakdown
            </h3>
            <div className="space-y-3">
              {analytics.topicBreakdown.map((t: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold capitalize min-w-[100px]" style={{ color: c.text }}>{t.topic}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: c.surface }}>
                    <div className="h-full rounded-full" style={{ width: `${t.avgScore}%`, background: t.avgScore >= 80 ? c.green : t.avgScore >= 60 ? c.amber : c.red }} />
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>{t.avgScore}% ({t.count})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-center gap-3 pt-4">
          <button onClick={onStartInterview} className="px-6 py-2.5 rounded-xl text-xs font-bold" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", color: "white" }}>
            Start New Interview
          </button>
          <button onClick={onBack} className="px-6 py-2.5 rounded-xl text-xs font-bold border" style={{ borderColor: c.border, color: c.textSec }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
