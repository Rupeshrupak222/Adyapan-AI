import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";
import {
  handleGetTopics,
  handleGetCompanies,
  handleGetCompanyByName,
  handleGetQuestions,
  handleGenerateAIMCQs,
  handleSubmitAttempt,
  handleToggleBookmark,
  handleGetProgress,
} from "../controllers/mcq.controller";

export const mcqRouter = Router();

// Topic & Company Directory
mcqRouter.get("/topics", requireAuth, handleGetTopics);
mcqRouter.get("/companies", requireAuth, handleGetCompanies);
mcqRouter.get("/company/:name", requireAuth, handleGetCompanyByName);

// Questions & Practice
mcqRouter.get("/questions", requireAuth, handleGetQuestions);
mcqRouter.post("/generate", requireAuth, requireFeatureQuota("TECHNICAL_MCQS"), handleGenerateAIMCQs);
mcqRouter.post("/submit", requireAuth, handleSubmitAttempt);

// Progress & Bookmarks
mcqRouter.get("/progress", requireAuth, handleGetProgress);
mcqRouter.post("/bookmark", requireAuth, handleToggleBookmark);
