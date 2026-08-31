import type { NextFunction, Request, Response } from "express";
import {
  optimizeLinkedInProfile,
  generateResumeSummary,
  generateLinkedInFullProfile,
  generateLinkedInHeadlines,
  generateLinkedInAbout,
  generateLinkedInExperience,
  generateLinkedInProjects,
  generateLinkedInSkills,
  generateLinkedInNetworking,
  generateLinkedInContentIdeas,
  generateLinkedInRecruiterVisibility,
} from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import { extractLegacyFromRecord } from "../utils/resume-converter";

// ─── Helpers ────────────────────────────────────────────────────────────────
function clampScore(val: any): number {
  const n = Number(val);
  if (isNaN(n)) return 50;
  return Math.round(Math.max(0, Math.min(100, n)));
}

function safeStr(val: any): string {
  if (typeof val === "string") return val;
  if (val === null || val === undefined) return "";
  return String(val);
}

// ─── 1. Full LinkedIn Profile Optimization ──────────────────────────────────
export async function generateFullLinkedInProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { resumeId, targetRole } = req.body;

    let resumeText = "";
    let candidateProfile: any = null;
    let atsReport: any = null;

    // Try to get resume data from builder first
    if (resumeId) {
      const resume = await userPrisma.resume.findFirst({ where: { id: resumeId, userId } });
      if (resume) {
        const legacy = extractLegacyFromRecord(resume);
        const p = legacy.personalInfo || {};
        resumeText = [
          p.fullName ? `Name: ${p.fullName}` : "",
          legacy.summary || "",
          legacy.experience?.length ? JSON.stringify(legacy.experience) : "",
          legacy.projects?.length ? JSON.stringify(legacy.projects) : "",
          legacy.skills?.length ? JSON.stringify(legacy.skills) : "",
          legacy.education?.length ? JSON.stringify(legacy.education) : "",
          legacy.certifications?.length ? JSON.stringify(legacy.certifications) : "",
        ].filter(Boolean).join("\n");
        // Get ATS report for this builder resume
        atsReport = await userPrisma.aTSReport.findFirst({
          where: { userId, resumeId },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    // If no builder resume found, try uploaded resumes
    if (!resumeText) {
      // If a specific resumeId was provided, try to find it as an uploaded resume
      if (resumeId) {
        const uploaded = await userPrisma.uploadedResume.findFirst({
          where: { id: resumeId, userId },
          include: { candidateProfile: true },
        });
        if (uploaded) {
          resumeText = uploaded.extractedText || "";
          candidateProfile = uploaded.candidateProfile;
        }
      }
      // Fallback: use the active uploaded resume
      if (!resumeText && !candidateProfile) {
        const uploaded = await userPrisma.uploadedResume.findFirst({
          where: { userId, isActive: true },
          include: { candidateProfile: true },
        });
        if (uploaded) {
          resumeText = uploaded.extractedText || "";
          candidateProfile = uploaded.candidateProfile;
        }
      }
    }

    // Build resume text from candidate profile if still empty
    if (!resumeText && candidateProfile) {
      resumeText = [
        candidateProfile.name ? `Name: ${candidateProfile.name}` : "",
        candidateProfile.summary || "",
        candidateProfile.experience ? JSON.stringify(candidateProfile.experience) : "",
        candidateProfile.projects ? JSON.stringify(candidateProfile.projects) : "",
        candidateProfile.skills ? JSON.stringify(candidateProfile.skills) : "",
        candidateProfile.education ? JSON.stringify(candidateProfile.education) : "",
        candidateProfile.certifications ? JSON.stringify(candidateProfile.certifications) : "",
      ].filter(Boolean).join("\n");
    }

    if (!resumeText) {
      return res.status(400).json({ success: false, error: "No resume data found. Please upload a resume first." });
    }

    const profile = await generateLinkedInFullProfile({
      resumeText,
      candidateProfile,
      atsReport: atsReport?.reportJson || null,
      targetRole: targetRole || "Software Engineer",
    });

    // Save to database — clamp all scores to integers 0-100
    const report = await userPrisma.linkedInReport.create({
      data: {
        userId,
        headline: safeStr(profile.headline),
        aboutSection: safeStr(profile.aboutSection),
        skills: JSON.stringify(profile.skills || []),
        recommendations: JSON.stringify(profile.recommendations || []),
        score: clampScore(profile.scores?.overall),
        experienceJson: JSON.stringify(profile.experience || []),
        projectsJson: JSON.stringify(profile.projects || []),
        featuredJson: JSON.stringify(profile.featured || []),
        networkingJson: JSON.stringify(profile.networking || {}),
        contentIdeasJson: JSON.stringify(profile.contentIdeas || []),
        headlineScore: clampScore(profile.scores?.headline),
        aboutScore: clampScore(profile.scores?.about),
        experienceScore: clampScore(profile.scores?.experience),
        projectsScore: clampScore(profile.scores?.projects),
        skillsScore: clampScore(profile.scores?.skills),
        keywordScore: clampScore(profile.scores?.keyword),
        visibilityScore: clampScore(profile.scores?.visibility),
        completenessScore: clampScore(profile.completeness?.score),
        completenessJson: JSON.stringify(profile.completeness || {}),
        targetRole: targetRole || "Software Engineer",
        versionNumber: 1,
        versionLabel: `v1 — ${targetRole || "Software Engineer"}`,
      },
    });

    res.status(201).json({ success: true, profile, reportId: report.id });
  } catch (error: any) {
    console.error("[LinkedIn] generateFullLinkedInProfile error:", error?.message || error);
    next(error);
  }
}

// ─── 2. Legacy Analyze (backward compatible) ────────────────────────────────
export async function analyzeLinkedIn(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { headline, about, experience, skills, targetRole } = req.body;

    const reportData = await optimizeLinkedInProfile({
      headline: headline || "",
      about: about || "",
      experience: experience || "",
      skills: skills || "",
      targetRole: targetRole || "Software Engineer",
    });

    const report = await userPrisma.linkedInReport.create({
      data: {
        userId,
        headline: safeStr(reportData.headline),
        aboutSection: safeStr(reportData.aboutSection),
        skills: JSON.stringify(reportData.skills || []),
        recommendations: JSON.stringify(reportData.recommendations || []),
        score: clampScore(reportData.score),
        targetRole: targetRole || "Software Engineer",
      },
    });

    res.status(201).json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

// ─── 3. Generate Headlines ──────────────────────────────────────────────────
export async function generateHeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetRole, skills, experience, count } = req.body;
    const headlines = await generateLinkedInHeadlines({
      targetRole: targetRole || "Software Engineer",
      skills: skills || "",
      experience: experience || "",
      count: count || 5,
    });
    res.json({ success: true, headlines });
  } catch (error) {
    next(error);
  }
}

