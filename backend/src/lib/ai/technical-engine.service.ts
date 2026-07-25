import { generateJSON, generateText, MODELS } from "./openrouter";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TechnicalTopic =
  | "dsa" | "backend" | "frontend" | "fullstack"
  | "python" | "java" | "cpp" | "javascript"
  | "react" | "node" | "sql" | "database-design"
  | "rest-apis" | "system-design-basics" | "oop"
  | "operating-systems" | "dbms" | "computer-networks"
  | "machine-learning" | "ai-engineering" | "custom";

export type CodingLanguage = "javascript" | "python" | "java" | "cpp" | "typescript";

export type InterviewMode = "voice" | "coding" | "voice+coding";

export interface TechnicalConfig {
  topic: TechnicalTopic;
  role: string;
  company: string;
  difficulty: "easy" | "medium" | "hard";
  experienceLevel: string;
  durationMinutes: number;
  language: string;
  codingLanguage: CodingLanguage;
  mode: InterviewMode;
  aiVoiceEnabled: boolean;
  voiceGender: "male" | "female" | "neutral";
  voiceSpeed: number;
  voicePitch: number;
  resumeAware: boolean;
  customInstructions: string;
}

export interface TechnicalQuestion {
  question: string;
  category: string;
  difficulty: string;
  isCodingChallenge: boolean;
  codingProblem?: {
    title: string;
    description: string;
    examples: Array<{ input: string; output: string; explanation: string }>;
    constraints: string[];
    starterCode: string;
    testCases: Array<{ input: string; expectedOutput: string }>;
  };
  expectedTopics: string[];
  followUpHint: string;
  timeEstimate: string;
  tips: string[];
}

export interface TechnicalEvaluation {
  overallScore: number;
  technicalDepth: number;
  codeQuality: number;
  problemSolving: number;
  communication: number;
  timeComplexity: string;
  spaceComplexity: string;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  recommendedTopics: string[];
  hiringRecommendation: string;
  summary: string;
  answerBreakdowns: Array<{
    questionNumber: number;
    question: string;
    answer: string;
    score: number;
    analysis: string;
    tags: string[];
  }>;
}

export interface Message {
  role: string;
  content: string;
}

// ─── Topic Configurations ───────────────────────────────────────────────────

const TOPIC_FOCUS: Record<TechnicalTopic, string> = {
  dsa: "Focus on data structures (arrays, linked lists, trees, graphs, hash maps, stacks, queues, heaps) and algorithms (sorting, searching, dynamic programming, greedy, backtracking, graph algorithms). Ask about time/space complexity analysis, optimal solutions, and trade-offs.",
  backend: "Focus on server-side development: REST APIs, database design, caching, authentication, message queues, microservices, scalability patterns, deployment, and monitoring.",
  frontend: "Focus on UI development: DOM manipulation, browser rendering pipeline, CSS layouts, JavaScript engine internals, frameworks (React/Vue/Angular), performance optimization, accessibility, and responsive design.",
  fullstack: "Cover both frontend and backend topics. Ask about system architecture, API design, database modeling, UI/UX decisions, deployment strategies, and how frontend and backend communicate.",
  python: "Focus on Python-specific topics: data types, generators, decorators, context managers, GIL, async/await, type hints, testing, packaging, and Pythonic patterns.",
  java: "Focus on Java-specific topics: OOP, generics, collections framework, threading, JVM internals, garbage collection, streams, and design patterns.",
  cpp: "Focus on C++ specific topics: memory management, pointers, references, RAII, STL, templates, move semantics, smart pointers, and undefined behavior.",
  javascript: "Focus on JS internals: closures, prototypes, event loop, promises, async/await, modules, DOM API, TypeScript, and engine optimizations.",
  react: "Focus on React: hooks, state management, rendering optimization, component patterns, Context API, Suspense, Server Components, and React ecosystem.",
  node: "Focus on Node.js: event loop, streams, modules, Express/Fastify, middleware, authentication, file system, child processes, and clustering.",
  sql: "Focus on SQL: joins, subqueries, window functions, indexing strategies, query optimization, stored procedures, triggers, and transaction management.",
  "database-design": "Focus on database design: normalization, ER diagrams, schema design, indexing, partitioning, ACID properties, CAP theorem, and SQL vs NoSQL trade-offs.",
  "rest-apis": "Focus on REST API design: HTTP methods, status codes, authentication (JWT, OAuth), rate limiting, versioning, HATEOAS, and API documentation.",
  "system-design-basics": "Focus on system design fundamentals: load balancing, caching, CDN, database sharding, message queues, and high-level architecture patterns.",
  oop: "Focus on OOP principles: encapsulation, inheritance, polymorphism, abstraction, SOLID principles, design patterns, and composition over inheritance.",
  "operating-systems": "Focus on OS concepts: process management, threading, synchronization, memory management, virtual memory, file systems, I/O, and deadlocks.",
  dbms: "Focus on DBMS: relational model, normalization, indexing, query processing, transaction management, concurrency control, and recovery.",
  "computer-networks": "Focus on networking: OSI model, TCP/IP, HTTP/HTTPS, DNS, sockets, load balancing, firewalls, and network security.",
  "machine-learning": "Focus on ML: supervised/unsupervised learning, model evaluation, feature engineering, neural networks, NLP basics, and MLOps concepts.",
  "ai-engineering": "Focus on AI engineering: LLMs, RAG, vector databases, prompt engineering, fine-tuning, AI agents, and responsible AI practices.",
  custom: "Adapt questions based on the candidate's background and the specific role requirements.",
};

