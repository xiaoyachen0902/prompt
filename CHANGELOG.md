# Changelog

## [2.0.0] - 2026-02-07 - Production Ready Release

### 🎉 Major Features

#### 1. SDK Integration for External Projects
- **NEW:** `POST /api/capture/step` endpoint for capturing LLM calls from external apps
- **NEW:** Node.js SDK (`backend/sdk/node.ts`) with auto-capture wrapper
- **NEW:** Python SDK (`backend/sdk/python.py`) with decorator support
- Agents and Steps are auto-created if they don't exist
- Fire-and-forget design for non-blocking capture

#### 2. Dataset & Batch Evaluation
- **NEW:** `Dataset` model to store test case collections
- **NEW:** `POST /api/datasets` - Create datasets with multiple input cases
- **NEW:** `POST /api/datasets/:id/batch-run` - Run agent against all cases at once
- **NEW:** Run model now includes `datasetId` and `caseIndex` for batch run tracking
- **NEW:** Frontend API client methods for datasets (`api.datasets.*`)

#### 3. Schema Improvements
- **FIXED:** StepRun unique constraint bug - changed from `@@unique([runId, stepId])` to `@@unique([runId, orderIndex])`
- This allows re-running the same step or reusing steps in different positions
- Added index on `stepId` for faster lookups

### 🔧 Backend Changes

**New Files:**
- `backend/src/routes/capture.ts` - SDK capture endpoint
- `backend/src/routes/datasets.ts` - Dataset CRUD + batch run
- `backend/sdk/node.ts` - Node.js/TypeScript SDK
- `backend/sdk/python.py` - Python SDK
- `backend/migrations/dataset_migration.sql` - Database migration script

**Modified Files:**
- `backend/src/index.ts` - Registered capture and datasets routes
- `backend/prisma/schema.prisma` - Added Dataset model, updated Run and StepRun

### 🎨 Frontend Changes

**Modified Files:**
- `frontend/src/types.ts` - Added Dataset interface, updated Run interface
- `frontend/src/api.ts` - Added datasets API methods

### 📚 Documentation

**New Files:**
- `SDK.md` - SDK integration guide with API reference
- `SDK_EXAMPLES.md` - Practical examples for Node.js, Python, OpenAI, LangChain
- `MIGRATION.md` - Guide for upgrading from demo to production
- `QUICKSTART.md` - 5-minute getting started tutorial
- `CHANGELOG.md` - This file
- `test_sdk.sh` - Shell script to test SDK capture endpoint

**Modified Files:**
- `README.md` - Updated with new features, use cases, and architecture improvements

### 🐛 Bug Fixes
- Fixed StepRun unique constraint preventing step re-execution
- All database foreign keys properly configured with CASCADE/SET NULL

### 🔄 Migration Notes

If upgrading from v1.x:

1. **Database Schema:**
   ```bash
   cd backend
   mysql -u root -p your_database < migrations/dataset_migration.sql
   npx prisma generate
   ```

2. **Breaking Changes:** None - all changes are additive

3. **New Environment Variables:** None required (all optional)

### 📊 Stats
- **New API endpoints:** 6 (`/api/capture/*`, `/api/datasets/*`)
- **New database models:** 1 (`Dataset`)
- **New SDK languages:** 2 (Node.js, Python)
- **New documentation pages:** 5

---

## [1.0.0] - 2026-02-06 - Initial Release

### ✨ Core Features

#### Agent Management
- Create agents with multiple sequential steps
- Each step has a name and prompt template
- Prompt templates support `{{variable}}` interpolation
- Update and delete agents
- Built-in agent templates (5 presets)

#### Run Execution
- Execute agent with custom inputs
- Sequential step execution with context propagation
- Automatic cost calculation (OpenAI pricing)
- Token usage and latency tracking per step
- Error handling and partial success support

#### Run View (3-column layout)
- **Left:** Step timeline with status indicators
- **Center:** Tabbed view for Output/Prompt/Input (Monaco Editor)
- **Right:** Cost summary and action buttons

#### Advanced Features
- **Replay:** Re-run entire agent or from specific step
- **Compare:** Diff two runs with side-by-side comparison
- **Share:** Generate read-only share links with unique tokens
- **Annotations:** Rate runs (👍/👎), add notes and tags

#### UI/UX
- Modern, clean interface with Morandi color palette
- High contrast for accessibility
- Responsive layout
- Frosted glass effects (customizable)
- Monaco code editor for prompts/outputs

### 🔧 Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn-ui, Monaco Editor
- **Backend:** Node.js, TypeScript, Fastify, Prisma ORM
- **Database:** MySQL (with full TEXT support for long content)
- **API:** RESTful with JSON

### 📚 Documentation
- README.md with setup instructions
- API endpoint documentation
- Environment variable examples

### 🐛 Known Limitations (Fixed in v2.0.0)
- Only supports in-platform agent runs (no external integration)
- No batch evaluation or dataset support
- StepRun unique constraint prevents step re-execution

---

## Version Naming

- **Major version** (x.0.0): Breaking changes or major feature additions
- **Minor version** (1.x.0): New features, backward compatible
- **Patch version** (1.0.x): Bug fixes, small improvements
