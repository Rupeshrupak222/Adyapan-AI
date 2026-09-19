import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";
import { FeatureKey } from "../services/feature-keys";
import {
  handleGetTopics,
  handleGetCompanies,
  handleGetCompanyByName,
  handleGetTests,
  handleGetTestById,
  handleStartMCQSession,
  handleGetQuestions,
  handleSubmitAttempt,
  handleToggleBookmark,
  handleGetProgress,
} from "../controllers/mcq.controller";

export const mcqRouter = Router();

// Topic & Company Directory
mcqRouter.get("/topics", optionalAuth, handleGetTopics);
mcqRouter.get("/companies", optionalAuth, handleGetCompanies);
mcqRouter.get("/company/:name", optionalAuth, handleGetCompanyByName);

// Dynamic Multi-Test Endpoints
mcqRouter.get("/tests", optionalAuth, handleGetTests);
mcqRouter.get("/test/:testId", optionalAuth, handleGetTestById);

// Session Start & Quota Metering
mcqRouter.post("/session/start", requireAuth, requireFeatureQuota(FeatureKey.TECHNICAL_MCQS), handleStartMCQSession);
mcqRouter.post("/start", requireAuth, requireFeatureQuota(FeatureKey.TECHNICAL_MCQS), handleStartMCQSession);


// Questions & Practice
mcqRouter.get("/questions", optionalAuth, handleGetQuestions);
mcqRouter.post("/submit", optionalAuth, handleSubmitAttempt);

// Progress & Bookmarks
mcqRouter.get("/progress", optionalAuth, handleGetProgress);
mcqRouter.post("/bookmark", optionalAuth, handleToggleBookmark);
