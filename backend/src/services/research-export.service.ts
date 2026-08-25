import type { GeneratedPaper } from "./research.service";
import { renderPaperHTMLByTemplate, getTemplateMeta } from "./template-engine.service";

// ============================================================================
// 1. PDF EXPORT (via Puppeteer with dynamic PaperShell template HTML rendering)
// ============================================================================

export async function exportPaperPdf(paper: GeneratedPaper, templateId: string = "IEEE"): Promise<Buffer> {
  const { default: puppeteer } = await import("puppeteer");

  const html = renderPaperHTMLByTemplate(paper, templateId);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    const cspMeta = '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https: data: blob:; style-src \'unsafe-inline\' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:;">';
    const hardenedHtml = html.replace("<head>", `<head>${cspMeta}`);
    await page.setContent(hardenedHtml, { waitUntil: "networkidle0" });

    const paperTitleStr = typeof paper.title === "string" ? paper.title : (Array.isArray(paper.title) ? (paper.title as string[]).join(", ") : "Untitled Paper");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "15mm", right: "15mm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:8px;font-family:sans-serif;text-align:center;width:100%;color:#64748b;">${escapeHtmlHeader(paperTitleStr)} • PaperShell Template: ${templateId.toUpperCase()}</div>`,
      footerTemplate: `<div style="font-size:8px;font-family:sans-serif;text-align:center;width:100%;color:#64748b;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser?.close();
  }
}

