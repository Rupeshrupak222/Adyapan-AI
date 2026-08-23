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
} as const;

export type FeatureKeyValue = (typeof FeatureKey)[keyof typeof FeatureKey];

/** Default free-tier monthly limits. Admin-configurable overrides live in the
 *  `usage_limits` table and take precedence when present. */
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
