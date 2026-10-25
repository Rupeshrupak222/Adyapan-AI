"use client";

import { useEffect, useState, lazy, Suspense, useMemo, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "@/lib/static-motion";
import {
  Briefcase, DollarSign, Megaphone, Users, Truck, BarChart3,
  Clock, Target, TrendingUp, ChevronRight, Building2, FileText,
  Sparkles, BookOpen, Layers, ArrowRight, Play, CheckCircle2,
  HelpCircle, Shield, Award, Lightbulb, Compass, Filter,
  ChevronDown, ChevronUp, AlertCircle, Check, Search, Rocket,
  Landmark, ShoppingBag, PieChart, Calculator
} from "lucide-react";

const TechnicalMCQsModuleView = lazy(() =>
  import("@/components/placement-hub/TechnicalMCQsModuleView").then(m => ({ default: m.TechnicalMCQsModuleView }))
);
const AptitudeEngineView = lazy(() =>
  import("@/components/aptitude-hub/AptitudeEngineView").then(m => ({ default: m.AptitudeEngineView }))
);
const JobDiscoveryView = lazy(() =>
  import("@/components/job-hub/JobDiscoveryView")
);

interface BusinessHubViewProps {
  setView?: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

type BizTab = "overview" | "cases" | "companies" | "mcqs" | "aptitude" | "interviews" | "jobs";

const TAB_LABELS: Record<BizTab, string> = {
  overview: "Overview",
  cases: "Case Frameworks & Drills",
  companies: "Target Recruiters",
  mcqs: "Business MCQs",
  aptitude: "Aptitude & DI",
  interviews: "Mock Interviews",
  jobs: "Business Jobs",
};

// ─── Management Tracks (Direct 1-Click Launch) ──────────────────────────────
interface ManagementTrack {
  id: string;
  title: string;
  category: string;
  icon: any;
  techId: string;
  desc: string;
  badge: string;
  topics: string[];
}

const MANAGEMENT_TRACKS: ManagementTrack[] = [
  {
    id: "finance",
    title: "Corporate Finance & Valuation",
    category: "Finance",
    icon: DollarSign,
    techId: "tech-finance",
    badge: "High Demand",
    desc: "DCF modeling, working capital, capital budgeting, financial statement ratios, and CAPM.",
    topics: ["DCF & WACC", "Financial Statements", "Working Capital", "Capital Structure"],
  },
  {
    id: "investment-banking",
    title: "Investment Banking & Markets",
    category: "Finance",
    icon: Landmark,
    techId: "tech-investment-banking",
    badge: "Marquee",
    desc: "M&A advisory, LBO valuation, equity research, pitchbooks, and trading multiples.",
    topics: ["M&A Due Diligence", "LBO Modeling", "Trading Multiples", "Debt vs Equity"],
  },
  {
    id: "marketing",
    title: "Digital Marketing & Brand Strategy",
    category: "Marketing",
    icon: Megaphone,
    techId: "tech-digital-marketing",
    badge: "Core",
    desc: "CAC/LTV unit economics, attribution models, SEO/SEM, conversion funnels, and brand positioning.",
    topics: ["CAC & LTV", "Funnel Optimization", "Performance Ads", "Brand Positioning"],
  },
  {
    id: "product-mgmt",
    title: "Product & Project Management",
    category: "General Management",
    icon: Layers,
    techId: "tech-product-mgmt",
    badge: "Popular",
    desc: "PRD design, Agile/Scrum ceremonies, RICE prioritization, product metrics, and go-to-market.",
    topics: ["PRD & User Stories", "RICE Scoring", "Agile & Sprint Planning", "North Star Metrics"],
  },
  {
    id: "supply-chain",
    title: "Operations & Supply Chain",
    category: "Operations",
    icon: Truck,
    techId: "tech-supply-chain",
    badge: "Core",
    desc: "EOQ/JIT inventory control, bullwhip mitigation, logistics procurement, and Six Sigma quality.",
    topics: ["EOQ & JIT", "Bullwhip Effect", "Procurement & Logistics", "Six Sigma"],
  },
  {
    id: "analytics",
    title: "Business Analytics & DI",
    category: "Analytics",
    icon: BarChart3,
    techId: "tech-business-analytics",
    badge: "Analytical",
    desc: "Data-driven decision modeling, KPI dashboards, cohort retention, and business intelligence.",
    topics: ["Data Interpretation", "Cohort Analysis", "KPI Metric Trees", "Executive Dashboards"],
  },
  {
    id: "hrm",
    title: "HRM & Talent Strategy",
    category: "Human Resources",
    icon: Users,
    techId: "tech-hrm",
    badge: "Leadership",
    desc: "Talent acquisition, OKR/KPI appraisal, compensation benchmarks, and organizational culture.",
    topics: ["OKRs & Performance", "Talent Acquisition", "Comp & Benefits", "Change Management"],
  },
  {
    id: "startup",
    title: "Startup & Entrepreneurship",
    category: "General Management",
    icon: Rocket,
    techId: "tech-startup",
    badge: "Venture",
    desc: "Venture funding rounds, burn rate runway, cap tables, product-market fit, and pitching.",
    topics: ["Cap Tables", "Burn & Runway", "Seed to Series A", "Unit Economics"],
  },
];

// ─── Real Management / BBA / MBA Recruiters ─────────────────────────────────
interface RecruiterProfile {
  id: string;
  name: string;
  category: "Consulting" | "Banking" | "FMCG" | "Tech & General";
  pkg: string;
  roles: string[];
  rounds: string[];
  desc: string;
  mcqId?: string;
  actionType: "case" | "mcq" | "interview";
}

const RECRUITERS: RecruiterProfile[] = [
  // Strategy & Consulting
  {
    id: "mckinsey",
    name: "McKinsey & Company",
    category: "Consulting",
    pkg: "25 - 42 LPA",
    roles: ["Business Analyst", "Junior Associate", "Associate Consultant"],
    rounds: ["Solve Game (Digital Assessment)", "Case Interview 1", "Case Interview 2", "Partner / PEI"],
    desc: "Focus on MECE problem-solving, structured top-down synthesis, and Personal Experience Interview (PEI) leadership stories.",
    actionType: "case",
  },
  {
    id: "bcg",
    name: "Boston Consulting Group (BCG)",
    category: "Consulting",
    pkg: "24 - 40 LPA",
    roles: ["Associate", "Management Consultant", "Strategy Analyst"],
    rounds: ["Casey Chatbot AI Assessment", "Round 1 Case + Fit", "Round 2 Partner Case"],
    desc: "Evaluates hypothesis-driven strategy, Casey chatbot quantitative analysis, and actionable business turnaround recommendations.",
    actionType: "case",
  },
  {
    id: "bain",
    name: "Bain & Company",
    category: "Consulting",
    pkg: "23 - 38 LPA",
    roles: ["Associate Consultant", "Private Equity Diligence Analyst"],
    rounds: ["Aptitude & Written Case", "Manager Case Round", "Senior Partner Fit"],
    desc: "Renowned for private equity diligence, 80/20 commercial due diligence, and practical results-driven client execution.",
    actionType: "case",
  },
  {
    id: "deloitte",
    name: "Deloitte Strategy & Operations",
    category: "Consulting",
    pkg: "12 - 20 LPA",
    roles: ["Strategy Analyst", "Business Technology Advisor", "Consultant"],
    rounds: ["Online Aptitude & DI", "Group Discussion / Case Presentation", "Director Interview"],
    desc: "Business model design, digital advisory, supply chain restructuring, and corporate operating models.",
    mcqId: "deloitte",
    actionType: "mcq",
  },
  {
    id: "ey-pwc",
    name: "EY-Parthenon / Strategy& (PwC)",
    category: "Consulting",
    pkg: "14 - 24 LPA",
    roles: ["Strategic Advisory Associate", "Deals & M&A Analyst"],
    rounds: ["Analytical Assessment", "Commercial Case Round", "Partner Fit Round"],
    desc: "Focus on M&A strategy, commercial diligence, market sizing, and corporate transformation.",
    actionType: "case",
  },

  // Banking & Financial Services
  {
    id: "goldman-sachs",
    name: "Goldman Sachs",
    category: "Banking",
    pkg: "22 - 38 LPA",
    roles: ["Investment Banking Analyst", "Global Markets Analyst", "Risk Specialist"],
    rounds: ["HireVue Video Interview", "Aptitude & Financial Math", "Superday 3x Technical Rounds"],
    desc: "Rigorous testing on DCF, 3-statement modeling, trading comps, and macroeconomic market dynamics.",
    mcqId: "tech-investment-banking",
    actionType: "mcq",
  },
  {
    id: "jpmorgan",
    name: "J.P. Morgan & Chase",
    category: "Banking",
    pkg: "20 - 35 LPA",
    roles: ["Corporate Analyst", "Treasury & Payments Analyst", "IB Associate"],
    rounds: ["Pymetrics Assessment", "Financial Modeling Test", "Panel Interview"],
    desc: "Evaluates corporate credit evaluation, treasury solutions, financial structuring, and risk hedging.",
    mcqId: "tech-finance",
    actionType: "mcq",
  },
  {
    id: "morgan-stanley",
    name: "Morgan Stanley",
    category: "Banking",
    pkg: "21 - 36 LPA",
    roles: ["Equity Research Associate", "Wealth Management Analyst"],
    rounds: ["Online Financial Assessment", "Domain Technical Round", "Managing Director Round"],
    desc: "Deep sector modeling, stock pitch defense, EBITDA multiples, and investment thesis structuring.",
    mcqId: "tech-stock-market",
    actionType: "mcq",
  },
  {
    id: "hdfc-icici",
    name: "HDFC Bank & ICICI Bank",
    category: "Banking",
    pkg: "9 - 16 LPA",
    roles: ["Management Trainee", "Credit Underwriting Manager", "Relationship Leader"],
    rounds: ["National Aptitude Test", "Psychometric Test", "Case GD", "Personal Interview"],
    desc: "Commercial banking, working capital credit appraisal, retail asset products, and risk governance.",
    mcqId: "tech-finance",
    actionType: "interview",
  },

  // FMCG & Consumer Brands
  {
    id: "hul",
    name: "Hindustan Unilever (HUL)",
    category: "FMCG",
    pkg: "24 - 36 LPA",
    roles: ["Management Trainee (UFLP)", "Brand Manager", "Customer Development Manager"],
    rounds: ["Profile Screening", "Digital Behavioral Game", "Discovery Center Day (Live Business Case)"],
    desc: "Legendary general management track testing distribution channel dynamics, consumer behavior, and brand P&L ownership.",
    actionType: "case",
  },
  {
    id: "pg",
    name: "Procter & Gamble (P&G)",
    category: "FMCG",
    pkg: "22 - 35 LPA",
    roles: ["Brand Operations Manager", "Product Supply Manager", "Commercial Leader"],
    rounds: ["P&G Peak Performance Assessment", "Grid Challenge (Cognitive)", "3x Behavioral Interviews"],
    desc: "Focus on situational leadership, consumer-first innovation, supply chain resilience, and growth mindset.",
    actionType: "interview",
  },
  {
    id: "itc",
    name: "ITC Limited",
    category: "FMCG",
    pkg: "16 - 28 LPA",
    roles: ["Assistant Manager (Marketing/Ops)", "Supply Chain Planner"],
    rounds: ["Written Business Assessment", "Group Task & Case Study", "Board Interview"],
    desc: "Extensive evaluation of rural distribution, cost optimization, trade marketing, and FMCG operations.",
    actionType: "case",
  },

  // Tech Product & General Management
  {
    id: "amazon-ops",
    name: "Amazon (PM & Ops Pathways)",
    category: "Tech & General",
    pkg: "24 - 45 LPA",
    roles: ["Pathways Operations Manager", "Associate Product Manager", "Category Lead"],
    rounds: ["Online Work Simulation", "Bar Raiser Interview Loop (5x Rounds)"],
    desc: "16 Leadership Principles evaluated ruthlessly with STAR method; fulfillment operations, and customer obsession.",
    actionType: "interview",
  },
  {
    id: "tas",
    name: "Tata Administrative Services (TAS)",
    category: "Tech & General",
    pkg: "20 - 32 LPA",
    roles: ["TAS Management Leader", "Strategic Assistant to MD/CEO"],
    rounds: ["TAS Aptitude & Essay", "Chairman's Group Business Case", "Leadership Committee Interview"],
    desc: "India's premier general management cadre spanning aviation, automobiles, retail, hotels, and technology.",
    actionType: "case",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    category: "Tech & General",
    pkg: "18 - 30 LPA",
    roles: ["Associate Product Manager", "Category Manager", "Growth Specialist"],
    rounds: ["Online Analytics Test", "Product / Business Case Round", "Director Interview"],
    desc: "E-commerce unit economics, GMV growth, pricing algorithms, conversion funnels, and supply logistics.",
    mcqId: "tech-product-mgmt",
    actionType: "mcq",
  },
];

// ─── Case Frameworks & Interactive Drills ───────────────────────────────────
interface CaseFramework {
  id: string;
  name: string;
  subtitle: string;
  formula: string;
  steps: string[];
  clarifyingQuestions: string[];
  proTip: string;
}

const CASE_FRAMEWORKS: CaseFramework[] = [
  {
    id: "profitability",
    name: "Profitability Framework",
    subtitle: "Diagnosing margin compression & root-cause profit loss",
    formula: "Profit = (Price × Volume) - (Fixed Costs + Variable Costs)",
    steps: [
      "Decompose into Revenue vs. Cost branches.",
      "Revenue: Isolate Price vs. Volume across segments, channels, and geographies.",
      "Cost: Segment Fixed (rent, SG&A, depreciation) vs. Variable (COGS, distribution, commission).",
      "Benchmark against industry competitors to identify external vs. internal causes.",
      "Recommend targeted interventions (e.g. price optimization, SKU rationalization, cost trimming)."
    ],
    clarifyingQuestions: [
      "Since when has the profitability decline been observed?",
      "Is the decline company-specific or an industry-wide macroeconomic trend?",
      "Which specific product lines or customer segments are experiencing the steepest decline?"
    ],
    proTip: "Always confirm whether the problem is top-line (revenue) or bottom-line (costs) in your first 2 minutes.",
  },
  {
    id: "market-entry",
    name: "Market Entry & Expansion",
    subtitle: "Evaluating geographic or new product category expansion",
    formula: "Market Attractiveness + Competitive Landscape + Capabilities Fit + Financials / Mode",
    steps: [
      "Assess Market Attractiveness: TAM (Total Addressable Market), CAGR growth rate, and margins.",
      "Analyze Competitive Landscape: Market concentration, moat, barrier to entry, and pricing power.",
      "Evaluate Capabilities Fit: Distribution channels, brand equity, manufacturing, and regulation.",
      "Determine Entry Mode: Organic (build), Inorganic (M&A acquisition), Joint Venture, or Licensing."
    ],
    clarifyingQuestions: [
      "What is the client's core motivation (growth target, diversification, following key customers)?",
      "What is the target ROI horizon or payback period expected by the board?",
      "Are there government regulatory barriers or trade tariffs in the destination market?"
    ],
    proTip: "Synthesize with a clear 'Go / No-Go' verdict supported by 3 strategic pillars and a risk mitigation matrix.",
  },
  {
    id: "pricing",
    name: "Pricing Strategy (3Cs)",
    subtitle: "Optimizing unit price for new launches or margin recovery",
    formula: "Price = Max(Cost Floor, Competitor Reference, Customer Willingness-to-Pay)",
    steps: [
      "Cost-based Pricing: Calculate fully-loaded unit cost + required hurdle margin (provides absolute price floor).",
      "Competitor-based Pricing: Benchmark against direct substitutes, premium brand positioning, or penetration discounts.",
      "Value-based Pricing: Quantify Economic Value to the Customer (EVC) — ROI generated or cost saved.",
      "Explore Tiered / Dynamic Pricing: Freemium, enterprise tiers, bundling, and surge mechanisms."
    ],
    clarifyingQuestions: [
      "Are we launching a disruptive product with no direct substitutes, or an incremental upgrade?",
      "What is our primary goal: maximizing short-term market share or long-term profit margins?",
      "What is the customer's price elasticity of demand?"
    ],
    proTip: "Value-based pricing captures the highest margin; always estimate how much money the solution creates or saves for the buyer.",
  },
  {
    id: "guesstimate",
    name: "Market Sizing & Guesstimates",
    subtitle: "Structured top-down & bottom-up estimation",
    formula: "Market Size = Target Population × Penetration Rate × Purchase Frequency × Average Order Value",
    steps: [
      "Clarify the unit of measurement (Annual Revenue vs. Daily Units sold).",
      "Choose approach: Top-Down (Population demographics) or Bottom-Up (Stores / Transactions).",
      "Segment population: Geography (Urban/Rural) -> Age -> Income brackets.",
      "Apply realistic penetration assumptions using round benchmark numbers.",
      "Sanity-check the final number against known proxies or common sense."
    ],
    clarifyingQuestions: [
      "Are we sizing the total market (TAM) or our client's serviceable obtainable market (SOM)?",
      "Is the metric measured in annual revenue ($/₹) or unit volume?",
      "Are we considering residential consumers, institutional B2B buyers, or both?"
    ],
    proTip: "Interviewers care 90% about your structured logic and arithmetic transparency, and only 10% about the final number.",
  },
  {
    id: "growth-4p",
    name: "Growth & GTM Strategy (4Ps)",
    subtitle: "Commercializing products & scaling revenue",
    formula: "Growth = Acquisition (CAC) + Retention (LTV) + Monetization",
    steps: [
      "Product: Core value prop, product-market fit, and differentiating killer features.",
      "Price: Monetization model, contract terms, discount structure, and margins.",
      "Place: Distribution channels (D2C, retail partnerships, modern trade, marketplaces).",
      "Promotion: Performance marketing funnels, sales team enablement, referral viral loops, and PR."
    ],
    clarifyingQuestions: [
      "Where are we seeing the biggest leakage in the conversion funnel (Awareness, Consideration, or Purchase)?",
      "What is our current Customer Acquisition Cost (CAC) relative to Lifetime Value (LTV)?",
      "Who is the exact Ideal Customer Profile (ICP)?"
    ],
    proTip: "A healthy SaaS or modern business requires an LTV:CAC ratio of at least 3:1.",
  },
];

interface CaseDrill {
  id: string;
  title: string;
  company: string;
  frameworkId: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  prompt: string;
  clarifyingClues: string[];
  keyMath: string;
  solution: string;
}

const CASE_DRILLS: CaseDrill[] = [
  {
    id: "drill-coffee",
    title: "National Coffee Chain Profit Slump",
    company: "McKinsey Style",
    frameworkId: "profitability",
    difficulty: "Intermediate",
    prompt: "A national specialty coffee chain with 450 outlets saw revenues grow by 12% last year, yet operating profits plummeted by 28%. The CEO has hired you to diagnose the issue and advise on turnaround.",
    clarifyingClues: [
      "Revenue grew because the chain launched 60 new suburban stores with higher footfall.",
      "Prices remained constant across all beverage and food menus.",
      "Labor costs rose 35% due to aggressive overtime, and dairy/coffee bean input commodity prices spiked 18%."
    ],
    keyMath: "Revenue: +12% ($450M -> $504M). Variable Costs: +30% ($315M -> $410M). Margin compression from $135M (30%) down to $94M (18.6%).",
    solution: "1. Rationalize store shifts to eliminate unauthorized overtime (saves ~12% labor cost). 2. Renegotiate bulk long-term futures contracts for milk and Arabica beans. 3. Introduce dynamic high-margin premium seasonal drinks (+8% blended ticket size). 4. Close bottom 5% underperforming stores whose lease escalations exceed unit contribution margin.",
  },
  {
    id: "drill-ev-entry",
    title: "European Luxury EV Brand Indian Entry",
    company: "BCG Style",
    frameworkId: "market-entry",
    difficulty: "Advanced",
    prompt: "A German premium electric vehicle manufacturer wants to evaluate entering the Indian automotive market over the next 24 months. How should they approach this decision?",
    clarifyingClues: [
      "Target demographic: Top 1.5% high-net-worth households in Tier-1 metros (Mumbai, Delhi-NCR, Bengaluru).",
      "Import tariffs: Fully Built Units (CBU) face 70-100% customs duty, while Completely Knocked Down (CKD) kits attract only 15-35%.",
      "Charging infrastructure is sparse outside Tier-1 city centers."
    ],
    keyMath: "Premium luxury car segment in India: ~40,000 units/year. EV penetration currently 4% = 1,600 units. Targeting 20% luxury EV market share = 320 units in Year 1 at ₹90L ticket size = ₹288 Cr TAM.",
    solution: "1. Enter via CKD assembly in partnership with an established local facility to circumvent prohibitive 100% CBU tariffs. 2. Bundle proprietary high-speed home wallbox chargers with every purchase to neutralize sparse public charging. 3. Establish flagship 'Experience Lounges' in Delhi, Mumbai, and Bengaluru rather than heavy dealer networks. 4. Go/No-Go Verdict: GO, with phased CKD investment.",
  },
  {
    id: "drill-sizing-mumbai",
    title: "Guesstimate: Daily Swiggy/Zomato Orders in Mumbai",
    company: "Bain Style",
    frameworkId: "guesstimate",
    difficulty: "Beginner",
    prompt: "Estimate the total number of online food delivery orders placed in Mumbai on a typical Saturday.",
    clarifyingClues: [
      "Mumbai metropolitan population: ~21 Million people.",
      "Average household size: ~4.2 persons -> ~5 Million households.",
      "Target income segment: Upper-middle and affluent class (top 35% who order food online)."
    ],
    keyMath: "5M households × 35% target = 1.75M households. On Saturday, 25% of target households place an order = 437,500 household orders. Add bachelor/student ordering pool = ~60,000 orders. Total ~500,000 orders/day.",
    solution: "Total estimate is ~480,000 to 520,000 daily Saturday orders. At an Average Order Value (AOV) of ₹380, this represents a single-day gross merchandise value (GMV) of ~₹19.5 Crore in Mumbai.",
  },
  {
    id: "drill-saas-churn",
    title: "B2B SaaS Growth & Churn Optimization",
    company: "Consulting / VC Style",
    frameworkId: "growth-4p",
    difficulty: "Intermediate",
    prompt: "A marketing-automation B2B SaaS startup has scaled to $10M ARR with 1,000 mid-market customers ($10k ACV), but net revenue retention (NRR) has slipped to 82% due to high Month-3 cancellations.",
    clarifyingClues: [
      "Customer Acquisition Cost (CAC) is $6,000 with an average payback period of 7.2 months.",
      "80% of churned customers report that integration with their legacy CRM took longer than 45 days.",
      "Accounts that integrate within 14 days have an NRR of 118% and expand seats annually."
    ],
    keyMath: "LTV without fix: $10k × (1 / 0.18 churn) = $55.5k. LTV with onboarding fix: $10k × (1 / 0.05 churn) = $200k. Tripling lifetime value per customer acquired.",
    solution: "1. Shift from self-serve setup to a dedicated 14-day white-glove onboarding concierge. 2. Build automated 1-click connectors for Salesforce & HubSpot. 3. Restructure customer success compensation around 90-day product adoption milestones rather than initial contract sign-off.",
  },
];

export function BusinessHubView({ setView, activeModule = "business-hub", theme = "dark" }: BusinessHubViewProps) {
  const router = useRouter();
  const isDark = theme === "dark";

  const c = {
    bg: isDark ? "#080710" : "#f0f4ff",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    surfaceHover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)",
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.4)" : "#94a3b8",
    primary: "#f59e0b",
    primaryDark: "#d97706",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    cardBgHover: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
    goldGlow: "rgba(245,158,11,0.15)",
  };

  const [tab, setTab] = useState<BizTab>("overview");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [recruiterFilter, setRecruiterFilter] = useState<string>("All");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [expandedFramework, setExpandedFramework] = useState<string | null>("profitability");
  const [activeDrill, setActiveDrill] = useState<CaseDrill | null>(null);
  const [revealedClues, setRevealedClues] = useState<Record<string, boolean>>({});
  const [revealedSolution, setRevealedSolution] = useState<Record<string, boolean>>({});
  const [drillSearch, setDrillSearch] = useState<string>("");

  useEffect(() => {
    if (activeModule === "business-mcqs") setTab("mcqs");
    else if (activeModule === "business-aptitude") setTab("aptitude");
    else if (activeModule === "business-interviews") setTab("interviews");
    else if (activeModule === "business-cases") setTab("cases");
    else if (activeModule === "business-jobs") setTab("jobs");
    else if (activeModule === "business-companies") setTab("companies");
    else setTab("overview");
  }, [activeModule]);

  const go = (view: string) => (setView ? setView(view) : router.push(`/dashboard/user?view=${view}`));

  const cardA11y = (action: () => void) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick: action,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        action();
      }
    },
  });

  const launchDomainPractice = (techId: string) => {
    setSelectedCompanyId(techId);
    setTab("mcqs");
  };

  const filteredRecruiters = useMemo(() => {
    if (recruiterFilter === "All") return RECRUITERS;
    return RECRUITERS.filter((r) => r.category === recruiterFilter);
  }, [recruiterFilter]);

  const filteredDrills = useMemo(() => {
    return CASE_DRILLS.filter((d) => {
      const matchesFilter = frameworkFilter === "all" || d.frameworkId === frameworkFilter;
      const matchesSearch = drillSearch.trim() === "" ||
        d.title.toLowerCase().includes(drillSearch.toLowerCase()) ||
        d.prompt.toLowerCase().includes(drillSearch.toLowerCase()) ||
        d.company.toLowerCase().includes(drillSearch.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [frameworkFilter, drillSearch]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="no-page-motion relative flex flex-col h-full min-h-[calc(100vh-120px)]" style={{ color: c.text }}>
      <div className="flex-1 flex flex-col gap-4">
        {/* ── Hub Header ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b pb-4" style={{ borderColor: c.border }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Business Hub</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-500/30 text-amber-500 bg-amber-500/10">BBA & MBA Professional</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight mt-1" style={{ color: c.text }}>
              Management & Consulting <span className="text-amber-500">Career Suite</span>
            </h1>
            <p className="text-xs md:text-sm mt-1 max-w-3xl leading-relaxed" style={{ color: c.textSec }}>
              End-to-end recruitment preparation for top strategy consulting, investment banking, brand management, tech product, and general management roles.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setTab("cases")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-sm"
              style={{ background: c.cardBg, borderColor: c.border, color: c.text }}
            >
              <Lightbulb size={13} className="text-amber-500" />
              <span>Case Drills</span>
            </button>
            <button
              onClick={() => setTab("companies")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors shadow-sm"
              style={{ background: c.cardBg, borderColor: c.border, color: c.text }}
            >
              <Building2 size={13} className="text-amber-500" />
              <span>MBB & Big 4 Recruiters</span>
            </button>
            <button
              onClick={() => go("placement-intelligence")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm"
              style={{ background: c.primary, color: "#000000" }}
            >
              <Target size={13} />
              <span>Readiness Score</span>
            </button>
          </div>
        </div>

        {/* ── Navigation Tabs ───────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 border-b pb-2.5" style={{ borderColor: c.border }}>
          {(Object.keys(TAB_LABELS) as BizTab[]).map((t) => {
            const isActive = tab === t;
            return (
              <motion.button
                key={t}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setTab(t)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5"
                style={{
                  background: isActive ? c.primary : c.surface,
                  color: isActive ? "#000000" : c.textSec,
                  borderColor: isActive ? c.primary : c.border,
                }}
              >
                {t === "cases" && <Lightbulb size={12} className={isActive ? "text-black" : "text-amber-500"} />}
                {t === "companies" && <Building2 size={12} className={isActive ? "text-black" : "text-amber-500"} />}
                {t === "mcqs" && <BookOpen size={12} className={isActive ? "text-black" : "text-amber-500"} />}
                {t === "aptitude" && <BarChart3 size={12} className={isActive ? "text-black" : "text-amber-500"} />}
                {t === "interviews" && <Users size={12} className={isActive ? "text-black" : "text-amber-500"} />}
                {t === "jobs" && <Briefcase size={12} className={isActive ? "text-black" : "text-amber-500"} />}
                <span>{TAB_LABELS[t]}</span>
              </motion.button>
            );
          })}
        </div>

        {/* ── Tab Content ───────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">
          <AnimatePresence mode="wait">
            {/* ═════════ 1. OVERVIEW TAB ═════════ */}
            {tab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                {/* Management Readiness Banner */}
                <div className="p-5 border rounded-2xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${c.cardBg}, ${c.goldGlow})`, borderColor: c.border }}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <Award size={13} /> Management Hiring Gates
                      </span>
                      <h2 className="text-base md:text-lg font-black" style={{ color: c.text }}>BBA & MBA Placement Readiness Framework</h2>
                      <p className="text-xs max-w-2xl leading-relaxed" style={{ color: c.textSec }}>
                        Corporate recruiters assess candidates across 5 core management evaluation gates. Launch practice sessions directly in the domain of your choice.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 shrink-0">
                      {[
                        { label: "Domain Foundations", score: "35% Weight", icon: DollarSign },
                        { label: "Data & Case DI", score: "25% Weight", icon: BarChart3 },
                        { label: "Structured Cases", score: "20% Weight", icon: Lightbulb },
                        { label: "STAR Leadership", score: "10% Weight", icon: Users },
                        { label: "Executive Comms", score: "10% Weight", icon: Award },
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <div key={idx} className="p-2.5 rounded-xl border flex flex-col items-center text-center gap-1" style={{ background: c.surface, borderColor: c.border }}>
                            <Icon size={14} className="text-amber-500" />
                            <span className="text-[10px] font-bold leading-tight" style={{ color: c.text }}>{item.label}</span>
                            <span className="text-[9px] font-black text-amber-500">{item.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 1-Click Launch: 8 Core Management Disciplines */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <BookOpen size={14} /> Core Business Disciplines (1-Click Test Series)
                      </h2>
                      <p className="text-xs" style={{ color: c.textMuted }}>Directly start 15-question assessments in your specialization</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {MANAGEMENT_TRACKS.map((track) => {
                      const Icon = track.icon;
                      return (
                        <motion.div
                          key={track.id}
                          whileHover={{ y: -3, scale: 1.01 }}
                          {...cardA11y(() => launchDomainPractice(track.techId))}
                          className="p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-3 group"
                          style={{ background: c.cardBg, borderColor: c.border }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.primary; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; }}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                <Icon size={18} />
                              </div>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-500 bg-amber-500/10">
                                {track.badge}
                              </span>
                            </div>
                            <h3 className="text-sm font-extrabold group-hover:text-amber-500 transition-colors" style={{ color: c.text }}>
                              {track.title}
                            </h3>
                            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: c.textSec }}>
                              {track.desc}
                            </p>
                          </div>

                          <div className="space-y-2 pt-2 border-t" style={{ borderColor: c.border }}>
                            <div className="flex flex-wrap gap-1">
                              {track.topics.slice(0, 3).map((t) => (
                                <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/5" style={{ color: c.textMuted }}>
                                  {t}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs font-bold text-amber-500 group-hover:translate-x-1 transition-transform">
                              <span>Start Domain Tests</span>
                              <ArrowRight size={13} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Specialized Management Prep Modules */}
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1.5">
                    <Compass size={14} /> Career & Application Tooling
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      {
                        title: "Consulting Case Engine",
                        desc: "Practice role-based interactive voice cases for McKinsey, BCG, and Bain interviews.",
                        icon: Building2,
                        action: () => router.push("/dashboard/interview/engine"),
                        badge: "Voice & AI",
                      },
                      {
                        title: "HR & Behavioral Interview",
                        desc: "Master the STAR method, leadership dilemmas, conflict resolution, and executive presence.",
                        icon: Users,
                        action: () => router.push("/dashboard/interview/hr"),
                        badge: "STAR Method",
                      },
                      {
                        title: "Business Placement Intelligence",
                        desc: "Detailed management readiness report, benchmarked against top B-school standards.",
                        icon: Target,
                        action: () => go("placement-intelligence"),
                        badge: "Analytics",
                      },
                      {
                        title: "MBA SOP Generator",
                        desc: "Craft high-impact Statement of Purpose for top Indian and global business schools.",
                        icon: FileText,
                        action: () => go("prod-sop"),
                        badge: "Admissions",
                      },
                      {
                        title: "Management Cover Letter",
                        desc: "Tailored cover letters for consulting, investment banking, and brand management roles.",
                        icon: FileText,
                        action: () => go("cover-letter"),
                        badge: "Applications",
                      },
                      {
                        title: "Business Job Discovery",
                        desc: "Curated internships and full-time management trainee openings for BBA & MBA graduates.",
                        icon: Briefcase,
                        action: () => go("job-discovery"),
                        badge: "Live Roles",
                      },
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={idx}
                          whileHover={{ y: -2 }}
                          {...cardA11y(item.action)}
                          className="p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-2"
                          style={{ background: c.cardBg, borderColor: c.border }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <Icon size={16} className="text-amber-500 shrink-0" />
                              <h3 className="text-sm font-extrabold" style={{ color: c.text }}>{item.title}</h3>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.surface, color: c.textSec }}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>{item.desc}</p>
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 pt-1">
                            <span>Open Tool</span>
                            <ChevronRight size={13} />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═════════ 2. CASE FRAMEWORKS & DRILLS TAB ═════════ */}
            {tab === "cases" && (
              <motion.div key="cases" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                {/* Header & Filter */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold" style={{ color: c.text }}>Case Interview Frameworks & Interactive Drills</h2>
                    <p className="text-xs" style={{ color: c.textSec }}>
                      Master structured problem solving used in McKinsey, BCG, Bain, and Big 4 strategy interviews.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search drills..."
                        value={drillSearch}
                        onChange={(e) => setDrillSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 rounded-full text-xs border outline-none transition-colors"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
                      />
                    </div>
                  </div>
                </div>

                {/* Framework Selector Pills */}
                <div className="flex flex-wrap gap-1.5 border-b pb-3" style={{ borderColor: c.border }}>
                  <button
                    onClick={() => setFrameworkFilter("all")}
                    className="px-3 py-1 rounded-full text-xs font-bold border transition-colors"
                    style={{
                      background: frameworkFilter === "all" ? c.primary : c.surface,
                      color: frameworkFilter === "all" ? "#000000" : c.textSec,
                      borderColor: frameworkFilter === "all" ? c.primary : c.border,
                    }}
                  >
                    All Frameworks ({CASE_DRILLS.length} Drills)
                  </button>
                  {CASE_FRAMEWORKS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFrameworkFilter(f.id)}
                      className="px-3 py-1 rounded-full text-xs font-bold border transition-colors"
                      style={{
                        background: frameworkFilter === f.id ? c.primary : c.surface,
                        color: frameworkFilter === f.id ? "#000000" : c.textSec,
                        borderColor: frameworkFilter === f.id ? c.primary : c.border,
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>

                {/* Framework Deep Dive Accordion */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Core Consulting Frameworks Library</h3>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {CASE_FRAMEWORKS.map((f) => {
                      const isExpanded = expandedFramework === f.id;
                      return (
                        <div
                          key={f.id}
                          className="border rounded-2xl overflow-hidden transition-all"
                          style={{ background: c.cardBg, borderColor: isExpanded ? c.primary : c.border }}
                        >
                          <div
                            className="p-4 cursor-pointer flex items-center justify-between"
                            onClick={() => setExpandedFramework(isExpanded ? null : f.id)}
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-extrabold" style={{ color: c.text }}>{f.name}</h4>
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-500 bg-amber-500/10">Framework</span>
                              </div>
                              <p className="text-xs" style={{ color: c.textSec }}>{f.subtitle}</p>
                            </div>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>

                          {isExpanded && (
                            <div className="p-4 pt-0 border-t space-y-3" style={{ borderColor: c.border }}>
                              <div className="p-2.5 rounded-xl border bg-black/10 dark:bg-white/5 space-y-1" style={{ borderColor: c.border }}>
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">Core Formula / Tree</span>
                                <div className="text-xs font-mono font-semibold" style={{ color: c.text }}>{f.formula}</div>
                              </div>

                              <div>
                                <span className="text-[11px] font-bold block mb-1.5" style={{ color: c.text }}>Step-by-Step Logic Tree</span>
                                <ol className="space-y-1 list-decimal list-inside text-xs" style={{ color: c.textSec }}>
                                  {f.steps.map((s, idx) => (
                                    <li key={idx} className="leading-relaxed">{s}</li>
                                  ))}
                                </ol>
                              </div>

                              <div>
                                <span className="text-[11px] font-bold block mb-1.5" style={{ color: c.text }}>Clarifying Questions to Ask</span>
                                <ul className="space-y-1 text-xs" style={{ color: c.textSec }}>
                                  {f.clarifyingQuestions.map((q, idx) => (
                                    <li key={idx} className="flex items-start gap-1.5">
                                      <CheckCircle2 size={12} className="text-amber-500 shrink-0 mt-0.5" />
                                      <span>{q}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2">
                                <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                <span style={{ color: c.textSec }}><strong className="text-amber-500">Pro-Tip:</strong> {f.proTip}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Interactive Case Drills */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Interactive Case Simulator</h3>
                      <p className="text-xs" style={{ color: c.textMuted }}>Work through real case study prompts with structured clues and model answers</p>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {filteredDrills.map((drill) => {
                      const isClueRevealed = revealedClues[drill.id];
                      const isSolutionRevealed = revealedSolution[drill.id];

                      return (
                        <div
                          key={drill.id}
                          className="p-5 border rounded-2xl flex flex-col justify-between gap-4 transition-all"
                          style={{ background: c.cardBg, borderColor: c.border }}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-500 bg-amber-500/10">
                                  {drill.company}
                                </span>
                                <h4 className="text-sm font-extrabold mt-1" style={{ color: c.text }}>{drill.title}</h4>
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.surface, color: c.textSec }}>
                                {drill.difficulty}
                              </span>
                            </div>

                            <p className="text-xs leading-relaxed p-3 rounded-xl border bg-black/10 dark:bg-white/5" style={{ borderColor: c.border, color: c.text }}>
                              &ldquo;{drill.prompt}&rdquo;
                            </p>

                            {/* Clues accordion */}
                            <div className="space-y-1.5">
                              <button
                                onClick={() => setRevealedClues((prev) => ({ ...prev, [drill.id]: !prev[drill.id] }))}
                                className="w-full px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors"
                                style={{ background: c.surface, borderColor: c.border, color: c.text }}
                              >
                                <span className="flex items-center gap-1.5 text-amber-500">
                                  <HelpCircle size={13} /> {isClueRevealed ? "Hide Interviewer Clues" : "Reveal Interviewer Clues (3)"}
                                </span>
                                {isClueRevealed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>

                              {isClueRevealed && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-3 rounded-xl border bg-black/5 dark:bg-white/5 space-y-1.5" style={{ borderColor: c.border }}>
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">Clarifying Information</span>
                                  {drill.clarifyingClues.map((clue, idx) => (
                                    <div key={idx} className="text-xs flex items-start gap-1.5" style={{ color: c.textSec }}>
                                      <span className="text-amber-500 font-bold">•</span>
                                      <span>{clue}</span>
                                    </div>
                                  ))}
                                  <div className="mt-2 pt-2 border-t text-xs font-mono" style={{ borderColor: c.border, color: c.text }}>
                                    <strong className="text-amber-500 font-sans">Quantitative Math:</strong> {drill.keyMath}
                                  </div>
                                </motion.div>
                              )}
                            </div>

                            {/* Solution accordion */}
                            <div className="space-y-1.5">
                              <button
                                onClick={() => setRevealedSolution((prev) => ({ ...prev, [drill.id]: !prev[drill.id] }))}
                                className="w-full px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors"
                                style={{ background: isSolutionRevealed ? c.primary : c.surface, borderColor: isSolutionRevealed ? c.primary : c.border, color: isSolutionRevealed ? "#000000" : c.text }}
                              >
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 size={13} /> {isSolutionRevealed ? "Hide Synthesis & Solution" : "View Recommended Synthesis"}
                                </span>
                                {isSolutionRevealed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>

                              {isSolutionRevealed && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30 text-xs leading-relaxed space-y-2" style={{ color: c.text }}>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">Consultant Synthesis & Action Plan</span>
                                  <p>{drill.solution}</p>
                                </motion.div>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: c.border }}>
                            <span className="text-[11px] font-medium" style={{ color: c.textMuted }}>Practice on AI Engine</span>
                            <button
                              onClick={() => router.push("/dashboard/interview/engine")}
                              className="flex items-center gap-1 text-xs font-bold text-amber-500 hover:underline"
                            >
                              <span>Start Voice Case</span>
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═════════ 3. TARGET RECRUITERS TAB ═════════ */}
            {tab === "companies" && (
              <motion.div key="companies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-extrabold" style={{ color: c.text }}>Target BBA & MBA Recruiters</h2>
                    <p className="text-xs" style={{ color: c.textSec }}>
                      Selection processes, compensation packages, and targeted preparation tracks for top management employers.
                    </p>
                  </div>

                  {/* Recruiter Category Filter */}
                  <div className="flex flex-wrap gap-1.5">
                    {["All", "Consulting", "Banking", "FMCG", "Tech & General"].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setRecruiterFilter(cat)}
                        className="px-3 py-1 rounded-full text-xs font-bold border transition-colors"
                        style={{
                          background: recruiterFilter === cat ? c.primary : c.surface,
                          color: recruiterFilter === cat ? "#000000" : c.textSec,
                          borderColor: recruiterFilter === cat ? c.primary : c.border,
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
                  {filteredRecruiters.map((co) => (
                    <motion.div
                      key={co.id}
                      whileHover={{ y: -2 }}
                      className="p-5 border rounded-2xl flex flex-col justify-between gap-3 transition-all"
                      style={{ background: c.cardBg, borderColor: c.border }}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-500 bg-amber-500/10">
                              {co.category}
                            </span>
                            <h3 className="text-base font-black mt-1" style={{ color: c.text }}>{co.name}</h3>
                          </div>
                          <span className="text-[11px] font-black px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-500 bg-amber-500/10 shrink-0">
                            {co.pkg}
                          </span>
                        </div>

                        <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>{co.desc}</p>

                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Target Roles</span>
                          <div className="flex flex-wrap gap-1">
                            {co.roles.map((r) => (
                              <span key={r} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/10 dark:bg-white/5" style={{ color: c.text }}>
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Interview Pipeline</span>
                          <div className="space-y-1">
                            {co.rounds.map((round, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px]" style={{ color: c.textMuted }}>
                                <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-500 text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <span>{round}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 border-t flex items-center gap-2" style={{ borderColor: c.border }}>
                        {co.actionType === "case" && (
                          <button
                            onClick={() => setTab("cases")}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5"
                            style={{ background: c.surface, borderColor: c.border, color: c.text }}
                          >
                            <Lightbulb size={13} className="text-amber-500" />
                            <span>Case Prep</span>
                          </button>
                        )}

                        {co.actionType === "mcq" && (
                          <button
                            onClick={() => {
                              setSelectedCompanyId(co.mcqId || co.id);
                              setTab("mcqs");
                            }}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5"
                            style={{ background: c.surface, borderColor: c.border, color: c.text }}
                          >
                            <BookOpen size={13} className="text-amber-500" />
                            <span>Assessment Bank</span>
                          </button>
                        )}

                        <button
                          onClick={() => router.push(co.category === "Consulting" ? "/dashboard/interview/engine" : "/dashboard/interview/hr")}
                          className="flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          style={{ background: c.primary, color: "#000000" }}
                        >
                          <Users size={13} />
                          <span>Mock Round</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═════════ 4. BUSINESS MCQS TAB ═════════ */}
            {tab === "mcqs" && (
              <motion.div key="mcqs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full space-y-3">
                {selectedCompanyId && (
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-amber-500/10 border-amber-500/30">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                      <Target size={14} />
                      <span>Filtered to: <strong className="capitalize">{selectedCompanyId.replace("tech-", "").replace(/-/g, " ")}</strong></span>
                    </div>
                    <button
                      onClick={() => setSelectedCompanyId("")}
                      className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-500/40 text-amber-500 hover:bg-amber-500/20 transition-colors"
                    >
                      Show All Management Topics
                    </button>
                  </div>
                )}

                <Suspense
                  fallback={
                    <div className="p-10 border rounded-2xl text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                      <Clock size={20} className="text-amber-500 animate-spin mx-auto mb-2" />
                      <p className="text-xs font-bold" style={{ color: c.textMuted }}>Loading Business MCQs Assessment Engine...</p>
                    </div>
                  }
                >
                  <TechnicalMCQsModuleView
                    setView={setView}
                    theme={theme}
                    initialCategory="Management"
                    initialEntityId={selectedCompanyId || undefined}
                  />
                </Suspense>
              </motion.div>
            )}

            {/* ═════════ 5. APTITUDE & DI TAB ═════════ */}
            {tab === "aptitude" && (
              <motion.div key="aptitude" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="w-full space-y-3">
                <div className="p-3 rounded-xl border bg-black/10 dark:bg-white/5 flex items-center justify-between" style={{ borderColor: c.border }}>
                  <div className="flex items-center gap-2 text-xs" style={{ color: c.textSec }}>
                    <BarChart3 size={15} className="text-amber-500 shrink-0" />
                    <span>Focus on <strong>Data Interpretation</strong> (Tables, Graphs, Caselets) and <strong>Commercial Math</strong> (P&L, Ratio, Compound Growth).</span>
                  </div>
                  <button
                    onClick={() => setTab("cases")}
                    className="text-xs font-bold text-amber-500 hover:underline shrink-0 ml-2"
                  >
                    View Guesstimates &rarr;
                  </button>
                </div>

                <Suspense
                  fallback={
                    <div className="p-10 border rounded-2xl text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                      <Clock size={20} className="text-amber-500 animate-spin mx-auto mb-2" />
                      <p className="text-xs font-bold" style={{ color: c.textMuted }}>Loading Business Aptitude Engine...</p>
                    </div>
                  }
                >
                  <AptitudeEngineView setView={setView} activeModule="aptitude-engine" theme={theme} />
                </Suspense>
              </motion.div>
            )}

            {/* ═════════ 6. MOCK INTERVIEWS TAB ═════════ */}
            {tab === "interviews" && (
              <motion.div key="interviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <div>
                  <h2 className="text-base font-extrabold" style={{ color: c.text }}>Management Mock Interview Suites</h2>
                  <p className="text-xs" style={{ color: c.textSec }}>Voice-enabled, AI-assessed interview rooms designed for BBA/MBA competency benchmarks.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <motion.div
                    whileHover={{ y: -2 }}
                    {...cardA11y(() => router.push("/dashboard/interview/hr"))}
                    className="p-6 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-4"
                    style={{ background: c.cardBg, borderColor: c.border }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Users size={20} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-500 bg-amber-500/10">STAR Methodology</span>
                      </div>
                      <h3 className="text-base font-extrabold" style={{ color: c.text }}>HR & Behavioral Leadership Interview</h3>
                      <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                        Master behavioral questions on leadership dilemmas, handling cross-functional conflict, ethical trade-offs, and career transitions.
                      </p>
                      <div className="space-y-1 pt-2">
                        {["STAR Answer Structure Feedback", "Tone & Confidence Analysis", "Competency-based Scoring"].map((pt, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: c.textMuted }}>
                            <Check size={12} className="text-amber-500 shrink-0" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t text-xs font-bold text-amber-500" style={{ borderColor: c.border }}>
                      <span>Start HR Session</span>
                      <ChevronRight size={14} />
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2 }}
                    {...cardA11y(() => router.push("/dashboard/interview/engine"))}
                    className="p-6 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-4"
                    style={{ background: c.cardBg, borderColor: c.border }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Building2 size={20} />
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-500 bg-amber-500/10">Role & Case Engine</span>
                      </div>
                      <h3 className="text-base font-extrabold" style={{ color: c.text }}>Consulting & Domain Interview Engine</h3>
                      <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                        Interactive roleplay with an AI case partner. Practice live consulting cases, financial valuation drills, product sense, and operations bottlenecks.
                      </p>
                      <div className="space-y-1 pt-2">
                        {["Live Voice Interaction", "Hypothesis & Math Feedback", "McKinsey/BCG Partner Evaluation"].map((pt, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs" style={{ color: c.textMuted }}>
                            <Check size={12} className="text-amber-500 shrink-0" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t text-xs font-bold text-amber-500" style={{ borderColor: c.border }}>
                      <span>Start Case Engine</span>
                      <ChevronRight size={14} />
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ═════════ 7. BUSINESS JOBS TAB ═════════ */}
            {/* ═════════ 7. BUSINESS JOBS TAB ═════════ */}
            {tab === "jobs" && (
              <motion.div key="jobs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Corporate Openings</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-500/30 text-amber-500 bg-amber-500/10">BBA & MBA Filter Active</span>
                  </div>
                  <h2 className="text-base font-extrabold mt-1" style={{ color: c.text }}>BBA & MBA Career Opportunities</h2>
                  <p className="text-xs" style={{ color: c.textSec }}>Verified opportunities from top recruiters filtered specifically for management, consulting, finance, marketing, and leadership profiles.</p>
                </div>

                {/* Direct Filter Shortcuts for BBA/MBA Candidates */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { title: "Management Trainee / Leadership", count: "120+ Openings", desc: "Corporate leadership and general management fast-track programs.", q: "Management Trainee MBA" },
                    { title: "Associate Consultant / Strategy", count: "85+ Openings", desc: "McKinsey, BCG, Bain, and Big 4 strategy advisory analyst roles.", q: "Consultant Strategy BBA MBA" },
                    { title: "Investment Banking & Valuation", count: "65+ Openings", desc: "Goldman Sachs, J.P. Morgan, and financial research analyst roles.", q: "Investment Banking Finance MBA" },
                    { title: "Brand Marketing & Growth", count: "140+ Openings", desc: "Brand management, consumer insights, and performance growth.", q: "Brand Manager Marketing MBA" },
                    { title: "Associate Product Manager (APM)", count: "90+ Openings", desc: "Tech product management entry points for graduates.", q: "Associate Product Manager APM" },
                    { title: "Supply Chain & Operations Analyst", count: "110+ Openings", desc: "Logistics, fulfillment, and corporate operations planning.", q: "Operations Supply Chain MBA" },
                  ].map((cat, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -2 }}
                      {...cardA11y(() => {
                        const url = `/dashboard/user?view=job-discovery&q=${encodeURIComponent(cat.q)}`;
                        if (setView) {
                          window.history.pushState(null, "", url);
                          setView("job-discovery");
                        } else {
                          router.push(url);
                        }
                      })}
                      className="p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between gap-2"
                      style={{ background: c.cardBg, borderColor: c.border }}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-extrabold" style={{ color: c.text }}>{cat.title}</h4>
                          <span className="text-[10px] font-bold text-amber-500">{cat.count}</span>
                        </div>
                        <p className="text-xs" style={{ color: c.textSec }}>{cat.desc}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-500 pt-2">
                        <span>Search "{cat.q}" in Discovery</span>
                        <ChevronRight size={13} />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Live Embedded Job Discovery */}
                <div className="border-t pt-6" style={{ borderColor: c.border }}>
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold flex items-center gap-2" style={{ color: c.text }}>
                        <Briefcase size={16} className="text-amber-500" /> Live Discovery Engine
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: c.textSec }}>Explore all corporate vacancies with instant ATS matching and multi-attribute filters.</p>
                    </div>
                  </div>
                  <Suspense fallback={
                    <div className="flex items-center justify-center p-12 text-xs font-bold text-amber-500 gap-2">
                      <Clock size={16} className="animate-spin" /> Loading Business Job Discovery...
                    </div>
                  }>
                    <JobDiscoveryView setView={setView} />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default BusinessHubView;
