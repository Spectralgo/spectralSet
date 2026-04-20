---
phase: B0
doc_id: PRINCIPLES
version: v0.2
owner: crew/gastown_researcher
depends_on: []
seed_inputs:
  - ai_docs/spectralset-vision/NORTH-STAR.md
  - ai_docs/spectralset-vision/journeys/01-morning-routine.md
  - ai_docs/spectralset-vision/journeys/02-sling-and-monitor.md
  - ai_docs/spectralset-vision/journeys/03-incident-response.md
  - ai_docs/spectralset-vision/journeys/04-code-review-handoff.md
  - ai_docs/spectralset-vision/journeys/05-agent-recovery.md
  - ai_docs/spectralset-vision/inspiration.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/cli-pain-inventory.md
  - ~/code/spectralGasTown/GASTOWN-LESSONS-AND-TIPS.md
required_sections_present: true
section_count_self_check: 11
overseer_review_requested: 2026-04-20 (v0.2)
---

# SpectralSet Design Principles — v0.2

## What we are building

SpectralSet is **the cockpit a founder running a multi-agent organization lives in all day** (`NORTH-STAR.md:11`). The operator runs 6+ rigs and 40+ agents; the CLI works but it makes them *think* every minute, and the mental joins are where the day is lost. The cockpit makes the org legible at a glance and puts the next action one click away. It is desktop-native (`apps/desktop`), real-time, and opinionated — not a dashboard, not a view of Gas Town, not a general agent IDE.

## Glossary (load-bearing vocabulary)

One-line definitions so a first-time reader can parse the rest of this doc and the follow-on Phase B docs. A 30-min-new-user test (success criterion 4) is unsatisfiable without it.

- **Hook** — the pinned bead an agent is currently working on; answers "what is this agent doing right now?" (`cli-pain-inventory.md §8` item 1; `GASTOWN-LESSONS-AND-TIPS.md §7`).
- **Sling** — dispatch a bead to an agent (`gt sling <bead> <target>`); creates a worktree, spawns a session, and hooks the bead (`cli-pain-inventory.md §2` row 2).
- **Bead** — an issue in the beads tracker (like a Linear issue); `ss-cqz` is a bead ID (`cli-pain-inventory.md §3`).
- **Polecat** — an ephemeral worker agent with persistent identity; spawned for one bead, nuked when done (`journeys/05-agent-recovery.md:1-11`; `GASTOWN-LESSONS-AND-TIPS.md §5`).
- **Mayor** — the town-level chief-of-staff coordinator; dispatches work, never writes code (`GASTOWN-LESSONS-AND-TIPS.md §1` Law 1).
- **Refinery** — the per-rig merge-queue processor; rebases, validates, merges (`GASTOWN-LESSONS-AND-TIPS.md §11`).
- **Witness** — per-rig health monitor for polecats (`journeys/03-incident-response.md:62-67`).
- **Convoy** — a batch of related beads tracked as one unit of work (like a Linear cycle) (`GASTOWN-LESSONS-AND-TIPS.md §8`).
- **Rig** — a project-scoped workspace (`spectralSet`, `gmux`, etc.); has its own bead namespace, witness, refinery, polecats, and crew (`journeys/01-morning-routine.md:94-98`).
- **Town** — the top-level workspace that contains all rigs; also the on-disk root (`~/code/spectralGasTown/`).
- **Probe** — the SpectralSet desktop app's auto-detection call to Gas Town (`gt status --json` → `.location` + `.rigs[]`); NOT `gt --version` (`cli-pain-inventory.md §2` row 20).

## What we are NOT

- **Not a web dashboard with charts** — real-time, desktop-native control surface (`NORTH-STAR.md:19`).
- **Not a view of Gas Town** — we ARE the primary interface; the CLI is the power-user fallback (`NORTH-STAR.md:20`).
- **Not a general agent IDE** — specifically Gas Town's cockpit (`NORTH-STAR.md:21`).
- **Not a clone of Linear/Asana** — those track issues; we run operations (`NORTH-STAR.md:22`).
- **Not marketing-driven** — `apps/web/` is marketing, `apps/desktop/` IS the product (`NORTH-STAR.md:23`).

