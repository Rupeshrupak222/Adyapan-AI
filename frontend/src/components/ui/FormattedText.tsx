"use client";

import React, { useState } from "react";
import { Check, Copy, Code2 } from "lucide-react";

interface FormattedTextProps {
  content: string;
  className?: string;
  accentColor?: string;
}

export function cleanMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/```[\s\S]*?```/g, (match) => {
      const lines = match.split("\n");
      return lines.slice(1, -1).join(" ");
    })
    .replace(/`/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Render rich inline formatted markdown text safely without raw markdown tags (*, #, `)
 */
export function FormattedText({ content, className = "", accentColor = "#f59e0b" }: FormattedTextProps) {
  if (!content) return null;

  // Split into code blocks vs text blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-3 font-sans leading-relaxed text-sm ${className}`}>
      {parts.map((part, index) => {
        if (!part) return null;

        // Code block
        if (part.startsWith("```") && part.endsWith("```")) {
          const firstLineEnd = part.indexOf("\n");
          const language = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : "";
          const code = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3).trim() : part.slice(3, -3).trim();
          return <CodeBlock key={index} code={code} language={language} />;
        }

        // Regular text block - split by double line breaks into paragraphs
        const paragraphs = part.split(/\n\s*\n/);
        return (
          <div key={index} className="space-y-2.5">
            {paragraphs.map((p, pIdx) => {
              const trimmed = p.trim();
              if (!trimmed) return null;

              // Check if it's a heading
              if (trimmed.startsWith("#")) {
                const level = (trimmed.match(/^#+/) || ["#"])[0].length;
                const titleText = trimmed.replace(/^#+\s*/, "");
                if (level <= 2) {
                  return (
                    <h3 key={pIdx} className="text-base font-extrabold tracking-tight mt-3 mb-1 text-amber-500 flex items-center gap-2">
                      <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />
                      {renderInlineFormatting(titleText, accentColor)}
                    </h3>
                  );
                }
                return (
                  <h4 key={pIdx} className="text-sm font-bold tracking-tight mt-2 mb-1 text-gray-200">
                    {renderInlineFormatting(titleText, accentColor)}
                  </h4>
                );
              }

              // Check if it's a list (bullet points or numbered)
              const lines = trimmed.split("\n");
              const isList = lines.every(l => /^\s*([-*+]|\d+\.)\s/.test(l));

              if (isList) {
                return (
                  <ul key={pIdx} className="space-y-1.5 my-2 pl-1">
                    {lines.map((line, lIdx) => {
                      const cleanLine = line.replace(/^\s*([-*+]|\d+\.)\s*/, "");
                      return (
                        <li key={lIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500/80" />
                          <span className="flex-1">{renderInlineFormatting(cleanLine, accentColor)}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              // Normal paragraph
              return (
                <p key={pIdx} className="text-xs sm:text-sm leading-relaxed text-slate-300">
                  {renderInlineFormatting(trimmed, accentColor)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-[#0d0e17] shadow-xl">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-black/40 border-b border-white/5 text-[11px] font-mono text-gray-400">
        <span className="flex items-center gap-1.5 font-bold uppercase text-amber-500/90">
          <Code2 size={13} /> {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/10 transition-colors text-[10px] font-semibold text-gray-300"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-amber-200/90 leading-relaxed scrollbar-thin">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Parse inline bold (**term**), italic (*term*), and inline code (`term`)
 */
function renderInlineFormatting(text: string, accentColor: string): React.ReactNode[] {
  // Regex to match **bold**, *italic*, or `code`
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-extrabold text-amber-400">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-gray-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono bg-amber-500/10 border border-amber-500/20 text-amber-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}
