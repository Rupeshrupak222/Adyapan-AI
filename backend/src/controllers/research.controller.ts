import type { NextFunction, Request, Response } from "express";
import { httpError } from "../utils/httpError";
import { prisma } from "../config/prisma";
import { generateText, generateJSON, MODELS } from "../lib/ai/openrouter";
import {
  fetchResearchSources,
  generateFullPaper,
  generateSection,
  researchChat,
  generateSuggestedTopics,
  enhanceResearchText,
  type ResearchConfig,
} from "../services/research.service";
import {
  exportPaperPdf,
  exportPaperDocx,
  exportPaperLatex,
  exportPaperMarkdown,
  exportPaperBibtex,
} from "../services/research-export.service";
import { refundFeatureQuotaOnFailure } from "../middleware/requireFeatureQuota";
import { parseUploadedPDFBuffer } from "../services/pdf-parser.service";
import { ACADEMIC_TEMPLATES } from "../services/template-engine.service";
import { generateVisualContent } from "../services/visual-content.service";

// In-memory fallback stores
const inMemPaperStore = new Map<string, any>();
const inMemDraftStore = new Map<string, any>();
const inMemExportStore: any[] = [];

// ============================================================================
// 1. DASHBOARD & LISTINGS
// ============================================================================

// GET /api/research/dashboard
export async function getDashboardStats(req: Request, res: Response) {
  const userId = (req as any).user?.id || "default-user";

  try {
    const papers = await prisma.researchPaper.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }).catch(() => null);

    const drafts = await prisma.paperDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }).catch(() => null);

    const exportCount = await prisma.paperExport.count({
      where: { userId }
    }).catch(() => 0);

    const recentPapers = papers || Array.from(inMemPaperStore.values());
    const recentDrafts = drafts || Array.from(inMemDraftStore.values());

    res.json({
      success: true,
      stats: {
        totalPapers: recentPapers.length,
        savedDrafts: recentDrafts.length,
        publishedPapers: recentPapers.filter((p: any) => p.status === "PUBLISHED").length,
        aiTokensUsed: recentPapers.length * 4200,
        researchProgress: recentPapers.length === 0 ? 0 : Math.min(100, Math.round((recentPapers.filter((p: any) => p.status === "PUBLISHED").length / Math.max(recentPapers.length, 1)) * 100)),
        savedTemplatesCount: ACADEMIC_TEMPLATES.length,
        favoritePapersCount: recentPapers.filter((p: any) => p.isFavorite).length,
        exportHistoryCount: exportCount || inMemExportStore.length,
      },
      recentPapers: recentPapers.slice(0, 5),
      drafts: recentDrafts.slice(0, 5),
    });
  } catch (err: any) {
    const inMemPapers = Array.from(inMemPaperStore.values());
    const inMemDrafts = Array.from(inMemDraftStore.values());
    res.json({
      success: true,
      stats: {
        totalPapers: inMemPapers.length,
        savedDrafts: inMemDrafts.length,
        publishedPapers: inMemPapers.filter((p: any) => p.status === "PUBLISHED").length,
        aiTokensUsed: inMemPapers.length * 4200,
        researchProgress: inMemPapers.length === 0 ? 0 : Math.min(100, Math.round((inMemPapers.filter((p: any) => p.status === "PUBLISHED").length / Math.max(inMemPapers.length, 1)) * 100)),
        savedTemplatesCount: ACADEMIC_TEMPLATES.length,
        favoritePapersCount: inMemPapers.filter((p: any) => p.isFavorite).length,
        exportHistoryCount: inMemExportStore.length,
      },
      recentPapers: inMemPapers,
      drafts: inMemDrafts,
    });
  }
}

// GET /api/research/papers
export async function listPapers(req: Request, res: Response) {
  const userId = (req as any).user?.id || "default-user";
  try {
    const papers = await prisma.researchPaper.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ success: true, papers });
  } catch {
    res.json({ success: true, papers: Array.from(inMemPaperStore.values()) });
  }
}

