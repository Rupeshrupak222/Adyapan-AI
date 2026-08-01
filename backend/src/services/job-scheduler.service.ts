import { JobDiscoveryService } from "./job-discovery.service";
import { getMasterPrisma } from "../config/dynamicPrisma";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export class JobSchedulerService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  static start(): void {
    if (this.timer) return;

    console.log("[JobScheduler] Starting 24-Hour Automated Job Scraping Scheduler...");

    // Run initial sync check on server boot after 10 seconds
    setTimeout(() => {
      this.checkAndRunSync();
    }, 10000);

    // Schedule background run every 24 hours
    this.timer = setInterval(() => {
      this.checkAndRunSync();
    }, TWENTY_FOUR_HOURS_MS);
  }

  static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[JobScheduler] Stopped 24-Hour Automated Scheduler.");
    }
  }

  private static async checkAndRunSync(): Promise<void> {
    if (this.isRunning) {
      console.log("[JobScheduler] Sync already in progress, skipping schedule execution.");
      return;
    }

    this.isRunning = true;
    console.log(`[JobScheduler] [${new Date().toISOString()}] Initiating 24-hour multi-portal job scraping...`);

    try {
      const prisma = getMasterPrisma();
      const count = await prisma.discoveryJob.count({ where: { isActive: true } });
      console.log(`[JobScheduler] Current active jobs in database: ${count}`);

      // Sync active sources (LinkedIn, RemoteOK, Indeed, Naukri, Wellfound, etc.)
      const results = await JobDiscoveryService.syncSources();
      let totalInserted = 0;
      let totalUpdated = 0;
      for (const r of results) {
        totalInserted += r.jobsInserted || 0;
        totalUpdated += r.jobsUpdated || 0;
      }

      console.log(`[JobScheduler] 24-hour job sync complete. Inserted ${totalInserted} new jobs, updated ${totalUpdated} jobs.`);

      // Automatically check and resolve all company logos every 24 hours
      await JobDiscoveryService.refreshCompanyLogos();
    } catch (err: any) {
      console.error("[JobScheduler] Error during 24-hour automated job sync:", err?.message || err);
    } finally {
      this.isRunning = false;
    }
  }
}
