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
  RefreshCw,
  SlidersHorizontal,
  Code2,
  Users,
  LayoutGrid,
  Compass,
  GitCommit,
  ArrowRightLeft,
  FileText,
  Calendar,
  Box,
  CaseSensitive,
  CheckSquare,
  AlertCircle,
  Filter,
  Check,
  X,
  Play,
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

interface ReasoningTopic {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  description: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  progress: number;
  solved: number;
}

interface ReasoningCompany {
  id: string;
  name: string;
  logo: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  avgPackage: string;
  description: string;
}

interface ReasoningQuestion {
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

interface UserProgress {
  questionsSolved: number;
  accuracy: number;
  avgTimeSeconds: number;
  streakDays: number;
  weakTopics: { topic: string; accuracy: number }[];
  strongTopics: { topic: string; accuracy: number }[];
  weeklyProgress: { day: string; solved: number; accuracy: number }[];
  bookmarkedCount: number;
  bookmarks: ReasoningQuestion[];
  recentActivity: { id: string; title: string; timeAgo: string; score: string }[];
}

interface LogicalReasoningModuleViewProps {
  setView?: (v: string) => void;
  theme?: string;
}



// ─── Topic Icon Resolver ───────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Code2,
  Users,
  LayoutGrid,
  Compass,
  GitCommit,
  ArrowRightLeft,
  FileText,
  Calendar,
  Clock,
  Box,
  Puzzle,
  TrendingUp,
  CaseSensitive,
  CheckSquare,
};

function getTopicIcon(name: string): React.ReactElement {
  const iconKeyMap: Record<string, string> = {
    "Coding-Decoding": "Code2",
    "Blood Relations": "Users",
    "Seating Arrangement": "LayoutGrid",
    "Direction Sense": "Compass",
    Syllogisms: "GitCommit",
    Analogy: "ArrowRightLeft",
    "Statement & Conclusion": "FileText",
    Calendar: "Calendar",
    Clock: "Clock",
    "Cubes & Dice": "Box",
    Puzzle: "Puzzle",
    Ranking: "TrendingUp",
    "Alphabet Test": "CaseSensitive",
    "Data Sufficiency": "CheckSquare",
  };

  const IconComp = (ICON_MAP[iconKeyMap[name] || "Puzzle"] || Puzzle) as React.ComponentType<{ size?: number; className?: string }>;
  return <IconComp size={20} className="text-amber-500 dark:text-amber-400" />;
}

// ─── Default Static Data for Instant Rendering ─────────────────────────────

const DEFAULT_TOPICS: ReasoningTopic[] = [
  { id: "t-1", name: "Coding-Decoding", slug: "coding-decoding", iconName: "Code2", description: "Letter coding, number coding, and substitution ciphers.", questionCount: 120, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "t-2", name: "Blood Relations", slug: "blood-relations", iconName: "Users", description: "Family tree puzzles, coded relations, and direct statements.", questionCount: 95, difficulty: "Easy", progress: 85, solved: 17 },
  { id: "t-3", name: "Seating Arrangement", slug: "seating-arrangement", iconName: "LayoutGrid", description: "Linear, circular, parallel line, and matrix seating arrangements.", questionCount: 110, difficulty: "Hard", progress: 40, solved: 8 },
  { id: "t-4", name: "Direction Sense", slug: "direction-sense", iconName: "Compass", description: "Distance, cardinal directions, shadow problems, and turns.", questionCount: 85, difficulty: "Easy", progress: 90, solved: 18 },
  { id: "t-5", name: "Syllogisms", slug: "syllogisms", iconName: "GitCommit", description: "Venn diagram logic, Possibility cases, Some/No conclusions.", questionCount: 105, difficulty: "Medium", progress: 55, solved: 11 },
  { id: "t-6", name: "Analogy", slug: "analogy", iconName: "ArrowRightLeft", description: "Number analogies, word relationships, and symbolic analogies.", questionCount: 75, difficulty: "Easy", progress: 65, solved: 13 },
  { id: "t-7", name: "Statement & Conclusion", slug: "statement-conclusion", iconName: "FileText", description: "Logical deductions, implicit assumptions, and cause-effect.", questionCount: 90, difficulty: "Medium", progress: 50, solved: 10 },
  { id: "t-8", name: "Calendar", slug: "calendar", iconName: "Calendar", description: "Odd days calculation, leap years, day of the week determination.", questionCount: 65, difficulty: "Medium", progress: 60, solved: 12 },
  { id: "t-9", name: "Clock", slug: "clock", iconName: "Clock", description: "Angle between hands, clock gain/loss, coincide & right-angle times.", questionCount: 60, difficulty: "Medium", progress: 70, solved: 14 },
  { id: "t-10", name: "Cubes & Dice", slug: "cubes-dice", iconName: "Box", description: "Opposite faces of dice, painted cube cuts, and net folding.", questionCount: 70, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "t-11", name: "Puzzle", slug: "puzzle", iconName: "Puzzle", description: "Floor-based puzzles, scheduling, box puzzles, and attribute matching.", questionCount: 140, difficulty: "Hard", progress: 35, solved: 7 },
  { id: "t-12", name: "Ranking", slug: "ranking", iconName: "TrendingUp", description: "Order & ranking in rows, overlapping positions, and comparisons.", questionCount: 80, difficulty: "Easy", progress: 80, solved: 16 },
  { id: "t-13", name: "Alphabet Test", slug: "alphabet-test", iconName: "CaseSensitive", description: "Word formation, letter pair count, and dictionary order.", questionCount: 70, difficulty: "Easy", progress: 85, solved: 17 },
  { id: "t-14", name: "Data Sufficiency", slug: "data-sufficiency", iconName: "CheckSquare", description: "Evaluating whether Statement 1 or Statement 2 alone is sufficient.", questionCount: 85, difficulty: "Hard", progress: 40, solved: 8 },
];

