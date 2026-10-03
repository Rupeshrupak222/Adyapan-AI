import Groq, { toFile } from "groq-sdk";
import { env } from "../config/env";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Transcribes audio buffer using Groq Whisper (ultra-fast <300ms)
 * with automatic fallback to Gemini multimodal audio.
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType = "audio/webm",
  language = "en"
): Promise<string> {
  if (!audioBuffer || audioBuffer.length === 0) {
    return "";
  }

  // 1. Try Groq Whisper (ultra-fast)
  if (env.groqApiKey) {
    try {
      const groq = new Groq({ apiKey: env.groqApiKey });
      const ext = mimeType.includes("wav")
        ? "wav"
        : mimeType.includes("mp4")
        ? "mp4"
        : mimeType.includes("ogg")
        ? "ogg"
        : "webm";

      const file = await toFile(audioBuffer, `candidate_audio.${ext}`, {
        type: mimeType,
      });

      const transcription = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        language: language.toLowerCase().startsWith("hi") ? "hi" : "en",
        response_format: "json",
      });

      if (transcription && typeof transcription.text === "string") {
        return transcription.text.trim();
      }
    } catch (err: any) {
      console.warn(
        "[TranscriptionService] Groq Whisper error, trying fallback:",
        err?.message || err
      );
    }
  }

  // 2. Fallback to Gemini Multimodal Audio
  if (env.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(env.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
      const base64Data = audioBuffer.toString("base64");

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: mimeType || "audio/webm",
            data: base64Data,
          },
        },
        {
          text: "Transcribe the spoken speech in this audio clip verbatim. Return ONLY the transcribed text. If the audio is silent or contains no intelligible words, return empty string.",
        },
      ]);

      const text = result.response.text();
      if (text) {
        return text.trim();
      }
    } catch (geminiErr: any) {
      console.warn(
        "[TranscriptionService] Gemini audio fallback error:",
        geminiErr?.message || geminiErr
      );
    }
  }

  return "";
}
