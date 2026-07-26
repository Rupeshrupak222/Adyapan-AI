import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { handleRouteError } from "../utils/routeError";
import { generateAssignmentPdf } from "../services/assignment-pdf.service";
import { generateAssignmentDocx } from "../services/assignment-docx.service";
import { formatAssignmentHtml } from "../services/assignment-formatter.service";

export const assignmentExportRouter = Router();

// Allow optional auth for seamless public/preview export access
assignmentExportRouter.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return requireAuth(req, res, next);
  }
  next();
});

/**
 * Unified Assignment Export Endpoint:
 * POST /api/export/assignment or POST /api/assignment/export
 */
assignmentExportRouter.post("/export", async (req, res) => {
  try {
    const {
      assignmentTitle, subject, course, semester, studentName,
      registrationNumber, faculty, university, topic, academicLevel,
      wordCount, content, citationStyle, format = "pdf"
    } = req.body;

    const markdownText = typeof content === "string" 
      ? content 
      : (content?.sections ? content.sections.map((s: any) => `## ${s.title} (${s.pageEstimate || ""})\n\n${s.content}`).join("\n\n") : "");

    const topicName = topic || assignmentTitle || "Assignment";
    const options = {
      assignmentTitle: assignmentTitle || topicName,
      subject,
      course,
      semester,
      studentName,
      registrationNumber,
      faculty,
      university,
      topic: topicName,
      academicLevel,
      wordCount: parseInt(String(wordCount)) || (markdownText ? markdownText.split(/\s+/).length : 2500),
      citationStyle,
    };

    if (format === "docx") {
      const docxBuffer = await generateAssignmentDocx(markdownText, topicName, options);
      const filename = `${topicName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_Assignment.docx`;
      res.set({
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": docxBuffer.length.toString(),
      });
      res.send(docxBuffer);
      return;
    }

    if (format === "html") {
      const html = formatAssignmentHtml(markdownText, topicName, options);
      res.json({ success: true, html });
      return;
    }

    // Default: PDF
    const pdfBuffer = await generateAssignmentPdf(markdownText, topicName, options);
    const filename = `${topicName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_AdyapanAI_Assignment.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  } catch (error) {
    handleRouteError(res, error, "Assignment.export", "Assignment export failed");
  }
});

/**
 * POST /api/export/assignment/pdf or POST /api/assignment/export/pdf
 */
assignmentExportRouter.post("/export/pdf", async (req, res) => {
  try {
    const { assignmentTitle, subject, course, semester, studentName, registrationNumber, faculty, university, topic, academicLevel, wordCount, content, citationStyle } = req.body;
    const markdownText = typeof content === "string" 
      ? content 
      : (content?.sections ? content.sections.map((s: any) => `## ${s.title} (${s.pageEstimate || ""})\n\n${s.content}`).join("\n\n") : "");
    const topicName = topic || assignmentTitle || "Assignment";

    const pdfBuffer = await generateAssignmentPdf(markdownText, topicName, {
      assignmentTitle: assignmentTitle || topicName, subject, course, semester, studentName, registrationNumber, faculty, university, topic: topicName, academicLevel, wordCount, citationStyle
    });

    const filename = `${topicName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_AdyapanAI_Assignment.pdf`;
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    });
    res.send(pdfBuffer);
  } catch (error) {
    handleRouteError(res, error, "Assignment.export.pdf", "PDF generation failed");
  }
});

/**
 * POST /api/export/assignment/docx or POST /api/assignment/export/docx
 */
assignmentExportRouter.post("/export/docx", async (req, res) => {
  try {
    const { assignmentTitle, subject, course, semester, studentName, registrationNumber, faculty, university, topic, academicLevel, wordCount, content, citationStyle } = req.body;
    const markdownText = typeof content === "string" 
      ? content 
      : (content?.sections ? content.sections.map((s: any) => `## ${s.title} (${s.pageEstimate || ""})\n\n${s.content}`).join("\n\n") : "");
    const topicName = topic || assignmentTitle || "Assignment";

    const docxBuffer = await generateAssignmentDocx(markdownText, topicName, {
      assignmentTitle: assignmentTitle || topicName, subject, course, semester, studentName, registrationNumber, faculty, university, topic: topicName, academicLevel, wordCount, citationStyle
    });

    const filename = `${topicName.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_")}_Assignment.docx`;
    res.set({
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": docxBuffer.length.toString(),
    });
    res.send(docxBuffer);
  } catch (error) {
    handleRouteError(res, error, "Assignment.export.docx", "DOCX generation failed");
  }
});
