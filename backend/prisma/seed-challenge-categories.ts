import { PrismaClient } from "@prisma/user-client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = process.env.USER_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL || "";

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL must be set to run the challenge categories seed script");
}

const adapter = new PrismaPg(DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  {
    name: "Data Structures & Algorithms",
    slug: "dsa",
    description: "Arrays, trees, graphs, dynamic programming, sorting, and algorithm design",
    icon: "BinaryTree",
    gradient: "from-emerald-500 to-teal-500",
    color: "#10b981",
    sortOrder: 1,
  },
  {
    name: "Artificial Intelligence",
    slug: "artificial-intelligence",
    description: "Machine learning models, neural networks, NLP, and computer vision challenges",
    icon: "Brain",
    gradient: "from-purple-500 to-violet-500",
    color: "#a855f7",
    sortOrder: 2,
  },
  {
    name: "Web Development",
    slug: "web-development",
    description: "Frontend frameworks, backend APIs, fullstack apps, and web security",
    icon: "Globe",
    gradient: "from-blue-500 to-cyan-500",
    color: "#3b82f6",
    sortOrder: 3,
  },
  {
    name: "Cybersecurity",
    slug: "cybersecurity",
    description: "Encryption, penetration testing, network security, and vulnerability analysis",
    icon: "Shield",
    gradient: "from-rose-500 to-red-500",
    color: "#f43f5e",
    sortOrder: 4,
  },
  {
    name: "Cloud & DevOps",
    slug: "cloud-devops",
    description: "AWS, Docker, Kubernetes, CI/CD pipelines, and infrastructure as code",
    icon: "Cloud",
    gradient: "from-sky-500 to-indigo-500",
    color: "#0ea5e9",
    sortOrder: 5,
  },
  {
    name: "Programming Languages",
    slug: "programming-languages",
    description: "Master Python, C++, Java, JavaScript, Go, and Rust with hands-on challenges",
    icon: "Code2",
    gradient: "from-amber-500 to-orange-500",
    color: "#f59e0b",
    sortOrder: 6,
  },
  {
    name: "Databases",
    slug: "databases",
    description: "SQL queries, NoSQL design, optimization, indexing, and database architecture",
    icon: "Database",
    gradient: "from-teal-500 to-emerald-500",
    color: "#14b8a6",
    sortOrder: 7,
  },
  {
    name: "System Design",
    slug: "system-design",
    description: "Architecture patterns, scalability, distributed systems, and design trade-offs",
    icon: "Layers",
    gradient: "from-violet-500 to-purple-500",
    color: "#8b5cf6",
    sortOrder: 8,
  },
  {
    name: "Mobile Development",
    slug: "mobile-development",
    description: "iOS, Android, React Native, Flutter, and cross-platform app development",
    icon: "Smartphone",
    gradient: "from-orange-500 to-pink-500",
    color: "#f97316",
    sortOrder: 9,
  },
  {
    name: "Data Science",
    slug: "data-science",
    description: "Statistics, data visualization, pandas, NumPy, and exploratory data analysis",
    icon: "BarChart3",
    gradient: "from-cyan-500 to-blue-500",
    color: "#06b6d4",
    sortOrder: 10,
  },
];

