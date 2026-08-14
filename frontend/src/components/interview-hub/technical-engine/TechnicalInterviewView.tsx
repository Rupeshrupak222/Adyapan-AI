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
  ChevronLeft, ChevronRight, Trophy, BarChart3, Award, FileText, Download,
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
import TechnicalLoading from "./TechnicalLoading";
import EngineReport from "@/components/interview-hub/engine/EngineReport";
import {
  useInterviewLifecycle,
  PermissionGateScreen,
  InterviewRouteGuard,
} from "@/components/interview-hub/shared/lifecycle";

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
  { id: "dsa", label: "Data Structures & Algorithms", icon: Code2, desc: "Arrays, Trees, Graphs, DP & Algorithmic Problem Solving" },
  { id: "frontend", label: "Frontend & React Architecture", icon: Layers, desc: "React 19, Next.js, Performance, State & SSR" },
  { id: "backend", label: "Backend Systems & Node.js", icon: Server, desc: "REST APIs, Microservices, Caching & Async I/O" },
  { id: "system-design", label: "System Design & Scalability", icon: Cpu, desc: "Distributed Systems, Load Balancers, Sharding & Caching" },
  { id: "fullstack", label: "Full-Stack Web Engineering", icon: Terminal, desc: "End-to-end web apps, GraphQL & API integrations" },
  { id: "dbms", label: "SQL, NoSQL & Data Modeling", icon: Database, desc: "Queries, Indexing, Transactions, Postgres & MongoDB" },
  { id: "devops", label: "DevOps, Cloud & CI/CD", icon: Server, desc: "Docker, Kubernetes, AWS Services & Infrastructure as Code" },
  { id: "ai-ml", label: "AI & Machine Learning Engineering", icon: Brain, desc: "LLMs, RAG, PyTorch, Model Deployment & MLOps" },
  { id: "mobile", label: "Mobile Application Engineering", icon: Sliders, desc: "React Native, Flutter, iOS & Android Architecture" },
  { id: "cybersecurity", label: "Cybersecurity & Web Defense", icon: Shield, desc: "OWASP Top 10, Auth Protocols, JWT & Cryptography" },
  { id: "oop-design", label: "OOP & Design Patterns", icon: Target, desc: "SOLID principles, Structural Patterns & Clean Code" },
  { id: "os-networking", label: "OS, Concurrency & Networking", icon: Terminal, desc: "Multithreading, Memory Locks, Sockets & TCP/IP Protocol" },
  { id: "cloud-serverless", label: "Cloud Architecture & Serverless", icon: Server, desc: "AWS Lambda, Cloudflare Workers, GCP & Microservices" },
  { id: "data-engineering", label: "Data Engineering & Pipelines", icon: Database, desc: "ETL, Spark, Airflow, Snowflake & Big Data Processing" },
  { id: "game-dev", label: "Game Dev & Graphics Engine", icon: Code2, desc: "C++, OpenGL, DirectX, Shader Programming & Physics" },
  { id: "embedded-iot", label: "Embedded Systems & IoT", icon: Cpu, desc: "C/C++, Microcontrollers, RTOS, Firmware & Protocols" },
  { id: "blockchain", label: "Web3 & Smart Contracts", icon: Shield, desc: "Solidity, Ethereum, EVM Architecture & DeFi Protocols" },
  { id: "qa-automation", label: "QA Automation & Testing (SDET)", icon: CheckCircle2, desc: "Cypress, Playwright, Jest, E2E & Test Strategy" },
  { id: "microservices", label: "Microservices & Message Queues", icon: Layers, desc: "Event-Driven Systems, Kafka, RabbitMQ & gRPC" },
  { id: "sre-observability", label: "Site Reliability (SRE) & Monitoring", icon: BarChart3, desc: "Prometheus, Grafana, SLOs, Incident Drills & Alerting" },
];

