import { generateJSON, generateText, MODELS } from "../lib/ai/openrouter";

// ============================================================================
// TYPES
// ============================================================================

export type AptitudeCategory = "quantitative" | "logical" | "verbal" | "data-interpretation" | "analytical";
export type Difficulty = "easy" | "medium" | "hard";

export interface AptitudeTopicDef {
  name: string;
  category: AptitudeCategory;
  icon: string;
  description: string;
}

export interface CompanyPreset {
  name: string;
  difficulty: Difficulty | "medium-hard";
  focus: AptitudeCategory[];
  topicWeights: Record<string, number>;
  totalQuestions: number;
  timeLimitMinutes: number;
  sections: { name: string; category: AptitudeCategory; questionCount: number; timeLimitMinutes: number }[];
}

export interface GeneratedQuestion {
  id: string;
  text: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  shortcut?: string;
  difficulty: Difficulty;
  estimatedTimeSec: number;
  topic: string;
  category: AptitudeCategory;
  companyTags: string[];
  commonMistakes: string[];
}

export interface AdaptiveParams {
  weakTopics: string[];
  strongTopics: string[];
  recentAccuracy: number;
  targetDifficulty: Difficulty;
  count: number;
}

export interface AIExplanation {
  stepByStep: string[];
  shortcutMethod?: string;
  commonMistakes: string[];
  relatedConcepts: string[];
  difficultyAssessment: string;
  recommendedRevisionTopic: string;
  detailedExplanation: string;
}

export interface PerformanceInsights {
  weaknesses: { topic: string; accuracy: number; trend: string; priority: string }[];
  strengths: { topic: string; accuracy: number; consistency: string }[];
  companyReadiness: { company: string; score: number; gaps: string[] }[];
  studyPlan: { week: string; focus: string; hours: number; tasks: string[] }[];
  placementReadinessScore: number;
  overallFeedback: string;
}

export interface StudyPlan {
  dailySchedule: { day: string; topics: string[]; practiceCount: number; targetMinutes: number }[];
  weeklyGoals: { goal: string; metric: string; deadline: string }[];
  milestonePlan: { milestone: string; targetDate: string; prerequisite: string }[];
  personalizedTip: string;
}

export interface SessionReview {
  overallRating: string;
  accuracyByTopic: { topic: string; correct: number; total: number; percentage: number }[];
  timeAnalysis: { topic: string; avgTimeSec: number; optimalTimeSec: number }[];
  missedConcepts: string[];
  improvementAreas: string[];
  topStrengths: string[];
  nextSteps: string[];
  coachMessage: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  date: string;
  questions: GeneratedQuestion[];
  timeLimitMinutes: number;
  rewardPoints: number;
  description: string;
}

export interface CompanyTest {
  id: string;
  company: string;
  role?: string;
  title: string;
  sections: { name: string; category: AptitudeCategory; questions: GeneratedQuestion[]; timeLimitMinutes: number }[];
  totalTimeMinutes: number;
  totalQuestions: number;
  instructions: string[];
}

// ============================================================================
// TOPIC DEFINITIONS
// ============================================================================

const APTITUDE_TOPICS: AptitudeTopicDef[] = [
  { name: "Number System", category: "quantitative", icon: "🔢", description: "HCF, LCM, divisibility, remainders, base conversions" },
  { name: "Percentages", category: "quantitative", icon: "📊", description: "Percentage change, successive percentages, fraction equivalents" },
  { name: "Profit & Loss", category: "quantitative", icon: "💰", description: "Marked price, discount, successive discounts, partnerships" },
  { name: "Time & Work", category: "quantitative", icon: "⏱️", description: "Efficiency, pipes and cisterns, work equivalence" },
  { name: "Time Speed & Distance", category: "quantitative", icon: "🚄", description: "Relative speed, trains, boats, circular motion" },
  { name: "Simple & Compound Interest", category: "quantitative", icon: "🏦", description: "SI, CI, effective rate, installment problems" },
  { name: "Ratio & Proportion", category: "quantitative", icon: "⚖️", description: "Direct/inverse proportion, alligation, mixture" },
  { name: "Probability", category: "quantitative", icon: "🎲", description: "Events, conditional probability, Bayes theorem" },
  { name: "Permutations & Combinations", category: "quantitative", icon: "🧩", description: "Arrangements, selections, derangements" },
  { name: "Data Interpretation", category: "data-interpretation", icon: "📈", description: "Bar graphs, pie charts, line graphs, tables, caselets" },
  { name: "Puzzles", category: "logical", icon: "🧩", description: "Linear/circular arrangements, scheduling, grouping" },
  { name: "Seating Arrangement", category: "logical", icon: "🪑", description: "Linear, circular, rectangular, uncertain positions" },
  { name: "Blood Relations", category: "logical", icon: "👨‍👩‍👧‍👦", description: "Family tree, coded blood relations" },
  { name: "Coding-Decoding", category: "logical", icon: "🔐", description: "Letter coding, number coding, substitution ciphers" },
  { name: "Direction Sense", category: "logical", icon: "🧭", description: "Cardinal directions, shadows, distance problems" },
  { name: "Syllogisms", category: "logical", icon: "💡", description: "Venn diagram method, statement conclusions" },
  { name: "Number Series", category: "logical", icon: "🔢", description: "Pattern recognition, missing terms, alternating series" },
  { name: "Analogy", category: "logical", icon: "🔗", description: "Word/number/figure analogies, relationship identification" },
  { name: "Statement & Conclusion", category: "analytical", icon: "📝", description: "Inference, assumption, argument evaluation" },
  { name: "Logical Deduction", category: "logical", icon: "🧠", description: "Conditional logic, syllogistic reasoning" },
  { name: "Reading Comprehension", category: "verbal", icon: "📖", description: "Passage understanding, inference, tone analysis" },
  { name: "Grammar", category: "verbal", icon: "✍️", description: "Tenses, subject-verb agreement, parts of speech" },
  { name: "Vocabulary", category: "verbal", icon: "📚", description: "Synonyms, antonyms, word meanings, usage" },
  { name: "Sentence Correction", category: "verbal", icon: "✅", description: "Error spotting, phrase replacement, improvement" },
  { name: "Para Jumbles", category: "verbal", icon: "🔀", description: "Sentence rearrangement, paragraph ordering" },
  { name: "Fill in the Blanks", category: "verbal", icon: "___", description: "Contextual word selection, sentence completion" },
  { name: "Critical Reasoning", category: "analytical", icon: "🔍", description: "Argument analysis, strengthen/weaken questions" },
  { name: "Statement Assumption", category: "analytical", icon: "💭", description: "Implicit assumptions, underlying premises" },
  { name: "Statement Conclusion", category: "analytical", icon: "🎯", description: "Logical conclusions from given statements" },
  { name: "Cause and Effect", category: "analytical", icon: "🔗", description: "Causal relationships, correlation vs causation" },
  { name: "Course of Action", category: "analytical", icon: "🛤️", description: "Decision making, practical solutions" },
  { name: "Strengthen/Weaken", category: "analytical", icon: "💪", description: "Argument reinforcement and undermining" },
  { name: "Bar Graphs", category: "data-interpretation", icon: "📊", description: "Single/double/triple bar graph interpretation" },
  { name: "Pie Charts", category: "data-interpretation", icon: "🥧", description: "Percentage distribution, sector analysis" },
  { name: "Line Graphs", category: "data-interpretation", icon: "📈", description: "Trend analysis, growth rate, comparison" },
  { name: "Tables", category: "data-interpretation", icon: "📋", description: "Multi-row/column data extraction and computation" },
  { name: "Caselets", category: "data-interpretation", icon: "📄", description: "Paragraph-based data, hidden calculations" },
  { name: "Mixed Charts", category: "data-interpretation", icon: "📊", description: "Combination of bar+line, pie+table, etc." },
];

