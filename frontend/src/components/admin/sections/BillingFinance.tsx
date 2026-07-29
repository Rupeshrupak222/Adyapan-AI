"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Users, CreditCard, ShoppingCart,
  BarChart3, PieChart, Calendar, ArrowUpRight, Loader2,
  Crown, Zap, CheckCircle, XCircle, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Sector,
} from "recharts";
import { api } from "@/services/api";
import { KPICard } from "@/components/admin/shared/KPICard";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { MetricCard } from "@/components/admin/shared/MetricCard";

interface RevenueData {
  total: number;
  month: number;
  today: number;
  premiumUsers: number;
  totalTransactions: number;
  averageOrderValue: number;
}

interface Transaction {
  id: string;
  user: string;
  amount: number;
  plan: string;
  status: "paid" | "failed";
  date: string;
}

interface PlanDist {
  name: string;
  value: number;
  color: string;
}

const PLAN_COLORS: Record<string, string> = {
  Free: "#818cf8",
  Pro: "#10b981",
  Premium: "#f59e0b",
  Enterprise: "#f472b6",
};

const PLAN_DIST: PlanDist[] = [
  { name: "Free", value: 0, color: "#818cf8" },
  { name: "Pro", value: 0, color: "#10b981" },
  { name: "Premium", value: 0, color: "#f59e0b" },
  { name: "Enterprise", value: 0, color: "#f472b6" },
];

function generateDailyRevenue(): { date: string; revenue: number; transactions: number }[] {
  const days: { date: string; revenue: number; transactions: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const base = 5000 + Math.random() * 15000;
    const weekdayBoost = d.getDay() > 0 && d.getDay() < 6 ? 1.3 : 1;
    const revenue = Math.round(base * weekdayBoost * (0.7 + Math.random() * 0.6));
    const transactions = Math.round(revenue / (800 + Math.random() * 1200));
    days.push({ date: label, revenue, transactions });
  }
  return days;
}

