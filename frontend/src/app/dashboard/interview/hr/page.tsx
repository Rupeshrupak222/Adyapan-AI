"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  DashboardSidebar,
  DashboardTopNav,
} from "@/components/dashboard-shell";
import type { AdyapanUser } from "@/components/dashboard-shell";

const HRView = dynamic(
  () => import("@/components/interview-hub/hr-engine/HRView").then(m => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#080710] flex items-center justify-center" style={{ fontFamily: "var(--font-sans)" }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20 animate-pulse">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="text-white text-lg font-bold">Loading HR Interview Engine...</h2>
          <p className="text-white/40 text-sm">Preparing your AI-powered HR interview experience</p>
        </div>
      </div>
    )
  }
);

export default function HRInterviewPage() {
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
      const t = document.documentElement.getAttribute("data-theme") || "dark";
      setTheme(t);
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

  const handleViewDashboard = () => router.push("/dashboard/user");
  const handleViewTool = (tool: string) => {
    if (tool === "interview-engine") router.push("/dashboard/interview/engine");
    else if (tool === "interview") router.push("/dashboard/interview");
    else if (tool === "hr-interview") router.push("/dashboard/interview/hr");
    else router.push("/dashboard/user");
  };
  const handleViewProfile = () => {};
  const handleAdyChat = () => {};
  const handlePremium = () => {};
  const handleViewSettings = () => {};

  return (
    <div className="relative overflow-hidden" style={{ minHeight: "100vh", background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      <DashboardTopNav
        user={user}
        theme={theme}
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
        onViewSettings={handleViewSettings}
      />
      <DashboardSidebar
        activeView="interview"
        onViewDashboard={handleViewDashboard}
        onViewTool={handleViewTool}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <main className="dash-main relative z-10">
        <HRView theme={theme} />
      </main>
    </div>
  );
}
