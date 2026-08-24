/**
 * Test Case Generator Service
 * Generates additional hidden test cases for proper code validation.
 * Uses AI to generate edge-case inputs and a reference solution to produce expected outputs.
 * This prevents students from cheating by hardcoding sample outputs.
 */

import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { executeCode } from "./piston.service";
import { prisma } from "../config/prisma";

export interface GeneratedTestCase {
  input: string;
  output: string;
  category: "edge" | "random" | "stress" | "corner";
}

interface CachedTestCases {
  testCases: GeneratedTestCase[];
  referenceSolution: string;
  generatedAt: number;
}

// In-memory cache for generated test cases (per question)
const testCaseCache = new Map<string, CachedTestCases>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Generates hidden test cases for a problem using AI + reference solution execution.
 * Strategy:
 * 1. AI generates a correct reference solution in Python
 * 2. AI generates diverse test inputs (edge cases, random, stress)
 * 3. We run the reference solution against each input to get expected outputs
 * 4. These become the hidden test cases for judging student code
 */
export async function generateHiddenTestCases(
  questionId: string,
  problemDescription: string,
  inputSpec: string,
  outputSpec: string,
  constraints: string,
  scrapedExamples: Array<{ input: string; output: string }>,
  difficulty: string
): Promise<GeneratedTestCase[]> {
  // Check cache
  const cached = testCaseCache.get(questionId);
  if (cached && Date.now() - cached.generatedAt < CACHE_TTL) {
    return cached.testCases;
  }

  // Check DB cache
  const dbCached = await getDBCachedTestCases(questionId);
  if (dbCached && dbCached.length > 0) {
    testCaseCache.set(questionId, {
      testCases: dbCached,
      referenceSolution: "",
      generatedAt: Date.now(),
    });
    return dbCached;
  }

  try {
    // Step 1: Generate reference solution + test inputs via AI
    const generationResult = await generateTestInputsAndSolution(
      problemDescription,
      inputSpec,
      outputSpec,
      constraints,
      scrapedExamples,
      difficulty
    );

    if (!generationResult) {
      return [];
    }

    const { referenceSolution, testInputs } = generationResult;

    // Step 2: Run reference solution against each generated input
    const hiddenTestCases: GeneratedTestCase[] = [];

    for (const testInput of testInputs) {
      try {
        const result = await executeCode("python", referenceSolution, testInput.input, 15000);
        if (result.success && result.stdout.trim()) {
          hiddenTestCases.push({
            input: testInput.input,
            output: result.stdout.trim(),
            category: testInput.category,
          });
        }
      } catch {
        // Skip failed test case generation
      }
    }

    // Step 3: Validate reference solution against scraped examples
    let referenceValid = true;
    for (const example of scrapedExamples) {
      try {
        const result = await executeCode("python", referenceSolution, example.input, 10000);
        const actual = result.stdout.trim();
        const expected = example.output.trim();
        if (!result.success || !compareOutputs(actual, expected)) {
          referenceValid = false;
          break;
        }
      } catch {
        referenceValid = false;
        break;
      }
    }

    // Only use generated test cases if reference solution is verified
    if (!referenceValid) {
      console.warn(`[TestCaseGenerator] Reference solution failed validation for question ${questionId}`);
      return [];
    }

    // Cache results
    testCaseCache.set(questionId, {
      testCases: hiddenTestCases,
      referenceSolution,
      generatedAt: Date.now(),
    });

    // Persist to DB
    await saveTestCasesToDB(questionId, hiddenTestCases);

    return hiddenTestCases;
  } catch (err) {
    console.error("[TestCaseGenerator] Failed to generate hidden test cases:", err);
    return [];
  }
}

async function generateTestInputsAndSolution(
  problemDescription: string,
  inputSpec: string,
  outputSpec: string,
  constraints: string,
  examples: Array<{ input: string; output: string }>,
  difficulty: string
): Promise<{ referenceSolution: string; testInputs: Array<{ input: string; category: "edge" | "random" | "stress" | "corner" }> } | null> {
  const systemPrompt = `You are a competitive programming judge and test case generator.
Given a problem statement, generate:
1. A correct Python reference solution that reads from stdin and writes to stdout.
2. Additional test inputs that cover edge cases, random cases, and corner cases.

Return ONLY valid JSON with these keys:
- "reference_solution" (string): Complete Python solution using sys.stdin.read() pattern. Must handle all edge cases correctly.
- "test_inputs" (array): Array of objects with:
  - "input" (string): The exact stdin input
  - "category" (string): One of "edge", "random", "stress", "corner"

IMPORTANT RULES for test generation:
- Generate 5-8 test inputs covering different scenarios
- Include: minimum input, maximum reasonable input, boundary values, special cases
- Keep stress test inputs small enough to run in 10 seconds (N <= 1000 for O(N^2), N <= 100000 for O(N log N))
- Ensure inputs strictly follow the input specification format
- The reference solution must be CORRECT and handle ALL edge cases
- Use efficient algorithms appropriate for the difficulty level`;

  const userPrompt = `Problem Description:
${problemDescription}

Input Specification:
${inputSpec || "Standard competitive programming input format"}

Output Specification:
${outputSpec || "Standard competitive programming output format"}

Constraints:
${constraints || "Standard constraints"}

Difficulty: ${difficulty}

Sample Examples:
${examples.map((e, i) => `Example ${i + 1}:\nInput:\n${e.input}\nOutput:\n${e.output}`).join("\n\n")}

Generate a reference solution and 5-8 diverse test inputs.`;

  try {
    const result = await generateJSON<{
      reference_solution: string;
      test_inputs: Array<{ input: string; category: string }>;
    }>(
      systemPrompt,
      userPrompt,
      { model: MODELS.CODE, temperature: 0.3, maxTokens: 4000 },
      { reference_solution: "", test_inputs: [] }
    );

    if (!result.reference_solution || result.test_inputs.length === 0) {
      return null;
    }

    return {
      referenceSolution: result.reference_solution,
      testInputs: result.test_inputs.map(t => ({
        input: t.input,
        category: (t.category as "edge" | "random" | "stress" | "corner") || "random",
      })),
    };
  } catch (err) {
    console.error("[TestCaseGenerator] AI generation failed:", err);
    return null;
  }
}

