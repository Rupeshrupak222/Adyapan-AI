import type { NextFunction, Request, Response } from "express";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { requireUserId } from "../utils/request";
import { generateOrchestratedJSON } from "../lib/ai/openrouter";

// Helper to compute the programmatic stats baseline (aggregating from ~30 tables)
async function computeDashboardBaseline(userId: string, userPrisma: any) {
  let profile: any = null;
  try { profile = await userPrisma.profile.findUnique({ where: { userId }, include: { user: true } }); } catch {}

  let resumes: any[] = [];
  try { resumes = await userPrisma.resume.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }); } catch {}

  let atsReports: any[] = [];
  try { atsReports = await userPrisma.aTSReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }); } catch {}

  let linkedinReports: any[] = [];
  try { linkedinReports = await userPrisma.linkedInReport.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }); } catch {}

  let studySessions: any[] = [];
  try { studySessions = await userPrisma.studySession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }); } catch {}

  let dsaProgress: any = null;
  try { dsaProgress = await userPrisma.dSAProgress.findUnique({ where: { userId } }); } catch {}

  let weakTopics: any[] = [];
  try { weakTopics = await userPrisma.weakTopic.findMany({ where: { userId }, orderBy: { strengthScore: "asc" }, take: 10 }); } catch {}

  let codingSessions: any[] = [];
  try { codingSessions = await userPrisma.codingSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }); } catch {}

  let quizAttempts: any[] = [];
  try { quizAttempts = await userPrisma.quizAttempt.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }); } catch {}

  let learningAnalytics: any = null;
  try { learningAnalytics = await userPrisma.learningAnalytics.findUnique({ where: { userId } }); } catch {}

  let progressTracking: any = null;
  try { progressTracking = await userPrisma.progressTracking.findUnique({ where: { userId } }); } catch {}

  let coverLetters: any[] = [];
  try { coverLetters = await userPrisma.coverLetter.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }); } catch {}

  let submissions: any[] = [];
  try { submissions = await userPrisma.submission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }); } catch {}

  let resumeAnalyses: any[] = [];
  try { resumeAnalyses = await userPrisma.resumeAnalysis.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }); } catch {}

  let resumeImprovements: any[] = [];
  try { resumeImprovements = await userPrisma.resumeImprovement.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }); } catch {}

  let careerRoadmaps: any[] = [];
  try { careerRoadmaps = await userPrisma.careerRoadmap.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3, include: { tasks: true } }); } catch {}

  let learningStreak: any = null;
  try { learningStreak = await userPrisma.learningStreak.findUnique({ where: { userId } }); } catch {}

  let interviewSessions: any[] = [];
  try { interviewSessions = await userPrisma.interviewSession.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10, include: { evaluations: true } }); } catch {}

  let topicProgress: any[] = [];
  try { topicProgress = await userPrisma.topicProgress.findMany({ where: { userId }, orderBy: { lastActivity: "desc" }, take: 20 }); } catch {}

  let challengeSubmissions: any[] = [];
  try { challengeSubmissions = await userPrisma.challengeSubmission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }); } catch {}

  let githubProfile: any = null;
  try { githubProfile = await userPrisma.githubProfile.findFirst({ where: { userId } }); } catch {}

  let generatedNotes: any[] = [];
  try { generatedNotes = await userPrisma.generatedNote.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }); } catch {}

  let quizzes: any[] = [];
  try { quizzes = await userPrisma.quiz.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }); } catch {}

  let presentations: any[] = [];
  try { presentations = await userPrisma.presentation.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }); } catch {}

  let mindMaps: any[] = [];
  try { mindMaps = await userPrisma.mindMap.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }); } catch {}

  let flashcards: any[] = [];
  try { flashcards = await userPrisma.flashcard.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }); } catch {}

  let studyPlans: any[] = [];
  try { studyPlans = await userPrisma.studyPlan.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }); } catch {}

  let codingRoadmaps: any[] = [];
  try { codingRoadmaps = await userPrisma.codingRoadmap.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 3 }); } catch {}

  let resumeVersions: any[] = [];
  try { resumeVersions = await userPrisma.resumeVersion.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }); } catch {}

  // ─── Compute Scores ─────────────────────────────────────────────────
  const avgAtsScore = atsReports.length
    ? Math.round(atsReports.reduce((s: number, r: any) => s + (r.overallScore || r.score || 0), 0) / atsReports.length)
    : 0;

  const latestAtsScore = atsReports.length > 0 ? (atsReports[0].overallScore || atsReports[0].score || 0) : 0;

  const prevAtsScore = atsReports.length > 1 ? (atsReports[1].overallScore || atsReports[1].score || 0) : latestAtsScore;
  const atsScoreDelta = latestAtsScore - prevAtsScore;

  const avgLinkedinScore = linkedinReports.length
    ? Math.round(linkedinReports.reduce((s: number, r: any) => s + (r.score || 0), 0) / linkedinReports.length)
    : 0;

  const latestLinkedinScore = linkedinReports.length > 0 ? linkedinReports[0].score : 0;

  const resumeScore = resumes.length > 0 ? Math.min(100, Math.round(avgAtsScore * 0.6 + (profile ? 20 : 0) + (resumes.length > 0 ? 20 : 0))) : 0;

  const dsaSolved = dsaProgress?.solved || 0;
  const dsaAccuracy = dsaProgress?.accuracy || 0;
  const dsaStreak = dsaProgress?.streak || 0;

  const solvedSubmissions = submissions.filter((s: any) => s.status === "Accepted" || s.status === "solved" || s.status === "accepted");

  // Learning score
  const learningScore = learningAnalytics?.learningScore || progressTracking?.overallProgress || 0;

  // Study hours (estimate from sessions)
  const studyHours = studySessions.length * 0.5; // rough estimate

  // Coding readiness (0-100)
  const codingReadiness = Math.min(100, Math.round(
    Math.min(dsaSolved / 100, 1) * 40 +
    dsaAccuracy * 30 +
    Math.min(challengeSubmissions.length / 10, 1) * 15 +
    Math.min(codingSessions.length / 20, 1) * 15
  ));

  // Learning readiness (0-100)
  const learningReadiness = Math.min(100, Math.round(
    Math.min(studySessions.length / 20, 1) * 30 +
    Math.min(generatedNotes.length / 10, 1) * 15 +
    Math.min(quizzes.length / 10, 1) * 15 +
    Math.min(flashcards.length / 20, 1) * 10 +
    Math.min(presentations.length / 5, 1) * 10 +
    Math.min(mindMaps.length / 5, 1) * 10 +
    Math.min(studyPlans.length / 2, 1) * 10
  ));

  // Resume readiness (0-100)
  const resumeReadiness = Math.min(100, Math.round(
    (resumes.length > 0 ? 30 : 0) +
    avgAtsScore * 0.35 +
    (resumeImprovements.length > 0 ? 15 : 0) +
    (coverLetters.length > 0 ? 10 : 0) +
    (resumeAnalyses.length > 0 ? 10 : 0)
  ));

  // Interview readiness (0-100)
  const completedInterviews = interviewSessions.filter((s: any) => s.status === "completed" || s.status === "completed_with_feedback");
  const avgInterviewScore = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((s: number, sess: any) => {
        const eval_ = sess.evaluations?.[0];
        return s + (eval_?.overallScore || 0);
      }, 0) / completedInterviews.length)
    : 0;

  const interviewReadiness = Math.min(100, Math.round(
    Math.min(completedInterviews.length / 10, 1) * 50 +
    avgInterviewScore * 0.5
  ));

  // Recruiter readiness (0-100)
  const recruiterReadiness = Math.min(100, Math.round(
    avgLinkedinScore * 0.4 +
    (coverLetters.length > 0 ? 15 : 0) +
    (resumes.length > 0 ? 15 : 0) +
    (githubProfile ? 15 : 0) +
    (profile?.portfolio ? 5 : 0) +
    avgAtsScore * 0.1
  ));

  // Portfolio readiness (0-100)
  const portfolioReadiness = Math.min(100, Math.round(
    (githubProfile ? 30 : 0) +
    Math.min((githubProfile?.repos ? JSON.parse(JSON.stringify(githubProfile.repos)).length || 0 : 0) / 5, 1) * 30 +
    (resumes.length > 0 ? 20 : 0) +
    (profile?.portfolio ? 20 : 0)
  ));

  // Overall career readiness (weighted average)
  const overallReadiness = Math.round(
    codingReadiness * 0.25 +
    learningReadiness * 0.15 +
    resumeReadiness * 0.2 +
    interviewReadiness * 0.15 +
    recruiterReadiness * 0.15 +
    portfolioReadiness * 0.1
  );

  // ─── Profile Completion ─────────────────────────────────────────
  const profileFields = [
    profile?.user?.name, profile?.user?.email, profile?.phone, profile?.location,
    profile?.aboutMe, profile?.college, profile?.branch, profile?.degree,
    profile?.graduationYear, (profile?.skills || []).length > 0 ? "y" : "",
    (profile?.interestedDomains || []).length > 0 ? "y" : "",
    profile?.targetRole, profile?.careerObjective, profile?.linkedin, profile?.github,
  ];
  const profileCompletion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  // ─── Learning Summary ─────────────────────────────────────────
  const topicsCompleted = topicProgress.filter((t: any) => t.status === "Completed" || t.progressPercentage >= 100).length;
  const weakTopicNames = weakTopics.slice(0, 3).map((w: any) => w.topicName);
  const topTopic = topicProgress.length > 0 ? topicProgress[0]?.topicName : "No topics yet";

  // ─── Coding Summary ───────────────────────────────────────────
  const challengesCompleted = challengeSubmissions.filter((s: any) => s.status === "completed" || s.status === "accepted" || s.score > 0).length;
  const codeReviews = submissions.filter((s: any) => s.aiReview).length;
  const avgComplexity = codeReviews > 0 ? Math.round(submissions.reduce((s: number, sub: any) => {
    const review = sub.aiReview as any;
    return s + (review?.efficiencyScore || review?.score || 70);
  }, 0) / codeReviews) : 70;

  // ─── Resume Summary ───────────────────────────────────────────
  const improvementSuggestionsRemaining = resumeImprovements.reduce((s: number, r: any) => s + ((r.totalCount || 0) - (r.appliedCount || 0)), 0);

  // ─── Professional Brand ───────────────────────────────────────
  const linkedinComplete = latestLinkedinScore;
  const coverLettersCount = coverLetters.length;

  // ─── Build Timeline ───────────────────────────────────────────
  const timelineEvents: any[] = [];

  studySessions.forEach((s: any) => {
    timelineEvents.push({
      type: "learning",
      title: `Studied: ${s.topic}`,
      date: s.createdAt,
      icon: "book",
      color: "#8b5cf6"
    });
  });

  solvedSubmissions.slice(0, 15).forEach((s: any) => {
    timelineEvents.push({
      type: "coding",
      title: `Solved coding problem`,
      date: s.createdAt,
      icon: "code",
      color: "#f59e0b"
    });
  });

  resumes.forEach((r: any) => {
    timelineEvents.push({
      type: "resume",
      title: `Created resume: ${r.title}`,
      date: r.createdAt,
      icon: "file",
      color: "#3b82f6"
    });
  });

  atsReports.forEach((r: any) => {
    timelineEvents.push({
      type: "ats",
      title: `ATS Score: ${r.overallScore || r.score}%`,
      date: r.createdAt,
      icon: "chart",
      color: "#10b981"
    });
  });

  coverLetters.forEach((c: any) => {
    timelineEvents.push({
      type: "career",
      title: `Cover letter for ${c.companyName}`,
      date: c.createdAt,
      icon: "letter",
      color: "#ec4899"
    });
  });

  linkedinReports.forEach((l: any) => {
    timelineEvents.push({
      type: "career",
      title: `LinkedIn optimized: ${l.score}%`,
      date: l.createdAt,
      icon: "linkedin",
      color: "#0077b5"
    });
  });

  completedInterviews.forEach((i: any) => {
    const eval_ = i.evaluations?.[0];
    const detailedAnalysis = eval_?.detailedAnalysis || {};
    const intelligence = detailedAnalysis?.intelligence || null;
    const scoreLabel = eval_?.overallScore ? `${eval_.overallScore}%` : "N/A";
    timelineEvents.push({
      type: "interview",
      title: `Interview: ${i.role} ${i.company ? `at ${i.company}` : ""} - ${scoreLabel}`,
      date: i.createdAt,
      icon: "mic",
      color: "#f43f5e",
      ...(intelligence ? {
        aiCoachSummary: intelligence.aiCoach?.overallSummary || "",
        interviewReadiness: intelligence.aiCoach?.interviewReadiness || 0,
        topPriority: intelligence.aiCoach?.topPriorities?.[0]?.area || "",
      } : {}),
    });
  });

  challengeSubmissions.forEach((c: any) => {
    timelineEvents.push({
      type: "coding",
      title: `Challenge completed: ${c.score} points`,
      date: c.createdAt,
      icon: "trophy",
      color: "#f59e0b"
    });
  });

  timelineEvents.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ─── Build Milestones ─────────────────────────────────────────
  const milestones = [
    {
      id: "resume-completed",
      title: "Resume Completed",
      description: "Build your first resume",
      targetValue: 1,
      currentValue: resumes.length,
      category: "resume",
      completed: resumes.length >= 1,
      icon: "file",
      color: "#3b82f6"
    },
    {
      id: "ats-above-90",
      title: "ATS Score Above 90",
      description: "Achieve 90+ ATS score",
      targetValue: 90,
      currentValue: latestAtsScore,
      category: "resume",
      completed: latestAtsScore >= 90,
      icon: "chart",
      color: "#10b981"
    },
    {
      id: "50-dsa",
      title: "50 DSA Problems",
      description: "Solve 50 DSA problems",
      targetValue: 50,
      currentValue: dsaSolved,
      category: "coding",
      completed: dsaSolved >= 50,
      icon: "code",
      color: "#f59e0b"
    },
    {
      id: "100-dsa",
      title: "100 DSA Problems",
      description: "Solve 100 DSA problems",
      targetValue: 100,
      currentValue: dsaSolved,
      category: "coding",
      completed: dsaSolved >= 100,
      icon: "code",
      color: "#f59e0b"
    },
    {
      id: "linkedin-optimized",
      title: "LinkedIn Optimized",
      description: "Achieve 80+ LinkedIn score",
      targetValue: 80,
      currentValue: latestLinkedinScore,
      category: "brand",
      completed: latestLinkedinScore >= 80,
      icon: "linkedin",
      color: "#0077b5"
    },
    {
      id: "portfolio-ready",
      title: "Portfolio Ready",
      description: "Connect GitHub profile",
      targetValue: 1,
      currentValue: githubProfile ? 1 : 0,
      category: "portfolio",
      completed: !!githubProfile,
      icon: "globe",
      color: "#8b5cf6"
    },
    {
      id: "mock-interviews",
      title: "Mock Interviews Done",
      description: "Complete 5 mock interviews",
      targetValue: 5,
      currentValue: completedInterviews.length,
      category: "interview",
      completed: completedInterviews.length >= 5,
      icon: "mic",
      color: "#f43f5e"
    },
    {
      id: "cover-letter",
      title: "Cover Letter Generated",
      description: "Generate your first cover letter",
      targetValue: 1,
      currentValue: coverLettersCount,
      category: "career",
      completed: coverLettersCount >= 1,
      icon: "letter",
      color: "#ec4899"
    },
  ];

  // ─── Recommendations ──────────────────────────────────────────
  const recommendations: any[] = [];

  if (codingReadiness < 50) {
    recommendations.push({
      type: "coding",
      title: "Practice DSA Problems",
      description: `You've solved ${dsaSolved} problems. Solving 2-3 daily can significantly boost your technical readiness.`,
      impact: "high",
      icon: "code",
      color: "#f59e0b",
      action: "dsa-practice"
    });
  }

  if (resumeReadiness < 70) {
    recommendations.push({
      type: "resume",
      title: "Improve Your Resume",
      description: `Your ATS score is ${avgAtsScore}%. Improving it to 80%+ will increase callback rates by 40%.`,
      impact: "high",
      icon: "file",
      color: "#3b82f6",
      action: "ats-checker"
    });
  }

  if (interviewReadiness < 50) {
    recommendations.push({
      type: "interview",
      title: "Schedule Mock Interview",
      description: `Complete ${Math.max(0, 5 - completedInterviews.length)} more mock interviews to build confidence.`,
      impact: "high",
      icon: "mic",
      color: "#f43f5e",
      action: "interview-hub"
    });
  }

  if (latestLinkedinScore < 80 && latestLinkedinScore > 0) {
    recommendations.push({
      type: "brand",
      title: "Optimize LinkedIn Profile",
      description: `Your LinkedIn score is ${latestLinkedinScore}%. Optimizing it increases recruiter visibility by 3x.`,
      impact: "medium",
      icon: "linkedin",
      color: "#0077b5",
      action: "linkedin-optimizer"
    });
  }

  if (coverLettersCount === 0) {
    recommendations.push({
      type: "career",
      title: "Generate Cover Letter",
      description: "Customized cover letters increase interview chances by 50%. Generate your first one.",
      impact: "medium",
      icon: "letter",
      color: "#ec4899",
      action: "cover-letter"
    });
  }

  if (learningReadiness < 40) {
    recommendations.push({
      type: "learning",
      title: "Start Learning Sessions",
      description: "Begin study sessions to build foundational knowledge for your target role.",
      impact: "medium",
      icon: "book",
      color: "#8b5cf6",
      action: "study-assistant"
    });
  }

  if (weakTopicNames.length > 0) {
    recommendations.push({
      type: "learning",
      title: `Revise: ${weakTopicNames[0]}`,
      description: `${weakTopicNames[0]} is your weakest topic. Spending 30 minutes reviewing can prevent knowledge gaps.`,
      impact: "high",
      icon: "alert",
      color: "#f43f5e",
      action: "weak-topics"
    });
  }

  if (!githubProfile) {
    recommendations.push({
      type: "portfolio",
      title: "Connect GitHub",
      description: "GitHub profile shows your coding activity to recruiters. Connect it to boost portfolio score.",
      impact: "medium",
      icon: "globe",
      color: "#8b5cf6",
      action: "github-portfolio"
    });
  }

  // ─── AI Daily Brief ───────────────────────────────────────────
  const hour = new Date().getHours();
  let greeting = "Good Morning";
  if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
  else if (hour >= 17) greeting = "Good Evening";

  const userName = profile?.user?.name?.split(" ")[0] || "there";

  const briefLines: string[] = [];
  briefLines.push(`${greeting}, ${userName}.`);

  if (atsScoreDelta > 0) {
    briefLines.push(`You improved your ATS score by ${atsScoreDelta} points${prevAtsScore > 0 ? " this period" : ""}.`);
  } else if (latestAtsScore > 0) {
    briefLines.push(`Your ATS score is currently ${latestAtsScore}%.`);
  }

  if (weakTopicNames.length > 0) {
    briefLines.push(`${weakTopicNames[0]} remains your weakest area.`);
  }

  if (latestLinkedinScore > 0 && latestLinkedinScore < 100) {
    briefLines.push(`Your LinkedIn profile is ${latestLinkedinScore}% optimized.`);
  }

  const highestImpactRec = recommendations.find(r => r.impact === "high");
  if (highestImpactRec) {
    briefLines.push(`Today's highest-impact task: ${highestImpactRec.title}.`);
  }

  // ─── Today's Actions ──────────────────────────────────────────
  const todayActions: any[] = [];

  if (dsaSolved < 100) {
    todayActions.push({
      title: `Solve ${Math.min(2, 100 - dsaSolved)} DSA problems`,
      priority: "High",
      category: "coding",
      icon: "code",
      estimatedMinutes: 90
    });
  }

  if (avgAtsScore < 80 && resumes.length > 0) {
    todayActions.push({
      title: "Run ATS Analysis",
      priority: "High",
      category: "resume",
      icon: "chart",
      estimatedMinutes: 15
    });
  }

  if (coverLettersCount === 0) {
    todayActions.push({
      title: "Generate Cover Letter",
      priority: "Medium",
      category: "career",
      icon: "letter",
      estimatedMinutes: 10
    });
  }

  if (latestLinkedinScore < 80) {
    todayActions.push({
      title: "Optimize LinkedIn Profile",
      priority: "Medium",
      category: "brand",
      icon: "linkedin",
      estimatedMinutes: 20
    });
  }

  if (studySessions.length === 0 || learningReadiness < 30) {
    todayActions.push({
      title: "Complete Weekly Learning Goal",
      priority: "Medium",
      category: "learning",
      icon: "book",
      estimatedMinutes: 60
    });
  }

  if (completedInterviews.length < 3) {
    todayActions.push({
      title: "Practice Mock Interview",
      priority: "Low",
      category: "interview",
      icon: "mic",
      estimatedMinutes: 30
    });
  }

  // ─── Intelligence-Driven Recommendations & Actions ───────────
  const latestInterviewWithIntelligence = completedInterviews.find((i: any) => {
    const eval_ = i.evaluations?.[0];
    return eval_?.detailedAnalysis?.intelligence;
  });
  if (latestInterviewWithIntelligence) {
    const eval_ = latestInterviewWithIntelligence.evaluations?.[0];
    const intelligence = eval_?.detailedAnalysis?.intelligence;
    if (intelligence?.aiCoach?.topPriorities?.length > 0) {
      const topArea = intelligence.aiCoach.topPriorities[0];
      recommendations.push({
        type: "interview",
        title: `Improve: ${topArea.area}`,
        description: `${topArea.action} — ${topArea.impact}. ${topArea.timeframe ? `Timeline: ${topArea.timeframe}.` : ""}`,
        impact: "high",
        icon: "mic",
        color: "#f43f5e",
        action: "interview-hub",
      });
    }
    if (intelligence?.practicePlan?.suggestedInterviewType) {
      todayActions.push({
        title: `Practice: ${intelligence.practicePlan.suggestedInterviewType} interview`,
        priority: "High",
        category: "interview",
        icon: "mic",
        estimatedMinutes: 30,
      });
    }
    if (intelligence?.aiCoach?.biggestWeakness) {
      briefLines.push(`Your biggest interview weakness: ${intelligence.aiCoach.biggestWeakness}.`);
    }
  }

  // ─── Career Insights ──────────────────────────────────────────
  const insights: string[] = [];

  if (resumeReadiness > 60 && interviewReadiness < 40) {
    insights.push("Your resume is strong enough for applications, but interview preparation needs significant work.");
  }

  if (codingReadiness > 50 && learningReadiness < 30) {
    insights.push("Your coding skills are ahead of your learning progress. Balancing both will make you more well-rounded.");
  }

  if (dsaSolved >= 30 && dsaSolved < 50) {
    insights.push(`You're at ${dsaSolved} DSA problems. Reaching 50 will unlock more interview opportunities.`);
  }

  if (portfolioReadiness < 30) {
    insights.push("Your portfolio is weak. Adding GitHub projects and a personal website will significantly improve recruiter interest.");
  }

  if (recruiterReadiness > 70) {
    insights.push("Your professional brand is strong. You're ready to start applying to roles.");
  }

  if (overallReadiness >= 60) {
    insights.push("You're past the halfway mark. Focus on your weakest dimension to maximize hiring potential.");
  } else if (overallReadiness >= 30) {
    insights.push("You're building a solid foundation. Consistency in the next few weeks will accelerate your progress dramatically.");
  } else {
    insights.push("You're just getting started. Focus on one area at a time — begin with DSA practice and resume building.");
  }

  if (codingReadiness > resumeReadiness && resumeReadiness < 50) {
    insights.push("Your technical skills outpace your resume. Updating your resume could immediately improve callback rates.");
  }

  // ─── AI Career Coach ──────────────────────────────────────────
  const completedMilestones = milestones.filter(m => m.completed).length;
  const focusArea = overallReadiness < 30 ? "Building foundations"
    : overallReadiness < 60 ? "Closing skill gaps"
    : overallReadiness < 80 ? "Polishing and applying"
    : "Advanced preparation and applications";

  const biggestWin = dsaSolved > 0 ? `Solved ${dsaSolved} DSA problems`
    : resumes.length > 0 ? "Built your first resume"
    : studySessions.length > 0 ? "Started learning journey"
    : "Just getting started";

  const biggestRisk = codingReadiness < 20 ? "Very low coding practice"
    : resumeReadiness < 20 ? "No resume built yet"
    : interviewReadiness < 10 ? "Zero interview practice"
    : "Inconsistent practice schedule";

  // ─── Chart Data ───────────────────────────────────────────────
  const weeklyActivity: Record<string, { learning: number; coding: number; resume: number }> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    weeklyActivity[key] = { learning: 0, coding: 0, resume: 0 };
  }

  studySessions.forEach((s: any) => {
    const key = new Date(s.createdAt).toISOString().split("T")[0];
    if (weeklyActivity[key]) weeklyActivity[key].learning++;
  });

  solvedSubmissions.forEach((s: any) => {
    const key = new Date(s.createdAt).toISOString().split("T")[0];
    if (weeklyActivity[key]) weeklyActivity[key].coding++;
  });

  atsReports.forEach((r: any) => {
    const key = new Date(r.createdAt).toISOString().split("T")[0];
    if (weeklyActivity[key]) weeklyActivity[key].resume++;
  });

  const atsHistory = atsReports.slice().reverse().map((r: any) => ({
    date: r.createdAt,
    score: r.overallScore || r.score || 0
  }));

  const resumeHistory = resumes.slice().reverse().map((r: any, i: number) => ({
    version: i + 1,
    date: r.createdAt,
    title: r.title
  }));

  return {
    scores: {
      overall: overallReadiness,
      coding: codingReadiness,
      learning: learningReadiness,
      resume: resumeReadiness,
      interview: interviewReadiness,
      recruiter: recruiterReadiness,
      portfolio: portfolioReadiness,
      ats: avgAtsScore,
      linkedin: avgLinkedinScore,
      profileCompletion,
    },
    dailyBrief: {
      greeting,
      userName,
      lines: briefLines,
    },
    todayActions,
    timeline: timelineEvents.slice(0, 50),
    milestones,
    recommendations,
    insights,
    careerCoach: {
      biggestWin,
      biggestRisk,
      focusArea,
      completedMilestones,
      totalMilestones: milestones.length,
      overallAssessment: overallReadiness >= 70 ? "Strong" : overallReadiness >= 40 ? "Growing" : "Getting Started",
    },
    learningSummary: {
      topicsCompleted,
      studyHours: Math.round(studyHours),
      weakTopics: weakTopicNames,
      recommendedTopic: topTopic,
      studySessions: studySessions.length,
      notesGenerated: generatedNotes.length,
      quizzesCreated: quizzes.length,
      flashcardsCreated: flashcards.length,
      presentationsCreated: presentations.length,
      mindMapsCreated: mindMaps.length,
    },
    codingSummary: {
      problemsSolved: dsaSolved,
      currentStreak: dsaStreak,
      challengesCompleted,
      aiReviewAverage: avgComplexity,
      roadmapProgress: codingRoadmaps.length > 0 ? codingRoadmaps[0].completionPercentage || 0 : 0,
      accuracy: Math.round(dsaAccuracy * 100),
      totalSubmissions: submissions.length,
      codingSessions: codingSessions.length,
    },
    resumeSummary: {
      resumeScore: avgAtsScore,
      atsScore: latestAtsScore,
      improvementSuggestionsRemaining,
      resumeVersions: resumeVersions.length,
      resumesCreated: resumes.length,
      coverLettersCount: coverLettersCount,
      resumeAnalyses: resumeAnalyses.length,
      resumeImprovements: resumeImprovements.length,
    },
    professionalBrand: {
      linkedinScore: latestLinkedinScore,
      coverLettersGenerated: coverLettersCount,
      profileCompleteness: profileCompletion,
      networkingProgress: 0,
      githubConnected: !!githubProfile,
    },
    interviewSummary: {
      totalCompleted: completedInterviews.length,
      avgScore: avgInterviewScore,
      latestReadiness: (() => {
        const latest = completedInterviews[0];
        const intel = latest?.evaluations?.[0]?.detailedAnalysis?.intelligence;
        return intel?.aiCoach?.interviewReadiness || interviewReadiness;
      })(),
      biggestStrength: (() => {
        const latest = completedInterviews[0];
        const intel = latest?.evaluations?.[0]?.detailedAnalysis?.intelligence;
        return intel?.aiCoach?.biggestStrength || "";
      })(),
      biggestWeakness: (() => {
        const latest = completedInterviews[0];
        const intel = latest?.evaluations?.[0]?.detailedAnalysis?.intelligence;
        return intel?.aiCoach?.biggestWeakness || "";
      })(),
      improvementDelta: (() => {
        if (completedInterviews.length < 2) return 0;
        const latest = completedInterviews[0]?.evaluations?.[0]?.overallScore || 0;
        const prev = completedInterviews[1]?.evaluations?.[0]?.overallScore || 0;
        return latest - prev;
      })(),
    },
    charts: {
      weeklyActivity: Object.entries(weeklyActivity).map(([date, data]) => ({ date, ...data })),
      atsHistory,
      resumeHistory,
    },
    weakTopics: weakTopics.map((w: any) => ({
      name: w.topicName,
      score: w.strengthScore,
      risk: w.riskLevel,
    })),
  };
}

