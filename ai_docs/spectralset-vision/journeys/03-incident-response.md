# Journey 03 — Incident Response

> A Witness fires an escalation. Maybe Dolt is down. Maybe a polecat is
> corrupted. Maybe the refinery is wedged. The operator has 30 seconds to
> figure out what is broken, decide whether to act, and either fix it or
> punt. This is the journey where Gas Town's CLI hurts the *most*, because
> incident response is exactly when you cannot afford to be hunting flag
> names from `gt --help`.

## Trigger

- **Time of day**: any time, but disproportionately at 11pm and 5am
  (refinery patrol cycles, deacon scans)
- **Event**: an escalation mail lands. The CLAUDE.md describes the
  protocol: `gt escalate -s HIGH "Dolt: <symptom>"` from any agent → Mayor
  receives → critical ones notify the Overseer
  (`~/code/spectralGasTown/CLAUDE.md:115-122`)
- **Pain**: "Is this real or noisy? Do I have to do something *right now*
  or can I sleep on it? What evidence exists?"

## Current CLI steps

Real example reconstructed from `bd show` and the Mayor session log
(2026-04-19 evening). A `[HIGH] Dolt: server found stopped during refinery
patrol` escalation hit `hq-4wnx`:

```bash
# 1. Notice the new mail
gt mail inbox
# → ● [HIGH] Dolt: server found stopped during refinery patrol  hq-wisp-e9gqs

# 2. Read it
gt mail read hq-wisp-e9gqs
# → 50 lines: source agent, suspected cause, symptom, suggested next steps

# 3. Verify Dolt is *currently* up (the escalation may already be resolved)
gt dolt status 2>&1
# → ● :3307  production  PID 53066  (running — already recovered)

# 4. But what about the evidence the CLAUDE.md says to capture?
#    The CLAUDE.md is explicit (lines 99-113):
#    "BEFORE restarting Dolt, collect diagnostics."
#    But Dolt already recovered. Do I still capture? What about the
#    ORIGINAL stop event — where is that in the logs?
ls ~/gt/.dolt-data/
cat ~/gt/.dolt-data/dolt.pid           # is this from the new server or old?
ls -lht /tmp/dolt-hang-*.log           # any prior diagnostic captures?
# → typically: nothing. The agent that fired the escalation didn't capture.

# 5. Check who else noticed
gt peek spectralSet/refinery 2>&1 | tail -50
gt peek spectralSet/witness 2>&1 | tail -50
# → "patrol resumed at 02:14, no further dolt errors"

# 6. Decide: ack and move on, or escalate further?
gt escalate ack hq-wisp-e9gqs 2>&1
# → "acknowledged"

# 7. Document the incident? Where? The CLAUDE.md doesn't say. The
#    operator either: writes a note in their own scratch file, opens a
#    bead, or — most commonly — does nothing and forgets.
```

**Worse variant — corruption / stale patrol**: when the escalation is
about a polecat that's been on the same hook for 4 hours with no events
(stale), the operator runs:

```bash
gt peek spectralSet/<name>          # is it really stuck?
gt polecat list spectralSet         # is the session even alive?
tmux -L spectralgastown-<id> list-sessions | grep <name>
                                    # ← raw tmux because gt has no
                                    #   session-state introspection
gt polecat check-recovery spectralSet/<name>     # is this even the right command?
gt polecat --help | grep -i recover # ← had to grep help twice in real session
```

The Mayor session log shows this exact dance:

```
gt nuke obsidian
gt nuke quartz
gt polecat --help 2>&1 | head -30
gt polecat --help 2>&1 | tail -30
gt polecat nuke spectralSet/obsidian
gt polecat nuke spectralSet/quartz
gt polecat check-recovery spectralSet/obsidian
```

`gt nuke` failed silently — wrong subcommand. The operator had to read
`--help` *twice* to find `gt polecat nuke <full-address>`.

## Friction points

1. **Escalation is a fire-and-forget mail.** It tells you a thing
   *happened*. It does not tell you whether the thing is *still
   happening*. The operator must run 3-5 follow-up commands to convert
   "Dolt was stopped" → "Dolt is currently fine, no action needed."

