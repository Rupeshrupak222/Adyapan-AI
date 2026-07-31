import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import { generateJSON } from "../lib/ai/openrouter";
import { cloudinary } from "../config/cloudinary";
import mammoth from "mammoth";

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
    console.error("[Resume Upload] Document parsing error:", parseErr?.message || parseErr);
    throw httpError(400, "Failed to parse document. Ensure the file is not corrupted or password-protected.");
  }

  if (!rawText || rawText.trim().length === 0) {
    throw httpError(400, "The document appears to be empty. Please upload a resume with readable text.");
  }

  return rawText;
}

async function uploadToCloudinary(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "adyapan-resumes",
        resource_type: "raw",
        use_filename: true,
        unique_filename: true,
      } as any,
      (error: any, result: any) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(file.buffer);
  });
}

interface ExtractedProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  education: Array<{ institution: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string; grade: string }>;
  experience: Array<{ company: string; role: string; startDate: string; endDate: string; description: string }>;
  projects: Array<{ name: string; techStack: string; description: string }>;
  skills: string[];
  certifications: Array<{ name: string; issuer: string; date: string }>;
  achievements: string[];
  languages: string[];
  links: { linkedin?: string; github?: string; portfolio?: string; other?: string };
}

async function extractProfileWithAI(text: string): Promise<ExtractedProfile> {
  const systemPrompt = `You are an expert resume parser. Extract ALL structured career data from the resume text below. Return a valid JSON object with these exact fields:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "location": "city, state/country",
  "summary": "professional summary or objective",
  "education": [{"institution": "", "degree": "", "fieldOfStudy": "", "startDate": "", "endDate": "", "grade": ""}],
  "experience": [{"company": "", "role": "", "startDate": "", "endDate": "", "description": ""}],
  "projects": [{"name": "", "techStack": "", "description": ""}],
  "skills": ["skill1", "skill2"],
  "certifications": [{"name": "", "issuer": "", "date": ""}],
  "achievements": ["achievement1"],
  "languages": ["language1"],
  "links": {"linkedin": "", "github": "", "portfolio": ""}
}
Rules:
- Extract ALL items found, do not skip any.
- If a field is not found, use empty string "" or empty array [].
- For skills, extract every technical and soft skill mentioned.
- For description fields, preserve bullet points with newlines.
- Return ONLY the JSON object, no markdown fences or explanation.`;

  const fallbackProfile: ExtractedProfile = {
    name: "", email: "", phone: "", location: "", summary: "",
    education: [], experience: [], projects: [], skills: [],
    certifications: [], achievements: [], languages: [],
    links: { linkedin: "", github: "", portfolio: "", other: "" },
  };

  const truncatedText = text.slice(0, 12000);

  const result = await generateJSON<ExtractedProfile>(
    systemPrompt,
    `Resume text:\n\n${truncatedText}`,
    { model: "google/gemini-2.0-flash" },
    fallbackProfile
  );

  return result;
}

