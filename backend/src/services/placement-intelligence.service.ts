import { getUserPrisma } from "../config/dynamicPrisma";

interface SubScores {
  coding: number;
  aptitude: number;
  interview: number;
  resume: number;
  learning: number;
  softSkills: number;
}

interface CompanyMatch {
  company: string;
  matchPercent: number;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  difficulty: string;
  avgPackage: string;
}

interface SkillWeight {
  skill: string;
  weight: number;
  direction: "positive" | "negative";
  source: string;
}

interface PlacementRecommendation {
  type: string;
  title: string;
  description: string;
  impact: string;
  estimatedImprovement: number;
  action: string;
  icon: string;
  color: string;
}

interface HighestImpactTask {
  title: string;
  description: string;
  estimatedImpact: number;
  category: string;
  action: string;
}

interface SalaryEstimate {
  min: number;
  max: number;
  median: number;
  confidence: string;
  basedOn: string;
}

interface ReadinessTimelineEntry {
  stage: string;
  completed: boolean;
  score: number;
  description: string;
}

interface PlacementIntelligenceResult {
  placementScore: number;
  subScores: SubScores;
  companyMatches: CompanyMatch[];
  skillWeights: SkillWeight[];
  strengths: string[];
  weaknesses: string[];
  recommendations: PlacementRecommendation[];
  highestImpactTask: HighestImpactTask | null;
  salaryEstimate: SalaryEstimate;
  readinessTimeline: ReadinessTimelineEntry[];
  aiInsights: any;
}

