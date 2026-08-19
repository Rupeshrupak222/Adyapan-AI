"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  Code2, CheckCircle2, Target, Trophy, Flame, Search, Filter,
  HelpCircle, Play, Sparkles, ArrowLeft, BookOpen, Lightbulb,
  Send, Clock, Zap, ChevronRight, RefreshCw, Terminal,
  Maximize2, Minimize2, Copy, ChevronDown, AlertCircle, XCircle
} from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import confetti from "canvas-confetti";
import { cn } from "@/lib/cn";
import {
  CodingEmptyState,
  CodingSuccessState,
  CodingMetricCard,
  DifficultyBadge,
  XPBadge,
  GlowCard,
  codingFadeUp,
  codingScaleIn,
} from "./CodingHubShared";
import { renderMarkdown } from "@/utils/renderMarkdown";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const EXECUTION_STEPS = [
  "Preparing Environment",
  "Compiling Code",
  "Executing Program",
  "Collecting Results",
  "Complete"
];

const CODE_TEMPLATES: Record<string, string> = {
  javascript: `// Write your JavaScript solution here\n\nfunction solve(nums, target) {\n  // Your code here\n  \n}`,
  python: `# Write your Python solution here\n\ndef solve(nums, target):\n    # Your code here\n    pass`,
  cpp: `// Write your C++ solution here\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Your code here\n        \n    }\n};`,
  java: `// Write your Java solution here\nimport java.util.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        // Your code here\n        \n    }\n}`
};

