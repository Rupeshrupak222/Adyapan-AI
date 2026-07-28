"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ChevronRight, Brain, CheckCircle2, XCircle,
  Clock, Bookmark, BookmarkCheck, TrendingUp, Zap, Target, Flame,
  Lightbulb, ArrowRight, ArrowLeft, Code, Code2,
  Coffee, FileCode, FileCode2, Braces, Cpu, Shield, Database, Terminal,
  Network, Layers, Kanban, Binary, Layout, Palette, Component, ShieldAlert,
  Smile, Server, Globe, Table, HardDrive, Cloud, CloudRain, CloudLightning,
  AlertCircle, Box, Anchor, MessageSquare, Eye, Copy, Check,
  BarChart2, RotateCcw, Flag, Trophy,
  CircleDot, Grid3X3, SkipForward, Home,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/services/api";
import CompanyLogo from "@/components/interview-hub/CompanyLogo";

// ─── Animation Variants (matching AptitudeEngineView) ───────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }),
};

const LOADING_STEPS = [
  "Preparing Questions",
  "Loading Technology Patterns",
  "Generating AI Insights",
  "Building Session",
  "Ready!"
];

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface MCQTechnology {
  id: string;
  name: string;
  slug: string;
  category: "Programming" | "Core CS" | "Web Development" | "Databases" | "Cloud" | "AI/ML";
  iconName: string;
  description: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  progress: number;
  solved: number;
}

interface MCQCompany {
  id: string;
  name: string;
  logo: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  avgPackage: string;
  description: string;
}

interface MCQQuestion {
  id: string;
  question: string;
  technology: string;
  company?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options: string[];
  correctAnswer: string;
  correctIdx: number;
  explanation: string;
  hint: string;
  relatedConcept?: string;
  estimatedTime: string;
  codeSnippet?: string;
  language?: string;
  optionExplanations?: { option: string; isCorrect: boolean; reason: string }[];
  interviewTip?: string;
  isBookmarked?: boolean;
}

interface UserProgress {
  questionsSolved: number;
  accuracy: number;
  avgTimeSeconds: number;
  streakDays: number;
  weakTopics: { topic: string; accuracy: number }[];
  strongTopics: { topic: string; accuracy: number }[];
  weeklyProgress: { day: string; solved: number; accuracy: number }[];
}

interface SessionAnswer {
  questionIdx: number;
  questionId: string;
  selectedIdx: number | null;
  correct: boolean;
  timeTakenMs: number;
  bookmarked: boolean;
  flagged: boolean;
}

interface SessionProgress {
  currentIdx: number;
  answers: SessionAnswer[];
  timeElapsed: number;
  timeRemaining: number;
  bookmarkedCount: number;
  flaggedCount: number;
}

type MCQView = "home" | "topic_select" | "active_session" | "session_review" | "analytics";

interface TechnicalMCQsModuleViewProps {
  setView?: (v: string) => void;
  theme?: string;
}

// ─── Tech Icon Resolver ───────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Code, Code2, Coffee, FileCode, FileCode2, Braces, Cpu, Shield, Database,
  Terminal, Network, Layers, Kanban, Binary, Layout, Palette, Component,
  ShieldAlert, Smile, Zap, Server, Globe, Table, HardDrive, Cloud, CloudRain,
  CloudLightning, AlertCircle, Box, Anchor, Brain, MessageSquare, Eye,
  TrendingUp, Flame,
};

function getTechIcon(iconName: string): React.ReactElement {
  const IconComp = (ICON_MAP[iconName] || Code2) as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComp size={20} className="text-amber-500" />;
}

// ─── Domain Categories ────────────────────────────────────────────────────

const DOMAIN_CATEGORIES = [
  { id: "All", label: "All", icon: Grid3X3, color: "#f59e0b" },
  { id: "Programming", label: "Programming", icon: Code2, color: "#3b82f6" },
  { id: "Core CS", label: "Core CS", icon: Cpu, color: "#8b5cf6" },
  { id: "Web Development", label: "Web Dev", icon: Globe, color: "#10b981" },
  { id: "Databases", label: "Databases", icon: Database, color: "#ef4444" },
  { id: "Cloud", label: "Cloud", icon: Cloud, color: "#06b6d4" },
  { id: "AI/ML", label: "AI/ML", icon: Brain, color: "#ec4899" },
];

// ─── Default Data ─────────────────────────────────────────────────────────

