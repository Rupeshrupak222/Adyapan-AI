/**
 * Daily Automatic Test Generator
 * 
 * This script runs daily to automatically generate the next test for all topics/companies
 * - Checks existing tests and generates next sequential test number
 * - Prevents duplicates using anti-duplication system
 * - Logs all operations for monitoring
 * 
 * Usage: 
 * - Manual: npx tsx scripts/daily-test-generator.ts
 * - Cron: Schedule via node-cron or system cron
 */

import { masterPrisma } from "../src/utils/prisma";
import { generateAptitudeQuestions, AptitudeCategory } from "../src/services/aptitude-engine.service";
import { generateAITestWithAntiRepetition } from "../src/services/mcq.service";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_TESTS_PER_TOPIC: 100, // Stop after 100 tests per topic
  DELAY_BETWEEN_REQUESTS_MS: 500, // Rate limiting
  LOG_FILE: path.join(__dirname, "../logs/daily-test-generation.log"),
  DRY_RUN: process.env.DRY_RUN === "true", // Set DRY_RUN=true to test without creating
};

// ============================================================================
// TOPIC DEFINITIONS
// ============================================================================

const APTITUDE_TOPICS_BY_CATEGORY = {
  quantitative: [
    "Number System", "Percentages", "Profit & Loss", 
    "Simple & Compound Interest", "Time & Work", "Time Speed & Distance",
    "Ratio & Proportion", "Averages", "Mixtures & Alligations"
  ],
  logical: [
    "Seating Arrangement", "Puzzles", "Blood Relations", 
    "Coding-Decoding", "Direction Sense", "Number Series",
    "Analogy", "Statement & Conclusion", "Syllogisms",
    "Calendar", "Clocks"
  ],
  verbal: [
    "Reading Comprehension", "Sentence Correction", "Para Jumbles",
    "Synonyms & Antonyms", "Idioms & Phrases", "Fill in the Blanks"
  ],
  analytical: [
    "Data Sufficiency", "Logical Deduction", "Critical Reasoning",
    "Statement & Assumptions", "Cause & Effect", "Strong & Weak Arguments"
  ],
  data: [
    "Tables", "Bar Charts", "Line Graphs", 
    "Pie Charts", "Data Interpretation (Mixed)",
    "Data Comparison", "Data Analysis"
  ]
};

const APTITUDE_COMPANIES = ["TCS", "Infosys", "Wipro", "Accenture", "Capgemini"];

const TECHNICAL_TECHNOLOGIES = [
  "C", "C++", "Java", "Python", "JavaScript", "TypeScript", "Go", "Rust",
  "DBMS", "Operating Systems", "Computer Networks", "OOP", 
  "Software Engineering", "Compiler Design", "Computer Architecture",
  "HTML", "CSS", "React", "Angular", "Vue.js", "Next.js", "Node.js", "Express.js",
  "SQL", "PostgreSQL", "MongoDB", "MySQL", "Redis",
  "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes",
  "Machine Learning", "Deep Learning", "NLP", 
  "Computer Vision", "Data Science", "TensorFlow", "PyTorch"
];

const TECHNICAL_COMPANIES = [
  "Google", "Microsoft", "Amazon", "Adobe", "Meta", "Apple", 
  "NVIDIA", "Oracle", "IBM", "TCS", "Infosys", "Accenture",
  "Wipro", "Capgemini", "Cognizant", "Deloitte"
];

// ============================================================================
// LOGGING
// ============================================================================

