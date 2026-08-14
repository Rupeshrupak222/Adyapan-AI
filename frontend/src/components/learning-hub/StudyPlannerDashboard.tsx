"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { 
  Calendar as CalendarIcon, BookOpen, Clock, AlertCircle, Award, 
  Sparkles, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, 
  ArrowLeft, Download, Plus, AlertTriangle, BookOpenCheck, Flame, 
  CalendarRange, ListTodo, Star, UploadCloud, FileText, CheckSquare, Square, Zap
} from "lucide-react";
import { WeakTopicDetectionDashboard } from "@/components/learning-hub/WeakTopicDetectionDashboard";
import { useTheme } from "@/hooks/useTheme";

const mkColors = (theme: string) => {
  const isDark = theme === "dark";
  return {
    isDark,
    text: isDark ? "#e5e7eb" : "#0f172a", textSec: isDark ? "#9ca3af" : "#475569", textMuted: isDark ? "#828fa3" : "#5f6368", textOnAmber: "#000000",
    bg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", bgHover: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", surfaceHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)", borderHover: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.18)",
    borderFocus: isDark ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.5)", inputBg: isDark ? "rgba(0,0,0,0.35)" : "#f1f5f9",
    cardBg: isDark ? "rgba(255,255,255,0.025)" : "#ffffff", cardBgAlt: isDark ? "rgba(0,0,0,0.25)" : "#f8fafc",
    stickyBg: isDark ? "rgba(10,10,20,0.88)" : "rgba(248,250,252,0.92)",
    amber: "#f59e0b", amberBg: isDark ? "rgba(245,158,11,0.07)" : "rgba(245,158,11,0.08)", amberBorder: isDark ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.25)", amberActive: isDark ? "rgba(245,158,11,0.12)" : "rgba(245,158,11,0.1)",
    purpleBg: isDark ? "rgba(139,92,246,0.06)" : "rgba(139,92,246,0.05)", purpleBorder: isDark ? "rgba(139,92,246,0.14)" : "rgba(139,92,246,0.15)",
    cyanBg: isDark ? "rgba(6,182,212,0.06)" : "rgba(6,182,212,0.05)", cyanBorder: isDark ? "rgba(6,182,212,0.14)" : "rgba(6,182,212,0.15)",
    green: "#10b981", greenBg: isDark ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.08)",
    divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    pill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", pillBorder: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
  };
};

interface StudyTask {
  id: string;
  topicName: string;
  scheduledDate: string;
  priority: string;
  status: string;
  estimatedTime: number;
  completedAt?: string;
}

interface StudyPlan {
  id: string;
  title: string;
  examDate?: string;
  studyMode: string;
  dailyHours: number;
  targetScore: string;
  completionPercentage: number;
  daysRemaining: number;
  streak: number;
  successProbability: string;
  workloadAnalysis: {
    dailyWorkload: string;
    burnoutRisk: string;
    totalTodayHours: number;
    learningCapacity: string;
  };
}

interface Recommendation {
  type: string;
  title: string;
  reason: string;
  priority: string;
  action: string;
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }) };
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.07, duration: 0.35 } }) };
const slideRight = { hidden: { opacity: 0, x: -24 }, visible: (i = 0) => ({ opacity: 1, x: 0, transition: { delay: i * 0.07, duration: 0.4 } }) };