2. **Evidence is not attached.** The CLAUDE.md mandates a goroutine dump +
   `gt dolt status` capture before restart, but escalations from agents
   rarely include them. The operator can't validate the agent followed
   protocol from the mail body alone.

3. **No "incident channel" — just inbox.** A HIGH escalation about Dolt
   sits next to a routine MERGED notification in `gt mail inbox`. Visual
   weight is identical except for one bullet color the
   lessons doc warns about (`GASTOWN-LESSONS-AND-TIPS.md:196-211`). At
   11pm with low alertness, the operator has missed escalations.

4. **Wrong-command tax in a hot moment.** `gt nuke` vs `gt polecat nuke`
   is a real footgun — observed twice in one session. CLAUDE.md says `gt
   nuke <name>` (line 37) which is *wrong*; the correct form is `gt
   polecat nuke <full-address>`. The operator doesn't have time to
   diagnose CLI syntax during an incident.

5. **Recovery commands are buried in `--help`.** `gt polecat
   check-recovery` is the canonical "is this fixable" probe. Nothing in
   `gt vitals`, `gt agents`, or the escalation mail surfaces it. You have
   to know it exists.

6. **No incident timeline.** After the operator acks, there's no record:
   when did the escalation fire? When did the operator look? When did
   they ack? When did the underlying condition resolve? `gt escalate
   ack` writes nothing to a timeline visible to the *human*. (It writes
   a Dolt commit, but the human can't read those.)

7. **No "while you were asleep" replay.** If 3 escalations fired between
   2am and 6am and all auto-resolved, the operator wakes up to 3 mails
   that all read "Dolt: server stopped" — same subject, no diff. They
   can't easily tell: was this *one* incident reported 3 times by 3
   agents, or 3 separate incidents?

## What 'delightful' looks like in SpectralSet

A dedicated **Incidents** view, not a mail filter — escalations are
*operationally distinct* from mail and should be modeled that way.

- **Live status badge per escalation**: each escalation card shows two
  states side by side: `Reported: Dolt stopped (02:14)` and `Now: ●
  running, PID 53066, 7 conn`. The card *self-resolves* visually when
  the condition is no longer present, but stays in the list for the
  operator to ack. No 3-command verification ritual.

- **Evidence bundle attached to every escalation**: when an agent fires
  `gt escalate`, the framework auto-collects: goroutine dump (for Dolt),
  `gt dolt status` snapshot, `gt vitals`, the relevant `gt peek` of the
  source agent's last 50 lines. Bundled into the escalation record.
  Operator sees them as expandable panels in the card. No "did the agent
  follow protocol?" anxiety.

- **Escalations are the loudest visual element on the entire UI** when
  any are open. Top of every page, red banner, count visible from
  peripheral vision. When zero open, banner disappears entirely. Visual
  weight matches operational weight.

- **Coalesce duplicates automatically**: 3 agents reporting the same
  Dolt outage in a 60s window collapse into one incident card with "3
  reporters: refinery, witness, deacon". Operator acks once. Saves the
  "wait, did I already deal with this?" cognitive double-take.

- **Action buttons match the runbook**: each escalation type has a
  declared runbook (Dolt, stale polecat, refinery wedged, …) and the
  card renders runbook actions as buttons. For Dolt: `Capture goroutine
  dump`, `Restart Dolt`, `Open dashboard`. Click does the right command,
  shows output inline. The operator never has to remember `kill -QUIT
  $(cat ~/gt/.dolt-data/dolt.pid)`.

- **Polecat-recovery one-click**: a stale-polecat escalation card has
  exactly four buttons: `Peek`, `Nudge`, `Check Recovery`, `Nuke`. Each
  resolves to the correct `gt polecat <subcommand> <full-address>`.
  No `--help` greps. No `gt nuke` vs `gt polecat nuke` confusion.

- **Incident timeline persisted**: every escalation has a permanent
  timeline visible on a dedicated page: fired → first viewed by operator
  → acked → resolved. Postmortems become a
  query, not an archaeology session.

The behavior we are killing: 30 seconds of `--help` greps and tmux fumbling
during a hot moment. Replace with: red banner → click → see
status-now-vs-then → click runbook button → done.
