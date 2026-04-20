# CLI Pain Inventory — gt + bd (Top-20 must-be-a-button)

**Discovery:** DISC-A3 (ss-zzu)
**Author:** `spectralSet/crew/gastown_researcher`
**Date:** 2026-04-20
**Status:** READ-ONLY inventory. No mutations, no experiments.
**Purpose:** Identify the 20% of `gt` + `bd` subcommands that consume 80% of daily terminal time so the SpectralSet cockpit knows which objects to make first-class.

**Sources (all evidence cited):**
- `gt --help` / `bd --help` + recursive subcommand help (enumerated 2026-04-20)
- `~/code/spectralGasTown/GASTOWN-CHEATSHEET.md`
- `~/code/spectralGasTown/GASTOWN-BEST-PRACTICES.md`
- `~/code/spectralGasTown/GASTOWN-LESSONS-AND-TIPS.md`
- Overseer session transcripts under `~/.claude/projects/-Users-spectralgo-code-spectralGasTown/` (quoted verbatim in §5)
- Live observations from the current crew session (flagged inline)

---

## 1. Raw command tree

110 `gt` top-level commands, 105 `bd` top-level commands, ~360 subcommands total.

### gt (top-level, grouped as `gt --help` groups them)

**Work Management**
- `assign`, `bead` → `move / read / show`
- `cat`, `changelog`, `cleanup`, `close`, `commit`, `compact` → `report`
- `convoy` → `add / check / close / create / land / launch / list / stage / status / stranded / unwatch / watch`
- `done`, `forget`, `formula` → `create / list / overlay / run / show`
- `handoff`, `hook` → `attach / clear / detach / show / status`
- `mol` → `attach / attach-from-mail / attachment / await-signal / burn / current / dag / detach / progress / squash / status / step`
- `mountain` → `cancel / pause / resume / status`
- `mq` → `integration / list / next / post-merge / reject / retry / status / submit`
- `orphans` → `kill / procs`
- `prune-branches`, `ready`, `release`, `resume`
- `scheduler` → `clear / list / pause / resume / run / status`
- `show`, `sling` → (+ `respawn-reset` subcmd)
- `synthesis` → `close / start / status`
- `trail`, `unsling`, `wl` → `browse / charsheet / claim / done / join / post / scorekeeper / show / stamp / stamps / sync`

**Agent Management**
- `agents`
- `boot` → `spawn / status / triage`
- `callbacks` → `process`
- `deacon` → `attach / cleanup-orphans / feed-stranded / feed-stranded-state / force-kill / health-check / health-state / heartbeat / pause / redispatch / redispatch-state / restart / resume / stale-hooks / start / status / stop / zombie-scan`
- `dog` → `add / call / clear / dispatch / done / health-check / list / remove / status`
- `mayor` → `acp / attach / restart / start / status / stop`
- `polecat` → `check-recovery / gc / git-state / identity / list / nuke / pool-init / prune / remove / stale / status`
- `refinery` → `attach / blocked / claim / queue / ready / release / restart / start / status / stop / unclaimed`
- `role`, `session` → `at / capture / check / inject / list / restart / start / status / stop`
- `signal` → `stop`
- `witness` → `attach / restart / start / status / stop`

**Communication**
- `broadcast`, `dnd`, `escalate` → `ack / close / list / show / stale`
- `mail`, `notify`, `nudge`, `peek`

**Services**
- `daemon` → `clear-backoff / enable-supervisor / logs / rotate-logs / start / status / stop`
- `dolt` → `cleanup / dump / fix-metadata / flatten / init / init-rig / kill-imposters / list / logs / migrate / migrate-wisps / pull / rebase / recover / restart / rollback / sql / start / status / stop / sync`
- `down`, `estop`, `maintain`, `quota` → `clear / rotate / scan / status / watch`
- `reaper` → `auto-close / databases / purge / reap / run / scan`
- `shutdown`, `start`, `thaw`, `up`

**Workspace**
- `crew` → `add / at / list / pristine / refresh / remove / rename / restart / start / status / stop`
- `git-init`, `init`, `install`
- `namepool` → `add / create / delete / reset / set / themes`
- `rig` → `add / boot / config / dock / list / park / reboot / remove / reset / restart / settings / shutdown / start / status / stop / undock / unpark`
- `worktree` → `list / remove`

