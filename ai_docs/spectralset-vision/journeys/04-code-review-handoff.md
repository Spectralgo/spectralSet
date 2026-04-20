# Journey 04 — Code Review & Handoff Loop

> The most expensive journey in Gas Town: a polecat's PR was rejected by
> the refinery. Now the operator has to triage *why*, decide who fixes it,
> and run the rebase-resubmit loop until it lands. The lessons doc says
> "The Refinery spawns a FRESH polecat for conflict resolution. It NEVER
> sends work back to the original polecat" (`GASTOWN-LESSONS-AND-TIPS.md:228-233`).
> But the operator still has to *understand the failure* before that fresh
> polecat is useful — and that understanding is where the friction lives.

## Trigger

- **Time of day**: shortly after a sling cycle completes; especially
  painful when 3+ polecats finished in parallel and 1+ rejected
- **Event**: `MERGE_FAILED` or `REWORK_REQUEST` mail
  (`GASTOWN-LESSONS-AND-TIPS.md:200-211`)
- **Pain**: PR rejection mail tells you "it failed" but understanding
  *what* failed (test? lint? rebase conflict? acceptance criterion?)
  requires opening the rejected branch, reading refinery logs, and often
  re-running `pnpm typecheck` locally

## Current CLI steps

The operator gets a `MERGE_FAILED` mail for `polecat/jasper-rebrand-mobile-…`.
Real sequence:

```bash
# 1. Read the rejection
gt mail read hq-wisp-XXXXX
# → "Refinery rejected: typecheck failed"
# → "Branch: polecat/jasper-rebrand-mobile-a82c"
# → "Logs: ~/gt/spectralSet/refinery/logs/2026-04-19-23-14.log"

# 2. Read the refinery log
cat ~/gt/spectralSet/refinery/logs/2026-04-19-23-14.log
# → 400 lines: rebase output, then bun install output, then typecheck
#   output. Operator hunts for the actual error.

# 3. Pull the branch locally to investigate
cd ~/code/spectralSet
git fetch origin polecat/jasper-rebrand-mobile-a82c
git checkout polecat/jasper-rebrand-mobile-a82c
bun install                               # ~30s
bun typecheck 2>&1 | head -100            # find the error

# 4. Realize: the error is a stale import in a file *not touched by jasper*.
#    Someone else's PR landed first and changed the API. Jasper's branch
#    is stale.

# 5. Decide: fresh polecat with tighter spec, or sling rebase to a crew?
# 6a. New polecat path:
bd create "Re-do rebrand mobile (jasper's branch had stale imports)" \
  --rig spectralSet --description "..."
# → ss-XXX
gt sling ss-XXX spectralSet

# 6b. Or — what most operators actually do — they fix it themselves
#     "this is faster than respec'ing a polecat":
$EDITOR packages/mobile/src/foo.ts        # 30 second fix
git commit -am "fix: update import after API change"
git push
gt mq submit                              # resubmit to refinery

# 7. Wait for refinery
gt mq list spectralSet
# (poll, poll, poll)
gt mq status <id>
# → "rebasing... validating... PASS"
```

