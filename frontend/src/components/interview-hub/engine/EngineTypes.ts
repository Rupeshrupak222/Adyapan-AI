export type InterviewType =
  | "system-design"
  | "managerial"
  | "fresh-graduate"
  | "campus-placement"
  | "experienced-professional"
  | "custom";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type ExperienceLevel = "fresher" | "entry" | "mid" | "senior" | "lead";

export type EngineScreen =
  | "landing"
  | "loading"
  | "active"
  | "report"
  | "history"
  | "analytics";

export interface CompanyPreset {
  id: string;
  name: string;
  logo: string;
  difficulty: DifficultyLevel;
  focus: string[];
  color: string;
}

export interface RolePreset {
  id: string;
  title: string;
  icon: string;
  category: string;
}

export interface EngineConfig {
  interviewType: InterviewType;
  targetRole: string;
  targetCompany: string;
  difficulty: DifficultyLevel;
  experienceLevel: ExperienceLevel;
  durationMinutes: number;
  technology: string;
  language: string;
  aiVoiceEnabled: boolean;
  voiceGender: "male" | "female" | "neutral";
  voiceSpeed: number;
  voicePitch: number;
  resumeAware: boolean;
  customInstructions: string;
}

export interface EngineMessage {
  id: string;
  role: "interviewer" | "candidate" | "system";
  content: string;
  timestamp: number;
  isFollowUp?: boolean;
  questionNumber?: number;
}

export interface AnswerAnalysis {
  questionNumber: number;
  question: string;
  candidateResponse: string;
  aiAnalysis: string;
  suggestedBetterAnswer: string;
  interviewerPerspective: string;
  score: number;
  tags: string[];
}

export interface EngineEvaluation {
  overallScore: number;
  communication: number;
  technical: number;
  confidence: number;
  problemSolving: number;
  leadership: number;
  roleFit: number;
  strengths: string[];
  weaknesses: string[];
  missedOpportunities: string[];
  recommendedTopics: string[];
  communicationTips: string[];
  technicalImprovements: string[];
  nextPracticePlan: string;
  hiringRecommendation: string;
  summary: string;
  answerBreakdowns: AnswerAnalysis[];
}

export interface EngineSession {
  id: string;
  config: EngineConfig;
  messages: EngineMessage[];
  evaluation: EngineEvaluation | null;
  status: "preparing" | "in_progress" | "completed" | "terminated";
  startedAt: string;
  endedAt?: string;
  questionCount: number;
  currentQuestionIndex: number;
  totalDuration: number;
  actualDuration: number;
}

export interface EngineHistoryEntry {
  id: string;
  interviewType: InterviewType;
  targetRole: string;
  targetCompany: string;
  duration: number;
  score: number | null;
  status: string;
  date: string;
  improvement?: { scoreDelta: number; newStrengths: string[]; persistentWeaknesses: string[] };
}

export interface CommunicationInsight {
  confidence: number;
  clarity: number;
  professionalism: number;
  answerStructure: number;
  conciseness: number;
  fillerWordsDetected: boolean;
  speakingPace: string;
  feedback: string;
  suggestions: string[];
}

export interface InterviewFlowPhase {
  phase: string;
  startTime: number;
  endTime: number;
  questionCount: number;
  averageScore: number;
  trend: "improving" | "declining" | "stable";
  notes: string;
}

export interface FollowUpAnalysis {
  questionsAnsweredConfidently: Array<{ question: string; score: number }>;
  questionsRequiringHints: Array<{ question: string; score: number; hint: string }>;
  questionsWithIncompleteReasoning: Array<{ question: string; score: number; issue: string }>;
  questionsAvoided: Array<{ question: string; reason: string }>;
  questionsAnsweredIncorrectly: Array<{ question: string; score: number; correction: string }>;
}

export interface AICoachOutput {
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
}

export interface PracticePlan {
  todayGoal: string;
  todayTasks: Array<{ task: string; category: string; estimatedMinutes: number }>;
  thisWeek: Array<{ goal: string; tasks: string[]; deadline: string }>;
  thisMonth: Array<{ milestone: string; targetDate: string; checkpoints: string[] }>;
  suggestedInterviewType: string;
  recommendedCodingProblems: string[];
  learningModules: string[];
  resumeTasks: string[];
}

export interface ResumeImpact {
  projectImprovements: string[];
  resumeBulletRewrites: string[];
  experienceClarifications: string[];
  linkedInUpdates: string[];
  overallResumeAdvice: string;
}

export interface CompetencyRadarItem {
  competency: string;
  score: number;
  benchmark: number;
}

