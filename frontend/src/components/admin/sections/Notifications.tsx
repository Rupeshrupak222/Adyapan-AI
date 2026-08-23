"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Mail, MessageSquare, Send, AlertTriangle, Info,
  CheckCircle2, Clock, RefreshCw, Loader2, Inbox, Plus,
  Users, Crown, Gift, ExternalLink, Trash2, X, Search, Filter, ShieldAlert, Sparkles, Check
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";

interface SystemNotification {
  id: string;
  adminId?: string;
  title: string;
  message: string;
  type: string; // info, announcement, alert, promotion, feature, maintenance
  targetAudience: "ALL" | "FREE" | "PREMIUM" | "ADMIN";
  actionUrl?: string;
  priority: "low" | "normal" | "high" | "urgent";
  deliveryChannel: string;
  sendEmail: boolean;
  isRevoked: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface NotificationStats {
  totalBroadcasts: number;
  activeBroadcasts: number;
  reachStats: {
    all: number;
    free: number;
    premium: number;
  };
}

interface NotificationsApiResponse {
  success: boolean;
  notifications: SystemNotification[];
  stats: NotificationStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  announcement: {
    label: "Announcement",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.3)",
    icon: <Bell size={12} />,
  },
  promotion: {
    label: "Special Offer",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: <Gift size={12} />,
  },
  feature: {
    label: "Feature Update",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.3)",
    icon: <Sparkles size={12} />,
  },
  alert: {
    label: "Important Alert",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: <AlertTriangle size={12} />,
  },
  maintenance: {
    label: "Maintenance",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.3)",
    icon: <ShieldAlert size={12} />,
  },
  info: {
    label: "General Info",
    color: "#64748b",
    bg: "rgba(100,116,139,0.12)",
    border: "rgba(100,116,139,0.3)",
    icon: <Info size={12} />,
  },
};

const AUDIENCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; bg: string; color: string; border: string }> = {
  ALL: {
    label: "All Users",
    icon: <Users size={14} />,
    bg: "rgba(59,130,246,0.12)",
    color: "#60a5fa",
    border: "rgba(59,130,246,0.3)",
  },
  FREE: {
    label: "Free Tier Users",
    icon: <Gift size={14} />,
    bg: "rgba(245,158,11,0.12)",
    color: "#f59e0b",
    border: "rgba(245,158,11,0.3)",
  },
  PREMIUM: {
    label: "Premium / Pro Users",
    icon: <Crown size={14} />,
    bg: "rgba(168,85,247,0.12)",
    color: "#c084fc",
    border: "rgba(168,85,247,0.3)",
  },
  ADMIN: {
    label: "Admins Only",
    icon: <ShieldAlert size={14} />,
    bg: "rgba(239,68,68,0.12)",
    color: "#f87171",
    border: "rgba(239,68,68,0.3)",
  },
};

