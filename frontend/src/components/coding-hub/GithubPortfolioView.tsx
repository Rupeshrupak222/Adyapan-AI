"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useMemo, useEffect, useRef } from "react";
import { api } from "@/services/api";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { useFeatureUsageStore } from "@/store/feature-usage-store";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";
import { FeatureLimitBanner } from "@/components/shared/FeatureLimitBanner";
import {
  Code2,
  Copy,
  Download,
  Check,
  Sparkles,
  Eye,
  FileCode,
  Globe,
  User,
  Cpu,
  Database,
  Cloud,
  BarChart2,
  RefreshCw,
  Heart,
  Search,
  Laugh,
  Coffee
} from "lucide-react";

const GithubIcon = ({ className = "w-8 h-8 text-amber-500", style }: { className?: string; style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);
import { toast } from "sonner";

// ─── Skill Categories & Badges Data ──────────────────────────────────────────

export type PortfolioTab = "header" | "work" | "skills" | "stats" | "social" | "support";

interface SkillOption {
  id: string;
  name: string;
  badgeName: string;
  badgeColor: string;
  logo: string;
  logoColor?: string;
}

interface SkillCategory {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  skills: SkillOption[];
}

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    title: "Programming Languages",
    icon: Code2,
    skills: [
      { id: "java", name: "Java", badgeName: "Java", badgeColor: "ED8B00", logo: "java", logoColor: "white" },
      { id: "kotlin", name: "Kotlin", badgeName: "Kotlin", badgeColor: "7F52FF", logo: "kotlin", logoColor: "white" },
      { id: "python", name: "Python", badgeName: "Python", badgeColor: "3776AB", logo: "python", logoColor: "white" },
      { id: "js", name: "JavaScript", badgeName: "JavaScript", badgeColor: "F7DF1E", logo: "javascript", logoColor: "black" },
      { id: "ts", name: "TypeScript", badgeName: "TypeScript", badgeColor: "3178C6", logo: "typescript", logoColor: "white" },
      { id: "cpp", name: "C++", badgeName: "C%2B%2B", badgeColor: "00599C", logo: "c%2B%2B", logoColor: "white" },
      { id: "csharp", name: "C#", badgeName: "C%23", badgeColor: "239120", logo: "c-sharp", logoColor: "white" },
      { id: "go", name: "Go", badgeName: "Go", badgeColor: "00ADD8", logo: "go", logoColor: "white" },
      { id: "rust", name: "Rust", badgeName: "Rust", badgeColor: "000000", logo: "rust", logoColor: "white" },
      { id: "php", name: "PHP", badgeName: "PHP", badgeColor: "777BB4", logo: "php", logoColor: "white" },
      { id: "html5", name: "HTML5", badgeName: "HTML5", badgeColor: "E34F26", logo: "html5", logoColor: "white" },
      { id: "css3", name: "CSS3", badgeName: "CSS3", badgeColor: "1572B6", logo: "css3", logoColor: "white" },
      { id: "sql", name: "SQL", badgeName: "SQL", badgeColor: "CC292B", logo: "sqlite", logoColor: "white" }
    ]
  },
  {
    title: "Backend & Databases",
    icon: Database,
    skills: [
      { id: "springboot", name: "Spring Boot", badgeName: "Spring_Boot", badgeColor: "F2F4F9", logo: "spring-boot" },
      { id: "spring", name: "Spring Framework", badgeName: "Spring", badgeColor: "6DB33F", logo: "spring", logoColor: "white" },
      { id: "hibernate", name: "Hibernate", badgeName: "Hibernate", badgeColor: "59666C", logo: "hibernate", logoColor: "white" },
      { id: "kafka", name: "Apache Kafka", badgeName: "Apache_Kafka", badgeColor: "231F20", logo: "apache-kafka", logoColor: "white" },
      { id: "nodejs", name: "Node.js", badgeName: "Node.js", badgeColor: "339933", logo: "nodedotjs", logoColor: "white" },
      { id: "express", name: "Express", badgeName: "Express.js", badgeColor: "000000", logo: "express", logoColor: "white" },
      { id: "django", name: "Django", badgeName: "Django", badgeColor: "092E20", logo: "django", logoColor: "white" },
      { id: "fastapi", name: "FastAPI", badgeName: "FastAPI", badgeColor: "009688", logo: "fastapi", logoColor: "white" },
      { id: "postgres", name: "PostgreSQL", badgeName: "PostgreSQL", badgeColor: "316192", logo: "postgresql", logoColor: "white" },
      { id: "mysql", name: "MySQL", badgeName: "MySQL", badgeColor: "4479A1", logo: "mysql", logoColor: "white" },
      { id: "mongo", name: "MongoDB", badgeName: "MongoDB", badgeColor: "47A248", logo: "mongodb", logoColor: "white" },
      { id: "redis", name: "Redis", badgeName: "Redis", badgeColor: "DC382D", logo: "redis", logoColor: "white" },
      { id: "graphql", name: "GraphQL", badgeName: "GraphQL", badgeColor: "E10098", logo: "graphql", logoColor: "white" },
      { id: "firebase", name: "Firebase", badgeName: "Firebase", badgeColor: "FFCA28", logo: "firebase", logoColor: "black" }
    ]
  },
  {
    title: "Frontend Frameworks & UI",
    icon: Cpu,
    skills: [
      { id: "react", name: "React", badgeName: "React", badgeColor: "61DAFB", logo: "react", logoColor: "black" },
      { id: "nextjs", name: "Next.js", badgeName: "Next.js", badgeColor: "000000", logo: "nextdotjs", logoColor: "white" },
      { id: "vue", name: "Vue.js", badgeName: "Vue.js", badgeColor: "4FC08D", logo: "vuedotjs", logoColor: "white" },
      { id: "angular", name: "Angular", badgeName: "Angular", badgeColor: "DD0031", logo: "angular", logoColor: "white" },
      { id: "tailwind", name: "Tailwind CSS", badgeName: "Tailwind_CSS", badgeColor: "38B2AC", logo: "tailwind-css", logoColor: "white" },
      { id: "redux", name: "Redux", badgeName: "Redux", badgeColor: "764ABC", logo: "redux", logoColor: "white" },
      { id: "bootstrap", name: "Bootstrap", badgeName: "Bootstrap", badgeColor: "563D7C", logo: "bootstrap", logoColor: "white" },
      { id: "sass", name: "SASS", badgeName: "Sass", badgeColor: "CC6699", logo: "sass", logoColor: "white" }
    ]
  },
  {
    title: "Build, DevOps & Cloud Tools",
    icon: Cloud,
    skills: [
      { id: "maven", name: "Apache Maven", badgeName: "Apache_Maven", badgeColor: "C71A36", logo: "apache-maven", logoColor: "white" },
      { id: "gradle", name: "Gradle", badgeName: "Gradle", badgeColor: "02303A", logo: "gradle", logoColor: "white" },
      { id: "docker", name: "Docker", badgeName: "Docker", badgeColor: "2496ED", logo: "docker", logoColor: "white" },
      { id: "kubernetes", name: "Kubernetes", badgeName: "Kubernetes", badgeColor: "326CE5", logo: "kubernetes", logoColor: "white" },
      { id: "jenkins", name: "Jenkins", badgeName: "Jenkins", badgeColor: "D24939", logo: "jenkins", logoColor: "white" },
      { id: "postman", name: "Postman", badgeName: "Postman", badgeColor: "FF6C37", logo: "postman", logoColor: "white" },
      { id: "aws", name: "AWS", badgeName: "AWS", badgeColor: "232F3E", logo: "amazon-aws", logoColor: "white" },
      { id: "gcp", name: "Google Cloud", badgeName: "Google_Cloud", badgeColor: "4285F4", logo: "google-cloud", logoColor: "white" },
      { id: "git", name: "Git", badgeName: "Git", badgeColor: "F05032", logo: "git", logoColor: "white" },
      { id: "githubactions", name: "GitHub Actions", badgeName: "GitHub_Actions", badgeColor: "2088FF", logo: "github-actions", logoColor: "white" },
      { id: "vercel", name: "Vercel", badgeName: "Vercel", badgeColor: "000000", logo: "vercel", logoColor: "white" },
      { id: "linux", name: "Linux", badgeName: "Linux", badgeColor: "FCC624", logo: "linux", logoColor: "black" }
    ]
  },
  {
    title: "AI, Machine Learning & Data",
    icon: Sparkles,
    skills: [
      { id: "tensorflow", name: "TensorFlow", badgeName: "TensorFlow", badgeColor: "FF6F00", logo: "tensorflow", logoColor: "white" },
      { id: "pytorch", name: "PyTorch", badgeName: "PyTorch", badgeColor: "EE4C2C", logo: "pytorch", logoColor: "white" },
      { id: "opencv", name: "OpenCV", badgeName: "OpenCV", badgeColor: "5C3EE8", logo: "opencv", logoColor: "white" },
      { id: "pandas", name: "Pandas", badgeName: "pandas", badgeColor: "150458", logo: "pandas", logoColor: "white" },
      { id: "numpy", name: "NumPy", badgeName: "numpy", badgeColor: "013243", logo: "numpy", logoColor: "white" },
      { id: "scikitlearn", name: "Scikit-Learn", badgeName: "scikit_learn", badgeColor: "F7931E", logo: "scikitlearn", logoColor: "white" }
    ]
  },
  {
    title: "Mobile App Development",
    icon: Globe,
    skills: [
      { id: "android", name: "Android", badgeName: "Android", badgeColor: "3DDC84", logo: "android", logoColor: "white" },
      { id: "flutter", name: "Flutter", badgeName: "Flutter", badgeColor: "02569B", logo: "flutter", logoColor: "white" },
      { id: "reactnative", name: "React Native", badgeName: "React_Native", badgeColor: "61DAFB", logo: "react", logoColor: "black" }
    ]
  }
];

