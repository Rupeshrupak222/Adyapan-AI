import PptxGenJS from "pptxgenjs";
import { PresentationSpec } from "./presentation-ai.service";
import { getTheme } from "./presentation-theme.service";
import { optimizeSlideImage } from "./image-optimization.service";

function hexToPptxColor(hex?: string, fallback = "FFFFFF"): string {
  if (!hex) return fallback;
  return hex.replace("#", "").trim().toUpperCase();
}

export async function generatePresentationPptx(spec: PresentationSpec): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.title = spec.title || "Adyapan AI Presentation";
  pptx.author = "Adyapan AI Engine";

  const theme = spec.theme || getTheme(spec.themeId);
  const bgColor = hexToPptxColor(theme.background, "0F172A");
  const primaryColor = hexToPptxColor(theme.primary, "38BDF8");
  const textColor = hexToPptxColor(theme.textPrimary, "FFFFFF");
  const secTextColor = hexToPptxColor(theme.textSecondary, "94A3B8");
  const cardBgColor = hexToPptxColor(theme.cardBg, "1E293B");

  for (const slideSpec of spec.slides || []) {
    const slide = pptx.addSlide();
    slide.background = { color: bgColor };

    // Slide Header Badge
    if (slideSpec.badge) {
      slide.addText(slideSpec.badge.toUpperCase(), {
        x: 0.8,
        y: 0.4,
        w: 4.0,
        h: 0.3,
        fontFace: theme.fontHeading,
        fontSize: 10,
        bold: true,
        color: primaryColor,
      });
    }

    // Slide Title
    slide.addText(slideSpec.title || "Untitled Slide", {
      x: 0.8,
      y: 0.7,
      w: 11.5,
      h: 0.8,
      fontFace: theme.fontHeading,
      fontSize: 26,
      bold: true,
      color: textColor,
    });

    // Subtitle
    if (slideSpec.subtitle) {
      slide.addText(slideSpec.subtitle, {
        x: 0.8,
        y: 1.5,
        w: 11.5,
        h: 0.4,
        fontFace: theme.fontBody,
        fontSize: 14,
        color: secTextColor,
      });
    }

    // Bullets Section
    if (slideSpec.bullets && slideSpec.bullets.length > 0) {
      const bulletItems = slideSpec.bullets.map(b => ({
        text: b,
        options: {
          fontFace: theme.fontBody,
          fontSize: 14,
          color: textColor,
          bullet: { code: "25BA" },
          spaceAfter: 8,
        },
      }));

      slide.addText(bulletItems, {
        x: 0.8,
        y: 2.2,
        w: 5.5,
        h: 4.2,
      });
    }

    // Native PptxGenJS Charts Section
    if (slideSpec.charts && slideSpec.charts.length > 0) {
      const chartSpec = slideSpec.charts[0];
      const chartType = chartSpec.type === "pie" ? pptx.ChartType.pie : chartSpec.type === "line" ? pptx.ChartType.line : pptx.ChartType.bar;
      const chartData = (chartSpec.datasets || []).map(ds => ({
        name: ds.label,
        labels: chartSpec.labels || [],
        values: ds.data || [],
      }));

      if (chartData.length > 0) {
        slide.addChart(chartType, chartData, {
          x: 6.8,
          y: 2.2,
          w: 5.5,
          h: 4.0,
          title: chartSpec.title || "Data Metrics",
          titleColor: primaryColor,
          showTitle: true,
          chartColors: [primaryColor, "F59E0B", "10B981", "8B5CF6"],
        });
      }
    } else if (slideSpec.images && slideSpec.images.length > 0 && slideSpec.images[0].url) {
      // Optimize image via Sharp and embed into PPTX
      try {
        const optimized = await optimizeSlideImage(slideSpec.images[0].url, 800, 450);
        if (optimized) {
          slide.addImage({
            data: optimized.base64DataUrl,
            x: 6.8,
            y: 2.2,
            w: 5.5,
            h: 3.1,
          });
        }
      } catch (imgErr) {
        console.warn("[Presentation PPTX] Image embedding warning:", imgErr);
      }
    } else if (slideSpec.cards && slideSpec.cards.length > 0) {
      // Cards Grid Section
      const cards = slideSpec.cards.slice(0, 3);
      cards.forEach((card, cIdx) => {
        const cardX = 6.8;
        const cardY = 2.2 + cIdx * 1.4;

        slide.addShape(pptx.ShapeType.rect, {
          x: cardX,
          y: cardY,
          w: 5.5,
          h: 1.25,
          fill: { color: cardBgColor },
          line: { color: primaryColor, width: 1 },
        });

        if (card.value) {
          slide.addText(card.value, {
            x: cardX + 0.3,
            y: cardY + 0.15,
            w: 4.9,
            h: 0.35,
            fontFace: theme.fontHeading,
            fontSize: 18,
            bold: true,
            color: primaryColor,
          });
        }

        slide.addText(card.title, {
          x: cardX + 0.3,
          y: cardY + (card.value ? 0.5 : 0.2),
          w: 4.9,
          h: 0.3,
          fontFace: theme.fontHeading,
          fontSize: 12,
          bold: true,
          color: textColor,
        });

        slide.addText(card.description, {
          x: cardX + 0.3,
          y: cardY + (card.value ? 0.8 : 0.5),
          w: 4.9,
          h: 0.35,
          fontFace: theme.fontBody,
          fontSize: 10,
          color: secTextColor,
        });
      });
    }

    // Speaker Notes
    if (slideSpec.speakerNotes) {
      slide.addNotes(slideSpec.speakerNotes);
    }
  }

  const nodeBuffer = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.from(nodeBuffer as ArrayBuffer);
}

