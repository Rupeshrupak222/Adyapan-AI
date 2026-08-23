import { Router } from "express";
import multer from "multer";
import {
  analyzeATSReport,
  listATSReports,
  getATSReport,
  analyzeJDMatch,
  getATSSuggestions,
  applyImprovement,
  atsChatHandler,
  analyzeATSIntelligence,
  compareResumeVersions,
  getLatestATSReport,
} from "../controllers/ats.controller";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";

export const atsRouter = Router();

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

atsRouter.post("/analyze", requireAuth, requireFeatureQuota("ATS_CHECKER"), uploadMemory.single("resume"), analyzeATSReport);
atsRouter.post("/jd-match", requireAuth, uploadMemory.single("resume"), analyzeJDMatch);
atsRouter.post("/suggestions", requireAuth, getATSSuggestions);
atsRouter.post("/apply-improvement", requireAuth, applyImprovement);
atsRouter.post("/chat", requireAuth, atsChatHandler);
atsRouter.post("/intelligence", requireAuth, uploadMemory.single("resume"), analyzeATSIntelligence);
atsRouter.post("/compare", requireAuth, compareResumeVersions);
atsRouter.get("/latest", requireAuth, getLatestATSReport);
atsRouter.get("/history", requireAuth, listATSReports);
atsRouter.get("/:id", requireAuth, getATSReport);
