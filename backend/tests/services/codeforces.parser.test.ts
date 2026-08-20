import * as cheerio from "cheerio";

// We need to import the helper functions. Since they're not directly exported
// from the public API, we'll replicate the logic for testing purposes,
// or we test via the exported scrapeCodeforcesProblem (mocked fetch).
// Instead, let's import and test htmlToMarkdown and preservePreText directly.
// They are exported at the bottom of codeforces.service.ts.

// Mock the database/config imports so the module loads in test
jest.mock("../../src/config/prisma", () => ({
  prisma: {
    codingQuestion: { upsert: jest.fn() },
    questionAIAnalysis: { findFirst: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock("../../src/config/env", () => ({
  env: {
    codeforces: { apiKey: "", apiSecret: "" },
    nodeEnv: "test",
  },
}));

// We need to get at the internal functions. Let's re-implement the helpers
// for unit testing. In production these are imported from the module.
// For test purposes, we'll test the core logic directly.

// ─── Re-import the helpers after mocking ────────────────────────────────────
// Since htmlToMarkdown and preservePreText are not in the module exports
// at build time (they're file-level functions), let's test them via
// ─── Import the helpers directly from the production module ─────────────────

import { htmlToMarkdown, preservePreText } from "../../src/services/codeforces.service";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("preservePreText", () => {
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    $ = cheerio.load("");
  });

  it("preserves newline structure from <br> tags", () => {
    const el = $("<pre>1 2 3<br>4 5 6<br>7 8 9</pre>");
    const result = preservePreText($, el);
    expect(result).toBe("1 2 3\n4 5 6\n7 8 9");
  });

  it("decodes HTML entities", () => {
    const el = $("<pre>a &lt; b &amp; c &gt; d</pre>");
    const result = preservePreText($, el);
    expect(result).toBe("a < b & c > d");
  });

  it("preserves whitespace in multi-line input", () => {
    const el = $("<pre>line1\nline2\n  indented line</pre>");
    const result = preservePreText($, el);
    expect(result).toBe("line1\nline2\n  indented line");
  });

  it("strips surrounding pre tags but keeps content", () => {
    const el = $("<pre class=\"test\">content here</pre>");
    const result = preservePreText($, el);
    expect(result).toBe("content here");
  });

  it("handles &nbsp; correctly", () => {
    const el = $("<pre>hello&nbsp;world</pre>");
    const result = preservePreText($, el);
    expect(result).toBe("hello world");
  });

  it("handles empty pre tag", () => {
    const el = $("<pre></pre>");
    const result = preservePreText($, el);
    expect(result).toBe("");
  });

  it("handles nested HTML inside pre", () => {
    const el = $("<pre>1 2 3<br/>4 5 6</pre>");
    const result = preservePreText($, el);
    expect(result).toBe("1 2 3\n4 5 6");
  });
});

describe("htmlToMarkdown", () => {
  let $: cheerio.CheerioAPI;

  beforeAll(() => {
    $ = cheerio.load("");
  });

  it("returns empty string for null/empty elements", () => {
    expect(htmlToMarkdown($, null)).toBe("");
    expect(htmlToMarkdown($, $("<div></div>").find("nonexistent"))).toBe("");
  });

  it("converts paragraphs to markdown", () => {
    const el = $("<div><p>First paragraph.</p><p>Second paragraph.</p></div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("First paragraph.");
    expect(result).toContain("Second paragraph.");
  });

  it("converts bold text", () => {
    const el = $("<div>This is <strong>bold</strong> text.</div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("**bold**");
  });

  it("converts italic text", () => {
    const el = $("<div>This is <em>italic</em> text.</div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("*italic*");
  });

  it("converts inline code", () => {
    const el = $("<div>Use <code>n</code> as input.</div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("`n`");
  });

  it("converts code blocks", () => {
    const el = $("<div><pre>console.log('hello');</pre></div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("```");
    expect(result).toContain("console.log('hello');");
  });

  it("converts unordered lists", () => {
    const el = $(
      "<div><ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul></div>"
    );
    const result = htmlToMarkdown($, el);
    expect(result).toContain("- Item 1");
    expect(result).toContain("- Item 2");
    expect(result).toContain("- Item 3");
  });

  it("converts ordered lists", () => {
    const el = $(
      "<div><ol><li>First</li><li>Second</li><li>Third</li></ol></div>"
    );
    const result = htmlToMarkdown($, el);
    expect(result).toContain("1. First");
    expect(result).toContain("2. Second");
    expect(result).toContain("3. Third");
  });

  it("converts links", () => {
    const el = $(
      '<div>Visit <a href="https://codeforces.com">Codeforces</a></div>'
    );
    const result = htmlToMarkdown($, el);
    expect(result).toContain("[Codeforces](https://codeforces.com)");
  });

  it("converts relative links with base URL", () => {
    const el = $(
      '<div><a href="/problemset/problem/1/A">Link</a></div>'
    );
    const result = htmlToMarkdown($, el);
    expect(result).toContain(
      "[Link](https://codeforces.com/problemset/problem/1/A)"
    );
  });

  it("converts images", () => {
    const el = $(
      '<div><img src="https://example.com/img.png" alt="Example Image" /></div>'
    );
    const result = htmlToMarkdown($, el);
    expect(result).toContain("![Example Image](https://example.com/img.png)");
  });

  it("converts subscripts", () => {
    const el = $("<div>a<sub>i</sub></div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("$_{i}$");
  });

  it("converts superscripts", () => {
    const el = $("<div>x<sup>2</sup></div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("$^{2}$");
  });

  it("converts headings", () => {
    const el = $("<div><h2>Section Title</h2></div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("## Section Title");
  });

  it("converts horizontal rules", () => {
    const el = $("<div>text<hr>more text</div>");
    const result = htmlToMarkdown($, el);
    expect(result).toContain("---");
  });

  it("converts tables", () => {
    const el = $(
      "<div><table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table></div>"
    );
    const result = htmlToMarkdown($, el);
    expect(result).toContain("|");
  });

  it("collapses multiple newlines", () => {
    const el = $(
      "<div><p>Para 1</p><p></p><p></p><p>Para 2</p></div>"
    );
    const result = htmlToMarkdown($, el);
    expect(result).not.toContain("\n\n\n");
  });
});

describe("Codeforces HTML parsing simulation", () => {
  it("parses a typical Codeforces problem page structure", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">A. Two Sum</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div>
          <p>Given two integers <em>a</em> and <em>b</em>, find their sum.</p>
        </div>
        <div class="input-specification">
          <div class="section-title">Input</div>
          <p>The input consists of two integers <code>a</code> and <code>b</code> (1 ≤ a, b ≤ 10<sup>9</sup>).</p>
        </div>
        <div class="output-specification">
          <div class="section-title">Output</div>
          <p>Print a single integer — the sum of <em>a</em> and <em>b</em>.</p>
        </div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input">
              <div class="title">Input</div>
              <pre>3 5</pre>
            </div>
            <div class="output">
              <div class="title">Output</div>
              <pre>8</pre>
            </div>
          </div>
          <div class="sample-test">
            <div class="input">
              <div class="title">Input</div>
              <pre>100 200</pre>
            </div>
            <div class="output">
              <div class="title">Output</div>
              <pre>300</pre>
            </div>
          </div>
        </div>
        <div class="note">
          <div class="section-title">Note</div>
          <p>In the first example, 3 + 5 = 8.</p>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    expect(problemDiv.length).toBe(1);

    const timeLimit = problemDiv.find(".time-limit div").first().text().trim();
    expect(timeLimit).toBe("1 second");

    const memLimit = problemDiv.find(".memory-limit div").first().text().trim();
    expect(memLimit).toBe("256 megabytes");

    const headerDiv = problemDiv.find(".header");
    const descDiv = headerDiv.nextAll("div").first();
    const description = htmlToMarkdown($, descDiv);
    expect(description).toContain("Given two integers");
    expect(description).toContain("find their sum");

    const inputSpecDiv = problemDiv.find(".input-specification");
    let inputContent = "";
    inputSpecDiv.contents().each((_, el) => {
      const node = $(el);
      if (!node.hasClass("section-title")) {
        inputContent += $.html(node);
      }
    });
    const inputSpec = htmlToMarkdown($, $("<div>").html(inputContent));
    expect(inputSpec).toContain("two integers");
    expect(inputSpec).toContain("`a`");

    const outputSpecDiv = problemDiv.find(".output-specification");
    let outputContent = "";
    outputSpecDiv.contents().each((_, el) => {
      const node = $(el);
      if (!node.hasClass("section-title")) {
        outputContent += $.html(node);
      }
    });
    const outputSpec = htmlToMarkdown($, $("<div>").html(outputContent));
    expect(outputSpec).toContain("Print a single integer");

    const sampleTestsDiv = problemDiv.find(".sample-tests");
    const examples: Array<{ input: string; output: string }> = [];

    sampleTestsDiv.find(".sample-test").each((_, sampleEl) => {
      const inputPre = $(sampleEl).find(".input pre");
      const outputPre = $(sampleEl).find(".output pre");
      if (inputPre.length && outputPre.length) {
        examples.push({
          input: preservePreText($, inputPre),
          output: preservePreText($, outputPre),
        });
      }
    });

    expect(examples).toHaveLength(2);
    expect(examples[0].input).toBe("3 5");
    expect(examples[0].output).toBe("8");
    expect(examples[1].input).toBe("100 200");
    expect(examples[1].output).toBe("300");
  });

  it("handles a problem with multiline input/output", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">B. Array Transform</div>
          <div class="time-limit">time limit per test<div>2 seconds</div></div>
          <div class="memory-limit">memory limit per test<div>512 megabytes</div></div>
        </div>
        <div><p>Transform the array.</p></div>
        <div class="input-specification">
          <div class="section-title">Input</div>
          <p>First line contains n. Second line contains n integers.</p>
        </div>
        <div class="output-specification">
          <div class="section-title">Output</div>
          <p>Output n integers.</p>
        </div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input">
              <div class="title">Input</div>
              <pre>5
1 2 3 4 5</pre>
            </div>
            <div class="output">
              <div class="title">Output</div>
              <pre>5 4 3 2 1</pre>
            </div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const sampleTestsDiv = problemDiv.find(".sample-tests");
    const examples: Array<{ input: string; output: string }> = [];

    sampleTestsDiv.find(".sample-test").each((_, sampleEl) => {
      const inputPre = $(sampleEl).find(".input pre");
      const outputPre = $(sampleEl).find(".output pre");
      if (inputPre.length && outputPre.length) {
        examples.push({
          input: preservePreText($, inputPre),
          output: preservePreText($, outputPre),
        });
      }
    });

    expect(examples).toHaveLength(1);
    expect(examples[0].input).toBe("5\n1 2 3 4 5");
    expect(examples[0].output).toBe("5 4 3 2 1");
  });

  it("handles a problem with special characters and LaTeX", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">C. Math Challenge</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div>
          <p>Given an array of <em>n</em> integers, find the maximum value of <code>a[i] XOR a[j]</code>.</p>
          <p>Output the result modulo 10<sup>9</sup> + 7.</p>
        </div>
        <div class="input-specification">
          <div class="section-title">Input</div>
          <p>1 ≤ n ≤ 10<sup>5</sup>, 0 ≤ a<sub>i</sub> ≤ 10<sup>9</sup></p>
        </div>
        <div class="output-specification">
          <div class="section-title">Output</div>
          <p>Print one integer.</p>
        </div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input">
              <div class="title">Input</div>
              <pre>3
1 2 3</pre>
            </div>
            <div class="output">
              <div class="title">Output</div>
              <pre>3</pre>
            </div>
          </div>
        </div>
        <div class="note">
          <div class="section-title">Note</div>
          <p>1 XOR 2 = 3, which is the maximum.</p>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");

    const headerDiv = problemDiv.find(".header");
    const descDiv = headerDiv.nextAll("div").first();
    const description = htmlToMarkdown($, descDiv);
    expect(description).toContain("XOR");
    expect(description).toContain("modulo");
    expect(description).toContain("^{9}");

    const noteDiv = problemDiv.find(".note");
    let noteContent = "";
    noteDiv.contents().each((_, el) => {
      const node = $(el);
      if (!node.hasClass("section-title")) {
        noteContent += $.html(node);
      }
    });
    const note = htmlToMarkdown($, $("<div>").html(noteContent));
    expect(note).toContain("XOR");
    expect(note).toContain("maximum");
  });

  it("handles problem with no note section", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">D. Simple</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div><p>Simple problem.</p></div>
        <div class="input-specification">
          <div class="section-title">Input</div>
          <p>One integer.</p>
        </div>
        <div class="output-specification">
          <div class="section-title">Output</div>
          <p>One integer.</p>
        </div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>1</pre></div>
            <div class="output"><div class="title">Output</div><pre>2</pre></div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const noteDiv = problemDiv.find(".note");
    expect(noteDiv.length).toBe(0);

    const timeLimit = problemDiv.find(".time-limit div").first().text().trim();
    expect(timeLimit).toBe("1 second");
  });

  it("handles a problem with 3+ sample test cases", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">E. Multiple Tests</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div><p>Multiple test cases.</p></div>
        <div class="input-specification"><div class="section-title">Input</div><p>Integer n.</p></div>
        <div class="output-specification"><div class="section-title">Output</div><p>Result.</p></div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>1</pre></div>
            <div class="output"><div class="title">Output</div><pre>1</pre></div>
          </div>
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>2</pre></div>
            <div class="output"><div class="title">Output</div><pre>4</pre></div>
          </div>
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>10</pre></div>
            <div class="output"><div class="title">Output</div><pre>100</pre></div>
          </div>
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>0</pre></div>
            <div class="output"><div class="title">Output</div><pre>0</pre></div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const sampleTestsDiv = problemDiv.find(".sample-tests");
    const examples: Array<{ input: string; output: string }> = [];

    sampleTestsDiv.find(".sample-test").each((_, sampleEl) => {
      const inputPre = $(sampleEl).find(".input pre");
      const outputPre = $(sampleEl).find(".output pre");
      if (inputPre.length && outputPre.length) {
        examples.push({
          input: preservePreText($, inputPre),
          output: preservePreText($, outputPre),
        });
      }
    });

    expect(examples).toHaveLength(4);
    expect(examples[0].input).toBe("1");
    expect(examples[0].output).toBe("1");
    expect(examples[3].input).toBe("0");
    expect(examples[3].output).toBe("0");
  });

  it("preserves significant whitespace in sample I/O", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">F. Grid</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div><p>Grid problem.</p></div>
        <div class="input-specification"><div class="section-title">Input</div><p>n x m grid.</p></div>
        <div class="output-specification"><div class="section-title">Output</div><p>Answer.</p></div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>3 3
1 2 3
4 5 6
7 8 9</pre></div>
            <div class="output"><div class="title">Output</div><pre>15</pre></div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const sampleTestsDiv = problemDiv.find(".sample-tests");
    const examples: Array<{ input: string; output: string }> = [];

    sampleTestsDiv.find(".sample-test").each((_, sampleEl) => {
      const inputPre = $(sampleEl).find(".input pre");
      const outputPre = $(sampleEl).find(".output pre");
      if (inputPre.length && outputPre.length) {
        examples.push({
          input: preservePreText($, inputPre),
          output: preservePreText($, outputPre),
        });
      }
    });

    expect(examples).toHaveLength(1);
    expect(examples[0].input).toBe("3 3\n1 2 3\n4 5 6\n7 8 9");
    expect(examples[0].output).toBe("15");
  });

  it("parses links inside problem description", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">G. Link Problem</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div><p>See <a href="https://en.wikipedia.org/wiki/XOR">XOR documentation</a> for details.</p></div>
        <div class="input-specification"><div class="section-title">Input</div><p>Integer.</p></div>
        <div class="output-specification"><div class="section-title">Output</div><p>Integer.</p></div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>1</pre></div>
            <div class="output"><div class="title">Output</div><pre>1</pre></div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const headerDiv = problemDiv.find(".header");
    const descDiv = headerDiv.nextAll("div").first();
    const description = htmlToMarkdown($, descDiv);
    expect(description).toContain(
      "[XOR documentation](https://en.wikipedia.org/wiki/XOR)"
    );
  });

  it("parses HTML entities in problem description", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">H. Entities</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div><p>Given x &amp; y where x &lt; y, compute x &gt; 0 &amp;&amp; y &gt; 0.</p></div>
        <div class="input-specification"><div class="section-title">Input</div><p>Two integers.</p></div>
        <div class="output-specification"><div class="section-title">Output</div><p>One integer.</p></div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>1 2</pre></div>
            <div class="output"><div class="title">Output</div><pre>0</pre></div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const headerDiv = problemDiv.find(".header");
    const descDiv = headerDiv.nextAll("div").first();
    const description = htmlToMarkdown($, descDiv);
    expect(description).toContain("x & y");
    expect(description).toContain("x < y");
    expect(description).toContain("x > 0");
  });

  it("handles empty description gracefully", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">I. Empty</div>
          <div class="time-limit">time limit per test<div>1 second</div></div>
          <div class="memory-limit">memory limit per test<div>256 megabytes</div></div>
        </div>
        <div></div>
        <div class="input-specification"><div class="section-title">Input</div><p>Integer.</p></div>
        <div class="output-specification"><div class="section-title">Output</div><p>Integer.</p></div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>1</pre></div>
            <div class="output"><div class="title">Output</div><pre>1</pre></div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const headerDiv = problemDiv.find(".header");
    const descDiv = headerDiv.nextAll("div").first();
    const description = htmlToMarkdown($, descDiv);
    expect(typeof description).toBe("string");
  });

  it("parses constraints from input specification", () => {
    const html = `
      <div class="problem-statement">
        <div class="header">
          <div class="title">J. Constraints</div>
          <div class="time-limit">time limit per test<div>2 seconds</div></div>
          <div class="memory-limit">memory limit per test<div>512 megabytes</div></div>
        </div>
        <div><p>Problem.</p></div>
        <div class="input-specification">
          <div class="section-title">Input</div>
          <p>1 ≤ n ≤ 10<sup>5</sup></p>
          <p>0 ≤ a<sub>i</sub> ≤ 10<sup>9</sup></p>
        </div>
        <div class="output-specification"><div class="section-title">Output</div><p>One integer.</p></div>
        <div class="sample-tests">
          <div class="sample-test">
            <div class="input"><div class="title">Input</div><pre>1</pre></div>
            <div class="output"><div class="title">Output</div><pre>1</pre></div>
          </div>
        </div>
      </div>
    `;

    const $ = cheerio.load(html);
    const problemDiv = $(".problem-statement");
    const constraintTexts: string[] = [];
    problemDiv.find(".input-specification p, .input-specification li").each((_, el) => {
      const t = $(el).text().trim();
      if (t) constraintTexts.push(t);
    });

    expect(constraintTexts.length).toBeGreaterThanOrEqual(2);
    expect(constraintTexts.some((c) => c.includes("10"))).toBe(true);
    expect(constraintTexts.some((c) => c.includes("n"))).toBe(true);
  });
});
