"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stripMarkdown } from "@/utils/stripMarkdown";
import {
  Search, Filter, Briefcase, MapPin, Clock, DollarSign, Star, Bookmark,
  BookmarkCheck, ExternalLink, Share2, ChevronDown, ChevronUp, X,
  Loader2, AlertCircle, RefreshCw, Sparkles, Brain, Target, ArrowRight,
  Building2, Globe, GraduationCap, Calendar, Tag, SlidersHorizontal,
  MessageSquare, Send, Bot, ChevronLeft, TrendingUp, Eye, Users,
  Zap, BarChart3, Layers, CheckCircle2, XCircle, FileText, Heart,
  Copy, Check, ArrowUpRight, Info, Circle, GripVertical, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface InternshipHubViewProps {
  setView: (view: string) => void;
  activeModule?: string;
  theme?: string;
}

interface Internship {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  logoBg?: string;
  location: string;
  country?: string;
  mode: string;
  duration: string;
  stipend: string;
  skills: string[];
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  benefits?: string[];
  category?: string;
  internshipType?: string;
  isPaid?: boolean;
  postedDate: string;
  applyUrl?: string;
  companyId?: string;
  featured?: boolean;
}

interface SavedInternship {
  id: string;
  internshipId: string;
  createdAt: string;
  internship?: Internship;
}

interface Application {
  id: string;
  internshipId: string;
  status: string;
  appliedAt: string;
  internship?: Internship;
  company?: string;
  role?: string;
}

interface Recommendation {
  internship: Internship;
  matchScore: number;
  reason: string;
  missingSkills?: string[];
}

interface FilterState {
  search: string;
  company: string;
  category: string;
  location: string;
  country: string;
  mode: string;
  duration: string;
  isPaid: string;
  internshipType: string;
  sortBy: string;
  order: string;
  skills: string;
  postedDate: string;
}

interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

type TrackerColumn =
  | "saved"
  | "applied"
  | "under_review"
  | "shortlisted"
  | "interview_scheduled"
  | "offer_received"
  | "rejected";

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: "browse", label: "Browse", icon: Search, module: "internship-finder" },
  { id: "ai-match", label: "AI Match", icon: Sparkles, module: "internship-recommendations" },
  { id: "tracker", label: "Tracker", icon: BarChart3, module: "internship-tracker" },
  { id: "saved", label: "Saved", icon: Bookmark, module: "internship-saved" },
] as const;

const SORT_OPTIONS = [
  { value: "postedDate:desc", label: "Most Recent" },
  { value: "stipend:desc", label: "Stipend (High-Low)" },
  { value: "stipend:asc", label: "Stipend (Low-High)" },
  { value: "duration:asc", label: "Duration" },
];

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
  { id: "recommend", label: "Recommend Internships", icon: Sparkles, prompt: "Recommend internships based on my skills and interests" },
  { id: "skill-gap", label: "Analyze My Skills", icon: Target, prompt: "Analyze my skill gaps and suggest improvements" },
  { id: "cover-letter", label: "Write Cover Letter", icon: FileText, prompt: "Write a cover letter for the selected internship" },
  { id: "summary", label: "AI Summary", icon: Brain, prompt: "Provide a detailed AI summary of this internship" },
];

