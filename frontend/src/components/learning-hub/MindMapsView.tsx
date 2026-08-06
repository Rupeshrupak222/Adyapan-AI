"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  getBezierPath,
  Handle,
  Position,
  BackgroundVariant,
  type NodeProps,
  type EdgeProps,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitMerge, Copy, FileDown, RefreshCw, ChevronRight, Search, Plus, History,
  CheckCircle2, Sparkles, Brain, Zap, Star, X, FileText, Layers, Network,
  Download, Share2, BookOpen, HelpCircle, Settings, Eye, EyeOff, ArrowRight,
  Loader2, AlertTriangle, Lightbulb, GitFork, Circle, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { api } from "@/services/api";
import { useTheme } from "@/hooks/useTheme";
import { getAuthUser } from "@/hooks/useAuth";

const mkColors = (theme: string) => {
  const isDark = theme === "dark";
  return {
    isDark, text: isDark ? "#e5e7eb" : "#0f172a", textSec: isDark ? "#9ca3af" : "#475569", textMuted: isDark ? "#828fa3" : "#5f6368", textOnAmber: "#000000",
    bg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", bgHover: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderHover: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)",
    inputBg: isDark ? "rgba(0,0,0,0.35)" : "#f1f5f9", cardBg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", cardBgAlt: isDark ? "rgba(0,0,0,0.25)" : "#f8fafc",
    stickyBg: isDark ? "rgba(10,10,20,0.88)" : "rgba(248,250,252,0.92)",
    amber: "#f59e0b", amberBg: isDark ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.08)", amberBorder: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.25)", amberActive: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
    purpleBg: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.05)", purpleBorder: isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.15)",
    green: "#10b981", greenBg: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
    divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    pill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", pillBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };
};

type MindMapNodeData = Record<string, any> & {
  label: string;
  type: "root" | "concept" | "sub_concept" | "example" | "application";
  definition: string;
  whyItMatters: string;
  realExample: string;
  commonMistakes: string;
  interviewTip: string;
};

interface RawMindMapNode {
  id: string;
  label: string;
  type?: string;
  definition?: string;
  whyItMatters?: string;
  realExample?: string;
  commonMistakes?: string;
  interviewTip?: string;
}

type LearningMode = "beginner" | "intermediate" | "interview" | "revision";

type LayoutType = "radial" | "tree" | "graph";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }) };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }) };
const slideRight = { hidden: { opacity: 0, x: -24 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { delay: i * 0.07, duration: 0.4 } }) };

/* ─── LAYOUT ENGINE ─── */

