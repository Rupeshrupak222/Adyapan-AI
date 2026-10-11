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
 * and doesn't actually process the input or contain algorithmic logic.
 */
export function detectHardcodedOutput(
  code: string,
  testCases: Array<{ input: string; output: string }>
): { isHardcoded: boolean; confidence: number; reason?: string } {
  // Check 1: Input reading patterns across Python, C/C++, Java, JavaScript/Node.js, and function signatures
  const readsInput = (
    /input\s*\(\)|sys\.stdin|sys\.argv|open\s*\(\s*0\s*\)|fileinput/i.test(code) || // Python
    /scanf|cin\s*>>|getline\s*\(|getchar\s*\(|fgets|fread|read_line|read_exact/i.test(code) || // C/C++
    /Scanner|BufferedReader|InputStreamReader|System\.in|FastScanner|DataInputStream/i.test(code) || // Java
    /fs\.readFileSync|fs\.readFile|readSync|process\.stdin|process\.argv|require\s*\(\s*['"]fs['"]\s*\)|from\s+['"]fs['"]|createInterface|readline/i.test(code) || // Node.js / JavaScript
    /\b(solve|solution|main)\s*\([a-zA-Z0-9_$,\s]+\)/i.test(code) || // Function invoked with parameters
    /(?:function\s+[a-zA-Z0-9_$]+\s*\([^)]*[\w$][^)]*\)|\b(?:const|let|var)\s+[a-zA-Z0-9_$]+\s*=\s*\([^)]*[\w$][^)]*\)\s*=>)/.test(code) // Function definition with parameters
  );

  // Check 2: Real algorithmic logic (loops, branches, math mutations, data structures)
  const hasLogic = (
    /\b(for|while|do)\s*\(|\.forEach\(|\.map\(|\.filter\(|\.reduce\(|\.sort\(|\.find\(|\.some\(|\.every\(/.test(code) ||
    /\b(if|else\s+if|switch|case)\b/.test(code) ||
    /\b(Math\.|Array\.|Set\(|Map\(|new\s+Map|new\s+Set|heap|queue|stack)/i.test(code) ||
    /[+\-*/%]=|\+\+|--/.test(code)
  );

  // If the code has real algorithmic logic or explicitly reads/receives input, it is NOT hardcoded
  if (readsInput || hasLogic) {
    return { isHardcoded: false, confidence: 0 };
  }

  // Trivial outputs to ignore (e.g. 0, 1, -1, true, false, empty strings)
  const isTrivialOutput = (out: string): boolean => {
    const trimmed = out.trim().toLowerCase();
    if (trimmed.length <= 2) return true;
    if (["true", "false", "yes", "no", "null", "none", "undefined", "[]", "{}"].includes(trimmed)) return true;
    return false;
  };

  // Check 3: Code only contains output/print statements
  const codeLines = code
    .split("\n")
    .map(l => l.trim())
    .filter(l => l && !l.startsWith("#") && !l.startsWith("//") && !l.startsWith("/*") && !l.startsWith("*"));

  const onlyPrints = codeLines.length > 0 && codeLines.every(line => {
    return (
      line.startsWith("print") ||
      line.startsWith("console.log") ||
      line.startsWith("System.out") ||
      line.startsWith("cout") ||
      line.startsWith("return") ||
      line.startsWith("import") ||
      line.startsWith("using") ||
      line.startsWith("include") ||
      line.startsWith("require") ||
      line === "}" ||
      line === "};"
    );
  });

  // Check 4: Explicit hardcoded output printing
  let hardcodedCount = 0;
  for (const tc of testCases) {
    const expectedNorm = tc.output.trim();
    if (isTrivialOutput(expectedNorm)) continue;

    const escaped = expectedNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const printPattern = new RegExp(
      `(?:console\\.log|print|System\\.out\\.print(?:ln)?|cout\\s*<<)\\s*\\(?\\s*["'\`]?${escaped}["'\`]?\\s*\\)?`,
      "i"
    );
    if (printPattern.test(code)) {
      hardcodedCount++;
    }
  }

  // Blatant cheat: no input reading, no algorithmic logic, only print statements with hardcoded values
  if (onlyPrints && hardcodedCount > 0) {
    return { isHardcoded: true, confidence: 0.98, reason: "Code does not read input and only prints hardcoded expected outputs." };
  }

  // Suspiciously short with only print statements and no logic
  if (onlyPrints && codeLines.length <= 2 && testCases.length > 0) {
    return { isHardcoded: true, confidence: 0.95, reason: "Code only contains print statements without reading or processing input." };
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
