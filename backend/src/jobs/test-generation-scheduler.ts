/**
 * Test Generation Scheduler
 * 
 * Schedules daily automatic test generation using node-cron
 * Runs every day at 2:00 AM server time
 * 
 * Import this in your main server file to activate scheduling
 */

import cron from "node-cron";
import { exec } from "child_process";
import * as path from "path";
import * as fs from "fs";

const SCHEDULE = process.env.TEST_GENERATION_CRON || "0 2 * * *"; // Default: 2:00 AM daily
const SCRIPT_PATH = path.join(__dirname, "../../scripts/daily-test-generator.ts");
const LOG_DIR = path.join(__dirname, "../../logs");

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Execute the daily test generation script
 */
function runTestGeneration() {
  console.log(`[Scheduler] Starting daily test generation at ${new Date().toISOString()}`);
  
  const command = `npx tsx "${SCRIPT_PATH}"`;
  
  exec(command, { cwd: path.join(__dirname, "../..") }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Scheduler] Error executing test generation:`, error);
      
      // Log error to file
      const errorLog = path.join(LOG_DIR, "scheduler-errors.log");
      const errorMessage = `[${new Date().toISOString()}] ERROR: ${error.message}\n${stderr}\n\n`;
      fs.appendFileSync(errorLog, errorMessage);
      
      return;
    }
    
    console.log(`[Scheduler] Test generation completed successfully`);
    console.log(stdout);
    
    if (stderr) {
      console.warn(`[Scheduler] Warnings:`, stderr);
    }
  });
}

/**
 * Start the cron scheduler
 */
export function startTestGenerationScheduler() {
  console.log(`[Scheduler] Initializing daily test generation scheduler`);
  console.log(`[Scheduler] Schedule: ${SCHEDULE} (cron format)`);
  console.log(`[Scheduler] Script: ${SCRIPT_PATH}`);
  
  // Validate cron expression
  if (!cron.validate(SCHEDULE)) {
    console.error(`[Scheduler] Invalid cron expression: ${SCHEDULE}`);
    return null;
  }
  
  // Schedule the task
  const task = cron.schedule(SCHEDULE, () => {
    runTestGeneration();
  }, {
    scheduled: true,
    timezone: process.env.TZ || "Asia/Kolkata" // Default to IST
  });
  
  console.log(`[Scheduler] ✓ Daily test generation scheduled`);
  console.log(`[Scheduler] Timezone: ${process.env.TZ || "Asia/Kolkata"}`);
  console.log(`[Scheduler] Next run: ${getNextRunTime(SCHEDULE)}`);
  
  return task;
}

/**
 * Stop the cron scheduler
 */
export function stopTestGenerationScheduler(task: cron.ScheduledTask | null) {
  if (task) {
    task.stop();
    console.log(`[Scheduler] Test generation scheduler stopped`);
  }
}

/**
 * Run test generation manually (for testing)
 */
export function runTestGenerationManually() {
  console.log(`[Scheduler] Manual test generation triggered`);
  runTestGeneration();
}

/**
 * Get next scheduled run time
 */
function getNextRunTime(schedule: string): string {
  try {
    const cronParser = require("cron-parser");
    const interval = cronParser.parseExpression(schedule, {
      tz: process.env.TZ || "Asia/Kolkata"
    });
    return interval.next().toString();
  } catch (error) {
    return "Unknown";
  }
}

// Export for testing
export const _internal = {
  runTestGeneration,
  getNextRunTime
};