Real Mayor session shows the "fix-it-myself" temptation — even Mayor (which
is *forbidden* from coding by lessons doc rule #1) has to push back against
this every time:

```
gt peek spectralSet/jasper 2>&1 | tail -25     # is jasper still alive?
gt peek spectralSet/jasper 2>&1 | tail -20     # ← second check, 5min later
gt peek spectralSet/jasper 2>&1 | tail -20     # ← third check
```

Three peek cycles to decide whether to abandon jasper's branch and fresh-spawn.

## Friction points

1. **Rejection mail is a postcard, not a debugger.** "typecheck failed"
   tells you the *category*. The actual error string requires reading a
   400-line log file. The operator wants the failing line(s) inline.

2. **Local checkout is mandatory for understanding.** `gt mq status` shows
   "validation failed" but does not show the failing diff or the test
   name. To understand *why*, the operator must `git fetch && git
   checkout && bun install && bun typecheck` — about 90 seconds of
   environmental setup before they see the actual problem.

3. **The fork in the road has no decision aid.** Fresh polecat (slow,
   correct) vs operator self-fix (fast, breaks Law #1) is a judgment call
   made dozens of times per week. There is no UI to say "this rejection is
   small enough that a respec is ~10 minutes; here is the suggested
   delta-spec for the new polecat." So the operator self-fixes — and the
   audit trail rots.

4. **No diff between "what jasper changed" and "what landed since
   jasper's branch was cut".** Stale imports (the most common rejection
   cause) can be detected mechanically: which files did jasper touch, and
   which of those have `git log --since=<jasper-branch-cut>` activity?
   Today this analysis is human.

5. **Re-sling has no "consider the failure context" handoff.** When the
   operator does spawn a fresh polecat for the rebase, they have to copy
   the failure summary into a *new* bead description manually. The new
   polecat starts from zero — does not see the prior attempt's branch,
   does not see the refinery log, does not see "the previous polecat got
   95% of the way there but tripped on file X".

6. **Multiple parallel rejections compound.** When 3 of 4 parallel
   polecats reject, the operator has 3 separate `gt mail inbox` entries,
   3 separate logs in 3 separate paths, 3 separate `git checkout` cycles.
   No way to see "all three failed for the same root cause (stale schema
   import)" at a glance.

7. **Resubmit is a separate command, not a chat-with-the-failure.** The
   operator fixes the file locally. Now they have to remember `gt mq
   submit` (not `gt sling`, not `gt refinery push`, not anything
   intuitive). The fix-and-resubmit muscle memory is fragile.

8. **The polecat that failed is still alive.** Until the operator
   explicitly nukes jasper, jasper's tmux session and worktree consume
   resources. There is no auto-quarantine on `MERGE_FAILED`.

## What 'delightful' looks like in SpectralSet

A **Rejection Triage** view that opens automatically when a `MERGE_FAILED`
or `REWORK_REQUEST` lands.

- **Inline failing-fragment, not log link**: the rejection card renders
  the actual failing assertion / typecheck error / test name, with 5
  lines of code context, *in the card*. The link to the full log is a
  secondary affordance. 90% of triage decisions can be made from the
  fragment alone.

- **Failure diagnosis chip**: the framework auto-classifies failures into
  ~6 categories (`stale-imports`, `test-regression`, `lint`, `rebase-conflict`,
  `build-error`, `other`) by parsing the refinery log. The card shows the
  classification as a chip; operator can scan 3 rejections and see "all
  three are `stale-imports` — root cause: a schema PR landed at 22:10."

- **"Stale-since" timeline**: for every rejected branch, show: branch cut
  at `T`, files-touched-since-`T` (with a ⚠ next to each touched file the
  branch also modified). The "your branch is 12 hours behind, these 4
  files conflict" verdict is rendered, not deduced.

- **Fork-in-road decision panel**: two buttons in the card: `Respin
  fresh polecat (auto-spec from failure context)` and `Self-fix
  locally`. The first button generates a delta-bead with the original
  spec + a "previous attempt failed because X, focus on Y" prepend, and
  spawns a fresh polecat — no manual bead authoring. The second opens
  the file in the operator's editor via `cursor://`-style URL with the
  failing line pre-positioned.

- **Resubmit is part of the same surface**: the fix-locally flow shows a
  "Push & resubmit" button after the operator commits. No `gt mq
  submit` muscle memory required.

- **Auto-quarantine on rejection**: when a polecat's branch is rejected,
  the framework auto-pauses the polecat (does not nuke — preserves the
  worktree for inspection) and shows a `Nuke` button on the rejection
  card. Resources free themselves by default.

- **Cross-rejection root-cause grouping**: when 3 rejections all
  classify as `stale-imports` against the same just-landed PR, the
  view groups them into one collapsible parent and offers a single
  "Respin all three with auto-rebase context" action.

The behavior we are killing: 90 seconds of local setup to understand a
rejection, plus the temptation to self-fix because that's faster than
respec. Replace with: rejection card answers "what went wrong" inline,
respin button generates the corrective spec automatically, the operator
never has to break Law #1.
