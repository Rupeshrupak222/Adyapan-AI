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
  Code2, Sparkles, BookMarked, MessageSquare, StickyNote,
  ChevronLeft, Play, Settings, AlertCircle, CheckCircle2,
  Maximize2, Minimize2, X, Info, Moon, Sun, Pin, PinOff,
  Trash2, Plus, Search, HelpCircle, ChevronRight, CornerDownRight,
  BookOpen, Terminal, Send, Clock, RefreshCw, RotateCcw, Copy
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
  ExecutionProgressSteps,
  codingFadeUp
} from "@/components/coding-hub/CodingHubShared";
import {
  DashboardSidebar,
  DashboardTopNav,
} from "@/components/dashboard-shell";
import type { AdyapanUser } from "@/components/dashboard-shell";
import { renderMarkdown, inlineFormat } from "@/utils/renderMarkdown";

// Checklists for loading experience
const loadingSteps = [
  "Preparing workspace environment",
  "Initializing code execution context",
  "Restoring last saved session state",
  "Loading AI coaching models",
  "Configuring Monaco compilation tools"
];

const DEFAULT_CODE = {
  python: `# Write your python solution here\n\ndef solve():\n    pass\n`,
  cpp: `// Write your C++ solution here\n#include <iostream>\nusing namespace std;\n\nvoid solve() {\n    \n}\n`,
  java: `// Write your Java solution here\npublic class Solution {\n    public static void solve() {\n        \n    }\n}\n`,
  javascript: `// Write your JavaScript solution here\nfunction solve() {\n    \n}\n`
};

