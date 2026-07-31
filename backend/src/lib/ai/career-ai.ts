import { generateJSON, MODELS } from "./openrouter";

const CAREER_SYSTEM = `You are a senior career strategist, technical recruiter, hiring manager, and learning coach with 15+ years of experience at FAANG companies.

Generate personalized career roadmaps using the user's ACTUAL data from the platform — their resume, coding analytics, learning analytics, ATS reports, LinkedIn data, and target role.

CRITICAL RULES:
- Every single recommendation MUST be directly tied to the user's specific TARGET ROLE. Do NOT give generic advice.
- Reference the user's ACTUAL skills, scores, projects, and progress in your analysis. Never invent achievements.
- If the user has 0 DSA problems solved, say so explicitly and make DSA a high priority. If they have 50 solved, acknowledge that and focus on advanced topics.
- If their ATS score is 40%, make resume optimization a critical priority. If it's 85%, focus on other areas.
- If they have weak topics in system design, prioritize system design for their target role.
- Weekly tasks must be small, actionable (1-3 hours each), and directly connected to closing the gap for their target role.
- Explain WHY each recommendation matters specifically for the target role and current skill level.
- Certifications should only be recommended if they provide clear career value for the specific target role.
- Project recommendations should match the user's skill level and fill resume gaps for the target role.
- Market insights must be specific to the target role's job market.`;

export interface CareerRoadmapData {
  readinessScores: {
    overall: number;
    technical: number;
    resume: number;
    interview: number;
    placement: number;
    recruiter: number;
  };
  roadmap: {
    phases: {
      title: string;
      description: string;
      duration: string;
      objectives: string[];
      expectedOutcomes: string[];
      completionPercentage: number;
      dependencies: string[];
    }[];
    totalDuration: string;
  };
  weeklyPlan: {
    tasks: {
      title: string;
      description: string;
      category: string;
      priority: string;
      estimatedHours: number;
      impactScore: number;
      status: string;
    }[];
    dailyMicroTasks: string[];
    totalEstimatedHours: number;
  };
  gapAnalysis: {
    missingSkills: { skill: string; importance: string; priority: number; reason: string }[];
    missingProjects: { project: string; impact: string; effort: string }[];
    missingCertifications: { cert: string; why: string; difficulty: string; roi: string; studyTime: string }[];
    missingExperience: { area: string; suggestion: string }[];
    missingSoftSkills: { skill: string; importance: string }[];
  };
  skillMap: {
    skills: {
      name: string;
      currentLevel: number;
      targetLevel: number;
      status: string;
      dependencies: string[];
      category: string;
    }[];
  };
  projectRecommendations: {
    title: string;
    description: string;
    skillsGained: string[];
    resumeImpact: string;
    interviewValue: string;
    estimatedTime: string;
    difficulty: string;
    whyItMatters: string;
  }[];
  certRecommendations: {
    name: string;
    issuer: string;
    why: string;
    difficulty: string;
    roi: string;
    studyTime: string;
  }[];
  marketInsights: {
    currentDemand: string;
    averageSalary: string;
    topSkillCombinations: string[];
    resumeExpectations: string[];
    portfolioExpectations: string[];
    interviewTrends: string[];
    topHiringCompanies: string[];
    growthOutlook: string;
  };
  coachFeedback: {
    weeklyFeedback: string;
    progressSummary: string;
    motivationalGuidance: string;
    focusAreas: string[];
    risks: string[];
    nextBestAction: string;
  };
  milestones: {
    title: string;
    description: string;
    targetDate: string;
    category: string;
    status: string;
  }[];
}

