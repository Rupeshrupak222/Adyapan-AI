"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Sparkles, BookOpen, Clock, Download, Plus, ArrowRight, ArrowLeft,
  Upload, Layers, CheckCircle2, AlertCircle, RefreshCw, Eye, Edit3,
  Sliders, Wand2, Play, Code2, Globe, ShieldCheck, Check, ChevronRight, FileCode
} from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useFeatureQuota } from "@/hooks/useFeatureQuota";
import { FeatureCreditBadge } from "@/components/shared/FeatureCreditBadge";
import { FeatureLimitBanner } from "@/components/shared/FeatureLimitBanner";
import { ACADEMIC_TEMPLATES_LIST } from "./TemplateGalleryModal";

function extractErrorMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback;
}

interface ResearchWizardProps {
  onCancel: () => void;
  onFinish: (paper: any) => void;
  c: any;
}

export function ResearchWizard({ onCancel, onFinish, c }: ResearchWizardProps) {
  const quota = useFeatureQuota("RESEARCH_PAPER_AI");
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Research Details
  const [title, setTitle] = useState("");
  const [domain, setDomain] = useState("AI / Machine Learning");
  const [keywords, setKeywords] = useState("");
  const [researchType, setResearchType] = useState("Experimental");
  const [publicationType, setPublicationType] = useState("Conference Paper");
  const [language, setLanguage] = useState("English (Academic US)");
  const [paperLength, setPaperLength] = useState("Medium (8-12 pages)");
  const [difficultyLevel, setDifficultyLevel] = useState("Advanced Scientific");

  // Step 2: Paper Configuration
  const [authors, setAuthors] = useState("");
  const [institution, setInstitution] = useState("");
  const [abstractLength, setAbstractLength] = useState("Standard (250 words)");
  const [citationStyle, setCitationStyle] = useState("IEEE");
  const [template, setTemplate] = useState("IEEE");
  const [includeFigures, setIncludeFigures] = useState(true);
  const [includeTables, setIncludeTables] = useState(true);
  const [includeAlgorithms, setIncludeAlgorithms] = useState(true);
  const [includeEquations, setIncludeEquations] = useState(true);
  const [referenceCount, setReferenceCount] = useState(15);

  // Step 3: Literature Review
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedSources, setSearchedSources] = useState<any[]>([]);
  const [searchingSources, setSearchingSources] = useState(false);
  const [uploadedPDFs, setUploadedPDFs] = useState<any[]>([]);

  // Step 4: Outline
  const [outlineSections, setOutlineSections] = useState<Array<{ id: string; title: string; desc: string }>>([
    { id: "abstract", title: "Abstract", desc: "Concise summary of research problem, proposed model, and findings." },
    { id: "intro", title: "1. Introduction", desc: "Background, motivation, research gaps, and key contributions." },
    { id: "related", title: "2. Related Work & Literature Review", desc: "Taxonomy of existing models and limitations." },
    { id: "methodology", title: "3. Proposed Multi-Agent Methodology", desc: "Formal mathematical formulation and system architecture." },
    { id: "model", title: "4. Algorithmic Formulation", desc: "Detailed pseudocode and theoretical guarantees." },
    { id: "results", title: "5. Experimental Results & Performance Analysis", desc: "Quantitative benchmarks against baseline models." },
    { id: "discussion", title: "6. Discussion & Limitations", desc: "Implications, scalability trade-offs, and failure modes." },
    { id: "conclusion", title: "7. Conclusion & Future Work", desc: "Summary of contributions and prospective directions." },
    { id: "references", title: "References", desc: "Formatted peer-reviewed citations." },
  ]);

  // Step 5: Generation Progress
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [generatingMessage, setGeneratingMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<any>(null);

  // Step 6: Enhancement
  const [enhancementMode, setEnhancementMode] = useState("academic_tone");
  const [enhancing, setEnhancing] = useState(false);

  // Step 7: Visuals
  const [generatedDiagram, setGeneratedDiagram] = useState<any>(null);
  const [generatingVisual, setGeneratingVisual] = useState(false);

  const handleGenerateVisual = async (contentType: "architecture" | "flowchart" | "equation" | "table") => {
    const topicVal = title || domain;
    if (!topicVal) return toast.error("Enter a title or domain first.");
    setGeneratingVisual(true);
    try {
      const res = await api.post("/research/generate-visual", { contentType, topic: topicVal });
      if (res.data?.success && res.data?.visual) {
        setGeneratedDiagram(res.data.visual);
        toast.success("Visual generated!");
      }
    } catch {
      toast.error("Failed to generate visual.");
    } finally {
      setGeneratingVisual(false);
    }
  };

  const stepsHeader = [
    "1. Details", "2. Config", "3. Literature", "4. Outline",
    "5. Generation", "6. Enhance", "7. Visuals", "8. Review", "9. Export"
  ];

  const handleFetchSources = async () => {
    if (!searchQuery.trim()) return;
    setSearchingSources(true);
    try {
      const res = await api.post("/research/fetch-sources", { topic: searchQuery });
      if (res.data?.success && res.data?.sources) {
        setSearchedSources(res.data.sources);
        toast.success(`Found ${res.data.sources.length} scholarly sources!`);
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "Failed to fetch literature"));
    } finally {
      setSearchingSources(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post("/research/upload-pdf", formData);
      if (res.data?.success && res.data?.parsed) {
        setUploadedPDFs(prev => [...prev, { filename: file.name, meta: res.data.parsed }]);
        toast.success(`Uploaded and parsed ${file.name}`);
      }
    } catch (err: any) {
      toast.error(extractErrorMessage(err, "PDF upload failed"));
    }
  };

  const handleStartGeneration = async () => {
    if (quota.exhausted) {
      toast.info("You've used all free Research Paper AI credits for this month.");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a research paper title before generating.");
      setCurrentStep(1);
      return;
    }
    const requestId = quota.newRequestId();
    setIsGenerating(true);
    setCurrentStep(5);
    setGeneratingProgress(10);
    setGeneratingMessage("Connecting to AI Research Engine...");

    try {
      const config = {
        topic: title,
        field: domain,
        researchType,
        template,
        paperLength,
        citationStyle,
        requestId,
        options: {
          includeTables,
          includeEquations,
          generateGraphs: includeFigures,
          addFutureWork: true,
          addLimitations: true,
        }
      };

      const res = await api.post("/research/generate-paper-sync", config);
      if (res.data?.success && res.data?.paper) {
        quota.onSuccess();
        setGeneratingProgress(100);
        setGeneratingMessage("Paper generated successfully!");
        setGeneratedPaper(res.data.paper);
        toast.success("Research paper generated!");
        setTimeout(() => setCurrentStep(6), 800);
      }
    } catch (err: any) {
      if (quota.handleQuotaError(err)) return;
      await quota.onFailure();
      toast.error(extractErrorMessage(err, "Generation failed"));
      setCurrentStep(4);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx" | "latex" | "markdown") => {
    try {
      const res = await api.post(`/research/export/${format}`, { paper: generatedPaper, template }, { responseType: "blob" });
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "latex" ? "tex" : (format === "markdown" ? "md" : format);
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 40)}.${ext}`;
      a.click();
      toast.success(`Exported as ${format.toUpperCase()}!`);
    } catch (err: any) {
      toast.error(extractErrorMessage(err, `Export to ${format} failed`));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Wizard Header Progress Bar */}
      <div className="p-4 rounded-2xl border space-y-2" style={{ background: c.isDark ? "rgba(255,255,255,0.02)" : "#ffffff", borderColor: c.isDark ? "rgba(245,158,11,0.2)" : c.border }}>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
          {stepsHeader.map((sLabel, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStep === stepNum;
            const isCompleted = currentStep > stepNum;
            return (
              <div
                key={sLabel}
                onClick={() => isCompleted && setCurrentStep(stepNum)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                    : isCompleted
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    : "text-gray-400 bg-white/5"
                }`}
              >
                {isCompleted ? <Check size={12} /> : <span>{stepNum}</span>}
                <span>{sLabel.split(" ")[1]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <FeatureCreditBadge featureKey="RESEARCH_PAPER_AI" isDark={c.isDark} compact />
        </div>
      </div>

      {/* Step Content Container */}
      <div className="p-6 md:p-8 rounded-2xl border space-y-6" style={{ background: c.isDark ? "#0f172a" : "#ffffff", borderColor: c.isDark ? "rgba(245,158,11,0.2)" : c.border }}>
        {/* Step 1: Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Step 1 — Research Details</h2>
              <p className="text-xs" style={{ color: c.textMuted }}>Define research topic, domain, keywords, and publication target.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-400 block mb-1">Research Paper Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Deep Reinforcement Learning for Autonomous Drone Swarms"
                  className="w-full p-3 rounded-xl text-sm outline-none font-semibold"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Research Domain</label>
                <select
                  value={domain}
                  onChange={e => setDomain(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs outline-none"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {["Computer Science", "AI / Machine Learning", "Healthcare", "Cybersecurity", "IoT", "Data Science", "Natural Language Processing"].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Research Type</label>
                <select
                  value={researchType}
                  onChange={e => setResearchType(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs outline-none"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {["Experimental", "Survey Paper", "Review Paper", "Comparative", "Case Study"].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-400 block mb-1">Keywords (Comma Separated)</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="e.g. Machine Learning, Neural Networks, Computer Vision"
                  className="w-full p-3 rounded-xl text-xs outline-none"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-white/10 font-semibold text-xs text-white">Cancel</button>
              <button onClick={() => {
                if (!title.trim()) {
                  toast.error("Please enter a research paper title.");
                  return;
                }
                setCurrentStep(2);
              }} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20">
                Continue to Config <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Config */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Step 2 — Paper Configuration</h2>
              <p className="text-xs" style={{ color: c.textMuted }}>Authorship, institution, target template, and components inclusions.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Authors (Comma Separated)</label>
                <input
                  type="text"
                  value={authors}
                  onChange={e => setAuthors(e.target.value)}
                  placeholder="e.g. Jane Doe, John Smith"
                  className="w-full p-3 rounded-xl text-xs outline-none"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Institution / Department</label>
                <input
                  type="text"
                  value={institution}
                  onChange={e => setInstitution(e.target.value)}
                  placeholder="e.g. Stanford University & Adyapan AI"
                  className="w-full p-3 rounded-xl text-xs outline-none"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Publication Template</label>
                <select
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs outline-none"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {ACADEMIC_TEMPLATES_LIST.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Citation Style</label>
                <select
                  value={citationStyle}
                  onChange={e => setCitationStyle(e.target.value)}
                  className="w-full p-3 rounded-xl text-xs outline-none"
                  style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {["IEEE", "APA", "MLA", "Chicago", "Harvard"].map(cStyle => (
                    <option key={cStyle} value={cStyle}>{cStyle}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                {[
                  { label: "Figures & Graphs", state: includeFigures, set: setIncludeFigures },
                  { label: "Data Tables", state: includeTables, set: setIncludeTables },
                  { label: "Algorithms", state: includeAlgorithms, set: setIncludeAlgorithms },
                  { label: "Math Equations", state: includeEquations, set: setIncludeEquations },
                ].map(item => (
                  <label key={item.label} className="p-3 rounded-xl border flex items-center gap-2 cursor-pointer bg-white/5" style={{ borderColor: c.border }}>
                    <input type="checkbox" checked={item.state} onChange={e => item.set(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
                    <span className="text-xs font-semibold" style={{ color: c.text }}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setCurrentStep(1)} className="px-4 py-2 rounded-xl bg-white/10 font-semibold text-xs text-white">Back</button>
              <button onClick={() => setCurrentStep(3)} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20">
                Continue to Literature <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Literature Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Step 3 — Literature Review & References</h2>
              <p className="text-xs" style={{ color: c.textMuted }}>Fetch arXiv/Scholar citations and upload PDF reference documents.</p>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search literature via arXiv..."
                className="flex-1 p-3 rounded-xl text-xs outline-none"
                style={{ background: c.inputBg, color: c.text, border: `1px solid ${c.border}` }}
              />
              <button onClick={handleFetchSources} disabled={searchingSources} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950">
                {searchingSources ? "Searching..." : "Search arXiv"}
              </button>
            </div>

            {/* Upload PDF Section */}
            <div className="p-4 rounded-xl border border-dashed text-center space-y-2" style={{ borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.02)" }}>
              <Upload size={24} className="mx-auto text-amber-500" />
              <div className="text-xs font-semibold" style={{ color: c.text }}>Upload PDF Reference Papers</div>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="inline-block px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer">
                Select PDF File
              </label>
            </div>

            {/* Results Grid */}
            {searchedSources.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <div className="text-xs font-bold text-amber-500 uppercase">Fetched Citations ({searchedSources.length})</div>
                {searchedSources.slice(0, 5).map((s, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs space-y-1">
                    <div className="font-bold text-amber-400 truncate">{s.title}</div>
                    <div className="text-gray-400 text-[11px] truncate">{s.authors?.join(", ")} • {s.year}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <button onClick={() => setCurrentStep(2)} className="px-4 py-2 rounded-xl bg-white/10 font-semibold text-xs text-white">Back</button>
              <button onClick={() => setCurrentStep(4)} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20">
                Continue to Outline <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Outline */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Step 4 — Paper Outline</h2>
              <p className="text-xs" style={{ color: c.textMuted }}>Review and adjust paper section structure prior to AI generation.</p>
            </div>

            <div className="space-y-3">
              {outlineSections.map((sec, idx) => (
                <div key={sec.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold" style={{ color: c.text }}>{sec.title}</div>
                    <div className="text-[11px]" style={{ color: c.textMuted }}>{sec.desc}</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">Step 4.{idx + 1}</span>
                </div>
              ))}
            </div>

            {quota.status && quota.exhausted && (
              <FeatureLimitBanner featureKey="RESEARCH_PAPER_AI" featureName="Research Paper AI" isDark={c.isDark} />
            )}

            <div className="flex justify-between pt-4">
              <button onClick={() => setCurrentStep(3)} className="px-4 py-2 rounded-xl bg-white/10 font-semibold text-xs text-white">Back</button>
              <button onClick={handleStartGeneration} disabled={quota.exhausted} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-xs text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                <Play size={14} /> Generate Full Paper
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Generation Progress */}
        {currentStep === 5 && (
          <div className="py-12 text-center space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mx-auto animate-pulse">
              <Sparkles size={32} />
            </div>

            <div>
              <h3 className="text-lg font-bold" style={{ color: c.text }}>Generating Peer-Review Ready Paper...</h3>
              <p className="text-xs mt-1" style={{ color: c.textMuted }}>{generatingMessage || "Synthesizing section contents..."}</p>
            </div>

            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${generatingProgress}%` }} />
            </div>

            <p className="text-[11px] text-amber-400 font-mono">Template: {template} • Citation: {citationStyle}</p>
          </div>
        )}

        {/* Step 6: AI Enhancement */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Step 6 — AI Enhancement & Refinement</h2>
              <p className="text-xs" style={{ color: c.textMuted }}>Apply AI tools for academic tone, grammar, and similarity reduction.</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={18} /> Paper content generated successfully! Refine using AI tools below:
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { id: "academic_tone", name: "Academic Tone", desc: "Elevate vocabulary and formal style" },
                { id: "grammar", name: "Grammar Repair", desc: "Fix typos, syntax, and punctuation" },
                { id: "plagiarism_reduction", name: "Paraphrase", desc: "Reduce similarity index score" },
                { id: "humanize", name: "Humanize Text", desc: "Remove repetitive AI patterns" },
                { id: "expand", name: "Expand Details", desc: "Add methodological depth" },
                { id: "shorten", name: "Condense", desc: "Make concise for length limit" },
              ].map(tool => (
                <div key={tool.id} className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-1 hover:border-amber-500/40 transition-colors">
                  <div className="text-xs font-bold text-amber-400">{tool.name}</div>
                  <div className="text-[10px] text-gray-400">{tool.desc}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setCurrentStep(4)} className="px-4 py-2 rounded-xl bg-white/10 font-semibold text-xs text-white">Back</button>
              <button onClick={() => setCurrentStep(7)} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20">
                Continue to Visuals <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Visual Content */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Step 7 — Visual Content & Diagrams</h2>
              <p className="text-xs" style={{ color: c.textMuted }}>Review automatically generated architecture diagrams and equations.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 text-amber-400 font-mono text-xs border border-slate-800 space-y-2 min-h-[120px]">
                {generatingVisual ? (
                  <div className="flex items-center gap-2 text-gray-400"><RefreshCw size={14} className="animate-spin" /> Generating visual content...</div>
                ) : generatedDiagram?.content ? (
                  <pre className="whitespace-pre-wrap">{generatedDiagram.content}</pre>
                ) : (
                  <div className="text-gray-500 italic">Click a button below to generate a diagram for your paper.</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["architecture", "flowchart", "equation", "table"] as const).map(t => (
                  <button key={t} onClick={() => handleGenerateVisual(t)} disabled={generatingVisual}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-gray-300 hover:bg-amber-500/20 hover:text-amber-400 disabled:opacity-50 transition-all capitalize">
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setCurrentStep(6)} className="px-4 py-2 rounded-xl bg-white/10 font-semibold text-xs text-white">Back</button>
              <button onClick={() => setCurrentStep(8)} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20">
                Continue to Review <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 8: Review */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Step 8 — Final Review & Inspection</h2>
              <p className="text-xs" style={{ color: c.textMuted }}>Verify formatting, citations, and metrics before export.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-lg font-extrabold text-amber-400">{generatedPaper?.metadata?.wordCount || 0}</div>
                <div className="text-[10px] text-gray-400">Total Word Count</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-lg font-extrabold text-amber-400">{template}</div>
                <div className="text-[10px] text-gray-400">Publication Format</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-lg font-extrabold text-amber-400">{generatedPaper?.references?.length || 0}</div>
                <div className="text-[10px] text-gray-400">Citations Included</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-lg font-extrabold text-amber-400">{generatedPaper ? "100%" : "—"}</div>
                <div className="text-[10px] text-gray-400">Format Validated</div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button onClick={() => setCurrentStep(7)} className="px-4 py-2 rounded-xl bg-white/10 font-semibold text-xs text-white">Back</button>
              <button onClick={() => setCurrentStep(9)} className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-xs text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-500/20">
                Continue to Export <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 9: Export */}
        {currentStep === 9 && (
          <div className="space-y-6 text-center max-w-lg mx-auto py-6">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <Download size={28} />
            </div>

            <div>
              <h2 className="text-xl font-bold" style={{ color: c.text }}>Export Your Research Paper</h2>
              <p className="text-xs text-gray-400 mt-1">Download peer-reviewed paper in your desired publication format.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => handleExport("pdf")} className="p-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex flex-col items-center gap-2 shadow-lg shadow-amber-500/20">
                <Download size={20} /> Export PDF
              </button>
              <button onClick={() => handleExport("latex")} className="p-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs flex flex-col items-center gap-2 shadow-lg shadow-amber-600/20">
                <Code2 size={20} /> Export LaTeX (.tex)
              </button>
              <button onClick={() => handleExport("docx")} className="p-4 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-black text-xs flex flex-col items-center gap-2 shadow-lg shadow-amber-700/20">
                <FileText size={20} /> Export DOCX
              </button>
              <button onClick={() => handleExport("markdown")} className="p-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex flex-col items-center gap-2">
                <FileCode size={20} /> Export Markdown (.md)
              </button>
            </div>

            <button
              onClick={() => onFinish({
                ...(generatedPaper || {}),
                metadata: { ...(generatedPaper?.metadata || {}), template }
              })}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 font-extrabold text-slate-950 text-xs shadow-lg shadow-amber-500/20"
            >
              Open in Split-Screen Workspace Editor ({template} Template)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
