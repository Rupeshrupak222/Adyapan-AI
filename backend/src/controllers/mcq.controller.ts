import { Request, Response } from "express";
import { handleRouteError } from "../utils/routeError";
import {
  getTopics,
  getCompanies,
  getCompanyByName,
  getQuestions,
  submitAttempt,
  toggleBookmark,
  getProgress,
  getAllTests,
  getTestsForTarget,
  getTestById,
  createNewTest,
  generateAITestWithAntiRepetition,
  updateTest,
  deleteTest,
  addQuestionToTest,
  deleteQuestionFromTest,
  getMCQOverview,
} from "../services/mcq.service";

// ─── Topics & Companies Directory ───────────────────────────────────────────

export async function handleGetTopics(req: Request, res: Response): Promise<void> {
  try {
    const topics = await getTopics();
    res.json({ success: true, topics });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.topics", "Failed to fetch MCQ topics");
  }
}

export async function handleGetCompanies(req: Request, res: Response): Promise<void> {
  try {
    const companies = await getCompanies();
    res.json({ success: true, companies });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.companies", "Failed to fetch companies");
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
    handleRouteError(res, error, "Mcq.companyByName", "Failed to fetch company details");
  }
}

// ─── Tests & Questions ──────────────────────────────────────────────────────

export async function handleGetTests(req: Request, res: Response): Promise<void> {
  try {
    const targetId = req.query.targetId ? String(req.query.targetId) : undefined;
    const targetName = req.query.targetName ? String(req.query.targetName) : undefined;

    if (targetId || targetName) {
      const tests = await getTestsForTarget(targetId || targetName || "");
      res.json({ success: true, count: tests.length, tests });
      return;
    }

    const tests = await getAllTests();
    res.json({ success: true, count: tests.length, tests });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.tests", "Failed to fetch tests");
  }
}

export async function handleGetTestById(req: Request, res: Response): Promise<void> {
  try {
    const testId = String(req.params.testId || "");
    const test = await getTestById(testId);
    if (!test) {
      res.status(404).json({ success: false, error: "Test not found" });
      return;
    }
    res.json({ success: true, test });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.testById", "Failed to fetch test details");
  }
}

export async function handleGetQuestions(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || "guest";
    const technology = req.query.technology ? String(req.query.technology) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const company = req.query.company ? String(req.query.company) : undefined;
    const difficulty = req.query.difficulty ? String(req.query.difficulty) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;
    const testId = req.query.testId ? String(req.query.testId) : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 15;

    const data = await getQuestions({ technology, category, company, difficulty, search, testId, page, limit, userId });
    res.json({ success: true, ...data });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.questions", "Failed to fetch questions");
  }
}

export async function handleSubmitAttempt(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || "guest";
    const { questionId, selectedIdx, timeTakenSeconds } = req.body || {};

    if (!questionId || typeof selectedIdx !== "number") {
      res.status(400).json({ success: false, error: "questionId and selectedIdx are required" });
      return;
    }

    const result = await submitAttempt(userId, { questionId, selectedIdx, timeTakenSeconds });
    res.json({ success: true, result });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.submit", "Failed to submit answer");
  }
}

export async function handleToggleBookmark(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || "guest";
    const { questionId } = req.body || {};

    if (!questionId) {
      res.status(400).json({ success: false, error: "questionId is required" });
      return;
    }

    const result = await toggleBookmark(userId, questionId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.bookmark", "Failed to toggle bookmark");
  }
}

export async function handleGetProgress(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || "guest";
    const progress = await getProgress(userId);
    res.json({ success: true, progress });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.progress", "Failed to fetch progress");
  }
}

// ─── Admin Controller Handlers ──────────────────────────────────────────────

export async function handleAdminGetMCQOverview(req: Request, res: Response): Promise<void> {
  try {
    const overview = await getMCQOverview();
    res.json({ success: true, overview });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.overview", "Failed to fetch MCQ overview");
  }
}

export async function handleAdminCreateTest(req: Request, res: Response): Promise<void> {
  try {
    const { targetId, targetType, targetName, title, description, difficulty, questionCount, durationMinutes, questions } = req.body || {};

    if (!targetId || !targetType || !targetName) {
      res.status(400).json({ success: false, error: "targetId, targetType, and targetName are required" });
      return;
    }

    const newTest = await createNewTest({
      targetId,
      targetType,
      targetName,
      title,
      description,
      difficulty,
      questionCount: Number(questionCount) || 15,
      durationMinutes: Number(durationMinutes) || 20,
      questions,
    });

    res.status(201).json({ success: true, test: newTest });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.createTest", "Failed to create test");
  }
}

export async function handleAdminGenerateAITest(req: Request, res: Response): Promise<void> {
  try {
    const { targetId, targetType, targetName, count, difficulty, prompt } = req.body || {};

    if (!targetId || !targetType || !targetName) {
      res.status(400).json({ success: false, error: "targetId, targetType, and targetName are required" });
      return;
    }

    const newTest = await generateAITestWithAntiRepetition({
      targetId,
      targetType,
      targetName,
      count: Number(count) || 15,
      difficulty: difficulty || "Medium",
      prompt,
    });

    res.status(201).json({ success: true, test: newTest });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.aiGenerateTest", "Failed to AI generate test");
  }
}

export async function handleAdminUpdateTest(req: Request, res: Response): Promise<void> {
  try {
    const testId = String(req.params.testId || "");
    const updates = req.body || {};
    const updated = await updateTest(testId, updates);
    if (!updated) {
      res.status(404).json({ success: false, error: "Test not found" });
      return;
    }
    res.json({ success: true, test: updated });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.updateTest", "Failed to update test");
  }
}

export async function handleAdminDeleteTest(req: Request, res: Response): Promise<void> {
  try {
    const testId = String(req.params.testId || "");
    const deleted = await deleteTest(testId);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Test not found" });
      return;
    }
    res.json({ success: true, message: "Test deleted successfully" });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.deleteTest", "Failed to delete test");
  }
}

export async function handleAdminAddQuestionToTest(req: Request, res: Response): Promise<void> {
  try {
    const testId = String(req.params.testId || "");
    const questionData = req.body || {};
    const updated = await addQuestionToTest(testId, questionData);
    if (!updated) {
      res.status(404).json({ success: false, error: "Test not found" });
      return;
    }
    res.json({ success: true, test: updated });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.addQuestion", "Failed to add question to test");
  }
}

export async function handleAdminDeleteQuestion(req: Request, res: Response): Promise<void> {
  try {
    const testId = String(req.params.testId || "");
    const questionId = String(req.params.questionId || "");
    const updated = await deleteQuestionFromTest(testId, questionId);
    if (!updated) {
      res.status(404).json({ success: false, error: "Test not found" });
      return;
    }
    res.json({ success: true, test: updated });
  } catch (error: any) {
    handleRouteError(res, error, "Mcq.deleteQuestion", "Failed to delete question from test");
  }
}
