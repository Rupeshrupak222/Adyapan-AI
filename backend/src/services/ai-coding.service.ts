import { prisma } from "../config/prisma";
import { generateJSON, MODELS } from "../lib/ai/openrouter";

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface AIAnalysisSchema {
  problem_explanation: string;
  hint_1: string;
  hint_2: string;
  hint_3: string;
  brute_force: string;
  optimal_approach: string;
  time_complexity: string;
  space_complexity: string;
  interview_importance: string;
  common_mistakes: string[];
  examples?: Example[];
  inputSpecification?: string;
  outputSpecification?: string;
  constraints?: string;
  timeLimit?: string;
  memoryLimit?: string;
  note?: string;
}

export class AICodingService {
  static async getAnalysis(questionId: string): Promise<AIAnalysisSchema> {
    const question = await prisma.codingQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw new Error(`Question with ID ${questionId} not found`);
    }

    // Check cache
    const cached = await prisma.questionAIAnalysis.findFirst({
      where: { questionId }
    });

    if (cached) {
      const data = cached.explanationJson as unknown as AIAnalysisSchema;
      if (data && data.examples && data.examples.length > 0 && data.problem_explanation && !data.problem_explanation.includes("A structured explanation of the problem")) {
        return data;
      }
    }

    const problemDescription = question.statement || `A structured explanation of the problem: "${question.title}" (${question.topic}). We need to solve it efficiently.`;
    const problemExamples = Array.isArray(question.examples) && question.examples.length > 0
      ? (question.examples as any)
      : Array.isArray(question.visibleTestCases) && question.visibleTestCases.length > 0
        ? (question.visibleTestCases as any).map((tc: any) => ({ input: tc.input, output: tc.expectedOutput, explanation: "Sample test case." }))
        : [{ input: "5\n1 2 3 4 5", output: "5", explanation: "Sample example." }];

    const fallback: AIAnalysisSchema = {
      problem_explanation: problemDescription,
      hint_1: "Analyze the problem requirements and think about the naive brute-force method first.",
      hint_2: "Can you optimize time or space complexity using standard DSA patterns like two pointers, hash maps, or dynamic programming?",
      hint_3: "Consider boundary constraints, empty inputs, single element edge cases, and overflow.",
      brute_force: "A naive approach that iterates through all possibilities.",
      optimal_approach: "An optimized approach utilizing efficient data structures or algorithmic patterns.",
      time_complexity: "O(N) or O(N log N) optimal.",
      space_complexity: "O(1) extra space or O(N) auxiliary space.",
      interview_importance: "This is a core DSA problem frequently asked in technical coding interviews at top tech companies.",
      common_mistakes: [
        "Not handling corner cases like empty inputs or single element collections.",
        "Off-by-one errors during iteration or pointer updates.",
        "Integer overflow or improper return types."
      ],
      examples: problemExamples,
      inputSpecification: question.inputFormat || "",
      outputSpecification: question.outputFormat || "",
      constraints: question.constraints || "",
      timeLimit: question.timeLimit || "2.0s",
      memoryLimit: question.memoryLimit || "256 MB",
      note: ""
    };

    const systemPrompt = `You are a FAANG Interview Coach, Competitive Programming Mentor, and EdTech Platform Architect.
You must analyze the given coding question and generate a structured preparation guide in JSON format.
Return ONLY valid JSON mapping exactly to the schema keys.

Keys to include:
1. "problem_explanation" (string) - Plain English explanation of the problem statement and what it asks. Keep it clear, friendly, and structured. Include input/output rules if provided.
2. "hint_1" (string) - First progressive hint (conceptual/getting started).
3. "hint_2" (string) - Second progressive hint (direction/algorithm ideas).
4. "hint_3" (string) - Third progressive hint (close to solution/data structure choices).
5. "brute_force" (string) - High-level details of the brute-force strategy.
6. "optimal_approach" (string) - Detailed explanation of the most optimal strategy.
7. "time_complexity" (string) - Time complexity of optimal approach (e.g. O(N log N)).
8. "space_complexity" (string) - Space complexity of optimal approach (e.g. O(1)).
9. "interview_importance" (string) - Context on why top companies ask this, what skills it tests, and placement relevance.
10. "common_mistakes" (array of strings) - 3 common pitfalls or bugs students run into when implementing.
11. "examples" (array of objects) - Generate 2-3 concrete test cases. Each object must have:
    - "input" (string): The exact stdin input (one line per value, newline-separated for multiple values).
    - "output" (string): The exact expected stdout output (one line per value).
    - "explanation" (string): A brief explanation of why this input produces this output.
Ensure examples cover edge cases and typical scenarios. Use the simplest possible input format.
Ensure your responses are highly instructional, professional, and motivate the student.`;

    const userPrompt = `Coding Question Details:
Title: ${question.title}
Topic: ${question.topic}
Difficulty: ${question.difficulty}
Rating: ${question.rating || "N/A"}
Tags: ${JSON.stringify(question.tagsJson)}
Problem Statement: ${question.statement || ""}
Input Format: ${question.inputFormat || ""}
Output Format: ${question.outputFormat || ""}
Constraints: ${question.constraints || ""}
Examples: ${JSON.stringify(question.examples || [])}`;

    try {
      const generated = await generateJSON<AIAnalysisSchema>(
        systemPrompt,
        userPrompt,
        { model: MODELS.CODE, temperature: 0.6, maxTokens: 3000 },
        fallback
      );

      if (question.statement) {
        generated.problem_explanation = question.statement;
      }
      if (question.inputFormat) {
        generated.inputSpecification = question.inputFormat;
      }
      if (question.outputFormat) {
        generated.outputSpecification = question.outputFormat;
      }
      if (question.constraints) {
        generated.constraints = question.constraints;
      }
      if (Array.isArray(question.examples) && question.examples.length > 0) {
        generated.examples = question.examples as any;
      }

      await prisma.questionAIAnalysis.create({
        data: {
          questionId,
          explanationJson: generated as any,
          generatedByModel: MODELS.CODE
        }
      });

      return generated;
    } catch (err: any) {
      console.error(`[AICodingService] Failed to generate AI analysis:`, err.message || err);
      return fallback;
    }
  }
}
