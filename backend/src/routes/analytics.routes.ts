import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  generateAnalytics,
  getDashboardData,
  getRecommendations,
  getTopicInsights,
  getLearningTrends,
  seedMockData,
  chatWithAnalytics
} from "../controllers/analytics.controller";

export const analyticsRouter = Router();

// Secure all learning analytics routes
analyticsRouter.use(requireAuth);

analyticsRouter.post("/generate", generateAnalytics);
analyticsRouter.get("/dashboard", getDashboardData);
analyticsRouter.get("/recommendations", getRecommendations);
analyticsRouter.get("/topics", getTopicInsights);
analyticsRouter.get("/trends", getLearningTrends);
analyticsRouter.post("/seed-demo", seedMockData);
analyticsRouter.post("/chat", chatWithAnalytics);
