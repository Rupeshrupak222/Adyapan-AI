import crypto from "crypto";
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

export async function scrapeCodeforcesProblem(externalId: string): Promise<{
  description?: string;
  inputSpecification?: string;
  outputSpecification?: string;
  timeLimit?: string;
  memoryLimit?: string;
  examples?: Array<{ input: string; output: string; explanation?: string }>;
  note?: string;
} | null> {
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

    const formatMathText = (txt: string) => {
      if (!txt) return "";
      return txt
        .replace(/\$\$([\s\S]*?)\$\$/g, "$1")
        .replace(/\$([^$]+)\$/g, "$1")
        .replace(/([a-zA-Z0-9]+)_\{([^}]+)\}/g, "$1[$2]")
        .replace(/([a-zA-Z0-9]+)_([a-zA-Z0-9])/g, "$1$2")
        .replace(/([a-zA-Z0-9]+)\^\{([^}]+)\}/g, "$1^$2")
        .replace(/\\le\b|\\leq\b/g, "≤")
        .replace(/\\ge\b|\\geq\b/g, "≥")
        .replace(/\\to\b|\\rightarrow\b/g, "→")
        .replace(/\\gets\b|\\leftarrow\b/g, "←")
        .replace(/\\neq\b|\\ne\b/g, "≠")
        .replace(/\\dots\b|\\cdots\b|\\ldots\b/g, "...")
        .replace(/\\cdot\b/g, "·")
        .replace(/\\infty\b/g, "∞")
        .replace(/\\times\b/g, "×")
        .replace(/\\pm\b/g, "±")
        .replace(/\\in\b/g, "∈")
        .replace(/\\sum\b/g, "Σ")
        .replace(/\\prod\b/g, "∏")
        .replace(/\\lfloor\s*([\s\S]*?)\s*\\rfloor/g, "⌊$1⌋")
        .replace(/\\ceil\s*([\s\S]*?)\s*\\rceil/g, "⌈$1⌉")
        .replace(/\\text\{([^}]+)\}/g, "$1")
        .replace(/\\mathrm\{([^}]+)\}/g, "$1")
        .replace(/\\mathbf\{([^}]+)\}/g, "$1")
        .replace(/\\mathbb\{([^}]+)\}/g, "$1")
        .replace(/\\/g, "");
    };

    const cleanText = (str: string) => {
      const rawClean = str
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/li>/gi, "\n")
        .replace(/<li>/gi, "\n• ")
        .replace(/<\/div>/gi, "\n")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/<\/?(div|p|span|a|ul|ol|li|sub|sup|pre|code|strong|b|em|i|table|tbody|tr|td|th|h1|h2|h3|h4|h5|h6)[^>]*>/gi, "")
        .replace(/\n\s*\n\s*\n+/g, "\n\n")
        .trim();
      return formatMathText(rawClean);
    };

    // Time & Memory limits
    const timeMatch = html.match(/class="time-limit"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i);
    const memoryMatch = html.match(/class="memory-limit"[^>]*>[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i);
    const timeLimit = timeMatch ? cleanText(timeMatch[1]) : "1 second";
    const memoryLimit = memoryMatch ? cleanText(memoryMatch[1]) : "256 megabytes";

    // Extract problem statement container
    const statementMatch = html.match(/class="problem-statement"[\s\S]*?>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<div/i) || html.match(/class="problem-statement"[\s\S]*?>([\s\S]*?)<\/div>\s*<div class="input-file"/i);
    
    // Description (between header and input-specification)
    let description = "";
    const descMatch = html.match(/<div class="header">[\s\S]*?<\/div>([\s\S]*?)<div class="input-specification">/i);
    if (descMatch) {
      description = cleanText(descMatch[1]);
    }

    // Input specification
    let inputSpecification = "";
    const inputMatch = html.match(/<div class="input-specification">[\s\S]*?<div class="section-title"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<div class="output-specification">/i);
    if (inputMatch) {
      inputSpecification = cleanText(inputMatch[1]);
    }

    // Output specification
    let outputSpecification = "";
    const outputMatch = html.match(/<div class="output-specification">[\s\S]*?<div class="section-title"[^>]*>[\s\S]*?<\/div>([\s\S]*?)(?:<div class="sample-tests">|<div class="sample-test">)/i);
    if (outputMatch) {
      outputSpecification = cleanText(outputMatch[1]);
    }

    // Sample test cases
    const sampleTestsMatch = html.match(/<div class="sample-test"[^>]*>([\s\S]*?)(?:<div class="note">|<\/div>\s*<\/div>\s*<\/div>\s*<\/div>)/i) || html.match(/class="sample-tests"[\s\S]*?>([\s\S]*?)(?:<div class="note">|<\/div>\s*<\/div>)/i);
    const examples: Array<{ input: string; output: string }> = [];

    if (sampleTestsMatch) {
      const samplesHtml = sampleTestsMatch[1];
      const inputs = Array.from(samplesHtml.matchAll(/class="input"[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi)).map(m => cleanText(m[1]));
      const outputs = Array.from(samplesHtml.matchAll(/class="output"[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>/gi)).map(m => cleanText(m[1]));

      for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
        examples.push({
          input: inputs[i],
          output: outputs[i]
        });
      }
    }

    // Note explanation
    let note = "";
    const noteMatch = html.match(/<div class="note">[\s\S]*?<div class="section-title"[^>]*>[\s\S]*?<\/div>([\s\S]*?)(?:<\/div>\s*<\/div>\s*<\/div>|$)/i);
    if (noteMatch) {
      note = cleanText(noteMatch[1]);
    }

    return {
      description,
      inputSpecification,
      outputSpecification,
      timeLimit,
      memoryLimit,
      examples,
      note
    };
  } catch (err) {
    console.error("[Codeforces Scraper] Error scraping problem:", err);
    return null;
  }
}
