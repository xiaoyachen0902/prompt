import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Play, RotateCcw, Share2, GitCompare, ThumbsUp, ThumbsDown, Minus, Home, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { api } from "@/api";
import type { Run } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptEditor } from "@/components/PromptEditor";
import { CompareRunsDialog } from "@/components/CompareRunsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/components/ui/use-toast";
import { useI18n } from "@/i18n/context";

export function RunView() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [run, setRun] = useState<Run | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState("");
  const [isReplaying, setIsReplaying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!runId) return;
    api.runs.get(runId).then((r) => {
      setRun(r);
      setNote(r.note ?? "");
      setTags(r.tags ?? "");
    }).catch(console.error);
  }, [runId]);

  useEffect(() => {
    if (!run) return;
    api.runs.list(run.agentId).then((r) => setRuns(r.runs));
  }, [run?.agentId]);

  const handleReplay = async (fromStepIndex?: number) => {
    if (!runId) return;
    setIsReplaying(true);
    try {
      toast({
        title: t("toast.replayStart"),
        description: t("toast.replayExec"),
        variant: "default",
      });
      const newRun = await api.runs.replay(runId, fromStepIndex);
      setRun(newRun);
      setSelectedStepIndex(fromStepIndex ?? 0);
      navigate(`/runs/${newRun.id}`, { replace: true });
      toast({
        title: t("toast.replaySuccess"),
        description: t("toast.replayCreated"),
        variant: "success",
      });
    } catch (error) {
      toast({
        title: t("toast.replayFailed"),
        description: error instanceof Error ? error.message : t("toast.unknownError"),
        variant: "error",
      });
    } finally {
      setIsReplaying(false);
    }
  };

  const handleShare = async () => {
    if (!runId) return;
    setIsSharing(true);
    try {
      const { shareToken } = await api.share.create(runId);
      const base = window.location.origin;
      const url = `${base}/r/${shareToken}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      toast({
        title: t("toast.shareCopied"),
        description: t("toast.shareCopiedDesc"),
        variant: "success",
      });
    } catch (error) {
      toast({
        title: t("toast.shareFailed"),
        description: error instanceof Error ? error.message : t("toast.unknownError"),
        variant: "error",
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!runId) return;
    try {
      const updated = await api.runs.annotate(runId, { rating: run?.rating === rating ? null : rating });
      setRun(updated);
      toast({
        title: t("toast.rateSaved"),
        variant: "success",
      });
    } catch (error) {
      toast({
        title: t("toast.rateFailed"),
        description: error instanceof Error ? error.message : t("toast.unknownError"),
        variant: "error",
      });
    }
  };

  const handleSaveNote = async () => {
    if (!runId) return;
    setIsSaving(true);
    try {
      const updated = await api.runs.annotate(runId, { note, tags });
      setRun(updated);
      toast({
        title: t("toast.noteSaved"),
        variant: "success",
      });
    } catch (error) {
      toast({
        title: t("toast.saveFailed"),
        description: error instanceof Error ? error.message : t("toast.unknownError"),
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!run) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{t("runView.loading")}</p>
      </div>
    );
  }

  const steps = Array.isArray(run.agent?.steps)
    ? [...run.agent.steps].sort((a, b) => a.orderIndex - b.orderIndex)
    : (run.stepRuns ?? []).map((sr) => sr.step).sort((a, b) => a.orderIndex - b.orderIndex);
  const stepRunsList = Array.isArray(run.stepRuns) ? run.stepRuns : [];
  const timelineItems = steps.map((step) => ({
    step,
    stepRun: stepRunsList.find((sr) => sr.orderIndex === step.orderIndex) ?? null,
  }));
  const selectedItem = selectedStepIndex >= 0 && selectedStepIndex < timelineItems.length ? timelineItems[selectedStepIndex]! : null;
  const selected = selectedItem?.stepRun ?? null;
  const selectedStep = selectedItem?.step ?? null;
  const isRunning = run.status === "running";

  function parseCheckResult(json: string | null): { ok: boolean; message?: string } | null {
    if (!json) return null;
    try {
      const o = JSON.parse(json) as { ok?: boolean; message?: string };
      return typeof o.ok === "boolean" ? { ok: o.ok, message: o.message } : null;
    } catch {
      return null;
    }
  }

  return (
    <div className="flex h-screen flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-2.5 lab-panel">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to="/"><Home className="h-3.5 w-3.5" /></Link>
          </Button>
          <div className="h-4 w-px bg-[hsl(var(--border))]" />
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link to={`/agents/${run.agent.id}`}><ArrowLeft className="h-3.5 w-3.5" /></Link>
          </Button>
          <span className="text-sm font-medium">{run.agent.name}</span>
          <span className={`lab-status-dot ${run.status === "completed" ? "success" : run.status === "failed" ? "error" : "warning pulse"}`} title={run.status} />
          <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">{run.status}</span>
          {run.stopReason != null && run.stopReason !== "" && (
            <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono" title={t("runView.stopReason")}>
              · {run.stopReason}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={() => setCompareOpen(true)} disabled={runs.length < 2 || isReplaying}>
            <GitCompare className="h-3.5 w-3.5" /> {t("runView.compare")}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleShare} disabled={isSharing || isReplaying}>
            {isSharing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("runView.generating")}
              </>
            ) : shareUrl ? (
              <>
                <Share2 className="h-4 w-4" /> {t("runView.copied")}
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> {t("runView.share")}
              </>
            )}
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleReplay()} disabled={isRunning || isReplaying}>
            {isReplaying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t("runView.replaying")}
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" /> {t("runView.replay")}
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 shrink-0 border-r overflow-y-auto lab-panel flex flex-col">
          <div className="p-3 border-b">
            <p className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t("runView.timeline")}</p>
          </div>
          <div className="p-2 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {timelineItems.map((item, i) => {
                const { step, stepRun } = item;
                const isSelected = selectedStepIndex === i;
                const check = stepRun ? parseCheckResult(stepRun.checkResult ?? null) : null;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedStepIndex(i)}
                      className={`w-full rounded px-2.5 py-2 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-[hsl(var(--primary))] text-white font-medium"
                          : stepRun
                            ? "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                            : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-mono ${
                            isSelected ? "bg-white/20 dark:bg-white/15" : "bg-[hsl(var(--muted))]"
                          }`}>
                            {step.orderIndex + 1}
                          </span>
                          <span className="flex-1 truncate">{step.name}</span>
                          {stepRun ? (
                            <>
                              {check != null && (
                                check.ok
                                  ? <span title={t("runView.checkPass")}><CheckCircle2 className="h-3 w-3 shrink-0 text-[hsl(var(--success))]" /></span>
                                  : <span title={t("runView.checkWarn")}><AlertCircle className="h-3 w-3 shrink-0 text-[hsl(var(--warning))]" /></span>
                              )}
                              <span className={`lab-status-dot shrink-0 ${
                                stepRun.status === "completed" ? "success" : stepRun.status === "failed" ? "error" : "warning pulse"
                              }`} />
                            </>
                          ) : (
                            <span className="text-[11px] shrink-0 opacity-70">{t("runView.skipped")}</span>
                          )}
                        </div>
                        {stepRun?.nextAction === "BRANCH" && stepRun.nextStepIndex != null && (
                          <div className={`ml-9 flex items-center gap-1 text-xs ${isSelected ? "text-white/80" : "text-[hsl(var(--muted-foreground))]"}`}>
                            <ArrowRight className="h-3 w-3" />
                            {t("runView.branchTo", { n: String(stepRun.nextStepIndex + 1) })}
                          </div>
                        )}
                        {stepRun && (stepRun.model || stepRun.temperature !== null || stepRun.maxTokens) && (
                          <div className={`ml-9 text-xs flex items-center gap-2 ${isSelected ? "text-white/80" : "text-[hsl(var(--muted-foreground))]"}`}>
                            {stepRun.model && <span className="font-mono">{stepRun.model}</span>}
                            {stepRun.temperature != null && <span>T={stepRun.temperature}</span>}
                            {stepRun.maxTokens && <span>Max={stepRun.maxTokens}</span>}
                          </div>
                        )}
                      </div>
                    </button>
                    {i < timelineItems.length - 1 && (
                      <div className="ml-4 h-2 w-px bg-[hsl(var(--border))]" />
                    )}
                  </li>
                );
              })}
            </ul>
            {timelineItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full justify-start"
                onClick={() => handleReplay(selectedStep != null ? selectedStep.orderIndex : 0)}
                disabled={isRunning || isReplaying}
              >
                {isReplaying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("runView.replaying")}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" /> {t("runView.replayFromHere")}
                  </>
                )}
              </Button>
            )}
          </div>
        </aside>

        <section className="flex-1 min-w-0 flex flex-col overflow-hidden lab-panel border-l">
          {selectedStep != null ? (
            selected ? (
            <>
              <div className="shrink-0 border-b px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{selected.step.name}</h3>
                  {(() => {
                    const check = parseCheckResult(selected.checkResult ?? null);
                    if (check != null) {
                      return check.ok
                        ? <span title={t("runView.checkPass")}><CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--success))]" /></span>
                        : <span title={check.message ?? t("runView.checkWarn")}><AlertCircle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" /></span>;
                    }
                    return null;
                  })()}
                </div>
                <span className="text-xs font-mono text-[hsl(var(--muted-foreground))]">
                  {selected.promptTokens + selected.completionTokens} tok · {selected.latencyMs}ms · ${selected.cost.toFixed(4)}
                </span>
              </div>
              <Tabs defaultValue="output" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <TabsList className="shrink-0 mx-3 mt-2 w-fit h-8 rounded border bg-transparent p-0.5 gap-0.5">
                  <TabsTrigger value="output" className="text-xs rounded px-3 data-[state=active]:bg-[hsl(var(--muted))]">{t("runView.output")}</TabsTrigger>
                  {selected.evaluation != null && selected.evaluation !== "" && (
                    <TabsTrigger value="evaluation" className="text-xs rounded px-3 data-[state=active]:bg-[hsl(var(--muted))]">{t("runView.evaluation")}</TabsTrigger>
                  )}
                  <TabsTrigger value="prompt" className="text-xs rounded px-3 data-[state=active]:bg-[hsl(var(--muted))]">{t("runView.prompt")}</TabsTrigger>
                  <TabsTrigger value="input" className="text-xs rounded px-3 data-[state=active]:bg-[hsl(var(--muted))]">{t("runView.inputContext")}</TabsTrigger>
                </TabsList>
                <TabsContent value="output" className="flex-1 m-0 p-3 data-[state=inactive]:hidden overflow-hidden min-h-0">
                  <div className="h-full lab-code rounded overflow-hidden">
                    <PromptEditor
                      readOnly
                      value={selected.output ?? selected.errorMessage ?? "—"}
                      onChange={() => {}}
                      height="100%"
                    />
                  </div>
                </TabsContent>
                {selected.evaluation != null && selected.evaluation !== "" && (
                  <TabsContent value="evaluation" className="flex-1 m-0 p-3 data-[state=inactive]:hidden overflow-hidden min-h-0">
                    <div className="h-full lab-code rounded overflow-hidden bg-amber-50/30 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50">
                      <PromptEditor readOnly value={selected.evaluation} onChange={() => {}} height="100%" />
                    </div>
                  </TabsContent>
                )}
                <TabsContent value="prompt" className="flex-1 m-0 p-3 data-[state=inactive]:hidden overflow-hidden min-h-0">
                  <div className="h-full lab-code rounded overflow-hidden">
                    <PromptEditor readOnly value={selected.prompt} onChange={() => {}} height="100%" />
                  </div>
                </TabsContent>
                <TabsContent value="input" className="flex-1 m-0 p-3 data-[state=inactive]:hidden overflow-hidden min-h-0">
                  <div className="h-full lab-code rounded overflow-hidden">
                    <PromptEditor readOnly value={selected.input ?? "{}"} onChange={() => {}} height="100%" />
                  </div>
                </TabsContent>
              </Tabs>
              {(selected.nextAction != null || selected.decisionType != null || selected.decisionOutput != null) && (
                <details className="mx-3 mt-2 border rounded lab-panel-muted overflow-hidden">
                  <summary className="px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider cursor-pointer">{t("runView.decisionTrace")}</summary>
                  <div className="px-3 pb-3 pt-0 text-sm border-t">
                  {selected.decisionType != null && selected.decisionType !== "" && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t("runView.decisionType")}: <span className="font-mono">{selected.decisionType}</span>
                    </p>
                  )}
                  {selected.nextAction != null && (
                    <p className="font-medium text-[hsl(var(--foreground))] mt-1">
                      {t("runView.nextAction")} <span className="font-mono text-[hsl(var(--primary))]">{selected.nextAction}</span>
                      {selected.nextStepIndex != null && (
                        <span className="ml-2 text-[hsl(var(--muted-foreground))]">{t("runView.nextStep", { n: String(selected.nextStepIndex + 1) })}</span>
                      )}
                    </p>
                  )}
                  {selected.decisionInput != null && selected.decisionInput !== "" && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-[hsl(var(--muted-foreground))]">Input</summary>
                      <pre className="mt-1 text-xs text-[hsl(var(--muted-foreground))] whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                        {selected.decisionInput}
                      </pre>
                    </details>
                  )}
                  {selected.decisionOutput != null && selected.decisionOutput !== "" && (
                    <pre className="mt-2 text-xs font-mono text-[hsl(var(--muted-foreground))] whitespace-pre-wrap break-words bg-[hsl(var(--background))] p-2 rounded">
                      {selected.decisionOutput}
                    </pre>
                  )}
                  </div>
                </details>
              )}
            </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-6 text-sm text-[hsl(var(--muted-foreground))]">
                <span className="font-medium">{selectedStep?.name}</span>
                <span className="mt-2 px-3 py-1.5 rounded-md bg-[hsl(var(--muted))]">{t("runView.skipped")}</span>
              </div>
            )
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
              {t("runView.selectStep")}
            </div>
          )}
        </section>

        <aside className="w-60 shrink-0 flex flex-col border-l lab-panel-muted overflow-y-auto">
          <div className="p-3 border-b">
            <h3 className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t("runView.summary")}</h3>
          </div>
          <div className="p-3 space-y-2 text-sm">
            {run.stopReason != null && run.stopReason !== "" && (
              <div className="flex justify-between gap-2 py-1.5 border-b">
                <dt className="text-[hsl(var(--muted-foreground))]">{t("runView.stopReason")}</dt>
                <dd className="font-mono text-xs truncate">{run.stopReason}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2 py-1.5">
              <dt className="text-[hsl(var(--muted-foreground))]">{t("runView.tokens")}</dt>
              <dd className="font-mono text-xs">{run.totalTokens}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5">
              <dt className="text-[hsl(var(--muted-foreground))]">{t("runView.cost")}</dt>
              <dd className="font-mono text-xs text-[hsl(var(--success))]">${run.totalCost.toFixed(4)}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5">
              <dt className="text-[hsl(var(--muted-foreground))]">{t("runView.latency")}</dt>
              <dd className="font-mono text-xs">{run.totalLatencyMs}ms</dd>
            </div>
          </div>

            <div className="pt-3 mt-3 border-t">
              <h3 className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">{t("runView.rating")}</h3>
              <div className="flex gap-1">
                <button onClick={() => handleRate(-1)} className={`flex-1 p-2 rounded border transition-colors ${run.rating === -1 ? "border-[hsl(var(--error))] bg-[hsl(var(--error))]/10 text-[hsl(var(--error))]" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"}`}><ThumbsDown className="h-3.5 w-3.5 mx-auto" /></button>
                <button onClick={() => handleRate(0)} className={`flex-1 p-2 rounded border transition-colors ${run.rating === 0 ? "border-[hsl(var(--warning))] bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"}`}><Minus className="h-3.5 w-3.5 mx-auto" /></button>
                <button onClick={() => handleRate(1)} className={`flex-1 p-2 rounded border transition-colors ${run.rating === 1 ? "border-[hsl(var(--success))] bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"}`}><ThumbsUp className="h-3.5 w-3.5 mx-auto" /></button>
              </div>
            </div>
            <div className="pt-3 mt-3 border-t">
              <h3 className="text-[11px] font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-2">{t("runView.notesTags")}</h3>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("runView.addNotes")} className="w-full text-xs p-2 border rounded resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] bg-[hsl(var(--background))]" rows={3} />
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t("runView.tagsPlaceholder")} className="mt-2 w-full text-xs p-2 border rounded focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] bg-[hsl(var(--background))]" />
              <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleSaveNote} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("runView.saving")}
                  </>
                ) : (
                  t("runView.save")
                )}
              </Button>
            </div>

            <div className="pt-3 mt-3 border-t flex flex-col gap-1.5">
              <Button size="sm" variant="outline" className="w-full justify-center h-8 text-xs" onClick={() => handleReplay()} disabled={isRunning || isReplaying}>
                {isReplaying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("runView.replaying")}
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" /> {t("runView.replayRun")}
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} disabled={isSharing || isReplaying}>
                {isSharing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {t("runView.generating")}
                  </>
                ) : (
                  <>
                    <Share2 className="h-4 w-4" /> {t("runView.shareLink")}
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)} disabled={runs.length < 2 || isReplaying}>
                <GitCompare className="h-4 w-4" /> {t("runView.compareRuns")}
              </Button>
            </div>
            {shareUrl && (
              <p className="mt-3 px-3 py-2 rounded-md bg-[hsl(var(--success))]/10 text-sm text-[hsl(var(--success))] font-medium">
                {t("runView.linkCopied")}
              </p>
            )}
        </aside>
      </div>

      <CompareRunsDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        currentRun={run}
        runs={runs.filter((r) => r.id !== run.id)}
      />
    </div>
  );
}
