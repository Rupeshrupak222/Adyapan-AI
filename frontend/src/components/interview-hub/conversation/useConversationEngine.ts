"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";
import { logInterview, logInterviewError } from "../shared/interviewLogger";
import type {
  ConversationState,
  SilenceStage,
  ConversationConfig,
  ConversationCallbacks,
} from "./conversation-types";

const DEFAULT_THRESHOLDS = {
  shortPause: 2000,
  thinkingPause: 5000,
  hintPause: 10000,
  confirmPause: 15000,
  finalizePause: 20000,
};

export interface UseConversationEngineOptions {
  config?: ConversationConfig;
  callbacks: ConversationCallbacks;
  initialQuestion?: string;
}

export function useConversationEngine({
  config = {},
  callbacks,
  initialQuestion,
}: UseConversationEngineOptions) {
  const [state, setState] = useState<ConversationState>("AI_SPEAKING");
  const [silenceStage, setSilenceStage] = useState<SilenceStage>("none");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [accumulatedTranscript, setAccumulatedTranscript] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isAiMuted, setIsAiMuted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [textModeEnabled, setTextModeEnabled] = useState(false);
  const [avatarAudioUrl, setAvatarAudioUrl] = useState<string | null>(null);
  const [avatarVideoUrl, setAvatarVideoUrl] = useState<string | null>(null);

  const thresholds = { ...DEFAULT_THRESHOLDS, ...config.silenceThresholdMs };

  // Persistent Refs
  const stateRef = useRef<ConversationState>(state);
  useEffect(() => {
    logInterview("State", `Transitioned to -> ${state}`);
    stateRef.current = state;
    callbacks.onStateChange?.(state);
  }, [state, callbacks]);

  const accumulatedTranscriptRef = useRef(accumulatedTranscript);
  useEffect(() => {
    accumulatedTranscriptRef.current = accumulatedTranscript;
  }, [accumulatedTranscript]);

  const liveTranscriptRef = useRef(liveTranscript);
  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  const isMicEnabledRef = useRef(isMicEnabled);
  useEffect(() => {
    isMicEnabledRef.current = isMicEnabled;
  }, [isMicEnabled]);

  const isAiMutedRef = useRef(isAiMuted);
  useEffect(() => {
    isAiMutedRef.current = isAiMuted;
  }, [isAiMuted]);

  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Operational guard refs
  const isSubmittingRef = useRef<boolean>(false);
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const speechWatchdogRef = useRef<NodeJS.Timeout | null>(null);
  const speechKeepAliveRef = useRef<NodeJS.Timeout | null>(null);

  // Audio / Speech refs
  const recognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const avatarPollRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const activeAudioElementRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic voice loading state ref
  const availableVoicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const updateVoices = () => {
        availableVoicesRef.current = window.speechSynthesis.getVoices();
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Clear silence tracking timers
  const clearSilenceTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setSilenceStage("none");
  }, []);

  // Clear Speech Synthesis Keep-Alive & Watchdog
  const clearSpeechWatchdogs = useCallback(() => {
    if (speechWatchdogRef.current) {
      clearTimeout(speechWatchdogRef.current);
      speechWatchdogRef.current = null;
    }
    if (speechKeepAliveRef.current) {
      clearInterval(speechKeepAliveRef.current);
      speechKeepAliveRef.current = null;
    }
  }, []);

  // Stop TTS speech or avatar playback
  const stopSpeech = useCallback(() => {
    clearSpeechWatchdogs();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (activeAudioElementRef.current) {
      try {
        activeAudioElementRef.current.pause();
        activeAudioElementRef.current = null;
      } catch {}
    }
    if (avatarPollRef.current) {
      clearInterval(avatarPollRef.current);
      avatarPollRef.current = null;
    }
    setAvatarAudioUrl(null);
    setAvatarVideoUrl(null);
    logInterview("SpeechSynthesis", "Stopped speech");
  }, [clearSpeechWatchdogs]);

  // Finalize and submit accumulated answer
  const triggerAutoSubmit = useCallback(async () => {
    if (isSubmittingRef.current) return;
    clearSilenceTimers();

    const fullText = (
      accumulatedTranscriptRef.current + " " + liveTranscriptRef.current
    ).trim();

    if (!fullText) {
      toast.info("No response heard. Still listening...");
      setState("WAITING_FOR_CANDIDATE");
      lastSpeechTimeRef.current = Date.now();
      return;
    }

    isSubmittingRef.current = true;
    logInterview("Turn", "Auto-submitting answer", fullText);

    // Stop recognition & set state to PROCESSING
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
    setState("PROCESSING");

    try {
      await callbacks.onSubmitAnswer(fullText);
      setLiveTranscript("");
      setAccumulatedTranscript("");
    } catch (err) {
      logInterviewError("Turn", "Submission error in engine", err);
      setLiveTranscript("");
      setAccumulatedTranscript("");
    } finally {
      isSubmittingRef.current = false;
    }
  }, [callbacks, clearSilenceTimers]);

  // Start Smart Silence Monitor
  const startSilenceMonitor = useCallback(() => {
    clearSilenceTimers();
    lastSpeechTimeRef.current = Date.now();

    silenceTimerRef.current = setInterval(() => {
      if (isPausedRef.current || isSubmittingRef.current) return;
      const currentState = stateRef.current;
      if (
        currentState !== "LISTENING" &&
        currentState !== "SHORT_PAUSE" &&
        currentState !== "LONG_PAUSE_CONFIRMATION" &&
        currentState !== "WAITING_FOR_CANDIDATE"
      ) {
        return;
      }

      const elapsed = Date.now() - lastSpeechTimeRef.current;

      if (elapsed >= thresholds.finalizePause) {
        setSilenceStage("finalizing");
        triggerAutoSubmit();
      } else if (elapsed >= thresholds.confirmPause) {
        setSilenceStage("confirming");
        if (currentState !== "LONG_PAUSE_CONFIRMATION") {
          setState("LONG_PAUSE_CONFIRMATION");
        }
      } else if (elapsed >= thresholds.hintPause) {
        setSilenceStage("waiting_hint");
      } else if (elapsed >= thresholds.thinkingPause) {
        setSilenceStage("thinking");
      } else if (elapsed >= thresholds.shortPause) {
        setSilenceStage("brief");
        if (currentState === "LISTENING") {
          setState("SHORT_PAUSE");
        }
      }
    }, 500);
  }, [clearSilenceTimers, thresholds, triggerAutoSubmit]);

  // Interruption logic: Candidate starts speaking while AI is speaking
  const handleCandidateInterruption = useCallback(() => {
    if (stateRef.current === "AI_SPEAKING" && !isSubmittingRef.current) {
      logInterview("VAD", "Candidate interrupted interviewer");
      stopSpeech();
      callbacks.onInterrupted?.();
      toast.info("Interrupted interviewer — listening to you");
      setState("LISTENING");
      lastSpeechTimeRef.current = Date.now();
      startSilenceMonitor();
    }
  }, [stopSpeech, callbacks, startSilenceMonitor]);

  // Start Mic Audio Energy Monitoring (VAD)
  const startMicMonitoring = useCallback(async () => {
    try {
      if (micStreamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      setIsMicEnabled(true);

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((acc, val) => acc + val, 0);
        const avg = sum / dataArray.length;
        const level = Math.min(Math.round((avg / 255) * 100), 100);
        setMicLevel(level);
        callbacks.onMicLevelChange?.(level);

        // Voice Activity Detection threshold for interruption
        if (level > 25 && stateRef.current === "AI_SPEAKING") {
          handleCandidateInterruption();
        }

        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      logInterviewError("VAD", "Microphone access failed", err);
      setIsMicEnabled(false);
    }
  }, [callbacks, handleCandidateInterruption]);

  // Stop Mic Stream
  const stopMicMonitoring = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsMicEnabled(false);
    setMicLevel(0);
  }, []);

  // Web Speech API initialization with state guards
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (isStartingRef.current) return;
    isStartingRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = config.language === "hindi" ? "hi-IN" : "en-US";

    recognition.onstart = () => {
      isListeningRef.current = true;
      isStartingRef.current = false;
      logInterview("SpeechRecognition", "Recognition session started");
    };

    recognition.onresult = (event: any) => {
      if (isPausedRef.current || isSubmittingRef.current) return;
      lastSpeechTimeRef.current = Date.now();

      let currentInterim = "";
      let newlyFinalized = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newlyFinalized += transcriptChunk + " ";
        } else {
          currentInterim += transcriptChunk;
        }
      }

      if (newlyFinalized) {
        setAccumulatedTranscript((prev) => (prev + " " + newlyFinalized).trim());
      }
      setLiveTranscript(currentInterim.trim());

      // Update state to LISTENING when speech detected
      if (
        stateRef.current === "WAITING_FOR_CANDIDATE" ||
        stateRef.current === "SHORT_PAUSE" ||
        stateRef.current === "LONG_PAUSE_CONFIRMATION"
      ) {
        setState("LISTENING");
      }
      setSilenceStage("none");
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      logInterviewError("SpeechRecognition", `Error encountered: ${err}`, event);
      if (err === "no-speech" || err === "aborted") return;
      if (err === "not-allowed") {
        toast.error("Microphone permission denied.");
        setIsMicEnabled(false);
      }
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      isStartingRef.current = false;
      logInterview("SpeechRecognition", "Recognition session ended");

      // Auto-restart recognition if engine is in a listening state and not submitting
      const currentState = stateRef.current;
      if (
        !isPausedRef.current &&
        !isSubmittingRef.current &&
        isMicEnabledRef.current &&
        (currentState === "WAITING_FOR_CANDIDATE" ||
          currentState === "LISTENING" ||
          currentState === "SHORT_PAUSE" ||
          currentState === "LONG_PAUSE_CONFIRMATION")
      ) {
        setTimeout(() => {
          try {
            if (!isListeningRef.current && !isStartingRef.current) {
              recognition.start();
            }
          } catch (e) {
            logInterviewError("SpeechRecognition", "Auto-restart failed", e);
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      isStartingRef.current = false;
      logInterviewError("SpeechRecognition", "Initial recognition start failed", e);
    }
  }, [config.language]);

  // Open Microphone automatically for natural turn taking
  const openMicAuto = useCallback(async () => {
    logInterview("Turn", "Opening mic automatically for candidate turn");
    await startMicMonitoring();
    startSpeechRecognition();
    startSilenceMonitor();
    setState("WAITING_FOR_CANDIDATE");
  }, [startMicMonitoring, startSpeechRecognition, startSilenceMonitor]);

  // Core Speak Function (AI Interviewer Voice with Watchdogs)
  const speak = useCallback(
    async (text: string) => {
      if (!text) return;
      stopSpeech();
      clearSilenceTimers();

      setState("AI_SPEAKING");
      logInterview("SpeechSynthesis", "AI Speaking started", text.substring(0, 40) + "...");
      const cleaned = text.replace(/[*_#`]/g, "").replace(/\n+/g, ". ");

      // Check backend audio avatar service if available
      let playedAvatarAudio = false;
      try {
        const res = await api.post(
          "/avatar/speak",
          { text: cleaned },
          { responseType: "arraybuffer" }
        );
        const contentType = (res.headers as any)["content-type"] || "";
        const mode = (res.headers as any)["x-avatar-mode"];

        if (mode === "did" || (res.data as any)?.mode === "did") {
          const json = JSON.parse(Buffer.from(res.data).toString());
          const talkId = json.talkId;
          if (talkId) {
            if (avatarPollRef.current) clearInterval(avatarPollRef.current);
            avatarPollRef.current = setInterval(async () => {
              try {
                const statusRes = await api.get(`/avatar/status/${talkId}`);
                if (statusRes.data.status === "done" && statusRes.data.videoUrl) {
                  setAvatarVideoUrl(statusRes.data.videoUrl);
                  if (avatarPollRef.current) clearInterval(avatarPollRef.current);
                }
              } catch {}
            }, 1500);
          }
          playedAvatarAudio = true;
        } else if (contentType.includes("audio/mpeg") || mode === "elevenlabs") {
          const blob = new Blob([res.data], { type: "audio/mpeg" });
          const url = URL.createObjectURL(blob);
          setAvatarAudioUrl(url);

          const audio = new Audio(url);
          activeAudioElementRef.current = audio;
          audio.onended = () => openMicAuto();
          audio.onerror = () => openMicAuto();
          if (!isAiMutedRef.current) {
            audio.play().catch(() => openMicAuto());
          } else {
            openMicAuto();
          }
          playedAvatarAudio = true;
        }
      } catch {
        // Fallback to Web Speech API
      }

      if (playedAvatarAudio) return;

      // Web Speech API fallback with Keep-Alive & Safety Watchdog
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        !isAiMutedRef.current
      ) {
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = config.voiceSpeed || 0.95;
        utterance.pitch = config.voicePitch || 1;
        utterance.lang = config.language === "hindi" ? "hi-IN" : "en-US";

        const voices =
          availableVoicesRef.current.length > 0
            ? availableVoicesRef.current
            : window.speechSynthesis.getVoices();

        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith(config.language === "hindi" ? "hi" : "en") &&
            (config.voiceGender === "female"
              ? v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Google")
              : v.name.includes("Male") || v.name.includes("David"))
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        // Safety Watchdog: max expected speech time based on word count + buffer
        const expectedDurationMs = Math.max(
          4000,
          Math.min(30000, cleaned.length * 95)
        );

        const onFinishedSpeech = () => {
          clearSpeechWatchdogs();
          openMicAuto();
        };

        utterance.onend = () => {
          logInterview("SpeechSynthesis", "Utterance finished cleanly");
          onFinishedSpeech();
        };

        utterance.onerror = (e) => {
          logInterviewError("SpeechSynthesis", "Utterance error", e);
          onFinishedSpeech();
        };

        // Watchdog timeout to prevent stuck AI_SPEAKING state
        speechWatchdogRef.current = setTimeout(() => {
          logInterviewError("SpeechSynthesis", "Watchdog triggered: utterance took too long or failed to emit end event");
          try {
            window.speechSynthesis.cancel();
          } catch {}
          onFinishedSpeech();
        }, expectedDurationMs + 3000);

        // Chrome keep-alive pulse (pauses and resumes every 8 seconds during speech)
        speechKeepAliveRef.current = setInterval(() => {
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            if (window.speechSynthesis.speaking) {
              window.speechSynthesis.pause();
              window.speechSynthesis.resume();
            }
          }
        }, 8000);

        window.speechSynthesis.speak(utterance);
      } else {
        // Muted or unsupported: brief delay then open mic
        setTimeout(() => {
          openMicAuto();
        }, 2000);
      }
    },
    [
      stopSpeech,
      clearSilenceTimers,
      clearSpeechWatchdogs,
      openMicAuto,
      config.voiceSpeed,
      config.voicePitch,
      config.language,
      config.voiceGender,
    ]
  );

  // Speech Recognition Heartbeat Watchdog
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (isPausedRef.current || isSubmittingRef.current) return;
      const currState = stateRef.current;
      if (
        (currState === "WAITING_FOR_CANDIDATE" ||
          currState === "LISTENING" ||
          currState === "SHORT_PAUSE" ||
          currState === "LONG_PAUSE_CONFIRMATION") &&
        isMicEnabledRef.current &&
        !isListeningRef.current &&
        !isStartingRef.current
      ) {
        logInterview("SpeechRecognition", "Heartbeat detected stopped recognition, recovering...");
        startSpeechRecognition();
      }
    }, 2000);

    return () => clearInterval(heartbeat);
  }, [startSpeechRecognition]);

  // Manual actions
  const pauseConversation = useCallback(() => {
    setIsPaused(true);
    stopSpeech();
    clearSilenceTimers();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isListeningRef.current = false;
  }, [stopSpeech, clearSilenceTimers]);

  const resumeConversation = useCallback(() => {
    setIsPaused(false);
    openMicAuto();
  }, [openMicAuto]);

  const toggleAiMute = useCallback(() => {
    setIsAiMuted((prev) => {
      const next = !prev;
      if (next) stopSpeech();
      return next;
    });
  }, [stopSpeech]);

  const submitTextAnswer = useCallback(
    async (text: string) => {
      if (!text.trim() || isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      clearSilenceTimers();
      stopSpeech();
      setState("PROCESSING");
      setLiveTranscript("");
      setAccumulatedTranscript("");
      try {
        await callbacks.onSubmitAnswer(text.trim());
      } catch (err) {
        toast.error("Failed to submit response.");
        setState("WAITING_FOR_CANDIDATE");
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [callbacks, clearSilenceTimers, stopSpeech]
  );

  // Spoken initial question on mount
  useEffect(() => {
    if (initialQuestion && config.aiVoiceEnabled !== false) {
      const timer = setTimeout(() => {
        speak(initialQuestion);
      }, 600);
      return () => clearTimeout(timer);
    } else {
      openMicAuto();
    }
  }, []); // Run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      stopMicMonitoring();
      clearSilenceTimers();
      clearSpeechWatchdogs();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [stopSpeech, stopMicMonitoring, clearSilenceTimers, clearSpeechWatchdogs]);

  return {
    state,
    silenceStage,
    liveTranscript,
    accumulatedTranscript,
    fullTranscript: (accumulatedTranscript + " " + liveTranscript).trim(),
    micLevel,
    isMicEnabled,
    isAiMuted,
    isPaused,
    textModeEnabled,
    avatarAudioUrl,
    avatarVideoUrl,
    speak,
    triggerAutoSubmit,
    submitTextAnswer,
    pauseConversation,
    resumeConversation,
    toggleAiMute,
    setTextModeEnabled,
    openMicAuto,
    stopSpeech,
  };
}