const COMPANY_FOCUS: Record<string, string> = {
  google: "Google-style questions: algorithmic depth, large-scale system design, coding efficiency, and Googliness attributes.",
  amazon: "Amazon-style: Leadership Principles integration, scalability focus, customer obsession, and data-driven decisions.",
  microsoft: "Microsoft-style: growth mindset, collaborative problem-solving, broad technical knowledge, and inclusive design.",
  meta: "Meta-style: rapid prototyping, A/B testing mindset, building for billions, and impact-driven development.",
  apple: "Apple-style: attention to detail, performance optimization, privacy-first design, and product thinking.",
  netflix: "Netflix-style: culture of freedom and responsibility, high-performance engineering, and streaming-scale systems.",
  uber: "Uber-style: real-time systems, geolocation, marketplace design, and high-availability requirements.",
  adobe: "Adobe-style: creative tooling, document processing, cloud services, and developer ecosystem.",
  salesforce: "Salesforce-style: CRM architecture, multi-tenancy, enterprise integration, and platform design.",
  tcs: "TCS-style: fundamental CS concepts, aptitude, communication skills, and enterprise IT understanding.",
  infosys: "Infosys-style: foundational knowledge, process orientation, SDLC understanding, and client focus.",
  accenture: "Accenture-style: consulting mindset, analytics, business process understanding, and delivery excellence.",
  capgemini: "Capgemini-style: business technology, delivery methodology, and enterprise solutions.",
};

// ─── Question Generation ────────────────────────────────────────────────────

function computeAnswerQuality(history: Message[]): number {
  const answers = history.filter((m) => m.role === "candidate");
  if (answers.length === 0) return 50;
  let total = 0;
  for (const a of answers) {
    const len = a.content.trim().length;
    if (len < 20) total += 25;
    else if (len < 60) total += 45;
    else if (len < 150) total += 60;
    else if (len < 400) total += 72;
    else total += 80;
  }
  return Math.round(total / answers.length);
}

const FALLBACK_QUESTION: TechnicalQuestion = {
  question: "Explain the difference between a stack and a queue, and give a real-world example of each.",
  category: "data-structures",
  difficulty: "easy",
  isCodingChallenge: false,
  expectedTopics: ["stack", "queue", "LIFO", "FIFO", "use cases"],
  followUpHint: "Ask about time complexity of operations and when to prefer one over the other",
  timeEstimate: "3 minutes",
  tips: ["Listen for correct LIFO/FIFO explanation", "Note if they give practical examples"],
};

