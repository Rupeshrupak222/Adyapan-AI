"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, Palette, Bell, Sparkles, BookOpen, Shield, Lock, Globe, Zap,
  HardDrive, Activity, HelpCircle, Save, RotateCcw, Menu, X, ChevronRight, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { api } from "@/services/api";

// ─── Settings navigation config ──────────────────────────────────────────
export const SETTINGS_NAV = [
  { id: "account", label: "Account", href: "/dashboard/user/settings/account", icon: Settings },
  { id: "appearance", label: "Appearance", href: "/dashboard/user/settings/appearance", icon: Palette },
  { id: "notifications", label: "Notifications", href: "/dashboard/user/settings/notifications", icon: Bell },
  { id: "ai-preferences", label: "AI Preferences", href: "/dashboard/user/settings/ai-preferences", icon: Sparkles },
  { id: "learning", label: "Learning Preferences", href: "/dashboard/user/settings/learning", icon: BookOpen },
  { id: "security", label: "Security", href: "/dashboard/user/settings/security", icon: Shield },
  { id: "privacy", label: "Privacy", href: "/dashboard/user/settings/privacy", icon: Lock },
  { id: "connected", label: "Connected Accounts", href: "/dashboard/user/settings/connected", icon: Globe },
  { id: "api", label: "API Integrations", href: "/dashboard/user/settings/api", icon: Zap },
  { id: "storage", label: "Storage", href: "/dashboard/user/settings/storage", icon: HardDrive },
  { id: "activity", label: "Activity Log", href: "/dashboard/user/settings/activity", icon: Activity },
  { id: "help", label: "Help & Support", href: "/dashboard/user/settings/help", icon: HelpCircle },
] as const;

// ─── Animation variants ──────────────────────────────────────────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35 } }),
};

export const sectionTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

// ─── Theme-aware color palette ───────────────────────────────────────────
export function useSettingsColors() {
  const theme = useTheme();
  const isDark = theme === "dark";

  const c = useMemo(() => ({
    text: isDark ? "#ffffff" : "#0f172a",
    textSec: isDark ? "rgba(255,255,255,0.7)" : "#475569",
    textMuted: isDark ? "rgba(255,255,255,0.45)" : "#94a3b8",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    cardBgHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.02)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    borderHover: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)",
    primary: "#f59e0b",
    inputBg: isDark ? "rgba(0,0,0,0.4)" : "#f8fafc",
  }), [isDark]);

  return { c, isDark, theme };
}

// ─── Load all settings + profile from the backend ────────────────────────
export function useSettingsData() {
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      setSettings(res.data?.settings || {});
      setProfile(res.data?.profile || {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { loading, settings, profile, reload: load };
}

// ─── Debounced auto-save helper (matches dashboard behavior) ─────────────
export function useScheduleSave() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, Record<string, unknown>>>({});

  const scheduleSave = useCallback((section: string, data: Record<string, unknown>) => {
    // Merge changes per section so rapid toggles are all persisted,
    // not just the most recent one.
    pendingRef.current[section] = { ...(pendingRef.current[section] || {}), ...data };

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const sections = pendingRef.current;
      pendingRef.current = {};
      await Promise.all(
        Object.entries(sections).map(([sec, payload]) =>
          api.put(`/settings/${sec}`, payload).catch(() => {})
        )
      );
      const label = Object.keys(sections)[0];
      if (label) {
        toast.success(`${label.charAt(0).toUpperCase() + label.slice(1)} saved!`, { duration: 1500 });
      }
    }, 800);
  }, []);

  return scheduleSave;
}

