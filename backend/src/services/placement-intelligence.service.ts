import { getUserPrisma } from "../config/dynamicPrisma";
import { DsaProgressService } from "./dsa-progress.service";
import { detectDomainTrack, DomainTrack } from "../utils/domain-track";
import { emitNotification } from "../lib/notificationEmitter";

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

interface EligibilityGate {
  value: number;
  min: number;
}

export interface EligibilityInfo {
  verdict: "eligible" | "not_eligible" | "insufficient_data";
  score: number;
  threshold: number;
  pointsToGo: number;
  gates: {
    coding: EligibilityGate;
    aptitude: EligibilityGate;
    interview: EligibilityGate;
    resume: EligibilityGate;
  };
  blockers: string[];
  nextAction: string;
  title: string;
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
  eligibility: EligibilityInfo;
}

export const ELIGIBILITY_OVERALL_THRESHOLD = 85;

export function computeEligibility(
  placementScore: number,
  subScores: SubScores,
  hasData: boolean,
  nextAction: string = "",
  domainTrack: DomainTrack = "tech"
): EligibilityInfo {
  const round = Math.round(placementScore || 0);

  // Domain-Adaptive Gates: Non-coding domains don't get blocked by LeetCode/DSA coding gate
  let gateMins = { coding: 50, aptitude: 50, interview: 40, resume: 50 };
  if (domainTrack === "management") {
    gateMins = { coding: 0, aptitude: 60, interview: 50, resume: 50 };
  } else if (domainTrack === "core_engineering") {
    gateMins = { coding: 0, aptitude: 55, interview: 45, resume: 50 };
  }

  const gates: EligibilityInfo["gates"] = {
    coding: { value: Math.round(subScores?.coding || 0), min: gateMins.coding },
    aptitude: { value: Math.round(subScores?.aptitude || 0), min: gateMins.aptitude },
    interview: { value: Math.round(subScores?.interview || 0), min: gateMins.interview },
    resume: { value: Math.round(subScores?.resume || 0), min: gateMins.resume },
  };
  const pointsToGo = Math.max(0, ELIGIBILITY_OVERALL_THRESHOLD - round);

  if (!hasData) {
    return {
      verdict: "insufficient_data",
      score: round,
      threshold: ELIGIBILITY_OVERALL_THRESHOLD,
      pointsToGo,
      gates,
      blockers: [],
      nextAction,
      title: "Aapki eligibility data incomplete hai — pehle kuch practice sessions complete karo",
    };
  }

  // Only fail gates that have a positive threshold required for that domain
  const gateFails = (Object.keys(gates) as (keyof typeof gates)[])
    .filter((key) => gates[key].min > 0 && gates[key].value < gates[key].min)
    .map((key) => `${key[0].toUpperCase() + key.slice(1)}: ${gates[key].value}/${gates[key].min}`);

  const overallMet = round >= ELIGIBILITY_OVERALL_THRESHOLD;

  if (overallMet && gateFails.length === 0) {
    return {
      verdict: "eligible",
      score: round,
      threshold: ELIGIBILITY_OVERALL_THRESHOLD,
      pointsToGo: 0,
      gates,
      blockers: [],
      nextAction,
      title: "Aap campus placements ke liye eligible ho — momentum banaaye rakho!",
    };
  }

  const blockers: string[] = [];
  if (!overallMet) blockers.push(`Overall score: ${round}/${ELIGIBILITY_OVERALL_THRESHOLD} (${pointsToGo} points to go)`);
  blockers.push(...gateFails);

  return {
    verdict: "not_eligible",
    score: round,
    threshold: ELIGIBILITY_OVERALL_THRESHOLD,
    pointsToGo,
    gates,
    blockers: blockers.slice(0, 4),
    nextAction,
    title: pointsToGo > 0 ? `${pointsToGo} points to eligible` : "Close — har gate ko apne minimum tak pahunchao",
  };
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
    candidateProfile,
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
    coverLetters,
    interviewSessions,
    topicProgress,
    aptitudeSessions,
    aptitudeAnalytics,
    placementSessions,
    mockTestResults,
    githubProfile,
    generatedNotes,
    quizzes,
    flashcards,
    uploadedResumes,
    existingPlacement,
    solvedQuestionProgress,
    directDsaProgress,
  ] = await Promise.all([
    userPrisma.profile.findUnique({
      where: { userId },
      select: { github: true, resumeUrl: true, aboutMe: true, domain: true, degree: true, branch: true, track: true },
    }).catch(() => null),
    userPrisma.candidateProfile.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { strengthScore: true },
    }).catch(() => null),
    userPrisma.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true } }).catch(() => []),
    userPrisma.aTSReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { overallScore: true, score: true } }).catch(() => []),
    userPrisma.linkedInReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5, select: { score: true, visibilityScore: true } }).catch(() => []),
    userPrisma.studySession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true } }).catch(() => []),
    DsaProgressService.calculateAndSyncProgress(userId, userPrisma).catch(() => null),
    userPrisma.weakTopic.findMany({ where: { userId }, orderBy: { strengthScore: "asc" }, take: 10, select: { topicName: true, strengthScore: true } }).catch(() => []),
    userPrisma.codingSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true } }).catch(() => []),
    userPrisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { status: true, language: true } }).catch(() => []),
    userPrisma.challengeSubmission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true } }).catch(() => []),
    userPrisma.learningAnalytics.findUnique({ where: { userId }, select: { learningScore: true } }).catch(() => null),
    userPrisma.coverLetter.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true } }).catch(() => []),
    userPrisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        status: true,
        feedback: true,
        evaluations: { select: { overallScore: true } },
      },
    }).catch(() => []),
    userPrisma.topicProgress.findMany({
      where: { userId },
      orderBy: { lastActivity: "desc" },
      take: 20,
      select: { progressPercentage: true, masteryScore: true },
    }).catch(() => []),
    userPrisma.aptitudeSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { accuracy: true } }).catch(() => []),
    userPrisma.aptitudeAnalytics.findUnique({ where: { userId }, select: { placementReadiness: true } }).catch(() => null),
    userPrisma.placementSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true } }).catch(() => []),
    userPrisma.mockTestResult.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true } }).catch(() => []),
    userPrisma.githubProfile.findFirst({ where: { userId }, select: { id: true } }).catch(() => null),
    userPrisma.generatedNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true } }).catch(() => []),
    userPrisma.quiz.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true } }).catch(() => []),
    userPrisma.flashcard.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true } }).catch(() => []),
    userPrisma.uploadedResume.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true } }).catch(() => []),
    userPrisma.placementIntelligence.findUnique({ where: { userId }, select: { placementScore: true, subScores: true } }).catch(() => null),
    userPrisma.userQuestionProgress.findMany({
      where: { userId, OR: [{ solved: true }, { status: { in: ["solved", "Solved", "SOLVED", "Accepted", "accepted"] } }] },
      select: { questionId: true },
    }).catch(() => []),
    userPrisma.dSAProgress.findFirst({ where: { userId } }).catch(() => null),
  ]);

  // ─── Compute Sub-Scores ──────────────────────────────────────
  const solvedSubmissions = submissions.filter((s: any) =>
    s.status === "Accepted" || s.status === "solved" || s.status === "accepted"
  );
  const totalDsaSolved = Math.max(
    dsaProgress?.solved || 0,
    Number(directDsaProgress?.solved || 0),
    solvedQuestionProgress?.length || 0,
    solvedSubmissions.length
  );
  const dsaSolved = totalDsaSolved;
  const rawDsaAcc = dsaProgress?.accuracy || directDsaProgress?.accuracy || 0;
  const dsaAccuracy = rawDsaAcc > 1 ? rawDsaAcc / 100 : rawDsaAcc;
  const normalizedDsaAccuracy = dsaAccuracy > 0 ? dsaAccuracy : (totalDsaSolved > 0 ? 0.75 : 0);
  const hasGithub = Boolean(githubProfile || (profile?.github && profile.github.trim()));

  // Progressive DSA volume scaling: 0-25 -> up to 35 pts, 26-75 -> up to 25 pts, 76-150 -> up to 15 pts (max 75 pts from volume)
  const dsaVolumeScore = Math.min(totalDsaSolved, 25) * (35 / 25)
    + Math.max(0, Math.min(totalDsaSolved - 25, 50)) * (25 / 50)
    + Math.max(0, Math.min(totalDsaSolved - 75, 75)) * (15 / 75);
  const dsaStreak = Number(dsaProgress?.streak || directDsaProgress?.streak || 0);
  const dsaStreakBonus = Math.min(5, Math.round(dsaStreak * 0.75));

  const codingScore = clamp(Math.round(
    dsaVolumeScore +
    normalizedDsaAccuracy * 20 +
    dsaStreakBonus +
    Math.min(challengeSubmissions.length / 5, 1) * 10 +
    Math.min(codingSessions.length / 10, 1) * 5 +
    (hasGithub ? 5 : 0)
  ), 0, 100);

  const avgAptitudeSessionAcc = aptitudeSessions.length > 0
    ? aptitudeSessions.reduce((s: number, sess: any) => {
        const raw = Number(sess.accuracy || 0);
        return s + (raw > 1 ? raw : raw * 100);
      }, 0) / aptitudeSessions.length
    : 0;

  const aptitudeScore = clamp(Math.round(
    aptitudeAnalytics?.placementReadiness || 0
  ) || Math.round(avgAptitudeSessionAcc), 0, 100);

  const completedInterviews = interviewSessions.filter((s: any) =>
    s.status === "completed" || s.status === "completed_with_feedback"
  );

  // Candidates are evaluated for placement readiness on their BEST interview score, not penalized by earlier practice attempts
  const allInterviewScores: number[] = [];
  completedInterviews.forEach((sess: any) => {
    const sc = Number(sess.evaluations?.[0]?.overallScore || sess.overallScore || 0);
    if (!isNaN(sc) && sc > 0) allInterviewScores.push(sc);
    const fb = Number(sess.feedback?.overallScore ?? sess.feedback?.score ?? 0);
    if (!isNaN(fb) && fb > 0) allInterviewScores.push(fb);
  });
  interviewSessions.forEach((sess: any) => {
    (sess.evaluations || []).forEach((ev: any) => {
      const sc = Number(ev.overallScore || 0);
      if (!isNaN(sc) && sc > 0) allInterviewScores.push(sc);
    });
    if (sess.overallScore && Number(sess.overallScore) > 0) {
      allInterviewScores.push(Number(sess.overallScore));
    }
    const fb = Number(sess.feedback?.overallScore ?? sess.feedback?.score ?? 0);
    if (!isNaN(fb) && fb > 0) allInterviewScores.push(fb);
  });

  const bestInterviewScore = allInterviewScores.length > 0 ? Math.max(...allInterviewScores) : 0;
  const avgInterviewScore = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((s: number, sess: any) => {
        const eval_ = sess.evaluations?.[0];
        const sc = Number(eval_?.overallScore || sess.overallScore || sess.feedback?.overallScore || sess.feedback?.score || 0);
        return s + sc;
      }, 0) / completedInterviews.length)
    : 0;

  // Placement readiness interview score: counted using the candidate's BEST interview score,
  // matching how resume score is driven by the highest ATS score.
  const interviewBonus = completedInterviews.length >= 10 ? 17 : (completedInterviews.length > 0 ? 15 : 0);
  const interviewScore = clamp(Math.round(
    bestInterviewScore > 0
      ? Math.max(
          bestInterviewScore,
          Math.min(100, Math.round(bestInterviewScore * 0.85 + interviewBonus))
        )
      : (completedInterviews.length > 0 ? 50 : 0)
  ), 0, 100);

  // Candidates apply for placements using their HIGHEST scoring resume, not the average of draft attempts
  const allAtsScores = atsReports
    .map((r: any) => Number(r.overallScore ?? r.score ?? 0))
    .filter((s: number) => !isNaN(s) && s > 0);

  if (candidateProfile?.strengthScore && Number(candidateProfile.strengthScore) > 0) {
    allAtsScores.push(Number(candidateProfile.strengthScore));
  }

  const highestAtsScore = allAtsScores.length > 0 ? Math.max(...allAtsScores) : 0;
  const avgAtsScore = atsReports.length
    ? Math.round(atsReports.reduce((s: number, r: any) => s + Number(r.overallScore ?? r.score ?? 0), 0) / atsReports.length)
    : (candidateProfile?.strengthScore || 0);

  const totalResumes = resumes.length + (uploadedResumes?.length || 0);

  const portfolioBonus =
    (coverLetters.length > 0 ? 10 : 0) +
    (linkedinReports.length > 0 ? 10 : 0) +
    (hasGithub ? 5 : 0);

  // Resume score feeds directly into placementScore, driven primarily by the user's highest ATS score
  const resumeScore = clamp(Math.round(
    highestAtsScore > 0
      ? Math.max(
          highestAtsScore,
          Math.min(100, Math.round(highestAtsScore * 0.85 + portfolioBonus + (totalResumes > 0 ? 10 : 0)))
        )
      : ((totalResumes > 0 || profile?.resumeUrl) ? 55 + portfolioBonus : 0)
  ), 0, 100);

  const learningScore = clamp(Math.round(
    Math.max(50,
      Math.min(studySessions.length / 20, 1) * 25 +
      Math.min(generatedNotes.length / 10, 1) * 15 +
      Math.min(quizzes.length / 10, 1) * 15 +
      Math.min(flashcards.length / 20, 1) * 10 +
      Math.min(topicProgress.filter((t: any) => t.progressPercentage >= 80).length / 5, 1) * 20 +
      (learningAnalytics?.learningScore || 0) * 0.15
    )
  ), 0, 100);

  const latestLinkedinScore = linkedinReports.length > 0 ? Number(linkedinReports[0].score ?? linkedinReports[0].visibilityScore ?? 0) : 0;
  const softSkillsScore = clamp(Math.round(
    Math.max(50,
      latestLinkedinScore * 0.3 +
      (coverLetters.length > 0 ? 20 : 0) +
      (profile?.aboutMe ? 10 : 0) +
      (completedInterviews.length > 0 ? 20 : 0) +
      Math.min(studySessions.length / 15, 1) * 20
    )
  ), 0, 100);

  // ─── Domain-Adaptive Overall Placement Score ──────────────────
  const domainTrack = detectDomainTrack(profile);

  let placementScore = 0;
  if (domainTrack === "management") {
    // Management: Domain Knowledge & Aptitude (35%), Interviews & Communication (25%), Resume & ATS (20%), Soft Skills (10%), Learning (10%)
    // Any coding done acts as positive bonus (up to 5 points)
    const baseScore = Math.round(
      aptitudeScore * 0.35 +
      interviewScore * 0.25 +
      resumeScore * 0.20 +
      softSkillsScore * 0.10 +
      learningScore * 0.10
    );
    const techBonus = codingScore > 0 ? Math.min(5, Math.round(codingScore * 0.05)) : 0;
    placementScore = clamp(baseScore + techBonus, 0, 100);
  } else if (domainTrack === "core_engineering") {
    // Core Engineering: Core Technical & Aptitude (35%), Learning & Projects (20%), Technical Interviews (20%), Resume & ATS (15%), Soft Skills (10%)
    const baseScore = Math.round(
      aptitudeScore * 0.35 +
      learningScore * 0.20 +
      interviewScore * 0.20 +
      resumeScore * 0.15 +
      softSkillsScore * 0.10
    );
    const codingBonus = codingScore > 0 ? Math.min(5, Math.round(codingScore * 0.05)) : 0;
    placementScore = clamp(baseScore + codingBonus, 0, 100);
  } else {
    // Standard Tech/Software track
    placementScore = clamp(Math.round(
      codingScore * 0.25 +
      aptitudeScore * 0.20 +
      interviewScore * 0.20 +
      resumeScore * 0.15 +
      learningScore * 0.10 +
      softSkillsScore * 0.10
    ), 0, 100);
  }

  // ─── Company Matches ─────────────────────────────────────────
  const userSkills = new Set<string>();
  if (dsaSolved > 0) userSkills.add("dsa");
  if (dsaSolved > 10) userSkills.add("algorithms");
  if (dsaSolved > 20) userSkills.add("problem_solving");
  if (dsaAccuracy > 70) userSkills.add("coding");
  if (codingSessions.length > 5) userSkills.add("programming");
  if (aptitudeScore > 50) userSkills.add("aptitude");
  if (aptitudeScore > 40) userSkills.add("logical_reasoning");
  if (highestAtsScore > 50) userSkills.add("verbal");
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
  if (bestInterviewScore > 0) {
    skillWeights.push({ skill: "Interview Performance", weight: clamp(bestInterviewScore / 100, 0, 1), direction: bestInterviewScore > 60 ? "positive" : "negative", source: "Interview Hub" });
  }
  if (highestAtsScore > 0) {
    skillWeights.push({ skill: "ATS Score", weight: clamp(highestAtsScore / 100, 0, 1), direction: highestAtsScore > 70 ? "positive" : "negative", source: "Resume Hub" });
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
  if (highestAtsScore > 75) strengths.push(`${highestAtsScore}% ATS score (highest resume) — well-optimized resume`);
  if (latestLinkedinScore > 70) strengths.push(`${latestLinkedinScore}% LinkedIn score — strong professional brand`);
  if (bestInterviewScore > 70) strengths.push(`${bestInterviewScore}% best interview score — strong communication`);
  if (aptitudeScore > 70) strengths.push(`${aptitudeScore}% aptitude readiness — solid analytical skills`);
  if (completedInterviews.length >= 5) strengths.push(`Completed ${completedInterviews.length} mock interviews — well-practiced`);
  if (coverLetters.length >= 3) strengths.push(`${coverLetters.length} cover letters generated — application-ready`);
  if (hasGithub) strengths.push("GitHub profile connected — portfolio showcase active");
  if (learningScore > 70) strengths.push(`${learningScore}% learning score — strong knowledge foundation`);

  if (codingScore < 30) weaknesses.push("Coding practice is below target — solve more DSA problems");
  if (aptitudeScore < 30) weaknesses.push("Aptitude score needs improvement — practice daily quizzes");
  if (interviewScore < 30) weaknesses.push("Interview readiness is low — schedule mock interviews");
  if (resumeScore < 30) weaknesses.push("Resume needs work — create or improve your resume");
  if (highestAtsScore < 60 && totalResumes > 0) weaknesses.push(`Highest ATS score is ${highestAtsScore}% — optimize keywords and formatting`);
  if (latestLinkedinScore < 50) weaknesses.push("LinkedIn profile needs optimization");
  if (!hasGithub) weaknesses.push("GitHub not connected — missing portfolio evidence");
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
      description: `Your highest ATS score is ${highestAtsScore}%. Improving to 80%+ increases callbacks by 40%.`,
      impact: "high",
      estimatedImprovement: 5,
      action: "ats-checker",
      icon: "file",
      color: "#3b82f6",
    });
  }

  if (!hasGithub) {
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
      stage: domainTrack === "management" ? "Case & Domain Mastery" : domainTrack === "core_engineering" ? "Core Technical Fundamentals" : "Technical Skills",
      completed: domainTrack === "management"
        ? (aptitudeSessions.length >= 5 && aptitudeScore >= 50)
        : domainTrack === "core_engineering"
        ? (aptitudeSessions.length >= 5 && aptitudeScore >= 50)
        : (dsaSolved >= 30 && codingScore >= 40),
      score: domainTrack === "management" || domainTrack === "core_engineering" ? aptitudeScore : codingScore,
      description: domainTrack === "management"
        ? "Business math, case study problem solving, and domain MCQs"
        : domainTrack === "core_engineering"
        ? "Core engineering concepts, problem solving, and technical MCQs"
        : "DSA, coding challenges, and technical assessments",
    },
    {
      stage: "Aptitude",
      completed: aptitudeSessions.length >= 5 && aptitudeScore >= 50,
      score: aptitudeScore,
      description: "Quantitative, logical, and verbal reasoning",
    },
    {
      stage: "Resume & Profile",
      completed: (totalResumes > 0 || profile?.resumeUrl) && highestAtsScore >= 70,
      score: resumeScore,
      description: "ATS-optimized resume and professional profiles",
    },
    {
      stage: "Interview Ready",
      completed: (completedInterviews.length > 0 || bestInterviewScore > 0) && bestInterviewScore >= 60,
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

  const hasActivity =
    aptitudeSessions.length > 0 ||
    codingSessions.length > 0 ||
    challengeSubmissions.length > 0 ||
    submissions.length > 0 ||
    dsaSolved > 0 ||
    resumes.length > 0 ||
    completedInterviews.length > 0 ||
    placementSessions.length > 0 ||
    mockTestResults.length > 0 ||
    studySessions.length > 0;

  // High-Water Mark: placement score and sub-scores never drop below their historical best
  const prevPlacement = existingPlacement as any;
  const prevScore = Number(prevPlacement?.placementScore || 0);
  const prevSub = (prevPlacement?.subScores as any) || {};

  const finalAptitude = Math.max(aptitudeScore, Number(prevSub.aptitude || 0));
  const finalInterview = Math.max(interviewScore, Number(prevSub.interview || 0));
  const finalResume = Math.max(resumeScore, Number(prevSub.resume || 0));
  const finalLearning = Math.max(learningScore, Number(prevSub.learning || 0));
  const finalSoftSkills = Math.max(softSkillsScore, Number(prevSub.softSkills || 0));

  let finalCoding = Math.max(codingScore, Number(prevSub.coding || 0));
  if (domainTrack === "management") {
    finalCoding = Math.max(finalCoding, finalAptitude, finalLearning, 75);
  } else if (domainTrack === "core_engineering") {
    finalCoding = Math.max(finalCoding, finalAptitude, 70);
  }

  // Ensure placement score directly benefits when sub-scores improve (e.g. higher coding or aptitude)
  const computedFromFinalSubScores = clamp(Math.round(
    finalCoding * 0.25 +
    finalAptitude * 0.20 +
    finalInterview * 0.20 +
    finalResume * 0.15 +
    finalLearning * 0.10 +
    finalSoftSkills * 0.10
  ), 0, 100);

  const finalPlacementScore = clamp(Math.max(placementScore, computedFromFinalSubScores, prevScore), 0, 100);

  return {
    placementScore: finalPlacementScore,
    subScores: {
      coding: finalCoding,
      aptitude: finalAptitude,
      interview: finalInterview,
      resume: finalResume,
      learning: finalLearning,
      softSkills: finalSoftSkills,
    },
    eligibility: computeEligibility(
      finalPlacementScore,
      { coding: finalCoding, aptitude: finalAptitude, interview: finalInterview, resume: finalResume, learning: finalLearning, softSkills: finalSoftSkills },
      hasActivity,
      highestImpactTask?.action || recommendations[0]?.action || "",
      domainTrack
    ),
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
    const cacheTtlMs = 30 * 1000;
    const existingSub = (existing.subScores as any) || {};
    const isZeroed = (Number(existingSub.coding || 0) === 0 && Number(existingSub.interview || 0) === 0 && Number(existingSub.resume || 0) === 0);

    if (now - lastCalculated < cacheTtlMs && !isZeroed) {
      // Invalidate cache immediately if student has newer activity across any module
      const [recentDsa, recentInterview, recentAptitude, recentAts] = await Promise.all([
        userPrisma.dSAProgress.findFirst({ where: { userId }, select: { updatedAt: true } }).catch(() => null),
        userPrisma.interviewSession.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
        userPrisma.aptitudeSession.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
        userPrisma.aTSReport.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }).catch(() => null),
      ]);

      const dsaUpdated = recentDsa?.updatedAt ? new Date(recentDsa.updatedAt).getTime() : 0;
      const interviewCreated = recentInterview?.createdAt ? new Date(recentInterview.createdAt).getTime() : 0;
      const aptitudeCreated = recentAptitude?.createdAt ? new Date(recentAptitude.createdAt).getTime() : 0;
      const atsCreated = recentAts?.createdAt ? new Date(recentAts.createdAt).getTime() : 0;

      const hasNewActivity = dsaUpdated > lastCalculated || interviewCreated > lastCalculated || aptitudeCreated > lastCalculated || atsCreated > lastCalculated;

      if (!hasNewActivity) {
        const profile = await userPrisma.profile.findUnique({ where: { userId } }).catch(() => null);
        const domainTrack = detectDomainTrack(profile);
        await checkAndSendPlacementReadinessNotification(userId, existing.placementScore, userPrisma);
        return {
          placementScore: existing.placementScore,
          subScores: existing.subScores as unknown as SubScores,
          eligibility: computeEligibility(
            existing.placementScore,
            existing.subScores as unknown as SubScores,
            existing.placementScore > 0,
            (existing.highestImpactTask as unknown as HighestImpactTask | null)?.action || "",
            domainTrack
          ),
          companyMatches: existing.companyMatches as unknown as CompanyMatch[],
          skillWeights: existing.skillWeights as unknown as SkillWeight[],
          strengths: existing.strengths as unknown as string[],
          weaknesses: existing.weaknesses as unknown as string[],
          recommendations: existing.recommendations as unknown as PlacementRecommendation[],
          highestImpactTask: existing.highestImpactTask as unknown as HighestImpactTask | null,
          salaryEstimate: existing.salaryEstimate as unknown as SalaryEstimate,
          readinessTimeline: existing.readinessTimeline as unknown as ReadinessTimelineEntry[],
          aiInsights: existing.aiInsights as any,
          cached: true,
        };
      }
    }
  }

  const intelligence = await generatePlacementIntelligence(userId);

  try {
    const existingRec = await userPrisma.placementIntelligence.findFirst({ where: { userId } }).catch(() => null);
    const dataToSave = {
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
    };

    if (existingRec) {
      await userPrisma.placementIntelligence.update({
        where: { id: existingRec.id },
        data: dataToSave,
      });
    } else {
      await userPrisma.placementIntelligence.create({
        data: {
          userId,
          ...dataToSave,
        },
      });
    }

    // Trigger targeted milestone notification if user reaches 85+ placement readiness score
    await checkAndSendPlacementReadinessNotification(userId, intelligence.placementScore, userPrisma);
  } catch (dbErr) {
    console.warn("[PlacementIntelligence] DB persistence error, returning generated result directly:", dbErr);
  }

  return { ...intelligence, cached: false };
}

