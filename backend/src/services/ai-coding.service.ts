import { prisma } from "../config/prisma";
import { generateJSON, MODELS } from "../lib/ai/openrouter";
import { scrapeCodeforcesProblem, splitMultiTestCaseExample } from "./codeforces.service";

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

    // Scrape exact problem statement directly from Codeforces for Codeforces questions
    let scrapedData: any = null;
    if (question.externalId && (question.source === "codeforces" || question.externalId.includes("-"))) {
      try {
        scrapedData = await scrapeCodeforcesProblem(question.externalId);
      } catch (err) {
        console.warn("[AICodingService] Codeforces scraping error:", err);
      }
    }

    // Check cache (only if non-Codeforces or if cache contains real scraped data)
    const cached = await prisma.questionAIAnalysis.findFirst({
      where: { questionId }
    });

    if (cached) {
      const data = cached.explanationJson as unknown as AIAnalysisSchema;
      if (data && data.examples && data.examples.length > 0 && data.problem_explanation && !data.problem_explanation.includes("A structured explanation of the problem")) {
        if (!scrapedData || (data.inputSpecification && data.problem_explanation.length > 100)) {
          const expanded: Example[] = [];
          for (const ex of data.examples) {
            expanded.push(...splitMultiTestCaseExample(ex));
          }
          data.examples = expanded;
          return data;
        }
      }
      try {
        await prisma.questionAIAnalysis.delete({
          where: { id: cached.id }
        });
      } catch (err) {
        console.warn(`[AICodingService] Failed to delete stale cache:`, err);
      }
    }

    const fallback: AIAnalysisSchema = {
      problem_explanation: scrapedData?.description
        ? scrapedData.description
        : `A structured explanation of the problem: "${question.title}" (${question.topic}). We need to solve it efficiently.`,
      hint_1: "Think about the naive brute-force method first.",
      hint_2: "Can we use a hash map or sorting to optimize?",
      hint_3: "Consider using two pointers or sliding window to achieve optimal time complexity.",
      brute_force: "A naive approach that iterates through all possibilities.",
      optimal_approach: "An optimized approach utilizing efficient data structures or greedy choice.",
      time_complexity: "O(N^2) brute force, O(N) or O(N log N) optimal.",
      space_complexity: "O(1) extra space or O(N) to store frequencies.",
      interview_importance: "This is a core DSA problem testing your understanding of array manipulation and optimal search techniques.",
      common_mistakes: [
        "Not handling corner cases like empty arrays or single element lists.",
        "Using excessive space when an in-place modification is possible.",
        "Integer overflow during sum calculations."
      ],
      examples: scrapedData?.examples && scrapedData.examples.length > 0 ? scrapedData.examples : [
        {
          input: "5\n1 2 3 4 5",
          output: "15",
          explanation: "Example input with sum 15."
        }
      ],
      inputSpecification: scrapedData?.inputSpecification || "",
      outputSpecification: scrapedData?.outputSpecification || "",
      constraints: scrapedData?.constraints || "",
      timeLimit: scrapedData?.timeLimit || "",
      memoryLimit: scrapedData?.memoryLimit || "",
      note: scrapedData?.note || ""
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
${scrapedData ? `\nExact Codeforces Problem Details:\nDescription:\n${scrapedData.description}\nInput Spec:\n${scrapedData.inputSpecification}\nOutput Spec:\n${scrapedData.outputSpecification}\nConstraints:\n${scrapedData.constraints}\nTime Limit:\n${scrapedData.timeLimit}\nMemory Limit:\n${scrapedData.memoryLimit}\nExamples:\n${JSON.stringify(scrapedData.examples)}\nNote:\n${scrapedData.note}` : ""}`;

    try {
      const generated = await generateJSON<AIAnalysisSchema>(
        systemPrompt,
        userPrompt,
        { model: MODELS.CODE, temperature: 0.6, maxTokens: 3000 },
        fallback
      );

      if (scrapedData) {
        if (scrapedData.description) {
          generated.problem_explanation = scrapedData.description;
        }
        if (scrapedData.inputSpecification) {
          generated.inputSpecification = scrapedData.inputSpecification;
        }
        if (scrapedData.outputSpecification) {
          generated.outputSpecification = scrapedData.outputSpecification;
        }
        if (scrapedData.constraints) {
          generated.constraints = scrapedData.constraints;
        }
        if (scrapedData.timeLimit) {
          generated.timeLimit = scrapedData.timeLimit;
        }
        if (scrapedData.memoryLimit) {
          generated.memoryLimit = scrapedData.memoryLimit;
        }
        if (scrapedData.note) {
          generated.note = scrapedData.note;
        }
        if (scrapedData.examples && scrapedData.examples.length > 0) {
          generated.examples = scrapedData.examples;
        }
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
