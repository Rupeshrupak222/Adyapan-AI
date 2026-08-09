import { Router } from "express";
import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { healthRouter } from "./health.routes";
import { profileRouter } from "./profile.routes";
import { resumeRouter } from "./resume.routes";
import { atsRouter } from "./ats.routes";
import { resumeAnalysisRouter } from "./resume-analysis.routes";
import { coverLetterRouter } from "./cover-letter.routes";
import { linkedinRouter } from "./linkedin.routes";
import { linkedinJobsRouter } from "./linkedin-jobs.routes";
import { studyRouter } from "./study.routes";
import { notesRouter } from "./notes.routes";
import { notesExportRouter } from "./notes-export.routes";
import { quizRouter } from "./quiz.routes";
import { assignmentRouter } from "./assignment.routes";
import { assignmentExportRouter } from "./assignment-export.routes";
import { mindMapRouter } from "./mindmap.routes";
import { codingRouter } from "./coding.routes";
import { dsaRouter } from "./dsa.routes";
import { challengesRouter } from "./challenges.routes";
import { githubRouter } from "./github.routes";
import { interviewRouter } from "./interview.routes";
import { adyChatRouter } from "./ady-chat.routes";
import { paymentRouter } from "./payment.routes";
import { notificationRouter } from "./notification.routes";
import { flashcardsRouter } from "./flashcards.routes";
import { progressRouter } from "./progress.routes";
import { studyPlannerRouter } from "./study-planner.routes";
import { streakRouter } from "./streak.routes";
import { weakTopicsRouter } from "./weak-topics.routes";
import { recommendationRouter } from "./recommendation.routes";
import { researchRouter } from "./research.routes";
import { plagiarismRouter } from "./plagiarism.routes";
import { resumeUploadRouter } from "./resume-upload.routes";
import { jobRouter } from "./job.routes";
import { jobListingRouter } from "./job-listing.routes";
import { communityRouter } from "./community.routes";
import { careerRouter } from "./career.routes";
import { configRouter } from "./config.routes";
import { searchRouter } from "./search.routes";
import { blogRouter } from "./blog.routes";
import { placementRouter } from "./placement.routes";
import { placementIntelligenceRouter } from "./placement-intelligence.routes";
import { aptitudeEngineRouter } from "./aptitude-engine.routes";
import { reasoningRouter } from "./reasoning.routes";
import { mcqRouter } from "./mcq.routes";
import { engineRouter } from "./engine.routes";
import { technicalEngineRouter } from "./technical-engine.routes";
import { hrInterviewRouter } from "./hr-interview.routes";
import { productivityRouter } from "./productivity.routes";
import { jobDiscoveryRouter } from "./job-discovery.routes";
import avatarRouter from "./avatar.routes";
import { settingsRouter } from "./settings.routes";
import { usageRouter } from "./usage.routes";
import { subscriptionRouter } from "./subscription.routes";
import { enforceAiTokenLimit } from "../middleware/aiTokenLimit.middleware";

export const apiRouter = Router();

// Global AI plan-limit enforcement. Mounted before sub-routers so it sees the
// original path; it only acts on AI-generation endpoints (POST/PUT/etc).
apiRouter.use(enforceAiTokenLimit);

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/resume", resumeRouter);
apiRouter.use("/resume-upload", resumeUploadRouter);
apiRouter.use("/ats", atsRouter);
apiRouter.use("/resume-analysis", resumeAnalysisRouter);
apiRouter.use("/cover-letter", coverLetterRouter);
apiRouter.use("/linkedin", linkedinRouter);
apiRouter.use("/linkedin-jobs", linkedinJobsRouter);

// Learning Hub Routes
apiRouter.use("/study", studyRouter);
apiRouter.use("/notes", notesRouter);
apiRouter.use("/notes/export", notesExportRouter);
apiRouter.use("/export", notesExportRouter);
apiRouter.use("/quiz", quizRouter);
apiRouter.use("/assignment", assignmentRouter);
apiRouter.use("/assignment/export", assignmentExportRouter);
apiRouter.use("/export/assignment", assignmentExportRouter);
apiRouter.use("/mindmap", mindMapRouter);
apiRouter.use("/coding", codingRouter);
apiRouter.use("/dsa", dsaRouter);
apiRouter.use("/challenges", challengesRouter);
apiRouter.use("/github", githubRouter);
apiRouter.use("/interview", interviewRouter);
apiRouter.use("/ady-chat", adyChatRouter);
apiRouter.use("/flashcards", flashcardsRouter);
apiRouter.use("/payment", paymentRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/progress", progressRouter);
apiRouter.use("/study-planner", studyPlannerRouter);
apiRouter.use("/streak", streakRouter);
apiRouter.use("/weak-topics", weakTopicsRouter);
apiRouter.use("/recommendations", recommendationRouter);

// Research Hub Routes
apiRouter.use("/research", researchRouter);

// Plagiarism Checker Routes
apiRouter.use("/plagiarism", plagiarismRouter);

// Job Hub Routes
apiRouter.use("/job", jobRouter);

// Enhanced Job Listing Routes
apiRouter.use("/job-listing", jobListingRouter);

// Job Discovery Platform Routes
apiRouter.use("/discovery", jobDiscoveryRouter);

// Community Routes
apiRouter.use("/community", communityRouter);

// Career Navigation Engine Routes
apiRouter.use("/career", careerRouter);

// Interview Engine Routes
apiRouter.use("/engine", engineRouter);

// Technical Interview Engine Routes
apiRouter.use("/technical-engine", technicalEngineRouter);

// HR Interview Engine Routes
apiRouter.use("/interview/hr", hrInterviewRouter);

// Placement Hub Routes
apiRouter.use("/placement", placementRouter);

// Logical Reasoning Routes
apiRouter.use("/reasoning", reasoningRouter);
apiRouter.use("/placement/reasoning", reasoningRouter);

// Technical MCQs Routes
apiRouter.use("/mcq", mcqRouter);
apiRouter.use("/placement/mcq", mcqRouter);

// Placement Intelligence Routes
apiRouter.use("/placement/intelligence", placementIntelligenceRouter);

// Aptitude Engine Routes
apiRouter.use("/aptitude", aptitudeEngineRouter);

// Productivity Hub Routes
apiRouter.use("/productivity", productivityRouter);

// Platform Configuration Routes
apiRouter.use("/config", configRouter);

// Global Search Route
apiRouter.use("/search", searchRouter);

// Blog Routes
apiRouter.use("/blog", blogRouter);

// AI Avatar Routes
apiRouter.use("/avatar", avatarRouter);

// User Settings Routes
apiRouter.use("/settings", settingsRouter);

// AI Usage / Plan Limits Routes
apiRouter.use("/usage", usageRouter);

// Enterprise Subscription System Routes
apiRouter.use("/subscription", subscriptionRouter);