function calculateCompleteness(profile: ExtractedProfile): { score: number; missingSections: string[]; strengths: string[]; weaknesses: string[]; recommendations: string[] } {
  const missingSections: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  let totalChecks = 10;
  let passedChecks = 0;

  // Contact info
  if (profile.name) { passedChecks++; strengths.push("Name present"); } else { missingSections.push("Name"); weaknesses.push("Missing name"); recommendations.push("Add your full name to the resume"); }
  if (profile.email) { passedChecks++; strengths.push("Email present"); } else { missingSections.push("Email"); weaknesses.push("Missing email address"); recommendations.push("Add a professional email address"); }
  if (profile.phone) { passedChecks++; strengths.push("Phone present"); } else { missingSections.push("Phone"); weaknesses.push("Missing phone number"); recommendations.push("Add your phone number for recruiter contact"); }

  // Content sections
  if (profile.summary && profile.summary.length > 20) { passedChecks++; strengths.push("Professional summary present"); } else { missingSections.push("Summary"); recommendations.push("Add a professional summary to highlight your career objectives"); }
  if (profile.education.length > 0) { passedChecks++; strengths.push("Education section present"); } else { missingSections.push("Education"); weaknesses.push("No education details found"); recommendations.push("Add your educational background"); }
  if (profile.experience.length > 0) { passedChecks++; strengths.push("Work experience present"); } else { missingSections.push("Experience"); weaknesses.push("No work experience found"); recommendations.push("Add your work experience or internships"); }
  if (profile.projects.length > 0) { passedChecks++; strengths.push("Projects present"); } else { missingSections.push("Projects"); weaknesses.push("No projects found"); recommendations.push("Add projects to demonstrate hands-on skills"); }
  if (profile.skills.length > 0) { passedChecks++; strengths.push(`${profile.skills.length} skills detected`); if (profile.skills.length >= 5) strengths.push("Good skill diversity"); } else { missingSections.push("Skills"); weaknesses.push("No skills listed"); recommendations.push("Add technical and soft skills"); }
  if (profile.certifications.length > 0) { passedChecks++; strengths.push("Certifications present"); } else { missingSections.push("Certifications"); recommendations.push("Consider adding relevant certifications"); }
  if (profile.achievements.length > 0) { passedChecks++; strengths.push("Achievements present"); } else { missingSections.push("Achievements"); recommendations.push("Add notable achievements and awards"); }

  const score = Math.round((passedChecks / totalChecks) * 100);

  if (profile.experience.length === 0 && profile.education.length > 0) {
    recommendations.push("Consider adding internship or volunteer experience");
  }
  if (profile.skills.length < 5) {
    recommendations.push("Aim for 8-15 relevant skills for better ATS matching");
  }
  if (!profile.links.linkedin) {
    recommendations.push("Add your LinkedIn profile URL");
  }

  return { score, missingSections, strengths, weaknesses, recommendations };
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * Upload a resume, parse it, extract candidate profile, and return full analysis
 */
export async function uploadAndParseResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    if (!req.file) throw httpError(400, "No file uploaded. Please select a resume file.");

    const file = req.file;
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw httpError(400, "Unsupported file type. Please upload a PDF or DOCX file.");
    }
    if (file.size === 0) {
      throw httpError(400, "The file is empty. Please upload a valid resume.");
    }

    // 1. Extract text
    const extractedText = await extractTextFromFile(file);

    // 2. Upload to Cloudinary
    const { url: cloudinaryUrl } = await uploadToCloudinary(file);

    // 3. AI extraction
    const profile = await extractProfileWithAI(extractedText);

    // Guard: detect when AI returned empty fallback (all providers failed)
    const isEmptyProfile = !profile.name && !profile.email && profile.skills.length === 0 && profile.education.length === 0 && profile.experience.length === 0;
    if (isEmptyProfile) {
      console.error(`[Resume Upload] Step 3: AI extraction returned empty fallback. All providers may be rate-limited or unavailable.`);
      throw httpError(503, "AI extraction service is temporarily unavailable. Please try again in a few minutes. If this persists, contact support.");
    }

    // 4. Calculate scores
    const analysis = calculateCompleteness(profile);

    // 5. Get next version number
    const userPrisma = await getUserPrismaFromRequest(req);
    const existingCount = await userPrisma.uploadedResume.count({ where: { userId } });
    const versionNumber = existingCount + 1;

    // 6. If first resume, make it active
    const isActive = existingCount === 0;

    // 7. Store resume + profile
    const uploadedResume = await userPrisma.uploadedResume.create({
      data: {
        userId,
        cloudinaryUrl,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        versionNumber,
        isActive,
        extractedText,
      },
    });

    const candidateProfile = await userPrisma.candidateProfile.create({
      data: {
        userId,
        resumeId: uploadedResume.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        summary: profile.summary,
        education: profile.education as any,
        experience: profile.experience as any,
        projects: profile.projects as any,
        skills: profile.skills as any,
        certifications: profile.certifications as any,
        achievements: profile.achievements as any,
        languages: profile.languages as any,
        links: profile.links as any,
        completenessScore: analysis.score,
        strengthScore: Math.min(100, analysis.score),
        missingSections: analysis.missingSections as any,
        recommendations: analysis.recommendations as any,
        strengths: analysis.strengths as any,
        weaknesses: analysis.weaknesses as any,
      },
    });

    res.json({
      success: true,
      resume: uploadedResume,
      profile: candidateProfile,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all uploaded resumes for the user
 */
export async function listUploadedResumes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const resumes = await userPrisma.uploadedResume.findMany({
      where: { userId },
      include: { candidateProfile: true },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, resumes });
  } catch (err) {
    next(err);
  }
}

/**
 * Get a specific resume with its candidate profile
 */
export async function getUploadedResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { id } = req.params;
    const userPrisma = await getUserPrismaFromRequest(req);

    const resume = await userPrisma.uploadedResume.findFirst({
      where: { id, userId },
      include: { candidateProfile: true },
    });

    if (!resume) throw httpError(404, "Resume not found");
    res.json({ success: true, resume });
  } catch (err) {
    next(err);
  }
}

/**
 * Set a resume as the active resume
 */
export async function setActiveUploadedResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { id } = req.params;
    const userPrisma = await getUserPrismaFromRequest(req);

    const resume = await userPrisma.uploadedResume.findFirst({
      where: { id, userId },
    });
    if (!resume) throw httpError(404, "Resume not found");

    // Deactivate all, activate target
    await userPrisma.uploadedResume.updateMany({
      where: { userId },
      data: { isActive: false },
    });
    await userPrisma.uploadedResume.update({
      where: { id },
      data: { isActive: true },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete an uploaded resume and its candidate profile
 */
export async function deleteUploadedResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const { id } = req.params;
    const userPrisma = await getUserPrismaFromRequest(req);

    const resume = await userPrisma.uploadedResume.findFirst({
      where: { id, userId },
    });
    if (!resume) throw httpError(404, "Resume not found");

    // Delete from Cloudinary
    try {
      const urlParts = resume.cloudinaryUrl.split("/");
      const filename = urlParts[urlParts.length - 1];
      const publicId = `adyapan-resumes/${filename.split(".")[0]}`;
      await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
    } catch (e) {
      console.warn("[Resume Upload] Cloudinary delete failed:", e);
    }

    // If was active, set another as active
    if (resume.isActive) {
      const nextResume = await userPrisma.uploadedResume.findFirst({
        where: { userId, id: { not: id } },
        orderBy: { createdAt: "desc" },
      });
      if (nextResume) {
        await userPrisma.uploadedResume.update({
          where: { id: nextResume.id },
          data: { isActive: true },
        });
      }
    }

    // Cascade delete is on the schema, but let's be safe
    await userPrisma.candidateProfile.deleteMany({ where: { resumeId: id } });
    await userPrisma.uploadedResume.delete({ where: { id } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Get the active resume's candidate profile (for quick access)
 */
export async function getActiveProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const resume = await userPrisma.uploadedResume.findFirst({
      where: { userId, isActive: true },
      include: { candidateProfile: true },
    });

    if (!resume) {
      res.json({ success: true, resume: null, profile: null });
      return;
    }

    res.json({ success: true, resume, profile: resume.candidateProfile });
  } catch (err) {
    next(err);
  }
}
