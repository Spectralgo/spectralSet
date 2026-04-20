---
phase: B3
doc_id: spec-agents
version: v0.1
owner: polecat/jade
depends_on: [B0, B1, B4, ug-02-sling-and-monitor, ug-05-agent-recovery]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/user-guides/02-sling-and-monitor.md
  - ai_docs/spectralset-vision/user-guides/05-agent-recovery.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#1.2
  - ai_docs/spectralset-vision/inspiration.md#2.2
  - ai_docs/spectralset-vision/inspiration.md#2.4
  - ai_docs/spectralset-vision/inspiration.md#4.3
  - ai_docs/spectralset-vision/inspiration.md#4.5
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

# B3 Interaction Spec — Agents surface

Operationalizes the Agents surface (`INFORMATION-ARCHITECTURE.md:140-152`) for
the two journeys that live on it: sling-and-monitor (UG-02) and agent recovery
(UG-05). The 3-state chip (working / stalled / zombie) is the load-bearing
primitive (`PRINCIPLES.md:67`, `DESIGN-SYSTEM.md:127-142`); recovery preflight
is the load-bearing verb (`user-guides/05-agent-recovery.md:34`). Everything
else composes around those two commitments.

## 1. Wireframe

Agents surface, default view. Grouped grid left, polecat drawer right, deacon
log as a collapsible right-side panel. List stays visible when the drawer is
open (`INFORMATION-ARCHITECTURE.md:276-277`).

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Agents                                        [ Deacon log ▸ ] [ Cmd-K ]  │
│  All polecats green, 0 zombies, 0 orphans, deacon armed — verified 9s ago  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  Mayor / Deacon / Boot                                                     │
│  ├─ 🟢 mayor/           · working · Session: 6 · Sandbox: clean            │
│  ├─ 🟢 spectralSet/deacon · armed · last sweep 32s ago                     │
│                                                                            │
│  spectralSet                                                               │
│  ├─ 🟢 jasper     · working    · Session: 12 (resilient) · Sandbox: clean  │
│  │   hook: ss-u72 — Rebrand followup    · last tool call 14s ago           │
│  ├─ 🟡 quartz     · stalled 14m · Session: 4 · Sandbox: clean · Slot: held │
│  │   hook: ss-2a6 — B3 spec-agents     · last tool call 14m ago            │
│  ├─ 🔴 obsidian   · zombie 3h  · Session: — (dead) · Sandbox: 4 uncommitted│
│  │   hook: ss-vn2 — Settings cleanup   · last commit abc1234 on branch     │
│                                                                            │
│  longeye                                                                   │
│  ├─ 🟢 onyx       · working    · Session: 2 · Sandbox: clean               │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

Polecat drawer (opens anchored right; list stays visible):

     ┌──────────────────────────────────────────────────────────┐
     │  quartz · spectralSet                             [ × ]  │
     │  🟡 stalled (14m, no tool call)                          │
     │  ──────────────────────────────────────────────────────  │
     │  Hook            ss-2a6 — B3 spec-agents                 │
     │  Branch          polecat/quartz-mo7hizq2                 │
     │  Last commit     9m ago — "seed interaction spec"        │
     │  Session         4 (resilient)                           │
     │  Sandbox         clean                                   │
     │  Slot            held                                    │
     │  ──────────────────────────────────────────────────────  │
     │  [ ⚑ Check Recovery ]   [ Peek ]   [ Nudge ]             │
     │  ──────────────────────────────────────────────────────  │
     │  (recovery preflight result renders inline below)        │
     └──────────────────────────────────────────────────────────┘

Zombie drawer (same anchor, different button row):

     [ Inspect Sandbox ]  [ Re-sling on fresh polecat ]  [ Nuke ]
