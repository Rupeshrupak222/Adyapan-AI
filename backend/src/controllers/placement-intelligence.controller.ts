import type { NextFunction, Request, Response } from "express";
import { requireUserId } from "../utils/request";
import {
  getOrGeneratePlacementIntelligence,
  refreshPlacementIntelligence,
  getCompanyMatchDetails,
  generatePlacementIntelligence,
} from "../services/placement-intelligence.service";

export async function getPlacementIntelligence(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const result = await getOrGeneratePlacementIntelligence(userId);
    res.json({ success: true, intelligence: result, cached: result.cached });
  } catch (error) {
    next(error);
  }
}

export async function refreshIntelligence(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const result = await refreshPlacementIntelligence(userId);
    res.json({ success: true, intelligence: result });
  } catch (error) {
    next(error);
  }
}

export async function getCompanyMatch(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const company = req.params.company as string;
    if (!company) {
      res.status(400).json({ success: false, error: "company parameter is required" });
      return;
    }
    const match = await getCompanyMatchDetails(userId, company);
    if (!match) {
      res.status(404).json({ success: false, error: "Company not found in benchmarks" });
      return;
    }
    res.json({ success: true, match });
  } catch (error) {
    next(error);
  }
}

export async function getPlacementScore(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const result = await getOrGeneratePlacementIntelligence(userId);
    res.json({
      success: true,
      placementScore: result.placementScore,
      subScores: result.subScores,
      cached: result.cached,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPlacementRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const result = await getOrGeneratePlacementIntelligence(userId);
    res.json({
      success: true,
      recommendations: result.recommendations,
      highestImpactTask: result.highestImpactTask,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCompanyMatches(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const result = await getOrGeneratePlacementIntelligence(userId);
    const { top } = req.query;
    const limit = top ? parseInt(top as string, 10) : result.companyMatches.length;
    res.json({
      success: true,
      companyMatches: result.companyMatches.slice(0, limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getSalaryEstimate(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const result = await getOrGeneratePlacementIntelligence(userId);
    res.json({ success: true, salaryEstimate: result.salaryEstimate });
  } catch (error) {
    next(error);
  }
}

export async function getReadinessTimeline(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const result = await getOrGeneratePlacementIntelligence(userId);
    res.json({ success: true, readinessTimeline: result.readinessTimeline });
  } catch (error) {
    next(error);
  }
}