const COMPANY_PRESETS: Record<string, { skills: string[]; difficulty: string; avgPackage: string }> = {
  "TCS": { skills: ["aptitude", "logical_reasoning", "verbal", "coding_basics", "sql"], difficulty: "easy", avgPackage: "3.5-7 LPA" },
  "Infosys": { skills: ["aptitude", "logical_reasoning", "verbal", "programming", "database"], difficulty: "easy", avgPackage: "3.6-8 LPA" },
  "Wipro": { skills: ["aptitude", "logical_reasoning", "coding_basics", "web_fundamentals"], difficulty: "easy", avgPackage: "3.5-6.5 LPA" },
  "HCLTech": { skills: ["aptitude", "logical_reasoning", "verbal", "coding_basics"], difficulty: "easy", avgPackage: "3.5-7 LPA" },
  "Tech Mahindra": { skills: ["aptitude", "logical_reasoning", "verbal", "sql", "java_basics"], difficulty: "medium", avgPackage: "4-8 LPA" },
  "Cognizant": { skills: ["aptitude", "logical_reasoning", "programming", "web_development"], difficulty: "medium", avgPackage: "4-8 LPA" },
  "Capgemini": { skills: ["aptitude", "logical_reasoning", "verbal", "technical"], difficulty: "medium", avgPackage: "4-7 LPA" },
  "Amazon": { skills: ["dsa", "system_design", "coding", "problem_solving", "algorithms"], difficulty: "hard", avgPackage: "25-50 LPA" },
  "Google": { skills: ["dsa", "algorithms", "system_design", "coding", "math"], difficulty: "hard", avgPackage: "30-60 LPA" },
  "Microsoft": { skills: ["dsa", "system_design", "coding", "problem_solving"], difficulty: "hard", avgPackage: "25-45 LPA" },
  "Flipkart": { skills: ["dsa", "system_design", "coding", "sql"], difficulty: "hard", avgPackage: "20-40 LPA" },
  "Zoho": { skills: ["programming", "aptitude", "logical_reasoning", "web_development"], difficulty: "medium", avgPackage: "5-12 LPA" },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export async function generatePlacementIntelligence(userId: string): Promise<PlacementIntelligenceResult> {
  const userPrisma = await getUserPrisma(userId);

  const [
    profile,
    resumes,
    atsReports,
    linkedinReports,
    studySessions,
    dsaProgress,
    weakTopics,
    codingSessions,
    submissions,
    challengeSubmissions,
    learningAnalytics,
    progressTracking,
    coverLetters,
    interviewSessions,
    topicProgress,
    aptitudeSessions,
    aptitudeAnalytics,
    placementSessions,
    mockTestResults,
    githubProfile,
    studyPlans,
    generatedNotes,
    quizzes,
    flashcards,
  ] = await Promise.all([
    userPrisma.profile.findUnique({ where: { userId } }).catch(() => null),
    userPrisma.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }).catch(() => []),
    userPrisma.aTSReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }).catch(() => []),
    userPrisma.linkedInReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }).catch(() => []),
    userPrisma.studySession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    userPrisma.dSAProgress.findUnique({ where: { userId } }).catch(() => null),
    userPrisma.weakTopic.findMany({ where: { userId }, orderBy: { strengthScore: "asc" }, take: 10 }).catch(() => []),
    userPrisma.codingSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    userPrisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    userPrisma.challengeSubmission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }).catch(() => []),
    userPrisma.learningAnalytics.findUnique({ where: { userId } }).catch(() => null),
    userPrisma.progressTracking.findUnique({ where: { userId } }).catch(() => null),
    userPrisma.coverLetter.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }).catch(() => []),
    userPrisma.interviewSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, include: { evaluations: true } }).catch(() => []),
    userPrisma.topicProgress.findMany({ where: { userId }, orderBy: { lastActivity: "desc" }, take: 20 }).catch(() => []),
    userPrisma.aptitudeSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    userPrisma.aptitudeAnalytics.findUnique({ where: { userId } }).catch(() => null),
    userPrisma.placementSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
    userPrisma.mockTestResult.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }).catch(() => []),
    userPrisma.githubProfile.findFirst({ where: { userId } }).catch(() => null),
    userPrisma.studyPlan.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }).catch(() => []),
    userPrisma.generatedNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }).catch(() => []),
    userPrisma.quiz.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }).catch(() => []),
    userPrisma.flashcard.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }).catch(() => []),
  ]);

  // ─── Compute Sub-Scores ──────────────────────────────────────
  const solvedSubmissions = submissions.filter((s: any) =>
    s.status === "Accepted" || s.status === "solved" || s.status === "accepted"
  );
  const dsaSolved = dsaProgress?.solved || 0;
  const dsaAccuracy = dsaProgress?.accuracy || 0;

  const codingScore = clamp(Math.round(
    Math.min(dsaSolved / 100, 1) * 35 +
    dsaAccuracy * 25 +
    Math.min(challengeSubmissions.length / 10, 1) * 20 +
    Math.min(codingSessions.length / 20, 1) * 10 +
    Math.min(solvedSubmissions.length / 30, 1) * 10
  ), 0, 100);

  const aptitudeScore = clamp(Math.round(
    aptitudeAnalytics?.placementReadiness || 0
  ) || Math.round(
    aptitudeSessions.length > 0
      ? (aptitudeSessions.reduce((s: number, sess: any) => s + (sess.accuracy || 0), 0) / aptitudeSessions.length) * 100
      : 0
  ), 0, 100);

  const completedInterviews = interviewSessions.filter((s: any) =>
    s.status === "completed" || s.status === "completed_with_feedback"
  );
  const avgInterviewScore = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((s: number, sess: any) => {
        const eval_ = sess.evaluations?.[0];
        return s + (eval_?.overallScore || 0);
      }, 0) / completedInterviews.length)
    : 0;

  const interviewScore = clamp(Math.round(
    Math.min(completedInterviews.length / 10, 1) * 50 +
    avgInterviewScore * 0.5
  ), 0, 100);

  const avgAtsScore = atsReports.length
    ? Math.round(atsReports.reduce((s: number, r: any) => s + (r.overallScore || r.score || 0), 0) / atsReports.length)
    : 0;

  const resumeScore = clamp(Math.round(
    (resumes.length > 0 ? 25 : 0) +
    avgAtsScore * 0.35 +
    (coverLetters.length > 0 ? 15 : 0) +
    (linkedinReports.length > 0 ? 15 : 0) +
    (githubProfile ? 10 : 0)
  ), 0, 100);

  const learningScore = clamp(Math.round(
    Math.min(studySessions.length / 20, 1) * 25 +
    Math.min(generatedNotes.length / 10, 1) * 15 +
    Math.min(quizzes.length / 10, 1) * 15 +
    Math.min(flashcards.length / 20, 1) * 10 +
    Math.min(topicProgress.filter((t: any) => t.progressPercentage >= 80).length / 5, 1) * 20 +
    (learningAnalytics?.learningScore || 0) * 0.15
  ), 0, 100);

  const latestLinkedinScore = linkedinReports.length > 0 ? linkedinReports[0].score : 0;
  const softSkillsScore = clamp(Math.round(
    latestLinkedinScore * 0.3 +
    (coverLetters.length > 0 ? 20 : 0) +
    (profile?.aboutMe ? 10 : 0) +
    (completedInterviews.length > 0 ? 20 : 0) +
    Math.min(studySessions.length / 15, 1) * 20
  ), 0, 100);

  // ─── Overall Placement Score ──────────────────────────────────
  const placementScore = clamp(Math.round(
    codingScore * 0.25 +
    aptitudeScore * 0.20 +
    interviewScore * 0.20 +
    resumeScore * 0.15 +
    learningScore * 0.10 +
    softSkillsScore * 0.10
  ), 0, 100);

  // ─── Company Matches ─────────────────────────────────────────
  const userSkills = new Set<string>();
  if (dsaSolved > 0) userSkills.add("dsa");
  if (dsaSolved > 10) userSkills.add("algorithms");
  if (dsaSolved > 20) userSkills.add("problem_solving");
  if (dsaAccuracy > 70) userSkills.add("coding");
  if (codingSessions.length > 5) userSkills.add("programming");
  if (aptitudeScore > 50) userSkills.add("aptitude");
  if (aptitudeScore > 40) userSkills.add("logical_reasoning");
  if (avgAtsScore > 50) userSkills.add("verbal");
  if (resumeScore > 50) userSkills.add("web_development");
  if (submissions.some((s: any) => s.language === "sql" || (s as any).language === "SQL")) userSkills.add("sql");
  if (submissions.some((s: any) => s.language === "java" || s.language === "Java")) userSkills.add("java_basics");
  if (submissions.some((s: any) => s.language === "python" || s.language === "Python")) userSkills.add("programming");
  if (codingSessions.length > 3) userSkills.add("web_fundamentals");
  if (dsaSolved > 50) userSkills.add("system_design");
  if (dsaSolved > 30) userSkills.add("database");

  const companyMatches: CompanyMatch[] = Object.entries(COMPANY_PRESETS).map(([company, preset]) => {
    const matchedSkills = preset.skills.filter(s => userSkills.has(s));
    const missingSkills = preset.skills.filter(s => !userSkills.has(s));
    const matchPercent = Math.round((matchedSkills.length / preset.skills.length) * 100);
    return {
      company,
      matchPercent,
      requiredSkills: preset.skills,
      matchedSkills,
      missingSkills,
      difficulty: preset.difficulty,
      avgPackage: preset.avgPackage,
    };
  }).sort((a, b) => b.matchPercent - a.matchPercent);

  // ─── Skill Weights ───────────────────────────────────────────
  const skillWeights: SkillWeight[] = [];

  if (dsaSolved > 0) {
    skillWeights.push({ skill: "DSA Problems Solved", weight: clamp(dsaSolved / 100, 0, 1), direction: "positive", source: "Coding Hub" });
  }
  if (dsaAccuracy > 0) {
    skillWeights.push({ skill: "Coding Accuracy", weight: clamp(dsaAccuracy / 100, 0, 1), direction: dsaAccuracy > 60 ? "positive" : "negative", source: "Coding Hub" });
  }
  if (aptitudeScore > 0) {
    skillWeights.push({ skill: "Aptitude Score", weight: clamp(aptitudeScore / 100, 0, 1), direction: aptitudeScore > 50 ? "positive" : "negative", source: "Aptitude Engine" });
  }
  if (avgInterviewScore > 0) {
    skillWeights.push({ skill: "Interview Performance", weight: clamp(avgInterviewScore / 100, 0, 1), direction: avgInterviewScore > 60 ? "positive" : "negative", source: "Interview Hub" });
  }
  if (avgAtsScore > 0) {
    skillWeights.push({ skill: "ATS Score", weight: clamp(avgAtsScore / 100, 0, 1), direction: avgAtsScore > 70 ? "positive" : "negative", source: "Resume Hub" });
  }
  if (latestLinkedinScore > 0) {
    skillWeights.push({ skill: "LinkedIn Profile", weight: clamp(latestLinkedinScore / 100, 0, 1), direction: latestLinkedinScore > 60 ? "positive" : "negative", source: "Career Hub" });
  }
  if (coverLetters.length > 0) {
    skillWeights.push({ skill: "Cover Letters", weight: clamp(coverLetters.length / 5, 0, 1), direction: "positive", source: "Resume Hub" });
  }
  if (githubProfile) {
    skillWeights.push({ skill: "GitHub Portfolio", weight: 0.7, direction: "positive", source: "Coding Hub" });
  }
  if (studySessions.length > 0) {
    skillWeights.push({ skill: "Learning Hours", weight: clamp(studySessions.length / 20, 0, 1), direction: "positive", source: "Learning Hub" });
  }
  if (challengeSubmissions.length > 0) {
    skillWeights.push({ skill: "Challenge Completion", weight: clamp(challengeSubmissions.length / 10, 0, 1), direction: "positive", source: "Coding Hub" });
  }
  if (topicProgress.filter((t: any) => t.masteryScore > 70).length > 0) {
    skillWeights.push({ skill: "Topic Mastery", weight: clamp(topicProgress.filter((t: any) => t.masteryScore > 70).length / 5, 0, 1), direction: "positive", source: "Learning Hub" });
  }
  weakTopics.slice(0, 3).forEach((w: any) => {
    skillWeights.push({ skill: `Weak: ${w.topicName}`, weight: clamp(1 - w.strengthScore / 100, 0, 1), direction: "negative", source: "Learning Hub" });
  });

  skillWeights.sort((a, b) => b.weight - a.weight);

  // ─── Strengths & Weaknesses ──────────────────────────────────
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (dsaSolved >= 50) strengths.push(`Solved ${dsaSolved} DSA problems — strong coding foundation`);
  if (dsaAccuracy > 75) strengths.push(`${dsaAccuracy}% coding accuracy — consistent problem solving`);
  if (avgAtsScore > 75) strengths.push(`${avgAtsScore}% ATS score — well-optimized resume`);
  if (latestLinkedinScore > 70) strengths.push(`${latestLinkedinScore}% LinkedIn score — strong professional brand`);
  if (avgInterviewScore > 70) strengths.push(`${avgInterviewScore}% interview score — strong communication`);
  if (aptitudeScore > 70) strengths.push(`${aptitudeScore}% aptitude readiness — solid analytical skills`);
  if (completedInterviews.length >= 5) strengths.push(`Completed ${completedInterviews.length} mock interviews — well-practiced`);
  if (coverLetters.length >= 3) strengths.push(`${coverLetters.length} cover letters generated — application-ready`);
  if (githubProfile) strengths.push("GitHub profile connected — portfolio showcase active");
  if (learningScore > 70) strengths.push(`${learningScore}% learning score — strong knowledge foundation`);

  if (codingScore < 30) weaknesses.push("Coding practice is below target — solve more DSA problems");
  if (aptitudeScore < 30) weaknesses.push("Aptitude score needs improvement — practice daily quizzes");
  if (interviewScore < 30) weaknesses.push("Interview readiness is low — schedule mock interviews");
  if (resumeScore < 30) weaknesses.push("Resume needs work — create or improve your resume");
  if (avgAtsScore < 60 && resumes.length > 0) weaknesses.push(`ATS score is ${avgAtsScore}% — optimize keywords and formatting`);
  if (latestLinkedinScore < 50) weaknesses.push("LinkedIn profile needs optimization");
  if (!githubProfile) weaknesses.push("GitHub not connected — missing portfolio evidence");
  if (coverLetters.length === 0) weaknesses.push("No cover letters generated — apply with personalized letters");
  if (dsaSolved < 20) weaknesses.push(`Only ${dsaSolved} DSA problems solved — target 50+ for placements`);
  weakTopics.slice(0, 3).forEach((w: any) => {
    weaknesses.push(`Weak in ${w.topicName} (score: ${w.strengthScore}%)`);
  });

  // ─── Recommendations ─────────────────────────────────────────
  const recommendations: PlacementRecommendation[] = [];

  if (codingScore < 50) {
    recommendations.push({
      type: "coding",
      title: "Boost Coding Skills",
      description: `You've solved ${dsaSolved} problems. Solving 2-3 daily can raise your placement score by ~8 points.`,
      impact: "high",
      estimatedImprovement: 8,
      action: "dsa-practice",
      icon: "code",
      color: "#f59e0b",
    });
  }
  if (aptitudeScore < 50) {
    recommendations.push({
      type: "aptitude",
      title: "Improve Aptitude Score",
      description: `Current aptitude readiness: ${aptitudeScore}%. Daily practice can improve accuracy by 15-20%.`,
      impact: "high",
      estimatedImprovement: 7,
      action: "aptitude-engine",
      icon: "brain",
      color: "#8b5cf6",
    });
  }
  if (interviewScore < 40) {
    recommendations.push({
      type: "interview",
      title: "Practice Mock Interviews",
      description: `Complete ${Math.max(0, 5 - completedInterviews.length)} more mock interviews to build confidence and score.`,
      impact: "high",
      estimatedImprovement: 6,
      action: "interview-hub",
      icon: "mic",
      color: "#f43f5e",
    });
  }
  if (resumeScore < 50) {
    recommendations.push({
      type: "resume",
      title: "Optimize Resume & ATS",
      description: `Your ATS score is ${avgAtsScore}%. Improving to 80%+ increases callbacks by 40%.`,
      impact: "high",
      estimatedImprovement: 5,
      action: "ats-checker",
      icon: "file",
      color: "#3b82f6",
    });
  }
  if (latestLinkedinScore > 0 && latestLinkedinScore < 70) {
    recommendations.push({
      type: "brand",
      title: "Strengthen LinkedIn Profile",
      description: `LinkedIn score: ${latestLinkedinScore}%. Optimizing increases recruiter visibility by 3x.`,
      impact: "medium",
      estimatedImprovement: 3,
      action: "linkedin-optimizer",
      icon: "globe",
      color: "#0077b5",
    });
  }
  if (!githubProfile) {
    recommendations.push({
      type: "portfolio",
      title: "Connect GitHub Portfolio",
      description: "A connected GitHub adds credibility. Recruiters check GitHub activity as a proxy for skill.",
      impact: "medium",
      estimatedImprovement: 3,
      action: "github-portfolio",
      icon: "globe",
      color: "#8b5cf6",
    });
  }
  if (learningScore < 40) {
    recommendations.push({
      type: "learning",
      title: "Build Learning Foundation",
      description: "Study sessions and notes strengthen your theoretical base. Aim for 20+ sessions.",
      impact: "medium",
      estimatedImprovement: 4,
      action: "study-assistant",
      icon: "book",
      color: "#8b5cf6",
    });
  }
  if (coverLetters.length === 0) {
    recommendations.push({
      type: "career",
      title: "Generate Cover Letters",
      description: "Customized cover letters increase interview chances by 50%. Generate your first one.",
      impact: "medium",
      estimatedImprovement: 2,
      action: "cover-letter",
      icon: "send",
      color: "#ec4899",
    });
  }

  recommendations.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement);

  // ─── Highest Impact Task ─────────────────────────────────────
  let highestImpactTask: HighestImpactTask | null = null;
  if (recommendations.length > 0) {
    const top = recommendations[0];
    highestImpactTask = {
      title: top.title,
      description: top.description,
      estimatedImpact: top.estimatedImprovement,
      category: top.type,
      action: top.action,
    };
  }

  // ─── Salary Estimate ─────────────────────────────────────────
  const baseSalary = placementScore >= 80 ? 12 : placementScore >= 60 ? 7 : placementScore >= 40 ? 4 : 2;
  const maxMultiplier = placementScore >= 80 ? 3.5 : placementScore >= 60 ? 2.5 : placementScore >= 40 ? 2 : 1.5;
  const salaryEstimate: SalaryEstimate = {
    min: baseSalary,
    max: Math.round(baseSalary * maxMultiplier),
    median: Math.round(baseSalary * (1 + maxMultiplier) / 2),
    confidence: placementScore >= 60 ? "high" : placementScore >= 30 ? "medium" : "low",
    basedOn: `Based on ${placementScore}% placement readiness across ${Object.keys(COMPANY_PRESETS).length} company benchmarks`,
  };

  // ─── Readiness Timeline ──────────────────────────────────────
  const readinessTimeline: ReadinessTimelineEntry[] = [
    {
      stage: "Foundation",
      completed: studySessions.length >= 5 && topicProgress.length >= 3,
      score: learningScore,
      description: "Basic learning, notes, and topic coverage",
    },
    {
      stage: "Technical Skills",
      completed: dsaSolved >= 30 && codingScore >= 40,
      score: codingScore,
      description: "DSA, coding challenges, and technical assessments",
    },
    {
      stage: "Aptitude",
      completed: aptitudeSessions.length >= 5 && aptitudeScore >= 50,
      score: aptitudeScore,
      description: "Quantitative, logical, and verbal reasoning",
    },
    {
      stage: "Resume & Profile",
      completed: resumes.length > 0 && avgAtsScore >= 70,
      score: resumeScore,
      description: "ATS-optimized resume and professional profiles",
    },
    {
      stage: "Interview Ready",
      completed: completedInterviews.length >= 5 && avgInterviewScore >= 60,
      score: interviewScore,
      description: "Mock interviews and communication skills",
    },
    {
      stage: "Placement Ready",
      completed: placementScore >= 70,
      score: placementScore,
      description: "Overall readiness for campus placement",
    },
  ];

  // ─── AI Insights (pre-computed, no AI call for speed) ────────
  const aiInsights = {
    overallAssessment: placementScore >= 70
      ? "You are well-prepared for campus placements. Focus on refining weak areas and target top-tier companies."
      : placementScore >= 40
      ? "You are making solid progress. Continue consistent practice across all areas for 2-3 more weeks."
      : "You are in the early stages. Prioritize building foundations in coding and aptitude before targeting companies.",
    biggestStrength: strengths.length > 0 ? strengths[0] : "Just getting started",
    biggestWeakness: weaknesses.length > 0 ? weaknesses[0] : "No data yet — start practicing",
    estimatedWeeksToReady: placementScore >= 70 ? 1 : placementScore >= 50 ? 3 : placementScore >= 30 ? 6 : 10,
    targetCompanies: companyMatches.filter(c => c.matchPercent >= 50).slice(0, 5).map(c => c.company),
  };

  return {
    placementScore,
    subScores: {
      coding: codingScore,
      aptitude: aptitudeScore,
      interview: interviewScore,
      resume: resumeScore,
      learning: learningScore,
      softSkills: softSkillsScore,
    },
    companyMatches,
    skillWeights,
    strengths: strengths.slice(0, 8),
    weaknesses: weaknesses.slice(0, 8),
    recommendations: recommendations.slice(0, 8),
    highestImpactTask,
    salaryEstimate,
    readinessTimeline,
    aiInsights,
  };
}

