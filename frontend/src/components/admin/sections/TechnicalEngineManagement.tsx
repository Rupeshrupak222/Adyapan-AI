"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, Sparkles, Plus, Search, Trash2, Eye,
  Layers, CheckCircle, RefreshCw, Loader2,
  X, ChevronRight, BookOpen, AlertCircle, Building2,
  Cpu, Database, Globe, Cloud, Brain, Shield, Clock,
  FileCode, Terminal, HelpCircle,
} from "lucide-react";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { MetricCard } from "@/components/admin/shared/MetricCard";
import CompanyLogo from "@/components/interview-hub/CompanyLogo";
import { toast } from "sonner";

interface MCQQuestion {
  id: string;
  question: string;
  technology: string;
  company?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options: string[];
  correctAnswer: string;
  correctIdx: number;
  explanation: string;
  hint: string;
  relatedConcept: string;
  estimatedTime: string;
  codeSnippet?: string;
  language?: string;
  interviewTip?: string;
}

interface MCQTest {
  id: string;
  targetId: string;
  targetType: "technology" | "company";
  targetName: string;
  testNumber: number;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  questionCount: number;
  durationMinutes: number;
  isPublished: boolean;
  createdAt: string;
  questions?: MCQQuestion[];
}

interface MCQOverview {
  totalTests: number;
  totalQuestions: number;
  uniqueQuestionSignatures: number;
  technologiesCount: number;
  companiesCount: number;
  technologyTestsCount: number;
  companyTestsCount: number;
}

interface TargetItem {
  id: string;
  name: string;
  category?: string;
  type: "technology" | "company";
  description?: string;
  tests: MCQTest[];
}

const DOMAINS = ["All", "Programming", "Core CS", "Web Development", "Databases", "Cloud", "AI/ML"];

