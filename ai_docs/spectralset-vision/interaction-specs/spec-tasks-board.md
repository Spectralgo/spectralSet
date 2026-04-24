---
phase: B3
doc_id: spec-tasks-board
version: v0.1
owner: crew/gastown_researcher
depends_on: [B0, B1, B4, B3-spec-command-bar, ss-6ski, ss-qkb9]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/ops-incidents/BEADS-UI-PRIOR-ART-2026-04-24.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/page.tsx
  - apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/layout.tsx
  - apps/desktop/src/lib/trpc/routers/gastown/convoys.ts
  - apps/desktop/src/lib/trpc/routers/gastown/mail.ts
  - apps/desktop/src/lib/trpc/routers/gastown/today.ts
required_sections_present: true
section_count_self_check: 10
overseer_review_requested: 2026-04-24
---

# spec-tasks-board — replace `/tasks` with the global Convoys+Beads board

**Bead:** ss-2i6l · **Author:** `spectralSet/crew/gastown_researcher` · **Date:** 2026-04-24
**Design-only.** No code changes. Impl beads enumerated in §8.

## 1. Purpose & scope boundaries

**Purpose (one sentence):** `/tasks` becomes the **town-wide Convoys + Beads board** — a single cross-rig, cross-workspace list of all in-flight Gas Town work, replacing the legacy collections-backed task list (`apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/components/TasksView/TasksView.tsx:1-10`, currently driven by `useCollections()` + `@tanstack/react-db`).

**Relation to other surfaces:**

- **vs ConvoysPane (workspace-scoped, ss-qkb9):** ConvoysPane shows one workspace's convoys inside its pane. Tasks board shows *every rig's* convoys + beads in one scrollable surface. ConvoysPane drills *down* into a workspace; Tasks board zooms *out* to the town.
- **vs Today cockpit (`/today`, spec-today.md):** Today is the single-operator "what needs me *right now*" digest (triage stack + rigs strip + verdict tail). Tasks board is the "what is the *org* doing" view. Today answers *me*; Tasks answers *us*. Zero duplication — Today owns urgency, Tasks owns completeness.
- **vs Mail / Agents panes:** Mail and Agents remain per-workspace panes per `INFORMATION-ARCHITECTURE.md §3`. Tasks board links *out* to both (a row's polecat chip opens the Agents pane for that rig; a row's linked-mail count opens the Mail pane filtered to that thread) but never embeds them.

**Who uses it:**

- **Sophie (founder, weekly planning):** "Which convoys are stranded? Which beads have been open >7d with no assignee? Where are the P0s concentrated?"
- **Mayor (triage):** "What is every rig doing right now? What's blocked by what?"
- **Overseer (status-check):** "Show me every in-flight bead across all rigs, grouped by rig, sorted by priority."

**Explicit anti-scope:**

- **Not a replacement for Linear.** We do not reproduce Linear's cycle/sprint/roadmap features. Cycles live in the convoy abstraction; roadmaps are out of scope.
- **Not a per-bead editor.** The bead-detail drawer (§2) shows metadata + linked artefacts; full bead editing stays in `bd show <id>` CLI or (future) a dedicated bead-edit route.
- **Not a chat / log viewer.** Inline mail/dolt-commit links open their surfaces — this board does not render message bodies or commit diffs.
- **Not a task-creation authoring surface.** "+ New bead" opens a narrow modal that calls `bd create` and closes; the modal is NOT a rich editor.
- **Not workspace-aware.** URL params carry rig/priority/status filters but *not* workspace ID — the view is the town, not a workspace.

## 2. Layout wireframe

ASCII, structural only. Regions adapt via breakpoints (see §5).

