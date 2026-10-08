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
  private nativeSpeechDisabled = false;
  private initSafetyTimer: NodeJS.Timeout | null = null;

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
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/wav",
    ];
    for (const t of types) {
      if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(t)) {
        return t;
      }
    }
    return "";
  }

  /**
   * Starts universal listening with native Web Speech API and MediaRecorder in parallel.
   */
  public startListening(existingStream?: MediaStream | null): boolean {
    if (typeof window === "undefined") return false;
    if (this.isDestroyed) this.isDestroyed = false;

    this.isExplicitlyStopped = false;

    if (existingStream) {
      this.activeStream = existingStream;
      this.ownsStream = false;
    }

    // 1. Ensure MediaRecorder is running (only starts if not already recording)
    this.startMediaRecorder(existingStream);

    // 2. If already listening or hearing, ensure native recognition is active and return
    if (this.state === "LISTENING" || this.state === "HEARING") {
      if (!this.recognition && !this.nativeSpeechDisabled) {
        this.startNativeRecognition();
      }
      return true;
    }

    this.setState("INITIALIZING");

    // 3. Start native Web Speech recognition
    this.startNativeRecognition();

    // 4. Safety timer: if native recognition takes > 1.2s to fire onstart, force state to LISTENING
    if (this.initSafetyTimer) clearTimeout(this.initSafetyTimer);
    this.initSafetyTimer = setTimeout(() => {
      if (this.state === "INITIALIZING") {
        logInterview("SpeechState", "Initializing safety timer fired: setting state to LISTENING");
        this.setState("LISTENING");
      }
    }, 1200);

    return true;
  }

  /**
   * Creates and starts a fresh instance of native SpeechRecognition.
   */
  private startNativeRecognition() {
    if (typeof window === "undefined" || this.isExplicitlyStopped || this.isDestroyed || this.nativeSpeechDisabled) {
      return;
    }

    this.cleanupNativeRecognition();

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      logInterview("SpeechState", "Web Speech API not present; relying on MediaRecorder fallback.");
      this.setState("LISTENING");
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = this.config.continuous !== false;
      recognition.interimResults = this.config.interimResults !== false;
      const lang = (this.config.language || "").toLowerCase();
      recognition.lang = lang.includes("hi") ? "hi-IN" : "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        logInterview("SpeechState", "Native SpeechRecognition onstart fired");
        this.restartCount = 0;
        if (this.initSafetyTimer) {
          clearTimeout(this.initSafetyTimer);
          this.initSafetyTimer = null;
        }
        this.setState("LISTENING");
        this.startWatchdog();
      };

      recognition.onresult = (event: any) => {
        if (this.isExplicitlyStopped || this.isDestroyed) return;
        this.resetWatchdog();

        let currentInterim = "";
        let newFinalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (!item || !item[0]) continue;
          const chunk = item[0].transcript || "";
          if (item.isFinal) {
            newFinalChunk += chunk + " ";
          } else {
            currentInterim += chunk;
          }
        }

        if (newFinalChunk) {
          this.accumulatedFinalText = (this.accumulatedFinalText + " " + newFinalChunk)
            .replace(/\s+/g, " ")
            .trim();
          this.setState("HEARING");
          this.callbacks.onFinalResult?.(this.accumulatedFinalText);
        } else if (currentInterim) {
          this.setState("HEARING");
          this.callbacks.onInterimResult?.(currentInterim.trim());
        }
      };

      recognition.onerror = (event: any) => {
        const err = event?.error || "unknown";
        logInterview("SpeechState", `Native onerror: ${err}`);

        if (err === "no-speech" || err === "aborted") {
          return; // Let onend auto-restart recognition
        }

        if (err === "not-allowed" || err === "service-not-allowed") {
          logInterview("SpeechState", "Web Speech permission restricted. Falling back permanently to Universal MediaRecorder.");
          this.nativeSpeechDisabled = true;
          this.setState("LISTENING");
          return;
        }

        if (err === "network") {
          logInterview("SpeechState", "Web Speech network restriction. MediaRecorder audio capturing in background.");
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

        // Auto-recover native recognition without touching MediaRecorder
        this.restartCount++;
        const maxAttempts = this.config.maxRestartAttempts || 50;

        if (!this.nativeSpeechDisabled && this.restartCount <= maxAttempts) {
          this.setState("RESTARTING");
          this.callbacks.onAutoRecover?.();

          setTimeout(() => {
            if (!this.isExplicitlyStopped && !this.isDestroyed && !this.nativeSpeechDisabled) {
              this.startNativeRecognition();
            }
          }, 250);
        } else {
          // Stay listening via MediaRecorder
          this.setState("LISTENING");
        }
      };

      this.recognition = recognition;
      (window as any).__activeSpeechRecognition = recognition;
      recognition.start();
    } catch (e: any) {
      logInterview("SpeechState", "Native SpeechRecognition start notice, relying on MediaRecorder", e);
      this.setState("LISTENING");
    }
  }

  /**
   * Initializes MediaRecorder for continuous cross-browser audio capture.
   * If already active, it keeps running without resetting chunks.
   */
  private async startMediaRecorder(existingStream?: MediaStream | null) {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return;

    if (this.mediaRecorder && (this.mediaRecorder.state === "recording" || this.mediaRecorder.state === "paused")) {
      if (this.mediaRecorder.state === "paused") {
        try {
          this.mediaRecorder.resume();
        } catch {}
      }
      return;
    }

    try {
      let stream = existingStream || this.activeStream;
      if (!stream || stream.getAudioTracks().length === 0 || !stream.getAudioTracks()[0].enabled) {
        if (navigator.mediaDevices?.getUserMedia) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.activeStream = stream;
            this.ownsStream = true;
          } catch (streamErr) {
            logInterview("SpeechState", "Microphone access notice for MediaRecorder:", streamErr);
            return;
          }
        }
      }

      if (!stream) return;

      const mimeType = this.getBestMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      recorder.onstart = () => {
        logInterview("SpeechState", `MediaRecorder active (${recorder.mimeType || mimeType || "native"})`);
      };

      recorder.onerror = (recErr) => {
        logInterview("SpeechState", "MediaRecorder runtime error:", recErr);
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

    // Await the latest timeslice from MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      await new Promise<void>((resolve) => {
        if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") {
          resolve();
          return;
        }
        const onData = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            this.recordedChunks.push(e.data);
          }
          resolve();
        };
        this.mediaRecorder.addEventListener("dataavailable", onData, { once: true });
        try {
          this.mediaRecorder.requestData();
        } catch {
          resolve();
        }
        setTimeout(resolve, 350);
      });
    }

    if (this.recordedChunks.length === 0) {
      return this.accumulatedFinalText;
    }

    this.isTranscribing = true;
    try {
      const rawMime = this.mediaRecorder?.mimeType || this.getBestMimeType();
      const cleanMime = rawMime.split(";")[0].trim() || "audio/webm";
      const audioBlob = new Blob(this.recordedChunks, { type: cleanMime });

      // If buffer is too small (<600 bytes), it is only an empty container header
      if (audioBlob.size < 600) {
        return this.accumulatedFinalText;
      }

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
        mimeType: cleanMime,
        language: this.config.language || "english",
      });

      const transcribedText = res.data?.text?.trim() || "";
      if (transcribedText) {
        // If native recognition already caught some text, merge without duplicate
        if (!this.accumulatedFinalText.toLowerCase().includes(transcribedText.toLowerCase())) {
          this.accumulatedFinalText = (this.accumulatedFinalText + " " + transcribedText).replace(/\s+/g, " ").trim();
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
    if (this.initSafetyTimer) {
      clearTimeout(this.initSafetyTimer);
      this.initSafetyTimer = null;
    }
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
