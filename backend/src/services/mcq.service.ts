import fs from "fs";
import path from "path";
import { generateText, MODELS } from "../lib/ai/openrouter";

// ─── Interfaces ─────────────────────────────────────────────────────────────

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
  const combined = `${qText} ${snippet || ""}`.toLowerCase().replace(/[^a-z0-9]/g, "");
  return combined.slice(0, 80);
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
const globalSeenSignatures = new Set<string>();

function loadTestsFromDisk(): boolean {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, "utf-8");
      const list: MCQTest[] = JSON.parse(data);
      if (Array.isArray(list) && list.length >= 52) {
        testMap.clear();
        globalSeenSignatures.clear();
        for (const t of list) {
          testMap.set(t.id, t);
          for (const q of t.questions) {
            globalSeenSignatures.add(normalizeQuestionSignature(q.question, q.codeSnippet));
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

  for (let i = 1; i <= count; i++) {
    let attempt = 0;
    let questionObj: MCQQuestion | null = null;

    while (attempt < 20) {
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
      const sig = normalizeQuestionSignature(qStatement, def.codeSnippet);

      if (!localSeen.has(sig) && !globalSeenSignatures.has(sig)) {
        localSeen.add(sig);
        globalSeenSignatures.add(sig);

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

    if (questionObj) {
      questions.push(questionObj);
    }
  }

  return questions;
}

// ─── Initialize Default Tests (Test 1 for all Tech & Companies) ─────────────

export function initializeTestStore(): void {
  // Clear any partial data
  testMap.clear();
  globalSeenSignatures.clear();

  if (loadTestsFromDisk() && testMap.size >= 52) {
    console.log(`[MCQ] Loaded ${testMap.size} dynamic tests from disk.`);
    return;
  }

  console.log("[MCQ] Initializing default Test 1 for all 36 Technologies and 16 Companies...");

  // Seed Test 1 for all 36 Technologies
  for (const tech of DEFAULT_TECHNOLOGIES) {
    const testId = `test-${tech.id}-1`;
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
  }

  // Seed Test 1 for all 16 Companies
  for (const comp of DEFAULT_COMPANIES) {
    const testId = `test-company-${comp.id}-1`;
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
  }

  saveTestsToDisk();
  console.log(`[MCQ] Successfully seeded ${testMap.size} tests across all technologies & companies.`);
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

export async function getTestById(testId: string): Promise<MCQTest | null> {
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
}): Promise<MCQTest> {
  const count = input.count || 15;
  const diff = input.difficulty || "Medium";
  const existingTests = await getTestsForTarget(input.targetId || input.targetName);
  const nextTestNum = existingTests.length > 0 ? Math.max(...existingTests.map((t) => t.testNumber)) + 1 : 1;

  const existingSnippets = existingTests.flatMap((t) => t.questions.map((q) => q.question.slice(0, 60))).slice(0, 20);

  const systemPrompt = `You are an expert technical interviewer.
Generate exactly ${count} 100% UNIQUE, fresh Technical MCQs for Target: "${input.targetName}" (${input.targetType}).
Test Number: Test ${nextTestNum}, Difficulty: ${diff}.
User Context Prompt: "${input.prompt || `Technical Assessment for ${input.targetName}`}".

CRITICAL ANTI-DUPLICATION RULE:
These questions MUST NOT duplicate any previous concepts or existing questions. Avoid these topics/statements:
${existingSnippets.map((s, idx) => `${idx + 1}. ${s}`).join("\n")}

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
    questions = parsed.map((item, idx) => ({
      id: `ai-${input.targetId}-t${nextTestNum}-q${idx + 1}`,
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

  return {
    totalTests: allTests.length,
    totalQuestions,
    uniqueQuestionSignatures: globalSeenSignatures.size,
    technologiesCount: DEFAULT_TECHNOLOGIES.length,
    companiesCount: DEFAULT_COMPANIES.length,
    technologyTestsCount: techTests.length,
    companyTestsCount: companyTests.length,
  };
}

// ─── Legacy & Compatibility Helper Endpoints ────────────────────────────────

export async function getQuestions(filter: {
  technology?: string;
  category?: string;
  company?: string;
  difficulty?: string;
  search?: string;
  testId?: string;
  page?: number;
  limit?: number;
  userId?: string;
}): Promise<{ total: number; questions: MCQQuestion[] }> {
  if (filter.testId) {
    const test = testMap.get(filter.testId);
    if (test) {
      return {
        total: test.questions.length,
        questions: test.questions,
      };
    }
  }

  const target = filter.technology || filter.company || "General";
  const tests = await getTestsForTarget(target);
  if (tests.length > 0) {
    const primaryTest = tests[0];
    return {
      total: primaryTest.questions.length,
      questions: primaryTest.questions,
    };
  }

  const fallbackQuestions = generateTestQuestionsWithAntiRepetition(
    target.toLowerCase().replace(/[^a-z0-9]/g, "-"),
    filter.company ? "company" : "technology",
    target,
    1,
    filter.limit || 15
  );

  return {
    total: fallbackQuestions.length,
    questions: fallbackQuestions,
  };
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
    };
    userStatsMap.set(userId, stats);
  }
  return stats;
}

export async function submitAttempt(
  userId: string,
  data: { questionId: string; selectedIdx: number; timeTakenSeconds?: number }
): Promise<{ isCorrect: boolean; correctIdx: number; xpEarned: number }> {
  let isCorrect = false;
  let correctIdx = 0;
  let topicName = "General";

  for (const test of testMap.values()) {
    const found = test.questions.find((q) => q.id === data.questionId);
    if (found) {
      correctIdx = found.correctIdx;
      isCorrect = found.correctIdx === data.selectedIdx;
      topicName = found.technology || found.company || test.targetName || "General";
      break;
    }
  }

  // Update Real-Time User Stats
  const stats = getOrCreateUserStats(userId);
  stats.totalQuestions += 1;
  if (isCorrect) stats.totalCorrect += 1;
  stats.totalTimeSeconds += (data.timeTakenSeconds || 30);

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

  return {
    isCorrect,
    correctIdx,
    xpEarned: isCorrect ? 30 : 5,
  };
}

export async function toggleBookmark(userId: string, questionId: string): Promise<{ bookmarked: boolean }> {
  return { bookmarked: true };
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
