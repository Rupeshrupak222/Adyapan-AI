"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, Activity, Ban, AlertTriangle, LogIn,
  Monitor, Smartphone, CheckCircle, XCircle,
  RefreshCw, Clock, Lock, AlertOctagon,
  Gauge, Crown, Star, Loader2,
} from "lucide-react";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { MetricCard } from "@/components/admin/shared/MetricCard";

interface LoginAttempt {
  id: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  status: "success" | "failed";
  timestamp: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  permissions: string[];
}

interface SecurityAlert {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

interface SecurityData {
  totalAdmins: number;
  activeSessions: number;
  failedLogins: number;
  blockedIps: number;
  status: "secure" | "warning" | "critical";
  logins: LoginAttempt[];
  admins: AdminUser[];
  alerts: SecurityAlert[];
}

interface SecurityResponse {
  success: boolean;
  security: SecurityData;
}

const STATUS_CONFIG = {
  secure: { label: "Secure", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" },
  warning: { label: "Warning", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  critical: { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)" },
};

const SEVERITY_CONFIG = {
  critical: { icon: <AlertOctagon size={14} />, color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", label: "Critical" },
  warning: { icon: <AlertTriangle size={14} />, color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", label: "Warning" },
  info: { icon: <AlertTriangle size={14} />, color: "#818cf8", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", label: "Info" },
};

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function parseUserAgent(ua: string): { isMobile: boolean; browser: string } {
  if (!ua) return { isMobile: false, browser: "—" };
  const isMobile = /android|iphone|ipad|mobile/i.test(ua);
  let browser = "Browser";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";
  return { isMobile, browser };
}

export default function SecurityCenter() {
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  const fetchSecurity = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await api.get<SecurityResponse>("/admin/security");
      if (res.data.success) {
        setSecurity(res.data.security);
      }
    } catch {
      setError("Failed to load security data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  const handleAcknowledge = async (alertId: string) => {
    setAckLoading(alertId);
    try {
      await api.post(`/admin/notifications/${alertId}/read`);
      fetchSecurity(true);
    } catch {
      setError("Failed to acknowledge alert");
    } finally {
      setAckLoading(null);
    }
  };

  if (loading && !security) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
      </div>
    );
  }

  const statusStyle = security ? STATUS_CONFIG[security.status] : STATUS_CONFIG.secure;
  const unacknowledgedAlerts = (security?.alerts ?? []).filter((a) => !a.acknowledged);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Security Center"
        description="Monitor security events, access control, and threat detection"
        actions={
          <div className="flex items-center gap-2">
            {security && (
              <StatusBadge variant={security.status === "secure" ? "success" : security.status === "warning" ? "warning" : "error"} pulse>
                {STATUS_CONFIG[security.status].label}
              </StatusBadge>
            )}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => fetchSecurity(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </motion.button>
          </div>
        }
      />

      {error && !security && (
        <div className="rounded-2xl border p-6 text-center text-xs font-medium" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
          {error}
        </div>
      )}

      {/* Security Status Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <MetricCard
          label="Total Admins"
          value={security?.totalAdmins ?? 0}
          color="#818cf8"
          icon={<Users size={16} />}
          subtitle="Registered administrators"
        />
        <MetricCard
          label="Active Sessions"
          value={security?.activeSessions ?? 0}
          color="#10b981"
          icon={<Activity size={16} />}
          subtitle="Active admin accounts"
        />
        <MetricCard
          label="Failed Logins"
          value={security?.failedLogins ?? 0}
          color="#ef4444"
          icon={<LogIn size={16} />}
          subtitle="Last 24 hours"
        />
        <MetricCard
          label="Blocked IPs"
          value={security?.blockedIps ?? 0}
          color="#f59e0b"
          icon={<Ban size={16} />}
          subtitle="Currently blocked"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 rounded-xl border flex flex-col justify-between"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Security Status</div>
            <Shield size={16} style={{ color: statusStyle.color }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: statusStyle.color }} />
            <span className="text-lg font-black tracking-tight" style={{ color: statusStyle.color }}>
              {statusStyle.label}
            </span>
          </div>
          <div
            className="mt-2 px-2.5 py-1 rounded-lg text-[10px] font-bold text-center"
            style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}
          >
            {unacknowledgedAlerts.length > 0
              ? `${unacknowledgedAlerts.length} unhandled alerts`
              : "All clear"}
          </div>
        </motion.div>
      </motion.div>

      {/* Recent Login Activity + Admin Access */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Login Activity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="lg:col-span-3 rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <LogIn size={16} style={{ color: "#818cf8" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Recent Login Activity
            </h2>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              {(security?.logins ?? []).length} attempts
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["User", "IP Address", "Device", "Status", "Timestamp"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(security?.logins ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>No admin login activity yet</p>
                    </td>
                  </tr>
                ) : (security?.logins ?? []).map((attempt, idx) => {
                  const { isMobile, browser } = parseUserAgent(attempt.userAgent);
                  return (
                    <motion.tr
                      key={attempt.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.025, duration: 0.2 }}
                      style={{ borderBottom: "1px solid var(--border-color)" }}
                      className="transition-all hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate max-w-[180px]" style={{ color: "var(--text-primary)" }}>
                            {attempt.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-medium" style={{ color: "var(--text-secondary)" }}>
                          {attempt.ipAddress}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {isMobile
                            ? <Smartphone size={11} style={{ color: "var(--text-muted)" }} />
                            : <Monitor size={11} style={{ color: "var(--text-muted)" }} />
                          }
                          <span className="text-[11px] font-medium truncate max-w-[160px]" style={{ color: "var(--text-secondary)" }}>
                            {browser}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge variant={attempt.status === "success" ? "success" : "error"} pulse={attempt.status === "success"}>
                          {attempt.status === "success" ? (
                            <><CheckCircle size={10} /> Success</>
                          ) : (
                            <><XCircle size={10} /> Failed</>
                          )}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }} title={formatDate(attempt.timestamp)}>
                          {formatRelativeTime(attempt.timestamp)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Admin Access */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="lg:col-span-2 rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Shield size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Admin Access
            </h2>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              {(security?.admins ?? []).length} users
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {(security?.admins ?? []).length === 0 ? (
              <p className="px-5 py-10 text-center text-xs font-medium" style={{ color: "var(--text-muted)" }}>No admin accounts</p>
            ) : (security?.admins ?? []).map((admin, idx) => (
              <motion.div
                key={admin.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="flex items-start gap-3 px-5 py-3.5 transition-all hover:bg-white/[0.02]"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                  style={{
                    background: admin.role === "Super Admin"
                      ? "linear-gradient(135deg, #f59e0b, #d97706)"
                      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#000",
                  }}
                >
                  {admin.name[0]?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold truncate max-w-[140px]" style={{ color: "var(--text-primary)" }}>
                      {admin.name}
                    </span>
                    <StatusBadge
                      variant={admin.role === "Super Admin" ? "warning" : "info"}
                    >
                      {admin.role === "Super Admin" ? <Crown size={9} /> : <Star size={9} />}
                      {admin.role}
                    </StatusBadge>
                  </div>
                  <div className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {admin.email}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Clock size={10} style={{ color: "var(--text-muted)" }} />
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                      {formatRelativeTime(admin.lastActive)}
                    </span>
                    {admin.permissions[0] === "all" ? (
                      <StatusBadge variant="warning">Full Access</StatusBadge>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Security Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <AlertTriangle size={16} style={{ color: "#ef4444" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Security Alerts
          </h2>
          {unacknowledgedAlerts.length > 0 && (
            <span
              className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              {unacknowledgedAlerts.length} new
            </span>
          )}
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
          {(security?.alerts ?? []).length === 0 ? (
            <div className="px-5 py-14 text-center">
              <Gauge size={32} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>No security alerts</p>
            </div>
          ) : (security?.alerts ?? []).map((alert, idx) => {
            const sev = SEVERITY_CONFIG[alert.severity] ?? SEVERITY_CONFIG.info;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="px-5 py-4 transition-all hover:bg-white/[0.02]"
                style={{
                  borderColor: "var(--border-color)",
                  opacity: alert.acknowledged ? 0.6 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: sev.bg, border: `1px solid ${sev.border}`, color: sev.color }}
                  >
                    {sev.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                            {alert.title}
                          </span>
                          <StatusBadge variant={alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warning" : "info"}>
                            {sev.label}
                          </StatusBadge>
                        </div>
                        <p className="text-[11px] font-medium mt-1" style={{ color: "var(--text-secondary)" }}>
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                            Source: {alert.source}
                          </span>
                          <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                            <Clock size={10} />
                            {formatRelativeTime(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={ackLoading === alert.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          {ackLoading === alert.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                          {ackLoading === alert.id ? "..." : "Acknowledge"}
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
