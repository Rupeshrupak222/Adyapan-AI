import { generateJSON, MODELS } from "./openrouter";
import { EngineConfig, Message, AnswerBreakdown } from "./engine-question.service";

export interface EvaluationConfig {
  interviewType: string;
  targetRole: string;
  targetCompany: string;
  difficulty: string;
  experienceLevel: string;
  technology: string;
  language: string;
}

export interface SingleAnswerEvaluation {
  score: number;
  analysis: string;
  suggestedBetterAnswer: string;
  interviewerPerspective: string;
  tags: string[];
}

export interface AnswerBreakdownItem {
  question: string;
  answer: string;
  aiAnalysis: string;
  suggestedBetterAnswer: string;
  interviewerPerspective: string;
  score: number;
  tags: string[];
}

export interface PlacementReadiness {
  ready: boolean;
  readinessScore: number;
  tier: "excellent" | "strong" | "moderate" | "developing" | "needs-work";
  strengths: string[];
  gaps: string[];
  recommendation: string;
  targetCompanies: string[];
  estimatedPrepTime: string;
  milestoneTracking: {
    currentLevel: string;
    nextLevel: string;
    progressPercentage: number;
    keyMilestones: string[];
  };
  trendAnalysis: {
    improving: string[];
    declining: string[];
    stable: string[];
    trajectory: "upward" | "flat" | "declining";
  };
}

function getInterviewContext(config: EvaluationConfig): string {
  return `Interview Type: ${config.interviewType}
Target Role: ${config.targetRole}
Target Company: ${config.targetCompany || "Not specified"}
Difficulty: ${config.difficulty}
Experience Level: ${config.experienceLevel}
Technology: ${config.technology || "General"}
Language: ${config.language || "Not specified"}`;
}

function getEvaluationFocus(type: string): string {
  const focusMap: Record<string, string> = {
    hr: "Evaluate communication clarity, behavioral response quality, STAR format usage, self-awareness, culture alignment indicators, and professional demeanor. Score technical sub-dimension as N/A. Emphasize leadership, confidence, and roleFit scores.",
    technical: "Evaluate technical accuracy, depth of CS fundamentals, problem decomposition, knowledge of algorithms and data structures, system concepts understanding, and ability to explain complex topics. All sub-scores relevant.",
    coding: "Evaluate problem-solving approach, code correctness, time/space complexity awareness, edge case handling, coding fluency, and debugging methodology. Technical and problemSolving weighted heavily.",
    "system-design": "Evaluate architectural thinking, scalability awareness, trade-off analysis, component design, technology selection rationale, and handling ambiguity. problemSolving and technical weighted heavily.",
    behavioral: "Evaluate STAR format adherence, self-awareness, conflict resolution, leadership indicators, teamwork evidence, and growth mindset. leadership and communication weighted heavily.",
    managerial: "Evaluate strategic thinking, decision-making frameworks, stakeholder management, team leadership, budget/resource awareness, and executive presence. leadership and confidence weighted heavily.",
    "fresh-graduate": "Evaluate learning potential, academic project depth, internship quality, raw technical ability, communication skills, and cultural alignment. Technical adjusted for experience level.",
    "campus-placement": "Evaluate aptitude indicators, foundational technical knowledge, communication clarity, team orientation, adaptability signals, and corporate readiness. Communication and roleFit weighted heavily.",
    "experienced-professional": "Evaluate domain expertise depth, mentoring capability, architecture decision quality, industry knowledge breadth, and leadership at scale. All scores for senior-level expectations.",
    custom: "Evaluate holistically across all dimensions based on interview content and target role requirements.",
  };
  return focusMap[type] || focusMap.custom;
}

