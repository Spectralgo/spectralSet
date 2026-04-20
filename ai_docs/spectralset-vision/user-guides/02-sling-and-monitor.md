---
phase: B2
doc_id: ug-02-sling-and-monitor
version: v0.1
owner: polecat/jasper
depends_on: [B0, B1]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/journeys/02-sling-and-monitor.md
  - ai_docs/spectralset-vision/inspiration.md
  - ai_docs/spectralset-vision/current-state-audit.md
required_sections_present: true
section_count_self_check: 6
overseer_review_requested: 2026-04-20
---

# User Guide 02 — Sling and Monitor

## Scenario

The core productive loop: "I have an idea, I want to turn it into work, hand it
to an agent, and check on it later." This is what the operator *wants* to be
doing. Every other journey is an interruption, so this one has to be fast and
frictionless (`journeys/02-sling-and-monitor.md` §"Journey 02").

Concrete trigger today: mid-morning, the operator notices a needed change
("we should rebrand `@superset/mobile` to `@spectralset/mobile`"), finds the
ready bead `ss-u72`, and wants to put it on a polecat and walk away. In the
current CLI world that is 8+ commands per dispatch, 4+ `gt peek` re-runs per
session, and a three-identifier memory tax (bead ID → random pet name → branch
name). The cockpit replaces all of that with: open bead, one click, glance
whenever.

## Step-by-step ideal flow

**Arrive at a ready bead.** Open SpectralSet. The Today view loads with a
triage stack at the top and a per-rig health strip below it. The operator
spots `ss-u72 — Rebrand followup` in the "ready to sling" group of the stack
and presses `Enter`. The Bead drawer slides in from the right. The Today list
stays visible on the left — the drawer does not navigate away, it anchors
(B1 IA §5 rule 2).

Alternative path, same outcome: the operator presses `Cmd-K` from anywhere,
types `ss-u72`, and the Command bar renders an inline bead preview card with
status, rig, labels, and a green "Sling" affordance. Pressing `Enter` opens
the same Bead drawer; pressing `Cmd-Enter` slings immediately without opening
the drawer.

**Read the preflight at a glance.** The top of the Bead drawer shows one
compact strip: **Rig: spectralSet · Status: ready · Acceptance: 3/3 · No
blockers · No polecat assigned.** Each item is a green check. The four
preflight invariants from the lessons doc (right rig, acceptance criteria
present, no blockers, no polecat already assigned) are a row of chips, not
a set of commands the operator runs in their head.

If any chip would be red, the "Sling to polecat" button below it is disabled
and carries the specific reason inline: "Bead is in the `hq-` namespace but
rig is `spectralSet` — recreate with `--rig spectralSet`." No lessons doc.
No five things to remember. The button itself tells the operator what to fix.

**Click Sling (or press `s`).** The button opens a compact in-panel confirm
— it does not leave the drawer. The confirm shows the target rig (pre-filled
from the bead), the merge strategy (pre-filled from convoy defaults — "mr"
for this bead), and an optional `--args` field that is collapsed unless
needed. Pressing `Enter` confirms. Pressing `Escape` cancels. Focus returns
to the Bead drawer (B1 IA §5 rule 3).

**See the sling resolve, immediately.** The confirm closes. The Bead drawer
header mutates in place: the title is now `ss-u72 — Rebrand followup →
jasper (started 2s ago)`. Underneath, a progress timeline appears. The
operator did not ever need to memorize the word "jasper" — it is shown
against the bead title, as a secondary identifier. The bead title remains
the hero; the polecat name is a footnote.

Simultaneously, a pinned row slides into the operator's active tray in the
sidebar: "ss-u72 · jasper · working." This tray auto-populates every
polecat the operator personally slung in this session. The operator never
has to run `gt polecat list` to recover a name — the sidebar keeps it.

**Watch without watching.** The progress timeline under the bead title
shows the last three tool calls as one-line rows with relative timestamps:

> `Edit packages/mobile/package.json · 14s ago`
> `Read .changeset/config.json · 22s ago`
> `Bash bun typecheck · 41s ago`

Next to the polecat name, a forward-motion chip reads 🟢 `making progress`.
The chip is computed server-side from event density: 🟢 if a tool call fired
in the last 60 seconds, 🟡 `thinking` if only LLM events for 60–180s, 🔴
`stalled` after 180s of silence. One glance answers the question the
operator actually has: "is this thing alive?" No `gt peek`. No 40 lines of
transcript to read.

