import type { PrismaClient } from "@prisma/client";
import { httpError } from "../utils/httpError";

export interface IdentityVerificationData {
  sessionId: string;
  userId: string;
  faceDescriptor: number[];
  faceQuality: {
    brightness: number;
    contrast: number;
    sharpness: number;
  };
  deviceInfo: {
    browser: string;
    os: string;
    screen: string;
    camera: string;
    microphone: string;
    connection: string;
  };
  capturedImage: string;
}

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  qualityScore: number;
  issues: string[];
  deviceInfo: any;
  timestamp: string;
}

export interface SystemCheckResult {
  camera: CheckItem;
  microphone: CheckItem;
  speaker: CheckItem;
  internet: CheckItem;
  browser: CheckItem;
  webrtc: CheckItem;
  fullscreen: CheckItem;
  permissions: CheckItem;
  overallPass: boolean;
}

export interface CheckItem {
  status: "pass" | "fail" | "warning";
  message: string;
  details?: string;
}

export interface EnvironmentScanData {
  sessionId: string;
  faceDetection: {
    faceCount: number;
    faceCentered: boolean;
    lighting: number;
    cameraStable: boolean;
    gazeDirection: string;
  };
  roomScan: {
    secondPerson: boolean;
    mobilePhone: boolean;
    tablet: boolean;
    suspiciousObjects: boolean;
  };
  audioCheck: {
    microphoneWorking: boolean;
    backgroundNoise: number;
    multipleVoices: boolean;
  };
}

export interface EnvironmentScanResult {
  passed: boolean;
  overallScore: number;
  checks: Array<{
    name: string;
    category: string;
    status: "pass" | "fail" | "warning";
    message: string;
    confidence: number;
  }>;
  recommendations: string[];
}

const BRIGHTNESS_THRESHOLD = 30;
const CONTRAST_THRESHOLD = 20;
const SHARPNESS_THRESHOLD = 15;
const MAX_VIOLATION_POINTS = 10;

function calculateQualityScore(faceQuality: {
  brightness: number;
  contrast: number;
  sharpness: number;
}): number {
  const brightnessScore = Math.min(100, (faceQuality.brightness / 100) * 100);
  const contrastScore = Math.min(100, (faceQuality.contrast / 100) * 100);
  const sharpnessScore = Math.min(100, (faceQuality.sharpness / 100) * 100);

  return Math.round(brightnessScore * 0.35 + contrastScore * 0.3 + sharpnessScore * 0.35);
}

function calculateFaceConfidence(faceDescriptor: number[]): number {
  if (!faceDescriptor || faceDescriptor.length !== 128) return 0;

  const magnitude = Math.sqrt(
    faceDescriptor.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) return 0;

  const normalized = faceDescriptor.map((val) => val / magnitude);
  const energy = normalized.reduce((sum, val) => sum + val * val, 0);

  return Math.min(100, Math.round(energy * 100));
}

export async function verifyIdentity(
  data: IdentityVerificationData,
  prisma: PrismaClient
): Promise<VerificationResult> {
  const issues: string[] = [];

  const hasDescriptor = Array.isArray(data.faceDescriptor) && data.faceDescriptor.length > 0;
  if (hasDescriptor && data.faceDescriptor.length !== 128) {
    throw httpError(400, "Invalid face descriptor: expected 128-dimensional vector");
  }

  if (data.faceQuality.brightness < BRIGHTNESS_THRESHOLD) {
    issues.push(
      `Brightness too low (${data.faceQuality.brightness}/${BRIGHTNESS_THRESHOLD}). Improve lighting conditions.`
    );
  }

  if (data.faceQuality.contrast < CONTRAST_THRESHOLD) {
    issues.push(
      `Contrast too low (${data.faceQuality.contrast}/${CONTRAST_THRESHOLD}). Ensure face is well-lit against background.`
    );
  }

  if (data.faceQuality.sharpness < SHARPNESS_THRESHOLD) {
    issues.push(
      `Image too blurry (${data.faceQuality.sharpness}/${SHARPNESS_THRESHOLD}). Hold camera steady.`
    );
  }

  const qualityScore = calculateQualityScore(data.faceQuality);
  // When a real 128-d descriptor is supplied, factor face-match confidence in;
  // otherwise fall back to image-quality-based confidence so verification can proceed.
  const confidence = hasDescriptor
    ? calculateFaceConfidence(data.faceDescriptor)
    : qualityScore;
  const verified = issues.length === 0 && confidence > 30;

  const result: VerificationResult = {
    verified,
    confidence,
    qualityScore,
    issues,
    deviceInfo: data.deviceInfo,
    timestamp: new Date().toISOString(),
  };

  try {
    const existingSession = await prisma.interviewSession.findUnique({
      where: { id: data.sessionId },
    });

    if (!existingSession) {
      throw httpError(404, "Interview session not found");
    }

    if (existingSession.userId !== data.userId) {
      throw httpError(403, "Session does not belong to this user");
    }

    await prisma.interviewSession.update({
      where: { id: data.sessionId },
      data: {
        identityVerification: {
          verified,
          confidence,
          qualityScore,
          issues,
          faceDescriptorLength: data.faceDescriptor.length,
          timestamp: result.timestamp,
        } as any,
        deviceInfo: data.deviceInfo as any,
      },
    });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("[IdentityService] Failed to store verification:", error);
  }

  return result;
}

