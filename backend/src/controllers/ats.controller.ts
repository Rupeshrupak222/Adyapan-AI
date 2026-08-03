import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import {
  analyzeResumeATS,
  analyzeResumeDeep,
  analyzeJobMatch,
  generateATSSuggestions,
  applyATSSuggestion,
  atsAIChat,
  analyzeResumeIntelligence,
  compareResumes,
  getDynamicFallback,
} from "../lib/ai/gemini";
import mammoth from "mammoth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import { extractLegacyFromRecord } from "../utils/resume-converter";

import { extractPdfText } from "../services/pdf-parser.service";

async function parsePdf(buffer: Buffer): Promise<string> {
  return extractPdfText(buffer);
}

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  if (!file.buffer || file.buffer.length === 0) {
    throw httpError(400, "File buffer is empty. Please try uploading again.");
  }

  const mimeType = file.mimetype;
  let rawText: string;
  
  try {
    if (mimeType === "application/pdf") {
      rawText = await parsePdf(file.buffer);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      rawText = parsed.value;
    } else {
      throw httpError(400, "Unsupported file format. Please upload a PDF or DOCX file.");
    }
  } catch (parseErr: any) {
    if (parseErr.statusCode === 400) throw parseErr;
    console.error("[ATS upload] Document parsing error:", parseErr?.message || parseErr);
    throw httpError(400, "Failed to parse document. Ensure the file is not corrupted or password-protected.");
  }

  if (!rawText || rawText.trim().length === 0) {
    throw httpError(400, "The document appears to be empty. Scanned image layers with no readable text are not supported.");
  }

  return rawText;
}

function serializeResumeToText(resume: any): string {
  const legacy = extractLegacyFromRecord(resume);
  const p = legacy.personalInfo || {};
  const edu = legacy.education || [];
  const exp = legacy.experience || [];
  const proj = legacy.projects || [];
  const skills = legacy.skills || [];
  const certs = legacy.certifications || [];
  const achievements = legacy.achievements || [];
  const languages = legacy.languages || [];

  return `
Candidate Name: ${p.fullName || p.name || "N/A"}
Email: ${p.email || "N/A"}
Phone: ${p.phone || "N/A"}
Location: ${p.location || "N/A"}
Summary: ${p.summary || "N/A"}
LinkedIn: ${p.linkedin || "N/A"}
GitHub: ${p.github || "N/A"}
Portfolio: ${p.portfolio || "N/A"}

EDUCATION:
${edu.map((e: any) => `• ${e.degree || "Degree"} in ${e.fieldOfStudy || "Specialization"} from ${e.institution || "Institution"} (${e.startDate || ""} - ${e.endDate || ""})${e.grade ? ` — GPA: ${e.grade}` : ""}`).join("\n")}

WORK EXPERIENCE:
${exp.map((x: any) => `• ${x.role || "Role"} at ${x.company || "Company"} (${x.startDate || ""} - ${x.endDate || ""}): ${x.description || ""}`).join("\n")}

PROJECTS:
${proj.map((pr: any) => `• ${pr.name || pr.title || "Project"} (${pr.techStack || ""}): ${pr.description || ""}`).join("\n")}

TECHNICAL SKILLS:
${skills.join(", ")}

CERTIFICATIONS:
${certs.map((c: any) => `• ${c.name || c.title || "Certification"} from ${c.issuer || ""}${c.date ? ` (${c.date})` : ""}`).join("\n")}

ACHIEVEMENTS:
${achievements.filter(Boolean).join("\n")}

LANGUAGES:
${languages.filter(Boolean).join(", ")}
  `.trim();
}

async function getOrCreateResumeId(userId: string, resumeId?: string, userPrisma?: any): Promise<string> {
  if (resumeId) {
    const existing = await userPrisma.resume.findFirst({ where: { id: resumeId, userId } });
    if (existing) return existing.id;
    const uploaded = await userPrisma.uploadedResume.findFirst({ where: { id: resumeId, userId } });
    if (uploaded) {
      const matchingResume = await userPrisma.resume.findFirst({
        where: { userId, title: uploaded.fileName },
      });
      if (matchingResume) return matchingResume.id;
      const newResume = await userPrisma.resume.create({
        data: {
          userId,
          title: uploaded.fileName,
          template: "Uploaded",
          resumeData: { basics: { name: uploaded.fileName } },
        },
      });
      return newResume.id;
    }
  }
  const latestResume = await userPrisma.resume.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  if (latestResume) return latestResume.id;
  const placeholder = await userPrisma.resume.create({
    data: {
      userId,
      title: `Imported Resume (${new Date().toLocaleDateString()})`,
      template: "Modern",
      resumeData: { basics: {} },
    },
  });
  return placeholder.id;
}

