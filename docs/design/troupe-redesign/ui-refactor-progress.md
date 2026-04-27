# Troupe UI Refactor Progress

## Execution Rules

- Work in small implementation batches and stop at the planned pause point.
- Each batch follows: implement, verify, manual walkthrough, feedback, adjustment, progress update, commit, then next batch.
- Do not change APIs, database structures, route behavior, phase orchestration, AI request logic, or document generation behavior.

## Step 1: Tokens

Status: complete and committed.

Scope:
- Updated global design tokens in `src/app/globals.css`.
- Added light/dark surface, glass, border, accent, status, phase, role, glow, shadow, focus, scrollbar, skeleton, relay progress, stream fade, and reduced-motion utilities.
- Updated `src/app/layout.tsx` from Inter to Geist Sans plus JetBrains Mono with Chinese fallback fonts.
- Kept existing Tailwind semantic variables such as `background`, `card`, `primary`, `muted`, `border`, `ring`, and `sidebar` compatible with current pages/components.

Verification:
- `npm run build`: passed.
- `npm run lint`: blocked by existing ESLint flat-config issue: `Cannot redefine plugin "@typescript-eslint"`. This appears unrelated to Step 1 changes because lint fails during config loading before file analysis.

Manual walkthrough to perform:
- Open `/` and `/settings`.
- Toggle light/dark theme.
- Check background depth, text contrast, scrollbar color, visible focus ring, and system theme switching.
- Confirm there is no obvious flash, no horizontal scroll, and Chinese text uses a normal fallback font.

Screenshots:
- Not captured yet.

Feedback log:
- 2026-04-27: User reported Step 1 manual walkthrough passed.

Known follow-up:
- ESLint config needs a separate fix or confirmation before lint can be used as a reliable gate.

Commit:
- Pending commit at time of document update.

## Step 2: Dashboard

Status: baseline complete.

Completion note:
- This marks the dashboard as stable enough to proceed to later implementation batches.
- It does not freeze dashboard polish. Visual parity and small detail updates can still be handled in follow-up passes.

Scope:
- Restyled `/` dashboard in `src/app/page.tsx` against references `02_dashboard__light-data__1440x900.png`, `03_dashboard__dark-data__1440x900.png`, and `04_dashboard__states-modals__1440x900.png`.
- Added window-style header treatment, glass sidebar, recent project list, stats strip, phase-aware project cards, role chips, progress bars, loading skeletons, empty state, create project modal, and delete confirmation modal styling.
- Kept existing project fetch/create/delete logic, router destinations, API contracts, database structures, phase orchestration, and document generation behavior unchanged.
- Converted non-routed sidebar reference items into non-interactive text so the dashboard does not expose dead buttons.
- Removed the page-drawn macOS traffic-light dots and now relies on the real Tauri/macOS window controls only.
- Changed dashboard scrolling so the app shell does not body-scroll; the left sidebar and right dashboard content have separate vertical scroll containers.

Verification:
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed.
- `npm run lint`: blocked by existing ESLint flat-config issue: `Cannot redefine plugin "@typescript-eslint"`.
- Local dev server: `http://localhost:3000`.
- Browser walkthrough in Chrome: `/` rendered in light and dark themes; create project modal opened with focus on project name; delete confirmation modal opened with destructive action disabled until confirmation text is entered.
- `pnpm tauri:dev`: launched successfully for desktop-shell verification.
- Tauri walkthrough after feedback: confirmed the extra page-drawn traffic-light dots are gone; title content starts at the left of the app header content; horizontal scrollbar is no longer visible after splitting layout scrolling.

Manual walkthrough to perform:
- Open `/` at desktop and narrow widths.
- Toggle light/dark theme.
- In Tauri, check project card hover/focus states, long project descriptions, stats cards, sidebar recent project list, and footer.
- Verify left sidebar scrolls independently from the right dashboard content when either side overflows.
- Open create project modal and delete confirmation modal.
- Confirm no horizontal scroll, no text overlap, and no accidental project deletion.

Screenshots:
- Checked visually in local Chrome; no files captured.

Feedback log:
- 2026-04-27: User rejected first Step 2 pass because the dashboard drew fake macOS traffic-light dots, header alignment was wrong after removing them, and the page used a shared scroll area that could conflict with Tauri.
- 2026-04-27: Removed fake dots, kept the title aligned to the left of the app header content, changed the shell to fixed-height with independent sidebar/content scroll areas, and verified via `pnpm tauri:dev`.

Known follow-up:
- ESLint config still needs separate repair before lint can be used as a reliable gate.

Commit:
- Pending commit at time of document update.

## Step 3: Workspace

Status: baseline complete.

Completion note:
- Workspace baseline was accepted for forward progress.
- Chat detail states, document modal details, and generation modal details can still receive follow-up polish.

Scope:
- Restyled `/project/[id]` against references `05_workspace__light-main__1440x900.png`, `06_workspace__dark-main__1440x900.png`, `07_workspace__chat-states__1440x900.png`, and `08_workspace__artifacts-doc-modal__1440x900.png`.
- First batch focused on the workspace shell, phase sidebar, role tabs, conversation tabs, chat surface, composer, phase context card, and artifacts panel shell.
- Kept chat persistence, phase orchestration, API routes, document generation behavior, and database structures unchanged.

Verification:
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed.
- `npm run lint`: blocked by existing ESLint flat-config issue: `Cannot redefine plugin "@typescript-eslint"`.

Known follow-up:
- Chat detail states, document modal, and streaming generation modal may need separate finer passes.

Commit:
- Pending commit at time of document update.

## Step 4: Documents Center

Status: baseline complete.

Completion note:
- User walkthrough passed.
- Documents Center is stable enough to proceed to later implementation batches.

Scope:
- Restyle `/project/[id]/documents` against references `10_documents-center__light-main__1440x900.png` and `11_documents-center__dark-main__1440x900.png`.
- First batch focuses on the document center shell, grouped document navigator, active document header, preview/edit layout, save/export actions, empty states, and responsive behavior.
- Keep document fetch/save/export behavior, API contracts, and document editor semantics unchanged.

Verification:
- `npx tsc --noEmit --pretty false`: passed.
- `npm run build`: passed.
- `npm run lint`: blocked by existing ESLint flat-config issue: `Cannot redefine plugin "@typescript-eslint"`.
- Local dev server: `http://localhost:3000`.
- Browser screenshot walkthrough with Playwright:
  - `/project/faada293-9efb-4b39-a7e9-d48bb01d7dcd/documents` at 1440x900 light theme rendered.
  - Same route at 1440x900 dark theme rendered.
  - Same route at 768x900 rendered with mobile document picker and no obvious horizontal overflow.
- Adjusted narrow layout after screenshot review so the document center keeps a document selection entry when the desktop sidebar is hidden.

Manual walkthrough to perform:
- Open `/project/[id]/documents` with an existing project.
- Toggle light/dark theme.
- Select documents from each phase group.
- Switch preview/edit tabs, edit text, save, export one document, and export all documents when available.
- Check empty state with a project that has no documents if practical.
- Confirm no horizontal scroll, no text overlap, and readable markdown/table/code rendering.

Known follow-up:
- Full rich text toolbar behavior is not implemented in this app; this batch only restyles the existing Markdown preview/edit experience.

Commit:
- Pending commit at time of document update.
