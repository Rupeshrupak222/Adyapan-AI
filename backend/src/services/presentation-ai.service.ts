import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { getTheme, PresentationTheme } from "./presentation-theme.service";
import { searchStockImage } from "./stock-image.service";


export interface PresentationCardSpec {
  title: string;
  value?: string;
  description: string;
  icon?: string;
}

export interface PresentationImageSpec {
  url: string;
  alt: string;
  caption?: string;
}

export interface PresentationChartSpec {
  type: "bar" | "line" | "pie" | "doughnut" | "radar";
  title: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

export interface PresentationDiagramSpec {
  type: "flowchart" | "architecture" | "timeline" | "sequence" | "mindmap";
  code: string;
  description?: string;
}

export interface PresentationSlideSpec {
  id: number;
  layout:
    | "hero"
    | "split"
    | "timeline"
    | "process"
    | "comparison"
    | "cards-grid"
    | "statistics"
    | "swot"
    | "pyramid"
    | "roadmap"
    | "quote"
    | "infographic"
    | "thank-you";
  title: string;
  subtitle?: string;
  badge?: string;
  bullets?: string[];
  cards?: PresentationCardSpec[];
  images?: PresentationImageSpec[];
  icons?: string[];
  charts?: PresentationChartSpec[];
  diagrams?: PresentationDiagramSpec[];
  speakerNotes?: string;
  speakingTimeMinutes?: number;
}

export interface PresentationSpec {
  title: string;
  subtitle?: string;
  presentationType: string;
  targetAudience?: string;
  themeId: string;
  theme: PresentationTheme;
  slides: PresentationSlideSpec[];
}

export interface PresentationGenerateOptions {
  topic: string;
  presentationType?: string;
  slideCount?: number;
  audience?: string;
  language?: string;
  themePreference?: string;
}

export async function generatePresentationSpec(
  options: PresentationGenerateOptions
): Promise<PresentationSpec> {
  const topic = options.topic || "Quantum Computing & AI Solutions";
  const type = options.presentationType || "Academic";
  const slideCount = Math.max(3, Math.min(50, options.slideCount || 10));
  const audience = options.audience || "General Academic Audience";
  const language = options.language || "English";
  const themeId = options.themePreference || "corporate-blue";
  const theme = getTheme(themeId);

  const prompt = `You are a world-class presentation designer and keynote author (similar to Canva AI, Gamma, and Beautiful.ai). Create a visual, publication-grade presentation specification for:
- Topic: "${topic}"
- Type: ${type}
- Target Slides: ${slideCount} slides
- Audience: ${audience}
- Language: ${language}

CRITICAL VISUAL & EMOJI RULES:
1. EMOJIS ARE MANDATORY: Include 1-2 expressive, contextual emojis in EVERY slide badge, title, bullet point, and card header (e.g., "🤖 KEYNOTE SLIDE", "✨ What is Artificial Intelligence?", "🧠 AI refers to computer systems...", "🚀 10x Processing Speed").
2. NEVER create plain text-only slides. Every slide MUST have rich visual cards, metrics, diagrams, or charts.
3. Vary layouts across slides: "hero", "split", "timeline", "process", "comparison", "cards-grid", "statistics", "swot", "roadmap", "quote", "infographic", "thank-you".
4. Include relevant royalty-free Unsplash/Pexels image search queries in the "images" array for every slide.
5. Include Lucide icons in the "icons" array (e.g. "Cpu", "ShieldCheck", "Zap", "Layers", "BarChart", "Rocket").
6. Include speakerNotes with structured, engaging talking points for every slide.

Return ONLY a valid JSON object matching this schema:
{
  "title": "✨ ${topic}",
  "subtitle": "💡 Comprehensive Academic Keynote Presentation",
  "presentationType": "${type}",
  "targetAudience": "${audience}",
  "themeId": "${themeId}",
  "slides": [
    {
      "id": 1,
      "layout": "hero",
      "title": "✨ ${topic}",
      "subtitle": "🚀 Pioneering Advances in AI & Technology",
      "badge": "🤖 Keynote Presentation",
      "bullets": [
        "🧠 Core Architectural Foundations & Algorithmic Design",
        "📊 Empirical Performance Benchmarks & Accuracy Metrics",
        "⚡ Strategic Industrial Roadmap & Future Applications"
      ],
      "cards": [
        { "title": "🎯 Target Length", "value": "${slideCount} Slides", "description": "Structured Breakdown" },
        { "title": "⚡ Fidelity Score", "value": "99.4%", "description": "Empirical Accuracy" }
      ],
      "images": [
        { "url": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200", "alt": "${topic} Illustration", "caption": "Modern Quantum Processor Architecture" }
      ],
      "icons": ["Cpu", "Zap", "ShieldCheck"],
      "charts": [],
      "diagrams": [],
      "speakerNotes": "Welcome everyone. Today we present a comprehensive breakdown of ${topic} covering key theoretical and practical developments.",
      "speakingTimeMinutes": 2
    }
  ]
}`;

  const defaultSlides: PresentationSlideSpec[] = Array.from({ length: slideCount }).map((_, idx) => {
    const slideNum = idx + 1;
    if (slideNum === 1) {
      return {
        id: 1,
        layout: "hero",
        title: `✨ ${topic}`,
        subtitle: "🚀 Keynote Academic & Professional Presentation",
        badge: `🤖 ${type} Presentation`,
        bullets: [
          `🧠 Comprehensive Theoretical Framework of ${topic}`,
          "📊 Empirical Benchmarking & Performance Data",
          "⚡ Strategic Roadmap & Practical Applications"
        ],
        cards: [
          { title: "🎯 Presentation Length", value: `${slideCount} Slides`, description: "Structured Modules" },
          { title: "🔥 Target Audience", value: audience, description: "Professional Level" }
        ],
        images: [
          { url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200", alt: topic, caption: "Modern Technological Infrastructure" }
        ],
        icons: ["Cpu", "Zap", "Layers"],
        charts: [],
        diagrams: [],
        speakerNotes: `Welcome everyone. Today we examine ${topic} in detail across ${slideCount} structured slides.`,
        speakingTimeMinutes: 2
      };
    }

    if (slideNum === slideCount) {
      return {
        id: slideNum,
        layout: "thank-you",
        title: "✨ Conclusion & Thank You",
        subtitle: "💬 Questions & Discussion",
        badge: "🎉 Final Summary Slide",
        bullets: [
          "🎯 Summary of Key Academic Findings",
          "💡 Open Q&A Session & Discussion",
          "🌐 Further References & Contact Details"
        ],
        cards: [
          { title: "📧 Support Email", value: "support@adyapanai.com", description: "Inquiries & Collaboration" },
          { title: "🚀 AI Hub Platform", value: "www.adyapanai.com", description: "AI Learning Hub" }
        ],
        images: [],
        icons: ["CheckCircle2", "Sparkles", "Rocket"],
        charts: [],
        diagrams: [],
        speakerNotes: "Thank you for your time. I am now happy to open the floor to any questions.",
        speakingTimeMinutes: 3
      };
    }

    const layouts: PresentationSlideSpec["layout"][] = ["split", "cards-grid", "statistics", "timeline", "process", "comparison", "roadmap", "swot"];
    const layout = layouts[(idx - 1) % layouts.length];
    const emojis = ["🧠", "⚡", "🔬", "📊", "🎯", "🛡️", "🌐", "💡", "🚀"];
    const emo = emojis[idx % emojis.length];

    return {
      id: slideNum,
      layout,
      title: `${emo} Slide ${slideNum}: ${topic} Analysis`,
      subtitle: `🔍 Detailed Investigation & Data Insights (${type})`,
      badge: `📌 Module ${slideNum}`,
      bullets: [
        `🧠 Key Architectural Principle ${slideNum}.1`,
        `📊 Empirical Performance Metric ${slideNum}.2`,
        `⚡ Operational Best Practice ${slideNum}.3`
      ],
      cards: [
        { title: "🚀 Efficiency Gain", value: `${30 + slideNum * 3}%`, description: "Measured Performance Optimization" },
        { title: "🛡️ System Reliability", value: "99.9%", description: "Fault-Tolerant Execution" }
      ],
      images: [
        { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200", alt: `${topic} Module ${slideNum}`, caption: `System Architecture Diagram ${slideNum}` }
      ],
      icons: ["Layers", "BarChart", "Cpu"],
      charts: slideNum % 3 === 0 ? [
        {
          type: "bar",
          title: `📊 Benchmark Metrics Module ${slideNum}`,
          labels: ["Metric A", "Metric B", "Metric C", "Metric D"],
          datasets: [{ label: "Fidelity Score", data: [85, 92, 98, 99.5] }]
        }
      ] : [],
      diagrams: [],
      speakerNotes: `In Slide ${slideNum}, we analyze the core metrics and operational parameters of ${topic}.`,
      speakingTimeMinutes: 2
    };
  });

  const fallback: PresentationSpec = {
    title: topic,
    subtitle: "Comprehensive Academic Keynote Presentation",
    presentationType: type,
    targetAudience: audience,
    themeId,
    theme,
    slides: defaultSlides,

  };

  try {
    const result = await generateJSON<PresentationSpec>(
      "You are a world-class keynote author and presentation JSON generator.",
      prompt,
      { model: "moonshotai/kimi-k2.6", maxTokens: 16000, temperature: 0.4 },
      fallback
    );
    result.theme = getTheme(result.themeId || themeId);

    // Enhance images with authentic Unsplash / Pexels stock images
    for (const slide of result.slides || []) {
      if (!slide.images || slide.images.length === 0 || slide.images[0]?.url.includes("example")) {
        const stock = await searchStockImage(`${topic} ${slide.title}`);
        slide.images = [
          { url: stock.url, alt: stock.alt, caption: `${slide.title} — ${stock.source.toUpperCase()} Visual` }
        ];
      }
    }

    return result;
  } catch (err) {
    console.warn("[Presentation AI] Falling back to default presentation spec:", err);
    return fallback;
  }
}