The operator closes the drawer with `Escape` (the timeline keeps streaming
in the Today view's per-rig strip and in the sidebar tray row) and goes
back to work. When the impulse to check returns 10 minutes later, they
glance at the sidebar: chip is still green, last action "24s ago". They
do nothing.

**See the merge journey in the same card.** The progress timeline is not
only about LLM activity. When jasper finishes and pushes, the row
transitions, in place, through: `working → pushed → queued → rebasing →
validating → merged ✅`. Each transition is a new line at the top of the
timeline with a state chip. No separate merge-queue view is required to
know state. The operator can still open the Convoys surface to see the MR
in its queue context — but they don't have to, and they will usually not
bother.

**Let the push notification become the finish line.** When the state chip
flips to `merged`, a subtle toast appears: "ss-u72 merged (3m 12s)." A
sibling mail arrives in the operator's Mail inbox ("MERGED: ss-u72"), but
the toast and the sidebar chip are the primary signal. Mail is the
permanent record; the UI is the live one.

## What the operator sees

The surfaces and elements the operator touches, in order of appearance in
the flow above. Every element listed here lives on a surface named in
B1 IA §3.

- **Today surface — triage stack "ready to sling" group.** Pressing
  `Enter` on a ready bead opens the Bead drawer. The list stays visible
  behind it (B1 IA §5 rule 2 — "detail opens as a drawer, the list stays
  visible"). Triage stack lives on the Today surface, per B1 IA §3.

- **Command bar (Cmd-K overlay).** Typed `ss-u72` renders an inline bead
  preview card with status, rig, labels, and a one-action Sling affordance.
  Cmd-K is a surface you invoke, not a destination (PRINCIPLES §5 Surface
  set, D1). Rich inline preview means the result IS the answer to "what
  is ss-u72?" — navigation is optional.

- **Bead drawer (not a route — opens from Today, Convoys, Command bar, or
  any appearance).** Preflight chip strip across the top: rig, status,
  acceptance count, blockers, existing assignment. Below: description,
  labels, dependencies. Below that: the Sling affordance, which is either
  green with a keystroke, or disabled with an inline reason. Bead is a
  cross-surface object whose home is a drawer (B1 IA §4 Bead).

- **Sling confirm (in-panel, not modal).** Stays inside the Bead drawer.
  Pre-fills target rig and merge strategy from the bead and convoy
  defaults. `Enter` confirms, `Escape` cancels, focus returns.

- **Bead drawer header (post-sling state).** Title line mutates to include
  the polecat name and "started <relative time> ago." State chip for the
  polecat sits next to the polecat name. Progress timeline below it shows
  the last three tool calls, streaming.

- **Sidebar active tray.** A new pinned row appears for this polecat as
  soon as the sling lands. Row shows: bead title (hero), polecat name
  (secondary), state chip. Sidebar active tray is part of the user-
  customizable sections group in B1 IA §2.

- **Per-rig health strip on Today.** The rig's strip updates in the
  background: jasper's card flips from "available" to "working ss-u72".
  Operator does not need to be on Today to see it — but when they return
  there, it is already right.

- **Forward-motion chip (🟢 / 🟡 / 🔴).** Attached to every polecat row
  everywhere the polecat appears (sidebar tray, Agents grid, Bead drawer
  header). Computed once server-side; every appearance subscribes
  (PRINCIPLES §4 Pillar 6, "state chip is authoritative, not re-derived
  per view").

- **Timeline state-chip transitions.** `working → pushed → queued →
  rebasing → validating → merged`. Each transition prepends a new row to
  the timeline with its own chip. Also visible on the Convoys surface
  if the operator opens the convoy this bead belongs to.

- **Toast on merge.** One line, bottom right, dismisses on click or
  after 8s. Not a modal. Not a mail popup. A visual comma, not a period.

## Failure modes

Each row below pairs a real-world failure with the graceful fallback the
cockpit shows. Failure is never a dead view.

- **Preflight fails (wrong rig).** "Sling" button is disabled. The chip
  strip shows rig as red with the specific mismatch: "Bead is in `hq-`,
  rig is `spectralSet`." Hovering the chip expands a one-line remedy:
  "Recreate the bead with `--rig spectralSet` or move it via
  `bd reparent`." No silent disable. No lessons-doc excavation.

- **Acceptance criteria missing.** Chip strip shows "Acceptance: 0/0"
  in amber. Disabled Sling button carries the reason: "No acceptance
  criteria. Add checkboxes to the description before slinging." Clicking
  the chip opens the description block in edit mode.

- **Polecat already on the bead.** Chip strip shows "Assigned: jasper"
  in amber. Sling button is replaced by a "Reassign…" affordance that
  opens the Polecat drawer for jasper, so the operator can peek or nuke
  before reassigning. No hidden state — the assignment is visible where
  the sling action would be.

- **No polecats available in the rig.** "Sling" button is live, but the
  inline confirm shows "No polecats idle in `spectralSet` — one will be
  spawned." The confirm still completes; sandbox provisioning is a
  progress step on the timeline, not a failure.

- **Polecat stalled mid-work.** Forward-motion chip flips to 🟡
  `thinking` after 60s of no tool calls, 🔴 `stalled` after 180s.
  The stalled row carries a row-scoped action — the operator presses
  `Cmd-Shift-K` on the row to open quick actions (Peek / Nudge /
  Check-recovery / Nuke). This is the Agents surface's per-state action
  set (B1 IA §3 Agents, citing Journey 05).

- **Push failed (network, auth).** Timeline shows `working → push failed`
  with the error text inline as a one-line expandable row. A retry
  affordance is attached to that row. No mail dive required to find the
  error.

- **Merge rejected by the refinery.** State chip flips to `rejected`.
  The row gets a link-out to the Rejection Triage surface, pre-filtered
  to this branch, with the root-cause chip already assigned
  (stale-imports / test-regression / lint / rebase-conflict /
  build-error). The Rejection Triage surface is a first-class
  destination — not a mail row indistinguishable from routine merges
  (B1 IA §3 Rejection Triage, citing Journey 04).

- **Data cannot load (Gas Town not running).** Per the audit's
  established template, the Today surface and the Bead drawer show
  "Failed to reach Gas Town. Is `gt status --json` responding?" with a
  "Retry" affordance. The sidebar active tray degrades to showing the
  last-known state with a muted clock icon. The cockpit never shows a
  blank white panel (B1 IA §6 Empty-states map: "error is not empty").

- **CLI unresponsive (probe times out).** The probe call `gt status
  --json` is the auto-detection primitive (PRINCIPLES glossary: Probe;
  `cli-pain-inventory §2` row 20). If it does not answer within its
  budget, the cockpit shows a one-line amber banner at the top of the
  window: "Gas Town probe slow — data may be stale." Interactions still
  work locally; writes queue for retry.

- **Session dies, state survives.** Polecat sessions can be killed.
  When they are, the forward-motion chip flips to 🔴 `stalled` and the
  sidebar tray row shows "session exited · work preserved on branch."
  The operator is one click away from re-slinging the same bead onto
  a fresh polecat via the Bead drawer's "Reassign…" affordance.

## Today vs tomorrow

| Step | Today (CLI) | Tomorrow (cockpit) |
|---|---|---|
| Confirm bead is ready to sling | `bd show ss-u72` · eyes scan 30+ lines for rig + acceptance + blockers · cross-reference 5 lessons | Open Bead drawer · preflight chip strip answers all four invariants at a glance |
| Check no polecat is already on it | `gt polecat list spectralSet 2>&1 \| head -20` · scan for the bead ID | Same drawer: "Assigned: —" chip is green |
| Sling the bead | `gt sling ss-u72 spectralSet` · parse "Slung: ss-u72 to spectralSet/quartz" · memorize "quartz" | Click "Sling" or press `s` · bead drawer mutates with the polecat name; sidebar tray auto-pins |
| Check progress once | `gt peek spectralSet/quartz 2>&1 \| tail -40` · read transcript · infer state | Glance at the chip: 🟢 `making progress`. Timeline shows last 3 tool calls |
| Check progress again (10 min later) | Forgot "quartz" → re-run `gt polecat list` → re-run `gt peek` | Glance at sidebar tray. Same row, same chip, same bead title |
| Learn polecat is done | `gt mail inbox` → `gt mail read hq-wisp-xxxxx` → parse "Branch pushed" line | Timeline chip flips to `pushed`; no mail read required |
| Watch the merge queue | `gt mq list spectralSet` · empty → reload · empty → reload · finally one entry → `gt mq status <id>` | Same timeline row transitions `pushed → queued → rebasing → validating` automatically |
| Learn the MR merged | Wait for another mail: `gt mail inbox` → read MERGED | Chip flips to `merged ✅` · one-line toast · mail arrives but is a record, not the signal |
| **Command count** | **8+ CLI invocations per dispatch** (`journeys/02-sling-and-monitor.md:166` — "8+ commands per dispatch, 4+ polecat-name re-lookups") | **1 click or 1 keystroke** to sling; **0** to monitor |
| **Re-lookup tax per session** | 4+ `gt peek` cycles, each preceded by `gt polecat list` to recover names | **0** — sidebar tray remembers every polecat the operator slung |
| **Mental joins** | Alternate `gt peek` (live transcript) and `gt mail inbox` (push/merge state) — half the story in each | **1 timeline** — LLM activity, push, queue, merge all on one row |

The quantified win, in the journey doc's own terms
(`journeys/02-sling-and-monitor.md:166-168`): kill the "8+ commands per
dispatch, 4+ polecat-name re-lookups per session, mental joins between
`gt peek` and `gt mail` to follow one bead." Replace with: open bead →
click sling → glance at timeline strip whenever you want.

## Inspiration patterns used

- **`inspiration.md §1.1` — Cmd-K command palette with verb-object
  phrasing.** The Command bar is the entry for operators who already know
  the bead ID. Typed `ss-u72` resolves to a preview card; typed `sling
  <bead>` prompts for target; typed `peek jasper` shows a mini PolecatPeek
  inline. The palette is invokable from any surface, including from inside
  the Bead drawer itself. Reinforced by `§2.1` (Raycast omnibox — typed
  results across bead / polecat / mail) and `§5.5` (Cron — command bar as
  *the* navigation model, not a power feature). PRINCIPLES Surface D1
  codifies the Command bar as a surface you invoke, not a destination.

- **`inspiration.md §2.2` — Quick actions on the focused row.**
  `Cmd-Shift-K` on a polecat row opens a row-scoped palette of actions:
  peek, nudge, check-recovery, nuke, re-sling. Replaces the right-click
  scatter and the kebab menu drift. This is the pattern that turns a
  stalled-polecat row into a solvable problem without leaving the
  timeline.

- **`inspiration.md §2.3` — Inline results render rich, not text-only.**
  `ss-u72` in the Command bar does not produce a link; it produces the
  bead card itself, with the Sling affordance already on it. 70% of
  queries end in the bar without navigation.

- **`inspiration.md §2.4` — Confirmation modals that don't steal focus.**
  The Sling confirm is an in-panel compact prompt inside the Bead drawer,
  not a system dialog. `Enter` confirms, `Escape` cancels, focus returns
  to the drawer. Generalized: "never leave the current panel."

- **`inspiration.md §3.1` — Empty states that read like haiku.** When the
  sidebar active tray has no polecats, it reads "No active polecats. Sling
  one from a bead." One sentence, no CTA cluster. When a polecat finishes
  and its row archives off the tray (see §6.5 below), the empty tray
  returns to the same line.

- **`inspiration.md §3.4` — Today as the only view that matters in the
  morning.** The flow starts on Today because that is where the operator
  lands by default. The triage stack and per-rig health strip mean the
  operator arrives at a ready bead without typing (`PRINCIPLES §5`
  Today surface).

- **`inspiration.md §4.1` — Unread-vs-mention badge split.** The sidebar
  Mail row carries a dot for routine merge mails and a red numeric badge
  for escalations or pinned mail. The MERGED mail the Refinery sends
  when `ss-u72` lands is a dot, because the timeline already told the
  operator — mail is confirmation, not interrupt.

- **`inspiration.md §4.3` — Thread expansion as an in-place drawer.** The
  Bead drawer opens to the right of the Today list without a route
  change. The Polecat drawer opens to the right of the Agents grid the
  same way. The operator never loses the surrounding context when diving
  into a sub-object.

- **`inspiration.md §4.5` — Presence indicators with "active / away /
  dnd" states.** The forward-motion chip (🟢 `making progress` / 🟡
  `thinking` / 🔴 `stalled`) is the presence dot for polecats, computed
  passively from event density. The operator never has to update it
  manually — and they never have to run `gt peek` to infer it from
  transcript.

- **`inspiration.md §5.2` — Inline detail on click (not navigation).**
  Clicking a row in the sidebar active tray opens the Bead drawer
  anchored to the row, not a new route. Clicking the polecat name opens
  the Polecat drawer. Browser back never runs.

- **`inspiration.md §6.5` — Automatic tab archiving after a TTL.** The
  sidebar active tray auto-archives polecat rows after the bead merges
  and N minutes pass (default 30m). The operator never has to "close
  jasper's tab"; it falls off the tray and into a searchable archive
  they almost never open.

- **`inspiration.md §1.4` — Inline notification design with
  mute-per-thread.** The MERGED mail that arrives at the end of the
  journey is an inline card in the Mail surface, not a modal toast tree.
  If the operator mutes the thread on `ss-u72`, the toast on merge is
  suppressed but the timeline chip still flips — state is separate from
  notification.
