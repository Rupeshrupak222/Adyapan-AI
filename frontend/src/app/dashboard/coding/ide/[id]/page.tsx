"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
import {
  ChevronLeft, Play, Terminal, RefreshCw, RotateCcw, Copy,
  CheckCircle2, XCircle, AlertCircle, Clock, Zap,
  BookOpen, Code2, Trophy, Loader2,
} from "lucide-react";
import { renderMarkdown } from "@/utils/renderMarkdown";
import { ChatBackground } from "@/components/ady-chat/ChatBackground";
import {
  ExecutionProgressSteps,
  DifficultyBadge,
  XPBadge,
} from "@/components/coding-hub/CodingHubShared";

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Write your JavaScript solution here\nfunction solve(input) {\n  \n}\n`,
  python: `# Write your Python solution here\ndef solve(input_data):\n    pass\n`,
  cpp: `// Write your C++ solution here\n#include <iostream>\n#include <string>\nusing namespace std;\n\nstring solve(string input) {\n    return "";\n}\n`,
  java: `// Write your Java solution here\npublic class Solution {\n    public static String solve(String input) {\n        return "";\n    }\n}\n`,
};

const LANGUAGES = ["javascript", "python", "cpp", "java"] as const;
type Language = (typeof LANGUAGES)[number];

const LANG_LABEL: Record<string, string> = {
  javascript: "JavaScript",
  python: "Python",
  cpp: "C++",
  java: "Java",
};

const RUN_STEPS = [
  "Preparing Environment",
  "Validating Syntax",
  "Compiling Code",
  "Running Tests",
  "Collecting Results",
  "Complete",
];