function layoutNodes(nodes: Node[], edges: Edge[], layoutType: LayoutType): Node[] {
  if (nodes.length === 0) return [];
  const layouted = nodes.map(n => ({ ...n, position: { x: 0, y: 0 } }));
  const rootNode = layouted.find(n => (n.data as MindMapNodeData)?.type === "root") || layouted[0];
  const rootId = rootNode.id;

  const adj: Record<string, string[]> = {};
  const parentMap: Record<string, string> = {};
  layouted.forEach(node => { adj[node.id] = []; });
  edges.forEach(e => {
    if (adj[e.source] && adj[e.target]) {
      adj[e.source].push(e.target);
      parentMap[e.target] = e.source;
    }
  });

  const depth: Record<string, number> = {};
  const queue: string[] = [rootId];
  depth[rootId] = 0;
  while (queue.length > 0) {
    const cur = queue.shift()!;
    (adj[cur] || []).forEach(child => {
      if (depth[child] === undefined) { depth[child] = depth[cur] + 1; queue.push(child); }
    });
  }
  layouted.forEach(n => { if (depth[n.id] === undefined) depth[n.id] = 1; });

  if (layoutType === "tree") {
    const nodesByDepth: Record<number, string[]> = {};
    layouted.forEach(n => {
      const d = depth[n.id];
      if (!nodesByDepth[d]) nodesByDepth[d] = [];
      nodesByDepth[d].push(n.id);
    });
    const levelHeight = 160;
    const nodeWidth = 240;
    Object.keys(nodesByDepth).forEach(dk => {
      const d = parseInt(dk);
      const ids = nodesByDepth[d];
      ids.sort((a, b) => (parentMap[a] || "").localeCompare(parentMap[b] || ""));
      const totalW = (ids.length - 1) * nodeWidth;
      ids.forEach((id, idx) => {
        const n = layouted.find(nd => nd.id === id)!;
        n.position = { x: totalW === 0 ? 0 : (idx * nodeWidth) - (totalW / 2), y: d * levelHeight };
      });
    });
  } else if (layoutType === "radial") {
    const rootIdx = layouted.findIndex(n => n.id === rootId);
    if (rootIdx !== -1) layouted[rootIdx].position = { x: 0, y: 0 };
    const level1 = adj[rootId] || [];
    const R1 = 280;
    const R2 = 240;
    level1.forEach((l1Id, i) => {
      const angle = (i / level1.length) * 2 * Math.PI;
      const l1Node = layouted.find(n => n.id === l1Id)!;
      const x1 = R1 * Math.cos(angle);
      const y1 = R1 * Math.sin(angle);
      l1Node.position = { x: x1, y: y1 };
      const level2 = adj[l1Id] || [];
      if (level2.length > 0) {
        const arcSpan = Math.PI / 2;
        const startArc = angle - arcSpan / 2;
        level2.forEach((l2Id, j) => {
          const l2Angle = level2.length === 1 ? angle : startArc + (j / (level2.length - 1)) * arcSpan;
          const l2Node = layouted.find(n => n.id === l2Id)!;
          l2Node.position = { x: x1 + R2 * Math.cos(l2Angle), y: y1 + R2 * Math.sin(l2Angle) };
          const level3 = adj[l2Id] || [];
          if (level3.length > 0) {
            const l3Arc = Math.PI / 3;
            const startL3 = l2Angle - l3Arc / 2;
            const R3 = 180;
            level3.forEach((l3Id, k) => {
              const l3Angle = level3.length === 1 ? l2Angle : startL3 + (k / (level3.length - 1)) * l3Arc;
              const l3Node = layouted.find(n => n.id === l3Id)!;
              l3Node.position = { x: l2Node.position.x + R3 * Math.cos(l3Angle), y: l2Node.position.y + R3 * Math.sin(l3Angle) };
            });
          }
        });
      }
    });
    layouted.forEach(n => {
      if (n.position.x === 0 && n.position.y === 0 && n.id !== rootId) {
        const a = Math.random() * 2 * Math.PI;
        n.position = { x: 600 * Math.cos(a), y: 600 * Math.sin(a) };
      }
    });
  } else {
    layouted.forEach(n => {
      const d = depth[n.id];
      const a = Math.random() * 2 * Math.PI;
      n.position = { x: d * 180 * Math.cos(a) + (Math.random() - 0.5) * 50, y: d * 180 * Math.sin(a) + (Math.random() - 0.5) * 50 };
    });
    const rootIdx = layouted.findIndex(n => n.id === rootId);
    if (rootIdx !== -1) layouted[rootIdx].position = { x: 0, y: 0 };
    const iterations = 60;
    const kRep = 80000;
    const kAtt = 0.08;
    const rest = 180;
    for (let iter = 0; iter < iterations; iter++) {
      const forces: Record<string, { x: number; y: number }> = {};
      layouted.forEach(n => { forces[n.id] = { x: 0, y: 0 }; });
      for (let i = 0; i < layouted.length; i++) {
        for (let j = i + 1; j < layouted.length; j++) {
          const u = layouted[i]; const v = layouted[j];
          const dx = u.position.x - v.position.x;
          const dy = u.position.y - v.position.y;
          const distSq = dx * dx + dy * dy + 0.1;
          const dist = Math.sqrt(distSq);
          if (dist < 400) {
            const f = kRep / distSq;
            const fx = (dx / dist) * f; const fy = (dy / dist) * f;
            forces[u.id].x += fx; forces[u.id].y += fy;
            forces[v.id].x -= fx; forces[v.id].y -= fy;
          }
        }
      }
      edges.forEach(e => {
        const u = layouted.find(n => n.id === e.source);
        const v = layouted.find(n => n.id === e.target);
        if (u && v) {
          const dx = v.position.x - u.position.x;
          const dy = v.position.y - u.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const f = kAtt * (dist - rest);
          const fx = (dx / dist) * f; const fy = (dy / dist) * f;
          forces[u.id].x += fx; forces[u.id].y += fy;
          forces[v.id].x -= fx; forces[v.id].y -= fy;
        }
      });
      layouted.forEach(n => {
        if (n.id === rootId) return;
        const maxMove = 25;
        const fx = forces[n.id].x; const fy = forces[n.id].y;
        const fDist = Math.sqrt(fx * fx + fy * fy);
        if (fDist > 0) {
          n.position.x += fDist > maxMove ? (fx / fDist) * maxMove : fx;
          n.position.y += fDist > maxMove ? (fy / fDist) * maxMove : fy;
        }
      });
    }
  }
  return layouted;
}

/* ─── CUSTOM NODE ─── */

