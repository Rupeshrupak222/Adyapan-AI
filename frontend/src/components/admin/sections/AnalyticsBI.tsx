"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Briefcase, Code2, RefreshCw, CheckCircle2,
} from "lucide-react";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { toast } from "sonner";

interface AnalyticsData {
  totalUsers: number;
  activePremium: number;
  premiumConversionRate: number;
  totalJobs: number;
  totalCoding: number;
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-1"
    >
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{label}</span>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="text-2xl font-extrabold text-[var(--text-primary)]">{value}</div>
      <div className="text-[11px] text-[var(--text-secondary)]">{sub}</div>
    </motion.div>
  );
}

export default function AnalyticsBI() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/analytics/bi");
      if (res.data?.success && res.data?.analytics) {
        setData(res.data.analytics);
      }
    } catch {
      toast.error("Failed to load live BI metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const conversion = data?.premiumConversionRate ?? 0;

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Analytics & Business Intelligence"
        description="Live platform telemetry from real database counts"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="success">Live Database Telemetry</StatusBadge>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={data?.totalUsers?.toLocaleString() ?? "—"}
          sub="Registered accounts"
          icon={<Users size={16} />}
          color="#f59e0b"
        />
        <KpiCard
          label="Active Subscriptions"
          value={data?.activePremium?.toLocaleString() ?? "—"}
          sub="Users with an active plan"
          icon={<TrendingUp size={16} />}
          color="#10b981"
        />
        <KpiCard
          label="Job Listings"
          value={data?.totalJobs?.toLocaleString() ?? "—"}
          sub="Active discovery jobs"
          icon={<Briefcase size={16} />}
          color="#818cf8"
        />
        <KpiCard
          label="Coding Questions"
          value={data?.totalCoding?.toLocaleString() ?? "—"}
          sub="Synced problem bank"
          icon={<Code2 size={16} />}
          color="#38bdf8"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Platform Summary */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Platform Summary</h3>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-dark)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Total Registered Users</span>
              <span className="font-bold text-[var(--text-primary)]">{data?.totalUsers?.toLocaleString() ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-dark)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Active Subscriptions</span>
              <span className="font-bold text-[var(--text-primary)]">{data?.activePremium?.toLocaleString() ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-dark)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Live Job Listings</span>
              <span className="font-bold text-[var(--text-primary)]">{data?.totalJobs?.toLocaleString() ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-dark)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)]">Synced Coding Questions</span>
              <span className="font-bold text-[var(--text-primary)]">{data?.totalCoding?.toLocaleString() ?? 0}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <CheckCircle2 size={14} className="inline mr-1" /> All figures are direct database counts — no estimated or sampled values.
            </div>
          </div>
        </div>

        {/* Subscription Conversion */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-color)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Subscription Conversion</h3>
          {data ? (
            <>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black font-mono" style={{ color: "#f59e0b" }}>{conversion}%</span>
                <span className="text-[10px] font-medium text-[var(--text-muted)]">
                  {data.activePremium.toLocaleString()} of {data.totalUsers.toLocaleString()} users
                </span>
              </div>
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, conversion)}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
                />
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Share of registered users with an active paid subscription.
              </p>
            </>
          ) : (
            <p className="text-[11px] py-6 text-center" style={{ color: "var(--text-muted)" }}>
              No analytics data available right now.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
