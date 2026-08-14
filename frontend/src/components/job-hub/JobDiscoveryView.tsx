"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import {
  Briefcase, Search, Filter, MapPin, Building2, Globe, Clock, DollarSign, GraduationCap,
  Sparkles, ExternalLink, Share2, Copy, X, ChevronDown, ChevronLeft, ChevronRight,
  Loader2, SlidersHorizontal, Users, Target, Zap, FileText,
  Star, Bookmark, BookmarkCheck, BarChart3,
  Lightbulb, ArrowRight, CheckCircle2,
  Eye, Flame, Activity, LayoutGrid, List, Code2, ArrowUpDown,
  BookOpen, AlertCircle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import CompanyLogo from "@/components/interview-hub/CompanyLogo";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface JobDiscoveryViewProps {
  setView?: (view: string) => void;
}

interface Job {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  location: string;
  mode: string;
  employmentType: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  experience?: string;
  experienceMin?: number;
  experienceMax?: number;
  skills: string[];
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  postedAt: string;
  isFeatured?: boolean;
  isSaved?: boolean;
  source?: string;
  matchScore?: number;
  applyUrl?: string;
  industry?: string;
  companySize?: string;
  education?: string;
  passingYear?: string;
  companyId?: string;
}

interface Facets {
  workModes: { name: string; count: number }[];
  employmentTypes: { name: string; count: number }[];
  sources: { name: string; count: number }[];
  skills: { name: string; count: number }[];
  companies: { name: string; count: number }[];
  locations: { name: string; count: number }[];
  industries: { name: string; count: number }[];
}

interface AIMatch {
  overallScore: number;
  activeCvName?: string;
  skillMatch?: { score?: number; matched?: string[]; missing?: string[]; suggested?: string[] };
  experienceMatch?: { score: number; details?: string };
  educationMatch?: { score: number; details?: string };
  reasons: string[];
  preparationTips: string[];
}

interface MissingSkills {
  skills?: {
    name: string;
    importance: string;
    timeToLearn: string;
    resources?: { title: string; url: string; type: string }[];
  }[];
  missingTechnicalSkills?: {
    skill: string;
    importance: string;
    estimatedWeeks: number;
    resources?: string[];
  }[];
}

interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  location: string;
  matchScore: number;
  mode: string;
}

interface TrendingJob {
  id: string;
  title: string;
  company: string;
  viewsCount: number;
  savesCount: number;
}

interface AnalyticsData {
  totalJobs: number;
  byLocation: { name: string; count: number }[];
  bySkill: { name: string; count: number }[];
  byIndustry: { name: string; count: number }[];
  salaryRanges: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_LIMIT = 20;

function formatCap99(val: number | string | undefined | null): string {
  if (val == null) return "0";
  const num = typeof val === "number" ? val : parseInt(String(val), 10);
  if (isNaN(num)) return String(val);
  return num > 99 ? "99+" : num.toString();
}

const WORK_MODES = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Internship", "Freelance"];
const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
const SOURCES = ["LinkedIn", "Naukri", "Indeed", "Internshala", "RemoteOK", "Wellfound", "Adzuna"];
const POSTED_WITHIN = [
  { label: "Today", value: "today" },
  { label: "Last 3 Days", value: "3days" },
  { label: "Last Week", value: "week" },
  { label: "Last Month", value: "month" },
];

const SORT_OPTIONS = [
  { value: "postedAt", label: "Newest" },
  { value: "matchScore", label: "Best Match" },
  { value: "salaryMax", label: "Salary High-Low" },
  { value: "experienceMin", label: "Experience" },
  { value: "company", label: "Company" },
];

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  linkedin: { bg: "rgba(10,102,194,0.16)", text: "#38bdf8" },
  LinkedIn: { bg: "rgba(10,102,194,0.16)", text: "#38bdf8" },
  naukri: { bg: "rgba(41,130,255,0.16)", text: "#60a5fa" },
  Naukri: { bg: "rgba(41,130,255,0.16)", text: "#60a5fa" },
  indeed: { bg: "rgba(45,80,167,0.16)", text: "#818cf8" },
  Indeed: { bg: "rgba(45,80,167,0.16)", text: "#818cf8" },
  internshala: { bg: "rgba(42,112,232,0.16)", text: "#38bdf8" },
  Internshala: { bg: "rgba(42,112,232,0.16)", text: "#38bdf8" },
  remoteok: { bg: "rgba(16,185,129,0.16)", text: "#34d399" },
  RemoteOK: { bg: "rgba(16,185,129,0.16)", text: "#34d399" },
  wellfound: { bg: "rgba(168,85,247,0.16)", text: "#c084fc" },
  Wellfound: { bg: "rgba(168,85,247,0.16)", text: "#c084fc" },
  foundit: { bg: "rgba(236,72,153,0.16)", text: "#f472b6" },
  Foundit: { bg: "rgba(236,72,153,0.16)", text: "#f472b6" },
  adzuna: { bg: "rgba(99,102,241,0.16)", text: "#818cf8" },
  Adzuna: { bg: "rgba(99,102,241,0.16)", text: "#818cf8" },
};

const MODE_COLORS: Record<string, { bg: string; text: string }> = {
  Remote: { bg: "rgba(99,102,241,0.1)", text: "#818cf8" },
  Hybrid: { bg: "rgba(168,85,247,0.1)", text: "#a855f7" },
  "On-site": { bg: "rgba(100,116,139,0.1)", text: "#94a3b8" },
};

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "E-commerce",
  "Manufacturing", "Consulting", "Media", "Real Estate", "Energy",
  "Automotive", "Telecommunications", "Hospitality", "Agriculture",
];

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35 } }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.01, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
};

const modalOverlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalContent = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

const slideFromLeft = {
  hidden: { x: "-100%", opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 300, damping: 30 } },
  exit: { x: "-100%", opacity: 0, transition: { duration: 0.25 } },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function timeAgo(date: any): string {
  if (!date) return "Recently";
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return "Recently";
  const seconds = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (seconds <= 0 || seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLogoInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function getLogoColor(name: string): string {
  const colors = ["#f59e0b", "#6366f1", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#f97316";
  return "#ef4444";
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "";
  const fmt = (n: number) => {
    if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}
// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function SkeletonCard({ c }: { c: Record<string, string> }) {
  return (
    <div className="rounded-2xl border p-5 space-y-4 animate-pulse" style={{ background: c.cardBg, borderColor: c.border }}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: c.surface }} />
        <div className="flex-1 space-y-2.5">
          <div className="h-3.5 rounded" style={{ background: c.surface, width: "70%" }} />
          <div className="h-2.5 rounded" style={{ background: c.surface, width: "45%" }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 rounded" style={{ background: c.surface, width: "90%" }} />
        <div className="h-2.5 rounded" style={{ background: c.surface, width: "75%" }} />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full" style={{ background: c.surface }} />
        <div className="h-6 w-20 rounded-full" style={{ background: c.surface }} />
        <div className="h-6 w-14 rounded-full" style={{ background: c.surface }} />
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove, c }: { label: string; onRemove: () => void; c: Record<string, string> }) {
  return (
    <motion.span layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer select-none transition-all hover:scale-[1.03]"
      style={{ background: "rgba(245,158,11,0.06)", color: c.primary, borderColor: "rgba(245,158,11,0.18)" }} onClick={onRemove}>
      {label} <X size={11} />
    </motion.span>
  );
}

function ScoreCircle({ score, size = 48 }: { score: number; size?: number }) {
  const color = getScoreColor(score);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill="transparent" stroke="rgba(148,163,184,0.15)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill="transparent" stroke={color} strokeWidth={3}
          strokeDasharray={2 * Math.PI * (size / 2 - 3)} strokeDashoffset={2 * Math.PI * (size / 2 - 3) * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span className="font-black text-[10px]" style={{ color }}>{score}</span>
    </div>
  );
}

function ScoreBar({ label, score, c }: { label: string; score: number; c: Record<string, string> }) {
  const color = getScoreColor(score);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{label}</span>
        <span className="text-xs font-black" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.12)" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}

function EmptyState({ c, onClearFilters }: { c: Record<string, string>; onClearFilters: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: "rgba(245,158,11,0.08)" }}>
        <Search size={40} style={{ color: c.primary }} />
      </div>
      <h3 className="text-lg font-bold mb-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>No jobs found</h3>
      <p className="text-sm mb-6 max-w-sm" style={{ color: c.textMuted }}>
        We could not find any jobs matching your criteria. Try adjusting your filters or search terms.
      </p>
      <button onClick={onClearFilters} className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
        style={{ background: c.primary, color: "#000" }}>Clear All Filters</button>
    </motion.div>
  );
}

interface CustomSelectOption {
  value: string;
  label: string;
}

