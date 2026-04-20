---
phase: B4
doc_id: DESIGN-SYSTEM
version: v0.2
owner: crew/worktree_researcher
depends_on: [B0]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#3.1
  - ai_docs/spectralset-vision/inspiration.md#3.3
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

Design system for the SpectralSet cockpit. Captures the token discipline
Pillar 7 ("Beautiful and fast" — Things 3 calm, sub-100ms) implies, and
reports every place current code drifts from it. Tailwind v4 + shadcn/ui
is the base; tokens live in `apps/desktop/src/renderer/globals.css` (CSS
vars) and `packages/ui/` (shared primitives).

## 1. Type scale

Anchor: inspiration §3.3 (heading typography builds hierarchy without
boxes — weight and size do the work; no dividers, no background fills).
Pillar 7 ("sub-100ms micro-interactions", `PRINCIPLES.md` pillar 7): the
visual feel must be Linear/Raycast polish and Things 3 restraint, which
starts with a short, consistent type ramp.

### Type ramp (canonical)

| Token | Size / line-height | Weight | Use |
|-------|----|----|-----|
| `text-display` | 32 / 40 | 600 | Page hero (Today verdict line only) |
| `text-title` | 20 / 28 | 600 | Drawer titles, surface titles |
| `text-subtitle` | 16 / 24 | 500 | Section headings within a surface |
| `text-body` | 14 / 20 | 400 | Default body, row text |
| `text-meta` | 12 / 16 | 500 | Badges, chips, timestamps, IDs |
| `text-micro` | 11 / 14 | 500 | Only keyboard-shortcut hints & dense table cells |

**Rule**: no arbitrary `text-[Xpx]` values. Six sizes, no more.
**Weights**: 400 (body), 500 (meta/button), 600 (title). No 300, 700, or 800.
**Font stack**: system sans (`-apple-system`, `SF Pro`, `Inter`) for UI;
`ui-monospace` for IDs and transcripts only. No icon-embedded emoji for
structural state chips (emoji stays in avatars only).

### Typography drift (today)

- `apps/desktop/src/renderer/components/Gastown/AgentCVPanel/AgentDetailDrawer.tsx:100` —
  `text-[10px]` on state badge. **Violation**: arbitrary pixel value.
  **Fix**: use `text-meta` (12px).
- 59 occurrences of `text-[Xpx]` across 20 files in
  `apps/desktop/src/renderer/` (grep `text-\[[0-9]+px\]`). Full list
  lives in §7 drift report.

## 2. Spacing scale

Base unit is 4px. No arbitrary values (`p-[7px]` etc.). Tailwind steps
1/2/3/4/6/8/12 map cleanly; outside that set requires a design review.

### Spacing tokens

| Step | Pixels | Tailwind | Use |
|------|--------|----------|-----|
| `space-0` | 0 | `p-0` / `gap-0` | Zero |
| `space-1` | 4 | `p-1` / `gap-1` | Chip/badge inner, adjacent icons |
| `space-2` | 8 | `p-2` / `gap-2` | Card inner padding, input vertical |
| `space-3` | 12 | `p-3` / `gap-3` | Row spacing, section inner |
| `space-4` | 16 | `p-4` / `gap-4` | Card padding, drawer inner |
| `space-6` | 24 | `p-6` / `gap-6` | Surface padding, large sections |
| `space-8` | 32 | `p-8` / `gap-8` | Page-level outer padding |
| `space-12` | 48 | `p-12` / `gap-12` | Empty-state vertical whitespace |

### Spacing drift (today)

53 occurrences of arbitrary spacing (`p-[`, `px-[`, `py-[`, `gap-[`,
`mt-[`) across 15 files in `apps/desktop/src/renderer/`. Full list in §7.

## 3. Color tokens

`globals.css:19-38` already uses CSS variable hex declarations — the
mechanism is right, the *naming* is one layer below semantic. Semantic
tokens compose on top.

### Foreground

