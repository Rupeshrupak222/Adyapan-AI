"use client";

import React, { useMemo } from "react";

interface FormattedMarkdownProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
  isDark?: boolean;
}

/**
 * Parses inline markdown tokens (**bold**, *italic*, `code`) into React nodes.
 */
function parseInlineMarkdown(text: string, isDark: boolean = true): React.ReactNode[] {
  if (!text) return [];

  // Match **bold**, *italic*, `code`
  const tokenRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold" style={{ color: isDark ? "#ffffff" : "#000000" }}>
          {parseInlineMarkdown(part.slice(2, -2), isDark)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic">
          {parseInlineMarkdown(part.slice(1, -1), isDark)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded text-[11px] font-mono mx-0.5 inline-block"
          style={{
            background: isDark ? "rgba(6,182,212,0.15)" : "rgba(6,182,212,0.08)",
            color: isDark ? "#22d3ee" : "#0891b2",
            border: `1px solid ${isDark ? "rgba(6,182,212,0.25)" : "rgba(6,182,212,0.15)"}`,
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * FormattedMarkdown cleanly parses and renders Markdown text across all site views.
 */
export default function FormattedMarkdown({ content, className = "", style, isDark = true }: FormattedMarkdownProps) {
  const blocks = useMemo(() => {
    if (!content) return [];

    // Separate code blocks from normal text
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    const items: Array<{ type: "code" | "text"; language?: string; text: string }> = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        items.push({ type: "text", text: content.slice(lastIndex, match.index) });
      }
      items.push({ type: "code", language: match[1] || "code", text: match[2].trim() });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      items.push({ type: "text", text: content.slice(lastIndex) });
    }

    return items;
  }, [content]);

  if (!content) return null;

  return (
    <div className={`formatted-markdown space-y-2 text-xs leading-relaxed ${className}`} style={style}>
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          return (
            <div key={bIdx} className="my-2 rounded-xl overflow-hidden border" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb" }}>
              {block.language && (
                <div className="px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border-b flex items-center justify-between" style={{ background: isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6", borderColor: isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb", color: isDark ? "#22d3ee" : "#0891b2" }}>
                  <span>{block.language}</span>
                </div>
              )}
              <pre className="p-3 text-[11px] font-mono overflow-x-auto" style={{ background: isDark ? "#09090b" : "#f8fafc", color: isDark ? "#e4e4e7" : "#18181b" }}>
                <code>{block.text}</code>
              </pre>
            </div>
          );
        }

        // Split text block into paragraphs/lines
        const paragraphs = block.text.split(/\n\s*\n/);

        return paragraphs.map((para, pIdx) => {
          const trimmed = para.trim();
          if (!trimmed) return null;

          // Headings
          if (trimmed.startsWith("### ")) {
            return (
              <h4 key={`${bIdx}-${pIdx}`} className="text-xs font-bold uppercase tracking-wider mt-3 mb-1" style={{ color: isDark ? "#38bdf8" : "#0284c7" }}>
                {parseInlineMarkdown(trimmed.slice(4), isDark)}
              </h4>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h3 key={`${bIdx}-${pIdx}`} className="text-sm font-extrabold tracking-wide mt-3 mb-1" style={{ color: isDark ? "#a78bfa" : "#7c3aed" }}>
                {parseInlineMarkdown(trimmed.slice(3), isDark)}
              </h3>
            );
          }
          if (trimmed.startsWith("# ")) {
            return (
              <h2 key={`${bIdx}-${pIdx}`} className="text-base font-extrabold mt-4 mb-2" style={{ color: isDark ? "#ffffff" : "#111827" }}>
                {parseInlineMarkdown(trimmed.slice(2), isDark)}
              </h2>
            );
          }

          // Bullet List
          const lines = trimmed.split("\n");
          const isBulletList = lines.every((line) => line.trim().startsWith("- ") || line.trim().startsWith("* ") || line.trim() === "");
          const isNumberedList = lines.every((line) => /^\d+\.\s/.test(line.trim()) || line.trim() === "");

          if (isBulletList) {
            return (
              <ul key={`${bIdx}-${pIdx}`} className="space-y-1.5 my-1.5 pl-1">
                {lines.map((line, lIdx) => {
                  const item = line.trim().replace(/^[-*]\s+/, "");
                  if (!item) return null;
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: isDark ? "#06b6d4" : "#0284c7" }} />
                      <span>{parseInlineMarkdown(item, isDark)}</span>
                    </li>
                  );
                })}
              </ul>
            );
          }

          if (isNumberedList) {
            return (
              <ol key={`${bIdx}-${pIdx}`} className="space-y-1.5 my-1.5 pl-1">
                {lines.map((line, lIdx) => {
                  const matchNum = line.trim().match(/^(\d+)\.\s+(.*)/);
                  if (!matchNum) return null;
                  return (
                    <li key={lIdx} className="flex items-start gap-2">
                      <span className="font-mono text-[11px] font-bold shrink-0 mt-0.5" style={{ color: isDark ? "#06b6d4" : "#0284c7" }}>
                        {matchNum[1]}.
                      </span>
                      <span>{parseInlineMarkdown(matchNum[2], isDark)}</span>
                    </li>
                  );
                })}
              </ol>
            );
          }

          // Normal Paragraph with linebreaks inside
          return (
            <p key={`${bIdx}-${pIdx}`}>
              {lines.map((line, lIdx) => (
                <React.Fragment key={lIdx}>
                  {parseInlineMarkdown(line, isDark)}
                  {lIdx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          );
        });
      })}
    </div>
  );
}
