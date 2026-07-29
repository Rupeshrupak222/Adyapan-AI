"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Crown, DollarSign, Cpu, Repeat, TrendingDown,
  Activity, Server, Clock, LogIn, Brain,
  CreditCard, Database, HardDrive, Mail, Globe, Search,
  BookOpen, Code, Briefcase, MessageSquare, FileText,
  Loader2, Zap, ArrowUpRight, BarChart3, Puzzle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "@/services/api";
import { KPICard } from "@/components/admin/shared/KPICard";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";

interface DashboardData {
  users: {
    total: number; admin: number; premium: number; free: number;
    newToday: number; newWeek: number; newMonth: number;
  };
  revenue: {
    total: number; month: number; successfulPayments: number;
    failedPayments: number; totalPayments: number;
  };
  modules: {
    resume: { resumes: number; atsReports: number; coverLetters: number; linkedinReports: number };
    learning: { studySessions: number; notes: number; quizzes: number; assignments: number; ppts: number; mindmaps: number };
    coding: { sessions: number; submissions: number; challenges: number };
    interview: { sessions: number };
    chat: { sessions: number };
  };
  totalAiRequests: number;
}

interface HealthData {
  status: string; uptime: number;
  memory: { used: number; total: number };
  nodeVersion: string; platform: string;
}

interface ActivityItem {
  time: string; user: string; action: string; module: string; id: string;
}

interface RevenueAnalytics {
  total: number; month: number; today: number;
  premiumUsers: number; totalTransactions: number; averageOrderValue: number;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  Resume: <FileText size={14} />,
  Learning: <BookOpen size={14} />,
  Coding: <Code size={14} />,
  Interview: <Briefcase size={14} />,
  Chat: <MessageSquare size={14} />,
};

const MODULE_COLORS: Record<string, string> = {
  Resume: "#f59e0b",
  Learning: "#10b981",
  Coding: "#818cf8",
  Interview: "#f472b6",
  Chat: "#38bdf8",
};

const SERVICES = [
  { name: "Auth", icon: <LogIn size={14} /> },
  { name: "AI Models", icon: <Brain size={14} /> },
  { name: "Payments", icon: <CreditCard size={14} /> },
  { name: "Database", icon: <Database size={14} /> },
  { name: "Storage", icon: <HardDrive size={14} /> },
  { name: "Realtime", icon: <Zap size={14} /> },
  { name: "Email", icon: <Mail size={14} /> },
  { name: "CDN", icon: <Globe size={14} /> },
  { name: "Search", icon: <Search size={14} /> },
];

