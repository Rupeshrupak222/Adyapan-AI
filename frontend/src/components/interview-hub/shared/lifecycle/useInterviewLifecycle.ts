"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { logInterview, logInterviewError } from "../interviewLogger";

export type InterviewLifecycleState =
  | "PREPARING"
  | "PERMISSION_REQUIRED"
  | "PERMISSION_DENIED"
  | "READY"
  | "INTERVIEW_ACTIVE"
  | "COMPLETED"
  | "TERMINATED";

export interface MediaValidationStatus {
  cameraAvailable: boolean;
  cameraWorking: boolean;
  micAvailable: boolean;
  micWorking: boolean;
  errorMessage: string | null;
}

export interface UseInterviewLifecycleOptions {
  interviewType: "technical" | "hr" | "general";
  onTerminationCleanup?: () => void;
}

export function useInterviewLifecycle({
  interviewType,
  onTerminationCleanup,
}: UseInterviewLifecycleOptions) {
  const [lifecycleState, setLifecycleState] =
    useState<InterviewLifecycleState>("PREPARING");
  const [mediaStatus, setMediaStatus] = useState<MediaValidationStatus>({
    cameraAvailable: false,
    cameraWorking: false,
    micAvailable: false,
    micWorking: false,
    errorMessage: null,
  });
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const activeStreamRef = useRef<MediaStream | null>(null);
  const isTerminatedRef = useRef<boolean>(false);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // HARD PERMISSION GATE & MEDIA VALIDATION
  // ─────────────────────────────────────────────────────────────────────────────
  const validateAndRequestPermissions = useCallback(async (): Promise<boolean> => {
    logInterview("State", `[${interviewType}] Requesting hard camera/microphone permission gate...`);
    setLifecycleState("PERMISSION_REQUIRED");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Media devices are not supported in this browser. Please use modern Chrome, Edge, or Firefox."
        );
      }

      // Request media stream explicitly
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: true,
      });

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      const cameraWorking = videoTracks.length > 0 && videoTracks[0].readyState === "live" && videoTracks[0].enabled;
      const micWorking = audioTracks.length > 0 && audioTracks[0].readyState === "live" && audioTracks[0].enabled;

      if (!cameraWorking || !micWorking) {
        // Stop any partial tracks
        stream.getTracks().forEach((track) => track.stop());
        throw new Error(
          "Camera and microphone access are both strictly required. Please allow permissions in browser settings."
        );
      }

      activeStreamRef.current = stream;

      setMediaStatus({
        cameraAvailable: true,
        cameraWorking: true,
        micAvailable: true,
        micWorking: true,
        errorMessage: null,
      });

      setLifecycleState("READY");
      logInterview("State", `[${interviewType}] Permissions granted & validated. Lifecycle state -> READY`);
      return true;
    } catch (err: any) {
      logInterviewError("State", `[${interviewType}] Media permission validation failed`, err);

      const message =
        err?.message ||
        "Camera and microphone access are required to begin the AI interview.";

      setMediaStatus({
        cameraAvailable: false,
        cameraWorking: false,
        micAvailable: false,
        micWorking: false,
        errorMessage: message,
      });

      setLifecycleState("PERMISSION_DENIED");
      return false;
    }
  }, [interviewType]);

  // ─────────────────────────────────────────────────────────────────────────────
  // ATOMIC TERMINATION SEQUENCE
  // ─────────────────────────────────────────────────────────────────────────────
  const executeAtomicTerminationSequence = useCallback(() => {
    if (isTerminatedRef.current) return;
    isTerminatedRef.current = true;

    logInterview("State", `[${interviewType}] EXECUTING ATOMIC TERMINATION SEQUENCE`);

    // 1. Cancel Speech Synthesis immediately
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // 2. Stop all Web Speech Recognition instances if window.webkitSpeechRecognition / SpeechRecognition exists
    if (typeof window !== "undefined") {
      try {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec && (window as any).__activeSpeechRecognition) {
          (window as any).__activeSpeechRecognition.stop();
          (window as any).__activeSpeechRecognition.abort();
          (window as any).__activeSpeechRecognition = null;
        }
      } catch {}
    }

    // 3. Close & stop Camera & Mic MediaStream tracks
    if (activeStreamRef.current) {
      try {
        activeStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          logInterview("State", `Stopped track: ${track.kind} (${track.label})`);
        });
        activeStreamRef.current = null;
      } catch (e) {
        logInterviewError("State", "Error closing media stream tracks", e);
      }
    }

    // 4. Close any global AudioContext or active WebAudio nodes created during interview
    if (typeof window !== "undefined" && (window as any).__interviewAudioContext) {
      try {
        (window as any).__interviewAudioContext.close();
        (window as any).__interviewAudioContext = null;
      } catch {}
    }

    // 5. Custom component cleanup callback
    try {
      onTerminationCleanup?.();
    } catch (e) {
      logInterviewError("State", "Termination cleanup callback error", e);
    }

    setLifecycleState("TERMINATED");
    setMediaStatus({
      cameraAvailable: false,
      cameraWorking: false,
      micAvailable: false,
      micWorking: false,
      errorMessage: null,
    });
  }, [interviewType, onTerminationCleanup]);

  // ─────────────────────────────────────────────────────────────────────────────
  // NAVIGATION INTERCEPTION & EXIT CONFIRMATION
  // ─────────────────────────────────────────────────────────────────────────────
  const requestExitWithConfirmation = useCallback((onConfirmNavigation?: () => void) => {
    if (lifecycleState === "INTERVIEW_ACTIVE") {
      pendingNavigationRef.current = onConfirmNavigation || null;
      setShowExitConfirm(true);
    } else {
      executeAtomicTerminationSequence();
      onConfirmNavigation?.();
    }
  }, [lifecycleState, executeAtomicTerminationSequence]);

  const confirmExitAndTerminate = useCallback(() => {
    setShowExitConfirm(false);
    executeAtomicTerminationSequence();
    if (pendingNavigationRef.current) {
      pendingNavigationRef.current();
      pendingNavigationRef.current = null;
    }
  }, [executeAtomicTerminationSequence]);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
    pendingNavigationRef.current = null;
  }, []);

  const markInterviewStarted = useCallback(() => {
    isTerminatedRef.current = false;
    setLifecycleState("INTERVIEW_ACTIVE");
    logInterview("State", `[${interviewType}] Interview session STARTED -> INTERVIEW_ACTIVE`);
  }, [interviewType]);

  const markInterviewCompleted = useCallback(() => {
    setLifecycleState("COMPLETED");
    logInterview("State", `[${interviewType}] Interview session COMPLETED`);
  }, [interviewType]);

  // ─────────────────────────────────────────────────────────────────────────────
  // BROWSER LIFECYCLE EVENTS (beforeunload, pagehide, popstate)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (lifecycleState === "INTERVIEW_ACTIVE") {
        executeAtomicTerminationSequence();
        event.preventDefault();
        event.returnValue = "Leaving now will terminate your active AI interview. Are you sure?";
        return event.returnValue;
      }
    };

    const handlePageHide = () => {
      if (lifecycleState === "INTERVIEW_ACTIVE") {
        executeAtomicTerminationSequence();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [lifecycleState, executeAtomicTerminationSequence]);

  const lifecycleStateRef = useRef<InterviewLifecycleState>(lifecycleState);
  useEffect(() => {
    lifecycleStateRef.current = lifecycleState;
  }, [lifecycleState]);

  // Cleanup on unmount (when user switches pages or exits an active interview)
  useEffect(() => {
    return () => {
      if (lifecycleStateRef.current === "INTERVIEW_ACTIVE") {
        executeAtomicTerminationSequence();
      }
    };
  }, [executeAtomicTerminationSequence]);

  return {
    lifecycleState,
    mediaStatus,
    activeStream: activeStreamRef.current,
    showExitConfirm,
    validateAndRequestPermissions,
    markInterviewStarted,
    markInterviewCompleted,
    executeAtomicTerminationSequence,
    requestExitWithConfirmation,
    confirmExitAndTerminate,
    cancelExit,
  };
}

