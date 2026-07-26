"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { cn } from "@/lib/cn";
import { PremiumCard, PremiumProgressBar } from "@/components/ui/PremiumComponents";
import { fadeUp } from "@/utils/animations";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { useThemeColors } from "@/hooks/useThemeColors";
import { Building2, AlertCircle, RefreshCw } from "lucide-react";

interface CompanyMatch {
  company: string;
  matchPercent: number;
  requiredSkills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  difficulty: string;
  avgPackage: string;
}

export function CompanyMatchWidget({
  onViewChange,
}: {
  onViewChange?: (view: string) => void;
}) {
  const tc = useThemeColors();
  const [matches, setMatches] = useState<CompanyMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/placement/intelligence/companies?top=6");
      if (res.data.success) setMatches(res.data.companyMatches);
    } catch (err) {
      console.error("Failed to load company matches:", err);
      setError("Unable to load company matches.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  if (loading) return null;

  if (error && matches.length === 0) {
    return (
      <PremiumCard className="p-5 text-center" aria-label="Company match error">
        <div className="flex flex-col items-center gap-2">
          <AlertCircle size={20} className="text-rose-400" />
          <p className="text-xs font-bold" style={{ color: tc.text }}>{error}</p>
          <button
            onClick={fetchMatches}
            className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
            aria-label="Retry loading company matches"
          >
            <RefreshCw size={10} /> Retry
          </button>
        </div>
      </PremiumCard>
    );
  }

  if (matches.length === 0) return null;

  const topMatch = matches[0];

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <PremiumCard glow className="p-5 relative overflow-hidden" aria-label="Top company match">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Building2 size={16} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">Top Company Match</h3>
                <p className="text-[10px]" style={{ color: tc.textMuted }}>Based on your skills</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <ScoreRing score={topMatch.matchPercent} size={70} strokeWidth={5} color="#8b56d4" label="Match" />
            <div className="flex-1 min-w-0">
              <div className="text-lg font-extrabold" style={{ color: tc.text }}>{topMatch.company}</div>
              <div className="text-xs" style={{ color: tc.textSec }}>{topMatch.avgPackage}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase",
                  topMatch.difficulty === "easy" ? "bg-emerald-500/15 text-emerald-400" :
                  topMatch.difficulty === "medium" ? "bg-amber-500/15 text-amber-400" :
                  "bg-rose-500/15 text-rose-400"
                )}>{topMatch.difficulty}</span>
                <span className="text-[10px]" style={{ color: tc.textMuted }}>{topMatch.matchedSkills.length}/{topMatch.requiredSkills.length} skills matched</span>
              </div>
            </div>
          </div>

          {topMatch.missingSkills.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: tc.textMuted }}>Missing Skills</p>
              <div className="flex flex-wrap gap-1">
                {topMatch.missingSkills.map(s => (
                  <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {matches.slice(1, 4).map(m => (
              <div key={m.company} className="flex items-center gap-2">
                <span className="text-[10px] font-medium w-20 truncate" style={{ color: tc.textSec }}>{m.company}</span>
                <div className="flex-1">
                  <PremiumProgressBar value={m.matchPercent}
                    color={m.matchPercent >= 70 ? "green" : m.matchPercent >= 40 ? "amber" : "rose"} height={3} />
                </div>
                <span className={cn("text-[10px] font-bold w-8 text-right",
                  m.matchPercent >= 70 ? "text-emerald-400" :
                  m.matchPercent >= 40 ? "text-amber-400" :
                  "text-rose-400"
                )}>{m.matchPercent}%</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => onViewChange?.("placement-intelligence")}
            className="w-full mt-3 text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors text-center uppercase tracking-wider"
            aria-label="View all company matches"
          >
            View All Companies →
          </button>
        </div>
      </PremiumCard>
    </motion.div>
  );
}
