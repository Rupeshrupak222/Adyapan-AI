"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useEngineStore } from "./EngineStore";
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
      description: "Terminating interview due to security violations. Redirecting to analytics...",
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

  // Initial Question Setup
  const initialQuestionText =
    messages.find((m) => m.role === "interviewer")?.content ||
    `Tell me about your background and interest in the ${config.targetRole} role.`;

  // ── Conversation Engine Integration with Fast Fallback ──
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
        let timeoutId: any;
        const timeoutPromise = new Promise((resolve) => {
          timeoutId = setTimeout(
            () =>
              resolve({
                data: {
                  nextQuestion: `That provides great insight into your experience. How do you approach prioritizing deliverables under tight deadlines for ${config.targetRole}?`,
                  nextQuestionNumber: questionNumber + 1,
                },
              }),
            9500
          );
        });

        const res = (await Promise.race([
          api.post(`/engine/${sessionId}/answer`, {
            answer: transcript,
            questionNumber,
          }),
          timeoutPromise,
        ])) as any;

        if (timeoutId) clearTimeout(timeoutId);

        const data = res.data || {};

        const aiResponse: EngineMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content:
            data.nextQuestion ||
            data.message ||
            data.response ||
            `Thank you for sharing. Could you describe a challenging project you handled in ${config.targetRole}?`,
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

        conversationEngine.speak(aiResponse.content);
      } catch (err: any) {
        // Fast local recovery
        const fallbackText = `Thank you for detailing that. How do you ensure effective communication across team members in ${config.targetRole}?`;
        const aiResponse: EngineMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content: fallbackText,
          timestamp: Date.now(),
          questionNumber: questionNumber + 1,
        };
        addMessage(aiResponse);
        setQuestionNumber(questionNumber + 1);
        conversationEngine.speak(fallbackText);
      } finally {
        setSending(false);
      }
    },
    [
      sessionId,
      questionNumber,
      config.targetRole,
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
      onEndInterview={() => {
        if (typeof window !== "undefined") {
          window.location.href = "/dashboard/interview/analytics";
        } else {
          onEnd();
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

export default EngineInterview;
