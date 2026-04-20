---
phase: B2
doc_id: ug-03-incident-response
version: v0.1
owner: polecat/obsidian
depends_on: [B0, B1]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/journeys/03-incident-response.md
  - ai_docs/spectralset-vision/inspiration.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/cli-pain-inventory.md
required_sections_present: true
section_count_self_check: 6
overseer_review_requested: 2026-04-20
---

# User Guide 03 — Incident Response

> Tutorial for the future-state Incidents surface + evidence bundles.
> The operator is woken at 5am by an escalation. They have 30 seconds to
> figure out whether to act. This guide walks them through what they will
> see, touch, and click.

## Scenario

A Witness fires an escalation. Maybe Dolt is down. Maybe a polecat is
corrupted. Maybe the refinery is wedged. The operator has 30 seconds to
figure out what is broken, decide whether to act, and either fix it or
punt.

It is 02:14. A `[HIGH] Dolt: server found stopped during refinery patrol`
escalation has just fired from the Witness. The operator is at the laptop
five minutes later. They have not opened a terminal.

## Step-by-step ideal flow

**1. A red banner is already the loudest thing on screen.**

The operator opens SpectralSet. Before the Today view even finishes its
stagger-in, a red banner pins itself to the top of the window:
`1 open incident — Dolt: server found stopped during refinery patrol`.
The banner count is visible from peripheral vision. The sidebar's
**Incidents** row (fixed group, slot 2) shows a red `1` badge. Every
other surface in the sidebar looks calm by comparison — that is the
point.

**2. One keystroke opens Incidents.**

The operator presses `g i`. (Or clicks the red banner. Or presses
`Cmd-K` and types `inc`.) The Incidents surface loads, sorted by
severity then age. At the top: one card, severity chip `HIGH`, title
`Dolt: server found stopped during refinery patrol`, reported
`9 minutes ago` by `spectralSet/refinery`. The card is already telling
them what happened.

**3. The card shows reported-vs-now side by side.**

Below the title, two status rows sit next to each other:

```
Reported at 02:14   ●  Dolt stopped — PID 53066 gone
Now                 ●  Dolt running — PID 61002, 7 conn, latency 0.8ms
```

The `Now` row is green. The card has *already answered the most
expensive question the operator used to ask with 3-5 terminal commands*:
is this still happening? No. Dolt auto-recovered.

**4. The evidence bundle is one click away.**

A collapsed `Evidence bundle (4 items)` disclosure sits under the two
status rows. The operator clicks. The bundle expands in-place:

- `goroutine dump` (captured 02:14:03, 12KB) — click to expand
- `gt dolt status` snapshot (captured 02:14:04) — 6 lines
- `gt vitals` snapshot (captured 02:14:05) — rig health strip
- `gt peek spectralSet/refinery` last 50 lines (02:13:30–02:14:05)

The Witness agent collected these automatically the instant it fired
the escalation. The operator does not have to wonder whether protocol
was followed. Every expandable panel is a document, not a link to one.

**5. The runbook actions are buttons, not memorized commands.**

A `Runbook` section under the bundle shows three buttons wired to the
Dolt-incident runbook:

- `Capture another goroutine dump`
- `Restart Dolt`
- `Open Dolt dashboard`

The operator hovers `Restart Dolt`. A tooltip reads: `Not needed — Dolt
is currently running. Restart anyway?` The button is muted, not
disabled — restraint over prohibition. The operator decides not to
restart.

**6. Ack takes one keystroke.**

The operator presses `a`. A compact in-panel confirm — never a system
modal — asks `Ack this incident? It will drop out of the triage stack
but remain on the Incidents surface until resolved.` Enter confirms.
The red banner disappears. The sidebar badge clears. The card now has
an `acked · 02:19` chip and slides down past the (empty) open section
into `Acked` below. Total time from opening the app: 41 seconds. No
terminal opened.

**7. The timeline writes itself.**

The operator can click `Timeline` on the card to see the permanent
record: `fired 02:14:03 → first viewed 02:19:12 → acked 02:19:47 →
auto-resolved 02:14:47 (underlying condition)`. Postmortems stop being
archaeology.

**Variant — stale polecat instead of Dolt.** The card looks the same.
The runbook buttons change: `Peek`, `Nudge`, `Check Recovery`, `Nuke`.
Each resolves to the correct `gt polecat <subcommand> <full-address>`
behind the scenes. The operator never types `gt nuke` vs `gt polecat
nuke`, never reads `--help` twice.

