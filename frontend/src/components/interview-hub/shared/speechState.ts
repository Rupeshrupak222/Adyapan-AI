"use client";

import { logInterview, logInterviewError } from "./interviewLogger";
import { api } from "@/services/api";

export type SpeechEngineState =
  | "IDLE"
  | "INITIALIZING"
  | "LISTENING"
  | "HEARING"
  | "PROCESSING"
  | "STOPPING"
  | "RESTARTING"
  | "ERROR"
  | "COMPLETED";

export interface SpeechEngineCallbacks {
  onStateChange?: (state: SpeechEngineState) => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string, originalError?: any) => void;
  onAutoRecover?: () => void;
}

export interface SpeechEngineConfig {
  language?: string; // "english" | "hindi" | etc.
  continuous?: boolean;
  interimResults?: boolean;
  maxRestartAttempts?: number;
}

export class SharedSpeechEngine {
  private static instance: SharedSpeechEngine | null = null;

  private state: SpeechEngineState = "IDLE";
  private recognition: any = null;
  private callbacks: SpeechEngineCallbacks = {};
  private config: SpeechEngineConfig = {
    language: "english",
    continuous: true,
    interimResults: true,
    maxRestartAttempts: 10,
  };

  private restartCount = 0;
  private isExplicitlyStopped = false;
  private isDestroyed = false;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private accumulatedFinalText = "";

  // Universal MediaRecorder fallback for Firefox, Safari, Brave & non-Chrome browsers
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private activeStream: MediaStream | null = null;
  private ownsStream = false;
  private isTranscribing = false;

  private constructor() {}

  public static getInstance(): SharedSpeechEngine {
    if (!SharedSpeechEngine.instance) {
      SharedSpeechEngine.instance = new SharedSpeechEngine();
    }
    return SharedSpeechEngine.instance;
  }

  public getStatus(): SpeechEngineState {
    return this.state;
  }

  public getAccumulatedTranscript(): string {
    return this.accumulatedFinalText;
  }

  public clearAccumulatedTranscript(): void {
    this.accumulatedFinalText = "";
    this.recordedChunks = [];
  }

  private setState(newState: SpeechEngineState) {
    if (this.state === newState) return;
    logInterview("SpeechState", `Transition: ${this.state} -> ${newState}`);
    this.state = newState;
    this.callbacks.onStateChange?.(newState);
  }

  public configure(config: Partial<SpeechEngineConfig>, callbacks?: SpeechEngineCallbacks) {
    this.config = { ...this.config, ...config };
    if (callbacks) {
      this.callbacks = { ...this.callbacks, ...callbacks };
    }
  }

  public isSupported(): boolean {
    if (typeof window === "undefined") return false;
    // Supported in all modern browsers via Web Speech API or MediaRecorder
    const hasWebSpeech = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const hasMediaRecorder = typeof window.MediaRecorder !== "undefined";
    return hasWebSpeech || hasMediaRecorder;
  }

