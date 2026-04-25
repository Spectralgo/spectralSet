---
phase: RESEARCH
doc_id: sidebar-reordering
date: 2026-04-25
bead: ss-jpvk
parent: ss-v1nk
owner: crew/gastown_researcher
seed_inputs:
  - apps/desktop/src/renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx
  - packages/gastown-cli-client/src/parsers/status.ts
  - packages/gastown-cli-client/src/types.ts
  - apps/desktop/src/renderer/components/Gastown/AgentRow/AgentRow.tsx
  - ai_docs/spectralset-vision/PRINCIPLES.md
required_sections_present: true
section_count_self_check: 5
---

# Sidebar Gas Town section reordering instability — research + design

**Bead:** ss-jpvk · **Time-box:** 30 min · **Mode:** read-only · **Live measurement:** deferred to impl spike (see §5 C-sidebar-01).

## 1. Problem (measured + inferred)

**Symptom (per bead):** the Gas Town sidebar section visibly reorders agents (and possibly rigs) on each 5s probe refresh. Sophie loses scan position; click targets move; perceived stability drops.

**Probe cadence is verified.** `GastownSidebarSection.tsx:55-60` — `useQuery({ queryFn: gastown.probe, refetchInterval: 5000, refetchOnWindowFocus: false })`. **12 refreshes per minute** while the window is foregrounded.