export interface IntelligenceData {
  communicationInsights: CommunicationInsight;
  interviewFlow: InterviewFlowPhase[];
  followUpAnalysis: FollowUpAnalysis;
  aiCoach: AICoachOutput;
  practicePlan: PracticePlan;
  resumeImpact: ResumeImpact;
  competencyRadar: CompetencyRadarItem[];
  improvementSinceLast: { scoreDelta: number; newStrengths: string[]; persistentWeaknesses: string[] };
}

export interface TranscriptEntry {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  timestamp: number;
  questionNumber?: number;
  isHighlighted?: boolean;
}

export const COMPANY_PRESETS: CompanyPreset[] = [
  { id: "google", name: "Google", logo: "G", difficulty: "hard", focus: ["System Design", "Algorithms", "Leadership"], color: "#4285F4" },
  { id: "microsoft", name: "Microsoft", logo: "M", difficulty: "hard", focus: ["Problem Solving", "OOP", "Cloud"], color: "#00A4EF" },
  { id: "amazon", name: "Amazon", logo: "A", difficulty: "hard", focus: ["Leadership Principles", "Scale", "AWS"], color: "#FF9900" },
  { id: "meta", name: "Meta", logo: "M", difficulty: "hard", focus: ["System Design", "React", "Social"], color: "#0668E1" },
  { id: "apple", name: "Apple", logo: "", difficulty: "hard", focus: ["Design", "Performance", "Innovation"], color: "#A2AAAD" },
  { id: "netflix", name: "Netflix", logo: "N", difficulty: "hard", focus: ["Culture", "Freedom", "Streaming"], color: "#E50914" },
  { id: "tcs", name: "TCS", logo: "T", difficulty: "medium", focus: ["Aptitude", "Java", "Communication"], color: "#0066B3" },
  { id: "infosys", name: "Infosys", logo: "I", difficulty: "medium", focus: ["Fundamentals", "DBMS", "OS"], color: "#007CC3" },
  { id: "accenture", name: "Accenture", logo: "A", difficulty: "medium", focus: ["Consulting", "Analytics", "Process"], color: "#A100FF" },
  { id: "wipro", name: "Wipro", logo: "W", difficulty: "medium", focus: ["Core CS", "SQL", "Aptitude"], color: "#0052CC" },
  { id: "capgemini", name: "Capgemini", logo: "C", difficulty: "medium", focus: ["Business", "Tech", "Delivery"], color: "#0070AD" },
  { id: "deloitte", name: "Deloitte", logo: "D", difficulty: "medium", focus: ["Analytics", "Strategy", "Advisory"], color: "#86BC25" },
];

