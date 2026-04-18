# Shared Design Spec Maintenance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let the three design-stage tabs collaboratively maintain one shared `design_spec` document, then generate `design_mockup` from that document instead of from an arbitrary tab.

**Architecture:** Infer each design conversation's focus from its starter prompt, aggregate the latest assistant output per focus into a single `design_spec`, and derive `user_flow` / `wireframe` slices from the aggregated document. Expose a single design execution entry point in the document panel that is gated on `design_spec` being available and routes generation through the existing document-generation API.

**Tech Stack:** Next.js App Router, React client components, SQLite + Drizzle, Node test runner with `tsx`.

---

### Task 1: Lock shared design-spec aggregation behavior with failing tests

**Files:**
- Modify: `src/lib/documents/sync.test.ts`

**Step 1: Write the failing test**

Add a test that seeds three design conversations:
- user-flow conversation
- information-architecture conversation
- visual-style conversation

Then assert `syncDerivedDocuments()` creates one `design_spec` containing all three sections and also keeps `user_flow` and `wireframe` aligned with the aggregated content.

**Step 2: Run test to verify it fails**

Run: `npx --yes tsx --test src/lib/documents/sync.test.ts`
Expected: FAIL because partial design conversations do not yet assemble into `design_spec`.

**Step 3: Write minimal implementation**

Implement focus inference + aggregation in the document sync layer.

**Step 4: Run test to verify it passes**

Run: `npx --yes tsx --test src/lib/documents/sync.test.ts`
Expected: PASS.

### Task 2: Make design execution depend on `design_spec`

**Files:**
- Modify: `src/components/documents/document-panel.tsx`
- Modify: `src/app/api/documents/generate/route.ts`

**Step 1: Write the failing test**

Use existing sync/document behavior tests where practical, and rely on targeted type/lint verification for the UI wiring. The functional requirement is:
- Design-stage document panel exposes one explicit `生成设计稿` action
- Action is disabled until `design_spec` exists
- Generated `design_mockup` is described as based on `design_spec`

**Step 2: Run verification to confirm the gap**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: PASS before code change; behavior gap remains manual/visual.

**Step 3: Write minimal implementation**

Add a design-execution CTA in the document panel and tighten the `design_mockup` generation prompt so it treats `design_spec` as the source of truth.

**Step 4: Run verification**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: PASS.

### Task 3: Verify end-to-end behavior and regression surface

**Files:**
- Modify: `src/lib/chat/phase-chat-guidance.test.ts` only if suggestion behavior needs adjustment

**Step 1: Run focused tests**

Run:
- `npx --yes tsx --test src/lib/chat/phase-chat-guidance.test.ts`
- `npx --yes tsx --test src/lib/documents/sync.test.ts`

Expected: PASS.

**Step 2: Run project type-check**

Run: `npx tsc -p tsconfig.json --noEmit`
Expected: PASS.

**Step 3: Note tooling gaps**

Run: `npm run lint`
Expected: likely fail due to the repository's current broken lint wiring; capture but do not conflate with this feature.
