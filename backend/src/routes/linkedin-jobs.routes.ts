import { Router } from "express";
import {
  searchJobs,
  checkRunStatus,
  fetchRunResults,
  saveJobHandler,
  getSavedJobsHandler,
  deleteSavedJobHandler,
  analyzeJobFitHandler,
} from "../controllers/linkedin-jobs.controller";
import { requireAuth } from "../middleware/auth";

export const linkedinJobsRouter = Router();

linkedinJobsRouter.post("/search", requireAuth, searchJobs);
linkedinJobsRouter.get("/run-status/:runId", requireAuth, checkRunStatus);
linkedinJobsRouter.get("/run-results/:datasetId", requireAuth, fetchRunResults);
linkedinJobsRouter.post("/save", requireAuth, saveJobHandler);
linkedinJobsRouter.get("/saved", requireAuth, getSavedJobsHandler);
linkedinJobsRouter.delete("/saved/:jobId", requireAuth, deleteSavedJobHandler);
linkedinJobsRouter.post("/analyze/:jobId", requireAuth, analyzeJobFitHandler);
