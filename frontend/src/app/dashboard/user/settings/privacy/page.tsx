"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PrivacySection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData, useScheduleSave } from "@/components/account-hub/settings/shell";
import { DeleteAccountModal, DeleteChatHistoryModal } from "@/components/account-hub/settings/modals";
import { api } from "@/services/api";

export default function SettingsPrivacyPage() {
  useRequireAuth("USER");

  const { c, isDark } = useSettingsColors();
  const { loading, settings } = useSettingsData();
  const scheduleSave = useScheduleSave();

  const [publicProfile, setPublicProfile] = useState(true);
  const [dataCollection, setDataCollection] = useState(true);
  const [personalizedAI, setPersonalizedAI] = useState(true);
  const [showDeleteChatModal, setShowDeleteChatModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    setPublicProfile(settings.publicProfile ?? true);
    setDataCollection(settings.dataCollection ?? true);
    setPersonalizedAI(settings.personalizedAI ?? true);
    setHydrated(true);
  }, [hydrated, loading, settings]);

  const handleExportData = async () => {
    toast.info("Preparing your data export...");
    try {
      const res = await api.get("/settings/export-data", { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `adyapan-export-${Date.now()}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch { toast.error("Failed to export data."); }
  };

  return (
    <SettingsShell
      title="Privacy"
      subtitle="Control what Adyapan collects and how your data is used."
      icon={Lock}
      loading={loading}
    >
      <PrivacySection
        c={c}
        publicProfile={publicProfile}
        setPublicProfile={setPublicProfile}
        dataCollection={dataCollection}
        setDataCollection={setDataCollection}
        personalizedAI={personalizedAI}
        setPersonalizedAI={setPersonalizedAI}
        markChanged={() => {}}
        scheduleSave={scheduleSave}
        onExportData={handleExportData}
        onDeleteChatHistory={() => setShowDeleteChatModal(true)}
        onDeleteAccount={() => setShowDeleteModal(true)}
      />

      <DeleteChatHistoryModal open={showDeleteChatModal} onClose={() => setShowDeleteChatModal(false)} c={c} isDark={isDark} />
      <DeleteAccountModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} c={c} isDark={isDark} />
    </SettingsShell>
  );
}
