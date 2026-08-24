/**
 * Interview Hub Diagnostic Logger
 * Provides structured logging for Speech Recognition, Speech Synthesis,
 * State Machine transitions, and API calls.
 */

const IS_DEV = process.env.NODE_ENV !== "production";

export type LogCategory =
  | "State"
  | "SpeechRecognition"
  | "SpeechSynthesis"
  | "VAD"
  | "API"
  | "Proctoring"
  | "Turn"
  | "MicHealth"
  | "SpeechState";

export function logInterview(
  category: LogCategory,
  action: string,
  data?: any
) {
  if (!IS_DEV) return;

  const timestamp = new Date().toISOString().substring(11, 23);
  const prefix = `[InterviewHub ${timestamp}] [${category}] ${action}`;

  if (data !== undefined) {
    console.log(prefix, data);
  } else {
    console.log(prefix);
  }
}

export function logInterviewError(
  category: LogCategory,
  action: string,
  error?: any
) {
  const timestamp = new Date().toISOString().substring(11, 23);
  if (error !== undefined) {
    console.error(`[InterviewHub ${timestamp}] [${category} ERROR] ${action}`, error);
  } else {
    console.error(`[InterviewHub ${timestamp}] [${category} ERROR] ${action}`);
  }
}
