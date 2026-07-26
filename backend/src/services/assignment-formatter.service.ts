import { marked } from "marked";

export interface AssignmentExportOptions {
  assignmentTitle?: string;
  subject?: string;
  course?: string;
  semester?: string;
  studentName?: string;
  registrationNumber?: string;
  faculty?: string;
  university?: string;
  topic?: string;
  academicLevel?: string;
  wordCount?: number;
  readingTime?: string;
  citationStyle?: "APA" | "IEEE" | "MLA";
  fontFamily?: "Poppins" | "Inter" | "Calibri" | "Times New Roman";
  generatedOn?: string;
  assignmentId?: string;
}

function escapeXml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function formatAssignmentHtml(
  content: string,
  topicName: string,
  options: AssignmentExportOptions = {}
): string {
  const title = options.assignmentTitle || options.topic || topicName || "Academic Assignment";
  const subject = options.subject || "Academic Study";
  const course = options.course || "Degree Course";
  const semester = options.semester || "Standard Semester";
  const studentName = options.studentName || "Adyapan Student";
  const regNumber = options.registrationNumber || "REG-2026-001";
  const faculty = options.faculty || "Academic Faculty";
  const university = options.university || "University Department";
  const academicLevel = options.academicLevel || "Undergraduate";
  const wordCount = options.wordCount || (content ? content.split(/\s+/).length : 2500);
  const readingTime = options.readingTime || `${Math.ceil(wordCount / 200)} mins`;
  const citationStyle = options.citationStyle || "APA";
  const dateStr = options.generatedOn || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const assignmentId = options.assignmentId || `ASSIGN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;
  const fontFamily = options.fontFamily || "Inter";

  // Process Markdown to HTML via marked
  let bodyHtml = marked.parse(content || "");

  // Convert blockquotes into Callout Boxes
  bodyHtml = bodyHtml
    .replace(/<blockquote>\s*<p>\s*<strong>(Info|Note):?<\/strong>/gi, '<div class="callout callout-info"><div class="callout-title">💡 Information</div><p>')
    .replace(/<blockquote>\s*<p>\s*<strong>(Warning|Caution):?<\/strong>/gi, '<div class="callout callout-warning"><div class="callout-title">⚠️ Warning</div><p>')
    .replace(/<blockquote>\s*<p>\s*<strong>(Tip):?<\/strong>/gi, '<div class="callout callout-tip"><div class="callout-title">✨ Pro Tip</div><p>')
    .replace(/<blockquote>/g, '<div class="callout callout-quote"><p>')
    .replace(/<\/blockquote>/g, "</div>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 2.5cm 2cm 2.5cm 2cm;
    }

    body {
      font-family: '${fontFamily}', 'Inter', system-ui, -apple-system, sans-serif;
      color: #111827;
      background: #ffffff;
      line-height: 1.75;
      font-size: 13.5px;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
    }

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(244, 180, 0, 0.05);
      letter-spacing: 12px;
      pointer-events: none;
      z-index: -1;
      text-transform: uppercase;
      font-family: 'Poppins', sans-serif;
    }

    /* COVER PAGE */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      padding: 3rem 2rem;
      box-sizing: border-box;
      border: 1px solid #f1f5f9;
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
    }

    .cover-header {
      margin-top: 2rem;
    }

    .cover-logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px 18px;
      background: #FFFBEB;
      border: 1.5px solid #FCD34D;
      border-radius: 999px;
      color: #D97706;
      font-weight: 800;
      font-size: 14px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .cover-title {
      font-family: 'Poppins', sans-serif;
      font-size: 32px;
      font-weight: 800;
      color: #111827;
      margin: 2rem 0 0.5rem;
      line-height: 1.3;
      max-width: 650px;
    }

    .cover-subtitle {
      font-size: 16px;
      color: #6B7280;
      font-weight: 500;
      margin-bottom: 3rem;
    }

    .cover-metadata-card {
      width: 100%;
      max-width: 550px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      text-align: left;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px 24px;
      font-size: 12.5px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 2px;
    }

    .cover-footer {
      margin-bottom: 1.5rem;
      font-size: 11px;
      color: #94a3b8;
    }

    .cover-footer strong {
      color: #F4B400;
    }

    /* MAIN DOCUMENT CONTENT */
    .assignment-body {
      padding: 1rem 0;
    }

    h1, h2, h3, h4 {
      font-family: 'Poppins', sans-serif;
      color: #0f172a;
      page-break-after: avoid;
    }

    h1 {
      font-size: 22px;
      font-weight: 800;
      border-bottom: 2.5px solid #F4B400;
      padding-bottom: 8px;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
    }

    h2 {
      font-size: 17px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      border-left: 4px solid #F4B400;
      padding-left: 10px;
    }

    h3 {
      font-size: 14.5px;
      font-weight: 700;
      color: #334155;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }

    p {
      margin-bottom: 1rem;
      text-align: justify;
    }

    ul, ol {
      margin-bottom: 1.2rem;
      padding-left: 1.5rem;
    }

    li {
      margin-bottom: 0.4rem;
    }

    /* TABLES */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-size: 12.5px;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    th {
      background: #F4B400;
      color: #000000;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      text-align: left;
    }

    td {
      padding: 9px 12px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }

    tr:nth-child(even) {
      background: #f8fafc;
    }

    /* CODE BLOCKS */
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 14px 18px;
      border-radius: 10px;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 11.5px;
      line-height: 1.6;
      overflow-x: auto;
      margin: 1.2rem 0;
      border: 1px solid #1e293b;
    }

    code {
      font-family: 'Consolas', monospace;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* CALLOUT BOXES */
    .callout {
      padding: 12px 16px;
      border-radius: 10px;
      margin: 1.2rem 0;
      border-left: 4px solid #F4B400;
      background: #fffbe6;
      font-size: 13px;
    }

    .callout-title {
      font-weight: 800;
      font-size: 12px;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .callout-info { border-left-color: #3b82f6; background: #eff6ff; }
    .callout-info .callout-title { color: #1d4ed8; }

    .callout-warning { border-left-color: #ef4444; background: #fef2f2; }
    .callout-warning .callout-title { color: #b91c1c; }

    .callout-tip { border-left-color: #10b981; background: #ecfdf5; }
    .callout-tip .callout-title { color: #047857; }

    /* METADATA INFO TABLE */
    .assignment-info-table {
      width: 100%;
      margin: 1rem 0 2rem;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: #f8fafc;
      padding: 12px 16px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .info-cell {
      display: flex;
      flex-direction: column;
    }

    .info-lbl {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .info-val {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }

  </style>
</head>
<body>

  <div class="watermark">ADYAPAN AI</div>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="cover-logo-badge">
        🎓 ADYAPAN AI
      </div>
      <p style="font-size: 12px; color: #64748b; font-weight: 600; margin-top: 6px; letter-spacing: 1px;">AI ASSIGNMENT GENERATOR ENGINE</p>
    </div>

    <div>
      <h1 class="cover-title">${escapeXml(title)}</h1>
      <p class="cover-subtitle">Publication-Grade Academic Research Assignment</p>

      <div class="cover-metadata-card">
        <div class="cover-meta-grid">
          <div class="meta-item">
            <span class="meta-label">Submitted By</span>
            <span class="meta-val">${escapeXml(studentName)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Registration No.</span>
            <span class="meta-val">${escapeXml(regNumber)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Subject & Course</span>
            <span class="meta-val">${escapeXml(subject)} (${escapeXml(course)})</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Semester & Section</span>
            <span class="meta-val">${escapeXml(semester)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Faculty Supervisor</span>
            <span class="meta-val">${escapeXml(faculty)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Institution</span>
            <span class="meta-val">${escapeXml(university)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Academic Level</span>
            <span class="meta-val">${escapeXml(academicLevel)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Submission Date</span>
            <span class="meta-val">${escapeXml(dateStr)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <p>Generated by <strong>Adyapan AI</strong> &middot; ${escapeXml(assignmentId)}</p>
      <p style="font-size: 10px; margin-top: 2px;">Verified for Academic Formatting &amp; Citation Integrity</p>
    </div>
  </div>

  <!-- ASSIGNMENT BODY -->
  <div class="assignment-body">
    <div class="assignment-info-table">
      <div class="info-cell">
        <span class="info-lbl">Assignment Title</span>
        <span class="info-val">${escapeXml(title)}</span>
      </div>
      <div class="info-cell">
        <span class="info-lbl">Subject</span>
        <span class="info-val">${escapeXml(subject)}</span>
      </div>
      <div class="info-cell">
        <span class="info-lbl">Academic Level</span>
        <span class="info-val">${escapeXml(academicLevel)}</span>
      </div>
      <div class="info-cell">
        <span class="info-lbl">Word Count</span>
        <span class="info-val">${wordCount} words</span>
      </div>
      <div class="info-cell">
        <span class="info-lbl">Reading Time</span>
        <span class="info-val">${escapeXml(readingTime)}</span>
      </div>
      <div class="info-cell">
        <span class="info-lbl">Assignment ID</span>
        <span class="info-val">${escapeXml(assignmentId)}</span>
      </div>
    </div>

    ${bodyHtml}
  </div>

</body>
</html>`;
}
