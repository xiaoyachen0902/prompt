import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeProps,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from './ui/button';
import { Plus, Settings, Trash2, X, Save } from 'lucide-react';
import { PromptEditor } from './PromptEditor';
import { useI18n } from '@/i18n/context';
import { BUILTIN_MODELS, DEFAULT_MODEL_ID, isBuiltinModel } from '@/lib/models';

type StepNodeData = {
  name: string;
  promptTemplate: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  orderIndex: number;
};

export type StepFormData = {
  id?: string;
  name: string;
  promptTemplate: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  orderIndex: number;
  stepType?: "action" | "reflection";
  decisionPrompt?: string;
  onCompleteDefault?: "continue" | "retry" | "skip_next" | "branch" | "stop";
  condition?: { if: string; then: string; else: string };
};

/** Edge shorthand for persistence to backend */
export type FlowEdge = { sourceId: string; targetId: string };

interface FlowEditorProps {
  steps: StepFormData[];
  onChange: (steps: StepFormData[]) => void;
}

const defaultEdgeOptions = {
  type: 'smoothstep' as const,
  animated: true,
  style: { stroke: 'hsl(var(--primary))', strokeWidth: 2.5 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
};

// Truncate prompt to one line for node preview
function promptPreview(text: string, maxLen: number = 72): string {
  if (!text || !text.trim()) return "";
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen) + "…";
}