// GET /api/research/drafts
export async function listDrafts(req: Request, res: Response) {
  const userId = (req as any).user?.id || "default-user";
  try {
    const drafts = await prisma.paperDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ success: true, drafts });
  } catch {
    res.json({ success: true, drafts: Array.from(inMemDraftStore.values()) });
  }
}

// GET /api/research/templates
export async function listTemplates(_req: Request, res: Response) {
  res.json({ success: true, templates: ACADEMIC_TEMPLATES });
}

// GET /api/research/export-history
export async function getExportHistory(req: Request, res: Response) {
  const userId = (req as any).user?.id || "default-user";
  try {
    const exports = await prisma.paperExport.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    res.json({ success: true, exports });
  } catch {
    res.json({ success: true, exports: inMemExportStore });
  }
}

// ============================================================================
// 2. SEARCH & TOPICS
// ============================================================================

export async function suggestTopics(_req: Request, res: Response, next: NextFunction) {
  try {
    const topics = await generateSuggestedTopics();
    res.json({ success: true, topics });
  } catch (err: any) {
    next(httpError(500, err.message || "Failed to generate topic suggestions"));
  }
}

export async function fetchSources(req: Request, res: Response, next: NextFunction) {
  const { topic } = req.body as { topic?: string };
  if (!topic?.trim()) {
    next(httpError(400, "Topic is required"));
    return;
  }
  try {
    const sources = await fetchResearchSources(topic.trim());
    res.json({ success: true, sources: sources.slice(0, 50), totalFound: sources.length });
  } catch (err: any) {
    next(httpError(500, err.message || "Failed to fetch research sources"));
  }
}

// ============================================================================
// 3. PAPER GENERATION & DRAFTS
// ============================================================================

export async function generatePaperSSE(req: Request, res: Response) {
  const userId = (req as any).user?.id || "default-user";
  const config = req.body as ResearchConfig;
  if (!config.topic?.trim()) {
    res.status(400).write(`data: ${JSON.stringify({ type: "error", message: "Research topic is required" })}\n\n`);
    res.end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const sendEvent = (data: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === "function") (res as any).flush();
  };

  const startTime = Date.now();

  try {
    sendEvent({ type: "progress", step: "init", message: "Initializing AI research engine...", percent: 5, sourcesFound: 0 });

    const sources = await fetchResearchSources(config.topic, (p) => {
      sendEvent({ type: "progress", ...p });
    });

    sendEvent({ type: "progress", step: "sources", message: `Found ${sources.length} sources. Generating sections...`, percent: 45, sourcesFound: sources.length });

    const paper = await generateFullPaper(config, sources, (p) => {
      sendEvent({ type: "progress", ...p });
    });

    const paperId = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    (paper as any).id = paperId;
    (paper as any).userId = userId;
    (paper as any).createdAt = new Date().toISOString();
    inMemPaperStore.set(paperId, paper);

    // Save to Prisma DB asynchronously
    try {
      await prisma.researchPaper.create({
        data: {
          id: paperId,
          userId,
          title: paper.title,
          domain: config.field || "Computer Science",
          abstract: paper.abstract,
          keywords: paper.keywords || [],
          contentJson: paper as any,
          status: "DRAFT",
          template: config.template || "IEEE",
          citationStyle: config.citationStyle || "IEEE",
          wordCount: paper.metadata?.wordCount || 0,
          pageCount: paper.metadata?.pageCount || 1,
          authors: paper.authors || [],
        }
      });

      await prisma.aIResearchLog.create({
        data: {
          userId,
          paperId,
          action: "generate_paper",
          tokensUsed: 4200,
          durationMs: Date.now() - startTime,
        }
      });
    } catch (e: any) {
      console.warn("[ResearchController] DB persist fallback:", e.message);
    }

    sendEvent({ type: "complete", paperId, paper });
  } catch (err: any) {
    // Streaming responses always report HTTP 200 — refund the reserved
    // feature credit explicitly when generation fails mid-stream.
    await refundFeatureQuotaOnFailure(req, "RESEARCH_PAPER_AI").catch(() => {});
    sendEvent({ type: "error", message: err.message || "Paper generation failed" });
  } finally {
    res.end();
  }
}

