"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { toast } from "sonner";
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

  // Refs for persistent state without triggering re-renders
  const stateRef = useRef<ConversationState>(state);
  useEffect(() => {
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

  // Clear silence tracking timers
  const clearSilenceTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setSilenceStage("none");
  }, []);

  // Finalize and submit accumulated answer
  const triggerAutoSubmit = useCallback(async () => {
    clearSilenceTimers();
    const fullText = (
      accumulatedTranscriptRef.current + " " + liveTranscriptRef.current
    ).trim();

    if (!fullText) {
      // If nothing spoken, prompt lightly and resume listening
      toast.info("No response heard. Still listening...");
      setState("WAITING_FOR_CANDIDATE");
      lastSpeechTimeRef.current = Date.now();
      return;
    }

    // Stop recognition & set state to PROCESSING
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setState("PROCESSING");

    try {
      await callbacks.onSubmitAnswer(fullText);
      setLiveTranscript("");
      setAccumulatedTranscript("");
    } catch (err) {
      console.warn("Submission error in engine, recovering:", err);
      setLiveTranscript("");
      setAccumulatedTranscript("");
    }
  }, [callbacks, clearSilenceTimers]);

  // Start Smart Silence Monitor
  const startSilenceMonitor = useCallback(() => {
    clearSilenceTimers();
    lastSpeechTimeRef.current = Date.now();

    silenceTimerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
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

  // Stop TTS speech or avatar playback
  const stopSpeech = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (activeAudioElementRef.current) {
      activeAudioElementRef.current.pause();
      activeAudioElementRef.current = null;
    }
    if (avatarPollRef.current) {
      clearInterval(avatarPollRef.current);
      avatarPollRef.current = null;
    }
    setAvatarAudioUrl(null);
    setAvatarVideoUrl(null);
  }, []);

  // Interruption logic: Candidate starts speaking while AI is speaking
  const handleCandidateInterruption = useCallback(() => {
    if (stateRef.current === "AI_SPEAKING") {
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
      console.warn("Microphone access failed:", err);
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

  // Web Speech API initialization
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = config.language === "hindi" ? "hi-IN" : "en-US";

    recognition.onresult = (event: any) => {
      if (isPausedRef.current) return;
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
      if (err === "no-speech" || err === "aborted") return;
      if (err === "not-allowed") {
        toast.error("Microphone permission denied.");
        setIsMicEnabled(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart recognition if engine is in a listening state
      const currentState = stateRef.current;
      if (
        !isPausedRef.current &&
        isMicEnabledRef.current &&
        (currentState === "WAITING_FOR_CANDIDATE" ||
          currentState === "LISTENING" ||
          currentState === "SHORT_PAUSE" ||
          currentState === "LONG_PAUSE_CONFIRMATION")
      ) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {}
  }, [config.language]);

  // Open Microphone automatically for natural turn taking
  const openMicAuto = useCallback(async () => {
    await startMicMonitoring();
    startSpeechRecognition();
    startSilenceMonitor();
    setState("WAITING_FOR_CANDIDATE");
  }, [startMicMonitoring, startSpeechRecognition, startSilenceMonitor]);

  // Core Speak Function (AI Interviewer Voice)
  const speak = useCallback(
    async (text: string) => {
      if (!text) return;
      stopSpeech();
      clearSilenceTimers();

      setState("AI_SPEAKING");
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
          audio.onended = () => {
            openMicAuto();
          };
          audio.onerror = () => {
            openMicAuto();
          };
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

      // Web Speech API fallback
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        !isAiMutedRef.current
      ) {
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = config.voiceSpeed || 0.95;
        utterance.pitch = config.voicePitch || 1;
        utterance.lang = config.language === "hindi" ? "hi-IN" : "en-US";

        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith(config.language === "hindi" ? "hi" : "en") &&
            (config.voiceGender === "female"
              ? v.name.includes("Female") || v.name.includes("Zira") || v.name.includes("Google")
              : v.name.includes("Male") || v.name.includes("David"))
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
          openMicAuto();
        };
        utterance.onerror = () => {
          openMicAuto();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // If voice muted or unsupported, wait briefly then auto open mic
        setTimeout(() => {
          openMicAuto();
        }, 2500);
      }
    },
    [
      stopSpeech,
      clearSilenceTimers,
      openMicAuto,
      config.voiceSpeed,
      config.voicePitch,
      config.language,
      config.voiceGender,
    ]
  );

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
      if (!text.trim()) return;
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
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [stopSpeech, stopMicMonitoring, clearSilenceTimers]);

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
