"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Brain, Gem, MessageSquare, GitBranch, Globe,
  Monitor, ExternalLink, Loader2, RefreshCw, KeyRound, Plug,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { api } from "@/services/api";

interface ApiKeyInfo {
  key: string;
  active: boolean;
}

interface SettingsData {
  apiKeys: {
    gemini: ApiKeyInfo;
    openai: ApiKeyInfo;
    claude: ApiKeyInfo;
    groq: ApiKeyInfo;
    openrouter: ApiKeyInfo;
  };
  connectedAccounts: {
    google: boolean;
    github: boolean;
    microsoft: boolean;
    linkedin: boolean;
  };
}

interface ProviderDef {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  kind: "api" | "oauth";
  apiKey?: string;
}

const PROVIDERS: ProviderDef[] = [
  { id: "openai", name: "OpenAI", icon: <Brain size={16} />, description: "GPT-4, GPT-3.5, DALL-E, Whisper models", kind: "api", color: "#10a37f" },
  { id: "gemini", name: "Gemini", icon: <Gem size={16} />, description: "Gemini Pro, Flash multimodal models", kind: "api", color: "#4285f4" },
  { id: "claude", name: "Claude", icon: <Brain size={16} />, description: "Anthropic Claude language models", kind: "api", color: "#d97757" },
  { id: "groq", name: "Groq", icon: <MessageSquare size={16} />, description: "Low-latency inference API", kind: "api", color: "#f55036" },
  { id: "openrouter", name: "OpenRouter", icon: <Plug size={16} />, description: "Unified access to many model providers", kind: "api", color: "#8b5cf6" },
  { id: "google", name: "Google", icon: <Globe size={16} />, description: "OAuth sign-in and Google services", kind: "oauth", color: "#ea4335" },
  { id: "github", name: "GitHub", icon: <GitBranch size={16} />, description: "OAuth sign-in and repository access", kind: "oauth", color: "#24292e" },
  { id: "microsoft", name: "Microsoft", icon: <Monitor size={16} />, description: "OAuth sign-in and Microsoft services", kind: "oauth", color: "#00a4ef" },
  { id: "linkedin", name: "LinkedIn", icon: <ExternalLink size={16} />, description: "OAuth sign-in and profile access", kind: "oauth", color: "#0a66c2" },
];

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      if (res.data?.success) {
        setSettings(res.data.settings);
      }
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isActive = (p: ProviderDef): boolean => {
    if (!settings) return false;
    if (p.kind === "api") {
      const info = settings.apiKeys?.[p.id as keyof SettingsData["apiKeys"]];
      return !!info?.active;
    }
    return !!settings.connectedAccounts?.[p.id as keyof SettingsData["connectedAccounts"]];
  };

  const connectedCount = PROVIDERS.filter(isActive).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Integrations
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Integrations"
        description="Configured AI providers and connected accounts"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant={connectedCount > 0 ? "success" : "default"} pulse={connectedCount > 0}>
              {connectedCount} Configured
            </StatusBadge>
            <StatusBadge variant="info">{PROVIDERS.length} Total</StatusBadge>
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

      {!settings && (
        <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>Unable to load integration status</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Sign in again to view your configured providers.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PROVIDERS.map((p, idx) => {
          const active = isActive(p);
          const apiKey = p.kind === "api" ? settings?.apiKeys?.[p.id as keyof SettingsData["apiKeys"]]?.key : "";
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] ${active ? "" : "opacity-70"}`}
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${p.color}12`, border: `1px solid ${p.color}25`, color: p.color }}>
                    {p.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{p.name}</p>
                    <p className="text-[9px] font-medium leading-tight mt-0.5 max-w-[140px]" style={{ color: "var(--text-muted)" }}>
                      {p.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <StatusBadge variant={active ? "success" : "default"} pulse={active}>
                  {p.kind === "api" ? (active ? "Configured" : "Not configured") : (active ? "Connected" : "Not connected")}
                </StatusBadge>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {p.kind === "api" ? "API Key" : "OAuth"}
                </span>
              </div>

              {p.kind === "api" && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium" style={{ color: "var(--text-muted)" }}>
                  <KeyRound size={10} />
                  {active && apiKey ? maskKey(apiKey) : "No key set"}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