// ============================================================================
// COMPANY PRESETS
// ============================================================================

const COMPANY_PRESETS: Record<string, CompanyPreset> = {
  TCS: {
    name: "TCS",
    difficulty: "medium",
    focus: ["quantitative", "logical"],
    topicWeights: {
      "Percentages": 15, "Time & Work": 12, "Puzzles": 12, "Number System": 10,
      "Seating Arrangement": 10, "Profit & Loss": 8, "Coding-Decoding": 8,
      "Time Speed & Distance": 8, "Blood Relations": 5, "Direction Sense": 5,
      "Simple & Compound Interest": 4, "Syllogisms": 3,
    },
    totalQuestions: 30,
    timeLimitMinutes: 80,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 20, timeLimitMinutes: 45 },
      { name: "Logical Reasoning", category: "logical", questionCount: 10, timeLimitMinutes: 35 },
    ],
  },
  Infosys: {
    name: "Infosys",
    difficulty: "medium-hard",
    focus: ["quantitative", "verbal"],
    topicWeights: {
      "Number System": 12, "Percentages": 10, "Probability": 10, "Reading Comprehension": 10,
      "Grammar": 8, "Profit & Loss": 8, "Permutations & Combinations": 8,
      "Time & Work": 7, "Vocabulary": 7, "Data Interpretation": 8,
      "Sentence Correction": 5, "Simple & Compound Interest": 5,
    },
    totalQuestions: 40,
    timeLimitMinutes: 100,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 15, timeLimitMinutes: 35 },
      { name: "Verbal Ability", category: "verbal", questionCount: 15, timeLimitMinutes: 35 },
      { name: "Data Interpretation", category: "data-interpretation", questionCount: 10, timeLimitMinutes: 30 },
    ],
  },
  Wipro: {
    name: "Wipro",
    difficulty: "medium",
    focus: ["quantitative", "logical"],
    topicWeights: {
      "Percentages": 12, "Time & Work": 10, "Puzzles": 12, "Number System": 10,
      "Seating Arrangement": 10, "Coding-Decoding": 8, "Profit & Loss": 8,
      "Time Speed & Distance": 8, "Blood Relations": 6, "Direction Sense": 5,
      "Ratio & Proportion": 5, "Number Series": 6,
    },
    totalQuestions: 30,
    timeLimitMinutes: 75,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 18, timeLimitMinutes: 40 },
      { name: "Logical Reasoning", category: "logical", questionCount: 12, timeLimitMinutes: 35 },
    ],
  },
  Accenture: {
    name: "Accenture",
    difficulty: "medium-hard",
    focus: ["quantitative", "verbal", "logical"],
    topicWeights: {
      "Data Interpretation": 12, "Percentages": 10, "Reading Comprehension": 10,
      "Puzzles": 10, "Time & Work": 8, "Grammar": 8, "Seating Arrangement": 8,
      "Profit & Loss": 7, "Vocabulary": 6, "Number System": 6,
      "Coding-Decoding": 5, "Sentence Correction": 5, "Critical Reasoning": 5,
    },
    totalQuestions: 40,
    timeLimitMinutes: 90,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 12, timeLimitMinutes: 30 },
      { name: "Logical Reasoning", category: "logical", questionCount: 12, timeLimitMinutes: 30 },
      { name: "Verbal Ability", category: "verbal", questionCount: 10, timeLimitMinutes: 20 },
      { name: "Data Interpretation", category: "data-interpretation", questionCount: 6, timeLimitMinutes: 10 },
    ],
  },
  Capgemini: {
    name: "Capgemini",
    difficulty: "medium",
    focus: ["quantitative", "logical"],
    topicWeights: {
      "Percentages": 12, "Time & Work": 10, "Puzzles": 12, "Number System": 10,
      "Seating Arrangement": 10, "Time Speed & Distance": 8, "Profit & Loss": 8,
      "Coding-Decoding": 8, "Blood Relations": 6, "Direction Sense": 6,
      "Simple & Compound Interest": 5, "Number Series": 5,
    },
    totalQuestions: 30,
    timeLimitMinutes: 70,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 18, timeLimitMinutes: 35 },
      { name: "Logical Reasoning", category: "logical", questionCount: 12, timeLimitMinutes: 35 },
    ],
  },
  Cognizant: {
    name: "Cognizant",
    difficulty: "medium",
    focus: ["quantitative", "verbal"],
    topicWeights: {
      "Percentages": 12, "Time & Work": 10, "Reading Comprehension": 10,
      "Grammar": 8, "Profit & Loss": 8, "Number System": 8,
      "Vocabulary": 7, "Time Speed & Distance": 7, "Seating Arrangement": 8,
      "Sentence Correction": 6, "Data Interpretation": 6, "Puzzles": 8,
    },
    totalQuestions: 35,
    timeLimitMinutes: 80,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 15, timeLimitMinutes: 35 },
      { name: "Verbal Ability", category: "verbal", questionCount: 12, timeLimitMinutes: 25 },
      { name: "Logical Reasoning", category: "logical", questionCount: 8, timeLimitMinutes: 20 },
    ],
  },
  Deloitte: {
    name: "Deloitte",
    difficulty: "hard",
    focus: ["quantitative", "analytical", "verbal"],
    topicWeights: {
      "Data Interpretation": 14, "Critical Reasoning": 12, "Permutations & Combinations": 10,
      "Probability": 10, "Reading Comprehension": 10, "Statement Assumption": 8,
      "Number System": 8, "Time & Work": 7, "Grammar": 6, "Para Jumbles": 5,
      "Strengthen/Weaken": 5, "Sentence Correction": 5,
    },
    totalQuestions: 40,
    timeLimitMinutes: 90,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 12, timeLimitMinutes: 30 },
      { name: "Analytical Reasoning", category: "analytical", questionCount: 10, timeLimitMinutes: 25 },
      { name: "Verbal Ability", category: "verbal", questionCount: 10, timeLimitMinutes: 20 },
      { name: "Data Interpretation", category: "data-interpretation", questionCount: 8, timeLimitMinutes: 15 },
    ],
  },
  EY: {
    name: "EY",
    difficulty: "hard",
    focus: ["quantitative", "analytical"],
    topicWeights: {
      "Data Interpretation": 15, "Critical Reasoning": 12, "Permutations & Combinations": 10,
      "Probability": 10, "Statement Assumption": 10, "Number System": 8,
      "Cause and Effect": 8, "Course of Action": 7, "Time & Work": 5,
      "Ratio & Proportion": 5,
    },
    totalQuestions: 35,
    timeLimitMinutes: 85,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 12, timeLimitMinutes: 30 },
      { name: "Analytical Reasoning", category: "analytical", questionCount: 10, timeLimitMinutes: 30 },
      { name: "Data Interpretation", category: "data-interpretation", questionCount: 8, timeLimitMinutes: 15 },
      { name: "Verbal Ability", category: "verbal", questionCount: 5, timeLimitMinutes: 10 },
    ],
  },
  PwC: {
    name: "PwC",
    difficulty: "hard",
    focus: ["quantitative", "analytical", "verbal"],
    topicWeights: {
      "Data Interpretation": 14, "Critical Reasoning": 12, "Reading Comprehension": 10,
      "Permutations & Combinations": 10, "Probability": 10, "Statement & Conclusion": 8,
      "Number System": 8, "Grammar": 6, "Strengthen/Weaken": 6,
      "Time & Work": 6,
    },
    totalQuestions: 35,
    timeLimitMinutes: 85,
    sections: [
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 10, timeLimitMinutes: 25 },
      { name: "Analytical Reasoning", category: "analytical", questionCount: 10, timeLimitMinutes: 30 },
      { name: "Verbal Ability", category: "verbal", questionCount: 8, timeLimitMinutes: 18 },
      { name: "Data Interpretation", category: "data-interpretation", questionCount: 7, timeLimitMinutes: 12 },
    ],
  },
  Google: {
    name: "Google",
    difficulty: "hard",
    focus: ["logical", "analytical", "quantitative"],
    topicWeights: {
      "Puzzles": 12, "Permutations & Combinations": 12, "Probability": 10,
      "Critical Reasoning": 10, "Number System": 10, "Seating Arrangement": 8,
      "Coding-Decoding": 8, "Statement Assumption": 7, "Strengthen/Weaken": 7,
      "Data Interpretation": 6, "Time & Work": 5, "Direction Sense": 5,
    },
    totalQuestions: 35,
    timeLimitMinutes: 80,
    sections: [
      { name: "Analytical Reasoning", category: "analytical", questionCount: 10, timeLimitMinutes: 25 },
      { name: "Logical Reasoning", category: "logical", questionCount: 12, timeLimitMinutes: 30 },
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 13, timeLimitMinutes: 25 },
    ],
  },
  Microsoft: {
    name: "Microsoft",
    difficulty: "hard",
    focus: ["logical", "quantitative", "analytical"],
    topicWeights: {
      "Permutations & Combinations": 12, "Probability": 12, "Puzzles": 10,
      "Critical Reasoning": 10, "Number System": 10, "Seating Arrangement": 8,
      "Coding-Decoding": 8, "Statement Assumption": 6, "Strengthen/Weaken": 6,
      "Data Interpretation": 8, "Time & Work": 5, "Analogy": 5,
    },
    totalQuestions: 35,
    timeLimitMinutes: 80,
    sections: [
      { name: "Logical Reasoning", category: "logical", questionCount: 12, timeLimitMinutes: 30 },
      { name: "Analytical Reasoning", category: "analytical", questionCount: 8, timeLimitMinutes: 20 },
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 15, timeLimitMinutes: 30 },
    ],
  },
  Amazon: {
    name: "Amazon",
    difficulty: "hard",
    focus: ["logical", "analytical", "quantitative"],
    topicWeights: {
      "Puzzles": 12, "Critical Reasoning": 12, "Permutations & Combinations": 10,
      "Probability": 10, "Seating Arrangement": 8, "Coding-Decoding": 8,
      "Number System": 8, "Statement Assumption": 7, "Strengthen/Weaken": 7,
      "Cause and Effect": 6, "Time & Work": 5, "Data Interpretation": 5,
    },
    totalQuestions: 35,
    timeLimitMinutes: 75,
    sections: [
      { name: "Logical Reasoning", category: "logical", questionCount: 12, timeLimitMinutes: 25 },
      { name: "Analytical Reasoning", category: "analytical", questionCount: 10, timeLimitMinutes: 25 },
      { name: "Quantitative Aptitude", category: "quantitative", questionCount: 13, timeLimitMinutes: 25 },
    ],
  },
};