const DSA_CHALLENGES = [
  {
    slug: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    points: 100,
    topics: ["Arrays", "Hash Map"],
    description:
      "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\n### Example\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\n```\n\n### Constraints\n- `2 <= nums.length <= 10^4`\n- `-10^9 <= nums[i] <= 10^9`\n- `-10^9 <= target <= 10^9`",
    testCases: JSON.stringify([
      { input: "[2,7,11,15], 9", expected: "[0,1]" },
      { input: "[3,2,4], 6", expected: "[1,2]" },
      { input: "[3,3], 6", expected: "[0,1]" },
    ]),
  },
  {
    slug: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    points: 120,
    topics: ["Stack", "String"],
    description:
      "Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n### Example\n```\nInput: s = \"()\"\nOutput: true\n```",
    testCases: JSON.stringify([
      { input: "\"()\"", expected: "true" },
      { input: "\"()[]{}\"", expected: "true" },
      { input: "\"(]\"", expected: "false" },
    ]),
  },
  {
    slug: "reverse-linked-list",
    title: "Reverse Linked List",
    difficulty: "Easy",
    points: 100,
    topics: ["Linked List", "Recursion"],
    description:
      "Given the `head` of a singly linked list, reverse the list, and return the reversed list.\n\n### Example\n```\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n```",
    testCases: JSON.stringify([
      { input: "[1,2,3,4,5]", expected: "[5,4,3,2,1]" },
      { input: "[1,2]", expected: "[2,1]" },
      { input: "[]", expected: "[]" },
    ]),
  },
  {
    slug: "binary-search",
    title: "Binary Search",
    difficulty: "Easy",
    points: 100,
    topics: ["Array", "Binary Search"],
    description:
      "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.\n\n### Example\n```\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4\n```",
    testCases: JSON.stringify([
      { input: "[-1,0,3,5,9,12], 9", expected: "4" },
      { input: "[-1,0,3,5,9,12], 2", expected: "-1" },
    ]),
  },
  {
    slug: "maximum-subarray",
    title: "Maximum Subarray",
    difficulty: "Medium",
    points: 250,
    topics: ["Array", "Dynamic Programming", "Divide and Conquer"],
    description:
      "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\n### Example\n```\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6\nExplanation: The subarray [4,-1,2,1] has the largest sum 6.\n```",
    testCases: JSON.stringify([
      { input: "[-2,1,-3,4,-1,2,1,-5,4]", expected: "6" },
      { input: "[1]", expected: "1" },
      { input: "[5,4,-1,7,8]", expected: "23" },
    ]),
  },
  {
    slug: "merge-two-sorted-lists",
    title: "Merge Two Sorted Lists",
    difficulty: "Easy",
    points: 100,
    topics: ["Linked List", "Recursion"],
    description:
      "You are given the heads of two sorted linked lists `list1` and `list2`. Merge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\n### Example\n```\nInput: list1 = [1,2,4], list2 = [1,3,4]\nOutput: [1,1,2,3,4,4]\n```",
    testCases: JSON.stringify([
      { input: "[1,2,4], [1,3,4]", expected: "[1,1,2,3,4,4]" },
      { input: "[], []", expected: "[]" },
      { input: "[], [0]", expected: "[0]" },
    ]),
  },
  {
    slug: "best-time-to-buy-and-sell-stock",
    title: "Best Time to Buy and Sell Stock",
    difficulty: "Easy",
    points: 150,
    topics: ["Array", "Dynamic Programming"],
    description:
      "You are given an array `prices` where `prices[i]` is the price of a given stock on the `ith` day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock.\n\nReturn the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return `0`.\n\n### Example\n```\nInput: prices = [7,1,5,3,6,4]\nOutput: 5\n```",
    testCases: JSON.stringify([
      { input: "[7,1,5,3,6,4]", expected: "5" },
      { input: "[7,6,4,3,1]", expected: "0" },
    ]),
  },
  {
    slug: "lru-cache",
    title: "LRU Cache",
    difficulty: "Medium",
    points: 500,
    topics: ["Hash Map", "Linked List", "Design"],
    description:
      "Design a data structure that follows the constraints of a **Least Recently Used (LRU) cache**.\n\nImplement the `LRUCache` class with `get(key)` and `put(key, value)` methods, both operating in `O(1)` average time complexity.\n\n### Constraints\n- `1 <= capacity <= 3000`\n- `0 <= key <= 10^4`\n- `0 <= value <= 10^5`\n- At most `2 * 10^5` calls to `get` and `put`",
    testCases: JSON.stringify([
      { input: "LRUCache(2), put(1,1), put(2,2), get(1), put(3,3), get(2)", expected: "1, -1" },
    ]),
  },
  {
    slug: "word-break",
    title: "Word Break",
    difficulty: "Medium",
    points: 400,
    topics: ["Dynamic Programming", "String", "Hash Table"],
    description:
      "Given a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words.\n\n### Example\n```\nInput: s = \"leetcode\", wordDict = [\"leet\",\"code\"]\nOutput: true\n```",
    testCases: JSON.stringify([
      { input: "\"leetcode\", [\"leet\",\"code\"]", expected: "true" },
      { input: "\"applepenapple\", [\"apple\",\"pen\"]", expected: "true" },
      { input: "\"catsandog\", [\"cats\",\"dog\",\"sand\",\"and\",\"cat\"]", expected: "false" },
    ]),
  },
  {
    slug: "merge-k-sorted-lists",
    title: "Merge K Sorted Lists",
    difficulty: "Hard",
    points: 800,
    topics: ["Heap", "Linked List", "Divide and Conquer"],
    description:
      "You are given an array of `k` linked-lists `lists`, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.\n\n### Example\n```\nInput: lists = [[1,4,5],[1,3,4],[2,6]]\nOutput: [1,1,2,3,4,4,5,6]\n```",
    testCases: JSON.stringify([
      { input: "[[1,4,5],[1,3,4],[2,6]]", expected: "[1,1,2,3,4,4,5,6]" },
      { input: "[]", expected: "[]" },
      { input: "[[]]", expected: "[]" },
    ]),
  },
  {
    slug: "trapping-rain-water",
    title: "Trapping Rain Water",
    difficulty: "Hard",
    points: 1000,
    topics: ["Array", "Two Pointers", "Stack", "Dynamic Programming"],
    description:
      "Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.\n\n### Example\n```\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6\n```",
    testCases: JSON.stringify([
      { input: "[0,1,0,2,1,0,1,3,2,1,2,1]", expected: "6" },
      { input: "[4,2,0,3,2,5]", expected: "9" },
    ]),
  },
  {
    slug: "alien-dictionary",
    title: "Alien Dictionary",
    difficulty: "Hard",
    points: 900,
    topics: ["Hash Table", "Graph", "Topological Sort"],
    description:
      "There is a new alien language that uses the English alphabet. However, the order among the letters is unknown to you. You are given a list of non-empty strings `words` from the dictionary, sorted lexicographically. Derive the order of letters in this language.\n\n### Example\n```\nInput: words = [\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]\nOutput: \"wertf\"\n```",
    testCases: JSON.stringify([
      { input: "[\"wrt\",\"wrf\",\"er\",\"ett\",\"rftt\"]", expected: "\"wertf\"" },
      { input: "[\"z\",\"x\"]", expected: "\"zx\"" },
    ]),
  },
];

