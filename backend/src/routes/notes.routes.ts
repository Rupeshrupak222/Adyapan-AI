import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateNotes } from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";
import { formatNotesBodyHtml } from "../services/notes-formatter.service";

export const notesRouter = Router();

notesRouter.use(requireAuth);

notesRouter.post("/generate", async (req, res) => {
  try {
    const topic = req.body.topic || "General";
    const difficulty = req.body.difficulty || "Intermediate";
    const type = req.body.type || "Detailed Notes";

    const content = await generateNotes(topic, difficulty, type);
    const userPrisma = await getUserPrismaFromRequest(req);

    // Format markdown to clean HTML for frontend rendering
    const formattedContent = formatNotesBodyHtml(content);

    const note = await userPrisma.generatedNote.create({
      data: {
        userId: req.user!.userId,
        topic,
        difficulty,
        type,
        content,
        formattedContent,
      },
    });

    // Track Streak Activity
    StreakService.trackActivity(
      req.user!.userId,
      "GENERATE_NOTES",
      "notes_generator",
      note.id,
      15,
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ success: true, note });
  } catch (error) {
    handleRouteError(res, error, "Notes.generate", "Note generation failed");
  }
});

notesRouter.get("/history", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const notes = await userPrisma.generatedNote.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, notes });
  } catch (error) {
    handleRouteError(res, error, "Notes.history", "Failed to fetch history");
  }
});