// ============================================================================
// AI QUESTION GENERATION
// ============================================================================

async function aiGenerateQuestions(
  topic: string,
  category: AptitudeCategory,
  count: number,
  difficulty: Difficulty,
  companyTags: string[]
): Promise<GeneratedQuestion[]> {
  const diffInstruction =
    difficulty === "easy" ? "All questions should be easy — suitable for beginners. Focus on direct formula application."
    : difficulty === "medium" ? "All questions should be medium — typical campus placement level. May require 2-step reasoning."
    : "All questions should be hard — advanced level. Require multi-step reasoning, clever shortcuts, or tricky cases.";

  const companyContext = companyTags.length > 0
    ? `CRITICAL COMPANY EXAM REQUIREMENT: You MUST generate REAL, ACTUAL PAST EXAM QUESTIONS and OFFICIAL EXAM PATTERNS used in official ${companyTags.join(", ")} placement papers (e.g. ${companyTags[0]} NQT / Campus Recruitment Assessment). Do NOT use generic placeholder text. Format the questions exactly as they appear in official ${companyTags.join(", ")} placement papers with real numbers, accurate options, detailed step-by-step solutions, and company-specific shortcuts!`
    : "Design questions that are universally relevant for campus placements at major Indian IT and consulting companies.";

  const systemPrompt = `You are a world-class placement preparation question architect specializing in Indian campus placements and competitive exams.
You have deep expertise in crafting questions that mirror the exact style, difficulty, and patterns found in actual placement tests at companies like TCS, Infosys, Wipro, Google, Amazon, Microsoft, and top consulting firms.

TOPIC: "${topic}"
CATEGORY: ${category}
DIFFICULTY: ${difficulty}
${companyContext}

${diffInstruction}

CRITICAL RULES:
- Each question must be self-contained with all necessary information in the question text.
- Exactly 4 options, with exactly ONE correct answer.
- Options must be plausible — no obviously wrong distractors.
- The explanation must be educational, showing the complete reasoning process.
- Always include a shortcut or trick method when applicable.
- Always include 2-3 common mistakes students make on this type of question.
- estimatedTimeSec should reflect realistic solving time for the given difficulty:
  * Easy: 30-60 seconds
  * Medium: 60-120 seconds
  * Hard: 120-180 seconds
- Questions should feel authentic — avoid artificial or contrived wording.`;

  const userPrompt = `Generate exactly ${count} high-quality ${difficulty}-level ${topic} questions for ${category} placement preparation.

Return a JSON object with a "questions" key containing an array of questions with this exact structure:
{
  "questions": [
    {
      "text": "question text with all necessary data",
      "options": ["option1", "option2", "option3", "option4"],
      "correctIdx": 0,
      "explanation": "detailed step-by-step explanation",
      "shortcut": "clever shortcut or trick method to solve faster",
      "difficulty": "${difficulty}",
      "estimatedTimeSec": 90,
      "commonMistakes": ["mistake1 students often make", "mistake2"],
      "companyRelevance": "why this question pattern appears in placements"
    }
  ]
}

Rules:
- Return ONLY valid JSON matching the structure above.
- Make questions exam-realistic and challenging.
- correctIdx is 0-based index of the correct option.
- Include realistic numerical values where needed.
- Each question should test understanding, not just memorization.`;

  const fallback: GeneratedQuestion[] = Array.from({ length: count }, (_, i) => ({
    id: `fallback-${topic.replace(/\s/g, "-")}-${Date.now()}-${i}`,
    text: `${topic} question ${i + 1} — Our AI is temporarily busy generating questions. Please retry in a moment.`,
    options: [
      "AI generation in progress",
      "Please try again",
      "Generating...",
      "Loading question",
    ],
    correctIdx: 0,
    explanation: "Question generation service is temporarily unavailable.",
    difficulty,
    estimatedTimeSec: 60,
    topic,
    category,
    companyTags,
    commonMistakes: [],
  }));

  try {
    const BATCH_SIZE = 5;
    const allGenerated: GeneratedQuestion[] = [];
    let remaining = count;

    while (remaining > 0) {
      const batchSize = Math.min(remaining, BATCH_SIZE);
      const raw = await generateJSON<any>(
        systemPrompt,
        `Generate exactly ${batchSize} high-quality ${difficulty}-level ${topic} questions for ${category} placement preparation.\n\nReturn a JSON object with a "questions" key containing an array of questions with this exact structure:\n{\n  "questions": [\n    {\n      "text": "question text with all necessary data",\n      "options": ["option1", "option2", "option3", "option4"],\n      "correctIdx": 0,\n      "explanation": "detailed step-by-step explanation",\n      "shortcut": "clever shortcut or trick method to solve faster",\n      "difficulty": "${difficulty}",\n      "estimatedTimeSec": 90,\n      "commonMistakes": ["mistake1 students often make", "mistake2"],\n      "companyRelevance": "why this question pattern appears in placements"\n    }\n  ]\n}\n\nRules:\n- Return ONLY valid JSON matching the structure above.\n- Make questions exam-realistic and challenging.\n- correctIdx is 0-based index of the correct option.\n- Include realistic numerical values where needed.\n- Each question should test understanding, not just memorization.`,
        { model: MODELS.BALANCED, maxTokens: 4000, responseFormat: { type: "json_object" } },
        []
      );

      let questionsArray: any[] = [];
      if (Array.isArray(raw)) {
        questionsArray = raw;
      } else if (raw && typeof raw === "object") {
        if (Array.isArray(raw.questions)) questionsArray = raw.questions;
        else if (Array.isArray(raw.data)) questionsArray = raw.data;
        else if (Array.isArray(raw.items)) questionsArray = raw.items;
        else if (Array.isArray(raw.result)) questionsArray = raw.result;
        else {
          const found = Object.values(raw).find((v) => Array.isArray(v));
          if (found && Array.isArray(found)) questionsArray = found;
        }
      }

      if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
        if (allGenerated.length > 0) break;
        return fallback;
      }

      allGenerated.push(...questionsArray.slice(0, batchSize).map((q, i) => ({
        id: `ai-${topic.replace(/\s/g, "-")}-${Date.now()}-${allGenerated.length + i}`,
        text: q.text || `${topic} question ${allGenerated.length + i + 1}`,
        options: Array.isArray(q.options) && q.options.length === 4 ? q.options : ["A", "B", "C", "D"],
        correctIdx: typeof q.correctIdx === "number" && q.correctIdx >= 0 && q.correctIdx <= 3 ? q.correctIdx : 0,
        explanation: q.explanation || "No explanation available.",
        shortcut: q.shortcut || undefined,
        difficulty: (q.difficulty as Difficulty) || difficulty,
        estimatedTimeSec: typeof q.estimatedTimeSec === "number" ? q.estimatedTimeSec : (difficulty === "easy" ? 45 : difficulty === "medium" ? 90 : 150),
        topic,
        category,
        companyTags,
        commonMistakes: Array.isArray(q.commonMistakes) ? q.commonMistakes : [],
      })));

      remaining -= batchSize;
    }

    return allGenerated.length > 0 ? allGenerated.slice(0, count) : fallback;
  } catch (error) {
    console.warn(`[AptitudeEngine] AI question generation failed for topic="${topic}":`, error);
    return fallback;
  }
}