function computeFallback(profileData: any): CareerRoadmapData {
  const targetRole = profileData?.targetRole || "Software Engineer";
  const skills = profileData?.resumeData?.skills || profileData?.profile?.skills || [];
  const experience = profileData?.resumeData?.experience || [];
  const projects = profileData?.resumeData?.projects || [];
  const dsaSolved = profileData?.codingAnalytics?.dsaSolved || 0;
  const dsaAccuracy = profileData?.codingAnalytics?.dsaAccuracy || 0;
  const avgAtsScore = profileData?.atsReports?.length
    ? Math.round(profileData.atsReports.reduce((s: number, r: any) => s + (r.score || 0), 0) / profileData.atsReports.length)
    : 0;
  const linkedinScore = profileData?.linkedinData?.score || 0;
  const weakTopics = profileData?.codingAnalytics?.weakTopics || [];
  const learningScore = profileData?.learningAnalytics?.learningScore || 0;
  const overallProgress = profileData?.learningAnalytics?.overallProgress || 0;

  // Compute readiness scores from actual data
  const technicalScore = Math.min(95, Math.round(
    (dsaSolved > 50 ? 70 : dsaSolved > 20 ? 50 : dsaSolved > 0 ? 30 : 10)
    + (dsaAccuracy * 30)
    + (skills.length > 5 ? 10 : skills.length * 2)
  ));
  const resumeScore = Math.min(95, avgAtsScore || (experience.length > 0 && projects.length > 0 ? 55 : 30));
  const interviewScore = Math.min(95, Math.round(technicalScore * 0.4 + resumeScore * 0.3 + (linkedinScore || 30) * 0.3));
  const placementScore = Math.min(95, Math.round(overallProgress * 0.5 + technicalScore * 0.3 + resumeScore * 0.2));
  const recruiterScore = Math.min(95, Math.round(resumeScore * 0.4 + linkedinScore * 0.3 + (projects.length > 2 ? 25 : projects.length * 10)));
  const overallScore = Math.round(technicalScore * 0.3 + resumeScore * 0.2 + interviewScore * 0.2 + placementScore * 0.15 + recruiterScore * 0.15);

  // Build skill map from actual skills
  const skillLevel = Math.min(80, Math.max(20,
    20
    + (dsaSolved > 50 ? 20 : dsaSolved > 20 ? 12 : dsaSolved > 0 ? 6 : 0)
    + Math.round(dsaAccuracy * 0.2)
    + Math.min(10, skills.length)
  ));
  const skillMapSkills = skills.slice(0, 8).map((s: string) => ({
    name: s,
    currentLevel: skillLevel,
    targetLevel: 85,
    status: "in_progress" as const,
    dependencies: [] as string[],
    category: "Technical",
  }));

  // Build gap analysis from weak topics
  const missingSkills = weakTopics.length > 0
    ? weakTopics.slice(0, 5).map((w: any) => ({
        skill: w.name,
        importance: w.risk === "High" || w.risk === "Critical" ? "High" : "Medium",
        priority: w.score < 30 ? 1 : w.score < 60 ? 2 : 3,
        reason: `Your strength score is ${w.score}/100 — needs improvement for ${targetRole} roles`,
      }))
    : [{ skill: "System Design", importance: "High" as const, priority: 1, reason: `Essential for ${targetRole} roles` }];

  const missingProjects = projects.length < 2
    ? [{ project: `${targetRole} Portfolio Project`, impact: "High", effort: "Medium" }]
    : [{ project: "Open Source Contribution", impact: "Medium", effort: "Low" }];

  const missingExperience = experience.length === 0
    ? [{ area: "Work Experience", suggestion: "Consider internships or freelance projects to build experience" }]
    : [{ area: "Leadership", suggestion: "Lead a project or mentor juniors to demonstrate leadership" }];

  // Build weekly tasks based on weakest area
  const tasks = [];
  if (dsaSolved < 20) {
    tasks.push({ title: "Solve 3 DSA problems daily", description: "Focus on arrays and strings — fundamentals for " + targetRole, category: "coding", priority: "High", estimatedHours: 3, impactScore: 80, status: "not_started" });
  } else if (dsaSolved < 100) {
    tasks.push({ title: "Solve 2 medium DSA problems", description: "Practice trees and graphs — commonly tested for " + targetRole, category: "coding", priority: "High", estimatedHours: 2, impactScore: 75, status: "not_started" });
  } else {
    tasks.push({ title: "Solve 1 hard DSA problem", description: "Focus on advanced patterns for senior " + targetRole + " roles", category: "coding", priority: "Medium", estimatedHours: 2, impactScore: 65, status: "not_started" });
  }

  if (resumeScore < 50) {
    tasks.push({ title: "Optimize resume for ATS", description: "Your ATS score is " + resumeScore + "% — rewrite key sections", category: "resume", priority: "High", estimatedHours: 2, impactScore: 85, status: "not_started" });
  } else {
    tasks.push({ title: "Add latest project to resume", description: "Keep resume updated with recent work", category: "resume", priority: "Medium", estimatedHours: 1, impactScore: 55, status: "not_started" });
  }

  tasks.push({ title: `Study ${targetRole} interview questions`, description: "Review common behavioral and technical questions", category: "interview", priority: "Medium", estimatedHours: 1, impactScore: 60, status: "not_started" });

  const dailyMicroTasks = [
    dsaSolved < 50 ? "Solve 1 DSA problem" : "Review 1 advanced concept",
    "Read 1 article about " + targetRole,
    "Practice 1 mock interview question",
  ];

  // Project recommendations based on skills
  const projectRecs = skills.length > 0
    ? [{ title: `${targetRole} Capstone`, description: `Build a production-grade project demonstrating ${skills.slice(0, 3).join(", ")}`, skillsGained: skills.slice(0, 4), resumeImpact: "Strong demonstration of technical ability", interviewValue: "Provides talking points for behavioral questions", estimatedTime: "3 weeks", difficulty: "Intermediate", whyItMatters: `Shows hands-on ${targetRole} competency to recruiters` }]
    : [{ title: "Full-Stack Portfolio", description: "Build a personal portfolio website", skillsGained: ["HTML", "CSS", "JavaScript"], resumeImpact: "Shows initiative", interviewValue: "Demonstrates self-learning", estimatedTime: "2 weeks", difficulty: "Beginner", whyItMatters: "First impression for recruiters" }];

  const targetRoleLower = targetRole.toLowerCase();
  const timeline = profileData?.timeline || "90 Days";

  return {
    readinessScores: { overall: overallScore, technical: technicalScore, resume: resumeScore, interview: interviewScore, placement: placementScore, recruiter: recruiterScore },
    roadmap: {
      phases: [
        { title: "Foundation & Gap Analysis", description: `Assess current skills relative to ${targetRole}`, duration: "1 Week", objectives: ["Complete skills assessment", "Identify top 3 gaps", "Set weekly targets"], expectedOutcomes: ["Clear gap analysis", "Personalized study plan"], completionPercentage: 0, dependencies: [] },
        { title: "Core Skill Development", description: `Build competencies required for ${targetRole}`, duration: "4 Weeks", objectives: ["Address weak coding topics", `Master ${targetRole}-specific skills`, "Daily practice routine"], expectedOutcomes: ["Improved technical scores", "New skills acquired"], completionPercentage: 0, dependencies: ["Foundation & Gap Analysis"] },
        { title: "Project Building", description: "Build projects that fill resume gaps", duration: "3 Weeks", objectives: ["Complete capstone project", "Contribute to open source", "Document everything"], expectedOutcomes: ["Strong portfolio", "Updated resume"], completionPercentage: 0, dependencies: ["Core Skill Development"] },
        { title: "Resume & Profile Optimization", description: "Maximize ATS and recruiter visibility", duration: "1 Week", objectives: ["ATS-optimize resume", "Update LinkedIn", `Tailor for ${targetRole} roles`], expectedOutcomes: ["High ATS score", "Professional online presence"], completionPercentage: 0, dependencies: ["Project Building"] },
        { title: "Interview Preparation", description: "Master technical and behavioral interviews", duration: `${Math.max(1, Math.round(parseInt(timeline) || 13) - 9)} Weeks`, objectives: ["DSA mock interviews", "Behavioral question prep", "Company-specific prep"], expectedOutcomes: ["Interview confidence", "Strong problem-solving"], completionPercentage: 0, dependencies: ["Resume & Profile Optimization"] },
      ],
      totalDuration: timeline,
    },
    weeklyPlan: { tasks, dailyMicroTasks, totalEstimatedHours: tasks.reduce((s, t) => s + t.estimatedHours, 0) },
    gapAnalysis: { missingSkills, missingProjects, missingCertifications: [], missingExperience, missingSoftSkills: [{ skill: "Communication", importance: "Medium" }] },
    skillMap: { skills: skillMapSkills },
    projectRecommendations: projectRecs,
    certRecommendations: [],
    marketInsights: { currentDemand: "Growing", averageSalary: "Competitive", topSkillCombinations: skills.slice(0, 3).length ? skills.slice(0, 3) : ["Python", "Cloud"], resumeExpectations: ["Projects section", "Skills list", "Work experience"], portfolioExpectations: ["GitHub portfolio", "Live projects"], interviewTrends: ["DSA + System Design", "Behavioral + System Design"], topHiringCompanies: ["Tech companies", "Startups"], growthOutlook: "Positive" },
    coachFeedback: { weeklyFeedback: `You've solved ${dsaSolved} DSA problems${dsaAccuracy > 0 ? ` with ${Math.round(dsaAccuracy * 100)}% accuracy` : ""}. ${resumeScore < 50 ? "Focus on improving your resume ATS score." : "Your resume is in good shape."} ${overallProgress > 0 ? `Overall platform progress: ${overallProgress}%.` : ""} Keep building momentum!`, progressSummary: `Technical: ${technicalScore}% | Resume: ${resumeScore}% | Interview: ${interviewScore}%`, motivationalGuidance: `Every ${targetRole} started somewhere. Focus on consistent daily progress.`, focusAreas: weakTopics.slice(0, 3).map((w: any) => w.name).concat(resumeScore < 50 ? ["Resume optimization"] : []), risks: [dsaSolved < 10 ? "Low practice volume" : "Maintaining consistency", "Timeline pressure"], nextBestAction: dsaSolved < 20 ? "Solve your first DSA problem today" : `Practice a ${targetRole} interview question` },
    milestones: [
      { title: "Skills Assessment Complete", description: "Identify all gaps and set targets", targetDate: "Week 1", category: "learning", status: "pending" },
      { title: "First Project Shipped", description: "Complete and deploy a project", targetDate: "Week 4", category: "project", status: "pending" },
      { title: "Resume Score > 70%", description: "Optimize resume to pass ATS", targetDate: "Week 6", category: "resume", status: "pending" },
    ],
  };
}

