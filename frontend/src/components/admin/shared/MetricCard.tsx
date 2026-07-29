"use client";

import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export function MetricCard({ label, value, color = "#f59e0b", icon, subtitle }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-xl border"
      style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
        {icon && <span style={{ color }}>{icon}</span>}
      </div>
      <div className="text-xl font-black font-mono tracking-tight" style={{ color }}>{value}</div>
      {subtitle && <div className="text-[10px] mt-1 font-medium" style={{ color: "var(--text-muted)" }}>{subtitle}</div>}
    </motion.div>
  );
}
