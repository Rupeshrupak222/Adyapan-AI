import { generateText, MODELS } from "../lib/ai/openrouter";

export interface MCQTechnology {
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

export interface MCQCompany {
  id: string;
  name: string;
  logo: string;
  questionCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
  avgPackage: string;
  description: string;
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

// ─── Default 36 Technologies across 6 Core Domains ───────────────────────────

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

  // Cloud & DevOps (5)
  { id: "tech-aws", name: "AWS", slug: "aws", category: "Cloud", iconName: "Cloud", description: "EC2, S3, Lambda, IAM, VPC, DynamoDB, and CloudFront.", questionCount: 210, difficulty: "Hard", progress: 60, solved: 12 },
  { id: "tech-azure", name: "Azure", slug: "azure", category: "Cloud", iconName: "CloudRain", description: "Azure VMs, Blob storage, Azure Functions, Entra ID, and AKS.", questionCount: 130, difficulty: "Hard", progress: 50, solved: 10 },
  { id: "tech-gcp", name: "GCP", slug: "gcp", category: "Cloud", iconName: "CloudLighting", description: "BigQuery, GKE, Cloud Run, Pub/Sub, and IAM roles.", questionCount: 140, difficulty: "Hard", progress: 55, solved: 11 },
  { id: "tech-docker", name: "Docker", slug: "docker", category: "Cloud", iconName: "Box", description: "Dockerfile optimization, multi-stage builds, volumes, and networking.", questionCount: 150, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-k8s", name: "Kubernetes", slug: "kubernetes", category: "Cloud", iconName: "Anchor", description: "Pods, Deployments, Services, Ingress, ConfigMaps, and Helm charts.", questionCount: 120, difficulty: "Hard", progress: 40, solved: 8 },

  // AI/ML (7)
  { id: "tech-ml", name: "Machine Learning", slug: "machine-learning", category: "AI/ML", iconName: "Brain", description: "Supervised/unsupervised learning, regression, decision trees, and evaluation metrics.", questionCount: 180, difficulty: "Hard", progress: 65, solved: 13 },
  { id: "tech-dl", name: "Deep Learning", slug: "deep-learning", category: "AI/ML", iconName: "Cpu", description: "CNNs, RNNs, backpropagation, activation functions, and gradient descent.", questionCount: 140, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "tech-nlp", name: "NLP", slug: "nlp", category: "AI/ML", iconName: "MessageSquare", description: "Tokenization, TF-IDF, Word2Vec, Transformers, and attention mechanisms.", questionCount: 110, difficulty: "Hard", progress: 50, solved: 10 },
  { id: "tech-cv", name: "Computer Vision", slug: "computer-vision", category: "AI/ML", iconName: "Eye", description: "OpenCV, image transformations, object detection (YOLO), and segmentation.", questionCount: 95, difficulty: "Hard", progress: 40, solved: 8 },
  { id: "tech-ds", name: "Data Science", slug: "data-science", category: "AI/ML", iconName: "TrendingUp", description: "Pandas, NumPy, EDA, feature engineering, and statistical testing.", questionCount: 160, difficulty: "Medium", progress: 75, solved: 15 },
  { id: "tech-tf", name: "TensorFlow", slug: "tensorflow", category: "AI/ML", iconName: "Box", description: "Keras API, computational graphs, tensors, and model exporting.", questionCount: 100, difficulty: "Hard", progress: 45, solved: 9 },
  { id: "tech-torch", name: "PyTorch", slug: "pytorch", category: "AI/ML", iconName: "Flame", description: "Autograd, Tensors, nn.Module, DataLoader, and custom loss functions.", questionCount: 115, difficulty: "Hard", progress: 55, solved: 11 },
];

// ─── Default 16 Featured Companies ──────────────────────────────────────────

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

// ─── Default Sample Questions Bank ──────────────────────────────────────────

const SAMPLE_QUESTIONS: MCQQuestion[] = [
  {
    id: "q-mcq-1",
    technology: "Java",
    company: "Amazon",
    difficulty: "Medium",
    question: "What will be the output of the following Java snippet regarding String immutability and memory pool allocation?",
    codeSnippet: `public class Test {
  public static void main(String[] args) {
    String s1 = "Adyapan";
    String s2 = new String("Adyapan");
    String s3 = s2.intern();
    System.out.println((s1 == s2) + " " + (s1 == s3));
  }
}`,
    language: "java",
    options: ["false true", "true true", "false false", "true false"],
    correctAnswer: "false true",
    correctIdx: 0,
    explanation: "s1 points to the String constant pool instance. s2 creates a new object in Heap memory, so (s1 == s2) is false. s2.intern() returns the pool reference, which equals s1, so (s1 == s3) is true.",
    hint: "Remember that '==' checks memory reference equality, whereas string.intern() returns the reference from the string pool.",
    relatedConcept: "Java String Pool & Memory Management",
    estimatedTime: "45 sec",
    optionExplanations: [
      { option: "false true", isCorrect: true, reason: "Correct! s2 is in heap memory while s3 is interned into the constant pool matching s1." },
      { option: "true true", isCorrect: false, reason: "Incorrect. s2 created with 'new String()' allocates a separate heap reference." },
      { option: "false false", isCorrect: false, reason: "Incorrect. intern() guarantees returning the pooled string reference." },
      { option: "true false", isCorrect: false, reason: "Incorrect. Memory addresses do not match for new String() allocation." },
    ],
    interviewTip: "Amazon frequently asks String constant pool vs Heap allocation questions in OA rounds.",
  },
  {
    id: "q-mcq-2",
    technology: "DBMS",
    company: "Google",
    difficulty: "Hard",
    question: "Which of the following Isolation Levels prevents Non-Repeatable Reads but MAY still suffer from Phantom Reads in standard SQL database systems?",
    language: "sql",
    options: ["REPEATABLE READ", "READ COMMITTED", "SERIALIZABLE", "READ UNCOMMITTED"],
    correctAnswer: "REPEATABLE READ",
    correctIdx: 0,
    explanation: "REPEATABLE READ locks existing rows preventing non-repeatable reads, but standard SQL permits phantom reads where new rows inserted by concurrent transactions can appear during a subsequent range query.",
    hint: "Think of SQL-92 isolation levels hierarchy: Read Uncommitted < Read Committed < Repeatable Read < Serializable.",
    relatedConcept: "ACID Transactions & Lock Granularity",
    estimatedTime: "60 sec",
    optionExplanations: [
      { option: "REPEATABLE READ", isCorrect: true, reason: "Correct! Standard SQL Repeatable Read prevents row modifications but allows phantom insertions." },
      { option: "READ COMMITTED", isCorrect: false, reason: "Incorrect. Read Committed still allows Non-Repeatable Reads." },
      { option: "SERIALIZABLE", isCorrect: false, reason: "Incorrect. Serializable prevents all anomalies including Phantom Reads." },
      { option: "READ UNCOMMITTED", isCorrect: false, reason: "Incorrect. Read Uncommitted allows Dirty Reads." },
    ],
    interviewTip: "Google and PostgreSQL DBA interviews frequently test concurrency anomalies under transaction isolation levels.",
  },
  {
    id: "q-mcq-3",
    technology: "Python",
    company: "Microsoft",
    difficulty: "Medium",
    question: "What is the expected output of this Python code snippet demonstrating default mutable parameter behavior?",
    codeSnippet: `def append_item(val, target=[]):
    target.append(val)
    return target

print(append_item(1))
print(append_item(2))`,
    language: "python",
    options: ["[1, 2]", "[1]\n[2]", "[1]\n[1, 2]", "[1, 2]\n[1, 2]"],
    correctAnswer: "[1]\n[1, 2]",
    correctIdx: 2,
    explanation: "In Python, default arguments are evaluated ONCE when the function definition is executed. Thus, the default list 'target' is shared across all function calls.",
    hint: "Default argument values are created at function definition time, not function execution time.",
    relatedConcept: "Python Object Mutability & Function Binding",
    estimatedTime: "40 sec",
    optionExplanations: [
      { option: "[1]\n[1, 2]", isCorrect: true, reason: "Correct! First call prints [1], second call appends 2 to the same list object yielding [1, 2]." },
      { option: "[1, 2]", isCorrect: false, reason: "Incorrect. The code prints twice." },
      { option: "[1]\n[2]", isCorrect: false, reason: "Incorrect. A new list is NOT instantiated per invocation." },
      { option: "[1, 2]\n[1, 2]", isCorrect: false, reason: "Incorrect. First call only contains 1." },
    ],
    interviewTip: "Always use 'target=None' inside function signatures if you want fresh mutable defaults in Python.",
  },
  {
    id: "q-mcq-4",
    technology: "React",
    company: "Meta",
    difficulty: "Hard",
    question: "What occurs during React 18 Concurrent Rendering when a state update is wrapped inside 'startTransition'?",
    options: [
      "The update is treated as non-urgent and can be interrupted by urgent user inputs like typing or clicking.",
      "The component re-renders synchronously on the main thread blocking user interaction.",
      "The update bypasses the React Virtual DOM diffing process completely.",
      "The component state is immediately mutated without scheduling a re-render."
    ],
    correctAnswer: "The update is treated as non-urgent and can be interrupted by urgent user inputs like typing or clicking.",
    correctIdx: 0,
    explanation: "React 18 startTransition marks updates as low priority transitions. If the user interacts (e.g. types in an input), React pauses the transition render to handle the urgent input event immediately.",
    hint: "startTransition distinguishes between urgent updates (like typing text) and non-urgent transitions (like filtering a long list).",
    relatedConcept: "React 18 Concurrent Features & Fiber Scheduler",
    estimatedTime: "50 sec",
    optionExplanations: [
      { option: "The update is treated as non-urgent...", isCorrect: true, reason: "Correct! Transitions allow React to interrupt rendering for responsive user input." },
      { option: "The component re-renders synchronously...", isCorrect: false, reason: "Incorrect. That describes legacy synchronous rendering." },
      { option: "The update bypasses the React Virtual DOM...", isCorrect: false, reason: "Incorrect. VDOM reconciliation still occurs." },
      { option: "The component state is immediately mutated...", isCorrect: false, reason: "Incorrect. React state remains immutable." },
    ],
    interviewTip: "Meta interviewers check deep understanding of React Concurrent Mode, useTransition, and useDeferredValue.",
  },
  {
    id: "q-mcq-5",
    technology: "Operating Systems",
    company: "TCS",
    difficulty: "Medium",
    question: "Which scheduling algorithm is non-preemptive and guarantees minimum average waiting time for a given set of processes?",
    options: [
      "Shortest Job First (SJF)",
      "Round Robin (RR)",
      "First Come First Served (FCFS)",
      "Shortest Remaining Time First (SRTF)"
    ],
    correctAnswer: "Shortest Job First (SJF)",
    correctIdx: 0,
    explanation: "SJF (Shortest Job First) non-preemptive scheduling is provably optimal because it minimizes the average waiting time for a given set of processes by running shorter burst jobs first.",
    hint: "SRTF is the preemptive version, whereas SJF is non-preemptive.",
    relatedConcept: "CPU Scheduling Algorithms & Throughput Optimization",
    estimatedTime: "30 sec",
    optionExplanations: [
      { option: "Shortest Job First (SJF)", isCorrect: true, reason: "Correct! Non-preemptive SJF gives the minimum average waiting time." },
      { option: "Shortest Remaining Time First (SRTF)", isCorrect: false, reason: "Incorrect. SRTF is preemptive." },
      { option: "Round Robin (RR)", isCorrect: false, reason: "Incorrect. RR prioritizes time slicing, not minimum average wait." },
      { option: "First Come First Served (FCFS)", isCorrect: false, reason: "Incorrect. FCFS suffers from the convoy effect." },
    ],
    interviewTip: "Service-based company exams like TCS NQT frequently include CPU scheduling numericals and properties.",
  },
];

// ─── Service Functions ──────────────────────────────────────────────────────

export async function getTopics(): Promise<MCQTechnology[]> {
  return DEFAULT_TECHNOLOGIES;
}

export async function getCompanies(): Promise<MCQCompany[]> {
  return DEFAULT_COMPANIES;
}

export async function getCompanyByName(name: string): Promise<MCQCompany | null> {
  const norm = name.toLowerCase();
  return DEFAULT_COMPANIES.find(c => c.name.toLowerCase() === norm || c.id.toLowerCase() === norm) || null;
}

export async function getQuestions(filter: {
  technology?: string;
  category?: string;
  company?: string;
  difficulty?: string;
  search?: string;
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<{ total: number; questions: MCQQuestion[] }> {
  let list = [...SAMPLE_QUESTIONS];

  if (filter.technology && filter.technology !== "All") {
    list = list.filter(q => q.technology.toLowerCase() === filter.technology!.toLowerCase());
  }
  if (filter.company && filter.company !== "All") {
    list = list.filter(q => q.company?.toLowerCase() === filter.company!.toLowerCase());
  }
  if (filter.difficulty && filter.difficulty !== "All") {
    list = list.filter(q => q.difficulty.toLowerCase() === filter.difficulty!.toLowerCase());
  }
  if (filter.search && filter.search.trim()) {
    const q = filter.search.toLowerCase();
    list = list.filter(item =>
      item.question.toLowerCase().includes(q) ||
      item.technology.toLowerCase().includes(q) ||
      (item.company && item.company.toLowerCase().includes(q))
    );
  }

  // Fallback: If filtered list is empty, map SAMPLE_QUESTIONS to requested technology & company so student always gets practice questions
  if (list.length === 0) {
    list = SAMPLE_QUESTIONS.map((q, idx) => ({
      ...q,
      id: `q-mcq-auto-${idx + 1}`,
      technology: filter.technology && filter.technology !== "All" ? filter.technology : q.technology,
      company: filter.company && filter.company !== "All" ? filter.company : q.company,
      difficulty: (filter.difficulty && filter.difficulty !== "All" ? filter.difficulty : q.difficulty) as "Easy" | "Medium" | "Hard",
    }));
  }

  return {
    total: list.length,
    questions: list,
  };
}

export async function generateAIMCQs(
  prompt: string,
  options?: { technology?: string; company?: string; count?: number; difficulty?: string }
): Promise<MCQQuestion[]> {
  const count = options?.count || 5;
  const tech = options?.technology || "General Technical";
  const comp = options?.company || "Top Tech Companies";
  const diff = options?.difficulty || "Medium";

  const systemPrompt = `You are an expert technical interviewer for top software engineering companies (Google, Amazon, Microsoft, TCS, Infosys).
Generate exactly ${count} high-quality, realistic Technical MCQs based on the following user prompt: "${prompt}".
Target Technology: "${tech}", Company Context: "${comp}", Difficulty: "${diff}".

Return ONLY a valid JSON array of question objects without any markdown formatting or explanation.
Each object in the array MUST strictly follow this JSON structure:
[
  {
    "id": "gen-mcq-1",
    "question": "Clear, precise technical question statement",
    "technology": "${tech}",
    "company": "${comp}",
    "difficulty": "${diff}",
    "codeSnippet": "Optional code snippet if relevant, or empty string",
    "language": "c | cpp | java | python | javascript | sql | bash",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "correctIdx": 0,
    "explanation": "Detailed step-by-step explanation of why Option A is correct",
    "hint": "Subtle hint without revealing answer",
    "relatedConcept": "Core concept name",
    "estimatedTime": "45 sec",
    "interviewTip": "Pro tip for technical interviews"
  }
]`;

  try {
    const rawAiText = await generateText("You are an expert AI Technical MCQ Coach for Adyapan AI.", systemPrompt, { model: MODELS.FAST });
    let cleaned = rawAiText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed: any[] = JSON.parse(cleaned);
    return parsed.map((item, idx) => ({
      id: `ai-gen-${Date.now()}-${idx}`,
      question: item.question || "Technical MCQ Question",
      technology: item.technology || tech,
      company: item.company || comp,
      difficulty: (item.difficulty as any) || diff,
      codeSnippet: item.codeSnippet || undefined,
      language: item.language || undefined,
      options: Array.isArray(item.options) ? item.options : ["A", "B", "C", "D"],
      correctAnswer: item.correctAnswer || item.options?.[0] || "",
      correctIdx: typeof item.correctIdx === "number" ? item.correctIdx : 0,
      explanation: item.explanation || "Correct based on core technical principles.",
      hint: item.hint || "Analyze the language specification and runtime behavior.",
      relatedConcept: item.relatedConcept || "Computer Science Fundamentals",
      estimatedTime: item.estimatedTime || "45 sec",
      interviewTip: item.interviewTip || "Review language specifications and edge cases.",
    }));
  } catch {
    return SAMPLE_QUESTIONS;
  }
}

export async function submitAttempt(
  userId: string,
  data: { questionId: string; selectedIdx: number; timeTakenSeconds?: number }
): Promise<{ isCorrect: boolean; correctIdx: number; xpEarned: number }> {
  const target = SAMPLE_QUESTIONS.find(q => q.id === data.questionId);
  const isCorrect = target ? target.correctIdx === data.selectedIdx : data.selectedIdx === 0;
  return {
    isCorrect,
    correctIdx: target ? target.correctIdx : 0,
    xpEarned: isCorrect ? 30 : 5,
  };
}

export async function toggleBookmark(userId: string, questionId: string): Promise<{ bookmarked: boolean }> {
  return { bookmarked: true };
}

export async function getProgress(userId: string) {
  return {
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
  };
}
