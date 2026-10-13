import { prisma } from "../config/prisma";

async function clearAll() {
  console.log("Starting deletion of all existing coding questions and related tables...");
  
  try {
    const aiAnalysis = await prisma.questionAIAnalysis.deleteMany({});
    console.log(`Deleted ${aiAnalysis.count} QuestionAIAnalysis records.`);

    const dailyChallenges = await prisma.dailyChallenge.deleteMany({});
    console.log(`Deleted ${dailyChallenges.count} DailyChallenge records.`);

    // Preserve userQuestionProgress (and thus historical solved counts) across
    // a question-bank swap. The progress rows become orphaned but are still
    // counted by DsaProgressService. Do NOT delete them here.
    const userProgress = await prisma.userQuestionProgress.count();
    console.log(`Preserved ${userProgress} UserQuestionProgress records (user solved history kept).`);

    const sessions = await prisma.problemWorkspaceSession.deleteMany({});
    console.log(`Deleted ${sessions.count} ProblemWorkspaceSession records.`);

    const notes = await prisma.problemNote.deleteMany({});
    console.log(`Deleted ${notes.count} ProblemNote records.`);

    const bookmarks = await prisma.problemBookmark.deleteMany({});
    console.log(`Deleted ${bookmarks.count} ProblemBookmark records.`);

    const discussions = await prisma.problemDiscussion.deleteMany({});
    console.log(`Deleted ${discussions.count} ProblemDiscussion records.`);

    const submissions = await prisma.submission.deleteMany({});
    console.log(`Deleted ${submissions.count} Submission records.`);

    const problems = await prisma.problem.deleteMany({});
    console.log(`Deleted ${problems.count} Problem records.`);

    const questions = await prisma.codingQuestion.deleteMany({});
    console.log(`Deleted ${questions.count} CodingQuestion records.`);

    console.log("All questions successfully wiped from database!");
  } catch (error) {
    console.error("Error clearing questions:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

clearAll();