**Configuration**
- `account`, `completion`, `config` → `agent / agent-email-domain / cost-tier / default-agent / get / set`
- `directive`, `disable`, `enable`, `hooks` → `base / diff / init / install / list / override / registry / scan / sync`
- `issue`, `plugin` → `history / list / run / show / sync`
- `shell`, `theme`, `uninstall`

**Additional (not grouped in help)**
- `activity`, `audit`, `checkpoint`, `costs`, `cycle`, `dashboard`, `feed`, `gt` (self-ref), `health`, `heartbeat`, `info`, `krc`, `log`, `memories`, `metrics`, `patrol` → `digest / new / report / scan`, `prime`, `remember`, `repair`, `seance`, `stale`, `status`, `tap`, `thanks`, `town`, `upgrade`, `version`, `vitals`, `warrant` → `execute / file / list`, `whoami`

### bd (top-level, grouped as `bd --help` groups them)

**Working With Issues**
- `assign`, `children`, `close`, `comment`, `comments` → `add`
- `create`, `create-form`, `delete`, `edit`
- `gate` → `add-waiter / check / discover / list / resolve / show`
- `label` → `add / list / list-all / propagate / remove`
- `link`, `list`
- `merge-slot` → `acquire / check / create / release`
- `note`, `priority`, `promote`, `q`, `query`, `reopen`, `search`, `set-state`, `show`, `state`
- `tag`, `todo` → `add / done / list`
- `update`

**Views & Reports**
- `count`, `diff`, `find-duplicates`, `history`, `lint`, `stale`, `status`, `statuses`, `types`

**Dependencies & Structure**
- `dep` → `add / cycles / list / relate / remove / tree / unrelate`
- `duplicate`, `duplicates`
- `epic` → `close-eligible / status`
- `graph`, `supersede`
- `swarm` → `create / list / status / validate`

**Sync & Data**
- `backup`, `branch`, `export`
- `federation` → `add-peer / list-peers / remove-peer / status / sync`
- `import`, `restore`
- `vc` → `commit / merge / status`

**Setup & Configuration**
- `bootstrap`, `config` → `apply / drift / get / list / set / set-many / show / unset / validate`
- `context`
- `dolt` → `clean-databases / commit / killall / pull / push / remote / set / show / start / status / stop / test`
- `forget`, `hooks` → `install / list / run / uninstall`
- `human`, `info`, `init`, `kv` → `clear / get / list / set`
- `memories`, `onboard`, `prime`, `quickstart`, `recall`, `remember`, `setup`, `where`

**Maintenance**
- `batch`, `compact`, `doctor`, `flatten`, `gc`
- `migrate` → `hooks / issues / sync`
- `preflight`, `purge`, `rename-prefix`, `rules`, `sql`, `upgrade`
- `worktree` → `create / info / list / remove`

**Integrations & Advanced**
- `admin` → `cleanup / compact / reset`
- `jira` → `pull / push / status / sync`
- `linear` → `pull / push / status / sync / teams`
- `repo` → `add / list / remove / sync`

**Additional**
- `ado` → `projects / pull / push / status / sync`
- `audit` → `label / record`
- `blocked`, `completion`, `cook`, `defer`, `formula` → `convert / list / show`
- `github` → `pull / push / repos / status / sync`
- `gitlab` → `projects / pull / push / status / sync`
- `help`, `mail`, `mol` → `bond / burn / current / distill / last-activity / pour / progress / ready / seed / show / squash / stale / wisp`
- `notion` → `connect / init / pull / push / status / sync`
- `orphans`, `ready`, `rename`, `ship`, `undefer`, `version`

---

## 2. Top-20 must-be-a-button — ranked

Ranking criterion: *frequency in daily operation × cost of the current terminal chain × number of distinct contexts the user must hold in their head to get it right*. Rank 1 is highest priority to buttonize.

