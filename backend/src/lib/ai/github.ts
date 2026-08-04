import { generateJSON, MODELS } from "./openrouter";

const GITHUB_SYSTEM =
  "You are an expert tech recruiter and developer advocate specializing in GitHub profile analysis, README crafting, and developer portfolio creation. You give concise, factual, high-signal advice.";

// ─── Deterministic helpers ───────────────────────────────────────────────────

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** 52 weeks x 7 days of 0-4 intensity values, deterministically seeded. */
function buildContributionGraph(seed: string): number[] {
  const rand = seededRandom(hashString(seed || "github"));
  const out: number[] = [];
  for (let i = 0; i < 52 * 7; i++) {
    const r = rand();
    let level = 0;
    if (r < 0.5) level = 0;
    else if (r < 0.72) level = 1;
    else if (r < 0.88) level = 2;
    else if (r < 0.965) level = 3;
    else level = 4;
    out.push(level);
  }
  return out;
}

const FRONTEND = new Set(["JavaScript", "TypeScript", "HTML", "CSS", "Vue", "Svelte", "SCSS", "Less"]);
const BACKEND = new Set(["Python", "Go", "Java", "C#", "PHP", "Ruby", "C", "C++", "Rust", "Node.js"]);
const MOBILE = new Set(["Swift", "Kotlin", "Dart", "Objective-C"]);
const DATA_AI = new Set(["Jupyter Notebook", "R", "MATLAB", "TeX"]);
const DEVOPS = new Set(["Shell", "Dockerfile", "HCL", "YAML"]);

function categorizeRepo(language?: string | null, topics: string[] = []): string {
  const lang = language || "";
  const topicStr = topics.join(" ").toLowerCase();
  if (topicStr.includes("machine-learning") || topicStr.includes("ai") || topicStr.includes("data")) return "AI / Data";
  if (FRONTEND.has(lang)) return "Frontend";
  if (BACKEND.has(lang)) return "Backend";
  if (MOBILE.has(lang)) return "Mobile";
  if (DATA_AI.has(lang)) return "AI / Data";
  if (DEVOPS.has(lang)) return "DevOps";
  return "Full-Stack";
}