export async function generateTechnicalQuestion(config: {
  topic: TechnicalTopic;
  role: string;
  company: string;
  difficulty: string;
  experienceLevel: string;
  codingLanguage: CodingLanguage;
  mode: InterviewMode;
  history: Message[];
  resumeContext: string;
  customInstructions: string;
  questionNumber: number;
  totalQuestions: number;
  durationMinutes: number;
}): Promise<TechnicalQuestion> {
  const { topic, role, company, difficulty, experienceLevel, codingLanguage, mode, history, resumeContext, customInstructions, questionNumber, totalQuestions, durationMinutes } = config;

  const avgQuality = computeAnswerQuality(history);
  const typeFocus = TOPIC_FOCUS[topic] || TOPIC_FOCUS.dsa;
  const companySpecific = COMPANY_FOCUS[company.toLowerCase()] || "";

  let dynamicDifficulty = difficulty;
  if (questionNumber > 2) {
    if (avgQuality >= 75) {
      const escalateMap: Record<string, string> = { easy: "medium", medium: "hard", hard: "hard" };
      dynamicDifficulty = escalateMap[difficulty] || difficulty;
    } else if (avgQuality <= 40) {
      const deescalateMap: Record<string, string> = { hard: "medium", medium: "easy", easy: "easy" };
      dynamicDifficulty = deescalateMap[difficulty] || difficulty;
    }
  }

  const shouldChallenge = avgQuality >= 70 && questionNumber >= 3;
  const isEarlyStage = questionNumber <= 2;
  const isLateStage = questionNumber >= totalQuestions - 2;
  const shouldIncludeCoding = mode === "coding" || mode === "voice+coding";
  // Deterministic coding challenge schedule: coding mode = always, voice+coding = every even question (2,4,6,...)
  const isCodingQuestion = mode === "coding" || (mode === "voice+coding" && questionNumber % 2 === 0);

  const conversationHistory = history
    .filter((m) => m.role === "interviewer" || m.role === "candidate")
    .map((m) => `[${m.role === "interviewer" ? "Interviewer" : "Candidate"}]: ${m.content}`)
    .join("\n\n");

  const resumeSection = resumeContext ? `\nCANDIDATE RESUME:\n${resumeContext}\n` : "";

  const systemPrompt = `You are a senior technical interviewer conducting a professional technical interview.

INTERVIEW CONTEXT:
- Topic: ${topic}
- Target Role: ${role}
- Target Company: ${company || "Not specified"}
- Experience Level: ${experienceLevel}
- Coding Language: ${codingLanguage}
- Mode: ${mode}
- Question ${questionNumber} of ${totalQuestions}

TOPIC FOCUS:
${typeFocus}
${companySpecific ? `\n${companySpecific}` : ""}

DIFFICULTY: ${dynamicDifficulty}
${isEarlyStage ? "Start with foundational questions to assess baseline." : ""}
${isLateStage ? "Ask a capstone question that tests holistic understanding." : ""}
${shouldChallenge ? "The candidate is performing well — present a CHALLENGE question." : ""}

CODING CHALLENGE INSTRUCTION:
${isCodingQuestion
  ? `THIS QUESTION MUST BE A CODING CHALLENGE. You MUST:
1. Set "isCodingChallenge" to true
2. Generate a complete coding problem in "codingProblem" with:
   - title: A short descriptive title
   - description: Clear problem statement (2-4 sentences)
   - examples: 2-3 input/output examples with explanation
   - constraints: 2-4 constraints (e.g., array size, value ranges)
   - starterCode: Working starter code skeleton in ${codingLanguage} (function signature + comments)
   - testCases: 2-3 test cases with input and expectedOutput
3. The "question" field MUST present the FULL problem statement and details (e.g., "Here is your coding challenge: [Title]. [Full Description]"). NEVER return a generic string like "Here is your problem" without including the full problem description in the "question" field itself.
The coding problem MUST test the topic: ${topic}
The problem difficulty should match: ${dynamicDifficulty}
DO NOT return null for codingProblem. This is REQUIRED.`
  : mode === "voice"
  ? `Do NOT generate coding challenges — this is a voice-only interview. Set "isCodingChallenge" to false and "codingProblem" to null.`
  : `This question should be a conceptual/theoretical question (not a coding challenge). Set "isCodingChallenge" to false and "codingProblem" to null. The next question will be a coding challenge.`
}

INTERVIEWER BEHAVIOR & INTERACTIVE EVALUATION:
- If there is previous candidate response in conversation history, start the "question" field with 1-2 brief conversational sentences evaluating their answer (e.g., acknowledging what was correct, pointing out missing trade-offs, or highlighting key strengths), then seamlessly transition to the next question or follow-up probe.
- Make the interview feel dynamic, interactive, and responsive to what the candidate actually said rather than blindly moving forward.

Return the question as JSON with EXACTLY this structure (no extra fields, no markdown):
{
  "question": "Brief evaluation of previous answer (if applicable) + FULL problem statement/description or interview question text",
  "category": "specific category within ${topic}",
  "difficulty": "${dynamicDifficulty}",
  "isCodingChallenge": ${isCodingQuestion ? "true" : "false"},
  "codingProblem": ${isCodingQuestion ? `{
    "title": "Problem title here",
    "description": "Full problem description here",
    "examples": [
      { "input": "example input", "output": "expected output", "explanation": "why" }
    ],
    "constraints": ["constraint 1", "constraint 2"],
    "starterCode": "starter code in ${codingLanguage}",
    "testCases": [
      { "input": "test input", "expectedOutput": "test output" }
    ]
  }` : "null"},
  "expectedTopics": ["topic1", "topic2"],
  "followUpHint": "What to probe if answer is surface-level",
  "timeEstimate": "expected answer time",
  "tips": ["tip for evaluating this answer"]
}`;

  const userPrompt = `Question ${questionNumber} of ${totalQuestions} | Topic: ${topic} | Difficulty: ${dynamicDifficulty} | ${isCodingQuestion ? "CODING CHALLENGE REQUIRED" : "Conceptual Question"}

${conversationHistory ? `Previous conversation history:\n${conversationHistory}` : "This is the first question."}

${resumeSection}

${conversationHistory ? "Evaluate the candidate's latest answer in history, then ask the next question or follow-up." : "Generate the first technical interview question."}
${isCodingQuestion ? `\nREMINDER: You MUST generate a complete coding problem with starter code in ${codingLanguage}. isCodingChallenge MUST be true. codingProblem MUST NOT be null.` : ""}`;

  try {
    const result = await generateJSON<TechnicalQuestion>(
      systemPrompt,
      userPrompt,
      { model: MODELS.BALANCED, temperature: 0.8, maxTokens: 4000 },
      FALLBACK_QUESTION
    );

    // Post-process: if this was supposed to be a coding challenge but AI failed to set it, fix it
    if (isCodingQuestion && !result.isCodingChallenge) {
      result.isCodingChallenge = true;
    }

    // Post-process: ensure question field contains complete problem description for coding challenges
    if (result.isCodingChallenge && result.codingProblem) {
      const qLower = (result.question || "").toLowerCase().trim();
      const isGeneric = qLower.length < 60 || qLower.startsWith("here is your problem") || qLower.startsWith("here's your problem") || qLower.startsWith("here is your coding challenge") || qLower.startsWith("here's your coding challenge");
      if (isGeneric || !result.question) {
        result.question = `Here is your coding challenge: **${result.codingProblem.title}**\n\n${result.codingProblem.description}\n\nPlease review the full problem statement, examples, and starter code in the editor workspace on the right to implement your solution!`;
      } else if (result.codingProblem.title && !result.question.includes(result.codingProblem.title)) {
        result.question = `${result.question}\n\n**Problem: ${result.codingProblem.title}**\n${result.codingProblem.description}`;
      }
    } else if (!result.question || result.question.trim().length < 20) {
      result.question = `Let's discuss ${topic}. Could you explain the core concepts and real-world trade-offs of ${topic}?`;
    }

    console.log(`[TechnicalEngine] Generated Q${questionNumber} for ${topic} (${result.category}) | coding=${result.isCodingChallenge}`);
    return result;
  } catch (error) {
    console.error(`[TechnicalEngine] Question generation failed:`, error);
    return FALLBACK_QUESTION;
  }
}