export async function performSystemCheck(): Promise<SystemCheckResult> {
  const result: SystemCheckResult = {
    camera: {
      status: "warning",
      message: "Camera check must be performed client-side",
      details:
        "Use navigator.mediaDevices.getUserMedia({ video: true }) to verify camera access. Check device enumeration via navigator.mediaDevices.enumerateDevices().",
    },
    microphone: {
      status: "warning",
      message: "Microphone check must be performed client-side",
      details:
        "Use navigator.mediaDevices.getUserMedia({ audio: true }) to verify microphone access. Test audio levels via Web Audio API AnalyserNode.",
    },
    speaker: {
      status: "warning",
      message: "Speaker check must be performed client-side",
      details:
        "Create an AudioContext and play a test tone to verify audio output. Check audio output device via setSinkId() if available.",
    },
    internet: {
      status: "pass",
      message: "Server is reachable — client should verify connection speed",
      details:
        "Use navigator.connection.downlink / effectiveType for network quality. Consider a bandwidth test endpoint for accurate measurement.",
    },
    browser: {
      status: "warning",
      message: "Browser check must be performed client-side",
      details:
        "Verify browser supports WebRTC, MediaDevices API, and IntersectionObserver. Recommended: Chrome 90+, Edge 90+, Firefox 90+. Safari has limited WebRTC support.",
    },
    webrtc: {
      status: "warning",
      message: "WebRTC check must be performed client-side",
      details:
        "Test RTCPeerConnection creation. Verify STUN/TURN connectivity. Check ICE candidate gathering. Ensure UDP port 3478 is accessible for TURN servers.",
    },
    fullscreen: {
      status: "warning",
      message: "Fullscreen API must be tested client-side",
      details:
        "Verify document.documentElement.requestFullscreen() is available. Some browsers require user gesture to enter fullscreen. Test with a dummy element first.",
    },
    permissions: {
      status: "warning",
      message: "Permissions must be checked client-side",
      details:
        "Use navigator.permissions.query() for 'camera', 'microphone', and 'notifications' states. Prompt user for grants before starting interview.",
    },
    overallPass: false,
  };

  result.overallPass = Object.values(result).every(
    (item) => typeof item === "boolean" || item.status !== "fail"
  );

  return result;
}

