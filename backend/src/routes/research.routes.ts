import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { requireFeatureQuota } from "../middleware/requireFeatureQuota";
import {
  getDashboardStats,
  listPapers,
  listDrafts,
  listTemplates,
  getExportHistory,
  suggestTopics,
  fetchSources,
  generatePaperSSE,
  generatePaperSync,
  generateSectionHandler,
  saveDraftHandler,
  enhanceTextHandler,
  generateVisualHandler,
  uploadPDFHandler,
  chatWithAI,
  getPaper,
  exportPdf,
  exportDocx,
  exportLatex,
  exportMarkdown,
  exportBibtex,
  checkPlagiarism,
  rephraseText,
} from "../controllers/research.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

export const researchRouter = Router();

researchRouter.use(requireAuth);

// Dashboard & Listings
researchRouter.get("/dashboard", getDashboardStats);
researchRouter.get("/papers", listPapers);
researchRouter.get("/drafts", listDrafts);
researchRouter.get("/templates", listTemplates);
researchRouter.get("/export-history", getExportHistory);

// Topics & Literature Search
researchRouter.post("/suggest-topics", suggestTopics);
researchRouter.post("/fetch-sources", fetchSources);

// Paper & Section Generation
researchRouter.post("/generate-paper", requireFeatureQuota("RESEARCH_PAPER_AI"), generatePaperSSE);
researchRouter.post("/generate-paper-sync", requireFeatureQuota("RESEARCH_PAPER_AI"), generatePaperSync);
researchRouter.post("/generate-section", generateSectionHandler);
researchRouter.post("/draft/save", saveDraftHandler);

// AI Tools & Visual Content
researchRouter.post("/enhance", enhanceTextHandler);
researchRouter.post("/generate-visual", generateVisualHandler);
researchRouter.post("/upload-pdf", upload.single("file"), uploadPDFHandler);
researchRouter.post("/chat", chatWithAI);

// Retrieve stored paper
researchRouter.get("/paper/:id", getPaper);

// Exports
researchRouter.post("/export/pdf", exportPdf);
researchRouter.post("/export/docx", exportDocx);
researchRouter.post("/export/latex", exportLatex);
researchRouter.post("/export/markdown", exportMarkdown);
researchRouter.post("/export/bibtex", exportBibtex);

// Legacy
researchRouter.post("/check-plagiarism", checkPlagiarism);
researchRouter.post("/rephrase", rephraseText);