// ============================================================================
// EXPORTED SERVICE FUNCTIONS
// ============================================================================

export async function getAptitudeCategories(): Promise<{
  categories: { name: AptitudeCategory; displayName: string; topics: AptitudeTopicDef[]; icon: string }[];
}> {
  const categoryMap: Record<AptitudeCategory, { displayName: string; icon: string }> = {
    "quantitative": { displayName: "Quantitative Aptitude", icon: "📐" },
    "logical": { displayName: "Logical Reasoning", icon: "🧠" },
    "verbal": { displayName: "Verbal Ability", icon: "📖" },
    "data-interpretation": { displayName: "Data Interpretation", icon: "📊" },
    "analytical": { displayName: "Analytical Reasoning", icon: "🔍" },
  };

  const grouped: Record<AptitudeCategory, AptitudeTopicDef[]> = {
    "quantitative": [], "logical": [], "verbal": [],
    "data-interpretation": [], "analytical": [],
  };

  for (const topic of APTITUDE_TOPICS) {
    grouped[topic.category].push(topic);
  }

  const categories = (Object.keys(grouped) as AptitudeCategory[]).map((cat) => ({
    name: cat,
    displayName: categoryMap[cat].displayName,
    icon: categoryMap[cat].icon,
    topics: grouped[cat],
  }));

  return { categories };
}

export async function getCompanyPresets(): Promise<{
  presets: Record<string, CompanyPreset>;
  companyNames: string[];
}> {
  return {
    presets: COMPANY_PRESETS,
    companyNames: Object.keys(COMPANY_PRESETS),
  };
}

