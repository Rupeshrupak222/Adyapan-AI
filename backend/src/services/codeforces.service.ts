import crypto from "crypto";
import * as cheerio from "cheerio";
import { prisma } from "../config/prisma";
import { env } from "../config/env";

// Signature helper for Codeforces API
function generateCodeforcesUrl(
  methodName: string,
  params: Record<string, string>,
  apiKey?: string,
  apiSecret?: string
): string {
  if (!apiKey || !apiSecret) {
    const queryParams = new URLSearchParams(params).toString();
    return `https://codeforces.com/api/${methodName}?${queryParams}`;
  }

  const time = Math.floor(Date.now() / 1000).toString();
  const allParams = { ...params, apiKey, time };

  const sortedKeys = Object.keys(allParams).sort();
  const sortedParamsArr = sortedKeys.map(
    (key) => `${key}=${allParams[key as keyof typeof allParams]}`
  );
  const sortedParamsStr = sortedParamsArr.join("&");

  const randChars = Math.random().toString(36).substring(2, 8).padStart(6, "0");
  const sigText = `${randChars}/${methodName}?${sortedParamsStr}#${apiSecret}`;
  const hash = crypto.createHash("sha512").update(sigText).digest("hex");
  const apiSig = `${randChars}${hash}`;

  return `https://codeforces.com/api/${methodName}?${sortedParamsStr}&apiSig=${apiSig}`;
}

// Map Codeforces tags/keywords to standard 19 DSA topics
export function mapTagsToTopic(tags: string[], title: string): string {
  const lowercaseTags = tags.map((t) => t.toLowerCase());
  const lowercaseTitle = title.toLowerCase();

  // 1. Tries
  if (lowercaseTags.includes("tries") || lowercaseTags.includes("trie") || lowercaseTitle.includes("trie")) {
    return "Tries";
  }
  // 2. BST (Binary Search Tree)
  if (lowercaseTitle.includes("bst") || lowercaseTitle.includes("binary search tree")) {
    return "BST";
  }
  // 3. Binary Trees
  if (lowercaseTitle.includes("binary tree")) {
    return "Binary Trees";
  }
  // 4. Trees
  if (lowercaseTags.includes("trees") || lowercaseTags.includes("tree") || lowercaseTitle.includes("tree")) {
    return "Trees";
  }
  // 5. Linked Lists
  if (
    lowercaseTags.includes("linked list") ||
    lowercaseTitle.includes("linked list") ||
    lowercaseTitle.includes("linkedlist") ||
    lowercaseTitle.includes("node list")
  ) {
    return "Linked Lists";
  }
  // 6. Sliding Window
  if (
    lowercaseTitle.includes("sliding window") ||
    lowercaseTags.includes("sliding window") ||
    (lowercaseTags.includes("two pointers") && lowercaseTitle.includes("window"))
  ) {
    return "Sliding Window";
  }
  // 7. Stacks
  if (lowercaseTags.includes("stacks") || lowercaseTitle.includes("stack") || lowercaseTags.includes("stack")) {
    return "Stacks";
  }
  // 8. Queues
  if (lowercaseTags.includes("queues") || lowercaseTitle.includes("queue") || lowercaseTags.includes("queue")) {
    return "Queues";
  }
  // 9. Heaps / Priority Queues
  if (
    lowercaseTags.includes("heap") ||
    lowercaseTags.includes("priority queue") ||
    lowercaseTitle.includes("heap") ||
    lowercaseTitle.includes("priority queue")
  ) {
    return "Heaps";
  }
  // 10. Dynamic Programming
  if (lowercaseTags.includes("dp") || lowercaseTags.includes("dynamic programming")) {
    return "Dynamic Programming";
  }
  // 11. Graphs
  if (
    lowercaseTags.includes("graphs") ||
    lowercaseTags.includes("dfs and similar") ||
    lowercaseTags.includes("shortest paths") ||
    lowercaseTags.includes("graph matchings") ||
    lowercaseTags.includes("flows") ||
    lowercaseTags.includes("trees") && lowercaseTags.includes("graphs")
  ) {
    return "Graphs";
  }
  // 12. Two Pointers
  if (lowercaseTags.includes("two pointers") || lowercaseTitle.includes("two pointers")) {
    return "Two Pointers";
  }
  // 13. Bit Manipulation
  if (lowercaseTags.includes("bitmasks") || lowercaseTags.includes("bit manipulation") || lowercaseTitle.includes("bitmask") || lowercaseTitle.includes("xor")) {
    return "Bit Manipulation";
  }
  // 14. Greedy
  if (lowercaseTags.includes("greedy")) {
    return "Greedy";
  }
  // 15. Recursion & Backtracking
  if (lowercaseTags.includes("backtracking") || lowercaseTitle.includes("backtrack")) {
    return "Backtracking";
  }
  if (
    lowercaseTags.includes("divide and conquer") ||
    lowercaseTitle.includes("recursion") ||
    lowercaseTitle.includes("recursive")
  ) {
    return "Recursion";
  }
  // 16. Hashing
  if (lowercaseTags.includes("hashing") || lowercaseTags.includes("hashes") || lowercaseTitle.includes("hash")) {
    return "Hashing";
  }
  // 17. Strings
  if (lowercaseTags.includes("strings") || lowercaseTags.includes("string suffix structures")) {
    return "Strings";
  }

  // 18. Default fallback to Arrays if it is array related
  if (lowercaseTags.includes("data structures") || lowercaseTags.includes("sortings") || lowercaseTitle.includes("array") || lowercaseTags.includes("binary search")) {
    return "Arrays";
  }

  return "Arrays";
}