## The 7 design pillars

Each pillar is load-bearing: violate it and the cockpit collapses back into "a nicer CLI". Every pillar cites at least one journey anchor AND one inspiration section.

1. **Real-time omnipresence.** The org is alive on screen. Mail arrives, polecats transition, escalations fire — without a refresh (`NORTH-STAR.md:27`). Dolt `HASHOF_DB` polling at 0.14ms lets us treat data as push, not pull. Journey 02 (`journeys/02-sling-and-monitor.md:70-78`) shows Mayor running `gt peek spectralSet/jasper` four times in one session *because the state wasn't on screen*. Inspiration §1.4 `inline notification design with mute-per-thread` (`inspiration.md:59-65`) codifies the target: notifications as a view of the same live objects, not a separate inbox to refresh.

2. **Direct manipulation > command memorization.** Drag a bead onto a polecat to sling. Click an escalation to triage. Right-click an agent to nuke (`NORTH-STAR.md:29`). The daily 20% is obvious, the rest is one keystroke away — the cli-pain-inventory classified 20 of ~360 subcommands as "must-be-a-button" and leaves the rest CLI-only on purpose (`cli-pain-inventory.md §2`). The anti-pattern we killed: `gt nuke` vs `gt polecat nuke` CLI confusion during an incident (`journeys/03-incident-response.md:80-91`). Inspiration §1.2 `status chips with one-letter cycle shortcuts` (`inspiration.md:44-49`) shows the target for highest-frequency edits: one keystroke on a focused row, no dropdown, no modal.

3. **Founder-scale information density.** 10+ rigs and 100+ agents must feel calm, not overwhelming — Linear density, not Slack noise (`NORTH-STAR.md:31`). Journey 01 lists 15 commands before the operator has a coherent picture (`journeys/01-morning-routine.md:19-41`); its "cross-rig blindness" bullet (`journeys/01-morning-routine.md:94-98`) captures the specific scaling failure — 15 P0/P1 items across 7 rigs with prefix-math in the user's head. The current-state audit's "feature-flag swiss cheese" finding (`current-state-audit.md:41-43`) shows the same density tax inside Settings. Inspiration §1.3 `grouped lists with collapsible headings` (`inspiration.md:52-57`) and §3.3 `heading typography that builds hierarchy without boxes` (`inspiration.md:144-149`) are the twin anchors: the same data answers multiple questions without leaving the view, and chrome is a tax we decline to pay.

4. **One-click everything daily.** Every command in the top-20% has a button or keystroke (`NORTH-STAR.md:33`, `cli-pain-inventory.md §2`). Journey 02 documents four redundant `gt peek` cycles in a single polecat-watching session (`journeys/02-sling-and-monitor.md:70-78`), and the CLI pain inventory's friction verbatim (`cli-pain-inventory.md §5`) captures 10 live moments where a chain of 3-5 commands should have been one action — including the live A3 footgun where `gt mail inbox --pinned` rejected with `unknown flag`. Inspiration §2.2 `quick actions on the focused row` (`inspiration.md:89-95`) is the pattern anchor: row-scoped Cmd-K scoped to the focused object (peek / nudge / mail / nuke) turns a browser into an operator console. The cockpit's one-click list includes `gt peek`, `gt sling`, `gt mail inbox/send`, `gt nudge`, hook/unsling, convoy list/status, mq/refinery queue, polecat list/nuke, doctor/vitals, handoff, ready, bd show/search/create, prime, crew, and `gt status --json` for probe auto-detection.

