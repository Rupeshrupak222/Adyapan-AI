"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { useThemeColors } from "@/hooks/useThemeColors";
import { Target, TrendingUp, Zap, AlertCircle, RefreshCw } from "lucide-react";

interface PlacementData {
  placementScore: number;
  subScores: {
    coding: number;
    aptitude: number;
    interview: number;
    resume: number;
    learning: number;
    softSkills: number;
  };
  highestImpactTask: { title: string; estimatedImpact: number; action: string } | null;
}

export function PlacementImpactCard({
  accentColor = "#f59e0b",
  onNavigate,
}: {
  accentColor?: string;
  onNavigate?: (view: string) => void;
}) {
  const tc = useThemeColors();
  const [data, setData] = useState<PlacementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/placement/intelligence/score");
      if (res.data.success) setData(res.data);
    } catch {
      setError("Unable to load placement data.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return null;

  if (error && !data) {
    return (
      <div
        className="p-4 rounded-2xl border text-center"
        style={{ background: tc.cardBg, borderColor: tc.border }}
        aria-label="Placement intelligence error"
      >
        <div className="flex flex-col items-center gap-2">
          <AlertCircle size={18} className="text-rose-400" />
          <p className="text-[11px] font-bold" style={{ color: tc.text }}>{error}</p>
          <button
            onClick={fetchData}
            className="text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
            aria-label="Retry loading placement data"
          >
            <RefreshCw size={10} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const score = data.placementScore;
  const circumference = 2 * Math.PI * 28;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden cursor-pointer group"
      style={{
        background: tc.cardBg,
        borderColor: tc.border,
      }}
      onClick={() => onNavigate?.("placement-intelligence")}
      role="button"
      tabIndex={0}
      aria-label={`Placement intelligence score: ${score}%. ${score >= 70 ? "Placement Ready" : score >= 40 ? "Making Progress" : "Building Foundations"}`}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigate?.("placement-intelligence"); } }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] pointer-events-none"
        style={{ background: `${accentColor}08` }} />

      <div className="relative z-10 flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="28" fill="none" stroke={tc.border} strokeWidth="5" />
            <motion.circle
              cx="32" cy="32" r="28" fill="none"
              stroke={accentColor}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black" style={{ color: accentColor }}>{score}%</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Target size={12} style={{ color: accentColor }} />
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: accentColor }}>
              Placement Intelligence
            </span>
          </div>
          <p className="text-xs font-bold" style={{ color: tc.text }}>
            {score >= 70 ? "Placement Ready" : score >= 40 ? "Making Progress" : "Building Foundations"}
          </p>
          {data.highestImpactTask && (
            <div className="flex items-center gap-1 mt-1.5">
              <Zap size={10} className="text-emerald-500" />
              <span className="text-[10px] text-emerald-400 font-semibold truncate">
                +{data.highestImpactTask.estimatedImpact}% → {data.highestImpactTask.title}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}15` }}>
            <TrendingUp size={14} style={{ color: accentColor }} />
          </div>
          <span className="text-[10px] font-bold" style={{ color: tc.textMuted }}>
            View
          </span>
        </div>
      </div>
    </motion.div>
  );
}
