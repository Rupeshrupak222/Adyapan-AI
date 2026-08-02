"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
import {
  Code2, Terminal, Play, RotateCcw, Sparkles, Brain, Loader2,
  RefreshCw, CheckCircle2, XCircle, Info, Shield, Clock, PhoneOff,
  Volume2, VolumeX, Target, Building2, Search, ArrowRight, ArrowLeft,
  Briefcase, Sliders, Check, Settings2, Flame, Layers, Server, Cpu, Database,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import AIAvatar from "../shared/AIAvatar";
import {
  useInterviewProctor,
  ProctoringHUD,
  PermissionGateModal,
} from "../proctoring";
import {
  useConversationEngine,
  InterviewRoomUI,
  ConversationMessage,
} from "@/components/interview-hub/conversation";

const LANG_MAP: Record<string, string> = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "cpp",
  typescript: "typescript",
};

const DEFAULT_CODE: Record<string, string> = {
  javascript: `// Write your solution here\nfunction solution() {\n  \n}\n`,
  python: `# Write your solution here\ndef solution():\n    pass\n`,
  java: `public class Solution {\n    public static void main(String[] args) {\n        // Write solution\n    }\n}\n`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n`,
  typescript: `function solution(): void {\n  \n}\n`,
};

export interface TechnicalConfig {
  topic: string;
  role: string;
  company: string;
  difficulty: "easy" | "medium" | "hard";
  experienceLevel: string;
  durationMinutes: number;
  language: string;
  codingLanguage: string;
  mode: string;
  aiVoiceEnabled: boolean;
  voiceGender: string;
  voiceSpeed: number;
  voicePitch: number;
  resumeAware: boolean;
  customInstructions: string;
}

interface EngineMessage {
  id: string;
  role: "interviewer" | "candidate" | "system";
  content: string;
  timestamp: number;
  questionNumber?: number;
}

const TOPICS = [
  { id: "dsa", label: "Data Structures & Algorithms", icon: Code2, desc: "Arrays, Trees, Graphs, Dynamic Programming" },
  { id: "frontend", label: "Frontend Architecture & React", icon: Layers, desc: "React, Next.js, Performance, State Management" },
  { id: "backend", label: "Backend Systems & Node.js", icon: Server, desc: "APIs, Microservices, Caching, Databases" },
  { id: "system-design", label: "System Design & Scalability", icon: Cpu, desc: "Distributed Systems, Load Balancers, Sharding" },
  { id: "fullstack", label: "Full-Stack Web Development", icon: Terminal, desc: "End-to-end applications & modern frameworks" },
  { id: "dbms", label: "SQL, DBMS & Data Modeling", icon: Database, desc: "Queries, Normalization, Indexing, Transactions" },
];

const COMPANY_PRESETS = [
  { name: "Google", color: "#4285f4" },
  { name: "Amazon", color: "#ff9900" },
  { name: "Microsoft", color: "#00a4ef" },
  { name: "Meta", color: "#0668e1" },
  { name: "Apple", color: "#a2aaad" },
  { name: "Netflix", color: "#e50914 text-white" },
  { name: "Uber", color: "#000000" },
  { name: "Flipkart", color: "#2874f0" },
  { name: "TCS / Infosys", color: "#6366f1" },
];

const ROLE_PRESETS = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Engineer",
  "Full Stack Developer",
  "Systems Architect",
  "ML / AI Engineer",
  "DevOps Engineer",
];

const CODING_LANGUAGES = [
  { id: "javascript", label: "JavaScript (Node)" },
  { id: "python", label: "Python 3" },
  { id: "java", label: "Java 17" },
  { id: "cpp", label: "C++ 20" },
  { id: "typescript", label: "TypeScript" },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE TECHNICAL INTERVIEW COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export interface TechnicalInterviewActiveProps {
  sessionId: string;
  config: TechnicalConfig;
  initialQuestion?: any;
  onComplete: (sessionId: string) => void;
  onEnd: () => void;
  theme?: string;
}

export const TechnicalInterviewActive: React.FC<TechnicalInterviewActiveProps> = ({
  sessionId,
  config,
  initialQuestion,
  onComplete,
  onEnd,
  theme: propTheme,
}) => {
  const theme =
    propTheme ||
    (typeof window !== "undefined"
      ? localStorage.getItem("adyapan-theme") || "dark"
      : "dark");

  const initialQuestionText =
    initialQuestion?.question ||
    `Welcome to your technical interview for ${config.role}${config.company ? ` at ${config.company}` : ""}. Can you start by explaining how you approach problem solving in ${config.topic}?`;

  const [messages, setMessages] = useState<EngineMessage[]>(() => [
    {
      id: "init-q",
      role: "interviewer",
      content: initialQuestionText,
      timestamp: Date.now(),
      questionNumber: 1,
    },
  ]);

  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentQuestion, setCurrentQuestion] = useState<any>(initialQuestion || null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Coding Workspace State
  const [showCoding, setShowCoding] = useState(false);
  const [code, setCode] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [reviewResult, setReviewResult] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Proctoring ──
  const handleProctorAutoSubmit = useCallback(() => {
    toast.error("Proctoring Violation Limit Reached", {
      description: "Submitting technical interview session due to security violations.",
    });
    onEnd();
  }, [onEnd]);

  const { proctorState, videoRef, startProctoring, stopProctoring } =
    useInterviewProctor({
      onAutoSubmit: handleProctorAutoSubmit,
    });

  useEffect(() => {
    startProctoring();
    return () => {
      stopProctoring();
    };
  }, [startProctoring, stopProctoring]);

  // ── Answer submission to AI ──
  const handleAnswerSubmit = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      const candidateMsg: EngineMessage = {
        id: `candidate-${Date.now()}`,
        role: "candidate",
        content: transcript,
        timestamp: Date.now(),
        questionNumber,
      };
      setMessages((prev) => [...prev, candidateMsg]);

      try {
        const { data } = await api.post(`/technical-engine/${sessionId}/answer`, {
          answer: transcript,
          questionNumber,
          codeSubmitted: showCoding ? code : undefined,
        });

        if (data.isComplete) {
          toast.success("Technical interview complete! Generating report...");
          onComplete(sessionId);
          return;
        }

        const aiMsg: EngineMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content: data.nextQuestion?.question || data.nextQuestion || "Good points. Let's move to the next question.",
          timestamp: Date.now(),
          questionNumber: data.questionNumber || questionNumber + 1,
        };

        setMessages((prev) => [...prev, aiMsg]);
        setCurrentQuestion(data.nextQuestion);
        setQuestionNumber(data.questionNumber || questionNumber + 1);
        if (data.totalQuestions) setTotalQuestions(data.totalQuestions);

        if (data.nextQuestion?.isCodingChallenge && data.nextQuestion?.codingProblem) {
          setShowCoding(true);
          setCode(data.nextQuestion.codingProblem.starterCode || DEFAULT_CODE[config.codingLanguage]);
        }

        conversationEngine.speak(aiMsg.content);
      } catch (err: any) {
        toast.error("Failed to submit response.");
      }
    },
    [
      sessionId,
      questionNumber,
      showCoding,
      code,
      config.codingLanguage,
      onComplete,
    ]
  );

  const conversationEngine = useConversationEngine({
    config: {
      language: config.language,
      aiVoiceEnabled: config.aiVoiceEnabled,
      voiceGender: config.voiceGender,
      voiceSpeed: config.voiceSpeed,
      voicePitch: config.voicePitch,
    },
    callbacks: {
      onSubmitAnswer: handleAnswerSubmit,
    },
    initialQuestion: initialQuestionText,
  });

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
        code,
        language: config.codingLanguage,
        problem: currentQuestion?.question || "",
        topic: config.topic,
        output: codeOutput,
        passed: true,
      });
      setReviewResult(res.data.review);
      toast.success("AI Code review generated!");
    } catch {
      toast.error("Failed to get code review");
    }
  }, [code, sessionId, config.codingLanguage, config.topic, currentQuestion, codeOutput]);

  const handleReplayQuestion = useCallback(() => {
    const lastMsg = [...messages]
      .reverse()
      .find((m) => m.role === "interviewer")?.content;
    if (lastMsg) {
      conversationEngine.speak(lastMsg);
    }
  }, [messages, conversationEngine]);

  const mappedMessages: ConversationMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  const candidateVideoNode = (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover transform -scale-x-100 rounded-xl"
    />
  );

  const proctoringHUDNode = (
    <ProctoringHUD proctorState={proctorState} isDark={theme === "dark"} />
  );

  const codingWorkspaceOverlay = (
    <div className="flex flex-col h-full rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-bold text-slate-200">
            {currentQuestion?.codingProblem?.title || "Technical Code Workspace"}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
            {config.codingLanguage}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center space-x-1 transition-colors"
          >
            {isRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            <span>Run</span>
          </button>
          <button
            onClick={handleRequestReview}
            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center space-x-1 transition-colors"
          >
            <Brain className="w-3 h-3" />
            <span>Review</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative border-b border-slate-800">
        <Editor
          height="100%"
          language={LANG_MAP[config.codingLanguage] || "javascript"}
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{
            fontSize: 12,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {codeOutput && (
        <div className="p-2 bg-slate-950 text-[11px] font-mono text-slate-300 max-h-20 overflow-y-auto shrink-0">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Console Output:
          </div>
          <pre className="whitespace-pre-wrap">{codeOutput}</pre>
        </div>
      )}

      {reviewResult && (
        <div className="p-2 bg-purple-950/40 text-[11px] text-purple-200 border-t border-purple-500/30 shrink-0">
          <div className="font-bold flex items-center space-x-1 text-purple-300 mb-0.5">
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>Code Review Feedback:</span>
          </div>
          <p className="leading-tight">{reviewResult}</p>
        </div>
      )}
    </div>
  );

  return (
    <InterviewRoomUI
      state={conversationEngine.state}
      silenceStage={conversationEngine.silenceStage}
      messages={mappedMessages}
      liveTranscript={conversationEngine.liveTranscript}
      accumulatedTranscript={conversationEngine.accumulatedTranscript}
      micLevel={conversationEngine.micLevel}
      isMicEnabled={conversationEngine.isMicEnabled}
      isAiMuted={conversationEngine.isAiMuted}
      isPaused={conversationEngine.isPaused}
      textModeEnabled={conversationEngine.textModeEnabled}
      avatarVideoUrl={conversationEngine.avatarVideoUrl}
      avatarAudioUrl={conversationEngine.avatarAudioUrl}
      interviewTitle={`${config.role} Technical Interview`}
      targetRole={config.role}
      companyName={config.company}
      difficulty={config.difficulty}
      elapsedSeconds={elapsedSeconds}
      candidateVideoElement={candidateVideoNode}
      proctoringHUD={proctoringHUDNode}
      customOverlayContent={showCoding ? codingWorkspaceOverlay : undefined}
      onPauseToggle={() => {
        if (conversationEngine.isPaused) {
          conversationEngine.resumeConversation();
        } else {
          conversationEngine.pauseConversation();
        }
      }}
      onEndInterview={onEnd}
      onMuteToggle={conversationEngine.toggleAiMute}
      onReplayLastQuestion={handleReplayQuestion}
      onTextSubmit={conversationEngine.submitTextAnswer}
      onTextModeToggle={() =>
        conversationEngine.setTextModeEnabled(
          !conversationEngine.textModeEnabled
        )
      }
      theme={theme}
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TOP-LEVEL TECHNICAL INTERVIEW VIEW (SETUP SETUP FORM / LANDING / ACTIVE)
// ─────────────────────────────────────────────────────────────────────────────
export default function TechnicalInterviewView({
  theme = "dark",
}: {
  theme?: string;
}) {
  const [screen, setScreen] = useState<"landing" | "loading" | "active">("landing");
  const [sessionId, setSessionId] = useState<string>("");
  const [initialQuestion, setInitialQuestion] = useState<any>(null);
  const [loadingMsg, setLoadingMsg] = useState("Preparing your AI technical interview room...");

  // Config State
  const [config, setConfig] = useState<TechnicalConfig>({
    topic: "dsa",
    role: "Software Engineer",
    company: "Google",
    difficulty: "medium",
    experienceLevel: "mid",
    durationMinutes: 30,
    language: "english",
    codingLanguage: "javascript",
    mode: "voice+coding",
    aiVoiceEnabled: true,
    voiceGender: "female",
    voiceSpeed: 1,
    voicePitch: 1,
    resumeAware: true,
    customInstructions: "",
  });

  const handleStartInterview = async () => {
    setScreen("loading");
    setLoadingMsg("Initializing AI Technical Recruiter & Proctoring Engine...");

    try {
      const res = await api.post("/engine/start", {
        interviewType: "technical",
        targetRole: config.role,
        targetCompany: config.company,
        difficulty: config.difficulty,
        experienceLevel: config.experienceLevel,
        durationMinutes: config.durationMinutes,
        technology: config.topic,
        language: config.language,
        aiVoiceEnabled: config.aiVoiceEnabled,
        voiceGender: config.voiceGender,
        voiceSpeed: config.voiceSpeed,
        voicePitch: config.voicePitch,
        resumeAware: config.resumeAware,
        customInstructions: config.customInstructions,
      });

      if (res.data && res.data.session) {
        setSessionId(res.data.session.id);
        if (res.data.firstQuestion) {
          setInitialQuestion({ question: res.data.firstQuestion });
        }
        setScreen("active");
      } else {
        setSessionId(`session-${Date.now()}`);
        setScreen("active");
      }
    } catch {
      setSessionId(`session-${Date.now()}`);
      setScreen("active");
    }
  };

  if (screen === "loading") {
    return (
      <div className="h-[calc(100vh-76px)] flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">{loadingMsg}</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Setting up Voice Activity Detection, VAD Smart Silence rules, and candidate webcam feed.
        </p>
      </div>
    );
  }

  if (screen === "active" && sessionId) {
    return (
      <TechnicalInterviewActive
        sessionId={sessionId}
        config={config}
        initialQuestion={initialQuestion}
        onComplete={() => setScreen("landing")}
        onEnd={() => setScreen("landing")}
        theme={theme}
      />
    );
  }

  // LANDING SETUP FORM SCREEN (Tech Stack, Company, Role, Difficulty, Coding Lang)
  return (
    <div className="h-[calc(100vh-76px)] overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner Header */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-cyan-900/40 border border-purple-500/30 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold uppercase tracking-wider">
                AI Technical Recruiter System
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-2">
                Configure Your AI Technical Interview
              </h1>
              <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
                Customize your tech stack, target company, role, difficulty, and coding language. Experience a human-like voice interview with zero buttons and live code execution.
              </p>
            </div>
            <div className="hidden md:flex p-4 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300">
              <Code2 className="w-10 h-10" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Setup Form (8 cols) */}
          <div className="md:col-span-8 space-y-6">
            {/* 1. Tech Stack / Topic Selection */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span>1. Select Technical Focus & Stack</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TOPICS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = config.topic === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setConfig({ ...config, topic: item.id })}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                        isSelected
                          ? "bg-purple-600/20 border-purple-500/50 text-white shadow-lg shadow-purple-950/50"
                          : "bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${isSelected ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block text-slate-200">{item.label}</span>
                        <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">{item.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Target Company & Role Selection */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>2. Select Company & Role</span>
              </h3>

              {/* Company Presets */}
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block">Target Company:</label>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_PRESETS.map((comp) => {
                    const isSelected = config.company === comp.name;
                    return (
                      <button
                        key={comp.name}
                        onClick={() => setConfig({ ...config, company: comp.name })}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-cyan-600/20 border-cyan-500 text-cyan-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {comp.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role Presets */}
              <div>
                <label className="text-xs text-slate-400 font-medium mb-2 block">Target Role:</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_PRESETS.map((role) => {
                    const isSelected = config.role === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setConfig({ ...config, role })}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-purple-600/20 border-purple-500 text-purple-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 3. Difficulty, Coding Language & Duration */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>3. Difficulty & Coding Preferences</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label className="text-xs text-slate-400 font-medium mb-1.5 block">Difficulty Level:</label>
                  <div className="flex space-x-2">
                    {(["easy", "medium", "hard"] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => setConfig({ ...config, difficulty: diff })}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                          config.difficulty === diff
                            ? diff === "easy"
                              ? "bg-emerald-600/20 border-emerald-500 text-emerald-300"
                              : diff === "medium"
                              ? "bg-amber-600/20 border-amber-500 text-amber-300"
                              : "bg-rose-600/20 border-rose-500 text-rose-300"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coding Language */}
                <div>
                  <label className="text-xs text-slate-400 font-medium mb-1.5 block">Coding Language:</label>
                  <select
                    value={config.codingLanguage}
                    onChange={(e) => setConfig({ ...config, codingLanguage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500 font-medium"
                  >
                    {CODING_LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Action Card (4 cols) */}
          <div className="md:col-span-4 space-y-6">
            <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/30 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Session Summary</span>
              </h3>

              <div className="space-y-2.5 text-xs text-slate-300 border-t border-b border-slate-800 py-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Focus Area:</span>
                  <span className="font-bold text-purple-300 capitalize">{config.topic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Role:</span>
                  <span className="font-bold text-cyan-300">{config.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Company:</span>
                  <span className="font-bold text-emerald-300">{config.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Difficulty:</span>
                  <span className="font-bold capitalize text-amber-300">{config.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Code Workspace:</span>
                  <span className="font-bold text-indigo-300">{config.codingLanguage}</span>
                </div>
              </div>

              <button
                onClick={handleStartInterview}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-purple-950/50 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
              >
                <span>Start Technical Interview</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                🎙️ <span className="font-bold text-slate-300">Human-Like Voice Engine:</span> Microphones operate automatically with smart VAD silence monitoring. Zero button clicks required during the active session.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
