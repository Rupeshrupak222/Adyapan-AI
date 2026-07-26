import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getPlacementIntelligence,
  refreshIntelligence,
  getCompanyMatch,
  getPlacementScore,
  getPlacementRecommendations,
  getCompanyMatches,
  getSalaryEstimate,
  getReadinessTimeline,
} from "../controllers/placement-intelligence.controller";

export const placementIntelligenceRouter = Router();

// Core intelligence endpoint
placementIntelligenceRouter.get("/", requireAuth, getPlacementIntelligence);

// Quick score only
placementIntelligenceRouter.get("/score", requireAuth, getPlacementScore);

// Refresh / recalculate
placementIntelligenceRouter.post("/refresh", requireAuth, refreshIntelligence);

// Recommendations & insights
placementIntelligenceRouter.get("/recommendations", requireAuth, getPlacementRecommendations);

// Company matches
placementIntelligenceRouter.get("/companies", requireAuth, getCompanyMatches);
placementIntelligenceRouter.get("/companies/:company", requireAuth, getCompanyMatch);

// Salary estimate
placementIntelligenceRouter.get("/salary", requireAuth, getSalaryEstimate);

// Readiness timeline
placementIntelligenceRouter.get("/timeline", requireAuth, getReadinessTimeline);
