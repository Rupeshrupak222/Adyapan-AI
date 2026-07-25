export type HRInterviewType =
  | "campus_placement_hr"
  | "corporate_hr"
  | "fresh_graduate"
  | "experienced_professional"
  | "internship"
  | "managerial_hr"
  | "startup_culture_fit"
  | "leadership_assessment"
  | "general_hr"
  | "custom";

export type HRDifficultyLevel = "easy" | "medium" | "hard";

export type HRExperienceLevel = "fresher" | "entry" | "mid" | "senior" | "lead";

export type HRScreen =
  | "landing"
  | "loading"
  | "active"
  | "report"
  | "analytics"
  | "history";

export interface HRCompanyPreset {
  id: string;
  name: string;
  logo: string;
  difficulty: HRDifficultyLevel;
  hrFocus: string[];
  color: string;
  culture: string;
}

export interface HRConfig {
  interviewType: HRInterviewType;
  targetRole: string;
  targetCompany: string;
  difficulty: HRDifficultyLevel;
  experienceLevel: HRExperienceLevel;
  durationMinutes: number;
  language: string;
  aiVoiceEnabled: boolean;
  voiceGender: "male" | "female" | "neutral";
  voiceSpeed: number;
  voicePitch: number;
  resumeAware: boolean;
  customInstructions: string;
}

export interface HRMessage {
  id: string;
  role: "interviewer" | "candidate" | "system";
  content: string;
  timestamp: number;
  isFollowUp?: boolean;
  questionNumber?: number;
}

export interface STARAnalysis {
  hasSituation: boolean;
  hasTask: boolean;
  hasAction: boolean;
  hasResult: boolean;
  score: number;
  feedback: string;
  missingElements: string[];
}

export interface CommunicationAnalysis {
  clarity: number;
  confidence: number;
  fluency: number;
  conciseness: number;
  vocabulary: number;
  professionalism: number;
  answerStructure: number;
  fillerWordDetected: boolean;
  overallScore: number;
  feedback: string;
}

export interface HRCompetencyScore {
  competency: string;
  score: number;
  evidence: string;
  trend: "improving" | "declining" | "stable";
}

export interface HRAnswerBreakdown {
  questionNumber: number;
  question: string;
  answer: string;
  aiAnalysis: string;
  suggestedBetterAnswer: string;
  interviewerPerspective: string;
  starAnalysis: STARAnalysis;
  communicationAnalysis: CommunicationAnalysis;
  score: number;
  tags: string[];
  competency: string;
}

export interface HREvaluation {
  overallScore: number;
  communicationScore: number;
  leadershipScore: number;
  starScore: number;
  confidenceScore: number;
  teamworkScore: number;
  ownershipScore: number;
  adaptabilityScore: number;
  emotionalIntelligence: number;
  professionalism: number;
  culturalFit: number;
  motivation: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  summary: string;
  hiringRecommendation: "strong_recommend" | "recommend" | "maybe" | "do_not_recommend";
  competencyMatrix: HRCompetencyScore[];
  answerBreakdowns: HRAnswerBreakdown[];
  nextPracticeTopics: string[];
  recruiterPerspective: string;
}

export interface HRSession {
  id: string;
  config: HRConfig;
  messages: HRMessage[];
  evaluation: HREvaluation | null;
  status: "preparing" | "in_progress" | "completed" | "terminated";
  startedAt: string;
  endedAt?: string;
  questionCount: number;
  currentQuestionIndex: number;
  totalDuration: number;
  actualDuration: number;
}

export interface HRHistoryEntry {
  id: string;
  type: string;
  role: string;
  company: string;
  difficulty: string;
  status: string;
  overallScore: number | null;
  communicationScore: number | null;
  leadershipScore: number | null;
  starScore: number | null;
  createdAt: string;
  endedAt: string | null;
  duration: number;
}

export interface HRAnalytics {
  totalInterviews: number;
  bestScore: number;
  averageScore: number;
  scoreTrend: { date: string; score: number }[];
  competencyAverages: {
    communication: number;
    leadership: number;
    confidence: number;
    overallHR: number;
  };
  typeBreakdown: { type: string; count: number; avgScore: number }[];
  weeklyActivity: { week: string; count: number; avgScore: number }[];
  scoreDistribution: { excellent: number; good: number; average: number; needsWork: number };
}

