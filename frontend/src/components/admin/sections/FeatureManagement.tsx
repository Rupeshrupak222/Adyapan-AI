"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Download, RefreshCw, Loader2, Filter, Check, X,
  ToggleLeft, ToggleRight, Settings2, Trash2, Activity, Globe2,
  Layers, Sparkles, Zap, AlertTriangle, Rocket, Crown, Clock,
  ChevronLeft, ChevronRight, ChevronDown, BarChart3, GitBranch,
  ShieldCheck, KeyRound, Gauge, Users, DollarSign, Cpu, MousePointerClick,
  CircleDot, Flag, ListFilter, MoreHorizontal, Edit3, Copy, Undo2,
  Boxes, Workflow, Eye, Pencil, Ban, Play,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Cell,
} from "recharts";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

interface FlagInfo {
  id?: string;
  key: string;
  name: string;
  environment: string;
  isEnabled: boolean;
  rolloutPct: number;
  status: string;
  targetType: string;
  targetUsers: any[];
  targetRoles: any[];
  targetUniversities: any[];
  targetCountries: any[];
  updatedAt?: string;
}

interface UsageInfo {
  totalRequests: number;
  totalUsers: number;
  successRate: number;
  errors: number;
  avgResponseMs: number;
  revenue: number;
  aiTokens: number;
  today: number;
}

interface DepRef {
  id: string;
  key: string;
  name: string;
  status: string;
}

interface FeatureRow {
  id: string;
  key: string;
  name: string;
  description?: string;
  module: string;
  category: string;
  status: string;
  environment: string;
  accessLevel: string;
  version: string;
  owner?: string;
  isPremium: boolean;
  isBeta: boolean;
  apiEndpoint?: string;
  rateLimit?: number;
  notes?: string;
  lastDeployedAt?: string;
  createdAt?: string;
  updatedAt: string;
  flag: FlagInfo | null;
  usage: UsageInfo | null;
  dependencies: DepRef[];
  dependentCount: number;
}

interface Stats {
  total: number;
  enabled: number;
  disabled: number;
  beta: number;
  experimental: number;
  deprecated: number;
  premium: number;
  recentlyUpdated: number;
}

interface MetaData {
  categories: string[];
  statuses: string[];
  accessLevels: string[];
  environments: string[];
  roles: string[];
  modules: string[];
  owners: string[];
}

interface FeaturesResponse {
  success: boolean;
  environment: string;
  stats: Stats;
  features: FeatureRow[];
  meta: MetaData;
}

interface UsagePoint {
  date: string;
  requests: number;
  users: number;
  success: number;
  errors: number;
  avgResponseMs: number;
  revenue: number;
  aiTokens: number;
}

interface PermissionRow {
  role: string;
  canView: boolean;
  canEdit: boolean;
  canToggle: boolean;
  canRollout: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
}

interface LogRow {
  id: string;
  action: string;
  changedBy?: string;
  details: any;
  createdAt: string;
}

interface FeatureDetail extends FeatureRow {
  dependents: DepRef[];
  usageSeries: UsagePoint[];
  dependencyGraph: {
    nodes: { id: string; key: string; name: string; status: string; root?: boolean }[];
    edges: { source: string; target: string }[];
  };
  rolloutHistory: {
    id: string;
    environment: string;
    rolloutPct: number;
    isEnabled: boolean;
    targetType: string;
    changedBy?: string;
    reason?: string;
    createdAt: string;
  }[];
  permissions: PermissionRow[];
  logs: LogRow[];
}

// ═══════════════════════════════════════════════════════════════════
// Constants / Meta
// ═══════════════════════════════════════════════════════════════════

const STATUS_META: Record<string, { color: string; bg: string; border: string }> = {
  Enabled: { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" },
  Disabled: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", border: "rgba(107,114,128,0.3)" },
  Beta: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.35)" },
  Experimental: { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.35)" },
  Maintenance: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.35)" },
  "Coming Soon": { color: "#f472b6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.35)" },
  Deprecated: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
  Internal: { color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.35)" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Authentication: "#818cf8",
  Dashboard: "#38bdf8",
  "Learning Hub": "#10b981",
  "Coding Hub": "#a78bfa",
  "Resume Hub": "#f59e0b",
  "Interview Hub": "#f472b6",
  "Placement Hub": "#34d399",
  "Research Hub": "#fb923c",
  "AI Productivity": "#e879f9",
  Payments: "#fbbf24",
  Notifications: "#22d3ee",
  Analytics: "#60a5fa",
  Storage: "#94a3b8",
  Admin: "#f87171",
  System: "#c4b5fd",
  API: "#2dd4bf",
  Security: "#4ade80",
};

const ACCESS_META: Record<string, { color: string; bg: string }> = {
  All: { color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  Premium: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  Developer: { color: "#38bdf8", bg: "rgba(56,189,248,0.12)" },
  Internal: { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  Admin: { color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
};

const ROLLOUT_OPTIONS = [100, 50, 25, 10, 5, 1];

const ENV_COLORS: Record<string, string> = {
  Production: "#10b981",
  Staging: "#f59e0b",
  Development: "#38bdf8",
};

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function toTitle(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

interface ToastItem {
  id: number;
  type: "success" | "error" | "info";
  message: string;
  action?: { label: string; onClick: () => void };
}

// ═══════════════════════════════════════════════════════════════════
// Small shared UI
// ═══════════════════════════════════════════════════════════════════

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] || STATUS_META.Disabled;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
      {status}
    </span>
  );
}

function AccessPill({ level }: { level: string }) {
  const m = ACCESS_META[level] || ACCESS_META.All;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap"
      style={{ background: m.bg, color: m.color }}>
      {level === "Premium" && <Crown size={9} />}
      {level === "Internal" && <ShieldCheck size={9} />}
      {level === "Admin" && <Settings2 size={9} />}
      {level}
    </span>
  );
}

function EnvPill({ env }: { env: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold whitespace-nowrap" style={{ color: ENV_COLORS[env] || "#94a3b8" }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ENV_COLORS[env] || "#94a3b8" }} />
      {env}
    </span>
  );
}

function Toggle({ on, onChange, disabled, danger }: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 border-none"
      style={{
        background: on ? (danger ? "rgba(239,68,68,0.85)" : "#10b981") : "rgba(255,255,255,0.12)",
        boxShadow: on ? `0 0 12px ${danger ? "rgba(239,68,68,0.5)" : "rgba(16,185,129,0.45)"}` : "none",
      }}
    >
      <span
        className="inline-block w-3.5 h-3.5 rounded-full bg-white transition-transform"
        style={{ transform: on ? "translateX(18px)" : "translateX(3px)" }}
      />
    </button>
  );
}

function Skeleton({ className = "h-4", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`${className} rounded-lg animate-pulse`} style={{ background: "rgba(255,255,255,0.06)", ...style }} />
  );
}

// ═══════════════════════════════════════════════════════════════════
// Feature Modal (Create / Edit)
// ═══════════════════════════════════════════════════════════════════

interface FeatureFormValues {
  key: string;
  name: string;
  description: string;
  module: string;
  category: string;
  status: string;
  environment: string;
  accessLevel: string;
  version: string;
  owner: string;
  isPremium: boolean;
  apiEndpoint: string;
  rateLimit: string;
  notes: string;
  rolloutPct: number;
  isEnabled: boolean;
}

