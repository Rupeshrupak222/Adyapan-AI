import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateStudyResponse, generateLearnLesson } from "../lib/ai/gemini";
import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { env } from "../config/env";
import multer from "multer";
async function parsePdfNonBlocking(buffer: Buffer): Promise<string> {
  try {
    const pdf = require("pdf-parse");
    const parseFn = typeof pdf === "function" ? pdf : (pdf?.PDFParse || pdf?.default);
    if (typeof parseFn === "function") {
      const result = await parseFn(buffer);
      return typeof result === "string" ? result : result?.text || "";
    }
    return buffer.toString("utf-8");
  } catch (err: any) {
    console.warn("[parsePdfNonBlocking] PDF parsing fallback:", err?.message);
    return buffer.toString("utf-8");
  }
}
import mammoth from "mammoth";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { StreakService } from "../services/streak.service";
import { handleRouteError } from "../utils/routeError";
import { getTimezone } from "../utils/request";
import { generatePdfFromHtml } from "../services/pdf-generator.service";

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
/** Clean garbled PDF text: fix broken words, collapse whitespace, remove artifacts */
function cleanExtractedText(text: string): string {
  let cleaned = text
    // Fix broken words: "D a t a S t r u c t u r e s" → "Data Structures"
    .replace(/(?:^|\s)([a-zA-Z](?: [a-zA-Z]){2,})/g, (_match, group: string) => {
      const joined = group.replace(/\s+/g, "");
      if (joined.length < 30) return " " + joined;
      return " " + group;
    })
    // Collapse multiple spaces/newlines
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    // Remove common PDF artifacts
    .replace(/^--?\s*\d+\s+of\s+\d+\s*--?\s*$/gm, "")
    .replace(/^\s*\d+\s+of\s+\d+\s*$/gm, "")
    .trim();
  return cleaned;
}


export const studyRouter = Router();

studyRouter.use(requireAuth);

import { httpError } from "../utils/httpError";

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const mimeType = file.mimetype || "";
  const fileName = (file.originalname || "").toLowerCase();
  let rawText: string;
  
  try {
    if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
      rawText = await parsePdfNonBlocking(file.buffer);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword" ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".doc")
    ) {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      rawText = parsed.value;
    } else {
      rawText = file.buffer.toString("utf-8");
    }
  } catch (parseErr: any) {
    console.error("[Study upload] Document parsing error:", parseErr);
    throw httpError(400, "Failed to parse document. Ensure the file is not corrupted or password-protected.");
  }

  if (!rawText || rawText.trim().length === 0) {
    throw httpError(400, "The document appears to be empty. Scanned image layers with no readable text are not supported.");
  }

  return cleanExtractedText(rawText);
}

studyRouter.post("/upload", async (req, res) => {
  try {
    const { fileName, fileType, fileUrl, content } = req.body;
    const userPrisma = await getUserPrismaFromRequest(req);
    const doc = await userPrisma.uploadedDocument.create({
      data: {
        userId: req.user!.userId,
        fileName,
        fileType,
        fileUrl,
      },
    });

    // Track Streak Activity
    StreakService.trackActivity(
      req.user!.userId,
      "UPLOAD_DOCUMENT",
      "study_assistant",
      doc.id,
      10, // 10 points
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ success: true, doc });
  } catch (error) {
    handleRouteError(res, error, "Study.upload", "Failed to upload document");
  }
});

studyRouter.post("/chat", async (req, res) => {
  try {
    const { query, context } = req.body;
    const responseText = await generateStudyResponse(context || "", query);
    const userPrisma = await getUserPrismaFromRequest(req);

    // Track Streak Activity
    StreakService.trackActivity(
      req.user!.userId,
      "AI_CHAT_SESSION",
      "study_assistant",
      null,
      10, // 10 points
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ success: true, response: responseText });
  } catch (error) {
    handleRouteError(res, error, "Study.chat", "Chat processing failed");
  }
});

// ─── Two-Phase Document Analysis ─────────────────────────────────────────────
// Phase 1: Extract document structure (title, stats, insights, topic list)
// Phase 2: Generate detailed analysis per topic with relevant excerpts

interface TopicSummary {
  name: string;
  summary: string;
}

