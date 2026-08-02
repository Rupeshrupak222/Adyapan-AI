"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
import {
  Code2, Terminal, Play, RotateCcw, Sparkles, Brain, Loader2,
  RefreshCw, CheckCircle2, XCircle, Info, Shield, Clock, PhoneOff,
  Volume2, VolumeX, Target,
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

  const [messages, setMessages] = useState<EngineMessage[]>(() => {
    if (initialQuestion?.question) {
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
    return [];
  });

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

  const initialQuestionText =
    currentQuestion?.question ||
    `Welcome to your technical interview for ${config.role}. Can you explain how you approach optimizing complex algorithms?`;

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
          content: data.nextQuestion?.question || data.nextQuestion,
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
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden mt-4">
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-slate-200">
            {currentQuestion?.codingProblem?.title || "Technical Coding Workspace"}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
            {config.codingLanguage}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors"
          >
            {isRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
            <span>Run Code</span>
          </button>
          <button
            onClick={handleRequestReview}
            className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center space-x-1 transition-colors"
          >
            <Brain className="w-3 h-3" />
            <span>AI Review</span>
          </button>
        </div>
      </div>

      <div className="h-64 relative border-b border-slate-800">
        <Editor
          height="100%"
          language={LANG_MAP[config.codingLanguage] || "javascript"}
          theme="vs-dark"
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>

      {codeOutput && (
        <div className="p-3 bg-slate-950 text-xs font-mono text-slate-300 max-h-28 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Console Output:
          </div>
          <pre className="whitespace-pre-wrap">{codeOutput}</pre>
        </div>
      )}

      {reviewResult && (
        <div className="p-3 bg-purple-950/40 text-xs text-purple-200 border-t border-purple-500/30">
          <div className="font-bold flex items-center space-x-1 text-purple-300 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Interviewer Code Feedback:</span>
          </div>
          <p className="leading-relaxed">{reviewResult}</p>
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

export default function TechnicalInterviewView({
  theme = "dark",
}: {
  theme?: string;
}) {
  const [sessionId] = useState<string>("tech-session-default");
  const [config] = useState<TechnicalConfig>({
    topic: "dsa",
    role: "Software Engineer",
    company: "Adyapan AI",
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

  return (
    <TechnicalInterviewActive
      sessionId={sessionId}
      config={config}
      onComplete={(id) => console.log("Complete session", id)}
      onEnd={() => console.log("End session")}
      theme={theme}
    />
  );
}