const TAG_DEFINITIONS = `"strong-example" (compelling specific example), "vague" (lacks specificity), "technical-deep" (strong technical depth), "technical-shallow" (lacks expected depth), "star-format" (well-structured STAR), "missing-star" (no structure), "relevant-experience" (draws from relevant past), "theoretical-only" (knowledge without application), "excellent-communication" (clear and organized), "poorly-structured" (rambling), "confident" (appropriate confidence), "uncertain" (hesitation), "insightful" (unique perspective), "surface-level" (scratches surface only), "great-problem-solving" (strong analytical approach), "missed-key-points" (omitted important aspects), "exceeded-expectations" (above and beyond), "irrelevant" (doesn't address question), "concise-but-complete" (brief yet comprehensive), "too-long" (verbose without value)`;

export async function evaluateSingleAnswer(
  question: string,
  answer: string,
  config: EvaluationConfig
): Promise<SingleAnswerEvaluation> {
  const context = getInterviewContext(config);
  const focus = getEvaluationFocus(config.interviewType);

  const systemPrompt = `You are an expert interview evaluator analyzing a single question-answer pair from a ${config.interviewType} interview.

EVALUATION CONTEXT:
${context}

EVALUATION FOCUS:
${focus}

SCORING RULES:
1. Score honestly — do not inflate to be encouraging
2. A one-word or very short answer scores below 40 unless the question genuinely calls for brevity
3. A well-structured answer with specific examples scores 70+
4. A comprehensive answer with depth, clarity, and relevance scores 85+
5. Consider difficulty level — a good answer to a hard question scores higher than a good answer to an easy question
6. Factor in experience level expectations

AVAILABLE TAGS (choose applicable ones):
${TAG_DEFINITIONS}

Return the evaluation as JSON:
{
  "score": number (0-100),
  "analysis": "Detailed 2-3 sentence analysis referencing specific aspects of the response",
  "suggestedBetterAnswer": "A significantly improved answer showing what a strong candidate would say. Make it concrete, specific, and role-appropriate.",
  "interviewerPerspective": "What a real interviewer at ${config.targetCompany || "a top company"} would think hearing this answer — be candid",
  "tags": ["tag1", "tag2"]
}`;

  const trimmedAnswer = (answer || "").trim();
  const isNoAnswer = !trimmedAnswer || trimmedAnswer.toLowerCase() === "no answer provided" || trimmedAnswer.toLowerCase() === "no answer";
  const len = trimmedAnswer.length;
  const computedFallbackScore = isNoAnswer ? 0 : len < 40 ? 20 : len < 100 ? 40 : len < 250 ? 55 : len < 500 ? 70 : 80;

  const fallback: SingleAnswerEvaluation = {
    score: computedFallbackScore,
    analysis: isNoAnswer
      ? "No candidate response was provided for this question."
      : `The candidate provided a response of ${len} characters. ${len < 80 ? "The answer appears too brief for an interview context." : "The answer has reasonable length but would benefit from more specific details and structure."}`,
    suggestedBetterAnswer: isNoAnswer
      ? `A complete answer is required to assess this competency for the ${config.targetRole} role.`
      : `A stronger answer would include: (1) a clear structure with context, action, and result, (2) specific examples or metrics where applicable, (3) connection to the ${config.targetRole} role requirements, and (4) demonstration of relevant skills.`,
    interviewerPerspective: isNoAnswer
      ? "Without a response, I cannot evaluate the candidate's skills for this question."
      : len > 200
        ? "The candidate provided a substantive response. I would want to probe deeper on specific claims."
        : "The answer was too brief. I would expect more depth before advancing this candidate.",
    tags: isNoAnswer ? ["no-response"] : len > 200 ? ["adequate-length"] : ["vague", "too-brief"],
  };

  try {
    const result = await generateJSON<SingleAnswerEvaluation>(
      systemPrompt,
      `QUESTION: ${question}\n\nCANDIDATE'S ANSWER: ${answer}\n\nEvaluate this answer thoroughly. Be specific, honest, and constructive.`,
      { model: MODELS.FAST, temperature: 0.3, maxTokens: 2048 },
      fallback
    );

    result.score = Math.max(0, Math.min(100, Math.round(result.score)));
    if (!Array.isArray(result.tags)) result.tags = fallback.tags;

    console.log(`[Engine] Single answer evaluated — Score: ${result.score}/100 | Tags: ${result.tags.join(", ")}`);
    return result;
  } catch (error) {
    console.error(`[Engine] Single answer evaluation failed, using fallback:`, error);
    return fallback;
  }
}

