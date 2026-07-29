"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import {
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Brain,
  User,
  Shield,
  Server,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
  Filter,
  Loader2,
  AlertCircle,
  Zap,
  Monitor,
  Database,
  Globe,
  Lock,
  LogIn,
  LogOut,
  CreditCard,
  UserPlus,
  UserMinus,
  Settings,
  Copy,
  Trash2,
  Edit3,
  Eye,
  Bell,
  Terminal,
  HardDrive,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────

interface ActivityItem {
  time: string;
  user: string;
  action: string;
  module: string;
  id: string;
  status?: string;
}

interface ApiResponse {
  success: boolean;
  activities: ActivityItem[];
}

type FilterTab = "all" | "errors" | "payments" | "ai" | "users" | "security" | "infrastructure";

interface FilterDef {
  id: FilterTab;
  label: string;
  icon: React.ReactNode;
}

// ─── Filter Configuration ────────────────────────────────────────────────

const FILTERS: FilterDef[] = [
  { id: "all", label: "All", icon: <Activity size={13} /> },
  { id: "errors", label: "Errors", icon: <AlertTriangle size={13} /> },
  { id: "payments", label: "Payments", icon: <DollarSign size={13} /> },
  { id: "ai", label: "AI", icon: <Brain size={13} /> },
  { id: "users", label: "Users", icon: <User size={13} /> },
  { id: "security", label: "Security", icon: <Shield size={13} /> },
  { id: "infrastructure", label: "Infrastructure", icon: <Server size={13} /> },
];

// ─── Module styling map ─────────────────────────────────────────────────

interface ModuleStyle {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  statusVariant: "success" | "warning" | "error" | "info" | "default";
  statusLabel: string;
}

const ERRORS_MODULES = ["errors", "error", "crash", "exception", "failure"];
const PAYMENTS_MODULES = ["payments", "payment", "billing", "invoice", "subscription", "revenue", "transaction"];
const AI_MODULES = ["ai", "model", "llm", "gemini", "gpt", "claude", "inference", "prediction"];
const USERS_MODULES = ["users", "user", "account", "profile", "auth", "registration", "login"];
const SECURITY_MODULES = ["security", "auth", "login", "access", "permission", "role", "admin", "shield"];
const INFRA_MODULES = ["infrastructure", "infra", "server", "deployment", "database", "network", "hosting", "system"];

function getModuleStyle(module: string): ModuleStyle {
  const m = module.toLowerCase();
  if (ERRORS_MODULES.some((k) => m.includes(k))) {
    return {
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.3)",
      icon: <XCircle size={14} />,
      statusVariant: "error",
      statusLabel: "Failed",
    };
  }
  if (PAYMENTS_MODULES.some((k) => m.includes(k))) {
    return {
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.3)",
      icon: <DollarSign size={14} />,
      statusVariant: "success",
      statusLabel: "Success",
    };
  }
  if (AI_MODULES.some((k) => m.includes(k))) {
    return {
      color: "#8b5cf6",
      bg: "rgba(139,92,246,0.12)",
      border: "rgba(139,92,246,0.3)",
      icon: <Brain size={14} />,
      statusVariant: "info",
      statusLabel: "Processed",
    };
  }
  if (USERS_MODULES.some((k) => m.includes(k))) {
    return {
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.12)",
      border: "rgba(59,130,246,0.3)",
      icon: <User size={14} />,
      statusVariant: "info",
      statusLabel: "Completed",
    };
  }
  if (SECURITY_MODULES.some((k) => m.includes(k))) {
    return {
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.3)",
      icon: <Shield size={14} />,
      statusVariant: "warning",
      statusLabel: "Flagged",
    };
  }
  if (INFRA_MODULES.some((k) => m.includes(k))) {
    return {
      color: "#06b6d4",
      bg: "rgba(6,182,212,0.12)",
      border: "rgba(6,182,212,0.3)",
      icon: <Server size={14} />,
      statusVariant: "default",
      statusLabel: "Operational",
    };
  }
  return {
    color: "var(--text-secondary)",
    bg: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.1)",
    icon: <Activity size={14} />,
    statusVariant: "default",
    statusLabel: "Info",
  };
}

