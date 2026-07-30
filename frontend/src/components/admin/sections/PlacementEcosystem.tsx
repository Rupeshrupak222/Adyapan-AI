"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, Building2, Star, Users, TrendingUp, MapPin,
  Search, RefreshCw, Loader2, Trash2, Plus, Play,
  CheckCircle, XCircle, DollarSign, Globe, Clock,
} from "lucide-react";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { MetricCard } from "@/components/admin/shared/MetricCard";

interface DiscoveryJob {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType: string;
  workMode: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
}

interface JobsResponse {
  success: boolean;
  jobs: DiscoveryJob[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

const MOCK_STATS = {
  totalJobs: 342,
  activeJobs: 186,
  featuredJobs: 28,
  applications: 1247,
  companies: 89,
  placementRate: "78.4",
};

const MOCK_JOB_STATS_BY_TYPE = [
  { label: "Full-Time", count: 142, color: "#10b981" },
  { label: "Part-Time", count: 38, color: "#818cf8" },
  { label: "Internship", count: 64, color: "#f59e0b" },
  { label: "Contract", count: 29, color: "#f472b6" },
  { label: "Freelance", count: 22, color: "#38bdf8" },
];

const MOCK_JOB_STATS_BY_LOCATION = [
  { label: "Remote", count: 97, color: "#10b981" },
  { label: "Bangalore", count: 56, color: "#818cf8" },
  { label: "Mumbai", count: 48, color: "#f59e0b" },
  { label: "Delhi/NCR", count: 41, color: "#f472b6" },
  { label: "Hyderabad", count: 35, color: "#38bdf8" },
  { label: "Pune", count: 22, color: "#a78bfa" },
  { label: "Chennai", count: 18, color: "#34d399" },
  { label: "International", count: 25, color: "#fb923c" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function PlacementEcosystem() {
  const [jobs, setJobs] = useState<DiscoveryJob[]>([]);
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; pages: number } | null>(null);
  const [stats, setStats] = useState(MOCK_STATS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<JobsResponse & { stats?: typeof MOCK_STATS }>(`/admin/jobs?page=${p}&limit=20&search=${encodeURIComponent(q)}`);
      if (res.data.success) {
        setJobs(res.data.jobs);
        setPagination(res.data.pagination);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch {
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(page, search);
  }, [fetchJobs, page, search]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleToggle = async (jobId: string, updates: Partial<DiscoveryJob>) => {
    setActionLoading(jobId);
    try {
      const res = await api.put(`/admin/jobs/${jobId}`, updates);
      if (res.data.success) {
        fetchJobs(page, search);
      }
    } catch {
      alert("Failed to update job");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm("Delete this job posting?")) return;
    setActionLoading(jobId);
    try {
      const res = await api.delete(`/admin/jobs/${jobId}`);
      if (res.data.success) {
        fetchJobs(page, search);
      }
    } catch {
      alert("Failed to delete job");
    } finally {
      setActionLoading(null);
    }
  };

  const handleIngest = async () => {
    setIngestLoading(true);
    try {
      const res = await api.post("/admin/jobs/ingest");
      if (res.data.success) {
        alert("Job ingestion triggered successfully");
        fetchJobs(1, "");
      }
    } catch {
      alert("Failed to trigger ingestion");
    } finally {
      setIngestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Placement Ecosystem"
        description="Job discovery, hiring drives, company databases, and placement intelligence"
        actions={
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => alert("Post New Job — placeholder action")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <Plus size={14} />
              Post New Job
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleIngest}
              disabled={ingestLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              {ingestLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {ingestLoading ? "Ingesting..." : "Trigger Scraper Ingestion"}
            </motion.button>
          </div>
        }
      />

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4"
      >
        <MetricCard
          label="Total Jobs"
          value={pagination?.total ?? MOCK_STATS.totalJobs}
          color="#f59e0b"
          icon={<Briefcase size={16} />}
          subtitle="All time listings"
        />
        <MetricCard
          label="Active Jobs"
          value={MOCK_STATS.activeJobs}
          color="#10b981"
          icon={<CheckCircle size={16} />}
          subtitle="Currently open"
        />
        <MetricCard
          label="Featured Jobs"
          value={MOCK_STATS.featuredJobs}
          color="#818cf8"
          icon={<Star size={16} />}
          subtitle="Promoted listings"
        />
        <MetricCard
          label="Applications"
          value={MOCK_STATS.applications}
          color="#f472b6"
          icon={<Users size={16} />}
          subtitle="Total received"
        />
        <MetricCard
          label="Companies"
          value={MOCK_STATS.companies}
          color="#38bdf8"
          icon={<Building2 size={16} />}
          subtitle="Partnered employers"
        />
        <MetricCard
          label="Placement Rate"
          value={`${MOCK_STATS.placementRate}%`}
          color="#a78bfa"
          icon={<TrendingUp size={16} />}
          subtitle="Success rate"
        />
      </motion.div>

      {/* Job Management Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <Briefcase size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Job Management
          </h2>
          <div className="ml-auto relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-56 pl-9 pr-3 py-2 rounded-xl text-xs font-medium border transition-all"
              style={{
                background: "var(--bg-card)", color: "var(--text-primary)",
                borderColor: "var(--border-color)",
              }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 800 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                    {["Company", "Title", "Location", "Salary", "Type", "Status", "Featured", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center">
                        <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>No jobs found</p>
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job, idx) => (
                      <motion.tr
                        key={job.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.025, duration: 0.2 }}
                        style={{ borderBottom: "1px solid var(--border-color)" }}
                        className="transition-all hover:bg-white/[0.02]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0"
                              style={{
                                background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))",
                                border: "1px solid rgba(245,158,11,0.2)",
                                color: "#f59e0b",
                              }}
                            >
                              {job.company[0]?.toUpperCase() || "?"}
                            </div>
                            <span className="text-xs font-bold truncate max-w-[140px]" style={{ color: "var(--text-primary)" }}>
                              {job.company}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            {job.title}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} style={{ color: "var(--text-muted)" }} />
                            <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: "var(--text-secondary)" }}>
                              {job.location}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                            {job.salaryMin && job.salaryMax
                              ? `${job.salaryMin.toLocaleString("en-IN")} - ${job.salaryMax.toLocaleString("en-IN")}`
                              : job.salaryMin
                                ? `From ${job.salaryMin.toLocaleString("en-IN")}`
                                : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                            {job.employmentType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge variant={job.isActive ? "success" : "error"}>
                            {job.isActive ? "Active" : "Inactive"}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge variant={job.isFeatured ? "warning" : "default"}>
                            {job.isFeatured ? "Featured" : "Standard"}
                          </StatusBadge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleToggle(job.id, { isActive: !job.isActive })}
                              disabled={actionLoading === job.id}
                              className="p-1.5 rounded-lg transition-all"
                              style={{
                                background: job.isActive ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                                color: job.isActive ? "#ef4444" : "#10b981",
                                border: `1px solid ${job.isActive ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
                              }}
                              title={job.isActive ? "Deactivate" : "Activate"}
                            >
                              {job.isActive ? <XCircle size={12} /> : <CheckCircle size={12} />}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleToggle(job.id, { isFeatured: !job.isFeatured })}
                              disabled={actionLoading === job.id}
                              className="p-1.5 rounded-lg transition-all"
                              style={{
                                background: job.isFeatured ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
                                color: job.isFeatured ? "#f59e0b" : "var(--text-muted)",
                                border: `1px solid ${job.isFeatured ? "rgba(245,158,11,0.2)" : "var(--border-color)"}`,
                              }}
                              title={job.isFeatured ? "Unfeature" : "Feature"}
                            >
                              <Star size={12} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleDelete(job.id)}
                              disabled={actionLoading === job.id}
                              className="p-1.5 rounded-lg transition-all"
                              style={{
                                background: "rgba(239,68,68,0.1)",
                                color: "#ef4444",
                                border: "1px solid rgba(239,68,68,0.2)",
                              }}
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "var(--border-color)" }}>
                <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                  Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                </span>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <motion.button
                      key={p}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-lg text-[11px] font-bold transition-all"
                      style={{
                        background: p === page ? "rgba(245,158,11,0.15)" : "transparent",
                        color: p === page ? "#f59e0b" : "var(--text-muted)",
                        border: p === page ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
                      }}
                    >
                      {p}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Job Stats by Type & Location */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Briefcase size={16} style={{ color: "#818cf8" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Jobs by Type
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {MOCK_JOB_STATS_BY_TYPE.map((stat) => {
              const total = MOCK_JOB_STATS_BY_TYPE.reduce((s, x) => s + x.count, 0);
              const pct = ((stat.count / total) * 100).toFixed(1);
              return (
                <div key={stat.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{stat.label}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: stat.color }}>{stat.count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: stat.color }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{pct}% of total</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Globe size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Jobs by Location
            </h2>
          </div>
          <div className="p-5 space-y-4">
            {MOCK_JOB_STATS_BY_LOCATION.map((stat) => {
              const total = MOCK_JOB_STATS_BY_LOCATION.reduce((s, x) => s + x.count, 0);
              const pct = ((stat.count / total) * 100).toFixed(1);
              return (
                <div key={stat.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <MapPin size={11} style={{ color: stat.color }} />
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{stat.label}</span>
                    </div>
                    <span className="text-xs font-mono font-bold" style={{ color: stat.color }}>{stat.count}</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: stat.color }}
                    />
                  </div>
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{pct}% of total</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
