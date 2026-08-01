import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { prisma as masterPrisma } from "../config/prisma";
import { handleRouteError } from "../utils/routeError";
import { mapDiscoveryJobToListing } from "../utils/jobListingMapper";
import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { searchAdzunaJobs, getAdzunaCategories, getSupportedCountries, type NormalizedJob } from "../services/adzuna.service";

export const jobListingRouter = Router();

// ─── GET / ─ List jobs with filters (DB + Adzuna merged) ───────────────────
jobListingRouter.get("/", async (req: Request, res: Response) => {
  try {
    const {
      search,
      company,
      category,
      location,
      country,
      state,
      city,
      mode,
      employmentType,
      salaryMin,
      salaryMax,
      skills,
      sortBy = "postedDate",
      order = "desc",
      page = "1",
      limit = "20",
      source = "all",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // ── DB query ──
    const where: any = { isActive: true };

    if (search && typeof search === "string") {
      const searchTerm = search.trim();
      const searchWords = searchTerm.split(/\s+/).filter((w) => w.length > 1);
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { company: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
      ];
      if (searchWords.length > 0) {
        where.OR.push({ skills: { hasSome: searchWords } });
      }
    }

    if (company && typeof company === "string") {
      where.company = { contains: company.trim(), mode: "insensitive" };
    }

    if (category && typeof category === "string") {
      where.industry = { contains: category.trim(), mode: "insensitive" };
    }

    if (location && typeof location === "string") {
      where.location = { contains: location.trim(), mode: "insensitive" };
    }

    if (country && typeof country === "string") {
      where.country = { contains: country.trim(), mode: "insensitive" };
    }

    if (state && typeof state === "string") {
      where.state = { contains: state.trim(), mode: "insensitive" };
    }

    if (city && typeof city === "string") {
      where.city = { contains: city.trim(), mode: "insensitive" };
    }

    if (mode && typeof mode === "string") {
      where.workMode = { contains: mode.trim(), mode: "insensitive" };
    }

    if (employmentType && typeof employmentType === "string") {
      where.employmentType = { contains: employmentType.trim(), mode: "insensitive" };
    }

    if (salaryMin || salaryMax) {
      where.AND = where.AND || [];
      if (salaryMin) {
        where.AND.push({ salaryMax: { gte: parseInt(salaryMin as string, 10) } });
      }
      if (salaryMax) {
        where.AND.push({ salaryMin: { lte: parseInt(salaryMax as string, 10) } });
      }
    }

    if (skills && typeof skills === "string") {
      const skillsList = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillsList.length > 0) {
        where.AND = where.AND || [];
        where.AND.push({ skills: { hasSome: skillsList } });
      }
    }

    const sortOrder = order === "asc" ? "asc" : "desc";

    // ── Fetch from DB ──
    const shouldFetchDB = source === "all" || source === "db";
    const shouldFetchAdzuna = source === "all" || source === "adzuna";

    const [dbRawJobs, dbTotal] = shouldFetchDB
      ? await Promise.all([
          masterPrisma.discoveryJob.findMany({
            where,
            orderBy: { createdAt: sortOrder },
            skip,
            take: limitNum,
          }),
          masterPrisma.discoveryJob.count({ where }),
        ])
      : [[] as any[], 0];

    const dbJobs = dbRawJobs.map(mapDiscoveryJobToListing);

    // ── Fetch from Adzuna ──
    let adzunaJobs: NormalizedJob[] = [];
    let adzunaCount = 0;

    if (shouldFetchAdzuna) {
      const adzunaCountry = (country && typeof country === "string") ? country.trim().toLowerCase() : undefined;

      const adzunaResult = await searchAdzunaJobs({
        keywords: (search as string) || undefined,
        location: (location as string) || undefined,
        country: adzunaCountry || "gb",
      });

      adzunaJobs = adzunaResult.jobs;
      adzunaCount = adzunaResult.count;
    }

    // ── Merge results ──
    const allJobs = [
      ...dbJobs.map((j: any) => ({ ...j, isAdzuna: false })),
      ...adzunaJobs,
    ];

    const totalCount = dbTotal + adzunaCount;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      success: true,
      jobs: allJobs,
      total: totalCount,
      page: pageNum,
      totalPages,
      sources: {
        db: dbTotal,
        adzuna: adzunaCount,
      },
    });
  } catch (error) {
    handleRouteError(res, error, "JobListing.list", "Failed to fetch job listings");
  }
});

