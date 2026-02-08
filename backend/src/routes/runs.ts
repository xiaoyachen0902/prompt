import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { callLLM, interpolateTemplate, parseDecisionOutput, evaluateCondition, runStepChecks, type StepChecks } from "../lib/llm.js";

const DEFAULT_MAX_RETRIES = 3;
const NEXT_ACTIONS = ["CONTINUE", "RETRY", "SKIP_NEXT", "BRANCH", "STOP"] as const;
type NextAction = (typeof NEXT_ACTIONS)[number];

function toNextAction(s: string): NextAction {
  const u = s.toUpperCase().replace(/-/g, "_");
  return (NEXT_ACTIONS.includes(u as NextAction) ? u : "CONTINUE") as NextAction;
}

const runBody = z.object({
  agentId: z.string(),
  inputs: z.record(z.string()).optional().default({}),
});

const replayBody = z.object({
  fromStepIndex: z.number().int().min(0).optional(),
});

const annotateBody = z.object({
  rating: z.number().int().min(-1).max(5).nullable().optional(),
  note: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
});

export async function runRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const { agentId } = req.query as { agentId?: string };
    const where = agentId ? { agentId } : {};
    const runs = await prisma.run.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        agent: true,
        stepRuns: {
          include: { step: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    return { runs };
  });

  app.get("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        agent: { include: { steps: { orderBy: { orderIndex: "asc" } } } },
        stepRuns: {
          include: { step: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    if (!run) return reply.status(404).send({ error: "Run not found" });
    return run;
  });

  app.post("/", async (req, reply) => {
    const parsed = runBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const { agentId, inputs } = parsed.data;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    const run = await prisma.run.create({
      data: { agentId, status: "running" },
      include: { stepRuns: true },
    });

    let context: Record<string, string> = { ...inputs };
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatencyMs = 0;
    const retryCount: Record<number, number> = {};
    let i = 0;

    while (i < agent.steps.length) {
      const step = agent.steps[i];
      const prompt = interpolateTemplate(step.promptTemplate, context);

      let stepRun = await prisma.stepRun.findFirst({
        where: { runId: run.id, orderIndex: i },
      });
      if (!stepRun) {
        stepRun = await prisma.stepRun.create({
          data: {
            runId: run.id,
            stepId: step.id,
            orderIndex: i,
            input: JSON.stringify(context),
            prompt,
            status: "running",
          },
        });
      } else {
        await prisma.stepRun.update({
          where: { id: stepRun.id },
          data: { prompt, status: "running", input: JSON.stringify(context) },
        });
      }

      try {
        const result = await callLLM(prompt, {
          model: step.model || undefined,
          temperature: step.temperature ?? undefined,
          maxTokens: step.maxTokens || undefined,
        });
        totalTokens += result.promptTokens + result.completionTokens;
        totalCost += result.cost;
        totalLatencyMs += result.latencyMs;

        const isReflection = step.stepType === "reflection";
        if (isReflection) {
          await prisma.stepRun.update({
            where: { id: stepRun.id },
            data: {
              evaluation: result.content,
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              latencyMs: result.latencyMs,
              cost: result.cost,
              status: "completed",
              model: step.model ?? undefined,
              temperature: step.temperature ?? undefined,
              maxTokens: step.maxTokens ?? undefined,
            },
          });
        } else {
          context[`step_${i}`] = result.content;
          context[step.name] = result.content;
          const checks = (step.checks as StepChecks | null) ?? undefined;
          const checkResult = runStepChecks(result.content, checks);
          await prisma.stepRun.update({
            where: { id: stepRun.id },
            data: {
              output: result.content,
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              latencyMs: result.latencyMs,
              cost: result.cost,
              status: "completed",
              model: step.model ?? undefined,
              temperature: step.temperature ?? undefined,
              maxTokens: step.maxTokens ?? undefined,
              checkResult: JSON.stringify(checkResult),
            },
          });
        }

        const maxRetries = step.maxRetries ?? agent.maxRetries ?? DEFAULT_MAX_RETRIES;
        let nextAction: NextAction = toNextAction((step.onCompleteDefault as string) ?? "continue");
        let decisionOutput: string | null = null;
        let decisionType: "default" | "decisionPrompt" | "condition" = "default";
        let decisionInput: string | null = null;
        let nextStepIndex: number | null = null;

        if (step.decisionPrompt) {
          decisionType = "decisionPrompt";
          const decisionCtx = { ...context, output: result.content };
          const decisionPrompt = interpolateTemplate(step.decisionPrompt, decisionCtx);
          decisionInput = decisionPrompt;
          const decRes = await callLLM(decisionPrompt, { temperature: 0, model: step.model ?? undefined });
          totalTokens += decRes.promptTokens + decRes.completionTokens;
          totalCost += decRes.cost;
          totalLatencyMs += decRes.latencyMs;
          decisionOutput = decRes.content;
          const parsed = parseDecisionOutput(decRes.content);
          nextAction = toNextAction(parsed.action);
          nextStepIndex = parsed.nextStepIndex ?? null;
        } else if (step.condition && typeof step.condition === "object" && "if" in step.condition) {
          decisionType = "condition";
          const cond = step.condition as { if: string; then: string; else: string };
          decisionInput = JSON.stringify(cond);
          const yes = await evaluateCondition(result.content, cond.if, {
            model: step.model ?? undefined,
            temperature: 0,
          });
          nextAction = toNextAction(yes ? cond.then : cond.else);
          decisionOutput = `Condition: "${cond.if}" => ${yes ? "yes" : "no"} => ${nextAction}`;
        }

        await prisma.stepRun.update({
          where: { id: stepRun.id },
          data: { nextAction, decisionType, decisionInput, decisionOutput, nextStepIndex },
        });

        if (nextAction === "STOP") {
          await prisma.run.update({ where: { id: run.id }, data: { stopReason: "decision_stop" } });
          break;
        }
        if (nextAction === "RETRY") {
          retryCount[i] = (retryCount[i] ?? 0) + 1;
          if (retryCount[i]! >= maxRetries) {
            await prisma.run.update({ where: { id: run.id }, data: { stopReason: "max_retries" } });
            i++;
          } else continue;
        } else if (nextAction === "SKIP_NEXT") i += 2;
        else if (nextAction === "BRANCH" && nextStepIndex != null) i = nextStepIndex;
        else i++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.stepRun.update({
          where: { id: stepRun.id },
          data: { status: "failed", errorMessage: message },
        });
        await prisma.run.update({
          where: { id: run.id },
          data: { status: "failed", totalTokens, totalCost, totalLatencyMs, stopReason: "error" },
        });
        const updated = await prisma.run.findUnique({
          where: { id: run.id },
          include: {
            agent: true,
            stepRuns: { include: { step: true }, orderBy: { orderIndex: "asc" } },
          },
        });
        return reply.status(500).send({ error: message, run: updated });
      }
    }

    await prisma.run.update({
      where: { id: run.id },
      data: { status: "completed", totalTokens, totalCost, totalLatencyMs },
    });

    const updated = await prisma.run.findUnique({
      where: { id: run.id },
      include: {
        agent: true,
        stepRuns: { include: { step: true }, orderBy: { orderIndex: "asc" } },
      },
    });
    return reply.status(201).send(updated);
  });

  app.post("/:id/replay", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = replayBody.safeParse(req.body || {});
    const fromStepIndex = parsed.success ? parsed.data.fromStepIndex ?? 0 : 0;

    const existingRun = await prisma.run.findUnique({
      where: { id },
      include: {
        agent: true,
        stepRuns: { include: { step: true }, orderBy: { orderIndex: "asc" } },
      },
    });
    if (!existingRun) return reply.status(404).send({ error: "Run not found" });

    const inputs: Record<string, string> = {};
    for (let i = 0; i < fromStepIndex; i++) {
      const sr = existingRun.stepRuns[i];
      if (sr?.output) {
        inputs[`step_${i}`] = sr.output;
        inputs[sr.step.name] = sr.output;
      }
    }

    const runBodyParsed = runBody.safeParse({
      agentId: existingRun.agentId,
      inputs,
    });
    if (!runBodyParsed.success) return reply.status(400).send(runBodyParsed.error.flatten());

    const agent = await prisma.agent.findUnique({
      where: { id: existingRun.agentId },
      include: { steps: { orderBy: { orderIndex: "asc" } } },
    });
    if (!agent) return reply.status(404).send({ error: "Agent not found" });

    const run = await prisma.run.create({
      data: { agentId: agent.id, status: "running" },
    });

    let context: Record<string, string> = { ...inputs };
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatencyMs = 0;
    const retryCount: Record<number, number> = {};
    let i = fromStepIndex;

    while (i < agent.steps.length) {
      const step = agent.steps[i];
      const prompt = interpolateTemplate(step.promptTemplate, context);

      let stepRun = await prisma.stepRun.findFirst({
        where: { runId: run.id, orderIndex: i },
      });
      if (!stepRun) {
        stepRun = await prisma.stepRun.create({
          data: {
            runId: run.id,
            stepId: step.id,
            orderIndex: i,
            input: JSON.stringify(context),
            prompt,
            status: "running",
          },
        });
      } else {
        await prisma.stepRun.update({
          where: { id: stepRun.id },
          data: { prompt, status: "running", input: JSON.stringify(context) },
        });
      }

      try {
        const result = await callLLM(prompt, {
          model: step.model || undefined,
          temperature: step.temperature ?? undefined,
          maxTokens: step.maxTokens || undefined,
        });
        totalTokens += result.promptTokens + result.completionTokens;
        totalCost += result.cost;
        totalLatencyMs += result.latencyMs;

        const isReflection = step.stepType === "reflection";
        if (isReflection) {
          await prisma.stepRun.update({
            where: { id: stepRun.id },
            data: {
              evaluation: result.content,
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              latencyMs: result.latencyMs,
              cost: result.cost,
              status: "completed",
              model: step.model ?? undefined,
              temperature: step.temperature ?? undefined,
              maxTokens: step.maxTokens ?? undefined,
            },
          });
        } else {
          context[`step_${i}`] = result.content;
          context[step.name] = result.content;
          const checks = (step.checks as StepChecks | null) ?? undefined;
          const checkResult = runStepChecks(result.content, checks);
          await prisma.stepRun.update({
            where: { id: stepRun.id },
            data: {
              output: result.content,
              promptTokens: result.promptTokens,
              completionTokens: result.completionTokens,
              latencyMs: result.latencyMs,
              cost: result.cost,
              status: "completed",
              model: step.model ?? undefined,
              temperature: step.temperature ?? undefined,
              maxTokens: step.maxTokens ?? undefined,
              checkResult: JSON.stringify(checkResult),
            },
          });
        }

        const maxRetries = step.maxRetries ?? agent.maxRetries ?? DEFAULT_MAX_RETRIES;
        let nextAction: NextAction = toNextAction((step.onCompleteDefault as string) ?? "continue");
        let decisionOutput: string | null = null;
        let decisionType: "default" | "decisionPrompt" | "condition" = "default";
        let decisionInput: string | null = null;
        let nextStepIndex: number | null = null;

        if (step.decisionPrompt) {
          decisionType = "decisionPrompt";
          const decisionCtx = { ...context, output: result.content };
          const decisionPrompt = interpolateTemplate(step.decisionPrompt, decisionCtx);
          decisionInput = decisionPrompt;
          const decRes = await callLLM(decisionPrompt, { temperature: 0, model: step.model ?? undefined });
          totalTokens += decRes.promptTokens + decRes.completionTokens;
          totalCost += decRes.cost;
          totalLatencyMs += decRes.latencyMs;
          decisionOutput = decRes.content;
          const parsed = parseDecisionOutput(decRes.content);
          nextAction = toNextAction(parsed.action);
          nextStepIndex = parsed.nextStepIndex ?? null;
        } else if (step.condition && typeof step.condition === "object" && "if" in step.condition) {
          decisionType = "condition";
          const cond = step.condition as { if: string; then: string; else: string };
          decisionInput = JSON.stringify(cond);
          const yes = await evaluateCondition(result.content, cond.if, {
            model: step.model ?? undefined,
            temperature: 0,
          });
          nextAction = toNextAction(yes ? cond.then : cond.else);
          decisionOutput = `Condition: "${cond.if}" => ${yes ? "yes" : "no"} => ${nextAction}`;
        }

        await prisma.stepRun.update({
          where: { id: stepRun.id },
          data: { nextAction, decisionType, decisionInput, decisionOutput, nextStepIndex },
        });

        if (nextAction === "STOP") {
          await prisma.run.update({ where: { id: run.id }, data: { stopReason: "decision_stop" } });
          break;
        }
        if (nextAction === "RETRY") {
          retryCount[i] = (retryCount[i] ?? 0) + 1;
          if (retryCount[i]! >= maxRetries) {
            await prisma.run.update({ where: { id: run.id }, data: { stopReason: "max_retries" } });
            i++;
          } else continue;
        } else if (nextAction === "SKIP_NEXT") i += 2;
        else if (nextAction === "BRANCH" && nextStepIndex != null) i = nextStepIndex;
        else i++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.stepRun.update({
          where: { id: stepRun.id },
          data: { status: "failed", errorMessage: message },
        });
        await prisma.run.update({
          where: { id: run.id },
          data: { status: "failed", totalTokens, totalCost, totalLatencyMs, stopReason: "error" },
        });
        const updated = await prisma.run.findUnique({
          where: { id: run.id },
          include: {
            agent: true,
            stepRuns: { include: { step: true }, orderBy: { orderIndex: "asc" } },
          },
        });
        return reply.status(500).send({ error: message, run: updated });
      }
    }

    await prisma.run.update({
      where: { id: run.id },
      data: { status: "completed", totalTokens, totalCost, totalLatencyMs },
    });

    const updated = await prisma.run.findUnique({
      where: { id: run.id },
      include: {
        agent: true,
        stepRuns: { include: { step: true }, orderBy: { orderIndex: "asc" } },
      },
    });
    return reply.status(201).send(updated);
  });

  app.patch("/:id/annotate", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = annotateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    
    const data: Record<string, unknown> = {};
    if (parsed.data.rating !== undefined) data.rating = parsed.data.rating;
    if (parsed.data.note !== undefined) data.note = parsed.data.note;
    if (parsed.data.tags !== undefined) data.tags = parsed.data.tags;

    const run = await prisma.run.update({
      where: { id },
      data,
      include: {
        agent: true,
        stepRuns: { include: { step: true }, orderBy: { orderIndex: "asc" } },
      },
    });
    return run;
  });

  const batchDeleteBody = z.object({ ids: z.array(z.string()).min(1).max(100) });

  app.post("/batch-delete", async (req, reply) => {
    const parsed = batchDeleteBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const { ids } = parsed.data;
    await prisma.run.deleteMany({ where: { id: { in: ids } } });
    return reply.status(204).send();
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.run.delete({ where: { id } }).catch(() => null);
    return reply.status(204).send();
  });
}