const EMPTY_FORM: FeatureFormValues = {
  key: "", name: "", description: "", module: "System", category: "System",
  status: "Enabled", environment: "Production", accessLevel: "All",
  version: "1.0.0", owner: "", isPremium: false, apiEndpoint: "", rateLimit: "100",
  notes: "", rolloutPct: 100, isEnabled: true,
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>{label}</span>
      {children}
      {hint && <span className="block text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-color)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "var(--text-primary)",
  outline: "none",
};

// ═══════════════════════════════════════════════════════════════════
// Dependency Mini-Graph (React Flow)
// ═══════════════════════════════════════════════════════════════════

import { ReactFlow, Background, BackgroundVariant, Controls, MarkerType, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function buildGraph(feature: FeatureDetail) {
  const { nodes, edges } = feature.dependencyGraph;
  const idToNode = new Map<string, { id: string; key: string; name: string; status: string; root?: boolean }>();
  for (const n of nodes) idToNode.set(n.id, n);

  // Compute depth from the root using BFS over dependency direction
  const depth = new Map<string, number>();
  const queue: { id: string; d: number }[] = [{ id: feature.id, d: 0 }];
  depth.set(feature.id, 0);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.source === cur.id && !depth.has(e.target)) {
        depth.set(e.target, cur.d + 1);
        queue.push({ id: e.target, d: cur.d + 1 });
      }
    }
  }
  for (const e of edges) {
    if (e.target === feature.id && !depth.has(e.source)) {
      depth.set(e.source, -1);
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    const arr = byLevel.get(d) || [];
    arr.push(n.id);
    byLevel.set(d, arr);
  }

  const rfNodes: Node[] = [];
  for (const n of nodes) {
    const d = depth.get(n.id) ?? 0;
    const level = byLevel.get(d) || [];
    const idx = level.indexOf(n.id);
    const count = level.length;
    const meta = STATUS_META[n.status] || STATUS_META.Enabled;
    rfNodes.push({
      id: n.id,
      position: { x: d * 220, y: (idx - (count - 1) / 2) * 64 + (n.id === feature.id ? 0 : 0) },
      data: { label: n.name, status: n.status, root: n.id === feature.id, color: meta.color },
    });
  }

  const rfEdges: Edge[] = edges.map((e) => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(148,163,184,0.6)", width: 14, height: 14 },
    style: { stroke: "rgba(148,163,184,0.35)", strokeWidth: 1.5 },
  }));

  return { rfNodes, rfEdges, depth, byLevel };
}

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════

