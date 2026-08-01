"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { DashboardTopNav, DashboardSidebar } from "../page";
import type { AdyapanUser } from "../page";
import { FloatingOrbs } from "@/components/ui/PremiumComponents";

type SettingsNotification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  targetAudience?: string;
  priority?: string;
  isSystem?: boolean;
  createdAt: string;
};

function getUserId(): string {
  try {
    const raw = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
    if (raw) return (JSON.parse(raw) as { id?: string })?.id ?? "";
  } catch { /* ignore */ }
  return "";
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  useRequireAuth("USER");
  const router = useRouter();

  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<SettingsNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);

    try {
      const raw = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }

    api.get("/auth/me").then((res) => {
      setUser(res.data?.user ?? null);
    }).catch(() => { /* token invalid — interceptor will redirect */ });
  }, []);

  useEffect(() => {
    api.get("/notifications?limit=50").then((res) => {
      setNotifications(res.data?.notifications ?? []);
    }).catch(() => { });
    api.get("/notifications/unread-count").then((res) => {
      setUnreadCount(res.data?.count ?? 0);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sidebarOpen]);

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const go = (view?: string) => {
    router.push(`/dashboard/user/${getUserId()}${view ? `?view=${view}` : ""}`);
  };

  return (
    <div className="relative overflow-hidden" style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      <FloatingOrbs />

      <DashboardTopNav
        user={user}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onViewProfile={() => go("profile")}
        onAdyChat={() => go("ady-chat")}
        onViewTool={(tool: string) => go(tool)}
        onMenuToggle={() => setSidebarOpen((prev) => !prev)}
        notifications={notifications}
        setNotifications={setNotifications}
        unreadCount={unreadCount}
        onMarkAllRead={async () => {
          try {
            await api.put("/notifications/read-all");
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
          } catch { /* ignore */ }
        }}
        onClearAll={async () => {
          try {
            await api.delete("/notifications/clear");
            setNotifications([]);
            setUnreadCount(0);
          } catch { /* ignore */ }
        }}
        onPremium={() => router.push("/premium")}
        onViewSettings={() => router.push("/dashboard/user/settings/account")}
      />
      <DashboardSidebar
        activeView="settings"
        onViewDashboard={() => go()}
        onViewTool={(tool: string) => go(tool)}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <main className="dash-main relative z-10 resume-hub-theme">{children}</main>

      <style>{`
        @media (max-width: 768px) {
          .dash-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
