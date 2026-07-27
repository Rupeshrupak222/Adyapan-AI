"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  ChevronRight,
  Brain,
  Puzzle,
  CheckCircle2,
  XCircle,
  Clock,
  Bookmark,
  BookmarkCheck,
  TrendingUp,
  Award,
  Zap,
  Target,
  Flame,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Code,
  Code2,
  Coffee,
  FileCode,
  FileCode2,
  Braces,
  Cpu,
  Shield,
  Database,
  Terminal,
  Network,
  Layers,
  Kanban,
  Binary,
  Layout,
  Palette,
  Component,
  ShieldAlert,
  Smile,
  Server,
  Globe,
  Table,
  HardDrive,
  Cloud,
  CloudRain,
  CloudLightning,
  AlertCircle,
  Box,
  Anchor,
  MessageSquare,
  Eye,
  X,
  Play,
  Copy,
  Check,
  PlusCircle,
  Filter,
  BarChart2,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/services/api";
import CompanyLogo from "@/components/interview-hub/CompanyLogo";

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
  relatedConcept: string;
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

interface TechnicalMCQsModuleViewProps {
  setView?: (v: string) => void;
  theme?: string;
}

// ─── Tech Icon Resolver ───────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Code,
  Code2,
  Coffee,
  FileCode,
  FileCode2,
  Braces,
  Cpu,
  Shield,
  Database,
  Terminal,
  Network,
  Layers,
  Kanban,
  Binary,
  Layout,
  Palette,
  Component,
  ShieldAlert,
  Smile,
  Zap,
  Server,
  Globe,
  Table,
  HardDrive,
  Cloud,
  CloudRain,
  CloudLightning,
  AlertCircle,
  Box,
  Anchor,
  Brain,
  MessageSquare,
  Eye,
  TrendingUp,
  Flame,
};

function getTechIcon(iconName: string): React.ReactElement {
  const IconComp = (ICON_MAP[iconName] || Code2) as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComp size={20} className="text-amber-500 dark:text-amber-400" />;
}

// ─── Default Static Data ───────────────────────────────────────────────────