const DEFAULT_COMPANIES: ReasoningCompany[] = [
  { id: "tcs", name: "TCS", logo: "TCS", questionCount: 240, difficulty: "Medium", avgPackage: "3.6 - 7.5 LPA", description: "NQT Foundation & Advanced reasoning questions." },
  { id: "infosys", name: "Infosys", logo: "INFOSYS", questionCount: 210, difficulty: "Medium", avgPackage: "3.6 - 9.5 LPA", description: "System Engineer & Power Programmer analytical tests." },
  { id: "wipro", name: "Wipro", logo: "WIPRO", questionCount: 180, difficulty: "Easy", avgPackage: "3.5 - 6.5 LPA", description: "NLTH logical and inductive reasoning rounds." },
  { id: "accenture", name: "Accenture", logo: "ACCENTURE", questionCount: 220, difficulty: "Medium", avgPackage: "4.5 - 8.5 LPA", description: "Critical reasoning & abstract pattern evaluations." },
  { id: "capgemini", name: "Capgemini", logo: "CAPGEMINI", questionCount: 190, difficulty: "Medium", avgPackage: "4.0 - 7.5 LPA", description: "Pseudo-code & deductive reasoning challenges." },
  { id: "cognizant", name: "Cognizant", logo: "COGNIZANT", questionCount: 195, difficulty: "Medium", avgPackage: "4.0 - 8.0 LPA", description: "GenC & GenC Elevate assessment patterns." },
  { id: "deloitte", name: "Deloitte", logo: "DELOITTE", questionCount: 160, difficulty: "Hard", avgPackage: "7.6 - 12.0 LPA", description: "Case-based puzzles & business logic assessments." },
  { id: "ey", name: "EY", logo: "EY", questionCount: 150, difficulty: "Hard", avgPackage: "6.5 - 11.0 LPA", description: "Data interpretation & logical reasoning tests." },
  { id: "amazon", name: "Amazon", logo: "AMAZON", questionCount: 280, difficulty: "Hard", avgPackage: "16.0 - 45.0 LPA", description: "Amazon Online Assessment (OA) logical puzzles & work simulation." },
  { id: "google", name: "Google", logo: "GOOGLE", questionCount: 260, difficulty: "Hard", avgPackage: "25.0 - 55.0 LPA", description: "Complex algorithmic puzzles & analytical thinking problems." },
  { id: "microsoft", name: "Microsoft", logo: "MICROSOFT", questionCount: 240, difficulty: "Hard", avgPackage: "20.0 - 48.0 LPA", description: "Logical reasoning & system problem-solving assessments." },
  { id: "adobe", name: "Adobe", logo: "ADOBE", questionCount: 170, difficulty: "Hard", avgPackage: "18.0 - 40.0 LPA", description: "Aptitude & quantitative reasoning for software roles." },
];

