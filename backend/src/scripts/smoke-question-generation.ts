/**
 * Connectivity smoke test: generate exactly ONE question through each
 * generator so provider keys, rate limits and JSON parsing are proven before
 * committing to a multi-thousand-question backfill run. Writes nothing.
 */
import "dotenv/config";
import { generateUniqueMcqQuestions } from "../services/mcq-topup.service";
import { generateUniqueTopicQuestions } from "../services/aptitude-engine.service";

async function main() {
  console.log("[smoke] MCQ generator — 1 question for Java...");
  try {
    const mcq = await generateUniqueMcqQuestions({
      target: "Java",
      targetType: "technology",
      count: 1,
      difficulty: "Medium",
      idPrefix: "smoke-mcq-java",
      maxAttempts: 2,
      batchSize: 1,
      throttleMs: 0,
    });
    console.log(`[smoke] MCQ ok: accepted=${mcq.questions.length} attempts=${mcq.attempts}`);
    console.log(`[smoke] MCQ diagnostics: ${JSON.stringify(mcq.diagnostics)}`);
    if (mcq.questions[0]) {
      console.log(`[smoke] sample: ${mcq.questions[0].question?.slice(0, 120)}`);
    } else {
      console.log("[smoke] MCQ WARNING: 0 accepted — provider reachable but bank rejected everything.");
    }
  } catch (e: any) {
    console.error("[smoke] MCQ FAILED:", e?.message || e);
  }

  console.log("\n[smoke] Aptitude generator — 1 question for Percentages...");
  try {
    const apt = await generateUniqueTopicQuestions({
      topic: "Percentages",
      category: "quantitative",
      count: 1,
      difficulty: "medium",
      maxAttempts: 2,
      batchSize: 1,
      throttleMs: 0,
    });
    console.log(`[smoke] Aptitude ok: accepted=${apt.questions.length} attempts=${apt.attempts}`);
    console.log(`[smoke] Aptitude diagnostics: ${JSON.stringify(apt.diagnostics)}`);
    if (apt.questions[0]) {
      console.log(`[smoke] sample: ${String(apt.questions[0].text).slice(0, 120)}`);
    } else {
      console.log("[smoke] Aptitude WARNING: 0 accepted — provider reachable but bank rejected everything.");
    }
  } catch (e: any) {
    console.error("[smoke] Aptitude FAILED:", e?.message || e);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error("[smoke] fatal:", e);
  process.exit(1);
});