5. **Conversational fluency.** Mail feels like Slack DMs (threads, mentions, quotes); beads feel like Linear issues; agents feel like teammates (`NORTH-STAR.md:35`). Journey 01 (`journeys/01-morning-routine.md:86-103`) captures the antithesis: 5 unread + 12 read-but-unprocessed mails whose subjects look like `hq-wisp-qoo05` — "information-free" identifiers the operator must decode via a second command. Inspiration §4.3 `thread expansion as an in-place drawer` (`inspiration.md:189-195`) and §4.4 `@mentions with autocomplete and confirmation` (`inspiration.md:197-203`) translate directly to the Mail surface. The current-state audit (`current-state-audit.md §"Gas Town Mail"`) flags that Compose is zod-validated but Mark-read is disabled, replies are missing, and the address picker omits polecat inboxes — fluency starts by fixing those (see Decisions §D2 below).

6. **Surgical observability.** "What's blocked / stalled / who needs me / why" answerable in <2s without typing a query (`NORTH-STAR.md:37`). The 3-state polecat model — Working / Stalled / Zombie, with **no "idle"** — is the canonical state chip (`journeys/05-agent-recovery.md:90-109`; `GASTOWN-LESSONS-AND-TIPS.md §5`). The current-state audit flagged the drift: the agent state chip renders `nuked` with a line-through in muted colour, reading as "dead/failed" when it's clean-done (`current-state-audit.md §"Gastown Agents"`). Inspiration §1.2 `status chips with one-letter cycle shortcuts` (`inspiration.md:44-49`) is the pattern: status IS the primary data, not metadata. Surgical means the chip is honest.

7. **Beautiful and fast.** Things 3 calm, Linear/Raycast polish, sub-100ms interactions, native macOS feel — traffic-lights, Cmd-K, sheet modals (`NORTH-STAR.md:39`). Journey 01's "go drink coffee" badge (`journeys/01-morning-routine.md:113-115`) is the tonal target: when the system is healthy, the UI says so plainly and the operator leaves. **Empty states read like haiku, not like errors** is a principle-level commitment inside this pillar: inspiration §3.1 (`inspiration.md:128-134`) makes "Empty is a good state" doctrinal — no CTA-cluster, no "Get started" push. Paired with §3.4 `Today as the only view that matters in the morning` (`inspiration.md:152-157`) and §1.1 / §2.1 / §5.5 / §6.3 (four of six inspiration apps converge on Cmd-K as primary navigation), the aesthetic is *restraint*.

## Surface set (overseer-mandated pillar)

Seven top-level surfaces. Each is justified by a journey + an inspiration section. Reorder within a surface is fine; the seven themselves are the commitment. Per Decisions §D1 below, the Command bar is a surface — specifically "a surface you invoke, not a destination you navigate to".

- **Today.** Journey 01 (morning routine — 15-command shell archaeology, `journeys/01-morning-routine.md:19-41`) + inspiration §3.4 (Things 3 "Today" as the only view that matters in the morning, `inspiration.md:152-157`). Replaces the absent "morning page" — the operator opens to "what needs me right now" without typing. Contains the triage stack, per-rig health strip, pinned-mail pile, and the "go drink coffee" verdict.

- **Command bar (Cmd-K).** Every journey loses time to command memorization (Journey 01: 15 commands; Journey 02: 8+ per dispatch; Journey 05: 10-command recovery dance, `journeys/05-agent-recovery.md:75-77`). Inspiration §1.1 / §2.1 / §5.5 / §6.3 — four of six best-in-class apps treat Cmd-K as primary navigation (`inspiration.md:307-315`). Verb-object phrasing, context-aware resolution, inline rich previews (inspiration §2.3). **A surface you invoke, not a destination you navigate to** — but a surface.