// ─── Follow-up Question Generation ──────────────────────────────────────────

export async function generateFollowUp(params: {
  originalQuestion: string;
  candidateAnswer: string;
  topic: TechnicalTopic;
  difficulty: string;
  codingLanguage: CodingLanguage;
  history: Message[];
}): Promise<string> {
  const { originalQuestion, candidateAnswer, topic, difficulty, codingLanguage, history } = params;

  const conversationHistory = history
    .slice(-4)
    .map((m) => `[${m.role === "interviewer" ? "Interviewer" : "Candidate"}]: ${m.content}`)
    .join("\n\n");

  const systemPrompt = `You are a senior technical interviewer. The candidate just answered a question. Generate a challenging follow-up question.

FOLLOW-UP STRATEGIES:
- "Why?" — probe deeper into reasoning
- "Can you optimize?" — push for better complexity
- "What if input size becomes 10M?" — test scalability thinking
- "How would you handle concurrency?" — test edge cases
- "Walk me through the time complexity" — test analytical skills

TOPIC: ${topic}
DIFFICULTY: ${difficulty}
CODING LANGUAGE: ${codingLanguage}

Generate ONE concise follow-up question (not a statement). Return as JSON:
{ "question": "the follow-up question" }`;

  const userPrompt = `Original question: ${originalQuestion}

Candidate's answer: ${candidateAnswer}

Recent conversation:
${conversationHistory}

Generate a challenging follow-up question.`;

  try {
    const result = await generateJSON<{ question: string }>(
      systemPrompt,
      userPrompt,
      { model: MODELS.FAST, temperature: 0.7, maxTokens: 500 },
      { question: "Can you elaborate on the time and space complexity of your approach?" }
    );
    return result.question;
  } catch {
    return "Can you walk me through the time and space complexity of your approach?";
  }
}

