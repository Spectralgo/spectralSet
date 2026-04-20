---
phase: B2
doc_id: ug-04-code-review-handoff
version: v0.1
owner: polecat/opal
depends_on: [B0, B1]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/journeys/04-code-review-handoff.md
  - ai_docs/spectralset-vision/inspiration.md
  - ai_docs/spectralset-vision/current-state-audit.md
required_sections_present: true
section_count_self_check: 6
overseer_review_requested: 2026-04-20
---

# User Guide 04 — Code Review & Handoff Loop

> Tutorial for the operator when the refinery rejects a polecat's branch.
> You walk from the rejection notification to a landed fix in three
> clicks, without a single `git fetch` or `bun install`.

## Scenario

A polecat's PR was rejected by the refinery. Now the operator has to
triage *why*, decide who fixes it, and run the rebase-resubmit loop
until it lands.

It is 23:14. You slung four beads in parallel an hour ago. Three
polecats landed cleanly. The fourth — working on the mobile rebrand —
just got bounced by the refinery with a typecheck failure. You are on
the couch. The laptop is open but you have not typed a command in ten
minutes.

## Step-by-step ideal flow

Open SpectralSet. The Today view is already the default landing, and
the triage stack at the top has grown a new red card since you last
glanced at the screen: **"jasper: mobile rebrand rejected — stale
imports."** The card shows the branch name, the diagnosis chip, and
three lines of the failing typecheck output inline. You do not need
to open anything yet; you already know what happened.

Press `g r` to jump to **Rejection Triage**. The surface opens with
one card at the top of the list, grouped under a heading that reads
**"Stale imports (1)"**. The card header shows `polecat/jasper-rebrand-
mobile-a82c` and a chip that says `stale-imports`. Below the header,
five lines of the actual typecheck error are rendered with the
offending line highlighted:

```
packages/mobile/src/foo.ts:42:14
  Property 'legacyField' does not exist on type 'RebrandSchema'.
   40 | const record = await resolveRecord(id);
   41 | if (!record) return null;
   42 | return record.legacyField ?? fallback;
      |              ^^^^^^^^^^^
```

Underneath the fragment, a **stale-since timeline** shows the branch
was cut at `2026-04-19 22:02`. Four files have been touched on `main`
since then; one of them (`packages/mobile/src/schema.ts`) is also
modified in jasper's branch. A ⚠ sits next to that one file. The
verdict line reads: **"Your branch is 12 hours behind. 1 file
conflicts."**

Two buttons sit at the bottom of the card: **Respin fresh polecat**
and **Self-fix locally**. A third, quieter link — **Open full refinery
log** — is under them for the rare case you want the raw 400-line
output.

Today you want this gone fast. You hover **Respin fresh polecat**
and the button reveals a preview: a delta-bead titled "Re-do rebrand
mobile (schema updated on main since branch cut)" with a description
that already includes the prior failure chip, the ⚠ file list, and a
"focus on: the `legacyField` reference is now `legacyFields`" hint
auto-extracted from the schema diff. Press Enter. The bead is created,
a fresh polecat is slung, and jasper's session is auto-quarantined —
the worktree and branch are preserved, but the tmux session is paused
and a `Nuke` affordance appears on jasper's Agents card.

You return to Today. The triage stack is empty. The "go drink coffee"
line sits at the bottom of the view.

If instead you wanted to fix it yourself — because it's a one-line
change and respinning feels like ceremony — press `F` on the focused
card. Your editor opens at `packages/mobile/src/foo.ts:42` with the
line pre-positioned. Edit. Save. The Rejection drawer updated itself
while you were in the editor: a **Push & resubmit** button has
replaced **Self-fix locally**. Click it. SpectralSet commits with a
message drafted from the diagnosis chip, pushes the branch, and
submits to the merge queue. No `gt mq submit` muscle memory. The
rejection card now shows "resubmitting" and slides to the bottom of
the list under a collapsed "Resubmitted (1)" group heading. When the
refinery confirms the merge, the card resolves and disappears from
the surface.

When three polecats reject against the same just-landed schema PR,
the Rejection Triage surface groups all three under a single
**"Stale imports (3)"** heading. A row-level **"Respin all three
with auto-rebase context"** action appears on the group header. One
click, three fresh polecats, three quarantined sessions.

## What the operator sees

When a `MERGE_FAILED` or `REWORK_REQUEST` lands, the sidebar's
**Rejection Triage** row grows a red numeric badge — the same
unread-vs-mention treatment Mail uses for pinned addresses. The badge
is not a dot; it is a count, because rejections are always "you're
needed", never "there's activity".

The surface itself is a list of rejection cards, grouped by root-cause
chip. The available chips are `stale-imports`, `test-regression`,
`lint`, `rebase-conflict`, `build-error`, and `other`. Each chip has
its own colour — amber for the recoverable classes
(stale-imports, rebase-conflict), red for the ones that imply a bug
(test-regression, build-error), muted for `lint` and `other`. Group
headings are typographic, not boxed; the chip is the heading.

Inside each card:

- **Failing fragment** — the actual error output with five lines of
  code context, rendered inline. No log link is required to decide.
- **Stale-since timeline** — a compact "branch cut at T; N files
  touched since" line, with ⚠ markers next to any file the branch
  also modifies.
- **Fork-in-road panel** — `Respin fresh polecat` and `Self-fix
  locally` as primary buttons; `Open full refinery log` as a
  secondary link.
- **Quarantine state** — a small pill under the branch name that
  reads `quarantined` the moment the refinery rejects. The
  corresponding polecat in the Agents surface shows a paused
  presence dot and a `Nuke` affordance on its card.

