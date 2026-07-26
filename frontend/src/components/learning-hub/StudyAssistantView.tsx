"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/services/api";
import { useSocket } from "@/context/SocketContext";
import { useTheme } from "@/hooks/useTheme";
import { mkColors } from "@/utils/themeColors";

import { StudyAssistantHeader } from "./study/StudyAssistantHeader";
import { HistorySidebar } from "./study/HistorySidebar";
import { DocumentUploadZone } from "./study/DocumentUploadZone";
import { DocumentUploadingState } from "./study/DocumentUploadingState";
import { DocumentReadyView } from "./study/DocumentReadyView";
import { TopicLearningForm } from "./study/TopicLearningForm";
import { LessonLoadingState } from "./study/LessonLoadingState";
import { LessonViewer } from "./study/LessonViewer";
import { BeginnerLesson } from "./study/BeginnerLesson";
import { IntermediateLesson } from "./study/IntermediateLesson";

interface SubTopic {
  name: string;
  content: string;
}
export interface TopicSummary {
  name: string; overview: string; subtopics?: SubTopic[]; keyConcepts: string[];
  importantPoints: string[]; questions?: string[]; quickRevision: string; keywords: string[];
}
export interface DocStats {
  pages: number; words: number; topicsFound: number; readingTime: string; summaryLength: string;
}
export interface AIInsights {
  mainSubject: string; difficultyLevel: string; estimatedStudyTime: string;
  importantChapters: string[]; repeatedTopics: string[];
}
interface UnifiedConcept { title: string; content: string; sub_concepts?: string[]; tips?: string[]; }
interface UnifiedExample { title: string; scenario: string; code_or_data?: string; explanation?: string; }
interface UnifiedPractice { question: string; guidance?: string; expected_answer?: string; red_flag?: string; }
interface UnifiedQuizQuestion { question: string; options: string[]; answer: string; explanation: string; }
export interface UnifiedLesson {
  learning_goal?: string; estimated_completion_time?: string; lesson_structure?: string[];
  overview: string; why_matters?: string; simple_explanation?: string; real_life_analogy?: string;
  example?: string; key_takeaways?: string[]; mini_quiz?: UnifiedQuizQuestion[];
  key_concepts: UnifiedConcept[]; examples?: UnifiedExample[]; practice_questions?: UnifiedPractice[];
  quiz?: UnifiedQuizQuestion[]; summary?: string;
}

