"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap, Code2, FileText, Mic, BookOpen, Briefcase,
  Trophy, Wand2, Target, Rocket, CheckCircle2, ChevronRight,
  ChevronLeft, Sparkles, ArrowRight,
} from "lucide-react";
import { useThemeColors } from "@/hooks/useThemeColors";

const INTERESTS = [
  { id: "learning", label: "Study & Learning", icon: GraduationCap, desc: "Notes, quizzes, flashcards" },
  { id: "coding", label: "Coding & DSA", icon: Code2, desc: "Practice, challenges, assistant" },
  { id: "resume", label: "Resume & ATS", icon: FileText, desc: "Builder, score checker, cover letters" },
  { id: "interview", label: "Interview Prep", icon: Mic, desc: "HR, technical, mock interviews" },
  { id: "research", label: "Research", icon: BookOpen, desc: "Paper AI, plagiarism checker" },
  { id: "internship", label: "Internships", icon: Briefcase, desc: "Finder, tracker, recommendations" },
  { id: "job", label: "Job Search", icon: Target, desc: "Matching, referrals, JD analysis" },
  { id: "placement", label: "Placement Prep", icon: Trophy, desc: "Aptitude, reasoning, mock tests" },
  { id: "productivity", label: "AI Productivity", icon: Wand2, desc: "Email, SOP, content writing" },
];

const GOALS = [
  { id: "get_job", label: "Get placed at a top company" },
  { id: "build_skills", label: "Build strong technical skills" },
  { id: "portfolio", label: "Build an impressive portfolio" },
  { id: "crack_interview", label: "Crack interview rounds" },
  { id: "research_pub", label: "Publish research papers" },
  { id: "freelance", label: "Start freelancing" },
  { id: "upscale", label: "Upscale for current role" },
  { id: "explore", label: "Explore career options" },
];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
};