// ─── 4. Generate About Section ──────────────────────────────────────────────
export async function generateAbout(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetRole, experience, skills, variant, resumeText } = req.body;
    const about = await generateLinkedInAbout({
      targetRole: targetRole || "Software Engineer",
      resumeText: resumeText || `Experience: ${experience || "Student/Entry-level"}\nSkills: ${skills || "Web Development"}`,
      variant: variant || "Professional",
    });
    res.json({ success: true, about });
  } catch (error) {
    next(error);
  }
}

// ─── 5. Optimize Experience ─────────────────────────────────────────────────
export async function optimizeExperience(req: Request, res: Response, next: NextFunction) {
  try {
    const { experienceJson, targetRole } = req.body;
    const optimized = await generateLinkedInExperience({
      experienceJson: experienceJson || [],
      targetRole: targetRole || "Software Engineer",
    });
    res.json({ success: true, experience: optimized });
  } catch (error) {
    next(error);
  }
}

// ─── 6. Optimize Projects ───────────────────────────────────────────────────
export async function optimizeProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectsJson, targetRole } = req.body;
    const optimized = await generateLinkedInProjects({
      projectsJson: projectsJson || [],
      targetRole: targetRole || "Software Engineer",
    });
    res.json({ success: true, projects: optimized });
  } catch (error) {
    next(error);
  }
}

// ─── 7. Optimize Skills ─────────────────────────────────────────────────────
export async function optimizeSkills(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentSkills, atsKeywords, targetRole } = req.body;
    const result = await generateLinkedInSkills({
      currentSkills: currentSkills || [],
      atsKeywords: atsKeywords || [],
      targetRole: targetRole || "Software Engineer",
    });
    res.json({ success: true, skills: result });
  } catch (error) {
    next(error);
  }
}

// ─── 8. Generate Networking Templates ───────────────────────────────────────
export async function generateNetworking(req: Request, res: Response, next: NextFunction) {
  try {
    const { profile, targetRole, context } = req.body;
    const templates = await generateLinkedInNetworking({
      profile: profile || {},
      targetRole: targetRole || "Software Engineer",
      context: context || "General networking",
    });
    res.json({ success: true, templates });
  } catch (error) {
    next(error);
  }
}