  private getBestMimeType(): string {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "audio/webm";
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
      "audio/wav",
    ];
    for (const t of types) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return "audio/webm";
  }

  /**
   * Starts universal listening.
   * If provided, existing stream is reused to avoid duplicate microphone access.
   */
  public startListening(existingStream?: MediaStream | null): boolean {
    if (typeof window === "undefined") return false;
    if (this.isDestroyed) this.isDestroyed = false;

    if (this.state === "LISTENING" || this.state === "HEARING" || this.state === "INITIALIZING") {
      logInterview("SpeechState", "Recognition already running or initializing.");
      return true;
    }

    this.isExplicitlyStopped = false;
    this.setState("INITIALIZING");
    this.cleanupNativeRecognition();

    if (existingStream) {
      this.activeStream = existingStream;
      this.ownsStream = false;
    }

    // 1. Initialize Universal MediaRecorder audio buffer
    this.startMediaRecorder(existingStream);

    // 2. Try native Web Speech API (Chrome, Edge, Safari if enabled)
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = this.config.continuous !== false;
        recognition.interimResults = this.config.interimResults !== false;
        recognition.lang = this.config.language === "hindi" ? "hi-IN" : "en-US";

        recognition.onstart = () => {
          logInterview("SpeechState", "Native SpeechRecognition onstart fired");
          this.restartCount = 0;
          this.setState("LISTENING");
          this.startWatchdog();
        };

        recognition.onresult = (event: any) => {
          if (this.isExplicitlyStopped || this.isDestroyed) return;
          this.resetWatchdog();

          let currentInterim = "";
          let newFinalChunk = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              newFinalChunk += chunk + " ";
            } else {
              currentInterim += chunk;
            }
          }

          if (newFinalChunk) {
            this.accumulatedFinalText = (this.accumulatedFinalText + " " + newFinalChunk).trim();
            this.setState("HEARING");
            this.callbacks.onFinalResult?.(this.accumulatedFinalText);
          } else if (currentInterim) {
            this.setState("HEARING");
            this.callbacks.onInterimResult?.(currentInterim.trim());
          }
        };

        recognition.onerror = (event: any) => {
          const err = event?.error || "unknown";
          logInterview("SpeechState", `Native onerror fired: ${err}`);

          if (err === "no-speech" || err === "aborted") {
            return;
          }

          // In Brave or Firefox with flags, Google Speech server is blocked -> fallback to MediaRecorder silently
          if (err === "network" || err === "not-allowed" || err === "service-not-allowed") {
            logInterview("SpeechState", "Web Speech API network/permission restriction - falling back to Universal MediaRecorder");
            this.setState("LISTENING");
            return;
          }

          this.callbacks.onError?.(`Speech recognition notice: ${err}`, event);
        };

        recognition.onend = () => {
          logInterview("SpeechState", "Native SpeechRecognition onend fired");
          this.clearWatchdog();

          if (this.isExplicitlyStopped || this.isDestroyed) {
            this.setState("IDLE");
            return;
          }

          // Auto-recover speech recognition stream while active
          this.restartCount++;
          this.setState("RESTARTING");
          logInterview("SpeechState", `Auto-recovering speech recognition (Attempt ${this.restartCount})...`);
          this.callbacks.onAutoRecover?.();

          setTimeout(() => {
            if (!this.isExplicitlyStopped && !this.isDestroyed) {
              try {
                this.recognition?.start();
              } catch {
                this.startListening(this.activeStream);
              }
            }
          }, 300);
        };

        this.recognition = recognition;
        (window as any).__activeSpeechRecognition = recognition;
        recognition.start();
        return true;
      } catch (e: any) {
        logInterview("SpeechState", "Native SpeechRecognition start warning, falling back to MediaRecorder", e);
      }
    }

    // In browsers without Web Speech (like Firefox), MediaRecorder acts as the primary STT
    this.setState("LISTENING");
    return true;
  }

  /**
   * Initializes MediaRecorder for universal cross-browser audio capture
   */
  private async startMediaRecorder(existingStream?: MediaStream | null) {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return;

    try {
      let stream = existingStream || this.activeStream;
      if (!stream) {
        if (navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.activeStream = stream;
          this.ownsStream = true;
        }
      }

      if (!stream) return;

      const mimeType = this.getBestMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      this.recordedChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      recorder.onstart = () => {
        logInterview("SpeechState", `MediaRecorder active (${mimeType})`);
      };

      recorder.start(1000); // 1-second timeslices
      this.mediaRecorder = recorder;
    } catch (recorderErr) {
      logInterview("SpeechState", "MediaRecorder initialization notice:", recorderErr);
    }
  }

  /**
   * Flushes and transcribes recorded audio buffer via backend AI Whisper/Gemini.
   * Called when answer is completed or silence stage finalizes.
   */
  public async flushRecordedAudio(): Promise<string> {
    if (this.isTranscribing) return this.accumulatedFinalText;

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.requestData();
      } catch {}
    }

    if (this.recordedChunks.length === 0) {
      return this.accumulatedFinalText;
    }

    this.isTranscribing = true;
    try {
      const mimeType = this.mediaRecorder?.mimeType || this.getBestMimeType();
      const audioBlob = new Blob(this.recordedChunks, { type: mimeType });
      this.recordedChunks = [];

      // Convert to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      if (!base64Audio || base64Audio.length < 50) {
        return this.accumulatedFinalText;
      }

      const res = await api.post("/interview/transcribe", {
        audioBase64: base64Audio,
        mimeType,
        language: this.config.language || "english",
      });

      const transcribedText = res.data?.text?.trim() || "";
      if (transcribedText) {
        // If native recognition already caught some text, merge without duplicate
        if (!this.accumulatedFinalText.toLowerCase().includes(transcribedText.toLowerCase())) {
          this.accumulatedFinalText = (this.accumulatedFinalText + " " + transcribedText).trim();
          this.callbacks.onFinalResult?.(this.accumulatedFinalText);
        }
      }
    } catch (err: any) {
      logInterview("SpeechState", "Server-side audio transcription notice:", err?.message || err);
    } finally {
      this.isTranscribing = false;
    }

    return this.accumulatedFinalText;
  }

  public stopListening(): void {
    logInterview("SpeechState", "Explicit stopListening called");
    this.isExplicitlyStopped = true;
    this.clearWatchdog();
    this.setState("STOPPING");

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
    }

    this.cleanupNativeRecognition();
    this.setState("IDLE");
  }

  public pauseListening(): void {
    logInterview("SpeechState", "Pause listening called");
    this.isExplicitlyStopped = true;
    this.clearWatchdog();

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.pause();
      } catch {}
    }

    this.cleanupNativeRecognition();
    this.setState("IDLE");
  }

  public resumeListening(): void {
    logInterview("SpeechState", "Resume listening called");
    this.startListening(this.activeStream);
  }

  private startWatchdog() {
    this.clearWatchdog();
    this.watchdogTimer = setInterval(() => {
      if (this.state === "LISTENING" && !this.isExplicitlyStopped && !this.isDestroyed) {
        logInterview("SpeechState", "Watchdog heartbeat check OK");
      }
    }, 15000);
  }

  private resetWatchdog() {
    if (this.watchdogTimer) {
      this.startWatchdog();
    }
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private cleanupNativeRecognition() {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.stop();
        this.recognition.abort();
      } catch {}
      this.recognition = null;
      if (typeof window !== "undefined") {
        (window as any).__activeSpeechRecognition = null;
      }
    }
  }

  public destroy(): void {
    logInterview("SpeechState", "Destroying SharedSpeechEngine instance");
    this.isDestroyed = true;
    this.stopListening();
    if (this.ownsStream && this.activeStream) {
      this.activeStream.getTracks().forEach((t) => t.stop());
      this.activeStream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.callbacks = {};
    this.accumulatedFinalText = "";
    SharedSpeechEngine.instance = null;
  }
}
