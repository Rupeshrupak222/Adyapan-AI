"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { api } from "@/services/api";
import { cn } from "@/lib/cn";
import { PremiumCard, PremiumProgressBar } from "@/components/ui/PremiumComponents";
import { fadeUp } from "@/utils/animations";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Building2, Star, Target, TrendingUp } from "lucide-react";

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
  const [matches, setMatches] = useState<CompanyMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await api.get("/placement/intelligence/companies?top=6");
      if (res.data.success) setMatches(res.data.companyMatches);
    } catch (err) {
      console.error("Failed to load company matches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  if (loading || matches.length === 0) return null;

  const topMatch = matches[0];

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible">
      <PremiumCard glow className="p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/5 blur-[60px] rounded-full pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <Building2 size={16} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-purple-400 uppercase tracking-wider">Top Company Match</h3>
                <p className="text-[10px] text-white/40">Based on your skills</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <ScoreRing score={topMatch.matchPercent} size={70} strokeWidth={5} color="#8b56d4" label="Match" />
            <div className="flex-1">
              <div className="text-lg font-extrabold text-white">{topMatch.company}</div>
              <div className="text-xs text-white/50">{topMatch.avgPackage}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase",
                  topMatch.difficulty === "easy" ? "bg-emerald-500/15 text-emerald-400" :
                  topMatch.difficulty === "medium" ? "bg-amber-500/15 text-amber-400" :
                  "bg-rose-500/15 text-rose-400"
                )}>{topMatch.difficulty}</span>
                <span className="text-[10px] text-white/40">{topMatch.matchedSkills.length}/{topMatch.requiredSkills.length} skills matched</span>
              </div>
            </div>
          </div>

          {topMatch.missingSkills.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-white/40 font-bold uppercase mb-1">Missing Skills</p>
              <div className="flex flex-wrap gap-1">
                {topMatch.missingSkills.map(s => (
                  <span key={s} className="text-[9px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {matches.slice(1, 4).map(m => (
              <div key={m.company} className="flex items-center gap-2">
                <span className="text-[10px] text-white/60 font-medium w-20 truncate">{m.company}</span>
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
          >
            View All Companies →
          </button>
        </div>
      </PremiumCard>
    </motion.div>
  );
}
