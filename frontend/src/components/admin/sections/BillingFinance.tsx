"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Clock, CreditCard, Users,
  RefreshCw, Loader2, CheckCircle2, XCircle, Crown,
  FileText, Ticket, Plus, Trash2, Power, BarChart3 as BarChart3Icon,
  ActivitySquare as ActivitySquareIcon, UserPlus, Ban, Gauge as GaugeIcon,
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

interface SubAnalytics {
  periodDays: number;
  mrr: number;
  arr: number;
  totalRevenue: number;
  netRevenue: number;
  refunds: number;
  activeSubscriptions: number;
  activeUsers: number;
  newSubscribers: number;
  churned: number;
  churnRate: number;
  upgradeRate: number;
  downgradeRate: number;
  freeUsers: number;
  premiumUsers: number;
  enterpriseUsers: number;
  subscribersByPlan: Record<string, number>;
  revenueSeries: {
    date: string;
    grossRevenue: number;
    netRevenue: number;
    newSubscribers: number;
    churnCount: number;
  }[];
}

interface AdminUserRef {
  id: string;
  name: string | null;
  email: string | null;
}

interface SubRow {
  id: string;
  userId: string;
  planCode: string;
  planId: string | null;
  status: string;
  billingCycle: string;
  provider: string;
  providerSubscriptionId: string | null;
  price: number;
  currency: string;
  autoRenew: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancellationRequestedAt: string | null;
  canceledAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: AdminUserRef | null;
}

interface TxnRow {
  id: string;
  userId: string;
  paymentId: string | null;
  orderId: string | null;
  type: string;
  provider: string;
  providerRef: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  user: AdminUserRef | null;
}

interface FeatureAccessRow {
  id: string;
  featureKey: string;
  name: string;
  description: string | null;
  category: string;
  requiredPlan: string;
  routePattern: string | null;
  gated: boolean;
  updatedAt: string;
}

interface UsageLimitRow {
  id: string;
  featureKey: string;
  planCode: string;
  dailyLimit: number | null;
  monthlyLimit: number | null;
  tokenLimit: number | null;
  storageMb: number | null;
  enabled: boolean;
  updatedAt: string;
}

function errMsg(err: unknown, fallback: string): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

