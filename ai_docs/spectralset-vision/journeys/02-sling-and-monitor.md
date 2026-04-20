# Journey 02 — Sling and Monitor

> The core productive loop: I have an idea, I want to turn it into work,
> hand it to an agent, and check on it later. This is what the operator
> *wants* to be doing. Every other journey is an interruption. So this one
> has to be fast and frictionless.

## Trigger

- **Time of day**: any time, but especially during "let me knock out a few
  things" focused blocks
- **Event**: operator sees a needed change ("we should rebrand
  @superset/mobile to @spectralset/mobile") or reads a bead Mayor created
  overnight that's ready to dispatch
- **Pain**: turning the idea into a *well-specified bead in the right
  namespace* and getting it onto a polecat's hook is multi-step, and *every
  step has a specific footgun the lessons doc warns about*
  (`GASTOWN-LESSONS-AND-TIPS.md:182-193`)

## Current CLI steps

The operator wants to: dispatch `ss-u72` (an existing P2 bead) to a polecat
and watch it land. Real command sequence:

```bash
# 1. Confirm the bead exists, is in the right rig, has acceptance criteria
bd show ss-u72                              # 30+ lines of YAML-ish output
                                            # eyes scan for: rig=spectralSet,
                                            # status=pending, has description

# 2. Confirm no polecat is already on it
gt polecat list spectralSet 2>&1 | head -20

# 3. Sling
gt sling ss-u72 spectralSet
# → "Slung: ss-u72 to spectralSet/quartz" (random pet name)
# → operator now has to remember "quartz" for the rest of the session

# 4. Wait. Check periodically.
gt peek spectralSet/quartz 2>&1 | tail -40
# → 40 lines of Claude Code session transcript;
#   operator scans for "✅" or "Error" or "tool_use"

# 5. Twenty minutes later, check again.
gt peek spectralSet/quartz 2>&1 | tail -25
# → operator forgot it was 'quartz', had to re-run gt polecat list

# 6. Quartz signals done via mail.
gt mail inbox          # find POLECAT_DONE mail
gt mail read hq-wisp-xxxxx
# → "Branch pushed: polecat/quartz-rebrand-mobile-yyyy"
#   "Refinery will pick it up in next patrol."

# 7. Watch the merge queue
gt mq list spectralSet
# → empty? wait. reload. empty? wait. now it shows one entry.
gt mq status <id>
# → "rebasing onto users/florian-renard/training-mode... validating..."

# 8. Eventually MERGED mail arrives. Or MERGE_FAILED.
gt mail inbox
```

Sample real transcript fragment from the Mayor session
(`43e036f1-cf2b-4066-a5fe-5fda9523aac4.jsonl`) showing the polecat-watching
loop:

```
gt peek spectralSet/jasper 2>&1 | tail -40
gt peek spectralSet/obsidian 2>&1 | tail -40
gt peek spectralSet/quartz 2>&1 | tail -40
... (other commands) ...
gt peek spectralSet/jasper 2>&1 | tail -25     # ← repeated polecat peek, context lost
... (other commands) ...
gt peek spectralSet/jasper 2>&1 | tail -20     # ← third time
... (other commands) ...
gt peek spectralSet/jasper 2>&1 | tail -20     # ← fourth time
```

That's the same operator (Mayor) re-checking the same polecat 4 times in
one session because it had nowhere to *see jasper's progress at a glance*.

## Friction points

1. **No "is this bead ready to sling" check.** `bd show` dumps everything;
   the operator has to mentally verify rig correctness, namespace
   correctness, presence of acceptance criteria, no blockers. The lessons
   doc lists at least 5 ways this goes wrong
   (`GASTOWN-LESSONS-AND-TIPS.md:20-39, 124-134, 182-193`). A pre-flight
   check should be a button, not a habit.

3. **Polecat names are random pet names.** "quartz", "jasper", "obsidian"
   — the operator must memorize 3-8 of them per rig per session. The
   identifier the operator created (the bead title) is hidden behind a
   second identifier (the polecat name) which is hidden behind a third
   (the branch name `polecat/quartz-rebrand-mobile-…`). Three identifiers
   per unit of work.

4. **`gt peek` returns raw transcript.** The operator wants "is this thing
   making progress, stalled, or done?" — a binary. Instead they get 40
   lines of LLM output and have to *read it*. There is no progress signal,
   no last-action timestamp visible by default, no "% confidence in
   forward motion."

5. **The operator forgets the polecat name between commands.** The
   transcript shows this *explicitly* — Mayor re-runs `gt polecat list`
   to recover names lost since the last sling. Pure short-term-memory tax.

6. **No "what's next" prompt at sling time.** After slinging, the operator
   gets a confirmation line and… nothing. No "I'll notify you when quartz
   is done", no "want to sling the next ready bead?", no follow-on
   action. Every polecat must be re-discovered later via `gt polecat
   list` + `gt peek`.

7. **Merge queue is poll-only.** `gt mq list spectralSet` runs once and
   exits. If the queue is empty *now* but will fill in 30 seconds, the
   operator has to re-run. They end up running the same command 6-10
   times in a 5-minute window, watching for state to change.

8. **The progress story is bisected by mail.** Half the polecat's progress
   is in `gt peek` (live transcript). The other half is in `gt mail
   inbox` (POLECAT_DONE / MERGE_READY / MERGED). The operator has to
   alternate between two views to follow one bead.

## What 'delightful' looks like in SpectralSet

A **Bead → Polecat → Merge timeline** as the central work surface, not a
collection of separate commands.

- **One-click sling from the bead detail panel**: when the operator opens
  `ss-u72`, the panel shows a green "Sling to polecat" button if the
  preflight passes (right rig, acceptance criteria present, no blockers,
  no polecat already assigned). If preflight fails, the button is
  disabled with the *specific reason* inline ("Bead is in `hq-` namespace
  but rig is `spectralSet` — recreate with `--rig spectralSet`"). No
  remembering 5 lessons.

- **Polecat assignment shows the title, not the random name**: the moment
  Quartz is slung, the bead detail panel mutates: "**ss-u72** — Rebrand
  followup → **quartz** (started 12s ago)". The polecat's pet name is
  a footnote, not the primary identifier. The bead title is always the
  hero.

- **Live progress stream, not poll**: a `<PolecatProgress beadId="ss-u72"/>`
  component subscribes to a server-sent event stream and renders the last
  3 tool calls as a compact timeline. No `gt peek` re-runs. The operator
  glances, sees "editing
  packages/mobile/package.json · 14s ago", knows it's alive, moves on.

- **Forward-motion badge**: a per-polecat indicator computed server-side:
  `🟢 making progress` (file edits in last 60s), `🟡 thinking` (only LLM
  events, no tool calls 60-180s), `🔴 stalled` (>180s no events). One
  glance, one decision: nudge or leave alone.

- **Auto-pin on sling**: slinging a bead automatically pins it to the
  operator's "active" tray on the side. They never have to remember
  "quartz" — the active tray shows every polecat they personally
  triggered, with the bead title as the label.

- **Merge journey collapses into one row**: that same `<PolecatProgress>`
  card transitions through states automatically: `working → pushed →
  queued → rebasing → validating → merged ✅`. No mail required to know
  state. Mail becomes "I want to be told when this completes" — a push,
  not a pull.

The behavior we are killing: 8+ commands per dispatch, 4+ polecat-name
re-lookups per session, mental joins between `gt peek` and `gt mail` to
follow one bead. Replace with: open bead → click sling → glance at
timeline strip whenever you want.
