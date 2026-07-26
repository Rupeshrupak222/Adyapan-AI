import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateAssignment } from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";
export const assignmentRouter = Router();

assignmentRouter.use(requireAuth);

assignmentRouter.post("/generate", async (req, res) => {
  try {
    const { topic, academicLevel, wordCount } = req.body;
    const result = await generateAssignment(topic, academicLevel, wordCount);
    
    const parsedWordCount = parseInt(String(wordCount)) || 4500;
    try {
      const userPrisma = await getUserPrismaFromRequest(req);
      if (req.user?.userId) {
        await userPrisma.assignment.create({
          data: {
            userId: req.user.userId,
            topic,
            academicLevel: academicLevel || "Undergraduate",
            wordCount: parsedWordCount,
            content: result as any,
          },
        });
      }
    } catch (dbErr) {
      console.warn("[HTTP assignment] DB save warning (proceeding with result):", dbErr);
    }
    
    res.json({ success: true, assignment: { content: result } });
  } catch (error) {
    handleRouteError(res, error, "Assignment.generate", "Assignment generation failed");
  }
});

assignmentRouter.get("/history", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const assignments = await userPrisma.assignment.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, assignments });
  } catch (error) {
    handleRouteError(res, error, "Assignment.history", "Failed to fetch history");
  }
});
