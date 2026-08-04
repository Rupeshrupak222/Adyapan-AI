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

// Overlap and confidence filtering to eliminate false positive multi-person detections
function filterPersonDetections(
  predictions: Array<{ class: string; score: number; bbox: [number, number, number, number] }>,
  canvasWidth: number,
  canvasHeight: number,
  minConfidence = 0.35,
  minAreaRatio = 0.005
): Array<{ class: string; score: number; bbox: [number, number, number, number] }> {
  const totalArea = canvasWidth * canvasHeight;

  // 1. Filter score >= minConfidence (0.35) & Minimum Box Area (>=0.5% of frame)
  const validPersons = predictions.filter((p) => {
    if (p.class !== "person" || p.score < minConfidence) return false;
    const [, , w, h] = p.bbox;
    return (w * h) / totalArea >= minAreaRatio;
  });

  if (validPersons.length <= 1) return validPersons;

  // 2. Overlap / Non-Maximum Suppression (NMS)
  // Deduplicate overlapping boxes for the same person (e.g. head box inside torso box)
  const deduplicated: typeof validPersons = [];

  for (const person of validPersons) {
    const [x1, y1, w1, h1] = person.bbox;
    const center1X = x1 + w1 / 2;
    const center1Y = y1 + h1 / 2;
    const area1 = w1 * h1;

    let isDuplicate = false;
    for (const existing of deduplicated) {
      const [x2, y2, w2, h2] = existing.bbox;
      const center2X = x2 + w2 / 2;
      const center2Y = y2 + h2 / 2;
      const area2 = w2 * h2;

      const interX1 = Math.max(x1, x2);
      const interY1 = Math.max(y1, y2);
      const interX2 = Math.min(x1 + w1, x2 + w2);
      const interY2 = Math.min(y1 + h1, y2 + h2);

      const interW = Math.max(0, interX2 - interX1);
      const interH = Math.max(0, interY2 - interY1);
      const interArea = interW * interH;

      const unionArea = area1 + area2 - interArea;
      const iou = unionArea > 0 ? interArea / unionArea : 0;

      const minBoxArea = Math.min(area1, area2);
      const overlapRatioOfSmaller = minBoxArea > 0 ? interArea / minBoxArea : 0;

      const centerInside =
        (center1X >= x2 && center1X <= x2 + w2 && center1Y >= y2 && center1Y <= y2 + h2) ||
        (center2X >= x1 && center2X <= x1 + w1 && center2Y >= y1 && center2Y <= y1 + h1);

      if (iou > 0.15 || centerInside || overlapRatioOfSmaller > 0.30) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      deduplicated.push(person);
    }
  }

  return deduplicated;
}

export function useInterviewProctor({
  config = {},
  onAutoSubmit,
  onWarningIssued,
}: UseInterviewProctorProps = {}): InterviewProctorReturn {
  const {
    detectionIntervalMs = 1500,
    maxWarnings = 3,
    stabilityCycles = 3,
    warningCooldownMs = 30000, // 30-second delay between warnings
    minPersonConfidence = 0.35, // Calibrated 35% confidence requirement
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
    cooldownActive: false,
    cooldownRemainingSeconds: 0,
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
  const lastWarningTimestampRef = useRef<number>(0);
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

  // Issue warning logic with timestamp record
  const triggerWarning = useCallback(
    (violationType: ViolationType, detectedCount: number) => {
      if (isTerminatedRef.current) return;

      const now = Date.now();
      lastWarningTimestampRef.current = now;

      const newWarningCount = warningsRef.current + 1;
      warningsRef.current = newWarningCount;

      const logEntry: ViolationLog = {
        id: `v_${now}`,
        timestamp: now,
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
        cooldownActive: true,
        cooldownRemainingSeconds: Math.ceil(warningCooldownMs / 1000),
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
              ? "Multiple persons detected. You have 30 seconds to ensure you are alone."
              : "No candidate visible in camera view. Please stay in frame.",
          duration: 7000,
        });
      } else if (newWarningCount === 2) {
        toast.error(`Warning 2 of ${maxWarnings}`, {
          description:
            "Another violation detected. You have 30 seconds to clear your frame. One more warning will terminate the session.",
          duration: 8000,
        });
      } else if (newWarningCount >= maxWarnings) {
        isTerminatedRef.current = true;
        setProctorState((prev) => ({
          ...prev,
          status: "terminated",
          detectionStatus: "violation",
          cooldownActive: false,
          cooldownRemainingSeconds: 0,
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
    [maxWarnings, audioAlertsEnabled, warningCooldownMs]
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

      // Perform COCO-SSD object detection directly on video stream/canvas
      const rawPredictions = await model.detect(videoEl || canvas);

      // Apply NMS + Calibrated Confidence (0.35) + Area filtering (0.005)
      const personDetections = filterPersonDetections(
        rawPredictions as any,
        canvas.width,
        canvas.height,
        minPersonConfidence,
        0.005
      );

      const personCount = personDetections.length;

      // Determine raw status for this frame
      let frameViolationType: ViolationType | null = null;
      if (personCount > 1) {
        frameViolationType = "multiple_persons";
      } else if (personCount === 0 && allowNoPersonWarning) {
        frameViolationType = "no_person";
      }

      // Calculate Cooldown status (30 seconds between warnings)
      const now = Date.now();
      const timeSinceLastWarning = now - lastWarningTimestampRef.current;
      const inCooldown = lastWarningTimestampRef.current > 0 && timeSinceLastWarning < warningCooldownMs;
      const cooldownRemainingSeconds = inCooldown
        ? Math.ceil((warningCooldownMs - timeSinceLastWarning) / 1000)
        : 0;

      // STABILITY RULE & COOLDOWN EVALUATION
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
            cooldownActive: inCooldown,
            cooldownRemainingSeconds,
            pendingViolation: {
              type: frameViolationType,
              personCount,
              cycles: newCycles,
            },
          }));

          // Trigger warning ONLY if 30-second cooldown has passed AND required consecutive cycles are reached!
          if (newCycles >= stabilityCycles && !inCooldown) {
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
            cooldownActive: inCooldown,
            cooldownRemainingSeconds,
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
          cooldownActive: inCooldown,
          cooldownRemainingSeconds,
          pendingViolation: null,
        }));
      }
    } catch (err) {
      console.warn("[Proctoring Engine] Detection cycle error:", err);
    } finally {
      isDetectingRef.current = false;
    }
  }, [
    proctoringEnabled,
    allowNoPersonWarning,
    stabilityCycles,
    warningCooldownMs,
    minPersonConfidence,
    triggerWarning,
  ]);

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
    lastWarningTimestampRef.current = 0;
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
      cooldownActive: false,
      cooldownRemainingSeconds: 0,
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

  const destroyProctor = useCallback(() => {
    stopProctoring();
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      } catch {}
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    canvasRef.current = null;
    isDetectingRef.current = false;
  }, [stopProctoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyProctor();
    };
  }, [destroyProctor]);

  return {
    proctorState,
    videoRef,
    canvasRef,
    startProctoring,
    stopProctoring,
    pauseProctoring,
    resumeProctoring,
    resetProctoring,
    destroyProctor,
    requestMediaPermissions,
    isMinimised,
    setIsMinimised,
    isTerminated: proctorState.status === "terminated",
  };
}
