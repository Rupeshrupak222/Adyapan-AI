"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import {
  LineChart, Sparkles, BookOpen, Clock, Cpu, Award, Zap,
  TrendingUp, Download, Share2, HelpCircle, ChevronRight, CheckCircle2,
  Calendar, RotateCw, AlertTriangle, ArrowRight, BookMarked, Layers, BarChart2
} from "lucide-react";
import confetti from "canvas-confetti";

interface InsightsJson {
  status?: string;
  grade?: string;
  examReadinessBreakdown?: {
    level?: string;
    factors?: { coverage: number; revisions: number; practice_questions: number; ai_interactions: number };
  };
  knowledgeDistribution?: { beginner: string[]; intermediate: string[]; advanced: string[] };
  insights?: string[];
  atsMetrics?: {
    atsScore: number;
    formattingScore: number;
    keywordScore: number;
    completenessScore: number;
    lastCheckedAt?: string | null;
  };
  interviewMetrics?: {
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
  };
}

interface LearningAnalyticsData {
  studyTimeMinutes: number;
  documentsCount: number;
  toolUsageJson: Record<string, number>;
  conceptsLearned: number;
  learningScore: number;
  currentStreak: number;
  longestStreak: number;
  examReadiness: number;
  recommendationsJson?: { recommendation: string; reason: string; action: string }[];
  topicAnalyticsJson?: { topic: string; studyFrequency: number; completionRate: number }[];
  insightsJson?: InsightsJson;
}

interface TrendDataPoint {
  studyTimeMinutes: number;
  displayDate: string;
  createdAt?: string;
}

interface TrendData {
  last7Days?: TrendDataPoint[];
  last30Days?: TrendDataPoint[];
  last90Days?: TrendDataPoint[];
}

interface CoachInsight {
  efficiency: number;
  impactEstimate: number;
  text: string;
}

interface LearningAnalyticsDashboardProps {
  setView?: (v: string) => void;
  theme?: string;
}

// ─── Loading Checklist Component ──────────────────────────────────────────────
function LoadingChecklist({ onComplete }: { onComplete: () => void }) {
  const tasks = [
    "Analyzing Learning Activity",
    "Calculating Learning Score",
    "Tracking Study Patterns",
    "Generating Insights",
    "Building Dashboard",
    "Preparing Recommendations"
  ];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (activeIdx >= tasks.length) {
      const timer = setTimeout(onComplete, 800);
      return () => clearTimeout(timer);
    }
    const interval = setTimeout(() => {
      setActiveIdx(prev => prev + 1);
    }, 600);
    return () => clearTimeout(interval);
  }, [activeIdx, tasks.length, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] p-6 text-center">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full animate-ping" />
        <div className="absolute inset-0 border-4 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
        <div className="absolute inset-4 flex items-center justify-center bg-amber-500/10 rounded-full border border-amber-500/25">
          <Sparkles className="text-amber-500 animate-pulse" size={28} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-white mb-6 tracking-wide">AI Learning Analytics Engine</h3>
      <div className="w-80 max-w-full text-left space-y-3 bg-white/[0.02] border border-white/5 rounded-2xl p-5 backdrop-blur-md">
        {tasks.map((task, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm">
            {idx < activeIdx ? (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-emerald-500">
                <CheckCircle2 size={16} />
              </motion.span>
            ) : idx === activeIdx ? (
              <div className="w-4 h-4 rounded-full border-2 border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            ) : (
              <div className="w-4 h-4 rounded-full border border-white/10" />
            )}
            <span className={idx === activeIdx ? "text-amber-500 font-semibold animate-pulse" : idx < activeIdx ? "text-white/60 line-through decoration-white/20" : "text-white/40"}>
              {task}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Typing Recommendation Component ──────────────────────────────────────────
function TypingRecommendation({ text, delay = 15 }: { text: string; delay?: number }) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, delay);
    return () => clearInterval(timer);
  }, [text, delay]);

  return <p className="text-xs text-white/70 leading-relaxed font-medium">{displayedText}</p>;
}

