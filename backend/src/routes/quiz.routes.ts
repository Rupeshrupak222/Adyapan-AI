import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";
import { generateEnhancedQuiz, generateQuiz } from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";

export const quizRouter = Router();

quizRouter.use(requireAuth);

quizRouter.post("/generate", requireFeatureQuota("QUIZ_GENERATOR"), async (req, res) => {
  try {
    const { topic, mode, duration } = req.body;
    const userPrisma = await getUserPrismaFromRequest(req);
    
    if (mode && ["beginner", "intermediate", "interview", "revision"].includes(mode)) {
      const result = await generateEnhancedQuiz(topic, mode, duration || "10m");
      const quiz = await userPrisma.quiz.create({
        data: {
          userId: req.user!.userId,
          topic,
          difficulty: result.difficulty || mode,
          questions: result.questions as any,
        },
      });

      // Track Streak Activity
      StreakService.trackActivity(
        req.user!.userId,
        "GENERATE_QUESTIONS",
        "quiz_generator",
        quiz.id,
        20, // 20 points
        getTimezone(req),
        userPrisma
      ).catch(err => console.error("Streak tracking error:", err));

      res.json({ success: true, quiz: result, id: quiz.id });
    } else {
      const result = await generateQuiz(topic, 5, "medium");
      const quiz = await userPrisma.quiz.create({
        data: {
          userId: req.user!.userId,
          topic,
          difficulty: "medium",
          questions: result.questions as any,
        },
      });
      if (result.flashcards.length > 0) {
        await userPrisma.flashcard.createMany({
          data: result.flashcards.map((fc: any) => ({
            userId: req.user!.userId,
            quizId: quiz.id,
            topic,
            front: fc.front,
            back: fc.back,
          })),
        });
      }

      // Track Streak Activity
      StreakService.trackActivity(
        req.user!.userId,
        "GENERATE_QUESTIONS",
        "quiz_generator",
        quiz.id,
        20, // 20 points
        getTimezone(req),
        userPrisma
      ).catch(err => console.error("Streak tracking error:", err));

      res.json({ success: true, quiz: { questions: result.questions }, flashcards: result.flashcards });
    }
  } catch (error) {
    handleRouteError(res, error, "Quiz.generate", "Quiz generation failed");
  }
});

quizRouter.get("/history", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const quizzes = await userPrisma.quiz.findMany({
      where: { userId: req.user!.userId },
      include: { attempts: true, flashcards: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, quizzes });
  } catch (error) {
    handleRouteError(res, error, "Quiz.history", "Failed to fetch history");
  }
});
