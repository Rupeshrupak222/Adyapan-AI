import { generateJSON, generateText, MODELS } from "../lib/ai/openrouter";

// ============================================================================
// TYPES
// ============================================================================

export interface PlacementQuestion {
  id: string;
  text: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  trick?: string;
  topic: string;
  category: "aptitude" | "reasoning" | "mcqs";
  difficulty: "easy" | "medium" | "hard";
}

export interface PlacementSession {
  id: string;
  userId: string;
  category: "aptitude" | "reasoning" | "mcqs";
  topic: string;
  questions: PlacementQuestion[];
  answers: { questionIdx: number; selectedIdx: number }[];
  score: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt?: Date;
}

export interface MockTest {
  id: string;
  name: string;
  company: string;
  durationMs: number;
  totalQuestions: number;
  sections: { name: string; questions: PlacementQuestion[] }[];
}

export interface ReadinessReport {
  overallScore: number;
  aptitudeScore: number;
  reasoningScore: number;
  technicalScore: number;
  totalSessions: number;
  totalQuestionsAttempted: number;
  accuracy: number;
  strongTopics: string[];
  weakTopics: string[];
  recommendation: string;
  companyReadiness: { company: string; score: number }[];
}

// ============================================================================
// TOPIC DEFINITIONS
// ============================================================================

const APTITUDE_TOPICS = [
  "Number System", "Percentages", "Profit & Loss", "Time & Work",
  "Time Speed & Distance", "Simple & Compound Interest",
  "Ratio & Proportion", "Probability", "Permutations & Combinations",
  "Data Interpretation",
];

const REASONING_TOPICS = [
  "Puzzles", "Seating Arrangement", "Blood Relations", "Coding-Decoding",
  "Direction Sense", "Syllogisms", "Number Series", "Analogy",
  "Statement & Conclusion", "Logical Deduction",
];

const TECHNICAL_TOPICS = [
  "Programming Fundamentals", "OOP Concepts", "Data Structures",
  "Algorithms", "DBMS & SQL", "Operating Systems", "Computer Networks",
];

// ============================================================================
// AI QUESTION GENERATION
// ============================================================================

interface AIQuestion {
  text: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  trick?: string;
  difficulty?: string;
}