| # | Command | Panel | State/Context Needed | Output surface |
|---|---|---|---|---|
| 1 | `gt peek <addr> [N]` | Agent row (every panel) | current rig, selected agent address, current rig auto-prefix | Full detail view (live tmux mirror, scroll-follow). Right-click "open in tmux" escape hatch. |
| 2 | `gt sling <bead> <target> [--merge mr\|direct\|local] [--args ...]` | Bead inspector + Agent row | currently-selected bead, target rig, default merge strategy per rig | Toast "Slung ss-xxx → jasper" → Agent row flips to Working state inline. |
| 3 | `gt mail inbox` / `gt mail read <id>` | Mail panel | agent identity (for `--identity`), unread-only toggle | Full inbox view + reading pane. Mark read on open. |
| 4 | `gt mail send <addr> -s <subj> [--stdin] [--pinned]` | Mail panel compose | recipient autocomplete (rigs/agents), current identity | Inline composer with `--pinned` / `--stdin` as toggle + drag-drop file. |
| 5 | `gt nudge <target> "..."` | Agent row + Mail panel | target resolution, message field | 1-click on any agent row ("Nudge…" → inline text field → Enter). Toast confirms delivery. |
| 6 | `gt hook` / `gt unsling` | Agent row header | the agent this panel represents | Hook is HERO element on Agent card — bead ID + title. "Unsling" = secondary action in kebab. |
| 7 | `gt convoy list` / `gt convoy status <id>` | Convoy board | current rig filter, "stranded only" toggle | Board view: convoy cards with swarm dots. Stranded = amber badge (primary alert per `KNOWLEDGE-BRIEF-V2.md` §6). |
| 8 | `gt refinery queue <rig>` + `gt mq list <rig>` | Refinery / MQ panel | current rig | Pipeline view: rebase → validate → merge, MR cards at their stage. Reject/retry buttons on each. |
| 9 | `gt polecat list <rig> [--json]` | Rig panel | current rig, include-nuked toggle | Polecat strip: name · state (Working/Stalled/Zombie) · hook bead · session count. NO "idle" row — see `LESSONS §5`. |
| 10 | `gt polecat nuke <rig>/<name> [--force] [--dry-run]` | Agent row kebab + bulk | selected polecat(s), safety-check status | Confirm dialog that surfaces the 3 safety checks (unpushed / open MR / hooked work). `--force` = toggle with warning. |
| 11 | `gt doctor` / `gt doctor --fix` / `gt vitals` | Diagnostics panel | last heartbeat + known-fix list | Button triplet. Auto-wraps with `timeout 30` per cheatsheet's warning. |
| 12 | `gt handoff [-c]` | Agent row header | current session's context gatherable via `-c` | Primary action on any long-running Claude session. Replaces the `/clear` footgun (`LESSONS §16`). |
| 13 | `gt ready` / `bd ready` | Bead inspector sidebar | current rig + active filters | "Ready work" feed docked to Bead inspector. Click bead → inspect. Shift-click → sling. |
| 14 | `bd show <id>` / `bd list [--rig]` / `bd search <q>` | Bead inspector | rig filter, query string | Full-text search bar + detail pane. Replaces `cat` + `comments` + `history` pattern. |
| 15 | `bd create "..." [--rig] [--labels] [--pin]` | Bead inspector compose | current rig prefix (`LESSONS §9` — MUST NOT default to `hq-`) | Dialog with rig dropdown defaulted to current, labels chip-field, pin toggle. |
| 16 | `bd update <id>` / `bd close <id>` / `bd reopen <id>` / `bd priority` / `bd set-state` | Bead inspector | selected bead + field being changed | Inline edit on bead detail — no command needed, just click-to-edit. |
| 17 | `gt prime` | Agent row header | the agent being primed | Button on any Claude agent card. Replaces "I forgot what I was doing" manual typing. |
| 18 | `gt convoy create "name" [--owned] [--merge ...]` + `gt convoy land <id>` | Convoy board | rig, merge strategy, bead-set | "+ New Convoy" button + per-convoy kebab "Land". `LESSONS §8` — stale convoys accumulate. |
| 19 | `gt crew at <name>` / `gt crew start/stop/restart <name>` | Crew panel | rig, crew name | Row-per-crew with Attach / Start / Stop / Refresh buttons. Mirrors Agent row semantics. |
| 20 | `gt agents` / `gt status --json` | Global header + auto-detect | token: none (global) | ALWAYS-ON health strip at top of cockpit; also the source of truth for SpectralSet probe auto-detection — **use `gt status --json` → `.location` + `.rigs[]`, never just `gt --version`.** |