## What the operator sees

Surface nouns from the B1 IA (`INFORMATION-ARCHITECTURE.md §3`):

- **Global red banner.** Top of every surface when any open incident
  exists. Count visible from peripheral vision. Disappears entirely at
  zero (pillar 7, "Empty is a good state").
- **Sidebar Incidents row.** Fixed group, slot 2 (directly under Today).
  Red numeric badge when any open, dot-only when only acked, none when
  empty (B1 IA §2, Slack §4.1 unread-vs-mention split).
- **Incident card.** List row with four bands: severity chip, title,
  reported-vs-now status pair, disclosure for evidence bundle. Hover
  reveals row-scoped actions (peek source, open bead).
- **Two-state status rows.** `Reported at <timestamp>` on top, `Now` on
  the bottom. Dots are the primary colour signal (red / amber / green).
  The `Now` row refreshes live — no reload.
- **Evidence bundle disclosure.** Collapsible, in-place, no modal. Each
  item inside is another disclosure: goroutine dump, snapshot, peek.
  The operator never leaves the card.
- **Runbook buttons.** Declared per incident type. Rendered as a fixed
  button row. A muted button with hover tooltip is the declined-for-now
  state — never a raw `disabled`.
- **Ack chip.** Replaces the card's action row after ack. Reads
  `acked · HH:MM`. The card stays visible in `Acked` section of the
  surface until the underlying condition resolves and the card auto-
  archives.
- **Reporter cluster.** When a duplicate-coalesce fires, a chip reads
  `3 reporters: refinery, witness, deacon`. One ack, not three.
- **Incidents empty state.** `All quiet across town. Last escalation
  resolved 4h ago.` Centered, generous whitespace, no CTA
  (`INFORMATION-ARCHITECTURE.md §6`).

## Failure modes

Every failure has a graceful fallback — the cockpit is useful even when
the data is partial.

- **Escalation fires but evidence bundle is empty.** The Witness
  couldn't capture (agent dead, Dolt partitioned). The card still
  opens. The bundle disclosure reads `Evidence capture failed — see
  raw escalation mail`. A link opens the source mail in the Mail
  surface in a side drawer. The operator still has the escalation body;
  they just have to read it.
- **Current status poll fails.** `Now` row reads `●  status unknown
  (probe 3/3 failed)`. The dot is amber, not green. The operator reads
  this as "don't trust auto-resolution" and proceeds manually.
- **Dolt is actually down.** The whole product degrades gracefully:
  Incidents surface still renders from the local incidents cache (last
  known escalations). The banner reads `Offline — showing last known
  state at HH:MM`. Runbook buttons remain enabled; they pipe through
  to the CLI via the IPC bridge and surface failures inline.
- **Runbook action fails.** Clicking `Restart Dolt` and getting a
  non-zero exit renders the stderr tail inline under the button, red
  chip, with a `Retry` and `Copy command` pair. The operator can always
  fall back to the terminal — but the exact failing command is right
  there to copy.
- **Duplicate coalescence gets it wrong.** If the reporter cluster
  merges two *different* incidents, the card has a `Split` kebab
  action. One click restores them to separate cards. The coalescence
  is a convenience, never a prison.
- **Network drops mid-ack.** Ack is optimistic: the chip flips
  immediately, the badge clears. If the write fails, a toast reads
  `Ack pending retry — click to resend`. The card returns to the open
  state with the toast persistent until the operator resolves it.
- **CLI out of sync with cockpit.** The operator runs `gt escalate
  ack` from a terminal. The card updates live via the same query
  invalidation that fires for in-app acks (pillar 1, real-time
  omnipresence). No reload.
- **Escalation fires while asleep.** A "while-you-were-asleep" replay
  sits at the top of the Incidents surface: `3 incidents fired and
  auto-resolved between 02:14 and 05:47`. Each is expandable. No inbox
  of identical-looking mails.

## Today vs tomorrow

The real example reconstructed in the journey doc
(`journeys/03-incident-response.md §"Current CLI steps"`) — a HIGH Dolt
escalation that had already auto-recovered by the time the operator
looked:

