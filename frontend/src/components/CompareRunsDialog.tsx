import { useState } from "react";
import * as Diff from "diff";
import type { Run } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";

interface CompareRunsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRun: Run;
  runs: Run[];
}

function renderDiff(a: string, b: string) {
  const changes = Diff.diffLines(a, b);
  return changes.map((part, i) => {
    const className = part.added ? "bg-green-200" : part.removed ? "bg-red-200" : "";
    const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
    return (
      <div key={i} className={className}>
        {part.value.split("\n").map((line, j) => (
          <div key={j} className="font-mono text-xs">
            {prefix}
            {line}
          </div>
        ))}
      </div>
    );
  });
}

export function CompareRunsDialog({ open, onOpenChange, currentRun, runs }: CompareRunsDialogProps) {
  const { t } = useI18n();
  const [otherRunId, setOtherRunId] = useState<string>("");
  const otherRun = runs.find((r) => r.id === otherRunId);
  const [activeTab, setActiveTab] = useState<"prompt" | "output">("output");
  const [stepIndex, setStepIndex] = useState(0);

  const currentStepRun = currentRun.stepRuns[stepIndex];
  const otherStepRun = otherRun?.stepRuns[stepIndex];
  const hasStep = currentStepRun && otherStepRun && currentStepRun.stepId === otherStepRun.stepId;

  const promptDiff =
    hasStep && activeTab === "prompt"
      ? renderDiff(currentStepRun.prompt, otherStepRun.prompt)
      : null;
  const outputDiff =
    hasStep && activeTab === "output"
      ? renderDiff(currentStepRun.output ?? "", otherStepRun.output ?? "")
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-4xl max-h-[85vh] flex flex-col" onPointerDownOutside={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>{t("compare.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div className="flex gap-4 items-center">
            <label className="text-sm text-[hsl(var(--muted-foreground))]">{t("compare.compareWith")}</label>
            <select
              value={otherRunId}
              onChange={(e) => setOtherRunId(e.target.value)}
              className="rounded-md border border-[hsl(var(--border))] bg-white px-3 py-1.5 text-sm"
            >
              <option value="">{t("compare.selectRun")}</option>
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  {new Date(r.createdAt).toLocaleString()} · ${r.totalCost.toFixed(4)}
                </option>
              ))}
            </select>
          </div>
          {otherRun && (
            <>
              <div className="flex gap-2">
                {["output", "prompt"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab as "prompt" | "output")}
                    className={`rounded px-3 py-1 text-sm ${
                      activeTab === tab ? "bg-[hsl(var(--accent))] font-medium" : "text-[hsl(var(--muted-foreground))]"
                    }`}
                  >
                    {tab === "output" ? t("compare.outputDiff") : t("compare.promptDiff")}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {currentRun.stepRuns.map((sr, i) => (
                  <button
                    key={sr.id}
                    type="button"
                    onClick={() => setStepIndex(i)}
                    className={`shrink-0 rounded px-2 py-1 text-xs ${
                      stepIndex === i ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--muted))]"
                    }`}
                  >
                    {sr.step.name}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0 rounded border border-[hsl(var(--border))] overflow-auto bg-[hsl(var(--muted))]/20 p-4">
                {hasStep ? (
                  <div className="text-xs whitespace-pre-wrap break-words">
                    {activeTab === "output" ? outputDiff : promptDiff}
                  </div>
                ) : (
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">
                    {t("compare.sameStepNotFound")}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("compare.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