// ─── GET /featured ─ Featured jobs ─────────────────────────────────────────
jobListingRouter.get("/featured", async (req: Request, res: Response) => {
  try {
    const rawJobs = await masterPrisma.discoveryJob.findMany({
      where: { isFeatured: true, isActive: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    const jobs = rawJobs.map(mapDiscoveryJobToListing);
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "JobListing.featured", "Failed to fetch featured jobs");
  }
});

// ─── GET /trending ─ Trending jobs ─────────────────────────────────────────
jobListingRouter.get("/trending", async (req: Request, res: Response) => {
  try {
    const rawJobs = await masterPrisma.discoveryJob.findMany({
      where: { isActive: true },
      orderBy: { viewCount: "desc" },
      take: 10,
    });
    const jobs = rawJobs.map(mapDiscoveryJobToListing);
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "JobListing.trending", "Failed to fetch trending jobs");
  }
});

// ─── GET /companies ─ Distinct companies with counts ──────────────────────
jobListingRouter.get("/companies", async (req: Request, res: Response) => {
  try {
    const results = await masterPrisma.discoveryJob.groupBy({
      by: ["company"],
      where: { isActive: true },
      _count: { company: true },
      orderBy: { _count: { company: "desc" } },
    });

    const companies = results.map((r) => ({
      name: r.company,
      count: r._count.company,
    }));

    res.json({ success: true, companies });
  } catch (error) {
    handleRouteError(res, error, "JobListing.companies", "Failed to fetch companies");
  }
});

// ─── GET /stats ─ Job market stats ────────────────────────────────────────
jobListingRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    const activeWhere = { isActive: true };

    const [totalJobs, byMode, byEmploymentType, topCompanies] = await Promise.all([
      masterPrisma.discoveryJob.count({ where: activeWhere }),
      masterPrisma.discoveryJob.groupBy({
        by: ["workMode"],
        where: activeWhere,
        _count: { workMode: true },
        orderBy: { _count: { workMode: "desc" } },
      }),
      masterPrisma.discoveryJob.groupBy({
        by: ["employmentType"],
        where: activeWhere,
        _count: { employmentType: true },
        orderBy: { _count: { employmentType: "desc" } },
      }),
      masterPrisma.discoveryJob.groupBy({
        by: ["company"],
        where: activeWhere,
        _count: { company: true },
        orderBy: { _count: { company: "desc" } },
        take: 10,
      }),
    ]);

    const stats = {
      totalJobs,
      byMode: byMode.map((m) => ({ mode: m.workMode, count: m._count.workMode })),
      byEmploymentType: byEmploymentType.map((e) => ({
        employmentType: e.employmentType,
        count: e._count.employmentType,
      })),
      topCompanies: topCompanies.map((c) => ({
        company: c.company,
        count: c._count.company,
      })),
    };

    res.json({ success: true, stats });
  } catch (error) {
    handleRouteError(res, error, "JobListing.stats", "Failed to fetch job stats");
  }
});

// ─── GET /adzuna/countries ─ Supported Adzuna countries ────────────────────
jobListingRouter.get("/adzuna/countries", async (_req: Request, res: Response) => {
  try {
    const countries = getSupportedCountries();
    res.json({ success: true, countries });
  } catch (error) {
    handleRouteError(res, error, "JobListing.adzunaCountries", "Failed to fetch countries");
  }
});