```

Recovery preflight result renders inline beneath the button row (no modal, no
separate tab) per `user-guides/05-agent-recovery.md:34`. Continuity preamble
preview and NukeConfirm both render in place over the drawer per
`user-guides/05-agent-recovery.md:38-42` and inspiration §2.4.

## 2. Component inventory

All primitives come from shadcn/ui + Tailwind v4 and compose against B4 tokens
(`DESIGN-SYSTEM.md:33-73`). No new tokens; no arbitrary pixel values.

| Component (generic) | shadcn / Tailwind basis | Tokens (B4) |
|---|---|---|
| Surface header | `div` + `h1` + text tokens | `text-title`, `space-6` |
| System-OK verdict line | `div` single row | `text-body`, `fg-muted` |
| Group heading | `h2` | `text-subtitle`, `space-4` above |
| Grouped grid | vertical list, no dividers | `space-3` row gap |
| Polecat row | flex row, focusable | `bg-raised` on focus, `space-3` |
| **State chip** | Badge primitive | `§4 polecat state chip`, `text-meta` |
| Health badge trio | 3 × Badge | `text-meta`, `fg-muted` |
| Hook line | row subtext | `text-body`, `fg-muted` |
| Drawer | Sheet (right, anchored) | `bg-raised`, `dur-medium`, `ease-out-standard` |
| Drawer header | title + chip | `text-title` + state chip |
| Button group | 3 buttons max | primary = `accent-brand`, others ghost |
| Inline result panel | Card inside drawer | `bg-inset`, `space-4` |
| Continuity preamble preview | editable textarea | `text-body`, `bg-inset` |
| Confirm panel (in-place) | Popover over drawer | `dur-fast`, no overlay scrim |
| Deacon log | side Sheet, left-collapsed | `bg-inset`, row = `text-meta` |
| Action-log row | flex row + Re-sling button | `text-body` + ghost button |
| Banner (stale data) | inline Alert | `accent-warning` @ 15% |
| Empty state | vertical block, `space-12` padding | `text-subtitle` + `fg-muted` |

Explicitly **not** on this surface: sidebar unread badges (the Agents surface
carries no sidebar counts per `user-guides/05-agent-recovery.md:50`); dropdown
menus for state transitions (chips are computed, not user-edited, per
`PRINCIPLES.md:67` and `INFORMATION-ARCHITECTURE.md:244-246`); right-click
kebab menus (per-state button row replaces them — inspiration §2.2).

## 3. Microcopy

Every label, button, chip value, empty line, and error string rendered on the
Agents surface. If a string is not here it will get improvised during
implementation — add it to this catalog before writing the component.

**Surface header**
- Title: `Agents`
- Verdict line (all green): `All polecats green, 0 zombies, 0 orphans, deacon armed — verified <relative> ago.`
- Verdict line (degraded): `State data older than 30s — reconnecting.`
- Deacon log button: `Deacon log`

**Group headings**
- `Mayor / Deacon / Boot`
- `<rig name>` (alphabetical, e.g., `spectralSet`, `longeye`)

**State chip values** (authoritative 3-state per `DESIGN-SYSTEM.md:134-142`)
- Working: `working`
- Stalled: `stalled <duration>` (e.g., `stalled 14m`)
- Zombie: `zombie <duration>` (e.g., `zombie 3h`)

**Health badges** (right of chip, inline — `user-guides/05-agent-recovery.md:52`)
- Session: `Session: <n>` or `Session: <n> (resilient)` when n ≥ 5
- Sandbox: `Sandbox: clean` / `Sandbox: <n> uncommitted` / `Sandbox: —`
- Slot: `Slot: held` / `Slot: released`

**Hook line (row subtext)**
- With hook: `hook: <bead-id> — <bead title>`
- No hook (rare, transient): `hook: —`

**Drawer header**
- Title: `<polecat-name> · <rig>`
- Secondary: the state chip (same strings as above)

**Drawer fields**
- `Hook`, `Branch`, `Last commit`, `Session`, `Sandbox`, `Slot`
- Last-commit formatting: `<relative> ago — "<first-line subject>"`
- Branch empty: `Branch: —`

**Per-state button labels** (exact labels — verbs match CLI for muscle memory)
- Working: `Peek`
- Stalled: `⚑ Check Recovery` (primary), `Peek`, `Nudge`
- Zombie: `Inspect Sandbox`, `Re-sling on fresh polecat`, `Nuke`

**Recovery preflight inline result** (appears under the button after `Check Recovery`)
- Healthy: `RECOVERABLE — session heartbeat within threshold, sandbox clean, last commit <relative> on <branch>.` · Recommendation: `Nudge with "status?"`
- Long-running: `LIKELY HEALTHY — heartbeat fresh, sandbox active, long-running process detected.` · Recommendation: `Nudge before nuking.`
- Stale session: `RECOVERABLE (session warm) — sandbox clean, no commits in <duration>.` · Recommendation: `Nudge with "status?"`
- Unrecoverable: `UNRECOVERABLE — session dead <duration>, sandbox dirty.` · Recommendation: `Re-sling on a fresh polecat.`
- Probe error: `Could not reach polecat. Retry or inspect sandbox directly.`

**Inspect Sandbox inline result** (zombie only)
- `Last commit <sha> on <branch>, <pushed|unpushed>, <n> uncommitted file(s). Hook bead: <bead-id>.`

**Continuity preamble preview** (on Re-sling — editable in place per `user-guides/05-agent-recovery.md:38-42`)
- Default body: `Previous polecat (<name>) reached commit <sha> on branch <branch>. Re-use what you can, don't re-litigate decisions visible there.`
- Confirm button: `Confirm re-sling`
- Cancel: `Cancel`

