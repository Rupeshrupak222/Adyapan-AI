"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useEngineStore } from "./EngineStore";
import {
  useInterviewProctor,
  ProctoringHUD,
  ProctoringPanel,
  PermissionGateModal,
} from "@/components/interview-hub/proctoring";
import {
  useConversationEngine,
  InterviewRoomUI,
  ConversationMessage,
} from "@/components/interview-hub/conversation";
import type { EngineConfig, EngineMessage } from "./EngineTypes";

interface EngineInterviewProps {
  sessionId: string;
  config: EngineConfig;
  onComplete: (sessionId: string) => void;
  onEnd: () => void;
  theme?: string;
}

export const EngineInterview: React.FC<EngineInterviewProps> = ({
  sessionId,
  config,
  onComplete,
  onEnd,
  theme: propTheme,
}) => {
  const store = useEngineStore();
  const {
    messages,
    questionNumber,
    totalQuestions,
    setMessages,
    addMessage,
    setSending,
    setQuestionNumber,
    setTotalQuestions,
  } = store;

  const theme =
    propTheme ||
    (typeof window !== "undefined"
      ? localStorage.getItem("adyapan-theme") || "dark"
      : "dark");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionLoaded, setSessionLoaded] = useState(false);
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

  // ── Proctoring ──
  const handleProctorAutoSubmit = useCallback(() => {
    toast.error("Proctoring Violation Limit Reached", {
      description: "Submitting interview session due to security violations.",
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

  // Initial Question Setup
  const initialQuestionText =
    messages.find((m) => m.role === "interviewer")?.content ||
    `Tell me about your background and interest in the ${config.targetRole} role.`;

  // ── Conversation Engine Integration ──
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
      addMessage(candidateMsg);
      setSending(true);

      try {
        const { data } = await api.post(`/engine/${sessionId}/answer`, {
          answer: transcript,
          questionNumber,
        });

        const aiResponse: EngineMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content: data.nextQuestion || data.message || data.response,
          timestamp: Date.now(),
          questionNumber: data.nextQuestionNumber || questionNumber + 1,
          isFollowUp: data.isFollowUp || false,
        };

        addMessage(aiResponse);

        const newQNum = data.nextQuestionNumber || questionNumber + 1;
        setQuestionNumber(newQNum);
        if (data.totalQuestions) setTotalQuestions(data.totalQuestions);

        if (data.isComplete) {
          toast.success("Interview complete! Generating report...");
          onComplete(sessionId);
          return;
        }

        // Trigger AI speech for the new question
        conversationEngine.speak(aiResponse.content);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || "Failed to submit response"
        );
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
      setTotalQuestions,
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

  // Replay Last Question
  const handleReplayQuestion = useCallback(() => {
    const lastMsg = [...messages]
      .reverse()
      .find((m) => m.role === "interviewer")?.content;
    if (lastMsg) {
      conversationEngine.speak(lastMsg);
    }
  }, [messages, conversationEngine]);

  // Map messages to ConversationMessage format
  const mappedMessages: ConversationMessage[] = messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: new Date(m.timestamp || Date.now()).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  // Video element for Candidate Card
  const candidateVideoNode = (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover transform -scale-x-100 rounded-xl"
    />
  );

  // Proctoring HUD overlay
  const proctoringHUDNode = (
    <ProctoringHUD proctorState={proctorState} isDark={theme === "dark"} />
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
      interviewTitle={`${config.targetRole} Interview`}
      targetRole={config.targetRole}
      companyName={config.targetCompany}
      difficulty={config.difficulty}
      elapsedSeconds={elapsedSeconds}
      candidateVideoElement={candidateVideoNode}
      proctoringHUD={proctoringHUDNode}
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

export default EngineInterview;