// ─── GET /adzuna/categories ─ Adzuna job categories for a country ──────────
jobListingRouter.get("/adzuna/categories", async (req: Request, res: Response) => {
  try {
    const country = (req.query.country as string) || "gb";
    const categories = await getAdzunaCategories(country);
    res.json({ success: true, categories });
  } catch (error) {
    handleRouteError(res, error, "JobListing.adzunaCategories", "Failed to fetch categories");
  }
});

// ─── GET /adzuna/search ─ Direct Adzuna job search ──────────────────────────
jobListingRouter.get("/adzuna/search", async (req: Request, res: Response) => {
  try {
    const { keywords, location, country = "gb" } = req.query;

    const result = await searchAdzunaJobs({
      keywords: keywords as string,
      location: location as string,
      country: country as string,
    });

    res.json({
      success: true,
      jobs: result.jobs,
      count: result.count,
    });
  } catch (error) {
    handleRouteError(res, error, "JobListing.adzunaSearch", "Failed to search Adzuna");
  }
});

// ─── GET /user/saved ─ Saved job IDs for current user ──────────────────────
jobListingRouter.get("/user/saved", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    let saved: any[] = [];
    try {
      const prisma = await getUserPrismaFromRequest(req);
      saved = await prisma.jobListingSaved.findMany({
        where: { userId },
        select: { jobListingId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // User DB table may not exist yet
    }

    const savedWithJobs = await Promise.all(
      saved.map(async (s) => {
        try {
          const rawJob = await masterPrisma.discoveryJob.findUnique({
            where: { id: s.jobListingId },
          });
          return { id: s.jobListingId, jobListingId: s.jobListingId, createdAt: s.createdAt, jobListing: mapDiscoveryJobToListing(rawJob) };
        } catch {
          return { id: s.jobListingId, jobListingId: s.jobListingId, createdAt: s.createdAt, jobListing: null };
        }
      })
    );

    res.json({
      success: true,
      savedIds: saved.map((s) => s.jobListingId),
      saved: savedWithJobs,
    });
  } catch (error) {
    handleRouteError(res, error, "JobListing.userSaved", "Failed to fetch saved jobs");
  }
});

// ─── GET /user/applications ─ User's job applications ──────────────────────
jobListingRouter.get(
  "/user/applications",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      let applications: any[] = [];
      try {
        const prisma = await getUserPrismaFromRequest(req);
        applications = await prisma.jobListingApplication.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
      } catch {
        // User DB fallback
      }

      const applicationsWithJobs = await Promise.all(
        applications.map(async (app) => {
          const rawJob = await masterPrisma.discoveryJob.findUnique({
            where: { id: app.jobListingId },
          });
          return { ...app, jobListing: mapDiscoveryJobToListing(rawJob) };
        })
      );

      res.json({ success: true, applications: applicationsWithJobs });
    } catch (error) {
      handleRouteError(
        res,
        error,
        "JobListing.userApplications",
        "Failed to fetch applications"
      );
    }
  }
);

// ─── GET /:id ─ Single job detail ─────────────────────────────────────────
jobListingRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const rawJob = await masterPrisma.discoveryJob.findUnique({
      where: { id },
    });

    if (!rawJob) {
      res.status(404).json({ success: false, error: "Job listing not found" });
      return;
    }

    const job = mapDiscoveryJobToListing(rawJob);
    res.json({ success: true, job });
  } catch (error) {
    handleRouteError(res, error, "JobListing.detail", "Failed to fetch job listing");
  }
});

// ─── POST /saved/:jobListingId ─ Toggle save/unsave ───────────────────────
jobListingRouter.post(
  "/saved/:jobListingId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const userId = (req as any).user?.userId;
      const { jobListingId } = req.params;

      const existing = await prisma.jobListingSaved.findUnique({
        where: { userId_jobListingId: { userId, jobListingId } },
      });

      if (existing) {
        await prisma.jobListingSaved.delete({
          where: { userId_jobListingId: { userId, jobListingId } },
        });
        res.json({ success: true, saved: false });
      } else {
        await prisma.jobListingSaved.create({
          data: { userId, jobListingId },
        });
        res.json({ success: true, saved: true });
      }
    } catch (error) {
      handleRouteError(res, error, "JobListing.toggleSave", "Failed to toggle save");
    }
  }
);

