"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";

import { ResearchDashboard } from "./ResearchDashboard";
import { ResearchWizard } from "./ResearchWizard";
import { PaperEditorWorkspace } from "./PaperEditorWorkspace";
import { TemplateGalleryModal } from "./TemplateGalleryModal";
import { PlagiarismCheckerView } from "./PlagiarismCheckerView";

interface ResearchHubViewProps {
  setView: (v: string) => void;
  activeModule?: string;
  theme?: string;
}

type ViewState = "dashboard" | "wizard" | "workspace" | "plagiarism";

export function ResearchHubView({ setView, activeModule, theme: propTheme }: ResearchHubViewProps) {
  const currentTheme = useTheme();
  const isDark = currentTheme === "dark";

  const c = {
    isDark,
    text: isDark ? "#e5e7eb" : "#0f172a",
    textSec: isDark ? "#9ca3af" : "#475569",
    textMuted: isDark ? "#828fa3" : "#64748b",
    bg: isDark ? "#0b0f19" : "#ffffff",
    surface: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    divider: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    inputBg: isDark ? "rgba(0,0,0,0.35)" : "#f1f5f9",
    amber: "#f59e0b",
    amberGlow: "rgba(245,158,11,0.2)",
    amberGradient: "linear-gradient(135deg, #f59e0b, #d97706)",
  };

  const [viewState, setViewState] = useState<ViewState>("dashboard");
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [recentPapers, setRecentPapers] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("IEEE");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get("/research/dashboard");
      if (res.data?.success) {
        setDashboardStats(res.data.stats);
        setRecentPapers(res.data.recentPapers || []);
        setDrafts(res.data.drafts || []);
      }
    } catch {
      setDashboardStats({
        totalPapers: 0,
        savedDrafts: 0,
        publishedPapers: 0,
        aiTokensUsed: 0,
        researchProgress: 0,
      });
    }
  };

  const handleSelectPaper = (paper: any) => {
    setSelectedPaper(paper);
    setViewState("workspace");
  };

  const handleWizardFinish = (paper: any) => {
    setSelectedPaper(paper);
    setViewState("workspace");
    fetchDashboardData();
  };

  return (
    <div className="min-h-screen p-4 md:p-6 transition-colors" style={{ background: c.bg, color: c.text }}>
      {/* Main View Transitioning Body */}
      <AnimatePresence mode="wait">
        {viewState === "dashboard" && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ResearchDashboard
              onStartNewPaper={() => setViewState("wizard")}
              onOpenTemplateGallery={() => setIsTemplateModalOpen(true)}
              onOpenPlagiarismChecker={() => setViewState("plagiarism")}
              onSelectPaper={handleSelectPaper}
              stats={dashboardStats}
              recentPapers={recentPapers}
              drafts={drafts}
              exportHistory={exportHistory}
              c={c}
            />
          </motion.div>
        )}

        {viewState === "wizard" && (
          <motion.div key="wizard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <ResearchWizard
              onCancel={() => setViewState("dashboard")}
              onFinish={handleWizardFinish}
              c={c}
            />
          </motion.div>
        )}

        {viewState === "workspace" && (
          <motion.div key="workspace" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <PaperEditorWorkspace
              paper={selectedPaper || {
                title: "",
                authors: [],
                abstract: "",
                keywords: [],
                sections: [
                  { id: "abstract", title: "Abstract", content: "" },
                  { id: "intro", title: "1. Introduction", content: "" },
                  { id: "methodology", title: "2. Methodology", content: "" },
                  { id: "results", title: "3. Results", content: "" },
                  { id: "conclusion", title: "4. Conclusion", content: "" },
                ],
                references: [],
                metadata: { template: selectedTemplate, wordCount: 0 }
              }}
              onBack={() => setViewState("dashboard")}
              onOpenTemplates={() => setIsTemplateModalOpen(true)}
              c={c}
            />
          </motion.div>
        )}

        {viewState === "plagiarism" && (
          <motion.div key="plagiarism" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <PlagiarismCheckerView setView={(v) => {
              if (v === "research-hub" || v === "dashboard") setViewState("dashboard");
              else setView(v);
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Academic Template Gallery Modal */}
      <TemplateGalleryModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(tId) => setSelectedTemplate(tId)}
        c={c}
      />
    </div>
  );
}
