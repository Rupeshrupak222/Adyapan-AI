import { generateJSON, generateText, MODELS } from "./openrouter";

export interface EngineConfig {
  interviewType: string;
  targetRole: string;
  targetCompany: string;
  difficulty: string;
  experienceLevel: string;
  durationMinutes: number;
  technology: string;
  language: string;
  customInstructions: string;
}

export interface ResumeData {
  name?: string;
  skills?: string[];
  experience?: string[];
  projects?: string[];
  education?: string;
  summary?: string;
  atsScore?: number;
}

export interface Message {
  role: string;
  content: string;
}

export interface EngineQuestion {
  question: string;
  category: string;
  difficulty: string;
  expectedTopics: string[];
  followUpHint: string;
  timeEstimate: string;
  tips: string[];
}

export interface EngineEvaluation {
  overallScore: number;
  communicationScore: number;
  technicalScore: number | null;
  hrScore: number | null;
  confidenceScore: number | null;
  fluencyScore: number | null;
  bodyLanguageScore: number | null;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  summary: string;
  hiringRecommendation: "strong_recommend" | "recommend" | "maybe" | "do_not_recommend";
  detailedAnalysis: {
    answerQuality: number;
    technicalDepth: number;
    communicationClarity: number;
    problemSolving: number;
    culturalFit: number;
  };
  subScores: {
    communication: number;
    technical: number;
    confidence: number;
    problemSolving: number;
    leadership: number;
    roleFit: number;
  };
  missedOpportunities: string[];
  recommendedTopics: string[];
  communicationTips: string[];
  technicalImprovements: string[];
  nextPracticePlan: {
    focusAreas: string[];
    dailyTasks: string[];
    weeklyGoals: string[];
    estimatedTimeline: string;
  };
  answerBreakdowns: AnswerBreakdown[];
}

export interface AnswerBreakdown {
  question: string;
  answer: string;
  aiAnalysis: string;
  suggestedBetterAnswer: string;
  interviewerPerspective: string;
  score: number;
  tags: string[];
}

export interface RouteConfig {
  role: string;
  company: string;
  type: string;
  difficulty: string;
  technology: string;
  language: string;
  experienceLevel?: string;
  history: Message[];
  resumeContext: string;
  customInstructions?: string;
  durationMinutes?: number;
}