const CustomNode = memo(({ id, data, selected }: NodeProps) => {
  const d = data as unknown as MindMapNodeData;
  const type = d.type;

  const getIcon = () => {
    switch (type) {
      case "root": return <Sparkles className="h-4.5 w-4.5 text-white animate-pulse" />;
      case "concept": return <Layers className="h-4 w-4 text-violet-400" />;
      case "sub_concept": return <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />;
      case "example": return <Zap className="h-3.5 w-3.5 text-emerald-400" />;
      case "application": return <Brain className="h-3.5 w-3.5 text-rose-400" />;
      default: return null;
    }
  };

  const styleClasses: Record<string, string> = {
    root: "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-black font-extrabold text-lg px-5 py-3 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] border border-amber-400/30",
    concept: "bg-zinc-950/90 border border-amber-500/30 hover:border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.05)] text-zinc-100 font-semibold px-4 py-2.5 border-l-4 border-l-amber-500",
    sub_concept: "bg-zinc-950/90 border border-indigo-500/20 hover:border-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.05)] text-zinc-200 font-medium px-3.5 py-2 border-l-4 border-l-indigo-400",
    example: "bg-zinc-950/95 border border-emerald-500/20 hover:border-emerald-400/50 text-zinc-300 italic px-3.5 py-2 border-l-4 border-l-emerald-400 text-xs sm:text-sm",
    application: "bg-zinc-950/95 border border-rose-500/20 hover:border-rose-400/50 text-zinc-300 px-3.5 py-2 border-l-4 border-l-rose-400 text-xs sm:text-sm",
  };

  const selRing = selected
    ? type === "root"
      ? "ring-4 ring-white/60 ring-offset-4 ring-offset-black"
      : "ring-2 ring-amber-500 ring-offset-2 ring-offset-black shadow-[0_0_25px_rgba(245,158,11,0.25)]"
    : "";

  return (
    <div className="relative group cursor-pointer">
      <Handle type="target" position={Position.Top} className="opacity-0 w-1 h-1 pointer-events-none" />
      <Handle type="source" position={Position.Top} className="opacity-0 w-1 h-1 pointer-events-none" />
      <Handle type="target" position={Position.Bottom} className="opacity-0 w-1 h-1 pointer-events-none" />
      <Handle type="source" position={Position.Bottom} className="opacity-0 w-1 h-1 pointer-events-none" />
      <Handle type="target" position={Position.Left} className="opacity-0 w-1 h-1 pointer-events-none" />
      <Handle type="source" position={Position.Left} className="opacity-0 w-1 h-1 pointer-events-none" />
      <Handle type="target" position={Position.Right} className="opacity-0 w-1 h-1 pointer-events-none" />
      <Handle type="source" position={Position.Right} className="opacity-0 w-1 h-1 pointer-events-none" />

      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.04, y: -2 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={cn(
          "rounded-xl backdrop-blur-md transition-all duration-300 flex items-center gap-2.5 select-none relative overflow-hidden",
          styleClasses[type] || styleClasses.concept,
          selRing
        )}
      >
        {(type === "root" || selected) && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none" />
        )}
        {type === "root" && (
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/30 to-orange-600/30 rounded-xl blur-md -z-10 animate-pulse" />
        )}
        <div className="flex-shrink-0 flex items-center justify-center">{getIcon()}</div>
        <div className="text-left leading-tight whitespace-nowrap">{d.label}</div>
      </motion.div>
    </div>
  );
});
CustomNode.displayName = "CustomNode";

/* ─── ANIMATED EDGE ─── */

const AnimatedEdge = ({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, style = {}, markerEnd,
}: EdgeProps) => {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <style>{`
        @keyframes edge-dash-flow-${id} {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .edge-dash-${id} { animation: edge-dash-flow-${id} 1.5s linear infinite; }
      `}</style>
      <path id={`${id}-glow`} d={edgePath} fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth={6} style={{ filter: "blur(3px)" }} className="opacity-0 hover:opacity-100 transition-opacity duration-300" />
      <path id={`${id}-main`} d={edgePath} fill="none" strokeWidth={1.5} className="stroke-zinc-800 transition-colors duration-300" style={style} />
      <path id={`${id}-particles`} d={edgePath} fill="none" strokeWidth={1.5} strokeDasharray="6,12" markerEnd={markerEnd} className={`stroke-amber-500/80 pointer-events-none edge-dash-${id}`} />
    </>
  );
};

/* ─── NODE / EDGE TYPE REGISTRY ─── */

const nodeTypes = { mindmapNode: CustomNode };
const edgeTypes = { animatedEdge: AnimatedEdge };

/* ─── LOADING SCREEN ─── */

const LOADING_STEPS = [
  "Analyzing Topic",
  "Building Knowledge Structure",
  "Creating Relationships",
  "Generating Visual Map",
  "Rendering Knowledge Graph",
];