// Map rating to standard difficulties
export function mapRatingToDifficulty(rating?: number): string {
  if (!rating) return "Easy";
  if (rating <= 1100) return "Easy";
  if (rating <= 1500) return "Medium";
  if (rating <= 1900) return "Hard";
  return "Expert";
}

// Generate premium placement tags based on Codeforces stats
export function generatePlacementTags(rating?: number, tags: string[] = []): string[] {
  const result: string[] = ["Core DSA"];

  if (!rating) {
    result.push("Beginner Friendly");
    return result;
  }

  if (rating <= 1000) {
    result.push("Beginner Friendly");
  }
  if (rating >= 1200 && rating <= 1600) {
    result.push("Interview Favorite");
  }
  if (rating >= 1400 && rating <= 1900) {
    result.push("Placement Favorite");
  }
  if (rating >= 1800) {
    result.push("Must Solve");
  }
  if (tags.includes("implementation") || tags.includes("greedy") || tags.includes("dp")) {
    result.push("High Frequency");
  }

  return result;
}

export class CodeforcesService {
  /**
   * Syncs latest problems from Codeforces and stores/updates in database.
   * Limits total questions synced to ~600 to 800 distributed across topics
   * to ensure database remains compact and all explorer topics are populated.
   */
  static async syncProblems(): Promise<{ success: boolean; syncedCount: number }> {
    const apiKey = env.codeforces.apiKey;
    const apiSecret = env.codeforces.apiSecret;

    
    try {
      const url = generateCodeforcesUrl("problemset.problems", {}, apiKey, apiSecret);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Codeforces API responded with HTTP status ${response.status}`);
      }

      const data = (await response.json()) as any;
      if (data.status !== "OK") {
        throw new Error(`Codeforces API returned error status: ${data.comment || "Unknown"}`);
      }

      const rawProblems = data.result.problems || [];
      const stats = data.result.problemStatistics || [];

      // Filter: only programming type, with rating, and rating between 800 and 2600
      const filtered = rawProblems.filter(
        (p: any) => p.type === "PROGRAMMING" && p.rating && p.rating >= 800 && p.rating <= 2600
      );

      // Create topic buckets to distribute problems evenly (max 45 questions per topic)
      const topicBuckets: Record<string, any[]> = {};
      
      for (const p of filtered) {
        const title = p.name;
        const topic = mapTagsToTopic(p.tags || [], title);
        
        if (!topicBuckets[topic]) {
          topicBuckets[topic] = [];
        }
        
        const externalId = `${p.contestId}-${p.index}`;
        const stat = stats.find((s: any) => s.contestId === p.contestId && s.index === p.index);
        const solvedCount = stat ? stat.solvedCount : 0;
        
        topicBuckets[topic].push({
          externalId,
          source: "codeforces",
          title,
          problemUrl: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
          difficulty: mapRatingToDifficulty(p.rating),
          rating: p.rating,
          topic,
          tagsJson: generatePlacementTags(p.rating, p.tags),
          // placementImportance is true if high frequency / placement fav
          placementImportance: p.rating >= 1200 && p.rating <= 1800,
          interviewImportance: p.rating >= 1400 && p.rating <= 2000,
          solvedCount
        });
      }

      // Flatten buckets
      const problemsToSync: any[] = [];
      for (const topic in topicBuckets) {
        problemsToSync.push(...topicBuckets[topic]);
      }

      // Perform batch upserts in master DB
      let count = 0;
      for (const p of problemsToSync) {
        try {
          await prisma.codingQuestion.upsert({
            where: { externalId: p.externalId },
            update: {
              title: p.title,
              problemUrl: p.problemUrl,
              difficulty: p.difficulty,
              rating: p.rating,
              topic: p.topic,
              tagsJson: p.tagsJson,
              placementImportance: p.placementImportance,
              interviewImportance: p.interviewImportance
            },
            create: {
              externalId: p.externalId,
              source: p.source,
              title: p.title,
              problemUrl: p.problemUrl,
              difficulty: p.difficulty,
              rating: p.rating,
              topic: p.topic,
              tagsJson: p.tagsJson,
              placementImportance: p.placementImportance,
              interviewImportance: p.interviewImportance
            }
          });
          count++;
        } catch (dbErr: any) {
          console.error(`[Codeforces] Failed to upsert problem ${p.externalId}:`, dbErr.message || dbErr);
        }
      }

      return { success: true, syncedCount: count };

    } catch (err: any) {
      console.error("[Codeforces] Sync error:", err.message || err);
      return { success: false, syncedCount: 0 };
    }
  }
}

export interface ScrapedProblemData {
  description?: string;
  inputSpecification?: string;
  outputSpecification?: string;
  timeLimit?: string;
  memoryLimit?: string;
  constraints?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  note?: string;
}

const scrapeCache = new Map<string, { data: ScrapedProblemData; timestamp: number }>();
const SCRAPE_CACHE_TTL = 30 * 60 * 1000;

export async function scrapeCodeforcesProblem(externalId: string): Promise<ScrapedProblemData | null> {
  const cached = scrapeCache.get(externalId);
  if (cached && Date.now() - cached.timestamp < SCRAPE_CACHE_TTL) {
    return cached.data;
  }

  try {
    const parts = externalId.split("-");
    if (parts.length !== 2) return null;
    const [contestId, index] = parts;
    const url = `https://codeforces.com/problemset/problem/${contestId}/${index}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) return null;
    const html = await response.text();

    const $ = cheerio.load(html);

    const problemDiv = $(".problem-statement");
    if (!problemDiv.length) return null;

    const timeLimit = problemDiv.find(".time-limit div").first().text().trim() || "1 second";
    const memoryLimit = problemDiv.find(".memory-limit div").first().text().trim() || "256 megabytes";

    const headerDiv = problemDiv.find(".header");
    const descDiv = headerDiv.nextAll("div").first();

    const description = htmlToMarkdown($, descDiv);

    const inputSpecDiv = problemDiv.find(".input-specification");
    const inputSpecification = inputSpecDiv.length
      ? htmlToMarkdown($, inputSpecDiv.children("div").not(".section-title").addBack().filter(".input-specification > :not(.section-title)"))
      : "";
    const inputSpecificationClean = inputSpecDiv.length
      ? (() => {
          const sectionTitle = inputSpecDiv.find(".section-title").text().trim();
          let content = "";
          inputSpecDiv.contents().each((_, el) => {
            const node = $(el);
            if (!node.hasClass("section-title")) {
              content += $.html(node);
            }
          });
          const result = htmlToMarkdown($, $("<div>").html(content));
          return result;
        })()
      : "";

    const outputSpecDiv = problemDiv.find(".output-specification");
    const outputSpecification = outputSpecDiv.length
      ? (() => {
          let content = "";
          outputSpecDiv.contents().each((_, el) => {
            const node = $(el);
            if (!node.hasClass("section-title")) {
              content += $.html(node);
            }
          });
          return htmlToMarkdown($, $("<div>").html(content));
        })()
      : "";

    const examples: Array<{ input: string; output: string; explanation?: string }> = [];
    const sampleTestsDiv = problemDiv.find(".sample-tests");
    if (sampleTestsDiv.length) {
      const inputs: any[] = [];
      const outputs: any[] = [];

      sampleTestsDiv.find(".input").each((_, inEl) => {
        inputs.push(inEl);
      });
      sampleTestsDiv.find(".output").each((_, outEl) => {
        outputs.push(outEl);
      });

      const count = Math.min(inputs.length, outputs.length);
      for (let i = 0; i < count; i++) {
        const inTxt = preservePreText($, $(inputs[i]));
        const outTxt = preservePreText($, $(outputs[i]));
        if (inTxt && outTxt) {
          const split = splitMultiTestCaseExample({ input: inTxt, output: outTxt });
          examples.push(...split);
        }
      }
    }

    const noteDiv = problemDiv.find(".note");
    let note = "";
    if (noteDiv.length) {
      let noteContent = "";
      noteDiv.contents().each((_, el) => {
        const node = $(el);
        if (!node.hasClass("section-title")) {
          noteContent += $.html(node);
        }
      });
      note = htmlToMarkdown($, $("<div>").html(noteContent));
    }

    const constraintTexts: string[] = [];
    problemDiv.find(".input-specification p, .input-specification li").each((_, el) => {
      const t = $(el).text().trim();
      if (t) constraintTexts.push(t);
    });

    const result: ScrapedProblemData = {
      description,
      inputSpecification: inputSpecificationClean || inputSpecification,
      outputSpecification,
      timeLimit,
      memoryLimit,
      constraints: constraintTexts.join("\n"),
      examples,
      note
    };

    scrapeCache.set(externalId, { data: result, timestamp: Date.now() });

    return result;
  } catch (err) {
    console.error("[Codeforces Scraper] Error scraping problem:", err);
    return null;
  }
}

function preservePreText($: cheerio.CheerioAPI, el: any): string {
  if (!el || !el.length) return "";

  const clone = $(el).clone();
  // Remove title header if present (e.g. <div class="title">Input</div>)
  clone.find(".title").remove();

  // If there are .test-example-line elements, extract each line cleanly
  const testLines = clone.find(".test-example-line");
  if (testLines.length > 0) {
    const lines: string[] = [];
    testLines.each((_, lineEl) => {
      lines.push($(lineEl).text().trim());
    });
    const result = lines.filter(Boolean).join("\n");
    if (result.length > 0) return result;
  }

  // If pre element is present inside, take that
  const pre = clone.is("pre") ? clone : (clone.find("pre").length ? clone.find("pre").first() : clone);

  const rawHtml = $.html(pre);
  let text = rawHtml
    .replace(/^<pre[^>]*>/i, "")
    .replace(/<\/pre>$/i, "")
    .trim();
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  return text
    .split("\n")
    .map(line => line.trimEnd())
    .join("\n")
    .trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function htmlToMarkdown($: cheerio.CheerioAPI, el: any): string {
  if (!el || !el.length) return "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processNode = (node: any): string => {
    if (node.type === "text") {
      return node.data || "";
    }
    if (node.type !== "tag" || !node.attribs) return "";

    const tagName = (node.tagName || "").toLowerCase();
    const children = (node.children || []).map(processNode).join("");

    switch (tagName) {
      case "br":
        return "\n";
      case "p":
        return children.trim() + "\n\n";
      case "div":
        return children.trim() + "\n";
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const level = parseInt(tagName[1]);
        return "\n" + "#".repeat(level) + " " + children.trim() + "\n";
      }
      case "strong":
      case "b":
        return "**" + children + "**";
      case "em":
        return "*" + children + "*";
      case "code":
        return "`" + children + "`";
      case "pre":
        return "\n```\n" + children + "\n```\n";
      case "ul":
        return "\n" + children;
      case "ol":
        return "\n" + children;
      case "li": {
        const parent = node.parent;
        const isOrdered = parent && (parent.tagName || "").toLowerCase() === "ol";
        const siblings = parent ? (parent.children || []).filter((c: any) => c.type === "tag" && (c.tagName || "").toLowerCase() === "li") : [];
        const idx = siblings.indexOf(node);
        return (isOrdered ? `${idx + 1}. ` : "- ") + children.trim() + "\n";
      }
      case "sub":
        return "$_{" + children + "}$";
      case "sup":
        return "$^{" + children + "}$";
      case "a": {
        const href = node.attribs.href || "";
        const linkText = children.trim();
        if (href && linkText) {
          return `[${linkText}](${href.startsWith("http") ? href : `https://codeforces.com${href}`})`;
        }
        return linkText;
      }
      case "img": {
        const src = node.attribs.src || "";
        const alt = node.attribs.alt || "image";
        return `![${alt}](${src.startsWith("http") ? src : `https://codeforces.com${src}`})`;
      }
      case "table":
        return "\n" + children + "\n";
      case "thead":
      case "tbody":
        return children;
      case "tr":
        return "| " + children.replace(/\n$/, "") + " |\n";
      case "td":
      case "th":
        return children.trim().replace(/\|/g, "\\|") + " | ";
      case "hr":
        return "\n---\n";
      default:
        return children;
    }
  };

