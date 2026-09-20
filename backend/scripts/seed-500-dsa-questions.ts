import { prisma } from "../src/config/prisma";
import fs from "fs";
import path from "path";

interface ExtractedQuestion {
  number: number;
  externalId: string;
  slug: string;
  title: string;
  rawTitle: string;
  category: string;
  topic: string;
  difficulty: string;
  rating: number;
  tags: string[];
  statement: string;
  constraints: string;
  inputFormat: string;
  outputFormat: string;
  complexityTarget: string;
  visibleTestCases: any[];
  hiddenTestCases: any[];
  examples: any[];
  aiAnalysis: any;
  companies: string[];
  timeLimit: string;
  memoryLimit: string;
  placementImportance: boolean;
  interviewImportance: boolean;
}

async function main() {
  const jsonPath = path.resolve(__dirname, "../../docs/curated_easy_dsa_500_questions.json");
  console.log(`Reading 500 questions JSON from: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON file not found at ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const questions: ExtractedQuestion[] = JSON.parse(rawData);
  console.log(`Loaded ${questions.length} questions from JSON.`);

  console.log("Preloading existing database records into memory to eliminate redundant lookups...");
  const [existingQuestions, existingAnalyses, existingProblems] = await Promise.all([
    prisma.codingQuestion.findMany({ select: { id: true, externalId: true } }),
    prisma.questionAIAnalysis.findMany({ select: { id: true, questionId: true } }),
    (prisma as any).problem.findMany({ select: { id: true, title: true } }),
  ]);

  console.log(`Found ${existingQuestions.length} existing coding questions.`);
  console.log(`Found ${existingAnalyses.length} existing AI analyses.`);
  console.log(`Found ${existingProblems.length} existing problems.`);

  const qMap = new Map<string, string>();
  for (const eq of existingQuestions) {
    qMap.set(eq.externalId, eq.id);
  }

  const analysisMap = new Map<string, string>();
  for (const ea of existingAnalyses) {
    analysisMap.set(ea.questionId, ea.id);
  }

  const probMap = new Map<string, string>();
  for (const ep of existingProblems) {
    probMap.set(ep.title, ep.id);
  }

  let processedCount = 0;
  let updatedCodingQuestions = 0;
  let createdCodingQuestions = 0;
  let updatedAiAnalyses = 0;
  let upsertedProblems = 0;

  // Process a single question
  async function processQuestion(q: ExtractedQuestion) {
    const existingId = qMap.get(q.externalId) || qMap.get(q.slug);
    let questionId: string;

    const cqData = {
      externalId: q.externalId,
      title: q.title,
      source: "curated_dsa",
      difficulty: q.difficulty,
      rating: q.rating,
      topic: q.topic,
      tagsJson: q.tags,
      statement: q.statement,
      constraints: q.constraints,
      inputFormat: q.inputFormat,
      outputFormat: q.outputFormat,
      examples: q.examples,
      visibleTestCases: q.visibleTestCases,
      hiddenTestCases: q.hiddenTestCases,
      timeLimit: q.timeLimit,
      memoryLimit: q.memoryLimit,
      placementImportance: true,
      interviewImportance: true,
    };

    if (existingId) {
      await prisma.codingQuestion.update({
        where: { id: existingId },
        data: cqData,
      });
      questionId = existingId;
      updatedCodingQuestions++;
    } else {
      const created = await prisma.codingQuestion.create({
        data: cqData,
      });
      questionId = created.id;
      qMap.set(q.externalId, questionId);
      createdCodingQuestions++;
    }

    // Upsert QuestionAIAnalysis
    const existingAnalysisId = analysisMap.get(questionId);
    if (existingAnalysisId) {
      await prisma.questionAIAnalysis.update({
        where: { id: existingAnalysisId },
        data: {
          explanationJson: q.aiAnalysis,
          generatedByModel: "curated-dsa-bank",
          generatedAt: new Date(),
        },
      });
    } else {
      const createdAnalysis = await prisma.questionAIAnalysis.create({
        data: {
          questionId,
          explanationJson: q.aiAnalysis,
          generatedByModel: "curated-dsa-bank",
          generatedAt: new Date(),
        },
      });
      analysisMap.set(questionId, createdAnalysis.id);
    }
    updatedAiAnalyses++;

    // Upsert Problem model
    const probData = {
      title: q.title,
      difficulty: q.difficulty,
      category: q.category,
      companies: q.companies,
      statement: q.statement,
      constraints: q.constraints,
      examples: q.examples,
      hints: [q.aiAnalysis.hint_1, q.aiAnalysis.hint_2, q.aiAnalysis.hint_3],
      editorial: q.aiAnalysis.optimal_approach,
    };

    const existingProbId = probMap.get(q.title);
    if (existingProbId) {
      await (prisma as any).problem.update({
        where: { id: existingProbId },
        data: probData,
      });
    } else {
      const createdProb = await (prisma as any).problem.create({
        data: probData,
      });
      probMap.set(q.title, createdProb.id);
    }
    upsertedProblems++;

    processedCount++;
    if (processedCount % 50 === 0 || processedCount === questions.length) {
      console.log(`Progress: ${processedCount}/${questions.length} questions processed (${Math.round((processedCount / questions.length) * 100)}%)`);
    }
  }

  // Run with concurrency pool of 6 workers
  const CONCURRENCY = 6;
  const queue = [...questions];

  async function worker() {
    while (queue.length > 0) {
      const q = queue.shift();
      if (!q) break;
      try {
        await processQuestion(q);
      } catch (err: any) {
        console.error(`Error processing question ${q.number} (${q.title}):`, err.message || err);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log("\n================ INGESTION SUMMARY ================");
  console.log(`Updated codingQuestion records: ${updatedCodingQuestions}`);
  console.log(`Created codingQuestion records: ${createdCodingQuestions}`);
  console.log(`Total codingQuestion in DB: ${await prisma.codingQuestion.count()}`);
  console.log(`Total questionAIAnalysis in DB: ${await prisma.questionAIAnalysis.count()}`);
  console.log(`Total problem in DB: ${await (prisma as any).problem.count()}`);
  console.log("===================================================\n");
}

main()
  .catch((e) => {
    console.error("Fatal error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
