"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Server, Cpu, Database, Activity, HardDrive,
  Loader2, RefreshCw, Clock, Box, Gauge,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { api } from "@/services/api";

interface HealthData {
  status: string;
  uptime: number;
  memory: { used: number; total: number; rss: number };
  cpu: { user: number; system: number };
  platform: string;
  nodeVersion: string;
  timestamp: string;
}

interface AggregatedData {
  totalUsers: number;
  totalDatabases: number;
  activeDatabases: number;
}

interface PerfStats {
  avgApiResponseTime: number;
  avgDatabaseQueryTime: number;
  avgAiGenerationTime: number;
  avgUploadTime: number;
  errorRate: number;
  totalRequests: number;
  totalErrors: number;
  recentMetrics: { timestamp: string; type: string; name: string; durationMs: number }[];
}

function getUptimeLabel(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getMemPct(used: number, total: number): number {
  return total > 0 ? Math.round((used / total) * 100) : 0;
}

function barColor(v: number): string {
  if (v < 50) return "#10b981";
  if (v < 75) return "#f59e0b";
  return "#ef4444";
}

const TYPE_COLORS: Record<string, string> = {
  api: "#38bdf8",
  db: "#10b981",
  ai: "#8b5cf6",
  upload: "#f59e0b",
  error: "#ef4444",
};

function fmtMs(ms: number): string {
  return ms > 0 ? `${ms.toFixed(0)} ms` : "—";
}

export default function Infrastructure() {
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [db, setDb] = useState<AggregatedData | null>(null);
  const [perf, setPerf] = useState<PerfStats | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, dbRes, perfRes] = await Promise.all([
        api.get("/admin/system-health"),
        api.get("/admin/databases/aggregated"),
        api.get("/admin/performance"),
      ]);
      if (healthRes.data?.success) setHealth(healthRes.data.health);
      if (dbRes.data && typeof dbRes.data.totalDatabases === "number") setDb(dbRes.data);
      if (perfRes.data?.success) setPerf(perfRes.data.stats);
    } catch {
      // handled by empty states below
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Infrastructure
          </span>
        </div>
      </div>
    );
  }

  const healthy = health?.status === "healthy";
  const memPct = getMemPct(health?.memory.used ?? 0, health?.memory.total ?? 0);
  const cpuMs = health ? (health.cpu.user + health.cpu.system) / 1000 : 0;

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Infrastructure"
        description="Live process, database, and API performance metrics"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant={healthy ? "success" : "warning"} pulse>{healthy ? "Healthy" : health?.status ?? "Unknown"}</StatusBadge>
            <StatusBadge variant="info">Node {health?.nodeVersion ?? "—"}</StatusBadge>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
              style={{
                background: "rgba(245,158,11,0.1)",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <RefreshCw size={12} />
              Refresh
            </motion.button>
          </div>
        }
      />

      {/* Process + Database cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Node Process */}
        <InfraCard
          title="Node.js Process"
          icon={<Server size={16} />}
          color="#f59e0b"
          status={healthy ? "success" : "warning"}
          statusLabel={healthy ? "Healthy" : "Degraded"}
          metrics={[
            { label: "Version", value: health?.nodeVersion ?? "—" },
            { label: "Platform", value: health?.platform ?? "—" },
            { label: "Uptime", value: health ? getUptimeLabel(health.uptime) : "—" },
          ]}
        />

        {/* Memory */}
        <InfraCard
          title="Memory (Heap)"
          icon={<HardDrive size={16} />}
          color="#10b981"
          status={memPct > 85 ? "error" : "success"}
          statusLabel={memPct > 85 ? "High" : "Healthy"}
          metrics={[
            { label: "Used", value: health ? `${health.memory.used} MB` : "—" },
            { label: "Total", value: health ? `${health.memory.total} MB` : "—" },
            { label: "RSS", value: health ? `${health.memory.rss} MB` : "—" },
          ]}
          bar={{ label: "Heap Usage", value: memPct }}
        />

        {/* CPU */}
        <InfraCard
          title="CPU Usage"
          icon={<Cpu size={16} />}
          color="#818cf8"
          status="success"
          statusLabel="Running"
          metrics={[
            { label: "User time", value: health ? `${(health.cpu.user / 1000).toFixed(0)} ms` : "—" },
            { label: "System time", value: health ? `${(health.cpu.system / 1000).toFixed(0)} ms` : "—" },
            { label: "Total", value: `${cpuMs.toFixed(0)} ms` },
          ]}
        />

        {/* Databases */}
        <InfraCard
          title="User Databases"
          icon={<Database size={16} />}
          color="#38bdf8"
          status="success"
          statusLabel="Operational"
          metrics={[
            { label: "Total", value: String(db?.totalDatabases ?? 0) },
            { label: "Active", value: String(db?.activeDatabases ?? 0) },
            { label: "Users", value: String(db?.totalUsers ?? 0) },
          ]}
        />
      </div>

      {/* API Performance */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} style={{ color: "#10b981" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            API Performance (last 24h)
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge variant={perf && perf.errorRate > 5 ? "error" : perf && perf.errorRate > 0 ? "warning" : "success"}>
              Error Rate {perf ? `${perf.errorRate}%` : "—"}
            </StatusBadge>
            <StatusBadge variant="info">{perf?.totalRequests ?? 0} Requests</StatusBadge>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <PerfBox label="API Response" value={fmtMs(perf?.avgApiResponseTime ?? 0)} color="#38bdf8" />
          <PerfBox label="DB Query" value={fmtMs(perf?.avgDatabaseQueryTime ?? 0)} color="#10b981" />
          <PerfBox label="AI Generation" value={fmtMs(perf?.avgAiGenerationTime ?? 0)} color="#8b5cf6" />
          <PerfBox label="Uploads" value={fmtMs(perf?.avgUploadTime ?? 0)} color="#f59e0b" />
        </div>
      </motion.div>

      {/* Recent Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Box size={16} style={{ color: "#8b5cf6" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Recent Operations
          </h2>
          <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Last {perf?.recentMetrics.length ?? 0} events
          </span>
        </div>
        {!perf || perf.recentMetrics.length === 0 ? (
          <p className="text-[11px] font-medium text-center py-8" style={{ color: "var(--text-muted)" }}>
            No operations recorded yet. Metrics appear as users interact with the platform.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {perf.recentMetrics.slice().reverse().map((m, i) => {
              const color = TYPE_COLORS[m.type] ?? "var(--text-secondary)";
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[11px] font-bold uppercase w-16 shrink-0" style={{ color }}>
                    {m.type}
                  </span>
                  <span className="text-[11px] font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
                    {m.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {m.durationMs.toFixed(0)} ms
                  </span>
                  <span className="text-[9px] font-medium shrink-0 hidden sm:block" style={{ color: "var(--text-muted)" }}>
                    <Clock size={10} className="inline mr-1" />
                    {new Date(m.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function InfraCard({
  title, icon, color, status, statusLabel, metrics, bar,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  status: "success" | "warning" | "error";
  statusLabel: string;
  metrics: { label: string; value: string }[];
  bar?: { label: string; value: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{title}</p>
        </div>
        <StatusBadge variant={status} pulse={status === "success"}>{statusLabel}</StatusBadge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)" }}>
            <div className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>{m.label}</div>
            <div className="text-[11px] font-bold font-mono" style={{ color: "var(--text-primary)" }}>{m.value}</div>
          </div>
        ))}
      </div>
      {bar && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{bar.label}</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: barColor(bar.value) }}>{bar.value}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${bar.value}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: barColor(bar.value) }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function PerfBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-3.5" style={{ background: `${color}0d`, borderColor: `${color}30` }}>
      <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
        <Gauge size={10} className="inline mr-1" style={{ color }} />
        {label}
      </div>
      <div className="text-lg font-black font-mono tracking-tight" style={{ color }}>{value}</div>
    </div>
  );
}
