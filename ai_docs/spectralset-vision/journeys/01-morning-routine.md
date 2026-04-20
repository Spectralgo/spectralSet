# Journey 01 — Morning Routine

> A founder running 6+ rigs wakes up. Eight agents ran overnight. What broke?
> What landed? Whose work needs me? This is the highest-frequency journey —
> it happens every morning, every coffee break, every "let me check in"
> moment. If this journey is painful, the whole product feels painful.

## Trigger

- **Time of day**: 7:30am, before first meeting
- **Event**: Operator opens laptop, wonders what 8 overnight polecats accomplished
- **Pain**: "Did anything land? Is anything stuck? Do I need to babysit before standup?"

The operator has *no idea* of system state. They left at 11pm with 3 active
convoys, 8 polecats slung, and a refinery patrol running. Anything could
have happened.

## Current CLI steps

Reconstructed from a real Mayor session log
(`~/.claude/projects/-Users-spectralgo-code-spectralGasTown-mayor/43e036f1-cf2b-4066-a5fe-5fda9523aac4.jsonl`,
2026-04-19 evening into 2026-04-20 morning). The Mayor — which is the
*operator's proxy* — issued these commands in sequence to reconstruct state:

```bash
gt hook                                   # what was I doing last?
gt mail inbox                             # 5 unread, 12 read-but-unprocessed
gt mail read hq-ycyd                      # urgent? maybe?
gt mail read hq-dvlt                      # another urgent? maybe?
gt mail read hq-wisp-vdzsv                # third urgent? maybe?
gt polecat list --all 2>&1 | head -60     # who's alive?
gt vitals 2>&1 | head -80                 # one-shot dashboard
gt escalate ack hq-wisp-e9gqs 2>&1        # ack the dolt P1 escalation
gt peek spectralSet/jasper 2>&1 | tail -40
gt peek spectralSet/obsidian 2>&1 | tail -40
gt peek spectralSet/quartz 2>&1 | tail -40
gt mq list spectralSet 2>&1 | head -30
gt mail read hq-wisp-wa3kj
gt mail read hq-wisp-qphaj
gt mail read hq-wisp-b8atb
```

That is **15 commands before the operator has a single coherent picture**.
And we haven't done anything productive yet — every command is pure
information-gathering.

Sample output that surfaced from `gt vitals`:

```
Dolt Servers
  ● :3307  production  PID 53066  201.4 MB  7/1000 conn  0s

Databases (7 registered)
  Rig          Total  Open  Closed     %
  gmux            61     9      51   83%
  hq             219    99     113   51%
  spectralChat     6     1       5   83%
  spectralSet     54     6      45   83%
```

And from `gt ready`:

```
town/ (10 items)
  [P0] hq-xc3 FIX P0: ESLint config broken — restore linting
  [P0] hq-29z FIX: Dashboard bugs B1-B4 + high priority H1-H6
  [P0] hq-hf0 PHASE 1.5: Apply 5 design addendums
  ...
spectralSet/ (1 items)
  [P2] ss-u72 Rebrand followup: @superset/mobile → @spectralset/mobil...
Total: 15 items ready (5 P0, 9 P1, 1 P2)
```

The data is *there*. It is in 6 different commands' output. The operator
must mentally join them.

## Friction points

Ranked by pain.

1. **No "morning page".** There is no single command that answers "what
   should I care about right now?" The operator runs `gt vitals`, `gt mail
   inbox`, `gt ready`, `gt polecat list --all`, `gt mq list <rig>` —
   *separately, per rig, with mental joins*. The same Mayor session above
   ran `gt peek spectralSet/jasper` four separate times because the operator
   forgot what jasper was working on between other commands.

2. **Mail triage is brutal.** 5 unread + 12 read-but-unprocessed. Each one
   requires `gt mail read <id>` to even see the subject body, then a mental
   decision: ack? archive? action? Subjects like `hq-wisp-qoo05` are
   information-free — the ID tells you nothing about urgency, sender, or
   subject without a second command.

3. **Cross-rig blindness.** `gt ready` shows 15 P0/P1 items across 7 rigs.
   But "is *my* rig (`spectralSet`) blocked?" requires squinting through a
   wall of `hq-`, `gm-`, `ss-` IDs and remembering which prefix maps to
   which rig.

4. **No "what changed overnight" view.** `gt changelog` exists but isn't
   instinctive. The operator wants: "since I went to bed, X PRs landed, Y
   beads closed, Z polecats died, W escalations fired." Instead they
   reconstruct it from `gt mail inbox` chronology + `gt mq list` + `gt
   peek`.

5. **Escalation acks are second-class.** `gt escalate ack hq-wisp-e9gqs` is
   a separate command from `gt mail read hq-wisp-e9gqs`. The operator must
   remember which mail items are escalations needing acks vs informational.

6. **Bead ID short-term memory tax.** The operator copies `hq-wisp-e9gqs`
   from one command's output, types it into the next, makes a typo, retries.
   Every cross-reference burns ~5 seconds and breaks flow.

7. **No "all clear" signal.** When everything is healthy, the operator still
   has to *check* everything to know it. There is no "3 green lights" view
   that says "go drink coffee, the system is fine."

## What 'delightful' looks like in SpectralSet

A **Morning Dashboard** route (`/morning` or just the home page when
opened before noon local time) that pre-renders without any user input:

- **Hero block — "Since you slept" (timestamp-aware)**: 4 metrics in a
  single card: `12 PRs merged · 3 PRs awaiting review · 1 escalation acked
  by deacon · 8 polecats still alive`. Each metric is clickable — drilldown
  opens a side panel, not a route change, so the operator keeps their place.

- **Triage stack (top of viewport)**: every escalation, every MERGE_FAILED,
  every REWORK_REQUEST, rendered as a **card with the bead title visible
  inline** (not the ID). Each card has 3 buttons: `Ack`, `Open`, `Snooze`.
  Ack does the equivalent of `gt escalate ack <id>` in one click. No
  copying IDs. Cards disappear when handled.

- **Per-rig "is my rig OK" strip**: one row per rig (gmux, spectralSet,
  spectralChat, …). Each row has a single colored dot — green / amber /
  red — and a one-line *reason*: "spectralSet: 1 polecat stalled 3h, 0
  ready work" vs "gmux: 4 P0 ready, no slings, refinery idle (stranded
  convoy)". Hovering shows the source command (`gt vitals`, `gt ready
  --rig gmux`) so power users can verify.

- **"Untouched mail" pile, collapsible**: the 12 read-but-unprocessed mails
  rendered as a stack with snippets. Bulk-archive button. Bulk-mark-read
  is *not* the same thing — distinct intentions.

- **The "go drink coffee" badge**: when triage stack is empty, every rig is
  green, and merge queue is flowing, the page renders a single line:
  "Everything is fine. Last verified 14s ago." That sentence is what the
  operator is *actually* paying for.

The behavior we are killing: the 15-command shell archaeology session.
Replace with one HTTP request that pre-joins everything Mayor would have
joined in their head.
