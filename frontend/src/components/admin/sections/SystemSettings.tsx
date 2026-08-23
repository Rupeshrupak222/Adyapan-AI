"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Save, Loader2, Settings, Wrench,
  UserPlus, Brain, Palette,
  Fingerprint, Shield, CheckCircle, XCircle, AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface SystemSettingsData {
  platformName: string;
  supportEmail: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
  announcementBanner: string;
  registrationOpen: boolean;
  defaultAiModel: string;
  aiTemperature: number;
  freeTierTokenLimit: number;
  premiumTierTokenLimit: number;
  freeTierDailyRequests: number;
  premiumTierDailyRequests: number;
  enterpriseTierDailyTokens: number;
  enterpriseTierDailyRequests: number;
  logoUrl: string;
  primaryBrandColor: string;
  faviconUrl: string;
  minPasswordLength: number;
  mfaRequired: boolean;
  sessionTimeout: number;
}

interface SettingsResponse {
  success: boolean;
  settings: SystemSettingsData;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
  { value: "te", label: "Telugu" },
  { value: "mr", label: "Marathi" },
  { value: "ta", label: "Tamil" },
  { value: "gu", label: "Gujarati" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "pa", label: "Punjabi" },
];

const AI_MODELS = [
  { id: "gemini", name: "Gemini 2.0 Flash", provider: "Google" },
  { id: "claude", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "gpt4", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "deepseek", name: "DeepSeek V2", provider: "DeepSeek" },
  { id: "kimi", name: "Kimi K2", provider: "Moonshot" },
  { id: "llama", name: "Llama 3.1 70B", provider: "Meta" },
  { id: "mistral", name: "Mistral Large 2", provider: "Mistral" },
  { id: "local", name: "Local Model", provider: "On-device" },
];

const SESSION_TIMEOUTS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
  { value: 1440, label: "24 hours" },
];