export function OnboardingFlow({ onComplete, userId }: { onComplete: () => void; userId?: string }) {
  const c = useThemeColors();
  const isDark = c.isDark;

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const toggleInterest = useCallback((id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const toggleGoal = useCallback((id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const next = () => { setDirection(1); setStep((s) => s + 1); };
  const prev = () => { setDirection(-1); setStep((s) => s - 1); };

  const finish = () => {
    localStorage.setItem("adyapan-onboarded", "true");
    if (userId) {
      localStorage.setItem(`adyapan-onboarded-${userId}`, "true");
    }
    sessionStorage.removeItem("adyapan-just-registered");
    localStorage.removeItem("adyapan-just-registered");
    localStorage.setItem("adyapan-interests", JSON.stringify(selectedInterests));
    localStorage.setItem("adyapan-goals", JSON.stringify(selectedGoals));
    onComplete();
  };

  const STEPS = 4;
  const progress = ((step + 1) / STEPS) * 100;

  // Dynamic theme colors
  const backdropBg = isDark ? "rgba(7,9,19,0.88)" : "rgba(15,23,42,0.45)";
  const cardBg = isDark ? "rgba(13,21,28,0.96)" : "#ffffff";
  const cardBorder = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)";
  const cardShadow = isDark
    ? "0 24px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)"
    : "0 20px 60px rgba(15,23,42,0.15), 0 4px 10px rgba(0,0,0,0.05)";

  const titleColor = isDark ? "#ffffff" : "#0f172a";
  const subtextColor = isDark ? "var(--text-secondary)" : "#475569";
  const mutedTextColor = isDark ? "var(--text-muted)" : "#64748b";

  const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

  const itemUnselectedBg = isDark ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const itemUnselectedBorder = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #e2e8f0";
  const itemUnselectedText = isDark ? "var(--text-primary)" : "#1e293b";

  const itemSelectedBg = isDark ? "rgba(245,158,11,0.14)" : "#fffbeb";
  const itemSelectedBorder = isDark ? "1.5px solid rgba(245,158,11,0.55)" : "1.5px solid #f59e0b";
  const itemSelectedText = isDark ? "#f59e0b" : "#b45309";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: backdropBg, backdropFilter: "blur(12px)",
    }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          style={{ position: "absolute", top: "-10%", left: "-10%", width: "40%", height: "40%", borderRadius: "50%", filter: "blur(120px)", background: isDark ? "radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)" : "radial-gradient(circle, rgba(245,158,11,0.22) 0%, transparent 70%)" }} />
        <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 15, ease: "easeInOut", delay: 2 }}
          style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40%", height: "40%", borderRadius: "50%", filter: "blur(120px)", background: isDark ? "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)" : "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)" }} />
      </div>

      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: "easeOut" }}
        style={{
          position: "relative", width: "100%", maxWidth: 520, margin: "0 1rem",
          background: cardBg, border: cardBorder,
          borderRadius: 20, padding: "2rem", boxShadow: cardShadow,
          overflow: "hidden",
        }}
      >
        <div style={{ height: 3, background: trackBg, borderRadius: 4, marginBottom: "1.5rem" }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 4, background: "linear-gradient(90deg, #f59e0b, #d97706)" }} />
        </div>

        <div style={{ fontSize: "0.7rem", fontWeight: 600, color: mutedTextColor, marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Step {step + 1} of {STEPS}
        </div>

        <AnimatePresence mode="wait" custom={direction}>
          <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}>
            {step === 0 && (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                  style={{ fontSize: "3rem", marginBottom: "1rem" }}>
                  <Rocket size={48} style={{ color: "#f59e0b" }} />
                </motion.div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: titleColor, marginBottom: "0.5rem" }}>Welcome to Adyapan AI</h2>
                <p style={{ fontSize: "0.9rem", color: subtextColor, lineHeight: 1.6, maxWidth: 380, margin: "0 auto" }}>
                  Your AI-powered career companion. Let us personalize your experience in just a few steps.
                </p>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={next}
                  style={{
                    marginTop: "1.5rem", padding: "0.7rem 2rem", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000000",
                    fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    boxShadow: "0 4px 15px rgba(245,158,11,0.3)",
                  }}>
                  Get Started <ArrowRight size={16} />
                </motion.button>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: titleColor, marginBottom: "0.3rem" }}>What interests you?</h2>
                <p style={{ fontSize: "0.8rem", color: mutedTextColor, marginBottom: "1.2rem" }}>Pick at least one to get started.</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.6rem" }}>
                  {INTERESTS.map((item) => {
                    const selected = selectedInterests.includes(item.id);
                    const Icon = item.icon;
                    return (
                      <motion.button key={item.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => toggleInterest(item.id)}
                        style={{
                          padding: "0.7rem", borderRadius: 12, cursor: "pointer", textAlign: "left",
                          background: selected ? itemSelectedBg : itemUnselectedBg,
                          border: selected ? itemSelectedBorder : itemUnselectedBorder,
                          transition: "all 0.15s ease",
                        }}>
                        <Icon size={18} style={{ color: selected ? (isDark ? "#f59e0b" : "#d97706") : mutedTextColor, marginBottom: 6 }} />
                        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: selected ? itemSelectedText : itemUnselectedText }}>{item.label}</div>
                        <div style={{ fontSize: "0.65rem", color: mutedTextColor, marginTop: 2 }}>{item.desc}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: titleColor, marginBottom: "0.3rem" }}>What are your goals?</h2>
                <p style={{ fontSize: "0.8rem", color: mutedTextColor, marginBottom: "1.2rem" }}>Select all that apply.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {GOALS.map((goal) => {
                    const selected = selectedGoals.includes(goal.id);
                    return (
                      <motion.button key={goal.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                        onClick={() => toggleGoal(goal.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.7rem",
                          padding: "0.65rem 0.8rem", borderRadius: 10, cursor: "pointer", textAlign: "left",
                          background: selected ? itemSelectedBg : itemUnselectedBg,
                          border: selected ? itemSelectedBorder : itemUnselectedBorder,
                          transition: "all 0.15s ease",
                        }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: selected ? "#f59e0b" : (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0"),
                          border: selected ? "none" : (isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1"),
                        }}>
                          {selected && <CheckCircle2 size={12} style={{ color: "#000000" }} />}
                        </div>
                        <span style={{ fontSize: "0.82rem", fontWeight: 500, color: selected ? itemSelectedText : subtextColor }}>{goal.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  style={{ marginBottom: "1rem" }}>
                  <Sparkles size={48} style={{ color: "#f59e0b" }} />
                </motion.div>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: titleColor, marginBottom: "0.5rem" }}>You are all set!</h2>
                <p style={{ fontSize: "0.85rem", color: subtextColor, lineHeight: 1.6, maxWidth: 360, margin: "0 auto 1.2rem" }}>
                  We have tailored your dashboard based on your selections. You can always update your preferences later in Settings.
                </p>
                {selectedInterests.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", marginBottom: "1.2rem" }}>
                    {selectedInterests.map((id) => {
                      const item = INTERESTS.find((i) => i.id === id);
                      return item ? (
                        <span key={id} style={{
                          padding: "0.3rem 0.7rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 600,
                          background: isDark ? "rgba(245,158,11,0.14)" : "#fef3c7",
                          color: isDark ? "#f59e0b" : "#b45309",
                          border: isDark ? "1px solid rgba(245,158,11,0.3)" : "1px solid #fde68a",
                        }}>
                          {item.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={finish}
                  style={{
                    padding: "0.7rem 2rem", borderRadius: 12, border: "none",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000000",
                    fontWeight: 800, fontSize: "0.9rem", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    boxShadow: "0 4px 15px rgba(245,158,11,0.3)",
                  }}>
                  Enter Dashboard <ArrowRight size={16} />
                </motion.button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && step < 3 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.2rem", paddingTop: "1rem", borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #f1f5f9" }}>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={prev}
              style={{
                padding: "0.55rem 1.2rem", borderRadius: 10,
                border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
                background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
                color: subtextColor, fontWeight: 600,
                fontSize: "0.82rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              <ChevronLeft size={14} /> Back
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={next}
              disabled={step === 1 && selectedInterests.length === 0}
              style={{
                padding: "0.55rem 1.2rem", borderRadius: 10, border: "none",
                background: step === 1 && selectedInterests.length === 0
                  ? (isDark ? "rgba(255,255,255,0.06)" : "#e2e8f0")
                  : "linear-gradient(135deg, #f59e0b, #d97706)",
                color: step === 1 && selectedInterests.length === 0
                  ? mutedTextColor
                  : "#000000",
                fontWeight: 700, fontSize: "0.82rem", cursor: step === 1 && selectedInterests.length === 0 ? "not-allowed" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}>
              Next <ChevronRight size={14} />
            </motion.button>
          </div>
        )}

        {step > 0 && step < 3 && (
          <div style={{ textAlign: "center", marginTop: "0.8rem" }}>
            <button onClick={finish} style={{
              background: "none", border: "none", color: mutedTextColor,
              fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline",
            }}>
              Skip for now
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