async function generateQuestions(
  topic: string,
  category: "aptitude" | "reasoning" | "mcqs",
  count: number = 10,
  difficulty?: string
): Promise<PlacementQuestion[]> {
  const categoryLabel =
    category === "aptitude" ? "Quantitative Aptitude" :
    category === "reasoning" ? "Logical Reasoning" :
    "Technical MCQ";

  const diffInstruction = difficulty
    ? `All questions should be at "${difficulty}" difficulty level.`
    : `Mix difficulty levels: 30% easy, 50% medium, 20% hard.`;

  const systemPrompt = `You are an expert placement preparation question setter for Indian IT company campus placements (TCS, Infosys, Wipro, Cognizant, HCL, etc.).
Generate high-quality, exam-relevant ${categoryLabel} questions on the topic "${topic}".
${diffInstruction}
Each question must have exactly 4 options with exactly ONE correct answer.
Include a clear explanation and an optional shortcut/trick where applicable.`;

  const userPrompt = `Generate exactly ${count} ${categoryLabel} multiple-choice questions on "${topic}".

Return a JSON array with this exact structure:
[
  {
    "text": "question text",
    "options": ["A", "B", "C", "D"],
    "correctIdx": 0,
    "explanation": "detailed explanation",
    "trick": "optional shortcut or strategy",
    "difficulty": "easy" | "medium" | "hard"
  }
]

Rules:
- Questions must be realistic and exam-relevant
- Options should be plausible (no obviously wrong answers)
- correctIdx is 0-based index of the correct option
- Explanation must be educational and clear
- trick is optional but recommended for aptitude questions
- Vary difficulty across questions
- Return ONLY the JSON array, nothing else`;

  const fallback: PlacementQuestion[] = Array.from({ length: count }, (_, i) => ({
    id: `gen-${Date.now()}-${i}`,
    text: `${topic} question ${i + 1} — AI generation temporarily unavailable.`,
    options: ["Option A", "Option B", "Option C", "Option D"],
    correctIdx: 0,
    explanation: "Please try again later.",
    topic,
    category,
    difficulty: "medium" as const,
  }));

  try {
    const raw = await generateJSON<any>(
      systemPrompt,
      userPrompt,
      { model: MODELS.FAST, maxTokens: 8000, responseFormat: { type: "json_object" } },
      []
    );

    let result: any[] = [];
    if (Array.isArray(raw)) {
      result = raw;
    } else if (raw && typeof raw === "object") {
      if (Array.isArray(raw.questions)) result = raw.questions;
      else if (Array.isArray(raw.data)) result = raw.data;
      else if (Array.isArray(raw.items)) result = raw.items;
      else if (Array.isArray(raw.result)) result = raw.result;
      else {
        const found = Object.values(raw).find((v) => Array.isArray(v));
        if (found && Array.isArray(found)) result = found;
      }
    }

    if (!Array.isArray(result) || result.length === 0) return fallback;

    return result.slice(0, count).map((q, i) => ({
      id: `ai-${Date.now()}-${i}`,
      text: q.text || `${topic} question ${i + 1}`,
      options: q.options?.length === 4 ? q.options : ["A", "B", "C", "D"],
      correctIdx: typeof q.correctIdx === "number" ? q.correctIdx : 0,
      explanation: q.explanation || "No explanation available.",
      trick: q.trick,
      topic,
      category,
      difficulty: (q.difficulty as any) || "medium",
    }));
  } catch (error) {
    console.warn(`[Placement] AI question generation failed for ${topic}:`, error);
    return fallback;
  }
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

export async function getTopics() {
  return {
    aptitude: APTITUDE_TOPICS,
    reasoning: REASONING_TOPICS,
    technical: TECHNICAL_TOPICS,
  };
}

export async function startPracticeSession(
  topic: string,
  category: "aptitude" | "reasoning" | "mcqs",
  count: number = 10,
  difficulty?: string
): Promise<{ session: any; questions: PlacementQuestion[] }> {
  const questions = await generateQuestions(topic, category, count, difficulty);

  const session = {
    id: `session-${Date.now()}`,
    topic,
    category,
    questions,
    currentIdx: 0,
    selectedOptionIdx: null,
    submitted: false,
    score: 0,
    history: [] as any[],
    startedAt: new Date(),
  };

  return { session, questions };
}

export async function generateMockTest(
  company: string,
  sections: { name: string; topic: string; questionCount: number }[]
): Promise<MockTest> {
  const generatedSections = await Promise.all(
    sections.map(async (s) => {
      const category = s.name.toLowerCase().includes("aptitude") ? "aptitude" as const
        : s.name.toLowerCase().includes("reasoning") ? "reasoning" as const
        : "mcqs" as const;

      const questions = await generateQuestions(s.topic, category, s.questionCount);
      return { name: s.name, questions };
    })
  );

  const totalQuestions = generatedSections.reduce((sum, s) => sum + s.questions.length, 0);

  return {
    id: `mock-${Date.now()}`,
    name: `${company} Placement Mock Test`,
    company,
    durationMs: sections.length * 20 * 60 * 1000, // 20 min per section
    totalQuestions,
    sections: generatedSections,
  };
}

export async function getDefaultMockTests(): Promise<MockTest[]> {
  const companies = ["TCS", "Infosys", "Wipro", "Cognizant", "HCL"];
  return Promise.all(
    companies.map((company) =>
      generateMockTest(company, [
        { name: "Aptitude", topic: "Percentages", questionCount: 15 },
        { name: "Reasoning", topic: "Puzzles", questionCount: 10 },
        { name: "Technical", topic: "Data Structures", questionCount: 10 },
      ])
    )
  );
}

export async function placementCoachChat(
  messages: { role: string; content: string }[],
  _userId: string
): Promise<string> {
  const systemPrompt = `You are a friendly and expert Placement Coach for Indian IT company campus placements.
You help students prepare for aptitude tests, logical reasoning, and technical interviews.
You can:
- Explain concepts with examples
- Share shortcuts and tricks for solving aptitude problems
- Create practice questions on demand
- Analyze strengths and weaknesses
- Give company-specific preparation tips (TCS, Infosys, Wipro, Cognizant, HCL, etc.)

Be encouraging, concise, and practical. Use markdown formatting for readability.
If asked to generate questions, provide them in a clear numbered format with options.`;

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  try {
    const response = await generateText(
      systemPrompt,
      messages[messages.length - 1]?.content || "Hello!",
      { model: MODELS.BALANCED }
    );
    return response;
  } catch (error) {
    console.warn("[Placement] Coach chat failed:", error);
    return "I'm experiencing technical difficulties. Please try again in a moment.";
  }
}

export async function getReadinessReport(
  sessions: { topic: string; category: string; score: number; total: number }[]
): Promise<ReadinessReport> {
  if (sessions.length === 0) {
    return {
      overallScore: 0,
      aptitudeScore: 0,
      reasoningScore: 0,
      technicalScore: 0,
      totalSessions: 0,
      totalQuestionsAttempted: 0,
      accuracy: 0,
      strongTopics: [],
      weakTopics: [],
      recommendation: "Complete some practice sessions to generate your readiness report.",
      companyReadiness: [],
    };
  }

  const aptitudeSessions = sessions.filter((s) => s.category === "aptitude");
  const reasoningSessions = sessions.filter((s) => s.category === "reasoning");
  const technicalSessions = sessions.filter((s) => s.category === "mcqs");

  const avgScore = (arr: typeof sessions) =>
    arr.length > 0 ? Math.round(arr.reduce((sum, s) => sum + (s.score / s.total) * 100, 0) / arr.length) : 0;

  const aptitudeScore = avgScore(aptitudeSessions);
  const reasoningScore = avgScore(reasoningSessions);
  const technicalScore = avgScore(technicalSessions);
  const overallScore = Math.round((aptitudeScore * 0.35 + reasoningScore * 0.3 + technicalScore * 0.35));

  const totalAttempted = sessions.reduce((sum, s) => sum + s.total, 0);
  const totalCorrect = sessions.reduce((sum, s) => sum + s.score, 0);
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  const topicScores = new Map<string, number>();
  sessions.forEach((s) => {
    const existing = topicScores.get(s.topic) || [];
    topicScores.set(s.topic, [...(Array.isArray(existing) ? existing : []), (s.score / s.total) * 100] as any);
  });

  const topicAvgs: [string, number][] = [];
  topicScores.forEach((scores, topic) => {
    const arr = Array.isArray(scores) ? scores : [scores];
    topicAvgs.push([topic, arr.reduce((a: number, b: any) => a + b, 0) / arr.length]);
  });
  topicAvgs.sort((a, b) => b[1] - a[1]);

  const strongTopics = topicAvgs.filter(([_, s]) => s >= 70).map(([t]) => t).slice(0, 5);
  const weakTopics = topicAvgs.filter(([_, s]) => s < 50).map(([t]) => t).slice(0, 5);

  const companies = ["TCS", "Infosys", "Wipro", "Cognizant", "HCL"];
  const companyReadiness = companies.map((company) => ({
    company,
    score: Math.max(0, Math.min(100, overallScore + Math.floor(Math.random() * 10 - 5))),
  }));

  let recommendation = "";
  if (overallScore >= 80) recommendation = "Excellent readiness! You're well-prepared for most campus placements. Focus on maintaining consistency and practicing company-specific patterns.";
  else if (overallScore >= 60) recommendation = "Good progress! Focus on your weak areas, especially " + (weakTopics[0] || "general topics") + ". Aim for 20+ more practice sessions before placement season.";
  else if (overallScore >= 40) recommendation = "You're building a foundation. Prioritize daily practice — start with your weakest topics and gradually increase difficulty. Consider joining a structured preparation plan.";
  else recommendation = "Early stage — focus on fundamentals. Start with easy-level questions in each category and build up. Dedicate 1-2 hours daily to placement preparation.";

  return {
    overallScore,
    aptitudeScore,
    reasoningScore,
    technicalScore,
    totalSessions: sessions.length,
    totalQuestionsAttempted: totalAttempted,
    accuracy,
    strongTopics,
    weakTopics,
    recommendation,
    companyReadiness,
  };
}
