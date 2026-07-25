import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generatePPTContent } from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
export const pptRouter = Router();

pptRouter.use(requireAuth);

pptRouter.post("/generate", async (req, res) => {
  try {
    const { topic, slideCount, audience, style } = req.body;
    const enrichedTopic = [topic, audience ? `Audience: ${audience}` : "", style ? `Style: ${style}` : ""].filter(Boolean).join(". ");
    const slides = await generatePPTContent(enrichedTopic, parseInt(slideCount));
    const userPrisma = await getUserPrismaFromRequest(req);
    
    const ppt = await userPrisma.presentation.create({
      data: {
        userId: req.user!.userId,
        topic,
        slideCount: parseInt(slideCount),
        audience,
        style,
        slides: slides as any,
      },
    });
    res.json({ success: true, presentation: ppt });
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
