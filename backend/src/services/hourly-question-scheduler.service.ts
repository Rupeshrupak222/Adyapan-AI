import cron from "node-cron";
import { env } from "../config/env";
import { getAllTests, addQuestionToTest, MCQTest, MCQQuestion } from "./mcq.service";
import { generateUniqueMcqQuestions } from "./mcq-topup.service";
import { commitToBank, loadBank, SOURCE_MCQ } from "./question-bank.service";

export interface HourlySchedulerStatus {
  active: boolean;
  isRunning: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastGeminiStatus: {
    available: boolean;
    statusCode?: number;
    message?: string;
    checkedAt?: string;
  };
  totalQuestionsGenerated: number;
  lastRunSummary?: {
    testsProcessed: number;
    questionsAdded: number;
    skippedDueToQuota: boolean;
    errors: number;
    durationMs: number;
  };
}

export class HourlyQuestionSchedulerService {
  private static cronTask: cron.ScheduledTask | null = null;
  private static isRunning = false;
  private static lastRunAt: string | null = null;
  private static nextRunAt: string | null = null;
  private static totalQuestionsGenerated = 0;
  private static lastGeminiStatus: HourlySchedulerStatus["lastGeminiStatus"] = {
    available: false,
    message: "Not checked yet",
  };
  private static lastRunSummary?: HourlySchedulerStatus["lastRunSummary"];

