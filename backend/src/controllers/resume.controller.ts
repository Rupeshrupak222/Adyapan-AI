import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import { generateResumeSummary, enhanceProjectDescription, enhanceExperienceDescription, optimizeResumeContent, resumeAIChat } from "../lib/ai/gemini";
import { groqGenerateResumeSummary, groqEnhanceProjectDescription, groqEnhanceExperienceDescription, groqOptimizeResumeContent, groqResumeAIChat } from "../lib/ai/groq";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import { generateResumePdf, ResumeData } from "../services/resume-pdf.service";
import type { JSONResume } from "../types/json-resume";
import { jsonResumeToLegacy } from "../utils/resume-converter";

const genAI = env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : null;

// AI wrapper — tries Gemini first, falls back to Groq
async function aiResumeSummary(p: object, e: object[], ex: object[], s: string[]) {
  try { return await generateResumeSummary(p, e, ex, s); }
  catch (error) { console.warn("[Resume] Gemini summary failed, falling back to Groq:", error); return groqGenerateResumeSummary(p, e, ex, s); }
}
async function aiEnhanceProject(name: string, tech: string, desc: string) {
  try { return await enhanceProjectDescription(name, tech, desc); }
  catch (error) { console.warn("[Resume] Gemini project enhance failed, falling back to Groq:", error); return groqEnhanceProjectDescription(name, tech, desc); }
}
async function aiEnhanceExperience(role: string, company: string, desc: string) {
  try { return await enhanceExperienceDescription(role, company, desc); }
  catch (error) { console.warn("[Resume] Gemini experience enhance failed, falling back to Groq:", error); return groqEnhanceExperienceDescription(role, company, desc); }
}
async function aiOptimizeResume(resumeJson: object, company: string) {
  try { return await optimizeResumeContent(resumeJson, company); }
  catch (error) { console.warn("[Resume] Gemini optimize failed, falling back to Groq:", error); return groqOptimizeResumeContent(resumeJson, company); }
}
async function aiResumeChat(resumeData: object, message: string) {
  try { return await resumeAIChat(resumeData, message); }
  catch (error) { console.warn("[Resume] Gemini chat failed, falling back to Groq:", error); return groqResumeAIChat(resumeData, message); }
}

/**
 * Helper to ensure a resume belongs to the logged-in user
 */
async function getResumeForUser(resumeId: string, userId: string, userPrisma: any) {
  const resume = await userPrisma.resume.findFirst({
    where: { id: resumeId, userId },
  });
  if (!resume) {
    throw httpError(404, "Resume not found or access denied");
  }
  return resume;
}

/**
 * 1. Create Resume Draft
 */
export async function createResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const { title, template, resumeData } = req.body;

    if (!title) throw httpError(400, "Resume title is required");

    const userPrisma = await getUserPrismaFromRequest(req);
    const resume = await userPrisma.resume.create({
      data: {
        userId,
        title,
        template: template ?? "Modern",
        resumeData: resumeData ?? { basics: {} },
      },
    });

    res.status(201).json({ success: true, resume });
  } catch (error) {
    next(error);
  }
}

/**
 * 2. Get User Resumes List
 */
export async function listResumes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    const resumes = await userPrisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    res.json({ success: true, resumes });
  } catch (error) {
    next(error);
  }
}

/**
 * 3. Get Resume Details
 */
export async function getResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    const resume = await getResumeForUser(req.params.id as string, userId, userPrisma);
    res.json({ success: true, resume });
  } catch (error) {
    next(error);
  }
}

/**
 * 4. Update Resume Draft
 */
export async function updateResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const resumeId = req.params.id as string;
    const userPrisma = await getUserPrismaFromRequest(req);
    await getResumeForUser(resumeId, userId, userPrisma);

    const { title, template, resumeData } = req.body;

    const updated = await userPrisma.resume.update({
      where: { id: resumeId },
      data: {
        ...(title && { title }),
        ...(template && { template }),
        ...(resumeData !== undefined && { resumeData }),
      },
    });

    res.json({ success: true, resume: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * 5. Delete Resume
 */
export async function deleteResume(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const resumeId = req.params.id as string;
    const userPrisma = await getUserPrismaFromRequest(req);
    await getResumeForUser(resumeId, userId, userPrisma);

    await userPrisma.resume.delete({
      where: { id: resumeId },
    });

    res.json({ success: true, message: "Resume deleted successfully" });
  } catch (error) {
    next(error);
  }
}

/**
 * 6. Generate AI Summary
 */
export async function generateSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { personalInfo, education, experience, skills } = req.body;

    const summary = await aiResumeSummary(
      personalInfo ?? {},
      education ?? [],
      experience ?? [],
      skills ?? []
    );

    res.json({ success: true, summary });
  } catch (error) {
    next(error);
  }
}

