"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, FileText, HelpCircle, ClipboardList,
  Presentation, BrainCircuit, Layers, TrendingUp,
  BarChart3, Loader2, Clock, RefreshCw, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { MetricCard } from "@/components/admin/shared/MetricCard";

interface LearningHubData {
  total: number;
  studySessions: number;
  notes: number;
  quizzes: number;
  assignments: number;
  ppts: number;
  mindmaps: number;
  flashcards: number;
}

interface LearningFeature {
  key: string;
  label: string;
  short: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  status: "active" | "growing" | "stable" | "low";
}

const FEATURE_META: Omit<LearningFeature, "value" | "status">[] = [
  { key: "studySessions", label: "Study Sessions", short: "Sessions", icon: <BookOpen size={16} />, color: "#10b981" },
  { key: "notes", label: "Notes Generated", short: "Notes", icon: <FileText size={16} />, color: "#818cf8" },
  { key: "quizzes", label: "Quizzes Created", short: "Quizzes", icon: <HelpCircle size={16} />, color: "#f59e0b" },
  { key: "assignments", label: "Assignments", short: "Assign", icon: <ClipboardList size={16} />, color: "#f472b6" },
  { key: "mindmaps", label: "Mind Maps", short: "Maps", icon: <BrainCircuit size={16} />, color: "#a78bfa" },
  { key: "flashcards", label: "Flashcards", short: "Cards", icon: <Layers size={16} />, color: "#fb923c" },
];

function getStatus(value: number, max: number): "active" | "growing" | "stable" | "low" {
  const ratio = max > 0 ? value / max : 0;
  if (ratio > 0.8) return "active";
  if (ratio > 0.5) return "growing";
  if (ratio > 0.2) return "stable";
  return "low";
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "info" | "error"> = {
  active: "success",
  growing: "info",
  stable: "warning",
  low: "error",
};

export default function LearningEcosystem() {
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [data, setData] = useState<LearningHubData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/admin/modules");
      if (res.data?.success) {
        setData({
          flashcards: 0,
          ...res.data.modules.learningHub,
        });
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[LearningEcosystem] fetch error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const features: LearningFeature[] = data
    ? FEATURE_META.map((meta) => {
        const value = data[meta.key as keyof LearningHubData] ?? 0;
        const max = Math.max(...FEATURE_META.map((m) => data[m.key as keyof LearningHubData] ?? 0));
        return { ...meta, value, status: getStatus(value, max) };
      })
    : [];

  const sorted = [...features].sort((a, b) => b.value - a.value);

  const chartData = features.map((f) => ({ short: f.short, value: f.value, color: f.color }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f59e0b" }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Loading Learning Ecosystem
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Learning Ecosystem"
        description="Health & usage overview of all learning-related features"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
              <Clock size={12} />
              Last refreshed: {lastRefreshed.toLocaleTimeString()}
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
              style={{
                background: "rgba(245,158,11,0.1)",
                borderColor: "rgba(245,158,11,0.25)",
                color: "#f59e0b",
              }}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        }
      />

      {/* Module Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {features.map((feat) => (
          <MetricCard
            key={feat.key}
            label={feat.label}
            value={feat.value.toLocaleString()}
            color={feat.color}
            icon={feat.icon}
            subtitle={feat.status}
          />
        ))}
      </div>

      {/* Usage Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} style={{ color: "#f59e0b" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Activity by Feature
          </h2>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2} barCategoryGap="12%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="short"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--text-primary)", fontWeight: 700 }}
              />
              <Bar dataKey="value" name="Total" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Feature Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: "#a78bfa" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Feature Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {features.map((feat) => (
            <motion.div
              key={feat.key}
              whileHover={{ scale: 1.02 }}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all"
              style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-color)" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${feat.color}18` }}
              >
                <span style={{ color: feat.color }}>{feat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {feat.label}
                </div>
                <div className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                  {feat.value.toLocaleString()} total
                </div>
              </div>
              <StatusBadge variant={STATUS_VARIANT[feat.status]}>{feat.status}</StatusBadge>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Top Performing Features */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="rounded-2xl border p-5"
        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} style={{ color: "#10b981" }} />
          <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
            Top Performing Features
          </h2>
        </div>
        <div className="space-y-2">
          {sorted.map((feat, idx) => {
            const barWidth = sorted[0].value > 0 ? (feat.value / sorted[0].value) * 100 : 0;
            return (
              <div key={feat.key} className="flex items-center gap-3">
                <span className="w-5 text-center text-[10px] font-black font-mono" style={{ color: "var(--text-muted)" }}>
                  {idx + 1}
                </span>
                <span style={{ color: feat.color }}>{feat.icon}</span>
                <span className="text-xs font-bold w-28 truncate" style={{ color: "var(--text-primary)" }}>
                  {feat.label}
                </span>
                <div className="flex-1 h-5 rounded-md overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-md"
                    style={{ background: `linear-gradient(90deg, ${feat.color}66, ${feat.color})` }}
                  />
                </div>
                <span className="text-xs font-black font-mono w-20 text-right" style={{ color: feat.color }}>
                  {feat.value.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