  const raw = el.toArray().map(processNode).join("");
  const md = raw
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return md;
}

export function splitMultiTestCaseExample(ex: { input: string; output: string; explanation?: string }): Array<{ input: string; output: string; explanation?: string }> {
  if (!ex || !ex.input || !ex.output) return [ex];

  const inRaw = ex.input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  const outRaw = ex.output.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  const inLines = inRaw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  const outLines = outRaw.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  if (inLines.length < 2 || outLines.length < 1) return [ex];

  // Check if first line is number of test cases T
  const firstLine = inLines[0].trim();
  if (!/^\d+$/.test(firstLine)) {
    return [ex];
  }

  const T = parseInt(firstLine, 10);
  if (T < 2 || T > 100) {
    return [ex];
  }

  const remainingInLines = inLines.slice(1);

  // Case 1: Number of output lines matches T exactly
  if (outLines.length === T) {
    // Subcase 1a: Even division of remaining input lines
    if (remainingInLines.length % T === 0) {
      const linesPerTest = remainingInLines.length / T;
      const result: Array<{ input: string; output: string; explanation?: string }> = [];
      for (let i = 0; i < T; i++) {
        const chunk = remainingInLines.slice(i * linesPerTest, (i + 1) * linesPerTest);
        result.push({
          input: `1\n${chunk.join("\n")}`,
          output: outLines[i],
          explanation: ex.explanation ? (i === 0 ? ex.explanation : undefined) : undefined,
        });
      }
      return result;
    }

    // Subcase 1b: Variable lines per test case (e.g. n followed by array of n elements)
    const testCaseInputs: string[][] = [];
    let curLines: string[] = [];
    let idx = 0;

    while (idx < remainingInLines.length) {
      const line = remainingInLines[idx];
      const tokens = line.split(/\s+/).filter(Boolean);

      // If we already have accumulated lines for current test case, check if we should finalize it
      if (curLines.length > 0) {
        const testCasesLeft = T - testCaseInputs.length;
        const linesLeft = remainingInLines.length - idx;

        if (testCasesLeft === linesLeft) {
          testCaseInputs.push(curLines);
          curLines = [line];
          idx++;
          continue;
        }
      }

      curLines.push(line);

      // Pattern A: line was a single integer n, and next line has >= n tokens
      if (tokens.length === 1 && /^\d+$/.test(tokens[0]) && idx + 1 < remainingInLines.length) {
        const expectedCount = parseInt(tokens[0], 10);
        const nextLine = remainingInLines[idx + 1];
        const nextTokens = nextLine.split(/\s+/).filter(Boolean);
        if (nextTokens.length >= expectedCount || expectedCount <= 20) {
          curLines.push(nextLine);
          idx += 2;
          testCaseInputs.push(curLines);
          curLines = [];
          continue;
        }
      }

      const testCasesLeft = T - testCaseInputs.length;
      const linesLeft = remainingInLines.length - (idx + 1);
      if (testCasesLeft > 1 && linesLeft >= testCasesLeft - 1 && curLines.length >= 1) {
        if (tokens.length >= 2 || curLines.length >= 2) {
          testCaseInputs.push(curLines);
          curLines = [];
        }
      }

      idx++;
    }

    if (curLines.length > 0) {
      testCaseInputs.push(curLines);
    }

    if (testCaseInputs.length === T) {
      const result: Array<{ input: string; output: string; explanation?: string }> = [];
      for (let i = 0; i < T; i++) {
        result.push({
          input: `1\n${testCaseInputs[i].join("\n")}`,
          output: outLines[i],
          explanation: ex.explanation ? (i === 0 ? ex.explanation : undefined) : undefined,
        });
      }
      return result;
    }
  }

  // Case 2: Output lines is divisible by T (e.g. multiple lines of output per test case)
  if (outLines.length % T === 0 && outLines.length > T) {
    const outPerTest = outLines.length / T;
    if (remainingInLines.length % T === 0) {
      const inPerTest = remainingInLines.length / T;
      const result: Array<{ input: string; output: string; explanation?: string }> = [];
      for (let i = 0; i < T; i++) {
        const inChunk = remainingInLines.slice(i * inPerTest, (i + 1) * inPerTest);
        const outChunk = outLines.slice(i * outPerTest, (i + 1) * outPerTest);
        result.push({
          input: `1\n${inChunk.join("\n")}`,
          output: outChunk.join("\n"),
          explanation: ex.explanation ? (i === 0 ? ex.explanation : undefined) : undefined,
        });
      }
      return result;
    }
  }

  return [ex];
}

export { htmlToMarkdown, preservePreText };
