import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getGlobalFeatureUsage,
  getSingleFeatureUsage,
  getFeatureUsageAttempts,
  checkAndConsumeFeatureUsage,
} from "../controllers/feature-usage.controller";

export const featureUsageRouter = Router();

featureUsageRouter.use(requireAuth);

featureUsageRouter.get("/", getGlobalFeatureUsage);
featureUsageRouter.get("/:featureKey", getSingleFeatureUsage);
featureUsageRouter.get("/:featureKey/attempts", getFeatureUsageAttempts);
featureUsageRouter.post("/:featureKey/check", checkAndConsumeFeatureUsage);
