import { autoResolveCompanyLogo } from "./companyLogoResolver";

/**
 * Maps a raw discovery/job record (master DB `discoveryJob` or user DB
 * `jobListing`) into the normalized "job listing" shape consumed by the
 * frontend job hub. Kept in one place so both the job-listing routes and the
 * saved-jobs service return identical, fully formatted job objects.
 */
export function mapDiscoveryJobToListing(job: any) {
  if (!job) return null;
  const salMin = job.salaryMin;
  const salMax = job.salaryMax;
  let salaryStr = "Competitive";
  if (salMin && salMax) {
    if (salMin < 100) {
      salaryStr = `₹${salMin}L - ₹${salMax}L PA`;
    } else {
      salaryStr = `₹${(salMin / 100000).toFixed(1)}L - ₹${(salMax / 100000).toFixed(1)}L PA`;
    }
  } else if (salMin) {
    if (salMin < 100) {
      salaryStr = `₹${salMin}L+ PA`;
    } else {
      salaryStr = `₹${(salMin / 100000).toFixed(1)}L+ PA`;
    }
  } else if (salMax) {
    if (salMax < 100) {
      salaryStr = `Up to ₹${salMax}L PA`;
    } else {
      salaryStr = `Up to ₹${(salMax / 100000).toFixed(1)}L PA`;
    }
  }

  let expStr = "";
  if (job.experienceMin !== undefined && job.experienceMin !== null) {
    const expMin = job.experienceMin;
    const expMax = job.experienceMax;
    if (expMax !== undefined && expMax !== null && expMax > expMin) {
      expStr = `${expMin}-${expMax} Yrs`;
    } else {
      expStr = `${expMin}+ Yrs`;
    }
  } else if (job.experience) {
    expStr = String(job.experience);
  }

  const passingYearVal = job.education ? String(job.education).trim() : "";

  const logo = autoResolveCompanyLogo(job.company, job.logoUrl, job.applyUrl || job.sourceUrl);

  return {
    id: job.id,
    externalId: job.externalId || job.id,
    source: job.source || "manual",
    title: job.title,
    company: job.company,
    logoUrl: logo,
    logo: logo,
    logoBg: "#f59e0b",
    location: job.location || "Remote",
    country: job.country || "India",
    state: job.state || "",
    city: job.city || "",
    mode: job.workMode || job.mode || "On-site",
    workMode: job.workMode || job.mode || "On-site",
    employmentType: job.employmentType || "Full-Time",
    category: job.industry || "Technology",
    industry: job.industry || "Technology",
    salary: salaryStr,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency || "INR",
    experience: expStr,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    education: job.education || "",
    passingYear: passingYearVal,
    skills: Array.isArray(job.skills) ? job.skills : [],
    description: job.description || "",
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    benefits: Array.isArray(job.benefits) ? job.benefits : [],
    eligibility: Array.isArray(job.requirements) ? job.requirements : [],
    companyOverview: `${job.company} is hiring for ${job.title} in ${job.location || 'Remote'}.`,
    applyUrl: job.applyUrl || job.sourceUrl || "https://adyapan.ai",
    website: job.sourceUrl || job.applyUrl || "",
    deadline: "Open until filled",
    postedDate: job.postedAt || job.createdAt,
    postedAt: job.postedAt || job.createdAt,
    isGovernment: false,
    isActive: job.isActive ?? true,
    isFeatured: job.isFeatured ?? false,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
