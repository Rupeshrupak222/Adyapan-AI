import type { NextFunction, Request, Response } from "express";
import { requireUserId } from "../utils/request";
import {
  runLinkedInScraper,
  getRunStatus,
  getRunResults,
  saveJob,
  getSavedJobs,
  deleteSavedJob,
  analyzeJobFit,
  ScrapedJob,
} from "../services/linkedin-jobs.service";
import { callAIRobust } from "../lib/ai/openrouter";

export async function searchJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const { url, count } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ success: false, error: "URL is required" });
      return;
    }
    if (!url.includes("linkedin.com/jobs")) {
      res.status(400).json({ success: false, error: "Please provide a valid LinkedIn jobs search URL" });
      return;
    }

    const result = await runLinkedInScraper(url, count || 50);
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("LinkedIn job scrape failed:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Job scraping failed. Please try again.",
    });
  }
}

export async function checkRunStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const runId = String(req.params.runId || "");
    if (!runId) {
      res.status(400).json({ success: false, error: "Run ID is required" });
      return;
    }
    const status = await getRunStatus(runId);
    res.json({ success: true, ...status });
  } catch (err: any) {
    next(err);
  }
}

export async function fetchRunResults(req: Request, res: Response, next: NextFunction) {
  try {
    const datasetId = String(req.params.datasetId || "");
    if (!datasetId) {
      res.status(400).json({ success: false, error: "Dataset ID is required" });
      return;
    }
    const jobs = await getRunResults(datasetId);
    res.json({ success: true, jobs, total: jobs.length });
  } catch (err: any) {
    next(err);
  }
}

export async function saveJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const job: ScrapedJob = req.body;
    if (!job || !job.link || !job.title) {
      res.status(400).json({ success: false, error: "Job data with link and title is required" });
      return;
    }
    const saved = await saveJob(userId, job);
    res.json({ success: true, job: saved });
  } catch (err: any) {
    console.error("Failed to save job:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to save job" });
  }
}

export async function getSavedJobsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const jobs = await getSavedJobs(userId);
    res.json({ success: true, jobs, total: jobs.length });
  } catch (err: any) {
    next(err);
  }
}

export async function deleteSavedJobHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const jobId = String(req.params.jobId || "");
    if (!jobId) {
      res.status(400).json({ success: false, error: "Job ID is required" });
      return;
    }
    await deleteSavedJob(userId, jobId);
    res.json({ success: true });
  } catch (err: any) {
    next(err);
  }
}

export async function analyzeJobFitHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const jobId = String(req.params.jobId || "");
    if (!jobId) {
      res.status(400).json({ success: false, error: "Job ID is required" });
      return;
    }
    const analysis = await analyzeJobFit(userId, jobId, (prompt: string) =>
      callAIRobust([{ role: "user", content: prompt }], {
        model: "gemini-2.0-flash",
        temperature: 0.7,
      })
    );
    res.json({ success: true, analysis });
  } catch (err: any) {
    console.error("Job fit analysis failed:", err);
    res.status(500).json({ success: false, error: err.message || "Analysis failed" });
  }
}