// Helper to use AI Orchestration and calculate/save full Dashboard data
async function generateAndSaveDashboard(userId: string, userPrisma: any) {
  const baseline = await computeDashboardBaseline(userId, userPrisma);

  try {
    const systemPrompt = `You are a Principal Product Architect, staff recruiter, and career strategist at Adyapan AI.
Analyze the user's dashboard statistics across Learning, Coding, and Resume Hubs.
Produce a highly personalized AI Daily Brief, actionable Career Insights, prioritized Today's Actions, recommendations list, and career coach feedback.

CRITICAL FORMATTING RULES:
1. You MUST greet the user personally. If their name is known, greet them. Use friendly but professional terms.
2. Under "dailyBrief", include "lines": a list of 4-6 sentences. E.g.:
   - "Good Morning, {Name}." (or Honey / userName)
   - "You improved your ATS score by {X} points this week." (only if ATS score improved, or mention current ATS score)
   - "{Topic} remains your weakest coding topic." (identify weakest topic from weakTopics list)
   - "Your LinkedIn profile is now {Y}% optimized." (reference linkedinScore)
   - "Completing one backend project could increase your interview readiness."
   - "Today's highest-impact task: {taskName}."
3. Under "insights", list 3-5 recruiter/coach observations about their profile readiness and areas of improvement.
4. Under "todayActions", return a list of 2-4 prioritized tasks. Keep estimatedMinutes realistic.
5. Under "recommendations", return a list of recommended actions. Make sure each action has "type" (coding, resume, brand, learning, portfolio), "title", "description" (explaining WHY it matters for target role), "impact" (high, medium, low), "icon", "color", "action".
6. Under "careerCoach", return a summary, biggest win, biggest risk, focus area, and career advice.

You MUST respond with valid JSON matching this schema exactly:
{
  "dailyBrief": {
    "lines": [string]
  },
  "insights": [string],
  "todayActions": [
    { "title": string, "priority": "High" | "Medium" | "Low", "category": string, "icon": string, "estimatedMinutes": number }
  ],
  "recommendations": [
    { "type": string, "title": string, "description": string, "impact": "high" | "medium" | "low", "icon": string, "color": string, "action": string }
  ],
  "careerCoach": {
    "biggestWin": string,
    "biggestRisk": string,
    "focusArea": string,
    "overallAssessment": string
  }
}`;

    const userPrompt = `USER PROFILE SUMMARY:
Target Role: ${baseline.learningSummary.recommendedTopic || "Software Engineer"}
Overall Readiness: ${baseline.scores.overall}%
Coding Readiness: ${baseline.scores.coding}%
Learning Readiness: ${baseline.scores.learning}%
Resume Readiness: ${baseline.scores.resume}%
Interview Readiness: ${baseline.scores.interview}%
Recruiter Readiness: ${baseline.scores.recruiter}%
Portfolio Readiness: ${baseline.scores.portfolio}%
ATS Score: ${baseline.scores.ats}%
LinkedIn Score: ${baseline.scores.linkedin}%
Profile Completion: ${baseline.scores.profileCompletion}%

CODING HUB SUMMARY:
Problems Solved: ${baseline.codingSummary.problemsSolved}
Accuracy: ${baseline.codingSummary.accuracy}%
Streak: ${baseline.codingSummary.currentStreak} days
Weak Coding Topics: ${JSON.stringify(baseline.weakTopics.map(w => w.name))}

LEARNING HUB SUMMARY:
Study Hours: ${baseline.learningSummary.studyHours}h
Study Sessions: ${baseline.learningSummary.studySessions}
Topics Completed: ${baseline.learningSummary.topicsCompleted}

RESUME HUB SUMMARY:
Resumes Created: ${baseline.resumeSummary.resumesCreated}
Cover Letters: ${baseline.resumeSummary.coverLettersCount}
Suggestions Remaining: ${baseline.resumeSummary.improvementSuggestionsRemaining}

PROFESSIONAL BRAND SUMMARY:
LinkedIn Score: ${baseline.professionalBrand.linkedinScore}%
GitHub Connected: ${baseline.professionalBrand.githubConnected ? "Yes" : "No"}

Write a personalized dashboard analysis.`;

    const aiRes = await generateOrchestratedJSON(
      "roadmap_reasoning",
      systemPrompt,
      userPrompt,
      { temperature: 0.7, responseFormat: { type: "json_object" } },
      {
        dailyBrief: baseline.dailyBrief,
        insights: baseline.insights,
        todayActions: baseline.todayActions,
        recommendations: baseline.recommendations,
        careerCoach: baseline.careerCoach
      }
    );

    if (aiRes) {
      if (aiRes.dailyBrief?.lines) baseline.dailyBrief.lines = aiRes.dailyBrief.lines;
      if (aiRes.insights) baseline.insights = aiRes.insights;
      if (aiRes.todayActions && aiRes.todayActions.length > 0) baseline.todayActions = aiRes.todayActions;
      if (aiRes.recommendations && aiRes.recommendations.length > 0) baseline.recommendations = aiRes.recommendations;
      if (aiRes.careerCoach) {
        baseline.careerCoach = {
          ...baseline.careerCoach,
          ...aiRes.careerCoach
        };
      }
    }
  } catch (err) {
    console.warn("[Career Dashboard AI] Failed to enhance baseline with AI, using programmatic baseline:", err);
  }

  // Save/update snapshot in database
  try {
    await userPrisma.careerDashboardSnapshot.upsert({
      where: { userId },
      create: {
        userId,
        overallReadiness: baseline.scores.overall,
        codingScore: baseline.scores.coding,
        learningScore: baseline.scores.learning,
        resumeScore: baseline.scores.resume,
        atsScore: baseline.scores.ats,
        linkedinScore: baseline.scores.linkedin,
        dashboardJson: baseline,
      },
      update: {
        overallReadiness: baseline.scores.overall,
        codingScore: baseline.scores.coding,
        learningScore: baseline.scores.learning,
        resumeScore: baseline.scores.resume,
        atsScore: baseline.scores.ats,
        linkedinScore: baseline.scores.linkedin,
        dashboardJson: baseline,
        createdAt: new Date(),
      }
    });
  } catch (dbErr) {
    console.error("[Career Dashboard Snapshot] Database upsert failed:", dbErr);
  }

  return baseline;
}

