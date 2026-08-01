"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard, Activity, Users, Building2, Brain, ToggleLeft,
  GraduationCap, Briefcase, FileText, CreditCard, BarChart3,
  ActivitySquare, Shield, Server, Puzzle, ScrollText,
  Bell, Terminal, Bot, Settings, LifeBuoy,
} from "lucide-react";

interface SidebarSectionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const sidebarSections: SidebarSectionItem[] = [
  { id: "executive", label: "Executive Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "operations", label: "Operations Center", icon: <Activity size={18} /> },
  { id: "users", label: "User Management", icon: <Users size={18} /> },
  { id: "organizations", label: "Organizations", icon: <Building2 size={18} /> },
  { id: "ai-platform", label: "AI Platform", icon: <Brain size={18} /> },
  { id: "features", label: "Feature Management", icon: <ToggleLeft size={18} /> },
  { id: "learning", label: "Learning Ecosystem", icon: <GraduationCap size={18} /> },
  { id: "placement", label: "Placement Ecosystem", icon: <Briefcase size={18} /> },
  { id: "content", label: "Content Management", icon: <FileText size={18} /> },
  { id: "billing", label: "Billing & Finance", icon: <CreditCard size={18} /> },
  { id: "analytics", label: "Analytics & BI", icon: <BarChart3 size={18} /> },
  { id: "monitoring", label: "Monitoring", icon: <ActivitySquare size={18} /> },
  { id: "security", label: "Security Center", icon: <Shield size={18} /> },
  { id: "infrastructure", label: "Infrastructure", icon: <Server size={18} /> },
  { id: "integrations", label: "Integrations", icon: <Puzzle size={18} /> },
  { id: "audit", label: "Audit Center", icon: <ScrollText size={18} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
  { id: "support", label: "Support Center", icon: <LifeBuoy size={18} /> },
  { id: "developer", label: "Developer Center", icon: <Terminal size={18} /> },
  { id: "settings", label: "System Settings", icon: <Settings size={18} /> },
];

interface AdminSidebarProps {
  activeSection: string;
  setActiveSection: (id: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  theme: string;
}

export function AdminSidebar({ activeSection, setActiveSection, sidebarOpen, setSidebarOpen, theme }: AdminSidebarProps) {
  const isDark = theme === "dark";

  return (
    <>
      {sidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, top: 70, zIndex: 119,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          }}
        />
      )}
      <aside
        className={`dash-sidebar ${sidebarOpen ? "open" : ""}`}
        style={{
          background: isDark ? "rgba(6,11,14,0.92)" : "rgba(255,255,255,0.95)",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
          width: sidebarOpen ? 220 : undefined,
        }}
      >
        <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {sidebarSections.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.12 }}
                onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.55rem 0.5rem", borderRadius: 12, marginBottom: 1,
                  color: isActive ? "#f59e0b" : "var(--text-secondary)",
                  background: isActive ? "rgba(245,158,11,0.1)" : "transparent",
                  border: isActive ? "1px solid rgba(245,158,11,0.2)" : "1px solid transparent",
                  fontWeight: isActive ? 700 : 500, fontSize: "0.82rem",
                  cursor: "pointer", width: "100%", textAlign: "left", whiteSpace: "nowrap",
                }}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span className="sb-label" style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
                {item.badge && (
                  <span className="sb-arrow" style={{ marginLeft: "auto" }}>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
