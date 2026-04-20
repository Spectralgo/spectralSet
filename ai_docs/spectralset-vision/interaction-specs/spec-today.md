---
phase: B3
doc_id: spec-today
version: v0.1
owner: polecat/amber
depends_on: [B0, B1, B4, B2-ug-01-morning-routine]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/user-guides/01-morning-routine.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#3.4
  - ai_docs/spectralset-vision/inspiration.md#3.1
  - ai_docs/spectralset-vision/inspiration.md#1.3
  - ai_docs/spectralset-vision/inspiration.md#1.4
  - ai_docs/spectralset-vision/inspiration.md#4.1
  - ai_docs/spectralset-vision/inspiration.md#4.5
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

# B3 Interaction Spec — Today

Route: `/today`. Default landing before noon (`INFORMATION-ARCHITECTURE.md:112-122`).
Answers a single question: **what needs me right now?** Operationalizes the
"morning routine" user guide (`user-guides/01-morning-routine.md:26-42`) and the
Things-3-style "Today is the only view that matters in the morning" pattern
(`inspiration.md:151-157`). This spec freezes the structure, copy, keystrokes,
and live-data contract for the surface; everything else in Today is pushed to
drawers that Today does not own.

## 1. Wireframe

Structural sketch only — not a design comp. Fixed at three rows plus the
verdict tail; the triage stack and mail pile collapse when empty.

```
┌─ Sidebar (persistent, from B1 §2) ─┬─ Today  (`/today`)  · Last verified 14s ago ──────────────┐
│ ● Today                   12       │                                                            │
│ ● Incidents                1       │  Since 11:04pm                                             │
│ ● Rejection Triage         0       │  12 merged · 3 awaiting review · 1 escalation acked · 8 alive
│ ▸ Mail                     4       │  ─────────────────────────────────────────────────────────  │
│   mayor/                          │                                                            │
│   spectralSet/witness             │   Triage                             (3)   [ Collapse ]    │
│   spectralSet/refinery            │   ┌──────────────────────────────────────────────────────┐ │
│ ▾ Pinned                          │   │ ● HIGH  Dolt server degraded — ack required          │ │
│   convoy: training-mode           │   │ source: spectralSet/witness · 4m ago                 │ │
│                                   │   │              [ Ack (A) ]  [ Open (O) ]  [ Snooze (S) ] │ │
│                                   │   └──────────────────────────────────────────────────────┘ │
│                                   │   ┌──────────────────────────────────────────────────────┐ │
│                                   │   │ ◆ REJECT  ss-7mt — build passed locally, refinery red │ │
│                                   │   │ rig: spectralSet · polecat: jasper · 12m ago         │ │
│                                   │   └──────────────────────────────────────────────────────┘ │
│                                   │   ┌──────────────────────────────────────────────────────┐ │
│                                   │   │ ✉ PINNED  mayor → you · "Review the Phase-B bundle"  │ │
│                                   │   │ 38m ago                                              │ │
│                                   │   └──────────────────────────────────────────────────────┘ │
│                                   │                                                            │
│                                   │   Rigs                                                     │
│                                   │   ● spectralSet  stalled polecat 3h · 0 ready work         │
│                                   │   ● gmux         4 P0 ready · refinery idle                │
│                                   │   ● hq           all quiet                                 │
│                                   │                                                            │
│                                   │   Mail — 12 unprocessed                          [ Expand ]│
│                                   │                                                            │
│                                   │   ─────────────────────────────────────────────────────── │
│                                   │   Everything is fine. Last verified 14 seconds ago.        │
└────────────────────────────────────┴────────────────────────────────────────────────────────────┘
```

Regions top-to-bottom: **Masthead** (breadcrumb + since-you-slept line),
**Triage stack** (escalations + rejections + pinned mail), **Rigs strip**
(one typographic row per rig), **Mail pile** (collapsed row of unprocessed
mail), **Verdict tail** (one prose line). All five regions are always in this
order; empty regions collapse to a single muted line (see §3) rather than
disappearing, so the operator's eye learns one geometry.

Sidebar is inherited from `INFORMATION-ARCHITECTURE.md:68-104` and is NOT
owned by this spec. Drawers (bead, polecat, thread, incident, rejection) open
over Today and are spec'd elsewhere; Today's job is to launch them, not to
render them.

