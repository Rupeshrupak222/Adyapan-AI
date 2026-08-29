import { Router } from "express";
import { optionalAuth } from "../middleware/auth";
import {
  handleGetTopics,
  handleGetCompanies,
  handleGetCompanyByName,
  handleGetTests,
  handleGetTestById,
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

// Questions & Practice
mcqRouter.get("/questions", optionalAuth, handleGetQuestions);
mcqRouter.post("/submit", optionalAuth, handleSubmitAttempt);

// Progress & Bookmarks
mcqRouter.get("/progress", optionalAuth, handleGetProgress);
mcqRouter.post("/bookmark", optionalAuth, handleToggleBookmark);