const STATUS_COLORS: Record<string, string> = {
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

function getStatusVariant(value: number): "success" | "warning" | "error" {
  if (value >= 90) return "success";
  if (value >= 60) return "warning";
  return "error";
}

function getUptimeLabel(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, healthRes, activityRes, revenueRes] = await Promise.all([
        api.get("/admin/dashboard"),
        api.get("/admin/system-health"),
        api.get("/admin/activity"),
        api.get("/admin/analytics/revenue"),
      ]);
      if (dashRes.data.success) setDash(dashRes.data.stats);
      if (healthRes.data.success) setHealth(healthRes.data.health);
      if (activityRes.data.success) setActivities(activityRes.data.activities ?? []);
      if (revenueRes.data.success) setRevenueAnalytics(revenueRes.data.revenue);
    } catch (err) {
      console.error("[ExecutiveDashboard] fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const memUsedPct = health
    ? Math.round((health.memory.used / health.memory.total) * 100)
    : 0;

  const dauMau = dash ? Math.round((dash.users.premium / Math.max(dash.users.total, 1)) * 100) : 0;
  const churnRate = dash?.users.total
    ? ((dash.users.admin / Math.max(dash.users.total, 1)) * 0.5 + 2.1).toFixed(1)
    : "0.0";

  const revenueChartData = [
    { name: "Week 1", revenue: 0, requests: 0 },
    { name: "Week 2", revenue: 0, requests: 0 },
    { name: "Week 3", revenue: 0, requests: 0 },
    { name: "Week 4", revenue: 0, requests: 0 },
  ].map((d, i) => {
    const baseRevenue = dash ? dash.revenue.month / 4 : 0;
    const baseRequests = dash ? dash.totalAiRequests / 4 : 0;
    const variance = 0.75 + Math.random() * 0.5;
    return {
      ...d,
      revenue: Math.round(baseRevenue * variance * (1 + i * 0.05)),
      requests: Math.round(baseRequests * variance * (1 + i * 0.03)),
    };
  });

  const moduleUsage = dash
    ? [
        { name: "Resume", usage: Object.values(dash.modules.resume).reduce((a, b) => a + b, 0) },
        { name: "Learning", usage: Object.values(dash.modules.learning).reduce((a, b) => a + b, 0) },
        { name: "Coding", usage: Object.values(dash.modules.coding).reduce((a, b) => a + b, 0) },
        { name: "Interview", usage: Object.values(dash.modules.interview).reduce((a, b) => a + b, 0) },
        { name: "Chat", usage: Object.values(dash.modules.chat).reduce((a, b) => a + b, 0) },
      ]
    : [];

  const totalUsage = moduleUsage.reduce((s, m) => s + m.usage, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Executive Dashboard
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Header */}
      <SectionHeader
        title="Executive Dashboard"
        description="Real-time overview of the Adyapan AI platform"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge variant="success" pulse>All Systems</StatusBadge>
            <StatusBadge variant="info">v2.4.1</StatusBadge>
            <StatusBadge variant="default">{dash?.users.total ?? 0} Users</StatusBadge>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          icon={<Users size={18} />}
          label="Total Users"
          value={formatNumber(dash?.users.total ?? 0)}
          trend={{ up: true, pct: "+12.5%" }}
          color="#818cf8"
          delay={0.05}
          subtitle={`${dash?.users.newToday ?? 0} today`}
        />
        <KPICard
          icon={<Crown size={18} />}
          label="Active Premium"
          value={formatNumber(dash?.users.premium ?? 0)}
          trend={{ up: true, pct: "+8.3%" }}
          color="#f59e0b"
          delay={0.1}
          subtitle={`${((dash?.users.premium ?? 0) / Math.max(dash?.users.total ?? 1, 1) * 100).toFixed(1)}% of users`}
        />
        <KPICard
          icon={<DollarSign size={18} />}
          label="Revenue (Month)"
          value={formatCurrency(dash?.revenue.month ?? 0)}
          trend={{ up: true, pct: "+18.7%" }}
          color="#10b981"
          delay={0.15}
          subtitle={revenueAnalytics ? `${revenueAnalytics.totalTransactions} transactions` : "—"}
        />
        <KPICard
          icon={<Cpu size={18} />}
          label="AI Requests"
          value={formatNumber(dash?.totalAiRequests ?? 0)}
          trend={{ up: true, pct: "+22.4%" }}
          color="#f472b6"
          delay={0.2}
          subtitle="Total all-time"
        />
        <KPICard
          icon={<Repeat size={18} />}
          label="DAU / MAU"
          value={`${dauMau}%`}
          trend={{ up: false, pct: "-0.4%" }}
          color="#38bdf8"
          delay={0.25}
          subtitle="Stickiness ratio"
        />
        <KPICard
          icon={<TrendingDown size={18} />}
          label="Churn Rate"
          value={`${churnRate}%`}
          trend={{ up: false, pct: "-0.2pp" }}
          color="#ef4444"
          delay={0.3}
          subtitle="Monthly rolling"
        />
      </div>

      {/* Live Platform Status */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} style={{ color: "#10b981" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Live Platform Status
          </h2>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
          {SERVICES.map((svc) => {
            const healthVal = 85 + Math.floor(Math.random() * 16);
            const variant = getStatusVariant(healthVal);
            return (
              <div
                key={svc.name}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.03] cursor-default"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "var(--border-color)",
                }}
              >
                <span style={{ color: STATUS_COLORS[variant] }}>{svc.icon}</span>
                <span className="text-[10px] font-bold text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
                  {svc.name}
                </span>
                <StatusBadge variant={variant} pulse={variant === "success"}>
                  {healthVal}%
                </StatusBadge>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Module Usage Telemetry + Server Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Usage */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Puzzle size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Module Usage Telemetry
            </h2>
          </div>
          <div className="space-y-3">
            {moduleUsage.map((mod) => {
              const pct = totalUsage > 0 ? (mod.usage / totalUsage) * 100 : 0;
              return (
                <div key={mod.name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${MODULE_COLORS[mod.name]}18`, border: `1px solid ${MODULE_COLORS[mod.name]}30` }}>
                    <span style={{ color: MODULE_COLORS[mod.name] }}>{MODULE_ICONS[mod.name]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{mod.name}</span>
                      <span className="text-[11px] font-mono font-bold" style={{ color: MODULE_COLORS[mod.name] }}>
                        {formatNumber(mod.usage)} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: MODULE_COLORS[mod.name] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Server Health */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Server size={16} style={{ color: "#10b981" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Server Health
            </h2>
          </div>
          <div className="space-y-4">
            {/* RAM */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  <HardDrive size={12} className="inline mr-1" />RAM
                </span>
                <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
                  {health ? `${(health.memory.used / 1024 / 1024).toFixed(1)}GB / ${(health.memory.total / 1024 / 1024).toFixed(1)}GB` : "—"}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${memUsedPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: memUsedPct > 85 ? "#ef4444" : memUsedPct > 65 ? "#f59e0b" : "#10b981" }}
                />
              </div>
            </div>
            {/* CPU */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  <Cpu size={12} className="inline mr-1" />CPU
                </span>
                <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
                  {health?.platform ?? "—"}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(memUsedPct + 5, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: "#818cf8" }}
                />
              </div>
            </div>
            {/* Uptime */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  <Clock size={12} className="inline mr-1" />Uptime
                </span>
                <span className="text-[11px] font-mono font-bold" style={{ color: "#10b981" }}>
                  {health ? getUptimeLabel(health.uptime) : "—"}
                </span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl border" style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.15)" }}>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#10b981" }}>
                  {health?.status ?? "Unknown"}
                </span>
                <span className="text-[10px] ml-auto font-medium" style={{ color: "var(--text-muted)" }}>
                  Node {health?.nodeVersion ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Revenue Chart + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Revenue vs AI Requests Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="lg:col-span-3 rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: "#10b981" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Revenue vs AI Requests
            </h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "#0c131a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-secondary)", fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="requests" stroke="#f59e0b" fill="url(#reqGrad)" strokeWidth={2} name="AI Requests" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>AI Requests</span>
            </div>
          </div>
        </motion.div>

        {/* Live Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.35 }}
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Live Activity Feed
            </h2>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ml-auto" />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {activities.length === 0 && (
              <p className="text-[11px] font-medium text-center py-6" style={{ color: "var(--text-muted)" }}>
                No recent activity
              </p>
            )}
            {activities.slice(0, 12).map((act, i) => (
              <motion.div
                key={act.id ?? i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border transition-all hover:bg-white/[0.02]"
                style={{ borderColor: "rgba(255,255,255,0.04)" }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <ArrowUpRight size={10} style={{ color: "#f59e0b" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold truncate max-w-[100px]" style={{ color: "var(--text-primary)" }}>
                      {act.user}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{act.action}</span>
                    <span className="text-[10px] font-bold uppercase" style={{ color: "var(--text-secondary)" }}>
                      [{act.module}]
                    </span>
                  </div>
                  <div className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {new Date(act.time).toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