const SEARCH_AUTOCOMPLETE_SUGGESTIONS = [
  "Blood Relation",
  "Coding-Decoding",
  "Seating Arrangement",
  "Puzzle",
  "TCS",
  "Accenture",
  "Amazon",
  "Syllogisms",
  "Direction Sense",
  "Google",
];

const PROMPT_SUGGESTION_CHIPS = [
  "Generate 20 Amazon logical reasoning questions",
  "Generate TCS reasoning questions",
  "Create difficult puzzle questions",
  "Generate Google aptitude test",
  "Generate beginner coding-decoding questions",
];

export function LogicalReasoningModuleView({ setView, theme = "dark" }: LogicalReasoningModuleViewProps) {
  const isDark = theme === "dark";

  // Comprehensive Light & Dark Theme Tokens
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
  const [topics] = useState<ReasoningTopic[]>(DEFAULT_TOPICS);
  const [companies] = useState<ReasoningCompany[]>(DEFAULT_COMPANIES);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // AI Prompt Generator
  const [aiPromptInput, setAiPromptInput] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  // Questions List & Active Practice State
  const [questions, setQuestions] = useState<ReasoningQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [userBookmarks, setUserBookmarks] = useState<Set<string>>(new Set(["q-reasoning-1", "q-reasoning-4"]));

  // Progress State
  const [progress, setProgress] = useState<UserProgress>({
    questionsSolved: 18,
    accuracy: 83,
    avgTimeSeconds: 45,
    streakDays: 5,
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
    bookmarkedCount: 2,
    bookmarks: [],
    recentActivity: [
      { id: "act-1", title: "Completed TCS Coding-Decoding Practice", timeAgo: "10 mins ago", score: "8/10" },
      { id: "act-2", title: "Attempted Amazon Seating Arrangement Quiz", timeAgo: "2 hours ago", score: "4/5" },
      { id: "act-3", title: "Generated AI Syllogisms Challenge", timeAgo: "1 day ago", score: "5/5" },
    ],
  });

  const practiceRef = useRef<HTMLDivElement>(null);
  const topicsGridRef = useRef<HTMLDivElement>(null);

  // Fetch Questions from API with fallbacks
  const fetchQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await api.get("/reasoning/questions", {
        params: {
          topic: selectedTopic,
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
  }, [selectedTopic, selectedCompany, selectedDifficulty]);

  // AI Generator Handler
  const handleGenerateAI = async (promptOverride?: string) => {
    const pText = promptOverride || aiPromptInput;
    if (!pText.trim()) {
      toast.error("Please enter an AI prompt to generate questions");
      return;
    }

    setAiGenerating(true);
    toast.info("AI is generating custom logical reasoning questions...");
    try {
      const res = await api.post("/reasoning/generate", { prompt: pText });
      if (res.data?.success && Array.isArray(res.data.questions) && res.data.questions.length > 0) {
        setQuestions(res.data.questions);
        setActiveQuestionIdx(0);
        setSelectedOptionIdx(null);
        setSubmittedAnswer(false);
        setShowHint(false);
        setShowExplanation(false);
        toast.success(`Generated ${res.data.questions.length} AI reasoning questions!`);
        setAiPromptInput("");
        practiceRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      toast.error("AI Generation failed. Displaying featured placement questions.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Submit Active Question Answer
  const handleAnswerSubmit = async () => {
    if (selectedOptionIdx === null || !currentQuestion) return;
    setSubmittedAnswer(true);

    try {
      const res = await api.post("/reasoning/submit", {
        questionId: currentQuestion.id,
        selectedIdx: selectedOptionIdx,
        timeTakenSeconds: 45,
      });

      if (res.data?.success && res.data.result) {
        const { isCorrect } = res.data.result;
        if (isCorrect) {
          toast.success("Correct Answer! +25 XP");
        } else {
          toast.error("Incorrect. Check step-by-step explanation & shortcut trick below.");
        }
      }
    } catch {
      // Keep UI feedback intact
    }
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
      await api.post("/reasoning/bookmark", { questionId: qId });
    } catch {
      // Ignored fallback
    }
  };

  const currentQuestion = questions[activeQuestionIdx] || null;

  // Filtered Auto-complete Suggestions
  const autocompleteFiltered = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return SEARCH_AUTOCOMPLETE_SUGGESTIONS.filter((s) =>
      s.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

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
            <Flame size={14} className="animate-pulse text-amber-500 dark:text-amber-400" /> AI Placement Module
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-sans" style={{ color: c.textPrimary }}>
            Logical Reasoning Practice
          </h1>
          <p className="text-xs sm:text-sm leading-relaxed font-normal" style={{ color: c.textSecondary }}>
            Practice placement-level logical reasoning questions from top companies with AI-powered explanations, shortcut tricks, and personalized learning.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => topicsGridRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Play size={14} fill="currentColor" /> Start Practice
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleGenerateAI("Generate 10 mixed company reasoning questions")}
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
            <Brain size={22} />
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400"
          >
            <Puzzle size={22} />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="text-center p-4"
          >
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/25 mb-3 font-extrabold text-xl">
              LR
            </div>
            <p className="text-xs font-bold" style={{ color: c.textPrimary }}>1,400+ Placement Questions</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: c.textSecondary }}>TCS • Infosys • Amazon • Google</p>
          </motion.div>
        </div>
      </motion.div>

      {/* ── AI QUESTION GENERATOR PROMPT BAR ──────────────────────────────── */}
      <div
        className="rounded-[20px] p-5 border space-y-3 shadow-sm"
        style={{ background: c.cardBg, borderColor: c.cardBorder }}
      >
        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
          <Sparkles size={14} /> AI Reasoning Generator
        </div>
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={aiPromptInput}
            onChange={(e) => setAiPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerateAI()}
            placeholder="e.g. 'Generate 20 Amazon logical reasoning questions' or 'Create difficult seating arrangement puzzle'..."
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

      {/* ── SEARCH & FILTERS BAR ────────────────────────────────────────────── */}
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
              placeholder="Search topics, companies, concepts..."
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

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

          {/* Topic Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold hidden sm:inline" style={{ color: c.textSecondary }}>Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs border focus:outline-none focus:border-amber-500 font-medium"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }}
            >
              <option value="All">All Topics</option>
              {topics.map((t) => (
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

      {/* ── FEATURED COMPANIES HORIZONTAL SCROLL ───────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
            <Target size={16} className="text-amber-500 dark:text-amber-400" /> Featured Companies & Logos
          </h2>
          <span className="text-xs font-semibold" style={{ color: c.textSecondary }}>Scroll left/right →</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-3 scrollbar-none">
          {companies.map((comp, idx) => (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => {
                setSelectedCompany(comp.name);
                fetchQuestions();
                practiceRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-56 shrink-0 rounded-[20px] p-4 border cursor-pointer transition-all group shadow-sm hover:shadow-md"
              style={{ background: c.cardBg, borderColor: c.cardBorder }}
            >
              <div className="flex items-center justify-between mb-3">
                {/* Original Brand Logo via CompanyLogo component */}
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
                <span className="font-semibold" style={{ color: c.textSecondary }}>{comp.questionCount} Questions</span>
                <span className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Start <ChevronRight size={12} />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT GRID: TOPIC CARDS + SIDEBAR ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Topics Grid + Interactive Practice Card */}
        <div className="lg:col-span-2 space-y-8">
          {/* TOPIC CARDS GRID (14 TOPICS) */}
          <div ref={topicsGridRef} className="space-y-4">
            <h2 className="text-sm font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
              <Brain size={16} className="text-amber-500 dark:text-amber-400" /> Reasoning Topics (14 Core Categories)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topics.map((t, idx) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => {
                    setSelectedTopic(t.name);
                    fetchQuestions();
                    practiceRef.current?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="rounded-[20px] p-5 border cursor-pointer transition-all flex flex-col justify-between group hover:border-amber-500/50 shadow-sm hover:shadow-md"
                  style={{ background: c.cardBg, borderColor: c.cardBorder }}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {getTopicIcon(t.name)}
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
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold" style={{ background: c.surface, borderColor: c.cardBorder, color: c.textSecondary }}>
                          {t.difficulty}
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

          {/* INTERACTIVE PRACTICE QUESTION CARD */}
          <div ref={practiceRef} className="space-y-4 pt-2">

            {questionsLoading ? (
              <div className="rounded-[20px] p-12 border text-center space-y-3 shadow-sm" style={{ background: c.cardBg, borderColor: c.cardBorder }}>
                <RefreshCw size={24} className="animate-spin text-amber-500 mx-auto" />
                <p className="text-xs font-bold" style={{ color: c.textSecondary }}>Loading Reasoning Questions...</p>
              </div>
            ) : currentQuestion ? (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[20px] p-6 border space-y-6 relative shadow-md"
                style={{ background: c.cardBg, borderColor: c.cardBorder }}
              >
                {/* Question Header & Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                      {currentQuestion.topic}
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
                <div className="space-y-2">
                  <h3 className="text-base font-bold leading-relaxed font-sans" style={{ color: c.textPrimary }}>
                    {currentQuestion.question}
                  </h3>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 gap-3">
                  {currentQuestion.options.map((opt, oIdx) => {
                    const isSelected = selectedOptionIdx === oIdx;
                    const isCorrectAnswer = oIdx === currentQuestion.correctIdx;

                    let optStyle = {
                      background: isDark ? "rgba(15, 23, 42, 0.6)" : "#F1F5F9",
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
                            toast.info("Completed all loaded questions!");
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

                {/* AI Explanation & Shortcut Trick Disclosed Block */}
                <AnimatePresence>
                  {(submittedAnswer || showExplanation) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-xl border space-y-3 text-xs leading-relaxed"
                      style={{ background: isDark ? "rgba(18, 18, 20, 0.9)" : "#F8FAFC", borderColor: c.cardBorder }}
                    >
                      <div>
                        <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider block mb-1">
                          🧠 Step-by-Step AI Explanation
                        </span>
                        <p className="whitespace-pre-line" style={{ color: c.textSecondary }}>{currentQuestion.explanation}</p>
                      </div>

                      {currentQuestion.shortcutTrick && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                          <span className="font-bold text-amber-600 dark:text-amber-400">⚡ Shortcut Trick: </span>
                          {currentQuestion.shortcutTrick}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </div>
        </div>

        {/* Right Column (1 Col): Performance Widget & Sidebar */}

        {/* Right Column (1 Col): Performance Widget & Sidebar */}
        <div className="space-y-6">
          {/* PERFORMANCE SUMMARY WIDGET */}
          <div
            className="rounded-[20px] p-6 border space-y-6 shadow-sm"
            style={{ background: c.cardBg, borderColor: c.cardBorder }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
                <TrendingUp size={16} className="text-amber-500 dark:text-amber-400" /> Performance Summary
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Level 4 Practitioner
              </span>
            </div>

            {/* Metrics 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Questions Solved</span>
                <div className="text-xl font-extrabold" style={{ color: c.textPrimary }}>{progress.questionsSolved}</div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">+4 this week</span>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Accuracy Rate</span>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{progress.accuracy}%</div>
                <span className="text-[9px] font-semibold" style={{ color: c.textSecondary }}>Top 15% percentile</span>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Avg Time / Q</span>
                <div className="text-xl font-extrabold" style={{ color: c.textPrimary }}>{progress.avgTimeSeconds}s</div>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">12s faster than avg</span>
              </div>

              <div className="p-3.5 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                <span className="text-[10px] font-semibold uppercase" style={{ color: c.textMuted }}>Daily Streak</span>
                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Flame size={18} className="text-amber-500 fill-amber-500" /> {progress.streakDays}d
                </div>
                <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Keep it up!</span>
              </div>
            </div>

            {/* Recharts Weekly Progress Bar Chart */}
            <div className="space-y-2">
              <span className="text-xs font-bold block" style={{ color: c.textSecondary }}>Weekly Progress</span>
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
                  <AlertCircle size={14} /> Weak Topics (Needs Attention)
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

          {/* RECENT ACTIVITY & BOOKMARKS */}
          <div
            className="rounded-[20px] p-6 border space-y-4 shadow-sm"
            style={{ background: c.cardBg, borderColor: c.cardBorder }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <h3 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textPrimary }}>
                <Bookmark size={16} className="text-amber-500 dark:text-amber-400" /> Bookmarks & Activity
              </h3>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{userBookmarks.size} Saved</span>
            </div>

            <div className="space-y-3 text-xs">
              {progress.recentActivity.map((act) => (
                <div key={act.id} className="p-3 rounded-xl border space-y-1" style={{ background: c.surface, borderColor: c.cardBorder }}>
                  <div className="flex items-center justify-between font-semibold" style={{ color: c.textPrimary }}>
                    <span className="truncate max-w-[180px]">{act.title}</span>
                    <span className="text-amber-500 dark:text-amber-400 font-bold">{act.score}</span>
                  </div>
                  <span className="text-[10px] block" style={{ color: c.textMuted }}>{act.timeAgo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