// ─── Floating Books Animation Component ────────────────────────────────────────
function EmptyState({ onPopulateDemo }: { onPopulateDemo: () => void }) {
  const [loading, setLoading] = useState(false);
  const [particles] = useState(() =>
    Array.from({ length: 12 }, () => ({
      w: Math.random() * 20 + 8,
      h: Math.random() * 20 + 8,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      dur: Math.random() * 6 + 4,
      delay: Math.random() * 2,
    }))
  );

  const handleDemo = async () => {
    setLoading(true);
    await onPopulateDemo();
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 text-center relative overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute bg-amber-500/10 rounded-full"
            style={{
              width: p.w,
              height: p.h,
              left: p.left,
              top: p.top
            }}
            animate={{
              y: [-20, -120],
              opacity: [0, 0.7, 0]
            }}
            transition={{
              duration: p.dur,
              repeat: Infinity,
              ease: "linear",
              delay: p.delay
            }}
          />
        ))}
      </div>

      <div className="relative mb-8 flex items-center justify-center w-36 h-36">
        <motion.div
          animate={{ y: [0, -12, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="text-amber-500 relative z-10"
        >
          <BookMarked size={72} className="drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]" />
        </motion.div>
        {/* Shadow underneath */}
        <motion.div
          animate={{ scale: [1, 0.8, 1], opacity: [0.3, 0.15, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-4 w-24 h-3 bg-black/40 blur-sm rounded-full"
        />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">No Learning Data Yet</h3>
      <p className="text-white/60 max-w-sm text-sm mb-8 leading-relaxed">
        Start learning to unlock analytics. Upload your first document, generate revision notes, and take quizzes to begin your journey.
      </p>

      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(245,158,11,0.5)" }}
        whileTap={{ scale: 0.95 }}
        disabled={loading}
        onClick={handleDemo}
        className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:brightness-110 transition-all flex items-center gap-2"
      >
        {loading ? (
          <>
            <RotateCw className="animate-spin" size={16} /> Populating Data...
          </>
        ) : (
          <>
            <Sparkles size={16} className="animate-pulse" /> Populate Demo Study History
          </>
        )}
      </motion.button>
    </div>
  );
}

// ─── Heatmap Component ────────────────────────────────────────────────────────
function GitHubHeatmap({ events }: { events: { createdAt?: string }[] }) {
  // Generates past 365 days cells
  const cols = 53;
  const rows = 7;
  const cellCount = cols * rows;
  const cells: Date[] = [];
  const today = new Date();
  
  // Start from Sunday 52 weeks ago
  const startDate = new Date();
  startDate.setDate(today.getDate() - cellCount + 1);

  for (let i = 0; i < cellCount; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push(d);
  }

  // Map dates to activity count
  const eventDateCounts: Record<string, number> = {};
  events?.forEach(e => {
    if (!e.createdAt) return;
    const formatted = new Date(e.createdAt).toISOString().split("T")[0];
    eventDateCounts[formatted] = (eventDateCounts[formatted] || 0) + 1;
  });

  const getColorClass = (count: number) => {
    if (!count) return "bg-white/[0.04] border-white/[0.02]";
    if (count < 2) return "bg-amber-500/20 border-amber-500/10 hover:shadow-[0_0_8px_rgba(245,158,11,0.3)]";
    if (count < 4) return "bg-amber-500/40 border-amber-500/20 hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]";
    if (count < 6) return "bg-amber-500/70 border-amber-500/35 hover:shadow-[0_0_16px_rgba(245,158,11,0.7)]";
    return "bg-amber-500 border-amber-500/50 hover:shadow-[0_0_20px_rgba(245,158,11,0.9)]";
  };

  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  return (
    <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md relative">
      <h4 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2 text-white/80">
        <Calendar size={14} className="text-amber-500" /> Learning Activity Heatmap
      </h4>

      <div className="overflow-x-auto select-none">
        <div className="grid grid-flow-col gap-1 h-28 min-w-[640px]" style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}>
          {cells.map((cell, idx) => {
            const dateStr = cell.toISOString().split("T")[0];
            const count = eventDateCounts[dateStr] || 0;
            return (
              <div
                key={idx}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredCell({
                    date: cell.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                    count,
                    x: rect.left + window.scrollX - 60,
                    y: rect.top + window.scrollY - 45
                  });
                }}
                onMouseLeave={() => setHoveredCell(null)}
                className={`w-3.5 h-3.5 rounded-[3px] border transition-all duration-200 cursor-crosshair ${getColorClass(count)}`}
              />
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center mt-3 text-[10px] text-white/40 font-semibold">
        <span>52 Weeks Ago</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded bg-white/[0.04] border border-white/5" />
          <div className="w-2.5 h-2.5 rounded bg-amber-500/20" />
          <div className="w-2.5 h-2.5 rounded bg-amber-500/40" />
          <div className="w-2.5 h-2.5 rounded bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded bg-amber-500" />
          <span>More</span>
        </div>
        <span>Today</span>
      </div>

      {hoveredCell && (
        <div
          className="absolute z-30 p-2 text-[10px] font-bold rounded-lg border border-amber-500/35 bg-[#080710]/95 text-amber-500 shadow-[0_4px_12px_rgba(0,0,0,0.5)] backdrop-blur-md pointer-events-none"
          style={{ left: hoveredCell.x - 200, top: hoveredCell.y - 120 }} // Offset adjustments
        >
          {hoveredCell.count} events on {hoveredCell.date}
        </div>
      )}
    </div>
  );
}

// ─── Custom SVG Line/Area Trend Chart ──────────────────────────────────────────
function TrendsChart({ trendData }: { trendData: TrendDataPoint[] }) {
  const [activePoint, setActivePoint] = useState<{ x: number; y: number; val: number; date: string } | null>(null);

  if (!trendData || trendData.length === 0) return null;

  const w = 500;
  const h = 180;
  const padding = 20;
  const graphWidth = w - padding * 2;
  const graphHeight = h - padding * 2;

  const maxVal = Math.max(...trendData.map(d => d.studyTimeMinutes), 45); // default min height

  // Map values to coordinates
  const points = trendData.map((d, idx) => {
    const x = padding + (idx / (trendData.length - 1)) * graphWidth;
    const y = h - padding - (d.studyTimeMinutes / maxVal) * graphHeight;
    return { x, y, raw: d };
  });

  // SVG Line path string
  let linePath = `M ${points[0].x} ${points[0].y} `;
  for (let i = 1; i < points.length; i++) {
    linePath += `L ${points[i].x} ${points[i].y} `;
  }

  // SVG Closed path string for area gradient
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${h - padding} L ${points[0].x} ${h - padding} Z`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const y = padding + ratio * graphHeight;
          return (
            <line
              key={idx}
              x1={padding}
              y1={y}
              x2={w - padding}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* X axis labels (Start, Middle, End) */}
        <text x={padding} y={h - 4} fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">
          {points[0].raw.displayDate}
        </text>
        <text x={w / 2} y={h - 4} fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold" textAnchor="middle">
          {points[Math.floor(points.length / 2)].raw.displayDate}
        </text>
        <text x={w - padding} y={h - 4} fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold" textAnchor="end">
          {points[points.length - 1].raw.displayDate}
        </text>

        {/* Y Axis labels (Max / Min) */}
        <text x={padding - 5} y={padding + 4} fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold" textAnchor="end">
          {Math.round(maxVal)}m
        </text>
        <text x={padding - 5} y={h - padding} fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold" textAnchor="end">
          0m
        </text>

        {/* Glowing Path area */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          d={areaPath}
          fill="url(#areaGradient)"
        />

        {/* Line Path */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Hover/Data points */}
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#080710"
            stroke="#f59e0b"
            strokeWidth="1.5"
            className="cursor-pointer hover:r-5 transition-all"
            onMouseEnter={() => {
              setActivePoint({
                x: p.x,
                y: p.y,
                val: p.raw.studyTimeMinutes,
                date: p.raw.displayDate
              });
            }}
            onMouseLeave={() => setActivePoint(null)}
          />
        ))}

        {/* Hover label overlay */}
        {activePoint && (
          <g>
            <rect
              x={activePoint.x - 30}
              y={activePoint.y - 25}
              width="60"
              height="18"
              rx="4"
              fill="rgba(8,7,16,0.95)"
              stroke="rgba(245,158,11,0.5)"
              strokeWidth="0.5"
            />
            <text
              x={activePoint.x}
              y={activePoint.y - 13}
              fill="#f59e0b"
              fontSize="7"
              fontWeight="black"
              textAnchor="middle"
            >
              {activePoint.val} min ({activePoint.date})
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Custom SVG Donut Component ──────────────────────────────────────────────
function ToolUsageDonut({ toolUsage }: { toolUsage: Record<string, number> }) {
  const tools = [
    { key: "notesGenerator", label: "Notes Generator", color: "#f59e0b", icon: "📝" },
    { key: "questionsGenerator", label: "Questions Generator", color: "#10b981", icon: "❓" },
    { key: "summaryGenerator", label: "Summary Generator", color: "#06b6d4", icon: "📑" },
    { key: "flashcards", label: "Flashcards", color: "#8b5cf6", icon: "🎴" },
    { key: "mindMaps", label: "Mind Maps", color: "#ec4899", icon: "🧠" }
  ];

  // Calculate cumulative percentages
  let accumulatedPercent = 0;
  const segments = tools.map(t => {
    const val = toolUsage[t.key] || 0;
    const start = accumulatedPercent;
    accumulatedPercent += val;
    return { ...t, val, start };
  }).filter(s => s.val > 0);

  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 140 140" className="w-full h-full transform -rotate-90 select-none">
          {segments.map((seg, idx) => {
            const dashArray = `${(seg.val / 100) * circumference} ${circumference}`;
            const dashOffset = -((seg.start / 100) * circumference);
            const isHovered = hoveredSegment === seg.key;

            return (
              <motion.circle
                key={seg.key}
                cx="70"
                cy="70"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 2 : strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-300 origin-center"
                style={{ opacity: hoveredSegment && !isHovered ? 0.4 : 1 }}
                onMouseEnter={() => setHoveredSegment(seg.key)}
                onMouseLeave={() => setHoveredSegment(null)}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 1.2, delay: idx * 0.15, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hoveredSegment ? (
            <>
              <span className="text-lg">
                {segments.find(s => s.key === hoveredSegment)?.icon}
              </span>
              <span className="text-base font-black text-white mt-0.5">
                {toolUsage[hoveredSegment]}%
              </span>
              <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold">
                {segments.find(s => s.key === hoveredSegment)?.label.split(" ")[0]}
              </span>
            </>
          ) : (
            <>
              <Layers size={18} className="text-amber-500 animate-pulse" />
              <span className="text-xs font-bold text-white mt-1">Tools</span>
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Usage</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2.5 w-full">
        {segments.map(seg => (
          <div
            key={seg.key}
            className="flex items-center justify-between text-xs p-1.5 border border-transparent rounded-lg transition-all"
            style={{
              background: hoveredSegment === seg.key ? "rgba(255,255,255,0.03)" : "transparent",
              borderColor: hoveredSegment === seg.key ? "rgba(255,255,255,0.05)" : "transparent"
            }}
            onMouseEnter={() => setHoveredSegment(seg.key)}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            <div className="flex items-center gap-2 font-medium">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-white/80">{seg.label}</span>
            </div>
            <span className="font-extrabold text-white">{seg.val}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Custom SVG Bubble Component ─────────────────────────────────────────────
function TopicBubbleChart({ topics }: { topics: { topic: string; studyFrequency: number; completionRate: number }[] }) {
  type BubblePoint = { topic: string; studyFrequency: number; completionRate: number; x: number; y: number; radius: number };
  const [activeBubble, setActiveBubble] = useState<BubblePoint | null>(null);
  const [jitter] = useState(() => topics.map(() => ({
    dx: Math.random() * 10 - 5,
    dy: Math.random() * 8 - 4,
  })));

  if (!topics || topics.length === 0) return null;

  const width = 450;
  const height = 180;

  const bubblePoints = topics.map((t, idx) => {
    const columns = Math.ceil(Math.sqrt(topics.length));
    const colIdx = idx % columns;
    const rowIdx = Math.floor(idx / columns);
    const spacingX = width / (columns + 1);
    const spacingY = height / (Math.ceil(topics.length / columns) + 1);

    const x = spacingX * (colIdx + 1) + (jitter[idx]?.dx ?? 0);
    const y = spacingY * (rowIdx + 1) + (jitter[idx]?.dy ?? 0);
    const baseRadius = 22;
    const maxFreq = Math.max(...topics.map(o => o.studyFrequency), 1);
    const radius = baseRadius + (t.studyFrequency / maxFreq) * 18;

    return { ...t, x, y, radius };
  });

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Connection webs */}
        {bubblePoints.map((b, i) => (
          <g key={i}>
            {bubblePoints.slice(i + 1).map((other, j) => {
              const dx = b.x - other.x;
              const dy = b.y - other.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              // Draw lines between reasonably close bubbles
              if (dist < 180) {
                return (
                  <line
                    key={j}
                    x1={b.x}
                    y1={b.y}
                    x2={other.x}
                    y2={other.y}
                    stroke="rgba(245,158,11,0.06)"
                    strokeWidth="1"
                  />
                );
              }
              return null;
            })}
          </g>
        ))}

        {/* Bubbles */}
        {bubblePoints.map((b, idx) => {
          const isHovered = activeBubble?.topic === b.topic;
          return (
            <g
              key={idx}
              className="cursor-pointer"
              onMouseEnter={() => setActiveBubble(b)}
              onMouseLeave={() => setActiveBubble(null)}
            >
              <circle
                cx={b.x}
                cy={b.y}
                r={b.radius}
                fill="rgba(245,158,11,0.08)"
                stroke={isHovered ? "#f59e0b" : "rgba(245,158,11,0.25)"}
                strokeWidth={isHovered ? "2.5" : "1"}
                className="transition-all duration-300"
                style={{
                  fillOpacity: b.completionRate / 100 * 0.4 + 0.05,
                  filter: isHovered ? "drop-shadow(0 0 10px rgba(245,158,11,0.4))" : "none"
                }}
              />
              <text
                x={b.x}
                y={b.y + 3}
                fill="white"
                fontSize="7.5"
                fontWeight="black"
                textAnchor="middle"
                className="pointer-events-none"
              >
                {b.topic.length > 9 ? `${b.topic.slice(0, 8)}..` : b.topic}
              </text>
            </g>
          );
        })}

        {/* Overlay Bubble Description */}
        {activeBubble && (
          <g>
            <rect
              x={activeBubble.x - 70}
              y={activeBubble.y - activeBubble.radius - 35}
              width="140"
              height="30"
              rx="6"
              fill="rgba(8,7,16,0.98)"
              stroke="rgba(245,158,11,0.5)"
              strokeWidth="0.8"
            />
            <text x={activeBubble.x} y={activeBubble.y - activeBubble.radius - 23} fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">
              {activeBubble.topic}
            </text>
            <text x={activeBubble.x} y={activeBubble.y - activeBubble.radius - 12} fill="rgba(255,255,255,0.6)" fontSize="6" textAnchor="middle">
              {activeBubble.studyFrequency} sessions • {activeBubble.completionRate}% complete
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── Interactive Skill Tree (Knowledge Distribution) ──────────────────────────
function KnowledgeSkillTree({ distribution }: { distribution: { beginner: string[]; intermediate: string[]; advanced: string[] } }) {
  const [activeBranch, setActiveBranch] = useState<"beginner" | "intermediate" | "advanced" | null>(null);

  const branches = [
    { id: "beginner", label: "Beginner Concepts", color: "from-emerald-500/20 to-emerald-500/5", border: "border-emerald-500/30", text: "text-emerald-400", list: distribution?.beginner || [] },
    { id: "intermediate", label: "Intermediate Concepts", color: "from-amber-500/20 to-amber-500/5", border: "border-amber-500/30", text: "text-amber-400", list: distribution?.intermediate || [] },
    { id: "advanced", label: "Advanced Mastery", color: "from-indigo-500/20 to-indigo-500/5", border: "border-indigo-500/30", text: "text-indigo-400", list: distribution?.advanced || [] }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {branches.map(b => (
          <motion.div
            key={b.id}
            whileHover={{ scale: 1.02 }}
            onClick={() => setActiveBranch(activeBranch === b.id ? null : (b.id as "beginner" | "intermediate" | "advanced"))}
            className={`p-4 border rounded-2xl cursor-pointer bg-gradient-to-br ${b.color} ${b.border} flex flex-col justify-between h-28 relative overflow-hidden`}
          >
            <div className="absolute right-2 top-2 bg-white/5 w-6 h-6 flex items-center justify-center rounded-full">
              <ChevronRight size={12} className={`transform transition-transform text-white/50 ${activeBranch === b.id ? "rotate-90" : "rotate-0"}`} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${b.text}`}>{b.id}</span>
            <div className="mt-auto">
              <span className="text-2xl font-black text-white">{b.list.length}</span>
              <span className="text-[10px] block font-bold text-white/60">Topics Linked</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeBranch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden p-5 border border-white/5 rounded-2xl bg-white/[0.01]"
          >
            <h5 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-3">
              {branches.find(b => b.id === activeBranch)?.label} Node Details:
            </h5>
            {branches.find(b => b.id === activeBranch)!.list.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {branches.find(b => b.id === activeBranch)!.list.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/80 hover:bg-white/10 transition-colors cursor-crosshair flex items-center gap-1.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {item}
                  </motion.div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-white/40 italic">No topics categorized under this master node yet. Keep learning to link skills!</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Analytics Dashboard Component ──────────────────────────────────────────
export function LearningAnalyticsDashboard({ setView, theme = "dark" }: LearningAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<LearningAnalyticsData | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [activeTrendTab, setActiveTrendTab] = useState<"7" | "30" | "90">("7");
  const [coachInsight, setCoachInsight] = useState<CoachInsight | null>(null);

  const [generateLoading, setGenerateLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get("/analytics/dashboard");
      if (res.data.success) {
        setAnalytics(res.data.analytics);
      }
      
      const recRes = await api.get("/recommendations/dashboard");
      if (recRes.data.success) {
        setCoachInsight(recRes.data.coachInsight || null);
      }
    } catch (err) {
      console.error("Fetch dashboard data error:", err);
    }
  };

  const fetchTrendData = async () => {
    try {
      const res = await api.get("/analytics/trends");
      if (res.data.success) {
        setTrendData(res.data.trends);
      }
    } catch (err) {
      console.error("Fetch trend data error:", err);
    }
  };

  const handleInitialLoad = async () => {
    setLoading(true);
    await Promise.all([fetchDashboardData(), fetchTrendData()]);
    setLoading(false);
  };

  useEffect(() => {
    handleInitialLoad();
  }, []);

  const handlePopulateDemo = async () => {
    try {
      await api.post("/analytics/seed-demo");
      await Promise.all([fetchDashboardData(), fetchTrendData()]);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Seed mock data error:", err);
    }
  };

  const handleRegenerate = async () => {
    setGenerateLoading(true);
    try {
      const res = await api.post("/analytics/generate");
      if (res.data.success) {
        setAnalytics(res.data.analytics);
        await fetchTrendData();
        confetti({ particleCount: 100, spread: 60, colors: ["#f59e0b", "#d97706"] });
      }
    } catch (err) {
      console.error("Regenerate analytics error:", err);
    } finally {
      setGenerateLoading(false);
    }
  };

  // PDF Export Trigger
  const handleExportPdf = () => {
    window.print();
  };

  // Safe checks for empty datasets
  const hasNotes = (analytics?.toolUsageJson?.notesGenerator ?? 0) > 0 || (analytics?.toolUsageJson?.questionsGenerator ?? 0) > 0 || (analytics?.documentsCount ?? 0) > 0;
  const isDashboardEmpty = !analytics || !hasNotes;

  const currentTrendList =
    activeTrendTab === "7"
      ? trendData?.last7Days
      : activeTrendTab === "30"
      ? trendData?.last30Days
      : trendData?.last90Days;

  // Breakdown metrics for score accordion
  const insightsJson = analytics?.insightsJson as InsightsJson;
  const breakdown = insightsJson?.examReadinessBreakdown?.factors || {
    coverage: 0,
    revisions: 0,
    practice_questions: 0,
    ai_interactions: 0
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col justify-center min-h-[calc(100vh-140px)]">
        <LoadingChecklist onComplete={() => setLoading(false)} />
      </div>
    );
  }

  if (isDashboardEmpty) {
    return (
      <div className="w-full flex-1 flex flex-col justify-center min-h-[calc(100vh-140px)]">
        <EmptyState onPopulateDemo={handlePopulateDemo} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-6 print:p-0 print:bg-white print:text-black"
    >
      {/* ─── TITLE / EXPORTS TOP BAR ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-4 print:hidden">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Learning Intelligence Workspace</span>
          <h2 className="text-xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            AI Learning Analytics Dashboard
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleRegenerate}
            disabled={generateLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/5 bg-white/[0.02] text-xs font-bold text-white/80 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RotateCw className={`text-amber-500 ${generateLoading ? "animate-spin" : ""}`} size={13} />
            Recalculate AI Score
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 text-[#080710] text-xs font-extrabold shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
          >
            <Download size={13} />
            Export Learning Report
          </motion.button>
        </div>
      </div>

      {/* ─── HERO STAT CARDS GRID ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
        {[
          { label: "Total Learning Time", val: `${(analytics.studyTimeMinutes / 60).toFixed(1)} hrs`, desc: "+12% this week", icon: <Clock size={16} />, color: "text-amber-500" },
          { label: "Documents Studied", val: `${analytics.documentsCount} Docs`, desc: "Extracted PDFs", icon: <BookOpen size={16} />, color: "text-cyan-400" },
          { label: "AI Generations", val: `${analytics.toolUsageJson ? Object.values(analytics.toolUsageJson as Record<string, number>).reduce((a, b) => a + b, 0) * 2 : 24} Outputs`, desc: "Notes, Maps & Quizzes", icon: <Layers size={16} />, color: "text-purple-400" },
          { label: "Concepts Learned", val: `${analytics.conceptsLearned} Concepts`, desc: "Extracted Topic Nodes", icon: <Cpu size={16} />, color: "text-emerald-400" }
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4, scale: 1.01, borderColor: "rgba(255,255,255,0.12)" }}
            className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer select-none"
          >
            <div className="flex justify-between items-start">
              <span className="text-[9px] uppercase tracking-widest font-black text-white/40">{stat.label}</span>
              <span className={`${stat.color} filter drop-shadow-[0_0_8px_currentColor]`}>{stat.icon}</span>
            </div>
            <div className="mt-2.5">
              <span className="text-xl font-extrabold text-white">{stat.val}</span>
              <span className="text-[9px] block text-white/40 mt-0.5 font-medium">{stat.desc}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── LEARNING HEALTH SCORE / STREAK / READINESS ────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3">
        
        {/* Learning Health Score Circular Progress */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md flex flex-col justify-between relative overflow-hidden">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-3.5 flex items-center gap-1.5">
            <Award size={14} className="text-amber-500" /> Learning Health Score
          </h4>
          <div className="flex items-center justify-around gap-4 flex-1">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f59e0b"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 40}
                  initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - analytics.learningScore / 100) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeLinecap="round"
                  className="filter drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{analytics.learningScore}</span>
                <span className="text-[8px] uppercase tracking-wider text-white/50 font-bold">{insightsJson?.status || "Progressing"}</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-white/60 font-semibold flex-1">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Grade</span>
                <span className="text-amber-500 font-extrabold">{insightsJson?.grade || "Good"}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span>Learning Velocity</span>
                <span className="text-white font-extrabold">{(analytics.conceptsLearned / Math.max(1, analytics.studyTimeMinutes / 60)).toFixed(1)} Concepts/Hr</span>
              </div>
              <div className="flex justify-between pb-1">
                <span>Decay Risk</span>
                <span className="text-rose-400 font-extrabold">Moderate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Duolingo-inspired Consistency Streak Card */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md flex flex-col justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-3 flex items-center gap-1.5">
            <Zap size={14} className="text-amber-500" /> Study Consistency
          </h4>
          <div className="flex items-center justify-around gap-6 flex-1">
            <div className="relative flex items-center justify-center">
              {/* Flame Glowing Icon */}
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-amber-500 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]"
              >
                <Zap size={56} className="fill-amber-500" />
              </motion.div>
              <span className="absolute text-xl font-extrabold text-white bottom-3">{analytics.currentStreak}</span>
            </div>

            <div className="flex-1 space-y-2 text-xs">
              <div className="flex justify-between items-center text-white/70">
                <span className="font-semibold">Current Streak:</span>
                <span className="font-extrabold text-amber-500 text-sm">{analytics.currentStreak} Days</span>
              </div>
              <div className="flex justify-between items-center text-white/70">
                <span className="font-semibold">Longest Streak:</span>
                <span className="font-extrabold text-white">{analytics.longestStreak} Days</span>
              </div>
              <div className="flex justify-between items-center text-white/70">
                <span className="font-semibold">Active Days (30d):</span>
                <span className="font-extrabold text-white">12 Days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Readiness Analytics Card */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md flex flex-col justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-3 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-amber-500" /> Exam Readiness
          </h4>
          <div className="flex-1 flex flex-col justify-around gap-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-2xl font-black text-white">{analytics.examReadiness}%</span>
                <span className="text-[9px] font-bold block uppercase tracking-widest text-amber-500">
                  {insightsJson?.examReadinessBreakdown?.level || "Ready"}
                </span>
              </div>
              <BarChart2 className="text-amber-500 animate-pulse" size={28} />
            </div>

            {/* Score Factors */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-white/50 font-bold">
              <div className="flex justify-between">
                <span>Coverage:</span>
                <span className="text-white">{breakdown.coverage}%</span>
              </div>
              <div className="flex justify-between">
                <span>Practice:</span>
                <span className="text-white">{breakdown.practice_questions}%</span>
              </div>
              <div className="flex justify-between">
                <span>Revision:</span>
                <span className="text-white">{breakdown.revisions}%</span>
              </div>
              <div className="flex justify-between">
                <span>AI Usage:</span>
                <span className="text-white">{breakdown.ai_interactions}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ATS & CAREER METRICS ROW ─────────────────────────────────────── */}
      {insightsJson?.atsMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-black text-white/40 block">ATS Resume Score</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-1 block">
                {insightsJson.atsMetrics.atsScore > 0 ? `${insightsJson.atsMetrics.atsScore}%` : "Not Scanned"}
              </span>
            </div>
            <Award size={24} className="text-emerald-400" />
          </div>
          <div className="p-4 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-black text-white/40 block">Profile Completeness</span>
              <span className="text-xl font-extrabold text-cyan-400 mt-1 block">
                {insightsJson.atsMetrics.completenessScore > 0 ? `${insightsJson.atsMetrics.completenessScore}%` : "Complete"}
              </span>
            </div>
            <CheckCircle2 size={24} className="text-cyan-400" />
          </div>
          <div className="p-4 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md flex items-center justify-between">
            <div>
              <span className="text-[9px] uppercase tracking-widest font-black text-white/40 block">AI Interviews Practiced</span>
              <span className="text-xl font-extrabold text-purple-400 mt-1 block">
                {insightsJson.interviewMetrics?.totalSessions || 0} Sessions
              </span>
            </div>
            <BookMarked size={24} className="text-purple-400" />
          </div>
        </div>
      )}

      {/* ─── CHARTS ROW ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2">
        {/* SVG trends lines chart */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md relative">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-amber-500" /> Weekly Learning Trends
            </h4>
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/5 p-0.5 rounded-lg text-[9px] font-black text-white/60">
              {["7", "30", "90"].map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTrendTab(t as "7" | "30" | "90")}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${activeTrendTab === t ? "bg-amber-500 text-[#080710] font-black" : "hover:text-white"}`}
                >
                  {t}d
                </button>
              ))}
            </div>
          </div>
          {currentTrendList && <TrendsChart trendData={currentTrendList} />}
        </div>

        {/* SVG Tool usage donut chart */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-4 flex items-center gap-1.5">
            <Layers size={14} className="text-amber-500" /> AI Tool Usage Distribution
          </h4>
          {analytics.toolUsageJson && <ToolUsageDonut toolUsage={analytics.toolUsageJson as Record<string, number>} />}
        </div>
      </div>

      {/* ─── HEATMAP ACTIVITY LOG ──────────────────────────────────────────── */}
      <GitHubHeatmap events={trendData?.last90Days || []} />

      {/* ─── TOPIC ANALYTICS & SKILL TREE ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 print:grid-cols-2">
        {/* Bubbles Chart */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-4 flex items-center gap-1.5">
            <Layers size={14} className="text-amber-500" /> Topic Study Frequency
          </h4>
          {analytics.topicAnalyticsJson && <TopicBubbleChart topics={analytics.topicAnalyticsJson as { topic: string; studyFrequency: number; completionRate: number }[]} />}
        </div>

        {/* Skill Tree distribution */}
        <div className="p-5 border border-white/5 rounded-2xl bg-white/[0.01] backdrop-blur-md">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-4 flex items-center gap-1.5">
            <Layers size={14} className="text-amber-500" /> Interactive Skill Tree Nodes
          </h4>
          <KnowledgeSkillTree distribution={insightsJson?.knowledgeDistribution ?? { beginner: [], intermediate: [], advanced: [] }} />
        </div>
      </div>

      {coachInsight && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 border border-amber-500/20 rounded-2xl mb-6 bg-gradient-to-r from-amber-500/[0.04] to-violet-500/[0.04]"
        >
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Zap className="text-amber-500 animate-pulse" size={18} />
              <h4 className="text-sm font-black uppercase text-white tracking-wider">AI Coach: Improvement Opportunities</h4>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-white/50 bg-white/5 px-2.5 py-0.5 rounded-full">
                Study Efficiency: {coachInsight.efficiency}%
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Impact: +{coachInsight.impactEstimate}% Readiness
              </span>
            </div>
          </div>
          <p className="text-xs text-white/80 leading-relaxed font-semibold">
            {coachInsight.text}
          </p>
        </motion.div>
      )}

      {/* ─── AI SUGGESTIONS & RECOMMENDATIONS ──────────────────────────────── */}
      <div className="p-5 border border-amber-500/10 rounded-2xl bg-amber-500/[0.02] backdrop-blur-md relative overflow-hidden">
        {/* Aurora glow effect background */}
        <div className="absolute right-0 top-0 w-36 h-36 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-amber-500 animate-pulse" size={16} />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">AI Learning Recommendation Engine</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* AI Insights Observations */}
          <div className="md:col-span-2 space-y-3">
            <h5 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Observations & Insights</h5>
            <div className="space-y-2 border-l border-amber-500/10 pl-3">
              {insightsJson?.insights?.map((insight: string, idx: number) => (
                <div key={idx} className="text-xs text-white/80 leading-relaxed font-semibold flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actionable recommendations list */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Personalised Action Checklist</h5>
            <div className="space-y-2.5">
              {analytics.recommendationsJson?.map((rec: { recommendation: string; reason: string; action: string }, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.2 }}
                  className="p-3 border border-white/5 rounded-xl bg-white/[0.02]"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={13} />
                    <div className="space-y-1">
                      <span className="text-xs font-extrabold text-white">{rec.recommendation}</span>
                      <span className="text-[10px] font-semibold text-white/50 block leading-tight">{rec.reason}</span>
                      <div className="pt-1.5 flex items-center gap-1.5 text-[10px] font-black text-amber-500">
                        <span>Action: {rec.action}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
export default LearningAnalyticsDashboard;

