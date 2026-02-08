const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> };
  
  // Only set Content-Type when there is a body
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  agents: {
    list: () => request<{ agents: import("./types").Agent[] }>("/agents"),
    get: (id: string) => request<import("./types").Agent>(`/agents/${id}`),
    create: (body: { name: string; steps?: import("./types").AgentStepCreate[] }) =>
      request<import("./types").Agent>("/agents", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: { name?: string; steps?: import("./types").AgentStepUpdate[] }) =>
      request<import("./types").Agent>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/agents/${id}`, { method: "DELETE" }),
    batchDelete: (ids: string[]) =>
      request<void>("/agents/batch-delete", { method: "POST", body: JSON.stringify({ ids }) }),
    duplicate: (id: string) =>
      request<import("./types").Agent>(`/agents/${id}/duplicate`, { method: "POST" }),
  },
  runs: {
    list: (agentId?: string) =>
      request<{ runs: import("./types").Run[] }>(agentId ? `/runs?agentId=${encodeURIComponent(agentId)}` : "/runs"),
    get: (id: string) => request<import("./types").Run>(`/runs/${id}`),
    create: (body: { agentId: string; inputs?: Record<string, string> }) =>
      request<import("./types").Run>("/runs", { method: "POST", body: JSON.stringify(body) }),
    replay: (id: string, fromStepIndex?: number) =>
      request<import("./types").Run>(`/runs/${id}/replay`, {
        method: "POST",
        body: JSON.stringify(fromStepIndex !== undefined ? { fromStepIndex } : {}),
      }),
    annotate: (id: string, body: { rating?: number | null; note?: string | null; tags?: string | null }) =>
      request<import("./types").Run>(`/runs/${id}/annotate`, { method: "PATCH", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/runs/${id}`, { method: "DELETE" }),
    batchDelete: (ids: string[]) =>
      request<void>("/runs/batch-delete", { method: "POST", body: JSON.stringify({ ids }) }),
  },
  share: {
    create: (runId: string) =>
      request<{ shareToken: string; shareUrl: string }>(`/share/${runId}`, { method: "POST" }),
    getByToken: (token: string) => request<import("./types").Run>(`/share/r/${token}`),
  },
  templates: {
    listCategories: () =>
      request<{ categories: import("./types").TemplateCategory[] }>("/templates/categories"),
    listTemplates: (categoryId?: string) =>
      request<{ templates: import("./types").Template[] }>(
        categoryId ? `/templates?categoryId=${encodeURIComponent(categoryId)}` : "/templates"
      ),
    createCategory: (body: { name: string; orderIndex?: number }) =>
      request<import("./types").TemplateCategory>("/templates/categories", { method: "POST", body: JSON.stringify(body) }),
    updateCategory: (id: string, body: { name?: string; orderIndex?: number }) =>
      request<import("./types").TemplateCategory>(`/templates/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteCategory: (id: string) => request<void>(`/templates/categories/${id}`, { method: "DELETE" }),
    createTemplate: (body: {
      categoryId?: string;
      builtinCategoryId?: string;
      name: string;
      description: string;
      steps: Array<{ name: string; promptTemplate: string }>;
      exampleInputs?: Record<string, string>;
      useCases?: string[];
    }) =>
      request<import("./types").Template>("/templates", { method: "POST", body: JSON.stringify(body) }),
    updateTemplate: (id: string, body: Partial<{
      categoryId: string | null;
      builtinCategoryId: string | null;
      name: string;
      description: string;
      steps: Array<{ name: string; promptTemplate: string }>;
      exampleInputs: Record<string, string> | null;
      useCases: string[] | null;
    }>) =>
      request<import("./types").Template>(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteTemplate: (id: string) => request<void>(`/templates/${id}`, { method: "DELETE" }),
  },
  datasets: {
    list: (agentId?: string) =>
      request<{ datasets: import("./types").Dataset[] }>(agentId ? `/datasets?agentId=${encodeURIComponent(agentId)}` : "/datasets"),
    get: (id: string) => request<import("./types").Dataset>(`/datasets/${id}`),
    create: (body: { agentId: string; name: string; cases: Record<string, string>[] }) =>
      request<import("./types").Dataset>("/datasets", { method: "POST", body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/datasets/${id}`, { method: "DELETE" }),
    batchRun: (id: string) =>
      request<{ runIds: string[]; runs: import("./types").Run[] }>(`/datasets/${id}/batch-run`, { method: "POST" }),
  },
};