| Today (CLI) | Tomorrow (SpectralSet) |
|---|---|
| `gt mail inbox` — spot the new escalation amid routine notifications | **Red banner** on top of every surface. Sidebar Incidents badge. No scanning. |
| `gt mail read hq-wisp-e9gqs` — read the 50-line body | Click the banner. Card shows reported-vs-now side by side. |
| `gt dolt status 2>&1` — verify whether it's *still* happening | `Now` row already tells you: Dolt running, PID 61002, 0.8ms latency. |
| `ls ~/gt/.dolt-data/`, `cat dolt.pid`, `ls -lht /tmp/dolt-hang-*.log` — hunt for evidence the agent did or didn't capture | `Evidence bundle (4 items)` disclosure. Goroutine dump + snapshots auto-attached at firing time. |
| `gt peek spectralSet/refinery 2>&1 \| tail -50` — check who else noticed | Reporter cluster chip: `3 reporters: refinery, witness, deacon`. One card, not three. |
| `gt peek spectralSet/witness 2>&1 \| tail -50` — same, for witness | Covered by reporter cluster + evidence bundle's `gt peek` snapshot. |
| `gt escalate ack hq-wisp-e9gqs` — remember the subcommand, the mail ID | Press `a` on the focused card. Enter to confirm. |
| Stare at the terminal, decide whether to document it — usually don't | Timeline writes itself: `fired → first viewed → acked → resolved`. |

**Count.** 7 CLI commands + help-grep tax (observed twice in the Mayor
session log per `journeys/03-incident-response.md §"Friction points"`
item 4, `gt nuke` vs `gt polecat nuke`) → **2 clicks + 1 keystroke**
(click banner, expand bundle, press `a`). Per
`cli-pain-inventory.md §2` row 1 / row 3, both `gt peek` and
`gt mail read` are top-20 must-be-a-button verbs — the Incidents
surface absorbs their daily usage inside this flow.

For the worse variant (stale polecat, 10-command recovery dance in
`journeys/03-incident-response.md §"Current CLI steps"` second block),
the reduction is larger: `gt nuke` → `gt polecat --help | head -30` →
`gt polecat --help | tail -30` → `gt polecat nuke spectralSet/obsidian`
→ `gt polecat check-recovery spectralSet/obsidian` (5 commands, two of
them wrong) collapses to clicking one of four runbook buttons.

## Inspiration patterns used

Each pattern resolves to a named `inspiration.md` anchor.

- **`inspiration.md §1.4` inline notification design with mute-per-thread.**
  Evidence bundles render as inline cards with disclosure, not as
  links. Mute-per-incident-type is the degenerate form of mute-per-
  thread: turn off WITNESS_PING without losing HIGH Dolt.
- **`inspiration.md §2.2` quick actions on the focused row.** Runbook
  buttons are the incident card's row-scoped `Cmd-K`. Per-incident-
  type action set: Dolt gets `Capture / Restart / Open dashboard`;
  stale polecat gets `Peek / Nudge / Check Recovery / Nuke`.
- **`inspiration.md §2.3` inline results render rich, not text-only.**
  Evidence bundle items expand as documents, not links. The goroutine
  dump renders its own preview inside the card.
- **`inspiration.md §2.4` confirmation modals that don't steal focus.**
  Ack confirm is a compact in-panel affordance, never a system modal.
  Destructive runbook actions (Restart Dolt, Nuke polecat) reuse the
  same shape — keyboard in charge, focus preserved.
- **`inspiration.md §3.1` empty states that read like haiku.** `All
  quiet across town. Last escalation resolved 4h ago.` No CTA cluster.
  Zero is the good state.
- **`inspiration.md §4.1` unread-vs-mention badge split.** Sidebar
  Incidents badge is a red number when open, a dot when only acked,
  absent when empty. Matches the Slack split the journey explicitly
  asks for (`journeys/03-incident-response.md §"Friction points"`
  item 3).
- **`inspiration.md §4.5` presence indicators with `active / away /
  dnd`.** The `Now` row's dot is the same vocabulary — green /
  amber / red — that polecat presence already uses elsewhere. One
  colour language across the cockpit.
- **`inspiration.md §5.2` inline event detail on click, not
  navigation.** The card's evidence bundle and timeline expand
  in-place. The operator never navigates away from the Incidents list
  to read any of it.
- **`inspiration.md §5.5` command bar overlay with global search +
  navigation.** `Cmd-K` → `ack dolt` resolves to the top open incident
  and acks it from anywhere, including from inside the Today view.
  Incident actions are first-class verbs in the command bar.