// ─── Time formatting ───────────────────────────────────────────────────

function formatTimeRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek}w ago`;

  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimeAbsolute(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─── Module filter matching ────────────────────────────────────────────

function matchesFilter(item: ActivityItem, filter: FilterTab): boolean {
  if (filter === "all") return true;
  const m = item.module.toLowerCase();
  switch (filter) {
    case "errors":
      return ERRORS_MODULES.some((k) => m.includes(k));
    case "payments":
      return PAYMENTS_MODULES.some((k) => m.includes(k));
    case "ai":
      return AI_MODULES.some((k) => m.includes(k));
    case "users":
      return USERS_MODULES.some((k) => m.includes(k));
    case "security":
      return SECURITY_MODULES.some((k) => m.includes(k));
    case "infrastructure":
      return INFRA_MODULES.some((k) => m.includes(k));
    default:
      return true;
  }
}

// ─── Action icon helper ────────────────────────────────────────────────

function getActionIcon(action: string): React.ReactNode {
  const a = action.toLowerCase();
  if (a.includes("create") || a.includes("add") || a.includes("new") || a.includes("upload"))
    return <Copy size={12} />;
  if (a.includes("delete") || a.includes("remove") || a.includes("trash"))
    return <Trash2 size={12} />;
  if (a.includes("update") || a.includes("edit") || a.includes("change") || a.includes("modify"))
    return <Edit3 size={12} />;
  if (a.includes("login") || a.includes("sign in") || a.includes("authenticate"))
    return <LogIn size={12} />;
  if (a.includes("logout") || a.includes("sign out"))
    return <LogOut size={12} />;
  if (a.includes("payment") || a.includes("purchase") || a.includes("buy") || a.includes("subscribe"))
    return <CreditCard size={12} />;
  if (a.includes("view") || a.includes("read") || a.includes("access"))
    return <Eye size={12} />;
  if (a.includes("settings") || a.includes("config") || a.includes("preference"))
    return <Settings size={12} />;
  if (a.includes("notification") || a.includes("alert"))
    return <Bell size={12} />;
  return <Zap size={12} />;
}

// ─── Timeline Event Component ──────────────────────────────────────────

function TimelineEvent({
  event,
  isDark,
  index,
}: {
  event: ActivityItem;
  isDark: boolean;
  index: number;
}) {
  const style = getModuleStyle(event.module);
  const actionIcon = getActionIcon(event.action);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.3 }}
      className="flex items-start gap-3 group"
    >
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <motion.div
          whileHover={{ scale: 1.15 }}
          className="w-8 h-8 rounded-full flex items-center justify-center relative"
          style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
        >
          {style.icon}
        </motion.div>
        <div
          className="w-px flex-1 mt-1"
          style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {/* Left side: user, action */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-xs font-bold truncate max-w-[140px]"
                style={{ color: "var(--text-primary)" }}
              >
                {event.user}
              </span>
              <span
                className="text-xs truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {event.action}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-1.5">
              {/* Module badge */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
              >
                {event.module}
              </span>

              {/* Status indicator */}
              <StatusBadge variant={style.statusVariant} pulse>
                {style.statusLabel}
              </StatusBadge>

              {/* Time */}
              <span
                className="text-[10px] font-medium flex items-center gap-1"
                style={{ color: "var(--text-muted)" }}
              >
                <Clock size={10} />
                <span title={formatTimeAbsolute(event.time)}>
                  {formatTimeRelative(event.time)}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────

function EmptyState({ filter, isDark }: { filter: FilterTab; isDark: boolean }) {
  const label = filter === "all" ? "" : ` ${filter}`;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{
          background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        }}
      >
        <Activity size={28} style={{ color: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
      </div>
      <p className="text-sm font-bold" style={{ color: "var(--text-secondary)" }}>
        No{label} activities
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {filter === "all"
          ? "Platform activity will appear here in real-time"
          : `No events matching "${filter}" have been recorded yet`}
      </p>
    </motion.div>
  );
}

// ─── Loading State ─────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--text-secondary)" }} />
        <p className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>
          Loading activity feed...
        </p>
      </div>
    </div>
  );
}

// ========================================================================
// MAIN COMPONENT
// ========================================================================

interface OperationsCenterProps {
  /** Optional initial data — if not provided, component fetches itself */
  initialActivities?: ActivityItem[];
}

export default function OperationsCenter({ initialActivities }: OperationsCenterProps) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities ?? []);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(!initialActivities);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch activity data ──────────────────────────────────────────────

  const fetchActivities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await api.get<ApiResponse>("/admin/activity");
      if (res.data.success) {
        setActivities(res.data.activities);
      } else {
        setError("Failed to load activity data");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialActivities) {
      fetchActivities();
    }
  }, [fetchActivities, initialActivities]);

  // ── Filtered activities ──────────────────────────────────────────────

  const filteredActivities = useMemo(() => {
    return activities
      .filter((item) => matchesFilter(item, activeFilter))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [activities, activeFilter]);

  // ── Filter counts ────────────────────────────────────────────────────

  const filterCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: activities.length,
      errors: 0,
      payments: 0,
      ai: 0,
      users: 0,
      security: 0,
      infrastructure: 0,
    };
    for (const item of activities) {
      for (const f of FILTERS) {
        if (f.id !== "all" && matchesFilter(item, f.id)) {
          counts[f.id]++;
        }
      }
    }
    return counts;
  }, [activities]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="Operations Center"
        description="Real-time platform activity, events, and system operations"
        actions={
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => fetchActivities(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
            style={{
              background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
              color: "var(--text-secondary)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
            }}
          >
            <motion.span
              animate={refreshing ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={13} />
            </motion.span>
            {refreshing ? "Refreshing..." : "Refresh"}
          </motion.button>
        }
      />

      {/* Filter Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-2xl border overflow-x-auto"
        style={{
          background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        }}
      >
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <motion.button
              key={f.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveFilter(f.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all"
              style={{
                background: isActive
                  ? isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"
                  : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.5 }}>{f.icon}</span>
              {f.label}
              {filterCounts[f.id] > 0 && (
                <span
                  className="ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                  style={{
                    background: isActive
                      ? isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
                      : isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    color: "var(--text-muted)",
                  }}
                >
                  {filterCounts[f.id]}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div
        className="rounded-2xl border"
        style={{
          background: "var(--bg-card)",
          borderColor: "var(--border-color)",
        }}
      >
        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 mx-4 mt-4 rounded-xl"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
            <div className="text-xs font-medium" style={{ color: "#ef4444" }}>
              {error}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => fetchActivities()}
              className="ml-auto px-3 py-1 rounded-lg text-[10px] font-bold"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              Retry
            </motion.button>
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <LoadingState />
          ) : filteredActivities.length === 0 ? (
            <EmptyState filter={activeFilter} isDark={isDark} />
          ) : (
            <div className="max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="space-y-0">
                {filteredActivities.map((event, idx) => (
                  <TimelineEvent
                    key={`${event.id}-${idx}`}
                    event={event}
                    isDark={isDark}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer summary */}
        {!loading && filteredActivities.length > 0 && (
          <div
            className="flex items-center justify-between px-5 py-3 border-t text-[10px] font-medium rounded-b-2xl"
            style={{
              borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
              background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
              color: "var(--text-muted)",
            }}
          >
            <span className="flex items-center gap-1.5">
              <Activity size={11} />
              Showing {filteredActivities.length} of {activities.length} events
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={11} />
              Live feed
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
