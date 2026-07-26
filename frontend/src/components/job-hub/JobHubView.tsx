"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  Briefcase, Search, Filter, MapPin, Building2, Globe, Clock, Tag, DollarSign,
  GraduationCap, Sparkles, ExternalLink, Heart, Share2, Copy, Check, X, ChevronDown,
  ChevronRight, Send, Loader2, AlertCircle, RefreshCw, ArrowUpDown, SlidersHorizontal,
  Users, Target, Shield, Zap, MessageSquare, FileText, Award, BookOpen, Code2,
  TrendingUp, Star, Bookmark, BookmarkCheck, Building, MapPinned, CalendarDays,
  BarChart3, Brain, Mic, Lightbulb, ArrowRight, Paperclip, Bot, CircleDot,
  GitBranch, Trophy, Flame, Eye, ThumbsUp, ArrowUpRight, Info, User, Layers,
  CheckCircle2, AlertTriangle, Phone, Mail, Globe2, Link2, Download, Flag,
  Activity, Hash, Percent, Ruler, NotebookPen, LayoutGrid, List, MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface JobHubProps {
  setView?: (view: string) => void;
  activeModule?: string;
  theme?: string;
}

interface JobListing {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  logoBg?: string;
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
  postedDate: string;
  isFeatured?: boolean;
  isSaved?: boolean;
  isGovernment?: boolean;
  isAdzuna?: boolean;
  isLinkedIn?: boolean;
  matchScore?: number;
  applyUrl?: string;
  category?: string;
  country?: string;
  state?: string;
  city?: string;
  companyId?: string;
}

const ADZUNA_COUNTRIES = [
  { code: "gb", name: "United Kingdom" },
  { code: "us", name: "United States" },
  { code: "in", name: "India" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "au", name: "Australia" },
  { code: "ca", name: "Canada" },
  { code: "nz", name: "New Zealand" },
  { code: "br", name: "Brazil" },
  { code: "pl", name: "Poland" },
  { code: "at", name: "Austria" },
  { code: "za", name: "South Africa" },
  { code: "be", name: "Belgium" },
  { code: "ch", name: "Switzerland" },
  { code: "es", name: "Spain" },
  { code: "it", name: "Italy" },
  { code: "mx", name: "Mexico" },
  { code: "nl", name: "Netherlands" },
  { code: "sg", name: "Singapore" },
];

interface JobStats {
  total: number;
  remote: number;
  featured: number;
  government?: number;
}

interface ReferralRequest {
  id: string;
  company: string;
  role: string;
  notes: string;
  status: string;
  outreachMessage?: string;
  createdAt: string;
}

interface HiringChallenge {
  id: string;
  title: string;
  company: string;
  category: string;
  difficulty: string;
  duration: string;
  status: string;
  description?: string;
  participants?: number;
}

interface AIChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface JDAnalysis {
  overallScore: number;
  skillsMatch: { matched: string[]; missing: string[]; suggested: string[] };
  experienceMatch: { score: number; details: string };
  educationMatch: { score: number; details: string };
  atsCompatibility: { score: number; details: string };
  summary: string;
  suggestions: string[];
}

interface FilterState {
  search: string;
  company: string;
  category: string;
  location: string;
  country: string;
  state: string;
  city: string;
  mode: string;
  employmentType: string;
  experience: string;
  salaryMin: string;
  salaryMax: string;
  skills: string;
  isGovernment: boolean;
  sortBy: string;
  order: string;
  postedDate: string;
}

interface JobApplication {
  id: string;
  jobListingId: string;
  status: string;
  appliedAt: string;
  notes?: string;
  jobListing?: JobListing;
}

interface SavedJobListing {
  id: string;
  jobListingId: string;
  createdAt: string;
  jobListing?: JobListing;
}

type TrackerColumn =
  | "saved"
  | "applied"
  | "under_review"
  | "shortlisted"
  | "interview_scheduled"
  | "offer_received"
  | "rejected";

type SortOption = { value: string; label: string };

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "browse", label: "Browse", icon: Briefcase, module: "job-matching" },
  { id: "ai-match", label: "AI Match", icon: Sparkles, module: "job-jd-match" },
  { id: "tracker", label: "Tracker", icon: BarChart3, module: "job-tracker" },
  { id: "saved", label: "Saved", icon: Bookmark, module: "job-saved" },
  { id: "referrals", label: "Referrals", icon: Users, module: "job-referrals" },
  { id: "challenges", label: "Challenges", icon: Trophy, module: "job-challenges" },
] as const;

const SORT_OPTIONS: SortOption[] = [
  { value: "postedDate:desc", label: "Most Recent" },
  { value: "salaryMax:desc", label: "Salary (High-Low)" },
  { value: "experienceMin:asc", label: "Experience (Low-High)" },
];

const MODE_OPTIONS = ["Remote", "Hybrid", "On-site"];
const EMPLOYMENT_TYPES = ["Full-Time", "Part-Time", "Contract", "Freelance", "Government"];
const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const PAGE_LIMIT = 12;

const LINKEDIN_QUICK_FILTERS = [
  { label: "Internships", suffix: "&f_E=1&f_JT=I" },
  { label: "Entry Level", suffix: "&f_E=2" },
  { label: "Remote", suffix: "&f_WT=2" },
  { label: "Full-time", suffix: "&f_JT=F" },
  { label: "Last 24h", suffix: "&f_TPR=r86400" },
  { label: "Past Week", suffix: "&f_TPR=r604800" },
];

type JobSource = "adzuna" | "linkedin";

const TRACKER_COLUMNS: { id: TrackerColumn; label: string; color: string }[] = [
  { id: "saved", label: "Saved", color: "#6366f1" },
  { id: "applied", label: "Applied", color: "#f59e0b" },
  { id: "under_review", label: "Under Review", color: "#8b5cf6" },
  { id: "shortlisted", label: "Shortlisted", color: "#06b6d4" },
  { id: "interview_scheduled", label: "Interview", color: "#10b981" },
  { id: "offer_received", label: "Offer", color: "#22c55e" },
  { id: "rejected", label: "Rejected", color: "#ef4444" },
];

const AI_QUICK_ACTIONS = [
  { id: "recommend", label: "Recommend jobs", icon: Target, prompt: "Recommend jobs based on my profile" },
  { id: "interview-prep", label: "Interview prep", icon: Mic, prompt: "Help me prepare for interviews" },
  { id: "salary-insights", label: "Salary insights", icon: DollarSign, prompt: "Give me salary insights" },
  { id: "cover-letter", label: "Cover letter", icon: FileText, prompt: "Generate a cover letter" },
  { id: "skill-gap", label: "Skill gap", icon: GitBranch, prompt: "Analyze my skill gap" },
  { id: "career-chat", label: "Career chat", icon: MessageSquare, prompt: "Let's chat about my career" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35 } }),
};

const tabContent = {
  hidden: { opacity: 0, x: 15 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, x: -15, transition: { duration: 0.2, ease: "easeIn" as const } },
};

const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.01, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function getDifficultyColor(d: string): string {
  const map: Record<string, string> = {
    Beginner: "#10b981", Intermediate: "#f59e0b", Advanced: "#f97316", Expert: "#ef4444"
  };
  return map[d] || "#64748b";
}

function getStatusColor(s: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    active: { bg: "rgba(16,185,129,0.1)", text: "#10b981" },
    open: { bg: "rgba(16,185,129,0.1)", text: "#10b981" },
    completed: { bg: "rgba(99,102,241,0.1)", text: "#6366f1" },
    pending: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b" },
    closed: { bg: "rgba(100,116,139,0.1)", text: "#64748b" },
    rejected: { bg: "rgba(239,68,68,0.1)", text: "#ef4444" },
    accepted: { bg: "rgba(16,185,129,0.1)", text: "#10b981" },
    in_progress: { bg: "rgba(245,158,11,0.1)", text: "#f59e0b" },
  };
  return map[s.toLowerCase()] || { bg: "rgba(100,116,139,0.1)", text: "#64748b" };
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Logo Avatar ──────────────────────────────────────────────────────────
function CompanyLogo({ company, logoUrl, size = 44 }: { company: string; logoUrl?: string; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const cleanCompany = (company || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const domain = `${cleanCompany}.com`;
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const src = logoUrl || faviconUrl;

  if (src && !imgErr) {
    return (
      <div className="rounded-xl overflow-hidden shrink-0 border bg-white/5 p-1 flex items-center justify-center" style={{ width: size, height: size, borderColor: "rgba(255,255,255,0.08)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={company} width={size - 8} height={size - 8} style={{ objectFit: "contain", display: "block" }} onError={() => setImgErr(true)} />
      </div>
    );
  }
  return (
    <div className="rounded-xl shrink-0 flex items-center justify-center text-white font-black text-xs border"
      style={{ width: size, height: size, background: getLogoColor(company), borderColor: "rgba(255,255,255,0.06)" }}>
      {getLogoInitials(company)}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────
function SkeletonCard({ c }: { c: Record<string, string> }) {
  return (
    <div className="rounded-2xl border p-5 space-y-4 animate-pulse" style={{ background: c.cardBg, borderColor: c.border }}>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl shrink-0" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="flex-1 space-y-2.5">
          <div className="h-3.5 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "70%" }} />
          <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.03)", width: "45%" }} />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.03)", width: "90%" }} />
        <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.03)", width: "75%" }} />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-6 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    </div>
  );
}

// ─── Active Filter Chip ───────────────────────────────────────────────────
function FilterChip({ label, onRemove, c }: { label: string; onRemove: () => void; c: Record<string, string> }) {
  return (
    <motion.span layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer select-none transition-all hover:scale-[1.03]"
      style={{ background: "rgba(245,158,11,0.06)", color: c.primary, borderColor: "rgba(245,158,11,0.18)" }}
      onClick={onRemove}>
      {label}
      <X size={11} />
    </motion.span>
  );
}

// ─── Score Badge ──────────────────────────────────────────────────────────
function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = getScoreColor(score);
  const sz = size === "lg" ? 56 : size === "md" ? 40 : 32;
  const fontSz = size === "lg" ? "text-sm" : size === "md" ? "text-[11px]" : "text-[9px]";
  return (
    <div className="relative flex items-center justify-center" style={{ width: sz, height: sz }}>
      <svg width={sz} height={sz} className="-rotate-90 absolute inset-0">
        <circle cx={sz / 2} cy={sz / 2} r={sz / 2 - 3} fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth={size === "lg" ? 4 : 3} />
        <circle cx={sz / 2} cy={sz / 2} r={sz / 2 - 3} fill="transparent" stroke={color} strokeWidth={size === "lg" ? 4 : 3}
          strokeDasharray={2 * Math.PI * (sz / 2 - 3)} strokeDashoffset={2 * Math.PI * (sz / 2 - 3) * (1 - score / 100)}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <span className={`font-black ${fontSz}`} style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, c, delay = 0 }: {
  label: string; value: number | string; icon: React.ReactNode; c: Record<string, string>; delay?: number;
}) {
  return (
    <motion.div custom={delay} variants={fadeUp} initial="hidden" animate="visible"
      whileHover={{ y: -3, scale: 1.01 }}
      className="p-4 border rounded-xl flex items-center justify-between" style={{ background: c.cardBg, borderColor: c.border }}>
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: c.textMuted }}>{label}</span>
        <span className="text-lg font-extrabold block" style={{ color: c.text }}>{value}</span>
      </div>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 shrink-0"
        style={{ color: c.primary }}>
        {icon}
      </div>
    </motion.div>
  );
}

