"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { cn } from "@/lib/cn";
import { useThemeColors } from "@/hooks/useThemeColors";
import {
  PremiumCard,
  PremiumButton,
  PremiumBadge,
  PremiumDialog,
} from "@/components/ui/PremiumComponents";
import { fadeUp } from "@/utils/animations";
import {
  Search, ExternalLink, Bookmark, BookmarkCheck, Trash2,
  MapPin, Clock, Users, Building2, DollarSign, Briefcase,
  Loader2, Globe, Sparkles, AlertTriangle, ChevronDown,
  ChevronUp, LinkIcon, ArrowUpRight, Brain, CheckCircle2,
  Target, X, Filter,
} from "lucide-react";
import { toast } from "sonner";

interface LinkedInJob {
  id?: string;
  link: string;
  title: string;
  companyName: string;
  companyLogo?: string;
  location?: string;
  salaryInfo?: string;
  postedAt?: string;
  descriptionHtml?: string;
  descriptionText?: string;
  applicantsCount?: string;
  applyUrl?: string;
  seniorityLevel?: string;
  employmentType?: string;
  jobFunction?: string;
  industries?: string;
  benefits?: string;
  jobPosterName?: string;
  jobPosterTitle?: string;
  companyWebsite?: string;
  companyEmployeesCount?: number;
  workplaceType?: string;
  workRemoteAllowed?: boolean;
}

interface SavedJob extends LinkedInJob {
  id: string;
  savedAt: string;
  aiAnalysis?: any;
}

interface JobAnalysis {
  fitScore: number;
  skillMatch: { matched: string[]; missing: string[] };
  strengths: string[];
  gaps: string[];
  recommendation: string;
  actionItems: string[];
}

const QUICK_FILTERS = [
  { label: "Internships", suffix: "&f_E=1&f_JT=I" },
  { label: "Entry Level", suffix: "&f_E=2" },
  { label: "Remote", suffix: "&f_WT=2" },
  { label: "Full-time", suffix: "&f_JT=F" },
  { label: "Last 24h", suffix: "&f_TPR=r86400" },
  { label: "Past Week", suffix: "&f_TPR=r604800" },
];

