---
phase: B0
doc_id: PRINCIPLES
version: v0.1
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
required_sections_present: true
section_count_self_check: 8
overseer_review_requested: 2026-04-20
---

# SpectralSet Design Principles — v0.1

## What we are building

SpectralSet is **the cockpit a founder running a multi-agent organization lives in all day** (`NORTH-STAR.md:11`). The operator runs 6+ rigs and 40+ agents; the CLI works but it makes them *think* every minute, and the mental joins are where the day is lost. The cockpit makes the org legible at a glance and puts the next action one click away. It is desktop-native (`apps/desktop`), real-time, and opinionated — not a dashboard, not a view of Gas Town, not a general agent IDE.

## What we are NOT

- **Not a web dashboard with charts** — real-time, desktop-native control surface (`NORTH-STAR.md:19`).
- **Not a view of Gas Town** — we ARE the primary interface; the CLI is the power-user fallback (`NORTH-STAR.md:20`).
- **Not a general agent IDE** — specifically Gas Town's cockpit (`NORTH-STAR.md:21`).
- **Not a clone of Linear/Asana** — those track issues; we run operations (`NORTH-STAR.md:22`).
- **Not marketing-driven** — `apps/web/` is marketing, `apps/desktop/` IS the product (`NORTH-STAR.md:23`).

## The 7 design pillars

Each pillar is load-bearing: if we violate it, the cockpit collapses back into "a nicer CLI".

1. **Real-time omnipresence.** The org is alive on screen. Mail arrives, polecats transition, escalations fire — without a refresh (`NORTH-STAR.md:27`). Proven-fast: Dolt `HASHOF_DB` polling at 0.14ms lets us treat data as push, not pull. Journey 02 (`journeys/02-sling-and-monitor.md:70-78`) shows Mayor running `gt peek spectralSet/jasper` four times in one session *because the state wasn't on screen*; in the cockpit that screen never stops being current.

2. **Direct manipulation > command memorization.** Drag a bead onto a polecat to sling. Click an escalation to triage. Right-click an agent to nuke. The daily 20% is obvious, the rest is one keystroke away (`NORTH-STAR.md:29`, `cli-pain-inventory.md §2`). The CLI pain inventory classified 20 of ~360 subcommands as "must-be-a-button"; everything else stays CLI-only on purpose. The anti-pattern we killed: `gt nuke` vs `gt polecat nuke` CLI confusion during an incident (`journeys/03-incident-response.md:80-91`).

3. **Founder-scale information density.** 10+ rigs and 100+ agents must feel calm, not overwhelming — Linear density, not Slack noise (`NORTH-STAR.md:31`). The morning-routine journey (`journeys/01-morning-routine.md:78-114`) lists 15 commands before the operator has a coherent picture; the cockpit's answer is one pre-joined screen sorted by "needs me", not chronological.

4. **One-click everything daily.** Every command in the top-20% has a button or keystroke (`NORTH-STAR.md:33`, `cli-pain-inventory.md §2`). Ranked list exists: `gt peek`, `gt sling`, `gt mail inbox/send`, `gt nudge`, hook/unsling, convoy list/status, mq/refinery queue, polecat list/nuke, doctor/vitals, handoff, ready, bd show/search/create, prime, crew, and `gt status --json` for probe auto-detection (`cli-pain-inventory.md §2` row 20 — this is the standing order for how the desktop app detects a town).

5. **Conversational fluency.** Mail feels like Slack DMs (threads, mentions, quotes); beads feel like Linear issues; agents feel like teammates (`NORTH-STAR.md:35`). Inspiration §4.3 `inline thread drawer` and §4.4 `@mentions with typed chips` translate directly to `MailPanel` — the current-state audit flags that Compose is zod-validated but Mark-read is disabled and replies are missing (`current-state-audit.md §"Gas Town Mail"`). Fluency starts there.

