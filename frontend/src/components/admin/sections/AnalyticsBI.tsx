"use client";

import { motion } from "framer-motion";
import {
  BarChart3, GitBranch, Users, TrendingUp,
  GraduationCap, Target, Sparkles, LineChart,
} from "lucide-react";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";

interface AnalyticsView {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  eta: string;
}

const ANALYTICS_VIEWS: AnalyticsView[] = [
  {
    id: "user-funnels",
    title: "User Funnels",
    icon: <GitBranch size={18} />,
    description: "Visual conversion funnels showing user progression through signup, onboarding, feature adoption, and retention stages with drop-off analysis.",
    features: ["Signup → Activation", "Feature adoption flow", "Drop-off heatmaps", "A/B funnel comparison"],
    eta: "Q3 2026",
  },
  {
    id: "cohort-analysis",
    title: "Cohort Analysis",
    icon: <Users size={18} />,
    description: "Track user behavior grouped by acquisition date, university, or plan type. Measure retention, engagement, and revenue per cohort over time.",
    features: ["Weekly/monthly cohorts", "Retention matrices", "Behavioral segmentation", "Revenue per cohort"],
    eta: "Q3 2026",
  },
  {
    id: "retention",
    title: "Retention Analytics",
    icon: <TrendingUp size={18} />,
    description: "Deep dive into user retention patterns — daily, weekly, and monthly active users, churn prediction, and re-engagement opportunities.",
    features: ["DAU/WAU/MAU tracking", "Churn prediction", "Rolling retention curves", "Re-engagement funnel"],
    eta: "Q4 2026",
  },
  {
    id: "feature-adoption",
    title: "Feature Adoption",
    icon: <Target size={18} />,
    description: "Monitor which features users engage with most, feature stickiness scores, time-to-value, and adoption velocity across segments.",
    features: ["Feature usage heatmaps", "Stickiness scoring", "Time-to-value tracking", "Feature discovery paths"],
    eta: "Q4 2026",
  },
  {
    id: "student-success",
    title: "Student Success Analytics",
    icon: <GraduationCap size={18} />,
    description: "Measure student outcomes — interview rates, placement success, skill progression, learning completion rates, and academic performance metrics.",
    features: ["Placement rate tracking", "Skill progression curves", "Course completion rates", "Interview success metrics"],
    eta: "2027",
  },
  {
    id: "business-intelligence",
    title: "Business Intelligence",
    icon: <LineChart size={18} />,
    description: "Executive dashboards for revenue trends, subscription metrics, MRR, churn analysis, customer acquisition costs, and ROI calculations.",
    features: ["Revenue & MRR tracking", "CAC & LTV analysis", "Subscription health", "Forecasting models"],
    eta: "2027",
  },
];

export default function AnalyticsBI() {
  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Analytics & BI"
        description="Advanced analytics, business intelligence, and data-driven insights"
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge variant="info">{ANALYTICS_VIEWS.length} Views</StatusBadge>
            <StatusBadge variant="warning">Coming Soon</StatusBadge>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ANALYTICS_VIEWS.map((view, idx) => (
          <AnalyticsCard key={view.id} view={view} delay={idx * 0.04} />
        ))}
      </div>
    </div>
  );
}

function ChartPlaceholder() {
  return (
    <div className="flex items-end justify-between h-16 px-2 gap-1">
      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${h}%` }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
          className="flex-1 rounded-t-sm"
          style={{
            background: `linear-gradient(to top, rgba(245,158,11,0.6), rgba(245,158,11,0.2))`,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

function AnalyticsCard({ view, delay }: { view: AnalyticsView; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:scale-[1.02] cursor-pointer"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <span style={{ color: "#f59e0b" }}>{view.icon}</span>
        </div>
        <StatusBadge variant="warning">
          <Sparkles size={9} />
          {view.eta}
        </StatusBadge>
      </div>

      <div>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{view.title}</h3>
        <p className="text-[10px] font-medium mt-1 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {view.description}
        </p>
      </div>

      {/* Mini chart placeholder */}
      <div className="rounded-xl p-3 border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}>
        <ChartPlaceholder />
      </div>

      {/* Features */}
      <div className="flex flex-wrap gap-1.5">
        {view.features.map((f) => (
          <span
            key={f}
            className="px-2 py-0.5 rounded-full text-[9px] font-medium"
            style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
          >
            {f}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
