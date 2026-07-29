"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import {
  Brain, RefreshCw, Activity, Clock, CheckCircle2, XCircle, AlertTriangle,
  Loader2, DollarSign, Gauge, Terminal, Save, Wifi, WifiOff, Zap,
} from "lucide-react";

// ─── Seeded PRNG for stable randomized data ───────────────────────────────

function seededHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h % 100000) / 100000;
}

function randInt(seed: string, min: number, max: number): number {
  return Math.floor(seededHash(seed) * (max - min + 1)) + min;
}

function randFloat(seed: string, min: number, max: number): number {
  return +(seededHash(seed) * (max - min) + min).toFixed(1);
}

// ─── Formatters ───────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Sparkline Generator ──────────────────────────────────────────────────

function sparkline(seed: string): string {
  const pts = 8, w = 64, h = 24, step = w / (pts - 1);
  const vals = Array.from({ length: pts }, (_, i) => {
    const base = Math.sin(i * 0.9 + seededHash(seed) * 3) * 5 + 12;
    const noise = (seededHash(seed + "_n" + i) - 0.5) * 10;
    return Math.max(2, Math.min(22, base + noise));
  });
  return vals.map((v, i) => {
    const x = i * step;
    const y = h - v;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

// ─── Data Types ───────────────────────────────────────────────────────────

type ModelStatus = "Online" | "Degraded" | "Offline";
type AiRequestStatus = "success" | "error" | "pending";

interface AiAnalytics {
  totalRequests: number;
  modules: { resumeHub: number; learningHub: number; codingHub: number; interviewHub: number; chat: number };
}

interface AiSettings {
  defaultAiModel: string;
  freeTierTokenLimit: number;
  premiumTierTokenLimit: number;
  aiTemperature: number;
}

interface AiRequest {
  id: string;
  time: string;
  user: string;
  model: string;
  type: string;
  tokens: number;
  status: AiRequestStatus;
  duration: number;
}

// ─── Static Model Definitions ─────────────────────────────────────────────

const MODEL_DEFS = [
  { id: "gemini",  name: "Gemini 2.0 Flash",  provider: "Google",    version: "2.0.1", icon: <Brain size={15} /> },
  { id: "claude",  name: "Claude 3.5 Sonnet",  provider: "Anthropic", version: "3.5.0", icon: <Brain size={15} /> },
  { id: "gpt4",    name: "GPT-4 Turbo",        provider: "OpenAI",    version: "4.0.1", icon: <Brain size={15} /> },
  { id: "deepseek",name: "DeepSeek V2",        provider: "DeepSeek",  version: "2.1.0", icon: <Brain size={15} /> },
  { id: "kimi",    name: "Kimi K2",            provider: "Moonshot",  version: "2.0.0", icon: <Brain size={15} /> },
  { id: "llama",   name: "Llama 3.1 70B",      provider: "Meta",      version: "3.1.0", icon: <Brain size={15} /> },
  { id: "mistral", name: "Mistral Large 2",    provider: "Mistral",   version: "2.0.0", icon: <Brain size={15} /> },
  { id: "local",   name: "Local Model",         provider: "On-device", version: "1.0.0", icon: <Zap size={15} /> },
] as const;

const MODEL_IDS = MODEL_DEFS.map((m) => m.id);

function buildModel(id: string) {
  const def = MODEL_DEFS.find((m) => m.id === id)!;
  const s = `model_${id}`;
  const roll = seededHash(s);
  const status: ModelStatus = roll < 0.65 ? "Online" : roll < 0.88 ? "Degraded" : "Offline";
  return {
    ...def,
    status,
    latency: randInt(s + "_lat", 120, 2800),
    requests: randInt(s + "_req", 1200, 85000),
    errorRate: randFloat(s + "_err", 0.1, 4.8),
    sparklinePath: sparkline(s),
  };
}

// ─── Fake Request Generator ───────────────────────────────────────────────

function generateRequests(): AiRequest[] {
  const models = MODEL_DEFS.map((m) => m.name);
  const users = ["alice@adyapan.ai", "bob@adyapan.ai", "charlie@adyapan.ai", "diana@adyapan.ai", "eve@adyapan.ai"];
  const types = ["Chat", "Code Gen", "Summarize", "Analyze", "Translate", "Extract"];
  const reqs: AiRequest[] = [];
  const now = Date.now();
  for (let i = 0; i < 50; i++) {
    const offset = Math.random() * 259200000;
    const time = new Date(now - offset).toISOString();
    const tokens = Math.floor(Math.random() * 4000) + 100;
    const sr = Math.random();
    const status: AiRequestStatus = sr < 0.82 ? "success" : sr < 0.95 ? "error" : "pending";
    const duration = +(Math.random() * 4 + 0.3).toFixed(1);
    reqs.push({
      id: `req_${i}`,
      time,
      user: users[Math.floor(Math.random() * users.length)],
      model: models[Math.floor(Math.random() * models.length)],
      type: types[Math.floor(Math.random() * types.length)],
      tokens,
      status,
      duration,
    });
  }
  return reqs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

// ─── Status Helpers ───────────────────────────────────────────────────────

function statusProps(s: ModelStatus) {
  if (s === "Online")  return { variant: "success" as const,  color: "#10b981", icon: <Wifi size={10} /> };
  if (s === "Degraded") return { variant: "warning" as const, color: "#f59e0b", icon: <AlertTriangle size={10} /> };
  return { variant: "error" as const, color: "#ef4444", icon: <WifiOff size={10} /> };
}

function latencyProps(ms: number) {
  if (ms < 500) return { color: "#10b981" };
  if (ms < 1500) return { color: "#f59e0b" };
  return { color: "#ef4444" };
}

function errorProps(rate: number) {
  if (rate < 1) return { color: "#10b981" };
  if (rate < 3) return { color: "#f59e0b" };
  return { color: "#ef4444" };
}

function reqStatusProps(s: AiRequestStatus) {
  if (s === "success") return { variant: "success" as const, color: "#10b981", icon: <CheckCircle2 size={11} /> };
  if (s === "error")   return { variant: "error" as const,   color: "#ef4444", icon: <XCircle size={11} /> };
  return { variant: "warning" as const, color: "#f59e0b", icon: <Clock size={11} /> };
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function AIPlatform() {
  const theme = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<AiAnalytics | null>(null);
  const [settings, setSettings] = useState<AiSettings | null>(null);

  // Editable state
  const [selectedModel, setSelectedModel] = useState("gemini");
  const [freeLimit, setFreeLimit] = useState("");
  const [premiumLimit, setPremiumLimit] = useState("");

  // Stable generated data
  const models = useMemo(() => MODEL_IDS.map(buildModel), []);
  const requests = useMemo(generateRequests, []);

  // Costs derived from analytics
  const costs = useMemo(() => {
    const total = analytics?.totalRequests ?? 0;
    const cpr = 0.0025;
    const monthly = total * cpr;
    const daily = monthly / 30;
    const weekly = daily * 7;
    return {
      daily: +daily.toFixed(2),
      weekly: +weekly.toFixed(2),
      monthly: +monthly.toFixed(2),
    };
  }, [analytics]);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [analyticsRes, settingsRes] = await Promise.all([
        api.get<{ success: boolean; analytics: AiAnalytics }>("/admin/analytics/ai"),
        api.get<{ success: boolean; settings: AiSettings }>("/admin/settings"),
      ]);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.analytics);
      if (settingsRes.data.success) {
        const s = settingsRes.data.settings;
        setSettings(s);
        setSelectedModel(s.defaultAiModel);
        setFreeLimit(String(s.freeTierTokenLimit));
        setPremiumLimit(String(s.premiumTierTokenLimit));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load AI platform data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Save Settings ─────────────────────────────────────────────────────

  const saveSettings = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        defaultAiModel: selectedModel,
        freeTierTokenLimit: parseInt(freeLimit, 10) || 0,
        premiumTierTokenLimit: parseInt(premiumLimit, 10) || 0,
        aiTemperature: settings?.aiTemperature ?? 0.7,
      };
      const res = await api.put("/admin/settings", payload);
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }, [selectedModel, freeLimit, premiumLimit, settings]);

  // ── Loading State ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading AI Platform
          </span>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-12">

      {/* Error Banner */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl border"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
          <span className="text-xs font-medium" style={{ color: "#ef4444" }}>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto px-3 py-1 rounded-lg text-[10px] font-bold"
            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* ── Section 1: Header ─────────────────────────────────────────────── */}
      <SectionHeader
        title="AI Platform"
        description="Manage models, prompts, costs & usage"
        actions={
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => fetchData(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              color: "var(--text-secondary)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </motion.button>
        }
      />

      {/* ── Section 2: AI Models Overview ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            AI Models Overview
          </h2>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {models.filter((m) => m.status === "Online").length}/{models.length} Online
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3">
          {models.map((model, idx) => {
            const sp = statusProps(model.status);
            const lp = latencyProps(model.latency);
            const ep = errorProps(model.errorRate);
            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * idx, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                className="p-3.5 rounded-xl border transition-all"
                style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderColor: "var(--border-color)" }}
              >
                {/* Model Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ color: "#f59e0b" }}>{model.icon}</span>
                    <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      {model.name}
                    </span>
                  </div>
                  <StatusBadge variant={sp.variant} pulse={model.status === "Online"}>
                    {model.status}
                  </StatusBadge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2.5">
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Gauge size={9} style={{ color: "var(--text-muted)" }} />
                      <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>Latency</span>
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: lp.color }}>
                      {fmtDuration(model.latency)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Activity size={9} style={{ color: "var(--text-muted)" }} />
                      <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>Requests</span>
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: "var(--text-secondary)" }}>
                      {fmtNum(model.requests)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <AlertTriangle size={9} style={{ color: "var(--text-muted)" }} />
                      <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>Errors</span>
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: ep.color }}>
                      {model.errorRate}%
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <Terminal size={9} style={{ color: "var(--text-muted)" }} />
                      <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>Version</span>
                    </div>
                    <span className="text-xs font-bold font-mono" style={{ color: "var(--text-muted)" }}>
                      v{model.version}
                    </span>
                  </div>
                </div>

                {/* Sparkline */}
                <svg viewBox="0 0 64 24" className="w-full h-5" preserveAspectRatio="none">
                  <path
                    d={model.sparklinePath}
                    fill="none"
                    stroke={model.status === "Online" ? "#10b981" : model.status === "Degraded" ? "#f59e0b" : "#ef4444"}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Section 3: Default Model Selector ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wifi size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Default Platform LLM
            </h2>
          </div>
          <StatusBadge variant="info">
            {selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}
          </StatusBadge>
        </div>
        <p className="text-[10px] font-medium mb-3" style={{ color: "var(--text-muted)" }}>
          Select the default model used across all platform AI features
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-2">
          {MODEL_DEFS.map((m, idx) => {
            const isSelected = selectedModel === m.id;
            return (
              <motion.button
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 * idx, duration: 0.25 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setSelectedModel(m.id)}
                className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all"
                style={{
                  background: isSelected
                    ? `rgba(245,158,11,0.1)`
                    : isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                  borderColor: isSelected
                    ? "rgba(245,158,11,0.5)"
                    : "var(--border-color)",
                }}
              >
                {isSelected && (
                  <motion.div
                    layoutId="modelSelect"
                    className="absolute inset-0 rounded-xl"
                    style={{ border: "2px solid #f59e0b" }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span style={{ color: isSelected ? "#f59e0b" : "var(--text-secondary)" }}>
                  {m.icon}
                </span>
                <span
                  className="text-[10px] font-bold leading-tight"
                  style={{ color: isSelected ? "#f59e0b" : "var(--text-primary)" }}
                >
                  {m.name.split(" ")[0]}
                </span>
                <span className="text-[8px] font-medium" style={{ color: "var(--text-muted)" }}>
                  {m.provider}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Section 4 & 5: Token Limits + Cost Summary ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Token Limits */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity size={16} style={{ color: "#f59e0b" }} />
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Token Limits
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: "#f59e0b",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Save size={12} />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </motion.button>
          </div>
          <p className="text-[10px] font-medium mb-4" style={{ color: "var(--text-muted)" }}>
            Configure daily token limits for free and premium tiers
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Free Tier
              </label>
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all focus-within:border-amber-500/50"
                style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: "var(--border-color)" }}
              >
                <input
                  type="number"
                  value={freeLimit}
                  onChange={(e) => setFreeLimit(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold font-mono outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                <span className="text-[9px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>tokens</span>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Premium Tier
              </label>
              <div
                className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all focus-within:border-amber-500/50"
                style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", borderColor: "var(--border-color)" }}
              >
                <input
                  type="number"
                  value={premiumLimit}
                  onChange={(e) => setPremiumLimit(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold font-mono outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                <span className="text-[9px] font-bold uppercase" style={{ color: "var(--text-muted)" }}>tokens</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <Gauge size={14} style={{ color: "#f59e0b" }} />
            <div className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
              Temperature: <span className="font-bold font-mono" style={{ color: "#f59e0b" }}>{settings?.aiTemperature ?? 0.7}</span>
            </div>
          </div>
        </motion.div>

        {/* AI Cost Summary */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              AI Cost Summary
            </h2>
          </div>
          <p className="text-[10px] font-medium mb-4" style={{ color: "var(--text-muted)" }}>
            Estimated AI inference costs based on current request volume
          </p>

          <div className="grid grid-cols-3 gap-3">
            {/* Daily */}
            <div
              className="rounded-xl border p-3.5 text-center"
              style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Daily
              </div>
              <div className="text-lg font-black font-mono tracking-tight" style={{ color: "#f59e0b" }}>
                ${costs.daily.toFixed(2)}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                ~{fmtNum(Math.round((analytics?.totalRequests ?? 0) / 30))} req
              </div>
            </div>

            {/* Weekly */}
            <div
              className="rounded-xl border p-3.5 text-center"
              style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Weekly
              </div>
              <div className="text-lg font-black font-mono tracking-tight" style={{ color: "#f59e0b" }}>
                ${costs.weekly.toFixed(2)}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                ~{fmtNum(Math.round(((analytics?.totalRequests ?? 0) / 30) * 7))} req
              </div>
            </div>

            {/* Monthly */}
            <div
              className="rounded-xl border p-3.5 text-center"
              style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Monthly
              </div>
              <div className="text-lg font-black font-mono tracking-tight" style={{ color: "#10b981" }}>
                ${costs.monthly.toFixed(2)}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                {fmtNum(analytics?.totalRequests ?? 0)} total req
              </div>
            </div>
          </div>

          {/* Module breakdown */}
          {analytics?.modules && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-2.5" style={{ color: "var(--text-muted)" }}>
                Module Usage
              </div>
              <div className="space-y-1.5">
                {[
                  { key: "resumeHub",    label: "Resume",    color: "#f59e0b" },
                  { key: "learningHub",  label: "Learning",  color: "#10b981" },
                  { key: "codingHub",    label: "Coding",    color: "#818cf8" },
                  { key: "interviewHub", label: "Interview", color: "#f472b6" },
                  { key: "chat",         label: "Chat",      color: "#38bdf8" },
                ].map((mod) => {
                  const count = analytics.modules[mod.key as keyof typeof analytics.modules] ?? 0;
                  const pct = analytics.totalRequests > 0 ? ((count / analytics.totalRequests) * 100).toFixed(1) : "0";
                  return (
                    <div key={mod.key} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: mod.color }} />
                      <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{mod.label}</span>
                      <span className="ml-auto text-[10px] font-bold font-mono" style={{ color: mod.color }}>
                        {fmtNum(count)}
                      </span>
                      <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Section 6: AI Request Explorer ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="rounded-2xl border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 p-5 pb-0">
          <Terminal size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            AI Request Explorer
          </h2>
          <StatusBadge variant="default" pulse>
            {requests.length} requests
          </StatusBadge>
        </div>

        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  <th className="pb-3 pr-3 whitespace-nowrap">Time</th>
                  <th className="pb-3 pr-3 whitespace-nowrap">User</th>
                  <th className="pb-3 pr-3 whitespace-nowrap">Model</th>
                  <th className="pb-3 pr-3 whitespace-nowrap">Type</th>
                  <th className="pb-3 pr-3 whitespace-nowrap text-right">Tokens</th>
                  <th className="pb-3 pr-3 whitespace-nowrap text-center">Status</th>
                  <th className="pb-3 whitespace-nowrap text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {requests.slice(0, 20).map((req, idx) => {
                    const rsp = reqStatusProps(req.status);
                    return (
                      <motion.tr
                        key={req.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.015, duration: 0.2 }}
                        className="group text-xs"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                            {fmtTime(req.time)}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className="text-[11px] font-bold">{req.user.split("@")[0]}</span>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className="text-[11px]">{req.model}</span>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold"
                            style={{
                              background: "rgba(245,158,11,0.1)",
                              color: "#f59e0b",
                              border: "1px solid rgba(245,158,11,0.2)",
                            }}
                          >
                            {req.type}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-right font-mono font-bold text-[11px]">
                          {fmtNum(req.tokens)}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap text-center">
                          <span className="inline-flex items-center gap-1">
                            <span style={{ color: rsp.color }}>{rsp.icon}</span>
                            <span className="text-[10px] font-bold capitalize" style={{ color: rsp.color }}>
                              {req.status}
                            </span>
                          </span>
                        </td>
                        <td className="py-2.5 whitespace-nowrap text-right">
                          <span className="text-[11px] font-mono font-bold" style={{ color: req.duration > 3 ? "#ef4444" : req.duration > 1.5 ? "#f59e0b" : "#10b981" }}>
                            {req.duration.toFixed(1)}s
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between mt-3 pt-3 border-t text-[10px] font-medium"
            style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
          >
            <span>Showing 20 of {requests.length} requests</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Last 3 days
            </span>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
