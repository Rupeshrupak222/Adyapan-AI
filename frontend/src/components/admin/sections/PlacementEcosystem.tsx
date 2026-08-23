"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Briefcase, Building2, Star, MapPin,
  Search, Loader2, Trash2, Plus, Play,
  CheckCircle, XCircle, Globe, X, ChevronLeft, ChevronRight,
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
  stats: JobsStats;
}

interface JobsStats {
  totalJobs: number;
  activeJobs: number;
  featuredJobs: number;
  companies: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function PlacementEcosystem() {
  const [jobs, setJobs] = useState<DiscoveryJob[]>([]);
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; pages: number } | null>(null);
  const [stats, setStats] = useState<JobsStats>({ totalJobs: 0, activeJobs: 0, featuredJobs: 0, companies: 0 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "", company: "", location: "", salaryMin: "", salaryMax: "",
    employmentType: "Full-Time", workMode: "Remote", description: "",
    experienceMin: "", experienceMax: "", passingYear: "", applyUrl: "",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const fetchJobs = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<JobsResponse>(`/admin/jobs?page=${p}&limit=20&search=${encodeURIComponent(q)}`);
      if (res.data.success) {
        setJobs(res.data.jobs);
        setPagination(res.data.pagination);
        if (res.data.stats) setStats(res.data.stats);
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

  const handleCreateJob = async () => {
    if (!createForm.title.trim() || !createForm.company.trim()) {
      alert("Title and company are required");
      return;
    }
    setCreateLoading(true);
    try {
      await api.post("/admin/jobs", {
        title: createForm.title.trim(),
        company: createForm.company.trim(),
        location: createForm.location.trim() || undefined,
        salaryMin: createForm.salaryMin ? Number(createForm.salaryMin) : undefined,
        salaryMax: createForm.salaryMax ? Number(createForm.salaryMax) : undefined,
        employmentType: createForm.employmentType,
        workMode: createForm.workMode,
        experienceMin: createForm.experienceMin ? Number(createForm.experienceMin) : undefined,
        experienceMax: createForm.experienceMax ? Number(createForm.experienceMax) : undefined,
        passingYear: createForm.passingYear.trim() || undefined,
        applyUrl: createForm.applyUrl.trim() || undefined,
        description: createForm.description.trim() || undefined,
      });
      setShowCreate(false);
      setCreateForm({
        title: "", company: "", location: "", salaryMin: "", salaryMax: "",
        employmentType: "Full-Time", workMode: "Remote", description: "",
        experienceMin: "", experienceMax: "", passingYear: "", applyUrl: "",
      });
      fetchJobs(1, "");
    } catch {
      alert("Failed to create job");
    } finally {
      setCreateLoading(false);
    }
  };

  const STAT_COLORS = ["#10b981", "#818cf8", "#f59e0b", "#f472b6", "#38bdf8", "#a78bfa", "#34d399", "#fb923c"];

  const jobsByType = Object.entries(
    jobs.reduce<Record<string, number>>((acc, j) => {
      const key = j.employmentType || "Unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const jobsByLocation = Object.entries(
    jobs.reduce<Record<string, number>>((acc, j) => {
      const key = j.location || "Unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

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
              onClick={() => setShowCreate(true)}
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
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          label="Total Jobs"
          value={stats.totalJobs.toLocaleString()}
          color="#f59e0b"
          icon={<Briefcase size={16} />}
          subtitle="All time listings"
        />
        <MetricCard
          label="Active Jobs"
          value={stats.activeJobs.toLocaleString()}
          color="#10b981"
          icon={<CheckCircle size={16} />}
          subtitle="Currently open"
        />
        <MetricCard
          label="Featured Jobs"
          value={stats.featuredJobs.toLocaleString()}
          color="#818cf8"
          icon={<Star size={16} />}
          subtitle="Promoted listings"
        />
        <MetricCard
          label="Companies"
          value={stats.companies.toLocaleString()}
          color="#38bdf8"
          icon={<Building2 size={16} />}
          subtitle="Hiring employers"
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
              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t gap-3" style={{ borderColor: "var(--border-color)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} jobs
                </span>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (page > 1) {
                        setPage(page - 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={page === 1 || loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ 
                      borderColor: "var(--border-color)", 
                      color: "var(--text-primary)", 
                      background: "var(--card-bg)" 
                    }}
                  >
                    <ChevronLeft size={13} />
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      const totalPages = pagination.pages;
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
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          disabled={loading}
                          className="w-8 h-8 rounded-lg text-xs font-bold transition-all disabled:cursor-not-allowed"
                          style={{
                            background: page === pageNum ? 'linear-gradient(135deg, #f59e0b, #ea580c)' : 'transparent',
                            color: page === pageNum ? '#000' : 'var(--text-muted)',
                            border: page === pageNum ? 'none' : '1px solid var(--border-color)',
                          }}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      if (page < pagination.pages) {
                        setPage(page + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    disabled={page >= pagination.pages || loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ 
                      borderColor: "var(--border-color)", 
                      color: "var(--text-primary)", 
                      background: "var(--card-bg)" 
                    }}
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>


      {showCreate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => !createLoading && setShowCreate(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="w-full max-w-lg rounded-3xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: "var(--bg-dark)", borderColor: "var(--border-color)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <Plus size={18} style={{ color: "#f59e0b" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>Post New Job</h3>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Create a new job listing</p>
              </div>
              <button onClick={() => setShowCreate(false)} disabled={createLoading} style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Job Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="e.g. Software Engineer"
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                  style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Company *</label>
                <input
                  type="text"
                  value={createForm.company}
                  onChange={(e) => setCreateForm({ ...createForm, company: e.target.value })}
                  placeholder="e.g. Google"
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                  style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Apply Link / Career URL</label>
                <input
                  type="url"
                  value={createForm.applyUrl}
                  onChange={(e) => setCreateForm({ ...createForm, applyUrl: e.target.value })}
                  placeholder="e.g. https://careers.google.com/jobs/1234"
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                  style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Location</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                    placeholder="e.g. Remote / Bangalore"
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Work Mode</label>
                  <select
                    value={createForm.workMode}
                    onChange={(e) => setCreateForm({ ...createForm, workMode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  >
                    {["Remote", "On-site", "Hybrid"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Employment Type</label>
                  <select
                    value={createForm.employmentType}
                    onChange={(e) => setCreateForm({ ...createForm, employmentType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  >
                    {["Full-Time", "Part-Time", "Internship", "Contract", "Freelance"].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Batch / Passing Year</label>
                  <input
                    type="text"
                    value={createForm.passingYear}
                    onChange={(e) => setCreateForm({ ...createForm, passingYear: e.target.value })}
                    placeholder="e.g. 2024, 2025"
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Min Salary (INR)</label>
                  <input
                    type="number"
                    value={createForm.salaryMin}
                    onChange={(e) => setCreateForm({ ...createForm, salaryMin: e.target.value })}
                    placeholder="e.g. 600000"
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Max Salary (INR)</label>
                  <input
                    type="number"
                    value={createForm.salaryMax}
                    onChange={(e) => setCreateForm({ ...createForm, salaryMax: e.target.value })}
                    placeholder="e.g. 1200000"
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Min Experience (Years)</label>
                  <input
                    type="number"
                    value={createForm.experienceMin}
                    onChange={(e) => setCreateForm({ ...createForm, experienceMin: e.target.value })}
                    placeholder="e.g. 0"
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Max Experience (Years)</label>
                  <input
                    type="number"
                    value={createForm.experienceMax}
                    onChange={(e) => setCreateForm({ ...createForm, experienceMax: e.target.value })}
                    placeholder="e.g. 2"
                    className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Role responsibilities, requirements..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all mt-1.5 resize-none"
                  style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCreate(false)}
                disabled={createLoading}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleCreateJob}
                disabled={createLoading || !createForm.title.trim() || !createForm.company.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                style={{
                  background: createForm.title.trim() && createForm.company.trim() ? "linear-gradient(135deg, #f59e0b, #d97706)" : "var(--bg-card-hover)",
                  color: createForm.title.trim() && createForm.company.trim() ? "#000" : "var(--text-muted)",
                  border: "1px solid transparent",
                }}
              >
                {createLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {createLoading ? "Posting..." : "Post Job"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
