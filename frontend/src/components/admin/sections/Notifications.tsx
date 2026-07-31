"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bell, Mail, MessageSquare, Smartphone,
  Send, AlertTriangle, Info, ShieldAlert,
  CheckCircle2, Clock, RefreshCw, Loader2, Inbox,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { api } from "@/services/api";
import { toast } from "sonner";

interface AdminAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

interface SecurityData {
  success: boolean;
  security: {
    alerts: AdminAlert[];
  };
}

const SEVERITY_STYLE: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  critical: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
    icon: <ShieldAlert size={12} />,
    label: "Critical",
  },
  warning: {
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.3)",
    icon: <AlertTriangle size={12} />,
    label: "Warning",
  },
  info: {
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.3)",
    icon: <Info size={12} />,
    label: "Info",
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
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [acking, setAcking] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<SecurityData>("/admin/security");
      if (res.data?.success) {
        setAlerts(res.data.security?.alerts ?? []);
      }
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const acknowledge = useCallback(async (id: string) => {
    setAcking(id);
    try {
      const res = await api.post(`/admin/notifications/${id}/read`);
      if (res.data?.success) {
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
        toast.success("Notification acknowledged");
      } else {
        toast.error("Failed to acknowledge notification");
      }
    } catch {
      toast.error("Failed to acknowledge notification");
    } finally {
      setAcking(null);
    }
  }, []);

  const unread = alerts.filter((a) => !a.acknowledged).length;
  const read = alerts.length - unread;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Notifications
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Notifications"
        description="Platform alerts and system notifications"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant={unread > 0 ? "warning" : "success"} pulse={unread > 0}>
              {unread} Unread
            </StatusBadge>
            <StatusBadge variant="info">{alerts.length} Total</StatusBadge>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <RefreshCw size={12} />
              Refresh
            </motion.button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard icon={<Bell size={16} />} label="Total Notifications" value={alerts.length} color="#f59e0b" />
        <SummaryCard icon={<Send size={16} />} label="Unread" value={unread} color="#818cf8" />
        <SummaryCard icon={<CheckCircle2 size={16} />} label="Acknowledged" value={read} color="#10b981" />
      </div>

      {/* Alerts list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <Bell size={16} style={{ color: "#10b981" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            All Notifications
          </h2>
        </div>

        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Inbox size={28} style={{ color: "rgba(255,255,255,0.15)" }} />
            </div>
            <p className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>No notifications</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              System notifications will appear here as they are generated.
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {alerts.map((n, idx) => {
              const style = SEVERITY_STYLE[n.severity] ?? SEVERITY_STYLE.info;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02, duration: 0.2 }}
                  className={`flex items-center gap-4 px-5 py-3.5 transition-all hover:bg-white/[0.02] ${n.acknowledged ? "opacity-60" : ""}`}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}>
                    {style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{n.title}</span>
                      <StatusBadge variant={n.acknowledged ? "success" : "warning"}>
                        {n.acknowledged ? "Read" : "Unread"}
                      </StatusBadge>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: style.bg, color: style.color }}>
                        {style.label}
                      </span>
                    </div>
                    {n.description && (
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{n.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{n.source}</span>
                      <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                        <Clock size={10} />
                        {timeAgo(n.timestamp)}
                      </span>
                    </div>
                  </div>
                  {!n.acknowledged && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => acknowledge(n.id)}
                      disabled={acking === n.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0 transition-all disabled:opacity-50"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
                    >
                      {acking === n.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                      Acknowledge
                    </motion.button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Channel legend */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Mail size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Delivery Channels
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <ChannelPill icon={<Mail size={14} />} label="Email" active />
          <ChannelPill icon={<Bell size={14} />} label="Push" active />
          <ChannelPill icon={<Smartphone size={14} />} label="SMS" />
          <ChannelPill icon={<MessageSquare size={14} />} label="In-app" active />
        </div>
        <p className="text-[9px] font-medium mt-3" style={{ color: "var(--text-muted)" }}>
          Platform notification preferences are configured per user in their settings. This panel reflects available delivery channels.
        </p>
      </motion.div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border p-5 flex items-center gap-4" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-black font-mono tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
      </div>
    </div>
  );
}

function ChannelPill({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <span className="flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold" style={{ background: active ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.03)", color: active ? "#f59e0b" : "var(--text-secondary)", border: `1px solid ${active ? "rgba(245,158,11,0.3)" : "var(--border-color)"}` }}>
      {icon}
      {label}
      <span className={`text-[8px] font-bold uppercase ${active ? "text-emerald-400" : ""}`} style={active ? undefined : { color: "var(--text-muted)" }}>
        {active ? "Active" : "Inactive"}
      </span>
    </span>
  );
}
