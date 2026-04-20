# Journey 05 — Agent Recovery

> A polecat went sideways. Maybe it crashed mid-task, maybe the session
> died but the sandbox lives, maybe deacon already nuked it and now the
> hook is orphaned. The lessons doc is firm: there are exactly three
> polecat states — Working, Stalled, Zombie — and "There is NO 'idle'
> state. A polecat that isn't working has been nuked"
> (`GASTOWN-LESSONS-AND-TIPS.md:124-134`). Recovery is the journey where
> the operator decides which of the three a polecat is in, and what to
> do about it. The lessons doc lists this as the #1 source of cascading
> bugs.

## Trigger

- **Time of day**: anytime; often surfaces during morning routine when
  yesterday's polecats are inspected
- **Event**: `gt peek <polecat>` shows nothing recent, *or* deacon mail
  fires, *or* the operator notices a hook bead in `in_progress` with no
  active session, *or* `gt vitals` shows mismatched session/sandbox
  counts
- **Pain**: deciding `nudge | restart | nuke | leave-alone` requires
  cross-referencing 4 commands, and getting it wrong either burns hours
  of work (premature nuke) or wastes a sandbox slot indefinitely
  (failure to nuke a true zombie)

## Current CLI steps

Real example from the Mayor session log (`43e036f1-cf2b-4066-a5fe-…jsonl`):
two polecats (`obsidian`, `quartz`) in unclear states. Operator's actual
command sequence:

```bash
# 1. Notice oddity in polecat list
gt polecat list --all 2>&1 | head -60
# → obsidian: session count 12, last activity 4h ago
# → quartz: session count 3, last activity unknown

# 2. Check current peek
gt peek spectralSet/obsidian 2>&1 | tail -40
gt peek spectralSet/quartz 2>&1 | tail -40
# → both: tail shows "Bash command timed out" or stale prompts

# 3. First instinct: nuke. Type the command from CLAUDE.md (line 37).
gt nuke obsidian 2>&1 | tail -10
# → Error: unknown command 'nuke'  (CLAUDE.md is wrong)

gt nuke quartz 2>&1 | tail -10
# → Error: unknown command 'nuke'

# 4. Hunt for the real command
gt polecat --help 2>&1 | head -30
gt polecat --help 2>&1 | tail -30
# → finally: 'polecat nuke <full-address>'

# 5. Try again
gt polecat nuke spectralSet/obsidian 2>&1 | tail -15
gt polecat nuke spectralSet/quartz 2>&1 | tail -15

# 6. Wait — was that the right call? Maybe these were recoverable?
gt polecat check-recovery spectralSet/obsidian 2>&1 | tail -20
# → "POLECAT_NOT_FOUND — already nuked" (too late)

# 7. Verify deletion took
gt polecat list spectralSet 2>&1
tmux -L spectralgastown-<id> list-sessions | grep -E 'obsidian|quartz'
# ↑ raw tmux because `gt polecat list` and tmux truth can disagree

# 8. Re-sling the lost work
bd show ss-XYZ                                    # was obsidian on this?
                                                  # operator may not remember
gt sling ss-XYZ spectralSet                       # spawn replacement
# → "Slung: ss-XYZ to spectralSet/onyx"
```

Total: ~10 commands, two `--help` invocations, one premature nuke decision,
one raw tmux invocation. All to handle two stuck polecats.

The deacon-killed-the-agent variant (the "murderous Deacon" warning,
`GASTOWN-CHEATSHEET.md:236`):

```bash
gt deacon pause                                # stop the killer
gt peek spectralSet/<polecat> 2>&1 | tail -50  # is it actually unhealthy?
# → "session was healthy at last heartbeat — deacon false-positive"
gt deacon resume                               # turn back on
# but: did anything else get killed? no way to tell from one command
gt mail inbox | grep -i 'killed\|nuked'        # hunt deacon's victims
```

## Friction points

1. **Three states (Working / Stalled / Zombie) — no UI shows them.** The
   operator must *infer* the state from session count, last activity,
   peek output, and check-recovery probe. The lessons doc nails the
   model; the CLI doesn't surface it.

2. **CLAUDE.md says `gt nuke <name>` (line 37). It's wrong.** The actual
   command is `gt polecat nuke <full-address>`. Documentation rot in the
   most operator-critical file. Observed twice in one real session.