function computeAiScore(repo: any): number {
  let score = 0;
  score += Math.min(40, (repo.stargazers_count || 0) * 3);
  score += Math.min(20, (repo.forks_count || 0) * 1.5);
  if (repo.description) score += 10;
  if (Array.isArray(repo.topics) && repo.topics.length) score += Math.min(10, repo.topics.length * 3);
  if (repo.language) score += 6;
  if (repo.fork) score -= 8;
  return Math.max(5, Math.min(98, Math.round(score)));
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "Recently";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Recently";
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface RawRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics?: string[];
  pushed_at?: string | null;
  html_url?: string;
  fork?: boolean;
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface GithubRepoAnalysis {
  name: string;
  description: string;
  stars: number;
  forks: number;
  url: string;
  language: string;
  topics: string[];
  pushedAt?: string | null;
  updatedLabel: string;
  forked: boolean;
  aiScore: number;
  category: string;
}

export interface GithubAnalysisResult {
  summary: string;
  careerSummary: string;
  techStack: string[];
  skillMatrix: { category: string; items: string[]; level: number }[];
  estimatedCommits: number;
  estimatedStars: number;
  topLanguages: string[];
  languageDistribution: { name: string; pct: number }[];
  keyProjects: GithubRepoAnalysis[];
  avatarUrl?: string;
  name?: string;
  bio?: string;
  publicRepos?: number;
  followers?: number;
  following?: number;
  location?: string;
  contributionGraph: number[];
  latestActivity: { type: string; repo: string; message: string; date: string }[];
  recommendations: { level: "high" | "medium" | "low"; title: string; description: string; action: string }[];
  portfolioScore: number;
}

export async function analyzeGithubProfile(username: string): Promise<GithubAnalysisResult> {
  let realUserData: any = null;
  let realRepos: RawRepo[] = [];

  try {
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { "User-Agent": "Adyapan-AI-Copilot" },
    });
    if (userRes.ok) realUserData = await userRes.json();
    const reposRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
      { headers: { "User-Agent": "Adyapan-AI-Copilot" } }
    );
    if (reposRes.ok) realRepos = await reposRes.json();
  } catch (e) {
    console.warn("GitHub public API fetch error, falling back to AI:", e);
  }

  let realStars = 0;
  const langMap: Record<string, number> = {};

  const allRepos: GithubRepoAnalysis[] = (Array.isArray(realRepos) ? realRepos : [])
    .map((r) => {
      realStars += r.stargazers_count || 0;
      if (r.language) langMap[r.language] = (langMap[r.language] || 0) + 1;
      return {
        name: r.name,
        description: r.description || "Open source repository",
        stars: r.stargazers_count || 0,
        forks: r.forks_count || 0,
        url: r.html_url || `https://github.com/${username}/${r.name}`,
        language: r.language || "TypeScript",
        topics: Array.isArray(r.topics) ? r.topics : [],
        pushedAt: r.pushed_at || null,
        updatedLabel: fmtDate(r.pushed_at),
        forked: !!r.fork,
        aiScore: computeAiScore(r),
        category: categorizeRepo(r.language, Array.isArray(r.topics) ? r.topics : []),
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore);

  const keyProjects = allRepos.filter((r) => !r.forked).slice(0, 8);
  const fallbackProjects: GithubRepoAnalysis[] = keyProjects.length
    ? keyProjects
    : allRepos.length
    ? allRepos.slice(0, 6)
    : [
        {
          name: "my-app",
          description: "Full-stack Web Application",
          stars: 0,
          forks: 0,
          url: `https://github.com/${username}`,
          language: "TypeScript",
          topics: [],
          updatedLabel: "Recently",
          forked: false,
          aiScore: 55,
          category: "Full-Stack",
        },
      ];

  const langEntries = Object.entries(langMap).sort((a, b) => b[1] - a[1]);
  const totalRepos = Math.max(1, allRepos.length);
  const languageDistribution = langEntries.map(([name, count]) => ({
    name,
    pct: Math.round((count / totalRepos) * 100),
  }));
  const topLangs = langEntries.map(([l]) => l).slice(0, 6);

  // Latest activity derived from pushed_at ordering.
  const activityOrdered = [...allRepos].sort((a, b) => {
    const da = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
    const db = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
    return db - da;
  });
  const latestActivity = activityOrdered.slice(0, 6).map((r) => ({
    type: "push",
    repo: r.name,
    message: `Latest push to ${r.name}`,
    date: r.updatedLabel,
  }));

  // ── Deterministic AI insights (always available, fast) ─────────────────────
  const recommendations: GithubAnalysisResult["recommendations"] = [];
  const sorted = [...allRepos].sort((a, b) => b.aiScore - a.aiScore);
  const best = sorted[0];
  const worst = sorted.filter((r) => !r.forked).filter((r) => r.aiScore < 40);
  const noTopics = allRepos.filter((r) => !r.forked && r.topics.length === 0).slice(0, 3);
  const noDesc = allRepos.filter((r) => !r.forked && r.description === "Open source repository").slice(0, 3);

  if (best) {
    recommendations.push({
      level: "high",
      title: "Highlight your strongest project",
      description: `"${best.name}" scores highest (${best.aiScore}/100). Feature it as the flagship project in your portfolio hero.`,
      action: "highlight",
    });
  }
  if (worst.length) {
    recommendations.push({
      level: "medium",
      title: "Weak projects need polish",
      description: `${worst
        .slice(0, 2)
        .map((r) => `"${r.name}"`)
        .join(", ")} ${worst.length === 1 ? "has" : "have"} a low AI score. Add a clear description, topics and screenshots to boost discoverability.`,
      action: "review",
    });
  }
  if (noTopics.length) {
    recommendations.push({
      level: "medium",
      title: "Missing repository topics",
      description: `${noTopics
        .slice(0, 2)
        .map((r) => `"${r.name}"`)
        .join(", ")} ${noTopics.length === 1 ? "has" : "have"} no topics. Topics help recruiters and search engines categorize your work.`,
      action: "addTopics",
    });
  }
  if (noDesc.length) {
    recommendations.push({
      level: "low",
      title: "Add descriptions to repositories",
      description: `${noDesc
        .slice(0, 2)
        .map((r) => `"${r.name}"`)
        .join(", ")} ${noDesc.length === 1 ? "is" : "are"} missing a description. A one-line summary dramatically improves first impressions.`,
      action: "describe",
    });
  }
  if (!realUserData?.bio && !realUserData?.name) {
    recommendations.push({
      level: "low",
      title: "Complete your GitHub profile",
      description: "Add a name and bio to your GitHub profile so recruiters instantly understand who you are.",
      action: "profile",
    });
  }
  recommendations.push({
    level: "low",
    title: "Portfolio completeness",
    description: `Your portfolio data is ${realStars ? "rich" : "minimal"}. Add contact links and an About section to reach 100% recruiter readiness.`,
    action: "complete",
  });

  // Portfolio score (0-100, deterministic)
  let portfolioScore = 0;
  if (realUserData?.name || realUserData?.bio) portfolioScore += 15;
  if (allRepos.length >= 3) portfolioScore += 20;
  else portfolioScore += allRepos.length * 6;
  if (realStars > 0) portfolioScore += 15;
  if ((realUserData?.followers || 0) > 0) portfolioScore += 10;
  if (topLangs.length >= 3) portfolioScore += 10;
  if (best && best.aiScore >= 60) portfolioScore += 15;
  if (realUserData?.location) portfolioScore += 5;
  if (latestActivity.length >= 3) portfolioScore += 10;
  portfolioScore = Math.max(10, Math.min(100, Math.round(portfolioScore)));

  const realContextStr = realUserData
    ? `User: ${realUserData.name || username} (@${username}), Bio: "${realUserData.bio || ""}", Public Repos: ${
        realUserData.public_repos || 0
      }, Followers: ${realUserData.followers || 0}, Total Stars: ${realStars}, Top Languages: ${topLangs.join(
        ", "
      )}, Repos: ${keyProjects.map((p) => p.name).join(", ")}`
    : `Developer handle: "${username}"`;

  const aiResult = await generateJSON(
    GITHUB_SYSTEM,
    `Analyze the GitHub profile of developer: "${username}".
Context data: ${realContextStr}

Generate a polished, realistic profile analysis suitable for tech recruiters and portfolio showcase.
Return JSON matching:
{
  "summary": "2-3 sentence engaging recruiter-facing summary of this developer's technical background, capabilities, and strengths",
  "careerSummary": "One concise paragraph describing what kind of engineer this developer is and what roles they fit best",
  "techStack": ["array of 6-10 core technologies derived from context"],
  "skillMatrix": [{ "category": "Frontend", "items": ["React", "TypeScript"], "level": 85 }],
  "portfolioScore": ${portfolioScore}
}`,
    { model: MODELS.FAST },
    {
      summary: `Active developer specializing in ${topLangs.slice(0, 3).join(", ") || "modern software development"}.`,
      careerSummary: `A hands-on software engineer with ${allRepos.length}+ public repositories, strong in ${topLangs
        .slice(0, 3)
        .join(", ")}. Best suited for full-stack product engineering roles.`,
      techStack: topLangs.length ? topLangs : ["TypeScript", "JavaScript", "Python"],
      skillMatrix: topLangs.length
        ? [
            { category: "Core Stack", items: topLangs.slice(0, 5), level: 80 },
            { category: "Engineering", items: ["Git", "APIs", "Testing"], level: 65 },
          ]
        : [{ category: "Core Stack", items: ["TypeScript", "JavaScript", "Python"], level: 75 }],
      portfolioScore,
    }
  );

  const techStack = Array.isArray(aiResult?.techStack) && aiResult.techStack.length ? aiResult.techStack : topLangs;

  return {
    summary:
      aiResult?.summary ||
      `Active developer specializing in ${topLangs.slice(0, 3).join(", ") || "modern software development"}.`,
    careerSummary:
      aiResult?.careerSummary ||
      `A hands-on software engineer with ${allRepos.length}+ public repositories, strong in ${topLangs
        .slice(0, 3)
        .join(", ")}. Best suited for full-stack product engineering roles.`,
    techStack,
    skillMatrix:
      Array.isArray(aiResult?.skillMatrix) && aiResult.skillMatrix.length
        ? aiResult.skillMatrix
        : [
            { category: "Core Stack", items: topLangs.length ? topLangs.slice(0, 5) : techStack, level: 80 },
          ],
    estimatedCommits: realUserData ? realUserData.public_repos * 40 + 150 : 850,
    estimatedStars: realStars || 25,
    topLanguages: topLangs.length ? topLangs : ["TypeScript", "JavaScript", "Python"],
    languageDistribution,
    keyProjects: keyProjects.length ? keyProjects : fallbackProjects,
    avatarUrl: realUserData?.avatar_url || `https://github.com/${username}.png`,
    name: realUserData?.name || username,
    bio: realUserData?.bio || "Software Engineer",
    publicRepos: realUserData?.public_repos || allRepos.length || 12,
    followers: realUserData?.followers || 0,
    following: realUserData?.following || 0,
    location: realUserData?.location || "Remote",
    contributionGraph: buildContributionGraph(username),
    latestActivity,
    recommendations,
    portfolioScore,
  };
}

// ─── AI Recommendations (deep dive) ───────────────────────────────────────────

export async function generateRecommendations(analysis: Partial<GithubAnalysisResult>) {
  const repoLines = (analysis.keyProjects || [])
    .slice(0, 8)
    .map((r) => `- ${r.name} (${r.category}, score ${r.aiScore}, stars ${r.stars}, forks ${r.forks})`)
    .join("\n");

  const input = `Developer: ${analysis.name || "N/A"} (@github)
Summary: ${analysis.summary || ""}
Languages: ${(analysis.topLanguages || []).join(", ")}
Portfolio score: ${analysis.portfolioScore ?? 0}
Repositories:
${repoLines}`;

  return generateJSON(
    GITHUB_SYSTEM,
    `You are an AI portfolio coach. Based on this GitHub analysis, produce prioritized, recruiter-focused recommendations.

${input}

Return JSON matching:
{
  "projectRanking": [{ "name": "string", "rank": 1, "reason": "short why" }],
  "strongProjects": [{ "name": "string", "strength": "short reason" }],
  "weakProjects": [{ "name": "string", "weakness": "short reason", "fix": "one-line fix" }],
  "missingReadmes": ["repo names"],
  "missingTopics": ["repo names"],
  "portfolioCompleteness": "1-2 sentence overall assessment",
  "atsScore": 78,
  "resumeMatch": "1-2 sentences on how this profile matches software engineer roles"
}`,
    { model: MODELS.BALANCED },
    {
      projectRanking: (analysis.keyProjects || []).map((r, i) => ({
        name: r.name,
        rank: i + 1,
        reason: `${r.category} repository with ${r.aiScore}/100 AI score`,
      })),
      strongProjects: (analysis.keyProjects || [])
        .filter((r) => r.aiScore >= 60)
        .map((r) => ({ name: r.name, strength: "High AI score, clear purpose" })),
      weakProjects: (analysis.keyProjects || [])
        .filter((r) => r.aiScore < 40)
        .map((r) => ({ name: r.name, weakness: "Low AI score", fix: "Add description and topics" })),
      missingReadmes: [],
      missingTopics: [],
      portfolioCompleteness:
        analysis.portfolioScore && analysis.portfolioScore >= 70
          ? "Your profile is strong and recruiter-ready."
          : "Your profile would benefit from richer project descriptions and more repositories.",
      atsScore: analysis.portfolioScore || 60,
      resumeMatch: "Solid foundation for full-stack engineering roles; strengthen project descriptions.",
    }
  );
}

// ─── README Generator ─────────────────────────────────────────────────────────

export async function generateReadme(
  projectName: string,
  extraContext: string = "",
  templateStyle: string = "Modern Showcase",
  sections: string[] = ["Features", "Tech Stack", "Installation", "Usage"]
) {
  const sectionsBlock = sections.map((s) => `- ${s}`).join("\n");

  return generateJSON(
    GITHUB_SYSTEM,
    `Write an impressive, highly professional README.md for project: "${projectName}"
Style Preference: ${templateStyle}
Context & Tech Stack details: ${extraContext}

Include these sections (if applicable):
${sectionsBlock}

Also include:
- Eye-catching header with project title, badge shields (shields.io), and tagline
- Table of Contents
- GitHub stats badge block
- Architecture or Directory structure code snippet (if context hints at structure)
- Installation & Quick Start guide with command blocks
- API / Usage Examples
- Contributing Guidelines & License section

Return JSON matching:
{
  "readmeContent": "Full markdown string of the README"
}`,
    { model: MODELS.BALANCED },
    { readmeContent: `# ${projectName}\n\n> ${extraContext || "Full-stack application built with modern web technologies."}\n\n## 🚀 Features\n- Scalable architecture\n- Clean code standards\n\n## 🛠️ Tech Stack\n- TypeScript / JavaScript\n- Node.js` }
  );
}

// ─── Portfolio Generator (theme-aware) ───────────────────────────────────────

export async function generatePortfolio(profileData: string, theme: string = "modern") {
  return generateJSON(
    GITHUB_SYSTEM,
    `Based on this developer profile data, generate structured content for a high-converting developer portfolio website.
Design theme preference: "${theme}"

Profile Data:
${profileData}

Return JSON matching:
{
  "homeHero": {
    "title": "Developer Name",
    "tagline": "Impactful tagline for software engineer",
    "bio": "Engaging bio highlighting technical skills and experience",
    "location": "Location or Remote"
  },
  "stats": {
    "yearsExp": "3+ Years",
    "projectsCompleted": "20+ Repositories",
    "contributions": "1,200+ Commits"
  },
  "aboutSection": "Multi-paragraph professional overview of technical background, coding philosophy, and domain expertise.",
  "skills": [
    { "category": "Frontend", "items": ["React", "Next.js", "TypeScript", "Tailwind CSS"] },
    { "category": "Backend", "items": ["Node.js", "Express", "Python", "PostgreSQL", "Prisma"] },
    { "category": "DevOps & Tools", "items": ["Docker", "Git", "GitHub Actions", "REST APIs"] }
  ],
  "experience": [{ "role": "Software Engineer", "company": "Company", "period": "2022 - Present", "summary": "Key achievement" }],
  "education": [{ "degree": "B.Tech Computer Science", "institution": "University", "period": "2018 - 2022" }],
  "achievements": ["string"],
  "projectsToHighlight": [
    {
      "title": "Project Title",
      "tech": "React • Node.js • PostgreSQL",
      "summary": "Impactful description explaining key engineering features and technical solutions.",
      "stars": 15,
      "githubUrl": "https://github.com/..."
    }
  ],
  "contact": {
    "email": "dev@example.com",
    "github": "https://github.com/...",
    "linkedin": "https://linkedin.com/..."
  }
}`,
    { model: MODELS.BALANCED },
    {
      homeHero: {
        title: "Software Engineer",
        tagline: "Building High-Performance Scalable Web Applications",
        bio: "Passionate full-stack developer dedicated to clean code, robust backend architectures, and modern user interfaces.",
        location: "Global / Remote",
      },
      stats: {
        yearsExp: "2+ Years",
        projectsCompleted: "15+ Repos",
        contributions: "850+ Commits",
      },
      aboutSection: "I specialize in building full-stack web applications, scalable REST APIs, and responsive user experiences.",
      skills: [{ category: "Core Stack", items: ["JavaScript", "TypeScript", "React", "Node.js", "SQL"] }],
      experience: [],
      education: [],
      achievements: [],
      projectsToHighlight: [],
      contact: { email: "dev@example.com", github: "#", linkedin: "#" },
    }
  );
}