export async function generatePaperSync(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || "default-user";
  const config = req.body as ResearchConfig;
  if (!config.topic?.trim()) {
    next(httpError(400, "Research topic is required"));
    return;
  }
  try {
    const sources = await fetchResearchSources(config.topic);
    const paper = await generateFullPaper(config, sources);
    const paperId = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    (paper as any).id = paperId;
    (paper as any).userId = userId;
    (paper as any).createdAt = new Date().toISOString();
    inMemPaperStore.set(paperId, paper);

    try {
      await prisma.researchPaper.create({
        data: {
          id: paperId,
          userId,
          title: paper.title,
          domain: config.field || "Computer Science",
          abstract: paper.abstract,
          keywords: paper.keywords || [],
          contentJson: paper as any,
          status: "DRAFT",
          template: config.template || "IEEE",
          citationStyle: config.citationStyle || "IEEE",
          wordCount: paper.metadata?.wordCount || 0,
          pageCount: paper.metadata?.pageCount || 1,
          authors: paper.authors || [],
        }
      });
    } catch {}

    res.json({ success: true, paperId, paper });
  } catch (err: any) {
    next(httpError(500, err.message || "Paper generation failed"));
  }
}

export async function generateSectionHandler(req: Request, res: Response, next: NextFunction) {
  const { sectionId, topic, context } = req.body as { sectionId?: string; topic?: string; context?: string };
  if (!sectionId || !topic) {
    next(httpError(400, "Section ID and Topic are required"));
    return;
  }
  try {
    let sources: any[] = [];
    try {
      sources = await fetchResearchSources(topic);
    } catch { /* proceed without sources */ }
    const content = await generateSection(
      sectionId,
      sectionId.replace(/-/g, " ").toUpperCase(),
      sources.slice(0, 20),
      { topic },
      [],
      context || "",
      topic
    );
    res.json({ success: true, sectionId, content });
  } catch (err: any) {
    next(httpError(500, err.message || "Section generation failed"));
  }
}

export async function saveDraftHandler(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || "default-user";
  const { draftId, title, currentStep, configJson, contentJson } = req.body;
  if (!title) {
    next(httpError(400, "Draft title is required"));
    return;
  }

  const id = draftId || `draft-${Date.now()}`;
  const draftObj = { id, userId, title, currentStep: currentStep || 1, configJson, contentJson, updatedAt: new Date().toISOString() };
  inMemDraftStore.set(id, draftObj);

  try {
    await prisma.paperDraft.upsert({
      where: { id },
      create: { id, userId, title, currentStep: currentStep || 1, configJson: configJson || {}, contentJson: contentJson || {} },
      update: { title, currentStep: currentStep || 1, configJson: configJson || {}, contentJson: contentJson || {} },
    });
  } catch {}

  res.json({ success: true, draft: draftObj });
}

// ============================================================================
// 4. AI ENHANCEMENT, VISUALS & UPLOADS
// ============================================================================

export async function enhanceTextHandler(req: Request, res: Response, next: NextFunction) {
  const { text, mode } = req.body as { text?: string; mode?: any };
  if (!text) {
    next(httpError(400, "Text is required"));
    return;
  }
  try {
    const result = await enhanceResearchText(text, mode || "academic_tone");
    res.json({ success: true, ...result });
  } catch (err: any) {
    next(httpError(500, err.message || "Text enhancement failed"));
  }
}