| Token | Fallback (dark) | Fallback (light) | Use |
|-------|------|------|-----|
| `fg-default` | `#eae8e6` | `#151110` | Body text |
| `fg-muted` | `#a8a5a3` | `#6b6866` | Secondary text, meta |
| `fg-subtle` | `#706d6b` | `#8f8c8a` | Placeholder, disabled |
| `fg-inverse` | `#151110` | `#eae8e6` | Text on accent backgrounds |

### Background

| Token | Fallback (dark) | Fallback (light) | Use |
|-------|------|------|-----|
| `bg-surface` | `#151110` | `#fafafa` | Page canvas |
| `bg-raised` | `#201e1c` | `#ffffff` | Card, drawer, popover |
| `bg-inset` | `#1a1716` | `#f0f0ef` | Sidebar, nested panels |
| `bg-overlay` | `rgba(0,0,0,0.55)` | `rgba(0,0,0,0.25)` | Modal/dialog scrim |

### Semantic accent

| Token | Hue | Use |
|-------|-----|-----|
| `accent-brand` | ember `#e07850` | Primary buttons, focused rows |
| `accent-success` | green 500 `#22c55e` | MERGED, landed convoys |
| `accent-warning` | amber 500 `#f59e0b` | Stalled polecats, stranded convoys |
| `accent-danger` | red 500 `#ef4444` | Escalations open, MERGE_FAILED |
| `accent-info` | blue 500 `#3b82f6` | Working polecats, neutral progress |

### Color drift (today)

- 299 raw hex literals across 30 files under `apps/desktop/src`
  (grep `#[0-9a-fA-F]{6}`). Of those, ~200 are legitimate theme
  definitions in `src/shared/themes/built-in/*` and `globals.css`.
  ~100 are in renderer components (hardcoded). Top offenders:
  `packages/ui/src/components/ui/*`, a few chart config files, various
  marketing-adjacent demo components. Full list deferred to §7.
- **Rule**: outside `shared/themes/` and `globals.css`, no `#XXXXXX` in
  TS/TSX. Tailwind token classes only.

## 4. Status badges

