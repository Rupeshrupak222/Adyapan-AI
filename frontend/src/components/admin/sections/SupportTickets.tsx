"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import {
  LifeBuoy, Search, Loader2, X, RefreshCw,
  CheckCircle2, Clock, AlertTriangle, Bug, Eye,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { cn } from "@/lib/cn";

interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  category: string;
  severity: string;
  status: string;
  message: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface UserSettingsView {
  profile?: {
    college?: string;
    branch?: string;
    degree?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    aboutMe?: string;
    graduationYear?: string;
  };
  settings?: {
    themeMode?: string;
    accentColor?: string;
    aiModel?: string;
    twoFactorEnabled?: boolean;
    loginAlerts?: boolean;
    publicProfile?: boolean;
    [key: string]: unknown;
  };
  storageUsage?: { limitMb?: number; usedMb?: number };
  ticketCount?: number;
}

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

function statusVariant(status: string): "success" | "warning" | "error" | "info" | "default" {
  switch (status) {
    case "open": return "warning";
    case "in_progress": return "info";
    case "resolved": return "success";
    case "closed": return "default";
    default: return "default";
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "low": return "#10b981";
    default: return "#f59e0b";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ ticket: SupportTicket; data: UserSettingsView } | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [feedback, setFeedback] = useState("");

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`/admin/support-tickets?${params.toString()}`);
      if (res.data.success) {
        setTickets(res.data.tickets || []);
        setStats(res.data.stats || {});
      }
    } catch (err) {
      console.error("[SupportTickets] fetch error", err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    const t = setTimeout(() => fetchTickets(), 300);
    return () => clearTimeout(t);
  }, [fetchTickets]);

  const changeStatus = async (ticketId: string, status: string) => {
    setUpdatingId(ticketId);
    try {
      await api.put(`/admin/support-tickets/${ticketId}/status`, { status });
      setFeedback(`Ticket ${ticketId} marked as ${status}`);
      await fetchTickets();
    } catch (err: any) {
      setFeedback(err?.response?.data?.error || "Failed to update ticket status");
    } finally {
      setUpdatingId(null);
    }
  };

  const openTicket = async (ticket: SupportTicket) => {
    setViewLoading(true);
    setViewing({ ticket, data: {} });
    try {
      const res = await api.get(`/admin/users/${ticket.userId}/settings`);
      if (res.data.success) {
        setViewing({ ticket, data: res.data });
      }
    } catch (err) {
      console.error("[SupportTickets] view settings error", err);
    } finally {
      setViewLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (statusFilter === "all" && !search.trim()) return tickets;
    return tickets;
  }, [tickets, statusFilter, search]);

  const kpiCards = [
    { label: "Total Tickets", value: stats.total ?? 0, icon: <LifeBuoy size={14} />, color: "#38bdf8" },
    { label: "Open", value: stats.open ?? 0, icon: <AlertTriangle size={14} />, color: "#f59e0b" },
    { label: "In Progress", value: stats.inProgress ?? 0, icon: <Clock size={14} />, color: "#818cf8" },
    { label: "Resolved", value: stats.resolved ?? 0, icon: <CheckCircle2 size={14} />, color: "#10b981" },
    { label: "Bug Reports", value: stats.bugs ?? 0, icon: <Bug size={14} />, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Support Center"
        description="Manage support tickets and bug reports submitted from the user Settings &gt; Help section"
        actions={
          <button
            onClick={() => fetchTickets()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border"
            style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", borderColor: "rgba(245,158,11,0.3)" }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((k) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border p-4"
            style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: k.color }}>
              {k.icon}
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{k.label}</span>
            </div>
            <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", ...STATUS_OPTIONS].map((s) => (
          <motion.button
            key={s}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setStatusFilter(s)}
            className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            style={{
              background: statusFilter === s ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
              color: statusFilter === s ? "#f59e0b" : "var(--text-secondary)",
              border: `1px solid ${statusFilter === s ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
            }}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </motion.button>
        ))}
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="pl-8 pr-3 py-1.5 rounded-full text-[11px] font-medium outline-none w-48 transition-all focus:w-64"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          />
        </div>
      </div>

      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
        >
          {feedback}
        </motion.div>
      )}

      {/* Tickets table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              No support tickets found
            </div>
          ) : (
            <table className="w-full text-left" style={{ minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["Ticket", "User", "Subject", "Category", "Severity", "Status", "Submitted", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border-color)" }} className="transition-colors hover:bg-white/5">
                    <td className="px-4 py-3 text-xs font-bold whitespace-nowrap" style={{ color: "#f59e0b" }}>{t.ticketId}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{t.userName}</div>
                      <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{t.userEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[220px] truncate" style={{ color: "var(--text-primary)" }}>{t.subject}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{t.category}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: `${severityColor(t.severity)}22`, color: severityColor(t.severity), border: `1px solid ${severityColor(t.severity)}44` }}>
                        {t.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={t.status}
                        disabled={updatingId === t.ticketId}
                        onChange={(e) => changeStatus(t.ticketId, e.target.value)}
                        className="text-[11px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer disabled:opacity-50"
                        style={{ background: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-color)" }}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openTicket(t)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:bg-white/10 border"
                        style={{ color: "var(--text-secondary)", borderColor: "var(--border-color)" }}
                      >
                        <Eye size={11} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Ticket detail / user settings modal */}
      <AnimatePresence>
        {viewing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setViewing(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border p-6 space-y-5"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>
                    {viewing.ticket.ticketId} — {viewing.ticket.subject}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{viewing.ticket.userName}</span> · {viewing.ticket.userEmail}
                    <StatusBadge variant={statusVariant(viewing.ticket.status)}>{viewing.ticket.status}</StatusBadge>
                  </div>
                </div>
                <button
                  onClick={() => setViewing(null)}
                  className="p-2 rounded-full hover:bg-white/10 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="rounded-2xl border p-4 text-xs leading-relaxed whitespace-pre-wrap" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)", color: "var(--text-primary)" }}>
                {viewing.ticket.message}
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  User Settings {viewLoading && <Loader2 size={11} className="inline animate-spin ml-1" />}
                </div>
                {viewLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      ["Theme", viewing.data.settings?.themeMode],
                      ["Accent", viewing.data.settings?.accentColor],
                      ["AI Model", viewing.data.settings?.aiModel],
                      ["2FA", viewing.data.settings?.twoFactorEnabled ? "Enabled" : "Disabled"],
                      ["Login Alerts", viewing.data.settings?.loginAlerts ? "On" : "Off"],
                      ["Public Profile", viewing.data.settings?.publicProfile ? "Visible" : "Hidden"],
                      ["College", viewing.data.profile?.college],
                      ["Branch", viewing.data.profile?.branch],
                      ["Degree", viewing.data.profile?.degree],
                      ["Graduation", viewing.data.profile?.graduationYear],
                      ["Location", viewing.data.profile?.location],
                      ["Storage Used", `${viewing.data.storageUsage?.usedMb ?? 0} MB / ${viewing.data.storageUsage?.limitMb ?? 50} MB`],
                    ].map(([label, value]) => (
                      <div key={label as string} className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
                        <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
                        <div className="font-semibold capitalize truncate" style={{ color: "var(--text-primary)" }}>
                          {value === undefined || value === null || value === "" ? "—" : String(value)}
                        </div>
                      </div>
                    ))}
                    <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Tickets</div>
                      <div className="font-semibold" style={{ color: "var(--text-primary)" }}>{viewing.data.ticketCount ?? 0}</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