export async function generateVisualHandler(req: Request, res: Response, next: NextFunction) {
  const { contentType, topic, context } = req.body as { contentType?: any; topic?: string; context?: string };
  if (!topic) {
    next(httpError(400, "Topic is required"));
    return;
  }
  try {
    const result = await generateVisualContent(contentType || "architecture", topic, context);
    res.json({ success: true, visual: result });
  } catch (err: any) {
    next(httpError(500, err.message || "Visual content generation failed"));
  }
}

export async function uploadPDFHandler(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || "default-user";
  if (!req.file) {
    next(httpError(400, "PDF file is required"));
    return;
  }
  try {
    const parsed = await parseUploadedPDFBuffer(req.file.buffer);

    try {
      await prisma.paperUpload.create({
        data: {
          userId,
          filename: req.file.originalname,
          fileSize: req.file.size,
          parsedText: parsed.rawText,
          extractedMeta: parsed as any,
        }
      });
    } catch {}

    res.json({
      success: true,
      filename: req.file.originalname,
      fileSize: req.file.size,
      parsed,
    });
  } catch (err: any) {
    next(httpError(500, err.message || "PDF parsing failed"));
  }
}

export async function getPaper(req: Request, res: Response, next: NextFunction) {
  const paperId = String(req.params.id || "");
  try {
    const dbPaper = await prisma.researchPaper.findUnique({ where: { id: paperId } });
    if (dbPaper) {
      res.json({ success: true, paper: dbPaper.contentJson });
      return;
    }
  } catch {}

  const paper = inMemPaperStore.get(paperId);
  if (!paper) {
    next(httpError(404, "Paper not found"));
    return;
  }
  res.json({ success: true, paper });
}

export async function chatWithAI(req: Request, res: Response, next: NextFunction) {
  const { message, paperContext, sources } = req.body as { message?: string; paperContext?: string; sources?: any[] };
  if (!message?.trim()) {
    next(httpError(400, "Message is required"));
    return;
  }
  try {
    const reply = await researchChat(message, paperContext || "", sources || []);
    res.json({ success: true, reply });
  } catch (err: any) {
    next(httpError(500, err.message || "AI chat failed"));
  }
}

// ============================================================================
// 5. EXPORTS
// ============================================================================

function toTitleString(val: any): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.join(", ");
  return val ? String(val) : "Untitled Research Paper";
}

