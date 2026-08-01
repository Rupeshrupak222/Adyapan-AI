"use client";

import { useEffect, useState } from "react";
import { Activity, MessageSquare } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { ActivitySection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData } from "@/components/account-hub/settings/shell";
import { api } from "@/services/api";

export default function SettingsActivityPage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();
  const { loading } = useSettingsData();

  const [activityLog, setActivityLog] = useState<Array<{ time: string; action: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }>>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    api.get("/settings/activity").then(res => {
      if (res.data?.activity) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setActivityLog(res.data.activity.map((a: any) => ({
          time: new Date(a.createdAt).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }),
          action: a.title || a.message || "Activity",
          icon: MessageSquare,
          color: "text-amber-500",
        })));
      }
    }).catch(() => {}).finally(() => setActivityLoading(false));
  }, []);

  return (
    <SettingsShell
      title="Activity Log"
      subtitle="A timeline of recent actions on your account."
      icon={Activity}
      loading={loading || activityLoading}
    >
      <ActivitySection c={c} activityLog={activityLog} />
    </SettingsShell>
  );
}
