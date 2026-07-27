import { generateText, MODELS } from "../lib/ai/openrouter";

export interface ReasoningTopic {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  progress: number;
  solved: number;
}

export interface ReasoningCompany {
  id: string;
  name: string;
  logo: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  avgPackage: string;
  description: string;
}

export interface ReasoningQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  correctIdx: number;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
  company?: string;
  explanation: string;
  shortcutTrick?: string;
  hint: string;
  estimatedTime: string;
  isBookmarked?: boolean;
  userStatus?: "unsolved" | "solved" | "attempted";
}

export interface AttemptResult {
  questionId: string;
  isCorrect: boolean;
  selectedOption: string;
  selectedIdx: number;
  correctAnswer: string;
  correctIdx: number;
  explanation: string;
  shortcutTrick?: string;
  userAccuracy: number;
  streak: number;
  xpEarned: number;
}

// In-memory store for user progress & bookmarks fallback
const userProgressStore: Record<string, {
  solvedCount: number;
  correctCount: number;
  totalTimeSeconds: number;
  streak: number;
  lastActive: string;
  bookmarkedQuestionIds: Set<string>;
  completedQuestionIds: Set<string>;
  weakTopics: Record<string, number>;
  strongTopics: Record<string, number>;
}> = {};

function getUserState(userId: string) {
  if (!userProgressStore[userId]) {
    userProgressStore[userId] = {
      solvedCount: 18,
      correctCount: 15,
      totalTimeSeconds: 1420,
      streak: 5,
      lastActive: new Date().toISOString(),
      bookmarkedQuestionIds: new Set<string>(["q-reasoning-1", "q-reasoning-4"]),
      completedQuestionIds: new Set<string>(["q-reasoning-1", "q-reasoning-2"]),
      weakTopics: { "Data Sufficiency": 40, "Cubes & Dice": 45, "Syllogisms": 55 },
      strongTopics: { "Coding-Decoding": 90, "Blood Relations": 85, "Direction Sense": 88 },
    };
  }
  return userProgressStore[userId];
}

// Comprehensive Topics Bank (14 Core Placement Topics)
export const REASONING_TOPICS_LIST: ReasoningTopic[] = [
  { id: "t-coding-decoding", name: "Coding-Decoding", slug: "coding-decoding", icon: "Code2", description: "Letter coding, number coding, and substitution ciphers.", questionCount: 120, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "t-blood-relations", name: "Blood Relations", slug: "blood-relations", icon: "Users", description: "Family tree puzzles, coded relations, and direct statements.", questionCount: 95, difficulty: "Easy", progress: 85, solved: 17 },
  { id: "t-seating-arrangement", name: "Seating Arrangement", slug: "seating-arrangement", icon: "LayoutGrid", description: "Linear, circular, parallel line, and matrix seating arrangements.", questionCount: 110, difficulty: "Hard", progress: 40, solved: 8 },
  { id: "t-direction-sense", name: "Direction Sense", slug: "direction-sense", icon: "Compass", description: "Distance, cardinal directions, shadow problems, and turns.", questionCount: 85, difficulty: "Easy", progress: 90, solved: 18 },
  { id: "t-syllogisms", name: "Syllogisms", slug: "syllogisms", icon: "GitCommit", description: "Venn diagram logic, Possibility cases, Some/No conclusions.", questionCount: 105, difficulty: "Medium", progress: 55, solved: 11 },
  { id: "t-analogy", name: "Analogy", slug: "analogy", icon: "ArrowRightLeft", description: "Number analogies, word relationships, and symbolic analogies.", questionCount: 75, difficulty: "Easy", progress: 65, solved: 13 },
  { id: "t-statement-conclusion", name: "Statement & Conclusion", slug: "statement-conclusion", icon: "FileText", description: "Logical deductions, implicit assumptions, and cause-effect.", questionCount: 90, difficulty: "Medium", progress: 50, solved: 10 },
  { id: "t-calendar", name: "Calendar", slug: "calendar", icon: "Calendar", description: "Odd days calculation, leap years, day of the week determination.", questionCount: 65, difficulty: "Medium", progress: 60, solved: 12 },
  { id: "t-clock", name: "Clock", slug: "clock", icon: "Clock", description: "Angle between hands, clock gain/loss, coincide & right-angle times.", questionCount: 60, difficulty: "Medium", progress: 70, solved: 14 },
  { id: "t-cubes-dice", name: "Cubes & Dice", slug: "cubes-dice", icon: "Box", description: "Opposite faces of dice, painted cube cuts, and net folding.", questionCount: 70, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "t-puzzle", name: "Puzzle", slug: "puzzle", icon: "Puzzle", description: "Floor-based puzzles, scheduling, box puzzles, and attribute matching.", questionCount: 140, difficulty: "Hard", progress: 35, solved: 7 },
  { id: "t-ranking", name: "Ranking", slug: "ranking", icon: "TrendingUp", description: "Order & ranking in rows, overlapping positions, and comparisons.", questionCount: 80, difficulty: "Easy", progress: 80, solved: 16 },
  { id: "t-alphabet-test", name: "Alphabet Test", slug: "alphabet-test", icon: "CaseSensitive", description: "Word formation, letter pair count, and dictionary order.", questionCount: 70, difficulty: "Easy", progress: 85, solved: 17 },
  { id: "t-data-sufficiency", name: "Data Sufficiency", slug: "data-sufficiency", icon: "CheckSquare", description: "Evaluating whether Statement 1 or Statement 2 alone is sufficient.", questionCount: 85, difficulty: "Hard", progress: 40, solved: 8 },
];

