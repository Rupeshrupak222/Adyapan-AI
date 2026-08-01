import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import {
  generateCoverLetterV2,
  generateCoverLetterChat,
  parseJobDescription,
  generateCompanyInsights,
  generateRoleMatch,
  scoreCoverLetter,
  generateCoverLetterImprovements,
} from "../lib/ai/gemini";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import { extractLegacyFromRecord } from "../utils/resume-converter";

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

function serializeCandidateProfile(profile: any): string {
  const edu = (profile.education as any[]) || [];
  const exp = (profile.experience as any[]) || [];
  const proj = (profile.projects as any[]) || [];
  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const certs = (profile.certifications as any[]) || [];
  const achievements = Array.isArray(profile.achievements) ? profile.achievements : [];
  const languages = Array.isArray(profile.languages) ? profile.languages : [];
  const links = (profile.links as any) || {};

  return `
Candidate Name: ${profile.name || "N/A"}
Email: ${profile.email || "N/A"}
Phone: ${profile.phone || "N/A"}
Location: ${profile.location || "N/A"}
Summary: ${profile.summary || "N/A"}
LinkedIn: ${links.linkedin || "N/A"}
GitHub: ${links.github || "N/A"}
Portfolio: ${links.portfolio || "N/A"}

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

async function resolveResumeText(userPrisma: any, resumeId: string, userId: string): Promise<string> {
  // Try manual Resume builder first
  const resume = await userPrisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (resume) return serializeResumeToText(resume);

  // Try uploaded resume with candidate profile
  const uploaded = await userPrisma.uploadedResume.findFirst({
    where: { id: resumeId, userId },
    include: { candidateProfile: true },
  });
  if (uploaded?.candidateProfile) return serializeCandidateProfile(uploaded.candidateProfile);
  if (uploaded?.extractedText) return uploaded.extractedText;

  return "";
}

/**
 * Resolves a resume (manual Resume builder OR uploaded UploadedResume) into
 * serialized text. `validResumeId` is only populated when the given id maps to
 * an actual `Resume` record — uploaded-resume ids are NOT valid for the
 * CoverLetter.resumeId foreign key and must be stored as null to avoid
 * Prisma P2003 (FK constraint) 500 errors.
 */
async function resolveResume(userPrisma: any, resumeId: string, userId: string): Promise<{ text: string; validResumeId: string | null }> {
  const resume = await userPrisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (resume) return { text: serializeResumeToText(resume), validResumeId: resumeId };

  const uploaded = await userPrisma.uploadedResume.findFirst({
    where: { id: resumeId, userId },
    include: { candidateProfile: true },
  });
  if (uploaded?.candidateProfile) return { text: serializeCandidateProfile(uploaded.candidateProfile), validResumeId: null };
  if (uploaded?.extractedText) return { text: uploaded.extractedText, validResumeId: null };

  return { text: "", validResumeId: null };
}

/**
 * 1. Generate Cover Letter (Enhanced v2)
 */
export async function generateCoverLetter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const {
      resumeId, companyName, role, jobDescription, tone, letterType,
      length, mode, parsedJD, companyInsights, roleMatch,
    } = req.body;

    if (!companyName) throw httpError(400, "Company name is required");
    if (!role) throw httpError(400, "Role/Title is required");

    const userPrisma = await getUserPrismaFromRequest(req);

    let resumeText = "";
    let validResumeId: string | null = null;
    if (resumeId) {
      const resolved = await resolveResume(userPrisma, resumeId, userId);
      resumeText = resolved.text;
      validResumeId = resolved.validResumeId;
      console.log(`[CoverLetter] Resumed resumeId=${resumeId}, text length=${resumeText.length}`);
      if (!resumeText) {
        console.warn(`[CoverLetter] resumeId ${resumeId} provided but resolved to empty text`);
      }
    }

    const selectedTone = tone || "Professional";
    const selectedType = letterType || "Full-Time";
    const selectedLength = length || "standard";
    const selectedMode = mode || "Custom";

    const result = await generateCoverLetterV2(
      resumeText, companyName, role, jobDescription || "", selectedTone,
      selectedType, selectedLength, parsedJD || null, companyInsights || null,
      roleMatch || null, selectedMode
    );

    const content = [result.greeting, result.introduction, result.body, result.closing]
      .filter(Boolean).join("\n\n");

    const coverLetter = await userPrisma.coverLetter.create({
      data: {
        userId,
        resumeId: validResumeId,
        companyName,
        role,
        jobDescription: jobDescription || null,
        tone: selectedTone,
        letterType: selectedType,
        greeting: result.greeting,
        introduction: result.introduction,
        body: result.body,
        closing: result.closing,
        content,
        letterName: `${role} at ${companyName}`,
        parsedKeywords: parsedJD?.keywords || [],
        highlightMap: result.highlights || [],
      },
    });

    res.status(201).json({ success: true, coverLetter });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Parse Job Description
 */
export async function parseJDEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobDescription } = req.body;
    if (!jobDescription) throw httpError(400, "Job description text is required");

    const parsed = await parseJobDescription(jobDescription);
    res.json({ success: true, parsed });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Company Insights
 */
export async function getCompanyInsights(req: Request, res: Response, next: NextFunction) {
  try {
    const { companyName, jobDescription } = req.body;
    if (!companyName) throw httpError(400, "Company name is required");

    const insights = await generateCompanyInsights(companyName, jobDescription || "");
    res.json({ success: true, insights });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Role Match Analysis
 */
export async function getRoleMatch(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { resumeId, parsedJD } = req.body;

    if (!parsedJD) throw httpError(400, "Parsed job description is required");

    const userPrisma = await getUserPrismaFromRequest(req);

    let resumeText = "";
    if (resumeId) {
      resumeText = await resolveResumeText(userPrisma, resumeId, userId);
    }

    const match = await generateRoleMatch(resumeText, parsedJD);
    res.json({ success: true, match });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Score Cover Letter Quality
 */
export async function scoreCoverLetterEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { coverLetterId, resumeId, parsedJD } = req.body;

    if (!coverLetterId) throw httpError(400, "coverLetterId is required");

    const userPrisma = await getUserPrismaFromRequest(req);
    const letter = await userPrisma.coverLetter.findFirst({
      where: { id: coverLetterId, userId },
    });
    if (!letter) throw httpError(404, "Cover letter not found");

    let resumeText = "";
    if (resumeId) {
      resumeText = await resolveResumeText(userPrisma, resumeId, userId);
    }

    const defaultJD = { companyName: letter.companyName, role: letter.role, requiredSkills: [], preferredSkills: [], responsibilities: [], experienceLevel: "", keywords: [], techStack: [], softSkills: [], qualifications: [], salaryRange: null, location: null, employmentType: null, summary: "" };
    const scores = await scoreCoverLetter(letter.content, resumeText, parsedJD || defaultJD);

    const updated = await userPrisma.coverLetter.update({
      where: { id: coverLetterId },
      data: {
        qualityScore: scores.overallScore,
        personalizationScore: scores.personalizationScore,
        atsScore: scores.atsCompatibility,
        roleMatchScore: scores.roleAlignment,
      },
    });

    res.json({ success: true, scores, coverLetter: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. AI Chat — refine existing cover letter
 */
export async function chatCoverLetter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { coverLetterId, message } = req.body;
    if (!message) throw httpError(400, "Message is required");

    const userPrisma = await getUserPrismaFromRequest(req);
    const letter = await userPrisma.coverLetter.findFirst({
      where: { id: coverLetterId, userId },
    });
    if (!letter) throw httpError(404, "Cover letter not found");

    let resumeText = "";
    if (letter.resumeId) {
      resumeText = await resolveResumeText(userPrisma, letter.resumeId, userId);
    }

    const result = await generateCoverLetterChat(
      resumeText,
      { greeting: letter.greeting || "", introduction: letter.introduction || "", body: letter.body || "", closing: letter.closing || "" },
      message
    );

    const content = [result.greeting, result.introduction, result.body, result.closing]
      .filter(Boolean).join("\n\n");

    const prevVersion = letter.versionNumber || 1;
    const updated = await userPrisma.coverLetter.update({
      where: { id: coverLetterId },
      data: {
        greeting: result.greeting,
        introduction: result.introduction,
        body: result.body,
        closing: result.closing,
        content,
        versionNumber: prevVersion + 1,
      },
    });

    res.json({ success: true, coverLetter: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Save/Update cover letter
 */
export async function saveCoverLetter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { coverLetterId, greeting, introduction, body, closing, letterName, isFavorite } = req.body;
    if (!coverLetterId) throw httpError(400, "coverLetterId is required");

    const userPrisma = await getUserPrismaFromRequest(req);
    const letter = await userPrisma.coverLetter.findFirst({
      where: { id: coverLetterId, userId },
    });
    if (!letter) throw httpError(404, "Cover letter not found");

    const content = [greeting, introduction, body, closing].filter(Boolean).join("\n\n");

    const updated = await userPrisma.coverLetter.update({
      where: { id: coverLetterId },
      data: {
        greeting: greeting ?? letter.greeting,
        introduction: introduction ?? letter.introduction,
        body: body ?? letter.body,
        closing: closing ?? letter.closing,
        content,
        letterName: letterName ?? letter.letterName,
        isFavorite: isFavorite ?? letter.isFavorite,
      },
    });

    res.json({ success: true, coverLetter: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * 8. Get Improvement Suggestions
 */
export async function getImprovements(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { coverLetterId, resumeId } = req.body;

    if (!coverLetterId) throw httpError(400, "coverLetterId is required");

    const userPrisma = await getUserPrismaFromRequest(req);
    const letter = await userPrisma.coverLetter.findFirst({
      where: { id: coverLetterId, userId },
    });
    if (!letter) throw httpError(404, "Cover letter not found");

    let resumeText = "";
    if (resumeId) {
      resumeText = await resolveResumeText(userPrisma, resumeId, userId);
    }

    const improvements = await generateCoverLetterImprovements(
      letter.content, resumeText, null
    );

    res.json({ success: true, improvements });
  } catch (error) {
    next(error);
  }
}

/**
 * 9. List User Cover Letters
 */
export async function listCoverLetters(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const coverLetters = await userPrisma.coverLetter.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, coverLetters });
  } catch (error) {
    next(error);
  }
}

/**
 * 10. Get Specific Cover Letter
 */
export async function getCoverLetter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);
    const coverLetter = await userPrisma.coverLetter.findFirst({
      where: { id: req.params.id as string, userId },
    });
    if (!coverLetter) throw httpError(404, "Cover letter not found");
    res.json({ success: true, coverLetter });
  } catch (error) {
    next(error);
  }
}

/**
 * 11. Delete Cover Letter
 */
export async function deleteCoverLetter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const letterId = req.params.id as string;
    const userPrisma = await getUserPrismaFromRequest(req);
    const letter = await userPrisma.coverLetter.findFirst({
      where: { id: letterId, userId },
    });
    if (!letter) throw httpError(404, "Cover letter not found");
    await userPrisma.coverLetter.delete({ where: { id: letterId } });
    res.json({ success: true, message: "Cover letter deleted successfully" });
  } catch (error) {
    next(error);
  }
}

/**
 * 12. Duplicate Cover Letter
 */
export async function duplicateCoverLetter(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const letterId = req.params.id as string;
    const userPrisma = await getUserPrismaFromRequest(req);
    const letter = await userPrisma.coverLetter.findFirst({
      where: { id: letterId, userId },
    });
    if (!letter) throw httpError(404, "Cover letter not found");

    const duplicate = await userPrisma.coverLetter.create({
      data: {
        userId,
        companyName: letter.companyName,
        role: letter.role,
        content: letter.content,
        resumeId: letter.resumeId,
        jobDescription: letter.jobDescription,
        tone: letter.tone,
        letterType: letter.letterType,
        greeting: letter.greeting,
        introduction: letter.introduction,
        body: letter.body,
        closing: letter.closing,
        letterName: `${letter.letterName || letter.role + " at " + letter.companyName} (Copy)`,
        versionNumber: 1,
      },
    });

    res.status(201).json({ success: true, coverLetter: duplicate });
  } catch (error) {
    next(error);
  }
}

/**
 * 13. Toggle Favorite
 */
export async function toggleFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const letterId = req.params.id as string;
    const userPrisma = await getUserPrismaFromRequest(req);
    const letter = await userPrisma.coverLetter.findFirst({
      where: { id: letterId, userId },
    });
    if (!letter) throw httpError(404, "Cover letter not found");

    const updated = await userPrisma.coverLetter.update({
      where: { id: letterId },
      data: { isFavorite: !letter.isFavorite },
    });

    res.json({ success: true, coverLetter: updated });
  } catch (error) {
    next(error);
  }
}
