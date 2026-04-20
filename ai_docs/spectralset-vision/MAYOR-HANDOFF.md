---
phase: META
doc_id: MAYOR-HANDOFF
version: v0.1
owner: polecat/jasper
depends_on: []
seed_inputs:
  - ai_docs/spectralset-vision/NORTH-STAR.md
  - ai_docs/spectralset-vision/PHASE-B-FRAMEWORK.md
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/IMPLEMENTATION-PLAN.md
  - ai_docs/spectralset-vision/user-guides/
  - ai_docs/spectralset-vision/interaction-specs/
  - ai_docs/spectralset-vision/journeys/
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md
  - ai_docs/spectralset-vision/cli-pain-inventory.md
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

## Current phase

Phase A (Discovery) **DONE**. Phase B (Design) **86%+ landed** — all B0/B1/B2/B3/B4 documents have v0.1 on main; B3 interaction specs are mid-review (three rounds of independent polecat reviews in flight). Phase C Wave 1 **in prep** — IMPLEMENTATION-PLAN.md v0.1 just landed (ss-6xl, commit `358b31e`), awaiting Overseer approval + B3 close before Wave 1 dispatch. `origin/main` tip: `358b31edaa504e3039bbfc14d4d45899ca70f43e`. Vision corpus: 26 `.md` files under `ai_docs/spectralset-vision/` (9 top-level + 7 interaction-specs + 5 journeys + 5 user-guides), 22 commits on main touching the corpus.

## What shipped (in order)

Verified via `git log origin/main --oneline ai_docs/spectralset-vision/` (22 entries, oldest first).

| Phase | Bead | Commit | Title |
|-------|------|--------|-------|
| A2    | ss-urc | `4920bd2` | DISC-A2 current-state audit of all 40 desktop routes |
| A4    | ss-3jt | `04616f5` | DISC-A4 inspiration catalog — 30 patterns, top-10 priority |
| A1+A3 | ss-2vk | `db7d113` | Phase A1 journeys + A3 CLI inventory |
| A-fix | ss-2yg | `784b77f` | Move Phase B framework + North Star into repo |
| B0    | ss-6o8 | `3220d7d` | PRINCIPLES.md v0.1 |
| B1    | ss-xfl | `9f73933` | INFORMATION-ARCHITECTURE.md v0.1 |
| B0 r  | ss-cqz | `781a2d5` | PRINCIPLES.md v0.2 revision |
| B4    | ss-qnm | `dd66aa1` | DESIGN-SYSTEM.md v0.1 |
| B2    | ss-fq7 | `86fe104` | user guide journey 01 morning-routine v0.1 |
| B2    | ss-xut | `62f63c1` | user guide 05 agent-recovery v0.1 |
| B2    | ss-96x | `4fc9b3b` | user guide 04 code-review handoff |
| B2    | ss-0ld | `7126fc2` | user guide 03 incident response |
| B2    | ss-0sb | `c365096` | user guide 02 sling-and-monitor v0.1 |
| B4 r  | ss-a9j | `ed1922e` | DESIGN-SYSTEM.md v0.2 — expand §7 drift report |
| B3    | ss-0ft | `43157b1` | spec-command-bar.md v0.1 |
| B3    | ss-1n4 | `1896a33` | spec-today v0.1 |
| B3    | ss-2xy | `16bb464` | spec-mail v0.1 |
| B3    | ss-gg8 | `ec4b4ca` | spec-convoys v0.1 |
| B3    | ss-2a6 | `87f9a30` | spec-agents v0.1 |
| B3    | ss-cil | `343f4db` | spec-rejection-triage v0.1 |
| B3    | ss-ry5 | `347213d` | spec-incidents v0.1 |
| C0    | ss-6xl | `358b31e` | C0 Wave 1 IMPLEMENTATION-PLAN.md v0.1 |

## In flight

Six review-only polecats are running B3 independent review rounds (no code changes; verdict-only). Source: `gt polecat list spectralSet` + `bd show` per bead, 2026-04-20.

| Polecat | Bead | Target | Round |
|---------|------|--------|-------|
| amber   | ss-two | ss-gg8 (spec-convoys) | v3/3 |
| basalt  | ss-fz8 | ss-gg8 (spec-convoys) | v2/3 |
| flint   | ss-mig | ss-cil (spec-rejection-triage) | v1/3 |
| garnet  | ss-xxy | ss-2xy (spec-mail) | v1/3 |
| granite | ss-0rl | ss-cil (spec-rejection-triage) | v2/3 |
| jade    | ss-87g | ss-1n4 (spec-today) | v2/3 |
| jasper  | ss-039 | this handoff doc | — |

Idle polecats available for dispatch: marble, obsidian, onyx, opal, pearl, pyrite, quartz, ruby, shale, slate, topaz (11).