// Top Companies Bank
export const REASONING_COMPANIES_LIST: ReasoningCompany[] = [
  { id: "c-tcs", name: "TCS", logo: "TCS", questionCount: 240, difficulty: "Medium", avgPackage: "3.6 - 7.5 LPA", description: "NQT Foundation & Advanced reasoning questions." },
  { id: "c-infosys", name: "Infosys", logo: "INFOSYS", questionCount: 210, difficulty: "Medium", avgPackage: "3.6 - 9.5 LPA", description: "System Engineer & Power Programmer analytical tests." },
  { id: "c-wipro", name: "Wipro", logo: "WIPRO", questionCount: 180, difficulty: "Easy", avgPackage: "3.5 - 6.5 LPA", description: "NLTH logical and inductive reasoning rounds." },
  { id: "c-accenture", name: "Accenture", logo: "ACCENTURE", questionCount: 220, difficulty: "Medium", avgPackage: "4.5 - 8.5 LPA", description: "Critical reasoning & abstract pattern evaluations." },
  { id: "c-capgemini", name: "Capgemini", logo: "CAPGEMINI", questionCount: 190, difficulty: "Medium", avgPackage: "4.0 - 7.5 LPA", description: "Pseudo-code & deductive reasoning challenges." },
  { id: "c-cognizant", name: "Cognizant", logo: "COGNIZANT", questionCount: 195, difficulty: "Medium", avgPackage: "4.0 - 8.0 LPA", description: "GenC & GenC Elevate assessment patterns." },
  { id: "c-deloitte", name: "Deloitte", logo: "DELOITTE", questionCount: 160, difficulty: "Hard", avgPackage: "7.6 - 12.0 LPA", description: "Case-based puzzles & business logic assessments." },
  { id: "c-ey", name: "EY", logo: "EY", questionCount: 150, difficulty: "Hard", avgPackage: "6.5 - 11.0 LPA", description: "Data interpretation & logical reasoning tests." },
  { id: "c-amazon", name: "Amazon", logo: "AMAZON", questionCount: 280, difficulty: "Hard", avgPackage: "16.0 - 45.0 LPA", description: "Amazon Online Assessment (OA) logical puzzles & work simulation." },
  { id: "c-google", name: "Google", logo: "GOOGLE", questionCount: 260, difficulty: "Hard", avgPackage: "25.0 - 55.0 LPA", description: "Complex algorithmic puzzles & analytical thinking problems." },
  { id: "c-microsoft", name: "Microsoft", logo: "MICROSOFT", questionCount: 240, difficulty: "Hard", avgPackage: "20.0 - 48.0 LPA", description: "Logical reasoning & system problem-solving assessments." },
  { id: "c-adobe", name: "Adobe", logo: "ADOBE", questionCount: 170, difficulty: "Hard", avgPackage: "18.0 - 40.0 LPA", description: "Aptitude & quantitative reasoning for software roles." },
];