6. **Surgical observability.** "What's blocked / stalled / who needs me / why" answerable in <2s without typing a query (`NORTH-STAR.md:37`). The 3-state polecat model (Working / Stalled / Zombie — **no "idle"**) is the canonical state chip (`journeys/05-agent-recovery.md:90-109`, `LESSONS §5`). The audit already flagged the drift: `STATE_BADGE_CLASS` renders `nuked` with a line-through, reading as "dead/failed" when it's clean-done (`current-state-audit.md §Gastown Agents`). Surgical means the chip is honest.

7. **Beautiful and fast.** Things 3 calm, Linear/Raycast polish, sub-100ms interactions, native macOS feel — traffic-lights, Cmd-K, sheet modals (`NORTH-STAR.md:39`). Inspiration §3.1 `empty states read like haiku` and §3.4 `Today as the only morning view` are the tonal anchors; inspiration §1.1 + §2.1 + §5.5 + §6.3 (four of six apps converge on Cmd-K) is the leverage anchor. The aesthetic is *restraint*: chrome is a tax; typography and whitespace do the work.

## Surface set (overseer-mandated pillar)

Seven top-level surfaces. Each is justified by a journey + an inspiration section. Reorder within a surface is fine; the seven themselves are the commitment.

- **Today.** Justified by Journey 01 (morning routine — 15-command shell archaeology, `journeys/01-morning-routine.md:19-41`) + inspiration §3.4 (Things 3 "Today" as the only view that matters in the morning, `inspiration.md:152-157`). Replaces the absent "morning page" — the operator opens to "what needs me right now" without typing. Contains the triage stack, per-rig health strip, pinned-mail pile, and the "go drink coffee" verdict.

- **Command bar (Cmd-K).** Justified by the cli-pain-inventory 20 must-be-a-button list (`cli-pain-inventory.md §2`) + inspiration §1.1 / §2.1 / §5.5 / §6.3 — four of six best-in-class apps converge on this one primitive (`inspiration.md:307-315`). Verb-object phrasing with context-aware resolution; inline rich previews (§2.3). The single highest-leverage pattern in the catalog — it's a surface, not a widget.

- **Agents.** Justified by Journey 02 (sling-and-monitor — 8+ commands per dispatch, 4+ polecat-name re-lookups, `journeys/02-sling-and-monitor.md:84-123`) + Journey 05 (agent recovery — 10-command recovery dance, `journeys/05-agent-recovery.md:90-140`) + inspiration §4.5 (Slack presence dots, `inspiration.md:205-211`). Refines the existing `AgentCVPanel`. Hook is hero (`KNOWLEDGE-BRIEF §5`); state chip is honest; per-state action set is fixed (Working → Peek; Stalled → Peek/Nudge/Check-Recovery; Zombie → Inspect/Re-sling/Nuke).

- **Convoys.** Justified by Journey 02 (merge journey bisected by mail, `journeys/02-sling-and-monitor.md:120-123`) + Journey 04 (rejection triage cross-coupling, `journeys/04-code-review-handoff.md:115-124`) + inspiration §1.5 (Linear cycle as time-bounded container, `inspiration.md:67-73`). Refines `ConvoyBoard`. Stranded convoy is the primary amber alert (`KNOWLEDGE-BRIEF §6`).

- **Mail.** Justified by Journey 01 (5 unread + 12 read-but-unprocessed, `journeys/01-morning-routine.md:86-103`) + inspiration §1.4 (inline notification design, `inspiration.md:59-65`) + §4.1 (unread-vs-mention badges, `inspiration.md:174-179`) + §4.3 (in-place thread drawer, `inspiration.md:189-195`). Refines `MailPanel` — current-state audit flagged Mark-read disabled, no reply, no search, no polecat inboxes in AddressPicker (`current-state-audit.md §"Gas Town Mail"`). Fixing those isn't optional for v1.

