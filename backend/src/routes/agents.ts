import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const conditionSchema = z.union([
  z.object({
    if: z.string(),
    then: z.enum(["continue", "retry", "skip_next", "branch", "stop"]),
    else: z.enum(["continue", "retry", "skip_next", "branch", "stop"]),
  }),
  z.object({
    route: z.array(z.object({
      when: z.string(),
      toOrderIndex: z.number().int().min(0),
    })),
  }),
]).optional();

const stepChecksSchema = z
  .object({
    mustContain: z.string().optional(),
    mustBeJson: z.boolean().optional(),
    minLength: z.number().int().min(0).optional(),
    maxLength: z.number().int().min(0).optional(),
  })
  .optional();

const stepSchema = z.object({
  name: z.string().min(1),
  promptTemplate: z.string(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  stepType: z.enum(["action", "reflection"]).optional(),
  decisionPrompt: z.string().optional(),
  onCompleteDefault: z.enum(["continue", "retry", "skip_next", "branch", "stop"]).optional(),
  condition: conditionSchema,
  maxRetries: z.number().int().min(0).max(20).optional(),
  checks: stepChecksSchema,
});

const createBody = z.object({
  name: z.string().min(1),
  maxRetries: z.number().int().min(0).max(20).optional(),
  steps: z.array(stepSchema).optional().default([]),
});

const updateBody = z.object({
  name: z.string().min(1).optional(),
  maxRetries: z.number().int().min(0).max(20).nullable().optional(),
  steps: z.array(
    stepSchema.extend({
      id: z.string().optional(),
      orderIndex: z.number().int().min(0),
    })
  ).optional(),
});

export async function agentRoutes(app: FastifyInstance) {
  app.get("/", async () => {
    const agents = await prisma.agent.findMany({
      orderBy: { updatedAt: "desc" },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    return { agents };
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    if (!agent) return reply.status(404).send({ error: "Agent not found" });
    return agent;
  });

  app.post("/:id/duplicate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const source = await prisma.agent.findUnique({
      where: { id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    if (!source) return reply.status(404).send({ error: "Agent not found" });
    const copyName = `${source.name} (副本)`;
    const agent = await prisma.agent.create({
      data: {
        name: copyName,
        maxRetries: source.maxRetries,
        steps: {
          create: source.steps.map((s, i) => ({
            name: s.name,
            promptTemplate: s.promptTemplate,
            model: s.model ?? "gpt-4o-mini",
            temperature: s.temperature ?? 0.7,
            maxTokens: s.maxTokens ?? null,
            orderIndex: i,
            stepType: s.stepType ?? "action",
            decisionPrompt: s.decisionPrompt ?? null,
            onCompleteDefault: s.onCompleteDefault ?? "continue",
            condition: s.condition ?? undefined,
            maxRetries: s.maxRetries ?? null,
            checks: s.checks ?? undefined,
          })),
        },
      },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    return reply.status(201).send(agent);
  });

  app.post("/", async (req, reply) => {
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const { name, maxRetries: agentMaxRetries, steps } = parsed.data;
    try {
      const agent = await prisma.agent.create({
        data: {
          name,
          maxRetries: parsed.data.maxRetries ?? null,
          steps: {
            create: steps.map((s, i) => ({
              name: s.name,
              promptTemplate: s.promptTemplate,
              model: s.model ?? "gpt-4o-mini",
              temperature: s.temperature ?? 0.7,
              maxTokens: s.maxTokens ?? null,
              orderIndex: i,
              stepType: s.stepType ?? "action",
              decisionPrompt: s.decisionPrompt ?? null,
              onCompleteDefault: s.onCompleteDefault ?? "continue",
              condition: s.condition ?? undefined,
              maxRetries: s.maxRetries ?? null,
              checks: s.checks ?? undefined,
            })),
          },
        },
        include: { steps: { orderBy: { orderIndex: "asc" } } },
      });
      return reply.status(201).send(agent);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      req.log?.error?.(err);
      return reply.status(500).send({ error: "Create agent failed", details: message });
    }
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const { name, maxRetries: updateMaxRetries, steps } = parsed.data;
    if (name !== undefined || updateMaxRetries !== undefined) {
      await prisma.agent.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(updateMaxRetries !== undefined && { maxRetries: updateMaxRetries }),
        },
      });
    }

    if (steps !== undefined) {
      const existing = await prisma.step.findMany({ where: { agentId: id }, orderBy: { orderIndex: "asc" } });
      const existingIds = new Set(existing.map((s) => s.id));
      const stepIdsInPayload = steps.map((s) => (s as { id?: string }).id).filter(Boolean) as string[];

      for (const idToRemove of existingIds) {
        if (!stepIdsInPayload.includes(idToRemove)) {
          await prisma.step.delete({ where: { id: idToRemove } });
        }
      }

      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const stepId = (s as { id?: string }).id;
        const stepData = {
          name: s.name,
          promptTemplate: s.promptTemplate,
          model: s.model || "gpt-4o-mini",
          temperature: s.temperature ?? 0.7,
          maxTokens: s.maxTokens ?? null,
          orderIndex: i,
          stepType: s.stepType ?? "action",
          decisionPrompt: s.decisionPrompt ?? null,
          onCompleteDefault: s.onCompleteDefault ?? "continue",
          condition: (s as { condition?: unknown }).condition ?? undefined,
          maxRetries: (s as { maxRetries?: number }).maxRetries ?? null,
          checks: (s as { checks?: unknown }).checks ?? undefined,
        };
        if (stepId && existingIds.has(stepId)) {
          await prisma.step.update({
            where: { id: stepId },
            data: stepData,
          });
        } else {
          await prisma.step.create({
            data: { agentId: id, ...stepData },
          });
        }
      }
    }

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    return agent ?? reply.status(404).send({ error: "Agent not found" });
  });

  const batchDeleteBody = z.object({ ids: z.array(z.string()).min(1).max(100) });

  app.post("/batch-delete", async (req, reply) => {
    const parsed = batchDeleteBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const { ids } = parsed.data;
    await prisma.agent.deleteMany({ where: { id: { in: ids } } });
    return reply.status(204).send();
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.agent.delete({ where: { id } }).catch(() => null);
    return reply.status(204).send();
  });
}
