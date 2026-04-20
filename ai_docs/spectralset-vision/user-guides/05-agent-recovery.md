---
phase: B2
doc_id: ug-05-agent-recovery
version: v0.1
owner: polecat/quartz
depends_on: [B0, B1]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/journeys/05-agent-recovery.md
  - ai_docs/spectralset-vision/inspiration.md
  - ai_docs/spectralset-vision/current-state-audit.md
required_sections_present: true
section_count_self_check: 6
overseer_review_requested: 2026-04-20
---

# User Guide 05 — Agent Recovery

## Scenario

A polecat went sideways. Maybe it crashed mid-task, maybe the session died but the sandbox lives, maybe the deacon already nuked it and now the hook is orphaned. The operator needs to decide which of exactly three states the polecat is in — Working, Stalled, or Zombie — and what to do about it. Recovery is the journey where that decision is made. There is no "idle" state; a polecat that isn't working has either been nuked or needs to be.

## Step-by-step ideal flow

Open SpectralSet. The Agents surface is two keystrokes away: press `g` then `a`. Or invoke the command bar with `Cmd-K` and type `agents` — the preview renders the rig grid inline, so `Enter` lands you on it without a second confirmation.

The Agents surface loads as a grouped grid. Mayor, deacon, and boot live at the top; below them, each rig sits under a typographic heading — no boxes, no dividers, just weight. Polecats appear as rows inside their rig, and every row carries a state chip in the leading slot: `🟢 working`, `🟡 stalled (12m no activity)`, or `🔴 zombie (session dead 3h ago)`. The chip is the first thing the eye lands on. You do not run `gt peek` to find out what it says. The classification has already been computed.

Scan the list. One row catches you: `quartz` in `spectralSet`, chip reads `🟡 stalled (14m)`. Press `j` to focus it, or click the row. The drawer slides in from the right, anchored to the list. The list stays visible on the left — you do not navigate away.

Inside the drawer, three buttons line up in a single row because `quartz` is stalled. The primary, visually prominent action is `Check Recovery`. Next to it: `Peek` and `Nudge`. That is the complete menu for a stalled polecat. `Nuke` is absent. The operator cannot invoke the wrong subcommand, because the wrong subcommand is not on screen.

Press `Check Recovery`. A short inline result renders beneath the button: `RECOVERABLE — session heartbeat within threshold, sandbox clean, last commit 9m ago on polecat/quartz-mo7hizq2`. The recommendation appears alongside: `Nudge with "status?"`. One `Enter` sends the nudge. Watch the chip. Within a second or two, the row chips back to `🟢 working (responsive)` and the drawer refreshes to show the polecat's current molecule step. The operator types nothing else.

Move on. Another row: `obsidian` in `spectralSet`, chip reads `🔴 zombie (session dead 3h ago)`. Open its drawer. This time the buttons are `Inspect Sandbox`, `Re-sling on fresh polecat`, and `Nuke`. Press `Inspect Sandbox` first. A compact summary renders inline: "Last commit `abc1234` on `polecat/obsidian-l2j3k4`, branch pushed, 4 uncommitted files (lockfile drift). Hook bead: `ss-vn2`." Now the operator has enough to choose.

Press `Re-sling on fresh polecat`. A confirmation panel opens in place — the drawer does not close, the list stays visible. The panel shows the continuity preamble that will ride into the new bead:

> *Previous polecat (`obsidian`) reached commit `abc1234` on branch `polecat/obsidian-l2j3k4`. Re-use what you can, don't re-litigate decisions visible there.*

`Enter` confirms. The old polecat nukes, a new polecat (`onyx`) spawns, and `ss-vn2` hooks onto it with the preamble attached. The row disappears from the zombie group and reappears under Working in the new polecat's slot. The fresh polecat starts at 60% of the work, not zero.

Glance at the top of the Agents surface. A single line runs the width: *"All polecats green, 0 zombies, 0 orphans, deacon armed — last verified 9s ago."* When that line is green, you can close the laptop.

## What the operator sees