**React keys are stable** — not the cause. `GastownSidebarSection.tsx:322` keys agent rows with `${agent.rig}/${agent.role}/${agent.name}`. None of the three components mutate per probe (the agent's identity is fixed). Eliminates root-cause hypothesis (d) "React key collision causing remount".

**Probe data is parsed deterministically per probe.** `parsers/status.ts:52-89` walks `raw.rigs` and `entry.agents` in iteration order. Two specific consequences:

- **Rig order = `gt status --json` emission order**, NOT name-sorted (`status.ts:81-88` pushes in array order; no sort step). If `gt` reorders rigs across calls (e.g. by daemon-internal hashmap iteration), the sidebar will reorder rigs.
- **Agent order from the parser = emission order** (`status.ts:72-79`). The renderer's `sortAgents` (`GastownSidebarSection.tsx:333-342`) is the canonical agent sort.

**Live measurement deferred.** The bead specifies agent-browser via CDP :9222 for 60s of observation; that requires the desktop app to be running with `--remote-debugging-port=9222` and a separate agent-browser session. Within the 30-min cap I prioritised root-cause analysis from code; live reproduction + position-change counts move into impl bead C-sidebar-01 (§5) as a verification spike *before* shipping the fix, to confirm hypothesis ranking.

## 2. Root cause

The sort cascade in `GastownSidebarSection.tsx:333-342`:

```
roleDiff (mayor=0, refinery=1, witness=2, crew=3, polecat=4)
  → working-first within role (binary: state==='working' vs everything else)
  → name.localeCompare ascending
```

Cause ranked by likelihood (high → low):

**(a) State flicker on the binary `working` axis — primary cause.** The `state` enum (`types.ts:8-10`) is `working / idle / done / stalled / zombie / nuked / null`. The sort treats `working` as one bucket and **everything else as a second bucket** (`:337-339`). Any polecat transitioning through `working → idle → working` (or `working → done` while a fresh hook is being attached) flips its bucket, which shoots it from "top of polecat group" to "alphabetical position among non-working polecats". Because `gt status` polls a live tmux + Dolt store, brief gaps where the daemon hasn't seen a recent heartbeat will downgrade `working` → `idle` for one probe and back the next, causing a same-second up-and-down move in the sidebar.

**(b) Rig reorder from upstream emission — secondary cause.** `parsers/status.ts:81` does not sort rigs. Whatever order `gt status --json` returns is the order the sidebar renders. If `gt`'s underlying rig-store iteration is non-deterministic (Go map ranges are pseudo-random), rigs reorder on every probe. Trivial fix: sort by name in the parser.

**(c) `running` boolean flicker — minor.** The schema (`types.ts:11-15`) carries `running: boolean` as a separate signal ("gt found a live tmux session"). `sortAgents` does not consult `running`; only the `AgentRow` colour logic (`AgentRow.tsx:36-42`) consumes it. Not a sort cause, but it is one of two state signals that flicker in tandem with `state` and would make any "stability detection" heuristic noisier.

**(d) React key collision — eliminated above.**

**(e) Probe data fundamentally unstable — partial.** Sub-cases (a) and (b) are concrete instances. The parser itself is stable (deterministic for a given input); the upstream `gt status` is the source of churn.

**Pillar audit (`PRINCIPLES.md` v0.2):**

- **Pillar 6 Surgical observability** — the working-first sort is *trying* to answer "who's working right now?" at-a-glance. The fix must preserve that signal, not hide it.
- **Pillar 7 Beautiful and fast** — Things-3-calm aesthetic. Visual reorder every 5s is the antithesis. This is the pillar the bug *most directly violates*.
- **Pillar 3 Founder-scale** — at 10+ rigs and 40+ agents, even occasional reorders compound into "the sidebar feels alive in a bad way".

## 3. Options (4-axis scored)

Six options. Each scored 1 (worst) – 5 (best) on **Stability** (does it stop reorder?), **Information density** (can the user still see who's working?), **Implementability** (LoC + dep risk), **Scanability** (can Sophie find an agent quickly?). Total /20.

| # | Option | Stability | Density | Implem. | Scanability | Total |
|---|--------|-----------|---------|---------|-------------|-------|
| **A** | **Pure alphabetical** (drop working-first; show state via dot only) | 5 | 3 | 5 | 3 | **16** |
| **B** | **Hysteresis** (resort only after state stable N=3 probes) | 3 | 4 | 3 | 4 | **14** |
| **C** | **Two-list partition** (Working subgroup top, Other subgroup alphabetical below) | 4 | 5 | 4 | 5 | **18** |
| **D** | **FLIP animation** (motion/react animates reorder transitions) | 1 | 4 | 3 | 3 | **11** |
| **E** | **Sticky position** (lock once rendered; reflow only on add/remove) | 5 | 3 | 2 | 3 | **13** |
| **F** | **Server-side stable order** (gt emits `displayOrder`; renderer trusts it) | 5 | 5 | 1 | 5 | **16** |

### Option detail (with line-cited claims)

**A — Pure alphabetical.** Replace `:337-339` working-first comparator with name-only sort. Stability: ★5 (positions never change unless agent added/removed). Density: ★3 (state is still visible via the AgentRow dot at `AgentRow.tsx:35-42`, but Sophie loses the "working agents float to top" affordance — she has to scan the colour column). Implementability: ★5 (≤5 LoC). Scanability: ★3 (alphabetical is fine for ≤10 agents; degrades at scale).

**B — Hysteresis.** Track per-agent state-stability across probes (e.g. require `state="working"` for 3 consecutive probes — 15s — before treating that agent as a working-bucket member; symmetrically require 3 consecutive non-working probes to demote). Stability: ★3 (genuine state changes still cause reorder, just delayed). Density: ★4 (preserves working-first semantics with a small lag). Implementability: ★3 (needs a per-agent rolling state buffer in component state or a hook; ~40 LoC; not trivial). Scanability: ★4 (lag is invisible to the operator).

**C — Two-list partition (RECOMMENDED).** Render two stacked subgroups inside each rig: a "Working" header with all `state="working"` agents alphabetical, then an "Other" header (or no header) with the rest alphabetical. Stability within each subgroup is perfect — order changes only when an agent crosses the working/non-working boundary, which is a *meaningful* event. Density: ★5 (the working signal is now a section header, not a vertical position contest). Scanability: ★5 (Sophie gets two short alphabetical lists, both predictable). Implementability: ★4 (modest renderer change in `RigGroup` at `:299-330`; ~30 LoC; no schema change). Stability: ★4 (not ★5 because crossings still move an agent — but the move is between two stable groups, not within an unstable list).

**D — FLIP animation.** Keep current sort, animate transitions with `motion/react` (already in deps per `DESIGN-SYSTEM.md §6`). Stability: ★1 (does NOT fix the reorder; just makes it prettier). Cosmetic mitigation, not root fix. Pillar-7 conformant in feel but Pillar-7 hostile in honesty — the UI lies that things are calm.

**E — Sticky position.** Remember each agent's last index; on probe, reuse the index for known agents; new agents append; removed agents leave gaps that compact on next *user-initiated* refresh (e.g. window-focus re-trigger or manual reload). Stability: ★5 (perfect within a session). Density: ★3 (working agents do NOT float to top after their state changes; the visual no longer answers "who's working"). Implementability: ★2 (component-state-keyed map; complicated by add/remove timing; ≥80 LoC and edge cases). Scanability: ★3 (positions stable but semantically meaningless).

**F — Server-side stable order.** Add a `displayOrder` field to `gt status --json` output and the `RigAgent` schema (`types.ts:3-16`); renderer trusts the order. Stability: ★5. Density: ★5 (semantics live in `gt`, the canonical source). Scanability: ★5 (canonical sort is consistent across all clients — bv, beadsx, beads-fleet from `BEADS-UI-PRIOR-ART-2026-04-24.md §1`). Implementability: ★1 (requires upstream `gt` change, schema bump, parser update, version coordination). Best long-term answer, worst short-term cost.

## 4. Recommendation

**Primary: Option C — two-list partition.** Best total score (18/20), preserves the working-first signal as a *labeled section* rather than a *contested ordering*, and ships in one renderer-side bead with no schema/upstream coupling. The single trade-off versus Option F is locality — Option C answers the symptom in this surface only, while F would calm reorders across every future Gas Town UI. F is the right *next* fix, not the right *first* fix.

**Fallback: Option B — hysteresis.** Better than Option A on density but loses to C on scanability + stability. Use B if a five-rig user-test of C reveals that "bouncing" between Working and Other subgroups (when a polecat genuinely toggles working state every minute) feels worse than a single uniform list. Implementable on top of C with ~30 additional LoC (the partition uses the same stability-buffered state).

**Reject Option D outright.** Animating reorders without fixing them is a Pillar-7 violation dressed as polish, exactly the "surface polish hiding broken core flows" anti-pattern from `PRINCIPLES.md §5`.

**Park Option F.** File as a follow-up against `gt` upstream (`gt status --json` `.rigs[].agents[].displayOrder`). Once `gt` emits stable order natively, the Option C partition can stay (working-bucket header is still useful) and the within-bucket alphabetical sort becomes the upstream's responsibility.

**Side-fix (independent of A–F): sort rigs in the parser.** `parsers/status.ts:81-88` must sort `rigs.push` output by name before returning, otherwise rigs themselves can reorder on every probe regardless of which agent option ships. ~3 LoC. Bundle into the same fix wave.

Why C beats A on Pillar 6 (Surgical observability): A demotes the working signal from spatial (top of list) to chromatic (dot colour only). At 40+ agents, scanning 40 dot colours costs more attention than scanning a labeled "Working (3)" header followed by three names. C keeps the spatial salience; A discards it.

## 5. Bead-ready decomposition

Six beads, each ≤80 LoC per `ss-yr9h`. Numbered C-sidebar-01..06.

### C-sidebar-01: Live reproduction + measurement spike

- **Files:** none modified; reads only.
- **Scope:** launch `apps/desktop` via `bun dev` (or pre-built Electron) with `--remote-debugging-port=9222`, run agent-browser CLI for 60s in two scenarios: (a) idle town, (b) one polecat actively working on a bead. Capture screenshots at t=0, 30s, 60s. Record per-second the number of agents that changed DOM index.
- **LoC:** 0 (verification only). Reports go to `ai_docs/research/sidebar-reordering-2026-04-25-measurements.md`.
- **Acceptance:** measurement file exists with two scenarios × at least 12 probe ticks of position-change counts; verifies hypothesis (a) state flicker is dominant.
- **Why first:** confirms the diagnosis before any code change. If measurements show rig reorder dominates agent reorder, the parser fix (C-sidebar-02) ships ahead of the renderer fix.

### C-sidebar-02: Sort rigs by name in the parser

- **Files:** `packages/gastown-cli-client/src/parsers/status.ts:81-88`; `packages/gastown-cli-client/src/parsers/status.test.ts`.
- **Scope:** add `rigs.sort((a, b) => a.name.localeCompare(b.name))` before return. Add a test: input with rigs `["gmux", "spectralSet", "hq"]` returns `["gmux", "hq", "spectralSet"]`.
- **Grep receipt:** `grep -n "rigs.push" packages/gastown-cli-client/src/parsers/status.ts` → `:81`.
- **LoC:** ≤10.
- **Acceptance:** existing `status.test.ts` cases continue to pass with the rig order normalised; new test passes; no other consumer of `parseStatus` regresses (grep `parseStatus(` to enumerate; expect the desktop probe and `agents.test.ts`).

### C-sidebar-03: Two-list partition primitive in `RigGroup`

- **Files:** `apps/desktop/src/renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx:299-330`.
- **Scope:** replace the single `agents.map(...)` block in `RigGroup` (`:319-326`) with two `useMemo`-derived arrays: `workingAgents` (`state === "working"`) and `otherAgents`. Render `workingAgents` first under a small `text-[10px] text-muted-foreground` header `Working (${count})` (no header if count=0); render `otherAgents` below, no header. Both arrays sort by `role → name.localeCompare` (drop the working-first axis from `sortAgents` since it's now the partition).
- **Grep receipt:** `grep -n "agents\.map" apps/desktop/src/renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx` → `:320`.
- **LoC:** ≤60.
- **Acceptance:** at any probe, agents within `workingAgents` are stable across probes (only crossings move an agent); same for `otherAgents`. Working-bucket header reflects current count.

### C-sidebar-04: Simplify `sortAgents` to role+name only

- **Files:** `GastownSidebarSection.tsx:333-342`.
- **Scope:** remove the `aWorking/bWorking` lines (`:337-339`); the comparator becomes `roleDiff || a.name.localeCompare(b.name)`. The state-based partition lives in `RigGroup` after C-sidebar-03; this function no longer mutates ordering by state.
- **Grep receipt:** `grep -n "sortAgents" apps/desktop/src/renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx` → `:66, :333`.
- **LoC:** ≤10.
- **Acceptance:** unit-render test on `RigGroup` confirms agents within each subgroup are alphabetised within their role.

### C-sidebar-05: AgentRow stable identity audit

- **Files:** `GastownSidebarSection.tsx:322`; `AgentRow.tsx`.
- **Scope:** verify the React key `${agent.rig}/${agent.role}/${agent.name}` is unique per agent and stable across probes (no collisions between e.g. two rigs with same polecat name). Add a runtime dev-mode `console.warn` if duplicates appear in a single probe (guard with `import.meta.env.DEV`).
- **Grep receipt:** `grep -n "key={" apps/desktop/src/renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx` → `:322`.
- **LoC:** ≤25.
- **Acceptance:** no warning fires under normal probe; manually duplicated fixture triggers warning in tests.

### C-sidebar-06: Optional motion polish (gated on overseer approval)

- **Files:** `apps/desktop/src/renderer/components/Gastown/AgentRow/AgentRow.tsx`.
- **Scope:** add `motion/react` `LayoutGroup` + `motion.div` wrapper around the row to animate the *crossings* (Working ↔ Other) at `dur-medium` 220ms with `ease-out-standard` (per `DESIGN-SYSTEM.md §6`). Strictly non-default — gated behind a prefers-reduced-motion strip and an opt-in setting. Aimed at making the *legitimate* state crossings feel intentional, not at hiding remaining instability.
- **Grep receipt:** `grep -n "motion/react" apps/desktop/src/renderer/components/Gastown/AgentRow/AgentRow.tsx` → expect 0 (no current usage).
- **LoC:** ≤40.
- **Acceptance:** crossings animate smoothly; no animation when prefers-reduced-motion is set; no animation on initial mount; no animation on rig reorder (Option F territory).

**Critical path:** `01 → 02 → (03 + 04 in parallel) → 05`. C-sidebar-06 is optional, ship after the first five and after a persona-walk confirms crossings are noticeable enough to need motion.

**Total budget:** ≈145 LoC across 5 mandatory beads + 40 optional = 185 LoC. Well under any reasonable sub-feature ceiling.