export async function generateCareerRoadmap(profileData: any): Promise<CareerRoadmapData> {
  const prompt = `Generate a comprehensive, ROLE-SPECIFIC career roadmap. Every recommendation must be tailored to the user's target role.

TARGET ROLE: ${profileData.targetRole || "Software Engineer"}
EXPERIENCE LEVEL: ${profileData.experienceLevel || "Entry-level"}
TIMELINE: ${profileData.timeline || "90 Days"}

=== USER PROFILE ===
${JSON.stringify(profileData.profile || {}, null, 2)}

=== RESUME DATA (from Resume Builder) ===
Skills: ${JSON.stringify(profileData.resumeData?.skills || [])}
Experience: ${JSON.stringify(profileData.resumeData?.experience || [])}
Projects: ${JSON.stringify(profileData.resumeData?.projects || [])}
Education: ${JSON.stringify(profileData.resumeData?.education || [])}
Certifications: ${JSON.stringify(profileData.resumeData?.certifications || [])}

=== RESUME ANALYSES (AI resume review results) ===
${JSON.stringify(profileData.resumeAnalyses || [], null, 2)}

=== RESUME IMPROVEMENTS (applied improvements) ===
${JSON.stringify(profileData.resumeImprovements || [], null, 2)}

=== CODING ANALYTICS (from Coding Hub) ===
DSA Problems Solved: ${profileData.codingAnalytics?.dsaSolved || 0}
DSA Accuracy: ${Math.round((profileData.codingAnalytics?.dsaAccuracy || 0) * 100)}%
DSA Streak: ${profileData.codingAnalytics?.dsaStreak || 0} days
Total Submissions: ${profileData.codingAnalytics?.totalSubmissions || 0}
Accepted Solutions: ${profileData.codingAnalytics?.solvedProblems || 0}
Coding Sessions: ${profileData.codingAnalytics?.codingSessions || 0}
Weak Coding Topics: ${JSON.stringify(profileData.codingAnalytics?.weakTopics || [])}

=== LEARNING ANALYTICS (from Learning Hub) ===
Study Sessions: ${profileData.learningAnalytics?.studySessions || 0}
Concepts Learned: ${profileData.learningAnalytics?.conceptsLearned || 0}
Learning Score: ${profileData.learningAnalytics?.learningScore || 0}
Learning Streak: ${profileData.learningAnalytics?.currentStreak || 0} days
Documents Generated: ${profileData.learningAnalytics?.documentsCount || 0}
Overall Progress: ${profileData.learningAnalytics?.overallProgress || 0}%
Quiz Attempts: ${profileData.learningAnalytics?.quizAttempts || 0}
Avg Quiz Score: ${profileData.learningAnalytics?.avgQuizScore || 0}%

=== ATS REPORTS (from ATS Checker) ===
${JSON.stringify(profileData.atsReports || [], null, 2)}

=== LINKEDIN DATA (from LinkedIn Optimizer) ===
LinkedIn Score: ${profileData.linkedinData?.score || 0}%
Headline: ${profileData.linkedinData?.headline || "Not set"}
LinkedIn Skills: ${JSON.stringify(profileData.linkedinData?.skills || [])}

=== INSTRUCTIONS ===
Analyze ALL the data above and generate a roadmap that:
1. Addresses the SPECIFIC gaps between the user's current level and what ${profileData.targetRole || "Software Engineer"} roles require
2. References actual data points (e.g., "You've solved X problems, now focus on Y")
3. Prioritizes based on the user's weakest areas relative to the target role
4. Includes weekly tasks that are achievable given the user's current workload
5. Recommends projects that fill gaps in their resume for ${profileData.targetRole || "Software Engineer"} positions
6. Provides market insights specific to ${profileData.targetRole || "Software Engineer"} roles

Return the data as a JSON object with this exact structure:
{
  "readinessScores": { "overall": number, "technical": number, "resume": number, "interview": number, "placement": number, "recruiter": number },
  "roadmap": { "phases": [{ "title": string, "description": string, "duration": string, "objectives": [string], "expectedOutcomes": [string], "completionPercentage": number, "dependencies": [string] }], "totalDuration": string },
  "weeklyPlan": { "tasks": [{ "title": string, "description": string, "category": string, "priority": string, "estimatedHours": number, "impactScore": number, "status": "not_started" }], "dailyMicroTasks": [string], "totalEstimatedHours": number },
  "gapAnalysis": { "missingSkills": [{ "skill": string, "importance": string, "priority": number, "reason": string }], "missingProjects": [{ "project": string, "impact": string, "effort": string }], "missingCertifications": [{ "cert": string, "why": string, "difficulty": string, "roi": string, "studyTime": string }], "missingExperience": [{ "area": string, "suggestion": string }], "missingSoftSkills": [{ "skill": string, "importance": string }] },
  "skillMap": { "skills": [{ "name": string, "currentLevel": number, "targetLevel": number, "status": string, "dependencies": [string], "category": string }] },
  "projectRecommendations": [{ "title": string, "description": string, "skillsGained": [string], "resumeImpact": string, "interviewValue": string, "estimatedTime": string, "difficulty": string, "whyItMatters": string }],
  "certRecommendations": [{ "name": string, "issuer": string, "why": string, "difficulty": string, "roi": string, "studyTime": string }],
  "marketInsights": { "currentDemand": string, "averageSalary": string, "topSkillCombinations": [string], "resumeExpectations": [string], "portfolioExpectations": [string], "interviewTrends": [string], "topHiringCompanies": [string], "growthOutlook": string },
  "coachFeedback": { "weeklyFeedback": string, "progressSummary": string, "motivationalGuidance": string, "focusAreas": [string], "risks": [string], "nextBestAction": string },
  "milestones": [{ "title": string, "description": string, "targetDate": string, "category": string, "status": "pending" }]
}`;

  try {
    const result = await generateJSON<CareerRoadmapData>(CAREER_SYSTEM, prompt, { model: MODELS.FAST }, computeFallback(profileData));
    return result;
  } catch (error) {
    console.warn("[Career AI] Generation failed, using computed fallback:", error);
    return computeFallback(profileData);
  }
}
