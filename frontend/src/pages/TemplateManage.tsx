import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ArrowLeft, Folder, FileText } from "lucide-react";
import { api } from "@/api";
import type { TemplateCategory, Template } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/context";
import { toast } from "@/components/ui/use-toast";
import { TEMPLATE_CATEGORIES } from "@/lib/templates";

function parseSteps(stepsJson: string): Array<{ name: string; promptTemplate: string }> {
  try {
    const a = JSON.parse(stepsJson) as unknown;
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function TemplateManage() {
  const { t } = useI18n();
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryForm, setCategoryForm] = useState<{ open: boolean; name: string; id?: string }>({ open: false, name: "" });
  const [templateForm, setTemplateForm] = useState<{
    open: boolean;
    id?: string;
    categoryId: string;
    name: string;
    description: string;
    steps: Array<{ name: string; promptTemplate: string }>;
  }>({ open: false, categoryId: "", name: "", description: "", steps: [{ name: "", promptTemplate: "" }] });
  const [templateFormError, setTemplateFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "category" | "template"; id: string; name: string } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.templates.listCategories(), api.templates.listTemplates()])
      .then(([catRes, tplRes]) => {
        setCategories(catRes.categories);
        setTemplates(tplRes.templates);
      })
      .catch(() => toast({ title: t("common.loadError"), variant: "error" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const saveCategory = async () => {
    const name = categoryForm.name.trim();
    if (!name) return;
    try {
      if (categoryForm.id) {
        await api.templates.updateCategory(categoryForm.id, { name });
        toast({ title: t("templateManage.saved"), variant: "success" });
      } else {
        await api.templates.createCategory({ name });
        toast({ title: t("templateManage.categoryAdded"), variant: "success" });
      }
      setCategoryForm({ open: false, name: "" });
      load();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    }
  };

  const isBuiltinCategoryId = (id: string) => TEMPLATE_CATEGORIES.some((c) => c.id === id);

  const saveTemplate = async () => {
    setTemplateFormError(null);
    const { categoryId, name, description, steps } = templateForm;
    const validSteps = steps.filter((s) => s.name.trim() && s.promptTemplate.trim());
    if (!name.trim() || !description.trim() || validSteps.length === 0 || !categoryId) {
      setTemplateFormError(t("templateManage.fillRequired"));
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      steps: validSteps,
      ...(isBuiltinCategoryId(categoryId)
        ? { builtinCategoryId: categoryId as string }
        : { categoryId }),
    };
    try {
      if (templateForm.id) {
        await api.templates.updateTemplate(templateForm.id, {
          name: payload.name,
          description: payload.description,
          steps: payload.steps,
          ...(isBuiltinCategoryId(categoryId) ? { builtinCategoryId: categoryId, categoryId: null } : { categoryId, builtinCategoryId: null }),
        });
        toast({ title: t("templateManage.saved"), variant: "success" });
      } else {
        await api.templates.createTemplate(payload as Parameters<typeof api.templates.createTemplate>[0]);
        toast({ title: t("templateManage.templateAdded"), variant: "success" });
      }
      setTemplateForm({ open: false, categoryId: TEMPLATE_CATEGORIES[0]?.id ?? categories[0]?.id ?? "", name: "", description: "", steps: [{ name: "", promptTemplate: "" }] });
      setTemplateFormError(null);
      load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTemplateFormError(msg);
    }
  };

  const doDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "category") await api.templates.deleteCategory(deleteConfirm.id);
      else await api.templates.deleteTemplate(deleteConfirm.id);
      toast({ title: t("confirm.deleted"), variant: "success" });
      setDeleteConfirm(null);
      load();
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    }
  };

  const openEditTemplate = (tpl: Template) => {
    setTemplateFormError(null);
    setTemplateForm({
      open: true,
      id: tpl.id,
      categoryId: (tpl.builtinCategoryId || tpl.categoryId) ?? "",
      name: tpl.name,
      description: tpl.description,
      steps: parseSteps(tpl.steps).length ? parseSteps(tpl.steps) : [{ name: "", promptTemplate: "" }],
    });
  };

  const openNewTemplate = (categoryId?: string) => {
    setTemplateFormError(null);
    setTemplateForm({
      open: true,
      categoryId: categoryId ?? TEMPLATE_CATEGORIES[0]?.id ?? categories[0]?.id ?? "",
      name: "",
      description: "",
      steps: [{ name: "", promptTemplate: "" }],
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      <header className="border-b lab-panel px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-lg font-semibold">{t("templateManage.title")}</h1>
        </div>
        <ThemeToggle />
      </header>
      <main className="max-w-4xl mx-auto p-6">
        {loading ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))]">{t("common.loading")}</p>
        ) : (
          <>
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide flex items-center gap-2">
                  <Folder className="h-4 w-4" /> {t("templateManage.categories")}
                </h2>
                <Button size="sm" variant="outline" onClick={() => setCategoryForm({ open: true, name: "" })}>
                  <Plus className="h-4 w-4 mr-1" /> {t("templateManage.addCategory")}
                </Button>
              </div>
              <ul className="space-y-2">
                {categories.map((cat) => (
                  <li key={cat.id} className="lab-panel rounded border flex items-center justify-between py-2.5 px-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{cat.name}</span>
                      {cat._count && cat._count.templates > 0 && (
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))] font-mono shrink-0">{cat._count.templates} {t("templateManage.templateCount")}</span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setCategoryForm({ open: true, name: cat.name, id: cat.id })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[hsl(var(--error))] h-7 w-7 p-0" onClick={() => setDeleteConfirm({ type: "category", id: cat.id, name: cat.name })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
                {categories.length === 0 && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] py-4">{t("templateManage.noCategories")}</p>
                )}
              </ul>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" /> {t("templateManage.templates")}
                </h2>
                <Button size="sm" variant="outline" onClick={() => openNewTemplate()}>
                  <Plus className="h-4 w-4 mr-1" /> {t("templateManage.addTemplate")}
                </Button>
              </div>
              <ul className="space-y-2">
                {templates.map((tpl) => (
                  <li key={tpl.id} className="lab-panel rounded border flex items-center gap-3 py-2.5 px-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tpl.name}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-1 mt-0.5">{tpl.description}</p>
                      {(tpl.builtinCategoryId || tpl.category) && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[11px] font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))]">
                          {tpl.builtinCategoryId ? t(`template.category.${tpl.builtinCategoryId}`) : tpl.category?.name}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEditTemplate(tpl)}>{t("agents.edit")}</Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-[hsl(var(--error))]" onClick={() => setDeleteConfirm({ type: "template", id: tpl.id, name: tpl.name })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </li>
                ))}
                {templates.length === 0 && (
                  <p className="text-sm text-[hsl(var(--muted-foreground))] py-4">{t("templateManage.noTemplates")}</p>
                )}
              </ul>
            </section>
          </>
        )}
      </main>

      <Dialog open={categoryForm.open} onOpenChange={(o) => setCategoryForm((p) => ({ ...p, open: o }))}>
        <DialogContent className="lab-panel max-w-sm rounded border shadow-sm">
          <DialogHeader>
            <DialogTitle>{categoryForm.id ? t("templateManage.editCategory") : t("templateManage.addCategory")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("templateManage.categoryNamePlaceholder")}
              className="w-full px-3 py-2 border rounded-md text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCategoryForm({ open: false, name: "" })}>{t("confirm.cancel")}</Button>
              <Button onClick={saveCategory}>{t("templateManage.save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templateForm.open} onOpenChange={(o) => { setTemplateForm((p) => ({ ...p, open: o })); if (!o) setTemplateFormError(null); }}>
        <DialogContent className="lab-panel max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded border shadow-sm">
          <DialogHeader>
            <DialogTitle>{templateForm.id ? t("templateManage.editTemplate") : t("templateManage.addTemplate")}</DialogTitle>
          </DialogHeader>
          {templateFormError && (
            <div className="rounded-md bg-[hsl(var(--error))]/10 border border-[hsl(var(--error))]/30 text-sm text-[hsl(var(--error))] px-3 py-2">
              {templateFormError}
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("templateManage.category")}</label>
              <select
                value={templateForm.categoryId}
                onChange={(e) => setTemplateForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <optgroup label={t("templateManage.builtinCategories")}>
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{t(`template.category.${c.id}`)}</option>
                  ))}
                </optgroup>
                {categories.length > 0 && (
                  <optgroup label={t("templateManage.customCategories")}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("templateManage.templateName")}</label>
              <input
                type="text"
                value={templateForm.name}
                onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("templateManage.templateNamePlaceholder")}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">{t("templateManage.description")}</label>
              <textarea
                value={templateForm.description}
                onChange={(e) => setTemplateForm((p) => ({ ...p, description: e.target.value }))}
                placeholder={t("templateManage.descriptionPlaceholder")}
                className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                rows={2}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{t("templateManage.steps")}</label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setTemplateForm((p) => ({ ...p, steps: [...p.steps, { name: "", promptTemplate: "" }] }))}
                >
                  <Plus className="h-3 w-3 mr-1" /> {t("templateManage.addStep")}
                </Button>
              </div>
              <div className="space-y-3">
                {templateForm.steps.map((step, idx) => (
                  <div key={idx} className="p-3 border rounded-md bg-[hsl(var(--muted))]/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{t("templateManage.step")} {idx + 1}</span>
                      {templateForm.steps.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-[hsl(var(--error))] h-7"
                          onClick={() =>
                            setTemplateForm((p) => ({
                              ...p,
                              steps: p.steps.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) =>
                        setTemplateForm((p) => ({
                          ...p,
                          steps: p.steps.map((s, i) => (i === idx ? { ...s, name: e.target.value } : s)),
                        }))
                      }
                      placeholder={t("templateManage.stepNamePlaceholder")}
                      className="w-full px-2 py-1.5 border rounded text-sm"
                    />
                    <textarea
                      value={step.promptTemplate}
                      onChange={(e) =>
                        setTemplateForm((p) => ({
                          ...p,
                          steps: p.steps.map((s, i) => (i === idx ? { ...s, promptTemplate: e.target.value } : s)),
                        }))
                      }
                      placeholder={t("templateManage.stepPromptPlaceholder")}
                      className="w-full px-2 py-1.5 border rounded text-sm font-mono resize-none"
                      rows={4}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setTemplateForm((p) => ({ ...p, open: false }))}>{t("confirm.cancel")}</Button>
            <Button onClick={saveTemplate}>{t("templateManage.save")}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {deleteConfirm && (
        <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
          <DialogContent className="lab-panel max-w-md rounded border shadow-sm">
            <DialogHeader>
              <DialogTitle>{t("confirm.delete")}</DialogTitle>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {deleteConfirm.type === "category"
                  ? t("templateManage.deleteCategoryConfirm", { name: deleteConfirm.name })
                  : t("templateManage.deleteTemplateConfirm", { name: deleteConfirm.name })}
              </p>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t("confirm.cancel")}</Button>
              <Button className="bg-[hsl(var(--error))] hover:bg-[hsl(var(--error))]/90" onClick={doDelete}>
                {t("confirm.delete")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
