/**
 * Built-in model IDs for the step "Model" dropdown.
 * Backend uses OPENAI_BASE_URL to point to different providers (OpenAI / DeepSeek / compatible gateway).
 * This list only supplies candidate model strings; availability depends on deployment API config.
 */
export const BUILTIN_MODELS: { id: string; label: string }[] = [
  // OpenAI
  { id: "gpt-4o-mini", label: "GPT-4o Mini (OpenAI)" },
  { id: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo (OpenAI)" },
  { id: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (OpenAI)" },
  // DeepSeek (set OPENAI_BASE_URL e.g. https://api.deepseek.com/v1)
  { id: "deepseek-chat", label: "DeepSeek Chat" },
  { id: "deepseek-coder", label: "DeepSeek Coder" },
  // Google (compatible endpoint e.g. LiteLLM or third-party gateway)
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  // Other common compatible IDs, enable as needed
  { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (compatible endpoint)" },
  { id: "qwen-plus", label: "Qwen Plus" },
  { id: "qwen-turbo", label: "Qwen Turbo" },
];

export const DEFAULT_MODEL_ID = "gpt-4o-mini";

/** Whether this is a built-in option (not custom input) */
export function isBuiltinModel(modelId: string): boolean {
  return BUILTIN_MODELS.some((m) => m.id === modelId);
}