// ─── Code Review ────────────────────────────────────────────────────────────

export async function reviewCode(params: {
  code: string;
  language: CodingLanguage;
  problem: string;
  topic: TechnicalTopic;
  output: string;
  passed: boolean;
}): Promise<{
  score: number;
  analysis: string;
  timeComplexity: string;
  spaceComplexity: string;
  suggestions: string[];
  betterApproach: string;
}> {
  const { code, language, problem, topic, output, passed } = params;

  const systemPrompt = `You are a senior code reviewer evaluating a candidate's coding solution during a technical interview.

Evaluate the code for:
1. Correctness — does it solve the problem?
2. Time complexity — is it optimal?
3. Space complexity — can it be improved?
4. Code quality — readability, naming, structure
5. Edge cases — does it handle edge cases?

TOPIC: ${topic}
LANGUAGE: ${language}
PROBLEM: ${problem}
OUTPUT: ${output}
PASSED: ${passed}

Return as JSON:
{
  "score": number (0-100),
  "analysis": "detailed code review",
  "timeComplexity": "O(n) etc",
  "spaceComplexity": "O(1) etc",
  "suggestions": ["improvement1", "improvement2"],
  "betterApproach": "description of a better approach if applicable"
}`;

  try {
    const result = await generateJSON<{
      score: number;
      analysis: string;
      timeComplexity: string;
      spaceComplexity: string;
      suggestions: string[];
      betterApproach: string;
    }>(
      systemPrompt,
      `Review this code:\n\`\`\`${language}\n${code}\n\`\`\``,
      { model: MODELS.BALANCED, temperature: 0.3, maxTokens: 2000 },
      {
        score: passed ? 65 : 30,
        analysis: passed ? "Code runs and produces output." : "Code did not produce expected output.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        suggestions: ["Consider edge cases", "Add comments for clarity"],
        betterApproach: "Review the approach for optimal time complexity.",
      }
    );
    return result;
  } catch {
    return {
      score: passed ? 60 : 25,
      analysis: "Unable to generate detailed code review.",
      timeComplexity: "Unknown",
      spaceComplexity: "Unknown",
      suggestions: ["Review your approach", "Consider edge cases"],
      betterApproach: "Try to optimize your solution.",
    };
  }
}

// ─── Evaluation ─────────────────────────────────────────────────────────────