// ─── Job Card ─────────────────────────────────────────────────────────────
function JobCard({ job, c, onOpen, onSave }: {
  job: JobListing; c: Record<string, string>; onOpen: () => void; onSave: () => void;
}) {
  return (
    <motion.div
      variants={cardHover} initial="rest" whileHover="hover"
      className="rounded-2xl border p-5 cursor-pointer group transition-all duration-200 relative overflow-hidden"
      style={{ background: c.cardBg, borderColor: c.border }}
      onClick={onOpen}>

      {job.isFeatured && (
        <div className="absolute top-0 right-0">
          <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-bl-xl"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            <Star size={8} className="inline mr-1" /> Featured
          </div>
        </div>
      )}

      {job.isGovernment && (
        <div className="absolute top-0 left-0">
          <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-br-xl"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <Shield size={8} className="inline mr-1" /> Govt
          </div>
        </div>
      )}

      {job.isLinkedIn && (
        <div className="absolute top-0 left-0">
          <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-br-xl"
            style={{ background: "rgba(10,102,194,0.15)", color: "#0a66c2" }}>
            <Link2 size={8} className="inline mr-1" /> LinkedIn
          </div>
        </div>
      )}

      {job.isAdzuna && (
        <div className="absolute top-0 left-0">
          <div className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-br-xl"
            style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>
            <Globe size={8} className="inline mr-1" /> External
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
        <button onClick={e => { e.stopPropagation(); onSave(); }}
          className="p-2 rounded-lg transition-all hover:scale-110 cursor-pointer bg-transparent border-none"
          style={{ color: job.isSaved ? "#f59e0b" : c.textMuted }}>
          {job.isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {job.mode && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border"
            style={{ background: "rgba(99,102,241,0.06)", color: "#818cf8", borderColor: "rgba(99,102,241,0.12)" }}>
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
      </div>

      <p className="text-[11px] leading-relaxed mb-3 line-clamp-2" style={{ color: c.textMuted }}>
        {job.description || `Looking for a ${job.employmentType?.toLowerCase()} ${job.title} to join ${job.company}.`}
      </p>

      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.skills.slice(0, 5).map((skill, i) => (
            <span key={i} className="px-2 py-0.5 rounded text-[9px] font-bold border"
              style={{ background: "rgba(255,255,255,0.02)", color: c.textMuted, borderColor: c.border }}>
              {skill}
            </span>
          ))}
          {job.skills.length > 5 && (
            <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ color: c.textMuted }}>
              +{job.skills.length - 5}
            </span>
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
          {job.salary && (
            <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: "#10b981" }}>
              <DollarSign size={10} /> {job.salary}
            </span>
          )}
        </div>
        <span className="text-[9px] font-semibold" style={{ color: c.textMuted }}>
          {timeAgo(job.postedDate)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── AI Score Bar ─────────────────────────────────────────────────────────
function ScoreBar({ label, score, c }: { label: string; score: number; c: Record<string, string> }) {
  const color = getScoreColor(score);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{label}</span>
        <span className="text-xs font-black" style={{ color }}>{score}%</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-500"
          animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function JobHubView({ setView, activeModule }: JobHubProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const c = useMemo(() => ({
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.75)" : "#334155",
    textMuted: isDark ? "rgba(255,255,255,0.45)" : "#64748b",
    cardBg: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.8)",
    cardBgHover: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(255, 255, 255, 0.95)",
    border: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
    primary: "#f59e0b",
    primaryGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    inputBg: isDark ? "rgba(0,0,0,0.2)" : "#f8fafc",
  }), [isDark]);

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<"browse" | "ai-match" | "tracker" | "saved" | "referrals" | "challenges">("browse");

  // ── Job source (Browse tab) ──
  const [jobSource, setJobSource] = useState<JobSource>("adzuna");
  const [linkedInUrl, setLinkedInUrl] = useState("https://www.linkedin.com/jobs/search/?position=1&pageNum=0");
  const [linkedInCount, setLinkedInCount] = useState(50);
  const [linkedInScraping, setLinkedInScraping] = useState(false);
  const [linkedInResults, setLinkedInResults] = useState<JobListing[]>([]);
  const [linkedInSavedIds, setLinkedInSavedIds] = useState<Set<string>>(new Set());
  const [linkedInError, setLinkedInError] = useState<string | null>(null);
  const [linkedInAnalyzingId, setLinkedInAnalyzingId] = useState<string | null>(null);

  // ── Browse state ──
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: "", company: "", category: "", location: "", country: "", state: "",
    city: "", mode: "", employmentType: "", experience: "", salaryMin: "",
    salaryMax: "", skills: "", isGovernment: false, sortBy: "postedDate",
    order: "desc", postedDate: "",
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [sortValue, setSortValue] = useState("postedDate:desc");
  const [companies, setCompanies] = useState<string[]>([]);

  // ── Job detail modal ──
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<JobListing | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [skillGap, setSkillGap] = useState<{ matched: string[]; missing: string[] } | null>(null);
  const [skillGapLoading, setSkillGapLoading] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<JobListing[]>([]);

  // ── AI Match state ──
  const [jdText, setJdText] = useState("");
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [jdAnalyzing, setJdAnalyzing] = useState(false);
  const [aiSkills, setAiSkills] = useState("");
  const [aiExperience, setAiExperience] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<JobListing[]>([]);
  const [aiRecommendLoading, setAiRecommendLoading] = useState(false);
  const [aiMatchSubTab, setAiMatchSubTab] = useState<"jd" | "recommend">("jd");

  // ── Referrals state ──
  const [referrals, setReferrals] = useState<ReferralRequest[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);
  const [refCompany, setRefCompany] = useState("");
  const [refRole, setRefRole] = useState("");
  const [refNotes, setRefNotes] = useState("");
  const [refCreating, setRefCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Challenges state ──
  const [challenges, setChallenges] = useState<HiringChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);

  // ── Tracker state ──
  const [trackerApps, setTrackerApps] = useState<JobApplication[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(true);
  const [trackerUpdatingId, setTrackerUpdatingId] = useState<string | null>(null);

  // ── Saved state ──
  const [savedItems, setSavedItems] = useState<SavedJobListing[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedRemovingId, setSavedRemovingId] = useState<string | null>(null);

  // ── AI Chat sidebar ──
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Filter panel refs ──
  const searchRef = useRef<HTMLInputElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // ═══════════════════════════════════════════════════════════════════════
  // DERIVED
  // ═══════════════════════════════════════════════════════════════════════

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (filters.search) chips.push({ key: "search", label: `Search: ${filters.search}` });
    if (filters.company) chips.push({ key: "company", label: `Company: ${filters.company}` });
    if (filters.category) chips.push({ key: "category", label: `Category: ${filters.category}` });
    if (filters.location) chips.push({ key: "location", label: `Location: ${filters.location}` });
    if (filters.country) chips.push({ key: "country", label: `Country: ${filters.country}` });
    if (filters.state) chips.push({ key: "state", label: `State: ${filters.state}` });
    if (filters.city) chips.push({ key: "city", label: `City: ${filters.city}` });
    if (filters.mode) chips.push({ key: "mode", label: `Mode: ${filters.mode}` });
    if (filters.employmentType) chips.push({ key: "employmentType", label: `Type: ${filters.employmentType}` });
    if (filters.experience) chips.push({ key: "experience", label: `Experience: ${filters.experience}` });
    if (filters.salaryMin) chips.push({ key: "salaryMin", label: `Min Salary: ${filters.salaryMin}` });
    if (filters.salaryMax) chips.push({ key: "salaryMax", label: `Max Salary: ${filters.salaryMax}` });
    if (filters.skills) chips.push({ key: "skills", label: `Skills: ${filters.skills}` });
    if (filters.isGovernment) chips.push({ key: "isGovernment", label: "Government" });
    if (filters.postedDate) chips.push({ key: "postedDate", label: `Posted: ${filters.postedDate}` });
    return chips;
  }, [filters]);

  // ═══════════════════════════════════════════════════════════════════════
  // API CALLS
  // ═══════════════════════════════════════════════════════════════════════

  const fetchJobs = useCallback(async (pageNum: number, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", String(PAGE_LIMIT));
      if (filters.search) params.set("search", filters.search);
      if (filters.company) params.set("company", filters.company);
      if (filters.category) params.set("category", filters.category);
      if (filters.location) params.set("location", filters.location);
      if (filters.country) params.set("country", filters.country);
      if (filters.state) params.set("state", filters.state);
      if (filters.city) params.set("city", filters.city);
      if (filters.mode) params.set("mode", filters.mode);
      if (filters.employmentType) params.set("employmentType", filters.employmentType);
      if (filters.experience) params.set("experience", filters.experience);
      if (filters.salaryMin) params.set("salaryMin", filters.salaryMin);
      if (filters.salaryMax) params.set("salaryMax", filters.salaryMax);
      if (filters.skills) params.set("skills", filters.skills);
      if (filters.isGovernment) params.set("isGovernment", "true");
      if (filters.postedDate) params.set("postedDate", filters.postedDate);

      const [sortBy, order] = sortValue.split(":");
      params.set("sortBy", sortBy);
      params.set("order", order);

      const res = await api.get(`/job-listing?${params.toString()}`);
      const data = res.data;
      const items: JobListing[] = data.jobs || data.listings || data.data || data.results || [];
      const total = data.total || data.totalPages ? (data.totalPages || Math.ceil((data.total || 0) / PAGE_LIMIT)) : null;

      if (append) {
        setJobs(prev => [...prev, ...items]);
      } else {
        setJobs(items);
      }
      setHasMore(items.length === PAGE_LIMIT && (total === null || pageNum < total));
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message || (err as Error)?.message || "Failed to load jobs";
      console.error("[JobHub] Fetch error:", err);
      if (!append) setError(msg);
      else toast.error("Failed to load more jobs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, sortValue]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get("/job-listing/stats");
      setJobStats(res.data.stats || res.data);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await api.get("/job-listing/companies");
      const data = res.data.companies || res.data.data || res.data || [];
      setCompanies(Array.isArray(data) ? data.map((c: string | { name: string }) => typeof c === "string" ? c : c.name) : []);
    } catch {
      // Non-critical
    }
  }, []);

  const fetchSavedJobs = useCallback(async () => {
    try {
      const res = await api.get("/job-listing/user/saved");
      const ids = res.data.savedIds || [];
      setSavedJobs(new Set(ids));
    } catch {
      // Non-critical
    }
  }, []);

  const fetchLinkedInSavedIds = useCallback(async () => {
    try {
      const res = await api.get("/linkedin-jobs/saved");
      if (res.data.success) {
        setLinkedInSavedIds(new Set(res.data.jobs.map((j: { link: string }) => j.link)));
      }
    } catch {
      // Non-critical
    }
  }, []);

  const handleLinkedInScrape = useCallback(async () => {
    if (!linkedInUrl.includes("linkedin.com/jobs")) {
      toast.error("Please provide a valid LinkedIn jobs URL");
      return;
    }
    setLinkedInScraping(true);
    setLinkedInError(null);
    try {
      const res = await api.post("/linkedin-jobs/search", { url: linkedInUrl, count: linkedInCount });
      if (res.data.success) {
        const mapped: JobListing[] = (res.data.jobs || []).map((j: any) => ({
          id: `linkedin_${j.link}`,
          title: j.title || "",
          company: j.companyName || "",
          logoUrl: j.companyLogo,
          location: j.location || "",
          mode: j.workplaceType || j.workRemoteAllowed ? "Remote" : "",
          employmentType: j.employmentType || "",
          salary: j.salaryInfo || "",
          experience: j.seniorityLevel || "",
          skills: [],
          description: j.descriptionText || "",
          postedDate: j.postedAt || new Date().toISOString(),
          isLinkedIn: true,
          applyUrl: j.applyUrl || j.link,
        }));
        setLinkedInResults(mapped);
        toast.success(`Found ${res.data.total || mapped.length} LinkedIn jobs`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Scraping failed. Please try again.";
      setLinkedInError(msg);
      toast.error(msg);
    } finally {
      setLinkedInScraping(false);
    }
  }, [linkedInUrl, linkedInCount]);

  const handleLinkedInQuickFilter = useCallback((suffix: string) => {
    const baseUrl = linkedInUrl.split("&f_")[0];
    setLinkedInUrl(baseUrl + suffix);
  }, [linkedInUrl]);

  const toggleLinkedInSave = useCallback(async (job: JobListing) => {
    const rawLink = job.applyUrl || job.id.replace("linkedin_", "");
    if (linkedInSavedIds.has(rawLink)) {
      try {
        await api.delete(`/linkedin-jobs/saved/${rawLink}`);
        setLinkedInSavedIds(prev => { const next = new Set(prev); next.delete(rawLink); return next; });
        toast.success("Job removed");
      } catch { toast.error("Failed to remove job"); }
    } else {
      try {
        const res = await api.post("/linkedin-jobs/save", {
          link: rawLink, title: job.title, companyName: job.company,
          location: job.location, salaryInfo: job.salary, applyUrl: job.applyUrl,
        });
        if (res.data.success) {
          setLinkedInSavedIds(prev => new Set([...prev, rawLink]));
          toast.success("Job saved!");
        }
      } catch { toast.error("Failed to save job"); }
    }
  }, [linkedInSavedIds]);

  const toggleSaveJob = useCallback(async (jobId: string) => {
    if (jobId.startsWith("linkedin_")) {
      const job = jobs.find(j => j.id === jobId) || linkedInResults.find(j => j.id === jobId);
      if (job) await toggleLinkedInSave(job);
      return;
    }
    if (jobId.startsWith("adzuna_")) {
      setSavedJobs(prev => {
        const next = new Set(prev);
        if (next.has(jobId)) { next.delete(jobId); toast.success("Removed from saved"); }
        else { next.add(jobId); toast.success("Saved locally!"); }
        return next;
      });
      if (detailData?.id === jobId) {
        setDetailData(d => d ? { ...d, isSaved: !d.isSaved } : d);
      }
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved: !j.isSaved } : j));
      return;
    }
    try {
      await api.post(`/job-listing/saved/${jobId}`);
      setSavedJobs(prev => {
        const next = new Set(prev);
        if (next.has(jobId)) { next.delete(jobId); toast.success("Job removed from saved"); }
        else { next.add(jobId); toast.success("Job saved!"); }
        return next;
      });
      if (detailData?.id === jobId) {
        setDetailData(d => d ? { ...d, isSaved: !d.isSaved } : d);
      }
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isSaved: !j.isSaved } : j));
    } catch {
      toast.error("Failed to save job");
    }
  }, [detailData]);

  const openJobDetail = useCallback(async (job: JobListing) => {
    setSelectedJob(job);
    setDetailLoading(true);
    setAiSummary(null);
    setSkillGap(null);
    setSimilarJobs([]);

    if (job.isLinkedIn || job.id.startsWith("linkedin_")) {
      const rawLink = job.applyUrl || job.id.replace("linkedin_", "");
      setDetailData({ ...job, isSaved: linkedInSavedIds.has(rawLink) });
      setDetailLoading(false);
      return;
    }
    if (job.isAdzuna || job.id.startsWith("adzuna_")) {
      setDetailData({ ...job, isSaved: savedJobs.has(job.id) });
      setDetailLoading(false);
      return;
    }

    try {
      const res = await api.get(`/job-listing/${job.id}`);
      const data = res.data.job || res.data;
      setDetailData({ ...data, isSaved: savedJobs.has(job.id) });
      try {
        const simRes = await api.get(`/job-listing?category=${encodeURIComponent(data.category || job.category || "")}&limit=4`);
        const simJobs: JobListing[] = (simRes.data.jobs || simRes.data.listings || simRes.data.data || []).filter((j: JobListing) => j.id !== job.id);
        setSimilarJobs(simJobs.slice(0, 3));
      } catch {
        // Non-critical
      }
    } catch {
      setDetailData({ ...job, isSaved: savedJobs.has(job.id) });
    } finally {
      setDetailLoading(false);
    }
  }, [savedJobs]);

  const analyzeJD = useCallback(async () => {
    if (!jdText.trim()) { toast.error("Please paste a job description"); return; }
    setJdAnalyzing(true);
    setJdAnalysis(null);
    try {
      const res = await api.post("/job/jd-analyze", { jdText: jdText.trim() });
      setJdAnalysis(res.data.analysis || res.data);
      toast.success("JD analysis complete!");
    } catch {
      toast.error("Failed to analyze JD. Please try again.");
    } finally {
      setJdAnalyzing(false);
    }
  }, [jdText]);

  const fetchAIRecommendations = useCallback(async () => {
    if (!aiSkills.trim()) { toast.error("Please enter your skills"); return; }
    setAiRecommendLoading(true);
    setAiRecommendations([]);
    try {
      const res = await api.post("/job-listing/ai/recommend", {
        skills: aiSkills.split(",").map(s => s.trim()).filter(Boolean),
        experience: aiExperience,
      });
      setAiRecommendations(res.data.recommendations || res.data.jobs || res.data.data || []);
      toast.success("Recommendations generated!");
    } catch {
      toast.error("Failed to get recommendations");
    } finally {
      setAiRecommendLoading(false);
    }
  }, [aiSkills, aiExperience]);

  const fetchReferrals = useCallback(async () => {
    setReferralsLoading(true);
    try {
      const res = await api.get("/job/referrals");
      setReferrals(res.data.referrals || res.data.data || res.data || []);
    } catch {
      toast.error("Failed to load referrals");
    } finally {
      setReferralsLoading(false);
    }
  }, []);

  const createReferral = useCallback(async () => {
    if (!refCompany.trim() || !refRole.trim()) { toast.error("Company and role are required"); return; }
    setRefCreating(true);
    try {
      const res = await api.post("/job/referrals", {
        company: refCompany.trim(), role: refRole.trim(), notes: refNotes.trim()
      });
      const newRef = res.data.referral || res.data;
      setReferrals(prev => [newRef, ...prev]);
      setRefCompany(""); setRefRole(""); setRefNotes("");
      toast.success("Referral request created! Outreach message generated.");
    } catch {
      toast.error("Failed to create referral request");
    } finally {
      setRefCreating(false);
    }
  }, [refCompany, refRole, refNotes]);

  const fetchChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const res = await api.get("/job/challenges");
      setChallenges(res.data.challenges || res.data.data || res.data || []);
    } catch {
      toast.error("Failed to load challenges");
    } finally {
      setChallengesLoading(false);
    }
  }, []);

  const fetchTrackerApps = useCallback(async () => {
    setTrackerLoading(true);
    try {
      const res = await api.get("/job-listing/user/applications");
      setTrackerApps(res.data.applications || res.data.data || res.data || []);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setTrackerLoading(false);
    }
  }, []);

  const updateTrackerStatus = useCallback(async (appId: string, newStatus: string) => {
    setTrackerUpdatingId(appId);
    try {
      await api.put(`/job-listing/applications/${appId}`, { status: newStatus });
      setTrackerApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      toast.success("Status updated!");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTrackerUpdatingId(null);
    }
  }, []);

  const fetchSavedItems = useCallback(async () => {
    setSavedLoading(true);
    try {
      const res = await api.get("/job-listing/user/saved");
      setSavedItems(res.data.saved || []);
    } catch {
      toast.error("Failed to load saved jobs");
    } finally {
      setSavedLoading(false);
    }
  }, []);

  const handleUnsaveJob = useCallback(async (jobId: string) => {
    setSavedRemovingId(jobId);
    try {
      await api.post(`/job-listing/saved/${jobId}`);
      setSavedItems(prev => prev.filter(s => (s.jobListingId || s.jobListing?.id || s.id) !== jobId));
      setSavedJobs(prev => { const next = new Set(prev); next.delete(jobId); return next; });
      toast.success("Removed from saved");
    } catch {
      toast.error("Failed to remove saved job");
    } finally {
      setSavedRemovingId(null);
    }
  }, []);

  const applyToJob = useCallback(async (jobId: string) => {
    if (jobId.startsWith("linkedin_")) {
      toast.success("Opening LinkedIn job page...");
      return;
    }
    if (jobId.startsWith("adzuna_")) {
      toast.success("Opening external application page...");
      return;
    }
    try {
      await api.post(`/job-listing/apply/${jobId}`);
      toast.success("Application submitted!");
    } catch {
      toast.error("Failed to submit application");
    }
  }, []);

  // ── AI Chat ──
  const sendChatMessage = useCallback(async (message?: string) => {
    const msg = (message || chatInput).trim();
    if (!msg || chatLoading) return;

    const userMsg: AIChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: msg,
      timestamp: new Date().toISOString(),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await api.post("/job/career-chat", { message: msg, history: chatMessages.slice(-10) });
      const assistantMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: res.data.reply || res.data.message || res.data.response || "I'll help you with that!",
        timestamp: new Date().toISOString(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch {
      toast.error("Failed to get AI response");
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatMessages, chatLoading]);

  // ═══════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════

  // Resolve activeModule to tab
  useEffect(() => {
    if (!activeModule) return;
    const tab = TABS.find(t => t.module === activeModule);
    if (tab) setActiveTab(tab.id as typeof activeTab);
  }, [activeModule]);

  // Fetch initial data for browse
  useEffect(() => {
    if (activeTab === "browse") {
      setPage(1);
      fetchJobs(1, false);
      fetchStats();
      fetchCompanies();
      fetchSavedJobs();
      fetchLinkedInSavedIds();
    }
  }, [activeTab, fetchJobs, fetchStats, fetchCompanies, fetchSavedJobs, fetchLinkedInSavedIds]);

  // Fetch data for other tabs
  useEffect(() => {
    if (activeTab === "referrals") fetchReferrals();
    if (activeTab === "challenges") fetchChallenges();
    if (activeTab === "tracker") fetchTrackerApps();
    if (activeTab === "saved") fetchSavedItems();
  }, [activeTab, fetchReferrals, fetchChallenges, fetchTrackerApps, fetchSavedItems]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        setPage(prev => {
          const next = prev + 1;
          fetchJobs(next, true);
          return next;
        });
      }
    }, { threshold: 0.1 });
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loading, fetchJobs]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ═══════════════════════════════════════════════════════════════════════
  // FILTER HANDLERS
  // ═══════════════════════════════════════════════════════════════════════

  const updateFilter = useCallback((key: keyof FilterState, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setPage(1);
    fetchJobs(1, false);
  }, [fetchJobs]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: "", company: "", category: "", location: "", country: "", state: "",
      city: "", mode: "", employmentType: "", experience: "", salaryMin: "",
      salaryMax: "", skills: "", isGovernment: false, sortBy: "postedDate",
      order: "desc", postedDate: "",
    });
    setPage(1);
  }, []);

  const removeFilter = useCallback((key: string) => {
    setFilters(prev => ({ ...prev, [key]: key === "isGovernment" ? false : "" }));
    setTimeout(() => {
      setPage(1);
      fetchJobs(1, false);
    }, 0);
  }, [fetchJobs]);

  const handleSort = useCallback((val: string) => {
    setSortValue(val);
    const [sortBy, order] = val.split(":");
    setFilters(prev => ({ ...prev, sortBy, order }));
    setPage(1);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // AI ACTIONS FROM DETAIL MODAL
  // ═══════════════════════════════════════════════════════════════════════

  const fetchAISummary = useCallback(async (jobId: string) => {
    setAiSummaryLoading(true);
    setAiSummary(null);
    try {
      const res = await api.post("/job-listing/ai/summary", { jobListingId: jobId });
      setAiSummary(res.data.summary || res.data.analysis || "No summary available.");
    } catch {
      toast.error("Failed to generate AI summary");
    } finally {
      setAiSummaryLoading(false);
    }
  }, []);

  const fetchSkillGap = useCallback(async (jobId: string) => {
    setSkillGapLoading(true);
    setSkillGap(null);
    try {
      const res = await api.post("/job-listing/ai/skill-gap", { jobListingId: jobId, userSkills: [] });
      const data = res.data.gap || res.data;
      setSkillGap({ matched: data.matched || [], missing: data.missing || [] });
    } catch {
      toast.error("Failed to analyze skill gap");
    } finally {
      setSkillGapLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // COPY HELPER
  // ═══════════════════════════════════════════════════════════════════════

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: BROWSE TAB
  // ═══════════════════════════════════════════════════════════════════════

  const renderBrowse = () => (
    <div className="space-y-6">
      {/* Stats Row */}
      {jobStats && (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Jobs" value={jobStats.total} icon={<Briefcase size={16} />} c={c} delay={0} />
          <StatCard label="Remote Jobs" value={jobStats.remote} icon={<Globe size={16} />} c={c} delay={1} />
          <StatCard label="Featured" value={jobStats.featured} icon={<Star size={16} />} c={c} delay={2} />
        </motion.div>
      )}

      {/* Source Toggle */}
      <div className="flex gap-1 p-1 rounded-xl border" style={{ background: c.cardBg, borderColor: c.border }}>
        {([
          { id: "adzuna" as const, label: "Adzuna Jobs", icon: Globe },
          { id: "linkedin" as const, label: "LinkedIn Jobs", icon: Link2 },
        ]).map(src => {
          const active = jobSource === src.id;
          return (
            <button key={src.id} onClick={() => setJobSource(src.id)}
              className="flex-1 py-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-none"
              style={{
                background: active ? "rgba(245,158,11,0.08)" : "transparent",
                color: active ? c.primary : c.textMuted,
              }}>
              <src.icon size={14} />
              {src.label}
            </button>
          );
        })}
      </div>

      {/* ── Adzuna Search + Filters ── */}
      {jobSource === "adzuna" && (
        <>
          {/* Search Bar */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
              <input ref={searchRef} value={filters.search} onChange={e => updateFilter("search", e.target.value)}
                onKeyDown={e => e.key === "Enter" && applyFilters()}
                placeholder="Search jobs, skills, companies..."
                className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all border"
                style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
                onFocus={e => e.currentTarget.style.borderColor = c.primary}
                onBlur={e => e.currentTarget.style.borderColor = c.border} />
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setFilterOpen(!filterOpen)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer"
              style={{
                background: filterOpen ? "rgba(245,158,11,0.08)" : c.inputBg,
                borderColor: filterOpen ? "rgba(245,158,11,0.25)" : c.border,
                color: filterOpen ? c.primary : c.textSec,
              }}>
              <SlidersHorizontal size={14} />
              Filters {activeFilters.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-400">{activeFilters.length}</span>}
            </motion.button>
            <select value={sortValue} onChange={e => handleSort(e.target.value)}
              className="px-3 py-3 rounded-xl text-xs font-bold border outline-none cursor-pointer"
              style={{ background: c.inputBg, borderColor: c.border, color: c.textSec }}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </motion.div>

          {/* Filter Panel */}
          <AnimatePresence>
            {filterOpen && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="rounded-2xl border p-5 space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Advanced Filters</h3>
                    <button onClick={clearFilters} className="text-[10px] font-bold cursor-pointer bg-transparent border-none"
                      style={{ color: c.primary }}>Clear All</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Company */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Company</label>
                      <select value={filters.company} onChange={e => updateFilter("company", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none cursor-pointer"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
                        <option value="">All Companies</option>
                        {companies.map(comp => <option key={comp} value={comp}>{comp}</option>)}
                      </select>
                    </div>
                    {/* Category */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Category</label>
                      <input value={filters.category} onChange={e => updateFilter("category", e.target.value)}
                        placeholder="e.g. Engineering"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* Location */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Location</label>
                      <input value={filters.location} onChange={e => updateFilter("location", e.target.value)}
                        placeholder="e.g. Bangalore"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* Country */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Country</label>
                      <select value={filters.country} onChange={e => updateFilter("country", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none cursor-pointer"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
                        <option value="">All Countries</option>
                        {ADZUNA_COUNTRIES.map(co => <option key={co.code} value={co.name}>{co.name}</option>)}
                      </select>
                    </div>
                    {/* State */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>State</label>
                      <input value={filters.state} onChange={e => updateFilter("state", e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* City */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>City</label>
                      <input value={filters.city} onChange={e => updateFilter("city", e.target.value)}
                        placeholder="e.g. Mumbai"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* Mode */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Mode</label>
                      <select value={filters.mode} onChange={e => updateFilter("mode", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none cursor-pointer"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
                        <option value="">All Modes</option>
                        {MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    {/* Employment Type */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Employment Type</label>
                      <select value={filters.employmentType} onChange={e => updateFilter("employmentType", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none cursor-pointer"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
                        <option value="">All Types</option>
                        {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    {/* Experience */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Experience (years)</label>
                      <input value={filters.experience} onChange={e => updateFilter("experience", e.target.value)}
                        placeholder="e.g. 3"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* Salary Min */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Min Salary</label>
                      <input value={filters.salaryMin} onChange={e => updateFilter("salaryMin", e.target.value)}
                        placeholder="e.g. 500000" type="number"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* Salary Max */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Max Salary</label>
                      <input value={filters.salaryMax} onChange={e => updateFilter("salaryMax", e.target.value)}
                        placeholder="e.g. 2000000" type="number"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* Skills */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Skills</label>
                      <input value={filters.skills} onChange={e => updateFilter("skills", e.target.value)}
                        placeholder="React, Python"
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
                    </div>
                    {/* Posted Date */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Posted</label>
                      <select value={filters.postedDate} onChange={e => updateFilter("postedDate", e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg text-[11px] font-semibold border outline-none cursor-pointer"
                        style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
                        <option value="">Any time</option>
                        <option value="1d">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                      </select>
                    </div>
                    {/* Government Toggle */}
                    <div className="space-y-1 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer px-3 py-2.5 rounded-lg border w-full transition-all"
                        style={{
                          background: filters.isGovernment ? "rgba(16,185,129,0.06)" : c.inputBg,
                          borderColor: filters.isGovernment ? "rgba(16,185,129,0.25)" : c.border,
                          color: c.text,
                        }}>
                        <input type="checkbox" checked={filters.isGovernment}
                          onChange={e => updateFilter("isGovernment", e.target.checked)}
                          className="sr-only" />
                        <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                          style={{
                            background: filters.isGovernment ? "#10b981" : "transparent",
                            borderColor: filters.isGovernment ? "#10b981" : c.border,
                          }}>
                          {filters.isGovernment && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                        <span className="text-[11px] font-bold flex items-center gap-1"><Shield size={10} /> Government</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={applyFilters}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer"
                      style={{ background: c.primaryGradient, color: "#000" }}>
                      Apply Filters
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Filter Chips */}
          <AnimatePresence>
            {activeFilters.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-wrap gap-2">
                {activeFilters.map(f => (
                  <FilterChip key={f.key} label={f.label} onRemove={() => removeFilter(f.key)} c={c} />
                ))}
                <button onClick={clearFilters}
                  className="text-[10px] font-bold underline cursor-pointer bg-transparent border-none self-center"
                  style={{ color: c.primary }}>
                  Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* ── LinkedIn Search UI ── */}
      {jobSource === "linkedin" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border p-5 space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
          <div className="flex items-center gap-2">
            <Link2 size={16} style={{ color: c.primary }} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.text }}>Search LinkedIn Jobs</h3>
          </div>
          <p className="text-[11px]" style={{ color: c.textMuted }}>
            Paste any LinkedIn Jobs search URL to scrape results. Apply filters on LinkedIn first, then copy the URL.
          </p>
          <div className="flex gap-2">
            <input value={linkedInUrl} onChange={e => setLinkedInUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/search/?..."
              className="flex-1 px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all border"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
            <select value={linkedInCount} onChange={e => setLinkedInCount(Number(e.target.value))}
              className="px-3 py-3 rounded-xl text-xs font-bold border outline-none cursor-pointer"
              style={{ background: c.inputBg, borderColor: c.border, color: c.textSec }}>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleLinkedInScrape} disabled={linkedInScraping}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold border-none cursor-pointer disabled:opacity-50"
              style={{ background: c.primaryGradient, color: "#000" }}>
              {linkedInScraping ? <><Loader2 size={14} className="animate-spin" /> Scraping...</> : <><Search size={14} /> Scrape</>}
            </motion.button>
          </div>
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1.5">
            {LINKEDIN_QUICK_FILTERS.map(f => (
              <button key={f.label} onClick={() => handleLinkedInQuickFilter(f.suffix)}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80 cursor-pointer border"
                style={{ background: c.inputBg, borderColor: c.border, color: c.textSec }}>
                {f.label}
              </button>
            ))}
          </div>
          {linkedInError && (
            <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <AlertTriangle size={14} style={{ color: "#ef4444" }} />
              <span className="text-[11px]" style={{ color: "#ef4444" }}>{linkedInError}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Adzuna Job Grid ── */}
      {jobSource === "adzuna" && (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} c={c} />)}
          </div>
        ) : error ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border p-6 text-center" style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.15)" }}>
            <AlertCircle size={24} className="mx-auto mb-3" style={{ color: "#ef4444" }} />
            <p className="text-xs font-bold text-red-400 mb-1">Failed to load jobs</p>
            <p className="text-[11px] mb-4" style={{ color: c.textMuted }}>{error}</p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => { setPage(1); fetchJobs(1, false); }}
              className="px-4 py-2 rounded-xl text-[11px] font-bold border-none cursor-pointer bg-red-500/10 text-red-400 hover:bg-red-500/20">
              <RefreshCw size={12} className="inline mr-1.5" /> Retry
            </motion.button>
          </motion.div>
        ) : jobs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed"
            style={{ borderColor: c.border }}>
            <Briefcase size={40} className="mb-4 opacity-30" style={{ color: c.textMuted }} />
            <h3 className="text-sm font-bold mb-1" style={{ color: c.text }}>No jobs found</h3>
            <p className="text-[11px] mb-4" style={{ color: c.textMuted }}>Try adjusting your filters or search query</p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={clearFilters}
              className="px-4 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer"
              style={{ background: c.primaryGradient, color: "#000" }}>
              Clear Filters
            </motion.button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                {jobs.length} job{jobs.length !== 1 ? "s" : ""} found via Adzuna
              </span>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs.map(job => (
                <JobCard key={job.id} job={job} c={c}
                  onOpen={() => openJobDetail(job)}
                  onSave={() => toggleSaveJob(job.id)} />
              ))}
            </motion.div>
            <div ref={loadMoreRef} className="h-4" />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin" style={{ color: c.primary }} />
              </div>
            )}
            {!hasMore && jobs.length > 0 && (
              <p className="text-center text-[10px] font-bold py-4" style={{ color: c.textMuted }}>
                All jobs loaded
              </p>
            )}
          </>
        )
      )}

      {/* ── LinkedIn Job Grid ── */}
      {jobSource === "linkedin" && (
        linkedInScraping ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} c={c} />)}
          </div>
        ) : linkedInResults.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed"
            style={{ borderColor: c.border }}>
            <Link2 size={40} className="mb-4 opacity-30" style={{ color: c.textMuted }} />
            <h3 className="text-sm font-bold mb-1" style={{ color: c.text }}>Paste a LinkedIn Jobs URL to start</h3>
            <p className="text-[11px] max-w-md" style={{ color: c.textMuted }}>
              Go to LinkedIn Jobs, apply filters, copy the URL from the address bar, and paste it above. The scraper supports all LinkedIn job search filters.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                {linkedInResults.length} job{linkedInResults.length !== 1 ? "s" : ""} found via LinkedIn
              </span>
            </div>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {linkedInResults.map(job => (
                <JobCard key={job.id} job={job} c={c}
                  onOpen={() => openJobDetail(job)}
                  onSave={() => toggleSaveJob(job.id)} />
              ))}
            </motion.div>
          </>
        )
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: AI MATCH TAB
  // ═══════════════════════════════════════════════════════════════════════

  const renderAIMatch = () => (
    <div className="space-y-6">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl border" style={{ background: c.cardBg, borderColor: c.border }}>
        {[
          { id: "jd" as const, label: "JD Compatibility Analyzer", icon: FileText },
          { id: "recommend" as const, label: "AI Job Recommendations", icon: Target },
        ].map(tab => {
          const active = aiMatchSubTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setAiMatchSubTab(tab.id)}
              className="flex-1 py-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer border-none"
              style={{
                background: active ? "rgba(245,158,11,0.08)" : "transparent",
                color: active ? c.primary : c.textMuted,
              }}>
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={aiMatchSubTab} variants={tabContent} initial="hidden" animate="visible" exit="exit">

          {/* ── JD Analyzer ── */}
          {aiMatchSubTab === "jd" && (
            <div className="space-y-6">
              <div className="rounded-2xl border p-6 space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={16} style={{ color: c.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: c.text }}>JD Compatibility Analyzer</h3>
                </div>
                <p className="text-[11px]" style={{ color: c.textMuted }}>
                  Paste a job description below and our AI will analyze compatibility, identify skill gaps, and suggest resume improvements.
                </p>
                <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={8}
                  placeholder="Paste the full job description here...&#10;&#10;Include job title, requirements, responsibilities, and qualifications for best analysis."
                  className="w-full px-4 py-3.5 rounded-xl text-xs font-semibold outline-none transition-all resize-y border"
                  style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
                  onFocus={e => e.currentTarget.style.borderColor = c.primary}
                  onBlur={e => e.currentTarget.style.borderColor = c.border} />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={analyzeJD} disabled={jdAnalyzing || !jdText.trim()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: c.primaryGradient, color: "#000" }}>
                  {jdAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {jdAnalyzing ? "Analyzing..." : "Analyze Compatibility"}
                </motion.button>
              </div>

              {/* Analysis Results */}
              <AnimatePresence>
                {jdAnalysis && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Overall Score */}
                    <div className="rounded-2xl border p-6 text-center" style={{ background: c.cardBg, borderColor: c.border }}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: c.textMuted }}>Overall Compatibility</p>
                      <ScoreBadge score={jdAnalysis.overallScore} size="lg" />
                      <p className="text-xs mt-3 max-w-md mx-auto leading-relaxed" style={{ color: c.textSec }}>{jdAnalysis.summary}</p>
                    </div>

                    {/* Score Breakdown */}
                    <div className="rounded-2xl border p-6 space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Score Breakdown</h3>
                      <ScoreBar label="Skills Match" score={jdAnalysis.skillsMatch?.matched?.length ? Math.min(100, jdAnalysis.skillsMatch.matched.length * 15) : 0} c={c} />
                      <ScoreBar label="Experience Match" score={jdAnalysis.experienceMatch?.score || 0} c={c} />
                      <ScoreBar label="Education Match" score={jdAnalysis.educationMatch?.score || 0} c={c} />
                      <ScoreBar label="ATS Compatibility" score={jdAnalysis.atsCompatibility?.score || 0} c={c} />
                    </div>

                    {/* Keywords Analysis */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="rounded-2xl border p-5 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#10b981" }}>
                          <CheckCircle2 size={12} /> Found Keywords
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(jdAnalysis.skillsMatch?.matched || []).map((kw, i) => (
                            <span key={i} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>
                              {kw}
                            </span>
                          ))}
                          {(!jdAnalysis.skillsMatch?.matched || jdAnalysis.skillsMatch.matched.length === 0) && (
                            <span className="text-[10px] italic" style={{ color: c.textMuted }}>No keywords found</span>
                          )}
                        </div>
                      </div>
                      <div className="rounded-2xl border p-5 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#ef4444" }}>
                          <AlertCircle size={12} /> Missing Keywords
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(jdAnalysis.skillsMatch?.missing || []).map((kw, i) => (
                            <span key={i} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border p-5 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
                          <Lightbulb size={12} /> Suggested Keywords
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {(jdAnalysis.skillsMatch?.suggested || []).map((kw, i) => (
                            <span key={i} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: "rgba(245,158,11,0.08)", color: "#f59e0b" }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Suggestions */}
                    {jdAnalysis.suggestions?.length > 0 && (
                      <div className="rounded-2xl border p-6 space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
                        <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: c.primary }}>
                          <Target size={12} /> Resume Improvement Suggestions
                        </h3>
                        <ul className="space-y-2.5">
                          {jdAnalysis.suggestions.map((s, i) => (
                            <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                              className="flex items-start gap-2.5 text-[11px] leading-relaxed" style={{ color: c.textSec }}>
                              <ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: c.primary }} />
                              {s}
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── AI Recommendations ── */}
          {aiMatchSubTab === "recommend" && (
            <div className="space-y-6">
              <div className="rounded-2xl border p-6 space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={16} style={{ color: c.primary }} />
                  <h3 className="text-sm font-bold" style={{ color: c.text }}>AI Job Recommendations</h3>
                </div>
                <p className="text-[11px]" style={{ color: c.textMuted }}>
                  Enter your skills and experience level to get personalized, AI-ranked job recommendations.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
                      <Code2 size={10} className="inline mr-1" style={{ color: c.primary }} /> Your Skills
                    </label>
                    <input value={aiSkills} onChange={e => setAiSkills(e.target.value)}
                      placeholder="e.g. React, Node.js, TypeScript, Python"
                      className="w-full px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all border"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
                      onFocus={e => e.currentTarget.style.borderColor = c.primary}
                      onBlur={e => e.currentTarget.style.borderColor = c.border} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
                      <Clock size={10} className="inline mr-1" style={{ color: c.primary }} /> Years of Experience
                    </label>
                    <input value={aiExperience} onChange={e => setAiExperience(e.target.value)}
                      placeholder="e.g. 3" type="number"
                      className="w-full px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all border"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
                      onFocus={e => e.currentTarget.style.borderColor = c.primary}
                      onBlur={e => e.currentTarget.style.borderColor = c.border} />
                  </div>
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={fetchAIRecommendations} disabled={aiRecommendLoading || !aiSkills.trim()}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: c.primaryGradient, color: "#000" }}>
                  {aiRecommendLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {aiRecommendLoading ? "Generating..." : "Get Recommendations"}
                </motion.button>
              </div>

              {aiRecommendLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin mb-3" style={{ color: c.primary }} />
                  <p className="text-xs font-bold" style={{ color: c.textMuted }}>AI is finding the best matches...</p>
                </div>
              )}

              {aiRecommendations.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
                    {aiRecommendations.length} personalized recommendation{aiRecommendations.length !== 1 ? "s" : ""}
                  </p>
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {aiRecommendations.map(job => (
                      <JobCard key={job.id} job={job} c={c}
                        onOpen={() => openJobDetail(job)}
                        onSave={() => toggleSaveJob(job.id)} />
                    ))}
                  </motion.div>
                </div>
              )}

              {!aiRecommendLoading && aiRecommendations.length === 0 && (
                <div className="text-center py-12">
                  <Brain size={36} className="mx-auto mb-3 opacity-30" style={{ color: c.textMuted }} />
                  <p className="text-xs font-bold" style={{ color: c.textMuted }}>Enter your skills to get AI-powered job matches</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: REFERRALS TAB
  // ═══════════════════════════════════════════════════════════════════════

  const renderReferrals = () => (
    <div className="space-y-6">
      {/* Create Referral */}
      <div className="rounded-2xl border p-6 space-y-4" style={{ background: c.cardBg, borderColor: c.border }}>
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} style={{ color: c.primary }} />
          <h3 className="text-sm font-bold" style={{ color: c.text }}>New Referral Request</h3>
        </div>
        <p className="text-[11px]" style={{ color: c.textMuted }}>
          Request a referral and get an AI-generated outreach message to send to potential referrers.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
              <Building2 size={10} className="inline mr-1" style={{ color: c.primary }} /> Company
            </label>
            <input value={refCompany} onChange={e => setRefCompany(e.target.value)}
              placeholder="e.g. Google"
              className="w-full px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all border"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
              onFocus={e => e.currentTarget.style.borderColor = c.primary}
              onBlur={e => e.currentTarget.style.borderColor = c.border} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
              <Briefcase size={10} className="inline mr-1" style={{ color: c.primary }} /> Role
            </label>
            <input value={refRole} onChange={e => setRefRole(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all border"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
              onFocus={e => e.currentTarget.style.borderColor = c.primary}
              onBlur={e => e.currentTarget.style.borderColor = c.border} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textSec }}>
            <FileText size={10} className="inline mr-1" style={{ color: c.primary }} /> Notes (optional)
          </label>
          <textarea value={refNotes} onChange={e => setRefNotes(e.target.value)} rows={3}
            placeholder="Any additional context about why you want this referral..."
            className="w-full px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all resize-y border"
            style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
            onFocus={e => e.currentTarget.style.borderColor = c.primary}
            onBlur={e => e.currentTarget.style.borderColor = c.border} />
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={createReferral} disabled={refCreating || !refCompany.trim() || !refRole.trim()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: c.primaryGradient, color: "#000" }}>
          {refCreating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {refCreating ? "Creating..." : "Create & Generate Outreach"}
        </motion.button>
      </div>

      {/* Referral List */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>
          Your Referral Requests
        </h3>
        {referralsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 animate-pulse" style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="h-4 rounded mb-3" style={{ background: "rgba(255,255,255,0.04)", width: "40%" }} />
                <div className="h-3 rounded mb-2" style={{ background: "rgba(255,255,255,0.03)", width: "70%" }} />
                <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.03)", width: "55%" }} />
              </div>
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-8 rounded-2xl border border-dashed" style={{ borderColor: c.border }}>
            <Users size={30} className="mx-auto mb-3 opacity-30" style={{ color: c.textMuted }} />
            <p className="text-xs font-bold" style={{ color: c.textMuted }}>No referral requests yet</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
            {referrals.map(ref => {
              const st = getStatusColor(ref.status);
              return (
                <motion.div key={ref.id} variants={staggerItem} className="rounded-2xl border p-5 space-y-3"
                  style={{ background: c.cardBg, borderColor: c.border }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold" style={{ color: c.text }}>{ref.role}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                          style={{ background: st.bg, color: st.text }}>{ref.status}</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: c.textSec }}>{ref.company}</p>
                    </div>
                    <span className="text-[9px] font-semibold" style={{ color: c.textMuted }}>{timeAgo(ref.createdAt)}</span>
                  </div>
                  {ref.notes && <p className="text-[11px]" style={{ color: c.textMuted }}>{ref.notes}</p>}
                  {ref.outreachMessage && (
                    <div className="rounded-xl p-4 border relative group" style={{ background: "rgba(245,158,11,0.03)", borderColor: "rgba(245,158,11,0.1)" }}>
                      <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: c.primary }}>
                        <Sparkles size={9} className="inline mr-1" /> AI Generated Outreach Message
                      </p>
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: c.textSec }}>
                        {ref.outreachMessage}
                      </p>
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => copyToClipboard(ref.outreachMessage!, ref.id)}
                        className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg text-[9px] font-bold flex items-center gap-1 border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: c.primaryGradient, color: "#000" }}>
                        {copiedId === ref.id ? <Check size={10} /> : <Copy size={10} />}
                        {copiedId === ref.id ? "Copied!" : "Copy"}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: CHALLENGES TAB
  // ═══════════════════════════════════════════════════════════════════════

  const renderChallenges = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy size={16} style={{ color: c.primary }} />
        <h3 className="text-sm font-bold" style={{ color: c.text }}>Hiring Challenges</h3>
      </div>

      {challengesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 animate-pulse space-y-3" style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="h-4 rounded" style={{ background: "rgba(255,255,255,0.04)", width: "60%" }} />
              <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.03)", width: "45%" }} />
              <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.03)", width: "80%" }} />
            </div>
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: c.border }}>
          <Trophy size={36} className="mx-auto mb-3 opacity-30" style={{ color: c.textMuted }} />
          <p className="text-xs font-bold" style={{ color: c.textMuted }}>No challenges available at the moment</p>
        </div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {challenges.map(ch => {
            const diffColor = getDifficultyColor(ch.difficulty);
            const chStatus = getStatusColor(ch.status);
            const isActive = ch.status.toLowerCase() === "active" || ch.status.toLowerCase() === "open";
            return (
              <motion.div key={ch.id}
                variants={cardHover} initial="rest" whileHover="hover"
                className="rounded-2xl border p-5 space-y-3 transition-all"
                style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold" style={{ color: c.text }}>{ch.title}</h4>
                    <p className="text-[11px] mt-0.5" style={{ color: c.textSec }}>{ch.company}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0"
                    style={{ background: chStatus.bg, color: chStatus.text }}>
                    {ch.status}
                  </span>
                </div>
                {ch.description && (
                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: c.textMuted }}>{ch.description}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {ch.category && (
                    <span className="px-2 py-1 rounded text-[9px] font-bold border flex items-center gap-1"
                      style={{ background: "rgba(99,102,241,0.06)", color: "#818cf8", borderColor: "rgba(99,102,241,0.12)" }}>
                      <Tag size={8} /> {ch.category}
                    </span>
                  )}
                  {ch.difficulty && (
                    <span className="px-2 py-1 rounded text-[9px] font-bold border flex items-center gap-1"
                      style={{ background: `${diffColor}15`, color: diffColor, borderColor: `${diffColor}20` }}>
                      <Flame size={8} /> {ch.difficulty}
                    </span>
                  )}
                  {ch.duration && (
                    <span className="px-2 py-1 rounded text-[9px] font-bold border flex items-center gap-1"
                      style={{ background: "rgba(255,255,255,0.02)", color: c.textMuted, borderColor: c.border }}>
                      <Clock size={8} /> {ch.duration}
                    </span>
                  )}
                  {ch.participants != null && (
                    <span className="px-2 py-1 rounded text-[9px] font-bold border flex items-center gap-1"
                      style={{ background: "rgba(255,255,255,0.02)", color: c.textMuted, borderColor: c.border }}>
                      <Users size={8} /> {ch.participants} joined
                    </span>
                  )}
                </div>
                {isActive && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => toast.success("Participation registered!")}
                    className="w-full py-2.5 rounded-xl text-[11px] font-bold border-none cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ background: c.primaryGradient, color: "#000" }}>
                    <Zap size={12} /> Participate
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: APPLICATION TRACKER
  // ═══════════════════════════════════════════════════════════════════════

  const trackerGrouped = useMemo(() => {
    const map: Record<TrackerColumn, JobApplication[]> = {
      saved: [], applied: [], under_review: [], shortlisted: [],
      interview_scheduled: [], offer_received: [], rejected: [],
    };
    trackerApps.forEach(app => {
      const status = (app.status || "applied") as TrackerColumn;
      if (map[status]) map[status].push(app);
      else map.applied.push(app);
    });
    return map;
  }, [trackerApps]);

  const trackerStats = useMemo(() => ({
    total: trackerApps.length,
    interviews: trackerApps.filter(a => a.status === "interview_scheduled").length,
    offers: trackerApps.filter(a => a.status === "offer_received").length,
    shortlisted: trackerApps.filter(a => a.status === "shortlisted").length,
  }), [trackerApps]);

  const renderTracker = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: trackerStats.total, color: c.primary, icon: <Briefcase size={14} /> },
          { label: "Interviews", value: trackerStats.interviews, color: "#10b981", icon: <CalendarDays size={14} /> },
          { label: "Offers", value: trackerStats.offers, color: "#22c55e", icon: <CheckCircle2 size={14} /> },
          { label: "Shortlisted", value: trackerStats.shortlisted, color: "#06b6d4", icon: <Star size={14} /> },
        ].map(stat => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border p-3.5 text-center"
            style={{ background: c.cardBg, borderColor: c.border }}>
            <div className="flex items-center justify-center mb-1.5" style={{ color: stat.color }}>{stat.icon}</div>
            <div className="text-lg font-black" style={{ color: c.text }}>{stat.value}</div>
            <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {trackerLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-8 rounded-lg animate-pulse" style={{ background: `${c.textMuted}10` }} />
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-20 rounded-xl animate-pulse" style={{ background: `${c.textMuted}08` }} />
              ))}
            </div>
          ))}
        </div>
      ) : trackerApps.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
          <BarChart3 size={28} className="mx-auto mb-3 opacity-40" style={{ color: c.textMuted }} />
          <p className="text-xs font-bold" style={{ color: c.textSec }}>No applications tracked yet</p>
          <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>Apply to jobs from the Browse tab to start tracking</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="flex gap-3 min-w-max">
            {TRACKER_COLUMNS.map(col => (
              <div key={col.id} className="w-56 shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>{col.label}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${col.color}15`, color: col.color }}>
                    {trackerGrouped[col.id].length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px] rounded-xl p-2 border"
                  style={{ background: `${c.textMuted}04`, borderColor: c.border }}>
                  {trackerGrouped[col.id].map(app => (
                    <motion.div key={app.id} layout
                      className="rounded-xl border p-3 cursor-pointer group"
                      style={{ background: c.cardBg, borderColor: c.border }}
                      whileHover={{ borderColor: "rgba(245,158,11,0.25)" }}>
                      <p className="text-[10px] font-bold truncate" style={{ color: c.text }}>
                        {app.jobListing?.title || "Job"}
                      </p>
                      <p className="text-[9px] font-semibold mt-0.5 flex items-center gap-1" style={{ color: c.textMuted }}>
                        <Building2 size={8} /> {app.jobListing?.company || "Company"}
                      </p>
                      <p className="text-[8px] font-semibold mt-1" style={{ color: c.textMuted }}>
                        {new Date(app.appliedAt).toLocaleDateString()}
                      </p>
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select value={app.status} onChange={(e) => { e.stopPropagation(); updateTrackerStatus(app.id, e.target.value); }}
                          disabled={trackerUpdatingId === app.id}
                          className="w-full text-[8px] rounded-lg px-2 py-1 border outline-none font-bold cursor-pointer"
                          style={{ background: c.inputBg, borderColor: c.border, color: c.textMuted }}>
                          {TRACKER_COLUMNS.map(tc => (
                            <option key={tc.id} value={tc.id}>{tc.label}</option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  ))}
                  {trackerGrouped[col.id].length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-[9px] font-semibold" style={{ color: c.textMuted }}>No items</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: SAVED JOBS
  // ═══════════════════════════════════════════════════════════════════════

  const savedJobsList = useMemo(() =>
    savedItems.map(s => s.jobListing).filter(Boolean) as JobListing[],
    [savedItems]
  );

  const renderSaved = () => (
    <div className="space-y-4">
      {savedLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-5 space-y-3 animate-pulse"
              style={{ background: c.cardBg, borderColor: c.border }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl" style={{ background: `${c.textMuted}10` }} />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-3/4 rounded-lg" style={{ background: `${c.textMuted}10` }} />
                  <div className="h-2 w-1/2 rounded-lg" style={{ background: `${c.textMuted}08` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : savedJobsList.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border" style={{ background: c.cardBg, borderColor: c.border }}>
          <Bookmark size={28} className="mx-auto mb-3 opacity-40" style={{ color: c.textMuted }} />
          <p className="text-xs font-bold" style={{ color: c.textSec }}>No saved jobs yet</p>
          <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>Browse jobs and click the bookmark icon to save them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedJobsList.map(job => (
            <motion.div key={job.id} layout
              className="rounded-2xl border overflow-hidden group"
              style={{ background: c.cardBg, borderColor: c.border }}
              whileHover={{ y: -4, borderColor: "rgba(245,158,11,0.25)" }}>
              <div className="p-5 space-y-3 cursor-pointer" onClick={() => openJobDetail(job)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background: job.logoBg || "rgba(245,158,11,0.1)", color: c.primary, border: `1px solid ${c.border}` }}>
                      {job.company?.charAt(0) || "C"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold truncate" style={{ color: c.text }}>{job.title}</h3>
                      <p className="text-[10px] font-semibold truncate flex items-center gap-1" style={{ color: c.textMuted }}>
                        <Building2 size={9} /> {job.company}
                      </p>
                    </div>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleUnsaveJob(job.id); }}
                    disabled={savedRemovingId === job.id}
                    className="p-1.5 rounded-full border-none cursor-pointer transition-colors disabled:opacity-40"
                    style={{ background: "rgba(245,158,11,0.1)", color: c.primary }}>
                    {savedRemovingId === job.id ? <Loader2 size={12} className="animate-spin" /> : <BookmarkCheck size={12} />}
                  </motion.button>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-semibold" style={{ color: c.textMuted }}>
                  {job.location && <span className="flex items-center gap-1"><MapPin size={9} /> {job.location}</span>}
                  {job.mode && <span className="flex items-center gap-1"><Globe size={9} /> {job.mode}</span>}
                  {job.employmentType && <span className="flex items-center gap-1"><Briefcase size={9} /> {job.employmentType}</span>}
                  {job.salary && <span className="flex items-center gap-1"><DollarSign size={9} /> {job.salary}</span>}
                </div>
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.slice(0, 3).map((skill, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                        style={{ background: "rgba(255,255,255,0.02)", color: c.textMuted, borderColor: c.border }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: JOB DETAIL MODAL
  // ═══════════════════════════════════════════════════════════════════════

  const renderDetailModal = () => {
    const job = detailData || selectedJob;
    if (!job) return null;
    return (
      <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-[6px]"
          onClick={() => { setSelectedJob(null); setDetailData(null); }}>
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border bg-[#0c0d16] border-white/8 shadow-2xl relative">
            {/* Top accent */}
            <div className="sticky top-0 z-10 h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

            {/* Close button */}
            <button onClick={() => { setSelectedJob(null); setDetailData(null); }}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.05)", color: "#fff" }}>
              <X size={15} />
            </button>

            {detailLoading ? (
              <div className="p-8 space-y-4">
                <div className="h-6 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.04)", width: "50%" }} />
                <div className="h-4 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.03)", width: "30%" }} />
                <div className="space-y-2 mt-6">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-3 rounded animate-pulse" style={{ background: "rgba(255,255,255,0.02)", width: `${70 + Math.random() * 25}%` }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <CompanyLogo company={job.company} logoUrl={job.logoUrl} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-black tracking-tight" style={{ color: "#fff" }}>{job.title}</h2>
                      {job.isFeatured && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
                          <Star size={8} className="inline mr-0.5" /> Featured
                        </span>
                      )}
                      {job.isGovernment && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                          <Shield size={8} className="inline mr-0.5" /> Government
                        </span>
                      )}
                      {job.isLinkedIn && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase" style={{ background: "rgba(10,102,194,0.15)", color: "#0a66c2" }}>
                          <Link2 size={8} className="inline mr-0.5" /> LinkedIn
                        </span>
                      )}
                      {job.isAdzuna && (
                        <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase" style={{ background: "rgba(99,102,241,0.15)", color: "#6366f1" }}>
                          <Globe size={8} className="inline mr-0.5" /> External
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{job.company}</p>
                    <div className="flex flex-wrap gap-3 mt-2">
                      {job.location && (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                          <MapPin size={11} /> {job.location}
                        </span>
                      )}
                      {job.mode && (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                          <Globe size={11} /> {job.mode}
                        </span>
                      )}
                      {job.employmentType && (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                          <Briefcase size={11} /> {job.employmentType}
                        </span>
                      )}
                      {job.experience && (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                          <Clock size={11} /> {job.experience}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Salary + Posted */}
                <div className="flex items-center gap-4">
                  {job.salary && (
                    <div className="px-4 py-2 rounded-xl border" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.12)" }}>
                      <span className="text-sm font-black" style={{ color: "#10b981" }}>
                        <DollarSign size={14} className="inline" /> {job.salary}
                      </span>
                    </div>
                  )}
                  <span className="text-[10px] font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Posted {timeAgo(job.postedDate)}
                  </span>
                </div>

                {/* Description */}
                {job.description && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Description</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{job.description}</p>
                  </div>
                )}

                {/* Responsibilities */}
                {job.responsibilities && job.responsibilities.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Responsibilities</h3>
                    <ul className="space-y-1.5">
                      {job.responsibilities.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                          <CheckCircle2 size={12} className="shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements */}
                {job.requirements && job.requirements.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Requirements</h3>
                    <ul className="space-y-1.5">
                      {job.requirements.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                          <ArrowRight size={12} className="shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Skills */}
                {job.skills && job.skills.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Required Skills</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map((s, i) => (
                        <span key={i} className="px-3 py-1.5 rounded-full text-[10px] font-bold border"
                          style={{ background: "rgba(245,158,11,0.06)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.15)" }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Benefits */}
                {job.benefits && job.benefits.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Benefits</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {job.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-lg border"
                          style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}>
                          <CheckCircle2 size={10} style={{ color: "#10b981" }} /> {b}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Summary Section */}
                <div className="rounded-xl border p-5 space-y-3" style={{ background: "rgba(245,158,11,0.03)", borderColor: "rgba(245,158,11,0.1)" }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
                      <Sparkles size={12} /> AI Summary
                    </h3>
                    {!aiSummary && !aiSummaryLoading && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => fetchAISummary(job.id)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer"
                        style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                        Generate
                      </motion.button>
                    )}
                  </div>
                  {aiSummaryLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 size={14} className="animate-spin" style={{ color: "#f59e0b" }} />
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>Generating AI summary...</span>
                    </div>
                  ) : aiSummary ? (
                    <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>{aiSummary}</p>
                  ) : (
                    <p className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>Click generate to get an AI-powered summary of this role.</p>
                  )}
                </div>

                {/* Skill Gap Section */}
                <div className="rounded-xl border p-5 space-y-3" style={{ background: "rgba(99,102,241,0.03)", borderColor: "rgba(99,102,241,0.1)" }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#818cf8" }}>
                      <GitBranch size={12} /> Skill Gap Analysis
                    </h3>
                    {!skillGap && !skillGapLoading && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => fetchSkillGap(job.id)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold border-none cursor-pointer"
                        style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}>
                        Analyze
                      </motion.button>
                    )}
                  </div>
                  {skillGapLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 size={14} className="animate-spin" style={{ color: "#818cf8" }} />
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>Analyzing skill gap...</span>
                    </div>
                  ) : skillGap ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#10b981" }}>Skills You Have</p>
                        <div className="flex flex-wrap gap-1.5">
                          {skillGap.matched.map((s, i) => (
                            <span key={i} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "#10b981" }}>
                              <Check size={8} className="inline mr-0.5" />{s}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "#ef4444" }}>Skills to Learn</p>
                        <div className="flex flex-wrap gap-1.5">
                          {skillGap.missing.map((s, i) => (
                            <span key={i} className="px-2 py-1 rounded text-[10px] font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                              <X size={8} className="inline mr-0.5" />{s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] italic" style={{ color: "rgba(255,255,255,0.3)" }}>Click analyze to compare your skills with this job.</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  {job.applyUrl ? (
                    <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      href={job.applyUrl} target="_blank" rel="noopener noreferrer"
                      onClick={() => applyToJob(job.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold border-none no-underline"
                      style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#000" }}>
                      <ExternalLink size={14} /> Apply Now
                    </motion.a>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => applyToJob(job.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold border-none cursor-pointer"
                      style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)", color: "#000" }}>
                      <Send size={14} /> Apply
                    </motion.button>
                  )}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => toggleSaveJob(job.id)}
                    className="px-4 py-3 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5"
                    style={{
                      background: job.isSaved ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.03)",
                      borderColor: job.isSaved ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)",
                      color: job.isSaved ? "#f59e0b" : "rgba(255,255,255,0.5)",
                    }}>
                    {job.isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                    {job.isSaved ? "Saved" : "Save"}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (job.applyUrl) {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Job link copied!");
                      }
                    }}
                    className="px-4 py-3 rounded-xl text-xs font-bold border cursor-pointer flex items-center gap-1.5"
                    style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>
                    <Share2 size={14} /> Share
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: AI CHAT SIDEBAR
  // ═══════════════════════════════════════════════════════════════════════

  const renderChatSidebar = () => (
    <AnimatePresence>
      {chatOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] bg-black/50 lg:hidden" onClick={() => setChatOpen(false)} />
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed right-0 top-16 bottom-0 z-[9999] w-full max-w-sm flex flex-col border-l h-[calc(100vh-4rem)]"
            style={{ background: isDark ? "#0c0d16" : "#fff", borderColor: c.border }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0" style={{ borderColor: c.border }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                  <Bot size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold" style={{ color: c.text }}>AI Career Assistant</h3>
                  <p className="text-[9px]" style={{ color: c.textMuted }}>Always here to help</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors border-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", color: c.textMuted }}>
                <X size={14} />
              </button>
            </div>

            {/* Quick Actions */}
            {chatMessages.length === 0 && (
              <div className="px-5 py-4 border-b" style={{ borderColor: c.border }}>
                <p className="text-[9px] font-bold uppercase tracking-wider mb-3" style={{ color: c.textMuted }}>Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {AI_QUICK_ACTIONS.map(action => (
                    <motion.button key={action.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => sendChatMessage(action.prompt)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[10px] font-bold border cursor-pointer text-left transition-all"
                      style={{ background: c.inputBg, borderColor: c.border, color: c.textSec }}>
                      <action.icon size={12} style={{ color: c.primary, flexShrink: 0 }} />
                      {action.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {chatMessages.map(msg => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[11px] leading-relaxed ${
                    msg.role === "user" ? "rounded-br-md" : "rounded-bl-md"
                  }`}
                    style={{
                      background: msg.role === "user" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                      color: c.text,
                      border: `1px solid ${msg.role === "user" ? "rgba(245,158,11,0.15)" : c.border}`,
                    }}>
                    {stripMarkdown(msg.content)}
                  </div>
                </motion.div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border" style={{ background: "rgba(255,255,255,0.03)", borderColor: c.border }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: c.border }}>
              <div className="flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                  placeholder="Ask about careers, jobs, skills..."
                  className="flex-1 px-4 py-3 rounded-xl text-xs font-semibold outline-none transition-all border"
                  style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
                  onFocus={e => e.currentTarget.style.borderColor = c.primary}
                  onBlur={e => e.currentTarget.style.borderColor = c.border} />
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => sendChatMessage()} disabled={chatLoading || !chatInput.trim()}
                  className="w-10 h-10 rounded-xl flex items-center justify-center border-none cursor-pointer disabled:opacity-40"
                  style={{ background: c.primaryGradient, color: "#000" }}>
                  <Send size={14} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 relative z-10">

      {/* Background ambient blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-72 h-72 rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full bg-violet-600/5 blur-[150px] pointer-events-none" />

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b"
        style={{ borderColor: c.border }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: c.primary }}>
              Career Engine
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.1em]">Active</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: c.text, fontFamily: "var(--font-outfit)" }}>
            Job Hub
          </h1>
          <p className="text-xs" style={{ color: c.textMuted }}>
            Discover opportunities, leverage AI, and advance your career
          </p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setChatOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
            style={{
              background: chatOpen ? "rgba(245,158,11,0.08)" : c.cardBg,
              borderColor: chatOpen ? "rgba(245,158,11,0.25)" : c.border,
              color: chatOpen ? c.primary : c.textSec,
            }}>
            <Bot size={14} />
            AI Assistant
          </motion.button>
        </div>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 p-1 rounded-xl border overflow-x-auto" style={{ background: c.cardBg, borderColor: c.border }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className="relative flex-1 min-w-[100px] py-3 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer border-none outline-none"
              style={{ background: "transparent", color: active ? c.primary : c.textMuted }}>
              {active && (
                <motion.div layoutId="jobHubTabUnderline" className="absolute inset-0 rounded-lg"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.12)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }} />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon size={14} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} variants={tabContent} initial="hidden" animate="visible" exit="exit">
          {activeTab === "browse" && renderBrowse()}
          {activeTab === "ai-match" && renderAIMatch()}
          {activeTab === "tracker" && renderTracker()}
          {activeTab === "saved" && renderSaved()}
          {activeTab === "referrals" && renderReferrals()}
          {activeTab === "challenges" && renderChallenges()}
        </motion.div>
      </AnimatePresence>

      {/* ── Job Detail Modal ── */}
      {selectedJob && renderDetailModal()}

      {/* ── AI Chat Sidebar ── */}
      {renderChatSidebar()}
    </div>
  );
}

export default JobHubView;
