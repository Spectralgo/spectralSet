---
phase: B3
doc_id: spec-convoys
version: v0.1
owner: polecat/jasper
depends_on: [B0, B1, B4, B2-02-sling-and-monitor, B2-04-code-review-handoff]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/user-guides/02-sling-and-monitor.md
  - ai_docs/spectralset-vision/user-guides/04-code-review-handoff.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#1.3
  - ai_docs/spectralset-vision/inspiration.md#1.4
  - ai_docs/spectralset-vision/inspiration.md#1.5
  - ai_docs/spectralset-vision/inspiration.md#2.2
  - ai_docs/spectralset-vision/inspiration.md#4.3
  - ai_docs/spectralset-vision/cli-pain-inventory.md#2
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

# B3 — Convoys surface (MR/merge, stranded-convoy alert)

The Convoys surface answers: **which sprints/epics are in-flight, where
are they blocked, and which convoys have become stranded?**
(`INFORMATION-ARCHITECTURE.md:154-165`). It is the home of the MR/merge
pipeline-in-context and the hero surface for the stranded-convoy alert —
the single primary indicator that "the steam engine is stalled"
(`PRINCIPLES.md:81`, `cli-pain-inventory.md:196`, `GASTOWN-LESSONS-AND-TIPS.md §8`).

## Wireframe