// Seed Questions Bank
const SEED_QUESTIONS: ReasoningQuestion[] = [
  {
    id: "q-reasoning-1",
    question: "If 'P ＋ Q' means P is the father of Q, 'P － Q' means P is the sister of Q, and 'P × Q' means P is the brother of Q, then which of the following represents 'A is the aunt of B'?",
    options: [
      "A － C ＋ B",
      "A ＋ C － B",
      "A × C ＋ B",
      "A － C × B"
    ],
    correctAnswer: "A － C ＋ B",
    correctIdx: 0,
    difficulty: "Medium",
    topic: "Blood Relations",
    company: "TCS",
    explanation: "A － C means A is the sister of C. C ＋ B means C is the father of B. Since A is the sister of B's father C, A is the aunt of B.",
    shortcutTrick: "Trace relations from left to right: (A's relation to C) then (C's relation to B). Sister's child's aunt = Father's sister.",
    hint: "Identify the relation between C and B first, then link A to C.",
    estimatedTime: "45 sec"
  },
  {
    id: "q-reasoning-2",
    question: "In a certain code language, 'COMPUTER' is written as 'RFUVQNPC'. How is 'MEDICINE' written in that code language?",
    options: [
      "EOJDEJFM",
      "EOJDJEFM",
      "MFEDICIN",
      "EOJDJEFN"
    ],
    correctAnswer: "EOJDJEFM",
    correctIdx: 1,
    difficulty: "Medium",
    topic: "Coding-Decoding",
    company: "Infosys",
    explanation: "Reverse the letters of COMPUTER -> RETUPMOC. Then add +1 to all inner letters (E+1=F, T+1=U, U+1=V, P+1=Q, M+1=N, O+1=P) keeping first and last letters intact (R & C). Applying same logic to MEDICINE: Reverse -> ENICIDEM. E remains E, M remains M. Inner N+1=O, I+1=J, C+1=D, I+1=J, D+1=E, E+1=F -> EOJDJEFM.",
    shortcutTrick: "Notice first and last letters are swapped/retained in reverse order. Check options ending in M and starting with E.",
    hint: "Reverse the word first and then apply letter increment logic.",
    estimatedTime: "60 sec"
  },
  {
    id: "q-reasoning-3",
    question: "Eight friends A, B, C, D, E, F, G, and H are sitting around a circular table facing the center. A sits third to the left of B, while E sits second to the right of B. D sits second to the right of F, who is not an immediate neighbor of B. C sits third to the right of H. Who sits opposite to A?",
    options: [
      "D",
      "E",
      "G",
      "H"
    ],
    correctAnswer: "D",
    correctIdx: 0,
    difficulty: "Hard",
    topic: "Seating Arrangement",
    company: "Amazon",
    explanation: "Fixing B at position 1: A is 3rd left (pos 6), E is 2nd right (pos 3). F cannot be neighbor of B (pos 2 & 8 avoided). F must be pos 5, so D (2nd right of F) is pos 7. Opposite position of A (pos 6) is position 2 (D).",
    shortcutTrick: "Draw 8 radial lines, place B at the bottom, and position A and E immediately. Eliminate F from positions next to B.",
    hint: "Start by fixing B's position on the circle.",
    estimatedTime: "90 sec"
  },
  {
    id: "q-reasoning-4",
    question: "Statements: All cars are vehicles. Some vehicles are electric. Conclusions: I. Some cars are electric. II. No car is electric.",
    options: [
      "Only conclusion I follows",
      "Only conclusion II follows",
      "Either conclusion I or II follows",
      "Neither conclusion I nor II follows"
    ],
    correctAnswer: "Either conclusion I or II follows",
    correctIdx: 2,
    difficulty: "Medium",
    topic: "Syllogisms",
    company: "Accenture",
    explanation: "Conclusions I & II form a complementary pair ('Some' and 'No') with identical subjects (cars) and predicates (electric). Neither individually follows from the statements, but one of them MUST be true.",
    shortcutTrick: "Rule of Complementary Pairs: Subject and predicate same + One Positive ('Some') and One Negative ('No') = EITHER I OR II.",
    hint: "Look for complementary pair conditions between conclusion I and II.",
    estimatedTime: "35 sec"
  },
  {
    id: "q-reasoning-5",
    question: "A person walks 10 meters North, turns Right and walks 15 meters, then turns Right again and walks 10 meters, and finally turns Left and walks 5 meters. How far and in which direction is he from his starting point?",
    options: [
      "20 meters East",
      "15 meters East",
      "20 meters West",
      "10 meters North"
    ],
    correctAnswer: "20 meters East",
    correctIdx: 0,
    difficulty: "Easy",
    topic: "Direction Sense",
    company: "Wipro",
    explanation: "North 10m (+Y 10), Right (East) 15m (+X 15), Right (South) 10m (-Y 10). Net Y movement = 10 - 10 = 0. Final turn Left (East) 5m (+X 5). Total distance = 15 + 5 = 20 meters East.",
    shortcutTrick: "Group N/S and E/W movements. North 10 cancels South 10. East movements add up (15 + 5 = 20m East).",
    hint: "Track North-South displacement separately from East-West displacement.",
    estimatedTime: "30 sec"
  },
  {
    id: "q-reasoning-6",
    question: "What will be the day of the week on 15th August 2028?",
    options: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday"
    ],
    correctAnswer: "Tuesday",
    correctIdx: 1,
    difficulty: "Medium",
    topic: "Calendar",
    company: "Capgemini",
    explanation: "2000 years have 0 odd days. 2001 to 2027 = 27 years (6 leap years, 21 ordinary years). Odd days = (6*2 + 21*1) = 33 % 7 = 5. Days in 2028 up to Aug 15: Jan(3)+Feb(1)+Mar(3)+Apr(2)+May(3)+Jun(2)+Jul(3)+Aug(15) = 32 % 7 = 4. Total odd days = 5 + 4 = 9 % 7 = 2. 2 = Tuesday.",
    shortcutTrick: "Use century code 2000=0. Calculate odd days for year 2027 + month codes up to August 15.",
    hint: "2028 is a leap year, so February has 29 days (1 odd day).",
    estimatedTime: "60 sec"
  }
];

