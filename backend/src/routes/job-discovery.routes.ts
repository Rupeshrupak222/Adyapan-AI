import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdminAuth } from "../middleware/adminAuth";
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
    const parseArray = (val: any): string[] | undefined => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
      if (typeof val === "string") return val.split(",").map(s => s.trim()).filter(Boolean);
      return undefined;
    };

    const {
      query, company, location, locations, country, state, city, workMode, workModes,
      employmentType, employmentTypes, experienceMin, experienceMax, salaryMin, salaryMax,
      skills, industry, education, educationList, companySize, source, sources,
      isFeatured, postedWithin, targetRole, departments,
      sortBy = "recommended", sortOrder = "desc", page = "1", limit = "20",
    } = req.query;

    const userId = (req as any).user?.userId;
    let userTargetRole = (targetRole as string) || "";
    let userSkills: string[] = [];

    if (userId) {
      try {
        const userPrisma = await getUserPrismaFromRequest(req);
        const profile = await userPrisma.profile.findUnique({ where: { userId } });
        if (profile) {
          if (!userTargetRole && profile.targetRole) {
            userTargetRole = profile.targetRole;
          }
          if (!userTargetRole && profile.careerGoal) {
            userTargetRole = profile.careerGoal;
          }
          if (profile.skills && Array.isArray(profile.skills)) {
            userSkills = profile.skills;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch user profile for recommendations", err);
      }
    }

    if (!userTargetRole) {
      userTargetRole = "Software Developer";
    }

    const parsedWorkModes = parseArray(workModes) || parseArray(workMode);
    const parsedLocations = parseArray(locations) || parseArray(location);
    const parsedEmploymentTypes = parseArray(employmentTypes) || parseArray(employmentType);
    const parsedSources = parseArray(sources) || parseArray(source);
    const parsedSkills = parseArray(skills);
    const parsedDepartments = parseArray(departments);
    const parsedEducationList = parseArray(educationList) || parseArray(education);

    const filters: any = {
      query: query as string,
      company: company as string,
      location: location as string,
      locations: parsedLocations,
      country: country as string,
      state: state as string,
      city: city as string,
      workMode: workMode as string,
      workModes: parsedWorkModes,
      employmentType: employmentType as string,
      employmentTypes: parsedEmploymentTypes,
      experienceMin: experienceMin ? parseInt(experienceMin as string) : undefined,
      experienceMax: experienceMax ? parseInt(experienceMax as string) : undefined,
      salaryMin: salaryMin ? parseInt(salaryMin as string) : undefined,
      salaryMax: salaryMax ? parseInt(salaryMax as string) : undefined,
      skills: parsedSkills,
      departments: parsedDepartments,
      educationList: parsedEducationList,
      industry: industry as string,
      education: education as string,
      companySize: companySize as string,
      source: source as string,
      sources: parsedSources,
      isFeatured: isFeatured === "true" ? true : undefined,
      postedWithin: postedWithin as any,
      sortBy: sortBy as string,
      sortOrder: sortOrder as "asc" | "desc",
      page: parseInt(page as string) || 1,
      limit: Math.min(100, parseInt(limit as string) || 20),
      targetRole: userTargetRole,
      userSkills,
      userId,
    };

    const result = await JobSearchService.search(filters);

    if (userId && query) {
      JobSearchService.logSearch(userId, query as string, filters, result.total).catch(() => {});
    }

    res.json({ success: true, ...result });
  } catch (error) {
    handleRouteError(res, error, "Discovery.search", "Failed to search jobs");
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

// ─── GET /jobs/:id - Get job detail ────────────────────────────────────
// NOTE: This wildcard must come LAST among /jobs/* routes
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

// ─── GET /filter-options - Sidebar filter options (data-driven) ──────
jobDiscoveryRouter.get("/filter-options", async (req: Request, res: Response) => {
  try {
    const options = await JobSearchService.getFilterOptions();
    res.json({ success: true, options });
  } catch (error) {
    handleRouteError(res, error, "Discovery.filterOptions", "Failed to get filter options");
  }
});

// ─── GET /recommended - Personalized job recommendations ─────────────
jobDiscoveryRouter.get("/recommended", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const jobs = await JobSearchService.getRecommendedJobs(userId, limit);
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "Discovery.recommended", "Failed to get recommended jobs");
  }
});

// ─── GET /trending - Trending jobs ───────────────────────────────────
jobDiscoveryRouter.get("/trending", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const jobs = await JobSearchService.getTrendingJobs(limit);
    res.json({ success: true, jobs });
  } catch (error) {
    handleRouteError(res, error, "Discovery.trending", "Failed to get trending jobs");
  }
});

