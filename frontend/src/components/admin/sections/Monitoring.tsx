"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, Server, HardDrive, Cpu, Zap, Clock,
  RefreshCw, Database, Brain,
  Loader2, Timer, BarChart3, Layers, HeartPulse, Gauge,
} from "lucide-react";
import { api } from "@/services/api";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { MetricCard } from "@/components/admin/shared/MetricCard";

interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  uptime: number;
  platform: string;
  nodeVersion: string;
  memory: { used: number; total: number };
  cpu: { used: number };
  rss: { used: number; total: number };
  timestamp: string;
}

interface DatabaseMetrics {
  totalUsers: number;
  totalDatabases: number;
  activeDatabases: number;
}

interface ApiMetrics {
  avgApiResponseTime: number;
  avgDatabaseQueryTime: number;
  avgAiGenerationTime: number;
  errorRate: number;
  totalRequests: number;
}

interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
}

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  "API Server": <Server size={14} />,
  Database: <Database size={14} />,
  "AI Workers": <Brain size={14} />,
};

function getUptimeLabel(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getGaugeColor(value: number): string {
  if (value < 60) return "#10b981";
  if (value <= 80) return "#f59e0b";
  return "#ef4444";
}

function getStatusVariant(status: string): "success" | "warning" | "error" {
  if (status === "healthy") return "success";
  if (status === "degraded") return "warning";
  return "error";
}

export default function Monitoring() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics>({ totalUsers: 0, totalDatabases: 0, activeDatabases: 0 });
  const [apiMetrics, setApiMetrics] = useState<ApiMetrics>({
    avgApiResponseTime: 0,
    avgDatabaseQueryTime: 0,
    avgAiGenerationTime: 0,
    errorRate: 0,
    totalRequests: 0,
  });
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [healthRes, dbRes, perfRes] = await Promise.all([
        api.get("/admin/system-health"),
        api.get("/admin/databases/aggregated").catch(() => null),
        api.get("/admin/performance").catch(() => null),
      ]);

      if (healthRes.data?.success) setHealth(healthRes.data.health);

      if (dbRes?.data && typeof dbRes.data.totalDatabases === "number") {
        setDbMetrics(dbRes.data);
      }

      const stats: ApiMetrics = perfRes?.data?.success && perfRes.data.stats
        ? {
            avgApiResponseTime: perfRes.data.stats.avgApiResponseTime ?? 0,
            avgDatabaseQueryTime: perfRes.data.stats.avgDatabaseQueryTime ?? 0,
            avgAiGenerationTime: perfRes.data.stats.avgAiGenerationTime ?? 0,
            errorRate: perfRes.data.stats.errorRate ?? 0,
            totalRequests: perfRes.data.stats.totalRequests ?? 0,
          }
        : { avgApiResponseTime: 0, avgDatabaseQueryTime: 0, avgAiGenerationTime: 0, errorRate: 0, totalRequests: 0 };
      setApiMetrics(stats);

      const derived: ServiceHealth[] = [
        {
          name: "API Server",
          status: healthRes.data?.success ? healthRes.data.health?.status ?? "down" : "down",
          responseTime: stats.avgApiResponseTime,
        },
        {
          name: "Database",
          status: dbRes?.data && typeof dbRes.data.totalDatabases === "number" ? "healthy" : "down",
          responseTime: stats.avgDatabaseQueryTime,
        },
      ];
      if (stats.avgAiGenerationTime > 0) {
        derived.push({ name: "AI Workers", status: "healthy", responseTime: stats.avgAiGenerationTime });
      }
      setServices(derived);

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[Monitoring] fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const memUsedPct = health
    ? Math.round((health.memory.used / health.memory.total) * 100)
    : 0;

  const cpuPct = health?.cpu?.used ?? memUsedPct;

  const rssPct = health?.rss?.used && health?.rss?.total
    ? Math.round((health.rss.used / health.rss.total) * 100)
    : memUsedPct;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Monitoring Dashboard
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Monitoring & Observability"
        description="Real-time system metrics, performance, and health monitoring"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              <Clock size={12} />
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
              style={{
                background: "rgba(245,158,11,0.1)",
                borderColor: "rgba(245,158,11,0.25)",
                color: "#f59e0b",
              }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        }
      />

      {/* System Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <HeartPulse size={16} style={{ color: "#10b981" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            System Health
          </h2>
          {health && (
            <StatusBadge variant={getStatusVariant(health.status)} pulse={health.status === "healthy"}>
              {health.status}
            </StatusBadge>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              <Clock size={12} className="inline mr-1" />Uptime
            </div>
            <div className="text-sm font-black font-mono" style={{ color: "#10b981" }}>
              {health ? getUptimeLabel(health.uptime) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              <Server size={12} className="inline mr-1" />Platform
            </div>
            <div className="text-sm font-black font-mono" style={{ color: "var(--text-secondary)" }}>
              {health?.platform ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              <Cpu size={12} className="inline mr-1" />Node Version
            </div>
            <div className="text-sm font-black font-mono" style={{ color: "var(--text-secondary)" }}>
              {health?.nodeVersion ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              <Timer size={12} className="inline mr-1" />Timestamp
            </div>
            <div className="text-sm font-black font-mono" style={{ color: "var(--text-secondary)" }}>
              {health ? new Date(health.timestamp).toLocaleString() : "—"}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Resource Usage Gauges + API Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resource Usage Gauges */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Resource Usage
            </h2>
          </div>
          <div className="space-y-5">
            <GaugeBar label="RAM" value={memUsedPct} used={health?.memory.used} total={health?.memory.total} />
            <GaugeBar label="CPU" value={cpuPct} />
            <GaugeBar label="RSS" value={rssPct} used={health?.rss?.used} total={health?.rss?.total} />
          </div>
        </motion.div>

        {/* API Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: "#818cf8" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              API Performance
            </h2>
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <MetricCard
              label="Avg Response"
              value={apiMetrics.avgApiResponseTime > 0 ? `${apiMetrics.avgApiResponseTime}ms` : "—"}
              color="#10b981"
              icon={<Zap size={14} />}
            />
            <MetricCard
              label="Avg DB Query"
              value={apiMetrics.avgDatabaseQueryTime > 0 ? `${apiMetrics.avgDatabaseQueryTime}ms` : "—"}
              color="#f59e0b"
              icon={<Timer size={14} />}
            />
            <MetricCard
              label="Avg AI Gen"
              value={apiMetrics.avgAiGenerationTime > 0 ? `${apiMetrics.avgAiGenerationTime}ms` : "—"}
              color="#818cf8"
              icon={<Brain size={14} />}
            />
            <MetricCard
              label="Error Rate"
              value={`${apiMetrics.errorRate}%`}
              color={apiMetrics.errorRate > 2 ? "#ef4444" : "#10b981"}
              icon={<Activity size={14} />}
              subtitle={`${apiMetrics.totalRequests} reqs / 24h`}
            />
          </div>
        </motion.div>
      </div>

      {/* Database Status + Service Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} style={{ color: "#38bdf8" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Database Status
            </h2>
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <MetricCard
              label="Total Users"
              value={dbMetrics.totalUsers.toLocaleString()}
              color="#38bdf8"
              icon={<Database size={14} />}
            />
            <MetricCard
              label="Total User DBs"
              value={dbMetrics.totalDatabases.toLocaleString()}
              color="#818cf8"
              icon={<Layers size={14} />}
            />
            <MetricCard
              label="Active DBs"
              value={dbMetrics.activeDatabases.toLocaleString()}
              color="#10b981"
              icon={<HeartPulse size={14} />}
            />
            <MetricCard
              label="Master DB"
              value={dbMetrics.totalDatabases > 0 ? "Connected" : "—"}
              color="#10b981"
              icon={<Zap size={14} />}
              subtitle="Platform database"
            />
          </div>
        </motion.div>

        {/* Service Health Grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} style={{ color: "#f472b6" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Service Health
            </h2>
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {services.map((svc) => {
              const variant = getStatusVariant(svc.status);
              return (
                <div
                  key={svc.name}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all hover:scale-[1.03] cursor-default"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  <span style={{ color: variant === "success" ? "#10b981" : variant === "warning" ? "#f59e0b" : "#ef4444" }}>
                    {SERVICE_ICONS[svc.name]}
                  </span>
                  <span className="text-[10px] font-bold text-center leading-tight" style={{ color: "var(--text-secondary)" }}>
                    {svc.name}
                  </span>
                  <StatusBadge variant={variant} pulse={variant === "success"}>
                    {svc.status}
                  </StatusBadge>
                  <span className="text-[9px] font-mono font-bold" style={{ color: "var(--text-muted)" }}>
                    {svc.responseTime}ms
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GaugeBar({ label, value, used, total }: { label: string; value: number; used?: number; total?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          <HardDrive size={12} className="inline mr-1" />{label}
        </span>
        <span className="text-[11px] font-mono font-bold" style={{ color: getGaugeColor(value) }}>
          {used !== undefined && total !== undefined
            ? `${formatBytes(used)} / ${formatBytes(total)}`
            : `${value}%`}
        </span>
      </div>
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(value, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: getGaugeColor(value) }}
        />
      </div>
    </div>
  );
}
