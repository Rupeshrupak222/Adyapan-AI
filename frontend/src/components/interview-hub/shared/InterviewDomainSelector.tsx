"use client";

import React, { useState, useMemo } from "react";
import {
  ALL_INTERVIEW_DOMAINS,
  INTERVIEW_DOMAIN_CATEGORIES,
  InterviewDomain,
  InterviewDomainCategory,
} from "./interviewDomains";
import {
  Search, Sparkles, Database, Brain, Terminal, Layers, Globe,
  Shield, Cloud, Code2, Smartphone, BarChart3, TrendingUp, Server,
  Cpu, Palette, PenTool, Briefcase, DollarSign, Megaphone, Users,
  Truck, Rocket, Compass, Zap, Car, HardHat, TestTube, Dna,
  FileSpreadsheet, HeartPulse, Atom, Navigation, Bot,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Database, Brain, Terminal, Layers, Globe, Shield, Cloud, Code2,
  Sparkles, Smartphone, BarChart3, TrendingUp, Server, Cpu, Palette,
  PenTool, Briefcase, DollarSign, Megaphone, Users, Truck, Rocket,
  Compass, Zap, Car, HardHat, TestTube, Dna, FileSpreadsheet,
  HeartPulse, Atom, Navigation, Bot,
};

interface InterviewDomainSelectorProps {
  selectedDomainId?: string;
  selectedRole?: string;
  onSelect: (domain: InterviewDomain) => void;
  theme?: string;
  showTechDetails?: boolean;
  maxHeight?: string;
}

export function InterviewDomainSelector({
  selectedDomainId,
  selectedRole,
  onSelect,
  theme = "dark",
  showTechDetails = false,
  maxHeight = "max-h-56",
}: InterviewDomainSelectorProps) {
  const isDark = theme === "dark";
  const [selectedCategory, setSelectedCategory] = useState<InterviewDomainCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDomains = useMemo(() => {
    return ALL_INTERVIEW_DOMAINS.filter((d) => {
      const matchesCat =
        selectedCategory === "All" || d.category === selectedCategory;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.role.toLowerCase().includes(q) ||
        d.tech.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-3">
      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          {INTERVIEW_DOMAIN_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all border ${
                  isCatActive
                    ? "bg-amber-500 text-black border-amber-400 shadow-sm"
                    : isDark
                    ? "bg-white/5 text-slate-300 border-white/10 hover:border-amber-500/30 hover:bg-white/10"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50"
                }`}
              >
                {cat === "All" ? `All Domains (${ALL_INTERVIEW_DOMAINS.length})` : cat}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative shrink-0 sm:w-56">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search domain, role, stack..."
            className={`w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg border outline-none transition-colors ${
              isDark
                ? "bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50"
                : "bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-amber-500"
            }`}
          />
        </div>
      </div>

      {/* Domain Chips */}
      <div
        className={`flex flex-wrap gap-1.5 overflow-y-auto pr-1 ${maxHeight}`}
        style={{ scrollbarWidth: "thin" }}
      >
        {filteredDomains.length === 0 ? (
          <p className="text-[11px] text-slate-400 py-3 italic">
            No domains match &quot;{searchQuery}&quot;. Try a different keyword or category.
          </p>
        ) : (
          filteredDomains.map((d) => {
            const IconComp = ICON_MAP[d.iconName] || Sparkles;
            const isSelected =
              (selectedDomainId && selectedDomainId === d.id) ||
              (selectedRole &&
                (selectedRole.toLowerCase() === d.role.toLowerCase() ||
                  selectedRole.toLowerCase() === d.name.toLowerCase()));

            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d)}
                title={`${d.role} • ${d.tech}`}
                className={`group px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-amber-500 text-black border-amber-400 shadow-md font-bold scale-[1.01]"
                    : isDark
                    ? "bg-white/5 text-slate-200 border-white/10 hover:border-amber-500/40 hover:bg-white/10"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50"
                }`}
              >
                <IconComp
                  size={13}
                  className={isSelected ? "text-black" : "text-amber-500 shrink-0"}
                />
                <span className="text-[11px] font-semibold truncate max-w-[200px]">
                  {d.name}
                </span>
                {d.isCseCore && (
                  <span
                    className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${
                      isSelected
                        ? "bg-black/20 text-black"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    CSE
                  </span>
                )}
                {showTechDetails && (
                  <span className={`text-[10px] hidden sm:inline opacity-70`}>
                    • {d.role}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
