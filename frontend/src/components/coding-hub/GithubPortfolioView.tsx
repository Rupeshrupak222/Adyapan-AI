"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  BarChart3,
  FileText,
  Layout,
  Briefcase,
  Rocket,
  History,
  Palette,
  Settings,
  Sparkles,
  Loader2,
  Star,
  GitFork,
  GitCommit,
  Globe,
  Eye,
  Copy,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Bot,
  Send,
  TrendingUp,
  Search,
  Heart,
  GripVertical,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  Zap,
  Shield,
  Wand2,
  GraduationCap,
  Trophy,
  Mail,
  Package,
  Award,
  Target,
  RotateCcw,
  CopyPlus,
  Trash2,
  Check,
  MessageCircle,
  X,
  BrainCircuit,
  Clock,
  FolderTree,
  Plus,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { renderMarkdown } from "@/utils/renderMarkdown";
import { ChatBackground } from "@/components/ady-chat/ChatBackground";
import Editor from "@monaco-editor/react";
import confetti from "canvas-confetti";
import CountUp from "react-countup";
import { cn } from "@/lib/cn";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { PremiumButton, AnimatedSkeleton, SettingsToggle } from "@/components/ui/PremiumComponents";
import { downloadZip } from "@/utils/zip";
import { jsPDF } from "jspdf";

// ─── Inline Github Icon ───────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────────────────

interface RepoItem {
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

interface SkillGroup {
  category: string;
  items: string[];
  level: number;
}

interface GithubAnalysis {
  summary: string;
  careerSummary: string;
  techStack: string[];
  skillMatrix: SkillGroup[];
  estimatedCommits: number;
  estimatedStars: number;
  topLanguages: string[];
  languageDistribution: { name: string; pct: number }[];
  keyProjects: RepoItem[];
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

interface PortfolioData {
  title?: string;
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
  skills?: SkillGroup[];
  experience?: { role: string; company: string; period: string; summary?: string }[];
  education?: { degree: string; institution: string; period: string }[];
  achievements?: string[];
  projectsToHighlight: {
    title: string;
    tech: string;
    summary: string;
    stars?: number;
    githubUrl?: string;
  }[];
  contact?: {
    email?: string;
    github?: string;
    linkedin?: string;
  };
}

interface RecommendResponse {
  projectRanking: { name: string; rank: number; reason: string }[];
  strongProjects: { name: string; strength: string }[];
  weakProjects: { name: string; weakness: string; fix: string }[];
  missingReadmes: string[];
  missingTopics: string[];
  portfolioCompleteness: string;
  atsScore: number;
  resumeMatch: string;
}

interface HistoryBundle {
  profiles: { id: string; username: string; stars: number; commits: number; languages: unknown; createdAt: string }[];
  readmes: { id: string; projectName: string; content: string; createdAt: string }[];
  portfolios: { id: string; title: string; theme: string; content: PortfolioData; isPublished: boolean; url: string; createdAt: string }[];
}

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

type SectionId =
  | "profile"
  | "analysis"
  | "readme"
  | "portfolio"
  | "resume"
  | "deploy"
  | "history"
  | "templates"
  | "settings";

type PreviewMode = "readme" | "portfolio" | "deploy";
type Device = "desktop" | "tablet" | "mobile";

// ─── Theme definitions ───────────────────────────────────────────────────────

interface ThemeDef {
  id: string;
  name: string;
  desc: string;
  bg: string;
  text: string;
  accent: string;
  accentText: string;
  card: string;
  border: string;
  font: string;
  swatch: string;
}

const THEMES: ThemeDef[] = [
  { id: "minimal", name: "Minimal", desc: "Clean & airy", bg: "#fafafa", text: "#111111", accent: "#111111", accentText: "#ffffff", card: "#f4f4f5", border: "#e4e4e7", font: "Inter", swatch: "linear-gradient(135deg,#ffffff,#e4e4e7)" },
  { id: "modern", name: "Modern", desc: "Gradient & bold", bg: "#0b0b14", text: "#f8fafc", accent: "#f59e0b", accentText: "#000000", card: "rgba(245,158,11,0.05)", border: "rgba(245,158,11,0.22)", font: "Outfit", swatch: "linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)" },
  { id: "glassmorphism", name: "Glassmorphism", desc: "Frosted glass", bg: "#0f172a", text: "#e2e8f0", accent: "#38bdf8", accentText: "#06283d", card: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.16)", font: "Inter", swatch: "linear-gradient(135deg,#0f172a,#38bdf8)" },
  { id: "developer", name: "Developer", desc: "Terminal vibe", bg: "#0d1117", text: "#c9d1d9", accent: "#58a6ff", accentText: "#0d1117", card: "#161b22", border: "#30363d", font: "ui-monospace, monospace", swatch: "linear-gradient(135deg,#0d1117,#58a6ff)" },
  { id: "corporate", name: "Corporate", desc: "Trust & polish", bg: "#f8fafc", text: "#0f172a", accent: "#2563eb", accentText: "#ffffff", card: "#ffffff", border: "#e2e8f0", font: "Inter", swatch: "linear-gradient(135deg,#e2e8f0,#2563eb)" },
  { id: "startup", name: "Startup", desc: "Playful & vibrant", bg: "#fff7ed", text: "#431407", accent: "#f97316", accentText: "#ffffff", card: "#ffedd5", border: "#fed7aa", font: "Outfit", swatch: "linear-gradient(135deg,#fed7aa,#f97316)" },
  { id: "cyberpunk", name: "Cyberpunk", desc: "Neon noir", bg: "#0a0118", text: "#f0abfc", accent: "#22d3ee", accentText: "#0a0118", card: "rgba(34,211,238,0.06)", border: "rgba(240,171,252,0.28)", font: "Outfit", swatch: "linear-gradient(135deg,#f0abfc,#22d3ee)" },
  { id: "creative", name: "Creative", desc: "Artistic flair", bg: "#ffffff", text: "#292524", accent: "#ec4899", accentText: "#ffffff", card: "#fdf2f8", border: "#fbcfe8", font: "Inter", swatch: "linear-gradient(135deg,#fbcfe8,#ec4899)" },
];

const PORTFOLIO_SECTIONS: { id: string; label: string; icon: React.ComponentType<any>; desc: string }[] = [
  { id: "hero", label: "Hero", icon: Sparkles, desc: "Name, tagline & bio" },
  { id: "about", label: "About", icon: User, desc: "Your story" },
  { id: "skills", label: "Skills", icon: Layers, desc: "Tech stack matrix" },
  { id: "projects", label: "Projects", icon: FolderTree, desc: "Featured repos" },
  { id: "experience", label: "Experience", icon: Briefcase, desc: "Work history" },
  { id: "education", label: "Education", icon: GraduationCap, desc: "Academics" },
  { id: "achievements", label: "Achievements", icon: Trophy, desc: "Awards & wins" },
  { id: "blog", label: "Blogs", icon: FileText, desc: "Articles & posts" },
  { id: "activity", label: "GitHub Activity", icon: GitCommit, desc: "Contribution graph" },
  { id: "contact", label: "Contact", icon: Mail, desc: "Links & email" },
];

const README_TEMPLATES = [
  "Modern Showcase",
  "Minimalist Developer",
  "Full-Stack Enterprise",
  "Open Source Library",
  "Recruiter-Friendly",
];

const README_SECTION_LIBRARY = [
  "Header",
  "Badges",
  "Table of Contents",
  "Features",
  "Tech Stack",
  "Installation",
  "Usage",
  "API Reference",
  "Screenshots",
  "Contributing",
  "License",
  "Support",
];

const AI_STEPS = [
  "Connecting to GitHub API",
  "Fetching profile & repositories",
  "Analyzing languages & activity",
  "Scoring project quality",
  "Generating developer profile",
  "Crafting AI recommendations",
];

const CHAT_SUGGESTIONS: { label: string; action: string }[] = [
  { label: "Improve my README", action: "improve-readme" },
  { label: "Rank my projects", action: "rank-projects" },
  { label: "Better project descriptions", action: "descriptions" },
  { label: "Generate better About section", action: "about" },
  { label: "Recruiter-friendly portfolio", action: "recruiter" },
];

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  "Jupyter Notebook": "#DA5B0B",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  R: "#198CE7",
  Markdown: "#083fa1",
};

const NAV_ITEMS: { id: SectionId; label: string; icon: React.ComponentType<any>; desc: string }[] = [
  { id: "profile", label: "GitHub Profile", icon: User, desc: "Connect & verify" },
  { id: "analysis", label: "Repository Analysis", icon: BarChart3, desc: "AI deep-dive" },
  { id: "readme", label: "README Generator", icon: FileText, desc: "AI chat builder" },
  { id: "portfolio", label: "Portfolio Generator", icon: Layout, desc: "Website studio" },
  { id: "resume", label: "Resume Sync", icon: Briefcase, desc: "Match your resume" },
  { id: "deploy", label: "Deploy", icon: Rocket, desc: "Ship it live" },
  { id: "history", label: "History", icon: History, desc: "Versions & rollback" },
  { id: "templates", label: "Templates", icon: Palette, desc: "Design themes" },
  { id: "settings", label: "AI Settings", icon: Settings, desc: "Preferences" },
];

const SECTION_META: Record<SectionId, { title: string; subtitle: string }> = {
  profile: { title: "Connect GitHub", subtitle: "Link your GitHub account to begin building your AI portfolio" },
  analysis: { title: "AI Repository Analysis", subtitle: "Your developer profile, skill matrix and project insights" },
  readme: { title: "AI README Studio", subtitle: "Chat with AI to craft a world-class README" },
  portfolio: { title: "Portfolio Builder", subtitle: "Design your developer website with AI" },
  resume: { title: "Resume Sync", subtitle: "Align your portfolio with your resume for ATS success" },
  deploy: { title: "Deploy", subtitle: "Publish your portfolio to the web in one click" },
  history: { title: "History", subtitle: "Every version of your work, saved and rewindable" },
  templates: { title: "Templates", subtitle: "Choose the perfect design language" },
  settings: { title: "AI Settings", subtitle: "Tune how the AI studio works for you" },
};

// ─── Small helpers ───────────────────────────────────────────────────────────

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

function SectionHeader({ section }: { section: SectionId }) {
  const meta = SECTION_META[section];
  const icon = NAV_ITEMS.find((n) => n.id === section)?.icon || Sparkles;
  const Icon = icon;
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center shadow-[0_4px_14px_rgba(245,158,11,0.35)]">
          <Icon size={15} />
        </div>
        <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
          {meta.title}
        </h2>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 ml-0.5">{meta.subtitle}</p>
    </div>
  );
}

function StatChip({ icon: Icon, label, value, accent = "#f59e0b" }: { icon: React.ComponentType<any>; label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/70 dark:bg-white/[0.03] border border-black/5 dark:border-white/5 backdrop-blur-sm">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}1a`, color: accent }}>
        <Icon size={14} />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-black text-slate-900 dark:text-white">{value}</div>
        <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      </div>
    </div>
  );
}

function AIThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-amber-500"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </span>
  );
}

function ProgressTimeline({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="space-y-2.5 w-full">
      {steps.map((step, idx) => {
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={step} className="flex items-center gap-3">
            {done ? (
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <Check size={11} strokeWidth={3} />
              </span>
            ) : active ? (
              <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/50 text-amber-400 flex items-center justify-center">
                <RefreshCw size={10} className="animate-spin" />
              </span>
            ) : (
              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/[0.04] border border-black/5 dark:border-white/5 text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center justify-center">
                {idx + 1}
              </span>
            )}
            <span
              className={cn(
                "text-xs transition-colors",
                done && "text-emerald-500/90 line-through dark:text-emerald-500/70",
                active && "text-amber-500 font-bold",
                !done && !active && "text-slate-500 dark:text-slate-400"
              )}
            >
              {step}
            </span>
            {active && <AIThinkingDots />}
          </div>
        );
      })}
    </div>
  );
}