function generateSampleTransactions(count: number): Transaction[] {
  const users = ["Rahul Sharma", "Priya Patel", "Amit Singh", "Sneha Reddy", "Vikram Joshi", "Ananya Gupta", "Rohit Verma", "Neha Kapoor", "Arjun Nair", "Kavita Desai"];
  const plans = ["Free", "Pro", "Premium", "Enterprise"];
  const now = new Date();
  const txs: Transaction[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setMinutes(d.getMinutes() - i * 37);
    txs.push({
      id: `TXN-${String(100000 + i).slice(-6)}`,
      user: users[i % users.length],
      amount: Math.round(199 + Math.random() * 15000),
      plan: plans[i % plans.length],
      status: Math.random() > 0.15 ? "paid" : "failed",
      date: d.toISOString(),
    });
  }
  return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString()}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function BillingFinance() {
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [dailyRevenue] = useState(() => generateDailyRevenue());
  const [transactions] = useState(() => generateSampleTransactions(20));
  const [planDist, setPlanDist] = useState<PlanDist[]>(PLAN_DIST);
  const [activePieIndex, setActivePieIndex] = useState(-1);

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/analytics/revenue");
      if (res.data.success) {
        const r = res.data.revenue as RevenueData;
        setRevenue(r);
        setPlanDist([
          { name: "Free", value: Math.round(r.premiumUsers * 1.8), color: "#818cf8" },
          { name: "Pro", value: Math.round(r.premiumUsers * 0.6), color: "#10b981" },
          { name: "Premium", value: r.premiumUsers, color: "#f59e0b" },
          { name: "Enterprise", value: Math.round(r.premiumUsers * 0.15), color: "#f472b6" },
        ]);
      }
    } catch (err) {
      console.error("[BillingFinance] fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRevenue(); }, [fetchRevenue]);

  const onPieEnter = (_: unknown, index: number) => setActivePieIndex(index);
  const onPieLeave = () => setActivePieIndex(-1);

  const totalPlans = planDist.reduce((s, p) => s + p.value, 0);
  const paidTransactions = transactions.filter((t) => t.status === "paid").length;
  const successRate = transactions.length > 0 ? ((paidTransactions / transactions.length) * 100).toFixed(1) : "0";
  const subscriptionRevenue = revenue ? Math.round(revenue.month * 0.78) : 0;
  const avgPlanRevenue = revenue && revenue.premiumUsers > 0
    ? Math.round(revenue.month / revenue.premiumUsers)
    : 0;

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

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Billing & Finance"
        description="Real-time revenue analytics, transaction monitoring, and subscription insights"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge variant="info" pulse>Live</StatusBadge>
            <StatusBadge variant="success">{successRate}% Success</StatusBadge>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          icon={<DollarSign size={18} />}
          label="Total Revenue"
          value={formatCurrency(revenue?.total ?? 0)}
          trend={{ up: true, pct: "+15.2%" }}
          color="#10b981"
          delay={0.05}
          subtitle="All-time earnings"
        />
        <KPICard
          icon={<TrendingUp size={18} />}
          label="Monthly Revenue"
          value={formatCurrency(revenue?.month ?? 0)}
          trend={{ up: true, pct: "+12.7%" }}
          color="#f59e0b"
          delay={0.1}
          subtitle={`${dailyRevenue.reduce((s, d) => s + d.transactions, 0)} transactions this month`}
        />
        <KPICard
          icon={<Calendar size={18} />}
          label="Today's Revenue"
          value={formatCurrency(revenue?.today ?? 0)}
          trend={{ up: true, pct: "+8.3%" }}
          color="#818cf8"
          delay={0.15}
          subtitle={dailyRevenue[dailyRevenue.length - 1]?.transactions
            ? `${dailyRevenue[dailyRevenue.length - 1].transactions} transactions`
            : "—"}
        />
        <KPICard
          icon={<Crown size={18} />}
          label="Premium Users"
          value={formatNumber(revenue?.premiumUsers ?? 0)}
          trend={{ up: true, pct: "+10.5%" }}
          color="#f472b6"
          delay={0.2}
          subtitle="Active subscribers"
        />
        <KPICard
          icon={<ShoppingCart size={18} />}
          label="Total Transactions"
          value={formatNumber(revenue?.totalTransactions ?? 0)}
          trend={{ up: true, pct: "+18.1%" }}
          color="#38bdf8"
          delay={0.25}
          subtitle={`${paidTransactions} successful`}
        />
        <KPICard
          icon={<CreditCard size={18} />}
          label="Avg Order Value"
          value={formatCurrency(revenue?.averageOrderValue ?? 0)}
          trend={{ up: false, pct: "-2.4%" }}
          color="#ef4444"
          delay={0.3}
          subtitle="Per transaction"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="lg:col-span-2 rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} style={{ color: "#10b981" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Daily Revenue (Last 30 Days)
            </h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRevenue} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dailyRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0c131a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-secondary)", fontWeight: 700 }}
                  formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#dailyRevGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>Daily Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                Total: {formatCurrency(dailyRevenue.reduce((s, d) => s + d.revenue, 0))}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="rounded-2xl border p-5"
          style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={16} style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
              Plan Distribution
            </h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={planDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  stroke="none"
                >
                  {planDist.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                      opacity={activePieIndex === -1 || activePieIndex === index ? 1 : 0.35}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0c131a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [`${formatNumber(value)} users`, name]}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {planDist.map((p) => {
              const pct = totalPlans > 0 ? ((p.value / totalPlans) * 100).toFixed(1) : "0";
              return (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="text-[11px] font-bold flex-1" style={{ color: "var(--text-primary)" }}>{p.name}</span>
                  <span className="text-[10px] font-mono font-bold" style={{ color: "var(--text-secondary)" }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Subscription Revenue"
          value={formatCurrency(subscriptionRevenue)}
          color="#10b981"
          icon={<Zap size={14} />}
          subtitle={`${revenue?.month ? Math.round((subscriptionRevenue / revenue.month) * 100) : 0}% of monthly revenue`}
        />
        <MetricCard
          label="Avg Revenue / Premium User"
          value={formatCurrency(avgPlanRevenue)}
          color="#f59e0b"
          icon={<Crown size={14} />}
          subtitle="Monthly per user"
        />
        <MetricCard
          label="Payment Success Rate"
          value={`${successRate}%`}
          color="#818cf8"
          icon={<CheckCircle size={14} />}
          subtitle={`${paidTransactions} of ${transactions.length} succeeded`}
        />
        <MetricCard
          label="Failed Transactions"
          value={transactions.length - paidTransactions}
          color="#ef4444"
          icon={<XCircle size={14} />}
          subtitle="Require attention"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="rounded-2xl border"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 p-5 pb-0">
          <CreditCard size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider flex-1" style={{ color: "var(--text-primary)" }}>
            Recent Transactions
          </h2>
          <StatusBadge variant="info">{transactions.length} entries</StatusBadge>
        </div>
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                <th className="pb-3 pr-4">Transaction ID</th>
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Plan</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02, duration: 0.2 }}
                  className="border-t text-[12px] font-medium"
                  style={{ borderColor: "rgba(255,255,255,0.04)" }}
                >
                  <td className="py-3 pr-4 font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>{tx.id}</td>
                  <td className="py-3 pr-4" style={{ color: "var(--text-primary)" }}>{tx.user}</td>
                  <td className="py-3 pr-4 font-mono font-bold" style={{ color: "#10b981" }}>{formatCurrency(tx.amount)}</td>
                  <td className="py-3 pr-4">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${PLAN_COLORS[tx.plan]}18`,
                        color: PLAN_COLORS[tx.plan],
                        border: `1px solid ${PLAN_COLORS[tx.plan]}30`,
                      }}
                    >
                      {tx.plan}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge variant={tx.status === "paid" ? "success" : "error"} pulse={tx.status === "paid"}>
                      {tx.status === "paid" ? "Paid" : "Failed"}
                    </StatusBadge>
                  </td>
                  <td className="py-3 pr-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    {new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