// ─── Page shell: header + sidebar nav + mobile drawer ────────────────────
export function SettingsShell({
  title, subtitle, icon: Icon, children, loading, onSave, saving, onReset, hasChanges,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  children: React.ReactNode;
  loading?: boolean;
  onSave?: () => void;
  saving?: boolean;
  onReset?: () => void;
  hasChanges?: boolean;
}) {
  const { c, isDark } = useSettingsColors();
  const pathname = usePathname() || "";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNav = SETTINGS_NAV.filter((item) =>
    searchQuery ? item.label.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const renderNavItems = (onNavigate?: () => void) => (
    <>
      {filteredNav.map((item) => {
        const isActive = pathname === item.href;
        const NavIcon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            onClick={onNavigate}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all relative cursor-pointer"
            style={{
              background: isActive
                ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.1))"
                : "transparent",
              color: isActive ? "#f59e0b" : c.textSec,
            }}
          >
            {isActive && (
              <motion.div
                layoutId="settings-nav-glow"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gradient-to-b from-amber-500 to-orange-500"
                style={{ boxShadow: "0 0 8px rgba(245,158,11,0.5)" }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
              />
            )}
            <NavIcon size={15} className="shrink-0" />
            <span className="text-[11px] font-bold truncate">{item.label}</span>
            {isActive && <ChevronRight size={12} className="ml-auto shrink-0 opacity-50" />}
          </Link>
        );
      })}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
      style={{ color: c.text }}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
            <Icon className="text-amber-500" size={22} /> {title}
          </h1>
          {subtitle && <p className="text-xs mt-1" style={{ color: c.textMuted }}>{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative hidden sm:block">
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="pl-3 pr-3 py-2 rounded-xl text-xs border outline-none transition-all w-48 focus:w-56"
              style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
            />
          </div>
          {onReset && (
            <motion.button
              onClick={onReset}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all"
              style={{ borderColor: c.border, color: c.textSec, background: c.cardBg }}
            >
              <RotateCcw size={13} /> Reset
            </motion.button>
          )}
          {onSave && (
            <motion.button
              onClick={onSave}
              disabled={saving}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20 transition-all disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Changes
            </motion.button>
          )}
        </div>
      </div>

      {/* ── Mobile search ── */}
      <div className="relative sm:hidden">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings..."
          className="w-full pl-3 pr-3 py-2 rounded-xl text-xs border outline-none transition-all"
          style={{ background: c.inputBg, borderColor: c.border, color: c.text }}
        />
      </div>

      {/* ── Main layout ── */}
      <div className="flex gap-5 relative">
        {/* Left nav (desktop) */}
        <nav
          className="hidden lg:block w-[220px] shrink-0 sticky top-0 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] pb-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}
        >
          <div
            className="rounded-2xl border p-2 space-y-0.5"
            style={{ background: c.cardBg, borderColor: c.border, backdropFilter: "blur(16px)" }}
          >
            {renderNavItems()}
          </div>
        </nav>

        {/* Mobile nav toggle */}
        <div className="lg:hidden fixed bottom-5 right-5 z-50">
          <motion.button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black flex items-center justify-center shadow-lg shadow-amber-500/30"
          >
            <Menu size={20} />
          </motion.button>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <motion.nav
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-0 bottom-0 w-[280px] border-r p-4 space-y-1 overflow-y-auto"
                style={{ background: isDark ? "#0c0d16" : "#ffffff", borderColor: c.border }}
              >
                <div className="flex items-center justify-between mb-4 px-2">
                  <span className="text-sm font-extrabold" style={{ color: c.text }}>Settings</span>
                  <button onClick={() => setMobileNavOpen(false)} className="p-1.5 rounded-lg hover:bg-white/5">
                    <X size={16} style={{ color: c.textSec }} />
                  </button>
                </div>
                {renderNavItems(() => setMobileNavOpen(false))}
              </motion.nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-72 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm font-semibold" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}>
                Loading your settings...
              </p>
            </motion.div>
          ) : (
            <motion.div key={pathname} {...sectionTransition}>
              {children}
            </motion.div>
          )}
        </div>
      </div>

      {/* Unsaved changes indicator */}
      <AnimatePresence>
        {hasChanges && onSave && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-2xl"
            style={{
              background: isDark ? "rgba(12,13,22,0.95)" : "rgba(255,255,255,0.95)",
              borderColor: c.border,
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 40px rgba(0,0,0,0.3)",
            }}
          >
            <span className="text-xs font-bold" style={{ color: c.text }}>You have unsaved changes</span>
            <motion.button
              onClick={onSave}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-xs font-bold"
            >
              Save Now
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