  /** Delay helper between API calls to honor free tier 15 RPM limit */
  private static delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /**
   * Probe Gemini API directly to check if API limit / quota is currently available.
   * A tiny 1-token prompt verifies if Gemini is healthy (200 OK) or rate-limited (429 Quota Exceeded).
   */
  static async checkGeminiQuotaAvailable(): Promise<{
    available: boolean;
    statusCode: number;
    message: string;
  }> {
    const keys = env.geminiApiKeys && env.geminiApiKeys.length > 0
      ? env.geminiApiKeys
      : env.geminiApiKey ? [env.geminiApiKey] : [];

    if (keys.length === 0) {
      this.lastGeminiStatus = {
        available: false,
        statusCode: 0,
        message: "No GEMINI_API_KEY configured",
        checkedAt: new Date().toISOString(),
      };
      return { available: false, statusCode: 0, message: "No Gemini API key found" };
    }

    let lastErrorStatus = 500;
    let lastErrorMessage = "All Gemini keys failed";

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const keyLabel = keys.length > 1 ? `Key #${i + 1}` : "Primary Key";

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: "gemini-3.5-flash-lite",
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
              temperature: 0.1,
            }),
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        const status = res.status;
        const checkedAt = new Date().toISOString();

        if (status === 200) {
          this.lastGeminiStatus = {
            available: true,
            statusCode: status,
            message: `Gemini API quota available on ${keyLabel} (200 OK)`,
            checkedAt,
          };
          return { available: true, statusCode: status, message: `Quota available on ${keyLabel}` };
        }

        let errDetail = res.statusText;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) {
            errDetail = errJson.error.message;
          }
        } catch {}

        const isQuotaError = status === 429 || errDetail.toLowerCase().includes("quota");
        lastErrorStatus = status;
        lastErrorMessage = isQuotaError
          ? `${keyLabel} quota limit reached (429): ${errDetail.slice(0, 100)}`
          : `${keyLabel} HTTP ${status}: ${errDetail.slice(0, 100)}`;
      } catch (err: any) {
        const isAbort = err?.name === "AbortError" || err?.message?.includes("aborted");
        lastErrorStatus = 500;
        lastErrorMessage = isAbort
          ? `${keyLabel} probe timed out (15s)`
          : `${keyLabel} probe failed: ${(err?.message || String(err)).slice(0, 80)}`;
      }
    }

    this.lastGeminiStatus = {
      available: false,
      statusCode: lastErrorStatus,
      message: lastErrorMessage,
      checkedAt: new Date().toISOString(),
    };

    return { available: false, statusCode: lastErrorStatus, message: lastErrorMessage };
  }

  /**
   * Run the hourly question generation cycle across tests.
   * Gated strictly on Gemini API limit / quota availability.
   */
  static async runHourlyCycle(): Promise<{
    success: boolean;
    questionsAdded: number;
    testsProcessed: number;
    message: string;
  }> {
    if (this.isRunning) {
      console.log("[HourlyQuestionScheduler] Generation cycle already in progress, skipping.");
      return {
        success: false,
        questionsAdded: 0,
        testsProcessed: 0,
        message: "Cycle already in progress",
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    this.lastRunAt = new Date().toISOString();

    console.log(
      `[HourlyQuestionScheduler] [${this.lastRunAt}] Starting hourly test generation check...`
    );

    try {
      // 1. STEP 1: Check Gemini API quota availability
      console.log("[HourlyQuestionScheduler] Probing Gemini API quota availability...");
      const quotaCheck = await this.checkGeminiQuotaAvailable();

      if (!quotaCheck.available) {
        console.warn(
          `[HourlyQuestionScheduler] Gemini API quota is NOT available (${quotaCheck.statusCode}: ${quotaCheck.message}).` +
            ` Skipping question generation for this hour. Will automatically re-check on the next hourly trigger.`
        );

        this.lastRunSummary = {
          testsProcessed: 0,
          questionsAdded: 0,
          skippedDueToQuota: true,
          errors: 0,
          durationMs: Date.now() - startTime,
        };

        return {
          success: false,
          questionsAdded: 0,
          testsProcessed: 0,
          message: `Skipped: Gemini API quota not available (${quotaCheck.message})`,
        };
      }

      console.log("[HourlyQuestionScheduler] Gemini API quota verified active! Proceeding to generate unique questions in tests...");

      // 2. STEP 2: Load global question bank & all tests
      const bank = await loadBank(undefined, { includeTexts: true });
      const tests = await getAllTests();

      console.log(
        `[HourlyQuestionScheduler] Found ${tests.length} tests in store. Global bank has ${bank.totalEntries} concept fingerprints.`
      );

      let totalAdded = 0;
      let testsProcessed = 0;
      let hitRateLimitDuringRun = false;
      let errorsCount = 0;

      // 3. STEP 3: Iterate through tests with safe pacing (3.5s throttle to respect 15 RPM limit)
      // Generate 1 strictly unique question per test to evenly enrich all tests every hour
      for (const test of tests) {
        if (hitRateLimitDuringRun) break;

        try {
          const target = test.targetName || test.id;
          const targetType = test.targetType;
          const currentCount = test.questions?.length || 0;

          const genResult = await generateUniqueMcqQuestions({
            target,
            targetType,
            count: 1,
            difficulty: test.difficulty === "Mixed" ? "Medium" : test.difficulty || "Medium",
            idPrefix: test.id,
            idOffset: currentCount,
            bank,
            maxAttempts: 2,
            batchSize: 1,
            throttleMs: 1000,
          });

          if (genResult.questions && genResult.questions.length > 0) {
            for (const newQ of genResult.questions) {
              const difficulty: MCQQuestion["difficulty"] =
                newQ.difficulty === "Easy" || newQ.difficulty === "Hard"
                  ? newQ.difficulty
                  : "Medium";
              await addQuestionToTest(test.id, {
                ...newQ,
                difficulty,
              });

              // Commit to global bank to guarantee database-level uniqueness
              await commitToBank([
                {
                  question: newQ.question,
                  codeSnippet: newQ.codeSnippet,
                  options: newQ.options,
                  correctIdx: newQ.correctIdx,
                  source: SOURCE_MCQ,
                  topic: newQ.technology,
                  company: newQ.company,
                  difficulty: newQ.difficulty,
                  testId: test.id,
                  position: currentCount,
                },
              ]);

              totalAdded++;
            }
            testsProcessed++;
          } else if (genResult.diagnostics.apiErrors > 0) {
            // Check if API error was 429
            const recheck = await this.checkGeminiQuotaAvailable();
            if (!recheck.available && recheck.statusCode === 429) {
              console.warn(
                `[HourlyQuestionScheduler] Gemini quota reached during batch after ${testsProcessed} tests. Pausing until next hour.`
              );
              hitRateLimitDuringRun = true;
              break;
            }
          }

          // Pacing delay between tests to stay below 15 RPM (3.5s per test)
          await this.delay(3500);
        } catch (itemErr: any) {
          errorsCount++;
          const msg = itemErr?.message || String(itemErr);
          if (msg.includes("429") || msg.includes("quota")) {
            console.warn(
              `[HourlyQuestionScheduler] Rate limit hit during test processing: ${msg}. Halting current run.`
            );
            hitRateLimitDuringRun = true;
            break;
          }
          console.warn(`[HourlyQuestionScheduler] Could not generate for test ${test.id}: ${msg}`);
        }
      }

      this.totalQuestionsGenerated += totalAdded;
      const durationMs = Date.now() - startTime;

      this.lastRunSummary = {
        testsProcessed,
        questionsAdded: totalAdded,
        skippedDueToQuota: hitRateLimitDuringRun,
        errors: errorsCount,
        durationMs,
      };

      console.log(
        `[HourlyQuestionScheduler] Hourly run completed in ${Math.round(durationMs / 1000)}s: ` +
          `Added ${totalAdded} unique questions across ${testsProcessed}/${tests.length} tests. (Errors: ${errorsCount})`
      );

      return {
        success: true,
        questionsAdded: totalAdded,
        testsProcessed,
        message: `Successfully added ${totalAdded} unique questions across ${testsProcessed} tests.`,
      };
    } catch (fatalErr: any) {
      console.error("[HourlyQuestionScheduler] Error during hourly test generation:", fatalErr);
      return {
        success: false,
        questionsAdded: 0,
        testsProcessed: 0,
        message: `Fatal error: ${fatalErr?.message || fatalErr}`,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the automated hourly scheduler.
   * Runs at minute 0 of every hour ('0 * * * *').
   */
  static start(): void {
    if (this.cronTask) {
      console.log("[HourlyQuestionScheduler] Scheduler already running.");
      return;
    }

    console.log("[HourlyQuestionScheduler] Starting Hourly Test Question Generator Scheduler (Cron: '0 * * * *')...");

    // Initial probe and run check 20 seconds after server boots
    setTimeout(() => {
      this.runHourlyCycle().catch((err) => {
        console.error("[HourlyQuestionScheduler] Initial boot cycle error:", err);
      });
    }, 20000);

    // Schedule to trigger automatically every hour (at minute 00 of each hour)
    this.cronTask = cron.schedule("0 * * * *", () => {
      console.log(`[HourlyQuestionScheduler] [${new Date().toISOString()}] Hourly cron trigger fired.`);
      this.runHourlyCycle().catch((err) => {
        console.error("[HourlyQuestionScheduler] Hourly cron cycle error:", err);
      });
    });

    // Estimate next run time
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 1, 0, 0, 0);
    this.nextRunAt = nextDate.toISOString();
  }

  /**
   * Stop the hourly scheduler.
   */
  static stop(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      console.log("[HourlyQuestionScheduler] Hourly scheduler stopped.");
    }
  }

  /**
   * Get current scheduler status and diagnostics.
   */
  static getStatus(): HourlySchedulerStatus {
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 1, 0, 0, 0);

    return {
      active: this.cronTask !== null,
      isRunning: this.isRunning,
      lastRunAt: this.lastRunAt,
      nextRunAt: this.nextRunAt || nextDate.toISOString(),
      lastGeminiStatus: this.lastGeminiStatus,
      totalQuestionsGenerated: this.totalQuestionsGenerated,
      lastRunSummary: this.lastRunSummary,
    };
  }
}
