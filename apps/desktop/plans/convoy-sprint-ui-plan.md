# Convoy Sprint UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the desktop Convoys surface so convoys read as sprints and tracked beads read as issues.

**Architecture:** Keep existing tRPC convoy list/status data flow. Replace the table-heavy `ConvoyBoard` presentation with a sprint rail, selected sprint header, status-grouped issue board, and issue table. Reuse existing tests and add assertions around sprint/issue terminology.

**Tech Stack:** React, TanStack Router, tRPC hooks, Bun test, Biome, Tailwind classes.

---

### Task 1: Lock Product Language In Tests

**Files:**
- Modify: `apps/desktop/src/renderer/components/Gastown/ConvoyBoard/ConvoyBoard.test.tsx`

- [x] Update the empty-state test to expect "No active sprints."
- [x] Update the selected-detail test to expect "Sprint summary", "Issues", status column headings, and issue table rows.
- [x] Run `bun test apps/desktop/src/renderer/components/Gastown/ConvoyBoard/ConvoyBoard.test.tsx` and confirm the assertions fail before implementation.

### Task 2: Implement Sprint Workspace

**Files:**
- Modify: `apps/desktop/src/renderer/components/Gastown/ConvoyBoard/ConvoyBoard.tsx`

- [x] Rename visible labels from convoy/tracked wording to sprint/issue wording.
- [x] Keep the existing `convoys.list` and `convoys.status` queries unchanged.
- [x] Render the left rail as a sprint list with status, progress, issue count, and created age.
- [x] Render selected sprint details with a summary header, metric tiles, status-grouped issue board, and issue table.
- [x] Preserve copy-to-clipboard behavior for issue IDs.

### Task 3: Verify

**Files:**
- Test: `apps/desktop/src/renderer/components/Gastown/ConvoyBoard/ConvoyBoard.test.tsx`
- Test: `apps/desktop/src/renderer/components/Gastown/ConvoyBoard/ConvoyBoardShell.test.tsx`

- [x] Run `bun test apps/desktop/src/renderer/components/Gastown/ConvoyBoard/ConvoyBoard.test.tsx apps/desktop/src/renderer/components/Gastown/ConvoyBoard/ConvoyBoardShell.test.tsx`.
- [x] Run `bun --filter @spectralset/desktop typecheck`.
- [x] Run Biome on touched files.
- [x] Run `bun --filter @spectralset/desktop compile:app`.
- [x] Start the desktop dev server or a targeted render check and capture evidence that the new sprint/issue UI renders.

Dev server note: the worktree's frozen install used `--ignore-scripts`, so
`bun --filter @spectralset/desktop dev` built main/preload, started the Vite
renderer at `http://localhost:5174/`, then failed to launch Electron with
`Error: Electron uninstall` because the Electron postinstall binary was absent.
`compile:app` completed successfully as the render/build verification.
