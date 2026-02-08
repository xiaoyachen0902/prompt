import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const captureBody = z.object({
  agentName: z.string(),
  stepName: z.string(),
  prompt: z.string(),
  output: z.string().optional(),
  input: z.record(z.string()).optional(),
  promptTokens: z.number().int().min(0).optional().default(0),
  completionTokens: z.number().int().min(0).optional().default(0),
  latencyMs: z.number().int().min(0).optional().default(0),
  cost: z.number().min(0).optional().default(0),
  status: z.enum(["completed", "failed"]).optional().default("completed"),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional(), // custom metadata
});

export async function captureRoutes(app: FastifyInstance) {
  // Capture single step execution (sent from external project)
  app.post("/step", async (req, reply) => {
    const parsed = captureBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    
    const { agentName, stepName, prompt, output, input, promptTokens, completionTokens, latencyMs, cost, status, errorMessage, metadata } = parsed.data;

    // Auto-create or find agent
    let agent = await prisma.agent.findFirst({ where: { name: agentName } });
    if (!agent) {
      agent = await prisma.agent.create({ data: { name: agentName } });
    }

    // Auto-create or find step
    let step = await prisma.step.findFirst({ where: { agentId: agent.id, name: stepName } });
    if (!step) {
      const maxOrder = await prisma.step.findFirst({
        where: { agentId: agent.id },
        orderBy: { orderIndex: "desc" },
      });
      step = await prisma.step.create({
        data: {
          agentId: agent.id,
          name: stepName,
          promptTemplate: prompt,
          orderIndex: (maxOrder?.orderIndex ?? -1) + 1,
        },
      });
    }

    // Create an automatic run
    const run = await prisma.run.create({
      data: { agentId: agent.id, status, totalTokens: promptTokens + completionTokens, totalCost: cost, totalLatencyMs: latencyMs },
    });

    // Create stepRun
    const stepRun = await prisma.stepRun.create({
      data: {
        runId: run.id,
        stepId: step.id,
        orderIndex: 0,
        input: JSON.stringify(input ?? {}),
        prompt,
        output: output ?? null,
        promptTokens,
        completionTokens,
        latencyMs,
        cost,
        status,
        errorMessage: errorMessage ?? null,
      },
    });

    return reply.status(201).send({ runId: run.id, stepRunId: stepRun.id, agentId: agent.id });
  });
}
