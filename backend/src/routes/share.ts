import { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import { prisma } from "../lib/prisma.js";

export async function shareRoutes(app: FastifyInstance) {
  app.post("/:runId", async (req, reply) => {
    const { runId } = req.params as { runId: string };
    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (!run) return reply.status(404).send({ error: "Run not found" });

    const shareToken = run.shareToken ?? nanoid(12);
    if (!run.shareToken) {
      await prisma.run.update({
        where: { id: runId },
        data: { shareToken },
      });
    }

    return { shareToken, shareUrl: `/r/${shareToken}` };
  });

  app.get("/r/:token", async (req, reply) => {
    const { token } = req.params as { token: string };
    const run = await prisma.run.findUnique({
      where: { shareToken: token },
      include: {
        agent: true,
        stepRuns: {
          include: { step: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    if (!run) return reply.status(404).send({ error: "Run not found" });
    return run;
  });
}