const OTHER_CATEGORY_CHALLENGES: Record<string, Array<{ slug: string; title: string; difficulty: string; points: number; topics: string[]; description: string }>> = {
  "artificial-intelligence": [
    { slug: "linear-regression", title: "Implement Linear Regression", difficulty: "Medium", points: 300, topics: ["ML", "Regression"], description: "Implement a simple linear regression model from scratch using gradient descent. Given a dataset of (x, y) pairs, find the best-fit line." },
    { slug: "neural-network", title: "Build a Neural Network", difficulty: "Hard", points: 800, topics: ["Deep Learning", "Neural Networks"], description: "Build a feedforward neural network with at least 2 hidden layers. Implement forward propagation and backpropagation from scratch." },
    { slug: "decision-tree", title: "Decision Tree Classifier", difficulty: "Medium", points: 400, topics: ["ML", "Classification"], description: "Implement a decision tree classifier using information gain (entropy) for splitting. Support Gini impurity as well." },
    { slug: "knn-classifier", title: "K-Nearest Neighbors", difficulty: "Easy", points: 200, topics: ["ML", "Classification"], description: "Implement the KNN algorithm. Given training data and a test point, classify it based on the k nearest neighbors." },
    { slug: "image-classifier", title: "CNN Image Classifier", difficulty: "Hard", points: 1000, topics: ["Deep Learning", "Computer Vision"], description: "Build a convolutional neural network for image classification on CIFAR-10. Implement conv layers, pooling, and fully connected layers." },
  ],
  "web-development": [
    { slug: "rest-api", title: "Build a REST API", difficulty: "Easy", points: 200, topics: ["Backend", "Node.js"], description: "Create a RESTful API with CRUD operations for a book management system. Include proper error handling and validation." },
    { slug: "real-time-chat", title: "Real-time Chat App", difficulty: "Medium", points: 500, topics: ["WebSocket", "Fullstack"], description: "Build a real-time chat application using WebSockets. Support multiple rooms, typing indicators, and message history." },
    { slug: "auth-system", title: "Authentication System", difficulty: "Medium", points: 400, topics: ["Security", "Backend"], description: "Implement a complete auth system with JWT tokens, refresh tokens, password hashing, and role-based access control." },
    { slug: "ssr-framework", title: "Server-Side Rendering", difficulty: "Hard", points: 700, topics: ["Frontend", "React"], description: "Build a simple SSR framework. Server-render React components, hydrate on the client, and handle routing." },
    { slug: "ecommerce-checkout", title: "E-commerce Checkout Flow", difficulty: "Hard", points: 800, topics: ["Fullstack", "Payment"], description: "Implement a complete checkout flow: cart management, payment integration, order processing, and email notifications." },
  ],
  "cybersecurity": [
    { slug: "caesar-cipher", title: "Caesar Cipher Encoder/Decoder", difficulty: "Easy", points: 100, topics: ["Cryptography", "String"], description: "Implement a Caesar cipher that can both encrypt and decrypt messages with a configurable shift value." },
    { slug: "password-cracker", title: "Password Strength Analyzer", difficulty: "Medium", points: 300, topics: ["Security", "Hashing"], description: "Build a password strength analyzer that checks entropy, common patterns, dictionary words, and estimates crack time." },
    { slug: "sql-injection", title: "SQL Injection Detector", difficulty: "Medium", points: 400, topics: ["Web Security", "SQL"], description: "Build a middleware that detects and prevents SQL injection attacks in user input using pattern matching and anomaly detection." },
    { slug: "network-scanner", title: "Network Port Scanner", difficulty: "Hard", points: 600, topics: ["Networking", "Security"], description: "Implement a concurrent port scanner that discovers open ports on a target host. Include service detection and banner grabbing." },
    { slug: "vuln-analyzer", title: "Vulnerability Scanner", difficulty: "Hard", points: 900, topics: ["Penetration Testing", "Security"], description: "Build a vulnerability scanner that checks web applications for common security issues: XSS, CSRF, insecure headers, and more." },
  ],
  "cloud-devops": [
    { slug: "dockerfile", title: "Write a Dockerfile", difficulty: "Easy", points: 150, topics: ["Docker", "Containers"], description: "Create an optimized multi-stage Dockerfile for a Node.js application. Minimize image size and follow security best practices." },
    { slug: "ci-cd-pipeline", title: "CI/CD Pipeline", difficulty: "Medium", points: 400, topics: ["GitHub Actions", "DevOps"], description: "Set up a complete CI/CD pipeline with testing, linting, building, and deployment stages using GitHub Actions." },
    { slug: "k8s-deployment", title: "Kubernetes Deployment", difficulty: "Hard", points: 700, topics: ["Kubernetes", "Cloud"], description: "Create Kubernetes manifests for deploying a microservices application with services, ingress, ConfigMaps, and horizontal pod autoscaling." },
    { slug: "terraform-infra", title: "Infrastructure as Code", difficulty: "Hard", points: 800, topics: ["Terraform", "AWS"], description: "Write Terraform code to provision a production-grade AWS infrastructure: VPC, EC2, RDS, S3, and CloudFront distribution." },
    { slug: "monitoring-stack", title: "Monitoring & Alerting", difficulty: "Medium", points: 350, topics: ["Prometheus", "Grafana"], description: "Set up a monitoring stack with Prometheus for metrics collection, Grafana for visualization, and Alertmanager for notifications." },
  ],
  "programming-languages": [
    { slug: "memory-allocator", title: "Custom Memory Allocator", difficulty: "Hard", points: 900, topics: ["C++", "Memory Management"], description: "Implement a custom memory allocator with malloc and free equivalents. Use a free list with first-fit allocation strategy." },
    { slug: "json-parser", title: "JSON Parser", difficulty: "Medium", points: 500, topics: ["Python", "Parsing"], description: "Build a JSON parser from scratch that can parse strings, numbers, booleans, null, arrays, and nested objects." },
    { slug: "async-runtime", title: "Build an Async Runtime", difficulty: "Hard", points: 1000, topics: ["Rust", "Async"], description: "Implement a basic async/await runtime in Rust with a task scheduler, waker, and epoll-based I/O reactor." },
    { slug: "regex-engine", title: "Regular Expression Engine", difficulty: "Hard", points: 800, topics: ["Go", "Compilers"], description: "Implement a regex engine that supports ., *, +, ?, [], (), and alternation. Convert regex to NFA, then simulate." },
    { slug: "type-checker", title: "Simple Type Checker", difficulty: "Medium", points: 600, topics: ["TypeScript", "Compilers"], description: "Implement a basic type checker for a simple expression language with integers, booleans, functions, and type inference." },
  ],
  "databases": [
    { slug: "sql-joins", title: "SQL Join Queries", difficulty: "Easy", points: 100, topics: ["SQL", "Joins"], description: "Write complex SQL queries using INNER, LEFT, RIGHT, FULL joins, subqueries, and window functions to solve 10 real-world scenarios." },
    { slug: "query-optimizer", title: "Query Performance Tuning", difficulty: "Medium", points: 400, topics: ["SQL", "Optimization"], description: "Given slow queries, analyze execution plans, create appropriate indexes, rewrite queries, and demonstrate measurable improvements." },
    { slug: "document-db", title: "Document Database Design", difficulty: "Medium", points: 350, topics: ["NoSQL", "MongoDB"], description: "Design a schema for a social media application using MongoDB. Handle embedding vs referencing, indexing, and aggregation pipelines." },
    { slug: "connection-pool", title: "Database Connection Pool", difficulty: "Hard", points: 700, topics: ["System Design", "Databases"], description: "Implement a thread-safe database connection pool with lazy initialization, max connections, idle timeout, and health checks." },
    { slug: "replication", title: "Database Replication", difficulty: "Hard", points: 900, topics: ["Distributed Systems", "Databases"], description: "Implement a leader-follower replication system with write-ahead logging, conflict resolution, and automatic failover." },
  ],
  "system-design": [
    { slug: "url-shortener", title: "URL Shortener", difficulty: "Medium", points: 300, topics: ["Distributed Systems", "Hashing"], description: "Design and implement a URL shortening service like bit.ly. Handle encoding, redirects, analytics, and high availability." },
    { slug: "rate-limiter", title: "Distributed Rate Limiter", difficulty: "Medium", points: 500, topics: ["Design", "Concurrency"], description: "Implement a distributed rate limiter using the token bucket algorithm. Support multiple nodes with Redis-backed synchronization." },
    { slug: "message-queue", title: "Message Queue", difficulty: "Hard", points: 800, topics: ["Distributed Systems", "Messaging"], description: "Build a simple message queue with topic-based routing, consumer groups, message persistence, and at-least-once delivery." },
    { slug: "consistent-hashing", title: "Consistent Hashing", difficulty: "Hard", points: 700, topics: ["Distributed Systems", "Hashing"], description: "Implement consistent hashing with virtual nodes for distributed cache. Demonstrate minimal key redistribution when nodes join/leave." },
    { slug: "web-crawler", title: "Web Crawler", difficulty: "Medium", points: 400, topics: ["System Design", "Networking"], description: "Build a distributed web crawler with BFS/DFS traversal, politeness policies, URL deduplication, and priority scheduling." },
  ],
  "mobile-development": [
    { slug: "todo-app", title: "Cross-Platform Todo App", difficulty: "Easy", points: 200, topics: ["React Native", "Mobile"], description: "Build a todo app with React Native or Flutter. Include CRUD operations, categories, priority levels, and local storage." },
    { slug: "camera-filter", title: "Real-time Camera Filter", difficulty: "Medium", points: 500, topics: ["Flutter", "Camera"], description: "Implement real-time camera filters using platform-specific APIs. Apply GPU-accelerated filters for brightness, contrast, and effects." },
    { slug: "offline-sync", title: "Offline Data Sync", difficulty: "Hard", points: 700, topics: ["Mobile", "Architecture"], description: "Implement an offline-first data synchronization system with conflict resolution, delta sync, and queue-based retry." },
    { slug: "push-notifications", title: "Push Notification System", difficulty: "Medium", points: 350, topics: ["Mobile", "Backend"], description: "Implement push notifications for both iOS and Android. Handle device token management, notification scheduling, and deep linking." },
    { slug: "payment-integration", title: "In-App Payments", difficulty: "Hard", points: 800, topics: ["Mobile", "Payment"], description: "Integrate in-app purchases and subscription billing for both iOS (StoreKit) and Android (Play Billing Library)." },
  ],
  "data-science": [
    { slug: "data-cleaning", title: "Data Cleaning Pipeline", difficulty: "Easy", points: 150, topics: ["Python", "Pandas"], description: "Build a data cleaning pipeline that handles missing values, outliers, duplicate records, and type conversions for a messy dataset." },
    { slug: "eda-dashboard", title: "Exploratory Data Analysis", difficulty: "Medium", points: 300, topics: ["Statistics", "Visualization"], description: "Perform comprehensive EDA on a dataset. Generate statistical summaries, distribution plots, correlation matrices, and outlier detection." },
    { slug: "feature-engineering", title: "Feature Engineering", difficulty: "Medium", points: 400, topics: ["ML", "Data Preprocessing"], description: "Implement feature engineering techniques: encoding categorical variables, scaling, polynomial features, and feature selection using mutual information." },
    { slug: "time-series", title: "Time Series Forecasting", difficulty: "Hard", points: 700, topics: ["Time Series", "ML"], description: "Build a time series forecasting model using ARIMA and Prophet. Handle seasonality, trend decomposition, and holiday effects." },
    { slug: "ab-testing", title: "A/B Test Analyzer", difficulty: "Medium", points: 350, topics: ["Statistics", "Experimentation"], description: "Implement a statistical A/B test analyzer with hypothesis testing, confidence intervals, power analysis, and Bayesian methods." },
  ],
};