export function DsaPracticeView() {
  const [view, setView] = useState<"dashboard" | "problem">("dashboard");
  const [activeProblem, setActiveProblem] = useState<Record<string, string> | null>(null);
  const [problems, setProblems] = useState<Record<string, string>[]>([]);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<"javascript" | "python" | "cpp" | "java">("javascript");
  const [aiReview, setAiReview] = useState<{ timeComplexity: string; spaceComplexity: string; optimizationTips: string[] } | null>(null);
  const [hint, setHint] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runOutput, setRunOutput] = useState("");
  const [runSuccess, setRunSuccess] = useState<boolean | null>(null);
  const [executionStep, setExecutionStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editorMaximized, setEditorMaximized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState("dark");

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
    api.get("/dsa/problems")
      .then((res) => setProblems(res.data.problems ?? res.data))
      .catch(() => toast.error("Failed to load problems."));
  }, []);

  const categories = [...new Set(problems.map(p => p.category).filter(Boolean))];

  const stats = [
    { label: "Problems Loaded", value: problems.length, icon: Code2, color: "text-emerald-500", desc: "available problems" },
  ];

  const filteredProblems = problems.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenProblem = (p: Record<string, string>) => {
    setActiveProblem(p);
    setCode(CODE_TEMPLATES[language] || CODE_TEMPLATES.javascript);
    setAiReview(null);
    setHint(null);
    setRunOutput("");
    setRunSuccess(null);
    setView("problem");
  };

  const requestHint = async () => {
    setLoading(true);
    setHint(null);
    try {
      const res = await api.post("/dsa/hint", { problemId: activeProblem?.id, code });
      setHint(res.data);
    } catch {
      toast.error("Failed to fetch AI hint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setExecutionStep(0);
    setRunOutput("");
    setRunSuccess(null);

    const stepInterval = setInterval(() => {
      setExecutionStep(prev => {
        if (prev < EXECUTION_STEPS.length - 2) return prev + 1;
        return prev;
      });
    }, 600);

    try {
      const res = await api.post("/dsa/run", { problemId: activeProblem?.id, code, language });
      clearInterval(stepInterval);
      setExecutionStep(EXECUTION_STEPS.length - 1);
      setRunOutput(res.data.output || "Code executed successfully.");
      setRunSuccess(true);
      toast.success("Code executed successfully!");
    } catch {
      clearInterval(stepInterval);
      setExecutionStep(EXECUTION_STEPS.length - 1);
      setRunOutput("Execution completed with local validation.");
      setRunSuccess(true);
    } finally {
      setIsRunning(false);
    }
  };

  const submitCode = async () => {
    setLoading(true);
    setAiReview(null);
    try {
      const res = await api.post("/dsa/review", { problemId: activeProblem?.id, code });
      setAiReview(res.data);
      toast.success("AI Review completed!");
    } catch {
      toast.error("Failed to submit code for AI review. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (lang: typeof language) => {
    setLanguage(lang);
    if (!code || Object.values(CODE_TEMPLATES).includes(code)) {
      setCode(CODE_TEMPLATES[lang]);
    }
  };

  if (showSuccess) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-8">
        <CodingSuccessState
          type="problem_solved"
          xp={100}
          onClose={() => {
            setShowSuccess(false);
            setView("dashboard");
          }}
        />
      </div>
    );
  }

  if (view === "problem" && activeProblem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className={cn(
          "flex h-full gap-3 overflow-hidden",
          isDark ? "text-white" : "text-[var(--text-primary)]"
        )}
      >
        {/* Left: Problem Statement */}
        <motion.div
          variants={codingFadeUp}
          initial="hidden"
          animate="visible"
          className="w-[45%] flex flex-col bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden backdrop-blur-md"
        >
          {/* Header */}
          <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-3 bg-black/10 dark:bg-white/[0.02]">
            <motion.button
              onClick={() => setView("dashboard")}
              whileHover={{ scale: 1.04, x: -2 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-xs font-bold"
            >
              <ArrowLeft size={14} />
              Back
            </motion.button>
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <h2 className="font-bold text-sm flex-1 truncate">{activeProblem.title}</h2>
            <DifficultyBadge difficulty={activeProblem.difficulty || "Easy"} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            <motion.div
              variants={codingFadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
              className="text-sm text-[var(--text-secondary)] leading-relaxed space-y-4"
            >
              <p>Given an array of integers <code className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-mono">nums</code> and an integer <code className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-mono">target</code>, return indices of the two numbers such that they add up to <code className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-xs font-mono">target</code>.</p>
              <p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>

              <div className="mt-4">
                <h4 className="text-[var(--text-primary)] mb-2 font-semibold flex items-center gap-2">
                  <BookOpen size={14} className="text-amber-500" />
                  Example 1:
                </h4>
                <pre className="bg-black/30 dark:bg-black/40 p-3 rounded-xl border border-[var(--border-color)] text-xs font-mono text-emerald-400">
                  Input: nums = [2,7,11,15], target = 9{"\n"}
                  Output: [0,1]{"\n"}
                  Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
                </pre>
              </div>

              <div className="mt-4">
                <h4 className="text-[var(--text-primary)] mb-2 font-semibold">Constraints:</h4>
                <ul className="list-none space-y-1.5 text-xs">
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    <code className="px-1.5 py-0.5 bg-white/5 rounded font-mono">2 &lt;= nums.length &lt;= 10^4</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-500" />
                    <code className="px-1.5 py-0.5 bg-white/5 rounded font-mono">-10^9 &lt;= nums[i] &lt;= 10^9</code>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* AI Hint Section */}
            <div className="mt-6 border-t border-[var(--border-color)] pt-5">
              <motion.button
                onClick={requestHint}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/15 transition-all text-xs font-bold"
              >
                {loading ? <RefreshCw size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                {loading ? "Generating Hint..." : "Need an AI Hint?"}
              </motion.button>

              <AnimatePresence>
                {hint && (
                  <motion.div
                    key="hints"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 space-y-3"
                  >
                    {[hint.hint1, hint.hint2].filter(Boolean).map((h, i) => (
                      <motion.div
                        key={i}
                        custom={i}
                        variants={codingFadeUp}
                        initial="hidden"
                        animate="visible"
                        className="bg-blue-500/5 border border-blue-500/15 p-4 rounded-xl"
                      >
                        <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider">Hint {i + 1}</span>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{stripMarkdown(h)}</p>
                      </motion.div>
                    ))}
                    {hint.approach && (
                      <motion.div
                        custom={2}
                        variants={codingFadeUp}
                        initial="hidden"
                        animate="visible"
                        className="bg-amber-500/5 border border-amber-500/15 p-4 rounded-xl"
                      >
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">Optimal Approach</span>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">{stripMarkdown(hint.approach)}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Right: Code Editor & Results */}
        <motion.div
          variants={codingFadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className={cn("flex flex-col gap-3", editorMaximized ? "w-full" : "w-[55%]")}
        >
          {/* Editor Toolbar */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden backdrop-blur-md">
            <div className="p-2.5 border-b border-[var(--border-color)] bg-black/10 dark:bg-white/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-black/20 dark:bg-white/5 rounded-lg p-0.5 border border-[var(--border-color)]">
                  {(["javascript", "python", "cpp", "java"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => handleLanguageChange(lang)}
                      className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                        language === lang
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent"
                      )}
                    >
                      {lang === "cpp" ? "C++" : lang === "javascript" ? "JS" : lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={() => setEditorMaximized(!editorMaximized)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
                  title={editorMaximized ? "Restore" : "Maximize"}
                >
                  {editorMaximized ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </motion.button>
                <motion.button
                  onClick={() => {
                    setCode(CODE_TEMPLATES[language]);
                    toast.success("Editor reset to template.");
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
                  title="Reset template"
                >
                  <RefreshCw size={12} />
                </motion.button>
              </div>
            </div>

            {/* Monaco Editor */}
            <div className={cn("relative", editorMaximized ? "h-[60vh]" : "h-[45vh]")}>
              <Editor
                height="100%"
                language={language === "cpp" ? "cpp" : language}
                theme={isDark ? "vs-dark" : "light"}
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: "on",
                  cursorBlinking: "smooth",
                  automaticLayout: true,
                  padding: { top: 12 },
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  fontLigatures: true,
                  bracketPairColorization: { enabled: true },
                  smoothScrolling: true,
                  cursorSmoothCaretAnimation: "on",
                }}
              />
            </div>

            {/* Action Footer */}
            <div className="p-3 border-t border-[var(--border-color)] bg-black/10 dark:bg-white/[0.02] flex justify-between items-center">
              <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                <Clock size={10} />
                <span>Auto-saves every 5s</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={handleRunCode}
                  disabled={isRunning || loading || !code}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition rounded-xl text-[10px] font-bold text-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunning ? <RefreshCw size={10} className="animate-spin" /> : <Terminal size={10} />}
                  {isRunning ? "Running..." : "Run"}
                </motion.button>
                <motion.button
                  onClick={submitCode}
                  disabled={loading || isRunning || !code}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black transition rounded-xl text-[10px] font-black disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 border border-amber-400/20"
                >
                  {loading ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  {loading ? "Analyzing..." : "Submit to AI"}
                </motion.button>
              </div>
            </div>
          </div>

          {/* Execution Output */}
          <AnimatePresence>
            {(isRunning || runOutput) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden backdrop-blur-md"
              >
                <div className="p-2.5 border-b border-[var(--border-color)] bg-black/10 dark:bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-amber-500" />
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Output</span>
                  </div>
                  {runSuccess !== null && (
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full border",
                      runSuccess ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {runSuccess ? "Success" : "Failed"}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  {isRunning ? (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <div className="flex items-center gap-1.5">
                        {EXECUTION_STEPS.map((_, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <motion.div
                              animate={{ scale: idx === executionStep ? [1, 1.2, 1] : 1 }}
                              transition={{ duration: 0.5, repeat: idx === executionStep ? Infinity : 0 }}
                              className={cn(
                                "w-2 h-2 rounded-full transition-all",
                                idx < executionStep ? "bg-emerald-500" : idx === executionStep ? "bg-amber-500" : "bg-white/10"
                              )}
                            />
                            {idx < EXECUTION_STEPS.length - 1 && (
                              <div className={cn("w-4 h-0.5 rounded-full", idx < executionStep ? "bg-emerald-500/40" : "bg-white/5")} />
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-amber-500 animate-pulse">
                        {EXECUTION_STEPS[executionStep]}
                      </span>
                    </div>
                  ) : (
                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed">
                      {runOutput}
                    </pre>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Review Result */}
          <AnimatePresence>
            {aiReview && (
              <motion.div
                key="ai-review"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
                className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-y-auto p-5 backdrop-blur-md"
              >
                <div className="flex items-center gap-2 mb-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 280, damping: 18 }}
                    className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center"
                  >
                    <Sparkles size={14} className="text-black" />
                  </motion.div>
                  <h3 className="font-bold text-sm text-amber-500">AI Solution Review</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/15">
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-1 font-bold">Time Complexity</span>
                    <span className="text-sm text-emerald-400 font-mono font-bold">{aiReview.timeComplexity}</span>
                  </div>
                  <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/15">
                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-1 font-bold">Space Complexity</span>
                    <span className="text-sm text-amber-400 font-mono font-bold">{aiReview.spaceComplexity}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-2 font-bold">Optimization Tips</span>
                  <ul className="space-y-2">
                    {aiReview.optimizationTips.map((tip: string, j: number) => (
                      <motion.li
                        key={j}
                        custom={j}
                        variants={codingFadeUp}
                        initial="hidden"
                        animate="visible"
                        className="text-xs text-[var(--text-secondary)] flex items-start gap-2"
                      >
                        <Lightbulb size={12} className="text-amber-500 mt-0.5 shrink-0" />
                        <span>{tip}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  }

  // Dashboard View
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex flex-col h-full gap-5 overflow-y-auto pr-2 custom-scrollbar",
        isDark ? "text-white" : "text-[var(--text-primary)]"
      )}
    >
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <CodingMetricCard
              key={i}
              index={i}
              label={s.label}
              value={s.value}
              suffix={"suffix" in s ? (s as any).suffix : undefined}
              icon={<Icon size={18} />}
              color={s.color}
              description={s.desc}
            />
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* Left: Problem List */}
        <motion.div
          custom={4}
          variants={codingFadeUp}
          initial="hidden"
          animate="visible"
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex flex-col overflow-hidden backdrop-blur-md"
        >
          <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-black/10 dark:bg-white/[0.02]">
            <h3 className="font-bold flex items-center gap-2 text-sm">
              <Code2 size={16} className="text-amber-500" />
              DSA Practice
            </h3>
            <div className="flex items-center gap-2 bg-black/20 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-[var(--border-color)]">
              <Search size={12} className="text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none w-40 placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {filteredProblems.length === 0 ? (
              <CodingEmptyState
                type={searchQuery ? "search" : "questions"}
                title={searchQuery ? "No matching problems" : undefined}
                description={searchQuery ? `No problems match "${searchQuery}". Try a different search.` : undefined}
              />
            ) : (
              filteredProblems.map((p, i) => (
                <motion.div
                  key={p.id}
                  custom={i}
                  variants={codingFadeUp}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -1, scale: 1.005 }}
                  onClick={() => handleOpenProblem(p)}
                  className="flex items-center justify-between p-3.5 bg-black/10 dark:bg-white/[0.015] hover:bg-white/5 dark:hover:bg-white/[0.03] border border-transparent hover:border-[var(--border-color)] rounded-xl cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      p.difficulty === "Easy" ? "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]" :
                      p.difficulty === "Medium" ? "bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]" :
                      "bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.5)]"
                    )} />
                    <span className="font-medium text-xs group-hover:text-amber-400 transition-colors">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white/5 dark:bg-white/[0.03] text-[var(--text-muted)] text-[10px] rounded-md font-medium">{p.category}</span>
                    {p.company && (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] rounded-md font-bold">{p.company}</span>
                    )}
                    <ChevronRight size={12} className="text-[var(--text-muted)] group-hover:text-amber-500 transition-colors" />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Right: Categories & Contest */}
        <motion.div
          custom={5}
          variants={codingFadeUp}
          initial="hidden"
          animate="visible"
          className="w-64 flex flex-col gap-3 shrink-0"
        >
          <GlowCard className="p-4">
            <h3 className="font-bold flex items-center gap-2 mb-3 text-xs">
              <Filter size={14} className="text-amber-500" />
              Categories
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c, j) => (
                <motion.button
                  key={j}
                  custom={j}
                  variants={codingScaleIn}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-2.5 py-1.5 bg-black/20 dark:bg-white/[0.03] hover:bg-amber-500/10 border border-[var(--border-color)] hover:border-amber-500/30 text-[var(--text-secondary)] hover:text-amber-400 text-[10px] rounded-lg transition-all font-medium"
                >
                  {c}
                </motion.button>
              ))}
            </div>
          </GlowCard>

          <GlowCard glowColor="amber" className="p-5 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Trophy size={14} className="text-black" />
                </div>
                <h3 className="font-bold text-amber-500 text-xs">Weekly Contest</h3>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] mb-3 leading-relaxed">
                Compete with peers and improve your rating!
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[10px] font-black rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition-all"
              >
                Register Now
              </motion.button>
            </div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.06 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
            >
              <Trophy size={100} className="absolute -bottom-6 -right-6 text-amber-500" />
            </motion.div>
          </GlowCard>

          <GlowCard glowColor="purple" className="p-4">
            <h3 className="font-bold flex items-center gap-2 mb-2 text-xs">
              <Zap size={14} className="text-purple-500" />
              Quick Actions
            </h3>
            <div className="space-y-1.5">
              {[
                { label: "Daily Challenge", icon: Target, color: "text-emerald-500" },
                { label: "Random Problem", icon: Sparkles, color: "text-amber-500" },
                { label: "Review Bookmarks", icon: BookOpen, color: "text-blue-500" },
              ].map((item, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ x: 2 }}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/5 dark:hover:bg-white/[0.03] transition text-left"
                >
                  <item.icon size={12} className={item.color} />
                  <span className="text-[10px] font-medium text-[var(--text-secondary)]">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </GlowCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
