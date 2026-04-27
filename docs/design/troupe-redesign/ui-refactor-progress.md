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
