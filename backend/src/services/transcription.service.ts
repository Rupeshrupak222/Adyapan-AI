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

  const rawMime = mimeType || "audio/webm";
  const cleanMime = rawMime.split(";")[0].trim().toLowerCase() || "audio/webm";
  const ext = cleanMime.includes("wav")
    ? "wav"
    : cleanMime.includes("mp4") || cleanMime.includes("m4a") || cleanMime.includes("aac")
    ? "m4a"
    : cleanMime.includes("ogg")
    ? "ogg"
    : cleanMime.includes("mpeg") || cleanMime.includes("mp3")
    ? "mp3"
    : "webm";

  // 1. Primary: Groq Whisper (ultra-fast STT, <300ms)
  if (env.groqApiKey) {
    try {
      const groq = new Groq({ apiKey: env.groqApiKey });
      const file = await toFile(audioBuffer, `candidate_audio.${ext}`, {
        type: cleanMime,
      });

      const langCode = language.toLowerCase().startsWith("hi") ? "hi" : "en";
      let transcription: any = null;
      try {
        transcription = await groq.audio.transcriptions.create({
          file,
          model: "whisper-large-v3-turbo",
          language: langCode,
          response_format: "json",
        });
      } catch (turboErr: any) {
        // Fallback to whisper-large-v3
        const fileRetry = await toFile(audioBuffer, `candidate_audio.${ext}`, {
          type: cleanMime,
        });
        transcription = await groq.audio.transcriptions.create({
          file: fileRetry,
          model: "whisper-large-v3",
          language: langCode,
          response_format: "json",
        });
      }

      if (transcription && typeof transcription.text === "string") {
        const cleaned = transcription.text.trim();
        if (cleaned) {
          return cleaned;
        }
      }
    } catch (err: any) {
      console.warn(
        "[TranscriptionService] Groq Whisper error, trying Gemini fallback:",
        err?.message || err
      );
    }
  }

  // 2. Secondary Fallback: Google Gemini Multimodal Audio Transcription
  if (env.geminiApiKey) {
    try {
      const genAI = new GoogleGenerativeAI(env.geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
      const base64Data = audioBuffer.toString("base64");

      const result = await model.generateContent([
        {
          inlineData: {
            mimeType: cleanMime,
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
        "[TranscriptionService] Gemini audio fallback error:",
        geminiErr?.message || geminiErr
      );
    }
  }

  return "";
}