### Wide (≥ 1200px)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Tasks · 84 open · 3 stranded convoys                      [ + New bead   N  ]  │  ← Masthead
├──────────────┬────────────────────────────────────────────┬─────────────────────┤
│  Filters     │  [ Group: rig ▾ ]  [ Table | Kanban ]   /search… ⌘K            │  ← Top bar
│              │                                                                  │
│  Rig         │  ▸ spectralSet  (24)                                             │
│  ☑ all       │     ss-2i6l   DESIGN: replace /tasks with Convoys+Beads board   │
│  ☐ spectSet  │                 🔴 P1 · ● hooked · jasper · 2h · ss-6ski        │
│  ☐ gmux      │     ss-6ski   RESEARCH: beads-style UIs on GitHub               │
│  ☐ hq        │                 🔵 P2 · ✓ done · gastown_researcher · 4h        │
│              │     ss-0ft    B3: spec-command-bar (Cmd-K palette)              │
│  Priority    │                 🔴 P1 · ✓ done · gastown_researcher · 1d        │
│  ● P0        │  ▸ gmux  (11)                                                    │
│  ● P1        │     gm-x91    Chat pane reorder drag-and-drop                    │
│  ○ P2        │                 🟡 P2 · ● hooked · onyx · 20m                   │
│  ○ P3        │  ▸ hq  (49)                                                      │
│              │     ...                                                          │
│  Status      │                                                                  │
│  ☑ open      │                                                                  │
│  ☑ hooked    │                                                                  │
│  ☐ done      │                                                                  │
│  ☐ closed    │                                                                  │
│              │                                                                  │
│  Convoy      │                                                                  │
│  ☑ all       │                                                                  │
│  ○ Wave-B    │                                                                  │
│  ○ unowned   │                                                                  │
│              │                                                                  │
│  [ Reset ]   │                                                                  │
├──────────────┴────────────────────────────────────────────┴─────────────────────┤
                                                             │ ss-2i6l            │
                                                             │ DESIGN: replace… │
                                                             │                  │
                                                             │ Priority: P1     │
                                                             │ Status:   hooked │
                                                             │ Assignee: jasper │
                                                             │ Convoy:   Wave-B │
                                                             │ Linked mail (3)  │
                                                             │ Commits (2)      │
                                                             │ Blockers (0)     │
                                                             │                  │
                                                             │ [ Open CLI ]     │
                                                             └──────────────────┘
```

Five regions: **Masthead** (count + "+ New bead"), **Left rail filters** (w-48, persistent, scrollable if >screen), **Top bar** (group-by + view-mode + search), **Main area** (grouped list — rows collapse under rig/convoy headers), **Right drawer** (w-80, collapsible, opens on row click).

### Narrow (≥ 600px)

```
┌─────────────────────────────────────────────┐
│  Tasks · 84 open              [ + New  N ]  │
├─────────────────────────────────────────────┤
│  [ Filters ▾ ] [ Group: rig ▾ ] [ /search ] │  ← top bar collapses filters into popover
├─────────────────────────────────────────────┤
│  ▸ spectralSet  (24)                        │
│     ss-2i6l  DESIGN: replace /tasks…        │
│              🔴 P1 · hooked · jasper · 2h    │
│     ss-6ski  RESEARCH: beads-style UIs      │
│              🔵 P2 · done · gastown_… · 4h   │
│  ▸ gmux  (11)                                │
│     ...                                     │
└─────────────────────────────────────────────┘

  Row click → drawer slides up from bottom
  (modal-on-phone pattern, sheet modal)
