"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ConnectedAccountsSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData, useScheduleSave } from "@/components/account-hub/settings/shell";

const DEFAULT_ACCOUNTS = [
  { name: "Google",    icon: "G",  color: "#4285f4", connected: false, authUrl: "https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Faccounts.google.com%2F&service=mail&flowName=GlifWebSignIn&flowEntry=ServiceLogin" },
  { name: "GitHub",   icon: "GH", color: "#ffffff", connected: false, authUrl: "https://github.com/login" },
  { name: "Microsoft", icon: "M",  color: "#00a4ef", connected: false, authUrl: "https://login.microsoftonline.com/" },
  { name: "LinkedIn",  icon: "in", color: "#0077b5", connected: false, authUrl: "https://www.linkedin.com/login" },
];

export default function SettingsConnectedPage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();
  const { loading, settings } = useSettingsData();
  const scheduleSave = useScheduleSave();

  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    if (settings.connectedAccounts) {
      setAccounts(prev => prev.map(a => {
        const slug = a.name.toLowerCase() as keyof typeof settings.connectedAccounts;
        return { ...a, connected: !!settings.connectedAccounts[slug] };
      }));
    }
    setHydrated(true);
  }, [hydrated, loading, settings]);

  return (
    <SettingsShell
      title="Connected Accounts"
      subtitle="Link external services to your Adyapan account."
      icon={Globe}
      loading={loading}
    >
      <ConnectedAccountsSection
        c={c}
        accounts={accounts}
        setAccounts={setAccounts}
        markChanged={() => {}}
        scheduleSave={scheduleSave}
      />
    </SettingsShell>
  );
}
