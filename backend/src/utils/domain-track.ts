export type DomainTrack = "tech" | "management" | "core_engineering" | "general";

export interface ProfileDomainInput {
  interestedDomains?: string[] | null;
  branch?: string | null;
  degree?: string | null;
  targetRole?: string | null;
  careerObjective?: string | null;
  aboutMe?: string | null;
}

/**
 * Intelligently classifies the user's career domain into:
 * - "management": Business, Finance, Marketing, HR, Operations, Consulting, Startups, Product Management, MBA, BBA
 * - "core_engineering": Mechanical, Civil, Electrical, Electronics, Chemical, Aerospace
 * - "tech": Computer Science, IT, Software Engineering, AI/ML, Data Science, Web, Cloud
 * - "general": Unspecified or mixed
 */
export function detectDomainTrack(profile: ProfileDomainInput | null | undefined): DomainTrack {
  if (!profile) return "tech";

  const rawDomains = Array.isArray(profile.interestedDomains) ? profile.interestedDomains : [];
  const domainText = rawDomains.map((d) => String(d || "").toLowerCase()).join(" ");
  const branchText = String(profile.branch || "").toLowerCase();
  const degreeText = String(profile.degree || "").toLowerCase();
  const roleText = String(profile.targetRole || "").toLowerCase();
  const combined = `${domainText} ${branchText} ${degreeText} ${roleText}`;

  // 1. Management & Corporate Business patterns
  const mgmtKeywords = [
    "finance",
    "marketing",
    "digital marketing",
    "hrm",
    "human resource",
    "stock market",
    "trading",
    "investment bank",
    "product management",
    "project management",
    "supply chain",
    "operation",
    "startup",
    "entrepreneur",
    "consulting",
    "sales",
    "business development",
    "mba",
    "bba",
    "b.com",
    "bcom",
    "pgdm",
    "commerce",
    "brand manager",
    "financial analyst",
    "hr executive",
    "accountant",
    "growth marketer",
  ];

  const hasManagementSignal = mgmtKeywords.some((kw) => combined.includes(kw));

  // 2. Core Engineering patterns
  const coreKeywords = [
    "mechanical",
    "civil",
    "electrical",
    "electronics",
    "eee",
    "ece",
    "chemical engineering",
    "aerospace",
    "automobile",
    "robotics",
    "biotech",
    "structural",
    "autocad",
    "thermodynamics",
  ];

  const hasCoreSignal = coreKeywords.some((kw) => combined.includes(kw));

  // 3. Tech & Software patterns
  const techKeywords = [
    "computer science",
    "cse",
    "information technology",
    "it",
    "software",
    "web development",
    "frontend",
    "backend",
    "full stack",
    "fullstack",
    "ai",
    "artificial intelligence",
    "machine learning",
    "data science",
    "data analyst",
    "cyber security",
    "cloud",
    "devops",
    "b.tech cs",
    "btech cse",
    "bca",
    "mca",
    "sde",
    "developer",
    "programmer",
    "coder",
  ];

  const hasTechSignal = techKeywords.some((kw) => combined.includes(kw));

  // Priority classification based on explicit intent
  if (hasManagementSignal && !hasTechSignal) {
    return "management";
  }
  if (hasCoreSignal && !hasTechSignal) {
    return "core_engineering";
  }
  if (hasManagementSignal && hasTechSignal) {
    // If user's degree/branch is MBA/BBA or primary target role is management
    if (/mba|bba|b\.com|pgdm/.test(degreeText) || /mba|bba|management|business/.test(branchText) || /manager|hr|marketer|analyst/.test(roleText)) {
      return "management";
    }
  }
  if (hasCoreSignal && hasTechSignal) {
    if (/mechanical|civil|electrical/.test(branchText)) {
      return "core_engineering";
    }
  }

  return "tech";
}