## 2. Component inventory

Generic UI primitives only. Every token cited below is from
`DESIGN-SYSTEM.md` §1–6. No arbitrary pixel values, no raw hex, no ad-hoc
color.

| Region | Primitives | Tokens |
|---|---|---|
| Masthead breadcrumb | Text · Timestamp | `text-title` (breadcrumb), `text-meta fg-muted` (last-verified) |
| Since-you-slept line | Inline Link chips (4) inside a single line of body text | `text-body fg-default`; each metric is a button-shaped hit target with underline on hover (`dur-instant`) |
| Triage card (escalation) | Card · Severity Badge · Title · Meta · three inline Buttons (A/O/S) | `bg-raised`, `space-3` inner, `space-2` between cards; severity = `accent-danger` per §4; buttons `text-meta`, `space-1` inner |
| Triage card (rejection) | Card · Cause Chip · Title · Meta · Buttons (A/O/S) | cause chip = `accent-warning @ 20% / accent-warning`; same card geometry as above |
| Triage card (pinned mail) | Card · Envelope glyph · Subject · Meta · Buttons (A/O/S) | `bg-raised`, envelope glyph in `fg-muted` |
| Rigs strip row | Presence Dot · Rig Name (Text) · Reason (Text) | dot color = §4 Polecat state chip palette (working=info, stalled=warning, zombie=danger); name `text-body fg-default`, reason `text-body fg-muted`. No box. `space-3` row height, `space-2` gap. |
| Mail pile | Collapsible Row · Count · Expand affordance → on expand, a List of muted Meta rows | `text-body`, chevron rotates `dur-fast`. |
| Verdict tail | Prose Text | `text-subtitle fg-default`, centered, `space-12` top, `space-8` bottom. |
| Stale-cache chip | Badge | `accent-warning @ 15% / accent-warning`, `text-meta`. |
| Reconnecting bar | Thin horizontal Bar at window bottom, never a modal | `bg-inset`, `text-meta fg-muted`, height `space-1`. |

Shared primitives live in `packages/ui` (generic: Card, Badge, Button,
PresenceDot, Drawer). Each Today triage card is a single Card primitive with
severity slot and action slot — Today does not invent a new component; it
composes. The "since you slept" line is plain body text with four hit-target
spans — not four separate buttons, not a toolbar.

Inherited from B4: empty-state shape (`DESIGN-SYSTEM.md:199-218`), state
chip palette (`§4`), type ramp (`§1`), spacing scale (`§2`), motion tokens
(`§6`). Today does NOT define new tokens; any request to add one is an
anti-pattern per `PRINCIPLES.md:63-69` (Pillar 3 founder-scale).

## 3. Microcopy

Every string the user reads on Today, catalogued. If a string does not appear
here, the implementer must add it to this spec — no improvisation.

### Masthead

- Breadcrumb: `Today`
- Last-verified, fresh: `Last verified <relative>` where `<relative>` is
  "just now" if ≤5s, `"<N>s ago"` ≤59s, `"<N>m ago"` ≤59m, `"<N>h ago"` otherwise.
- Last-verified, stale: `Stale since <absolute time>` (absolute, not relative,
  so the operator knows how far behind reality they are).
- Since-you-slept, populated: `Since <time>: <N> merged · <N> awaiting review · <N> escalations acked · <N> polecats alive`.
  `<time>` is the user's last app-foreground event, formatted `"11:04pm"`.
- Since-you-slept, zero-overnight: `Since <time>: nothing landed. All agents held.`
- Since-you-slept, first launch: `Welcome back. Fetching overnight…` (replaced the instant data resolves).

### Triage cards

- Severity labels (left): `HIGH`, `CRITICAL`, `REJECT`, `PINNED`. No others.
- Action buttons: `Ack`, `Open`, `Snooze`. Exactly those verbs.
- Snooze confirm (toast, `dur-fast`): `Snoozed until <time>.`
- Ack confirm (inline, replaces card content, stays visible): `Acked · <time> · Undo`
- Undo window: 6 seconds; after that the card collapses into the acked pile.

### Rigs strip reasons (templated)

