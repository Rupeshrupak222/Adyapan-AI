"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  Search, Crown, Bell, ChevronDown, Menu, User, LogOut, Settings, CreditCard,
  TrendingUp, Award, BookOpen, Code2, FileText, Mic, Briefcase, UserCircle,
  BarChart3, Wand2, GraduationCap, LayoutDashboard, Sun, Moon, TrendingDown,
  ArrowUpRight, Star, Zap, LineChart, Trophy, MessageCircle, X,
  RefreshCw, ArrowLeft, Shield, Activity, Server, Brain, IndianRupee,
  DollarSign, ShoppingCart, CheckCircle2, XCircle, AlertTriangle, Clock,
  Terminal, HardDrive, Cpu, Globe, Smartphone, Lock, Ban, Eye, Trash2,
  Loader2, Sparkles, Flag, Plus, Edit3, Filter, Play, Check, ShieldAlert,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────

interface ActivityItem {
  time: string;
  user: string;
  action: string;
  module: string;
  id: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  subscriptionStatus: string;
  role: string;
  createdAt: string;
  profile?: { college?: string; branch?: string; phone?: string };
  _count?: { resumes?: number; chatSessions?: number; interviewSessions?: number; codingSessions?: number; studySessions?: number };
}

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

type SectionId =
  | "overview" | "users" | "jobs" | "ai-models"
  | "subscriptions" | "payments" | "revenue"
  | "activity" | "system-health" | "security" | "settings";

// ─── Sidebar Data ──────────────────────────────────────────────────────

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  section?: SectionId;
  submenu?: { id: string; label: string; section: SectionId }[];
}

const sidebarItems: SidebarItem[] = [
  { id: "overview", label: "Dashboard", section: "overview", icon: <LayoutDashboard size={18} /> },
  { id: "users", label: "User Management", section: "users", icon: <UserCircle size={18} /> },
  { id: "jobs", label: "Jobs & Ingestion", section: "jobs", badge: "Live", icon: <Briefcase size={18} /> },
  { id: "ai-models", label: "AI Engine & Models", section: "ai-models", icon: <Brain size={18} /> },
  {
    id: "subscriptions-group", label: "Revenue & Plans", icon: <Crown size={18} />,
    submenu: [
      { id: "subscriptions", label: "Plans & Pricing", section: "subscriptions" },
      { id: "payments", label: "Transactions", section: "payments" },
      { id: "revenue", label: "Revenue Analytics", section: "revenue" },
    ],
  },
  { id: "activity", label: "Live Activity Audit", section: "activity", icon: <Activity size={18} /> },
  { id: "system-health", label: "System Health & Server", section: "system-health", icon: <Server size={18} /> },
  { id: "security", label: "Security & Access", section: "security", icon: <Shield size={18} /> },
  { id: "settings", label: "Global Settings", section: "settings", icon: <Settings size={18} /> },
];

// ─── Toast Component ───────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000",
        padding: "12px 22px", borderRadius: 12,
        boxShadow: "0 10px 25px rgba(245,158,11,0.4)",
        fontSize: "0.88rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8
      }}
    >
      <CheckCircle2 size={18} />
      {message}
    </motion.div>
  );
}

// ─── Stat Card Component ───────────────────────────────────────────────

function StatCard({ icon, label, value, trend, color = "#f59e0b", delay = 0 }: {
  icon: React.ReactNode; label: string; value: string | number;
  trend?: { up: boolean; pct: string }; color?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-2xl p-5 border transition-all hover:scale-[1.02]"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-color)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)"
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1"
            style={{
              background: trend.up ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: trend.up ? "#10b981" : "#ef4444",
            }}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.pct}
          </div>
        )}
      </div>
      <div className="text-3xl font-black mb-1 font-mono tracking-tight">{value}</div>
      <div className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</div>
    </motion.div>
  );
}

// ─── Pill Badge ────────────────────────────────────────────────────────

function Pill({ children, color = "#f59e0b" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}>
      {children}
    </span>
  );
}

