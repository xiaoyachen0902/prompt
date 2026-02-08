import Editor from "@monaco-editor/react";
import { useTheme } from "@/theme";

interface PromptEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  /** Use "plaintext" for prompt templates to avoid markdown list auto-formatting (e.g. "1. " becoming numbered list). */
  language?: string;
}

export function PromptEditor({ value, onChange = () => {}, readOnly = false, height = "200px", language = "markdown" }: PromptEditorProps) {
  const { theme } = useTheme();
  return (
    <div className="rounded-md border border-[hsl(var(--border))] overflow-hidden" style={{ height: height === "100%" ? "100%" : undefined }}>
      <Editor
        height={height}
        defaultLanguage={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          wordWrap: "on",
          padding: { top: 12, bottom: 12 },
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: 13,
          formatOnType: false,
          formatOnPaste: false,
          quickSuggestions: false,
          wordBasedSuggestions: "off",
        }}
        theme={theme === "dark" ? "vs-dark" : "light"}
      />
    </div>
  );
}
