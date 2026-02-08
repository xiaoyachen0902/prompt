import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Play, List, Sparkles, History, Trash2, Copy, Settings2 } from "lucide-react";
import { api } from "@/api";
import type { Agent, Run } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AGENT_TEMPLATES, TEMPLATE_CATEGORIES, getTemplateForLocale } from "@/lib/templates";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useI18n, LanguageSwitcher } from "@/i18n/context";
import type { TemplateCategory, Template } from "@/types";
import { toast } from "@/components/ui/use-toast";

function ConfirmDialog({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title, 
  description 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onConfirm: () => void; 
  title: string; 
  description: string;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lab-panel rounded-md shadow-lg border max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">{description}</p>
        </DialogHeader>
        <div className="flex gap-3 justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("confirm.cancel")}</Button>
          <Button 
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="bg-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/90 text-white"
          >
            {t("confirm.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AgentList() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [recentRuns, setRecentRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<TemplateCategory[]>([]);
  const [customTemplates, setCustomTemplates] = useState<Template[]>([]);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"agents" | "runs">("agents");
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: "agent" | "run"; id: string; name: string }>({
    open: false,
    type: "agent",
    id: "",
    name: "",
  });
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [selectedRunIds, setSelectedRunIds] = useState<Set<string>>(new Set());
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState<{ open: boolean; type: "agents" | "runs"; count: number }>({
    open: false,
    type: "agents",
    count: 0,
  });

  const loadData = () => {
    Promise.all([
      api.agents.list(),
      api.runs.list(),
    ]).then(([agentsRes, runsRes]) => {
      setAgents(agentsRes.agents);
      setRecentRuns(runsRes.runs.slice(0, 20));
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadCustomTemplates = () => {
    api.templates.listCategories().then((r) => setCustomCategories(r.categories)).catch(() => {});
    api.templates.listTemplates().then((r) => setCustomTemplates(r.templates)).catch(() => {});
  };

  useEffect(() => {
    if (templateOpen) loadCustomTemplates();
  }, [templateOpen]);

  const createFromTemplate = () => {
    if (!selectedTemplate) return;
    const builtIn = AGENT_TEMPLATES.find((tm) => tm.id === selectedTemplate);
    if (builtIn) {
      const display = getTemplateForLocale(builtIn, locale);
      setTemplateOpen(false);
      setSelectedTemplate(null);
      navigate("/agents/new", { state: { templateName: display.name, templateSteps: display.steps } });
      return;
    }
    const custom = customTemplates.find((t) => t.id === selectedTemplate);
    if (custom) {
      try {
        const steps = JSON.parse(custom.steps) as Array<{ name: string; promptTemplate: string }>;
        setTemplateOpen(false);
        setSelectedTemplate(null);
        navigate("/agents/new", { state: { templateName: custom.name, templateSteps: steps } });
      } catch {
        toast({ title: t("common.loadError"), variant: "error" });
      }
    }
  };

  const handleCopyAgent = async (agentId: string) => {
    setCopyingId(agentId);
    try {
      const newAgent = await api.agents.duplicate(agentId);
      toast({ title: t("toast.copySuccess"), variant: "success" });
      loadData();
      navigate(`/agents/${newAgent.id}`);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setCopyingId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.type === "agent") {
      await api.agents.delete(deleteConfirm.id);
    } else {
      await api.runs.delete(deleteConfirm.id);
    }
    loadData();
  };

  const toggleAgentSelection = (id: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleRunSelection = (id: string) => {
    setSelectedRunIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const selectAllAgents = () => {
    if (selectedAgentIds.size === agents.length) setSelectedAgentIds(new Set());
    else setSelectedAgentIds(new Set(agents.map((a) => a.id)));
  };
  const selectAllRuns = () => {
    if (selectedRunIds.size === recentRuns.length) setSelectedRunIds(new Set());
    else setSelectedRunIds(new Set(recentRuns.map((r) => r.id)));
  };
  const openBatchDeleteConfirm = (type: "agents" | "runs") => {
    const count = type === "agents" ? selectedAgentIds.size : selectedRunIds.size;
    if (count > 0) setBatchDeleteConfirm({ open: true, type, count });
  };
  const confirmBatchDelete = async () => {
    if (batchDeleteConfirm.type === "agents" && selectedAgentIds.size > 0) {
      await api.agents.batchDelete(Array.from(selectedAgentIds));
      setSelectedAgentIds(new Set());
    }
    if (batchDeleteConfirm.type === "runs" && selectedRunIds.size > 0) {
      await api.runs.batchDelete(Array.from(selectedRunIds));
      setSelectedRunIds(new Set());
    }
    setBatchDeleteConfirm((prev) => ({ ...prev, open: false }));
    loadData();
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <header className="shrink-0 border-b px-4 py-2.5 flex items-center justify-between lab-panel">
        <div className="flex items-center gap-4">
          <div className="w-7 h-7 rounded flex items-center justify-center bg-[hsl(var(--primary))] text-white">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="flex items-center gap-1 border-r pr-4">
            <button
              onClick={() => setActiveTab("agents")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                activeTab === "agents" ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {t("nav.agents")}
            </button>
            <button
              onClick={() => setActiveTab("runs")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors rounded ${
                activeTab === "runs" ? "bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              }`}
            >
              {t("nav.recentRuns")}
            </button>
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            {activeTab === "agents" ? agents.length : recentRuns.length} items
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <Button variant="ghost" size="sm" onClick={() => setTemplateOpen(true)} className="text-[hsl(var(--muted-foreground))]">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> {t("nav.templates")}
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-[hsl(var(--muted-foreground))]">
            <Link to="/templates"><Settings2 className="h-3.5 w-3.5 mr-1" /> {t("nav.manageTemplates")}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/agents/new"><Plus className="h-3.5 w-3.5 mr-1" /> {t("nav.newAgent")}</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="h-6 w-6 rounded-full border-2 border-[hsl(var(--primary))] border-r-transparent animate-spin" />
              <span className="ml-3 text-sm text-[hsl(var(--muted-foreground))]">{t("common.loading")}</span>
            </div>
          ) : activeTab === "agents" ? (
            agents.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <List className="h-10 w-10 text-[hsl(var(--muted-foreground))] mb-4" />
                <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">{t("agents.emptyTitle")}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mb-6">{t("agents.emptyDesc")}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)}>
                    {t("agents.browseTemplates")}
                  </Button>
                  <Button size="sm" asChild><Link to="/agents/new">{t("agents.createAgent")}</Link></Button>
                </div>
              </div>
            ) : (
              <>
                <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b text-xs text-[hsl(var(--muted-foreground))]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={agents.length > 0 && selectedAgentIds.size === agents.length} onChange={selectAllAgents} className="rounded border-[hsl(var(--border))]" />
                    {t("agents.selectAll")}
                  </label>
                  <Button size="sm" variant="ghost" className="h-6 text-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/10" disabled={selectedAgentIds.size === 0} onClick={() => openBatchDeleteConfirm("agents")}>
                    <Trash2 className="h-3 w-3 mr-1" /> {t("agents.batchDelete")} {selectedAgentIds.size > 0 ? `(${selectedAgentIds.size})` : ""}
                  </Button>
                </div>
                <ul className="flex-1 overflow-y-auto">
                  {agents.map((agent) => (
                    <li key={agent.id} className="lab-row group border-b border-[hsl(var(--border))] last:border-b-0">
                      <input type="checkbox" checked={selectedAgentIds.has(agent.id)} onChange={() => toggleAgentSelection(agent.id)} onClick={(e) => e.stopPropagation()} className="rounded border-[hsl(var(--border))] shrink-0" />
                      <span className="w-6 h-6 rounded flex items-center justify-center bg-[hsl(var(--muted))] text-xs font-mono text-[hsl(var(--muted-foreground))] shrink-0">{agent.steps.length}</span>
                      <div className="flex-1 min-w-0">
                        <Link to={`/agents/${agent.id}`} className="font-medium text-sm text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] truncate block">
                          {agent.name}
                        </Link>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono mt-0.5">{agent.steps.length} {t("agents.steps")} · {new Date(agent.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs"><Link to={`/agents/${agent.id}`}>{t("agents.edit")}</Link></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.preventDefault(); handleCopyAgent(agent.id); }} disabled={copyingId === agent.id} title={t("agents.copy")}>
                          {copyingId === agent.id ? <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin block" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button asChild size="sm" className="h-7 text-xs"><Link to={`/agents/${agent.id}`}><Play className="h-3 w-3 mr-1" /> {t("agents.run")}</Link></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/10" onClick={(e) => { e.preventDefault(); setDeleteConfirm({ open: true, type: "agent", id: agent.id, name: agent.name }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : recentRuns.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
              <History className="h-10 w-10 text-[hsl(var(--muted-foreground))] mb-4" />
              <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">{t("runs.emptyTitle")}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm">{t("runs.emptyDesc")}</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-3 px-3 py-2 border-b text-xs text-[hsl(var(--muted-foreground))]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={recentRuns.length > 0 && selectedRunIds.size === recentRuns.length} onChange={selectAllRuns} className="rounded border-[hsl(var(--border))]" />
                  {t("agents.selectAll")}
                </label>
                <Button size="sm" variant="ghost" className="h-6 text-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/10" disabled={selectedRunIds.size === 0} onClick={() => openBatchDeleteConfirm("runs")}>
                  <Trash2 className="h-3 w-3 mr-1" /> {t("agents.batchDelete")} {selectedRunIds.size > 0 ? `(${selectedRunIds.size})` : ""}
                </Button>
              </div>
              <ul className="flex-1 overflow-y-auto">
                {recentRuns.map((run) => {
                  if (!run.agent) return null;
                  return (
                    <li key={run.id} className="lab-row group border-b border-[hsl(var(--border))] last:border-b-0">
                      <input type="checkbox" checked={selectedRunIds.has(run.id)} onChange={() => toggleRunSelection(run.id)} onClick={(e) => e.stopPropagation()} className="rounded border-[hsl(var(--border))] shrink-0" />
                      <span className={`lab-status-dot shrink-0 ${run.status === "completed" ? "success" : run.status === "failed" ? "error" : "warning pulse"}`} title={run.status} />
                      <div className="flex-1 min-w-0">
                        <Link to={`/runs/${run.id}`} className="font-medium text-sm text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] truncate block">
                          {run.agent.name}
                        </Link>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                          {run.status} · {new Date(run.createdAt).toLocaleString()} · ${run.totalCost.toFixed(4)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs"><Link to={`/runs/${run.id}`}>{t("agents.view")}</Link></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/10" onClick={(e) => { e.preventDefault(); setDeleteConfirm({ open: true, type: "run", id: run.id, name: `${run.agent.name} run` }); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
        <aside className="w-56 shrink-0 flex flex-col border-l lab-panel-muted p-4 overflow-y-auto">
          <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">{t("app.title")}</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed mb-4">{t("app.subtitle")}</p>
          <div className="space-y-2">
            <Button size="sm" variant="outline" className="w-full justify-start" onClick={() => setTemplateOpen(true)}><Sparkles className="h-3.5 w-3.5 mr-2" />{t("nav.templates")}</Button>
            <Button size="sm" variant="outline" className="w-full justify-start" asChild><Link to="/agents/new"><Plus className="h-3.5 w-3.5 mr-2" />{t("nav.newAgent")}</Link></Button>
          </div>
        </aside>
      </main>

      <Dialog open={templateOpen} onOpenChange={(open) => {
        setTemplateOpen(open);
        if (open) loadCustomTemplates();
        if (!open) {
          setSelectedTemplate(null);
          setSelectedCategory(null);
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col lab-panel rounded-lg border shadow-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-7 h-7 bg-[hsl(var(--primary))] rounded flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {selectedTemplate ? t("template.previewTitle") : t("template.dialogTitle")}
                </DialogTitle>
                <p className="text-sm text-[hsl(var(--muted-foreground))] font-normal">
                  {selectedTemplate ? t("template.reviewDesc") : t("template.startDesc")}
                </p>
              </div>
            </div>
          </DialogHeader>
          
          {!selectedTemplate ? (
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <div className="flex gap-2.5 mb-5 pb-4 border-b overflow-x-auto shrink-0">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-5 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === null
                      ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                      : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                  }`}
                >
                  {t("template.all")}
                </button>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                        : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    }`}
                  >
                    {t(`template.category.${cat.id}`)}
                  </button>
                ))}
                {customCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-5 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-[hsl(var(--primary))] text-white shadow-sm"
                        : "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-3 pb-4">
                  {                  AGENT_TEMPLATES.filter(
                    (tmpl) => selectedCategory === null || (TEMPLATE_CATEGORIES.some((c) => c.id === selectedCategory) && tmpl.category === selectedCategory)
                  ).map((tmpl) => {
                    const display = getTemplateForLocale(tmpl, locale);
                    return (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className="w-full text-left lab-panel rounded border py-2.5 px-3 mb-2 flex items-center gap-3 hover:border-[hsl(var(--primary))]/40 transition-colors group"
                    >
                      <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] w-6 shrink-0">{display.steps.length}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] truncate">{display.name}</div>
                        <div className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1 mt-0.5">{display.description}</div>
                        {display.useCases.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            {display.useCases.slice(0, 3).map((useCase, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded text-[11px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]">
                                {useCase}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  ); })}
                  {customTemplates
                    .filter((t) => selectedCategory === null || t.categoryId === selectedCategory || t.builtinCategoryId === selectedCategory)
                    .map((tpl) => {
                      const stepCount = (() => { try { return (JSON.parse(tpl.steps) as unknown[]).length; } catch { return 0; } })();
                      return (
                        <button
                          key={tpl.id}
                          onClick={() => setSelectedTemplate(tpl.id)}
                          className="w-full text-left lab-panel rounded border border-dashed py-2.5 px-3 mb-2 flex items-center gap-3 hover:border-[hsl(var(--primary))]/40 transition-colors group"
                        >
                          <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] w-6 shrink-0">{stepCount}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] truncate">{tpl.name}</div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1 mt-0.5">{tpl.description}</div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden flex flex-col">
              {(() => {
                const builtIn = AGENT_TEMPLATES.find((tm) => tm.id === selectedTemplate);
                if (builtIn) {
                  const display = getTemplateForLocale(builtIn, locale);
                  return (
                    <>
                      <div className="pb-4 border-b">
                        <h3 className="font-semibold text-lg mb-2">{display.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mb-3">
                          {display.description}
                        </p>
                        {display.useCases.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] mr-1">{t("template.useCases")}：</span>
                            {display.useCases.map((useCase, idx) => (
                              <span key={idx} className="px-2.5 py-1 rounded-full bg-[hsl(var(--muted))] text-xs font-medium">
                                {useCase}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 overflow-y-auto pr-2 py-4">
                        <div className="space-y-4">
                          {display.steps.map((step, idx) => (
                            <div key={idx} className="group">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] w-5">{idx + 1}</span>
                                <span className="font-medium text-sm text-[hsl(var(--foreground))]">{step.name}</span>
                              </div>
                              <div className="ml-7 lab-code rounded p-3 overflow-hidden">
                                <pre className="text-xs text-[hsl(var(--foreground))]/90 whitespace-pre-wrap font-mono leading-relaxed m-0">
                                  {step.promptTemplate}
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>
                        {Object.keys(display.exampleInputs || {}).length > 0 && (
                          <div className="mt-5 p-4 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50">
                            <div className="font-semibold text-sm mb-3 text-blue-900 flex items-center gap-2">
                              <span className="text-lg">💡</span>
                              <span>{t("template.exampleInput")}</span>
                            </div>
                            <div className="space-y-2">
                              {Object.entries(display.exampleInputs || {}).map(([key, value]) => (
                                <div key={key} className="text-sm">
                                  <span className="font-medium text-blue-800">{key}:</span>{" "}
                                  <span className="text-blue-700">{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button variant="outline" onClick={() => setSelectedTemplate(null)} size="default">
                          {t("template.back")}
                        </Button>
                        <Button onClick={createFromTemplate} size="default">
                          <Plus className="h-4 w-4" /> {t("template.createAgent")}
                        </Button>
                      </div>
                    </>
                  );
                }
                const custom = customTemplates.find((t) => t.id === selectedTemplate);
                if (custom) {
                  let steps: Array<{ name: string; promptTemplate: string }> = [];
                  try {
                    steps = JSON.parse(custom.steps) as Array<{ name: string; promptTemplate: string }>;
                  } catch {}
                  return (
                    <>
                      <div className="pb-4 border-b">
                        <h3 className="font-semibold text-lg mb-2">{custom.name}</h3>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                          {custom.description}
                        </p>
                      </div>
                      <div className="flex-1 overflow-y-auto pr-2 py-4">
                        <div className="space-y-4">
                          {steps.map((step, idx) => (
                            <div key={idx} className="group">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] w-5">{idx + 1}</span>
                                <span className="font-medium text-sm text-[hsl(var(--foreground))]">{step.name}</span>
                              </div>
                              <div className="ml-7 lab-code rounded p-3 overflow-hidden">
                                <pre className="text-xs text-[hsl(var(--foreground))]/90 whitespace-pre-wrap font-mono leading-relaxed m-0">
                                  {step.promptTemplate}
                                </pre>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button variant="outline" onClick={() => setSelectedTemplate(null)} size="default">
                          {t("template.back")}
                        </Button>
                        <Button onClick={createFromTemplate} size="default">
                          <Plus className="h-4 w-4" /> {t("template.createAgent")}
                        </Button>
                      </div>
                    </>
                  );
                }
                return null;
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        onConfirm={handleDelete}
        title={deleteConfirm.type === "agent" ? t("confirm.deleteAgent") : t("confirm.deleteRun")}
        description={t("confirm.deleteDesc", { name: deleteConfirm.name })}
      />
      <ConfirmDialog
        open={batchDeleteConfirm.open}
        onOpenChange={(open) => setBatchDeleteConfirm((prev) => ({ ...prev, open }))}
        onConfirm={confirmBatchDelete}
        title={batchDeleteConfirm.type === "agents" ? t("confirm.batchDeleteAgents", { n: String(batchDeleteConfirm.count) }) : t("confirm.batchDeleteRuns", { n: String(batchDeleteConfirm.count) })}
        description={t("confirm.cannotUndo")}
      />
    </div>
  );
}