**NukeConfirm** (in-place over drawer per inspiration §2.4)
- Title: `Nuke <polecat-name>?`
- Body: `Ends the session. Sandbox preserved, unsaved scratch lost.`
- Confirm: `Nuke`
- Cancel: `Cancel`

**Deacon log panel**
- Panel title: `Deacon log — last 50 actions`
- Pause button: `Pause Deacon`
- Filter chips: `nuked`, `nudged`, `restarted`
- Row format: `<relative> ago · <action> · <polecat> · reason: <reason>` + `Re-sling` button when action = `nuked`

**Empty states** (per `DESIGN-SYSTEM.md:224-229`)
- All healthy: verdict line carries it (see §3 Surface header). No separate empty block — the grid is never empty while any agent exists.
- No polecats in a rig: `No polecats in <rig> yet. Sling one with gt sling.`
- Deacon log empty: `Deacon hasn't done anything in the last hour.`

**Error / degraded**
- Probe unreachable (whole surface): `Gas Town is not reachable. Start it with gt doctor --fix, then SpectralSet will reconnect.` (per `user-guides/05-agent-recovery.md:69`)
- Stale stream banner: `State data older than 30s — reconnecting.`
- Action failed (per-row toast): `Couldn't <verb> <polecat>: <reason>. Retry.`

## 4. Keyboard shortcuts

Every common action on the Agents surface gets a keystroke. Cross-references
Pillar 2 (direct manipulation) — `PRINCIPLES.md:59`, inspiration §1.2 and §2.2.

| Shortcut | Verb | Scope |
|---|---|---|
| `g a` | Open Agents surface | Global |
| `Cmd-K` | Command bar | Global |
| `j` / `k` | Focus next / previous polecat row | Surface |
| `Enter` | Open drawer on focused row | Surface |
| `Esc` | Close drawer / close confirm / close command bar | Drawer / overlay |
| `Cmd-Shift-K` | Quick actions on focused row (inspiration §2.2) | Row |
| `p` | Peek focused polecat | Row (any state) |
| `n` | Nudge focused polecat | Row (stalled only) |
| `r` | Check Recovery on focused polecat | Row (stalled only) |
| `i` | Inspect Sandbox | Row (zombie only) |
| `s` | Re-sling on fresh polecat | Row (zombie only) |
| `⇧N` | Nuke (opens NukeConfirm) | Row (zombie only) |
| `l` | Toggle Deacon log panel | Surface |
| `f` | Focus filter input in Deacon log | Deacon log |
| `/` | Focus in-surface search (polecat name, hook id) | Surface |

