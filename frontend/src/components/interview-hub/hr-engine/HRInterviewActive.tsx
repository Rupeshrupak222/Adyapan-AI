"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useHRStore } from "./HRStore";
import {
  useInterviewProctor,
  ProctoringHUD,
} from "@/components/interview-hub/proctoring";
import {
  useConversationEngine,
  InterviewRoomUI,
  ConversationMessage,
} from "@/components/interview-hub/conversation";
import type { HRConfig, HRMessage, STARAnalysis, CommunicationAnalysis } from "./HRTypes";

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

  // Auto-end interview on unmount / navigation change
  const autoEndedRef = useRef(false);
  useEffect(() => {
    return () => {
      if (!autoEndedRef.current && sessionId) {
        autoEndedRef.current = true;
        try {
          const token = localStorage.getItem("adyapan-token") || sessionStorage.getItem("adyapan-token") || "";
          fetch(`/api/hr-interview/${sessionId}/end`, {
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
    };
  }, [sessionId]);

  // Set total questions based on duration
  const initialQuestionText =
    (initialMessages && initialMessages.find((m) => m.role === "interviewer")?.content) ||
    messages.find((m) => m.role === "interviewer")?.content ||
    `Welcome to your HR behavioral interview for ${config.targetRole}. Could you start by introducing yourself and sharing your career highlights?`;

  useEffect(() => {
    setTotalQuestions(Math.ceil((config.durationMinutes || 30) / 4));
    if (initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
    } else if (messages.length === 0) {
      const initMsg: HRMessage = {
        id: `ai-init-${Date.now()}`,
        role: "interviewer",
        content: initialQuestionText,
        timestamp: Date.now(),
        questionNumber: 1,
      };
      setMessages([initMsg]);
    }
  }, [config, initialMessages, initialQuestionText, messages.length, setMessages, setTotalQuestions]);

  // ── Proctoring ──
  const handleProctorAutoSubmit = useCallback(() => {
    toast.error("Proctoring Violation Limit Reached", {
      description: "Terminating HR interview due to security violations. Redirecting to analytics...",
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


  // ── Answer Submission with Fast Fallback Recovery ──
  async function handleAnswerSubmit(transcript: string) {
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
        const res = (await api.post(`/interview/hr/${sessionId}/answer`, {
          answer: transcript,
          questionNumber,
          requestId: `ans-hr-${sessionId}-${questionNumber}-${Date.now()}`,
        })) as any;

        if (res.data) {
          if (res.data.isComplete) {
            toast.success("HR Interview completed! Generating report...");
            onComplete(sessionId);
            return;
          }

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
        }
      } catch (err: any) {
        const fallbackText = `Thank you for sharing that experience. How do you handle feedback and align with your team when priorities shift?`;
        const aiMsg: HRMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content: fallbackText,
          timestamp: Date.now(),
          questionNumber: questionNumber + 1,
        };
        addMessage(aiMsg);
        setQuestionNumber(questionNumber + 1);
        conversationEngine.speak(fallbackText);
      } finally {
        setSending(false);
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

  // Non-zoomed Video framing
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
      interviewTitle="HR Behavioral Interview"
      targetRole={config.targetRole}
      companyName={config.targetCompany}
      difficulty="Behavioral"
      elapsedSeconds={elapsedSeconds}
      candidateVideoElement={candidateVideoNode}
      proctoringHUD={proctoringHUDNode}
      customOverlayContent={undefined}
      onPauseToggle={() => {
        if (conversationEngine.isPaused) {
          conversationEngine.resumeConversation();
        } else {
          conversationEngine.pauseConversation();
        }
      }}
      onMicToggle={conversationEngine.toggleCandidateMic}
      onEndInterview={async () => {
        conversationEngine.destroyEngine();
        try {
          if (sessionId) {
            toast.loading("Finalizing HR interview & generating AI report...", { id: "end-hr-session" });
            await api.post(`/interview/${sessionId}/end`).catch(async () => {
              await api.post(`/interview/hr/${sessionId}/end`).catch(() => {});
            });
            toast.success("Interview completed!", { id: "end-hr-session" });
          }
        } catch (e) {
          console.error("End HR session error:", e);
        } finally {
          onComplete(sessionId);
        }
      }}
      onMuteToggle={conversationEngine.toggleAiMute}
      onReplayLastQuestion={handleReplayQuestion}
      onSubmitAnswer={conversationEngine.triggerAutoSubmit}
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