export async function getOrGeneratePlacementIntelligence(userId: string): Promise<PlacementIntelligenceResult & { cached: boolean }> {
  const userPrisma = await getUserPrisma(userId);

  const existing = await userPrisma.placementIntelligence.findUnique({ where: { userId } }).catch(() => null);

  if (existing) {
    const lastCalculated = new Date(existing.lastCalculatedAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - lastCalculated < fiveMinutes) {
      return {
        placementScore: existing.placementScore,
        subScores: existing.subScores as unknown as SubScores,
        companyMatches: existing.companyMatches as unknown as CompanyMatch[],
        skillWeights: existing.skillWeights as unknown as SkillWeight[],
        strengths: existing.strengths as unknown as string[],
        weaknesses: existing.weaknesses as unknown as string[],
        recommendations: existing.recommendations as unknown as PlacementRecommendation[],
        highestImpactTask: existing.highestImpactTask as unknown as HighestImpactTask | null,
        salaryEstimate: existing.salaryEstimate as unknown as SalaryEstimate,
        readinessTimeline: existing.readinessTimeline as unknown as ReadinessTimelineEntry[],
        aiInsights: existing.aiInsights,
        cached: true,
      };
    }
  }

  const intelligence = await generatePlacementIntelligence(userId);

  await userPrisma.placementIntelligence.upsert({
    where: { userId },
    create: {
      userId,
      placementScore: intelligence.placementScore,
      subScores: intelligence.subScores as any,
      companyMatches: intelligence.companyMatches as any,
      skillWeights: intelligence.skillWeights as any,
      strengths: intelligence.strengths as any,
      weaknesses: intelligence.weaknesses as any,
      recommendations: intelligence.recommendations as any,
      highestImpactTask: intelligence.highestImpactTask as any,
      salaryEstimate: intelligence.salaryEstimate as any,
      readinessTimeline: intelligence.readinessTimeline as any,
      aiInsights: intelligence.aiInsights as any,
      lastCalculatedAt: new Date(),
    },
    update: {
      placementScore: intelligence.placementScore,
      subScores: intelligence.subScores as any,
      companyMatches: intelligence.companyMatches as any,
      skillWeights: intelligence.skillWeights as any,
      strengths: intelligence.strengths as any,
      weaknesses: intelligence.weaknesses as any,
      recommendations: intelligence.recommendations as any,
      highestImpactTask: intelligence.highestImpactTask as any,
      salaryEstimate: intelligence.salaryEstimate as any,
      readinessTimeline: intelligence.readinessTimeline as any,
      aiInsights: intelligence.aiInsights as any,
      lastCalculatedAt: new Date(),
    },
  });

  return { ...intelligence, cached: false };
}

export async function refreshPlacementIntelligence(userId: string): Promise<PlacementIntelligenceResult> {
  const userPrisma = await getUserPrisma(userId);

  await userPrisma.placementIntelligence.delete({ where: { userId } }).catch(() => {});

  return generatePlacementIntelligence(userId);
}

export async function getCompanyMatchDetails(userId: string, company: string): Promise<CompanyMatch | null> {
  const intelligence = await generatePlacementIntelligence(userId);
  return intelligence.companyMatches.find(c => c.company === company) || null;
}