## Blocked / pending

- **spec-rejection-triage v0.2** — v0.1 received 2+ REVISE verdicts. Revision bead pending Overseer decision on which REVISE notes to adopt; not yet dispatched.
- **spec-incidents downstream work** — depends on B4 DESIGN-SYSTEM stabilization + amber's authoring cycle completing the review round.
- **B3 reviewers in flight** — six review beads above must return verdicts before B3 can be declared closed. Aggregation pass required (Overseer triage → verdict tally → per-surface APPROVE/REVISE call).
- **Phase C Wave 1 dispatch** — blocked on (a) Overseer approval of IMPLEMENTATION-PLAN v0.1 (ss-6xl) and (b) B3 close. Do not dispatch C1/C2 crew work until both clear.

## Standing orders

Encoded from `~/.claude/projects/-Users-spectralgo-code-spectralGasTown/memory/feedback_dogfooding_verification.md` and adjacent feedback memories. Mayor must enforce these on every intake and every evidence reply.

- **No value imports from `gastown-cli-client` in renderer.** Type-only imports are fine; runtime imports pull the CLI bundle into the renderer and break. Source: `feedback_no_value_imports_renderer.md`.
- **Dogfooding-verification rule**: "Commit landed on main" ≠ "works in app." Every `✅ landed` claim for a running-process change requires the running Electron process restarted + screenshot-verified. Vite HMR does not reload the main process / tRPC.
- **3-part dogfood checklist**: (1) `git pull origin main` in the running checkout, (2) `git log --oneline -1` matches the expected hash, (3) kill + relaunch Electron for any main-process / tRPC / cli-client change. Renderer-only edits may still need a full reload if HMR refuses.
- **Symmetry-of-fix rule**: when a fix appears to fail post-restart, look for OTHER call sites of the same data before assuming the patch was wrong. Multiple code paths, one fixed, one missed.
- **No-bare-hashes evidence rule**: every claim that a file/commit exists ships with (a) `ls -la` of the path, (b) `git cat-file -e <hash>` exit code, (c) a 5-line content snippet quoted verbatim. Bare "done, path X, commit Y" reports are rejected.
- **Length-budget standing order**: every B-doc spec ships with an explicit length target (3-5 pages / 180-300 lines) and hard cap (7 pages / 420 lines). Over-target under-cap = APPROVE with polish note; over-cap = REVISE.
- **Per-item rubric rule**: pillar/surface audits inside a B-doc are graded per-item with `grep` verification. Aggregate 90% ≠ pass; each row must hit ≥90% independently. Rule-of-five tiered review remains authoritative.
- **Phase B schema intake**: every Phase B deliverable starts with mandatory YAML front-matter (`phase`, `doc_id`, `version`, `owner`, `depends_on`, `seed_inputs`, `required_sections_present`, `section_count_self_check`, `overseer_review_requested`). Mayor pre-screens via schema — grep keys, count `^## ` headers, `ls` each seed. Mismatch → bounce.

## Known ops hazards

- **Town root HEAD drift** — town root has previously shown a polecat branch in the cosmetic warning banner (e.g., `polecat/obsidian-mo6359de`). Fixed earlier via `git symbolic-ref` but may re-drift as polecats rotate. Cosmetic only; no functional impact.
- **`gt nudge` stale-sigil bug** — nudges occasionally deliver with stale hook content. Fallback: `--mode queue` or raw `tmux send-keys` with explicit Enter.
- **SSH key broken for user's `~/code/spectralSet` fetch from GitHub origin** — the user's persistent checkout cannot push to `origin` directly. Shared bare repo has every commit; origin push flows through refinery. Polecat sandboxes push to origin normally.
- **Review-only bead auto-reassign loop** — when a `--review-only` bead is slung with no code to change, current workflow wants to reassign on close. Polecats correctly `gt done --status DEFERRED` (or no-changes close) to break the loop. Workflow gap; not yet fixed in formula.
- **Ephemeral polecat sandboxes** — polecat sandboxes are wiped on reassignment. Any artifact not on `origin` (via `gt done` → refinery merge) is lost the moment a new sling hits the same polecat. Crew sessions persist in the CEO's checkout but still need explicit commits. Corollary: never trust an in-flight branch.

## Next actions for new Mayor

1. Run `gt mail inbox` — triage unread pinned mail first.
2. Read this doc end-to-end.
3. Aggregate any B3 review verdicts that landed while you were offline (tally per-surface APPROVE/REVISE; escalate REVISE-heavy surfaces to Overseer).
4. Run `gt polecat list spectralSet` — confirm the six review polecats are still working or already returned; reap finished ones.
5. Await Overseer directives before new dispatches. Do NOT dispatch Phase C Wave 1 until C0 is approved and B3 is closed.
