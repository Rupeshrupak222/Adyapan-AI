"use client";

import { logInterview, logInterviewError } from "./interviewLogger";

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
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public startListening(): boolean {
    if (typeof window === "undefined") return false;
    if (this.isDestroyed) this.isDestroyed = false;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      logInterviewError("SpeechState", "SpeechRecognition API not available in this browser", null);
      this.setState("ERROR");
      this.callbacks.onError?.("Speech recognition is not supported in this browser.");
      return false;
    }

    if (this.state === "LISTENING" || this.state === "HEARING" || this.state === "INITIALIZING") {
      logInterview("SpeechState", "Recognition already running or initializing.");
      return true;
    }

    this.isExplicitlyStopped = false;
    this.setState("INITIALIZING");
    this.cleanupNativeRecognition();

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
          // Transient non-fatal events
          return;
        }

        if (err === "not-allowed" || err === "service-not-allowed") {
          this.setState("ERROR");
          this.callbacks.onError?.("Microphone permission was denied or restricted.", event);
          return;
        }

        this.callbacks.onError?.(`Speech recognition error: ${err}`, event);
      };

      recognition.onend = () => {
        logInterview("SpeechState", "Native SpeechRecognition onend fired");
        this.clearWatchdog();

        if (this.isExplicitlyStopped || this.isDestroyed) {
          this.setState("IDLE");
          return;
        }

        // Automatic Recovery Logic — infinitely restart stream while session is active
        if (!this.isExplicitlyStopped && !this.isDestroyed) {
          this.restartCount++;
          this.setState("RESTARTING");
          logInterview("SpeechState", `Auto-recovering speech recognition (Attempt ${this.restartCount})...`);
          this.callbacks.onAutoRecover?.();

          setTimeout(() => {
            if (!this.isExplicitlyStopped && !this.isDestroyed) {
              this.startListening();
            }
          }, 200);
        }
      };

      this.recognition = recognition;
      (window as any).__activeSpeechRecognition = recognition;
      recognition.start();
      return true;
    } catch (e: any) {
      logInterviewError("SpeechState", "Failed to start SpeechRecognition", e);
      this.setState("ERROR");
      this.callbacks.onError?.("Could not start speech recognition.", e);
      return false;
    }
  }

  public stopListening(): void {
    logInterview("SpeechState", "Explicit stopListening called");
    this.isExplicitlyStopped = true;
    this.clearWatchdog();
    this.setState("STOPPING");
    this.cleanupNativeRecognition();
    this.setState("IDLE");
  }

  public pauseListening(): void {
    logInterview("SpeechState", "Pause listening called");
    this.isExplicitlyStopped = true;
    this.clearWatchdog();
    this.cleanupNativeRecognition();
    this.setState("IDLE");
  }

  public resumeListening(): void {
    logInterview("SpeechState", "Resume listening called");
    this.startListening();
  }

  private startWatchdog() {
    this.clearWatchdog();
    // Heartbeat check: If recognition hangs in LISTENING for >15s without an event or restart, verify active state
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
    this.callbacks = {};
    this.accumulatedFinalText = "";
    SharedSpeechEngine.instance = null;
  }
}