// ─── GET /suggestions - Search autocomplete suggestions ──────────────
jobDiscoveryRouter.get("/suggestions", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || "";
    const suggestions = await JobSearchService.getSuggestions(q);
    res.json({ success: true, suggestions });
  } catch (error) {
    handleRouteError(res, error, "Discovery.suggestions", "Failed to get suggestions");
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

// ─── HELPER: Fetch Active Candidate CV ─────────────────────────────────
async function fetchActiveCandidateCV(req: Request, userId: string) {
  let activeCvName = "Default Profile";
  let cvText = "";
  let cvSkills: string[] = [];
  let userProfile: any = null;

  try {
    const prisma = await getUserPrismaFromRequest(req);
    userProfile = await prisma.profile.findUnique({ where: { userId } });
    if (userProfile?.skills && Array.isArray(userProfile.skills)) {
      cvSkills.push(...userProfile.skills);
    }

    // 1. Try uploaded resume marked as active
    let uploaded = await prisma.uploadedResume.findFirst({
      where: { userId, isActive: true },
      include: { candidateProfile: true },
    });
    // 2. If no active flag, try latest uploaded resume
    if (!uploaded) {
      uploaded = await prisma.uploadedResume.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { candidateProfile: true },
      });
    }

    if (uploaded) {
      activeCvName = uploaded.fileName || "Active Uploaded Resume";
      if (uploaded.extractedText) cvText += uploaded.extractedText + "\n";
      if (uploaded.candidateProfile) {
        const cp = uploaded.candidateProfile;
        if (cp.skills) {
          const parsed = typeof cp.skills === "string" ? JSON.parse(cp.skills) : cp.skills;
          if (Array.isArray(parsed)) cvSkills.push(...parsed);
        }
        if (cp.summary) cvText += `Summary: ${cp.summary}\n`;
        if (cp.experience) cvText += `Experience: ${JSON.stringify(cp.experience)}\n`;
        if (cp.education) cvText += `Education: ${JSON.stringify(cp.education)}\n`;
      }
    } else {
      // 3. Fallback to Resume builder latest resume
      const builderResume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (builderResume) {
        activeCvName = builderResume.title || "Builder Resume";
        if (builderResume.resumeData) {
          const rd: any = builderResume.resumeData;
          if (rd.basics?.summary) cvText += `Summary: ${rd.basics.summary}\n`;
          if (rd.skills && Array.isArray(rd.skills)) {
            rd.skills.forEach((s: any) => {
              if (s.name) cvSkills.push(s.name);
              if (s.keywords && Array.isArray(s.keywords)) cvSkills.push(...s.keywords);
            });
          }
          if (rd.work) cvText += `Work: ${JSON.stringify(rd.work)}\n`;
          if (rd.education) cvText += `Education: ${JSON.stringify(rd.education)}\n`;
        }
      }
    }
  } catch (e) {
    console.warn("[JobDiscovery] Failed to load active CV:", e);
  }

  const uniqueSkills = Array.from(new Set(cvSkills.map((s) => String(s).trim()).filter(Boolean)));
  return { activeCvName, cvText, cvSkills: uniqueSkills, userProfile };
}

