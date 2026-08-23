import { Router } from "express";
import {
  generateFullLinkedInProfile,
  analyzeLinkedIn,
  generateHeadline,
  generateAbout,
  optimizeExperience,
  optimizeProjects,
  optimizeSkills,
  generateNetworking,
  generateContentIdeas,
  analyzeRecruiterVisibility,
  listLinkedInReports,
  getLatestReport,
  getReportById,
  deleteReport,
  duplicateReport,
  updateReport,
} from "../controllers/linkedin.controller";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";

export const linkedinRouter = Router();

// Full profile generation
linkedinRouter.post("/generate", requireAuth, requireFeatureQuota("LINKEDIN_OPTIMIZER"), generateFullLinkedInProfile);

// Legacy analyze (backward compatible)
linkedinRouter.post("/analyze", requireAuth, requireFeatureQuota("LINKEDIN_OPTIMIZER"), analyzeLinkedIn);

// Individual section generators
linkedinRouter.post("/generate-headline", requireAuth, generateHeadline);
linkedinRouter.post("/generate-about", requireAuth, generateAbout);
linkedinRouter.post("/optimize-experience", requireAuth, optimizeExperience);
linkedinRouter.post("/optimize-projects", requireAuth, optimizeProjects);
linkedinRouter.post("/optimize-skills", requireAuth, optimizeSkills);

// Networking & content
linkedinRouter.post("/networking", requireAuth, generateNetworking);
linkedinRouter.post("/content-ideas", requireAuth, generateContentIdeas);
linkedinRouter.post("/recruiter-visibility", requireAuth, analyzeRecruiterVisibility);

// CRUD & version history
linkedinRouter.get("/history", requireAuth, listLinkedInReports);
linkedinRouter.get("/latest", requireAuth, getLatestReport);
linkedinRouter.get("/:id", requireAuth, getReportById);
linkedinRouter.put("/:id", requireAuth, updateReport);
linkedinRouter.post("/:id/duplicate", requireAuth, duplicateReport);
linkedinRouter.delete("/:id", requireAuth, deleteReport);
