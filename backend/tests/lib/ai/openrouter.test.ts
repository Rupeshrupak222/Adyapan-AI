const ORIGINAL_ENV = process.env;

jest.mock("../../../src/config/env", () => ({
  env: {
    get nvidiaApiKey() { return process.env.NVIDIA_API_KEY ?? ""; },
    get nvidiaApiKeys() { const k = process.env.NVIDIA_API_KEY; return k ? [k] : []; },
    get openrouterApiKey() { return process.env.OPENROUTER_API_KEY ?? ""; },
    get groqApiKey() { return process.env.GROQ_API_KEY ?? ""; },
    get geminiApiKey() { return process.env.GEMINI_API_KEY ?? ""; },
    get jwtSecret() { return process.env.JWT_SECRET ?? "replace-this-local-secret-before-production"; },
    get nodeEnv() { return process.env.NODE_ENV ?? "development"; }
  }
}));

jest.mock("../../../src/lib/ai/aiCache", () => ({
  getCachedAIResponse: () => null,
  setCachedAIResponse: () => {},
}));

function loadModule() {
  return require("../../../src/lib/ai/openrouter");
}

function mockFetchSuccess(content: string) {
  const body = JSON.stringify({ choices: [{ message: { content } }] });
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    text: async () => body,
    json: async () => ({ choices: [{ message: { content } }] }),
    headers: { get: () => null },
  });
}

function mockFetchError(status: number, errorMsg: string) {
  const body = JSON.stringify({ error: { message: errorMsg } });
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: "Error",
    text: async () => body,
    json: async () => ({ error: { message: errorMsg } }),
    headers: { get: () => null },
  });
}

function mockFetchReject(errorMsg: string) {
  (global as any).fetch = jest.fn().mockRejectedValue(new Error(errorMsg));
}

describe("openrouter constants", () => {
  it("exposes model presets", () => {
    const { MODELS } = loadModule();
    expect(typeof MODELS.FAST).toBe("string");
    expect(typeof MODELS.POWERFUL).toBe("string");
  });

  it("exposes a non-empty chat model catalogue with required fields", () => {
    const { CHAT_MODELS } = loadModule();
    expect(Array.isArray(CHAT_MODELS)).toBe(true);
    expect(CHAT_MODELS.length).toBeGreaterThan(0);
    for (const m of CHAT_MODELS) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.name).toBe("string");
      expect(typeof m.provider).toBe("string");
      expect(typeof m.cheap).toBe("boolean");
    }
  });
});