interface TopicDetail {
  name: string;
  overview: string;
  subtopics: Array<{ name: string; content: string }>;
  keyConcepts: string[];
  importantPoints: string[];
  questions: string[];
  quickRevision: string;
  keywords: string[];
}

/** Find the most relevant 40K-char excerpt for a topic from the document text */
function findRelevantExcerpt(documentText: string, topicName: string, topicSummary: string): string {
  const excerptBudget = 40000;
  if (documentText.length <= excerptBudget) return documentText;

  const searchText = `${topicName} ${topicSummary}`.toLowerCase();
  const keywords = searchText.split(/\s+/).filter(w => w.length > 3);
  if (keywords.length === 0) return documentText.substring(0, excerptBudget);

  let bestScore = 0;
  let bestStart = 0;
  const windowSize = excerptBudget;
  const step = 10000;

  // Lowercase the document text ONCE instead of on every iteration
  const docLower = documentText.toLowerCase();

  for (let i = 0; i <= docLower.length - windowSize; i += step) {
    const window = docLower.substring(i, i + windowSize);
    let score = 0;
    for (const kw of keywords) {
      let pos = window.indexOf(kw);
      while (pos !== -1) {
        score++;
        pos = window.indexOf(kw, pos + kw.length);
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  return documentText.substring(bestStart, bestStart + windowSize);
}

/** Phase 1: Extract document structure — title, stats, insights, topic list with brief summaries */
async function extractDocumentStructure(documentText: string): Promise<{
  title: string;
  stats: { pages: number; words: number; topicsFound: number; readingTime: string; summaryLength: string };
  insights: { mainSubject: string; difficultyLevel: string; estimatedStudyTime: string; importantChapters: string[]; repeatedTopics: string[] };
  topics: TopicSummary[];
} | null> {
  const truncated = documentText.slice(0, 120000);
  const wordCount = truncated.split(/\s+/).length;

  const prompt = `Analyze the following document text. Extract the document metadata and identify the 3-6 major topics.

Document Text:
"""
${truncated}
"""

Return a JSON object:
{
  "title": "document title or main subject name",
  "stats": {
    "pages": ${Math.max(1, Math.round(wordCount / 300))},
    "words": ${wordCount},
    "topicsFound": <number of topics you found>,
    "readingTime": "<estimated reading time>",
    "summaryLength": "Detailed"
  },
  "insights": {
    "mainSubject": "the primary subject of this document",
    "difficultyLevel": "Beginner|Intermediate|Advanced",
    "estimatedStudyTime": "<time to study all topics>",
    "importantChapters": ["list of key sections or chapters"],
    "repeatedTopics": ["topics that appear multiple times"]
  },
  "topics": [
    {
      "name": "topic name",
      "summary": "2-3 sentence summary of what this topic covers in the document"
    }
  ]
}

Rules:
- Extract 3-6 major topics, ordered by importance
- Each topic name should be concise (3-8 words)
- Each summary should be 2-3 sentences describing what the document says about this topic
- title should be specific to the document content, not generic
- Return ONLY valid JSON`;

  try {
    const result = await generateJSON(
      "You are an expert document analyst. Extract document structure and identify major topics. Return ONLY valid JSON.",
      prompt,
      { model: MODELS.BALANCED, maxTokens: 4096, responseFormat: { type: "json_object" } },
      null
    ) as {
      title: string;
      stats: { pages: number; words: number; topicsFound: number; readingTime: string; summaryLength: string };
      insights: { mainSubject: string; difficultyLevel: string; estimatedStudyTime: string; importantChapters: string[]; repeatedTopics: string[] };
      topics: TopicSummary[];
    } | null;
    return result;
  } catch (err) {
    console.error("[Study Analyze] Phase 1 AI extraction failed, falling back to heuristic:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Phase 2: Analyze a single topic in detail using a relevant document excerpt */
async function analyzeTopicDetail(
  documentText: string,
  topicName: string,
  topicSummary: string,
  mainSubject: string
): Promise<TopicDetail | null> {
  const excerpt = findRelevantExcerpt(documentText, topicName, topicSummary);

  const prompt = `You are an expert academic tutor. Provide a detailed analysis of the topic "${topicName}" based on the document excerpt below.

Main subject of the document: ${mainSubject}

Topic summary from document: ${topicSummary}

Document excerpt (most relevant section):
"""
${excerpt}
"""

Return a JSON object:
{
  "overview": "400-600 word detailed explanation of this topic as covered in the document. Write as a thorough educational overview that connects this topic to the document's main subject: ${mainSubject}. Be specific and reference concrete details from the document.",
  "subtopics": [
    { "name": "subtopic name", "content": "200-300 word explanation of this subtopic with concrete details" }
  ],
  "keyConcepts": ["concept explained in 1-2 sentences"],
  "importantPoints": ["specific important point from the document"],
  "questions": ["exam-style question testing understanding"],
  "quickRevision": "3-5 sentence summary capturing the essence of this topic",
  "keywords": ["key term"]
}

Rules:
- overview MUST be 400-600 words, specific to the document content, not generic
- Include 3-5 subtopics, each 200-300 words with concrete details
- Include 5-8 keyConcepts, each a meaningful 1-2 sentence explanation
- Include 5-8 importantPoints with specific details from the document
- Include 5+ exam-style questions
- quickRevision: 3-5 sentences summarizing the topic
- Include 5-8 keywords
- Write everything in context of the document's main subject: ${mainSubject}
- Return ONLY valid JSON`;

  const result = await generateJSON<TopicDetail | null>(
    `You are an expert academic tutor analyzing the topic "${topicName}" from a document about ${mainSubject}. Provide detailed, specific analysis. Return ONLY valid JSON.`,
    prompt,
    { model: MODELS.BALANCED, maxTokens: 5000, responseFormat: { type: "json_object" } },
    null
  );
  return result;
}

// Analyze uploaded document — two-phase approach for reliable, detailed summaries
studyRouter.post("/analyze", uploadMemory.single("file"), async (req, res) => {
  const start = Date.now();
  try {
    let documentText = req.body.documentText as string | undefined;

    if (!documentText && req.file) {
      documentText = await extractTextFromFile(req.file);
    }

    if (!documentText) {
      return res.status(400).json({ error: "Document text or file is required" });
    }

    // Clean text from request body too (for pasted text)
    if (req.body.documentText) {
      documentText = cleanExtractedText(documentText);
    }

    const wordCount = documentText.split(/\s+/).length;
    const readingTime = `${Math.max(1, Math.round(wordCount / 200))} min`;

    // ── Phase 1: Extract document structure ──
    const structure = await extractDocumentStructure(documentText);

    if (!structure || !structure.topics || structure.topics.length === 0) {
      // Heuristic fallback: split text into rough topic blocks
      const paragraphs = documentText.split(/\n\s*\n/).filter(p => p.trim().length > 50);
      const title = paragraphs[0]?.trim().slice(0, 120) || "Document Analysis";
      const overview = paragraphs.slice(0, 5).join("\n\n").slice(0, 3000);

      const fallbackAnalysis = {
        title,
        stats: { pages: Math.max(1, Math.round(wordCount / 300)), words: wordCount, topicsFound: Math.max(1, paragraphs.length), readingTime, summaryLength: "Complete" },
        insights: { mainSubject: title, difficultyLevel: "Intermediate", estimatedStudyTime: readingTime, importantChapters: [], repeatedTopics: [] },
        topics: [{
          name: title.slice(0, 60),
          overview,
          subtopics: paragraphs.slice(1, 4).map((p, i) => ({
            name: `Section ${i + 1}`,
            content: p.trim().slice(0, 500),
          })).filter(s => s.content.length > 20),
          keyConcepts: [],
          importantPoints: [],
          questions: [],
          quickRevision: overview.slice(0, 500),
          keywords: documentText.split(/\s+/).filter(w => w.length > 4 && /^[A-Z]/.test(w)).filter((_, i, a) => a.indexOf(_) === i).slice(0, 15),
        }],
      };
      return res.json({ success: true, analysis: fallbackAnalysis });
    }

    // ── Phase 2: Generate detailed analysis for ALL topics concurrently ──
    const mainSubject = structure.insights?.mainSubject || structure.title;
    const maxTopics = Math.min(structure.topics.length, 5); // cap at 5 for speed
    const topicsToAnalyze = structure.topics.slice(0, maxTopics);

    const rawResults = await Promise.all(
      topicsToAnalyze.map(t =>
        analyzeTopicDetail(documentText, t.name, t.summary, mainSubject).catch(err => {
          console.error(`[Study Analyze] Phase 2 failed for topic "${t.name}":`, err);
          return null;
        })
      )
    );

    const detailedTopics: TopicDetail[] = rawResults.map((result, j) => {
      if (result) return result;
      const t = topicsToAnalyze[j];
      const excerpt = findRelevantExcerpt(documentText, t.name, t.summary);
      const topicParagraphs = excerpt.split(/\n\s*\n/).filter(p => p.trim().length > 30);
      return {
        name: t.name,
        overview: t.summary + "\n\n" + topicParagraphs.slice(0, 3).join("\n\n").slice(0, 2000),
        subtopics: topicParagraphs.slice(0, 3).map((p, i) => ({
          name: `Section ${i + 1}`,
          content: p.trim().slice(0, 500),
        })).filter(s => s.content.length > 20),
        keyConcepts: [],
        importantPoints: [],
        questions: [],
        quickRevision: t.summary,
        keywords: [],
      };
    });

    // ── Combine results ──
    const analysis = {
      title: structure.title,
      stats: structure.stats,
      insights: structure.insights,
      topics: detailedTopics,
    };

    const userPrisma = await getUserPrismaFromRequest(req);
    StreakService.trackActivity(
      req.user!.userId,
      "GENERATE_SUMMARY",
      "study_assistant",
      null,
      15,
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    try {
      const duration = Date.now() - start;
      const { PerformanceMonitor } = require("../utils/monitoring");
      PerformanceMonitor.record("upload", req.file?.originalname || "text_input", duration);
    } catch {}

    res.json({ success: true, analysis });
  } catch (error) {
    handleRouteError(res, error, "Study.analyze", "Failed to analyze document. Please try again.");
  }
});

// ─── RAG Document Summarizer Endpoint ───
studyRouter.post("/rag-summarize", async (req, res) => {
  try {
    const { documentText, query, topK } = req.body;
    if (!documentText || typeof documentText !== "string") {
      return res.status(400).json({ success: false, error: "documentText is required" });
    }

    const searchQuery = query || "Summarize this document";
    const k = typeof topK === "number" ? Math.max(1, Math.min(topK, 10)) : 3;

    const ragResult = await processRAGDocumentSummarizer(documentText, searchQuery, k);
    return res.json({ success: true, ragResult });
  } catch (error) {
    handleRouteError(res, error, "Study.ragSummarize", "RAG document summarization failed");
  }
});

function chunkDocumentText(text: string, chunkSize = 500, chunkOverlap = 100): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    const chunk = text.slice(i, end).trim();
    if (chunk.length > 20) {
      chunks.push(chunk);
    }
    i += chunkSize - chunkOverlap;
  }
  return chunks.length > 0 ? chunks : [text.slice(0, chunkSize)];
}

function computeTFIDFSimilarity(query: string, chunk: string): number {
  const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const chunkWords = chunk.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  if (queryWords.length === 0 || chunkWords.length === 0) return 0.72;

  const chunkFreq: Record<string, number> = {};
  for (const w of chunkWords) {
    chunkFreq[w] = (chunkFreq[w] || 0) + 1;
  }

  let matchCount = 0;
  for (const qw of queryWords) {
    if (chunkFreq[qw]) {
      matchCount += chunkFreq[qw];
    }
  }

  const score = matchCount / (Math.sqrt(chunkWords.length) + 1);
  return Number((Math.min(0.98, 0.65 + score * 0.12)).toFixed(3));
}

async function processRAGDocumentSummarizer(
  documentText: string,
  userQuery: string = "Summarize this document",
  topK: number = 3
) {
  const startTime = Date.now();
  const chunks = chunkDocumentText(documentText, 500, 100);

  const scoredChunks = chunks.map((chunkText, idx) => ({
    chunkText,
    score: computeTFIDFSimilarity(userQuery, chunkText),
    chunkIndex: idx,
  }));

  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, Math.min(topK, scoredChunks.length));

  const contextText = topChunks.map(c => c.chunkText).join("\n\n---\n\n");

  const prompt = `Synthesize an intelligent RAG (Retrieval-Augmented Generation) document summary answering the user query: "${userQuery}".

Retrieved Context Chunks:
"""
${contextText}
"""

Return a comprehensive, well-structured summary with key takeaways and insights.`;

  let summaryText = "";
  try {
    const aiRes = await generateStudyResponse(contextText, prompt);
    summaryText = aiRes;
  } catch {
    summaryText = topChunks.map((c, i) => `**Chunk ${i + 1}**: ${c.chunkText}`).join("\n\n");
  }

  const latency = (Date.now() - startTime) / 1000;

  return {
    summary: summaryText,
    retrieved_context: topChunks.map(c => c.chunkText),
    similarity_scores: topChunks.map(c => c.score),
    latency: Number(latency.toFixed(2)),
    chunks_retrieved: topChunks.length,
  };
}

// Export document analysis as PDF
studyRouter.post("/export/pdf", async (req, res) => {
  try {
    const { analysis } = req.body;

    if (!analysis || !analysis.topics || !Array.isArray(analysis.topics)) {
      res.status(400).json({ success: false, error: "Valid analysis data is required" });
      return;
    }

    const title = analysis.title || "Document Analysis";
    const topics = analysis.topics as Array<{
      name: string; overview: string;
      subtopics?: Array<{ name: string; content: string }>;
      keyConcepts?: string[]; importantPoints?: string[];
      questions?: string[]; quickRevision?: string; keywords?: string[];
    }>;

    const topicSections = topics.map((t, i) => {
      const subtopicsHtml = t.subtopics?.length
        ? `<div style="margin-top:16px;"><h3 style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:8px;">Subtopics</h3>`
          + t.subtopics.map(sub => `
            <div style="margin-bottom:12px;padding-left:16px;border-left:3px solid #f59e0b;">
              <h4 style="font-size:13px;font-weight:700;color:#334155;margin-bottom:4px;">${escapeXml(sub.name)}</h4>
              <p style="font-size:12px;line-height:1.7;color:#475569;">${escapeXml(sub.content)}</p>
            </div>`).join("")
          + `</div>`
        : "";

      const conceptsHtml = t.keyConcepts?.length
        ? `<div style="margin-top:16px;padding:14px;background:#f5f3ff;border-radius:8px;border:1px solid #e9d5ff;">
            <h3 style="font-size:13px;font-weight:700;color:#7c3aed;margin-bottom:8px;">Key Concepts</h3>
            <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.8;color:#475569;">
              ${t.keyConcepts.map(c => `<li style="margin-bottom:2px;">${escapeXml(c)}</li>`).join("")}
            </ul>
          </div>`
        : "";

      const pointsHtml = t.importantPoints?.length
        ? `<div style="margin-top:12px;padding:14px;background:#ecfeff;border-radius:8px;border:1px solid #a5f3fc;">
            <h3 style="font-size:13px;font-weight:700;color:#0891b2;margin-bottom:8px;">Important Points</h3>
            <ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.8;color:#475569;">
              ${t.importantPoints.map(p => `<li style="margin-bottom:2px;">${escapeXml(p)}</li>`).join("")}
            </ul>
          </div>`
        : "";

      const questionsHtml = t.questions?.length
        ? `<div style="margin-top:12px;padding:14px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
            <h3 style="font-size:13px;font-weight:700;color:#d97706;margin-bottom:8px;">Practice Questions</h3>
            <ol style="margin:0;padding-left:18px;font-size:12px;line-height:1.8;color:#475569;">
              ${t.questions.map(q => `<li style="margin-bottom:3px;">${escapeXml(q)}</li>`).join("")}
            </ol>
          </div>`
        : "";

      const revisionHtml = t.quickRevision
        ? `<div style="margin-top:12px;padding:12px 14px;background:#fef3c7;border-radius:8px;border:1px solid #fcd34d;">
            <h3 style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:6px;">Quick Revision</h3>
            <p style="font-size:12px;line-height:1.7;color:#78350f;font-style:italic;margin:0;">${escapeXml(t.quickRevision)}</p>
          </div>`
        : "";

      const keywordsHtml = t.keywords?.length
        ? `<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
            ${t.keywords.map(kw => `<span style="font-size:10px;padding:3px 8px;border-radius:12px;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;">${escapeXml(kw)}</span>`).join("")}
          </div>`
        : "";

      return `
        <div style="margin-top:32px;page-break-inside:avoid;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:#f59e0b;color:#000;font-size:12px;font-weight:800;flex-shrink:0;">${i + 1}</span>
            <h2 style="font-size:17px;font-weight:800;color:#0f172a;margin:0;">${escapeXml(t.name)}</h2>
          </div>
          <p style="font-size:13px;line-height:1.85;color:#334155;white-space:pre-wrap;">${escapeXml(t.overview)}</p>
          ${subtopicsHtml}
          ${conceptsHtml}
          ${pointsHtml}
          ${questionsHtml}
          ${revisionHtml}
          ${keywordsHtml}
        </div>`;
    }).join("");

    const insights = analysis.insights || {};
    const stats = analysis.stats || {};

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; color: #0f172a; line-height: 1.6; }
  @page { size: A4; }
</style></head>
<body>
  <div style="max-width:750px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;padding-bottom:24px;border-bottom:2px solid #e2e8f0;margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:800;color:#0f172a;margin-bottom:6px;">${escapeXml(title)}</h1>
      <p style="font-size:11px;color:#94a3b8;">Generated by Adyapan AI</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px;">
      ${[
        { label: "Words", value: String(stats.words || 0) },
        { label: "Topics", value: String(stats.topicsFound || topics.length) },
        { label: "Reading Time", value: stats.readingTime || "N/A" },
        { label: "Difficulty", value: insights.difficultyLevel || "N/A" },
      ].map(s => `
        <div style="text-align:center;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
          <div style="font-size:16px;font-weight:800;color:#0f172a;">${escapeXml(s.value)}</div>
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">${escapeXml(s.label)}</div>
        </div>`).join("")}
    </div>

    ${insights.mainSubject ? `
    <div style="padding:12px 16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;margin-bottom:20px;">
      <span style="font-size:10px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.08em;">Main Subject</span>
      <p style="font-size:13px;color:#92400e;margin-top:2px;">${escapeXml(insights.mainSubject)}</p>
    </div>` : ""}

    <div style="border-top:1px solid #e2e8f0;padding-top:8px;">
      ${topicSections}
    </div>
  </div>
</body></html>`;

    const filename = `${title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_AdyapanAI_Analysis.pdf`;
    const pdfBuffer = await generatePdfFromHtml(htmlContent, title);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  } catch (error) {
    handleRouteError(res, error, "Study.export.pdf", "PDF generation failed");
  }
});

// Generate AI lesson on a topic (migrated from learn module)
studyRouter.post("/generate-lesson", async (req, res) => {
  try {
    const { topic, duration, level } = req.body;
    const result = await generateLearnLesson(topic, duration || "10m", level || "intermediate");
    const userPrisma = await getUserPrismaFromRequest(req);

    // Track Streak Activity
    StreakService.trackActivity(
      req.user!.userId,
      "GENERATE_NOTES",
      "study_assistant",
      null,
      15, // 15 points
      getTimezone(req),
      userPrisma
    ).catch(err => console.error("Streak tracking error:", err));

    res.json({ success: true, data: result });
  } catch (error) {
    handleRouteError(res, error, "Study.generateLesson", "Lesson generation failed");
  }
});

// Get study sessions with messages
studyRouter.get("/sessions", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const sessions = await userPrisma.studySession.findMany({
      where: { userId: req.user!.userId },
      include: { messages: true, documents: true },
      orderBy: { updatedAt: "desc" },
    });
    res.json({ success: true, sessions });
  } catch (error) {
    handleRouteError(res, error, "Study.sessions", "Failed to fetch sessions");
  }
});

studyRouter.get("/history", async (req, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);
    const sessions = await userPrisma.studySession.findMany({
      where: { userId: req.user!.userId },
      include: { messages: true },
    });
    res.json({ success: true, sessions });
  } catch (error) {
    handleRouteError(res, error, "Study.history", "Failed to fetch history");
  }
});
