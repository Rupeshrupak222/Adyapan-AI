import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  generateSpeech,
  createDIDTalk,
  getDIDTalkStatus,
} from "../services/avatar.service";

const router = Router();

// POST /api/avatar/speak
// Returns audio buffer (ElevenLabs) and optionally D-ID talk metadata
router.post("/speak", authenticateToken, async (req: Request, res: Response) => {
  const { text, voiceId, avatarUrl } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ success: false, message: "text is required" });
  }

  const hasDID = !!process.env.DID_API_KEY;
  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;

  try {
    // Mode 1: D-ID + ElevenLabs (full avatar video)
    if (hasDID) {
      const { talkId, status } = await createDIDTalk(text, avatarUrl);
      if (talkId) {
        return res.json({
          success: true,
          mode: "did",
          talkId,
          status,
          message: "Avatar talk created",
        });
      }
    }

    // Mode 2: ElevenLabs audio only (browser renders SVG avatar)
    if (hasElevenLabs) {
      const audioBuffer = await generateSpeech(text, voiceId);
      if (audioBuffer) {
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("X-Avatar-Mode", "elevenlabs");
        res.setHeader("Cache-Control", "no-store");
        return res.send(audioBuffer);
      }
    }

    // Mode 3: Browser TTS fallback
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

// GET /api/avatar/status/:talkId
// Poll D-ID for video ready state
router.get("/status/:talkId", authenticateToken, async (req: Request, res: Response) => {
  const { talkId } = req.params;
  if (!talkId) return res.status(400).json({ success: false });

  try {
    const result = await getDIDTalkStatus(talkId);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false });
  }
});

export default router;
