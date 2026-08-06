/**
 * Seed for the Enterprise Subscription System.
 *
 * Populates (idempotently):
 *   1. plans          — free / pro_monthly / pro_yearly / enterprise
 *   2. feature_access — feature → required-plan catalog (grouped by category)
 *   3. usage_limits   — admin-configurable per-feature per-plan quotas
 *
 * Run: npx ts-node prisma/seed-subscription.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/adyapan_ai";

const pool = new Pool({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ─── Plans ────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: "Free",
    code: "free",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "50 AI Requests / day",
      "5 Resume Generations / day",
      "3 Mock Interviews / day",
      "5 PPT Generations / day",
      "10 Note Generations / day",
      "Basic Coding Assistant",
      "Basic Research Tools",
      "Community Support",
    ],
    category: "free",
    recommended: false,
    sortOrder: 0,
    trialDays: 0,
  },
  {
    name: "Pro Monthly",
    code: "pro_monthly",
    priceMonthly: 199,
    priceYearly: 1990,
    features: [
      "Unlimited AI Requests",
      "Unlimited Resumes & ATS Checks",
      "All AI Models (GPT-4o, Claude, Gemini)",
      "Unlimited Cover Letters & LinkedIn Tools",
      "Full Interview & Coding Hub Access",
      "Priority AI Models",
      "Priority Support",
      "No Ads",
    ],
    category: "premium",
    recommended: true,
    sortOrder: 1,
    trialDays: 7,
  },
  {
    name: "Pro Yearly",
    code: "pro_yearly",
    priceMonthly: 1999,
    priceYearly: 1990,
    features: [
      "Everything in Pro Monthly",
      "2 Months Free",
      "Priority AI Models",
      "Priority Support",
      "Advanced Analytics",
    ],
    category: "premium",
    recommended: false,
    sortOrder: 2,
    trialDays: 7,
  },
  {
    name: "Enterprise",
    code: "enterprise",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "University / Institute License",
      "Custom AI Model Access",
      "Dedicated Infrastructure",
      "SSO / SAML Login",
      "Bulk Student Onboarding",
      "Dedicated Success Manager",
      "Custom Feature Development",
      "24×7 Priority Support",
    ],
    category: "enterprise",
    recommended: false,
    sortOrder: 3,
    trialDays: 0,
  },
] as const;

// ─── Feature access catalog ───────────────────────────────────────────────

interface FeatureEntry {
  featureKey: string;
  name: string;
  description: string;
  category: string;
  requiredPlan: string;
  routePattern?: string;
  gated: boolean;
}

const FEATURES: FeatureEntry[] = [
  // Learning Hub
  { featureKey: "notes-generate", name: "AI Notes Generation", description: "Generate study notes from any topic or source", category: "Learning Hub", requiredPlan: "free", routePattern: "^/notes(/|$)", gated: true },
  { featureKey: "flashcards", name: "Flashcards", description: "Auto-generated flashcards from study material", category: "Learning Hub", requiredPlan: "premium", routePattern: "^/flashcards(/|$)", gated: true },
  { featureKey: "quiz", name: "Interactive Quizzes", description: "AI-generated quizzes with instant feedback", category: "Learning Hub", requiredPlan: "premium", routePattern: "^/quiz(/|$)", gated: true },
  { featureKey: "mcq", name: "MCQ Engine", description: "Multiple-choice question generator", category: "Learning Hub", requiredPlan: "premium", routePattern: "^/mcq(/|$)", gated: true },
  { featureKey: "mindmap", name: "Mind Maps", description: "Visual mind-map generation", category: "Learning Hub", requiredPlan: "premium", routePattern: "^/mindmap(/|$)", gated: true },
  { featureKey: "study-planner", name: "Study Planner", description: "AI study schedule generation", category: "Learning Hub", requiredPlan: "free", routePattern: "^/study-planner(/|$)", gated: true },
  { featureKey: "assignment", name: "Assignment Helper", description: "AI-assisted assignment drafting", category: "Learning Hub", requiredPlan: "premium", routePattern: "^/assignment(/|$)", gated: true },
  { featureKey: "aptitude", name: "Aptitude Engine", description: "Aptitude question bank & practice", category: "Learning Hub", requiredPlan: "free", routePattern: "^/aptitude(/|$)", gated: true },

  // Coding Hub
  { featureKey: "coding-assistant", name: "Coding Assistant", description: "Code generation, debugging & explanations", category: "Coding Hub", requiredPlan: "free", routePattern: "^/coding(/|$)", gated: true },
  { featureKey: "technical-engine", name: "Technical Interview Engine", description: "AI technical question engine", category: "Coding Hub", requiredPlan: "premium", routePattern: "^/technical-engine(/|$)", gated: true },
  { featureKey: "reasoning", name: "Reasoning Engine", description: "Logical & analytical reasoning practice", category: "Coding Hub", requiredPlan: "free", routePattern: "^/reasoning(/|$)", gated: true },
  { featureKey: "plagiarism", name: "Plagiarism Checker", description: "AI plagiarism detection", category: "Coding Hub", requiredPlan: "premium", routePattern: "^/plagiarism(/|$)", gated: true },
  { featureKey: "weak-topics", name: "Weak Topic Analysis", description: "Detect weak areas in coding prep", category: "Coding Hub", requiredPlan: "premium", routePattern: "^/weak-topics(/|$)", gated: true },
  { featureKey: "code-runner", name: "Code Runner", description: "Run code in the sandbox", category: "Coding Hub", requiredPlan: "free", routePattern: "^/code(/|$)", gated: false },

  // Resume Hub
  { featureKey: "resume-generate", name: "Resume Generation", description: "AI resume builder", category: "Resume Hub", requiredPlan: "free", routePattern: "^/resume(/|$)", gated: true },
  { featureKey: "resume-improvements", name: "Resume Improvements", description: "AI resume enhancement suggestions", category: "Resume Hub", requiredPlan: "free", routePattern: "^/resume-improvements(/|$)", gated: true },
  { featureKey: "ats-check", name: "ATS Score Check", description: "ATS compatibility scoring", category: "Resume Hub", requiredPlan: "free", routePattern: "^/ats(/|$)", gated: true },
  { featureKey: "cover-letter", name: "Cover Letters", description: "AI cover letter generation", category: "Resume Hub", requiredPlan: "free", routePattern: "^/cover-letter(/|$)", gated: true },
  { featureKey: "linkedin-tools", name: "LinkedIn Tools", description: "LinkedIn profile & post assistant", category: "Resume Hub", requiredPlan: "free", routePattern: "^/linkedin(/|$)", gated: true },

  // Interview Hub
  { featureKey: "mock-interview", name: "Mock Interviews", description: "AI mock interview sessions", category: "Interview Hub", requiredPlan: "free", routePattern: "^/interview(/|$)", gated: true },
  { featureKey: "interview-ai", name: "AI Interviewer", description: "Voice & text AI interviewer", category: "Interview Hub", requiredPlan: "premium", routePattern: "^/interview/ai(/|$)", gated: true },
  { featureKey: "interview-questions", name: "Question Bank", description: "Curated interview question bank", category: "Interview Hub", requiredPlan: "free", routePattern: "^/interview/questions(/|$)", gated: false },

  // Placement Hub
  { featureKey: "placement", name: "Placement Assistant", description: "Placement preparation tools", category: "Placement Hub", requiredPlan: "premium", routePattern: "^/placement(/|$)", gated: true },
  { featureKey: "career", name: "Career Guidance", description: "AI career counselling", category: "Placement Hub", requiredPlan: "free", routePattern: "^/career(/|$)", gated: true },
  { featureKey: "recommendations", name: "Recommendations", description: "Personalised learning recommendations", category: "Placement Hub", requiredPlan: "free", routePattern: "^/recommendations(/|$)", gated: true },
  { featureKey: "job-search", name: "Job Search", description: "Search & discover jobs", category: "Placement Hub", requiredPlan: "free", routePattern: "^/job-search(/|$)", gated: false },
  { featureKey: "linkedin-jobs", name: "LinkedIn Jobs", description: "LinkedIn job listings", category: "Placement Hub", requiredPlan: "free", routePattern: "^/linkedin-jobs(/|$)", gated: false },

  // Research Hub
  { featureKey: "research", name: "AI Research Tools", description: "Deep research & sourcing", category: "Research Hub", requiredPlan: "free", routePattern: "^/research(/|$)", gated: true },
  { featureKey: "research-export", name: "Research Export", description: "Export research in multiple formats", category: "Research Hub", requiredPlan: "premium", routePattern: "^/research/export(/|$)", gated: false },

  // AI Productivity
  { featureKey: "ady-chat", name: "Ady Chat", description: "Conversational AI assistant", category: "AI Productivity", requiredPlan: "free", routePattern: "^/ady-chat(/|$)", gated: true },
  { featureKey: "ppt-generate", name: "PPT Generation", description: "AI presentation builder", category: "AI Productivity", requiredPlan: "free", routePattern: "^/ppt(/|$)", gated: true },
  { featureKey: "avatar", name: "AI Avatar", description: "Generate AI avatars & voiceovers", category: "AI Productivity", requiredPlan: "premium", routePattern: "^/avatar(/|$)", gated: true },
  { featureKey: "productivity", name: "Productivity Tools", description: "AI productivity utilities", category: "AI Productivity", requiredPlan: "premium", routePattern: "^/productivity(/|$)", gated: true },
  { featureKey: "study", name: "Study Assistant", description: "Study material generation", category: "AI Productivity", requiredPlan: "free", routePattern: "^/study(/|$)", gated: true },

  // Storage
  { featureKey: "storage", name: "Cloud Storage", description: "Storage for resumes, notes & files", category: "Storage", requiredPlan: "free", gated: false },
  { featureKey: "resume-storage", name: "Resume Storage", description: "Store unlimited resumes", category: "Storage", requiredPlan: "premium", gated: false },

  // Analytics
  { featureKey: "usage-analytics", name: "Usage Analytics", description: "Detailed usage analytics", category: "Analytics", requiredPlan: "free", gated: false },
  { featureKey: "advanced-analytics", name: "Advanced Analytics", description: "Deep performance analytics", category: "Analytics", requiredPlan: "premium", gated: false },
  { featureKey: "progress", name: "Progress Tracking", description: "Learning progress dashboard", category: "Analytics", requiredPlan: "free", routePattern: "^/progress(/|$)", gated: false },

  // Support
  { featureKey: "community-support", name: "Community Support", description: "Community forum support", category: "Support", requiredPlan: "free", gated: false },
  { featureKey: "priority-support", name: "Priority Support", description: "Priority ticket support", category: "Support", requiredPlan: "premium", gated: false },

  // Security
  { featureKey: "encrypted-storage", name: "Encrypted Storage", description: "Encrypted data at rest", category: "Security", requiredPlan: "premium", gated: false },
  { featureKey: "sso", name: "SSO / SAML", description: "Single sign-on for institutes", category: "Security", requiredPlan: "enterprise", gated: false },
];

// ─── Usage limits (spec-aligned, admin-editable) ──────────────────────────

interface UsageLimitEntry {
  featureKey: string;
  planCode: string;
  dailyLimit?: number | null;
  monthlyLimit?: number | null;
  tokenLimit?: number | null;
}

const USAGE_LIMITS: UsageLimitEntry[] = [
  // Free plan — spec limits
  { featureKey: "ai-requests", planCode: "free", dailyLimit: 50, monthlyLimit: 1500, tokenLimit: 500000 },
  { featureKey: "resume-generate", planCode: "free", dailyLimit: 5, monthlyLimit: 150, tokenLimit: null },
  { featureKey: "mock-interview", planCode: "free", dailyLimit: 3, monthlyLimit: 90, tokenLimit: null },
  { featureKey: "ppt-generate", planCode: "free", dailyLimit: 5, monthlyLimit: 150, tokenLimit: null },
  { featureKey: "notes-generate", planCode: "free", dailyLimit: 10, monthlyLimit: 300, tokenLimit: null },
  { featureKey: "coding-assistant", planCode: "free", dailyLimit: 20, monthlyLimit: 600, tokenLimit: null },
  { featureKey: "research", planCode: "free", dailyLimit: 10, monthlyLimit: 300, tokenLimit: null },
  { featureKey: "ady-chat", planCode: "free", dailyLimit: 50, monthlyLimit: 1500, tokenLimit: null },

  // Premium plan — effectively unlimited (null = no cap)
  { featureKey: "ai-requests", planCode: "pro_monthly", dailyLimit: null, monthlyLimit: null, tokenLimit: 5000000 },
  { featureKey: "ai-requests", planCode: "pro_yearly", dailyLimit: null, monthlyLimit: null, tokenLimit: 5000000 },

  // Enterprise plan — extended quotas
  { featureKey: "ai-requests", planCode: "enterprise", dailyLimit: 1000, monthlyLimit: null, tokenLimit: 20000000 },
];

async function main() {
  console.log("Seeding subscription system...");

  // 1. Plans
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: [...plan.features],
        category: plan.category,
        recommended: plan.recommended,
        sortOrder: plan.sortOrder,
        trialDays: plan.trialDays,
        isActive: true,
      },
      create: {
        name: plan.name,
        code: plan.code,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: [...plan.features],
        category: plan.category,
        recommended: plan.recommended,
        sortOrder: plan.sortOrder,
        trialDays: plan.trialDays,
        isActive: true,
      },
    });
    console.log(`  Plan: ${plan.code}`);
  }

  // 2. Feature access catalog
  for (const f of FEATURES) {
    await prisma.featureAccess.upsert({
      where: { featureKey: f.featureKey },
      update: {
        name: f.name,
        description: f.description,
        category: f.category,
        requiredPlan: f.requiredPlan,
        routePattern: f.routePattern ?? null,
        gated: f.gated,
      },
      create: {
        featureKey: f.featureKey,
        name: f.name,
        description: f.description,
        category: f.category,
        requiredPlan: f.requiredPlan,
        routePattern: f.routePattern ?? null,
        gated: f.gated,
      },
    });
  }
  console.log(`  Feature access rows: ${FEATURES.length}`);

  // 3. Usage limits
  for (const l of USAGE_LIMITS) {
    await prisma.usageLimit.upsert({
      where: { featureKey_planCode: { featureKey: l.featureKey, planCode: l.planCode } },
      update: {
        dailyLimit: l.dailyLimit ?? null,
        monthlyLimit: l.monthlyLimit ?? null,
        tokenLimit: l.tokenLimit ?? null,
        enabled: true,
      },
      create: {
        featureKey: l.featureKey,
        planCode: l.planCode,
        dailyLimit: l.dailyLimit ?? null,
        monthlyLimit: l.monthlyLimit ?? null,
        tokenLimit: l.tokenLimit ?? null,
        enabled: true,
      },
    });
  }
  console.log(`  Usage limit rows: ${USAGE_LIMITS.length}`);

  console.log("Done! Subscription system seeded.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
