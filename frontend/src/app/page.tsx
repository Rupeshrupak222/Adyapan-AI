"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  motion, useScroll, useTransform, useSpring, AnimatePresence,
  type Variants, useMotionValue,
} from "framer-motion";
import {
  ArrowRight, Sparkles, Terminal, FileText, CheckCircle, ChevronDown,
  Brain, BookOpen, Trophy, MessageSquare, Play,
  Calendar, Star, Check, Layers,
  Search, Briefcase,
} from "lucide-react";
import { AnimatedRocket, AnimatedSparkles, AnimatedCheck, AnimatedCode, AnimatedZap } from "@/components/ui/AnimatedIcons";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { landingFAQs } from "@/data/platform";
import Scene from "@/components/3d/Scene";

// ─── Animation Variants ──────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const fadeRight: Variants = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const cardHover = {
  rest: { scale: 1, borderColor: "rgba(255,255,255,0.05)" },
  hover: { scale: 1.03, borderColor: "rgba(245,158,11,0.35)", transition: { type: "spring", stiffness: 300, damping: 15 } },
};

const section3D: Variants = {
  hidden: { rotateX: 12, y: 60, opacity: 0 },
  visible: { rotateX: 0, y: 0, opacity: 1, transition: { duration: 0.75, ease: "easeOut" as const } },
};

const variantMap = { fadeUp, fadeLeft, fadeRight, scaleIn, section3D } as const;

// ─── Number animation helper ──────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 40, damping: 15 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionValue.set(value);
    const unsubscribe = springValue.on("change", (v) => setDisplay(Math.round(v)));
    return unsubscribe;
  }, [value, motionValue, springValue]);

  return <>{display}</>;
}