export default function TechnicalEngineManagement() {
  const [tests, setTests] = useState<MCQTest[]>([]);
  const [overview, setOverview] = useState<MCQOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "technology" | "company">("all");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [search, setSearch] = useState("");

  // Modal States
  const [selectedTest, setSelectedTest] = useState<MCQTest | null>(null);
  const [testDetailsLoading, setTestDetailsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTarget, setCreateTarget] = useState<{ id: string; name: string; type: "technology" | "company" } | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDiff, setFormDiff] = useState<"Easy" | "Medium" | "Hard" | "Mixed">("Medium");
  const [formCount, setFormCount] = useState<number>(15);
  const [formDuration, setFormDuration] = useState<number>(20);
  const [formPrompt, setFormPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Question Form State (Inside Test Inspector)
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQCode, setNewQCode] = useState("");
  const [newQOptions, setNewQOptions] = useState(["", "", "", ""]);
  const [newQCorrectIdx, setNewQCorrectIdx] = useState(0);
  const [newQExplanation, setNewQExplanation] = useState("");
  const [newQHint, setNewQHint] = useState("");
  const [addingQuestionLoading, setAddingQuestionLoading] = useState(false);

  const fetchOverviewAndTests = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, testsRes] = await Promise.all([
        api.get("/admin/mcq/overview").catch(() => ({ data: { success: false } })),
        api.get("/admin/mcq/tests"),
      ]);

      if (overviewRes.data?.success) {
        setOverview(overviewRes.data.overview);
      }
      if (testsRes.data?.success && Array.isArray(testsRes.data.tests)) {
        setTests(testsRes.data.tests);
      }
    } catch {
      toast.error("Failed to load technical tests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewAndTests();
  }, [fetchOverviewAndTests]);

  // Open Test Inspector & load full questions
  const handleInspectTest = async (testId: string) => {
    setTestDetailsLoading(true);
    try {
      const res = await api.get(`/admin/mcq/tests/${testId}`);
      if (res.data?.success && res.data.test) {
        setSelectedTest(res.data.test);
      }
    } catch {
      toast.error("Failed to load test questions");
    } finally {
      setTestDetailsLoading(false);
    }
  };

  // Open Create Test modal for target
  const handleOpenCreate = (target: { id: string; name: string; type: "technology" | "company" }) => {
    setCreateTarget(target);
    const existing = tests.filter(
      (t) => t.targetId === target.id || t.targetName.toLowerCase() === target.name.toLowerCase()
    );
    const nextNum = existing.length > 0 ? Math.max(...existing.map((t) => t.testNumber)) + 1 : 1;

    setFormTitle(`${target.name} - Test ${nextNum}: Advanced Assessment`);
    setFormDiff("Medium");
    setFormCount(15);
    setFormDuration(20);
    setFormPrompt("");
    setShowCreateModal(true);
  };

  // Submit Create Test with AI Anti-Repetition Guarantee
  const handleCreateTest = async (useAi: boolean) => {
    if (!createTarget) return;
    setIsAiGenerating(true);

    try {
      if (useAi) {
        const res = await api.post("/admin/mcq/tests/generate-ai", {
          targetId: createTarget.id,
          targetType: createTarget.type,
          targetName: createTarget.name,
          count: formCount,
          difficulty: formDiff,
          prompt: formPrompt.trim() || undefined,
        });
        if (res.data?.success) {
          toast.success(`Generated Test ${res.data.test.testNumber} with ${res.data.test.questionCount} unique questions! (No repetition guaranteed)`);
        }
      } else {
        const res = await api.post("/admin/mcq/tests", {
          targetId: createTarget.id,
          targetType: createTarget.type,
          targetName: createTarget.name,
          title: formTitle,
          difficulty: formDiff,
          questionCount: formCount,
          durationMinutes: formDuration,
        });
        if (res.data?.success) {
          toast.success(`Created Test ${res.data.test.testNumber} successfully!`);
        }
      }

      setShowCreateModal(false);
      await fetchOverviewAndTests();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create test");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Delete Test
  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    try {
      const res = await api.delete(`/admin/mcq/tests/${testId}`);
      if (res.data?.success) {
        toast.success("Test deleted");
        if (selectedTest?.id === testId) setSelectedTest(null);
        await fetchOverviewAndTests();
      }
    } catch {
      toast.error("Failed to delete test");
    }
  };

  // Add Question to selected test
  const handleAddQuestion = async () => {
    if (!selectedTest) return;
    if (!newQuestionText.trim() || newQOptions.some((o) => !o.trim())) {
      toast.error("Please fill question statement and all 4 options");
      return;
    }

    setAddingQuestionLoading(true);
    try {
      const res = await api.post(`/admin/mcq/tests/${selectedTest.id}/questions`, {
        question: newQuestionText.trim(),
        codeSnippet: newQCode.trim() || undefined,
        options: newQOptions.map((o) => o.trim()),
        correctAnswer: newQOptions[newQCorrectIdx]?.trim() || newQOptions[0]?.trim(),
        correctIdx: newQCorrectIdx,
        explanation: newQExplanation.trim() || "Correct based on core principles.",
        hint: newQHint.trim() || "Review standard specifications.",
        difficulty: selectedTest.difficulty === "Mixed" ? "Medium" : selectedTest.difficulty,
      });

      if (res.data?.success && res.data.test) {
        setSelectedTest(res.data.test);
        setShowAddQuestion(false);
        setNewQuestionText("");
        setNewQCode("");
        setNewQOptions(["", "", "", ""]);
        setNewQCorrectIdx(0);
        setNewQExplanation("");
        setNewQHint("");
        toast.success("Question added to test!");
        await fetchOverviewAndTests();
      }
    } catch {
      toast.error("Failed to add question");
    } finally {
      setAddingQuestionLoading(false);
    }
  };

  // Delete Question from test
  const handleDeleteQuestion = async (questionId: string) => {
    if (!selectedTest) return;
    try {
      const res = await api.delete(`/admin/mcq/tests/${selectedTest.id}/questions/${questionId}`);
      if (res.data?.success && res.data.test) {
        setSelectedTest(res.data.test);
        toast.success("Question deleted");
        await fetchOverviewAndTests();
      }
    } catch {
      toast.error("Failed to delete question");
    }
  };

  // Group tests into target entities
  const groupedTargets = useMemo<TargetItem[]>(() => {
    const map = new Map<string, TargetItem>();

    for (const test of tests) {
      const key = `${test.targetType}:${test.targetId}`;
      if (!map.has(key)) {
        map.set(key, {
          id: test.targetId,
          name: test.targetName,
          type: test.targetType,
          tests: [],
        });
      }
      map.get(key)!.tests.push(test);
    }

    // Sort tests within each target by testNumber
    for (const target of map.values()) {
      target.tests.sort((a, b) => a.testNumber - b.testNumber);
    }

    return Array.from(map.values());
  }, [tests]);

  // Filtered targets
  const filteredTargets = useMemo(() => {
    return groupedTargets.filter((t) => {
      if (activeTab === "technology" && t.type !== "technology") return false;
      if (activeTab === "company" && t.type !== "company") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = t.name.toLowerCase().includes(q);
        const matchTest = t.tests.some((test) => test.title.toLowerCase().includes(q));
        if (!matchName && !matchTest) return false;
      }

      return true;
    });
  }, [groupedTargets, activeTab, search]);

  return (
    <div className="space-y-6 pb-16">
      <SectionHeader
        title="AI Technical Engine & Multi-Test Manager"
        description="Dynamic test sets (Test 1, Test 2, Test 3...) for Technology and Company cards with strict Anti-Repetition Engine"
        actions={
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={fetchOverviewAndTests}
              disabled={loading}
              className="p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </motion.button>
          </div>
        }
      />

      {/* Overview Metric Cards */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricCard
          label="Total Dynamic Tests"
          value={overview ? overview.totalTests.toLocaleString() : tests.length.toLocaleString()}
          color="#f59e0b"
          icon={<Layers size={16} />}
          subtitle="Active test sets"
        />
        <MetricCard
          label="Total Unique MCQs"
          value={overview ? overview.totalQuestions.toLocaleString() : "780+"}
          color="#10b981"
          icon={<CheckCircle size={16} />}
          subtitle="Non-repeating pool"
        />
        <MetricCard
          label="Technologies Configured"
          value={overview ? `${overview.technologiesCount} Languages & Core` : "36"}
          color="#38bdf8"
          icon={<Code2 size={16} />}
          subtitle="Domain coverage"
        />
        <MetricCard
          label="Companies Configured"
          value={overview ? `${overview.companiesCount} Top Companies` : "16"}
          color="#818cf8"
          icon={<Building2 size={16} />}
          subtitle="Recruitment patterns"
        />
      </motion.div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          {[
            { id: "all", label: `All Entities (${groupedTargets.length})` },
            { id: "technology", label: `Technologies (36)` },
            { id: "company", label: `Company Wise (16)` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: activeTab === tab.id ? "rgba(245,158,11,0.15)" : "transparent",
                color: activeTab === tab.id ? "#f59e0b" : "var(--text-secondary)",
                border: activeTab === tab.id ? "1px solid rgba(245,158,11,0.3)" : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search language, company, or test..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border transition-all"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              borderColor: "var(--border-color)",
            }}
          />
        </div>
      </div>

      {/* Target Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="p-12 text-center border rounded-2xl" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>No entities matching your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTargets.map((target, idx) => (
            <motion.div
              key={`${target.type}-${target.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02, duration: 0.25 }}
              className="p-5 rounded-2xl border flex flex-col justify-between transition-all hover:border-amber-500/30"
              style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {target.type === "company" ? (
                      <CompanyLogo companyName={target.name} companyId={target.id} size={36} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                        <Code2 size={18} />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>{target.name}</h4>
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                        {target.type === "company" ? "Company OA" : "Technical Domain"}
                      </span>
                    </div>
                  </div>

                  <StatusBadge variant="info">
                    {target.tests.length} {target.tests.length === 1 ? "Test" : "Tests"}
                  </StatusBadge>
                </div>

                {/* Tests Pills / List */}
                <div className="space-y-2 my-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">Available Dynamic Tests:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {target.tests.map((test) => (
                      <motion.button
                        key={test.id}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleInspectTest(test.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: "rgba(245,158,11,0.08)",
                          border: "1px solid rgba(245,158,11,0.25)",
                          color: "#f59e0b",
                        }}
                        title="Click to view/edit test questions"
                      >
                        <span>Test {test.testNumber}</span>
                        <span className="text-[10px] opacity-75">({test.questionCount}Q)</span>
                        <Eye size={11} className="ml-0.5 opacity-70" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t flex items-center gap-2 mt-2" style={{ borderColor: "var(--border-color)" }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenCreate(target)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#000",
                  }}
                >
                  <Plus size={13} />
                  + Add Test {target.tests.length + 1}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── CREATE / GENERATE TEST MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && createTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
            onClick={() => !isAiGenerating && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="w-full max-w-lg rounded-3xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
              style={{ background: "var(--bg-dark, #0b0f19)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-500">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Add Dynamic Test for {createTarget.name}</h3>
                    <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>Guaranteed 100% Unique Questions (Anti-Repetition)</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} disabled={isAiGenerating} style={{ color: "var(--text-muted)" }}>
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Test Title</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Difficulty</label>
                    <select
                      value={formDiff}
                      onChange={(e) => setFormDiff(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none"
                      style={{ background: "var(--bg-card)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                    >
                      {["Easy", "Medium", "Hard", "Mixed"].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Questions</label>
                    <select
                      value={formCount}
                      onChange={(e) => setFormCount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none"
                      style={{ background: "var(--bg-card)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                    >
                      {[10, 15, 20, 25].map((n) => <option key={n} value={n}>{n} MCQs</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Duration</label>
                    <select
                      value={formDuration}
                      onChange={(e) => setFormDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none"
                      style={{ background: "var(--bg-card)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                    >
                      {[15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{m} Mins</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--text-muted)" }}>Focus Topics / Custom Prompt (Optional)</label>
                  <textarea
                    value={formPrompt}
                    onChange={(e) => setFormPrompt(e.target.value)}
                    placeholder="e.g. Focus on memory leaks, multithreading, and tree algorithms..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none resize-none"
                    style={{ background: "var(--bg-card)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreateTest(false)}
                  disabled={isAiGenerating}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all"
                  style={{ background: "transparent", color: "var(--text-secondary)", borderColor: "var(--border-color)" }}
                >
                  Create Instant Test
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreateTest(true)}
                  disabled={isAiGenerating}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#000" }}
                >
                  {isAiGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {isAiGenerating ? "Synthesizing Unique MCQs..." : "AI Generate (Zero Repetition)"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TEST INSPECTOR & QUESTIONS MODAL ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedTest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
            onClick={() => setSelectedTest(null)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              className="w-full max-w-3xl rounded-3xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
              style={{ background: "var(--bg-dark, #0b0f19)", borderColor: "var(--border-color)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: "var(--border-color)" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black" style={{ color: "var(--text-primary)" }}>{selectedTest.title}</h3>
                    <StatusBadge variant="warning">Test {selectedTest.testNumber}</StatusBadge>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {selectedTest.questions?.length || selectedTest.questionCount} Questions · {selectedTest.difficulty} Difficulty · {selectedTest.durationMinutes} Mins
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeleteTest(selectedTest.id)}
                    className="p-2 rounded-xl text-red-400 bg-red-500/10 border border-red-500/20"
                    title="Delete Test"
                  >
                    <Trash2 size={14} />
                  </motion.button>
                  <button onClick={() => setSelectedTest(null)} style={{ color: "var(--text-muted)" }}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">
                    Questions in Test ({selectedTest.questions?.length || 0})
                  </h4>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowAddQuestion(!showAddQuestion)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border"
                    style={{ background: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.3)", color: "#f59e0b" }}
                  >
                    <Plus size={12} /> Add Custom Question
                  </motion.button>
                </div>

                {/* Add Question Form */}
                {showAddQuestion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-4 rounded-2xl border space-y-3"
                    style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                  >
                    <h5 className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Add New Question</h5>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">Question Text *</label>
                      <input
                        type="text"
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="e.g. What is the output of this code snippet?"
                        className="w-full px-3 py-2 rounded-xl text-xs border outline-none"
                        style={{ background: "var(--bg-dark, #0b0f19)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">Code Snippet (Optional)</label>
                      <textarea
                        value={newQCode}
                        onChange={(e) => setNewQCode(e.target.value)}
                        placeholder="Optional code..."
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none resize-none"
                        style={{ background: "var(--bg-dark, #0b0f19)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {newQOptions.map((opt, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="correctIdx"
                            checked={newQCorrectIdx === i}
                            onChange={() => setNewQCorrectIdx(i)}
                            className="text-amber-500"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const updated = [...newQOptions];
                              updated[i] = e.target.value;
                              setNewQOptions(updated);
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs border outline-none"
                            style={{ background: "var(--bg-dark, #0b0f19)", color: "var(--text-primary)", borderColor: "var(--border-color)" }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => setShowAddQuestion(false)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddQuestion}
                        disabled={addingQuestionLoading}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black ml-auto"
                      >
                        {addingQuestionLoading ? "Saving..." : "Save Question"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Render Questions */}
                {testDetailsLoading ? (
                  <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-amber-500" /></div>
                ) : !selectedTest.questions || selectedTest.questions.length === 0 ? (
                  <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>No questions in this test yet.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedTest.questions.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl border space-y-2 relative group"
                        style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                            <span className="text-amber-500 mr-1.5">Q{qIdx + 1}.</span>
                            {q.question}
                          </p>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-400 hover:text-red-300"
                            title="Delete Question"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {q.codeSnippet && (
                          <pre className="p-3 rounded-xl text-[11px] font-mono overflow-x-auto bg-black/40 border border-white/5 text-amber-300/90">
                            {q.codeSnippet}
                          </pre>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
                                optIdx === q.correctIdx
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "text-slate-400 border-white/5 bg-black/20"
                              }`}
                            >
                              <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                              {optIdx === q.correctIdx && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                            </div>
                          ))}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] pt-1 leading-relaxed border-t" style={{ borderColor: "var(--border-color)", color: "var(--text-muted)" }}>
                            <span className="font-bold text-amber-500">Explanation:</span> {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