// ─── POST /jobs/:id/match - AI job match analysis ──────────────────────
jobDiscoveryRouter.post("/jobs/:id/match", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const jobId = req.params.id as string;

    const job = await JobSearchService.getJobById(jobId, undefined, { countView: false });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const { activeCvName, cvText, cvSkills, userProfile } = await fetchActiveCandidateCV(req, userId);

    const systemPrompt = `You are an AI Career Matching Engine. Analyze how well a candidate's active CV and profile match a job posting.
Provide a JSON response strictly matching this structure:
{
  "overallScore": 0-100,
  "activeCvName": "${activeCvName}",
  "skillMatch": { "score": 0-100, "matched": ["skill1"], "missing": ["skill2"] },
  "experienceMatch": { "score": 0-100, "details": "explanation of experience alignment" },
  "educationMatch": { "score": 0-100, "details": "explanation of education alignment" },
  "reasons": ["detailed point 1 why candidate matches", "detailed point 2"],
  "preparationTips": ["actionable tip 1 to get ready for interview", "actionable tip 2"]
}`;

    const userPrompt = `Job Details:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || "Not specified"}
Work Mode: ${job.workMode || "Not specified"}
Employment Type: ${job.employmentType || "Not specified"}
Experience Required: ${job.experienceMin || 0}-${job.experienceMax || "any"} years
Required Skills: ${job.skills?.join(", ") || "Not specified"}
Description: ${(job.description || "").slice(0, 2000)}
Requirements: ${(job.requirements || []).join(", ")}

Candidate Active CV (${activeCvName}):
Extracted Resume Text / Summary:
${cvText ? cvText.slice(0, 2000) : "No full resume text extracted."}

Candidate Profile & Skills:
Skills: ${cvSkills.length > 0 ? cvSkills.join(", ") : "Not specified"}
Target Role: ${userProfile?.targetRole || "Software Engineer"}
Location: ${userProfile?.location || "India"}
Career Goal: ${userProfile?.careerObjective || "Career advancement"}`;

    const fallbackSkills = job.skills || [];

    const analysis = await generateJSON(
      systemPrompt,
      userPrompt,
      { model: "google/gemini-3.6-flash", temperature: 0.3 },
      {
        overallScore: cvSkills.length > 0 ? 70 : 50,
        activeCvName,
        skillMatch: { score: 65, matched: cvSkills.slice(0, 3), missing: fallbackSkills.slice(0, 3) },
        experienceMatch: { score: 70, details: "Profile experience aligns well with core requirements." },
        educationMatch: { score: 75, details: "Educational background meets minimum criteria." },
        reasons: [
          `Active CV "${activeCvName}" contains relevant background for ${job.title}.`,
          "Skills and experience demonstrate strong foundation for key responsibilities."
        ],
        preparationTips: [
          "Review core technical concepts related to " + (fallbackSkills[0] || job.title),
          "Prepare STAR-method examples from your active CV experience."
        ]
      }
    );

    analysis.activeCvName = activeCvName;
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

    const job = await JobSearchService.getJobById(jobId, undefined, { countView: false });
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const { activeCvName, cvText, cvSkills } = await fetchActiveCandidateCV(req, userId);

    const systemPrompt = `You are an AI Skills Gap Analyzer. Compare candidate's active CV against job requirements and return missing skill gaps.
Provide a JSON response strictly matching this structure:
{
  "skills": [
    {
      "name": "Skill Name",
      "importance": "High" | "Medium" | "Low",
      "timeToLearn": "1-2 weeks",
      "resources": [
        { "title": "Resource Name", "url": "https://example.com", "type": "course" | "article" | "doc" }
      ]
    }
  ]
}`;

    const userPrompt = `Job Requirements:
Title: ${job.title}
Company: ${job.company}
Required Skills: ${job.skills?.join(", ") || "Not specified"}
Description: ${(job.description || "").slice(0, 2000)}
Requirements: ${(job.requirements || []).join(", ")}

Candidate Active CV (${activeCvName}):
Candidate Skills: ${cvSkills.length > 0 ? cvSkills.join(", ") : "Not specified"}
Resume Text Preview: ${cvText ? cvText.slice(0, 1500) : "No text"}`;

    const missingList = (job.skills || []).filter((s) => !cvSkills.map((c) => c.toLowerCase()).includes(s.toLowerCase()));
    const finalMissing = missingList.length > 0 ? missingList : ["System Design", "Cloud Infrastructure"];

    const analysis = await generateJSON(
      systemPrompt,
      userPrompt,
      { model: "google/gemini-3.6-flash", temperature: 0.3 },
      {
        skills: finalMissing.map((s) => ({
          name: s,
          importance: "High" as const,
          timeToLearn: "1-2 weeks",
          resources: [
            { title: `${s} Official Documentation`, url: `https://google.com/search?q=${encodeURIComponent(s)}+docs`, type: "doc" as const },
            { title: `Learn ${s} Tutorial`, url: `https://youtube.com/results?search_query=learn+${encodeURIComponent(s)}`, type: "course" as const }
          ]
        }))
      }
    );

    res.json({ success: true, missingSkills: analysis });
  } catch (error) {
    handleRouteError(res, error, "Discovery.missingSkills", "Failed to analyze missing skills");
  }
});

// ─── POST /admin/sync - Trigger ingestion sync (admin only) ────────────
jobDiscoveryRouter.post("/admin/sync", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await JobSearchService.autoUpdateStaleJobs(true);
    const sourceName = req.query.source as string | undefined;
    const results = await JobDiscoveryService.syncSources(sourceName);
    res.json({ success: true, results });
  } catch (error) {
    handleRouteError(res, error, "Discovery.sync", "Failed to sync sources");
  }
});

// ─── GET /admin/sources - Source statuses (admin only) ─────────────────
jobDiscoveryRouter.get("/admin/sources", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const sources = await JobDiscoveryService.getSourceStatuses();
    res.json({ success: true, sources });
  } catch (error) {
    handleRouteError(res, error, "Discovery.sources", "Failed to get sources");
  }
});

// ─── GET /admin/logs - Ingestion logs (admin only) ─────────────────────
jobDiscoveryRouter.get("/admin/logs", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await JobDiscoveryService.getIngestionLogs(limit);
    res.json({ success: true, logs });
  } catch (error) {
    handleRouteError(res, error, "Discovery.logs", "Failed to get logs");
  }
});

// ─── POST /admin/seed - Seed initial sources (admin only) ──────────────
jobDiscoveryRouter.post("/admin/seed", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    await JobDiscoveryService.seedSources();
    res.json({ success: true, message: "Sources seeded successfully" });
  } catch (error) {
    handleRouteError(res, error, "Discovery.seed", "Failed to seed sources");
  }
});
