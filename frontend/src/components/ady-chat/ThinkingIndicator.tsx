"use client";

import { motion } from "framer-motion";

// ─── Neural network thinking indicator ────────────────────────────────────────
// Replaces boring dots with an animated SVG neural network

interface ThinkingIndicatorProps {
  isDark: boolean;
}

export function ThinkingIndicator({ isDark }: ThinkingIndicatorProps) {
  const nodeColor = "#f59e0b";
  const lineColor = isDark ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.4)";

  // Nodes arranged in a small neural network layout
  const nodes = [
    { id: "i1", x: 10, y: 14 },
    { id: "i2", x: 10, y: 26 },
    { id: "h1", x: 26, y: 8 },
    { id: "h2", x: 26, y: 20 },
    { id: "h3", x: 26, y: 32 },
    { id: "o1", x: 42, y: 14 },
    { id: "o2", x: 42, y: 26 },
  ];

  const edges = [
    { from: "i1", to: "h1" }, { from: "i1", to: "h2" }, { from: "i1", to: "h3" },
    { from: "i2", to: "h1" }, { from: "i2", to: "h2" }, { from: "i2", to: "h3" },
    { from: "h1", to: "o1" }, { from: "h1", to: "o2" },
    { from: "h2", to: "o1" }, { from: "h2", to: "o2" },
    { from: "h3", to: "o1" }, { from: "h3", to: "o2" },
  ];

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <motion.div
      className="flex items-center gap-3 py-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.3 }}
    >
      {/* Neural network SVG */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isDark ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        <svg width="52" height="40" viewBox="0 0 52 40">
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodeMap[edge.from];
            const to = nodeMap[edge.to];
            return (
              <motion.line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={lineColor}
                strokeWidth="0.8"
                initial={{ opacity: 0.2 }}
                animate={{ opacity: [0.15, 0.7, 0.15] }}
                transition={{
                  duration: 1.5 + (i % 4) * 0.3,
                  delay: (i % 6) * 0.15,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <motion.circle
              key={node.id}
              cx={node.x}
              cy={node.y}
              r="2.5"
              fill={nodeColor}
              initial={{ opacity: 0.4 }}
              animate={{
                opacity: [0.3, 1, 0.3],
                r: [2, 3, 2],
              }}
              transition={{
                duration: 1.2 + (i % 3) * 0.4,
                delay: i * 0.12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Signal pulse traveling along a path */}
          <motion.circle
            r="1.5"
            fill="#f59e0b"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              cx: [10, 26, 42],
              cy: [20, 20, 20],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              repeatDelay: 0.3,
            }}
          />
        </svg>
      </div>

      {/* Text */}
      <div>
        <motion.div
          className="text-xs font-medium"
          style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#64748b", fontFamily: "var(--font-sans)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          Thinking
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.6 }}
          >
            .
          </motion.span>
          <motion.span
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.9 }}
          >
            .
          </motion.span>
        </motion.div>
      </div>
    </motion.div>
  );
}

