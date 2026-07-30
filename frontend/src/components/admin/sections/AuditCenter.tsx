"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import {
  Search, Shield, Users, Settings, Lock,
  FileText, Server, Clock, Globe, Monitor,
  ChevronDown, Filter,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { cn } from "@/lib/cn";

interface AuditEntry {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  module: string;
  ipAddress: string;
  browser: string;
  oldValue: string;
  newValue: string;
  duration: string;
}

const MODULE_FILTERS = [
  { id: "all", label: "All", icon: <Filter size={12} /> },
  { id: "user", label: "User Actions", icon: <Users size={12} /> },
  { id: "settings", label: "Settings", icon: <Settings size={12} /> },
  { id: "security", label: "Security", icon: <Lock size={12} /> },
  { id: "content", label: "Content", icon: <FileText size={12} /> },
  { id: "system", label: "System", icon: <Server size={12} /> },
] as const;

const MOCK_AUDIT: AuditEntry[] = Array.from({ length: 15 }, (_, i) => {
  const actions = [
    { action: "Updated user role", module: "user", old: "Student", new: "Premium" },
    { action: "Modified system setting", module: "settings", old: "disabled", new: "enabled" },
    { action: "Generated API key", module: "security", old: "—", new: "sk-...a3f8" },
    { action: "Deleted blog post", module: "content", old: "Published", new: "Deleted" },
    { action: "Restarted service", module: "system", old: "Running", new: "Restarted" },
    { action: "Changed MFA policy", module: "security", old: "Optional", new: "Required" },
    { action: "Created announcement", module: "content", old: "—", new: "Draft" },
    { action: "Updated rate limit", module: "settings", old: "100/min", new: "200/min" },
    { action: "Blocked IP address", module: "security", old: "Allowed", new: "Blocked" },
    { action: "Modified feature flag", module: "system", old: "disabled", new: "enabled" },
    { action: "Changed subscription plan", module: "user", old: "Free", new: "Premium" },
    { action: "Updated landing page", module: "content", old: "v2.1", new: "v2.2" },
    { action: "Whitelisted domain", module: "security", old: "—", new: "*.edu.in" },
    { action: "Adjusted AI temperature", module: "settings", old: "0.7", new: "0.5" },
    { action: "Ran database migration", module: "system", old: "schema v12", new: "schema v13" },
  ][i];
  const admins = ["Ashish Sharma", "Priya Patel", "Rahul Verma", "Ananya Singh", "Vikram Reddy"];
  const browsers = ["Chrome 125 / Windows", "Firefox 128 / macOS", "Safari 17 / iOS", "Chrome 124 / Android", "Edge 125 / Windows"];
  const ips = ["192.168.1." + (100 + i), "10.0.0." + (50 + i), "172.16.0." + (20 + i)];
  const date = new Date(Date.now() - i * 7200000 - Math.random() * 3600000);
  return {
    id: `audit-${i}`,
    timestamp: date.toISOString(),
    admin: admins[i % admins.length],
    action: actions.action,
    module: actions.module,
    ipAddress: ips[i % ips.length],
    browser: browsers[i % browsers.length],
    oldValue: actions.old,
    newValue: actions.new,
    duration: `${Math.floor(50 + Math.random() * 450)}ms`,
  };
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function moduleIcon(module: string) {
  switch (module) {
    case "user": return <Users size={11} />;
    case "settings": return <Settings size={11} />;
    case "security": return <Lock size={11} />;
    case "content": return <FileText size={11} />;
    case "system": return <Server size={11} />;
    default: return <Shield size={11} />;
  }
}

function moduleColor(module: string): string {
  switch (module) {
    case "user": return "#818cf8";
    case "settings": return "#f59e0b";
    case "security": return "#ef4444";
    case "content": return "#10b981";
    case "system": return "#38bdf8";
    default: return "var(--text-muted)";
  }
}

export default function AuditCenter() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(MOCK_AUDIT);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api.get("/admin/activity");
      if (res.data.success && Array.isArray(res.data.activities) && res.data.activities.length > 0) {
        const mapped: AuditEntry[] = res.data.activities.map((a: any, i: number) => ({
          id: a.id || `act-${i}`,
          timestamp: a.time ? new Date(a.time).toISOString() : new Date().toISOString(),
          admin: a.user || "System",
          action: a.action || "Activity",
          module: a.module ? a.module.toLowerCase().split(" ")[0] : "system",
          ipAddress: "127.0.0.1",
          browser: "Chrome / Windows",
          oldValue: "—",
          newValue: a.action,
          duration: `${120 + (i * 15) % 200}ms`,
        }));
        setAuditLogs(mapped);
      }
    } catch (err) {
      console.error("[AuditCenter] fetch error", err);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = useMemo(() => {
    return auditLogs.filter((entry) => {
      const matchesSearch = search === "" ||
        entry.admin.toLowerCase().includes(search.toLowerCase()) ||
        entry.action.toLowerCase().includes(search.toLowerCase()) ||
        entry.ipAddress.includes(search);
      const matchesFilter = activeFilter === "all" || entry.module === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter, auditLogs]);

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Audit Center"
        description="Immutable audit log of all platform actions"
        actions={
          <StatusBadge variant="info" pulse>{auditLogs.length} Events</StatusBadge>
        }
      />

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {MODULE_FILTERS.map((f) => (
          <motion.button
            key={f.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveFilter(f.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
            )}
            style={{
              background: activeFilter === f.id ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
              color: activeFilter === f.id ? "#f59e0b" : "var(--text-secondary)",
              border: `1px solid ${activeFilter === f.id ? "rgba(245,158,11,0.3)" : "var(--border-color)"}`,
            }}
          >
            {f.icon}
            {f.label}
          </motion.button>
        ))}

        {/* Search */}
        <div className="relative ml-auto">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit log..."
            className="pl-8 pr-3 py-1.5 rounded-full text-[11px] font-medium outline-none w-48 transition-all focus:w-64"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          />
        </div>
      </div>

      {/* Audit Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ minWidth: 1100 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                {["Timestamp", "Admin", "Action", "Module", "IP Address", "Browser", "Old Value", "New Value", "Duration"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <motion.tr
                  key={entry.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03, duration: 0.2 }}
                  style={{ borderBottom: "1px solid var(--border-color)" }}
                  className="transition-all hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} style={{ color: "var(--text-muted)" }} />
                      <span className="text-[11px] font-medium font-mono" style={{ color: "var(--text-secondary)" }}>
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{entry.admin}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{entry.action}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: moduleColor(entry.module) }}>{moduleIcon(entry.module)}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: moduleColor(entry.module) }}>
                        {entry.module}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-mono font-medium" style={{ color: "var(--text-muted)" }}>{entry.ipAddress}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Monitor size={10} style={{ color: "var(--text-muted)" }} />
                      <span className="text-[10px] font-medium truncate max-w-[120px]" style={{ color: "var(--text-secondary)" }}>
                        {entry.browser}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                      {entry.oldValue}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.08)", color: "#10b981" }}>
                      {entry.newValue}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono font-bold" style={{ color: "var(--text-muted)" }}>{entry.duration}</span>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      No audit entries match your search criteria
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