- **Agents.** Journey 02 (sling-and-monitor — 8+ commands per dispatch, 4+ polecat-name re-lookups, `journeys/02-sling-and-monitor.md:84-123`) + Journey 05 (agent recovery — 10-command recovery dance, `journeys/05-agent-recovery.md:90-140`) + inspiration §4.5 `presence indicators with "active / away / dnd"` (`inspiration.md:205-211`). Refines the Agents surface. Hook is hero (`cli-pain-inventory.md §2` row 6); state chip is honest; per-state action set is fixed (Working → Peek; Stalled → Peek/Nudge/Check-Recovery; Zombie → Inspect/Re-sling/Nuke).

- **Convoys.** Journey 02 (merge journey bisected by mail, `journeys/02-sling-and-monitor.md:120-123`) + Journey 04 (rejection triage cross-coupling, `journeys/04-code-review-handoff.md:115-124`) + inspiration §1.5 `cycle/sprint visualization` (`inspiration.md:67-73`). Refines the Convoys surface. Stranded convoy is the primary amber alert (`GASTOWN-LESSONS-AND-TIPS.md §8`).

- **Mail.** Journey 01 (5 unread + 12 read-but-unprocessed, `journeys/01-morning-routine.md:86-103`) + inspiration §1.4 (inline notification design, `inspiration.md:59-65`) + §4.1 (unread-vs-mention badges, `inspiration.md:174-179`) + §4.3 (in-place thread drawer, `inspiration.md:189-195`). Refines the Mail surface — the current-state audit flagged Mark-read disabled, no reply, no search, no polecat inboxes in the address picker (`current-state-audit.md §"Gas Town Mail"`). Fixing those is non-optional for v1 (Decisions §D2).

- **Incidents.** NEW. Journey 03 (escalation response — "Gas Town's CLI hurts the MOST", `journeys/03-incident-response.md:1-10`, `journeys/03-incident-response.md:134-165`) + the 8 mail types' unequal urgency (`GASTOWN-LESSONS-AND-TIPS.md §10` — MERGE_FAILED / REWORK / HELP are red, WITNESS_PING is noise) + inspiration §4.1 unread-vs-mention split (`inspiration.md:174-179`). Today escalations live in the mail inbox next to routine MERGED notifications with identical visual weight. Incidents as a first-class surface, with evidence bundles, coalesced duplicates, and runbook-action buttons. When any escalation is open, it's the loudest element in the whole UI.

- **Rejection Triage.** NEW. Journey 04 (MERGE_FAILED ⇒ 90 seconds of local setup before seeing the real error, `journeys/04-code-review-handoff.md:82-129`) + inspiration §1.3 `grouped lists with collapsible headings` (`inspiration.md:52-57`) for cross-rejection root-cause grouping. Inline failing fragment, failure diagnosis chip (stale-imports / test-regression / lint / rebase-conflict / build-error), fork-in-road decision panel (respin-fresh vs self-fix). Auto-quarantines the polecat. Replaces the "I'll just fix it myself" Law-1 violation (`GASTOWN-LESSONS-AND-TIPS.md §1`).

## Anti-patterns

Each bullet cites the incident that taught it.

- **"Build passes ≠ done"** (ss-7mt iteration 1 post-mortem; `NORTH-STAR.md:51`). Every "done" requires agent-browser walkthrough + screenshot in `DOGFOODING-TRACKER.md`. No bare build-passed claims.
- **Velocity over quality** (39 commits in 36 hours, `NORTH-STAR.md:52`). A commit count is a smell, not a win. Review gates exist for a reason.
- **Surface polish hiding broken core flows** (`NORTH-STAR.md:53`). Ship features end-to-end; don't render a pretty button that is `disabled title="ships in P5-C"` (`current-state-audit.md §"Gas Town Mail"` — Mark-read is exactly this). See Decisions §D2.
- **Fragmented micro-beads** (`NORTH-STAR.md:55`). 20 tiny beads lose the big-picture vision; journey-level waves keep the vision coherent (`PHASE-B-FRAMEWORK.md §"Implementation philosophy"`).
- **False-done reports** (A4 inspiration hash hallucination post-mortem). Every "B-N complete" MUST ship with file-path `ls`, commit hash verified via `git cat-file -e`, content snippet quoted (`PHASE-B-FRAMEWORK.md §"Verification protocol per B doc"`). No bare hashes. No bare paths. This doc enforces it on itself — see the reply-mail evidence requirement.

