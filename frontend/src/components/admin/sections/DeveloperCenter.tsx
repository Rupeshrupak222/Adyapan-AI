"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Key, Webhook, Gauge, Variable, BookOpen,
  Globe, Terminal, Code, Box, Inbox, RefreshCw,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { api } from "@/services/api";

interface PerformanceStats {
  avgApiResponseTime: number;
  avgDatabaseQueryTime: number;
  avgAiGenerationTime: number;
  avgUploadTime: number;
  errorRate: number;
  totalRequests: number;
  totalErrors: number;
}

interface PerformanceData {
  success: boolean;
  stats?: PerformanceStats;
}

const SDK_LIST = [
  { name: "REST API", icon: <Globe size={16} />, lang: "HTTP", desc: "HTTP JSON API" },
  { name: "Python SDK", icon: <Terminal size={16} />, lang: "Python 3.9+", desc: "pip install adyapan" },
  { name: "JavaScript SDK", icon: <Code size={16} />, lang: "Node 18+", desc: "npm install @adyapan/sdk" },
  { name: "React SDK", icon: <Box size={16} />, lang: "React 18+", desc: "npm install @adyapan/react" },
];

function EmptyCard({ title, icon, message }: { title: string; icon: React.ReactNode; message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
        <span style={{ color: "#f59e0b" }}>{icon}</span>
        <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <span className="ml-auto">
          <StatusBadge variant="default">Not Available</StatusBadge>
        </span>
      </div>
      <div className="px-5 py-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Inbox size={22} style={{ color: "rgba(255,255,255,0.18)" }} />
        </div>
        <p className="text-[11px] max-w-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{message}</p>
      </div>
    </motion.div>
  );
}

function MetricBar({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
      <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function DeveloperCenter() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get<PerformanceData>("/admin/performance");
      if (res.data?.success) {
        setStats(res.data.stats ?? null);
      }
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalRequests = stats?.totalRequests ?? 0;

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Developer Center"
        description="API usage, rate limits, and SDKs"
        actions={
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live API Usage */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={16} style={{ color: "#10b981" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Live API Usage</h2>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              {stats ? "live" : "offline"}
            </span>
          </div>
          {!stats ? (
            <p className="text-[11px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
              No API usage data available right now.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Requests</p>
                  <p className="text-lg font-black font-mono mt-1" style={{ color: "var(--text-primary)" }}>{totalRequests.toLocaleString()}</p>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Errors</p>
                  <p className="text-lg font-black font-mono mt-1" style={{ color: stats.totalErrors > 0 ? "#ef4444" : "var(--text-primary)" }}>{stats.totalErrors.toLocaleString()}</p>
                </div>
              </div>
              <MetricBar label="Avg API response" value={`${Math.round(stats.avgApiResponseTime)} ms`} />
              <MetricBar label="Avg AI generation" value={`${Math.round(stats.avgAiGenerationTime)} ms`} />
              <MetricBar label="Avg upload" value={`${Math.round(stats.avgUploadTime)} ms`} />
              <MetricBar label="Avg database query" value={`${Math.round(stats.avgDatabaseQueryTime)} ms`} />
              <MetricBar label="Error rate" value={`${stats.errorRate}%`} />
            </div>
          )}
        </motion.div>

        <EmptyCard
          title="API Keys"
          icon={<Key size={16} />}
          message="API key management is not implemented yet. No developer key endpoint exists on the backend, so no keys are shown here."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmptyCard
          title="Webhooks"
          icon={<Webhook size={16} style={{ color: "#818cf8" }} />}
          message="Webhook delivery management is not implemented yet. Once webhook endpoints exist, their status and event history will appear here."
        />

        <EmptyCard
          title="Environment Variables"
          icon={<Variable size={16} style={{ color: "#f472b6" }} />}
          message="Server environment variables are managed outside this dashboard and are intentionally not exposed through the admin UI."
        />
      </div>

      {/* SDKs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>SDKs & Libraries</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SDK_LIST.map((sdk, idx) => (
            <motion.div
              key={sdk.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + idx * 0.05, duration: 0.25 }}
              className="p-4 rounded-xl border text-center transition-all hover:scale-[1.03] cursor-pointer"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                {sdk.icon}
              </div>
              <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{sdk.name}</p>
              <p className="text-[9px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>{sdk.lang}</p>
              <p className="text-[8px] font-medium mt-0.5 font-mono" style={{ color: "var(--text-muted)" }}>{sdk.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
