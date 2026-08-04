import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  analyzeGithubProfile,
  generateReadme,
  generatePortfolio,
  generateRecommendations,
} from "../lib/ai/github";
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
        commits: analysis.estimatedCommits,
      },
    });

    res.json({ analysis, profile });
  } catch (error) {
    handleRouteError(res, error, "Github.analyze", "Failed to analyze profile");
  }
});

router.post("/recommend", async (req: any, res) => {
  try {
    const { analysis } = req.body;
    if (!analysis) return res.status(400).json({ error: "Analysis is required" });

    const recommendations = await generateRecommendations(analysis);
    res.json({ recommendations });
  } catch (error) {
    handleRouteError(res, error, "Github.recommend", "Failed to generate recommendations");
  }
});

router.post("/readme", async (req: any, res) => {
  try {
    const { projectName, extraContext, templateStyle, sections } = req.body;
    if (!projectName) return res.status(400).json({ error: "Project name is required" });

    const result = await generateReadme(
      projectName,
      extraContext,
      templateStyle,
      Array.isArray(sections) ? sections : undefined
    );
    const userPrisma = await getUserPrismaFromRequest(req);

    const saved = await userPrisma.generatedReadme.create({
      data: {
        userId: req.user.id,
        projectName,
        content: result.readmeContent,
      },
    });

    res.json({ ...result, saved });
  } catch (error) {
    handleRouteError(res, error, "Github.readme", "Failed to generate README");
  }
});

router.post("/portfolio", async (req: any, res) => {
  try {
    const { profileData, theme, title } = req.body;
    const result = await generatePortfolio(profileData, theme || "modern");
    const userPrisma = await getUserPrismaFromRequest(req);

    const portfolio = await userPrisma.portfolio.create({
      data: {
        userId: req.user.id,
        theme: theme || "modern",
        content: { ...result, title: title || result.homeHero?.title || "My Portfolio" },
      },
    });

    res.json({ portfolio, ...result });
  } catch (error) {
    handleRouteError(res, error, "Github.portfolio", "Failed to generate portfolio");
  }
});

// ─── History ─────────────────────────────────────────────────────────────────

