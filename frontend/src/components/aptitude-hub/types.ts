// ============================================================
// AI Aptitude Engine — Types, Interfaces, Constants & Presets
// ============================================================

// ─── Question Types ──────────────────────────────────────────

export interface AptitudeQuestion {
  id: string;
  text: string;
  options: string[];
  correctIdx: number;
  explanation: string;
  shortcut?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTimeSec: number;
  topic: string;
  category: AptitudeCategory;
  companyTags: string[];
  commonMistakes: string[];
}

export type AptitudeCategory =
  | 'quantitative'
  | 'logical'
  | 'verbal'
  | 'data_interpretation'
  | 'analytical'
  | 'number_systems';

export type TestMode =
  | 'practice'
  | 'timed_quiz'
  | 'topic_test'
  | 'company_test'
  | 'adaptive'
  | 'daily_challenge'
  | 'revision';

// ─── Session Types ───────────────────────────────────────────

export interface AptitudeSession {
  id: string;
  mode: TestMode;
  company?: string;
  role?: string;
  category?: AptitudeCategory;
  topic?: string;
  difficulty: string;
  questions: AptitudeQuestion[];
  totalQuestions: number;
  score: number;
  accuracy: number;
  totalTimeMs: number;
  avgTimePerQMs: number;
  xpEarned: number;
  weakTopics: string[];
  strongTopics: string[];
  startedAt: string;
  completedAt?: string;
}

export interface AptitudeAnswer {
  questionIdx: number;
  questionId: string;
  selectedIdx: number | null;
  correct: boolean;
  timeTakenMs: number;
  bookmarked: boolean;
  flagged: boolean;
  notes: string;
}

export interface SessionProgress {
  currentIdx: number;
  answers: AptitudeAnswer[];
  timeElapsed: number;
  timeRemaining: number;
  bookmarkedCount: number;
  flaggedCount: number;
}

// ─── Analytics Types ─────────────────────────────────────────

export interface TopicMastery {
  topic: string;
  accuracy: number;
  totalAttempted: number;
  totalCorrect: number;
  avgTimeMs: number;
  difficulty: string;
  trend: 'improving' | 'declining' | 'stable';
  lastPracticed: string;
}

export interface CompanyReadiness {
  company: string;
  score: number;
  ready: boolean;
  gapTopics: string[];
  recommendation: string;
}

export interface PerformanceAnalytics {
  totalSessions: number;
  totalQuestions: number;
  overallAccuracy: number;
  avgTimePerQMs: number;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  topicMastery: TopicMastery[];
  companyReadiness: CompanyReadiness[];
  categoryScores: Record<AptitudeCategory, number>;
  weeklyProgress: WeeklyProgress[];
  placementReadiness: number;
  weakTopics: string[];
  strongTopics: string[];
}

export interface WeeklyProgress {
  week: string;
  sessionsCompleted: number;
  accuracy: number;
  avgTime: number;
  xpEarned: number;
}

// ─── Session Review Types ────────────────────────────────────

export interface SessionReview {
  sessionId: string;
  score: number;
  accuracy: number;
  totalTimeMs: number;
  avgTimePerQMs: number;
  xpEarned: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  weakTopics: string[];
  strongTopics: string[];
  questionReviews: QuestionReview[];
  aiInsights: string;
  studyPlan: string;
  improvementSuggestions: string[];
}

export interface QuestionReview {
  question: AptitudeQuestion;
  userAnswer: number | null;
  isCorrect: boolean;
  timeTakenMs: number;
  aiExplanation?: string;
  shortcut?: string;
  commonMistakes: string[];
}

// ─── AI Explanation Types ────────────────────────────────────

export interface AIExplanation {
  stepByStep: string;
  shortcut: string;
  commonMistakes: string[];
  relatedConcepts: string[];
  difficultyNote: string;
  revisionTopic: string;
}

// ─── UI State Types ──────────────────────────────────────────

export type AptitudeView =
  | 'home'
  | 'category_select'
  | 'mode_select'
  | 'company_select'
  | 'active_session'
  | 'daily_challenge'
  | 'session_review'
  | 'analytics'
  | 'history';

export interface AptitudeEngineState {
  view: AptitudeView;
  selectedCategory?: AptitudeCategory;
  selectedMode?: TestMode;
  selectedCompany?: string;
  selectedTopic?: string;
  difficulty: string;
  session: AptitudeSession | null;
  progress: SessionProgress;
  analytics: PerformanceAnalytics | null;
  review: SessionReview | null;
  loading: boolean;
  aiLoading: boolean;
}

