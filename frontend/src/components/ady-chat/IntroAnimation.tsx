"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Intro Animation — Full-screen opening experience ─────────────────────────
// Sequence:
//   0-1s: Logo appears with blur
//   1-2s: Glowing orb expands
//   2-3s: Particles begin floating
//   3-4s: Typing animation (3 phrases)
//   4s+:  Everything morphs into chat interface

interface IntroAnimationProps {
  isDark: boolean;
  onComplete: () => void;
}

const TYPING_PHRASES = [
  "Welcome to Ady Chat",
  "Your AI Learning Companion",
  "Ready when you are.",
];

export function IntroAnimation({ isDark, onComplete }: IntroAnimationProps) {
  const [phase, setPhase] = useState(0); // 0=logo, 1=orb, 2=particles, 3=typing, 4=done
  const [typedText, setTypedText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  const typingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase progression
  useEffect(() => {
    phaseRef.current = setTimeout(() => setPhase(1), 1000); // orb at 1s
    return () => { if (phaseRef.current) clearTimeout(phaseRef.current); };
  }, []);

  useEffect(() => {
    if (phase === 1) {
      const t = setTimeout(() => setPhase(2), 1000); // particles at 2s
      return () => clearTimeout(t);
    }
    if (phase === 2) {
      const t = setTimeout(() => setPhase(3), 1000); // typing at 3s
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Typing animation
  useEffect(() => {
    if (phase !== 3) return;

    const phrase = TYPING_PHRASES[phraseIndex];
    let charIdx = 0;
    setTypedText("");

    const typeNext = () => {
      if (charIdx <= phrase.length) {
        setTypedText(phrase.slice(0, charIdx));
        charIdx++;
        typingRef.current = setTimeout(typeNext, 45);
      } else {
        // Pause, then move to next phrase or complete
        typingRef.current = setTimeout(() => {
          if (phraseIndex < TYPING_PHRASES.length - 1) {
            setPhraseIndex(i => i + 1);
          } else {
            // All done — trigger completion after brief pause
            setTimeout(() => {
              setPhase(4);
              setTimeout(onComplete, 600);
            }, 500);
          }
        }, 700);
      }
    };

    typeNext();
    return () => { if (typingRef.current) clearTimeout(typingRef.current); };
  }, [phase, phraseIndex, onComplete]);

  // Cursor blink
  useEffect(() => {
    const interval = setInterval(() => setShowCursor(c => !c), 530);
    return () => clearInterval(interval);
  }, []);

  const INTRO_PARTICLES = [
    { x: 15, y: 25, size: 4, delay: 0 },
    { x: 80, y: 20, size: 3, delay: 0.3 },
    { x: 10, y: 70, size: 5, delay: 0.6 },
    { x: 90, y: 65, size: 3, delay: 0.2 },
    { x: 50, y: 10, size: 4, delay: 0.8 },
    { x: 30, y: 85, size: 3, delay: 0.4 },
    { x: 70, y: 90, size: 4, delay: 0.7 },
    { x: 5, y: 45, size: 3, delay: 1.0 },
    { x: 95, y: 35, size: 4, delay: 0.5 },
    { x: 55, y: 80, size: 3, delay: 0.9 },
    { x: 25, y: 50, size: 2, delay: 0.1 },
    { x: 75, y: 45, size: 2, delay: 0.6 },
    { x: 40, y: 15, size: 3, delay: 1.2 },
    { x: 60, y: 95, size: 2, delay: 0.35 },
    { x: 85, y: 50, size: 3, delay: 0.75 },
    { x: 20, y: 35, size: 2, delay: 1.1 },
  ];

  return (
    <AnimatePresence>
      {phase < 4 && (
        <motion.div
          key="intro"
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{
            zIndex: 1000,
            background: isDark
              ? "linear-gradient(135deg, #040412 0%, #080820 50%, #050512 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #ffffff 100%)",
          }}
          exit={{
            opacity: 0,
            scale: 1.05,
            filter: "blur(20px)",
            transition: { duration: 0.7, ease: [0.43, 0.13, 0.23, 0.96] },
          }}
        >
          {/* Background gradient mesh */}
          <div
            className="absolute inset-0"
            style={{
              opacity: isDark ? 0.5 : 0.3,
              background: isDark
                ? `
                  radial-gradient(ellipse 80% 60% at 30% 30%, rgba(245,158,11,0.12) 0%, transparent 60%),
                  radial-gradient(ellipse 60% 50% at 70% 70%, rgba(217,119,6,0.08) 0%, transparent 60%)
                `
                : `
                  radial-gradient(ellipse 80% 60% at 30% 30%, rgba(245,158,11,0.05) 0%, transparent 60%),
                  radial-gradient(ellipse 60% 50% at 70% 70%, rgba(217,119,6,0.03) 0%, transparent 60%)
                `,
            }}
          />

          {/* Slow rotating gradient ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 700,
              height: 700,
              background: isDark
                ? "conic-gradient(from 0deg, transparent 70%, rgba(245,158,11,0.15) 85%, transparent 100%)"
                : "conic-gradient(from 0deg, transparent 70%, rgba(245,158,11,0.06) 85%, transparent 100%)",
              filter: "blur(40px)",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Floating particles */}
          <AnimatePresence>
            {phase >= 2 && INTRO_PARTICLES.map((p, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  background: isDark
                    ? (i % 3 === 0 ? "rgba(245,158,11,0.7)" : i % 3 === 1 ? "rgba(59,130,246,0.6)" : "rgba(139,92,246,0.6)")
                    : (i % 3 === 0 ? "rgba(245,158,11,0.3)" : i % 3 === 1 ? "rgba(59,130,246,0.25)" : "rgba(139,92,246,0.25)"),
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: isDark ? [0.3, 0.7, 0.3] : [0.15, 0.35, 0.15],
                  scale: [1, 1.4, 1],
                  y: [0, -20, 0],
                }}
                transition={{
                  duration: 3 + i * 0.3,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </AnimatePresence>

          {/* Glowing orb — expands at phase 1 */}
          <motion.div
            className="absolute rounded-full"
            style={{
              background: isDark
                ? "radial-gradient(circle, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.1) 40%, transparent 70%)"
                : "radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.04) 40%, transparent 70%)",
              filter: "blur(2px)",
            }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={
              phase >= 1
                ? { width: 320, height: 320, opacity: 1 }
                : { width: 0, height: 0, opacity: 0 }
            }
            transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          />

          {/* Outer orb ring */}
          <motion.div
            className="absolute rounded-full border"
            style={{ borderColor: isDark ? "rgba(245,158,11,0.2)" : "rgba(245,158,11,0.1)" }}
            initial={{ width: 0, height: 0, opacity: 0 }}
            animate={
              phase >= 1
                ? {
                    width: 420,
                    height: 420,
                    opacity: [0, 0.6, 0.3],
                  }
                : { width: 0, height: 0, opacity: 0 }
            }
            transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
          />

          {/* Center content */}
          <div className="relative flex flex-col items-center gap-6 z-10">
            {/* Logo — appears at phase 0 */}
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.8, filter: "blur(20px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Logo icon — 3D animated orb */}
              <motion.div
                className="relative flex flex-col items-center justify-center"
                style={{ perspective: 1000 }}
              >
                <motion.img
                  src="/assets/logo.png"
                  alt="Adyapan Logo"
                  className="w-28 h-28 object-contain select-none pointer-events-none"
                  style={{
                    filter: "drop-shadow(0 15px 35px rgba(245,158,11,0.35))",
                    transformStyle: "preserve-3d",
                  }}
                  animate={{
                    y: [0, -12, 0],
                    rotateY: [-12, 12, -12],
                    rotateX: [-8, 8, -8],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />

                {/* Floating floor shadow under the orb */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 70,
                    height: 8,
                    background: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.15)",
                    filter: "blur(6px)",
                    bottom: -8,
                    zIndex: -1,
                  }}
                  animate={{
                    scale: [1, 0.8, 1],
                    opacity: [0.5, 0.25, 0.5],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </motion.div>

              {/* Brand name */}
              <motion.div className="text-center">
                <h1
                  className="text-5xl font-black tracking-tight"
                  style={{
                    color: isDark ? "#ffffff" : "#0f172a",
                    fontFamily: "var(--font-sans)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Ady <span style={{ color: "#f59e0b" }}>Chat</span>
                </h1>
              </motion.div>
            </motion.div>

            {/* Typing text — appears at phase 3 */}
            <AnimatePresence mode="wait">
              {phase >= 3 && (
                <motion.div
                  key={phraseIndex}
                  className="text-center h-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <span
                    className="text-lg font-bold"
                    style={{
                      color: isDark ? "#cbd5e1" : "#334155",
                      fontFamily: "var(--font-sans)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {typedText}
                  </span>
                  <span
                    className="inline-block w-0.5 h-5 ml-0.5 align-middle"
                    style={{
                      background: "#f59e0b",
                      opacity: showCursor ? 1 : 0,
                      transition: "opacity 0.1s",
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom powered-by text */}
          <motion.div
            className="absolute bottom-10 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 1.5, duration: 1 }}
          >
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{
                color: isDark ? "#94a3b8" : "#475569",
                letterSpacing: "0.2em",
              }}
            >
              Powered by Adyapan AI
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

