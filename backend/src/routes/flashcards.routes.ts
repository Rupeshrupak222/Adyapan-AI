import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateFlashcards } from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";

export const flashcardsRouter = Router();

flashcardsRouter.use(requireAuth);

flashcardsRouter.post("/generate", async (req, res) => {
  try {
    const { topic, mode, cardCount } = req.body;
    const result = await generateFlashcards(topic, mode || "intermediate", cardCount || 5);
    const userPrisma = await getUserPrismaFromRequest(req);

    if (result?.cards && Array.isArray(result.cards)) {
      const cardsToSave = result.cards.map((card: any) => ({
        userId: req.user!.userId,
        topic: topic,
        front: card.front || "",
        back: JSON.stringify({
          answer: card.back || "",
          explanation: card.explanation || "",
          memoryTip: card.memoryTip || "",
          difficulty: card.difficulty || "medium",
        }),
      }));

      await userPrisma.flashcard.createMany({ data: cardsToSave });
    }

    StreakService.trackActivity(
      req.user!.userId,
      "CREATE_FLASHCARDS",
      "flashcards_generator",
      null,
      15,
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ success: true, data: result });
  } catch (error) {
    handleRouteError(res, error, "Flashcards.generate", "Flashcard generation failed");
  }
});

flashcardsRouter.get("/history", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const flashcards = await userPrisma.flashcard.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });

    const grouped: Record<string, any[]> = {};
    flashcards.forEach((card: any) => {
      let backData: any = {};
      try {
        backData = JSON.parse(card.back);
      } catch {
        backData = { answer: card.back };
      }

      const enriched = {
        id: card.id,
        front: card.front,
        back: backData.answer || card.back,
        explanation: backData.explanation || "",
        memoryTip: backData.memoryTip || "",
        difficulty: backData.difficulty || "medium",
        createdAt: card.createdAt,
      };

      if (!grouped[card.topic]) grouped[card.topic] = [];
      grouped[card.topic].push(enriched);
    });

    const topics = Object.entries(grouped).map(([topic, cards]) => ({
      topic,
      cards,
      cardCount: cards.length,
      createdAt: cards[0]?.createdAt,
    }));

    res.json({ success: true, topics });
  } catch (error) {
    handleRouteError(res, error, "Flashcards.history", "Failed to fetch flashcard history");
  }
});