const DEFAULT_SETTINGS: SystemSettingsData = {
  platformName: "Adyapan AI",
  supportEmail: "support@adyapan.ai",
  defaultLanguage: "en",
  maintenanceMode: false,
  announcementBanner: "",
  registrationOpen: true,
  defaultAiModel: "gemini",
  aiTemperature: 0.7,
  freeTierTokenLimit: 10000,
  premiumTierTokenLimit: 100000,
  freeTierDailyRequests: 20,
  premiumTierDailyRequests: 200,
  enterpriseTierDailyTokens: 20000000,
  enterpriseTierDailyRequests: 1000,
  logoUrl: "",
  primaryBrandColor: "#f59e0b",
  faviconUrl: "",
  minPasswordLength: 8,
  mfaRequired: false,
  sessionTimeout: 60,
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
      style={{
        background: checked ? "#f59e0b" : "rgba(255,255,255,0.1)",
        border: "1px solid",
        borderColor: checked ? "rgba(245,158,11,0.5)" : "var(--border-color)",
      }}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`}
      />
      {label && <span className="ml-3 text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>}
    </button>
  );
}

function SettingsCard({
  icon,
  title,
  status,
  children,
  onSave,
  saving,
}: {
  icon: React.ReactNode;
  title: string;
  status?: React.ReactNode;
  children: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span style={{ color: "#f59e0b" }}>{icon}</span>
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            {title}
          </h2>
          {status}
        </div>
        {onSave && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={onSave}
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
            {saving ? "Saving..." : "Save"}
          </motion.button>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all focus-within:border-amber-500/50"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}
      >
        {type === "color" ? (
          <div className="flex items-center gap-2 w-full">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-8 h-8 rounded-lg border cursor-pointer"
              style={{ borderColor: "var(--border-color)", background: "transparent" }}
            />
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="flex-1 bg-transparent text-xs font-mono font-bold outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-xs font-medium outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        )}
      </div>
      {hint && <p className="text-[9px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>{hint}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | number;
  onChange: (v: any) => void;
  options: { value: string | number; label: string }[];
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div
        className="rounded-xl border px-3 py-2.5 transition-all focus-within:border-amber-500/50"
        style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-xs font-medium outline-none cursor-pointer"
          style={{ color: "var(--text-primary)" }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SystemSettingsData>(DEFAULT_SETTINGS);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SettingsResponse>("/admin/settings");
      if (res.data.success) {
        setSettings(res.data.settings);
      }
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async (section: string, payload: Partial<SystemSettingsData>) => {
    setSavingSection(section);
    setSaveSuccess(null);
    setError(null);
    try {
      const updated = { ...settings, ...payload };
      const res = await api.put<SettingsResponse>("/admin/settings", updated);
      if (res.data.success) {
        setSettings(res.data.settings);
        setSaveSuccess(section);
        setTimeout(() => setSaveSuccess(null), 2000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save settings");
    } finally {
      setSavingSection(null);
    }
  }, [settings]);

  const update = useCallback((key: keyof SystemSettingsData, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Settings
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">

      <SectionHeader
        title="System Settings"
        description="Configure global platform settings, AI defaults, branding, and security"
        actions={
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => fetchSettings()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <RefreshCw size={13} />
            Refresh
          </motion.button>
        }
      />

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

      {saveSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-3 p-4 rounded-2xl border"
          style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)" }}
        >
          <CheckCircle size={16} style={{ color: "#10b981", flexShrink: 0 }} />
          <span className="text-xs font-medium" style={{ color: "#10b981" }}>Settings saved successfully</span>
        </motion.div>
      )}

      {/* General */}
      <SettingsCard
        icon={<Settings size={16} />}
        title="General"
        onSave={() => saveSettings("general", {
          platformName: settings.platformName,
          supportEmail: settings.supportEmail,
          defaultLanguage: settings.defaultLanguage,
        })}
        saving={savingSection === "general"}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Platform Name" value={settings.platformName} onChange={(v) => update("platformName", v)} placeholder="Adyapan AI" />
          <InputField label="Support Email" value={settings.supportEmail} onChange={(v) => update("supportEmail", v)} placeholder="support@adyapan.ai" type="email" />
          <SelectField label="Default Language" value={settings.defaultLanguage} onChange={(v) => update("defaultLanguage", v)} options={LANGUAGES} />
        </div>
      </SettingsCard>

      {/* Maintenance */}
      <SettingsCard
        icon={<Wrench size={16} />}
        title="Maintenance"
        onSave={() => saveSettings("maintenance", {
          maintenanceMode: settings.maintenanceMode,
          announcementBanner: settings.announcementBanner,
        })}
        saving={savingSection === "maintenance"}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: settings.maintenanceMode ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", border: "1px solid", borderColor: settings.maintenanceMode ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: settings.maintenanceMode ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)" }}>
                {settings.maintenanceMode ? <XCircle size={16} style={{ color: "#ef4444" }} /> : <CheckCircle size={16} style={{ color: "#10b981" }} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Maintenance Mode</span>
                  <StatusBadge variant={settings.maintenanceMode ? "error" : "success"} pulse>
                    {settings.maintenanceMode ? "Active" : "Disabled"}
                  </StatusBadge>
                </div>
                <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                  When enabled, only admins can access the platform
                </p>
              </div>
            </div>
            <Toggle checked={settings.maintenanceMode} onChange={(v) => update("maintenanceMode", v)} />
          </div>

          <InputField
            label="Announcement Banner"
            value={settings.announcementBanner}
            onChange={(v) => update("announcementBanner", v)}
            placeholder="e.g. Scheduled maintenance on Sunday 2:00 AM IST"
            hint="Shown to all users at the top of the page"
          />
        </div>
      </SettingsCard>

      {/* Registration */}
      <SettingsCard
        icon={<UserPlus size={16} />}
        title="Registration"
        onSave={() => saveSettings("registration", { registrationOpen: settings.registrationOpen })}
        saving={savingSection === "registration"}
      >
        <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: settings.registrationOpen ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: "1px solid", borderColor: settings.registrationOpen ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: settings.registrationOpen ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)" }}>
              {settings.registrationOpen ? <CheckCircle size={16} style={{ color: "#10b981" }} /> : <XCircle size={16} style={{ color: "#ef4444" }} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>New User Registration</span>
                <StatusBadge variant={settings.registrationOpen ? "success" : "error"} pulse>
                  {settings.registrationOpen ? "Open" : "Closed"}
                </StatusBadge>
              </div>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: "var(--text-muted)" }}>
                {settings.registrationOpen ? "Anyone can create a new account" : "Registration is disabled for new users"}
              </p>
            </div>
          </div>
          <Toggle checked={settings.registrationOpen} onChange={(v) => update("registrationOpen", v)} />
        </div>
      </SettingsCard>

      {/* AI Configuration */}
      <SettingsCard
        icon={<Brain size={16} />}
        title="AI Configuration"
        onSave={() => saveSettings("ai", {
          defaultAiModel: settings.defaultAiModel,
          aiTemperature: settings.aiTemperature,
          freeTierTokenLimit: settings.freeTierTokenLimit,
          premiumTierTokenLimit: settings.premiumTierTokenLimit,
          freeTierDailyRequests: settings.freeTierDailyRequests,
          premiumTierDailyRequests: settings.premiumTierDailyRequests,
          enterpriseTierDailyTokens: settings.enterpriseTierDailyTokens,
          enterpriseTierDailyRequests: settings.enterpriseTierDailyRequests,
        })}
        saving={savingSection === "ai"}
      >
        <div className="space-y-5">
          {/* Model selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
              Default AI Model
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AI_MODELS.map((m) => {
                const isSelected = settings.defaultAiModel === m.id;
                return (
                  <motion.button
                    key={m.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => update("defaultAiModel", m.id)}
                    className="relative flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all"
                    style={{
                      background: isSelected ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.02)",
                      borderColor: isSelected ? "rgba(245,158,11,0.5)" : "var(--border-color)",
                    }}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="aiModelSelect"
                        className="absolute inset-0 rounded-xl"
                        style={{ border: "2px solid #f59e0b" }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="text-xs font-bold" style={{ color: isSelected ? "#f59e0b" : "var(--text-primary)" }}>
                      {m.name.split(" ")[0]}
                    </span>
                    <span className="text-[8px] font-medium" style={{ color: "var(--text-muted)" }}>
                      {m.provider}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Temperature slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Temperature
              </label>
              <span className="text-xs font-bold font-mono" style={{ color: "#f59e0b" }}>{settings.aiTemperature.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.aiTemperature}
              onChange={(e) => update("aiTemperature", parseFloat(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #f59e0b ${(settings.aiTemperature / 2) * 100}%, rgba(255,255,255,0.1) ${(settings.aiTemperature / 2) * 100}%)`,
                accentColor: "#f59e0b",
              }}
            />
            <div className="flex justify-between text-[9px] font-medium mt-1" style={{ color: "var(--text-muted)" }}>
              <span>Precise (0)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Token limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Free Tier Token Limit"
              value={String(settings.freeTierTokenLimit)}
              onChange={(v) => update("freeTierTokenLimit", parseInt(v) || 0)}
              type="number"
              hint="Daily token limit per free user"
            />
            <InputField
              label="Free Tier Request Limit"
              value={String(settings.freeTierDailyRequests)}
              onChange={(v) => update("freeTierDailyRequests", parseInt(v) || 0)}
              type="number"
              hint="Daily AI requests per free user"
            />
            <InputField
              label="Premium Tier Token Limit"
              value={String(settings.premiumTierTokenLimit)}
              onChange={(v) => update("premiumTierTokenLimit", parseInt(v) || 0)}
              type="number"
              hint="Daily token limit per premium user"
            />
            <InputField
              label="Premium Tier Request Limit"
              value={String(settings.premiumTierDailyRequests)}
              onChange={(v) => update("premiumTierDailyRequests", parseInt(v) || 0)}
              type="number"
              hint="Daily AI requests per premium user"
            />
            <InputField
              label="Enterprise Tier Token Limit"
              value={String(settings.enterpriseTierDailyTokens)}
              onChange={(v) => update("enterpriseTierDailyTokens", parseInt(v) || 0)}
              type="number"
              hint="Daily token limit per enterprise user"
            />
            <InputField
              label="Enterprise Tier Request Limit"
              value={String(settings.enterpriseTierDailyRequests)}
              onChange={(v) => update("enterpriseTierDailyRequests", parseInt(v) || 0)}
              type="number"
              hint="Daily AI requests per enterprise user"
            />
          </div>
          <p className="mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
            Monthly limits are 30x the daily limits. When a free user hits a limit they are prompted to upgrade to Premium.
          </p>
        </div>
      </SettingsCard>

      {/* Branding */}
      <SettingsCard
        icon={<Palette size={16} />}
        title="Branding"
        onSave={() => saveSettings("branding", {
          logoUrl: settings.logoUrl,
          primaryBrandColor: settings.primaryBrandColor,
          faviconUrl: settings.faviconUrl,
        })}
        saving={savingSection === "branding"}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField label="Logo URL" value={settings.logoUrl} onChange={(v) => update("logoUrl", v)} placeholder="https://adyapan.ai/logo.png" hint="URL to your logo image" />
          <InputField label="Primary Brand Color" value={settings.primaryBrandColor} onChange={(v) => update("primaryBrandColor", v)} type="color" />
          <InputField label="Favicon URL" value={settings.faviconUrl} onChange={(v) => update("faviconUrl", v)} placeholder="https://adyapan.ai/favicon.ico" hint="URL to favicon file" />
        </div>

        {/* Preview */}
        <div className="mt-4 p-4 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}>
          <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Preview</div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black" style={{ background: settings.primaryBrandColor, color: "#000" }}>
              A
            </div>
            <div>
              <div className="text-xs font-bold" style={{ color: settings.primaryBrandColor }}>Adyapan AI</div>
              <div className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>Primary brand color preview</div>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Security */}
      <SettingsCard
        icon={<Shield size={16} />}
        title="Security"
        onSave={() => saveSettings("security", {
          minPasswordLength: settings.minPasswordLength,
          mfaRequired: settings.mfaRequired,
          sessionTimeout: settings.sessionTimeout,
        })}
        saving={savingSection === "security"}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InputField
            label="Minimum Password Length"
            value={String(settings.minPasswordLength)}
            onChange={(v) => update("minPasswordLength", parseInt(v) || 8)}
            type="number"
            hint="8-128 characters recommended"
          />

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-secondary)" }}>
              MFA Required
            </label>
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2">
                <Fingerprint size={14} style={{ color: settings.mfaRequired ? "#f59e0b" : "var(--text-muted)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                  {settings.mfaRequired ? "Required for all users" : "Optional"}
                </span>
              </div>
              <Toggle checked={settings.mfaRequired} onChange={(v) => update("mfaRequired", v)} />
            </div>
          </div>

          <SelectField label="Session Timeout" value={settings.sessionTimeout} onChange={(v) => update("sessionTimeout", parseInt(v))} options={SESSION_TIMEOUTS} />
        </div>
      </SettingsCard>

    </div>
  );
}