```

Narrow collapses: left rail → popover behind `[ Filters ▾ ]`; right panel → bottom-sheet drawer. Table view stays; kanban view is hidden below 900px (too narrow to scan columns).

## 3. Data model + tRPC contract

**Existing routers** (verified at `apps/desktop/src/lib/trpc/routers/gastown/`): `agents.ts`, `convoys.ts`, `mail.ts`, `today.ts`. **No `beads.ts` router exists** — this is the single largest implementation gap (see §9 Risk 1).

**Proposed new router**: `gastown.beads` with these procedures:

| Procedure | Shape | Behavior |
|-----------|-------|----------|
| `gastown.beads.list` | Input: `{ rigs?: string[]; priority?: ('P0'\|'P1'\|'P2'\|'P3'\|'P4')[]; status?: ('open'\|'hooked'\|'in_progress'\|'blocked'\|'done'\|'closed')[]; convoyId?: string; search?: string; limit?: number; cursor?: string }` → `{ rows: BeadRow[]; nextCursor?: string; totalCount: number }` | Shells to `bd list --json` with equivalent flags, filters in Node |
| `gastown.beads.get` | Input: `{ id: string }` → `BeadDetail` | Shells to `bd show <id> --json` |
| `gastown.beads.create` | Input: `{ title: string; rig: string; priority?: string; convoy?: string; description?: string }` → `{ id: string }` | Shells to `bd create --rig <rig> --json` |

`BeadRow` (exact fields for the table):

```
{
  id:             "ss-2i6l",
  rig:            "spectralSet",
  title:          "DESIGN: replace /tasks with Convoys+Beads board",
  priority:       "P1",
  status:         "hooked",
  assignee:       "spectralSet/crew/gastown_researcher" | null,
  convoyId:       "hq-cv-wave-b" | null,
  updatedAt:      "2026-04-24T18:32Z",
  blockersCount:  0,
  linkedMailCount: 3,
  commitsCount:   2,
  hookedPolecat:  "jasper" | null,
  dispatchedBy:   "mayor",        // Gas-Town-specific: from bead description header
  formulaVars:    { ... } | null,  // Gas-Town-specific
  moleculeId:     "mol-..." | null // Gas-Town-specific
}
```

The last three fields (`dispatchedBy`, `formulaVars`, `moleculeId`) are parsed from the bead's description YAML-ish header; exposing them is a Gas-Town-specific differentiator vs any pure-beads UI (cf. `BEADS-UI-PRIOR-ART-2026-04-24.md §4` — "Wisps / molecules / formulas have no direct parallel in these UIs").

**Refetch cadence:**

- Initial load: cursor-paginated, 100 rows per page (react-virtual handles the DOM).
- Polling: 10s background refetch when tab is visible (matches `INFORMATION-ARCHITECTURE.md §3 Convoys` 10s cadence).
- Realtime: `useDoltHashPoll` hook (planned in `IMPLEMENTATION-PLAN.md C1-today-09`) invalidates `gastown.beads.list` on hash change. **Dependency on ss-jn0f** (convoy list cache) — whoever lands first defines the invalidation contract; the other follows the same pattern (Risk 4 in §9).

**Bead status → UI chip color** (mapping from `DESIGN-SYSTEM.md §4` state chip canon):

| Bead status | Chip token | Dot |
|-------------|------------|-----|
| `open` | `accent-info @ 15% / accent-info` | solid blue |
| `hooked` | `accent-info @ 15% / accent-info` + "hooked" badge | solid blue |
| `in_progress` | `accent-warning @ 15% / accent-warning` | hollow amber |
| `blocked` | `accent-danger @ 15% / accent-danger` | ✕ red |
| `done` | `accent-success @ 15% / accent-success` | ✓ green |
| `closed` | `fg-muted` | muted dot |

Priority pill uses `DESIGN-SYSTEM.md §4` priority pill (P0 → accent-danger, P1 → accent-warning, P2 → accent-info, P3/P4 → muted).

## 4. Interaction patterns (Linear-inspired)

**Keyboard-first** (all shortcuts active when the board has focus, disabled inside inputs):

| Keys | Verb |
|------|------|
| `j / k` | Move focus down/up one row |
| `J / K` | Move focus by group (rig boundary) |
| `Enter` | Open the focused row's drawer |
| `Esc` | Close drawer / clear search / collapse expanded group |
| `/` | Focus the search input |
| `N` | Open "+ New bead" modal |
| `g r` | Group by rig |
| `g c` | Group by convoy |
| `g s` | Group by status |
| `g p` | Group by priority |
| `g n` | No grouping (flat list) |
| `1 / 2` | View mode: Table / Kanban |
| `p` | Cycle priority on the focused row (optimistic) |
| `s` | Cycle status on the focused row (optimistic, with Undo toast) |
| `x` | Archive (close) the focused row — destructive, requires inline confirm per `spec-command-bar.md §3` pattern |
| `u` | Undo last mutation (6s window, matches TriageCard ss-848 pattern) |
| `⌘/Ctrl-A` | Select all in current group |
| `Shift-click` | Range-select (Linear-standard) |
| `⌘/Ctrl-click` | Toggle-select |
| `Shift-P` | Bulk set priority (opens picker) |
| `?` | Show shortcut cheatsheet overlay |

**Row density modes:** compact (28px), comfortable (36px, default), spacious (48px). Cycled via `Shift-D`. Persisted in localStorage under `tasks-board.density`.

**Quick filters persist in localStorage** under `tasks-board.filters.v1` (rig selection, priority set, status set, group-by, view-mode, density). URL search params mirror *only* what affects deep-linkability: `?rig=spectralSet&priority=P1&group=rig` — full filter state is NOT in the URL to keep links shareable.

**Multi-select:** Shift-click range, ⌘-click toggle. Selected row count appears in the masthead with a floating action bar (`[ Change priority ]  [ Change status ]  [ Archive ]  [ Deselect (Esc) ]`). Bulk operations fire one tRPC mutation per row (server-side batch endpoint is a v1.1 optimization).

**Drag-and-drop kanban:** dragging a card across status columns triggers an optimistic `gastown.beads.update` + a toast. Moving into `closed` (destructive) requires a confirm dialog — "Close ss-2i6l? [Confirm / Cancel]" per `PRINCIPLES.md §5` anti-pattern ("surface polish hiding broken core flows" — destructive ops MUST have affordance).

**Undo toast on every destructive action.** 6-second window, matches the TriageCard ss-848 pattern from `spec-today.md §3`. One toast at a time (new toast replaces prior); undo restores the prior state via reverse-mutation.

## 5. Visual language — Linear-style, SpectralSet tokens only

**No hardcoded colors.** Zero Linear hex values (their indigo `#5e6ad2`, their red `#eb5757`, etc.). Every color resolves through `DESIGN-SYSTEM.md §3` CSS vars: `bg-surface`, `bg-raised`, `bg-inset`, `fg-default`, `fg-muted`, `fg-subtle`, `accent-brand`, `accent-info`, `accent-warning`, `accent-danger`, `accent-success`.