function ContributionGraph({ values, accent }: { values: number[]; accent: string }) {
  const weeks = Math.min(52, Math.ceil(values.length / 7));
  const levels = ["#0b0b14", "#1a1f2e", "#3d4a2f", "#6b8f2f", "#9ad04b", "#a8e05c"];
  return (
    <div className="flex gap-[2px] overflow-hidden">
      {Array.from({ length: weeks }).map((_, w) => (
        <div key={w} className="flex flex-col gap-[2px] flex-1">
          {Array.from({ length: 7 }).map((_, d) => {
            const v = values[w * 7 + d] || 0;
            return (
              <div
                key={d}
                className="w-full aspect-square rounded-[2px]"
                style={{ background: levels[Math.min(v, 4) + 1], opacity: v === 0 ? 0.4 : 1 }}
              />
            );
          })}
        </div>
      ))}
      <div className="flex items-end justify-center px-1 pb-1">
        <span className="text-[8px] font-mono" style={{ color: accent }}>
          {new Date().getFullYear()}
        </span>
      </div>
    </div>
  );
}

// ─── Themed portfolio site (live preview) ────────────────────────────────────

function PortfolioSite({
  data,
  theme,
  sections,
  username,
}: {
  data: PortfolioData;
  theme: ThemeDef;
  sections: Record<string, boolean>;
  username: string;
}) {
  const s = theme;
  const t = {
    bg: s.bg,
    color: s.text,
    accent: s.accent,
    accentText: s.accentText,
    card: s.card,
    border: s.border,
    font: s.font,
  };
  const cardStyle: React.CSSProperties = { background: t.card, border: `1px solid ${t.border}`, borderRadius: 14 };
  const accentText = { color: t.accent };
  const hStyle = (size: number) => ({ fontSize: size, fontFamily: s.font });

  return (
    <div style={{ background: t.bg, color: t.color, fontFamily: s.font, minHeight: "100%" }} className="px-5 py-6 space-y-6">
      {sections.hero !== false && (
        <header className="text-center py-4 space-y-3">
          <div className="inline-block p-[3px] rounded-2xl mx-auto" style={{ background: `linear-gradient(135deg, ${t.accent}, transparent)` }}>
            <img
              src={`https://github.com/${username}.png`}
              alt={username}
              className="w-14 h-14 rounded-xl object-cover"
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
          </div>
          <h1 style={{ ...hStyle(22), fontWeight: 800, letterSpacing: "-0.02em" }}>{data.homeHero.tagline}</h1>
          <p className="text-xs leading-relaxed mx-auto max-w-md" style={{ color: `${t.color}cc` }}>
            {data.homeHero.bio}
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: t.accent, color: t.accentText }}>
              Explore Repositories
            </span>
            <span className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ border: `1px solid ${t.border}`, color: t.accent }}>
              Contact Me
            </span>
          </div>
        </header>
      )}

      {sections.hero !== false && data.stats && (
        <div className="grid grid-cols-3 gap-2 text-center p-3" style={cardStyle}>
          {[
            { v: data.stats.yearsExp || "3+ Years", l: "Experience" },
            { v: data.stats.projectsCompleted || "20+ Repos", l: "Projects" },
            { v: data.stats.contributions || "1,000+ Commits", l: "Contributions" },
          ].map((st, i) => (
            <div key={i}>
              <div className="text-sm font-black" style={accentText}>{st.v}</div>
              <div className="text-[8px] uppercase font-semibold tracking-wider" style={{ color: `${t.color}99` }}>{st.l}</div>
            </div>
          ))}
        </div>
      )}

      {sections.about !== false && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold" style={accentText}>About</h2>
          <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: `${t.color}cc` }}>
            {data.aboutSection}
          </p>
        </section>
      )}

      {sections.skills !== false && data.skills && data.skills.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold" style={accentText}>Skills</h2>
          <div className="grid gap-2">
            {data.skills.map((sk, i) => (
              <div key={i} className="p-3 space-y-1.5" style={cardStyle}>
                <div className="text-[10px] font-bold">{sk.category}</div>
                <div className="flex flex-wrap gap-1">
                  {sk.items.map((it, j) => (
                    <span key={j} className="px-2 py-0.5 rounded text-[9px] font-semibold" style={{ background: `${t.accent}1f`, color: t.accent }}>
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {sections.projects !== false && data.projectsToHighlight.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold" style={accentText}>Featured Projects</h2>
          <div className="grid grid-cols-2 gap-2">
            {data.projectsToHighlight.map((p, i) => (
              <div key={i} className="p-3 space-y-1.5" style={cardStyle}>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[11px] font-bold leading-tight">{p.title}</span>
                  {p.stars ? (
                    <span className="text-[9px] flex items-center gap-0.5 shrink-0" style={accentText}>
                      <Star size={8} fill="currentColor" /> {p.stars}
                    </span>
                  ) : null}
                </div>
                <p className="text-[9px] leading-relaxed line-clamp-2" style={{ color: `${t.color}aa` }}>{p.summary}</p>
                <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: `${t.accent}1f`, color: t.accent }}>
                  {p.tech}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {sections.experience !== false && data.experience && data.experience.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold" style={accentText}>Experience</h2>
          {data.experience.map((e, i) => (
            <div key={i} className="p-3 space-y-1" style={cardStyle}>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold">{e.role}</span>
                <span className="text-[8px]" style={{ color: `${t.color}88` }}>{e.period}</span>
              </div>
              <div className="text-[10px] font-semibold" style={accentText}>{e.company}</div>
              {e.summary && <p className="text-[9px]" style={{ color: `${t.color}aa` }}>{e.summary}</p>}
            </div>
          ))}
        </section>
      )}

      {sections.education !== false && data.education && data.education.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold" style={accentText}>Education</h2>
          {data.education.map((e, i) => (
            <div key={i} className="p-3 space-y-1" style={cardStyle}>
              <div className="text-[11px] font-bold">{e.degree}</div>
              <div className="text-[9px] flex justify-between">
                <span style={accentText}>{e.institution}</span>
                <span style={{ color: `${t.color}88` }}>{e.period}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {sections.achievements !== false && data.achievements && data.achievements.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold" style={accentText}>Achievements</h2>
          <div className="space-y-1">
            {data.achievements.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <Trophy size={10} style={accentText} className="mt-0.5 shrink-0" />
                <span style={{ color: `${t.color}bb` }}>{a}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {sections.activity !== false && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold" style={accentText}>GitHub Activity</h2>
          <div className="p-3" style={cardStyle}>
            <ContributionGraph values={[0, 0, 2, 3, 0, 1, 0, 0, 2, 4, 1, 0, 0, 3, 0, 2, 1, 0, 4, 0, 2, 1, 0, 3, 2, 0, 1, 0, 0, 2, 4, 1, 3, 0, 0, 1, 2, 0, 0, 3, 1, 4, 0, 2, 0, 1, 3, 0, 2, 0, 4, 1]} accent={t.accent} />
          </div>
        </section>
      )}

      {sections.contact !== false && (
        <section className="space-y-2 pt-2 border-t" style={{ borderColor: t.border }}>
          <h2 className="text-sm font-bold" style={accentText}>Contact</h2>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {data.contact?.email && (
              <a href={`mailto:${data.contact.email}`} className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={cardStyle}>
                <Mail size={10} /> {data.contact.email}
              </a>
            )}
            {data.contact?.github && (
              <a href={data.contact.github} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={cardStyle}>
                <Github size={10} /> GitHub
              </a>
            )}
            {data.contact?.linkedin && (
              <a href={data.contact.linkedin} target="_blank" rel="noreferrer" className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5" style={cardStyle}>
                <ExternalLink size={10} /> LinkedIn
              </a>
            )}
          </div>
        </section>
      )}

      <footer className="text-center text-[9px] pt-2" style={{ color: `${t.color}77` }}>
        Crafted with Adyapan AI Portfolio Studio
      </footer>
    </div>
  );
}

// ─── Standalone HTML builder (export / deploy / zip) ─────────────────────────

function buildStandaloneHtml(data: PortfolioData, themeId: string, username: string): string {
  const t = THEMES.find((th) => th.id === themeId) || THEMES[1];
  const esc = (v: string) =>
    (v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const card = `background:${t.card};border:1px solid ${t.border};border-radius:14px;`;
  const acc = `color:${t.accent}`;

  const skills = (data.skills || [])
    .map(
      (sk) => `<div style="${card}padding:14px;margin-bottom:10px">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px">${esc(sk.category)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${sk.items.map((it) => `<span style="background:${t.accent}22;color:${t.accent};padding:4px 10px;border-radius:8px;font-size:11px;font-weight:600">${esc(it)}</span>`).join("")}</div>
      </div>`
    )
    .join("");

  const projects = (data.projectsToHighlight || [])
    .map(
      (p) => `<div style="${card}padding:16px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:700;font-size:14px">${esc(p.title)}</span>${p.stars ? `<span style="${acc};font-size:12px;font-weight:700">★ ${p.stars}</span>` : ""}</div>
        <p style="font-size:12px;color:${t.text}aa;margin:0">${esc(p.summary)}</p>
        <span style="background:${t.accent}22;color:${t.accent};align-self:flex-start;padding:3px 9px;border-radius:6px;font-size:10px;font-weight:700">${esc(p.tech)}</span>
      </div>`
    )
    .join("");

  const experience = (data.experience || [])
    .map(
      (e) => `<div style="${card}padding:14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:13px"><span style="font-weight:700">${esc(e.role)}</span><span style="color:${t.text}88;font-size:11px">${esc(e.period)}</span></div>
        <div style="${acc};font-weight:600;font-size:12px;margin:4px 0">${esc(e.company)}</div>
        ${e.summary ? `<p style="font-size:11px;color:${t.text}aa;margin:0">${esc(e.summary)}</p>` : ""}
      </div>`
    )
    .join("");

  const education = (data.education || [])
    .map(
      (e) => `<div style="${card}padding:14px;margin-bottom:10px">
        <div style="font-weight:700;font-size:13px">${esc(e.degree)}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px"><span style="${acc}">${esc(e.institution)}</span><span style="color:${t.text}88">${esc(e.period)}</span></div>
      </div>`
    )
    .join("");

  const achievements = (data.achievements || [])
    .map((a) => `<div style="display:flex;gap:8px;font-size:12px;margin-bottom:6px;color:${t.text}bb"><span style="${acc}">🏆</span><span>${esc(a)}</span></div>`)
    .join("");

  const contactChips = [
    data.contact?.email ? `<a href="mailto:${esc(data.contact.email)}" style="${card}padding:9px 14px;font-size:11px;text-decoration:none;color:${t.text}">✉️ ${esc(data.contact.email)}</a>` : "",
    data.contact?.github ? `<a href="${esc(data.contact.github)}" target="_blank" rel="noreferrer" style="${card}padding:9px 14px;font-size:11px;text-decoration:none;color:${t.text}">GitHub</a>` : "",
    data.contact?.linkedin ? `<a href="${esc(data.contact.linkedin)}" target="_blank" rel="noreferrer" style="${card}padding:9px 14px;font-size:11px;text-decoration:none;color:${t.text}">LinkedIn</a>` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(data.homeHero.tagline || "Portfolio")}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:${t.bg}; color:${t.text}; font-family:${t.font}, -apple-system, sans-serif; min-height:100vh; padding:40px 20px; }
  .wrap { max-width: 820px; margin: 0 auto; }
  section { margin-bottom: 44px; }
  h2 { ${acc}; font-size:18px; margin-bottom:16px; letter-spacing:-0.02em; }
  header { text-align:center; padding:20px 0 40px; }
  .avatar { width:96px; height:96px; border-radius:24px; object-fit:cover; border:3px solid ${t.accent}; box-shadow:0 0 40px ${t.accent}44; }
  h1 { font-size:40px; font-weight:800; letter-spacing:-0.03em; margin:16px 0 10px; }
  .bio { color:${t.text}cc; font-size:15px; max-width:560px; margin:0 auto; line-height:1.6; }
  .cta { margin-top:20px; display:flex; gap:10px; justify-content:center; }
  .btn { padding:11px 22px; border-radius:12px; font-size:13px; font-weight:700; border:none; cursor:pointer; text-decoration:none; }
  .btn-solid { background:${t.accent}; color:${t.accentText}; }
  .btn-ghost { background:transparent; border:1px solid ${t.border}; color:${t.accent}; }
  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; text-align:center; ${card} padding:18px; }
  .stats b { ${acc}; font-size:20px; display:block; }
  .stats span { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:${t.text}88; }
  .grid2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px; }
  .about { color:${t.text}cc; line-height:1.7; font-size:14px; white-space:pre-wrap; }
  footer { text-align:center; color:${t.text}55; font-size:11px; margin-top:40px; padding-top:20px; border-top:1px solid ${t.border}; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <img class="avatar" src="https://github.com/${esc(username)}.png" alt="${esc(username)}" onerror="this.style.display='none'">
    <h1>${esc(data.homeHero.tagline)}</h1>
    <p class="bio">${esc(data.homeHero.bio)}</p>
    <div class="cta">
      <span class="btn btn-solid">Explore Repositories</span>
      <span class="btn btn-ghost">Contact Me</span>
    </div>
  </header>

  ${data.stats ? `<section><div class="stats">
    <div><b>${esc(data.stats.yearsExp || "3+ Years")}</b><span>Experience</span></div>
    <div><b>${esc(data.stats.projectsCompleted || "20+ Repos")}</b><span>Projects</span></div>
    <div><b>${esc(data.stats.contributions || "1,000+ Commits")}</b><span>Contributions</span></div>
  </div></section>` : ""}

  <section>
    <h2>About</h2>
    <p class="about">${esc(data.aboutSection)}</p>
  </section>

  ${skills ? `<section><h2>Skills</h2>${skills}</section>` : ""}
  ${experience ? `<section><h2>Experience</h2>${experience}</section>` : ""}
  ${education ? `<section><h2>Education</h2>${education}</section>` : ""}
  ${achievements ? `<section><h2>Achievements</h2>${achievements}</section>` : ""}
  ${projects ? `<section><h2>Featured Projects</h2><div class="grid2">${projects}</div></section>` : ""}

  ${contactChips ? `<section><h2>Contact</h2><div style="display:flex;gap:10px;flex-wrap:wrap">${contactChips}</div></section>` : ""}

  <footer>Crafted with Adyapan AI Portfolio Studio</footer>
</div>
</body>
</html>`;
}

// ─── Repo card ───────────────────────────────────────────────────────────────

function RepoCard({
  repo,
  index,
  selected,
  favorite,
  onToggleSelect,
  onToggleFavorite,
  onUseReadme,
  onOpen,
  onDragStart,
  onDragEnter,
  onDrop,
  isDragging,
  isPreviewTarget,
}: {
  repo: RepoItem;
  index: number;
  selected: boolean;
  favorite: boolean;
  onToggleSelect: () => void;
  onToggleFavorite: () => void;
  onUseReadme: () => void;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  isDragging: boolean;
  isPreviewTarget: boolean;
}) {
  const color = LANG_COLORS[repo.language] || "#8b949e";
  return (
    <motion.div
      layout
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      onDragEnd={onDrop}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative rounded-2xl overflow-hidden border transition-all cursor-pointer",
        isDragging && "opacity-40 scale-[0.98]",
        isPreviewTarget && "ring-2 ring-amber-500/50",
        selected
          ? "border-amber-500/50 bg-amber-500/[0.06] shadow-[0_0_24px_rgba(245,158,11,0.12)]"
          : "border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"
      )}
    >
      {/* Cover */}
      <div className="relative h-20 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${color}55, transparent 65%), linear-gradient(320deg, ${color}33, transparent 55%)` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
          <GripVertical size={13} className="text-white/50 opacity-0 group-hover:opacity-100 transition" />
          <span className="text-[10px] font-bold text-white/90 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {repo.language}
          </span>
        </div>
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black text-white bg-black/50 backdrop-blur border border-white/10">
            AI {repo.aiScore}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            className="p-1 rounded-lg bg-black/40 backdrop-blur border border-white/10 text-white/70 hover:text-rose-400 transition"
            title="Favorite"
          >
            <Heart size={12} fill={favorite ? "#fb7185" : "none"} className={favorite ? "text-rose-400" : ""} />
          </button>
        </div>
        <span className="absolute bottom-2 left-3 text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/50 backdrop-blur border border-white/10 text-white/85">
          {repo.category}
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-extrabold text-slate-200 truncate">{repo.name}</span>
        </div>
        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{repo.description}</p>

        {repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {repo.topics.slice(0, 4).map((tp) => (
              <span key={tp} className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] text-slate-400">
                {tp}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><Star size={10} className="text-amber-400" /> {repo.stars}</span>
          <span className="flex items-center gap-1"><GitFork size={10} className="text-slate-500" /> {repo.forks}</span>
          <span className="flex items-center gap-1"><Clock size={10} className="text-slate-500" /> {repo.updatedLabel}</span>
          {repo.forked && <span className="px-1 py-0.5 rounded bg-white/5 text-[8px]">fork</span>}
        </div>

        <div className="flex gap-1.5 pt-1">
          <button
            onClick={onUseReadme}
            className="flex-1 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-400 text-[10px] font-bold transition"
          >
            Analyze →
          </button>
          <button
            onClick={onToggleSelect}
            className={cn(
              "flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition",
              selected
                ? "bg-amber-500 text-black border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            )}
          >
            {selected ? "Selected" : "Select"}
          </button>
          <button
            onClick={onOpen}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Open on GitHub"
          >
            <ExternalLink size={12} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Device frame ────────────────────────────────────────────────────────────

function DeviceFrame({ device, children, isDark }: { device: Device; children: React.ReactNode; isDark: boolean }) {
  const width =
    device === "desktop" ? "100%" : device === "tablet" ? "min(100%, 768px)" : "min(100%, 390px)";
  return (
    <div className="flex justify-center py-6 px-2">
      <div
        className="rounded-2xl overflow-hidden shadow-2xl transition-all duration-500"
        style={{
          width,
          background: isDark ? "#09090f" : "#ffffff",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2 bg-black/70 border-b border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="ml-3 flex-1 max-w-xs px-2 py-0.5 rounded-md bg-white/5 text-[9px] text-slate-400 font-mono flex items-center gap-1">
            <Globe size={8} className="text-amber-400" /> portfolio.adyapan.ai
          </span>
        </div>
        <div className="max-h-[62vh] overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function GithubPortfolioView() {
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isTabletUp = useMediaQuery("(min-width: 768px)");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";

  // GitHub profile
  const [username, setUsername] = useState("");
  const [analysis, setAnalysis] = useState<GithubAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [showAnalysisScreen, setShowAnalysisScreen] = useState(false);

  // README builder
  const [projectName, setProjectName] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [templateStyle, setTemplateStyle] = useState("Modern Showcase");
  const [readmeSections, setReadmeSections] = useState<string[]>(["Features", "Tech Stack", "Installation", "Usage"]);
  const [readmeContent, setReadmeContent] = useState("");
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmePreviewEdit, setReadmePreviewEdit] = useState(false);

  // Portfolio builder
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [portfolioTheme, setPortfolioTheme] = useState("modern");
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [sectionsEnabled, setSectionsEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(PORTFOLIO_SECTIONS.map((s) => [s.id, true]))
  );

  // Repos selection
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"aiScore" | "stars" | "forks" | "updated">("aiScore");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [previewTarget, setPreviewTarget] = useState<number | null>(null);

  // Deploy
  const [githubPat, setGithubPat] = useState("");
  const [showPat, setShowPat] = useState(false);
  const [targetRepo, setTargetRepo] = useState("");
  const [filePath, setFilePath] = useState("index.html");
  const [deployPlatform, setDeployPlatform] = useState<"vercel" | "netlify" | "github-pages">("vercel");
  const [deploying, setDeploying] = useState(false);
  const [deployUrl, setDeployUrl] = useState("");
  const [pushLog, setPushLog] = useState<{ status: "success" | "error" | null; message: string; details?: string }>({
    status: null,
    message: "Ready to push to GitHub Pages.",
  });
  const [pushing, setPushing] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryBundle | null>(null);

  // Recommendations
  const [aiRecommendations, setAiRecommendations] = useState<RecommendResponse | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  // AI settings
  const [settings, setSettings] = useState({
    autoImprove: true,
    includeBadges: true,
    includeStats: true,
    includeSnake: true,
    atsOptimize: true,
    suggestOnAnalyze: true,
  });

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatThinking, setChatThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      text: "Hi! I'm your AI portfolio coach. Ask me to improve your README, rank your projects, or polish your portfolio.",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Preview
  const [previewMode, setPreviewMode] = useState<PreviewMode>("readme");
  const [device, setDevice] = useState<Device>("desktop");
  const [previewLight, setPreviewLight] = useState(false);

  // Sync theme
  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(t);
    const obs = new MutationObserver(() => setTheme(document.documentElement.getAttribute("data-theme") || "dark"));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Load saved username / PAT
  useEffect(() => {
    const savedUser = localStorage.getItem("adyapan-github-username");
    if (savedUser) setUsername(savedUser);
    const savedPat = localStorage.getItem("adyapan-github-pat");
    if (savedPat) setGithubPat(savedPat);
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-collapse side panels on small screens
  useEffect(() => {
    setSidebarOpen(isDesktop || isTabletUp);
    setPreviewOpen(isDesktop);
  }, [isDesktop, isTabletUp]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatThinking]);

  // ─── Analysis ──────────────────────────────────────────────────────────────

  const refreshHistory = async () => {
    try {
      const res = await api.get("/github/history");
      setHistory(res.data);
    } catch {
      /* history is best-effort */
    }
  };

  const handleAnalyze = async (goToAnalysis = true) => {
    if (!username.trim()) {
      toast.error("Enter a GitHub username first");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setAiRecommendations(null);
    setShowAnalysisScreen(true);
    setAiStep(0);

    const iv = window.setInterval(() => setAiStep((s) => Math.min(s + 1, AI_STEPS.length)), 620);

    try {
      const res = await api.post("/github/analyze", { username: username.trim() });
      window.clearInterval(iv);
      setAiStep(AI_STEPS.length);
      const data = res.data?.analysis;
      if (data) {
        setAnalysis(data);
        setSelectedRepos((data.keyProjects || []).map((r: RepoItem) => r.name).slice(0, 6));
        if (data.keyProjects?.length && !targetRepo) {
          setTargetRepo(`${username.trim()}/${data.keyProjects[0].name}`);
        }
        localStorage.setItem("adyapan-github-username", username.trim());
        toast.success(`Loaded profile @${username.trim()}`);
        setTimeout(() => {
          setShowAnalysisScreen(false);
          if (goToAnalysis) setActiveSection("analysis");
        }, 500);
        loadRecommendations(data);
        refreshHistory();
      } else {
        throw new Error("Analysis failed");
      }
    } catch (err: any) {
      window.clearInterval(iv);
      setShowAnalysisScreen(false);
      toast.error(err?.response?.data?.message || err?.message || "Failed to analyze GitHub profile");
    } finally {
      setAnalyzing(false);
    }
  };

  const loadRecommendations = async (analysisData?: GithubAnalysis) => {
    const source = analysisData || analysis;
    if (!source) return;
    setRecLoading(true);
    try {
      const res = await api.post("/github/recommend", { analysis: source });
      setAiRecommendations(res.data?.recommendations);
    } catch {
      /* recommendations are best-effort */
    } finally {
      setRecLoading(false);
    }
  };

  // ─── README ────────────────────────────────────────────────────────────────

  const handleUseRepoForReadme = (repo: RepoItem) => {
    setProjectName(repo.name);
    setProjectContext(`Language: ${repo.language || "TypeScript"}\nDescription: ${repo.description}`);
    setTargetRepo(`${username || "user"}/${repo.name}`);
    setActiveSection("readme");
    toast.info(`Selected "${repo.name}" for README studio`);
  };

  const handleGenerateReadme = async (extra?: { context?: string; style?: string; sections?: string[] }) => {
    if (!projectName.trim()) {
      toast.error("Enter a project name first");
      return;
    }
    setReadmeLoading(true);
    try {
      const res = await api.post("/github/readme", {
        projectName: projectName.trim(),
        extraContext: extra?.context || projectContext,
        templateStyle: extra?.style || templateStyle,
        sections: extra?.sections || readmeSections,
      });
      const data = res.data?.readmeContent;
      if (data) {
        setReadmeContent(data);
        setPreviewMode("readme");
        setPreviewOpen(true);
        toast.success("README generated by AI!");
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        refreshHistory();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to generate README");
    } finally {
      setReadmeLoading(false);
    }
  };

  const toggleReadmeSection = (s: string) => {
    setReadmeSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  // ─── Portfolio ─────────────────────────────────────────────────────────────

  const normalizePortfolio = (data: any): PortfolioData => ({
    title: data?.homeHero?.title || analysis?.name || portfolioTitle || username || "My Portfolio",
    homeHero: {
      title: data?.homeHero?.title || analysis?.name || username || "Software Engineer",
      tagline: data?.homeHero?.tagline || "Building High-Performance Scalable Web Applications",
      bio: data?.homeHero?.bio || analysis?.summary || "Passionate full-stack developer crafting modern software.",
      location: data?.homeHero?.location || analysis?.location || "Remote",
    },
    stats: data?.stats || {
      yearsExp: "3+ Years",
      projectsCompleted: `${analysis?.publicRepos || 15}+ Repositories`,
      contributions: `${analysis?.estimatedCommits || 850}+ Commits`,
    },
    aboutSection: data?.aboutSection || analysis?.careerSummary || analysis?.summary || "Experienced full-stack software engineer.",
    skills: data?.skills?.length
      ? data.skills
      : analysis?.skillMatrix?.length
      ? analysis.skillMatrix.map((s) => ({ category: s.category, items: s.items, level: s.level }))
      : [{ category: "Core Stack", items: analysis?.topLanguages?.length ? analysis.topLanguages : ["TypeScript", "React", "Node.js", "Python"], level: 80 }],
    experience: data?.experience || [],
    education: data?.education || [],
    achievements: data?.achievements || [],
    projectsToHighlight: data?.projectsToHighlight?.length
      ? data.projectsToHighlight
      : (analysis?.keyProjects || []).map((kp) => ({
          title: kp.name,
          tech: kp.language || "TypeScript",
          summary: kp.description,
          stars: kp.stars,
          githubUrl: kp.url,
        })),
    contact: data?.contact || {
      email: `${username}@users.noreply.github.com`,
      github: `https://github.com/${username}`,
      linkedin: "#",
    },
  });

  const handleBuildPortfolio = async () => {
    if (!analysis) {
      toast.error("Analyze a GitHub profile first");
      setActiveSection("profile");
      return;
    }
    setPortfolioLoading(true);
    try {
      const res = await api.post("/github/portfolio", {
        profileData: JSON.stringify(analysis),
        theme: portfolioTheme,
        title: portfolioTitle || analysis.name || username,
      });
      const normalized = normalizePortfolio(res.data);
      setPortfolio(normalized);
      setPortfolioTitle(normalized.title || "");
      setPreviewMode("portfolio");
      setDevice("desktop");
      setPreviewOpen(true);
      toast.success("Portfolio generated by AI!");
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      refreshHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to generate portfolio");
    } finally {
      setPortfolioLoading(false);
    }
  };

  // ─── Exports ───────────────────────────────────────────────────────────────

  const getStandaloneHtml = () => {
    const data = portfolio || normalizePortfolio({});
    return buildStandaloneHtml(data, portfolioTheme, username || "developer");
  };

  const downloadBlob = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportReadmeMd = () => {
    if (!readmeContent) return toast.error("No README to export");
    downloadBlob(readmeContent, `${projectName || "README"}.md`, "text/markdown;charset=utf-8");
    toast.success("README.md exported");
  };

  const copyReadme = () => {
    if (!readmeContent) return toast.error("No README to copy");
    navigator.clipboard.writeText(readmeContent);
    toast.success("README.md copied to clipboard!");
  };

  const exportPortfolioHtml = () => {
    downloadBlob(getStandaloneHtml(), `portfolio_${username || "developer"}.html`, "text/html;charset=utf-8");
    toast.success("Portfolio HTML exported");
  };

  const exportReadmePdf = () => {
    if (!readmeContent) return toast.error("No README to export");
    const pdf = new jsPDF();
    const lines = pdf.splitTextToSize(readmeContent, 180);
    pdf.text(lines, 15, 15);
    pdf.save(`${projectName || "README"}.pdf`);
    toast.success("PDF exported");
  };

  const exportPortfolioZip = (flavor: "static" | "react" | "nextjs") => {
    const html = getStandaloneHtml();
    const usernameSlug = username || "developer";
    const vercelJson = JSON.stringify(
      { $schema: "https://openapi.vercel.sh/vercel.json", outputDirectory: "." },
      null,
      2
    );
    const netlifyToml = `[build]\n  publish = "."\n\n[[redirects]]\n  from = "/*"\n  to = "/index.html"\n  status = 200\n`;

    const files: { name: string; content: string }[] = [];

    if (flavor === "static") {
      files.push({ name: "index.html", content: html });
      files.push({ name: "vercel.json", content: vercelJson });
      files.push({ name: "netlify.toml", content: netlifyToml });
      files.push({
        name: "README.md",
        content: `# ${portfolioTitle || username || "Developer"} Portfolio\n\nGenerated with Adyapan AI Portfolio Studio.\n\n## Deploy\n- **Vercel:** drag this folder into vercel.com\n- **Netlify:** drag this folder into app.netlify.com\n- **GitHub Pages:** push \`index.html\` to a repo named \`${usernameSlug}.github.io\`\n`,
      });
    } else if (flavor === "react") {
      files.push({
        name: "index.html",
        content: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${portfolioTitle || username || "Portfolio"}</title>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head><body><div id="root"></div>
<script type="text/babel" data-type="module" src="./src/App.jsx"></script>
</body></html>`,
      });
      files.push({
        name: "src/App.jsx",
        content: `import { PORTFOLIO, THEME } from "./data.js";

export default function App() {
  return (
    <main style={{ background: THEME.bg, color: THEME.text, minHeight: "100vh", fontFamily: "Inter, sans-serif", padding: "48px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ color: THEME.accent, fontSize: 40, fontWeight: 800 }}>{PORTFOLIO.homeHero.tagline}</h1>
        <p style={{ color: THEME.text + "cc" }}>{PORTFOLIO.homeHero.bio}</p>
        <h2 style={{ color: THEME.accent }}>Projects</h2>
        {PORTFOLIO.projectsToHighlight.map((p, i) => (
          <div key={i} style={{ background: THEME.card, border: "1px solid " + THEME.border, borderRadius: 14, padding: 16, margin: "12px 0" }}>
            <strong>{p.title}</strong> <span style={{ color: THEME.accent }}>{p.tech}</span>
            <p style={{ color: THEME.text + "aa" }}>{p.summary}</p>
          </div>
        ))}
      </div>
    </main>
  );
}`,
      });
      files.push({
        name: "src/data.js",
        content: `export const PORTFOLIO = ${JSON.stringify(portfolio || normalizePortfolio({}), null, 2)};\nexport const THEME = ${JSON.stringify(THEMES.find((t) => t.id === portfolioTheme), null, 2)};\n`,
      });
      files.push({ name: "README.md", content: "React portfolio generated with Adyapan AI Portfolio Studio. Open index.html in a browser or deploy to Vercel/Netlify." });
    } else {
      files.push({
        name: "package.json",
        content: JSON.stringify(
          {
            name: "ai-portfolio",
            version: "1.0.0",
            private: true,
            scripts: { dev: "next dev", build: "next build", start: "next start" },
            dependencies: { next: "14.2.3", react: "18.3.1", "react-dom": "18.3.1" },
          },
          null,
          2
        ),
      });
      files.push({
        name: "app/layout.js",
        content: `export const metadata = { title: "${portfolioTitle || username || "Portfolio"}" };\nexport default function RootLayout({ children }) { return (<html lang="en"><body style={{ margin: 0 }}>{children}</body></html>); }\n`,
      });
      files.push({
        name: "app/page.js",
        content: `"use client";\nimport { PORTFOLIO, THEME } from "./data";\nexport default function Page() { return (<main style={{ background: THEME.bg, color: THEME.text, minHeight: "100vh", padding: 48 }}><h1 style={{ color: THEME.accent, fontSize: 40 }}>{PORTFOLIO.homeHero.tagline}</h1><p>{PORTFOLIO.homeHero.bio}</p>{PORTFOLIO.projectsToHighlight.map((p, i) => <div key={i} style={{ background: THEME.card, border: "1px solid " + THEME.border, borderRadius: 14, padding: 16, margin: 12 }}><strong>{p.title}</strong> <span style={{ color: THEME.accent }}>{p.tech}</span><p>{p.summary}</p></div>)}</main>); }\n`,
      });
      files.push({
        name: "app/data.js",
        content: `export const PORTFOLIO = ${JSON.stringify(portfolio || normalizePortfolio({}), null, 2)};\nexport const THEME = ${JSON.stringify(THEMES.find((t) => t.id === portfolioTheme), null, 2)};\n`,
      });
      files.push({
        name: "vercel.json",
        content: JSON.stringify({ framework: "nextjs" }, null, 2),
      });
      files.push({
        name: "README.md",
        content: "Next.js portfolio generated with Adyapan AI Portfolio Studio.\n\n- `npm install`\n- `npm run dev`\n- deploy with Vercel\n",
      });
    }

    downloadZip(files, `portfolio-${usernameSlug}-${flavor}.zip`);
    toast.success(`${flavor === "nextjs" ? "Next.js" : flavor === "react" ? "React" : "Static"} source exported`);
  };

  // ─── Deploy ────────────────────────────────────────────────────────────────

  const handleDeploy = async () => {
    if (!portfolio) {
      toast.error("Generate a portfolio first");
      setActiveSection("portfolio");
      return;
    }
    setDeploying(true);
    try {
      const res = await api.post("/github/deploy", {
        platform: deployPlatform,
        username,
        title: portfolioTitle,
        targetRepo,
      });
      const url = res.data?.url || "";
      setDeployUrl(url);
      setPreviewMode("deploy");
      setPreviewOpen(true);
      if (deployPlatform === "github-pages") {
        toast.info("GitHub Pages selected — enter your PAT and push to publish");
      } else {
        toast.success("Deployment bundle ready to publish!");
        exportPortfolioZip("static");
      }
      refreshHistory();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to prepare deployment");
    } finally {
      setDeploying(false);
    }
  };

  const handlePushToGithub = async () => {
    const [owner, repoName] = targetRepo.split("/");
    if (!githubPat) return toast.error("Enter your GitHub PAT");
    if (!owner || !repoName) return toast.error("Repository must be in format owner/repo-name");
    const content = deployPlatform === "github-pages" ? getStandaloneHtml() : readmeContent;
    if (!content) return toast.error("Nothing to push yet");

    setPushing(true);
    setPushLog({ status: null, message: "Connecting to GitHub API..." });
    try {
      const res = await api.post("/github/push", {
        token: githubPat.trim(),
        owner: owner.trim(),
        repo: repoName.trim(),
        path: filePath.trim() || "index.html",
        content,
        message: `Deploy portfolio via Adyapan AI Studio`,
      });
      if (res.data?.success) {
        setPushLog({
          status: "success",
          message: `Deployed! ${deployUrl || `https://${owner}.github.io/${repoName}`}`,
          details: `[Commit] ${res.data.commit?.sha?.slice(0, 7) || "unknown"}\n[URL] ${deployUrl || `https://${owner}.github.io/${repoName}`}`,
        });
        localStorage.setItem("adyapan-github-pat", githubPat.trim());
        toast.success("Deployed to GitHub Pages!");
        confetti({ particleCount: 180, spread: 90, origin: { y: 0.5 } });
      } else {
        throw new Error(res.data?.error || "Push rejected");
      }
    } catch (error) {
      const msg =
        (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error ||
        (error as Error)?.message ||
        "Failed to push.";
      setPushLog({ status: "error", message: "Push failed", details: msg });
      toast.error("Deploy failed");
    } finally {
      setPushing(false);
    }
  };

  // ─── History ───────────────────────────────────────────────────────────────

  const handleSaveHistory = async (type: "readme" | "portfolio") => {
    try {
      if (type === "readme") {
        if (!readmeContent) return toast.error("No README to save");
        await api.post("/github/history/save", { type, projectName, content: readmeContent });
      } else {
        if (!portfolio) return toast.error("No portfolio to save");
        await api.post("/github/history/save", { type, content: portfolio, title: portfolioTitle, theme: portfolioTheme });
      }
      toast.success(`${type === "readme" ? "README" : "Portfolio"} saved to history`);
      refreshHistory();
    } catch {
      toast.error("Failed to save history");
    }
  };

  const handleDuplicateHistory = async (type: "readme" | "portfolio", id: string) => {
    try {
      await api.post("/github/history/duplicate", { type, id });
      toast.success("Duplicated");
      refreshHistory();
    } catch {
      toast.error("Failed to duplicate");
    }
  };

  const handleDeleteHistory = async (type: "readme" | "portfolio" | "profile", id: string) => {
    try {
      await api.delete(`/github/history/${type}/${id}`);
      toast.success("Deleted");
      refreshHistory();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleLoadHistory = (type: "readme" | "portfolio" | "profile", item: any) => {
    if (type === "readme") {
      setReadmeContent(item.content);
      setProjectName(item.projectName);
      setActiveSection("readme");
      setPreviewMode("readme");
    } else if (type === "portfolio") {
      setPortfolio(item.content);
      setPortfolioTheme(item.theme || "modern");
      setPortfolioTitle(item.title || "");
      setActiveSection("portfolio");
      setPreviewMode("portfolio");
    } else {
      setUsername(item.username);
      handleAnalyze(false);
    }
    setPreviewOpen(true);
    toast.success("Loaded from history");
  };

  // ─── Chat ──────────────────────────────────────────────────────────────────

  const pushChat = (msg: ChatMsg) => setChatMessages((prev) => [...prev, msg]);

  const handleChatAction = async (action: string) => {
    setChatThinking(true);
    await new Promise((r) => setTimeout(r, 900));
    try {
      if (action === "improve-readme") {
        if (!projectName && !analysis?.keyProjects?.[0]) {
          pushChat({ role: "ai", text: "Pick a repository first (use Analyze → on any project card), then I can polish its README." });
          return;
        }
        const name = projectName || analysis!.keyProjects[0].name;
        const context =
          projectContext || analysis!.keyProjects[0].description;
        pushChat({ role: "ai", text: `Re-crafting "${name}" README to be more recruiter-friendly...` });
        setProjectName(name);
        setProjectContext(context);
        await handleGenerateReadme({ context, style: "Recruiter-Friendly", sections: ["Header", "Badges", "Features", "Tech Stack", "Installation", "Usage", "Contributing", "License"] });
        pushChat({ role: "ai", text: `Done! Your improved README is ready in the preview. I added a header, badges and a clean structure that ATS parsers love.` });
      } else if (action === "rank-projects") {
        pushChat({ role: "ai", text: "Ranking your repositories by AI quality score..." });
        await loadRecommendations();
        const rec = aiRecommendations;
        if (rec?.projectRanking?.length) {
          const lines = rec.projectRanking.slice(0, 5).map((r) => `${r.rank}. ${r.name} — ${r.reason}`).join("\n");
          pushChat({ role: "ai", text: `Here's your project ranking:\n${lines}` });
        } else {
          const lines = (analysis?.keyProjects || []).slice(0, 5).map((r, i) => `${i + 1}. ${r.name} (AI ${r.aiScore})`).join("\n");
          pushChat({ role: "ai", text: `Here's your project ranking by AI score:\n${lines}` });
        }
      } else if (action === "descriptions") {
        pushChat({
          role: "ai",
          text: (analysis?.keyProjects || [])
            .slice(0, 3)
            .map(
              (r) =>
                `**${r.name}** — ${r.description === "Open source repository" ? "Add a one-line pitch like: *" + "A " + r.category.toLowerCase() + " tool built with " + r.language + ".*" : r.description}`
            )
            .join("\n"),
        });
      } else if (action === "about") {
        if (!portfolio) {
          pushChat({ role: "ai", text: "Generate a portfolio first, then I'll rewrite your About section." });
          return;
        }
        const about = `${analysis?.name || username} is ${analysis?.careerSummary || "a full-stack developer"}. ` +
          `Focused on ${(analysis?.topLanguages || []).slice(0, 3).join(", ")}, ${analysis?.name || username} ships production software with a strong emphasis on clean architecture, performance, and delightful user experiences.`;
        setPortfolio((p) => (p ? { ...p, aboutSection: about } : p));
        pushChat({ role: "ai", text: `Here's your new About section:\n\n${about}\n\nIt's live in the portfolio preview now.` });
      } else if (action === "recruiter") {
        const tips = [
          "• Add a concise, keyword-rich bio to your GitHub profile",
          "• Feature your top 3 projects in the portfolio hero",
          "• Write recruiter-friendly READMEs with clear features & stack",
          `• Your portfolio ATS score is ${aiRecommendations?.atsScore ?? analysis?.portfolioScore ?? "—"}/100 — keep descriptions specific`,
        ];
        pushChat({ role: "ai", text: `Here's how to make your portfolio recruiter-ready:\n${tips.join("\n")}` });
      } else {
        pushChat({
          role: "ai",
          text: "I can help you improve your README, rank your projects, write better descriptions, craft a stronger About section, or optimize for recruiters. Try one of the shortcuts below!",
        });
      }
    } finally {
      setChatThinking(false);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatThinking) return;
    setChatInput("");
    pushChat({ role: "user", text });
    const lower = text.toLowerCase();
    let action = "help";
    if (lower.includes("rank") || lower.includes("order")) action = "rank-projects";
    else if (lower.includes("readme")) action = "improve-readme";
    else if (lower.includes("description") || lower.includes("describe")) action = "descriptions";
    else if (lower.includes("about")) action = "about";
    else if (lower.includes("recruit") || lower.includes("resume") || lower.includes("ats")) action = "recruiter";
    await handleChatAction(action);
  };

  // ─── Repo list derivation ──────────────────────────────────────────────────

  const visibleRepos = useMemo(() => {
    const source = analysis?.keyProjects || [];
    let list = [...source];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.language.toLowerCase().includes(q)
      );
    }
    if (filterCategory !== "all") list = list.filter((r) => r.category === filterCategory);
    const favFirst = [...list].sort((a, b) => Number(favorites.includes(b.name)) - Number(favorites.includes(a.name)));
    if (sortBy === "stars") return favFirst.sort((a, b) => b.stars - a.stars);
    if (sortBy === "forks") return favFirst.sort((a, b) => b.forks - a.forks);
    if (sortBy === "updated") return favFirst.sort((a, b) => (b.pushedAt || "").localeCompare(a.pushedAt || ""));
    return favFirst.sort((a, b) => b.aiScore - a.aiScore);
  }, [analysis, search, filterCategory, sortBy, favorites]);

  const categories = useMemo(() => {
    const set = new Set((analysis?.keyProjects || []).map((r) => r.category));
    return ["all", ...Array.from(set)];
  }, [analysis]);

  const reorderRepos = (from: number, to: number) => {
    if (from === to) return;
    const items = visibleRepos.map((r) => r.name);
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    setSelectedRepos(items);
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const activeTheme = THEMES.find((t) => t.id === portfolioTheme) || THEMES[1];

  const renderPreviewContent = () => {
    if (previewMode === "readme") {
      return (
        <div className="h-full flex flex-col">
          {readmeContent && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {readmePreviewEdit ? "Markdown Editor" : "Rendered Preview"}
              </span>
              <button
                onClick={() => setReadmePreviewEdit((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                {readmePreviewEdit ? <Eye size={10} /> : <Edit3 size={10} />} {readmePreviewEdit ? "Preview" : "Edit"}
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0">
            {readmeContent && readmePreviewEdit ? (
              <Editor
                height="100%"
                language="markdown"
                theme={isDark ? "vs-dark" : "light"}
                value={readmeContent}
                onChange={(val) => setReadmeContent(val || "")}
                options={{ fontSize: 12.5, minimap: { enabled: false }, scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true, padding: { top: 14 } }}
              />
            ) : readmeContent ? (
              <div className="h-full overflow-y-auto p-5 custom-scrollbar">
                <div
                  className="max-w-3xl mx-auto p-5 rounded-2xl"
                  style={{
                    background: isDark ? "rgba(8,8,14,0.7)" : "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(245,158,11,0.15)",
                    color: isDark ? "#e2e8f0" : "#0f172a",
                  }}
                >
                  <div className="text-sm leading-relaxed">{renderMarkdown(readmeContent, isDark)}</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <FileText className="w-9 h-9 text-amber-400/50" />
                <p className="text-xs text-slate-500 dark:text-slate-400">README preview appears here after generation</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (previewMode === "portfolio") {
      if (!portfolio) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Layout className="w-9 h-9 text-amber-400/50" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Your portfolio website renders here</p>
          </div>
        );
      }
      return (
        <DeviceFrame device={device} isDark={previewLight}>
          <PortfolioSite data={portfolio} theme={activeTheme} sections={sectionsEnabled} username={username || "developer"} />
        </DeviceFrame>
      );
    }

    // deploy preview
    return (
      <div className="h-full overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-md mx-auto space-y-4 pt-6 text-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.4)]"
          >
            {deployUrl ? <CheckCircle2 size={32} /> : <Rocket size={32} />}
          </motion.div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">{deployUrl ? "Ready to launch" : "Deploy your portfolio"}</h3>
          {deployUrl && (
            <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-mono text-amber-400 break-all">
              {deployUrl}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {deployPlatform === "github-pages"
              ? "Push the generated index.html to your GitHub Pages repo using the Deploy panel."
              : "Your deployment bundle was downloaded — drag it into your hosting dashboard to go live."}
          </p>
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-black text-xs font-black"
            >
              <ExternalLink size={14} /> Open live site
            </a>
          )}
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const sidebarBg = isDark ? "rgba(8,8,16,0.92)" : "rgba(255,255,255,0.96)";
  const sidebarBorder = isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.18)";

  return (
    <div className="relative flex w-full h-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <ChatBackground isDark={isDark} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "radial-gradient(ellipse 60% 40% at 15% 20%, rgba(245,158,11,0.05) 0%, transparent 70%)"
            : "none",
        }}
      />

      {/* Left Sidebar Toggle (mobile) */}
      <AnimatePresence>
        {!sidebarOpen && (
          <motion.button
            key="side-open"
            onClick={() => setSidebarOpen(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-3 left-3 z-30 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center shadow-lg"
          >
            <PanelLeftOpen size={15} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex flex-1 relative z-10 w-full h-full min-h-0">
        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 264, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute md:relative z-20 h-full flex-shrink-0 flex flex-col overflow-hidden"
              style={{ background: sidebarBg, borderRight: `1px solid ${sidebarBorder}`, backdropFilter: "blur(28px)", minWidth: 0 }}
            >
              <div className="px-4 py-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: sidebarBorder }}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center shadow-[0_4px_14px_rgba(245,158,11,0.4)] flex-shrink-0">
                    <Github size={17} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-black text-sm truncate text-slate-900 dark:text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      AI Portfolio <span className="text-amber-500">Studio</span>
                    </h2>
                    <p className="text-[9px] font-semibold text-amber-500/80 flex items-center gap-1">
                      <Sparkles size={8} /> Adyapan AI Engine
                    </p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/5 transition flex-shrink-0">
                  <PanelLeftClose size={15} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
                {NAV_ITEMS.map(({ id, label, icon: Icon, desc }) => {
                  const active = activeSection === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActiveSection(id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                        active
                          ? "bg-gradient-to-r from-amber-500/15 to-orange-500/5 border border-amber-500/30 text-amber-500"
                          : "border border-transparent text-slate-600 dark:text-slate-400 hover:bg-white/5 dark:hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition",
                          active ? "bg-gradient-to-br from-amber-400 to-orange-600 text-black" : "bg-white/5 dark:bg-white/[0.04]"
                        )}
                      >
                        <Icon size={14} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold leading-tight">{label}</span>
                        <span className={cn("block text-[9px] truncate", active ? "text-amber-500/70" : "text-slate-400/80")}>{desc}</span>
                      </span>
                      {active && <ChevronRight size={13} className="text-amber-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* AI status footer */}
              <div className="p-3 border-t flex-shrink-0" style={{ borderColor: sidebarBorder }}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-400" />
                  </span>
                  <span className="text-[10px] font-bold text-emerald-500">AI Engine Online</span>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── CENTER WORKSPACE ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          {/* Hero strip */}
          <div
            className="px-5 py-4 border-b flex-shrink-0"
            style={{ borderColor: sidebarBorder, background: isDark ? "rgba(6,6,12,0.45)" : "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)" }}
          >
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 text-black flex items-center justify-center shadow-[0_6px_20px_rgba(245,158,11,0.4)]">
                  <BrainCircuit size={22} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    AI Portfolio <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Studio</span>
                  </h1>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    Transform your GitHub into a professional portfolio using AI.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/20 text-[10px] font-bold text-emerald-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> AI {analyzing ? "Working" : "Online"}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                  <Github size={11} className="text-amber-400" /> {analysis?.name || username || "Not connected"}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                  <FolderTree size={11} className="text-amber-400" /> {analysis?.publicRepos || analysis?.keyProjects?.length || 0} repos
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400">
                  <Star size={11} className="text-amber-400" /> {analysis?.estimatedStars || 0}
                </span>
                {analysis && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-amber-500">
                    <Target size={11} /> Score {analysis.portfolioScore}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Workspace scroll */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
              <SectionHeader section={activeSection} />

              {activeSection === "profile" && (
                <div className="space-y-5">
                  {/* Connect card */}
                  <div className="p-5 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center">
                        <Github size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Connect your GitHub</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Enter a username and let AI build your developer profile</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500/60" size={16} />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                          placeholder="GitHub username (e.g. torvalds)"
                          className="w-full rounded-xl pl-11 pr-3 py-3 text-sm bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 focus:border-amber-500 outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                        />
                      </div>
                      <PremiumButton loading={analyzing} icon={analyzing ? undefined : <Zap size={14} />} onClick={() => handleAnalyze()} className="sm:w-auto">
                        {analyzing ? "Analyzing..." : "Connect & Analyze"}
                      </PremiumButton>
                    </div>

                    <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-3 flex items-center gap-1.5">
                      <Info size={11} className="text-amber-500" /> OAuth is optional — a username works for the public API. For private repos, deploy uses a Personal Access Token later.
                    </p>
                  </div>

                  {/* What the studio does */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      { icon: BarChart3, t: "Analyze", d: "AI scores every repo" },
                      { icon: FileText, t: "READMEs", d: "Recruiter-friendly docs" },
                      { icon: Layout, t: "Portfolio", d: "Live themed website" },
                      { icon: Rocket, t: "Deploy", d: "One-click publish" },
                    ].map((c) => (
                      <div key={c.t} className="p-3.5 rounded-2xl bg-white/50 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                        <c.icon size={16} className="text-amber-500 mb-2" />
                        <div className="text-xs font-black text-slate-900 dark:text-white">{c.t}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.d}</div>
                      </div>
                    ))}
                  </div>

                  {/* Quick start */}
                  <div className="p-4 rounded-2xl bg-amber-500/[0.05] border border-amber-500/15">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-2.5 flex items-center gap-1.5">
                      <Sparkles size={11} /> Quick Start
                    </p>
                    {[
                      "① Enter a GitHub username → Connect & Analyze",
                      "② Review the AI analysis, skill matrix & repo scores",
                      "③ Pick a repo → Generate README in the AI studio",
                      "④ Build a themed portfolio → Deploy live",
                    ].map((s, i) => (
                      <p key={i} className="text-[11px] text-slate-500 dark:text-slate-400 py-0.5">{s}</p>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === "analysis" && (
                <div className="space-y-5">
                  {showAnalysisScreen || analyzing ? (
                    <div className="rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 p-4">
                      <div className="p-6 text-center">
                        <div className="inline-flex items-center justify-center gap-2 mb-4 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] font-bold">
                          <RefreshCw size={12} className="animate-spin" /> AI is analyzing @{username}
                        </div>
                        <div className="max-w-sm mx-auto">
                          <ProgressTimeline steps={AI_STEPS} current={aiStep} />
                        </div>
                      </div>
                    </div>
                  ) : analysis ? (
                    <>
                      {/* Developer profile */}
                      <div className="p-5 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 backdrop-blur-md">
                        <div className="flex flex-col sm:flex-row items-start gap-5">
                          <div className="relative shrink-0">
                            <img
                              src={analysis.avatarUrl || `https://github.com/${username}.png`}
                              alt={analysis.name}
                              className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]"
                              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                            />
                            <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-emerald-500 border-2 border-white dark:border-black flex items-center justify-center">
                              <Check size={13} className="text-white" />
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-black text-slate-900 dark:text-white">{analysis.name}</h3>
                              <span className="text-xs text-amber-500 font-mono">@{username}</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{analysis.bio}</p>
                            {analysis.location && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                                <MapPin size={10} /> {analysis.location}
                              </p>
                            )}
                            <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-amber-500 hover:underline">
                              View GitHub <ExternalLink size={10} />
                            </a>
                          </div>
                          <div className="shrink-0 flex sm:flex-col items-center gap-2">
                            <ScoreRing score={analysis.portfolioScore} size={86} label="Portfolio" sublabel="Score" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                          <StatChip icon={FolderTree} label="Public Repos" value={<CountUp end={analysis.publicRepos || 0} />} />
                          <StatChip icon={GitCommit} label="Commits" value={<CountUp end={analysis.estimatedCommits} />} />
                          <StatChip icon={Users} label="Followers" value={<CountUp end={analysis.followers || 0} />} />
                          <StatChip icon={Star} label="Stars" value={<CountUp end={analysis.estimatedStars} />} />
                        </div>

                        <div className="mt-4 p-3.5 rounded-xl bg-white/50 dark:bg-black/30 border border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1.5 flex items-center gap-1">
                            <BrainCircuit size={11} /> AI Career Summary
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{analysis.careerSummary || analysis.summary}</p>
                        </div>
                      </div>

                      {/* Skill matrix + language distribution */}
                      <div className="grid lg:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1">
                            <Layers size={11} /> Skill Matrix
                          </p>
                          <div className="space-y-3">
                            {analysis.skillMatrix?.slice(0, 4).map((sk, i) => (
                              <div key={i}>
                                <div className="flex justify-between text-[10px] mb-1">
                                  <span className="font-bold text-slate-700 dark:text-slate-200">{sk.category}</span>
                                  <span className="text-amber-500 font-black">{sk.level}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${sk.level}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                                  />
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {sk.items.slice(0, 5).map((it, j) => (
                                    <span key={j} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-slate-500 dark:text-slate-400">{it}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1">
                            <BarChart3 size={11} /> Technology Radar
                          </p>
                          <div className="space-y-2.5">
                            {analysis.languageDistribution.slice(0, 6).map((l) => (
                              <div key={l.name} className="flex items-center gap-2">
                                <span className="w-20 text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{l.name}</span>
                                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${l.pct}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full rounded-full"
                                    style={{ background: LANG_COLORS[l.name] || "#f59e0b" }}
                                  />
                                </div>
                                <span className="w-9 text-right text-[10px] font-black text-slate-500 dark:text-slate-400">{l.pct}%</span>
                              </div>
                            ))}
                          </div>

                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mt-4 mb-2 flex items-center gap-1">
                            <GitCommit size={11} /> Contribution Graph
                          </p>
                          <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                            <ContributionGraph values={analysis.contributionGraph} accent="#f59e0b" />
                          </div>
                        </div>
                      </div>

                      {/* AI recommendations */}
                      <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                            <Wand2 size={11} /> AI Recommendations
                          </p>
                          <button
                            onClick={() => loadRecommendations()}
                            className="text-[10px] font-bold text-amber-500 hover:underline flex items-center gap-1"
                          >
                            {recLoading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />} Deep-dive
                          </button>
                        </div>

                        {aiRecommendations ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-3 rounded-xl bg-white/50 dark:bg-black/30 border border-white/5">
                                <div className="text-lg font-black text-amber-500"><CountUp end={aiRecommendations.atsScore} />%</div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">ATS Score</div>
                              </div>
                              <div className="p-3 rounded-xl bg-white/50 dark:bg-black/30 border border-white/5">
                                <div className="text-lg font-black text-emerald-500">{aiRecommendations.strongProjects.length}</div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Strong</div>
                              </div>
                              <div className="p-3 rounded-xl bg-white/50 dark:bg-black/30 border border-white/5">
                                <div className="text-lg font-black text-rose-500">{aiRecommendations.weakProjects.length}</div>
                                <div className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Needs Work</div>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{aiRecommendations.portfolioCompleteness}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-1.5">
                              <Shield size={12} className="text-amber-500 mt-0.5 shrink-0" /> {aiRecommendations.resumeMatch}
                            </p>
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-2">
                            {analysis.recommendations.map((r, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "p-3 rounded-xl border",
                                  r.level === "high"
                                    ? "bg-rose-500/[0.05] border-rose-500/20"
                                    : r.level === "medium"
                                    ? "bg-amber-500/[0.05] border-amber-500/20"
                                    : "bg-emerald-500/[0.04] border-emerald-500/15"
                                )}
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  {r.level === "high" ? (
                                    <TrendingUp size={11} className="text-rose-400" />
                                  ) : r.level === "medium" ? (
                                    <Info size={11} className="text-amber-500" />
                                  ) : (
                                    <Check size={11} className="text-emerald-400" />
                                  )}
                                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">{r.title}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{r.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Repo cards */}
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                            <FolderTree size={11} /> Smart Repository Selection
                          </p>
                          <span className="text-[10px] text-slate-400">drag to reorder · {selectedRepos.length} selected</span>
                          <div className="ml-auto flex items-center gap-1.5">
                            <div className="relative">
                              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search repos"
                                className="w-32 text-[10px] pl-7 pr-2 py-1.5 rounded-lg bg-white/5 border border-white/10 outline-none focus:border-amber-500 text-slate-200 placeholder:text-slate-500"
                              />
                            </div>
                            <select
                              value={filterCategory}
                              onChange={(e) => setFilterCategory(e.target.value)}
                              className="text-[10px] px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 outline-none text-slate-300"
                            >
                              {categories.map((c) => (
                                <option key={c} value={c} className="bg-slate-900">{c}</option>
                              ))}
                            </select>
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as any)}
                              className="text-[10px] px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 outline-none text-slate-300"
                            >
                              <option value="aiScore" className="bg-slate-900">AI Score</option>
                              <option value="stars" className="bg-slate-900">Stars</option>
                              <option value="forks" className="bg-slate-900">Forks</option>
                              <option value="updated" className="bg-slate-900">Updated</option>
                            </select>
                          </div>
                        </div>

                        {visibleRepos.length ? (
                          <div className="grid sm:grid-cols-2 gap-3">
                            {visibleRepos.map((repo, idx) => (
                              <RepoCard
                                key={repo.name}
                                repo={repo}
                                index={idx}
                                selected={selectedRepos.includes(repo.name)}
                                favorite={favorites.includes(repo.name)}
                                isDragging={dragIndex === idx}
                                isPreviewTarget={previewTarget === idx}
                                onToggleSelect={() =>
                                  setSelectedRepos((prev) =>
                                    prev.includes(repo.name) ? prev.filter((n) => n !== repo.name) : [...prev, repo.name]
                                  )
                                }
                                onToggleFavorite={() =>
                                  setFavorites((prev) => (prev.includes(repo.name) ? prev.filter((n) => n !== repo.name) : [...prev, repo.name]))
                                }
                                onUseReadme={() => handleUseRepoForReadme(repo)}
                                onOpen={() => window.open(repo.url, "_blank")}
                                onDragStart={() => setDragIndex(idx)}
                                onDragEnter={() => setPreviewTarget(idx)}
                                onDragOver={() => setPreviewTarget(idx)}
                                onDrop={() => {
                                  if (dragIndex !== null && dragIndex !== idx) reorderRepos(dragIndex, idx);
                                  setDragIndex(null);
                                  setPreviewTarget(null);
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 rounded-2xl bg-white/5 border border-white/5">
                            No repositories match your filters.
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-10 text-center rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                      <BarChart3 className="w-10 h-10 text-amber-400/50 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">No analysis yet</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">Connect your GitHub profile to unlock AI repository analysis, skill matrices and recommendations.</p>
                      <PremiumButton className="mt-4" icon={<Zap size={14} />} onClick={() => setActiveSection("profile")}>
                        Connect GitHub
                      </PremiumButton>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "readme" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 backdrop-blur-md space-y-4">
                    {/* Chat prompt */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center shrink-0 mt-0.5">
                        <Bot size={16} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="Project name (e.g. task-runner)"
                            className="flex-1 text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 outline-none focus:border-amber-500"
                          />
                          <select
                            value={templateStyle}
                            onChange={(e) => setTemplateStyle(e.target.value)}
                            className="text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 outline-none text-slate-700 dark:text-slate-200"
                          >
                            {README_TEMPLATES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          value={projectContext}
                          onChange={(e) => setProjectContext(e.target.value)}
                          placeholder="Add tech stack, key features, or context for the AI..."
                          className="w-full h-20 text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 outline-none focus:border-amber-500 resize-none"
                        />
                        <div className="flex items-center gap-2">
                          <PremiumButton
                            loading={readmeLoading}
                            icon={readmeLoading ? undefined : <Sparkles size={14} />}
                            onClick={() => handleGenerateReadme()}
                          >
                            {readmeLoading ? "Generating..." : "Generate AI README"}
                          </PremiumButton>
                          <button onClick={() => handleSaveHistory("readme")} className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition" disabled={!readmeContent}>
                            Save version
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Section library */}
                    <div className="pt-1">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-2">Section Library</p>
                      <div className="flex flex-wrap gap-1.5">
                        {README_SECTION_LIBRARY.map((s) => {
                          const on = readmeSections.includes(s);
                          return (
                            <button
                              key={s}
                              onClick={() => toggleReadmeSection(s)}
                              className={cn(
                                "px-2.5 py-1 rounded-lg border text-[10px] font-bold transition",
                                on
                                  ? "bg-amber-500/15 border-amber-500/35 text-amber-400"
                                  : "bg-white/5 border-white/10 text-slate-500 dark:text-slate-400 hover:bg-white/10"
                              )}
                            >
                              {on ? <Check size={10} className="inline mr-1" /> : <Plus size={10} className="inline mr-1" />}
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* AI suggestions */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-2">One-click Improvements</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: "Add GitHub stats badge block", run: () => setProjectContext((c) => `${c}\nInclude GitHub stats and shields.io badges prominently.`) },
                          { label: "Contribution snake", run: () => setProjectContext((c) => `${c}\nAdd a contribution snake animation GIF.`) },
                          { label: "Shields.io badges", run: () => setProjectContext((c) => `${c}\nUse shields.io badges for build, license, version.`) },
                          { label: "Make it ATS-friendly", run: () => handleGenerateReadme({ style: "Recruiter-Friendly", sections: ["Header", "Features", "Tech Stack", "Installation", "Usage", "Contributing", "License"] }) },
                        ].map((imp, i) => (
                          <button
                            key={i}
                            onClick={imp.run}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-500 text-[10px] font-bold hover:bg-emerald-500/15 transition"
                          >
                            <Wand2 size={10} className="inline mr-1" />
                            {imp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {readmeContent && (
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                          <FileText size={11} /> Generated README
                        </p>
                        <div className="flex gap-1.5">
                          <button onClick={copyReadme} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            <Copy size={10} className="inline mr-1" /> Copy
                          </button>
                          <button onClick={exportReadmeMd} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            <Download size={10} className="inline mr-1" /> .md
                          </button>
                          <button onClick={exportReadmePdf} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            PDF
                          </button>
                          <button onClick={() => setPreviewMode("readme")} className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-400 transition">
                            <Eye size={10} className="inline mr-1" /> Preview
                          </button>
                        </div>
                      </div>
                      <div className="max-h-72 overflow-y-auto rounded-xl bg-black/30 border border-white/5 p-4 text-[11px] leading-relaxed text-slate-400 font-mono whitespace-pre-wrap">
                        {readmeContent.slice(0, 1600)}{readmeContent.length > 1600 ? "..." : ""}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "portfolio" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={portfolioTitle}
                        onChange={(e) => setPortfolioTitle(e.target.value)}
                        placeholder="Portfolio title"
                        className="flex-1 min-w-[180px] text-xs px-3 py-2.5 rounded-xl bg-white/70 dark:bg-black/30 border border-black/10 dark:border-white/10 outline-none focus:border-amber-500"
                      />
                      <PremiumButton
                        loading={portfolioLoading}
                        icon={portfolioLoading ? undefined : <Wand2 size={14} />}
                        onClick={handleBuildPortfolio}
                      >
                        {portfolioLoading ? "Building..." : analysis ? "Generate Portfolio" : "Analyze first"}
                      </PremiumButton>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-1">Design Theme</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {THEMES.map((th) => (
                        <button
                          key={th.id}
                          onClick={() => setPortfolioTheme(th.id)}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition",
                            portfolioTheme === th.id
                              ? "border-amber-500 bg-amber-500/[0.08] shadow-[0_0_16px_rgba(245,158,11,0.15)]"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="w-full h-6 rounded-lg mb-1.5" style={{ background: th.swatch }} />
                          <div className="text-[11px] font-black text-slate-800 dark:text-slate-100">{th.name}</div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400">{th.desc}</div>
                        </button>
                      ))}
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-2">Sections</p>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {PORTFOLIO_SECTIONS.map((s) => {
                          const on = sectionsEnabled[s.id];
                          const Icon = s.icon;
                          return (
                            <button
                              key={s.id}
                              onClick={() => setSectionsEnabled((prev) => ({ ...prev, [s.id]: !on }))}
                              className={cn(
                                "p-2.5 rounded-xl border text-left transition",
                                on ? "border-amber-500/40 bg-amber-500/[0.07]" : "border-white/10 bg-white/5 opacity-60"
                              )}
                            >
                              <Icon size={13} className={on ? "text-amber-500 mb-1" : "text-slate-500 mb-1"} />
                              <div className="text-[10px] font-black text-slate-700 dark:text-slate-200">{s.label}</div>
                              <div className="text-[8px] text-slate-500 dark:text-slate-400">{s.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {portfolio && (
                    <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                          <Layout size={11} /> Portfolio Ready
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => handleSaveHistory("portfolio")} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            <History size={10} className="inline mr-1" /> Save version
                          </button>
                          <button onClick={exportPortfolioHtml} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            <Download size={10} className="inline mr-1" /> HTML
                          </button>
                          <button onClick={() => exportPortfolioZip("static")} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            <Package size={10} className="inline mr-1" /> ZIP
                          </button>
                          <button onClick={() => exportPortfolioZip("react")} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            React
                          </button>
                          <button onClick={() => exportPortfolioZip("nextjs")} className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 hover:text-white transition">
                            Next.js
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSection === "resume" && (
                <div className="space-y-5">
                  <div className="p-5 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Resume Sync</h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Your Career Hub resume strengthens the AI portfolio output</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Experience & education flow from your resume into the About and Experience sections
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> ATS optimization rewrites project bullet points with recruiter keywords
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 py-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> Job-match scoring aligns your portfolio with target roles
                      </div>
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-amber-500/[0.05] border border-amber-500/15">
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 mb-2">Tip</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        Build or update your resume in the Career Hub, then regenerate your portfolio to pull the freshest narrative into the About section.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "deploy" && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <Rocket size={11} /> Platform
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "vercel" as const, label: "Vercel", desc: "Zero-config", icon: Globe, swatch: "from-black to-slate-700" },
                        { id: "netlify" as const, label: "Netlify", desc: "Drag & drop", icon: Globe, swatch: "from-teal-500 to-emerald-600" },
                        { id: "github-pages" as const, label: "GitHub Pages", desc: "Push to repo", icon: Github, swatch: "from-slate-600 to-slate-800" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setDeployPlatform(p.id)}
                          className={cn(
                            "p-3 rounded-xl border text-left transition",
                            deployPlatform === p.id
                              ? "border-amber-500 bg-amber-500/[0.08] shadow-[0_0_16px_rgba(245,158,11,0.15)]"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className={`w-full h-6 rounded-lg mb-1.5 bg-gradient-to-r ${p.swatch}`} />
                          <div className="text-[11px] font-black text-slate-800 dark:text-slate-100 flex items-center gap-1">
                            <p.icon size={11} /> {p.label}
                          </div>
                          <div className="text-[9px] text-slate-500 dark:text-slate-400">{p.desc}</div>
                        </button>
                      ))}
                    </div>

                    {deployPlatform === "github-pages" && (
                      <div className="space-y-2.5 p-4 rounded-xl bg-black/30 border border-white/5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Personal Access Token (PAT)</label>
                          <div className="relative">
                            <input
                              type={showPat ? "text" : "password"}
                              value={githubPat}
                              onChange={(e) => setGithubPat(e.target.value)}
                              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                              className="w-full rounded-xl p-2.5 pr-10 text-xs font-mono bg-white/5 border border-white/10 outline-none focus:border-amber-500"
                            />
                            <button onClick={() => setShowPat(!showPat)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 hover:text-white">
                              {showPat ? "Hide" : "Show"}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Repository (owner/repo)</label>
                          <input
                            value={targetRepo}
                            onChange={(e) => setTargetRepo(e.target.value)}
                            placeholder="username/portfolio"
                            className="w-full rounded-xl p-2.5 text-xs font-mono bg-white/5 border border-white/10 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <PremiumButton loading={deploying} icon={deploying ? undefined : <Rocket size={14} />} onClick={handleDeploy}>
                        {deploying ? "Preparing..." : "Deploy Portfolio"}
                      </PremiumButton>
                      {deployPlatform === "github-pages" && (
                        <PremiumButton variant="secondary" loading={pushing} icon={pushing ? undefined : <Github size={14} />} onClick={handlePushToGithub}>
                          {pushing ? "Pushing..." : "Push to GitHub Pages"}
                        </PremiumButton>
                      )}
                    </div>

                    {pushLog.status && (
                      <div className={cn("p-3 rounded-xl border text-xs font-mono", pushLog.status === "success" ? "bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-500" : "bg-rose-500/[0.06] border-rose-500/25 text-rose-400")}>
                        <div className="flex items-center gap-2">
                          {pushLog.status === "success" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          <span className="font-bold">{pushLog.message}</span>
                        </div>
                        {pushLog.details && <pre className="mt-2 whitespace-pre-wrap text-[10px]">{pushLog.details}</pre>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "history" && (
                <div className="space-y-4">
                  {!history ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[0, 1, 2, 3].map((i) => <AnimatedSkeleton key={i} />)}
                    </div>
                  ) : (
                    <>
                      {history.portfolios.length > 0 && (
                        <HistoryGroup
                          title="Portfolio Versions"
                          accent="amber"
                          icon={Layout}
                          items={history.portfolios.map((p) => ({
                            id: p.id,
                            title: p.title,
                            subtitle: `Theme: ${p.theme}${p.isPublished ? " · Published" : ""}`,
                            date: p.createdAt,
                            load: () => handleLoadHistory("portfolio", p),
                            duplicate: () => handleDuplicateHistory("portfolio", p.id),
                            delete: () => handleDeleteHistory("portfolio", p.id),
                          }))}
                        />
                      )}
                      {history.readmes.length > 0 && (
                        <HistoryGroup
                          title="README History"
                          accent="cyan"
                          icon={FileText}
                          items={history.readmes.map((r) => ({
                            id: r.id,
                            title: r.projectName,
                            subtitle: "README.md",
                            date: r.createdAt,
                            load: () => handleLoadHistory("readme", r),
                            duplicate: () => handleDuplicateHistory("readme", r.id),
                            delete: () => handleDeleteHistory("readme", r.id),
                          }))}
                        />
                      )}
                      {history.profiles.length > 0 && (
                        <HistoryGroup
                          title="GitHub Profiles"
                          accent="green"
                          icon={Github}
                          items={history.profiles.map((p) => ({
                            id: p.id,
                            title: `@${p.username}`,
                            subtitle: `${p.stars} stars · ${p.commits} commits`,
                            date: p.createdAt,
                            load: () => handleLoadHistory("profile", p),
                            duplicate: undefined,
                            delete: () => handleDeleteHistory("profile", p.id),
                          }))}
                        />
                      )}
                      {history.portfolios.length === 0 && history.readmes.length === 0 && history.profiles.length === 0 && (
                        <div className="p-10 text-center rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                          <History className="w-10 h-10 text-amber-400/50 mx-auto mb-3" />
                          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">No history yet</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Generated READMEs and portfolios are saved here automatically.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeSection === "templates" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {THEMES.map((th) => (
                      <button
                        key={th.id}
                        onClick={() => {
                          setPortfolioTheme(th.id);
                          if (portfolio) setPreviewMode("portfolio");
                          setActiveSection("portfolio");
                        }}
                        className="group p-3 rounded-2xl border border-white/10 bg-white/5 hover:border-amber-500/40 hover:bg-white/[0.07] transition text-left"
                      >
                        <div className="w-full h-16 rounded-xl mb-2.5 group-hover:scale-[1.02] transition-transform" style={{ background: th.swatch }} />
                        <div className="text-xs font-black text-slate-800 dark:text-slate-100">{th.name}</div>
                        <div className="text-[9px] text-slate-500 dark:text-slate-400">{th.desc}</div>
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-500 opacity-0 group-hover:opacity-100 transition">
                          Use theme <ChevronRight size={10} />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeSection === "settings" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 divide-y divide-white/5">
                    <SettingsToggle
                      enabled={settings.autoImprove}
                      onToggle={() => setSettings((s) => ({ ...s, autoImprove: !s.autoImprove }))}
                      label="Auto-improve generated content"
                      description="AI rewrites weak sentences and adds context automatically"
                      icon={<Wand2 size={14} />}
                    />
                    <SettingsToggle
                      enabled={settings.includeBadges}
                      onToggle={() => setSettings((s) => ({ ...s, includeBadges: !s.includeBadges }))}
                      label="Include shields.io badges"
                      description="Adds build, license and version badges to READMEs"
                      icon={<Award size={14} />}
                    />
                    <SettingsToggle
                      enabled={settings.includeStats}
                      onToggle={() => setSettings((s) => ({ ...s, includeStats: !s.includeStats }))}
                      label="GitHub stats cards"
                      description="Embeds stats cards into README headers"
                      icon={<TrendingUp size={14} />}
                    />
                    <SettingsToggle
                      enabled={settings.includeSnake}
                      onToggle={() => setSettings((s) => ({ ...s, includeSnake: !s.includeSnake }))}
                      label="Contribution snake"
                      description="Adds a contribution snake animation GIF"
                      icon={<GitCommit size={14} />}
                    />
                    <SettingsToggle
                      enabled={settings.atsOptimize}
                      onToggle={() => setSettings((s) => ({ ...s, atsOptimize: !s.atsOptimize }))}
                      label="ATS optimization"
                      description="Rewrites descriptions with recruiter keywords"
                      icon={<Shield size={14} />}
                    />
                    <SettingsToggle
                      enabled={settings.suggestOnAnalyze}
                      onToggle={() => setSettings((s) => ({ ...s, suggestOnAnalyze: !s.suggestOnAnalyze }))}
                      label="Auto-suggest improvements"
                      description="Runs AI recommendations after every analysis"
                      icon={<Sparkles size={14} />}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT LIVE PREVIEW ───────────────────────────────────────────── */}
        {previewOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isDesktop ? 400 : "92vw", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className={cn(
              "h-full flex-shrink-0 flex flex-col overflow-hidden",
              isDesktop ? "relative" : "absolute right-0 top-0 z-30"
            )}
            style={{
              background: isDark ? "rgba(8,8,16,0.95)" : "rgba(255,255,255,0.97)",
              borderLeft: `1px solid ${sidebarBorder}`,
              backdropFilter: "blur(28px)",
              minWidth: 0,
            }}
          >
            {/* Preview header + tabs */}
            <div className="px-3 py-2.5 border-b flex-shrink-0" style={{ borderColor: sidebarBorder }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Eye size={11} /> Live Preview
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewLight(!previewLight)}
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition"
                    title="Toggle light/dark preview chrome"
                  >
                    {previewLight ? <Sun size={12} /> : <Moon size={12} />}
                  </button>
                  <button onClick={() => setPreviewOpen(false)} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition">
                    <PanelRightClose size={12} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5">
                {[
                  { id: "readme" as const, label: "README", icon: FileText },
                  { id: "portfolio" as const, label: "Portfolio", icon: Layout },
                  { id: "desktop" as const, label: "Desktop", icon: Monitor },
                  { id: "tablet" as const, label: "Tablet", icon: Tablet },
                  { id: "mobile" as const, label: "Mobile", icon: Smartphone },
                  { id: "deploy" as const, label: "Deploy", icon: Rocket },
                ].map((tab) => {
                  const activeTab =
                    (tab.id === "readme" && previewMode === "readme") ||
                    (tab.id === "portfolio" && previewMode === "portfolio" && device === "desktop") ||
                    (tab.id === "desktop" && previewMode === "portfolio" && device === "desktop") ||
                    (tab.id === "tablet" && previewMode === "portfolio" && device === "tablet") ||
                    (tab.id === "mobile" && previewMode === "portfolio" && device === "mobile") ||
                    (tab.id === "deploy" && previewMode === "deploy");
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (tab.id === "readme") setPreviewMode("readme");
                        else if (tab.id === "portfolio" || tab.id === "desktop") {
                          setPreviewMode("portfolio");
                          setDevice("desktop");
                        } else if (tab.id === "tablet") {
                          setPreviewMode("portfolio");
                          setDevice("tablet");
                        } else if (tab.id === "mobile") {
                          setPreviewMode("portfolio");
                          setDevice("mobile");
                        } else setPreviewMode("deploy");
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition",
                        activeTab
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : "text-slate-500 dark:text-slate-400 hover:text-white border border-transparent"
                      )}
                    >
                      <tab.icon size={11} /> {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview body */}
            <div className="flex-1 min-h-0 overflow-hidden">{renderPreviewContent()}</div>
          </motion.aside>
        )}

        {/* Right preview toggle */}
        {!previewOpen && (
          <motion.button
            key="preview-open"
            onClick={() => setPreviewOpen(true)}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="absolute right-3 top-3 z-30 w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center shadow-lg"
            title="Open live preview"
          >
            <PanelRightOpen size={15} />
          </motion.button>
        )}
      </div>

      {/* ── AI CHAT ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="absolute bottom-4 right-4 z-40 w-[340px] max-w-[calc(100vw-2rem)] h-[460px] max-h-[70vh] flex flex-col rounded-2xl overflow-hidden border border-white/10"
            style={{ background: isDark ? "rgba(10,10,18,0.97)" : "rgba(255,255,255,0.98)", backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between flex-shrink-0" style={{ background: isDark ? "rgba(8,8,16,0.9)" : "rgba(255,255,255,0.9)" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center">
                  <Bot size={15} />
                </div>
                <div>
                  <div className="text-xs font-black text-slate-900 dark:text-white">AI Portfolio Coach</div>
                  <div className="text-[9px] text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Online
                  </div>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/5 transition">
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {chatMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-br-md"
                        : "bg-white/5 border border-white/5 text-slate-700 dark:text-slate-200 rounded-bl-md"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatThinking && (
                <div className="flex justify-start">
                  <div className="px-3 py-2.5 rounded-2xl bg-white/5 border border-white/5 rounded-bl-md">
                    <AIThinkingDots />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-3 pt-2 flex-shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button
                    key={s.action}
                    onClick={() => handleChatAction(s.action)}
                    disabled={chatThinking}
                    className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[9px] font-bold text-amber-500 hover:bg-amber-500/20 transition disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 flex gap-2 flex-shrink-0">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
                placeholder="Ask your AI coach..."
                className="flex-1 text-xs px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 outline-none focus:border-amber-500 text-slate-700 dark:text-slate-200 placeholder:text-slate-500"
              />
              <button
                onClick={handleChatSend}
                disabled={chatThinking || !chatInput.trim()}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black flex items-center justify-center disabled:opacity-50 transition"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat toggle */}
      <motion.button
        onClick={() => setChatOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="absolute bottom-4 right-4 z-40 w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-black flex items-center justify-center shadow-[0_8px_30px_rgba(245,158,11,0.4)]"
        title="AI Coach"
      >
        {chatOpen ? <MessageCircle size={20} /> : <Bot size={20} />}
      </motion.button>
    </div>
  );
}

// ─── History group helper ─────────────────────────────────────────────────────

function HistoryGroup({
  title,
  accent,
  icon: Icon,
  items,
}: {
  title: string;
  accent: "amber" | "cyan" | "green";
  icon: React.ComponentType<any>;
  items: {
    id: string;
    title: string;
    subtitle: string;
    date: string;
    load: () => void;
    duplicate?: () => void;
    delete: () => void;
  }[];
}) {
  const accentColor = accent === "cyan" ? "#22d3ee" : accent === "green" ? "#34d399" : "#f59e0b";
  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "");
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: accentColor }}>
        <Icon size={11} /> {title}
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="group p-3 rounded-xl bg-white/70 dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:border-amber-500/30 transition flex items-center gap-3">
            <button onClick={item.load} className="flex-1 text-left min-w-0">
              <div className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{item.title}</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="truncate">{item.subtitle}</span>
                <span className="flex items-center gap-0.5 shrink-0"><Clock size={8} /> {fmtDate(item.date)}</span>
              </div>
            </button>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button onClick={item.load} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-amber-400 transition" title="Restore">
                <RotateCcw size={12} />
              </button>
              {item.duplicate && (
                <button onClick={item.duplicate} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition" title="Duplicate">
                  <CopyPlus size={12} />
                </button>
              )}
              <button onClick={item.delete} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 transition" title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