- **Incidents.** NEW. Justified by Journey 03 (escalation response — "Gas Town's CLI hurts the MOST", `journeys/03-incident-response.md:1-10`, `journeys/03-incident-response.md:134-165`) + the 8 mail types' unequal urgency (`LESSONS §10` — MERGE_FAILED / REWORK / HELP are red, WITNESS_PING is noise). Today escalations live in the mail inbox next to routine MERGED notifications with identical visual weight. Incidents as a first-class surface, with evidence bundles, coalesced duplicates, and runbook-action buttons. When any escalation is open, it's the loudest element in the whole UI.

- **Rejection Triage.** NEW. Justified by Journey 04 (MERGE_FAILED ⇒ 90 seconds of local setup before seeing the real error, `journeys/04-code-review-handoff.md:82-129`). Inline failing fragment, failure diagnosis chip (stale-imports / test-regression / lint / rebase-conflict / build-error), fork-in-road decision panel (respin-fresh vs self-fix). Auto-quarantines the polecat. Replaces the "I'll just fix it myself" Law-1 violation (`LESSONS §1`).

## Anti-patterns

Each bullet cites the incident that taught it.

- **"Build passes ≠ done"** (ss-7mt iteration 1 post-mortem; `NORTH-STAR.md:51`). Every "done" requires agent-browser walkthrough + screenshot in `DOGFOODING-TRACKER.md`. No bare build-passed claims.
- **Velocity over quality** (39 commits in 36 hours, `NORTH-STAR.md:52`). A commit count is a smell, not a win. Review gates exist for a reason.
- **Surface polish hiding broken core flows** (`NORTH-STAR.md:53`). Ship features end-to-end; don't render a pretty button that is `disabled title="ships in P5-C"` (`current-state-audit.md §"Gas Town Mail"` — Mark-read is exactly this).
- **Fragmented micro-beads** (`NORTH-STAR.md:55`). 20 tiny beads lose the big-picture vision; journey-level waves keep the vision coherent (`PHASE-B-FRAMEWORK.md §"Implementation philosophy"`).
- **False-done reports** (A4 inspiration hash hallucination post-mortem). Every "B-N complete" MUST ship with file-path `ls`, commit hash verified via `git cat-file -e`, content snippet quoted (`PHASE-B-FRAMEWORK.md §"Verification protocol per B doc"`). No bare hashes. No bare paths. This doc enforces it on itself (see the reply-mail evidence requirement).

Secondary anti-patterns to prevent (drawn from the discovery sweep):

- **Following Mayor's "all green" reports without verification** (`NORTH-STAR.md:54`).
- **Missing persona walks before declaring a phase done** (`NORTH-STAR.md:56`).
- **Designing AFTER implementing** — gmux wrote press releases AFTER shipping (`NORTH-STAR.md:57`).

## Success criteria

Observable, falsifiable. A reviewer applies each to any Phase C build and gets a yes/no.

1. **Morning-routine collapse.** Operator opens SpectralSet first thing in the morning and answers "what needs me?" in under 30 seconds without touching the terminal (`NORTH-STAR.md:43`). Test: stopwatch an operator cold-start.
2. **Sling-and-monitor closure.** Operator completes a full sling-and-monitor cycle (read bead → sling → watch → review diff → mark done) without leaving the app (`NORTH-STAR.md:44`). Test: record a session; count terminal switches.
3. **Incident triage in 3 clicks.** Escalation fires → SpectralSet pings → operator triages in 3 clicks (`NORTH-STAR.md:45`). Test: inject an escalation; count clicks to ack/resolve.
4. **No-docs new-user productivity.** A developer who has never used Gas Town is productive in SpectralSet in 30 minutes without reading any Gas Town docs (`NORTH-STAR.md:46`, `KNOWLEDGE-BRIEF §13`). Test: friend-of-founder sits with the app; set 30-min timer.
5. **Terminal-optional.** Operator says "I don't open the terminal anymore unless I have to" (`NORTH-STAR.md:47`). Test: week-long usage diary.