function LoadingScreen({ currentStep, topicName }: { currentStep: number; topicName: string }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: isDark ? "rgba(3,3,3,0.92)" : "rgba(248,250,252,0.92)", backdropFilter: "blur-md" }}>
      <div className="absolute top-[20%] left-[30%] w-96 h-96 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ background: "rgba(245,158,11,0.08)" }} />
      <div className="absolute bottom-[20%] right-[30%] w-96 h-96 rounded-full blur-[100px] animate-pulse pointer-events-none" style={{ background: "rgba(217,119,6,0.08)" }} />
      <div className="max-w-md w-full rounded-2xl p-8 flex flex-col items-center text-center space-y-8 relative overflow-hidden" style={{ background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, boxShadow: isDark ? "0 0 50px rgba(245,158,11,0.1)" : "0 0 30px rgba(245,158,11,0.05)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.01) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl animate-pulse" style={{ background: "rgba(245,158,11,0.15)" }} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
            className="w-20 h-20 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: "transparent", borderTopColor: "#f59e0b", borderRightColor: "#d97706", borderBottomColor: "#f59e0b", boxShadow: "0 0 20px rgba(245,158,11,0.15)" }}
          >
            <Loader2 className="h-8 w-8" style={{ color: "#f59e0b" }} />
          </motion.div>
        </div>
        <div className="space-y-2 relative z-10">
          <h2 className="text-xl font-bold tracking-tight" style={{ color: isDark ? "#fff" : "#0f172a" }}>AI Knowledge Engine</h2>
          <p className="text-sm" style={{ color: isDark ? "#9ca3af" : "#475569" }}>
            Mapping out <span className="font-semibold" style={{ color: "#f59e0b" }}>&quot;{topicName}&quot;</span> into a visual learning graph...
          </p>
        </div>
        <div className="w-full space-y-4 text-left relative z-10 pt-6" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}` }}>
          {LOADING_STEPS.map((step, idx) => {
            const isCompleted = currentStep > idx;
            const isActive = currentStep === idx;
            return (
              <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.15 }} className="flex items-center justify-between text-sm py-1">
                <div className="flex items-center gap-3">
                  {isCompleted ? <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#10b981" }} /> : isActive ? <Loader2 className="h-5 w-5 shrink-0" style={{ color: "#f59e0b" }} /> : <Circle className="h-5 w-5 shrink-0" style={{ color: isDark ? "#3f3f46" : "#d4d4d8" }} />}
                  <span className={cn(isCompleted && "line-through", isActive && "font-medium")} style={{ color: isCompleted ? (isDark ? "#a1a1aa" : "#71717a") : isActive ? (isDark ? "#fff" : "#0f172a") : (isDark ? "#52525b" : "#a1a1aa") }}>{step}</span>
                </div>
                {isActive && <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#f59e0b" }}>Processing</motion.span>}
                {isCompleted && <span className="text-xs font-medium" style={{ color: "rgba(16,185,129,0.7)" }}>Done</span>}
              </motion.div>
            );
          })}
        </div>
        <div className="w-full h-1 rounded-full overflow-hidden relative" style={{ background: isDark ? "#18181b" : "#e4e4e7" }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min((currentStep / 4) * 100, 100)}%` }}
            transition={{ duration: 0.5 }}
            style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── KNOWLEDGE PANEL ─── */

