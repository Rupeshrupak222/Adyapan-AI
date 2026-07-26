import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getPlacementTopics,
  startPractice,
  submitPractice,
  getPracticeHistory,
  createMockTest,
  listMockTests,
  submitMockTest,
  getMockTestHistory,
  coachChat,
  readinessReport,
} from "../controllers/placement.controller";

export const placementRouter = Router();

// Placement Hub Routes
placementRouter.get("/topics", requireAuth, getPlacementTopics);
placementRouter.post("/practice/start", requireAuth, startPractice);
placementRouter.post("/practice/submit", requireAuth, submitPractice);
placementRouter.get("/practice/history", requireAuth, getPracticeHistory);

// Mock Tests
placementRouter.post("/mock/create", requireAuth, createMockTest);
placementRouter.get("/mock/list", requireAuth, listMockTests);
placementRouter.post("/mock/submit", requireAuth, submitMockTest);
placementRouter.get("/mock/history", requireAuth, getMockTestHistory);

// AI Coach
placementRouter.post("/coach/chat", requireAuth, coachChat);

// Readiness
placementRouter.get("/readiness", requireAuth, readinessReport);