export default function FeatureManagement() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<FeaturesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [accessFilter, setAccessFilter] = useState("all");
  const [envFilter, setEnvFilter] = useState("Production");
  const [premiumFilter, setPremiumFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Selection + pagination
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail drawer
  const [detail, setDetail] = useState<FeatureDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailTab, setDetailTab] = useState("overview");

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureRow | null>(null);
  const [rolloutFeature, setRolloutFeature] = useState<FeatureRow | null>(null);
  const [permFeature, setPermFeature] = useState<FeatureRow | null>(null);
  const [permRows, setPermRows] = useState<PermissionRow[]>([]);
  const [confirmState, setConfirmState] = useState<{
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastId = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const pushToast = useCallback((message: string, type: ToastItem["type"] = "success", action?: ToastItem["action"]) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, type, message, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 7000 : 4000);
  }, []);

  const fetchList = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const params: Record<string, string> = { environment: envFilter };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (moduleFilter !== "all") params.module = moduleFilter;
      if (accessFilter !== "all") params.accessLevel = accessFilter;
      if (premiumFilter === "true" || premiumFilter === "false") params.premium = premiumFilter;
      if (roleFilter !== "all") params.role = roleFilter;
      const res = await api.get<FeaturesResponse>("/admin/features", { params });
      if (res.data.success) setData(res.data);
      else setError("Failed to load features");
    } catch {
      setError("Failed to load features. Check server connectivity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, statusFilter, categoryFilter, moduleFilter, accessFilter, envFilter, premiumFilter, roleFilter]);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, categoryFilter, moduleFilter, accessFilter, envFilter, premiumFilter, roleFilter]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if ((e.key === "n" || e.key === "N") && !typing && !formOpen) {
        e.preventDefault();
        setEditing(null);
        setFormOpen(true);
      } else if (e.key === "Escape") {
        setConfirmState(null);
        setFormOpen(false);
        setRolloutFeature(null);
        setPermFeature(null);
        setDrawerOpen(false);
      } else if (e.key === "e" && (e.ctrlKey || e.metaKey) && !typing) {
        e.preventDefault();
        handleExport();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formOpen]);

  const fetchDetail = useCallback(async (featureId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get<{ success: boolean; feature: FeatureDetail }>(`/admin/features/${featureId}`, { params: { environment: envFilter } });
      if (res.data.success) {
        setDetail(res.data.feature);
        setDrawerOpen(true);
      }
    } catch {
      pushToast("Failed to load feature details", "error");
    } finally {
      setDetailLoading(false);
    }
  }, [envFilter, pushToast]);

  const openDetail = (f: FeatureRow) => {
    setDetailTab("overview");
    setDetail(null);
    fetchDetail(f.id);
  };

  // ── Computed ────────────────────────────────────────────────
  const features = data?.features ?? [];
  const stats = data?.stats;
  const meta = data?.meta;

  const filtered = useMemo(() => {
    return features.filter((f) => {
      if (selected.size === 0) return true;
      return !selected.has(f.id);
    });
  }, [features, selected]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const allPageSelected = paged.length > 0 && paged.every((f) => selected.has(f.id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const f of paged) next.delete(f.id);
      } else {
        for (const f of paged) next.add(f.id);
      }
      return next;
    });
  };

  // ── Mutations ───────────────────────────────────────────────
  const updateLocalStats = (delta: Partial<Stats>) => {
    setData((d) => (d ? { ...d, stats: { ...d.stats, ...delta } } : d));
  };

  const handleToggle = async (f: FeatureRow, nextEnabled: boolean) => {
    if (!nextEnabled && f.dependentCount > 0) {
      setConfirmState({
        message: `"${f.name}" is required by ${f.dependentCount} other feature(s). Disabling it may break: ${f.dependencies.map((d) => d.name).join(", ") || "dependent features"}. Continue?`,
        confirmLabel: "Disable anyway",
        danger: true,
        onConfirm: () => performToggle(f, nextEnabled, true),
      });
      return;
    }
    performToggle(f, nextEnabled, false);
  };

  const performToggle = async (f: FeatureRow, nextEnabled: boolean, confirmed: boolean) => {
    const prevStatus = f.status;
    const wasEnabled = f.flag?.isEnabled;
    setData((d) => d && ({
      ...d,
      features: d.features.map((x) => x.id === f.id
        ? { ...x, status: nextEnabled ? "Enabled" : "Disabled", flag: x.flag ? { ...x.flag, isEnabled: nextEnabled } : x.flag }
        : x),
    }));
    setDetail((dd) => dd && dd.id === f.id ? { ...dd, status: nextEnabled ? "Enabled" : "Disabled", flag: dd.flag ? { ...dd.flag, isEnabled: nextEnabled } : dd.flag } : dd);
    updateLocalStats({
      enabled: (stats?.enabled ?? 0) + (nextEnabled ? 1 : -1) + (wasEnabled === nextEnabled ? (nextEnabled ? -1 : 1) : 0),
      disabled: (stats?.disabled ?? 0) + (nextEnabled ? -1 : 1) + (wasEnabled === nextEnabled ? (nextEnabled ? 1 : -1) : 0),
    });
    try {
      await api.patch("/admin/features/status", { ids: [f.id], status: nextEnabled ? "Enabled" : "Disabled", environment: envFilter });
      pushToast(`${f.name} ${nextEnabled ? "enabled" : "disabled"}`, "success");
    } catch {
      setData((d) => d && ({
        ...d,
        features: d.features.map((x) => x.id === f.id ? { ...x, status: prevStatus, flag: x.flag ? { ...x.flag, isEnabled: !!wasEnabled } : x.flag } : x),
      }));
      pushToast(`Failed to ${nextEnabled ? "enable" : "disable"} ${f.name}. Only Super Admin can change production flags.`, "error");
    }
  };

  const handleBulkStatus = async (status: "Enabled" | "Disabled") => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setData((d) => d && ({
      ...d,
      features: d.features.map((x) => selected.has(x.id) ? { ...x, status, flag: x.flag ? { ...x.flag, isEnabled: status === "Enabled" } : x.flag } : x),
    }));
    try {
      await api.patch("/admin/features/status", { ids, status, environment: envFilter });
      pushToast(`${ids.length} features ${status === "Enabled" ? "enabled" : "disabled"}`, "success");
      setSelected(new Set());
    } catch {
      fetchList(true);
      pushToast(`Failed to update status. Only Super Admin can change production flags.`, "error");
    }
  };

  const handleDelete = (f: FeatureRow) => {
    setConfirmState({
      message: `Delete "${f.name}"? This soft-deletes the feature and disables its flag. You can undo this.`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: () => performDelete([f.id], [f.name]),
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmState({
      message: `Delete ${ids.length} feature(s)? This soft-deletes them and disables their flags. You can undo this.`,
      confirmLabel: `Delete ${ids.length}`,
      danger: true,
      onConfirm: () => performDelete(ids, ids.map((id) => features.find((x) => x.id === id)?.name || id)),
    });
  };

  const performDelete = async (ids: string[], names: string[]) => {
    let deletedCount = 0;
    try {
      for (const id of ids) {
        await api.delete(`/admin/features/${id}`);
        deletedCount++;
      }
      setData((d) => d && ({ ...d, features: d.features.filter((x) => !ids.includes(x.id)) }));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      pushToast(`${deletedCount} feature(s) deleted`, "success", {
        label: "Undo",
        onClick: async () => {
          for (const id of ids) {
            await api.post(`/admin/features/${id}/restore`).catch(() => {});
          }
          fetchList(true);
          pushToast("Features restored", "info");
        },
      });
    } catch {
      fetchList(true);
      pushToast("Failed to delete features", "error");
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/admin/features/export", { params: { environment: envFilter }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `features-${envFilter.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      pushToast("Export downloaded", "success");
    } catch {
      pushToast("Export failed", "error");
    }
  };

  const handleBulkExport = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const rows = features.filter((x) => ids.includes(x.id));
    const headers = ["Key", "Name", "Module", "Category", "Status", "Environment", "Access Level", "Version", "Owner", "Usage", "Last Updated"];
    const csv = [headers.join(","), ...rows.map((f) => [
      f.key, `"${f.name}"`, f.module, f.category, f.status, f.environment, f.accessLevel, f.version,
      f.owner || "", f.usage?.totalRequests ?? 0, f.updatedAt,
    ].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selected-features.csv";
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    pushToast("Exported selected features", "success");
  };

  const handleSaveFeature = async (values: FeatureFormValues, id?: string) => {
    try {
      if (id) {
        await api.put(`/admin/features/${id}`, values);
        pushToast("Feature updated", "success");
      } else {
        await api.post("/admin/features", values);
        pushToast("Feature created", "success");
      }
      setFormOpen(false);
      fetchList(true);
    } catch (e: any) {
      pushToast(e?.response?.data?.error || "Failed to save feature", "error");
    }
  };

  const handleRolloutSave = async (payload: {
    rolloutPct: number;
    isEnabled: boolean;
    environment: string;
    targetType: string;
    targetUsers: string[];
    targetRoles: string[];
    targetUniversities: string[];
    targetCountries: string[];
    reason: string;
  }) => {
    if (!rolloutFeature) return;
    try {
      await api.patch("/admin/features/rollout", { featureId: rolloutFeature.id, ...payload });
      pushToast("Rollout updated", "success");
      setRolloutFeature(null);
      fetchList(true);
      if (detail?.id === rolloutFeature.id) fetchDetail(rolloutFeature.id);
    } catch (e: any) {
      pushToast(e?.response?.data?.error || "Failed to update rollout. Only Super Admin can change production flags.", "error");
    }
  };

  const handlePermissionsSave = async () => {
    if (!permFeature) return;
    try {
      await api.patch("/admin/features/permissions", { featureId: permFeature.id, permissions: permRows });
      pushToast("Permissions updated", "success");
      setPermFeature(null);
      if (detail?.id === permFeature.id) fetchDetail(permFeature.id);
    } catch (e: any) {
      pushToast(e?.response?.data?.error || "Failed to update permissions", "error");
    }
  };

  const openPermissions = (f: FeatureRow) => {
    setPermFeature(f);
    setPermRows(f.id === detail?.id && detail.permissions.length
      ? detail.permissions
      : [
          { role: "Super Admin", canView: true, canEdit: true, canToggle: true, canRollout: true, canDelete: true, canManagePermissions: true },
          { role: "Admin", canView: true, canEdit: true, canToggle: false, canRollout: false, canDelete: false, canManagePermissions: false },
          { role: "Manager", canView: true, canEdit: true, canToggle: false, canRollout: false, canDelete: false, canManagePermissions: false },
          { role: "Developer", canView: true, canEdit: true, canToggle: false, canRollout: false, canDelete: false, canManagePermissions: false },
          { role: "Viewer", canView: true, canEdit: false, canToggle: false, canRollout: false, canDelete: false, canManagePermissions: false },
        ]);
  };

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); setModuleFilter("all");
    setAccessFilter("all"); setPremiumFilter("all"); setRoleFilter("all");
  };

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || moduleFilter !== "all" ||
    accessFilter !== "all" || premiumFilter !== "all" || roleFilter !== "all" || debouncedSearch !== "";

  const openAdd = () => { setEditing(null); setFormOpen(true); };

  const openEdit = (f: FeatureRow) => { setEditing(f); setFormOpen(true); };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10">
      <SectionHeader
        title="Feature Management"
        description="Centralized control plane for every Adyapan AI feature — flags, rollouts, permissions and dependencies."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge variant="success" pulse>{stats?.enabled ?? 0}/{stats?.total ?? 0} Enabled</StatusBadge>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
              onClick={() => fetchList(true)} disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-60 border-none"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Syncing..." : "Sync"}
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border-none"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
              <Download size={13} /> Export
            </motion.button>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black text-black transition-all cursor-pointer border-none"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" }}>
              <Plus size={14} /> Add Feature
            </motion.button>
          </div>
        }
      />

      {/* ── Top Statistics Cards ─────────────────────────────── */}
      {loading && !data ? <StatsSkeleton /> : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          <StatCard icon={<Flag size={16} />} color="#818cf8" label="Total Features" value={stats?.total ?? 0} />
          <StatCard icon={<ToggleRight size={16} />} color="#10b981" label="Enabled" value={stats?.enabled ?? 0} />
          <StatCard icon={<ToggleLeft size={16} />} color="#6b7280" label="Disabled" value={stats?.disabled ?? 0} />
          <StatCard icon={<Rocket size={16} />} color="#f59e0b" label="Beta" value={stats?.beta ?? 0} />
          <StatCard icon={<Sparkles size={16} />} color="#a78bfa" label="Experimental" value={stats?.experimental ?? 0} />
          <StatCard icon={<Ban size={16} />} color="#ef4444" label="Deprecated" value={stats?.deprecated ?? 0} />
          <StatCard icon={<Crown size={16} />} color="#fbbf24" label="Premium" value={stats?.premium ?? 0} />
          <StatCard icon={<Clock size={16} />} color="#38bdf8" label="Recently Updated" value={stats?.recentlyUpdated ?? 0} />
        </motion.div>
      )}

      {error && (
        <div className="rounded-2xl border px-5 py-4 text-xs font-semibold flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* ── Toolbar / Navigation ─────────────────────────────── */}
      <div className="rounded-2xl border p-3 space-y-3" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features, modules, categories, owners..."
              className="w-full rounded-xl pl-9 pr-10 py-2 text-xs font-semibold outline-none transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold border"
              style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>/</span>
          </div>

          {/* Environment switcher */}
          <div className="flex items-center gap-1 rounded-xl p-1 border" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.03)" }}>
            {(meta?.environments ?? ["Production", "Staging", "Development"]).map((env) => (
              <button key={env} onClick={() => setEnvFilter(env)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-none"
                style={{
                  background: envFilter === env ? "rgba(245,158,11,0.14)" : "transparent",
                  color: envFilter === env ? "#f59e0b" : "var(--text-muted)",
                  border: envFilter === env ? "1px solid rgba(245,158,11,0.25)" : "1px solid transparent",
                }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ENV_COLORS[env] || "#94a3b8" }} />
                {env}
              </button>
            ))}
          </div>

          {/* Add / Export (mobile quick) */}
          <div className="flex items-center gap-2">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => fetchList(true)} className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold cursor-pointer border-none"
              style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
              <RefreshCw size={12} /> Refresh
            </motion.button>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            <ListFilter size={12} /> Filters
          </div>
          <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}
            options={[{ value: "all", label: "All statuses" }, ...(meta?.statuses ?? []).map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Category" value={categoryFilter} onChange={setCategoryFilter}
            options={[{ value: "all", label: "All categories" }, ...(meta?.categories ?? []).map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Module" value={moduleFilter} onChange={setModuleFilter}
            options={[{ value: "all", label: "All modules" }, ...(meta?.modules ?? []).map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Access" value={accessFilter} onChange={setAccessFilter}
            options={[{ value: "all", label: "All access" }, ...(meta?.accessLevels ?? []).map((s) => ({ value: s, label: s }))]} />
          <FilterSelect label="Premium" value={premiumFilter} onChange={setPremiumFilter}
            options={[{ value: "all", label: "All plans" }, { value: "true", label: "Premium only" }, { value: "false", label: "Free only" }]} />
          <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter}
            options={[{ value: "all", label: "All roles" }, ...(meta?.roles ?? []).map((s) => ({ value: s, label: s }))]} />
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
              <X size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Bulk Action Bar ───────────────────────────────────── */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-2xl border p-3 flex flex-wrap items-center gap-2"
              style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.25)" }}>
              <span className="flex items-center gap-2 px-2 text-xs font-black" style={{ color: "#f59e0b" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={{ background: "rgba(245,158,11,0.18)", color: "#f59e0b" }}>{selected.size}</span>
                selected
              </span>
              <BulkBtn icon={<Play size={11} />} label="Enable" onClick={() => handleBulkStatus("Enabled")} color="#10b981" />
              <BulkBtn icon={<Ban size={11} />} label="Disable" onClick={() => handleBulkStatus("Disabled")} color="#ef4444" />
              <BulkBtn icon={<Trash2 size={11} />} label="Delete" onClick={handleBulkDelete} color="#ef4444" />
              <BulkBtn icon={<Download size={11} />} label="Export" onClick={handleBulkExport} color="#38bdf8" />
              <span className="w-px h-5 mx-1" style={{ background: "var(--border-color)" }} />
              <BulkSelect label="Category" placeholder="Assign category" options={meta?.categories ?? []}
                onApply={(v) => bulkUpdateField("category", v)} />
              <BulkSelect label="Owner" placeholder="Assign owner" options={meta?.owners ?? []}
                onApply={(v) => bulkUpdateField("owner", v)} />
              <BulkSelect label="Module" placeholder="Move module" options={meta?.modules ?? []}
                onApply={(v) => bulkUpdateField("module", v)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      const bulkUpdateField = async (field: "category" | "owner" | "module", value: string) => {
        const ids = Array.from(selected);
        if (!ids.length || !value) return;
        setConfirmState({
          message: `Assign "${value}" as ${field} for ${ids.length} selected feature(s)?`,
          confirmLabel: "Apply",
          onConfirm: async () => {
            try {
              for (const id of ids) {
                await api.put(`/admin/features/${id}`, { [field]: value });
              }
              pushToast(`${ids.length} features updated`, "success");
              setSelected(new Set());
              fetchList(true);
            } catch {
              pushToast("Bulk update failed", "error");
            }
          },
        });
      };

      {/* ══ Main Grid: Table + Detail Panel ══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Feature Table ── */}
        <div className="xl:col-span-2 rounded-2xl border overflow-hidden" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex items-center gap-2 px-5 py-3.5 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Boxes size={15} style={{ color: "#f59e0b" }} />
            <h2 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Feature Registry</h2>
            <span className="ml-auto text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
              {filtered.length} of {features.length} features
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ minWidth: 1080 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                  <th className="px-3 py-2.5 w-8">
                    <input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage}
                      className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                  </th>
                  {["Feature", "Module", "Category", "Status", "Environment", "Access", "Version", "Owner", "Usage", "Updated", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !data ? (
                  Array.from({ length: 7 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-color)" }}>
                      <td className="px-3 py-3"><Skeleton className="w-4 h-4 rounded" /></td>
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="px-3 py-3"><Skeleton className="h-3.5 w-24" /></td>
                      ))}
                    </tr>
                  ))
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search size={28} style={{ color: "var(--text-muted)" }} />
                        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>No features match your filters</p>
                        <button onClick={clearFilters} className="px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer border-none"
                          style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : paged.map((f, idx) => (
                  <motion.tr key={f.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02, duration: 0.2 }}
                    onClick={() => openDetail(f)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggleSelect(f.id)}
                        className="accent-amber-500 w-3.5 h-3.5 cursor-pointer" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: `${CATEGORY_COLORS[f.category] || "#94a3b8"}18`, color: CATEGORY_COLORS[f.category] || "#94a3b8" }}>
                          <CircleDot size={14} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate max-w-[150px]" style={{ color: "var(--text-primary)" }}>{f.name}</span>
                            {f.isPremium && <Crown size={10} style={{ color: "#f59e0b" }} />}
                          </div>
                          <span className="text-[9px] font-mono font-medium" style={{ color: "var(--text-muted)" }}>{f.key}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{f.module}</span></td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: CATEGORY_COLORS[f.category] || "#94a3b8" }}>{f.category}</span>
                    </td>
                    <td className="px-3 py-2.5"><StatusPill status={f.status} /></td>
                    <td className="px-3 py-2.5"><EnvPill env={f.environment} /></td>
                    <td className="px-3 py-2.5"><AccessPill level={f.accessLevel} /></td>
                    <td className="px-3 py-2.5"><span className="text-[10px] font-mono font-semibold" style={{ color: "var(--text-secondary)" }}>v{f.version}</span></td>
                    <td className="px-3 py-2.5"><span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: "var(--text-secondary)" }}>{f.owner || "—"}</span></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <span className="text-[11px] font-black font-mono" style={{ color: "#10b981" }}>{formatNumber(f.usage?.totalRequests ?? 0)}</span>
                        <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (f.usage?.totalRequests ?? 0) / 1000)}%`, background: "#10b981" }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><span className="text-[10px] font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{timeAgo(f.updatedAt)}</span></td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Toggle on={!!f.flag?.isEnabled} onChange={() => handleToggle(f, !f.flag?.isEnabled)}
                          danger={f.status === "Deprecated" || f.status === "Maintenance"} />
                        <div className="relative group">
                          <button className="p-1.5 rounded-lg transition-colors cursor-pointer border-none hover:bg-white/10" style={{ color: "var(--text-secondary)" }} title="More actions">
                            <MoreHorizontal size={14} />
                          </button>
                          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border p-1 z-30 hidden group-hover:block"
                            style={{ background: "var(--bg-dark, #0c131a)", borderColor: "var(--border-color)", boxShadow: "0 12px 30px rgba(0,0,0,0.4)" }}>
                            <RowAction icon={<Eye size={12} />} label="Details" onClick={() => openDetail(f)} />
                            <RowAction icon={<Pencil size={12} />} label="Edit config" onClick={() => openEdit(f)} />
                            <RowAction icon={<Workflow size={12} />} label="Rollout" onClick={() => setRolloutFeature(f)} />
                            <RowAction icon={<ShieldCheck size={12} />} label="Permissions" onClick={() => openPermissions(f)} />
                            <div className="h-px my-1" style={{ background: "var(--border-color)" }} />
                            <RowAction icon={<Trash2 size={12} />} label="Delete" danger onClick={() => handleDelete(f)} />
                          </div>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && features.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t flex-wrap gap-3" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="ml-1 rounded-md px-1.5 py-1 text-[10px] font-bold cursor-pointer outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
                  {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <PageBtn disabled={page <= 1} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft size={14} />} />
                {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-lg text-[11px] font-black transition-all cursor-pointer border-none"
                      style={{
                        background: page === p ? "rgba(245,158,11,0.15)" : "transparent",
                        color: page === p ? "#f59e0b" : "var(--text-muted)",
                        border: page === p ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
                      }}>
                      {p}
                    </button>
                  );
                })}
                <PageBtn disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} icon={<ChevronRight size={14} />} />
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Feature Details Panel / Drawer ── */}
        <div className="xl:col-span-1">
          <div className="hidden lg:block">
            {detail ? (
              <DetailPanel
                detail={detail}
                loading={detailLoading}
                tab={detailTab}
                setTab={setDetailTab}
                onClose={() => setDetail(null)}
                onRefresh={() => fetchDetail(detail.id)}
                onEdit={() => { setEditing(detail); setFormOpen(true); }}
                onRollout={() => setRolloutFeature(detail)}
                onPermissions={() => openPermissions(detail)}
                onToggle={() => handleToggle(detail, !detail.flag?.isEnabled)}
              />
            ) : (
              <EmptyPanel />
            )}
          </div>

          {/* Mobile drawer */}
          <AnimatePresence>
            {drawerOpen && detail && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[70] bg-black/60 lg:hidden" onClick={() => setDrawerOpen(false)} />
                <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="fixed inset-y-0 right-0 w-full max-w-md z-[80] overflow-y-auto lg:hidden"
                  style={{ background: "var(--bg-dark, #080c10)", borderLeft: "1px solid var(--border-color)" }}>
                  <DetailPanel
                    detail={detail}
                    loading={detailLoading}
                    tab={detailTab}
                    setTab={setDetailTab}
                    onClose={() => setDrawerOpen(false)}
                    onRefresh={() => fetchDetail(detail.id)}
                    onEdit={() => { setEditing(detail); setFormOpen(true); }}
                    onRollout={() => setRolloutFeature(detail)}
                    onPermissions={() => openPermissions(detail)}
                    onToggle={() => handleToggle(detail, !detail.flag?.isEnabled)}
                  />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <AnimatePresence>
        {formOpen && (
          <FeatureModal
            editing={editing}
            meta={meta}
            onClose={() => setFormOpen(false)}
            onSave={handleSaveFeature}
          />
        )}
        {rolloutFeature && (
          <RolloutModal
            feature={rolloutFeature}
            onClose={() => setRolloutFeature(null)}
            onSave={handleRolloutSave}
          />
        )}
        {permFeature && (
          <PermissionsModal
            feature={permFeature}
            rows={permRows}
            setRows={setPermRows}
            onClose={() => setPermFeature(null)}
            onSave={handlePermissionsSave}
          />
        )}
        {confirmState && (
          <ConfirmDialog
            message={confirmState.message}
            confirmLabel={confirmState.confirmLabel}
            danger={confirmState.danger}
            onCancel={() => setConfirmState(null)}
            onConfirm={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn(); }}
          />
        )}
      </AnimatePresence>

      {/* ── Toasts ───────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════

function StatCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="p-3.5 rounded-2xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[9px] font-black uppercase tracking-wider leading-tight" style={{ color: "var(--text-muted)" }}>{label}</div>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18`, color }}>{icon}</span>
      </div>
      <div className="text-xl font-black font-mono tracking-tight" style={{ color }}>{value.toLocaleString()}</div>
    </motion.div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer outline-none appearance-none pr-6 relative"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
      {options.map((o) => <option key={o.value} value={o.value} style={{ background: "var(--bg-dark, #0c131a)", color: "var(--text-primary)" }}>{o.label}</option>)}
    </select>
  );
}

