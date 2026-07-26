"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  DashboardSidebar,
  DashboardTopNav,
  AdyapanUser,
} from "../../user/page";

const CodingAssessmentView = dynamic(
  () => import("@/components/placement-hub/CodingAssessmentView").then(m => m.CodingAssessmentView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[400px] flex flex-col gap-4 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 backdrop-blur-md animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-6 w-48 bg-amber-500/20 rounded-md"></div>
          <div className="h-8 w-8 bg-amber-500/20 rounded-full"></div>
        </div>
        <div className="flex-1 flex flex-col gap-3 justify-center">
          <div className="h-4 w-full bg-amber-500/10 rounded-md"></div>
          <div className="h-4 w-5/6 bg-amber-500/10 rounded-md"></div>
          <div className="h-4 w-2/3 bg-amber-500/10 rounded-md"></div>
        </div>
      </div>
    )
  }
);

export default function CodingAssessmentPage() {
  useRequireAuth("USER");
  const router = useRouter();
  const [user, setUser] = useState<AdyapanUser | null>(null);
  const [theme, setTheme] = useState("dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const savedTheme = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    try {
      const raw = localStorage.getItem("adyapan-user") || sessionStorage.getItem("adyapan-user");
      if (raw) setUser(JSON.parse(raw) as AdyapanUser);
    } catch {}
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const handleThemeToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleViewProfile = () => router.push("/profile");
  const handlePremium = () => router.push("/premium");
  const handleViewDashboard = () => router.push("/dashboard/user");
  const handleAdyChat = () => {
    localStorage.setItem("dashboard-active-view", "ady-chat");
    router.push("/dashboard/user");
  };
  const handleViewTool = (tool: string) => {
    localStorage.setItem("dashboard-active-view", tool);
    router.push("/dashboard/user");
  };

  return (
    <div className="relative overflow-hidden font-sans" style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      <DashboardTopNav
        user={user} theme={theme}
        onThemeToggle={handleThemeToggle}
        onViewProfile={handleViewProfile}
        onAdyChat={handleAdyChat}
        onViewTool={handleViewTool}
        onMenuToggle={() => setSidebarOpen(p => !p)}
        notifications={notifications}
        setNotifications={setNotifications}
        unreadCount={unreadCount}
        onMarkAllRead={() => {}}
        onClearAll={() => {}}
        onPremium={handlePremium}
        onViewSettings={() => handleViewTool("settings")}
      />
      <DashboardSidebar activeView="placement" onViewDashboard={handleViewDashboard} onViewTool={handleViewTool} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <main className="dash-main relative z-10 font-sans p-6 md:p-8">
        <CodingAssessmentView setView={handleViewTool} />
      </main>
    </div>
  );
}
