// ─── Feature Key Registry ─────────────────────────────────────────────────────
// Single source of truth for every usage-limited feature on the platform.
// Backend routes, middleware, services and frontend views must all reference
// these keys — never display names or ad-hoc strings.

export const FeatureKey = {
  // Learning — 10 free attempts / month
  STUDY_ASSISTANT: "STUDY_ASSISTANT",
  NOTES_GENERATOR: "NOTES_GENERATOR",
  QUIZ_GENERATOR: "QUIZ_GENERATOR",
  ASSIGNMENT_GENERATOR: "ASSIGNMENT_GENERATOR",
  MIND_MAPS: "MIND_MAPS",
  FLASHCARDS: "FLASHCARDS",

  // Research — 10 free attempts / month
  RESEARCH_PAPER_AI: "RESEARCH_PAPER_AI",
  PLAGIARISM_CHECKER: "PLAGIARISM_CHECKER",

  // Placement — 10 free attempts / month
  AI_APTITUDE_ENGINE: "AI_APTITUDE_ENGINE",
  TECHNICAL_MCQS: "TECHNICAL_MCQS",

  // Productivity — 10 free attempts / month
  AI_CHAT_ASSISTANT: "AI_CHAT_ASSISTANT",

  // Learning / Productivity — 3 free attempts / month
  STUDY_PLANNER: "STUDY_PLANNER",
  CODING_ROADMAP: "CODING_ROADMAP",

  // Coding — 3 free attempts / month
  GITHUB_PORTFOLIO_BUILDER: "GITHUB_PORTFOLIO_BUILDER",

  // Resume — 3 free attempts / month
  RESUME_UPLOAD: "RESUME_UPLOAD",
  RESUME_BUILDER: "RESUME_BUILDER",
  ATS_CHECKER: "ATS_CHECKER",
  COVER_LETTER_GENERATOR: "COVER_LETTER_GENERATOR",
  LINKEDIN_OPTIMIZER: "LINKEDIN_OPTIMIZER",

  // Interviews — Premium-only, 5 attempts / month per interview type
  INTERVIEW_ENGINE: "INTERVIEW_ENGINE",
  TECHNICAL_INTERVIEW: "TECHNICAL_INTERVIEW",
  HR_INTERVIEW: "HR_INTERVIEW",
} as const;

export type FeatureKeyValue = (typeof FeatureKey)[keyof typeof FeatureKey];

export type PlanCode = "free" | "premium" | "pro" | "enterprise";

/** Default free-tier monthly limits (Group A: 10, Group B: 3, Interviews: 0 / Premium required). */
export const DEFAULT_FREE_LIMITS: Record<FeatureKeyValue, number> = {
  [FeatureKey.STUDY_ASSISTANT]: 10,
  [FeatureKey.NOTES_GENERATOR]: 10,
  [FeatureKey.QUIZ_GENERATOR]: 10,
  [FeatureKey.ASSIGNMENT_GENERATOR]: 10,
  [FeatureKey.MIND_MAPS]: 10,
  [FeatureKey.FLASHCARDS]: 10,
  [FeatureKey.RESEARCH_PAPER_AI]: 10,
  [FeatureKey.PLAGIARISM_CHECKER]: 10,
  [FeatureKey.AI_APTITUDE_ENGINE]: 10,
  [FeatureKey.TECHNICAL_MCQS]: 10,
  [FeatureKey.AI_CHAT_ASSISTANT]: 10,
  [FeatureKey.STUDY_PLANNER]: 3,
  [FeatureKey.CODING_ROADMAP]: 3,
  [FeatureKey.GITHUB_PORTFOLIO_BUILDER]: 3,
  [FeatureKey.RESUME_UPLOAD]: 3,
  [FeatureKey.RESUME_BUILDER]: 3,
  [FeatureKey.ATS_CHECKER]: 3,
  [FeatureKey.COVER_LETTER_GENERATOR]: 3,
  [FeatureKey.LINKEDIN_OPTIMIZER]: 3,
  [FeatureKey.INTERVIEW_ENGINE]: 0,
  [FeatureKey.TECHNICAL_INTERVIEW]: 0,
  [FeatureKey.HR_INTERVIEW]: 0,
};

/** Default premium-tier monthly limits (Group A: 30, Group B: 9, Interviews: 5 attempts/month each). */
export const DEFAULT_PREMIUM_LIMITS: Record<FeatureKeyValue, number> = {
  [FeatureKey.STUDY_ASSISTANT]: 30,
  [FeatureKey.NOTES_GENERATOR]: 30,
  [FeatureKey.QUIZ_GENERATOR]: 30,
  [FeatureKey.ASSIGNMENT_GENERATOR]: 30,
  [FeatureKey.MIND_MAPS]: 30,
  [FeatureKey.FLASHCARDS]: 30,
  [FeatureKey.RESEARCH_PAPER_AI]: 30,
  [FeatureKey.PLAGIARISM_CHECKER]: 30,
  [FeatureKey.AI_APTITUDE_ENGINE]: 30,
  [FeatureKey.TECHNICAL_MCQS]: 30,
  [FeatureKey.AI_CHAT_ASSISTANT]: 30,
  [FeatureKey.STUDY_PLANNER]: 9,
  [FeatureKey.CODING_ROADMAP]: 9,
  [FeatureKey.GITHUB_PORTFOLIO_BUILDER]: 9,
  [FeatureKey.RESUME_UPLOAD]: 9,
  [FeatureKey.RESUME_BUILDER]: 9,
  [FeatureKey.ATS_CHECKER]: 9,
  [FeatureKey.COVER_LETTER_GENERATOR]: 9,
  [FeatureKey.LINKEDIN_OPTIMIZER]: 9,
  [FeatureKey.INTERVIEW_ENGINE]: 5,
  [FeatureKey.TECHNICAL_INTERVIEW]: 5,
  [FeatureKey.HR_INTERVIEW]: 5,
};

