export interface ParsedPDFResult {
  title: string;
  authors: string[];
  abstract: string;
  year?: number;
  doi?: string;
  keywords: string[];
  references: Array<{
    title: string;
    authors: string[];
    year?: number;
    rawText: string;
  }>;
  rawText: string;
}

/**
 * Extract clean, readable plain text from a PDF Buffer.
 * Guaranteed to NEVER return raw binary PDF headers (%PDF-1.5...) or unparsed byte streams.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (!buffer || buffer.length === 0) return "";

  // 1. Primary: Use pdf-parse v2 PDFParse class API
  try {
    const pdfModule = require("pdf-parse");
    const PDFParseClass = pdfModule.PDFParse || (pdfModule.default && pdfModule.default.PDFParse);
    if (typeof PDFParseClass === "function") {
      const parser = new PDFParseClass({ data: new Uint8Array(buffer) });
      const textResult = await parser.getText();
      if (parser.destroy) {
        await parser.destroy().catch(() => {});
      }
      const text = typeof textResult === "string" ? textResult : (textResult?.text || "");
      if (text && text.trim().length > 0) {
        return text;
      }
    }

    // 2. Legacy pdf-parse function API
    const parseFn = typeof pdfModule === "function" ? pdfModule : pdfModule.default;
    if (typeof parseFn === "function") {
      const pdfData = await parseFn(buffer);
      const text = typeof pdfData === "string" ? pdfData : (pdfData?.text || "");
      if (text && text.trim().length > 0) {
        return text;
      }
    }
  } catch (err: any) {
    console.warn("[PDFParser] Primary pdf-parse extraction failed:", err?.message || err);
  }

  // 3. Fallback: Extract text tokens from uncompressed PDF streams
  try {
    const latin1String = buffer.toString("latin1");
    const stringMatches: string[] = [];
    const literalRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|TJ|'|")/g;
    let match: RegExpExecArray | null;

    while ((match = literalRegex.exec(latin1String)) !== null) {
      if (match[1]) {
        const decoded = match[1]
          .replace(/\\\( /g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
        const trimmed = decoded.trim();
        if (trimmed.length > 0 && !/^[\x00-\x1F\x7F-\xFF]+$/.test(trimmed)) {
          stringMatches.push(trimmed);
        }
      }
    }

    if (stringMatches.length > 5) {
      return stringMatches.join(" ");
    }
  } catch (fallbackErr: any) {
    console.warn("[PDFParser] Fallback stream parsing failed:", fallbackErr?.message);
  }

  // NEVER return raw binary %PDF-1.5 bytes!
  return "";
}

export async function parseUploadedPDFBuffer(buffer: Buffer): Promise<ParsedPDFResult> {
  const cleanText = await extractPdfText(buffer);
  const lines = cleanText.split("\n").map(l => l.trim()).filter(Boolean);

  // Heuristic extractions
  const title = lines.slice(0, 3).join(" ").slice(0, 200) || "Uploaded Document";

  // Abstract extraction
  let abstract = "";
  const abstractMatch = cleanText.match(/abstract[\s:-]+([\s\S]*?)(?:1\.\s+introduction|introduction|keywords|1\s+introduction)/i);
  if (abstractMatch && abstractMatch[1]) {
    abstract = abstractMatch[1].trim().replace(/\s+/g, " ").slice(0, 1500);
  } else {
    abstract = lines.slice(3, 12).join(" ").slice(0, 800);
  }

  // Keywords extraction
  let keywords: string[] = [];
  const kwMatch = cleanText.match(/keywords[\s:-]+([^\n\r.]+)/i);
  if (kwMatch && kwMatch[1]) {
    keywords = kwMatch[1].split(/[,;]/).map(k => k.trim()).filter(Boolean).slice(0, 10);
  }

  // DOI extraction
  const doiMatch = cleanText.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
  const doi = doiMatch ? doiMatch[0] : undefined;

  // Year extraction
  const yearMatch = cleanText.match(/\b(19\d\d|20\d\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

  // References extraction
  const references: ParsedPDFResult["references"] = [];
  const refIndex = cleanText.toLowerCase().lastIndexOf("references");
  if (refIndex !== -1) {
    const refSection = cleanText.slice(refIndex);
    const refLines = refSection.split("\n").slice(1).filter(l => l.length > 10);
    for (let i = 0; i < Math.min(refLines.length, 25); i++) {
      const line = refLines[i];
      references.push({
        title: line.slice(0, 150),
        authors: [],
        year: year,
        rawText: line,
      });
    }
  }

  return {
    title,
    authors: ["Primary Author"],
    abstract,
    year,
    doi,
    keywords,
    references,
    rawText: cleanText.slice(0, 20000),
  };
}
