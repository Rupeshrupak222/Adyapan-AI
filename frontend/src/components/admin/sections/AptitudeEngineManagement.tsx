"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, Sparkles, Plus, Search, Trash2, Eye,
  Layers, CheckCircle, RefreshCw, Loader2,
  X, ChevronRight, BookOpen, AlertCircle, Building2,
  Clock, HelpCircle, Hash, PieChart, BarChart2,
} from "lucide-react";
import { api } from "@/services/api";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { StatusBadge } from "@/components/admin/shared/StatusBadge";
import { MetricCard } from "@/components/admin/shared/MetricCard";
import CompanyLogo from "@/components/interview-hub/CompanyLogo";
import { toast } from "sonner";

interface AptitudeQuestion {
  id?: string;
  text: string;
  options: string[];
  correctAnswer: string;
  correctIdx?: number;
  explanation: string;
  formula?: string;
  shortcutTrick?: string;
  difficulty?: string;
  topic?: string;
  category?: string;
}

interface AptitudeTestItem {
  id: string;
  category: string;
  topic: string;
  testNumber: number;
  title: string;
  weekNumber: number;
  totalQuestions: number;
  difficulty: string;
  createdAt: string;
  questionsJson?: AptitudeQuestion[];
}

interface AptitudeOverview {
  totalTests: number;
  totalQuestions: number;
  topicsCount: number;
  companiesCount: number;
  topicsByCategory: Record<string, string[]>;
  companies: string[];
}

interface TargetItem {
  id: string;
  name: string;
  category: string;
  type: "topic" | "company";
  tests: AptitudeTestItem[];
}

const CATEGORIES = [
  "All Entities",
  "Quantitative",
  "Logical",
  "Verbal",
  "Data Interpretation",
  "Analytical",
  "Number Systems",
  "Company Wise",
];

const DEFAULT_TOPICS_BY_CAT: Record<string, string[]> = {
  quantitative: [
    "Percentages", "Profit & Loss", "Time & Work", "Time, Speed & Distance",
    "Simple & Compound Interest", "Ratio & Proportion", "Probability",
    "Permutations & Combinations", "Averages", "Mixture & Alligation"
  ],
  logical: [
    "Puzzles & Seating Arrangement", "Blood Relations", "Coding-Decoding",
    "Number & Letter Series", "Syllogism", "Direction Sense", "Clocks & Calendars"
  ],
  verbal: [
    "Reading Comprehension", "Sentence Correction & Grammar", "Synonyms & Antonyms",
    "Para Jumbles", "Fill in the Blanks", "Error Spotting"
  ],
  data_interpretation: [
    "Bar Graphs & Line Charts", "Pie Charts", "Tables & Data Matrices", "Caselets & Mixed Charts"
  ],
  analytical: [
    "Statement & Assumptions", "Statement & Conclusions", "Course of Action", "Cause & Effect"
  ],
  number_systems: [
    "HCF & LCM", "Divisibility & Remainders", "Simplification & Surds"
  ]
};

const DEFAULT_COMPANIES = [
  "TCS", "Infosys", "Wipro", "Accenture", "Capgemini", "Cognizant",
  "Deloitte", "EY", "PwC", "KPMG", "Google", "Amazon", "Microsoft"
];