describe("generateJSON", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it("parses JSON wrapped in a markdown code fence", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess('```json\n{"answer": 42}\n```');
    await expect(
      generateJSON("sys", "user", { model: "x" }, { answer: 0 })
    ).resolves.toEqual({ answer: 42 });
  });

  it("extracts a JSON object embedded in surrounding prose", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess('Sure, here is the result: {"name": "ady"} hope it helps!');
    await expect(
      generateJSON("sys", "user", { model: "x" }, { name: "" })
    ).resolves.toEqual({ name: "ady" });
  });

  it("extracts a JSON array response", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess("[1, 2, 3]");
    await expect(generateJSON("sys", "user", { model: "x" }, [])).resolves.toEqual([1, 2, 3]);
  });

  it("extracts a JSON array wrapped inside an object", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess('{"questions": [{"text": "Q1"}]}');
    await expect(generateJSON("sys", "user", { model: "x" }, [])).resolves.toEqual([{ text: "Q1" }]);
  });

  it("repairs literal newlines inside string values", async () => {
    // A multi-line explanation is the single most common way a model emits
    // invalid JSON. A raw newline inside a quoted value is a hard syntax
    // error, so without a repair the whole batch is discarded.
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess(
      '{\n  "options": ["A", "B"],\n  "explanation": "first line\nsecond line\nthird line"\n}'
    );
    await expect(
      generateJSON("sys", "user", { model: "x" }, { options: [] as string[], explanation: "" })
    ).resolves.toEqual({
      options: ["A", "B"],
      explanation: "first line\nsecond line\nthird line",
    });
  }, 30000);

  it("repairs tabs and trailing commas together", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess('{"hint": "use\tthe\ttable", "list": [1, 2,],}');
    await expect(
      generateJSON("sys", "user", { model: "x" }, { hint: "", list: [] as number[] })
    ).resolves.toEqual({ hint: "use\tthe\ttable", list: [1, 2] });
  }, 30000);

  it("preserves escaped quotes and backslashes while repairing", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess('{"note": "path C:\\\\temp\nvalue is \\"quoted\\""}');
    await expect(
      generateJSON("sys", "user", { model: "x" }, { note: "" })
    ).resolves.toEqual({ note: 'path C:\\temp\nvalue is "quoted"' });
  }, 30000);

  it("neutralises backslashes that are not valid JSON escapes", async () => {
    // Regex fragments and LaTeX in a maths explanation both produce this.
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess('{"note": "match \\d+ digits", "rule": "50\\% of 3\\cdot 4"}');
    await expect(
      generateJSON("sys", "user", { model: "x" }, { note: "", rule: "" })
    ).resolves.toEqual({ note: "match \\d+ digits", rule: "50\\% of 3\\cdot 4" });
  }, 30000);

  it("keeps valid unicode escapes intact", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchSuccess('{"sym": "\\u00b2 \\u221a done"}');
    await expect(
      generateJSON("sys", "user", { model: "x" }, { sym: "" })
    ).resolves.toEqual({ sym: "\u00b2 \u221a done" });
  }, 30000);

  it("throws when all providers fail with network error", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchReject("network down");
    await expect(
      generateJSON("sys", "user", { model: "x" }, { fallback: true })
    ).rejects.toThrow(/AI extraction failed|all providers/);
  }, 120000);

  it("throws when the provider responds with an error and retries fail", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateJSON } = loadModule();
    mockFetchError(500, "Server Error");
    await expect(
      generateJSON("sys", "user", { model: "x" }, { x: 1 })
    ).rejects.toThrow(/AI extraction failed|all providers/);
  }, 120000);

  it("fails over to the next provider on 429 and succeeds", async () => {
    // The engine does NOT retry the same provider on 429 — it cools that
    // provider down and fails over to the next configured one. Configure two
    // providers so the first (429) hands off to the second (200).
    process.env.OPENROUTER_API_KEY = "key";
    process.env.GROQ_API_KEY = "groq-key";
    const { generateJSON } = loadModule();
    const retryBody = JSON.stringify({ error: { message: "rate limited" } });
    const successBody = JSON.stringify({ choices: [{ message: { content: '{"ok": true}' } }] });
    let callCount = 0;
    (global as any).fetch = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 429, statusText: "Too Many Requests", text: async () => retryBody, json: async () => ({ error: { message: "rate limited" } }), headers: { get: (h: string) => h === "retry-after" ? "1" : null } };
      }
      return { ok: true, status: 200, statusText: "OK", text: async () => successBody, json: async () => ({ choices: [{ message: { content: '{"ok": true}' } }] }), headers: { get: () => null } };
    });
    await expect(
      generateJSON("sys", "user", { model: "x" }, { ok: false })
    ).resolves.toEqual({ ok: true });
    expect(callCount).toBeGreaterThanOrEqual(2);
  }, 120000);
});

describe("generateText", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it("returns the raw completion content", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateText } = loadModule();
    mockFetchSuccess("Hello from the model");
    await expect(generateText("sys", "user", { model: "x" })).resolves.toBe("Hello from the model");
  });

  it("throws when all providers fail", async () => {
    process.env.OPENROUTER_API_KEY = "key";
    const { generateText } = loadModule();
    mockFetchReject("network down");
    await expect(generateText("sys", "user", { model: "x" })).rejects.toThrow(
      /All AI providers failed/
    );
  }, 120000);

  it("throws when no providers are configured", async () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NVIDIA_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.KIMI_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    const { generateText } = loadModule();
    await expect(generateText("sys", "user", { model: "x" })).rejects.toThrow(
      /No AI providers configured/
    );
  });
});