Secondary anti-patterns to prevent (drawn from the discovery sweep):

- **Following Mayor's "all green" reports without verification** (`NORTH-STAR.md:54`).
- **Missing persona walks before declaring a phase done** (`NORTH-STAR.md:56`).
- **Designing AFTER implementing** — gmux wrote press releases AFTER shipping (`NORTH-STAR.md:57`).

## Success criteria

Observable, falsifiable. A reviewer applies each to any Phase C build and gets a yes/no.

1. **Morning-routine collapse.** Operator opens SpectralSet first thing in the morning and answers "what needs me?" in under 30 seconds without touching the terminal (`NORTH-STAR.md:43`). *Verifiable by* stopwatching an operator cold-start.
2. **Sling-and-monitor closure.** Operator completes a full sling-and-monitor cycle (read bead → sling → watch → review diff → mark done) without leaving the app (`NORTH-STAR.md:44`). *Verifiable by* recording a session and counting terminal switches.
3. **Incident triage in 3 clicks.** Escalation fires → SpectralSet pings → operator triages in 3 clicks (`NORTH-STAR.md:45`). *Verifiable by* injecting an escalation and counting clicks to ack/resolve.
4. **No-docs new-user productivity.** A developer who has never used Gas Town is productive in SpectralSet in 30 minutes without reading any Gas Town docs (`NORTH-STAR.md:46`). *Verifiable by* sitting a friend-of-founder with the app and a 30-min timer (glossary in §2 is the pre-req that makes this falsifiable).
5. **Terminal-optional.** Operator says "I don't open the terminal anymore unless I have to" (`NORTH-STAR.md:47`). *Verifiable by* a week-long usage diary.

## Decision rubric

Every Phase B/C trade-off is judged against the pillars (§4) and criteria (§7). The rubric:

1. **Which pillar(s) does this advance? Which does it hurt?** If it advances none, cut it.
2. **Which success criterion does this make measurably truer?** If the answer is "it feels nicer", park as nice-to-have.
3. **Is the advance on a daily-20% journey or on a monthly-80% edge case?** Daily > monthly. Exception: rare-but-high-stakes journeys (incidents, rejections) count as daily for rubric purposes (see Open Questions below).
4. **What's the evidence trail back to Phase A?** If a proposal cites neither a journey nor an inspiration section nor an audit finding, it is opinion — reject until cited.
5. **What does the anti-patterns list forbid?** If the proposal even rhymes with "surface polish hiding a broken core flow", reject.

**Worked example.** Proposal: "Add a live Sparkline to every Agent card showing event throughput per minute."
- Pillars: advances #1 real-time omnipresence and #7 beautiful-and-fast; hurts #3 founder-scale (sparklines in a 40-agent grid = visual noise); hurts #6 surgical observability (throughput ≠ "needs me").
- Criteria: makes #1 (morning-routine collapse) *slightly* truer by giving an at-a-glance health signal; does not move criteria 2–5.
- Daily-vs-monthly: throughput is monthly debugging; state chip is daily ops.
- Evidence: no journey or audit finding cited.
- Anti-patterns: rhymes with "surface polish hiding broken core" because the audit already flagged that the agent state chip renders `nuked` misleadingly (`current-state-audit.md §"Gastown Agents"`) — fix the chip before adding sparklines.

Verdict: **reject** (with a suggested path: fix the state chip first; sparklines are a post-v1 "nice").

## Decisions (overseer rulings from v0.1 review)

