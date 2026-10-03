import { generateJSON, MODELS } from "./openrouter";

export interface ComprehensiveEvaluation {
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
}

export async function generateComprehensiveEvaluation(
  role: string,
  company: string | null,
  type: string,
  difficulty: string,
  messages: Array<{ role: string; content: string }>,
  basicFeedback: {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    areasForImprovement: string[];
  }
): Promise<ComprehensiveEvaluation> {
  const candidateMessages = messages.filter((m) => m.role === "candidate" || m.role === "user");
  if (candidateMessages.length === 0) {
    return {
      overallScore: 0,
      communicationScore: 0,
      technicalScore: 0,
      hrScore: 0,
      confidenceScore: 0,
      fluencyScore: 0,
      bodyLanguageScore: 0,
      strengths: ["Session initialized"],
      weaknesses: ["No candidate responses recorded in transcript"],
      improvements: ["Provide verbal or written responses to interview questions"],
      summary: "Interview concluded with no candidate responses recorded.",
      hiringRecommendation: "do_not_recommend",
      detailedAnalysis: {
        answerQuality: 0,
        technicalDepth: 0,
        communicationClarity: 0,
        problemSolving: 0,
        culturalFit: 0,
      },
    };
  }

  const conversation = messages
    .filter((m) => m.role !== "feedback")
    .map((m) => `[${m.role === "interviewer" ? "Interviewer" : "Candidate"}]: ${m.content}`)
    .join("\n\n");

  const prompt = `You are a senior hiring manager conducting a comprehensive evaluation of a ${type} interview for a ${role} position${company ? ` at ${company}` : ""}.

Difficulty Level: ${difficulty}

Interview Transcript:
"""
${conversation}
"""

Initial AI Feedback Summary:
- Score: ${basicFeedback.overallScore}/100
- Strengths: ${basicFeedback.strengths.join(", ")}
- Weaknesses: ${basicFeedback.weaknesses.join(", ")}

Provide a thorough, structured evaluation as JSON:
{
  "overallScore": integer 0-100,
  "communicationScore": integer 0-100 (clarity, articulation, structure of answers),
  "technicalScore": integer 0-100 or null (if not a technical interview),
  "hrScore": integer 0-100 (behavioral fit, culture alignment, soft skills),
  "confidenceScore": integer 0-100 (poise, self-assurance, composure),
  "fluencyScore": integer 0-100 (flow of speech, minimal hesitation, coherence),
  "bodyLanguageScore": integer 0-100 (eye contact, posture, gestures — from text cues),
  "strengths": array of 3-5 specific strengths with examples from the transcript,
  "weaknesses": array of 3-5 specific weaknesses with examples,
  "improvements": array of 3-5 actionable improvement suggestions,
  "summary": string (2-3 sentence executive summary),
  "hiringRecommendation": "strong_recommend" | "recommend" | "maybe" | "do_not_recommend",
  "detailedAnalysis": {
    "answerQuality": integer 0-100,
    "technicalDepth": integer 0-100,
    "communicationClarity": integer 0-100,
    "problemSolving": integer 0-100,
    "culturalFit": integer 0-100
  }
}

Be specific and reference actual responses from the candidate. Avoid generic feedback.`;

  const fallback: ComprehensiveEvaluation = {
    overallScore: basicFeedback.overallScore,
    communicationScore: Math.min(100, basicFeedback.overallScore + 5),
    technicalScore: type === "technical" ? basicFeedback.overallScore : null,
    hrScore: type === "behavioral" ? basicFeedback.overallScore : null,
    confidenceScore: Math.min(100, basicFeedback.overallScore - 3),
    fluencyScore: Math.min(100, basicFeedback.overallScore + 2),
    bodyLanguageScore: Math.min(100, basicFeedback.overallScore - 5),
    strengths: basicFeedback.strengths,
    weaknesses: basicFeedback.weaknesses,
    improvements: basicFeedback.areasForImprovement,
    summary: `Candidate demonstrated a ${basicFeedback.overallScore >= 70 ? "solid" : "developing"} performance in this ${type} interview for a ${role} role.`,
    hiringRecommendation:
      basicFeedback.overallScore >= 80
        ? "strong_recommend"
        : basicFeedback.overallScore >= 60
        ? "recommend"
        : basicFeedback.overallScore >= 40
        ? "maybe"
        : "do_not_recommend",
    detailedAnalysis: {
      answerQuality: basicFeedback.overallScore,
      technicalDepth: type === "technical" ? basicFeedback.overallScore - 5 : 50,
      communicationClarity: Math.min(100, basicFeedback.overallScore + 3),
      problemSolving: basicFeedback.overallScore - 2,
      culturalFit: Math.min(100, basicFeedback.overallScore + 5),
    },
  };

  try {
    return await generateJSON<ComprehensiveEvaluation>(
      "You are an expert hiring manager and interview evaluator. Output only valid JSON.",
      prompt,
      { model: MODELS.BALANCED },
      fallback
    );
  } catch (error) {
    console.error("[Evaluation] AI evaluation failed, using fallback:", error);
    return fallback;
  }
}
