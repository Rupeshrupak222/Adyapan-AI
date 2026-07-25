"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { stripMarkdown } from "@/utils/stripMarkdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Send,
  PhoneOff,
  Wifi,
  WifiOff,
  Clock,
  MessageSquare,
  Brain,
  Volume2,
  VolumeX,
  AlertTriangle,
  Shield,
  User,
  Bot,
  Loader2,
  Info,
  Sparkles,
  Zap,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import FormattedMarkdown from "@/components/shared/FormattedMarkdown";
import type {
  EngineConfig,
  EngineMessage,
  EngineSession,
} from "./EngineTypes";
import { useEngineStore } from "./EngineStore";

interface EngineInterviewProps {
  sessionId: string;
  config: EngineConfig;
  onComplete: (sessionId: string) => void;
  onEnd: () => void;
  theme?: string;
}

type AIStatus = "listening" | "thinking" | "speaking" | "idle";
type InterviewPhase = "intro" | "early" | "mid" | "late" | "closing";

const PHASE_LABELS: Record<InterviewPhase, string> = {
  intro: "Introduction",
  early: "Early Stage",
  mid: "Mid Interview",
  late: "Final Stage",
  closing: "Closing",
};

const PHASE_TIPS: Record<string, string[]> = {
  default: [
    "Take a moment to think before answering",
    "Be concise but thorough",
    "Show your problem-solving approach",
    "Stay calm and confident",
  ],
};

