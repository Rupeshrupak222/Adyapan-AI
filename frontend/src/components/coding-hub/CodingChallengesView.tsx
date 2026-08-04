"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Search,
  Trophy,
  Zap,
  Clock,
  CheckCircle2,
  Filter,
  ArrowRight,
  Code2,
  Loader2,
  LayoutGrid,
} from "lucide-react";
import { api } from "@/services/api";
import { codingFadeUp, DifficultyBadge, XPBadge, GlowCard } from "./CodingHubShared";
import { ChatBackground } from "@/components/ady-chat/ChatBackground";

// ─── Lucide icon name resolver ──────────────────────────────────────────────

import {
  Binary, Brain, Globe, Shield, Cloud, Code2 as Code2Icon,
  Database, Layers, Smartphone, BarChart3,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  Binary, Brain, Globe, Shield, Cloud, Code2: Code2Icon, Database, Layers, Smartphone, BarChart3,
};

function getCategoryIcon(iconName: string) {
  return ICON_MAP[iconName] || Code2;
}

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface ChallengeCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  gradient: string;
  color: string;
  challengeCount: number;
  difficultyRange: string;
  breakdown: { easy: number; medium: number; hard: number };
  solved: number;
  progress: number;
  popularity: number;
}

interface ChallengeListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  points: number;
  topics: string[];
  userStatus: "solved" | "attempted" | "unsolved";
  timeSpent: number;
  createdAt: string;
}

interface CategoryChallengesResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    gradient: string;
    color: string;
  };
  challenges: ChallengeListItem[];
  stats: { total: number; solved: number; attempted: number; unsolved: number };
}

// ─── Category Card ──────────────────────────────────────────────────────────

