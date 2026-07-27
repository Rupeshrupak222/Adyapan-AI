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

  const DIVERSE_SLIDE_IMAGES = [
    { url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200", caption: "Neural Network Architecture & Connectivity" },
    { url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200", caption: "Algorithmic Code Execution & Data Stream" },
    { url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200", caption: "Empirical Performance Metrics & Analytics" },
    { url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200", caption: "Hardware Execution & Processor Topography" },
    { url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200", caption: "Distributed Cloud Infrastructure & Enterprise Nodes" },
    { url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200", caption: "Zero-Trust Cryptographic Security Protocol" },
    { url: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200", caption: "Comparative Metric Evaluation & Trade-offs" },
    { url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200", caption: "Strategic Execution Roadmap & Phase Expansion" },
    { url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200", caption: "Interdisciplinary Research & Integration" },
    { url: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200", caption: "Enterprise Deployment & Synthesis" },
    { url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200", caption: "High-Concurrency Cloud Server Farm" },
    { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200", caption: "Academic Verification & Peer Review" },
    { url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200", caption: "Innovation Lab & Future Horizons" },
    { url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200", caption: "Interactive System Telemetry" },
    { url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200", caption: "Global Deployment Infrastructure" }
  ];

  const chapterTemplates = [
    {
      badge: "EXECUTIVE SUMMARY",
      title: `Introduction & Objectives of ${topic}`,
      subtitle: `Strategic Context & Foundational Scope (${type})`,
      bullets: [
        `Core Architectural Mechanics: Deconstructing foundational principles governing ${topic}.`,
        `Empirical Benchmarking: Evaluating real-world performance metrics across operational parameters.`,
        `Strategic Objectives: Addressing key systemic trade-offs and structural bottlenecks.`
      ],
      cards: [
        { title: "Focus Domain", value: topic.slice(0, 18), description: "Target Research Scope" },
        { title: "Fidelity Target", value: "99.4%", description: "Benchmark Accuracy" }
      ],
      notes: `Welcome to our presentation on ${topic}. In this opening module, we establish the strategic context and primary research objectives.`
    },
    {
      badge: "THEORETICAL FOUNDATIONS",
      title: `Architecture & Algorithmic Mechanics of ${topic}`,
      subtitle: `Mathematical Formulations & Paradigm Synthesis`,
      bullets: [
        `Systemic Abstraction: Formulating mathematical models for ${topic}.`,
        `Modular Interoperability: Ensuring clean separation of concerns and protocol flexibility.`,
        `Fault Tolerance: Guaranteeing stability under anomalous operating workloads.`
      ],
      cards: [
        { title: "System Throughput", value: "10x Speed", description: "Parallel Execution Gain" },
        { title: "Reliability Index", value: "99.99%", description: "Uptime Protocol" }
      ],
      notes: `Here we dive into the theoretical framework governing ${topic}, examining core algorithms and system models.`
    },
    {
      badge: "EMPIRICAL BENCHMARKS",
      title: `Experimental Evaluation & Quantitative Metrics`,
      subtitle: `Benchmarking Performance Across Scaled Workloads`,
      bullets: [
        `Latency Reduction: Achieving low-overhead execution across distributed nodes.`,
        `Resource Utilization: Optimizing memory footprint and processing bandwidth.`,
        `Accuracy Score: Demonstrating empirical superiority against legacy baselines.`
      ],
      cards: [
        { title: "Latency Reduction", value: "-42ms", description: "Average Overhead Savings" },
        { title: "Efficiency Score", value: "94.8/100", description: "Standard Benchmark" }
      ],
      notes: `This slide presents quantitative benchmark results validating the theoretical performance promises of ${topic}.`
    },
    {
      badge: "WORKFLOW & PROTOCOLS",
      title: `Algorithmic Mechanics & Execution Lifecycle`,
      subtitle: `Sequential Processing & Protocol Optimization`,
      bullets: [
        `Initialization Phase: Establishing secure handshake protocols and memory allocation.`,
        `Compute Execution: Running parallelized transformations across optimized kernels.`,
        `Verification & Audit: Enforcing strict integrity validation prior to final output.`
      ],
      cards: [
        { title: "Pipeline Stages", value: "4 Modules", description: "End-to-End Flow" },
        { title: "Encryption Audit", value: "Verified", description: "Zero-Trust Protocol" }
      ],
      notes: `We examine the step-by-step execution lifecycle, highlighting optimization checkpoints throughout the workflow.`
    },
    {
      badge: "REAL-WORLD APPLICATIONS",
      title: `Industry Integration & Deployment Case Studies`,
      subtitle: `Practical Solutions in Enterprise & Academic Environments`,
      bullets: [
        `Enterprise Integration: Deploying ${topic} across high-concurrency production environments.`,
        `Academic Breakthroughs: Accelerating research discoveries with automated insights.`,
        `Scalable Adoption: Reducing operational complexity while maintaining strict compliance.`
      ],
      cards: [
        { title: "Industry Adoption", value: "88%", description: "Target Sector Reach" },
        { title: "Cost Reduction", value: "35% Savings", description: "Operational Efficiency" }
      ],
      notes: `Real-world case studies demonstrate how ${topic} delivers tangible value across industrial and academic implementations.`
    },
    {
      badge: "SECURITY & COMPLIANCE",
      title: `Risk Mitigation & Verification Standards`,
      subtitle: `Safeguarding Data Integrity & System Resilience`,
      bullets: [
        `Zero-Trust Framework: Enforcing end-to-end cryptographic authentication.`,
        `Anomaly Detection: Proactive monitoring for system drift and vulnerabilities.`,
        `Regulatory Alignment: Complying with international academic and data standards.`
      ],
      cards: [
        { title: "Compliance Status", value: "ISO 27001", description: "Certified Architecture" },
        { title: "Security Index", value: "Tier 1", description: "Maximum Protection" }
      ],
      notes: `Security and verification protocols ensure that implementation of ${topic} remains resilient against threats.`
    },
    {
      badge: "COMPARATIVE MODELS",
      title: `Benchmark Trade-Offs & Paradigm Comparison`,
      subtitle: `Evaluating Alternative Architectures against ${topic}`,
      bullets: [
        `Architectural Trade-offs: Balancing compute cost against processing fidelity.`,
        `Model Comparison: Benchmarking ${topic} against traditional alternative solutions.`,
        `Decision Matrix: Guidelines for selecting optimal parameters per deployment.`
      ],
      cards: [
        { title: "Speed Ratio", value: "3.4x Faster", description: "Vs Baseline Model" },
        { title: "Memory Efficiency", value: "48% Less", description: "RAM Footprint" }
      ],
      notes: `We compare ${topic} against legacy frameworks, highlighting key architectural advantages and trade-offs.`
    },
    {
      badge: "SCALABILITY PARADIGMS",
      title: `High-Concurrency & Scalable Infrastructure`,
      subtitle: `Orchestrating Distributed Nodes & Cloud Clusters`,
      bullets: [
        `Distributed Scale: Expanding horizontal capacity without performance degradation.`,
        `Dynamic Auto-Scaling: Allocating compute resources dynamically based on load.`,
        `High Availability: Zero-downtime failover across geo-distributed nodes.`
      ],
      cards: [
        { title: "Max Concurrency", value: "100k Req/s", description: "Stress Benchmark" },
        { title: "Failover SLA", value: "99.999%", description: "Availability Assurance" }
      ],
      notes: `Scalability models illustrate how ${topic} handles peak concurrency workloads smoothly.`
    },
    {
      badge: "STRATEGIC ROADMAP",
      title: `Deployment Phases & Future Developments`,
      subtitle: `Milestones for Production Rollout & Upgrades`,
      bullets: [
        `Phase 1 (Proof of Concept): Initial validation and prototype testing.`,
        `Phase 2 (Staging & Integration): API integration and stress testing.`,
        `Phase 3 (Global Rollout): Full-scale deployment and continuous refinement.`
      ],
      cards: [
        { title: "Rollout Duration", value: "90 Days", description: "Phase Timeline" },
        { title: "Next Milestone", value: "v2.0 Beta", description: "Next Generation" }
      ],
      notes: `Our implementation roadmap outlines the structured phases for deploying and expanding ${topic}.`
    },
    {
      badge: "COST-BENEFIT ANALYSIS",
      title: `Economic Impact & Resource Allocation`,
      subtitle: `Evaluating Capital Expenditure & ROI Metrics`,
      bullets: [
        `Capital Optimization: Allocating compute resources efficiently to maximize throughput.`,
        `Operational Cost Reduction: Minimizing manual maintenance and overhead costs.`,
        `Long-Term Scalability: Future-proofing infrastructure against technical debt.`
      ],
      cards: [
        { title: "Estimated ROI", value: "310%", description: "3-Year Horizon" },
        { title: "Cost Savings", value: "42%", description: "Annual Infrastructure" }
      ],
      notes: `Evaluating the economic model demonstrates significant long-term ROI and operational savings.`
    },
    {
      badge: "EXPERIMENTAL RESULTS",
      title: `Statistical Validation & Empirical Tracing`,
      subtitle: `Confidence Interval Analysis & Verification`,
      bullets: [
        `Statistical Rigor: Conducting variance analysis across multiple execution trials.`,
        `Edge Case Verification: Testing system boundaries under anomalous conditions.`,
        `Dataset Diversity: Benchmarking across varied domain data distributions.`
      ],
      cards: [
        { title: "Confidence Interval", value: "95% CI", description: "Statistical Margin" },
        { title: "Sample Size", value: "1.2M", description: "Total Test Executions" }
      ],
      notes: `Statistical validation confirms consistent performance metrics across varied operational environments.`
    },
    {
      badge: "ENTERPRISE INTEGRATION",
      title: `API Governance & Microservices Architecture`,
      subtitle: `Seamless Integration with Existing Infrastructure`,
      bullets: [
        `API Standardization: Exposing RESTful and gRPC endpoints for seamless interop.`,
        `Event-Driven Architecture: Asynchronous message queuing for high concurrency.`,
        `Legacy Adapter Layer: Connecting modern AI models to legacy enterprise data.`
      ],
      cards: [
        { title: "API Latency", value: "<15ms", description: "p99 Response Time" },
        { title: "System Uptime", value: "99.99%", description: "SLA Guarantee" }
      ],
      notes: `Enterprise integration patterns ensure clean compatibility with modern and legacy stacks.`
    },
    {
      badge: "FUTURE HORIZONS",
      title: `Emerging Trends & Next-Generation Research`,
      subtitle: `Anticipating Technological Breakthroughs`,
      bullets: [
        `Autonomous Optimization: Self-tuning algorithms for dynamic parameter adjustment.`,
        `Cross-Platform Interoperability: Expanding unified support across edge nodes.`,
        `Quantum Readiness: Preparing encryption and algorithmic layers for quantum era.`
      ],
      cards: [
        { title: "Research Horizon", value: "2026-2030", description: "Strategic Scope" },
        { title: "Innovation Index", value: "Top Tier", description: "Market Position" }
      ],
      notes: `Looking forward, emerging innovations will continue driving efficiency gains and capabilities.`
    },
    {
      badge: "CONCLUSION & SUMMARY",
      title: `Summary of Key Contributions & Discussion`,
      subtitle: `Key Takeaways & Open Floor for Q&A`,
      bullets: [
        `Primary Takeaway: ${topic} provides a robust, scalable framework for modern applications.`,
        `Strategic Value: Combining theoretical rigor with practical empirical gains.`,
        `Interactive Q&A: Opening the session to audience feedback and inquiries.`
      ],
      cards: [
        { title: "Support Contact", value: "support@adyapanai.com", description: "Research Collaborations" },
        { title: "AI Platform", value: "www.adyapanai.com", description: "Explore AI Learning Hub" }
      ],
      notes: `Thank you for your attention. We now invite any questions or discussion points regarding ${topic}.`
    }
  ];

  const defaultSlides: PresentationSlideSpec[] = Array.from({ length: slideCount }).map((_, idx) => {
    const slideNum = idx + 1;
    const tpl = chapterTemplates[idx % chapterTemplates.length];
    const imgObj = DIVERSE_SLIDE_IMAGES[idx % DIVERSE_SLIDE_IMAGES.length];
    const layouts: PresentationSlideSpec["layout"][] = ["hero", "split", "cards-grid", "statistics", "timeline", "process", "comparison", "roadmap", "swot"];
    const layout = layouts[idx % layouts.length];

    return {
      id: slideNum,
      layout,
      title: tpl.title,
      subtitle: tpl.subtitle,
      badge: `SLIDE ${slideNum} OF ${slideCount} · ${tpl.badge}`,
      bullets: tpl.bullets,
      cards: tpl.cards,
      images: [
        { url: imgObj.url, alt: topic, caption: `${topic} - ${imgObj.caption}` }
      ],
      icons: ["Cpu", "Zap", "Layers"],
      charts: slideNum % 3 === 0 ? [
        {
          type: "bar",
          title: `Benchmark Metrics Module ${slideNum}`,
          labels: ["Metric A", "Metric B", "Metric C", "Metric D"],
          datasets: [{ label: "Fidelity Score", data: [85, 92, 98, 99.5] }]
        }
      ] : [],
      diagrams: [],
      speakerNotes: tpl.notes,
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