async function resolveResumeText(userPrisma: any, userId: string, resumeId: string): Promise<string> {
  if (!resumeId) return "";
  const builder = await userPrisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (builder) return serializeResumeToText(builder);
  const uploaded = await userPrisma.uploadedResume.findFirst({
    where: { id: resumeId, userId },
    include: { candidateProfile: true },
  });
  if (!uploaded) return "";
  const p = uploaded.candidateProfile;
  if (p) {
    const parts = [
      `Candidate Name: ${p.name || "N/A"}`,
      `Email: ${p.email || "N/A"}`,
      `Phone: ${p.phone || "N/A"}`,
      `Location: ${p.location || "N/A"}`,
      `Summary: ${p.summary || ""}`,
      ``,
      `EDUCATION:`,
      (p.education || []).map((e: any) => `• ${e.degree || ""} in ${e.fieldOfStudy || ""} from ${e.institution || ""} (${e.startDate || ""} - ${e.endDate || ""})`).join("\n"),
      ``,
      `WORK EXPERIENCE:`,
      (p.experience || []).map((x: any) => `• ${x.role || ""} at ${x.company || ""} (${x.startDate || ""} - ${x.endDate || ""}): ${x.description || ""}`).join("\n"),
      ``,
      `PROJECTS:`,
      (p.projects || []).map((pr: any) => `• ${pr.name || pr.title || "Project"} (${pr.techStack || ""}): ${pr.description || ""}`).join("\n"),
      ``,
      `TECHNICAL SKILLS:`,
      (p.skills || []).join(", "),
      ``,
      `CERTIFICATIONS:`,
      (p.certifications || []).map((c: any) => `• ${c.name || c.title || ""} from ${c.issuer || ""}`).join("\n"),
      ``,
      `ACHIEVEMENTS:`,
      (p.achievements || []).filter(Boolean).join("\n"),
    ];
    return parts.join("\n").trim();
  }
  return uploaded.extractedText || "";
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

/**
 * 1. Analyze Uploaded Resume File or Saved Resume for ATS
 */
export async function analyzeATSReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const targetRole = req.body.targetRole || "Software Engineer";
    const resumeId = req.body.resumeId || "";
    const jobDescription = req.body.jobDescription || "";

    const userPrisma = await getUserPrismaFromRequest(req);
    let resumeText = "";

    if (req.file) {
      resumeText = await extractTextFromFile(req.file);
    } else if (resumeId) {
      resumeText = await resolveResumeText(userPrisma, userId, resumeId);
      if (!resumeText) throw httpError(404, "Resume not found");
    } else {
      const latestResume = await userPrisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (latestResume) {
        resumeText = serializeResumeToText(latestResume);
      } else {
        throw httpError(400, "No resume found. Please upload a file or create a resume first.");
      }
    }

    if (!resumeText.trim()) {
      throw httpError(400, "Could not extract text from the resume.");
    }

    let analysis;
    try {
      analysis = await analyzeResumeDeep(resumeText, targetRole, jobDescription);
    } catch (aiErr: any) {
      console.warn("[ATS] AI analysis fallback invoked:", aiErr?.message || aiErr);
      analysis = getDynamicFallback(resumeText, targetRole);
    }

    let associatedResumeId: string | null = null;
    try {
      associatedResumeId = await getOrCreateResumeId(userId, resumeId, userPrisma);
    } catch (resumeIdErr: any) {
      console.error("[ATS] Failed to resolve resumeId for DB save:", resumeIdErr?.message || resumeIdErr);
    }

    // Save ATS report to DB — wrapped in try-catch so analysis is always returned
    let report: any = null;
    if (associatedResumeId) {
    try {
      report = await userPrisma.aTSReport.create({
        data: {
          userId,
          resumeId: associatedResumeId,
          score: analysis.score,
          missingKeywords: analysis.keywordsMissing,
          recommendations: JSON.parse(JSON.stringify({
            recommendations: analysis.recommendations,
            formattingIssues: analysis.formattingIssues,
            strengths: analysis.strengths,
            sectionScores: analysis.sectionScores,
            keywordAnalysis: analysis.keywordAnalysis,
            formattingCheck: analysis.formattingCheck,
            strengthBars: analysis.strengthBars,
            readability: analysis.readability,
            resumeLength: analysis.length,
            formatting: analysis.formatting,
            recruiterScore: analysis.recruiterScore,
            scoreLabel: analysis.scoreLabel,
            keywordsFound: analysis.keywordsFound,
            strongKeywords: analysis.strongKeywords || [],
            weakKeywords: analysis.weakKeywords || [],
          })),
          overallScore: analysis.score,
          formattingScore: analysis.formattingScore ?? (analysis.formatting === "Excellent" ? 95 : analysis.formatting === "Good" ? 80 : analysis.formatting === "Fair" ? 60 : 40),
          keywordScore: analysis.keywordScore ?? Math.round((analysis.keywordsFound.length / Math.max(1, analysis.keywordsFound.length + (analysis.keywordsMissing || []).length)) * 100),
          experienceScore: analysis.experienceScore ?? (analysis.sectionScores?.experience?.score ? analysis.sectionScores.experience.score * 10 : 70),
          projectScore: analysis.projectScore ?? (analysis.sectionScores?.projects?.score ? analysis.sectionScores.projects.score * 10 : 70),
          skillsScore: analysis.skillsScore ?? (analysis.sectionScores?.skills?.score ? analysis.sectionScores.skills.score * 10 : 80),
          educationScore: analysis.educationScore ?? (analysis.sectionScores?.education?.score ? analysis.sectionScores.education.score * 10 : 80),
          readabilityScore: analysis.readabilityScore ?? (analysis.readability === "Excellent" ? 95 : analysis.readability === "Good" ? 80 : analysis.readability === "Fair" ? 60 : 40),
          reportJson: JSON.parse(JSON.stringify(analysis)),
        },
      });
    } catch (dbErr: any) {
      console.error("[ATS] Failed to save ATS report to DB (returning analysis anyway):", dbErr?.message || dbErr);
    }
    } // end if (associatedResumeId)

    res.json({ success: true, report, analysis });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Compare Resume with Job Description
 */
export async function analyzeJDMatch(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { resumeId, jobDescription } = req.body;
    if (!jobDescription) throw httpError(400, "jobDescription is required");

    const userPrisma = await getUserPrismaFromRequest(req);
    let resumeText = "";

    if (req.file) {
      resumeText = await extractTextFromFile(req.file);
    } else if (resumeId) {
      resumeText = await resolveResumeText(userPrisma, userId, resumeId);
      if (!resumeText) throw httpError(404, "Resume not found");
    } else {
      const latestResume = await userPrisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (latestResume) {
        resumeText = serializeResumeToText(latestResume);
      } else {
        throw httpError(400, "No resume found.");
      }
    }

    const matchResult = await analyzeJobMatch(resumeText, jobDescription);

    res.json({ success: true, matchResult });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Get ATS Suggestions for Improvement
 */
export async function getATSSuggestions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { targetRole } = req.body;
    const userPrisma = await getUserPrismaFromRequest(req);
    let resumeText = "";
    let analysis: any = null;

    if (req.body.resumeId) {
      resumeText = await resolveResumeText(userPrisma, userId, req.body.resumeId);
      if (!resumeText) throw httpError(404, "Resume not found");
    } else {
      const latestResume = await userPrisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (latestResume) resumeText = serializeResumeToText(latestResume);
    }

    if (req.body.analysis) {
      analysis = req.body.analysis;
    }

    if (!resumeText) throw httpError(400, "No resume content found");

    // If we don't have analysis yet, do a quick one
    if (!analysis) {
      try {
        const atsResult = await analyzeResumeATS(resumeText, targetRole || "Software Engineer");
        analysis = atsResult;
      } catch (aiErr: any) {
        console.error("[ATS] AI analysis failed:", aiErr?.message || aiErr);
        throw httpError(503, "AI analysis service is temporarily unavailable. Please try again in a moment.");
      }
    }

    let suggestions;
    try {
      suggestions = await generateATSSuggestions(resumeText, analysis, targetRole || "Software Engineer");
    } catch (aiErr: any) {
      console.error("[ATS] AI suggestions generation failed:", aiErr?.message || aiErr);
      throw httpError(503, "AI analysis service is temporarily unavailable. Please try again in a moment.");
    }

    res.json({ success: true, suggestions });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Apply a single ATS improvement
 */
export async function applyImprovement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { section, originalContent, suggestionText } = req.body;
    if (!section || !originalContent || !suggestionText) {
      throw httpError(400, "section, originalContent, and suggestionText are required");
    }

    const improved = await applyATSSuggestion(section, originalContent, suggestionText);

    res.json({ success: true, improved });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. ATS AI Chat
 */
export async function atsChatHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { message, resumeText, analysis } = req.body;
    if (!message) throw httpError(400, "message is required");

    const userPrisma = await getUserPrismaFromRequest(req);
    let text = resumeText || "";
    if (!text && req.body.resumeId) {
      text = await resolveResumeText(userPrisma, userId, req.body.resumeId);
    }

    const result = await atsAIChat(text, analysis || {}, message);

    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. Get User ATS Auditing History
 */
export async function listATSReports(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    const reports = await userPrisma.aTSReport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        resume: {
          select: { title: true },
        },
      },
    });

    res.json({ success: true, reports });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Get Specific ATS Report
 */