const POSTED_DATE_OPTIONS = [
  { value: "", label: "All Time" },
  { value: "1", label: "Last 24 Hours" },
  { value: "7", label: "Last Week" },
  { value: "30", label: "Last Month" },
  { value: "90", label: "Last 3 Months" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const slideIn = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: TIME AGO
// ═══════════════════════════════════════════════════════════════════════════════

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function AIScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  const sizes = { sm: "w-8 h-8 text-[9px]", md: "w-10 h-10 text-[10px]", lg: "w-14 h-14 text-xs" };
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-black shrink-0`}
      style={{ border: `2px solid ${color}`, color, background: `${color}15` }}>
      {score}%
    </div>
  );
}

function SkeletonCard({ c }: { c: Record<string, string> }) {
  return (
    <div className="rounded-2xl border overflow-hidden animate-pulse" style={{ background: c.cardBg, borderColor: c.border }}>
      <div className="h-3 w-1/3 rounded-full m-5" style={{ background: `${c.textMuted}20` }} />
      <div className="px-5 pb-5 space-y-3">
        <div className="h-5 w-3/4 rounded-lg" style={{ background: `${c.textMuted}15` }} />
        <div className="h-3 w-1/2 rounded-full" style={{ background: `${c.textMuted}10` }} />
        <div className="flex gap-2 pt-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 w-16 rounded-full" style={{ background: `${c.textMuted}10` }} />)}
        </div>
        <div className="flex justify-between items-center pt-3 border-t" style={{ borderColor: c.border }}>
          <div className="h-3 w-24 rounded-full" style={{ background: `${c.textMuted}10` }} />
          <div className="h-8 w-8 rounded-full" style={{ background: `${c.textMuted}10` }} />
        </div>
      </div>
    </div>
  );
}

function ActiveFilters({ filters, onRemove, onClearAll, c }: {
  filters: Record<string, string>;
  onRemove: (key: string) => void;
  onClearAll: () => void;
  c: Record<string, string>;
}) {
  const entries = Object.entries(filters).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Filters:</span>
      {entries.map(([key, val]) => (
        <motion.button key={key} layout exit={{ opacity: 0, scale: 0.8 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border cursor-pointer transition-all hover:scale-[1.03]"
          style={{ background: "rgba(245,158,11,0.06)", color: c.primary, borderColor: "rgba(245,158,11,0.18)" }}
          onClick={() => onRemove(key)}>
          {val}
          <X size={10} />
        </motion.button>
      ))}
      <button onClick={onClearAll}
        className="text-[10px] font-bold uppercase tracking-wider cursor-pointer bg-transparent border-none transition-opacity hover:opacity-70"
        style={{ color: "#ef4444" }}>
        Clear All
      </button>
    </motion.div>
  );
}

function EmptyState({ icon, message, actionLabel, onAction, c }: {
  icon: React.ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  c: Record<string, string>;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "rgba(245,158,11,0.08)", color: c.primary, border: "1px solid rgba(245,158,11,0.15)" }}>
        {icon}
      </motion.div>
      <p className="text-xs font-semibold mb-4" style={{ color: c.textMuted }}>{message}</p>
      {actionLabel && onAction && (
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border-none cursor-pointer shadow-lg"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
          {actionLabel}
        </motion.button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNSHIP CARD
// ═══════════════════════════════════════════════════════════════════════════════

function InternshipCard({
  internship, isSaved, matchScore, c, onSave, onClick,
}: {
  internship: Internship;
  isSaved: boolean;
  matchScore?: number;
  c: Record<string, string>;
  onSave: (id: string) => void;
  onClick: (internship: Internship) => void;
}) {
  return (
    <motion.div variants={staggerItem}
      whileHover={{ y: -4, borderColor: "rgba(245,158,11,0.25)", boxShadow: "0 20px 40px -15px rgba(0,0,0,0.3)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-2xl border overflow-hidden cursor-pointer group"
      style={{ background: c.cardBg, borderColor: c.border }}
      onClick={() => onClick(internship)}>
      {internship.featured && (
        <div className="px-5 py-1.5 text-[9px] font-black uppercase tracking-widest text-center"
          style={{ background: "rgba(245,158,11,0.08)", color: c.primary, borderBottom: "1px solid rgba(245,158,11,0.1)" }}>
          ★ Featured
        </div>
      )}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
              style={{ background: internship.logoBg || "rgba(245,158,11,0.1)", color: c.primary, border: `1px solid ${c.border}` }}>
              {internship.company?.charAt(0) || "C"}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold truncate" style={{ color: c.text }}>
                {internship.title}
              </h3>
              <p className="text-[10px] font-semibold truncate flex items-center gap-1" style={{ color: c.textMuted }}>
                <Building2 size={9} /> {internship.company}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {matchScore !== undefined && <AIScoreBadge score={matchScore} size="sm" />}
            <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onSave(internship.id); }}
              className="p-1.5 rounded-full border-none cursor-pointer transition-colors"
              style={{ background: isSaved ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)", color: isSaved ? c.primary : c.textMuted }}>
              {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
            </motion.button>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-semibold" style={{ color: c.textMuted }}>
          {internship.location && (
            <span className="flex items-center gap-1"><MapPin size={9} /> {internship.location}</span>
          )}
          {internship.mode && (
            <span className="flex items-center gap-1"><Globe size={9} /> {internship.mode}</span>
          )}
          {internship.duration && (
            <span className="flex items-center gap-1"><Clock size={9} /> {internship.duration}</span>
          )}
          {internship.stipend && (
            <span className="flex items-center gap-1"><DollarSign size={9} /> {internship.stipend}</span>
          )}
        </div>

        {internship.skills && internship.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {internship.skills.slice(0, 4).map((skill, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                style={{ background: "rgba(255,255,255,0.02)", color: c.textMuted, borderColor: c.border }}>
                {skill}
              </span>
            ))}
            {internship.skills.length > 4 && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{ color: c.textMuted }}>
                +{internship.skills.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: c.border }}>
          <span className="text-[10px] font-semibold" style={{ color: c.textMuted }}>
            {timeAgo(internship.postedDate)}
          </span>
          <span className="text-[10px] font-bold flex items-center gap-1 group-hover:text-amber-400 transition-colors"
            style={{ color: c.primary }}>
            View Details <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FILTER PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function FilterPanel({
  filters, onChange, isOpen, onToggle, companies, c,
}: {
  filters: FilterState;
  onChange: (key: keyof FilterState, value: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  companies: string[];
  c: Record<string, string>;
}) {
  const selectClass = "w-full text-[10px] rounded-xl px-3 py-2.5 border outline-none font-semibold transition-all cursor-pointer appearance-none";
  const selectStyle = {
    background: c.inputBg,
    borderColor: c.border,
    color: c.text,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
  };

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: c.cardBg, borderColor: c.border }}>
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 border-none cursor-pointer transition-colors"
        style={{ background: "transparent", color: c.text }}>
        <span className="flex items-center gap-2 text-xs font-bold">
          <SlidersHorizontal size={13} style={{ color: c.primary }} />
          Filters
        </span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: c.textMuted }} />
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
            className="overflow-hidden">
            <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 border-t pt-4" style={{ borderColor: c.border }}>
              <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Search</label>
                <input value={filters.search} onChange={e => onChange("search", e.target.value)}
                  placeholder="Search internships..."
                  className="w-full text-[10px] rounded-xl px-3 py-2.5 border outline-none font-semibold transition-all"
                  style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Company</label>
                <select value={filters.company} onChange={e => onChange("company", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">All Companies</option>
                  {companies.map(co => <option key={co} value={co}>{co}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Category</label>
                <select value={filters.category} onChange={e => onChange("category", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">All Categories</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Design">Design</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Location</label>
                <select value={filters.location} onChange={e => onChange("location", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">All Locations</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Country</label>
                <select value={filters.country} onChange={e => onChange("country", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">All Countries</option>
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
                  <option value="Germany">Germany</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Mode</label>
                <select value={filters.mode} onChange={e => onChange("mode", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">All Modes</option>
                  <option value="Remote">Remote</option>
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Duration</label>
                <select value={filters.duration} onChange={e => onChange("duration", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">Any Duration</option>
                  <option value="1 month">1 Month</option>
                  <option value="2 months">2 Months</option>
                  <option value="3 months">3 Months</option>
                  <option value="6 months">6 Months</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Paid / Unpaid</label>
                <select value={filters.isPaid} onChange={e => onChange("isPaid", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">All</option>
                  <option value="true">Paid</option>
                  <option value="false">Unpaid</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Internship Type</label>
                <select value={filters.internshipType} onChange={e => onChange("internshipType", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  <option value="">All Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Posted Date</label>
                <select value={filters.postedDate} onChange={e => onChange("postedDate", e.target.value)}
                  className={selectClass} style={selectStyle}>
                  {POSTED_DATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>Skills</label>
                <input value={filters.skills} onChange={e => onChange("skills", e.target.value)}
                  placeholder="e.g. React, Python"
                  className="w-full text-[10px] rounded-xl px-3 py-2.5 border outline-none font-semibold transition-all"
                  style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETAIL MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function DetailModal({
  internship, isSaved, c, onClose, onSave, onApply,
}: {
  internship: Internship;
  isSaved: boolean;
  c: Record<string, string>;
  onClose: () => void;
  onSave: (id: string) => void;
  onApply: (url?: string) => void;
}) {
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [skillGapResult, setSkillGapResult] = useState<{ matching?: string[]; missing?: string[] } | null>(null);
  const [similarInternships, setSimilarInternships] = useState<Internship[]>([]);
  const [shareCopied, setShareCopied] = useState(false);

  const handleAISummary = useCallback(async () => {
    setAiLoading("summary");
    setAiResult(null);
    try {
      const res = await api.post("/internship/ai/summary", { internshipId: internship.id });
      setAiResult(res.data.summary || res.data.result || JSON.stringify(res.data));
    } catch {
      toast.error("Failed to generate AI summary");
    } finally {
      setAiLoading(null);
    }
  }, [internship.id]);

  const handleSkillGap = useCallback(async () => {
    setAiLoading("skill-gap");
    setSkillGapResult(null);
    try {
      const res = await api.post("/internship/ai/skill-gap", { internshipId: internship.id });
      setSkillGapResult({ matching: res.data.matching, missing: res.data.missing });
    } catch {
      toast.error("Failed to analyze skill gap");
    } finally {
      setAiLoading(null);
    }
  }, [internship.id]);

  const handleShare = useCallback(async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: internship.title, text: `Check out this internship: ${internship.title} at ${internship.company}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setShareCopied(false), 2000);
      }
    } catch {
      toast.error("Failed to share");
    }
  }, [internship]);

  const fetchSimilar = useCallback(async () => {
    try {
      const res = await api.get(`/internship?category=${internship.category || ""}&limit=3`);
      setSimilarInternships((res.data.internships || res.data.data || []).filter((i: Internship) => i.id !== internship.id).slice(0, 3));
    } catch {}
  }, [internship]);

  useEffect(() => { fetchSimilar(); }, [fetchSimilar]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-16 bg-black/65 backdrop-blur-[6px] overflow-y-auto"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl border relative overflow-hidden mb-8"
        style={{ background: isDark(c) ? "#0c0d16" : "#ffffff", borderColor: c.border }}>

        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, #f59e0b, #ea580c, #f59e0b)" }} />

        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-black shrink-0"
              style={{ background: internship.logoBg || "rgba(245,158,11,0.1)", color: c.primary, border: `1px solid ${c.border}` }}>
              {internship.company?.charAt(0) || "C"}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-black tracking-tight" style={{ color: c.text, fontFamily: "var(--font-outfit)" }}>
                {internship.title}
              </h2>
              <p className="text-[11px] font-semibold flex items-center gap-1.5 mt-1" style={{ color: c.textMuted }}>
                <Building2 size={10} /> {internship.company}
                {internship.location && <><span className="mx-1">·</span><MapPin size={10} /> {internship.location}</>}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer transition-colors shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", color: c.textMuted }}>
            <X size={16} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="px-6 pb-4 grid grid-cols-4 gap-3">
          {[
            { icon: <Globe size={12} />, label: "Mode", value: internship.mode || "Remote" },
            { icon: <Clock size={12} />, label: "Duration", value: internship.duration || "N/A" },
            { icon: <DollarSign size={12} />, label: "Stipend", value: internship.stipend || "Unpaid" },
            { icon: <Calendar size={12} />, label: "Posted", value: timeAgo(internship.postedDate) },
          ].map((stat) => (
            <div key={stat.label} className="text-center py-2.5 rounded-xl border" style={{ background: "rgba(255,255,255,0.01)", borderColor: c.border }}>
              <div className="flex items-center justify-center mb-1" style={{ color: c.primary }}>{stat.icon}</div>
              <div className="text-[10px] font-bold" style={{ color: c.text }}>{stat.value}</div>
              <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleAISummary}
            disabled={aiLoading === "summary"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold border cursor-pointer disabled:opacity-50 transition-all"
            style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa", borderColor: "rgba(139,92,246,0.2)" }}>
            {aiLoading === "summary" ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} />}
            AI Summary
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSkillGap}
            disabled={aiLoading === "skill-gap"}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold border cursor-pointer disabled:opacity-50 transition-all"
            style={{ background: "rgba(6,182,212,0.08)", color: "#22d3ee", borderColor: "rgba(6,182,212,0.2)" }}>
            {aiLoading === "skill-gap" ? <Loader2 size={11} className="animate-spin" /> : <Target size={11} />}
            Skill Gap
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold border cursor-pointer transition-all"
            style={{ background: "rgba(255,255,255,0.03)", color: c.textMuted, borderColor: c.border }}>
            {shareCopied ? <Check size={11} /> : <Share2 size={11} />}
            {shareCopied ? "Copied!" : "Share"}
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => onSave(internship.id)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-bold border cursor-pointer transition-all"
            style={{ background: isSaved ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)", color: isSaved ? c.primary : c.textMuted, borderColor: isSaved ? "rgba(245,158,11,0.2)" : c.border }}>
            {isSaved ? <BookmarkCheck size={11} /> : <Bookmark size={11} />}
            {isSaved ? "Saved" : "Save"}
          </motion.button>
        </div>

        {/* AI Results */}
        <AnimatePresence>
          {aiResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mx-6 mb-4 rounded-xl border p-4"
              style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Brain size={12} className="text-purple-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">AI Summary</span>
              </div>
              <p className="text-[11px] leading-relaxed whitespace-pre-wrap" style={{ color: c.textSec }}>{stripMarkdown(aiResult)}</p>
            </motion.div>
          )}
          {skillGapResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mx-6 mb-4 rounded-xl border p-4"
              style={{ background: "rgba(6,182,212,0.05)", borderColor: "rgba(6,182,212,0.15)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Target size={12} className="text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">Skill Gap Analysis</span>
              </div>
              {skillGapResult.matching && skillGapResult.matching.length > 0 && (
                <div className="mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-green-400 block mb-1.5">Your Matching Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {skillGapResult.matching.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                        style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", borderColor: "rgba(34,197,94,0.2)" }}>
                        <CheckCircle2 size={8} className="inline mr-1" />{s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {skillGapResult.missing && skillGapResult.missing.length > 0 && (
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400 block mb-1.5">Skills to Develop</span>
                  <div className="flex flex-wrap gap-1.5">
                    {skillGapResult.missing.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                        style={{ background: "rgba(249,115,22,0.08)", color: "#f97316", borderColor: "rgba(249,115,22,0.2)" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Description */}
        <div className="px-6 pb-4">
          <h4 className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: c.textMuted }}>Description</h4>
          <p className="text-[11px] leading-relaxed" style={{ color: c.textSec }}>
            {internship.description || "No description available. Contact the company directly for more details about this internship opportunity."}
          </p>
        </div>

        {/* Responsibilities */}
        {internship.responsibilities && internship.responsibilities.length > 0 && (
          <div className="px-6 pb-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: c.textMuted }}>Responsibilities</h4>
            <ul className="space-y-1.5">
              {internship.responsibilities.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: c.textSec }}>
                  <CheckCircle2 size={10} className="shrink-0 mt-0.5" style={{ color: c.primary }} />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requirements */}
        {internship.requirements && internship.requirements.length > 0 && (
          <div className="px-6 pb-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: c.textMuted }}>Requirements</h4>
            <ul className="space-y-1.5">
              {internship.requirements.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: c.textSec }}>
                  <ArrowRight size={10} className="shrink-0 mt-0.5" style={{ color: c.primary }} />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills */}
        {internship.skills && internship.skills.length > 0 && (
          <div className="px-6 pb-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: c.textMuted }}>Required Skills</h4>
            <div className="flex flex-wrap gap-1.5">
              {internship.skills.map((skill, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full text-[9px] font-bold border"
                  style={{ background: "rgba(245,158,11,0.06)", color: c.primary, borderColor: "rgba(245,158,11,0.15)" }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        {internship.benefits && internship.benefits.length > 0 && (
          <div className="px-6 pb-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider mb-2" style={{ color: c.textMuted }}>Benefits</h4>
            <ul className="space-y-1.5">
              {internship.benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: c.textSec }}>
                  <Star size={10} className="shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Similar Internships */}
        {similarInternships.length > 0 && (
          <div className="px-6 pb-4">
            <h4 className="text-[10px] font-black uppercase tracking-wider mb-3" style={{ color: c.textMuted }}>Similar Internships</h4>
            <div className="space-y-2">
              {similarInternships.map((si) => (
                <div key={si.id} className="flex items-center justify-between p-3 rounded-xl border"
                  style={{ background: "rgba(255,255,255,0.01)", borderColor: c.border }}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                      style={{ background: "rgba(245,158,11,0.08)", color: c.primary }}>
                      {si.company?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold truncate" style={{ color: c.text }}>{si.title}</p>
                      <p className="text-[9px] truncate" style={{ color: c.textMuted }}>{si.company} · {si.location}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={12} style={{ color: c.textMuted }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apply Button */}
        <div className="p-6 pt-2 border-t" style={{ borderColor: c.border }}>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => onApply(internship.applyUrl)}
            className="w-full py-3 rounded-xl text-xs font-black border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
            Apply Now <ExternalLink size={13} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI CHAT SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function AIChatSidebar({
  isOpen, onClose, c,
}: {
  isOpen: boolean;
  onClose: () => void;
  c: Record<string, string>;
}) {
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: AIChatMessage = { role: "user", content: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await api.post("/internship/ai/chat", { message: msg, skills: skillsInput });
      const assistantMsg: AIChatMessage = {
        role: "assistant",
        content: res.data.reply || res.data.message || res.data.result || "I couldn't process that request.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting to the AI service. Please try again.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, skillsInput]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="fixed right-0 top-16 bottom-0 w-full sm:w-96 z-[9998] flex flex-col border-l h-[calc(100vh-4rem)]"
          style={{ background: isDark(c) ? "#0a0b12" : "#fafbfc", borderColor: c.border }}>
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: c.border }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(99,102,241,0.1))" }}>
                <Bot size={15} style={{ color: c.primary }} />
              </div>
              <div>
                <span className="text-xs font-black block" style={{ color: c.text }}>AI Assistant</span>
                <span className="text-[9px] font-semibold flex items-center gap-1" style={{ color: "#22c55e" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                </span>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer"
              style={{ background: "rgba(255,255,255,0.05)", color: c.textMuted }}>
              <X size={15} />
            </button>
          </div>

          {/* Skills Input */}
          <div className="px-5 py-3 border-b" style={{ borderColor: c.border }}>
            <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>
              Your Skills (comma separated)
            </label>
            <input value={skillsInput} onChange={e => setSkillsInput(e.target.value)}
              placeholder="e.g. React, Python, Machine Learning"
              className="w-full text-[10px] rounded-xl px-3 py-2 border outline-none font-semibold"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>

          {/* Quick Actions */}
          <div className="px-5 py-3 flex flex-wrap gap-1.5 border-b" style={{ borderColor: c.border }}>
            {AI_QUICK_ACTIONS.map(action => (
              <motion.button key={action.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => sendMessage(action.prompt)}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold border cursor-pointer disabled:opacity-40 transition-all"
                style={{ background: "rgba(245,158,11,0.05)", color: c.primary, borderColor: "rgba(245,158,11,0.15)" }}>
                <action.icon size={9} />
                {action.label}
              </motion.button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-10">
                <Bot size={28} className="mx-auto mb-3 opacity-30" style={{ color: c.textMuted }} />
                <p className="text-[10px] font-semibold" style={{ color: c.textMuted }}>
                  Ask me anything about internships, skills, or career advice.
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[11px] leading-relaxed ${msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={{
                    background: msg.role === "user" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.04)",
                    color: msg.role === "user" ? "#000" : c.textSec,
                    border: msg.role === "assistant" ? `1px solid ${c.border}` : "none",
                  }}>
                  {stripMarkdown(msg.content)}
                </div>
              </motion.div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm border flex items-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.03)", borderColor: c.border }}>
                  <Loader2 size={11} className="animate-spin" style={{ color: c.primary }} />
                  <span className="text-[10px] font-semibold" style={{ color: c.textMuted }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t" style={{ borderColor: c.border }}>
            <div className="flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Ask about internships..."
                disabled={loading}
                className="flex-1 text-[11px] rounded-xl px-3.5 py-2.5 border outline-none font-semibold disabled:opacity-50"
                style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-xl flex items-center justify-center border-none cursor-pointer disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                <Send size={13} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: isDark
// ═══════════════════════════════════════════════════════════════════════════════

function isDark(c: Record<string, string>): boolean {
  return c.text === "#ffffff";
}

// ═══════════════════════════════════════════════════════════════════════════════
// BROWSE TAB
// ═══════════════════════════════════════════════════════════════════════════════

function BrowseTab({
  c, isDark: isDarkMode,
}: {
  c: Record<string, string>;
  isDark: boolean;
}) {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [companies, setCompanies] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("postedDate:desc");

  const [filters, setFilters] = useState<FilterState>({
    search: "", company: "", category: "", location: "", country: "",
    mode: "", duration: "", isPaid: "", internshipType: "",
    sortBy: "postedDate", order: "desc", skills: "", postedDate: "",
  });

  const observerRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 12;

  const buildQueryParams = useCallback((pageNum: number, currentFilters: FilterState, sort: string) => {
    const [sortField, sortOrder] = sort.split(":");
    const params: Record<string, string> = {
      page: String(pageNum),
      limit: String(PAGE_SIZE),
      sortBy: sortField || "postedDate",
      order: sortOrder || "desc",
    };
    if (currentFilters.search) params.search = currentFilters.search;
    if (currentFilters.company) params.company = currentFilters.company;
    if (currentFilters.category) params.category = currentFilters.category;
    if (currentFilters.location) params.location = currentFilters.location;
    if (currentFilters.country) params.country = currentFilters.country;
    if (currentFilters.mode) params.mode = currentFilters.mode;
    if (currentFilters.duration) params.duration = currentFilters.duration;
    if (currentFilters.isPaid) params.isPaid = currentFilters.isPaid;
    if (currentFilters.internshipType) params.internshipType = currentFilters.internshipType;
    if (currentFilters.skills) params.skills = currentFilters.skills;
    if (currentFilters.postedDate) params.postedDate = currentFilters.postedDate;
    return params;
  }, []);

  const fetchInternships = useCallback(async (pageNum: number, currentFilters: FilterState, sort: string, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const params = buildQueryParams(pageNum, currentFilters, sort);
      const queryString = new URLSearchParams(params).toString();
      const res = await api.get(`/internship?${queryString}`);
      const data = res.data;
      const items = data.internships || data.data || data.results || [];
      const totalFromServer = data.total || data.totalCount || 0;

      setInternships(prev => append ? [...prev, ...items] : items);
      setTotal(totalFromServer);
      setHasMore(items.length === PAGE_SIZE);
    } catch (err) {
      console.error("[InternshipHub] Fetch error:", err);
      if (!append) setInternships([]);
      toast.error("Failed to load internships");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildQueryParams]);

  const fetchSavedIds = useCallback(async () => {
    try {
      const res = await api.get("/internship/user/saved");
      const data = res.data;
      const items: unknown[] = data.saved || data.data || data || [];
      const ids = items.map((s: unknown) => {
        const item = s as { internshipId?: string; internship?: { id: string }; id?: string };
        return item.internshipId || item.internship?.id || item.id;
      }).filter(Boolean);
      setSavedIds(new Set(ids));
    } catch {}
  }, []);

  const fetchCompanies = useCallback(async () => {
    try {
      const res = await api.get("/internship/companies");
      const data = res.data;
      setCompanies(data.companies || data.data || []);
    } catch {}
  }, []);

  useEffect(() => { fetchInternships(1, filters, sortBy); fetchSavedIds(); fetchCompanies(); }, []);

  useEffect(() => {
    setPage(1);
    fetchInternships(1, filters, sortBy, false);
  }, [filters, sortBy, fetchInternships]);

  useEffect(() => {
    if (page > 1) {
      fetchInternships(page, filters, sortBy, true);
    }
  }, [page, fetchInternships, filters, sortBy]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    const el = observerRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [hasMore, loadingMore, loading]);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: "", company: "", category: "", location: "", country: "",
      mode: "", duration: "", isPaid: "", internshipType: "",
      sortBy: "postedDate", order: "desc", skills: "", postedDate: "",
    });
  }, []);

  const handleSortChange = useCallback((val: string) => {
    setSortBy(val);
  }, []);

  const handleSave = useCallback(async (id: string) => {
    try {
      await api.post(`/internship/saved/${id}`);
      setSavedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); toast.success("Removed from saved"); }
        else { next.add(id); toast.success("Added to saved"); }
        return next;
      });
    } catch {
      toast.error("Failed to update saved status");
    }
  }, []);

  const handleApply = useCallback((url?: string) => {
    if (url) window.open(url, "_blank");
  }, []);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== "postedDate:desc" && v !== "postedDate" && v !== "desc").length;

  const displayFilters = useMemo(() => {
    const map: Record<string, string> = {};
    if (filters.search) map.search = filters.search;
    if (filters.company) map.company = filters.company;
    if (filters.category) map.category = filters.category;
    if (filters.location) map.location = filters.location;
    if (filters.country) map.country = filters.country;
    if (filters.mode) map.mode = filters.mode;
    if (filters.duration) map.duration = filters.duration;
    if (filters.isPaid) map.isPaid = filters.isPaid === "true" ? "Paid" : "Unpaid";
    if (filters.internshipType) map.internshipType = filters.internshipType;
    if (filters.skills) map.skills = filters.skills;
    if (filters.postedDate) map.postedDate = POSTED_DATE_OPTIONS.find(o => o.value === filters.postedDate)?.label || filters.postedDate;
    return map;
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Search & Sort Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: c.textMuted }} />
          <input value={filters.search} onChange={e => handleFilterChange("search", e.target.value)}
            placeholder="Search internships by title, company, or skill..."
            className="w-full text-[11px] rounded-xl pl-9 pr-4 py-3 border outline-none font-semibold transition-all"
            style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
        </div>
        <div className="flex gap-2">
          <select value={sortBy} onChange={e => handleSortChange(e.target.value)}
            className="text-[10px] rounded-xl px-3 py-2.5 border outline-none font-bold cursor-pointer"
            style={{ background: c.inputBg, borderColor: c.border, color: c.text }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-bold border cursor-pointer transition-all"
            style={{
              background: activeFilterCount > 0 ? "rgba(245,158,11,0.08)" : c.inputBg,
              borderColor: activeFilterCount > 0 ? "rgba(245,158,11,0.25)" : c.border,
              color: activeFilterCount > 0 ? c.primary : c.textMuted,
            }}>
            <Filter size={11} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background: c.primary, color: "#000" }}>
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </div>

      {/* Filter Panel */}
      <FilterPanel filters={filters} onChange={handleFilterChange}
        isOpen={filterOpen} onToggle={() => setFilterOpen(!filterOpen)}
        companies={companies} c={c} />

      {/* Active Filters */}
      <ActiveFilters filters={displayFilters}
        onRemove={(key) => handleFilterChange(key as keyof FilterState, "")}
        onClearAll={handleClearFilters} c={c} />

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>
          {total > 0 ? `${total} internship${total !== 1 ? "s" : ""} found` : loading ? "Loading..." : "No results"}
        </span>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} c={c} />)}
        </div>
      )}

      {/* Internship Grid */}
      {!loading && internships.length === 0 && (
        <EmptyState icon={<Briefcase size={28} />} message="No internships found matching your criteria. Try adjusting your filters."
          actionLabel="Clear Filters" onAction={handleClearFilters} c={c} />
      )}

      <AnimatePresence>
        {!loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {internships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship}
                isSaved={savedIds.has(internship.id)} c={c}
                onSave={handleSave} onClick={setSelectedInternship} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Infinite Scroll Trigger */}
      <div ref={observerRef} className="h-4" />
      {loadingMore && (
        <div className="flex items-center justify-center py-4 gap-2">
          <Loader2 size={14} className="animate-spin" style={{ color: c.primary }} />
          <span className="text-[10px] font-bold" style={{ color: c.textMuted }}>Loading more...</span>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedInternship && (
          <DetailModal internship={selectedInternship}
            isSaved={savedIds.has(selectedInternship.id)} c={c}
            onClose={() => setSelectedInternship(null)}
            onSave={handleSave} onApply={handleApply} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI MATCH TAB
// ═══════════════════════════════════════════════════════════════════════════════

function AIMatchTab({ c, isDark: isDarkMode }: { c: Record<string, string>; isDark: boolean }) {
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const fetchSavedIds = useCallback(async () => {
    try {
      const res = await api.get("/internship/user/saved");
      const data = res.data;
      const items: unknown[] = data.saved || data.data || data || [];
      const ids = items.map((s: unknown) => {
        const item = s as { internshipId?: string; internship?: { id: string }; id?: string };
        return item.internshipId || item.internship?.id || item.id;
      }).filter(Boolean);
      setSavedIds(new Set(ids));
    } catch {}
  }, []);

  useEffect(() => { fetchSavedIds(); }, [fetchSavedIds]);

  const handleRecommend = useCallback(async () => {
    if (!skills.trim()) { toast.error("Please enter your skills"); return; }
    setLoading(true);
    try {
      const res = await api.post("/internship/ai/recommend", {
        skills: skills.split(",").map(s => s.trim()).filter(Boolean),
        interests: interests.split(",").map(s => s.trim()).filter(Boolean),
      });
      setRecommendations(res.data.recommendations || res.data.data || []);
      setHasGenerated(true);
    } catch {
      toast.error("Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  }, [skills, interests]);

  const handleSave = useCallback(async (id: string) => {
    try {
      await api.post(`/internship/saved/${id}`);
      setSavedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); toast.success("Removed from saved"); }
        else { next.add(id); toast.success("Added to saved"); }
        return next;
      });
    } catch {
      toast.error("Failed to update saved status");
    }
  }, []);

  const handleApply = useCallback((url?: string) => {
    if (url) window.open(url, "_blank");
  }, []);

  return (
    <div className="space-y-5">
      {/* AI Input Panel */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible"
        className="rounded-2xl border p-6 space-y-4"
        style={{ background: c.cardBg, borderColor: c.border }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.1))" }}>
            <Sparkles size={18} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-xs font-black" style={{ color: c.text }}>AI Internship Matcher</h3>
            <p className="text-[9px] font-semibold" style={{ color: c.textMuted }}>
              Enter your skills and interests for personalized recommendations
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>
              Your Skills *
            </label>
            <input value={skills} onChange={e => setSkills(e.target.value)}
              placeholder="React, Python, Machine Learning..."
              className="w-full text-[11px] rounded-xl px-3.5 py-3 border outline-none font-semibold transition-all"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: c.textMuted }}>
              Interests
            </label>
            <input value={interests} onChange={e => setInterests(e.target.value)}
              placeholder="AI, Web Dev, Cloud..."
              className="w-full text-[11px] rounded-xl px-3.5 py-3 border outline-none font-semibold transition-all"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>
        </div>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          onClick={handleRecommend} disabled={loading || !skills.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#fff" }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? "Analyzing..." : "Get Recommendations"}
        </motion.button>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} c={c} />)}
        </div>
      )}

      {/* Empty State */}
      {!loading && hasGenerated && recommendations.length === 0 && (
        <EmptyState icon={<Sparkles size={28} />}
          message="No matching internships found. Try adding more skills or broadening your interests."
          c={c} />
      )}

      {!loading && !hasGenerated && (
        <div className="text-center py-16">
          <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}>
            <Brain size={32} className="text-purple-400" />
          </motion.div>
          <h3 className="text-sm font-black mb-2" style={{ color: c.text }}>AI-Powered Matching</h3>
          <p className="text-[11px] max-w-sm mx-auto" style={{ color: c.textMuted }}>
            Enter your skills and interests above, and our AI will find the best internship matches for you with personalized scores and reasons.
          </p>
        </div>
      )}

      {/* Recommendations */}
      <AnimatePresence>
        {!loading && recommendations.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
            <h3 className="text-xs font-black" style={{ color: c.text }}>
              Top Matches ({recommendations.length})
            </h3>
            {recommendations.map((rec, i) => (
              <motion.div key={rec.internship.id || i} variants={staggerItem}
                whileHover={{ y: -3, borderColor: "rgba(245,158,11,0.25)" }}
                className="rounded-2xl border overflow-hidden cursor-pointer"
                style={{ background: c.cardBg, borderColor: c.border }}
                onClick={() => setSelectedInternship(rec.internship)}>
                <div className="absolute top-0 left-0 right-0 h-[1px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${rec.matchScore >= 70 ? "#22c55e" : rec.matchScore >= 50 ? "#f59e0b" : "#ef4444"}40, transparent)` }} />
                <div className="p-5 flex items-start gap-4">
                  <AIScoreBadge score={rec.matchScore} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold" style={{ color: c.text }}>{rec.internship.title}</h4>
                    <p className="text-[10px] font-semibold flex items-center gap-1 mt-0.5" style={{ color: c.textMuted }}>
                      <Building2 size={9} /> {rec.internship.company} · {rec.internship.location}
                    </p>
                    {rec.reason && (
                      <p className="text-[10px] mt-2 leading-relaxed" style={{ color: c.textSec }}>
                        <Sparkles size={9} className="inline mr-1 text-purple-400" />
                        {rec.reason}
                      </p>
                    )}
                    {rec.missingSkills && rec.missingSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>Missing:</span>
                        {rec.missingSkills.map((s, j) => (
                          <span key={j} className="px-2 py-0.5 rounded-full text-[8px] font-bold border"
                            style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444", borderColor: "rgba(239,68,68,0.15)" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handleSave(rec.internship.id); }}
                      className="p-2 rounded-lg border cursor-pointer transition-colors"
                      style={{
                        background: savedIds.has(rec.internship.id) ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.02)",
                        borderColor: savedIds.has(rec.internship.id) ? "rgba(245,158,11,0.2)" : c.border,
                        color: savedIds.has(rec.internship.id) ? c.primary : c.textMuted,
                      }}>
                      {savedIds.has(rec.internship.id) ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedInternship && (
          <DetailModal internship={selectedInternship}
            isSaved={savedIds.has(selectedInternship.id)} c={c}
            onClose={() => setSelectedInternship(null)}
            onSave={handleSave} onApply={handleApply} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKER TAB
// ═══════════════════════════════════════════════════════════════════════════════

function TrackerTab({ c, isDark: isDarkMode }: { c: Record<string, string>; isDark: boolean }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/internship/user/applications");
      const data = res.data;
      setApplications(data.applications || data.data || data || []);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const handleStatusUpdate = useCallback(async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      await api.put(`/internship/applications/${appId}`, { status: newStatus });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      toast.success("Status updated!");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const grouped = useMemo(() => {
    const map: Record<TrackerColumn, Application[]> = {
      saved: [], applied: [], under_review: [], shortlisted: [],
      interview_scheduled: [], offer_received: [], rejected: [],
    };
    applications.forEach(app => {
      const status = (app.status || "saved") as TrackerColumn;
      if (map[status]) map[status].push(app);
      else map.applied.push(app);
    });
    return map;
  }, [applications]);

  const stats = useMemo(() => ({
    total: applications.length,
    interviews: applications.filter(a => a.status === "interview_scheduled").length,
    offers: applications.filter(a => a.status === "offer_received").length,
    shortlisted: applications.filter(a => a.status === "shortlisted").length,
  }), [applications]);

  return (
    <div className="space-y-5">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Applications", value: stats.total, color: c.primary, icon: <Briefcase size={14} /> },
          { label: "Interviews", value: stats.interviews, color: "#10b981", icon: <Calendar size={14} /> },
          { label: "Offers", value: stats.offers, color: "#22c55e", icon: <CheckCircle2 size={14} /> },
          { label: "Shortlisted", value: stats.shortlisted, color: "#06b6d4", icon: <Star size={14} /> },
        ].map((stat) => (
          <motion.div key={stat.label} variants={staggerItem}
            className="rounded-xl border p-3.5 text-center"
            style={{ background: c.cardBg, borderColor: c.border }}>
            <div className="flex items-center justify-center mb-1.5" style={{ color: stat.color }}>{stat.icon}</div>
            <div className="text-lg font-black" style={{ color: c.text }}>{stat.value}</div>
            <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Kanban Board */}
      {loading ? (
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
      ) : applications.length === 0 ? (
        <EmptyState icon={<BarChart3 size={28} />}
          message="No applications tracked yet. Start by saving or applying to internships from the Browse tab."
          c={c} />
      ) : (
        <div className="overflow-x-auto pb-4 -mx-2 px-2">
          <div className="flex gap-3 min-w-max">
            {TRACKER_COLUMNS.map(col => (
              <div key={col.id} className="w-56 shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.textMuted }}>
                    {col.label}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${col.color}15`, color: col.color }}>
                    {grouped[col.id].length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px] rounded-xl p-2 border"
                  style={{ background: `${c.textMuted}04`, borderColor: c.border }}>
                  {grouped[col.id].map(app => (
                    <motion.div key={app.id} layout
                      className="rounded-xl border p-3 cursor-pointer group"
                      style={{ background: c.cardBg, borderColor: c.border }}
                      whileHover={{ borderColor: "rgba(245,158,11,0.25)" }}>
                      <p className="text-[10px] font-bold truncate" style={{ color: c.text }}>
                        {app.role || app.internship?.title || "Internship"}
                      </p>
                      <p className="text-[9px] font-semibold mt-0.5 flex items-center gap-1" style={{ color: c.textMuted }}>
                        <Building2 size={8} /> {app.company || app.internship?.company || "Company"}
                      </p>
                      <p className="text-[8px] font-semibold mt-1" style={{ color: c.textMuted }}>
                        {timeAgo(app.appliedAt)}
                      </p>
                      {/* Status change dropdown */}
                      <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <select value={app.status} onChange={(e) => { e.stopPropagation(); handleStatusUpdate(app.id, e.target.value); }}
                          disabled={updatingId === app.id}
                          className="w-full text-[8px] rounded-lg px-2 py-1 border outline-none font-bold cursor-pointer"
                          style={{ background: c.inputBg, borderColor: c.border, color: c.textMuted }}>
                          {TRACKER_COLUMNS.map(tc => (
                            <option key={tc.id} value={tc.id}>{tc.label}</option>
                          ))}
                        </select>
                      </div>
                    </motion.div>
                  ))}
                  {grouped[col.id].length === 0 && (
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAVED TAB
// ═══════════════════════════════════════════════════════════════════════════════

function SavedTab({ c, isDark: isDarkMode }: { c: Record<string, string>; isDark: boolean }) {
  const [savedItems, setSavedItems] = useState<SavedInternship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/internship/user/saved");
      const data = res.data;
      setSavedItems(data.saved || data.data || data || []);
    } catch {
      toast.error("Failed to load saved internships");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const handleUnsave = useCallback(async (id: string) => {
    setRemovingId(id);
    try {
      await api.post(`/internship/saved/${id}`);
      setSavedItems(prev => prev.filter(s => (s.internshipId || s.internship?.id || s.id) !== id));
      toast.success("Removed from saved");
    } catch {
      toast.error("Failed to remove saved internship");
    } finally {
      setRemovingId(null);
    }
  }, []);

  const handleApply = useCallback((url?: string) => {
    if (url) window.open(url, "_blank");
  }, []);

  const savedInternships = useMemo(() =>
    savedItems.map(s => s.internship).filter(Boolean) as Internship[],
    [savedItems]
  );

  return (
    <div className="space-y-4">
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} c={c} />)}
        </div>
      )}

      {!loading && savedInternships.length === 0 && (
        <EmptyState icon={<Bookmark size={28} />}
          message="No saved internships yet. Browse internships and click the bookmark icon to save them here."
          c={c} />
      )}

      <AnimatePresence>
        {!loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedInternships.map((internship) => (
              <motion.div key={internship.id} variants={staggerItem}
                layout exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -4, borderColor: "rgba(245,158,11,0.25)" }}
                className="rounded-2xl border overflow-hidden group"
                style={{ background: c.cardBg, borderColor: c.border }}>
                <div className="p-5 space-y-3 cursor-pointer" onClick={() => setSelectedInternship(internship)}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                        style={{ background: internship.logoBg || "rgba(245,158,11,0.1)", color: c.primary, border: `1px solid ${c.border}` }}>
                        {internship.company?.charAt(0) || "C"}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold truncate" style={{ color: c.text }}>{internship.title}</h3>
                        <p className="text-[10px] font-semibold truncate flex items-center gap-1" style={{ color: c.textMuted }}>
                          <Building2 size={9} /> {internship.company}
                        </p>
                      </div>
                    </div>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handleUnsave(internship.id); }}
                      disabled={removingId === internship.id}
                      className="p-1.5 rounded-full border-none cursor-pointer transition-colors disabled:opacity-40"
                      style={{ background: "rgba(245,158,11,0.1)", color: c.primary }}>
                      {removingId === internship.id ? <Loader2 size={12} className="animate-spin" /> : <BookmarkCheck size={12} />}
                    </motion.button>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] font-semibold" style={{ color: c.textMuted }}>
                    {internship.location && <span className="flex items-center gap-1"><MapPin size={9} /> {internship.location}</span>}
                    {internship.mode && <span className="flex items-center gap-1"><Globe size={9} /> {internship.mode}</span>}
                    {internship.duration && <span className="flex items-center gap-1"><Clock size={9} /> {internship.duration}</span>}
                    {internship.stipend && <span className="flex items-center gap-1"><DollarSign size={9} /> {internship.stipend}</span>}
                  </div>

                  {internship.skills && internship.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {internship.skills.slice(0, 3).map((skill, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
                          style={{ background: "rgba(255,255,255,0.02)", color: c.textMuted, borderColor: c.border }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: c.border }}>
                    <span className="text-[10px] font-semibold" style={{ color: c.textMuted }}>{timeAgo(internship.postedDate)}</span>
                    <span className="text-[10px] font-bold flex items-center gap-1 group-hover:text-amber-400 transition-colors" style={{ color: c.primary }}>
                      View <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedInternship && (
          <DetailModal internship={selectedInternship}
            isSaved={true} c={c}
            onClose={() => setSelectedInternship(null)}
            onSave={handleUnsave} onApply={handleApply} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function InternshipHubView({ setView, activeModule }: InternshipHubViewProps) {
  const theme = useTheme();
  const isDarkMode = theme === "dark";

  const c = useMemo(() => ({
    text: isDarkMode ? "#ffffff" : "#0f172a",
    textSec: isDarkMode ? "rgba(255,255,255,0.75)" : "#334155",
    textMuted: isDarkMode ? "rgba(255,255,255,0.45)" : "#64748b",
    cardBg: isDarkMode ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.8)",
    border: isDarkMode ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
    primary: "#f59e0b",
    primaryGradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    inputBg: isDarkMode ? "rgba(0,0,0,0.2)" : "#f8fafc",
  }), [isDarkMode]);

  // Determine active tab from activeModule prop
  const initialTab = useMemo(() => {
    if (!activeModule) return "browse";
    const found = TABS.find(t => t.module === activeModule);
    return found ? found.id : "browse";
  }, [activeModule]);

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [aiSidebarOpen, setAiSidebarOpen] = useState(false);

  useEffect(() => {
    if (activeModule) {
      const found = TABS.find(t => t.module === activeModule);
      if (found) setActiveTab(found.id);
    }
  }, [activeModule]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 relative z-10 px-2 sm:px-4">

      {/* Background Ambient Blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-72 h-72 rounded-full blur-[120px] pointer-events-none"
        style={{ background: "rgba(245,158,11,0.04)" }} />
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 rounded-full blur-[150px] pointer-events-none"
        style={{ background: "rgba(99,102,241,0.03)" }} />

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b"
        style={{ borderColor: c.border }}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: c.primary }}>
              Internship Hub
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.1em]">Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight" style={{ color: c.text, fontFamily: "var(--font-outfit)" }}>
            Find Your Dream Internship
          </h1>
          <p className="text-xs" style={{ color: c.textMuted }}>
            Browse, match, and track internship opportunities powered by AI
          </p>
        </div>

        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={() => setAiSidebarOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold border cursor-pointer transition-all"
          style={{ background: "rgba(139,92,246,0.08)", color: "#a78bfa", borderColor: "rgba(139,92,246,0.2)" }}>
          <Bot size={13} />
          AI Assistant
        </motion.button>
      </motion.div>

      {/* ── Tab Navigation ── */}
      <div className="flex p-1 rounded-2xl gap-0.5 overflow-x-auto"
        style={{ background: isDarkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)", border: `1px solid ${c.border}` }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 min-w-[100px] py-3 px-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer focus:outline-none border-none bg-transparent"
              style={{ color: active ? c.primary : c.textMuted }}>
              {active && (
                <motion.div layoutId="internship-tab-bg"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: isDarkMode ? "rgba(255,255,255,0.04)" : "#ffffff", border: `1px solid ${c.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }} />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon size={13} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === "browse" && (
          <motion.div key="browse" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            <BrowseTab c={c} isDark={isDarkMode} />
          </motion.div>
        )}
        {activeTab === "ai-match" && (
          <motion.div key="ai-match" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            <AIMatchTab c={c} isDark={isDarkMode} />
          </motion.div>
        )}
        {activeTab === "tracker" && (
          <motion.div key="tracker" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            <TrackerTab c={c} isDark={isDarkMode} />
          </motion.div>
        )}
        {activeTab === "saved" && (
          <motion.div key="saved" variants={fadeUp} initial="hidden" animate="visible" exit="exit">
            <SavedTab c={c} isDark={isDarkMode} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Chat Sidebar ── */}
      <AIChatSidebar isOpen={aiSidebarOpen} onClose={() => setAiSidebarOpen(false)} c={c} />

      {/* Backdrop for AI sidebar */}
      <AnimatePresence>
        {aiSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[9997] sm:hidden"
            onClick={() => setAiSidebarOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
