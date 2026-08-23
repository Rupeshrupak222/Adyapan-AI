import { Router } from "express";
import {
  generateRoadmap,
  getLatestRoadmap,
  listRoadmaps,
  getRoadmapById,
  updateTask,
  deleteRoadmap,
} from "../controllers/career.controller";
import {
  getCareerDashboard,
  getCareerInsights,
  getCareerRecommendations,
  getCareerReadiness,
  refreshCareerDashboard,
} from "../controllers/career-dashboard.controller";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";

export const careerRouter = Router();

careerRouter.get("/dashboard", requireAuth, getCareerDashboard);
careerRouter.post("/dashboard/refresh", requireAuth, refreshCareerDashboard);
careerRouter.get("/insights", requireAuth, getCareerInsights);
careerRouter.get("/recommendations", requireAuth, getCareerRecommendations);
careerRouter.get("/readiness", requireAuth, getCareerReadiness);
careerRouter.post("/generate", requireAuth, requireFeatureQuota("CODING_ROADMAP"), generateRoadmap);
careerRouter.get("/latest", requireAuth, getLatestRoadmap);
careerRouter.get("/history", requireAuth, listRoadmaps);
careerRouter.post("/update-task", requireAuth, updateTask);
careerRouter.get("/:id", requireAuth, getRoadmapById);
careerRouter.delete("/:id", requireAuth, deleteRoadmap);

