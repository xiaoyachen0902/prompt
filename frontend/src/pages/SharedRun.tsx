import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/api";
import type { Run } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptEditor } from "@/components/PromptEditor";
import { useI18n } from "@/i18n/context";

export function SharedRun() {
  const { token } = useParams();
  const { t } = useI18n();
  const [run, setRun] = useState<Run | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);

  useEffect(() => {
    if (!token) return;
    api.share.getByToken(token).then(setRun).catch(console.error);
  }, [token]);

  if (!run) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t("shared.loading")}</p>
      </div>
    );
  }

  const stepRuns = run.stepRuns;
  const selected = stepRuns[selectedStepIndex];

  return (
    <div className="flex h-screen flex-col bg-[hsl(var(--background))]">
      <header className="flex shrink-0 items-center justify-between border-b border-[hsl(var(--border))] lab-panel px-4 py-2">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="text-sm font-medium">{run.agent.name}</span>
          <span className="rounded bg-[hsl(var(--muted))] px-2 py-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            {t("shared.shared")} · {run.status}
          </span>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r border-[hsl(var(--border))] lab-panel overflow-y-auto">
          <div className="p-2">
            <p className="mb-2 px-2 text-xs font-medium text-[hsl(var(--muted-foreground))]">{t("shared.steps")}</p>
            <ul className="space-y-0.5">
              {stepRuns.map((sr, i) => (
                <li key={sr.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStepIndex(i)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                      selectedStepIndex === i ? "bg-[hsl(var(--accent))] font-medium" : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {i + 1}. {sr.step.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col border-r border-[hsl(var(--border))] lab-panel">
          {selected ? (
            <>
              <div className="border-b border-[hsl(var(--border))] px-3 py-2">
                <h3 className="text-sm font-medium">{selected.step.name}</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  {selected.promptTokens + selected.completionTokens} tokens · {selected.latencyMs}ms
                </p>
              </div>
              <Tabs defaultValue="output" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-3 mt-2 w-fit shrink-0">
                  <TabsTrigger value="output">{t("runView.output")}</TabsTrigger>
                  <TabsTrigger value="prompt">{t("runView.prompt")}</TabsTrigger>
                </TabsList>
                <TabsContent value="output" className="flex-1 min-h-0 m-0 p-3 data-[state=inactive]:hidden flex flex-col">
                  <div className="flex-1 rounded-md border border-[hsl(var(--border))] overflow-hidden">
                    <PromptEditor readOnly value={selected.output ?? "—"} height="100%" />
                  </div>
                </TabsContent>
                <TabsContent value="prompt" className="flex-1 min-h-0 m-0 p-3 data-[state=inactive]:hidden flex flex-col">
                  <div className="flex-1 rounded-md border border-[hsl(var(--border))] overflow-hidden">
                    <PromptEditor readOnly value={selected.prompt} height="100%" />
                  </div>
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </section>

        <aside className="w-64 shrink-0 p-4 lab-panel-muted">
          <h3 className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-3">{t("runView.summary")}</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[hsl(var(--muted-foreground))]">{t("runView.tokens")}</dt>
              <dd className="font-mono">{run.totalTokens}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[hsl(var(--muted-foreground))]">{t("runView.cost")}</dt>
              <dd className="font-mono">${run.totalCost.toFixed(4)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[hsl(var(--muted-foreground))]">{t("runView.latency")}</dt>
              <dd className="font-mono">{run.totalLatencyMs}ms</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
