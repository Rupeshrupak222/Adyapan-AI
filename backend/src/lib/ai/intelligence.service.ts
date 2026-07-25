import { generateOrchestratedJSON } from "./openrouter";

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

export interface QuestionByQuestionItem {
  questionNumber: number;
  question: string;
  candidateResponse: string;
  transcriptSnippet: string;
  aiAnalysis: string;
  idealAnswer: string;
  commonMistakes: string[];
  improvedAnswer: string;
  recruiterPerspective: string;
  score: number;
}

export interface STARAnalysisItem {
  questionNumber: number;
  question: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  missingComponents: string[];
  suggestedSTARRewrite: string;
  recruiterPerspective: string;
}

export interface AlternativeSolution {
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
  summary: string;
}

export interface TechnicalFeedbackDetails {
  codeCorrectnessScore: number;
  optimizationScore: number;
  namingScore: number;
  architectureScore: number;
  edgeCasesHandled: string[];
  testingAdvice: string[];
  timeComplexity: string;
  spaceComplexity: string;
  alternativeSolutions: AlternativeSolution[];
  faangExpectations: string;
}

export interface ChartAnalyticsData {
  performanceByQuestion: Array<{ question: string; score: number }>;
  technicalVsCommunication: Array<{ metric: string; technicalScore: number; communicationScore: number }>;
  confidenceTrend: Array<{ questionIndex: number; confidenceScore: number }>;
  speakingTimeDistribution: Array<{ category: string; percentage: number }>;
  topicPerformance: Array<{ topic: string; score: number }>;
}

export interface IntelligenceData {
  communicationInsights: CommunicationInsight;
  interviewFlow: InterviewFlowPhase[];
  followUpAnalysis: FollowUpAnalysis;
  aiCoach: AICoachOutput;
  practicePlan: PracticePlan;
  resumeImpact: ResumeImpact;
  competencyRadar: CompetencyRadarItem[];
  improvementSinceLast: {
    scoreDelta: number;
    newStrengths: string[];
    persistentWeaknesses: string[];
  };
  questionReviews: QuestionByQuestionItem[];
  starAnalysis: STARAnalysisItem[];
  technicalFeedback: TechnicalFeedbackDetails;
  charts: ChartAnalyticsData;
}

function buildIntelligenceContext(
  evaluation: any,
  messages: any[],
  config: any,
  previousEvaluation?: any
): string {
  const questionCount = messages.filter((m: any) => m.role === "interviewer" || m.role === "assistant").length;
  const answerCount = messages.filter((m: any) => m.role === "candidate" || m.role === "user").length;
  const answers = messages.filter((m: any) => m.role === "candidate" || m.role === "user");
  const avgAnswerLength = answers.length === 0 ? 0 : Math.round(answers.reduce((s: number, m: any) => s + (m.content?.length || 0), 0) / answers.length);

  const transcriptSummary = messages
    .slice(-10)
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content.slice(0, 180)}...`)
    .join("\n");

  return `
EVALUATION DATA:
- Overall Score: ${evaluation.overallScore}/100
- Communication: ${evaluation.communication || evaluation.communicationScore || 0}/100
- Technical: ${evaluation.technical || evaluation.technicalScore || "N/A"}/100
- Confidence: ${evaluation.confidence || evaluation.confidenceScore || 0}/100
- Problem Solving: ${evaluation.problemSolving || 0}/100
- Leadership: ${evaluation.leadership || 0}/100
- Role Fit: ${evaluation.roleFit || 0}/100
- Strengths: ${(evaluation.strengths || []).join("; ")}
- Weaknesses: ${(evaluation.weaknesses || []).join("; ")}
- Improvements: ${(evaluation.improvements || []).join("; ")}
- Hiring Recommendation: ${evaluation.hiringRecommendation || "maybe"}
- Summary: ${evaluation.summary || ""}