function escapeHtmlHeader(str: string | string[]): string {
  const text = typeof str === "string" ? str : (Array.isArray(str) ? str.join(", ") : "");
  return (text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============================================================================
// 2. DOCX EXPORT (HTML formatted payload for Word compatibility)
// ============================================================================

export async function exportPaperDocx(paper: GeneratedPaper, templateId: string = "IEEE"): Promise<Buffer> {
  const html = renderPaperHTMLByTemplate(paper, templateId);
  const paperTitleStr = typeof paper.title === "string" ? paper.title : "Untitled Paper";
  const docxHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>${escapeHtmlHeader(paperTitleStr)}</title></head>
  <body>${html}</body>
  </html>`;
  return Buffer.from(docxHtml, "utf-8");
}

// ============================================================================
// 3. LATEX (.tex) EXPORT — Powered by PaperShell (Sylvain Hallé Specifications)
// ============================================================================

export async function exportPaperLatex(paper: GeneratedPaper, templateId: string = "IEEE"): Promise<string> {
  const meta = getTemplateMeta(templateId);
  const paperTitleStr = typeof paper.title === "string" ? paper.title : "Untitled Paper";
  const authorsList = paper.authors && paper.authors.length > 0 ? paper.authors : ["Author Name"];

  let docClass = "\\documentclass[conference]{IEEEtran}";
  let publisherKey = "ieeetran";
  let preamblePacks = `\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage[english]{babel}\n\\usepackage{graphicx}\n\\usepackage{cite}\n\\usepackage{microtype}\n\\usepackage{amsmath,amssymb}\n\\usepackage[scaled]{helvet}\n\\usepackage{hyperref}`;
  let authorBlock = "";

  if (templateId === "ACM") {
    publisherKey = "acmart";
    docClass = "\\documentclass[sigconf]{acmart}";
    preamblePacks = `\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage[english]{babel}\n\\usepackage{graphicx}\n\\usepackage{microtype}`;
    authorBlock = authorsList.map((a) => `\\author{${sanitizeLatex(a)}}\n\\affiliation{\\institution{Adyapan AI Research Lab}\\country{USA}}`).join("\n");
  } else if (templateId === "Springer-LNCS") {
    publisherKey = "lncs";
    docClass = "\\documentclass{llncs}";
    preamblePacks = `\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage[english]{babel}\n\\usepackage{graphicx}\n\\usepackage{cite}\n\\usepackage{lmodern}`;
    authorBlock = `\\author{${authorsList.map(a => sanitizeLatex(a)).join(" \\and ")}}\n\\institute{Adyapan AI Research Institute}`;
  } else if (templateId === "Elsevier") {
    publisherKey = "cas";
    docClass = "\\documentclass[5p,times]{elsarticle}";
    preamblePacks = `\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage[english]{babel}\n\\usepackage{graphicx}\n\\usepackage{amsmath}`;
    authorBlock = authorsList.map((a) => `\\author{${sanitizeLatex(a)}}\n\\address{Department of Computer Science, Institution}`).join("\n");
  } else if (templateId === "IEEE-Journal") {
    publisherKey = "ieeetran";
    docClass = "\\documentclass[journal]{IEEEtran}";
    authorBlock = `\\author{${authorsList.map((a, i) => `\\IEEEauthorblockN{${sanitizeLatex(a)}}\\IEEEauthorblockA{Institution}`).join("\\and\n")}}`;
  } else {
    // foo / generic article template for Thesis, TechReport, Survey, Review
    publisherKey = "foo";
    docClass = "\\documentclass[11pt,a4paper]{article}";
    preamblePacks = `\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\usepackage[english]{babel}\n\\usepackage{graphicx}\n\\usepackage{cite}\n\\usepackage{amsmath,amssymb}\n\\usepackage[margin=25mm]{geometry}\n\\usepackage{hyperref}`;
    authorBlock = `\\author{${authorsList.map(a => sanitizeLatex(a)).join(", ")}\\\\ \\textit{Adyapan AI Research Institute}}`;
  }

  if (!authorBlock) {
    authorBlock = `\\author{${authorsList.map(a => `\\IEEEauthorblockN{${sanitizeLatex(a)}}\\IEEEauthorblockA{Institution}`).join("\\and\n")}}`;
  }

  const sectionsTex = paper.sections
    .filter(s => s.id !== "references")
    .map(s => `\\section{${sanitizeLatex(s.title)}}\n${markdownToLatex(s.content)}`)
    .join("\n\n");

  const refsTex = paper.references
    .map((r, i) => `\\bibitem{ref${i + 1}}\n${sanitizeLatex(r.authors?.join(", ") || "Author")}, "\`\`${sanitizeLatex(r.title)}'', \\textit{${sanitizeLatex(r.journal || r.source || "Proceedings")}}, ${r.year}.`)
    .join("\n\n");

  return `%% %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%% Autogenerated by PaperShell v3.0 Integration
%% Original PaperShell Engine by Sylvain Hallé (https://github.com/sylvainhalle/PaperShell)
%% Publisher: ${publisherKey} | Template: ${templateId}
%% %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

${docClass}

% Preamble Packages
${preamblePacks}

\\title{${sanitizeLatex(paperTitleStr)}}

${authorBlock}

\\begin{document}

\\maketitle

\\begin{abstract}
${sanitizeLatex(paper.abstract)}
\\end{abstract}

\\keywords{${sanitizeLatex(paper.keywords?.join(", ") || "Research, AI, Computer Science")}}

${sectionsTex}

\\begin{thebibliography}{99}
${refsTex}
\\end{thebibliography}

\\end{document}`;
}

// ============================================================================
// 4. MARKDOWN (.md) EXPORT
// ============================================================================

export async function exportPaperMarkdown(paper: GeneratedPaper): Promise<string> {
  const authorsStr = paper.authors?.join(", ") || "Anonymous Author";
  const keywordsStr = paper.keywords?.join(", ") || "Research";

  const sectionsMd = paper.sections
    .filter(s => s.id !== "references")
    .map(s => `## ${s.title}\n\n${s.content}`)
    .join("\n\n");

  const refsMd = paper.references
    .map((r, i) => `[${i + 1}] ${r.authors?.join(", ") || "Author"}. "${r.title}." *${r.journal || r.source || "Publication"}*, ${r.year}.${r.doi ? ` DOI: ${r.doi}` : ""}`)
    .join("\n");

  return `# ${paper.title}

**Authors:** ${authorsStr}  
**Keywords:** ${keywordsStr}  
**Template Framework:** PaperShell (${paper.metadata?.template || "IEEE"})  

---

### Abstract
${paper.abstract}

---

${sectionsMd}

---

## References
${refsMd}
`;
}

export async function exportPaperBibtex(paper: GeneratedPaper): Promise<string> {
  return paper.references.map((r, i) => {
    const key = `ref_${r.year}_${i + 1}`;
    const authorStr = r.authors?.join(" and ") || "Author, A.";
    return `@article{${key},
  author = {${authorStr}},
  title = {{${r.title}}},
  journal = {${r.journal || r.source || "Scientific Journal"}},
  year = {${r.year}},
  ${r.doi ? `doi = {${r.doi}},` : ""}
}`;
  }).join("\n\n");
}

function sanitizeLatex(str: string): string {
  return (str || "")
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function markdownToLatex(md: string): string {
  return (md || "")
    .replace(/^### (.+)$/gm, "\\subsection{$1}")
    .replace(/^## (.+)$/gm, "\\section{$1}")
    .replace(/\*\*(.*?)\*\*/g, "\\textbf{$1}")
    .replace(/\*(.*?)\*/g, "\\textit{$1}");
}