Keys are suppressed when the focus is in an editable field (textarea, input).
Per-state shortcut keys are disabled when the chip state doesn't match — the
key produces a subtle shake + tooltip: `Check Recovery is only available on stalled polecats.`

## 5. Live data behavior

The Agents surface is a live view of server-computed state. Client never
derives the state chip — it subscribes (`PRINCIPLES.md:57-58`,
`INFORMATION-ARCHITECTURE.md:244-246`).

**Primary feed.** Dolt `HASHOF_DB` watcher (already shipped per P4) drives
push-based invalidation of the agents query. Client target is a visible update
within 200ms of the server-side state change. Inspiration §1.4 — same
objects, pushed, no refresh.

**Fallback polling.** If the realtime subscription drops, the query polls on
a 3s cadence. At 10s of no successful response, the state chip on every row
greys out and the verdict line becomes `State data older than 30s —
reconnecting.` (`user-guides/05-agent-recovery.md:65`). At 30s of sustained
failure, the surface shows the probe-unreachable empty state.

**Preflight probe (`Check Recovery`).** Read-only call; never mutates
(`user-guides/05-agent-recovery.md:67`). Timeout 4s. Result renders inline
under the button. Re-runnable without side effects.

**Optimistic updates.** Only two writes optimistically update local state:
- `Nudge` — the drawer shows `Nudge sent <relative>` immediately; the chip
  does NOT flip to green client-side. The chip flips only when the server
  observes activity.
- `Nuke` — the row chip flips to `zombie (just now)` optimistically and the
  button row swaps to the zombie set. Rolls back with a toast on failure.

`Re-sling on fresh polecat` does NOT optimistically move the row — the new
polecat appears when the server reports it. Avoids a flashing ghost row if
the sling fails mid-flight.

**Drawer vs list consistency.** The drawer subscribes to the same query key
as the row. When the row's chip changes, the drawer's chip changes. No local
Zustand slice for polecat state (avoids the "two stacks coexist" drift the
audit flagged at `current-state-audit.md:27`).

**Deacon action log.** Separate stream, 10s poll when the panel is closed,
3s poll when open. Filters are pure client-side.

**System-OK verdict line.** Recomputed server-side whenever any polecat chip
changes; falls back to client aggregation only when the server doesn't emit
it. Client aggregation rule: all working ∧ zero zombies ∧ zero orphans ∧
deacon armed ⇒ green verdict. Otherwise the verdict line enumerates:
`2 stalled · 1 zombie · deacon armed.`

**Mute / snooze.** Not on this surface in v1. Per-polecat snooze was
considered and dropped — see §6.

## 6. Trade-offs and rejected alternatives

- **Idle state reintroduced for polecats "between hooks".** Rejected. The
  3-state model is doctrinal (`PRINCIPLES.md:67`,
  `DESIGN-SYSTEM.md:130-133`). A polecat without a hook is a nuked polecat
  about to be swept, not "idle" — the row persists briefly with a muted
  "Nuked <relative>" meta string (`DESIGN-SYSTEM.md:182-185`) and falls
  off on the next sweep.
- **Dropdown menu for per-row actions (right-click kebab).** Rejected in
  favor of the per-state button row. Journey 05's core complaint is that
  today's CLI lets the operator pick the wrong subcommand
  (`user-guides/05-agent-recovery.md:81` — `gt nuke` when `gt polecat
  nuke` was needed); a dropdown reintroduces that footgun. Every button
  shown is a button that applies.
- **Auto-nuke on "UNRECOVERABLE" preflight verdict.** Rejected. Preflight
  is read-only, always (`user-guides/05-agent-recovery.md:67`). The
  operator makes the destructive call. Auto-nuke would recreate the
  "murderous deacon" failure mode under a different name.
- **Per-polecat snooze (mute chip for N minutes).** Deferred, not killed.
  The inspiration §1.4 pattern is valid, but the Agents surface has no
  sidebar badges to mute in v1, and the forward-motion chip is already
  a per-row noise-dampener. Revisit once Incidents ships and cross-
  surface muting is defined.
