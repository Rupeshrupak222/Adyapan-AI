import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { handleRouteError } from "../utils/routeError";
import { generatePresentationSpec } from "../services/presentation-ai.service";
import { generatePresentationPptx } from "../services/presentation-pptx.service";
import { getTheme } from "../services/presentation-theme.service";

export const presentationExportRouter = Router();

// Optional auth for public preview export access
presentationExportRouter.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return requireAuth(req, res, next);
  }
  next();
});

/**
 * POST /api/export/ppt/generate or /api/ppt/generate
 */
presentationExportRouter.post("/generate", async (req, res) => {
  try {
    const { topic, presentationType, slideCount, audience, language, themePreference } = req.body;
    const presentation = await generatePresentationSpec({
      topic,
      presentationType,
      slideCount: parseInt(String(slideCount)) || 10,
      audience,
      language,
      themePreference,
    });

    res.json({ success: true, presentation });
  } catch (error) {
    handleRouteError(res, error, "Presentation.generate", "Failed to generate presentation spec");
  }
});

/**
 * POST /api/export/ppt/pptx or /api/ppt/export/pptx
 */
presentationExportRouter.post("/pptx", async (req, res) => {
  try {
    const { presentation, topic, themePreference } = req.body;

    let spec = presentation;
    if (!spec || !spec.slides) {
      spec = await generatePresentationSpec({
        topic: topic || "Academic Presentation",
        themePreference,
      });
    }

    const pptxBuffer = await generatePresentationPptx(spec);
    const safeTitle = (spec.title || "AdyapanAI_Presentation")
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "_");
    const filename = `${safeTitle}_Keynote.pptx`;

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pptxBuffer.length.toString(),
    });

    res.send(pptxBuffer);
  } catch (error) {
    handleRouteError(res, error, "Presentation.export.pptx", "PPTX export failed");
  }
});