// ─── POST /apply/:jobListingId ─ Apply to job ─────────────────────────────
jobListingRouter.post(
  "/apply/:jobListingId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const userId = (req as any).user?.userId;
      const { jobListingId } = req.params;

      const existing = await prisma.jobListingApplication.findUnique({
        where: { userId_jobListingId: { userId, jobListingId } },
      });

      if (existing) {
        res.json({ success: true, status: "already_applied" });
        return;
      }

      await prisma.jobListingApplication.create({
        data: { userId, jobListingId, status: "applied" },
      });

      res.json({ success: true, status: "applied" });
    } catch (error) {
      handleRouteError(res, error, "JobListing.apply", "Failed to apply to job");
    }
  }
);

// ─── PUT /applications/:applicationId ─ Update application status ──────────
jobListingRouter.put(
  "/applications/:applicationId",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const userId = (req as any).user?.userId;
      const { applicationId } = req.params;
      const { status, notes } = req.body;

      const application = await prisma.jobListingApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        res.status(404).json({ success: false, error: "Application not found" });
        return;
      }

      if (application.userId !== userId) {
        res.status(403).json({ success: false, error: "Forbidden" });
        return;
      }

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      const updated = await prisma.jobListingApplication.update({
        where: { id: applicationId },
        data: updateData,
      });

      res.json({ success: true, application: updated });
    } catch (error) {
      handleRouteError(
        res,
        error,
        "JobListing.updateApplication",
        "Failed to update application"
      );
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AI-POWERED ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── POST /ai/recommend ─ AI job recommendations ──────────────────────────
jobListingRouter.post(
  "/ai/recommend",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const { skills = [], experience, location, preferences } = req.body;

      if (!Array.isArray(skills)) {
        res.status(400).json({ success: false, error: "skills must be an array" });
        return;
      }

      const jobs = await prisma.jobListing.findMany({
        where: { isActive: true },
        take: 50,
        orderBy: { createdAt: "desc" },
      });

      if (jobs.length === 0) {
        res.json({ success: true, recommendations: [] });
        return;
      }

      const fallback: any[] = jobs.map((j) => ({
        jobId: j.id,
        score: 50,
        reasons: ["Available position"],
        missingSkills: [],
      }));

      const prompt = `You are an intelligent job matching engine. Analyze the user profile against available jobs and rank the best matches.

User Profile:
- Skills: ${skills.join(", ") || "None listed"}
- Experience: ${experience || "Not specified"}
- Preferred Location: ${location || "Any"}
- Preferences: ${preferences || "None"}

Available Jobs:
${jobs.map((j, idx) => `[${idx + 1}] ID: ${j.id} | ${j.title} at ${j.company} | Location: ${j.location} | Mode: ${j.mode} | Type: ${j.employmentType} | Skills: ${(j.skills || []).join(", ")} | Experience: ${j.experience || "N/A"} | Salary: ${j.salary || "N/A"}`).join("\n")}

Rank the top matches for this user. Return a JSON array sorted by best match first. Each object must have:
- jobId: the job ID string
- score: relevance score from 0-100
- reasons: array of 1-3 short reason strings explaining why it matches
- missingSkills: array of skills the user lacks for this role

Return ONLY the JSON array, no other text.`;

      const recommendations = await generateJSON(
        "You are an expert job matching engine that analyzes skills, experience, and preferences to rank job opportunities.",
        prompt,
        { model: MODELS.BALANCED, temperature: 0.3 },
        fallback
      );

      const recArray = Array.isArray(recommendations) ? recommendations : [];

      res.json({ success: true, recommendations: recArray });
    } catch (error) {
      handleRouteError(
        res,
        error,
        "JobListing.aiRecommend",
        "Failed to generate recommendations"
      );
    }
  }
);

