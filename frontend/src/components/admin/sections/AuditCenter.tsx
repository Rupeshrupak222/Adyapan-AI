"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import {
  Search, Shield, Users, Settings,
  FileText, Server, Clock,
  Filter, Loader2,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { cn } from "@/lib/cn";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
}

const MODULE_FILTERS = [
  { id: "all", label: "All", icon: <Filter size={12} /> },
  { id: "Platform", label: "Platform", icon: <Server size={12} /> },
  { id: "Billing", label: "Billing", icon: <FileText size={12} /> },
  { id: "Resume Hub", label: "Resume", icon: <FileText size={12} /> },
  { id: "Learning Hub", label: "Learning", icon: <Settings size={12} /> },
  { id: "Coding Hub", label: "Coding", icon: <Server size={12} /> },
  { id: "Interview Hub", label: "Interview", icon: <Users size={12} /> },
  { id: "Ady Chat", label: "Ady Chat", icon: <Shield size={12} /> },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function moduleIcon(module: string) {
  switch (module) {
    case "Platform": return <Server size={11} />;
    case "Billing": return <FileText size={11} />;
    case "Resume Hub": return <FileText size={11} />;
    case "Learning Hub": return <Settings size={11} />;
    case "Coding Hub": return <Server size={11} />;
    case "Interview Hub": return <Users size={11} />;
    default: return <Shield size={11} />;
  }
}

function moduleColor(module: string): string {
  switch (module) {
    case "Platform": return "#38bdf8";
    case "Billing": return "#10b981";
    case "Resume Hub": return "#f59e0b";
    case "Learning Hub": return "#818cf8";
    case "Coding Hub": return "#38bdf8";
    case "Interview Hub": return "#f472b6";
    default: return "var(--text-muted)";
  }
}

export default function AuditCenter() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/activity");
      if (res.data.success && Array.isArray(res.data.activities)) {
        const mapped: AuditEntry[] = res.data.activities.map((a: any, i: number) => ({
          id: a.id || `act-${i}`,
          timestamp: a.time ? new Date(a.time).toISOString() : new Date().toISOString(),
          user: a.user || "Unknown",
          action: a.action || "Activity",
          module: a.module || "Platform",
        }));
        setAuditLogs(mapped);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error("[AuditCenter] fetch error", err);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const filtered = useMemo(() => {
    return auditLogs.filter((entry) => {
      const matchesSearch = search === "" ||
        entry.user.toLowerCase().includes(search.toLowerCase()) ||
        entry.action.toLowerCase().includes(search.toLowerCase()) ||
        entry.module.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = activeFilter === "all" || entry.module === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter, auditLogs]);

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Audit Center"
        description="Recent platform activity across all hubs"
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
            placeholder="Search activity..."
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
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          ) : (
            <table className="w-full text-left" style={{ minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  {["Timestamp", "User", "Action", "Module"].map((h) => (
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
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{entry.user}</span>
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
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center">
                      <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                        No audit entries match your search criteria
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
