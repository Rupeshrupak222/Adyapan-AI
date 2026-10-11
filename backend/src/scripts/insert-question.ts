import { prisma } from "../config/prisma";

export interface QuestionInput {
  number?: number;
  externalId?: string;
  title: string;
  topic: string; // e.g. "Arrays", "Strings", "Dynamic Programming", etc.
  difficulty: "Easy" | "Medium" | "Hard";
  rating?: number;
  statement: string;
  constraints?: string;
  inputFormat?: string;
  outputFormat?: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  visibleTestCases?: Array<{
    input: string;
    expectedOutput: string;
    explanation?: string;
  }>;
  hiddenTestCases?: Array<{
    input: string;
    expectedOutput: string;
  }>;
  tags?: string[];
  companies?: string[];
  hints?: string[];
}

export async function insertSingleQuestion(q: QuestionInput) {
  const fs = require("fs");
  const path = require("path");
  const jsonPath = path.resolve(__dirname, "../../data/curated-dsa-questions.json");
  let jsonList: any[] = [];
  if (fs.existsSync(jsonPath)) {
    try {
      jsonList = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    } catch { }
  }

  // Check duplicate by title in database & JSON
  const normalizedTitle = q.title.trim().toLowerCase();
  const existingInDb = await prisma.codingQuestion.findFirst({
    where: {
      title: { equals: q.title.trim(), mode: "insensitive" }
    }
  });

  const existingInJson = jsonList.find((item: any) =>
    item.title && item.title.trim().toLowerCase() === normalizedTitle
  );

  if (existingInDb) {
    console.log(`[DUPLICATE DETECTED] Question "${q.title}" already exists in DB as ${existingInDb.externalId || existingInDb.id}. Skipping insertion.`);
    return {
      duplicate: true,
      existing: existingInDb
    };
  }

  // If number or externalId not provided, determine next number
  let externalId = q.externalId || existingInJson?.externalId;
  let qNum = q.number || existingInJson?.number;

  if (!externalId) {
    const lastNum = jsonList.reduce((max: number, it: any) => Math.max(max, it.number || 0), 0);
    const count = await prisma.codingQuestion.count();
    const nextNum = qNum || Math.max(lastNum, count) + 1;
    qNum = nextNum;
    externalId = `DSA-${String(nextNum).padStart(3, "0")}`;
  }

  const rating = q.rating || (q.difficulty === "Easy" ? 800 : q.difficulty === "Medium" ? 1400 : 1800);
  const tags = q.tags || [q.topic];
  const companies = q.companies || [];

  const visibleTestCases = (q.visibleTestCases && q.visibleTestCases.length > 0)
    ? q.visibleTestCases.map((tc, idx) => ({
        testNumber: idx + 1,
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim(),
        explanation: tc.explanation || ""
      }))
    : q.examples.map((ex, idx) => ({
        testNumber: idx + 1,
        input: ex.input.trim(),
        expectedOutput: ex.output.trim(),
        explanation: ex.explanation || ""
      }));

  const hiddenTestCases = (q.hiddenTestCases && q.hiddenTestCases.length > 0)
    ? q.hiddenTestCases.map((tc, idx) => ({
        testNumber: idx + 1,
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim()
      }))
    : visibleTestCases;

  console.log(`Inserting question [${externalId}]: ${q.title}...`);

  const createdCodingQuestion = await prisma.codingQuestion.upsert({
    where: { externalId },
    create: {
      externalId,
      title: q.title,
      source: "curated_dsa",
      difficulty: q.difficulty,
      rating,
      topic: q.topic,
      tagsJson: tags,
      statement: q.statement,
      constraints: q.constraints || "",
      inputFormat: q.inputFormat || "",
      outputFormat: q.outputFormat || "",
      examples: q.examples,
      visibleTestCases,
      hiddenTestCases,
      placementImportance: true,
      interviewImportance: true,
    },
    update: {
      title: q.title,
      difficulty: q.difficulty,
      rating,
      topic: q.topic,
      tagsJson: tags,
      statement: q.statement,
      constraints: q.constraints || "",
      inputFormat: q.inputFormat || "",
      outputFormat: q.outputFormat || "",
      examples: q.examples,
      visibleTestCases,
      hiddenTestCases,
    }
  });

  const hints = q.hints || [];

  // Also sync into Problem table if used by workspace
  await prisma.problem.upsert({
    where: { id: createdCodingQuestion.id },
    create: {
      id: createdCodingQuestion.id,
      title: q.title,
      difficulty: q.difficulty,
      category: q.topic,
      companies,
      statement: q.statement,
      constraints: q.constraints || "",
      examples: q.examples,
      hints,
    },
    update: {
      title: q.title,
      difficulty: q.difficulty,
      category: q.topic,
      companies,
      statement: q.statement,
      constraints: q.constraints || "",
      examples: q.examples,
      hints,
    }
  });

  // Pre-seed QuestionAIAnalysis with structured data (hints, explanation, complexities)
  await prisma.questionAIAnalysis.deleteMany({
    where: { questionId: createdCodingQuestion.id }
  });

  await prisma.questionAIAnalysis.create({
    data: {
      questionId: createdCodingQuestion.id,
      generatedByModel: "deepseek-coder",
      explanationJson: {
        problem_explanation: q.statement,
        inputSpecification: q.inputFormat || "",
        outputSpecification: q.outputFormat || "",
        constraints: q.constraints || "",
        hints: hints,
        timeLimit: "2.0s",
        memoryLimit: "256 MB",
        examples: q.examples,
        companies: companies,
      }
    }
  });

  console.log(`Successfully inserted question: ${q.title} (${externalId}) with ID: ${createdCodingQuestion.id}`);

  // Automatically sync to backend/data/curated-dsa-questions.json
  try {
    const fs = require("fs");
    const path = require("path");
    const jsonPath = path.resolve(__dirname, "../../data/curated-dsa-questions.json");
    let list: any[] = [];
    if (fs.existsSync(jsonPath)) {
      list = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    }
    const idx = list.findIndex((item: any) => item.externalId === externalId);
    const itemToSave = { number: qNum, ...q, externalId, id: createdCodingQuestion.id };
    if (idx >= 0) {
      list[idx] = itemToSave;
    } else {
      list.push(itemToSave);
    }
    list.sort((a, b) => (a.number || 0) - (b.number || 0));
    fs.writeFileSync(jsonPath, JSON.stringify(list, null, 2), "utf-8");
    console.log(`Synced to curated-dsa-questions.json (Total in file: ${list.length})`);
  } catch (err) {
    console.warn("Could not sync to JSON backup:", err);
  }

  return createdCodingQuestion;
}

// Support CLI invocation by passing a JSON file path
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    const fs = require("fs");
    const filePath = args[0];
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    insertSingleQuestion(data)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(err);
        process.exit(1);
      });
  }
}
