"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AIPreferencesSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData } from "@/components/account-hub/settings/shell";
import { api } from "@/services/api";

export default function SettingsAIPreferencesPage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();
  const { loading, settings } = useSettingsData();

  const [aiModel, setAiModel] = useState("gemini");
  const [responseLength, setResponseLength] = useState("balanced");
  const [creativity, setCreativity] = useState(70);
  const [aiMemory, setAiMemory] = useState(true);
  const [markdownOutput, setMarkdownOutput] = useState(true);
  const [codeHighlighting, setCodeHighlighting] = useState(true);
  const [autoCitation, setAutoCitation] = useState(false);
  const [autoSaveConversations, setAutoSaveConversations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    setAiModel(settings.aiModel || "gemini");
    setResponseLength(settings.responseLength || "balanced");
    setCreativity(settings.creativity ?? 70);
    setAiMemory(settings.aiMemory ?? true);
    setMarkdownOutput(settings.markdownOutput ?? true);
    setCodeHighlighting(settings.codeHighlighting ?? true);
    setAutoCitation(settings.autoCitation ?? false);
    setAutoSaveConversations(settings.autoSaveConversations ?? true);
    setHydrated(true);
  }, [hydrated, loading, settings]);

  const markChanged = () => setHasChanges(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/ai", {
        aiModel, responseLength, creativity, aiMemory, markdownOutput, codeHighlighting, autoCitation, autoSaveConversations,
      });
      setHasChanges(false);
      toast.success("AI preferences saved!");
    } catch { toast.error("Failed to save AI preferences."); }
    finally { setSaving(false); }
  };

  return (
    <SettingsShell
      title="AI Preferences"
      subtitle="Tune how the Adyapan AI assistant responds and remembers."
      icon={Sparkles}
      loading={loading}
      hasChanges={hasChanges}
      onSave={handleSave}
      saving={saving}
    >
      <AIPreferencesSection
        c={c}
        aiModel={aiModel}
        setAiModel={setAiModel}
        responseLength={responseLength}
        setResponseLength={setResponseLength}
        creativity={creativity}
        setCreativity={setCreativity}
        aiMemory={aiMemory}
        setAiMemory={setAiMemory}
        markdownOutput={markdownOutput}
        setMarkdownOutput={setMarkdownOutput}
        codeHighlighting={codeHighlighting}
        setCodeHighlighting={setCodeHighlighting}
        autoCitation={autoCitation}
        setAutoCitation={setAutoCitation}
        autoSaveConversations={autoSaveConversations}
        setAutoSaveConversations={setAutoSaveConversations}
        markChanged={markChanged}
        onSave={handleSave}
        saving={saving}
      />
    </SettingsShell>
  );
}
