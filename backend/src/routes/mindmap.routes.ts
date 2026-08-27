import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";
import { generateEnhancedMindMap } from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";

export const mindMapRouter = Router();

mindMapRouter.use(requireAuth);

mindMapRouter.post("/generate", requireFeatureQuota("MIND_MAPS"), async (req, res) => {
  try {
    const { topic, mode } = req.body;
    const result = await generateEnhancedMindMap(topic, mode || "intermediate");
    const userPrisma = await getUserPrismaFromRequest(req);
    
    let mindmapId: string | undefined;
    try {
      const mindmap = await userPrisma.mindMap.create({
        data: {
          userId: req.user!.userId,
          topic,
          nodes: result.mindmap.nodes as any,
          edges: result.mindmap.edges as any,
        },
      });
      mindmapId = mindmap.id;

      // Track Streak Activity
      StreakService.trackActivity(
        req.user!.userId,
        "CREATE_MIND_MAP",
        "mindmap_generator",
        mindmap.id,
        15, // 15 points
        getTimezone(req),
        userPrisma
      ).catch(err => console.error("Streak tracking error:", err));
    } catch (dbErr) {
      console.warn("[MindMap.generate] Failed to persist mindmap in database:", dbErr);
    }

    res.json({ success: true, mindmap: result.mindmap, id: mindmapId });
  } catch (error) {
    handleRouteError(res, error, "MindMap.generate", "Mind map generation failed");
  }
});

mindMapRouter.post("/expand", async (req, res) => {
  try {
    const { topic, mode, nodeLabel } = req.body;
    const result = await generateEnhancedMindMap(`${topic} - ${nodeLabel} (sub-topics)`, mode || "intermediate");
    const userPrisma = await getUserPrismaFromRequest(req);

    // Track Streak Activity
    StreakService.trackActivity(
      req.user!.userId,
      "CREATE_MIND_MAP",
      "mindmap_generator",
      null,
      10, // 10 points
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ success: true, expansion: result.mindmap });
  } catch (error) {
    handleRouteError(res, error, "MindMap.expand", "Expansion failed");
  }
});

mindMapRouter.get("/history", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const mindmaps = await userPrisma.mindMap.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    }).catch(err => {
      console.warn("[MindMap.history] Failed to query database history:", err);
      return [];
    });
    res.json({ success: true, mindmaps });
  } catch (error) {
    handleRouteError(res, error, "MindMap.history", "Failed to fetch history");
  }
});