### Ranking notes

- **1 & 5 tie for #1 by frequency**; `gt peek` wins because it's the verb the operator uses to answer *"what is this agent saying right now?"* — and the cheatsheet explicitly enshrines it ("`gt peek` to observe, `gt nudge` to communicate — never raw tmux", `CHEATSHEET §Key Rules`).
- **#2 `gt sling`** is the single most-semantically-rich command (help text: 85 lines of flags). Every flag is a choice the operator currently holds in their head. A panel can default most of them from the bead's auto-convoy settings.
- **#9 and #10** together are the most dangerous pair. Panels that show polecats MUST enforce the three-state model (`LESSONS §5`) and MUST surface nuke safety checks. Getting this wrong = data loss.
- **#11 Diagnostics.** The cheatsheet wraps `gt doctor` with `timeout 30` because it can hang. Any UI button that invokes it must wrap identically — never block the UI thread on a gt subprocess that may never return.
- **#20 Auto-detection.** This is a standing order from A3: the SpectralSet probe that decides "is Gas Town installed here?" must call `gt status --json` and parse `.location` (town root absolute path) + `.rigs[]` (name, polecat_count, crew_count, has_witness, has_refinery, agents[]). `gt --version` only confirms the binary exists and tells the probe nothing useful.

---

## 3. Command grouping by cockpit object

The cockpit's first-class nouns fall out of this grouping. Each noun should map to ONE panel and one detail view.

### Agent (polecat | crew | mayor | refinery | witness | deacon | dog)
**Primary verbs:** `peek`, `nudge`, `handoff`, `hook`, `unsling`, `prime`, `sling` (as target), `nuke` (polecat-only), `attach` (via role subcommands), `restart`, `stop`, `start`, `status`.

**Insight:** 9 of the top-20 commands act on an Agent. Agent is the most-first-class noun in the cockpit. Every panel that displays an Agent row MUST show hook + state + last-activity, and the row MUST carry peek/nudge/handoff as 1-click affordances.

### Bead (issue)
**Primary verbs:** `bd create`, `bd show`, `bd list`, `bd search`, `bd update`, `bd close`, `bd reopen`, `bd priority`, `bd set-state`, `bd note`, `bd comment`, `bd assign`, `bd link`, `bd dep *`, `bd ready`, `bd defer`, `bd promote`, `bd history`.

**Insight:** Every bead verb has a daily equivalent to "fill a form field and hit save". None of them deserve their own CLI command in a GUI world — they collapse to click-to-edit on a single detail view.

### Convoy (swarm-of-work)
**Primary verbs:** `gt convoy create / list / status / add / stranded / watch / unwatch / land / launch / stage / close / check`.

**Insight:** The Stranded alert is THE primary indicator for "is the steam engine running?" (`KNOWLEDGE-BRIEF §6`, `LESSONS §8`). A stranded convoy must be a full-row amber alert, not a secondary badge.

### Mail
**Primary verbs:** `gt mail inbox / read / send`, `gt nudge`, `gt broadcast`, `gt escalate`.

**Insight:** Mail and nudge are distinct: mail persists (Dolt commit per message — `CLAUDE.md` §Communication hygiene); nudge is ephemeral. The compose UI should default to nudge and make mail an explicit upgrade for anything that must survive session death.

### Rig (and Town)
**Primary verbs:** `gt rig list / add / park / unpark / dock / undock / boot / shutdown / restart / config / settings / status`, plus town-level `gt up / down / start / shutdown / vitals / status / doctor / feed`.

**Insight:** The Rig panel is a meta-panel — it hosts Witness, Refinery, polecats, crew. Every other first-class noun (except town-level agents) is scoped to a Rig. The cockpit must ALWAYS show current-rig breadcrumb.

