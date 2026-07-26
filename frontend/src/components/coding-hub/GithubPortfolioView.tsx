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
}

interface GithubAnalysis {
  summary: string;
  estimatedCommits: number;
  estimatedStars: number;
  topLanguages: string[];
  keyProjects: Project[];
}

interface PortfolioData {
  homeHero: {
    tagline: string;
    bio: string;
  };
  aboutSection: string;
  projectsToHighlight: Array<{
    title: string;
    tech: string;
    summary: string;
  }>;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function GithubPortfolioView() {
  // Step navigation states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"preview" | "editor" | "website">("preview");

  // GitHub Analysis states
  const [analysis, setAnalysis] = useState<GithubAnalysis | null>(null);

  // README generator states
  const [projectName, setProjectName] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [readmeContent, setReadmeContent] = useState("");

  // Portfolio states
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);

  // Direct Push to GitHub states
  const [githubPat, setGithubPat] = useState("");
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

  // ─── Extraction handlers ───────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!username) return;
    setLoading(true);
    setAnalysis(null);
    setPortfolio(null);
    setPushLog({ status: null, message: "Ready to push files." });

    try {
      const res = await api.post("/github/analyze", { username });
      const data = res.data?.analysis;
      if (data) {
        setAnalysis(data);
        localStorage.setItem("adyapan-github-username", username);
        toast.success("GitHub profile analyzed successfully!");
      } else {
        throw new Error("Analysis failed");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to analyze GitHub profile");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReadme = async () => {
    if (!projectName) return;
    setLoading(true);
    try {
      const res = await api.post("/github/readme", { projectName, extraContext: projectContext });
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
      toast.error("Please analyze your GitHub profile first.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/github/portfolio", { profileData: JSON.stringify(analysis) });
      if (res.data) {
        setPortfolio({
          homeHero: res.data.homeHero || { tagline: "Software Engineer", bio: "Building optimized things" },
          aboutSection: res.data.aboutSection || "I am a developer with experience in microservices and frontends.",
          projectsToHighlight: res.data.projectsToHighlight || [],
        });
        setActivePreviewTab("website");
        toast.success("Portfolio website generated!");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to generate portfolio");
    } finally {
      setLoading(false);
    }
  };

  // ─── Direct Push to GitHub ─────────────────────────────────────────────────

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
        token: githubPat,
        owner,
        repo: repoName,
        path: filePath,
        content: readmeContent,
        message: commitMessage,
      });