function CustomSelect({
  value,
  options,
  onChange,
  placeholder = "Select...",
  c,
  isDark = true,
  className = "",
}: {
  value: string;
  options: CustomSelectOption[];
  onChange: (val: string) => void;
  placeholder?: string;
  c: Record<string, string>;
  isDark?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold border transition-all hover:border-amber-500/40 outline-none cursor-pointer"
        style={{
          background: isDark ? "rgba(15, 23, 42, 0.7)" : "#ffffff",
          borderColor: isOpen ? c.primary : c.border,
          color: selectedOption ? c.text : c.textMuted,
        }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: c.textMuted }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden py-1 max-h-60 overflow-y-auto"
            style={{
              background: isDark ? "rgba(15, 23, 42, 0.96)" : "#ffffff",
              borderColor: c.border,
              backdropFilter: "blur(16px)",
            }}
          >
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors hover:bg-amber-500/10 cursor-pointer"
                  style={{
                    color: isSelected ? c.primary : c.text,
                    background: isSelected ? "rgba(245, 158, 11, 0.08)" : "transparent",
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <CheckCircle2 size={12} style={{ color: c.primary }} className="shrink-0 ml-2" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function JobDiscoveryView({ setView }: JobDiscoveryViewProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const c = useMemo(() => ({
    text: isDark ? "#f1f5f9" : "#0f172a",
    textSec: isDark ? "#cbd5e1" : "#334155",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    cardBg: isDark ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.85)",
    cardBgHover: isDark ? "rgba(30, 41, 59, 1)" : "rgba(255, 255, 255, 1)",
    border: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(0, 0, 0, 0.08)",
    primary: "#f59e0b",
    inputBg: isDark ? "rgba(15, 23, 42, 0.6)" : "#f8fafc",
    surface: isDark ? "rgba(51, 65, 85, 0.35)" : "rgba(0,0,0,0.03)",
    overlay: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.4)",
  }), [isDark]);

  // ─── Search State ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ─── Filter State ───────────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    location: "", workMode: "", employmentType: "", experienceMin: "", experienceMax: "",
    salaryMin: "", salaryMax: "", skills: "", industry: "", education: "",
    companySize: "", source: "", postedWithin: "", company: "",
  });
  const [filterOpen, setFilterOpen] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);

  // ─── Results State ──────────────────────────────────────────────────────
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("postedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // ─── Facets State ───────────────────────────────────────────────────────
  const [facets, setFacets] = useState<Facets | null>(null);

  // ─── Saved State ────────────────────────────────────────────────────────
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [savedPage, setSavedPage] = useState<"browse" | "saved">("browse");

  // ─── Job Detail State ───────────────────────────────────────────────────
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"overview" | "requirements" | "skills" | "company" | "ai-match" | "missing-skills">("overview");
  const [aiMatch, setAiMatch] = useState<AIMatch | null>(null);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [missingSkills, setMissingSkills] = useState<MissingSkills | null>(null);
  const [missingSkillsLoading, setMissingSkillsLoading] = useState(false);

  // ─── Sidebar State ──────────────────────────────────────────────────────
  const [sidebarTab, setSidebarTab] = useState<"insights" | "recommended" | "trending">("insights");
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([]);
  const [trendingJobs, setTrendingJobs] = useState<TrendingJob[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // ─── View State ─────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ─── Refs ───────────────────────────────────────────────────────────────
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ─── Active Filters ─────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.location) chips.push({ key: "location", label: `Location: ${filters.location}` });
    if (filters.workMode) chips.push({ key: "workMode", label: filters.workMode });
    if (filters.employmentType) chips.push({ key: "employmentType", label: filters.employmentType });
    if (filters.experienceMin) chips.push({ key: "experienceMin", label: `Min Exp: ${filters.experienceMin}y` });
    if (filters.experienceMax) chips.push({ key: "experienceMax", label: `Max Exp: ${filters.experienceMax}y` });
    if (filters.salaryMin) chips.push({ key: "salaryMin", label: `Min Salary: ${filters.salaryMin}` });
    if (filters.salaryMax) chips.push({ key: "salaryMax", label: `Max Salary: ${filters.salaryMax}` });
    if (filters.industry) chips.push({ key: "industry", label: filters.industry });
    if (filters.education) chips.push({ key: "education", label: filters.education });
    if (filters.companySize) chips.push({ key: "companySize", label: `Size: ${filters.companySize}` });
    if (filters.source) chips.push({ key: "source", label: filters.source });
    if (filters.postedWithin) chips.push({ key: "postedWithin", label: `Posted: ${POSTED_WITHIN.find(p => p.value === filters.postedWithin)?.label || filters.postedWithin}` });
    if (filters.company) chips.push({ key: "company", label: filters.company });
    skillTags.forEach((s, i) => chips.push({ key: `skill-${i}`, label: s }));
    return chips;
  }, [filters, skillTags]);

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchJobs = useCallback(async (pageNum: number, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params: Record<string, string> = {
        page: String(pageNum), limit: String(PAGE_LIMIT),
        sortBy, sortOrder: sortOrder,
      };
      if (debouncedQuery) params.query = debouncedQuery;
      if (filters.location) params.location = filters.location;
      if (filters.workMode) params.workMode = filters.workMode;
      if (filters.employmentType) params.employmentType = filters.employmentType;
      if (filters.experienceMin) params.experienceMin = filters.experienceMin;
      if (filters.experienceMax) params.experienceMax = filters.experienceMax;
      if (filters.salaryMin) params.salaryMin = filters.salaryMin;
      if (filters.salaryMax) params.salaryMax = filters.salaryMax;
      if (skillTags.length) params.skills = skillTags.join(",");
      if (filters.industry) params.industry = filters.industry;
      if (filters.education) params.education = filters.education;
      if (filters.companySize) params.companySize = filters.companySize;
      if (filters.source) params.source = filters.source;
      if (filters.postedWithin) params.postedWithin = filters.postedWithin;
      if (filters.company) params.company = filters.company;

      const res = await api.get("/discovery/jobs", { params });
      const data = res.data;
      const newJobs = data.jobs || data.data || data || [];
      const newTotal = data.total || data.totalCount || 0;

      setJobs(prev => append ? [...prev, ...newJobs] : newJobs);
      setTotal(newTotal);
      setHasMore(newJobs.length === PAGE_LIMIT);
      setError(null);
      if (data.facets) setFacets(data.facets);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to fetch jobs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedQuery, filters, sortBy, sortOrder, skillTags]);

  const fetchSavedJobs = useCallback(async () => {
    try {
      const res = await api.get("/discovery/jobs/saved");
      const data = res.data;
      // Backend returns { success: true, jobs: [...], total: N }
      const list = Array.isArray(data.jobs) ? data.jobs
        : Array.isArray(data.data) ? data.data
        : Array.isArray(data) ? data
        : [];
      setSavedJobs(list);
      // Build savedIds from the list - use the job id field
      setSavedIds(prev => {
        const next = new Set(prev);
        list.forEach((j: any) => {
          const id = j.id || j.jobListingId || j.jobId;
          if (id) next.add(id);
        });
        return next;
      });
    } catch (err) {
      console.error("[fetchSavedJobs]", err);
    }
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await api.get("/discovery/suggestions", { params: { q } });
      setSuggestions(res.data.suggestions || res.data || []);
    } catch { /* silent */ }
  }, []);

  const fetchSidebarData = useCallback(async () => {
    try {
      const [recRes, trendRes, analyticsRes] = await Promise.allSettled([
        api.get("/discovery/recommended"),
        api.get("/discovery/trending"),
        api.get("/discovery/analytics"),
      ]);
      if (recRes.status === "fulfilled") setRecommendedJobs(recRes.value.data?.jobs || recRes.value.data || []);
      if (trendRes.status === "fulfilled") setTrendingJobs(trendRes.value.data?.jobs || trendRes.value.data || []);
      if (analyticsRes.status === "fulfilled") setAnalytics(analyticsRes.value.data?.analytics || analyticsRes.value.data || null);
    } catch { /* silent */ }
  }, []);

  const fetchJobDetail = useCallback(async (jobId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/discovery/jobs/${jobId}`);
      const job = res.data.job || res.data;
      setSelectedJob(job);
    } catch {
      toast.error("Failed to load job details");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const fetchAIMatch = useCallback(async (jobId: string) => {
    setAiMatchLoading(true);
    try {
      const res = await api.post(`/discovery/jobs/${jobId}/match`);
      setAiMatch(res.data.match || res.data);
    } catch {
      toast.error("Failed to generate AI match");
    } finally {
      setAiMatchLoading(false);
    }
  }, []);

  const fetchMissingSkills = useCallback(async (jobId: string) => {
    setMissingSkillsLoading(true);
    try {
      const res = await api.post(`/discovery/jobs/${jobId}/missing-skills`);
      setMissingSkills(res.data.missingSkills || res.data);
    } catch {
      toast.error("Failed to analyze missing skills");
    } finally {
      setMissingSkillsLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSuggestions(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchSuggestions]);

  useEffect(() => {
    setPage(1);
    fetchJobs(1, false);
  }, [debouncedQuery, filters, sortBy, sortOrder, skillTags, fetchJobs]);

  useEffect(() => { fetchSavedJobs(); }, [fetchSavedJobs]);
  useEffect(() => { if (savedPage === "saved") fetchSavedJobs(); }, [savedPage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchSidebarData(); }, [fetchSidebarData]);

  // Removed IntersectionObserver - using manual pagination instead

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      location: "", workMode: "", employmentType: "", experienceMin: "", experienceMax: "",
      salaryMin: "", salaryMax: "", skills: "", industry: "", education: "",
      companySize: "", source: "", postedWithin: "", company: "",
    });
    setSkillTags([]);
    setSearchQuery("");
    setDebouncedQuery("");
  }, []);

  const removeFilter = useCallback((key: string) => {
    if (key.startsWith("skill-")) {
      const idx = parseInt(key.split("-")[1]);
      setSkillTags(prev => prev.filter((_, i) => i !== idx));
    } else {
      setFilters(prev => ({ ...prev, [key]: "" }));
    }
  }, []);

  const addSkillTag = useCallback(() => {
    const trimmed = skillInput.trim();
    if (trimmed && !skillTags.includes(trimmed)) {
      setSkillTags(prev => [...prev, trimmed]);
      setSkillInput("");
    }
  }, [skillInput, skillTags]);

  const removeSkillTag = useCallback((tag: string) => {
    setSkillTags(prev => prev.filter(t => t !== tag));
  }, []);

  const toggleSave = useCallback(async (jobId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const isSaved = savedIds.has(jobId);
    setSavedIds(prev => { const next = new Set(prev); if (isSaved) next.delete(jobId); else next.add(jobId); return next; });
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved: !isSaved } : j));
    if (selectedJob?.id === jobId) setSelectedJob(prev => prev ? { ...prev, isSaved: !isSaved } : prev);

    try {
      await api.post(`/discovery/jobs/${jobId}/save`);
      fetchSavedJobs();
    } catch {
      setSavedIds(prev => { const next = new Set(prev); if (isSaved) next.add(jobId); else next.delete(jobId); return next; });
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved } : j));
      toast.error("Failed to update save status");
    }
  }, [savedIds, selectedJob, fetchSavedJobs]);

  const openJobDetail = useCallback((job: Job) => {
    setSelectedJob(job);
    setDetailTab("overview");
    setAiMatch(null);
    setMissingSkills(null);
    fetchJobDetail(job.id);
  }, [fetchJobDetail]);

  const closeJobDetail = useCallback(() => {
    setSelectedJob(null);
    setAiMatch(null);
    setMissingSkills(null);
  }, []);

  const handleCopyLink = useCallback((url?: string) => {
    const link = url || `${window.location.origin}/jobs/${selectedJob?.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  }, [selectedJob]);

  const handleShare = useCallback(async (job: Job) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${job.title} at ${job.company}`, url: job.applyUrl || `${window.location.origin}/jobs/${job.id}` });
      } catch { /* user cancelled */ }
    } else {
      handleCopyLink(job.applyUrl);
    }
  }, [handleCopyLink]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === "desc" ? "asc" : "desc");
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const renderFilterSidebar = (isMobile = false) => (
    <div className={isMobile ? "fixed inset-0 z-50" : "w-64 shrink-0 hidden lg:block"}
      style={isMobile ? { background: c.overlay } : undefined}
      onClick={isMobile ? () => setMobileFiltersOpen(false) : undefined}>
      <motion.div variants={isMobile ? slideFromLeft : undefined} initial={isMobile ? "hidden" : undefined}
        animate={isMobile ? "visible" : undefined} exit={isMobile ? "exit" : undefined}
        className={`${isMobile ? "w-80 h-full overflow-y-auto" : ""} space-y-4 p-4 rounded-2xl border`}
        style={{ background: c.cardBg, borderColor: c.border }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
            <Filter size={14} style={{ color: c.primary }} /> Filters
          </h3>
          <button onClick={isMobile ? () => setMobileFiltersOpen(false) : () => setFilterOpen(false)}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: c.textMuted }}>
            <X size={14} />
          </button>
        </div>

        {/* Work Mode */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Work Mode</span>
          <div className="flex flex-wrap gap-1.5">
            {WORK_MODES.map(mode => (
              <button key={mode} onClick={() => handleFilterChange("workMode", filters.workMode === mode ? "" : mode)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-[1.03]"
                style={{
                  background: filters.workMode === mode ? "rgba(245,158,11,0.12)" : c.surface,
                  color: filters.workMode === mode ? c.primary : c.textMuted,
                  borderColor: filters.workMode === mode ? "rgba(245,158,11,0.25)" : c.border,
                }}>{mode}</button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Location</span>
          <input type="text" placeholder="City, state, or country..." value={filters.location}
            onChange={e => handleFilterChange("location", e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all"
            style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
        </div>

        {/* Employment Type */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Employment Type</span>
          <div className="flex flex-wrap gap-1.5">
            {EMPLOYMENT_TYPES.map(type => (
              <button key={type} onClick={() => handleFilterChange("employmentType", filters.employmentType === type ? "" : type)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all hover:scale-[1.03]"
                style={{
                  background: filters.employmentType === type ? "rgba(245,158,11,0.12)" : c.surface,
                  color: filters.employmentType === type ? c.primary : c.textMuted,
                  borderColor: filters.employmentType === type ? "rgba(245,158,11,0.25)" : c.border,
                }}>{type}</button>
            ))}
          </div>
        </div>

        {/* Experience Range */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Experience (Years)</span>
          <div className="flex gap-2">
            <input type="number" min={0} max={30} placeholder="Min" value={filters.experienceMin}
              onChange={e => handleFilterChange("experienceMin", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
            <input type="number" min={0} max={30} placeholder="Max" value={filters.experienceMax}
              onChange={e => handleFilterChange("experienceMax", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>
        </div>

        {/* Salary Range */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Salary (Per Annum)</span>
          <div className="flex gap-2">
            <input type="number" min={0} placeholder="Min" value={filters.salaryMin}
              onChange={e => handleFilterChange("salaryMin", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
            <input type="number" min={0} placeholder="Max" value={filters.salaryMax}
              onChange={e => handleFilterChange("salaryMax", e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>
        </div>

        {/* Skills */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Skills</span>
          <div className="flex gap-2">
            <input type="text" placeholder="Add skill..." value={skillInput}
              onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkillTag(); } }}
              className="flex-1 px-3 py-2 rounded-lg text-xs border outline-none transition-all"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
            <button onClick={addSkillTag}
              className="px-3 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{ background: `${c.primary}20`, color: c.primary }}>Add</button>
          </div>
          {skillTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {skillTags.map(tag => (
                <span key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition-all hover:scale-[1.03]"
                  style={{ background: "rgba(245,158,11,0.06)", color: c.primary, borderColor: "rgba(245,158,11,0.18)" }}
                  onClick={() => removeSkillTag(tag)}>{tag} <X size={10} /></span>
              ))}
            </div>
          )}
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Industry</span>
          <CustomSelect
            value={filters.industry}
            options={[{ value: "", label: "All Industries" }, ...INDUSTRIES.map(ind => ({ value: ind, label: ind }))]}
            onChange={val => handleFilterChange("industry", val)}
            placeholder="All Industries"
            c={c}
            isDark={isDark}
          />
        </div>

        {/* Education */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Education</span>
          <CustomSelect
            value={filters.education}
            options={[
              { value: "", label: "Any Education" },
              { value: "High School", label: "High School" },
              { value: "Diploma", label: "Diploma" },
              { value: "Bachelor's", label: "Bachelor's" },
              { value: "Master's", label: "Master's" },
              { value: "PhD", label: "PhD" },
            ]}
            onChange={val => handleFilterChange("education", val)}
            placeholder="Any Education"
            c={c}
            isDark={isDark}
          />
        </div>

        {/* Company Size */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Company Size</span>
          <div className="flex flex-wrap gap-1.5">
            {COMPANY_SIZES.map(size => (
              <button key={size} onClick={() => handleFilterChange("companySize", filters.companySize === size ? "" : size)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-[1.03]"
                style={{
                  background: filters.companySize === size ? "rgba(245,158,11,0.12)" : c.surface,
                  color: filters.companySize === size ? c.primary : c.textMuted,
                  borderColor: filters.companySize === size ? "rgba(245,158,11,0.25)" : c.border,
                }}>{size}</button>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Source</span>
          <div className="flex flex-wrap gap-1.5">
            {SOURCES.map(src => (
              <button key={src} onClick={() => handleFilterChange("source", filters.source === src ? "" : src)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-[1.03]"
                style={{
                  background: filters.source === src ? `${SOURCE_COLORS[src]?.bg || c.surface}` : c.surface,
                  color: filters.source === src ? (SOURCE_COLORS[src]?.text || c.primary) : c.textMuted,
                  borderColor: filters.source === src ? `${SOURCE_COLORS[src]?.text || c.primary}30` : c.border,
                }}>{src}</button>
            ))}
          </div>
        </div>

        {/* Posted Within */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Posted Within</span>
          <div className="flex flex-wrap gap-1.5">
            {POSTED_WITHIN.map(pw => (
              <button key={pw.value} onClick={() => handleFilterChange("postedWithin", filters.postedWithin === pw.value ? "" : pw.value)}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all hover:scale-[1.03]"
                style={{
                  background: filters.postedWithin === pw.value ? "rgba(245,158,11,0.12)" : c.surface,
                  color: filters.postedWithin === pw.value ? c.primary : c.textMuted,
                  borderColor: filters.postedWithin === pw.value ? "rgba(245,158,11,0.25)" : c.border,
                }}>{pw.label}</button>
            ))}
          </div>
        </div>

        {/* Company */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Company</span>
          <input type="text" placeholder="Search company..." value={filters.company}
            onChange={e => handleFilterChange("company", e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs border outline-none transition-all"
            style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
        </div>

        {/* Clear All */}
        {activeFilters.length > 0 && (
          <button onClick={clearAllFilters}
            className="w-full py-2.5 rounded-xl text-[11px] font-bold border transition-all hover:scale-[1.02]"
            style={{ borderColor: "rgba(239,68,68,0.2)", color: "#ef4444", background: "rgba(239,68,68,0.05)" }}>
            Clear All Filters ({activeFilters.length})
          </button>
        )}

        {/* Facets quick info */}
        {facets && (
          <div className="pt-2 border-t space-y-2" style={{ borderColor: c.border }}>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Quick Stats</span>
            <div className="space-y-1">
              {facets.workModes?.slice(0, 3).map(m => (
                <div key={m.name} className="flex items-center justify-between text-[11px]">
                  <span style={{ color: c.textMuted }}>{m.name}</span>
                  <span className="font-bold" style={{ color: c.text }}>{formatCap99(m.count)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );

  const renderJobCard = (job: Job, index: number) => {
    const modeColor = MODE_COLORS[job.mode] || MODE_COLORS["On-site"];
    const sourceColor = SOURCE_COLORS[job.source || ""] || { bg: c.surface, text: c.textMuted };

    return (
      <motion.div key={job.id} custom={index % PAGE_LIMIT} variants={cardHover} initial="rest" whileHover="hover"
        className="rounded-2xl border p-5 cursor-pointer group transition-all duration-200 relative overflow-hidden"
        style={{ background: c.cardBg, borderColor: c.border }} onClick={() => openJobDetail(job)}>

        {job.isFeatured && (
          <div className="absolute top-0 right-0">
            <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-bl-xl"
              style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
              <Star size={8} className="inline mr-1" /> Featured
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 mb-3">
          <CompanyLogo company={job.company} logoUrl={job.logoUrl} />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate group-hover:text-amber-400 transition-colors" style={{ color: c.text }}>
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-semibold truncate" style={{ color: c.textSec }}>{job.company}</span>
              {job.matchScore != null && job.matchScore > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                  {job.matchScore}% match
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            {job.matchScore != null && job.matchScore > 0 && <ScoreCircle score={job.matchScore} size={36} />}
            <button onClick={e => toggleSave(job.id, e)}
              className="p-2 rounded-lg transition-all hover:scale-110 cursor-pointer bg-transparent border-none"
              style={{ color: job.isSaved || savedIds.has(job.id) ? "#f59e0b" : c.textMuted }}
              aria-label={job.isSaved || savedIds.has(job.id) ? "Unsave job" : "Save job"}>
              {job.isSaved || savedIds.has(job.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.mode && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border"
              style={{ background: modeColor.bg, color: modeColor.text, borderColor: `${modeColor.text}20` }}>
              <Globe size={9} /> {job.mode}
            </span>
          )}
          {job.employmentType && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border"
              style={{ background: "rgba(16,185,129,0.06)", color: "#34d399", borderColor: "rgba(16,185,129,0.12)" }}>
              <Briefcase size={9} /> {job.employmentType}
            </span>
          )}
          {job.experience && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border"
              style={{ background: "rgba(236,72,153,0.06)", color: "#f472b6", borderColor: "rgba(236,72,153,0.12)" }}>
              <Clock size={9} /> {job.experience}
            </span>
          )}
          {(job.education || job.passingYear) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border"
              style={{ background: "rgba(245,158,11,0.06)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.12)" }}>
              <GraduationCap size={9} /> {job.passingYear || job.education}
            </span>
          )}
          {job.source && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border"
              style={{ background: sourceColor.bg, color: sourceColor.text, borderColor: `${sourceColor.text}20` }}>
              {job.source}
            </span>
          )}
        </div>

        {job.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.skills.slice(0, 5).map((skill, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-[9px] font-bold border"
                style={{ background: c.surface, color: c.textMuted, borderColor: c.border }}>{skill}</span>
            ))}
            {job.skills.length > 5 && (
              <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ color: c.textMuted }}>+{job.skills.length - 5}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: c.border }}>
          <div className="flex items-center gap-3">
            {job.location && (
              <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: c.textMuted }}>
                <MapPin size={10} /> {job.location}
              </span>
            )}
            {(job.salaryMin || job.salaryMax || job.salary) && (
              <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#10b981" }}>
                <span className="font-extrabold text-[11px]">₹</span> {job.salary ? job.salary.replace("$", "₹") : formatSalary(job.salaryMin, job.salaryMax)}
              </span>
            )}
          </div>
          <span className="text-[9px] font-semibold" style={{ color: c.textMuted }}>{timeAgo(job.postedAt || (job as any).postedDate || (job as any).createdAt || (job as any).firstSeenAt)}</span>
        </div>
      </motion.div>
    );
  };

  const renderJobListCard = (job: Job, index: number) => {
    const modeColor = MODE_COLORS[job.mode] || MODE_COLORS["On-site"];
    const sourceColor = SOURCE_COLORS[job.source || ""] || { bg: c.surface, text: c.textMuted };

    return (
      <motion.div key={job.id} custom={index % PAGE_LIMIT} variants={fadeUp} initial="hidden" animate="visible"
        className="rounded-2xl border p-4 cursor-pointer group transition-all duration-200 flex items-center gap-4 hover:scale-[1.005]"
        style={{ background: c.cardBg, borderColor: c.border }} onClick={() => openJobDetail(job)}>
        <CompanyLogo company={job.company} logoUrl={job.logoUrl} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold truncate group-hover:text-amber-400 transition-colors" style={{ color: c.text }}>{job.title}</h3>
            {job.isFeatured && <Star size={12} style={{ color: "#f59e0b" }} />}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-semibold truncate" style={{ color: c.textSec }}>{job.company}</span>
            <span className="text-[10px]" style={{ color: c.textMuted }}>·</span>
            <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: c.textMuted }}>
              <MapPin size={9} /> {job.location}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {job.mode && <span className="px-2 py-0.5 rounded text-[9px] font-bold border" style={{ background: modeColor.bg, color: modeColor.text, borderColor: `${modeColor.text}20` }}>{job.mode}</span>}
            {job.employmentType && <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(16,185,129,0.06)", color: "#34d399" }}>{job.employmentType}</span>}
            {job.experience && <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(236,72,153,0.06)", color: "#f472b6" }}>{job.experience}</span>}
            {(job.education || job.passingYear) && <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(245,158,11,0.06)", color: "#f59e0b" }}>{job.passingYear || job.education}</span>}
            {job.source && <span className="px-2 py-0.5 rounded text-[9px] font-bold border" style={{ background: sourceColor.bg, color: sourceColor.text, borderColor: `${sourceColor.text}20` }}>{job.source}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          {(job.salaryMin || job.salaryMax || job.salary) && (
            <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#10b981" }}>
              <span className="font-extrabold text-[11px]">₹</span> {job.salary ? job.salary.replace("$", "₹") : formatSalary(job.salaryMin, job.salaryMax)}
            </span>
          )}
          <span className="text-[9px] font-semibold" style={{ color: c.textMuted }}>{timeAgo(job.postedAt || (job as any).postedDate || (job as any).createdAt || (job as any).firstSeenAt)}</span>
          <button onClick={e => toggleSave(job.id, e)}
            className="p-1.5 rounded-lg transition-all hover:scale-110 bg-transparent border-none cursor-pointer"
            style={{ color: job.isSaved || savedIds.has(job.id) ? "#f59e0b" : c.textMuted }}>
            {job.isSaved || savedIds.has(job.id) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
        </div>
      </motion.div>
    );
  };

  const renderSidebar = () => {
    const tabs = [
      { id: "insights" as const, label: "Insights", icon: BarChart3 },
      { id: "recommended" as const, label: "Recommended", icon: Sparkles },
      { id: "trending" as const, label: "Trending", icon: Flame },
    ];

    return (
      <div className="w-72 shrink-0 hidden xl:block space-y-4">
        <div className="flex rounded-xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.border }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setSidebarTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold transition-all"
              style={{
                background: sidebarTab === tab.id ? "rgba(245,158,11,0.12)" : "transparent",
                color: sidebarTab === tab.id ? c.primary : c.textMuted,
              }}>
              <tab.icon size={12} /><span className="hidden 2xl:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {sidebarTab === "insights" && (
            <motion.div key="insights" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }} className="space-y-4">
              <div className="rounded-2xl border p-4 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                  <Activity size={14} style={{ color: c.primary }} /> Job Market
                </h4>
                {analytics ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px]" style={{ color: c.textMuted }}>Total Jobs</span>
                      <span className="text-sm font-black" style={{ color: c.primary }}>{formatCap99(analytics.totalJobs)}</span>
                    </div>
                    {analytics.byLocation?.slice(0, 4).map((l: any) => (
                      <div key={l.name} className="flex items-center justify-between">
                        <span className="text-[11px] truncate" style={{ color: c.textMuted }}>{l.name}</span>
                        <span className="text-[11px] font-bold" style={{ color: c.text }}>{formatCap99(l.count)}</span>
                      </div>
                    ))}
                    {analytics.byIndustry?.slice(0, 4).map((ind: any) => (
                      <div key={ind.name} className="flex items-center justify-between">
                        <span className="text-[11px] truncate" style={{ color: c.textMuted }}>{ind.name}</span>
                        <span className="text-[11px] font-bold" style={{ color: c.text }}>{formatCap99(ind.count)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-4 rounded animate-pulse" style={{ background: c.surface }} />)}</div>
                )}
              </div>

              {analytics?.bySkill && analytics.bySkill.length > 0 && (
                <div className="rounded-2xl border p-4 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                  <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                    <Code2 size={14} style={{ color: c.primary }} /> Top Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analytics.bySkill.slice(0, 12).map((skill: any, i: number) => (
                      <span key={skill.name} className="px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer transition-all hover:scale-[1.03]"
                        style={{
                          background: i < 3 ? "rgba(245,158,11,0.08)" : c.surface,
                          color: i < 3 ? c.primary : c.textMuted,
                          borderColor: i < 3 ? "rgba(245,158,11,0.2)" : c.border,
                        }} onClick={() => { if (!skillTags.includes(skill.name)) setSkillTags(prev => [...prev, skill.name]); }}>
                        {skill.name} ({formatCap99(skill.count)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analytics?.byLocation && analytics.byLocation.length > 0 && (
                <div className="rounded-2xl border p-4 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                  <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                    <MapPin size={14} style={{ color: c.primary }} /> Top Locations
                  </h4>
                  <div className="space-y-2">
                    {analytics.byLocation.slice(0, 5).map((loc: any, i: number) => (
                      <div key={loc.name} className="flex items-center gap-2.5 cursor-pointer group/co">
                        <span className="text-[10px] font-black w-4" style={{ color: c.textMuted }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold truncate block transition-colors" style={{ color: c.text }}>{loc.name}</span>
                        </div>
                        <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>{formatCap99(loc.count)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {sidebarTab === "recommended" && (
            <motion.div key="recommended" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}
              className="rounded-2xl border p-4 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
              <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                <Sparkles size={14} style={{ color: c.primary }} /> Recommended for You
              </h4>
              {recommendedJobs.length > 0 ? (
                <div className="space-y-2.5">
                  {recommendedJobs.slice(0, 6).map((job, i) => (
                    <motion.div key={job.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                      className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      onClick={() => openJobDetail(job as any)}>
                      <CompanyLogo company={job.company} logoUrl={job.logoUrl} size={32} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold truncate block" style={{ color: c.text }}>{job.title}</span>
                        <span className="text-[10px] truncate block" style={{ color: c.textMuted }}>{job.company}</span>
                      </div>
                      {job.matchScore > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>{job.matchScore}%</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : <p className="text-[11px] text-center py-4" style={{ color: c.textMuted }}>No recommendations yet</p>}
            </motion.div>
          )}

          {sidebarTab === "trending" && (
            <motion.div key="trending" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}
              className="rounded-2xl border p-4 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
              <h4 className="text-xs font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                <Flame size={14} style={{ color: "#ef4444" }} /> Trending Jobs
              </h4>
              {trendingJobs.length > 0 ? (
                <div className="space-y-2.5">
                  {trendingJobs.slice(0, 6).map((job, i) => (
                    <motion.div key={job.id} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                      className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all hover:bg-white/5"
                      onClick={() => openJobDetail(job as any)}>
                      <span className="text-[10px] font-black w-4" style={{ color: i < 3 ? "#ef4444" : c.textMuted }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-bold truncate block" style={{ color: c.text }}>{job.title}</span>
                        <span className="text-[10px] truncate block" style={{ color: c.textMuted }}>{job.company}</span>
                      </div>
                      <span className="text-[9px] flex items-center gap-0.5" style={{ color: c.textMuted }}>
                        <Eye size={9} /> {job.viewsCount}
                      </span>
                    </motion.div>
                  ))}
                </div>
              ) : <p className="text-[11px] text-center py-4" style={{ color: c.textMuted }}>No trending data</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderJobDetailModal = () => {
    if (!selectedJob) return null;

    const detailTabs = [
      { id: "overview" as const, label: "Overview", icon: FileText },
      { id: "requirements" as const, label: "Requirements", icon: CheckCircle2 },
      { id: "skills" as const, label: "Skills", icon: Code2 },
      { id: "company" as const, label: "Company", icon: Building2 },
      { id: "ai-match" as const, label: "AI Match", icon: Sparkles },
      { id: "missing-skills" as const, label: "Missing Skills", icon: Target },
    ];
    const modeColor = MODE_COLORS[selectedJob.mode] || MODE_COLORS["On-site"];

    return (
      <AnimatePresence>
        <motion.div variants={modalOverlay} initial="hidden" animate="visible" exit="exit"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pt-16 sm:pt-20 pb-6"
          style={{ background: c.overlay, backdropFilter: "blur(8px)" }} onClick={closeJobDetail}>
          <motion.div variants={modalContent} initial="hidden" animate="visible" exit="exit"
            className="w-full max-w-4xl max-h-[calc(100vh-5.5rem)] my-auto rounded-2xl border overflow-hidden flex flex-col shadow-2xl"
            style={{ background: isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.98)", borderColor: c.border }}
            onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div className="flex items-start gap-4 p-6 pb-4 border-b shrink-0" style={{ borderColor: c.border, background: isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.98)" }}>
              <CompanyLogo company={selectedJob.company} logoUrl={selectedJob.logoUrl} size={56} />
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>{selectedJob.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold" style={{ color: c.textSec }}>{selectedJob.company}</span>
                  {selectedJob.location && (<>
                    <span style={{ color: c.textMuted }}>·</span>
                    <span className="text-xs font-semibold flex items-center gap-1" style={{ color: c.textMuted }}>
                      <MapPin size={11} /> {selectedJob.location}
                    </span>
                  </>)}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedJob.mode && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                      style={{ background: modeColor.bg, color: modeColor.text, borderColor: `${modeColor.text}25` }}>
                      <Globe size={10} /> {selectedJob.mode}
                    </span>
                  )}
                  {selectedJob.employmentType && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                      style={{ background: "rgba(16,185,129,0.08)", color: "#34d399", borderColor: "rgba(16,185,129,0.15)" }}>
                      <Briefcase size={10} /> {selectedJob.employmentType}
                    </span>
                  )}
                  {selectedJob.experience && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                      style={{ background: "rgba(236,72,153,0.08)", color: "#f472b6", borderColor: "rgba(236,72,153,0.15)" }}>
                      <Clock size={10} /> {selectedJob.experience}
                    </span>
                  )}
                  {(selectedJob.education || selectedJob.passingYear) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                      style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.15)" }}>
                      <GraduationCap size={10} /> {selectedJob.passingYear || selectedJob.education}
                    </span>
                  )}
                  {(selectedJob.salaryMin || selectedJob.salaryMax || selectedJob.salary) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>
                      <DollarSign size={10} /> {selectedJob.salary || formatSalary(selectedJob.salaryMin, selectedJob.salaryMax)}
                    </span>
                  )}
                  {selectedJob.source && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border"
                      style={{ background: SOURCE_COLORS[selectedJob.source]?.bg || c.surface, color: SOURCE_COLORS[selectedJob.source]?.text || c.textMuted, borderColor: `${SOURCE_COLORS[selectedJob.source]?.text || c.textMuted}25` }}>
                      {selectedJob.source}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={closeJobDetail}
                className="p-2 rounded-xl transition-all hover:scale-110 bg-transparent border-none cursor-pointer" style={{ color: c.textMuted }}>
                <X size={20} />
              </button>
            </div>

            {/* Detail Tabs */}
            <div className="flex border-b overflow-x-auto shrink-0" style={{ borderColor: c.border, background: isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.98)" }}>
              {detailTabs.map(tab => (
                <button key={tab.id} onClick={() => {
                  setDetailTab(tab.id);
                  if (tab.id === "ai-match" && !aiMatch && !aiMatchLoading) fetchAIMatch(selectedJob.id);
                  if (tab.id === "missing-skills" && !missingSkills && !missingSkillsLoading) fetchMissingSkills(selectedJob.id);
                }}
                  className="flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold whitespace-nowrap transition-all border-b-2"
                  style={{ borderBottomColor: detailTab === tab.id ? c.primary : "transparent", color: detailTab === tab.id ? c.primary : c.textMuted }}>
                  <tab.icon size={12} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {detailTab === "overview" && (
                  <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div>
                      <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                        <Briefcase size={16} style={{ color: c.primary }} />
                        About this role
                      </h4>
                      <div className="p-5 rounded-2xl border leading-relaxed text-sm space-y-4" style={{ background: c.surface, borderColor: c.border, color: c.textSec }}>
                        {(() => {
                          const rawDesc = selectedJob.description || `We are looking for a ${selectedJob.employmentType?.toLowerCase() || "full-time"} ${selectedJob.title} to join ${selectedJob.company}. This is a ${selectedJob.mode?.toLowerCase() || "flexible"} position based in ${selectedJob.location || "flexible location"}.`;
                          
                          let text = rawDesc;
                          if (/<[a-z][\s\S]*>/i.test(text)) {
                            text = text
                              .replace(/<(h[1-6]|strong|b)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, "\n\n### $3\n\n")
                              .replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi, "\n- $2")
                              .replace(/<\/(p|div|section|article)>/gi, "\n\n")
                              .replace(/<br\s*\/?>/gi, "\n")
                              .replace(/<[^>]+>/g, " ");
                          }

                          text = text.replace(/([a-z0-9])\.([A-Z])/g, "$1. $2");

                          const headerKeywords = [
                            "Who We Are", "About Us", "About The Role", "About The Company", "About Notion", "About NetApp",
                            "Position Overview", "Role Overview", "Job Summary", "Job Requirements", "Role Summary",
                            "Key Responsibilities", "Core Responsibilities", "Primary Responsibilities", "Responsibilities",
                            "What You'll Achieve", "What You'll Do", "What You'll Need", "What You'll Bring", "What You Will Do", "What You Will Bring",
                            "What We Look For", "What We're Looking For", "What We Offer", "Why Join Us",
                            "Requirements", "Qualifications", "Minimum Qualifications", "Preferred Qualifications", "Basic Qualifications",
                            "Bonus Points", "Nice To Have", "Perks & Benefits", "Benefits & Perks", "Benefits"
                          ];

                          headerKeywords.forEach(kw => {
                            const esc = kw.replace("'", "\\'");
                            const reg = new RegExp(`(?<=[a-z0-9.]|^)\\s*(${esc})(?=[A-Z0-9\\s]|$)`, "gi");
                            text = text.replace(reg, "\n\n### $1\n\n");
                          });

                          headerKeywords.forEach(kw => {
                            const esc = kw.replace("'", "\\'");
                            const reg = new RegExp(`(###\\s*${esc})([A-Z])`, "gi");
                            text = text.replace(reg, "$1\n\n$2");
                          });

                          text = text.replace(/\n{3,}/g, "\n\n");
                          const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);

                          return blocks.map((block, idx) => {
                            const trimmed = block.trim();
                            if (trimmed.startsWith("### ")) {
                              const title = trimmed.replace("### ", "").trim();
                              return (
                                <div key={idx} className="mt-5 mb-2 pt-2 border-t first:mt-0 first:pt-0 first:border-0" style={{ borderColor: c.border }}>
                                  <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                                    style={{ color: c.primary, fontFamily: "Outfit, sans-serif" }}>
                                    <span className="w-1.5 h-3 rounded-full" style={{ background: c.primary }} />
                                    {title}
                                  </h5>
                                </div>
                              );
                            }
                            if (trimmed.includes("\n*") || trimmed.includes("\n-") || trimmed.includes("\n•") || trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
                              const lines = trimmed.split("\n").filter(l => l.trim().length > 0);
                              return (
                                <ul key={idx} className="space-y-2 my-2 pl-1">
                                  {lines.map((line, li) => (
                                    <li key={li} className="flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: c.primary }} />
                                      <span style={{ color: c.textSec }}>{line.replace(/^[-*•\d.]+\s*/, "")}</span>
                                    </li>
                                  ))}
                                </ul>
                              );
                            }
                            return (
                              <p key={idx} className="leading-relaxed">
                                {trimmed}
                              </p>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                          <Sparkles size={16} style={{ color: "#34d399" }} />
                          Perks & Benefits
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {selectedJob.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
                              <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "#34d399" }} />
                              <span className="text-xs font-medium leading-relaxed" style={{ color: c.textSec }}>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {detailTab === "requirements" && (
                  <motion.div key="requirements" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                    {(() => {
                      const hasReqs = selectedJob.requirements && selectedJob.requirements.length > 0;
                      const hasResps = selectedJob.responsibilities && selectedJob.responsibilities.length > 0;

                      // Fallback parser if requirements or responsibilities array is empty
                      const parseFallback = (text: string) => {
                        if (!text) return [];
                        const sentences = text.split(/\n|(?<=[.!?])\s+/);
                        const matched = sentences
                          .map(s => s.trim().replace(/^[-*•\d.]+\s*/, ""))
                          .filter(s => s.length > 20 && /\b(must|experience|proficient|knowledge|ability|degree|deliver|design|implement|develop|strong|build)\b/i.test(s));
                        return Array.from(new Set(matched)).slice(0, 8);
                      };

                      const reqsList = hasReqs ? selectedJob.requirements! : parseFallback(selectedJob.description || "");
                      const respsList = hasResps ? selectedJob.responsibilities! : [];

                      return (
                        <>
                          {reqsList.length > 0 && (
                            <div>
                              <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                                <Target size={16} style={{ color: c.primary }} />
                                Key Requirements & Qualifications ({reqsList.length})
                              </h4>
                              <div className="space-y-2.5">
                                {reqsList.map((req, i) => (
                                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border transition-all" style={{ background: c.surface, borderColor: c.border }}>
                                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: c.primary }} />
                                    <span className="text-xs leading-relaxed font-medium" style={{ color: c.textSec }}>{req}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {respsList.length > 0 && (
                            <div>
                              <h4 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                                <Zap size={16} style={{ color: "#818cf8" }} />
                                Core Responsibilities ({respsList.length})
                              </h4>
                              <div className="space-y-2.5">
                                {respsList.map((resp, i) => (
                                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border transition-all" style={{ background: c.surface, borderColor: c.border }}>
                                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "#818cf8" }} />
                                    <span className="text-xs leading-relaxed font-medium" style={{ color: c.textSec }}>{resp}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {reqsList.length === 0 && respsList.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-center border rounded-2xl p-6" style={{ background: c.surface, borderColor: c.border }}>
                              <AlertCircle size={32} style={{ color: c.textMuted }} className="mb-2" />
                              <p className="text-xs font-semibold" style={{ color: c.textMuted }}>No distinct bulleted requirements parsed for this listing.</p>
                              <p className="text-[11px] mt-1" style={{ color: c.textMuted }}>See the Overview tab for complete job description details.</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </motion.div>
                )}

                {detailTab === "skills" && (
                  <motion.div key="skills" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                        <Code2 size={16} style={{ color: c.primary }} />
                        Required Skills & Competencies ({selectedJob.skills?.length || 0})
                      </h4>
                    </div>

                    {selectedJob.skills && selectedJob.skills.length > 0 ? (
                      <div className="p-5 rounded-2xl border" style={{ background: c.surface, borderColor: c.border }}>
                        <div className="flex flex-wrap gap-2.5">
                          {selectedJob.skills.map((skill, i) => {
                            const isUserSkill = skillTags.some(t => t.toLowerCase() === skill.toLowerCase());
                            return (
                              <motion.div key={skill} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                                className="px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all hover:scale-105 cursor-default shadow-sm"
                                style={{
                                  background: isUserSkill ? "rgba(16,185,129,0.12)" : i % 3 === 0 ? "rgba(245,158,11,0.08)" : i % 3 === 1 ? "rgba(99,102,241,0.08)" : "rgba(236,72,153,0.08)",
                                  color: isUserSkill ? "#34d399" : i % 3 === 0 ? c.primary : i % 3 === 1 ? "#818cf8" : "#f472b6",
                                  borderColor: isUserSkill ? "rgba(16,185,129,0.3)" : i % 3 === 0 ? "rgba(245,158,11,0.2)" : i % 3 === 1 ? "rgba(99,102,241,0.2)" : "rgba(236,72,153,0.2)",
                                }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "currentColor" }} />
                                <span>{skill}</span>
                                {isUserSkill && (
                                  <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold uppercase tracking-wider">Matched</span>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-10 border rounded-2xl" style={{ background: c.surface, borderColor: c.border }}>
                        <Code2 size={28} style={{ color: c.textMuted }} className="mb-2" />
                        <p className="text-xs" style={{ color: c.textMuted }}>No specific skill tags listed for this position.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {detailTab === "company" && (
                  <motion.div key="company" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                    <div className="p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" style={{ background: c.surface, borderColor: c.border }}>
                      <div className="flex items-center gap-4">
                        <CompanyLogo company={selectedJob.company} logoUrl={selectedJob.logoUrl} size={64} />
                        <div>
                          <h4 className="text-lg font-bold" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>{selectedJob.company}</h4>
                          <p className="text-xs mt-0.5 flex items-center gap-2" style={{ color: c.textMuted }}>
                            {selectedJob.industry && <span>{selectedJob.industry}</span>}
                            {selectedJob.industry && selectedJob.location && <span>•</span>}
                            {selectedJob.location && <span className="flex items-center gap-1"><MapPin size={11} /> {selectedJob.location}</span>}
                          </p>
                        </div>
                      </div>
                      {selectedJob.applyUrl && (
                        <a href={selectedJob.applyUrl} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 no-underline transition-all hover:scale-105"
                          style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)", color: c.primary }}>
                          <Globe size={13} /> Visit Job Portal <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedJob.companySize && (
                        <div className="p-3.5 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
                          <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: c.textMuted }}>Company Size</span>
                          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: c.text }}>
                            <Users size={14} style={{ color: c.primary }} /> {selectedJob.companySize} employees
                          </span>
                        </div>
                      )}
                      {selectedJob.mode && (
                        <div className="p-3.5 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
                          <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: c.textMuted }}>Work Mode</span>
                          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: c.text }}>
                            <Globe size={14} style={{ color: "#818cf8" }} /> {selectedJob.mode}
                          </span>
                        </div>
                      )}
                      {selectedJob.employmentType && (
                        <div className="p-3.5 rounded-xl border" style={{ background: c.surface, borderColor: c.border }}>
                          <span className="text-[10px] font-bold uppercase block mb-1" style={{ color: c.textMuted }}>Employment</span>
                          <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: c.text }}>
                            <Briefcase size={14} style={{ color: "#34d399" }} /> {selectedJob.employmentType}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-xl border space-y-2" style={{ background: c.surface, borderColor: c.border }}>
                      <h5 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: c.textMuted }}>
                        <Building2 size={14} style={{ color: c.primary }} /> Employer Summary
                      </h5>
                      <p className="text-xs leading-relaxed" style={{ color: c.textSec }}>
                        {selectedJob.company} is currently actively hiring for {selectedJob.title} in {selectedJob.location || "flexible locations"}. 
                        Review role specifications, required technical competencies, and submit your application via the official job link.
                      </p>
                    </div>
                  </motion.div>
                )}

                {detailTab === "ai-match" && (
                  <motion.div key="ai-match" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                    {aiMatchLoading ? (
                      <div className="flex flex-col items-center py-12">
                        <Loader2 size={32} className="animate-spin mb-3" style={{ color: c.primary }} />
                        <span className="text-sm font-semibold" style={{ color: c.textMuted }}>Analyzing active CV against job criteria...</span>
                      </div>
                    ) : aiMatch ? (<>
                      <div className="flex items-center justify-between p-3.5 rounded-xl border" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }}>
                        <div className="flex items-center gap-2.5">
                          <FileText size={16} style={{ color: "#818cf8" }} />
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: c.textMuted }}>Matched Against Active CV</span>
                            <span className="text-xs font-bold" style={{ color: c.text }}>{aiMatch.activeCvName || "Active Resume Profile"}</span>
                          </div>
                        </div>
                        <button onClick={() => fetchAIMatch(selectedJob.id)} className="p-1.5 rounded-lg border transition-all hover:scale-105" style={{ background: c.surface, borderColor: c.border, color: c.textMuted }} title="Re-analyze match">
                          <RefreshCw size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-5 p-5 rounded-2xl border" style={{ background: c.surface, borderColor: c.border }}>
                        <ScoreCircle score={aiMatch.overallScore} size={72} />
                        <div>
                          <h4 className="text-base font-bold" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                            {aiMatch.overallScore >= 80 ? "Excellent Match!" : aiMatch.overallScore >= 60 ? "Good Match" : aiMatch.overallScore >= 40 ? "Moderate Match" : "Low Match"}
                          </h4>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: c.textMuted }}>
                            Your active CV matches {aiMatch.overallScore}% of key skill and experience requirements for this position.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {aiMatch.experienceMatch && <ScoreBar label="Experience Alignment" score={aiMatch.experienceMatch.score} c={c} />}
                        {aiMatch.educationMatch && <ScoreBar label="Education Alignment" score={aiMatch.educationMatch.score} c={c} />}
                      </div>

                      {aiMatch.reasons && aiMatch.reasons.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                            <Lightbulb size={14} style={{ color: c.primary }} /> Key Match Insights
                          </h5>
                          <div className="space-y-2">
                            {aiMatch.reasons.map((reason, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.15)" }}>
                                <CheckCircle2 size={14} className="mt-0.5 shrink-0" style={{ color: "#10b981" }} />
                                <span className="text-xs leading-relaxed" style={{ color: c.textSec }}>{reason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiMatch.preparationTips && aiMatch.preparationTips.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                            <Zap size={14} style={{ color: c.primary }} /> Recommendations & Next Steps
                          </h5>
                          <div className="space-y-2">
                            {aiMatch.preparationTips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border" style={{ background: "rgba(245,158,11,0.05)", borderColor: "rgba(245,158,11,0.15)" }}>
                                <ArrowRight size={14} className="mt-0.5 shrink-0" style={{ color: c.primary }} />
                                <span className="text-xs leading-relaxed" style={{ color: c.textSec }}>{tip}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>) : (
                      <div className="flex flex-col items-center py-12">
                        <Sparkles size={36} style={{ color: c.primary }} className="mb-3 animate-pulse" />
                        <p className="text-sm font-semibold" style={{ color: c.text }}>Analyze Job Match with Active CV</p>
                        <p className="text-xs text-center max-w-xs mt-1 mb-4" style={{ color: c.textMuted }}>Compare your active resume and candidate profile against the requirements for {selectedJob.title}.</p>
                        <button onClick={() => fetchAIMatch(selectedJob.id)}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-md flex items-center gap-2"
                          style={{ background: c.primary, color: "#000" }}>
                          <Sparkles size={14} /> Analyze Match Now
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {detailTab === "missing-skills" && (
                  <motion.div key="missing-skills" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                    {missingSkillsLoading ? (
                      <div className="flex flex-col items-center py-12">
                        <Loader2 size={32} className="animate-spin mb-3" style={{ color: c.primary }} />
                        <span className="text-sm font-semibold" style={{ color: c.textMuted }}>Comparing resume skills against job requirements...</span>
                      </div>
                    ) : missingSkills ? (
                      (() => {
                        const skillsList = missingSkills.skills || (missingSkills.missingTechnicalSkills || []).map(item => ({
                          name: item.skill,
                          importance: item.importance || "High",
                          timeToLearn: `${item.estimatedWeeks || 2} weeks`,
                          resources: (item.resources || []).map(r => ({ title: typeof r === "string" ? r : "Learning resource", url: "#", type: "course" }))
                        }));

                        return (<>
                          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}>
                            <Target size={22} style={{ color: c.primary }} />
                            <div>
                              <span className="text-sm font-bold block" style={{ color: c.text }}>{skillsList.length} skill gaps identified</span>
                              <span className="text-[11px]" style={{ color: c.textMuted }}>Acquiring these key competencies will maximize your interview shortlist chances</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {skillsList.map((skill, i) => (
                              <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" animate="visible"
                                className="p-4 rounded-xl border space-y-3" style={{ background: c.surface, borderColor: c.border }}>
                                <div className="flex items-center justify-between">
                                  <h5 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text }}>
                                    <Code2 size={15} style={{ color: c.primary }} />
                                    {skill.name}
                                  </h5>
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border"
                                    style={{
                                      background: skill.importance?.toLowerCase() === "high" || skill.importance === "critical" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                                      color: skill.importance?.toLowerCase() === "high" || skill.importance === "critical" ? "#ef4444" : "#f59e0b",
                                      borderColor: skill.importance?.toLowerCase() === "high" || skill.importance === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                                    }}>{skill.importance || "High"} Importance</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock size={12} style={{ color: c.textMuted }} />
                                  <span className="text-[11px]" style={{ color: c.textMuted }}>Est. Time to Learn: <strong style={{ color: c.text }}>{skill.timeToLearn}</strong></span>
                                </div>
                                {skill.resources && skill.resources.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: c.textMuted }}>Recommended Resources</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {skill.resources.map((res, ri) => (
                                        <a key={ri} href={res.url} target="_blank" rel="noopener noreferrer"
                                          className="flex items-center gap-2 p-2 rounded-lg border transition-all hover:border-amber-500/40 no-underline"
                                          style={{ background: c.cardBg, borderColor: c.border }}>
                                          {res.type === "course" ? <BookOpen size={12} style={{ color: c.primary }} /> : <ExternalLink size={12} style={{ color: c.primary }} />}
                                          <span className="text-xs font-medium truncate" style={{ color: c.text }}>{res.title}</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </>);
                      })()
                    ) : (
                      <div className="flex flex-col items-center py-12">
                        <Target size={36} style={{ color: c.primary }} className="mb-3 animate-bounce" />
                        <p className="text-sm font-semibold" style={{ color: c.text }}>Analyze Skill Gaps with Active CV</p>
                        <p className="text-xs text-center max-w-xs mt-1 mb-4" style={{ color: c.textMuted }}>Find out which skills in this job description are missing from your active resume.</p>
                        <button onClick={() => fetchMissingSkills(selectedJob.id)}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:scale-105 shadow-md flex items-center gap-2"
                          style={{ background: c.primary, color: "#000" }}>
                          <Target size={14} /> Analyze Skill Gaps
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t" style={{ borderColor: c.border }}>
              <span className="text-[11px]" style={{ color: c.textMuted }}>Posted {timeAgo(selectedJob.postedAt)}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleSave(selectedJob.id)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 flex items-center gap-1.5"
                  style={{
                    background: savedIds.has(selectedJob.id) ? "rgba(245,158,11,0.12)" : "transparent",
                    borderColor: savedIds.has(selectedJob.id) ? "rgba(245,158,11,0.3)" : c.border,
                    color: savedIds.has(selectedJob.id) ? c.primary : c.textMuted,
                  }}>
                  {savedIds.has(selectedJob.id) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  {savedIds.has(selectedJob.id) ? "Saved" : "Save"}
                </button>
                <button onClick={() => handleShare(selectedJob)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 flex items-center gap-1.5"
                  style={{ borderColor: c.border, color: c.textMuted }}>
                  <Share2 size={14} /> Share
                </button>
                <button onClick={() => handleCopyLink()}
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 flex items-center gap-1.5"
                  style={{ borderColor: c.border, color: c.textMuted }}>
                  <Copy size={14} /> Copy
                </button>
                {selectedJob.applyUrl && (
                  <a href={selectedJob.applyUrl} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 flex items-center gap-1.5 no-underline"
                    style={{ background: c.primary, color: "#000" }}>
                    <ExternalLink size={14} /> Apply
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.1)" }}>
              <Briefcase size={20} style={{ color: c.primary }} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>Job Discovery</h1>
              <p className="text-[11px]" style={{ color: c.textMuted }}>
                {formatCap99(total)} jobs found {activeFilters.length > 0 ? `· ${activeFilters.length} filters` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSavedPage(prev => prev === "saved" ? "browse" : "saved")}
              className="px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 flex items-center gap-1.5 relative"
              style={{
                background: savedPage === "saved" ? "rgba(245,158,11,0.12)" : "transparent",
                borderColor: savedPage === "saved" ? "rgba(245,158,11,0.3)" : c.border,
                color: savedPage === "saved" ? c.primary : c.textMuted,
              }}>
              {savedPage === "saved" ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} Saved
              {savedIds.size > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full text-[8px] font-black flex items-center justify-center text-white"
                  style={{ background: c.primary }}>{formatCap99(savedIds.size)}</span>
              )}
            </button>
            <button onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden px-3 py-2 rounded-xl text-xs font-bold border transition-all hover:scale-105 flex items-center gap-1.5"
              style={{ borderColor: c.border, color: c.textMuted }}>
              <SlidersHorizontal size={14} /> Filters
              {activeFilters.length > 0 && (
                <span className="w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center text-white"
                  style={{ background: c.primary }}>{activeFilters.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Search & Controls Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div ref={searchRef} className="relative flex-1 min-w-[200px]">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
              <input type="text" placeholder="Search jobs, companies, skills..." value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all"
                style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setDebouncedQuery(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/5 transition-colors"
                  style={{ color: c.textMuted }}><X size={14} /></button>
              )}
            </div>
            <AnimatePresence>
              {showSuggestions && suggestions.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl border overflow-hidden z-30 shadow-lg"
                  style={{ background: isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.98)", borderColor: c.border }}>
                  {suggestions.slice(0, 8).map((sug, i) => (
                    <button key={i} onClick={() => { setSearchQuery(sug); setShowSuggestions(false); }}
                      className="w-full px-4 py-2.5 text-left text-xs font-semibold flex items-center gap-2 transition-colors hover:bg-white/5"
                      style={{ color: c.text }}><Search size={12} style={{ color: c.textMuted }} /> {sug}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setFilterOpen(o => !o)}
            className="hidden lg:flex px-3 py-3 rounded-xl text-xs font-bold border transition-all hover:scale-105 items-center gap-1.5"
            style={{
              background: filterOpen ? "rgba(245,158,11,0.12)" : "transparent",
              borderColor: filterOpen ? "rgba(245,158,11,0.3)" : c.border,
              color: filterOpen ? c.primary : c.textMuted,
            }}>
            <SlidersHorizontal size={16} /> Filters
            {activeFilters.length > 0 && (
              <span className="w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center text-white"
                style={{ background: c.primary }}>{formatCap99(activeFilters.length)}</span>
            )}
          </button>

          <CustomSelect
            value={`${sortBy}:${sortOrder}`}
            options={SORT_OPTIONS.map(opt => ({
              value: `${opt.value}:${sortOrder}`,
              label: `${opt.label} ${sortOrder === "desc" ? "↓" : "↑"}`,
            }))}
            onChange={val => {
              const [newSort, newOrder] = val.split(":");
              setSortBy(newSort);
              setSortOrder(newOrder as "asc" | "desc");
            }}
            c={c}
            isDark={isDark}
            className="w-44 shrink-0"
          />

          <button onClick={toggleSortOrder} className="p-3 rounded-xl border transition-all hover:scale-105"
            style={{ borderColor: c.border, color: c.textMuted }} title={`Sort ${sortOrder === "desc" ? "ascending" : "descending"}`}>
            <ArrowUpDown size={16} />
          </button>

          <div className="flex rounded-xl border overflow-hidden" style={{ borderColor: c.border }}>
            <button onClick={() => setViewMode("grid")} className="p-2.5 transition-all"
              style={{ background: viewMode === "grid" ? `${c.primary}15` : "transparent", color: viewMode === "grid" ? c.primary : c.textMuted }}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode("list")} className="p-2.5 transition-all"
              style={{ background: viewMode === "list" ? `${c.primary}15` : "transparent", color: viewMode === "list" ? c.primary : c.textMuted }}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Active:</span>
            <AnimatePresence>
              {activeFilters.map(chip => (
                <FilterChip key={chip.key} label={chip.label} onRemove={() => removeFilter(chip.key)} c={c} />
              ))}
            </AnimatePresence>
            <button onClick={clearAllFilters}
              className="text-[10px] font-bold px-2 py-1 rounded-lg transition-all hover:scale-105"
              style={{ color: "#ef4444", background: "rgba(239,68,68,0.06)" }}>Clear All</button>
          </div>
        )}
      </div>

      {/* ─── Main Layout ───────────────────────────────────────────────── */}
      <div className="flex gap-6">
        {filterOpen && renderFilterSidebar()}
        <AnimatePresence>{mobileFiltersOpen && renderFilterSidebar(true)}</AnimatePresence>

        {/* Center: Job Cards */}
        <div className="flex-1 min-w-0">
          {savedPage === "saved" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text, fontFamily: "Outfit, sans-serif" }}>
                  <BookmarkCheck size={16} style={{ color: c.primary }} /> Saved Jobs ({formatCap99(savedJobs.length)})
                </h2>
                <button onClick={() => setSavedPage("browse")}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                  style={{ color: c.primary, background: `${c.primary}10` }}>Browse Jobs</button>
              </div>
              {savedJobs.length > 0 ? (
                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
                  {savedJobs.map((job: any, i: number) => {
                    const j = job.jobListing || job;
                    const modeColor = MODE_COLORS[j.mode] || MODE_COLORS["On-site"];
                    return (
                      <motion.div key={j.id || i} variants={fadeUp} custom={i}
                        className="rounded-2xl border p-4 cursor-pointer group transition-all duration-200 flex items-center gap-4 hover:scale-[1.005]"
                        style={{ background: c.cardBg, borderColor: c.border }} onClick={() => openJobDetail(j)}>
                        <CompanyLogo company={j.company} logoUrl={j.logoUrl} size={40} />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold truncate group-hover:text-amber-400 transition-colors" style={{ color: c.text }}>{j.title}</h3>
                          <span className="text-[11px] font-semibold" style={{ color: c.textSec }}>{j.company}</span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {j.mode && <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: modeColor.bg, color: modeColor.text }}>{j.mode}</span>}
                            {j.employmentType && <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(16,185,129,0.06)", color: "#34d399" }}>{j.employmentType}</span>}
                            {j.experience && <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(236,72,153,0.06)", color: "#f472b6" }}>{j.experience}</span>}
                            {(j.education || j.passingYear) && <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(245,158,11,0.06)", color: "#f59e0b" }}>{j.passingYear || j.education}</span>}
                            {j.location && <span className="text-[10px] flex items-center gap-0.5" style={{ color: c.textMuted }}><MapPin size={9} /> {j.location}</span>}
                          </div>
                          {(j.salary || j.salaryMin || j.salaryMax) && (
                            <div className="mt-1.5 text-[10px] font-bold flex items-center gap-1" style={{ color: "#10b981" }}>
                              <span className="font-extrabold text-[11px]">₹</span> {j.salary || formatSalary(j.salaryMin, j.salaryMax)}
                            </div>
                          )}
                        </div>
                        <button onClick={e => { e.stopPropagation(); toggleSave(j.id); }}
                          className="p-2 rounded-lg transition-all hover:scale-110 bg-transparent border-none cursor-pointer"
                          style={{ color: "#ef4444" }}><Bookmark size={16} /></button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center py-20">
                  <Bookmark size={40} style={{ color: c.textMuted }} className="mb-3" />
                  <p className="text-sm font-bold" style={{ color: c.text }}>No saved jobs yet</p>
                  <p className="text-xs mt-1" style={{ color: c.textMuted }}>Save jobs to view them here</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {loading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} c={c} />)}
                </div>
              ) : error ? (
                <div className="flex flex-col items-center py-20">
                  <AlertCircle size={40} style={{ color: "#ef4444" }} className="mb-3" />
                  <p className="text-sm font-bold" style={{ color: c.text }}>Something went wrong</p>
                  <p className="text-xs mt-1 mb-4" style={{ color: c.textMuted }}>{error}</p>
                  <button onClick={() => fetchJobs(1, false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105"
                    style={{ background: c.primary, color: "#000" }}>
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : jobs.length === 0 ? (
                <EmptyState c={c} onClearFilters={clearAllFilters} />
              ) : (
                <>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
                    {jobs.map((job, i) => viewMode === "grid" ? renderJobCard(job, i) : renderJobListCard(job, i))}
                  </div>

                  {/* Pagination Controls */}
                  {jobs.length > 0 && (
                    <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t mt-6 pt-6" style={{ borderColor: c.border }}>
                      <div className="text-xs font-semibold" style={{ color: c.textMuted }}>
                        Showing {((page - 1) * PAGE_LIMIT) + 1} - {Math.min(page * PAGE_LIMIT, total)} of {formatCap99(total)} jobs
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (page > 1) {
                              const newPage = page - 1;
                              setPage(newPage);
                              fetchJobs(newPage, false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          disabled={page === 1 || loading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ 
                            borderColor: c.border, 
                            color: c.text, 
                            background: c.cardBg 
                          }}
                        >
                          <ChevronLeft size={14} />
                          Previous
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(Math.ceil(total / PAGE_LIMIT), 5) }, (_, i) => {
                            const totalPages = Math.ceil(total / PAGE_LIMIT);
                            let pageNum;
                            
                            // Show first 5 pages, or pages around current page
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => {
                                  setPage(pageNum);
                                  fetchJobs(pageNum, false);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={loading}
                                className="w-8 h-8 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed"
                                style={{
                                  background: page === pageNum ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : c.surface,
                                  color: page === pageNum ? '#000' : c.textSec,
                                  border: page === pageNum ? 'none' : `1px solid ${c.border}`,
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => {
                            const totalPages = Math.ceil(total / PAGE_LIMIT);
                            if (page < totalPages) {
                              const newPage = page + 1;
                              setPage(newPage);
                              fetchJobs(newPage, false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }
                          }}
                          disabled={page >= Math.ceil(total / PAGE_LIMIT) || loading}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ 
                            borderColor: c.border, 
                            color: c.text, 
                            background: c.cardBg 
                          }}
                        >
                          Next
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Right Sidebar */}
        {renderSidebar()}
      </div>

      {/* ─── Job Detail Modal ──────────────────────────────────────────── */}
      {renderJobDetailModal()}
    </div>
  );
}