const THEMES = ["tokyonight", "radical", "dracula", "onedark", "dark", "synthwave", "github_dark", "gruvbox", "nord"];

export function GithubPortfolioView() {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("header");
  const [previewMode, setPreviewMode] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const quota = useFeatureQuota("GITHUB_PORTFOLIO_BUILDER");
  const checkAndConsume = useFeatureUsageStore((s) => s.checkAndConsume);

  const attemptIdRef = useRef<string | null>(null);
  const consumedVersionRef = useRef<string | null>(null);

  // Form State - Header
  const [username, setUsername] = useState("");
  const [titleGreeting, setTitleGreeting] = useState("");
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [headerStyle, setHeaderStyle] = useState<"clean" | "typing" | "wave">("clean");
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [githubFetched, setGithubFetched] = useState(false);
  const [githubAvatar, setGithubAvatar] = useState("");
  const [githubStats, setGithubStats] = useState<{ publicRepos?: number; followers?: number } | null>(null);
  const [githubUser, setGithubUser] = useState<{
    login: string;
    name?: string;
    avatar_url?: string;
    bio?: string;
    company?: string;
    location?: string;
    blog?: string;
    twitter_username?: string;
    email?: string;
    public_repos?: number;
    followers?: number;
    following?: number;
  } | null>(null);

  // Work & Bio
  const [workingOn, setWorkingOn] = useState("");
  const [workingOnUrl, setWorkingOnUrl] = useState("");
  const [learning, setLearning] = useState("");
  const [collaboratingOn, setCollaboratingOn] = useState("");
  const [helpWith, setHelpWith] = useState("");
  const [askMe, setAskMe] = useState("");
  const [reachMe, setReachMe] = useState("");
  const [funFact, setFunFact] = useState("");

  // Skills
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [badgeStyle, setBadgeStyle] = useState<"for-the-badge" | "flat" | "flat-square">("for-the-badge");
  const [skillSearch, setSkillSearch] = useState("");

  // GitHub Cards Config
  const [showStatsCard, setShowStatsCard] = useState(true);
  const [showTopLangs, setShowTopLangs] = useState(true);
  const [showStreakCard, setShowStreakCard] = useState(true);
  const [showVisitorBadge, setShowVisitorBadge] = useState(true);
  const [showTrophy, setShowTrophy] = useState(false);
  const [statsTheme, setStatsTheme] = useState("tokyonight");

  // Social Links
  const [socialGithub, setSocialGithub] = useState("");
  const [socialLinkedin, setSocialLinkedin] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [socialPortfolio, setSocialPortfolio] = useState("");
  const [socialLeetcode, setSocialLeetcode] = useState("");
  const [socialCodeforces, setSocialCodeforces] = useState("");
  const [socialYoutube, setSocialYoutube] = useState("");
  const [socialDiscord, setSocialDiscord] = useState("");
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialMedium, setSocialMedium] = useState("");

  // Support & Fun Components (GPRM Features)
  const [supportBmc, setSupportBmc] = useState("");
  const [supportKofi, setSupportKofi] = useState("");
  const [supportPaypal, setSupportPaypal] = useState("");
  const [supportPatreon, setSupportPatreon] = useState("");
  const [showQuote, setShowQuote] = useState(true);
  const [showJoke, setShowJoke] = useState(false);

  const toggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId) ? prev.filter(s => s !== skillId) : [...prev, skillId]
    );
  };

  const fetchGithubDetails = async (targetUsername?: string) => {
    const rawInput = targetUsername ?? username;
    const ghHandle = rawInput.trim().replace(/https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "").replace(/^@/, "");
    if (!ghHandle) {
      toast.error("Please enter a GitHub username first.");
      return;
    }

    setLoadingGithub(true);
    try {
      let u: {
        name?: string;
        avatar_url?: string;
        bio?: string;
        company?: string;
        blog?: string;
        twitter_username?: string;
        email?: string;
        location?: string;
        public_repos?: number;
        followers?: number;
        following?: number;
      } | null = null;
      let repos: Array<{
        name?: string;
        html_url?: string;
        language?: string;
        topics?: string[];
        description?: string;
        fork?: boolean;
      }> = [];

      // 1. Primary: Use Next.js local server route (zero CORS, server-to-server with GitHub)
      try {
        const nextRes = await fetch(`/api/github-details?username=${encodeURIComponent(ghHandle)}`);
        if (nextRes.ok) {
          const nextData = await nextRes.json();
          if (nextData.success && nextData.user) {
            u = nextData.user;
            repos = Array.isArray(nextData.repos) ? nextData.repos : [];
          } else if (nextData.error && nextRes.status === 404) {
            toast.error(nextData.error);
            setLoadingGithub(false);
            return;
          }
        }
      } catch (nextErr) {
        console.warn("Next.js /api/github-details unavailable, trying backend proxy:", nextErr);
      }

      // 2. Secondary: Backend API proxy
      if (!u) {
        try {
          const backendRes = await api.get(`/github/user-details/${encodeURIComponent(ghHandle)}`);
          if (backendRes.data?.success && backendRes.data?.user) {
            u = backendRes.data.user;
            repos = Array.isArray(backendRes.data.repos) ? backendRes.data.repos : [];
          }
        } catch (backendErr: unknown) {
          const status = (backendErr as { response?: { status?: number } })?.response?.status;
          if (status === 404) {
            toast.error(`GitHub user "@${ghHandle}" not found.`);
            setLoadingGithub(false);
            return;
          }
          console.warn("Backend GitHub proxy unavailable, attempting direct fetch fallback:", backendErr);
        }
      }

      // 3. Fallback: Direct GitHub API if server proxies were unreachable
      if (!u) {
        const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(ghHandle)}`, {
          headers: { Accept: "application/vnd.github.v3+json" }
        });

        if (!userRes.ok) {
          if (userRes.status === 404) {
            toast.error(`GitHub user "@${ghHandle}" not found.`);
          } else if (userRes.status === 403) {
            toast.error("GitHub rate limit reached. Please try again in a few moments.");
          } else {
            toast.error(`GitHub error (${userRes.status}). Could not fetch profile.`);
          }
          setLoadingGithub(false);
          return;
        }

        u = await userRes.json();

        try {
          const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(ghHandle)}/repos?sort=pushed&per_page=30`, {
            headers: { Accept: "application/vnd.github.v3+json" }
          });
          if (reposRes.ok) {
            repos = await reposRes.json();
          }
        } catch {
          // Repos fetch is non-blocking
        }
      }

      if (!u) {
        toast.error(`Could not retrieve details for "@${ghHandle}".`);
        setLoadingGithub(false);
        return;
      }

      setGithubUser({
        login: ghHandle,
        name: u.name,
        avatar_url: u.avatar_url,
        bio: u.bio,
        company: u.company,
        location: u.location,
        blog: u.blog,
        twitter_username: u.twitter_username,
        email: u.email,
        public_repos: u.public_repos,
        followers: u.followers,
        following: u.following,
      });

      setUsername(ghHandle);
      setTitleGreeting("Hi 👋, I'm");
      setName(u.name || ghHandle);
      if (u.avatar_url) setGithubAvatar(u.avatar_url);
      setSubtitle(
        u.bio ||
        "Inquisitive, energetic computer science specialist skilled in leadership, with a strong foundation in math, logic, and cross-platform coding."
      );

      // Socials
      setSocialGithub(ghHandle);
      if (u.twitter_username) setSocialTwitter(u.twitter_username);
      if (u.blog) {
        const blogUrl = u.blog.startsWith("http") ? u.blog : `https://${u.blog}`;
        setSocialPortfolio(blogUrl);
      }

      setGithubStats({
        publicRepos: u.public_repos ?? 0,
        followers: u.followers ?? 0
      });

      // Repos and Skills
      let detectedSkillsCount = 0;
      const detected = new Set<string>(selectedSkills);
      const repoList = Array.isArray(repos) ? repos : [];
      const repoNamesLower = repoList.map(r => (r.name || "").toLowerCase());

      if (repoList.length > 0) {
        const ownRepos = repoList.filter((r) => !r.fork);
        const topRepo = ownRepos[0] || repoList[0];
        if (topRepo) {
          setWorkingOn(topRepo.name || "");
          if (topRepo.html_url) setWorkingOnUrl(topRepo.html_url);
        }

        repoList.forEach((r) => {
          const lang = (r.language || "").toLowerCase();
          const topics = Array.isArray(r.topics) ? r.topics.map(t => t.toLowerCase()) : [];
          const textPool = [...topics, (r.name || "").toLowerCase(), (r.description || "").toLowerCase()];

          // Languages
          if (lang === "java" || textPool.some(t => t.includes("java"))) detected.add("java");
          if (lang === "kotlin" || textPool.some(t => t.includes("kotlin"))) {
            detected.add("kotlin");
            detected.add("android");
          }
          if (lang === "typescript" || textPool.some(t => t.includes("typescript") || t.includes("ts"))) {
            detected.add("ts");
            detected.add("js");
          }
          if (lang === "javascript" || textPool.some(t => t.includes("javascript") || t.includes("js"))) detected.add("js");
          if (lang === "python" || textPool.some(t => t.includes("python"))) detected.add("python");
          if (lang === "c++" || lang === "cpp" || textPool.some(t => t.includes("c++") || t.includes("cpp") || t.includes("dsa") || t.includes("algorithm") || t.includes("cipher"))) detected.add("cpp");
          if (lang === "c#" || lang === "csharp") detected.add("csharp");
          if (lang === "c") detected.add("c");
          if (lang === "go" || lang === "golang") detected.add("go");
          if (lang === "rust") detected.add("rust");
          if (lang === "php") detected.add("php");
          if (lang === "html" || textPool.some(t => t.includes("html"))) detected.add("html5");
          if (lang === "css" || textPool.some(t => t.includes("css"))) detected.add("css3");

          // Frameworks & Tools
          if (textPool.some(t => t.includes("android"))) {
            detected.add("android");
            detected.add("kotlin");
          }
          if (textPool.some(t => t.includes("flutter"))) detected.add("flutter");
          if (textPool.some(t => t.includes("react-native") || t.includes("reactnative"))) detected.add("reactnative");
          if (textPool.some(t => t.includes("machine-learning") || t.includes("ml") || t.includes("ai") || t.includes("chatbot") || t.includes("deep-learning") || t.includes("face_recognition") || t.includes("recognition") || t.includes("vision"))) {
            detected.add("python");
            detected.add("tensorflow");
            detected.add("opencv");
          }
          if (textPool.some(t => t.includes("pytorch"))) detected.add("pytorch");
          if (textPool.some(t => t.includes("spring") || t.includes("springboot"))) {
            detected.add("springboot");
            detected.add("spring");
          }
          if (textPool.some(t => t.includes("react"))) detected.add("react");
          if (textPool.some(t => t.includes("nextjs") || t.includes("next.js"))) detected.add("nextjs");
          if (textPool.some(t => t.includes("tailwind"))) detected.add("tailwind");
          if (textPool.some(t => t.includes("node") || t.includes("express"))) {
            detected.add("nodejs");
            detected.add("express");
          }
          if (textPool.some(t => t.includes("django"))) detected.add("django");
          if (textPool.some(t => t.includes("fastapi"))) detected.add("fastapi");
          if (textPool.some(t => t.includes("postgres"))) detected.add("postgres");
          if (textPool.some(t => t.includes("mysql") || t.includes("sql"))) detected.add("mysql");
          if (textPool.some(t => t.includes("mongo"))) detected.add("mongo");
          if (textPool.some(t => t.includes("docker"))) detected.add("docker");
          if (textPool.some(t => t.includes("kubernetes"))) detected.add("kubernetes");
          if (textPool.some(t => t.includes("aws"))) detected.add("aws");
          if (textPool.some(t => t.includes("linux"))) detected.add("linux");
        });
      } else {
        setWorkingOn("Open Source Software Engineering");
        setWorkingOnUrl(`https://github.com/${ghHandle}`);
      }

      // Always include Git, and if html5 is present ensure css3 is selected too
      detected.add("git");
      if (detected.has("html5")) detected.add("css3");
      if (detected.size <= 1) {
        detected.add("js");
        detected.add("python");
      }

      const newSkills = Array.from(detected);
      detectedSkillsCount = newSkills.length;
      setSelectedSkills(newSkills);

      // Smart About & Bio Auto-Fill from Profile and Repos
      const hasAI = repoNamesLower.some(n => n.includes("learning") || n.includes("ai") || n.includes("dl") || n.includes("recognition") || n.includes("chatbot") || n.includes("vision"));
      const hasAndroid = repoNamesLower.some(n => n.includes("android") || n.includes("kotlin"));
      const hasDSA = repoNamesLower.some(n => n.includes("structure") || n.includes("algorithm") || n.includes("dsa") || n.includes("c++") || n.includes("cipher") || n.includes("cpp"));
      const hasWeb = repoNamesLower.some(n => n.includes("web") || n.includes("html") || n.includes("react") || n.includes("property") || n.includes("javascript"));

      const learningFocus: string[] = [];
      if (hasAI) learningFocus.push("Machine Learning & Artificial Intelligence");
      if (hasAndroid) learningFocus.push("Android Architecture & Modern Kotlin");
      if (hasDSA) learningFocus.push("Data Structures & Competitive Algorithms");
      if (hasWeb && learningFocus.length < 2) learningFocus.push("Full-Stack Web Development");

      setLearning(learningFocus.length > 0 ? learningFocus.join(" & ") : "Emerging Tech, AI & System Architecture");
      setCollaboratingOn("Open-source AI, Android & Web Innovations");

      const helpTech: string[] = [];
      if (hasAndroid) helpTech.push("Android");
      if (hasAI) helpTech.push("Python & Machine Learning");
      if (hasDSA) helpTech.push("C++ Algorithms");
      setHelpWith(helpTech.length > 0 ? `${helpTech.join(", ")} projects` : "Full-stack development, AI and open source");

      const askTech: string[] = [];
      if (hasDSA) askTech.push("Data Structures & Algorithms");
      if (hasAI) askTech.push("Machine Learning");
      if (hasAndroid) askTech.push("Android App Development");
      if (hasWeb) askTech.push("Web Development");
      setAskMe(askTech.length > 0 ? askTech.join(", ") : "Problem solving, clean code & software engineering");

      // Reach Me
      const reachParts: string[] = [];
      if (u.location) reachParts.push(`Based in ${u.location}`);
      if (u.company) reachParts.push(u.company);
      if (u.email) reachParts.unshift(u.email);
      setReachMe(reachParts.length > 0 ? reachParts.join(" · ") : `@${ghHandle} on GitHub`);

      // Fun Fact
      setFunFact("I turn complex algorithmic problems and caffeine into clean, working code! 🚀");

      setGithubFetched(true);
      toast.success(`Imported details for @${ghHandle}!`, {
        description: `Name, bio, active repo, and ${detectedSkillsCount} tech skills loaded.`
      });
    } catch (err: unknown) {
      console.error("Failed to fetch GitHub details:", err);
      const errMsg = err instanceof Error ? err.message : undefined;
      toast.error(`Could not load details for "${ghHandle}".`, {
        description: errMsg || "Please check the username spelling or try again.",
      });
    } finally {
      setLoadingGithub(false);
    }
  };

  // Load existing profile to prefill GitHub handle/links if user has them saved
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/profile/me");
        const p = res?.data?.profile;
        if (!mounted || !p) return;
        if (p.github) {
          const cleanGh = p.github.replace(/https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "").replace(/^@/, "");
          setUsername(prev => prev || cleanGh);
          setSocialGithub(prev => prev || cleanGh);
          fetchGithubDetails(cleanGh);
        }
        if (p.name) {
          setName(prev => prev || p.name);
        }
        if (p.targetRole) {
          setSubtitle(prev => prev || p.targetRole);
        }
        if (p.linkedin) {
          const cleanLi = p.linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, "").replace(/\/$/, "");
          setSocialLinkedin(prev => prev || cleanLi);
        }
        if (p.portfolio) {
          setSocialPortfolio(prev => prev || p.portfolio);
        }
      } catch {
        // Non-blocking
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate Markdown Text
  const generatedMarkdown = useMemo(() => {
    let md = "";

    const effectiveGreeting = titleGreeting.trim() || "Hi 👋, I'm";
    const effectiveName = name.trim();
    const headerTitle = effectiveName
      ? `${effectiveGreeting} ${effectiveName}`
      : username.trim()
      ? `${effectiveGreeting} ${username.trim()}`
      : subtitle.trim()
      ? "Hi 👋, Welcome to my Profile!"
      : "";

    // 1. Header Banner & Title
    if (headerStyle === "wave") {
      const bannerText = headerTitle || "Welcome to my Profile!";
      md += `<p align="center">\n  <img src="https://capsule-render.vercel.app/api?type=waving&color=auto&height=200&section=header&text=${encodeURIComponent(bannerText)}&fontSize=42&animation=fadeIn" alt="Header Banner" />\n</p>\n\n`;
      if (subtitle.trim()) {
        md += `<h3 align="center">${subtitle.trim()}</h3>\n\n`;
      }
    } else if (headerStyle === "typing") {
      if (headerTitle) {
        md += `<h1 align="center">${headerTitle}</h1>\n`;
      }
      const typingLines = subtitle.trim() ? subtitle.trim().replace(/\s*\|\s*/g, ";") : "Software Developer;Tech Enthusiast;Open Source Explorer";
      md += `<p align="center">\n  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&pause=1000&color=F59E0B&center=true&vCenter=true&width=500&lines=${encodeURIComponent(typingLines)}" alt="Typing SVG" />\n</p>\n\n`;
    } else {
      if (headerTitle) {
        md += `<h1 align="center">${headerTitle}</h1>\n`;
      }
      if (subtitle.trim()) {
        md += `<h3 align="center">${subtitle.trim()}</h3>\n\n`;
      }
    }

    // Visitor Badge
    if (showVisitorBadge && username.trim()) {
      md += `<p align="center">\n  <img src="https://komarev.com/ghpvc/?username=${encodeURIComponent(username.trim())}&label=Profile%20views&color=0e75b6&style=flat" alt="${username.trim()}" />\n</p>\n\n`;
    }

    // 2. About & Bio
    const hasBio = workingOn.trim() || learning.trim() || collaboratingOn.trim() || helpWith.trim() || askMe.trim() || reachMe.trim() || funFact.trim();
    if (hasBio) {
      md += `## 🚀 About Me\n\n`;
      if (workingOn.trim()) {
        md += `- 🔭 I’m currently working on **[${workingOn.trim()}](${workingOnUrl.trim() || "#"})**\n`;
      }
      if (learning.trim()) {
        md += `- 🌱 I’m currently learning **${learning.trim()}**\n`;
      }
      if (collaboratingOn.trim()) {
        md += `- 👯 I’m looking to collaborate on **${collaboratingOn.trim()}**\n`;
      }
      if (helpWith.trim()) {
        md += `- 🤝 I’m looking for help with **${helpWith.trim()}**\n`;
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

    // 3. Tech Stack
    if (selectedSkills.length > 0) {
      md += `## 🛠️ Tech Stack & Skills\n\n<p align="left">\n`;
      SKILL_CATEGORIES.forEach(cat => {
        cat.skills.forEach(skill => {
          if (selectedSkills.includes(skill.id)) {
            const logoColorParam = skill.logoColor ? `&logoColor=${skill.logoColor}` : "";
            const badgeUrl = `https://img.shields.io/badge/${skill.badgeName}-${skill.badgeColor}?style=${badgeStyle}&logo=${skill.logo}${logoColorParam}`;
            md += `  <img src="${badgeUrl}" alt="${skill.name}" />\n`;
          }
        });
      });
      md += `</p>\n\n<br/>\n\n`;
    }

    // 4. GitHub Stats & Cards
    if (username.trim() && (showStatsCard || showTopLangs || showStreakCard || showTrophy)) {
      md += `## 📊 GitHub Analytics\n\n`;

      if (showTrophy) {
        md += `<p align="center">\n  <img src="https://github-profile-trophy.vercel.app/?username=${encodeURIComponent(username.trim())}&theme=${statsTheme}&no-frame=true&no-background=true" alt="${username.trim()}" />\n</p>\n\n`;
      }

      md += `<p align="center">\n`;
      if (showStatsCard) {
        md += `  <img src="https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(username.trim())}&show_icons=true&theme=${statsTheme}&hide_border=true" alt="GitHub Stats" />\n`;
      }
      if (showTopLangs) {
        md += `  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=${encodeURIComponent(username.trim())}&layout=compact&theme=${statsTheme}&hide_border=true" alt="Top Languages" />\n`;
      }
      if (showStreakCard) {
        md += `  <img src="https://github-readme-streak-stats.herokuapp.com/?user=${encodeURIComponent(username.trim())}&theme=${statsTheme}&hide_border=true" alt="GitHub Streak" />\n`;
      }
      md += `</p>\n\n<br/>\n\n`;
    }

    // 5. Social Links
    const cleanUrl = (val: string, base: string) => {
      const v = val.trim();
      if (!v) return "";
      if (v.startsWith("http://") || v.startsWith("https://")) return v;
      return `${base}${v.replace(/^@/, "").replace(/\/$/, "")}`;
    };

    const ghLink = cleanUrl(socialGithub, "https://github.com/");
    const liLink = cleanUrl(socialLinkedin, "https://linkedin.com/in/");
    const twLink = cleanUrl(socialTwitter, "https://twitter.com/");
    const pfLink = cleanUrl(socialPortfolio, "https://");
    const lcLink = cleanUrl(socialLeetcode, "https://leetcode.com/");
    const cfLink = cleanUrl(socialCodeforces, "https://codeforces.com/profile/");
    const ytLink = cleanUrl(socialYoutube, "https://youtube.com/@");
    const dcLink = cleanUrl(socialDiscord, "https://discord.gg/");
    const igLink = cleanUrl(socialInstagram, "https://instagram.com/");
    const medLink = cleanUrl(socialMedium, "https://medium.com/@");

    const hasSocials = ghLink || liLink || twLink || pfLink || lcLink || cfLink || ytLink || dcLink || igLink || medLink;
    if (hasSocials) {
      md += `## 🌐 Connect & Socials\n\n<p align="left">\n`;
      if (ghLink) {
        md += `  <a href="${ghLink}" target="_blank"><img src="https://img.shields.io/badge/GitHub-100000?style=${badgeStyle}&logo=github&logoColor=white" alt="GitHub"/></a>\n`;
      }
      if (liLink) {
        md += `  <a href="${liLink}" target="_blank"><img src="https://img.shields.io/badge/LinkedIn-0077B5?style=${badgeStyle}&logo=linkedin&logoColor=white" alt="LinkedIn"/></a>\n`;
      }
      if (twLink) {
        md += `  <a href="${twLink}" target="_blank"><img src="https://img.shields.io/badge/Twitter-1DA1F2?style=${badgeStyle}&logo=twitter&logoColor=white" alt="Twitter"/></a>\n`;
      }
      if (pfLink) {
        md += `  <a href="${pfLink}" target="_blank"><img src="https://img.shields.io/badge/Portfolio-FF5722?style=${badgeStyle}&logo=todoist&logoColor=white" alt="Portfolio"/></a>\n`;
      }
      if (lcLink) {
        md += `  <a href="${lcLink}" target="_blank"><img src="https://img.shields.io/badge/LeetCode-FFA116?style=${badgeStyle}&logo=leetcode&logoColor=black" alt="LeetCode"/></a>\n`;
      }
      if (cfLink) {
        md += `  <a href="${cfLink}" target="_blank"><img src="https://img.shields.io/badge/Codeforces-1F8ACB?style=${badgeStyle}&logo=codeforces&logoColor=white" alt="Codeforces"/></a>\n`;
      }
      if (ytLink) {
        md += `  <a href="${ytLink}" target="_blank"><img src="https://img.shields.io/badge/YouTube-FF0000?style=${badgeStyle}&logo=youtube&logoColor=white" alt="YouTube"/></a>\n`;
      }
      if (dcLink) {
        md += `  <a href="${dcLink}" target="_blank"><img src="https://img.shields.io/badge/Discord-5865F2?style=${badgeStyle}&logo=discord&logoColor=white" alt="Discord"/></a>\n`;
      }
      if (igLink) {
        md += `  <a href="${igLink}" target="_blank"><img src="https://img.shields.io/badge/Instagram-E4405F?style=${badgeStyle}&logo=instagram&logoColor=white" alt="Instagram"/></a>\n`;
      }
      if (medLink) {
        md += `  <a href="${medLink}" target="_blank"><img src="https://img.shields.io/badge/Medium-12100E?style=${badgeStyle}&logo=medium&logoColor=white" alt="Medium"/></a>\n`;
      }
      md += `</p>\n\n<br/>\n\n`;
    }

    // 6. Support & Donations
    const hasDonations = supportBmc.trim() || supportKofi.trim() || supportPaypal.trim() || supportPatreon.trim();
    if (hasDonations) {
      md += `## 💖 Support & Donations\n\n<p align="left">\n`;
      if (supportBmc.trim()) {
        const bmcUser = supportBmc.trim().replace(/https?:\/\/(www\.)?buymeacoffee\.com\//i, "");
        md += `  <a href="https://buymeacoffee.com/${bmcUser}" target="_blank"><img src="https://img.shields.io/badge/Buy_Me_a_Coffee-FFDD00?style=${badgeStyle}&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee"/></a>\n`;
      }
      if (supportKofi.trim()) {
        const kofiUser = supportKofi.trim().replace(/https?:\/\/(www\.)?ko-fi\.com\//i, "");
        md += `  <a href="https://ko-fi.com/${kofiUser}" target="_blank"><img src="https://img.shields.io/badge/Ko--fi-F16061?style=${badgeStyle}&logo=ko-fi&logoColor=white" alt="Ko-fi"/></a>\n`;
      }
      if (supportPaypal.trim()) {
        const paypalUser = supportPaypal.trim().replace(/https?:\/\/(www\.)?paypal\.me\//i, "");
        md += `  <a href="https://paypal.me/${paypalUser}" target="_blank"><img src="https://img.shields.io/badge/PayPal-00457C?style=${badgeStyle}&logo=paypal&logoColor=white" alt="PayPal"/></a>\n`;
      }
      if (supportPatreon.trim()) {
        const patreonUser = supportPatreon.trim().replace(/https?:\/\/(www\.)?patreon\.com\//i, "");
        md += `  <a href="https://patreon.com/${patreonUser}" target="_blank"><img src="https://img.shields.io/badge/Patreon-F96854?style=${badgeStyle}&logo=patreon&logoColor=white" alt="Patreon"/></a>\n`;
      }
      md += `</p>\n\n<br/>\n\n`;
    }

    // 7. Fun Components (Quotes & Jokes)
    if (showQuote || showJoke) {
      md += `## 💡 Dev Insight & Humor\n\n`;
      if (showQuote) {
        md += `<p align="center">\n  <img src="https://quotes-github-readme.vercel.app/api?type=horizontal&theme=${statsTheme}" alt="Dev Quote" />\n</p>\n\n`;
      }
      if (showJoke) {
        md += `<p align="center">\n  <img src="https://readme-jokes.vercel.app/api?theme=${statsTheme}" alt="Random Dev Joke" />\n</p>\n\n`;
      }
    }

    return md;
  }, [
    titleGreeting, name, subtitle, headerStyle, username, showVisitorBadge, workingOn, workingOnUrl,
    learning, collaboratingOn, helpWith, askMe, reachMe, funFact, selectedSkills, badgeStyle,
    showStatsCard, showTopLangs, showStreakCard, showTrophy, statsTheme, socialGithub, socialLinkedin,
    socialTwitter, socialPortfolio, socialLeetcode, socialCodeforces, socialYoutube, socialDiscord,
    socialInstagram, socialMedium, supportBmc, supportKofi, supportPaypal, supportPatreon, showQuote, showJoke
  ]);

  // A new distinct README configuration starts a fresh logical attempt.
  useEffect(() => {
    attemptIdRef.current = quota.newRequestId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedMarkdown]);

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

  const syncToProfile = async () => {
    try {
      const updates: Record<string, string> = {};
      const cleanGh = username.trim().replace(/https?:\/\/(www\.)?github\.com\//i, "").replace(/\/$/, "");
      if (cleanGh) updates.github = cleanGh;
      if (socialPortfolio.trim()) updates.portfolio = socialPortfolio.trim();
      if (socialLinkedin.trim()) updates.linkedin = socialLinkedin.trim();
      if (Object.keys(updates).length > 0) {
        await api.put("/profile/me", updates);
      }
    } catch {
      // Non-blocking sync
    }
  };

  const handleCopyCode = async () => {
    if (!(await ensureQuotaForCurrentVersion())) return;
    navigator.clipboard.writeText(generatedMarkdown);
    setCopied(true);
    toast.success("README.md copied to clipboard!");
    syncToProfile();
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
    syncToProfile();
  };

  // Filter skills by search query
  const filteredCategories = useMemo(() => {
    if (!skillSearch.trim()) return SKILL_CATEGORIES;
    const q = skillSearch.toLowerCase();
    return SKILL_CATEGORIES.map(cat => ({
      ...cat,
      skills: cat.skills.filter(s => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    })).filter(cat => cat.skills.length > 0);
  }, [skillSearch]);

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
        <div className="lg:col-span-5 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] overflow-x-auto">
            {([
              { id: "header" as const, label: "Header", icon: User },
              { id: "work" as const, label: "About & Bio", icon: Sparkles },
              { id: "skills" as const, label: "Tech Stack", icon: Cpu },
              { id: "stats" as const, label: "GitHub Cards", icon: BarChart2 },
              { id: "social" as const, label: "Social Links", icon: Globe },
              { id: "support" as const, label: "Support & Fun", icon: Heart }
            ] satisfies { id: PortfolioTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[]).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
            {/* TAB 1: HEADER */}
            {activeTab === "header" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <User size={16} className="text-amber-500" />
                  Header & Profile Info
                </h3>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[var(--text-secondary)]">GitHub Username</label>
                    <span className="text-[10px] text-[var(--text-secondary)]">Press Enter or click Fetch to auto-fill</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          fetchGithubDetails();
                        }
                      }}
                      placeholder="e.g. octocat or profile URL"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => fetchGithubDetails()}
                      disabled={loadingGithub || !username.trim()}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      <RefreshCw size={12} className={loadingGithub ? "animate-spin" : ""} />
                      {loadingGithub ? "Fetching..." : "Fetch Details"}
                    </button>
                  </div>

                  {githubFetched && (
                    <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {githubAvatar ? (
                            <img src={githubAvatar} alt="GitHub avatar" className="w-10 h-10 rounded-full border-2 border-amber-500/40 shadow-sm" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center font-bold text-amber-500">GH</div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[var(--text-primary)]">{name || username}</span>
                              <span className="text-[10px] text-amber-500 font-mono">@{username}</span>
                            </div>
                            <div className="text-[10px] text-[var(--text-secondary)] flex flex-wrap items-center gap-2 mt-0.5">
                              {githubUser?.company && <span>🏢 {githubUser.company}</span>}
                              {githubUser?.location && <span>📍 {githubUser.location}</span>}
                              {githubUser?.twitter_username && <span>🐦 @{githubUser.twitter_username}</span>}
                              {githubUser?.blog && <span>🌐 {githubUser.blog.replace(/^https?:\/\//, "")}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 whitespace-nowrap">
                          Synced
                        </span>
                      </div>

                      {githubUser?.bio && (
                        <p className="text-[11px] text-[var(--text-secondary)] italic pl-2 border-l-2 border-amber-500/40">
                          &ldquo;{githubUser.bio}&rdquo;
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-[var(--text-secondary)] pt-2 border-t border-amber-500/10">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <strong className="text-[var(--text-primary)]">{githubStats?.publicRepos ?? 0}</strong> Repos
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-[var(--bg-dark)] border border-[var(--border-color)]">
                          <strong className="text-[var(--text-primary)]">{githubStats?.followers ?? 0}</strong> Followers
                        </span>
                        {githubUser?.following !== undefined && (
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-dark)] border border-[var(--border-color)]">
                            <strong className="text-[var(--text-primary)]">{githubUser.following}</strong> Following
                          </span>
                        )}
                        {selectedSkills.length > 0 && (
                          <span className="ml-auto text-amber-500 font-bold flex items-center gap-1">
                            <Sparkles size={11} /> {selectedSkills.length} Skills Auto-Detected
                          </span>
                        )}
                      </div>
                    </div>
                  )}
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
                    placeholder="Your Name"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Subtitle / Role</label>
                  <textarea
                    rows={2}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="e.g. Java Developer | Spring Boot Enthusiast | Problem Solver"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Header Banner Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { id: "clean", label: "Simple Text" },
                      { id: "typing", label: "Typing SVG" },
                      { id: "wave", label: "Wave Banner" }
                    ] as const).map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setHeaderStyle(style.id)}
                        className={`p-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                          headerStyle === style.id
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            : "bg-[var(--bg-dark)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-amber-500/20"
                        }`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] cursor-pointer hover:border-amber-500/20">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Show Profile Views Counter Badge</span>
                  <input
                    type="checkbox"
                    checked={showVisitorBadge}
                    onChange={(e) => setShowVisitorBadge(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                </label>
              </div>
            )}

            {/* TAB 2: ABOUT & BIO */}
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
                    placeholder="e.g. Scalable Java Microservices & Cloud Architectures"
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
                    placeholder="e.g. System Design, Apache Kafka, Distributed Caching"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">👯 Looking to collaborate on</label>
                  <input
                    type="text"
                    value={collaboratingOn}
                    onChange={(e) => setCollaboratingOn(e.target.value)}
                    placeholder="e.g. Open-source backend libraries, developer tools"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">🤝 Looking for help with</label>
                  <input
                    type="text"
                    value={helpWith}
                    onChange={(e) => setHelpWith(e.target.value)}
                    placeholder="e.g. Distributed consensus algorithms & benchmarking"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">💬 Ask me about</label>
                  <input
                    type="text"
                    value={askMe}
                    onChange={(e) => setAskMe(e.target.value)}
                    placeholder="e.g. Core Java, Spring Boot, Hibernate, SQL & REST APIs"
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
                    placeholder="e.g. I turn coffee into clean, robust code!"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            )}

            {/* TAB 3: TECH STACK */}
            {activeTab === "skills" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Cpu size={16} className="text-amber-500" />
                    Select Tech Stack ({selectedSkills.length} selected)
                  </h3>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[var(--text-secondary)] font-semibold">Badge Style:</span>
                    <select
                      value={badgeStyle}
                      onChange={(e) => setBadgeStyle(e.target.value as "for-the-badge" | "flat" | "flat-square")}
                      className="px-2 py-1 text-[11px] font-bold rounded-lg bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="for-the-badge">Badge (Large)</option>
                      <option value="flat">Flat</option>
                      <option value="flat-square">Flat Square</option>
                    </select>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={skillSearch}
                    onChange={(e) => setSkillSearch(e.target.value)}
                    placeholder="Filter skills (e.g. Java, Docker, React)..."
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {filteredCategories.map(category => {
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

            {/* TAB 4: GITHUB CARDS */}
            {activeTab === "stats" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <BarChart2 size={16} className="text-amber-500" />
                  GitHub Cards & Badges
                </h3>

                <div>
                  <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1.5">Theme</label>
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
                    { label: "Show Trophy Badges", state: showTrophy, setState: setShowTrophy }
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

            {/* TAB 5: SOCIAL LINKS */}
            {activeTab === "social" && (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Globe size={16} className="text-amber-500" />
                  Social Profiles & Contact Links
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">GitHub Username</label>
                    <input
                      type="text"
                      value={socialGithub}
                      onChange={(e) => setSocialGithub(e.target.value)}
                      placeholder="e.g. octocat"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">LinkedIn Profile</label>
                    <input
                      type="text"
                      value={socialLinkedin}
                      onChange={(e) => setSocialLinkedin(e.target.value)}
                      placeholder="e.g. in/username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Twitter / X Handle</label>
                    <input
                      type="text"
                      value={socialTwitter}
                      onChange={(e) => setSocialTwitter(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Portfolio URL</label>
                    <input
                      type="text"
                      value={socialPortfolio}
                      onChange={(e) => setSocialPortfolio(e.target.value)}
                      placeholder="https://yourportfolio.com"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">LeetCode Username</label>
                    <input
                      type="text"
                      value={socialLeetcode}
                      onChange={(e) => setSocialLeetcode(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Codeforces Username</label>
                    <input
                      type="text"
                      value={socialCodeforces}
                      onChange={(e) => setSocialCodeforces(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">YouTube Handle</label>
                    <input
                      type="text"
                      value={socialYoutube}
                      onChange={(e) => setSocialYoutube(e.target.value)}
                      placeholder="e.g. @yourchannel"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Discord Invite</label>
                    <input
                      type="text"
                      value={socialDiscord}
                      onChange={(e) => setSocialDiscord(e.target.value)}
                      placeholder="e.g. invite_code"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Instagram Username</label>
                    <input
                      type="text"
                      value={socialInstagram}
                      onChange={(e) => setSocialInstagram(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Medium Username</label>
                    <input
                      type="text"
                      value={socialMedium}
                      onChange={(e) => setSocialMedium(e.target.value)}
                      placeholder="e.g. @username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: SUPPORT & FUN COMPONENTS (GPRM) */}
            {activeTab === "support" && (
              <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Coffee size={16} className="text-amber-500" />
                  Donations & Support
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Buy Me a Coffee Username</label>
                    <input
                      type="text"
                      value={supportBmc}
                      onChange={(e) => setSupportBmc(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Ko-fi Username</label>
                    <input
                      type="text"
                      value={supportKofi}
                      onChange={(e) => setSupportKofi(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">PayPal Username</label>
                    <input
                      type="text"
                      value={supportPaypal}
                      onChange={(e) => setSupportPaypal(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-secondary)] block mb-1">Patreon Username</label>
                    <input
                      type="text"
                      value={supportPatreon}
                      onChange={(e) => setSupportPatreon(e.target.value)}
                      placeholder="e.g. username"
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)] space-y-2">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Laugh size={14} className="text-amber-500" />
                    Fun Profile Components
                  </h4>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] cursor-pointer hover:border-amber-500/20">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Show Random Developer Quote</span>
                    <input
                      type="checkbox"
                      checked={showQuote}
                      onChange={(e) => setShowQuote(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] cursor-pointer hover:border-amber-500/20">
                    <span className="text-xs font-bold text-[var(--text-primary)]">Show Random Programming Joke</span>
                    <input
                      type="checkbox"
                      checked={showJoke}
                      onChange={(e) => setShowJoke(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded"
                    />
                  </label>
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

function extractMediaItems(html: string): { href?: string; src: string; alt?: string }[] {
  const items: { href?: string; src: string; alt?: string }[] = [];

  // 1. Match <a ...><img .../></a> blocks regardless of attribute ordering
  const aRegex = /<a\s+([^>]+)>([\s\S]*?)<\/a>/gi;
  let aMatch;
  while ((aMatch = aRegex.exec(html)) !== null) {
    const aAttrs = aMatch[1];
    const aContent = aMatch[2];
    const hrefMatch = aAttrs.match(/href=["']([^"']+)["']/i);
    const imgMatch = aContent.match(/<img\s+([^>]+)>/i);
    if (imgMatch) {
      const imgAttrs = imgMatch[1];
      const srcMatch = imgAttrs.match(/src=["']([^"']+)["']/i);
      const altMatch = imgAttrs.match(/alt=["']([^"']*)["']/i);
      if (srcMatch) {
        items.push({
          href: hrefMatch ? hrefMatch[1] : undefined,
          src: srcMatch[1],
          alt: altMatch ? altMatch[1] : "badge",
        });
      }
    }
  }

  // Remove matched <a> tags so inner images are not matched again
  const htmlWithoutA = html.replace(/<a\s+[^>]*>[\s\S]*?<\/a>/gi, " ");

  // 2. Match standalone <img ...> tags
  const imgRegex = /<img\s+([^>]+)>/gi;
  let imgMatch;
  while ((imgMatch = imgRegex.exec(htmlWithoutA)) !== null) {
    const imgAttrs = imgMatch[1];
    const srcMatch = imgAttrs.match(/src=["']([^"']+)["']/i);
    const altMatch = imgAttrs.match(/alt=["']([^"']*)["']/i);
    if (srcMatch) {
      items.push({
        src: srcMatch[1],
        alt: altMatch ? altMatch[1] : "image",
      });
    }
  }

  // 3. Match markdown links with images: [![alt](src)](href)
  const mdLinkRegex = /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g;
  let mdLinkMatch;
  while ((mdLinkMatch = mdLinkRegex.exec(html)) !== null) {
    items.push({
      alt: mdLinkMatch[1] || "badge",
      src: mdLinkMatch[2],
      href: mdLinkMatch[3],
    });
  }

  // 4. Match standalone markdown images: ![alt](src)
  const mdImgRegex = /(?<!\[)!\[([^\]]*)\]\(([^)]+)\)(?!\))/g;
  let mdImgMatch;
  while ((mdImgMatch = mdImgRegex.exec(html)) !== null) {
    items.push({
      alt: mdImgMatch[1] || "image",
      src: mdImgMatch[2],
    });
  }

  return items;
}

function ReadmeMediaItem({ item }: { item: { href?: string; src: string; alt?: string } }) {
  const [loadFailed, setLoadFailed] = useState(false);

  const isBadge = item.src.includes("img.shields.io") || item.src.includes("badge");
  const isCard =
    item.src.includes("github-readme-stats") ||
    item.src.includes("streak") ||
    item.src.includes("quotes") ||
    item.src.includes("jokes") ||
    item.src.includes("trophy") ||
    item.src.includes("capsule-render");

  let content: React.ReactNode;

  if (loadFailed) {
    if (isBadge) {
      content = (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {item.alt || "Skill Badge"}
        </span>
      );
    } else if (isCard) {
      content = (
        <div className="inline-flex flex-col items-center justify-center p-3 m-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] min-w-[200px] shadow-sm">
          <span className="font-semibold text-[var(--text-primary)]">{item.alt || "GitHub Analytics"}</span>
          <span className="text-[10px] text-amber-500/80 mt-0.5">Live GitHub card active in README</span>
        </div>
      );
    } else {
      content = null;
    }
  } else {
    content = (
      <img
        src={item.src}
        alt={item.alt || "badge"}
        referrerPolicy="no-referrer"
        loading="lazy"
        className="max-w-full h-auto inline-block rounded transition-transform hover:scale-105"
        onError={() => setLoadFailed(true)}
      />
    );
  }

  if (!content) return null;

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block transition-transform hover:scale-105 focus:outline-none"
      >
        {content}
      </a>
    );
  }

  return <>{content}</>;
}

function GithubReadmePreview({ markdown }: { markdown: string }) {
  if (!markdown || !markdown.trim()) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[440px] text-center p-8 text-[var(--text-secondary)] space-y-3">
        <GithubIcon className="w-12 h-12 text-amber-500/40" />
        <p className="text-sm font-bold text-[var(--text-primary)]">Live README Preview</p>
        <p className="text-xs max-w-sm">
          Fill in your details or fetch your GitHub account on the left to see your GitHub Profile README rendered live here!
        </p>
      </div>
    );
  }

  // Normalize line breaks and split attached HTML blocks into separate lines
  const normalized = markdown
    .replace(/\r\n/g, "\n")
    .replace(/(<\/h[1-6]>)\s*(<h[1-6]|<p|##|- )/gi, "$1\n$2")
    .replace(/(<\/p>)\s*(<h[1-6]|<p|##|- )/gi, "$1\n$2")
    .replace(/(<br\s*\/?>)\s*(<h[1-6]|<p|##|- )/gi, "$1\n$2");

  // Pre-process markdown to collapse <p ...>...</p> blocks into single custom tokens
  const processed = normalized.replace(
    /<p(?:\s+align=["']([^"']+)["'])?[^>]*>([\s\S]*?)<\/p>/gi,
    (_, align, inner) => {
      const singleLineInner = inner.replace(/\n\s*/g, " ").trim();
      return `\n%%P_BLOCK%%${align || "left"}%%${singleLineInner}%%END_P_BLOCK%%\n`;
    }
  );

  const lines = processed.split("\n");

  return (
    <div className="space-y-4 font-sans text-xs text-[var(--text-primary)] leading-relaxed overflow-x-auto p-4 rounded-xl bg-[var(--bg-dark)]/40 border border-[var(--border-color)]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "<br/>" || trimmed === "<br>") return <div key={idx} className="h-1.5" />;
        if (trimmed === "---" || trimmed === "***" || trimmed === "<hr/>" || trimmed === "<hr>") {
          return <hr key={idx} className="my-4 border-[var(--border-color)] opacity-60" />;
        }

        // P_BLOCK for badges, images, and links
        if (trimmed.startsWith("%%P_BLOCK%%") && trimmed.endsWith("%%END_P_BLOCK%%")) {
          const match = trimmed.match(/^%%P_BLOCK%%([^%]+)%%([\s\S]*?)%%END_P_BLOCK%%$/);
          if (match) {
            const align = match[1].toLowerCase();
            const inner = match[2];
            const items = extractMediaItems(inner);

            if (items.length > 0) {
              return (
                <div
                  key={idx}
                  className={`flex flex-wrap items-center gap-2.5 my-3 ${
                    align === "center" ? "justify-center text-center" : align === "right" ? "justify-end text-right" : "justify-start text-left"
                  }`}
                >
                  {items.map((item, itemIdx) => (
                    <ReadmeMediaItem key={itemIdx} item={item} />
                  ))}
                </div>
              );
            }

            // Fallback for text-only <p>
            const textContent = inner.replace(/<[^>]*>/g, "").trim();
            if (textContent) {
              return (
                <p
                  key={idx}
                  className={`my-2 text-xs text-[var(--text-secondary)] ${
                    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {textContent}
                </p>
              );
            }
          }
          return null;
        }

        // Header 1: <h1 align="center">...</h1> or # ...
        if (trimmed.startsWith("<h1") || trimmed.startsWith("# ")) {
          const content = trimmed.replace(/<[^>]*>/g, "").replace(/^#\s*/, "").trim();
          if (!content) return null;
          return (
            <h1 key={idx} className="text-2xl md:text-3xl font-extrabold text-center my-4 text-[var(--text-primary)] tracking-tight">
              {content}
            </h1>
          );
        }

        // Header 3: <h3 align="center">...</h3> or ### ...
        if (trimmed.startsWith("<h3") || trimmed.startsWith("### ")) {
          const content = trimmed.replace(/<[^>]*>/g, "").replace(/^###?\s*/, "").trim();
          if (!content) return null;
          return (
            <h3 key={idx} className="text-sm md:text-base font-semibold text-center my-2 text-[var(--text-secondary)]">
              {content}
            </h3>
          );
        }

        // Header 2: ## 🚀 About Me / ## 🛠️ Tech Stack & Skills / ## 📊 GitHub Analytics / etc.
        if (trimmed.startsWith("## ")) {
          const content = trimmed.replace(/^##\s*/, "").trim();
          return (
            <h2 key={idx} className="text-base font-bold my-4 pb-2 border-b border-[var(--border-color)] text-[var(--text-primary)] flex items-center gap-2">
              {content}
            </h2>
          );
        }

        // Bullet point lines (- 🔭 I’m currently working on...)
        if (trimmed.startsWith("- ")) {
          const content = trimmed.slice(2).trim();
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
                        <a key={pIdx} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-amber-500 font-bold underline hover:text-amber-400">
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

        // Standalone images / links not wrapped in <p>
        if (trimmed.includes("<img") || trimmed.includes("<a") || trimmed.includes("![") || trimmed.includes("[![")) {
          const items = extractMediaItems(trimmed);
          if (items.length > 0) {
            return (
              <div key={idx} className="flex flex-wrap items-center gap-2.5 my-2">
                {items.map((item, itemIdx) => (
                  <ReadmeMediaItem key={itemIdx} item={item} />
                ))}
              </div>
            );
          }
        }

        // Filter out leftover HTML open/close tags
        if (/^<\/?(p|div|br|span|section)[^>]*>$/i.test(trimmed)) {
          return null;
        }

        return <div key={idx} className="text-xs text-[var(--text-secondary)]">{trimmed}</div>;
      })}
    </div>
  );
}

export default GithubPortfolioView;
