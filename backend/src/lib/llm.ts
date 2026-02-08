import OpenAI from "openai";

const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const apiKey = process.env.OPENAI_API_KEY || "";
const model = process.env.MODEL || "gpt-4o-mini";

const client = new OpenAI({ apiKey, baseURL });

// Pricing (USD per 1K tokens). Unknown models fall back to 0 so cost display doesn't assume OpenAI.
function getModelPricing(model: string): { input: number; output: number } {
  const pricing: Record<string, { input: number; output: number }> = {
    // OpenAI
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4-turbo": { input: 0.001, output: 0.003 },
    "gpt-3.5-turbo": { input: 0.0005, output: 0.0015 },
    // DeepSeek (approximate)
    "deepseek-chat": { input: 0.00014, output: 0.00028 },
    "deepseek-coder": { input: 0.00014, output: 0.00028 },
    // Google Gemini (approximate)
    "gemini-1.5-pro": { input: 0.00125, output: 0.005 },
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
    "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
    // Alibaba Qwen
    "qwen-plus": { input: 0.0004, output: 0.0012 },
    "qwen-turbo": { input: 0.0002, output: 0.0006 },
  };
  return pricing[model] ?? { input: 0, output: 0 };
}

function calculateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = getModelPricing(model);
  return (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
}

export interface LLMResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  cost: number;
}

export async function callLLM(prompt: string, options?: {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<LLMResult> {
  const modelToUse = options?.model || model;
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens;

  const start = Date.now();
  const completion = await client.chat.completions.create({
    model: modelToUse,
    temperature,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const latencyMs = Date.now() - start;

  const choice = completion.choices[0];
  const content = choice?.message?.content ?? "";
  const promptTokens = completion.usage?.prompt_tokens ?? 0;
  const completionTokens = completion.usage?.completion_tokens ?? 0;

  const cost = calculateCost(modelToUse, promptTokens, completionTokens);

  return {
    content,
    promptTokens,
    completionTokens,
    latencyMs,
    cost,
  };
}

export function interpolateTemplate(template: string, context: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(context)) {
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return out;
}

/** Parse decision LLM output to: continue | retry | skip_next | branch | stop; branch carries nextStepIndex */
export function parseDecisionOutput(text: string): { action: string; nextStepIndex?: number } {
  const t = text.toUpperCase().trim();
  const branchMatch = t.match(/BRANCH\s*[:\s]*(\d+)/i);
  if (branchMatch) return { action: "branch", nextStepIndex: parseInt(branchMatch[1], 10) };
  if (/\bRETRY\b/.test(t)) return { action: "retry" };
  if (/\bSKIP_NEXT\b/.test(t)) return { action: "skip_next" };
  if (/\bSTOP\b/.test(t)) return { action: "stop" };
  return { action: "continue" };
}

/** Evaluate condition.if against output via LLM; returns yes/no. */
export async function evaluateCondition(
  output: string,
  conditionIf: string,
  options?: { model?: string; temperature?: number }
): Promise<boolean> {
  const prompt = `Given the following output:\n\n---\n${output.slice(0, 8000)}\n---\n\nCondition: ${conditionIf}\n\nDoes the condition hold? Answer with exactly one word: yes or no.`;
  const res = await callLLM(prompt, options);
  return /^\s*yes\s*$/i.test(res.content.trim());
}

export type StepChecks = {
  mustContain?: string;
  mustBeJson?: boolean;
  minLength?: number;
  maxLength?: number;
};

export type CheckResult = { ok: boolean; message?: string; details?: string };

/** Run step output checks (mustContain, mustBeJson, length range). Returns result to store on StepRun. */
export function runStepChecks(output: string, checks: StepChecks | null | undefined): CheckResult {
  if (!checks || typeof checks !== "object") return { ok: true };

  const issues: string[] = [];
  if (checks.mustContain != null && typeof checks.mustContain === "string") {
    if (!output.includes(checks.mustContain)) {
      issues.push(`Output must contain: "${checks.mustContain}"`);
    }
  }
  if (checks.mustBeJson === true) {
    try {
      JSON.parse(output);
    } catch {
      issues.push("Output must be valid JSON");
    }
  }
  const len = output.length;
  if (checks.minLength != null && typeof checks.minLength === "number") {
    if (len < checks.minLength) issues.push(`Length ${len} < minLength ${checks.minLength}`);
  }
  if (checks.maxLength != null && typeof checks.maxLength === "number") {
    if (len > checks.maxLength) issues.push(`Length ${len} > maxLength ${checks.maxLength}`);
  }

  const ok = issues.length === 0;
  return {
    ok,
    message: ok ? undefined : issues.join("; "),
    details: ok ? undefined : issues.join("\n"),
  };
}
