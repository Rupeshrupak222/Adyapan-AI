export type ProctoringStatus =
  | "idle"
  | "initializing"
  | "loading_model"
  | "requesting_permissions"
  | "active"
  | "paused"
  | "warning"
  | "terminated"
  | "error";

export type DetectionStatus = "normal" | "checking" | "pending_violation" | "violation";

export type ViolationType = "no_person" | "multiple_persons" | "camera_disconnected";

export interface ViolationLog {
  id: string;
  timestamp: number;
  type: ViolationType;
  message: string;
  personCount: number;
  warningNumber: number;
}

export interface ProctoringConfig {
  detectionIntervalMs?: number; // default 1500ms
  maxWarnings?: number; // default 3
  stabilityCycles?: number; // default 3 consecutive cycles
  warningCooldownMs?: number; // default 30000ms (30s delay between warnings)
  minPersonConfidence?: number; // default 0.60
  proctoringEnabled?: boolean;
  audioAlertsEnabled?: boolean;
  allowNoPersonWarning?: boolean; // true if 0 persons should trigger warning
}

export interface ProctoringState {
  status: ProctoringStatus;
  detectionStatus: DetectionStatus;
  warnings: number;
  maxWarnings: number;
  personCount: number;
  cameraActive: boolean;
  micActive: boolean;
  modelLoaded: boolean;
  pendingViolation: { type: ViolationType; personCount: number; cycles: number } | null;
  cooldownActive: boolean;
  cooldownRemainingSeconds: number;
  violationLogs: ViolationLog[];
  errorMessage: string | null;
  loadingStepMessage: string;
}

export interface InterviewProctorReturn {
  proctorState: ProctoringState;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  startProctoring: () => Promise<boolean>;
  stopProctoring: () => void;
  pauseProctoring: () => void;
  resumeProctoring: () => void;
  resetProctoring: () => void;
  destroyProctor: () => void;
  requestMediaPermissions: () => Promise<boolean>;
  isMinimised: boolean;
  setIsMinimised: (val: boolean | ((prev: boolean) => boolean)) => void;
  isTerminated: boolean;
}
