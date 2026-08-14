import { env } from "../config/env";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

async function executeNativeCode(
  language: string,
  code: string,
  stdin: string = "",
  timeout: number = 10000
): Promise<ExecutionResult> {
  const norm = normalizeLanguage(language);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "adyapan-exec-"));

  let cmd = "";
  let args: string[] = [];
  let filePath = "";

  if (norm === "python") {
    filePath = path.join(tmpDir, "solution.py");
    fs.writeFileSync(filePath, code, "utf-8");
    cmd = "python";
    args = [filePath];
  } else if (norm === "javascript" || norm === "typescript") {
    filePath = path.join(tmpDir, "solution.js");
    fs.writeFileSync(filePath, code, "utf-8");
    cmd = "node";
    args = [filePath];
  } else {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    return {
      stdout: "",
      stderr: "",
      compile_output: `Piston execution engine for ${language} requires Docker container to be active. Please ensure Docker Desktop is running.`,
      executionTime: 0,
      memory: 0,
      status: "Internal Error",
      signal: null,
      success: false,
    };
  }

  const startTime = Date.now();

  return new Promise<ExecutionResult>((resolve) => {
    try {
      const child = spawn(cmd, args, { timeout });
      let stdout = "";
      let stderr = "";

      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (err) => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        resolve({
          stdout: "",
          stderr: err.message,
          compile_output: `Failed to execute ${cmd}: ${err.message}`,
          executionTime: (Date.now() - startTime) / 1000,
          memory: 0,
          status: "Runtime Error",
          signal: null,
          success: false,
        });
      });

      child.on("close", (code) => {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        const executionTime = (Date.now() - startTime) / 1000;
        const success = code === 0;

        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          compile_output: stderr.trim(),
          executionTime,
          memory: 0,
          status: success ? "Accepted" : "Runtime Error",
          signal: null,
          success,
        });
      });
    } catch (err: any) {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
      resolve({
        stdout: "",
        stderr: err.message || "Native execution failed",
        compile_output: err.message || "Native execution failed",
        executionTime: 0,
        memory: 0,
        status: "Internal Error",
        signal: null,
        success: false,
      });
    }
  });
}

const LANGUAGE_MAP: Record<string, string> = {
  python: "python",
  python3: "python",
  py: "python",
  javascript: "javascript",
  js: "javascript",
  nodejs: "javascript",
  node: "javascript",
  c: "c",
  cpp: "c++",
  "c++": "c++",
  cplusplus: "c++",
  java: "java",
  typescript: "typescript",
  ts: "typescript",
  go: "go",
  rust: "rust",
  rb: "ruby",
  ruby: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  kotlin: "kotlin",
};

const VERSION_MAP: Record<string, string> = {
  python: "3.10.0",
  javascript: "18.15.0",
  c: "10.2.0",
  "c++": "10.2.0",
  java: "15.0.2",
  typescript: "5.0.3",
  go: "1.16.2",
  rust: "1.68.2",
  ruby: "3.0.1",
  php: "8.2.3",
  swift: "5.3.3",
  kotlin: "1.8.20",
};

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  compile_output: string;
  executionTime: number;
  memory: number;
  status: string;
  signal: string | null;
  success: boolean;
}

export interface TestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionResult: ExecutionResult;
}

export interface SubmissionResult {
  allPassed: boolean;
  testResults: TestCaseResult[];
  totalTests: number;
  passedTests: number;
  executionTime: number;
  memory: number;
}

function normalizeLanguage(lang: string): string {
  const lower = lang.toLowerCase().trim();
  return LANGUAGE_MAP[lower] || lower;
}

interface RuntimeInfo {
  language: string;
  version: string;
  aliases: string[];
}

let cachedRuntimes: { endpoint: string; runtimes: RuntimeInfo[] } | null = null;
let lastRuntimesFetch = 0;

function getApiBase(): string {
  const envUrl = process.env.PISTON_URL || "http://localhost:2000";
  const url = envUrl.replace(/\/+$/, "");
  if (url.includes("emkc.org")) {
    return `${url}/api/v2/piston`;
  }
  if (url.endsWith("/api/v2") || url.endsWith("/api/v2/piston")) {
    return url;
  }
  return `${url}/api/v2`;
}

function getCandidateEndpoints(): string[] {
  const primary = getApiBase();
  const candidates = [
    primary,
    "http://localhost:2000/api/v2",
    "http://127.0.0.1:2000/api/v2",
    "https://emkc.org/api/v2/piston",
    "https://piston.engineering/api/v2"
  ];
  return Array.from(new Set(candidates));
}

