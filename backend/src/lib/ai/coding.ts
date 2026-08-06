import { generateJSON, generateText, MODELS, OpenRouterMessage } from "./openrouter";
import { env } from "../../config/env";

const CODING_SYSTEM = "You are an expert Senior Software Engineer. Provide production-ready code solutions.";

export async function generateCode(prompt: string) {
  return generateJSON(
    CODING_SYSTEM,
    `Generate complete, production-ready code for: "${prompt}"

Return JSON matching:
{
  "setupGuide": "Step by step instructions to run this code (markdown)",
  "folderStructure": "Visual tree of folder structure (markdown)",
  "code": "Complete source code implementation (markdown with codeblocks)"
}`,
    { model: MODELS.POWERFUL },
    {
      setupGuide: "An error occurred generating the setup guide.",
      folderStructure: "Error",
      code: "Error generating code.",
    }
  );
}

export async function generateMultiLanguageCode(prompt: string, languages: string[]) {
  const langList = languages.map(l => `"${l}"`).join(", ");

  interface LangResult {
    code: string;
    explanation: string;
    timeComplexity: string;
    spaceComplexity: string;
  }

  const fallback: Record<string, LangResult> = {};
  for (const lang of languages) {
    fallback[lang] = {
      code: `// Code generation failed for ${lang}. Please try again.`,
      explanation: "Failed to generate explanation.",
      timeComplexity: "N/A",
      spaceComplexity: "N/A",
    };
  }

  const systemPrompt = `You are a world-class polyglot software engineer and competitive programmer.
You must generate production-ready code in ALL requested programming languages for the given prompt.
Return ONLY valid JSON with this exact structure:
{
  "<language>": {
    "code": "complete runnable code as a string",
    "explanation": "brief explanation of the approach (1-2 sentences)",
    "timeComplexity": "Big-O time complexity",
    "spaceComplexity": "Big-O space complexity"
  }
}

Rules:
- Generate idiomatic, clean, well-structured code for each language
- Use standard library solutions, avoid external dependencies
- Include proper error handling where applicable
- Each language's code must be independently runnable
- Keep explanations concise but informative`;

  const userPrompt = `Generate code for: "${prompt}"

Languages requested: [${langList}]

Return JSON with keys for each language: ${langList}`;

  try {
    const result = await generateJSON<Record<string, LangResult>>(
      systemPrompt,
      userPrompt,
      { model: MODELS.POWERFUL, temperature: 0.5, maxTokens: 8000 },
      fallback
    );

    // Ensure all requested languages have results
    for (const lang of languages) {
      if (!result[lang]) {
        result[lang] = fallback[lang];
      }
    }

    return result;
  } catch {
    return fallback;
  }
}

export async function debugCode(errorMsg: string, codeSnippet: string) {
  return generateJSON(
    CODING_SYSTEM,
    `Debug this code:

Error: ${errorMsg}

Code:
${codeSnippet}

Return JSON matching:
{
  "issue": "Short summary of the issue",
  "rootCause": "Detailed explanation of why the error occurred",
  "fixedCode": "Corrected code (markdown with codeblocks)"
}`,
    { model: MODELS.CODE },
    {
      issue: "Could not parse issue",
      rootCause: "Could not parse root cause",
      fixedCode: "Could not generate fixed code",
    }
  );
}

export async function explainCode(codeSnippet: string) {
  return generateJSON(
    CODING_SYSTEM,
    `Explain this code in detail:

Code:
${codeSnippet}

Return JSON matching:
{
  "explanation": "Detailed line-by-line explanation (markdown)",
  "complexity": "Time and Space complexity"
}`,
    { model: MODELS.CODE },
    {
      explanation: "Could not generate explanation.",
      complexity: "Unknown",
    }
  );
}

export async function generateProject(projectName: string) {
  return generateJSON(
    CODING_SYSTEM,
    `Design a comprehensive project plan for: "${projectName}"

Return JSON matching:
{
  "architecture": "High level system architecture (markdown)",
  "techStack": ["list", "of", "technologies"],
  "folderStructure": "Project structure tree (markdown)",
  "features": ["list", "of", "core", "features"],
  "roadmap": ["Step 1", "Step 2", "Step 3"]
}`,
    { model: MODELS.POWERFUL },
    {
      architecture: "Error generating architecture",
      techStack: [],
      folderStructure: "Error",
      features: [],
      roadmap: [],
    }
  );
}

export async function streamCodingAssistant(
  messages: OpenRouterMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  const providers: Array<{ name: string; url: string; key: string; model: string }> = [];

  // 1. Gemini (primary for coding — latest flash models)
  const envGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (envGeminiKey) {
    providers.push({
      name: "Gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: envGeminiKey,
      model: "gemini-3.6-flash",
    });
  }

  // 2. OpenRouter (secondary)
  if (env.openrouterApiKey) {
    providers.push({
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: env.openrouterApiKey,
      model: "openai/gpt-4o-mini",
    });
  }

  // 3. Groq
  const envGroqKey = process.env.GROQ_API_KEY;
  if (envGroqKey) {
    providers.push({
      name: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: envGroqKey,
      model: "llama-3.3-70b-versatile",
    });
  }

  // 4. NVIDIA NIM (fallback only)
  if (env.nvidiaApiKey) {
    providers.push({
      name: "NVIDIA",
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      key: env.nvidiaApiKey,
      model: "z-ai/glm-5.2",
    });
  }

  if (providers.length === 0) {
    onError(new Error("No AI providers configured"));
    return;
  }

  for (const provider of providers) {
    try {
      const res = await fetch(provider.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.key}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.5,
          max_tokens: 8192,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown");
        throw new Error(`${provider.name} error ${res.status}: ${errText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {
            // skip malformed chunks
          }
        }
      }

      onDone();
      return;
    } catch (err: any) {
      console.warn(`[CodingAssistant] ${provider.name} failed: ${err.message}`);
      continue;
    }
  }

  onError(new Error("All AI providers failed for coding assistant stream"));
}