export async function generateAnswerBreakdowns(
  messages: Message[],
  config: EvaluationConfig
): Promise<AnswerBreakdownItem[]> {
  const interviewerMessages = messages.filter((m) => m.role === "interviewer");
  const candidateMessages = messages.filter((m) => m.role === "candidate");
  const totalPairs = Math.min(interviewerMessages.length, candidateMessages.length);

  if (totalPairs === 0) {
    console.warn("[Engine] No question-answer pairs found in messages");
    return [];
  }

  const qaPairs = Array.from({ length: totalPairs }, (_, i) => ({
    question: interviewerMessages[i].content,
    answer: candidateMessages[i].content,
    index: i + 1,
  }));

  const context = getInterviewContext(config);
  const focus = getEvaluationFocus(config.interviewType);

  const pairsText = qaPairs
    .map((p) => `\n--- PAIR ${p.index} ---\nQUESTION: ${p.question}\nANSWER: ${p.answer}\n--- END PAIR ${p.index} ---`)
    .join("\n");

  const systemPrompt = `You are an expert interview evaluator analyzing ALL question-answer pairs from a ${config.interviewType} interview.

EVALUATION CONTEXT:
${context}

EVALUATION FOCUS:
${focus}

SCORING:
90-100: Exceptional | 80-89: Strong | 70-79: Adequate | 60-69: Below Average | 40-59: Weak | 0-39: Poor

TASK: Evaluate EVERY question-answer pair. You MUST return exactly ${totalPairs} breakdown entries.

RULES:
1. Score honestly — inflate nothing
2. Short/vague answers score below 50; well-structured substantive answers score 70+
3. Each breakdown must reference specific content from the actual answer
4. suggestedBetterAnswer must be genuinely helpful and specific to the question
5. Tags must accurately reflect answer characteristics

AVAILABLE TAGS:
${TAG_DEFINITIONS}

Return a JSON array with exactly ${totalPairs} objects:
[
  {
    "question": "the question text",
    "answer": "the answer text",
    "aiAnalysis": "detailed analysis referencing specific parts of the answer",
    "suggestedBetterAnswer": "a significantly improved answer showing strong candidate response",
    "interviewerPerspective": "candid perspective of what a real interviewer would think",
    "score": number (0-100),
    "tags": ["tag1", "tag2"]
  }
]`;

  const fallbackBreakdowns: AnswerBreakdownItem[] = qaPairs.map((pair) => {
    const answerLen = pair.answer.trim().length;
    let score: number;
    let tags: string[];

    if (answerLen < 30) {
      score = 25;
      tags = ["vague"];
    } else if (answerLen < 80) {
      score = 40;
      tags = ["surface-level"];
    } else if (answerLen < 200) {
      score = 55;
      tags = ["adequate"];
    } else if (answerLen < 500) {
      score = 68;
      tags = ["relevant-experience"];
    } else {
      score = 75;
      tags = ["strong-example"];
    }

    return {
      question: pair.question,
      answer: pair.answer,
      aiAnalysis: `Answer ${pair.index} (${answerLen} chars): ${answerLen < 80 ? "Too brief and lacks depth expected in a professional interview." : answerLen < 200 ? "Moderate length but would benefit from more specific examples and clearer structure." : "Substantive in length. Content quality assessment follows."}`,
      suggestedBetterAnswer: `For this question, a strong answer would: (1) directly address the question, (2) provide specific examples with quantified outcomes, (3) demonstrate relevant expertise for the ${config.targetRole} role, (4) show structured thinking appropriate for a ${config.difficulty}-level interview.`,
      interviewerPerspective: score >= 70
        ? "I would likely advance this candidate based on this answer, though I would want to verify claims."
        : score >= 50
          ? "This answer is acceptable but not distinguishing. I would need stronger answers in other areas."
          : "This answer raises concerns about readiness for the role.",
      score,
      tags,
    };
  });

  try {
    const result = await generateJSON<AnswerBreakdownItem[]>(
      systemPrompt,
      `Evaluate ALL ${totalPairs} question-answer pairs from this ${config.interviewType} interview for a ${config.targetRole} role.${config.targetCompany ? ` Target company: ${config.targetCompany}.` : ""}

${pairsText}

Return exactly ${totalPairs} breakdown objects in a JSON array.`,
      { model: MODELS.FAST, temperature: 0.3, maxTokens: 16000 },
      fallbackBreakdowns
    );

    const normalized = Array.isArray(result) ? result : [];
    while (normalized.length < totalPairs) {
      const idx = normalized.length;
      normalized.push(fallbackBreakdowns[idx] || {
        question: qaPairs[idx]?.question || `Question ${idx + 1}`,
        answer: qaPairs[idx]?.answer || "No answer",
        aiAnalysis: "Breakdown generation was incomplete for this pair.",
        suggestedBetterAnswer: "Refer to general improvement guidelines.",
        interviewerPerspective: "Unable to generate perspective for this pair.",
        score: 50,
        tags: ["auto-generated"],
      });
    }

    const finalResult = normalized.slice(0, totalPairs);
    for (const item of finalResult) {
      item.score = Math.max(0, Math.min(100, Math.round(item.score)));
      if (!Array.isArray(item.tags)) item.tags = ["unclassified"];
    }

    console.log(`[Engine] Generated ${finalResult.length} answer breakdowns | Avg score: ${Math.round(finalResult.reduce((s, b) => s + b.score, 0) / finalResult.length)}`);
    return finalResult;
  } catch (error) {
    console.error(`[Engine] Breakdown generation failed, using fallback:`, error);
    return fallbackBreakdowns;
  }
}