function CategoryCard({
  category,
  onClick,
  index,
  isDark,
}: {
  category: ChallengeCategory;
  onClick: () => void;
  index: number;
  isDark: boolean;
}) {
  const Icon = getCategoryIcon(category.icon);
  const isGlowing = category.progress > 0;

  return (
    <motion.div
      custom={index}
      variants={codingFadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative cursor-pointer rounded-2xl border overflow-hidden group"
      style={{
        background: isDark
          ? `linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))`
          : `linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))`,
        borderColor: isGlowing
          ? `${category.color}40`
          : isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(0,0,0,0.08)",
        boxShadow: isGlowing
          ? `0 0 30px ${category.color}10, inset 0 1px 0 ${category.color}15`
          : undefined,
      }}
    >
      {/* Gradient accent top bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${category.color}, ${category.color}80)` }}
      />

      <div className="p-5">
        {/* Header: icon + name + count */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
            style={{
              background: `linear-gradient(135deg, ${category.color}20, ${category.color}08)`,
              border: `1px solid ${category.color}25`,
            }}
          >
            <Icon size={20} style={{ color: category.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate" style={{ color: isDark ? "#fff" : "#0f172a" }}>
              {category.name}
            </h3>
            <p
              className="text-[11px] mt-0.5 line-clamp-2 leading-relaxed"
              style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b" }}
            >
              {category.description}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${category.color}15`, color: category.color }}
            >
              {category.challengeCount} challenges
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                color: isDark ? "rgba(255,255,255,0.5)" : "#64748b",
              }}
            >
              {category.difficultyRange}
            </span>
          </div>
          {category.solved > 0 && (
            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
              <CheckCircle2 size={10} /> {category.solved}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${category.progress}%` }}
            transition={{ duration: 1, delay: 0.3 + index * 0.05 }}
            style={{ background: `linear-gradient(90deg, ${category.color}, ${category.color}80)` }}
          />
        </div>
        {category.progress > 0 && (
          <span className="text-[9px] font-bold mt-1 block" style={{ color: category.color }}>
            {category.progress}% completed
          </span>
        )}
      </div>

      {/* Hover arrow */}
      <div
        className="absolute bottom-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `${category.color}15`, color: category.color }}
      >
        <ArrowRight size={14} />
      </div>
    </motion.div>
  );
}

// ─── Challenge List Row ─────────────────────────────────────────────────────

function ChallengeRow({
  challenge,
  onClick,
  index,
  isDark,
}: {
  challenge: ChallengeListItem;
  onClick: () => void;
  index: number;
  isDark: boolean;
}) {
  const statusIcon =
    challenge.userStatus === "solved" ? (
      <CheckCircle2 size={14} className="text-emerald-400" />
    ) : challenge.userStatus === "attempted" ? (
      <Clock size={14} className="text-amber-400" />
    ) : (
      <Code2 size={14} className={isDark ? "text-white/25" : "text-black/20"} />
    );

  return (
    <motion.div
      custom={index}
      variants={codingFadeUp}
      initial="hidden"
      animate="visible"
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer border transition-all group"
      style={{
        background:
          challenge.userStatus === "solved"
            ? isDark
              ? "rgba(16,185,129,0.04)"
              : "rgba(16,185,129,0.03)"
            : "transparent",
        borderColor:
          challenge.userStatus === "solved"
            ? isDark
              ? "rgba(16,185,129,0.12)"
              : "rgba(16,185,129,0.10)"
            : isDark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.04)",
      }}
    >
      {statusIcon}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-bold truncate block group-hover:text-amber-400 transition"
          style={{ color: isDark ? "#fff" : "#0f172a" }}
        >
          {challenge.title}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {challenge.topics.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{
                background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                color: isDark ? "rgba(255,255,255,0.45)" : "#94a3b8",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <DifficultyBadge difficulty={challenge.difficulty} />
      <XPBadge xp={challenge.points} />
      <ArrowRight
        size={14}
        className="text-white/15 group-hover:text-amber-500 transition flex-shrink-0"
      />
    </motion.div>
  );
}

// ─── Main View ──────────────────────────────────────────────────────────────

export function CodingChallengesView() {
  const router = useRouter();
  const [theme, setTheme] = useState("dark");
  const isDark = theme === "dark";

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(t);
    const obs = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // ── Navigation State ──────────────────────────────────────────────────────
  // "categories" → "challenges"
  const [view, setView] = useState<"categories" | "challenges">("categories");

  // ── Data State ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<ChallengeCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<CategoryChallengesResponse | null>(null);
  const [challengesLoading, setChallengesLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // ── Theme ─────────────────────────────────────────────────────────────────
  const bg = "transparent";
  const cardBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.9)";
  const primaryText = isDark ? "#fff" : "#0f172a";
  const mutedText = isDark ? "rgba(255,255,255,0.5)" : "#64748b";
  const borderCol = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
  const surfaceBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.6)";

  // ── Fetch Categories ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setCatLoading(true);
      try {
        const res = await api.get("/challenges/categories");
        if (!cancelled) setCategories(res.data?.categories || []);
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setCatLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch Challenges in Category ──────────────────────────────────────────
  const fetchCategoryChallenges = async (slug: string) => {
    setChallengesLoading(true);
    setSelectedCategory(null);
    try {
      const params: Record<string, string> = {};
      if (difficultyFilter !== "All") params.difficulty = difficultyFilter;
      if (statusFilter !== "All") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;

      const res = await api.get(`/challenges/categories/${slug}`, { params });
      setSelectedCategory(res.data);
    } catch {
      // keep null
    } finally {
      setChallengesLoading(false);
    }
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCategory = (cat: ChallengeCategory) => {
    setView("challenges");
    setSelectedCategory(null);
    fetchCategoryChallenges(cat.slug);
  };

  const goBack = () => {
    setView("categories");
    setSelectedCategory(null);
    setSearchQuery("");
    setDifficultyFilter("All");
    setStatusFilter("All");
  };

  const openProblem = (challenge: ChallengeListItem) => {
    router.push(`/dashboard/coding/ide/${challenge.id}`);
  };

  // Re-fetch when filters change (only in challenges view)
  useEffect(() => {
    if (view === "challenges" && selectedCategory?.category?.slug) {
      fetchCategoryChallenges(selectedCategory.category.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyFilter, statusFilter]);

  const searchHandler = () => {
    if (view === "challenges" && selectedCategory?.category?.slug) {
      fetchCategoryChallenges(selectedCategory.category.slug);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative flex flex-col overflow-hidden w-full h-full"
      style={{ background: bg, color: primaryText }}
    >
      {/* ── Coming Soon Overlay ── */}
      <div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5"
        style={{
          backdropFilter: "blur(12px)",
          background: isDark
            ? "rgba(10,10,15,0.82)"
            : "rgba(255,255,255,0.82)",
        }}
      >
        {/* Glow orb */}
        <div
          className="absolute w-72 h-72 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, transparent 70%)",
            top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          }}
        />

        {/* Icon */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 40px rgba(245,158,11,0.35)" }}
        >
          <Trophy size={36} style={{ color: "#000" }} />
        </motion.div>

        {/* Text */}
        <div className="text-center space-y-2 relative z-10">
          <h2
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: primaryText }}
          >
            Coding Challenges
          </h2>
          <p className="text-sm font-semibold" style={{ color: "#f59e0b" }}>
            Coming Soon
          </p>
          <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: mutedText }}>
            We&apos;re crafting challenging problems and competitions. Stay tuned — it&apos;ll be worth the wait.
          </p>
        </div>

        {/* Pill badge */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
          style={{
            border: "1px solid rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.08)",
            color: "#f59e0b",
          }}
        >
          <Zap size={12} />
          Under Development
        </div>
      </div>
      <ChatBackground isDark={isDark} />

      {/* Header */}
      <div
        className="relative z-20 px-6 py-4 flex items-center gap-4 border-b flex-shrink-0"
        style={{ borderColor: borderCol, backdropFilter: "blur(16px)", background: "transparent" }}
      >
        {view === "challenges" && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={goBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold"
            style={{ borderColor: borderCol, color: mutedText }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <ChevronLeft size={14} /> All Categories
          </motion.button>
        )}

        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
          >
            <Trophy size={16} />
          </div>
          <div>
            <h1 className="text-sm font-black" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {view === "categories" ? "Coding Challenges" : selectedCategory?.category?.name || "Loading..."}
            </h1>
            <p className="text-[10px] font-semibold" style={{ color: mutedText }}>
              {view === "categories"
                ? `${categories.length} categories available`
                : `${selectedCategory?.stats?.total || 0} challenges`}
            </p>
          </div>
        </div>

        {/* Search in challenges view */}
        {view === "challenges" && (
          <div className="flex-1 max-w-md ml-auto">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl border"
              style={{ background: surfaceBg, borderColor: borderCol }}
            >
              <Search size={14} style={{ color: mutedText }} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchHandler()}
                placeholder="Search challenges..."
                className="flex-1 bg-transparent border-none outline-none text-xs"
                style={{ color: primaryText }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
        <AnimatePresence mode="wait">
          {/* ─── Categories Grid ───────────────────────────────────────────── */}
          {view === "categories" && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {catLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 size={24} className="animate-spin" style={{ color: "#f59e0b" }} />
                </div>
              ) : categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
                  >
                    <LayoutGrid size={24} className="text-amber-500" />
                  </div>
                  <p className="text-sm font-bold" style={{ color: primaryText }}>No categories yet</p>
                  <p className="text-xs mt-1" style={{ color: mutedText }}>Categories will appear once they are seeded.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {categories.map((cat, i) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onClick={() => openCategory(cat)}
                      index={i}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── Challenges List ───────────────────────────────────────────── */}
          {view === "challenges" && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Category description + stats banner */}
              {selectedCategory?.category && (
                <GlowCard className="p-4" glowColor="amber">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-xs leading-relaxed max-w-xl" style={{ color: mutedText }}>
                      {selectedCategory.category.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <div className="text-lg font-black text-emerald-400">{selectedCategory.stats.solved}</div>
                        <div className="text-[9px] font-bold" style={{ color: mutedText }}>Solved</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black text-amber-400">{selectedCategory.stats.attempted}</div>
                        <div className="text-[9px] font-bold" style={{ color: mutedText }}>Attempted</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "#94a3b8" }}>
                          {selectedCategory.stats.unsolved}
                        </div>
                        <div className="text-[9px] font-bold" style={{ color: mutedText }}>Remaining</div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              )}

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter size={12} style={{ color: mutedText }} />
                {(["All", "Easy", "Medium", "Hard"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficultyFilter(d)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                    style={{
                      background: difficultyFilter === d ? "rgba(245,158,11,0.12)" : "transparent",
                      color: difficultyFilter === d ? "#f59e0b" : mutedText,
                      borderColor: difficultyFilter === d ? "rgba(245,158,11,0.25)" : borderCol,
                    }}
                  >
                    {d}
                  </button>
                ))}
                <span className="w-px h-4 mx-1" style={{ background: borderCol }} />
                {(["All", "Solved", "Attempted", "Unsolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all"
                    style={{
                      background: statusFilter === s ? "rgba(139,92,246,0.12)" : "transparent",
                      color: statusFilter === s ? "#8b5cf6" : mutedText,
                      borderColor: statusFilter === s ? "rgba(139,92,246,0.25)" : borderCol,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Challenge rows */}
              {challengesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="animate-spin" style={{ color: "#f59e0b" }} />
                </div>
              ) : (selectedCategory?.challenges || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Code2 size={28} className="text-amber-500/40 mb-3" />
                  <p className="text-xs font-bold" style={{ color: mutedText }}>No challenges match your filters</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {(selectedCategory?.challenges || []).map((ch, i) => (
                    <ChallengeRow
                      key={ch.id}
                      challenge={ch}
                      onClick={() => openProblem(ch)}
                      index={i}
                      isDark={isDark}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
