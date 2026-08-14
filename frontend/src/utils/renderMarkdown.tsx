"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";
import katex from "katex";

// ─── KaTeX Math Component ─────────────────────────────────────────────────────

export function KatexMath({ math, displayMode = false }: { math: string; displayMode?: boolean }) {
  let html = "";
  try {
    html = katex.renderToString(math.trim(), {
      displayMode,
      throwOnError: false,
      output: "htmlAndMathml",
    });
  } catch {
    html = math;
  }

  if (displayMode) {
    return (
      <div
        className="my-3 overflow-x-auto py-2 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-center text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className="inline-block px-1"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─── Inline formatting (math, bold, italic, code, links) ───────────────────────

export function inlineFormat(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    let earliestMatch: {
      index: number;
      length: number;
      node: React.ReactNode;
    } | null = null;

    const checkMatch = (
      regex: RegExp,
      createNode: (match: RegExpMatchArray) => React.ReactNode
    ) => {
      const match = remaining.match(regex);
      if (match && match.index !== undefined) {
        const prefixLength = match[1] ? match[1].length : 0;
        const totalIndex = match.index + prefixLength;
        const totalLength = match[0].length - prefixLength;

        if (!earliestMatch || totalIndex < earliestMatch.index) {
          earliestMatch = {
            index: totalIndex,
            length: totalLength,
            node: createNode(match),
          };
        }
      }
    };

    // 1. Block math $$...$$
    checkMatch(/^([\s\S]*?)\$\$([\s\S]+?)\$\$/, (m) => (
      <KatexMath key={key++} math={m[2]} displayMode={true} />
    ));

    // 2. Block math \[...\]
    checkMatch(/^([\s\S]*?)\\\[([\s\S]+?)\\\]/, (m) => (
      <KatexMath key={key++} math={m[2]} displayMode={true} />
    ));

    // 3. Inline math \(...\)
    checkMatch(/^([\s\S]*?)\\\(([\s\S]+?)\\\)/, (m) => (
      <KatexMath key={key++} math={m[2]} displayMode={false} />
    ));

    // 4. Inline math $...$
    checkMatch(/^([\s\S]*?)\$([^\$\n]+?)\$/, (m) => (
      <KatexMath key={key++} math={m[2]} displayMode={false} />
    ));

    // 5. Code `...`
    checkMatch(/^([\s\S]*?)`([^`]+)`/, (m) => (
      <code
        key={key++}
        className="px-1.5 py-0.5 rounded text-xs font-mono"
        style={{
          background: "rgba(245,158,11,0.12)",
          color: "#f59e0b",
          border: "1px solid rgba(245,158,11,0.2)",
        }}
      >
        {m[2]}
      </code>
    ));

    // 6. Bold **...**
    checkMatch(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/, (m) => (
      <strong key={key++} style={{ color: "inherit", fontWeight: 700 }}>
        {inlineFormat(m[2])}
      </strong>
    ));

    // 7. Italic *...*
    checkMatch(/^([\s\S]*?)\*([^\*]+)\*/, (m) => (
      <em key={key++}>{inlineFormat(m[2])}</em>
    ));

    if (earliestMatch) {
      if (earliestMatch.index > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, earliestMatch.index)}</span>);
      }
      parts.push(earliestMatch.node);
      remaining = remaining.slice(earliestMatch.index + earliestMatch.length);
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return <>{parts}</>;
}

// ─── Code block component with copy ──────────────────────────────────────────

export function CodeBlock({
  code, lang, isDark, blockBg, blockBorder,
}: {
  code: string; lang: string; isDark: boolean; blockBg: string; blockBorder: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="my-4 rounded-2xl overflow-hidden"
      style={{ background: blockBg, border: `1px solid ${blockBorder}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: `1px solid ${blockBorder}` }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 opacity-60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 opacity-60" />
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider ml-1"
            style={{ color: isDark ? "rgba(255,255,255,0.35)" : "#94a3b8" }}
          >
            {lang}
          </span>
        </div>
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg"
          style={{
            background: copied ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)",
            color: copied ? "#22c55e" : isDark ? "rgba(255,255,255,0.4)" : "#94a3b8",
            border: `1px solid ${copied ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.08)"}`,
          }}
          whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.08)" }}
          whileTap={{ scale: 0.96 }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="w-3 h-3" />
              </motion.div>
            ) : (
              <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Copy className="w-3 h-3" />
              </motion.div>
            )}
          </AnimatePresence>
          {copied ? "Copied!" : "Copy"}
        </motion.button>
      </div>

      <pre
        className="p-4 overflow-x-auto text-xs leading-relaxed font-mono"
        style={{ color: isDark ? "#e2e8f0" : "#1e293b", maxHeight: 400 }}
      >
        {code}
      </pre>
    </div>
  );
}

