"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AccountSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData } from "@/components/account-hub/settings/shell";
import { ChangePasswordModal, DeleteAccountModal } from "@/components/account-hub/settings/modals";

export default function SettingsAccountPage() {
  useRequireAuth("USER");

  const { c, isDark } = useSettingsColors();
  const { loading, profile } = useSettingsData();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString("en-IN", { year: "numeric", month: "long" })
    : "";

  return (
    <SettingsShell
      title="Account"
      subtitle="Manage your account details and security preferences."
      icon={Settings}
      loading={loading}
    >
      <AccountSection
        c={c}
        email={profile.email || ""}
        plan={profile.plan || "free"}
        memberSince={memberSince}
        markChanged={() => {}}
        onDeleteAccount={() => setShowDeleteModal(true)}
        onChangePassword={() => setShowChangePassword(true)}
      />

      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} c={c} isDark={isDark} />
      <DeleteAccountModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} c={c} isDark={isDark} />
    </SettingsShell>
  );
}
