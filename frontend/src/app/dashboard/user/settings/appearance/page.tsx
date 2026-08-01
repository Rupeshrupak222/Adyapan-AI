"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Palette } from "lucide-react";
import { toast } from "sonner";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AppearanceSection } from "@/components/account-hub/ManageAccountView";
import { SettingsShell, useSettingsColors, useSettingsData } from "@/components/account-hub/settings/shell";
import { api } from "@/services/api";

export default function SettingsAppearancePage() {
  useRequireAuth("USER");

  const { c, isDark } = useSettingsColors();
  const { loading, settings } = useSettingsData();

  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">("dark");
  const [accentColor, setAccentColor] = useState("#f59e0b");
  const [compactMode, setCompactMode] = useState(false);
  const [glassEffect, setGlassEffect] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [sidebarCollapse, setSidebarCollapse] = useState(true);
  const [fontSize, setFontSize] = useState(14);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (hydrated || loading) return;
    setThemeMode((settings.themeMode || "dark") as "dark" | "light" | "system");
    setAccentColor(settings.accentColor || "#f59e0b");
    setCompactMode(!!settings.compactMode);
    setGlassEffect(settings.glassEffect ?? true);
    setAnimationsEnabled(settings.animationsEnabled ?? true);
    setSidebarCollapse(settings.sidebarCollapse ?? true);
    setFontSize(settings.fontSize || 14);
    setHydrated(true);
  }, [hydrated, loading, settings]);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const appearanceSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAppearanceSave = useCallback(() => {
    if (appearanceSaveRef.current) clearTimeout(appearanceSaveRef.current);
    appearanceSaveRef.current = setTimeout(async () => {
      try {
        await api.put("/settings/appearance", {
          themeMode, accentColor, compactMode, glassEffect, animationsEnabled, sidebarCollapse, fontSize,
        });
        setHasChanges(false);
      } catch { /* silent */ }
    }, 700);
  }, [themeMode, accentColor, compactMode, glassEffect, animationsEnabled, sidebarCollapse, fontSize]);

  const applyTheme = useCallback((mode: string) => {
    const resolved = mode === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : mode;
    document.documentElement.setAttribute("data-theme", resolved);
    localStorage.setItem("adyapan-theme", resolved);
  }, []);

  const applyAccentColor = useCallback((color: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--primary", color);
      document.documentElement.style.setProperty("--accent-color", color);
      localStorage.setItem("adyapan-accent", color);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/appearance", {
        themeMode, accentColor, compactMode, glassEffect, animationsEnabled, sidebarCollapse, fontSize,
      });
      setHasChanges(false);
      toast.success("Appearance saved!");
    } catch { toast.error("Failed to save appearance."); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    try {
      const res = await api.get("/settings");
      const s = res.data?.settings || {};
      setThemeMode((s.themeMode || "dark") as "dark" | "light" | "system");
      setAccentColor(s.accentColor || "#f59e0b");
      setCompactMode(!!s.compactMode);
      setGlassEffect(s.glassEffect ?? true);
      setAnimationsEnabled(s.animationsEnabled ?? true);
      setSidebarCollapse(s.sidebarCollapse ?? true);
      setFontSize(s.fontSize || 14);
      setHasChanges(false);
      toast.info("Appearance reset to saved values.");
    } catch { /* ignore */ }
  };

  return (
    <SettingsShell
      title="Appearance"
      subtitle="Customize how Adyapan looks and feels on your device."
      icon={Palette}
      loading={loading}
      hasChanges={hasChanges}
      onSave={handleSave}
      saving={saving}
      onReset={handleReset}
    >
      <AppearanceSection
        c={c}
        isDark={isDark}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        compactMode={compactMode}
        setCompactMode={setCompactMode}
        glassEffect={glassEffect}
        setGlassEffect={setGlassEffect}
        animationsEnabled={animationsEnabled}
        setAnimationsEnabled={setAnimationsEnabled}
        sidebarCollapse={sidebarCollapse}
        setSidebarCollapse={setSidebarCollapse}
        fontSize={fontSize}
        setFontSize={setFontSize}
        markChanged={markChanged}
        onAutoSave={scheduleAppearanceSave}
        onApplyTheme={applyTheme}
        onApplyAccent={applyAccentColor}
        onSave={handleSave}
        saving={saving}
      />
    </SettingsShell>
  );
}
