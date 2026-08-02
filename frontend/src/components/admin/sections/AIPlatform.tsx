"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { toast } from "sonner";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import {
  Brain, RefreshCw, Activity, AlertTriangle,
  Loader2, Gauge, Save, Wifi, Zap,
} from "lucide-react";

// ─── Formatters ───────────────────────────────────────────────────────────

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Data Types ───────────────────────────────────────────────────────────

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

// ─── Configured Model Definitions ─────────────────────────────────────────

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

  // Request volume projected from real usage
  const volume = {
    daily: Math.round((analytics?.totalRequests ?? 0) / 30),
    weekly: Math.round(((analytics?.totalRequests ?? 0) / 30) * 7),
    monthly: analytics?.totalRequests ?? 0,
  };

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
        toast.success(`AI Platform settings updated! Default model: ${selectedModel.toUpperCase()}, Free limit: ${payload.freeTierTokenLimit.toLocaleString()} tokens`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save settings");
      toast.error("Failed to save AI Platform settings.");
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
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {MODEL_DEFS.length} configured
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MODEL_DEFS.map((model, idx) => (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.02 * idx, duration: 0.3 }}
              whileHover={{ scale: 1.02 }}
              className="p-3.5 rounded-xl border transition-all"
              style={{ background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderColor: "var(--border-color)" }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ color: "#f59e0b" }}>{model.icon}</span>
                  <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>
                    {model.name}
                  </span>
                </div>
                <StatusBadge variant="info">
                  {model.provider}
                </StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                  v{model.version}
                </span>
                {selectedModel === model.id && (
                  <StatusBadge variant="success">Default</StatusBadge>
                )}
              </div>
            </motion.div>
          ))}
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

      {/* ── Section 4 & 5: Token Limits + Request Volume ───────────────────── */}
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

        {/* Request Volume */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Gauge size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              AI Request Volume
            </h2>
          </div>
          <p className="text-[10px] font-medium mb-4" style={{ color: "var(--text-muted)" }}>
            Projected request volume based on current usage
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div
              className="rounded-xl border p-3.5 text-center"
              style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Daily
              </div>
              <div className="text-lg font-black font-mono tracking-tight" style={{ color: "#f59e0b" }}>
                {fmtNum(volume.daily)}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                projected req
              </div>
            </div>

            <div
              className="rounded-xl border p-3.5 text-center"
              style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Weekly
              </div>
              <div className="text-lg font-black font-mono tracking-tight" style={{ color: "#f59e0b" }}>
                {fmtNum(volume.weekly)}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                projected req
              </div>
            </div>

            <div
              className="rounded-xl border p-3.5 text-center"
              style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}
            >
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
                Monthly
              </div>
              <div className="text-lg font-black font-mono tracking-tight" style={{ color: "#10b981" }}>
                {fmtNum(volume.monthly)}
              </div>
              <div className="text-[9px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                total req
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

    </div>
  );
}