3. **`gt nuke` and `gt polecat nuke` have different semantics.** One
   exists for some addressees (?) and the other for polecats. The
   operator can't tell from `gt --help` which to use without
   experimentation. Premature nukes destroy uncommitted work — the
   sandbox layer survives, but session state and any unsaved scratch is
   gone (`GASTOWN-LESSONS-AND-TIPS.md:138-149`).

4. **No `peek-and-decide` view.** Each `gt peek` is a separate command on
   one polecat. To compare 5 polecats and decide which to nuke, the
   operator runs 5 commands and holds 5 transcripts in their head.

5. **`gt polecat check-recovery` is the right probe — but it's invisible
   until you've broken something.** It only appears in `gt polecat --help`
   output. There is no path that says "before nuking, run recovery
   check." A recoverable polecat that gets nuked loses 1-30 minutes of
   work depending on session length.

6. **Session vs sandbox vs slot is invisible.** The lessons doc's
   three-layer model (`GASTOWN-LESSONS-AND-TIPS.md:138-149`) — "session
   count = resilience, high is good" — is the right mental model. But
   `gt polecat list` shows raw numbers without semantic interpretation.
   "session count: 12" looks alarming to a new operator; it is actually
   *healthy*.

7. **Deacon's kill log is not surfaced.** The cheatsheet warns of the
   "murderous Deacon" but offers no `gt deacon victims` or `gt deacon
   recent-actions` command. The operator hunts mail with `grep`.

8. **Re-slinging lost work has no continuity.** When the operator nukes
   obsidian (which had ss-XYZ on hook) and re-slings, the new polecat
   gets the bead but *does not get* "the previous polecat made it 60%
   through, branch is at polecat/obsidian-…-foo, here's their last
   commit." The new polecat starts from scratch.

9. **No "is the system healthy enough that I can stop watching"
   verdict.** After recovery, the operator wants confirmation: "all
   polecats either working or cleanly nuked, no orphans, deacon armed."
   They get this by running `gt polecat list`, `gt agents list`, `gt
   orphans procs list`, `gt deacon health-check`, mentally joining.

## What 'delightful' looks like in SpectralSet

A **Polecat Recovery** view that makes the three-state model visible and
the recovery decisions one-click.

- **State chip per polecat**: every polecat row in the agents view shows
  its state explicitly: `🟢 working` / `🟡 stalled (12m no activity)` /
  `🔴 zombie (session dead 3h ago)`. The classification runs server-side
  using the same heuristics a careful operator would use (heartbeat
  freshness, session liveness, peek diff). No per-polecat command
  required.

- **Three buttons per state, no others**:
  - Working → just one button: `Peek` (live transcript stream)
  - Stalled → `Peek`, `Nudge`, `Check Recovery`
  - Zombie → `Inspect Sandbox`, `Re-sling on fresh polecat`, `Nuke`
  Each button maps to the *correct* underlying command (no `nuke` vs
  `polecat nuke` choice). The operator never invokes the wrong subcommand.

- **Recovery preflight**: the `Nuke` button on a stalled polecat is
  *not* the primary action. The primary is `Check Recovery` —
  visually prominent. Nuke is secondary, with a tooltip: "this will
  end the session; sandbox preserved, but any unsaved scratch is lost."
  Nukes drop from impulsive to deliberate.

- **Three-layer health card**: each polecat's row shows three small
  badges: `Session: 12 (resilient)` `Sandbox: clean` `Slot: held`. The
  *interpretation* is rendered alongside the number — high session
  count gets a green "resilient" annotation, not an alarm.

- **Re-sling carries continuity**: when the operator chooses `Re-sling
  on fresh polecat` from a zombie's card, the new bead inherits a
  preamble: "Previous polecat (`obsidian`) made it to commit `abc1234`
  on `polecat/obsidian-…`; reuse what you can, don't re-litigate decisions
  visible in those commits." The fresh polecat starts at 60%, not 0%.

- **Deacon action log**: a side panel shows deacon's last 50 actions,
  filterable by type (`nuked`, `nudged`, `restarted`). The operator can
  ask "did deacon kill anything in the last hour?" without grepping
  mail. A `Pause Deacon` button is right next to it for the moment of
  panic.

- **System-OK verdict line**: at the top of the recovery view, one
  sentence: "All polecats green, 0 zombies, 0 orphans, deacon armed —
  last verified 9s ago." When that line is green, the operator knows
  they can leave the laptop.

The behavior we are killing: 10-command recovery dances, premature
nukes from CLI confusion, the operator's nagging fear that *something*
is silently wrong. Replace with: state chip is honest, recovery buttons
match the three states, three-layer health is interpreted not raw.
