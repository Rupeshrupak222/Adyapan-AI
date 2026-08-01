"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { NotificationsSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData, useScheduleSave } from "@/components/account-hub/settings/shell";

export default function SettingsNotificationsPage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();
  const { loading, settings } = useSettingsData();
  const scheduleSave = useScheduleSave();

  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifAssignment, setNotifAssignment] = useState(true);
  const [notifInterview, setNotifInterview] = useState(true);
  const [notifCoding, setNotifCoding] = useState(false);
  const [notifResearch, setNotifResearch] = useState(false);
  const [notifWeekly, setNotifWeekly] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    setNotifEmail(settings.notifEmail ?? true);
    setNotifPush(settings.notifPush ?? true);
    setNotifAssignment(settings.notifAssignment ?? true);
    setNotifInterview(settings.notifInterview ?? true);
    setNotifCoding(settings.notifCoding ?? false);
    setNotifResearch(settings.notifResearch ?? false);
    setNotifWeekly(settings.notifWeekly ?? true);
    setNotifDaily(settings.notifDaily ?? true);
    setHydrated(true);
  }, [hydrated, loading, settings]);

  return (
    <SettingsShell
      title="Notifications"
      subtitle="Choose how and when Adyapan sends you updates."
      icon={Bell}
      loading={loading}
    >
      <NotificationsSection
        c={c}
        notifEmail={notifEmail}
        setNotifEmail={setNotifEmail}
        notifPush={notifPush}
        setNotifPush={setNotifPush}
        notifAssignment={notifAssignment}
        setNotifAssignment={setNotifAssignment}
        notifInterview={notifInterview}
        setNotifInterview={setNotifInterview}
        notifCoding={notifCoding}
        setNotifCoding={setNotifCoding}
        notifResearch={notifResearch}
        setNotifResearch={setNotifResearch}
        notifWeekly={notifWeekly}
        setNotifWeekly={setNotifWeekly}
        notifDaily={notifDaily}
        setNotifDaily={setNotifDaily}
        markChanged={() => {}}
        scheduleSave={scheduleSave}
      />
    </SettingsShell>
  );
}