// ─── Constants ───────────────────────────────────────────────

export const APTITUDE_CATEGORIES = [
  {
    id: 'quantitative' as const,
    name: 'Quantitative Aptitude',
    icon: 'Calculator',
    color: '#f59e0b',
    description: 'Numbers, Percentages, Profit & Loss, Time & Work',
  },
  {
    id: 'logical' as const,
    name: 'Logical Reasoning',
    icon: 'Brain',
    color: '#8b5cf6',
    description: 'Puzzles, Blood Relations, Coding-Decoding, Series',
  },
  {
    id: 'verbal' as const,
    name: 'Verbal Ability',
    icon: 'BookOpen',
    color: '#3b82f6',
    description: 'Reading Comprehension, Grammar, Vocabulary',
  },
  {
    id: 'data_interpretation' as const,
    name: 'Data Interpretation',
    icon: 'BarChart3',
    color: '#10b981',
    description: 'Charts, Graphs, Tables, Caselets',
  },
  {
    id: 'analytical' as const,
    name: 'Analytical Reasoning',
    icon: 'Lightbulb',
    color: '#ec4899',
    description: 'Critical Reasoning, Assumptions, Conclusions',
  },
  {
    id: 'number_systems' as const,
    name: 'Number Systems',
    icon: 'Hash',
    color: '#06b6d4',
    description: 'HCF, LCM, Fractions, Properties of Numbers',
  },
] as const;

// ─── Topics By Category ──────────────────────────────────────

export const TOPICS_BY_CATEGORY: Record<AptitudeCategory, string[]> = {
  quantitative: [
    'Percentages',
    'Profit & Loss',
    'Time & Work',
    'Time, Speed & Distance',
    'Simple & Compound Interest',
    'Ratio & Proportion',
    'Probability',
    'Permutations & Combinations',
    'Averages',
    'Mixture & Alligation',
  ],
  logical: [
    'Puzzles',
    'Seating Arrangement',
    'Blood Relations',
    'Coding-Decoding',
    'Direction Sense',
    'Syllogisms',
    'Number Series',
    'Analogy',
    'Statement & Conclusion',
    'Logical Deduction',
  ],
  verbal: [
    'Reading Comprehension',
    'Grammar',
    'Vocabulary',
    'Sentence Correction',
    'Para Jumbles',
    'Fill in the Blanks',
    'Synonyms & Antonyms',
    'Idioms & Phrases',
  ],
  data_interpretation: [
    'Bar Graphs',
    'Pie Charts',
    'Line Graphs',
    'Tables',
    'Caselets',
    'Mixed Charts',
    'Data Sufficiency',
  ],
  analytical: [
    'Critical Reasoning',
    'Statement Assumption',
    'Statement Conclusion',
    'Cause and Effect',
    'Course of Action',
    'Strengthen/Weaken Argument',
  ],
  number_systems: [
    'HCF & LCM',
    'Fractions & Decimals',
    'Properties of Numbers',
    'Divisibility Rules',
    'Remainder Theorem',
    'Cyclicity',
    'Unit Digit',
  ],
};

// ─── Test Modes ──────────────────────────────────────────────

export const TEST_MODES = [
  {
    id: 'practice' as const,
    name: 'Practice Mode',
    icon: 'Play',
    description: 'Free practice with immediate feedback',
    color: '#10b981',
  },
  {
    id: 'timed_quiz' as const,
    name: 'Timed Quiz',
    icon: 'Timer',
    description: 'Race against the clock',
    color: '#f59e0b',
  },
  {
    id: 'topic_test' as const,
    name: 'Topic Test',
    icon: 'Target',
    description: 'Deep dive into a specific topic',
    color: '#3b82f6',
  },
  {
    id: 'company_test' as const,
    name: 'Company Test',
    icon: 'Building2',
    description: 'Simulate company-specific patterns',
    color: '#8b5cf6',
  },
  {
    id: 'adaptive' as const,
    name: 'Adaptive Test',
    icon: 'Sparkles',
    description: 'AI adapts to your skill level',
    color: '#ec4899',
  },
  {
    id: 'daily_challenge' as const,
    name: 'Daily Challenge',
    icon: 'Flame',
    description: 'Daily mixed topic challenge',
    color: '#ef4444',
  },
  {
    id: 'revision' as const,
    name: 'Revision Mode',
    icon: 'RotateCcw',
    description: 'Revisit weak areas',
    color: '#06b6d4',
  },
] as const;