function getInterviewTypeFocus(type: string): string {
  const focusMap: Record<string, string> = {
    hr: `Focus on behavioral and situational interview questions. Cover STAR format responses, culture fit assessment, career goals exploration, strengths and weaknesses discussion, conflict resolution scenarios, and situational judgment questions. Ask about work-life balance preferences, motivation drivers, and long-term career aspirations. Probe how the candidate handles feedback, pressure, and ambiguous situations.`,

    technical: `Focus on computer science fundamentals including algorithms, data structures, operating systems, DBMS, networking, system architecture, and coding concepts. Ask about time and space complexity analysis, database design patterns, API design, concurrency concepts, and debugging methodologies. Cover topics like OOP principles, design patterns, memory management, and OS concepts like threading and deadlock.`,

    coding: `Focus on live coding challenges, code review exercises, debugging problems, and optimization tasks. Present algorithm implementation problems, ask the candidate to think through edge cases, analyze time/space complexity, and discuss trade-offs. Include code quality discussions, refactoring exercises, and real-world coding scenarios. Cover both easy and progressively harder problems.`,

    "system-design": `Focus on architecture and system design questions. Cover scalability patterns, load balancing, caching strategies, database sharding, microservices vs monolith, API design, distributed systems concepts, CAP theorem, eventual consistency, message queues, and component design. Ask about trade-off analysis, capacity estimation, and real-world system design scenarios like designing Twitter, URL shortener, or chat systems.`,

    behavioral: `Focus on teamwork, leadership, conflict resolution, and past experiences using STAR format. Ask about specific situations where the candidate demonstrated initiative, handled disagreements, mentored others, or drove results. Cover topics like adaptability, receiving criticism, working with diverse teams, and managing competing priorities.`,

    managerial: `Focus on team management, strategic thinking, decision-making frameworks, stakeholder management, and organizational leadership. Ask about budget management, hiring and firing decisions, performance reviews, cross-functional collaboration, and driving technical vision. Cover topics like OKR setting, resource allocation, risk management, and executive communication.`,

    "fresh-graduate": `Focus on academic projects, coursework relevance, learning agility, internship experiences, and raw potential. Ask about capstone projects, research work, technical coursework application, hackathon participation, and self-learning initiatives. Cover how they approach new problems, their learning methodology, and how they translate academic knowledge to practical scenarios.`,

    "campus-placement": `Focus on aptitude assessment, basic technical knowledge, group discussion preparedness, and company-specific preparation. Ask about quantitative reasoning, logical thinking, verbal ability, basic coding skills, and understanding of corporate culture. Cover topics like teamwork in academic settings, time management during exams, and readiness for professional environments.`,

    "experienced-professional": `Focus on domain expertise depth, mentoring capabilities, architecture decision-making, industry knowledge evolution, and leadership at scale. Ask about past system migrations, technical debt management, team scaling, cross-team collaboration, and strategic technical decisions. Cover topics like technology evaluation, build vs buy decisions, and driving engineering excellence.`,

    custom: `Adapt questions based on the candidate's background, target role, and company requirements. Blend technical depth with behavioral assessment. Tailor difficulty and focus areas dynamically based on the candidate's responses and resume highlights.`,
  };
  return focusMap[type] || focusMap.custom;
}

function getCompanyFocus(company: string): string {
  const c = company.toLowerCase();
  if (c.includes("google") || c.includes("alphabet"))
    return `Company Focus — Google: System design excellence, algorithmic thinking depth, innovation mindset, massive scale handling. Include Googliness attributes and questions about large-scale distributed systems.`;
  if (c.includes("amazon") || c.includes("aws"))
    return `Company Focus — Amazon: Frame questions around Amazon's 16 Leadership Principles — Customer Obsession, Ownership, Invent and Simplify, Are Right A Lot, Learn and Be Curious, Hire and Develop the Best, Insist on the Highest Standards, Think Big, Bias for Action, Frugality, Earn Trust, Dive Deep, Have Backbone; Disagree and Commit, Deliver Results, Strive to be Earth's Best Employer, Success and Scale Bring Broad Responsibility.`;
  if (c.includes("microsoft") || c.includes("azure"))
    return `Company Focus — Microsoft: Growth mindset, collaboration across teams, technical breadth, inclusive design. Ask about learning from failure, empowering others, and customer success focus.`;
  if (c.includes("meta") || c.includes("facebook"))
    return `Company Focus — Meta: Moving fast, impact at scale, social connectivity, building for billions. Ask about rapid prototyping, A/B testing mindset, and data-driven decision making.`;
  if (c.includes("tcs") || c.includes("tata"))
    return `Company Focus — TCS: Aptitude, fundamental technical skills, communication abilities, adaptability to enterprise environments, IT services model understanding.`;
  if (c.includes("infosys"))
    return `Company Focus — Infosys: Foundational technical knowledge, communication skills, process orientation, software development lifecycle understanding.`;
  if (c.includes("wipro"))
    return `Company Focus — Wipro: Technical fundamentals, problem-solving aptitude, communication clarity, client-focused mindset.`;
  if (c.includes("apple"))
    return `Company Focus — Apple: Attention to detail, product thinking, privacy-first design, hardware-software integration.`;
  return "";
}

