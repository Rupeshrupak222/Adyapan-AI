import { marked, Renderer } from "marked";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanMarkdown(raw: string): string {
  let cleaned = raw;
  cleaned = cleaned.replace(/^#{5,}\s*$/gm, "");
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  return cleaned.trim();
}

const renderer = new Renderer();

renderer.code = function (code: string, language: string | undefined, isEscaped: boolean): string {
  const langClass = language ? ` class="language-${language}"` : "";
  const displayCode = isEscaped ? code : escapeHtml(code);
  const langLabel = (language || "code").toUpperCase();
  return `
    <div class="code-container">
      <div class="code-header">
        <span class="code-lang">💻 ${langLabel}</span>
      </div>
      <pre class="code-block"><code${langClass}>${displayCode}</code></pre>
    </div>
  `;
};

renderer.table = function (header: string, body: string): string {
  return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
};

renderer.blockquote = function (quote: string): string {
  let calloutClass = "callout-info";
  let icon = "💡";
  const cleanQuote = quote.trim();

  if (/warning|caution|danger|important/i.test(cleanQuote)) {
    calloutClass = "callout-warning";
    icon = "⚠️";
  } else if (/tip|note|pro-tip/i.test(cleanQuote)) {
    calloutClass = "callout-tip";
    icon = "📌";
  } else if (/success|done|completed/i.test(cleanQuote)) {
    calloutClass = "callout-success";
    icon = "✔";
  }

  return `
    <div class="callout-box ${calloutClass}">
      <span class="callout-icon">${icon}</span>
      <div class="callout-content">${quote}</div>
    </div>
  `;
};

marked.use({ renderer, gfm: true, breaks: false });

export interface NotesFormatOptions {
  subject?: string;
  topic?: string;
  difficulty?: string;
  language?: string;
  generatedBy?: string;
  readingTime?: string;
  wordCount?: number;
  exportId?: string;
  type?: string;
}

export function formatNotesHtml(
  markdown: string,
  topicName: string,
  options: NotesFormatOptions = {}
): string {
  const cleaned = cleanMarkdown(markdown);
  const bodyHtml = marked.parse(cleaned) as string;

  const subject = options.subject || "Study Notes";
  const topic = options.topic || topicName;
  const difficulty = options.difficulty || "Intermediate";
  const language = options.language || "English";
  const generatedBy = options.generatedBy || "Adyapan AI Engine";
  const wordCount = options.wordCount || markdown.split(/\s+/).length;
  const readingTime = options.readingTime || `${Math.ceil(wordCount / 200)} min`;
  const exportId = options.exportId || `ADY-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(topic)} - Adyapan AI Notes</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700;800&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --primary: #F4B400;
      --primary-dark: #D97706;
      --secondary: #111827;
      --accent: #F59E0B;
      --text: #1F2937;
      --text-muted: #6B7280;
      --bg: #FFFFFF;
      --surface: #F9FAFB;
      --border: #E5E7EB;
    }

    body {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.75;
      color: var(--text);
      background: var(--bg);
      position: relative;
    }

    /* ── Watermark Background ────────────────────── */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-family: 'Poppins', sans-serif;
      font-size: 80px;
      font-weight: 800;
      color: rgba(244, 180, 0, 0.04);
      pointer-events: none;
      user-select: none;
      z-index: 0;
      white-space: nowrap;
    }

    .notes-container {
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 48px;
      position: relative;
      z-index: 1;
    }

    /* ── Top Header Brand ────────────────────────── */
    .brand-header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 3px solid var(--primary);
      margin-bottom: 28px;
    }

    .brand-logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: linear-gradient(135deg, #F4B400, #D97706);
      color: #000;
      font-family: 'Poppins', sans-serif;
      font-weight: 800;
      font-size: 22px;
      margin-bottom: 10px;
      box-shadow: 0 4px 12px rgba(244, 180, 0, 0.25);
    }

    .brand-title {
      font-family: 'Poppins', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: var(--secondary);
      letter-spacing: -0.02em;
    }

    .brand-subtitle {
      font-size: 13px;
      font-weight: 700;
      color: var(--primary-dark);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-top: 2px;
    }

    .brand-tagline {
      font-size: 11px;
      font-style: italic;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* ── Document Information Table ────────────────────────── */
    .meta-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 16px 20px;
      margin-bottom: 32px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 24px;
      font-size: 12px;
    }

    .meta-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #E5E7EB;
      padding-bottom: 4px;
    }

    .meta-label { font-weight: 700; color: var(--text-muted); text-transform: uppercase; font-size: 10px; }
    .meta-val { font-weight: 700; color: var(--secondary); }

    /* ── Typography ────────────────────────────────── */
    h1 { font-family: 'Poppins', sans-serif; font-size: 1.75rem; font-weight: 800; margin: 32px 0 14px; color: var(--secondary); line-height: 1.25; }
    h2 { font-family: 'Poppins', sans-serif; font-size: 1.4rem; font-weight: 700; margin: 28px 0 12px; color: var(--secondary); border-bottom: 2px solid #FEF3C7; padding-bottom: 6px; }
    h3 { font-family: 'Poppins', sans-serif; font-size: 1.15rem; font-weight: 700; margin: 22px 0 10px; color: var(--primary-dark); }

    p { margin-bottom: 14px; color: #374151; }
    strong { font-weight: 700; color: var(--secondary); }

    /* ── Callouts ───────────────────────── */
    .callout-box {
      display: flex;
      gap: 14px;
      padding: 16px;
      border-radius: 12px;
      margin: 20px 0;
    }

    .callout-icon { font-size: 18px; shrink: 0; }
    .callout-content { flex: 1; font-size: 13.5px; }

    .callout-info { background: #FEF3C7; border-left: 5px solid #F59E0B; color: #92400E; }
    .callout-tip { background: #EFF6FF; border-left: 5px solid #3B82F6; color: #1E40AF; }
    .callout-warning { background: #FEF2F2; border-left: 5px solid #EF4444; color: #991B1B; }
    .callout-success { background: #ECFDF5; border-left: 5px solid #10B981; color: #065F46; }

    /* ── Lists ───────────────────────── */
    ul, ol { margin: 10px 0 16px 24px; }
    li { margin-bottom: 6px; color: #374151; }
    li::marker { color: var(--primary-dark); font-weight: 700; }

    /* ── Code Blocks ───────────────────────── */
    .code-container {
      margin: 20px 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #374151;
      background: #111827;
      box-shadow: 0 4px 14px rgba(0,0,0,0.15);
    }

    .code-header {
      background: #1F2937;
      padding: 8px 16px;
      font-family: 'Fira Code', monospace;
      font-size: 11px;
      color: #F59E0B;
      font-weight: 700;
      border-bottom: 1px solid #374151;
    }

    pre.code-block {
      padding: 16px 20px;
      overflow-x: auto;
      margin: 0;
    }

    pre.code-block code {
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      color: #F3F4F6;
      line-height: 1.6;
    }

    /* ── Tables ───────────────────────── */
    .table-wrapper {
      margin: 20px 0;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: var(--primary); color: #000; }
    th { padding: 12px 16px; text-align: left; font-weight: 800; font-family: 'Poppins', sans-serif; }
    td { padding: 10px 16px; border-bottom: 1px solid var(--border); color: #374151; }
    tbody tr:nth-child(even) { background: #F9FAFB; }

    /* ── Footer ───────────────────────── */
    .page-footer {
      margin-top: 50px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--text-muted);
    }

    @media print {
      body { font-size: 12pt; }
      .notes-container { padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="watermark">ADYAPAN AI</div>
  <div class="notes-container">
    <!-- Brand Header -->
    <div class="brand-header">
      <div class="brand-logo-badge">A</div>
      <div class="brand-title">ADYAPAN AI</div>
      <div class="brand-subtitle">AI Notes Generator</div>
      <div class="brand-tagline">"Powered by Artificial Intelligence"</div>
    </div>

    <!-- Metadata Card -->
    <div class="meta-card">
      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Subject</span><span class="meta-val">${escapeHtml(subject)}</span></div>
        <div class="meta-item"><span class="meta-label">Topic</span><span class="meta-val">${escapeHtml(topic)}</span></div>
        <div class="meta-item"><span class="meta-label">Difficulty</span><span class="meta-val">${escapeHtml(difficulty)}</span></div>
        <div class="meta-item"><span class="meta-label">Language</span><span class="meta-val">${escapeHtml(language)}</span></div>
        <div class="meta-item"><span class="meta-label">Generated On</span><span class="meta-val">${dateStr}</span></div>
        <div class="meta-item"><span class="meta-label">Generated By</span><span class="meta-val">${escapeHtml(generatedBy)}</span></div>
        <div class="meta-item"><span class="meta-label">Reading Time</span><span class="meta-val">${escapeHtml(readingTime)}</span></div>
        <div class="meta-item"><span class="meta-label">Word Count</span><span class="meta-val">${wordCount.toLocaleString()}</span></div>
        <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Export ID</span><span class="meta-val" style="color: var(--primary-dark);">${escapeHtml(exportId)}</span></div>
      </div>
    </div>

    <!-- Document Content -->
    <div class="notes-body">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div class="page-footer">
      <span>Generated by Adyapan AI &middot; www.adyapanai.com</span>
      <span>Export ID: ${escapeHtml(exportId)} &middot; Confidential</span>
    </div>
  </div>
</body>
</html>`;
}

export function formatNotesBodyHtml(markdown: string): string {
  const cleaned = cleanMarkdown(markdown);
  const result = marked.parse(cleaned);
  return typeof result === "string" ? result : "";
}
