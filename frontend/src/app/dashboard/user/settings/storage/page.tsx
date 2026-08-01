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
  const [storageTotal, setStorageTotal] = useState(50);
  const [storagePercent, setStoragePercent] = useState(0);
  const [storageUnit, setStorageUnit] = useState<"MB" | "GB">("MB");
  const [categories, setCategories] = useState<Array<{ name: string; size: string; percent: number; color: "amber" | "green" | "purple" | "rose" }>>([]);
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    api.get("/settings/storage").then(res => {
      if (res.data?.storage) {
        const s = res.data.storage;
        const usedMb = s.usedMb ?? s.totalMb ?? 0;
        const limitMb = s.limitMb ?? 50;
        const percent = s.percentUsed ?? Math.min(100, Math.round((usedMb / limitMb) * 100));

        setStorageUsed(usedMb);
        setStorageTotal(limitMb);
        setStoragePercent(percent);
        setStorageUnit("MB");
        setCategories([
          { name: "Notes", size: `${s.notes?.count || 0} files`, percent: usedMb ? Math.round(((s.notes?.estimatedMb || 0) / usedMb) * 100) : 0, color: "amber" },
          { name: "Resumes", size: `${s.resumes?.count || 0} files`, percent: usedMb ? Math.round(((s.resumes?.estimatedMb || 0) / usedMb) * 100) : 0, color: "green" },
          { name: "Assignments", size: `${s.assignments?.count || 0} files`, percent: usedMb ? Math.round(((s.assignments?.estimatedMb || 0) / usedMb) * 100) : 0, color: "purple" },
          { name: "Sessions", size: `${s.sessions?.count || 0} sessions`, percent: usedMb ? Math.round(((s.sessions?.estimatedMb || 0) / usedMb) * 100) : 0, color: "rose" },
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
        unit={storageUnit}
      />
    </SettingsShell>
  );
}