/** Centralized plan entitlement matrix for standard platform tiers. */
export const DEFAULT_PLAN_LIMITS: Record<string, Record<FeatureKeyValue, number>> = {
  free: DEFAULT_FREE_LIMITS,
  premium: DEFAULT_PREMIUM_LIMITS,
  pro: {
    ...DEFAULT_PREMIUM_LIMITS,
    [FeatureKey.STUDY_ASSISTANT]: 100,
    [FeatureKey.NOTES_GENERATOR]: 100,
    [FeatureKey.QUIZ_GENERATOR]: 100,
    [FeatureKey.ASSIGNMENT_GENERATOR]: 100,
    [FeatureKey.MIND_MAPS]: 100,
    [FeatureKey.FLASHCARDS]: 100,
    [FeatureKey.RESEARCH_PAPER_AI]: 100,
    [FeatureKey.PLAGIARISM_CHECKER]: 100,
    [FeatureKey.AI_APTITUDE_ENGINE]: 100,
    [FeatureKey.TECHNICAL_MCQS]: 100,
    [FeatureKey.AI_CHAT_ASSISTANT]: 100,
    [FeatureKey.STUDY_PLANNER]: 30,
    [FeatureKey.CODING_ROADMAP]: 30,
    [FeatureKey.GITHUB_PORTFOLIO_BUILDER]: 30,
    [FeatureKey.RESUME_UPLOAD]: 30,
    [FeatureKey.RESUME_BUILDER]: 30,
    [FeatureKey.ATS_CHECKER]: 30,
    [FeatureKey.COVER_LETTER_GENERATOR]: 30,
    [FeatureKey.LINKEDIN_OPTIMIZER]: 30,
    [FeatureKey.INTERVIEW_ENGINE]: 20,
    [FeatureKey.TECHNICAL_INTERVIEW]: 20,
    [FeatureKey.HR_INTERVIEW]: 20,
  },
};

/** Human-readable display names used by admin tooling and error copy. */
export const FEATURE_DISPLAY_NAMES: Record<FeatureKeyValue, string> = {
  [FeatureKey.STUDY_ASSISTANT]: "Study Assistant",
  [FeatureKey.NOTES_GENERATOR]: "Notes Generator",
  [FeatureKey.QUIZ_GENERATOR]: "Quiz Generator",
  [FeatureKey.ASSIGNMENT_GENERATOR]: "Assignment Generator",
  [FeatureKey.MIND_MAPS]: "Mind Maps",
  [FeatureKey.FLASHCARDS]: "Flashcards",
  [FeatureKey.RESEARCH_PAPER_AI]: "Research Paper AI",
  [FeatureKey.PLAGIARISM_CHECKER]: "Plagiarism Checker",
  [FeatureKey.AI_APTITUDE_ENGINE]: "AI Aptitude Engine",
  [FeatureKey.TECHNICAL_MCQS]: "Technical MCQs",
  [FeatureKey.AI_CHAT_ASSISTANT]: "AI Chat Assistant",
  [FeatureKey.STUDY_PLANNER]: "Study Planner",
  [FeatureKey.CODING_ROADMAP]: "Coding Roadmap",
  [FeatureKey.GITHUB_PORTFOLIO_BUILDER]: "GitHub Portfolio Builder",
  [FeatureKey.RESUME_UPLOAD]: "Resume Upload",
  [FeatureKey.RESUME_BUILDER]: "Resume Builder",
  [FeatureKey.ATS_CHECKER]: "ATS Checker",
  [FeatureKey.COVER_LETTER_GENERATOR]: "Cover Letter Generator",
  [FeatureKey.LINKEDIN_OPTIMIZER]: "LinkedIn Optimizer",
  [FeatureKey.INTERVIEW_ENGINE]: "Interview Engine",
  [FeatureKey.TECHNICAL_INTERVIEW]: "Technical Interview",
  [FeatureKey.HR_INTERVIEW]: "HR Interview",
};

export function isKnownFeatureKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(DEFAULT_FREE_LIMITS, String(key || "").toUpperCase());
}

/**
 * Normalizes any reasonable feature-key spelling to the canonical registry key.
 * "quiz_generator", "QuizGenerator" and "QUIZ_GENERATOR" all normalize.
 */
export function normalizeFeatureKey(key: string): string {
  return String(key || "").trim().toUpperCase();
}

/** Converts SCREAMING_SNAKE_CASE to the kebab-case keys used in the admin
 *  `usage_limits` table (e.g. QUIZ_GENERATOR -> quiz-generator). */
export function toAdminLimitKey(key: string): string {
  return normalizeFeatureKey(key).toLowerCase().replace(/_/g, "-");
}
