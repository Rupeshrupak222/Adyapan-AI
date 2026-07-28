import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { handleRouteError } from "../utils/routeError";
import { JobSearchService } from "../services/job-search.service";
import { JobDiscoveryService } from "../services/job-discovery.service";
import { generateJSON } from "../lib/ai/openrouter";
import { getUserPrismaFromRequest } from "../utils/prisma";

export const jobDiscoveryRouter = Router();
jobDiscoveryRouter.use(requireAuth);

// ─── GET /jobs - Search jobs with filters ──────────────────────────────
jobDiscoveryRouter.get("/jobs", async (req: Request, res: Response) => {
  try {
    const {
      query, company, location, country, state, city, workMode, employmentType,
      experienceMin, experienceMax, salaryMin, salaryMax, skills, industry,
      education, companySize, source, isFeatured, postedWithin,
      sortBy = "postedAt", sortOrder = "desc", page = "1", limit = "20",
    } = req.query;

    const filters: any = {
      query: query as string,
      company: company as string,
      location: location as string,
      country: country as string,
      state: state as string,
      city: city as string,
      workMode: workMode as string,
      employmentType: employmentType as string,
      experienceMin: experienceMin ? parseInt(experienceMin as string) : undefined,
      experienceMax: experienceMax ? parseInt(experienceMax as string) : undefined,
      salaryMin: salaryMin ? parseInt(salaryMin as string) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax as string) : undefined,
      skills: skills ? (skills as string).split(",").map(s => s.trim()).filter(Boolean) : undefined,
      industry: industry as string,
      education: education as string,
      companySize: companySize as string,
      source: source as string,
      isFeatured: isFeatured === "true" ? true : undefined,
      postedWithin: postedWithin as any,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: parseInt(page as string) || 1,
      limit: Math.min(100, parseInt(limit as string) || 20),
    };

    const result = await JobSearchService.search(filters);

    const userId = (req as any).user?.userId;
    if (userId && query) {
      JobSearchService.logSearch(userId, query as string, filters, result.total).catch(() => {});
    }

    res.json({ success: true, ...result });
  } catch (error) {
    handleRouteError(res, error, "Discovery.search", "Failed to search jobs");
  }
});

// ─── GET /jobs/:id - Get job detail ────────────────────────────────────
jobDiscoveryRouter.get("/jobs/:id", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const job = await JobSearchService.getJobById(req.params.id as string, userId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.json({ success: true, job });
  } catch (error) {
    handleRouteError(res, error, "Discovery.getJob", "Failed to get job");
  }
});

// ─── GET /jobs/company/:slug - Company profile ─────────────────────────
jobDiscoveryRouter.get("/jobs/company/:slug", async (req: Request, res: Response) => {
  try {
    const company = await JobSearchService.getCompanyProfile(req.params.slug as string);
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    res.json({ success: true, company });
  } catch (error) {
    handleRouteError(res, error, "Discovery.company", "Failed to get company");
  }
});

// ─── GET /companies - List all companies ───────────────────────────────
jobDiscoveryRouter.get("/companies", async (_req: Request, res: Response) => {
  try {
    const companies = await JobSearchService.getCompanies();
    res.json({ success: true, companies });
  } catch (error) {
    handleRouteError(res, error, "Discovery.companies", "Failed to get companies");
  }
});

// ─── GET /recommended - Recommended jobs ───────────────────────────────
jobDiscoveryRouter.get("/recommended", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const jobs = await JobSearchService.getRecommendedJobs(userId, limit);
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "Discovery.recommended", "Failed to get recommendations");
  }
});

// ─── GET /trending - Trending jobs ─────────────────────────────────────
jobDiscoveryRouter.get("/trending", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const jobs = await JobSearchService.getTrendingJobs(limit);
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "Discovery.trending", "Failed to get trending jobs");
  }
});

// ─── GET /suggestions - Search autocomplete ────────────────────────────
jobDiscoveryRouter.get("/suggestions", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const suggestions = await JobSearchService.getSuggestions(q);
    res.json({ success: true, suggestions });
  } catch (error) {
    handleRouteError(res, error, "Discovery.suggestions", "Failed to get suggestions");
  }
});