// ─── POST /ai/summary ─ AI summary of a job ──────────────────────────────
jobListingRouter.post(
  "/ai/summary",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const { jobListingId } = req.body;

      if (!jobListingId || typeof jobListingId !== "string") {
        res.status(400).json({ success: false, error: "jobListingId is required" });
        return;
      }

      const job = await prisma.jobListing.findUnique({
        where: { id: jobListingId },
      });

      if (!job) {
        res.status(404).json({ success: false, error: "Job listing not found" });
        return;
      }

      const fallback = { summary: "", keyHighlights: [] as string[], companyInsights: [] as string[] };

      const prompt = `You are a career advisor. Analyze this job listing and provide a concise, insightful summary.

Job Details:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Country: ${job.country || "Not specified"}
- State: ${job.state || "Not specified"}
- City: ${job.city || "Not specified"}
- Mode: ${job.mode}
- Employment Type: ${job.employmentType}
- Category: ${job.category || "Not specified"}
- Salary: ${job.salary || "Not specified"}${job.salaryMin ? ` (Min: ₹${job.salaryMin})` : ""}${job.salaryMax ? ` (Max: ₹${job.salaryMax})` : ""}
- Experience: ${job.experience || "Not specified"}
- Skills Required: ${(job.skills || []).join(", ")}
- Description: ${job.description || "Not available"}
- Responsibilities: ${(job.responsibilities || []).join("; ")}
- Requirements: ${(job.requirements || []).join("; ")}
- Benefits: ${(job.benefits || []).join("; ")}
- Company Overview: ${job.companyOverview || "Not available"}
- Government Job: ${job.isGovernment ? "Yes" : "No"}

Return a JSON object with:
- summary: a 2-3 sentence summary of the role
- keyHighlights: array of 3-5 key highlights about this job
- companyInsights: array of 2-3 brief insights about the company or role context

Return ONLY the JSON object, no other text.`;

      const result = await generateJSON(
        "You are an expert career advisor specializing in job market analysis.",
        prompt,
        { model: MODELS.BALANCED, temperature: 0.4 },
        fallback
      );

      const data = result && typeof result === "object" ? result : fallback;

      res.json({
        success: true,
        summary: (data as any).summary || "",
        keyHighlights: Array.isArray((data as any).keyHighlights) ? (data as any).keyHighlights : [],
        companyInsights: Array.isArray((data as any).companyInsights) ? (data as any).companyInsights : [],
      });
    } catch (error) {
      handleRouteError(res, error, "JobListing.aiSummary", "Failed to generate summary");
    }
  }
);