function getPhaseTips(interviewType: string): string[] {
  return PHASE_TIPS[interviewType] || PHASE_TIPS.default;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getInterviewPhase(
  questionNumber: number,
  totalQuestions: number
): InterviewPhase {
  if (totalQuestions <= 0) return "intro";
  const pct = questionNumber / totalQuestions;
  if (pct <= 0) return "intro";
  if (pct <= 0.2) return "early";
  if (pct <= 0.6) return "mid";
  if (pct <= 0.85) return "late";
  return "closing";
}

const EngineInterview: React.FC<EngineInterviewProps> = ({
  sessionId,
  config,
  onComplete,
  onEnd,
  theme: propTheme,
}) => {
  const store = useEngineStore();
  const {
    messages,
    sending,
    isListening,
    liveTranscript,
    micLevel,
    connectionStatus,
    questionNumber,
    totalQuestions,
    setMessages,
    addMessage,
    setSending,
    setIsListening,
    setLiveTranscript,
    setMicLevel,
    setQuestionNumber,
    setTotalQuestions,
    setConnectionStatus,
  } = store;

  const theme = propTheme || (typeof window !== "undefined" ? (localStorage.getItem("adyapan-theme") || "dark") : "dark");
  const isDark = theme === "dark";
  const [aiStatus, setAiStatus] = useState<AIStatus>("idle");
  const [speechEnergy, setSpeechEnergy] = useState(0);
  const speechEnergyRef = useRef<NodeJS.Timeout | null>(null);
  const networkRetryCount = useRef(0);
  const [inputText, setInputText] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(config.aiVoiceEnabled);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef(true);
  const micEnabledRef = useRef(micEnabled);
  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);

  const totalDuration = config.durationMinutes * 60;
  const timeRemaining = Math.max(0, totalDuration - elapsedSeconds);
  const isTimeCritical = timeRemaining <= 300 && timeRemaining > 0;
  const isTimeUp = timeRemaining === 0 && elapsedSeconds > 0;
  const completionPct =
    totalQuestions > 0
      ? Math.min((questionNumber / totalQuestions) * 100, 100)
      : 0;

  const tips = useMemo(() => getPhaseTips(config.interviewType), [config.interviewType]);
  const phase = getInterviewPhase(questionNumber, totalQuestions);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  // ── Timer ──
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= totalDuration) {
          if (timerRef.current) clearInterval(timerRef.current);
          return totalDuration;
        }
        return prev + 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalDuration]);

  // ── Auto-end on time up ──
  useEffect(() => {
    if (isTimeUp && sessionLoaded && !sending) {
      toast.info("Time's up! Submitting final answer...");
      handleSubmitAnswer(true);
    }
  }, [isTimeUp]);

  // ── Cycle tips ──
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  // ── Scroll to latest ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load session ──
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await api.get(`/engine/${sessionId}`);
        const session: EngineSession = data.session || data;
        if (session.messages) {
          setMessages(session.messages);
          setTotalQuestions(session.questionCount || 15);
          const answered = session.messages.filter(
            (m: EngineMessage) => m.role === "candidate"
          ).length;
          setQuestionNumber(answered);
          const lastAI = [...session.messages]
            .reverse()
            .find((m: EngineMessage) => m.role === "interviewer");
          if (lastAI) setCurrentQuestionText(lastAI.content);
        }
        setSessionLoaded(true);
      } catch {
        toast.error("Failed to load session. Please try again.");
      }
    };
    loadSession();
  }, [sessionId]);

  // ── Speak the first question after session loads ──
  useEffect(() => {
    if (!sessionLoaded || !currentQuestionText) return;
    // Small delay to let UI render and SpeechSynthesis voices load
    const timer = setTimeout(() => {
      speak(currentQuestionText);
    }, 800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoaded]);

  // ── Mic level monitoring ──
  useEffect(() => {
    if (!micEnabled || !micStreamRef.current) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setMicLevel(0);
      return;
    }

    const startMonitoring = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") await ctx.resume();

        if (!analyserRef.current) {
          analyserRef.current = ctx.createAnalyser();
          analyserRef.current.fftSize = 256;
        }
        const analyser = analyserRef.current;

        if (micStreamRef.current) {
          const source = ctx.createMediaStreamSource(micStreamRef.current);
          source.connect(analyser);
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          const level = Math.min(Math.round((avg / 255) * 100), 100);
          setMicLevel(level);
          animFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch {
        setMicLevel(0);
      }
    };

    startMonitoring();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [micEnabled]);

  // ── Simulated speech energy for AI speaking waveform ──
  useEffect(() => {
    if (aiStatus !== "speaking") {
      setSpeechEnergy(0);
      if (speechEnergyRef.current) clearInterval(speechEnergyRef.current);
      return;
    }
    // Oscillate energy to simulate natural speech cadence
    let tick = 0;
    speechEnergyRef.current = setInterval(() => {
      tick++;
      // Simulate speech syllable cadence (~3-5 Hz oscillation)
      const base = 30 + Math.sin(tick * 0.3) * 20;
      const jitter = Math.sin(tick * 1.7) * 15 + Math.cos(tick * 0.9) * 10;
      const energy = Math.max(10, Math.min(100, base + jitter));
      setSpeechEnergy(Math.round(energy));
    }, 60);
    return () => {
      if (speechEnergyRef.current) clearInterval(speechEnergyRef.current);
    };
  }, [aiStatus]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (speechEnergyRef.current) clearInterval(speechEnergyRef.current);
    };
  }, []);

  // ── Speech Recognition ──
  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang =
      config.language === "hindi" ? "hi-IN" : "en-US";

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      const trimmed = currentTranscript.trim();
      if (trimmed) {
        setLiveTranscript(trimmed);
        setInputText(trimmed);
        networkRetryCount.current = 0;
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      if (err === "no-speech" || err === "aborted") return;
      if (err === "audio-capture") {
        toast.error("Microphone not found. Please check your device.");
      } else if (err === "not-allowed") {
        toast.error("Microphone access denied. Please allow permissions.");
        setMicEnabled(false);
        setIsListening(false);
      } else if (err === "network") {
        networkRetryCount.current++;
        if (networkRetryCount.current < 5) {
          const delay = Math.min(networkRetryCount.current * 1000, 3000);
          setTimeout(() => {
            if (isActiveRef.current && micEnabledRef.current) {
              try { recognition.start(); } catch {}
            }
          }, delay);
          return;
        }
        toast.error("Speech recognition lost connection. Mic disabled.");
        setMicEnabled(false);
        setIsListening(false);
        networkRetryCount.current = 0;
      } else {
        toast.error(`Speech error: ${err}`);
      }
    };

    recognition.onend = () => {
      if (isActiveRef.current && micEnabledRef.current) {
        networkRetryCount.current = 0;
        setTimeout(() => {
          if (isActiveRef.current && micEnabledRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 300);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {}
  }, [config.language, setIsListening, setLiveTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
    setLiveTranscript("");
  }, [setIsListening, setLiveTranscript]);

  // ── Toggle mic ──
  const toggleMic = useCallback(async () => {
    if (micEnabled) {
      micEnabledRef.current = false;
      setMicEnabled(false);
      stopListening();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop());
        micStreamRef.current = null;
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      micEnabledRef.current = true;
      setMicEnabled(true);
      startListening();
      toast.success("Microphone active — start speaking");
    } catch {
      toast.error("Could not access microphone. Please check permissions.");
    }
  }, [micEnabled, startListening, stopListening]);

  // ── Speech Synthesis ──
  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled) return;
      window.speechSynthesis.cancel();

      const cleaned = text
        .replace(/[*_#`]/g, "")
        .replace(/\n+/g, ". ");

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = config.voiceSpeed;
      utterance.pitch = config.voicePitch;
      utterance.lang =
        config.language === "hindi" ? "hi-IN" : "en-US";

      const voices = window.speechSynthesis.getVoices();
      if (config.voiceGender === "female") {
        const voice = voices.find(
          (v) =>
            v.name.includes("Female") ||
            v.name.includes("Samantha") ||
            v.name.includes("Zira")
        );
        if (voice) utterance.voice = voice;
      } else if (config.voiceGender === "male") {
        const voice = voices.find(
          (v) =>
            v.name.includes("Male") ||
            v.name.includes("Google UK English Male")
        );
        if (voice) utterance.voice = voice;
      } else {
        const voice = voices.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Google")
        );
        if (voice) utterance.voice = voice;
      }

      utterance.onstart = () => setAiStatus("speaking");
      utterance.onend = () => {
        setAiStatus("listening");
        if (isActiveRef.current && micEnabled) {
          startListening();
        }
      };
      utterance.onerror = () => {
        setAiStatus("listening");
        if (isActiveRef.current && micEnabled) {
          startListening();
        }
      };

      setAiStatus("speaking");
      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled, config, micEnabled, startListening]
  );

  // ── Submit answer ──
  const handleSubmitAnswer = useCallback(
    async (isAutoSubmit = false) => {
      const answer = inputText.trim();
      if (!answer && !isAutoSubmit) return;
      if (sending) return;

      const finalAnswer =
        isAutoSubmit && !answer
          ? "[Time expired - no answer submitted]"
          : answer;

      const candidateMsg: EngineMessage = {
        id: `candidate-${Date.now()}`,
        role: "candidate",
        content: finalAnswer,
        timestamp: Date.now(),
        questionNumber,
      };

      addMessage(candidateMsg);
      setInputText("");
      setLiveTranscript("");
      setSending(true);
      setAiStatus("thinking");

      if (recognitionRef.current && micEnabled) {
        try { recognitionRef.current.stop(); } catch {}
      }

      try {
        const { data } = await api.post(
          `/engine/${sessionId}/answer`,
          {
            answer: finalAnswer,
            questionNumber,
          }
        );

        const aiResponse: EngineMessage = {
          id: `ai-${Date.now()}`,
          role: "interviewer",
          content: data.nextQuestion || data.message || data.response,
          timestamp: Date.now(),
          questionNumber: data.nextQuestionNumber || questionNumber + 1,
          isFollowUp: data.isFollowUp || false,
        };

        addMessage(aiResponse);
        setCurrentQuestionText(aiResponse.content);

        const newQNum = data.nextQuestionNumber || questionNumber + 1;
        setQuestionNumber(newQNum);

        if (data.totalQuestions) setTotalQuestions(data.totalQuestions);

        if (data.isComplete) {
          setAiStatus("idle");
          toast.success("Interview complete! Generating your report...");
          onComplete(sessionId);
          return;
        }

        speak(aiResponse.content);
      } catch (err: any) {
        setAiStatus("idle");
        const msg =
          err?.response?.data?.message || "Failed to submit answer";
        toast.error(msg);

        if (err?.response?.data?.retryable !== false) {
          toast.info("You can try submitting again.");
        }
      } finally {
        setSending(false);
      }
    },
    [
      inputText,
      sending,
      questionNumber,
      sessionId,
      micEnabled,
      addMessage,
      setSending,
      setQuestionNumber,
      setTotalQuestions,
      setLiveTranscript,
      setCurrentQuestionText,
      speak,
      onComplete,
    ]
  );

  // ── End interview ──
  const handleEndInterview = useCallback(async () => {
    setShowEndConfirm(false);
    isActiveRef.current = false;
    stopListening();
    window.speechSynthesis.cancel();
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      await api.post(`/engine/${sessionId}/end`);
    } catch {}

    toast.info("Interview ended");
    onEnd();
  }, [sessionId, stopListening, onEnd]);

  // ── Connection status simulation ──
  useEffect(() => {
    const handleOnline = () => setConnectionStatus("connected");
    const handleOffline = () => setConnectionStatus("disconnected");
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setConnectionStatus]);

  // ── Keyboard shortcut ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (document.activeElement === inputRef.current) {
          e.preventDefault();
          handleSubmitAnswer();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleSubmitAnswer]);

  // ── Color palette ──
  const c = useMemo(
    () => ({
      bg: isDark ? "#080710" : "#f9fafb",
      surface: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6",
      surfaceHover: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
      border: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb",
      borderLight: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6",
      text: isDark ? "#ffffff" : "#111827",
      textSec: isDark ? "rgba(255,255,255,0.65)" : "#4b5563",
      textMuted: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af",
      primary: "#8b5cf6",
      primaryLight: "#a78bfa",
      primaryDark: "#6d28d9",
      accent: "#3b82f6",
      green: "#10b981",
      greenLight: "#34d399",
      red: "#ef4444",
      redLight: "#fca5a5",
      amber: "#f59e0b",
      cyan: "#06b6d4",
      cardBg: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      inputBg: isDark ? "rgba(0,0,0,0.5)" : "#ffffff",
      aiBubble: isDark ? "rgba(139,92,246,0.1)" : "#f5f3ff",
      aiBubbleText: isDark ? "#ffffff" : "#6b21a8",
      userBubble: isDark ? "rgba(59,130,246,0.12)" : "#eff6ff",
      userBubbleText: isDark ? "#ffffff" : "#1e40af",
      systemBubble: isDark ? "rgba(255,255,255,0.05)" : "#f3f4f6",
      gradient1: "linear-gradient(135deg, #6d28d9 0%, #3b82f6 100%)",
      gradient2: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)",
    }),
    [isDark]
  );

  if (!isMounted) return null;

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ fontFamily: "'Outfit', sans-serif", background: c.bg, minHeight: "calc(100vh - 70px - 2.5rem)" }}
    >
      {/* ════════════════ TOP BAR ════════════════ */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 h-14 border-b"
        style={{
          background: isDark
            ? "rgba(8,7,16,0.95)"
            : "rgba(249,250,251,0.95)",
          borderBottomColor: c.border,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Left section */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: c.green }}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span
              className="text-xs font-bold tracking-wider"
              style={{ color: c.green }}
            >
              LIVE
            </span>
          </div>

          {/* Interview type badge */}
          <div
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: isDark
                ? "rgba(139,92,246,0.15)"
                : "rgba(139,92,246,0.1)",
              color: c.primaryLight,
              border: `1px solid ${isDark ? "rgba(139,92,246,0.2)" : "rgba(139,92,246,0.15)"}`,
            }}
          >
            <Zap className="w-3 h-3" />
            {config.interviewType
              .split("-")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")}
          </div>

          {/* Role + Company */}
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <span
              className="text-sm font-medium truncate"
              style={{ color: c.text }}
            >
              {config.targetRole}
            </span>
            {config.targetCompany && (
              <>
                <span style={{ color: c.textMuted }}>@</span>
                <span
                  className="text-sm font-medium truncate"
                  style={{ color: c.primaryLight }}
                >
                  {config.targetCompany}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Center section */}
        <div className="flex items-center gap-4">
          {/* Timer */}
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold"
            style={{
              background: isTimeCritical
                ? isDark
                  ? "rgba(239,68,68,0.15)"
                  : "rgba(239,68,68,0.08)"
                : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
              color: isTimeCritical ? c.red : c.text,
              border: `1px solid ${isTimeCritical ? "rgba(239,68,68,0.3)" : c.border}`,
            }}
            animate={
              isTimeCritical
                ? {
                    boxShadow: [
                      "0 0 0 0 rgba(239,68,68,0)",
                      "0 0 20px 2px rgba(239,68,68,0.3)",
                      "0 0 0 0 rgba(239,68,68,0)",
                    ],
                  }
                : {}
            }
            transition={
              isTimeCritical ? { duration: 2, repeat: Infinity } : {}
            }
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(timeRemaining)}</span>
          </motion.div>

          {/* Question counter */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
              color: c.textSec,
              border: `1px solid ${c.border}`,
            }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="font-medium">
              Q {questionNumber}
              {totalQuestions > 0 ? `/${totalQuestions}` : ""}
            </span>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Violation meter */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
            style={{
              background:
                violationCount > 0
                  ? isDark
                    ? "rgba(245,158,11,0.12)"
                    : "rgba(245,158,11,0.08)"
                  : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
              color:
                violationCount > 0 ? c.amber : c.textMuted,
              border: `1px solid ${violationCount > 0 ? "rgba(245,158,11,0.25)" : c.border}`,
            }}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="font-medium">{violationCount}</span>
          </div>

          {/* Connection status */}
          <div
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
            style={{
              color:
                connectionStatus === "connected"
                  ? c.green
                  : connectionStatus === "reconnecting"
                    ? c.amber
                    : c.red,
            }}
          >
            {connectionStatus === "connected" ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : connectionStatus === "reconnecting" ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Wifi className="w-3.5 h-3.5" />
              </motion.div>
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
          </div>

          {/* Voice toggle */}
          <button
            onClick={() => setVoiceEnabled((v) => !v)}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: voiceEnabled
                ? isDark
                  ? "rgba(139,92,246,0.15)"
                  : "rgba(139,92,246,0.08)"
                : "transparent",
              color: voiceEnabled ? c.primaryLight : c.textMuted,
            }}
          >
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* End Interview */}
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: isDark
                ? "rgba(239,68,68,0.12)"
                : "rgba(239,68,68,0.08)",
              color: c.red,
              border: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.15)"}`,
            }}
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">End</span>
          </button>
        </div>
      </motion.header>

      {/* ════════════════ MAIN AREA ════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left Panel: Conversation (70%) ── */}
        <div
          className="flex-1 flex flex-col min-w-0"
          style={{ flexBasis: "70%", maxWidth: "70%" }}
        >
          {/* AI Interviewer Avatar + Current Question */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex-shrink-0 px-4 md:px-8 pt-6 pb-4"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: c.gradient1,
                    boxShadow: "0 0 40px rgba(109,40,217,0.3), 0 0 80px rgba(59,130,246,0.15)",
                  }}
                  animate={
                    aiStatus === "thinking"
                      ? { scale: [1, 1.03, 1] }
                      : aiStatus === "speaking"
                        ? {}
                        : { scale: [1, 1.02, 1] }
                  }
                  transition={{
                    duration: aiStatus === "speaking" ? 0 : 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Brain className="w-8 h-8 md:w-10 md:h-10 text-white relative z-10" />

                  {/* Speaking waveform bars — driven by simulated speech energy */}
                  {aiStatus === "speaking" && (
                    <motion.div
                      className="absolute inset-0 flex items-end justify-center gap-1 pb-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {[...Array(7)].map((_, i) => {
                        const center = 3;
                        const distFromCenter = Math.abs(i - center) / center;
                        const barFactor = 1 - distFromCenter * 0.4;
                        const baseHeight = 3;
                        const maxHeight = 22;
                        const height = baseHeight + (speechEnergy / 100) * (maxHeight - baseHeight) * barFactor;
                        return (
                          <div
                            key={i}
                            className="w-1 rounded-full bg-white/50"
                            style={{
                              height: `${Math.max(baseHeight, height)}px`,
                              transition: "height 0.07s ease-out",
                            }}
                          />
                        );
                      })}
                    </motion.div>
                  )}

                  {/* Thinking dots */}
                  {aiStatus === "thinking" && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="flex gap-1.5 mt-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-white"
                            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Status badge */}
                <motion.div
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      aiStatus === "speaking"
                        ? c.green
                        : aiStatus === "thinking"
                          ? c.amber
                          : aiStatus === "listening"
                            ? c.accent
                            : c.textMuted,
                    border: `2px solid ${c.bg}`,
                  }}
                  animate={
                    aiStatus === "listening"
                      ? { scale: [1, 1.15, 1] }
                      : {}
                  }
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {aiStatus === "speaking" ? (
                    <Volume2 className="w-3 h-3 text-white" />
                  ) : aiStatus === "thinking" ? (
                    <Brain className="w-3 h-3 text-white" />
                  ) : aiStatus === "listening" ? (
                    <Mic className="w-3 h-3 text-white" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/60" />
                  )}
                </motion.div>
              </div>

              {/* Current question display */}
              <div className="flex-1 min-w-0">
                <div
                  className="flex items-center gap-2 mb-2"
                >
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: c.primaryLight }}
                  >
                    Current Question
                  </span>
                  {questionNumber > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: isDark
                          ? "rgba(139,92,246,0.15)"
                          : "rgba(139,92,246,0.1)",
                        color: c.primaryLight,
                      }}
                    >
                      Q{questionNumber}
                    </span>
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestionText || "empty"}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                  >
                    {currentQuestionText ? (
                      <FormattedMarkdown content={currentQuestionText} isDark={isDark} className="text-base md:text-lg leading-relaxed" />
                    ) : (
                      <span style={{ color: c.textMuted }}>
                        Waiting for interview to begin...
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* Divider */}
          <div
            className="mx-4 md:mx-8 h-px"
            style={{ background: c.border }}
          />

          {/* Message Thread */}
          <div
            className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-4"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: isDark
                ? "rgba(255,255,255,0.1) transparent"
                : "rgba(0,0,0,0.1) transparent",
            }}
          >
            {messages.length === 0 && sessionLoaded && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-16"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: isDark
                      ? "rgba(139,92,246,0.1)"
                      : "rgba(139,92,246,0.06)",
                  }}
                >
                  <MessageSquare
                    className="w-8 h-8"
                    style={{ color: c.primaryLight }}
                  />
                </div>
                <p className="text-sm" style={{ color: c.textMuted }}>
                  The interview will begin shortly...
                </p>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className={`flex ${
                    msg.role === "candidate"
                      ? "justify-end"
                      : msg.role === "system"
                        ? "justify-center"
                        : "justify-start"
                  }`}
                >
                  {msg.role === "system" ? (
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-full text-xs"
                      style={{
                        background: c.systemBubble,
                        color: c.textMuted,
                        border: `1px solid ${c.borderLight}`,
                      }}
                    >
                      <Info className="w-3 h-3" />
                      {stripMarkdown(msg.content)}
                    </div>
                  ) : (
                    <div
                      className={`flex gap-3 max-w-[85%] ${
                        msg.role === "candidate" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {/* Avatar */}
                      {msg.role === "interviewer" && (
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-1"
                          style={{
                            background: c.gradient1,
                          }}
                        >
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* Bubble */}
                      <div>
                        <div
                          className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                          style={{
                            background:
                              msg.role === "candidate"
                                ? c.userBubble
                                : c.aiBubble,
                            color: c.text,
                            border: `1px solid ${
                              msg.role === "candidate"
                                ? isDark
                                  ? "rgba(59,130,246,0.2)"
                                  : "rgba(59,130,246,0.12)"
                                : isDark
                                  ? "rgba(139,92,246,0.15)"
                                  : "rgba(139,92,246,0.1)"
                            }`,
                            borderTopRightRadius:
                              msg.role === "candidate" ? "6px" : undefined,
                            borderTopLeftRadius:
                              msg.role === "interviewer" ? "6px" : undefined,
                          }}
                        >
                          {stripMarkdown(msg.content)}
                        </div>
                        <div
                          className={`flex items-center gap-2 mt-1 ${
                            msg.role === "candidate"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {msg.questionNumber && (
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{
                                background: isDark
                                  ? "rgba(255,255,255,0.05)"
                                  : "rgba(0,0,0,0.04)",
                                color: c.textMuted,
                              }}
                            >
                              Q{msg.questionNumber}
                            </span>
                          )}
                          <span
                            className="text-[10px]"
                            style={{ color: c.textMuted }}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>

                      {msg.role === "candidate" && (
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-1"
                          style={{
                            background: isDark
                              ? "rgba(59,130,246,0.2)"
                              : "rgba(59,130,246,0.1)",
                            border: `1px solid ${isDark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.15)"}`,
                          }}
                        >
                          <User className="w-4 h-4" style={{ color: c.accent }} />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Thinking indicator */}
            {aiStatus === "thinking" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: c.gradient1 }}
                >
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-md"
                  style={{
                    background: c.aiBubble,
                    border: `1px solid ${isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)"}`,
                  }}
                >
                  <div className="flex gap-1.5 items-center h-5">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{ background: c.primaryLight }}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Live Transcript Overlay ── */}
          <AnimatePresence>
            {micEnabled && isListening && liveTranscript && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-4 md:mx-8 mb-2"
              >
                <div
                  className="relative px-4 py-3 rounded-xl overflow-hidden"
                  style={{
                    background: isDark
                      ? "rgba(6,182,212,0.08)"
                      : "rgba(6,182,212,0.05)",
                    border: `1px solid ${isDark ? "rgba(6,182,212,0.25)" : "rgba(6,182,212,0.15)"}`,
                  }}
                >
                  {/* Animated border */}
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      border: "1px solid transparent",
                      borderImage:
                        "linear-gradient(90deg, transparent, #06b6d4, transparent) 1",
                    }}
                    animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-2 h-2 rounded-full"
                      style={{ background: c.cyan }}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span
                      className="text-xs font-medium uppercase tracking-wider"
                      style={{ color: c.cyan }}
                    >
                      Listening
                    </span>
                  </div>
                  <p
                    className="mt-1.5 text-sm"
                    style={{ color: c.textSec }}
                  >
                    {liveTranscript}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Input Area ── */}
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex-shrink-0 px-4 md:px-8 pb-4 pt-2"
          >
            {/* Mic waveform during recording — driven by real micLevel */}
            <AnimatePresence>
              {micEnabled && isListening && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 40, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex items-center justify-center gap-0.5 mb-2 overflow-hidden"
                >
                  {[...Array(24)].map((_, i) => {
                    const center = 11.5;
                    const distFromCenter = Math.abs(i - center) / center;
                    const barFactor = 1 - distFromCenter * 0.6;
                    const baseHeight = 3;
                    const maxHeight = 36;
                    const height = baseHeight + (micLevel / 100) * (maxHeight - baseHeight) * barFactor;
                    const intensity = micLevel / 100;
                    const barColor = intensity > 0.75 ? c.red : intensity > 0.45 ? c.amber : c.cyan;
                    return (
                      <div
                        key={i}
                        className="rounded-full"
                        style={{
                          width: 2,
                          height: `${Math.max(baseHeight, height)}px`,
                          background: barColor,
                          opacity: 0.4 + (micLevel / 100) * 0.5,
                          transition: "height 0.06s ease-out, background 0.15s ease, opacity 0.15s ease",
                        }}
                      />
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            <div
              className="flex items-end gap-3 p-3 rounded-2xl"
              style={{
                background: c.cardBg,
                border: `1px solid ${micEnabled ? (isDark ? "rgba(6,182,212,0.2)" : "rgba(6,182,212,0.15)") : c.border}`,
              }}
            >
              {/* Mic button */}
              <motion.button
                onClick={toggleMic}
                whileTap={{ scale: 0.92 }}
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: micEnabled
                    ? isDark
                      ? "rgba(6,182,212,0.2)"
                      : "rgba(6,182,212,0.12)"
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                  color: micEnabled ? c.cyan : c.textMuted,
                  border: `1px solid ${micEnabled ? (isDark ? "rgba(6,182,212,0.3)" : "rgba(6,182,212,0.2)") : c.border}`,
                }}
              >
                {micEnabled ? (
                  <Mic className="w-5 h-5" />
                ) : (
                  <MicOff className="w-5 h-5" />
                )}
                {micEnabled && (
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      border: `2px solid ${c.cyan}`,
                    }}
                    animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                )}
              </motion.button>

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  micEnabled && isListening
                    ? "Listening... (speak now) or type here..."
                    : "Type your answer..."
                }
                rows={1}
                className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed py-2.5 px-1 min-h-[40px] max-h-[120px]"
                style={{
                  color: c.text,
                  caretColor: c.primary,
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 120) + "px";
                }}
                disabled={sending}
              />

              {/* Send button */}
              <motion.button
                onClick={() => handleSubmitAnswer()}
                whileTap={{ scale: 0.92 }}
                disabled={!inputText.trim() || sending}
                className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background:
                    inputText.trim() && !sending
                      ? c.gradient1
                      : isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(0,0,0,0.03)",
                  color:
                    inputText.trim() && !sending ? "white" : c.textMuted,
                  opacity: !inputText.trim() || sending ? 0.5 : 1,
                  cursor: !inputText.trim() || sending
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {sending ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </motion.button>
            </div>

            <p
              className="text-center text-[11px] mt-2"
              style={{ color: c.textMuted }}
            >
              Press <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${c.border}` }}>Enter</kbd> to send
              {" "}&middot;{" "}
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", border: `1px solid ${c.border}` }}>Shift+Enter</kbd> for new line
            </p>
          </motion.div>
        </div>

        {/* ── Divider ── */}
        <div
          className="hidden lg:block w-px"
          style={{ background: c.border }}
        />

        {/* ── Right Panel: Status & Controls (30%) ── */}
        <motion.aside
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="hidden lg:flex flex-col w-[30%] max-w-[360px] overflow-y-auto p-4 gap-4"
          style={{
            background: isDark
              ? "rgba(255,255,255,0.015)"
              : "rgba(0,0,0,0.01)",
          }}
        >
          {/* ── 1. Interview Progress ── */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: c.textMuted }}
            >
              Progress
            </h3>

            <div className="flex items-center gap-4">
              {/* Circular progress ring */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 28}
                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                    animate={{
                      strokeDashoffset:
                        2 * Math.PI * 28 * (1 - completionPct / 100),
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className="text-sm font-bold"
                    style={{ color: c.text }}
                  >
                    {Math.round(completionPct)}%
                  </span>
                </div>
              </div>

              {/* Phase info */}
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-semibold mb-1"
                  style={{ color: c.text }}
                >
                  {PHASE_LABELS[phase]}
                </div>
                <div className="flex gap-1">
                  {(["intro", "early", "mid", "late", "closing"] as InterviewPhase[]).map(
                    (p) => (
                      <div
                        key={p}
                        className="h-1 flex-1 rounded-full"
                        style={{
                          background:
                            getPhaseIndex(p) <= getPhaseIndex(phase)
                              ? c.gradient1
                              : isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.06)",
                        }}
                      />
                    )
                  )}
                </div>
                <div
                  className="text-xs mt-2"
                  style={{ color: c.textMuted }}
                >
                  Q{questionNumber} of {totalQuestions || "?"} answered
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. AI Status ── */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: c.textMuted }}
            >
              AI Status
            </h3>

            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    aiStatus === "speaking"
                      ? isDark
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(16,185,129,0.08)"
                      : aiStatus === "thinking"
                        ? isDark
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(245,158,11,0.08)"
                        : aiStatus === "listening"
                          ? isDark
                            ? "rgba(59,130,246,0.15)"
                            : "rgba(59,130,246,0.08)"
                          : isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                }}
              >
                {aiStatus === "speaking" ? (
                  <Volume2 className="w-5 h-5" style={{ color: c.green }} />
                ) : aiStatus === "thinking" ? (
                  <Brain className="w-5 h-5" style={{ color: c.amber }} />
                ) : aiStatus === "listening" ? (
                  <Mic className="w-5 h-5" style={{ color: c.accent }} />
                ) : (
                  <Bot className="w-5 h-5" style={{ color: c.textMuted }} />
                )}
              </div>

              <div className="flex-1">
                <div
                  className="text-sm font-medium capitalize"
                  style={{
                    color:
                      aiStatus === "speaking"
                        ? c.green
                        : aiStatus === "thinking"
                          ? c.amber
                          : aiStatus === "listening"
                            ? c.accent
                            : c.textSec,
                  }}
                >
                  {aiStatus === "idle" ? "Ready" : aiStatus}
                </div>

                {/* Animated bars for speaking */}
                {aiStatus === "speaking" && (
                  <div className="flex items-end gap-0.5 h-4 mt-1">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 rounded-full"
                        style={{ background: c.green }}
                        animate={{
                          height: ["3px", "10px", "5px", "14px", "3px"],
                        }}
                        transition={{
                          duration: 0.7,
                          repeat: Infinity,
                          delay: i * 0.08,
                          ease: "easeInOut",
                        }}
                      />
                    ))}
                  </div>
                )}

                {aiStatus === "thinking" && (
                  <div className="flex gap-1 mt-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: c.amber }}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </div>
                )}

                {aiStatus === "listening" && (
                  <div
                    className="text-xs mt-0.5"
                    style={{ color: c.textMuted }}
                  >
                    Waiting for your answer...
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Session Info ── */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
            }}
          >
            <h3
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: c.textMuted }}
            >
              Session Info
            </h3>

            <div className="space-y-2.5">
              <InfoRow
                label="Role"
                value={config.targetRole || "Not set"}
                color={c}
              />
              {config.targetCompany && (
                <InfoRow
                  label="Company"
                  value={config.targetCompany}
                  color={c}
                  valueColor={c.primaryLight}
                />
              )}
              <InfoRow
                label="Type"
                value={
                  config.interviewType
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")
                }
                color={c}
              />
              <InfoRow
                label="Difficulty"
                value={
                  config.difficulty === "easy"
                    ? "Beginner"
                    : config.difficulty === "medium"
                      ? "Intermediate"
                      : "Advanced"
                }
                color={c}
                valueColor={
                  config.difficulty === "hard"
                    ? c.red
                    : config.difficulty === "medium"
                      ? c.amber
                      : c.green
                }
              />
              <InfoRow
                label="Duration"
                value={`${config.durationMinutes} min`}
                color={c}
              />
              {config.technology && (
                <InfoRow
                  label="Technology"
                  value={config.technology}
                  color={c}
                />
              )}
              <InfoRow
                label="Language"
                value={
                  config.language === "hindi"
                    ? "Hindi"
                    : config.language === "english"
                      ? "English"
                      : config.language
                }
                color={c}
              />
            </div>
          </div>

          {/* ── 4. Quick Tips ── */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: c.amber }} />
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: c.textMuted }}
              >
                Quick Tip
              </h3>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                className="text-sm leading-relaxed"
                style={{ color: c.textSec }}
              >
                {tips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* ── 5. Microphone Level ── */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: c.textMuted }}
              >
                Mic Level
              </h3>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: micEnabled ? c.green : c.textMuted,
                  }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: micEnabled ? c.green : c.textMuted }}
                >
                  {micEnabled ? "Active" : "Off"}
                </span>
              </div>
            </div>

            {/* Vertical bar meter */}
            <div className="flex items-end justify-center gap-1 h-16">
              {[...Array(12)].map((_, i) => {
                const threshold = ((i + 1) / 12) * 100;
                const isLit = micLevel >= threshold;
                const isHigh = i >= 9;
                return (
                  <motion.div
                    key={i}
                    className="w-3 rounded-sm"
                    style={{
                      height: `${(i + 1) * (100 / 12)}%`,
                      background: isLit
                        ? isHigh
                          ? c.red
                          : i >= 6
                            ? c.amber
                            : c.green
                        : isDark
                          ? "rgba(255,255,255,0.05)"
                          : "rgba(0,0,0,0.05)",
                      transition: "background 0.1s ease",
                    }}
                  />
                );
              })}
            </div>
          </div>
        </motion.aside>
      </div>

      {/* ════════════════ END INTERVIEW CONFIRM MODAL ════════════════ */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            onClick={() => setShowEndConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-2xl p-6"
              style={{
                background: isDark ? "#141220" : "#ffffff",
                border: `1px solid ${c.border}`,
                boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: isDark
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(239,68,68,0.08)",
                  }}
                >
                  <AlertTriangle className="w-5 h-5" style={{ color: c.red }} />
                </div>
                <div>
                  <h3
                    className="text-base font-semibold"
                    style={{ color: c.text }}
                  >
                    End Interview?
                  </h3>
                  <p
                    className="text-xs"
                    style={{ color: c.textMuted }}
                  >
                    Progress will be lost if not completed
                  </p>
                </div>
              </div>

              <p
                className="text-sm mb-5 leading-relaxed"
                style={{ color: c.textSec }}
              >
                You&apos;ve answered {questionNumber} question{questionNumber !== 1 ? "s" : ""}.
                Ending now will terminate this session.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                    color: c.text,
                    border: `1px solid ${c.border}`,
                  }}
                >
                  Continue
                </button>
                <button
                  onClick={handleEndInterview}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
                  style={{
                    background: c.red,
                  }}
                >
                  End Interview
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════ MOBILE BOTTOM BAR (Status on small screens) ════════════════ */}
      <div
        className="lg:hidden flex-shrink-0 flex items-center justify-around px-4 py-2 border-t"
        style={{
          background: isDark ? "rgba(8,7,16,0.95)" : "rgba(249,250,251,0.95)",
          borderTopColor: c.border,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Timer */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: isTimeCritical ? c.red : c.textSec }}>
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono font-medium">{formatTime(timeRemaining)}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: c.textSec }}>
          <Target className="w-3.5 h-3.5" />
          <span className="font-medium">
            Q{questionNumber}/{totalQuestions || "?"}
          </span>
        </div>

        {/* AI Status */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: c.textSec }}>
          {aiStatus === "speaking" ? (
            <Volume2 className="w-3.5 h-3.5" style={{ color: c.green }} />
          ) : aiStatus === "thinking" ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
              <Brain className="w-3.5 h-3.5" style={{ color: c.amber }} />
            </motion.div>
          ) : (
            <Mic className="w-3.5 h-3.5" style={{ color: micEnabled ? c.cyan : c.textMuted }} />
          )}
          <span className="font-medium capitalize">{aiStatus === "idle" ? "Ready" : aiStatus}</span>
        </div>

        {/* Violation */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: violationCount > 0 ? c.amber : c.textMuted }}>
          <Shield className="w-3.5 h-3.5" />
          <span className="font-medium">{violationCount}</span>
        </div>
      </div>
    </div>
  );
};

// ── Helpers ──

function getPhaseIndex(phase: InterviewPhase): number {
  const order: InterviewPhase[] = ["intro", "early", "mid", "late", "closing"];
  return order.indexOf(phase);
}

function InfoRow({
  label,
  value,
  color,
  valueColor,
}: {
  label: string;
  value: string;
  color: Record<string, string>;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: color.textMuted }}>
        {label}
      </span>
      <span
        className="text-xs font-medium truncate max-w-[60%] text-right"
        style={{ color: valueColor || color.text }}
      >
        {value}
      </span>
    </div>
  );
}

export default EngineInterview;
