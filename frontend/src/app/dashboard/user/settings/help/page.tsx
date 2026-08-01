"use client";

import { HelpCircle } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { HelpSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors } from "@/components/account-hub/settings/shell";

export default function SettingsHelpPage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();

  return (
    <SettingsShell
      title="Help & Support"
      subtitle="Guides, FAQ, and ways to reach the Adyapan team."
      icon={HelpCircle}
    >
      <HelpSection c={c} />
    </SettingsShell>
  );
}