Row-scoped actions (press Cmd-Shift-K on a focused card) expose the
same verbs — `respin`, `self-fix`, `open log`, `nuke polecat`,
`mute` — without leaving the keyboard.

Empty state, when nothing is rejected:

> No rejected branches. Merge queue is flowing.

One line. Centered. No CTA.

## Failure modes

- **Refinery log is unparseable.** If the framework cannot classify
  the failure against the six chips, the card shows an `other` chip
  and falls back to the full log link as the primary affordance. The
  fork-in-road panel still renders, but the auto-respin preview is
  labelled "manual spec — no delta detected" and the operator writes
  the focus line themselves before confirming.
- **Respin delta-spec cannot be generated.** When the log yields no
  diagnosis and no conflicting files, the `Respin fresh polecat`
  button still works — it just hands the new polecat the original
  bead's spec unchanged, with a single appended line ("previous
  attempt failed — see attached refinery log"). The operator is not
  blocked; they just lose the auto-delta.
- **Editor URL won't resolve.** If the OS cannot open the failing
  file via the editor URL, the `Self-fix locally` path swaps to a
  **Copy path** affordance. The operator pastes the path into their
  editor of choice. The rest of the flow — detect commit, show
  Push & resubmit — is unchanged.
- **The refinery is offline.** The surface renders a banner ("Merge
  queue is offline — rejection data may be stale") and disables
  `Push & resubmit` and `Respin fresh polecat`. Existing cards
  remain visible so the operator can still read the diagnosis
  inline, but no new actions are dispatched until the merge queue
  comes back.
- **The CLI is unresponsive.** Rejection cards cache the last-known
  failing fragment locally. The surface greys out decision buttons
  and shows "Gas Town is unreachable — read-only." Escalation is
  one click away: a banner link opens the Incidents surface with a
  pre-filled `gt escalate` draft.
- **Cross-rejection grouping is ambiguous.** When three rejections
  share a chip but have different root-cause files, the surface does
  *not* group them — groups require both chip AND shared conflicting
  file to avoid a false "respin all three" affordance. Each card
  sits on its own line; the group heading is suppressed.

## Today vs tomorrow

| What | Today (CLI) | Tomorrow (SpectralSet) |
|------|-------------|-------------------------|
| Notice the rejection | `gt mail inbox` → scan for `MERGE_FAILED` | Red count badge on the sidebar's Rejection Triage row |
| Read the failure | `gt mail read hq-wisp-XXXXX` → `cat ~/gt/spectralSet/refinery/logs/…` (400 lines) | Failing fragment rendered inline in the rejection card |
| Understand why | `git fetch origin <branch>` → `git checkout` → `bun install` → `bun typecheck` (~90s) | Diagnosis chip + stale-since timeline, already computed |
| Decide fork-in-road | Ad-hoc judgment; no decision aid | Two labelled buttons with preview |
| Respin path | `bd create "…"` with manual description → `gt sling ss-XXX spectralSet` | **Respin fresh polecat** button — delta-spec auto-generated |
| Self-fix path | Open editor manually → `git commit` → `git push` → remember `gt mq submit` | **Self-fix locally** → edit → **Push & resubmit** |
| Clean up jasper | Manual: `gt peek jasper` (×3) → `gt nuke jasper` | Auto-quarantine on rejection; `Nuke` affordance on the Agents card |
| Handle 3 parallel rejections | 3× mail rows, 3× logs, 3× checkouts | One grouped heading; one **Respin all three** action |

Command count reduction (happy path, one rejection, respin path):
today = 8 commands across mail, shell, and `bd`; tomorrow = 2 clicks
(open Rejection Triage, confirm Respin) and one implicit keystroke
(`g r`). See `cli-pain-inventory.md §2` for the inventory source.

## Inspiration patterns used

- `inspiration.md §1.3` **Grouped lists with collapsible headings** —
  rejection cards group under root-cause chips (`stale-imports (3)`,
  `test-regression (1)`), with per-group bulk actions on the heading.
- `inspiration.md §1.4` **Inline notification design with
  mute-per-thread** — each rejection card is a self-contained unit
  with inline actions; per-thread muting on the row lets the
  operator silence repeated failures from a specific polecat while
  they fix the root cause upstream.
- `inspiration.md §2.2` **Quick actions on the focused row** —
  Cmd-Shift-K on a focused rejection card exposes `respin`,
  `self-fix`, `open log`, `nuke polecat`, `mute` without opening
  a menu.
- `inspiration.md §2.3` **Inline results render rich, not text-only** —
  the failing fragment (typecheck output, five lines of code) renders
  inside the card rather than linking to a log. 90% of triage
  decisions happen from the fragment alone.
- `inspiration.md §3.1` **Empty states that read like haiku** —
  "No rejected branches. Merge queue is flowing." No CTA cluster; the
  calm state is the success state.
- `inspiration.md §4.1` **Unread-vs-mention badges** — the sidebar's
  Rejection Triage row uses a red numeric badge, not a dot, because
  every rejection is "you're needed" rather than "there's activity".
- `inspiration.md §4.5` **Presence indicators with
  active/away/dnd states** — the polecat whose branch was rejected
  shows a quarantined presence state on every appearance (Agents
  card, Today per-rig health strip, Command bar inline preview).

The behaviour we kill: 90 seconds of local setup to understand a
rejection, plus the temptation to self-fix because that's faster than
a respec. What we keep: one surface that answers *why* inline, one
button that generates the corrective spec, and a Law #1 (Mayor never
codes) the operator no longer has to white-knuckle.