const SUBMIT_STEPS = [
  "Preparing Package",
  "Sending to Evaluation Server",
  "Running Hidden Test Cases",
  "Analyzing Performance",
  "Calculating Score",
  "Complete",
];

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CodingIDEPage() {
  useRequireAuth("USER");
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;

  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";

  // Theme sync
  useEffect(() => {
    const t = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<any>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("javascript");
  const [stdin, setStdin] = useState("");

  // ── Execution state ───────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runStepIndex, setRunStepIndex] = useState(0);

  const [output, setOutput] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [runDetails, setRunDetails] = useState<any>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [outputTab, setOutputTab] = useState<"output" | "testcases">("output");

  // ── Resizable panels ──────────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(35);
  const containerRef = useRef<HTMLDivElement>(null);
  const [terminalHeight, setTerminalHeight] = useState(30);

  // ── Styles ────────────────────────────────────────────────────────────────
  const bg = isDark ? "#070715" : "#f0f4ff";
  const panelBg = isDark ? "rgba(12,10,30,0.95)" : "rgba(255,255,255,0.97)";
  const primaryText = isDark ? "#fff" : "#0f172a";
  const mutedText = isDark ? "rgba(255,255,255,0.45)" : "#64748b";
  const borderCol = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const surfaceBg = isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)";

  // ── Fetch challenge ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.get(`/challenges/${challengeId}`);
        if (cancelled) return;
        const ch = res.data?.challenge;
        if (!ch) {
          toast.error("Challenge not found");
          router.push("/dashboard/coding");
          return;
        }
        setChallenge(ch);
        setCode(DEFAULT_CODE[language] || DEFAULT_CODE.javascript);
      } catch {
        toast.error("Failed to load challenge");
        router.push("/dashboard/coding");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [challengeId, router]);

  // ── Resize handlers ───────────────────────────────────────────────────────
  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      if (pct > 20 && pct < 60) setLeftWidth(pct);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const startResizeTerminal = (e: React.MouseEvent) => {
    e.preventDefault();
    const middlePanel = (e.target as HTMLElement).closest("[data-middle-panel]");
    if (!middlePanel) return;
    const handleMove = (moveEvent: MouseEvent) => {
      const rect = middlePanel.getBoundingClientRect();
      const pct = ((rect.bottom - moveEvent.clientY) / rect.height) * 100;
      if (pct > 10 && pct < 70) setTerminalHeight(pct);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  // ── Code templates ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!challenge) return;
    setCode(DEFAULT_CODE[language] || DEFAULT_CODE.javascript);
  }, [language, challenge]);

  // ── Run ───────────────────────────────────────────────────────────────────
  const handleRun = async () => {
    if (!code || isRunning || isSubmitting) return;
    setIsRunning(true);
    setRunStepIndex(0);
    setOutput("");
    setTestResults([]);
    setRunDetails(null);
    setShowTerminal(true);
    setOutputTab("output");

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setRunStepIndex(step);
    }, 400);

    try {
      const res = await api.post("/challenges/run", {
        challengeId,
        code,
        language,
        stdin: stdin || undefined,
      });
      clearInterval(interval);
      setRunStepIndex(RUN_STEPS.length - 1);

      const data = res.data;
      setRunDetails({
        status: data.status || (data.success ? "Accepted" : "Failed"),
        executionTime: data.executionTime,
        memory: data.memory,
        success: data.success,
      });
      setOutput(data.output || data.error || "(No output)");
      if (data.sampleResults?.length > 0) {
        setTestResults(data.sampleResults);
        setOutputTab("testcases");
      }
      toast[data.success ? "success" : "warning"](
        data.success ? "All test cases passed!" : "Some test cases failed"
      );
    } catch (err: any) {
      clearInterval(interval);
      setRunStepIndex(RUN_STEPS.length - 1);
      const msg = err.response?.data?.error || err.message || "Execution failed";
      setOutput(msg);
      setRunDetails({ status: "Failed", executionTime: 0, memory: 0, success: false });
    } finally {
      setIsRunning(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!code || isRunning || isSubmitting) return;
    setIsSubmitting(true);
    setRunStepIndex(0);
    setTestResults([]);
    setRunDetails(null);
    setShowTerminal(true);
    setOutputTab("testcases");

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setRunStepIndex(step);
    }, 500);

    try {
      const res = await api.post("/challenges/submit", {
        challengeId,
        code,
        language,
      });
      clearInterval(interval);
      setRunStepIndex(SUBMIT_STEPS.length - 1);

      const data = res.data;
      setTestResults(data.testResults || []);
      setRunDetails({
        status: data.allPassed ? "Accepted" : "Failed",
        executionTime: data.executionTime,
        memory: data.memory,
        success: data.allPassed,
      });
      if (data.allPassed) {
        toast.success(`All ${data.totalTests} test cases passed! +${challenge?.points || 0} XP`);
      } else {
        toast.warning(`${data.passedTests}/${data.totalTests} test cases passed`);
      }
    } catch (err: any) {
      clearInterval(interval);
      setRunStepIndex(SUBMIT_STEPS.length - 1);
      const msg = err.response?.data?.error || err.message || "Submit failed";
      setOutput(msg);
      setRunDetails({ status: "Failed", executionTime: 0, memory: 0, success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full" style={{ background: bg }}>
        <ChatBackground isDark={isDark} />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 size={28} className="animate-spin" style={{ color: "#f59e0b" }} />
          <p className="text-xs font-bold" style={{ color: mutedText }}>Loading coding engine...</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const diffColors: Record<string, { bg: string; text: string; border: string }> = {
    Easy: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
    Medium: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
    Hard: { bg: "rgba(244,63,94,0.12)", text: "#f43f5e", border: "rgba(244,63,94,0.25)" },
  };
  const dc = diffColors[challenge?.difficulty] || diffColors.Easy;

  return (
    <div
      className="relative flex flex-col w-full h-full overflow-hidden"
      style={{ background: bg, color: primaryText }}
    >
      <ChatBackground isDark={isDark} />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div
        className="relative z-20 flex items-center gap-3 px-4 py-2.5 border-b flex-shrink-0"
        style={{ borderColor: borderCol, background: isDark ? "rgba(7,7,21,0.85)" : "rgba(240,244,255,0.85)", backdropFilter: "blur(12px)" }}
      >
        <motion.button
          onClick={() => router.push("/dashboard/coding")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold"
          style={{ borderColor: borderCol, color: mutedText }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <ChevronLeft size={14} /> Back
        </motion.button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <h1 className="text-sm font-black truncate" style={{ fontFamily: "var(--font-sans)" }}>
            {challenge?.title || "Challenge"}
          </h1>
          {challenge && <DifficultyBadge difficulty={challenge.difficulty} />}
          {challenge && <XPBadge xp={challenge.points} size="md" />}
          {challenge?.categoryName && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline" style={{ background: `${challenge.categoryColor || "#f59e0b"}15`, color: challenge.categoryColor || "#f59e0b" }}>
              {challenge.categoryName}
            </span>
          )}
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-0.5 bg-black/20 p-0.5 rounded-lg border" style={{ borderColor: borderCol }}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                language === lang
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              {lang === "cpp" ? "C++" : LANG_LABEL[lang] || lang}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main split ──────────────────────────────────────────────────── */}
      <div ref={containerRef} className="relative z-10 flex flex-1 overflow-hidden">

        {/* Left panel — problem statement */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden border-r"
          style={{ width: `${leftWidth}%`, borderColor: borderCol, background: panelBg }}
        >
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
              <BookOpen size={12} /> Problem Statement
            </div>
            <div className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(255,255,255,0.75)" : "#334155" }}>
              {renderMarkdown(challenge?.description || "", isDark)}
            </div>

            {/* Test cases */}
            {challenge?.testCases && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: mutedText }}>
                  Sample Test Cases
                </div>
                {(Array.isArray(challenge.testCases)
                  ? challenge.testCases
                  : typeof challenge.testCases === "string"
                    ? JSON.parse(challenge.testCases)
                    : []
                ).map((tc: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl border" style={{ background: surfaceBg, borderColor: borderCol }}>
                    <div className="text-[9px] font-bold uppercase mb-1.5" style={{ color: mutedText }}>Case {i + 1}</div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-[9px] font-bold block mb-0.5" style={{ color: mutedText }}>Input</span>
                        <pre className="p-2 rounded-lg text-emerald-400 overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)" }}>{tc.input}</pre>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold block mb-0.5" style={{ color: mutedText }}>Expected</span>
                        <pre className="p-2 rounded-lg text-amber-400 overflow-x-auto" style={{ background: "rgba(0,0,0,0.3)" }}>{tc.expected}</pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Topics */}
            {challenge?.topics?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {challenge.topics.map((t: string) => (
                  <span key={t} className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: surfaceBg, color: mutedText, border: `1px solid ${borderCol}` }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="w-1 flex-shrink-0 cursor-col-resize hover:bg-amber-500/30 transition-colors"
          style={{ background: borderCol }}
          onMouseDown={startResizeLeft}
        />

        {/* Right panel — editor + terminal */}
        <div data-middle-panel className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 relative min-h-0" style={{ height: showTerminal ? `${100 - terminalHeight}%` : "100%" }}>
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language}
              theme={isDark ? "vs-dark" : "light"}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 14,
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
                renderLineHighlight: "all",
                roundedSelection: true,
              }}
            />
          </div>

          {/* Terminal toggle / resize handle */}
          <div
            className="h-1 flex-shrink-0 cursor-row-resize hover:bg-amber-500/30 transition-colors"
            style={{ background: borderCol }}
            onMouseDown={startResizeTerminal}
            onClick={() => setShowTerminal(!showTerminal)}
          />

          {/* Terminal */}
          <AnimatePresence>
            {showTerminal && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: `${terminalHeight}%`, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex-shrink-0 flex flex-col overflow-hidden border-t"
                style={{ borderColor: borderCol, background: isDark ? "rgba(5,5,15,0.95)" : "rgba(255,255,255,0.95)" }}
              >
                {/* Terminal tabs */}
                <div className="flex items-center gap-1 px-3 py-1.5 border-b" style={{ borderColor: borderCol }}>
                  <button
                    onClick={() => setOutputTab("output")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${outputTab === "output" ? "bg-amber-500/15 text-amber-400" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Output
                  </button>
                  <button
                    onClick={() => setOutputTab("testcases")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition ${outputTab === "testcases" ? "bg-amber-500/15 text-amber-400" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    Test Cases {testResults.length > 0 && `(${testResults.length})`}
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => setShowTerminal(false)} className="text-slate-400 hover:text-white text-[10px]">
                    ✕
                  </button>
                </div>

                {/* Terminal content */}
                <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px]">
                  {(isRunning || isSubmitting) && (
                    <div className="mb-3">
                      <ExecutionProgressSteps
                        steps={isSubmitting ? SUBMIT_STEPS : RUN_STEPS}
                        currentStep={runStepIndex}
                      />
                    </div>
                  )}

                  {outputTab === "output" && (
                    <div>
                      {runDetails && (
                        <div className="flex items-center gap-3 mb-2 text-[10px]">
                          <span className={`font-bold px-2 py-0.5 rounded-full border ${
                            runDetails.success
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}>
                            {runDetails.status}
                          </span>
                          <span style={{ color: mutedText }}>
                            Time: <span style={{ color: primaryText }}>{(runDetails.executionTime || 0).toFixed(3)}s</span>
                          </span>
                        </div>
                      )}
                      <pre className={`whitespace-pre-wrap leading-relaxed ${
                        runDetails?.success ? "text-emerald-400" : runDetails ? "text-rose-400" : "text-slate-400"
                      }`}>
                        {output || "Run your code to see output here."}
                      </pre>
                    </div>
                  )}

                  {outputTab === "testcases" && (
                    <div className="space-y-2">
                      {testResults.length === 0 ? (
                        <p style={{ color: mutedText }}>Run or submit to see test case results.</p>
                      ) : (
                        testResults.map((tr, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg border"
                            style={{
                              background: tr.passed ? "rgba(16,185,129,0.05)" : "rgba(244,63,94,0.05)",
                              borderColor: tr.passed ? "rgba(16,185,129,0.15)" : "rgba(244,63,94,0.15)",
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {tr.passed ? <CheckCircle2 size={12} className="text-emerald-400" /> : <XCircle size={12} className="text-rose-400" />}
                              <span className="font-bold text-[10px]" style={{ color: tr.passed ? "#10b981" : "#f43f5e" }}>
                                Test {tr.testCase || i + 1}: {tr.passed ? "Passed" : "Failed"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-[10px] mt-1">
                              <div>
                                <span className="block text-[9px] mb-0.5" style={{ color: mutedText }}>Input</span>
                                <pre className="text-emerald-400 overflow-x-auto">{tr.input}</pre>
                              </div>
                              <div>
                                <span className="block text-[9px] mb-0.5" style={{ color: mutedText }}>Expected</span>
                                <pre className="text-amber-400 overflow-x-auto">{tr.expected}</pre>
                              </div>
                              <div>
                                <span className="block text-[9px] mb-0.5" style={{ color: mutedText }}>Actual</span>
                                <pre className="overflow-x-auto" style={{ color: tr.passed ? "#10b981" : "#f43f5e" }}>{tr.actual}</pre>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Bottom action bar ──────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-4 py-2.5 border-t flex-shrink-0"
            style={{ borderColor: borderCol, background: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }}
          >
            <div className="flex items-center gap-2 text-[10px]" style={{ color: mutedText }}>
              <Clock size={10} />
              <span>Auto-save active</span>
            </div>

            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleRun}
                disabled={isRunning || isSubmitting || !code}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition rounded-xl text-[11px] font-bold text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRunning ? <RefreshCw size={11} className="animate-spin" /> : <Terminal size={11} />}
                {isRunning ? "Running..." : "Run"}
              </motion.button>

              <motion.button
                onClick={handleSubmit}
                disabled={isSubmitting || isRunning || !code}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black transition rounded-xl text-[11px] font-black disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 border border-amber-400/20"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSubmitting ? (
                  <><RefreshCw size={11} className="animate-spin" /> Evaluating...</>
                ) : (
                  <><Play size={11} fill="currentColor" /> Submit</>
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
