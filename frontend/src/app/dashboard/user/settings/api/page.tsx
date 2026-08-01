"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { APISection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData, useScheduleSave } from "@/components/account-hub/settings/shell";

const DEFAULT_KEYS = [
  { name: "Gemini API",      slug: "gemini",      status: "inactive", lastSync: "Never", key: "" },
  { name: "OpenAI API",      slug: "openai",      status: "inactive", lastSync: "Never", key: "" },
  { name: "Claude API",      slug: "claude",      status: "inactive", lastSync: "Never", key: "" },
  { name: "Groq API",        slug: "groq",        status: "inactive", lastSync: "Never", key: "" },
  { name: "OpenRouter API",  slug: "openrouter",  status: "inactive", lastSync: "Never", key: "" },
];

export default function SettingsApiPage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();
  const { loading, settings } = useSettingsData();
  const scheduleSave = useScheduleSave();

  const [apiKeys, setApiKeys] = useState(DEFAULT_KEYS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    if (settings.apiKeys) {
      setApiKeys(prev => prev.map(k => {
        const slug = k.slug as keyof typeof settings.apiKeys;
        const data = settings.apiKeys[slug];
        return data ? { ...k, key: data.key || "", status: data.active ? "active" : "inactive", lastSync: data.active ? "Synced" : "Never" } : k;
      }));
    }
    setHydrated(true);
  }, [hydrated, loading, settings]);

  return (
    <SettingsShell
      title="API Integrations"
      subtitle="Manage the API keys Adyapan can use for your sessions."
      icon={Zap}
      loading={loading}
    >
      <APISection
        c={c}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
        markChanged={() => {}}
        scheduleSave={scheduleSave}
      />
    </SettingsShell>
  );
}
