"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Clock, CreditCard, Users,
  RefreshCw, Loader2, CheckCircle2, XCircle, Crown,
  FileText, Ticket, Plus, Trash2, Power,
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
  couponStats?: {
    totalDiscount: number;
    totalRedemptions: number;
    coupons: CouponRow[];
  };
  transactions: {
    id: string;
    user: string;
    amount: number;
    plan: string;
    status: string;
    couponCode?: string | null;
    discountAmount?: number;
    date: string;
  }[];
}

interface CouponRow {
  id: string;
  code: string;
  discountPct: number;
  validUntil: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
}

interface PlanRow {
  id: string;
  name: string;
  code: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  featuresStr?: string;
  isActive: boolean;
}

function errMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
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
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);

  // Coupon form
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", discountPct: "", maxUses: "", validUntil: "" });

  // Plan form
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: "", code: "", priceMonthly: "", priceYearly: "", features: "" });
  const [editingPlan, setEditingPlan] = useState<PlanRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, couponRes, planRes] = await Promise.all([
        api.get("/admin/analytics/revenue"),
        api.get("/admin/coupons"),
        api.get("/admin/plans"),
      ]);
      if (revRes.data?.success) setRevenue(revRes.data.revenue);
      if (couponRes.data?.success) setCoupons(couponRes.data.coupons ?? []);
      if (planRes.data?.success) setPlans(planRes.data.plans ?? []);
    } catch {
      setRevenue(null);
      setCoupons([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/admin/coupons", {
        code: newCoupon.code,
        discountPct: Number(newCoupon.discountPct),
        maxUses: newCoupon.maxUses ? Number(newCoupon.maxUses) : null,
        validUntil: newCoupon.validUntil ? new Date(newCoupon.validUntil).toISOString() : null,
      });
      if (res.data?.success) {
        setCoupons((prev) => [res.data.coupon, ...prev]);
        setNewCoupon({ code: "", discountPct: "", maxUses: "", validUntil: "" });
        setShowCouponForm(false);
      }
    } catch (err) {
      alert(errMsg(err, "Failed to create coupon"));
    }
  };

  const handleToggleCoupon = async (c: CouponRow) => {
    try {
      const res = await api.put(`/admin/coupons/${c.id}`, { isActive: !c.isActive });
      if (res.data?.success) {
        setCoupons((prev) => prev.map((x) => (x.id === c.id ? res.data.coupon : x)));
      }
    } catch (err) {
      alert(errMsg(err, "Failed to update coupon"));
    }
  };

  const handleDeleteCoupon = async (c: CouponRow) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
    try {
      await api.delete(`/admin/coupons/${c.id}`);
      setCoupons((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      alert(errMsg(err, "Failed to delete coupon"));
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const featList = newPlan.features
        ? newPlan.features.split(",").map((f) => f.trim()).filter(Boolean)
        : [];
      const res = await api.post("/admin/plans", {
        name: newPlan.name,
        code: newPlan.code,
        priceMonthly: Number(newPlan.priceMonthly),
        priceYearly: Number(newPlan.priceYearly),
        features: featList,
      });
      if (res.data?.success) {
        setPlans((prev) => [...prev, res.data.plan]);
        setNewPlan({ name: "", code: "", priceMonthly: "", priceYearly: "", features: "" });
        setShowPlanForm(false);
      }
    } catch (err) {
      alert(errMsg(err, "Failed to create plan"));
    }
  };

  const handleTogglePlan = async (p: PlanRow) => {
    try {
      const res = await api.put(`/admin/plans/${p.id}`, { isActive: !p.isActive });
      if (res.data?.success) {
        setPlans((prev) => prev.map((x) => (x.id === p.id ? res.data.plan : x)));
      }
    } catch (err) {
      alert(errMsg(err, "Failed to update plan"));
    }
  };

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      const featList = editingPlan.featuresStr != null
        ? editingPlan.featuresStr.split(",").map((f) => f.trim()).filter(Boolean)
        : editingPlan.features;
      const res = await api.put(`/admin/plans/${editingPlan.id}`, {
        name: editingPlan.name,
        code: editingPlan.code,
        priceMonthly: Number(editingPlan.priceMonthly),
        priceYearly: Number(editingPlan.priceYearly),
        features: featList,
      });
      if (res.data?.success) {
        setPlans((prev) => prev.map((x) => (x.id === editingPlan.id ? res.data.plan : x)));
        setEditingPlan(null);
      }
    } catch (err) {
      alert(errMsg(err, "Failed to update plan"));
    }
  };

  const handleDeletePlan = async (p: PlanRow) => {
    if (!window.confirm(`Delete plan ${p.name}?`)) return;
    try {
      await api.delete(`/admin/plans/${p.id}`);
      setPlans((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      alert(errMsg(err, "Failed to delete plan"));
    }
  };

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
  const couponStats = revenue?.couponStats;

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

          {/* Coupon summary */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Ticket size={16} style={{ color: "#f59e0b" }} />
              <h2 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                Coupon Impact
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)" }}>
                <div className="text-lg font-black font-mono" style={{ color: "#ef4444" }}>
                  -{formatCurrency(couponStats?.totalDiscount ?? 0)}
                </div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>Discount Given</div>
              </div>
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)" }}>
                <div className="text-lg font-black font-mono" style={{ color: "#f59e0b" }}>
                  {couponStats?.totalRedemptions ?? 0}
                </div>
                <div className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>Coupon Redemptions</div>
              </div>
            </div>
          </div>
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
                        {t.couponCode && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                            style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                            <Ticket size={9} /> {t.couponCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-medium text-[var(--text-muted)]">{t.plan}</span>
                        <span className="text-[10px] font-mono font-medium text-[var(--text-muted)]">{t.id.slice(0, 12)}…</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-black font-mono" style={{ color: paid ? "#10b981" : "var(--text-secondary)" }}>
                        ₹{(t.amount / 100).toLocaleString("en-IN")}
                        {t.discountAmount ? (
                          <span className="block text-[9px] font-semibold text-red-500">-₹{(t.discountAmount / 100).toLocaleString("en-IN")}</span>
                        ) : null}
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

      {/* Coupons + Plans management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coupons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Ticket size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Coupons
            </h2>
            <span className="ml-auto">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowCouponForm((v) => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer"
                style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <Plus size={11} /> New Coupon
              </motion.button>
            </span>
          </div>

          {showCouponForm && (
            <form onSubmit={handleCreateCoupon} className="grid grid-cols-2 gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
              <Input label="Code" value={newCoupon.code} onChange={(v) => setNewCoupon((s) => ({ ...s, code: v }))} placeholder="ADYAPAN20" />
              <Input label="Discount %" type="number" value={newCoupon.discountPct} onChange={(v) => setNewCoupon((s) => ({ ...s, discountPct: v }))} placeholder="20" />
              <Input label="Max Uses" type="number" value={newCoupon.maxUses} onChange={(v) => setNewCoupon((s) => ({ ...s, maxUses: v }))} placeholder="Unlimited" />
              <Input label="Valid Until" type="date" value={newCoupon.validUntil} onChange={(v) => setNewCoupon((s) => ({ ...s, validUntil: v }))} />
              <button
                type="submit"
                className="col-span-2 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
              >
                Create Coupon
              </button>
            </form>
          )}

          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {coupons.length === 0 ? (
              <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
                No coupons yet. Create one to let users apply discounts on the billing page.
              </p>
            ) : (
              coupons.map((cp) => {
                const expired = cp.validUntil ? new Date(cp.validUntil) < new Date() : false;
                const active = cp.isActive && !expired;
                return (
                  <div key={cp.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: active ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)" }}>
                      <Ticket size={15} style={{ color: active ? "#f59e0b" : "var(--text-muted)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono" style={{ color: "var(--text-primary)" }}>{cp.code}</span>
                        <StatusBadge variant={active ? "success" : "default"}>
                          {expired ? "Expired" : cp.isActive ? "Active" : "Disabled"}
                        </StatusBadge>
                      </div>
                      <div className="text-[10px] font-medium mt-0.5 text-[var(--text-muted)]">
                        {cp.discountPct}% off · {cp.usedCount}/{cp.maxUses ?? "∞"} used
                        {cp.validUntil ? ` · till ${new Date(cp.validUntil).toLocaleDateString()}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleCoupon(cp)}
                      className="p-2 rounded-lg border cursor-pointer transition-all hover:border-amber-500"
                      style={{ borderColor: "var(--border-color)", color: active ? "#10b981" : "var(--text-muted)" }}
                      title={active ? "Disable" : "Enable"}
                    >
                      <Power size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteCoupon(cp)}
                      className="p-2 rounded-lg border cursor-pointer transition-all hover:border-red-500 hover:text-red-500"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                      title="Delete coupon"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Plans */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Crown size={16} style={{ color: "#8b5cf6" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Plans
            </h2>
            <span className="ml-auto">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowPlanForm((v) => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer"
                style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" }}
              >
                <Plus size={11} /> New Plan
              </motion.button>
            </span>
          </div>

          {showPlanForm && (
            <form onSubmit={handleCreatePlan} className="grid grid-cols-2 gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
              <Input label="Name" value={newPlan.name} onChange={(v) => setNewPlan((s) => ({ ...s, name: v }))} placeholder="e.g. Pro Monthly" />
              <Input label="Code" value={newPlan.code} onChange={(v) => setNewPlan((s) => ({ ...s, code: v }))} placeholder="e.g. pro_monthly" />
              <Input label="Monthly ₹" type="number" value={newPlan.priceMonthly} onChange={(v) => setNewPlan((s) => ({ ...s, priceMonthly: v }))} placeholder="199" />
              <Input label="Yearly ₹" type="number" value={newPlan.priceYearly} onChange={(v) => setNewPlan((s) => ({ ...s, priceYearly: v }))} placeholder="1999" />
              <div className="col-span-2">
                <Input label="Features (comma separated)" value={newPlan.features} onChange={(v) => setNewPlan((s) => ({ ...s, features: v }))} placeholder="Unlimited Resumes, All AI Models, Priority Support" />
              </div>
              <button
                type="submit"
                className="col-span-2 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff" }}
              >
                Create Plan
              </button>
            </form>
          )}

          <div className="divide-y" style={{ borderColor: "var(--border-color)" }}>
            {plans.length === 0 ? (
              <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
                No custom plans yet. Users see default Pro pricing.
              </p>
            ) : (
              plans.map((p) => (
                <div key={p.id} className="px-5 py-3">
                  {editingPlan?.id === p.id ? (
                    <form onSubmit={handleSavePlanEdit} className="grid grid-cols-2 gap-2">
                      <Input label="Name" value={editingPlan.name} onChange={(v) => setEditingPlan((s) => (s ? { ...s, name: v } : s))} />
                      <Input label="Code" value={editingPlan.code} onChange={(v) => setEditingPlan((s) => (s ? { ...s, code: v } : s))} />
                      <Input label="Monthly ₹" type="number" value={String(editingPlan.priceMonthly)} onChange={(v) => setEditingPlan((s) => (s ? { ...s, priceMonthly: Number(v) } : s))} />
                      <Input label="Yearly ₹" type="number" value={String(editingPlan.priceYearly)} onChange={(v) => setEditingPlan((s) => (s ? { ...s, priceYearly: Number(v) } : s))} />
                      <div className="col-span-2">
                        <Input
                          label="Features (comma separated)"
                          value={editingPlan.featuresStr ?? editingPlan.features?.join(", ") ?? ""}
                          onChange={(v) => setEditingPlan((s) => (s ? { ...s, featuresStr: v } : s))}
                        />
                      </div>
                      <div className="col-span-2 flex gap-2">
                        <button type="submit" className="flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                          style={{ background: "#8b5cf6", color: "#fff" }}>Save</button>
                        <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border"
                          style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>Cancel</button>
                      </div>
                    </form>
                  ) : (

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: p.isActive ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)" }}>
                        <Crown size={15} style={{ color: p.isActive ? "#8b5cf6" : "var(--text-muted)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                          <StatusBadge variant={p.isActive ? "success" : "default"}>
                            {p.isActive ? "Active" : "Disabled"}
                          </StatusBadge>
                        </div>
                        <div className="text-[10px] font-medium mt-0.5 text-[var(--text-muted)] font-mono">
                          {p.code} · ₹{p.priceMonthly}/mo · ₹{p.priceYearly}/yr
                        </div>
                      </div>
                      <button
                        onClick={() => handleTogglePlan(p)}
                        className="p-2 rounded-lg border cursor-pointer transition-all hover:border-purple-500"
                        style={{ borderColor: "var(--border-color)", color: p.isActive ? "#10b981" : "var(--text-muted)" }}
                        title={p.isActive ? "Disable" : "Enable"}
                      >
                        <Power size={13} />
                      </button>
                      <button
                        onClick={() => setEditingPlan(p)}
                        className="p-2 rounded-lg border cursor-pointer transition-all hover:border-purple-500 hover:text-purple-400"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                        title="Edit plan"
                      >
                        <Plus size={13} style={{ transform: "rotate(45deg)" }} />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p)}
                        className="p-2 rounded-lg border cursor-pointer transition-all hover:border-red-500 hover:text-red-500"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                        title="Delete plan"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none focus:border-amber-500 transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
      />
    </label>
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
