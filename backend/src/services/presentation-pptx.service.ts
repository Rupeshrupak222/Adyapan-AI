import PptxGenJS from "pptxgenjs";
import { PresentationSpec } from "./presentation-ai.service";
import { getTheme } from "./presentation-theme.service";

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
        w: 6.0,
        h: 4.0,
      });
    }

    // Cards Grid Section
    if (slideSpec.cards && slideSpec.cards.length > 0) {
      const cards = slideSpec.cards.slice(0, 3);
      cards.forEach((card, cIdx) => {
        const cardX = 7.0;
        const cardY = 2.2 + cIdx * 1.5;

        // Card Container Shape
        slide.addShape(pptx.ShapeType.rect, {
          x: cardX,
          y: cardY,
          w: 5.2,
          h: 1.3,
          fill: { color: cardBgColor },
          line: { color: primaryColor, width: 1 },
        });

        // Card Content
        if (card.value) {
          slide.addText(card.value, {
            x: cardX + 0.3,
            y: cardY + 0.15,
            w: 4.6,
            h: 0.4,
            fontFace: theme.fontHeading,
            fontSize: 18,
            bold: true,
            color: primaryColor,
          });
        }

        slide.addText(card.title, {
          x: cardX + 0.3,
          y: cardY + (card.value ? 0.55 : 0.2),
          w: 4.6,
          h: 0.3,
          fontFace: theme.fontHeading,
          fontSize: 12,
          bold: true,
          color: textColor,
        });

        slide.addText(card.description, {
          x: cardX + 0.3,
          y: cardY + (card.value ? 0.85 : 0.5),
          w: 4.6,
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