export default function ProblemWorkspacePage() {
  useRequireAuth("USER");
  const params = useParams();
  const router = useRouter();
  const problemId = params.id as string;

  // Shell Layout settings
  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Loading settings
  const [loading, setLoading] = useState(true);
  const [loadingIndex, setLoadingIndex] = useState(0);

  // Workspace Data
  const [problem, setProblem] = useState<any>(null);
  const [progress, setProgress] = useState<any>({
    status: "not_started",
    timeSpent: 0,
    bookmarked: false
  });
  const [notes, setNotes] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [scrapedProblem, setScrapedProblem] = useState<any>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("python");

  // Panel settings (resizable)
  const [leftWidth, setLeftWidth] = useState(30); // percentages
  const [rightWidth, setRightWidth] = useState(30);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [activeTabLeft, setActiveTabLeft] = useState<"statement" | "notes" | "discussion">("statement");
  const containerRef = useRef<HTMLDivElement>(null);

  // Monaco options
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [fontSize, setFontSize] = useState(14);
  const [minimap, setMinimap] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  // Notes options
  const [noteInput, setNoteInput] = useState("");
  const [searchNote, setSearchNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Discussion options
  const [discussionInput, setDiscussionInput] = useState("");

  // AI assistant options
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI DSA Coach. I am fully aware of this problem and your code structure. How can I guide you today? Use the quick action buttons below or type a custom question."
    }
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeHintIndex, setActiveHintIndex] = useState(0);
  const [hints, setHints] = useState<Record<number, string>>({});
  const [commonMistakes, setCommonMistakes] = useState<string[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // Code execution state
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [outputTab, setOutputTab] = useState<"input" | "output" | "testcases" | "history">("output");
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(30);

  // Day 13 Code snapshot and analytics states
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [executionStepIndex, setExecutionStepIndex] = useState(0);
  const [runDetails, setRunDetails] = useState<any>(null);

  // Day 14 Code Review Engine states
  const [reviewMode, setReviewMode] = useState<string>("interview");
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [reviewDrawerOpen, setReviewDrawerOpen] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [reviewHistory, setReviewHistory] = useState<any[]>([]);
  const [reviewStepIndex, setReviewStepIndex] = useState<number>(0);
  const [activeReviewTab, setActiveReviewTab] = useState<"active" | "complexity" | "history">("active");

  // Day 15 AI Complexity Engine states
  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState<boolean>(false);
  const [complexityResult, setComplexityResult] = useState<any>(null);
  const [complexityHistory, setComplexityHistory] = useState<any[]>([]);
  const [complexityStepIndex, setComplexityStepIndex] = useState<number>(0);


  // Time spent tracker

  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Load User, Theme, Notifications
  useEffect(() => {
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    setEditorTheme(savedTheme === "dark" ? "vs-dark" : "light");
    document.documentElement.setAttribute("data-theme", savedTheme);

    try {
      const rawUser = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (rawUser) {
        setUser(JSON.parse(rawUser));
      }
    } catch { /* ignore */ }

    api.get("/notifications?limit=5")
      .then(res => {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.notifications?.filter((n: any) => !n.read).length || 0);
      })
      .catch(() => {});
  }, []);

  // Keep track of time spent active on page
  useEffect(() => {
    if (!loading) {
      timerRef.current = setInterval(() => {
        setTimeSpentSeconds(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [loading]);

  // Load custom input from LocalStorage on mount
  useEffect(() => {
    const savedStdin = localStorage.getItem(`adyapan-stdin-${problemId}`);
    if (savedStdin) {
      setStdin(savedStdin);
    }
  }, [problemId]);

  // Handle stdin change with local storage backup
  const handleStdinChange = (val: string) => {
    setStdin(val);
    localStorage.setItem(`adyapan-stdin-${problemId}`, val);
  };

  const executionSteps = [
    "Preparing Execution Environment",
    "Validating Code Quality",
    "Sending to Sandbox Runtimes",
    "Executing Code Instructions",
    "Collecting Outputs & Metrics",
    "Execution Complete"
  ];

  useEffect(() => {
    let interval: any;
    if (isRunning || isSubmitting) {
      setExecutionStepIndex(0);
      interval = setInterval(() => {
        setExecutionStepIndex(prev => {
          if (prev < executionSteps.length - 2) {
            return prev + 1;
          }
          return prev;
        });
      }, 700);
    } else {
      setExecutionStepIndex(executionSteps.length - 1);
    }
    return () => clearInterval(interval);
  }, [isRunning, isSubmitting]);

  const fetchExecutions = async () => {
    try {
      const res = await api.get(`/coding/workspace/${problemId}/executions`);
      if (res.data.success) {
        setExecutions(res.data.executions || []);
      }
    } catch (err) {
      console.error("Failed to fetch executions", err);
    }
  };

  const fetchWorkspaceData = async () => {
    try {
      const res = await api.get(`/coding/workspace/${problemId}`);
      const data = res.data;
      setProblem(data.question);
      setProgress(data.progress);
      setNotes(data.notes || []);
      setDiscussions(data.discussions || []);
      setAiAnalysis(data.aiAnalysis || null);
      setScrapedProblem(data.scrapedProblem || null);
      
      // Load restored session
      if (data.session) {
        setCode(data.session.codeContent);
        setLanguage(data.session.language);
      } else {
        setCode(DEFAULT_CODE[language as keyof typeof DEFAULT_CODE] || DEFAULT_CODE.python);
      }

      await fetchExecutions();

      setLoading(false);

    } catch (err) {
      console.error("Workspace load error:", err);
      toast.error("Failed to load problem workspace data");
      router.push("/dashboard/coding");
    }
  };

  const handleAutoSaveCode = async () => {
    if (!problem) return;
    try {
      await api.post(`/coding/workspace/${problemId}/save`, {
        codeContent: code,
        language,
        status: progress.status === "solved" ? "solved" : "attempted",
        timeSpent: 5 // increment time spent by 5 seconds
      });
    } catch (err) {
      // Slient failure for auto save
      console.error("Auto save failed", err);
    }
  };

  // Loading timer check-list simulation
  useEffect(() => {
    if (loadingIndex < loadingSteps.length) {
      const timer = setTimeout(() => {
        setLoadingIndex(prev => prev + 1);
      }, 350);
      return () => clearTimeout(timer);
    } else if (problemId && loading) {
      fetchWorkspaceData();
    }
  }, [loadingIndex, problemId, loading]);

  // Auto-Save code every 5 seconds
  useEffect(() => {
    if (loading || !problem) return;
    const saveTimer = setTimeout(() => {
      handleAutoSaveCode();
    }, 5000);
    return () => clearTimeout(saveTimer);
  }, [code, language, loading, problem]);

  const handleEndSession = async () => {
    if (!problem) return;
    const hasPassedAll = (testResults.length > 0 && testResults.every(t => t.passed)) || runDetails?.success === true || progress.status === "solved";
    const nextStatus = hasPassedAll ? "solved" : "attempted";

    try {
      await api.post(`/coding/workspace/${problemId}/save`, {
        codeContent: code,
        language,
        status: nextStatus,
        timeSpent: 0
      });
      
      setProgress((prev: any) => ({
        ...prev,
        status: nextStatus,
        solved: hasPassedAll
      }));

      if (hasPassedAll) {
        toast.success("Session ended! Question solved successfully! 🎉");
      } else {
        toast.info("Session ended! Question marked as Attempted (Try Again).");
      }

      setTimeout(() => {
        if (window.history.length > 1 && window.opener) {
          window.close();
        } else {
          router.push("/dashboard/coding");
        }
      }, 400);
    } catch (err) {
      toast.error("Failed to save and end session");
    }
  };

  // Toggle Theme
  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setEditorTheme(next === "dark" ? "vs-dark" : "light");
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  // Bookmark Toggle
  const handleBookmarkToggle = async () => {
    if (!problem) return;
    const nextBookmarked = !progress.bookmarked;
    try {
      await api.post(`/coding/workspace/${problemId}/bookmark`, { bookmarked: nextBookmarked });
      setProgress((prev: any) => ({ ...prev, bookmarked: nextBookmarked }));
      toast.success(nextBookmarked ? "Problem bookmarked for revision!" : "Bookmark removed");
    } catch (err) {
      toast.error("Failed to update bookmark status");
    }
  };

  // Mark Solved
  const handleMarkSolved = async () => {
    if (!problem) return;
    try {
      await api.post(`/coding/workspace/${problemId}/save`, {
        codeContent: code,
        language,
        status: "solved",
        timeSpent: 0
      });
      setProgress((prev: any) => ({ ...prev, status: "solved", solved: true }));
      toast.success("Problem marked as Solved! Excellent work! 🎉");
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Resizing hooks
  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      if (newWidth > 15 && newWidth < 50) {
        setLeftWidth(newWidth);
      }
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    const handleMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ((rect.right - moveEvent.clientX) / rect.width) * 100;
      if (newWidth > 15 && newWidth < 50) {
        setRightWidth(newWidth);
      }
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
      const newHeight = ((rect.bottom - moveEvent.clientY) / rect.height) * 100;
      if (newHeight > 10 && newHeight < 70) {
        setTerminalHeight(newHeight);
      }
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  // Notes operations
  const handleSaveNote = async () => {
    if (!noteInput.trim()) return;
    try {
      const res = await api.post(`/coding/workspace/${problemId}/notes`, {
        id: editingNoteId || undefined,
        noteContent: noteInput
      });
      if (res.data.success) {
        if (editingNoteId) {
          setNotes(prev => prev.map(n => n.id === editingNoteId ? res.data.note : n));
          toast.success("Note updated!");
        } else {
          setNotes(prev => [res.data.note, ...prev]);
          toast.success("Note saved!");
        }
        setNoteInput("");
        setEditingNoteId(null);
      }
    } catch (err) {
      toast.error("Failed to save note");
    }
  };

  const handleTogglePinNote = async (note: any) => {
    try {
      const res = await api.post(`/coding/workspace/${problemId}/notes`, {
        id: note.id,
        noteContent: note.noteContent,
        pinned: !note.pinned
      });
      if (res.data.success) {
        setNotes(prev => prev.map(n => n.id === note.id ? res.data.note : n).sort((a,b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)));
        toast.success(note.pinned ? "Note unpinned" : "Note pinned");
      }
    } catch (err) {
      toast.error("Failed to update note");
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await api.post(`/coding/workspace/${problemId}/notes`, { id, action: "delete" });
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success("Note deleted");
    } catch (err) {
      toast.error("Failed to delete note");
    }
  };

  // Discussion operations
  const handlePostDiscussion = async () => {
    if (!discussionInput.trim()) return;
    try {
      const res = await api.post(`/coding/workspace/${problemId}/discussion`, {
        message: discussionInput
      });
      if (res.data.success) {
        setDiscussions(prev => [...prev, res.data.discussion]);
        setDiscussionInput("");
        toast.success("Comment posted!");
      }
    } catch (err) {
      toast.error("Failed to post message");
    }
  };

  // AI Hint triggers
  const handleTriggerHint = async (hintIndex: number) => {
    if (activeHintIndex >= hintIndex) return; // already unlocked
    setAiGenerating(true);
    try {
      const res = await api.post(`/coding/workspace/${problemId}/hint`, { hintIndex });
      if (res.data.success) {
        setHints(prev => ({ ...prev, [hintIndex]: res.data.hint }));
        setActiveHintIndex(hintIndex);
        if (hintIndex === 3 && res.data.commonMistakes) {
          setCommonMistakes(res.data.commonMistakes);
        }
        
        // Append to AI chat conversation
        setMessages(prev => [
          ...prev,
          { role: "user", content: `Give me Hint ${hintIndex}` },
          { role: "assistant", content: `**Hint ${hintIndex}:** ${res.data.hint}` }
        ]);
        toast.success(`Hint ${hintIndex} unlocked!`);
      }
    } catch (err) {
      toast.error("Failed to unlock hint");
    } finally {
      setAiGenerating(false);
    }
  };

  // Custom AI prompt action
  const handleTriggerAIAction = async (type: string, actionLabel: string) => {
    setAiGenerating(true);
    setMessages(prev => [...prev, { role: "user", content: actionLabel }]);
    try {
      const res = await api.post(`/coding/workspace/${problemId}/explain`, {
        type,
        codeSnippet: code
      });
      if (res.data.success) {
        setMessages(prev => [...prev, { role: "assistant", content: res.data.explanation }]);
      }
    } catch (err) {
      toast.error("AI Coach failed to generate analysis");
    } finally {
      setAiGenerating(false);
    }
  };

  // Custom chat message
  const handleSendCustomMessage = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    setAiInput("");
    setAiGenerating(true);
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    
    try {
      const prompt = `Student Question: "${userMsg}"
Code currently written by student:
\`\`\`
${code}
\`\`\`
Answer the student's question based on the coding problem. Provide hints or feedback but do NOT give them the complete copy-paste solution immediately. Support their learning process.`;
      const res = await api.post(`/coding/workspace/${problemId}/explain`, {
        type: "custom",
        codeSnippet: prompt
      });
      if (res.data.success) {
        setMessages(prev => [...prev, { role: "assistant", content: res.data.explanation }]);
      }
    } catch (err) {
      toast.error("AI Coach failed to reply");
    } finally {
      setAiGenerating(false);
    }
  };

  // Code execution handlers
  const handleRun = async () => {
    if (isRunning || isSubmitting) return;
    setIsRunning(true);
    setOutputTab(stdin ? "output" : "input");
    setOutput("");
    setRunDetails(null);
    setTestResults([]);
    setShowTerminal(true);

    let effectiveStdin = stdin;
    if (!effectiveStdin && problem?.examples) {
      try {
        const parsed = typeof problem.examples === 'string' ? JSON.parse(problem.examples) : problem.examples;
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].input) {
          effectiveStdin = parsed[0].input;
          setStdin(parsed[0].input);
        }
      } catch { /* ignore */ }
    }

    try {
      const res = await api.post(`/coding/workspace/${problemId}/run`, {
        code,
        language,
        stdin: effectiveStdin,
      });
      const data = res.data;
      setRunDetails({
        status: data.status,
        executionTime: data.executionTime,
        memory: data.memory,
        language,
        success: data.success
      });
      if (data.success) {
        setOutput(data.output || "(No output)");
      } else {
        setOutput(data.error || data.output || "Execution failed");
      }
      if (data.sampleResults && data.sampleResults.length > 0) {
        setTestResults(data.sampleResults.map((r: any, i: number) => ({
          testCase: i + 1,
          input: r.input,
          expected: r.expected,
          actual: r.actual,
          passed: r.passed,
          executionTime: 0,
        })));
      }
      setOutputTab("output");
      fetchExecutions();
    } catch (err: any) {
      setOutput(err.response?.data?.error || err.message || "Failed to run code");
      setRunDetails({
        status: "Failed",
        executionTime: 0,
        memory: 0,
        language,
        success: false
      });
      setOutputTab("output");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (isRunning || isSubmitting) return;
    setIsSubmitting(true);
    setOutputTab("testcases");
    setTestResults([]);
    setRunDetails(null);
    setShowTerminal(true);
    try {
      const res = await api.post(`/coding/workspace/${problemId}/submit`, {
        code,
        language,
      });
      const data = res.data;
      setTestResults(data.testResults || []);
      setRunDetails({
        status: data.allPassed ? "Accepted" : "Failed",
        executionTime: data.executionTime,
        memory: data.memory,
        language,
        success: data.allPassed
      });
      if (data.allPassed) {
        setProgress((prev: any) => ({ ...prev, status: "solved", solved: true }));
        toast.success(`All ${data.totalTests} test cases passed! Question marked as Solved.`);
      } else {
        toast.warning(`${data.passedTests}/${data.totalTests} test cases passed`);
      }

      // Auto-sync code backup to database on submit
      api.post(`/coding/workspace/${problemId}/save`, {
        codeContent: code,
        language,
        status: data.allPassed ? "solved" : (progress.status === "solved" ? "solved" : "attempted"),
        timeSpent: 0
      }).catch(err => console.error("Auto submit sync error:", err));

      fetchExecutions();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to submit code");
      setRunDetails({
        status: "Failed",
        executionTime: 0,
        memory: 0,
        language,
        success: false
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreExecution = async (execId: string) => {
    const restorePromise = api.post(`/coding/workspace/${problemId}/execution/restore`, {
      executionId: execId
    });

    toast.promise(restorePromise, {
      loading: "Restoring code from version snapshot...",
      success: (res) => {
        setCode(res.data.codeContent);
        setLanguage(res.data.language);
        setSelectedExecution(null);
        setIsComparing(false);
        return "Workspace restored successfully!";
      },
      error: "Failed to restore version snapshot"
    });
  };

  const renderOutputConsole = () => {
    if (isRunning) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-8 gap-5">
          <ExecutionProgressSteps
            steps={executionSteps}
            currentStep={executionStepIndex}
          />
        </div>
      );
    }

    if (!runDetails && !output) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10 text-[var(--text-secondary)] gap-2">
          <Terminal size={28} className="text-[var(--text-secondary)]/25 mb-1" />
          <span className="text-xs font-bold text-[var(--text-primary)]">Ready to execute</span>
          <span className="text-[10px] text-[var(--text-secondary)] text-center">Write code and click "Run" to view compilation/execution output here.</span>
        </div>
      );
    }

    const isSuccess = runDetails?.success;
    const isCompileError = runDetails?.status === "Compilation Error";
    const isRuntimeError = runDetails?.status === "Runtime Error";

    return (
      <div className="flex flex-col gap-3">
        {/* Run Metrics Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
          <div className="flex items-center gap-3">
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 border ${
              isSuccess 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]" 
                : isCompileError
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-500 border-amber-500/20"
            }`}>
              {isSuccess ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
              <span>{runDetails?.status || "Completed"}</span>
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono">
              Language: <span className="font-bold text-[var(--text-primary)]">{language}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono text-[var(--text-secondary)]">
            <div>
              Time: <span className="font-bold text-[var(--text-primary)]">{(runDetails?.executionTime || 0).toFixed(3)}s</span>
            </div>
            <div>
              Memory: <span className="font-bold text-[var(--text-primary)]">{runDetails?.memory ? `${(runDetails.memory / 1024 / 1024).toFixed(2)} MB` : "0 MB"}</span>
            </div>
          </div>
        </div>

        {/* Console Box */}
        <div className="flex flex-col bg-black/40 border border-[var(--border-color)] rounded-xl overflow-hidden">
          <div className="bg-black/30 border-b border-[var(--border-color)] px-3 py-1.5 flex items-center justify-between text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">
            <span>Terminal Output</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(output);
                toast.success("Terminal output copied!");
              }}
              className="hover:text-[var(--text-primary)] transition flex items-center gap-1"
            >
              <Copy size={10} />
              <span>Copy</span>
            </button>
          </div>
          
          <pre className={`p-3 text-[11px] font-mono overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed ${
            isCompileError 
              ? "text-rose-400 bg-rose-950/5 font-semibold"
              : isRuntimeError
                ? "text-amber-400 bg-amber-950/5"
                : "text-emerald-400"
          }`}>
            <div>
              {output}
              {!stdin && (output.includes("input()") || output.includes("ValueError") || output.includes("EOFError") || output.includes("EOF when reading")) && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-sans">
                  <span className="font-bold">Tip:</span> Your code uses <code className="text-amber-300 font-mono">input()</code> but no stdin was provided. Go to the <span className="font-bold">Input</span> tab and enter the values your code expects, then click Run again.
                </div>
              )}
            </div>
          </pre>
        </div>
      </div>
    );
  };

  const renderRunHistory = () => {
    if (executions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-10 text-[var(--text-secondary)] gap-2">
          <Clock size={24} className="text-[var(--text-secondary)]/30 mb-1" />
          <span className="text-xs font-bold text-[var(--text-primary)]">No execution history</span>
          <span className="text-[10px] text-[var(--text-secondary)] text-center">Run or submit code to generate attempts.</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
        <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-widest font-black mb-1">
          Recent Code Executions & Snapshots
        </div>
        <div className="flex flex-col gap-2">
          {executions.map((exec, idx) => {
            const isSuccess = exec.status === "Accepted" || exec.status === "Success" || exec.status === "Completed" || exec.status === "Passed";
            const dateStr = new Date(exec.createdAt).toLocaleDateString([], { month: "short", day: "numeric" });
            const timeStr = new Date(exec.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const versionNum = exec.history?.[0]?.versionNumber || (executions.length - idx);

            return (
              <div
                key={exec.id}
                className="bg-white/5 border border-[var(--border-color)] hover:border-amber-500/20 hover:bg-white/[0.03] p-2.5 rounded-xl transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isSuccess ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-rose-500 shadow-[0_0_6px_#f43f5e]"
                  }`} />
                  
                  <div className="flex flex-col gap-0.5">
                    <div className="font-bold flex items-center gap-1.5 text-[var(--text-primary)]">
                      <span>Version {versionNum}</span>
                      <span className="text-[9px] bg-white/5 text-[var(--text-secondary)] px-1.5 py-0.5 rounded font-mono uppercase">
                        {exec.language}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                        isSuccess ? "text-emerald-400 bg-emerald-500/5" : "text-rose-400 bg-rose-500/5"
                      }`}>
                        {exec.status}
                      </span>
                    </div>
                    <div className="text-[9px] text-[var(--text-secondary)] font-medium">
                      Executed {dateStr} at {timeStr}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)] mr-1">
                    {(exec.executionTime || 0).toFixed(3)}s
                  </span>
                  
                  <button
                    onClick={() => {
                      setSelectedExecution(exec);
                      setIsComparing(false);
                    }}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg transition text-[9px] font-bold"
                  >
                    View
                  </button>

                  <button
                    onClick={() => {
                      setSelectedExecution(exec);
                      setIsComparing(true);
                    }}
                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg transition text-[9px] font-bold"
                  >
                    Compare
                  </button>

                  <button
                    onClick={() => handleRestoreExecution(exec.id)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition text-[9px] font-black uppercase tracking-wider"
                  >
                    Restore
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHistoryDetailsModal = () => {
    if (!selectedExecution) return null;
    const exec = selectedExecution;
    const isSuccess = exec.status === "Accepted" || exec.status === "Success" || exec.status === "Completed" || exec.status === "Passed";
    const versionNum = exec.history?.[0]?.versionNumber || "?";

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[var(--bg-card)] border border-[var(--border-color)] w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="px-5 py-3 border-b border-[var(--border-color)] bg-black/25 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <h3 className="text-xs font-black text-[var(--text-primary)]">
                {isComparing ? "Compare Version Snapshot" : "Execution Details"} (Version {versionNum})
              </h3>
            </div>
            <button
              onClick={() => setSelectedExecution(null)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[10px] font-bold px-2 py-1 hover:bg-white/5 rounded-lg transition"
            >
              Close
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 text-[11px] select-text">
            {/* Meta statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-black/30 p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-0.5">Status</span>
                <span className={`font-black uppercase text-[10px] ${isSuccess ? "text-emerald-400" : "text-rose-400"}`}>
                  {exec.status}
                </span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-0.5">Language</span>
                <span className="font-bold text-[var(--text-primary)] uppercase">{exec.language}</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-0.5">Execution Time</span>
                <span className="font-bold text-[var(--text-primary)]">{(exec.executionTime || 0).toFixed(3)}s</span>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-[var(--border-color)]">
                <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold block mb-0.5">Executed At</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {new Date(exec.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>

            {/* Side-by-side compare or snapshot code view */}
            {isComparing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                <div className="flex flex-col gap-1.5">
                  <div className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">
                    Current Code
                  </div>
                  <pre className="bg-black/30 border border-[var(--border-color)] p-3 rounded-xl font-mono text-[10px] overflow-auto max-h-[30vh] leading-relaxed text-[var(--text-secondary)]">
                    {code}
                  </pre>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="text-[9px] text-amber-500 uppercase tracking-wider font-bold">
                    Version {versionNum} Code Snapshot
                  </div>
                  <pre className="bg-black/30 border border-amber-500/20 p-3 rounded-xl font-mono text-[10px] overflow-auto max-h-[30vh] leading-relaxed text-[var(--text-secondary)]">
                    {exec.codeSnapshot}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Code Snapshot</span>
                  <pre className="bg-black/30 border border-[var(--border-color)] p-3 rounded-xl font-mono text-[10px] overflow-auto max-h-[20vh] leading-relaxed text-[var(--text-secondary)]">
                    {exec.codeSnapshot}
                  </pre>
                </div>

                {exec.stdin && exec.stdin !== "all_test_cases" && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Stdin Input</span>
                    <pre className="bg-black/30 border border-[var(--border-color)] p-2.5 rounded-xl font-mono text-[10px] text-emerald-400">
                      {exec.stdin}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {exec.stdout && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Stdout</span>
                      <pre className="bg-black/30 border border-[var(--border-color)] p-2.5 rounded-xl font-mono text-[10px] text-emerald-400 overflow-auto max-h-[12vh]">
                        {exec.stdout}
                      </pre>
                    </div>
                  )}
                  {exec.stderr && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wider font-bold">Stderr / Diagnostics</span>
                      <pre className="bg-black/30 border border-rose-500/10 p-2.5 rounded-xl font-mono text-[10px] text-rose-400 overflow-auto max-h-[12vh]">
                        {exec.stderr}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-5 py-3 border-t border-[var(--border-color)] bg-black/25 flex items-center justify-between shrink-0">
            <button
              onClick={() => setSelectedExecution(null)}
              className="px-3.5 py-1.5 border border-[var(--border-color)] hover:bg-white/5 rounded-xl text-[10px] font-bold transition text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={() => handleRestoreExecution(exec.id)}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black rounded-xl text-[10px] font-black shadow-lg shadow-amber-500/10 transition flex items-center gap-1.5"
            >
              <RotateCcw size={12} className="fill-black/10" />
              <span>Restore Snapshot</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  // Day 14 AI Code Review Engine Action Handlers
  const fetchReviewHistory = async () => {
    try {
      const res = await api.get(`/coding/reviews/history?questionId=${problemId}`);
      if (res.data.success) {
        setReviewHistory(res.data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch review history", err);
    }
  };

  const handleRequestReview = async () => {
    if (isReviewing || isRunning || isSubmitting) return;
    setIsReviewing(true);
    setReviewDrawerOpen(true);
    setActiveReviewTab("active");
    setReviewStepIndex(0);
    setReviewResult(null);

    // Progressive step loading experience
    const interval = setInterval(() => {
      setReviewStepIndex(prev => {
        if (prev < 5) return prev + 1;
        return prev;
      });
    }, 1200);

    try {
      const res = await api.post(`/coding/review`, {
        questionId: problemId,
        code,
        language,
        reviewMode
      });
      if (res.data.success) {
        setReviewResult(res.data.review.reviewJson);
        setReviewStepIndex(6); // Complete
        toast.success("AI Code Review completed!");
        fetchReviewHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to generate code review");
      setReviewDrawerOpen(false);
    } finally {
      clearInterval(interval);
      setIsReviewing(false);
    }
  };

  const handleViewHistoryReview = (review: any) => {
    setReviewResult(review.reviewJson);
    setReviewMode(review.reviewMode);
    setReviewStepIndex(6); // Complete
    setActiveReviewTab("active");
    setReviewDrawerOpen(true);
  };

  // Day 15 Complexity Engine Action Handlers
  const fetchComplexityHistory = async () => {
    try {
      const res = await api.get(`/coding/complexity/history?questionId=${problemId}`);
      if (res.data.success) {
        setComplexityHistory(res.data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch complexity history", err);
    }
  };

  const handleRequestComplexityAnalysis = async () => {
    if (isAnalyzingComplexity || isRunning || isSubmitting) return;
    setIsAnalyzingComplexity(true);
    setReviewDrawerOpen(true);
    setActiveReviewTab("complexity");
    setComplexityStepIndex(0);
    setComplexityResult(null);

    // Progressive step loading experience
    const interval = setInterval(() => {
      setComplexityStepIndex(prev => {
        if (prev < 5) return prev + 1;
        return prev;
      });
    }, 1000);

    try {
      const res = await api.post(`/coding/complexity/analyze`, {
        questionId: problemId,
        code,
        language
      });
      if (res.data.success) {
        setComplexityResult(res.data.complexityAnalysis.analysisJson);
        setComplexityStepIndex(6); // Complete
        toast.success("AI Complexity Analysis completed!");
        fetchComplexityHistory();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to analyze complexity");
      setReviewDrawerOpen(false);
    } finally {
      clearInterval(interval);
      setIsAnalyzingComplexity(false);
    }
  };

  const handleViewHistoryComplexity = (comp: any) => {
    setComplexityResult(comp.analysisJson);
    setComplexityStepIndex(6); // Complete
    setActiveReviewTab("complexity");
    setReviewDrawerOpen(true);
  };

  const renderComplexityTabContent = () => {
    if (isAnalyzingComplexity) {
      const complexityLoadingSteps = [
        "Analyzing Algorithm",
        "Detecting Patterns",
        "Calculating Complexity",
        "Evaluating Scalability",
        "Generating Insights",
        "Preparing Recommendations",
        "Analysis Complete"
      ];
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-5">
          <ExecutionProgressSteps
            steps={complexityLoadingSteps.slice(0, 6)}
            currentStep={complexityStepIndex}
          />
        </div>
      );
    }

    if (!complexityResult) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-zinc-400 gap-3">
          <Sparkles size={32} className="text-slate-300 dark:text-zinc-700 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">No complexity analysis generated for this session</span>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-xs leading-relaxed mb-3">
            Click **Run Complexity Analysis** inside the Code Review tab to run standard complexity checks on your solution code.
          </p>
          <button
            onClick={handleRequestComplexityAnalysis}
            className="flex items-center gap-1.5 text-xs px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-lg transition shadow-md hover:shadow-[0_0_16px_rgba(245,158,11,0.2)]"
          >
            <Sparkles size={12} />
            <span>Run Complexity Analysis</span>
          </button>
        </div>
      );
    }    return (
      <div className="flex flex-col gap-6 select-text">
        {/* Scores Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Efficiency Score */}
          <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col items-center justify-center relative dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
            <span className="text-[8px] text-slate-400 dark:text-zinc-400 uppercase tracking-wider font-bold mb-2">Efficiency Score</span>
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="34" className="stroke-slate-200 dark:stroke-zinc-800/60" strokeWidth="6" fill="transparent" />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-amber-500"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray="213.6"
                  style={{ filter: "drop-shadow(0px 0px 4px rgba(245, 158, 11, 0.45))" }}
                  initial={{ strokeDashoffset: 213.6 }}
                  animate={{ strokeDashoffset: 213.6 - (213.6 * (complexityResult.efficiency_score || 0)) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-black text-slate-800 dark:text-zinc-100">{complexityResult.efficiency_score}</span>
                <span className="text-[8px] text-slate-400 dark:text-zinc-500 uppercase font-black">/ 100</span>
              </div>
            </div>
          </div>

          {/* Optimization Score */}
          <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col items-center justify-center relative dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
            <span className="text-[8px] text-slate-400 dark:text-zinc-400 uppercase tracking-wider font-bold mb-2">Optimization Score</span>
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="26" className="stroke-slate-200 dark:stroke-zinc-800/60" strokeWidth="5" fill="transparent" />
                <motion.circle
                  cx="32"
                  cy="32"
                  r="26"
                  className="stroke-violet-500"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="163.36"
                  style={{ filter: "drop-shadow(0px 0px 4px rgba(139, 92, 246, 0.45))" }}
                  initial={{ strokeDashoffset: 163.36 }}
                  animate={{ strokeDashoffset: 163.36 - (163.36 * (complexityResult.optimization_score || 0)) / 100 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-sm font-black text-slate-800 dark:text-zinc-100">{complexityResult.optimization_score}</span>
                <span className="text-[6px] text-slate-400 dark:text-zinc-500 uppercase font-black">/ 100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Complexity badges */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-2.5 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
            <h4 className="text-[8px] font-black uppercase text-amber-500 tracking-wider">Time Complexity</h4>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Current Solution</span>
                <span className="font-black text-amber-500">{complexityResult.time_complexity}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Best Known</span>
                <span className="font-black text-emerald-500">{complexityResult.best_possible_time}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-2.5 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
            <h4 className="text-[8px] font-black uppercase text-amber-500 tracking-wider">Space Complexity</h4>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Current Solution</span>
                <span className="font-black text-amber-500">{complexityResult.space_complexity}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400">Best Known</span>
                <span className="font-black text-emerald-500">{complexityResult.best_possible_space}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Timeline */}
        {(() => {
          const complexities = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"];
          const cleanComplexityStr = (cStr: string) => {
            let clean = cStr.toLowerCase().replace(/\s+/g, "");
            if (clean.includes("1")) return "O(1)";
            if (clean.includes("logn")) return "O(log n)";
            if (clean.includes("nlogn")) return "O(n log n)";
            if (clean.includes("n^2") || clean.includes("n2")) return "O(n²)";
            if (clean.includes("2^n") || clean.includes("2n")) return "O(2ⁿ)";
            if (clean.includes("n")) return "O(n)";
            return "O(n²)";
          };
          const currentClean = cleanComplexityStr(complexityResult.time_complexity);
          const bestClean = cleanComplexityStr(complexityResult.best_possible_time);
          return (
            <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-4 overflow-x-auto dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
              <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Visual Time Complexity</h4>
              <div className="relative flex items-center justify-between px-2 pt-6 pb-2 min-w-[340px]">
                <div className="absolute top-[2.1rem] left-8 right-8 h-1 bg-slate-250 dark:bg-zinc-800/60 z-0 rounded-full" />

                {complexities.map((comp, idx) => {
                  const isCurrent = comp === currentClean;
                  const isBest = comp === bestClean;
                  return (
                    <div key={idx} className="flex flex-col items-center relative z-10">
                      <div 
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black border transition-all duration-300 ${
                          isCurrent 
                            ? "bg-amber-500 border-amber-600 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-110" 
                            : isBest
                              ? "bg-emerald-500 border-emerald-600 text-black shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105"
                              : "bg-slate-100 border-slate-300 dark:bg-zinc-950 dark:border-zinc-800/80 text-slate-500 dark:text-zinc-400"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className={`text-[8px] font-bold mt-2 uppercase ${
                        isCurrent 
                          ? "text-amber-500" 
                          : isBest 
                            ? "text-emerald-500" 
                            : "text-slate-400 dark:text-zinc-500"
                      }`}>
                        {comp}
                      </span>
                      {isCurrent && (
                        <span className="absolute -top-4 text-[7px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 dark:bg-amber-950/20 dark:border-amber-800/30 px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap animate-none">
                          Current
                        </span>
                      )}
                      {isBest && !isCurrent && (
                        <span className="absolute -top-4 text-[7px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-800/30 px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap animate-none">
                          Target
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Complexity Breakdown */}
        <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-3 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Complexity Origin Breakdown</h4>
          <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed font-semibold">{complexityResult.analysis}</p>

          {complexityResult.complexity_breakdown && complexityResult.complexity_breakdown.length > 0 && (
            <div className="flex flex-col gap-3 mt-2 border-t border-slate-200 dark:border-zinc-800/40 pt-3">
              <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-black mb-1">Details by code segments</span>
              <div className="flex flex-col gap-2.5">
                {complexityResult.complexity_breakdown.map((item: any, i: number) => (
                  <div key={i} className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/50 p-3 rounded-xl flex flex-col gap-2">
                    {item.code_segment && (
                      <pre className="bg-slate-100 dark:bg-zinc-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/60 text-[9px] font-mono text-slate-800 dark:text-zinc-300 overflow-x-auto whitespace-pre select-text">
                        {item.code_segment}
                      </pre>
                    )}
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-655 dark:text-zinc-300 leading-relaxed pr-2">{item.explanation}</span>
                      <span className="text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded shrink-0">{item.complexity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Scalability analysis */}
        <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-3 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Scalability Estimations</h4>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-semibold mb-1 block">
            Expected growth metrics:
          </span>
          <div className="flex flex-col gap-1.5 border border-slate-200 dark:border-zinc-800/50 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-3 bg-slate-100 dark:bg-white/5 p-2 font-black uppercase text-[8px] text-slate-500 dark:text-zinc-400 tracking-wider">
              <span>Input Size</span>
              <span>Runtime</span>
              <span>Memory</span>
            </div>
            {complexityResult.scalability_analysis?.map((scale: any, i: number) => (
              <div key={i} className="grid grid-cols-3 p-2 border-t border-slate-200/50 dark:border-zinc-900/50 last:border-0 font-medium text-slate-700 dark:text-zinc-300">
                <span className="font-mono text-slate-900 dark:text-white font-bold">{scale.input_size.toLocaleString()}</span>
                <span>{scale.expected_runtime}</span>
                <span>{scale.expected_memory}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data Structure analysis */}
        <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-3 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Data Structure Evaluation</h4>
          <div className="flex flex-col gap-2.5">
            {complexityResult.data_structure_analysis?.evaluated?.map((ds: any, i: number) => {
              const statusColors = {
                Used: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                Recommended: "bg-amber-500/10 text-amber-500 border-amber-500/20",
                Inefficient: "bg-rose-500/10 text-rose-400 border-rose-500/20",
                "Not Needed": "bg-slate-500/10 text-slate-400 border-slate-500/20"
              };
              return (
                <div key={i} className="bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800/80 p-3 rounded-xl flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800 dark:text-white text-xs">{ds.name}</span>
                    <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${statusColors[ds.status as keyof typeof statusColors] || statusColors["Not Needed"]}`}>
                      {ds.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-semibold">{ds.feedback}</p>
                </div>
              );
            })}
          </div>
        </div>
                {/* Optimization Suggestions */}
        <div className="bg-gradient-to-br from-amber-50/60 to-amber-50/20 dark:from-amber-950/10 dark:to-amber-950/5 border border-amber-100/80 dark:border-amber-800/25 rounded-2xl p-4 flex flex-col gap-3">
          <h4 className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-500 animate-pulse" />
            <span>Optimization Opportunities</span>
          </h4>
          <div className="flex flex-col gap-3">
            {complexityResult.suggestions?.map((sug: any, i: number) => (
              <div key={i} className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/60 p-3.5 rounded-xl flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex flex-col gap-0.5 bg-rose-500/5 dark:bg-rose-955/15 border border-rose-500/10 dark:border-rose-900/30 rounded-lg p-2 text-center font-semibold">
                    <span className="text-[7px] text-rose-500 dark:text-rose-455 uppercase tracking-widest font-black block mb-0.5">Current: {sug.current_approach}</span>
                    <span className="font-mono font-black text-rose-500 dark:text-rose-455">{sug.current_complexity}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 bg-emerald-500/5 dark:bg-emerald-955/15 border border-emerald-500/10 dark:border-emerald-900/30 rounded-lg p-2 text-center font-semibold">
                    <span className="text-[7px] text-emerald-500 dark:text-emerald-455 uppercase tracking-widest font-black block mb-0.5">Suggested: {sug.suggested_approach}</span>
                    <span className="font-mono font-black text-emerald-500 dark:text-emerald-455">{sug.suggested_complexity}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-semibold mt-1">
                  {sug.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Interview Rating */}
        <div className="bg-gradient-to-br from-violet-50/60 to-violet-50/20 dark:from-violet-950/10 dark:to-violet-950/5 border border-violet-100/80 dark:border-violet-800/25 rounded-2xl p-4 flex flex-col gap-3">
          <h4 className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 tracking-wider flex items-center justify-between">
            <span>Technical Interview expectations</span>
            <span className={`text-[8px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${
              complexityResult.interview_analysis?.accepted_in_interview
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-800/35"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20 dark:bg-rose-955/20 dark:border-rose-800/35"
            }`}>
              {complexityResult.interview_analysis?.accepted_in_interview ? "Accepted" : "Rejected"}
            </span>
          </h4>

          <div className="flex items-center justify-between bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/60 p-2.5 rounded-xl text-xs font-semibold">
            <span className="text-slate-500 dark:text-zinc-400">Interview Score:</span>
            <span className="font-black text-violet-500 font-mono text-sm">{complexityResult.interview_analysis?.interview_rating} / 100</span>
          </div>

          <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed font-semibold mt-1">{complexityResult.interview_analysis?.feedback}</p>

          {complexityResult.interview_analysis?.follow_up_questions?.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-2 border-t border-slate-200 dark:border-zinc-800/40 pt-3">
              <span className="text-[9px] text-violet-600 dark:text-violet-400 uppercase tracking-widest font-black">Typical follow-up questions</span>
              <ul className="flex flex-col gap-2">
                {complexityResult.interview_analysis.follow_up_questions.map((fq: string, idx: number) => (
                  <li key={idx} className="text-xs text-slate-700 dark:text-zinc-300 font-medium flex items-start gap-1.5">
                    <span className="text-violet-500 mt-0.5">•</span>
                    <span>{fq}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Algorithm pattern insights */}
        <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-4 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Learning Insights</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/60 flex flex-col gap-1">
              <span className="text-[7px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider block animate-none">Pattern Detected</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono text-[10px]">
                {complexityResult.algorithm_pattern?.detected_pattern || "N/A"}
              </span>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950/40 p-3 rounded-xl border border-slate-100 dark:border-zinc-800/60 flex flex-col gap-1">
              <span className="text-[7px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider block animate-none">Pattern Missing</span>
              <span className="font-bold text-slate-800 dark:text-zinc-200 font-mono text-[10px]">
                {complexityResult.algorithm_pattern?.pattern_missing || "N/A"}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-705 dark:text-zinc-200 leading-relaxed font-semibold bg-slate-50 dark:bg-zinc-950/30 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-800/50">
            <span className="text-[8px] text-amber-500 uppercase font-black tracking-widest block mb-1">Recommended next steps</span>
            {complexityResult.algorithm_pattern?.recommended_next_topic || "Practice sliding windows / patterns."}
          </div>
        </div>      </div>
    );
  };

  const renderHistoryTabContent = () => {
    return (
      <div className="flex flex-col gap-6 select-none">
        {/* Past Code Reviews section */}
        <div className="flex flex-col gap-3">
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1.5">
            <Clock size={10} />
            <span>Code Review History ({reviewHistory.length})</span>
          </span>
          {reviewHistory.length === 0 ? (
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic px-2">No reviews recorded.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {reviewHistory.map((rev) => {
                const dateStr = new Date(rev.generatedAt).toLocaleDateString([], { month: "short", day: "numeric" });
                const timeStr = new Date(rev.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div
                    key={rev.id}
                    onClick={() => handleViewHistoryReview(rev)}
                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-white/[0.02] p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition shadow-sm dark:shadow-none"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black uppercase text-violet-650 dark:text-violet-400 bg-violet-550/10 px-1.5 py-0.5 rounded border border-violet-550/20">
                          {rev.reviewMode} Mode
                        </span>
                        <span className="text-[8px] font-black text-emerald-655 dark:text-emerald-400 bg-emerald-555/10 px-1.5 py-0.5 rounded border border-emerald-550/20">
                          Score: {rev.overallScore}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-400 dark:text-zinc-500">
                        {dateStr} at {timeStr}
                      </span>
                    </div>
                    <span className="text-[8px] text-amber-500 font-bold uppercase hover:underline">
                      Load →
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Past Complexity Analyses section */}
        <div className="flex flex-col gap-3 mt-2 border-t border-slate-200 dark:border-zinc-900/60 pt-4">
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1.5">
            <Clock size={10} />
            <span>Complexity Analysis History ({complexityHistory.length})</span>
          </span>
          {complexityHistory.length === 0 ? (
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic px-2">No complexity runs recorded.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {complexityHistory.map((comp) => {
                const dateStr = new Date(comp.generatedAt).toLocaleDateString([], { month: "short", day: "numeric" });
                const timeStr = new Date(comp.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                return (
                  <div
                    key={comp.id}
                    onClick={() => handleViewHistoryComplexity(comp)}
                    className="bg-white dark:bg-white/5 border border-slate-200 dark:border-zinc-800 hover:border-slate-350 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-white/[0.02] p-3.5 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition shadow-sm dark:shadow-none"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-amber-550 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {comp.timeComplexity} / {comp.spaceComplexity}
                        </span>
                        <span className="text-[8px] font-black text-emerald-655 dark:text-emerald-400 bg-emerald-555/10 px-1.5 py-0.5 rounded border border-emerald-550/20">
                          Efficiency: {comp.efficiencyScore}
                        </span>
                      </div>
                      <span className="text-[8px] text-slate-400 dark:text-zinc-500">
                        {dateStr} at {timeStr}
                      </span>
                    </div>
                    <span className="text-[8px] text-amber-500 font-bold uppercase hover:underline">
                      Load →
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReviewDrawer = () => {

    const reviewLoadingSteps = [
      "Analyzing Solution",
      "Evaluating Logic",
      "Checking Edge Cases",
      "Reviewing Complexity",
      "Generating Feedback",
      "Preparing Recommendations",
      "Review Complete"
    ];

    return (
      <AnimatePresence>
        {reviewDrawerOpen && (
          <>
            {/* Backdrop to close sidebar on click outside */}
            <div 
              className="fixed inset-0 z-40 bg-black/10 dark:bg-black/40 backdrop-blur-[1px] transition-opacity"
              onClick={() => setReviewDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[85vw] md:w-[45%] md:min-w-[420px] max-w-[650px] bg-slate-50 dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-50 backdrop-blur-md flex flex-col"
            >
              {/* Drawer Header */}
              <div className="h-14 border-b border-slate-200 dark:border-zinc-800 px-5 flex items-center justify-between bg-white dark:bg-black/40">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-500 animate-pulse" />
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider">AI Code Review Engine</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setReviewDrawerOpen(false)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-lg text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition text-[10px] font-bold"
                    title="Close Review Drawer"
                  >
                    <X size={12} />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Toggle Tabs */}
              <div className="h-10 border-b border-slate-200 dark:border-zinc-900 bg-slate-50/50 dark:bg-black/25 flex items-center px-5 gap-4 select-none">
                <button
                  onClick={() => setActiveReviewTab("active")}
                  className={`text-[10px] uppercase tracking-wider font-black border-b-2 py-2 transition-all ${
                    activeReviewTab === "active"
                      ? "border-violet-500 text-slate-900 dark:text-white"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  }`}
                >
                  Code Review
                </button>
                <button
                  onClick={() => {
                    setActiveReviewTab("complexity");
                    if (!complexityResult && complexityHistory.length > 0) {
                      setComplexityResult(complexityHistory[0].analysisJson);
                      setComplexityStepIndex(6);
                    }
                  }}
                  className={`text-[10px] uppercase tracking-wider font-black border-b-2 py-2 transition-all ${
                    activeReviewTab === "complexity"
                      ? "border-violet-500 text-slate-900 dark:text-white"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  }`}
                >
                  Complexity Analysis
                </button>
                <button
                  onClick={() => {
                    setActiveReviewTab("history");
                    fetchReviewHistory();
                    fetchComplexityHistory();
                  }}
                  className={`text-[10px] uppercase tracking-wider font-black border-b-2 py-2 transition-all ${
                    activeReviewTab === "history"
                      ? "border-violet-500 text-slate-900 dark:text-white"
                      : "border-transparent text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                  }`}
                >
                  History
                </button>
              </div>


              {/* Content Body */}
              {activeReviewTab === "active" && (
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                  
                  {/* AI Review Loader */}
                  {isReviewing && (
                    <div className="flex flex-col items-center justify-center py-20 gap-5">
                      <ExecutionProgressSteps
                        steps={reviewLoadingSteps.slice(0, 6)}
                        currentStep={reviewStepIndex}
                      />
                    </div>
                  )}

                  {/* No Review State */}
                  {!isReviewing && !reviewResult && (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-zinc-400 gap-3">
                      <Sparkles size={32} className="text-violet-400/30 animate-pulse" />
                      <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">No active review generated for this session</span>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-xs leading-relaxed">
                        Select a review focus mode below the editor, edit your solution, and click the Review Code button to launch structural analyses.
                      </p>
                    </div>
                  )}

                  {/* Review Complete State */}
                  {!isReviewing && reviewResult && (
                    <>
                      {/* Error Review prioritised section */}
                      {reviewResult.error_review && reviewResult.error_review.error_type !== "None" && (
                        <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 flex flex-col gap-2.5">
                          <h4 className="text-xs font-black uppercase text-rose-550 dark:text-rose-400 tracking-wider flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-rose-500 animate-pulse" />
                            <span>Execution Error review: {reviewResult.error_review.error_type}</span>
                          </h4>
                          <div className="bg-rose-50/50 dark:bg-black/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/20 font-mono text-[10px] text-rose-600 dark:text-rose-350 font-bold">
                            {reviewResult.error_review.message}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-300 font-semibold">
                            <span className="font-bold text-slate-800 dark:text-white block mb-0.5">Likely Cause:</span>
                            {reviewResult.error_review.cause}
                          </div>
                          <div className="text-xs text-slate-600 dark:text-zinc-300 font-semibold">
                            <span className="font-bold text-slate-800 dark:text-white block mb-0.5">Suggested Fix:</span>
                            <div className="bg-slate-100 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 font-mono text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 whitespace-pre-wrap">
                              {reviewResult.error_review.suggested_fix}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Executive Summary */}
                      <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-2 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
                        <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-widest">Executive Summary</h4>
                        <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed font-semibold">{reviewResult.summary}</p>
                      </div>

                      {/* Scorecard Circular and Subscore bars */}
                      <div className="flex items-center gap-6 bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
                        {/* Overall score circular ring */}
                        <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="40" cy="40" r="34" className="stroke-slate-200 dark:stroke-zinc-800/60" strokeWidth="6" fill="transparent" />
                            <motion.circle
                              cx="40"
                              cy="40"
                              r="34"
                              className="stroke-violet-500"
                              strokeWidth="6"
                              fill="transparent"
                              strokeDasharray="213.6"
                              style={{ filter: "drop-shadow(0px 0px 4px rgba(139, 92, 246, 0.45))" }}
                              initial={{ strokeDashoffset: 213.6 }}
                              animate={{ strokeDashoffset: 213.6 - (213.6 * (reviewResult.overall_score || 0)) / 100 }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-lg font-black text-slate-800 dark:text-zinc-100">{reviewResult.overall_score}</span>
                            <span className="text-[8px] text-slate-400 dark:text-zinc-500 uppercase font-bold">Overall</span>
                          </div>
                        </div>
                        
                        {/* Subscores details */}
                        <div className="flex-1 flex flex-col gap-2">
                          {[
                            { label: "Correctness", val: reviewResult.code_quality_score?.correctness ?? 75, color: "bg-emerald-500" },
                            { label: "Readability", val: reviewResult.code_quality_score?.readability ?? 75, color: "bg-cyan-500" },
                            { label: "Performance", val: reviewResult.code_quality_score?.complexity ?? 75, color: "bg-amber-500" },
                            { label: "Interview Readiness", val: reviewResult.interview_readiness?.score ?? 75, color: "bg-violet-500" },
                            { label: "Code Quality", val: reviewResult.code_quality_score?.score ?? 75, color: "bg-indigo-500" }
                          ].map((sub, idx) => (
                            <div key={idx} className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[9px]">
                                <span className="text-slate-500 dark:text-zinc-400 font-semibold">{sub.label}</span>
                                <span className="text-slate-800 dark:text-zinc-200 font-black">{sub.val}/100</span>
                              </div>
                              <div className="w-full h-1 bg-slate-200 dark:bg-zinc-800/80 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${sub.val}%` }}
                                  transition={{ duration: 1.2, ease: "easeOut" }}
                                  className={`h-full ${sub.color}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Complexity Analysis Deep Dive teaser */}
                      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-black uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                            <Sparkles size={12} className="text-amber-550 dark:text-amber-400 animate-pulse" />
                            <span>Algorithmic Complexity Auditing</span>
                          </h4>
                          <span className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                            Day 15 Engine
                          </span>
                        </div>
                        <p className="text-xs text-slate-650 dark:text-zinc-450 leading-relaxed font-semibold">
                          {complexityResult 
                            ? `Your solution has O(${complexityResult.time_complexity}) time complexity. Explore timeline scales and data structure checks.`
                            : "Analyze code execution growth runtime patterns, Big-O classes, data structure swaps, and interview thresholds."
                          }
                        </p>
                        <button
                          onClick={() => {
                            if (complexityResult) {
                              setActiveReviewTab("complexity");
                            } else {
                              handleRequestComplexityAnalysis();
                            }
                          }}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <Sparkles size={12} />
                          <span>{complexityResult ? "View Complexity Dashboard" : "Run Complexity Analysis"}</span>
                        </button>
                                   {/* Strengths List */}
                      <div className="bg-gradient-to-br from-emerald-50/60 to-emerald-50/20 dark:from-emerald-950/10 dark:to-emerald-950/5 border border-emerald-100/80 dark:border-emerald-800/25 rounded-2xl p-4 flex flex-col gap-2.5">
                        <h4 className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span>Key Strengths</span>
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {reviewResult.strengths?.map((str: string, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="text-xs text-slate-700 dark:text-zinc-200 flex items-start gap-2 leading-relaxed font-semibold"
                            >
                              <span className="text-emerald-500 shrink-0">✓</span>
                              <span>{str}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      {/* Weaknesses / Issues */}
                      <div className="bg-gradient-to-br from-rose-50/60 to-rose-50/20 dark:from-rose-950/10 dark:to-rose-950/5 border border-rose-100/80 dark:border-rose-800/25 rounded-2xl p-4 flex flex-col gap-2.5">
                        <h4 className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-widest flex items-center gap-1.5">
                          <AlertCircle size={12} className="text-rose-500" />
                          <span>Weaknesses & Issues</span>
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {reviewResult.issues?.map((iss: string, i: number) => (
                            <motion.li
                              key={i}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="text-xs text-slate-700 dark:text-zinc-200 flex items-start gap-2 leading-relaxed font-semibold"
                            >
                              <span className="text-rose-500 shrink-0">⚠️</span>
                              <span>{iss}</span>
                            </motion.li>
                          ))}
                          {(!reviewResult.issues || reviewResult.issues.length === 0) && (
                            <li className="text-xs text-slate-400 dark:text-zinc-400 italic">No significant weaknesses or bugs detected!</li>
                          )}
                        </ul>
                      </div>

                      {/* Optimizations Section */}
                      <div className="bg-gradient-to-br from-amber-50/60 to-amber-50/20 dark:from-amber-950/10 dark:to-amber-950/5 border border-amber-100/80 dark:border-amber-800/25 rounded-2xl p-4 flex flex-col gap-3">
                        <h4 className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-widest flex items-center gap-1.5">
                          <Sparkles size={12} className="text-amber-500 animate-pulse" />
                          <span>Optimization Opportunities</span>
                        </h4>
                        <div className="flex flex-col gap-2.5">
                          {reviewResult.optimizations?.map((opt: string, i: number) => (
                            <div key={i} className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/60 p-2.5 rounded-xl text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-semibold">
                              {opt}
                            </div>
                          ))}
                          {(!reviewResult.optimizations || reviewResult.optimizations.length === 0) && (
                            <span className="text-xs text-slate-400 dark:text-zinc-400 italic">No optimizations found. Code looks highly performant!</span>
                          )}
                        </div>
                      </div>

                      {/* Edge Cases Simulation */}
                      <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-3 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-300 tracking-widest">Edge Case Simulation</h4>
                        <div className="flex flex-col gap-2">
                          {reviewResult.edge_cases?.map((ec: string, i: number) => (
                            <div key={i} className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/40 pb-1.5 last:border-0 last:pb-0 text-xs">
                              <span className="text-slate-600 dark:text-zinc-200 font-bold">{ec}</span>
                              <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold rounded uppercase tracking-wider dark:bg-emerald-950/20 dark:border-emerald-800/30">
                                Verified
                              </span>
                            </div>
                          ))}
                          {(!reviewResult.edge_cases || reviewResult.edge_cases.length === 0) && (
                            <span className="text-xs text-slate-400 dark:text-zinc-400 italic">No edge cases analyzed.</span>
                          )}
                        </div>
                      </div>

                      {/* Interview Readiness */}
                      <div className="bg-gradient-to-br from-violet-50/60 to-violet-50/20 dark:from-violet-950/10 dark:to-violet-950/5 border border-violet-100/80 dark:border-violet-800/25 rounded-2xl p-4 flex flex-col gap-3">
                        <h4 className="text-[10px] font-black uppercase text-violet-650 dark:text-violet-400 tracking-widest flex items-center justify-between">
                          <span>Technical Interview Readiness</span>
                          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                            reviewResult.interview_readiness?.interview_ready 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 dark:bg-emerald-950/20 dark:border-emerald-800/35" 
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20 dark:bg-rose-955/20 dark:border-rose-800/35"
                          }`}>
                            {reviewResult.interview_readiness?.interview_ready ? "Passes Interview" : "Fail / Needs Work"}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-700 dark:text-zinc-200 leading-relaxed font-semibold">{reviewResult.interview_feedback}</p>
                        
                        {reviewResult.interview_readiness?.follow_ups?.length > 0 && (
                          <div className="flex flex-col gap-1.5 mt-1 border-t border-slate-200 dark:border-zinc-800/40 pt-2.5">
                            <span className="text-[9px] text-violet-650 dark:text-violet-400 uppercase font-black tracking-widest">Typical Interviewer Follow-Ups</span>
                            <ul className="flex flex-col gap-2">
                              {reviewResult.interview_readiness.follow_ups.map((fq: string, i: number) => (
                                <li key={i} className="text-xs text-slate-700 dark:text-zinc-300 font-medium flex items-start gap-1.5">
                                  <span className="text-violet-500 mt-0.5">•</span>
                                  <span>{fq}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>                     </div>

                      {/* Line Level Feedback Inspector */}
                      {reviewResult.line_level_feedback && reviewResult.line_level_feedback.length > 0 && (
                        <div className="flex flex-col gap-3.5">
                          <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400 tracking-widest">Line-Level Code Annotations</h4>
                          <div className="flex flex-col gap-3">
                            {reviewResult.line_level_feedback.map((lf: any, idx: number) => (
                              <div key={idx} className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-xl p-3 flex flex-col gap-2 dark:shadow-md">
                                <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-zinc-400 uppercase tracking-widest font-black">
                                  <span>Line {lf.line_number}</span>
                                </div>
                                <div className="bg-slate-100 dark:bg-zinc-955/80 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/60 font-mono text-[10px] text-slate-800 dark:text-zinc-300 select-text whitespace-pre overflow-x-auto">
                                  {lf.code_line}
                                </div>
                                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed font-bold">
                                  {lf.feedback}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Learning Guidance */}
                      <div className="bg-white dark:bg-zinc-900/65 border border-slate-200/80 dark:border-zinc-800/85 rounded-2xl p-4 flex flex-col gap-4 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:backdrop-blur-md">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-300 tracking-widest">AI Coach Mode Insights</h4>
                        <div className="flex flex-col gap-3">
                          <div className="text-xs text-slate-700 dark:text-zinc-350 leading-relaxed bg-slate-50 dark:bg-black/25 p-3 rounded-xl border border-slate-100 dark:border-zinc-900 font-semibold">
                            {reviewResult.learning_insights?.ai_coach_guidance}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-900">
                              <span className="text-[8px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider block mb-1.5">Algorithms Used</span>
                              <div className="flex flex-wrap gap-1">
                                {reviewResult.learning_insights?.concepts_used?.map((c: string, idx: number) => (
                                  <span key={idx} className="text-[9px] bg-white dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-mono">{c}</span>
                                ))}
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-black/20 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-900">
                              <span className="text-[8px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider block mb-1.5">Unexplored Scaffolds</span>
                              <div className="flex flex-wrap gap-1">
                                {reviewResult.learning_insights?.concepts_missing?.map((c: string, idx: number) => (
                                  <span key={idx} className="text-[9px] bg-white dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800 text-slate-650 dark:text-zinc-300 font-mono">{c}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recommendations Engine */}
                      <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                        <h4 className="text-[10px] font-black uppercase text-slate-555 dark:text-zinc-300 tracking-widest">Targeted Next Problem Sets</h4>
                        <div className="flex flex-col gap-3 text-xs">
                          {reviewResult.recommendations?.harder_problems?.length > 0 && (
                            <div>
                              <span className="text-[9px] text-orange-650 dark:text-orange-400 uppercase font-black tracking-widest block mb-1.5">Harder Progression Challenges:</span>
                              <div className="flex flex-col gap-1.5">
                                {reviewResult.recommendations.harder_problems.map((p: string, idx: number) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-black/25 px-3 py-2 rounded-lg border border-slate-100 dark:border-zinc-900 flex items-center justify-between text-slate-700 dark:text-zinc-300">
                                    <span className="font-semibold">{p}</span>
                                    <span className="text-[9px] text-amber-505 font-black">Practice →</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {reviewResult.recommendations?.interview_variants?.length > 0 && (
                            <div>
                              <span className="text-[9px] text-violet-655 dark:text-violet-400 uppercase font-black tracking-widest block mb-1.5">Alternative Interview Variants:</span>
                              <div className="flex flex-col gap-1.5">
                                {reviewResult.recommendations.interview_variants.map((p: string, idx: number) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-black/25 px-3 py-2 rounded-lg border border-slate-100 dark:border-zinc-900 flex items-center justify-between text-slate-700 dark:text-zinc-300">
                                    <span className="font-semibold">{p}</span>
                                    <span className="text-[9px] text-amber-505 font-black">Practice →</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </>
                  )}

                </div>
              )}
              
              {activeReviewTab === "complexity" && (
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                  {renderComplexityTabContent()}
                </div>
              )}

              {activeReviewTab === "history" && (
                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
                  {renderHistoryTabContent()}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  };

  // Render structured explanation (Description, Input Spec, Output Spec, Note)
  const cleanMath = (txt: string) => {
    if (!txt) return "";
    return txt;
  };

  const renderStructuredExplanation = (text: string) => {
    if (!text) return null;
    return (
      <div className="text-xs leading-relaxed text-[var(--text-primary)] bg-black/20 p-4 rounded-xl border border-[var(--border-color)]">
        {renderMarkdown(text, theme === "dark")}
      </div>
    );
  };

  // Parse examples if present
  const renderExamples = () => {
    const rawExamples = aiAnalysis?.examples || scrapedProblem?.examples || problem?.examples;
    if (!rawExamples) return null;
    let parsed: any[] = [];
    try {
      parsed = typeof rawExamples === 'string' ? JSON.parse(rawExamples) : rawExamples;
    } catch {
      return <pre className="text-xs bg-black/40 p-3 rounded-lg border border-[var(--border-color)] overflow-x-auto text-[var(--text-secondary)] whitespace-pre">{JSON.stringify(rawExamples)}</pre>;
    }
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return (
      <div className="flex flex-col gap-4 mt-2">
        {parsed.map((ex: any, idx: number) => (
          <div key={idx} className="bg-black/40 p-4 rounded-xl border border-[var(--border-color)] font-mono text-xs">
            <p className="font-bold text-amber-500 mb-2 font-sans">Example {idx + 1}:</p>
            <div className="flex flex-col gap-2 text-[var(--text-primary)]">
              <div className="flex flex-col">
                <span className="text-[var(--text-secondary)] font-sans font-semibold mb-0.5">Input:</span>
                <pre className="whitespace-pre bg-black/30 p-2 rounded-lg border border-[var(--border-color)] overflow-x-auto text-[var(--text-primary)] leading-relaxed">{ex.input}</pre>
              </div>
              <div className="flex flex-col">
                <span className="text-[var(--text-secondary)] font-sans font-semibold mb-0.5">Output:</span>
                <pre className="whitespace-pre bg-black/30 p-2 rounded-lg border border-[var(--border-color)] overflow-x-auto text-[var(--text-primary)] leading-relaxed">{ex.output}</pre>
              </div>
              {ex.explanation && (
                <div className="mt-1 text-[var(--text-secondary)] italic font-sans">
                  <span className="text-amber-500/80 font-semibold not-italic">Explanation: </span>
                  {renderMarkdown(ex.explanation, theme === "dark")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Filter notes
  const filteredNotes = notes.filter(n => 
    n.noteContent.toLowerCase().includes(searchNote.toLowerCase())
  );

  // Formatted TimeSpent
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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



  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Active view layout shell
  return (
    <div className="relative overflow-hidden font-sans w-screen h-screen" style={{ background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      <FloatingOrbs />
      
      {/* Fullscreen Three panel workspace container */}
      <main className="relative z-10 flex flex-col font-sans w-full h-full overflow-hidden" style={{ padding: 0 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[70vh]">
            <div className="relative w-full max-w-md p-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col items-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-6"
              >
                <Code2 size={32} className="text-black" />
              </motion.div>
              
              <h2 className="text-xl font-black mb-1 bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-primary)]/70 bg-clip-text text-transparent">
                AI Problem Workspace
              </h2>
              <p className="text-[10px] text-amber-500 uppercase tracking-widest font-black mb-6">
                Building Developer Sandbox
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
                          <CheckCircle2 size={14} className="text-emerald-500 fill-emerald-500/10" />
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
            {/* Workspace Toolbar (Header) */}
        <div className="h-12 border-b border-[var(--border-color)] bg-black/35 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if (window.history.length > 1 && window.opener) {
                  window.close();
                } else {
                  router.push("/dashboard/coding");
                }
              }}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span>Back</span>
            </button>
            <div className="h-4 w-px bg-[var(--border-color)]" />
            <h1 className="text-sm font-bold text-[var(--text-primary)] truncate max-w-xs md:max-w-md flex items-center gap-2">
              <span>{problem?.title}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                problem?.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                problem?.difficulty === "Medium" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                "bg-rose-500/10 text-rose-500 border border-rose-500/20"
              }`}>
                {problem?.difficulty}
              </span>
              {problem?.rating && (
                <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-semibold">
                  ★ {problem.rating}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Active timer badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-[var(--border-color)] rounded-full text-xs font-mono text-[var(--text-secondary)]">
              <Clock size={12} className="text-amber-500" />
              <span>{formatTime(timeSpentSeconds)}</span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition flex items-center gap-1 cursor-pointer"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>

            <button
              onClick={handleBookmarkToggle}
              className={`p-1.5 rounded-lg border transition ${
                progress.bookmarked 
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500" 
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
              }`}
              title="Bookmark Question"
            >
              <BookMarked size={14} />
            </button>

            <button
              onClick={handleEndSession}
              className="text-xs bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black px-4 py-1.5 rounded-lg shadow-lg shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer"
              title="End Session & Mark Solved"
            >
              <CheckCircle2 size={14} className="fill-white/10" />
              <span>End</span>
            </button>

            <button
              onClick={() => setShowRightPanel(prev => !prev)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                showRightPanel
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold"
                  : "bg-white/5 border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
              }`}
              title="Toggle AI DSA Coach Panel"
            >
              <Sparkles size={13} className={showRightPanel ? "text-amber-400 animate-pulse" : "text-[var(--text-secondary)]"} />
              <span>AI Coach</span>
            </button>
          </div>
        </div>

        {/* Dynamic Panels */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
          
          {/* Left panel (Problem Content, Notes, Discussion) */}
          <div 
            style={{ width: `${leftWidth}%` }} 
            className="flex flex-col border-r border-[var(--border-color)] bg-black/15 backdrop-blur-sm overflow-hidden"
          >
            {/* Tab header */}
            <div className="h-10 border-b border-[var(--border-color)] flex items-center px-4 bg-black/25">
              {[
                { id: "statement", label: "Problem", icon: BookOpen },
                { id: "notes", label: "My Notes", icon: StickyNote },
                { id: "discussion", label: "Discussion", icon: MessageSquare }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTabLeft === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabLeft(tab.id as any)}
                    className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg transition font-semibold mr-1.5 ${
                      active 
                        ? "bg-white/5 text-[var(--text-primary)] border border-white/10" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Icon size={12} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth select-text">
              
              {/* Tab 1: Statement */}
              {activeTabLeft === "statement" && (
                <div className="flex flex-col gap-6">
                  {/* Metadata tags */}
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[10px] bg-white/5 border border-white/10 text-[var(--text-secondary)] px-2.5 py-1 rounded-full font-semibold capitalize">
                      Topic: {problem?.topic}
                    </span>
                    <span className="text-[10px] bg-white/5 border border-white/10 text-[var(--text-secondary)] px-2.5 py-1 rounded-full font-semibold">
                      Source: {problem?.source}
                    </span>
                    {problem?.placementImportance && (
                      <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2.5 py-1 rounded-full font-black">
                        💼 Placements Key
                      </span>
                    )}
                    {problem?.interviewImportance && (
                      <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2.5 py-1 rounded-full font-black">
                        🎙 Interview Choice
                      </span>
                    )}
                  </div>

                  {/* Problem Description */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-1">Description</h3>
                    {scrapedProblem?.description ? (
                      renderStructuredExplanation(scrapedProblem.description)
                    ) : aiAnalysis?.problem_explanation ? (
                      renderStructuredExplanation(aiAnalysis.problem_explanation)
                    ) : problem?.description ? (
                      renderStructuredExplanation(problem.description)
                    ) : (
                      <div className="text-xs text-[var(--text-muted)] animate-pulse bg-black/20 p-4 rounded-xl border border-[var(--border-color)]">
                        Loading exact Codeforces problem statement...
                      </div>
                    )}
                    
                    {scrapedProblem?.inputSpecification && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Input</h4>
                        <div className="text-xs leading-relaxed text-[var(--text-primary)] bg-black/20 p-4 rounded-xl border border-[var(--border-color)]">
                          {renderMarkdown(scrapedProblem.inputSpecification, theme === "dark")}
                        </div>
                      </div>
                    )}

                    {scrapedProblem?.outputSpecification && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">Output</h4>
                        <div className="text-xs leading-relaxed text-[var(--text-primary)] bg-black/20 p-4 rounded-xl border border-[var(--border-color)]">
                          {renderMarkdown(scrapedProblem.outputSpecification, theme === "dark")}
                        </div>
                      </div>
                    )}

                    {scrapedProblem?.note && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Note</h4>
                        <div className="text-xs leading-relaxed text-[var(--text-primary)] bg-purple-500/5 p-4 rounded-xl border border-purple-500/20">
                          {renderMarkdown(scrapedProblem.note, theme === "dark")}
                        </div>
                      </div>
                    )}
                    
                    {problem?.problemUrl && (
                      <div className="pt-2 text-[11px] text-[var(--text-secondary)]">
                        <span>Original Platform: </span>
                        <a href={problem.problemUrl} target="_blank" rel="noreferrer" className="text-amber-400 font-semibold underline hover:text-amber-300">
                          Codeforces Problem {problem.externalId}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Constraints */}
                  <div className="flex flex-col gap-2 mt-2">
                    <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-amber-500" />
                      <span>Constraints</span>
                    </h3>
                    <div className="bg-black/30 p-3 rounded-lg border border-[var(--border-color)] text-xs font-mono text-[var(--text-secondary)]">
                      {(scrapedProblem?.timeLimit || scrapedProblem?.memoryLimit) ? (
                        <div className="flex flex-col gap-1.5">
                          {scrapedProblem.timeLimit && (
                            <div><span className="text-amber-500 font-semibold">Time Limit:</span> {scrapedProblem.timeLimit}</div>
                          )}
                          {scrapedProblem.memoryLimit && (
                            <div><span className="text-amber-500 font-semibold">Memory Limit:</span> {scrapedProblem.memoryLimit}</div>
                          )}
                          {scrapedProblem.constraints && (
                            <div className="mt-2 whitespace-pre-line text-[var(--text-primary)]">{renderMarkdown(scrapedProblem.constraints, theme === "dark")}</div>
                          )}
                        </div>
                      ) : (
                        "Standard execution constraints apply."
                      )}
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-widest">Examples</h3>
                    {renderExamples() || <p className="text-xs text-[var(--text-muted)] italic">No examples provided. Use AI Guidance to explain or discuss edge cases.</p>}
                  </div>
                </div>
              )}

              {/* Tab 2: Notes */}
              {activeTabLeft === "notes" && (
                <div className="flex flex-col gap-6">
                  {/* Note Creator */}
                  <div className="bg-white/5 border border-[var(--border-color)] p-4 rounded-2xl flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center justify-between">
                      <span>{editingNoteId ? "Edit Note" : "Take New Note"}</span>
                      {editingNoteId && (
                        <button 
                          onClick={() => { setNoteInput(""); setEditingNoteId(null); }}
                          className="text-[10px] text-amber-500 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </h3>
                    <textarea
                      placeholder="Write observations, optimal ideas, or mistakes (Markdown supported)..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      rows={4}
                      className="w-full bg-black/40 border border-[var(--border-color)] rounded-xl p-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500 transition"
                    />
                    <button
                      onClick={handleSaveNote}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-black text-xs font-black rounded-xl shadow-lg transition"
                    >
                      {editingNoteId ? "Update Note" : "Save Personal Note"}
                    </button>
                  </div>

                  {/* Note Search / List */}
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                      <input
                        placeholder="Search notes..."
                        value={searchNote}
                        onChange={(e) => setSearchNote(e.target.value)}
                        className="w-full bg-white/5 border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-white/20 transition"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      {filteredNotes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                          <StickyNote size={24} className="text-[var(--text-secondary)]/30" />
                          <p className="text-xs font-bold text-[var(--text-primary)]">
                            {searchNote ? "No notes matching query" : "No notes yet"}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)]">
                            {searchNote ? "Try a different search term" : "Save personal notes about this problem above"}
                          </p>
                        </div>
                      ) : (
                        filteredNotes.map((note) => (
                          <div 
                            key={note.id} 
                            className={`p-4 border rounded-xl bg-black/25 flex flex-col gap-3 transition ${
                              note.pinned ? "border-amber-500/30 bg-amber-500/[0.02]" : "border-[var(--border-color)] hover:border-white/10"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                              <span>Saved {new Date(note.updatedAt).toLocaleDateString()}</span>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => handleTogglePinNote(note)}
                                  className={`hover:text-[var(--text-primary)] ${note.pinned ? "text-amber-500" : ""}`}
                                >
                                  {note.pinned ? <Pin size={12} /> : <PinOff size={12} />}
                                </button>
                                <button 
                                  onClick={() => { setEditingNoteId(note.id); setNoteInput(note.noteContent); }}
                                  className="hover:text-[var(--text-primary)]"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="hover:text-rose-500"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                              {note.noteContent}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Discussion */}
              {activeTabLeft === "discussion" && (
                <div className="flex flex-col gap-6">
                  {/* Discussion comment form */}
                  <div className="flex gap-2">
                    <input
                      placeholder="Ask a question or leave a note..."
                      value={discussionInput}
                      onChange={(e) => setDiscussionInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePostDiscussion()}
                      className="flex-1 bg-white/5 border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-white/20 transition"
                    />
                    <button
                      onClick={handlePostDiscussion}
                      className="p-2.5 bg-white/5 border border-[var(--border-color)] hover:bg-white/10 text-[var(--text-primary)] rounded-xl transition"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Comment List */}
                  <div className="flex flex-col gap-3">
                    {discussions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <MessageSquare size={24} className="text-[var(--text-secondary)]/30" />
                        <p className="text-xs font-bold text-[var(--text-primary)]">No discussions yet</p>
                        <p className="text-[10px] text-[var(--text-secondary)]">Be the first to start the conversation!</p>
                      </div>
                    ) : (
                      discussions.map((disc) => (
                        <div key={disc.id} className="p-3 bg-white/5 border border-[var(--border-color)] rounded-xl flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xs font-black text-black shrink-0">
                            {user?.name?.charAt(0) || "S"}
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-[var(--text-primary)]">Student ({user?.name || "Anon"})</span>
                              <span className="text-[var(--text-muted)]">{new Date(disc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                              {disc.message}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Left panel resize handler */}
          <div 
            onMouseDown={startResizeLeft}
            className="w-1 hover:w-1.5 bg-[var(--border-color)] hover:bg-amber-500/50 cursor-col-resize transition-all z-10 shrink-0"
          />

          {/* Middle panel (Code Editor + Terminal) */}
          <div data-middle-panel className="flex-1 flex flex-col overflow-hidden bg-black/5">
            {/* Editor config toolbar */}
            <div className="h-10 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-black/25">
              <div className="flex items-center gap-3">
                {/* Language Select */}
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    setCode(DEFAULT_CODE[e.target.value as keyof typeof DEFAULT_CODE] || "");
                  }}
                  style={{ colorScheme: "dark" }}
                  className="bg-[#09090b] dark:bg-zinc-950 text-xs text-white border border-[var(--border-color)] rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500/50 transition cursor-pointer font-bold shadow-sm [color-scheme:dark] [&>option]:bg-[#09090b] [&>option]:text-white"
                >
                  <option value="python" className="bg-[#09090b] text-white font-semibold">Python 3</option>
                  <option value="cpp" className="bg-[#09090b] text-white font-semibold">C++ (GCC 17)</option>
                  <option value="java" className="bg-[#09090b] text-white font-semibold">Java (JDK 21)</option>
                  <option value="javascript" className="bg-[#09090b] text-white font-semibold">JavaScript (Node.js)</option>
                </select>

                <div className="h-4 w-px bg-[var(--border-color)]" />

                {/* Minimap toggle */}
                <button
                  onClick={() => setMinimap(prev => !prev)}
                  className={`p-1.5 rounded-lg border transition ${minimap ? "bg-white/10 border-white/20 text-white" : "border-transparent text-[var(--text-secondary)] hover:text-white"}`}
                  title="Toggle Minimap"
                >
                  <Maximize2 size={12} />
                </button>

                {/* Word wrap toggle */}
                <button
                  onClick={() => setWordWrap(prev => !prev)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition font-semibold ${wordWrap ? "bg-white/10 border-white/20 text-white" : "border-transparent text-[var(--text-secondary)] hover:text-white"}`}
                >
                  Word Wrap
                </button>

                {/* Font size control */}
                <div className="flex items-center gap-1 border border-[var(--border-color)] bg-white/5 rounded-lg px-2 py-0.5 text-xs font-mono text-[var(--text-secondary)]">
                  <button onClick={() => setFontSize(prev => Math.max(10, prev - 1))} className="hover:text-white px-1">-</button>
                  <span>{fontSize}px</span>
                  <button onClick={() => setFontSize(prev => Math.min(24, prev + 1))} className="hover:text-white px-1">+</button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-emerald-500 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-saved</span>
                </span>
              </div>
            </div>

            {/* Monaco Editor Container */}
            <div className="flex-1 overflow-hidden relative font-mono">
              <Editor
                height="100%"
                language={language}
                theme={editorTheme}
                value={code}
                onChange={(val) => setCode(val || "")}
                options={{
                  fontSize,
                  minimap: { enabled: minimap },
                  wordWrap: wordWrap ? "on" : "off",
                  lineNumbers: "on",
                  scrollbar: {
                    vertical: "auto",
                    horizontal: "auto"
                  },
                  automaticLayout: true,
                  padding: { top: 16 }
                }}
                loading={
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--bg-dark)] z-10 text-[var(--text-secondary)] text-xs">
                    <RefreshCw size={24} className="animate-spin text-amber-500" />
                    <span>Loading Monaco Editor sandbox...</span>
                  </div>
                }
              />
            </div>

            {/* Terminal panel (resizable, toggleable) */}
            {showTerminal && (
              <>
                <div
                  onMouseDown={startResizeTerminal}
                  className="h-1 hover:h-1.5 bg-[var(--border-color)] hover:bg-amber-500/50 cursor-row-resize transition-all z-10 shrink-0"
                />
                <div style={{ height: `${terminalHeight}%` }} className="flex flex-col border-t border-[var(--border-color)] bg-black/30 shrink-0 overflow-hidden">
                  {/* Terminal header */}
                  <div className="h-8 border-b border-[var(--border-color)] flex items-center justify-between px-3 bg-black/30 shrink-0 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 shrink overflow-x-auto scrollbar-none">
                      <Terminal size={12} className="text-amber-500 shrink-0" />
                      {(["input", "output", "testcases", "history"] as const).map(tab => (
                        <button
                          key={tab}
                          onClick={() => setOutputTab(tab)}
                          className={`text-[10px] px-2 py-0.5 rounded transition font-semibold whitespace-nowrap shrink-0 ${
                            outputTab === tab
                              ? "bg-white/10 text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {tab === "input" 
                            ? "Input" 
                            : tab === "output" 
                              ? "Output" 
                              : tab === "testcases" 
                                ? `Samples${testResults.length > 0 ? ` (${testResults.filter((t: any) => t.passed).length}/${testResults.length})` : ""}` 
                                : "Run History"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {/* Run Code Section helpers */}
                      <button
                        onClick={() => {
                          setCode(DEFAULT_CODE[language as keyof typeof DEFAULT_CODE] || "");
                          toast.info("Code reset to template.");
                        }}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition flex items-center shrink-0"
                        title="Reset Code template"
                      >
                        <RotateCcw size={10} />
                      </button>
                      <button
                        onClick={() => {
                          setOutput("");
                          setRunDetails(null);
                          toast.info("Output console cleared.");
                        }}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition flex items-center shrink-0"
                        title="Clear Output"
                      >
                        <Trash2 size={10} />
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(output || "");
                          toast.success("Output copied to clipboard.");
                        }}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition flex items-center mr-1 shrink-0"
                        title="Copy Output"
                      >
                        <Copy size={10} />
                      </button>

                      <button
                        onClick={handleRun}
                        disabled={isRunning || isSubmitting}
                        className="flex items-center gap-1 text-[9px] sm:text-[10px] px-2 sm:px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-[var(--text-muted)] text-black font-black rounded-lg transition animate-none shrink-0 whitespace-nowrap"
                      >
                        {isRunning ? <RefreshCw size={10} className="animate-spin" /> : <Play size={10} />}
                        <span>{isRunning ? "Running..." : "Run"}</span>
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={isRunning || isSubmitting}
                        className="flex items-center gap-1 text-[9px] sm:text-[10px] px-2 sm:px-3 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-white/10 disabled:text-[var(--text-muted)] text-black font-black rounded-lg transition shrink-0 whitespace-nowrap"
                      >
                        {isSubmitting ? <RefreshCw size={10} className="animate-spin" /> : <Send size={10} />}
                        <span>{isSubmitting ? "Judging..." : "Submit"}</span>
                      </button>

                      <button
                        onClick={() => setShowTerminal(false)}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 shrink-0"
                      >
                        <Minimize2 size={10} />
                      </button>
                    </div>
                  </div>
                  {/* Terminal content */}
                  <div className="flex-1 overflow-auto p-3 font-mono text-xs">
                    {outputTab === "input" && (
                      <textarea
                        value={stdin}
                        onChange={(e) => handleStdinChange(e.target.value)}
                        placeholder="Enter custom input (stdin)..."
                        className="w-full h-full bg-transparent text-emerald-400 placeholder-[var(--text-muted)] resize-none focus:outline-none"
                      />
                    )}
                    {outputTab === "output" && renderOutputConsole()}
                    {outputTab === "testcases" && (
                      <div className="flex flex-col gap-2">
                        {isSubmitting ? (
                          <span className="flex items-center gap-2 text-amber-500">
                            <RefreshCw size={12} className="animate-spin" />
                            Running against test cases...
                          </span>
                        ) : testResults.length === 0 ? (
                          <span className="text-[var(--text-muted)]">Click "Submit" to run against all test cases.</span>
                        ) : (
                          testResults.map((tr: any, i: number) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05, duration: 0.3 }}
                              className={`p-2.5 rounded-lg border text-[10px] font-mono transition-all duration-200 ${
                              tr.passed
                                ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                                : "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
                            }`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                {tr.passed
                                  ? <CheckCircle2 size={12} className="text-emerald-500" />
                                  : <AlertCircle size={12} className="text-rose-500" />
                                }
                                <span className={`font-bold ${tr.passed ? "text-emerald-500" : "text-rose-400"}`}>
                                  Test Case {tr.testCase} {tr.passed ? "Passed" : "Failed"}
                                </span>
                              </div>
                              {!tr.passed && (
                                <div className="flex flex-col gap-1 text-[var(--text-secondary)]">
                                  <div><span className="text-[var(--text-muted)]">Input:</span> {tr.input}</div>
                                  <div><span className="text-[var(--text-muted)]">Expected:</span> {tr.expected}</div>
                                  <div><span className="text-rose-400">Got:</span> {tr.actual}</div>
                                </div>
                              )}
                            </motion.div>
                          ))
                        )}
                      </div>
                    )}
                    {outputTab === "history" && renderRunHistory()}
                  </div>
                </div>
              </>
            )}

            {/* Run button bar when terminal is hidden */}
            {!showTerminal && (
              <div className="h-10 border-t border-[var(--border-color)] bg-black/25 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 min-w-0">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] min-w-0 shrink">
                  <Terminal size={14} className="text-amber-500 shrink-0" />
                  <span className="truncate whitespace-nowrap">Piston Code Engine</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setCode(DEFAULT_CODE[language as keyof typeof DEFAULT_CODE] || "");
                      toast.info("Code reset to template.");
                    }}
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition shrink-0"
                    title="Reset Code template"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    onClick={() => {
                      setOutput("");
                      setRunDetails(null);
                      toast.info("Output console cleared.");
                    }}
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition shrink-0"
                    title="Clear Output"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(output || "");
                      toast.success("Output copied to clipboard.");
                    }}
                    className="p-1.5 rounded text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition mr-1 sm:mr-2 shrink-0"
                    title="Copy Output"
                  >
                    <Copy size={12} />
                  </button>

                  <button
                    onClick={handleRun}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1 text-[10px] sm:text-xs bg-emerald-500 hover:bg-emerald-600 disabled:bg-white/10 disabled:text-[var(--text-muted)] text-black font-bold px-2.5 sm:px-4 py-1.5 rounded-lg transition shrink-0 whitespace-nowrap"
                  >
                    {isRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                    <span>{isRunning ? "Running..." : "Run"}</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isRunning || isSubmitting}
                    className="flex items-center gap-1 text-[10px] sm:text-xs bg-amber-500 hover:bg-amber-600 disabled:bg-white/10 disabled:text-[var(--text-muted)] text-black font-bold px-2.5 sm:px-4 py-1.5 rounded-lg transition shrink-0 whitespace-nowrap"
                  >
                    {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    <span>{isSubmitting ? "Judging..." : "Submit"}</span>
                  </button>

                </div>
              </div>
            )}
          </div>

          {/* Right panel (AI assistant - Collapsible) */}
          {showRightPanel && (
            <>
              <div 
                onMouseDown={startResizeRight}
                className="w-1 hover:w-1.5 bg-[var(--border-color)] hover:bg-amber-500/50 cursor-col-resize transition-all z-10 shrink-0"
              />

              <div 
                style={{ width: `${rightWidth}%` }} 
                className="flex flex-col border-l border-[var(--border-color)] bg-black/15 backdrop-blur-sm overflow-hidden"
              >
                {/* AI Assistant Header */}
                <div className="h-10 border-b border-[var(--border-color)] flex items-center justify-between px-4 bg-black/25">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <Sparkles size={14} className="text-amber-500 animate-pulse" />
                    <span>AI DSA Coach</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PremiumBadge variant="amber">Coaching Mode</PremiumBadge>
                    <button
                      onClick={() => setShowRightPanel(false)}
                      className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition cursor-pointer"
                      title="Collapse AI Coach Panel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

            {/* AI assistant messages viewport */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col gap-1.5 max-w-[85%] text-xs ${
                      msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black">
                      {msg.role === 'user' ? 'You' : 'Coach'}
                    </div>
                    <div 
                      className={`p-3.5 rounded-2xl leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-amber-500 text-black font-semibold rounded-tr-none whitespace-pre-line' 
                          : 'bg-white/5 border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-none font-medium'
                      }`}
                    >
                      {msg.role === 'user' ? msg.content : renderMarkdown(msg.content, theme === "dark")}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {aiGenerating && (
                <div className="self-start flex flex-col gap-1.5 max-w-[80%] text-xs">
                  <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-black">Coach</div>
                  <div className="p-3.5 bg-white/5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-2xl rounded-tl-none flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span>Typing analysis...</span>
                  </div>
                </div>
              )}
            </div>

            {/* AI Action Widgets Panel */}
            <div className="border-t border-[var(--border-color)] bg-black/25 p-3 flex flex-col gap-3 z-10 shrink-0">
              
              {/* Progressive Hints system */}
              <div className="flex flex-col gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] text-amber-500 uppercase tracking-widest font-black flex items-center justify-between">
                  <span>Progressive Hint Scaffold</span>
                  <span>Unlocked {activeHintIndex}/3</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[1, 2, 3].map(idx => {
                    const unlocked = activeHintIndex >= idx;
                    const available = activeHintIndex + 1 === idx;
                    return (
                      <button
                        key={idx}
                        disabled={unlocked || !available || aiGenerating}
                        onClick={() => handleTriggerHint(idx)}
                        className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition flex items-center justify-center gap-1 ${
                          unlocked 
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold" 
                            : available 
                              ? "bg-amber-500 hover:bg-amber-600 text-black shadow-md" 
                              : "bg-white/5 border border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed"
                        }`}
                      >
                        <span>Hint {idx}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fast Coach Action list */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Explain Problem", type: "problem" },
                  { label: "Explain Constraints", type: "constraints" },
                  { label: "Explain Example", type: "example" },
                  { label: "Discuss Edge Cases", type: "edge_cases" },
                  { label: "FAANG Interview Tips", type: "interview" },
                  { label: "Placements Context", type: "placement" }
                ].map(act => (
                  <button
                    key={act.type}
                    disabled={aiGenerating}
                    onClick={() => handleTriggerAIAction(act.type, act.label)}
                    className="text-[10px] bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] px-2.5 py-1 rounded-full transition font-semibold"
                  >
                    {act.label}
                  </button>
                ))}
              </div>

              {/* Custom Chat Input */}
              <div className="flex gap-2">
                <input
                  placeholder="Ask the coach details about your code..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendCustomMessage()}
                  disabled={aiGenerating}
                  className="flex-1 bg-black/40 border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  onClick={handleSendCustomMessage}
                  disabled={aiGenerating}
                  className="p-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-white/5 disabled:text-[var(--text-muted)] text-black rounded-xl transition"
                >
                  <Send size={14} />
                </button>
              </div>

            </div>

          </div>
            </>
          )}

        </div>
        </>
        )}
      </main>
      {renderReviewDrawer()}
      {renderHistoryDetailsModal()}
    </div>

  );
}
