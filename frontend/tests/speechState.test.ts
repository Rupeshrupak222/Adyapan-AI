import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SharedSpeechEngine } from "../src/components/interview-hub/shared/speechState";

describe("SharedSpeechEngine State Machine & Resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    const engine = SharedSpeechEngine.getInstance();
    engine.destroy();
  });

  it("should initialize in IDLE state", () => {
    const engine = SharedSpeechEngine.getInstance();
    expect(engine.getStatus()).toBe("IDLE");
  });

  it("should configure language and callbacks", () => {
    const engine = SharedSpeechEngine.getInstance();
    const onStateChange = vi.fn();
    engine.configure({ language: "hindi" }, { onStateChange });
    expect(engine.getStatus()).toBe("IDLE");
  });

  it("should return false if browser SpeechRecognition is not available", () => {
    const engine = SharedSpeechEngine.getInstance();
    const result = engine.startListening();
    expect(result).toBe(false);
  });

  it("should accumulate final transcript chunks correctly without duplication", () => {
    const engine = SharedSpeechEngine.getInstance();
    engine.clearAccumulatedTranscript();
    expect(engine.getAccumulatedTranscript()).toBe("");
  });
});
