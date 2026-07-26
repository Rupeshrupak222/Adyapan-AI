import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generatePresentationSpec } from "../services/presentation-ai.service";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
export const pptRouter = Router();

pptRouter.use(requireAuth);

pptRouter.post("/generate", async (req, res) => {
  try {
    const { topic, slideCount, audience, style, presentationType, themePreference } = req.body;
    const parsedCount = parseInt(String(slideCount)) || 5;

    const spec = await generatePresentationSpec({
      topic,
      slideCount: parsedCount,
      audience,
      presentationType: style || presentationType || "Academic Keynote",
      themePreference: themePreference || "tech-premium",
    });

    try {
      const userPrisma = await getUserPrismaFromRequest(req);
      if (req.user?.userId) {
        await userPrisma.presentation.create({
          data: {
            userId: req.user.userId,
            topic,
            slideCount: parsedCount,
            audience: audience || "General",
            style: style || "Tech Premium",
            slides: spec as any,
          },
        });
      }
    } catch (dbErr) {
      console.warn("[HTTP ppt] DB save warning (proceeding with result):", dbErr);
    }

    res.json({ success: true, presentation: spec });
  } catch (error) {
    handleRouteError(res, error, "Ppt.generate", "PPT generation failed");
  }
});


pptRouter.get("/history", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const ppts = await userPrisma.presentation.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, presentations: ppts });
  } catch (error) {
    handleRouteError(res, error, "Ppt.history", "Failed to fetch history");
  }
});