export async function generateAptitudeQuestions(params: {
  topic?: string;
  category?: AptitudeCategory;
  count?: number;
  difficulty?: Difficulty;
  company?: string;
  previousPerformance?: { weakTopics: string[]; recentAccuracy: number };
}): Promise<GeneratedQuestion[]> {
  const {
    topic,
    category = "quantitative",
    count = 10,
    difficulty = "medium",
    company,
    previousPerformance,
  } = params;

  const companyTags = company && COMPANY_PRESETS[company] ? [company] : [];

  if (topic) {
    return aiGenerateQuestions(topic, category, count, difficulty, companyTags);
  }

  if (company && COMPANY_PRESETS[company]) {
    const preset = COMPANY_PRESETS[company];
    const topicEntries = Object.entries(preset.topicWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(count, Object.keys(preset.topicWeights).length));

    const questionsPerTopic = Math.max(1, Math.floor(count / topicEntries.length));
    let remaining = count;
    const allQuestions: GeneratedQuestion[] = [];

    for (const [topicName] of topicEntries) {
      const topicDef = APTITUDE_TOPICS.find((t) => t.name === topicName);
      const topicCategory = topicDef ? topicDef.category : category;
      const toGenerate = Math.min(questionsPerTopic, remaining);

      if (toGenerate <= 0) break;

      const generated = await aiGenerateQuestions(topicName, topicCategory, toGenerate, difficulty, companyTags);
      allQuestions.push(...generated);
      remaining -= toGenerate;
    }

    return allQuestions;
  }

  if (previousPerformance && previousPerformance.weakTopics.length > 0) {
    const weakTopicQuestions = Math.ceil(count * 0.6);
    const otherQuestions = count - weakTopicQuestions;
    const allQuestions: GeneratedQuestion[] = [];

    const weakTopic = previousPerformance.weakTopics[Math.floor(Math.random() * previousPerformance.weakTopics.length)];
    const weakGenerated = await aiGenerateQuestions(weakTopic, category, weakTopicQuestions, difficulty, companyTags);
    allQuestions.push(...weakGenerated);

    if (otherQuestions > 0) {
      const topicDef = APTITUDE_TOPICS[Math.floor(Math.random() * APTITUDE_TOPICS.length)];
      const otherGenerated = await aiGenerateQuestions(topicDef.name, topicDef.category, otherQuestions, difficulty, companyTags);
      allQuestions.push(...otherGenerated);
    }

    return allQuestions;
  }

  const topicDef = APTITUDE_TOPICS[Math.floor(Math.random() * APTITUDE_TOPICS.length)];
  return aiGenerateQuestions(topicDef.name, topicDef.category, count, difficulty, companyTags);
}

export async function generateAdaptiveQuestions(params: AdaptiveParams): Promise<GeneratedQuestion[]> {
  const { weakTopics, strongTopics, recentAccuracy, targetDifficulty, count } = params;

  const adjustedDifficulty: Difficulty =
    recentAccuracy >= 80 ? (targetDifficulty === "easy" ? "medium" : targetDifficulty === "medium" ? "hard" : "hard")
    : recentAccuracy >= 50 ? targetDifficulty
    : (targetDifficulty === "hard" ? "medium" : targetDifficulty === "medium" ? "easy" : "easy");

  const weakCount = Math.ceil(count * 0.65);
  const strongCount = Math.ceil(count * 0.2);
  const challengeCount = count - weakCount - strongCount;

  const allQuestions: GeneratedQuestion[] = [];

  if (weakTopics.length > 0) {
    const primaryWeakTopic = weakTopics[0];
    const weakGenerated = await aiGenerateQuestions(primaryWeakTopic, "quantitative", weakCount, adjustedDifficulty, []);
    allQuestions.push(...weakGenerated);

    if (weakTopics.length > 1 && weakCount > 1) {
      const secondWeakTopic = weakTopics[1];
      const secondWeak = await aiGenerateQuestions(secondWeakTopic, "quantitative", Math.ceil(weakCount * 0.4), adjustedDifficulty, []);
      allQuestions.push(...secondWeak);
    }
  }

  if (strongTopics.length > 0 && strongCount > 0) {
    const strongTopic = strongTopics[Math.floor(Math.random() * strongTopics.length)];
    const strongGenerated = await aiGenerateQuestions(strongTopic, "quantitative", strongCount, targetDifficulty, []);
    allQuestions.push(...strongGenerated);
  }

  if (challengeCount > 0) {
    const challengeDifficulty: Difficulty = adjustedDifficulty === "easy" ? "medium" : adjustedDifficulty === "medium" ? "hard" : "hard";
    const challengeTopic = weakTopics.length > 0
      ? weakTopics[Math.floor(Math.random() * weakTopics.length)]
      : APTITUDE_TOPICS[Math.floor(Math.random() * APTITUDE_TOPICS.length)].name;
    const challengeGenerated = await aiGenerateQuestions(challengeTopic, "quantitative", challengeCount, challengeDifficulty, []);
    allQuestions.push(...challengeGenerated);
  }

  return allQuestions.slice(0, count);
}

export async function generateDailyChallenge(): Promise<DailyChallenge> {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const mixedTopics: { topic: string; category: AptitudeCategory }[] = [
    { topic: "Percentages", category: "quantitative" },
    { topic: "Puzzles", category: "logical" },
    { topic: "Reading Comprehension", category: "verbal" },
    { topic: "Data Interpretation", category: "data-interpretation" },
    { topic: "Critical Reasoning", category: "analytical" },
  ];

  const allQuestions: GeneratedQuestion[] = [];

  for (const { topic, category } of mixedTopics) {
    const generated = await aiGenerateQuestions(topic, category, 2, "medium", []);
    allQuestions.push(...generated);
  }

  const difficultyLabel = `Day ${Math.floor((today.getTime() - new Date("2024-01-01").getTime()) / 86400000) % 365 + 1}`;

  return {
    id: `daily-${dateStr}`,
    title: `Daily Challenge ${difficultyLabel}`,
    date: dateStr,
    questions: allQuestions,
    timeLimitMinutes: 15,
    rewardPoints: 50 + allQuestions.length * 5,
    description: `Today's challenge: ${allQuestions.length} mixed questions across Quant, Logic, Verbal, DI, and Analytical. Complete within 15 minutes to earn bonus points!`,
  };
}

