import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const BUILTIN_CATEGORY_IDS = ["professional", "learning", "code", "travel", "advanced", "creative"] as const;

const templateStepSchema = z.object({
  name: z.string().min(1),
  promptTemplate: z.string(),
});

const categoryBody = z.object({
  name: z.string().min(1).max(100),
  orderIndex: z.number().int().min(0).optional(),
});

const templateBody = z.object({
  categoryId: z.string().optional(),
  builtinCategoryId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string(),
  steps: z.array(templateStepSchema).min(1),
  exampleInputs: z.record(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
});

const templateCreateBody = templateBody.refine(
  (d) => (d.categoryId != null && d.categoryId !== "") !== (d.builtinCategoryId != null && d.builtinCategoryId !== ""),
  { message: "Provide exactly one of categoryId or builtinCategoryId" }
);

export async function templateRoutes(app: FastifyInstance) {
  // --- Categories ---
  app.get("/categories", async () => {
    const list = await prisma.templateCategory.findMany({
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { templates: true } } },
    });
    return { categories: list };
  });

  app.post("/categories", async (req, reply) => {
    const parsed = categoryBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const cat = await prisma.templateCategory.create({
      data: {
        name: parsed.data.name,
        orderIndex: parsed.data.orderIndex ?? 0,
      },
    });
    return reply.status(201).send(cat);
  });

  app.patch("/categories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = categoryBody.partial().safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const cat = await prisma.templateCategory.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.orderIndex !== undefined && { orderIndex: parsed.data.orderIndex }),
      },
    });
    return cat;
  });

  app.delete("/categories/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.templateCategory.delete({ where: { id } }).catch(() => null);
    return reply.status(204).send();
  });

  // --- Templates ---
  app.get("/", async (req) => {
    const { categoryId } = req.query as { categoryId?: string };
    const isBuiltin = categoryId && BUILTIN_CATEGORY_IDS.includes(categoryId as (typeof BUILTIN_CATEGORY_IDS)[number]);
    const where = !categoryId
      ? {}
      : isBuiltin
        ? { builtinCategoryId: categoryId }
        : { categoryId: categoryId };
    const list = await prisma.template.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { category: true },
    });
    return { templates: list };
  });

  app.post("/", async (req, reply) => {
    const parsed = templateCreateBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const { categoryId, builtinCategoryId, name, description, steps, exampleInputs, useCases } = parsed.data;
    if (builtinCategoryId != null && builtinCategoryId !== "") {
      if (!BUILTIN_CATEGORY_IDS.includes(builtinCategoryId as (typeof BUILTIN_CATEGORY_IDS)[number])) {
        return reply.status(400).send({ error: "Invalid builtinCategoryId" });
      }
      const template = await prisma.template.create({
        data: {
          categoryId: null,
          builtinCategoryId,
          name,
          description,
          steps: JSON.stringify(steps),
          exampleInputs: exampleInputs != null ? JSON.stringify(exampleInputs) : null,
          useCases: useCases != null ? JSON.stringify(useCases) : null,
        },
        include: { category: true },
      });
      return reply.status(201).send(template);
    }
    const category = await prisma.templateCategory.findUnique({ where: { id: categoryId! } });
    if (!category) return reply.status(404).send({ error: "Category not found" });
    const template = await prisma.template.create({
      data: {
        categoryId: categoryId!,
        builtinCategoryId: null,
        name,
        description,
        steps: JSON.stringify(steps),
        exampleInputs: exampleInputs != null ? JSON.stringify(exampleInputs) : null,
        useCases: useCases != null ? JSON.stringify(useCases) : null,
      },
      include: { category: true },
    });
    return reply.status(201).send(template);
  });

  app.patch("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = templateBody.partial().safeParse(req.body);
    if (!parsed.success) return reply.status(400).send(parsed.error.flatten());
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.categoryId !== undefined) {
      data.categoryId = parsed.data.categoryId ?? null;
      data.builtinCategoryId = null;
    }
    if (parsed.data.builtinCategoryId !== undefined) {
      if (parsed.data.builtinCategoryId && !BUILTIN_CATEGORY_IDS.includes(parsed.data.builtinCategoryId as (typeof BUILTIN_CATEGORY_IDS)[number])) {
        return reply.status(400).send({ error: "Invalid builtinCategoryId" });
      }
      data.builtinCategoryId = parsed.data.builtinCategoryId ?? null;
      data.categoryId = parsed.data.builtinCategoryId ? null : undefined;
    }
    if (parsed.data.steps !== undefined) data.steps = JSON.stringify(parsed.data.steps);
    if (parsed.data.exampleInputs !== undefined) data.exampleInputs = parsed.data.exampleInputs != null ? JSON.stringify(parsed.data.exampleInputs) : null;
    if (parsed.data.useCases !== undefined) data.useCases = parsed.data.useCases != null ? JSON.stringify(parsed.data.useCases) : null;
    const template = await prisma.template.update({
      where: { id },
      data: data as never,
      include: { category: true },
    });
    return template;
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    await prisma.template.delete({ where: { id } }).catch(() => null);
    return reply.status(204).send();
  });
}
