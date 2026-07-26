import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getPresetsCtrl,
  startAssessmentCtrl,
  runSampleCodeCtrl,
  submitQuestionCtrl,
  submitAssessmentCtrl,
  getAssessmentResultCtrl,
  getAssessmentHistoryCtrl,
  getRecommendationsCtrl,
} from "../controllers/coding-assessment.controller";

export const codingAssessmentRouter = Router();

// Assessment Metadata & Presets
codingAssessmentRouter.get("/presets", requireAuth, getPresetsCtrl);

// Session Lifecycle
codingAssessmentRouter.post("/start", requireAuth, startAssessmentCtrl);
codingAssessmentRouter.post("/run", requireAuth, runSampleCodeCtrl);
codingAssessmentRouter.post("/submit-question", requireAuth, submitQuestionCtrl);
codingAssessmentRouter.post("/submit", requireAuth, submitAssessmentCtrl);

// Result Reports & History
codingAssessmentRouter.get("/result/:id", requireAuth, getAssessmentResultCtrl);
codingAssessmentRouter.get("/history", requireAuth, getAssessmentHistoryCtrl);
codingAssessmentRouter.get("/recommendations", requireAuth, getRecommendationsCtrl);
