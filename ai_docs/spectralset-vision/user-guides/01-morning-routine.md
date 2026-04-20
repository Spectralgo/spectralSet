---
phase: B2
doc_id: ug-01-morning-routine
version: v0.1
owner: polecat/garnet
depends_on: [B0, B1]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/journeys/01-morning-routine.md
  - ai_docs/spectralset-vision/inspiration.md
  - ai_docs/spectralset-vision/current-state-audit.md
required_sections_present: true
section_count_self_check: 6
overseer_review_requested: 2026-04-20
---

# User Guide 01 — Morning Routine

## Scenario

A founder running 6+ rigs wakes up. Eight agents ran overnight. What broke? What landed? Whose work needs me? This is the highest-frequency journey — every morning, every coffee break, every "let me check in" moment.

## Step-by-step ideal flow

It is 7:31am. The laptop lid opens. SpectralSet is already running in the menu bar, and clicking its tray icon brings the cockpit to the foreground.

**The app lands on Today.** Because the local clock is before noon, Today is the default surface — no route choice, no spinner, no workspace picker. The window paints in a single frame: a masthead line at the top, a triage stack below it, a per-rig health strip, and a collapsed pile of unprocessed mail near the bottom.

**The first thing the operator reads is the "since you slept" line.** It sits directly under the Today breadcrumb, timestamp-aware, and reads: "Since 11:04pm: 12 PRs merged · 3 PRs awaiting review · 1 escalation acked by deacon · 8 polecats still alive." Each metric is a hit target. Clicking "3 PRs awaiting review" slides a bead drawer in from the right with the three pull requests; the Today list behind it stays visible. Dismissing the drawer with Escape returns focus without losing scroll position.

**Next, the triage stack demands attention.** Three cards stack vertically, each showing the bead title inline — no raw identifiers. The top card reads "Dolt server degraded — ack required" with a dim severity chip and three buttons: Ack, Open, Snooze. The operator presses A; the card collapses into a muted "acked" line and the next card focuses automatically. The second card is a rejected branch; pressing O slides the Rejection Triage drawer over the stack with the failing fragment already highlighted. The third card, a pinned mail from mayor, gets Snooze — it drops to a "back at 09:00" timer and the stack empties.

**The per-rig health strip confirms the cockpit view.** One row per rig. Each row is a typographic line, not a boxed card: a colored presence dot, the rig name, and a one-line reason. "spectralSet — one polecat stalled 3h, 0 ready work." "gmux — 4 P0 ready, no slings, refinery idle." Hovering any row reveals the source CLI command in a small popover, so the operator can verify against the terminal without switching windows. The operator presses `g a` to jump to Agents; the stalled polecat is already scrolled into view with its presence dot amber.

**The operator opens the polecat drawer with a single click.** The drawer lists the pinned bead as hero, the state chip ("stalled"), the last commit subject, and — on `Cmd-K` — a row-scoped palette of Peek, Nudge, Check-Recovery, Re-sling, Nuke. Pressing N opens a Nudge dialog inline without leaving the drawer. The operator types one sentence, hits send, and closes the drawer with Escape.

**The untouched-mail pile is last, and optional.** Twelve read-but-unprocessed mails are folded into a single row that reads "12 mails, unprocessed." Expanding it reveals snippets — subjects are humanized ("witness ping: patrol run"), not raw IDs. Bulk archive and Mark-read sit to the right as distinct buttons with distinct intentions. The operator bulk-archives eight witness pings, marks the remaining four as read, and the pile dissolves.

**The "go drink coffee" verdict prints.** Because the triage stack is empty, every rig is green or amber-with-a-plan, and the merge queue is flowing, a single prose line replaces the pile: "Everything is fine. Last verified 14 seconds ago." The operator shuts the lid.

Total elapsed: about 90 seconds. Zero commands typed.

## What the operator sees

Surfaces and objects encountered, in order of appearance:

- **Today** — the default landing surface (`/today`), breadcrumb `Today`, invoked implicitly because the local clock is before noon.
- **Since-you-slept masthead** — a timestamp-aware line of four metrics; clicks open a bead drawer or thread drawer, not a new route.
- **Triage stack** — escalations, rejections, and pinned mail rendered as cards. Each card carries three actions (Ack, Open, Snooze). Bead titles are inline; identifiers are never shown.
- **Per-rig health strip** — typographic rows, one per rig, presence dot + one-line reason. No boxed chrome; heading weight carries hierarchy.
- **Sidebar** — fixed groups at the top (Today, Incidents, Rejection Triage, Mail) with unread-vs-mention badges: a gray dot for "activity happened", a red numeric badge for "you're needed".
- **Polecat drawer** — opens anchored to the Today strip or the Agents grid; hero is the pinned bead; the state chip is authoritative (working / stalled / zombie — never "idle"); the row-scoped action palette lives on `Cmd-K`.
- **Nudge dialog** — a compact in-drawer confirm that does not steal focus. Escape returns to the drawer; drawer Escape returns to the list.
- **Untouched-mail pile** — collapsible row at the bottom of Today. Bulk archive and Mark-read are distinct affordances with distinct intentions.
- **"Go drink coffee" verdict** — a single prose line rendered when every signal is green. A last-verified timestamp sits beside it.
- **Empty states** — calm prose, centered, no CTA cluster: "All quiet across town", "Inbox clear", "All polecats self-sufficient".