The Agents surface is the home for polecat recovery. The surfaces and interaction objects you encounter, in the order you meet them:

- **Agents surface sidebar entry.** Under the fixed groups, `Agents` is reachable via `g a` or the command bar. The Agents surface itself has no unread badges — recovery urgency is carried by the state chips inside the grid, not by sidebar counts.
- **State chip (three values only).** Every polecat row carries one chip: `🟢 working`, `🟡 stalled (<duration>)`, `🔴 zombie (<duration>)`. The chip is authoritative and computed server-side. The interpretation is baked in — `Session: 12 (resilient)` reads as green alongside the chip, not as alarming noise.
- **Three-layer health badges.** To the right of the chip, three small badges render inline: `Session: 12 (resilient)`, `Sandbox: clean`, `Slot: held`. High numbers get their meaning rendered alongside them. A new operator does not need the lessons doc to interpret what they see.
- **Polecat drawer.** The home surface for polecat detail. Opens anchored to the list; list stays visible. Drawer contains the health badges in full, the hook bead, the last commit subject, and the state-appropriate button set.
- **Per-state button sets.** Working → `Peek` only. Stalled → `Check Recovery` (primary), `Peek`, `Nudge`. Zombie → `Inspect Sandbox`, `Re-sling on fresh polecat`, `Nuke`. No per-state button set contains a subcommand that does not apply. The operator cannot accidentally pick the wrong one.
- **Recovery preflight result.** When `Check Recovery` runs, the verdict and recommendation render inline under the button. No modal, no separate tab.
- **Continuity preamble preview.** On `Re-sling on fresh polecat`, the preamble that will ride into the next polecat's bead is visible *before* confirmation. Editable in place if the operator wants to leave a stronger hint.
- **Deacon action log panel.** A side panel on the Agents surface lists the deacon's last 50 actions, filterable by `nuked / nudged / restarted`. A `Pause Deacon` button sits at the top of the panel for the moment of panic.
- **System-OK verdict line.** One sentence running the top of the Agents surface: *"All polecats green, 0 zombies, 0 orphans, deacon armed — last verified 9s ago."* When it is green, recovery is done.
- **NukeConfirm.** Destructive confirm opens in place over the drawer — never a system dialog. `ESC` cancels, `Enter` confirms. Tooltip reminds: "this ends the session; sandbox preserved, unsaved scratch lost."

## Failure modes

Recovery is the one journey where *graceful fallback* is the whole product. Four things can go wrong and each has a soft landing.

**Data stops flowing.** The live state stream stalls (Dolt is slow, the probe missed a refresh). State chips do not silently stay green. Instead, each chip greys out and the verdict line changes to *"State data older than 30s — reconnecting."* No alarm, no modal — the chip itself admits it is stale. The operator does not make recovery decisions against frozen data by accident.

**A polecat is actually healthy but looks stalled.** This is the "murderous deacon" pattern inverted. The chip says `🟡 stalled (22m)` but the polecat is mid-long-build. Pressing `Check Recovery` is safe — it reads, never writes. The verdict returns `LIKELY HEALTHY — heartbeat fresh, sandbox active, long-running process detected`. The operator nudges before nuking, and the recommended button on a likely-healthy polecat is `Nudge`, not `Nuke`. Nukes remain deliberate, never impulsive.

**The CLI is unreachable.** The Gas Town backend is down, the probe returns nothing. The Agents surface shows its empty-state prose: *"Gas Town is not reachable. Start it with `gt doctor --fix`, then SpectralSet will reconnect."* No buttons, no console. Recovery cannot complete from inside SpectralSet in this state — and the surface says so plainly, instead of pretending.

**The deacon killed something the operator did not want killed.** Open the deacon action log side panel. Filter to `nuked` in the last hour. Every row shows the polecat name, the reason the deacon chose, and a `Re-sling` button with the original bead pre-attached. The operator recovers from a deacon mistake in two clicks — no `grep` against the mail inbox, no mental join across commands.

## Today vs tomorrow