/**
 * Compare outputs with competitive-programming-style tolerance:
 * - Trim each line
 * - Ignore trailing empty lines
 * - Exact match per non-empty line
 */
export function compareOutputs(actual: string, expected: string): boolean {
  const normalizeLines = (s: string): string[] =>
    s.trim().split("\n").map(line => line.trim()).filter(line => line.length > 0);

  const actualLines = normalizeLines(actual);
  const expectedLines = normalizeLines(expected);

  if (actualLines.length !== expectedLines.length) return false;

  for (let i = 0; i < actualLines.length; i++) {
    if (actualLines[i] !== expectedLines[i]) return false;
  }

  return true;
}

/**
 * Anti-cheat: Detect if user is hardcoding outputs.
 * Checks if the code contains the expected output as a literal string
 * and doesn't actually process the input.
 */
export function detectHardcodedOutput(
  code: string,
  testCases: Array<{ input: string; output: string }>
): { isHardcoded: boolean; confidence: number; reason?: string } {
  const codeNormalized = code.replace(/\s+/g, " ").toLowerCase();

  // Check 1: Code doesn't read input at all
  const readsInput = /input\(\)|sys\.stdin|scanf|cin|readline|readLine|Scanner|BufferedReader|gets|read_line|process\.stdin/i.test(code);
  
  // Check 2: Expected outputs appear as literals in the code (print(411), print("411"), etc.)
  let hardcodedCount = 0;
  for (const tc of testCases) {
    const expectedNorm = tc.output.trim().replace(/\s+/g, " ").toLowerCase();
    // Check if the output value appears in the code (even short ones like "411")
    if (expectedNorm.length > 0 && codeNormalized.includes(expectedNorm)) {
      hardcodedCount++;
    }
  }

  // Check 3: Code is suspiciously short for the problem
  const codeLines = code.trim().split("\n").filter(l => l.trim() && !l.trim().startsWith("#") && !l.trim().startsWith("//")).length;
  const isTooShort = codeLines <= 3;

  // Check 4: Code only contains print/output statements (no logic)
  const onlyPrints = code.trim().split("\n").every(line => {
    const trimmed = line.trim();
    return !trimmed || trimmed.startsWith("#") || trimmed.startsWith("//") ||
      trimmed.startsWith("print") || trimmed.startsWith("console.log") ||
      trimmed.startsWith("System.out") || trimmed.startsWith("cout") ||
      trimmed.startsWith("import") || trimmed.startsWith("using") ||
      trimmed.startsWith("include");
  });

  // Primary check: No input reading + only print statements = definitely hardcoded
  if (!readsInput && onlyPrints) {
    return { isHardcoded: true, confidence: 0.95, reason: "Code doesn't read input and only contains print statements" };
  }

  // Code doesn't read input and is very short
  if (!readsInput && isTooShort) {
    return { isHardcoded: true, confidence: 0.9, reason: "Code doesn't process any input and is suspiciously short" };
  }

  // Has hardcoded values + doesn't read input
  if (!readsInput && hardcodedCount > 0) {
    return { isHardcoded: true, confidence: 0.85, reason: "Code doesn't read input and contains hardcoded output values" };
  }

  // Multiple hardcoded outputs found + code is short
  if (hardcodedCount >= 2 && isTooShort) {
    return { isHardcoded: true, confidence: 0.8, reason: "Multiple expected outputs found as literals in very short code" };
  }

  return { isHardcoded: false, confidence: 0 };
}

// DB persistence for generated test cases
async function getDBCachedTestCases(questionId: string): Promise<GeneratedTestCase[] | null> {
  try {
    const record = await prisma.questionAIAnalysis.findFirst({
      where: { questionId },
      orderBy: { generatedAt: "desc" },
    });

    if (record) {
      const data = record.explanationJson as any;
      if (data?.hiddenTestCases && Array.isArray(data.hiddenTestCases) && data.hiddenTestCases.length > 0) {
        return data.hiddenTestCases;
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function saveTestCasesToDB(questionId: string, testCases: GeneratedTestCase[]): Promise<void> {
  try {
    const existing = await prisma.questionAIAnalysis.findFirst({
      where: { questionId },
      orderBy: { generatedAt: "desc" },
    });

    if (existing) {
      const currentData = (existing.explanationJson as any) || {};
      await prisma.questionAIAnalysis.update({
        where: { id: existing.id },
        data: {
          explanationJson: {
            ...currentData,
            hiddenTestCases: testCases,
          } as any,
        },
      });
    }
  } catch (err) {
    console.warn("[TestCaseGenerator] Failed to save test cases to DB:", err);
  }
}
