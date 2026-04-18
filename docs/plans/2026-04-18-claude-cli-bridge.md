# Claude CLI Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an official Claude CLI bridge for the existing `claude` provider so chat, document generation, and diagram preview can run through `claude -p` instead of only through the Anthropic-compatible HTTP provider.

**Architecture:** Keep `claude` as one provider in settings and route selection, then introduce a Claude execution-mode layer that resolves to `cli` or `api`. Implement a dedicated CLI module for auth/status probing and prompt execution, and let each route choose the execution path before constructing its response stream.

**Tech Stack:** Next.js App Router, Node subprocesses, Claude Code CLI, AI SDK UI stream helpers, node:test

---

### Task 1: Add pure Claude CLI parsing tests

**Files:**
- Create: `src/lib/ai/claude-cli.test.ts`
- Create: `src/lib/ai/claude-cli-utils.ts`

**Step 1: Write the failing test**

Add tests for:
- parsing `claude auth status --json`
- extracting `text_delta` and final text from `stream-json`
- resolving execution mode for `auto` / `cli` / `api`

**Step 2: Run test to verify it fails**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: FAIL because helper module or functions do not exist yet.

**Step 3: Write minimal implementation**

Implement only the pure helpers needed by the tests.

**Step 4: Run test to verify it passes**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: PASS

### Task 2: Implement Claude CLI runtime module

**Files:**
- Create: `src/lib/ai/claude-cli.ts`
- Modify: `src/lib/ai/provider.ts`

**Step 1: Write the failing test**

Extend `src/lib/ai/claude-cli.test.ts` with runtime-adjacent pure cases if needed.

**Step 2: Run test to verify it fails**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: FAIL on missing exports or behavior mismatch.

**Step 3: Write minimal implementation**

Add:
- CLI installation/auth status probing
- `claude_execution_mode` resolution
- `runClaudePrompt()`
- `streamClaudePrompt()`

Keep prompts tool-free via `--tools ""`.

**Step 4: Run test to verify it passes**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: PASS

### Task 3: Wire CLI into routes

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/documents/generate/route.ts`
- Modify: `src/app/api/diagram-preview/route.ts`

**Step 1: Write the failing test**

Prefer helper-level tests over route integration. Add any additional pure test needed for route selection logic.

**Step 2: Run test to verify it fails**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: FAIL if new route-selection helper behavior is not implemented.

**Step 3: Write minimal implementation**

Use CLI when `providerType === "claude"` and resolved execution mode is `cli`; otherwise preserve current API path.

**Step 4: Run test to verify it passes**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: PASS

### Task 4: Update Claude settings/status UI

**Files:**
- Modify: `src/lib/ai/claude.ts`
- Modify: `src/app/api/claude/status/route.ts`
- Modify: `src/app/settings/page.tsx`

**Step 1: Write the failing test**

Add any pure helper assertions needed for status shaping or mode resolution.

**Step 2: Run test to verify it fails**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: FAIL if helper behavior required by the UI is missing.

**Step 3: Write minimal implementation**

Expose:
- CLI installed/authenticated status
- effective execution mode
- CLI/API compatibility messaging

**Step 4: Run test to verify it passes**

Run: `node --test src/lib/ai/claude-cli.test.ts`
Expected: PASS

### Task 5: Verify end-to-end compile safety

**Files:**
- Modify: `progress.md`
- Modify: `task_plan.md`
- Modify: `findings.md`

**Step 1: Run focused tests**

Run: `node --test src/lib/ai/claude-cli.test.ts src/lib/ai/claude.test.ts`
Expected: PASS

**Step 2: Run typecheck**

Run: `npx tsc --noEmit --pretty false`
Expected: PASS

**Step 3: Attempt repo lint**

Run: `npm run lint`
Expected: likely fail due to existing script/config issue; document actual output.

**Step 4: Commit**

Do not commit unless explicitly requested.