export const HR_INTERVIEW_TYPES: Record<HRInterviewType, {
  label: string;
  description: string;
  color: string;
  icon: string;
  suggestedDuration: number;
}> = {
  campus_placement_hr: {
    label: "Campus Placement HR",
    description: "Aptitude, communication, and corporate readiness",
    color: "#f97316",
    icon: "GraduationCap",
    suggestedDuration: 30,
  },
  corporate_hr: {
    label: "Corporate HR",
    description: "Professional behavioral and culture-fit assessment",
    color: "#3b82f6",
    icon: "Building2",
    suggestedDuration: 30,
  },
  fresh_graduate: {
    label: "Fresh Graduate",
    description: "Academic potential, learning agility, and career goals",
    color: "#14b8a6",
    icon: "User",
    suggestedDuration: 25,
  },
  experienced_professional: {
    label: "Experienced Professional",
    description: "Domain expertise, leadership, and mentoring stories",
    color: "#a855f7",
    icon: "Briefcase",
    suggestedDuration: 45,
  },
  internship: {
    label: "Internship Interview",
    description: "Learning mindset, adaptability, and raw potential",
    color: "#06b6d4",
    icon: "BookOpen",
    suggestedDuration: 20,
  },
  managerial_hr: {
    label: "Managerial HR",
    description: "Leadership, team management, and strategic thinking",
    color: "#ef4444",
    icon: "Crown",
    suggestedDuration: 45,
  },
  startup_culture_fit: {
    label: "Startup Culture Fit",
    description: "Adaptability, ownership, and entrepreneurial mindset",
    color: "#10b981",
    icon: "Rocket",
    suggestedDuration: 30,
  },
  leadership_assessment: {
    label: "Leadership Assessment",
    description: "Executive presence, vision, and influence",
    color: "#8b5cf6",
    icon: "Target",
    suggestedDuration: 45,
  },
  general_hr: {
    label: "General HR",
    description: "Comprehensive behavioral interview practice",
    color: "#f59e0b",
    icon: "User",
    suggestedDuration: 30,
  },
  custom: {
    label: "Custom Interview",
    description: "Fully customizable HR interview simulation",
    color: "#64748b",
    icon: "Sliders",
    suggestedDuration: 30,
  },
};

export const HR_COMPANY_PRESETS: HRCompanyPreset[] = [
  { id: "google", name: "Google", logo: "G", difficulty: "hard", hrFocus: ["Googliness", "Innovation", "Collaboration"], color: "#4285F4", culture: "Innovation-driven, intellectual humility, comfort with ambiguity" },
  { id: "microsoft", name: "Microsoft", logo: "M", difficulty: "hard", hrFocus: ["Growth Mindset", "Inclusivity", "Empowerment"], color: "#00A4EF", culture: "Growth mindset, learning from failure, empowering others" },
  { id: "amazon", name: "Amazon", logo: "A", difficulty: "hard", hrFocus: ["Leadership Principles", "Customer Obsession", "Ownership"], color: "#FF9900", culture: "16 Leadership Principles, customer obsession, bias for action" },
  { id: "meta", name: "Meta", logo: "M", difficulty: "hard", hrFocus: ["Move Fast", "Impact", "Boldness"], color: "#0668E1", culture: "Move fast, impact at scale, bold decisions" },
  { id: "apple", name: "Apple", logo: "", difficulty: "hard", hrFocus: ["Detail", "Privacy", "Craftsmanship"], color: "#A2AAAD", culture: "Attention to detail, product intuition, privacy-first" },
  { id: "tcs", name: "TCS", logo: "T", difficulty: "medium", hrFocus: ["Aptitude", "Communication", "Adaptability"], color: "#0066B3", culture: "Communication, aptitude, enterprise adaptability" },
  { id: "infosys", name: "Infosys", logo: "I", difficulty: "medium", hrFocus: ["Fundamentals", "Process", "Growth"], color: "#007CC3", culture: "Foundational knowledge, process orientation, growth mindset" },
  { id: "accenture", name: "Accenture", logo: "A", difficulty: "medium", hrFocus: ["Consulting", "Analytics", "Client Focus"], color: "#A100FF", culture: "Consulting mindset, analytics, client focus" },
  { id: "deloitte", name: "Deloitte", logo: "D", difficulty: "medium", hrFocus: ["Strategy", "Analytics", "Advisory"], color: "#86BC25", culture: "Analytics, strategic thinking, advisory mindset" },
  { id: "wipro", name: "Wipro", logo: "W", difficulty: "medium", hrFocus: ["Technical", "Communication", "Problem-Solving"], color: "#0052CC", culture: "Technical fundamentals, communication, problem-solving" },
  { id: "capgemini", name: "Capgemini", logo: "C", difficulty: "medium", hrFocus: ["Business", "Delivery", "Collaboration"], color: "#0070AD", culture: "Business acumen, delivery focus, team collaboration" },
  { id: "startup", name: "Startup", logo: "S", difficulty: "medium", hrFocus: ["Ownership", "Speed", "Versatility"], color: "#10b981", culture: "Ownership, speed, versatility, entrepreneurial spirit" },
];