async function getInstalledRuntimes(): Promise<{ endpoint: string; runtimes: RuntimeInfo[] } | null> {
  const now = Date.now();
  if (cachedRuntimes && now - lastRuntimesFetch < 1800000) {
    return cachedRuntimes;
  }

  const endpoints = getCandidateEndpoints();

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${ep}/runtimes`, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const list = (await res.json()) as RuntimeInfo[];
        if (Array.isArray(list) && list.length > 0) {
          cachedRuntimes = { endpoint: ep, runtimes: list };
          lastRuntimesFetch = now;
          return cachedRuntimes;
        }
      }
    } catch {
      // try next candidate
    }
  }

  return null;
}

const FILE_EXTENSIONS: Record<string, string> = {
  python: ".py",
  javascript: ".js",
  c: ".c",
  "c++": ".cpp",
  java: ".java",
  typescript: ".ts",
  go: ".go",
  rust: ".rs",
  ruby: ".rb",
  php: ".php",
  swift: ".swift",
  kotlin: ".kt",
};

function getFileName(lang: string): string {
  const ext = FILE_EXTENSIONS[lang] || ".code";
  return `main${ext}`;
}

export async function executeCode(
  language: string,
  code: string,
  stdin: string = "",
  timeout: number = 10000
): Promise<ExecutionResult> {
  const pistonLang = normalizeLanguage(language);
  const runtimeInfo = await getInstalledRuntimes();

  let targetApi = getApiBase();
  let targetVersion = VERSION_MAP[pistonLang] || "*";

  if (runtimeInfo && runtimeInfo.runtimes.length > 0) {
    targetApi = runtimeInfo.endpoint;
    const match = runtimeInfo.runtimes.find(r => 
      r.language.toLowerCase() === pistonLang || 
      (r.aliases && r.aliases.map(a => a.toLowerCase()).includes(pistonLang))
    );
    if (match) {
      targetVersion = match.version;
    }
  }

  const payload: Record<string, unknown> = {
    language: pistonLang,
    version: targetVersion,
    files: [{ name: getFileName(pistonLang), content: code }],
  };

  if (stdin) {
    payload.stdin = stdin;
  }

  const endpointsToTry = Array.from(new Set([targetApi, ...getCandidateEndpoints()]));

  for (const ep of endpointsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(`${ep}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        continue; // Try next mirror endpoint if this one fails
      }

      const data = (await res.json()) as any;
      if (data.message && data.message.includes("whitelist")) {
        // Public API is whitelisted; try next candidate endpoint
        continue;
      }

      const compile = data.compile || {};
      const run = data.run || {};

      const stdout = run.stdout || "";
      const stderr = run.stderr || "";
      const compileOutput = compile.stderr || compile.stdout || "";
      const compileCode = compile.code;
      const runCode = run.code;
      const totalTime = run.wall_time || run.cpu_time || 0;

      const success = (compileCode === 0 || compileCode === null || compileCode === undefined) && runCode === 0;

      let status: string;
      if (success) {
        status = "Accepted";
      } else if (run.signal === "SIGKILL" || run.status === "TO") {
        status = "Time Limit Exceeded";
      } else if (compileCode !== 0 && compileCode !== null && compileCode !== undefined) {
        status = "Compilation Error";
      } else if (runCode !== 0) {
        status = run.stderr ? "Runtime Error" : `Exit Code ${runCode}`;
      } else {
        status = "Internal Error";
      }

      return {
        stdout,
        stderr,
        compile_output: compileOutput,
        executionTime: totalTime,
        memory: run.memory || 0,
        status,
        signal: run.signal || null,
        success,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        return {
          stdout: "",
          stderr: "",
          compile_output: `Execution timed out after ${timeout}ms`,
          executionTime: timeout,
          memory: 0,
          status: "Time Limit Exceeded",
          signal: null,
          success: false,
        };
      }
      // Continue to next mirror endpoint
    }
  }

  // Fallback to local native execution (Python / Node.js) if all Piston endpoints are offline/whitelisted
  return executeNativeCode(language, code, stdin, timeout);
}

export async function runTestCases(
  language: string,
  code: string,
  testCases: Array<{ input: string; expectedOutput: string }>,
  timeout: number = 10000
): Promise<SubmissionResult> {
  const results: TestCaseResult[] = [];
  let totalExecutionTime = 0;
  let maxMemory = 0;

  for (const tc of testCases) {
    const execResult = await executeCode(language, code, tc.input, timeout);

    const actualOutput = (execResult.stdout || "").trim();
    const expectedOutput = tc.expectedOutput.trim();

    const passed = execResult.success && actualOutput === expectedOutput;

    results.push({
      input: tc.input,
      expectedOutput,
      actualOutput,
      passed,
      executionResult: execResult,
    });

    totalExecutionTime += execResult.executionTime;
    maxMemory = Math.max(maxMemory, execResult.memory);
  }

  const passedTests = results.filter(r => r.passed).length;

  return {
    allPassed: passedTests === testCases.length,
    testResults: results,
    totalTests: testCases.length,
    passedTests,
    executionTime: totalExecutionTime,
    memory: maxMemory,
  };
}

export async function checkPistonHealth(): Promise<boolean> {
  try {
    const apiBase = getApiBase();
    const res = await fetch(`${apiBase}/runtimes`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
