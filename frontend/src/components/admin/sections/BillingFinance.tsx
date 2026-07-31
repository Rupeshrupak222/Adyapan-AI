"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Clock, CreditCard, Users,
  RefreshCw, Loader2, CheckCircle2, XCircle, Crown,
  FileText,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { api } from "@/services/api";

interface RevenueData {
  total: number;
  month: number;
  today: number;
  premiumUsers: number;
  totalTransactions: number;
  monthTransactions: number;
  averageOrderValue: number;
  planDist: { name: string; value: number }[];
  transactions: {
    id: string;
    user: string;
    amount: number;
    plan: string;
    status: string;
    date: string;
  }[];
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(2)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PLAN_COLORS: Record<string, string> = {
  Pro: "#f59e0b",
  Premium: "#8b5cf6",
  Free: "#64748b",
  Monthly: "#f59e0b",
  Yearly: "#8b5cf6",
};

export default function BillingFinance() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/analytics/revenue");
      if (res.data?.success) {
        setRevenue(res.data.revenue);
      }
    } catch {
      setRevenue(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Billing & Finance
          </span>
        </div>
      </div>
    );
  }

  const transactions = revenue?.transactions ?? [];
  const planDist = revenue?.planDist ?? [];
  const planTotal = planDist.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Billing & Finance"
        description="Real-time payment and subscription overview"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success" pulse>
              {revenue?.monthTransactions ?? 0} Payments (Month)
            </StatusBadge>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all"
              style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <RefreshCw size={12} />
              Refresh
            </motion.button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={<DollarSign size={16} />} label="Total Revenue" value={formatCurrency(revenue?.total ?? 0)} color="#10b981" delay={0.05} />
        <KpiCard icon={<TrendingUp size={16} />} label="Revenue (Month)" value={formatCurrency(revenue?.month ?? 0)} color="#f59e0b" delay={0.1} />
        <KpiCard icon={<Clock size={16} />} label="Revenue (Today)" value={formatCurrency(revenue?.today ?? 0)} color="#38bdf8" delay={0.15} />
        <KpiCard icon={<CreditCard size={16} />} label="Avg Order Value" value={formatCurrency(revenue?.averageOrderValue ?? 0)} color="#818cf8" delay={0.2} />
        <KpiCard icon={<FileText size={16} />} label="Transactions" value={(revenue?.totalTransactions ?? 0).toLocaleString()} color="#f472b6" delay={0.25} />
        <KpiCard icon={<Crown size={16} />} label="Premium Users" value={(revenue?.premiumUsers ?? 0).toLocaleString()} color="#8b5cf6" delay={0.3} />
      </div>

      {/* Plan Distribution + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Users by Plan
            </h2>
          </div>
          {planDist.length === 0 ? (
            <p className="text-[11px] font-medium text-center py-8" style={{ color: "var(--text-muted)" }}>
              No plan distribution data yet
            </p>
          ) : (
            <div className="space-y-3">
              {planDist.map((p) => {
                const pct = planTotal > 0 ? ((p.value / planTotal) * 100).toFixed(1) : "0";
                const color = PLAN_COLORS[p.name] ?? "var(--text-secondary)";
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                      <span className="text-[11px] font-mono font-bold" style={{ color }}>
                        {p.value.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Recent transactions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="lg:col-span-2 rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <CreditCard size={16} style={{ color: "#10b981" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Recent Transactions
            </h2>
            <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              Latest {transactions.length}
            </span>
          </div>
          {transactions.length === 0 ? (
            <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
              No payments recorded yet
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
              {transactions.map((t, idx) => {
                const paid = t.status === "paid";
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.02, duration: 0.2 }}
                    className="flex items-center gap-4 px-5 py-3 transition-all hover:bg-white/[0.02]"
                  >
                    <span style={{ color: paid ? "#10b981" : "#ef4444" }}>
                      {paid ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{t.user}</span>
                        <StatusBadge variant={paid ? "success" : "error"}>{paid ? "Paid" : "Failed"}</StatusBadge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-muted)]">{t.plan}</span>
                        <span className="text-[10px] font-mono font-medium text-[var(--text-muted)]">{t.id.slice(0, 12)}…</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black font-mono" style={{ color: paid ? "#10b981" : "var(--text-secondary)" }}>
                        ₹{(t.amount / 100).toLocaleString("en-IN")}
                      </div>
                      <div className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
                        {formatDate(t.date)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color, delay }: { icon: React.ReactNode; label: string; value: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-2xl p-5 border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <div className="text-xl font-black font-mono tracking-tight" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs font-semibold mt-1" style={{ color: "var(--text-secondary)" }}>{label}</div>
    </motion.div>
  );
}
