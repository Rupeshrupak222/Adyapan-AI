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

  // 1. Primary: Google Gemini Multimodal Audio Transcription
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
          text: `You are an accurate Speech-to-Text engine. Listen to this candidate audio clip and transcribe what the candidate said verbatim in ${language.toLowerCase().startsWith("hi") ? "Hindi or English" : "English"}.
Return ONLY the raw transcribed text. Do NOT add preamble, commentary, quotes, or notes. If the audio is silent or unintelligible, return an empty string.`,
        },
      ]);

      const text = result.response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (geminiErr: any) {
      console.warn(
        "[TranscriptionService] Gemini audio primary error, attempting Groq fallback:",
        geminiErr?.message || geminiErr
      );
    }
  }

  // 2. Secondary Fallback: Groq Whisper
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
        "[TranscriptionService] Groq Whisper fallback error:",
        err?.message || err
      );
    }
  }

  return "";
}
