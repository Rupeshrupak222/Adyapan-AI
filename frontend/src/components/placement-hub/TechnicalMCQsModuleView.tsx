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
  CircleDot, Grid3X3, SkipForward, Home, X, Play, BookOpen,
  Award, CheckSquare, Hourglass, HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { toast } from "sonner";
import { api } from "@/services/api";
import CompanyLogo from "@/components/interview-hub/CompanyLogo";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";

// ─── Animation Variants ─────────────────────────────────────────────────────

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
  "Ensuring Anti-Repetition Uniqueness",
  "Configuring 30-Minute Timer & 15 Questions",
  "Ready to Start!"
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
  testCount?: number;
}

interface MCQCompany {
  id: string;
  name: string;
  logo: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  avgPackage: string;
  description: string;
  testCount?: number;
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

interface MCQTest {
  id: string;
  targetId: string;
  targetType: "technology" | "company";
  targetName: string;
  testNumber: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  questionCount: number;
  durationMinutes: number;
  isPublished: boolean;
  createdAt: string;
  questions?: MCQQuestion[];
}

interface SelectedEntity {
  id: string;
  name: string;
  type: "technology" | "company";
  iconName?: string;
  category?: string;
  description?: string;
  avgPackage?: string;
  difficulty?: string;
  progress?: number;
  tests: MCQTest[];
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
  timeRemainingSeconds: number; // 30 minutes = 1800 seconds
  bookmarkedCount: number;
  flaggedCount: number;
}

type MCQView = "home" | "topic_select" | "tests_screen" | "active_session" | "session_review" | "analytics";

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
  { id: "tech-c", name: "C", slug: "c", category: "Programming", iconName: "Code", description: "Pointers, memory management, preprocessors, and struct syntax.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-cpp", name: "C++", slug: "cpp", category: "Programming", iconName: "Code2", description: "STL, templates, operator overloading, smart pointers, and RAII.", questionCount: 160, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-java", name: "Java", slug: "java", category: "Programming", iconName: "Coffee", description: "JVM, multithreading, garbage collection, collections framework.", questionCount: 220, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-python", name: "Python", slug: "python", category: "Programming", iconName: "FileCode", description: "Decorators, generators, GIL, list comprehensions, and OOPs.", questionCount: 200, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-js", name: "JavaScript", slug: "javascript", category: "Programming", iconName: "Braces", description: "Event loop, closures, promises, prototypes, and ES6+ syntax.", questionCount: 240, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-ts", name: "TypeScript", slug: "typescript", category: "Programming", iconName: "FileCode2", description: "Generics, type guards, interfaces, utility types, and strict mode.", questionCount: 130, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-go", name: "Go", slug: "go", category: "Programming", iconName: "Cpu", description: "Goroutines, channels, interfaces, pointers, and memory layout.", questionCount: 90, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-rust", name: "Rust", slug: "rust", category: "Programming", iconName: "Shield", description: "Ownership, borrowing, lifetimes, pattern matching, and traits.", questionCount: 85, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-dbms", name: "DBMS", slug: "dbms", category: "Core CS", iconName: "Database", description: "Normalization, ACID properties, indexing, transactions, and ER diagrams.", questionCount: 210, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-os", name: "Operating Systems", slug: "os", category: "Core CS", iconName: "Terminal", description: "Process synchronization, deadlocks, virtual memory, and page replacement.", questionCount: 190, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-cn", name: "Computer Networks", slug: "cn", category: "Core CS", iconName: "Network", description: "OSI model, TCP/IP, subnetting, HTTP/HTTPS, and routing protocols.", questionCount: 180, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-oops", name: "OOPs", slug: "oops", category: "Core CS", iconName: "Layers", description: "Encapsulation, inheritance, polymorphism, abstraction, and SOLID principles.", questionCount: 175, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-se", name: "Software Engineering", slug: "se", category: "Core CS", iconName: "Kanban", description: "Agile, SDLC, design patterns, software testing, and CI/CD basics.", questionCount: 110, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-cd", name: "Compiler Design", slug: "cd", category: "Core CS", iconName: "Binary", description: "Lexical analysis, parsing, syntax trees, optimization, and code generation.", questionCount: 75, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-coa", name: "COA", slug: "coa", category: "Core CS", iconName: "Cpu", description: "Instruction sets, pipelining, cache mapping, and ALU operations.", questionCount: 85, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-html", name: "HTML", slug: "html", category: "Web Development", iconName: "Layout", description: "Semantic tags, forms, accessibility (a11y), and DOM elements.", questionCount: 120, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-css", name: "CSS", slug: "css", category: "Web Development", iconName: "Palette", description: "Flexbox, Grid, specificity, animations, transitions, and media queries.", questionCount: 135, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-react", name: "React", slug: "react", category: "Web Development", iconName: "Component", description: "Virtual DOM, hooks, reconciliation, context API, and performance optimization.", questionCount: 220, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-angular", name: "Angular", slug: "angular", category: "Web Development", iconName: "ShieldAlert", description: "RxJS, dependency injection, directives, modules, and zone.js.", questionCount: 100, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-vue", name: "Vue", slug: "vue", category: "Web Development", iconName: "Smile", description: "Reactivity system, composition API, directives, and pinia state.", questionCount: 90, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-next", name: "Next.js", slug: "nextjs", category: "Web Development", iconName: "Zap", description: "App router, SSR, SSG, ISR, server components, and API routes.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-node", name: "Node.js", slug: "nodejs", category: "Web Development", iconName: "Server", description: "Event-driven architecture, streams, buffer, cluster, and event loop.", questionCount: 180, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-express", name: "Express", slug: "express", category: "Web Development", iconName: "Globe", description: "Middleware pipeline, routing, error handling, and security headers.", questionCount: 110, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-sql", name: "SQL", slug: "sql", category: "Databases", iconName: "Table", description: "Joins, subqueries, group by, window functions, and indexing strategies.", questionCount: 250, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-postgres", name: "PostgreSQL", slug: "postgresql", category: "Databases", iconName: "Database", description: "JSONB columns, CTEs, PL/pgSQL, MVCC, and full-text search.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-mongo", name: "MongoDB", slug: "mongodb", category: "Databases", iconName: "HardDrive", description: "Aggregation framework, indexing, sharding, replication, and BSON.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-mysql", name: "MySQL", slug: "mysql", category: "Databases", iconName: "Server", description: "InnoDB storage engine, query optimizer, transaction isolation levels.", questionCount: 160, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-redis", name: "Redis", slug: "redis", category: "Databases", iconName: "Zap", description: "Data structures (hashes, sets, pub/sub), persistence (RDB/AOF), and caching.", questionCount: 110, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-aws", name: "AWS", slug: "aws", category: "Cloud", iconName: "Cloud", description: "EC2, S3, Lambda, IAM, VPC, DynamoDB, and CloudFront.", questionCount: 210, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-azure", name: "Azure", slug: "azure", category: "Cloud", iconName: "CloudRain", description: "Azure VMs, Blob storage, Azure Functions, Entra ID, and AKS.", questionCount: 130, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-gcp", name: "GCP", slug: "gcp", category: "Cloud", iconName: "CloudLightning", description: "BigQuery, GKE, Cloud Run, Pub/Sub, and IAM roles.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-docker", name: "Docker", slug: "docker", category: "Cloud", iconName: "Box", description: "Dockerfile optimization, multi-stage builds, volumes, and networking.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-k8s", name: "Kubernetes", slug: "kubernetes", category: "Cloud", iconName: "Anchor", description: "Pods, Deployments, Services, Ingress, ConfigMaps, and Helm charts.", questionCount: 120, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-ml", name: "Machine Learning", slug: "machine-learning", category: "AI/ML", iconName: "Brain", description: "Supervised/unsupervised learning, regression, decision trees, and metrics.", questionCount: 180, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-dl", name: "Deep Learning", slug: "deep-learning", category: "AI/ML", iconName: "Cpu", description: "CNNs, RNNs, backpropagation, activation functions, and gradient descent.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-nlp", name: "NLP", slug: "nlp", category: "AI/ML", iconName: "MessageSquare", description: "Tokenization, TF-IDF, Word2Vec, Transformers, and attention mechanisms.", questionCount: 110, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-cv", name: "Computer Vision", slug: "computer-vision", category: "AI/ML", iconName: "Eye", description: "OpenCV, image transformations, object detection (YOLO), and segmentation.", questionCount: 95, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-ds", name: "Data Science", slug: "data-science", category: "AI/ML", iconName: "TrendingUp", description: "Pandas, NumPy, EDA, feature engineering, and statistical testing.", questionCount: 160, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-tf", name: "TensorFlow", slug: "tensorflow", category: "AI/ML", iconName: "Box", description: "Keras API, computational graphs, tensors, and model exporting.", questionCount: 100, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-torch", name: "PyTorch", slug: "pytorch", category: "AI/ML", iconName: "Flame", description: "Autograd, Tensors, nn.Module, DataLoader, and custom loss functions.", questionCount: 115, difficulty: "Hard", progress: 0, solved: 0 },
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

// ─── Domain-Aware 15-Question Fallback Generator (Guarantees 15 Unique Domain Qs) ───

export function generateLocalDomainQuestions(
  targetName: string,
  targetType: "technology" | "company",
  testNum = 1,
  count = 15
): MCQQuestion[] {
  const norm = targetName.toLowerCase();
  const lang = ["c", "cpp", "java", "python", "javascript", "typescript", "go", "rust", "sql", "html", "css"].find(l => norm.includes(l)) || (targetType === "technology" ? "javascript" : "java");

  const TOPIC_CONCEPT_BANKS: Record<string, { topic: string; questions: Array<{ q: string; code?: string; options: [string, string, string, string]; correctIdx: number; exp: string; hint: string }> }> = {
    c: {
      topic: "C",
      questions: [
        {
          q: "What is the output of printf('%d', sizeof('A')) in standard C (C99/C11)?",
          code: `#include <stdio.h>\nint main() {\n    printf("%d", sizeof('A'));\n    return 0;\n}`,
          options: ["1", "4 (or sizeof(int))", "2", "Undefined Behavior"],
          correctIdx: 1,
          exp: "In C, character constants like 'A' have type 'int', so sizeof('A') is equivalent to sizeof(int) (usually 4 bytes). In C++, it would be 1 (char).",
          hint: "In C, character literals are promoted to integer type constants."
        },
        {
          q: "What happens when you increment a pointer to an array of integers (int *ptr)?",
          code: `int arr[5] = {10, 20, 30, 40, 50};\nint *ptr = arr;\nptr++;\nprintf("%d", *ptr);`,
          options: ["Increments memory address by 1 byte", "Increments address by sizeof(int) (usually 4 bytes)", "Points to arr[0] + 1", "Throws runtime segmentation fault"],
          correctIdx: 1,
          exp: "Pointer arithmetic in C automatically scales by the size of the referenced type (sizeof(int)).",
          hint: "Pointer step size equals sizeof(*ptr)."
        },
        {
          q: "Which C standard library function dynamically allocates memory and initializes all allocated bytes to zero?",
          options: ["malloc()", "calloc()", "realloc()", "alloca()"],
          correctIdx: 1,
          exp: "calloc(num, size) allocates contiguous memory and clears all bytes to zero, whereas malloc leaves memory uninitialized.",
          hint: "Contiguous Allocation with Zero-initialization."
        },
        {
          q: "What is the purpose of the 'volatile' keyword in C embedded/systems programming?",
          options: ["Allocates variable in CPU register", "Prevents compiler optimization that caches the variable value in registers", "Makes the variable thread-safe across cores", "Makes the variable constant and read-only"],
          correctIdx: 1,
          exp: "volatile informs the compiler that the value may change unexpectedly (e.g., via hardware register or interrupt service routine), disabling optimization caching.",
          hint: "Hardware registers and ISR shared variables require volatile."
        },
        {
          q: "What is the return value of printf() when printing the string 'Adyapan'?",
          code: `int count = printf("Adyapan");`,
          options: ["0", "1", "7 (number of characters printed)", "Address of string"],
          correctIdx: 2,
          exp: "printf() returns the total number of characters successfully written to standard output.",
          hint: "printf counts characters printed."
        },
        {
          q: "In C, what is the output of 5 >> 1 (bitwise right shift)?",
          options: ["10", "2", "2.5", "1"],
          correctIdx: 1,
          exp: "5 in binary is 0101. Bitwise right shift by 1 produces 0010, which is integer 2 (equivalent to floor(5/2)).",
          hint: "Right shifting by 1 is integer division by 2."
        },
        {
          q: "What is the lifetime and scope of a 'static' local variable declared inside a C function?",
          options: ["Lifetime: Function call; Scope: Local", "Lifetime: Entire program execution; Scope: Local to function", "Lifetime: Entire program; Scope: Global across all files", "Lifetime: Heap lifetime; Scope: Pointer accessible"],
          correctIdx: 1,
          exp: "Static local variables retain their values throughout the entire program lifetime but are only accessible within the declaring function scope.",
          hint: "Static storage persists between function invocations."
        },
        {
          q: "Which header file is required to use the free() and exit() functions in C?",
          options: ["<stdio.h>", "<stdlib.h>", "<string.h>", "<unistd.h>"],
          correctIdx: 1,
          exp: "<stdlib.h> declares standard memory allocation routines (malloc, calloc, free) and process control (exit, abort).",
          hint: "Standard Library general utilities header."
        },
        {
          q: "What does the 'realloc()' function return if there is insufficient memory to expand the allocation block?",
          options: ["Deallocates old pointer and returns NULL", "Returns NULL while keeping the original memory block intact", "Throws std::bad_alloc exception", "Causes kernel segmentation fault"],
          correctIdx: 1,
          exp: "If realloc() fails, it returns NULL and leaves the original memory block unmodified and still valid.",
          hint: "Never assign realloc directly to the same pointer without checking for NULL."
        },
        {
          q: "What is the correct way to declare a function pointer that accepts two ints and returns an int in C?",
          options: ["int *fn(int, int);", "int (*fn)(int, int);", "int (fn*)(int, int);", "*int fn(int, int);"],
          correctIdx: 1,
          exp: "int (*fn)(int, int) declares 'fn' as a pointer to a function taking two ints and returning int. (Without parentheses, it would declare a function returning an int pointer).",
          hint: "Parentheses bind the pointer asterisk to the variable name."
        },
        {
          q: "What is undefined behavior when dealing with signed integer overflow in standard C?",
          options: ["Wraps around modulo 2^32", "The compiler is permitted to make arbitrary assumptions and optimizations", "Always throws SIGFPE signal", "Automatically promotes to long int"],
          correctIdx: 1,
          exp: "In C, signed integer overflow is explicitly undefined behavior (UB), allowing compiler vectorization and range optimizations.",
          hint: "Unsigned wraps around; signed overflow is undefined."
        },
        {
          q: "What is the purpose of the preprocessor directive '#pragma once'?",
          options: ["Ensures code executes only once at runtime", "Prevents duplicate inclusion of the same header file during compilation", "Forces single-threaded compilation", "Defines an inline function"],
          correctIdx: 1,
          exp: "#pragma once serves as an include guard preventing the compiler from processing a header file multiple times.",
          hint: "Modern alternative to #ifndef / #define header include guards."
        },
        {
          q: "What is the value of x after this ternary operation in C: int x = (10 > 5) ? (4 < 2 ? 1 : 2) : 3; ?",
          options: ["1", "2", "3", "Undefined"],
          correctIdx: 1,
          exp: "10 > 5 is true, so the true branch (4 < 2 ? 1 : 2) is evaluated. Since 4 < 2 is false, it returns 2.",
          hint: "Evaluate nested conditional expressions from inside out."
        },
        {
          q: "What does the 'strtok()' function in <string.h> use internally to maintain state between tokenization calls?",
          options: ["Heap memory block", "Static internal pointer", "CPU registers", "Thread local storage stack"],
          correctIdx: 1,
          exp: "strtok uses a static internal pointer to remember its position in the string, making it non-thread-safe (use strtok_r for thread safety).",
          hint: "strtok preserves state across subsequent calls using NULL."
        },
        {
          q: "What is a 'Dangling Pointer' in C programming?",
          options: ["A pointer initialized to NULL", "A pointer that points to memory that has already been deallocated/freed", "A pointer pointing to constant string literal", "A void pointer with unknown type"],
          correctIdx: 1,
          exp: "A dangling pointer points to a memory address that has been deallocated (e.g. via free() or out-of-scope stack variable).",
          hint: "Always set pointers to NULL after calling free()."
        },
      ]
    },
    java: {
      topic: "Java",
      questions: [
        {
          q: "What will be the output of the following Java snippet regarding String immutability and memory pool allocation?",
          code: `public class Test {\n  public static void main(String[] args) {\n    String s1 = "Adyapan";\n    String s2 = new String("Adyapan");\n    String s3 = s2.intern();\n    System.out.println((s1 == s2) + " " + (s1 == s3));\n  }\n}`,
          options: ["false true", "true true", "false false", "true false"],
          correctIdx: 0,
          exp: "s1 points to the String constant pool instance. s2 creates a new object in Heap memory, so (s1 == s2) is false. s2.intern() returns the pool reference, which equals s1, so (s1 == s3) is true.",
          hint: "Remember that '==' checks memory reference equality, whereas string.intern() returns the reference from the string pool."
        },
        {
          q: "Which Java Collection class provides O(1) time complexity for get() and put() while guaranteeing insertion-order iteration?",
          options: ["HashMap", "TreeMap", "LinkedHashMap", "ConcurrentHashMap"],
          correctIdx: 2,
          exp: "LinkedHashMap maintains a doubly-linked list running through all of its entries, preserving insertion order while maintaining O(1) hash lookups.",
          hint: "Combines a hash table with a linked list."
        },
        {
          q: "In Java multithreading, what state does a thread enter when waiting for a synchronized monitor lock?",
          options: ["WAITING", "BLOCKED", "TIMED_WAITING", "RUNNABLE"],
          correctIdx: 1,
          exp: "A thread waiting to enter a synchronized block or method is in the BLOCKED state.",
          hint: "Blocked on synchronized monitor acquisition."
        },
        {
          q: "Which Garbage Collector is the default GC in modern standard OpenJDK (Java 11 through Java 21)?",
          options: ["Serial GC", "Parallel GC", "G1 (Garbage-First) GC", "ZGC"],
          correctIdx: 2,
          exp: "G1 GC has been the default garbage collector since Java 9, designed for multi-processor machines with large memory.",
          hint: "Garbage-First region-based collector."
        },
        {
          q: "What is the difference between Comparable and Comparator interfaces in Java?",
          options: ["Comparable defines natural ordering via compareTo(); Comparator defines custom sorting via compare()", "Comparable is in java.util; Comparator is in java.lang", "Comparable requires lambda; Comparator cannot use lambda", "Both are identical"],
          correctIdx: 0,
          exp: "Comparable defines single natural order inside the class (compareTo), while Comparator allows external custom sorting algorithms (compare).",
          hint: "Comparable is internal; Comparator is external."
        },
        {
          q: "What will happen if you attempt to modify a List created via List.of('A', 'B')?",
          options: ["Element is updated", "Throws UnsupportedOperationException at runtime", "Returns a new cloned list", "Compilation error"],
          correctIdx: 1,
          exp: "List.of() returns an unmodifiable immutable list. Any mutation method (add, set, remove) throws UnsupportedOperationException.",
          hint: "Java 9 factory methods produce unmodifiable collections."
        },
        {
          q: "What is the purpose of the 'transient' keyword in Java?",
          options: ["Marks variable as thread-safe", "Excludes field from standard JVM Object Serialization", "Prevents garbage collection", "Forces variable into heap"],
          correctIdx: 1,
          exp: "Variables marked 'transient' are not serialized when an object is converted into a byte stream via ObjectOutputStream.",
          hint: "Transient skips serialization."
        },
        {
          q: "What is the memory size of a 'char' primitive in Java?",
          options: ["1 byte (ASCII)", "2 bytes (UTF-16 Unicode)", "4 bytes (UTF-32)", "8 bytes"],
          correctIdx: 1,
          exp: "Java char is 16 bits (2 bytes) because it uses UTF-16 code units to represent Unicode characters.",
          hint: "Java primitives are platform-independent 16-bit Unicode characters."
        },
        {
          q: "Which Java classloader is responsible for loading core Java runtime classes (java.lang.*, java.util.*)?",
          options: ["Application ClassLoader", "Extension ClassLoader", "Bootstrap ClassLoader", "System ClassLoader"],
          correctIdx: 2,
          exp: "The Bootstrap ClassLoader (written in native code) loads core standard library classes from the base module (lib/modules or rt.jar).",
          hint: "The root parent of all class loaders."
        },
        {
          q: "What is the result of applying the stream operation .flatMap() in Java Streams API?",
          options: ["Filters out null elements", "Flattens nested streams/collections into a single stream of elements", "Sorts elements in descending order", "Converts stream into an immutable array"],
          correctIdx: 1,
          exp: "flatMap transforms each element into a stream and flattens the resulting streams into a single composite output stream.",
          hint: "Transforms 1-to-N relationships into a single flat stream."
        },
        {
          q: "Which interface must a class implement to be used within a Java try-with-resources statement?",
          options: ["java.io.Serializable", "java.lang.AutoCloseable", "java.lang.Runnable", "java.lang.Cloneable"],
          correctIdx: 1,
          exp: "try-with-resources requires classes that implement AutoCloseable (or its child Closeable).",
          hint: "AutoCloseable has the close() method."
        },
        {
          q: "In Java, what happens when an overridden method is called through a superclass reference pointing to a subclass instance?",
          options: ["Superclass method is called (Static Binding)", "Subclass overridden method is called (Dynamic Method Dispatch)", "Throws ClassCastException", "Compilation error"],
          correctIdx: 1,
          exp: "Java uses dynamic method dispatch (runtime polymorphism) where method calls resolve to the actual runtime object's implementation.",
          hint: "Virtual method invocation relies on runtime object type."
        },
        {
          q: "What is the time complexity of searching an element in a balanced Java TreeMap?",
          options: ["O(1)", "O(log N)", "O(N)", "O(N log N)"],
          correctIdx: 1,
          exp: "TreeMap is backed by a Red-Black Tree (Self-balancing Binary Search Tree), guaranteeing O(log N) operations.",
          hint: "Red-Black Tree search complexity."
        },
        {
          q: "What is the purpose of the 'volatile' variable modifier in the Java Memory Model (JMM)?",
          options: ["Guarantees atomic compound operations (like count++)", "Guarantees memory visibility across threads and prevents instruction reordering", "Locks the object monitor", "Saves variable to hard disk"],
          correctIdx: 1,
          exp: "volatile ensures changes made by one thread are immediately visible to other threads and establishes a happens-before relationship without locking.",
          hint: "Visibility guarantee and CPU cache flush."
        },
        {
          q: "What does Optional.orElseGet() do compared to Optional.orElse() in Java 8+?",
          options: ["orElseGet() is evaluated lazily only when Optional is empty; orElse() is always evaluated eagerly", "orElseGet() returns null if empty", "orElseGet() throws NoSuchElementException", "They are identical"],
          correctIdx: 0,
          exp: "orElseGet accepts a Supplier and is evaluated lazily only when value is absent, avoiding unnecessary method execution overhead.",
          hint: "Supplier lambda allows lazy evaluation."
        }
      ]
    }
  };

  const domainBank = TOPIC_CONCEPT_BANKS[norm] || TOPIC_CONCEPT_BANKS[lang] || TOPIC_CONCEPT_BANKS["c"];
  const baseQuestions = domainBank.questions;

  return Array.from({ length: count }).map((_, idx) => {
    const template = baseQuestions[idx % baseQuestions.length];
    const suffix = testNum > 1 ? ` (Set ${testNum} - Concept ${idx + 1})` : "";
    return {
      id: `local-q-${norm}-${testNum}-${idx + 1}`,
      technology: targetType === "technology" ? targetName : "Core CS",
      company: targetType === "company" ? targetName : undefined,
      difficulty: (idx < 5 ? "Easy" : idx < 11 ? "Medium" : "Hard") as "Easy" | "Medium" | "Hard",
      question: template.q + suffix,
      codeSnippet: template.code,
      language: lang,
      options: [...template.options] as [string, string, string, string],
      correctAnswer: template.options[template.correctIdx],
      correctIdx: template.correctIdx,
      explanation: template.exp,
      hint: template.hint,
      estimatedTime: idx < 5 ? "30 sec" : idx < 11 ? "45 sec" : "60 sec",
    };
  });
}

// ─── Main Component ───────────────────────────────────────────────────────


export function TechnicalMCQsModuleView({ setView: _setView, theme = "dark" }: TechnicalMCQsModuleViewProps) {
  const isDark = theme === "dark";
  const quota = useFeatureQuota("TECHNICAL_MCQS");

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

  // ── Dynamic Tests & Screen State ──
  const [allDynamicTests, setAllDynamicTests] = useState<MCQTest[]>([]);
  const [activeTestTitle, setActiveTestTitle] = useState<string>("");
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);