export async function generateCompanyTest(company: string, role?: string): Promise<CompanyTest> {
  const preset = COMPANY_PRESETS[company];

  if (!preset) {
    const fallbackSections = [
      { name: "Quantitative Aptitude", category: "quantitative" as AptitudeCategory, questions: [] as GeneratedQuestion[], timeLimitMinutes: 20 },
      { name: "Logical Reasoning", category: "logical" as AptitudeCategory, questions: [] as GeneratedQuestion[], timeLimitMinutes: 15 },
      { name: "Verbal Ability", category: "verbal" as AptitudeCategory, questions: [] as GeneratedQuestion[], timeLimitMinutes: 15 },
    ];

    for (const section of fallbackSections) {
      const topicDef = APTITUDE_TOPICS.find((t) => t.category === section.category);
      section.questions = await aiGenerateQuestions(topicDef?.name || "Number System", section.category, 10, "medium", [company]);
    }

    return {
      id: `test-${company.toLowerCase()}-${Date.now()}`,
      company,
      role,
      title: `${company} ${role ? `(${role}) ` : ""}Placement Test`,
      sections: fallbackSections,
      totalTimeMinutes: 50,
      totalQuestions: 30,
      instructions: [
        "Each section has a separate time limit — you cannot switch between sections.",
        "There is no negative marking.",
        "Calculator is not allowed.",
        "Read each question carefully before answering.",
      ],
    };
  }

  const sections = await Promise.all(
    preset.sections.map(async (section) => {
      const topicDefs = APTITUDE_TOPICS.filter((t) => t.category === section.category);
      const questions: GeneratedQuestion[] = [];

      const questionsPerTopic = Math.max(1, Math.ceil(section.questionCount / Math.max(topicDefs.length, 1)));
      let remaining = section.questionCount;

      for (const topicDef of topicDefs) {
        const toGenerate = Math.min(questionsPerTopic, remaining);
        if (toGenerate <= 0) break;

        const generated = await aiGenerateQuestions(
          topicDef.name, topicDef.category, toGenerate, preset.difficulty as Difficulty, [company]
        );
        questions.push(...generated);
        remaining -= toGenerate;
      }

      return {
        name: section.name,
        category: section.category,
        questions: questions.slice(0, section.questionCount),
        timeLimitMinutes: section.timeLimitMinutes,
      };
    })
  );

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return {
    id: `test-${company.toLowerCase()}-${Date.now()}`,
    company,
    role,
    title: `${company} ${role ? `(${role}) ` : ""}Placement Test`,
    sections,
    totalTimeMinutes: preset.timeLimitMinutes,
    totalQuestions,
    instructions: [
      `This is a ${company}-specific placement test with ${totalQuestions} questions.`,
      `Total time: ${preset.timeLimitMinutes} minutes across ${sections.length} sections.`,
      "Each section has a dedicated time limit — manage your time wisely.",
      "No negative marking unless specified.",
      "Practice with a clean desk and no calculator, just like the actual test.",
    ],
  };
}

export async function generateAIExplanation(params: {
  question: string;
  options: string[];
  userAnswer: number;
  correctAnswer: number;
  timeTaken: number;
  topic: string;
}): Promise<AIExplanation> {
  const { question, options, userAnswer, correctAnswer, timeTaken, topic } = params;

  const systemPrompt = `You are an expert aptitude coach and educator with 15+ years of experience helping students ace campus placement tests and competitive exams.

When explaining a solution:
1. Use DeepSeek-style chain-of-thought reasoning: break down the problem step by step.
2. Provide 2-3 different approaches to solve the same problem (direct method, shortcut, elimination).
3. Identify the EXACT misconception that leads to each wrong answer choice.
4. Connect the problem to broader concepts the student should study.
5. Assess difficulty honestly — don't inflate or deflate it.
6. Recommend a specific revision topic if the student got it wrong.
7. Be encouraging but honest about areas needing improvement.

The user answered "${options[userAnswer]}" which is ${userAnswer === correctAnswer ? "CORRECT" : "INCORRECT"}.
The correct answer is "${options[correctAnswer]}".
Time taken: ${timeTaken} seconds.`;

  const userPrompt = `Explain the following aptitude question in detail:

QUESTION: ${question}

OPTIONS:
${options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")}

USER'S ANSWER: ${options[userAnswer]} (${userAnswer === correctAnswer ? "Correct" : "Incorrect"})
CORRECT ANSWER: ${options[correctAnswer]}
TIME TAKEN: ${timeTaken} seconds
TOPIC: ${topic}

Provide your response as a JSON object with this exact structure:
{
  "stepByStep": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "shortcutMethod": "shortcut approach description",
  "commonMistakes": ["mistake 1 that leads to wrong option B", "mistake 2 that leads to wrong option D"],
  "relatedConcepts": ["concept1", "concept2", "concept3"],
  "difficultyAssessment": "This is a [easy/medium/hard] question because...",
  "recommendedRevisionTopic": "specific topic to review",
  "detailedExplanation": "comprehensive paragraph explanation tying everything together"
}`;

  const fallback: AIExplanation = {
    stepByStep: [
      "Step 1: Read the question carefully and identify what is given and what needs to be found.",
      "Step 2: Identify the key concepts and formulas needed.",
      "Step 3: Apply the appropriate method to solve.",
      "Step 4: Verify the answer.",
    ],
    commonMistakes: [
      "Rushing without reading all options carefully",
      "Using the wrong formula or sign convention",
    ],
    relatedConcepts: [topic],
    difficultyAssessment: "This is a standard placement-level question.",
    recommendedRevisionTopic: topic,
    detailedExplanation: `The correct answer is "${options[correctAnswer]}". Review the step-by-step solution above and practice similar problems on ${topic}.`,
  };

  try {
    const result = await generateJSON<AIExplanation>(
      systemPrompt,
      userPrompt,
      { model: MODELS.POWERFUL, maxTokens: 4000, responseFormat: { type: "json_object" } },
      fallback
    );

    return result;
  } catch (error) {
    console.warn(`[AptitudeEngine] AI explanation generation failed:`, error);
    return fallback;
  }
}

