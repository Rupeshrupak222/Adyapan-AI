"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { getAuthUser } from "@/hooks/useAuth";
import { api } from "@/services/api";
import { motion, AnimatePresence } from "framer-motion";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { useFeatureUsageStore } from "@/store/feature-usage-store";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";
import { FeatureLimitBanner } from "@/components/shared/FeatureLimitBanner";
import {
  Code2,
  Copy,
  Download,
  Check,
  RefreshCw,
  Sparkles,
  Eye,
  FileCode,
  Globe,
  Mail,
  ExternalLink,
  Layers,
  BarChart2,
  Zap,
  User,
  Heart,
  Terminal,
  Cpu,
  Database,
  Cloud,
  Wrench,
  Flame,
  Award,
  BookOpen
} from "lucide-react";

const GithubIcon = ({ className = "w-8 h-8 text-amber-500", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
import { toast } from "sonner";
import { renderMarkdown } from "@/utils/renderMarkdown";

// ─── Skill Categories & Badges Data ──────────────────────────────────────────

interface SkillOption {
  id: string;
  name: string;
  badgeUrl: string;
}

interface SkillCategory {
  title: string;
  icon: any;
  skills: SkillOption[];
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    title: "Programming Languages",
    icon: Code2,
    skills: [
      { id: "js", name: "JavaScript", badgeUrl: "https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" },
      { id: "ts", name: "TypeScript", badgeUrl: "https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" },
      { id: "python", name: "Python", badgeUrl: "https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" },
      { id: "cpp", name: "C++", badgeUrl: "https://img.shields.io/badge/C%2B%2B-00599C?style=for-the-badge&logo=c%2B%2B&logoColor=white" },
      { id: "java", name: "Java", badgeUrl: "https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=java&logoColor=white" },
      { id: "go", name: "Go", badgeUrl: "https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" },
      { id: "rust", name: "Rust", badgeUrl: "https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" },
      { id: "php", name: "PHP", badgeUrl: "https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" },
      { id: "html5", name: "HTML5", badgeUrl: "https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" },
      { id: "css3", name: "CSS3", badgeUrl: "https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" }
    ]
  },
  {
    title: "Frontend Frameworks & UI",
    icon: Cpu,
    skills: [
      { id: "react", name: "React", badgeUrl: "https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" },
      { id: "nextjs", name: "Next.js", badgeUrl: "https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" },
      { id: "vue", name: "Vue.js", badgeUrl: "https://img.shields.io/badge/Vue.js-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white" },
      { id: "angular", name: "Angular", badgeUrl: "https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" },
      { id: "tailwind", name: "Tailwind CSS", badgeUrl: "https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" },
      { id: "redux", name: "Redux", badgeUrl: "https://img.shields.io/badge/Redux-764ABC?style=for-the-badge&logo=redux&logoColor=white" },
      { id: "bootstrap", name: "Bootstrap", badgeUrl: "https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white" },
      { id: "sass", name: "SASS", badgeUrl: "https://img.shields.io/badge/Sass-CC6699?style=for-the-badge&logo=sass&logoColor=white" }
    ]
  },
  {
    title: "Backend & Databases",
    icon: Database,
    skills: [
      { id: "nodejs", name: "Node.js", badgeUrl: "https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" },
      { id: "express", name: "Express", badgeUrl: "https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" },
      { id: "django", name: "Django", badgeUrl: "https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white" },
      { id: "fastapi", name: "FastAPI", badgeUrl: "https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" },
      { id: "postgres", name: "PostgreSQL", badgeUrl: "https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" },
      { id: "mongo", name: "MongoDB", badgeUrl: "https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" },
      { id: "redis", name: "Redis", badgeUrl: "https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" },
      { id: "mysql", name: "MySQL", badgeUrl: "https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" },
      { id: "graphql", name: "GraphQL", badgeUrl: "https://img.shields.io/badge/GraphQL-E10098?style=for-the-badge&logo=graphql&logoColor=white" },
      { id: "firebase", name: "Firebase", badgeUrl: "https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" }
    ]
  },
  {
    title: "DevOps & Cloud Tools",
    icon: Cloud,
    skills: [
      { id: "docker", name: "Docker", badgeUrl: "https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" },
      { id: "kubernetes", name: "Kubernetes", badgeUrl: "https://img.shields.io/badge/Kubernetes-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white" },
      { id: "aws", name: "AWS", badgeUrl: "https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white" },
      { id: "gcp", name: "Google Cloud", badgeUrl: "https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white" },
      { id: "git", name: "Git", badgeUrl: "https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white" },
      { id: "githubactions", name: "GitHub Actions", badgeUrl: "https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white" },
      { id: "vercel", name: "Vercel", badgeUrl: "https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" },
      { id: "linux", name: "Linux", badgeUrl: "https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" }
    ]
  }
];

const THEMES = ["tokyonight", "radical", "dracula", "onedark", "dark", "synthwave", "github_dark"];

export function GithubPortfolioView() {
  const [activeTab, setActiveTab] = useState<"header" | "work" | "skills" | "stats" | "social">("header");
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const quota = useFeatureQuota("GITHUB_PORTFOLIO_BUILDER");
  const checkAndConsume = useFeatureUsageStore((s) => s.checkAndConsume);

  // One logical generation per distinct README version. Each new configuration
  // gets a fresh idempotency key; re-exporting the SAME version replays the
  // same key so it can never consume a second credit.
  const attemptIdRef = useRef<string | null>(null);
  const consumedVersionRef = useRef<string | null>(null);

  // Form State (100% BLANK INITIAL STATES - NO PREFILL OR MOCK DATA)
  const [username, setUsername] = useState("");
  const [titleGreeting, setTitleGreeting] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [headerTheme, setHeaderTheme] = useState("tokyonight");

  // Work & Bio
  const [workingOn, setWorkingOn] = useState("");
  const [workingOnUrl, setWorkingOnUrl] = useState("");
  const [learning, setLearning] = useState("");
  const [askMe, setAskMe] = useState("");
  const [reachMe, setReachMe] = useState("");
  const [funFact, setFunFact] = useState("");

  // Selected Skills (100% Empty by default)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // GitHub Cards Config
  const [showStatsCard, setShowStatsCard] = useState(true);
  const [showTopLangs, setShowTopLangs] = useState(true);
  const [showStreakCard, setShowStreakCard] = useState(true);
  const [showVisitorBadge, setShowVisitorBadge] = useState(true);
  const [showQuote, setShowQuote] = useState(true);
  const [showTrophy, setShowTrophy] = useState(true);
  const [statsTheme, setStatsTheme] = useState("tokyonight");

  // Social Links
  const [socialGithub, setSocialGithub] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialPortfolio, setSocialPortfolio] = useState("");
  const [socialLeetcode, setSocialLeetcode] = useState("");
  const [socialCodeforces, setSocialCodeforces] = useState("");

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
    );
  };

  // Generate Markdown Text
  const generatedMarkdown = useMemo(() => {
    let md = "";

    // Header Banner
    const headerTitle = `${titleGreeting} ${name}`.trim();
    if (headerTitle) {
      md += `<h1 align="center">${headerTitle}</h1>\n`;
    }
    if (subtitle.trim()) {
      md += `<h3 align="center">${subtitle.trim()}</h3>\n\n`;
    }

    // Visitor Badge
    if (showVisitorBadge && username.trim()) {
      md += `<p align="center">\n  <img src="https://komarev.com/ghpvc/?username=${username.trim()}&label=Profile%20views&color=0e75b6&style=flat" alt="${username.trim()}" />\n</p>\n\n`;
    }

    // Bio / Work
    const hasBio = workingOn.trim() || learning.trim() || askMe.trim() || reachMe.trim() || funFact.trim();
    if (hasBio) {
      md += `## 🚀 About Me\n\n`;
      if (workingOn.trim()) {
        md += `- 🔭 I’m currently working on **[${workingOn.trim()}](${workingOnUrl.trim() || "#"})**\n`;
      }
      if (learning.trim()) {
        md += `- 🌱 I’m currently learning **${learning.trim()}**\n`;
      }
      if (askMe.trim()) {
        md += `- 💬 Ask me about **${askMe.trim()}**\n`;
      }
      if (reachMe.trim()) {
        md += `- 📫 How to reach me: **${reachMe.trim()}**\n`;
      }
      if (funFact.trim()) {
        md += `- ⚡ Fun fact: **${funFact.trim()}**\n`;
      }
      md += `\n<br/>\n\n`;
    }

    // Skills
    if (selectedSkills.length > 0) {
      md += `## 🛠️ Tech Stack & Skills\n\n<p align="left">\n`;
      SKILL_CATEGORIES.forEach(cat => {
        cat.skills.forEach(skill => {
          if (selectedSkills.includes(skill.id)) {
            md += `  <img src="${skill.badgeUrl}" alt="${skill.name}" />\n`;
          }
        });
      });
      md += `</p>\n\n<br/>\n\n`;
    }

    // GitHub Stats
    if (username.trim() && (showStatsCard || showTopLangs || showStreakCard || showTrophy)) {
      md += `## 📊 GitHub Analytics\n\n`;

      if (showTrophy) {
        md += `<p align="center">\n  <img src="https://github-profile-trophy.vercel.app/?username=${username.trim()}&theme=${statsTheme}&no-frame=true&no-background=true" alt="${username.trim()}" />\n</p>\n\n`;
      }

      md += `<p align="center">\n`;
      if (showStatsCard) {
        md += `  <img src="https://github-readme-stats.vercel.app/api?username=${username.trim()}&show_icons=true&theme=${statsTheme}&hide_border=true" alt="GitHub Stats" />\n`;
      }
      if (showTopLangs) {
        md += `  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=${username.trim()}&layout=compact&theme=${statsTheme}&hide_border=true" alt="Top Languages" />\n`;
      }
      if (showStreakCard) {
        md += `  <img src="https://github-readme-streak-stats.herokuapp.com/?user=${username.trim()}&theme=${statsTheme}&hide_border=true" alt="GitHub Streak" />\n`;
      }
      md += `</p>\n\n<br/>\n\n`;
    }

    // Social Links
    const hasSocials = socialGithub.trim() || socialLinkedin.trim() || socialTwitter.trim() || socialPortfolio.trim() || socialLeetcode.trim() || socialCodeforces.trim();
    if (hasSocials) {
      md += `## 🌐 Connect & Socials\n\n<p align="left">\n`;
      if (socialGithub.trim()) {
        md += `  <a href="https://github.com/${socialGithub.trim()}" target="_blank"><img src="https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>\n`;
      }
      if (socialLinkedin.trim()) {
        md += `  <a href="https://linkedin.com/in/${socialLinkedin.trim()}" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>\n`;
      }
      if (socialTwitter.trim()) {
        md += `  <a href="https://twitter.com/${socialTwitter.trim()}" target="_blank"><img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white" alt="Twitter"/></a>\n`;
      }
      if (socialPortfolio.trim()) {
        md += `  <a href="${socialPortfolio.trim()}" target="_blank"><img src="https://img.shields.io/badge/Portfolio-FF5722?style=for-the-badge&logo=todoist&logoColor=white" alt="Portfolio"/></a>\n`;
      }
      if (socialLeetcode.trim()) {
        md += `  <a href="https://leetcode.com/${socialLeetcode.trim()}" target="_blank"><img src="https://img.shields.io/badge/LeetCode-FFA116?style=for-the-badge&logo=leetcode&logoColor=black" alt="LeetCode"/></a>\n`;
      }
      if (socialCodeforces.trim()) {
        md += `  <a href="https://codeforces.com/profile/${socialCodeforces.trim()}" target="_blank"><img src="https://img.shields.io/badge/Codeforces-1F8ACB?style=for-the-badge&logo=codeforces&logoColor=white" alt="Codeforces"/></a>\n`;
      }
      md += `</p>\n\n`;
    }

    // Random Dev Quote
    if (showQuote && username.trim()) {
      md += `\n---\n\n<p align="center">\n  <img src="https://quotes-github-readme.vercel.app/api?type=horizontal&theme=${statsTheme}" alt="Dev Quote" />\n</p>\n`;
    }

    return md;
  }, [
    titleGreeting, name, subtitle, username, showVisitorBadge, workingOn, workingOnUrl,
    learning, askMe, reachMe, funFact, selectedSkills, showStatsCard, showTopLangs,
    showStreakCard, showTrophy, statsTheme, socialGithub, socialLinkedin, socialTwitter,
    socialPortfolio, socialLeetcode, socialCodeforces, showQuote
  ]);

  // A new distinct README configuration starts a fresh logical attempt.
  useEffect(() => {
    attemptIdRef.current = quota.newRequestId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedMarkdown]);

  /**
   * Authoritative server-side consumption for exporting the current portfolio
   * version. Idempotent per version: copy + download of the same README cost
   * exactly one credit; editing inputs and exporting again costs another.
   */
  const ensureQuotaForCurrentVersion = async (): Promise<boolean> => {
    if (quota.unlimited) return true;
    if (consumedVersionRef.current === attemptIdRef.current) return true;
    if (quota.exhausted) {
      toast.error(
        "You've used all free GitHub Portfolio Builder attempts this month.",
        {
          description: "Upgrade to Premium for 9 monthly portfolio generations.",
          action: { label: "Upgrade", onClick: () => (window.location.href = "/premium") },
        }
      );
      return false;
    }
    const res = await checkAndConsume("GITHUB_PORTFOLIO_BUILDER", attemptIdRef.current || undefined);
    if (!res.allowed) {
      toast.error(res.message || "You've used all free GitHub Portfolio Builder attempts this month.", {
        description: "Upgrade to Premium for 9 monthly portfolio generations.",
        action: { label: "Upgrade", onClick: () => (window.location.href = "/premium") },
      });
      await quota.refresh();
      return false;
    }
    consumedVersionRef.current = attemptIdRef.current;
    return true;
  };

  const handleCopyCode = async () => {
    if (!(await ensureQuotaForCurrentVersion())) return;
    navigator.clipboard.writeText(generatedMarkdown);
    setCopied(true);
    toast.success("README.md copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = async () => {
    if (!(await ensureQuotaForCurrentVersion())) return;
    const blob = new Blob([generatedMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "README.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("README.md downloaded successfully!");
  };

  return (
    <div className="w-full font-sans space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
            <GithubIcon className="w-8 h-8" style={{ color: "var(--text-primary)" }} />
            GitHub Profile README Generator
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
            Build a stunning, professional GitHub Profile README in seconds (GPRM Style).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <FeatureCreditBadge featureKey="GITHUB_PORTFOLIO_BUILDER" compact />
          <button
            onClick={handleCopyCode}
            disabled={quota.exhausted}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Markdown"}
          </button>
          <button
            onClick={handleDownloadFile}
            disabled={quota.exhausted}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={14} />
            Download README.md
          </button>
        </div>
      </div>

      {quota.exhausted && (
        <FeatureLimitBanner featureKey="GITHUB_PORTFOLIO_BUILDER" featureName="GitHub Portfolio Builder" />
      )}

      {/* Main Studio Grid (Form Config + Live Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Interactive Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] overflow-x-auto">
            {[
              { id: "header", label: "Header", icon: User },
              { id: "work", label: "About & Bio", icon: Sparkles },
              { id: "skills", label: "Tech Stack", icon: Cpu },
              { id: "stats", label: "GitHub Cards", icon: BarChart2 },
              { id: "social", label: "Social Links", icon: Globe }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Form Content Body */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm space-y-4">
            {activeTab === "header" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <User size={16} className="text-amber-500" />
                  Header Info
                </h3>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">GitHub Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. octocat"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Greeting Text</label>
                  <input
                    type="text"
                    value={titleGreeting}
                    onChange={(e) => setTitleGreeting(e.target.value)}
                    placeholder="e.g. Hi 👋, I'm"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ashish Kumar"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Subtitle / Role</label>
                  <textarea
                    rows={2}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Full-Stack Engineer passionate about Open Source"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            )}

            {activeTab === "work" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  About & Current Focus
                </h3>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">🔭 Currently working on</label>
                  <input
                    type="text"
                    value={workingOn}
                    onChange={(e) => setWorkingOn(e.target.value)}
                    placeholder="e.g. AI-powered web tools"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">🔗 Project URL</label>
                  <input
                    type="text"
                    value={workingOnUrl}
                    onChange={(e) => setWorkingOnUrl(e.target.value)}
                    placeholder="https://github.com/username/project"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">🌱 Currently learning</label>
                  <input
                    type="text"
                    value={learning}
                    onChange={(e) => setLearning(e.target.value)}
                    placeholder="e.g. System Design, Rust, Microservices"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">💬 Ask me about</label>
                  <input
                    type="text"
                    value={askMe}
                    onChange={(e) => setAskMe(e.target.value)}
                    placeholder="e.g. React, Node.js, Python, Architecture"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">📫 How to reach me</label>
                  <input
                    type="text"
                    value={reachMe}
                    onChange={(e) => setReachMe(e.target.value)}
                    placeholder="e.g. myemail@example.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">⚡ Fun fact</label>
                  <input
                    type="text"
                    value={funFact}
                    onChange={(e) => setFunFact(e.target.value)}
                    placeholder="e.g. I turn coffee into code!"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Cpu size={16} className="text-amber-500" />
                    Select Skills & Tech Stack ({selectedSkills.length} selected)
                  </h3>
                </div>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {SKILL_CATEGORIES.map(category => {
                    const CatIcon = category.icon;
                    return (
                      <div key={category.title} className="p-3.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)]">
                        <div className="flex items-center gap-2 mb-3">
                          <CatIcon size={14} className="text-amber-500" />
                          <span className="text-xs font-bold text-[var(--text-primary)]">{category.title}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {category.skills.map(skill => {
                            const isSelected = selectedSkills.includes(skill.id);
                            return (
                              <button
                                key={skill.id}
                                onClick={() => toggleSkill(skill.id)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                                  isSelected
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm"
                                    : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-amber-500/20"
                                }`}
                              >
                                {skill.name} {isSelected && "✓"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "stats" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <BarChart2 size={16} className="text-amber-500" />
                  GitHub Cards & Badges
                </h3>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Select Theme</label>
                  <select
                    value={statsTheme}
                    onChange={(e) => setStatsTheme(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  >
                    {THEMES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  {[
                    { label: "Show Profile Stats Card", state: showStatsCard, setState: setShowStatsCard },
                    { label: "Show Top Languages Card", state: showTopLangs, setState: setShowTopLangs },
                    { label: "Show Streak Stats Card", state: showStreakCard, setState: setShowStreakCard },
                    { label: "Show Trophy Badges", state: showTrophy, setState: setShowTrophy },
                    { label: "Show Visitor Count Badge", state: showVisitorBadge, setState: setShowVisitorBadge },
                    { label: "Show Dev Quote Card", state: showQuote, setState: setShowQuote }
                  ].map((item, idx) => (
                    <label key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] cursor-pointer hover:border-amber-500/20">
                      <span className="text-xs font-bold text-[var(--text-primary)]">{item.label}</span>
                      <input
                        type="checkbox"
                        checked={item.state}
                        onChange={(e) => item.setState(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "social" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Globe size={16} className="text-amber-500" />
                  Social Profiles & Contact Links
                </h3>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">GitHub Username</label>
                  <input
                    type="text"
                    value={socialGithub}
                    onChange={(e) => setSocialGithub(e.target.value)}
                    placeholder="e.g. username"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">LinkedIn Profile</label>
                  <input
                    type="text"
                    value={socialLinkedin}
                    onChange={(e) => setSocialLinkedin(e.target.value)}
                    placeholder="e.g. username"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Twitter / X Handle</label>
                  <input
                    type="text"
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    placeholder="e.g. username"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Portfolio Website URL</label>
                  <input
                    type="text"
                    value={socialPortfolio}
                    onChange={(e) => setSocialPortfolio(e.target.value)}
                    placeholder="https://yourportfolio.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">LeetCode Username</label>
                  <input
                    type="text"
                    value={socialLeetcode}
                    onChange={(e) => setSocialLeetcode(e.target.value)}
                    placeholder="e.g. username"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Codeforces Username</label>
                  <input
                    type="text"
                    value={socialCodeforces}
                    onChange={(e) => setSocialCodeforces(e.target.value)}
                    placeholder="e.g. username"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Real-time Markdown Code & Rendered Preview Panel */}
        <div className="lg:col-span-7 space-y-4">
          {/* Output Mode Switcher */}
          <div className="flex items-center justify-between p-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewMode("preview")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  previewMode === "preview"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Eye size={14} />
                Rendered Preview
              </button>
              <button
                onClick={() => setPreviewMode("code")}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  previewMode === "code"
                    ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <FileCode size={14} />
                Raw Markdown
              </button>
            </div>

            <div className="text-[11px] font-bold text-[var(--text-secondary)] px-3">
              Live Interactive Output
            </div>
          </div>

          {/* Preview Container */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] min-h-[560px] shadow-sm">
            {previewMode === "preview" ? (
              <GithubReadmePreview markdown={generatedMarkdown} />
            ) : (
              <pre className="p-4 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-xs font-mono text-amber-400 overflow-x-auto whitespace-pre-wrap leading-relaxed min-h-[480px]">
                {generatedMarkdown || "# Fill in details to view generated markdown"}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live Github Readme Preview Component ─────────────────────────────────────

function GithubReadmePreview({ markdown }: { markdown: string }) {
  if (!markdown || !markdown.trim()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[440px] text-center p-8 text-[var(--text-secondary)] space-y-3">
        <GithubIcon className="w-12 h-12 text-amber-500/40" />
        <p className="text-sm font-bold text-[var(--text-primary)]">Live README Preview</p>
        <p className="text-xs max-w-sm">Fill in your information or select skills on the left to see your GitHub Profile README rendered live here!</p>
      </div>
    );
  }

  const lines = markdown.split("\n");

  return (
    <div className="space-y-4 font-sans text-xs text-[var(--text-primary)] leading-relaxed overflow-x-auto p-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "<br/>" || trimmed === "---") return <div key={idx} className="h-1" />;

        // Header 1: <h1 align="center">...</h1>
        if (trimmed.startsWith("<h1") || trimmed.startsWith("# ")) {
          const content = trimmed.replace(/<[^>]*>/g, "").replace(/^#\s*/, "");
          if (!content.trim()) return null;
          return (
            <h1 key={idx} className="text-2xl md:text-3xl font-extrabold text-center my-4 text-[var(--text-primary)] tracking-tight">
              {content}
            </h1>
          );
        }

        // Header 3: <h3 align="center">...</h3>
        if (trimmed.startsWith("<h3") || trimmed.startsWith("### ")) {
          const content = trimmed.replace(/<[^>]*>/g, "").replace(/^###\s*/, "");
          if (!content.trim()) return null;
          return (
            <h3 key={idx} className="text-sm font-semibold text-center my-2 text-[var(--text-secondary)]">
              {content}
            </h3>
          );
        }

        // Header 2: ## 🚀 About Me / ## 🛠️ Tech Stack & Skills / ## 📊 GitHub Analytics / ## 🌐 Connect & Socials
        if (trimmed.startsWith("## ")) {
          const content = trimmed.replace(/^##\s*/, "");
          return (
            <h2 key={idx} className="text-base font-bold my-4 pb-1.5 border-b border-[var(--border-color)] text-[var(--text-primary)] flex items-center gap-2">
              {content}
            </h2>
          );
        }

        // Bullet point lines (- 🔭 I’m currently working on...)
        if (trimmed.startsWith("- ")) {
          const content = trimmed.slice(2);
          const parts = content.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
          return (
            <div key={idx} className="flex items-start gap-2 my-1 text-xs text-[var(--text-primary)]">
              <span className="text-amber-500 font-bold">•</span>
              <div>
                {parts.map((part, pIdx) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={pIdx} className="font-bold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>;
                  }
                  if (part.startsWith("[") && part.includes("](")) {
                    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)/);
                    if (match) {
                      return (
                        <a key={pIdx} href={match[2]} target="_blank" rel="noreferrer" className="text-amber-500 font-bold underline hover:text-amber-400">
                          {match[1]}
                        </a>
                      );
                    }
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </div>
            </div>
          );
        }

        // Paragraph / Badge containers (<p align="center"> or <p align="left">) or img tags
        if (trimmed.includes("<img") || trimmed.includes("<a")) {
          const imgMatches = Array.from(trimmed.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/g));
          if (imgMatches.length > 0) {
            const isCenter = trimmed.includes('align="center"');
            return (
              <div key={idx} className={`flex flex-wrap items-center gap-2.5 my-3 ${isCenter ? "justify-center" : "justify-start"}`}>
                {imgMatches.map((m, imgIdx) => (
                  <img
                    key={imgIdx}
                    src={m[1]}
                    alt="badge"
                    className="max-w-full h-auto inline-block rounded border border-transparent hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ))}
              </div>
            );
          }
        }

        return <div key={idx} className="text-xs text-[var(--text-secondary)]">{trimmed}</div>;
      })}
    </div>
  );
}

export default GithubPortfolioView;