export const ROLE_PRESETS: RolePreset[] = [
  // Tech & Software
  { id: "software-engineer", title: "Software Engineer", icon: "Code2", category: "Engineering" },
  { id: "backend-developer", title: "Backend Developer", icon: "Server", category: "Engineering" },
  { id: "frontend-developer", title: "Frontend Developer", icon: "Monitor", category: "Engineering" },
  { id: "full-stack", title: "Full Stack Developer", icon: "Layers", category: "Engineering" },
  { id: "mobile-developer", title: "Mobile App Developer", icon: "Smartphone", category: "Engineering" },

  // AI & Data
  { id: "ai-engineer", title: "AI Engineer", icon: "Brain", category: "AI/ML" },
  { id: "ml-engineer", title: "ML Engineer", icon: "Cpu", category: "AI/ML" },
  { id: "data-scientist", title: "Data Scientist", icon: "FlaskConical", category: "Data" },
  { id: "data-analyst", title: "Data Analyst", icon: "BarChart3", category: "Data" },
  { id: "business-analytics", title: "Business Analytics Specialist", icon: "BarChart3", category: "Data" },

  // Infrastructure & Security
  { id: "devops", title: "DevOps Engineer", icon: "Container", category: "Infrastructure" },
  { id: "qa", title: "QA Automation Engineer", icon: "Bug", category: "Quality" },
  { id: "cybersecurity", title: "Cybersecurity Analyst", icon: "Shield", category: "Security" },

  // Core Engineering & Automotive
  { id: "mechanical-engineer", title: "Mechanical Design Engineer (CAD/FEA)", icon: "Compass", category: "Core Engineering" },
  { id: "hev-engineer", title: "EV Powertrain Engineer", icon: "Zap", category: "Core Engineering" },
  { id: "car-designer", title: "Automotive Designer", icon: "Car", category: "Core Engineering" },
  { id: "civil-engineer", title: "Civil Site & Project Engineer", icon: "HardHat", category: "Core Engineering" },
  { id: "structural-bim", title: "Structural BIM Engineer", icon: "Layers", category: "Core Engineering" },

  // ECE & Robotics
  { id: "embedded-engineer", title: "Embedded Systems Engineer", icon: "Cpu", category: "Robotics & ECE" },
  { id: "vlsi-engineer", title: "VLSI Design Engineer", icon: "Layers", category: "Robotics & ECE" },
  { id: "robotics-engineer", title: "Robotics & ROS Engineer", icon: "Bot", category: "Robotics & ECE" },
  { id: "drone-engineer", title: "Drone Flight Systems Engineer", icon: "Navigation", category: "Robotics & ECE" },
  { id: "iot-specialist", title: "IoT & Sensor Network Specialist", icon: "Cpu", category: "Robotics & ECE" },

  // Management, Business & Finance
  { id: "product-manager", title: "Product Manager", icon: "Package", category: "Management & Finance" },
  { id: "investment-banker", title: "Investment Banking Analyst", icon: "Briefcase", category: "Management & Finance" },
  { id: "financial-analyst", title: "Financial Analyst & Modeler", icon: "DollarSign", category: "Management & Finance" },
  { id: "stock-trader", title: "Equity Research & Stock Trader", icon: "TrendingUp", category: "Management & Finance" },
  { id: "digital-marketer", title: "Digital Marketing Specialist", icon: "Megaphone", category: "Management & Finance" },
  { id: "hr-manager", title: "HR & Talent Acquisition Manager", icon: "Users", category: "Management & Finance" },
  { id: "supply-chain", title: "Operations & Supply Chain Manager", icon: "Truck", category: "Management & Finance" },
  { id: "startup-founder", title: "Startup Founder & Entrepreneur", icon: "Rocket", category: "Management & Finance" },

  // Healthcare & Pharma
  { id: "clinical-research", title: "Clinical Research Associate (CRA)", icon: "TestTube", category: "Healthcare & Pharma" },
  { id: "medical-coder", title: "Medical Coding Specialist (ICD-10)", icon: "FileSpreadsheet", category: "Healthcare & Pharma" },
  { id: "genetic-engineer", title: "Genetic Engineer & Biotechnologist", icon: "Dna", category: "Healthcare & Pharma" },
  { id: "psychologist", title: "Clinical & Health Psychologist", icon: "HeartPulse", category: "Healthcare & Pharma" },
  { id: "nanotechnology", title: "Nanotechnology Researcher", icon: "Atom", category: "Healthcare & Pharma" },

  // Design & Creative
  { id: "ui-ux-designer", title: "UI/UX Product Designer", icon: "Palette", category: "Design & Creative" },
  { id: "graphic-designer", title: "Graphic & Brand Visual Designer", icon: "PenTool", category: "Design & Creative" },
];

export const INTERVIEW_TYPE_CONFIG: Record<InterviewType, {
  label: string;
  description: string;
  color: string;
  icon: string;
  suggestedDuration: number;
  difficultyRange: DifficultyLevel[];
}> = {
  "system-design": {
    label: "System Design",
    description: "Architecture, scalability, distributed systems",
    color: "#3b82f6",
    icon: "LayoutGrid",
    suggestedDuration: 60,
    difficultyRange: ["medium", "hard"],
  },
  managerial: {
    label: "Managerial Interview",
    description: "Leadership, conflict resolution, strategy",
    color: "#ef4444",
    icon: "Crown",
    suggestedDuration: 45,
    difficultyRange: ["medium", "hard"],
  },
  "fresh-graduate": {
    label: "Fresh Graduate",
    description: "Fundamentals, academic projects, potential",
    color: "#14b8a6",
    icon: "GraduationCap",
    suggestedDuration: 30,
    difficultyRange: ["easy", "medium"],
  },
  "campus-placement": {
    label: "Campus Placement",
    description: "Aptitude, technical basics, group discussion",
    color: "#f97316",
    icon: "School",
    suggestedDuration: 30,
    difficultyRange: ["easy", "medium"],
  },
  "experienced-professional": {
    label: "Experienced Professional",
    description: "Domain expertise, architecture, mentoring",
    color: "#a855f7",
    icon: "Briefcase",
    suggestedDuration: 45,
    difficultyRange: ["medium", "hard"],
  },
  custom: {
    label: "Custom Interview",
    description: "Fully customizable interview simulation",
    color: "#64748b",
    icon: "Sliders",
    suggestedDuration: 30,
    difficultyRange: ["easy", "medium", "hard"],
  },
};
