# SpectralSet North Star

**Author**: Overseer (COO)
**Date**: 2026-04-20
**Status**: Draft v0.1 — pre-discovery, brave POV. Discovery deliverables (Phase A) either confirm or refute this. Treat as a rubric, not a spec.

---

## What we are building

**SpectralSet is the cockpit a founder running a multi-agent organization lives in all day.**

Not "an Electron view of CLI commands." Not "a dashboard." A cockpit.

The user is the CEO of an AI-native company with 6+ rigs, 40+ agents, dozens of beads, multiple convoys, escalations firing at all hours. The CLI works but it makes them *think* every minute. The cockpit makes the org legible at a glance and makes the next action one click away.

## What we are NOT

- ❌ A web dashboard with charts (we're a desktop-native, real-time control surface)
- ❌ A "view" of Gas Town (we ARE the primary interface; CLI is the power-user fallback)
- ❌ A general agent IDE (we are specifically Gas Town's cockpit)
- ❌ A clone of Linear/Asana (those are issue trackers; we're an *operations* surface)
- ❌ Marketing-driven (apps/web/ is marketing; apps/desktop/ IS the product)

## Design pillars

1. **Real-time omnipresence** — the org is alive on screen. New mail arrives, polecats start/stop, escalations land, all without refresh. (Dolt HASHOF_DB polling: 0.14ms — already proven.)

2. **Direct manipulation > command memorization** — drag a bead onto a polecat to sling. Click an escalation to triage. Right-click an agent to nuke. The CLI surface area is large; the cockpit makes the daily 20% feel obvious and the rest one keystroke away.

3. **Founder-scale** — 10+ rigs, 100+ agents must feel calm, not overwhelming. Information density like Linear, not noise like Slack. Sort by "needs me," not chronological.

4. **One-click everything daily** — every command in the daily-routine top 20% has a button or shortcut. No retyping `gt mail send mayor/ -s "..." --pinned`.

5. **Conversational fluency** — mail feels like Slack DMs (threads, mentions, quotes), not like email. Beads feel like Linear issues (rich text, comments, status). Agents feel like teammates (avatar, status, recent activity).

6. **Surgical observability** — "what's blocked," "what's stalled," "who needs me," "why" — all answerable in <2s without typing a query.

7. **Beautiful and fast** — Linear/Raycast aesthetic. Sub-100ms interactions. Native macOS feel: traffic lights, command-K palette, sheet modals.

## Success criteria (we're done when…)

- The user opens SpectralSet first thing in the morning and answers "what needs me?" in under 30 seconds without touching the terminal.
- The user can run a full sling-and-monitor cycle (read a bead, sling to a polecat, watch it complete, review the diff, mark done) without leaving the app.
- An escalation fires → SpectralSet pings → user triages in 3 clicks.
- A new user (developer at a friend's company) can be productive in SpectralSet in 30 minutes WITHOUT reading any Gas Town docs.
- The user says "I don't open the terminal anymore unless I have to."

## Anti-patterns (gmux post-mortem applied)

- 🚫 "Build passes" reports. Every "done" requires agent-browser walkthrough + screenshot in DOGFOODING-TRACKER.md.
- 🚫 Velocity over quality. 39 commits in 36 hours is a smell, not a win.
- 🚫 Surface-level polish hiding broken core flows. Ship features end-to-end, not 80% to demo.
- 🚫 Following Mayor's "all green" reports without verification.
- 🚫 Fragmenting into 20 micro-beads that lose the big-picture vision.
- 🚫 Missing the persona walks before declaring a phase done.
- 🚫 Designing AFTER implementing (gmux did press releases AFTER shipping).

## Top 5 user journeys (hypothesis — discovery validates)

1. **Morning routine** — open app → see overnight escalations, completed beads, polecat states → triage in 3-5 clicks → kick off the day's first sling.
2. **Sling-and-monitor cycle** — read a new bead → pick a polecat → watch progress → review the diff inline → approve/iterate.
3. **Incident response** — escalation fires → notification → click → see context (logs, agent state, related beads) → take action (nudge, escalate-up, fix).
4. **Code review handoff** — polecat completes → diff appears in cockpit → user reviews → comments inline → either lands or sends back.
5. **Agent recovery** — polecat stalls → cockpit highlights → user nukes → respawn → resume work, all without typing.

## What's likely missing today (pre-audit hypothesis)

- Command palette (cmd-K) — universal action surface
- Notifications — desktop notifications + in-app inbox badge
- Bead detail view (rich) — currently we have CV cards but no first-class bead surface
- Diff inline review — no surface for code review yet
- Real polecat actions — buttons exist, do they actually nudge/nuke/claim?
- Keyboard shortcuts — power-user mode
- Search — across mail, beads, agents (almost certainly absent)
- Onboarding — new-user setup flow
- Settings — global config, theme, keyboard shortcut customization
- Witness/escalation feed — promised but not built

## Phase B vision doc structure (what Mayor should have crew produce)

Based on Phase A deliverables, the design wave produces:

1. `PRINCIPLES.md` — pillars, anti-patterns, success criteria (refined from this doc)
2. `journeys/` — 5 working-backwards user-guide docs (one per top journey)
3. `interaction-specs/` — wireframe + microcopy + keyboard shortcuts per surface
4. `INFORMATION-ARCHITECTURE.md` — sidebar, top-nav, panel hierarchy, command palette
5. `DESIGN-SYSTEM.md` — type scale, spacing, color tokens, motion tokens (codifies what's drift-prone in current build)

Each doc gets a 5-reviewer parallel-review pass before implementation begins.

## Implementation philosophy

- **One journey at a time.** Wave = "make journey N feel beautiful end-to-end." Not "add 5 features across 5 panels."
- **Definition of done = persona-walk passes.** Not "build passes," not "Mayor reports green."
- **Quality gate = 4 reviewers.** multi-lens-code-review (4 lenses) + persona-ux-audit (relevant persona) per wave. parallel-review (5 reviewers) every 3 waves.
- **Dogfooding tracker is a first-class artifact.** Every wave appends a section: "what I clicked, what happened, what I expected, screenshot."

## What I (overseer) commit to

1. Read every discovery deliverable end-to-end before approving Phase B.
2. Walk every journey personally via agent-browser before approving the wave.
3. Block any "done" report that lacks screenshot evidence.
4. Push back on Mayor when scope creeps or quality slips.
5. Stop polling and start strategizing — use convoys + standing orders, not micro-management.
6. Be brave: name what's missing, name what's broken, propose the leap not the increment.

---

## How to use this doc

- **During discovery (Phase A)**: When deliverables land, compare them to this North Star. Where do they confirm? Where do they refute? Update this doc accordingly.
- **During design (Phase B)**: This doc is the seed for `PRINCIPLES.md`. Crew refines, expands, gets brutal about trade-offs.
- **During implementation (Phase C)**: Every wave answers "does this advance the North Star?" If not, cut it.
- **During verification (Phase D)**: Success criteria above are the test. We're not done until they're true.

This doc is wrong in places. That's fine. Discovery's job is to find out where.
