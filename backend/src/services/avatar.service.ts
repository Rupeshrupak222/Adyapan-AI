import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const DID_API_KEY = process.env.DID_API_KEY || "";

// Default voice: "Sarah" — natural, professional female voice
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

// Default D-ID avatar image (professional female presenter)
const DEFAULT_AVATAR_URL =
  "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/thumbnail.jpeg";

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
    .slice(0, 800); // ElevenLabs caps per request

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

    const buffer = await res.buffer();
    return buffer;
  } catch (err) {
    console.error("[avatar] ElevenLabs fetch error:", err);
    return null;
  }
}

// ─────────────────────────────────────────────
// D-ID Talk (avatar video)
// ─────────────────────────────────────────────
export async function createDIDTalk(
  text: string,
  avatarUrl: string = DEFAULT_AVATAR_URL
): Promise<{ talkId: string | null; status: string }> {
  if (!DID_API_KEY) {
    return { talkId: null, status: "no_key" };
  }

  const cleanText = text
    .replace(/[*_#`~]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 500);

  try {
    const res = await fetch("https://api.d-id.com/talks", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(DID_API_KEY).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_url: avatarUrl,
        script: {
          type: "text",
          input: cleanText,
          provider: {
            type: "elevenlabs",
            voice_id: DEFAULT_VOICE_ID,
          },
        },
        config: {
          stitch: true,
        },
      }),
    });

    if (!res.ok) {
      console.error(
        "[avatar] D-ID talk create error:",
        res.status,
        await res.text()
      );
      return { talkId: null, status: "error" };
    }

    const data = (await res.json()) as { id: string; status: string };
    return { talkId: data.id, status: data.status || "created" };
  } catch (err) {
    console.error("[avatar] D-ID fetch error:", err);
    return { talkId: null, status: "error" };
  }
}

export async function getDIDTalkStatus(
  talkId: string
): Promise<{ status: string; videoUrl: string | null }> {
  if (!DID_API_KEY) return { status: "no_key", videoUrl: null };

  try {
    const res = await fetch(`https://api.d-id.com/talks/${talkId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(DID_API_KEY).toString("base64")}`,
      },
    });

    if (!res.ok) return { status: "error", videoUrl: null };

    const data = (await res.json()) as {
      status: string;
      result_url?: string;
    };
    return {
      status: data.status,
      videoUrl: data.result_url || null,
    };
  } catch (err) {
    console.error("[avatar] D-ID status fetch error:", err);
    return { status: "error", videoUrl: null };
  }
}