// ─── POST /jobs/:id/save - Toggle save ─────────────────────────────────
jobDiscoveryRouter.post("/jobs/:id/save", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const result = await JobSearchService.toggleSave(userId, req.params.id as string);
    res.json({ success: true, ...result });
  } catch (error) {
    handleRouteError(res, error, "Discovery.save", "Failed to save job");
  }
});

// ─── GET /jobs/saved - Saved jobs ──────────────────────────────────────
jobDiscoveryRouter.get("/jobs/saved", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await JobSearchService.getSavedJobs(userId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    handleRouteError(res, error, "Discovery.saved", "Failed to get saved jobs");
  }
});

// ─── GET /jobs/recently-viewed - Recently viewed ──────────────────────
jobDiscoveryRouter.get("/jobs/recently-viewed", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 10;
    const jobs = await JobSearchService.getRecentlyViewed(userId, limit);
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "Discovery.recentlyViewed", "Failed to get recently viewed");
  }
});

// ─── GET /search/history - Search history ──────────────────────────────
jobDiscoveryRouter.get("/search/history", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await JobSearchService.getSearchHistory(userId, limit);
    res.json({ success: true, history });
  } catch (error) {
    handleRouteError(res, error, "Discovery.history", "Failed to get search history");
  }
});

// ─── GET /analytics - Job analytics ────────────────────────────────────
jobDiscoveryRouter.get("/analytics", async (_req: Request, res: Response) => {
  try {
    const analytics = await JobSearchService.getJobAnalytics();
    res.json({ success: true, analytics });
  } catch (error) {
    handleRouteError(res, error, "Discovery.analytics", "Failed to get analytics");
  }
});

// ─── POST /jobs/:id/match - AI job match analysis ──────────────────────
jobDiscoveryRouter.post("/jobs/:id/match", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const jobId = req.params.id as string;

    const job = await JobSearchService.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    let userProfile: any = null;
    let placementData: any = null;

    try {
      const prisma = await getUserPrismaFromRequest(req);
      const profile = await prisma.profile.findUnique({ where: { userId } });
      userProfile = profile;
    } catch {
      // Non-critical
    }

    try {
      placementData = await JobSearchService.getRecommendedJobs(userId, 1);
    } catch {
      // Non-critical
    }

    const systemPrompt = `You are an AI Career Matching Engine. Analyze how well a candidate matches a job posting.
Given the job details and candidate profile, provide a JSON response with:
{
  "overallMatch": 0-100,
  "skillMatch": { "score": 0-100, "matched": ["skill1"], "missing": ["skill2"] },
  "experienceMatch": { "score": 0-100, "details": "explanation" },
  "resumeMatch": { "score": 0-100, "details": "explanation" },
  "whyThisJobMatches": "detailed explanation of why this job is a good fit for this candidate",
  "missingSkills": ["skill1", "skill2"],
  "learningResources": [{ "skill": "name", "resource": "resource name", "estimatedWeeks": 2 }],
  "preparationTips": ["tip1", "tip2"],
  "estimatedTimeToImprove": "X weeks",
  "placementReadiness": "how ready the candidate is for this specific role"
}`;

    const userPrompt = `Job Details:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Work Mode: ${job.workMode}
Employment Type: ${job.employmentType}
Experience: ${job.experienceMin || 0}-${job.experienceMax || "any"} years
Required Skills: ${job.skills?.join(", ") || "Not specified"}
Description: ${(job.description || "").slice(0, 2000)}
Requirements: ${(job.requirements || []).join(", ")}

Candidate Profile:
Name: ${userProfile?.careerGoal || "Student"}
Skills: ${userProfile?.skills?.join(", ") || "Not specified"}
Target Role: ${userProfile?.targetRole || "Not specified"}
Location: ${userProfile?.location || "Not specified"}
Career Goal: ${userProfile?.careerObjective || "Not specified"}`;

    const analysis = await generateJSON(
      systemPrompt,
      userPrompt,
      { model: "google/gemini-2.0-flash", temperature: 0.3 },
      {
        overallMatch: 50,
        skillMatch: { score: 50, matched: [], missing: job.skills || [] },
        experienceMatch: { score: 50, details: "Insufficient data" },
        resumeMatch: { score: 50, details: "Insufficient data" },
        whyThisJobMatches: "We need more data about your profile to provide a detailed match analysis. Complete your profile to get personalized insights.",
        missingSkills: job.skills || [],
        learningResources: [],
        preparationTips: ["Complete your profile", "Upload your resume", "Add your skills"],
        estimatedTimeToImprove: "4-6 weeks",
        placementReadiness: "Building foundations",
      }
    );

    res.json({ success: true, match: analysis });
  } catch (error) {
    handleRouteError(res, error, "Discovery.match", "Failed to analyze job match");
  }
});