// ─── POST /ai/skill-gap ─ Skill gap analysis ─────────────────────────────
jobListingRouter.post(
  "/ai/skill-gap",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const { jobListingId, userSkills = [] } = req.body;

      if (!jobListingId || typeof jobListingId !== "string") {
        res.status(400).json({ success: false, error: "jobListingId is required" });
        return;
      }

      if (!Array.isArray(userSkills)) {
        res.status(400).json({ success: false, error: "userSkills must be an array" });
        return;
      }

      const job = await prisma.jobListing.findUnique({
        where: { id: jobListingId },
      });

      if (!job) {
        res.status(404).json({ success: false, error: "Job listing not found" });
        return;
      }

      const fallback = {
        matchScore: 0,
        matchingSkills: [] as string[],
        missingSkills: [] as string[],
        learningResources: [] as { skill: string; resource: string; url: string }[],
      };

      const prompt = `You are a skill gap analyzer. Compare the user's skills against the job requirements and provide a detailed analysis.

Job: ${job.title} at ${job.company}
Required Skills: ${(job.skills || []).join(", ")}
Description: ${job.description || "Not available"}
Requirements: ${(job.requirements || []).join("; ")}

User's Current Skills: ${userSkills.join(", ") || "None listed"}

Return a JSON object with:
- matchScore: percentage match from 0-100
- matchingSkills: array of skills the user already has that match the job requirements
- missingSkills: array of skills the user lacks that are required or beneficial
- learningResources: array of objects with { skill: skill name, resource: short description of how to learn it, url: a helpful learning URL }

Return ONLY the JSON object, no other text.`;

      const result = await generateJSON(
        "You are an expert technical recruiter and career advisor who analyzes skill gaps.",
        prompt,
        { model: MODELS.BALANCED, temperature: 0.3 },
        fallback
      );

      const data = result && typeof result === "object" ? result : fallback;

      res.json({
        success: true,
        matchScore: typeof (data as any).matchScore === "number" ? (data as any).matchScore : 0,
        matchingSkills: Array.isArray((data as any).matchingSkills) ? (data as any).matchingSkills : [],
        missingSkills: Array.isArray((data as any).missingSkills) ? (data as any).missingSkills : [],
        learningResources: Array.isArray((data as any).learningResources)
          ? (data as any).learningResources
          : [],
      });
    } catch (error) {
      handleRouteError(
        res,
        error,
        "JobListing.aiSkillGap",
        "Failed to analyze skill gap"
      );
    }
  }
);

// ─── POST /ai/cover-letter ─ Generate cover letter ────────────────────────
jobListingRouter.post(
  "/ai/cover-letter",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const { jobListingId, userName, userBackground } = req.body;

      if (!jobListingId || typeof jobListingId !== "string") {
        res.status(400).json({ success: false, error: "jobListingId is required" });
        return;
      }

      if (!userName || typeof userName !== "string") {
        res.status(400).json({ success: false, error: "userName is required" });
        return;
      }

      const job = await prisma.jobListing.findUnique({
        where: { id: jobListingId },
      });

      if (!job) {
        res.status(404).json({ success: false, error: "Job listing not found" });
        return;
      }

      const fallback = { coverLetter: "" };

      const prompt = `You are a professional cover letter writer. Write a compelling, personalized cover letter for the following job application.

Applicant Name: ${userName}
Applicant Background: ${userBackground || "Not provided"}

Job Details:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Mode: ${job.mode}
- Employment Type: ${job.employmentType}
- Skills Required: ${(job.skills || []).join(", ")}
- Description: ${job.description || "Not available"}
- Responsibilities: ${(job.responsibilities || []).join("; ")}
- Requirements: ${(job.requirements || []).join("; ")}
- Company Overview: ${job.companyOverview || "Not available"}

Write a professional cover letter that:
1. Opens with enthusiasm for the specific role
2. Highlights relevant experience from the background
3. Demonstrates knowledge of the company
4. Maps the applicant's skills to the role requirements
5. Closes with a strong call to action

Keep it under 400 words. Use a professional but warm tone. Do not use placeholder text like [Company Name] — use the actual details provided.

Return ONLY the cover letter text as a plain string value in JSON: { "coverLetter": "..." }`;

      const result = await generateJSON(
        "You are a professional career writer specializing in compelling cover letters.",
        prompt,
        { model: MODELS.BALANCED, temperature: 0.6 },
        fallback
      );

      const data = result && typeof result === "object" ? result : fallback;

      res.json({
        success: true,
        coverLetter: (data as any).coverLetter || "",
      });
    } catch (error) {
      handleRouteError(
        res,
        error,
        "JobListing.aiCoverLetter",
        "Failed to generate cover letter"
      );
    }
  }
);