async function main() {
  console.log("Seeding challenge categories...");

  for (const cat of CATEGORIES) {
    const category = await prisma.challengeCategory.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log(`  Category: ${category.name} (${category.id})`);
  }

  console.log("\nSeeding DSA challenges...");
  for (const ch of DSA_CHALLENGES) {
    const dsaCategory = await prisma.challengeCategory.findUnique({ where: { slug: "dsa" } });
    if (!dsaCategory) continue;

    await prisma.challenge.upsert({
      where: { slug: ch.slug },
      update: {},
      create: {
        categoryId: dsaCategory.id,
        slug: ch.slug,
        title: ch.title,
        difficulty: ch.difficulty,
        points: ch.points,
        description: ch.description,
        topics: ch.topics,
        testCases: ch.testCases ? JSON.parse(ch.testCases) : undefined,
      },
    });
  }
  console.log(`  Seeded ${DSA_CHALLENGES.length} DSA challenges`);

  for (const [catSlug, challenges] of Object.entries(OTHER_CATEGORY_CHALLENGES)) {
    const category = await prisma.challengeCategory.findUnique({ where: { slug: catSlug } });
    if (!category) continue;

    for (const ch of challenges) {
      await prisma.challenge.upsert({
        where: { slug: ch.slug },
        update: {},
        create: {
          categoryId: category.id,
          slug: ch.slug,
          title: ch.title,
          difficulty: ch.difficulty,
          points: ch.points,
          description: ch.description,
          topics: ch.topics,
        },
      });
    }
    console.log(`  Seeded ${challenges.length} challenges for ${category.name}`);
  }

  console.log("\nDone! All categories and challenges seeded.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
