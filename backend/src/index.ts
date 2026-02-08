import Fastify from "fastify";
import cors from "@fastify/cors";
import { agentRoutes } from "./routes/agents.js";
import { runRoutes } from "./routes/runs.js";
import { shareRoutes } from "./routes/share.js";
import { captureRoutes } from "./routes/capture.js";
import { datasetRoutes } from "./routes/datasets.js";
import { templateRoutes } from "./routes/templates.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

app.register(agentRoutes, { prefix: "/api/agents" });
app.register(runRoutes, { prefix: "/api/runs" });
app.register(shareRoutes, { prefix: "/api/share" });
app.register(captureRoutes, { prefix: "/api/capture" });
app.register(datasetRoutes, { prefix: "/api/datasets" });
app.register(templateRoutes, { prefix: "/api/templates" });

const port = Number(process.env.PORT) || 3001;
await app.listen({ port, host: "0.0.0.0" });
console.log(`Backend listening on http://localhost:${port}`);