const MODE_OPTIONS = [
  {
    id: "voice+coding",
    label: "Voice + Interactive Coding",
    badge: "Recommended",
    desc: "Real-time AI voice interviewer with live Monaco code editor & runner",
    icon: Sparkles,
  },
  {
    id: "voice",
    label: "Voice Only",
    badge: "Conversational",
    desc: "Speech-based technical & architectural conceptual interview",
    icon: Volume2,
  },
  {
    id: "coding-only",
    label: "Coding Only / Text",
    badge: "Silent Mode",
    desc: "Text-based coding challenges with automated AI code reviews",
    icon: Terminal,
  },
];

const COMPANY_PRESETS = [
  { name: "Google", color: "#4285f4" },
  { name: "Amazon", color: "#ff9900" },
  { name: "Microsoft", color: "#00a4ef" },
  { name: "Meta", color: "#0668e1" },
  { name: "Apple", color: "#a2aaad" },
  { name: "Netflix", color: "#e50914" },
  { name: "Uber", color: "#000000" },
  { name: "Flipkart", color: "#2874f0" },
  { name: "TCS / Infosys", color: "#6366f1" },
  { name: "Adobe", color: "#ff0000" },
  { name: "Salesforce", color: "#00a1e0" },
  { name: "Oracle", color: "#f80000" },
  { name: "Stripe", color: "#635bff" },
  { name: "Airbnb", color: "#ff5a5f" },
  { name: "Atlassian", color: "#0052cc" },
  { name: "Nvidia", color: "#76b900" },
  { name: "OpenAI", color: "#10a37f" },
  { name: "Spotify", color: "#1ed760" },
  { name: "Coinbase", color: "#0052ff" },
  { name: "Palantir", color: "#101114" },
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

  useEffect(() => {
    if (initialQuestion?.question) {
      setCurrentQuestion(initialQuestion);
      setMessages((prev) => {
        if (prev.length === 0 || (prev.length === 1 && prev[0].id === "init-q")) {
          return [
            {
              id: "init-q",
              role: "interviewer",
              content: initialQuestion.question,
              timestamp: Date.now(),
              questionNumber: 1,
            },
          ];
        }
        return prev;
      });
    }
  }, [initialQuestion]);

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
      description: "Terminating technical interview due to security violations. Redirecting to analytics...",
    });
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard/interview/analytics";
    } else {
      onEnd();
    }
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

  // ── Answer submission to AI with Fast Timeout & Fallback ──
  async function handleAnswerSubmit(transcript: string) {
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
        let timeoutId: any;
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(
            () =>
              resolve({
                data: {
                  nextQuestion: `Great explanation on ${config.topic}. Could you elaborate on the time and space complexity trade-offs of your approach?`,
                  questionNumber: questionNumber + 1,
                },
              }),
            9500
          );
        });

        const res = (await Promise.race([
          api.post(`/technical-engine/${sessionId}/answer`, {
            answer: transcript,
            questionNumber,
            codeSubmitted: showCoding ? code : undefined,
          }),
          timeoutPromise,
        ])) as any;

        if (timeoutId) clearTimeout(timeoutId);

        const data = res.data || {};

        if (data.isComplete) {
          toast.success("Technical interview complete! Generating report...");
          onComplete(sessionId);
          return;
        }

        const nextQText =
          data.nextQuestion?.question ||
          (typeof data.nextQuestion === "string" ? data.nextQuestion : null) ||
          `Thank you for detailing that approach. How would you handle scaling this for high concurrency in ${config.topic}?`;

        const aiMsg: EngineMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content: nextQText,
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
        // Fast Fallback Recovery
        const fallbackText = `That is a solid foundation. Let's delve into optimization: how would you improve performance under edge cases?`;
        const aiMsg: EngineMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content: fallbackText,
          timestamp: Date.now(),
          questionNumber: questionNumber + 1,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setQuestionNumber(questionNumber + 1);
        conversationEngine.speak(fallbackText);
      }
    }

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

  // Video element with natural, non-zoomed framing
  const candidateVideoNode = (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-contain max-h-full transform -scale-x-100 rounded-xl bg-slate-950"
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
      onEndInterview={async () => {
        conversationEngine.destroyEngine();
        try {
          if (sessionId) {
            toast.loading("Finalizing technical interview & generating report...", { id: "end-tech-session" });
            await api.post(`/technical-engine/${sessionId}/end`).catch(async () => {
              await api.post(`/interview/${sessionId}/end`).catch(async () => {
                await api.post(`/engine/${sessionId}/end`).catch(() => {});
              });
            });
            toast.success("Interview completed!", { id: "end-tech-session" });
          }
        } catch (e) {
          console.error("End Technical session error:", e);
        } finally {
          onComplete(sessionId);
        }
      }}
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
// TOP-LEVEL TECHNICAL INTERVIEW VIEW (RESTORED ORIGINAL SETUP TEMPLATE)
// ─────────────────────────────────────────────────────────────────────────────
export default function TechnicalInterviewView({
  theme = "dark",
}: {
  theme?: string;
}) {
  const isDark = theme === "dark";
  const [screen, setScreen] = useState<"landing" | "permission_gate" | "loading" | "active" | "report">("landing");
  const [sessionId, setSessionId] = useState<string>("");
  const [evaluation, setEvaluation] = useState<any>(null);
  const [initialQuestion, setInitialQuestion] = useState<any>(null);
  const [step, setStep] = useState(0);

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

  const sessionIdRef = useRef<string>("");
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const lifecycle = useInterviewLifecycle({
    interviewType: "technical",
    onTerminationCleanup: () => {
      if (sessionIdRef.current) {
        try {
          const token = localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token") || "";
          const endpoint = `/api/technical-engine/${sessionIdRef.current}/end`;
          fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ autoEnded: true }),
            keepalive: true,
          }).catch(() => {});
        } catch {}
      }
      setSessionId("");
    },
  });

  const handleStartInterview = useCallback(async () => {
    setScreen("permission_gate");
    await lifecycle.validateAndRequestPermissions();
  }, [lifecycle]);

  const handleLoadingComplete = useCallback(async () => {
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
        lifecycle.markInterviewStarted();
      } else {
        setSessionId(`session-${Date.now()}`);
        setScreen("active");
        lifecycle.markInterviewStarted();
      }
    } catch {
      setSessionId(`session-${Date.now()}`);
      setScreen("active");
      lifecycle.markInterviewStarted();
    }
  }, [config, lifecycle]);

  if (screen === "permission_gate") {
    return (
      <PermissionGateScreen
        interviewTitle={`${config.role} Technical Interview Room`}
        mediaStatus={lifecycle.mediaStatus}
        onRequestPermissions={lifecycle.validateAndRequestPermissions}
        onProceedToInterview={() => setScreen("loading")}
        onCancel={() => {
          lifecycle.executeAtomicTerminationSequence();
          setScreen("landing");
        }}
        isDark={isDark}
      />
    );
  }

  if (screen === "loading") {
    return (
      <TechnicalLoading
        config={config}
        onComplete={handleLoadingComplete}
        theme={theme}
      />
    );
  }

  if (screen === "active") {
    return (
      <>
        <InterviewRouteGuard
          isOpen={lifecycle.showExitConfirm}
          onConfirmExit={() => {
            lifecycle.confirmExitAndTerminate();
            setScreen("landing");
            setSessionId("");
          }}
          onCancelExit={lifecycle.cancelExit}
          isDark={isDark}
        />
        <TechnicalInterviewActive
          sessionId={sessionId || `tech-session-${Date.now()}`}
          config={config}
          initialQuestion={initialQuestion}
          onComplete={async (compSessionId) => {
            lifecycle.executeAtomicTerminationSequence();
            toast.info("Generating AI Technical Evaluation Report...");
            try {
              let res = await api.post(`/technical-engine/${compSessionId}/evaluate`).catch(async () => {
                return await api.post(`/engine/${compSessionId}/evaluate`).catch(() => null);
              });
              if (!res?.data?.evaluation) {
                res = await api.post(`/technical-engine/${compSessionId}/end`).catch(async () => {
                  return await api.post(`/engine/${compSessionId}/end`).catch(() => null);
                });
              }
              const rawEval = res?.data?.evaluation;
              const combinedEval = rawEval ? {
                ...(rawEval.detailedAnalysis || {}),
                ...rawEval,
              } : null;
              if (combinedEval) {
                setEvaluation(combinedEval);
              }
              if (compSessionId) setSessionId(compSessionId);
            } catch (err) {
              console.error("Technical evaluation generation error:", err);
            } finally {
              setScreen("report");
            }
          }}
          onEnd={async () => {
            lifecycle.executeAtomicTerminationSequence();
            const sid = sessionId || "tech-session";
            toast.info("Wrapping up technical interview & generating report...");
            try {
              let res = await api.post(`/technical-engine/${sid}/evaluate`).catch(async () => {
                return await api.post(`/engine/${sid}/evaluate`).catch(() => null);
              });
              if (!res?.data?.evaluation) {
                res = await api.post(`/technical-engine/${sid}/end`).catch(async () => {
                  return await api.post(`/engine/${sid}/end`).catch(() => null);
                });
              }
              const rawEval = res?.data?.evaluation;
              const combinedEval = rawEval ? {
                ...(rawEval.detailedAnalysis || {}),
                ...rawEval,
              } : null;
              if (combinedEval) {
                setEvaluation(combinedEval);
              }
            } catch (err) {
              console.error("Technical evaluation end error:", err);
            } finally {
              setScreen("report");
            }
          }}
          theme={theme}
        />
      </>
    );
  }

  if (screen === "report") {
    return (
      <EngineReport
        sessionId={sessionId || "technical-session"}
        evaluation={evaluation}
        messages={[]}
        config={{
          interviewType: "technical",
          targetRole: config?.role || "Software Engineer",
          targetCompany: config?.company || "Tech",
          difficulty: config?.difficulty || "medium",
          durationMinutes: config?.durationMinutes || 30,
          technology: config?.topic || "Technical",
        }}
        onRetry={() => { setScreen("landing"); setSessionId(""); setEvaluation(null); }}
        onViewAnalytics={() => { setScreen("landing"); setSessionId(""); setEvaluation(null); }}
        onNewInterview={() => { setScreen("landing"); setSessionId(""); setEvaluation(null); }}
        theme={theme}
      />
    );
  }

  // RESTORED ORIGINAL HIGHLY-RATED SETUP LANDING WIZARD TEMPLATE
  return (
    <div
      className={`h-[calc(100vh-76px)] overflow-y-auto p-4 md:p-6 transition-colors ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Banner Header */}
        <div
          className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
            isDark
              ? "bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-cyan-900/50 border-purple-500/30 shadow-purple-950/40"
              : "bg-gradient-to-r from-purple-100 via-indigo-50 to-cyan-100 border-purple-200 shadow-slate-200/80 text-slate-900"
          }`}
        >
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  isDark
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    : "bg-purple-200 text-purple-800 border-purple-300"
                }`}
              >
                AI Technical Interview Suite
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold mt-2">
                Technical Interview Configuration
              </h1>
              <p
                className={`text-xs md:text-sm mt-1 max-w-2xl font-medium ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Select your tech stack skills, target company, role, difficulty, and coding language. Experience a human-like voice interview with natural turn-taking.
              </p>
            </div>
            <div
              className={`hidden md:flex p-4 rounded-2xl border ${
                isDark
                  ? "bg-purple-600/20 border-purple-500/30 text-purple-300"
                  : "bg-white border-purple-200 text-purple-700 shadow-md"
              }`}
            >
              <Code2 className="w-10 h-10" />
            </div>
          </div>
        </div>

        {/* Wizard Step Progress Header */}
        <div className="flex items-center justify-between border-b pb-3 border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center">
              {step + 1}
            </span>
            <span>
              {step === 0 && "Step 1: Select Technical Focus & Skills Matrix"}
              {step === 1 && "Step 2: Choose Target Company (Preset or Custom)"}
              {step === 2 && "Step 3: Difficulty Level, Coding Workspace Language & Confirmation"}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1 ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1 shadow-md"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Step Contents */}
        {step === 0 && (
          <div className="space-y-6">
            {/* Interview Mode Selection */}
            <div className="space-y-3">
              <h3
                className={`text-sm font-bold flex items-center space-x-2 ${
                  isDark ? "text-slate-200" : "text-slate-900"
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Select Interview Mode:</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {MODE_OPTIONS.map((modeOpt) => {
                  const Icon = modeOpt.icon;
                  const isSelected = config.mode === modeOpt.id;
                  return (
                    <button
                      key={modeOpt.id}
                      onClick={() =>
                        setConfig({
                          ...config,
                          mode: modeOpt.id,
                          aiVoiceEnabled: modeOpt.id !== "coding-only",
                        })
                      }
                      className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? isDark
                            ? "bg-gradient-to-br from-purple-900/40 via-slate-900 to-indigo-900/40 border-purple-500/80 text-white shadow-xl shadow-purple-950/50 ring-1 ring-purple-500/50"
                            : "bg-purple-50 border-purple-400 text-purple-950 shadow-md font-semibold ring-1 ring-purple-400"
                          : isDark
                          ? "bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-purple-300 shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className={`p-2 rounded-xl ${
                              isSelected
                                ? "bg-purple-600 text-white"
                                : isDark
                                ? "bg-slate-800 text-slate-400"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isSelected
                                ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                                : isDark
                                ? "bg-slate-800 text-slate-500"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {modeOpt.badge}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-extrabold block mb-1 ${
                            isDark ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {modeOpt.label}
                        </span>
                        <span
                          className={`text-[11px] leading-relaxed block ${
                            isDark ? "text-slate-400" : "text-slate-600"
                          }`}
                        >
                          {modeOpt.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Technical Skills Focus Grid */}
            <div className="space-y-3">
              <h3
                className={`text-sm font-bold flex items-center space-x-2 ${
                  isDark ? "text-slate-200" : "text-slate-900"
                }`}
              >
                <Terminal className="w-4 h-4 text-purple-500" />
                <span>Select Technical Skill / Focus Area:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {TOPICS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = config.topic === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setConfig({ ...config, topic: item.id, role: item.label })}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? isDark
                            ? "bg-purple-600/20 border-purple-500/60 text-white shadow-xl shadow-purple-950/40"
                            : "bg-purple-50 border-purple-400 text-purple-950 shadow-md font-semibold"
                          : isDark
                          ? "bg-slate-900/80 border-slate-800/80 text-slate-400 hover:border-slate-700"
                          : "bg-white border-slate-200 text-slate-600 hover:border-purple-300 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 mb-2">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isSelected
                              ? "bg-purple-600 text-white"
                              : isDark
                              ? "bg-slate-800 text-slate-400"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-xs font-bold block leading-snug ${
                            isDark ? "text-slate-100" : "text-slate-900"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] leading-relaxed block mt-1 ${
                          isDark ? "text-slate-400" : "text-slate-600 font-medium"
                        }`}
                      >
                        {item.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            {/* Target Company (Presets & Custom) */}
            <div
              className={`p-5 rounded-2xl border space-y-4 ${
                isDark
                  ? "bg-slate-900/80 border-slate-800 text-slate-100"
                  : "bg-white border-slate-200 text-slate-900 shadow-md"
              }`}
            >
              <h3 className="text-sm font-bold flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-cyan-500" />
                <span>Select Target Company Preset or Enter Custom:</span>
              </h3>

              {/* Custom Company Text Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className={`w-4 h-4 ${isDark ? "text-cyan-400" : "text-cyan-600"}`} />
                </div>
                <input
                  type="text"
                  placeholder="Enter custom company name (e.g. Acme Corp, Stripe, OpenAI, My Startup)..."
                  value={config.company}
                  onChange={(e) => setConfig({ ...config, company: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-bold focus:outline-none transition-all ${
                    isDark
                      ? "bg-slate-950 border-slate-800 text-white placeholder:text-slate-500 focus:border-cyan-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500"
                  }`}
                />
              </div>

              {/* Company Presets Grid */}
              <div className="space-y-2">
                <span className={`text-[11px] font-bold block ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  Popular Company Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  {COMPANY_PRESETS.map((comp) => {
                    const isSelected = config.company === comp.name;
                    return (
                      <button
                        key={comp.name}
                        onClick={() => setConfig({ ...config, company: comp.name })}
                        className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? isDark
                              ? "bg-cyan-600/20 border-cyan-500 text-cyan-200 shadow-md ring-1 ring-cyan-500/50"
                              : "bg-cyan-100 border-cyan-400 text-cyan-900 shadow-sm ring-1 ring-cyan-400"
                            : isDark
                            ? "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-300"
                        }`}
                      >
                        {comp.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-5">
              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDark
                    ? "bg-slate-900/80 border-slate-800 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900 shadow-md"
                }`}
              >
                <h3 className="text-sm font-bold flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span>Difficulty Level & Coding Workspace:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Difficulty */}
                  <div>
                    <label
                      className={`text-xs font-medium mb-1.5 block ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Difficulty Level:
                    </label>
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
                              : isDark
                              ? "bg-slate-950 border-slate-800 text-slate-400"
                              : "bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Coding Language */}
                  <div>
                    <label
                      className={`text-xs font-medium mb-1.5 block ${
                        isDark ? "text-slate-400" : "text-slate-600"
                      }`}
                    >
                      Coding Workspace Language:
                    </label>
                    <select
                      value={config.codingLanguage}
                      onChange={(e) =>
                        setConfig({ ...config, codingLanguage: e.target.value })
                      }
                      className={`w-full text-xs rounded-xl px-3 py-2 border font-bold focus:outline-none ${
                        isDark
                          ? "bg-slate-950 border-slate-800 text-slate-200 focus:border-purple-500"
                          : "bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-500"
                      }`}
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

            {/* Launch Summary Card */}
            <div className="md:col-span-4">
              <div
                className={`p-6 rounded-3xl border space-y-4 shadow-xl ${
                  isDark
                    ? "bg-slate-900 border-purple-500/30 text-slate-100"
                    : "bg-white border-purple-200 text-slate-900 shadow-slate-200/80"
                }`}
              >
                <h3 className="text-sm font-bold flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <span>Interview Config Summary</span>
                </h3>

                <div
                  className={`space-y-2 text-xs border-t border-b py-3 ${
                    isDark ? "border-slate-800" : "border-slate-200"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      Focus Area:
                    </span>
                    <span className="font-bold text-purple-600 capitalize">
                      {config.topic}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      Target Role:
                    </span>
                    <span className="font-bold text-cyan-600">{config.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      Company:
                    </span>
                    <span className="font-bold text-emerald-600">
                      {config.company}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      Difficulty:
                    </span>
                    <span className="font-bold capitalize text-amber-600">
                      {config.difficulty}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? "text-slate-400" : "text-slate-600"}>
                      Coding Workspace:
                    </span>
                    <span className="font-bold text-indigo-600">
                      {config.codingLanguage}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleStartInterview}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95"
                >
                  <span>Start Technical Interview</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