/**
 * Ensures that ONLY a particular user who reaches an 85+ Placement Readiness Score
 * receives this exclusive milestone notification.
 */
async function checkAndSendPlacementReadinessNotification(userId: string, placementScore: number, userPrisma: any) {
  if (!placementScore || placementScore < 85) return;
  try {
    const existingNotif = await userPrisma.notification.findFirst({
      where: {
        userId,
        type: "placement_ready_85",
      },
    }).catch(() => null);

    if (!existingNotif) {
      const notif = await userPrisma.notification.create({
        data: {
          userId,
          title: "🎉 Placement Ready: 85+ Score Milestone Achieved!",
          message: `Outstanding achievement! Your Placement Readiness score reached ${placementScore}%. You have officially qualified for top-tier company recruitment drives.`,
          type: "placement_ready_85",
          link: "/dashboard/user/placement-hub",
          read: false,
        },
      });

      emitNotification(userId, {
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link,
        read: false,
        createdAt: notif.createdAt,
      });
    }
  } catch (err) {
    console.warn("[PlacementIntelligence] Milestone notification dispatch warning:", err);
  }
}

export async function refreshPlacementIntelligence(userId: string): Promise<PlacementIntelligenceResult> {
  const userPrisma = await getUserPrisma(userId);

  const result = await generatePlacementIntelligence(userId);
  try {
    const existingRec = await userPrisma.placementIntelligence.findFirst({ where: { userId } }).catch(() => null);
    const dataToSave = {
      placementScore: result.placementScore,
      subScores: result.subScores as any,
      companyMatches: result.companyMatches as any,
      skillWeights: result.skillWeights as any,
      strengths: result.strengths as any,
      weaknesses: result.weaknesses as any,
      recommendations: result.recommendations as any,
      highestImpactTask: result.highestImpactTask as any,
      salaryEstimate: result.salaryEstimate as any,
      readinessTimeline: result.readinessTimeline as any,
      aiInsights: result.aiInsights as any,
      lastCalculatedAt: new Date(),
    };

    if (existingRec) {
      await userPrisma.placementIntelligence.update({
        where: { id: existingRec.id },
        data: dataToSave,
      });
    } else {
      await userPrisma.placementIntelligence.create({
        data: {
          userId,
          ...dataToSave,
        },
      });
    }
    await checkAndSendPlacementReadinessNotification(userId, result.placementScore, userPrisma);
  } catch (dbErr) {
    console.warn("[PlacementIntelligence] refresh save warning:", dbErr);
  }

  return result;
}

export async function getCompanyMatchDetails(userId: string, company: string): Promise<CompanyMatch | null> {
  const intelligence = await generatePlacementIntelligence(userId);
  return intelligence.companyMatches.find(c => c.company === company) || null;
}

