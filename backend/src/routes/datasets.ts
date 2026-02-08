import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { callLLM, interpolateTemplate } from "../lib/llm.js";

const createDatasetBody = z.object({
  agentId: z.string(),
  name: z.string(),
  cases: z.array(z.record(z.string())), // [{ name: "Alice", topic: "AI" }, ...]
});

const batchRunBody = z.object({
  datasetId: z.string(),
});

export async function datasetRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const { agentId } = req.query as { agentId?: string };
    const where = agentId ? { agentId } : {};
    const datasets = await prisma.dataset.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { agent: true },
    });
    return { datasets };
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: { agent: { include: { steps: { orderBy: { orderIndex: "asc" } } } } },
    });
    if (!dataset) return reply.status(404).send({ error: "Dataset not found" });
    return dataset;
  });

  app.post("/", async (req, reply) => {
    const parsed = createDatasetBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const { agentId, name, cases } = parsed.data;

    const dataset = await prisma.dataset.create({
      data: {
        agentId,
        name,
        cases: JSON.stringify(cases),
      },
      include: { agent: true },
    });
    return reply.status(201).send(dataset);
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.dataset.delete({ where: { id } }).catch(() => null);
    return reply.status(204).send();
  });

  // Batch run: execute agent for all cases in the dataset
  app.post("/:id/batch-run", async (req, reply) => {
    const { id } = req.params as { id: string };
    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: { agent: { include: { steps: { orderBy: { orderIndex: "asc" } } } } },
    });
    if (!dataset) return reply.status(404).send({ error: "Dataset not found" });

    const cases = JSON.parse(dataset.cases) as Record<string, string>[];
    const runIds: string[] = [];

    for (let caseIdx = 0; caseIdx < cases.length; caseIdx++) {
      const caseInputs = cases[caseIdx];
      const run = await prisma.run.create({
        data: { agentId: dataset.agentId, datasetId: id, caseIndex: caseIdx, status: "running" },
      });
      runIds.push(run.id);

      let context: Record<string, string> = { ...caseInputs };
      let totalTokens = 0;
      let totalCost = 0;
      let totalLatencyMs = 0;

      for (let i = 0; i < dataset.agent.steps.length; i++) {
        const step = dataset.agent.steps[i];
        const prompt = interpolateTemplate(step.promptTemplate, context);

        const stepRun = await prisma.stepRun.create({
          data: {
            runId: run.id,
            stepId: step.id,
            orderIndex: i,
            input: JSON.stringify(context),
            prompt,
            status: "running",
          },
        });

        try {
          const result = await callLLM(prompt);
          context[`step_${i}`] = result.content;
          context[step.name] = result.content;
          totalTokens += result.promptTokens + result.completionTokens;
          totalCost += result.cost;
          totalLatencyMs += result.latencyMs;

          await prisma.stepRun.update({
            where: { id: stepRun.id },
            data: {
              output: result.content,
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              latencyMs: result.latencyMs,
              cost: result.cost,
              status: "completed",
            },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          await prisma.stepRun.update({
            where: { id: stepRun.id },
            data: { status: "failed", errorMessage: message },
          });
          await prisma.run.update({
            where: { id: run.id },
            data: { status: "failed", totalTokens, totalCost, totalLatencyMs },
          });
          break;
        }
      }

      await prisma.run.update({
        where: { id: run.id },
        data: { status: "completed", totalTokens, totalCost, totalLatencyMs },
      });
    }

    const runs = await prisma.run.findMany({
      where: { id: { in: runIds } },
      include: {
        agent: true,
        stepRuns: { include: { step: true }, orderBy: { orderIndex: "asc" } },
      },
    });

    return reply.status(201).send({ runIds, runs });
  });
}