- Healthy: `all quiet`
- Stalled polecat: `stalled polecat <duration> · <N> ready work`
- Ready queue: `<N> P0 ready · refinery <idle|flowing|blocked>`
- Zombie: `<N> zombie · needs ack`
- Offline: `unreachable · last seen <relative>`

### Mail pile

- Collapsed: `Mail — <N> unprocessed`, `Expand`.
- Expanded: per-row template `<sender> · <subject> · <relative>`.
- Bulk actions: `Bulk archive`, `Mark all read`. No "Select all" checkbox —
  the two actions are distinct intentions (audit §2 Mail: Mark-read and
  Archive are different verbs and must not share a button).
- Post-bulk confirm (toast): `Archived <N>. · Undo`

### Verdict tail (mutually exclusive)

- All green: `Everything is fine. Last verified <relative>.`
- Amber-with-plan (every amber has a snooze or owner): `All attended. Next check <time>.`
- Red (any unacked HIGH/CRITICAL): the verdict tail does not render; the
  triage stack is the tail.

### Empty states (per B4 template)

- Today-all-clear (no stack, no amber rigs, inbox clear): `All polecats self-sufficient. Nothing needs you right now.` (haiku, centered, `text-subtitle fg-default`). Subline (`text-body fg-muted`): `Last incident resolved <relative>.`
- Mail pile empty: row disappears — not an empty state.
- Rigs strip empty: `No rigs configured. Run <code>gt init</code> in a project directory.` (single action hint, per B4 rule.)

### Errors (not empty — accent-danger per B4 §5)

- Gas Town unreachable: `Can't reach Gas Town. Start the daemon or run the CLI fallback.` + single Button `Open terminal at <code>gt start</code>`.
- Dolt degraded: reuses the HIGH escalation card shape; body reads `Dolt server unreachable. Ack to acknowledge.` Ack suppresses repeat pings for 10 minutes; it does NOT hide the card.
- Probe mismatch: `Gas Town detected at <path>, no rigs found. Is this the right town?` + Button `Reselect town`.

## 4. Keyboard shortcuts

Every frequent verb has a keystroke (`PRINCIPLES.md:63` Pillar 4 — one-click
everything daily; `inspiration.md:43-49` Linear §1.2 one-letter cycle).

| Keys | Verb | Context |
|---|---|---|
| `g t` | Go to Today | From any surface; double-press within 500ms (Linear-style) |
| `Cmd-K` | Open Command bar | Overlay; restores focus to Today on dismiss |
| `Cmd-Shift-K` | Row-scoped Command bar | Fires on focused triage card or rig row (Raycast §2.2) |
| `j` / `k` | Move focus down / up inside the triage stack | Same mapping used by Mail and Agents |
| `A` | Ack the focused triage card | Collapses card, advances focus to next |
| `O` | Open the focused triage card's detail drawer | Drawer type depends on card (incident / rejection / thread) |
| `S` | Snooze the focused triage card | Prompts for duration: `15m / 1h / until 09:00 / custom`. Enter confirms `15m`. |
| `U` | Undo last Ack or Snooze | Works within the 6s undo window |
| `E` | Expand/collapse the Mail pile | Toggle |
| `X` | Bulk-archive everything in the expanded Mail pile | Requires the pile to be expanded; confirm toast + Undo |
| `R` | Mark all expanded-pile mail as read | Distinct from `X` (bulk-archive) by design |
| `?` | Open shortcut cheatsheet | Overlay; dismiss on any key |
| `Esc` | Close drawer / overlay / collapse undo banner | Standard |

Focus model: Today mounts with focus on the first unacked triage card if
any, otherwise on the first amber rig row, otherwise on the verdict tail
(which is not actionable — focus-trap parks there so `?` still works). No
modal dialog ever steals focus from the triage card (inspiration §2.4
"confirmation modals that don't steal focus"); Ack / Snooze use inline
transitions, not dialogs.

## 5. Live data behavior

Today is a view of live objects, not a polled report (`PRINCIPLES.md:57`
Pillar 1 — real-time omnipresence). Three contracts govern its data.

**Masthead "since you slept" line.** Computed once on mount from
`gt status --json` + the user's last foreground timestamp (stored in
`local-db`). It recomputes only on app-foreground transition (laptop lid
open, tab activation) — not on every stream tick. Refresh of the four
metrics inside the line happens via the same Dolt subscription that feeds
the triage stack; metrics re-render in place with a `dur-fast` crossfade.