// ─── POST /ai/interview-prep ─ Interview preparation ──────────────────────
jobListingRouter.post(
  "/ai/interview-prep",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const prisma = await getUserPrismaFromRequest(req);
      const { jobListingId } = req.body;

      if (!jobListingId || typeof jobListingId !== "string") {
        res.status(400).json({ success: false, error: "jobListingId is required" });
        return;
      }

      const job = await prisma.jobListing.findUnique({
        where: { id: jobListingId },
      });

      if (!job) {
        res.status(404).json({ success: false, error: "Job listing not found" });
        return;
      }

      const fallback = {
        questions: [] as { question: string; expectedAnswer: string; tips: string }[],
        technicalTopics: [] as string[],
        behavioralTopics: [] as string[],
      };

      const prompt = `You are an expert interview coach. Generate comprehensive interview preparation material for this job.

Job Details:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Mode: ${job.mode}
- Employment Type: ${job.employmentType}
- Skills Required: ${(job.skills || []).join(", ")}
- Description: ${job.description || "Not available"}
- Responsibilities: ${(job.responsibilities || []).join("; ")}
- Requirements: ${(job.requirements || []).join("; ")}

Return a JSON object with:
- questions: array of 8-10 likely interview questions, each with:
  - question: the interview question
  - expectedAnswer: a concise model answer
  - tips: advice for answering this question well
- technicalTopics: array of 5-7 technical topics to review for this role
- behavioralTopics: array of 3-5 behavioral question themes to prepare for

Return ONLY the JSON object, no other text.`;

      const result = await generateJSON(
        "You are an expert interview coach and HR professional who prepares candidates for technical interviews.",
        prompt,
        { model: MODELS.BALANCED, temperature: 0.4 },
        fallback
      );

      const data = result && typeof result === "object" ? result : fallback;

      res.json({
        success: true,
        questions: Array.isArray((data as any).questions) ? (data as any).questions : [],
        technicalTopics: Array.isArray((data as any).technicalTopics)
          ? (data as any).technicalTopics
          : [],
        behavioralTopics: Array.isArray((data as any).behavioralTopics)
          ? (data as any).behavioralTopics
          : [],
      });
    } catch (error) {
      handleRouteError(
        res,
        error,
        "JobListing.aiInterviewPrep",
        "Failed to generate interview prep"
      );
    }
  }
);

// ─── POST /ai/salary-insights ─ Salary insights ──────────────────────────
jobListingRouter.post(
  "/ai/salary-insights",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { company, role, location, experience } = req.body;

      if (!role || typeof role !== "string") {
        res.status(400).json({ success: false, error: "role is required" });
        return;
      }

      const fallback = {
        estimatedRange: "Data not available",
        factors: [] as string[],
        negotiationTips: [] as string[],
      };

      const prompt = `You are a compensation analyst with expertise in the Indian and global job market. Provide salary insights for the following role.

Role: ${role}
Company: ${company || "Not specified"}
Location: ${location || "Not specified"}
Experience Level: ${experience || "Not specified"}

Provide realistic salary insights based on market data. Consider factors like company size, industry, location cost of living, and demand for the role.

Return a JSON object with:
- estimatedRange: a string describing the estimated salary range (e.g., "₹8,00,000 - ₹15,00,000 per annum")
- factors: array of 3-5 factors that influence the salary for this role
- negotiationTips: array of 3-5 practical salary negotiation tips specific to this role

Return ONLY the JSON object, no other text.`;

      const result = await generateJSON(
        "You are an expert compensation analyst with deep knowledge of job market salaries across industries and geographies.",
        prompt,
        { model: MODELS.BALANCED, temperature: 0.4 },
        fallback
      );

      const data = result && typeof result === "object" ? result : fallback;

      res.json({
        success: true,
        insights: {
          estimatedRange: (data as any).estimatedRange || "Data not available",
          factors: Array.isArray((data as any).factors) ? (data as any).factors : [],
          negotiationTips: Array.isArray((data as any).negotiationTips)
            ? (data as any).negotiationTips
            : [],
        },
      });
    } catch (error) {
      handleRouteError(
        res,
        error,
        "JobListing.aiSalaryInsights",
        "Failed to generate salary insights"
      );
    }
  }
);