### Merge Request (MR) / Merge Queue
**Primary verbs:** `gt mq list / next / retry / reject / submit / status / post-merge / integration`, `gt refinery queue / ready / blocked / claim / release / unclaimed`.

**Insight:** MQ is a *view over beads* filtered by state, not a separate object store. The panel should be a stage-layout of the canonical merge pipeline (Witness → Rebase → Validate → Land). Failures (MERGE_FAILED, REWORK_REQUEST) demand red treatment per `LESSONS §10` / `KNOWLEDGE-BRIEF §7`.

---

## 4. Command grouping: **cockpit object taxonomy**

```
Cockpit first-class nouns        Secondary (surfaced inside primary panels)
──────────────────────────       ──────────────────────────────────────────
Agent                       →    Session (health metric on Agent)
  └─ polecat/crew/mayor/           Sandbox (git worktree — cockpit shows branch + dirty)
     refinery/witness/              Slot (name — part of agent identity)
     deacon/dog
                             →    Hook (the pinned bead — lives on Agent)
Bead                        →    Label / Tag / Priority (inline-edit)
  └─ issue / wisp / epic          Comment / Note / History (tabs on Bead detail)
                                  Dep / Link (graph edges)
Convoy                      →    Stranded state (alert)
  └─ swarm dots                   Merge strategy (convoy-level setting)

Mail                        →    Mail types (8 — typed rendering per LESSONS §10)
Rig                         →    Hooks (git/claude settings.json)
                                  Config (4 layers: wisp/bead/town/system)
Merge Request (MR)          →    Refinery stage (rebase/validate/land)
Molecule / Formula          →    Step (progress tick)
                                  Wisp (ephemeral scaffolding around a bead)

Town (global)               →    Daemon / Deacon / Boot / Dog (watchdog chain)
                                  Dolt (data plane; fragile per CLAUDE.md)
                                  Tmux (session registry)
```

Everything else in the command tree is *operation on one of these nouns*. The surface looks massive; the nouns are few.

---

## 5. Friction verbatim — 10 quotes

Each quote is a real moment where the operator or an agent typed a chain of commands to achieve what should have been one action. Quotes 1–7 pulled verbatim from `~/.claude/projects/-Users-spectralgo-code-spectralGasTown/f75904c8-3d42-45d2-ba3e-94e6dc522d22.jsonl`; quote 8 from the companion worktree-model research session; quotes 9–10 from the live A3 crew session.

1. **Nudge vs send-keys re-learned:** *"You're right — I keep falling back to tmux send-keys when I have `gt nudge` for exactly this reason. The Enter gets lost."* → A 1-click Nudge button on every agent row removes the tmux-keys footgun entirely.

2. **Standing order drifts:** *"Lesson re-learned: **always `gt nudge`, never `tmux send-keys`**. The memory says it, I keep ignoring it."* → The cockpit should be the *only* path to deliver an agent message, so muscle memory has nowhere else to go.

3. **Idle Mayor cold start:** *"Queue nudge sent but won't fire until Mayor's next turn. The problem: Mayor is idle at prompt, no hook will trigger. I need to wake him."* → Nudge button needs an "and wake the session" affordance visible from the Agent row.

4. **Post-compaction hook loss:** *"Beads still `IN_PROGRESS` — polecats stalled after compaction (lost their context). Need to nudge them to check hooks."* → A Stalled-agent badge with a one-click "Nudge to reread hook" action.

5. **Nuke-and-re-sling chain:** *"Polecats processed the nudge but went back to idle — they lost their hook context. Need to nuke and re-sling."* → "Nuke + Re-sling same bead" should be a single menu item that preserves the bead assignment through the nuke.

6. **`gt done` stalls; ambiguous success:** *"Wait — Mayor says the polecats DID push their work but `gt done` stalled. The commits might be on origin. Let me check."* → Agent card must show "last push timestamp" distinct from "gt done status" so the operator sees push-succeeded / done-stuck at a glance.

7. **Merged-then-sling-next chain:** *"Bead 1 is MERGED — commit `e4abc01`, 941 files renamed. The refinery also cleaned up a pollution commit. Now I need to nudge Mayor to sling bead 2."* → Convoy auto-progression: when a bead lands, the next ready bead in the convoy auto-offers a sling dialog with the matching polecat preselected.

