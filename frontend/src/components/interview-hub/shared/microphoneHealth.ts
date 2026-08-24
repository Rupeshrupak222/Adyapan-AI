"use client";

import { logInterview, logInterviewError } from "./interviewLogger";

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export interface MicrophoneHealthCheckResult {
  hasPermission: boolean;
  hasAudioTrack: boolean;
  isTrackEnabled: boolean;
  hasAudioSignal: boolean; // RMS volume > threshold
  audioLevel: number; // 0 to 100
  devices: AudioInputDevice[];
  errorMessage: string | null;
}

export interface MicrophoneDeviceChangeListener {
  onDeviceChange?: (devices: AudioInputDevice[]) => void;
  onActiveDeviceDisconnected?: () => void;
}

export class MicrophoneHealthManager {
  private static instance: MicrophoneHealthManager | null = null;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private deviceChangeListener: ((e: Event) => void) | null = null;
  private activeDeviceId: string | null = null;

  private callbacks: MicrophoneDeviceChangeListener = {};

  private constructor() {}

  public static getInstance(): MicrophoneHealthManager {
    if (!MicrophoneHealthManager.instance) {
      MicrophoneHealthManager.instance = new MicrophoneHealthManager();
    }
    return MicrophoneHealthManager.instance;
  }

  public setCallbacks(callbacks: MicrophoneDeviceChangeListener) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Enumerate available audio input devices
   */
  public async getAudioInputDevices(): Promise<AudioInputDevice[]> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === "audioinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));
    } catch (e) {
      logInterviewError("MicHealth", "Failed to enumerate audio input devices", e);
      return [];
    }
  }

  /**
   * Run a quick 1-2 second pre-flight microphone health & energy check
   */
  public async diagnoseMicrophone(selectedDeviceId?: string): Promise<MicrophoneHealthCheckResult> {
    logInterview("MicHealth", "Starting microphone health & audio signal diagnostic...");

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return {
        hasPermission: false,
        hasAudioTrack: false,
        isTrackEnabled: false,
        hasAudioSignal: false,
        audioLevel: 0,
        devices: [],
        errorMessage: "Media devices API is not supported in this browser environment.",
      };
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;

      const audioTracks = stream.getAudioTracks();
      const hasAudioTrack = audioTracks.length > 0;
      const isTrackEnabled = hasAudioTrack && audioTracks[0].enabled && audioTracks[0].readyState === "live";

      if (hasAudioTrack && audioTracks[0].getSettings().deviceId) {
        this.activeDeviceId = audioTracks[0].getSettings().deviceId || null;
      }

      const devices = await this.getAudioInputDevices();

      if (!hasAudioTrack || !isTrackEnabled) {
        stream.getTracks().forEach((t) => t.stop());
        return {
          hasPermission: true,
          hasAudioTrack,
          isTrackEnabled,
          hasAudioSignal: false,
          audioLevel: 0,
          devices,
          errorMessage: "Microphone connected, but audio track is disabled or inactive.",
        };
      }

      // Sample RMS audio level over 500ms
      const audioLevel = await this.measurePeakAudioLevel(stream, 500);
      const hasAudioSignal = audioLevel >= 1; // Signal detected if >= 1% RMS

      logInterview(
        "MicHealth",
        `Diagnostic complete. Active Track: ${audioTracks[0].label}, Level: ${audioLevel}%, Signal: ${hasAudioSignal}`
      );

      return {
        hasPermission: true,
        hasAudioTrack: true,
        isTrackEnabled: true,
        hasAudioSignal,
        audioLevel,
        devices,
        errorMessage: hasAudioSignal
          ? null
          : "Microphone connected but no audio signal detected. Please check hardware mute switch or system microphone volume.",
      };
    } catch (err: any) {
      logInterviewError("MicHealth", "Microphone permission or stream access failed", err);
      const devices = await this.getAudioInputDevices();
      return {
        hasPermission: false,
        hasAudioTrack: false,
        isTrackEnabled: false,
        hasAudioSignal: false,
        audioLevel: 0,
        devices,
        errorMessage:
          err?.message || "Microphone access denied. Please grant microphone permission in browser settings.",
      };
    }
  }

  /**
   * Listen to devicechange events (e.g. headset plugged/unplugged)
   */
  public startDeviceChangeMonitoring(onDeviceChange?: (devices: AudioInputDevice[]) => void) {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    if (this.deviceChangeListener) {
      navigator.mediaDevices.removeEventListener("devicechange", this.deviceChangeListener);
    }

    this.deviceChangeListener = async () => {
      logInterview("MicHealth", "Audio input device change event detected!");
      const devices = await this.getAudioInputDevices();

      // Check if current active device is still in the device list
      if (this.activeDeviceId) {
        const stillExists = devices.some((d) => d.deviceId === this.activeDeviceId);
        if (!stillExists) {
          logInterview("MicHealth", "Active microphone was disconnected!");
          this.callbacks.onActiveDeviceDisconnected?.();
        }
      }

      this.callbacks.onDeviceChange?.(devices);
      onDeviceChange?.(devices);
    };

    navigator.mediaDevices.addEventListener("devicechange", this.deviceChangeListener);
  }

  public stopDeviceChangeMonitoring() {
    if (typeof window !== "undefined" && navigator.mediaDevices && this.deviceChangeListener) {
      navigator.mediaDevices.removeEventListener("devicechange", this.deviceChangeListener);
      this.deviceChangeListener = null;
    }
  }

  /**
   * Calculate real-time RMS volume level (0 to 100) for a given MediaStream
   */
  private measurePeakAudioLevel(stream: MediaStream, durationMs: number): Promise<number> {
    return new Promise((resolve) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          resolve(5); // Default assumed signal if WebAudio API unsupported
          return;
        }

        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let maxVolume = 0;
        const startTime = Date.now();

        const checkFrame = () => {
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;
          const currentLevel = Math.min(Math.round((avg / 255) * 100), 100);

          if (currentLevel > maxVolume) {
            maxVolume = currentLevel;
          }

          if (Date.now() - startTime < durationMs) {
            requestAnimationFrame(checkFrame);
          } else {
            audioCtx.close().catch(() => {});
            resolve(maxVolume);
          }
        };

        checkFrame();
      } catch (e) {
        logInterviewError("MicHealth", "Error measuring peak audio level", e);
        resolve(5);
      }
    });
  }

  public cleanup() {
    this.stopDeviceChangeMonitoring();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    MicrophoneHealthManager.instance = null;
  }
}