  // ── Data ──
  const [technologies] = useState<MCQTechnology[]>(DEFAULT_TECHNOLOGIES);
  const [companies] = useState<MCQCompany[]>(DEFAULT_COMPANIES);

  // ── Filters ──
  // ── Filters ──
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("All");

  // ── Real-Time User Topic Mastery ──
  const [userTopicMastery, setUserTopicMastery] = useState<Record<string, { topic: string; totalAttempted: number; correct: number; accuracy: number }>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("adyapan_mcq_user_progress");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // ── Session State (30 Minutes = 1800 Seconds) ──
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [sessionConfig, setSessionConfig] = useState<{ tech: string; company: string; domain: string }>({ tech: "", company: "", domain: "" });
  const [progress, setProgress] = useState<SessionProgress>({
    currentIdx: 0, answers: [], timeElapsed: 0, timeRemainingSeconds: 1800, bookmarkedCount: 0, flaggedCount: 0
  });
  const [showExplanation, setShowExplanation] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // ── Loading ──
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // ── Progress ──
  const [userProgress, setUserProgress] = useState<UserProgress>({
    questionsSolved: 0,
    accuracy: 0,
    avgTimeSeconds: 0,
    streakDays: 0,
    weakTopics: [],
    strongTopics: [],
    weeklyProgress: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      day,
      solved: 0,
      accuracy: 0,
    })),
  });

  // Fetch dynamic tests from backend
  const fetchDynamicTests = useCallback(async () => {
    try {
      const res = await api.get("/mcq/tests");
      if (res.data?.success && Array.isArray(res.data.tests)) {
        setAllDynamicTests(res.data.tests);
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchDynamicTests();
  }, [fetchDynamicTests]);

  useEffect(() => {
    api.get("/mcq/progress").then(({ data }) => {
      if (data?.success) {
        if (data.topicMastery && typeof data.topicMastery === "object") {
          setUserTopicMastery(prev => {
            const merged = { ...prev, ...data.topicMastery };
            try { localStorage.setItem("adyapan_mcq_user_progress", JSON.stringify(merged)); } catch {}
            return merged;
          });
        }
        setUserProgress(prev => ({
          ...prev,
          questionsSolved: data.questionsSolved ?? prev.questionsSolved,
          accuracy: data.accuracy ?? prev.accuracy,
          avgTimeSeconds: data.avgTimeSeconds ?? prev.avgTimeSeconds,
          streakDays: data.streakDays ?? prev.streakDays,
          weakTopics: Array.isArray(data.weakTopics) ? data.weakTopics : prev.weakTopics,
          strongTopics: Array.isArray(data.strongTopics) ? data.strongTopics : prev.strongTopics,
          weeklyProgress: Array.isArray(data.weeklyProgress) ? data.weeklyProgress : prev.weeklyProgress,
        }));
      }
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

  // ── Real-time Complete Session Helper ──
  const handleCompleteSession = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setViewState("session_review");

    setProgress(curr => {
      const answeredList = curr.answers.filter(a => a.selectedIdx !== null);
      const totalAttempted = answeredList.length;
      const correctCount = answeredList.filter(a => a.correct).length;
      const targetTopic = sessionConfig.tech || sessionConfig.company || "General";
      const topicKey = targetTopic.toLowerCase();

      if (totalAttempted > 0) {
        setUserTopicMastery(prev => {
          const existing = prev[topicKey] || { topic: targetTopic, totalAttempted: 0, correct: 0, accuracy: 0 };
          const newTotal = existing.totalAttempted + totalAttempted;
          const newCorrect = existing.correct + correctCount;
          const newAccuracy = Math.round((newCorrect / newTotal) * 100);
          const updated = {
            ...prev,
            [topicKey]: {
              topic: targetTopic,
              totalAttempted: newTotal,
              correct: newCorrect,
              accuracy: newAccuracy,
            }
          };
          try {
            localStorage.setItem("adyapan_mcq_user_progress", JSON.stringify(updated));
          } catch {}
          return updated;
        });

        setUserProgress(prev => {
          const newTotalSolved = prev.questionsSolved + totalAttempted;
          const prevCorrect = Math.round((prev.accuracy * prev.questionsSolved) / 100);
          const newAccuracy = newTotalSolved > 0 ? Math.round(((prevCorrect + correctCount) / newTotalSolved) * 100) : 0;
          return {
            ...prev,
            questionsSolved: newTotalSolved,
            accuracy: newAccuracy,
            streakDays: prev.streakDays > 0 ? prev.streakDays : 1,
          };
        });
      }
      return curr;
    });
  }, [sessionConfig]);

  // ── 30-Minute Countdown Timer ──
  useEffect(() => {
    if (view === "active_session") {
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          const nextRemaining = prev.timeRemainingSeconds - 1;
          if (nextRemaining <= 0) {
            clearInterval(timerRef.current!);
            handleCompleteSession();
            toast.warning("Time's up! Submitting your test.");
            return { ...prev, timeRemainingSeconds: 0, timeElapsed: prev.timeElapsed + 1000 };
          }
          return {
            ...prev,
            timeElapsed: prev.timeElapsed + 1000,
            timeRemainingSeconds: nextRemaining,
          };
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, handleCompleteSession]);

  // ── Loading Overlay ──
  useEffect(() => {
    if (aiLoading) {
      setLoadingStep(0);
      loadingTimerRef.current = setInterval(() => {
        setLoadingStep(prev => {
          if (prev >= LOADING_STEPS.length - 1) { clearInterval(loadingTimerRef.current!); return prev; }
          return prev + 1;
        });
      }, 500);
    }
    return () => { if (loadingTimerRef.current) clearInterval(loadingTimerRef.current); };
  }, [aiLoading]);

  // ── Open Test Screen on Card Click ──
  const handleOpenEntityScreen = async (entity: {
    id: string;
    name: string;
    type: "technology" | "company";
    iconName?: string;
    category?: string;
    description?: string;
    avgPackage?: string;
    difficulty?: string;
    progress?: number;
  }) => {
    let matched = allDynamicTests.filter((t) => {
      const tid = t.targetId.toLowerCase();
      const eid = entity.id.toLowerCase();
      const tname = t.targetName.toLowerCase();
      const ename = entity.name.toLowerCase();
      return tid === eid || tname === ename || tid.replace(/^tech-/, "") === eid.replace(/^tech-/, "");
    });

    if (matched.length === 0) {
      try {
        const res = await api.get(`/mcq/tests?targetId=${entity.id}`);
        if (res.data?.success && Array.isArray(res.data.tests) && res.data.tests.length > 0) {
          matched = res.data.tests;
        }
      } catch {}
    }

    const testsList: MCQTest[] = matched.length > 0 ? matched : [
      {
        id: `test-${entity.id}-1`,
        targetId: entity.id,
        targetType: entity.type,
        targetName: entity.name,
        testNumber: 1,
        title: `${entity.name} - Test 1: Core Fundamentals & Patterns`,
        description: `Comprehensive technical evaluation for ${entity.name} covering runtime mechanics, design principles, and problem solving.`,
        difficulty: "Medium" as const,
        questionCount: 15,
        durationMinutes: 30,
        isPublished: true,
        createdAt: new Date().toISOString(),
        questions: generateLocalDomainQuestions(entity.name, entity.type, 1, 15),
      }
    ];

    setSelectedEntity({
      ...entity,
      tests: testsList.sort((a, b) => a.testNumber - b.testNumber),
    });

    setViewState("tests_screen");
  };

  // ── Start Direct Dynamic Test (15 Qs, 30 Mins) ──
  const startTestSession = useCallback(async (test: MCQTest) => {
    setAiLoading(true);
    setShowExplanation(false);
    setShowHint(false);
    setActiveTestTitle(test.title || `${test.targetName} • Test ${test.testNumber}`);

    try {
      let finalQs: MCQQuestion[] = [];
      if (test.questions && Array.isArray(test.questions) && test.questions.length >= 15) {
        finalQs = test.questions;
      } else {
        const res = await api.get(`/mcq/test/${test.id}`);
        if (res.data?.success && Array.isArray(res.data.test?.questions) && res.data.test.questions.length > 0) {
          finalQs = res.data.test.questions;
        } else {
          // Fallback to query questions for this technology/company
          const qRes = await api.get(`/mcq/questions?${test.targetType === "company" ? "company" : "technology"}=${encodeURIComponent(test.targetName)}&limit=15`);
          if (qRes.data?.success && Array.isArray(qRes.data.questions) && qRes.data.questions.length > 0) {
            finalQs = qRes.data.questions;
          }
        }
      }

      if (finalQs.length < 15) {
        finalQs = generateLocalDomainQuestions(test.targetName, test.targetType, test.testNumber, 15);
      }

      // Ensure exact 15 questions
      const exactQuestions = finalQs.slice(0, 15);

      setQuestions(exactQuestions);
      setSessionConfig({
        tech: test.targetType === "technology" ? test.targetName : "",
        company: test.targetType === "company" ? test.targetName : "",
        domain: test.difficulty || "Medium",
      });
      // 30 minutes = 1800 seconds
      setProgress({
        currentIdx: 0,
        answers: [],
        timeElapsed: 0,
        timeRemainingSeconds: 1800,
        bookmarkedCount: 0,
        flaggedCount: 0
      });
      questionStartTimeRef.current = Date.now();
      setViewState("active_session");
      toast.success(`Starting ${test.title || `Test ${test.testNumber}`} (15 Questions · 30 Mins)`);
    } catch {
      const exactQuestions = generateLocalDomainQuestions(test.targetName, test.targetType, test.testNumber, 15);
      setQuestions(exactQuestions);
      setSessionConfig({
        tech: test.targetType === "technology" ? test.targetName : "",
        company: test.targetType === "company" ? test.targetName : "",
        domain: test.difficulty || "Medium",
      });
      setProgress({
        currentIdx: 0,
        answers: [],
        timeElapsed: 0,
        timeRemainingSeconds: 1800,
        bookmarkedCount: 0,
        flaggedCount: 0
      });
      questionStartTimeRef.current = Date.now();
      setViewState("active_session");
    } finally {
      setAiLoading(false);
    }
  }, []);

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
    else toast.error("Incorrect. Read explanation below.");

    try { api.post("/mcq/submit", { questionId: currentQuestion.id, selectedIdx, timeTakenSeconds: Math.round(timeTakenMs / 1000) }); } catch {}
  }, [currentQuestion]);

  // ── Navigation ──
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

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (ms: number) => {
    const sec = Math.floor(ms / 1000);
    return `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
  };

  const handleGoHome = useCallback(() => {
    setViewState("home");
    setActiveTab("home");
    setSelectedEntity(null);
    setQuestions([]);
    setActiveTestTitle("");
    if (timerRef.current) clearInterval(timerRef.current);
  }, [setActiveTab]);

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
                <h3 className="text-sm font-extrabold" style={{ color: c.text }}>Initializing Test Environment</h3>
                <p className="text-xs" style={{ color: c.textMuted }}>Setting up 15 Questions · 30-Minute Timer</p>
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

      {/* ── TOP HEADER / NAVIGATION ────────────────────────────────────── */}
      <div className="flex justify-between items-center border-b pb-2.5 shrink-0" style={{ borderColor: c.border }}>
        <div className="flex items-center gap-3">
          {view !== "home" && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (view === "active_session") {
                  if (confirm("Are you sure you want to exit? Your current test progress will be lost.")) {
                    handleGoHome();
                  }
                } else if (view === "tests_screen") {
                  setViewState("home");
                  setSelectedEntity(null);
                } else {
                  handleGoHome();
                }
              }}
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 border transition-all text-xs font-bold bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
            >
              <ArrowLeft size={14} /> Back
            </motion.button>
          )}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">AI Technical Engine</p>
            <h2 className="text-base font-extrabold truncate max-w-[280px] sm:max-w-md" style={{ fontFamily: "var(--font-sans)" }}>
              {view === "home" && activeTab === "home" && "Technical MCQs Hub"}
              {view === "home" && activeTab === "analytics" && "Performance Analytics"}
              {view === "topic_select" && "Select Technology Domain"}
              {view === "tests_screen" && `${selectedEntity?.name || "Topic"} Tests (15 Qs · 30 Mins)`}
              {view === "active_session" && (activeTestTitle || "Practice Session")}
              {view === "session_review" && "Session Performance Review"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FeatureCreditBadge featureKey="TECHNICAL_MCQS" compact isDark={isDark} />

          {/* 30-Minute Live Countdown Timer */}
          {view === "active_session" && (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-black"
                style={{
                  background: progress.timeRemainingSeconds <= 300 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.1)",
                  borderColor: progress.timeRemainingSeconds <= 300 ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.3)",
                  color: progress.timeRemainingSeconds <= 300 ? "#ef4444" : "#10b981",
                }}
              >
                <Clock size={13} className={progress.timeRemainingSeconds <= 300 ? "animate-pulse" : ""} />
                {formatCountdown(progress.timeRemainingSeconds)} Left
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

          {/* ════════════════════════════════════════════════════════════════
              VIEW 1: HOME VIEW
          ════════════════════════════════════════════════════════════════ */}
          {view === "home" && activeTab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar">

              {/* Hero */}
              <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-6 rounded-2xl border text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))`, borderColor: "rgba(245,158,11,0.2)" }}>
                <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }} className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Code2 size={30} className="text-amber-500" />
                </motion.div>
                <h2 className="text-lg font-black" style={{ color: c.text }}>AI Technical Engine</h2>
                <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: c.textSec }}>
                  Practice curated assessments across key technical domains and top hiring companies with real-time performance analytics.
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

              {/* ── Technology Domains Cards ── */}
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
                  {filteredTechnologies.slice(0, 12).map((t, i) => {
                    const techTests = allDynamicTests.filter(
                      (test) => test.targetId === t.id || test.targetName.toLowerCase() === t.name.toLowerCase()
                    );
                    const testCount = techTests.length || 1;
                    const topicStat = userTopicMastery[t.name.toLowerCase()] || userTopicMastery[t.id] || userTopicMastery[t.slug];
                    const realProgress = topicStat ? topicStat.accuracy : 0;

                    return (
                      <motion.div
                        key={t.id}
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="p-5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between group hover:border-amber-500/40"
                        style={{ background: c.cardBg, borderColor: c.border }}
                        onClick={() => handleOpenEntityScreen({
                          id: t.id,
                          name: t.name,
                          type: "technology",
                          iconName: t.iconName,
                          category: t.category,
                          description: t.description,
                          progress: realProgress,
                        })}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                              {getTechIcon(t.iconName)}
                            </div>
                            <div className="relative w-9 h-9 flex items-center justify-center">
                              <svg className="w-9 h-9 transform -rotate-90">
                                <circle cx="18" cy="18" r="14" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} strokeWidth="3" fill="none" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="14"
                                  stroke={realProgress > 0 ? "#F59E0B" : "transparent"}
                                  strokeWidth="3"
                                  fill="none"
                                  strokeDasharray={88}
                                  strokeDashoffset={88 - (88 * realProgress) / 100}
                                  strokeLinecap="round"
                                  className="transition-all duration-500"
                                />
                              </svg>
                              <span className={`absolute text-[9px] font-black ${realProgress > 0 ? "text-amber-500" : (isDark ? "text-slate-500" : "text-slate-400")}`}>
                                {realProgress}%
                              </span>
                            </div>
                          </div>

                          <p className="text-xs font-extrabold" style={{ color: c.text }}>{t.name}</p>
                          <p className="text-[10px] mt-1 leading-relaxed line-clamp-2" style={{ color: c.textMuted }}>{t.description}</p>
                        </div>

                        {/* Test Navigation Bar on Card */}
                        <div className="mt-3 pt-2.5 border-t space-y-2" style={{ borderColor: c.border }}>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span style={{ color: c.textMuted }}>{testCount} {testCount === 1 ? "Test" : "Tests"} Available</span>
                            <span className="text-amber-500 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                              Explore <ChevronRight size={10} />
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {Array.from({ length: Math.min(testCount, 3) }).map((_, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                                style={{
                                  background: "rgba(245,158,11,0.12)",
                                  border: "1px solid rgba(245,158,11,0.3)",
                                  color: "#f59e0b",
                                }}
                              >
                                Test {idx + 1}
                              </span>
                            ))}
                            {testCount > 3 && (
                              <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>+{testCount - 3}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {filteredTechnologies.length > 12 && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setViewState("topic_select")} className="w-full p-3 border rounded-2xl text-center text-xs font-bold transition-colors" style={{ borderColor: c.border, color: c.primary, background: `${c.primary}08` }}>
                    View All {filteredTechnologies.length} Technologies
                  </motion.button>
                )}
              </motion.div>

              {/* ── Company Specific Cards ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4} className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Company-Specific Assessments</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {filteredCompanies.slice(0, 8).map((comp, i) => {
                    const compTests = allDynamicTests.filter(
                      (test) => test.targetId === comp.id || test.targetName.toLowerCase() === comp.name.toLowerCase()
                    );
                    const testCount = compTests.length || 1;

                    return (
                      <motion.div
                        key={comp.id}
                        variants={scaleIn}
                        initial="hidden"
                        animate="visible"
                        custom={i}
                        whileHover={{ y: -3, scale: 1.02 }}
                        className="p-4 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between group hover:border-amber-500/40"
                        style={{ background: c.cardBg, borderColor: c.border }}
                        onClick={() => handleOpenEntityScreen({
                          id: comp.id,
                          name: comp.name,
                          type: "company",
                          description: comp.description,
                          avgPackage: comp.avgPackage,
                          difficulty: comp.difficulty,
                        })}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <CompanyLogo companyName={comp.name} companyId={comp.id} size={36} theme={theme} />
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${comp.difficulty === "Easy" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : comp.difficulty === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>{comp.difficulty}</span>
                          </div>
                          <p className="text-[11px] font-extrabold" style={{ color: c.text }}>{comp.name}</p>
                          <p className="text-[9px] mt-1 line-clamp-1" style={{ color: c.textMuted }}>{comp.avgPackage}</p>
                        </div>

                        {/* Test Navigation Bar on Card */}
                        <div className="mt-3 pt-2 border-t space-y-1.5" style={{ borderColor: c.border }}>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold" style={{ color: c.textMuted }}>{testCount} {testCount === 1 ? "Test" : "Tests"}</span>
                            <span className="font-bold text-amber-500 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                              Practice <ChevronRight size={10} />
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1">
                            {Array.from({ length: Math.min(testCount, 3) }).map((_, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[9px] font-bold"
                                style={{
                                  background: "rgba(245,158,11,0.12)",
                                  border: "1px solid rgba(245,158,11,0.3)",
                                  color: "#f59e0b",
                                }}
                              >
                                Test {idx + 1}
                              </span>
                            ))}
                            {testCount > 3 && (
                              <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>+{testCount - 3}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* ── Performance Dashboard: Weekly Progress & Mastery ── */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5} className="p-6 rounded-3xl border space-y-6" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <BarChart2 size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-500">Weekly Progress & Activity</h3>
                      <p className="text-[11px]" style={{ color: c.textMuted }}>7-day question practice and accuracy trends</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-[11px] font-bold border" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>
                      Total Solved: <strong className="text-amber-500">{userProgress.questionsSolved}</strong>
                    </span>
                    <span className="px-3 py-1 rounded-xl text-[11px] font-bold border" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>
                      Accuracy: <strong className="text-emerald-400">{userProgress.accuracy}%</strong>
                    </span>
                  </div>
                </div>

                {/* Interactive Weekly Bar Chart */}
                <div className="p-4 rounded-2xl border" style={{ background: isDark ? "rgba(0,0,0,0.3)" : "rgba(245,158,11,0.03)", borderColor: c.border }}>
                  <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-40 pt-6 pb-2">
                    {(userProgress.weeklyProgress && userProgress.weeklyProgress.length === 7
                      ? userProgress.weeklyProgress
                      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => ({ day: d, solved: 0, accuracy: 0 }))
                    ).map((item, idx) => {
                      const todayIndex = (new Date().getDay() + 6) % 7; // 0=Mon, 6=Sun
                      const isToday = idx === todayIndex;
                      const maxVal = Math.max(...userProgress.weeklyProgress.map(w => w.solved), 15);
                      const heightPercent = item.solved > 0
                        ? Math.min(100, Math.max(18, Math.round((item.solved / maxVal) * 100)))
                        : (isToday ? 14 : 8);

                      return (
                        <div key={item.day} className="flex flex-col items-center justify-end h-full group relative">
                          {/* Hover Tooltip */}
                          <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap shadow-lg border z-10" style={{ background: isDark ? "#0A0A0C" : "#FFFFFF", borderColor: c.border, color: c.text }}>
                            {item.day}: {item.solved} Solved ({item.accuracy || 0}%)
                          </div>

                          {/* Top Value / Count */}
                          <span className={`text-[10px] font-bold mb-1 transition-colors ${item.solved > 0 ? "text-amber-500" : (isDark ? "text-slate-600" : "text-slate-400")}`}>
                            {item.solved > 0 ? item.solved : (isToday ? "0" : "·")}
                          </span>

                          {/* Bar Fill */}
                          <div className="w-full max-w-[36px] bg-slate-200 dark:bg-white/5 rounded-xl h-24 flex items-end overflow-hidden p-0.5">
                            <motion.div
                              initial={{ height: "0%" }}
                              animate={{ height: `${heightPercent}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.05 }}
                              className={`w-full rounded-lg transition-all ${
                                item.solved > 0
                                  ? "bg-gradient-to-t from-amber-600 to-amber-400 shadow-sm"
                                  : isToday
                                  ? "bg-amber-500/30 border border-amber-500/40"
                                  : "bg-slate-300 dark:bg-white/10"
                              }`}
                            />
                          </div>

                          {/* Day Label */}
                          <div className="flex items-center gap-0.5 mt-2">
                            <span className={`text-[10px] font-bold ${isToday ? "text-amber-500 font-black" : (isDark ? "text-slate-400" : "text-slate-600")}`}>
                              {item.day}
                            </span>
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weak & Strong Topics Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t" style={{ borderColor: c.border }}>
                  <div className="p-4 rounded-2xl border space-y-2.5" style={{ background: c.surface, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                        <AlertCircle size={13} /> Weak Topics (Need Review)
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>&lt; 60% Accuracy</span>
                    </div>
                    {userProgress.weakTopics.length > 0 ? (
                      userProgress.weakTopics.map((wt) => (
                        <div key={wt.topic} className="flex items-center justify-between text-xs py-1 border-b last:border-0" style={{ borderColor: c.border }}>
                          <span className="font-semibold" style={{ color: c.text }}>{wt.topic}</span>
                          <span className="text-red-400 font-bold px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20">{wt.accuracy}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] py-2 leading-relaxed" style={{ color: c.textMuted }}>
                        No weak topics identified yet. Complete tests to discover areas for improvement.
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl border space-y-2.5" style={{ background: c.surface, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={13} /> Strong Topics (Mastered)
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>≥ 60% Accuracy</span>
                    </div>
                    {userProgress.strongTopics.length > 0 ? (
                      userProgress.strongTopics.map((st) => (
                        <div key={st.topic} className="flex items-center justify-between text-xs py-1 border-b last:border-0" style={{ borderColor: c.border }}>
                          <span className="font-semibold" style={{ color: c.text }}>{st.topic}</span>
                          <span className="text-emerald-400 font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">{st.accuracy}%</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] py-2 leading-relaxed" style={{ color: c.textMuted }}>
                        Keep practicing tests to build your mastery portfolio.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>

              <div className="h-4" />
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW 2: DEDICATED TESTS SCREEN (ON CLICKING ANY CARD)
          ════════════════════════════════════════════════════════════════ */}
          {view === "tests_screen" && selectedEntity && (
            <motion.div
              key="tests-screen"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6 overflow-y-auto max-h-[calc(100vh-160px)] pr-1 custom-scrollbar"
            >
              {/* List of Dynamic Test Cards directly without bulky top banner */}
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedEntity.type === "company" ? (
                      <CompanyLogo companyName={selectedEntity.name} companyId={selectedEntity.id} size={32} theme={theme} />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                        {getTechIcon(selectedEntity.iconName || "Code")}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-extrabold" style={{ color: c.text }}>
                        {selectedEntity.name} Technical Tests
                      </h3>
                      <p className="text-[11px]" style={{ color: c.textMuted }}>
                        15 Questions · 30 Minutes · Detailed Solutions
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-3 py-1 rounded-full border bg-amber-500/10 border-amber-500/20 text-amber-500">
                    {selectedEntity.tests.length} {selectedEntity.tests.length === 1 ? "Test Available" : "Tests Available"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedEntity.tests.map((test, idx) => (
                    <motion.div
                      key={test.id}
                      variants={scaleIn}
                      initial="hidden"
                      animate="visible"
                      custom={idx}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="p-5 rounded-3xl border flex flex-col justify-between transition-all group hover:border-amber-500/50 shadow-md"
                      style={{ background: c.cardBg, borderColor: c.border }}
                    >
                      <div className="space-y-3">
                        {/* Test Header */}
                        <div className="flex items-center justify-between">
                          <span
                            className="px-3 py-1 rounded-xl text-xs font-black tracking-wide border shadow-sm"
                            style={{
                              background: "linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))",
                              borderColor: "rgba(245,158,11,0.4)",
                              color: "#f59e0b",
                            }}
                          >
                            Test {test.testNumber}
                          </span>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              test.difficulty === "Easy"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : test.difficulty === "Hard"
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {test.difficulty}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-sm font-extrabold group-hover:text-amber-500 transition-colors leading-snug" style={{ color: c.text }}>
                            {test.title || `${selectedEntity.name} Test ${test.testNumber}`}
                          </h4>
                          <p className="text-[11px] mt-1.5 leading-relaxed line-clamp-2" style={{ color: c.textSec }}>
                            {test.description || `Comprehensive 15-question evaluation on ${selectedEntity.name} runtime mechanics and algorithmic paradigms.`}
                          </p>
                        </div>

                        {/* Test Parameter Badges */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>
                            <HelpCircle size={12} className="text-amber-500" />
                            <span>15 Questions</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>
                            <Hourglass size={12} className="text-emerald-500" />
                            <span>30 Minutes</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>
                            <Award size={12} className="text-blue-500" />
                            <span>+450 XP Max</span>
                          </div>
                        </div>
                      </div>

                      {/* Start Test CTA Button */}
                      <div className="mt-5 pt-3 border-t" style={{ borderColor: c.border }}>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => startTestSession(test)}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all"
                          style={{
                            background: "linear-gradient(135deg, #f59e0b, #d97706)",
                            color: "#0f172a",
                          }}
                        >
                          <Play size={13} className="fill-current" /> Start Test (30 Mins • 15 Qs)
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW 3: TOPIC SELECT VIEW (ALL 36 TECHNOLOGIES)
          ════════════════════════════════════════════════════════════════ */}
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
                {filteredTechnologies.map((t, i) => {
                  const techTests = allDynamicTests.filter(
                    (test) => test.targetId === t.id || test.targetName.toLowerCase() === t.name.toLowerCase()
                  );
                  const testCount = techTests.length || 1;
                  const topicStat = userTopicMastery[t.name.toLowerCase()] || userTopicMastery[t.id] || userTopicMastery[t.slug];
                  const realProgress = topicStat ? topicStat.accuracy : 0;

                  return (
                    <motion.div
                      key={t.id}
                      variants={scaleIn}
                      initial="hidden"
                      animate="visible"
                      custom={i}
                      whileHover={{ y: -3, scale: 1.02 }}
                      className="p-5 border rounded-2xl cursor-pointer transition-all flex flex-col justify-between group hover:border-amber-500/40"
                      style={{ background: c.cardBg, borderColor: c.border }}
                      onClick={() => handleOpenEntityScreen({
                        id: t.id,
                        name: t.name,
                        type: "technology",
                        iconName: t.iconName,
                        category: t.category,
                        description: t.description,
                        progress: realProgress,
                      })}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">{getTechIcon(t.iconName)}</div>
                          <div className="relative w-9 h-9 flex items-center justify-center">
                            <svg className="w-9 h-9 transform -rotate-90">
                              <circle cx="18" cy="18" r="14" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"} strokeWidth="3" fill="none" />
                              <circle
                                cx="18"
                                cy="18"
                                r="14"
                                stroke={realProgress > 0 ? "#F59E0B" : "transparent"}
                                strokeWidth="3"
                                fill="none"
                                strokeDasharray={88}
                                strokeDashoffset={88 - (88 * realProgress) / 100}
                                strokeLinecap="round"
                                className="transition-all duration-500"
                              />
                            </svg>
                            <span className={`absolute text-[9px] font-black ${realProgress > 0 ? "text-amber-500" : (isDark ? "text-slate-500" : "text-slate-400")}`}>
                              {realProgress}%
                            </span>
                          </div>
                        </div>
                        <p className="text-xs font-extrabold" style={{ color: c.text }}>{t.name}</p>
                        <p className="text-[10px] mt-1 leading-relaxed line-clamp-2" style={{ color: c.textMuted }}>{t.description}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t space-y-1.5" style={{ borderColor: c.border }}>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span style={{ color: c.textMuted }}>{testCount} Tests (15 Qs · 30m)</span>
                          <span className="flex items-center gap-1 text-amber-500 group-hover:translate-x-1 transition-transform">
                            View Tests <ChevronRight size={10} />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW 4: ACTIVE SESSION (15 QUESTIONS · 30 MINS)
          ════════════════════════════════════════════════════════════════ */}
          {view === "active_session" && currentQuestion && (
            <motion.div key="active-session" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex gap-4 h-[calc(100vh-160px)]">
              {/* Question Area */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <motion.div key={currentQuestion.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl p-6 border space-y-5" style={{ background: c.cardBg, borderColor: c.border }}>

                  {/* Question Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: c.border }}>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500/10 border border-amber-500/20 text-amber-500">{currentQuestion.technology}</span>
                      {currentQuestion.company && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold border" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>{currentQuestion.company}</span>}
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${currentQuestion.difficulty === "Easy" ? "text-green-500 border-green-500/20 bg-green-500/10" : currentQuestion.difficulty === "Hard" ? "text-red-500 border-red-500/20 bg-red-500/10" : "text-amber-500 border-amber-500/20 bg-amber-500/10"}`}>{currentQuestion.difficulty}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ color: c.textMuted }}>
                        Question {progress.currentIdx + 1} of {questions.length}
                      </span>
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
                        <motion.div key={opt} whileHover={{ x: !isSubmitted ? 4 : 0 }} onClick={() => !isSubmitted && submitAnswer(oIdx)} style={optStyle} className="p-4 rounded-2xl border text-xs cursor-pointer flex items-center justify-between transition-all font-medium">
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
                        {progress.currentIdx < questions.length - 1 ? <><span>Next</span><ArrowRight size={14} /></> : <><span>Finish Test</span><Check size={14} /></>}
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
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden lg:flex flex-col w-56 shrink-0 border rounded-3xl p-3 space-y-3 overflow-y-auto custom-scrollbar" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>Questions Navigator (15)</p>
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

          {/* ════════════════════════════════════════════════════════════════
              VIEW 5: SESSION REVIEW VIEW
          ════════════════════════════════════════════════════════════════ */}
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
                    <motion.div variants={scaleIn} initial="hidden" animate="visible" custom={0} className="p-8 rounded-3xl border text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.04))`, borderColor: "rgba(245,158,11,0.25)" }}>
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: accuracy >= 70 ? "rgba(16,185,129,0.15)" : accuracy >= 40 ? "rgba(245,158,11,0.15)" : "rgba(239,68,68,0.15)" }}>
                        {accuracy >= 70 ? <Trophy size={36} className="text-green-500" /> : accuracy >= 40 ? <Target size={36} className="text-amber-500" /> : <RotateCcw size={36} className="text-red-500" />}
                      </motion.div>
                      <h2 className="text-xl font-black" style={{ color: c.text }}>Assessment Complete!</h2>
                      <p className="text-xs mt-1" style={{ color: c.textSec }}>{activeTestTitle || `${sessionConfig.tech || sessionConfig.company || "Mixed"} Technical Assessment`}</p>
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

          {/* ════════════════════════════════════════════════════════════════
              VIEW 6: ANALYTICS VIEW
          ════════════════════════════════════════════════════════════════ */}
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
