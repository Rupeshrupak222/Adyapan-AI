export type ConversationState =
  | "AI_SPEAKING"
  | "WAITING_FOR_CANDIDATE"
  | "LISTENING"
  | "SHORT_PAUSE"
  | "LONG_PAUSE_CONFIRMATION"
  | "PROCESSING";

export type SilenceStage =
  | "none"
  | "brief"          // 2s silence
  | "thinking"       // 5s silence
  | "waiting_hint"   // 10s silence ("Listening...")
  | "confirming"     // 15s silence (prepares final response)
  | "finalizing";    // 20s silence (auto submit)

export interface ConversationMessage {
  id: string;
  role: "interviewer" | "candidate" | "user" | "system";
  content: string;
  timestamp?: string;
  isInterim?: boolean;
}

export interface ConversationConfig {
  language?: "english" | "hindi" | string;
  aiVoiceEnabled?: boolean;
  voiceGender?: "female" | "male" | string;
  voiceSpeed?: number;
  voicePitch?: number;
  autoMicOn?: boolean;
  interruptSensitivity?: "low" | "medium" | "high";
  silenceThresholdMs?: {
    shortPause: number;       // 2000 ms
    thinkingPause: number;    // 5000 ms
    hintPause: number;        // 10000 ms
    confirmPause: number;     // 15000 ms
    finalizePause: number;    // 20000 ms
  };
}

export interface ConversationCallbacks {
  onSubmitAnswer: (transcript: string) => Promise<void> | void;
  onInterrupted?: () => void;
  onStateChange?: (state: ConversationState) => void;
  onMicLevelChange?: (level: number) => void;
}
