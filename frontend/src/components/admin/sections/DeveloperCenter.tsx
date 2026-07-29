"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Key, Webhook, Gauge, Variable, Code,
  Copy, Check, Eye, EyeOff, Clock, Activity,
  Globe, Terminal, BookOpen, Box,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  masked: string;
  created: string;
  lastUsed: string;
}

interface WebhookEndpoint {
  id: string;
  url: string;
  status: "Active" | "Paused" | "Failed";
  lastTriggered: string;
  eventsCount: number;
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
  masked: boolean;
}

const MOCK_API_KEYS: ApiKey[] = [
  { id: "key-1", name: "Production API Key", key: "sk_ady_prod_a4f8c2b1e9d7f3a6b8c0d2e4f6a8b0c1", masked: "sk_ady_prod_****...b0c1", created: "2026-01-15", lastUsed: "2 min ago" },
  { id: "key-2", name: "Staging API Key", key: "sk_ady_stag_b3e5f7g9h1i3k5m7n9p1r3t5v7x9z1", masked: "sk_ady_stag_****...9z1", created: "2026-03-22", lastUsed: "1 hour ago" },
  { id: "key-3", name: "Development API Key", key: "sk_ady_dev_c4d6e8f0g2h4i6k8m0n2p4r6t8v0z2", masked: "sk_ady_dev_****...v0z2", created: "2026-06-10", lastUsed: "5 min ago" },
];

const MOCK_WEBHOOKS: WebhookEndpoint[] = [
  { id: "wh-1", url: "https://api.adyapan.ai/webhooks/payments", status: "Active", lastTriggered: "3 min ago", eventsCount: 1247 },
  { id: "wh-2", url: "https://api.adyapan.ai/webhooks/users", status: "Active", lastTriggered: "1 min ago", eventsCount: 8932 },
  { id: "wh-3", url: "https://hooks.slack.com/services/T.../B.../xxx", status: "Paused", lastTriggered: "2 days ago", eventsCount: 456 },
  { id: "wh-4", url: "https://api.adyapan.ai/webhooks/analytics", status: "Failed", lastTriggered: "Failed", eventsCount: 89 },
];

const MOCK_ENV_VARS: EnvVar[] = [
  { id: "env-1", key: "DATABASE_URL", value: "postgresql://admin:****@db.adyapan.ai:5432/adyapan_prod", masked: true },
  { id: "env-2", key: "REDIS_URL", value: "redis://:****@redis.adyapan.ai:6379", masked: true },
  { id: "env-3", key: "STRIPE_SECRET_KEY", value: "sk_live_****", masked: true },
  { id: "env-4", key: "OPENAI_API_KEY", value: "sk-****", masked: true },
  { id: "env-5", key: "CLOUDINARY_URL", value: "cloudinary://****", masked: true },
  { id: "env-6", key: "NEXT_PUBLIC_APP_URL", value: "https://adyapan.ai", masked: false },
];

const SDK_LIST = [
  { name: "REST API", icon: <Globe size={16} />, lang: "HTTP", desc: "Full platform API" },
  { name: "Python SDK", icon: <Terminal size={16} />, lang: "Python 3.9+", desc: "pip install adyapan" },
  { name: "JavaScript SDK", icon: <Code size={16} />, lang: "Node 18+", desc: "npm install @adyapan/sdk" },
  { name: "React SDK", icon: <Box size={16} />, lang: "React 18+", desc: "npm install @adyapan/react" },
];

function statusWebhookVariant(s: WebhookEndpoint["status"]) {
  switch (s) {
    case "Active": return "success" as const;
    case "Paused": return "warning" as const;
    case "Failed": return "error" as const;
  }
}

export default function DeveloperCenter() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleEnv, setVisibleEnv] = useState<string | null>(null);

  const copyKey = async (apiKey: ApiKey) => {
    try {
      await navigator.clipboard.writeText(apiKey.key);
      setCopiedId(apiKey.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  };

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Developer Center"
        description="API keys, webhooks, rate limits, environment configuration, and SDKs"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Keys */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.3 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Key size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>API Keys</h2>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              {MOCK_API_KEYS.length} keys
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {MOCK_API_KEYS.map((apiKey, idx) => (
              <motion.div
                key={apiKey.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
                className="px-5 py-3.5 space-y-2"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{apiKey.name}</span>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => copyKey(apiKey)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                    style={{
                      background: copiedId === apiKey.id ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
                      color: copiedId === apiKey.id ? "#10b981" : "var(--text-secondary)",
                      border: "1px solid",
                      borderColor: copiedId === apiKey.id ? "rgba(16,185,129,0.3)" : "var(--border-color)",
                    }}
                  >
                    {copiedId === apiKey.id ? <Check size={11} /> : <Copy size={11} />}
                    {copiedId === apiKey.id ? "Copied!" : "Copy"}
                  </motion.button>
                </div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-[11px]"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)" }}
                >
                  <span style={{ color: "var(--text-muted)" }}>{apiKey.masked}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                  <span>Created: {apiKey.created}</span>
                  <span className="flex items-center gap-1"><Clock size={9} />{apiKey.lastUsed}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Webhooks */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Webhook size={16} style={{ color: "#818cf8" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Webhooks</h2>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              {MOCK_WEBHOOKS.filter((w) => w.status === "Active").length} active
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {MOCK_WEBHOOKS.map((wh, idx) => (
              <motion.div
                key={wh.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
                className="px-5 py-3.5 space-y-1.5"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold truncate max-w-[220px]" style={{ color: "var(--text-primary)" }}>
                    {wh.url}
                  </span>
                  <StatusBadge variant={statusWebhookVariant(wh.status)} pulse={wh.status === "Active"}>
                    {wh.status}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1"><Activity size={9} />{wh.eventsCount} events</span>
                  <span className="flex items-center gap-1"><Clock size={9} />{wh.lastTriggered}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rate Limits */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={16} style={{ color: "#10b981" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Rate Limits</h2>
          </div>
          <div className="space-y-4">
            {[
              { endpoint: "/api/*", limit: 5000, used: 3421 },
              { endpoint: "/api/ai/*", limit: 1000, used: 876 },
              { endpoint: "/api/admin/*", limit: 500, used: 234 },
              { endpoint: "/api/auth/*", limit: 200, used: 45 },
            ].map((rl, idx) => {
              const pct = Math.round((rl.used / rl.limit) * 100);
              const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#10b981";
              return (
                <div key={rl.endpoint}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>{rl.endpoint}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color }}>{rl.used}/{rl.limit} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Environment Variables */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Variable size={16} style={{ color: "#f472b6" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Environment Variables</h2>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              {MOCK_ENV_VARS.length} vars
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {MOCK_ENV_VARS.map((envVar, idx) => (
              <motion.div
                key={envVar.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderColor: "var(--border-color)" }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>{envVar.key}</span>
                  <span className="text-[11px] font-mono ml-2" style={{ color: "var(--text-muted)" }}>
                    = {visibleEnv === envVar.id || !envVar.masked ? envVar.value : "****"}
                  </span>
                </div>
                {envVar.masked && (
                  <button
                    onClick={() => setVisibleEnv(visibleEnv === envVar.id ? null : envVar.id)}
                    className="p-1 rounded-lg transition-all hover:bg-white/[0.05]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {visibleEnv === envVar.id ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
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