export async function generatePerformanceInsights(analyticsData: {
  userId: string;
  totalSessions: number;
  totalQuestionsAttempted: number;
  correctAnswers: number;
  averageTimePerQuestion: number;
  topicWiseAccuracy: { topic: string; correct: number; total: number; avgTimeSec: number }[];
  recentSessions: { date: string; score: number; total: number; topic: string; timeTakenSec: number }[];
  strongTopics: string[];
  weakTopics: string[];
  targetCompanies: string[];
  daysUntilPlacement?: number;
}): Promise<PerformanceInsights> {
  const {
    totalSessions, totalQuestionsAttempted, correctAnswers,
    averageTimePerQuestion, topicWiseAccuracy, recentSessions,
    strongTopics, weakTopics, targetCompanies, daysUntilPlacement,
  } = analyticsData;

  const overallAccuracy = totalQuestionsAttempted > 0 ? Math.round((correctAnswers / totalQuestionsAttempted) * 100) : 0;

  const systemPrompt = `You are an expert performance analyst and placement coach for Indian campus placements.
You have deep knowledge of how companies like TCS, Infosys, Wipro, Google, Amazon, Microsoft, Deloitte, etc. structure their placement tests.

Analyze the student's placement preparation performance data and provide actionable, personalized insights.

RULES:
- Be specific and data-driven — reference actual numbers from the data.
- Company readiness scores must consider each company's specific test pattern and difficulty.
- Study plan must be realistic — fit into the available time (if daysUntilPlacement is provided).
- Provide honest assessment — don't inflate scores.
- Focus on high-impact improvements that will move the needle fastest.
- Weakness analysis should identify patterns (e.g., "consistently slow on DI questions" not just "DI is weak").`;

  const userPrompt = `Analyze this student's placement preparation performance:

OVERVIEW:
- Total Sessions: ${totalSessions}
- Questions Attempted: ${totalQuestionsAttempted}
- Correct Answers: ${correctAnswers}
- Overall Accuracy: ${overallAccuracy}%
- Average Time Per Question: ${Math.round(averageTimePerQuestion)} seconds
${daysUntilPlacement ? `- Days Until Placement: ${daysUntilPlacement}` : ""}
${targetCompanies.length > 0 ? `- Target Companies: ${targetCompanies.join(", ")}` : ""}

TOPIC-WISE PERFORMANCE:
${topicWiseAccuracy.map((t) => `- ${t.topic}: ${t.correct}/${t.total} (${Math.round((t.correct / t.total) * 100)}%) — Avg Time: ${Math.round(t.avgTimeSec)}s`).join("\n")}

RECENT SESSIONS (last 10):
${recentSessions.map((s) => `- ${s.date}: ${s.score}/${s.total} on ${s.topic} (Time: ${Math.round(s.timeTakenSec)}s)`).join("\n")}

STRONG TOPICS: ${strongTopics.length > 0 ? strongTopics.join(", ") : "None identified yet"}
WEAK TOPICS: ${weakTopics.length > 0 ? weakTopics.join(", ") : "None identified yet"}

Return a JSON object with this exact structure:
{
  "weaknesses": [{ "topic": "...", "accuracy": 45, "trend": "improving/declining/stable", "priority": "high/medium/low" }],
  "strengths": [{ "topic": "...", "accuracy": 85, "consistency": "consistent/inconsistent" }],
  "companyReadiness": [{ "company": "TCS", "score": 72, "gaps": ["gap1", "gap2"] }],
  "studyPlan": [{ "week": "Week 1", "focus": "topic focus", "hours": 10, "tasks": ["task1", "task2"] }],
  "placementReadinessScore": 65,
  "overallFeedback": "detailed feedback paragraph"
}`;

  const fallback: PerformanceInsights = {
    weaknesses: weakTopics.map((t) => ({ topic: t, accuracy: 30, trend: "stable" as const, priority: "high" as const })),
    strengths: strongTopics.map((t) => ({ topic: t, accuracy: 80, consistency: "consistent" as const })),
    companyReadiness: (targetCompanies.length > 0 ? targetCompanies : ["TCS", "Infosys"]).map((c) => ({
      company: c, score: overallAccuracy, gaps: weakTopics.slice(0, 3),
    })),
    studyPlan: [
      { week: "Week 1", focus: "Strengthen weak areas", hours: 10, tasks: ["Practice weak topics daily", "Review concepts"] },
      { week: "Week 2", focus: "Company-specific practice", hours: 12, tasks: ["Solve company mock tests", "Time management drills"] },
    ],
    placementReadinessScore: overallAccuracy,
    overallFeedback: `You have attempted ${totalQuestionsAttempted} questions with ${overallAccuracy}% accuracy. ${weakTopics.length > 0 ? `Focus on improving ${weakTopics[0]} and ${weakTopics[1] || weakTopics[0]}.` : "Keep practicing to maintain your level."}`,
  };

  try {
    const result = await generateJSON<PerformanceInsights>(
      systemPrompt,
      userPrompt,
      { model: MODELS.POWERFUL, maxTokens: 6000, responseFormat: { type: "json_object" } },
      fallback
    );

    return result;
  } catch (error) {
    console.warn(`[AptitudeEngine] Performance insights generation failed:`, error);
    return fallback;
  }
}

export async function generateStudyPlan(analyticsData: {
  weakTopics: string[];
  strongTopics: string[];
  overallAccuracy: number;
  targetCompanies: string[];
  daysUntilPlacement: number;
  dailyAvailableMinutes: number;
  completedTopics: string[];
  upcomingTestDate?: string;
}): Promise<StudyPlan> {
  const {
    weakTopics, strongTopics, overallAccuracy, targetCompanies,
    daysUntilPlacement, dailyAvailableMinutes, completedTopics, upcomingTestDate,
  } = analyticsData;

  const systemPrompt = `You are an elite placement preparation coach — a blend of Nemotron's structured reasoning and a personalized tutor's adaptability.
You create study plans that are aggressive yet achievable, prioritizing high-impact activities.

COACHING STYLE (Nemotron-inspired):
1. Start with an honest assessment — don't sugarcoat weak areas.
2. Create micro-goals that build toward macro milestones.
3. Each day must have specific, measurable activities (e.g., "Solve 15 Percentages questions in 20 minutes" not "Practice Percentages").
4. Balance revision of weak topics with maintaining strong topics.
5. Include timed practice sessions to build speed.
6. Adjust intensity based on days remaining — more aggressive if time is short.
7. Include company-specific practice if target companies are known.
8. End each week with a self-assessment mini-test.

RULES:
- Do NOT plan more than ${dailyAvailableMinutes} minutes per day.
- If daysUntilPlacement < 7, focus on intensive mock tests only.
- If daysUntilPlacement < 30, focus on weak topics + company patterns.
- If daysUntilPlacement > 60, include concept building + practice.
- Reference specific topics and question counts, not vague goals.`;

  const userPrompt = `Create a personalized study plan for this student:

CURRENT STATUS:
- Overall Accuracy: ${overallAccuracy}%
- Strong Topics: ${strongTopics.length > 0 ? strongTopics.join(", ") : "None identified"}
- Weak Topics: ${weakTopics.length > 0 ? weakTopics.join(", ") : "None identified"}
- Completed Topics: ${completedTopics.length > 0 ? completedTopics.join(", ") : "None yet"}
${targetCompanies.length > 0 ? `- Target Companies: ${targetCompanies.join(", ")}` : ""}
${upcomingTestDate ? `- Upcoming Test Date: ${upcomingTestDate}` : ""}

CONSTRAINTS:
- Days Until Placement: ${daysUntilPlacement}
- Daily Available Time: ${dailyAvailableMinutes} minutes

Return a JSON object with this exact structure:
{
  "dailySchedule": [
    {
      "day": "Day 1 (Monday)",
      "topics": ["Topic A - 15 questions", "Topic B - 10 questions"],
      "practiceCount": 25,
      "targetMinutes": 45
    }
  ],
  "weeklyGoals": [
    { "goal": "Improve accuracy in Topic X from 40% to 60%", "metric": "Accuracy on 50 practice questions", "deadline": "End of Week 1" }
  ],
  "milestonePlan": [
    { "milestone": "Foundation Building Complete", "targetDate": "Day 7", "prerequisite": "Complete all easy-level topics" }
  ],
  "personalizedTip": "specific coaching tip based on the data"
}

Generate a complete plan for all ${daysUntilPlacement} days. Be specific with topic names and question counts.`;

  const fallback: StudyPlan = {
    dailySchedule: Array.from({ length: Math.min(daysUntilPlacement, 30) }, (_, i) => ({
      day: `Day ${i + 1}`,
      topics: weakTopics.length > 0 ? [`${weakTopics[i % weakTopics.length]} - 15 questions`] : ["Mixed practice - 20 questions"],
      practiceCount: 15,
      targetMinutes: Math.min(dailyAvailableMinutes, 45),
    })),
    weeklyGoals: [
      { goal: "Improve overall accuracy by 10%", metric: "Score above 60% on mock tests", deadline: "End of Week 1" },
      { goal: "Complete all weak topic drills", metric: "Attempt 50 questions per weak topic", deadline: "End of Week 2" },
    ],
    milestonePlan: [
      { milestone: "Foundation Complete", targetDate: "Day 7", prerequisite: "All easy topics mastered" },
      { milestone: "Company Readiness", targetDate: "Day 14", prerequisite: "Medium difficulty > 70% accuracy" },
    ],
    personalizedTip: weakTopics.length > 0
      ? `Focus intensely on "${weakTopics[0]}" — it's your biggest lever for score improvement.`
      : "You're in good shape! Focus on speed and accuracy under timed conditions.",
  };

  try {
    const result = await generateJSON<StudyPlan>(
      systemPrompt,
      userPrompt,
      { model: MODELS.POWERFUL, maxTokens: 10000, responseFormat: { type: "json_object" } },
      fallback
    );

    return result;
  } catch (error) {
    console.warn(`[AptitudeEngine] Study plan generation failed:`, error);
    return fallback;
  }
}

