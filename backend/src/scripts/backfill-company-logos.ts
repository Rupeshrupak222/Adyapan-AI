import "dotenv/config";
import { prisma } from "../config/prisma";
import { autoResolveCompanyLogo } from "../utils/companyLogoResolver";

/**
 * One-off backfill: re-resolves company logo URLs for all DiscoveryJob and
 * DiscoveryCompany rows, replacing dead logo.clearbit.com links (Clearbit's
 * logo API was sunset in Dec 2025) with working Google favicon URLs.
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-company-logos.ts           # apply
 *   npx ts-node src/scripts/backfill-company-logos.ts --dry-run # report only
 */
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(`[LogoBackfill] Starting${dryRun ? " (DRY RUN)" : ""}...`);

  const staleWhere = { logoUrl: { contains: "logo.clearbit.com" } };

  const [staleJobs, staleCompanies, totalJobs, totalCompanies] = await Promise.all([
    prisma.discoveryJob.count({ where: staleWhere }),
    prisma.discoveryCompany.count({ where: staleWhere }),
    prisma.discoveryJob.count(),
    prisma.discoveryCompany.count(),
  ]);

  console.log(
    `[LogoBackfill] Stale Clearbit URLs — jobs: ${staleJobs}/${totalJobs}, companies: ${staleCompanies}/${totalCompanies}`
  );

  if (dryRun) {
    console.log("[LogoBackfill] Dry run complete — no rows modified.");
    return;
  }

  let jobsUpdated = 0;
  const jobs = await prisma.discoveryJob.findMany({
    where: staleWhere,
    select: { id: true, company: true, logoUrl: true, applyUrl: true, sourceUrl: true },
  });
  for (const job of jobs) {
    const resolved = autoResolveCompanyLogo(job.company, job.logoUrl, job.applyUrl || job.sourceUrl);
    if (resolved && resolved !== job.logoUrl) {
      await prisma.discoveryJob.update({
        where: { id: job.id },
        data: { logoUrl: resolved },
      });
      jobsUpdated++;
    }
  }

  let companiesUpdated = 0;
  const companies = await prisma.discoveryCompany.findMany({
    where: staleWhere,
    select: { id: true, name: true, logoUrl: true, website: true },
  });
  for (const comp of companies) {
    const resolved = autoResolveCompanyLogo(comp.name, comp.logoUrl, comp.website);
    if (resolved && resolved !== comp.logoUrl) {
      await prisma.discoveryCompany.update({
        where: { id: comp.id },
        data: { logoUrl: resolved },
      });
      companiesUpdated++;
    }
  }

  console.log(
    `[LogoBackfill] Done — jobs updated: ${jobsUpdated}, companies updated: ${companiesUpdated}`
  );
}

main()
  .catch((err) => {
    console.error("[LogoBackfill] Failed:", err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
