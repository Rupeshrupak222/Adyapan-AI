import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getCategories,
  getCompanyPresetsCtrl,
  startSession,
  submitAnswer,
  completeSession,
  getSession,
  getHistory,
  getAnalytics,
  getRecommendations,
  getDailyChallenge,
  submitSessionAnswers,
  getPlacementReadiness,
} from "../controllers/aptitude-engine.controller";

export const aptitudeEngineRouter = Router();

// Categories & Company Presets
aptitudeEngineRouter.get("/categories", requireAuth, getCategories);
aptitudeEngineRouter.get("/companies", requireAuth, getCompanyPresetsCtrl);

// Session Management
aptitudeEngineRouter.post("/session/start", requireAuth, startSession);
aptitudeEngineRouter.post("/session/answer", requireAuth, submitAnswer);
aptitudeEngineRouter.post("/session/complete", requireAuth, completeSession);
aptitudeEngineRouter.post("/session/submit", requireAuth, submitSessionAnswers);
aptitudeEngineRouter.get("/session/:id", requireAuth, getSession);

// History & Analytics
aptitudeEngineRouter.get("/history", requireAuth, getHistory);
aptitudeEngineRouter.get("/analytics", requireAuth, getAnalytics);
aptitudeEngineRouter.get("/recommendations", requireAuth, getRecommendations);

// Daily Challenge
aptitudeEngineRouter.post("/daily-challenge", requireAuth, getDailyChallenge);

// Placement Readiness
aptitudeEngineRouter.get("/readiness", requireAuth, getPlacementReadiness);