| Today (CLI) | Tomorrow (SpectralSet) |
|-------------|------------------------|
| `gt polecat list --all \| head -60` to notice an oddity | Scan the Agents surface; state chips surface the oddity on their own |
| `gt peek spectralSet/obsidian` + `gt peek spectralSet/quartz` — one per polecat | One grid, every chip visible at once; click a row to drill in |
| Type `gt nuke <name>` from CLAUDE.md — get `unknown command` (CLAUDE.md is wrong) | `Nuke` button appears only when applicable; the wrong subcommand is never presented |
| `gt polecat --help \| head -30` to hunt the real command | No hunting — the buttons *are* the command surface |
| `gt polecat nuke spectralSet/obsidian` — committed before probing | `Check Recovery` is the primary action on a stalled polecat; `Nuke` is secondary |
| `gt polecat check-recovery spectralSet/obsidian` — too late | Same probe, one click, runs *before* any destructive action |
| `tmux -L spectralgastown-<id> list-sessions \| grep -E 'obsidian\|quartz'` — raw tmux because surfaces disagree | Session / sandbox / slot are one coherent row, computed server-side |
| `bd show ss-XYZ`, then `gt sling ss-XYZ spectralSet` — re-sling with no continuity | `Re-sling on fresh polecat` auto-attaches the previous branch + commit as a preamble |
| `gt deacon pause` + `gt mail inbox \| grep -i killed` to hunt the deacon's victims | Deacon action log panel lists victims; `Re-sling` per row; `Pause Deacon` one click away |
| `gt polecat list` + `gt agents list` + `gt orphans procs list` + `gt deacon health-check` — mental join | One verdict line: *"All polecats green, 0 zombies, 0 orphans, deacon armed — last verified 9s ago."* |

**Command count:** a two-polecat recovery in today's CLI measured ~10 invocations, two `--help` hunts, and one premature nuke. The same recovery in SpectralSet is at most 4 clicks (focus row → `Check Recovery` / `Nudge` for the stalled one; focus row → `Inspect Sandbox` → `Re-sling` for the zombie). A pure glance-and-coffee day is zero clicks — the verdict line says so.

## Inspiration patterns used

- **`inspiration.md §1.2` — status chips with one-letter cycle shortcuts.** The 3-state chip (`🟢 working` / `🟡 stalled` / `🔴 zombie`) is the canonical authoritative chip on every polecat row. Status is the primary data, not metadata; the chip is honest and computed once.
- **`inspiration.md §4.5` — presence indicators with active/away/dnd states.** The three-state polecat model maps directly onto Slack's presence dot pattern: working (green), stalled (amber), zombie (red). Passive inference, no explicit toggles. Answers "who should I nudge?" as a glance.
- **`inspiration.md §2.2` — quick actions on the focused row.** Per-state button sets (Peek / Nudge / Check Recovery / Inspect Sandbox / Re-sling / Nuke) are the row-scoped actions; the palette is bounded to the three buttons that apply to this polecat's state, so the operator never picks the wrong subcommand.
- **`inspiration.md §2.4` — confirmation modals that don't steal focus.** NukeConfirm and the continuity-preamble confirm both render in place over the polecat drawer. `ESC` cancels, focus returns to the drawer. Destructive actions stay deliberate without stealing context.
- **`inspiration.md §4.3` — thread expansion as an in-place drawer.** The polecat drawer opens anchored to the Agents grid; the list stays visible. Moving between polecats during recovery does not require navigating away and back.
- **`inspiration.md §3.1` — empty states that read like haiku, not like errors.** The System-OK verdict line (*"All polecats green, 0 zombies, 0 orphans, deacon armed — last verified 9s ago."*) is the recovery surface's empty state. When nothing needs the operator, the surface says so in one sentence and the operator leaves.
- **`inspiration.md §1.4` — inline notification design with mute-per-thread.** The deacon action log is a passive inline feed with filters, not a separate inbox; the operator can answer "did the deacon kill anything in the last hour?" without grepping mail.