function log(message: string, level: "INFO" | "ERROR" | "SUCCESS" | "SKIP" = "INFO") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  
  console.log(logMessage);
  
  // Append to log file
  try {
    const logDir = path.dirname(CONFIG.LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + "\n");
  } catch (error) {
    console.error("Failed to write to log file:", error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getNextTestNumber(
  topic: string,
  isCompany: boolean,
  module: "aptitude" | "technical"
): Promise<number | null> {
  try {
    if (module === "aptitude") {
      const existingTests = await masterPrisma.aptitudeTopicTest.findMany({
        where: { topic: { equals: topic, mode: "insensitive" } },
        orderBy: { testNumber: "desc" },
        take: 1
      });
      
      const currentMax = existingTests[0]?.testNumber || 0;
      
      if (currentMax >= CONFIG.MAX_TESTS_PER_TOPIC) {
        log(`Topic ${topic} has reached maximum tests (${currentMax})`, "SKIP");
        return null;
      }
      
      return currentMax + 1;
    } else {
      // Technical MCQ
      const targetId = topic.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const prefix = isCompany ? "test-company-" : "test-";
      
      // Find all existing tests with this prefix
      const existingTests = await masterPrisma.mcqTest.findMany({
        where: {
          id: {
            startsWith: `${prefix}${targetId}-`
          }
        },
        orderBy: { testNumber: "desc" },
        take: 1
      });
      
      const currentMax = existingTests[0]?.testNumber || 0;
      
      if (currentMax >= CONFIG.MAX_TESTS_PER_TOPIC) {
        log(`Topic ${topic} has reached maximum tests (${currentMax})`, "SKIP");
        return null;
      }
      
      return currentMax + 1;
    }
  } catch (error) {
    log(`Error getting next test number for ${topic}: ${error}`, "ERROR");
    return null;
  }
}

// ============================================================================
// GENERATION FUNCTIONS
// ============================================================================

async function generateNextAptitudeTest(
  topic: string,
  category: string
): Promise<boolean> {
  try {
    const normalizedCategory = category.toLowerCase();
    const normalizedTopic = topic.trim();
    const isCompany = normalizedCategory === "company";
    
    const nextTestNum = await getNextTestNumber(normalizedTopic, isCompany, "aptitude");
    
    if (nextTestNum === null) {
      return false; // Skip, max reached
    }
    
    log(`Generating Aptitude Test #${nextTestNum} for: ${normalizedTopic} (${normalizedCategory})`);
    
    // Collect existing questions
    const existingTests = await masterPrisma.aptitudeTopicTest.findMany({
      where: { topic: { equals: normalizedTopic, mode: "insensitive" } },
    });
    
    const existingQuestionTexts = new Set<string>();
    for (const test of existingTests) {
      if (Array.isArray(test.questionsJson)) {
        for (const q of (test.questionsJson as any[])) {
          if (q.text) existingQuestionTexts.add(q.text.toLowerCase().trim());
        }
      }
    }
    
    log(`  Found ${existingQuestionTexts.size} existing questions`);
    
    if (CONFIG.DRY_RUN) {
      log(`  [DRY RUN] Would create Test #${nextTestNum}`, "INFO");
      return true;
    }
    
    // Generate questions
    let questions: any[] = [];
    const difficulty = nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard";
    
    try {
      if (isCompany) {
        questions = await generateAptitudeQuestions({
          company: normalizedTopic,
          count: 30,
          difficulty,
          testNumber: nextTestNum,
          existingQuestionTexts,
        });
      } else {
        questions = await generateAptitudeQuestions({
          topic: normalizedTopic,
          category: normalizedCategory as AptitudeCategory,
          count: 30,
          difficulty,
          testNumber: nextTestNum,
          existingQuestionTexts,
        });
      }
    } catch (error) {
      log(`  AI generation failed, using fallback`, "ERROR");
      questions = [];
    }
    
    const uniqueQuestions = questions.filter(q => 
      !existingQuestionTexts.has(q.text.toLowerCase().trim())
    );
    
    // Create test
    const newTest = await masterPrisma.aptitudeTopicTest.create({
      data: {
        category: normalizedCategory,
        topic: normalizedTopic,
        testNumber: nextTestNum,
        title: `Test ${nextTestNum}`,
        weekNumber: Math.ceil(nextTestNum / 1),
        questionsJson: uniqueQuestions.slice(0, 30) as any,
        totalQuestions: Math.min(30, uniqueQuestions.length),
        difficulty,
      },
    });
    
    log(`  Created Test #${nextTestNum} (ID: ${newTest.id}) with ${newTest.totalQuestions} questions`, "SUCCESS");
    return true;
    
  } catch (error) {
    log(`Failed to generate test for ${topic}: ${error}`, "ERROR");
    return false;
  }
}

async function generateNextTechnicalTest(
  targetName: string,
  targetType: "technology" | "company"
): Promise<boolean> {
  try {
    const targetId = targetName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const isCompany = targetType === "company";
    
    const nextTestNum = await getNextTestNumber(targetName, isCompany, "technical");
    
    if (nextTestNum === null) {
      return false; // Skip, max reached
    }
    
    log(`Generating Technical Test #${nextTestNum} for: ${targetName} (${targetType})`);
    
    // Get existing questions
    const prefix = isCompany ? "test-company-" : "test-";
    const existingTests = await masterPrisma.mcqTest.findMany({
      where: {
        id: {
          startsWith: `${prefix}${targetId}-`
        }
      }
    });
    
    const existingQuestionTexts = new Set<string>();
    for (const test of existingTests) {
      if (Array.isArray(test.questionsJson)) {
        for (const q of (test.questionsJson as any[])) {
          if (q.text) existingQuestionTexts.add(q.text.toLowerCase().trim());
        }
      }
    }
    
    log(`  Found ${existingQuestionTexts.size} existing questions`);
    
    if (CONFIG.DRY_RUN) {
      log(`  [DRY RUN] Would create Test #${nextTestNum}`, "INFO");
      return true;
    }
    
    // Generate test
    let questions: any[] = [];
    
    try {
      const result = await generateAITestWithAntiRepetition({
        targetId,
        targetName,
        targetType,
        testNumber: nextTestNum,
        questionCount: 30,
        existingQuestionTexts,
        userSeenQuestions: []
      });
      
      questions = result.questions;
    } catch (error) {
      log(`  AI generation failed: ${error}`, "ERROR");
      questions = [];
    }
    
    // Create test
    const testId = `${prefix}${targetId}-${nextTestNum}`;
    const newTest = await masterPrisma.mcqTest.create({
      data: {
        id: testId,
        technology: targetType === "technology" ? targetId : undefined,
        company: targetType === "company" ? targetId : undefined,
        testNumber: nextTestNum,
        title: `${targetName} - Test ${nextTestNum}`,
        questionsJson: questions as any,
        totalQuestions: questions.length,
        difficulty: nextTestNum % 3 === 1 ? "easy" : nextTestNum % 3 === 2 ? "medium" : "hard",
        durationMinutes: 30,
      },
    });
    
    log(`  Created Test #${nextTestNum} (ID: ${newTest.id}) with ${newTest.totalQuestions} questions`, "SUCCESS");
    return true;
    
  } catch (error) {
    log(`Failed to generate test for ${targetName}: ${error}`, "ERROR");
    return false;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  log("=".repeat(70));
  log("DAILY AUTOMATIC TEST GENERATION STARTED");
  log("=".repeat(70));
  
  if (CONFIG.DRY_RUN) {
    log("⚠️  DRY RUN MODE - No tests will be created", "INFO");
  }
  
  const stats = {
    aptitude: { success: 0, skipped: 0, errors: 0 },
    technical: { success: 0, skipped: 0, errors: 0 }
  };
  
  // ============================================================================
  // 1. APTITUDE TESTS
  // ============================================================================
  
  log("\n📚 Generating Aptitude Tests");
  
  for (const [category, topics] of Object.entries(APTITUDE_TOPICS_BY_CATEGORY)) {
    for (const topic of topics) {
      const result = await generateNextAptitudeTest(topic, category);
      if (result) stats.aptitude.success++;
      else stats.aptitude.skipped++;
      await delay(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
    }
  }
  
  for (const company of APTITUDE_COMPANIES) {
    const result = await generateNextAptitudeTest(company, "company");
    if (result) stats.aptitude.success++;
    else stats.aptitude.skipped++;
    await delay(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }
  
  // ============================================================================
  // 2. TECHNICAL TESTS
  // ============================================================================
  
  log("\n💻 Generating Technical Tests");
  
  for (const tech of TECHNICAL_TECHNOLOGIES) {
    const result = await generateNextTechnicalTest(tech, "technology");
    if (result) stats.technical.success++;
    else stats.technical.skipped++;
    await delay(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }
  
  for (const company of TECHNICAL_COMPANIES) {
    const result = await generateNextTechnicalTest(company, "company");
    if (result) stats.technical.success++;
    else stats.technical.skipped++;
    await delay(CONFIG.DELAY_BETWEEN_REQUESTS_MS);
  }
  
  // ============================================================================
  // SUMMARY
  // ============================================================================
  
  log("\n" + "=".repeat(70));
  log("DAILY GENERATION COMPLETE");
  log("=".repeat(70));
  
  log(`\n📊 Aptitude Tests: ${stats.aptitude.success} created, ${stats.aptitude.skipped} skipped`);
  log(`📊 Technical Tests: ${stats.technical.success} created, ${stats.technical.skipped} skipped`);
  log(`📊 Total: ${stats.aptitude.success + stats.technical.success} new tests created`);
  
  await masterPrisma.$disconnect();
}

// Run the script
main().catch((error) => {
  log(`Fatal error: ${error}`, "ERROR");
  process.exit(1);
});