8. **Auto-detection typed manually:** *"There it is. **`gt status --json` returns the town root at `.location`.**"* → The SpectralSet probe should call `gt status --json` directly, not make the operator prove-it-works by shell one-liner. `.rigs[]` gives the full rig enumeration for free.

9. **Unknown-flag gotcha:** live session A3 today — `gt mail inbox --pinned` rejected with `unknown flag: --pinned`. The flag exists on `gt mail send`, not `gt mail inbox`. → A GUI inbox with a "Pinned" filter toggle can't make this mistake.

10. **Role-specific command rejection:** live session A3 today — `gt done` refused with `"gt done is for polecats only (you are spectralSet/crew/gastown_researcher)"`. The CLI has no role-aware autocomplete; the operator discovers role-invalid commands at runtime. → Cockpit shows only role-valid actions on each Agent row (no "Done" button on a crew card).

Cross-check from the reference docs (not session-transcript quotes, but codified pain from 200+ directives):

> *"gt doctor (may hang — use `timeout 30` for safe version)"* — `CHEATSHEET §Diagnostics`.
> *"NEVER use `/clear` on Mayor. It wipes context with no recovery."* — `LESSONS §16`.
> *"Refinery branch override must be re-sent after every restart."* — `LESSONS §14`.
> *"NEVER pipe `tsc` directly — save to file first."* — `LESSONS §2` / `BEST-PRACTICES §8`.

---

## 6. Anti-patterns — commands that should NEVER be buttonized

These commands are kept CLI-only on purpose. Buttonizing them would either trigger data loss from a misclick, require a confirmation flow too heavy for GUI context, or break the invariant that the CLI is authoritative.

### Destructive / lose-work-on-misclick
| Command | Why no button |
|---|---|
| `gt down --nuke` | Kills the whole tmux server. The cheatsheet puts this in "Emergency Procedures" for a reason. A GUI confirmation dialog competing with session state is how operators click through and regret it. Keep it in the terminal where the intent is explicit. |
| `gt estop` / `gt thaw` | Town-wide freeze. Must be typed deliberately. |
| `gt shutdown` | Irreversible. Same reasoning. |
| `gt dolt stop` / `gt dolt kill-imposters` / `gt dolt rollback` | Dolt is the data plane for *all beads, mail, identity* (`CLAUDE.md` §Dolt Server). Docs explicitly say "do NOT just `gt dolt stop && gt dolt start`" without capturing diagnostics first. A button short-circuits the diagnostic step. |
| `bd admin reset` / `bd dolt killall` / `bd dolt clean-databases` | Wipes bead DB state. No meaningful confirmation flow in a panel. |
| `bd delete` | Bead deletion is destructive and rarely justified (`bd close` is almost always right). |
| `gt rig remove` / `gt crew remove --force` / `gt polecat nuke --force` | `--force` bypasses the safety checks. If the safety checks exist, the cockpit's job is to surface them, not to bypass. |
| `bd flatten` / `bd compact` / `gt reaper purge` | Irreversible history rewrites. |
| `gt prune-branches` / `gt polecat gc --force` | Destructive reaping. |

### Ambiguous / needs-context-typed-in
| Command | Why no button |
|---|---|
| `bd sql` / `gt dolt sql` | Free-form SQL against the bead DB. A panel can't usefully constrain this. |
| `gt warrant execute / file` | Arbitrary remote command execution. Needs careful shell-level audit. |
| `gt scheduler run` | Triggers cron-like side effects; the invocation context matters. |
| `bd migrate *` | Schema migrations need to run in a known shell env with backups. |
| `gt hooks override / scan` | Rewrites agent settings.json files; panel can't preview all effects. |

### CLI-authoritative by design
| Command | Why no button |
|---|---|
| `gt commit` / `bd vc commit` | Commits should flow from the polecat/refinery pipeline, not a click. Overseer committing bypasses the Refinery invariant (`LESSONS §1`: "Refinery merges, humans don't"). |
| `gh pr merge` (via any `gt` alias) | Same — violates Refinery invariant. |
| `gt done` | Polecat-only self-cleanup verb. Buttonizing invites a human to "finish" for an agent, which breaks attribution. |
| `gt sling` with `--account` / `--agent` / `--ralph` overrides | These are expert-mode flags that rarely map to UI affordances without hiding them behind an advanced drawer — at which point the CLI is clearer. |
| `/clear` (Claude Code) | Not a gt command but the operational equivalent — `LESSONS §16` is explicit: NEVER. |