function BulkBtn({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <motion.button whileTap={{ scale: 0.95 }} onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all hover:opacity-85"
      style={{ background: `${color}14`, color, border: `1px solid ${color}30` }}>
      {icon} {label}
    </motion.button>
  );
}

function BulkSelect({ label, placeholder, options, onApply }: {
  label: string; placeholder: string; options: string[]; onApply: (v: string) => void;
}) {
  return (
    <select defaultValue="" onChange={(e) => { if (e.target.value) onApply(e.target.value); }}
      className="rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer outline-none"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}>
      <option value="" style={{ background: "var(--bg-dark, #0c131a)", color: "var(--text-muted)" }}>{placeholder}</option>
      {options.map((o) => <option key={o} value={o} style={{ background: "var(--bg-dark, #0c131a)", color: "var(--text-primary)" }}>{o}</option>)}
    </select>
  );
}

function RowAction({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border-none text-left"
      style={{ color: danger ? "#f87171" : "var(--text-secondary)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = danger ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
      {icon} {label}
    </button>
  );
}

function PageBtn({ disabled, onClick, icon }: { disabled: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button disabled={disabled} onClick={onClick}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 border-none"
      style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
      {icon}
    </button>
  );
}

function EmptyPanel() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="rounded-2xl border p-8 flex flex-col items-center justify-center text-center h-full min-h-[320px]"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
        <MousePointerClick size={24} />
      </div>
      <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Select a feature</h3>
      <p className="text-[11px] font-medium mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        Click any row to inspect its analytics, dependencies, rollout history, permissions and activity log.
      </p>
      <div className="mt-5 text-[10px] font-mono px-3 py-1.5 rounded-lg border" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
        Press <kbd style={{ color: "#f59e0b" }}>/</kbd> to search · <kbd style={{ color: "#f59e0b" }}>n</kbd> new feature
      </div>
    </motion.div>
  );
}