router.get("/history", async (req: any, res) => {
  try {
    const userPrisma = await getUserPrismaFromRequest(req);

    const [profiles, readmes, portfolios] = await Promise.all([
      userPrisma.githubProfile.findMany({
        where: { userId: req.user.id },
        orderBy: { lastSynced: "desc" },
        take: 20,
      }),
      userPrisma.generatedReadme.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      userPrisma.portfolio.findMany({
        where: { userId: req.user.id },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
    ]);

    res.json({
      success: true,
      profiles: profiles.map((p: any) => ({
        id: p.id,
        username: p.username,
        stars: p.stars,
        commits: p.commits,
        languages: p.languages,
        createdAt: p.lastSynced,
      })),
      readmes: readmes.map((r: any) => ({
        id: r.id,
        projectName: r.projectName,
        content: r.content,
        createdAt: r.createdAt,
      })),
      portfolios: portfolios.map((p: any) => ({
        id: p.id,
        title: (p.content as any)?.title || "Portfolio",
        theme: p.theme,
        content: p.content,
        isPublished: p.isPublished,
        url: p.url,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    handleRouteError(res, error, "Github.history", "Failed to load history");
  }
});

router.post("/history/save", async (req: any, res) => {
  try {
    const { type, content, title, projectName, theme } = req.body;
    const userPrisma = await getUserPrismaFromRequest(req);

    if (type === "readme") {
      if (!projectName || !content) return res.status(400).json({ error: "projectName and content required" });
      const saved = await userPrisma.generatedReadme.create({
        data: { userId: req.user.id, projectName, content },
      });
      return res.json({ success: true, item: { id: saved.id, projectName, content, createdAt: saved.createdAt } });
    }

    if (type === "portfolio") {
      if (!content) return res.status(400).json({ error: "content required" });
      const saved = await userPrisma.portfolio.create({
        data: {
          userId: req.user.id,
          theme: theme || "modern",
          content: { ...content, title: title || content?.homeHero?.title || "My Portfolio" },
        },
      });
      return res.json({ success: true, item: { id: saved.id, title: (saved.content as any)?.title, theme: saved.theme, content: saved.content, createdAt: saved.createdAt } });
    }

    return res.status(400).json({ error: "Unsupported history type" });
  } catch (error) {
    handleRouteError(res, error, "Github.save", "Failed to save history");
  }
});

router.post("/history/duplicate", async (req: any, res) => {
  try {
    const { type, id } = req.body;
    if (!type || !id) return res.status(400).json({ error: "type and id required" });
    const userPrisma = await getUserPrismaFromRequest(req);

    if (type === "readme") {
      const original = await userPrisma.generatedReadme.findFirst({ where: { id, userId: req.user.id } });
      if (!original) return res.status(404).json({ error: "Not found" });
      const copy = await userPrisma.generatedReadme.create({
        data: { userId: req.user.id, projectName: `${original.projectName} (copy)`, content: original.content },
      });
      return res.json({ success: true, item: { id: copy.id, projectName: copy.projectName, content: copy.content, createdAt: copy.createdAt } });
    }

    if (type === "portfolio") {
      const original = await userPrisma.portfolio.findFirst({ where: { id, userId: req.user.id } });
      if (!original) return res.status(404).json({ error: "Not found" });
      const content = (original.content as any) || {};
      const copy = await userPrisma.portfolio.create({
        data: {
          userId: req.user.id,
          theme: original.theme,
          content: { ...content, title: `${content.title || "Portfolio"} (copy)` },
        },
      });
      return res.json({ success: true, item: { id: copy.id, title: (copy.content as any)?.title, theme: copy.theme, content: copy.content, createdAt: copy.createdAt } });
    }

    return res.status(400).json({ error: "Unsupported history type" });
  } catch (error) {
    handleRouteError(res, error, "Github.duplicate", "Failed to duplicate history item");
  }
});

router.delete("/history/:type/:id", async (req: any, res) => {
  try {
    const { type, id } = req.params;
    const userPrisma = await getUserPrismaFromRequest(req);

    if (type === "readme") {
      await userPrisma.generatedReadme.deleteMany({ where: { id, userId: req.user.id } });
    } else if (type === "portfolio") {
      await userPrisma.portfolio.deleteMany({ where: { id, userId: req.user.id } });
    } else if (type === "profile") {
      await userPrisma.githubProfile.deleteMany({ where: { id, userId: req.user.id } });
    } else {
      return res.status(400).json({ error: "Unsupported history type" });
    }

    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Github.delete", "Failed to delete history item");
  }
});

// ─── Deploy ──────────────────────────────────────────────────────────────────

router.post("/deploy", async (req: any, res) => {
  try {
    const { platform, username, title, targetRepo } = req.body;
    if (!platform) return res.status(400).json({ error: "Platform is required" });

    const userPrisma = await getUserPrismaFromRequest(req);

    let url = "";
    if (platform === "github-pages") {
      const [owner, repo] = String(targetRepo || "").split("/");
      url = owner && repo ? `https://${owner}.github.io/${repo}` : `https://${username || "developer"}.github.io`;
    } else if (platform === "vercel") {
      url = `https://${username || "developer"}-portfolio.vercel.app`;
    } else if (platform === "netlify") {
      url = `https://${username || "developer"}-portfolio.netlify.app`;
    }

    const latest = await userPrisma.portfolio.findFirst({
      where: { userId: req.user.id },
      orderBy: { updatedAt: "desc" },
    });

    if (latest) {
      await userPrisma.portfolio.update({
        where: { id: latest.id },
        data: { isPublished: true, url },
      });
    }

    res.json({ success: true, url, nextStep: platform === "github-pages" ? "push" : "download" });
  } catch (error) {
    handleRouteError(res, error, "Github.deploy", "Failed to prepare deployment");
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
      headers: { ...headers, "Content-Type": "application/json" },
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