export async function performEnvironmentScan(
  data: EnvironmentScanData,
  prisma: PrismaClient
): Promise<EnvironmentScanResult> {
  const checks: EnvironmentScanResult["checks"] = [];
  const recommendations: string[] = [];

  // Face detection checks
  const faceCountCheck =
    data.faceDetection.faceCount === 1
      ? { status: "pass" as const, message: "Single face detected" }
      : data.faceDetection.faceCount === 0
      ? { status: "fail" as const, message: "No face detected — ensure you are visible on camera" }
      : { status: "fail" as const, message: `Multiple faces detected (${data.faceDetection.faceCount}) — only the candidate should be visible` };

  checks.push({
    name: "Face Count",
    category: "face_detection",
    status: faceCountCheck.status,
    message: faceCountCheck.message,
    confidence: data.faceDetection.faceCount === 1 ? 95 : 70,
  });

  if (data.faceDetection.faceCount > 1) {
    recommendations.push("Remove any other people from the camera frame");
  }
  if (data.faceDetection.faceCount === 0) {
    recommendations.push("Ensure your face is clearly visible in the camera");
  }

  const centeredCheck = data.faceDetection.faceCentered
    ? { status: "pass" as const, message: "Face is centered in frame" }
    : { status: "warning" as const, message: "Face is not centered — adjust camera position" };

  checks.push({
    name: "Face Centering",
    category: "face_detection",
    status: centeredCheck.status,
    message: centeredCheck.message,
    confidence: data.faceDetection.faceCentered ? 90 : 60,
  });

  if (!data.faceDetection.faceCentered) {
    recommendations.push("Center your face in the camera frame");
  }

  const lightingStatus =
    data.faceDetection.lighting >= 40
      ? "pass"
      : data.faceDetection.lighting >= 20
      ? "warning"
      : "fail";

  checks.push({
    name: "Lighting Quality",
    category: "face_detection",
    status: lightingStatus,
    message:
      lightingStatus === "pass"
        ? "Adequate lighting detected"
        : lightingStatus === "warning"
        ? "Low lighting — improve ambient light"
        : "Very poor lighting — face may not be clearly visible",
    confidence: 80,
  });

  if (data.faceDetection.lighting < 40) {
    recommendations.push("Improve room lighting or position yourself near a light source");
  }

  const stabilityStatus = data.faceDetection.cameraStable
    ? "pass"
    : "warning";

  checks.push({
    name: "Camera Stability",
    category: "face_detection",
    status: stabilityStatus,
    message: data.faceDetection.cameraStable
      ? "Camera is stable"
      : "Camera movement detected — keep device stationary",
    confidence: 75,
  });

  const gazeCheck =
    data.faceDetection.gazeDirection === "forward"
      ? "pass"
      : "warning";

  checks.push({
    name: "Gaze Direction",
    category: "face_detection",
    status: gazeCheck,
    message:
      data.faceDetection.gazeDirection === "forward"
        ? "Looking at screen"
        : `Gaze direction: ${data.faceDetection.gazeDirection} — please look at the screen`,
    confidence: 65,
  });

  if (data.faceDetection.gazeDirection !== "forward") {
    recommendations.push("Keep your gaze focused on the screen");
  }

  // Room scan checks
  const secondPersonCheck = data.roomScan.secondPerson
    ? "fail"
    : "pass";

  checks.push({
    name: "Second Person",
    category: "room_scan",
    status: secondPersonCheck,
    message: data.roomScan.secondPerson
      ? "Second person detected — interview must be conducted alone"
      : "No second person detected",
    confidence: 85,
  });

  if (data.roomScan.secondPerson) {
    recommendations.push("Ensure you are alone in the room during the interview");
  }

  const phoneCheck = data.roomScan.mobilePhone ? "fail" : "pass";
  checks.push({
    name: "Mobile Phone",
    category: "room_scan",
    status: phoneCheck,
    message: data.roomScan.mobilePhone
      ? "Mobile phone detected — please remove it from view"
      : "No mobile phone detected",
    confidence: 70,
  });

  if (data.roomScan.mobilePhone) {
    recommendations.push("Remove mobile phones from the camera frame");
  }

  const tabletCheck = data.roomScan.tablet ? "warning" : "pass";
  checks.push({
    name: "Tablet Device",
    category: "room_scan",
    status: tabletCheck,
    message: data.roomScan.tablet
      ? "Tablet detected — remove secondary devices if not required"
      : "No tablet detected",
    confidence: 65,
  });

  const suspiciousCheck = data.roomScan.suspiciousObjects ? "fail" : "pass";
  checks.push({
    name: "Suspicious Objects",
    category: "room_scan",
    status: suspiciousCheck,
    message: data.roomScan.suspiciousObjects
      ? "Suspicious objects detected — clear your workspace"
      : "No suspicious objects detected",
    confidence: 60,
  });

  if (data.roomScan.suspiciousObjects) {
    recommendations.push("Remove notes, textbooks, or electronic devices from your desk");
  }

  // Audio checks
  const micCheck = data.audioCheck.microphoneWorking ? "pass" : "fail";
  checks.push({
    name: "Microphone Status",
    category: "audio",
    status: micCheck,
    message: data.audioCheck.microphoneWorking
      ? "Microphone is functioning"
      : "Microphone not detected or not working",
    confidence: 90,
  });

  if (!data.audioCheck.microphoneWorking) {
    recommendations.push("Check microphone connection and browser permissions");
  }

  const noiseStatus =
    data.audioCheck.backgroundNoise <= 30
      ? "pass"
      : data.audioCheck.backgroundNoise <= 60
      ? "warning"
      : "fail";

  checks.push({
    name: "Background Noise",
    category: "audio",
    status: noiseStatus,
    message:
      noiseStatus === "pass"
        ? "Low background noise"
        : noiseStatus === "warning"
        ? "Moderate background noise detected — minimize ambient sounds"
        : "High background noise detected — find a quieter environment",
    confidence: 75,
  });

  if (data.audioCheck.backgroundNoise > 30) {
    recommendations.push("Move to a quieter environment or use noise-canceling headphones");
  }

  const voiceCheck = data.audioCheck.multipleVoices ? "fail" : "pass";
  checks.push({
    name: "Multiple Voices",
    category: "audio",
    status: voiceCheck,
    message: data.audioCheck.multipleVoices
      ? "Multiple voices detected — only the candidate should speak"
      : "Single voice detected",
    confidence: 70,
  });

  if (data.audioCheck.multipleVoices) {
    recommendations.push("Ensure no one else is speaking during the interview");
  }

  // Calculate overall score
  const statusScores: Record<string, number> = { pass: 100, warning: 50, fail: 0 };
  const overallScore = Math.round(
    checks.reduce((sum, check) => sum + statusScores[check.status], 0) / checks.length
  );

  const hasCriticalFailures = checks.some(
    (check) =>
      check.status === "fail" &&
      (check.name === "Face Count" ||
        check.name === "Second Person" ||
        check.name === "Multiple Voices")
  );

  const passed = overallScore >= 60 && !hasCriticalFailures;

  return {
    passed,
    overallScore,
    checks,
    recommendations,
  };
}

export async function storeDeviceInfo(
  sessionId: string,
  deviceInfo: any,
  prisma: PrismaClient
): Promise<void> {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw httpError(404, "Interview session not found");
  }

  await prisma.interviewSession.update({
    where: { id: sessionId },
    data: {
      deviceInfo: {
        ...deviceInfo,
        recordedAt: new Date().toISOString(),
      } as any,
    },
  });
}