// Custom node with top/bottom handles for drag-and-drop connections (compact: ~3/5 scale)
function StepNode({ data }: NodeProps<StepNodeData>) {
  const preview = promptPreview(data.promptTemplate, 52);
  return (
    <div className="relative px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))] shadow hover:shadow-md transition-shadow min-w-[120px] max-w-[200px]">
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !border-2 !bg-white dark:!bg-[hsl(var(--card))]" />
      <div className="flex items-center gap-1.5 mb-1">
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[hsl(var(--primary))] text-white text-[10px] font-bold">
          {data.orderIndex + 1}
        </div>
        <div className="font-semibold text-xs text-[hsl(var(--foreground))] truncate">{data.name}</div>
      </div>
      {preview && (
        <div className="text-[10px] text-[hsl(var(--muted-foreground))] leading-tight mb-1 line-clamp-2 break-words" title={data.promptTemplate}>
          {preview}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {data.model && (
          <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono bg-[hsl(var(--muted))]/40 px-1 py-0.5 rounded">
            {data.model}
          </span>
        )}
        {data.temperature !== undefined && (
          <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded">T={data.temperature}</span>
        )}
        {data.maxTokens != null && (
          <span className="text-[10px] text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/60 px-1 py-0.5 rounded">Max={data.maxTokens}</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !border-2 !bg-white dark:!bg-[hsl(var(--card))]" />
    </div>
  );
}

const nodeTypes = {
  stepNode: StepNode,
};

function stepId(step: StepFormData, index: number): string {
  return step.id || `step-${index}`;
}

export function FlowEditor({ steps, onChange }: FlowEditorProps) {
  const { t } = useI18n();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [customEdges, setCustomEdges] = useState<FlowEdge[]>([]);
  const [removedLinearKeys, setRemovedLinearKeys] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<StepFormData | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Generate nodes from steps
  useEffect(() => {
    const newNodes: Node<StepNodeData>[] = steps.map((step, index) => {
      const id = stepId(step, index);
      const existing = nodes.find((n) => n.id === id);
      return {
        id,
        type: 'stepNode',
        position: existing?.position ?? { x: 200, y: index * 100 + 40 },
        data: {
          name: step.name,
          promptTemplate: step.promptTemplate,
          model: step.model,
          temperature: step.temperature,
          maxTokens: step.maxTokens,
          orderIndex: index,
        },
      };
    });
    setNodes(newNodes);
  }, [steps]);

  // Edges = linear order links (user can delete) + user-defined links (branching)
  useEffect(() => {
    const ids = steps.map((s, i) => stepId(s, i));
    const edgeKeys = new Set<string>();
    for (let i = 0; i < steps.length - 1; i++) {
      const key = `${ids[i]}->${ids[i + 1]}`;
      if (!removedLinearKeys.has(key)) edgeKeys.add(key);
    }
    customEdges.forEach((e) => {
      if (ids.includes(e.sourceId) && ids.includes(e.targetId)) {
        edgeKeys.add(`${e.sourceId}->${e.targetId}`);
      }
    });
    const newEdges: Edge[] = Array.from(edgeKeys).map((key) => {
      const [source, target] = key.split('->');
      const sourceIdx = ids.indexOf(source);
      const sourceStep = sourceIdx >= 0 ? steps[sourceIdx] : null;
      const cond = sourceStep?.condition;
      const condLabel =
        cond?.if != null && cond.if.trim() !== ""
          ? `if: ${cond.if.trim().slice(0, 28)}${cond.if.length > 28 ? "…" : ""} → ${cond.then ?? "then"}/${cond.else ?? "else"}`
          : undefined;
      return {
        id: `e-${source}-${target}`.replace(/\s/g, "_"),
        source,
        target,
        ...defaultEdgeOptions,
        ...(condLabel && {
          label: condLabel,
          labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 },
          labelBgStyle: { fill: "hsl(var(--card))", stroke: "hsl(var(--border))" },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 4,
        }),
      };
    });
    setEdges(newEdges);
  }, [steps, customEdges, removedLinearKeys]);

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      const ids = steps.map((s, i) => stepId(s, i));
      changes.forEach((c) => {
        if (c.type === 'remove' && c.id) {
          const found = edges.find((e) => e.id === c.id);
          if (found) {
            const key = `${found.source}->${found.target}`;
            const isLinear = ids.indexOf(found.source) >= 0 && ids.indexOf(found.target) === ids.indexOf(found.source) + 1;
            if (isLinear) {
              setRemovedLinearKeys((prev) => new Set(prev).add(key));
            } else {
              setCustomEdges((prev) =>
                prev.filter((x) => !(x.sourceId === found.source && x.targetId === found.target))
              );
            }
          }
        }
      });
    },
    [onEdgesChange, edges, steps]
  );

  const onConnect = useCallback((params: Connection) => {
    const src = params.source ?? '';
    const tgt = params.target ?? '';
    if (!src || !tgt) return;
    setEdges((eds) => addEdge(params, eds));
    setCustomEdges((prev) => {
      if (prev.some((e) => e.sourceId === src && e.targetId === tgt)) return prev;
      return [...prev, { sourceId: src, targetId: tgt }];
    });
  }, [setEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      const dragEnd = changes.find((c) => c.type === 'position' && (c as { dragging?: boolean }).dragging === false);
      if (dragEnd) {
        setTimeout(() => {
          setNodes((current) => {
            const sorted = [...current].sort((a, b) => a.position.y - b.position.y);
            const reordered = sorted
              .map((node) => steps.find((s, i) => stepId(s, i) === node.id))
              .filter(Boolean) as StepFormData[];
            if (reordered.length === steps.length && JSON.stringify(reordered.map((s) => s.name)) !== JSON.stringify(steps.map((s) => s.name))) {
              onChange(reordered.map((s, i) => ({ ...s, orderIndex: i })));
            }
            return current;
          });
        }, 50);
      }
    },
    [onNodesChange, onChange, steps]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
      const idx = steps.findIndex((s, i) => stepId(s, i) === node.id);
      if (idx !== -1) setEditingStep({ ...steps[idx] });
      setShowAdvanced(false);
    },
    [steps]
  );

  const handleAddStep = () => {
    const newStep: StepFormData = {
      name: "New step",
      promptTemplate: "",
      model: DEFAULT_MODEL_ID,
      temperature: 0.7,
      orderIndex: steps.length,
      stepType: 'action',
      onCompleteDefault: 'continue',
    };
    onChange([...steps, newStep]);
  };

  const handleDeleteStep = (stepIdToDelete: string) => {
    const filtered = steps.filter((s, i) => stepId(s, i) !== stepIdToDelete);
    onChange(filtered.map((s, i) => ({ ...s, orderIndex: i })));
    setEditingStep(null);
    setSelectedNode(null);
  };

  const handleSaveEdit = () => {
    if (!editingStep || !selectedNode) return;
    const idx = steps.findIndex((s, i) => stepId(s, i) === selectedNode);
    if (idx !== -1) {
      const updated = [...steps];
      updated[idx] = editingStep;
      onChange(updated);
    }
    setEditingStep(null);
    setSelectedNode(null);
  };

  return (
    <div className="flex min-h-[80vh] gap-4 pb-8">
      {/* Left: canvas */}
      <div className="flex-1 min-w-0 h-[80vh] rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineStyle={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          fitView
          snapToGrid
          snapGrid={[12, 12]}
          panActivationKeyCode={null}
        >
          <Background gap={16} size={1} color="hsl(var(--border))" />
          <Controls className="!bg-white dark:!bg-[hsl(var(--card))] !border-[hsl(var(--border))] !shadow !rounded-lg" />
          <MiniMap className="!bg-white dark:!bg-[hsl(var(--card))] !border-[hsl(var(--border))] !rounded-lg" nodeColor="hsl(var(--primary))" />
        </ReactFlow>
      </div>

      {/* Right: edit panel + all-steps preview + add button */}
      <div
        className="w-[500px] shrink-0 flex flex-col gap-3"
        onKeyDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("input, textarea, [contenteditable=true], .monaco-editor")) e.stopPropagation();
        }}
      >
        <div className="rounded-xl border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))] shadow-sm flex flex-col overflow-hidden min-h-[420px]">
          {editingStep ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))]">
                <span className="font-semibold text-sm">{t("flow.editStep")}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                    onClick={() => selectedNode && handleDeleteStep(selectedNode)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingStep(null); setSelectedNode(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1.5">{t("flow.name")}</label>
                  <input
                    type="text"
                    value={editingStep.name}
                    onChange={(e) => setEditingStep({ ...editingStep, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    placeholder={t("flow.stepNamePlaceholder")}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))]">{t("flow.prompt")}</label>
                    <Button variant={showAdvanced ? 'default' : 'outline'} size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
                      <Settings className="h-3.5 w-3.5 mr-1" />
                      {showAdvanced ? t("flow.advancedHide") : t("flow.advanced")}
                    </Button>
                  </div>
                  <div className="mb-2 rounded-md bg-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 px-3 py-2 text-xs text-[hsl(var(--foreground))]">
                    <span className="font-medium text-[hsl(var(--primary))]">{t("flow.variableLabel")}</span>
                    {t("flow.variableDesc")}
                  </div>
                  <PromptEditor
                    value={editingStep.promptTemplate}
                    onChange={(v) => setEditingStep({ ...editingStep, promptTemplate: v })}
                    height="280px"
                    language="plaintext"
                  />
                </div>
                {showAdvanced && (
                  <div className="space-y-3 p-3 rounded-lg bg-[hsl(var(--muted))]/50 border border-[hsl(var(--border))]">
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("flow.model")}</label>
                      <select
                        value={editingStep.model && isBuiltinModel(editingStep.model) ? editingStep.model : "__custom__"}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEditingStep({ ...editingStep, model: v === "__custom__" ? (editingStep.model || "") : v });
                        }}
                        className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                      >
                        {BUILTIN_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                        <option value="__custom__">{t("flow.modelCustom")}</option>
                      </select>
                      {(!editingStep.model || !isBuiltinModel(editingStep.model)) && (
                        <input
                          type="text"
                          value={editingStep.model || ""}
                          onChange={(e) => setEditingStep({ ...editingStep, model: e.target.value })}
                          placeholder={t("flow.modelCustomPlaceholder")}
                          className="mt-1.5 w-full px-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Temperature</label>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.1}
                        value={editingStep.temperature ?? 0.7}
                        onChange={(e) => setEditingStep({ ...editingStep, temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">{editingStep.temperature ?? 0.7}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">Max Tokens</label>
                      <input
                        type="number"
                        min={1}
                        value={editingStep.maxTokens ?? ''}
                        onChange={(e) => setEditingStep({ ...editingStep, maxTokens: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                        placeholder="Default"
                        className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                      />
                    </div>
                  </div>
                )}
                <div className="space-y-3 p-3 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50">
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{t("flow.outcomeBranch")}</p>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("flow.stepType")}</label>
                    <select
                      value={editingStep.stepType || "action"}
                      onChange={(e) => setEditingStep({ ...editingStep, stepType: e.target.value as "action" | "reflection" })}
                      className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    >
                      <option value="action">{t("flow.stepTypeAction")}</option>
                      <option value="reflection">{t("flow.stepTypeReflection")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("flow.afterStepDefault")}</label>
                    <select
                      value={editingStep.onCompleteDefault || "continue"}
                      onChange={(e) => setEditingStep({ ...editingStep, onCompleteDefault: e.target.value as StepFormData["onCompleteDefault"] })}
                      className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    >
                      <option value="continue">{t("flow.actionContinue")}</option>
                      <option value="retry">{t("flow.actionRetry")}</option>
                      <option value="skip_next">{t("flow.actionSkipNext")}</option>
                      <option value="branch">{t("flow.actionBranch")}</option>
                      <option value="stop">{t("flow.actionStop")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("flow.decisionPromptLabel")}</label>
                    <textarea
                      value={editingStep.decisionPrompt ?? ""}
                      onChange={(e) => setEditingStep({ ...editingStep, decisionPrompt: e.target.value || undefined })}
                      placeholder={t("flow.decisionPromptPlaceholder")}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("flow.conditionLabel")}</label>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={editingStep.condition?.if ?? ""}
                        onChange={(e) => setEditingStep({
                          ...editingStep,
                          condition: editingStep.condition
                            ? { ...editingStep.condition, if: e.target.value }
                            : { if: e.target.value, then: "continue", else: "continue" },
                        })}
                        placeholder={t("flow.conditionIfPlaceholder")}
                        className="w-full px-2 py-1.5 text-xs border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                      />
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{t("flow.conditionIf")}</span>
                    </div>
                    <div>
                      <select
                        value={editingStep.condition?.then ?? "continue"}
                        onChange={(e) => setEditingStep({
                          ...editingStep,
                          condition: editingStep.condition
                            ? { ...editingStep.condition, then: e.target.value as "continue" | "retry" | "skip_next" | "branch" | "stop" }
                            : { if: "", then: e.target.value as "continue" | "retry" | "skip_next" | "branch" | "stop", else: "continue" },
                        })}
                        className="w-full px-2 py-1.5 text-xs border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))]"
                      >
                        <option value="continue">{t("flow.actionContinue")}</option>
                        <option value="retry">retry</option>
                        <option value="skip_next">skip_next</option>
                        <option value="stop">stop</option>
                      </select>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{t("flow.conditionThen")}</span>
                    </div>
                    <div>
                      <select
                        value={editingStep.condition?.else ?? "continue"}
                        onChange={(e) => setEditingStep({
                          ...editingStep,
                          condition: editingStep.condition
                            ? { ...editingStep.condition, else: e.target.value as "continue" | "retry" | "skip_next" | "branch" | "stop" }
                            : { if: "", then: "continue", else: e.target.value as "continue" | "retry" | "skip_next" | "branch" | "stop" },
                        })}
                        className="w-full px-2 py-1.5 text-xs border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))]"
                      >
                        <option value="continue">{t("flow.actionContinue")}</option>
                        <option value="retry">retry</option>
                        <option value="skip_next">skip_next</option>
                        <option value="stop">stop</option>
                      </select>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{t("flow.conditionElse")}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 p-4 border-t border-[hsl(var(--border))]">
                <Button variant="outline" size="sm" onClick={() => { setEditingStep(null); setSelectedNode(null); }} className="flex-1">{t("flow.cancel")}</Button>
                <Button size="sm" onClick={handleSaveEdit} className="flex-1"><Save className="h-4 w-4 mr-1" />{t("flow.save")}</Button>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-[hsl(var(--muted-foreground))]">
              <Settings className="h-10 w-10 mx-auto mb-3 opacity-60" />
              <p className="text-sm">{t("flow.clickNodeHint")}</p>
              <p className="text-xs mt-1">{t("flow.branchHint")}</p>
            </div>
          )}
        </div>
        <Button onClick={handleAddStep} variant="outline" className="w-full border-dashed">
          <Plus className="h-4 w-4 mr-2" />
          {t("flow.addStep")}
        </Button>
        {steps.length > 1 && (
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-snug">
            {t("flow.branchTip")}
          </p>
        )}
        {steps.length > 0 && (
          <div className="rounded-xl border border-[hsl(var(--border))] bg-white dark:bg-[hsl(var(--card))] shadow-sm flex flex-col overflow-hidden min-h-[320px] max-h-[75vh]">
            <div className="shrink-0 px-3 py-2 border-b border-[hsl(var(--border))]">
              <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider">{t("flow.allStepsPreview")}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
              {steps.map((step, idx) => (
                <div
                  key={step.id ?? idx}
                  className={`rounded border border-[hsl(var(--border))] overflow-hidden text-left ${selectedNode === stepId(step, idx) ? "ring-1 ring-[hsl(var(--primary))]" : ""}`}
                >
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-[hsl(var(--muted))]/50 border-b border-[hsl(var(--border))]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[hsl(var(--primary))] text-white text-[10px] font-bold">{idx + 1}</span>
                    <span className="text-xs font-medium truncate">{step.name}</span>
                  </div>
                  <pre className="text-[10px] text-[hsl(var(--muted-foreground))] whitespace-pre-wrap break-words p-2 max-h-72 overflow-y-auto bg-[hsl(var(--muted))]/20 m-0 font-mono">
                    {step.promptTemplate?.trim() || "—"}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