export async function getATSReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    const report = await userPrisma.aTSReport.findFirst({
      where: { id: req.params.id as string, userId },
      include: {
        resume: {
          select: { title: true },
        },
      },
    });

    if (!report) {
      throw httpError(404, "ATS Report not found");
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. ATS Intelligence Analysis (Day 22)
 */
export async function analyzeATSIntelligence(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const targetRole = req.body.targetRole || "Software Engineer";
    const resumeId = req.body.resumeId || "";
    const jobDescription = req.body.jobDescription || "";

    const userPrisma = await getUserPrismaFromRequest(req);
    let resumeText = "";

    if (req.file) {
      resumeText = await extractTextFromFile(req.file);
    } else if (resumeId) {
      resumeText = await resolveResumeText(userPrisma, userId, resumeId);
      if (!resumeText) throw httpError(404, "Resume not found");
    } else {
      const latestResume = await userPrisma.resume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      if (latestResume) {
        resumeText = serializeResumeToText(latestResume);
      } else {
        throw httpError(400, "No resume found. Please upload a file or create a resume first.");
      }
    }

    if (!resumeText.trim()) {
      throw httpError(400, "Could not extract text from the resume.");
    }

    let intelligence;
    try {
      intelligence = await analyzeResumeIntelligence(resumeText, targetRole, jobDescription);
    } catch (aiErr: any) {
      console.error("[ATS] AI intelligence analysis failed:", aiErr?.message || aiErr);
      throw httpError(503, "AI analysis service is temporarily unavailable. Please try again in a moment.");
    }

    res.json({ success: true, intelligence });
  } catch (error) {
    next(error);
  }
}

/**
 * 9. Compare Two Resume Versions (Day 22)
 */
export async function compareResumeVersions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { resumeIdA, resumeIdB, targetRole } = req.body;
    if (!resumeIdA || !resumeIdB) {
      throw httpError(400, "Both resumeIdA and resumeIdB are required");
    }

    const userPrisma = await getUserPrismaFromRequest(req);

    const textA = await resolveResumeText(userPrisma, userId, resumeIdA);
    if (!textA) throw httpError(404, "Resume A not found");

    const textB = await resolveResumeText(userPrisma, userId, resumeIdB);
    if (!textB) throw httpError(404, "Resume B not found");

    const comparison = await compareResumes(textA, textB, targetRole || "Software Engineer");

    res.json({ success: true, comparison });
  } catch (error) {
    next(error);
  }
}

/**
 * 10. Get Latest ATS Report (Day 22)
 */
export async function getLatestATSReport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    const report = await userPrisma.aTSReport.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        resume: {
          select: { title: true },
        },
      },
    });

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
}
