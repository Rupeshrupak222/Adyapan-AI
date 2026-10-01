// ═══════════════════════════════════════════════════════════════════════════════
// Platform Configuration — defaults for dropdowns & options served via GET /api/config
// In-memory only: updates via PUT /api/config/:key last for the process lifetime
// and are reset on restart. The frontend keeps its own defaults in
// frontend/src/config/resume-config.ts — keep both lists in sync.
// ═══════════════════════════════════════════════════════════════════════════════

export interface PlatformConfig {
  companies: string[];
  professions: string[];
  careerLevels: string[];
  resumeStyles: string[];
  chatSuggestions: string[];
  coverLetterModes: string[];
  coverLetterTones: string[];
  coverLetterLengths: string[];
  coverLetterTypes: string[];
  atsRoles: string[];
  atsRoleIcons: Record<string, string>;
  careerTargetRoles: string[];
  careerTimelines: string[];
}

const DEFAULT_CONFIG: PlatformConfig = {
  companies: [
    "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Uber", "Tesla",
    "Spotify", "Adobe", "Stripe", "LinkedIn", "Nvidia", "Salesforce", "Oracle",
    "IBM", "Cisco", "Morgan Stanley", "Goldman Sachs", "Deloitte", "Accenture",
    "TCS", "Infosys", "Wipro", "Samsung", "Atlassian", "Palantir", "Databricks",
    "Snowflake", "Cloudflare", "Other",
  ],
  professions: [
    "Software Engineer", "ML Engineer", "Data Scientist", "Full Stack Developer",
    "Frontend Developer", "Backend Developer", "DevOps Engineer", "Cloud Engineer",
    "AI Engineer", "Product Manager", "UI/UX Designer", "Data Analyst", "SDE",
    "SRE", "Systems Engineer", "Research Scientist", "Mobile Developer",
    "Cybersecurity Engineer", "QA Engineer",
    "Sales Manager", "Key Account Executive", "Key Account Manager",
    "Business Development Executive (BDE)", "Marketing Manager",
    "Brand & Advertising Manager", "Retail Manager", "Store Manager",
    "Category & Merchandising Manager", "Inside Sales Representative",
    "Digital Marketing Specialist", "HR & Talent Acquisition Manager",
    "Operations & Supply Chain Manager",
    "Other",
  ],
  careerLevels: [
    "Fresher", "Junior (1-2 yrs)", "Mid-Level (3-5 yrs)",
    "Senior (6-8 yrs)", "Lead (8+ yrs)",
  ],
  resumeStyles: [
    "ATS Modern", "ATS Professional", "ATS Minimal", "ATS Developer", "ATS Student",
    "ATS Engineering & CAD", "ATS Finance & Banking", "ATS Healthcare & Clinical",
    "ATS Creative & UI/UX", "ATS Management & Executive",
  ],
  chatSuggestions: [
    "Optimize for Amazon", "Reduce to one page", "Improve summary",
    "Improve project descriptions", "Add stronger action verbs", "Rewrite achievements",
  ],
  coverLetterModes: [
    "Software Engineer", "Machine Learning Engineer", "Data Scientist",
    "Frontend Developer", "Backend Developer", "Full Stack Developer",
    "DevOps Engineer", "Cloud Engineer", "AI Engineer", "Product Manager",
    "Data Analyst", "UI/UX Designer", "Mobile Developer", "Cybersecurity Analyst",
    "Mechanical Engineer", "Civil Project Engineer", "Robotics Engineer",
    "Investment Banker", "Financial Analyst", "Digital Marketing Specialist",
    "Clinical Research Associate", "Medical Coder", "Graphic Designer",
    "Sales Manager", "Key Account Manager", "Marketing Manager", "Retail Manager",
  ],
  coverLetterTones: [
    "Professional", "Friendly", "Formal", "Confident",
    "Creative", "Enthusiastic", "Humble", "Bold",
  ],
  coverLetterLengths: ["Short", "Standard", "Detailed"],
  coverLetterTypes: [
    "Full-Time", "Internship", "Referral", "Career Switch", "General Application",
  ],
  atsRoles: [
    "General ATS", "Software Engineer", "Data Analyst", "Data Scientist",
    "Backend Developer", "Frontend Developer", "Full Stack Developer", "AI Engineer",
    "Cybersecurity Analyst", "Mechanical Engineer", "Civil Project Engineer",
    "Robotics Engineer", "Investment Banking Analyst", "Financial Analyst",
    "Product Manager", "UI/UX Designer", "Clinical Research Associate", "Medical Coder",
    "Sales Manager", "Key Account Manager", "Marketing Manager", "Retail Manager",
  ],
  atsRoleIcons: {
    "General ATS": "\u{1F3AF}",
    "Software Engineer": "\u{1F4BB}",
    "Data Analyst": "\u{1F4CA}",
    "Data Scientist": "\u{1F9E0}",
    "Backend Developer": "\u{2699}\u{FE0F}",
    "Frontend Developer": "\u{1F3A8}",
    "Full Stack Developer": "\u{1F680}",
    "AI Engineer": "\u{1F916}",
    "Cybersecurity Analyst": "\u{1F6E1}\u{FE0F}",
    "Mechanical Engineer": "\u{1F527}",
    "Civil Project Engineer": "\u{1F3D7}\u{FE0F}",
    "Robotics Engineer": "\u{1F916}",
    "Investment Banking Analyst": "\u{1F4BC}",
    "Financial Analyst": "\u{1F4B0}",
    "Product Manager": "\u{1F4E6}",
    "UI/UX Designer": "\u{2728}",
    "Clinical Research Associate": "\u{1F9EA}",
    "Medical Coder": "\u{1FA7A}",
    "Sales Manager": "\u{1F4E3}",
    "Key Account Manager": "\u{1F91D}",
    "Marketing Manager": "\u{1F4E2}",
    "Retail Manager": "\u{1F6D2}",
  },
  careerTargetRoles: [
    "Software Engineer", "Backend Developer", "Frontend Developer",
    "Full Stack Developer", "AI Engineer", "Machine Learning Engineer",
    "Data Scientist", "Data Analyst", "Cloud Engineer", "DevOps Engineer",
    "QA Engineer", "Cybersecurity Engineer", "Mechanical Engineer",
    "Civil Engineer", "Robotics Engineer", "Financial Analyst",
    "Investment Banker", "Product Manager", "UI/UX Designer",
    "Sales Manager", "Key Account Manager", "Marketing Manager", "Retail Manager",
    "Custom Goal",
  ],
  careerTimelines: [
    "30 Days", "60 Days", "90 Days", "6 Months", "12 Months", "Custom",
  ],
};

let cachedConfig: PlatformConfig | null = null;

export function getPlatformConfig(): PlatformConfig {
  if (!cachedConfig) {
    cachedConfig = { ...DEFAULT_CONFIG };
  }
  return cachedConfig;
}

export function updatePlatformConfig(partial: Partial<PlatformConfig>): PlatformConfig {
  const current = getPlatformConfig();
  cachedConfig = { ...current, ...partial };
  return cachedConfig;
}