- **Sparkline per agent card (event throughput).** Rejected. This is the
  worked example in `PRINCIPLES.md:125-132` — advances nothing daily,
  hurts founder-scale density, hides the state chip which the audit
  already flagged as broken. Fix the chip first.
- **Two chips per row: state chip + forward-motion chip.** Reconsidered.
  UG-02 introduces forward-motion (🟢 making progress / 🟡 thinking / 🔴
  stalled) on sling-and-monitor rows (`user-guides/02-sling-and-monitor.md:88-93`);
  UG-05's state chip uses the same three colors for working/stalled/
  zombie. **Resolution for v1:** one chip per row, driven by the UG-05
  3-state model. Forward-motion granularity (making progress vs thinking)
  renders as a secondary meta string (`last tool call 14s ago`) next to
  the chip, not as a second chip. Revisit if operators ask for both. See
  OQ 1.
- **Bulk actions (select N rows, nudge all).** Rejected for v1. Every
  current journey operates on one polecat at a time. Bulk nuking is a
  footgun and the audit's complaint about the current panel not having
  bulk actions (`current-state-audit.md:168-169`) was about peek/mail,
  not about destructive verbs. Defer.
- **Drawer as a route (`/agents/<rig>/<polecat>`).** Rejected per B1 IA
  §5 rule 1 (`INFORMATION-ARCHITECTURE.md:293-294`). Drawer keyed as a
  search param `?drawer=polecat:<name>`; back-button restores prior
  drawer state, not prior route.

## 7. Open questions for B5 review

1. **One chip or two?** §6 resolves to one for v1, with activity freshness
   as a meta string. Operators running hot swarms may want the forward-
   motion granularity from UG-02 on the Agents surface too. Is the v1
   answer durable, or will the first dogfooding session ask for the
   second chip back?
2. **Chip color semantics across surfaces.** UG-05 uses green/amber/red
   for working/stalled/zombie. UG-02 uses green/amber/red for making
   progress/thinking/stalled. Is it OK that red means two different
   things (stalled vs zombie) depending on which surface you're on — or
   does B4 need an explicit per-surface chip vocabulary?
3. **Preflight timeout of 4s.** Is that the right budget? Too short and
   long-build polecats read as unreachable; too long and the operator
   waits for a stale answer. The cli-pain inventory does not cite a
   ground-truth p99 for `gt polecat check-recovery`.
4. **"Slot: held" vs "Slot: released".** The health badge trio in UG-05
   (`user-guides/05-agent-recovery.md:52`) names these but does not
   define them for a non-Gas-Town-native user. Should the badge be
   clickable to expand an explanation, or does the glossary in
   `PRINCIPLES.md:29-44` carry that weight?
5. **Deacon log as a side sheet vs a bottom drawer.** The wireframe has
   it right-side collapsed. A bottom drawer would keep the full grid
   visible horizontally at the cost of vertical real estate. Either is
   defensible; I kept side-right to match the polecat drawer pattern
   and the "list stays visible" rule.
6. **Session-resilience annotation `(resilient)` at n ≥ 5.** I picked 5
   to match the "Session: 12 (resilient)" example in UG-05. Is 5 a
   Gas Town constant or a UG-05 illustrative number? If the real
   threshold is different, this string is load-bearing and wrong.
7. **Optimistic-update rollback copy.** The failure toast ("Couldn't
   <verb> <polecat>: <reason>. Retry.") uses the verb from the button
   label. For `Check Recovery` the verb reads as "check recovery"
   which is awkward in-sentence. Should failure strings be hand-crafted
   per verb instead of templated?
8. **Focus restoration after NukeConfirm confirms and the row
   disappears.** Which row gets focus next — the row above, or the
   surface header? I omitted a rule; UG-05 implies the list stays
   visible but doesn't specify focus target. Small decision, but every
   one of these small decisions accumulates into keyboard feel.
