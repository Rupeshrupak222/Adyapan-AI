// Uses native fetch (Node 18+) — no node-fetch dependency needed

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

// Default voice: "Sarah" — natural, professional female voice
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

// ─────────────────────────────────────────────
// ElevenLabs TTS
// ─────────────────────────────────────────────
export async function generateSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID
): Promise<Buffer | null> {
  if (!ELEVENLABS_API_KEY) return null;

  const cleanText = text
    .replace(/[*_#`~]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 800);

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      console.error(
        "[avatar] ElevenLabs TTS error:",
        res.status,
        await res.text()
      );
      return null;
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[avatar] ElevenLabs fetch error:", err);
    return null;
  }
}
