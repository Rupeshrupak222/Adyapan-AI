"use client";

import { motion } from "framer-motion";
import { Upload, Brain, Sparkles, Zap, Star, CheckCircle2 } from "lucide-react";
import { PremiumCard, PremiumBadge, PremiumButton } from "@/components/ui/PremiumComponents";
import { fadeUp, scaleIn } from "@/utils/animations";
import { mkColors } from "@/utils/themeColors";

type Props = {
  c: ReturnType<typeof mkColors>;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseClick: () => void;
};

export function DocumentUploadZone({ c, isDragging, onDragOver, onDragLeave, onDrop, fileInputRef, onFileInputChange, onBrowseClick }: Props) {
  return (
    <motion.div key="empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }} className="space-y-8">
      {/* Upload card with tilt and glow */}
      <PremiumCard 
        tilt={true} 
        glow={true} 
        variant="interactive"
        className="p-0"
      >
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={onBrowseClick}
          className="w-full text-center relative overflow-hidden p-12 flex flex-col items-center justify-center min-h-[300px]"
          style={{ 
            borderColor: isDragging ? "rgba(245,158,11,0.6)" : "transparent",
            background: isDragging ? c.amberActive : "transparent"
          }}
        >
          {/* Subtle design shapes */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-4 right-8 w-28 h-28 rounded-full opacity-10 bg-[radial-gradient(circle,#f59e0b,transparent_70%)] animate-pulse" />
            <div className="absolute bottom-4 left-8 w-24 h-24 rounded-full opacity-10 bg-[radial-gradient(circle,#8b5cf6,transparent_70%)] animate-pulse" />
          </div>
          
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.md,.markdown" className="hidden" onChange={onFileInputChange} />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 bg-amber-500/10 border border-amber-500/20 shadow-md"
          >
            <Upload style={{ color: c.amber }} size={26} />
          </motion.div>

          <h3 className="text-lg font-extrabold mb-1.5 text-slate-800 dark:text-gray-100 font-sans tracking-wide">
            {isDragging ? "Drop your file here!" : "Upload Your Study Material"}
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-6 max-w-sm">
            Drag & Drop or <span className="text-amber-500 font-bold">Browse Files</span> to unlock AI-powered study assistance. Supports PDF, TXT, Markdown.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {["PDF", "TXT", "Markdown"].map((fmt, i) => (
              <PremiumBadge key={fmt} variant={i % 2 === 0 ? "amber" : "purple"}>
                {fmt}
              </PremiumBadge>
            ))}
          </div>
        </div>
      </PremiumCard>

      {/* How it works grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Zap size={14} style={{ color: c.amber }} className="animate-pulse" /> How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "01", title: "Upload Source", desc: "Drop any study material — lecture notes, textbooks, or presentation slides.", icon: <Upload size={18} style={{ color: c.amber }} /> },
            { step: "02", title: "Extract Schema", desc: "AI engine extracts text context and maps complex syllabus structures automatically.", icon: <Brain size={18} style={{ color: "#a78bfa" }} /> },
            { step: "03", title: "Generate Insights", desc: "Instantly get core concept lists, exam prep summaries, keywords, and quick revision.", icon: <Sparkles size={18} style={{ color: "#22d3ee" }} /> }
          ].map((item, i) => (
            <PremiumCard
              key={item.step}
              glow={true}
              variant="glass"
              className="p-5"
            >
              <div className="flex items-start gap-3.5 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 border border-black/5 dark:bg-white/5 dark:border-white/5">
                  {item.icon}
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest block text-amber-500">Step {item.step}</span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200">{item.title}</h4>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-gray-400">{item.desc}</p>
            </PremiumCard>
          ))}
        </div>
      </div>

      {/* Features summary panel */}
      <PremiumCard glow={true} className="p-5">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Star size={14} style={{ color: c.amber }} /> Core Accelerator Capabilities
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {["Topic Detection", "AI Summary", "Key Points", "Quick Revision", "Smart Search", "Multi-format Support", "Copy Summary", "Export PDF", "Export DOCX"].map((feat, i) => (
            <div key={feat} className="flex items-center gap-2 text-xs text-slate-600 dark:text-gray-400 font-medium">
              <CheckCircle2 size={13} style={{ color: c.amber }} className="shrink-0" />
              <span>{feat}</span>
            </div>
          ))}
        </div>
      </PremiumCard>
    </motion.div>
  );
}