**Priority pills:** map Linear's P0→P4 onto `DESIGN-SYSTEM.md §4` priority-pill tokens (not new variants). P0 = `accent-danger @ 20% / accent-danger`, P1 = `accent-warning @ 20% / accent-warning`, P2 = `accent-info @ 15% / accent-info`, P3 = `bg-inset / fg-muted`, P4 = `bg-inset / fg-subtle`.

**Typography:** from `DESIGN-SYSTEM.md §1` type ramp — `text-body` (14px) for row title, `text-meta` (12px) for ID / timestamp / assignee, `text-title` (20px) for masthead count, `text-subtitle` (16px) for group headers, `text-micro` (11px) for keyboard-shortcut hints. **No custom font stack** — inherits `-apple-system / SF Pro / Inter` (DS §1). Monospace (`ui-monospace`) for bead IDs (`ss-2i6l`) only.

**Density tokens** (new mapping; primitive heights in DS §2):

| Density | Row height | Vertical padding | Token composition |
|---------|------------|------------------|-------------------|
| compact | 28px | `space-1` (4) top/bottom | `py-1 h-7` |
| comfortable (default) | 36px | `space-2` (8) | `py-2 h-9` |
| spacious | 48px | `space-3` (12) | `py-3 h-12` |

No arbitrary pixel values. Row heights are deliberate multiples of the spacing scale.

**Icons:** `react-icons/hi2` (Heroicons v2) — already used in the sidebar per project standard. Status icons: `HiCheck` (done), `HiXMark` (closed), `HiClock` (hooked), `HiLockClosed` (blocked). Priority: numeric glyphs inside a filled pill.

**Motion:** `motion/react` only (not `framer-motion` — DS §6 drift rule). Drawer slide-in: `dur-medium` (220ms) + `ease-out-standard`. Row hover lift: `dur-instant` (80ms) subtle translate-y(-1px). Prefers-reduced-motion strips both per DS §6.

## 6. Empty / loading / error states

Per `DESIGN-SYSTEM.md §5` empty-state canon — haiku, no CTA cluster, trust the user.