export async function getCareerDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const snapshot = await userPrisma.careerDashboardSnapshot.findUnique({
      where: { userId }
    });

    const EXPIRATION_TIME = 2 * 60 * 60 * 1000; // 2 hours cache duration
    if (snapshot && (Date.now() - new Date(snapshot.createdAt).getTime() < EXPIRATION_TIME)) {
      return res.json({
        success: true,
        dashboard: snapshot.dashboardJson
      });
    }

    const dashboard = await generateAndSaveDashboard(userId, userPrisma);
    return res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshCareerDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    const dashboard = await generateAndSaveDashboard(userId, userPrisma);
    return res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    next(error);
  }
}

export async function getCareerInsights(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    let snapshot = await userPrisma.careerDashboardSnapshot.findUnique({
      where: { userId }
    });

    if (!snapshot) {
      const dashboard = await generateAndSaveDashboard(userId, userPrisma);
      return res.json({
        success: true,
        insights: dashboard.insights
      });
    }

    const dashboardJson = snapshot.dashboardJson as any;
    return res.json({
      success: true,
      insights: dashboardJson.insights || []
    });
  } catch (error) {
    next(error);
  }
}

export async function getCareerRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    let snapshot = await userPrisma.careerDashboardSnapshot.findUnique({
      where: { userId }
    });

    if (!snapshot) {
      const dashboard = await generateAndSaveDashboard(userId, userPrisma);
      return res.json({
        success: true,
        recommendations: dashboard.recommendations
      });
    }

    const dashboardJson = snapshot.dashboardJson as any;
    return res.json({
      success: true,
      recommendations: dashboardJson.recommendations || []
    });
  } catch (error) {
    next(error);
  }
}

export async function getCareerReadiness(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireUserId(req);
    const userPrisma = await getUserPrismaFromRequest(req);

    let snapshot = await userPrisma.careerDashboardSnapshot.findUnique({
      where: { userId }
    });

    if (!snapshot) {
      const dashboard = await generateAndSaveDashboard(userId, userPrisma);
      return res.json({
        success: true,
        scores: dashboard.scores
      });
    }

    const dashboardJson = snapshot.dashboardJson as any;
    return res.json({
      success: true,
      scores: dashboardJson.scores || {}
    });
  } catch (error) {
    next(error);
  }
}