export async function getSessionReview(sessionData: {
  topic: string;
  questions: { text: string; options: string[]; correctIdx: number; difficulty: string; topic: string }[];
  answers: { questionIdx: number; selectedIdx: number; timeTakenSec: number }[];
  totalTimeTaken: number;
  score: number;
  totalQuestions: number;
}): Promise<SessionReview> {
  const { topic, questions, answers, totalTimeTaken, score, totalQuestions } = sessionData;

  const accuracy = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const avgTime = totalQuestions > 0 ? Math.round(totalTimeTaken / totalQuestions) : 0;

  const topicWise: Record<string, { correct: number; total: number; totalTime: number }> = {};
  for (const answer of answers) {
    const q = questions[answer.questionIdx];
    if (!q) continue;
    const t = q.topic || topic;
    if (!topicWise[t]) topicWise[t] = { correct: 0, total: 0, totalTime: 0 };
    topicWise[t].total += 1;
    topicWise[t].totalTime += answer.timeTakenSec;
    if (answer.selectedIdx === q.correctIdx) topicWise[t].correct += 1;
  }

  const accuracyByTopic = Object.entries(topicWise).map(([t, data]) => ({
    topic: t,
    correct: data.correct,
    total: data.total,
    percentage: Math.round((data.correct / data.total) * 100),
  }));

  const timeAnalysis = Object.entries(topicWise).map(([t, data]) => ({
    topic: t,
    avgTimeSec: Math.round(data.totalTime / Math.max(data.total, 1)),
    optimalTimeSec: data.total <= 5 ? 60 : data.total <= 10 ? 90 : 120,
  }));

  const systemPrompt = `You are a supportive but honest placement preparation coach providing a post-session review.

Your review should:
1. Celebrate strengths — what went well and why.
2. Be specific about weaknesses — which questions/topics caused trouble and what concepts need review.
3. Analyze time management — were they too slow on some topics? Too fast and careless on others?
4. Provide a clear, actionable "next steps" plan.
5. End with an encouraging coach message that acknowledges effort and motivates continued practice.
6. Identify specific concepts that were missed based on wrong answers.

Be warm but data-driven. Reference specific topics and numbers.`;

  const userPrompt = `Review this practice session:

TOPIC: ${topic}
SCORE: ${score}/${totalQuestions} (${accuracy}%)
TOTAL TIME: ${totalTimeTaken} seconds (${avgTime}s per question)

TOPIC-WISE BREAKDOWN:
${accuracyByTopic.map((t) => `- ${t.topic}: ${t.correct}/${t.total} (${t.percentage}%)`).join("\n")}

TIME ANALYSIS:
${timeAnalysis.map((t) => `- ${t.topic}: Avg ${t.avgTimeSec}s per question (Optimal: ~${t.optimalTimeSec}s)`).join("\n")}

QUESTIONS & ANSWERS:
${answers.map((a) => {
  const q = questions[a.questionIdx];
  if (!q) return "";
  const isCorrect = a.selectedIdx === q.correctIdx;
  return `- Q${a.questionIdx + 1} (${q.difficulty}): ${isCorrect ? "✅ Correct" : "❌ Wrong (Selected: option " + String.fromCharCode(65 + a.selectedIdx) + ", Correct: option " + String.fromCharCode(65 + q.correctIdx) + ")"} | Time: ${a.timeTakenSec}s`;
}).filter(Boolean).join("\n")}

Return a JSON object with this exact structure:
{
  "overallRating": "excellent/good/average/needs-work",
  "accuracyByTopic": [{ "topic": "...", "correct": 5, "total": 10, "percentage": 50 }],
  "timeAnalysis": [{ "topic": "...", "avgTimeSec": 45, "optimalTimeSec": 60 }],
  "missedConcepts": ["concept1 that was tested incorrectly", "concept2"],
  "improvementAreas": ["area1 to improve", "area2"],
  "topStrengths": ["strength1", "strength2"],
  "nextSteps": ["specific next step 1", "specific next step 2"],
  "coachMessage": "personalized motivational message from the coach"
}`;

  const fallback: SessionReview = {
    overallRating: accuracy >= 80 ? "excellent" : accuracy >= 60 ? "good" : accuracy >= 40 ? "average" : "needs-work",
    accuracyByTopic,
    timeAnalysis,
    missedConcepts: accuracyByTopic.filter((t) => t.percentage < 50).map((t) => t.topic),
    improvementAreas: accuracyByTopic.filter((t) => t.percentage < 60).map((t) => `Review ${t.topic} fundamentals`),
    topStrengths: accuracyByTopic.filter((t) => t.percentage >= 80).map((t) => t.topic),
    nextSteps: [
      accuracyByTopic.filter((t) => t.percentage < 50).length > 0
        ? `Focus practice on: ${accuracyByTopic.filter((t) => t.percentage < 50).map((t) => t.topic).join(", ")}`
        : "Move to harder difficulty levels",
      `Target ${Math.min(accuracy + 10, 100)}% accuracy in your next session`,
      `Practice timed sessions to improve speed (current avg: ${avgTime}s/question)`,
    ],
    coachMessage: accuracy >= 70
      ? `Great session! You scored ${accuracy}% with solid time management. Keep this momentum going — you're on track for placement readiness!`
      : `Good effort! You scored ${accuracy}% — there's room to grow, and that's okay. Focus on understanding the concepts behind wrong answers, and you'll see rapid improvement. Every question you review makes you stronger!`,
  };

  try {
    const result = await generateJSON<SessionReview>(
      systemPrompt,
      userPrompt,
      { model: MODELS.BALANCED, maxTokens: 4000, responseFormat: { type: "json_object" } },
      fallback
    );

    return result;
  } catch (error) {
    console.warn(`[AptitudeEngine] Session review generation failed:`, error);
    return fallback;
  }
}
