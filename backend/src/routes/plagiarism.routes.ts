import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";
import {
  analyzePlagiarismSSE,
  analyzePlagiarismSync,
  getReport,
  humanizeText,
  rewriteSection,
} from "../controllers/plagiarism.controller";

export const plagiarismRouter = Router();

plagiarismRouter.use(requireAuth);

// Full analysis (SSE streaming)
plagiarismRouter.post("/analyze", requireFeatureQuota("PLAGIARISM_CHECKER"), analyzePlagiarismSSE);

// Full analysis (non-streaming fallback)
plagiarismRouter.post("/analyze-sync", requireFeatureQuota("PLAGIARISM_CHECKER"), analyzePlagiarismSync);

// Retrieve stored report
plagiarismRouter.get("/report/:id", getReport);

// Humanize AI-generated text
plagiarismRouter.post("/humanize", humanizeText);

// Rewrite a specific flagged section
plagiarismRouter.post("/rewrite-section", rewriteSection);