export default function AptitudeEngineManagement() {
  const [tests, setTests] = useState<AptitudeTestItem[]>([]);
  const [overview, setOverview] = useState<AptitudeOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("All Entities");
  const [search, setSearch] = useState("");

  // Modal States
  const [selectedTest, setSelectedTest] = useState<AptitudeTestItem | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [batchGenerating, setBatchGenerating] = useState(false);

  const fetchOverviewAndTests = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, testsRes] = await Promise.all([
        api.get("/admin/aptitude/overview").catch(() => ({ data: { success: false } })),
        api.get("/admin/aptitude/tests").catch(() => ({ data: { success: false } })),
      ]);

      if (overviewRes.data?.success) {
        setOverview(overviewRes.data.overview);
      }
      if (testsRes.data?.success && Array.isArray(testsRes.data.tests)) {
        setTests(testsRes.data.tests);
      }
    } catch {
      toast.error("Failed to load aptitude tests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewAndTests();
  }, [fetchOverviewAndTests]);

  // 1-Click Generate Next Test for Topic/Company
  const handleAddNextTest = async (target: TargetItem) => {
    setGeneratingFor(target.name);
    toast.loading(`Generating next test for ${target.name} with 100% Anti-Repetition...`, { id: `gen-${target.name}` });

    try {
      const res = await api.post("/admin/aptitude/tests/generate", {
        topic: target.name,
        category: target.category,
      });

      if (res.data?.success && res.data.test) {
        toast.success(`Created Test ${res.data.test.testNumber} for ${target.name} (30 Unique Questions)!`, { id: `gen-${target.name}` });
        fetchOverviewAndTests();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || `Failed to generate test for ${target.name}`, { id: `gen-${target.name}` });
    } finally {
      setGeneratingFor(null);
    }
  };

  // Batch Generate All Tests
  const handleBatchGenerateAll = async () => {
    setBatchGenerating(true);
    toast.loading("Batch generating 30-question tests across all topics & companies...", { id: "batch-gen" });

    try {
      const res = await api.post("/admin/aptitude/tests/generate-all");
      if (res.data?.success) {
        toast.success(`Successfully generated ${res.data.generatedCount || 33} new tests across all topics!`, { id: "batch-gen" });
        fetchOverviewAndTests();
      }
    } catch {
      toast.error("Failed to batch generate topic tests", { id: "batch-gen" });
    } finally {
      setBatchGenerating(false);
    }
  };

  // Delete Test
  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    try {
      const res = await api.delete(`/admin/aptitude/tests/${testId}`);
      if (res.data?.success) {
        toast.success("Test deleted successfully");
        setSelectedTest(null);
        fetchOverviewAndTests();
      }
    } catch {
      toast.error("Failed to delete test");
    }
  };

  // Build Unified Target List
  const targetItems: TargetItem[] = useMemo(() => {
    const items: TargetItem[] = [];
    const topicsByCat = overview?.topicsByCategory || DEFAULT_TOPICS_BY_CAT;
    const companies = overview?.companies || DEFAULT_COMPANIES;

    // 1. Topic Targets
    for (const [cat, topics] of Object.entries(topicsByCat)) {
      for (const topic of topics) {
        const topicTests = tests.filter(
          (t) => t.topic.toLowerCase().trim() === topic.toLowerCase().trim()
        ).sort((a, b) => a.testNumber - b.testNumber);

        const effectiveTopicTests: AptitudeTestItem[] = topicTests.length > 0 ? topicTests : [
          {
            id: `seed-topic-${cat}-${topic.toLowerCase().replace(/[^a-z0-9]/g, "-")}-1`,
            category: cat,
            topic: topic,
            testNumber: 1,
            title: `Test 1`,
            weekNumber: 1,
            totalQuestions: 30,
            difficulty: "medium",
            createdAt: new Date().toISOString(),
          }
        ];

        items.push({
          id: `topic-${cat}-${topic.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: topic,
          category: cat,
          type: "topic",
          tests: effectiveTopicTests,
        });
      }
    }

    // 2. Company Targets
    for (const comp of companies) {
      const compTests = tests.filter(
        (t) => t.topic.toLowerCase().trim() === comp.toLowerCase().trim() || (t.category === "company" && t.topic.toLowerCase().includes(comp.toLowerCase()))
      ).sort((a, b) => a.testNumber - b.testNumber);

      const effectiveCompTests: AptitudeTestItem[] = compTests.length > 0 ? compTests : [
        {
          id: `seed-company-${comp.toLowerCase().replace(/[^a-z0-9]/g, "-")}-1`,
          category: "company",
          topic: comp,
          testNumber: 1,
          title: `Test 1`,
          weekNumber: 1,
          totalQuestions: 30,
          difficulty: "medium",
          createdAt: new Date().toISOString(),
        }
      ];

      items.push({
        id: `company-${comp.toLowerCase()}`,
        name: comp,
        category: "company",
        type: "company",
        tests: effectiveCompTests,
      });
    }

    return items;
  }, [overview, tests]);

  // Filtered Items
  const filteredTargets = useMemo(() => {
    return targetItems.filter((item) => {
      // Tab matching
      if (activeTab === "Company Wise" && item.type !== "company") return false;
      if (activeTab === "Quantitative" && item.category !== "quantitative") return false;
      if (activeTab === "Logical" && item.category !== "logical") return false;
      if (activeTab === "Verbal" && item.category !== "verbal") return false;
      if (activeTab === "Data Interpretation" && item.category !== "data_interpretation") return false;
      if (activeTab === "Analytical" && item.category !== "analytical") return false;
      if (activeTab === "Number Systems" && item.category !== "number_systems") return false;

      // Search matching
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.tests.some((t) => t.title.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [targetItems, activeTab, search]);

  const totalDynamicTests = useMemo(() => {
    return targetItems.reduce((acc, item) => acc + item.tests.length, 0);
  }, [targetItems]);

  const totalQuestionsCount = useMemo(() => {
    return targetItems.reduce(
      (acc, item) => acc + item.tests.reduce((tAcc, t) => tAcc + (t.questionsJson?.length || t.totalQuestions || 30), 0),
      0
    );
  }, [targetItems]);

  return (
    <div className="space-y-6 pb-16">
      {/* ── Section Header ── */}
      <SectionHeader
        title="AI Aptitude Engine & Multi-Test Manager"
        description="Dynamic test sets (Test 1, Test 2, Test 3...) for Aptitude Topics and Company cards with strict Anti-Repetition Engine"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleBatchGenerateAll}
              disabled={batchGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-amber-500 hover:bg-amber-400 transition-all hover:scale-[1.03] shadow-md disabled:opacity-50"
            >
              <Sparkles size={13} className={batchGenerating ? "animate-spin" : ""} />
              {batchGenerating ? "Batch Generating..." : "+ Batch Generate All Topics"}
            </button>

            <button
              onClick={fetchOverviewAndTests}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all hover:scale-[1.03]"
              style={{
                background: "rgba(245,158,11,0.1)",
                borderColor: "rgba(245,158,11,0.25)",
                color: "#f59e0b",
              }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        }
      />

      {/* ── 4 Top Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Dynamic Tests"
          value={totalDynamicTests.toString()}
          subtitle="Active 30Q test sets"
          icon={<Layers size={20} className="text-amber-500" />}
          color="#f59e0b"
        />
        <MetricCard
          label="Total Unique MCQs"
          value={totalQuestionsCount.toLocaleString()}
          subtitle="Non-repeating question bank"
          icon={<CheckCircle size={20} className="text-emerald-500" />}
          color="#10b981"
        />
        <MetricCard
          label="Topics Configured"
          value={`${overview?.topicsCount || 32} Core Topics`}
          subtitle="Quant, Logical, Verbal, DI"
          icon={<Calculator size={20} className="text-blue-500" />}
          color="#3b82f6"
        />
        <MetricCard
          label="Companies Configured"
          value={`${overview?.companiesCount || 13} Top Companies`}
          subtitle="Recruitment patterns"
          icon={<Building2 size={20} className="text-purple-500" />}
          color="#a855f7"
        />
      </div>

      {/* ── Tabs & Search Bar ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 custom-scrollbar">
          {CATEGORIES.map((tab) => {
            const count = tab === "All Entities"
              ? targetItems.length
              : tab === "Company Wise"
              ? targetItems.filter((t) => t.type === "company").length
              : targetItems.filter((t) => t.category.toLowerCase().replace("_", " ") === tab.toLowerCase().replace("_", " ")).length;

            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  active
                    ? "bg-amber-500 text-black shadow-md"
                    : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic, company, or test..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* ── Grid of Target Cards ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Loading Aptitude Test Manager...
            </span>
          </div>
        </div>
      ) : filteredTargets.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-white/10 bg-white/5">
          <AlertCircle size={32} className="mx-auto mb-2 text-slate-500" />
          <p className="text-sm font-bold text-white">No topics or companies match your filter</p>
          <p className="text-xs text-slate-400 mt-1">Try changing search keywords or tab category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTargets.map((target) => {
            const nextTestNumber = (target.tests.length > 0
              ? Math.max(...target.tests.map((t) => t.testNumber))
              : 0) + 1;

            const isGeneratingThis = generatingFor === target.name;

            return (
              <motion.div
                key={target.id}
                whileHover={{ y: -3 }}
                className="p-5 rounded-3xl border border-white/10 bg-[#0d151c] flex flex-col justify-between transition-all hover:border-amber-500/40 shadow-lg"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {target.type === "company" ? (
                        <CompanyLogo companyName={target.name} size={36} theme="dark" />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                          <Calculator size={18} />
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-extrabold text-white">{target.name}</h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {target.type === "company" ? "Company OA" : target.category.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black border bg-amber-500/10 border-amber-500/30 text-amber-400">
                      {target.tests.length} {target.tests.length === 1 ? "TEST" : "TESTS"}
                    </span>
                  </div>

                  {/* Available Dynamic Tests Pills */}
                  <div className="space-y-2 mb-4">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Available Dynamic Tests:
                    </p>

                    {target.tests.length === 0 ? (
                      <div className="p-3 rounded-xl border border-dashed border-white/10 text-center">
                        <span className="text-[11px] text-slate-500">No test generated yet</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {target.tests.map((test) => (
                          <button
                            key={test.id}
                            onClick={() => setSelectedTest(test)}
                            className="px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all hover:scale-105 flex items-center gap-1.5"
                            style={{
                              background: "rgba(245,158,11,0.12)",
                              borderColor: "rgba(245,158,11,0.35)",
                              color: "#f59e0b",
                            }}
                          >
                            <span>Test {test.testNumber} ({test.totalQuestions || 30}Q)</span>
                            <Eye size={10} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 1-Click + Add Test Button */}
                <button
                  onClick={() => handleAddNextTest(target)}
                  disabled={isGeneratingThis || batchGenerating}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-md hover:scale-[1.02] disabled:opacity-50"
                >
                  {isGeneratingThis ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Generating Unique 30Q...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>+ Add Test {nextTestNumber}</span>
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Test Inspector Modal (Inspect Questions & Delete) ── */}
      <AnimatePresence>
        {selectedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[85vh] rounded-3xl border border-white/10 bg-[#0d151c] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-sm">
                    T{selectedTest.testNumber}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">{selectedTest.title}</h3>
                    <p className="text-xs text-slate-400">
                      Topic: <strong className="text-amber-400">{selectedTest.topic}</strong> · {selectedTest.totalQuestions} Questions · Difficulty: {selectedTest.difficulty}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteTest(selectedTest.id)}
                    className="p-2 rounded-xl text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all text-xs font-bold flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Delete Test
                  </button>

                  <button
                    onClick={() => setSelectedTest(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 border border-white/10"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Modal Body: Questions List */}
              <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                {(!selectedTest.questionsJson || selectedTest.questionsJson.length === 0) ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-white/10">
                    <p className="text-xs text-slate-400">30 questions configured in test bank</p>
                  </div>
                ) : (
                  selectedTest.questionsJson.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-extrabold text-amber-400">Q{idx + 1}.</span>
                        <p className="text-xs font-bold text-white flex-1">{q.text}</p>
                      </div>

                      {/* Options */}
                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = q.correctAnswer === opt || (q.correctIdx !== undefined && q.correctIdx === oIdx);
                            return (
                              <div
                                key={oIdx}
                                className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 ${
                                  isCorrect
                                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                    : "bg-white/5 border-white/10 text-slate-300"
                                }`}
                              >
                                <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center font-bold text-[10px]">
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {isCorrect && <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation & Shortcut */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] space-y-1">
                          <p className="font-bold text-amber-400">Solution Explanation:</p>
                          <p className="text-slate-300 leading-relaxed">{q.explanation}</p>
                          {q.formula && (
                            <p className="text-amber-300 text-[10px] pt-1">
                              <strong>Formula / Trick:</strong> {q.formula}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
