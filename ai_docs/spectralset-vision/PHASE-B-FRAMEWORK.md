# SpectralSet Phase B Framework — Design Sprint

**Author**: Overseer (COO)
**Date**: 2026-04-20
**Status**: Draft v0.1, ready to dispatch to crew once ss-gl3 verified
**Inputs**: 5 journey docs (A1) + cli-pain-inventory (A3) + 30-pattern inspiration (A4) + current-state audit (A2) + SPECTRALSET-NORTH-STAR.md
**Audience**: Mayor + crew (gastown_researcher, worktree_researcher, future design crew)

---

## What Phase B is

Discovery (Phase A) found out **what is painful and what could be delightful**. Phase B turns that into **a designable spec a polecat could implement against**. No code yet. The output of Phase B is the input to Phase C (implementation).

**Phase B is NOT**:
- Coding (that's Phase C)
- Open-ended creative exploration (that's Phase A and it's done)
- Top-down architecture decree (the journeys + audit drive the architecture)

## Sequencing — strict gates

Each gate requires sign-off (overseer mail "B-N approved") before next opens.

```
B0  Synthesize → PRINCIPLES.md             (one doc, refines North Star)
  ↓
B1  Information architecture → IA.md       (one doc, the surface inventory)
  ↓
B2  Working-backwards user guides (×5)     (5 docs, parallel, one per journey)
  ↓
B3  Interaction specs (×7)                 (7 docs, parallel, one per surface)
  ↓
B4  Design system codification → DS.md     (one doc, captures drift)
  ↓
B5  Rule-of-five parallel review on each   (5 reviewers per doc, ensemble vote)
  ↓
APPROVED → Phase C wave 1
```

Hard gate: **NO implementation bead may reference a B-document that has not passed B5 review.**

---

## B0 — PRINCIPLES.md

**Owner**: crew (gastown_researcher) + Mayor synthesis pass
**Cap**: 2 hours
**Output**: `~/code/spectralSet/ai_docs/spectralset-vision/PRINCIPLES.md`, ~3 pages

**Required sections**:
1. **What we are building** (1 paragraph). Verbatim seed: "the cockpit a founder running a multi-agent organization lives in all day."
2. **What we are NOT** (5 bullets, see SPECTRALSET-NORTH-STAR.md §"What we are NOT")
3. **The 7 design pillars** (see seed below — refine, don't replace):
   - Real-time omnipresence
   - Direct manipulation > command memorization
   - Founder-scale (Linear info density, not Slack noise)
   - One-click everything daily
   - Conversational fluency (Slack-shaped mail/threads)
   - Surgical observability (state chips for the 3-state polecat model)
   - Beautiful and fast (Things 3 calm, sub-100ms interactions)
4. **Anti-patterns** (gmux post-mortem applied: "build passes ≠ done", velocity over quality, surface polish hiding broken core, fragmented micro-beads)
5. **Success criteria** (5 measurable, see seed below — refine)
6. **Decision rubric**: every Phase B and C trade-off is judged against the pillars + criteria. Rubric example: "if a feature improves pillar X but hurts pillar Y, …"

**Seed inputs to consolidate**:
- `SPECTRALSET-NORTH-STAR.md` (overseer's brave POV)
- 5 journey docs' "what 'delightful' looks like" sections — extract the recurring vocabulary
- `inspiration.md` §"jackpot" patterns: Cmd-K command bar, status chips, Today view, empty-as-haiku, unread-vs-mention badges, in-place drawer threads

---

## B1 — INFORMATION-ARCHITECTURE.md

**Owner**: crew (worktree_researcher)
**Cap**: 3 hours
**Output**: `ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md`, ~4 pages

**Required sections**:
1. **Surface inventory** — every routable view in the future-state app. For each: what it answers, what objects it holds, where in the navigation it lives, what state survives navigation.
2. **Sidebar grouping** — fixed groups vs user-customizable sections (per Slack pattern §4.2). Mute/priority/drag-to-reorder rules.
3. **Top-level surfaces** (proposed — refine):
   - **Today** — default landing, "what needs me right now" (per Things 3 §3.4 + journey 01)
   - **Command bar** — Cmd-K from anywhere (per Linear §1.1 + Raycast §2.1, "single highest-leverage pattern in the catalog")
   - **Agents** — existing AgentCVPanel, refined per journey 02 + 05
   - **Convoys** — existing ConvoyBoard, refined per journey 02 + 04
   - **Mail** — existing MailPanel, refined per Slack patterns + journey 01
   - **Incidents** — NEW, escalations as first-class (per journey 03)
   - **Rejection triage** — NEW, MERGE_FAILED handling (per journey 04)
4. **Cross-surface objects** — beads, polecats, mail threads, escalations all have multiple visualization surfaces. Define: which surface is the "home" for each object type. (e.g., bead home = Beads panel; bead appears in Today as a card, in Convoys as a row, in Command bar as an inline preview.)
5. **Navigation model** — drawer vs route vs modal. Hard rule from inspiration §4.3: **detail opens as drawer, list stays visible**. Routes only for top-level surfaces, never for object detail.
6. **Empty states map** — every surface gets an empty state. Per Things 3 pattern (§3.1): empty is good, no CTA-cluster. Audit findings: today the app has 3 different empty states depending on entry path — IA must collapse this.
7. **Power-user surface** — keyboard shortcuts + command bar coverage. Goal: any common verb has a keystroke or a Cmd-K command.

**Hard input**: `current-state-audit.md` finding "landing experience is inconsistent. 3 different empty states." IA must produce ONE landing.

---

## B2 — Working-backwards user guides (5 docs)

**Owner**: crew, 5 in parallel (one per journey)
**Cap**: 3 hours each
**Output**: `ai_docs/spectralset-vision/user-guides/0[1-5]-<journey>.md`, ~4 pages each

For each of the 5 journey docs, write a future-state user guide that describes the same scenario AS IF SpectralSet already shipped. Style: tutorial, not spec. Reads like "Open SpectralSet. Today view loads. Triage stack at top shows…"

**Required structure per guide**:
1. **Scenario one-liner** (verbatim from journey doc trigger)
2. **Step-by-step ideal flow** — keystrokes/clicks, screen-by-screen, exact microcopy
3. **What the operator sees** — UI elements they encounter (state chips, badges, buttons, drawers)
4. **Failure modes** — what happens when the data isn't loaded, the agent is stalled, the network is down
5. **Compared to today** — table: "today X commands → tomorrow Y clicks/keystrokes"
6. **Inspiration patterns used** — cite by section number from `inspiration.md` (e.g., "uses §1.1 Cmd-K, §3.4 Today view, §4.1 unread-vs-mention badges")

**Required outputs map**:
- Guide 01: morning routine → Today view + triage stack + per-rig "is my rig OK" strip + "go drink coffee" verdict
- Guide 02: sling-and-monitor → bead detail panel with green Sling button + auto-pin on sling + live progress stream (no `gt peek` re-runs) + merge journey collapses into one row
- Guide 03: incident response → Incidents view (NOT mail filter) + auto-collected evidence bundles + runbook-action buttons + coalesce duplicates
- Guide 04: code review handoff → Rejection Triage view + inline failing fragment + failure diagnosis chip + fork-in-road decision panel + auto-quarantine
- Guide 05: agent recovery → state chip per polecat + 3-state model visible + recovery preflight (Check Recovery before Nuke) + re-sling carries continuity

**Anti-pattern**: do NOT write feature specs ("the Today view shall display X"). Write tutorials ("Open the app. The Today view shows…").

---

## B3 — Interaction specs (7 docs)

**Owner**: crew, 7 in parallel
**Cap**: 4 hours each
**Output**: `ai_docs/spectralset-vision/interaction-specs/<surface>.md`, ~5 pages each

One spec per top-level surface. Required sections per spec:
1. **Wireframe** — ASCII or markdown sketch (NOT a full design comp)
2. **Component inventory** — what shadcn/Tailwind components compose it
3. **Microcopy** — every label, every button, every empty state, every error
4. **Keyboard shortcuts** — table: shortcut → verb
5. **Live data behavior** — polling intervals, optimistic updates, stale handling (per inspiration §1.4 "inline notification design")
6. **Trade-offs and rejected alternatives** — what we considered and why we didn't pick it
7. **Open questions for B5 review** — what we're unsure about

**Surface list**:
- spec-today.md — Today view (the new home)
- spec-command-bar.md — Cmd-K (the leverage multiplier)
- spec-agents.md — Agent CV refined
- spec-convoys.md — Convoy board refined
- spec-mail.md — Mail panel Slack-style
- spec-incidents.md — Incidents view (NEW)
- spec-rejection-triage.md — Rejection Triage view (NEW)

---

## B4 — DESIGN-SYSTEM.md

**Owner**: crew (worktree_researcher) + a design-aware polecat for the audit
**Cap**: 4 hours
**Output**: `ai_docs/spectralset-vision/DESIGN-SYSTEM.md`, ~3 pages + tokens reference

**Required sections**:
1. **Type scale** — sizes, weights, line heights. Audit current usage, identify drift.
2. **Spacing scale** — 4px / 8px / 12px / 16px / 24px / 32px etc. Audit drift.
3. **Color tokens** — semantic (`fg-default`, `fg-muted`, `bg-surface`, `accent`, `danger`, `warning`, `success`). Audit hardcoded hex values that should be tokens.
4. **Status badges** — the 3-state polecat model (working/stalled/zombie) gets canonical badge styles. Audit `STATE_BADGE_CLASS` (audit doc flagged: "renders 'nuked' with line-through in muted colour — reads like dead/failed when actually a clean done").
5. **Empty states** — Things 3 style (§3.1). Component template + microcopy guidelines.
6. **Motion tokens** — durations, easings. Currently using motion/react (NOT framer-motion).
7. **Drift report** — list every place current code violates these tokens. Becomes a Phase C cleanup wave.

---

## B5 — Rule-of-five parallel review

**Owner**: 5 reviewer crew per design doc
**Cap**: 1 hour per reviewer per doc
**Method**: each reviewer reads the doc independently, scores 1-5 on: clarity, correctness vs journey, feasibility, completeness, ambition. Cross-agreement → approve. Disagreement → revise.

Apply skill: `parallel-review` (~/.claude/skills/parallel-review/).

**Output per doc**: 5 review notes + final verdict + revision diff (if needed) + overseer sign-off mail.

---

## What I (overseer) commit to in Phase B

1. Read every B-document end-to-end before sign-off (no skim).
2. Walk every B2 user guide mentally as the founder persona — does it FEEL right?
3. Block any B-document that doesn't cite its discovery sources (journeys, audit findings, inspiration patterns).
4. No B-document advances without an evidence trail back to Phase A.
5. Not let Mayor self-declare B-N approved — that's overseer's call.

## Verification protocol per B doc

Apply the standing order from `feedback_dogfooding_verification.md`:
- Every "B-N complete" claim from Mayor includes: file path verified via `ls`, commit hash verified via `git cat-file -e`, 5-line content snippet quoted in the report.
- No bare hashes. No bare paths.

## Open question for the user

The current pace is ~30-min iteration. Phase B has at least 13 deliverables (1 + 1 + 5 + 7 + 1 + reviews). At one-doc-per-iteration with serialization, that's ~10 hours. With parallelism (B2's 5 docs + B3's 7 docs concurrent), ~3 hours per phase + review. Total realistic: 1-2 days of crew throughput.

Phase C (implementation) begins ONLY after Phase B passes B5 review on all docs.

---

## TL;DR for Mayor

When ss-gl3 verifies (post-merge dogfood with screenshot), open this doc and dispatch:
1. B0 PRINCIPLES bead (crew, 2h) — block on it
2. B1 IA bead (crew, 3h) — start while B0 in flight, but don't approve until B0 lands
3. Hold B2-B5 until B0 + B1 are both reviewed by overseer

Use the no-bare-hashes evidence rule for every "complete" report. No exceptions.