- **D1 — Command bar is a SURFACE.** (Resolves OQ3 from v0.1.) Inspiration §1.1, §2.1, §5.5, §6.3 all treat the command bar as primary navigation (`inspiration.md:307-315`). Frame as "a surface you invoke, not a destination you navigate to". Command bar is therefore one of the 7 top-level surfaces in §5.
- **D2 — Mail Mark-read / reply / search are v1 BLOCKERS.** (Resolves OQ7 from v0.1.) The current-state audit flags these as "deliberate incompleteness" shipped as `disabled title="ships in P5-C"` (`current-state-audit.md §"Gas Town Mail"`). That is the exact shape of the "surface polish hiding broken core flows" anti-pattern. Fix is non-optional for v1. B1 IA and B3 Mail spec must treat these as v1 scope, not v1.1.

## Open questions for B5 review

1. **Pillar wording: is "founder-scale" legible outside this repo?** The word is accurate to the audience but may read as marketing. Alternatives considered: "densely-calm", "Linear-density". Kept "founder-scale" because the NORTH-STAR uses it and the audience *is* founders.
2. **Is 7 surfaces the right number?** Incidents + Rejection Triage are NEW vs the current app. Merging them ("one Triage surface with filters") trades surface count for filter complexity. The journeys argue they're operationally distinct — but a reviewer with UX eyes may disagree.
3. ~~**Does the Command bar count as a surface or a cross-cutting primitive?**~~ **RESOLVED (v0.2): surface** — see Decisions §D1.
4. **Anti-pattern §"false-done reports" cites A4's inspiration-hash hallucination. Is the cite specific enough?** We did not quote the hallucinated hash. A reviewer may want the exact post-mortem paragraph pasted; I kept it as a reference because the doc is the hallucination's *fix*, not its rehash.
5. **Success criterion 4 requires a friend-of-founder test.** Is there an approved list of testers, or is this aspirational? If aspirational, criterion 4 is unfalsifiable until Phase D — flag to overseer. (Glossary in §2 is the pre-req that makes the criterion operational.)
6. **The rubric's "daily-20% journey" rule biases against novel surfaces for edge cases (incidents, rejections).** These ARE edge cases by frequency — yet they carry disproportionate operational weight. Rubric §8.3 now codifies: rare-but-high-stakes journeys count as daily for rubric purposes. Is that acceptable, or a loophole?
7. ~~**Pillar 5 (conversational fluency) cites current-state-audit gaps (Mark-read disabled, no reply, no search). Are those v1 blockers or v1.1?**~~ **RESOLVED (v0.2): v1 blocker** — see Decisions §D2.
8. **`gt status --json` auto-detection finding is codified in pillar §4 (One-click everything daily). Is that the right home, or does it belong in B1 IA as a probe contract?** I placed it here because it's a principle-level commitment, not an IA decision — but a reviewer may disagree.

## Changelog

- **v0.1** (2026-04-20) — initial synthesis. Overseer rubric pass + 5-reviewer rule-of-five. All 5 reviewers returned REVISE with consensus on 5 blocking themes (broken citations, pillar under-citation, code-identifier leakage, unresolved OQ3/OQ7, missing glossary).
- **v0.2** (2026-04-20) — point-by-point resolution of the 5 blocking themes. (a) Glossary added (§2, 11 terms). (b) Every pillar now double-cited (≥1 journey + ≥1 inspiration). (c) Broken references to the panel-designs knowledge-brief were removed; bare `LESSONS` section references are now filename-prefixed with the GASTOWN lessons doc (added to seed_inputs). (d) Code identifiers for renderer components and Tailwind constants stripped in favour of surface nouns ("the agent state chip", "the Agents surface", "the Convoys surface", "the Mail surface", "the address picker"). (e) OQ3 resolved → command bar is a surface (D1). OQ7 resolved → Mail mark-read / reply / search are v1 blockers (D2). (f) "Empty states read like haiku" promoted to principle-level commitment inside Pillar 7. Ambition + feasibility axes preserved — no pillar or surface removed.
