import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { prisma as masterPrisma } from "../config/prisma";
import { handleRouteError } from "../utils/routeError";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

const router = Router();
router.use(requireAuth);

// Get all active jobs
router.get("/", async (req: any, res) => {
  try {
    const jobs = await masterPrisma.discoveryJob.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "Job.list", "Failed to fetch jobs");
  }
});

// Get saved job IDs
router.get("/saved", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const saved = await userPrisma.jobSaved.findMany({
      where: { userId: req.user.id },
      select: { jobId: true },
    });
    res.json({ success: true, savedIds: saved.map((s) => s.jobId) });
  } catch (error) {
    handleRouteError(res, error, "Job.saved", "Failed to fetch saved jobs");
  }
});

// Toggle save job
router.post("/saved/:jobId", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const { jobId } = req.params;
    const existing = await userPrisma.jobSaved.findUnique({
      where: { userId_jobId: { userId: req.user.id, jobId } },
    });
    if (existing) {
      await userPrisma.jobSaved.delete({ where: { id: existing.id } });
      res.json({ success: true, saved: false });
    } else {
      await userPrisma.jobSaved.create({
        data: { userId: req.user.id, jobId },
      });
      res.json({ success: true, saved: true });
    }
  } catch (error) {
    handleRouteError(res, error, "Job.toggleSave", "Failed to save job");
  }
});

// Apply to job
router.post("/apply/:jobId", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const { jobId } = req.params;
    const existing = await userPrisma.jobApplication.findUnique({
      where: { userId_jobId: { userId: req.user.id, jobId } },
    });
    if (existing) {
      return res.json({ success: true, status: "already_applied" });
    }
    await userPrisma.jobApplication.create({
      data: { userId: req.user.id, jobId },
    });
    res.json({ success: true, status: "applied" });
  } catch (error) {
    handleRouteError(res, error, "Job.apply", "Failed to apply");
  }
});

// AI Career Assistant Chat
router.post("/career-chat", async (req: any, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }

    const lastMessage = messages[messages.length - 1]?.content || "";
    const chatHistory = messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

    const result = await generateJSON(
      "You are an expert career advisor and job search assistant. Provide helpful, actionable advice about job searching, resume optimization, interview preparation, career growth, salary negotiation, and professional development. Be concise and practical.",
      `Conversation history:
${chatHistory}

User's latest message: "${lastMessage}"

Return JSON matching:
{
  "response": "Your helpful career advice response here"
}`,
      { model: MODELS.FAST, temperature: 0.7 },
      { response: "I'm here to help with your career questions. Could you please rephrase that?" }
    );

    res.json({ success: true, response: result.response });
  } catch (error) {
    handleRouteError(res, error, "Job.careerChat", "Failed to get career advice");
  }
});

export const jobRouter = router;
