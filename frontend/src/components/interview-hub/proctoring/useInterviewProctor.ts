"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { loadCocoSsdModel } from "./tfjsSingleton";
import { audioAlert } from "./audioAlert";
import type {
  ProctoringConfig,
  ProctoringState,
  ViolationType,
  ViolationLog,
  InterviewProctorReturn,
} from "./proctoringTypes";

interface UseInterviewProctorProps {
  config?: ProctoringConfig;
  onAutoSubmit?: () => void;
  onWarningIssued?: (warningCount: number, type: ViolationType) => void;
}

export function useInterviewProctor({
  config = {},
  onAutoSubmit,
  onWarningIssued,
}: UseInterviewProctorProps = {}): InterviewProctorReturn {
  const {
    detectionIntervalMs = 1500,
    maxWarnings = 3,
    stabilityCycles = 2,
    proctoringEnabled = true,
    audioAlertsEnabled = true,
    allowNoPersonWarning = true,
  } = config;

  const [proctorState, setProctorState] = useState<ProctoringState>({
    status: "idle",
    detectionStatus: "normal",
    warnings: 0,
    maxWarnings,
    personCount: 1,
    cameraActive: false,
    micActive: false,
    modelLoaded: false,
    pendingViolation: null,
    violationLogs: [],
    errorMessage: null,
    loadingStepMessage: "Initializing Camera & AI Proctor",
  });

  const [isMinimised, setIsMinimised] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const schedulerRef = useRef<NodeJS.Timeout | null>(null);
  const isDetectingRef = useRef(false);
  const isTerminatedRef = useRef(false);
  const warningsRef = useRef(0);
  const pendingViolationRef = useRef<{ type: ViolationType; cycles: number } | null>(null);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  const onWarningIssuedRef = useRef(onWarningIssued);

  useEffect(() => {
    onAutoSubmitRef.current = onAutoSubmit;
  }, [onAutoSubmit]);

  useEffect(() => {
    onWarningIssuedRef.current = onWarningIssued;
  }, [onWarningIssued]);

  // Request both camera and microphone access
  const requestMediaPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setProctorState((prev) => ({
        ...prev,
        status: "requesting_permissions",
        loadingStepMessage: "Initializing Camera & Microphone Access...",
      }));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = stream;

      const hasVideo = stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled;
      const hasAudio = stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled;

      if (!hasVideo || !hasAudio) {
        throw new Error("Both camera and microphone permissions are required to begin the interview.");
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setProctorState((prev) => ({
        ...prev,
        cameraActive: true,
        micActive: true,
        errorMessage: null,
      }));

      return true;
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        "Camera and microphone access are required to begin the interview. Please allow access in browser settings.";

      setProctorState((prev) => ({
        ...prev,
        status: "error",
        cameraActive: false,
        micActive: false,
        errorMessage: errorMsg,
      }));

      return false;
    }
  }, []);

  // Issue warning logic
  const triggerWarning = useCallback(
    (violationType: ViolationType, detectedCount: number) => {
      if (isTerminatedRef.current) return;

      const newWarningCount = warningsRef.current + 1;
      warningsRef.current = newWarningCount;

      const logEntry: ViolationLog = {
        id: `v_${Date.now()}`,
        timestamp: Date.now(),
        type: violationType,
        message:
          violationType === "multiple_persons"
            ? `Multiple persons detected (${detectedCount})`
            : violationType === "no_person"
            ? "No person visible in frame"
            : "Camera feed disconnected",
        personCount: detectedCount,
        warningNumber: newWarningCount,
      };

      setProctorState((prev) => ({
        ...prev,
        warnings: newWarningCount,
        detectionStatus: "violation",
        violationLogs: [logEntry, ...prev.violationLogs],
        pendingViolation: null,
      }));

      pendingViolationRef.current = null;

      if (audioAlertsEnabled) {
        if (newWarningCount >= maxWarnings) {
          audioAlert.playCriticalSound();
        } else {
          audioAlert.playWarningSound();
        }
      }

      onWarningIssuedRef.current?.(newWarningCount, violationType);

      if (newWarningCount === 1) {
        toast.warning(`Warning 1 of ${maxWarnings}`, {
          description:
            violationType === "multiple_persons"
              ? "Multiple persons detected. Please ensure you are alone."
              : "No candidate visible in camera view. Please stay in frame.",
          duration: 6000,
        });
      } else if (newWarningCount === 2) {
        toast.error(`Warning 2 of ${maxWarnings}`, {
          description:
            "Another violation detected. One more warning will automatically terminate the interview session.",
          duration: 7000,
        });
      } else if (newWarningCount >= maxWarnings) {
        isTerminatedRef.current = true;
        setProctorState((prev) => ({
          ...prev,
          status: "terminated",
          detectionStatus: "violation",
        }));

        toast.error("Interview Terminated", {
          description: "Interview ended due to repeated proctoring violations.",
          duration: 10000,
        });

        // Trigger automatic submission callback
        setTimeout(() => {
          onAutoSubmitRef.current?.();
        }, 800);
      }
    },
    [maxWarnings, audioAlertsEnabled]
  );

  // Core Frame Detection
  const runFrameDetection = useCallback(async () => {
    if (
      !proctoringEnabled ||
      isDetectingRef.current ||
      isTerminatedRef.current ||
      !videoRef.current ||
      videoRef.current.paused ||
      videoRef.current.ended
    ) {
      return;
    }

    isDetectingRef.current = true;

    try {
      const model = await loadCocoSsdModel();

      const videoEl = videoRef.current;
      if (!videoEl || videoEl.readyState < 2) {
        isDetectingRef.current = false;
        return;
      }

      // Draw video frame to offscreen canvas snapshot
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }

      const canvas = canvasRef.current;
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        isDetectingRef.current = false;
        return;
      }

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      // Perform COCO-SSD object detection
      const predictions = await model.detect(canvas);

      // Filter for person detections with >0.4 confidence
      const personDetections = predictions.filter(
        (p) => p.class === "person" && p.score >= 0.4
      );

      const personCount = personDetections.length;

      // Determine raw status for this frame
      let frameViolationType: ViolationType | null = null;
      if (personCount > 1) {
        frameViolationType = "multiple_persons";
      } else if (personCount === 0 && allowNoPersonWarning) {
        frameViolationType = "no_person";
      }

      // STABILITY RULE EVALUATION:
      // Must detect violation across 'stabilityCycles' consecutive cycles (e.g., 2 cycles = ~3s)
      if (frameViolationType !== null) {
        const currentPending = pendingViolationRef.current;

        if (currentPending && currentPending.type === frameViolationType) {
          const newCycles = currentPending.cycles + 1;
          pendingViolationRef.current = {
            type: frameViolationType,
            cycles: newCycles,
          };

          setProctorState((prev) => ({
            ...prev,
            personCount,
            detectionStatus: "pending_violation",
            pendingViolation: {
              type: frameViolationType,
              personCount,
              cycles: newCycles,
            },
          }));

          // If reached required consecutive cycles, issue a warning!
          if (newCycles >= stabilityCycles) {
            triggerWarning(frameViolationType, personCount);
          }
        } else {
          // First cycle of potential violation
          pendingViolationRef.current = {
            type: frameViolationType,
            cycles: 1,
          };

          setProctorState((prev) => ({
            ...prev,
            personCount,
            detectionStatus: "pending_violation",
            pendingViolation: {
              type: frameViolationType,
              personCount,
              cycles: 1,
            },
          }));
        }
      } else {
        // Returned to normal (1 person detected) -> Reset pending violation!
        pendingViolationRef.current = null;

        setProctorState((prev) => ({
          ...prev,
          personCount,
          detectionStatus: "normal",
          pendingViolation: null,
        }));
      }
    } catch (err) {
      console.warn("[Proctoring Engine] Detection cycle error:", err);
    } finally {
      isDetectingRef.current = false;
    }
  }, [proctoringEnabled, allowNoPersonWarning, stabilityCycles, triggerWarning]);

  // Start Proctoring session
  const startProctoring = useCallback(async (): Promise<boolean> => {
    isTerminatedRef.current = false;
    warningsRef.current = 0;
    pendingViolationRef.current = null;

    setProctorState((prev) => ({
      ...prev,
      status: "initializing",
      warnings: 0,
      loadingStepMessage: "Loading AI Proctoring Engine...",
    }));

    // 1. Permission check
    const granted = await requestMediaPermissions();
    if (!granted) return false;

    // 2. Load TF.js model
    try {
      setProctorState((prev) => ({
        ...prev,
        status: "loading_model",
      }));

      await loadCocoSsdModel((stepMsg) => {
        setProctorState((prev) => ({
          ...prev,
          loadingStepMessage: stepMsg,
        }));
      });

      setProctorState((prev) => ({
        ...prev,
        status: "active",
        modelLoaded: true,
        detectionStatus: "normal",
      }));

      // 3. Start throttled detection scheduler loop
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      schedulerRef.current = setInterval(() => {
        runFrameDetection();
      }, detectionIntervalMs);

      return true;
    } catch (err: any) {
      setProctorState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: "Failed to initialize AI detection model. Please refresh and try again.",
      }));
      return false;
    }
  }, [requestMediaPermissions, detectionIntervalMs, runFrameDetection]);

  // Stop Proctoring
  const stopProctoring = useCallback(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setProctorState((prev) => ({
      ...prev,
      status: "idle",
      cameraActive: false,
      micActive: false,
      detectionStatus: "normal",
      pendingViolation: null,
    }));
  }, []);

  const pauseProctoring = useCallback(() => {
    if (schedulerRef.current) {
      clearInterval(schedulerRef.current);
      schedulerRef.current = null;
    }
    setProctorState((prev) => ({ ...prev, status: "paused" }));
  }, []);

  const resumeProctoring = useCallback(() => {
    if (isTerminatedRef.current) return;
    if (schedulerRef.current) clearInterval(schedulerRef.current);
    schedulerRef.current = setInterval(() => {
      runFrameDetection();
    }, detectionIntervalMs);
    setProctorState((prev) => ({ ...prev, status: "active" }));
  }, [detectionIntervalMs, runFrameDetection]);

  const resetProctoring = useCallback(() => {
    stopProctoring();
    warningsRef.current = 0;
    pendingViolationRef.current = null;
    isTerminatedRef.current = false;
    setProctorState({
      status: "idle",
      detectionStatus: "normal",
      warnings: 0,
      maxWarnings,
      personCount: 1,
      cameraActive: false,
      micActive: false,
      modelLoaded: false,
      pendingViolation: null,
      violationLogs: [],
      errorMessage: null,
      loadingStepMessage: "Initializing AI Proctor",
    });
  }, [stopProctoring, maxWarnings]);

  // Handle Tab visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseProctoring();
      } else {
        if (proctorState.status === "paused" && !isTerminatedRef.current) {
          resumeProctoring();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pauseProctoring, resumeProctoring, proctorState.status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (schedulerRef.current) clearInterval(schedulerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    proctorState,
    videoRef,
    canvasRef,
    startProctoring,
    stopProctoring,
    pauseProctoring,
    resumeProctoring,
    resetProctoring,
    requestMediaPermissions,
    isMinimised,
    setIsMinimised,
    isTerminated: proctorState.status === "terminated",
  };
}