// ─── Company Presets ─────────────────────────────────────────

export const COMPANY_PRESETS = [
  {
    id: 'TCS',
    name: 'TCS',
    logo: 'T',
    color: '#0072c6',
    difficulty: 'medium',
    questionCount: 30,
    durationMin: 80,
    focusCategories: ['quantitative', 'logical'] as AptitudeCategory[],
    topicWeights: {
      Percentages: 15,
      'Time & Work': 12,
      Puzzles: 12,
      'Number System': 10,
      'Profit & Loss': 10,
      'Blood Relations': 8,
      'Seating Arrangement': 8,
      'Coding-Decoding': 8,
      Probability: 7,
      'Time, Speed & Distance': 10,
    },
  },
  {
    id: 'Infosys',
    name: 'Infosys',
    logo: 'I',
    color: '#007cc3',
    difficulty: 'medium-hard',
    questionCount: 40,
    durationMin: 100,
    focusCategories: ['quantitative', 'verbal'] as AptitudeCategory[],
    topicWeights: {
      Percentages: 12,
      'Profit & Loss': 12,
      'Reading Comprehension': 15,
      Grammar: 12,
      Puzzles: 10,
      Vocabulary: 10,
      'Time & Work': 8,
      'Blood Relations': 8,
      'Seating Arrangement': 8,
      'Data Interpretation': 5,
    },
  },
  {
    id: 'Wipro',
    name: 'Wipro',
    logo: 'W',
    color: '#3266a1',
    difficulty: 'medium',
    questionCount: 35,
    durationMin: 90,
    focusCategories: ['quantitative', 'logical'] as AptitudeCategory[],
    topicWeights: {
      Percentages: 14,
      'Profit & Loss': 12,
      Puzzles: 12,
      'Time & Work': 10,
      'Number Series': 10,
      'Coding-Decoding': 10,
      'Blood Relations': 8,
      'Seating Arrangement': 8,
      Probability: 8,
      'Time, Speed & Distance': 8,
    },
  },
  {
    id: 'Accenture',
    name: 'Accenture',
    logo: 'A',
    color: '#a100ff',
    difficulty: 'medium-hard',
    questionCount: 40,
    durationMin: 90,
    focusCategories: ['quantitative', 'logical', 'verbal'] as AptitudeCategory[],
    topicWeights: {
      Percentages: 10,
      'Profit & Loss': 10,
      Puzzles: 10,
      Grammar: 10,
      'Time & Work': 8,
      'Blood Relations': 8,
      'Coding-Decoding': 8,
      Vocabulary: 8,
      'Data Interpretation': 8,
      'Seating Arrangement': 8,
      'Reading Comprehension': 8,
      'Number System': 4,
    },
  },
  {
    id: 'Capgemini',
    name: 'Capgemini',
    logo: 'C',
    color: '#0070ad',
    difficulty: 'medium',
    questionCount: 32,
    durationMin: 80,
    focusCategories: ['quantitative', 'logical'] as AptitudeCategory[],
    topicWeights: {
      Percentages: 14,
      'Time & Work': 12,
      Puzzles: 12,
      'Profit & Loss': 10,
      'Blood Relations': 10,
      'Number System': 10,
      'Coding-Decoding': 10,
      'Seating Arrangement': 8,
      Probability: 7,
      'Time, Speed & Distance': 7,
    },
  },
  {
    id: 'Cognizant',
    name: 'Cognizant',
    logo: 'C',
    color: '#0033a0',
    difficulty: 'medium',
    questionCount: 30,
    durationMin: 80,
    focusCategories: ['quantitative', 'logical'] as AptitudeCategory[],
    topicWeights: {
      Percentages: 15,
      'Profit & Loss': 12,
      Puzzles: 12,
      'Time & Work': 10,
      'Blood Relations': 10,
      'Number System': 10,
      'Coding-Decoding': 8,
      'Seating Arrangement': 8,
      Probability: 8,
      'Time, Speed & Distance': 7,
    },
  },
  {
    id: 'Deloitte',
    name: 'Deloitte',
    logo: 'D',
    color: '#86bc25',
    difficulty: 'hard',
    questionCount: 40,
    durationMin: 100,
    focusCategories: ['quantitative', 'logical', 'verbal'] as AptitudeCategory[],
    topicWeights: {
      'Data Interpretation': 15,
      Percentages: 12,
      Puzzles: 12,
      'Critical Reasoning': 10,
      Grammar: 10,
      'Profit & Loss': 8,
      'Blood Relations': 8,
      Vocabulary: 8,
      'Seating Arrangement': 8,
      'Time & Work': 5,
      'Reading Comprehension': 4,
    },
  },
  {
    id: 'EY',
    name: 'EY',
    logo: 'E',
    color: '#ffe600',
    difficulty: 'hard',
    questionCount: 40,
    durationMin: 100,
    focusCategories: ['quantitative', 'logical', 'verbal'] as AptitudeCategory[],
    topicWeights: {
      'Data Interpretation': 15,
      Percentages: 12,
      'Critical Reasoning': 12,
      Grammar: 10,
      Puzzles: 10,
      Vocabulary: 8,
      'Profit & Loss': 8,
      'Blood Relations': 5,
      'Time & Work': 5,
      'Reading Comprehension': 5,
    },
  },
  {
    id: 'PwC',
    name: 'PwC',
    logo: 'P',
    color: '#d04a02',
    difficulty: 'hard',
    questionCount: 40,
    durationMin: 100,
    focusCategories: ['quantitative', 'logical', 'verbal'] as AptitudeCategory[],
    topicWeights: {
      'Data Interpretation': 15,
      Percentages: 12,
      'Critical Reasoning': 12,
      Puzzles: 10,
      Grammar: 10,
      Vocabulary: 8,
      'Profit & Loss': 8,
      'Blood Relations': 5,
      'Time & Work': 5,
      'Reading Comprehension': 5,
    },
  },
  {
    id: 'Google',
    name: 'Google',
    logo: 'G',
    color: '#4285f4',
    difficulty: 'hard',
    questionCount: 30,
    durationMin: 90,
    focusCategories: ['logical', 'analytical'] as AptitudeCategory[],
    topicWeights: {
      'Critical Reasoning': 15,
      Puzzles: 15,
      'Data Interpretation': 12,
      'Coding-Decoding': 10,
      'Number Series': 10,
      'Seating Arrangement': 8,
      'Blood Relations': 8,
      'Logical Deduction': 8,
      'Statement Assumption': 7,
      'Direction Sense': 7,
    },
  },
  {
    id: 'Microsoft',
    name: 'Microsoft',
    logo: 'M',
    color: '#00a4ef',
    difficulty: 'hard',
    questionCount: 30,
    durationMin: 90,
    focusCategories: ['logical', 'analytical'] as AptitudeCategory[],
    topicWeights: {
      Puzzles: 15,
      'Critical Reasoning': 15,
      'Coding-Decoding': 12,
      'Data Interpretation': 10,
      'Number Series': 10,
      'Logical Deduction': 10,
      'Seating Arrangement': 8,
      'Statement Assumption': 7,
      'Blood Relations': 7,
      'Direction Sense': 6,
    },
  },
  {
    id: 'Amazon',
    name: 'Amazon',
    logo: 'A',
    color: '#ff9900',
    difficulty: 'hard',
    questionCount: 30,
    durationMin: 90,
    focusCategories: ['logical', 'analytical'] as AptitudeCategory[],
    topicWeights: {
      Puzzles: 15,
      'Critical Reasoning': 15,
      'Coding-Decoding': 12,
      'Data Interpretation': 10,
      'Seating Arrangement': 10,
      'Number Series': 10,
      'Blood Relations': 8,
      'Logical Deduction': 8,
      'Statement Assumption': 6,
      'Direction Sense': 6,
    },
  },
] as const;

// ─── Difficulty Config ───────────────────────────────────────

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: '#10b981', timeMultiplier: 1.5, xpBase: 10 },
  medium: { label: 'Medium', color: '#f59e0b', timeMultiplier: 1.0, xpBase: 20 },
  hard: { label: 'Hard', color: '#ef4444', timeMultiplier: 0.7, xpBase: 35 },
} as const;

// ─── Limits ──────────────────────────────────────────────────

export const XP_PER_LEVEL = 500;
export const MAX_QUESTIONS_PER_SESSION = 50;
