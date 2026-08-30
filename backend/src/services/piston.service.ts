import { env } from "../config/env";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

// Strict env allowlist for native execution: user code must NOT inherit server
// secrets (DATABASE_URL, JWT_SECRET, API keys, etc.). Only the minimal set
// needed by language toolchains is forwarded.
const SANDBOX_ENV: Record<string, string | undefined> = {
  PATH: process.env.PATH,
  Path: process.env.Path,
  PATHEXT: process.env.PATHEXT,
  SYSTEMROOT: process.env.SYSTEMROOT,
  SYSTEMDRIVE: process.env.SYSTEMDRIVE,
  TEMP: process.env.TEMP || os.tmpdir(),
  TMP: process.env.TMP || os.tmpdir(),
  COMSPEC: process.env.COMSPEC,
  HOME: process.env.HOME,
  NODE_PATH: undefined,
  JAVA_TOOL_OPTIONS: undefined,
};

const MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB per stream cap

function runProcess(cmd: string, args: string[], opts: { cwd?: string; timeout?: number; stdin?: string }): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args, { cwd: opts.cwd, timeout: opts.timeout, env: SANDBOX_ENV, windowsHide: true });
      let stdout = "";
      let stderr = "";

      if (opts.stdin) {
        child.stdin.write(opts.stdin);
        child.stdin.end();
      }

      child.stdout.on("data", (d: Buffer) => { if (stdout.length < MAX_OUTPUT_BYTES) stdout += d.toString(); });
      child.stderr.on("data", (d: Buffer) => { if (stderr.length < MAX_OUTPUT_BYTES) stderr += d.toString(); });

      child.on("error", () => {
        resolve({ stdout: "", stderr: `Failed to spawn ${cmd}`, code: -1 });
      });

      child.on("close", (code) => {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? -1 });
      });
    } catch (err: any) {
      resolve({ stdout: "", stderr: err.message || "spawn failed", code: -1 });
    }
  });
}

function cleanup(dir: string) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