const DEFAULT_TECHNOLOGIES: MCQTechnology[] = [
  { id: "tech-c", name: "C", slug: "c", category: "Programming", iconName: "Code", description: "Pointers, memory management, preprocessors, and struct syntax.", questionCount: 140, difficulty: "Medium", progress: 70, solved: 14 },
  { id: "tech-cpp", name: "C++", slug: "cpp", category: "Programming", iconName: "Code2", description: "STL, templates, operator overloading, smart pointers, and RAII.", questionCount: 160, difficulty: "Hard", progress: 65, solved: 13 },
  { id: "tech-java", name: "Java", slug: "java", category: "Programming", iconName: "Coffee", description: "JVM, multithreading, garbage collection, collections framework.", questionCount: 220, difficulty: "Medium", progress: 80, solved: 16 },
  { id: "tech-python", name: "Python", slug: "python", category: "Programming", iconName: "FileCode", description: "Decorators, generators, GIL, list comprehensions, and OOPs.", questionCount: 200, difficulty: "Easy", progress: 85, solved: 17 },
  { id: "tech-js", name: "JavaScript", slug: "javascript", category: "Programming", iconName: "Braces", description: "Event loop, closures, promises, prototypes, and ES6+ syntax.", questionCount: 240, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-ts", name: "TypeScript", slug: "typescript", category: "Programming", iconName: "FileCode2", description: "Generics, type guards, interfaces, utility types, and strict mode.", questionCount: 130, difficulty: "Medium", progress: 60, solved: 12 },
  { id: "tech-go", name: "Go", slug: "go", category: "Programming", iconName: "Cpu", description: "Goroutines, channels, interfaces, pointers, and memory layout.", questionCount: 90, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "tech-rust", name: "Rust", slug: "rust", category: "Programming", iconName: "Shield", description: "Ownership, borrowing, lifetimes, pattern matching, and traits.", questionCount: 85, difficulty: "Hard", progress: 35, solved: 7 },
  { id: "tech-dbms", name: "DBMS", slug: "dbms", category: "Core CS", iconName: "Database", description: "Normalization, ACID properties, indexing, transactions, and ER diagrams.", questionCount: 210, difficulty: "Medium", progress: 82, solved: 16 },
  { id: "tech-os", name: "Operating Systems", slug: "os", category: "Core CS", iconName: "Terminal", description: "Process synchronization, deadlocks, virtual memory, and page replacement.", questionCount: 190, difficulty: "Hard", progress: 55, solved: 11 },
  { id: "tech-cn", name: "Computer Networks", slug: "cn", category: "Core CS", iconName: "Network", description: "OSI model, TCP/IP, subnetting, HTTP/HTTPS, and routing protocols.", questionCount: 180, difficulty: "Medium", progress: 68, solved: 14 },
  { id: "tech-oops", name: "OOPs", slug: "oops", category: "Core CS", iconName: "Layers", description: "Encapsulation, inheritance, polymorphism, abstraction, and SOLID principles.", questionCount: 175, difficulty: "Easy", progress: 90, solved: 18 },
  { id: "tech-se", name: "Software Engineering", slug: "se", category: "Core CS", iconName: "Kanban", description: "Agile, SDLC, design patterns, software testing, and CI/CD basics.", questionCount: 110, difficulty: "Easy", progress: 75, solved: 15 },
  { id: "tech-cd", name: "Compiler Design", slug: "cd", category: "Core CS", iconName: "Binary", description: "Lexical analysis, parsing, syntax trees, optimization, and code generation.", questionCount: 75, difficulty: "Hard", progress: 30, solved: 6 },
  { id: "tech-coa", name: "COA", slug: "coa", category: "Core CS", iconName: "Cpu", description: "Instruction sets, pipelining, cache mapping, and ALU operations.", questionCount: 85, difficulty: "Hard", progress: 40, solved: 8 },
  { id: "tech-html", name: "HTML", slug: "html", category: "Web Development", iconName: "Layout", description: "Semantic tags, forms, accessibility (a11y), and DOM elements.", questionCount: 120, difficulty: "Easy", progress: 95, solved: 19 },
  { id: "tech-css", name: "CSS", slug: "css", category: "Web Development", iconName: "Palette", description: "Flexbox, Grid, specificity, animations, transitions, and media queries.", questionCount: 135, difficulty: "Medium", progress: 85, solved: 17 },
  { id: "tech-react", name: "React", slug: "react", category: "Web Development", iconName: "Component", description: "Virtual DOM, hooks, reconciliation, context API, and performance optimization.", questionCount: 220, difficulty: "Medium", progress: 80, solved: 16 },
  { id: "tech-angular", name: "Angular", slug: "angular", category: "Web Development", iconName: "ShieldAlert", description: "RxJS, dependency injection, directives, modules, and zone.js.", questionCount: 100, difficulty: "Hard", progress: 50, solved: 10 },
  { id: "tech-vue", name: "Vue", slug: "vue", category: "Web Development", iconName: "Smile", description: "Reactivity system, composition API, directives, and pinia state.", questionCount: 90, difficulty: "Medium", progress: 60, solved: 12 },
  { id: "tech-next", name: "Next.js", slug: "nextjs", category: "Web Development", iconName: "Zap", description: "App router, SSR, SSG, ISR, server components, and API routes.", questionCount: 140, difficulty: "Hard", progress: 70, solved: 14 },
  { id: "tech-node", name: "Node.js", slug: "nodejs", category: "Web Development", iconName: "Server", description: "Event-driven architecture, streams, buffer, cluster, and event loop.", questionCount: 180, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-express", name: "Express", slug: "express", category: "Web Development", iconName: "Globe", description: "Middleware pipeline, routing, error handling, and security headers.", questionCount: 110, difficulty: "Easy", progress: 88, solved: 18 },
  { id: "tech-sql", name: "SQL", slug: "sql", category: "Databases", iconName: "Table", description: "Joins, subqueries, group by, window functions, and indexing strategies.", questionCount: 250, difficulty: "Medium", progress: 88, solved: 18 },
  { id: "tech-postgres", name: "PostgreSQL", slug: "postgresql", category: "Databases", iconName: "Database", description: "JSONB columns, CTEs, PL/pgSQL, MVCC, and full-text search.", questionCount: 140, difficulty: "Hard", progress: 65, solved: 13 },
  { id: "tech-mongo", name: "MongoDB", slug: "mongodb", category: "Databases", iconName: "HardDrive", description: "Aggregation framework, indexing, sharding, replication, and BSON.", questionCount: 150, difficulty: "Medium", progress: 72, solved: 14 },
  { id: "tech-mysql", name: "MySQL", slug: "mysql", category: "Databases", iconName: "Server", description: "InnoDB storage engine, query optimizer, transaction isolation levels.", questionCount: 160, difficulty: "Medium", progress: 80, solved: 16 },
  { id: "tech-redis", name: "Redis", slug: "redis", category: "Databases", iconName: "Zap", description: "Data structures (hashes, sets, pub/sub), persistence (RDB/AOF), and caching.", questionCount: 110, difficulty: "Hard", progress: 55, solved: 11 },
  { id: "tech-aws", name: "AWS", slug: "aws", category: "Cloud", iconName: "Cloud", description: "EC2, S3, Lambda, IAM, VPC, DynamoDB, and CloudFront.", questionCount: 210, difficulty: "Hard", progress: 60, solved: 12 },
  { id: "tech-azure", name: "Azure", slug: "azure", category: "Cloud", iconName: "CloudRain", description: "Azure VMs, Blob storage, Azure Functions, Entra ID, and AKS.", questionCount: 130, difficulty: "Hard", progress: 50, solved: 10 },
  { id: "tech-gcp", name: "GCP", slug: "gcp", category: "Cloud", iconName: "CloudLightning", description: "BigQuery, GKE, Cloud Run, Pub/Sub, and IAM roles.", questionCount: 140, difficulty: "Hard", progress: 55, solved: 11 },
  { id: "tech-docker", name: "Docker", slug: "docker", category: "Cloud", iconName: "Box", description: "Dockerfile optimization, multi-stage builds, volumes, and networking.", questionCount: 150, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-k8s", name: "Kubernetes", slug: "kubernetes", category: "Cloud", iconName: "Anchor", description: "Pods, Deployments, Services, Ingress, ConfigMaps, and Helm charts.", questionCount: 120, difficulty: "Hard", progress: 40, solved: 8 },
  { id: "tech-ml", name: "Machine Learning", slug: "machine-learning", category: "AI/ML", iconName: "Brain", description: "Supervised/unsupervised learning, regression, decision trees, and metrics.", questionCount: 180, difficulty: "Hard", progress: 65, solved: 13 },
  { id: "tech-dl", name: "Deep Learning", slug: "deep-learning", category: "AI/ML", iconName: "Cpu", description: "CNNs, RNNs, backpropagation, activation functions, and gradient descent.", questionCount: 140, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "tech-nlp", name: "NLP", slug: "nlp", category: "AI/ML", iconName: "MessageSquare", description: "Tokenization, TF-IDF, Word2Vec, Transformers, and attention mechanisms.", questionCount: 110, difficulty: "Hard", progress: 50, solved: 10 },
  { id: "tech-cv", name: "Computer Vision", slug: "computer-vision", category: "AI/ML", iconName: "Eye", description: "OpenCV, image transformations, object detection (YOLO), and segmentation.", questionCount: 95, difficulty: "Hard", progress: 40, solved: 8 },
  { id: "tech-ds", name: "Data Science", slug: "data-science", category: "AI/ML", iconName: "TrendingUp", description: "Pandas, NumPy, EDA, feature engineering, and statistical testing.", questionCount: 160, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-tf", name: "TensorFlow", slug: "tensorflow", category: "AI/ML", iconName: "Box", description: "Keras API, computational graphs, tensors, and model exporting.", questionCount: 100, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "tech-torch", name: "PyTorch", slug: "pytorch", category: "AI/ML", iconName: "Flame", description: "Autograd, Tensors, nn.Module, DataLoader, and custom loss functions.", questionCount: 115, difficulty: "Hard", progress: 55, solved: 11 },
];

const DEFAULT_COMPANIES: MCQCompany[] = [
  { id: "google", name: "Google", logo: "Google", questionCount: 320, difficulty: "Hard", avgPackage: "25 - 55 LPA", description: "Deep algorithmic MCQs, OS concurrency & System Architecture puzzles." },
  { id: "microsoft", name: "Microsoft", logo: "Microsoft", questionCount: 290, difficulty: "Hard", avgPackage: "20 - 48 LPA", description: "OOPs, C++ internals, Memory Layout, and Cloud questions." },
  { id: "amazon", name: "Amazon", logo: "Amazon", questionCount: 340, difficulty: "Hard", avgPackage: "16 - 45 LPA", description: "DBMS indexing, Distributed Systems, Data Structures, and Java." },
  { id: "adobe", name: "Adobe", logo: "Adobe", questionCount: 220, difficulty: "Hard", avgPackage: "18 - 40 LPA", description: "C++ STL, Computer Graphics, Bit manipulation, and OS." },
  { id: "meta", name: "Meta", logo: "Meta", questionCount: 270, difficulty: "Hard", avgPackage: "24 - 50 LPA", description: "JavaScript event loop, React architecture, and System Design MCQs." },
  { id: "apple", name: "Apple", logo: "Apple", questionCount: 210, difficulty: "Hard", avgPackage: "22 - 46 LPA", description: "Swift internals, C memory safety, Firmware & OS concepts." },
  { id: "nvidia", name: "NVIDIA", logo: "NVIDIA", questionCount: 190, difficulty: "Hard", avgPackage: "20 - 42 LPA", description: "CUDA programming, Parallel computing, C++, and Computer Architecture." },
  { id: "oracle", name: "Oracle", logo: "Oracle", questionCount: 250, difficulty: "Hard", avgPackage: "15 - 35 LPA", description: "Java JVM tuning, SQL query optimization, and DBMS locking." },
  { id: "ibm", name: "IBM", logo: "IBM", questionCount: 200, difficulty: "Medium", avgPackage: "8 - 18 LPA", description: "Cloud computing, Microservices, Python, and Enterprise Linux." },
  { id: "tcs", name: "TCS", logo: "TCS", questionCount: 410, difficulty: "Medium", avgPackage: "3.6 - 9.0 LPA", description: "TCS NQT Advanced coding MCQs, Pseudocode, and Java basics." },
  { id: "infosys", name: "Infosys", logo: "Infosys", questionCount: 380, difficulty: "Medium", avgPackage: "3.6 - 9.5 LPA", description: "System Engineer & Power Programmer technical screening tests." },
  { id: "accenture", name: "Accenture", logo: "Accenture", questionCount: 350, difficulty: "Medium", avgPackage: "4.5 - 8.5 LPA", description: "Pseudocode analysis, Networking, DBMS, and Web development." },
  { id: "wipro", name: "Wipro", logo: "Wipro", questionCount: 310, difficulty: "Easy", avgPackage: "3.5 - 6.5 LPA", description: "NLTH technical aptitude, C fundamentals, and Data Structures." },
  { id: "capgemini", name: "Capgemini", logo: "Capgemini", questionCount: 290, difficulty: "Medium", avgPackage: "4.0 - 7.5 LPA", description: "Game-based aptitude & technical pseudo-code evaluations." },
  { id: "cognizant", name: "Cognizant", logo: "Cognizant", questionCount: 300, difficulty: "Medium", avgPackage: "4.0 - 8.0 LPA", description: "GenC Elevate coding MCQs, SQL, and OOP concepts." },
  { id: "deloitte", name: "Deloitte", logo: "Deloitte", questionCount: 240, difficulty: "Hard", avgPackage: "7.6 - 12.0 LPA", description: "Tech advisory logic, Data Analytics, Python, and SQL." },
];

const DEFAULT_MCQ_QUESTIONS: MCQQuestion[] = [
  {
    id: "q-mcq-1", technology: "Java", company: "Amazon", difficulty: "Medium",
    question: "What will be the output of the following Java snippet regarding String immutability and memory pool allocation?",
    codeSnippet: `public class Test {\n  public static void main(String[] args) {\n    String s1 = "Adyapan";\n    String s2 = new String("Adyapan");\n    String s3 = s2.intern();\n    System.out.println((s1 == s2) + " " + (s1 == s3));\n  }\n}`,
    language: "java",
    options: ["false true", "true true", "false false", "true false"],
    correctAnswer: "false true", correctIdx: 0,
    explanation: "s1 points to the String constant pool instance. s2 creates a new object in Heap memory, so (s1 == s2) is false. s2.intern() returns the pool reference, which equals s1, so (s1 == s3) is true.",
    hint: "Remember that '==' checks memory reference equality, whereas string.intern() returns the reference from the string pool.",
    estimatedTime: "45 sec",
  },
  {
    id: "q-mcq-2", technology: "DBMS", company: "Google", difficulty: "Hard",
    question: "Which of the following Isolation Levels prevents Non-Repeatable Reads but MAY still suffer from Phantom Reads in standard SQL database systems?",
    language: "sql",
    options: ["REPEATABLE READ", "READ COMMITTED", "SERIALIZABLE", "READ UNCOMMITTED"],
    correctAnswer: "REPEATABLE READ", correctIdx: 0,
    explanation: "REPEATABLE READ locks existing rows preventing non-repeatable reads, but standard SQL permits phantom reads where new rows inserted by concurrent transactions can appear during a subsequent range query.",
    hint: "Think of SQL-92 isolation levels hierarchy: Read Uncommitted < Read Committed < Repeatable Read < Serializable.",
    estimatedTime: "60 sec",
  },
  {
    id: "q-mcq-3", technology: "Python", company: "Microsoft", difficulty: "Medium",
    question: "What is the expected output of this Python code snippet demonstrating default mutable parameter behavior?",
    codeSnippet: `def append_item(val, target=[]):\n    target.append(val)\n    return target\n\nprint(append_item(1))\nprint(append_item(2))`,
    language: "python",
    options: ["[1, 2]", "[1]\n[2]", "[1]\n[1, 2]", "[1, 2]\n[1, 2]"],
    correctAnswer: "[1]\n[1, 2]", correctIdx: 2,
    explanation: "In Python, default arguments are evaluated ONCE when the function definition is executed. Thus, the default list 'target' is shared across all function calls.",
    hint: "Default argument values are created at function definition time, not function execution time.",
    estimatedTime: "40 sec",
  }
];

const PROMPT_SUGGESTION_CHIPS = [
  "Generate 20 Java MCQs",
  "Generate Amazon DBMS Questions",
  "Create Google OS MCQs",
  "Generate Python Interview Questions",
  "Generate React MCQs",
  "Generate AWS Beginner Quiz",
];

// ─── Main Component ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TechnicalMCQsModuleView({ setView: _setView, theme = "dark" }: TechnicalMCQsModuleViewProps) {
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
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#ffffff",
    green: "#10b981",
    red: "#ef4444",
  };

  // ── View State ──
  const [view, setViewState] = useState<MCQView>("home");
  const [activeTab, setActiveTab] = useState<"home" | "analytics">("home");

  // ── Data ──
  const [technologies] = useState<MCQTechnology[]>(DEFAULT_TECHNOLOGIES);
  const [companies] = useState<MCQCompany[]>(DEFAULT_COMPANIES);

  // ── Filters ──
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [searchQuery] = useState("");
  const [selectedDifficulty] = useState("All");

  // ── AI Prompt ──
  const [aiPromptInput, setAiPromptInput] = useState("");

  // ── Session State ──
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [sessionConfig, setSessionConfig] = useState<{ tech: string; company: string; domain: string }>({ tech: "", company: "", domain: "" });
  const [progress, setProgress] = useState<SessionProgress>({
    currentIdx: 0, answers: [], timeElapsed: 0, timeRemaining: 0, bookmarkedCount: 0, flaggedCount: 0
  });
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // ── Loading ──
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [, setQuestionsLoading] = useState(false);

  // ── Progress (real data from analytics API) ──
  const [userProgress, setUserProgress] = useState<UserProgress>({
    questionsSolved: 0, accuracy: 0, avgTimeSeconds: 0, streakDays: 0,
    weakTopics: [], strongTopics: [], weeklyProgress: [],
  });

  useEffect(() => {
    api.get("/aptitude/analytics").then(({ data }) => {
      if (!data?.success || !data.analytics) return;
      const a = data.analytics;
      const mastery: { topic: string; accuracy: number; totalAttempted: number }[] = Array.isArray(a.topicMastery) ? a.topicMastery : [];
      const weakNames: string[] = Array.isArray(a.weakTopics) ? a.weakTopics : [];
      const strongNames: string[] = Array.isArray(a.strongTopics) ? a.strongTopics : [];
      const weakTopics = weakNames.map(name => {
        const m = mastery.find((t: { topic: string }) => t.topic === name);
        return { topic: name, accuracy: m ? Math.round(m.accuracy) : 0 };
      });
      const strongTopics = strongNames.map(name => {
        const m = mastery.find((t: { topic: string }) => t.topic === name);
        return { topic: name, accuracy: m ? Math.round(m.accuracy) : 0 };
      });
      const weeklyProgress = (Array.isArray(a.weeklyProgress) ? a.weeklyProgress : []).slice(-7).map((w: { week: string; sessionsCompleted: number; accuracy: number }) => ({
        day: w.week, solved: w.sessionsCompleted, accuracy: Math.round(w.accuracy),
      }));
      setUserProgress({
        questionsSolved: a.totalQuestions ?? 0,
        accuracy: Math.round(a.overallAccuracy ?? 0),
        avgTimeSeconds: Math.round((a.avgTimePerQMs ?? 0) / 1000),
        streakDays: a.streak ?? 0,
        weakTopics, strongTopics, weeklyProgress,
      });
    }).catch(() => {});
  }, []);

  // ── Refs ──
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartTimeRef = useRef<number>(0);

  // ── Computed ──
  const currentQuestion = questions[progress.currentIdx] || null;
  const currentAnswer = progress.answers.find(a => a.questionIdx === progress.currentIdx) || null;
  const progressPercent = questions.length > 0 ? Math.round((progress.answers.length / questions.length) * 100) : 0;

  const filteredTechnologies = useMemo(() => {
    let filtered = selectedDomain === "All" ? technologies : technologies.filter(t => t.category === selectedDomain);
    if (searchQuery.trim()) {
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return filtered;
  }, [technologies, selectedDomain, searchQuery]);

  const filteredCompanies = useMemo(() => {
    if (selectedDifficulty === "All") return companies;
    return companies.filter(c => c.difficulty === selectedDifficulty);
  }, [companies, selectedDifficulty]);

  // ── Timer ──
  useEffect(() => {
    if (view === "active_session") {
      timerRef.current = setInterval(() => {
        setProgress(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 1000 }));
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view]);

  // ── Loading Overlay ──
  useEffect(() => {
    if (aiLoading) {
      setLoadingStep(0);
      loadingTimerRef.current = setInterval(() => {
        setLoadingStep(prev => {
          if (prev >= LOADING_STEPS.length - 1) { clearInterval(loadingTimerRef.current!); return prev; }
          return prev + 1;
        });
      }, 600);
    }
    return () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); };
  }, [aiLoading]);

  // ── Session Start ──
  const startSession = useCallback(async (tech: string, company: string, domain: string, prompt?: string) => {
    setAiLoading(true);
    setShowExplanation(false);
    setShowHint(false);
    try {
      const res = await api.post("/mcq/generate", { prompt: prompt || `Generate 15 ${tech || company || domain || "mixed"} MCQs` });
      if (res.data?.success && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        setSessionConfig({ tech, company, domain });
        setProgress({ currentIdx: 0, answers: [], timeElapsed: 0, timeRemaining: 0, bookmarkedCount: 0, flaggedCount: 0 });
        questionStartTimeRef.current = Date.now();
        setViewState("active_session");
        toast.success(`Loaded ${res.data.questions.length} questions!`);
      } else {
        setQuestions(DEFAULT_MCQ_QUESTIONS);
        setSessionConfig({ tech, company, domain });
        setProgress({ currentIdx: 0, answers: [], timeElapsed: 0, timeRemaining: 0, bookmarkedCount: 0, flaggedCount: 0 });
        questionStartTimeRef.current = Date.now();
        setViewState("active_session");
      }
    } catch {
      setQuestions(DEFAULT_MCQ_QUESTIONS);
      setSessionConfig({ tech, company, domain });
      setProgress({ currentIdx: 0, answers: [], timeElapsed: 0, timeRemaining: 0, bookmarkedCount: 0, flaggedCount: 0 });
      questionStartTimeRef.current = Date.now();
      setViewState("active_session");
      toast.info("Using sample questions");
    } finally {
      setAiLoading(false);
    }
  }, [setShowExplanation, setShowHint]);

  // ── Fetch Questions ──
  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const res = await api.get("/mcq/questions", {
        params: { technology: sessionConfig.tech, company: sessionConfig.company, difficulty: selectedDifficulty !== "All" ? selectedDifficulty : undefined, search: searchQuery || undefined },
      });
      if (res.data?.success && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
      } else {
        setQuestions(DEFAULT_MCQ_QUESTIONS);
      }
    } catch {
      setQuestions(DEFAULT_MCQ_QUESTIONS);
    } finally {
      setQuestionsLoading(false);
    }
  }, [sessionConfig, selectedDifficulty, searchQuery]);

  useEffect(() => {
    if (view === "active_session" && questions.length === 0) fetchQuestions();
  }, [view, fetchQuestions, questions.length]);

  // ── Submit Answer ──
  const submitAnswer = useCallback((selectedIdx: number | null) => {
    if (!currentQuestion || selectedIdx === null) return;
    const timeTakenMs = Date.now() - questionStartTimeRef.current;
    const isCorrect = selectedIdx === currentQuestion.correctIdx;

    setProgress(prev => {
      const filtered = prev.answers.filter(a => a.questionIdx !== prev.currentIdx);
      const updated: SessionAnswer = {
        questionIdx: prev.currentIdx, questionId: currentQuestion.id, selectedIdx, correct: isCorrect,
        timeTakenMs, bookmarked: prev.answers.find(a => a.questionIdx === prev.currentIdx)?.bookmarked ?? false,
        flagged: prev.answers.find(a => a.questionIdx === prev.currentIdx)?.flagged ?? false,
      };
      return { ...prev, answers: [...filtered, updated] };
    });

    if (isCorrect) toast.success("Correct! +30 XP");
    else toast.error("Incorrect. Read the explanation below.");

    try { api.post("/mcq/submit", { questionId: currentQuestion.id, selectedIdx, timeTakenSeconds: Math.round(timeTakenMs / 1000) }); } catch {}
  }, [currentQuestion]);

  // ── Navigation ──
  const handleCompleteSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setViewState("session_review");
  }, []);

  const handleNextQuestion = useCallback(() => {
    const nextIdx = progress.currentIdx + 1;
    if (nextIdx >= questions.length) {
      handleCompleteSession();
    } else {
      setProgress(prev => ({ ...prev, currentIdx: nextIdx }));
      questionStartTimeRef.current = Date.now();
      setShowExplanation(false);
      setShowHint(false);
    }
  }, [progress.currentIdx, questions.length, handleCompleteSession, setShowExplanation, setShowHint]);

  const navigateToQuestion = useCallback((idx: number) => {
    setProgress(prev => ({ ...prev, currentIdx: idx }));
    questionStartTimeRef.current = Date.now();
    setShowExplanation(false);
    setShowHint(false);
  }, [setShowExplanation, setShowHint]);

  const toggleBookmark = useCallback((idx: number) => {
    setProgress(prev => {
      const existing = prev.answers.find(a => a.questionIdx === idx);
      const filtered = prev.answers.filter(a => a.questionIdx !== idx);
      const updated: SessionAnswer = existing
        ? { ...existing, bookmarked: !existing.bookmarked }
        : { questionIdx: idx, questionId: questions[idx]?.id || "", selectedIdx: null, correct: false, timeTakenMs: 0, bookmarked: true, flagged: false };
      const newAnswers = [...filtered, updated];
      return { ...prev, answers: newAnswers, bookmarkedCount: newAnswers.filter(a => a.bookmarked).length };
    });
  }, [questions]);

  const toggleFlag = useCallback((idx: number) => {
    setProgress(prev => {
      const existing = prev.answers.find(a => a.questionIdx === idx);
      const filtered = prev.answers.filter(a => a.questionIdx !== idx);
      const updated: SessionAnswer = existing
        ? { ...existing, flagged: !existing.flagged }
        : { questionIdx: idx, questionId: questions[idx]?.id || "", selectedIdx: null, correct: false, timeTakenMs: 0, bookmarked: false, flagged: true };
      const newAnswers = [...filtered, updated];
      return { ...prev, answers: newAnswers, flaggedCount: newAnswers.filter(a => a.flagged).length };
    });
  }, [questions]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ── Nav Status ──
  const getNavStatus = (idx: number): "correct" | "incorrect" | "skipped" | "current" | "unanswered" => {
    if (idx === progress.currentIdx) return "current";
    const answer = progress.answers.find(a => a.questionIdx === idx);
    if (!answer) return "unanswered";
    if (answer.selectedIdx === null) return "skipped";
    if (answer.correct) return "correct";
    return "incorrect";
  };

  const navColors: Record<string, { bg: string; border: string; text: string }> = {
    current: { bg: "rgba(245,158,11,0.2)", border: "rgba(245,158,11,0.5)", text: "#f59e0b" },
    correct: { bg: "rgba(16,185,129,0.2)", border: "rgba(16,185,129,0.4)", text: "#10b981" },
    incorrect: { bg: "rgba(239,68,68,0.2)", border: "rgba(239,68,68,0.4)", text: "#ef4444" },
    skipped: { bg: "rgba(148,163,184,0.15)", border: "rgba(148,163,184,0.3)", text: "#94a3b8" },
    unanswered: { bg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", text: c.textMuted },
  };

  const formatTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    return `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
  };

  const handleGoHome = useCallback(() => {
    setViewState("home");
    setActiveTab("home");
    setQuestions([]);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [setActiveTab]);

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative flex flex-col h-full min-h-[calc(100vh-120px)]" style={{ color: c.text }}>

      {/* ── LOADING OVERLAY ────────────────────────────────────────────── */}
      <AnimatePresence>
        {aiLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: isDark ? "rgba(8,7,16,0.92)" : "rgba(240,244,255,0.92)" }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="p-8 rounded-3xl border max-w-sm w-full mx-4 space-y-6" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="text-center space-y-2">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-14 h-14 mx-auto rounded-full border-2 border-t-transparent flex items-center justify-center" style={{ borderColor: `${c.primary}40`, borderTopColor: "transparent" }}>
                  <Sparkles size={22} className="text-amber-500" />
                </motion.div>
                <h3 className="text-sm font-extrabold" style={{ color: c.text }}>Setting Up Your Session</h3>
                <p className="text-xs" style={{ color: c.textMuted }}>AI is crafting personalized questions...</p>
              </div>
              <div className="space-y-2">
                {LOADING_STEPS.map((step, idx) => (
                  <motion.div key={step} initial={{ opacity: 0, x: -10 }} animate={{ opacity: idx <= loadingStep ? 1 : 0.3, x: 0 }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: idx < loadingStep ? `${c.green}20` : idx === loadingStep ? `${c.primary}20` : "transparent", border: `1.5px solid ${idx < loadingStep ? c.green : idx === loadingStep ? c.primary : c.border}` }}>
                      {idx < loadingStep ? <CheckCircle2 size={11} style={{ color: c.green }} /> : idx === loadingStep ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}><CircleDot size={9} style={{ color: c.primary }} /></motion.div> : <div className="w-2 h-2 rounded-full" style={{ background: c.border }} />}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: idx <= loadingStep ? c.text : c.textMuted }}>{step}</span>
                  </motion.div>
                ))}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                <motion.div animate={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }} transition={{ duration: 0.4 }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c.primary}, ${c.primaryDark})` }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center border-b pb-2.5 shrink-0" style={{ borderColor: c.border }}>
        <div className="flex items-center gap-3">
          {view !== "home" && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleGoHome} className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors" style={{ borderColor: c.border, color: c.textSec }}>
              <ArrowLeft size={14} />
            </motion.button>
          )}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">AI Technical Engine</p>
            <h2 className="text-base font-extrabold" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {view === "home" && activeTab === "home" && "Technical MCQs Hub"}
              {view === "home" && activeTab === "analytics" && "Performance Analytics"}
              {view === "topic_select" && "Select Technology"}
              {view === "active_session" && "Practice Session"}
              {view === "session_review" && "Session Review"}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {view === "active_session" && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold" style={{ background: "rgba(16,185,129,0.1)", borderColor: "rgba(16,185,129,0.3)", color: "#10b981" }}>
                <Clock size={13} />{formatTime(progress.timeElapsed)}
              </div>
              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                <motion.div animate={{ width: `${progressPercent}%` }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${c.primary}, ${c.primaryDark})` }} />
              </div>
              <span className="text-[10px] font-black" style={{ color: c.textMuted }}>{progress.answers.length}/{questions.length}</span>
            </div>
          )}
          {view !== "active_session" && (
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => setActiveTab(activeTab === "analytics" ? "home" : "analytics")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">
              <BarChart2 size={12} />{activeTab === "analytics" ? "Home" : "Analytics"}
            </motion.button>
          )}
        </div>
      </div>

      {/* ── VIEWS ──────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">

          {/* ═══ HOME VIEW ═══ */}
          {view === "home" && activeTab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">

              {/* Hero */}
              <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-6 rounded-2xl border text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))`, borderColor: "rgba(245,158,11,0.2)" }}>
                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Code2 size={30} className="text-amber-500" />
                </motion.div>
                <h2 className="text-lg font-black" style={{ color: c.text }}>AI Technical MCQ Engine</h2>
                <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: c.textSec }}>
                  Master technical interviews with AI-powered MCQs across 36+ technologies, company-specific tests, and personalized learning paths.
                </p>
              </motion.div>

              {/* Stat Cards */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Solved", value: userProgress.questionsSolved, icon: CheckCircle2, color: "#10b981" },
                  { label: "Accuracy", value: `${userProgress.accuracy}%`, icon: Target, color: "#f59e0b" },
                  { label: "Avg Time", value: `${userProgress.avgTimeSeconds}s`, icon: Clock, color: "#3b82f6" },
                  { label: "Streak", value: `${userProgress.streakDays}d`, icon: Flame, color: "#ef4444" },
                  { label: "Technologies", value: technologies.length, icon: Code2, color: "#8b5cf6" },
                ].map((stat, i) => (
                  <motion.div key={stat.label} variants={scaleIn} initial="hidden" animate="visible" custom={i} className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${stat.color}15` }}><stat.icon size={14} style={{ color: stat.color }} /></div>
                      <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>{stat.label}</span>
                    </div>
                    <p className="text-xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* AI Prompt Bar */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-500">
                  <Sparkles size={14} /> AI MCQ Generator
                </div>
                <div className="relative flex items-center gap-2">
                  <input type="text" value={aiPromptInput} onChange={(e) => setAiPromptInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && aiPromptInput.trim() && startSession("", "", "", aiPromptInput)} placeholder="e.g. 'Generate 20 Java MCQs' or 'Create Amazon DBMS questions'..." className="w-full rounded-xl px-4 py-3 text-xs border focus:outline-none focus:border-amber-500 transition-all" style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => aiPromptInput.trim() && startSession("", "", "", aiPromptInput)} className="px-5 py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shrink-0 transition-all disabled:opacity-50 shadow-md" disabled={!aiPromptInput.trim()}>
                    <Sparkles size={14} /> Generate
                  </motion.button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                  <span className="font-semibold shrink-0" style={{ color: c.textMuted }}>Try:</span>
                  {PROMPT_SUGGESTION_CHIPS.map((chip) => (
                    <button key={chip} onClick={() => { setAiPromptInput(chip); startSession("", "", "", chip); }} className="px-3 py-1 rounded-lg border hover:border-amber-500 shrink-0 transition-all font-medium" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>{chip}</button>
                  ))}
                </div>
              </motion.div>

              {/* Domain Categories */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Technology Domains</h3>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {DOMAIN_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      return (
                        <button key={cat.id} onClick={() => setSelectedDomain(cat.id)} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold shrink-0 transition-all" style={{ background: selectedDomain === cat.id ? `${cat.color}20` : "transparent", borderColor: selectedDomain === cat.id ? `${cat.color}40` : c.border, color: selectedDomain === cat.id ? cat.color : c.textMuted }}>
                          <Icon size={10} />{cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredTechnologies.slice(0, 12).map((t, i) => (
                    <motion.div key={t.id} variants={scaleIn} initial="hidden" animate="visible" custom={i} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => startSession(t.name, "", t.category)} className="p-5 border rounded-2xl cursor-pointer transition-all" style={{ background: c.cardBg, borderColor: c.border }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">{getTechIcon(t.iconName)}</div>
                        <div className="relative w-9 h-9 flex items-center justify-center">
                          <svg className="w-9 h-9 transform -rotate-90"><circle cx="18" cy="18" r="14" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeWidth="3" fill="none" /><circle cx="18" cy="18" r="14" stroke="#F59E0B" strokeWidth="3" fill="none" strokeDasharray={88} strokeDashoffset={88 - (88 * t.progress) / 100} strokeLinecap="round" /></svg>
                          <span className="absolute text-[9px] font-black text-amber-500">{t.progress}%</span>
                        </div>
                      </div>
                      <p className="text-xs font-extrabold" style={{ color: c.text }}>{t.name}</p>
                      <p className="text-[10px] mt-1 leading-relaxed line-clamp-2" style={{ color: c.textMuted }}>{t.description}</p>
                      <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-bold" style={{ borderColor: c.border }}>
                        <span style={{ color: c.textMuted }}>{t.questionCount}Q</span>
                        <span className="flex items-center gap-1 text-amber-500">Start <ChevronRight size={10} /></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {filteredTechnologies.length > 12 && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setViewState("topic_select")} className="w-full p-3 border rounded-2xl text-center text-xs font-bold transition-colors" style={{ borderColor: c.border, color: c.primary, background: `${c.primary}08` }}>
                    View All {filteredTechnologies.length} Technologies
                  </motion.button>
                )}
              </motion.div>

              {/* Company Tests */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Company-Specific MCQs</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredCompanies.slice(0, 8).map((comp, i) => (
                    <motion.div key={comp.id} variants={scaleIn} initial="hidden" animate="visible" custom={i} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => startSession("", comp.name, "")} className="p-4 border rounded-2xl cursor-pointer transition-all" style={{ background: c.cardBg, borderColor: c.border }}>
                      <div className="flex items-center justify-between mb-2">
                        <CompanyLogo companyName={comp.name} companyId={comp.id} size={36} theme={theme} />
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${comp.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : comp.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{comp.difficulty}</span>
                      </div>
                      <p className="text-[11px] font-extrabold" style={{ color: c.text }}>{comp.name}</p>
                      <p className="text-[9px] mt-1" style={{ color: c.textMuted }}>{comp.avgPackage}</p>
                      <div className="mt-2 pt-2 border-t flex items-center justify-between text-[10px]" style={{ borderColor: c.border }}>
                        <span className="font-bold" style={{ color: c.textMuted }}>{comp.questionCount}Q</span>
                        <span className="font-bold text-amber-500 flex items-center gap-1">Practice <ChevronRight size={10} /></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Performance Dashboard */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="p-5 rounded-2xl border space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2">
                  <BarChart2 size={15} className="text-amber-500" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Weekly Progress</h3>
                </div>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userProgress.weeklyProgress} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                      <XAxis dataKey="day" stroke={isDark ? "#64748B" : "#94A3B8"} fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDark ? "#64748B" : "#94A3B8"} fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: isDark ? "#0A0A0C" : "#FFFFFF", border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)", borderRadius: "8px", fontSize: "11px", color: c.text }} itemStyle={{ color: "#F59E0B" }} />
                      <Bar dataKey="solved" radius={[4, 4, 0, 0]}>{userProgress.weeklyProgress.map((_, index) => (<Cell key={`cell-${index}`} fill={index === 5 ? "#F59E0B" : "rgba(245, 158, 11, 0.4)"} />))}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: c.border }}>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center gap-1"><AlertCircle size={12} /> Weak Topics</span>
                    {userProgress.weakTopics.map((wt) => (
                      <div key={wt.topic} className="flex items-center justify-between text-[11px]">
                        <span className="font-medium" style={{ color: c.textSec }}>{wt.topic}</span>
                        <span className="text-red-400 font-bold">{wt.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-green-500 flex items-center gap-1"><CheckCircle2 size={12} /> Strong Topics</span>
                    {userProgress.strongTopics.map((st) => (
                      <div key={st.topic} className="flex items-center justify-between text-[11px]">
                        <span className="font-medium" style={{ color: c.textSec }}>{st.topic}</span>
                        <span className="text-green-400 font-bold">{st.accuracy}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="h-4" />
            </motion.div>
          )}

          {/* ═══ TOPIC SELECT VIEW ═══ */}
          {view === "topic_select" && (
            <motion.div key="topic-select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}><Code2 size={20} className="text-amber-500" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>All Technologies</p>
                  <h3 className="text-sm font-extrabold" style={{ color: c.text }}>{filteredTechnologies.length} Technologies in {selectedDomain === "All" ? "All Domains" : selectedDomain}</h3>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                {DOMAIN_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.id} onClick={() => setSelectedDomain(cat.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-[10px] font-bold shrink-0 transition-all" style={{ background: selectedDomain === cat.id ? `${cat.color}20` : "transparent", borderColor: selectedDomain === cat.id ? `${cat.color}40` : c.border, color: selectedDomain === cat.id ? cat.color : c.textMuted }}>
                      <Icon size={10} />{cat.label}
                    </button>
                  );
                })}
              </motion.div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredTechnologies.map((t, i) => (
                  <motion.div key={t.id} variants={scaleIn} initial="hidden" animate="visible" custom={i} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => startSession(t.name, "", t.category)} className="p-5 border rounded-2xl cursor-pointer transition-all" style={{ background: c.cardBg, borderColor: c.border }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">{getTechIcon(t.iconName)}</div>
                      <div className="relative w-9 h-9 flex items-center justify-center">
                        <svg className="w-9 h-9 transform -rotate-90"><circle cx="18" cy="18" r="14" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeWidth="3" fill="none" /><circle cx="18" cy="18" r="14" stroke="#F59E0B" strokeWidth="3" fill="none" strokeDasharray={88} strokeDashoffset={88 - (88 * t.progress) / 100} strokeLinecap="round" /></svg>
                        <span className="absolute text-[9px] font-black text-amber-500">{t.progress}%</span>
                      </div>
                    </div>
                    <p className="text-xs font-extrabold" style={{ color: c.text }}>{t.name}</p>
                    <p className="text-[10px] mt-1 leading-relaxed line-clamp-2" style={{ color: c.textMuted }}>{t.description}</p>
                    <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-bold" style={{ borderColor: c.border }}>
                      <span style={{ color: c.textMuted }}>{t.questionCount}Q · {t.difficulty}</span>
                      <span className="flex items-center gap-1 text-amber-500">Start <ChevronRight size={10} /></span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ ACTIVE SESSION ═══ */}
          {view === "active_session" && currentQuestion && (
            <motion.div key="active-session" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex gap-4 h-[calc(100vh-160px)]">
              {/* Question Area */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 border space-y-5" style={{ background: c.cardBg, borderColor: c.border }}>

                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: c.border }}>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-500">{currentQuestion.technology}</span>
                      {currentQuestion.company && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>{currentQuestion.company}</span>}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${currentQuestion.difficulty === "Easy" ? "text-green-500 border-green-500/20 bg-green-500/10" : currentQuestion.difficulty === "Hard" ? "text-red-500 border-red-500/20 bg-red-500/10" : "text-amber-500 border-amber-500/20 bg-amber-500/10"}`}>{currentQuestion.difficulty}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: c.textMuted }}><Clock size={12} className="text-amber-500" />{currentQuestion.estimatedTime}</div>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => toggleBookmark(progress.currentIdx)} className="p-1.5 rounded-lg border" style={{ borderColor: c.border }}>
                        {currentAnswer?.bookmarked ? <BookmarkCheck size={14} className="text-amber-500" /> : <Bookmark size={14} style={{ color: c.textMuted }} />}
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => toggleFlag(progress.currentIdx)} className="p-1.5 rounded-lg border" style={{ borderColor: c.border }}>
                        <Flag size={14} style={{ color: currentAnswer?.flagged ? "#ef4444" : c.textMuted }} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Question */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold leading-relaxed" style={{ color: c.text }}>{currentQuestion.question}</h3>
                    {currentQuestion.codeSnippet && (
                      <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 font-mono text-xs text-emerald-400 p-4 relative">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 mb-2 border-b border-slate-800 font-sans">
                          <span className="uppercase tracking-wider font-bold text-amber-400">{currentQuestion.language || "code"}</span>
                          <button onClick={() => handleCopyCode(currentQuestion.codeSnippet!)} className="flex items-center gap-1 hover:text-white transition-colors">
                            {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}{copiedCode ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed"><code>{currentQuestion.codeSnippet}</code></pre>
                      </div>
                    )}
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.options.map((opt, oIdx) => {
                      const isSelected = currentAnswer?.selectedIdx === oIdx;
                      const isCorrectAnswer = oIdx === currentQuestion.correctIdx;
                      const isSubmitted = currentAnswer !== null;
                      let optStyle = { background: isDark ? "rgba(255,255,255,0.03)" : "#F1F5F9", borderColor: c.border, color: c.text };
                      if (isSelected && !isSubmitted) optStyle = { background: "rgba(245,158,11,0.12)", borderColor: "#F59E0B", color: "#F59E0B" };
                      if (isSubmitted && isCorrectAnswer) optStyle = { background: "rgba(16,185,129,0.12)", borderColor: "#10B981", color: "#10B981" };
                      if (isSubmitted && isSelected && !isCorrectAnswer) optStyle = { background: "rgba(239,68,68,0.12)", borderColor: "#EF4444", color: "#EF4444" };
                      return (
                        <motion.div key={opt} whileHover={{ x: !isSubmitted ? 4 : 0 }} onClick={() => !isSubmitted && submitAnswer(oIdx)} style={optStyle} className="p-4 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all font-medium">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] border" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", borderColor: c.border }}>{String.fromCharCode(65 + oIdx)}</span>
                            <span>{opt}</span>
                          </div>
                          {isSubmitted && (<div>{isCorrectAnswer ? <CheckCircle2 size={16} className="text-emerald-500" /> : isSelected ? <XCircle size={16} className="text-red-500" /> : null}</div>)}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowHint(!showHint)} className="px-3 py-2 rounded-xl text-[10px] font-bold border flex items-center gap-1.5" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>
                        <Lightbulb size={12} className="text-amber-500" />{showHint ? "Hide Hint" : "Hint"}
                      </button>
                      {currentAnswer !== null && (
                        <button onClick={() => setShowExplanation(!showExplanation)} className="px-3 py-2 rounded-xl text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-1.5">
                          <Sparkles size={12} />{showExplanation ? "Hide" : "Explain"}
                        </button>
                      )}
                    </div>
                    {currentAnswer !== null && (
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleNextQuestion} className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20">
                        {progress.currentIdx < questions.length - 1 ? <><span>Next</span><ArrowRight size={14} /></> : <><span>Finish</span><Check size={14} /></>}
                      </motion.button>
                    )}
                  </div>

                  {/* Hint */}
                  <AnimatePresence>
                    {showHint && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed font-medium">
                        <span className="font-extrabold block text-amber-500 mb-1">Hint:</span>{currentQuestion.hint}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Explanation */}
                  <AnimatePresence>
                    {showExplanation && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl border space-y-3 text-xs leading-relaxed" style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#F8FAFC", borderColor: c.border }}>
                        <span className="font-extrabold text-amber-500 text-[10px] uppercase tracking-wider block">Detailed Explanation</span>
                        <p className="whitespace-pre-line" style={{ color: c.textSec }}>{currentQuestion.explanation}</p>
                        {currentQuestion.interviewTip && (
                          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 font-medium">
                            <span className="font-bold text-amber-500">Interview Tip: </span>{currentQuestion.interviewTip}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Navigator Sidebar */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:flex flex-col w-56 shrink-0 border rounded-2xl p-3 space-y-3 overflow-y-auto custom-scrollbar" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Questions</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {questions.map((_, idx) => {
                      const status = getNavStatus(idx);
                      const colors = navColors[status];
                      return (
                        <motion.button key={idx} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigateToQuestion(idx)} className="w-full aspect-square rounded-lg text-[9px] font-black flex items-center justify-center transition-all border" style={{ background: colors.bg, borderColor: colors.border, color: colors.text }}>
                          {idx + 1}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t pt-2 space-y-1.5" style={{ borderColor: c.border }}>
                  {(["current", "correct", "incorrect", "skipped", "unanswered"] as const).map((status) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded" style={{ background: navColors[status].bg, border: `1px solid ${navColors[status].border}` }} />
                      <span className="text-[10px] font-bold capitalize" style={{ color: c.textMuted }}>{status}</span>
                    </div>
                  ))}
                </div>

                {progress.bookmarkedCount > 0 && (
                  <div className="border-t pt-2 space-y-1.5" style={{ borderColor: c.border }}>
                    <div className="flex items-center gap-1.5"><BookmarkCheck size={11} className="text-amber-500" /><span className="text-[9px] font-bold" style={{ color: c.textMuted }}>Bookmarked ({progress.bookmarkedCount})</span></div>
                    <div className="space-y-1">
                      {progress.answers.filter(a => a.bookmarked).map((a) => (
                        <motion.button key={a.questionIdx} whileHover={{ scale: 1.02 }} onClick={() => navigateToQuestion(a.questionIdx)} className="w-full text-left p-1.5 rounded-lg text-[9px] font-bold truncate" style={{ background: "rgba(245,158,11,0.08)", color: c.primary }}>Q{a.questionIdx + 1}</motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {progress.flaggedCount > 0 && (
                  <div className="border-t pt-2 space-y-1.5" style={{ borderColor: c.border }}>
                    <div className="flex items-center gap-1.5"><Flag size={11} className="text-red-500" /><span className="text-[9px] font-bold" style={{ color: c.textMuted }}>Flagged ({progress.flaggedCount})</span></div>
                    <div className="space-y-1">
                      {progress.answers.filter(a => a.flagged).map((a) => (
                        <motion.button key={a.questionIdx} whileHover={{ scale: 1.02 }} onClick={() => navigateToQuestion(a.questionIdx)} className="w-full text-left p-1.5 rounded-lg text-[9px] font-bold truncate" style={{ background: "rgba(239,68,68,0.08)", color: c.red }}>Q{a.questionIdx + 1}</motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-2" style={{ borderColor: c.border }}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCompleteSession} className="w-full py-2 px-3 rounded-xl text-[10px] font-extrabold transition-colors" style={{ background: `${c.red}15`, color: c.red, border: `1px solid ${c.red}25` }}>
                    Submit Test
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ SESSION REVIEW ═══ */}
          {view === "session_review" && (
            <motion.div key="session-review" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
              {(() => {
                const totalQ = questions.length;
                const answered = progress.answers.length;
                const correct = progress.answers.filter(a => a.correct).length;
                const incorrect = answered - correct;
                const skipped = totalQ - answered;
                const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
                const avgTimeMs = answered > 0 ? progress.answers.reduce((s, a) => s + a.timeTakenMs, 0) / answered : 0;

                return (
                  <>
                    <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-8 rounded-2xl border text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.04))`, borderColor: "rgba(245,158,11,0.25)" }}>
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: accuracy >= 70 ? "rgba(16,185,129,0.15)" : accuracy >= 40 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)" }}>
                        {accuracy >= 70 ? <Trophy size={36} className="text-green-500" /> : accuracy >= 40 ? <Target size={36} className="text-amber-500" /> : <RotateCcw size={36} className="text-red-500" />}
                      </motion.div>
                      <h2 className="text-xl font-black" style={{ color: c.text }}>Session Complete!</h2>
                      <p className="text-xs mt-1" style={{ color: c.textSec }}>{sessionConfig.tech || sessionConfig.company || "Mixed"} Technical MCQs</p>
                      <div className="flex items-center justify-center gap-6 mt-5">
                        <div className="text-center"><p className="text-lg font-black text-amber-500">{accuracy}%</p><p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Accuracy</p></div>
                        <div className="text-center"><p className="text-lg font-black text-green-500">{correct}</p><p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Correct</p></div>
                        <div className="text-center"><p className="text-lg font-black text-red-500">{incorrect}</p><p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Incorrect</p></div>
                        <div className="text-center"><p className="text-lg font-black" style={{ color: c.textSec }}>{skipped}</p><p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Skipped</p></div>
                      </div>
                      <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="text-center"><p className="text-sm font-black" style={{ color: c.text }}>{formatTime(progress.timeElapsed)}</p><p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Total Time</p></div>
                        <div className="text-center"><p className="text-sm font-black text-amber-500">{Math.round(avgTimeMs / 1000)}s</p><p className="text-[9px] font-bold" style={{ color: c.textMuted }}>Avg / Q</p></div>
                      </div>
                    </motion.div>

                    {/* Question Reviews */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Question Review</h3>
                      {questions.map((q, idx) => {
                        const answer = progress.answers.find(a => a.questionIdx === idx);
                        const isCorrect = answer?.correct ?? false;
                        const wasAnswered = answer !== null;
                        return (
                          <motion.div key={q.id} variants={fadeUp} initial="hidden" animate="visible" custom={idx} className="p-4 border rounded-2xl" style={{ background: c.cardBg, borderColor: c.border }}>
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: !wasAnswered ? `${c.textMuted}15` : isCorrect ? `${c.green}15` : `${c.red}15` }}>
                                {!wasAnswered ? <SkipForward size={14} style={{ color: c.textMuted }} /> : isCorrect ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold leading-relaxed" style={{ color: c.text }}>{q.question.slice(0, 120)}...</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: c.primary }}>{q.technology}</span>
                                  <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>{q.difficulty}</span>
                                  {answer && <span className="text-[9px] font-bold" style={{ color: isCorrect ? c.green : c.red }}>{isCorrect ? "Correct" : "Incorrect"} ({Math.round(answer.timeTakenMs / 1000)}s)</span>}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-3 pb-4">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGoHome} className="flex-1 py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center justify-center gap-2">
                        <Home size={14} /> Back to Hub
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { handleGoHome(); setActiveTab("analytics"); }} className="flex-1 py-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2" style={{ borderColor: c.border, color: c.text }}>
                        <BarChart2 size={14} /> View Analytics
                      </motion.button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* ═══ ANALYTICS VIEW ═══ */}
          {view === "home" && activeTab === "analytics" && (
            <motion.div key="analytics-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">
              <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-6 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}><BarChart2 size={20} className="text-amber-500" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Performance Overview</p>
                    <h3 className="text-sm font-extrabold" style={{ color: c.text }}>Technical MCQ Analytics</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Solved", value: userProgress.questionsSolved, color: c.green },
                    { label: "Accuracy", value: `${userProgress.accuracy}%`, color: c.primary },
                    { label: "Avg Time", value: `${userProgress.avgTimeSeconds}s`, color: "#3b82f6" },
                    { label: "Streak", value: `${userProgress.streakDays}d`, color: c.red },
                  ].map((s) => (
                    <div key={s.label} className="p-4 rounded-xl border text-center" style={{ background: c.surface, borderColor: c.border }}>
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>{s.label}</p>
                      <p className="text-xl font-black mt-1" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-2"><AlertCircle size={14} /> Weak Areas</h3>
                <div className="space-y-2">
                  {userProgress.weakTopics.map((wt) => (
                    <div key={wt.topic} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)" }}>
                      <span className="text-xs font-bold" style={{ color: c.text }}>{wt.topic}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${wt.accuracy}%`, background: c.red }} />
                        </div>
                        <span className="text-[10px] font-black text-red-400">{wt.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                <h3 className="text-xs font-black uppercase tracking-wider text-green-500 flex items-center gap-2"><CheckCircle2 size={14} /> Strong Areas</h3>
                <div className="space-y-2">
                  {userProgress.strongTopics.map((st) => (
                    <div key={st.topic} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "rgba(16,185,129,0.06)" }}>
                      <span className="text-xs font-bold" style={{ color: c.text }}>{st.topic}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${st.accuracy}%`, background: c.green }} />
                        </div>
                        <span className="text-[10px] font-black text-green-400">{st.accuracy}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="p-5 rounded-2xl border space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-2"><TrendingUp size={14} /> Weekly Progress</h3>
                <div className="flex items-end gap-2 h-24">
                  {userProgress.weeklyProgress.map((week, idx) => {
                    const barHeight = (week.accuracy / 100) * 100;
                    return (
                      <motion.div key={week.day} initial={{ height: 0 }} animate={{ height: `${barHeight}%` }} transition={{ duration: 0.5, delay: idx * 0.05 }} className="flex-1 rounded-t-lg relative group" style={{ background: `linear-gradient(180deg, ${c.primary}, ${c.primaryDark})` }}>
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.primary }}>{week.accuracy}%</div>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  {userProgress.weeklyProgress.map((week) => (
                    <div key={week.day} className="flex-1 text-center"><span className="text-[10px] font-bold" style={{ color: c.textMuted }}>{week.day}</span></div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}