## Failure modes

Every cockpit interaction has a graceful fallback. If the fallback is not graceful, the cockpit has failed its contract.

- **Gas Town is not running.** Today renders its skeleton immediately (the cockpit is desktop-native, not a web view), then replaces the since-you-slept masthead with "Can't reach Gas Town. Start the daemon or run the CLI fallback." A single button opens the built-in terminal at the daemon-start command. The triage stack renders the last-known cache with a subtle "stale since 11:04pm" chip, so the operator is not told a lie.

- **Dolt is hung or slow.** The triage stack degrades to a loading state for at most two seconds, then falls back to the last-known cache and surfaces a red incident card at the top: "Dolt server unreachable. Ack to acknowledge." Acking does not hide the problem — it only suppresses repeat pings. The Incidents surface takes over as the loudest element in the UI until Dolt is back.

- **A polecat is stalled.** The presence dot turns amber on every appearance (Today strip, Agents grid, sidebar pinned row). The polecat drawer's row-scoped palette reshapes: Peek and Nudge become primary; Re-sling and Nuke appear only after Check-Recovery confirms the polecat cannot resume.

- **The network flaps mid-morning.** Real-time streams reconnect silently. The cockpit shows a thin "reconnecting" bar at the bottom of the window (never a modal, never a blocker); the last-verified timestamp on the "go drink coffee" line freezes until the stream re-syncs. When it re-syncs, the timestamp updates in place and the bar disappears.

- **The CLI is unresponsive but Gas Town data is intact.** The operator falls through to the power-user path: `Cmd-K` opens the Command bar overlay from any surface, typing `peek jasper` renders the same inline mini-peek that a hover would have shown, and verbs from the top-20 CLI inventory are all one keystroke away. The CLI is the fallback; the cockpit is the primary.

- **There is nothing to do.** Today renders only the "go drink coffee" verdict and the per-rig health strip. No empty-state pleading, no "Get started" cluster. Empty is a good state.

## Today vs tomorrow

| Morning task | Current CLI steps (Journey 01) | Future SpectralSet action |
|---|---|---|
| See overnight summary | `gt hook` → `gt vitals` → `gt ready` → mental join | Open app; masthead renders "Since you slept: 12 merged · 3 awaiting review · 1 escalation · 8 polecats" |
| Triage escalations | `gt mail inbox` → `gt mail read hq-ycyd` → `gt mail read hq-dvlt` → `gt mail read hq-wisp-vdzsv` → `gt escalate ack hq-wisp-e9gqs` | Press A on each card in the triage stack; titles are inline |
| Check per-rig state | `gt polecat list --all` → `gt peek jasper` → `gt peek obsidian` → `gt peek quartz` → `gt mq list spectralSet` | Read the per-rig health strip; one line per rig with a presence dot |
| Process unprocessed mail | `gt mail read hq-wisp-wa3kj` → `gt mail read hq-wisp-qphaj` → `gt mail read hq-wisp-b8atb` | Expand the untouched-mail pile; Bulk archive + Mark-read |
| Decide "am I done?" | No signal — the operator guesses | "Everything is fine. Last verified 14s ago." |
| **Total commands typed** | **15 commands, multiple mental joins** (per `cli-pain-inventory.md §2`) | **0 commands; ~90 seconds** |

Command count reduction: **15 → 0**. The cockpit pre-joins what the Mayor used to join in their head.

## Inspiration patterns used

- `inspiration.md §1.1` — Cmd-K command palette with verb-object phrasing. Powers the Command bar overlay used as the CLI fallback and as the row-scoped action palette inside the polecat drawer.
- `inspiration.md §1.2` — Status chips with one-letter cycle shortcuts. Maps to the A / O / S keys on each triage-stack card (Ack / Open / Snooze).
- `inspiration.md §1.3` — Grouped lists with collapsible headings. Applied to the per-rig health strip and the untouched-mail pile; collapse state persists per view.
- `inspiration.md §1.4` — Inline notification design with mute-per-thread. Shapes the triage stack: cards are a view of the same live objects, not a separate inbox to refresh.
- `inspiration.md §3.1` — Empty states that read like haiku. Drives the "go drink coffee" verdict and every empty copy ("Inbox clear", "All quiet across town").
- `inspiration.md §3.4` — Today as the only view that matters in the morning. Cements Today as the default landing surface before noon.
- `inspiration.md §4.1` — Unread badges that distinguish "any" from "mention". The sidebar uses a gray dot for activity and a red numeric badge for escalations and pinned mail.
- `inspiration.md §4.3` — Thread expansion as an in-place drawer. The polecat drawer, bead drawer, and mail thread drawer all open anchored to their list; the list stays visible.
- `inspiration.md §4.5` — Presence indicators with active/away/dnd states. The per-rig health strip and every agent avatar expose the three-state polecat model (working / stalled / zombie) as a colored dot.
- `inspiration.md §6.1` — Sidebar-first layout with collapsible left nav. The cockpit leans on the sidebar for triage (Today, Incidents, Rejection Triage, Mail as fixed top groups); top chrome is almost empty.