export function StudyPlannerDashboard() {
  const theme = useTheme();
  const c = mkColors(theme);

  // Top-level tab: "planner" | "weak-topics"
  const [activeTab, setActiveTab] = useState<"planner" | "weak-topics">("planner");

  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    examDate: "",
    dailyHours: "3",
    targetScore: "90%",
    studyMode: "Exam Preparation",
    customTopics: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzingFile, setAnalyzingFile] = useState(false);

  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [todayTasks, setTodayTasks] = useState<StudyTask[]>([]);
  const [todayRevisions, setTodayRevisions] = useState<{ id: string; topicName: string; revisionType: string }[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<{ id: string; date: string; type: string; title: string; status: string }[]>([]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const [loadingStage, setLoadingStage] = useState(0);
  const loadingStages = [
    "Analyzing Learning Material...",
    "Calculating Study Time...",
    "Identifying Priorities...",
    "Scheduling Topics...",
    "Planning Revisions...",
    "Generating Recommendations...",
    "Study Plan Ready!"
  ];

  const fetchTodaySchedule = async () => {
    try {
      const res = await api.get("/study-planner/today");
      if (res.data.success) {
        setTodayTasks(res.data.tasks);
        setTodayRevisions(res.data.revisions);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load today's schedule.");
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await api.get("/recommendations/study");
      if (res.data.success) {
        const mapped = (res.data.recommendations || []).map((rec: { recommendationType: string; topicName: string; reason: string; priority: string }) => ({
          type: rec.recommendationType === "study_next" ? "Study Next" : "Retention Warning",
          title: rec.topicName,
          reason: rec.reason,
          priority: rec.priority,
          action: "Start"
        }));
        setRecommendations(mapped);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load recommendations.");
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const res = await api.get("/study-planner/calendar");
      if (res.data.success) {
        setCalendarEvents(res.data.events);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load calendar events.");
    }
  };

  const fetchActivePlan = async () => {
    setLoadingPlan(true);
    try {
      const res = await api.get("/study-planner");
      if (res.data.success && res.data.plan) {
        setActivePlan(res.data.plan);
        setTasks(res.data.tasks);
        await Promise.all([
          fetchTodaySchedule(),
          fetchRecommendations(),
          fetchCalendarEvents()
        ]);
      } else {
        setActivePlan(null);
        setTasks([]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load study plan data.");
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchActivePlan();
  }, []);

  const handleReschedule = async () => {
    setRescheduling(true);
    try {
      const res = await api.post("/study-planner/reschedule");
      if (res.data.success) {
        toast.success(res.data.message || "Smart rescheduling completed.");
        await fetchActivePlan();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to reschedule tasks.");
    } finally {
      setRescheduling(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    try {
      const res = await api.post("/study-planner/task/complete", { taskId, status: nextStatus });
      if (res.data.success) {
        if (nextStatus === "Completed") {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.8 },
            colors: ["#f59e0b", "#d97706", "#fbbf24"]
          });
          toast.success("Task completed! +8 XP Awarded.");
        } else {
          toast.info("Task marked as pending.");
        }
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
        setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
        const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: nextStatus } : t);
        const completed = updatedTasks.filter(t => t.status === "Completed").length;
        const compPct = updatedTasks.length > 0 ? Math.round((completed / updatedTasks.length) * 100) : 0;
        if (activePlan) {
          setActivePlan({ ...activePlan, completionPercentage: compPct, successProbability: `${Math.min(98, 70 + Math.round(compPct * 0.28))}%` });
        }
        await Promise.all([fetchRecommendations(), fetchCalendarEvents()]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update task status.");
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("Please enter a study goal or exam name.");
    setGenerating(true);
    setLoadingStage(0);
    const timer = setInterval(() => {
      setLoadingStage(prev => prev < loadingStages.length - 2 ? prev + 1 : prev);
    }, 1800);
    try {
      let documentText = "";
      if (selectedFile) {
        setAnalyzingFile(true);
        const fileData = new FormData();
        fileData.append("file", selectedFile);
        const analyzeRes = await api.post("/study/analyze", fileData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        if (analyzeRes.data.success && analyzeRes.data.analysis) {
          documentText = JSON.stringify(analyzeRes.data.analysis);
        }
        setAnalyzingFile(false);
      }
      setLoadingStage(5);
      const res = await api.post("/study-planner/generate", { ...formData, documentText });
      if (res.data.success) {
        setLoadingStage(6);
        setTimeout(async () => {
          clearInterval(timer);
          toast.success("AI Study Plan generated successfully!");
          await fetchActivePlan();
          setGenerating(false);
        }, 1200);
      } else {
        clearInterval(timer);
        toast.error(res.data.error || "AI Plan generation failed. Please try again.");
        setGenerating(false);
      }
    } catch (error) {
      clearInterval(timer);
      console.error(error);
      toast.error("AI Plan generation failed. Please try again.");
      setGenerating(false);
    }
  };

  const handleExport = async (type: string = "PDF") => {
    if (!activePlan) return toast.error("No study plan to export.");
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const marginX = 14;
      let y = 18;

      // Top Header Accent Banner
      doc.setFillColor(245, 158, 11);
      doc.rect(marginX, y, 182, 8, "F");

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("ADYAPAN AI  •  STUDY PLAN REPORT", marginX + 4, y + 5.5);

      y += 16;

      // Plan Title
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(activePlan.title, marginX, y);

      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);

      const examDateStr = activePlan.examDate
        ? new Date(activePlan.examDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : "Not Set";
      doc.text(`Study Mode: ${activePlan.studyMode}   |   Target Date: ${examDateStr}   |   Target Score: ${activePlan.targetScore}`, marginX, y);

      y += 8;

      // Overview Key Metrics Card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, y, 182, 22, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);

      const statY = y + 8.5;
      doc.text(`Completion: ${activePlan.completionPercentage}%`, marginX + 6, statY);
      doc.text(`Daily Commitment: ${activePlan.dailyHours} hrs/day`, marginX + 54, statY);
      doc.text(`Streak: ${activePlan.streak} Days`, marginX + 114, statY);
      doc.text(`Days Left: ${activePlan.daysRemaining}`, marginX + 152, statY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const subStatY = y + 16.5;
      doc.text(`Success Rate: ${activePlan.successProbability}`, marginX + 6, subStatY);
      if (activePlan.workloadAnalysis) {
        doc.text(`Burnout Risk: ${activePlan.workloadAnalysis.burnoutRisk || 'Low'}`, marginX + 54, subStatY);
        doc.text(`Daily Workload: ${activePlan.workloadAnalysis.dailyWorkload || 'Balanced'}`, marginX + 114, subStatY);
      }

      y += 28;

      // Scheduled Tasks Section
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("Scheduled Study Tasks", marginX, y);

      y += 3.5;
      doc.setDrawColor(245, 158, 11);
      doc.setLineWidth(0.6);
      doc.line(marginX, y, marginX + 182, y);

      y += 6;

      if (tasks.length === 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(100, 116, 139);
        doc.text("No specific study tasks scheduled yet.", marginX, y);
        y += 10;
      } else {
        // Table Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);

        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, y - 3.5, 182, 6, "F");
        doc.text("#", marginX + 2, y + 0.5);
        doc.text("Status", marginX + 10, y + 0.5);
        doc.text("Topic / Module", marginX + 34, y + 0.5);
        doc.text("Priority", marginX + 132, y + 0.5);
        doc.text("Est. Time", marginX + 160, y + 0.5);

        y += 6;
        doc.setFont("helvetica", "normal");

        tasks.forEach((t, i) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          const isDone = t.status === "Completed";
          
          doc.setFontSize(8.5);
          doc.setTextColor(isDone ? 16 : 15, isDone ? 185 : 23, isDone ? 129 : 42);
          doc.text(`${i + 1}`, marginX + 2, y);
          doc.text(isDone ? "[DONE]" : "[PENDING]", marginX + 10, y);

          doc.setTextColor(15, 23, 42);
          const topicLines = doc.splitTextToSize(t.topicName, 92);
          doc.text(topicLines[0], marginX + 34, y);

          doc.setTextColor(t.priority === "High" ? 239 : 71, t.priority === "High" ? 68 : 85, t.priority === "High" ? 68 : 105);
          doc.text(t.priority || "Medium", marginX + 132, y);

          doc.setTextColor(71, 85, 105);
          doc.text(`${t.estimatedTime || 30} mins`, marginX + 160, y);

          y += 6.5;
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(marginX, y - 4.5, marginX + 182, y - 4.5);
        });
      }

      // Today's Revisions Section
      if (todayRevisions.length > 0) {
        if (y > 235) { doc.addPage(); y = 20; } else { y += 6; }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Spaced Repetition & Revisions Due", marginX, y);

        y += 3.5;
        doc.setDrawColor(139, 92, 246);
        doc.setLineWidth(0.6);
        doc.line(marginX, y, marginX + 182, y);

        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        todayRevisions.forEach((r: any) => {
          if (y > 270) { doc.addPage(); y = 20; }
          doc.text(`• ${r.title || r.topicName} — Revision due (${r.scheduledDate || 'Today'})`, marginX + 2, y);
          y += 5.5;
        });
      }

      // Add Page Numbers to Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Adyapan AI Study Planner  •  Page ${i} of ${totalPages}`, marginX, 287);
      }

      const fileName = `${activePlan.title.replace(/[^a-zA-Z0-9]/g, "_")}_study_plan.pdf`;
      doc.save(fileName);
      toast.success("Study plan exported as PDF!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF export.");
    }
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth(prev => {
      const copy = new Date(prev);
      copy.setMonth(prev.getMonth() + (direction === "prev" ? -1 : 1));
      return copy;
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysCount; i++) days.push(new Date(year, month, i));
    return days;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`.sp-scroll { scrollbar-width: none; -ms-overflow-style: none; } .sp-scroll::-webkit-scrollbar { display: none; }`}</style>

      {/* HEADER */}
      <div className="flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between pb-3 mb-3 gap-4" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <div className="flex items-center gap-2.5">
          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 280, damping: 18 }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
            <CalendarIcon size={18} style={{ color: "#000" }} />
          </motion.div>
          <div>
            <motion.h1 initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="text-base font-extrabold leading-tight" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Study Planner</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-xs leading-tight" style={{ color: c.textMuted }}>AI-powered spaced repetition study schedules</motion.p>
          </div>
        </div>

        {/* Tab Switcher inside the Header */}
        <div className="flex items-center gap-2 px-1 py-1 rounded-xl bg-white/[0.02] border border-white/5 relative z-20">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("planner")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
            style={{
              background: activeTab === "planner" ? c.amberBg : "transparent",
              color: activeTab === "planner" ? c.amber : c.textSec,
              border: `1px solid ${activeTab === "planner" ? c.amberBorder : "transparent"}`,
            }}
          >
            <CalendarIcon size={12} />
            Study Plan
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab("weak-topics")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all"
            style={{
              background: activeTab === "weak-topics" ? "rgba(244,63,94,0.10)" : "transparent",
              color: activeTab === "weak-topics" ? "#f43f5e" : c.textSec,
              border: `1px solid ${activeTab === "weak-topics" ? "rgba(244,63,94,0.22)" : "transparent"}`,
            }}
          >
            <AlertTriangle size={12} />
            Weak Topics
          </motion.button>
        </div>

        {activePlan && activeTab === "planner" && (
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setActivePlan(null); setTasks([]); }} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
              <Plus size={14} /> New Plan
            </motion.button>
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={handleReschedule} disabled={rescheduling}
              className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.amber }}>
              {rescheduling ? <RefreshCw className="animate-spin" size={13} /> : <RefreshCw size={13} />} Reschedule
            </motion.button>
          </div>
        )}
      </div>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto sp-scroll" style={{ minHeight: 0 }}>
      {activeTab === "weak-topics" ? (
        <WeakTopicDetectionDashboard />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="flex flex-col antialiased h-full" style={{ color: c.text }}>
      {loadingPlan ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="animate-spin" size={32} style={{ color: c.amber }} />
          <p className="text-sm font-semibold" style={{ color: c.textMuted }}>Synchronizing planner profile...</p>
        </div>
      ) : !activePlan ? (
        <AnimatePresence>
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {generating ? (
              <motion.div key="generating" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 gap-8">
                <div className="relative w-24 h-24">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full" style={{ border: `3px solid transparent`, borderTopColor: c.amber, borderRightColor: c.amberBg }} />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute inset-3 rounded-full" style={{ border: `2px solid transparent`, borderTopColor: "rgba(139,92,246,0.6)", borderLeftColor: "rgba(139,92,246,0.2)" }} />
                  <div className="absolute inset-0 flex items-center justify-center"><BookOpen size={28} style={{ color: c.amber }} /></div>
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Generating Study Plan...</h3>
                  <p className="text-sm" style={{ color: c.textMuted }}>Our cognitive learning priority engine is designing your personalized schedule</p>
                </div>
                <div className="w-full max-w-lg space-y-3 text-left">
                  {loadingStages.map((stage, idx) => {
                    const isActive = idx === loadingStage;
                    const isCompleted = idx < loadingStage;
                    return (
                      <motion.div key={idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: isActive ? c.amberBg : "transparent", border: `1px solid ${isActive ? c.amberBorder : "transparent"}` }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all" style={{ background: isCompleted ? c.green : isActive ? c.amberBg : c.pill, border: `2px solid ${isCompleted ? c.green : isActive ? c.amber : c.border}` }}>
                          {isCompleted && <CheckCircle size={12} style={{ color: "#fff" }} />}
                        </div>
                        <span className={`text-xs font-semibold transition-all ${isActive ? "font-bold" : ""}`} style={{ color: isActive ? c.amber : isCompleted ? c.textSec : c.textMuted }}>{stage}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Config Form */}
                <motion.div className="p-6 rounded-3xl relative overflow-hidden" style={{ background: c.surface, border: `2px solid ${c.border}` }}>
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-4 right-8 w-24 h-24 rounded-full" style={{ opacity: c.isDark ? 0.05 : 0.08, background: "radial-gradient(circle, #f59e0b, transparent)" }} />
                    <div className="absolute bottom-4 left-8 w-16 h-16 rounded-full" style={{ opacity: c.isDark ? 0.04 : 0.06, background: "radial-gradient(circle, #8b5cf6, transparent)" }} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-lg font-extrabold text-center" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Configure AI Study Plan</h3>
                    <form onSubmit={handleGenerate} className="space-y-4 max-w-xl mx-auto">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: c.textSec }}>Exam / Subject Title</label>
                        <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })}
                          placeholder="e.g. Machine Learning Mid-Term or AWS Solutions Architect"
                          className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold" style={{ color: c.textSec }}>Target Exam Date</label>
                          <input type="date" value={formData.examDate} onChange={e => setFormData({ ...formData, examDate: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold" style={{ color: c.textSec }}>Daily Study Hours</label>
                          <input type="number" min="1" max="12" value={formData.dailyHours} onChange={e => setFormData({ ...formData, dailyHours: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold" style={{ color: c.textSec }}>Target Score</label>
                          <select value={formData.targetScore} onChange={e => setFormData({ ...formData, targetScore: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none appearance-none" style={{ background: c.isDark ? "#121214" : "#ffffff", border: `1px solid ${c.border}`, color: c.text }}>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>95%</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>90%</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>85%</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>80%</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>75%</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold" style={{ color: c.textSec }}>Study Mode</label>
                          <select value={formData.studyMode} onChange={e => setFormData({ ...formData, studyMode: e.target.value })}
                            className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none appearance-none" style={{ background: c.isDark ? "#121214" : "#ffffff", border: `1px solid ${c.border}`, color: c.text }}>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Exam Preparation</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Interview Preparation</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Quick Revision</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Deep Learning</option>
                            <option style={{ background: c.isDark ? "#121214" : "#ffffff", color: c.text }}>Placement Preparation</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: c.textSec }}>Upload Study Material (Optional)</label>
                        <div className="rounded-2xl p-5 text-center cursor-pointer transition-all relative" style={{ background: c.inputBg, border: `2px dashed ${c.border}` }}>
                          <input type="file" accept=".pdf,.txt,.md,.markdown" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <div className="flex flex-col items-center justify-center gap-2">
                            <UploadCloud size={24} style={{ color: c.amber }} />
                            <span className="text-xs font-bold" style={{ color: c.textSec }}>{selectedFile ? selectedFile.name : "Drag or drop file here"}</span>
                            <span className="text-[10px]" style={{ color: c.textMuted }}>Supports PDF, TXT, Markdown up to 15MB</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold" style={{ color: c.textSec }}>Custom Topics (Optional)</label>
                        <textarea rows={2} value={formData.customTopics} onChange={e => setFormData({ ...formData, customTopics: e.target.value })}
                          placeholder="e.g. CPU Scheduling, Deadlocks, SQL Joins, TCP/IP basics..."
                          className="w-full rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none resize-none" style={{ background: c.inputBg, border: `1px solid ${c.border}`, color: c.text }} />
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit"
                        className="w-full py-2.5 rounded-xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all" style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}>
                        <Sparkles size={16} /> Generate Study Plan
                      </motion.button>
                    </form>
                  </div>
                </motion.div>

                {/* How It Works */}
                <div>
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Zap size={15} style={{ color: c.amber }} /> How It Works</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { step: "01", title: "Configure", desc: "Set your exam goal, study hours, and upload material for AI analysis.", icon: <BookOpen size={18} style={{ color: c.amber }} /> },
                      { step: "02", title: "AI Schedules", desc: "Our engine creates a spaced repetition plan with smart workload balancing.", icon: <CalendarIcon size={18} style={{ color: "#a78bfa" }} /> },
                      { step: "03", title: "Track & Adapt", desc: "Complete tasks, get revision reminders, and reschedule with one click.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
                    ].map((item, i) => (
                      <motion.div key={item.step} custom={i} variants={fadeUp} initial="hidden" animate="visible" whileHover={{ y: -4, scale: 1.01 }} className="p-5 rounded-2xl relative overflow-hidden group transition-all" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.surface, border: `1px solid ${c.border}` }}>{item.icon}</div>
                          <div><span className="text-[10px] font-black uppercase tracking-widest block" style={{ color: c.amber }}>Step {item.step}</span><h4 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>{item.title}</h4></div>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: c.textSec }}>{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <motion.div variants={fadeUp} custom={3} initial="hidden" animate="visible" className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                  <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: c.text }}><Star size={14} style={{ color: c.amber }} /> Features</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {["Spaced Repetition", "Smart Rescheduling", "Calendar Overview", "Today's Tasks", "AI Recommendations", "Progress Tracking"].map((feat, i) => (
                      <motion.div key={feat} custom={i} variants={scaleIn} initial="hidden" animate="visible" className="flex items-center gap-2 text-sm" style={{ color: c.textSec }}>
                        <CheckCircle size={14} style={{ color: c.amber }} className="shrink-0" />
                        <span>{feat}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        /* ─── ACTIVE PLAN ─── */
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Banner */}
          <motion.div variants={scaleIn} initial="hidden" animate="visible" className="p-5 rounded-2xl" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full" style={{ background: c.amberActive, color: c.amber }}>{activePlan.studyMode}</span>
                  {activePlan.daysRemaining <= 5 && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Critical</span>
                  )}
                </div>
                <h1 className="text-lg font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>{activePlan.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-xs font-semibold" style={{ color: c.textMuted }}>
                  <span className="flex items-center gap-1"><CalendarIcon size={12} /> {activePlan.examDate ? new Date(activePlan.examDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : "No date"}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {activePlan.dailyHours} hrs/day</span>
                  <span className="flex items-center gap-1"><Star size={12} /> Target: {activePlan.targetScore}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => handleExport("PDF")}
                  className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textSec }}>
                  <Download size={13} /> Export
                </motion.button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={handleReschedule} disabled={rescheduling}
                  className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}`, color: c.amber }}>
                  {rescheduling ? <RefreshCw className="animate-spin" size={13} /> : <RefreshCw size={13} />} Reschedule
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Streak", value: `${activePlan.streak}`, icon: <Flame size={16} style={{ color: c.amber }} />, suffix: "days", color: c.amber },
              { label: "Completion", value: `${activePlan.completionPercentage}%`, icon: <CheckCircle size={16} style={{ color: c.green }} />, suffix: "done", color: c.green },
              { label: "Success Rate", value: activePlan.successProbability, icon: <Award size={16} style={{ color: "#a78bfa" }} />, suffix: "projected", color: "#a78bfa" },
              { label: "Days Left", value: `${activePlan.daysRemaining}`, icon: <Clock size={16} style={{ color: "#22d3ee" }} />, suffix: "remaining", color: "#22d3ee" },
            ].map((stat, i) => (
              <motion.div key={stat.label} custom={i} variants={scaleIn} className="p-4 rounded-xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2 mb-2">
                  {stat.icon}
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: c.textMuted }}>{stat.label}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-xl font-extrabold" style={{ color: stat.color }}>{stat.value}</span>
                  <span className="text-[9px] font-bold" style={{ color: c.textMuted }}>{stat.suffix}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Today's Tasks */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ListTodo size={16} style={{ color: c.amber }} />
                    <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Today&apos;s Tasks</h3>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: c.textMuted }}>{todayTasks.length} tasks</span>
                </div>
                {todayTasks.length === 0 ? (
                  <div className="text-center py-6 text-xs" style={{ color: c.textMuted, border: `1px dashed ${c.border}`, borderRadius: 12 }}>
                    No tasks scheduled for today. Take a quick practice test or revise weak topics!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayTasks.map(t => {
                      const isDone = t.status === "Completed";
                      return (
                        <motion.div key={t.id} whileHover={{ scale: 1.01 }} className="flex items-center justify-between p-3 rounded-xl transition-all" style={{ background: isDone ? c.greenBg : c.surface, border: `1px solid ${isDone ? c.green : c.border}` }}>
                          <div className="flex items-center gap-3 min-w-0">
                            <button onClick={() => handleToggleTask(t.id, t.status)} className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all" style={{ background: isDone ? c.green : "transparent", border: `2px solid ${isDone ? c.green : c.border}` }}>
                              {isDone && <CheckCircle size={12} style={{ color: "#fff" }} />}
                            </button>
                            <div className="min-w-0">
                              <span className={`text-sm font-semibold ${isDone ? "line-through" : ""}`} style={{ color: isDone ? c.textMuted : c.text }}>{t.topicName}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: t.priority === "High" ? "rgba(239,68,68,0.1)" : c.amberBg, color: t.priority === "High" ? "#ef4444" : c.amber }}>{t.priority}</span>
                                <span className="text-[9px]" style={{ color: c.textMuted }}><Clock size={8} className="inline" /> {t.estimatedTime} min</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                {todayRevisions.length > 0 && (
                  <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${c.divider}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-[10px] font-black uppercase tracking-wider" style={{ color: c.amber }}>Spaced Repetition</h4>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amberBg, color: c.amber }}>Review queue</span>
                    </div>
                    <div className="space-y-1.5">
                      {todayRevisions.map(rev => (
                        <div key={rev.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: c.amberBg, border: `1px solid ${c.amberBorder}` }}>
                          <span className="text-xs font-semibold" style={{ color: c.text }}>{rev.topicName}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: c.amberActive, color: c.amber }}>{rev.revisionType}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Calendar */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={16} style={{ color: c.amber }} />
                    <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Monthly Roadmap</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleMonthChange("prev")} className="p-1 rounded-lg" style={{ color: c.textMuted }}><ChevronLeft size={14} /></motion.button>
                    <span className="text-xs font-bold" style={{ color: c.text }}>{currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleMonthChange("next")} className="p-1 rounded-lg" style={{ color: c.textMuted }}><ChevronRight size={14} /></motion.button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                    <span key={d} className="text-[9px] font-black uppercase" style={{ color: c.textMuted }}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth(currentMonth).map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="aspect-square opacity-0" />;
                    const dayStr = day.toISOString().split("T")[0];
                    const dayEvents = calendarEvents.filter(e => e.date === dayStr);
                    const hasStudy = dayEvents.some(e => e.type === "study");
                    const hasRev = dayEvents.some(e => e.type === "revision");
                    const isSelected = selectedDate?.toDateString() === day.toDateString();
                    const isToday = new Date().toDateString() === day.toDateString();
                    return (
                      <motion.button key={dayStr} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDate(day)} className="aspect-square rounded-xl flex flex-col items-center justify-between p-1 text-xs relative transition-all" style={{ background: isSelected ? c.amber : isToday ? c.amberBg : c.surface, border: `1px solid ${isSelected ? c.amber : isToday ? c.amberBorder : c.border}` }}>
                        <span className="font-extrabold" style={{ color: isSelected ? "#000" : c.text }}>{day.getDate()}</span>
                        <div className="flex gap-0.5 justify-center mb-0.5 w-full">
                          {hasStudy && <span className="w-1 h-1 rounded-full" style={{ background: isSelected ? "#000" : c.amber }} />}
                          {hasRev && <span className="w-1 h-1 rounded-full" style={{ background: isSelected ? "#000" : c.amber }} />}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
                {selectedDate && (
                  <div className="mt-3 p-3 rounded-xl" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                    <h4 className="text-xs font-extrabold mb-2" style={{ color: c.amber }}>Scheduled on {selectedDate.toLocaleDateString(undefined, {month: 'long', day: 'numeric'})}</h4>
                    {(() => {
                      const selStr = selectedDate.toISOString().split("T")[0];
                      const selEvents = calendarEvents.filter(e => e.date === selStr);
                      if (selEvents.length === 0) return <p className="text-[11px]" style={{ color: c.textMuted }}>No scheduled sessions.</p>;
                      return <div className="space-y-1">
                        {selEvents.map(e => (
                          <div key={e.id} className="flex items-center justify-between text-xs font-semibold" style={{ color: c.textSec }}>
                            <span>{e.title}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.amberBg, color: c.amber }}>{e.status}</span>
                          </div>
                        ))}
                      </div>;
                    })()}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Level Progress */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1} className="p-5 rounded-2xl text-center" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="w-16 h-16 mx-auto relative flex items-center justify-center mb-3">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full" style={{ border: `3px dashed ${c.amberBorder}` }} />
                  <Award size={28} style={{ color: c.amber }} />
                </div>
                <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Level Progress</h3>
                <p className="text-[10px] mb-3" style={{ color: c.textMuted }}>Scholar XP</p>
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-xs font-extrabold">
                    <span style={{ color: c.amber }}>Lv.{Math.round(activePlan.completionPercentage / 15) + 1}</span>
                    <span style={{ color: c.textSec }}>{activePlan.completionPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: c.pill }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${activePlan.completionPercentage}%` }} transition={{ duration: 1 }} className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #f59e0b, #d97706)" }} />
                  </div>
                </div>
              </motion.div>

              {/* Workload Analysis */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2} className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarRange size={16} style={{ color: c.amber }} />
                  <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>Workload</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Today's Intensity", value: activePlan.workloadAnalysis.dailyWorkload, color: activePlan.workloadAnalysis.dailyWorkload === "High" ? "#ef4444" : activePlan.workloadAnalysis.dailyWorkload === "Moderate" ? c.amber : c.green },
                    { label: "Burnout Risk", value: activePlan.workloadAnalysis.burnoutRisk, color: activePlan.workloadAnalysis.burnoutRisk === "High" ? "#ef4444" : activePlan.workloadAnalysis.burnoutRisk === "Moderate" ? c.amber : c.green },
                    { label: "Capacity", value: activePlan.workloadAnalysis.learningCapacity, color: c.amber },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center text-sm pb-2" style={{ borderBottom: `1px solid ${c.divider}` }}>
                      <span style={{ color: c.textMuted, fontWeight: 600 }}>{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 800 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* AI Suggested Tasks */}
              <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="p-5 rounded-2xl" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} style={{ color: c.amber }} />
                  <h3 className="text-sm font-extrabold" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>AI Suggested Tasks</h3>
                </div>
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <motion.div key={index} custom={index} variants={slideRight} initial="hidden" animate="visible" className="p-3 rounded-xl" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: c.amberBg, color: c.amber }}>{rec.type}</span>
                        <span className="text-[9px] font-bold" style={{ color: "#ef4444" }}>{rec.priority}</span>
                      </div>
                      <h4 className="text-xs font-extrabold" style={{ color: c.text }}>{rec.title}</h4>
                      <p className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>{rec.reason}</p>
                    </motion.div>
                  ))}
                  {recommendations.length === 0 && (
                    <p className="text-xs" style={{ color: c.textMuted }}>Complete more tasks to get personalized recommendations.</p>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
      </motion.div>
      )}
      </div>
    </motion.div>
  );
}

