"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Bot, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import dynamic from "next/dynamic";
import { api } from "@/services/api";

const ExecutiveDashboard = dynamic(() => import("@/components/admin/sections/ExecutiveDashboard"), {
  loading: () => <PageLoading />,
});
const OperationsCenter = dynamic(() => import("@/components/admin/sections/OperationsCenter"), {
  loading: () => <PageLoading />,
});
const UserManagement = dynamic(() => import("@/components/admin/sections/UserManagement"), {
  loading: () => <PageLoading />,
});
const OrganizationManagement = dynamic(() => import("@/components/admin/sections/OrganizationManagement"), {
  loading: () => <PageLoading />,
});
const AIPlatform = dynamic(() => import("@/components/admin/sections/AIPlatform"), {
  loading: () => <PageLoading />,
});
const FeatureManagement = dynamic(() => import("@/components/admin/sections/FeatureManagement"), {
  loading: () => <PageLoading />,
});
const LearningEcosystem = dynamic(() => import("@/components/admin/sections/LearningEcosystem"), {
  loading: () => <PageLoading />,
});
const PlacementEcosystem = dynamic(() => import("@/components/admin/sections/PlacementEcosystem"), {
  loading: () => <PageLoading />,
});
const ContentManagement = dynamic(() => import("@/components/admin/sections/ContentManagement"), {
  loading: () => <PageLoading />,
});
const BlogManagement = dynamic(() => import("@/components/admin/sections/BlogManagement"), {
  loading: () => <PageLoading />,
});
const BillingFinance = dynamic(() => import("@/components/admin/sections/BillingFinance"), {
  loading: () => <PageLoading />,
});
const AnalyticsBI = dynamic(() => import("@/components/admin/sections/AnalyticsBI"), {
  loading: () => <PageLoading />,
});
const Monitoring = dynamic(() => import("@/components/admin/sections/Monitoring"), {
  loading: () => <PageLoading />,
});
const SecurityCenter = dynamic(() => import("@/components/admin/sections/SecurityCenter"), {
  loading: () => <PageLoading />,
});
const Infrastructure = dynamic(() => import("@/components/admin/sections/Infrastructure"), {
  loading: () => <PageLoading />,
});
const Integrations = dynamic(() => import("@/components/admin/sections/Integrations"), {
  loading: () => <PageLoading />,
});
const AuditCenter = dynamic(() => import("@/components/admin/sections/AuditCenter"), {
  loading: () => <PageLoading />,
});
const NotificationsSection = dynamic(() => import("@/components/admin/sections/Notifications"), {
  loading: () => <PageLoading />,
});
const DeveloperCenter = dynamic(() => import("@/components/admin/sections/DeveloperCenter"), {
  loading: () => <PageLoading />,
});
const AICopilot = dynamic(() => import("@/components/admin/sections/AICopilot"), {
  loading: () => <PageLoading />,
});
const SystemSettings = dynamic(() => import("@/components/admin/sections/SystemSettings"), {
  loading: () => <PageLoading />,
});
const SupportTickets = dynamic(() => import("@/components/admin/sections/SupportTickets"), {
  loading: () => <PageLoading />,
});

function PageLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
    </div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000",
        padding: "12px 22px", borderRadius: 12,
        boxShadow: "0 10px 25px rgba(245,158,11,0.4)",
        fontSize: "0.88rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8
      }}
    >
      <CheckCircle2 size={18} />
      {message}
    </motion.div>
  );
}