// ─── Section Wrapper ──────────────────────────────────────────────────────
function Section({
  children, className, bg, id, variant = "fadeUp",
}: {
  children: React.ReactNode; className?: string; bg?: string; id?: string; variant?: keyof typeof variantMap;
}) {
  return (
    <motion.section
      id={id}
      variants={variantMap[variant] || fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      className={`py-24 relative z-10 ${bg || "bg-[#030712]"} border-t border-white/5 ${className || ""}`}
    >
      {children}
    </motion.section>
  );
}

// ─── Glowing Background ───────────────────────────────────────────────────
function GlowBackground() {
  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
      <motion.div
        className="absolute top-[-10%] left-[20%] w-[350px] h-[350px] rounded-full bg-amber-500/10 blur-[120px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-orange-500/10 blur-[140px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

// ─── Mouse Parallax Card ──────────────────────────────────────────────────
function MouseParallaxCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateY(x * 12);
    setRotateX(-y * 12);
  };

  const handleLeave = () => { setRotateX(0); setRotateY(0); };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="relative w-full max-w-[480px] aspect-[4/3] rounded-2xl border border-white/10 bg-[#090b11]/80 backdrop-blur-xl p-6 shadow-2xl cursor-pointer overflow-hidden z-10"
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const [faqSearch, setFaqSearch] = useState("");
  const [pricingPeriod, setPricingPeriod] = useState<"monthly" | "annually">("annually");
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  // ATS Scanner
  const [atsScanning, setAtsScanning] = useState(false);
  const [atsScore, setAtsScore] = useState(0);

  // Coding Hub Terminal
  const [terminalStep, setTerminalStep] = useState(0);
  const [terminalText, setTerminalText] = useState("");
  const promptString = "Build a microservices-based Netflix Clone using React...";

  // Scroll
  const { scrollY } = useScroll();
  const heroScale = useTransform(scrollY, [0, 500], [1, 0.92]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);

  // Terminal auto-typing
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTerminalText((prev) => prev + promptString.charAt(index));
      index++;
      if (index >= promptString.length) {
        clearInterval(interval);
        setTimeout(() => setTerminalStep(1), 1000);
        setTimeout(() => setTerminalStep(2), 2500);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ATS scanner loop
  useEffect(() => {
    const timer = setInterval(() => {
      setAtsScanning(true);
      setAtsScore(0);
      let current = 0;
      const scanInterval = setInterval(() => {
        current += 2;
        setAtsScore(current);
        if (current >= 92) {
          clearInterval(scanInterval);
          setTimeout(() => setAtsScanning(false), 2000);
        }
      }, 30);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.classList.add("landing");
    return () => document.body.classList.remove("landing");
  }, []);

  const filteredFAQs = landingFAQs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--landing-bg, #03060b)", color: "var(--landing-text, #f3f4f6)" }} className="overflow-x-hidden font-sans landing">
      <Navbar />

      <GlowBackground />

      {/* ════════════════ HERO ════════════════ */}
      <motion.section
        id="home"
        style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
        className="relative min-h-screen flex flex-col items-center justify-center pt-24 pb-16 px-4 md:px-8 z-10"
      >
        <div className="max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Content */}
          <motion.div
            className="lg:col-span-6 text-left space-y-6"
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Sparkles size={12} className="animate-spin" /> The Future of Learning is Agentic AI
            </motion.div>

            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white"
              style={{ fontFamily: "'Outfit', sans-serif" }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.7 }}
            >
              One AI <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">Operating System</span> For Careers
            </motion.h1>

            <motion.p
              className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              One central system for learning, smart coding, automated resume building, AI behavioral interviews, and placement channels.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-2 text-xs font-bold text-gray-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              {["Learn Faster", "Build Smarter", "Get Hired"].map((tag, i) => (
                <motion.span
                  key={tag}
                  className="px-2.5 py-1 bg-white/5 border border-white/5 rounded-full"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.12, type: "spring", stiffness: 200 }}
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 pt-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
            >
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-6 py-3 font-semibold text-black transition-all transform hover:-translate-y-0.5 shadow-lg shadow-amber-500/20"
              >
                Start Free Today <ArrowRight size={16} />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-6 py-3 font-semibold text-white border border-white/10 transition-colors"
              >
                Watch Demo <Play size={14} />
              </a>
            </motion.div>
          </motion.div>

          {/* Hero Dashboard Mockup */}
          <motion.div
            className="lg:col-span-6 flex justify-center relative"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <motion.div
              className="absolute inset-0 z-0 opacity-40 pointer-events-none"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Scene />
            </motion.div>
            <motion.div
              className="absolute -inset-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl opacity-10 blur-xl"
              animate={{ opacity: [0.05, 0.15, 0.05], scale: [1, 1.02, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            <MouseParallaxCard>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <motion.div className="w-3 h-3 rounded-full bg-red-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                  <motion.div className="w-3 h-3 rounded-full bg-yellow-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, delay: 0.3, repeat: Infinity }} />
                  <motion.div className="w-3 h-3 rounded-full bg-green-500" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, delay: 0.6, repeat: Infinity }} />
                </div>
                <div className="text-[10px] text-gray-500 font-mono">dashboard.adyapan.ai</div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  <motion.div
                    className="p-3 bg-white/3 border border-white/5 rounded-xl space-y-1"
                    whileHover={{ scale: 1.02, borderColor: "rgba(245,158,11,0.3)" }}
                  >
                    <div className="text-[9px] uppercase tracking-wider text-gray-500">Learning Speed</div>
                    <div className="text-xl font-bold text-amber-400">
                      <AnimatedNumber value={94} />x Faster
                    </div>
                  </motion.div>
                  <motion.div
                    className="p-3 bg-white/3 border border-white/5 rounded-xl space-y-2"
                    whileHover={{ scale: 1.02, borderColor: "rgba(245,158,11,0.3)" }}
                  >
                    <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">AI Agent Action Graph</div>
                    <div className="h-16 flex items-end gap-1 pt-2">
                      {[40, 75, 60, 90].map((h, i) => (
                        <motion.div
                          key={i}
                          className={`w-full rounded-t ${["bg-amber-500/40", "bg-orange-500/60", "bg-yellow-400/80", "bg-amber-500"][i]}`}
                          style={{ height: `${h}%` }}
                          animate={{ height: [`${h}%`, `${h + 15}%`, `${h}%`] }}
                          transition={{ duration: 2, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-4">
                  <motion.div
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-1"
                    animate={{ borderColor: ["rgba(245,158,11,0.2)", "rgba(245,158,11,0.5)", "rgba(245,158,11,0.2)"] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Brain className="w-6 h-6 text-amber-400 mx-auto" />
                    <span className="block text-[8px] text-gray-400">Skills Verified</span>
                    <span className="block text-xs font-bold text-white">18 Mastered</span>
                  </motion.div>
                  <motion.div
                    className="p-3 bg-white/3 border border-white/5 rounded-xl text-center space-y-1"
                    whileHover={{ scale: 1.05 }}
                  >
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Trophy className="w-6 h-6 text-yellow-400 mx-auto" />
                    </motion.div>
                    <span className="block text-[8px] text-gray-400">Rank</span>
                    <span className="block text-xs font-bold text-white">Top 2%</span>
                  </motion.div>
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                className="absolute top-1/4 right-[-20px] px-3 py-1.5 bg-[#0d0f17] border border-white/10 rounded-lg text-[9px] text-white flex items-center gap-1.5 shadow-lg shadow-black/40"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> Study Assistant
              </motion.div>
              <motion.div
                className="absolute bottom-1/4 left-[-15px] px-3 py-1.5 bg-[#0d0f17] border border-white/10 rounded-lg text-[9px] text-white flex items-center gap-1.5 shadow-lg shadow-black/40"
                animate={{ y: [0, 8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              >
                <Terminal className="w-3.5 h-3.5 text-amber-400" /> Coding Copilot
              </motion.div>
            </MouseParallaxCard>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={24} className="text-gray-500" />
        </motion.div>
      </motion.section>

      {/* ════════════════ SCROLL STORY ════════════════ */}
      <Section bg="bg-[#05070c]" variant="section3D">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-16">
          <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={staggerItem} className="text-3xl md:text-4xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Adyapan AI Builds Your Journey Automatically
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base">
              Watch how our agentic system constructs a tailormade career path step-by-step.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left items-stretch"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { title: "Goal Selection", sub: "Target Role", value: "Machine Learning Engineer", desc: "Define your primary goals, and our platform tunes your syllabus automatically.", color: "amber" },
              { title: "Roadmap Node", sub: null, steps: ["Learn Core ML", "Build Projects", "Practice Interviews"], desc: "A custom timeline is drawn, mapping skill acquisitions, builds, and recruiter preparation.", color: "orange" },
              { title: "Career Launch", sub: "Fast-tracked Screen", value2: "Direct Partner Hiring", desc: "Match automatically with micro-internships and placement drives based on verified data.", color: "yellow" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={staggerItem}
                whileHover={{ y: -6, borderColor: `rgba(245,158,11,0.25)`, transition: { type: "spring", stiffness: 200 } }}
                className="p-6 bg-white/2 border border-white/5 rounded-2xl space-y-4 flex flex-col justify-between"
              >
                <div className={`text-xs uppercase text-${item.color}-400 font-bold tracking-wider`}>{item.title}</div>
                {"steps" in item ? (
                  <div className="space-y-2">
                    {item.steps!.map((s, j) => (
                      <motion.div
                        key={s}
                        className="flex items-center gap-2 text-xs font-semibold text-gray-300"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: j * 0.15 }}
                      >
                        {j < 2 ? <CheckCircle size={12} className="text-amber-400" /> : <div className="w-3 h-3 rounded-full border border-gray-600" />}
                        {s}
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div
                    className={`p-4 bg-${item.color}-500/10 border border-${item.color}-500/20 rounded-xl text-center space-y-1`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="text-[10px] text-gray-400">{item.sub}</div>
                    <div className="text-sm font-bold text-white">{item.value}</div>
                    {"value2" in item && <div className="text-[9px] text-amber-400">{item.value2}</div>}
                  </motion.div>
                )}
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ AGENT ECOSYSTEM ════════════════ */}
      <Section variant="section3D">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-5 text-left space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={staggerItem} className="text-3xl md:text-4xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              The Agent Ecosystem
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base leading-relaxed">
              Every hub acts as an interconnected node. Your study performance directly builds your resume skills, preparing you for matching interview modules.
            </motion.p>
            <motion.div variants={staggerItem} className="space-y-4">
              {[
                "Learning data generates project ideas",
                "Project builds automatically upgrade your ATS resume",
                "ATS resume configures AI coaching questions",
                "Coaching score feeds direct placement matches",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 text-xs text-gray-300"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.4 }}
                  whileHover={{ x: 5, color: "#f59e0b" }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ delay: i * 0.15, type: "spring" }}
                  >
                    <Check size={14} className="text-amber-400" />
                  </motion.div>
                  {text}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-7 flex justify-center relative"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <svg viewBox="0 0 400 400" className="w-full max-w-[420px] aspect-square overflow-visible">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {[
                { x1: 200, y1: 200, x2: 80, y2: 100, dash: "5,5" },
                { x1: 200, y1: 200, x2: 320, y2: 100, dash: "" },
                { x1: 200, y1: 200, x2: 80, y2: 300, dash: "" },
                { x1: 200, y1: 200, x2: 320, y2: 300, dash: "" },
              ].map((line, i) => (
                <motion.line
                  key={i}
                  x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                  stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray={line.dash}
                  initial={{ pathLength: 0, opacity: 0 }}
                  whileInView={{ pathLength: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: i * 0.2 }}
                />
              ))}

              {[
                { cx: 200, cy: 200, label: "Adyapan AI", color: "#f59e0b" },
                { cx: 80, cy: 100, label: "Learning", color: "#f59e0b" },
                { cx: 320, cy: 100, label: "Coding", color: "#ea580c" },
                { cx: 80, cy: 300, label: "Resume Hub", color: "#f59e0b" },
                { cx: 320, cy: 300, label: "Placement", color: "#ea580c" },
              ].map((node, i) => (
                <motion.g key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 150 }}
                >
                  <circle cx={node.cx} cy={node.cy} r={i === 0 ? 28 : 22}
                    fill={i === 0 ? "#1c160c" : "#0d0d0d"}
                    stroke={node.color} strokeWidth="2"
                  />
                  <text x={node.cx} y={node.cy + (i === 0 ? 4 : 3)}
                    textAnchor="middle" fill={i === 0 ? "#fff" : "#fde047"}
                    fontSize={i === 0 ? 9 : 7} fontWeight="bold" fontFamily="sans-serif"
                  >
                    {node.label}
                  </text>
                </motion.g>
              ))}
            </svg>
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ LEARNING HUB ════════════════ */}
      <Section bg="bg-[#05070c]" variant="section3D" id="features">
        <div className="max-w-6xl mx-auto px-4 space-y-16">
          <motion.div
            className="text-center space-y-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400">
              <Brain size={12} /> Personalized Academy
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Explore the Learning Hub
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
              Automated document synthesis, syllabus notes, custom question generators, and study plan utilities in one dashboard.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: BookOpen, color: "amber", title: "Notes Generator", desc: "Upload PDFs or slides, and get beautifully structured summaries, key takeaways, and flashcards instantly." },
              { icon: Brain, color: "orange", title: "Quiz Creator", desc: "Test yourself with conceptual questions generated straight from your syllabus to check validation scores." },
              { icon: Layers, color: "yellow", title: "Mind Map builder", desc: "Unlock tree mind-maps generated from raw topic inputs to link connected academic definitions logically." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={staggerItem}
                  whileHover={{ y: -8, borderColor: `rgba(245,158,11,0.35)`, transition: { type: "spring", stiffness: 200 } }}
                  className="p-8 bg-white/2 border border-white/5 rounded-2xl space-y-4 transition-colors"
                >
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <Icon className={`w-8 h-8 text-${item.color}-400`} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ CODING HUB ════════════════ */}
      <Section variant="section3D">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-6 space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400">
              <Terminal size={12} /> Tech & Execution
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Coding Assistant & Workspace
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base leading-relaxed">
              Design architectures, write correct functions, solve coding challenges, and prepare for algorithmic technical interviews.
            </motion.p>
            <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-4">
              {["DSA Hub", "Portfolio Gen"].map((item, i) => (
                <motion.div
                  key={item}
                  variants={staggerItem}
                  whileHover={{ scale: 1.03, borderColor: "rgba(245,158,11,0.3)" }}
                  className="p-4 bg-white/3 border border-white/5 rounded-xl"
                >
                  <span className="block text-sm font-bold text-white">{item}</span>
                  <span className="block text-[10px] text-gray-500 mt-1">
                    {i === 0 ? "Algorithmic preparations" : "Showcase finished projects"}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-6"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="w-full max-w-[480px] aspect-[4/3] rounded-2xl border border-white/10 bg-[#090b11]/90 font-mono text-[11px] overflow-hidden flex flex-col shadow-2xl">
              <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <motion.div className="w-2.5 h-2.5 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
                  <motion.div className="w-2.5 h-2.5 rounded-full bg-yellow-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, delay: 0.3, repeat: Infinity }} />
                  <motion.div className="w-2.5 h-2.5 rounded-full bg-green-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, delay: 0.6, repeat: Infinity }} />
                </div>
                <div className="text-[10px] text-gray-500">Terminal — node workspace</div>
              </div>
              <div className="p-5 flex-1 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400">~</span>
                  <motion.span className="text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {terminalText}
                    <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.5, repeat: Infinity }} className="inline-block w-[3px] h-4 bg-amber-400 ml-0.5 align-middle" />
                  </motion.span>
                </div>
                <AnimatePresence>
                  {terminalStep >= 1 && (
                    <motion.div
                      className="text-gray-400 space-y-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="text-amber-400 block font-bold"><AnimatedRocket size={14} className="inline mr-1.5" /> Initializing AI Build Agent...</span>
                      <span className="block font-bold"><AnimatedCheck size={14} className="inline mr-1.5" /> Setting up Tech Stack: Next.js + NestJS + Docker</span>
                      <span className="block"><AnimatedCheck size={14} className="inline mr-1.5" /> Assembling architecture structures...</span>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {terminalStep >= 2 && (
                    <motion.div
                      className="text-gray-400 space-y-1"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      <span className="text-green-400 block font-bold">Generated Files:</span>
                      <span className="block text-amber-400 font-bold">├── gateway/src/main.ts (Gateway Service)</span>
                      <span className="block text-amber-400 font-bold">├── auth-service/src/auth.controller.ts (JWT Auth)</span>
                      <span className="block text-amber-400 font-bold">└── billing-service/prisma/schema.prisma (Neon DB)</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ RESUME HUB ════════════════ */}
      <Section bg="bg-[#05070c]" variant="section3D">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-6 relative flex justify-center"
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="relative w-full max-w-[360px] aspect-[1/1.4] bg-white border border-gray-200 rounded-xl p-6 shadow-2xl flex flex-col justify-between overflow-hidden"
              whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}
            >
              {atsScanning && (
                <motion.div
                  className="absolute left-0 w-full h-1 bg-amber-500/80 shadow-[0_0_10px_#f59e0b]"
                  animate={{ top: ["10%", "90%", "10%"] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="w-24 h-4 bg-gray-900 rounded" />
                    <div className="w-16 h-2.5 bg-gray-400 rounded" />
                  </div>
                  <motion.div
                    className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center font-bold text-[9px] text-white"
                    animate={atsScanning ? { scale: [1, 1.1, 1] } : {}}
                  >
                    {atsScore}%
                  </motion.div>
                </div>
                <div className="h-0.5 bg-gray-200 w-full" />
                <div className="space-y-2">
                  <div className="w-12 h-3 bg-gray-900 rounded" />
                  <div className="w-full h-2.5 bg-gray-300 rounded" />
                  <div className="w-5/6 h-2.5 bg-gray-300 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="w-20 h-3 bg-gray-900 rounded" />
                  <div className="w-full h-2.5 bg-gray-300 rounded" />
                  <div className="w-4/5 h-2.5 bg-gray-300 rounded" />
                </div>
              </div>

              <div className="flex justify-between items-center text-[8px] text-gray-500">
                <span>ATS Optimized</span>
                <span>Verified by Adyapan</span>
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-10 right-4 p-4 bg-[#090b11] border border-white/10 rounded-2xl flex items-center gap-3 shadow-xl"
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-12 h-12 relative flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="transparent" />
                  <motion.circle
                    cx="24" cy="24" r="20" stroke="#f59e0b" strokeWidth="4" fill="transparent"
                    strokeDasharray={2 * Math.PI * 20}
                    animate={{ strokeDashoffset: 2 * Math.PI * 20 * (1 - atsScore / 100) }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <span className="absolute text-[10px] font-bold text-white">{atsScore}%</span>
              </div>
              <div>
                <span className="block text-[8px] text-gray-400 uppercase">Search Visibility</span>
                <span className="block text-xs font-bold text-white">ATS Grade A+</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-6 space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400">
              <FileText size={12} /> Conversion & Profile
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Most Important Conversion: Resume Hub
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base leading-relaxed">
              Assemble resume drafts, test keywords with the ATS Score Checker, run AI SWOT reviews, and export to LinkedIn.
            </motion.p>
            <motion.div variants={staggerContainer} className="space-y-4">
              {[
                "Instant ATS audit checking formatting issues",
                "SWOT analyzer identifying skill gaps",
                "LinkedIn Profile Optimizer improving recruiter visibility",
                "Cover Letter Generator aligning with target JDs",
              ].map((text, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  className="flex items-center gap-3 text-xs text-gray-300"
                  whileHover={{ x: 5, color: "#f59e0b" }}
                >
                  <Check size={14} className="text-amber-400" />
                  {text}
                </motion.div>
              ))}
            </motion.div>
            <motion.div variants={staggerItem} className="pt-2">
              <Link href="/login" className="inline-flex items-center gap-2 text-xs font-bold text-[#f59e0b] hover:underline">
                Unlock Resume Hub <ArrowRight size={14} />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ INTERVIEW COACH ════════════════ */}
      <Section variant="section3D">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-6 space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400">
              <MessageSquare size={12} /> Behavioral Drills
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              AI Interview Simulation
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base leading-relaxed">
              Speak or code live. Receive structured analytics evaluations tracking your Confidence, Communication quality, Tech speed, and structure.
            </motion.p>
            <motion.div variants={staggerItem} className="space-y-4">
              {[
                { label: "Confidence", value: 88, color: "#f59e0b" },
                { label: "Communication", value: 92, color: "#ea580c" },
              ].map((bar, i) => (
                <div key={bar.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">{bar.label}</span>
                    <motion.span
                      className="text-white font-bold"
                      initial={{ opacity: 0, x: 10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.3 }}
                    >
                      <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                      >
                        {bar.value}%
                      </motion.span>
                    </motion.span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden relative" style={{ background: "var(--bar-track, rgba(255,255,255,0.08))" }}>
                    <motion.div
                      className="h-full rounded-full relative overflow-hidden"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${bar.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.6 + i * 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                      style={{ background: bar.color }}
                    >
                      <motion.div
                        className="absolute inset-0 w-full h-full"
                        style={{
                          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                        }}
                        animate={{ x: ["-100%", "200%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1.5 + i * 0.3 }}
                      />
                    </motion.div>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-6 flex justify-center"
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <motion.div
              className="w-full max-w-[480px] bg-[#0c0d15] border border-white/5 rounded-2xl p-6 space-y-4 backdrop-blur-xl"
              whileHover={{ y: -4, borderColor: "rgba(245,158,11,0.2)" }}
            >
              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <motion.div
                  className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <Brain size={16} />
                </motion.div>
                <div>
                  <span className="block text-xs font-bold text-white">AI HR Coach</span>
                  <span className="block text-[8px] text-green-400">Live Simulation</span>
                </div>
              </div>

              <div className="space-y-3 text-[11px] leading-relaxed">
                <motion.div
                  className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 max-w-[85%]"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  &quot;Tell me about a time you handled a difficult conflict inside a technical engineering team.&quot;
                </motion.div>
                <motion.div
                  className="p-3 bg-white/5 border border-white/5 rounded-xl text-gray-300 max-w-[85%] ml-auto text-right"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  &quot;I resolved a branch merge conflict by scheduling a sync alignment to map data models together.&quot;
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ PLACEMENT HUB ════════════════ */}
      <Section bg="bg-[#05070c]" variant="section3D">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <motion.div
            className="text-center space-y-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs font-semibold text-amber-400">
              <Trophy size={12} /> Opportunities
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Placement Hub & Opportunities
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
              Get matched directly with micro-internships, placement drives, remote gigs, and hackathons verified by credentials.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: Briefcase, color: "amber", title: "Micro-Internships", desc: "Short-term remote engineering positions." },
              { icon: Trophy, color: "orange", title: "Hiring Drives", desc: "Direct hiring partnership opportunities." },
              { icon: Calendar, color: "yellow", title: "Hackathons", desc: "Compete globally and verify skill sets." },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  variants={staggerItem}
                  whileHover={{ y: -8, borderColor: `rgba(${i % 2 === 0 ? "245,158,11" : "234,88,12"},0.3)`, transition: { type: "spring", stiffness: 200 } }}
                  className="p-6 bg-white/2 border border-white/5 rounded-2xl space-y-4 transition-colors"
                >
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className={`w-8 h-8 text-${item.color}-400`} />
                  </motion.div>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ LIVE STATS ════════════════ */}
      <Section variant="section3D" id="live-dashboard">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <motion.div
            className="lg:col-span-4 text-left space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Live Platform Statistics
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base leading-relaxed">
              A comprehensive platform built with cutting-edge AI technology.
            </motion.p>
          </motion.div>

          <motion.div
            className="lg:col-span-8 flex items-center justify-center"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div variants={staggerItem} className="grid grid-cols-2 gap-4 w-full max-w-md">
              {[
                { label: "AI Models Available", value: "10+" },
                { label: "Challenge Categories", value: "10" },
                { label: "Coding Challenges", value: "62+" },
                { label: "Study Features", value: "15+" },
              ].map((stat, i) => (
                <div key={i} className="p-5 bg-white/5 border border-white/10 rounded-2xl text-center space-y-1">
                  <span className="block text-2xl font-extrabold text-white">{stat.value}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-gray-500">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ PRICING ════════════════ */}
      <Section id="pricing" bg="bg-[#05070c]" variant="section3D">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <motion.div
            className="text-center space-y-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Transparent, Flexible Plans
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
              Choose the tier that maps perfectly with your academic or career requirements.
            </motion.p>
            <motion.div variants={staggerItem} className="inline-flex bg-white/5 border border-white/5 rounded-full p-1 mt-4">
              <button
                onClick={() => setPricingPeriod("monthly")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${pricingPeriod === "monthly" ? "bg-amber-500 text-black" : "text-gray-400"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setPricingPeriod("annually")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${pricingPeriod === "annually" ? "bg-amber-500 text-black" : "text-gray-400"}`}
              >
                Annually (Save 20%)
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { title: "Free Tier", price: "$0", desc: "Essential tools for all college students.", features: ["Syllabus Notes Creator", "ATS Resume Scanner (3 checks)", "General Job Hub access"], cta: "Start Free", pro: false },
              {
                title: "Pro Plan", price: pricingPeriod === "annually" ? "$12" : "$15", desc: "Ultimate behavioral coach & full resume audits.",
                features: ["Infinite Resume SWOT Reviews", "Unlimited AI Mock Interviews", "Direct LinkedIn Profile Optimizer", "Micro-internships matching channels"],
                cta: "Upgrade to Pro", pro: true, popular: true,
              },
              { title: "Campus Partner", price: "Institutional", desc: "For departments, placement cells, and universities.", features: ["White-label domain portals", "Admin placement tracker console", "Bulk student cohort analytics"], cta: "Contact Campus Sales", pro: false },
            ].map((plan, i) => (
              <motion.div
                key={plan.title}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { type: "spring", stiffness: 200 } }}
                className={`p-8 ${plan.popular ? "bg-[#0f0e09] border-2 border-amber-500/40" : "bg-white/2 border border-white/5"} rounded-2xl flex flex-col justify-between space-y-6 relative`}
              >
                {plan.popular && (
                  <motion.div
                    className="absolute top-4 right-4 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-[9px] font-bold text-amber-300 uppercase"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Most Popular
                  </motion.div>
                )}
                <div className="space-y-2">
                  <span className={`text-sm font-bold ${plan.popular ? "text-amber-400" : "text-gray-400"}`}>{plan.title}</span>
                  <div className="text-4xl font-extrabold text-white">
                    {plan.price} {plan.title === "Pro Plan" && <span className="text-xs text-gray-500">/ mo</span>}
                  </div>
                  <p className="text-xs text-gray-500">{plan.desc}</p>
                </div>
                <ul className="space-y-3 text-xs text-gray-300">
                  {plan.features.map((f) => (
                    <motion.li
                      key={f}
                      className="flex items-center gap-2"
                      whileHover={{ x: 3 }}
                    >
                      <Check size={12} className="text-green-400" /> {f}
                    </motion.li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`w-full text-center py-2 text-xs font-bold rounded-lg transition-all ${
                    plan.popular
                      ? "bg-amber-500 text-black hover:bg-amber-600"
                      : "border border-white/10 hover:bg-white/5"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ FAQ ════════════════ */}
      <Section variant="section3D" id="faq">
        <div className="max-w-4xl mx-auto px-4 space-y-12">
          <motion.div
            className="text-center space-y-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.h2 variants={staggerItem} className="text-3xl md:text-5xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Frequently Asked Questions
            </motion.h2>
            <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base max-w-xl mx-auto">
              Quick answers about core features, ATS checks, and account credits.
            </motion.p>
            <motion.div variants={staggerItem} className="relative max-w-md mx-auto mt-6">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <motion.input
                type="text"
                placeholder="Search FAQs..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/5 focus:border-amber-500 focus:outline-none rounded-xl py-2.5 pl-10 pr-4 text-xs text-white"
                whileFocus={{ borderColor: "rgba(245,158,11,0.5)", scale: 1.01 }}
              />
            </motion.div>
          </motion.div>

          <motion.div
            className="space-y-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {filteredFAQs.length === 0 ? (
              <motion.div variants={staggerItem} className="text-center text-xs text-gray-500 py-8">No matching FAQs found.</motion.div>
            ) : (
              filteredFAQs.map((faq, idx) => (
                <motion.div
                  key={idx}
                  variants={staggerItem}
                  className="bg-white/2 border border-white/5 rounded-xl overflow-hidden"
                >
                  <motion.button
                    onClick={() => setActiveFAQ(activeFAQ === idx ? null : idx)}
                    className="flex w-full items-center justify-between p-5 text-left text-sm font-semibold text-white cursor-pointer"
                    whileHover={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <span>{faq.question}</span>
                    <motion.div
                      animate={{ rotate: activeFAQ === idx ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown size={16} />
                    </motion.div>
                  </motion.button>
                  <AnimatePresence initial={false}>
                    {activeFAQ === idx && (
                      <motion.div
                        key="faq-answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.35, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 text-xs text-gray-400 leading-relaxed border-t border-white/5 pt-3">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </Section>

      {/* ════════════════ FINAL CTA ════════════════ */}
      <Section variant="section3D" bg="bg-[#05070c]" className="relative py-28 overflow-hidden text-center flex flex-col items-center justify-center">
        {/* Animated Particles */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {[
            { top: "20%", left: "10%", w: 2.5, h: 2.5, delay: 0 },
            { top: "50%", right: "15%", w: 1.5, h: 1.5, delay: 2 },
            { top: "30%", left: "30%", w: 2, h: 2, delay: 4 },
          ].map((p, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-amber-500"
              style={{ top: p.top, left: p.left, right: p.right as string, width: p.w * 4, height: p.h * 4 }}
              animate={{ y: [0, -20, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 6, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>

        <motion.div
          className="max-w-3xl px-4 space-y-8 relative"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            variants={staggerItem}
            className="mx-auto w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center p-[2px] shadow-lg shadow-amber-500/20"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <div className="w-full h-full bg-[#05070c] rounded-full flex items-center justify-center">
              <Brain className="w-8 h-8 text-amber-400" />
            </div>
          </motion.div>

          <motion.h2 variants={staggerItem} className="text-4xl md:text-6xl font-extrabold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Your Learning. Your Skills.<br />
            <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">Your Future. Powered by AI.</span>
          </motion.h2>

          <motion.p variants={staggerItem} className="text-gray-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Everything you need to learn, build outstanding projects, optimize ATS resume documents, pass interviews, and launch your career.
          </motion.p>

          <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 px-8 py-3.5 font-bold text-black transition-all transform hover:-translate-y-0.5 shadow-lg shadow-amber-500/25 text-sm"
              >
                Launch Adyapan AI
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/login?tab=register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-8 py-3.5 font-bold text-white border border-white/10 transition-colors text-sm"
              >
                Start Free Today
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </Section>

      <Footer />

      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
        .animate-scan {
          animation: scan 3.5s infinite ease-in-out;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        .animate-float {
          animation: float 6s infinite ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s forwards ease-out;
        }
        .text-gradient {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}