export function StudyAssistantView({ onViewLesson, lessonToView }: {
  onViewLesson?: (data: { topic: string; lesson: UnifiedLesson; duration: string; level: string }) => void
  lessonToView?: { topic: string; lesson: UnifiedLesson; duration: string; level: string }
}) {
  const theme = useTheme();
  const c = mkColors(theme);
  const { socket } = useSocket();

  const [file, setFile] = useState<File | null>(null);
  const [fileDetails, setFileDetails] = useState<{
    name: string; size: string; pages: number; language: string; time: string;
  } | null>(null);
  const [status, setStatus] = useState<"empty" | "uploading" | "processing" | "ready">("empty");
  const [currentStage, setCurrentStage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [revealedTopics, setRevealedTopics] = useState<number>(0);
  const [history, setHistory] = useState<Array<{ name: string; date: string; pages: number; topics: number; analysis: Record<string, any> }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [topicHistory, setTopicHistory] = useState<Array<{ topic: string; date: string; duration: string; level: string; lesson: UnifiedLesson }>>([]);
  const [showTopicHistory, setShowTopicHistory] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    title: string; topics: TopicSummary[]; stats: DocStats; insights: AIInsights;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<"document" | "topic">("document");
  const [inputTopic, setInputTopic] = useState("");
  const [duration, setDuration] = useState<"5m" | "10m" | "20m" | "30m">("10m");
  const [level, setLevel] = useState<"beginner" | "intermediate" | "interview" | "revision">("intermediate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [lessonData, setLessonData] = useState<UnifiedLesson | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
  const [expandedConceptIdx, setExpandedConceptIdx] = useState<number | null>(null);
  const [practiceRevealed, setPracticeRevealed] = useState<Record<number, boolean>>({});
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [scratchpadTab, setScratchpadTab] = useState<"notes" | "takeaways" | "playground">("notes");
  const [notesText, setNotesText] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [playgroundOutput, setPlaygroundOutput] = useState<string | null>(null);
  const [isRunningPlayground, setIsRunningPlayground] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("adyapan-study-history");
      setHistory(stored ? JSON.parse(stored) : []);
    } catch { setHistory([]); }
    try {
      const topicStored = localStorage.getItem("adyapan-topic-history");
      setTopicHistory(topicStored ? JSON.parse(topicStored) : []);
    } catch { setTopicHistory([]); }

    // Pre-fill topic mode and topic name if requested from Learn More
    try {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get("studyMode");
      const urlTopic = params.get("topic");
      const storedPrefill = localStorage.getItem("adyapan-study-topic");

      if (urlMode === "topic" || urlTopic || storedPrefill) {
        setMode("topic");
        const topicName = urlTopic ? decodeURIComponent(urlTopic) : storedPrefill;
        if (topicName) setInputTopic(topicName);
        if (storedPrefill) localStorage.removeItem("adyapan-study-topic");
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (status !== "uploading") return;
    const stages = [
      "📤 Uploading document...",
      "📖 Extracting text content...",
      "🔍 Analyzing document structure...",
      "🧠 Identifying main topics...",
      "✍️ Generating detailed summaries...",
      "💡 Creating key concepts...",
      "📝 Finalizing topic analysis...",
      "⚡ Almost ready...",
    ];
    let idx = 0;
    setCurrentStage(stages[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % stages.length;
      setCurrentStage(stages[idx]);
    }, 6000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status !== "ready" || !summaryData) return;
    const timers = summaryData.topics.map((_, i) =>
      setTimeout(() => setRevealedTopics(prev => Math.max(prev, i + 1)), i * 180)
    );
    return () => timers.forEach(clearTimeout);
  }, [status, summaryData]);

  useEffect(() => {
    if (lessonData && currentTopic) {
      const saved = localStorage.getItem(`adyapan-learn-notes-${currentTopic}`);
      if (saved) setNotesText(saved);
    }
  }, [lessonData, currentTopic]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleFileDrop = async (droppedFile: File) => {
    setFile(droppedFile);
    setFileDetails({ name: droppedFile.name, size: (droppedFile.size / (1024 * 1024)).toFixed(1) + " MB", pages: Math.floor(Math.random() * 80) + 15, language: "English", time: "30-60 seconds" });
    setStatus("uploading");
    try {
      const isBinary = /\.(pdf|docx|doc|pptx|ppt)$/i.test(droppedFile.name);
      let res;
      if (isBinary) {
        const formData = new FormData();
        formData.append("file", droppedFile);
        res = await api.post("/study/analyze", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        });
      } else {
        const reader = new FileReader();
        const fileText = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string || "");
          reader.readAsText(droppedFile);
        });
        res = await api.post("/study/analyze", { documentText: fileText }, { timeout: 120000 });
      }
      if (res.data?.success && res.data?.analysis) {
        const a = res.data.analysis;
        setSummaryData(a);
        setStatus("ready");
        setRevealedTopics(0);
        if (a.topics?.length > 0) setActiveTopic(a.topics[0].name);
        const newItem = { name: droppedFile.name, date: "Just now", pages: a.stats?.pages || 1, topics: a.topics?.length || 0, analysis: a };
        const updated = [newItem, ...history.filter(h => h.name !== droppedFile.name)].slice(0, 10);
        setHistory(updated);
        localStorage.setItem("adyapan-study-history", JSON.stringify(updated));
      } else throw new Error("Invalid response");
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; response?: { data?: { error?: string } } };
      setStatus("empty");
      if (e?.code === "ECONNABORTED" || e?.message?.includes("timeout")) {
        toast.error("Analysis is taking too long. Please try with a shorter document or try again.");
      } else {
        toast.error("Failed to analyze document. Please try again.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFileDrop(e.dataTransfer.files[0]); };
  const handleBrowseFiles = () => fileInputRef.current?.click();
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) handleFileDrop(e.target.files[0]); };

  const handleScrollToTopic = (topicName: string) => {
    setActiveTopic(prev => (prev === topicName ? "" : topicName));
  };

  const handleCopySummary = () => {
    if (!summaryData) return;
    const txt = summaryData.topics.map(t =>
      `${t.name}\n\n${t.overview}\n\nKey Concepts:\n${t.keyConcepts.map(k => `- ${k}`).join("\n")}\n\nImportant Points:\n${t.importantPoints.map(p => `- ${p}`).join("\n")}${t.questions && t.questions.length > 0 ? `\n\nPractice Questions:\n${t.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}` : ""}\n\nQuick Revision:\n${t.quickRevision}`
    ).join("\n\n---\n\n");
    navigator.clipboard.writeText(txt);
    toast.success("Summary copied to clipboard!");
  };

  const handleDownloadPdf = async () => {
    if (!summaryData) {
      toast.error("No analysis data available for PDF export.");
      return;
    }
    setDownloadingPdf(true);
    try {
      const res = await api.post("/study/export/pdf", { analysis: summaryData }, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(summaryData.title || "Document_Analysis").replace(/\s+/g, "_")}_AdyapanAI.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded successfully!");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      console.error("PDF download error:", err);
      toast.error(e?.response?.data?.error || "Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const loadHistoryItem = (item: typeof history[0]) => {
    setFile({ name: item.name } as File);
    setFileDetails({ name: item.name, size: "—", pages: item.pages, language: "English", time: "20 seconds" });
    setStatus("ready"); setSummaryData(item.analysis as any); setRevealedTopics(0);
    if (item.analysis.topics?.length > 0) setActiveTopic(item.analysis.topics[0].name);
    setShowHistory(false);
    setTimeout(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 300);
  };

  const handleNotesChange = (val: string) => {
    setNotesText(val);
    if (lessonData && currentTopic) {
      setIsSavingNotes(true);
      localStorage.setItem(`adyapan-learn-notes-${currentTopic}`, val);
      setTimeout(() => setIsSavingNotes(false), 500);
    }
  };

  const handleImportConcept = (concept: UnifiedConcept) => {
    const divider = notesText ? "\n\n" : "";
    const formatted = `### ${concept.title}\n${concept.content}`;
    handleNotesChange(notesText + divider + formatted);
  };

  const handleImportTakeaway = (takeaway: string) => {
    const divider = notesText ? "\n\n" : "";
    handleNotesChange(notesText + divider + `* ${takeaway}`);
  };

  const handleRunPlayground = () => {
    if (isRunningPlayground) return;
    setIsRunningPlayground(true);
    setPlaygroundOutput("[Compiling and executing simulation...]");
    setTimeout(() => {
      const t = currentTopic.toLowerCase();
      if (t.includes("gradient")) {
        setPlaygroundOutput(`[Running script.py...]\nOld weight: 10.0\nLearning Rate: 0.01\nGradient: 2.5\nNew weight = weight - (learning_rate * gradient)\nNew weight: 9.975\n\nProcess completed successfully.`);
      } else if (t.includes("sql") || t.includes("join")) {
        setPlaygroundOutput(`[Running script.py...]\nExecuting database query...\nINNER JOIN matching rows: 3 returned\n- Order 101 | User A | $250.00\n- Order 102 | User B | $120.50\n- Order 103 | User C | $45.00\n\nProcess completed successfully.`);
      } else {
        setPlaygroundOutput(`[Running script.py...]\nInputs: [0.5, -0.2]\nWeights: [0.8, 0.4]\nBias: -0.1\nWeighted Sum (z): 0.22\nActivation ReLU(z): 0.22\n\nProcess completed successfully.`);
      }
      setIsRunningPlayground(false);
    }, 1000);
  };

  const handleGenerateLesson = (targetTopic: string) => {
    if (!targetTopic.trim() || !socket) return;
    setLessonData(null);
    setTopicError(null);
    setIsGenerating(true);
    setLoadingStep(0);
    setQuizAnswers({});
    setQuizSubmitted({});
    setExpandedConceptIdx(null);
    setPracticeRevealed({});

    const onProgress = (payload: { step: number; status: string }) => {
      setLoadingStep(payload.step);
    };
    const onComplete = (payload: { data: UnifiedLesson }) => {
      socket.off("lesson:progress", onProgress);
      socket.off("lesson:complete", onComplete);
      socket.off("lesson:error", onError);
      setIsGenerating(false);
      const newEntry = { topic: targetTopic, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), duration, level, lesson: payload.data };
      setTopicHistory(prev => {
        const updated = [newEntry, ...prev.filter(h => h.topic !== targetTopic)].slice(0, 20);
        localStorage.setItem("adyapan-topic-history", JSON.stringify(updated));
        return updated;
      });
      if (onViewLesson) {
        onViewLesson({ topic: targetTopic, lesson: payload.data, duration, level });
      } else {
        setLessonData(payload.data);
        setCurrentTopic(targetTopic);
      }
    };
    const onError = (payload: { error: string }) => {
      socket.off("lesson:progress", onProgress);
      socket.off("lesson:complete", onComplete);
      socket.off("lesson:error", onError);
      setTopicError(payload.error);
      setIsGenerating(false);
    };

    socket.on("lesson:progress", onProgress);
    socket.on("lesson:complete", onComplete);
    socket.on("lesson:error", onError);
    socket.emit("lesson:generate", { topic: targetTopic, duration, level });
  };

  const handleQuizSelect = (questionIdx: number, option: string) => {
    if (quizSubmitted[questionIdx]) return;
    setQuizAnswers(prev => ({ ...prev, [questionIdx]: option }));
  };

  const handleQuizSubmit = (questionIdx: number) => {
    if (!quizAnswers[questionIdx]) return;
    setQuizSubmitted(prev => ({ ...prev, [questionIdx]: true }));
  };

  const renderAdaptiveLesson = (data: UnifiedLesson) => {
    if (level === "beginner") {
      return (
        <BeginnerLesson
          c={c} data={data} isScratchpadOpen={isScratchpadOpen}
          onImportTakeaway={handleImportTakeaway} onImportConcept={handleImportConcept}
          quizAnswers={quizAnswers} quizSubmitted={quizSubmitted}
          onQuizSelect={handleQuizSelect} onQuizSubmit={handleQuizSubmit}
        />
      );
    }
    return (
      <IntermediateLesson
        c={c} data={data} level={level}
        expandedConceptIdx={expandedConceptIdx} setExpandedConceptIdx={setExpandedConceptIdx}
        isScratchpadOpen={isScratchpadOpen} onImportConcept={handleImportConcept}
        practiceRevealed={practiceRevealed} setPracticeRevealed={setPracticeRevealed}
        quizAnswers={quizAnswers} quizSubmitted={quizSubmitted}
        onQuizSelect={handleQuizSelect} onQuizSubmit={handleQuizSubmit}
      />
    );
  };

  const renderTopicLearning = () => (
    <motion.div key="topic" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <TopicLearningForm
        c={c} inputTopic={inputTopic} setInputTopic={setInputTopic}
        duration={duration} setDuration={setDuration}
        level={level} setLevel={setLevel}
        isGenerating={isGenerating} onGenerate={handleGenerateLesson}
      />

      <LessonLoadingState c={c} loadingStep={loadingStep} topicError={topicError} isGenerating={isGenerating} />

      {!onViewLesson && lessonData && !isGenerating && (
        <LessonViewer
          c={c} lessonData={lessonData} currentTopic={currentTopic} duration={duration} level={level}
          isScratchpadOpen={isScratchpadOpen} setIsScratchpadOpen={setIsScratchpadOpen}
          scratchpadTab={scratchpadTab} setScratchpadTab={setScratchpadTab}
          notesText={notesText} isSavingNotes={isSavingNotes} onNotesChange={handleNotesChange}
          onImportConcept={handleImportConcept} onImportTakeaway={handleImportTakeaway}
          playgroundOutput={playgroundOutput} isRunningPlayground={isRunningPlayground}
          onRunPlayground={handleRunPlayground}
          renderLesson={renderAdaptiveLesson}
        />
      )}
    </motion.div>
  );

  const filteredTopics = summaryData?.topics.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const resetDocumentMode = () => { setMode("document"); setStatus("empty"); setFile(null); setSummaryData(null); setIsGenerating(false); setTopicError(null); setShowTopicHistory(false); };
  const resetTopicMode = () => { setMode("topic"); setShowHistory(false); };
  const handleNewUpload = () => { setStatus("empty"); setFile(null); setSummaryData(null); setSearchQuery(""); };

  const handleLoadTopic = (item: typeof topicHistory[0]) => {
    if (onViewLesson) {
      onViewLesson({ topic: item.topic, lesson: item.lesson, duration: item.duration, level: item.level });
    } else {
      setLessonData(item.lesson);
      setCurrentTopic(item.topic);
      setInputTopic(item.topic);
      setDuration(item.duration as typeof duration);
      setLevel(item.level as typeof level);
      setQuizAnswers({});
      setQuizSubmitted({});
      setExpandedConceptIdx(null);
      setPracticeRevealed({});
    }
    setShowTopicHistory(false);
  };

  return lessonToView ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col antialiased"
      style={{ color: c.text }}
    >
      <style>{`
        .sa-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .sa-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="flex items-center justify-between pb-4 mb-4" style={{ borderBottom: `1px solid ${c.divider}` }}>
        <button onClick={() => (onViewLesson as any)?.({ back: true })}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
          style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.text }}>
          <ChevronRight size={14} className="rotate-180" /> Back to Study Assistant
        </button>
        <div className="inline-flex gap-1.5 items-center text-[10px] uppercase font-extrabold tracking-wider" style={{ color: c.amber }}>
          Adaptive Lesson Generated ({lessonToView.duration} &bull; {lessonToView.level})
        </div>
      </div>

      <div className="p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"
        style={{ background: c.surface, border: `1px solid ${c.border}` }}>
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight" style={{ color: c.text }}>{lessonToView.topic}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs px-3 py-1 rounded-lg flex items-center gap-1.5" style={{ background: c.cardBgAlt, border: `1px solid ${c.border}`, color: c.textMuted }}>
            Digest: {lessonToView.duration}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {lessonToView.level === "beginner" ? (
          <BeginnerLesson
            c={c} data={lessonToView.lesson} isScratchpadOpen={false}
            onImportTakeaway={() => {}} onImportConcept={() => {}}
            quizAnswers={quizAnswers} quizSubmitted={quizSubmitted}
            onQuizSelect={handleQuizSelect} onQuizSubmit={handleQuizSubmit}
          />
        ) : (
          <IntermediateLesson
            c={c} data={lessonToView.lesson} level={lessonToView.level}
            expandedConceptIdx={expandedConceptIdx} setExpandedConceptIdx={setExpandedConceptIdx}
            isScratchpadOpen={false} onImportConcept={() => {}}
            practiceRevealed={practiceRevealed} setPracticeRevealed={setPracticeRevealed}
            quizAnswers={quizAnswers} quizSubmitted={quizSubmitted}
            onQuizSelect={handleQuizSelect} onQuizSubmit={handleQuizSubmit}
          />
        )}
      </div>
    </motion.div>
  ) : (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col antialiased"
      style={{ color: c.text }}
    >
      <style>{`
        .sa-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .sa-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <StudyAssistantHeader
        c={c} mode={mode}
        onSwitchToDocument={resetDocumentMode}
        onSwitchToTopic={resetTopicMode}
        showNewUpload={mode === "document" && status === "ready"}
        onNewUpload={handleNewUpload}
        showDocumentHistory={showHistory}
        onToggleDocumentHistory={() => setShowHistory(!showHistory)}
        documentHistoryCount={history.length}
        showTopicHistory={showTopicHistory}
        onToggleTopicHistory={() => setShowTopicHistory(!showTopicHistory)}
        topicHistoryCount={topicHistory.length}
      />

      <HistorySidebar
        c={c} type="document" show={mode === "document" && showHistory}
        onClose={() => setShowHistory(false)}
        history={history} topicHistory={topicHistory}
        searchQuery={searchQuery} onSearchChange={setSearchQuery}
        onLoadDocument={loadHistoryItem} onLoadTopic={handleLoadTopic}
      />

      <HistorySidebar
        c={c} type="topic" show={mode === "topic" && showTopicHistory}
        onClose={() => setShowTopicHistory(false)}
        history={history} topicHistory={topicHistory}
        searchQuery="" onSearchChange={() => {}}
        onLoadDocument={() => {}} onLoadTopic={handleLoadTopic}
      />

      <div className="flex-1">
        <AnimatePresence mode="wait">
          {mode === "topic" && renderTopicLearning()}

          {mode === "document" && status === "empty" && (
            <DocumentUploadZone
              c={c} isDragging={isDragging}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              fileInputRef={fileInputRef} onFileInputChange={handleFileInputChange}
              onBrowseClick={handleBrowseFiles}
            />
          )}

          {mode === "document" && status === "uploading" && (
            <DocumentUploadingState c={c} currentStage={currentStage} />
          )}

          {mode === "document" && status === "ready" && summaryData && (
            <DocumentReadyView
              c={c} summaryData={summaryData} fileDetails={fileDetails}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              activeTopic={activeTopic} handleScrollToTopic={handleScrollToTopic}
              revealedTopics={revealedTopics} filteredTopics={filteredTopics}
              contentRef={contentRef}
              handleCopySummary={handleCopySummary} handleDownloadPdf={handleDownloadPdf}
              downloadingPdf={downloadingPdf} onNewUpload={handleNewUpload}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