const sectionComponents: Record<string, React.ComponentType> = {
  executive: ExecutiveDashboard,
  operations: OperationsCenter,
  users: UserManagement,
  organizations: OrganizationManagement,
  "ai-platform": AIPlatform,
  features: FeatureManagement,
  learning: LearningEcosystem,
  placement: PlacementEcosystem,
  content: ContentManagement,
  "blog-management": BlogManagement,
  billing: BillingFinance,
  analytics: AnalyticsBI,
  monitoring: Monitoring,
  security: SecurityCenter,
  infrastructure: Infrastructure,
  integrations: Integrations,
  audit: AuditCenter,
  notifications: NotificationsSection,
  developer: DeveloperCenter,
  "ai-copilot": AICopilot,
  settings: SystemSettings,
  support: SupportTickets,
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth("ADMIN");

  const [activeSection, setActiveSection] = useState("executive");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState("dark");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ingestLoading, setIngestLoading] = useState(false);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("adyapan-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  useEffect(() => {
    const t = localStorage.getItem("adyapan-theme") || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    const savedSection = localStorage.getItem("admin-active-section");
    if (savedSection && sectionComponents[savedSection]) {
      setActiveSection(savedSection);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("admin-active-section", activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (user) setInitialLoading(false);
  }, [user]);

  useEffect(() => {
    // Preload primary admin section JS modules during idle time for instant tab switching
    const timer = setTimeout(() => {
      import("@/components/admin/sections/UserManagement");
      import("@/components/admin/sections/OrganizationManagement");
      import("@/components/admin/sections/AIPlatform");
      import("@/components/admin/sections/PlacementEcosystem");
      import("@/components/admin/sections/OperationsCenter");
      import("@/components/admin/sections/AnalyticsBI");
    }, 800);
    return () => clearTimeout(timer);
  }, []);


  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setToastMsg("Dashboard refreshed");
  }, []);

  const handleIngestJobs = useCallback(async () => {
    setIngestLoading(true);
    try {
      await api.post("/admin/jobs/ingest");
      setToastMsg("Job ingestion triggered");
    } catch {
      setToastMsg("Failed to trigger ingestion");
    } finally {
      setIngestLoading(false);
    }
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-dark)" }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#f59e0b" }} />
          <div className="text-sm font-bold tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Loading Executive Dashboard...
          </div>
        </div>
      </div>
    );
  }

  const isDark = theme === "dark";
  const SectionComponent = sectionComponents[activeSection] || ExecutiveDashboard;

  return (
    <div style={{ minHeight: "100vh", background: isDark ? "#080c10" : "#f8fafc", color: "var(--text-primary)" }}>
      <AnimatePresence>
        {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
      </AnimatePresence>

      <AdminHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
        onRefresh={handleRefresh}
        onAddJob={() => setActiveSection("placement")}
        onIngestJobs={handleIngestJobs}
        ingestLoading={ingestLoading}
      />

      <AdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        theme={theme}
      />

      <main className="dash-main flex-1" style={{ background: "transparent" }}>
        <div className="max-w-7xl mx-auto space-y-6">
          <motion.div
            key={`${activeSection}-${refreshKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SectionComponent />
          </motion.div>
        </div>
      </main>

      {/* ── Floating Animated AI Copilot Circle Button & Drawer (Right Lower Corner) ── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-auto">
        <AnimatePresence>
          {copilotOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="mb-4 w-[430px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-7rem)] rounded-3xl border shadow-2xl overflow-hidden flex flex-col"
              style={{
                background: isDark ? "#0c131a" : "#ffffff",
                borderColor: isDark ? "rgba(245,158,11,0.25)" : "rgba(245,158,11,0.3)",
                boxShadow: isDark
                  ? "0 25px 50px rgba(0,0,0,0.85), 0 0 35px rgba(245,158,11,0.2)"
                  : "0 25px 50px rgba(0,0,0,0.18), 0 0 25px rgba(245,158,11,0.12)",
              }}
            >
              {/* Drawer Header */}
              <div
                className="px-5 py-3.5 flex items-center justify-between border-b shrink-0"
                style={{
                  background: isDark ? "rgba(15,23,32,0.92)" : "rgba(248,250,252,0.95)",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
                  >
                    <Bot size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                      AI Copilot
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </h3>
                    <p className="text-[10px] text-amber-500 font-semibold leading-tight">Live Platform Operations Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setCopilotOpen(false)}
                  className="p-1.5 rounded-full transition-all hover:bg-white/10 cursor-pointer border-none"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body - AICopilot Component */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <AICopilot isDrawer={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Circle Button with Pulse Animation */}
        <div className="relative">
          {/* Pulsing Backlight Glow */}
          <motion.div
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-amber-500/35 blur-md pointer-events-none"
          />

          <motion.button
            whileHover={{ scale: 1.12, boxShadow: "0 12px 35px rgba(245,158,11,0.6)" }}
            whileTap={{ scale: 0.92 }}
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
            }}
            onClick={() => setCopilotOpen(!copilotOpen)}
            className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer border-none relative z-10 shadow-2xl transition-all"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "#000",
              boxShadow: "0 10px 28px rgba(245,158,11,0.45)",
            }}
            title="Open AI Copilot"
          >
            {copilotOpen ? <X size={24} /> : <Bot size={26} />}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
