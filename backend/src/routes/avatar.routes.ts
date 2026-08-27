import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { generateSpeech } from "../services/avatar.service";

const router = Router();

// POST /api/avatar/speak
// Returns audio buffer (ElevenLabs) or informs frontend to use browser TTS
router.post("/speak", requireAuth, async (req: Request, res: Response) => {
  const { text, voiceId } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ success: false, message: "text is required" });
  }

  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;

  try {
    // Mode 1: ElevenLabs audio (browser renders animated SVG avatar + sound)
    if (hasElevenLabs) {
      const audioBuffer = await generateSpeech(text, voiceId);
      if (audioBuffer) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-Avatar-Mode", "elevenlabs");
        res.setHeader("Cache-Control", "no-store");
        return res.send(audioBuffer);
      }
    }

    // Mode 2: Browser TTS fallback
    return res.json({
      success: true,
      mode: "browser",
      message: "Use browser TTS",
    });
  } catch (err: any) {
    console.error("[avatar/speak] error:", err);
    return res.status(500).json({ success: false, message: "Avatar generation failed" });
  }
});

export default router;
