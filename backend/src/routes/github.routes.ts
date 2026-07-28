import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { analyzeGithubProfile, generateReadme, generatePortfolio } from "../lib/ai/github";
import { getUserPrismaFromRequest } from "../utils/prisma";
import { handleRouteError } from "../utils/routeError";

const router = Router();
router.use(requireAuth);

router.post("/analyze", async (req: any, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });
    
    const analysis = await analyzeGithubProfile(username);
    const userPrisma = await getUserPrismaFromRequest(req);
    
    const profile = await userPrisma.githubProfile.create({
      data: {
        userId: req.user.id,
        username,
        repos: analysis.keyProjects,
        languages: analysis.topLanguages,
        stars: analysis.estimatedStars,
        commits: analysis.estimatedCommits
      }
    });

    res.json({ analysis, profile });
  } catch (error) {
    handleRouteError(res, error, "Github.analyze", "Failed to analyze profile");
  }
});

router.post("/readme", async (req: any, res) => {
  try {
    const { projectName, extraContext, templateStyle } = req.body;
    if (!projectName) return res.status(400).json({ error: "Project name is required" });
    
    const result = await generateReadme(projectName, extraContext, templateStyle);
    const userPrisma = await getUserPrismaFromRequest(req);

    await userPrisma.generatedReadme.create({
      data: {
        userId: req.user.id,
        projectName,
        content: result.readmeContent
      }
    });

    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "Github.readme", "Failed to generate README");
  }
});

router.post("/portfolio", async (req: any, res) => {
  try {
    const { profileData } = req.body;
    const result = await generatePortfolio(profileData);
    const userPrisma = await getUserPrismaFromRequest(req);

    const portfolio = await userPrisma.portfolio.create({
      data: {
        userId: req.user.id,
        content: result,
      }
    });

    res.json({ portfolio, ...result });
  } catch (error) {
    handleRouteError(res, error, "Github.portfolio", "Failed to generate portfolio");
  }
});

router.post("/push", async (req: any, res) => {
  try {
    const { token, owner, repo, path, content, message } = req.body;
    if (!token || !owner || !repo || !path || !content) {
      return res.status(400).json({ error: "Missing required fields for pushing to GitHub" });
    }

    const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Adyapan-AI-Copilot",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    let sha: string | undefined;
    try {
      const getRes = await fetch(fileUrl, { headers });
      if (getRes.status === 200) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }
    } catch (e) {
      // File doesn't exist yet
    }

    const putRes = await fetch(fileUrl, {
      method: "PUT",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message || `Update ${path} via Adyapan AI`,
        content: Buffer.from(content).toString("base64"),
        sha,
      }),
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      throw new Error(`GitHub API error: ${putRes.status} ${errorText}`);
    }

    const resultData = await putRes.json();
    res.json({ success: true, commit: resultData.commit });
  } catch (error: any) {
    handleRouteError(res, error, "Github.push", "Failed to push to GitHub");
  }
});

export const githubRouter = router;