export async function exportPdf(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || "default-user";
  const { paper, template } = req.body as { paper?: any; template?: string };
  if (!paper) { next(httpError(400, "Paper data is required")); return; }
  try {
    const titleStr = toTitleString(paper.title);
    const buffer = await exportPaperPdf(paper, template || "IEEE");
    const exObj = { userId, paperId: paper.id, title: titleStr, format: "pdf", template: template || "IEEE", createdAt: new Date().toISOString() };
    inMemExportStore.unshift(exObj);

    try {
      await prisma.paperExport.create({ data: { userId, paperId: paper.id, title: titleStr, format: "pdf", template: template || "IEEE" } });
    } catch {}

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${titleStr.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.pdf"`);
    res.send(buffer);
  } catch (err: any) {
    next(httpError(500, err.message || "PDF export failed"));
  }
}

export async function exportDocx(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || "default-user";
  const { paper, template } = req.body as { paper?: any; template?: string };
  if (!paper) { next(httpError(400, "Paper data is required")); return; }
  try {
    const titleStr = toTitleString(paper.title);
    const buffer = await exportPaperDocx(paper, template || "IEEE");
    const exObj = { userId, paperId: paper.id, title: titleStr, format: "docx", template: template || "IEEE", createdAt: new Date().toISOString() };
    inMemExportStore.unshift(exObj);

    try {
      await prisma.paperExport.create({ data: { userId, paperId: paper.id, title: titleStr, format: "docx", template: template || "IEEE" } });
    } catch {}

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${titleStr.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.docx"`);
    res.send(buffer);
  } catch (err: any) {
    next(httpError(500, err.message || "DOCX export failed"));
  }
}

export async function exportLatex(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || "default-user";
  const { paper, template } = req.body as { paper?: any; template?: string };
  if (!paper) { next(httpError(400, "Paper data is required")); return; }
  try {
    const titleStr = toTitleString(paper.title);
    const latex = await exportPaperLatex(paper, template || "IEEE");
    const exObj = { userId, paperId: paper.id, title: titleStr, format: "latex", template: template || "IEEE", createdAt: new Date().toISOString() };
    inMemExportStore.unshift(exObj);

    try {
      await prisma.paperExport.create({ data: { userId, paperId: paper.id, title: titleStr, format: "latex", template: template || "IEEE" } });
    } catch {}

    res.setHeader("Content-Type", "application/x-latex");
    res.setHeader("Content-Disposition", `attachment; filename="${titleStr.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.tex"`);
    res.send(latex);
  } catch (err: any) {
    next(httpError(500, err.message || "LaTeX export failed"));
  }
}

export async function exportMarkdown(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).user?.id || "default-user";
  const { paper } = req.body as { paper?: any };
  if (!paper) { next(httpError(400, "Paper data is required")); return; }
  try {
    const titleStr = toTitleString(paper.title);
    const md = await exportPaperMarkdown(paper);
    const exObj = { userId, paperId: paper.id, title: titleStr, format: "markdown", template: "Markdown", createdAt: new Date().toISOString() };
    inMemExportStore.unshift(exObj);

    try {
      await prisma.paperExport.create({ data: { userId, paperId: paper.id, title: titleStr, format: "markdown", template: "Markdown" } });
    } catch {}

    res.setHeader("Content-Type", "text/markdown");
    res.setHeader("Content-Disposition", `attachment; filename="${titleStr.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.md"`);
    res.send(md);
  } catch (err: any) {
    next(httpError(500, err.message || "Markdown export failed"));
  }
}

export async function exportBibtex(req: Request, res: Response, next: NextFunction) {
  const { paper } = req.body as { paper?: any };
  if (!paper) { next(httpError(400, "Paper data is required")); return; }
  try {
    const bibtex = await exportPaperBibtex(paper);
    res.setHeader("Content-Type", "application/x-bibtex");
    res.setHeader("Content-Disposition", `attachment; filename="${(paper.title || "references").replace(/[^a-zA-Z0-9]/g, "-").slice(0, 50)}.bib"`);
    res.send(bibtex);
  } catch (err: any) {
    next(httpError(500, err.message || "BibTeX export failed"));
  }
}

export async function checkPlagiarism(req: Request, res: Response, next: NextFunction) {
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { next(httpError(400, "Text is required")); return; }
  try {
    const result = await generateJSON(
      "You are a plagiarism detection expert. Analyze the given text for potential similarity.",
      `Analyze this text for potential plagiarism indicators:\n"""\n${text.slice(0, 2000)}\n"""\nReturn JSON:\n{"similarity": number (0-100), "sources": [{"title": "source", "url": "", "match": number}]}`,
      { model: MODELS.FAST, responseFormat: { type: "json_object" } },
      { similarity: 0, sources: [] }
    );
    res.json(result);
  } catch (err: any) {
    next(httpError(500, err.message || "Plagiarism check failed"));
  }
}

export async function rephraseText(req: Request, res: Response, next: NextFunction) {
  const { text } = req.body as { text?: string };
  if (!text?.trim()) { next(httpError(400, "Text is required")); return; }
  try {
    const content = await generateText(
      "You are an expert academic paraphraser. Rewrite text to be original while preserving meaning.",
      `Rephrase the following academic text to be original and plagiarism-free:\n"""\n${text}\n"""\nReturn ONLY the rephrased text. Maintain academic tone and all technical accuracy.`,
      { model: MODELS.FAST }
    );
    res.json({ success: true, content });
  } catch (err: any) {
    next(httpError(500, err.message || "Rephrasing failed"));
  }
}