- **Empty (no beads across all rigs):** centered, `text-subtitle fg-default`, `space-12` top: `No active work in Gas Town.` Subline (`text-body fg-muted`): `Sling a bead to get started.` No button — the masthead's `+ New bead` is one tab-stop away.
- **Filtered to zero:** `No beads match these filters.` Subline: `[ Clear all filters ]` — a single *text* link (not a button cluster), underlined, `accent-brand`.
- **Loading (initial):** 10 skeleton rows at current density (`bg-inset` rectangles, `dur-pulse` shimmer). Skeleton *is not* an empty state — it disappears when the query resolves, even to zero.
- **Loading (refetch):** no skeleton; a subtle `dur-fast` spinner in the masthead next to the count ("Tasks · 84 open  ⟳"). Existing rows stay visible.
- **Error (router error):** error banner at top of main area (`accent-danger @ 10% bg`, `accent-danger fg`): `Failed to load tasks.` + `[ Retry ]` button + muted helper text: `Check gt CLI is running and Dolt is reachable. 'gt doctor' may help.`
- **Error (row-level, per-bead fetch):** the row collapses to a single muted line: `ss-xxxx — failed to load · retry` with retry inline.
- **Empty convoy group header:** group header renders, row area collapses to a muted one-line: `(no beads in this group)`. Group stays visible so grouping is coherent.

## 7. Integration: nav + sidebar + command palette