Default sub-view is **list-plus-drawer**, inherited from today's Convoys
layout (`INFORMATION-ARCHITECTURE.md:157-158`, `current-state-audit.md:181-195`)
and codified in B1 IA §5 rule 2 ("detail opens as a drawer, the list
stays visible"). No route changes when a convoy is selected; URL is
`/convoys?drawer=convoy:<id>` per IA §5 rule 5.

```
┌── Convoys ───────────────────────────────────────────────────────────────┐
│ [ Stranded 2 ] [ Landing today 3 ] [ Active 7 ] [ Archive ]    [+ New ▸] │ ← filter chips
├──────────────────────────┬──────────────────────────────────────────────┤
│ LIST (w-80)              │ DETAIL DRAWER                                │
│                          │                                              │
│ ● STRANDED  amber row    │  Nov cycle — mobile rebrand       [●stranded]│
│   Nov cycle · rebrand    │  completed 2/7 · started 4d ago              │
│   2/7 · 4d · 0 polecats  │  merge: mr · owner: florian                  │
│                          │  ─────────────────────────────────────────── │
│ ○ Landing today          │  ⚠ Stranded: ready work, no polecats.        │
│   v1.2 release cut       │     [ Sling all ready (5) ]  [ Unwatch ]     │
│   4/6 · 2h · 3 polecats  │                                              │
│                          │  Tracked beads ───────────────────────────── │
│ ○ Active                 │  ○ ss-3jt  Rebrand mobile/package.json       │
│   Phase B docs           │    READY · no assignee · 3 acceptance chks   │
│   12/18 · 1w · 5 polec.  │  ● ss-u72  Changeset config                  │
│                          │    WORKING · jasper 🟢 making progress       │
│ ○ Active                 │    timeline: edit → typecheck → pushed       │
│   p5-mail reply          │  ● ss-k9p  Update docs                       │
│   0/4 · 2h · 2 polec.    │    VALIDATING · obsidian · MR #e586          │
│                          │  ✓ ss-2ab  README hero copy                  │
│ ○ Active                 │    MERGED · 18m ago                          │
│   ...                    │                                              │
│                          │  Merge pipeline ──────────────────────────── │
│                          │  queued 1 · rebasing 0 · validating 1 · —→   │
│                          │                                              │
│                          │  Activity timeline ───────────────────────── │
│                          │  18m  ss-2ab merged                          │
│                          │  32m  ss-k9p pushed                          │
│                          │   2h  ss-u72 slung to jasper                 │
│                          │                                              │
└──────────────────────────┴──────────────────────────────────────────────┘

Stranded-convoy alert, collapsed form (list row only):

┌─────────────────────────────────────────────────────────────────┐
│ ⚠ STRANDED   Nov cycle — mobile rebrand                         │  ← full-row amber
│              2/7 · 4d since last activity · 0 polecats assigned │    treatment (not a
│              [ Sling ready (5) ]                                │    secondary badge)
└─────────────────────────────────────────────────────────────────┘
```

The stranded row is a **full-row amber treatment, not a corner chip**
(`cli-pain-inventory.md:196` — "A stranded convoy must be a full-row
amber alert, not a secondary badge").

## Component inventory

All primitives compose from shadcn/ui + Tailwind v4 tokens declared in
`DESIGN-SYSTEM.md`. Names below are generic UI nouns; current codebase
identifiers are deliberately avoided per PRINCIPLES v0.2 (d).

- **Surface header**: `text-title` label "Convoys", filter chip row, `+
  New` action. Filter chips use `Tabs` primitive with counts rendered in
  `text-meta`; active chip fills with `accent-brand`.
- **Convoy list** (left, width ≈ `space-80`): vertical `List` of
  `ConvoyRow` items. Each row = `Stack` { state chip, title, meta line
  (`text-meta`, `fg-muted`: `completed/total · relative-time ·
  polecat-count`) }. Stranded rows take the full-row amber treatment
  (`accent-warning`/15 background, `accent-warning` foreground icon and
  label per `DESIGN-SYSTEM.md:111` + §4).
- **State chip**: canonical `StateChip` primitive from `packages/ui`
  (`DESIGN-SYSTEM.md §4`). Convoy states are: `active`, `landing-today`,
  `stranded`, `landed`, `archived`. Only three colour treatments:
  `accent-info` (active / landing-today — work moving), `accent-warning`
  (stranded), `accent-success` (landed). `archived` uses `fg-muted` text
  only, no pill (mirrors the badge-drift fix in `DESIGN-SYSTEM.md:170-186`).
- **Convoy drawer** (right, flex-1): `Sheet` opened from list, anchored
  not routed. Contents top-to-bottom: `DrawerHeader` { title
  (`text-title`), chip strip (state, completed/total, started-relative,
  merge-strategy, owner) }, optional **Alert banner** for stranded
  convoys, **Tracked beads table**, **Merge pipeline strip**, **Activity
  timeline**.
- **Alert banner** (stranded only): `Callout` at `accent-warning`/10
  background, `text-body` copy, two `Button`s — primary `Sling ready (N)`
  (fills `accent-brand`) and secondary `Unwatch` (ghost).
- **Tracked beads table**: `List` of `BeadRow`. Columns: state chip,
  bead ID (`text-meta`, mono), title, assignee + forward-motion chip
  (sling-and-monitor `ug-02 §"Forward-motion chip"`). Clicking a row
  opens the **Bead drawer** (cross-surface object from
  `INFORMATION-ARCHITECTURE.md §4 Bead`). Fixes audit gap: "Tracked-issues
  table has no link-out to the bead" (`current-state-audit.md:200-202`).
- **Merge pipeline strip**: single-row horizontal `Stepper` showing
  counts per refinery stage — `queued · rebasing · validating · merged`.
  Active stages highlighted with `accent-info`; failed stages with
  `accent-danger`. Stage names cited from `cli-pain-inventory.md:208-211`.
- **Activity timeline**: list of one-line `TimelineRow` items
  (relative-time, verb, bead ID, optional inline error). Newest at top.
  Populated from the same event stream that feeds the sling-and-monitor
  per-bead timeline (`user-guides/02-sling-and-monitor.md:160-168`).
- **Row-scoped command palette**: `CommandMenu` overlay invoked via
  `Cmd-Shift-K` on the focused convoy row (`inspiration.md §2.2`).
  Actions: Sling ready, Watch / Unwatch, Land, Open owner's Mail,
  Stranded-only filter.
- **New convoy dialog**: in-panel `Dialog` (not a route) opened from
  `+ New`. Fields: name, merge strategy (`mr` / `direct` / `local`),
  `--owned` toggle, initial beads (multi-select). Confirm is
  `Enter`-accepting, focus-preserving per `inspiration.md §2.4`.

## Microcopy

Every visible string. Strings not in this catalog get improvised during
implementation — so this section is intentionally exhaustive.

- **Surface title**: `Convoys`
- **Filter chips**: `Stranded`, `Landing today`, `Active`, `Archive`
- **Primary action**: `+ New convoy`
- **List row meta format**: `{completed}/{total} · {relative-time} ·
  {N} polecat{s}`
- **Stranded state label**: `STRANDED` (small-caps `text-meta`, weight 500)
- **Active state label**: `ACTIVE`
- **Landed state label**: `LANDED`
- **Stranded alert banner**: `⚠ Stranded: ready work, no polecats
  assigned.` — subline (`text-body`, `fg-muted`): `Last activity
  {relative-time} ago. Sling to restart the convoy.`
- **Stranded primary button**: `Sling ready ({N})`
- **Stranded secondary button**: `Unwatch`
- **Drawer chip strip labels**: `completed {C}/{T}`, `started
  {relative-time} ago`, `merge: {strategy}`, `owner: {name}`
- **Tracked beads heading**: `Tracked beads`
- **Merge pipeline heading**: `Merge pipeline`
- **Activity timeline heading**: `Activity`
- **Merge pipeline empty**: `No MRs in flight.`
- **Activity timeline empty**: `No activity yet.`
- **Convoy empty (never had convoys)**: `Convoys group related beads
  for merge. Create one with + New or \`gt convoy create\`.`
  (`INFORMATION-ARCHITECTURE.md:335`)
- **Convoy empty (had convoys, none active)**: `No convoys landing
  today.` (`INFORMATION-ARCHITECTURE.md:334`, verbatim from inspiration
  §3.1 tone)
- **Error (Gas Town probe unreachable)**: `Failed to load convoys. Is
  Gas Town running?` (`current-state-audit.md:194-195`, preserved
  verbatim as the canonical error template per `DESIGN-SYSTEM.md:237-238`)
- **Retry affordance**: `Retry`
- **New-convoy dialog title**: `New convoy`
- **New-convoy fields**: `Name`, `Merge strategy`, `Track these beads
  (optional)`, `Watch owner: {current-user}`
- **New-convoy confirm**: `Create`
- **New-convoy cancel**: `Cancel`
- **Sling-ready toast (success)**: `Slung {N} bead{s} from {convoy}.`
- **Sling-ready toast (partial)**: `Slung {M}/{N} — {failed} needed
  manual preflight.`
- **Land-convoy confirm title**: `Land {convoy}?`
- **Land-convoy confirm body**: `This closes the convoy and archives
  its tracked beads. No undo.`
- **Land-convoy confirm primary**: `Land convoy`
- **Bead row merge-pipeline states** (appear in tracked-beads table):
  `READY`, `WORKING`, `PUSHED`, `QUEUED`, `REBASING`, `VALIDATING`,
  `MERGED`, `REJECTED` (`user-guides/02-sling-and-monitor.md:103-108`)
- **Rejected bead link-out**: `→ Rejection triage` (routes to
  `/rejection-triage?branch=...`, `user-guides/04-code-review-handoff.md`)

## Keyboard shortcuts

Pillar 2 ("direct manipulation — every common action needs a keystroke",
`PRINCIPLES.md §4 Pillar 2` and `cli-pain-inventory.md §3 Principles`).
Global shortcuts are case-insensitive; focus-scoped shortcuts act on the
currently focused row.

| Shortcut | Scope | Verb |
|----------|-------|------|
| `g c` | Global | Go to Convoys surface (`INFORMATION-ARCHITECTURE.md:160`) |
| `↑` / `↓` | List | Move focus between convoy rows |
| `Enter` | List row | Open convoy drawer |
| `Esc` | Drawer open | Close drawer, restore list focus |
| `s` | Drawer (stranded) | Sling all ready beads in the convoy |
| `w` | Drawer | Watch / Unwatch convoy (toggles) |
| `l` | Drawer | Land convoy (opens confirm dialog) |
| `n` | Surface | New convoy (opens dialog) |
| `/` | Surface | Focus filter-chip row / search |
| `1` `2` `3` `4` | Surface | Jump to filter chip Stranded / Landing today / Active / Archive |
| `Cmd-K` | Global overlay | Command bar (invokes from anywhere, incl. drawer) |
| `Cmd-Shift-K` | Focused convoy row | Row-scoped actions palette (`inspiration.md §2.2`) |
| `j` / `k` | Drawer tracked-beads | Move focus between tracked beads (vim parity) |
| `Enter` | Tracked-bead row | Open Bead drawer (stacked over convoy drawer) |

No shortcut steals from system or from the sibling Agents / Mail specs;
`g c` is the only namespace reservation. `Cmd-K` remains the single
global command-bar overlay per IA §5 rule 4.

## Live data behavior

Convoys state blends three distinct data planes and each has its own
cadence. All writes flow through server-side invalidation; clients
subscribe and render — no optimistic write on this surface (see §6).

- **Convoy list + detail (baseline poll)**: 10-second refetch, inherited
  from today's behavior (`current-state-audit.md:187-188`,
  `cli-pain-inventory.md:7`). This is the floor — it guarantees
  eventual consistency if the realtime channel drops.
- **Merge pipeline + bead state chips (realtime subscription)**:
  subscribe to the refinery event stream the P4 Dolt realtime
  infrastructure ships (`PRINCIPLES.md §5 Pillar 6`,
  `user-guides/02-sling-and-monitor.md:104-108` merge journey
  transitions). Transitions `working → pushed → queued → rebasing →
  validating → merged` render in-place without a poll round-trip.
- **Stranded detection (server-computed)**: a convoy is **stranded**
  iff (a) at least one tracked bead is `ready` with no assignee, (b)
  zero assigned polecats are in `working` state, and (c) no activity
  event in the last {stranded_threshold} seconds (seed: 900s = 15min,
  tuned in D-round). The server emits a `convoy:stranded` event that
  flips the row treatment; clients do NOT re-derive this per view
  (`user-guides/02-sling-and-monitor.md:161-163` — authoritative
  server-side computation, every appearance subscribes).
- **Optimistic updates**: **disallowed on this surface**. Convoy creation,
  landing, and sling-ready all wait for server ack before mutating the
  visible state. Rationale: a failed sling-ready that optimistically
  flipped the stranded chip would hide the alert the operator needs to
  see.
- **Stale handling**: if the realtime subscription drops, the 10s poll
  continues; a one-line amber banner at the top of the surface reads
  `Realtime paused — polling every 10s` (parallel to the
  `ug-02 §"CLI unresponsive"` probe-timeout banner). State chips gain a
  subtle `fg-muted` halo to indicate "possibly stale".
- **Empty vs. loading**: loading shows a subtle spinner (no skeleton
  rows — the list is short and flashing skeletons creates motion
  anxiety, `DESIGN-SYSTEM.md §5 Rules`). Empty resolves only after the
  first successful response; error is distinct from empty
  (`DESIGN-SYSTEM.md:236-238`).
- **Cross-surface invalidation**: `convoy:landed` invalidates Today
  triage stack (beads fall off the "landing today" group), Agents
  surface (assigned polecats may transition to zombie), and Mail
  (MERGED mails arrive as rows). All three appearances subscribe
  (`INFORMATION-ARCHITECTURE.md §4 Bead` state sync rule).

## Trade-offs and rejected alternatives

- **Kanban board vs list-plus-drawer.** Rejected kanban ("columns by
  state: queued / rebasing / validating / landed"). Kanban makes the
  merge pipeline legible but buries the **convoy as a unit**; the
  stranded alert would be a column badge, not a row — exactly the
  anti-pattern `cli-pain-inventory.md:196` names. List-plus-drawer
  keeps the convoy as the first-class noun and the merge pipeline as
  one strip inside the drawer.
- **Separate `/merge-queue` route vs embedding MQ in the convoy
  drawer.** Rejected the separate route. Every MR belongs to a convoy
  (or to an ad-hoc one-bead convoy). Showing the MQ outside its
  convoy context requires the operator to mentally re-join the two —
  the same bisection `journeys/02-sling-and-monitor.md:120-123`
  names. The merge pipeline strip inside the drawer is the unified
  view; a standalone MQ surface would be a duplicate of this and of
  the Rejection Triage surface.
- **Burn-down chart vs counts + activity timeline.** Rejected
  burn-down for v1 (`inspiration.md §1.5` proposes it). Burn-down
  requires start/target dates, which today's convoys don't carry
  (`current-state-audit.md:186-191` — no date fields). Adding dates is
  a schema migration we defer to C-phase. The activity timeline is
  the v1 shippable answer to "is this convoy moving?" and maps 1:1 to
  the event stream we already have.
- **Inline bead edit vs Bead drawer.** Rejected inline edit in the
  tracked-beads table. The Bead drawer is the cross-surface home
  (IA §4 Bead); inline edit would duplicate the drawer's fields and
  create a two-stack drift (same pathology as audit §1 TL;DR item 2).
  Tracked rows are read-only pointers; editing goes through the drawer.
- **Optimistic stranded clearing.** Rejected. If the operator clicks
  `Sling ready` and the sling fails partway, an optimistic clear of
  the stranded chip hides the alert the operator needs. Pay the
  round-trip.
- **Emoji in state chips.** Rejected per `DESIGN-SYSTEM.md:47`
  ("no icon-embedded emoji for structural state chips"). The
  forward-motion chip (🟢/🟡/🔴) in the tracked-beads table is the
  single exception — it lives on the bead row, not on the convoy
  state, and is covered by `user-guides/02-sling-and-monitor.md:159-163`.
- **Destructive `Nuke stranded convoy` action.** Rejected from v1. A
  stranded convoy is usually recoverable by slinging; destroying it
  discards history. `Unwatch` (removes it from the operator's
  stranded feed without closing it) covers the 80% case; explicit
  `gt convoy land` remains available via command bar for the 20%.

## Open questions for B5 review

1. **Stranded threshold default.** Seeded 900s (15min). Too tight —
   operator takes a 20-min coffee break and returns to an alert
   that isn't real? Too loose — steam engine stalled for 14 minutes
   before anyone notices? Calibrate from at least one week of
   production event data before locking.
2. **"Landing today" membership rule.** Today a convoy appears in the
   group iff `expected_land_date == today`. Convoys without dates
   never appear. Should an unscheduled convoy with ≥1 bead in
   `validating` auto-promote into "Landing today"? Risk: noisy;
   benefit: matches operator intent.
3. **Filter-chip persistence.** Should the active filter persist per
   user (sticky, via `inspiration.md §1.3` collapse-state rule) or
   reset to `Active` per session? Sticky wins for power users, resets
   win for discoverability on return.
4. **Row-scoped palette verb set.** The `Cmd-Shift-K` action list is
   seeded as: Sling ready / Watch / Unwatch / Land / Open owner's
   Mail / Stranded-only filter. Missing: Re-parent bead to another
   convoy, convert convoy to ad-hoc, split convoy. Are any of these
   day-one requirements, or C-phase follow-ups?
5. **Archive surface depth.** `Archive` chip shows landed convoys.
   Pagination? Time-bound default (e.g. last 30 days)? A full
   unfiltered archive is a perf concern at 100+ convoys; the
   `inspiration.md §6.5` auto-archive rule is the TTL hint.
6. **Merge-pipeline failure rendering.** When one MR in a convoy hits
   `REJECTED`, the pipeline strip shows it in `accent-danger`. But
   the link-out to Rejection Triage lives on the individual bead row,
   not on the strip. Should the strip itself carry a "Open N
   rejections in triage" link for the multi-reject case? Risk of
   duplication with the bead row; benefit of bulk navigation.
7. **Cross-rig convoys.** Today a convoy is scoped to one rig.
   Nothing prevents a spec convoy that tracks beads across rigs
   (e.g. Phase B docs across spectralSet + beads). Does v1 forbid
   this, warn about it, or allow it silently? The rig-breadcrumb
   rule (`cli-pain-inventory.md:206`) suggests forbidding at
   creation-time for now.
8. **Unwatch semantics.** Does `Unwatch` on a stranded convoy remove
   it from this operator's stranded feed only (per-user state) or
   mark the convoy as acknowledged across all operators? Per-user is
   safer; cross-user acknowledgment needs explicit `gt convoy
   stranded --ack` semantics we haven't designed.
