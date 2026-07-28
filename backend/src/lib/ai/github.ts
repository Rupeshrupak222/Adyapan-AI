import { generateJSON, MODELS } from "./openrouter";

const GITHUB_SYSTEM = "You are an expert tech recruiter and developer advocate specializing in GitHub profile analysis, README crafting, and developer portfolio creation.";

export async function analyzeGithubProfile(username: string) {
  let realUserData: any = null;
  let realRepos: any[] = [];
  
  try {
    const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers: { "User-Agent": "Adyapan-AI-Copilot" }
    });
    if (userRes.ok) {
      realUserData = await userRes.json();
    }
    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`, {
      headers: { "User-Agent": "Adyapan-AI-Copilot" }
    });
    if (reposRes.ok) {
      realRepos = await reposRes.json();
    }
  } catch (e) {
    console.warn("GitHub public API fetch error, falling back to AI:", e);
  }

  let realStars = 0;
  const langMap: Record<string, number> = {};
  const keyProjects: { name: string; description: string; stars?: number; url?: string; language?: string }[] = [];

  if (Array.isArray(realRepos) && realRepos.length > 0) {
    realRepos.forEach(r => {
      realStars += r.stargazers_count || 0;
      if (r.language) {
        langMap[r.language] = (langMap[r.language] || 0) + 1;
      }
      if (!r.fork && keyProjects.length < 8) {
        keyProjects.push({
          name: r.name,
          description: r.description || "Open source repository",
          stars: r.stargazers_count || 0,
          url: r.html_url,
          language: r.language || "TypeScript",
        });
      }
    });
  }

  const topLangs = Object.entries(langMap)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);

  const realContextStr = realUserData
    ? `User: ${realUserData.name || username} (@${username}), Bio: "${realUserData.bio || ''}", Public Repos: ${realUserData.public_repos || 0}, Followers: ${realUserData.followers || 0}, Total Stars: ${realStars}, Top Languages: ${topLangs.join(', ')}, Repos: ${keyProjects.map(p => p.name).join(', ')}`
    : `Developer handle: "${username}"`;

  const aiResult = await generateJSON(
    GITHUB_SYSTEM,
    `Analyze the GitHub profile of developer: "${username}".
Context data: ${realContextStr}

Generate a polished, realistic profile analysis suitable for tech recruiters and portfolio showcase.
Return JSON matching:
{
  "summary": "2-3 sentence engaging recruiter-facing summary of this developer's technical background, capabilities, and strengths",
  "topLanguages": ${topLangs.length ? JSON.stringify(topLangs) : '["JavaScript", "TypeScript", "Python", "HTML/CSS"]'},
  "estimatedCommits": ${realUserData ? (realUserData.public_repos * 40 + 150) : 1200},
  "estimatedStars": ${realStars || 45},
  "avatarUrl": "${realUserData?.avatar_url || ''}",
  "name": "${realUserData?.name || username}",
  "bio": "${realUserData?.bio || 'Software Engineer'}",
  "publicRepos": ${realUserData?.public_repos || (keyProjects.length || 10)},
  "followers": ${realUserData?.followers || 0},
  "location": "${realUserData?.location || 'Remote'}",
  "keyProjects": ${keyProjects.length ? JSON.stringify(keyProjects) : '[{"name":"my-app","description":"Full-stack Web Application"}]'}
}`,
    { model: MODELS.FAST },
    {
      summary: `Active developer specializing in ${topLangs.slice(0, 3).join(", ") || "modern software development"}.`,
      topLanguages: topLangs.length ? topLangs : ["TypeScript", "JavaScript", "Python"],
      estimatedCommits: realUserData ? (realUserData.public_repos * 40 + 150) : 850,
      estimatedStars: realStars || 25,
      avatarUrl: realUserData?.avatar_url || `https://github.com/${username}.png`,
      name: realUserData?.name || username,
      bio: realUserData?.bio || "Software Engineer",
      publicRepos: realUserData?.public_repos || 12,
      followers: realUserData?.followers || 0,
      location: realUserData?.location || "Remote",
      keyProjects: keyProjects.length ? keyProjects : [{ name: "my-app", description: "Full-stack Web Application" }],
    }
  );

  return {
    ...aiResult,
    avatarUrl: aiResult.avatarUrl || realUserData?.avatar_url || `https://github.com/${username}.png`,
    name: aiResult.name || realUserData?.name || username,
    bio: aiResult.bio || realUserData?.bio || "",
    publicRepos: aiResult.publicRepos || realUserData?.public_repos || (aiResult.keyProjects ? aiResult.keyProjects.length : 0),
    topLanguages: aiResult.topLanguages && aiResult.topLanguages.length ? aiResult.topLanguages : (topLangs.length ? topLangs : ["TypeScript", "JavaScript", "Python"]),
  };
}

export async function generateReadme(projectName: string, extraContext: string = "", templateStyle: string = "Modern Showcase") {
  return generateJSON(
    GITHUB_SYSTEM,
    `Write an impressive, highly professional README.md for project: "${projectName}"
Style Preference: ${templateStyle}
Context & Tech Stack details: ${extraContext}

Include:
- Eye-catching header with project title, badge shields, and tagline
- Table of Contents
- Key Features list with emojis
- Tech Stack list/table
- Architecture or Directory structure code snippet
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

export async function generatePortfolio(profileData: string) {
  return generateJSON(
    GITHUB_SYSTEM,
    `Based on this developer profile data, generate structured content for a high-converting developer portfolio website.

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
        location: "Global / Remote"
      },
      stats: {
        yearsExp: "2+ Years",
        projectsCompleted: "15+ Repos",
        contributions: "850+ Commits"
      },
      aboutSection: "I specialize in building full-stack web applications, scalable REST APIs, and responsive user experiences.",
      skills: [
        { category: "Core Stack", items: ["JavaScript", "TypeScript", "React", "Node.js", "SQL"] }
      ],
      projectsToHighlight: [],
      contact: { email: "dev@example.com", github: "#", linkedin: "#" }
    }
  );
}