export async function getTopics(): Promise<ReasoningTopic[]> {
  return REASONING_TOPICS_LIST;
}

export async function getCompanies(): Promise<ReasoningCompany[]> {
  return REASONING_COMPANIES_LIST;
}

export async function getCompanyByName(name: string): Promise<ReasoningCompany | undefined> {
  const normalized = name.trim().toLowerCase();
  return REASONING_COMPANIES_LIST.find((c) => c.name.toLowerCase() === normalized || c.id.includes(normalized));
}

export async function getQuestions(filters: {
  topic?: string;
  company?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<{ questions: ReasoningQuestion[]; total: number; page: number; limit: number }> {
  let list = [...SEED_QUESTIONS];

  const userState = filters.userId ? getUserState(filters.userId) : null;

  if (filters.topic && filters.topic !== "All") {
    const tLower = filters.topic.toLowerCase();
    list = list.filter((q) => q.topic.toLowerCase().includes(tLower));
  }

  if (filters.company && filters.company !== "All") {
    const cLower = filters.company.toLowerCase();
    list = list.filter((q) => q.company && q.company.toLowerCase().includes(cLower));
  }

  if (filters.difficulty && filters.difficulty !== "All") {
    list = list.filter((q) => q.difficulty.toLowerCase() === filters.difficulty?.toLowerCase());
  }

  if (filters.search) {
    const sLower = filters.search.toLowerCase();
    list = list.filter(
      (q) =>
        q.question.toLowerCase().includes(sLower) ||
        q.topic.toLowerCase().includes(sLower) ||
        (q.company && q.company.toLowerCase().includes(sLower))
    );
  }

  const decorated = list.map((q) => ({
    ...q,
    isBookmarked: userState ? userState.bookmarkedQuestionIds.has(q.id) : false,
    userStatus: userState
      ? userState.completedQuestionIds.has(q.id)
        ? ("solved" as const)
        : ("unsolved" as const)
      : ("unsolved" as const),
  }));

  const page = filters.page || 1;
  const limit = filters.limit || 10;
  const startIndex = (page - 1) * limit;
  const paginated = decorated.slice(startIndex, startIndex + limit);

  return {
    questions: paginated,
    total: decorated.length,
    page,
    limit,
  };
}

export async function generateAIQuestions(promptText: string, options?: { topic?: string; company?: string; count?: number; difficulty?: string }): Promise<ReasoningQuestion[]> {
  const count = options?.count || 5;
  const systemPrompt = `You are an expert AI Reasoning Coach for Adyapan AI. Generate ${count} placement-grade logical reasoning practice questions based on the user prompt: "${promptText}".
Output ONLY valid JSON in the exact array format below:
[
  {
    "question": "Clear question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact matching string from options",
    "correctIdx": 0,
    "difficulty": "Easy" | "Medium" | "Hard",
    "topic": "Coding-Decoding" | "Blood Relations" | "Seating Arrangement" | "Direction Sense" | "Syllogisms" | "Analogy" | "Statement & Conclusion" | "Calendar" | "Clock" | "Cubes & Dice" | "Puzzle" | "Ranking" | "Alphabet Test" | "Data Sufficiency",
    "company": "TCS" | "Infosys" | "Wipro" | "Accenture" | "Amazon" | "Google" | "Capgemini" | "Cognizant",
    "explanation": "Detailed step-by-step logical breakdown",
    "shortcutTrick": "Pro tip or shortcut to solve in <30s",
    "hint": "Subtle hint without revealing answer",
    "estimatedTime": "45 sec"
  }
]`;

  try {
    const rawAiText = await generateText("You are an expert AI Reasoning Coach for Adyapan AI.", systemPrompt, { model: MODELS.FAST });
    let cleaned = rawAiText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed: any[] = JSON.parse(cleaned);

    const generated: ReasoningQuestion[] = parsed.map((item, idx) => {
      const correctIdx = typeof item.correctIdx === "number" ? item.correctIdx : 0;
      const opts = Array.isArray(item.options) && item.options.length >= 4 ? item.options : ["Option A", "Option B", "Option C", "Option D"];
      const correctAns = item.correctAnswer || opts[correctIdx];

      return {
        id: `ai-gen-${Date.now()}-${idx}`,
        question: item.question || `AI Generated Reasoning Question ${idx + 1}`,
        options: opts,
        correctAnswer: correctAns,
        correctIdx,
        difficulty: ["Easy", "Medium", "Hard"].includes(item.difficulty) ? item.difficulty : "Medium",
        topic: item.topic || options?.topic || "Logical Reasoning",
        company: item.company || options?.company || "Top Tech",
        explanation: item.explanation || "Step 1: Analyze statements. Step 2: Apply logical deduction.",
        shortcutTrick: item.shortcutTrick || "Look for elimination options.",
        hint: item.hint || "Focus on key conditions.",
        estimatedTime: item.estimatedTime || "45 sec",
        isBookmarked: false,
        userStatus: "unsolved",
      };
    });

    // Save to seed questions memory pool
    SEED_QUESTIONS.unshift(...generated);
    return generated;
  } catch (error) {
    console.error("[ReasoningService] AI Question Generation Error, falling back to cached template:", error);
    return SEED_QUESTIONS.slice(0, count);
  }
}

export async function submitAttempt(userId: string, payload: { questionId: string; selectedIdx: number; timeTakenSeconds?: number }): Promise<AttemptResult> {
  const userState = getUserState(userId);
  const q = SEED_QUESTIONS.find((item) => item.id === payload.questionId) || SEED_QUESTIONS[0];

  const isCorrect = payload.selectedIdx === q.correctIdx;
  userState.solvedCount += 1;
  if (isCorrect) {
    userState.correctCount += 1;
  }
  userState.completedQuestionIds.add(q.id);
  userState.totalTimeSeconds += payload.timeTakenSeconds || 45;

  const currentAccuracy = Math.round((userState.correctCount / userState.solvedCount) * 100);
  const xpEarned = isCorrect ? 25 : 5;

  return {
    questionId: q.id,
    isCorrect,
    selectedOption: q.options[payload.selectedIdx] || "",
    selectedIdx: payload.selectedIdx,
    correctAnswer: q.correctAnswer,
    correctIdx: q.correctIdx,
    explanation: q.explanation,
    shortcutTrick: q.shortcutTrick,
    userAccuracy: currentAccuracy,
    streak: userState.streak,
    xpEarned,
  };
}

export async function toggleBookmark(userId: string, questionId: string): Promise<{ bookmarked: boolean }> {
  const userState = getUserState(userId);
  if (userState.bookmarkedQuestionIds.has(questionId)) {
    userState.bookmarkedQuestionIds.delete(questionId);
    return { bookmarked: false };
  } else {
    userState.bookmarkedQuestionIds.add(questionId);
    return { bookmarked: true };
  }
}

export async function getProgress(userId: string) {
  const userState = getUserState(userId);
  const totalSolved = userState.solvedCount;
  const accuracy = totalSolved > 0 ? Math.round((userState.correctCount / totalSolved) * 100) : 0;
  const avgTimeSeconds = totalSolved > 0 ? Math.round(userState.totalTimeSeconds / totalSolved) : 45;

  const bookmarkedQuestions = SEED_QUESTIONS.filter((q) => userState.bookmarkedQuestionIds.has(q.id));

  return {
    questionsSolved: totalSolved,
    accuracy,
    avgTimeSeconds,
    streakDays: userState.streak,
    weakTopics: [
      { topic: "Data Sufficiency", accuracy: 40 },
      { topic: "Cubes & Dice", accuracy: 45 },
      { topic: "Syllogisms", accuracy: 55 },
    ],
    strongTopics: [
      { topic: "Coding-Decoding", accuracy: 90 },
      { topic: "Blood Relations", accuracy: 85 },
      { topic: "Direction Sense", accuracy: 88 },
    ],
    weeklyProgress: [
      { day: "Mon", solved: 4, accuracy: 75 },
      { day: "Tue", solved: 6, accuracy: 80 },
      { day: "Wed", solved: 3, accuracy: 66 },
      { day: "Thu", solved: 8, accuracy: 88 },
      { day: "Fri", solved: 5, accuracy: 80 },
      { day: "Sat", solved: 10, accuracy: 90 },
      { day: "Sun", solved: 7, accuracy: 85 },
    ],
    bookmarkedCount: userState.bookmarkedQuestionIds.size,
    bookmarks: bookmarkedQuestions,
    recentActivity: [
      { id: "act-1", title: "Completed TCS Coding-Decoding Practice", timeAgo: "10 mins ago", score: "8/10" },
      { id: "act-2", title: "Attempted Amazon Seating Arrangement Quiz", timeAgo: "2 hours ago", score: "4/5" },
      { id: "act-3", title: "Generated AI Syllogisms Challenge", timeAgo: "1 day ago", score: "5/5" },
    ],
  };
}