function JobCard({
  job,
  onSave,
  onAnalyze,
  saved,
  analyzing,
  c,
}: {
  job: LinkedInJob;
  onSave: () => void;
  onAnalyze: () => void;
  saved?: boolean;
  analyzing?: boolean;
  c: ReturnType<typeof useThemeColors>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-2xl backdrop-blur-md overflow-hidden transition-all"
      style={{
        background: c.cardBg,
        border: `1px solid ${c.border}`,
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {job.companyLogo ? (
            <img
              src={job.companyLogo}
              alt={job.companyName}
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
              style={{ border: `1px solid ${c.border}` }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: c.surface }}>
              <Building2 size={20} style={{ color: c.textMuted }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate" style={{ color: c.text }}>
              {job.title}
            </h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: c.textSec }}>
              {job.companyName}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {job.location && (
                <span className="text-[10px] flex items-center gap-1" style={{ color: c.textMuted }}>
                  <MapPin size={10} /> {job.location}
                </span>
              )}
              {job.salaryInfo && (
                <span className="text-[10px] flex items-center gap-1" style={{ color: c.textMuted }}>
                  <DollarSign size={10} /> {job.salaryInfo}
                </span>
              )}
              {job.postedAt && (
                <span className="text-[10px] flex items-center gap-1" style={{ color: c.textMuted }}>
                  <Clock size={10} /> {job.postedAt}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={onSave}
              className="p-1.5 rounded-lg transition-colors"
              style={{ background: saved ? `${c.amber}15` : "transparent" }}
              aria-label={saved ? "Remove from saved" : "Save job"}
            >
              {saved ? (
                <BookmarkCheck size={16} style={{ color: c.amber }} />
              ) : (
                <Bookmark size={16} style={{ color: c.textMuted }} />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {job.seniorityLevel && (
            <PremiumBadge variant="purple">{job.seniorityLevel}</PremiumBadge>
          )}
          {job.employmentType && (
            <PremiumBadge variant="amber">{job.employmentType}</PremiumBadge>
          )}
          {job.applicantsCount && (
            <PremiumBadge variant="cyan">
              <Users size={10} className="mr-1" /> {job.applicantsCount}
            </PremiumBadge>
          )}
        </div>

        {job.benefits && (() => {
          try {
            const benefits = typeof job.benefits === "string" ? JSON.parse(job.benefits) : job.benefits;
            if (Array.isArray(benefits) && benefits.length > 0) {
              return (
                <div className="flex flex-wrap gap-1 mt-2">
                  {benefits.map((b: string, i: number) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: `${c.green}15`, color: c.green }}>
                      {b}
                    </span>
                  ))}
                </div>
              );
            }
          } catch { }
          return null;
        })()}

        <div className="flex items-center gap-2 mt-3">
          <a
            href={job.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ background: `${c.blue}15`, color: c.blue }}
          >
            <ExternalLink size={10} /> View on LinkedIn
          </a>
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ background: `${c.green}15`, color: c.green }}
            >
              <ArrowUpRight size={10} /> Apply Now
            </a>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg ml-auto transition-colors"
            style={{ background: c.surface, color: c.textSec }}
          >
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {expanded ? "Less" : "Details"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: `1px solid ${c.border}` }}>
              {job.descriptionText && (
                <div className="pt-3">
                  <p className="text-[10px] font-bold uppercase mb-1" style={{ color: c.textMuted }}>
                    Description
                  </p>
                  <p className="text-xs leading-relaxed max-h-[200px] overflow-y-auto"
                    style={{ color: c.textSec, scrollbarWidth: "thin" }}>
                    {job.descriptionText.slice(0, 2000)}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {job.jobFunction && (
                  <div style={{ color: c.textMuted }}>
                    <span className="font-bold">Function:</span> {job.jobFunction}
                  </div>
                )}
                {job.industries && (
                  <div style={{ color: c.textMuted }}>
                    <span className="font-bold">Industry:</span> {job.industries}
                  </div>
                )}
                {job.companyWebsite && (
                  <div style={{ color: c.textMuted }}>
                    <span className="font-bold">Website:</span>{" "}
                    <a href={job.companyWebsite} target="_blank" rel="noopener noreferrer"
                      className="underline" style={{ color: c.blue }}>
                      {job.companyWebsite.replace("https://", "")}
                    </a>
                  </div>
                )}
                {job.companyEmployeesCount && (
                  <div style={{ color: c.textMuted }}>
                    <span className="font-bold">Employees:</span> {job.companyEmployeesCount.toLocaleString()}
                  </div>
                )}
                {job.jobPosterName && (
                  <div style={{ color: c.textMuted }}>
                    <span className="font-bold">Posted by:</span> {job.jobPosterName}
                  </div>
                )}
                {job.workplaceType && (
                  <div style={{ color: c.textMuted }}>
                    <span className="font-bold">Workplace:</span> {job.workplaceType}
                  </div>
                )}
              </div>
              <PremiumButton
                variant="glow"
                className="w-full text-xs"
                loading={analyzing}
                onClick={onAnalyze}
                icon={<Brain size={14} />}
              >
                Analyze Job Fit with AI
              </PremiumButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AnalysisModal({
  analysis,
  job,
  open,
  onClose,
  c,
}: {
  analysis: JobAnalysis;
  job: SavedJob;
  open: boolean;
  onClose: () => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  if (!analysis) return null;

  const scoreColor =
    analysis.fitScore >= 75 ? c.green : analysis.fitScore >= 50 ? c.amber : c.rose;

  return (
    <PremiumDialog open={open} onClose={onClose} title="AI Job Fit Analysis">
      <div className="space-y-4 p-1">
        <div className="flex items-center gap-4">
          <div className="relative">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke={c.border} strokeWidth="6" />
              <circle
                cx="40" cy="40" r="35" fill="none"
                stroke={scoreColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(analysis.fitScore / 100) * 220} 220`}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-extrabold" style={{ color: scoreColor }}>
                {analysis.fitScore}%
              </span>
              <span className="text-[8px]" style={{ color: c.textMuted }}>Fit</span>
            </div>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold" style={{ color: c.text }}>{job.title}</h4>
            <p className="text-xs" style={{ color: c.textSec }}>{job.companyName}</p>
            <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>{analysis.recommendation}</p>
          </div>
        </div>

        {analysis.skillMatch && (
          <div>
            <p className="text-[10px] font-bold uppercase mb-2" style={{ color: c.textMuted }}>
              Skill Match
            </p>
            <div className="flex flex-wrap gap-1">
              {(analysis.skillMatch.matched || []).map((s, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: `${c.green}15`, color: c.green }}>
                  <CheckCircle2 size={8} /> {s}
                </span>
              ))}
              {(analysis.skillMatch.missing || []).map((s, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: `${c.rose}15`, color: c.rose }}>
                  <X size={8} /> {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.strengths?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: c.green }}>Strengths</p>
            {analysis.strengths.map((s, i) => (
              <p key={i} className="text-xs flex items-start gap-1.5 mb-1" style={{ color: c.textSec }}>
                <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: c.green }} />
                {s}
              </p>
            ))}
          </div>
        )}

        {analysis.gaps?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: c.rose }}>Gaps to Address</p>
            {analysis.gaps.map((g, i) => (
              <p key={i} className="text-xs flex items-start gap-1.5 mb-1" style={{ color: c.textSec }}>
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" style={{ color: c.rose }} />
                {g}
              </p>
            ))}
          </div>
        )}

        {analysis.actionItems?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase mb-1" style={{ color: c.amber }}>Action Items</p>
            {analysis.actionItems.map((a, i) => (
              <p key={i} className="text-xs flex items-start gap-1.5 mb-1" style={{ color: c.textSec }}>
                <Target size={12} className="mt-0.5 flex-shrink-0" style={{ color: c.amber }} />
                {a}
              </p>
            ))}
          </div>
        )}
      </div>
    </PremiumDialog>
  );
}

export function LinkedInJobScraperView({ setView }: { setView?: (v: string) => void }) {
  const tc = useThemeColors();

  const [tab, setTab] = useState<"search" | "saved">("search");
  const [url, setUrl] = useState("https://www.linkedin.com/jobs/search/?position=1&pageNum=0");
  const [count, setCount] = useState(50);
  const [scraping, setScraping] = useState(false);
  const [results, setResults] = useState<LinkedInJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null);
  const [analysisModal, setAnalysisModal] = useState<{ open: boolean; analysis: JobAnalysis; job: SavedJob } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedJobs = useCallback(async () => {
    try {
      const res = await api.get("/linkedin-jobs/saved");
      if (res.data.success) {
        setSavedJobs(res.data.jobs);
        setSavedIds(new Set(res.data.jobs.map((j: SavedJob) => j.link)));
      }
    } catch (err) {
      console.error("Failed to fetch saved jobs:", err);
    }
  }, []);

  useEffect(() => {
    fetchSavedJobs();
  }, [fetchSavedJobs]);

  const handleScrape = async () => {
    if (!url.includes("linkedin.com/jobs")) {
      toast.error("Please provide a valid LinkedIn jobs URL");
      return;
    }
    setScraping(true);
    setError(null);
    setResults([]);
    try {
      const res = await api.post("/linkedin-jobs/search", { url, count });
      if (res.data.success) {
        setResults(res.data.jobs);
        toast.success(`Found ${res.data.total} jobs`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || "Scraping failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setScraping(false);
    }
  };

  const handleQuickFilter = (suffix: string) => {
    const baseUrl = url.split("&f_")[0];
    setUrl(baseUrl + suffix);
  };

  const handleSave = async (job: LinkedInJob) => {
    if (savedIds.has(job.link)) {
      try {
        await api.delete(`/linkedin-jobs/saved/${job.link}`);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(job.link);
          return next;
        });
        setSavedJobs((prev) => prev.filter((j) => j.link !== job.link));
        toast.success("Job removed");
      } catch {
        toast.error("Failed to remove job");
      }
    } else {
      try {
        const res = await api.post("/linkedin-jobs/save", job);
        if (res.data.success) {
          setSavedIds((prev) => new Set([...prev, job.link]));
          setSavedJobs((prev) => [res.data.job, ...prev]);
          toast.success("Job saved!");
        }
      } catch {
        toast.error("Failed to save job");
      }
    }
  };

  const handleAnalyze = async (jobId: string, job: SavedJob) => {
    setAnalyzingJobId(jobId);
    try {
      const res = await api.post(`/linkedin-jobs/analyze/${jobId}`);
      if (res.data.success) {
        setAnalysisModal({ open: true, analysis: res.data.analysis, job: { ...job, aiAnalysis: res.data.analysis } });
        setSavedJobs((prev) =>
          prev.map((j) => (j.id === jobId ? { ...j, aiAnalysis: res.data.analysis } : j))
        );
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Analysis failed");
    } finally {
      setAnalyzingJobId(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    try {
      await api.delete(`/linkedin-jobs/saved/${jobId}`);
      setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
      toast.success("Job removed");
    } catch {
      toast.error("Failed to remove job");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-[10px] font-extrabold text-amber-500 uppercase tracking-[0.2em] mb-1">
            JOB HUB
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: tc.text }}>
            LinkedIn Job Scraper
          </h1>
          <p className="text-xs mt-1" style={{ color: tc.textMuted }}>
            Scrape LinkedIn jobs with full details. Paste any LinkedIn jobs search URL to begin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("search")}
            className={cn(
              "text-xs font-semibold px-4 py-2 rounded-xl transition-all",
              tab === "search"
                ? "text-black"
                : ""
            )}
            style={{
              background: tab === "search" ? tc.amber : tc.surface,
              color: tab === "search" ? "#000" : tc.textSec,
            }}
          >
            <Search size={12} className="inline mr-1" /> Search
          </button>
          <button
            onClick={() => setTab("saved")}
            className={cn(
              "text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            )}
            style={{
              background: tab === "saved" ? tc.amber : tc.surface,
              color: tab === "saved" ? "#000" : tc.textSec,
            }}
          >
            <Bookmark size={12} className="inline mr-1" /> Saved ({savedJobs.length})
          </button>
        </div>
      </div>

      {tab === "search" && (
        <>
          {/* Search Form */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible">
            <PremiumCard glow className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-amber-500" />
                <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">
                  Search LinkedIn Jobs
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase mb-1 block" style={{ color: tc.textMuted }}>
                    LinkedIn Jobs Search URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/jobs/search/?..."
                      className="flex-1 text-xs px-3 py-2.5 rounded-xl outline-none transition-colors"
                      style={{
                        background: tc.inputBg,
                        border: `1px solid ${tc.border}`,
                        color: tc.text,
                      }}
                    />
                    <PremiumButton
                      variant="glow"
                      onClick={handleScrape}
                      loading={scraping}
                      icon={<Search size={14} />}
                    >
                      {scraping ? "Scraping..." : "Scrape Jobs"}
                    </PremiumButton>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase" style={{ color: tc.textMuted }}>
                    Count:
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="text-xs px-2 py-1.5 rounded-lg outline-none"
                    style={{
                      background: tc.inputBg,
                      border: `1px solid ${tc.border}`,
                      color: tc.text,
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase mb-1.5 block flex items-center gap-1" style={{ color: tc.textMuted }}>
                    <Filter size={10} /> Quick Filters
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_FILTERS.map((f) => (
                      <button
                        key={f.label}
                        onClick={() => handleQuickFilter(f.suffix)}
                        className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                        style={{ background: tc.surface, color: tc.textSec, border: `1px solid ${tc.border}` }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-xl flex items-center gap-2"
                  style={{ background: `${tc.rose}10`, border: `1px solid ${tc.roseBorder}` }}>
                  <AlertTriangle size={14} style={{ color: tc.rose }} />
                  <span className="text-xs" style={{ color: tc.rose }}>{error}</span>
                </div>
              )}
            </PremiumCard>
          </motion.div>

          {/* Loading State */}
          {scraping && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <PremiumCard glow className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${tc.amber}15` }}>
                    <Loader2 size={28} className="animate-spin" style={{ color: tc.amber }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold" style={{ color: tc.text }}>Scraping LinkedIn Jobs...</p>
                    <p className="text-xs mt-1" style={{ color: tc.textMuted }}>
                      This may take 1-2 minutes. We&apos;re fetching job details from LinkedIn.
                    </p>
                  </div>
                </div>
              </PremiumCard>
            </motion.div>
          )}

          {/* Results */}
          {results.length > 0 && !scraping && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-amber-500" />
                <h3 className="text-xs font-extrabold text-amber-500 uppercase tracking-wider">
                  {results.length} Jobs Found
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((job, i) => (
                  <JobCard
                    key={job.link || i}
                    job={job}
                    saved={savedIds.has(job.link)}
                    onSave={() => handleSave(job)}
                    onAnalyze={() => {
                      handleSave(job);
                    }}
                    analyzing={false}
                    c={tc}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {results.length === 0 && !scraping && !error && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <PremiumCard glow className="p-12">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${tc.amber}10` }}>
                    <Search size={28} style={{ color: tc.amber }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: tc.text }}>
                      Paste a LinkedIn Jobs URL to Start
                    </p>
                    <p className="text-xs mt-1 max-w-md" style={{ color: tc.textMuted }}>
                      Go to LinkedIn Jobs, apply your filters, copy the URL from the address bar, and paste it above. The scraper supports all LinkedIn job search filters.
                    </p>
                  </div>
                </div>
              </PremiumCard>
            </motion.div>
          )}
        </>
      )}

      {tab === "saved" && (
        <>
          {savedJobs.length === 0 ? (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <PremiumCard glow className="p-12">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: `${tc.amber}10` }}>
                    <Bookmark size={28} style={{ color: tc.amber }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: tc.text }}>No Saved Jobs Yet</p>
                    <p className="text-xs mt-1" style={{ color: tc.textMuted }}>
                      Scrape LinkedIn jobs and save the ones you&apos;re interested in. They&apos;ll appear here for easy access and AI analysis.
                    </p>
                  </div>
                  <PremiumButton variant="secondary" onClick={() => setTab("search")} icon={<Search size={14} />}>
                    Search Jobs
                  </PremiumButton>
                </div>
              </PremiumCard>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedJobs.map((job) => (
                <div key={job.id} className="relative">
                  <JobCard
                    job={job}
                    saved={true}
                    onSave={() => handleDelete(job.id)}
                    onAnalyze={() => handleAnalyze(job.id, job)}
                    analyzing={analyzingJobId === job.id}
                    c={tc}
                  />
                  {job.aiAnalysis && (
                    <button
                      onClick={() =>
                        setAnalysisModal({
                          open: true,
                          analysis: job.aiAnalysis,
                          job,
                        })
                      }
                      className="absolute top-3 right-3 p-1.5 rounded-lg z-10"
                      style={{ background: `${tc.purple}15` }}
                      aria-label="View AI analysis"
                    >
                      <Brain size={14} style={{ color: tc.purple }} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Analysis Modal */}
      {analysisModal && (
        <AnalysisModal
          open={analysisModal.open}
          analysis={analysisModal.analysis}
          job={analysisModal.job}
          onClose={() => setAnalysisModal(null)}
          c={tc}
        />
      )}
    </motion.div>
  );
}