// ─── Lightweight markdown renderer with KaTeX math support ───────────────────

export function renderMarkdown(content: string, isDark: boolean): React.ReactNode {
  const text = isDark ? "#e2e8f0" : "#1e293b";
  const textSec = isDark ? "rgba(255,255,255,0.65)" : "#475569";
  const blockBg = isDark ? "rgba(10,8,22,0.8)" : "rgba(248,250,252,0.9)";
  const blockBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const tableHeader = isDark ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.06)";
  const tableBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let elementKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim() || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join("\n");
      elements.push(
        <CodeBlock key={elementKey++} code={code} lang={lang} isDark={isDark} blockBg={blockBg} blockBorder={blockBorder} />
      );
      i++;
      continue;
    }

    // Block math $$ ... $$ or \[ ... \]
    if (
      trimmed === "$$" ||
      trimmed === "\\[" ||
      (trimmed.startsWith("$$") && (!trimmed.slice(2).includes("$$") || trimmed.endsWith("$$"))) ||
      (trimmed.startsWith("\\[") && (!trimmed.slice(2).includes("\\]") || trimmed.endsWith("\\]")))
    ) {
      // Single line block math: $$math$$ or \[math\]
      if (
        (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) ||
        (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4)
      ) {
        const mathContent = trimmed.startsWith("$$") ? trimmed.slice(2, -2) : trimmed.slice(2, -2);
        elements.push(
          <KatexMath key={elementKey++} math={mathContent} displayMode={true} />
        );
        i++;
        continue;
      }

      // Multi-line block math
      const mathLines: string[] = [];
      const isSquare = trimmed.startsWith("\\[");
      const endMarker = isSquare ? "\\]" : "$$";

      let firstContent = isSquare ? trimmed.slice(2) : trimmed.slice(2);
      if (firstContent) mathLines.push(firstContent);

      i++;
      while (i < lines.length) {
        const curTrim = lines[i].trim();
        if (curTrim === endMarker) {
          i++;
          break;
        }
        if (curTrim.endsWith(endMarker)) {
          const contentBeforeEnd = curTrim.slice(0, -endMarker.length);
          if (contentBeforeEnd) mathLines.push(contentBeforeEnd);
          i++;
          break;
        }
        mathLines.push(lines[i]);
        i++;
      }

      elements.push(
        <KatexMath key={elementKey++} math={mathLines.join("\n")} displayMode={true} />
      );
      continue;
    }

    // Heading 1
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={elementKey++} className="text-2xl font-black mb-3 mt-5 first:mt-0" style={{ color: text, fontFamily: "var(--font-display), sans-serif", letterSpacing: "-0.02em" }}>
          {inlineFormat(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Heading 2
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={elementKey++} className="text-xl font-bold mb-2 mt-4 first:mt-0" style={{ color: text, fontFamily: "var(--font-display), sans-serif", letterSpacing: "-0.01em" }}>
          {inlineFormat(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    // Heading 3
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={elementKey++} className="text-base font-bold mb-2 mt-3 first:mt-0" style={{ color: text }}>
          {inlineFormat(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*] /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*] /)) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={elementKey++} className="space-y-1.5 my-3 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-sm items-start" style={{ color: textSec }}>
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#f59e0b" }} />
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={elementKey++} className="space-y-1.5 my-3 pl-1">
          {items.map((item, j) => (
            <li key={j} className="flex gap-2.5 text-sm items-start" style={{ color: textSec }}>
              <span
                className="text-xs font-bold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
              >
                {j + 1}
              </span>
              <span>{inlineFormat(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Table (detect by pipe)
    if (line.includes("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
      const headers = line.split("|").map(h => h.trim()).filter(Boolean);
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(lines[i].split("|").map(c => c.trim()).filter(Boolean));
        i++;
      }
      elements.push(
        <div key={elementKey++} className="overflow-x-auto my-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {headers.map((h, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold" style={{ background: tableHeader, color: "#f59e0b", borderBottom: `1px solid ${tableBorder}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2" style={{ color: textSec, borderBottom: `1px solid ${tableBorder}` }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={elementKey++}
          className="pl-4 my-3 text-sm italic"
          style={{
            borderLeft: "3px solid rgba(245,158,11,0.5)",
            color: textSec,
            background: isDark ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.03)",
            borderRadius: "0 8px 8px 0",
            padding: "8px 12px",
          }}
        >
          {inlineFormat(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(
        <hr key={elementKey++} className="my-4" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      elements.push(<div key={elementKey++} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={elementKey++} className="text-sm leading-relaxed mb-1" style={{ color: textSec }}>
        {inlineFormat(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}