The 3-state polecat model is doctrinal (Pillar 6 "surgical observability";
`GASTOWN-LESSONS-AND-TIPS.md:124-134` — "There is NO 'idle' state. A
polecat that isn't working has been nuked"). The badge styles below are
the *only* visual treatments the 3 states get; any other "state" the
code emits is a heresy and §7 flags it.

### Polecat state chip (canonical)

| State | Background | Foreground | Icon | Typography |
|-------|------|------|------|-----------|
| **Working** | `accent-info` @ 15% | `accent-info` | solid dot | `text-meta`, weight 500, no line-through, no italic |
| **Stalled** | `accent-warning` @ 15% | `accent-warning` | hollow dot | `text-meta`, weight 500 |
| **Zombie** | `accent-danger` @ 15% | `accent-danger` | `✕` glyph | `text-meta`, weight 500 |

Rendered shape: `px-1.5 py-0.5 rounded text-meta font-medium`.

### Priority pill (P0..P4)

| Priority | Background | Foreground |
|----------|------------|------------|
| P0 | `accent-danger` @ 20% | `accent-danger` |
| P1 | `accent-warning` @ 20% | `accent-warning` |
| P2 | `accent-info` @ 15% | `accent-info` |
| P3 | `bg-inset` | `fg-muted` |
| P4 | `bg-inset` | `fg-subtle` |

### Escalation severity

HIGH = `accent-danger` solid, CRITICAL = `accent-danger` solid + pulse
(see §6 motion). Routine mail (POLECAT_DONE, MERGED) uses `fg-muted`
dot only — never a filled pill. `GASTOWN-LESSONS-AND-TIPS.md:196-211`
is the source of truth for mail-type urgency mapping.

### Badge drift (today)

`apps/desktop/src/renderer/components/Gastown/AgentCVPanel/AgentCVPanel.tsx:23-30`
is the single source of truth and it has **six** states, not three:

```
idle:    "bg-muted text-muted-foreground"
working: "bg-blue-500/15 text-blue-600 dark:text-blue-400"
stalled: "bg-amber-500/15 text-amber-600 dark:text-amber-400"
zombie:  "bg-red-500/15 text-red-600 dark:text-red-400"
done:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
nuked:   "bg-muted text-muted-foreground line-through"
```

- **`idle`** is heretical per `LESSONS §5` — must be removed.
- **`done`** and **`nuked`** are *transitions*, not states. "done" =
  polecat finished cleanly; render as Zombie with a `Done ✓` annotation
  (still the zombie state visually because the session is gone).
  Current `done` being green + separate from `nuked` is the lie.
- **`nuked: line-through`** reads as "dead/failed" — audit §Gastown
  Agents flagged this explicitly: *"renders nuked with a line-through in
  muted colour — reads like 'dead/failed' even when a polecat landed
  work cleanly before being nuked as part of `gt done`."* **Fix**: the
  badge disappears when the polecat is nuked; the row persists with a
  muted "Nuked `<relative time>`" meta string, no line-through anywhere.

This is the single highest-leverage correctness fix in the drift list.

## 5. Empty states

Anchor: inspiration §3.1 ("empty states read like haiku, not like
errors — 'No tasks today. Enjoy your day.' in generous whitespace with
a single tasteful illustration. No 'Get started' CTA cluster"). Audit
§1 TL;DR item 4: today "the user can land on three different 'empty'
states depending on entry path" — the IA (`INFORMATION-ARCHITECTURE.md`
§6) collapses this to one canonical treatment per surface; this section
codifies the component shape.

### Empty-state template

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                     (space-12 top)                           │
│                                                              │
│              [optional small illustration                    │
│               — tasteful, no chrome]                         │
│                                                              │
│                   Primary haiku line                         │
│           text-subtitle, fg-default, centered                │
│                                                              │
│                  Optional meta subline                       │
│             text-body, fg-muted, centered                    │
│                                                              │
│                     (space-12 bottom)                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Microcopy catalog

Per-surface seeds (refine in B3 interaction specs):

- **Today**: "All polecats self-sufficient. Nothing needs you right now."
- **Agents** (no polecats): "No polecats in `<rig>` yet. Sling one with `gt sling`."
- **Convoys**: "No convoys landing today."
- **Mail**: "Inbox clear."
- **Incidents**: "All quiet across town. Last escalation resolved `<relative>`."
- **Rejection Triage**: "No rejected branches. Merge queue is flowing."

### Rules

- One action max, only if the user genuinely can't proceed.
- Loading is *not* empty (subtle spinner; empty appears only after
  resolve).
- Error is *not* empty (error uses danger color + retry affordance; see
  ConvoyBoard `Failed to load convoys. Is Gas Town running?` as the
  shape to copy).
- No "Get started!" CTA clusters. No illustrated unicorns. No "You don't
  have any items yet, click here to create one!" — trust the user.

## 6. Motion tokens

Current stack: `motion/react` across the desktop app (do **not** mix
with `framer-motion`). Pillar 7 mandates sub-100ms interaction feel —
that governs durations, not eases.

### Duration

| Token | ms | Use |
|-------|----|----|
| `dur-instant` | 80 | Hover, focus ring, micro-interaction |
| `dur-fast` | 140 | Button press, toggle flip, chip change |
| `dur-medium` | 220 | Drawer open/close, popover enter |
| `dur-slow` | 320 | Page transition, surface switch |
| `dur-pulse` | 1400 | CRITICAL escalation pulse (repeat) |

### Easing

| Token | CSS | Use |
|-------|-----|-----|
| `ease-out-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Enter animations |
| `ease-in-standard` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `ease-linear` | `linear` | Pulse, progress bars |

### Motion recipes

- **Drawer open**: `dur-medium` + `ease-out-standard`; fade overlay 180ms.
- **Toast appear**: `dur-fast` translate + opacity; dismiss: `dur-fast`
  fade only.
- **State chip transition**: `dur-fast` color crossfade; NO shake, NO bounce.
- **Escalation pulse** (CRITICAL only): `dur-pulse` opacity 1 → 0.7 → 1,
  `ease-linear`, infinite.
- **Prefers-reduced-motion**: all non-essential motion disables; pulse
  becomes a solid dot.

### Motion drift (today)

10 files across `apps/desktop/src/renderer/` import `framer-motion`
(grep `framer-motion`). Examples:

- `routes/_authenticated/components/DashboardNewWorkspaceModal/DashboardNewWorkspaceModal.tsx:1`
- `screens/main/components/WorkspaceSidebar/ProjectSection/ProjectThumbnail/ProjectThumbnail.tsx:1`
- `routes/_authenticated/_dashboard/v2-workspace/.../ChatComposerControls.tsx:1`

Mixing libraries is forbidden by Pillar 7 drift control — `motion/react`
wins. Full list in §7.

## 7. Drift report

Rule: every violation below is a candidate Phase C cleanup bead. Ordered
by highest leverage first.

### Badge drift (highest leverage — correctness bug)

| File:line | Violation | Fix |
|-----------|-----------|-----|
| `apps/desktop/src/renderer/components/Gastown/AgentCVPanel/AgentCVPanel.tsx:23-30` | 6 states defined; `idle` heretical; `nuked` line-through reads as failed | Collapse to 3 canonical states (§4); nuked polecats render as row-level muted text, not a badge |
| `apps/desktop/src/renderer/components/Gastown/AgentCVPanel/AgentDetailDrawer.tsx:101` | Consumes `STATE_BADGE_CLASS[detail.state]` inheriting the 6-state drift | Consume new `<StateChip state={...}/>` primitive from `packages/ui` |

### Arbitrary-typography drift

`text-[Xpx]` — 59 occurrences across 20 files in
`apps/desktop/src/renderer/`. Top locations (counts):

| File | Count |
|------|-------|
| `components/NewWorkspaceModal/components/PromptGroup/PromptGroup.tsx` | 8 |
| `components/Gastown/ConvoyBoard/ConvoyBoard.tsx` | 10 |
| `routes/_authenticated/.../CompareBaseBranchPicker.tsx` | 9 |
| `components/Paywall/.../CloudWorkspacesDemo.tsx` | 5 |
| `components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx` | 4 |

**Fix**: map every `text-[Xpx]` to the nearest §1 ramp token
(e.g. `text-[10px]` → `text-meta`, `text-[13px]` → `text-body`).

### Arbitrary-spacing drift

`p-[`, `px-[`, `py-[`, `gap-[`, `mt-[` — 53 occurrences across 15 files
under `apps/desktop/src/renderer/`. Top offenders:

| File | Count |
|------|-------|
| `routes/_authenticated/_dashboard/project/$projectId/page.tsx` | 7 |
| `components/NewWorkspaceModal/components/PromptGroup/PromptGroup.tsx` | 5 |
| `routes/_authenticated/components/DashboardNewWorkspaceModal/.../PromptGroup.tsx` | 5 |
| `routes/_authenticated/_dashboard/components/DashboardSidebar/.../DashboardSidebarExpandedProjectContent.tsx` | 5 |
| `routes/_authenticated/_dashboard/components/DashboardSidebar/.../DashboardSidebarSectionContent.tsx` | 3 |
| `screens/main/components/WorkspaceSidebar/ProjectSection/ProjectSection.tsx` | 5 |
| `screens/main/components/WorkspaceSidebar/SetupScriptCard/SetupScriptCard.tsx` | 3 |

**Fix**: round each value to the nearest §2 step; if a pixel-perfect
value is truly needed, promote it to a named token before landing.

### Color/hex drift

299 raw hex across 30 files under `apps/desktop/src/`. ~200 in
`shared/themes/built-in/*.ts` and `globals.css` are legitimate theme
definitions — keep. The ~100 in renderer components and
`packages/ui/src/components/ui/*` are the cleanup target. **Rule**: a
follow-up audit bead runs `grep -r '#[0-9a-fA-F]\{6\}' apps/desktop/src/renderer packages/ui/src --include='*.ts*'`
and files one bead per top-20 offender. No bulk rewrite — each migration
verifies visually.

### Motion-library drift

`framer-motion` imports across `apps/desktop/src/` — migrate to
`motion/react`. Most call sites use `motion.div` + `AnimatePresence` and
map 1:1.

| File:line | Current library | Migration target |
|-----------|-----------------|------------------|
| `apps/desktop/src/renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/DashboardNewWorkspaceModal.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/components/NewWorkspaceModal/NewWorkspaceModal.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/ProjectSection/ProjectThumbnail/ProjectThumbnail.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/components/Chat/ChatInterface/components/ChatInputFooter/components/ChatComposerControls/ChatComposerControls.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/ChatPane/components/WorkspaceChatInterface/components/ChatInputFooter/components/ChatComposerControls/ChatComposerControls.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/routes/_authenticated/components/DashboardNewWorkspaceModal/components/DashboardNewWorkspaceForm/PromptGroup/PromptGroup.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/components/NewWorkspaceModal/components/PromptGroup/PromptGroup.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/routes/_authenticated/settings/project/$projectId/cloud/secrets/components/SecretsSettings/components/AddSecretSheet/AddSecretSheet.tsx:2` | framer-motion | motion/react |
| `apps/desktop/src/renderer/routes/_authenticated/_dashboard/tasks/components/TasksView/components/TasksTopBar/components/CreateTaskDialog/CreateTaskDialog.tsx:1` | framer-motion | motion/react |
| `apps/desktop/src/renderer/screens/main/components/WorkspaceSidebar/ProjectSection/ProjectThumbnail/ProjectThumbnail.tsx` (additional call sites) | framer-motion | motion/react |

### Empty-state drift

Audit §1 TL;DR item 4: "user can land on three different empty states
depending on entry path" — `/`, `/workspace`, `/welcome`. **Fix**: all
three resolve to a single Today-view empty treatment once the IA
`/today` route lands (IA §3 `Today`); in the meantime, align copy and
typography to §5 template.

### Rebrand drift (orthogonal but in-scope for tone)

Audit §4.8: `sign-in/page.tsx:57` says "Welcome to Superset"; three
settings pages say "Superset"; docs URLs `docs.superset.sh`. Every one
of these is a type-level decision (hero/subtitle), not a token
decision, but they impede Pillar 7 perceived quality until fixed.

---

### Tokens reference (machine-readable)

```yaml
type:
  text-display: { size: 32, line: 40, weight: 600 }
  text-title:   { size: 20, line: 28, weight: 600 }
  text-subtitle:{ size: 16, line: 24, weight: 500 }
  text-body:    { size: 14, line: 20, weight: 400 }
  text-meta:    { size: 12, line: 16, weight: 500 }
  text-micro:   { size: 11, line: 14, weight: 500 }

spacing:
  space-0:  0
  space-1:  4
  space-2:  8
  space-3:  12
  space-4:  16
  space-6:  24
  space-8:  32
  space-12: 48

color:
  fg-default:    { dark: "#eae8e6", light: "#151110" }
  fg-muted:      { dark: "#a8a5a3", light: "#6b6866" }
  fg-subtle:     { dark: "#706d6b", light: "#8f8c8a" }
  fg-inverse:    { dark: "#151110", light: "#eae8e6" }
  bg-surface:    { dark: "#151110", light: "#fafafa" }
  bg-raised:     { dark: "#201e1c", light: "#ffffff" }
  bg-inset:      { dark: "#1a1716", light: "#f0f0ef" }
  bg-overlay:    { dark: "rgba(0,0,0,0.55)", light: "rgba(0,0,0,0.25)" }
  accent-brand:  "#e07850"
  accent-success:"#22c55e"
  accent-warning:"#f59e0b"
  accent-danger: "#ef4444"
  accent-info:   "#3b82f6"

badge:
  polecat-working: { bg: "accent-info/15",    fg: "accent-info",    icon: "dot-solid" }
  polecat-stalled: { bg: "accent-warning/15", fg: "accent-warning", icon: "dot-hollow" }
  polecat-zombie:  { bg: "accent-danger/15",  fg: "accent-danger",  icon: "x" }

motion:
  dur-instant: 80
  dur-fast:    140
  dur-medium:  220
  dur-slow:    320
  dur-pulse:   1400
  ease-out-standard: "cubic-bezier(0.2, 0, 0, 1)"
  ease-in-standard:  "cubic-bezier(0.4, 0, 1, 1)"
  ease-linear:       "linear"
  prefers-reduced-motion: "strip non-essential"
```