- **Dashboard sidebar:** keep the label `Tasks` (not "Board" — `Tasks` is the muscle-memory word; "Board" would confuse against ConvoysPane's kanban). **DECISION:** stay `Tasks`, do NOT rename.
- **Route URL:** stays at `/_authenticated/_dashboard/tasks/` — do NOT rename; existing deep-links from dispatches would break. Keep `layout.tsx:3-17` search-param shape (`tab`, `assignee`, `search`) for *backwards compat* (old links resolve to sensible filter combos) even though the new filter model is richer.
- **Sidebar badge:** count of open P0 + P1 beads (not all-open — avoids four-digit noise). Red dot if any P0 open.
- **Command palette (`Cmd-K`, per `spec-command-bar.md`):**
  - `new bead <title>` → calls `gastown.beads.create`, navigates to `/tasks?rig=<active>&highlight=<new-id>`, row scrolls into view + drawer opens.
  - `open <bead-id>` → navigates to `/tasks?highlight=<id>` and opens the drawer (no separate route).
  - `goto tasks` → routes to `/tasks`.
- **Row click → drawer** (not a new route). Drawer keys off `?highlight=<id>` search param so deep-links open the drawer directly.
- **Drawer close** clears the `highlight` param and restores focus to the prior row.

## 8. Migration plan from current `/tasks` page

**Current `/tasks` content** (`apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/` tree, surveyed 2026-04-24):

- Driven by `useCollections()` + `@tanstack/react-db` (pre-SpectralSet internal task store) — NOT Gas Town beads. Confirmed at `components/TasksView/TasksView.tsx:5, :21-22` and `hooks/useTasksData/useTasksData.tsx:25`.
- Substantial surface already: `TasksTableView`, `TasksBoardView` (kanban), `TasksTopBar`, `CreateTaskDialog`, `AssigneeFilter`, shared `PriorityIcon` / `StatusIcon` / `StatusCell` / `PriorityCell` / `AssigneeCell`, filter store (`stores/tasks-filter-state.ts`), sorting utils, hybrid search, `$taskId` detail route with `TaskMarkdownRenderer` + `PropertiesSidebar`.
- URL search params: `tab` (all / active / backlog), `assignee`, `search` (`layout.tsx:3-17`).
- `LinearCTA` component suggests the current build had a prior "use Linear instead" affordance.

**Replacement strategy:** *preserve the shell, swap the data layer*. The existing `TasksView`/`TasksTopBar`/`TableContent`/`BoardContent` layering is architecturally close to what we need — the gap is that everything below `useTasksData` points at collections, not `gastown.beads`. We keep the file tree, rename / rewire, and retire legacy imports.

**Implementation beads** (≤60 LoC each per ss-yr9h):

| # | Bead (stub title) | LoC | Depends on |
|---|-------------------|-----|------------|
| C-tasks-01 | Add `gastown.beads` tRPC router (list / get / create; shells to `bd --json`) | 60 | Existing `gastown/convoys.ts` pattern |
| C-tasks-02 | `BeadRow` Zod schema + TS types in `packages/trpc` | 40 | C-tasks-01 |
| C-tasks-03 | `useTasksData` rewrite to consume `gastown.beads.list` (replace `useCollections`) | 60 | C-tasks-01, C-tasks-02 |
| C-tasks-04 | `TasksTopBar` rewrite: group-by picker, view-mode toggle, `+ New bead` modal trigger, search box | 60 | C-tasks-03 |
| C-tasks-05 | Left-rail filters component (rig / priority / status / convoy checkboxes) | 60 | C-tasks-03 |
| C-tasks-06 | `TableContent` rewrite to render `BeadRow[]` with `@tanstack/react-virtual` (virtualized) | 60 | C-tasks-03 |
| C-tasks-07 | Group headers (collapsible, per group-by value) + `J/K` keyboard jump | 50 | C-tasks-06 |
| C-tasks-08 | Right-panel drawer (metadata + linked mail/convoy/commit links) | 60 | C-tasks-03 |
| C-tasks-09 | `BoardContent` rewrite — kanban columns driven by bead status | 60 | C-tasks-03 |
| C-tasks-10 | Keyboard shortcuts hook (`j/k/Enter/Esc/g·/p/s/x/u/?`) | 55 | C-tasks-04, C-tasks-06 |
| C-tasks-11 | "+ New bead" modal (title + rig picker + priority + convoy; POST to `gastown.beads.create`) | 60 | C-tasks-04 |
| C-tasks-12 | Undo toast primitive + integration with destructive mutations | 45 | C-tasks-10 |
| C-tasks-13 | Empty / filtered-zero / error states | 40 | C-tasks-06 |
| C-tasks-14 | Density toggle (compact/comfortable/spacious) + localStorage persistence | 40 | C-tasks-06 |
| C-tasks-15 | **Kill list** — delete legacy `useCollections` path in `useTasksData`, remove `LinearCTA`, remove collections imports | 30 | every prior |

**15 beads total. Total budget ≈ 790 LoC** (Mayor target ≥5, hard cap 60/bead — respected).

**Dependency graph:**

```
C-tasks-01 (router)
    ├─→ C-tasks-02 (types)
    │       └─→ C-tasks-03 (useTasksData rewrite)
    │               ├─→ C-tasks-04 (topbar)  ──→ C-tasks-11 (new-bead modal)
    │               ├─→ C-tasks-05 (left rail)
    │               ├─→ C-tasks-06 (table) ──→ C-tasks-07 (group headers)
    │               │                      └─→ C-tasks-13 (empty states)
    │               │                      └─→ C-tasks-14 (density)
    │               ├─→ C-tasks-08 (drawer)
    │               └─→ C-tasks-09 (kanban)
    └─→ C-tasks-10 (keyboard) ──→ C-tasks-12 (undo toast)
    └─→ (after all land) ──→ C-tasks-15 (kill list)
```

Critical path: `01 → 02 → 03 → 06 → 07 → 15`. Seven beads to minimum-viable table view; remaining eight layer on density, kanban, drawer, empty states, undo, new-bead modal, keyboard.

**Kill list (C-tasks-15, post-migration):**

- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/components/TasksView/hooks/useTasksData/useTasksData.tsx` — old collections consumer (swapped in C-tasks-03; file stays, body replaced).
- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/components/TasksView/components/LinearCTA/` — whole folder, "switch to Linear" CTA is obsolete.
- Imports from `renderer/routes/_authenticated/providers/CollectionsProvider` inside the tasks subtree only (do NOT remove the provider globally — other surfaces may consume it; grep first).
- `stores/tasks-filter-state.ts` — retained if still useful for UI state; new filter model lives in localStorage per §4. Audit before delete.

## 9. Risks + parked questions

1. **Bead listing tRPC does not exist yet** (`apps/desktop/src/lib/trpc/routers/gastown/` has `agents.ts`, `convoys.ts`, `mail.ts`, `today.ts` — no `beads.ts`). C-tasks-01 creates it. *Risk:* `bd list --json` output shape may not map 1:1 to `BeadRow`; expect a shim. Spike 30 min before settling LoC.
2. **Performance with 1000+ beads.** `@tanstack/react-virtual ^3.13.18` is already in `apps/desktop/package.json` — no new dep required. Virtualize the main list + kanban columns. 5000-row upper bound before pagination becomes mandatory.
3. **Mobile / narrow window.** Below 600px is not supported (Electron desktop-only product). 600px–900px collapses the left rail + hides the kanban view. Below 900px use table view only. Hard break at 540px → show the empty state "Tasks requires a wider window."
4. **Conflict with ss-jn0f (convoy list cache).** Whose ownership defines the Dolt-invalidation contract for list-shaped tRPC endpoints? Proposal: ss-jn0f lands first; `gastown.beads.list` copies the same `useDoltHashPoll`-driven invalidation signature.
5. **Command palette interop (ss-skdq).** `spec-command-bar.md §4` verbs `new bead` / `open <bead-id>` / `goto tasks` must route through the palette's tRPC layer, not hardcode `/tasks` URL strings. Coordinate on shared URL helpers.
6. **`$taskId` sub-route** — keep or delete? Current `apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/$taskId/page.tsx` has a full bead-detail surface. Spec-today's pattern is drawer-not-route. Decision: deprecate `$taskId`; drawer replaces it. Deep-links redirect `tasks/$taskId` → `tasks/?highlight=$taskId`.
7. **`@tanstack/react-db` dep** — still in use elsewhere? Grep before removing from `package.json`. Out-of-scope for this spec; audit bead after migration.
8. **Bulk operations performance.** N rows × N mutations may stall the UI. If a batch of >20 is common, propose `gastown.beads.updateMany` in v1.1.
9. **Search debounce.** Fuzzy search across 1000+ titles should debounce at 150ms (hitting tRPC). Smaller debounce → wasted calls; larger → feels laggy.
10. **Sophie's weekly-planning persona** assumes per-rig grouping with P0 + P1 pinned at top. Confirm with a persona walk before shipping; spec assumes it works.

## 10. Rejected alternatives

**Rejected: pure kanban as the default view.** `BEADS-UI-PRIOR-ART-2026-04-24.md §4` notes every ★≥4 beads TUI defaults to kanban (bdui, beads_viewer, perles). For a town-wide board, kanban breaks at 4+ rigs — each rig's four-state columns become a 16-column wall. Table with grouping scales to 10+ rigs; kanban is an opt-in view for single-rig focus. Linear learned this lesson too (their table view is default, not board).

**Rejected: keep legacy `/tasks` + add filters.** The legacy page uses `useCollections()` — a SpectralSet-internal task store that has nothing to do with Gas Town. Adding filters over collections data does not answer any of Sophie/Mayor/Overseer's questions (§1). Half-migrating leaves two task systems coexisting in one UI, which is exactly the anti-pattern `current-state-audit.md` §1 TL;DR #2 flagged for v1/v2 workspace stacks.

**Rejected: table-only, no kanban or drawer.** Linear and Plane both ship multi-view because operators segment their work differently by task type. Dropping kanban costs us the "move a card across status columns" pattern (§4 drag-and-drop) which is one of the highest-leverage direct-manipulation affordances. Kanban stays — just not as the default.

**Rejected: workspace-scoped sidebar.** Moving the board *inside* a workspace pane (mirroring ConvoysPane) duplicates ss-qkb9 and defeats the purpose — the whole value is *cross*-workspace visibility. Board stays at the dashboard level, not inside a workspace.

**Rejected: separate route per view mode** (`/tasks/table`, `/tasks/board`). Adds deep-link complexity with no benefit; a `view` search param (`?view=kanban`) is enough, and preserves bookmarkability of a specific filter+view combo.