## Decision rubric

Every Phase B/C trade-off is judged against the pillars (§3) and criteria (§6). The rubric:

1. **Which pillar(s) does this advance? Which does it hurt?** If it advances none, cut it.
2. **Which success criterion does this make measurably truer?** If the answer is "it feels nicer", it is not a success-criterion move — park it as a nice-to-have.
3. **Is the advance on a daily-20% journey or on a monthly-80% edge case?** Daily > monthly. Always.
4. **What's the evidence trail back to Phase A?** If a proposal cites neither a journey nor an inspiration section nor an audit finding, it is opinion — reject until cited (`PHASE-B-FRAMEWORK.md §"What I (overseer) commit to"`).
5. **What does the anti-patterns list forbid?** If the proposal even rhymes with "surface polish hiding a broken core flow", reject.

**Worked example.** Proposal: "Add a live Sparkline to every Agent card showing event throughput per minute."
- Pillars: advances #1 real-time omnipresence and #7 beautiful-and-fast; hurts #3 founder-scale (sparklines in a 40-agent grid = visual noise); hurts #6 surgical observability (throughput ≠ "needs me").
- Criteria: makes #1 (morning-routine collapse) *slightly* truer by giving an at-a-glance health signal; does not move criteria 2–5.
- Daily-vs-monthly: throughput is monthly debugging; state chip is daily ops.
- Evidence: no journey or audit finding cited.
- Anti-patterns: rhymes with "surface polish hiding broken core" because the audit already flagged that `STATE_BADGE_CLASS` renders `nuked` misleadingly (`current-state-audit.md §Gastown Agents`) — fix the chip before adding sparklines.

Verdict: **reject** (with a suggested path: fix the state chip first; sparklines are a post-v1 "nice").

## Open questions for B5 review

1. **Pillar wording: is "founder-scale" legible outside this repo?** The word is accurate to the audience but may read as marketing. Alternatives considered: "densely-calm", "Linear-density". Kept "founder-scale" because the NORTH-STAR uses it and the audience *is* founders.
2. **Is 7 surfaces the right number?** Incidents + Rejection Triage are NEW vs the current app. Merging them ("one Triage surface with filters") trades surface count for filter complexity. The journeys argue they're operationally distinct — but a reviewer with UX eyes may disagree.
3. **Does the Command bar count as a surface or a cross-cutting primitive?** Framed here as a surface because inspiration §1.1 / §2.1 / §5.5 / §6.3 all treat it as primary navigation, and `PHASE-B-FRAMEWORK.md` lists it among the top-level surfaces. A reviewer may argue it is chrome, not a destination.
4. **Anti-pattern §"false-done reports" cites A4's inspiration-hash hallucination. Is the cite specific enough?** We did not quote the hallucinated hash. A reviewer may want the exact post-mortem paragraph pasted; I kept it as a reference because the doc is the hallucination's *fix*, not its rehash.
5. **Success criterion 4 requires a friend-of-founder test.** Is there an approved list of testers, or is this aspirational? If aspirational, criterion 4 is unfalsifiable until Phase D — flag to overseer.
6. **The rubric's "daily-20% journey" rule will bias against novel surfaces for edge cases (incidents, rejections).** These ARE edge cases by frequency — yet they carry disproportionate operational weight. Counter-rule: rare-but-high-stakes journeys count as daily for rubric purposes. Is that acceptable, or a loophole?
7. **Pillar 5 (conversational fluency) cites current-state-audit gaps (Mark-read disabled, no reply, no search).** Are those v1 blockers or v1.1? B1 must decide before the Mail interaction spec (B3) goes out.
8. **`gt status --json` auto-detection finding is codified in pillar §4.** Is that the right home, or does it belong in B1 IA as a probe contract? I placed it here because it's a principle-level commitment, not an IA decision — but a reviewer may disagree.
