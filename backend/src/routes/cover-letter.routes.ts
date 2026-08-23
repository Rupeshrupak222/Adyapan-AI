import { Router } from "express";
import multer from "multer";
import {
  generateCoverLetter,
  parseJDEndpoint,
  getCompanyInsights,
  getRoleMatch,
  scoreCoverLetterEndpoint,
  chatCoverLetter,
  saveCoverLetter,
  getImprovements,
  listCoverLetters,
  getCoverLetter,
  deleteCoverLetter,
  duplicateCoverLetter,
  toggleFavorite,
} from "../controllers/cover-letter.controller";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";

export const coverLetterRouter = Router();

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Intelligence Engine endpoints
coverLetterRouter.post("/generate", requireAuth, requireFeatureQuota("COVER_LETTER_GENERATOR"), generateCoverLetter);
coverLetterRouter.post("/parse-jd", requireAuth, parseJDEndpoint);
coverLetterRouter.post("/company-insights", requireAuth, getCompanyInsights);
coverLetterRouter.post("/role-match", requireAuth, getRoleMatch);
coverLetterRouter.post("/score", requireAuth, scoreCoverLetterEndpoint);
coverLetterRouter.post("/improvements", requireAuth, getImprovements);
coverLetterRouter.post("/chat", requireAuth, chatCoverLetter);
coverLetterRouter.post("/save", requireAuth, saveCoverLetter);

// CRUD
coverLetterRouter.get("/history", requireAuth, listCoverLetters);
coverLetterRouter.get("/:id", requireAuth, getCoverLetter);
coverLetterRouter.delete("/:id", requireAuth, deleteCoverLetter);
coverLetterRouter.post("/:id/duplicate", requireAuth, duplicateCoverLetter);
coverLetterRouter.post("/:id/favorite", requireAuth, toggleFavorite);