// ─── POST /jobs/:id/missing-skills - AI missing skills ─────────────────
jobDiscoveryRouter.post("/jobs/:id/missing-skills", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const jobId = req.params.id as string;

    const job = await JobSearchService.getJobById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    let userProfile: any = null;
    try {
      const prisma = await getUserPrismaFromRequest(req);
      userProfile = await prisma.profile.findUnique({ where: { userId } });
    } catch {
      // Non-critical
    }

    const systemPrompt = `You are an AI Skills Gap Analyzer. Analyze what skills a candidate is missing for a specific job.
Provide a JSON response with:
{
  "missingTechnicalSkills": [{ "skill": "name", "importance": "critical|important|nice-to-have", "estimatedWeeks": 2, "resources": ["resource1"] }],
  "missingSoftSkills": [{ "skill": "name", "importance": "critical|important|nice-to-have", "estimatedWeeks": 1 }],
  "missingCertifications": [{ "cert": "name", "value": "description", "estimatedWeeks": 4 }],
  "missingExperience": [{ "area": "name", "suggestion": "how to gain this experience" }],
  "overallGapScore": 0-100,
  "summary": "overall assessment of the skills gap",
  "priorityActions": ["action1", "action2"]
}`;

    const userPrompt = `Job Requirements:
Title: ${job.title}
Company: ${job.company}
Required Skills: ${job.skills?.join(", ") || "Not specified"}
Description: ${(job.description || "").slice(0, 2000)}
Requirements: ${(job.requirements || []).join(", ")}

Candidate Skills: ${userProfile?.skills?.join(", ") || "Not specified"}
Target Role: ${userProfile?.targetRole || "Not specified"}`;

    const analysis = await generateJSON(
      systemPrompt,
      userPrompt,
      { model: "google/gemini-2.0-flash", temperature: 0.3 },
      {
        missingTechnicalSkills: (job.skills || []).map((s: string) => ({
          skill: s, importance: "important", estimatedWeeks: 2, resources: ["Online courses", "Practice projects"]
        })),
        missingSoftSkills: [],
        missingCertifications: [],
        missingExperience: [],
        overallGapScore: 30,
        summary: "Complete your profile with skills and upload your resume for a detailed gap analysis.",
        priorityActions: ["Update your profile", "Add your skills", "Upload your resume"],
      }
    );

    res.json({ success: true, missingSkills: analysis });
  } catch (error) {
    handleRouteError(res, error, "Discovery.missingSkills", "Failed to analyze missing skills");
  }
});

// ─── POST /admin/sync - Trigger ingestion sync ─────────────────────────
jobDiscoveryRouter.post("/admin/sync", async (req: Request, res: Response) => {
  try {
    const sourceName = req.query.source as string | undefined;
    const results = await JobDiscoveryService.syncSources(sourceName);
    res.json({ success: true, results });
  } catch (error) {
    handleRouteError(res, error, "Discovery.sync", "Failed to sync sources");
  }
});

// ─── GET /admin/sources - Source statuses ──────────────────────────────
jobDiscoveryRouter.get("/admin/sources", async (_req: Request, res: Response) => {
  try {
    const sources = await JobDiscoveryService.getSourceStatuses();
    res.json({ success: true, sources });
  } catch (error) {
    handleRouteError(res, error, "Discovery.sources", "Failed to get sources");
  }
});

// ─── GET /admin/logs - Ingestion logs ──────────────────────────────────
jobDiscoveryRouter.get("/admin/logs", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await JobDiscoveryService.getIngestionLogs(limit);
    res.json({ success: true, logs });
  } catch (error) {
    handleRouteError(res, error, "Discovery.logs", "Failed to get logs");
  }
});

// ─── POST /admin/seed - Seed initial sources ──────────────────────────
jobDiscoveryRouter.post("/admin/seed", async (_req: Request, res: Response) => {
  try {
    await JobDiscoveryService.seedSources();
    res.json({ success: true, message: "Sources seeded successfully" });
  } catch (error) {
    handleRouteError(res, error, "Discovery.seed", "Failed to seed sources");
  }
});