export async function generateTechnicalEvaluation(params: {
  role: string;
  company: string;
  topic: TechnicalTopic;
  difficulty: string;
  experienceLevel: string;
  codingLanguage: CodingLanguage;
  history: Message[];
  resumeContext: string;
  codeReviews?: Array<{ code: string; score: number; passed: boolean }>;
}): Promise<TechnicalEvaluation> {
  const { role, company, topic, difficulty, experienceLevel, codingLanguage, history, resumeContext, codeReviews } = params;

  const conversationHistory = history
    .filter((m) => m.role === "interviewer" || m.role === "candidate")
    .map((m) => `[${m.role === "interviewer" ? "Interviewer" : "Candidate"}]: ${m.content}`)
    .join("\n\n");

  const interviewerMessages = history.filter((m) => m.role === "interviewer");
  const candidateMessages = history.filter((m) => m.role === "candidate");
  const totalQuestions = interviewerMessages.length;
  const avgQuality = computeAnswerQuality(history);

  const codeReviewSection = codeReviews?.length
    ? `\nCODE REVIEWS:\n${codeReviews.map((cr, i) => `Challenge ${i + 1}: Score ${cr.score}/100, Passed: ${cr.passed}`).join("\n")}`
    : "";

  const resumeSection = resumeContext ? `\nCANDIDATE RESUME:\n${resumeContext}\n` : "";

  const systemPrompt = `You are a senior technical interviewer evaluating a candidate's technical interview performance.

EVALUATION CONTEXT:
- Topic: ${topic}
- Role: ${role}
- Company: ${company || "Not specified"}
- Difficulty: ${difficulty}
- Experience: ${experienceLevel}
- Coding Language: ${codingLanguage}
${resumeSection}
${codeReviewSection}

SCORING:
90-100: Exceptional
80-89: Strong
70-79: Adequate
60-69: Below average
40-59: Weak
0-39: Poor

Return as JSON:
{
  "overallScore": number,
  "technicalDepth": number,
  "codeQuality": number,
  "problemSolving": number,
  "communication": number,
  "timeComplexity": "average complexity of solutions",
  "spaceComplexity": "average space of solutions",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvements": ["improvement1", "improvement2"],
  "recommendedTopics": ["topic1", "topic2"],
  "hiringRecommendation": "strong_recommend|recommend|maybe|do_not_recommend",
  "summary": "2-3 sentence summary",
  "answerBreakdowns": [
    {
      "questionNumber": 1,
      "question": "the question",
      "answer": "the answer",
      "score": number,
      "analysis": "analysis",
      "tags": ["tag1"]
    }
  ]
}`;

  const fallbackBreakdowns = interviewerMessages.map((q, i) => ({
    questionNumber: i + 1,
    question: q.content,
    answer: candidateMessages[i]?.content || "No answer provided",
    score: Math.min(100, Math.max(20, avgQuality + Math.round((Math.random() - 0.5) * 20))),
    analysis: `Answer ${i + 1}: ${avgQuality >= 60 ? "Demonstrates adequate understanding." : "Could benefit from more depth."}`,
    tags: avgQuality >= 60 ? ["adequate"] : ["needs-improvement"],
  }));

  const fallback: TechnicalEvaluation = {
    overallScore: avgQuality,
    technicalDepth: Math.max(20, avgQuality - 5),
    codeQuality: codeReviews?.length ? Math.round(codeReviews.reduce((a, cr) => a + cr.score, 0) / codeReviews.length) : avgQuality,
    problemSolving: Math.max(20, avgQuality + 2),
    communication: Math.min(100, avgQuality + 5),
    timeComplexity: "Varies",
    spaceComplexity: "Varies",
    strengths: [`Completed ${totalQuestions} questions`, avgQuality >= 60 ? "Adequate response quality" : "Engaged with questions"],
    weaknesses: [avgQuality < 60 ? "Answers lacked depth" : "Could improve structure", "Some answers need more specifics"],
    improvements: ["Practice explaining complex concepts clearly", "Review time/space complexity analysis", "Study common patterns for " + topic],
    recommendedTopics: [`${topic} fundamentals`, "Common interview patterns"],
    hiringRecommendation: avgQuality >= 80 ? "strong_recommend" : avgQuality >= 60 ? "recommend" : avgQuality >= 40 ? "maybe" : "do_not_recommend",
    summary: `Candidate completed a ${topic} technical interview for a ${role} role${company ? ` at ${company}` : ""} with an overall score of ${avgQuality}/100.`,
    answerBreakdowns: fallbackBreakdowns,
  };

  try {
    const result = await generateJSON<TechnicalEvaluation>(
      systemPrompt,
      `Evaluate this technical interview.\n\nTRANSCRIPT:\n${conversationHistory}\n\n${totalQuestions} QUESTIONS ASKED.`,
      { model: MODELS.BALANCED, temperature: 0.4, maxTokens: 12000 },
      fallback
    );

    if (!result.answerBreakdowns || result.answerBreakdowns.length < totalQuestions) {
      const existing = result.answerBreakdowns || [];
      while (existing.length < totalQuestions) {
        const idx = existing.length;
        existing.push(fallbackBreakdowns[idx] || {
          questionNumber: idx + 1,
          question: `Question ${idx + 1}`,
          answer: "No answer",
          score: avgQuality,
          analysis: "Insufficient data.",
          tags: ["auto-generated"],
        });
      }
      result.answerBreakdowns = existing;
    }

    result.overallScore = Math.max(0, Math.min(100, Math.round(result.overallScore)));
    result.technicalDepth = Math.max(0, Math.min(100, Math.round(result.technicalDepth)));
    result.codeQuality = Math.max(0, Math.min(100, Math.round(result.codeQuality)));
    result.problemSolving = Math.max(0, Math.min(100, Math.round(result.problemSolving)));
    result.communication = Math.max(0, Math.min(100, Math.round(result.communication)));

    console.log(`[TechnicalEngine] Evaluation complete — Score: ${result.overallScore}/100`);
    return result;
  } catch (error) {
    console.error(`[TechnicalEngine] Evaluation failed, using fallback:`, error);
    return fallback;
  }
}