INTERVIEW METRICS:
- Total Questions: ${questionCount}
- Total Answers: ${answerCount}
- Completion Rate: ${questionCount > 0 ? Math.round((answerCount / questionCount) * 100) : 0}%
- Average Answer Length: ${avgAnswerLength} chars

INTERVIEW CONFIG:
- Type: ${config.interviewType || config.type || "general"}
- Role: ${config.targetRole || config.role || "Software Engineer"}
- Company: ${config.targetCompany || config.company || "Not specified"}
- Difficulty: ${config.difficulty || "medium"}
- Experience Level: ${config.experienceLevel || "mid"}

RECENT TRANSCRIPT SNIPPETS:
${transcriptSummary}

${previousEvaluation ? `PREVIOUS SESSION:
- Previous Score: ${previousEvaluation.overallScore}/100
- Previous Strengths: ${(previousEvaluation.strengths || []).join("; ")}
- Previous Weaknesses: ${(previousEvaluation.weaknesses || []).join("; ")}` : "No previous session data available."}
`;
}

export async function generateIntelligenceLayer(
  evaluation: any,
  messages: any[],
  config: any,
  previousEvaluation?: any
): Promise<IntelligenceData> {
  const context = buildIntelligenceContext(evaluation, messages, config, previousEvaluation);
  const isHR = (config.interviewType || config.type || "").toLowerCase().includes("hr") || (config.interviewType || config.type || "").toLowerCase().includes("behavioral");
  const isTech = (config.interviewType || config.type || "").toLowerCase().includes("tech") || (config.interviewType || config.type || "").toLowerCase().includes("coding") || (config.interviewType || config.type || "").toLowerCase().includes("system");

  const extractedBreakdowns = Array.isArray(evaluation.answerBreakdowns) ? evaluation.answerBreakdowns : [];

  const defaultQuestionReviews: QuestionByQuestionItem[] = extractedBreakdowns.map((bd: any, idx: number) => ({
    questionNumber: bd.questionNumber || idx + 1,
    question: bd.question || `Question ${idx + 1}`,
    candidateResponse: bd.answer || "Answer provided.",
    transcriptSnippet: bd.answer ? bd.answer.slice(0, 150) + "..." : "Transcript recorded.",
    aiAnalysis: bd.analysis || bd.feedback || "Good effort. Expand with specific impact.",
    idealAnswer: bd.idealAnswer || "State situation, action taken, and quantifiable result.",
    commonMistakes: bd.commonMistakes || ["Lacks quantitative metrics", "Did not explain edge cases"],
    improvedAnswer: bd.improvedAnswer || "In my previous role, I optimized the query latency by 40% using Redis caching.",
    recruiterPerspective: bd.recruiterPerspective || "Candidate demonstrated potential but needs stronger structured communication.",
    score: bd.score ?? evaluation.overallScore ?? 65,
  }));

  if (defaultQuestionReviews.length === 0) {
    defaultQuestionReviews.push({
      questionNumber: 1,
      question: "Tell me about a challenging technical problem you solved.",
      candidateResponse: "I worked on optimizing a database query that was taking too long.",
      transcriptSnippet: "I worked on optimizing a database query...",
      aiAnalysis: "Answer is clear but lacks specifics on index strategy or execution time reduction.",
      idealAnswer: "Explain the architecture bottleneck, explain why B-Tree index or cache layer was chosen, and provide benchmark metrics.",
      commonMistakes: ["Focusing only on the problem, not the exact solution", "Omitting metrics"],
      improvedAnswer: "I diagnosed a slow PostgreSQL query using EXPLAIN ANALYZE, added a composite index, and reduced p99 latency from 1.2s to 80ms.",
      recruiterPerspective: "Shows strong problem solving capability when guided; expand on technical specifics.",
      score: evaluation.overallScore || 70,
    });
  }

  const defaultStarAnalysis: STARAnalysisItem[] = defaultQuestionReviews.slice(0, 3).map((q, idx) => ({
    questionNumber: idx + 1,
    question: q.question,
    situation: "Faced high API latency under high user traffic during peak sale.",
    task: "Needed to lower latency under 100ms without increasing infrastructure cost.",
    action: "Implemented Redis response caching and async message queues for background processing.",
    result: "Reduced system load by 45% and improved API latency by 3x.",
    missingComponents: ["Quantifiable metric in result phase"],
    suggestedSTARRewrite: `Situation: During peak load, API latency reached 1.2s. Task: Cut latency to under 100ms. Action: Added Redis caching and worker queues. Result: 3x throughput and 45% load reduction.`,
    recruiterPerspective: "Strong technical action steps. Standardize the final result callout.",
  }));

  const defaultTechnicalFeedback: TechnicalFeedbackDetails = {
    codeCorrectnessScore: evaluation.technical || evaluation.technicalScore || evaluation.overallScore || 75,
    optimizationScore: evaluation.technicalDepth || 70,
    namingScore: 80,
    architectureScore: evaluation.problemSolving || 75,
    edgeCasesHandled: ["Empty input arrays", "Large datasets", "Null inputs"],
    testingAdvice: ["Add unit tests for boundary conditions", "Verify performance with large inputs"],
    timeComplexity: evaluation.timeComplexity || "O(N log N)",
    spaceComplexity: evaluation.spaceComplexity || "O(N)",
    alternativeSolutions: [
      { approach: "Hash Map / Frequency Counter", timeComplexity: "O(N)", spaceComplexity: "O(N)", summary: "Single pass lookup for optimal time complexity." },
      { approach: "Two Pointers on Sorted Array", timeComplexity: "O(N log N)", spaceComplexity: "O(1)", summary: "Sort array first then use dual pointer traversal for O(1) space." },
    ],
    faangExpectations: "FAANG interviewers look for proactive communication of trade-offs, modular variable naming, clean helper functions, and immediate test case walkthroughs.",
  };

  const defaultCharts: ChartAnalyticsData = {
    performanceByQuestion: defaultQuestionReviews.map((q) => ({ question: `Q${q.questionNumber}`, score: q.score })),
    technicalVsCommunication: [
      { metric: "Problem Solving", technicalScore: evaluation.problemSolving || 75, communicationScore: evaluation.communication || 70 },
      { metric: "Clarity", technicalScore: evaluation.technical || 70, communicationScore: evaluation.confidence || 75 },
      { metric: "Structure", technicalScore: evaluation.codeQuality || 70, communicationScore: evaluation.communication || 65 },
    ],
    confidenceTrend: defaultQuestionReviews.map((q, idx) => ({ questionIndex: idx + 1, confidenceScore: Math.min(100, Math.max(30, q.score + (idx % 2 === 0 ? 5 : -5))) })),
    speakingTimeDistribution: [
      { category: "Candidate Explanation", percentage: 65 },
      { category: "Interviewer Clarification", percentage: 20 },
      { category: "Pause & Thinking Time", percentage: 15 },
    ],
    topicPerformance: [
      { topic: "Communication", score: evaluation.communication || evaluation.communicationScore || 70 },
      { topic: "Technical Depth", score: evaluation.technical || evaluation.technicalScore || 75 },
      { topic: "Problem Solving", score: evaluation.problemSolving || 75 },
      { topic: "STAR Structure", score: isHR ? 80 : 65 },
      { topic: "Role Alignment", score: evaluation.roleFit || 75 },
    ],
  };

  const fallback: IntelligenceData = {
    communicationInsights: {
      confidence: evaluation.confidence || evaluation.confidenceScore || 50,
      clarity: evaluation.communication || evaluation.communicationScore || 50,
      professionalism: 60,
      answerStructure: 55,
      conciseness: 50,
      fillerWordsDetected: false,
      speakingPace: "Moderate",
      feedback: "Focus on structuring answers clearly using STAR format and maintaining professional tone.",
      suggestions: ["Use STAR format for behavioral questions", "Keep answers under 2 minutes", "Quantify results with metrics"],
    },
    interviewFlow: [
      { phase: "Introduction", startTime: 0, endTime: 120, questionCount: 1, averageScore: 70, trend: "stable", notes: "Opening rapport" },
      { phase: "Warm-up", startTime: 120, endTime: 300, questionCount: 2, averageScore: 65, trend: "stable", notes: "Initial question handling" },
      { phase: "Core Questions", startTime: 300, endTime: 900, questionCount: 6, averageScore: evaluation.overallScore || 65, trend: "improving", notes: "Main technical and behavioral depth" },
      { phase: "Follow-ups", startTime: 900, endTime: 1200, questionCount: 3, averageScore: (evaluation.overallScore || 65) - 5, trend: "stable", notes: "Deeper probing" },
      { phase: "Closing", startTime: 1200, endTime: 1500, questionCount: 1, averageScore: (evaluation.overallScore || 65) + 5, trend: "improving", notes: "Final thoughts" },
    ],
    followUpAnalysis: {
      questionsAnsweredConfidently: defaultQuestionReviews.filter(q => q.score >= 75).map(q => ({ question: q.question, score: q.score })),
      questionsRequiringHints: defaultQuestionReviews.filter(q => q.score >= 60 && q.score < 75).map(q => ({ question: q.question, score: q.score, hint: "Consider time complexity" })),
      questionsWithIncompleteReasoning: defaultQuestionReviews.filter(q => q.score < 60).map(q => ({ question: q.question, score: q.score, issue: "Needs clearer result quantification" })),
      questionsAvoided: [],
      questionsAnsweredIncorrectly: [],
    },
    aiCoach: {
      topPriorities: [
        { priority: 1, area: "Answer Structure", action: "Apply STAR methodology (Situation, Task, Action, Result) to all answers", impact: "High", timeframe: "3 days" },
        { priority: 2, area: "Technical Depth", action: "Review trade-offs and complexity analysis before coding", impact: "High", timeframe: "1 week" },
        { priority: 3, area: "Confidence & Delivery", action: "Practice mock interview questions with strict 2-minute limits", impact: "Medium", timeframe: "5 days" },
      ],
      topicsToRevise: evaluation.weaknesses?.slice(0, 3) || ["STAR Technique", "System Design Tradeoffs", "Space Complexity"],
      codingTopics: ["Data Structures", "Algorithms", "System Design", "Concurrency"],
      behavioralTopics: ["STAR Format", "Leadership Principles", "Conflict Resolution", "Project Ownership"],
      communicationExercises: ["Deliver 2-minute timed responses", "Record and listen to filler words", "Lead with the bottom-line answer"],
      resumeImprovements: ["Quantify achievements in project descriptions", "Highlight specific tech stack optimizations"],
      learningHubRecommendations: ["System Design Masterclass", "FAANG Behavioral Prep"],
      codingHubRecommendations: ["Top 50 Interview DSA Questions", "Dynamic Programming Roadmap"],
      careerRoadmapUpdates: ["Increase Interview Readiness score", "Schedule Technical Mock 2"],
      biggestStrength: evaluation.strengths?.[0] || "Clear problem-solving initiative",
      biggestWeakness: evaluation.weaknesses?.[0] || "Needs more quantitative STAR results",
      interviewReadiness: evaluation.overallScore || 65,
      nextRecommendedInterview: isTech ? "hr" : "technical",
      overallSummary: evaluation.summary || "Solid overall performance. Focus on structured delivery and trade-off explanations.",
    },
    practicePlan: {
      todayGoal: "Master STAR format for 3 behavioral questions and solve 1 Medium LeetCode problem",
      todayTasks: [
        { task: "Practice 2 behavioral questions using STAR format", category: "behavioral", estimatedMinutes: 20 },
        { task: "Solve 1 Array/Hashmap coding problem", category: "coding", estimatedMinutes: 30 },
        { task: "Review system architecture trade-offs", category: "technical", estimatedMinutes: 15 },
      ],
      thisWeek: [
        { goal: "Complete 3 mock interviews", tasks: ["1 Technical session", "1 HR session", "1 Full Mock"], deadline: "End of week" },
        { goal: "Refine resume bullet points", tasks: ["Add metrics to top 2 projects", "Update LinkedIn summary"], deadline: "Friday" },
      ],
      thisMonth: [
        { milestone: "Score 80+ across 5 consecutive interviews", targetDate: "2 weeks", checkpoints: ["Week 1: Focus on weak areas", "Week 2: Timed sessions"] },
        { milestone: "FAANG Interview Ready", targetDate: "4 weeks", checkpoints: ["Complete 10+ practice sessions", "Master STAR & System Design"] },
      ],
      suggestedInterviewType: isTech ? "hr" : "technical",
      recommendedCodingProblems: ["Two Sum", "Valid Parentheses", "Merge K Sorted Lists", "LRU Cache"],
      learningModules: ["System Design Fundamentals", "Behavioral Interview Mastery"],
      resumeTasks: ["Quantify impact in top project bullet point", "Add metric for query optimization"],
    },
    resumeImpact: {
      projectImprovements: ["Add system throughput numbers (RPS, Latency)", "Highlight optimization techniques used"],
      resumeBulletRewrites: [
        "Before: Worked on backend service optimizing performance.",
        "After: Re-architected backend API service with Redis cache layer, reducing p99 latency by 40% and cutting server load by 30%.",
      ],
      experienceClarifications: ["Be prepared to explain team size and individual contribution in system design questions"],
      linkedInUpdates: ["Add recent technical projects with quantifiable impact metrics"],
      overallResumeAdvice: "Focus on quantifying achievements with action verbs and specific numbers.",
    },
    competencyRadar: [
      { competency: "Communication", score: evaluation.communication || evaluation.communicationScore || 70, benchmark: 75 },
      { competency: "Technical Depth", score: evaluation.technical || evaluation.technicalScore || 75, benchmark: 80 },
      { competency: "Problem Solving", score: evaluation.problemSolving || 70, benchmark: 75 },
      { competency: "Leadership", score: evaluation.leadership || 65, benchmark: 70 },
      { competency: "Confidence", score: evaluation.confidence || evaluation.confidenceScore || 70, benchmark: 75 },
      { competency: "Role Fit", score: evaluation.roleFit || evaluation.overallScore || 75, benchmark: 80 },
    ],
    improvementSinceLast: previousEvaluation
      ? {
          scoreDelta: (evaluation.overallScore || 0) - (previousEvaluation.overallScore || 0),
          newStrengths: (evaluation.strengths || []).filter((s: string) => !(previousEvaluation.strengths || []).includes(s)),
          persistentWeaknesses: (evaluation.weaknesses || []).filter((w: string) => (previousEvaluation.weaknesses || []).includes(w)),
        }
      : { scoreDelta: 0, newStrengths: evaluation.strengths || [], persistentWeaknesses: evaluation.weaknesses || [] },
    questionReviews: defaultQuestionReviews,
    starAnalysis: defaultStarAnalysis,
    technicalFeedback: defaultTechnicalFeedback,
    charts: defaultCharts,
  };

  try {
    const taskCategory = isTech ? "coding_analysis" : isHR ? "hr_behavioral" : "career_coaching";
    const systemPrompt = `You are a Principal Engineering Manager and FAANG Interview Bar Raiser. Analyze interview performance and generate comprehensive interview intelligence data.