async function executeNativeCode(
  language: string,
  code: string,
  stdin: string = "",
  timeout: number = 10000
): Promise<ExecutionResult> {
  const norm = normalizeLanguage(language);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "adyapan-exec-"));
  const startTime = Date.now();

  try {
    // ── Interpreted languages ────────────────────────────────────────────
    if (norm === "python") {
      const filePath = path.join(tmpDir, "solution.py");
      fs.writeFileSync(filePath, code, "utf-8");
      const r = await runProcess("python", [filePath], { timeout, stdin });
      const elapsed = (Date.now() - startTime) / 1000;
      const success = r.code === 0;
      cleanup(tmpDir);
      return { stdout: r.stdout, stderr: r.stderr, compile_output: "", executionTime: elapsed, memory: 0, status: success ? "Accepted" : "Runtime Error", signal: null, success };
    }

    if (norm === "javascript" || norm === "typescript") {
      const filePath = path.join(tmpDir, "solution.js");
      fs.writeFileSync(filePath, code, "utf-8");
      const r = await runProcess("node", [filePath], { timeout, stdin });
      const elapsed = (Date.now() - startTime) / 1000;
      const success = r.code === 0;
      cleanup(tmpDir);
      return { stdout: r.stdout, stderr: r.stderr, compile_output: "", executionTime: elapsed, memory: 0, status: success ? "Accepted" : "Runtime Error", signal: null, success };
    }

    // ── Compiled: C++ ────────────────────────────────────────────────────
    if (norm === "c++" || norm === "c") {
      const ext = norm === "c++" ? "cpp" : "c";
      const srcPath = path.join(tmpDir, `solution.${ext}`);
      const binPath = path.join(tmpDir, norm === "c++" ? "solution.exe" : "solution.exe");
      fs.writeFileSync(srcPath, code, "utf-8");

      const compileCmd = norm === "c++" ? "g++" : "gcc";
      const compileFlags = norm === "c++" ? ["-o", binPath, srcPath, "-std=c++17", "-O2"] : ["-o", binPath, srcPath, "-std=c11", "-O2"];
      const comp = await runProcess(compileCmd, compileFlags, { cwd: tmpDir, timeout: timeout / 2 });
      if (comp.code !== 0) {
        cleanup(tmpDir);
        return { stdout: "", stderr: comp.stderr, compile_output: comp.stderr, executionTime: (Date.now() - startTime) / 1000, memory: 0, status: "Compilation Error", signal: null, success: false };
      }

      const run = await runProcess(binPath, [], { cwd: tmpDir, timeout: timeout / 2, stdin });
      const elapsed = (Date.now() - startTime) / 1000;
      const success = run.code === 0;
      cleanup(tmpDir);
      return { stdout: run.stdout, stderr: run.stderr, compile_output: comp.stderr || comp.stdout, executionTime: elapsed, memory: 0, status: success ? "Accepted" : "Runtime Error", signal: null, success };
    }

    // ── Compiled: Java ───────────────────────────────────────────────────
    if (norm === "java") {
      const className = "Solution";
      const srcPath = path.join(tmpDir, `${className}.java`);
      fs.writeFileSync(srcPath, code, "utf-8");

      const comp = await runProcess("javac", [srcPath], { cwd: tmpDir, timeout: timeout / 2 });
      if (comp.code !== 0) {
        cleanup(tmpDir);
        return { stdout: "", stderr: comp.stderr, compile_output: comp.stderr, executionTime: (Date.now() - startTime) / 1000, memory: 0, status: "Compilation Error", signal: null, success: false };
      }

      const run = await runProcess("java", ["-cp", tmpDir, className], { cwd: tmpDir, timeout: timeout / 2, stdin });
      const elapsed = (Date.now() - startTime) / 1000;
      const success = run.code === 0;
      cleanup(tmpDir);
      return { stdout: run.stdout, stderr: run.stderr, compile_output: comp.stderr || comp.stdout, executionTime: elapsed, memory: 0, status: success ? "Accepted" : "Runtime Error", signal: null, success };
    }

    // ── Unsupported language ─────────────────────────────────────────────
    cleanup(tmpDir);
    return {
      stdout: "",
      stderr: "",
      compile_output: `Native execution for "${language}" is not supported. Supported languages: Python, JavaScript, TypeScript, C++, C, Java. Install the corresponding compiler (g++, javac) or run a local Piston/Docker instance for additional languages.`,
      executionTime: 0,
      memory: 0,
      status: "Internal Error",
      signal: null,
      success: false,
    };
  } catch (err: any) {
    cleanup(tmpDir);
    return {
      stdout: "",
      stderr: err.message || "Native execution failed",
      compile_output: err.message || "Native execution failed",
      executionTime: 0,
      memory: 0,
      status: "Internal Error",
      signal: null,
      success: false,
    };
  }
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

  // Fallback to local native execution (Python / Node.js) if all Piston endpoints are offline/whitelisted.
  // Disabled in production AND unless explicitly opted in via ALLOW_NATIVE_EXEC=true:
  // native execution on the backend host is a critical privilege-escalation vector.
  if (env.nodeEnv === "production" || !env.allowNativeExec) {
    return {
      stdout: "",
      stderr: "Code execution is temporarily unavailable. Piston service is offline.",
      compile_output: "",
      executionTime: 0,
      memory: 0,
      status: "Internal Error",
      signal: null,
      success: false,
    };
  }
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

    // Line-by-line trimmed comparison (competitive programming style)
    const passed = execResult.success && compareOutputsStrict(actualOutput, expectedOutput);

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

/**
 * Competitive programming style output comparison:
 * - Trim each line individually
 * - Ignore trailing empty lines
 * - Exact match per line after trimming
 */
function compareOutputsStrict(actual: string, expected: string): boolean {
  const normalizeLines = (s: string): string[] =>
    s.split("\n").map(line => line.trimEnd()).join("\n").trim().split("\n");

  const actualLines = normalizeLines(actual);
  const expectedLines = normalizeLines(expected);

  if (actualLines.length !== expectedLines.length) return false;

  for (let i = 0; i < actualLines.length; i++) {
    if (actualLines[i].trim() !== expectedLines[i].trim()) return false;
  }

  return true;
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
