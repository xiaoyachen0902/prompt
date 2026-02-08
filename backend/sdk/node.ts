/**
 * Prompt Debug SDK for Node.js
 * 
 * Usage in your app:
 * 
 * import { PromptDebug } from './sdk/node';
 * const debug = new PromptDebug('http://localhost:3001');
 * 
 * const result = await openai.chat.completions.create(...);
 * await debug.capture({
 *   agentName: 'MyAgent',
 *   stepName: 'GenerateSummary',
 *   prompt: 'Summarize...',
 *   output: result.choices[0].message.content,
 *   promptTokens: result.usage.prompt_tokens,
 *   completionTokens: result.usage.completion_tokens,
 * });
 */

interface CaptureOptions {
  agentName: string;
  stepName: string;
  prompt: string;
  output?: string;
  input?: Record<string, string>;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  cost?: number;
  status?: "completed" | "failed";
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class PromptDebug {
  private baseURL: string;

  constructor(baseURL = "http://localhost:3001") {
    this.baseURL = baseURL;
  }

  async capture(options: CaptureOptions): Promise<{ runId: string; stepRunId: string; agentId: string }> {
    const res = await fetch(`${this.baseURL}/api/capture/step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    if (!res.ok) {
      throw new Error(`Capture failed: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Wrap OpenAI call with automatic capture
   */
  async withCapture<T>(
    agentName: string,
    stepName: string,
    prompt: string,
    fn: () => Promise<{ content: string; promptTokens: number; completionTokens: number }>,
    input?: Record<string, string>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const latencyMs = Date.now() - start;
      await this.capture({
        agentName,
        stepName,
        prompt,
        output: result.content,
        input,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs,
        status: "completed",
      });
      return result as unknown as T;
    } catch (err) {
      const latencyMs = Date.now() - start;
      await this.capture({
        agentName,
        stepName,
        prompt,
        input,
        latencyMs,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}
