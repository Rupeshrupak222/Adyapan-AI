"use client";

import { useEffect, useState } from "react";
import { HardDrive } from "lucide-react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { StorageSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData } from "@/components/account-hub/settings/shell";
import { api } from "@/services/api";

export default function SettingsStoragePage() {
  useRequireAuth("USER");

  const { c } = useSettingsColors();
  const { loading } = useSettingsData();

  const [storageUsed, setStorageUsed] = useState(0);
  const [storageTotal, setStorageTotal] = useState(10);
  const [storagePercent, setStoragePercent] = useState(0);
  const [categories, setCategories] = useState<Array<{ name: string; size: string; percent: number; color: "amber" | "green" | "purple" | "rose" }>>([]);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    api.get("/settings/storage").then(res => {
      if (res.data?.storage) {
        const s = res.data.storage;
        const total = s.totalMb || 0;
        setStorageTotal(10);
        setStorageUsed(parseFloat((total / 1024).toFixed(2)));
        setStoragePercent(Math.round((total / (10 * 1024)) * 100));
        setCategories([
          { name: "Notes", size: `${s.notes.count} files`, percent: total ? Math.round((s.notes.estimatedMb / total) * 100) : 0, color: "amber" },
          { name: "Resumes", size: `${s.resumes.count} files`, percent: total ? Math.round((s.resumes.estimatedMb / total) * 100) : 0, color: "green" },
          { name: "Assignments", size: `${s.assignments.count} files`, percent: total ? Math.round((s.assignments.estimatedMb / total) * 100) : 0, color: "purple" },
          { name: "Sessions", size: `${s.sessions.count} sessions`, percent: total ? Math.round((s.sessions.estimatedMb / total) * 100) : 0, color: "rose" },
        ]);
      }
    }).catch(() => {}).finally(() => setStorageLoading(false));
  }, []);

  return (
    <SettingsShell
      title="Storage"
      subtitle="Review how much of your plan's storage you are using."
      icon={HardDrive}
      loading={loading || storageLoading}
    >
      <StorageSection
        c={c}
        storageUsed={storageUsed}
        storageTotal={storageTotal}
        storagePercent={storagePercent}
        categories={categories}
      />
    </SettingsShell>
  );
}