const DEFAULT_TECHNOLOGIES: MCQTechnology[] = [
  // Programming (8)
  { id: "tech-c", name: "C", slug: "c", category: "Programming", iconName: "Code", description: "Pointers, memory management, preprocessors, and struct syntax.", questionCount: 140, difficulty: "Medium", progress: 70, solved: 14 },
  { id: "tech-cpp", name: "C++", slug: "cpp", category: "Programming", iconName: "Code2", description: "STL, templates, operator overloading, smart pointers, and RAII.", questionCount: 160, difficulty: "Hard", progress: 65, solved: 13 },
  { id: "tech-java", name: "Java", slug: "java", category: "Programming", iconName: "Coffee", description: "JVM, multithreading, garbage collection, collections framework.", questionCount: 220, difficulty: "Medium", progress: 80, solved: 16 },
  { id: "tech-python", name: "Python", slug: "python", category: "Programming", iconName: "FileCode", description: "Decorators, generators, GIL, list comprehensions, and OOPs.", questionCount: 200, difficulty: "Easy", progress: 85, solved: 17 },
  { id: "tech-js", name: "JavaScript", slug: "javascript", category: "Programming", iconName: "Braces", description: "Event loop, closures, promises, prototypes, and ES6+ syntax.", questionCount: 240, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-ts", name: "TypeScript", slug: "typescript", category: "Programming", iconName: "FileCode2", description: "Generics, type guards, interfaces, utility types, and strict mode.", questionCount: 130, difficulty: "Medium", progress: 60, solved: 12 },
  { id: "tech-go", name: "Go", slug: "go", category: "Programming", iconName: "Cpu", description: "Goroutines, channels, interfaces, pointers, and memory layout.", questionCount: 90, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "tech-rust", name: "Rust", slug: "rust", category: "Programming", iconName: "Shield", description: "Ownership, borrowing, lifetimes, pattern matching, and traits.", questionCount: 85, difficulty: "Hard", progress: 35, solved: 7 },

  // Core CS (7)
  { id: "tech-dbms", name: "DBMS", slug: "dbms", category: "Core CS", iconName: "Database", description: "Normalization, ACID properties, indexing, transactions, and ER diagrams.", questionCount: 210, difficulty: "Medium", progress: 82, solved: 16 },
  { id: "tech-os", name: "Operating Systems", slug: "os", category: "Core CS", iconName: "Terminal", description: "Process synchronization, deadlocks, virtual memory, and page replacement.", questionCount: 190, difficulty: "Hard", progress: 55, solved: 11 },
  { id: "tech-cn", name: "Computer Networks", slug: "cn", category: "Core CS", iconName: "Network", description: "OSI model, TCP/IP, subnetting, HTTP/HTTPS, and routing protocols.", questionCount: 180, difficulty: "Medium", progress: 68, solved: 14 },
  { id: "tech-oops", name: "OOPs", slug: "oops", category: "Core CS", iconName: "Layers", description: "Encapsulation, inheritance, polymorphism, abstraction, and SOLID principles.", questionCount: 175, difficulty: "Easy", progress: 90, solved: 18 },
  { id: "tech-se", name: "Software Engineering", slug: "se", category: "Core CS", iconName: "Kanban", description: "Agile, SDLC, design patterns, software testing, and CI/CD basics.", questionCount: 110, difficulty: "Easy", progress: 75, solved: 15 },
  { id: "tech-cd", name: "Compiler Design", slug: "cd", category: "Core CS", iconName: "Binary", description: "Lexical analysis, parsing, syntax trees, optimization, and code generation.", questionCount: 75, difficulty: "Hard", progress: 30, solved: 6 },
  { id: "tech-coa", name: "COA", slug: "coa", category: "Core CS", iconName: "Cpu", description: "Instruction sets, pipelining, cache mapping, and ALU operations.", questionCount: 85, difficulty: "Hard", progress: 40, solved: 8 },

  // Web Development (8)
  { id: "tech-html", name: "HTML", slug: "html", category: "Web Development", iconName: "Layout", description: "Semantic tags, forms, accessibility (a11y), and DOM elements.", questionCount: 120, difficulty: "Easy", progress: 95, solved: 19 },
  { id: "tech-css", name: "CSS", slug: "css", category: "Web Development", iconName: "Palette", description: "Flexbox, Grid, specificity, animations, transitions, and media queries.", questionCount: 135, difficulty: "Medium", progress: 85, solved: 17 },
  { id: "tech-react", name: "React", slug: "react", category: "Web Development", iconName: "Component", description: "Virtual DOM, hooks, reconciliation, context API, and performance optimization.", questionCount: 220, difficulty: "Medium", progress: 80, solved: 16 },
  { id: "tech-angular", name: "Angular", slug: "angular", category: "Web Development", iconName: "ShieldAlert", description: "RxJS, dependency injection, directives, modules, and zone.js.", questionCount: 100, difficulty: "Hard", progress: 50, solved: 10 },
  { id: "tech-vue", name: "Vue", slug: "vue", category: "Web Development", iconName: "Smile", description: "Reactivity system, composition API, directives, and pinia state.", questionCount: 90, difficulty: "Medium", progress: 60, solved: 12 },
  { id: "tech-next", name: "Next.js", slug: "nextjs", category: "Web Development", iconName: "Zap", description: "App router, SSR, SSG, ISR, server components, and API routes.", questionCount: 140, difficulty: "Hard", progress: 70, solved: 14 },
  { id: "tech-node", name: "Node.js", slug: "nodejs", category: "Web Development", iconName: "Server", description: "Event-driven architecture, streams, buffer, cluster, and event loop.", questionCount: 180, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-express", name: "Express", slug: "express", category: "Web Development", iconName: "Globe", description: "Middleware pipeline, routing, error handling, and security headers.", questionCount: 110, difficulty: "Easy", progress: 88, solved: 18 },

  // Databases (5)
  { id: "tech-sql", name: "SQL", slug: "sql", category: "Databases", iconName: "Table", description: "Joins, subqueries, group by, window functions, and indexing strategies.", questionCount: 250, difficulty: "Medium", progress: 88, solved: 18 },
  { id: "tech-postgres", name: "PostgreSQL", slug: "postgresql", category: "Databases", iconName: "Database", description: "JSONB columns, CTEs, PL/pgSQL, MVCC, and full-text search.", questionCount: 140, difficulty: "Hard", progress: 65, solved: 13 },
  { id: "tech-mongo", name: "MongoDB", slug: "mongodb", category: "Databases", iconName: "HardDrive", description: "Aggregation framework, indexing, sharding, replication, and BSON.", questionCount: 150, difficulty: "Medium", progress: 72, solved: 14 },
  { id: "tech-mysql", name: "MySQL", slug: "mysql", category: "Databases", iconName: "Server", description: "InnoDB storage engine, query optimizer, transaction isolation levels.", questionCount: 160, difficulty: "Medium", progress: 80, solved: 16 },
  { id: "tech-redis", name: "Redis", slug: "redis", category: "Databases", iconName: "Zap", description: "Data structures (hashes, sets, pub/sub), persistence (RDB/AOF), and caching.", questionCount: 110, difficulty: "Hard", progress: 55, solved: 11 },

  // Cloud (5)
  { id: "tech-aws", name: "AWS", slug: "aws", category: "Cloud", iconName: "Cloud", description: "EC2, S3, Lambda, IAM, VPC, DynamoDB, and CloudFront.", questionCount: 210, difficulty: "Hard", progress: 60, solved: 12 },
  { id: "tech-azure", name: "Azure", slug: "azure", category: "Cloud", iconName: "CloudRain", description: "Azure VMs, Blob storage, Azure Functions, Entra ID, and AKS.", questionCount: 130, difficulty: "Hard", progress: 50, solved: 10 },
  { id: "tech-gcp", name: "GCP", slug: "gcp", category: "Cloud", iconName: "CloudLighting", description: "BigQuery, GKE, Cloud Run, Pub/Sub, and IAM roles.", questionCount: 140, difficulty: "Hard", progress: 55, solved: 11 },
  { id: "tech-docker", name: "Docker", slug: "docker", category: "Cloud", iconName: "Box", description: "Dockerfile optimization, multi-stage builds, volumes, and networking.", questionCount: 150, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-k8s", name: "Kubernetes", slug: "kubernetes", category: "Cloud", iconName: "Anchor", description: "Pods, Deployments, Services, Ingress, ConfigMaps, and Helm charts.", questionCount: 120, difficulty: "Hard", progress: 40, solved: 8 },

  // AI/ML (7)
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

const SEARCH_AUTOCOMPLETE_SUGGESTIONS = [
  "Java",
  "Python",
  "C++",
  "DBMS",
  "Operating System",
  "Computer Networks",
  "SQL",
  "OOPs",
  "JavaScript",
  "React",
  "Node.js",
  "AWS",
  "Machine Learning",
  "Docker",
  "PostgreSQL",
  "TCS NQT",
  "Amazon OA",
];

const PROMPT_SUGGESTION_CHIPS = [
  "Generate 20 Java MCQs",
  "Generate Amazon DBMS Questions",
  "Create Google OS MCQs",
  "Generate Python Interview Questions",
  "Generate React MCQs",
  "Generate AWS Beginner Quiz",
];

export function TechnicalMCQsModuleView({ setView, theme = "dark" }: TechnicalMCQsModuleViewProps) {
  const isDark = theme === "dark";

  // Comprehensive Light & Dark Theme Colors
  const c = {
    bg: "transparent",
    cardBg: isDark ? "rgba(255, 255, 255, 0.03)" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0",
    textPrimary: isDark ? "#FFFFFF" : "#0F172A",
    textSecondary: isDark ? "#94A3B8" : "#475569",
    textMuted: isDark ? "#64748B" : "#64748B",
    accent: "#F59E0B",
    accentGlow: isDark ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.12)",
    surface: isDark ? "rgba(255, 255, 255, 0.02)" : "#F1F5F9",
    inputBg: isDark ? "rgba(0, 0, 0, 0.35)" : "#FFFFFF",
    inputBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "#CBD5E1",
    green: "#10B981",
    red: "#EF4444",
    heroBg: isDark
      ? "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(18, 18, 20, 0.95) 60%, rgba(10, 10, 12, 1) 100%)"
      : "linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, #FFFFFF 60%, #FFFBEB 100%)",
  };

  // State Management
  const [technologies] = useState<MCQTechnology[]>(DEFAULT_TECHNOLOGIES);
  const [companies] = useState<MCQCompany[]>(DEFAULT_COMPANIES);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("All");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedTech, setSelectedTech] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // AI Prompt Generator
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Questions List & Active Practice State
  const [isPracticing, setIsPracticing] = useState(false);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set(["q-mcq-1", "q-mcq-4"]));

  // Mock Test Modal State
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockConfig, setMockConfig] = useState({
    tech: "Java",
    company: "Amazon",
    count: 20,
    timeLimitMins: 30,
    difficulty: "Medium",
  });

  // Progress State
  const [progress, setProgress] = useState<UserProgress>({
    questionsSolved: 24,
    accuracy: 86,
    avgTimeSeconds: 42,
    streakDays: 6,
    weakTopics: [
      { topic: "Compiler Design", accuracy: 35 },
      { topic: "Kubernetes", accuracy: 40 },
      { topic: "Deep Learning", accuracy: 50 },
    ],
    strongTopics: [
      { topic: "SQL", accuracy: 94 },
      { topic: "Java", accuracy: 90 },
      { topic: "JavaScript", accuracy: 88 },
    ],
    weeklyProgress: [
      { day: "Mon", solved: 5, accuracy: 80 },
      { day: "Tue", solved: 8, accuracy: 85 },
      { day: "Wed", solved: 4, accuracy: 75 },
      { day: "Thu", solved: 10, accuracy: 90 },
      { day: "Fri", solved: 6, accuracy: 83 },
      { day: "Sat", solved: 12, accuracy: 92 },
      { day: "Sun", solved: 9, accuracy: 88 },
    ],
  });

  const practiceRef = useRef<HTMLDivElement>(null);
  const techGridRef = useRef<HTMLDivElement>(null);

  // Fetch Questions from API with fallbacks
  const fetchQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await api.get("/mcq/questions", {
        params: {
          technology: selectedTech,
          category: selectedCategoryTab !== "All" ? selectedCategoryTab : undefined,
          company: selectedCompany,
          difficulty: selectedDifficulty,
          search: searchQuery,
        },
      });
      if (res.data?.success && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
      }
    } catch {
      // Fallback
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTech, selectedCompany, selectedDifficulty, selectedCategoryTab]);

  // AI Generator Handler
  const handleGenerateAI = async (promptOverride?: string) => {
    const pText = promptOverride || aiPromptInput;
    if (!pText.trim()) {
      toast.error("Please enter an AI prompt to generate questions");
      return;
    }

    setAiGenerating(true);
    toast.info("AI is generating custom technical MCQs...");
    try {
      const res = await api.post("/mcq/generate", { prompt: pText });
      if (res.data?.success && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        setActiveQuestionIdx(0);
        setSelectedOptionIdx(null);
        setSubmittedAnswer(false);
        setShowHint(false);
        setShowExplanation(false);
        toast.success(`Generated ${res.data.questions.length} AI Technical MCQs!`);
        setAiPromptInput("");
        setIsPracticing(true);
      }
    } catch {
      toast.error("AI Generation failed. Displaying sample technical MCQs.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Submit Answer
  const handleAnswerSubmit = async () => {
    if (selectedOptionIdx === null || !currentQuestion) return;
    setSubmittedAnswer(true);

    try {
      const res = await api.post("/mcq/submit", {
        questionId: currentQuestion.id,
        selectedIdx: selectedOptionIdx,
        timeTakenSeconds: 42,
      });

      if (res.data?.success && res.data.result) {
        const { isCorrect } = res.data.result;
        if (isCorrect) {
          toast.success("Correct Answer! +30 XP");
        } else {
          toast.error("Incorrect answer. Read the step-by-step breakdown below.");
        }
      }
    } catch {
      // Fallback UI
    }
  };

  // Copy Code Snippet
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Code snippet copied to clipboard");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Toggle Bookmark
  const handleToggleBookmark = async (qId: string) => {
    const updated = new Set(userBookmarks);
    if (updated.has(qId)) {
      updated.delete(qId);
      toast.success("Removed from bookmarks");
    } else {
      updated.add(qId);
      toast.success("Question bookmarked!");
    }
    setUserBookmarks(updated);

    try {
      await api.post("/mcq/bookmark", { questionId: qId });
    } catch {
      // Ignored fallback
    }
  };

  // Filtered Technologies by domain tab
  const filteredTechnologies = useMemo(() => {
    if (selectedCategoryTab === "All") return technologies;
    return technologies.filter(t => t.category === selectedCategoryTab);
  }, [technologies, selectedCategoryTab]);

  // Filtered Autocomplete Suggestions
  const autocompleteFiltered = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return SEARCH_AUTOCOMPLETE_SUGGESTIONS.filter((s) =>
      s.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const currentQuestion = questions[activeQuestionIdx] || null;

  // Render Dedicated Full Practice View when isPracticing is true
  if (isPracticing && currentQuestion) {
    return (
      <div
        className="min-h-screen p-4 sm:p-6 md:p-8 space-y-6 font-sans antialiased transition-colors duration-300"
        style={{ background: c.bg, color: c.textPrimary }}
      >
        {/* Practice Top Navigation Header */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-[20px] border shadow-sm"
          style={{ background: c.cardBg, borderColor: c.cardBorder }}
        >
          <button
            onClick={() => setIsPracticing(false)}
            className="px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 hover:border-amber-500 transition-all"
            style={{ background: c.surface, borderColor: c.cardBorder, color: c.textPrimary }}
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div className="text-center">
            <h2 className="text-sm font-extrabold" style={{ color: c.textPrimary }}>
              {selectedTech !== "All"
                ? `${selectedTech} Practice`
                : selectedCompany !== "All"
                ? `${selectedCompany} Technical MCQs`
                : "Technical Practice Arena"}
            </h2>
            <span className="text-xs font-semibold" style={{ color: c.textSecondary }}>
              Question {activeQuestionIdx + 1} of {questions.length}
            </span>
          </div>

          <button
            onClick={() => {
              setActiveQuestionIdx(0);
              setSelectedOptionIdx(null);
              setSubmittedAnswer(false);
              setShowHint(false);
              setShowExplanation(false);
            }}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:border-amber-500 transition-all"
            style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}
          >
            <RotateCcw size={14} /> Restart Practice
          </button>
        </div>

        {/* Dedicated Practice Question Card */}
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[20px] p-6 sm:p-8 border space-y-6 relative shadow-xl"
            style={{ background: c.cardBg, borderColor: c.cardBorder }}
          >
            {/* Question Header Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  {currentQuestion.technology}
                </span>
                {currentQuestion.company && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}>
                    {currentQuestion.company}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold border" style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}>
                  {currentQuestion.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: c.textSecondary }}>
                  <Clock size={14} className="text-amber-500 dark:text-amber-400" /> {currentQuestion.estimatedTime}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleToggleBookmark(currentQuestion.id)}
                  className="p-2 rounded-xl border hover:border-amber-500/40 transition-colors"
                  style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}
                >
                  {userBookmarks.has(currentQuestion.id) ? (
                    <BookmarkCheck size={16} className="text-amber-500 dark:text-amber-400" />
                  ) : (
                    <Bookmark size={16} />
                  )}
                </motion.button>
              </div>
            </div>

            {/* Question Statement */}
            <div className="space-y-3">
              <h3 className="text-base font-bold leading-relaxed font-sans" style={{ color: c.textPrimary }}>
                {currentQuestion.question}
              </h3>

              {/* Code Snippet Formatting */}
              {currentQuestion.codeSnippet && (
                <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 font-mono text-xs text-emerald-400 p-4 relative group">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pb-2 mb-2 border-b border-slate-800 font-sans">
                    <span className="uppercase tracking-wider font-bold text-amber-400">{currentQuestion.language || "code"}</span>
                    <button
                      onClick={() => handleCopyCode(currentQuestion.codeSnippet!)}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedCode ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    <code>{currentQuestion.codeSnippet}</code>
                  </pre>
                </div>
              )}
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 gap-3">
              {currentQuestion.options.map((opt, oIdx) => {
                const isSelected = selectedOptionIdx === oIdx;
                const isCorrectAnswer = oIdx === currentQuestion.correctIdx;

                let optStyle = {
                  background: isDark ? "rgba(18, 18, 20, 0.6)" : "#F1F5F9",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#CBD5E1",
                  color: c.textPrimary,
                };

                if (isSelected) {
                  optStyle = {
                    background: "rgba(245, 158, 11, 0.12)",
                    borderColor: "#F59E0B",
                    color: "#F59E0B",
                  };
                }
                if (submittedAnswer) {
                  if (isCorrectAnswer) {
                    optStyle = {
                      background: "rgba(16, 185, 129, 0.12)",
                      borderColor: "#10B981",
                      color: "#10B981",
                    };
                  } else if (isSelected) {
                    optStyle = {
                      background: "rgba(239, 68, 68, 0.12)",
                      borderColor: "#EF4444",
                      color: "#EF4444",
                    };
                  }
                }

                return (
                  <motion.div
                    key={opt}
                    whileHover={{ x: 4 }}
                    onClick={() => !submittedAnswer && setSelectedOptionIdx(oIdx)}
                    style={optStyle}
                    className="p-4 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 flex items-center justify-center font-bold text-[11px]">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>

                    {submittedAnswer && (
                      <div>
                        {isCorrectAnswer ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : isSelected ? (
                          <XCircle size={16} className="text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all"
                  style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}
                >
                  <Lightbulb size={14} className="text-amber-500 dark:text-amber-400" /> {showHint ? "Hide Hint" : "Hint"}
                </button>
                {submittedAnswer && (
                  <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 transition-all"
                  >
                    <Sparkles size={14} /> {showExplanation ? "Hide Explanation" : "AI Explain"}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!submittedAnswer ? (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleAnswerSubmit}
                    disabled={selectedOptionIdx === null}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 transition-all shadow-md shadow-amber-500/20"
                  >
                    Submit Answer
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (activeQuestionIdx < questions.length - 1) {
                        setActiveQuestionIdx((prev) => prev + 1);
                        setSelectedOptionIdx(null);
                        setSubmittedAnswer(false);
                        setShowHint(false);
                        setShowExplanation(false);
                      } else {
                        toast.info("Completed all loaded technical questions!");
                      }
                    }}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    Next Question <ArrowRight size={14} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Hint Disclosed Block */}
            <AnimatePresence>
              {showHint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-200 leading-relaxed font-medium"
                >
                  <span className="font-extrabold block text-amber-600 dark:text-amber-400 mb-1">💡 Hint:</span>
                  {currentQuestion.hint}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Explanation Disclosed Block */}
            <AnimatePresence>
              {(submittedAnswer || showExplanation) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-xl border space-y-4 text-xs leading-relaxed"
                  style={{ background: isDark ? "rgba(18, 18, 20, 0.9)" : "#F8FAFC", borderColor: c.cardBorder }}
                >
                  <div>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider block mb-1">
                      🧠 Detailed Technical Explanation
                    </span>
                    <p className="whitespace-pre-line" style={{ color: c.textSecondary }}>{currentQuestion.explanation}</p>
                  </div>

                  {/* Option Breakdown */}
                  {currentQuestion.optionExplanations && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
                      <span className="font-bold text-slate-400 text-[11px] block">Option Analysis:</span>
                      {currentQuestion.optionExplanations.map((oe, oIdx) => (
                        <div key={oIdx} className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                          <span className={`font-bold ${oe.isCorrect ? "text-emerald-500" : "text-red-500"}`}>
                            {oe.option}: {oe.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                          </span>
                          <span className="block text-slate-400 mt-0.5">{oe.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interview Tip */}
                  {currentQuestion.interviewTip && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                      <span className="font-bold text-amber-600 dark:text-amber-400">🎯 Interview Tip: </span>
                      {currentQuestion.interviewTip}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    );
  }



  return (
    <div
      className="min-h-screen p-4 sm:p-6 md:p-8 space-y-8 font-sans antialiased transition-colors duration-300"
      style={{ background: c.bg, color: c.textPrimary }}
    >
      {/* ── HERO SECTION ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[20px] p-6 sm:p-8 border flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl"
        style={{
          background: c.heroBg,
          borderColor: c.cardBorder,
        }}
      >
        {/* Glow backdrop decorative orb */}
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-[100px] pointer-events-none"
          style={{ background: c.accentGlow }}
        />

        <div className="space-y-4 max-w-xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            <Flame size={14} className="animate-pulse text-amber-500 dark:text-amber-400" /> AI Technical Engine
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-sans" style={{ color: c.textPrimary }}>
            Technical MCQs Practice
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed font-normal" style={{ color: c.textSecondary }}>
            Practice company-specific and topic-wise technical MCQs with AI-powered explanations, code snippet breakdowns, and personalized learning paths.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => techGridRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Play size={14} fill="currentColor" /> Start Practice
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleGenerateAI("Generate 10 mixed Java and System Design MCQs")}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-900/10 dark:bg-white/10 hover:bg-slate-900/20 dark:hover:bg-white/15 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white flex items-center gap-2 backdrop-blur-md transition-all"
            >
              <Sparkles size={14} className="text-amber-500 dark:text-amber-400" /> Generate AI Quiz
            </motion.button>
          </div>
        </div>

        {/* Right Animated Hero Illustration */}
        <div
          className="relative z-10 shrink-0 w-full md:w-72 h-44 sm:h-52 rounded-2xl flex items-center justify-center border overflow-hidden group shadow-md"
          style={{ background: isDark ? "rgba(18, 18, 20, 0.7)" : "#FFFFFF", borderColor: c.cardBorder }}
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-transparent pointer-events-none" />
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-4 left-4 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400"
          >
            <Code2 size={22} />
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400"
          >
            <Database size={22} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-center p-4"
          >
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/25 mb-3 font-extrabold text-xl">
              MCQ
            </div>
            <p className="text-xs font-bold" style={{ color: c.textPrimary }}>3,500+ Technical MCQs</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: c.textSecondary }}>36 Core Technologies • 16 Companies</p>
          </motion.div>
        </div>
      </motion.div>

      {/* ── AI MCQ GENERATOR PROMPT BAR ──────────────────────────────── */}
      <div
        className="rounded-[20px] p-5 border space-y-3 shadow-sm"
        style={{ background: c.cardBg, borderColor: c.cardBorder }}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          <Sparkles size={14} /> AI Technical MCQ Generator
        </div>
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={aiPromptInput}
            onChange={(e) => setAiPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateAI()}
            placeholder="e.g. 'Generate 20 Java MCQs' or 'Create Amazon DBMS questions with code snippets'..."
            className="w-full rounded-xl px-4 py-3 text-xs border focus:outline-none focus:border-amber-500 transition-all shadow-inner"
            style={{
              background: c.inputBg,
              borderColor: c.inputBorder,
              color: c.textPrimary,
            }}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleGenerateAI()}
            disabled={aiGenerating}
            className="px-5 py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shrink-0 transition-all disabled:opacity-50 shadow-md"
          >
            {aiGenerating ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Generate
              </>
            )}
          </motion.button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-[11px]">
          <span className="font-semibold shrink-0" style={{ color: c.textMuted }}>Try:</span>
          {PROMPT_SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setAiPromptInput(chip);
                handleGenerateAI(chip);
              }}
              className="px-3 py-1 rounded-lg border hover:border-amber-500 shrink-0 transition-all font-medium"
              style={{
                background: c.surface,
                borderColor: c.cardBorder,
                color: c.textSecondary,
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ── SEARCH & MULTI-FILTER BAR ────────────────────────────────────────── */}
      <div
        className="rounded-[20px] p-4 border flex flex-col md:flex-row items-center justify-between gap-4 relative z-20 shadow-sm"
        style={{ background: c.cardBg, borderColor: c.cardBorder }}
      >
        {/* Search Input with Autocomplete */}
        <div className="relative w-full md:w-72">
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs"
            style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
          >
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowAutocomplete(true);
              }}
              onFocus={() => setShowAutocomplete(true)}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              placeholder="Search language, tech, company..."
              className="w-full bg-transparent focus:outline-none"
              style={{ color: c.textPrimary }}
            />
            {searchQuery && (
              <X size={12} className="text-slate-400 cursor-pointer hover:text-amber-500" onClick={() => setSearchQuery("")} />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showAutocomplete && autocompleteFiltered.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-2xl overflow-hidden z-50"
                style={{ background: isDark ? "#0A0A0C" : "#FFFFFF", borderColor: c.cardBorder }}
              >
                {autocompleteFiltered.map((item) => (
                  <div
                    key={item}
                    onMouseDown={() => {
                      setSearchQuery(item);
                      setShowAutocomplete(false);
                      fetchQuestions();
                    }}
                    className="px-3.5 py-2 text-xs hover:bg-amber-500/10 hover:text-amber-500 cursor-pointer flex items-center justify-between transition-colors"
                    style={{ color: c.textSecondary }}
                  >
                    <span>{item}</span>
                    <ChevronRight size={12} className="text-slate-400" />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Multi-Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Tech Domain Selector */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold hidden sm:inline" style={{ color: c.textSecondary }}>Domain:</span>
            <select
              value={selectedCategoryTab}
              onChange={(e) => setSelectedCategoryTab(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 font-medium"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
            >
              <option value="All">All Domains</option>
              <option value="Programming">Programming</option>
              <option value="Core CS">Core CS</option>
              <option value="Web Development">Web Development</option>
              <option value="Databases">Databases</option>
              <option value="Cloud">Cloud & DevOps</option>
              <option value="AI/ML">AI / Machine Learning</option>
            </select>
          </div>

          {/* Company Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold hidden sm:inline" style={{ color: c.textSecondary }}>Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 font-medium"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
            >
              <option value="All">All Companies</option>
              {companies.map((comp) => (
                <option key={comp.id} value={comp.name}>
                  {comp.name} ({comp.questionCount})
                </option>
              ))}
            </select>
          </div>

          {/* Tech Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold hidden sm:inline" style={{ color: c.textSecondary }}>Tech:</span>
            <select
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 font-medium"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
            >
              <option value="All">All Technologies</option>
              {technologies.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold hidden sm:inline" style={{ color: c.textSecondary }}>Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 font-medium"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── FEATURED COMPANIES SCROLL ───────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
            <Target size={16} className="text-amber-500 dark:text-amber-400" /> Company-Specific Technical MCQs (16 Companies)
          </h2>
          <span className="text-xs font-semibold" style={{ color: c.textSecondary }}>Scroll left/right →</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-3 scrollbar-none">
          {companies.map((comp, idx) => (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => {
                setSelectedCompany(comp.name);
                setSelectedTech("All");
                fetchQuestions();
                setIsPracticing(true);
              }}
              className="w-56 shrink-0 rounded-[20px] p-4 border cursor-pointer transition-all group shadow-sm hover:shadow-md"
              style={{ background: c.cardBg, borderColor: c.cardBorder }}
            >
              <div className="flex items-center justify-between mb-3">
                <CompanyLogo companyName={comp.name} companyId={comp.id} size={40} theme={theme} />
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    comp.difficulty === "Easy"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : comp.difficulty === "Medium"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {comp.difficulty}
                </span>
              </div>
              <h3 className="text-sm font-extrabold group-hover:text-amber-500 transition-colors" style={{ color: c.textPrimary }}>
                {comp.name}
              </h3>
              <p className="text-[11px] mt-1 line-clamp-1" style={{ color: c.textSecondary }}>{comp.description}</p>
              <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-white/5 text-[11px]">
                <span className="font-semibold" style={{ color: c.textSecondary }}>{comp.questionCount} MCQs</span>
                <span className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Start Practice <ChevronRight size={12} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT GRID: TECH CATEGORIES + PRACTICE + SIDEBAR ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Tech Grid + Interactive Question Arena */}
        <div className="lg:col-span-2 space-y-8">
          {/* TECHNOLOGY CATEGORIES GRID (36 TECH CARDS ACROSS 6 DOMAINS) */}
          <div ref={techGridRef} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
                <Code2 size={16} className="text-amber-500 dark:text-amber-400" /> Technology Categories ({filteredTechnologies.length} Technologies)
              </h2>

              {/* Domain Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {["All", "Programming", "Core CS", "Web Development", "Databases", "Cloud", "AI/ML"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryTab(cat)}
                    className={`px-2.5 py-1 rounded-lg border font-bold shrink-0 transition-all ${
                      selectedCategoryTab === cat
                        ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                        : "hover:border-amber-500/40"
                    }`}
                    style={
                      selectedCategoryTab !== cat
                        ? { background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }
                        : undefined
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTechnologies.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => {
                    setSelectedTech(t.name);
                    setSelectedCompany("All");
                    fetchQuestions();
                    setIsPracticing(true);
                  }}
                  className="rounded-[20px] p-5 border cursor-pointer transition-all flex flex-col justify-between group hover:border-amber-500/50 shadow-sm hover:shadow-md"
                  style={{ background: c.cardBg, borderColor: c.cardBorder }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {getTechIcon(t.iconName)}
                      </div>
                      {/* SVG Progress Ring */}
                      <div className="relative w-9 h-9 flex items-center justify-center">
                        <svg className="w-9 h-9 transform -rotate-90">
                          <circle cx="18" cy="18" r="14" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeWidth="3" fill="none" />
                          <circle
                            cx="18"
                            cy="18"
                            r="14"
                            stroke="#F59E0B"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={88}
                            strokeDashoffset={88 - (88 * t.progress) / 100}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-black text-amber-500 dark:text-amber-400">{t.progress}%</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold group-hover:text-amber-500 transition-colors" style={{ color: c.textPrimary }}>
                          {t.name}
                        </h3>
                        <span className="text-[9px] px-2 py-0.5 rounded-full border font-semibold" style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}>
                          {t.category}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 leading-relaxed" style={{ color: c.textSecondary }}>{t.description}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-bold">
                    <span className="font-medium" style={{ color: c.textSecondary }}>{t.questionCount} Questions</span>
                    <span className="text-amber-500 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Continue <ChevronRight size={14} />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Performance Widget & Sidebar */}
        <div className="space-y-6">
          {/* PERFORMANCE DASHBOARD WIDGET */}
          <div
            className="rounded-[20px] p-6 border space-y-6 shadow-sm"
            style={{ background: c.cardBg, borderColor: c.cardBorder }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
                <BarChart2 size={16} className="text-amber-500 dark:text-amber-400" /> Performance Dashboard
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Level 5 Technical Master
              </span>
            </div>

            {/* Metrics 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Questions Solved</span>
                <div className="text-xl font-extrabold" style={{ color: c.textPrimary }}>{progress.questionsSolved}</div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">+6 this week</span>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Accuracy Rate</span>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{progress.accuracy}%</div>
                <span className="text-[9px] font-semibold" style={{ color: c.textSecondary }}>Top 10% percentile</span>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Avg Time / Q</span>
                <div className="text-xl font-extrabold" style={{ color: c.textPrimary }}>{progress.avgTimeSeconds}s</div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">15s faster than avg</span>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Daily Streak</span>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Flame size={18} className="text-amber-500 fill-amber-500" /> {progress.streakDays}d
                </div>
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">On Fire!</span>
              </div>
            </div>

            {/* Recharts Weekly Progress Bar Chart */}
            <div className="space-y-2">
              <span className="text-xs font-bold block" style={{ color: c.textSecondary }}>Weekly Solved Progress</span>
              <div className="h-36 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progress.weeklyProgress} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="day" stroke={isDark ? "#64748B" : "#94A3B8"} fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke={isDark ? "#64748B" : "#94A3B8"} fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: isDark ? "#0A0A0C" : "#FFFFFF",
                        border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: c.textPrimary,
                      }}
                      itemStyle={{ color: "#F59E0B" }}
                    />
                    <Bar dataKey="solved" radius={[4, 4, 0, 0]}>
                      {progress.weeklyProgress.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 5 ? "#F59E0B" : "rgba(245, 158, 11, 0.4)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Weak vs Strong Topics */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
              <div>
                <span className="text-xs font-extrabold text-red-500 dark:text-red-400 flex items-center gap-1 mb-2">
                  <AlertCircle size={14} /> Weak Topics (Needs Revision)
                </span>
                <div className="space-y-2">
                  {progress.weakTopics.map((wt) => (
                    <div key={wt.topic} className="flex items-center justify-between text-xs">
                      <span className="font-medium" style={{ color: c.textSecondary }}>{wt.topic}</span>
                      <span className="text-red-500 dark:text-red-400 font-bold">{wt.accuracy}% Accuracy</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-2">
                  <CheckCircle2 size={14} /> Strong Topics
                </span>
                <div className="space-y-2">
                  {progress.strongTopics.map((st) => (
                    <div key={st.topic} className="flex items-center justify-between text-xs">
                      <span className="font-medium" style={{ color: c.textSecondary }}>{st.topic}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{st.accuracy}% Accuracy</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CUSTOM MOCK TEST CREATOR BUTTON & SIDEBAR ACTIONS */}
          <div
            className="rounded-[20px] p-6 border space-y-4 shadow-sm"
            style={{ background: c.cardBg, borderColor: c.cardBorder }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
                <PlusCircle size={16} className="text-amber-500 dark:text-amber-400" /> Custom Mock Test
              </h3>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: c.textSecondary }}>
              Configure timed technical mock tests customized for target companies or specific technology stacks.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMockModalOpen(true)}
              className="w-full py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-md flex items-center justify-center gap-2"
            >
              <PlusCircle size={14} /> Create Mock Test
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── MOCK TEST CREATOR MODAL ────────────────────────────────────────── */}
      <AnimatePresence>
        {mockModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-[20px] p-6 border space-y-5 shadow-2xl"
              style={{ background: isDark ? "#0A0A0C" : "#FFFFFF", borderColor: c.cardBorder }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <h3 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
                  <PlusCircle size={16} className="text-amber-500" /> Configure Mock Test
                </h3>
                <X size={16} className="cursor-pointer hover:text-amber-500" onClick={() => setMockModalOpen(false)} />
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold block mb-1" style={{ color: c.textSecondary }}>Technology Stack</label>
                  <select
                    value={mockConfig.tech}
                    onChange={(e) => setMockConfig(prev => ({ ...prev, tech: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border"
                    style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
                  >
                    {technologies.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1" style={{ color: c.textSecondary }}>Target Company</label>
                  <select
                    value={mockConfig.company}
                    onChange={(e) => setMockConfig(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border"
                    style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
                  >
                    {companies.map(comp => (
                      <option key={comp.id} value={comp.name}>{comp.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1" style={{ color: c.textSecondary }}>Questions</label>
                    <input
                      type="number"
                      value={mockConfig.count}
                      onChange={(e) => setMockConfig(prev => ({ ...prev, count: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border"
                      style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1" style={{ color: c.textSecondary }}>Time Limit (Mins)</label>
                    <input
                      type="number"
                      value={mockConfig.timeLimitMins}
                      onChange={(e) => setMockConfig(prev => ({ ...prev, timeLimitMins: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-xl border"
                      style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-white/10">
                <button
                  onClick={() => setMockModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border"
                  style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setMockModalOpen(false);
                    toast.success(`Generated ${mockConfig.count} Question ${mockConfig.company} ${mockConfig.tech} Mock Test!`);
                    setSelectedTech(mockConfig.tech);
                    setSelectedCompany(mockConfig.company);
                    fetchQuestions();
                    practiceRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md"
                >
                  Start Mock Test
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
