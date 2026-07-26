import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { handleRouteError } from "../utils/routeError";
import { generateNotesPdf } from "../services/pdf-generator.service";
import { generateNotesDocx } from "../services/docx-generator.service";
import { formatNotesHtml, formatNotesBodyHtml } from "../services/notes-formatter.service";

export const notesExportRouter = Router();

notesExportRouter.use(requireAuth);

/**
 * Unified Export Endpoint:
 * POST /api/export/notes or POST /api/notes/export
 * Body: { subject?: string, topic: string, content: string, format?: "pdf" | "docx" | "html", difficulty?: string, language?: string }
 */
notesExportRouter.post("/notes", async (req, res) => {
  try {
    const { subject, topic, content, format = "pdf", difficulty, language, readingTime, wordCount } = req.body;

    if (!content || !topic) {
      res.status(400).json({ success: false, error: "content and topic are required" });
      return;
    }

    const options = { subject, topic, difficulty, language, readingTime, wordCount };

    if (format === "docx") {
      const docxBuffer = await generateNotesDocx(content, topic, options);
      const filename = `${topic.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_Notes.docx`;
      res.set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": docxBuffer.length.toString(),
      });
      res.send(docxBuffer);
      return;
    }

    if (format === "html") {
      const html = formatNotesHtml(content, topic, options);
      res.json({ success: true, html });
      return;
    }

    // Default: PDF
    const pdfBuffer = await generateNotesPdf(content, topic, options);
    const filename = `${topic.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_AdyapanAI_Notes.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  } catch (error) {
    handleRouteError(res, error, "Notes.export.notes", "Unified note export failed");
  }
});

/**
 * POST /api/notes/export/pdf
 */
notesExportRouter.post("/pdf", async (req, res) => {
  try {
    const { content, topic, difficulty, type, subject, language } = req.body;

    if (!content || !topic) {
      res.status(400).json({ success: false, error: "content and topic are required" });
      return;
    }

    const pdfBuffer = await generateNotesPdf(content, topic, { difficulty, type, subject, language });
    const filename = `${topic.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_AdyapanAI_Notes.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    });

    res.send(pdfBuffer);
  } catch (error) {
    handleRouteError(res, error, "Notes.export.pdf", "PDF generation failed");
  }
});

/**
 * POST /api/notes/export/docx
 */
notesExportRouter.post("/docx", async (req, res) => {
  try {
    const { content, topic, difficulty, type, subject, language } = req.body;

    if (!content || !topic) {
      res.status(400).json({ success: false, error: "content and topic are required" });
      return;
    }

    const docxBuffer = await generateNotesDocx(content, topic, { difficulty, type, subject, language });
    const filename = `${topic.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_Notes.docx`;

    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": docxBuffer.length.toString(),
    });

    res.send(docxBuffer);
  } catch (error) {
    handleRouteError(res, error, "Notes.export.docx", "DOCX generation failed");
  }
});

/**
 * POST /api/notes/export/html
 */
notesExportRouter.post("/html", async (req, res) => {
  try {
    const { content, topic, difficulty, type, subject, language } = req.body;

    if (!content || !topic) {
      res.status(400).json({ success: false, error: "content and topic are required" });
      return;
    }

    const html = formatNotesHtml(content, topic, { difficulty, type, subject, language });
    res.json({ success: true, html });
  } catch (error) {
    handleRouteError(res, error, "Notes.export.html", "HTML formatting failed");
  }
});

/**
 * POST /api/notes/format
 */
notesExportRouter.post("/format", async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ success: false, error: "content is required" });
      return;
    }

    const html = formatNotesBodyHtml(content);
    res.json({ success: true, html });
  } catch (error) {
    handleRouteError(res, error, "Notes.format", "Markdown formatting failed");
  }
});
