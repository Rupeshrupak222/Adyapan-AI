"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield, Users, Activity, Ban, AlertTriangle, LogIn,
  Monitor, Globe, Smartphone, CheckCircle, XCircle,
  RefreshCw, Loader2, Clock, Lock, Key, AlertOctagon,
  Gauge, Server, Wifi, Zap, Eye, EyeOff, UserCheck,
  UserX, Star, Crown, ChevronRight, MoreHorizontal,
} from "lucide-react";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { MetricCard } from "@/components/admin/shared/MetricCard";

interface SecurityData {
  totalAdmins: number;
  activeSessions: number;
  failedLogins: number;
  blockedIps: number;
  status: "secure" | "warning" | "critical";
}

interface SecurityResponse {
  success: boolean;
  security: SecurityData;
}

interface LoginAttempt {
  id: string;
  user: string;
  email: string;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
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
  avatar?: string;
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

interface RateLimit {
  endpoint: string;
  limit: number;
  used: number;
  remaining: number;
  resetIn: string;
}

const MOCK_LOGINS: LoginAttempt[] = Array.from({ length: 14 }, (_, i) => {
  const users = [
    { name: "Ashish Sharma", email: "ashish@adyapan.ai" },
    { name: "Priya Patel", email: "priya@adyapan.ai" },
    { name: "Rahul Verma", email: "rahul@adyapan.ai" },
    { name: "Ananya Singh", email: "ananya@adyapan.ai" },
    { name: "Vikram Reddy", email: "vikram@adyapan.ai" },
    { name: "Neha Gupta", email: "neha@adyapan.ai" },
    { name: "Arjun Nair", email: "arjun@adyapan.ai" },
    { name: "Deepika Joshi", email: "deepika@adyapan.ai" },
    { name: "Karan Mehta", email: "karan@adyapan.ai" },
    { name: "Sneha Kapoor", email: "sneha@adyapan.ai" },
  ];
  const user = users[i % users.length];
  const status: "success" | "failed" = Math.random() > 0.25 ? "success" : "failed";
  const locations = [
    "Mumbai, IN", "Delhi, IN", "Bangalore, IN", "Hyderabad, IN",
    "Chennai, IN", "Pune, IN", "Kolkata, IN", "Jaipur, IN",
  ];
  const devices = [
    "Chrome 125 / Windows", "Firefox 128 / macOS", "Safari 17 / iOS",
    "Chrome 124 / Android", "Edge 125 / Windows", "Samsung Internet / Android",
  ];
  const date = new Date(Date.now() - i * 3600000 - Math.random() * 7200000);
  return {
    id: `login-${i}`,
    user: user.name,
    email: user.email,
    ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    location: locations[Math.floor(Math.random() * locations.length)],
    device: devices[Math.floor(Math.random() * devices.length)],
    browser: devices[Math.floor(Math.random() * devices.length)],
    status,
    timestamp: date.toISOString(),
  };
});

const MOCK_ADMINS: AdminUser[] = [
  { id: "adm-1", name: "Ashish Sharma", email: "ashish@adyapan.ai", role: "Super Admin", lastActive: new Date().toISOString(), permissions: ["all"] },
  { id: "adm-2", name: "Priya Patel", email: "priya@adyapan.ai", role: "Admin", lastActive: new Date(Date.now() - 1800000).toISOString(), permissions: ["users", "content"] },
  { id: "adm-3", name: "Rahul Verma", email: "rahul@adyapan.ai", role: "Admin", lastActive: new Date(Date.now() - 7200000).toISOString(), permissions: ["analytics", "reports"] },
  { id: "adm-4", name: "Ananya Singh", email: "ananya@adyapan.ai", role: "Moderator", lastActive: new Date(Date.now() - 14400000).toISOString(), permissions: ["content"] },
  { id: "adm-5", name: "Vikram Reddy", email: "vikram@adyapan.ai", role: "Moderator", lastActive: new Date(Date.now() - 28800000).toISOString(), permissions: ["users"] },
];

const MOCK_ALERTS: SecurityAlert[] = [
  {
    id: "alert-1",
    title: "Brute Force Attempt Detected",
    description: "25 failed login attempts from IP 192.168.1.45 within 5 minutes",
    severity: "critical",
    source: "Auth Service",
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    acknowledged: false,
  },
  {
    id: "alert-2",
    title: "Unusual Admin Login Location",
    description: "Admin account accessed from an unrecognized IP in a different geographic region",
    severity: "warning",
    source: "GeoIP Filter",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    acknowledged: false,
  },
  {
    id: "alert-3",
    title: "API Key Rotation Required",
    description: "3 API keys have exceeded 90-day age threshold and require rotation",
    severity: "warning",
    source: "Key Manager",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    acknowledged: true,
  },
  {
    id: "alert-4",
    title: "Rate Limit Threshold Crossed",
    description: "User management API endpoint reached 85% of rate limit capacity",
    severity: "info",
    source: "Rate Limiter",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    acknowledged: true,
  },
  {
    id: "alert-5",
    title: "SSL Certificate Expiring",
    description: "Wildcard SSL certificate for *.adyapan.ai will expire in 14 days",
    severity: "warning",
    source: "Certificate Monitor",
    timestamp: new Date(Date.now() - 21600000).toISOString(),
    acknowledged: false,
  },
  {
    id: "alert-6",
    title: "Suspicious File Upload Blocked",
    description: "Attempted upload of potentially malicious file type in user submissions",
    severity: "critical",
    source: "WAF",
    timestamp: new Date(Date.now() - 28800000).toISOString(),
    acknowledged: false,
  },
];

const MOCK_RATE_LIMITS: RateLimit[] = [
  { endpoint: "/api/auth/login", limit: 100, used: 67, remaining: 33, resetIn: "12 min" },
  { endpoint: "/api/users", limit: 500, used: 423, remaining: 77, resetIn: "8 min" },
  { endpoint: "/api/admin/*", limit: 200, used: 112, remaining: 88, resetIn: "15 min" },
  { endpoint: "/api/ai/*", limit: 300, used: 298, remaining: 2, resetIn: "3 min" },
  { endpoint: "/api/payments", limit: 150, used: 89, remaining: 61, resetIn: "22 min" },
];

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
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function SecurityCenter() {
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

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

  const handleAcknowledge = (alertId: string) => {
    setAcknowledgedAlerts((prev) => new Set(prev).add(alertId));
  };

  const statusStyle = security ? STATUS_CONFIG[security.status] : STATUS_CONFIG.secure;
  const unacknowledgedAlerts = MOCK_ALERTS.filter(
    (a) => !acknowledgedAlerts.has(a.id) && !a.acknowledged
  );

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

      {/* Security Status Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <MetricCard
          label="Total Admins"
          value={security?.totalAdmins ?? MOCK_ADMINS.length}
          color="#818cf8"
          icon={<Users size={16} />}
          subtitle="Registered administrators"
        />
        <MetricCard
          label="Active Sessions"
          value={security?.activeSessions ?? 12}
          color="#10b981"
          icon={<Activity size={16} />}
          subtitle="Currently active"
        />
        <MetricCard
          label="Failed Logins"
          value={security?.failedLogins ?? 47}
          color="#ef4444"
          icon={<LogIn size={16} />}
          subtitle="Last 24 hours"
        />
        <MetricCard
          label="Blocked IPs"
          value={security?.blockedIps ?? 23}
          color="#f59e0b"
          icon={<Ban size={16} />}
          subtitle="Permanently blocked"
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
              {MOCK_LOGINS.length} attempts
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["User", "IP Address", "Location", "Device", "Status", "Timestamp"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_LOGINS.map((attempt, idx) => (
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
                        <div className="text-xs font-bold truncate max-w-[140px]" style={{ color: "var(--text-primary)" }}>
                          {attempt.user}
                        </div>
                        <div className="text-[10px] font-medium truncate max-w-[140px]" style={{ color: "var(--text-muted)" }}>
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
                        <Globe size={11} style={{ color: "var(--text-muted)" }} />
                        <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                          {attempt.location}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {attempt.device.includes("Android") || attempt.device.includes("iOS")
                          ? <Smartphone size={11} style={{ color: "var(--text-muted)" }} />
                          : <Monitor size={11} style={{ color: "var(--text-muted)" }} />
                        }
                        <span className="text-[11px] font-medium truncate max-w-[140px]" style={{ color: "var(--text-secondary)" }}>
                          {attempt.browser}
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
                ))}
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
              {MOCK_ADMINS.length} users
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {MOCK_ADMINS.map((admin, idx) => (
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
                      variant={admin.role === "Super Admin" ? "warning" : admin.role === "Admin" ? "info" : "default"}
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
                    ) : (
                      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {admin.permissions.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Security Alerts + Rate Limit Status */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Security Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="lg:col-span-3 rounded-2xl border overflow-hidden"
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
            {MOCK_ALERTS.map((alert, idx) => {
              const sev = SEVERITY_CONFIG[alert.severity];
              const isAcknowledged = acknowledgedAlerts.has(alert.id) || alert.acknowledged;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.25 }}
                  className="px-5 py-4 transition-all hover:bg-white/[0.02]"
                  style={{
                    borderColor: "var(--border-color)",
                    opacity: isAcknowledged ? 0.6 : 1,
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
                        {!isAcknowledged && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAcknowledge(alert.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              color: "var(--text-secondary)",
                              border: "1px solid var(--border-color)",
                            }}
                          >
                            <CheckCircle size={11} />
                            Acknowledge
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

        {/* Rate Limit Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="lg:col-span-2 rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Gauge size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Rate Limit Status
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {MOCK_RATE_LIMITS.map((rl, idx) => {
              const usagePct = Math.round((rl.used / rl.limit) * 100);
              const barColor = usagePct >= 90 ? "#ef4444" : usagePct >= 70 ? "#f59e0b" : "#10b981";
              return (
                <motion.div
                  key={rl.endpoint}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.25 }}
                  className="px-5 py-3.5"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold truncate max-w-[160px]" style={{ color: "var(--text-primary)" }}>
                      {rl.endpoint}
                    </span>
                    <StatusBadge variant={usagePct >= 90 ? "error" : usagePct >= 70 ? "warning" : "success"}>
                      {usagePct}%
                    </StatusBadge>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${usagePct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: barColor }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                    <span>{rl.used}/{rl.limit} requests</span>
                    <span className="flex items-center gap-1">
                      <Clock size={9} />
                      resets in {rl.resetIn}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