function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Math.floor((now - then) / 60000));
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function Notifications() {
  const theme = useTheme();
  const isDark = theme === "dark";
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    totalBroadcasts: 0,
    activeBroadcasts: 0,
    reachStats: { all: 0, free: 0, premium: 0 },
  });

  // Filters & Search
  const [targetFilter, setTargetFilter] = useState<string>("ALL_FILTER");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "announcement",
    targetAudience: "ALL" as "ALL" | "FREE" | "PREMIUM",
    actionUrl: "",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    sendEmail: false,
  });

  const inputStyle = {
    background: isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
    borderColor: isDark ? "rgba(255,255,255,0.15)" : "#cbd5e1",
    color: "var(--text-primary)",
  };

  const fetchData = useCallback(async () => {

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetFilter !== "ALL_FILTER") params.append("targetAudience", targetFilter);
      if (typeFilter) params.append("type", typeFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await api.get<NotificationsApiResponse>(`/admin/notifications?${params.toString()}`);
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        if (res.data.stats) setStats(res.data.stats);
      }
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [targetFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/admin/notifications", formData);
      if (res.data?.success) {
        toast.success(res.data.message || "Notification broadcasted successfully!");
        setModalOpen(false);
        setFormData({
          title: "",
          message: "",
          type: "announcement",
          targetAudience: "ALL",
          actionUrl: "",
          priority: "normal",
          sendEmail: false,
        });
        fetchData();
      } else {
        toast.error("Failed to send broadcast");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to broadcast notification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const res = await api.put(`/admin/notifications/${id}/revoke`);
      if (res.data?.success) {
        toast.success(res.data.message);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRevoked: !n.isRevoked } : n))
        );
      }
    } catch {
      toast.error("Failed to toggle notification status");
    } finally {
      setRevokingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification broadcast?")) return;
    setDeletingId(id);
    try {
      const res = await api.delete(`/admin/notifications/${id}`);
      if (res.data?.success) {
        toast.success("Notification deleted");
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {
      toast.error("Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  const currentAudienceReach =
    formData.targetAudience === "ALL"
      ? stats.reachStats.all
      : formData.targetAudience === "FREE"
      ? stats.reachStats.free
      : stats.reachStats.premium;

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading System Broadcasts...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Notifications & System Broadcasts"
        description="Create, target, and dispatch system alerts and announcements for Free vs Premium users"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg"
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "#000",
                boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
              }}
            >
              <Plus size={16} />
              Create Broadcast
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </motion.button>
          </div>
        }
      />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Bell size={18} />}
          label="Active Broadcasts"
          value={stats.activeBroadcasts}
          subtext={`${stats.totalBroadcasts} Total Created`}
          color="#f59e0b"
        />
        <SummaryCard
          icon={<Users size={18} />}
          label="All Users Reach"
          value={stats.reachStats.all}
          subtext="Total Platform Reach"
          color="#3b82f6"
        />
        <SummaryCard
          icon={<Gift size={18} />}
          label="Free Tier Audience"
          value={stats.reachStats.free}
          subtext="Free Plan Users"
          color="#10b981"
        />
        <SummaryCard
          icon={<Crown size={18} />}
          label="Premium Tier Audience"
          value={stats.reachStats.premium}
          subtext="Pro & Paid Subscriptions"
          color="#a855f7"
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        className="rounded-2xl border p-4 flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        {/* Audience Segment Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: "ALL_FILTER", label: "All Broadcasts", icon: <Inbox size={13} /> },
            { id: "ALL", label: "All Users", icon: <Users size={13} /> },
            { id: "FREE", label: "Free Users", icon: <Gift size={13} /> },
            { id: "PREMIUM", label: "Premium Users", icon: <Crown size={13} /> },
          ].map((tab) => {
            const active = targetFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTargetFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border-none cursor-pointer`}
                style={{
                  background: active ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.04)",
                  color: active ? "#000" : "var(--text-secondary)",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search & Type Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs font-medium border outline-none transition-all"
              style={{
                background: "rgba(0,0,0,0.2)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border outline-none cursor-pointer"
            style={{
              background: "rgba(0,0,0,0.2)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Types</option>
            <option value="announcement">Announcement</option>
            <option value="promotion">Special Offer</option>
            <option value="feature">Feature Update</option>
            <option value="alert">Important Alert</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* Broadcast List */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2">
            <Send size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Broadcast History ({notifications.length})
            </h2>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Inbox size={32} style={{ color: "#f59e0b" }} />
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>No system broadcasts found</p>
            <p className="text-xs mt-1 max-w-sm" style={{ color: "var(--text-muted)" }}>
              Create a new notification broadcast to target Free or Premium users across the platform.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
            >
              <Plus size={14} /> Send First Notification
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {notifications.map((n, idx) => {
              const typeCfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
              const audienceCfg = AUDIENCE_CONFIG[n.targetAudience] || AUDIENCE_CONFIG.ALL;

              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 transition-all hover:bg-white/[0.02] ${
                    n.isRevoked ? "opacity-55 grayscale-[0.4]" : ""
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: typeCfg.bg, border: `1px solid ${typeCfg.border}`, color: typeCfg.color }}
                    >
                      {typeCfg.icon}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold tracking-tight" style={{ color: "var(--text-primary)" }}>
                          {n.title}
                        </h3>

                        {/* Audience Badge */}
                        <span
                          className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                          style={{ background: audienceCfg.bg, color: audienceCfg.color, border: `1px solid ${audienceCfg.border}` }}
                        >
                          {audienceCfg.icon}
                          {audienceCfg.label}
                        </span>

                        {/* Type Badge */}
                        <span
                          className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md"
                          style={{ background: typeCfg.bg, color: typeCfg.color }}
                        >
                          {typeCfg.label}
                        </span>

                        {/* Priority Badge if high/urgent */}
                        {["high", "urgent"].includes(n.priority) && (
                          <span
                            className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          >
                            {n.priority}
                          </span>
                        )}

                        {n.isRevoked && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-500/20 text-slate-400">
                            Revoked
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                        {n.message}
                      </p>

                      <div className="flex items-center gap-4 text-[10px] font-medium pt-1" style={{ color: "var(--text-muted)" }}>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {timeAgo(n.createdAt)}
                        </span>
                        {n.actionUrl && (
                          <span className="flex items-center gap-1 text-amber-500 font-semibold truncate max-w-xs">
                            <ExternalLink size={10} />
                            CTA: {n.actionUrl}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleToggleRevoke(n.id)}
                      disabled={revokingId === n.id}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer"
                      style={{
                        background: n.isRevoked ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                        color: n.isRevoked ? "#10b981" : "#ef4444",
                        borderColor: n.isRevoked ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
                      }}
                    >
                      {revokingId === n.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : n.isRevoked ? (
                        "Re-activate"
                      ) : (
                        "Revoke"
                      )}
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingId === n.id}
                      className="p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-transparent hover:border-rose-500/30"
                      title="Delete Notification"
                    >
                      {deletingId === n.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── CREATE BROADCAST NOTIFICATION MODAL ── */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-[74px] bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
              style={{
                height: "min(680px, calc(100vh - 90px))",
                background: isDark ? "#0c131a" : "#ffffff",
                borderColor: isDark ? "rgba(245,158,11,0.3)" : "rgba(203,213,225,0.8)",
                boxShadow: isDark ? "0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(245,158,11,0.15)" : "0 20px 40px rgba(0,0,0,0.15)",
              }}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,1)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-black" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                    <Send size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold" style={{ color: "var(--text-primary)" }}>Create System Broadcast</h3>
                    <p className="text-xs text-amber-500 font-semibold">Dispatch notifications by user segment</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCreateBroadcast} className="p-6 space-y-5 overflow-y-auto flex-1">
                {/* Target Audience Selector */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                    Target Audience Segment *
                  </label>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "ALL", label: "All Users", icon: <Users size={16} />, desc: "Every user", count: stats.reachStats.all },
                      { id: "FREE", label: "Free Tier", icon: <Gift size={16} />, desc: "Free plan users", count: stats.reachStats.free },
                      { id: "PREMIUM", label: "Premium Pro", icon: <Crown size={16} />, desc: "Paid subscribers", count: stats.reachStats.premium },
                    ].map((seg) => {
                      const selected = formData.targetAudience === seg.id;
                      return (
                        <button
                          key={seg.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, targetAudience: seg.id as any })}
                          className={`p-3.5 rounded-2xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                            selected
                              ? "border-amber-500 bg-amber-500/15 shadow-lg text-amber-500 font-extrabold"
                              : isDark
                                ? "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <div className={`p-2 rounded-xl mb-1.5 ${selected ? "bg-amber-500 text-black" : "bg-white/5"}`}>
                            {seg.icon}
                          </div>
                          <span className="text-xs font-black">{seg.label}</span>
                          <span className="text-[10px] font-bold mt-0.5 text-amber-500">{seg.count} Users</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Notification Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. New AI Feature Released or 50% Off Pro Upgrade!"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold border outline-none focus:border-amber-500 transition-colors"
                    style={inputStyle}
                  />
                </div>

                {/* Message / Description */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Notification Message *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a descriptive message to be shown in the user's notification drawer..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none focus:border-amber-500 transition-colors"
                    style={inputStyle}
                  />
                </div>

                {/* Category Type & Priority */}
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Category Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border outline-none focus:border-amber-500 transition-colors"
                      style={inputStyle}
                    >
                      <option value="announcement" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Announcement</option>
                      <option value="promotion" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Special Offer / Discount</option>
                      <option value="feature" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Feature Release</option>
                      <option value="alert" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Important Alert</option>
                      <option value="maintenance" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Maintenance Notice</option>
                      <option value="info" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>General Info</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      Priority Level
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-bold border outline-none focus:border-amber-500 transition-colors"
                      style={inputStyle}
                    >
                      <option value="normal" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Normal</option>
                      <option value="high" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>High Priority</option>
                      <option value="urgent" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Urgent Alert</option>
                      <option value="low" style={{ background: isDark ? "#0c131a" : "#ffffff", color: "var(--text-primary)" }}>Low Priority</option>
                    </select>
                  </div>
                </div>

                {/* Action Link CTA */}
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Redirect CTA Link (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /dashboard/interview or /pricing"
                    value={formData.actionUrl}
                    onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl text-xs font-medium border outline-none focus:border-amber-500 transition-colors"
                    style={inputStyle}
                  />
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>Users clicking this notification will be redirected to this route.</p>
                </div>

                {/* Delivery Options */}
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Mail size={16} className="text-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-amber-500 block">Queue Email Digest</span>
                      <span className="text-[10px] opacity-80" style={{ color: "var(--text-secondary)" }}>Simulate email broadcast notice for targeted users</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.sendEmail}
                    onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Live Target Reach Summary */}
                <div className="p-3 rounded-xl border flex items-center justify-between text-xs" style={inputStyle}>
                  <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Estimated Audience Reach:</span>
                  <span className="font-black text-amber-500 flex items-center gap-1.5">
                    <Users size={13} />
                    {currentAudienceReach} Active Users
                  </span>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-transparent border-none cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer border-none transition-all shadow-lg hover:scale-[1.02]"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "#000",
                      boxShadow: "0 6px 20px rgba(245,158,11,0.4)",
                    }}
                  >

                    {submitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" /> Broadcasting...
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Dispatch Broadcast Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtext: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border p-5 flex items-center gap-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-black font-mono tracking-tight" style={{ color: "var(--text-primary)" }}>
          {value}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
          {label}
        </div>
        <div className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          {subtext}
        </div>
      </div>
    </div>
  );
}
