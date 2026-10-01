// ═══════════════════════════════════════════════════════════════════════════════
// Shared Configuration — single source of truth for all resume-hub dropdowns
// Backend API overrides these defaults when available.
// ═══════════════════════════════════════════════════════════════════════════════

export const COMPANIES = [
  "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Uber", "Tesla",
  "Spotify", "Adobe", "Stripe", "LinkedIn", "Nvidia", "Salesforce", "Oracle",
  "IBM", "Cisco", "Morgan Stanley", "Goldman Sachs", "Deloitte", "Accenture",
  "TCS", "Infosys", "Wipro", "Samsung", "Atlassian", "Palantir", "Databricks",
  "Snowflake", "Cloudflare", "Other",
];

export const PROFESSIONS = [
  // Tech & Software
  "Software Engineer", "Full Stack Developer", "Frontend Developer", "Backend Developer",
  "Mobile App Developer (Android/iOS)", "DevOps Engineer", "Cloud Engineer", "AI/ML Engineer",
  "Data Scientist", "Data Analyst", "Business Analytics Specialist", "Cybersecurity Engineer",
  "QA Engineer", "Systems Engineer", "Research Scientist", "Product Manager",
  "SDE", "SRE",

  // Sales, Marketing & Retail
  "Sales Manager", "Key Account Executive", "Key Account Manager",
  "Business Development Executive (BDE)", "Marketing Manager",
  "Brand & Advertising Manager", "Retail Manager", "Store Manager",
  "Category & Merchandising Manager", "Inside Sales Representative",

  // Core Engineering & ECE
  "Embedded Systems Engineer", "VLSI Design Engineer", "Robotics & Automation Engineer",
  "Drone Systems Engineer", "IoT & Hardware Specialist", "Mechanical Design Engineer",
  "CAD/CAM Engineer", "EV Powertrain Engineer", "Automotive Designer",
  "Civil Project Engineer", "Structural BIM Engineer",

  // Management & Finance
  "Investment Banking Analyst", "Financial Analyst", "Equity Research & Stock Trader",
  "Operations & Supply Chain Manager", "Digital Marketing Specialist",
  "HR & Talent Acquisition Manager", "Startup Founder & Entrepreneur",

  // Healthcare & Pharma
  "Clinical Research Associate (CRA)", "Medical Coding Specialist (ICD-10)",
  "Nanotechnology Researcher", "Genetic & Bio-Engineer", "Clinical Psychologist",

  // Design & Creative
  "UI/UX Designer", "Product Designer", "Graphic & Visual Brand Designer",
  "Other",
];

export const CAREER_LEVELS = [
  "Fresher", "Junior (1-2 yrs)", "Mid-Level (3-5 yrs)",
  "Senior (6-8 yrs)", "Lead (8+ yrs)",
];

export const RESUME_STYLES = [
  "ATS Modern",
  "ATS Professional",
  "ATS Minimal",
  "ATS Developer",
  "ATS Student",
  "ATS Engineering & CAD",
  "ATS Finance & Banking",
  "ATS Healthcare & Clinical",
  "ATS Creative & UI/UX",
  "ATS Management & Executive",
];

export const CHAT_SUGGESTIONS = [
  "Optimize for Amazon", "Reduce to one page", "Improve summary",
  "Improve project descriptions", "Add stronger action verbs", "Rewrite achievements",
];

export const COVER_LETTER_MODES = [
  "Software Engineer", "Machine Learning Engineer", "Data Scientist",
  "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "DevOps Engineer", "Cloud Engineer", "AI Engineer", "Product Manager",
  "Data Analyst", "UI/UX Designer", "Mobile Developer", "Cybersecurity Analyst",
  "Mechanical Engineer", "Civil Project Engineer", "Robotics Engineer",
  "Investment Banker", "Financial Analyst", "Digital Marketing Specialist",
  "Clinical Research Associate", "Medical Coder", "Graphic Designer",
  "Sales Manager", "Key Account Manager", "Marketing Manager", "Retail Manager",
];

export const COVER_LETTER_TONES = [
  "Professional", "Friendly", "Formal", "Confident",
  "Creative", "Enthusiastic", "Humble", "Bold",
];

export const COVER_LETTER_LENGTHS = ["Short", "Standard", "Detailed"];

export const COVER_LETTER_TYPES = [
  "Full-Time", "Internship", "Referral", "Career Switch", "General Application",
];

export const ATS_ROLES = [
  "General ATS",
  "Software Engineer",
  "Data Analyst",
  "Data Scientist",
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "AI Engineer",
  "Cybersecurity Analyst",
  "Mechanical Engineer",
  "Civil Project Engineer",
  "Robotics Engineer",
  "Investment Banking Analyst",
  "Financial Analyst",
  "Product Manager",
  "UI/UX Designer",
  "Clinical Research Associate",
  "Medical Coder",
  "Sales Manager",
  "Key Account Manager",
  "Marketing Manager",
  "Retail Manager",
];

export const ATS_ROLE_ICONS: Record<string, string> = {
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
};

export const CAREER_TARGET_ROLES = [
  "Software Engineer", "Backend Developer", "Frontend Developer",
  "Full Stack Developer", "AI Engineer", "Machine Learning Engineer",
  "Data Scientist", "Data Analyst", "Cloud Engineer", "DevOps Engineer",
  "QA Engineer", "Cybersecurity Engineer", "Mechanical Engineer",
  "Civil Engineer", "Robotics Engineer", "Financial Analyst",
  "Investment Banker", "Product Manager", "UI/UX Designer", "Custom Goal",
  "Sales Manager", "Key Account Manager", "Marketing Manager", "Retail Manager",
];

export const CAREER_TIMELINES = [
  "30 Days", "60 Days", "90 Days", "6 Months", "12 Months", "Custom",
];