function KnowledgePanel({
  nodes, selectedNodeId, onClose, onExpand, isExpanding,
  isDark, c,
}: {
  nodes: Node[]; selectedNodeId: string | null; onClose: () => void; onExpand: () => void; isExpanding: boolean;
  isDark: boolean; c: ReturnType<typeof mkColors>;
}) {
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  if (!selectedNode) return null;

  const d = selectedNode.data as unknown as MindMapNodeData;
  const { label, type, definition, whyItMatters, realExample, commonMistakes, interviewTip } = d;

  const getBadge = () => {
    const map: Record<string, string> = {
      root: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      concept: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      sub_concept: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
      example: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      application: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    };
    return <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${map[type] || map.concept}`}>{type.replace("_", " ")}</span>;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:w-[380px] border-l shadow-2xl flex flex-col z-30 fixed right-0 top-16 bottom-0 h-[calc(100vh-4rem)]"
        style={{ background: isDark ? "rgba(9,9,11,0.97)" : "#fff", borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)" }}
      >
        <div className="px-5 py-4 flex justify-between items-center shrink-0" style={{ borderBottom: `1px solid ${c.divider}` }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2">{getBadge()}</div>
            <h3 className="text-base font-bold tracking-tight line-clamp-1" style={{ color: c.text }}>{label}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textMuted }}>
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c.textMuted }}>Definition</h4>
            <p className="text-sm leading-relaxed px-4 py-3 rounded-xl" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>{definition}</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c.textMuted }}>Why It Matters</h4>
            <div className="relative overflow-hidden rounded-xl p-4" style={{ border: `1px solid ${c.amberBorder}`, background: c.amberBg }}>
              <div className="absolute top-1 right-2 pointer-events-none" style={{ color: "rgba(245,158,11,0.15)" }}><Sparkles size={32} /></div>
              <p className="text-sm leading-relaxed relative z-10" style={{ color: c.text }}>{whyItMatters}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c.textMuted }}>Real-World Case</h4>
            <div className="flex gap-3 p-4 rounded-xl" style={{ background: c.surfaceHover, border: `1px solid ${c.border}` }}>
              <div className="mt-0.5 shrink-0" style={{ color: "#10b981" }}><Lightbulb size={16} /></div>
              <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{realExample}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c.textMuted }}>Common Pitfalls</h4>
            <div className="flex gap-3 p-4 rounded-xl" style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.15)" }}>
              <div className="mt-0.5 shrink-0" style={{ color: "#f43f5e" }}><AlertTriangle size={16} /></div>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(244,63,94,0.85)" : "#9f1239" }}>{commonMistakes}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c.textMuted }}>Placement Pro-Tip</h4>
            <div className="flex gap-3 p-4 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="mt-0.5 shrink-0 animate-pulse" style={{ color: "#f59e0b" }}><Sparkles size={16} /></div>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? "rgba(245,158,11,0.85)" : "#92400e" }}>{interviewTip}</p>
            </div>
          </div>
        </div>

        {type !== "example" && type !== "application" && (
          <div className="px-5 py-4 shrink-0" style={{ borderTop: `1px solid ${c.divider}`, background: c.stickyBg }}>
            <button
              onClick={onExpand}
              disabled={isExpanding}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000", opacity: isExpanding ? 0.7 : 1 }}
            >
              {isExpanding ? <><Loader2 className="h-4 w-4 animate-spin" /> Expanding...</> : <><GitFork className="h-4 w-4" /> Expand Concept with AI</>}
            </button>
            <p className="text-[10px] text-center mt-2" style={{ color: c.textMuted }}>Generates sub-concepts branching from this node.</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── MAIN EXPORT ─── */

export function MindMapsView() {
  const theme = useTheme();
  const c = mkColors(theme);

  const [topic, setTopic] = useState("");
  const [selectedMode, setSelectedMode] = useState<LearningMode>("intermediate");
  const [layoutType, setLayoutType] = useState<LayoutType>("radial");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isExpanding, setIsExpanding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState<Array<{ name: string; date: string; count: number; nodes: Node[]; edges: Edge[] }>>([]);

  const getUserScopedKey = (baseKey: string) => {
    try {
      const u = getAuthUser();
      const id = u?.id || u?.email;
      return id ? `${baseKey}-${id}` : baseKey;
    } catch { return baseKey; }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getUserScopedKey("adyapan-map-history"));
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  const hasGraph = nodes.length > 0;

  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes(prev => applyNodeChanges(changes, prev));
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges(prev => applyEdgeChanges(changes, prev));
  }, []);

  const updatePositions = useCallback((layout: LayoutType) => {
    if (nodes.length === 0) return;
    setNodes(prev => layoutNodes(prev, edges, layout));
  }, [edges]);

  const handleLayoutChange = (layout: LayoutType) => {
    setLayoutType(layout);
    updatePositions(layout);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetTopic = topic.trim() || "Cellular Respiration";

    setIsGenerating(true);
    setLoadingStep(0);
    setError(null);
    setSelectedNodeId(null);
    setNodes([]);
    setEdges([]);

    const stepTimer = (step: number, ms: number) =>
      new Promise<void>(resolve => { setTimeout(() => { setLoadingStep(step); resolve(); }, ms); });

    try {
      const apiPromise = api.post("/mindmap/generate", {
        topic: targetTopic,
        mode: selectedMode,
      });

      await stepTimer(1, 800);
      await stepTimer(2, 1000);
      await stepTimer(3, 900);
      await stepTimer(4, 700);

      const res = await apiPromise;
      const data = res.data;

      if (!data.mindmap || !Array.isArray(data.mindmap.nodes)) {
        throw new Error("Invalid response format received from AI.");
      }

      const rawNodes = data.mindmap.nodes;
      const rawEdges = data.mindmap.edges || [];

      const flowNodes: Node[] = rawNodes.map((n: RawMindMapNode) => ({
        id: n.id,
        type: "mindmapNode",
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          type: n.type || "concept",
          definition: n.definition || "No definition provided.",
          whyItMatters: n.whyItMatters || "No context provided.",
          realExample: n.realExample || "No example provided.",
          commonMistakes: n.commonMistakes || "No common mistakes provided.",
          interviewTip: n.interviewTip || "No interview tip provided.",
        },
      }));

      const flowEdges: Edge[] = rawEdges.map((e: { source: string; target: string }) => ({
        id: `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "animatedEdge",
        animated: true,
        style: { strokeWidth: 2 },
      }));

      const positioned = layoutNodes(flowNodes, flowEdges, layoutType);

      setNodes(positioned);
      setEdges(flowEdges);
      setIsGenerating(false);
      setLoadingStep(5);

      const item = { name: targetTopic, date: "Just now", count: positioned.length, nodes: positioned, edges: flowEdges };
      const updated = [item, ...history.filter(h => h.name !== targetTopic)].slice(0, 10);
      setHistory(updated);
      localStorage.setItem(getUserScopedKey("adyapan-map-history"), JSON.stringify(updated));

      toast.success(`Mind map for "${targetTopic}" generated!`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      console.error("[MindMapsView] generate failed:", err);
      setError(e?.response?.data?.error || e?.message || "An unexpected error occurred.");
      setIsGenerating(false);
    }
  };

  const handleExpand = async () => {
    if (!selectedNodeId) return;
    const targetNode = nodes.find(n => n.id === selectedNodeId);
    if (!targetNode) return;

    setIsExpanding(true);
    setError(null);

    try {
      const existingLabels = nodes.map(n => n.data.label as string);

      const res = await api.post("/mindmap/expand", {
        topic: topic.trim() || "Cellular Respiration",
        nodeLabel: (targetNode.data as MindMapNodeData).label,
        mode: selectedMode,
        existingLabels,
      });

      const data = res.data;
      if (!data.expansion || !Array.isArray(data.expansion.nodes)) {
        throw new Error("Invalid expansion response format received from AI.");
      }

      const newRaw = data.expansion.nodes;
      const newRawEdges = data.expansion.edges || [];

      const uniqueNewNodes = newRaw.filter(
        (nn: RawMindMapNode) => !nodes.some(en => en.id === nn.id || (en.data as MindMapNodeData).label === nn.label)
      );
      const uniqueNewEdges = newRawEdges.filter(
        (ne: { source: string; target: string }) => !edges.some(ee => (ee.source === ne.source && ee.target === ne.target) || (ee.source === ne.target && ee.target === ne.source))
      );

      if (uniqueNewNodes.length === 0) {
        throw new Error("The AI did not find any new sub-concepts for this node.");
      }

      const flowNewNodes: Node[] = uniqueNewNodes.map((n: RawMindMapNode) => ({
        id: n.id,
        type: "mindmapNode",
        position: {
          x: targetNode.position.x + (Math.random() - 0.5) * 100,
          y: targetNode.position.y + (Math.random() - 0.5) * 100,
        },
        data: {
          label: n.label,
          type: n.type || "sub_concept",
          definition: n.definition || "No definition provided.",
          whyItMatters: n.whyItMatters || "No context provided.",
          realExample: n.realExample || "No example provided.",
          commonMistakes: n.commonMistakes || "No common mistakes provided.",
          interviewTip: n.interviewTip || "No interview tip provided.",
        },
      }));

      const flowNewEdges: Edge[] = uniqueNewEdges.map((e: { source: string; target: string }) => ({
        id: `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: "animatedEdge",
        animated: true,
        style: { strokeWidth: 2 },
      }));

      const combinedNodes = [...nodes, ...flowNewNodes];
      const combinedEdges = [...edges, ...flowNewEdges];
      const positioned = layoutNodes(combinedNodes, combinedEdges, layoutType);

      setNodes(positioned);
      setEdges(combinedEdges);
      setIsExpanding(false);
      toast.success(`Expanded "${(targetNode.data as MindMapNodeData).label}" with ${flowNewNodes.length} new concepts.`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      console.error("[MindMapsView] expand failed:", err);
      setError(e?.response?.data?.error || e?.message || "Failed to expand node.");
      setIsExpanding(false);
    }
  };

  const handleReset = () => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setError(null);
  };

  const handleExportPNG = async () => {
    const container = document.querySelector(".react-flow")?.closest("div");
    if (!container) return toast.error("No mind map to export.");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(container, { backgroundColor: c.isDark ? "#09090b" : "#fafafa", useCORS: true, scale: 2 });
      const link = document.createElement("a");
      link.download = `${(topic.trim() || "mindmap").replace(/\s+/g, "_")}_mindmap.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Mind map exported as PNG!");
    } catch {
      toast.error("Failed to export mind map.");
    }
  };

  const handleShare = () => {
    const shareText = `Check out this mind map on "${topic.trim() || "mindmap"}" — ${nodes.length} concepts mapped`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
    }
    toast.success("Mind map description copied to clipboard!");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col antialiased relative" style={{ color: c.text }}>
      <style>{`.mg-scroll { scrollbar-width: none; -ms-overflow-style: none; } .mg-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>{/* toasts handled by sonner */}</AnimatePresence>

      {/* LOADING OVERLAY */}
      {isGenerating && <LoadingScreen currentStep={loadingStep} topicName={topic.trim() || "Cellular Respiration"} />}

      {/* HEADER */}
      <div className="flex items-center justify-between pb-3 mb-3" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <Network size={18} style={{ color: "#000" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>Mind Maps</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-xs leading-tight" style={{ color: c.textMuted }}>Interactive AI-powered knowledge graphs</motion.p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasGraph && (
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={handleReset} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
              <RefreshCw size={13} /> Reset
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setShowHistory(!showHistory)} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            style={{ background: showHistory ? c.amberActive : c.surface, border: `1px solid ${showHistory ? c.amberBorder : c.border}`, color: showHistory ? c.amber : c.text }}>
            <History size={14} /> History
            {history.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black" style={{ background: c.amberBg, color: c.amber }}>{history.length}</span>}
          </motion.button>
        </div>
      </div>

      {/* HISTORY PANEL */}
      <AnimatePresence>
        {showHistory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowHistory(false)}
              style={{
                position: "fixed", top: "70px", left: 0, right: 0, bottom: 0, zIndex: 98,
                background: "rgba(0,0,0,0.4)",
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              style={{
                position: "fixed", top: "70px", right: 0, bottom: 0, zIndex: 99,
                width: "min(420px, 90vw)",
                background: c.isDark ? "rgba(18, 17, 26, 0.95)" : "rgba(255, 255, 255, 0.98)",
                backdropFilter: "blur(20px)",
                borderLeft: `1px solid ${c.border}`,
                display: "flex", flexDirection: "column",
                boxShadow: "-8px 0 40px rgba(0,0,0,0.3)",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "1rem 1.25rem",
                borderBottom: `1px solid ${c.divider}`,
                background: c.surface,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <History size={16} style={{ color: c.amber }} />
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: c.text }}>Recent Mind Maps</span>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, color: c.amber,
                    background: c.amberBg, padding: "1px 7px", borderRadius: 999,
                  }}>
                    {history.length}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowHistory(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: c.textMuted, padding: 4 }}
                >
                  <X size={18} />
                </motion.button>
              </div>
              <div style={{ padding: "0.75rem 1.25rem" }}>
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: c.textMuted }} />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    style={{
                      width: "100%", padding: "0.55rem 0.75rem 0.55rem 2rem",
                      borderRadius: 10, fontSize: "0.8rem", outline: "none",
                      background: c.pill, border: `1px solid ${c.border}`,
                      color: c.text, boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 0.75rem 1rem" }}>
                {history.filter(doc => doc.name.toLowerCase().includes(historySearch.toLowerCase())).length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3rem 1rem", gap: 8 }}>
                    <FileText size={32} style={{ color: c.textMuted, opacity: 0.3 }} />
                    <p style={{ fontSize: "0.82rem", color: c.textMuted, textAlign: "center" }}>No mind maps generated yet. Submit a topic to begin.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {history.filter(doc => doc.name.toLowerCase().includes(historySearch.toLowerCase())).map((doc, i) => (
                      <motion.div
                        key={doc.name + i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => {
                          setTopic(doc.name);
                          setNodes(doc.nodes);
                          setEdges(doc.edges);
                          setSelectedNodeId(null);
                          setShowHistory(false);
                        }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "0.65rem 0.75rem", borderRadius: 12, cursor: "pointer",
                          background: c.cardBg, border: `1px solid ${c.border}`,
                        }}
                        whileHover={{ borderColor: c.amberBorder, background: c.amberBg }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                            <FileText size={13} style={{ color: c.amber, margin: "auto" }} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: c.text, margin: 0 }} className="truncate">{doc.name}</p>
                            <p style={{ fontSize: "0.68rem", color: c.textMuted, margin: "2px 0 0" }}>{doc.date} · {doc.count} nodes</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <motion.button
                            whileHover={{ scale: 1.15, color: "#ef4444" }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = history.filter(h => h.name !== doc.name);
                              setHistory(updated);
                              try {
                                localStorage.setItem(getUserScopedKey("adyapan-map-history"), JSON.stringify(updated));
                                toast.success(`Removed "${doc.name}" from history`);
                              } catch { /* ignore */ }
                            }}
                            title="Delete from history"
                            style={{
                              background: "transparent", border: "none", color: c.textMuted,
                              padding: "4px 6px", borderRadius: 6, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                          <ChevronRight size={14} style={{ color: c.textMuted }} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {/* CONFIG FORM */}
          {!isGenerating && !hasGraph && (
            <motion.div key="config" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <motion.div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: c.surface, border: `2px solid ${c.border}` }}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 right-8 w-24 h-24 rounded-full" style={{ opacity: c.isDark ? 0.05 : 0.08, background: "radial-gradient(circle, #f59e0b, transparent)" }} />
                  <div className="absolute bottom-4 left-8 w-16 h-16 rounded-full" style={{ opacity: c.isDark ? 0.04 : 0.06, background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
                </div>
                <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
                  <div className="text-center space-y-2">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.amber }}>
                      <Sparkles size={12} className="animate-pulse" /> Interactive Knowledge Graph
                    </motion.div>
                    <h3 className="text-xl font-extrabold text-center" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>AI Mind Map Generator</h3>
                    <p className="text-sm" style={{ color: c.textSec }}>Compile any topic into an interactive, animated knowledge network graph.</p>
                  </div>

                  <form onSubmit={handleGenerate} className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Enter Topic</label>
                      <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a topic to generate a mind map..."
                        className="w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textMuted }}>Learning Mode</label>
                      <div className="grid grid-cols-2 gap-3">
                        {([
                          { id: "beginner" as LearningMode, icon: <BookOpen size={16} />, title: "Beginner", desc: "Simple terms, basic concepts" },
                          { id: "intermediate" as LearningMode, icon: <Layers size={16} />, title: "Intermediate", desc: "Core algorithms & schemas" },
                          { id: "interview" as LearningMode, icon: <HelpCircle size={16} />, title: "Interview Prep", desc: "Q&A angles & tradeoffs" },
                          { id: "revision" as LearningMode, icon: <Sparkles size={16} />, title: "Quick Revision", desc: "High-yield summaries & tips" },
                        ]).map(m => (
                          <div key={m.id} onClick={() => setSelectedMode(m.id)}
                            className="p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 select-none"
                            style={{ background: selectedMode === m.id ? c.amberActive : c.cardBg, borderColor: selectedMode === m.id ? c.amberBorder : c.border }}>
                            <div className="shrink-0 p-1.5 rounded-lg" style={{ background: selectedMode === m.id ? c.amberBg : c.surface, color: selectedMode === m.id ? c.amber : c.textMuted }}>{m.icon}</div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-semibold" style={{ color: c.text }}>{m.title}</h4>
                              <p className="text-[10px]" style={{ color: c.textMuted }}>{m.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="submit" className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                      <GitMerge size={16} /> Generate Mind Map <ArrowRight size={16} />
                    </motion.button>
                  </form>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl text-sm text-center" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.15)", color: "#f43f5e" }}>
                      {error}
                    </motion.div>
                  )}
                </div>
              </motion.div>

              {/* Presets & How It Works */}
              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Zap size={15} style={{ color: c.amber }} /> Explore Presets</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Cellular Respiration", desc: "Visualizes glycolysis, Krebs cycle, and ETC nodes.", icon: <Star size={18} style={{ color: c.amber }} /> },
                    { title: "React Lifecycle", desc: "Outlines mounting, updating, and unmounting phases.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { title: "Data Structures", desc: "Hierarchy of linear vs non-linear structures.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> },
                  ].map((item, i) => (
                    <motion.div key={item.title} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }}
                      onClick={() => setTopic(item.title)} className="p-5 rounded-2xl cursor-pointer group transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                        <h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>{item.title}</h4>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Zap size={15} style={{ color: c.amber }} /> How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: "01", title: "Input Topic", desc: "State the topic to map as a knowledge graph.", icon: <Network size={18} style={{ color: c.amber }} /> },
                    { step: "02", title: "AI Builds Graph", desc: "AI identifies concepts and creates relationships.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
                    { step: "03", title: "Explore & Export", desc: "Interact with nodes, expand, and share.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> },
                  ].map((item, i) => (
                    <motion.div key={item.step} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }} className="p-5 rounded-2xl transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                        <div><span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.amber }}>Step {item.step}</span><h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "'Outfit', sans-serif" }}>{item.title}</h4></div>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Star size={14} style={{ color: c.amber }} /> Features</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  {["Interactive Graph", "Multiple Layouts", "Node Expansion", "Knowledge Panel", "Export PNG", "Share Link"].map((feat, i) => (
                    <motion.div key={feat} custom={i} variants={scaleIn} initial="hidden" animate="visible" className="flex items-center gap-2 text-sm" style={{ color: c.textSec }}>
                      <CheckCircle2 size={14} style={{ color: c.amber }} className="shrink-0" />
                      <span>{feat}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* GRAPH VIEW */}
          {!isGenerating && hasGraph && (
            <motion.div key="graph" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-0 relative" style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}>
              {/* TOP FLOATING CONTROLS */}
              <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2 pointer-events-auto">
                <div className="flex items-center rounded-xl p-1" style={{ background: c.stickyBg, border: `1px solid ${c.border}` }}>
                  {([
                    { id: "radial" as LayoutType, label: "Radial" },
                    { id: "tree" as LayoutType, label: "Tree" },
                    { id: "graph" as LayoutType, label: "Graph" },
                  ]).map(l => (
                    <button key={l.id} onClick={() => handleLayoutChange(l.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                      style={{ background: layoutType === l.id ? "linear-gradient(135deg, #f59e0b, #d97706)" : "transparent", color: layoutType === l.id ? "#000" : c.textSec }}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: c.stickyBg, border: `1px solid ${c.border}` }}>
                  <button onClick={handleExportPNG} className="p-1.5 rounded-lg transition-colors" style={{ color: c.textMuted }} title="Export PNG"><Download size={14} /></button>
                  <button onClick={handleShare} className="p-1.5 rounded-lg transition-colors" style={{ color: c.textMuted }} title="Share"><Share2 size={14} /></button>
                </div>
              </div>

              {/* REACT FLOW AREA */}
              <div className="flex-1 h-full rounded-2xl overflow-hidden" style={{ background: c.isDark ? "#09090b" : "#fafafa", border: `1px solid ${c.border}` }}>
                <ReactFlowProvider>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.1}
                    maxZoom={2}
                  >
                    <Controls showInteractive={false} style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: "12px", overflow: "hidden", color: c.text, fill: c.text }} />
                    <Background variant={BackgroundVariant.Dots} gap={24} size={1} color={c.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"} />
                    <MiniMap
                      style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: "12px", overflow: "hidden" }}
                      nodeColor={(node) => {
                        const nd = node.data as MindMapNodeData;
                        const t = nd?.type as string;
                        if (t === "root") return "#f59e0b";
                        if (t === "concept") return "#d97706";
                        if (t === "sub_concept") return "#818cf8";
                        if (t === "example") return "#10b981";
                        if (t === "application") return "#f43f5e";
                        return "#27272a";
                      }}
                      maskColor={c.isDark ? "rgba(3,3,3,0.85)" : "rgba(248,250,252,0.85)"}
                    />
                  </ReactFlow>
                </ReactFlowProvider>
              </div>

              {/* KNOWLEDGE PANEL */}
              <KnowledgePanel
                nodes={nodes}
                selectedNodeId={selectedNodeId}
                onClose={() => setSelectedNodeId(null)}
                onExpand={handleExpand}
                isExpanding={isExpanding}
                isDark={c.isDark}
                c={c}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

