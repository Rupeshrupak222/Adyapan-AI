"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { up: boolean; pct: string };
  color?: string;
  delay?: number;
  subtitle?: string;
  onClick?: () => void;
}

export function KPICard({ icon, label, value, trend, color = "#f59e0b", delay = 0, subtitle, onClick }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      onClick={onClick}
      className="rounded-2xl p-5 border transition-all hover:scale-[1.02] cursor-pointer"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-color)",
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1"
            style={{
              background: trend.up ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
              color: trend.up ? "#10b981" : "#ef4444",
            }}>
            {trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.pct}
          </div>
        )}
      </div>
      <div className="text-3xl font-black mb-1 font-mono tracking-tight">{value}</div>
      <div className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</div>
      {subtitle && <div className="text-[10px] mt-1 font-medium" style={{ color: "var(--text-muted)" }}>{subtitle}</div>}
    </motion.div>
  );
}
