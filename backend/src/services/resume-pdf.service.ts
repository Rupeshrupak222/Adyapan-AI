import puppeteer, { Browser } from "puppeteer";

let sharedBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.connected) return sharedBrowser;
  if (browserLaunchPromise) return browserLaunchPromise;

  browserLaunchPromise = puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  }).then((browser) => {
    sharedBrowser = browser;
    browserLaunchPromise = null;
    browser.on("disconnected", () => {
      sharedBrowser = null;
    });
    return browser;
  }).catch((err) => {
    browserLaunchPromise = null;
    throw err;
  });

  return browserLaunchPromise;
}

export interface ResumeData {
  title: string;
  template?: string;
  personalInfo: any;
  education: any[];
  experience: any[];
  projects: any[];
  skills: string[];
  certifications: any[];
  achievements?: string[];
  languages?: string[];
}

function esc(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildContactLine(p: any): string {
  const parts: string[] = [];
  if (p.email) parts.push(`<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`);
  if (p.phone) parts.push(`<span>${esc(p.phone)}</span>`);
  if (p.location) parts.push(`<span>${esc(p.location)}</span>`);
  if (p.linkedin) parts.push(`<a href="${esc(p.linkedin)}" target="_blank">LinkedIn</a>`);
  if (p.github) parts.push(`<a href="${esc(p.github)}" target="_blank">GitHub</a>`);
  if (p.portfolio || p.website) parts.push(`<a href="${esc(p.portfolio || p.website)}" target="_blank">Portfolio</a>`);
  return parts.join(' <span class="sep">|</span> ');
}

function buildExperienceHtml(items: any[]): string {
  if (!items?.length) return "";
  return `
    <section>
      <h2>WORK EXPERIENCE</h2>
      ${items.map((e) => `
        <div class="entry">
          <div class="entry-header">
            <strong>${esc(e.role)}</strong><span class="company">${esc(e.company) ? ` — ${esc(e.company)}` : ""}</span>
            <span class="dates">${esc(e.startDate)}${e.endDate ? ` — ${esc(e.endDate)}` : ""}</span>
          </div>
          ${e.description ? `<div class="desc">${esc(e.description).replace(/\n/g, "<br>")}</div>` : ""}
        </div>
      `).join("")}
    </section>`;
}

function buildProjectsHtml(items: any[]): string {
  if (!items?.length) return "";
  return `
    <section>
      <h2>PROJECTS</h2>
      ${items.map((p) => `
        <div class="entry">
          <div class="entry-header">
            <strong>${esc(p.name || p.title)}</strong>
            ${p.techStack ? `<span class="tech">${esc(p.techStack)}</span>` : ""}
          </div>
          ${p.description ? `<div class="desc">${esc(p.description).replace(/\n/g, "<br>")}</div>` : ""}
        </div>
      `).join("")}
    </section>`;
}

function buildEducationHtml(items: any[]): string {
  if (!items?.length) return "";
  return `
    <section>
      <h2>EDUCATION</h2>
      ${items.map((e) => `
        <div class="entry">
          <div class="entry-header">
            <strong>${esc(e.degree)}${e.fieldOfStudy || e.branch ? ` in ${esc(e.fieldOfStudy || e.branch)}` : ""}</strong>
            <span class="dates">${esc(e.startDate)}${e.endDate ? ` — ${esc(e.endDate)}` : ""}</span>
          </div>
          <div class="desc">${esc(e.institution || e.school || e.college)}${e.grade || e.gpa ? ` | GPA: ${esc(e.grade || e.gpa)}` : ""}</div>
        </div>
      `).join("")}
    </section>`;
}

function buildSkillsHtml(items: string[]): string {
  if (!items?.length) return "";
  return `
    <section>
      <h2>TECHNICAL SKILLS</h2>
      <div class="skills-grid">${items.map((s) => `<span class="skill-tag">${esc(s)}</span>`).join("")}</div>
    </section>`;
}

function buildCertificationsHtml(items: any[]): string {
  if (!items?.length) return "";
  return `
    <section>
      <h2>CERTIFICATIONS</h2>
      <ul class="compact-list">
        ${items.map((c) => `<li><strong>${esc(c.name || c.title)}</strong>${c.issuer ? ` — ${esc(c.issuer)}` : ""}${c.date ? ` (${esc(c.date)})` : ""}</li>`).join("")}
      </ul>
    </section>`;
}

function buildAchievementsHtml(items: string[]): string {
  if (!items?.length) return "";
  return `
    <section>
      <h2>ACHIEVEMENTS</h2>
      <ul class="compact-list">
        ${items.map((a) => `<li>${esc(a)}</li>`).join("")}
      </ul>
    </section>`;
}

function buildLanguagesHtml(items: string[]): string {
  if (!items?.length) return "";
  return `
    <section>
      <h2>LANGUAGES</h2>
      <div class="skills-grid">${items.map((l) => `<span class="skill-tag lang">${esc(l)}</span>`).join("")}</div>
    </section>`;
}

// ─── TEMPLATE: MODERN ────────────────────────────────────────────────────────

function modernTemplate(data: ResumeData): string {
  const p = data.personalInfo || {};
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #1e293b; line-height: 1.5; }
  .page { padding: 40px 48px; }
  .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #2563eb; }
  .header h1 { font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 6px; }
  .contact { font-size: 11px; color: #475569; }
  .contact a { color: #2563eb; text-decoration: none; }
  .sep { color: #cbd5e1; margin: 0 4px; }
  section { margin-bottom: 18px; }
  h2 { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.08em;
       border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 10px; }
  .entry { margin-bottom: 12px; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
  .entry-header strong { font-size: 12.5px; color: #0f172a; }
  .company { font-size: 12px; color: #475569; margin-left: 4px; }
  .tech { font-size: 11px; color: #64748b; font-style: italic; margin-left: 8px; }
  .dates { font-size: 11px; color: #64748b; white-space: nowrap; }
  .desc { font-size: 11.5px; color: #334155; margin-top: 3px; line-height: 1.55; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-tag { background: #eff6ff; color: #1e40af; font-size: 11px; padding: 3px 10px; border-radius: 4px; font-weight: 500; }
  .skill-tag.lang { background: #f0fdf4; color: #166534; }
  .compact-list { list-style: none; padding: 0; }
  .compact-list li { font-size: 11.5px; color: #334155; margin-bottom: 3px; padding-left: 12px; position: relative; }
  .compact-list li::before { content: "▸"; position: absolute; left: 0; color: #2563eb; font-size: 10px; }
</style></head><body>
<div class="page">
  <div class="header">
    <h1>${esc(p.fullName || p.name || "Your Name")}</h1>
    <div class="contact">${buildContactLine(p)}</div>
  </div>
  ${p.summary ? `<section><h2>PROFESSIONAL SUMMARY</h2><div class="desc">${esc(p.summary)}</div></section>` : ""}
  ${buildExperienceHtml(data.experience)}
  ${buildProjectsHtml(data.projects)}
  ${buildEducationHtml(data.education)}
  ${buildSkillsHtml(data.skills)}
  ${buildCertificationsHtml(data.certifications)}
  ${buildAchievementsHtml(data.achievements || [])}
  ${buildLanguagesHtml(data.languages || [])}
</div>
</body></html>`;
}

// ─── TEMPLATE: CLASSIC ───────────────────────────────────────────────────────

function classicTemplate(data: ResumeData): string {
  const p = data.personalInfo || {};
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; }
  .page { padding: 44px 52px; }
  .header { margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2.5px solid #1a1a1a; }
  .header h1 { font-size: 26px; font-weight: 700; color: #111; text-transform: uppercase; letter-spacing: 0.04em; }
  .contact { font-size: 11px; color: #555; margin-top: 6px; }
  .contact a { color: #555; text-decoration: underline; }
  .sep { margin: 0 6px; color: #999; }
  section { margin-bottom: 16px; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
       color: #111; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 10px; }
  .entry { margin-bottom: 12px; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
  .entry-header strong { font-size: 12.5px; }
  .company { font-size: 12px; color: #444; }
  .tech { font-size: 11px; color: #666; font-style: italic; margin-left: 8px; }
  .dates { font-size: 11px; color: #666; white-space: nowrap; }
  .desc { font-size: 11.5px; color: #333; margin-top: 3px; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-tag { border: 1px solid #999; font-size: 11px; padding: 2px 10px; border-radius: 2px; }
  .skill-tag.lang { border-color: #2d6a4f; color: #2d6a4f; }
  .compact-list { list-style: disc; padding-left: 18px; }
  .compact-list li { font-size: 11.5px; margin-bottom: 3px; }
</style></head><body>
<div class="page">
  <div class="header">
    <h1>${esc(p.fullName || p.name || "Your Name")}</h1>
    <div class="contact">${buildContactLine(p)}</div>
  </div>
  ${p.summary ? `<section><h2>Professional Summary</h2><div class="desc">${esc(p.summary)}</div></section>` : ""}
  ${buildExperienceHtml(data.experience)}
  ${buildProjectsHtml(data.projects)}
  ${buildEducationHtml(data.education)}
  ${buildSkillsHtml(data.skills)}
  ${buildCertificationsHtml(data.certifications)}
  ${buildAchievementsHtml(data.achievements || [])}
  ${buildLanguagesHtml(data.languages || [])}
</div>
</body></html>`;
}

// ─── TEMPLATE: MINIMAL ───────────────────────────────────────────────────────

function minimalTemplate(data: ResumeData): string {
  const p = data.personalInfo || {};
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #222; line-height: 1.5; font-size: 12px; }
  .page { padding: 36px 44px; }
  .header { margin-bottom: 20px; }
  .header h1 { font-size: 24px; font-weight: 300; color: #111; letter-spacing: 0.02em; }
  .contact { font-size: 11px; color: #666; margin-top: 4px; }
  .contact a { color: #666; text-decoration: none; }
  .sep { margin: 0 4px; color: #ccc; }
  section { margin-bottom: 16px; }
  h2 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em;
       color: #555; margin-bottom: 8px; padding-bottom: 3px; border-bottom: 1px solid #e5e5e5; }
  .entry { margin-bottom: 10px; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
  .entry-header strong { font-size: 12.5px; font-weight: 600; }
  .company { font-size: 11.5px; color: #555; }
  .tech { font-size: 11px; color: #888; font-style: italic; margin-left: 8px; }
  .dates { font-size: 11px; color: #888; white-space: nowrap; }
  .desc { font-size: 11.5px; color: #444; margin-top: 2px; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 5px; }
  .skill-tag { background: #f5f5f5; font-size: 11px; padding: 2px 8px; border-radius: 3px; }
  .skill-tag.lang { background: #ecfdf5; color: #166534; }
  .compact-list { list-style: none; padding: 0; }
  .compact-list li { font-size: 11.5px; margin-bottom: 2px; padding-left: 10px; position: relative; }
  .compact-list li::before { content: "—"; position: absolute; left: 0; color: #aaa; }
</style></head><body>
<div class="page">
  <div class="header">
    <h1>${esc(p.fullName || p.name || "Your Name")}</h1>
    <div class="contact">${buildContactLine(p)}</div>
  </div>
  ${p.summary ? `<section><h2>Summary</h2><div class="desc">${esc(p.summary)}</div></section>` : ""}
  ${buildExperienceHtml(data.experience)}
  ${buildProjectsHtml(data.projects)}
  ${buildEducationHtml(data.education)}
  ${buildSkillsHtml(data.skills)}
  ${buildCertificationsHtml(data.certifications)}
  ${buildAchievementsHtml(data.achievements || [])}
  ${buildLanguagesHtml(data.languages || [])}
</div>
</body></html>`;
}

// ─── TEMPLATE: ELEGANT ───────────────────────────────────────────────────────

function elegantTemplate(data: ResumeData): string {
  const p = data.personalInfo || {};
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; color: #2d3748; line-height: 1.5; }
  .page { padding: 0; }
  .sidebar { background: #1e293b; color: #e2e8f0; padding: 40px 28px; width: 220px; min-height: 100vh; position: absolute; left: 0; top: 0; }
  .sidebar h1 { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 16px; line-height: 1.3; }
  .sidebar .contact-block { font-size: 10.5px; margin-bottom: 24px; line-height: 1.8; }
  .sidebar .contact-block a { color: #93c5fd; text-decoration: none; }
  .sidebar h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin: 16px 0 8px; border-bottom: 1px solid #334155; padding-bottom: 4px; }
  .sidebar .tag { display: inline-block; background: #334155; color: #cbd5e1; font-size: 10px; padding: 2px 8px; border-radius: 3px; margin: 2px 3px 2px 0; }
  .sidebar .lang-tag { background: #14532d; color: #bbf7d0; }
  .main { margin-left: 220px; padding: 36px 40px; }
  .main section { margin-bottom: 18px; }
  .main h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
             color: #1e293b; border-bottom: 2px solid #2563eb; padding-bottom: 4px; margin-bottom: 10px; }
  .entry { margin-bottom: 12px; }
  .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
  .entry-header strong { font-size: 12.5px; color: #0f172a; }
  .company { font-size: 12px; color: #475569; }
  .tech { font-size: 11px; color: #64748b; font-style: italic; margin-left: 8px; }
  .dates { font-size: 11px; color: #64748b; white-space: nowrap; }
  .desc { font-size: 11.5px; color: #334155; margin-top: 3px; }
  .compact-list { list-style: none; padding: 0; }
  .compact-list li { font-size: 11.5px; margin-bottom: 3px; padding-left: 12px; position: relative; }
  .compact-list li::before { content: "▸"; position: absolute; left: 0; color: #2563eb; font-size: 10px; }
</style></head><body>
<div class="page">
  <div class="sidebar">
    <h1>${esc(p.fullName || p.name || "Your Name")}</h1>
    <div class="contact-block">
      ${p.email ? `<div>${esc(p.email)}</div>` : ""}
      ${p.phone ? `<div>${esc(p.phone)}</div>` : ""}
      ${p.location ? `<div>${esc(p.location)}</div>` : ""}
      ${p.linkedin ? `<div><a href="${esc(p.linkedin)}">LinkedIn</a></div>` : ""}
      ${p.github ? `<div><a href="${esc(p.github)}">GitHub</a></div>` : ""}
      ${p.portfolio || p.website ? `<div><a href="${esc(p.portfolio || p.website)}">Portfolio</a></div>` : ""}
    </div>
    ${data.skills?.length ? `<h3>Skills</h3><div>${data.skills.map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div>` : ""}
    ${data.languages?.length ? `<h3>Languages</h3><div>${data.languages.map((l) => `<span class="tag lang-tag">${esc(l)}</span>`).join("")}</div>` : ""}
    ${data.certifications?.length ? `<h3>Certifications</h3><div style="font-size:10.5px;line-height:1.7">${data.certifications.map((c) => `<div>${esc(c.name || c.title)}${c.issuer ? `<br><span style="color:#94a3b8">${esc(c.issuer)}</span>` : ""}</div>`).join("")}</div>` : ""}
  </div>
  <div class="main">
    ${p.summary ? `<section><h2>Professional Summary</h2><div class="desc">${esc(p.summary)}</div></section>` : ""}
    ${buildExperienceHtml(data.experience)}
    ${buildProjectsHtml(data.projects)}
    ${buildEducationHtml(data.education)}
    ${buildAchievementsHtml(data.achievements || [])}
  </div>
</div>
</body></html>`;
}

// ─── TEMPLATE SELECTOR ───────────────────────────────────────────────────────

const TEMPLATES: Record<string, (data: ResumeData) => string> = {
  modern: modernTemplate,
  classic: classicTemplate,
  minimal: minimalTemplate,
  elegant: elegantTemplate,
};

function renderTemplate(data: ResumeData): string {
  const key = (data.template || "modern").toLowerCase();
  const fn = TEMPLATES[key] || TEMPLATES.modern;
  return fn(data);
}

// ─── PDF GENERATION ──────────────────────────────────────────────────────────

export async function generateResumePdf(data: ResumeData): Promise<Buffer> {
  const html = renderTemplate(data);

  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}
