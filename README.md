# Prompt Debug

A production-ready **Agent / Prompt debugging platform** for engineers. Define multi-step LLM workflows, run them against OpenAI-compatible APIs (OpenAI, DeepSeek, Gemini, etc.), inspect inputs/prompts/outputs, track costs, and evaluate with datasets. UI is built as a **lab-style workbench** (not a generic SaaS dashboard).

---

## Features

### Core workflow
- **Agents & steps** — Multi-step workflows with prompt templates and `{{variable}}` interpolation
- **Visual flow editor** — Drag-and-drop canvas to add steps, reorder, and create branches
- **Run & record** — Execute steps sequentially; record input, prompt, output, tokens, latency, cost per step
- **Replay** — Replay entire run or from a specific step (reuses previous outputs)
- **Compare** — Diff prompts and outputs between two runs
- **Share** — Generate read-only share links for runs

### Evaluation & tracking
- **Annotations** — Rate runs (👍/👎), add notes, tag for filtering
- **Datasets** — Test case collections for batch evaluation
- **Batch run** — Run agent against all dataset cases at once
- **Templates** — Pre-built agent templates (outline→draft→polish, code gen→review, research→memo, etc.)

### Multi-LLM support
- **OpenAI-compatible API** — Set `OPENAI_BASE_URL` to use DeepSeek, Gemini (via gateway), or any compatible endpoint
- **Per-step model** — Choose model per step (e.g. GPT-4o for reasoning, gpt-4o-mini for simple steps)
- **Custom model ID** — Support for any model ID your endpoint provides

### External integration (SDK)
- Capture LLM calls from your own Node.js or Python apps; view and annotate them in the UI. See [SDK.md](./SDK.md).

### UI
- **Light / dark mode** — Theme toggle with persisted preference
- **i18n** — English and Chinese UI

---

## Tech stack

| Layer   | Stack |
|--------|--------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Radix UI, Monaco Editor, React Flow |
| Backend  | Node.js, TypeScript, Fastify, Prisma |
| Database | MySQL (or compatible) |

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/prompt-debug.git
cd prompt-debug
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set DATABASE_URL, OPENAI_API_KEY (and optionally OPENAI_BASE_URL, MODEL)
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Backend runs at **http://localhost:3001**.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173** and proxies `/api` to the backend.

### 4. Open the app

Visit **http://localhost:5173**. Create an agent, add steps (or pick a template), and run.

---

## Environment (backend)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MySQL connection string, e.g. `mysql://user:password@localhost:3306/prompt_debug` |
| `OPENAI_API_KEY` | Yes | API key for your LLM provider |
| `OPENAI_BASE_URL` | No | Default `https://api.openai.com/v1`. Set to e.g. `https://api.deepseek.com/v1` for DeepSeek |
| `MODEL` | No | Default model ID, e.g. `gpt-4o-mini` |
| `PORT` | No | Server port, default `3001` |

---

## Project structure

```
prompt-debug/
├── backend/
│   ├── prisma/schema.prisma    # DB schema
│   ├── src/
│   │   ├── index.ts            # Fastify app, routes
│   │   ├── lib/llm.ts          # LLM client (OpenAI-compatible), pricing
│   │   └── routes/             # agents, runs, share, datasets, capture, templates
│   └── sdk/                    # Node.js & Python SDK for capture
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/              # AgentList, AgentEditor, RunView, SharedRun, TemplateManage
│   │   ├── components/         # FlowEditor, PromptEditor, CompareRunsDialog, ThemeToggle, ui
│   │   ├── lib/                # api, models, templates, utils
│   │   ├── i18n/               # translations (en/zh)
│   │   └── theme.tsx           # dark/light theme
│   └── vite.config.ts
├── .env.example                # (in backend: copy to .env)
├── README.md
├── SDK.md                      # SDK integration guide
├── QUICKSTART.md               # Quick start (optional read)
└── TEST_GUIDE.md               # Manual test scenarios
```

---

## API overview

| Area | Endpoints |
|------|-----------|
| Agents | `GET/POST /api/agents`, `GET/PATCH/DELETE /api/agents/:id` |
| Runs | `GET /api/runs?agentId=`, `GET /api/runs/:id`, `POST /api/runs`, `POST /api/runs/:id/replay`, `PATCH /api/runs/:id/annotate`, `DELETE /api/runs/:id` |
| Share | `POST /api/share/:runId`, `GET /api/share/r/:token` |
| Datasets | `GET/POST /api/datasets`, `GET/DELETE /api/datasets/:id`, `POST /api/datasets/:id/batch-run` |
| Capture | `POST /api/capture/step` (SDK) |

---

## Documentation

| Doc | Description |
|-----|--------------|
| [README.md](./README.md) | This file — overview, setup, structure |
| [SDK.md](./SDK.md) | Integrate your app: capture LLM calls from Node.js/Python |
| [QUICKSTART.md](./QUICKSTART.md) | Short walkthrough (create agent, run, replay) |
| [TEST_GUIDE.md](./TEST_GUIDE.md) | Manual test cases and checklist |
| [FLOW_EDITOR_GUIDE.md](./FLOW_EDITOR_GUIDE.md) | Visual flow editor: drag steps, branches |
| [STEP_CONFIG_GUIDE.md](./STEP_CONFIG_GUIDE.md) | Per-step model, temperature, max tokens, decision/branch |
| [MIGRATION.md](./MIGRATION.md) | Migration from earlier versions |

---

## License

MIT. See [LICENSE](./LICENSE) if present.