// ========================================================================
// MAIN REDESIGNED ADMIN DASHBOARD
// ========================================================================

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth("ADMIN");

  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openGroup, setOpenGroup] = useState<string | null>("subscriptions-group");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // States
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userPagination, setUserPagination] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userRoleFilter, setUserRoleFilter] = useState("");
  
  // Job Management States
  const [jobs, setJobs] = useState<DiscoveryJob[]>([]);
  const [jobSearch, setJobSearch] = useState("");
  const [jobPage, setJobPage] = useState(1);
  const [jobPagination, setJobPagination] = useState<any>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [ingestLoading, setIngestLoading] = useState(false);
  const [newJobData, setNewJobData] = useState({
    title: "", company: "", location: "Remote", salaryMin: "", salaryMax: "", employmentType: "Full-Time", workMode: "Remote", applyUrl: "", description: ""
  });

  // User Actions Modal States
  const [passwordModalUser, setPasswordModalUser] = useState<AdminUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("Adyapan@123");

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    announcementBanner: "Welcome to Adyapan AI Platform!",
    defaultAiModel: "gemini",
    freeTierTokenLimit: 50,
    premiumTierTokenLimit: 1000,
    registrationOpen: true,
    aiTemperature: 0.7,
  });

  const [aiAnalytics, setAiAnalytics] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [moduleData, setModuleData] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Theme State
  const [theme, setTheme] = useState("dark");
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    const t = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // ── Data Fetching ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [statsRes, activityRes, aiRes, revRes, modRes, healthRes, settingsRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/activity"),
        api.get("/admin/analytics/ai"),
        api.get("/admin/analytics/revenue"),
        api.get("/admin/modules"),
        api.get("/admin/system-health"),
        api.get("/admin/settings"),
      ]);

      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (activityRes.data.success) setActivities(activityRes.data.activities);
      if (aiRes.data.success) setAiAnalytics(aiRes.data.analytics);
      if (revRes.data.success) setRevenueData(revRes.data.revenue);
      if (modRes.data.success) setModuleData(modRes.data.modules);
      if (healthRes.data.success) setSystemHealth(healthRes.data.health);
      if (settingsRes.data.success) setSystemSettings(settingsRes.data.settings);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadUsers = useCallback(async (page: number, search: string, role: string = "") => {
    try {
      const res = await api.get(`/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}&role=${role}`);
      if (res.data.success) {
        setUsers(res.data.users);
        setUserPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadJobs = useCallback(async (page: number, search: string) => {
    try {
      const res = await api.get(`/admin/jobs?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setJobs(res.data.jobs);
        setJobPagination(res.data.pagination);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([loadData(), loadUsers(1, ""), loadJobs(1, "")])
        .finally(() => setLoading(false));
    }
  }, [user, loadData, loadUsers, loadJobs]);

  // ── Actions ───────────────────────────────────────────────────────────

  const handleUserAction = async (userId: string, action: string, plan?: string, extraData?: any) => {
    setUserActionLoading(userId);
    try {
      const payload = { action, plan, ...extraData };
      const res = await api.post(`/admin/users/${userId}/action`, payload);
      if (res.data.success) {
        setToastMsg(res.data.message || "Action completed successfully");
        loadUsers(userPage, userSearch, userRoleFilter);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setUserActionLoading(null);
    }
  };

  const handleJobToggle = async (jobId: string, updates: Partial<DiscoveryJob>) => {
    try {
      const res = await api.put(`/admin/jobs/${jobId}`, updates);
      if (res.data.success) {
        setToastMsg("Job updated");
        loadJobs(jobPage, jobSearch);
      }
    } catch (err: any) {
      alert("Failed to update job");
    }
  };

  const handleJobDelete = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;
    try {
      const res = await api.delete(`/admin/jobs/${jobId}`);
      if (res.data.success) {
        setToastMsg("Job deleted");
        loadJobs(jobPage, jobSearch);
      }
    } catch (err: any) {
      alert("Failed to delete job");
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/admin/jobs", newJobData);
      if (res.data.success) {
        setToastMsg("New job posted successfully!");
        setShowAddJobModal(false);
        setNewJobData({ title: "", company: "", location: "Remote", salaryMin: "", salaryMax: "", employmentType: "Full-Time", workMode: "Remote", applyUrl: "", description: "" });
        loadJobs(1, "");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to create job");
    }
  };

  const handleTriggerIngestion = async () => {
    setIngestLoading(true);
    try {
      const res = await api.post("/admin/jobs/ingest");
      if (res.data.success) {
        setToastMsg("Job scraper ingestion launched in background!");
      }
    } catch (err) {
      alert("Failed to launch scraper ingestion");
    } finally {
      setIngestLoading(false);
    }
  };

  const handleSaveSettings = async (updates: Partial<typeof systemSettings>) => {
    const updated = { ...systemSettings, ...updates };
    setSystemSettings(updated);
    try {
      const res = await api.put("/admin/settings", updated);
      if (res.data.success) {
        setToastMsg("Platform settings updated!");
      }
    } catch (err) {
      alert("Failed to update settings");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-dark)" }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#f59e0b" }} />
          <div className="text-sm font-bold tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Loading Admin Console...
          </div>
        </div>
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#080c10" : "#f8fafc", color: "var(--text-primary)", fontFamily: "system-ui, sans-serif" }}>
      
      {/* ─── Toast ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      </AnimatePresence>

      {/* ─── Top Header Navigation ─────────────────────────────────────── */}
      <header style={{
        position: "fixed", top: 0, left: 0, width: "100%", height: 70,
        background: isDark ? "#060b0e" : "#ffffff",
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.5rem", zIndex: 105, boxSizing: "border-box",
        backdropFilter: "blur(12px)"
      }}>
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          {/* Mobile menu trigger (hidden on desktop) */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mobile-menu-btn"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              display: "none", alignItems: "center", justifyContent: "center",
              padding: 4, color: "var(--text-secondary)", marginRight: 2,
            }}
          >
            <Menu size={20} />
          </motion.button>
          <div className="flex items-center gap-2.5">
            <Image src="/assets/logo.png" alt="Adyapan AI" width={32} height={32} className="rounded-full" />
            <div>
              <span className="font-extrabold text-base tracking-tight" style={{ color: "var(--text-primary)" }}>Adyapan AI</span>
              <span className="text-[10px] font-bold text-amber-500 block -mt-1 tracking-wider uppercase">Admin Control</span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons (User Dashboard Styled) */}
        <div className="flex items-center gap-2">
          {/* Quick Action Pill Buttons */}
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={() => setShowAddJobModal(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
            <Plus size={14} /> Add Job
          </motion.button>

          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
            onClick={handleTriggerIngestion} disabled={ingestLoading}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
            {ingestLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} 
            Ingest Jobs
          </motion.button>

          {/* Theme Toggle */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="p-2 rounded-full border flex items-center justify-center transition-all"
            style={{ background: isDark ? "#0d151c" : "#f1f5f9", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: isDark ? "#f59e0b" : "#475569" }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </motion.button>

          {/* Refresh Data */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={loadData}
            className="p-2 rounded-full border flex items-center justify-center transition-all"
            style={{ background: isDark ? "#0d151c" : "#f1f5f9", borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", color: "var(--text-secondary)" }}>
            <RefreshCw size={16} />
          </motion.button>

          {/* Admin Avatar Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
              {user?.name?.[0] || "A"}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{user?.name || "Super Admin"}</div>
              <div className="text-[10px] text-amber-500 font-semibold leading-tight">Master Admin</div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, top: 70, zIndex: 119,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            transition: "opacity 0.3s ease",
          }}
        />
      )}

      {/* ─── Main Container ────────────────────────────────────────────── */}
      <div className="flex">
        
        {/* ─── Sidebar (Same hover-expand style as User Dashboard) ────── */}
        <aside className={`dash-sidebar ${sidebarOpen ? "open" : ""}`}
          style={{
            background: isDark ? "rgba(6,11,14,0.92)" : "rgba(255,255,255,0.95)",
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"
          }}>
          {sidebarItems.map(item => {
            if (item.submenu) {
              const isOpen = openGroup === item.id;
              return (
                <div key={item.id} className={isOpen ? "sb-item open" : "sb-item"}>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
                    onClick={() => setOpenGroup(isOpen ? null : item.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      padding: "0.55rem 0.5rem", borderRadius: 12, marginBottom: 2,
                      color: "var(--text-secondary)", background: "transparent",
                      border: "1px solid transparent", fontWeight: 500, fontSize: "0.82rem",
                      cursor: "pointer", width: "100%", textAlign: "left", whiteSpace: "nowrap",
                    }}>
                    <span style={{ flexShrink: 0 }}>{item.icon}</span>
                    <span className="sb-label" style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                    <span className="sb-arrow" style={{ marginLeft: "auto", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                      <ChevronDown size={13} />
                    </span>
                  </motion.button>
                  {isOpen && (
                    <div className="sb-submenu" style={{ paddingLeft: "1.2rem" }}>
                      {item.submenu.map(sub => (
                        <a key={sub.id} href="#" onClick={(e) => { e.preventDefault(); setActiveSection(sub.section); setSidebarOpen(false); }}
                          style={{
                            display: "block", padding: "0.35rem 0.5rem", fontSize: "0.76rem",
                            color: activeSection === sub.section ? "#f59e0b" : "var(--text-secondary)",
                            fontWeight: activeSection === sub.section ? 700 : 500,
                            background: activeSection === sub.section ? "rgba(245,158,11,0.1)" : "transparent",
                            borderRadius: 8, marginBottom: 1, textDecoration: "none", transition: "all 0.15s ease",
                          }}>
                          {sub.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = activeSection === item.section;
            return (
              <div key={item.id} className="sb-item">
                <motion.button key={item.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.12 }}
                  onClick={() => { setActiveSection(item.section as SectionId); setSidebarOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    padding: "0.55rem 0.5rem", borderRadius: 12, marginBottom: 2,
                    color: isActive ? "#f59e0b" : "var(--text-secondary)",
                    background: isActive ? "rgba(245,158,11,0.1)" : "transparent",
                    border: isActive ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
                    fontWeight: isActive ? 700 : 500, fontSize: "0.82rem",
                    cursor: "pointer", width: "100%", textAlign: "left", whiteSpace: "nowrap",
                  }}>
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  <span className="sb-label" style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                  {item.badge && (
                    <span className="sb-arrow" style={{ marginLeft: "auto" }}>
                      <Pill color="#10b981">{item.badge}</Pill>
                    </span>
                  )}
                </motion.button>
              </div>
            );
          })}
        </aside>

        {/* ─── Content Area ──────────────────────────────────────────── */}
        <main className="dash-main flex-1 p-6" style={{ background: "transparent" }}>
          <div className="max-w-7xl mx-auto space-y-6">

            {/* ══════════════════════════════════════════════════════════
                SECTION 1: OVERVIEW
               ══════════════════════════════════════════════════════════ */}
            {activeSection === "overview" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Header Welcome */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl border relative overflow-hidden"
                  style={{ background: isDark ? "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(0,0,0,0.4))" : "#ffffff", borderColor: isDark ? "rgba(245,158,11,0.2)" : "rgba(0,0,0,0.08)" }}>
                  <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Platform Overview & Analytics</h1>
                    <p className="text-xs font-medium mt-1" style={{ color: "var(--text-secondary)" }}>Real-time telemetry, database operations, and system performance monitoring.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill color="#10b981">System Operational</Pill>
                    <Pill color="#3b82f6">Node.js {systemHealth?.nodeVersion || "v22"}</Pill>
                  </div>
                </div>

                {/* KPI Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<UserCircle size={22} />} label="Total Registered Users" value={stats?.users?.total ?? 0} trend={{ up: true, pct: "+18%" }} color="#f59e0b" delay={0.05} />
                  <StatCard icon={<Crown size={22} />} label="Active Premium Plans" value={stats?.users?.premium ?? 0} trend={{ up: true, pct: "+24%" }} color="#eab308" delay={0.1} />
                  <StatCard icon={<IndianRupee size={22} />} label="Total Platform Revenue" value={`₹${(stats?.revenue?.total ?? 0).toLocaleString()}`} trend={{ up: true, pct: "+32%" }} color="#10b981" delay={0.15} />
                  <StatCard icon={<Brain size={22} />} label="Total AI Requests Processed" value={stats?.totalAiRequests ?? 0} trend={{ up: true, pct: "+45%" }} color="#8b5cf6" delay={0.2} />
                </div>

                {/* Sub-metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Module Activity Breakdown */}
                  <div className="rounded-2xl p-5 border space-y-4 md:col-span-2"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                        <BarChart3 size={16} className="text-amber-500" /> Module Usage Telemetry
                      </h3>
                      <span className="text-[10px] font-bold text-gray-400">Cross-DB Metrics</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl border bg-white/5 border-white/5">
                        <div className="text-[10px] text-gray-400 font-bold">Resume Hub</div>
                        <div className="text-lg font-black text-amber-500 mt-1">{stats?.modules?.resume?.resumes ?? 0}</div>
                        <div className="text-[10px] text-gray-500 font-medium">Resumes Created</div>
                      </div>
                      <div className="p-3 rounded-xl border bg-white/5 border-white/5">
                        <div className="text-[10px] text-gray-400 font-bold">Learning Hub</div>
                        <div className="text-lg font-black text-emerald-500 mt-1">{stats?.modules?.learning?.notes ?? 0}</div>
                        <div className="text-[10px] text-gray-500 font-medium">Notes Generated</div>
                      </div>
                      <div className="p-3 rounded-xl border bg-white/5 border-white/5">
                        <div className="text-[10px] text-gray-400 font-bold">Coding Hub</div>
                        <div className="text-lg font-black text-cyan-500 mt-1">{stats?.modules?.coding?.submissions ?? 0}</div>
                        <div className="text-[10px] text-gray-500 font-medium">Submissions</div>
                      </div>
                      <div className="p-3 rounded-xl border bg-white/5 border-white/5">
                        <div className="text-[10px] text-gray-400 font-bold">Interview Hub</div>
                        <div className="text-lg font-black text-purple-500 mt-1">{stats?.modules?.interview?.sessions ?? 0}</div>
                        <div className="text-[10px] text-gray-500 font-medium">AI Mock Interviews</div>
                      </div>
                    </div>
                  </div>

                  {/* System Server Memory */}
                  <div className="rounded-2xl p-5 border space-y-4"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                        <Server size={16} className="text-emerald-500" /> Server Health
                      </h3>
                      <Pill color="#10b981">Online</Pill>
                    </div>

                    <div className="space-y-3 text-xs font-semibold">
                      <div className="flex justify-between">
                        <span className="text-gray-400">RAM Usage:</span>
                        <span className="font-mono font-bold text-amber-500">{systemHealth?.memory?.used ?? 0} MB / {systemHealth?.memory?.total ?? 0} MB</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.round(((systemHealth?.memory?.used ?? 1) / (systemHealth?.memory?.total ?? 1)) * 100))}%` }} />
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/5">
                        <span className="text-gray-400">Uptime:</span>
                        <span className="font-mono text-gray-200">{Math.floor((systemHealth?.uptime ?? 0) / 3600)}h {Math.floor(((systemHealth?.uptime ?? 0) % 3600) / 60)}m</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activities Ticker */}
                <div className="rounded-2xl p-5 border space-y-4"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                      <Activity size={16} className="text-amber-500" /> Live Platform Activity Feed
                    </h3>
                    <button onClick={() => setActiveSection("activity")} className="text-xs text-amber-500 font-bold hover:underline">View All</button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activities.slice(0, 6).map((act, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border bg-white/5 border-white/5 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          <div>
                            <span className="font-bold text-gray-200">{act.user}</span>
                            <span className="text-gray-400 ml-2">{act.action}</span>
                          </div>
                        </div>
                        <Pill color="#64748b">{act.module}</Pill>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                SECTION 2: USER MANAGEMENT
               ══════════════════════════════════════════════════════════ */}
            {activeSection === "users" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>User Management</h1>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">Manage platform accounts, subscriptions, roles, passwords, and permissions.</p>
                  </div>

                  {/* Search Bar */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-64">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" placeholder="Search users by name or email..."
                        value={userSearch} onChange={(e) => { setUserSearch(e.target.value); loadUsers(1, e.target.value, userRoleFilter); }}
                        className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border bg-white/5 border-white/10 text-white focus:outline-none focus:border-amber-500" />
                    </div>
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Plan & Status</th>
                          <th className="p-4">Hub Usage</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-white/5 transition-all">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-amber-500/20 text-amber-500">
                                  {u.name?.[0] || "U"}
                                </div>
                                <div>
                                  <div className="font-bold text-white">{u.name}</div>
                                  <div className="text-[11px] text-gray-400">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${u.role === "ADMIN" ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-gray-500/20 text-gray-300"}`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${u.plan === "free" ? "bg-gray-500/20 text-gray-400" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                                  {u.plan}
                                </span>
                                <span className={`text-[10px] font-semibold ${u.subscriptionStatus === "active" ? "text-emerald-400" : "text-red-400"}`}>
                                  {u.subscriptionStatus}
                                </span>
                              </div>
                            </td>
                            <td className="p-4 text-gray-400">
                              <div className="text-[11px] space-x-2">
                                <span>📄 {u._count?.resumes ?? 0}</span>
                                <span>💬 {u._count?.chatSessions ?? 0}</span>
                                <span>🎙️ {u._count?.interviewSessions ?? 0}</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Role Switch */}
                                <button onClick={() => handleUserAction(u.id, "change-role", undefined, { role: u.role === "ADMIN" ? "USER" : "ADMIN" })}
                                  title="Toggle Admin Role"
                                  className="p-1.5 rounded-lg border bg-white/5 border-white/10 hover:border-purple-500 text-purple-400">
                                  <Shield size={14} />
                                </button>

                                {/* Plan Toggle */}
                                <button onClick={() => handleUserAction(u.id, u.plan === "free" ? "upgrade" : "downgrade", u.plan === "free" ? "pro" : "free")}
                                  title="Toggle Premium Plan"
                                  className="p-1.5 rounded-lg border bg-white/5 border-white/10 hover:border-amber-500 text-amber-400">
                                  <Crown size={14} />
                                </button>

                                {/* Password Reset */}
                                <button onClick={() => setPasswordModalUser(u)}
                                  title="Reset Password"
                                  className="p-1.5 rounded-lg border bg-white/5 border-white/10 hover:border-cyan-500 text-cyan-400">
                                  <Lock size={14} />
                                </button>

                                {/* Delete User */}
                                <button onClick={() => { if (confirm(`Permanently delete user ${u.name}?`)) handleUserAction(u.id, "delete"); }}
                                  title="Delete Account"
                                  className="p-1.5 rounded-lg border bg-white/5 border-white/10 hover:border-red-500 text-red-400">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                SECTION 3: JOBS & INGESTION MANAGEMENT
               ══════════════════════════════════════════════════════════ */}
            {activeSection === "jobs" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Job Postings & Scraper Control</h1>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">Manage live job listings, feature vacancies, and trigger automated Apify ingestion.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={handleTriggerIngestion} disabled={ingestLoading}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all">
                      {ingestLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} 
                      Run Scraper Ingestion
                    </button>
                    <button onClick={() => setShowAddJobModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20">
                      <Plus size={14} /> Post New Job
                    </button>
                  </div>
                </div>

                {/* Job Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search jobs by title, company name, location..."
                    value={jobSearch} onChange={(e) => { setJobSearch(e.target.value); loadJobs(1, e.target.value); }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-medium border bg-white/5 border-white/10 text-white focus:outline-none focus:border-amber-500" />
                </div>

                {/* Job Table */}
                <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-4">Job & Company</th>
                          <th className="p-4">Location & Mode</th>
                          <th className="p-4">Salary</th>
                          <th className="p-4">Status & Featured</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {jobs.map(j => (
                          <tr key={j.id} className="hover:bg-white/5 transition-all">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {j.logoUrl ? (
                                  <img src={j.logoUrl} alt={j.company} className="w-8 h-8 rounded-lg object-contain bg-white p-1" />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 font-bold flex items-center justify-center text-xs">
                                    {j.company[0]}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-white">{j.title}</div>
                                  <div className="text-[11px] text-gray-400">{j.company}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-gray-300">
                              <div>{j.location}</div>
                              <span className="text-[10px] text-gray-400">{j.workMode} • {j.employmentType}</span>
                            </td>
                            <td className="p-4 font-mono font-bold text-emerald-400">
                              {j.salaryMin ? `₹${(j.salaryMin / 100000).toFixed(1)}L - ₹${((j.salaryMax || j.salaryMin) / 100000).toFixed(1)}L` : "Undisclosed"}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <button onClick={() => handleJobToggle(j.id, { isActive: !j.isActive })}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${j.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                                  {j.isActive ? "Active" : "Inactive"}
                                </button>
                                <button onClick={() => handleJobToggle(j.id, { isFeatured: !j.isFeatured })}
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${j.isFeatured ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-gray-500/20 text-gray-400"}`}>
                                  {j.isFeatured ? "★ Featured" : "Normal"}
                                </button>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleJobDelete(j.id)}
                                className="p-1.5 rounded-lg border bg-white/5 border-white/10 hover:border-red-500 text-red-400 transition-all">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                SECTION 4: AI ENGINE & MODELS
               ══════════════════════════════════════════════════════════ */}
            {activeSection === "ai-models" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div>
                  <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>AI Engine & Model Configuration</h1>
                  <p className="text-xs font-medium text-gray-400 mt-0.5">Manage default LLMs, tier token limits, and AI generation parameters.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Model Selector */}
                  <div className="rounded-2xl p-5 border space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                    <h3 className="text-sm font-black flex items-center gap-2 text-white">
                      <Brain size={16} className="text-amber-500" /> Default Platform LLM Provider
                    </h3>

                    <div className="space-y-2">
                      {[
                        { id: "gemini", name: "Google Gemini 3.6 Flash (Recommended)", desc: "Fastest response, high-precision structured JSON outputs." },
                        { id: "claude", name: "Anthropic Claude 3.5 Sonnet", desc: "Superior code writing & ATS resume generation." },
                        { id: "gpt4", name: "OpenAI GPT-4o", desc: "High reasoning capacity for complex mock interviews." },
                        { id: "deepseek", name: "DeepSeek R1 Reasoning", desc: "Advanced algorithmic reasoning for Coding Hub." },
                      ].map(m => (
                        <div key={m.id} onClick={() => handleSaveSettings({ defaultAiModel: m.id })}
                          className={`p-3 rounded-xl border cursor-pointer transition-all ${systemSettings.defaultAiModel === m.id ? "bg-amber-500/10 border-amber-500 text-amber-500" : "bg-white/5 border-white/10 text-gray-300 hover:border-white/20"}`}>
                          <div className="font-bold text-xs">{m.name}</div>
                          <div className="text-[11px] opacity-75 mt-0.5">{m.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Token Limits */}
                  <div className="rounded-2xl p-5 border space-y-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                    <h3 className="text-sm font-black flex items-center gap-2 text-white">
                      <Zap size={16} className="text-emerald-500" /> Tier Usage & Limits
                    </h3>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-gray-400 font-bold mb-1">Free Tier Daily Limit (AI Requests)</label>
                        <input type="number" value={systemSettings.freeTierTokenLimit}
                          onChange={(e) => handleSaveSettings({ freeTierTokenLimit: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white font-mono" />
                      </div>

                      <div>
                        <label className="block text-gray-400 font-bold mb-1">Premium Tier Daily Limit (AI Requests)</label>
                        <input type="number" value={systemSettings.premiumTierTokenLimit}
                          onChange={(e) => handleSaveSettings({ premiumTierTokenLimit: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white font-mono" />
                      </div>

                      <div>
                        <label className="block text-gray-400 font-bold mb-1">AI Temperature ({systemSettings.aiTemperature})</label>
                        <input type="range" min="0" max="1" step="0.1" value={systemSettings.aiTemperature}
                          onChange={(e) => handleSaveSettings({ aiTemperature: Number(e.target.value) })}
                          className="w-full accent-amber-500" />
                      </div>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* ══════════════════════════════════════════════════════════
                SECTION 5: SYSTEM HEALTH & GLOBAL SETTINGS
               ══════════════════════════════════════════════════════════ */}
            {(activeSection === "system-health" || activeSection === "settings") && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                <div>
                  <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Global Platform & System Settings</h1>
                  <p className="text-xs font-medium text-gray-400 mt-0.5">Control maintenance mode, system announcement banner, and platform toggles.</p>
                </div>

                <div className="rounded-2xl p-5 border space-y-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                  
                  {/* Maintenance Switch */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <div className="font-bold text-xs text-white">System Maintenance Mode</div>
                      <div className="text-[11px] text-gray-400">When active, restricts user access to read-only state.</div>
                    </div>
                    <button onClick={() => handleSaveSettings({ maintenanceMode: !systemSettings.maintenanceMode })}
                      className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${systemSettings.maintenanceMode ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300"}`}>
                      {systemSettings.maintenanceMode ? "ACTIVE (RESTRICTED)" : "DISABLED (NORMAL)"}
                    </button>
                  </div>

                  {/* Banner Message */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-300">Global System Announcement Banner</label>
                    <input type="text" value={systemSettings.announcementBanner}
                      onChange={(e) => setSystemSettings({ ...systemSettings, announcementBanner: e.target.value })}
                      className="w-full p-3 rounded-xl border bg-white/5 border-white/10 text-white text-xs font-medium" />
                    <button onClick={() => handleSaveSettings({ announcementBanner: systemSettings.announcementBanner })}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-all">
                      Save Announcement Banner
                    </button>
                  </div>

                </div>

              </motion.div>
            )}

          </div>
        </main>
      </div>

      {/* ─── ADD JOB MODAL ──────────────────────────────────────────────── */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl p-6 border bg-[#0b1015] border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Post New Job Listing</h3>
              <button onClick={() => setShowAddJobModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Job Title *</label>
                <input type="text" required value={newJobData.title} onChange={e => setNewJobData({ ...newJobData, title: e.target.value })}
                  placeholder="e.g. Senior Software Engineer" className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Company Name *</label>
                  <input type="text" required value={newJobData.company} onChange={e => setNewJobData({ ...newJobData, company: e.target.value })}
                    placeholder="e.g. Google" className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Location</label>
                  <input type="text" value={newJobData.location} onChange={e => setNewJobData({ ...newJobData, location: e.target.value })}
                    placeholder="e.g. Bangalore / Remote" className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Min Salary (INR / annum)</label>
                  <input type="number" value={newJobData.salaryMin} onChange={e => setNewJobData({ ...newJobData, salaryMin: e.target.value })}
                    placeholder="1200000" className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white" />
                </div>
                <div>
                  <label className="block text-gray-400 font-bold mb-1">Max Salary (INR / annum)</label>
                  <input type="number" value={newJobData.salaryMax} onChange={e => setNewJobData({ ...newJobData, salaryMax: e.target.value })}
                    placeholder="2500000" className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Application Link</label>
                <input type="url" value={newJobData.applyUrl} onChange={e => setNewJobData({ ...newJobData, applyUrl: e.target.value })}
                  placeholder="https://careers.google.com/..." className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddJobModal(false)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 font-bold">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-amber-500 text-black font-extrabold hover:bg-amber-400">Post Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RESET PASSWORD MODAL ─────────────────────────────────────── */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl p-6 border bg-[#0b1015] border-white/10 space-y-4">
            <h3 className="text-base font-black text-white">Reset User Password</h3>
            <p className="text-xs text-gray-400">Resetting password for <span className="text-white font-bold">{passwordModalUser.name}</span> ({passwordModalUser.email}).</p>

            <div>
              <label className="block text-gray-400 font-bold text-xs mb-1">New Password</label>
              <input type="text" value={newPasswordVal} onChange={e => setNewPasswordVal(e.target.value)}
                className="w-full p-2.5 rounded-xl border bg-white/5 border-white/10 text-white text-xs font-mono" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPasswordModalUser(null)} className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-bold">Cancel</button>
              <button onClick={() => {
                handleUserAction(passwordModalUser.id, "reset-password", undefined, { newPassword: newPasswordVal });
                setPasswordModalUser(null);
              }} className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-extrabold hover:bg-amber-400">Confirm Reset</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
