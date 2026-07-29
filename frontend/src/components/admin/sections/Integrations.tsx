"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Gem, CreditCard, Cloud, Warehouse,
  GitBranch, MessageCircle, Globe, ExternalLink, Monitor,
  ToggleLeft, ToggleRight, Clock,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  status: "Connected" | "Disconnected" | "Error";
  lastSync: string;
  apiVersion: string;
  enabled: boolean;
  color: string;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  { id: "openai", name: "OpenAI", icon: <Brain size={16} />, description: "GPT-4, GPT-3.5, DALL-E, Whisper models", status: "Connected", lastSync: "2 min ago", apiVersion: "v1", enabled: true, color: "#10a37f" },
  { id: "gemini", name: "Gemini", icon: <Gem size={16} />, description: "Gemini 1.5 Pro, Flash, multimodal models", status: "Connected", lastSync: "5 min ago", apiVersion: "v1beta", enabled: true, color: "#4285f4" },
  { id: "stripe", name: "Stripe", icon: <CreditCard size={16} />, description: "Payments, subscriptions, invoices", status: "Connected", lastSync: "1 min ago", apiVersion: "2024-11-20", enabled: true, color: "#635bff" },
  { id: "cloudinary", name: "Cloudinary", icon: <Cloud size={16} />, description: "Image/video upload, optimization, CDN", status: "Connected", lastSync: "10 min ago", apiVersion: "v2", enabled: true, color: "#3448c5" },
  { id: "aws", name: "AWS", icon: <Warehouse size={16} />, description: "S3, Lambda, SES, CloudFront, ECS", status: "Connected", lastSync: "3 min ago", apiVersion: "2024-12", enabled: true, color: "#ff9900" },
  { id: "azure", name: "Azure", icon: <Cloud size={16} />, description: "Auth, Blob Storage, Cognitive Services", status: "Disconnected", lastSync: "Never", apiVersion: "—", enabled: false, color: "#0078d4" },
  { id: "github", name: "GitHub", icon: <GitBranch size={16} />, description: "OAuth, webhooks, repository management", status: "Connected", lastSync: "15 min ago", apiVersion: "v3", enabled: true, color: "#24292e" },
  { id: "slack", name: "Slack", icon: <MessageCircle size={16} />, description: "Notifications, alerts, bot interactions", status: "Connected", lastSync: "8 min ago", apiVersion: "v2", enabled: true, color: "#4a154b" },
  { id: "google", name: "Google", icon: <Globe size={16} />, description: "OAuth, Sheets, Drive, Calendar API", status: "Error", lastSync: "Failed", apiVersion: "v3", enabled: false, color: "#ea4335" },
  { id: "linkedin", name: "LinkedIn", icon: <ExternalLink size={16} />, description: "OAuth sign-in, profile API", status: "Connected", lastSync: "1 day ago", apiVersion: "v2", enabled: true, color: "#0a66c2" },
  { id: "microsoft", name: "Microsoft", icon: <Monitor size={16} />, description: "Azure AD, Office 365, Teams integration", status: "Disconnected", lastSync: "Never", apiVersion: "—", enabled: false, color: "#00a4ef" },
];

function statusVariant(s: Integration["status"]) {
  switch (s) {
    case "Connected": return "success" as const;
    case "Disconnected": return "default" as const;
    case "Error": return "error" as const;
  }
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(INITIAL_INTEGRATIONS);

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id
          ? { ...int, enabled: !int.enabled, status: !int.enabled ? "Connected" as const : "Disconnected" as const }
          : int
      )
    );
  };

  const connectedCount = integrations.filter((i) => i.status === "Connected").length;

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Integrations"
        description="Connect and manage third-party services and APIs"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" pulse>{connectedCount} Connected</StatusBadge>
            <StatusBadge variant="info">{integrations.length} Total</StatusBadge>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {integrations.map((int, idx) => (
          <IntegrationCard
            key={int.id}
            integration={int}
            delay={idx * 0.03}
            onToggle={() => toggleIntegration(int.id)}
          />
        ))}
      </div>
    </div>
  );
}

function IntegrationCard({
  integration,
  delay,
  onToggle,
}: {
  integration: Integration;
  delay: number;
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:scale-[1.02]",
        integration.enabled ? "cursor-pointer" : "opacity-70 cursor-pointer"
      )}
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: `${integration.color}12`,
              border: `1px solid ${integration.color}25`,
              color: integration.color,
            }}
          >
            {integration.icon}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{integration.name}</p>
            <p className="text-[9px] font-medium leading-tight mt-0.5 max-w-[140px]" style={{ color: "var(--text-muted)" }}>
              {integration.description}
            </p>
          </div>
        </div>
      </div>

      {/* Status + API Version */}
      <div className="flex items-center justify-between">
        <StatusBadge variant={statusVariant(integration.status)} pulse={integration.status === "Connected"}>
          {integration.status}
        </StatusBadge>
        <span className="text-[9px] font-mono font-bold" style={{ color: "var(--text-muted)" }}>
          {integration.apiVersion}
        </span>
      </div>

      {/* Last sync */}
      <div className="flex items-center gap-1.5">
        <Clock size={10} style={{ color: "var(--text-muted)" }} />
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          {integration.status === "Disconnected" ? "Not connected" : `Last sync: ${integration.lastSync}`}
        </span>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: "var(--border-color)" }}>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          {integration.enabled ? "Enabled" : "Disabled"}
        </span>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{ color: integration.enabled ? "#f59e0b" : "var(--text-muted)" }}
        >
          {integration.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </motion.button>
      </div>
    </motion.div>
  );
}

function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