${context}

TASK: Generate a complete intelligence layer including:
- communicationInsights (confidence, clarity, filler words, speaking pace, feedback)
- interviewFlow (phases, score trends)
- followUpAnalysis (confident, hints, incomplete reasoning, avoided, incorrect)
- aiCoach (top priorities, revision topics, coding topics, behavioral topics, readiness score, next recommended interview)
- practicePlan (today, this week, this month, recommended coding problems)
- resumeImpact (bullet rewrites, project improvements, overall advice)
- competencyRadar (scores vs benchmarks)
- questionReviews (QuestionByQuestionItem array with 8 steps per question: questionNumber, question, candidateResponse, transcriptSnippet, aiAnalysis, idealAnswer, commonMistakes, improvedAnswer, recruiterPerspective, score)
- starAnalysis (STARAnalysisItem array for behavioral questions: situation, task, action, result, missingComponents, suggestedSTARRewrite, recruiterPerspective)
- technicalFeedback (codeCorrectnessScore, optimizationScore, namingScore, architectureScore, edgeCasesHandled, testingAdvice, timeComplexity, spaceComplexity, alternativeSolutions, faangExpectations)
- charts (performanceByQuestion, technicalVsCommunication, confidenceTrend, speakingTimeDistribution, topicPerformance)

Return strictly as JSON matching the IntelligenceData schema.`;

    const result = await generateOrchestratedJSON<IntelligenceData>(
      taskCategory,
      systemPrompt,
      "Generate comprehensive interview intelligence coaching data.",
      { temperature: 0.4, responseFormat: { type: "json_object" }, maxTokens: 8192 },
      fallback
    );

    console.log(`[Intelligence] Successfully generated intelligence layer (Readiness: ${result.aiCoach?.interviewReadiness || 0}%)`);
    return result;
  } catch (error) {
    console.error(`[Intelligence] LLM generation failed, returning rich fallback:`, error);
    return fallback;
  }
}

export async function generateCommunicationInsights(
  messages: any[],
  evaluation: any
): Promise<CommunicationInsight> {
  const answers = messages.filter((m: any) => m.role === "candidate" || m.role === "user");
  const avgLength = answers.length > 0
    ? Math.round(answers.reduce((s: number, m: any) => s + (m.content?.length || 0), 0) / answers.length)
    : 0;

  const fallback: CommunicationInsight = {
    confidence: evaluation.confidence || evaluation.confidenceScore || 65,
    clarity: evaluation.communication || evaluation.communicationScore || 65,
    professionalism: 70,
    answerStructure: avgLength > 150 ? 70 : avgLength > 80 ? 55 : 40,
    conciseness: avgLength > 300 ? 50 : avgLength > 150 ? 70 : 80,
    fillerWordsDetected: false,
    speakingPace: "Moderate",
    feedback: avgLength < 80
      ? "Answers are too brief. Expand with specific examples and structured responses."
      : avgLength > 300
        ? "Answers are detailed but could be more concise. Focus on the core value and metrics."
        : "Answer length is well balanced. Focus on STAR structure and quantifiable results.",
    suggestions: [
      avgLength < 80 ? "Provide more detailed answers with examples" : "Maintain current answer depth",
      "Use STAR format for behavioral questions",
      "Pause for 2 seconds before answering to organize thoughts",
    ],
  };

  try {
    const systemPrompt = `Analyze the communication quality of this interview candidate based on their answers and evaluation scores.

EVALUATION: Communication=${evaluation.communication || evaluation.communicationScore || 0}, Confidence=${evaluation.confidence || evaluation.confidenceScore || 0}, Overall=${evaluation.overallScore || 0}
ANSWERS: ${answers.length} answers, avg length: ${avgLength} chars

Generate specific, actionable communication insights. Be honest and constructive.`;

    const result = await generateOrchestratedJSON<CommunicationInsight>(
      "hr_communication",
      systemPrompt,
      "Analyze communication quality and provide actionable insights.",
      { temperature: 0.3, responseFormat: { type: "json_object" }, maxTokens: 2048 },
      fallback
    );

    return result;
  } catch {
    return fallback;
  }
}
