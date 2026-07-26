import { Request, Response } from "express";
import { codingAssessmentService } from "../services/coding-assessment.service";

export async function getPresetsCtrl(req: Request, res: Response) {
  try {
    const data = codingAssessmentService.getPresets();
    res.json({ success: true, ...data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch presets." });
  }
}

export async function startAssessmentCtrl(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || "demo-user-id";
    const result = await codingAssessmentService.startAssessment(userId, req.body);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to start assessment." });
  }
}

export async function runSampleCodeCtrl(req: Request, res: Response) {
  try {
    const { language, code, stdin } = req.body;
    const result = await codingAssessmentService.runSampleCode(language, code, stdin || "");
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to run sample code." });
  }
}

export async function submitQuestionCtrl(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || "demo-user-id";
    const result = await codingAssessmentService.submitQuestion(userId, req.body);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to submit question." });
  }
}

export async function submitAssessmentCtrl(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || "demo-user-id";
    const result = await codingAssessmentService.submitAssessment(userId, req.body);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to submit assessment." });
  }
}

export async function getAssessmentResultCtrl(req: Request, res: Response) {
  try {
    const id = req.params.id as string;
    const result = await codingAssessmentService.getAssessmentResult(id);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch assessment result." });
  }
}

export async function getAssessmentHistoryCtrl(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || "demo-user-id";
    const history = await codingAssessmentService.getAssessmentHistory(userId);
    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch history." });
  }
}

export async function getRecommendationsCtrl(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || "demo-user-id";
    const recommendations = await codingAssessmentService.getRecommendations(userId);
    res.json({ success: true, recommendations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch recommendations." });
  }
}
