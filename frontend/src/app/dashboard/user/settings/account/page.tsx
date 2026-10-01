"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AccountSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData } from "@/components/account-hub/settings/shell";
import { ChangePasswordModal, DeleteAccountModal, VerifyEmailModal } from "@/components/account-hub/settings/modals";

export default function SettingsAccountPage() {
  useRequireAuth("USER");

  const { c, isDark } = useSettingsColors();
  const { loading, profile, reload } = useSettingsData();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

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
        emailVerified={Boolean(profile.emailVerified)}
        markChanged={() => {}}
        onDeleteAccount={() => setShowDeleteModal(true)}
        onChangePassword={() => setShowChangePassword(true)}
        onVerifyEmail={() => setShowVerifyModal(true)}
      />

      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} c={c} isDark={isDark} />
      <DeleteAccountModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} c={c} isDark={isDark} />
      <VerifyEmailModal
        open={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        email={profile.email || ""}
        c={c}
        isDark={isDark}
        onSuccess={() => reload()}
      />
    </SettingsShell>
  );
}
