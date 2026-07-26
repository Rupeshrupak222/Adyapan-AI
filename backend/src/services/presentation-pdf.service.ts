import puppeteer from "puppeteer";
import { PresentationSpec } from "./presentation-ai.service";
import { getTheme } from "./presentation-theme.service";

function escapeXml(text: string): string {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generatePresentationPdf(spec: PresentationSpec): Promise<Buffer> {
  const theme = spec.theme || getTheme(spec.themeId || "corporate-blue");
  const title = spec.title || "Academic Keynote Presentation";

  const slidesHtml = (spec.slides || []).map((slide, idx) => {
    const layout = slide.layout || "split";
    const bulletsHtml = (slide.bullets || [])
      .map(b => `<li class="bullet-item"><span class="bullet-dot"></span><span>${escapeXml(b)}</span></li>`)
      .join("");

    const cardsHtml = (slide.cards || [])
      .map(c => `
        <div class="card-box">
          ${c.value ? `<div class="card-val">${escapeXml(c.value)}</div>` : ""}
          <div class="card-title">${escapeXml(c.title)}</div>
          <div class="card-desc">${escapeXml(c.description)}</div>
        </div>
      `)
      .join("");

    const imagesHtml = (slide.images || [])
      .map(img => `
        <div class="image-wrapper">
          <img src="${img.url}" alt="${escapeXml(img.alt)}" class="slide-img" />
          ${img.caption ? `<div class="image-caption">${escapeXml(img.caption)}</div>` : ""}
        </div>
      `)
      .join("");

    const iconsHtml = (slide.icons || [])
      .map(ic => `<span class="icon-tag">${escapeXml(ic)}</span>`)
      .join("");

    const chartHtml = (slide.charts && slide.charts.length > 0)
      ? slide.charts.map(ch => `
        <div class="chart-container">
          <div class="chart-title">${escapeXml(ch.title)}</div>
          <canvas id="chart-${idx}" class="chart-canvas" data-chart='${JSON.stringify(ch)}'></canvas>
        </div>
      `).join("")
      : "";

    const diagramHtml = (slide.diagrams && slide.diagrams.length > 0)
      ? slide.diagrams.map(d => `
        <div class="mermaid-diagram">
          <pre class="mermaid">${escapeXml(d.code)}</pre>
          ${d.description ? `<p class="diagram-desc">${escapeXml(d.description)}</p>` : ""}
        </div>
      `).join("")
      : "";

    return `
      <div class="slide-page">
        <div class="slide-header">
          <div class="badge">${escapeXml(slide.badge || `SLIDE ${idx + 1} OF ${spec.slides.length}`)}</div>
          <h2 class="slide-title">${escapeXml(slide.title)}</h2>
          ${slide.subtitle ? `<h3 class="slide-subtitle">${escapeXml(slide.subtitle)}</h3>` : ""}
        </div>

        <div class="slide-body layout-${layout}">
          <div class="left-col">
            ${bulletsHtml ? `<ul class="bullet-list">${bulletsHtml}</ul>` : ""}
            ${chartHtml}
            ${diagramHtml}
          </div>
          <div class="right-col">
            ${imagesHtml}
            ${cardsHtml ? `<div class="cards-grid">${cardsHtml}</div>` : ""}
          </div>
        </div>

        ${slide.speakerNotes ? `
          <div class="speaker-notes">
            <span class="notes-label">SPEAKER NOTES:</span> "${escapeXml(slide.speakerNotes)}"
          </div>
        ` : ""}

        <div class="slide-footer">
          <span>Adyapan AI Keynote Engine &middot; ${escapeXml(title)}</span>
          <div class="icons-list">${iconsHtml}</div>
          <span>Slide ${idx + 1}</span>
        </div>
      </div>
    `;
  }).join("\n");

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

    @page {
      size: 297mm 210mm; /* A4 Widescreen Landscape */
      margin: 0;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', system-ui, sans-serif;
      background: ${theme.background || "#0f172a"};
      color: ${theme.textPrimary || "#ffffff"};
      -webkit-print-color-adjust: exact;
    }

    .slide-page {
      width: 297mm;
      height: 210mm;
      page-break-after: always;
      break-after: page;
      position: relative;
      padding: 30px 45px 25px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: ${theme.background || "#0f172a"};
      overflow: hidden;
    }

    .slide-header { margin-bottom: 12px; }

    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      color: ${theme.primary || "#f59e0b"};
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 6px;
    }

    .slide-title {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      margin: 0 0 4px;
      color: ${theme.textPrimary || "#ffffff"};
      line-height: 1.25;
    }

    .slide-subtitle {
      font-size: 14px;
      font-weight: 500;
      color: ${theme.textSecondary || "#94a3b8"};
      margin: 0;
    }

    .slide-body {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 10px;
      margin-bottom: 10px;
      align-items: start;
    }

    .bullet-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bullet-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      line-height: 1.6;
      color: ${theme.textPrimary || "#e2e8f0"};
    }

    .bullet-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: ${theme.primary || "#f59e0b"};
      margin-top: 7px;
      flex-shrink: 0;
    }

    .cards-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .card-box {
      background: ${theme.cardBg || "rgba(255,255,255,0.03)"};
      border: 1px solid ${theme.cardBorder || "rgba(255,255,255,0.1)"};
      border-radius: 14px;
      padding: 14px 18px;
    }

    .card-val {
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: ${theme.primary || "#f59e0b"};
      margin-bottom: 2px;
    }

    .card-title {
      font-weight: 700;
      font-size: 13px;
      color: ${theme.textPrimary || "#ffffff"};
    }

    .card-desc {
      font-size: 11px;
      color: ${theme.textSecondary || "#94a3b8"};
      margin-top: 2px;
    }

    .image-wrapper {
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid ${theme.cardBorder || "rgba(255,255,255,0.1)"};
      max-height: 220px;
    }

    .slide-img {
      width: 100%;
      height: 180px;
      object-fit: cover;
      display: block;
    }

    .image-caption {
      padding: 6px 12px;
      font-size: 10px;
      background: rgba(0,0,0,0.4);
      color: ${theme.textSecondary || "#94a3b8"};
      text-align: center;
    }

    .speaker-notes {
      background: rgba(245, 158, 11, 0.08);
      border-left: 3px solid ${theme.primary || "#f59e0b"};
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-style: italic;
      color: ${theme.textSecondary || "#cbd5e1"};
      margin-top: 10px;
    }

    .notes-label {
      font-weight: 800;
      font-style: normal;
      color: ${theme.primary || "#f59e0b"};
      margin-right: 4px;
    }

    .slide-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 10px;
      font-size: 10px;
      color: ${theme.textSecondary || "#64748b"};
    }

    .icons-list {
      display: flex;
      gap: 6px;
    }

    .icon-tag {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 9px;
      font-weight: 700;
      color: ${theme.primary || "#f59e0b"};
    }
  </style>
</head>
<body>
  ${slidesHtml}

  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
    document.querySelectorAll('.chart-canvas').forEach(canvas => {
      const dataStr = canvas.getAttribute('data-chart');
      if (dataStr) {
        try {
          const spec = JSON.parse(dataStr);
          new Chart(canvas.getContext('2d'), {
            type: spec.type || 'bar',
            data: {
              labels: spec.labels || [],
              datasets: (spec.datasets || []).map(ds => ({
                label: ds.label,
                data: ds.data,
                backgroundColor: 'rgba(245, 158, 11, 0.6)',
                borderColor: '#f59e0b',
                borderWidth: 2
              }))
            },
            options: { responsive: true, maintainAspectRatio: false }
          });
        } catch (e) {}
      }
    });
  </script>
</body>
</html>`;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setContent(fullHtml, { waitUntil: "networkidle0", timeout: 60000 });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("[Presentation PDF] Puppeteer export error:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
