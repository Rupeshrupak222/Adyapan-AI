"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useHRStore } from "./HRStore";
import {
  useInterviewProctor,
  ProctoringHUD,
  PermissionGateModal,
} from "@/components/interview-hub/proctoring";
import {
  useConversationEngine,
  InterviewRoomUI,
  ConversationMessage,
} from "@/components/interview-hub/conversation";
import type { HRConfig, HRMessage, STARAnalysis, CommunicationAnalysis } from "./HRTypes";
import { Star, TrendingUp, Sparkles } from "lucide-react";

interface HRInterviewActiveProps {
  sessionId: string;
  config: HRConfig;
  initialMessages?: HRMessage[];
  onComplete: (sessionId: string) => void;
  onEnd: () => void;
  theme?: string;
}

export const HRInterviewActive: React.FC<HRInterviewActiveProps> = ({
  sessionId,
  config,
  initialMessages,
  onComplete,
  onEnd,
  theme: propTheme,
}) => {
  const store = useHRStore();
  const {
    messages,
    questionNumber,
    totalQuestions,
    setMessages,
    addMessage,
    setSending,
    setQuestionNumber,
    setTotalQuestions,
    setCurrentCompetency,
    setLiveSTAR,
    setLiveCommunication,
  } = store;

  const theme =
    propTheme ||
    (typeof window !== "undefined"
      ? localStorage.getItem("adyapan-theme") || "dark"
      : "dark");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [liveSTAR, setLocalLiveSTAR] = useState<STARAnalysis | null>(null);
  const [liveComm, setLocalLiveComm] = useState<CommunicationAnalysis | null>(null);
  const [currentCompetency, setLocalCompetency] = useState("communication");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Set total questions based on duration
  useEffect(() => {
    setTotalQuestions(Math.ceil((config.durationMinutes || 30) / 4));
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [config, initialMessages, setMessages, setTotalQuestions]);

  // ── Proctoring ──
  const handleProctorAutoSubmit = useCallback(() => {
    toast.error("Proctoring Violation Limit Reached", {
      description: "Submitting HR interview session due to security violations.",
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
    messages.find((m) => m.role === "interviewer")?.content ||
    `Welcome to your HR behavioral interview for ${config.targetRole}. Could you start by introducing yourself and sharing your career highlights?`;

  // ── Conversation Engine Integration ──
  const handleAnswerSubmit = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;

      const userMsg: HRMessage = {
        id: `user-${Date.now()}`,
        role: "candidate",
        content: transcript,
        timestamp: Date.now(),
        questionNumber,
      };
      addMessage(userMsg);
      setSending(true);

      try {
        const res = await api.post(`/interview/hr/${sessionId}/answer`, {
          answer: transcript,
          questionNumber,
        });

        if (res.data) {
          if (res.data.currentCompetency) {
            setLocalCompetency(res.data.currentCompetency);
            setCurrentCompetency(res.data.currentCompetency);
          }

          if (res.data.nextQuestion) {
            const aiMsg: HRMessage = {
              id: `ai-${Date.now()}`,
              role: "interviewer",
              content: res.data.nextQuestion,
              timestamp: Date.now(),
              questionNumber: questionNumber + 1,
            };
            addMessage(aiMsg);
            setQuestionNumber(questionNumber + 1);
            conversationEngine.speak(res.data.nextQuestion);
          }

          if (res.data.liveAnalysis) {
            if (res.data.liveAnalysis.starAnalysis) {
              setLocalLiveSTAR(res.data.liveAnalysis.starAnalysis);
              setLiveSTAR(res.data.liveAnalysis.starAnalysis);
            }
            if (res.data.liveAnalysis.communicationAnalysis) {
              setLocalLiveComm(res.data.liveAnalysis.communicationAnalysis);
              setLiveCommunication(res.data.liveAnalysis.communicationAnalysis);
            }
          }

          if (res.data.isComplete) {
            toast.success("HR Interview completed! Generating report...");
            onComplete(sessionId);
            return;
          }
        }
      } catch (err: any) {
        toast.error("Failed to submit response. Please try again.");
      } finally {
        setSending(false);
      }
    },
    [
      sessionId,
      questionNumber,
      addMessage,
      setSending,
      setQuestionNumber,
      setCurrentCompetency,
      setLiveSTAR,
      setLiveCommunication,
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

  // Custom STAR methodology overlay
  const starAnalysisOverlay = (liveSTAR || liveComm) && (
    <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <span>Live Behavioral Feedback (STAR)</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold capitalize">
          Competency: {currentCompetency.replace(/_/g, " ")}
        </span>
      </div>

      {liveSTAR && (
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className={`p-2 rounded-xl border ${liveSTAR.hasSituation ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
            <span className="font-bold block text-[10px]">SITUATION</span>
            <span>{liveSTAR.hasSituation ? "✓ Present" : "Missing"}</span>
          </div>
          <div className={`p-2 rounded-xl border ${liveSTAR.hasTask ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
            <span className="font-bold block text-[10px]">TASK</span>
            <span>{liveSTAR.hasTask ? "✓ Present" : "Missing"}</span>
          </div>
          <div className={`p-2 rounded-xl border ${liveSTAR.hasAction ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
            <span className="font-bold block text-[10px]">ACTION</span>
            <span>{liveSTAR.hasAction ? "✓ Present" : "Missing"}</span>
          </div>
          <div className={`p-2 rounded-xl border ${liveSTAR.hasResult ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" : "bg-slate-900/50 border-slate-800 text-slate-500"}`}>
            <span className="font-bold block text-[10px]">RESULT</span>
            <span>{liveSTAR.hasResult ? "✓ Present" : "Missing"}</span>
          </div>
        </div>
      )}

      {liveComm && (
        <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-amber-500/20">
          <div className="flex items-center space-x-1 text-cyan-300">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Clarity: {liveComm.clarity || 85}%</span>
          </div>
          <span className="text-slate-400">Confidence: {liveComm.confidence || 88}%</span>
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
      interviewTitle="HR Behavioral Interview"
      targetRole={config.targetRole}
      companyName={config.targetCompany}
      difficulty="Behavioral"
      elapsedSeconds={elapsedSeconds}
      candidateVideoElement={candidateVideoNode}
      proctoringHUD={proctoringHUDNode}
      customOverlayContent={starAnalysisOverlay}
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

export default HRInterviewActive;