// ─── 9. Generate Content Ideas ──────────────────────────────────────────────
export async function generateContentIdeas(req: Request, res: Response, next: NextFunction) {
  try {
    const { projects, experience, skills, targetRole } = req.body;
    const ideas = await generateLinkedInContentIdeas({
      projects: projects || [],
      experience: experience || [],
      skills: skills || [],
      targetRole: targetRole || "Software Engineer",
    });
    res.json({ success: true, ideas });
  } catch (error) {
    next(error);
  }
}

// ─── 10. Recruiter Visibility Analysis ──────────────────────────────────────
export async function analyzeRecruiterVisibility(req: Request, res: Response, next: NextFunction) {
  try {
    const { headline, about, skills, experience, targetRole } = req.body;
    const analysis = await generateLinkedInRecruiterVisibility({
      headline: headline || "",
      about: about || "",
      skills: skills || [],
      experience: experience || [],
      targetRole: targetRole || "Software Engineer",
    });
    res.json({ success: true, analysis });
  } catch (error) {
    next(error);
  }
}

// ─── 11. Version History ────────────────────────────────────────────────────
export async function listLinkedInReports(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const reports = await userPrisma.linkedInReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
}

// ─── 12. Get Latest Report ──────────────────────────────────────────────────
export async function getLatestReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const report = await userPrisma.linkedInReport.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

// ─── 13. Get Report by ID ───────────────────────────────────────────────────
export async function getReportById(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { id } = req.params;
    const report = await userPrisma.linkedInReport.findFirst({
      where: { id, userId },
    });
    if (!report) return res.status(404).json({ success: false, error: "Report not found" });
    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

// ─── 14. Delete Report ──────────────────────────────────────────────────────
export async function deleteReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { id } = req.params;
    await userPrisma.linkedInReport.deleteMany({ where: { id, userId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// ─── 15. Duplicate Report ───────────────────────────────────────────────────
export async function duplicateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { id } = req.params;
    const original = await userPrisma.linkedInReport.findFirst({ where: { id, userId } });
    if (!original) return res.status(404).json({ success: false, error: "Report not found" });

    const duplicate = await userPrisma.linkedInReport.create({
      data: {
        userId,
        headline: original.headline,
        aboutSection: original.aboutSection,
        skills: original.skills,
        recommendations: original.recommendations,
        score: original.score,
        experienceJson: original.experienceJson,
        projectsJson: original.projectsJson,
        featuredJson: original.featuredJson,
        networkingJson: original.networkingJson,
        contentIdeasJson: original.contentIdeasJson,
        headlineScore: original.headlineScore,
        aboutScore: original.aboutScore,
        experienceScore: original.experienceScore,
        projectsScore: original.projectsScore,
        skillsScore: original.skillsScore,
        keywordScore: original.keywordScore,
        visibilityScore: original.visibilityScore,
        completenessScore: original.completenessScore,
        completenessJson: original.completenessJson,
        targetRole: original.targetRole,
        versionNumber: original.versionNumber + 1,
        versionLabel: `Copy of ${original.versionLabel || `v${original.versionNumber}`}`,
      },
    });

    res.status(201).json({ success: true, report: duplicate });
  } catch (error) {
    next(error);
  }
}

// ─── 16. Update Report (for inline edits) ───────────────────────────────────
export async function updateReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const { id } = req.params;
    const updates = req.body;

    const report = await userPrisma.linkedInReport.findFirst({ where: { id, userId } });
    if (!report) return res.status(404).json({ success: false, error: "Report not found" });

    const allowed: Record<string, any> = {};
    const fields = ["headline", "aboutSection", "skills", "recommendations", "score",
      "experienceJson", "projectsJson", "featuredJson", "networkingJson", "contentIdeasJson",
      "headlineScore", "aboutScore", "experienceScore", "projectsScore", "skillsScore",
      "keywordScore", "visibilityScore", "completenessScore", "completenessJson",
      "targetRole", "versionLabel"];
    
    for (const f of fields) {
      if (updates[f] !== undefined) allowed[f] = updates[f];
    }

    const updated = await userPrisma.linkedInReport.update({
      where: { id },
      data: { ...allowed, versionNumber: report.versionNumber + 1 },
    });

    res.json({ success: true, report: updated });
  } catch (error) {
    next(error);
  }
}