**Triage stack.** Subscribes to three streams, merged and sorted by severity
then age:

1. Open incidents from the Incidents surface query (same source as `/incidents`).
2. Rejections from the Rejection Triage surface query (same source as `/rejection-triage`).
3. Pinned mail from the current user's inbox query (pinned = `--pinned` at send).

Realtime is provided by Dolt's `HASHOF_DB` polling (0.14ms on local,
`PRINCIPLES.md:57`). Client polls the hash at 500ms; on change, the exact
invalidation query refetches — no blanket re-render. This is push-feeling
without websockets and matches what Phase P4 shipped.

**Rigs strip.** Subscribes to `gt status --json` at 5s intervals for the
rig list + coarse health; per-rig reason strings are derived from the
triage stack + the polecat-state query (same source as `/agents`). Reasons
recompute when either upstream invalidates. Strip never shows a loading
spinner after first paint — stale data gets the amber stale chip (§3), not
a skeleton.

**Optimistic writes.**

- Ack: marks the card acked locally before the server round-trips. If the
  server rejects (403, conflict), the card restores with an inline
  `Ack failed — retry` button; no blocking modal.
- Snooze: same optimistic shape. Local-db stores the snooze so the card
  stays suppressed even if the stream ticks before the server persists.
- Bulk archive / Mark-read: writes fan out one-by-one in background; the UI
  shows the collapsed state immediately and a toast "`Archived <N>`" once
  the batch settles. A partial failure renders the failed rows back in
  place with a muted `retry` affordance; the rest stay archived.

**Stale and degraded fallbacks** (all per
`user-guides/01-morning-routine.md:62-71` failure modes):

- Stream tick absent > 2s: stale chip appears on the masthead; data continues
  to render from last snapshot.
- Stream tick absent > 10s: thin reconnecting bar appears at window bottom
  (`bg-inset`, height `space-1`); verdict tail freezes its timestamp.
- Gas Town unreachable at cold-start: skeleton paints, then the error
  treatment from §3 replaces the masthead; the rest of Today renders from
  the local-db cache with a per-region stale chip.
- Dolt hung: triage stack degrades to last cache, an auto-generated HIGH
  incident card is injected at the top with body "Dolt server unreachable",
  and the Incidents surface takes over as loudest element (same card
  elsewhere — `PRINCIPLES.md:85`). Ack suppresses repeat injection for 10
  minutes; it does NOT hide the card.

**Mute-per-thread** (`inspiration.md:59-65`): every card has a
`Mute this source` affordance in the row-scoped Command bar (`Cmd-Shift-K`
→ `Mute`). Muted sources skip the triage stack for the rest of the day;
they reappear tomorrow, or sooner if the user unmutes from the Incidents
detail drawer. Mute state is per-user, per-day, stored in `local-db`.

## 6. Trade-offs and rejected alternatives

The compressions and omissions below are deliberate; future reviewers who
want to restore them should read this section first.

**Rejected: "Get started" CTA cluster in the empty state.** B4 §5 makes the
haiku treatment doctrinal (`DESIGN-SYSTEM.md:191-240`). Empty is a good
state. Adding a CTA cluster to "nudge the operator to create work" would
rhyme with the "surface polish hiding broken core flows" anti-pattern
(`PRINCIPLES.md:95`).

**Rejected: per-triage-card inline expand (thread/diff in place).** The
card carries three actions and nothing else; Open slides a drawer. Inline
expand tempts to render the full diff on every rejection card and balloons
the triage stack height beyond one screen (violating Pillar 3 information
density). Drawers preserve density AND context (`INFORMATION-ARCHITECTURE.md:274-290`).

**Rejected: "morning" vs "afternoon" vs "evening" flavors of Today.** The
B2 guide grounds Today as "what needs me right now" independent of hour;
auto-selection-before-noon is a default, not a mode. Time-of-day branching
would bloat the spec and the empty-state catalog and would violate the
"one canonical treatment per surface" rule from B1 §6.

**Rejected: badges showing per-rig commit counts inline.** Counts tempt
"velocity over quality" (`PRINCIPLES.md:94`). The rigs strip shows reasons
("stalled polecat 3h"), not metrics; the since-you-slept line is where
counts live, and only for the overnight window.