export async function generatePlacementReadiness(
  evaluation: {
    overallScore: number;
    subScores: {
      communication: number;
      technical: number;
      confidence: number;
      problemSolving: number;
      leadership: number;
      roleFit: number;
    };
    strengths: string[];
    weaknesses: string[];
  },
  history: Message[]
): Promise<PlacementReadiness> {
  const candidateAnswers = history.filter((m) => m.role === "candidate");
  const avgAnswerLength = candidateAnswers.length > 0
    ? candidateAnswers.reduce((sum, m) => sum + m.content.length, 0) / candidateAnswers.length
    : 0;

  const questionCount = history.filter((m) => m.role === "interviewer").length;
  const answerCount = candidateAnswers.length;
  const completionRate = questionCount > 0 ? answerCount / questionCount : 0;

  const overallScore = evaluation.overallScore;
  const subScores = evaluation.subScores;

  let tier: PlacementReadiness["tier"];
  if (overallScore >= 85) tier = "excellent";
  else if (overallScore >= 72) tier = "strong";
  else if (overallScore >= 58) tier = "moderate";
  else if (overallScore >= 40) tier = "developing";
  else tier = "needs-work";

  const readinessScore = Math.round(
    overallScore * 0.4 +
    subScores.communication * 0.15 +
    subScores.technical * 0.15 +
    subScores.problemSolving * 0.15 +
    subScores.roleFit * 0.1 +
    subScores.confidence * 0.05
  );

  const ready = readinessScore >= 65;

  const gaps: string[] = [];
  if (subScores.communication < 60) gaps.push("Communication skills need significant improvement");
  if (subScores.technical < 60) gaps.push("Technical knowledge requires strengthening");
  if (subScores.problemSolving < 60) gaps.push("Problem-solving approach needs development");
  if (subScores.confidence < 50) gaps.push("Interview confidence and composure need work");
  if (subScores.leadership < 50) gaps.push("Leadership and initiative indicators are weak");
  if (subScores.roleFit < 60) gaps.push("Alignment with target role requirements is insufficient");
  if (avgAnswerLength < 60) gaps.push("Answer depth is too shallow — provide more substance");
  if (completionRate < 0.9) gaps.push("Question completion rate is low — ensure all questions are addressed");

  const strengths = [...evaluation.strengths];
  if (subScores.communication >= 75) strengths.push("Strong communication skills");
  if (subScores.technical >= 75) strengths.push("Solid technical foundation");
  if (subScores.problemSolving >= 75) strengths.push("Excellent problem-solving ability");
  if (subScores.confidence >= 75) strengths.push("Confident and composed presence");
  if (avgAnswerLength > 200) strengths.push("Provides substantive, detailed answers");
  if (completionRate >= 0.95) strengths.push("Consistently addresses all questions");

  const targetCompanies: string[] = [];
  if (readinessScore >= 80) {
    targetCompanies.push("FAANG/MAANG-tier companies (Google, Amazon, Meta, Apple, Microsoft)");
    targetCompanies.push("Top-tier startups and unicorns");
  } else if (readinessScore >= 65) {
    targetCompanies.push("Mid-to-large technology companies");
    targetCompanies.push("Well-funded startups Series B+");
    targetCompanies.push("IT services companies (TCS, Infosys, Wipro — senior roles)");
  } else if (readinessScore >= 50) {
    targetCompanies.push("IT services companies (TCS, Infosys, Wipro)");
    targetCompanies.push("Mid-size companies for junior roles");
    targetCompanies.push("Startups for entry-level positions");
  } else {
    targetCompanies.push("Entry-level positions at growing companies");
    targetCompanies.push("Internship-to-fulltime programs");
    targetCompanies.push("Freelance/contract roles to build experience");
  }

  let estimatedPrepTime: string;
  if (readinessScore >= 80) estimatedPrepTime = "Minimal — 1-2 weeks of light polish";
  else if (readinessScore >= 65) estimatedPrepTime = "Moderate — 2-4 weeks of targeted practice";
  else if (readinessScore >= 50) estimatedPrepTime = "Significant — 4-8 weeks of focused preparation";
  else estimatedPrepTime = "Substantial — 8-12 weeks of intensive skill building";

  let currentLevel: string;
  let nextLevel: string;
  let progressPercentage: number;

  if (tier === "excellent") {
    currentLevel = "Interview-Ready (Top Tier)";
    nextLevel = "Consistently excellent across all interview types";
    progressPercentage = 90;
  } else if (tier === "strong") {
    currentLevel = "Interview-Ready";
    nextLevel = "Interview-Ready (Top Tier)";
    progressPercentage = 70 + Math.round((overallScore - 72) / 13 * 20);
  } else if (tier === "moderate") {
    currentLevel = "Developing";
    nextLevel = "Interview-Ready";
    progressPercentage = 45 + Math.round((overallScore - 58) / 14 * 25);
  } else if (tier === "developing") {
    currentLevel = "Early Stage";
    nextLevel = "Developing";
    progressPercentage = 20 + Math.round((overallScore - 40) / 18 * 25);
  } else {
    currentLevel = "Foundation Building";
    nextLevel = "Early Stage";
    progressPercentage = Math.round(overallScore / 40 * 20);
  }

  const keyMilestones: string[] = [];
  if (subScores.communication < 70) keyMilestones.push("Master STAR format for behavioral questions");
  if (subScores.technical < 70) keyMilestones.push("Complete focused study on core technical topics");
  if (subScores.problemSolving < 70) keyMilestones.push("Practice 20+ structured problem-solving exercises");
  if (subScores.confidence < 60) keyMilestones.push("Complete 5+ mock interviews to build confidence");
  if (gaps.length === 0) keyMilestones.push("Maintain consistency across different interview formats");

  const systemPrompt = `You are an expert career advisor and placement readiness assessor.

CANDIDATE ASSESSMENT:
- Overall Score: ${overallScore}/100
- Communication: ${subScores.communication}/100
- Technical: ${subScores.technical}/100
- Confidence: ${subScores.confidence}/100
- Problem Solving: ${subScores.problemSolving}/100
- Leadership: ${subScores.leadership}/100
- Role Fit: ${subScores.roleFit}/100

STRENGTHS: ${evaluation.strengths.join("; ")}
WEAKNESSES: ${evaluation.weaknesses.join("; ")}

INTERVIEW METRICS:
- Questions: ${questionCount} | Answers: ${answerCount} | Completion: ${Math.round(completionRate * 100)}%
- Avg Answer Length: ${Math.round(avgAnswerLength)} chars

PRE-COMPUTED:
- Tier: ${tier}
- Readiness Score: ${readinessScore}
- Ready: ${ready}
- Gaps: ${gaps.length}

TASK: Refine this placement readiness assessment. Provide:
1. Candid recommendation string
2. Specific strengths and gaps
3. Tier-specific target company recommendations
4. Realistic prep time estimate
5. Trajectory analysis based on sub-scores

Return as JSON:
{
  "ready": boolean,
  "readinessScore": number (0-100),
  "tier": "excellent|strong|moderate|developing|needs-work",
  "strengths": ["strength1", ...],
  "gaps": ["gap1", ...],
  "recommendation": "2-3 sentence candid assessment with specific next steps",
  "targetCompanies": ["tier1", "tier2", ...],
  "estimatedPrepTime": "realistic time estimate",
  "milestoneTracking": {
    "currentLevel": "current level",
    "nextLevel": "next milestone",
    "progressPercentage": number (0-100),
    "keyMilestones": ["milestone1", ...]
  },
  "trendAnalysis": {
    "improving": ["area showing strength"],
    "declining": ["area needing attention"],
    "stable": ["area at consistent level"],
    "trajectory": "upward|flat|declining"
  }
}`;

  const fallback: PlacementReadiness = {
    ready,
    readinessScore,
    tier,
    strengths,
    gaps,
    recommendation: readinessScore >= 70
      ? `Strong placement readiness at ${readinessScore}/100. Focus on polishing weak areas and targeting ${readinessScore >= 80 ? "top-tier" : "mid-tier"} companies. Continue practicing to maintain standing.`
      : readinessScore >= 50
        ? `Moderate placement readiness at ${readinessScore}/100. Address identified gaps before targeting interviews. Consider ${estimatedPrepTime} of focused preparation.`
        : `Early-stage readiness at ${readinessScore}/100. Significant preparation needed. Focus on fundamentals and build a structured practice routine.`,
    targetCompanies,
    estimatedPrepTime,
    milestoneTracking: { currentLevel, nextLevel, progressPercentage, keyMilestones },
    trendAnalysis: {
      improving: evaluation.strengths.slice(0, 2),
      declining: evaluation.weaknesses.slice(0, 2),
      stable: ["General engagement"],
      trajectory: overallScore >= 70 ? "upward" : overallScore >= 50 ? "flat" : "declining",
    },
  };

  try {
    const result = await generateJSON<PlacementReadiness>(
      systemPrompt,
      "Generate a comprehensive placement readiness assessment based on the provided evaluation data. Ensure all fields are populated with specific, actionable insights.",
      { model: MODELS.FAST, temperature: 0.3, maxTokens: 4096 },
      fallback
    );

    result.readinessScore = Math.max(0, Math.min(100, Math.round(result.readinessScore)));
    if (result.milestoneTracking) {
      result.milestoneTracking.progressPercentage = Math.max(0, Math.min(100, Math.round(result.milestoneTracking.progressPercentage)));
    }

    console.log(`[Engine] Placement readiness assessed — Score: ${result.readinessScore}/100 | Tier: ${result.tier} | Ready: ${result.ready}`);
    return result;
  } catch (error) {
    console.error(`[Engine] Placement readiness generation failed, using fallback:`, error);
    return fallback;
  }
}