export const HR_COMPETENCY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  communication: { label: "Communication", color: "#3b82f6", icon: "MessageSquare" },
  leadership: { label: "Leadership", color: "#8b5cf6", icon: "Crown" },
  teamwork: { label: "Teamwork", color: "#10b981", icon: "Users" },
  ownership: { label: "Ownership", color: "#f59e0b", icon: "Shield" },
  problem_solving: { label: "Problem Solving", color: "#06b6d4", icon: "Brain" },
  adaptability: { label: "Adaptability", color: "#14b8a6", icon: "RefreshCw" },
  emotional_intelligence: { label: "Emotional Intelligence", color: "#ec4899", icon: "Heart" },
  professionalism: { label: "Professionalism", color: "#6366f1", icon: "Award" },
  cultural_fit: { label: "Cultural Fit", color: "#f97316", icon: "Globe" },
  motivation: { label: "Motivation", color: "#ef4444", icon: "Flame" },
};

export const HR_BEHAVIORAL_TOPICS = [
  { id: "tell_me_about_yourself", label: "Tell Me About Yourself", icon: "User" },
  { id: "strengths_weaknesses", label: "Strengths & Weaknesses", icon: "Scale" },
  { id: "leadership", label: "Leadership", icon: "Crown" },
  { id: "conflict_resolution", label: "Conflict Resolution", icon: "Shield" },
  { id: "teamwork", label: "Teamwork", icon: "Users" },
  { id: "time_management", label: "Time Management", icon: "Clock" },
  { id: "communication", label: "Communication", icon: "MessageSquare" },
  { id: "failure_recovery", label: "Failure & Recovery", icon: "RotateCcw" },
  { id: "achievements", label: "Achievements", icon: "Trophy" },
  { id: "career_goals", label: "Career Goals", icon: "Target" },
  { id: "adaptability", label: "Adaptability", icon: "RefreshCw" },
  { id: "ethical_decisions", label: "Ethical Decisions", icon: "Scale" },
  { id: "pressure_handling", label: "Pressure Handling", icon: "Zap" },
  { id: "learning_mindset", label: "Learning Mindset", icon: "Brain" },
] as const;

export type HRBehavioralTopic = (typeof HR_BEHAVIORAL_TOPICS)[number]["id"];

export interface IntelligenceData {
  communicationInsights: {
    confidence: number;
    clarity: number;
    professionalism: number;
    answerStructure: number;
    conciseness: number;
    fillerWordsDetected: boolean;
    speakingPace: string;
    feedback: string;
    suggestions: string[];
  };
  interviewFlow: Array<{
    phase: string;
    startTime: number;
    endTime: number;
    questionCount: number;
    averageScore: number;
    trend: "improving" | "declining" | "stable";
    notes: string;
  }>;
  followUpAnalysis: {
    questionsAnsweredConfidently: Array<{ question: string; score: number }>;
    questionsRequiringHints: Array<{ question: string; score: number; hint: string }>;
    questionsWithIncompleteReasoning: Array<{ question: string; score: number; issue: string }>;
    questionsAvoided: Array<{ question: string; reason: string }>;
    questionsAnsweredIncorrectly: Array<{ question: string; score: number; correction: string }>;
  };
  aiCoach: {
    topPriorities: Array<{ priority: number; area: string; action: string; impact: string; timeframe: string }>;
    topicsToRevise: string[];
    codingTopics: string[];
    behavioralTopics: string[];
    communicationExercises: string[];
    resumeImprovements: string[];
    learningHubRecommendations: string[];
    codingHubRecommendations: string[];
    careerRoadmapUpdates: string[];
    biggestStrength: string;
    biggestWeakness: string;
    interviewReadiness: number;
    nextRecommendedInterview: string;
    overallSummary: string;
  };
  practicePlan: {
    todayGoal: string;
    todayTasks: Array<{ task: string; category: string; estimatedMinutes: number }>;
    thisWeek: Array<{ goal: string; tasks: string[]; deadline: string }>;
    thisMonth: Array<{ milestone: string; targetDate: string; checkpoints: string[] }>;
    suggestedInterviewType: string;
    recommendedCodingProblems: string[];
    learningModules: string[];
    resumeTasks: string[];
  };
  resumeImpact: {
    projectImprovements: string[];
    resumeBulletRewrites: string[];
    experienceClarifications: string[];
    linkedInUpdates: string[];
    overallResumeAdvice: string;
  };
  competencyRadar: Array<{ competency: string; score: number; benchmark: number }>;
  improvementSinceLast: { scoreDelta: number; newStrengths: string[]; persistentWeaknesses: string[] };
}
