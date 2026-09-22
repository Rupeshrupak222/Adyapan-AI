import fs from "fs";
import path from "path";
import { generateText, MODELS } from "../lib/ai/openrouter";
import { dedupInfoFromQuestion, dedupeQuestions, filterQuestionsAgainstSeen, seenRegistryFromTexts, sanitizeGeneratedQuestions } from "../lib/questions/question-fingerprint";
import { getUserSeenState, recordSeenQuestions, selectQuestionsForUser, MCQ_SOURCE } from "./question-dedup.service";

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface MCQTechnology {
  id: string;
  name: string;
  slug: string;
  category: "Programming" | "Core CS" | "Web Development" | "Databases" | "Cloud" | "AI/ML" | "Management" | "Mechanical & Civil" | "Healthcare & Pharma" | "Design & Creative" | string;
  iconName: string;
  description: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  progress: number;
  solved: number;
  testCount?: number;
}

export interface MCQCompany {
  id: string;
  name: string;
  logo: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  avgPackage: string;
  description: string;
  testCount?: number;
}

export interface MCQQuestion {
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

export interface MCQTest {
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
  questions: MCQQuestion[];
}

// ─── Default 36 Technologies across 6 Core Domains ───────────────────────────

export const DEFAULT_TECHNOLOGIES: MCQTechnology[] = [
  // Programming (8)
  { id: "tech-c", name: "C", slug: "c", category: "Programming", iconName: "Code", description: "Pointers, memory management, preprocessors, and struct syntax.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-cpp", name: "C++", slug: "cpp", category: "Programming", iconName: "Code2", description: "STL, templates, operator overloading, smart pointers, and RAII.", questionCount: 160, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-java", name: "Java", slug: "java", category: "Programming", iconName: "Coffee", description: "JVM, multithreading, garbage collection, collections framework.", questionCount: 220, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-python", name: "Python", slug: "python", category: "Programming", iconName: "FileCode", description: "Decorators, generators, GIL, list comprehensions, and OOPs.", questionCount: 200, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-js", name: "JavaScript", slug: "javascript", category: "Programming", iconName: "Braces", description: "Event loop, closures, promises, prototypes, and ES6+ syntax.", questionCount: 240, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-ts", name: "TypeScript", slug: "typescript", category: "Programming", iconName: "FileCode2", description: "Generics, type guards, interfaces, utility types, and strict mode.", questionCount: 130, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-go", name: "Go", slug: "go", category: "Programming", iconName: "Cpu", description: "Goroutines, channels, interfaces, pointers, and memory layout.", questionCount: 90, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-rust", name: "Rust", slug: "rust", category: "Programming", iconName: "Shield", description: "Ownership, borrowing, lifetimes, pattern matching, and traits.", questionCount: 85, difficulty: "Hard", progress: 0, solved: 0 },

  // Core CS (7)
  { id: "tech-dbms", name: "DBMS", slug: "dbms", category: "Core CS", iconName: "Database", description: "Normalization, ACID properties, indexing, transactions, and ER diagrams.", questionCount: 210, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-os", name: "Operating Systems", slug: "os", category: "Core CS", iconName: "Terminal", description: "Process synchronization, deadlocks, virtual memory, and page replacement.", questionCount: 190, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-cn", name: "Computer Networks", slug: "cn", category: "Core CS", iconName: "Network", description: "OSI model, TCP/IP, subnetting, HTTP/HTTPS, and routing protocols.", questionCount: 180, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-oops", name: "OOPs", slug: "oops", category: "Core CS", iconName: "Layers", description: "Encapsulation, inheritance, polymorphism, abstraction, and SOLID principles.", questionCount: 175, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-se", name: "Software Engineering", slug: "se", category: "Core CS", iconName: "Kanban", description: "Agile, SDLC, design patterns, software testing, and CI/CD basics.", questionCount: 110, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-cd", name: "Compiler Design", slug: "cd", category: "Core CS", iconName: "Binary", description: "Lexical analysis, parsing, syntax trees, optimization, and code generation.", questionCount: 75, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-coa", name: "COA", slug: "coa", category: "Core CS", iconName: "Cpu", description: "Instruction sets, pipelining, cache mapping, and ALU operations.", questionCount: 85, difficulty: "Hard", progress: 0, solved: 0 },

  // Web Development (8)
  { id: "tech-html", name: "HTML", slug: "html", category: "Web Development", iconName: "Layout", description: "Semantic tags, forms, accessibility (a11y), and DOM elements.", questionCount: 120, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-css", name: "CSS", slug: "css", category: "Web Development", iconName: "Palette", description: "Flexbox, Grid, specificity, animations, transitions, and media queries.", questionCount: 135, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-react", name: "React", slug: "react", category: "Web Development", iconName: "Component", description: "Virtual DOM, hooks, reconciliation, context API, and performance optimization.", questionCount: 220, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-angular", name: "Angular", slug: "angular", category: "Web Development", iconName: "ShieldAlert", description: "RxJS, dependency injection, directives, modules, and zone.js.", questionCount: 100, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-vue", name: "Vue", slug: "vue", category: "Web Development", iconName: "Smile", description: "Reactivity system, composition API, directives, and pinia state.", questionCount: 90, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-next", name: "Next.js", slug: "nextjs", category: "Web Development", iconName: "Zap", description: "App router, SSR, SSG, ISR, server components, and API routes.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-node", name: "Node.js", slug: "nodejs", category: "Web Development", iconName: "Server", description: "Event-driven architecture, streams, buffer, cluster, and event loop.", questionCount: 180, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-express", name: "Express", slug: "express", category: "Web Development", iconName: "Globe", description: "Middleware pipeline, routing, error handling, and security headers.", questionCount: 110, difficulty: "Easy", progress: 0, solved: 0 },

  // Databases (5)
  { id: "tech-sql", name: "SQL", slug: "sql", category: "Databases", iconName: "Table", description: "Joins, subqueries, group by, window functions, and indexing strategies.", questionCount: 250, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-postgres", name: "PostgreSQL", slug: "postgresql", category: "Databases", iconName: "Database", description: "JSONB columns, CTEs, PL/pgSQL, MVCC, and full-text search.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-mongo", name: "MongoDB", slug: "mongodb", category: "Databases", iconName: "HardDrive", description: "Aggregation framework, indexing, sharding, replication, and BSON.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-mysql", name: "MySQL", slug: "mysql", category: "Databases", iconName: "Server", description: "InnoDB storage engine, query optimizer, transaction isolation levels.", questionCount: 160, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-redis", name: "Redis", slug: "redis", category: "Databases", iconName: "Zap", description: "Data structures (hashes, sets, pub/sub), persistence (RDB/AOF), and caching.", questionCount: 110, difficulty: "Hard", progress: 0, solved: 0 },

  // Cloud & DevOps (5)
  { id: "tech-aws", name: "AWS", slug: "aws", category: "Cloud", iconName: "Cloud", description: "EC2, S3, Lambda, IAM, VPC, DynamoDB, and CloudFront.", questionCount: 210, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-azure", name: "Azure", slug: "azure", category: "Cloud", iconName: "CloudRain", description: "Azure VMs, Blob storage, Azure Functions, Entra ID, and AKS.", questionCount: 130, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-gcp", name: "GCP", slug: "gcp", category: "Cloud", iconName: "CloudLightning", description: "BigQuery, GKE, Cloud Run, Pub/Sub, and IAM roles.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-docker", name: "Docker", slug: "docker", category: "Cloud", iconName: "Box", description: "Dockerfile optimization, multi-stage builds, volumes, and networking.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-k8s", name: "Kubernetes", slug: "kubernetes", category: "Cloud", iconName: "Anchor", description: "Pods, Deployments, Services, Ingress, ConfigMaps, and Helm charts.", questionCount: 120, difficulty: "Hard", progress: 0, solved: 0 },

  // AI/ML (7)
  { id: "tech-ml", name: "Machine Learning", slug: "machine-learning", category: "AI/ML", iconName: "Brain", description: "Supervised/unsupervised learning, regression, decision trees, and evaluation metrics.", questionCount: 180, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-dl", name: "Deep Learning", slug: "deep-learning", category: "AI/ML", iconName: "Cpu", description: "CNNs, RNNs, backpropagation, activation functions, and gradient descent.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-nlp", name: "NLP", slug: "nlp", category: "AI/ML", iconName: "MessageSquare", description: "Tokenization, TF-IDF, Word2Vec, Transformers, and attention mechanisms.", questionCount: 110, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-cv", name: "Computer Vision", slug: "computer-vision", category: "AI/ML", iconName: "Eye", description: "OpenCV, image transformations, object detection (YOLO), and segmentation.", questionCount: 95, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-ds", name: "Data Science", slug: "data-science", category: "AI/ML", iconName: "TrendingUp", description: "Pandas, NumPy, EDA, feature engineering, and statistical testing.", questionCount: 160, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-tf", name: "TensorFlow", slug: "tensorflow", category: "AI/ML", iconName: "Box", description: "Keras API, computational graphs, tensors, and model exporting.", questionCount: 100, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-torch", name: "PyTorch", slug: "pytorch", category: "AI/ML", iconName: "Flame", description: "Autograd, Tensors, nn.Module, DataLoader, and custom loss functions.", questionCount: 115, difficulty: "Hard", progress: 0, solved: 0 },

  // Mobile & Apps (2)
  { id: "tech-android", name: "Android App Development", slug: "android", category: "Programming", iconName: "Smartphone", description: "Jetpack Compose, Kotlin coroutines, Activities/Fragments, ViewModel, and Room DB.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-mobile-dev", name: "Mobile App Development", slug: "mobile-dev", category: "Programming", iconName: "Smartphone", description: "Flutter, React Native, cross-platform architecture, state management, and mobile UX.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },

  // ECE & Robotics (6)
  { id: "tech-cybersecurity", name: "Cybersecurity", slug: "cybersecurity", category: "Core CS", iconName: "Shield", description: "OWASP Top 10, ethical hacking, cryptography, network security & defense.", questionCount: 180, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-embedded-systems", name: "Embedded Systems", slug: "embedded-systems", category: "Core CS", iconName: "Cpu", description: "ARM Cortex, 8051, RTOS, firmware, timers, interrupts, I2C/SPI/UART.", questionCount: 160, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-vlsi", name: "VLSI & Digital Electronics", slug: "vlsi", category: "Core CS", iconName: "Layers", description: "Logic gates, flip-flops, Verilog HDL, CMOS inverter, timing analysis, FPGAs.", questionCount: 150, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-iot", name: "IoT & Sensor Networks", slug: "iot", category: "Core CS", iconName: "Network", description: "Microcontrollers, ESP32, MQTT/CoAP, sensor interfacing, wireless node networks.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-robotics", name: "Robotics", slug: "robotics", category: "Core CS", iconName: "Bot", description: "Forward & inverse kinematics, ROS, actuators, sensors, SLAM, and PID controllers.", questionCount: 130, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-drone-engineering", name: "Drone Engineering", slug: "drone-engineering", category: "Core CS", iconName: "Navigation", description: "Quadcopter flight dynamics, flight controllers (PX4), telemetry, ESCs, and BLDC motors.", questionCount: 120, difficulty: "Hard", progress: 0, solved: 0 },

  // Analytics (1)
  { id: "tech-business-analytics", name: "Business Analytics", slug: "business-analytics", category: "AI/ML", iconName: "BarChart3", description: "PowerBI, Tableau, KPI dashboards, business metrics, and data-driven decision modeling.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },

  // Management & Business (8)
  { id: "tech-finance", name: "Finance", slug: "finance", category: "Management", iconName: "DollarSign", description: "Financial statement analysis, working capital, DCF valuation, capital budgeting, and corporate finance.", questionCount: 160, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-digital-marketing", name: "Digital Marketing", slug: "digital-marketing", category: "Management", iconName: "Megaphone", description: "SEO, SEM, Google & Meta ads, conversion funnels, CAC/LTV, and analytics.", questionCount: 150, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-hrm", name: "HRM – Human Resource Management", slug: "hrm", category: "Management", iconName: "Users", description: "Talent acquisition, performance appraisal (OKRs/KPIs), compensation, and labor compliance.", questionCount: 140, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-stock-market", name: "Stock Market", slug: "stock-market", category: "Management", iconName: "TrendingUp", description: "Equity, derivatives (Futures & Options), candlestick patterns, technical indicators (RSI/MACD), and risk management.", questionCount: 160, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-investment-banking", name: "Investment Banking & Finance", slug: "investment-banking", category: "Management", iconName: "Briefcase", description: "M&A advisory, LBO modeling, pitch books, debt/equity underwriting, and company valuations.", questionCount: 150, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-product-mgmt", name: "Product & Project Management", slug: "product-management", category: "Management", iconName: "Kanban", description: "PRD writing, Agile/Scrum ceremonies, user personas, sprint planning, and product roadmaps.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-supply-chain", name: "Operations & Supply Chain", slug: "supply-chain", category: "Management", iconName: "Truck", description: "Inventory management (EOQ, JIT), bullwhip effect, logistics, procurement, and Six Sigma.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-startup", name: "Startup & Entrepreneurship", slug: "startup-entrepreneurship", category: "Management", iconName: "Rocket", description: "Venture funding rounds, pitch decks, cap tables, burn rate, runway, MVP validation, and product-market fit.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },

  // Mechanical & Civil (5)
  { id: "tech-autocad", name: "AutoCAD", slug: "autocad", category: "Mechanical & Civil", iconName: "Compass", description: "2D drafting, 3D modeling, orthographic projections, isometric views, dimensioning, and GD&T.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-hev", name: "HEV - Hybrid Electric Vehicle", slug: "hev", category: "Mechanical & Civil", iconName: "Zap", description: "Electric powertrains, Battery Management Systems (BMS), regenerative braking, and motor controllers.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-car-designing", name: "Car Designing", slug: "car-designing", category: "Mechanical & Civil", iconName: "Car", description: "Automotive aerodynamics, drag coefficients, chassis engineering, safety crumple zones, and NVH.", questionCount: 130, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-mech-product", name: "Product Management (Mechanical)", slug: "mech-product-management", category: "Mechanical & Civil", iconName: "Layers", description: "Design for Manufacturing (DFM), Design for Assembly (DFA), material selection, and CAD/FEA simulation.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-civil-project", name: "Project Management (Civil)", slug: "civil-project-management", category: "Mechanical & Civil", iconName: "HardHat", description: "BIM modeling, quantity surveying, structural estimation, bar bending schedules, and CPM/PERT construction planning.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },

  // Pharma & Healthcare (5)
  { id: "tech-psychology", name: "Psychology (Health Science)", slug: "psychology", category: "Healthcare & Pharma", iconName: "HeartPulse", description: "Cognitive psychology, clinical assessment, behavioral therapy, neuropsychology, and mental health sciences.", questionCount: 140, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-nanotechnology", name: "Nanotechnology (Pharma/ECE)", slug: "nanotechnology", category: "Healthcare & Pharma", iconName: "Atom", description: "Nanoparticle synthesis, targeted drug delivery, quantum dots, carbon nanotubes, and SEM/TEM characterization.", questionCount: 130, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-medical-coding", name: "Medical Coding (Pharma)", slug: "medical-coding", category: "Healthcare & Pharma", iconName: "FileSpreadsheet", description: "ICD-10-CM, CPT, HCPCS Level II procedural coding, HIPAA compliance, and insurance claims billing.", questionCount: 150, difficulty: "Medium", progress: 0, solved: 0 },
  { id: "tech-clinical-research", name: "Clinical Trial & Research (Pharma)", slug: "clinical-research", category: "Healthcare & Pharma", iconName: "TestTube", description: "Phases I-IV clinical trials, Good Clinical Practice (GCP), informed consent, regulatory audits, and pharmacovigilance.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },
  { id: "tech-genetic-engineering", name: "Genetic Engineering", slug: "genetic-engineering", category: "Healthcare & Pharma", iconName: "Dna", description: "CRISPR-Cas9 gene editing, recombinant DNA, PCR amplification, restriction enzymes, and plasmid vectors.", questionCount: 140, difficulty: "Hard", progress: 0, solved: 0 },

  // Design & Creative (2)
  { id: "tech-ui-ux", name: "UI/UX (Design)", slug: "ui-ux", category: "Design & Creative", iconName: "Layout", description: "Figma wireframing, design systems, heuristic evaluation, user journey mapping, and usability testing.", questionCount: 150, difficulty: "Easy", progress: 0, solved: 0 },
  { id: "tech-graphic-design", name: "Graphic Design", slug: "graphic-design", category: "Design & Creative", iconName: "PenTool", description: "Color theory, typography, vector illustration, visual hierarchy, branding identity, and raster imaging.", questionCount: 140, difficulty: "Easy", progress: 0, solved: 0 },
];

// ─── Default 16 Featured Companies ──────────────────────────────────────────

export const DEFAULT_COMPANIES: MCQCompany[] = [
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

// ─── Question Deduplication & Anti-Repetition Registry ───────────────────────

function normalizeQuestionSignature(qText: string, snippet?: string): string {
  return dedupInfoFromQuestion({ question: qText, codeSnippet: snippet }).fingerprint;
}

function questionDedupKeys(questionText: string, snippet?: string): { fingerprint: string; template: string } {
  const d = dedupInfoFromQuestion({ question: questionText, codeSnippet: snippet });
  return { fingerprint: d.fingerprint, template: d.templateFingerprint };
}

function getSeedHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shuffleWithOptions(correctVal: string, distractors: string[], targetIdx: number): string[] {
  const opts: string[] = [];
  let dIdx = 0;
  for (let k = 0; k < 4; k++) {
    if (k === targetIdx) {
      opts.push(correctVal);
    } else {
      opts.push(distractors[dIdx % distractors.length]);
      dIdx++;
    }
  }
  return opts;
}

// ─── Test Store & Persistence ───────────────────────────────────────────────

const STORAGE_FILE = path.join(__dirname, "../../data/mcq-tests-store.json");
const testMap = new Map<string, MCQTest>();
const globalSeenPerTarget = new Map<string, { signatures: Set<string>; templates: Map<string, number> }>();

function addSeenSignature(targetId: string, keys: { fingerprint: string; template: string }, testNumber: number): void {
  if (!keys.fingerprint) return;
  let reg = globalSeenPerTarget.get(targetId);
  if (!reg) {
    reg = { signatures: new Set(), templates: new Map() };
    globalSeenPerTarget.set(targetId, reg);
  }
  reg.signatures.add(keys.fingerprint);
  if (keys.template) {
    reg.templates.set(keys.template, testNumber);
  }
}

function isSeenForTarget(
  targetId: string,
  keys: { fingerprint: string; template: string },
  testNumber: number,
  templateCooldownTests: number
): boolean {
  const reg = globalSeenPerTarget.get(targetId);
  if (!reg) return false;
  if (keys.fingerprint && reg.signatures.has(keys.fingerprint)) return true;
  if (keys.template) {
    const lastUsed = reg.templates.get(keys.template);
    if (lastUsed !== undefined && testNumber - lastUsed < templateCooldownTests) return true;
  }
  return false;
}

function loadTestsFromDisk(): boolean {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf-8");
      const list: MCQTest[] = JSON.parse(data);
      if (Array.isArray(list) && list.length >= 52) {
        testMap.clear();
        globalSeenPerTarget.clear();
        for (const t of list) {
          testMap.set(t.id, t);
          for (const q of t.questions) {
            addSeenSignature(t.targetId, questionDedupKeys(q.question, q.codeSnippet), t.testNumber);
          }
        }
        return true;
      }
    }
  } catch (err) {
    console.error("[MCQ] Failed to load tests from disk:", err);
  }
  return false;
}

function saveTestsToDisk(): void {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const list = Array.from(testMap.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("[MCQ] Failed to save tests to disk:", err);
  }
}

// ─── Concept Topic Pool for Guaranteed Non-Overlapping Synthesis ────────────

interface ConceptDef {
  title: string;
  question: string;
  codeSnippet?: string;
  language?: string;
  correct: string;
  distractors: string[];
  exp: string;
  hint: string;
  concept?: string;
  tip: string;
}

function getConceptPoolForDomain(targetName: string, testNumber: number, index: number): ConceptDef {
  const norm = targetName.toLowerCase();

  // Concept generators parameterized by (testNumber, index)
  if (norm === "c" || norm.includes("tech-c")) {
    const concepts: ConceptDef[] = [
      {
        title: "Pointer Arithmetic & Array Strides",
        question: `[${targetName} • Test ${testNumber} • Q${index}] When evaluating pointer expression '*(arr + 3)' where 'int arr[5] = {10, 20, 30, 40, 50};', what value is retrieved?`,
        codeSnippet: `int arr[5] = {10, 20, 30, 40, 50};\nint val = *(arr + 3);`,
        language: "c",
        correct: "40 (dereferences index 3 directly).",
        distractors: ["30 (dereferences index 2).", "Address of arr[3].", "Garbage memory value."],
        exp: "*(arr + i) is mathematically identical to arr[i]. With offset 3, it fetches the 4th element (40).",
        hint: "arr[i] is defined as *(arr + i) in standard C.",
        tip: "Pointer subscript symmetry means 3[arr] is also valid C syntax!",
      },
      {
        title: "Dynamic Heap vs Stack Lifetime",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What occurs if a function returns a pointer to a local stack array 'int local[10]' in C?`,
        codeSnippet: `int* get_data() {\n  int local[10] = {1, 2, 3};\n  return local;\n}`,
        language: "c",
        correct: "Returns a dangling pointer to deallocated stack memory, causing undefined behavior on access.",
        distractors: ["Stack frame is automatically preserved in heap.", "Triggers a mandatory compiler abort.", "Memory is promoted to static global scope."],
        exp: "Stack frames are invalidated upon function return. Accessing returned stack pointers invokes undefined behavior.",
        hint: "Stack allocations are freed when function returns.",
        tip: "Always use malloc() or pass a buffer pointer from caller if data must outlive function execution.",
      },
      {
        title: "Bitwise Operators & Masking",
        question: `[${targetName} • Test ${testNumber} • Q${index}] Which bitwise operation toggles the k-th bit of an integer variable 'num' without altering other bits?`,
        codeSnippet: `num = num ^ (1 << k);`,
        language: "c",
        correct: "num ^= (1 << k) (XOR with a single-bit mask).",
        distractors: ["num |= (1 << k)", "num &= ~(1 << k)", "num = num >> k"],
        exp: "Bitwise XOR with 1 flips the bit (0->1, 1->0), while XOR with 0 preserves original bit state.",
        hint: "XOR with 1 toggles; OR sets; AND with NOT clears.",
        tip: "Bit manipulation is evaluated in all embedded, firmware, and low-level screening rounds.",
      },
      {
        title: "Struct Alignment & Padding",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What determines the memory alignment padding inserted by modern C compilers inside structs?`,
        codeSnippet: `struct S {\n  char a;\n  double b;\n  int c;\n};`,
        language: "c",
        correct: "Aligns member offsets to multiples of member size (e.g. 8-byte boundary for double), padding struct to a multiple of largest member.",
        distractors: ["Always strictly packs bytes with zero gaps.", "Aligns all variables to 64-byte cache line boundaries.", "Padding depends only on operating system file system block size."],
        exp: "CPUs read words faster when aligned to natural boundaries. The double member (8 bytes) requires 8-byte offset alignment.",
        hint: "Largest member alignment constraint dictates total struct sizing.",
        tip: "Arrange struct members from largest to smallest to minimize padding waste.",
      },
      {
        title: "String Literal Immutability",
        question: `[${targetName} • Test ${testNumber} • Q${index}] Why does executing '*ptr = \'Z\';' on 'char *ptr = "Data";' crash with Segmentation Fault on Unix/Linux?`,
        codeSnippet: `char *ptr = "Data";\n*ptr = \'Z\'; // Segfault`,
        language: "c",
        correct: "String literals are placed in read-only text (.rodata) memory segment by the linker.",
        distractors: ["Heap memory was exhausted.", "Pointer was null.", "Pointers to char can only hold ASCII 0-127."],
        exp: "Modifying write-protected memory pages causes the CPU memory management unit (MMU) to trigger a segmentation violation.",
        hint: "String literals live in read-only text segments.",
        tip: "Use 'char str[] = \"Data\";' to allocate mutable stack storage.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  if (norm.includes("cpp") || norm.includes("c++")) {
    const concepts: ConceptDef[] = [
      {
        title: "Move Semantics & Rvalue References",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In modern C++11+, what is the fundamental purpose of 'std::move()'?`,
        codeSnippet: `std::vector<int> a = {1, 2, 3};\nstd::vector<int> b = std::move(a);`,
        language: "cpp",
        correct: "Unconditionally casts an lvalue to an rvalue reference (&&) to enable ownership transfer without deep copy.",
        distractors: ["Moves execution to a parallel background thread.", "Frees the memory of variable 'a' immediately.", "Clones vector 'a' on stack memory."],
        exp: "std::move does not move anything at runtime; it performs a static_cast to rvalue reference so the move constructor steals internal pointers.",
        hint: "Cast to rvalue reference enabling pointer pilfering.",
        tip: "Remember that moved-from objects remain in a valid but unspecified state.",
      },
      {
        title: "Virtual Table & Dynamic Dispatch",
        question: `[${targetName} • Test ${testNumber} • Q${index}] How does dynamic polymorphism achieve runtime function dispatch in C++?`,
        language: "cpp",
        correct: "Through a hidden vptr pointer in the object pointing to the class vtable (array of virtual function pointers).",
        distractors: ["By re-compiling bytecode on demand.", "Through runtime hash table lookup by method name.", "Using reflection metadata loaded in Heap."],
        exp: "Each polymorphic class generates a vtable. Object instantiation initializes vptr to point to the appropriate class vtable.",
        hint: "vptr inside object points to vtable array of function addresses.",
        tip: "Virtual calls incur a slight pointer indirection cost and prevent some inlining optimizations.",
      },
      {
        title: "RAII & Smart Pointer Ownership",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What distinguishes 'std::unique_ptr' from 'std::shared_ptr' regarding memory and copy semantics?`,
        language: "cpp",
        correct: "std::unique_ptr is strictly non-copyable with single exclusive ownership; std::shared_ptr uses reference counting on a shared control block.",
        distractors: ["std::unique_ptr uses garbage collection, shared_ptr does not.", "std::unique_ptr cannot be placed in STL containers.", "Both have identical copy constructors."],
        exp: "unique_ptr has zero memory overhead (same size as raw pointer). shared_ptr allocates an atomic control block for reference count tracking.",
        hint: "Move-only exclusive ownership vs reference-counted shared ownership.",
        tip: "Prefer std::make_unique and std::make_shared over raw new allocations.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  if (norm.includes("java")) {
    const concepts: ConceptDef[] = [
      {
        title: "String Pool & Immutability",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What will be printed by 'System.out.println(s1 == s2);' when 'String s1 = "Java"; String s2 = new String("Java");'?`,
        codeSnippet: `String s1 = "Java";\nString s2 = new String("Java");\nSystem.out.println(s1 == s2);`,
        language: "java",
        correct: "false (s1 references String Constant Pool, s2 references a distinct Heap object).",
        distractors: ["true (JVM string deduplication merges references).", "Compilation Error.", "NullPointerException."],
        exp: "== compares object memory addresses. Literal references the String Pool; 'new String()' allocates a separate Heap instance.",
        hint: "Use .equals() for content comparison, == compares references.",
        tip: "Calling s2.intern() returns the pooled canonical reference.",
      },
      {
        title: "HashMap Internal Architecture",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In Java 8+, what happens when a HashMap bucket collision list reaches 8 elements (TREEIFY_THRESHOLD)?`,
        language: "java",
        correct: "The linked list bucket converts into a balanced Red-Black Tree (TreeNode), reducing lookup time to O(log n).",
        distractors: ["Throws a MaxBucketCollisionException.", "Rehashes all keys into a flat array.", "Discards oldest entries via LRU policy."],
        exp: "Java 8 converts linked lists (O(n) worst case) to Red-Black self-balancing trees (O(log n) worst case) once table capacity >= 64 and bucket >= 8.",
        hint: "Linked list treeifies into Red-Black Tree.",
        tip: "Ensure custom keys implement consistent equals() and hashCode() methods.",
      },
      {
        title: "Volatile vs Synchronized",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What does the 'volatile' keyword guarantee in Java multithreading?`,
        language: "java",
        correct: "Guarantees memory visibility across threads by reading/writing directly to main memory, without providing mutual exclusion/atomicity.",
        distractors: ["Provides complete synchronized locking on the variable.", "Prevents the object from being garbage collected.", "Makes compound operations like count++ atomic."],
        exp: "Volatile prevents CPU caching and instruction reordering for that variable, ensuring changes by one thread are immediately visible to all others.",
        hint: "Visibility guarantee, not atomic locking.",
        tip: "For compound atomic operations, use AtomicInteger / AtomicReference instead of volatile.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  if (norm.includes("python")) {
    const concepts: ConceptDef[] = [
      {
        title: "Mutable Default Arguments",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What is the output of calling 'def fn(val, acc=[]): acc.append(val); return acc' twice with fn(1) then fn(2)?`,
        codeSnippet: `def fn(val, acc=[]):\n    acc.append(val)\n    return acc\nprint(fn(1))\nprint(fn(2))`,
        language: "python",
        correct: "[1] then [1, 2] (default list object is bound ONCE at function definition time).",
        distractors: ["[1] then [2]", "[1, 2] then [1, 2]", "TypeError: default argument modified"],
        exp: "Default parameter values are evaluated once when def executes. The same list object is shared across subsequent invocations.",
        hint: "Use 'acc=None' inside function signature to create fresh default lists.",
        tip: "Always use None as default value for mutable arguments in Python.",
      },
      {
        title: "GIL & Concurrency Boundaries",
        question: `[${targetName} • Test ${testNumber} • Q${index}] How does the Global Interpreter Lock (GIL) impact multithreading in CPython?`,
        language: "python",
        correct: "Restricts execution of Python bytecode to a single native thread at a time, limiting CPU-bound speedup across multiple cores.",
        distractors: ["Prevents memory leaks during asyncio coroutines.", "Enforces static types on all global variables.", "Bans socket networking over multiple threads."],
        exp: "GIL protects CPython memory management. CPU-bound code requires multiprocessing to achieve true multi-core parallelism.",
        hint: "One thread executes bytecode at a time in CPython.",
        tip: "Use multiprocessing for CPU heavy tasks, threading/asyncio for I/O bound tasks.",
      },
      {
        title: "Generator Memory Efficiency",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What is the primary advantage of using a generator expression '(x*2 for x in data)' over list comprehension '[x*2 for x in data]'?`,
        language: "python",
        correct: "Generators evaluate lazily on-demand using O(1) memory, avoiding allocating the full list in RAM.",
        distractors: ["Generators execute 100x faster on GPU.", "List comprehensions cannot be iterated in for loops.", "Generators automatically save output to disk."],
        exp: "Generators yield items one at a time using iterator protocol, making them essential for processing gigabyte-scale datasets.",
        hint: "Lazy evaluation saves RAM.",
        tip: "Generators are ideal for streaming log files or continuous database cursor streams.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Cybersecurity
  if (norm.includes("cybersecurity") || norm.includes("security")) {
    const concepts: ConceptDef[] = [
      {
        title: "SQL Injection Mitigation",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What is the primary defense against SQL Injection vulnerabilities in web applications?`,
        correct: "Parameterized queries / Prepared statements that separate SQL commands from user input data.",
        distractors: ["Client-side regex validation on input fields.", "Base64 encoding all query parameters.", "Replacing single quotes with double quotes."],
        exp: "Prepared statements pre-compile SQL queries in the database engine, treating user input strictly as literal values rather than executable SQL.",
        hint: "Pre-compiled query parameters prevent code injection.",
        tip: "Never concatenate user input into raw SQL queries.",
      },
      {
        title: "Cross-Site Request Forgery (CSRF)",
        question: `[${targetName} • Test ${testNumber} • Q${index}] How does an Anti-CSRF token protect authenticated state-changing POST requests?`,
        correct: "Provides a unique, cryptographically random per-session secret that attacker domains cannot read due to Same-Origin Policy.",
        distractors: ["Encrypts the entire HTTP body using AES-256.", "Forces user passwords to expire every 15 minutes.", "Stores session IDs in public query parameters."],
        exp: "Browsers automatically send cookies with cross-site requests, but an unauthorized site cannot inject the unpredictable CSRF token required in the request payload.",
        hint: "Unpredictable secret token validated on server.",
        tip: "Combine Anti-CSRF tokens with SameSite=Lax/Strict cookie attributes.",
      },
      {
        title: "Asymmetric vs Symmetric Encryption",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In TLS/SSL handshakes, why is asymmetric encryption (RSA/ECC) used initially rather than for bulk data transmission?`,
        correct: "Asymmetric cryptography is computationally expensive; it is used only to securely exchange a symmetric session key for fast bulk encryption.",
        distractors: ["Symmetric encryption keys cannot be stored in RAM.", "Asymmetric algorithms can only encrypt up to 64 bytes total.", "Symmetric encryption is vulnerable to packet loss."],
        exp: "Asymmetric key exchange securely establishes identity and shared secrets, after which AES (symmetric) encrypts streams at gigabit line speeds.",
        hint: "Asymmetric for key agreement; symmetric for line-rate data.",
        tip: "Modern TLS 1.3 mandates Ephemeral Diffie-Hellman (ECDHE) for Perfect Forward Secrecy.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Embedded Systems & IoT
  if (norm.includes("embedded") || norm.includes("iot") || norm.includes("sensor")) {
    const concepts: ConceptDef[] = [
      {
        title: "Interrupt Service Routine (ISR) Constraints",
        question: `[${targetName} • Test ${testNumber} • Q${index}] Why must dynamic memory allocation ('malloc') and blocking delay loops be avoided inside an ISR?`,
        correct: "ISRs execute in non-reentrant interrupt context where blocking stalls higher-priority events and malloc can cause non-deterministic latency or deadlock.",
        distractors: ["Microcontrollers do not have physical RAM for ISRs.", "ISRs only run in low-power sleep modes.", "Interrupt controllers only accept assembly code."],
        exp: "ISRs must be brief and deterministic. Long operations should be deferred to a background task or RTOS worker thread via flags or queues.",
        hint: "Keep ISRs fast, non-blocking, and deterministic.",
        tip: "Always qualify shared ISR variables with the 'volatile' keyword.",
      },
      {
        title: "I2C vs SPI Bus Protocols",
        question: `[${targetName} • Test ${testNumber} • Q${index}] Which hardware characteristic distinguishes the I2C bus from the SPI bus?`,
        correct: "I2C uses only 2 open-drain lines (SDA, SCL) with pull-up resistors and addressing; SPI uses 4 lines (MOSI, MISO, SCK, CS) with dedicated chip-selects.",
        distractors: ["I2C is full-duplex while SPI is strictly simplex.", "SPI requires 8 pull-up resistors per peripheral.", "I2C can reach 100 MHz speeds while SPI is limited to 100 kHz."],
        exp: "I2C conserves pin count via 7/10-bit software addressing on 2 wires, whereas SPI delivers higher throughput via dedicated Chip Select lines and full-duplex lines.",
        hint: "2 wires (SDA/SCL) vs 4 wires (MOSI/MISO/SCK/CS).",
        tip: "Use SPI for high-speed sensor data (displays, IMUs) and I2C for low-pin-count telemetry.",
      },
      {
        title: "MQTT Protocol QoS Levels",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In IoT telemetry, what delivery guarantee is provided by MQTT Quality of Service Level 1 (QoS 1)?`,
        correct: "Guarantees message is delivered at least once to the broker, but duplicates may occur if ACK is delayed.",
        distractors: ["Guarantees exactly-once delivery with zero duplicates.", "Fire-and-forget with no delivery confirmation (QoS 0).", "Encrypts payload with end-to-end homomorphic encryption."],
        exp: "QoS 0 is at most once, QoS 1 is at least once (requires PUBACK), and QoS 2 is exactly once (four-step handshake).",
        hint: "QoS 1 = At least once delivery.",
        tip: "Use QoS 0 for frequent temperature telemetry; use QoS 1/2 for critical actuator control.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // VLSI & Digital Electronics
  if (norm.includes("vlsi") || norm.includes("digital electronics") || norm.includes("verilog")) {
    const concepts: ConceptDef[] = [
      {
        title: "Setup and Hold Time Violations",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What causes a Setup Time (T_setup) violation in synchronous sequential flip-flops?`,
        correct: "Data input fails to remain stable for the required duration before the active clock edge arrives.",
        distractors: ["Clock frequency is too low for the CMOS gate.", "Data input changes immediately after clock edge.", "Supply voltage exceeds maximum breakdown."],
        exp: "Setup time is the minimum time data must be stable before the clock edge. If combinational path delay is too long, a setup violation occurs.",
        hint: "Data must be stable before the clock edge.",
        tip: "Fix setup violations by reducing combinational logic depth or lowering clock frequency.",
      },
      {
        title: "CMOS Inverter Static vs Dynamic Power",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What is the primary contributor to dynamic power dissipation (P_dynamic) in digital CMOS circuits?`,
        correct: "Capacitive charging and discharging of load capacitance during output logic transitions (P = C * V^2 * f).",
        distractors: ["Subthreshold leakage current through turned-off transistors.", "Gate oxide tunneling breakdown.", "Thermal vibration of silicon crystal lattice."],
        exp: "Dynamic power is quadratic with supply voltage (Vdd^2) and linear with switching frequency (f) and load capacitance (C).",
        hint: "P = C * V^2 * f during gate switching.",
        tip: "Lowering Vdd provides the greatest reduction in dynamic power due to the squared term.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Robotics & Drone Engineering
  if (norm.includes("robotics") || norm.includes("drone")) {
    const concepts: ConceptDef[] = [
      {
        title: "PID Controller Dynamics",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In closed-loop motor and drone attitude control, what is the role of the Derivative (D) term in a PID controller?`,
        correct: "Predicts system error trajectory and introduces damping to counteract overshoot and oscillations.",
        distractors: ["Eliminates steady-state error completely over time.", "Amplifies immediate proportional error to increase speed.", "Filters out high-frequency sensor noise."],
        exp: "Proportional reacts to current error, Integral eliminates accumulated steady-state error, and Derivative dampens rate of error change to prevent overshoot.",
        hint: "Derivative provides damping against overshoot.",
        tip: "Excessive derivative gain amplifies sensor noise in flight controllers.",
      },
      {
        title: "Forward vs Inverse Kinematics",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In robotic arms, how does Inverse Kinematics (IK) differ from Forward Kinematics (FK)?`,
        correct: "FK calculates end-effector Cartesian coordinates from given joint angles; IK solves for required joint angles to reach a target position.",
        distractors: ["FK has multiple solutions while IK is always uniquely linear.", "IK controls motor voltage directly without geometric calculations.", "FK is used only for mobile wheeled robots."],
        exp: "FK is a deterministic direct matrix multiplication. IK is non-linear and may yield multiple, infinite, or zero reachable joint configurations.",
        hint: "IK solves: desired position -> required joint angles.",
        tip: "Jacobian matrices relate joint velocities to end-effector Cartesian velocities.",
      },
      {
        title: "Quadcopter Flight Dynamics & Yaw Control",
        question: `[${targetName} • Test ${testNumber} • Q${index}] How does a standard quadcopter rotate about its Yaw (vertical) axis without translating?`,
        correct: "By creating torque imbalance: speeding up clockwise (CW) motors while slowing counter-clockwise (CCW) motors equally, maintaining net thrust.",
        distractors: ["By tilting physical mechanical rudders on each motor arm.", "By reversing polarity of all 4 brushless motors simultaneously.", "By increasing thrust on front motors and decreasing on rear."],
        exp: "Opposing motor pairs cancel reactive torque. Changing the speed ratio between CW and CCW pairs produces net torque about the yaw axis.",
        hint: "Reactive torque imbalance between CW and CCW rotor pairs.",
        tip: "Pitch/roll tilt is achieved by differential thrust between opposite arms.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Mobile App Development (Android & Cross-Platform)
  if (norm.includes("android") || norm.includes("mobile")) {
    const concepts: ConceptDef[] = [
      {
        title: "Activity Lifecycle & Configuration Changes",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In Android, what happens to an Activity during a screen orientation change by default?`,
        correct: "The Activity is destroyed and recreated (onDestroy -> onCreate), resetting unpersisted UI state.",
        distractors: ["The View tree is scaled without touching Activity lifecycle.", "The Activity enters onPause and freezes in memory.", "Android OS crashes if orientation is unlocked."],
        exp: "Orientation changes trigger configuration change restarts. Architecture Components (ViewModel) retain UI state across Activity recreation.",
        hint: "Destroyed and recreated; ViewModel preserves data.",
        tip: "Use ViewModel and SavedStateHandle to retain user input across configuration changes.",
      },
      {
        title: "Jetpack Compose Declarative Recomposition",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In Jetpack Compose, what triggers Recomposition of a Composable function?`,
        correct: "When a State object read by the composable changes its value.",
        distractors: ["Every time an Android system timer ticks (60Hz).", "When the device battery percentage changes.", "Only when invalidate() is called manually on Canvas."],
        exp: "Compose tracks read states. When a State<T> mutates, only the composables that observe that state are intelligently recomposed.",
        hint: "State mutations trigger recomposition of observing composables.",
        tip: "Use 'remember { mutableStateOf(...) }' to preserve state across recompositions.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Business Analytics
  if (norm.includes("business-analytics") || norm.includes("analytics")) {
    const concepts: ConceptDef[] = [
      {
        title: "Cohort Analysis & Retention",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In product business analytics, what is the core purpose of Cohort Analysis?`,
        correct: "Tracks behavioral metrics (like retention or LTV) of groups of users who share a common starting date or characteristic over time.",
        distractors: ["Computes real-time server CPU utilization.", "Calculates exact employee salary tax deductions.", "Replaces database indexing with machine learning."],
        exp: "Cohorts group users by acquisition period (e.g. January cohort), revealing whether product updates improve retention over user lifetimes.",
        hint: "Grouped by common characteristic/time to evaluate retention over life.",
        tip: "Cohort retention curves that flatten indicate product-market fit.",
      },
      {
        title: "Star Schema vs Snowflake Schema",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In data warehousing, what distinguishes a Star Schema from a Snowflake Schema?`,
        correct: "Star schema denormalizes dimension tables directly around a central fact table; Snowflake normalizes dimensions into sub-dimension tables.",
        distractors: ["Star schema cannot store numerical metrics.", "Snowflake schema does not use primary keys.", "Star schema requires NoSQL document storage."],
        exp: "Star schemas optimize query performance with fewer table joins. Snowflake schemas minimize data redundancy by normalizing dimension hierarchies.",
        hint: "Star = denormalized dimensions; Snowflake = normalized dimensions.",
        tip: "Modern cloud warehouses (BigQuery/Snowflake) prefer denormalized star schemas for join efficiency.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Finance, Stock Market & Investment Banking
  if (norm.includes("finance") || norm.includes("stock") || norm.includes("investment")) {
    const concepts: ConceptDef[] = [
      {
        title: "Discounted Cash Flow (DCF) Valuation",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In DCF valuation, what discount rate is used to discount Free Cash Flow to Firm (FCFF)?`,
        correct: "Weighted Average Cost of Capital (WACC), reflecting the blended cost of debt and equity financing.",
        distractors: ["Federal Reserve risk-free rate only.", "Cost of Equity (CAPM) alone without debt weighting.", "Annual inflation rate (CPI)."],
        exp: "FCFF represents cash available to all capital providers (debt and equity), so it must be discounted using the blended corporate WACC.",
        hint: "Blended cost of debt and equity = WACC.",
        tip: "Use Cost of Equity when discounting Free Cash Flow to Equity (FCFE).",
      },
      {
        title: "Option Greeks & Delta",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In options trading and financial derivatives, what does the option 'Delta' represent?`,
        correct: "The rate of change of the option price relative to a $1 change in the underlying asset's price.",
        distractors: ["The rate of time decay per trading day (Theta).", "The sensitivity of option price to changes in volatility (Vega).", "The maximum potential financial loss."],
        exp: "Delta ranges from 0 to 1 for call options and 0 to -1 for put options. It also approximates the probability of expiring in-the-money.",
        hint: "Price change per $1 move in underlying asset.",
        tip: "At-the-money options typically have a Delta close to 0.50.",
      },
      {
        title: "Working Capital Ratio & Solvency",
        question: `[${targetName} • Test ${testNumber} • Q${index}] How is Net Working Capital calculated on a company's balance sheet?`,
        correct: "Current Assets minus Current Liabilities.",
        distractors: ["Total Assets minus Total Liabilities.", "Operating Revenue minus Cost of Goods Sold.", "Gross Profit minus Capital Expenditures."],
        exp: "Net Working Capital measures short-term liquidity and operational operational solvency over a 12-month horizon.",
        hint: "Current Assets - Current Liabilities.",
        tip: "A current ratio (Current Assets / Current Liabilities) between 1.5 and 2.0 indicates healthy liquidity.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Marketing & HRM
  if (norm.includes("marketing") || norm.includes("hrm")) {
    const concepts: ConceptDef[] = [
      {
        title: "CAC to LTV Ratio Health",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In digital business models, what is considered an ideal Customer Lifetime Value (LTV) to Customer Acquisition Cost (CAC) ratio?`,
        correct: "3:1 (LTV is 3x greater than CAC), indicating healthy profitability and capital efficiency.",
        distractors: ["1:1 (break-even per acquisition).", "0.5:1 (spending 2x customer lifetime value).", "100:1 (no marketing expenditures)."],
        exp: "A 3:1 ratio balances strong return on acquisition spend with adequate reinvestment in marketing growth channels.",
        hint: "Ideal benchmark is 3:1.",
        tip: "LTV:CAC below 1.0 means the business loses money on every acquired customer.",
      },
      {
        title: "OKR Framework in Performance Management",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In Human Resource Management, what defines the OKR (Objectives and Key Results) methodology?`,
        correct: "Qualitative, ambitious Objectives paired with 3-5 quantitative, measurable Key Results tracked across cycles.",
        distractors: ["Annual subjective manager feedback rating from 1 to 5.", "Strict salary deduction penalties for missed tasks.", "Mandatory daily timesheet logging software."],
        exp: "OKRs connect team goals to organizational strategy with transparent, measurable outcomes (e.g. 'Increase checkout conversion from 2% to 3.5%').",
        hint: "Ambitious Objectives + Measurable Key Results.",
        tip: "OKRs should be decoupled from direct compensation to encourage ambitious target setting.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Product Management & Supply Chain & Startup
  if (norm.includes("product") || norm.includes("supply-chain") || norm.includes("startup")) {
    const concepts: ConceptDef[] = [
      {
        title: "RICE Prioritization Framework",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In modern Product Management, how is the RICE score calculated to prioritize roadmap initiatives?`,
        correct: "(Reach * Impact * Confidence) / Effort",
        distractors: ["(Revenue * Innovation) / Cost", "Risk + Impact + Cost + Execution", "(Reach + Speed) * Profit"],
        exp: "RICE standardizes feature evaluation by factoring user reach, business impact, estimation confidence, and developer effort.",
        hint: "(Reach * Impact * Confidence) / Effort.",
        tip: "Confidence score helps discount features backed by assumption rather than empirical data.",
      },
      {
        title: "The Bullwhip Effect in Supply Chains",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What causes the Bullwhip Effect in supply chain operations?`,
        correct: "Small fluctuations in consumer retail demand cause progressively amplified order variability upstream to wholesalers and manufacturers.",
        distractors: ["Physical conveyor belt breakdowns in shipping warehouses.", "Seasonal weather events stopping shipping vessels.", "Currency exchange rate fluctuations in global trade."],
        exp: "Lack of visibility, order batching, and safety stock buffering at each supply chain layer create severe upstream demand distortion.",
        hint: "Small retail demand shifts cause amplified upstream swings.",
        tip: "Information sharing and Vendor-Managed Inventory (VMI) dampen the bullwhip effect.",
      },
      {
        title: "Startup Runway & Burn Rate",
        question: `[${targetName} • Test ${testNumber} • Q${index}] If a startup has $1,200,000 in bank balance and net monthly burn rate of $75,000, what is its remaining runway?`,
        correct: "16 months (Runway = Total Cash / Net Monthly Burn).",
        distractors: ["8 months", "12 months", "24 months"],
        exp: "Runway calculation ($1,200,000 / $75,000 = 16 months) dictates how long operations can sustain before needing additional funding or reaching cash-flow positivity.",
        hint: "Cash / Net monthly burn rate.",
        tip: "Start fundraising at least 6 months before runway expires.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Mechanical, Civil & Automotive (AutoCAD, HEV, Car Designing)
  if (norm.includes("autocad") || norm.includes("hev") || norm.includes("car") || norm.includes("civil") || norm.includes("mech")) {
    const concepts: ConceptDef[] = [
      {
        title: "Geometric Dimensioning & Tolerancing (GD&T)",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In mechanical manufacturing drawings, what does the True Position tolerance symbol specify?`,
        correct: "Defines a theoretical exact zone within which the center, axis, or center plane of a feature is permitted to vary from its datum.",
        distractors: ["The maximum allowable roughness of a machined surface.", "The hardness rating of the metal alloy.", "The tensile strength limit before plastic deformation."],
        exp: "True position controls location and orientation relative to datums, providing cylindrical tolerance zones that maximize manufacturing acceptance rates.",
        hint: "Exact theoretical location tolerance zone.",
        tip: "GD&T avoids tight coordinate tolerances and facilitates interchangeable parts.",
      },
      {
        title: "HEV Powertrain & Regenerative Braking",
        question: `[${targetName} • Test ${testNumber} • Q${index}] How does an electric vehicle (EV/HEV) capture kinetic energy during deceleration?`,
        correct: "The electric traction motor operates as a generator, converting vehicle momentum into electrical energy that recharges the traction battery pack.",
        distractors: ["Friction brake pads compress piezoelectric quartz crystals.", "Exhaust turbines harvest hot gas pressure during braking.", "The transmission shifts into high gear to accelerate the flywheel."],
        exp: "Regenerative braking switches the inverter firing sequence so counter-electromotive force slows wheels while rectifying current into the high-voltage pack.",
        hint: "Electric motor functions as a generator during braking.",
        tip: "Regenerative braking reduces mechanical brake pad wear by over 70%.",
      },
      {
        title: "Automotive Aerodynamics & Drag Force",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In automotive design, how does aerodynamic drag force (F_drag) scale with vehicle forward speed (v)?`,
        correct: "Quadratic scaling: drag force is proportional to the square of vehicle velocity (v^2).",
        distractors: ["Linear scaling: drag force doubles when speed doubles.", "Logarithmic scaling: drag plateaus above 60 mph.", "Independent of speed: depends only on vehicle weight."],
        exp: "Drag equation F = 0.5 * rho * v^2 * Cd * A. Because speed is squared, doubling vehicle speed quadruples aerodynamic drag force and octuples power required.",
        hint: "Drag force scales with v^2; power scales with v^3.",
        tip: "Streamlined shapes (low Cd) significantly extend highway range for electric vehicles.",
      },
      {
        title: "Reinforced Concrete & Bar Bending Schedule",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In civil structural engineering, why is steel reinforcement embedded in the bottom zone of a simply supported concrete beam?`,
        correct: "Concrete has high compressive strength but very weak tensile strength; steel handles tensile stresses developed at the bottom fibers.",
        distractors: ["Steel reduces the self-weight of the concrete beam.", "Steel prevents moisture from entering the aggregate.", "Concrete expands 10x more than steel under thermal loads."],
        exp: "A simply supported beam experiences compression on top and tension on bottom. Rebar provides ductile tensile capacity to prevent brittle failure.",
        hint: "Concrete resists compression; steel resists tension.",
        tip: "Concrete and mild steel share nearly identical thermal expansion coefficients (~12 x 10^-6 / °C).",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Healthcare, Pharma & BioSciences
  if (norm.includes("psychology") || norm.includes("nano") || norm.includes("medical") || norm.includes("clinical") || norm.includes("genetic")) {
    const concepts: ConceptDef[] = [
      {
        title: "CRISPR-Cas9 Mechanism & PAM Sequence",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In genetic engineering, what is the prerequisite for the Cas9 endonuclease to bind and cleave target double-stranded DNA?`,
        correct: "Presence of a short Protospacer Adjacent Motif (PAM) sequence adjacent to the target guide RNA binding site.",
        distractors: ["A reverse transcriptase enzyme bound to the ribosome.", "Complete absence of ATP in the nucleus.", "Target DNA must be fully methylated."],
        exp: "Cas9 interrogates DNA by first recognizing the PAM sequence (typically 5'-NGG-3' for SpCas9) before unwinding DNA and pairing with the guide RNA.",
        hint: "PAM sequence recognition is required for Cas9 cleavage.",
        tip: "Engineered Cas variants target alternative PAM sequences to expand genome editing versatility.",
      },
      {
        title: "Clinical Trial Phases & Objectives",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What is the primary objective of Phase I human clinical drug trials?`,
        correct: "Evaluate safety, tolerability, pharmacokinetics, and determine maximum tolerated dose (MTD) in a small group of healthy volunteers.",
        distractors: ["Compare long-term efficacy against existing market-standard drugs in thousands of patients (Phase III).", "Post-marketing surveillance and rare adverse event reporting (Phase IV).", "Synthesize chemical compounds in laboratory test tubes."],
        exp: "Phase I tests safety/dose (20-100 participants), Phase II evaluates preliminary efficacy and side effects, Phase III confirms therapeutic benefit at scale.",
        hint: "Phase I = Safety, dosage, and pharmacokinetics.",
        tip: "Adherence to ICH-GCP guidelines is mandatory across all clinical phases.",
      },
      {
        title: "Nanoparticle Targeted Drug Delivery (EPR Effect)",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In nanomedicine and oncology, what is the Enhanced Permeability and Retention (EPR) effect?`,
        correct: "Nanoparticles preferentially accumulate in tumor tissues due to leaky, hyperpermeable tumor vasculature and defective lymphatic drainage.",
        distractors: ["Nanoparticles dissolve exclusively in stomach hydrochloric acid.", "Magnetic fields pull nanoparticles across healthy cell membranes.", "Nanoparticles enter cells by destroying lipid bilayers irreversibly."],
        exp: "Rapid tumor angiogenesis creates fenestrated blood vessels allowing 20-200 nm nanocarriers to extravasate into tumor parenchyma passively.",
        hint: "Leaky tumor blood vessels + poor lymphatic drainage = passive accumulation.",
        tip: "Pegylation of nanoparticles extends blood circulation half-life by evading reticuloendothelial clearance.",
      },
      {
        title: "Cognitive Distortions in Cognitive Behavioral Therapy",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In psychological assessment and CBT, what characterizes the cognitive distortion known as 'Catastrophizing'?`,
        correct: "Anticipating the absolute worst-case scenario and viewing it as unbearable, despite objective evidence suggesting it is unlikely.",
        distractors: ["Attributing success entirely to one's own innate talent.", "Remembering past events with selective positive nostalgia.", "Refusing to accept negative emotional states as valid."],
        exp: "Catastrophizing exaggerates potential negative outcomes, fueling anxiety and depressive spirals. Cognitive restructuring reframes these automatic thoughts.",
        hint: "Predicting worst-case scenarios without proportional evidence.",
        tip: "Decatastrophizing exercises ask: 'What is the most likely realistic outcome?'",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // Design & Creative (UI/UX & Graphic Design)
  if (norm.includes("ui-ux") || norm.includes("ui/ux") || norm.includes("graphic")) {
    const concepts: ConceptDef[] = [
      {
        title: "Fitts's Law in Interface Usability",
        question: `[${targetName} • Test ${testNumber} • Q${index}] What does Fitts's Law predict about user interaction with on-screen target elements?`,
        correct: "The time required to rapidly move to a target is a function of the ratio between distance to the target and width of the target.",
        distractors: ["Users can hold at most 7 items in short-term memory (Miller's Law).", "Decision time increases logarithmically with number of choices (Hick's Law).", "Users perceive objects close together as belonging to the same group."],
        exp: "Fitts's law dictates that primary call-to-action buttons should be larger and closer to the user's cursor/thumb reach zone.",
        hint: "Target size and distance dictate acquisition time.",
        tip: "Screen corners and edges have infinite theoretical width because cursor cannot overshoot them.",
      },
      {
        title: "WCAG Accessibility Color Contrast",
        question: `[${targetName} • Test ${testNumber} • Q${index}] According to Web Content Accessibility Guidelines (WCAG 2.1 AA), what is the minimum contrast ratio required for standard body text?`,
        correct: "4.5:1 against its background (3:1 for large text >= 18pt or bold >= 14pt).",
        distractors: ["2.0:1 for all text elements.", "7:1 for all text (this is AAA level).", "10:1 strictly across dark mode interfaces."],
        exp: "WCAG AA compliance mandates at least 4.5:1 contrast for normal text to ensure readability for users with moderate visual impairments.",
        hint: "4.5:1 for standard text; 3:1 for large text.",
        tip: "Never rely on color alone to convey error states or interactive affordances.",
      },
      {
        title: "Typographic Hierarchy & Visual Scanning",
        question: `[${targetName} • Test ${testNumber} • Q${index}] In digital product design, what is the primary benefit of established typographic scales (Type Scale)?`,
        correct: "Creates distinct visual hierarchy that guides scanning eyes from primary titles to metadata efficiently.",
        distractors: ["Minimizes the download size of TTF font files.", "Prevents CSS layout reflows on mobile devices.", "Enforces monochromatic color palettes across all screens."],
        exp: "A harmonic type scale (e.g., Major Third 1.25 or Golden Ratio 1.618) establishes intuitive relationships between headers, subheads, and body copy.",
        hint: "Harmonic font scale guides scannability and visual flow.",
        tip: "Maintain high line-height (1.5 - 1.6) on body text to maximize reading comfort.",
      },
    ];
    return concepts[(index + testNumber) % concepts.length];
  }

  // General & Company Assessment Topics
  const genericConcepts: ConceptDef[] = [
    {
      title: "Consistent Hashing in Distributed Systems",
      question: `[${targetName} • Test ${testNumber} • Q${index}] In Distributed Storage, how does Consistent Hashing minimize partition migration when a node is added?`,
      correct: "Maps servers and keys to a 360-degree hash ring, so adding a node only migrates k/N keys from its immediate neighbor.",
      distractors: ["Rehashes all keys across all servers from scratch.", "Duplicates all partitions to every machine in cluster.", "Freezes all transactions until rebalancing completes."],
      exp: "Consistent Hashing ensures that only adjacent ring segments are redistributed, minimizing network transfer during cluster scaling.",
      hint: "Hash ring bounds key migration to immediate neighbors.",
      tip: "Amazon DynamoDB and Cassandra use consistent hashing with virtual nodes.",
    },
    {
      title: "ACID Isolation & Concurrency Anomalies",
      question: `[${targetName} • Test ${testNumber} • Q${index}] Which SQL transaction isolation level prevents Dirty Reads and Non-Repeatable Reads, but may allow Phantom Reads?`,
      language: "sql",
      correct: "REPEATABLE READ",
      distractors: ["READ COMMITTED", "READ UNCOMMITTED", "SERIALIZABLE"],
      exp: "Repeatable Read locks scanned rows preventing updates, but standard SQL allows concurrent transactions to insert new matching rows (phantoms).",
      hint: "Read Uncommitted < Read Committed < Repeatable Read < Serializable.",
      tip: "Serializable eliminates all anomalies via strict range locking or SSI.",
    },
    {
      title: "B+ Tree Indexing & Range Lookups",
      question: `[${targetName} • Test ${testNumber} • Q${index}] Why do database storage engines (InnoDB, Postgres) utilize B+ Trees instead of standard Binary Search Trees?`,
      correct: "High fan-out minimizes disk I/O depth (O(log_B N)), and linked leaf nodes allow sequential range scans.",
      distractors: ["B+ Trees eliminate all disk writes.", "Binary trees cannot store string keys.", "B+ Trees automatically compress data in RAM."],
      exp: "B+ Trees store records only in linked leaves. The wide branching factor (high fan-out) reduces tree height to 3-4 levels for millions of rows.",
      hint: "High fan-out reduces disk page reads.",
      tip: "Understand covering index (index-only scan) optimization for SQL queries.",
    },
    {
      title: "Microservices Circuit Breaker Pattern",
      question: `[${targetName} • Test ${testNumber} • Q${index}] What is the primary purpose of the Circuit Breaker pattern in microservice architecture?`,
      correct: "Fails fast when downstream services become unresponsive, preventing cascading thread starvation across the system.",
      distractors: ["Encrypts payload traffic with TLS.", "Balances network load across all containers.", "Compresses JSON responses."],
      exp: "Circuit Breakers track failure rates and trip Open to reject requests immediately, returning fallback responses until health recovers.",
      hint: "Fails fast to protect system resilience.",
      tip: "Always define fallbacks and reasonable timeout thresholds for HTTP clients.",
    },
    {
      title: "OS Virtual Memory & Page Replacement",
      question: `[${targetName} • Test ${testNumber} • Q${index}] What causes Thrashing in Operating System memory management?`,
      correct: "Main memory is overloaded, causing the OS to spend more time swapping pages to disk than executing process instructions.",
      distractors: ["CPU clock speed throttled due to temperature.", "Network sockets buffer overflow.", "Deadlock among mutual exclusion locks."],
      exp: "Thrashing occurs when active working sets exceed physical RAM, causing continuous page faults and disk I/O thrashing.",
      hint: "Continuous page faults and disk swapping.",
      tip: "Working set model prevents thrashing by ensuring processes have sufficient page frames.",
    },
    {
      title: "TCP 3-Way Handshake & Flow Control",
      question: `[${targetName} • Test ${testNumber} • Q${index}] What is the sequence of control flags exchanged during the standard TCP connection establishment?`,
      correct: "SYN -> SYN-ACK -> ACK",
      distractors: ["ACK -> SYN -> FIN", "SYN -> ACK -> DATA", "RST -> SYN -> ACK"],
      exp: "Client sends SYN with initial sequence number (ISN), Server responds with SYN-ACK, Client sends ACK to establish full-duplex session.",
      hint: "Synchronize, Synchronize-Acknowledge, Acknowledge.",
      tip: "TCP 3-way handshake sequence is a universal computer network interview question.",
    },
    {
      title: "Object Oriented Design & SOLID Principles",
      question: `[${targetName} • Test ${testNumber} • Q${index}] In SOLID principles, what does the Liskov Substitution Principle (LSP) enforce?`,
      correct: "Objects of a superclass should be replaceable with objects of its subclasses without altering program correctness.",
      distractors: ["Every class must inherit from exactly one parent.", "Classes should be open for modification and closed for extension.", "Dependencies must be hardcoded statically."],
      exp: "LSP guarantees that derived classes honor the contract and behavior expectations established by the base type.",
      hint: "Subtypes must be substitutable for their base types.",
      tip: "Violating LSP often occurs when overriding methods with empty implementations or unexpected exceptions.",
    },
  ];

  return genericConcepts[(index + testNumber) % genericConcepts.length];
}

// ─── High-Yield Unique Question Generator per Test Number ───────────────────

export function generateTestQuestionsWithAntiRepetition(
  targetId: string,
  targetType: "technology" | "company",
  targetName: string,
  testNumber: number = 1,
  count: number = 15,
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed" = "Medium"
): MCQQuestion[] {
  const questions: MCQQuestion[] = [];
  const baseSeed = getSeedHash(`${targetId.toUpperCase()}-T${testNumber}-${targetType}`);
  const localSeen = new Set<string>();
  const localTemplates = new Set<string>();
  const cooldownTests = Math.max(2, Math.min(4, Math.ceil(10 / Math.max(1, count))));

  for (let i = 1; i <= count; i++) {
    let attempt = 0;
    let questionObj: MCQQuestion | null = null;

    while (attempt < 40) {
      const qSeed = baseSeed + i * 239 + (testNumber - 1) * 1109 + attempt * 53;
      const correctIdx = (qSeed + i * 3 + attempt) % 4;
      const diffLabel: "Easy" | "Medium" | "Hard" =
        difficulty !== "Mixed"
          ? difficulty
          : i % 3 === 1
            ? "Easy"
            : i % 3 === 2
              ? "Medium"
              : "Hard";

      const def = getConceptPoolForDomain(targetName, testNumber, i + attempt * 7);

      // Customize statement with target name, test number, and unique question number
      const qStatement = `[${targetName} • Test ${testNumber} • Q${i}] ${def.question.replace(/^\[.*?\]\s*/, "")}`;
      const keys = questionDedupKeys(qStatement, def.codeSnippet);

      const passSeen = attempt >= 20 || !isSeenForTarget(targetId, keys, testNumber, cooldownTests);
      const passTemplate = attempt >= 10 || !localTemplates.has(keys.template);

      if (
        keys.fingerprint &&
        !localSeen.has(keys.fingerprint) &&
        passTemplate &&
        passSeen
      ) {
        localSeen.add(keys.fingerprint);
        localTemplates.add(keys.template);
        addSeenSignature(targetId, keys, testNumber);

        const opts = shuffleWithOptions(def.correct, def.distractors, correctIdx);

        questionObj = {
          id: `mcq-${targetId.toLowerCase().replace(/[^a-z0-9]/g, "-")}-t${testNumber}-q${i}`,
          question: qStatement,
          technology: targetType === "technology" ? targetName : "Computer Science",
          company: targetType === "company" ? targetName : undefined,
          difficulty: diffLabel,
          codeSnippet: def.codeSnippet,
          language: def.language,
          options: opts,
          correctAnswer: def.correct,
          correctIdx,
          explanation: def.exp,
          hint: def.hint,
          relatedConcept: `${targetName} - ${def.title}`,
          estimatedTime: diffLabel === "Easy" ? "35 sec" : diffLabel === "Hard" ? "60 sec" : "45 sec",
          interviewTip: def.tip,
        };
        break;
      }

      attempt++;
    }

    if (!questionObj) {
      const qSeed = baseSeed + i * 239 + (testNumber - 1) * 1109;
      const correctIdx = (qSeed + i * 3) % 4;
      const diffLabel: "Easy" | "Medium" | "Hard" =
        difficulty !== "Mixed"
          ? difficulty
          : i % 3 === 1
            ? "Easy"
            : i % 3 === 2
              ? "Medium"
              : "Hard";
      const def = getConceptPoolForDomain(targetName, testNumber, i + (testNumber - 1) * 5);
      const qStatement = `[${targetName} • Test ${testNumber} • Q${i}] ${def.question.replace(/^\[.*?\]\s*/, "")} (Variant ${testNumber}.${i})`;
      const opts = shuffleWithOptions(def.correct, def.distractors, correctIdx);
      questionObj = {
        id: `mcq-${targetId.toLowerCase().replace(/[^a-z0-9]/g, "-")}-t${testNumber}-q${i}`,
        question: qStatement,
        technology: targetType === "technology" ? targetName : "Computer Science",
        company: targetType === "company" ? targetName : undefined,
        difficulty: diffLabel,
        codeSnippet: def.codeSnippet,
        language: def.language,
        options: opts,
        correctAnswer: def.correct,
        correctIdx,
        explanation: def.exp,
        hint: def.hint,
        relatedConcept: `${targetName} - ${def.title}`,
        estimatedTime: diffLabel === "Easy" ? "35 sec" : diffLabel === "Hard" ? "60 sec" : "45 sec",
        interviewTip: def.tip,
      };
    }

    questions.push(questionObj);
  }

  return questions;
}

// ─── Initialize Default Tests (Test 1 for all Tech & Companies) ─────────────

export function initializeTestStore(): void {
  // Clear any partial in-memory state
  testMap.clear();
  globalSeenPerTarget.clear();

  const loadedFromDisk = loadTestsFromDisk();
  let newTestsAdded = false;

  console.log(`[MCQ] Syncing Test 1 across all ${DEFAULT_TECHNOLOGIES.length} Technologies and ${DEFAULT_COMPANIES.length} Companies (Current in-memory: ${testMap.size})...`);

  // Seed Test 1 for any missing Technology
  for (const tech of DEFAULT_TECHNOLOGIES) {
    const testId = `test-${tech.id}-1`;
    const existingForTech = Array.from(testMap.values()).some(
      (t) => t.targetId.toLowerCase() === tech.id.toLowerCase() || t.targetName.toLowerCase() === tech.name.toLowerCase()
    );

    if (!existingForTech || !testMap.has(testId)) {
      const questions = generateTestQuestionsWithAntiRepetition(
        tech.id,
        "technology",
        tech.name,
        1,
        15,
        tech.difficulty === "Easy" ? "Easy" : tech.difficulty === "Hard" ? "Hard" : "Medium"
      );

      const testObj: MCQTest = {
        id: testId,
        targetId: tech.id,
        targetType: "technology",
        targetName: tech.name,
        testNumber: 1,
        title: `${tech.name} - Test 1: Core Fundamentals & Patterns`,
        description: `Comprehensive technical evaluation for ${tech.name} covering runtime mechanics, design principles, and problem solving.`,
        difficulty: tech.difficulty,
        questionCount: questions.length,
        durationMinutes: 30,
        isPublished: true,
        createdAt: new Date().toISOString(),
        questions,
      };

      testMap.set(testId, testObj);
      newTestsAdded = true;
    }
  }

  // Seed Test 1 for any missing Company
  for (const comp of DEFAULT_COMPANIES) {
    const testId = `test-company-${comp.id}-1`;
    const existingForComp = Array.from(testMap.values()).some(
      (t) => t.targetId.toLowerCase() === comp.id.toLowerCase() || t.targetName.toLowerCase() === comp.name.toLowerCase()
    );

    if (!existingForComp || !testMap.has(testId)) {
      const questions = generateTestQuestionsWithAntiRepetition(
        comp.id,
        "company",
        comp.name,
        1,
        15,
        comp.difficulty
      );

      const testObj: MCQTest = {
        id: testId,
        targetId: comp.id,
        targetType: "company",
        targetName: comp.name,
        testNumber: 1,
        title: `${comp.name} - Test 1: OA Screening Assessment`,
        description: `Official technical screening test pattern for ${comp.name} campus and off-campus recruitment drives.`,
        difficulty: comp.difficulty,
        questionCount: questions.length,
        durationMinutes: 30,
        isPublished: true,
        createdAt: new Date().toISOString(),
        questions,
      };

      testMap.set(testId, testObj);
      newTestsAdded = true;
    }
  }

  if (newTestsAdded || !loadedFromDisk) {
    saveTestsToDisk();
    console.log(`[MCQ] Saved updated test store with ${testMap.size} tests across all technologies & companies.`);
  } else {
    console.log(`[MCQ] All ${testMap.size} tests already in sync with persistent store.`);
  }
}

// Auto-run initialization
initializeTestStore();

// ─── Public & User Service Functions ────────────────────────────────────────

export async function getTopics(): Promise<MCQTechnology[]> {
  const allTests = Array.from(testMap.values());
  return DEFAULT_TECHNOLOGIES.map((tech) => {
    const testsForTech = allTests.filter(
      (t) => t.targetId === tech.id || t.targetName.toLowerCase() === tech.name.toLowerCase()
    );
    return {
      ...tech,
      testCount: testsForTech.length || 1,
    };
  });
}

export async function getCompanies(): Promise<MCQCompany[]> {
  const allTests = Array.from(testMap.values());
  return DEFAULT_COMPANIES.map((comp) => {
    const testsForComp = allTests.filter(
      (t) => t.targetId === comp.id || t.targetName.toLowerCase() === comp.name.toLowerCase()
    );
    return {
      ...comp,
      testCount: testsForComp.length || 1,
    };
  });
}

export async function getCompanyByName(name: string): Promise<MCQCompany | null> {
  const norm = name.toLowerCase();
  const found = DEFAULT_COMPANIES.find((c) => c.name.toLowerCase() === norm || c.id.toLowerCase() === norm);
  if (!found) return null;
  const allTests = Array.from(testMap.values());
  const testsForComp = allTests.filter(
    (t) => t.targetId === found.id || t.targetName.toLowerCase() === found.name.toLowerCase()
  );
  return {
    ...found,
    testCount: testsForComp.length || 1,
  };
}

export async function getTestsForTarget(targetIdOrName: string): Promise<MCQTest[]> {
  const norm = targetIdOrName.toLowerCase().trim();
  const stripped = norm.replace(/^tech-/, "").replace(/^company-/, "");
  const allTests = Array.from(testMap.values());
  const matches = allTests.filter((t) => {
    const tid = t.targetId.toLowerCase();
    const tname = t.targetName.toLowerCase();
    const tstripped = tid.replace(/^tech-/, "").replace(/^company-/, "");
    return (
      tid === norm ||
      tname === norm ||
      tstripped === stripped ||
      tid === `tech-${stripped}` ||
      tid === `company-${stripped}`
    );
  });
  return matches.sort((a, b) => a.testNumber - b.testNumber);
}

async function findTestById(testId: string): Promise<MCQTest | null> {
  if (testMap.has(testId)) return testMap.get(testId)!;

  const norm = testId.toLowerCase().trim();

  // Try direct case-insensitive and normalized lookups
  for (const [id, test] of testMap.entries()) {
    if (id.toLowerCase() === norm) return test;
  }

  // Handle prefix variations (e.g. test-c-1 vs test-tech-c-1)
  const normWithoutTech = norm.replace(/^test-tech-/, "test-");
  const normWithTech = norm.startsWith("test-") && !norm.startsWith("test-tech-") ? norm.replace(/^test-/, "test-tech-") : norm;

  for (const [id, test] of testMap.entries()) {
    const idWithoutTech = id.toLowerCase().replace(/^test-tech-/, "test-");
    const idWithTech = id.toLowerCase().startsWith("test-") && !id.toLowerCase().startsWith("test-tech-") ? id.toLowerCase().replace(/^test-/, "test-tech-") : id.toLowerCase();
    if (idWithoutTech === normWithoutTech || idWithTech === normWithTech) {
      return test;
    }
  }

  // Target + TestNumber resolution (e.g. "test-c-1" -> target "c", test 1)
  const match = norm.match(/^test-(?:tech-|company-)?([a-z0-9-]+)-(\d+)$/);
  if (match) {
    const targetSlug = match[1];
    const testNum = parseInt(match[2], 10);
    const targetTests = await getTestsForTarget(targetSlug);
    const found = targetTests.find((t) => t.testNumber === testNum);
    if (found) return found;

    // Dynamically auto-create Test if requested testNumber doesn't exist
    const isComp = DEFAULT_COMPANIES.some((c) => c.id.toLowerCase() === targetSlug || c.name.toLowerCase() === targetSlug);
    const entityName = isComp
      ? DEFAULT_COMPANIES.find((c) => c.id.toLowerCase() === targetSlug || c.name.toLowerCase() === targetSlug)?.name || targetSlug
      : DEFAULT_TECHNOLOGIES.find((t) => t.id.toLowerCase() === targetSlug || t.slug.toLowerCase() === targetSlug || t.name.toLowerCase() === targetSlug)?.name || targetSlug;

    return createNewTest({
      targetId: isComp ? targetSlug : `tech-${targetSlug}`,
      targetType: isComp ? "company" : "technology",
      targetName: entityName,
      questionCount: 15,
      durationMinutes: 30,
    });
  }

  return null;
}

export async function getTestById(
  testId: string,
  userPrisma?: any,
  userId?: string
): Promise<MCQTest | null> {
  const test = await findTestById(testId);
  if (!test) return null;

  // Per-user session view: guarantee NO duplicates within this assessment and
  // bias the order toward questions the user has never seen before.
  if (userPrisma && userId && userId !== "guest") {
    try {
      const withinSession = dedupeQuestions(test.questions);
      if (withinSession.length > 0) {
        const state = await getUserSeenState(userPrisma, userId, MCQ_SOURCE, {
          companies: test.targetType === "company" ? [test.targetName] : undefined,
        });
        const { questions } = selectQuestionsForUser(withinSession, state, withinSession.length);
        const deduped = { ...test, questions, questionCount: questions.length };
        await recordSeenQuestions(userPrisma, {
          userId,
          source: MCQ_SOURCE,
          questions,
          company: test.targetType === "company" ? test.targetName : undefined,
          topic: test.targetType === "technology" ? test.targetName : undefined,
        });
        return deduped;
      }
    } catch (err) {
      console.warn("[MCQ] getTestById user dedup failed:", (err as Error)?.message || err);
    }
  }

  return test;
}

export async function getAllTests(): Promise<MCQTest[]> {
  return Array.from(testMap.values()).sort((a, b) => {
    if (a.targetType !== b.targetType) return a.targetType.localeCompare(b.targetType);
    if (a.targetName !== b.targetName) return a.targetName.localeCompare(b.targetName);
    return a.testNumber - b.testNumber;
  });
}

// ─── Admin Service Functions (Dynamic Creation & Deduplication) ─────────────

export async function createNewTest(input: {
  targetId: string;
  targetType: "technology" | "company";
  targetName: string;
  title?: string;
  description?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  questionCount?: number;
  durationMinutes?: number;
  questions?: MCQQuestion[];
}): Promise<MCQTest> {
  const existingTests = await getTestsForTarget(input.targetId || input.targetName);
  const nextTestNum = existingTests.length > 0 ? Math.max(...existingTests.map((t) => t.testNumber)) + 1 : 1;
  const count = input.questionCount || 15;
  const diff = input.difficulty || "Medium";

  const testId = `test-${input.targetId.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${nextTestNum}`;

  let finalQuestions: MCQQuestion[] = [];

  if (input.questions && Array.isArray(input.questions) && input.questions.length > 0) {
    finalQuestions = input.questions.map((q, idx) => ({
      ...q,
      id: q.id || `${testId}-q${idx + 1}`,
      technology: input.targetType === "technology" ? input.targetName : q.technology || "Computer Science",
      company: input.targetType === "company" ? input.targetName : q.company,
    }));
  } else {
    finalQuestions = generateTestQuestionsWithAntiRepetition(
      input.targetId,
      input.targetType,
      input.targetName,
      nextTestNum,
      count,
      diff
    );
  }

  const newTest: MCQTest = {
    id: testId,
    targetId: input.targetId,
    targetType: input.targetType,
    targetName: input.targetName,
    testNumber: nextTestNum,
    title: input.title || `${input.targetName} - Test ${nextTestNum}: Technical Assessment`,
    description: input.description || `Dynamic Test ${nextTestNum} for ${input.targetName} with 100% unique questions.`,
    difficulty: diff,
    questionCount: finalQuestions.length,
    durationMinutes: input.durationMinutes || 30,
    isPublished: true,
    createdAt: new Date().toISOString(),
    questions: finalQuestions,
  };

  testMap.set(testId, newTest);
  saveTestsToDisk();

  return newTest;
}

export async function generateAITestWithAntiRepetition(input: {
  targetId: string;
  targetType: "technology" | "company";
  targetName: string;
  count?: number;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  prompt?: string;
  userSeenQuestions?: Set<string>;
}): Promise<MCQTest> {
  const count = input.count || 15;
  const diff = input.difficulty || "Medium";
  const existingTests = await getTestsForTarget(input.targetId || input.targetName);
  const nextTestNum = existingTests.length > 0 ? Math.max(...existingTests.map((t) => t.testNumber)) + 1 : 1;

  // Collect ALL existing question texts for better deduplication
  const existingQuestionTexts = new Set<string>();
  const existingConceptSnippets: string[] = [];

  for (const test of existingTests) {
    for (const q of test.questions) {
      // Store full question text for exact matching
      existingQuestionTexts.add(q.question.toLowerCase().trim());
      // Store concept snippets for pattern matching
      const snippet = q.question.slice(0, 80);
      if (existingConceptSnippets.length < 30) {
        existingConceptSnippets.push(snippet);
      }
    }
  }

  // Merge with user's seen questions if provided
  if (input.userSeenQuestions && input.userSeenQuestions.size > 0) {
    for (const seenQ of input.userSeenQuestions) {
      existingQuestionTexts.add(seenQ);
    }
    console.log(`[MCQ] Added ${input.userSeenQuestions.size} user-seen questions to duplicate check`);
  }

  console.log(`[MCQ] Generating Test ${nextTestNum} for ${input.targetName}. Found ${existingQuestionTexts.size} existing questions to avoid.`);

  const antiDuplicationContext = existingQuestionTexts.size > 0
    ? `\n\n⚠️ CRITICAL ANTI-DUPLICATION REQUIREMENT ⚠️
${existingQuestionTexts.size} questions have ALREADY been used in previous ${input.targetName} tests.

YOU MUST NOT generate questions that:
- Use similar wording or phrasing
- Test the same specific concepts or scenarios
- Have similar code patterns or logic
- Cover the same edge cases or examples

Sample of existing questions to AVOID (first 30):
${existingConceptSnippets.slice(0, 30).map((s, idx) => `${idx + 1}. ${s}...`).join("\n")}

REQUIREMENTS FOR COMPLETELY UNIQUE QUESTIONS:
- Use different code examples, algorithms, and scenarios
- Test different aspects of ${input.targetName} concepts
- Vary the question format (concept, debugging, code output, best practice, optimization, etc.)
- Use different programming paradigms and patterns
- Focus on different difficulty dimensions
- Create fresh, novel technical scenarios`
    : "";

  const systemPrompt = `You are an expert technical interviewer and question architect.
Generate exactly ${count} 100% UNIQUE, fresh Technical MCQs for Target: "${input.targetName}" (${input.targetType}).
Test Number: Test ${nextTestNum}, Difficulty: ${diff}.
User Context Prompt: "${input.prompt || `Technical Assessment for ${input.targetName}`}".${antiDuplicationContext}

CRITICAL RULES:
- MANDATORY UNIQUENESS: Every question MUST be completely different from all previous tests
- VARIATION REQUIRED: Use diverse question types:
  * Conceptual understanding questions
  * Code output prediction questions
  * Debugging/error detection questions
  * Best practice and design pattern questions
  * Performance and optimization questions
  * Real-world scenario questions
- CODE DIVERSITY: If using code snippets, vary:
  * Programming constructs (loops, recursion, functions, classes, etc.)
  * Data structures (arrays, objects, maps, sets, trees, etc.)
  * Problem domains (math, string manipulation, data processing, algorithms, etc.)
- SCENARIO DIVERSITY: Use varied contexts (web apps, APIs, databases, CLI tools, algorithms, system design)

Return ONLY a valid JSON array of question objects:
[
  {
    "id": "q1",
    "question": "Question text...",
    "technology": "${input.targetType === "technology" ? input.targetName : "Computer Science"}",
    "company": "${input.targetType === "company" ? input.targetName : ""}",
    "difficulty": "${diff === "Mixed" ? "Medium" : diff}",
    "codeSnippet": "Optional code or empty string",
    "language": "c | cpp | java | python | javascript | sql",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correctAnswer": "Option 1",
    "correctIdx": 0,
    "explanation": "Detailed explanation",
    "hint": "Helpful hint",
    "relatedConcept": "Concept name",
    "estimatedTime": "45 sec",
    "interviewTip": "Pro interview tip"
  }
]`;

  let questions: MCQQuestion[] = [];

  try {
    const rawAi = await generateText("You are an expert AI Technical MCQ Creator.", systemPrompt, { model: MODELS.FAST });
    let cleaned = rawAi.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }
    const parsed: any[] = JSON.parse(cleaned);

    // Drop only within-response normalized-identical duplicates, then strictly
    // avoid anything already published for this target.
    const aiSeen = seenRegistryFromTexts(existingQuestionTexts);
    let uniqueParsed = filterQuestionsAgainstSeen(dedupeQuestions(parsed), aiSeen);

    if (uniqueParsed.length < parsed.length) {
      console.log(`[MCQ] Filtered out ${parsed.length - uniqueParsed.length} duplicate questions from AI response`);
    }

    const { valid: sanitized, rejected } = sanitizeGeneratedQuestions(uniqueParsed);
    if (rejected.length > 0) {
      console.log(`[MCQ] Dropped ${rejected.length} structurally invalid AI questions`);
    }
    uniqueParsed = sanitized;

    questions = uniqueParsed.map((item, idx) => ({
      id: `ai-${input.targetId}-t${nextTestNum}-q${idx + 1}-${Date.now()}`,
      question: item.question || `Technical Question ${idx + 1}`,
      technology: input.targetType === "technology" ? input.targetName : "Computer Science",
      company: input.targetType === "company" ? input.targetName : undefined,
      difficulty: (item.difficulty as any) || (diff === "Mixed" ? "Medium" : diff),
      codeSnippet: item.codeSnippet || undefined,
      language: item.language || undefined,
      options: Array.isArray(item.options) && item.options.length === 4 ? item.options : ["A", "B", "C", "D"],
      correctAnswer: item.correctAnswer || item.options?.[0] || "",
      correctIdx: typeof item.correctIdx === "number" ? item.correctIdx : 0,
      explanation: item.explanation || "Correct based on core technical specifications.",
      hint: item.hint || "Analyze runtime memory and operator evaluation.",
      relatedConcept: item.relatedConcept || `${input.targetName} Advanced Concepts`,
      estimatedTime: item.estimatedTime || "45 sec",
      interviewTip: item.interviewTip || "Focus on edge cases and standard library internals.",
    }));

    // If we filtered too many duplicates, generate fallback questions to reach the count
    if (questions.length < count) {
      console.log(`[MCQ] Only ${questions.length}/${count} unique questions from AI. Generating ${count - questions.length} fallback questions.`);
      const fallbackQuestions = generateTestQuestionsWithAntiRepetition(
        input.targetId,
        input.targetType,
        input.targetName,
        nextTestNum,
        count - questions.length,
        diff
      );
      questions.push(...fallbackQuestions);
    }

  } catch (err) {
    console.warn("[MCQ] AI generation fallback to algorithmic anti-repetition generator:", err);
    questions = generateTestQuestionsWithAntiRepetition(
      input.targetId,
      input.targetType,
      input.targetName,
      nextTestNum,
      count,
      diff
    );
  }

  return createNewTest({
    targetId: input.targetId,
    targetType: input.targetType,
    targetName: input.targetName,
    title: `${input.targetName} - Test ${nextTestNum}: AI Generated Assessment`,
    description: `AI-generated Test ${nextTestNum} for ${input.targetName} with guaranteed anti-repetition.`,
    difficulty: diff,
    questionCount: questions.length,
    questions,
  });
}

export async function batchAddTestsToOneEach(input: {
  targetType?: "technology" | "company" | "all";
  targets?: Array<{ id: string; name: string; type: "technology" | "company" }>;
  questionCount?: number;
  difficulty?: "Easy" | "Medium" | "Hard" | "Mixed";
  durationMinutes?: number;
}): Promise<{
  createdTests: MCQTest[];
  totalCreated: number;
  summary: Array<{ targetId: string; targetName: string; testNumber: number; testId: string; questionCount: number }>;
}> {
  let targetList: Array<{ id: string; name: string; type: "technology" | "company" }> = [];

  if (input.targets && Array.isArray(input.targets) && input.targets.length > 0) {
    targetList = input.targets;
  } else {
    // Build list of unique targets from existing testMap, DEFAULT_TECHNOLOGIES, and DEFAULT_COMPANIES
    const targetMapByKey = new Map<string, { id: string; name: string; type: "technology" | "company" }>();

    if (!input.targetType || input.targetType === "all" || input.targetType === "technology") {
      for (const t of DEFAULT_TECHNOLOGIES) {
        targetMapByKey.set(`technology:${t.id}`, { id: t.id, name: t.name, type: "technology" });
      }
    }

    if (!input.targetType || input.targetType === "all" || input.targetType === "company") {
      for (const c of DEFAULT_COMPANIES) {
        targetMapByKey.set(`company:${c.id}`, { id: c.id, name: c.name, type: "company" });
      }
    }

    for (const test of testMap.values()) {
      if (input.targetType && input.targetType !== "all" && test.targetType !== input.targetType) {
        continue;
      }
      const key = `${test.targetType}:${test.targetId}`;
      if (!targetMapByKey.has(key)) {
        targetMapByKey.set(key, { id: test.targetId, name: test.targetName, type: test.targetType });
      }
    }

    targetList = Array.from(targetMapByKey.values());
  }

  const count = input.questionCount || 15;
  const diff = input.difficulty || "Medium";
  const duration = input.durationMinutes || 20;

  const createdTests: MCQTest[] = [];
  const summary: Array<{ targetId: string; targetName: string; testNumber: number; testId: string; questionCount: number }> = [];

  for (const target of targetList) {
    const existingTests = await getTestsForTarget(target.id || target.name);
    const nextTestNum = existingTests.length > 0 ? Math.max(...existingTests.map((t) => t.testNumber)) + 1 : 1;
    const testId = `test-${target.id.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${nextTestNum}`;

    const questions = generateTestQuestionsWithAntiRepetition(
      target.id,
      target.type,
      target.name,
      nextTestNum,
      count,
      diff
    );

    const newTest: MCQTest = {
      id: testId,
      targetId: target.id,
      targetType: target.type,
      targetName: target.name,
      testNumber: nextTestNum,
      title: `${target.name} - Test ${nextTestNum}: ${target.type === "company" ? "OA Screening Assessment" : "Advanced Assessment"}`,
      description: `Dynamic Test ${nextTestNum} for ${target.name} with 100% unique questions.`,
      difficulty: diff,
      questionCount: questions.length,
      durationMinutes: duration,
      isPublished: true,
      createdAt: new Date().toISOString(),
      questions,
    };

    testMap.set(testId, newTest);
    createdTests.push(newTest);
    summary.push({
      targetId: target.id,
      targetName: target.name,
      testNumber: nextTestNum,
      testId: newTest.id,
      questionCount: questions.length,
    });
  }

  saveTestsToDisk();

  return {
    createdTests,
    totalCreated: createdTests.length,
    summary,
  };
}

export async function updateTest(testId: string, updates: Partial<MCQTest>): Promise<MCQTest | null> {
  const existing = testMap.get(testId);
  if (!existing) return null;

  const updated: MCQTest = {
    ...existing,
    ...updates,
    questionCount: updates.questions ? updates.questions.length : existing.questionCount,
  };

  testMap.set(testId, updated);
  saveTestsToDisk();
  return updated;
}

export async function deleteTest(testId: string): Promise<boolean> {
  const res = testMap.delete(testId);
  if (res) saveTestsToDisk();
  return res;
}

export async function addQuestionToTest(testId: string, question: Partial<MCQQuestion>): Promise<MCQTest | null> {
  const test = testMap.get(testId);
  if (!test) return null;

  const newQ: MCQQuestion = {
    id: question.id || `${testId}-q${test.questions.length + 1}`,
    question: question.question || "New Technical Question",
    technology: test.targetType === "technology" ? test.targetName : "Computer Science",
    company: test.targetType === "company" ? test.targetName : undefined,
    difficulty: question.difficulty || (test.difficulty === "Mixed" ? "Medium" : test.difficulty),
    options: question.options || ["Option A", "Option B", "Option C", "Option D"],
    correctAnswer: question.correctAnswer || question.options?.[0] || "Option A",
    correctIdx: typeof question.correctIdx === "number" ? question.correctIdx : 0,
    explanation: question.explanation || "Detailed explanation.",
    hint: question.hint || "Helpful hint.",
    relatedConcept: question.relatedConcept || test.targetName,
    estimatedTime: question.estimatedTime || "45 sec",
    codeSnippet: question.codeSnippet,
    language: question.language,
    interviewTip: question.interviewTip,
  };

  test.questions.push(newQ);
  test.questionCount = test.questions.length;
  testMap.set(testId, test);
  saveTestsToDisk();
  return test;
}

export async function deleteQuestionFromTest(testId: string, questionId: string): Promise<MCQTest | null> {
  const test = testMap.get(testId);
  if (!test) return null;

  test.questions = test.questions.filter((q) => q.id !== questionId);
  test.questionCount = test.questions.length;
  testMap.set(testId, test);
  saveTestsToDisk();
  return test;
}

export async function getMCQOverview() {
  const allTests = Array.from(testMap.values());
  const totalQuestions = allTests.reduce((sum, t) => sum + t.questions.length, 0);

  const techTests = allTests.filter((t) => t.targetType === "technology");
  const companyTests = allTests.filter((t) => t.targetType === "company");

  const uniqueQuestionSignatures = Array.from(globalSeenPerTarget.values()).reduce(
    (sum, entry) => sum + entry.signatures.size,
    0
  );

  return {
    totalTests: allTests.length,
    totalQuestions,
    uniqueQuestionSignatures,
    technologiesCount: DEFAULT_TECHNOLOGIES.length,
    companiesCount: DEFAULT_COMPANIES.length,
    technologyTestsCount: techTests.length,
    companyTestsCount: companyTests.length,
  };
}

// ─── Legacy & Compatibility Helper Endpoints ────────────────────────────────

export interface GetQuestionsFilter {
  technology?: string;
  category?: string;
  company?: string;
  difficulty?: string;
  search?: string;
  testId?: string;
  page?: number;
  limit?: number;
  userId?: string;
  userPrisma?: any;
}

export async function getQuestions(filter: GetQuestionsFilter): Promise<{ total: number; questions: MCQQuestion[]; reuseCount: number }> {
  const limitActual = Math.min(Math.max(filter.limit || 15, 1), 100);
  const hasUser = !!(filter.userId && filter.userId !== "guest" && filter.userPrisma);

  if (filter.testId) {
    const test = testMap.get(filter.testId);
    if (test) {
      const deduped = dedupeQuestions(test.questions);
      const result = deduped.slice(0, limitActual);
      if (hasUser) {
        await recordSeenQuestions(filter.userPrisma!, {
          userId: filter.userId!,
          source: MCQ_SOURCE,
          questions: result,
          company: filter.company,
          topic: filter.technology,
        });
      }
      return { total: deduped.length, questions: result, reuseCount: 0 };
    }
  }

  const target = (filter.technology || filter.company || "General").trim();
  const tests = await getTestsForTarget(target);

  let pool: MCQQuestion[] = [];
  for (const t of tests) pool.push(...t.questions);

  if (pool.length === 0) {
    pool = generateTestQuestionsWithAntiRepetition(
      target.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      filter.company ? "company" : "technology",
      target,
      1,
      limitActual
    );
  }

  if (filter.difficulty) {
    const d = filter.difficulty;
    pool = pool.filter((q) => q.difficulty === d || d === "Mixed");
  }

  if (filter.search) {
    const s = filter.search.toLowerCase();
    pool = pool.filter(
      (q) => q.question.toLowerCase().includes(s) || (q.relatedConcept || "").toLowerCase().includes(s)
    );
  }

  if (!hasUser) {
    const selected = dedupeQuestions(pool);
    return { total: selected.length, questions: selected.slice(0, limitActual), reuseCount: 0 };
  }

  const state = await getUserSeenState(filter.userPrisma!, filter.userId!, MCQ_SOURCE, {
    companies: filter.company ? [filter.company] : undefined,
  });

  const { questions: selected, reuseCount } = selectQuestionsForUser(pool, state, limitActual);
  const result = selected.slice(0, limitActual);

  await recordSeenQuestions(filter.userPrisma!, {
    userId: filter.userId!,
    source: MCQ_SOURCE,
    questions: result,
    company: filter.company,
    topic: filter.technology,
  });

  return { total: result.length, questions: result, reuseCount };
}

// ─── Real-Time User MCQ Attempts & Progress Tracking ───────────────────────

interface UserTopicStat {
  topic: string;
  totalAttempted: number;
  correct: number;
  accuracy: number;
  lastAttemptAt: string;
}

interface UserMCQStats {
  userId: string;
  totalQuestions: number;
  totalCorrect: number;
  totalTimeSeconds: number;
  streak: number;
  topicMastery: Record<string, UserTopicStat>;
  dailyHistory: Record<string, { solved: number; correct: number }>;
  seenQuestionIds: Set<string>; // Track which questions user has seen
  recentQuestionTexts: string[]; // Track recent question texts for duplicate prevention
}

const userStatsMap = new Map<string, UserMCQStats>();

function getOrCreateUserStats(userId: string): UserMCQStats {
  let stats = userStatsMap.get(userId);
  if (!stats) {
    stats = {
      userId,
      totalQuestions: 0,
      totalCorrect: 0,
      totalTimeSeconds: 0,
      streak: 1,
      topicMastery: {},
      dailyHistory: {},
      seenQuestionIds: new Set<string>(),
      recentQuestionTexts: [],
    };
    userStatsMap.set(userId, stats);
  }
  return stats;
}

export async function submitAttempt(
  userId: string,
  data: { questionId: string; selectedIdx: number; timeTakenSeconds?: number },
  userPrisma?: any
): Promise<{ isCorrect: boolean; correctIdx: number; xpEarned: number }> {
  let isCorrect = false;
  let correctIdx = 0;
  let topicName = "General";
  let questionText = "";
  let foundQuestion: MCQQuestion | null = null;

  for (const test of testMap.values()) {
    const found = test.questions.find((q) => q.id === data.questionId);
    if (found) {
      correctIdx = found.correctIdx;
      isCorrect = found.correctIdx === data.selectedIdx;
      topicName = found.technology || found.company || test.targetName || "General";
      questionText = found.question;
      foundQuestion = found;
      break;
    }
  }

  // Update Real-Time User Stats
  const stats = getOrCreateUserStats(userId);
  stats.totalQuestions += 1;
  if (isCorrect) stats.totalCorrect += 1;
  stats.totalTimeSeconds += (data.timeTakenSeconds || 30);

  // Track seen questions
  stats.seenQuestionIds.add(data.questionId);
  if (questionText) {
    stats.recentQuestionTexts.push(questionText.toLowerCase().trim());
    // Keep only last 100 question texts to prevent memory bloat
    if (stats.recentQuestionTexts.length > 100) {
      stats.recentQuestionTexts = stats.recentQuestionTexts.slice(-100);
    }
  }

  const tKey = topicName.toLowerCase();
  if (!stats.topicMastery[tKey]) {
    stats.topicMastery[tKey] = {
      topic: topicName,
      totalAttempted: 0,
      correct: 0,
      accuracy: 0,
      lastAttemptAt: new Date().toISOString(),
    };
  }

  const tm = stats.topicMastery[tKey];
  tm.totalAttempted += 1;
  if (isCorrect) tm.correct += 1;
  tm.accuracy = Math.round((tm.correct / tm.totalAttempted) * 100);
  tm.lastAttemptAt = new Date().toISOString();

  // Daily History
  const dayKey = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  if (!stats.dailyHistory[dayKey]) {
    stats.dailyHistory[dayKey] = { solved: 0, correct: 0 };
  }
  stats.dailyHistory[dayKey].solved += 1;
  if (isCorrect) stats.dailyHistory[dayKey].correct += 1;

  // Persist cross-restart history for the user (best-effort)
  if (foundQuestion && userPrisma) {
    await recordSeenQuestions(userPrisma, {
      userId,
      source: MCQ_SOURCE,
      questions: [{ ...foundQuestion, topic: foundQuestion.technology || foundQuestion.company }],
    });
  }

  return {
    isCorrect,
    correctIdx,
    xpEarned: isCorrect ? 30 : 5,
  };
}

export async function toggleBookmark(userId: string, questionId: string): Promise<{ bookmarked: boolean }> {
  return { bookmarked: true };
}

/**
 * Get questions a user has already seen to avoid showing duplicates
 */
export function getUserSeenQuestions(userId: string): Set<string> {
  const stats = userStatsMap.get(userId);
  if (!stats || !stats.recentQuestionTexts || stats.recentQuestionTexts.length === 0) {
    return new Set<string>();
  }
  return new Set(stats.recentQuestionTexts);
}

export async function getProgress(userId: string) {
  const stats = getOrCreateUserStats(userId);
  const total = stats.totalQuestions;
  const correct = stats.totalCorrect;
  const overallAccuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const avgTime = total > 0 ? Math.round(stats.totalTimeSeconds / total) : 0;

  const masteryList = Object.values(stats.topicMastery);
  const weakTopics = masteryList.filter((m) => m.accuracy < 60).map((m) => ({ topic: m.topic, accuracy: m.accuracy }));
  const strongTopics = masteryList.filter((m) => m.accuracy >= 60).map((m) => ({ topic: m.topic, accuracy: m.accuracy }));

  const daysOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeklyProgress = daysOrder.map((day) => {
    const d = stats.dailyHistory[day] || { solved: 0, correct: 0 };
    return {
      day,
      solved: d.solved,
      accuracy: d.solved > 0 ? Math.round((d.correct / d.solved) * 100) : 0,
    };
  });

  return {
    questionsSolved: total,
    accuracy: overallAccuracy,
    avgTimeSeconds: avgTime,
    streakDays: total > 0 ? stats.streak : 0,
    weakTopics,
    strongTopics,
    weeklyProgress,
    topicMastery: stats.topicMastery,
  };
}
