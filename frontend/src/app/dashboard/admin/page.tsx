"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
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
};

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  useRequireAuth("ADMIN");

  const [activeSection, setActiveSection] = useState("executive");
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    </div>
  );
}
