import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  handleGetTopics,
  handleGetCompanies,
  handleGetCompanyByName,
  handleGetQuestions,
  handleGenerateAIQuestions,
  handleSubmitAttempt,
  handleToggleBookmark,
  handleGetProgress,
} from "../controllers/reasoning.controller";

export const reasoningRouter = Router();

// Topic & Company Directory
reasoningRouter.get("/topics", requireAuth, handleGetTopics);
reasoningRouter.get("/companies", requireAuth, handleGetCompanies);
reasoningRouter.get("/company/:name", requireAuth, handleGetCompanyByName);

// Questions & Practice
reasoningRouter.get("/questions", requireAuth, handleGetQuestions);
reasoningRouter.post("/generate", requireAuth, handleGenerateAIQuestions);
reasoningRouter.post("/submit", requireAuth, handleSubmitAttempt);

// Progress & Bookmarks
reasoningRouter.get("/progress", requireAuth, handleGetProgress);
reasoningRouter.post("/bookmark", requireAuth, handleToggleBookmark);