function formatCurrency(n: number): string {
  const val = Number(n || 0);
  if (val >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`;
  if (val >= 100_000) return `₹${(val / 100_000).toFixed(2)} Lakh`;
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
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

  // Subscription analytics + admin management
  const [analytics, setAnalytics] = useState<SubAnalytics | null>(null);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subTotal, setSubTotal] = useState(0);
  const [txns, setTxns] = useState<TxnRow[]>([]);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const [features, setFeatures] = useState<FeatureAccessRow[]>([]);
  const [limits, setLimits] = useState<UsageLimitRow[]>([]);
  const [editingFeature, setEditingFeature] = useState<FeatureAccessRow | null>(null);
  const [editingLimit, setEditingLimit] = useState<UsageLimitRow | null>(null);
  const [showGrant, setShowGrant] = useState(false);
  const [grantForm, setGrantForm] = useState({ userId: "", plan: "enterprise", billingCycle: "monthly", durationDays: "30" });
  const [showLimitForm, setShowLimitForm] = useState(false);
  const [newLimit, setNewLimit] = useState({ featureKey: "", planCode: "", dailyLimit: "", monthlyLimit: "", tokenLimit: "", storageMb: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [revRes, couponRes, planRes, analyticsRes, subsRes, txnRes, accessRes] = await Promise.all([
        api.get("/admin/analytics/revenue"),
        api.get("/admin/coupons"),
        api.get("/admin/plans"),
        api.get("/admin/subscriptions/analytics"),
        api.get("/admin/subscriptions", { params: { page: subPage, perPage: 15 } }),
        api.get("/admin/subscriptions/transactions", { params: { page: txnPage, perPage: 15 } }),
        api.get("/admin/subscriptions/features"),
      ]);
      if (revRes.data?.success) setRevenue(revRes.data.revenue);
      if (couponRes.data?.success) setCoupons(couponRes.data.coupons ?? []);
      if (planRes.data?.success) setPlans(planRes.data.plans ?? []);
      if (analyticsRes.data?.success) setAnalytics(analyticsRes.data.analytics);
      if (subsRes.data?.success) {
        setSubs(subsRes.data.subscriptions ?? []);
        setSubTotal(subsRes.data.pagination?.total ?? 0);
      }
      if (txnRes.data?.success) {
        setTxns(txnRes.data.transactions ?? []);
        setTxnTotal(txnRes.data.pagination?.total ?? 0);
      }
      if (accessRes.data?.success) {
        setFeatures(accessRes.data.features ?? []);
        setLimits(accessRes.data.usageLimits ?? []);
      }
    } catch {
      setRevenue(null);
      setCoupons([]);
      setPlans([]);
      setAnalytics(null);
      setSubs([]);
      setTxns([]);
      setFeatures([]);
      setLimits([]);
    } finally {
      setLoading(false);
    }
  }, [subPage, txnPage]);

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

  // ─── Subscription management handlers ───

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post(`/admin/subscriptions/users/${grantForm.userId.trim()}/grant`, {
        plan: grantForm.plan,
        billingCycle: grantForm.billingCycle,
        durationDays: Number(grantForm.durationDays) || 30,
      });
      if (res.data?.success) {
        alert(res.data.message || "Plan granted");
        setShowGrant(false);
        setGrantForm({ userId: "", plan: "enterprise", billingCycle: "monthly", durationDays: "30" });
        fetchData();
      }
    } catch (err) {
      alert(errMsg(err, "Failed to grant plan"));
    }
  };

  const handleRefund = async (t: TxnRow) => {
    if (!t.paymentId) return;
    if (!window.confirm(`Refund ${formatCurrency((t.amount || 0) / 100)} for ${t.user?.name || t.userId}?`)) return;
    try {
      const res = await api.post(`/admin/subscriptions/payments/${t.paymentId}/refund`);
      if (res.data?.success) {
        alert(res.data.message || "Payment refunded");
        fetchData();
      }
    } catch (err) {
      alert(errMsg(err, "Failed to refund payment"));
    }
  };

  const handleSaveFeature = async (f: FeatureAccessRow) => {
    try {
      const res = await api.put(`/admin/subscriptions/features/${f.id}`, {
        requiredPlan: f.requiredPlan,
        gated: f.gated,
        name: f.name,
      });
      if (res.data?.success) {
        setFeatures((prev) => prev.map((x) => (x.id === f.id ? res.data.feature : x)));
        setEditingFeature(null);
      }
    } catch (err) {
      alert(errMsg(err, "Failed to update feature access"));
    }
  };

  const handleRefreshCatalog = async () => {
    try {
      const res = await api.post("/admin/subscriptions/features/refresh");
      if (res.data?.success) alert(res.data.message || "Feature catalog refreshed");
    } catch (err) {
      alert(errMsg(err, "Failed to refresh catalog"));
    }
  };

  const handleCreateLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/admin/subscriptions/limits", {
        featureKey: newLimit.featureKey.trim(),
        planCode: newLimit.planCode.trim(),
        dailyLimit: newLimit.dailyLimit ? Number(newLimit.dailyLimit) : null,
        monthlyLimit: newLimit.monthlyLimit ? Number(newLimit.monthlyLimit) : null,
        tokenLimit: newLimit.tokenLimit ? Number(newLimit.tokenLimit) : null,
        storageMb: newLimit.storageMb ? Number(newLimit.storageMb) : null,
      });
      if (res.data?.success) {
        setLimits((prev) => [...prev, res.data.usageLimit]);
        setNewLimit({ featureKey: "", planCode: "", dailyLimit: "", monthlyLimit: "", tokenLimit: "", storageMb: "" });
        setShowLimitForm(false);
      }
    } catch (err) {
      alert(errMsg(err, "Failed to create usage limit"));
    }
  };

  const handleSaveLimit = async (l: UsageLimitRow) => {
    try {
      const res = await api.put(`/admin/subscriptions/limits/${l.id}`, {
        dailyLimit: l.dailyLimit,
        monthlyLimit: l.monthlyLimit,
        tokenLimit: l.tokenLimit,
        storageMb: l.storageMb,
        enabled: l.enabled,
      });
      if (res.data?.success) {
        setLimits((prev) => prev.map((x) => (x.id === l.id ? res.data.usageLimit : x)));
        setEditingLimit(null);
      }
    } catch (err) {
      alert(errMsg(err, "Failed to update usage limit"));
    }
  };

  const handleDeleteLimit = async (l: UsageLimitRow) => {
    if (!window.confirm(`Delete usage limit for ${l.featureKey} / ${l.planCode}?`)) return;
    try {
      await api.delete(`/admin/subscriptions/limits/${l.id}`);
      setLimits((prev) => prev.filter((x) => x.id !== l.id));
    } catch (err) {
      alert(errMsg(err, "Failed to delete usage limit"));
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
  const subCount = analytics?.subscribersByPlan ?? {};
  const subPlanTotal = Object.values(subCount).reduce((s, n) => s + n, 0);
  const series = analytics?.revenueSeries ?? [];
  const maxGross = series.reduce((m, r) => Math.max(m, r.grossRevenue), 0);
  const subPages = Math.max(1, Math.ceil(subTotal / 15));
  const txnPages = Math.max(1, Math.ceil(txnTotal / 15));

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

      {/* Subscription Growth KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={<TrendingUp size={16} />} label="MRR" value={formatCurrency(analytics?.mrr ?? 0)} color="#10b981" delay={0.05} />
        <KpiCard icon={<BarChart3Icon size={16} />} label="ARR" value={formatCurrency(analytics?.arr ?? 0)} color="#f59e0b" delay={0.1} />
        <KpiCard icon={<DollarSign size={16} />} label="Net Revenue" value={formatCurrency(analytics?.netRevenue ?? 0)} color="#38bdf8" delay={0.15} />
        <KpiCard icon={<RefreshCw size={16} />} label="Refunds" value={formatCurrency(analytics?.refunds ?? 0)} color="#ef4444" delay={0.2} />
        <KpiCard icon={<Users size={16} />} label="Active Subs" value={(analytics?.activeSubscriptions ?? 0).toLocaleString()} color="#818cf8" delay={0.25} />
        <KpiCard icon={<ActivitySquareIcon size={16} />} label="Churn Rate" value={`${analytics?.churnRate ?? 0}%`} color="#f472b6" delay={0.3} />
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
                        ₹{(t.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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

      {/* Subscription analytics detail */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <BarChart3Icon size={16} style={{ color: "#10b981" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Subscription Analytics
          </h2>
          <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            Last {analytics?.periodDays ?? 30} days
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-5">
          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold mb-3" style={{ color: "var(--text-secondary)" }}>
              Revenue Trend (gross, ₹)
            </h3>
            {series.length === 0 ? (
              <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
                No revenue series data yet
              </p>
            ) : (
              <div className="flex items-end gap-1 h-36">
                {series.map((r) => {
                  const h = maxGross > 0 ? Math.max(4, Math.round((r.grossRevenue / maxGross) * 120)) : 4;
                  return (
                    <div key={r.date} className="flex-1 flex flex-col items-center gap-1" title={`${new Date(r.date).toLocaleDateString()}: ₹${r.grossRevenue}`}>
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: h, background: "linear-gradient(180deg, #f59e0b, #b45309)" }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Subscriber Breakdown</h3>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Free" value={(analytics?.freeUsers ?? 0).toLocaleString()} color="#64748b" />
              <MiniStat label="Premium" value={(analytics?.premiumUsers ?? 0).toLocaleString()} color="#f59e0b" />
              <MiniStat label="Enterprise" value={(analytics?.enterpriseUsers ?? 0).toLocaleString()} color="#8b5cf6" />
              <MiniStat label="New (period)" value={(analytics?.newSubscribers ?? 0).toLocaleString()} color="#10b981" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Upgrade Rate" value={`${analytics?.upgradeRate ?? 0}%`} color="#10b981" />
              <MiniStat label="Downgrade Rate" value={`${analytics?.downgradeRate ?? 0}%`} color="#f472b6" />
              <MiniStat label="Churned" value={(analytics?.churned ?? 0).toLocaleString()} color="#ef4444" />
              <MiniStat label="Active Users" value={(analytics?.activeUsers ?? 0).toLocaleString()} color="#38bdf8" />
            </div>
            {Object.keys(subCount).length > 0 && (
              <div className="pt-3 border-t space-y-1" style={{ borderColor: "var(--border-color)" }}>
                {Object.entries(subCount).map(([plan, count]) => {
                  const pct = subPlanTotal > 0 ? ((count / subPlanTotal) * 100).toFixed(0) : "0";
                  return (
                    <div key={plan} className="flex items-center justify-between text-[10px] font-bold">
                      <span className="font-mono" style={{ color: "var(--text-muted)" }}>{plan}</span>
                      <span style={{ color: "var(--text-primary)" }}>{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Subscriptions list */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.35 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <Crown size={16} style={{ color: "#8b5cf6" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Subscriptions
          </h2>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{subTotal} total</span>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowGrant((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer"
              style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" }}
            >
              <UserPlus size={11} /> Grant Plan
            </motion.button>
          </span>
        </div>

        {showGrant && (
          <form onSubmit={handleGrant} className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="sm:col-span-1">
              <Input label="User ID" value={grantForm.userId} onChange={(v) => setGrantForm((s) => ({ ...s, userId: v }))} placeholder="user_..." />
            </div>
            <SelectField
              label="Plan"
              value={grantForm.plan}
              onChange={(v) => setGrantForm((s) => ({ ...s, plan: v }))}
              options={[
                { value: "enterprise", label: "Enterprise" },
                { value: "pro_monthly", label: "Pro Monthly" },
                { value: "pro_yearly", label: "Pro Yearly" },
                { value: "free", label: "Free" },
              ]}
            />
            <SelectField
              label="Cycle"
              value={grantForm.billingCycle}
              onChange={(v) => setGrantForm((s) => ({ ...s, billingCycle: v }))}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly" },
              ]}
            />
            <Input label="Duration (days)" type="number" value={grantForm.durationDays} onChange={(v) => setGrantForm((s) => ({ ...s, durationDays: v }))} />
            <button
              type="submit"
              className="self-end py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff" }}
            >
              Grant
            </button>
          </form>
        )}

        {subs.length === 0 ? (
          <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
            No subscriptions recorded yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
                  <th className="px-5 py-2.5 font-bold">User</th>
                  <th className="px-3 py-2.5 font-bold">Plan</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold">Cycle</th>
                  <th className="px-3 py-2.5 font-bold">Amount</th>
                  <th className="px-3 py-2.5 font-bold">Period End</th>
                  <th className="px-3 py-2.5 font-bold">Provider</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                {subs.map((s) => {
                  const active = s.status === "active" || s.status === "cancel_at_period_end";
                  return (
                    <tr key={s.id} className="text-xs hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="font-bold truncate max-w-[160px]" style={{ color: "var(--text-primary)" }}>
                          {s.user?.name || s.user?.email || "—"}
                        </div>
                        <div className="text-[9px] font-mono text-[var(--text-muted)]">{s.user?.email || s.userId}</div>
                      </td>
                      <td className="px-3 py-3 font-mono font-bold" style={{ color: "#8b5cf6" }}>{s.planCode}</td>
                      <td className="px-3 py-3">
                        <StatusBadge variant={active ? "success" : "default"}>{s.status}</StatusBadge>
                      </td>
                      <td className="px-3 py-3 font-mono" style={{ color: "var(--text-secondary)" }}>{s.billingCycle}</td>
                      <td className="px-3 py-3 font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                        {s.price > 0 ? `₹${s.price.toLocaleString("en-IN")}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {new Date(s.currentPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{s.provider}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {subPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--border-color)" }}>
            <button
              onClick={() => setSubPage((p) => Math.max(1, p - 1))}
              disabled={subPage === 1}
              className="px-3 py-1 rounded-lg border text-[10px] font-bold cursor-pointer disabled:opacity-40"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              Prev
            </button>
            <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
              Page {subPage} / {subPages}
            </span>
            <button
              onClick={() => setSubPage((p) => Math.min(subPages, p + 1))}
              disabled={subPage === subPages}
              className="px-3 py-1 rounded-lg border text-[10px] font-bold cursor-pointer disabled:opacity-40"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              Next
            </button>
          </div>
        )}
      </motion.div>

      {/* Transactions & refunds */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.35 }}
        className="rounded-2xl border overflow-hidden"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
          <FileText size={16} style={{ color: "#f472b6" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Transactions & Refunds
          </h2>
          <span className="ml-auto text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
            {txnTotal} total
          </span>
        </div>
        {txns.length === 0 ? (
          <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
            No transactions recorded yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border-color)" }}>
                  <th className="px-5 py-2.5 font-bold">User</th>
                  <th className="px-3 py-2.5 font-bold">Type</th>
                  <th className="px-3 py-2.5 font-bold">Amount</th>
                  <th className="px-3 py-2.5 font-bold">Status</th>
                  <th className="px-3 py-2.5 font-bold">Provider</th>
                  <th className="px-3 py-2.5 font-bold">Date</th>
                  <th className="px-3 py-2.5 font-bold"></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--border-color)" }}>
                {txns.map((t) => {
                  const refundable = t.type === "payment" && t.status === "paid" && t.paymentId;
                  return (
                    <tr key={t.id} className="text-xs hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="font-bold truncate max-w-[160px]" style={{ color: "var(--text-primary)" }}>
                          {t.user?.name || t.user?.email || "—"}
                        </div>
                        <div className="text-[9px] font-mono text-[var(--text-muted)]">{t.user?.email || t.userId}</div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge variant={t.type === "refund" ? "error" : "success"}>{t.type}</StatusBadge>
                      </td>
                      <td className={`px-3 py-3 font-mono font-bold ${t.amount < 0 ? "text-red-500" : ""}`} style={{ color: t.amount < 0 ? "#ef4444" : "var(--text-primary)" }}>
                        {t.amount < 0 ? "-" : ""}₹{Math.abs(t.amount / 100).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-3 font-mono" style={{ color: "var(--text-secondary)" }}>{t.status}</td>
                      <td className="px-3 py-3 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{t.provider}</td>
                      <td className="px-3 py-3 text-[10px]" style={{ color: "var(--text-muted)" }}>{formatDate(t.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        {refundable && (
                          <button
                            onClick={() => handleRefund(t)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-bold cursor-pointer transition-all hover:border-red-500 hover:text-red-500"
                            style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                          >
                            <Ban size={10} /> Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {txnPages > 1 && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t" style={{ borderColor: "var(--border-color)" }}>
            <button
              onClick={() => setTxnPage((p) => Math.max(1, p - 1))}
              disabled={txnPage === 1}
              className="px-3 py-1 rounded-lg border text-[10px] font-bold cursor-pointer disabled:opacity-40"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              Prev
            </button>
            <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
              Page {txnPage} / {txnPages}
            </span>
            <button
              onClick={() => setTxnPage((p) => Math.min(txnPages, p + 1))}
              disabled={txnPage === txnPages}
              className="px-3 py-1 rounded-lg border text-[10px] font-bold cursor-pointer disabled:opacity-40"
              style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              Next
            </button>
          </div>
        )}
      </motion.div>

      {/* Feature access + usage limits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature access */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <Crown size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Feature Access
            </h2>
            <span className="ml-auto">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleRefreshCatalog}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
              >
                <RefreshCw size={11} /> Refresh Catalog
              </motion.button>
            </span>
          </div>
          <div className="divide-y max-h-[420px] overflow-y-auto" style={{ borderColor: "var(--border-color)" }}>
            {features.length === 0 ? (
              <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
                Feature catalog is empty. Refresh the catalog from the feature registry.
              </p>
            ) : (
              features.map((f) =>
                editingFeature?.id === f.id ? (
                  <div key={f.id} className="px-5 py-3 grid grid-cols-2 gap-3">
                    <label className="block col-span-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>
                        Name
                      </span>
                      <input
                        value={editingFeature.name}
                        onChange={(e) => setEditingFeature((s) => (s ? { ...s, name: e.target.value } : s))}
                        className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none focus:border-amber-500 transition-colors"
                        style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                      />
                    </label>
                    <SelectField
                      label="Required Plan"
                      value={editingFeature.requiredPlan}
                      onChange={(v) => setEditingFeature((s) => (s ? { ...s, requiredPlan: v } : s))}
                      options={[
                        { value: "free", label: "Free" },
                        { value: "premium", label: "Premium" },
                        { value: "enterprise", label: "Enterprise" },
                      ]}
                    />
                    <label className="flex items-end gap-2 pb-1.5">
                      <input
                        type="checkbox"
                        checked={editingFeature.gated}
                        onChange={(e) => setEditingFeature((s) => (s ? { ...s, gated: e.target.checked } : s))}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>Gated</span>
                    </label>
                    <div className="col-span-2 flex gap-2">
                      <button
                        onClick={() => handleSaveFeature(editingFeature)}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer"
                        style={{ background: "#f59e0b", color: "#000" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingFeature(null)}
                        className="px-4 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={f.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--text-primary)" }}>{f.name}</span>
                        <StatusBadge variant={f.gated ? "warning" : "success"}>
                          {f.gated ? "Gated" : "Open"}
                        </StatusBadge>
                      </div>
                      <div className="text-[10px] font-medium mt-0.5 font-mono text-[var(--text-muted)]">
                        {f.featureKey} · {f.category} · required: {f.requiredPlan}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingFeature(f)}
                      className="p-2 rounded-lg border cursor-pointer transition-all hover:border-amber-500 hover:text-amber-400"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                      title="Edit feature access"
                    >
                      <Plus size={13} style={{ transform: "rotate(45deg)" }} />
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </motion.div>

        {/* Usage limits */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.35 }}
          className="rounded-2xl border overflow-hidden"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <GaugeIcon size={16} style={{ color: "#10b981" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Usage Limits
            </h2>
            <span className="ml-auto">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowLimitForm((v) => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}
              >
                <Plus size={11} /> New Limit
              </motion.button>
            </span>
          </div>

          {showLimitForm && (
            <form onSubmit={handleCreateLimit} className="grid grid-cols-2 gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
              <Input label="Feature Key" value={newLimit.featureKey} onChange={(v) => setNewLimit((s) => ({ ...s, featureKey: v }))} placeholder="ai_chat" />
              <Input label="Plan Code" value={newLimit.planCode} onChange={(v) => setNewLimit((s) => ({ ...s, planCode: v }))} placeholder="free" />
              <Input label="Daily Limit" type="number" value={newLimit.dailyLimit} onChange={(v) => setNewLimit((s) => ({ ...s, dailyLimit: v }))} />
              <Input label="Monthly Limit" type="number" value={newLimit.monthlyLimit} onChange={(v) => setNewLimit((s) => ({ ...s, monthlyLimit: v }))} />
              <Input label="Token Limit" type="number" value={newLimit.tokenLimit} onChange={(v) => setNewLimit((s) => ({ ...s, tokenLimit: v }))} />
              <Input label="Storage (MB)" type="number" value={newLimit.storageMb} onChange={(v) => setNewLimit((s) => ({ ...s, storageMb: v }))} />
              <button
                type="submit"
                className="col-span-2 py-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #10b981, #047857)", color: "#fff" }}
              >
                Create Usage Limit
              </button>
            </form>
          )}

          <div className="divide-y max-h-[420px] overflow-y-auto" style={{ borderColor: "var(--border-color)" }}>
            {limits.length === 0 ? (
              <p className="text-[11px] font-medium text-center py-10" style={{ color: "var(--text-muted)" }}>
                No custom usage limits. Defaults from the seed data apply.
              </p>
            ) : (
              limits.map((l) =>
                editingLimit?.id === l.id ? (
                  <div key={l.id} className="px-5 py-3 grid grid-cols-2 gap-2">
                    <Input label="Daily" type="number" value={l.dailyLimit == null ? "" : String(l.dailyLimit)} onChange={(v) => setEditingLimit((s) => (s ? { ...s, dailyLimit: v === "" ? null : Number(v) } : s))} />
                    <Input label="Monthly" type="number" value={l.monthlyLimit == null ? "" : String(l.monthlyLimit)} onChange={(v) => setEditingLimit((s) => (s ? { ...s, monthlyLimit: v === "" ? null : Number(v) } : s))} />
                    <Input label="Tokens" type="number" value={l.tokenLimit == null ? "" : String(l.tokenLimit)} onChange={(v) => setEditingLimit((s) => (s ? { ...s, tokenLimit: v === "" ? null : Number(v) } : s))} />
                    <Input label="Storage MB" type="number" value={l.storageMb == null ? "" : String(l.storageMb)} onChange={(v) => setEditingLimit((s) => (s ? { ...s, storageMb: v === "" ? null : Number(v) } : s))} />
                    <label className="flex items-end gap-2 pb-1.5">
                      <input
                        type="checkbox"
                        checked={l.enabled}
                        onChange={(e) => setEditingLimit((s) => (s ? { ...s, enabled: e.target.checked } : s))}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      <span className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>Enabled</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveLimit(editingLimit)} className="flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer" style={{ background: "#10b981", color: "#fff" }}>Save</button>
                      <button onClick={() => setEditingLimit(null)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={l.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono truncate" style={{ color: "var(--text-primary)" }}>{l.featureKey}</span>
                        <StatusBadge variant={l.enabled ? "success" : "default"}>{l.enabled ? "On" : "Off"}</StatusBadge>
                      </div>
                      <div className="text-[10px] font-medium mt-0.5 text-[var(--text-muted)]">
                        {l.planCode} · daily {l.dailyLimit ?? "∞"} · monthly {l.monthlyLimit ?? "∞"} · tokens {l.tokenLimit ?? "∞"} · {l.storageMb ?? "∞"}MB
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingLimit(l)}
                      className="p-2 rounded-lg border cursor-pointer transition-all hover:border-emerald-500 hover:text-emerald-400"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                      title="Edit usage limit"
                    >
                      <Plus size={13} style={{ transform: "rotate(45deg)" }} />
                    </button>
                    <button
                      onClick={() => handleDeleteLimit(l)}
                      className="p-2 rounded-lg border cursor-pointer transition-all hover:border-red-500 hover:text-red-500"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}
                      title="Delete usage limit"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )
              )
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

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-color)" }}>
      <div className="text-base font-black font-mono" style={{ color }}>{value}</div>
      <div className="text-[10px] font-semibold mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-bold uppercase tracking-wider mb-1 block" style={{ color: "var(--text-muted)" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none focus:border-amber-500 transition-colors"
        style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-slate-900">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