### Rare + complex-flag combos
`bd cook`, `bd formula convert`, `gt formula overlay`, `gt warrant *`, `gt wl *` (wasteland federation), `gt namepool set`, `gt plugin run`, `gt reaper run`, `gt synthesis *`, `bd federation *`, `bd merge-slot acquire/release`, `bd ship`, `bd rename-prefix` — weekly-ish at best, varied flag combos, power-user territory. Nice-to-have dropdowns in a future "Advanced" drawer; not in v1.

---

## 7. Classification summary (full tree)

For every command, the matrix is *button / nice / cli-only*. Counts:

| Bucket | Count | Meaning |
|---|---|---|
| **must-be-a-button** | 20 | Listed in §2. Daily, quick, obvious UI mapping. |
| **nice-to-have** | ~55 | Weekly-ish; belongs in panel kebabs or advanced drawers. Examples: `gt convoy stage`, `gt mol attach`, `gt scheduler list`, `bd dep tree`, `bd graph`, `bd epic status`, `gt rig config`, `gt hooks diff`, `gt namepool list`, `gt patrol digest`, `gt seance`, `bd find-duplicates`, `bd lint`, `bd preflight`, `bd backup`, `bd export`. |
| **cli-only-forever** | ~285 | Admin, dolt internals, formula/molecule authoring, federation, integration sync loops (`bd jira / ado / gitlab / notion`), and all destructive verbs from §6. |

The dominant signal: **~5–6% of the surface drives daily operation**, exactly matching the 80/20 the directive predicted.

---

## 8. Key standing orders for the cockpit team

Pulling forward from sources:

1. **Hook is hero.** `KNOWLEDGE-BRIEF §5` — every Agent card's primary element is its pinned bead (id + title), not status / mail / logs.
2. **Three polecat states only.** `LESSONS §5` + `KNOWLEDGE-BRIEF §4` — no "idle". A polecat that isn't working has been nuked.
3. **Stranded convoy is the primary alert.** `KNOWLEDGE-BRIEF §6` — amber badge is non-negotiable.
4. **Mail types have unequal urgency.** `LESSONS §10` — MERGE_FAILED / REWORK_REQUEST / HELP = red; WITNESS_PING = dimmed.
5. **Refinery spawns FRESH polecats on conflict.** `LESSONS §11` — never "resume original". The panel must show submitter-vs-current, not imply continuity.
6. **Auto-detection uses `gt status --json`.** A3 standing order — parse `.location` and `.rigs[]`; never settle for `gt --version`.
7. **Dolt hygiene.** `CLAUDE.md` — every mail send creates a Dolt commit. The compose dialog should surface "persistent (mail)" vs "ephemeral (nudge)" so the default is nudge.
8. **`timeout 30 gt doctor`** — `CHEATSHEET §Diagnostics`. Any UI button wrapping a gt subprocess that can hang MUST wrap identically.

---

## 9. Deliverable checklist

- [x] Raw command tree — §1 (complete enumeration of gt + bd including subcommands).
- [x] Top-20 must-be-a-button ranked with panel + context + output — §2.
- [x] Command grouping by cockpit object — §3, §4 (nouns: Agent, Bead, Convoy, Mail, Rig, MR, + secondary).
- [x] Friction verbatim — §5 (10 quotes; 8 transcript + 2 live).
- [x] Anti-patterns (NEVER buttonize) — §6.
- [x] Bucket counts — §7.
- [x] `gt status --json` auto-detection finding embedded — §2 row 20, §5 quote 8, §8 item 6.

**Reply mail subject:** `DISCOVERY COMPLETE: A3 CLI pain inventory`.
**Doc path:** `~/code/spectralSet/ai_docs/spectralset-vision/cli-pain-inventory.md`.
