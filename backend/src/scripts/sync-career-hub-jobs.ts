import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../config/prisma";
import { autoResolveCompanyLogo } from "../utils/companyLogoResolver";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  let hash2 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash2 ^= str.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193);
  }
  return (hash >>> 0).toString(36) + (hash2 >>> 0).toString(36);
}

function generateFingerprint(company: string, title: string, location: string, applyUrl: string): string {
  const c = (company || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const t = (title || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const l = (location || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const u = (applyUrl || "").toLowerCase().trim();
  return simpleHash(`${c}|${t}|${l}|${u}`);
}

async function sync() {
  console.log("[SyncJobs] Starting career hub sync to discovery_jobs...");

  const existingJobListings = await (prisma as any).jobListing.findMany();
  console.log(`[SyncJobs] Found ${existingJobListings.length} jobs in job_listings table.`);

  let upserted = 0;

  for (const job of existingJobListings) {
    const fingerprint = generateFingerprint(job.company, job.title, job.location, job.applyUrl || "");
    const logoUrl = autoResolveCompanyLogo(job.company, job.logoUrl);

    try {
      await prisma.discoveryJob.upsert({
        where: { fingerprint },
        update: {
          title: job.title,
          company: job.company,
          logoUrl: logoUrl || job.logoUrl || null,
          location: job.location || "",
          country: job.country || "India",
          state: job.state || "",
          city: job.city || "",
          description: job.description || "",
          salaryMin: job.salaryMin || null,
          salaryMax: job.salaryMax || null,
          experienceMin: job.experienceMin ?? null,
          experienceMax: job.experienceMax ?? null,
          employmentType: job.employmentType || "Full-Time",
          workMode: job.mode || job.workMode || "Onsite",
          skills: Array.isArray(job.skills) ? job.skills : [],
          requirements: Array.isArray(job.requirements) ? job.requirements : [],
          responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
          benefits: Array.isArray(job.benefits) ? job.benefits : [],
          industry: job.category || job.industry || "",
          applyUrl: job.applyUrl || job.website || null,
          sourceUrl: job.website || job.applyUrl || null,
          source: job.source || (job.isGovernment ? "gov" : "manual"),
          isFeatured: job.isFeatured ?? true,
          isActive: true,
        },
        create: {
          fingerprint,
          externalId: job.externalId || null,
          title: job.title,
          company: job.company,
          logoUrl: logoUrl || job.logoUrl || null,
          location: job.location || "",
          country: job.country || "India",
          state: job.state || "",
          city: job.city || "",
          description: job.description || "",
          salaryMin: job.salaryMin || null,
          salaryMax: job.salaryMax || null,
          experienceMin: job.experienceMin ?? null,
          experienceMax: job.experienceMax ?? null,
          employmentType: job.employmentType || "Full-Time",
          workMode: job.mode || job.workMode || "Onsite",
          skills: Array.isArray(job.skills) ? job.skills : [],
          requirements: Array.isArray(job.requirements) ? job.requirements : [],
          responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
          benefits: Array.isArray(job.benefits) ? job.benefits : [],
          industry: job.category || job.industry || "",
          applyUrl: job.applyUrl || job.website || null,
          sourceUrl: job.website || job.applyUrl || null,
          source: job.source || (job.isGovernment ? "gov" : "manual"),
          isFeatured: job.isFeatured ?? true,
          isActive: true,
          postedAt: job.postedDate || new Date(),
        },
      });
      upserted++;
    } catch (err: any) {
      console.warn(`[SyncJobs] Skip ${job.title} at ${job.company}:`, err.message);
    }
  }

  const finalTotal = await prisma.discoveryJob.count();
  console.log(`[SyncJobs] Sync complete. Processed: ${upserted}. Total discovery_jobs now: ${finalTotal}`);
  await prisma.$disconnect();
}

sync().catch(console.error);