      if (res.data?.success) {
        const commitInfo = res.data.commit;
        setPushLog({
          status: "success",
          message: `Successfully pushed! File written to: ${filePath}`,
          details: `[Success] Target: https://github.com/${targetRepo}\n[Commit] Hash: ${commitInfo?.sha?.slice(0, 7) || "unknown"}\n[Message] "${commitMessage}"`,
        });
        localStorage.setItem("adyapan-github-pat", githubPat);
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

  // Styling helpers
  const sidebarBg = isDark ? "rgba(8,6,20,0.95)" : "rgba(255,255,255,0.96)";
  const sidebarBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const primaryText = isDark ? "#ffffff" : "#0f172a";
  const mutedText = isDark ? "rgba(255,255,255,0.6)" : "#5f6368";
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";

  return (
    <div
      className="relative flex overflow-hidden w-full h-full"
      style={{
        background: "transparent",
        color: primaryText,
      }}
    >
      {/* starry backdrop */}
      <ChatBackground isDark={isDark} />

      {/* Floating hamburger for closed sidebar */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            key="side-open"
            className="absolute top-3 left-3 z-30 flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              color: "#000",
              boxShadow: "0 2px 10px rgba(245,158,11,0.3)",
            }}
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            onClick={() => setSidebarOpen(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
              <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden relative z-10 w-full h-full">
        
        {/* Left Control Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-shrink-0 flex flex-col overflow-hidden h-full"
              style={{
                background: sidebarBg,
                borderRight: `1px solid ${sidebarBorder}`,
                backdropFilter: "blur(20px)",
                position: "relative",
                zIndex: 10,
              }}
            >
              {/* Close button - positioned in corner */}
              <motion.button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-3 right-3 z-30 flex items-center justify-center rounded-lg"
                style={{
                  width: 28,
                  height: 28,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  color: "#000",
                  boxShadow: "0 2px 10px rgba(245,158,11,0.3)",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="4" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" fill="currentColor" />
                  <rect x="2" y="10.5" width="12" height="1.5" rx="0.75" fill="currentColor" />
                </svg>
              </motion.button>

              {/* Header section */}
              <div className="p-4 border-b flex items-center flex-shrink-0" style={{ borderColor: sidebarBorder }}>
                <span className="font-extrabold text-sm tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  GitHub Portfolio Wizard
                </span>
                <div className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                  Step-by-step
                </div>
              </div>

              {/* Scrollable Wizard Steps Folds */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* STEP 1: Connect profile */}
                <div className="p-4 border border-white/5 bg-white/[0.02] rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] font-bold">1</span>
                    Profile extractor
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Github className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="GitHub Username"
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <motion.button
                      onClick={handleAnalyze}
                      disabled={loading || !username}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Load
                    </motion.button>
                  </div>

                  {/* Display stats if analyzed */}
                  {analysis && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5"
                    >
                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2.5">
                        <GitCommit className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-xs font-black">{analysis.estimatedCommits.toLocaleString()}</div>
                          <span className="text-[9px] text-slate-500 uppercase font-semibold">Commits</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2.5">
                        <Star className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="text-xs font-black">{analysis.estimatedStars}</div>
                          <span className="text-[9px] text-slate-500 uppercase font-semibold">Stars</span>
                        </div>
                      </div>

                      <div className="col-span-2 p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                        <div className="text-[9px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5 text-emerald-400" /> Top Technologies
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysis.topLanguages.map((lang, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] font-semibold text-slate-300 border border-white/5">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* STEP 2: Generate README */}
                <div className="p-4 border border-white/5 bg-white/[0.02] rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] font-bold">2</span>
                    README Builder
                  </div>

                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project Name (e.g. task-runner)"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500/50"
                  />

                  <textarea
                    value={projectContext}
                    onChange={(e) => setProjectContext(e.target.value)}
                    placeholder="Enter project summary or technical tags (optional)..."
                    className="w-full h-20 bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500/50 resize-none font-sans"
                  />

                  <div className="flex gap-2">
                    <motion.button
                      onClick={handleGenerateReadme}
                      disabled={loading || !projectName}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5 shadow-md shadow-emerald-500/10"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                      Generate README
                    </motion.button>

                    {analysis && (
                      <motion.button
                        onClick={handleBuildPortfolio}
                        disabled={loading}
                        className="py-2 px-3 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold rounded-xl transition"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="Generate Portfolio Landing Page"
                      >
                        <Layout className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* STEP 3: Push to GitHub */}
                <div className="p-4 border border-white/5 bg-white/[0.02] rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 flex items-center justify-center text-[10px] font-bold">3</span>
                    Direct Repository Push
                  </div>

                  <div className="space-y-2">
                    {/* Token */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <label className="font-semibold flex items-center gap-1"><Key className="w-3 h-3 text-slate-500" /> Personal Access Token (PAT)</label>
                        <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">Get Token</a>
                      </div>
                      <input
                        type="password"
                        value={githubPat}
                        onChange={(e) => setGithubPat(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>

                    {/* Repository */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><Database className="w-3 h-3 text-slate-500" /> Target Repository</label>
                      <input
                        type="text"
                        value={targetRepo}
                        onChange={(e) => setTargetRepo(e.target.value)}
                        placeholder="owner/repo-name (e.g. torvalds/linux)"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>

                    {/* Path */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><GitBranch className="w-3 h-3 text-slate-500" /> Repo File Path</label>
                      <input
                        type="text"
                        value={filePath}
                        onChange={(e) => setFilePath(e.target.value)}
                        placeholder="README.md"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                    </div>

                    {/* Commit Message */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><GitCommit className="w-3 h-3 text-slate-500" /> Commit Message</label>
                      <input
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Update README.md via Adyapan AI"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </div>

                  <motion.button
                    onClick={handlePushToGithub}
                    disabled={pushing || !githubPat || !targetRepo || !readmeContent}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl disabled:opacity-50 transition-colors flex justify-center items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {pushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                    Commit & Push to GitHub
                  </motion.button>
                </div>

              </div>

            </motion.aside>
          )}
        </AnimatePresence>

        {/* Right Preview Panel */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          
          {/* Top Preview navigation tabs */}
          <div className="p-3 border-b flex items-center justify-between gap-4 flex-wrap z-10" style={{ borderColor: sidebarBorder }}>
            {/* Sidebar toggle button helper space */}
            <div className="flex items-center gap-2 ml-14 lg:ml-0">
              <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                Preview Window
              </span>
            </div>

            {/* Showcase tabs */}
            <div className="flex items-center gap-1.5 bg-black/15 p-1 rounded-xl border" style={{ borderColor: sidebarBorder }}>
              <button
                onClick={() => setActivePreviewTab("preview")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activePreviewTab === "preview"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Readme Preview
              </button>
              <button
                onClick={() => setActivePreviewTab("editor")}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activePreviewTab === "editor"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" /> Markdown Code
              </button>
              {portfolio && (
                <button
                  onClick={() => setActivePreviewTab("website")}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activePreviewTab === "website"
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> Site Template
                </button>
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
                  className="w-full h-full overflow-y-auto p-6 md:p-8"
                >
                  {readmeContent ? (
                    <div className="max-w-3xl mx-auto p-6 rounded-2xl border bg-slate-950/40 shadow-xl" style={{ borderColor: sidebarBorder }}>
                      <div className="text-sm leading-relaxed text-slate-300">
                        {renderMarkdown(readmeContent, isDark)}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-slate-400">
                      <FileText className="w-10 h-10 mb-2 animate-pulse text-emerald-500/40" />
                      <p className="text-sm">Use the left builder pane to load a profile and generate a README.md file.</p>
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

              {/* PORTFOLIO MOCKUP WEBSITE PREVIEW */}
              {activePreviewTab === "website" && portfolio && (
                <motion.div
                  key="portfolio-preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full overflow-y-auto p-6 md:p-8"
                >
                  {/* Mock Browser Frame */}
                  <div className="max-w-4xl mx-auto rounded-2xl border bg-black/60 shadow-2xl overflow-hidden" style={{ borderColor: sidebarBorder }}>
                    {/* Browser Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-black/50 border-b" style={{ borderColor: sidebarBorder }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-60" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
                        <div className="ml-4 px-3 py-1 rounded bg-black/35 text-[10px] text-slate-400 font-mono flex items-center gap-1 w-64 border border-white/5">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>localhost:3000/portfolio/index.html</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Mockup Preview</span>
                    </div>

                    {/* Developer Website Content */}
                    <div className="p-6 md:p-8 space-y-10 min-h-[500px]" style={{ background: isDark ? "#08081a" : "#f8faff" }}>
                      
                      {/* Hero Section */}
                      <div className="text-center py-10 space-y-4">
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent leading-normal">
                          {portfolio.homeHero.tagline}
                        </h1>
                        <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                          {portfolio.homeHero.bio}
                        </p>
                        <div className="flex justify-center gap-3 pt-2">
                          <span className="px-4 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10">View Work</span>
                          <span className="px-4 py-1.5 border border-white/10 hover:bg-white/5 transition text-slate-300 font-semibold text-xs rounded-xl">Contact Me</span>
                        </div>
                      </div>

                      {/* About section */}
                      <div className="space-y-3 border-t border-white/5 pt-8">
                        <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                          <Info className="w-4 h-4" /> About Professional Journey
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl whitespace-pre-wrap">
                          {portfolio.aboutSection}
                        </p>
                      </div>

                      {/* Projects section */}
                      <div className="space-y-4 border-t border-white/5 pt-8">
                        <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-1.5">
                          <Code2 className="w-4 h-4" /> Featured Open Source Works
                        </h2>
                        
                        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                          {portfolio.projectsToHighlight.map((proj, idx) => (
                            <div key={idx} className="p-4 border border-white/5 bg-white/[0.02] rounded-2xl flex flex-col justify-between gap-3 hover:border-emerald-500/25 transition">
                              <div>
                                <h3 className="font-bold text-sm text-slate-200">{proj.title}</h3>
                                <p className="text-[11px] text-slate-400 mt-1 leading-normal">{proj.summary}</p>
                              </div>
                              <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold self-start border border-emerald-500/20">
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
          <div className="p-3 border-t bg-black/20 text-xs font-mono" style={{ borderColor: sidebarBorder }}>
            <div className="max-w-4xl mx-auto flex items-start gap-2">
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
                  <pre className="mt-1.5 p-2 bg-black/60 border border-white/5 rounded-lg text-[10px] leading-relaxed text-cyan-200 overflow-x-auto whitespace-pre font-mono">
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