function getDifficultyInstructions(difficulty: string): string {
  switch (difficulty) {
    case "easy": return "Keep questions approachable and foundational. Focus on conceptual understanding. Use encouraging tone.";
    case "medium": return "Use moderately challenging questions requiring analytical thinking. Balance theory with practical application. Gradually increase depth based on responses.";
    case "hard": return "Push with advanced, nuanced questions. Include multi-part problems, edge cases, and trade-off discussions. Challenge assumptions and probe for depth.";
    case "expert": return "Present expert-level challenges testing mastery. Include ambiguous problems with multiple valid approaches, architectural debates, and cutting-edge concepts.";
    default: return "Calibrate difficulty dynamically based on candidate responses. Start moderate and adjust.";
  }
}

function computeAnswerQualityScore(history: Message[]): number {
  const answers = history.filter((m) => m.role === "candidate");
  if (answers.length === 0) return 0;
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

const FALLBACK_QUESTION = {
  question: "Tell me about yourself and why you're interested in this role.",
  category: "icebreaker",
  difficulty: "easy",
  expectedTopics: ["career journey", "motivation", "role alignment"],
  followUpHint: "Probe deeper into specific career decisions",
  timeEstimate: "2 minutes",
  tips: ["Listen for career progression narrative", "Note self-awareness level"],
};

export async function generateEngineQuestion(
  config: RouteConfig
): Promise<string> {
  const questionNumber = config.history.filter((m) => m.role === "interviewer").length + 1;
  const durationMinutes = config.durationMinutes || 30;
  const totalQuestions = Math.ceil(durationMinutes / 5);
  const avgQuality = computeAnswerQualityScore(config.history);
  const typeFocus = getInterviewTypeFocus(config.type);
  const companyFocus = getCompanyFocus(config.company);
  const difficultyInstructions = getDifficultyInstructions(config.difficulty);

  let dynamicDifficulty = config.difficulty;
  if (questionNumber > 2) {
    if (avgQuality >= 75) {
      const escalateMap: Record<string, string> = { easy: "medium", medium: "hard", hard: "expert", expert: "expert" };
      dynamicDifficulty = escalateMap[config.difficulty] || config.difficulty;
    } else if (avgQuality <= 40) {
      const deescalateMap: Record<string, string> = { expert: "hard", hard: "medium", medium: "easy", easy: "easy" };
      dynamicDifficulty = deescalateMap[config.difficulty] || config.difficulty;
    }
  }

  const shouldChallenge = avgQuality >= 70 && questionNumber >= 3;
  const shouldSupport = avgQuality < 60 && questionNumber > 1;
  const isEarlyStage = questionNumber <= 2;
  const isLateStage = questionNumber >= totalQuestions - 2;

  const conversationHistory = config.history
    .filter((m) => m.role === "interviewer" || m.role === "candidate")
    .map((m) => `[${m.role === "interviewer" ? "Interviewer" : "Candidate"}]: ${m.content}`)
    .join("\n\n");

  const resumeSection = config.resumeContext && config.resumeContext !== "null"
    ? `\nCANDIDATE RESUME CONTEXT:\n${config.resumeContext}\n`
    : "";

  const systemPrompt = `You are an expert AI Interview Engine conducting a professional ${config.type} interview.

INTERVIEW CONTEXT:
- Type: ${config.type}
- Target Role: ${config.role}
- Target Company: ${config.company || "Not specified"}
- Experience Level: ${config.experienceLevel}
- Technology Focus: ${config.technology || "General"}
- Programming Language: ${config.language || "Not specified"}

QUESTION FOCUS:
${typeFocus}

${companyFocus}

DYNAMIC DIFFICULTY: ${dynamicDifficulty}
${difficultyInstructions}
${resumeSection}
QUESTION GENERATION & INTERACTIVE EVALUATION RULES:
1. Generate exactly ONE question appropriate for question ${questionNumber} of ${totalQuestions}
2. ${isEarlyStage ? "Start with foundational/ice-breaker questions to assess baseline." : ""}
3. ${isLateStage ? "This is near the end — ask a capstone question that tests holistic understanding." : ""}
4. ${shouldChallenge ? "The candidate is performing well — present a CHALLENGE question that pushes their limits." : ""}
5. ${shouldSupport ? "The candidate has been struggling — ask a supportive question to help them demonstrate knowledge." : ""}
6. Questions must be specific to the ${config.type} interview type
7. ${config.company ? `Include company-specific elements for ${config.company}` : ""}
8. Vary question types: scenario-based, hypothetical, knowledge-check, problem-solving, reflection
9. Each question should be natural and conversational
10. IMPORTANT: If there is previous candidate response in conversation history, begin the "question" string with 1-2 brief, encouraging conversational sentences evaluating their answer (what they got right, missing points, or key takeaway), before seamlessly moving to the next question.

${config.customInstructions ? `Additional Instructions: ${config.customInstructions}` : ""}

Return the question as JSON with this exact structure:
{
  "question": "Brief evaluation of previous answer (if applicable) + The next interview question text",
  "category": "question category",
  "difficulty": "easy|medium|hard|expert",
  "expectedTopics": ["topic1", "topic2"],
  "followUpHint": "What to probe if answer is surface-level",
  "timeEstimate": "expected answer time",
  "tips": ["tip for evaluating this answer"]
}`;

  const userPrompt = `Question ${questionNumber} of ${totalQuestions} | Type: ${config.type} | Role: ${config.role} | Difficulty: ${dynamicDifficulty}

${conversationHistory ? `Previous conversation history:\n${conversationHistory}` : "This is the first question of the interview."}

${conversationHistory ? "First evaluate the candidate's last response, then present the next interview question." : "Generate the first interview question."}`;

  try {
    const result = await generateJSON<EngineQuestion>(
      systemPrompt,
      userPrompt,
      { model: MODELS.BALANCED, temperature: 0.8, maxTokens: 2048 },
      FALLBACK_QUESTION
    );
    console.log(`[Engine] Generated question ${questionNumber} for ${config.type} interview (${result.category})`);
    return result.question;
  } catch (error) {
    console.error(`[Engine] Question generation failed, using fallback:`, error);
    return FALLBACK_QUESTION.question;
  }
}

export async function generateEngineEvaluation(
  config: RouteConfig
): Promise<EngineEvaluation> {
  const conversationHistory = config.history
    .filter((m) => m.role === "interviewer" || m.role === "candidate")
    .map((m) => `[${m.role === "interviewer" ? "Interviewer" : "Candidate"}]: ${m.content}`)
    .join("\n\n");

  const candidateMessages = config.history.filter((m) => m.role === "candidate");
  const interviewerMessages = config.history.filter((m) => m.role === "interviewer");
  const totalQuestions = interviewerMessages.length;
  const avgQuality = computeAnswerQualityScore(config.history);

  const resumeSection = config.resumeContext && config.resumeContext !== "null"
    ? `\nCANDIDATE RESUME:\n${config.resumeContext}\n`
    : "";

  const systemPrompt = `You are a senior hiring manager and interview evaluation expert providing a comprehensive assessment of a candidate's interview performance.

EVALUATION CONTEXT:
- Interview Type: ${config.type}
- Target Role: ${config.role}
- Target Company: ${config.company || "Not specified"}
- Difficulty Level: ${config.difficulty}
- Experience Level: ${config.experienceLevel}
- Technology: ${config.technology || "General"}
${resumeSection}
EVALUATION RULES:
1. Score each dimension honestly — do not inflate scores to be polite
2. Reference SPECIFIC answers from the transcript to justify scores
3. Provide actionable, specific feedback — not generic advice
4. The answerBreakdowns array MUST have one entry for EVERY question-answer pair (${totalQuestions} pairs expected)
5. For each breakdown, provide a genuinely helpful suggested better answer
6. Tags must be specific and meaningful

SCORING SCALE:
90-100: Exceptional — would strongly stand out among candidates at this level
80-89: Strong — clearly meets expectations, hire-ready
70-79: Adequate — meets basic expectations, some areas need polish
60-69: Below average — significant gaps that need addressing
40-59: Weak — major deficiencies in multiple areas
0-39: Poor — does not meet minimum expectations

Return the evaluation as JSON with this exact structure:
{
  "overallScore": number (0-100),
  "communicationScore": number (0-100),
  "technicalScore": number (0-100) or null if not applicable,
  "hrScore": number (0-100) or null if not applicable,
  "confidenceScore": number (0-100),
  "fluencyScore": number (0-100),
  "bodyLanguageScore": number (0-100),
  "strengths": ["specific strength with evidence", ...],
  "weaknesses": ["specific weakness with evidence", ...],
  "improvements": ["actionable improvement suggestion", ...],
  "summary": "2-3 sentence executive summary",
  "hiringRecommendation": "strong_recommend" | "recommend" | "maybe" | "do_not_recommend",
  "detailedAnalysis": {
    "answerQuality": number (0-100),
    "technicalDepth": number (0-100),
    "communicationClarity": number (0-100),
    "problemSolving": number (0-100),
    "culturalFit": number (0-100)
  },
  "subScores": {
    "communication": number (0-100),
    "technical": number (0-100),
    "confidence": number (0-100),
    "problemSolving": number (0-100),
    "leadership": number (0-100),
    "roleFit": number (0-100)
  },
  "missedOpportunities": ["opportunity the candidate missed", ...],
  "recommendedTopics": ["topic to study more", ...],
  "communicationTips": ["specific actionable communication improvement", ...],
  "technicalImprovements": ["specific technical area to improve", ...],
  "nextPracticePlan": {
    "focusAreas": ["area1", "area2"],
    "dailyTasks": ["task1", "task2", "task3"],
    "weeklyGoals": ["goal1", "goal2"],
    "estimatedTimeline": "e.g., 2 weeks of focused practice"
  },
  "answerBreakdowns": [
    {
      "question": "the exact question asked",
      "answer": "the candidate's answer",
      "aiAnalysis": "detailed analysis of the answer quality",
      "suggestedBetterAnswer": "a significantly improved version of the answer",
      "interviewerPerspective": "what a real interviewer would think hearing this answer",
      "score": number (0-100),
      "tags": ["specific-tag", "another-tag"]
    }
  ]
}

Be specific and reference actual responses from the candidate. Avoid generic feedback.`;

  const fallbackBreakdowns: AnswerBreakdown[] = interviewerMessages.map((q, i) => ({
    question: q.content,
    answer: candidateMessages[i]?.content || "No answer provided",
    aiAnalysis: avgQuality === 0 
      ? "No candidate response was provided for this question."
      : `Answer ${i + 1}: ${avgQuality >= 60 ? "Demonstrates adequate understanding." : "Could benefit from more depth and structure."}`,
    suggestedBetterAnswer: avgQuality === 0 
      ? "A response is required to provide evaluation and suggestions."
      : `A stronger answer would include more specific examples, clearer structure, and deeper technical detail relevant to the ${config.role} role.`,
    interviewerPerspective: avgQuality === 0 
      ? "Without a response, I cannot assess the candidate's suitability for the role."
      : avgQuality >= 70
        ? "This answer shows competence. I would move forward with this candidate."
        : "This answer needs improvement. I would want to see more depth before advancing.",
    score: avgQuality > 0 ? Math.min(100, Math.max(20, Math.round(avgQuality))) : 0,
    tags: avgQuality === 0 ? ["no-response"] : avgQuality >= 70 ? ["adequate", "relevant"] : ["needs-improvement", "vague"],
  }));

  const fallback: EngineEvaluation = {
    overallScore: avgQuality,
    communicationScore: avgQuality > 0 ? Math.min(100, avgQuality + 5) : 0,
    technicalScore: config.type === "technical" || config.type === "coding" || config.type === "system-design" ? avgQuality : null,
    hrScore: config.type === "behavioral" || config.type === "hr" ? avgQuality : null,
    confidenceScore: avgQuality > 0 ? Math.min(100, Math.max(20, avgQuality - 3)) : 0,
    fluencyScore: avgQuality > 0 ? Math.min(100, avgQuality + 2) : 0,
    bodyLanguageScore: avgQuality > 0 ? Math.min(100, Math.max(20, avgQuality - 5)) : 0,
    strengths: avgQuality === 0 
      ? ["No candidate responses were provided in the transcript.", "Unable to evaluate competencies without answers."]
      : [
          `Candidate completed ${totalQuestions} questions`,
          avgQuality >= 60 ? "Demonstrated adequate response length" : "Showed willingness to engage",
        ],
    weaknesses: avgQuality === 0 
      ? ["No candidate response was provided in the transcript, making evaluation impossible.", "Unable to assess skills, experience, or fit without answers."]
      : [
          avgQuality < 60 ? "Answers lacked sufficient depth" : "Could improve answer structure",
          "Some answers could benefit from more specific examples",
        ],
    improvements: avgQuality === 0 
      ? ["Provide responses to all interview questions to enable proper evaluation", "Ensure audio/video setup is working properly", "Practice interview responses before the session"]
      : [
          "Practice structuring answers with clear beginning, middle, and end",
          "Use the STAR method for behavioral questions",
          "Include quantified results when describing achievements",
        ],
    summary: avgQuality === 0 
      ? `The transcript contains only the interviewer's questions with no candidate responses provided. As a result, no evaluation could be performed. A complete interview record is required for assessment.`
      : `Candidate completed a ${config.type} interview for a ${config.role} role${config.company ? ` at ${config.company}` : ""} with an overall score of ${avgQuality}/100.`,
    hiringRecommendation: avgQuality === 0 ? "do_not_recommend" :
      avgQuality >= 80 ? "strong_recommend" :
      avgQuality >= 60 ? "recommend" :
      avgQuality >= 40 ? "maybe" : "do_not_recommend",
    detailedAnalysis: {
      answerQuality: avgQuality,
      technicalDepth: config.type === "technical" || config.type === "coding" ? (avgQuality > 0 ? avgQuality - 5 : 0) : 50,
      communicationClarity: avgQuality > 0 ? Math.min(100, avgQuality + 3) : 0,
      problemSolving: avgQuality > 0 ? Math.max(20, avgQuality - 2) : 0,
      culturalFit: avgQuality > 0 ? Math.min(100, avgQuality + 5) : 0,
    },
    subScores: {
      communication: avgQuality > 0 ? Math.min(100, avgQuality + 5) : 0,
      technical: config.type === "technical" || config.type === "coding" || config.type === "system-design" ? avgQuality : (avgQuality > 0 ? Math.round(avgQuality * 0.6) : 0),
      confidence: avgQuality > 0 ? Math.min(100, Math.max(20, avgQuality - 3)) : 0,
      problemSolving: avgQuality > 0 ? Math.min(100, Math.max(20, avgQuality + 2)) : 0,
      leadership: config.type === "managerial" ? avgQuality : (avgQuality > 0 ? Math.round(avgQuality * 0.5) : 0),
      roleFit: avgQuality > 0 ? Math.min(100, Math.max(20, avgQuality + 4)) : 0,
    },
    missedOpportunities: avgQuality === 0 
      ? ["No responses provided to evaluate opportunities"]
      : [
          "Could have referenced resume projects more explicitly",
          "Missed opportunity to quantify achievements",
        ],
    recommendedTopics: avgQuality === 0 
      ? ["Complete interview sessions with responses", `Core concepts for ${config.role} role`, "Interview communication skills"]
      : [`Core concepts for ${config.role} role`, `Common ${config.type} interview patterns`],
    communicationTips: avgQuality === 0 
      ? ["Ensure proper audio/video setup before interviews", "Practice responding to questions aloud"]
      : [
          "Practice structuring answers with clear beginning, middle, and end",
          "Use the STAR method for behavioral questions",
        ],
    technicalImprovements: avgQuality === 0 
      ? ["Complete interview sessions to receive technical feedback"]
      : config.type === "technical" || config.type === "coding"
        ? ["Review data structures and algorithms", "Practice explaining technical concepts clearly"]
        : ["Strengthen domain-specific knowledge", "Practice articulating experience more precisely"],
    nextPracticePlan: {
      focusAreas: avgQuality === 0 
        ? ["Complete full interview sessions", "Audio/video setup", "Interview fundamentals"]
        : [`Weak areas from ${config.type} interview`, "Communication structure"],
      dailyTasks: avgQuality === 0 
        ? ["Test interview setup", "Practice answering questions aloud", "Review interview basics"]
        : ["Practice 1 interview question aloud", "Review feedback on weak areas"],
      weeklyGoals: avgQuality === 0 
        ? ["Complete a full mock interview with responses", "Master interview technology setup"]
        : ["Complete a full mock interview", "Improve scores on weak sub-dimensions"],
      estimatedTimeline: avgQuality === 0 ? "Start with basic interview preparation" : "2-3 weeks of focused practice",
    },
    answerBreakdowns: fallbackBreakdowns,
  };

  try {
    const result = await generateJSON<EngineEvaluation>(
      systemPrompt,
      `Evaluate this ${config.type} interview for a ${config.role} position${config.company ? ` at ${config.company}` : ""}.

INTERVIEW TRANSCRIPT:
${conversationHistory}

CANDIDATE ANSWERED ${totalQuestions} QUESTIONS.

Provide a comprehensive evaluation with breakdowns for ALL ${totalQuestions} question-answer pairs.`,
      { model: MODELS.BALANCED, temperature: 0.4, maxTokens: 16000 },
      fallback
    );

    if (!result.answerBreakdowns || result.answerBreakdowns.length < totalQuestions) {
      const existing = result.answerBreakdowns || [];
      while (existing.length < totalQuestions) {
        const idx = existing.length;
        existing.push({
          question: interviewerMessages[idx]?.content || `Question ${idx + 1}`,
          answer: candidateMessages[idx]?.content || "No answer provided",
          aiAnalysis: "Unable to generate detailed analysis for this question.",
          suggestedBetterAnswer: "Please refer to the general improvement suggestions.",
          interviewerPerspective: "Insufficient data for detailed perspective.",
          score: avgQuality,
          tags: ["auto-generated"],
        });
      }
      result.answerBreakdowns = existing;
    }

    result.overallScore = Math.max(0, Math.min(100, Math.round(result.overallScore)));
    result.communicationScore = Math.max(0, Math.min(100, Math.round(result.communicationScore)));
    if (result.technicalScore !== null) result.technicalScore = Math.max(0, Math.min(100, Math.round(result.technicalScore)));
    if (result.hrScore !== null) result.hrScore = Math.max(0, Math.min(100, Math.round(result.hrScore)));
    if (result.confidenceScore !== null) result.confidenceScore = Math.max(0, Math.min(100, Math.round(result.confidenceScore)));
    if (result.fluencyScore !== null) result.fluencyScore = Math.max(0, Math.min(100, Math.round(result.fluencyScore)));
    if (result.bodyLanguageScore !== null) result.bodyLanguageScore = Math.max(0, Math.min(100, Math.round(result.bodyLanguageScore)));

    for (const bd of result.answerBreakdowns) {
      bd.score = Math.max(0, Math.min(100, Math.round(bd.score)));
      if (!Array.isArray(bd.tags)) bd.tags = ["unclassified"];
    }

    console.log(`[Engine] Evaluation complete — Score: ${result.overallScore}/100 | ${result.answerBreakdowns.length} breakdowns`);
    return result;
  } catch (error) {
    console.error(`[Engine] Evaluation generation failed, using fallback:`, error);
    return fallback;
  }
}