/**
 * Enhance Project Description
 */
export async function enhanceProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, techStack, description } = req.body;
    const result = await aiEnhanceProject(name ?? "", techStack ?? "", description ?? "");
    res.json({ success: true, description: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Enhance Experience Description
 */
export async function enhanceExperience(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, company, description } = req.body;
    const result = await aiEnhanceExperience(role ?? "", company ?? "", description ?? "");
    res.json({ success: true, description: result });
  } catch (error) {
    next(error);
  }
}

/**
 * Optimize Entire Resume for Target Company
 */
export async function optimizeResume(req: Request, res: Response, next: NextFunction) {
  try {
    const { resumeJson, targetCompany } = req.body;
    const result = await aiOptimizeResume(resumeJson, targetCompany || "Startup");
    res.json({ success: true, resume: result });
  } catch (error) {
    next(error);
  }
}

/**
 * 7. Resume AI Chat - Understands user intent and updates resume sections
 */
export async function resumeChat(req: Request, res: Response, next: NextFunction) {
  try {
    const { resumeData, message } = req.body;
    const result = await aiResumeChat(resumeData, message);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * 7b. Resume AI Chat Streaming - uses Gemini directly for real-time streaming
 */
export async function resumeChatStream(req: Request, res: Response, next: NextFunction) {
  try {
    const { resumeData, message } = req.body;
    if (!message) throw httpError(400, "Message is required");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    if (!genAI) {
      const result = await aiResumeChat(resumeData, message);
      const text = `I've processed your request to "${message}". Here's what I updated.`;
      for (const word of text.split(" ")) {
        res.write(`data: ${JSON.stringify({ type: "chunk", text: word + " " })}\n\n`);
        if (typeof (res as any).flush === "function") (res as any).flush();
      }
      const updated = Object.keys(result).length > 0 ? result : {};
      res.write(`data: ${JSON.stringify({ type: "result", ...updated })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      if (typeof (res as any).flush === "function") (res as any).flush();
      res.end();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const prompt = `You are an AI resume assistant embedded in a resume builder. The user sent: "${message}"

Current Resume Data:
${JSON.stringify(resumeData, null, 2)}

First, explain briefly what you're doing to help the user.
Then, on the very last line, output a JSON block with ONLY the sections that changed.
Format: SUMMARY=<<<{"summary":"...","experience":[...],"projects":[...],"skills":[...]}>>>
Only include fields that actually changed. Omit unchanged fields.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContentStream(prompt);

    let fullText = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
        if (typeof (res as any).flush === "function") (res as any).flush();
      }
    }

    const jsonMatch = fullText.match(/SUMMARY=<<<(\{.*\})>>>/s);
    let updates: Record<string, any> = {};
    if (jsonMatch) {
      try {
        updates = JSON.parse(jsonMatch[1]);
      } catch (error) { console.warn("[Resume] Failed to parse streamed suggestion JSON:", error); }
    }

    res.write(`data: ${JSON.stringify({ type: "result", ...updates })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    if (typeof (res as any).flush === "function") (res as any).flush();
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Stream failed" })}\n\n`);
      if (typeof (res as any).flush === "function") (res as any).flush();
      res.end();
    }
  }
}

/**
 * 8. Export Resume as PDF (Puppeteer-based with professional templates)
 */
export async function exportResumePdf(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    const resume = await getResumeForUser(req.body.resumeId, userId, userPrisma);

    const jr = (resume.resumeData as unknown as JSONResume) ?? { basics: {} };
    const legacy = jsonResumeToLegacy(jr);

    const resumeData: ResumeData = {
      title: resume.title,
      template: resume.template || "modern",
      personalInfo: legacy.personalInfo ?? {},
      education: legacy.education ?? [],
      experience: legacy.experience ?? [],
      projects: legacy.projects ?? [],
      skills: legacy.skills ?? [],
      certifications: legacy.certifications ?? [],
      achievements: legacy.achievements ?? [],
      languages: legacy.languages ?? [],
    };

    const pdfBuffer = await generateResumePdf(resumeData);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${resume.title.replace(/\s+/g, "_")}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}

/**
 * 8. Export Resume as DOCX
 */
export async function exportResumeDocx(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);

    const userPrisma = await getUserPrismaFromRequest(req);
    const resume = await getResumeForUser(req.body.resumeId, userId, userPrisma);

    const jr = (resume.resumeData as unknown as JSONResume) ?? { basics: {} };
    const legacy = jsonResumeToLegacy(jr);

    const p = legacy.personalInfo ?? {};
    const edu = legacy.education ?? [];
    const exp = legacy.experience ?? [];
    const proj = legacy.projects ?? [];
    const skills = legacy.skills ?? [];
    const certs = legacy.certifications ?? [];
    const achievements = legacy.achievements ?? [];
    const languages = legacy.languages ?? [];

    const children: Paragraph[] = [];

    // Title Header
    const fullName = String(p.fullName || p.name || "Candidate Name");
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: fullName,
            bold: true,
            size: 32, // 16pt
          }),
        ],
      })
    );

    // Contact info (including social links)
    const contacts = [];
    if (p.email) contacts.push(p.email);
    if (p.phone) contacts.push(p.phone);
    if (p.location) contacts.push(p.location);
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: contacts.join("  |  "),
            size: 20, // 10pt
          }),
        ],
      })
    );

    // Social links
    const socialLinks = [];
    if (p.linkedin) socialLinks.push(`LinkedIn: ${p.linkedin}`);
    if (p.github) socialLinks.push(`GitHub: ${p.github}`);
    if (p.portfolio || p.website) socialLinks.push(`Portfolio: ${p.portfolio || p.website}`);
    if (socialLinks.length > 0) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: socialLinks.join("  |  "),
              size: 18,
              color: "2563eb",
            }),
          ],
        })
      );
    }
    children.push(new Paragraph({ text: "" })); // blank spacer

    // Section Header Helper
    const addSectionHeader = (titleText: string) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: titleText,
              bold: true,
              size: 24, // 12pt
              color: "1f2937",
            }),
          ],
        })
      );
    };

    // Summary Section
    if (p.summary) {
      addSectionHeader("PROFESSIONAL SUMMARY");
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: p.summary,
              size: 20,
            }),
          ],
        })
      );
      children.push(new Paragraph({ text: "" }));
    }

    // Work Experience
    if (exp.length > 0) {
      addSectionHeader("WORK EXPERIENCE");
      exp.forEach((item) => {
        const dateStr = item.startDate && item.endDate ? ` (${item.startDate} - ${item.endDate})` : "";
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${item.role} - ${item.company}${dateStr}`,
                bold: true,
                size: 20,
              }),
            ],
          })
        );
        if (item.description) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.description,
                  size: 19,
                }),
              ],
            })
          );
        }
        children.push(new Paragraph({ text: "" }));
      });
    }

    // Projects
    if (proj.length > 0) {
      addSectionHeader("PROJECTS");
      proj.forEach((item) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.name || item.title,
                bold: true,
                size: 20,
              }),
            ],
          })
        );
        if (item.techStack) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `Technologies: ${item.techStack}`,
                  italics: true,
                  size: 18,
                }),
              ],
            })
          );
        }
        if (item.description) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: item.description,
                  size: 19,
                }),
              ],
            })
          );
        }
        children.push(new Paragraph({ text: "" }));
      });
    }

    // Education
    if (edu.length > 0) {
      addSectionHeader("EDUCATION");
      edu.forEach((item) => {
        const dateStr = item.startDate && item.endDate ? ` (${item.startDate} - ${item.endDate})` : "";
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${item.degree} in ${item.fieldOfStudy || item.branch} - ${item.institution || item.school || item.college}${dateStr}`,
                bold: true,
                size: 20,
              }),
            ],
          })
        );
        if (item.grade || item.gpa) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `GPA / Grade: ${item.grade || item.gpa}`,
                  size: 19,
                }),
              ],
            })
          );
        }
        children.push(new Paragraph({ text: "" }));
      });
    }

    // Skills
    if (skills.length > 0) {
      addSectionHeader("TECHNICAL SKILLS");
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: skills.join(", "),
              size: 20,
            }),
          ],
        })
      );
      children.push(new Paragraph({ text: "" }));
    }

    // Certifications
    if (certs.length > 0) {
      addSectionHeader("CERTIFICATIONS");
      certs.forEach((c) => {
        const title = c.name || c.title || "Certification";
        const issuerStr = c.issuer ? ` - ${c.issuer}` : "";
        const dateStr = c.date ? ` (${c.date})` : "";
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${title}${issuerStr}${dateStr}`,
                size: 20,
              }),
            ],
          })
        );
      });
    }

    // Achievements
    if (achievements.length > 0) {
      addSectionHeader("ACHIEVEMENTS");
      achievements.forEach((a) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `• ${a}`,
                size: 20,
              }),
            ],
          })
        );
      });
      children.push(new Paragraph({ text: "" }));
    }

    // Languages
    if (languages.length > 0) {
      addSectionHeader("LANGUAGES");
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: languages.join(", "),
              size: 20,
            }),
          ],
        })
      );
      children.push(new Paragraph({ text: "" }));
    }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${resume.title.replace(/\s+/g, "_")}.docx"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
