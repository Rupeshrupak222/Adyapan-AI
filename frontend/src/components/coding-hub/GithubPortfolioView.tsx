"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitBranch,
  FileText,
  Layout,
  Loader2,
  GitCommit,
  Star,
  Code2,
  Globe,
  Eye,
  Edit3,
  Key,
  Database,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  Copy,
  Download,
  Sparkles,
  ChevronRight,
  User,
  ExternalLink,
  Layers,
  Lock,
  Columns,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { renderMarkdown } from "@/utils/renderMarkdown";
import { ChatBackground } from "@/components/ady-chat/ChatBackground";
import Editor from "@monaco-editor/react";
import confetti from "canvas-confetti";

// ─── Inline Github Icon Fallback ─────────────────────────────────────────────

const GithubIcon = (props: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    style={{ width: props.size || 24, height: props.size || 24 }}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const Github = GithubIcon;

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface Project {
  name: string;
  description: string;
  stars?: number;
  url?: string;
  language?: string;
}

interface GithubAnalysis {
  summary: string;
  estimatedCommits: number;
  estimatedStars: number;
  topLanguages: string[];
  keyProjects: Project[];
  avatarUrl?: string;
  name?: string;
  bio?: string;
  publicRepos?: number;
  followers?: number;
  location?: string;
}

interface PortfolioData {
  homeHero: {
    title?: string;
    tagline: string;
    bio: string;
    location?: string;
  };
  stats?: {
    yearsExp?: string;
    projectsCompleted?: string;
    contributions?: string;
  };
  aboutSection: string;
  skills?: Array<{ category: string; items: string[] }>;
  projectsToHighlight: Array<{
    title: string;
    tech: string;
    summary: string;
    stars?: number;
    githubUrl?: string;
  }>;
  contact?: {
    email?: string;
    github?: string;
    linkedin?: string;
  };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GithubPortfolioView() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"preview" | "editor" | "website" | "split">("preview");

  // GitHub Analysis states
  const [analysis, setAnalysis] = useState<GithubAnalysis | null>(null);

  // README generator states
  const [projectName, setProjectName] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [templateStyle, setTemplateStyle] = useState("Modern Showcase");
  const [readmeContent, setReadmeContent] = useState("");

  // Portfolio states
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [portfolioTheme, setPortfolioTheme] = useState<"cyberpunk" | "slate" | "emerald">("cyberpunk");

  // Direct Push to GitHub states
  const [githubPat, setGithubPat] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [targetRepo, setTargetRepo] = useState("");
  const [filePath, setFilePath] = useState("README.md");
  const [commitMessage, setCommitMessage] = useState("Update README.md via Adyapan AI");
  const [pushing, setPushing] = useState(false);
  const [pushLog, setPushLog] = useState<{ status: "success" | "error" | null; message: string; details?: string }>({
    status: null,
    message: "Ready to push files.",
  });

  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";

  // Sync theme
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(t);
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Load saved PAT and username from localStorage
  useEffect(() => {
    const savedPat = localStorage.getItem("adyapan-github-pat");
    if (savedPat) setGithubPat(savedPat);

    const savedUser = localStorage.getItem("adyapan-github-username");
    if (savedUser) setUsername(savedUser);
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!username.trim()) {
      toast.error("Please enter a GitHub username");
      return;
    }
    setLoading(true);
    setAnalysis(null);
    setPortfolio(null);
    setPushLog({ status: null, message: "Ready to push files." });

    try {
      const res = await api.post("/github/analyze", { username: username.trim() });
      const data = res.data?.analysis;
      if (data) {
        setAnalysis(data);
        localStorage.setItem("adyapan-github-username", username.trim());
        toast.success(`Loaded profile @${username.trim()}`);
        if (!targetRepo && data.keyProjects?.length) {
          setTargetRepo(`${username.trim()}/${data.keyProjects[0].name}`);
        } else if (!targetRepo) {
          setTargetRepo(`${username.trim()}/portfolio`);
        }
      } else {
        throw new Error("Analysis failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to analyze GitHub profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRepo = (repo: Project) => {
    setProjectName(repo.name);
    setProjectContext(`Language: ${repo.language || "TypeScript"}\nDescription: ${repo.description}`);
    setTargetRepo(`${username || "user"}/${repo.name}`);
    setActiveStep(2);
    toast.info(`Selected project "${repo.name}" for README generation`);
  };

  const handleGenerateReadme = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/github/readme", {
        projectName: projectName.trim(),
        extraContext: projectContext,
        templateStyle,
      });
      const data = res.data?.readmeContent;
      if (data) {
        setReadmeContent(data);
        setActivePreviewTab("preview");
        toast.success("README.md generated successfully!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to generate README");
    } finally {
      setLoading(false);
    }
  };

  const handleBuildPortfolio = async () => {
    if (!analysis) {
      toast.error("Please analyze a GitHub profile in Step 1 first.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/github/portfolio", { profileData: JSON.stringify(analysis) });
      if (res.data) {
        setPortfolio({
          homeHero: res.data.homeHero || {
            title: analysis.name || username,
            tagline: "Software Engineer & Open Source Contributor",
            bio: analysis.summary || "Building optimized full-stack applications.",
            location: analysis.location || "Remote",
          },
          stats: res.data.stats || {
            yearsExp: "3+ Years",
            projectsCompleted: `${analysis.publicRepos || 15}+ Repos`,
            contributions: `${analysis.estimatedCommits || 850}+ Commits`,
          },
          aboutSection: res.data.aboutSection || analysis.summary || "Experienced full-stack software engineer.",
          skills: res.data.skills || [
            { category: "Primary Tech", items: analysis.topLanguages.length ? analysis.topLanguages : ["TypeScript", "React", "Node.js"] },
          ],
          projectsToHighlight: res.data.projectsToHighlight?.length
            ? res.data.projectsToHighlight
            : analysis.keyProjects.map((kp) => ({
                title: kp.name,
                tech: kp.language || "TypeScript",
                summary: kp.description,
                stars: kp.stars,
                githubUrl: kp.url,
              })),
          contact: res.data.contact || {
            email: `${username}@users.noreply.github.com`,
            github: `https://github.com/${username}`,
            linkedin: "#",
          },
        });
        setActivePreviewTab("website");
        setActiveStep(3);
        toast.success("Portfolio website generated!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to generate portfolio");
    } finally {
      setLoading(false);
    }
  };

  const handlePushToGithub = async () => {
    if (!githubPat || !targetRepo || !readmeContent) {
      toast.error("Please fill in PAT, Repository, and generate a README first.");
      return;
    }

    const [owner, repoName] = targetRepo.split("/");
    if (!owner || !repoName) {
      toast.error("Repository must be in format 'owner/repo-name' (e.g. torvalds/linux)");
      return;
    }

    setPushing(true);
    setPushLog({ status: null, message: "Connecting to GitHub API gateway..." });

    try {
      const res = await api.post("/github/push", {
        token: githubPat.trim(),
        owner: owner.trim(),
        repo: repoName.trim(),
        path: filePath.trim() || "README.md",
        content: readmeContent,
        message: commitMessage || "Update README.md via Adyapan AI",
      });

      if (res.data?.success) {
        const commitInfo = res.data.commit;
        setPushLog({
          status: "success",
          message: `Successfully pushed! File written to: ${filePath}`,
          details: `[Success] Target: https://github.com/${targetRepo}\n[Commit] Hash: ${commitInfo?.sha?.slice(0, 7) || "unknown"}\n[Message] "${commitMessage}"`,
        });
        localStorage.setItem("adyapan-github-pat", githubPat.trim());
        toast.success("README pushed to GitHub!");
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      } else {
        throw new Error(res.data?.error || "Push rejected");
      }
    } catch (error) {
      const msg = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error || (error as Error)?.message || "Failed to authenticate or commit code.";
      setPushLog({
        status: "error",
        message: "Push failed. Verification of repository settings needed.",
        details: `[Error] ${msg}\n\nTips:\n- Verify your Personal Access Token (PAT) has 'repo' scopes.\n- Ensure repo '${targetRepo}' exists and PAT user has write permission.\n- Confirm repo path is valid.`,
      });
      toast.error("GitHub push failed.");
    } finally {
      setPushing(false);
    }
  };

  const copyReadmeToClipboard = () => {
    if (!readmeContent) {
      toast.error("No README content to copy.");
      return;
    }
    navigator.clipboard.writeText(readmeContent);
    toast.success("README.md copied to clipboard!");
  };

  const downloadReadmeFile = () => {
    if (!readmeContent) {
      toast.error("No README content to download.");
      return;
    }
    const blob = new Blob([readmeContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName || "README"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded README.md!");
  };

  const downloadPortfolioHtml = () => {
    if (!portfolio) {
      toast.error("No portfolio generated to export.");
      return;
    }
    const htmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${portfolio.homeHero.title || username} - Developer Portfolio</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #090d16; color: #f1f5f9; }
    h1, h2, h3 { font-family: 'Outfit', sans-serif; }
  </style>
</head>
<body class="min-h-screen p-6 md:p-12 max-w-5xl mx-auto space-y-12">
  <header class="text-center py-12 border-b border-slate-800 space-y-4">
    <h1 class="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
      ${portfolio.homeHero.tagline}
    </h1>
    <p class="text-slate-400 max-w-2xl mx-auto text-base">${portfolio.homeHero.bio}</p>
    <div class="flex justify-center gap-4 pt-4 text-xs font-bold">
      <span class="px-4 py-2 bg-emerald-500 text-black rounded-xl">📍 ${portfolio.homeHero.location || "Remote"}</span>
    </div>
  </header>
  
  <section class="space-y-4">
    <h2 class="text-xl font-bold text-emerald-400">About Me</h2>
    <p class="text-slate-300 leading-relaxed whitespace-pre-wrap">${portfolio.aboutSection}</p>
  </section>

  <section class="space-y-6">
    <h2 class="text-xl font-bold text-emerald-400">Featured Repositories</h2>
    <div class="grid md:grid-cols-2 gap-4">
      ${portfolio.projectsToHighlight.map(p => `
        <div class="p-5 border border-slate-800 bg-slate-900/50 rounded-2xl space-y-2">
          <h3 class="font-bold text-lg text-slate-100">${p.title}</h3>
          <p class="text-xs text-slate-400">${p.summary}</p>
          <span class="inline-block px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold">${p.tech}</span>
        </div>
      `).join("")}
    </div>
  </section>
  <footer class="text-center py-8 border-t border-slate-800 text-xs text-slate-500">
    Generated via Adyapan AI GitHub Portfolio Wizard &copy; ${new Date().getFullYear()}
  </footer>
</body>
</html>`;

    const blob = new Blob([htmlDoc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portfolio_${username || "developer"}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded Portfolio HTML!");
  };

  // Dynamic Theme Colors
  const sidebarBg = isDark ? "rgba(8,11,22,0.96)" : "rgba(255,255,255,0.97)";
  const sidebarBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const primaryText = isDark ? "#ffffff" : "#0f172a";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
  const inputBg = isDark ? "rgba(0,0,0,0.5)" : "#ffffff";
  const inputBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";

  return (
    <div className="relative flex overflow-hidden w-full h-full" style={{ color: primaryText }}>
      {/* Starry background */}
      <ChatBackground isDark={isDark} />

      {/* Floating hamburger button when sidebar is collapsed */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            key="side-open"
            className="absolute top-3 left-3 z-30 flex items-center justify-center rounded-xl shadow-lg"
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff",
              boxShadow: "0 4px 14px rgba(16,185,129,0.3)",
            }}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            onClick={() => setSidebarOpen(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden relative z-10 w-full h-full">
        
        {/* Left Interactive Wizard Controls */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0 flex flex-col overflow-hidden h-full"
              style={{
                background: sidebarBg,
                borderRight: `1px solid ${sidebarBorder}`,
                backdropFilter: "blur(24px)",
                position: "relative",
                zIndex: 20,
              }}
            >
              {/* Header & Close Button */}
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: sidebarBorder }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-black font-extrabold shadow-md shadow-emerald-500/20">
                    <Github size={18} />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      GitHub Portfolio Wizard
                    </h2>
                    <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles size={10} /> AI Developer Showcase
                    </p>
                  </div>
                </div>

                <motion.button
                  onClick={() => setSidebarOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
                    <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  </svg>
                </motion.button>
              </div>

              {/* Wizard 4-Step Navigation Tabs */}
              <div className="grid grid-cols-4 p-2 gap-1 border-b text-[11px] font-bold" style={{ borderColor: sidebarBorder }}>
                {[
                  { step: 1, label: "Profile", icon: User },
                  { step: 2, label: "README", icon: FileText },
                  { step: 3, label: "Portfolio", icon: Layout },
                  { step: 4, label: "Push", icon: GitCommit },
                ].map(({ step, label, icon: Icon }) => {
                  const active = activeStep === step;
                  return (
                    <button
                      key={step}
                      onClick={() => setActiveStep(step as any)}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center gap-1 transition-all ${
                        active
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                          : "text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      <Icon size={14} className={active ? "text-emerald-400" : "text-slate-500"} />
                      <span>{step}. {label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Scrollable Wizard Form Controls */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                
                {/* STEP 1: Profile Extractor */}
                {activeStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="p-4 border rounded-2xl space-y-3" style={{ background: cardBg, borderColor: sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <User size={14} /> Step 1: GitHub Extractor
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Live Sync
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                            placeholder="GitHub Username (e.g. torvalds)"
                            className="w-full rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none focus:border-emerald-500 transition"
                            style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                          />
                        </div>
                        <motion.button
                          onClick={handleAnalyze}
                          disabled={loading || !username}
                          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold rounded-xl disabled:opacity-50 transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Analyze
                        </motion.button>
                      </div>

                      {/* Display Profile Stats */}
                      {analysis && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-3 pt-3 border-t border-white/5"
                        >
                          {/* Profile Header */}
                          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-black/30 border border-white/5">
                            <img
                              src={analysis.avatarUrl || `https://github.com/${username}.png`}
                              alt={analysis.name || username}
                              className="w-10 h-10 rounded-full border-2 border-emerald-500/50 object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xs font-black truncate">{analysis.name || username}</h3>
                              <p className="text-[10px] text-emerald-400 font-mono">@{username}</p>
                              {analysis.location && (
                                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={9} /> {analysis.location}
                                </p>
                              )}
                            </div>
                            <a
                              href={`https://github.com/${username}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-emerald-400 transition p-1.5"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2">
                              <GitCommit className="w-4 h-4 text-blue-400" />
                              <div>
                                <div className="text-xs font-black">{analysis.estimatedCommits.toLocaleString()}</div>
                                <span className="text-[9px] text-slate-400 uppercase font-semibold">Commits</span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-400" />
                              <div>
                                <div className="text-xs font-black">{analysis.estimatedStars}</div>
                                <span className="text-[9px] text-slate-400 uppercase font-semibold">Total Stars</span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2">
                              <Code2 className="w-4 h-4 text-emerald-400" />
                              <div>
                                <div className="text-xs font-black">{analysis.publicRepos || analysis.keyProjects.length}</div>
                                <span className="text-[9px] text-slate-400 uppercase font-semibold">Public Repos</span>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2">
                              <Users className="w-4 h-4 text-purple-400" />
                              <div>
                                <div className="text-xs font-black">{analysis.followers || 0}</div>
                                <span className="text-[9px] text-slate-400 uppercase font-semibold">Followers</span>
                              </div>
                            </div>
                          </div>

                          {/* Top Technologies */}
                          <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                            <span className="text-[9px] text-slate-400 uppercase font-bold flex items-center gap-1">
                              <Layers size={10} className="text-emerald-400" /> Key Language Distribution
                            </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {analysis.topLanguages.map((lang, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold"
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Repositories List */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Select Repo for README
                            </span>
                            <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar">
                              {analysis.keyProjects.map((p, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => handleSelectRepo(p)}
                                  className="p-2 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer transition flex items-center justify-between text-xs"
                                >
                                  <div className="min-w-0 pr-2">
                                    <span className="font-extrabold truncate block text-slate-200">{p.name}</span>
                                    <span className="text-[9px] text-slate-400 truncate block">{p.description}</span>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
                                </div>
                              ))}
                            </div>
                          </div>

                          <motion.button
                            onClick={() => setActiveStep(2)}
                            className="w-full py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition flex justify-center items-center gap-1.5"
                          >
                            Next Step: Craft README <ChevronRight size={14} />
                          </motion.button>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 2: README Builder */}
                {activeStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="p-4 border rounded-2xl space-y-3" style={{ background: cardBg, borderColor: sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <FileText size={14} /> Step 2: AI README Craftsman
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Project Name
                          </label>
                          <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Project Name (e.g. task-runner)"
                            className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition"
                            style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Template Style
                          </label>
                          <select
                            value={templateStyle}
                            onChange={(e) => setTemplateStyle(e.target.value)}
                            className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition"
                            style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                          >
                            <option value="Modern Showcase">🚀 Modern Showcase (Badges & Headers)</option>
                            <option value="Minimalist Developer">⚡ Minimalist Developer (Clean & Direct)</option>
                            <option value="Full-Stack Enterprise">🛠️ Full-Stack Enterprise (Architecture & Endpoints)</option>
                            <option value="Open Source Library">📦 Open Source Library (NPM & CLI Guide)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Technical Context / Features
                          </label>
                          <textarea
                            value={projectContext}
                            onChange={(e) => setProjectContext(e.target.value)}
                            placeholder="Enter tech stack, key features, or installation instructions..."
                            className="w-full h-24 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 resize-none font-sans transition"
                            style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                          />
                        </div>
                      </div>

                      <motion.button
                        onClick={handleGenerateReadme}
                        disabled={loading || !projectName}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl disabled:opacity-50 transition flex justify-center items-center gap-1.5 shadow-md shadow-emerald-500/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Generate AI README.md
                      </motion.button>

                      {readmeContent && (
                        <div className="pt-2 flex gap-2">
                          <button
                            onClick={() => setActiveStep(3)}
                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl transition text-center text-slate-200"
                          >
                            Step 3: Portfolio Site &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: Portfolio Website Builder */}
                {activeStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="p-4 border rounded-2xl space-y-3" style={{ background: cardBg, borderColor: sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <Layout size={14} /> Step 3: Portfolio Website
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        Generate a high-converting single page portfolio site using your GitHub profile analytics.
                      </p>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Preview Color Theme
                        </label>
                        <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                          {[
                            { id: "cyberpunk", label: "Midnight", color: "bg-indigo-600" },
                            { id: "slate", label: "Sleek Slate", color: "bg-slate-700" },
                            { id: "emerald", label: "Emerald Glass", color: "bg-emerald-600" },
                          ].map((th) => (
                            <button
                              key={th.id}
                              onClick={() => setPortfolioTheme(th.id as any)}
                              className={`p-2 rounded-xl border flex items-center justify-center gap-1.5 transition ${
                                portfolioTheme === th.id
                                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                                  : "border-white/10 text-slate-400 hover:bg-white/5"
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${th.color}`} />
                              <span>{th.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        onClick={handleBuildPortfolio}
                        disabled={loading}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl disabled:opacity-50 transition flex justify-center items-center gap-1.5 shadow-md shadow-emerald-500/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                        Generate Portfolio Site
                      </motion.button>

                      {portfolio && (
                        <div className="space-y-2 pt-2">
                          <button
                            onClick={downloadPortfolioHtml}
                            className="w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl transition flex justify-center items-center gap-1.5"
                          >
                            <Download size={14} /> Export Standalone HTML
                          </button>
                          <button
                            onClick={() => setActiveStep(4)}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold rounded-xl transition text-center text-slate-200"
                          >
                            Step 4: Push to GitHub &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* STEP 4: Direct Push to GitHub */}
                {activeStep === 4 && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                    <div className="p-4 border rounded-2xl space-y-3" style={{ background: cardBg, borderColor: sidebarBorder }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <GitCommit size={14} /> Step 4: Direct Repository Push
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {/* Token */}
                        <div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                            <label className="font-bold uppercase tracking-wider flex items-center gap-1">
                              <Key className="w-3 h-3 text-slate-500" /> Personal Access Token (PAT)
                            </label>
                            <a
                              href="https://github.com/settings/tokens/new"
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline"
                            >
                              Get Token
                            </a>
                          </div>
                          <div className="relative">
                            <input
                              type={showPat ? "text" : "password"}
                              value={githubPat}
                              onChange={(e) => setGithubPat(e.target.value)}
                              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                              className="w-full rounded-xl p-2.5 pr-8 text-xs font-mono focus:outline-none focus:border-emerald-500 transition"
                              style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPat(!showPat)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-[10px] font-bold"
                            >
                              {showPat ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>

                        {/* Target Repository */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <Database className="w-3 h-3 text-slate-500" /> Target Repository
                          </label>
                          <input
                            type="text"
                            value={targetRepo}
                            onChange={(e) => setTargetRepo(e.target.value)}
                            placeholder="owner/repo-name (e.g. torvalds/linux)"
                            className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition font-mono"
                            style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                          />
                        </div>

                        {/* File Path */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <GitBranch className="w-3 h-3 text-slate-500" /> Repo File Path
                          </label>
                          <input
                            type="text"
                            value={filePath}
                            onChange={(e) => setFilePath(e.target.value)}
                            placeholder="README.md"
                            className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition font-mono"
                            style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                          />
                        </div>

                        {/* Commit Message */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <GitCommit className="w-3 h-3 text-slate-500" /> Commit Message
                          </label>
                          <input
                            type="text"
                            value={commitMessage}
                            onChange={(e) => setCommitMessage(e.target.value)}
                            placeholder="Update README.md via Adyapan AI"
                            className="w-full rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500 transition"
                            style={{ background: inputBg, borderColor: inputBorder, borderStyle: "solid", borderWidth: 1 }}
                          />
                        </div>
                      </div>

                      <motion.button
                        onClick={handlePushToGithub}
                        disabled={pushing || !githubPat || !targetRepo || !readmeContent}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl disabled:opacity-50 transition flex justify-center items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                        Commit & Push to GitHub
                      </motion.button>
                    </div>
                  </motion.div>
                )}

              </div>

            </motion.aside>
          )}
        </AnimatePresence>

        {/* Right Live Preview Workspace */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          
          {/* Top Preview Control Navigation */}
          <div className="p-3 border-b flex items-center justify-between gap-4 flex-wrap z-10" style={{ borderColor: sidebarBorder }}>
            <div className="flex items-center gap-2 ml-12 lg:ml-0">
              <span className="font-extrabold text-sm tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Preview Window
              </span>
              {projectName && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  {projectName}
                </span>
              )}
            </div>

            {/* Showcase View Switcher */}
            <div className="flex items-center gap-1.5 bg-black/20 p-1 rounded-xl border" style={{ borderColor: sidebarBorder }}>
              <button
                onClick={() => setActivePreviewTab("preview")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activePreviewTab === "preview"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye size={13} /> README Preview
              </button>

              <button
                onClick={() => setActivePreviewTab("editor")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activePreviewTab === "editor"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Edit3 size={13} /> Code Editor
              </button>

              <button
                onClick={() => setActivePreviewTab("split")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activePreviewTab === "split"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Columns size={13} /> Split View
              </button>

              {portfolio && (
                <button
                  onClick={() => setActivePreviewTab("website")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activePreviewTab === "website"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Globe size={13} /> Site Template
                </button>
              )}
            </div>

            {/* Actions Bar: Copy / Download */}
            <div className="flex items-center gap-2">
              {readmeContent && (
                <>
                  <motion.button
                    onClick={copyReadmeToClipboard}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5"
                    title="Copy Markdown"
                  >
                    <Copy size={13} /> Copy
                  </motion.button>

                  <motion.button
                    onClick={downloadReadmeFile}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1.5"
                    title="Download README.md"
                  >
                    <Download size={13} /> Download .md
                  </motion.button>
                </>
              )}
            </div>
          </div>

          {/* Showcases Content Pane */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            <AnimatePresence mode="wait">
              
              {/* README Rendered Markdown Preview */}
              {activePreviewTab === "preview" && (
                <motion.div
                  key="readme-preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full overflow-y-auto p-6 md:p-8 custom-scrollbar"
                >
                  {readmeContent ? (
                    <div className="max-w-3xl mx-auto p-6 rounded-2xl border bg-slate-950/50 shadow-2xl" style={{ borderColor: sidebarBorder }}>
                      <div className="text-sm leading-relaxed text-slate-300">
                        {renderMarkdown(readmeContent, isDark)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-slate-400 space-y-3">
                      <FileText className="w-12 h-12 animate-pulse text-emerald-500/40" />
                      <p className="text-sm font-semibold">Load a profile in Step 1 or enter a project in Step 2 to generate a README.md.</p>
                      <button
                        onClick={() => setActiveStep(1)}
                        className="px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-xl shadow-md"
                      >
                        Start Wizard &rarr;
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* README Monaco Code Editor */}
              {activePreviewTab === "editor" && (
                <motion.div
                  key="readme-editor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <Editor
                    height="100%"
                    language="markdown"
                    theme={isDark ? "vs-dark" : "light"}
                    value={readmeContent}
                    onChange={(val) => setReadmeContent(val || "")}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: "on",
                      cursorBlinking: "smooth",
                      automaticLayout: true,
                      wordWrap: "on",
                      padding: { top: 12 },
                    }}
                  />
                </motion.div>
              )}

              {/* SPLIT VIEW (Monaco Code Left + Markdown Render Right) */}
              {activePreviewTab === "split" && (
                <motion.div
                  key="readme-split"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x border-t"
                  style={{ borderColor: sidebarBorder }}
                >
                  <div className="h-full overflow-hidden">
                    <Editor
                      height="100%"
                      language="markdown"
                      theme={isDark ? "vs-dark" : "light"}
                      value={readmeContent}
                      onChange={(val) => setReadmeContent(val || "")}
                      options={{
                        fontSize: 12,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: "on",
                        automaticLayout: true,
                        wordWrap: "on",
                        padding: { top: 12 },
                      }}
                    />
                  </div>

                  <div className="h-full overflow-y-auto p-6 bg-slate-950/40 custom-scrollbar">
                    {readmeContent ? (
                      <div className="text-xs leading-relaxed text-slate-300">
                        {renderMarkdown(readmeContent, isDark)}
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs">No README content loaded yet.</div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* PORTFOLIO MOCKUP WEBSITE PREVIEW */}
              {activePreviewTab === "website" && portfolio && (
                <motion.div
                  key="portfolio-preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full overflow-y-auto p-6 md:p-8 custom-scrollbar"
                >
                  {/* Mock Browser Frame */}
                  <div className="max-w-4xl mx-auto rounded-2xl border bg-black/60 shadow-2xl overflow-hidden" style={{ borderColor: sidebarBorder }}>
                    {/* Browser Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b" style={{ borderColor: sidebarBorder }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
                        <div className="ml-4 px-3 py-1 rounded bg-black/40 text-[10px] text-slate-400 font-mono flex items-center gap-1.5 border border-white/5">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>https://portfolio.dev/{username || "developer"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Portfolio Preview</span>
                        <button
                          onClick={downloadPortfolioHtml}
                          className="px-2.5 py-1 rounded bg-emerald-500 text-black text-[10px] font-extrabold hover:bg-emerald-400 transition"
                        >
                          Export HTML
                        </button>
                      </div>
                    </div>

                    {/* Developer Website Content */}
                    <div
                      className="p-6 md:p-10 space-y-10 min-h-[500px]"
                      style={{
                        background:
                          portfolioTheme === "cyberpunk"
                            ? "#090d16"
                            : portfolioTheme === "slate"
                            ? "#0f172a"
                            : "#062016",
                      }}
                    >
                      {/* Hero Section */}
                      <div className="text-center py-8 space-y-4">
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent leading-tight">
                          {portfolio.homeHero.tagline}
                        </h1>
                        <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
                          {portfolio.homeHero.bio}
                        </p>
                        <div className="flex justify-center gap-3 pt-3">
                          <span className="px-4 py-2 bg-emerald-500 text-black font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20">
                            Explore Projects
                          </span>
                          <span className="px-4 py-2 border border-white/10 hover:bg-white/5 transition text-slate-300 font-semibold text-xs rounded-xl">
                            Contact Me
                          </span>
                        </div>
                      </div>

                      {/* Stats Section */}
                      {portfolio.stats && (
                        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-center">
                          <div>
                            <div className="text-lg font-black text-emerald-400">{portfolio.stats.yearsExp || "3+ Years"}</div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Experience</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-cyan-400">{portfolio.stats.projectsCompleted || "20+ Repos"}</div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Projects</div>
                          </div>
                          <div>
                            <div className="text-lg font-black text-purple-400">{portfolio.stats.contributions || "1,000+ Commits"}</div>
                            <div className="text-[10px] text-slate-400 font-semibold uppercase">Contributions</div>
                          </div>
                        </div>
                      )}

                      {/* About section */}
                      <div className="space-y-3 border-t border-white/5 pt-8">
                        <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                          <Info className="w-4 h-4" /> About Professional Journey
                        </h2>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-2xl whitespace-pre-wrap">
                          {portfolio.aboutSection}
                        </p>
                      </div>

                      {/* Skills Matrix */}
                      {portfolio.skills && portfolio.skills.length > 0 && (
                        <div className="space-y-4 border-t border-white/5 pt-8">
                          <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                            <Layers className="w-4 h-4" /> Technical Skills & Technologies
                          </h2>
                          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                            {portfolio.skills.map((sk, idx) => (
                              <div key={idx} className="p-3.5 border border-white/5 bg-white/[0.02] rounded-xl space-y-2">
                                <h3 className="text-xs font-bold text-slate-200">{sk.category}</h3>
                                <div className="flex flex-wrap gap-1">
                                  {sk.items.map((item, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Projects section */}
                      <div className="space-y-4 border-t border-white/5 pt-8">
                        <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                          <Code2 className="w-4 h-4" /> Featured Repositories & Open Source Works
                        </h2>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                          {portfolio.projectsToHighlight.map((proj, idx) => (
                            <div key={idx} className="p-4 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between gap-3 hover:border-emerald-500/30 transition">
                              <div>
                                <div className="flex justify-between items-start">
                                  <h3 className="font-extrabold text-sm text-slate-100">{proj.title}</h3>
                                  {proj.stars ? (
                                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
                                      <Star size={10} fill="currentColor" /> {proj.stars}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-[11px] text-slate-300 mt-1 leading-normal">{proj.summary}</p>
                              </div>
                              <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold self-start border border-emerald-500/20">
                                {proj.tech}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Log Footer for Push Statuses */}
          <div className="p-3 border-t bg-black/30 text-xs font-mono" style={{ borderColor: sidebarBorder }}>
            <div className="max-w-4xl mx-auto flex items-start gap-2.5">
              {pushing ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : pushLog.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              ) : pushLog.status === "error" ? (
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              ) : (
                <GitBranch className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <span className="text-slate-300 font-semibold">{pushLog.message}</span>
                {pushLog.details && (
                  <pre className="mt-1.5 p-2.5 bg-black/60 border border-white/5 rounded-xl text-[10px] leading-relaxed text-cyan-200 overflow-x-auto whitespace-pre font-mono">
                    {pushLog.details}
                  </pre>
                )}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