// ── Detail Panel ──────────────────────────────────────────────────

function DetailPanel({ detail, loading, tab, setTab, onClose, onRefresh, onEdit, onRollout, onPermissions, onToggle }: {
  detail: FeatureDetail;
  loading: boolean;
  tab: string;
  setTab: (t: string) => void;
  onClose: () => void;
  onRefresh: () => void;
  onEdit: () => void;
  onRollout: () => void;
  onPermissions: () => void;
  onToggle: () => void;
}) {
  const isEnabled = !!detail.flag?.isEnabled;
  const m = STATUS_META[detail.status] || STATUS_META.Enabled;

  const chartData = detail.usageSeries?.map((u) => ({
    date: new Date(u.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    requests: u.requests,
    errors: u.errors,
    users: u.users,
    avgResponseMs: u.avgResponseMs,
    revenue: u.revenue,
  })) ?? [];

  const { rfNodes, rfEdges } = buildGraph(detail);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border overflow-hidden sticky top-4"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
      {/* Header */}
      <div className="px-4 py-3.5 border-b flex items-center gap-3" style={{ borderColor: "var(--border-color)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${m.bg}`, color: m.color, border: `1px solid ${m.border}` }}>
          <CircleDot size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-black truncate" style={{ color: "var(--text-primary)" }}>{detail.name}</h3>
            {detail.isPremium && <Crown size={11} style={{ color: "#f59e0b" }} />}
          </div>
          <span className="text-[9px] font-mono font-medium" style={{ color: "var(--text-muted)" }}>{detail.key} · v{detail.version}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Toggle on={isEnabled} onChange={onToggle} />
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors cursor-pointer border-none hover:bg-white/10 lg:hidden" style={{ color: "var(--text-secondary)" }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 border-b overflow-x-auto" style={{ borderColor: "var(--border-color)" }}>
        {[
          { id: "overview", label: "Overview", icon: <Eye size={11} /> },
          { id: "analytics", label: "Analytics", icon: <BarChart3 size={11} /> },
          { id: "deps", label: "Dependencies", icon: <GitBranch size={11} /> },
          { id: "rollout", label: "Rollout", icon: <Workflow size={11} /> },
          { id: "activity", label: "Activity", icon: <Activity size={11} /> },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-none whitespace-nowrap"
            style={{
              background: tab === t.id ? "rgba(245,158,11,0.12)" : "transparent",
              color: tab === t.id ? "#f59e0b" : "var(--text-muted)",
              border: tab === t.id ? "1px solid rgba(245,158,11,0.25)" : "1px solid transparent",
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 max-h-[640px] overflow-y-auto">
        {loading && !detail.usageSeries ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
        ) : tab === "overview" ? (
          <>
            {/* Status / access row */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusPill status={detail.status} />
              <AccessPill level={detail.accessLevel} />
              <EnvPill env={detail.environment} />
              {detail.dependentCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <AlertTriangle size={9} /> {detail.dependentCount} depend
                </span>
              )}
            </div>

            {detail.description && (
              <p className="text-[11px] font-medium leading-relaxed" style={{ color: "var(--text-secondary)" }}>{detail.description}</p>
            )}

            {/* Key-value grid */}
            <div className="grid grid-cols-2 gap-2">
              <KV label="Owner" value={detail.owner || "—"} />
              <KV label="Category" value={detail.category} />
              <KV label="API" value={detail.apiEndpoint || "—"} mono />
              <KV label="Rate Limit" value={detail.rateLimit ? `${detail.rateLimit}/min` : "—"} />
              <KV label="Last Deployed" value={timeAgo(detail.lastDeployedAt)} />
              <KV label="Updated" value={timeAgo(detail.updatedAt)} />
            </div>

            {/* Usage summary */}
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Requests" value={formatNumber(detail.usage?.totalRequests ?? 0)} color="#10b981" icon={<MousePointerClick size={12} />} />
              <MiniStat label="Users" value={formatNumber(detail.usage?.totalUsers ?? 0)} color="#38bdf8" icon={<Users size={12} />} />
              <MiniStat label="Success" value={`${detail.usage?.successRate ?? 100}%`} color="#a78bfa" icon={<Check size={12} />} />
              <MiniStat label="Errors" value={formatNumber(detail.usage?.errors ?? 0)} color="#ef4444" icon={<AlertTriangle size={12} />} />
              <MiniStat label="Avg Resp" value={`${detail.usage?.avgResponseMs ?? 0}ms`} color="#f59e0b" icon={<Gauge size={12} />} />
              <MiniStat label="Revenue" value={`₹${formatNumber(detail.usage?.revenue ?? 0)}`} color="#fbbf24" icon={<DollarSign size={12} />} />
            </div>

            {/* Dependencies */}
            <div>
              <h4 className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Depends On</h4>
              {detail.dependencies.length === 0 ? (
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>No dependencies — standalone feature</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {detail.dependencies.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_META[d.status]?.color || "#94a3b8" }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {detail.notes && (
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Release Notes</h4>
                <p className="text-[10px] font-medium leading-relaxed rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-secondary)" }}>{detail.notes}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <PanelBtn icon={<Pencil size={12} />} label="Edit" onClick={onEdit} color="#818cf8" />
              <PanelBtn icon={<Workflow size={12} />} label="Rollout" onClick={onRollout} color="#f59e0b" />
              <PanelBtn icon={<ShieldCheck size={12} />} label="Access" onClick={onPermissions} color="#10b981" />
            </div>
          </>
        ) : tab === "analytics" ? (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Requests · 14 days</h4>
              <button onClick={onRefresh} className="flex items-center gap-1 text-[9px] font-bold cursor-pointer border-none" style={{ color: "#f59e0b" }}>
                <RefreshCw size={10} /> refresh
              </button>
            </div>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} interval={2} />
                  <YAxis tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} width={34} />
                  <Tooltip contentStyle={{ background: "var(--bg-dark, #0c131a)", border: "1px solid var(--border-color)", borderRadius: 10, fontSize: 11 }} />
                  <Area type="monotone" dataKey="requests" stroke="#f59e0b" fill="url(#reqGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="h-32">
              <h4 className="text-[9px] font-black uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Errors vs Response Time</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis tick={{ fontSize: 8, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} width={26} />
                  <Tooltip contentStyle={{ background: "var(--bg-dark, #0c131a)", border: "1px solid var(--border-color)", borderRadius: 10, fontSize: 11 }} />
                  <Bar dataKey="errors" fill="#ef4444" radius={[3, 3, 0, 0]} barSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Revenue (14d)" value={`₹${formatNumber(detail.usage?.revenue ?? 0)}`} color="#fbbf24" icon={<DollarSign size={12} />} />
              <MiniStat label="AI Tokens" value={formatNumber(detail.usage?.aiTokens ?? 0)} color="#e879f9" icon={<Cpu size={12} />} />
              <MiniStat label="Today's Requests" value={formatNumber(detail.usage?.today ?? 0)} color="#10b981" icon={<Zap size={12} />} />
              <MiniStat label="Success Rate" value={`${detail.usage?.successRate ?? 100}%`} color="#a78bfa" icon={<Check size={12} />} />
            </div>
          </>
        ) : tab === "deps" ? (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Dependency Graph</h4>
              {detail.dependencies.length > 0 && (
                <span className="text-[9px] font-semibold" style={{ color: "var(--text-muted)" }}>
                  {detail.dependencies.length} direct dep(s)
                </span>
              )}
            </div>
            <div className="h-72 rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-color)", background: "rgba(0,0,0,0.15)" }}>
              {rfNodes.length > 1 ? (
                <ReactFlow
                  nodes={rfNodes}
                  edges={rfEdges}
                  fitView
                  fitViewOptions={{ padding: 0.15 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="rgba(255,255,255,0.07)" />
                </ReactFlow>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Standalone feature — no dependencies</p>
                </div>
              )}
            </div>
            {detail.dependents.length > 0 && (
              <div>
                <h4 className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                  Used By ({detail.dependents.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {detail.dependents.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold"
                      style={{ background: "rgba(239,68,68,0.06)", color: "var(--text-secondary)", border: "1px solid rgba(239,68,68,0.15)" }}>
                      <GitBranch size={10} style={{ color: "#f87171" }} /> {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : tab === "rollout" ? (
          <>
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Current Rollout</span>
                <StatusPill status={isEnabled ? "Enabled" : "Disabled"} />
              </div>
              <div className="text-3xl font-black font-mono" style={{ color: isEnabled ? "#10b981" : "#6b7280" }}>
                {detail.flag?.rolloutPct ?? 0}%
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden mt-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${detail.flag?.rolloutPct ?? 0}%`,
                  background: isEnabled ? "linear-gradient(90deg, #10b981, #34d399)" : "#6b7280",
                }} />
              </div>
              <div className="mt-2 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                Target: <span style={{ color: "var(--text-secondary)" }}>{toTitle(detail.flag?.targetType || "all")}</span>
                {detail.flag?.targetRoles?.length > 0 && ` · Roles: ${detail.flag.targetRoles.join(", ")}`}
              </div>
            </div>

            <PanelBtn icon={<Workflow size={12} />} label="Adjust Rollout" onClick={onRollout} color="#f59e0b" full />

            <div>
              <h4 className="text-[9px] font-black uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Rollout History</h4>
              {detail.rolloutHistory?.length === 0 ? (
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>No rollout changes recorded</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(detail.rolloutHistory || []).slice(0, 12).map((r) => (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-xl border px-3 py-2" style={{ borderColor: "var(--border-color)" }}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{
                        background: r.isEnabled ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)",
                        color: r.isEnabled ? "#10b981" : "#f87171",
                      }}>
                        {r.isEnabled ? <Play size={10} /> : <Ban size={10} />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold" style={{ color: "var(--text-primary)" }}>
                            {r.rolloutPct}% · {r.environment}
                          </span>
                          <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>{timeAgo(r.createdAt)}</span>
                        </div>
                        {r.reason && <p className="text-[9px] font-medium truncate" style={{ color: "var(--text-muted)" }}>{r.reason}</p>}
                        <p className="text-[9px] font-semibold" style={{ color: "var(--text-muted)" }}>by {r.changedBy || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : tab === "activity" ? (
          <>
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Activity Log</h4>
              <button onClick={onRefresh} className="flex items-center gap-1 text-[9px] font-bold cursor-pointer border-none" style={{ color: "#f59e0b" }}>
                <RefreshCw size={10} /> refresh
              </button>
            </div>
            {detail.logs?.length === 0 ? (
              <p className="text-[10px] font-medium py-4 text-center" style={{ color: "var(--text-muted)" }}>No activity yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {(detail.logs || []).map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-color)" }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
                      <Activity size={11} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold" style={{ color: "var(--text-primary)" }}>{log.action}</span>
                        <span className="text-[9px] font-medium whitespace-nowrap" style={{ color: "var(--text-muted)" }}>{timeAgo(log.createdAt)}</span>
                      </div>
                      <p className="text-[9px] font-medium truncate" style={{ color: "var(--text-muted)" }}>
                        {log.changedBy || "System"} · {JSON.stringify(log.details || {}).slice(0, 80)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--border-color)", background: "rgba(255,255,255,0.02)" }}>
      <div className="text-[8px] font-black uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className={`text-[11px] font-bold truncate ${mono ? "font-mono" : ""}`} style={{ color: "var(--text-primary)" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border px-2.5 py-2" style={{ borderColor: "var(--border-color)" }}>
      <div className="flex items-center gap-1 mb-1" style={{ color: "var(--text-muted)" }}>
        <span style={{ color }}>{icon}</span>
        <span className="text-[8px] font-black uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[13px] font-black font-mono" style={{ color }}>{value}</div>
    </div>
  );
}

function PanelBtn({ icon, label, onClick, color, full }: { icon: React.ReactNode; label: string; onClick: () => void; color: string; full?: boolean }) {
  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={onClick}
      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold cursor-pointer border-none transition-all hover:opacity-85 ${full ? "col-span-3" : ""}`}
      style={{ background: `${color}14`, color, border: `1px solid ${color}30` }}>
      {icon} {label}
    </motion.button>
  );
}

// ── Feature Modal ─────────────────────────────────────────────────

function FeatureModal({ editing, meta, onClose, onSave }: {
  editing: FeatureRow | null;
  meta?: MetaData;
  onClose: () => void;
  onSave: (values: FeatureFormValues, id?: string) => void;
}) {
  const [values, setValues] = useState<FeatureFormValues>(() => editing ? {
    key: editing.key, name: editing.name, description: editing.description || "",
    module: editing.module, category: editing.category, status: editing.status,
    environment: editing.environment, accessLevel: editing.accessLevel, version: editing.version,
    owner: editing.owner || "", isPremium: editing.isPremium, apiEndpoint: editing.apiEndpoint || "",
    rateLimit: String(editing.rateLimit ?? ""), notes: editing.notes || "",
    rolloutPct: editing.flag?.rolloutPct ?? 100, isEnabled: editing.flag?.isEnabled ?? true,
  } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const set = (patch: Partial<FeatureFormValues>) => setValues((v) => ({ ...v, ...patch }));

  const handleName = (name: string) => {
    setValues((v) => ({ ...v, name, key: editing ? v.key : slugify(name) }));
  };

  const submit = async () => {
    if (!values.name.trim()) { setErrorMsg("Feature name is required"); return; }
    if (!editing && !/^[a-z0-9-]+$/.test(values.key)) { setErrorMsg("Key must be lowercase with dashes"); return; }
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload: any = { ...values, rateLimit: values.rateLimit ? Number(values.rateLimit) : null };
      await onSave(payload, editing?.id);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const catOptions = meta?.categories ?? [];
  const moduleOptions = meta?.modules ?? [];
  const ownerOptions = meta?.owners ?? [];

  return (
    <ModalShell title={editing ? "Edit Feature" : "Create Feature"} onClose={onClose} maxW="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="sm:col-span-2">
          <Field label="Feature Name">
            <input value={values.name} onChange={(e) => handleName(e.target.value)} placeholder="e.g. AI Interview Engine" style={inputStyle} />
          </Field>
        </div>
        {!editing && (
          <div>
            <Field label="Key" hint="Lowercase alphanumeric + dashes. Immutable after creation.">
              <input value={values.key} onChange={(e) => set({ key: slugify(e.target.value) })} style={{ ...inputStyle, fontFamily: "monospace" }} placeholder="interview-engine" />
            </Field>
          </div>
        )}
        <div>
          <Field label="Version">
            <input value={values.version} onChange={(e) => set({ version: e.target.value })} style={{ ...inputStyle, fontFamily: "monospace" }} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea value={values.description} onChange={(e) => set({ description: e.target.value })} rows={2} placeholder="What does this feature do?" style={inputStyle} />
          </Field>
        </div>
        <div>
          <Field label="Module">
            <select value={values.module} onChange={(e) => set({ module: e.target.value })} style={inputStyle}>
              {moduleOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              {!moduleOptions.includes(values.module) && <option value={values.module}>{values.module}</option>}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Category">
            <select value={values.category} onChange={(e) => set({ category: e.target.value })} style={inputStyle}>
              {catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Status">
            <select value={values.status} onChange={(e) => set({ status: e.target.value })} style={inputStyle}>
              {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Environment">
            <select value={values.environment} onChange={(e) => set({ environment: e.target.value })} style={inputStyle}>
              {(meta?.environments ?? ["Production", "Staging", "Development"]).map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Access Level">
            <select value={values.accessLevel} onChange={(e) => set({ accessLevel: e.target.value })} style={inputStyle}>
              {(meta?.accessLevels ?? ["All", "Premium", "Developer", "Internal", "Admin"]).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <div>
          <Field label="Owner">
            <select value={values.owner} onChange={(e) => set({ owner: e.target.value })} style={inputStyle}>
              <option value="">Unassigned</option>
              {ownerOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              {!ownerOptions.includes(values.owner) && values.owner && <option value={values.owner}>{values.owner}</option>}
            </select>
          </Field>
        </div>
        <div>
          <Field label="API Endpoint">
            <input value={values.apiEndpoint} onChange={(e) => set({ apiEndpoint: e.target.value })} placeholder="/api/feature" style={{ ...inputStyle, fontFamily: "monospace" }} />
          </Field>
        </div>
        <div>
          <Field label="Rate Limit (req/min)">
            <input value={values.rateLimit} onChange={(e) => set({ rateLimit: e.target.value.replace(/\D/g, "") })} style={inputStyle} placeholder="100" />
          </Field>
        </div>
        <div>
          <Field label="Rollout %">
            <select value={values.rolloutPct} onChange={(e) => set({ rolloutPct: Number(e.target.value) })} style={inputStyle}>
              {ROLLOUT_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Notes / Release Notes">
            <textarea value={values.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="What changed in this release?" style={inputStyle} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-5 mt-4 px-1">
        <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={values.isPremium} onChange={(e) => set({ isPremium: e.target.checked })} className="accent-amber-500 w-3.5 h-3.5" />
          <Crown size={12} style={{ color: "#f59e0b" }} /> Premium
        </label>
        <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={values.isEnabled} onChange={(e) => set({ isEnabled: e.target.checked })} className="accent-amber-500 w-3.5 h-3.5" />
          Enabled on create
        </label>
      </div>

      {errorMsg && (
        <div className="mt-3 px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
          <AlertTriangle size={12} /> {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          className="px-5 py-2 rounded-xl text-xs font-black text-black cursor-pointer border-none transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 14px rgba(245,158,11,0.3)" }}>
          {saving ? <Loader2 size={13} className="inline animate-spin mr-1" /> : editing ? "Save Changes" : "Create Feature"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Rollout Modal ─────────────────────────────────────────────────

function RolloutModal({ feature, onClose, onSave }: {
  feature: FeatureRow;
  onClose: () => void;
  onSave: (payload: any) => void;
}) {
  const [rolloutPct, setRolloutPct] = useState(feature.flag?.rolloutPct ?? 100);
  const [isEnabled, setIsEnabled] = useState(feature.flag?.isEnabled ?? true);
  const [environment, setEnvironment] = useState(feature.environment);
  const [targetType, setTargetType] = useState(feature.flag?.targetType || (rolloutPct === 100 ? "all" : "percent"));
  const [targetRoles, setTargetRoles] = useState<string[]>((feature.flag?.targetRoles as string[]) || []);
  const [targetUsers, setTargetUsers] = useState<string>(((feature.flag?.targetUsers as string[]) || []).join(", "));
  const [targetUniversities, setTargetUniversities] = useState<string>(((feature.flag?.targetUniversities as string[]) || []).join(", "));
  const [targetCountries, setTargetCountries] = useState<string>(((feature.flag?.targetCountries as string[]) || []).join(", "));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const ROLE_CHOICES = ["USER", "STUDENT", "PREMIUM", "ALUMNI", "TEACHER"];

  const submit = () => {
    setSaving(true);
    onSave({
      rolloutPct,
      isEnabled,
      environment,
      targetType,
      targetRoles,
      targetUsers: targetUsers.split(",").map((s) => s.trim()).filter(Boolean),
      targetUniversities: targetUniversities.split(",").map((s) => s.trim()).filter(Boolean),
      targetCountries: targetCountries.split(",").map((s) => s.trim()).filter(Boolean),
      reason,
    });
  };

  return (
    <ModalShell title={`Rollout · ${feature.name}`} onClose={onClose} maxW="max-w-lg">
      <div className="space-y-4">
        {/* Percent selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Rollout Percentage</span>
            <span className="text-xl font-black font-mono" style={{ color: isEnabled ? "#10b981" : "#6b7280" }}>{rolloutPct}%</span>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {ROLLOUT_OPTIONS.map((r) => (
              <button key={r} onClick={() => { setRolloutPct(r); if (r < 100) setTargetType("percent"); }}
                className="py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer border-none"
                style={{
                  background: rolloutPct === r ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.04)",
                  color: rolloutPct === r ? "#f59e0b" : "var(--text-secondary)",
                  border: rolloutPct === r ? "1px solid rgba(245,158,11,0.4)" : "1px solid var(--border-color)",
                }}>
                {r}%
              </button>
            ))}
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden mt-3" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div className="h-full rounded-full transition-all" style={{
              width: `${rolloutPct}%`,
              background: isEnabled ? "linear-gradient(90deg, #10b981, #34d399)" : "#6b7280",
            }} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--border-color)" }}>
          <div>
            <div className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>Enabled</div>
            <div className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>Serve this feature to the target audience</div>
          </div>
          <Toggle on={isEnabled} onChange={() => setIsEnabled((v) => !v)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Environment">
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} style={inputStyle}>
              {["Production", "Staging", "Development"].map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Target Audience">
            <select value={targetType} onChange={(e) => setTargetType(e.target.value)} style={inputStyle}>
              <option value="all">Everyone</option>
              <option value="percent">Percentage rollout</option>
              <option value="users">Specific users</option>
              <option value="roles">Specific roles</option>
              <option value="universities">Specific universities</option>
              <option value="countries">Specific countries</option>
            </select>
          </Field>
        </div>

        {targetType === "roles" && (
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Roles</span>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_CHOICES.map((r) => {
                const on = targetRoles.includes(r);
                return (
                  <button key={r} onClick={() => setTargetRoles((prev) => on ? prev.filter((x) => x !== r) : [...prev, r])}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border-none"
                    style={{
                      background: on ? "rgba(245,158,11,0.16)" : "rgba(255,255,255,0.04)",
                      color: on ? "#f59e0b" : "var(--text-secondary)",
                      border: on ? "1px solid rgba(245,158,11,0.35)" : "1px solid var(--border-color)",
                    }}>
                    {on && <Check size={10} className="inline mr-1" />}{r}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {targetType === "users" && (
          <Field label="User IDs / Emails" hint="Comma-separated">
            <textarea value={targetUsers} onChange={(e) => setTargetUsers(e.target.value)} rows={2} placeholder="user1@email.com, user2@email.com" style={inputStyle} />
          </Field>
        )}

        {targetType === "universities" && (
          <Field label="Universities" hint="Comma-separated">
            <textarea value={targetUniversities} onChange={(e) => setTargetUniversities(e.target.value)} rows={2} placeholder="IIT Delhi, NIT Trichy" style={inputStyle} />
          </Field>
        )}

        {targetType === "countries" && (
          <Field label="Countries" hint="Comma-separated country codes">
            <textarea value={targetCountries} onChange={(e) => setTargetCountries(e.target.value)} rows={2} placeholder="IN, US, AE" style={inputStyle} />
          </Field>
        )}

        <Field label="Reason (optional)" hint="Recorded in the audit log">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Gradual rollout for stability" style={inputStyle} />
        </Field>

        <div className="rounded-xl px-3 py-2 text-[10px] font-semibold flex items-start gap-2"
          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#fbbf24" }}>
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          Only Super Admin can change Production feature flags. Other admins see read-only state.
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          className="px-5 py-2 rounded-xl text-xs font-black text-black cursor-pointer border-none transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 4px 14px rgba(245,158,11,0.3)" }}>
          {saving ? <Loader2 size={13} className="inline animate-spin mr-1" /> : "Apply Rollout"}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Permissions Modal ─────────────────────────────────────────────

const PERM_LABELS: { key: keyof PermissionRow; label: string }[] = [
  { key: "canView", label: "View" },
  { key: "canEdit", label: "Edit" },
  { key: "canToggle", label: "Toggle" },
  { key: "canRollout", label: "Rollout" },
  { key: "canDelete", label: "Delete" },
  { key: "canManagePermissions", label: "Manage" },
];

function PermissionsModal({ feature, rows, setRows, onClose, onSave }: {
  feature: FeatureRow;
  rows: PermissionRow[];
  setRows: (r: PermissionRow[]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const togglePerm = (role: string, key: keyof PermissionRow) => {
    setRows(rows.map((r) => r.role === role ? { ...r, [key]: !r[key] } : r));
  };

  return (
    <ModalShell title={`Permissions · ${feature.name}`} onClose={onClose} maxW="max-w-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left" style={{ minWidth: 420 }}>
          <thead>
            <tr>
              <th className="px-3 py-2 text-[10px] font-black uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Role</th>
              {PERM_LABELS.map((p) => (
                <th key={p.key} className="px-2 py-2 text-[9px] font-black uppercase tracking-wider text-center" style={{ color: "var(--text-muted)" }}>{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.role} style={{ borderTop: "1px solid var(--border-color)" }}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {r.role === "Super Admin" && <Crown size={11} style={{ color: "#f59e0b" }} />}
                    <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{r.role}</span>
                  </div>
                </td>
                {PERM_LABELS.map((p) => {
                  const canManageSelf = r.role === "Super Admin";
                  return (
                    <td key={p.key} className="px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={!!r[p.key]}
                        disabled={canManageSelf}
                        onChange={() => togglePerm(r.role, p.key)}
                        className="accent-amber-500 w-3.5 h-3.5 cursor-pointer disabled:cursor-not-allowed"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl px-3 py-2 text-[10px] font-semibold flex items-start gap-2 mt-3"
        style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", color: "#fbbf24" }}>
        <AlertTriangle size={12} className="shrink-0 mt-0.5" />
        Production flag toggles and rollouts are enforced to Super Admin only, regardless of the matrix above.
      </div>

      <div className="flex items-center justify-end gap-2 mt-5">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none transition-all hover:opacity-80"
          style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
          Cancel
        </button>
        <button onClick={onSave} className="px-5 py-2 rounded-xl text-xs font-black text-black cursor-pointer border-none transition-all"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
          Save Permissions
        </button>
      </div>
    </ModalShell>
  );
}

// ── Modal Shell ───────────────────────────────────────────────────

function ModalShell({ title, onClose, children, maxW }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxW?: string;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxW || "max-w-lg"} rounded-2xl border p-5 my-8`}
        style={{ background: "var(--bg-card, #0c131a)", borderColor: "var(--border-color)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black tracking-tight" style={{ color: "var(--text-primary)" }}>{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors cursor-pointer border-none hover:bg-white/10" style={{ color: "var(--text-secondary)" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────

function ConfirmDialog({ message, confirmLabel, danger, onCancel, onConfirm }: {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border p-5"
        style={{ background: "var(--bg-card, #0c131a)", borderColor: "var(--border-color)", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ background: danger ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", color: danger ? "#ef4444" : "#f59e0b" }}>
          <AlertTriangle size={18} />
        </div>
        <p className="text-sm font-semibold leading-relaxed mb-5" style={{ color: "var(--text-primary)" }}>{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-xs font-black cursor-pointer border-none transition-all"
            style={{
              background: danger ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
              color: danger ? "#ef4444" : "#f59e0b",
              border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
            }}>
            {confirmLabel || "Confirm"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Toasts ────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[120] space-y-2 flex flex-col items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="flex items-center gap-2.5 pl-3 pr-2 py-2 rounded-xl border shadow-xl"
            style={{
              background: "var(--bg-dark, #0c131a)",
              borderColor: t.type === "error" ? "rgba(239,68,68,0.4)" : t.type === "info" ? "rgba(56,189,248,0.4)" : "rgba(16,185,129,0.4)",
              boxShadow: `0 10px 30px ${t.type === "error" ? "rgba(239,68,68,0.25)" : t.type === "info" ? "rgba(56,189,248,0.2)" : "rgba(16,185,129,0.2)"}`,
              maxWidth: 340,
            }}>
            {t.type === "success" && <Check size={14} className="shrink-0" style={{ color: "#10b981" }} />}
            {t.type === "error" && <AlertTriangle size={14} className="shrink-0" style={{ color: "#ef4444" }} />}
            {t.type === "info" && <RefreshCw size={14} className="shrink-0" style={{ color: "#38bdf8" }} />}
            <span className="text-[11px] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>{t.message}</span>
            {t.action && (
              <button onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
                className="px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer border-none"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                <Undo2 size={10} className="inline mr-1" />{t.action.label}
              </button>
            )}
            <button onClick={() => onDismiss(t.id)} className="ml-0.5 p-1 rounded cursor-pointer border-none hover:bg-white/10" style={{ color: "var(--text-muted)" }}>
              <X size={12} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
