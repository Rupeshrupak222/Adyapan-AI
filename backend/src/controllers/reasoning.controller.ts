import { Request, Response } from "express";
import {
  getTopics,
  getCompanies,
  getCompanyByName,
  getQuestions,
  generateAIQuestions,
  submitAttempt,
  toggleBookmark,
  getProgress,
} from "../services/reasoning.service";

export async function handleGetTopics(req: Request, res: Response): Promise<void> {
  try {
    const topics = await getTopics();
    res.json({ success: true, topics });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch topics" });
  }
}

export async function handleGetCompanies(req: Request, res: Response): Promise<void> {
  try {
    const companies = await getCompanies();
    res.json({ success: true, companies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch companies" });
  }
}

export async function handleGetCompanyByName(req: Request, res: Response): Promise<void> {
  try {
    const name = String(req.params.name || "");
    const company = await getCompanyByName(name);
    if (!company) {
      res.status(404).json({ success: false, error: "Company not found" });
      return;
    }
    res.json({ success: true, company });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch company details" });
  }
}

export async function handleGetQuestions(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || "guest";
    const topic = req.query.topic ? String(req.query.topic) : undefined;
    const company = req.query.company ? String(req.query.company) : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const data = await getQuestions({ topic, company, difficulty, search, page, limit, userId });
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch questions" });
  }
}

export async function handleGenerateAIQuestions(req: Request, res: Response): Promise<void> {
  try {
    const { prompt, topic, company, count, difficulty } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ success: false, error: "Prompt is required to generate AI questions" });
      return;
    }

    const questions = await generateAIQuestions(prompt, { topic, company, count: Number(count) || 5, difficulty });
    res.json({ success: true, count: questions.length, questions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to generate AI questions" });
  }
}

export async function handleSubmitAttempt(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || "guest";
    const { questionId, selectedIdx, timeTakenSeconds } = req.body || {};

    if (!questionId || typeof selectedIdx !== "number") {
      res.status(400).json({ success: false, error: "questionId and selectedIdx are required" });
      return;
    }

    const result = await submitAttempt(userId, { questionId, selectedIdx, timeTakenSeconds });
    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to submit answer" });
  }
}

export async function handleToggleBookmark(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || "guest";
    const { questionId } = req.body || {};

    if (!questionId) {
      res.status(400).json({ success: false, error: "questionId is required" });
      return;
    }

    const result = await toggleBookmark(userId, questionId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to toggle bookmark" });
  }
}

export async function handleGetProgress(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || "guest";
    const progress = await getProgress(userId);
    res.json({ success: true, progress });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || "Failed to fetch progress" });
  }
}
