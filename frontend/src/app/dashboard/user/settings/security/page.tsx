"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { SecuritySection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData, useScheduleSave } from "@/components/account-hub/settings/shell";
import { LogoutDevicesModal } from "@/components/account-hub/settings/modals";

export default function SettingsSecurityPage() {
  useRequireAuth("USER");

  const { c, isDark } = useSettingsColors();
  const { loading, settings } = useSettingsData();
  const scheduleSave = useScheduleSave();

  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    setTwoFactor(settings.twoFactorEnabled ?? false);
    setLoginAlerts(settings.loginAlerts ?? true);
    setHydrated(true);
  }, [hydrated, loading, settings]);

  const activeDevices = [
    { name: "Current Browser", location: "This device", current: true, lastActive: "Now" },
  ];

  return (
    <SettingsShell
      title="Security"
      subtitle="Protect your account with passwords, 2FA, and device management."
      icon={Shield}
      loading={loading}
    >
      <SecuritySection
        c={c}
        twoFactor={twoFactor}
        setTwoFactor={setTwoFactor}
        loginAlerts={loginAlerts}
        setLoginAlerts={setLoginAlerts}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        activeDevices={activeDevices}
        markChanged={() => {}}
        scheduleSave={scheduleSave}
        onLogoutDevices={() => setShowLogoutModal(true)}
      />

      <LogoutDevicesModal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} c={c} isDark={isDark} />
    </SettingsShell>
  );
}