**Rejected: drag-to-reorder on triage cards.** Severity + age is the sort,
and the sort is computed, not user-maintained. User-reordering a triage
stack is how the operator starts missing a CRITICAL behind a preferred
PINNED mail. If the operator wants a custom stack, that is the sidebar
Pinned section's job (B1 §2).

**Rejected: live sparkline on each rig row.** Evaluated against the
decision rubric (`PRINCIPLES.md:117-132` worked example) — rejected for the
same reasons: hurts density, does not answer "needs me". Keep the rig row
a single typographic line.

**Chose:** five fixed regions in fixed order, over a user-configurable
dashboard grid. Dashboard grids violate Pillar 7 (Things-3 calm) and drift
per-user into unmaintainable noise. Today is opinionated — it is the
cockpit default, not a canvas.

**Chose:** A/O/S letters over dropdown menus on triage cards. Anchored to
`inspiration.md:43-49` (Linear one-letter cycle) and the B2 guide's 90-second
walk-through. Dropdowns are a hover+click+click path; letters are one key.

**Chose:** mute-per-source over mark-dismissed. Dismissing a HIGH escalation
hides it permanently; muting suppresses only for today. The operator wakes
up tomorrow to the same state the system is actually in, not to a silence
they configured and forgot.

## 7. Open questions for B5 review

Genuine unresolveds, not rhetorical questions.

1. **Should the since-you-slept line persist after the first morning view?**
   Current spec recomputes on foreground transitions only, so a continuous
   all-day session keeps showing the 11:04pm anchor until tomorrow. Alternative:
   a rolling "since last Today view" timestamp. Reviewer call: is the stable
   anchor (current spec) calmer, or does it go stale enough by 4pm to read
   as a bug?

2. **Is A/O/S the right letter assignment?** Things 3 uses `T` for Today
   assignment; Linear uses `C` for cycle. `A/O/S` = Ack/Open/Snooze is
   mnemonic but conflicts with future `A`=Assign or `S`=Sling shortcuts if
   we add them. Reviewer call: lock these letters here, or reserve
   top-letter keys for surface-spanning verbs?

3. **How much of the triage stack height is the implicit budget?** The spec
   shows three cards; in reality a bad morning could produce 8+. Rules:
   (a) stack is not scrollable — if it exceeds the visible height, the
   verdict tail is replaced by a `+<N> more — open Incidents` link; (b) the
   Incidents surface becomes the scrolling list. Reviewer call: is that the
   right overflow behavior, or should the stack itself scroll?

4. **Should the mail pile Expand preserve scroll across sessions?** B1 §2
   custom-section rule says collapse state persists per view. The pile is
   fixed at the bottom of Today, not a custom section; re-applying that
   rule means the pile remembers "expanded = yes" from yesterday and
   greets the operator with an expanded pile first thing. That may violate
   Pillar 7 calm. Reviewer call: reset nightly, or persist?

5. **Does the "go drink coffee" verdict deserve a finer-grained taxonomy?**
   Current states: all-green / amber-with-plan / red-suppressed. A reviewer
   may want a middle state for "amber-without-plan" (e.g., stalled polecat
   with no owner identified yet). Current spec folds that into the triage
   stack as a stalled-polecat escalation; a reviewer may prefer an explicit
   verdict line variant.

6. **Is the stale chip threshold (2s) too eager for weak networks?** A
   travelling operator on hotel wifi may see the chip pulse constantly.
   Alternative: progressive thresholds (subtle at 2s, chip at 5s, bar at
   10s). Reviewer call: tune now or measure in Phase D?

7. **The rigs strip shows all rigs, always, unfiltered.** At 10+ rigs this
   is a full vertical page on its own. Alternatives: (a) only-rigs-with-
   reason (empty = "all quiet across town"); (b) user-selectable rigs with
   the unselected collapsed into "+5 more quiet". Current spec is (b)
   implicit but not written; reviewer call: explicit (a) or explicit (b)?

8. **Should the first-launch "Welcome back. Fetching overnight…" string
   appear every cold-start, or only after a >6h gap?** Current spec fires
   it on every cold-start. A reviewer may find that chatty. Gap-threshold
   alternative needs a measurement to pick the right gap.
