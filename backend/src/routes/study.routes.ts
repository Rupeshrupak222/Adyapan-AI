import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateStudyResponse, generateLearnLesson } from "../lib/ai/gemini";
import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { env } from "../config/env";
import multer from "multer";
import { extractPdfText } from "../services/pdf-parser.service";
async function parsePdfNonBlocking(buffer: Buffer): Promise<string> {
  return extractPdfText(buffer);
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

/** Generate comprehensive AI document study summary with multi-tier fail-safety */
async function generateDocumentSummaryAnalysis(documentText: string) {
  const wordCount = documentText.split(/\s+/).length;
  const readingTime = `${Math.max(1, Math.round(wordCount / 200))} min`;

  // Smart truncation: first 15k chars + last 5k chars for large documents
  const truncatedText = documentText.length > 20000
    ? documentText.slice(0, 15000) + "\n\n[... Document Content Continued ...]\n\n" + documentText.slice(-5000)
    : documentText;

  const prompt = `You are an expert AI Study Assistant and Academic Document Analyzer.
Analyze the provided document text and generate a comprehensive, highly detailed study summary.

Document Text:
"""
${truncatedText}
"""

Return ONLY a valid JSON object matching this schema:
{
  "title": "<Specific Document Title or Main Subject>",
  "stats": {
    "pages": ${Math.max(1, Math.round(wordCount / 300))},
    "words": ${wordCount},
    "topicsFound": 4,
    "readingTime": "${readingTime}",
    "summaryLength": "Comprehensive AI Summary"
  },
  "insights": {
    "mainSubject": "<Primary Subject or Domain>",
    "difficultyLevel": "Beginner|Intermediate|Advanced",
    "estimatedStudyTime": "<Estimated Study Time>",
    "importantChapters": ["<Key Chapter 1>", "<Key Chapter 2>", "<Key Chapter 3>"],
    "repeatedTopics": ["<Core Concept 1>", "<Core Concept 2>"]
  },
  "topics": [
    {
      "name": "<Major Topic 1 Title>",
      "overview": "<Detailed 200-350 word educational explanation summarizing key principles of this topic as covered in the document.>",
      "subtopics": [
        { "name": "<Subtopic 1 Name>", "content": "<Detailed 100-150 word explanation with concrete concepts.>" },
        { "name": "<Subtopic 2 Name>", "content": "<Detailed 100-150 word explanation with concrete concepts.>" }
      ],
      "keyConcepts": [
        "<Key concept 1: Clear 1-2 sentence definition and explanation.>",
        "<Key concept 2: Clear 1-2 sentence definition and explanation.>",
        "<Key concept 3: Clear 1-2 sentence definition and explanation.>",
        "<Key concept 4: Clear 1-2 sentence definition and explanation.>"
      ],
      "importantPoints": [
        "<Crucial takeaway point 1 from the document text.>",
        "<Crucial takeaway point 2 from the document text.>",
        "<Crucial takeaway point 3 from the document text.>",
        "<Crucial takeaway point 4 from the document text.>"
      ],
      "questions": [
        "<Exam question 1 testing comprehension of this topic?>",
        "<Exam question 2 testing comprehension of this topic?>",
        "<Exam question 3 testing comprehension of this topic?>"
      ],
      "quickRevision": "<3-4 sentence rapid revision summary highlighting key formulas, definitions, or mechanisms.>",
      "keywords": ["<Term 1>", "<Term 2>", "<Term 3>", "<Term 4>", "<Term 5>"]
    }
  ]
}

Rules:
- Generate 3-5 major topics.
- Every topic MUST include full non-empty arrays for keyConcepts (4+ items), importantPoints (4+ items), questions (3+ items), and subtopics (2+ items).
- The overview MUST be a real AI-generated summary explaining the document content, NOT raw unparsed text.
- Return ONLY valid JSON with no conversational text.`;

  try {
    const result = await generateJSON<any>(
      "You are an expert AI Study Assistant. Generate detailed, structured document study summaries. Return ONLY valid JSON.",
      prompt,
      { model: MODELS.BALANCED, maxTokens: 4000, responseFormat: { type: "json_object" } },
      null
    );

    if (result && Array.isArray(result.topics) && result.topics.length > 0) {
      const cleanedTopics = result.topics.map((t: any, idx: number) => ({
        name: t.name || `Topic ${idx + 1}`,
        overview: t.overview || "This section provides an overview of the topic as detailed in the uploaded document.",
        subtopics: Array.isArray(t.subtopics) && t.subtopics.length > 0 ? t.subtopics : [
          { name: "Core Fundamentals", content: t.overview?.slice(0, 300) || "Primary principles discussed in document." }
        ],
        keyConcepts: Array.isArray(t.keyConcepts) && t.keyConcepts.length > 0 ? t.keyConcepts : [
          `Fundamental principles of ${t.name || "this topic"}.`,
          `Core methodology and mechanisms described in the document.`,
          `Key terminology and theoretical framework.`
        ],
        importantPoints: Array.isArray(t.importantPoints) && t.importantPoints.length > 0 ? t.importantPoints : [
          `Key takeaway regarding ${t.name || "topic"}.`,
          `Essential concepts to remember for examinations.`,
          `Main practical applications.`
        ],
        questions: Array.isArray(t.questions) && t.questions.length > 0 ? t.questions : [
          `What are the core concepts of ${t.name || "this topic"}?`,
          `How is ${t.name || "this topic"} applied according to the document?`,
          `Explain the key principles associated with ${t.name || "this topic"}.`
        ],
        quickRevision: t.quickRevision || `${t.name}: Overview of key principles and applications.`,
        keywords: Array.isArray(t.keywords) && t.keywords.length > 0 ? t.keywords : ["Study", "Concepts", "Revision"]
      }));

      return {
        title: result.title || "Document Study Analysis",
        stats: result.stats || {
          pages: Math.max(1, Math.round(wordCount / 300)),
          words: wordCount,
          topicsFound: cleanedTopics.length,
          readingTime,
          summaryLength: "Comprehensive AI Summary"
        },
        insights: result.insights || {
          mainSubject: result.title || "Study Material",
          difficultyLevel: "Intermediate",
          estimatedStudyTime: readingTime,
          importantChapters: cleanedTopics.map((t: any) => t.name),
          repeatedTopics: [result.title || "Core Subject"]
        },
        topics: cleanedTopics
      };
    }
  } catch (err: any) {
    console.error("[Study Assistant] Primary AI summary generation failed:", err?.message || err);
  }

  // Fallback AI call with concise prompt if primary timed out
  try {
    const fallbackPrompt = `Summarize this study document into 3 key topics with overview, keyConcepts, importantPoints, and questions.

Text Excerpt:
${truncatedText.slice(0, 8000)}

Return JSON:
{
  "title": "<Document Title>",
  "topics": [
    {
      "name": "<Topic Name>",
      "overview": "<AI Summary>",
      "subtopics": [{ "name": "Key Concepts", "content": "<Content>" }],
      "keyConcepts": ["<Concept 1>", "<Concept 2>"],
      "importantPoints": ["<Point 1>", "<Point 2>"],
      "questions": ["<Question 1>", "<Question 2>"],
      "quickRevision": "<Revision>",
      "keywords": ["<Keyword>"]
    }
  ]
}`;
    const fallbackRes = await generateJSON<any>(
      "Summarize document text into structured study topics JSON.",
      fallbackPrompt,
      { model: MODELS.FAST, maxTokens: 2500, responseFormat: { type: "json_object" } },
      null
    );

    if (fallbackRes && Array.isArray(fallbackRes.topics) && fallbackRes.topics.length > 0) {
      return {
        title: fallbackRes.title || "Uploaded Document Summary",
        stats: {
          pages: Math.max(1, Math.round(wordCount / 300)),
          words: wordCount,
          topicsFound: fallbackRes.topics.length,
          readingTime,
          summaryLength: "Concise AI Summary"
        },
        insights: {
          mainSubject: fallbackRes.title || "Uploaded Document",
          difficultyLevel: "Intermediate",
          estimatedStudyTime: readingTime,
          importantChapters: fallbackRes.topics.map((t: any) => t.name),
          repeatedTopics: []
        },
        topics: fallbackRes.topics
      };
    }
  } catch (fbErr) {
    console.error("[Study Assistant] Secondary AI summary fallback failed:", fbErr);
  }

  // Structural NLP Fallback (guarantees non-empty arrays even without AI)
  const paragraphs = documentText.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 40);
  const docTitle = paragraphs[0]?.slice(0, 100) || "Document Study Summary";
  const mainSubject = docTitle.split(/[:\-\n]/)[0] || "General Study Material";

  const nlpTopics = paragraphs.slice(0, 4).map((p, idx) => {
    const lines = p.split(/\.\s+/).filter(l => l.trim().length > 10);
    const topicName = lines[0]?.slice(0, 50) || `Key Topic ${idx + 1}`;
    const overview = `This section summarizes ${topicName}: ${p.slice(0, 800)}`;
    const keyConcepts = lines.slice(1, 5).map(l => l.trim() + ".");
    const importantPoints = lines.slice(0, 4).map(l => `Key Takeaway: ${l.trim()}`);
    const questions = [
      `What are the main principles associated with ${topicName}?`,
      `Explain the importance of ${topicName} in relation to ${mainSubject}.`,
      `How does ${topicName} function based on the document text?`
    ];

    return {
      name: topicName,
      overview,
      subtopics: [
        { name: `Overview of ${topicName}`, content: p.slice(0, 400) }
      ],
      keyConcepts: keyConcepts.length > 0 ? keyConcepts : [`Core principles of ${topicName} covered in document.`],
      importantPoints: importantPoints.length > 0 ? importantPoints : [`Essential takeaway for ${topicName}.`],
      questions,
      quickRevision: `Quick revision for ${topicName}: ${p.slice(0, 250)}.`,
      keywords: documentText.split(/\s+/).filter(w => w.length > 4 && /^[A-Z]/.test(w)).slice(0, 8)
    };
  });

  return {
    title: docTitle,
    stats: {
      pages: Math.max(1, Math.round(wordCount / 300)),
      words: wordCount,
      topicsFound: nlpTopics.length,
      readingTime,
      summaryLength: "Structured Summary"
    },
    insights: {
      mainSubject,
      difficultyLevel: "Intermediate",
      estimatedStudyTime: readingTime,
      importantChapters: nlpTopics.map(t => t.name),
      repeatedTopics: [mainSubject]
    },
    topics: nlpTopics
  };
}

// Analyze uploaded document — fast unified AI study summary generation
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

    if (req.body.documentText) {
      documentText = cleanExtractedText(documentText);
    }

    const analysis = await generateDocumentSummaryAnalysis(documentText);

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
