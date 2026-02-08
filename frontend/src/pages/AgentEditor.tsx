import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { ArrowLeft, Play, Loader2 } from "lucide-react";
import { api } from "@/api";
import type { Agent, StepConditionIfElse } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { FlowEditor } from "@/components/FlowEditor";
import { toast } from "@/components/ui/use-toast";
import { useI18n } from "@/i18n/context";
import { DEFAULT_MODEL_ID } from "@/lib/models";

type StepForm = { 
  id?: string; 
  name: string; 
  promptTemplate: string; 
  orderIndex: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  showAdvanced?: boolean;
  stepType?: "action" | "reflection";
  decisionPrompt?: string;
  onCompleteDefault?: "continue" | "retry" | "skip_next" | "branch" | "stop";
  condition?: { if: string; then: string; else: string };
};

export function AgentEditor() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const isNew = agentId === "new" || !agentId;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([]);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      // Check if coming from template
      const state = location.state as { templateName?: string; templateSteps?: Array<{ name: string; promptTemplate: string }> } | null;
      if (state?.templateName && state?.templateSteps) {
        setName(state.templateName);
        setSteps(state.templateSteps.map((s, i) => ({ 
          name: s.name, 
          promptTemplate: s.promptTemplate, 
          orderIndex: i,
          model: DEFAULT_MODEL_ID,
          temperature: 0.7,
          showAdvanced: false,
        })));
      } else {
        setName(t("editor.newAgent"));
        setSteps([{ 
          name: "Step 1", 
          promptTemplate: "Hello, {{name}}!", 
          orderIndex: 0,
          model: DEFAULT_MODEL_ID,
          temperature: 0.7,
          showAdvanced: false,
        }]);
      }
      return;
    }
    api.agents
      .get(agentId!)
      .then((a) => {
        setAgent(a);
        setName(a.name);
        setSteps(
          a.steps.length
            ? a.steps.map((s, i) => {
                const cond = s.condition as { if?: string; then?: string; else?: string } | null;
                return {
                  id: s.id,
                  name: s.name,
                  promptTemplate: s.promptTemplate,
                  orderIndex: i,
                  model: s.model || DEFAULT_MODEL_ID,
                  temperature: s.temperature ?? 0.7,
                  maxTokens: s.maxTokens || undefined,
                  showAdvanced: false,
                  stepType: s.stepType ?? "action",
                  decisionPrompt: s.decisionPrompt ?? undefined,
                  onCompleteDefault: (s.onCompleteDefault as StepForm["onCompleteDefault"]) ?? undefined,
                  condition: cond?.if != null ? { if: cond.if, then: cond.then ?? "continue", else: cond.else ?? "continue" } : undefined,
                };
              })
            : [{ 
                name: "Step 1", 
                promptTemplate: "", 
                orderIndex: 0,
                model: DEFAULT_MODEL_ID,
                temperature: 0.7,
                showAdvanced: false,
              }]
        );
      })
      .catch((e) => setLoadError(e.message));
  }, [agentId, isNew, location.state]);

  const save = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.agents.create({
          name,
          steps: steps.map((s) => ({
            name: s.name,
            promptTemplate: s.promptTemplate,
            model: s.model,
            temperature: s.temperature,
            maxTokens: s.maxTokens,
            stepType: s.stepType,
            decisionPrompt: s.decisionPrompt,
            onCompleteDefault: s.onCompleteDefault,
            condition: s.condition?.if ? (s.condition as StepConditionIfElse) : undefined,
          })),
        });
        toast({ title: t("toast.saveSuccess"), variant: "success" });
        navigate(`/agents/${created.id}`, { replace: true });
        return;
      }
      await api.agents.update(agent!.id, {
        name,
        steps: steps.map((s, i) => ({
          id: s.id,
          name: s.name,
          promptTemplate: s.promptTemplate,
          model: s.model,
          temperature: s.temperature,
          maxTokens: s.maxTokens,
          orderIndex: i,
          stepType: s.stepType,
          decisionPrompt: s.decisionPrompt,
          onCompleteDefault: s.onCompleteDefault,
          condition: s.condition?.if ? (s.condition as StepConditionIfElse) : undefined,
        })),
      });
      setAgent(await api.agents.get(agent!.id));
      toast({ title: t("toast.saveSuccess"), variant: "success" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setLoadError(msg);
      toast({ title: t("toast.saveFailed"), description: msg, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const run = async () => {
    const id = isNew ? undefined : agent?.id;
    if (!id) {
      toast({ title: t("toast.createAndRun") });
      try {
        const created = await api.agents.create({
          name,
          steps: steps.map((s) => ({
            name: s.name,
            promptTemplate: s.promptTemplate,
            model: s.model,
            temperature: s.temperature,
            maxTokens: s.maxTokens,
          })),
        });
        const runResult = await api.runs.create({ agentId: created.id });
        toast({ title: t("toast.runStart"), variant: "success" });
        navigate(`/runs/${runResult.id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Run failed";
        toast({ title: t("toast.runFailed"), description: msg, variant: "error" });
      }
      return;
    }
    setRunning(true);
    toast({ title: t("toast.running") });
    try {
      const runResult = await api.runs.create({ agentId: id });
      toast({ title: t("toast.runStart"), variant: "success" });
      navigate(`/runs/${runResult.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Run failed";
      setLoadError(msg);
      toast({ title: t("toast.runFailed"), description: msg, variant: "error" });
    } finally {
      setRunning(false);
    }
  };

  if (loadError && !isNew) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] p-6">
        <p className="text-red-600">{loadError}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">{t("editor.back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <header className="border-b border-[hsl(var(--border))] lab-panel px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-0 bg-transparent text-xl font-semibold outline-none focus:ring-0"
              placeholder={t("editor.agentNamePlaceholder")}
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={save} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("editor.saving")}</> : t("editor.save")}
            </Button>
            <Button onClick={run} disabled={running}>
              {running ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("editor.running")}</> : <><Play className="h-4 w-4 mr-2" /> {t("editor.run")}</>}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <FlowEditor steps={steps} onChange={setSteps} />
      </main>
    </div>
  );
}
