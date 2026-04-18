# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Next.js dev server with Turbopack (localhost:3000)
npm run build        # Production build (standalone output)
npm run lint         # ESLint

# Desktop app (requires Rust)
npm run tauri:dev
npm run tauri:build

# Database
npm run db:generate  # Regenerate Drizzle migration files after schema changes
npm run db:migrate   # Apply pending migrations
npm run db:studio    # Open Drizzle web UI for DB inspection
```

There is no test runner configured in this project.

## Architecture Overview

Troupe is a local-first multi-agent AI workbench that guides solo developers through 6 sequential product design phases (brainstorm → requirements → design → architecture → development → delivery). Seven specialized AI agent roles collaborate across phases, automatically producing structured documents.

### Key Layers

**Next.js App Router** (`src/app/`)
- `/` — project dashboard
- `/project/[id]` — main workspace with phase-gated chat
- `/project/[id]/documents` — generated document viewer
- `/settings` — API key and AI provider configuration

**API Routes** (`src/app/api/`)
- `/api/chat` — streaming chat endpoint; injects agent context, handles dual-provider routing
- `/api/projects` — CRUD for projects
- `/api/documents/generate` — on-demand document generation from conversation history
- `/api/projects/[id]/phase-gate` — phase gate approval logic
- `/api/codex/*` — Codex CLI bridge (alternative to OpenAI API)

**Agent System** (`src/lib/agents/`)
- `roles/*.ts` — One file per agent role; each exports system prompt, output template, model assignment, and phase associations. Agent prompts are written in Chinese.
- `registry.ts` — Agent lookup by role
- `context.ts` — Assembles full project context (phase, history, existing documents) for each agent call
- `engine.ts` — Phase gate progress calculation and completion checks

**Document System** (`src/lib/documents/`)
- `catalog.ts` — Defines 9 document types, which phase owns each, and which agent role produces it
- `sync.ts` — `syncDerivedDocuments()` scans outgoing agent messages for structured headings (e.g., `# QA 审查结论`, `# 测试方案`) and auto-saves matching content as documents

**AI Provider Layer** (`src/lib/ai/`)
- `provider.ts` — Selects between OpenAI (API key) and Codex CLI (ChatGPT Plus) based on settings
- `codex.ts` — Spawns and communicates with the local `codex` CLI process
- `ui-stream.ts` — Streams SSE responses to the browser

**Database** (`src/lib/db/`)
- SQLite via `better-sqlite3` + Drizzle ORM
- Tables: `projects`, `conversations`, `messages`, `documents`, `phase_gates`, `settings`
- `paths.ts` — resolves cross-platform DB path; falls back to legacy `troupe.db` in project root
- Schema changes require `db:generate` then `db:migrate`

### Phase-Gated Workflow

Phases are strictly sequential. Each phase has:
- Required document types that must be produced before the gate can open
- Assigned agent roles active in that phase
- A phase gate record in the DB tracking completion status

The requirements phase has special orchestration: PM agent runs first, then QA agent reviews output. This handoff is enforced in `src/lib/workspace/`.

### Document Auto-Sync

After each agent response, `syncDerivedDocuments()` runs regex matching against the message content. Matched structured sections are extracted and upserted into the `documents` table. This is how most documents are created — not by explicit "save" actions, but by detecting heading patterns in agent output.

### AI Provider Dual-Path

Settings store the active provider (`openai` or `codex`). The `/api/chat` route reads this and routes accordingly. Codex uses a streaming subprocess bridge; OpenAI uses the Vercel AI SDK with `streamText`.

## Type System

Core types are in `src/types/index.ts`:
- `Phase` — the 6 phase identifiers
- `AgentRole` — the 7 role identifiers (`pm`, `designer`, `architect`, `frontend`, `backend`, `qa`, `coordinator`)
- `DocumentType` — the 9 document type identifiers including `requirements_review` (QA output for requirements phase) and `test_plan` (QA output for delivery phase)
- `PhaseInfo` — phase metadata linking phases to their required docs and roles

## Path Alias

`@/*` maps to `src/*` (configured in `tsconfig.json`).
