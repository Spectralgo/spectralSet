---
phase: C0
doc_id: IMPLEMENTATION-PLAN
wave: 1
surface: today
version: v0.1
owner: crew/gastown_researcher
depends_on: [B0, B1, B2-ug-01, B3-spec-today, B4]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/user-guides/01-morning-routine.md
  - ai_docs/spectralset-vision/interaction-specs/spec-today.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/current-state-audit.md
required_sections_present: true
section_count_self_check: 6
overseer_review_requested: 2026-04-20
---

# Phase C Wave 1 — Today surface IMPLEMENTATION-PLAN.md

## 1. Scope of Wave 1

**Goal (one sentence):** Today surface ships as the default landing view at `/today` with the five regions specified in `spec-today.md §1` — masthead, triage stack, rigs strip, mail pile, verdict tail — each honoring the microcopy (`spec-today §3`), keyboard shortcuts (`spec-today §4`), live-data contract (`spec-today §5`), and B4 tokens (`DESIGN-SYSTEM.md §1-§6`).

**In scope (Wave 1):** everything required to make a cold-started operator answer "what needs me right now?" in ≤30s without opening the terminal (`PRINCIPLES.md` Success Criterion 1). Concretely: the route, the sidebar row, the data layer, the five region components, the realtime subscription glue, the keyboard shortcut wiring, the empty/error states.

**Out of scope (deferred to later waves):**

- **Command bar integration** (`Cmd-Shift-K` → `Mute this source`). Wave 1 Today renders triage cards without in-card mute — mute arrives when command bar lands.
- **Drawer destinations.** Open (`O`) on a triage card navigates to `/incidents` / `/rejection-triage` / `/mail/<thread>` routes for Wave 1. Dedicated incident / rejection / thread drawers ship with those surfaces' own waves.
- **Cross-surface object rendering** (bead drawer from an appearance, polecat drawer from a rig row). Wave 1 Today does not own drawers; it owns *launch*.
- **Sidebar redesign** per `INFORMATION-ARCHITECTURE.md §2`. Wave 1 adds a single Today row to the existing sidebar; the full sidebar restructure (fixed groups + user-customizable sections + mute-per-section) is its own wave.
- **Since-you-slept richer gap handling** (Open Question 8 of spec-today). Wave 1 fires "Welcome back. Fetching overnight…" on every cold-start; reviewer-selected threshold defers to measurement in Phase D.

Every bead below assumes the ss-7mt (townPath threading), ss-gl3 (resolveEffectiveTownPath), and ss-c4r (traffic-light safe area) fixes are on `main` — those are baseline, not Wave 1 work.

## 2. Bead inventory

Ten implementation beads. Each sits under the `<200 LoC` / session-cap / single-concern discipline from the bead directive. File paths are exact. Review tier is rule-of-three polecat review post-merge unless the bead is doc/style-only.

### C1-today-01: `/today` route scaffold + sidebar row

- **Title:** `C1 Today #01: /today route + sidebar row`
- **Files:** `apps/desktop/src/renderer/routes/_authenticated/today/page.tsx` (create); `apps/desktop/src/renderer/routes/page.tsx` (modify redirect from `/` → `/today`); `apps/desktop/src/renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx` (add one fixed row for Today with count badge placeholder).
- **LoC:** ≤120.
- **Session cap:** 15 min.
- **Depends on:** none — this ships a static page skeleton with five labeled empty regions that take data-layer props.
- **Review:** rule-of-three.
- **Renderer-safety:** no Electron-main changes; type-only imports from `packages/trpc`.
- **Post-merge verification:** dogfooding walk — open app, verify default landing is `/today`, five region placeholders render with correct region headings per wireframe, sidebar shows new Today row.
- **Success = done when:** `/today` renders with placeholders; sidebar has a Today entry at position 1; `/` redirects to `/today`; breadcrumb reads "Today"; no console warnings; screenshot appended to `DOGFOODING-TRACKER.md`.

### C1-today-02: tRPC `gastown.today` router (data layer)

- **Title:** `C1 Today #02: gastown.today router — digest + triage procedures`
- **Files:** `apps/desktop/src/lib/trpc/routers/gastownToday.ts` (create); `apps/desktop/src/lib/trpc/routers/index.ts` (register); thin `packages/trpc/src/routers/gastownToday.ts` type export if needed for renderer consumption.
- **Procedures:**
  - `gastown.today.digest` → `{ sinceTime: string; mergedCount: number; awaitingReviewCount: number; escalationsAckedCount: number; polecatsAliveCount: number }` (or `{ firstLaunch: true }` if no prior foreground).
  - `gastown.today.triage` → `{ cards: TriageCard[] }` where `TriageCard` = incident | rejection | pinned-mail, each with severity/cause, title, meta (rig/polecat/sender/age), source-id (for Open).
- **LoC:** ≤180.
- **Session cap:** 30 min (data-layer ceiling).
- **Depends on:** none — materializes from existing Gas Town CLI calls (`gt status --json`, `gt mail inbox`, `gt mq list`). Incidents and rejections materialize from mail filtered by severity/type until dedicated sources land in later waves (see §4 Out-of-stack surprises).
- **Review:** rule-of-three.
- **Renderer-safety:** router lives in Electron main's tRPC; renderer consumes via existing `apiTrpcClient` pattern (audit §2 — the `gastown/*` routers already follow this).
- **Post-merge verification:** shell test — `curl` or tRPC devtools hit of both procedures returns a well-formed payload against a real Gas Town install; dogfooding walk confirming JSON renders (debug route) before UI consumption.
- **Success = done when:** both procedures enumerated in the tRPC OpenAPI-style registry; unit-level type safety from Drizzle / Zod shape; no `any` types; procedures return empty arrays cleanly when Gas Town is unreachable (not errors); `zod` validators present.

### C1-today-03: `TriageCard` primitive (packages/ui)

- **Title:** `C1 Today #03: TriageCard primitive + A/O/S buttons + undo window`
- **Files:** `packages/ui/src/components/TriageCard/TriageCard.tsx` (create); `packages/ui/src/components/TriageCard/TriageCard.test.tsx` (create — co-located); `packages/ui/src/components/TriageCard/index.ts` (barrel).
- **LoC:** ≤180.
- **Session cap:** 20 min.
- **Depends on:** none structural; consumes B4 tokens (`DESIGN-SYSTEM.md §1` type ramp, `§4` status badges, `§6` motion tokens).
- **Review:** rule-of-three.
- **Renderer-safety:** pure presentational component; no tRPC, no Electron-main access.
- **Post-merge verification:** Storybook (or unit-render test) for each card type; dogfooding walk later — as part of C1-today-05.
- **Success = done when:** three slotted variants (incident / rejection / pinned-mail) render correctly with the canonical severity/cause chip; Ack button fires optimistic callback + inline "Acked · <time> · Undo" state; Snooze opens the duration prompt; 6-second undo window with visible countdown; focus order A → O → S; no arbitrary pixels / hex.

### C1-today-04: Masthead region (breadcrumb + since-you-slept)

- **Title:** `C1 Today #04: Today masthead — breadcrumb + since-you-slept line`
- **Files:** `apps/desktop/src/renderer/routes/_authenticated/today/components/TodayMasthead/TodayMasthead.tsx` (create + index.ts); `apps/desktop/src/renderer/routes/_authenticated/today/components/TodayMasthead/TodayMasthead.test.tsx`.
- **LoC:** ≤140.
- **Session cap:** 15 min.
- **Depends on:** C1-today-02 (`gastown.today.digest`).
- **Review:** rule-of-three.
- **Renderer-safety:** renderer-only; type-only import of the digest return shape.
- **Post-merge verification:** dogfooding walk — cold-start renders "Welcome back. Fetching overnight…", resolves to populated copy after digest; zero-overnight state tested by manually driving an empty digest; screenshots appended.
- **Success = done when:** all four copy variants from `spec-today §3 Masthead` render in the right conditions; relative-time formatter matches `just now` / `<N>s ago` / `<N>m ago` / `<N>h ago` thresholds; absolute fallback for stale renders `Stale since <absolute>`; no hardcoded hex.

### C1-today-05: Triage stack region

- **Title:** `C1 Today #05: Today triage stack — live list, sort, j/k/A/O/S keybindings`
- **Files:** `apps/desktop/src/renderer/routes/_authenticated/today/components/TriageStack/TriageStack.tsx` (create + index + test); `apps/desktop/src/renderer/routes/_authenticated/today/components/TriageStack/useTriageKeybindings.ts` (hook).
- **LoC:** ≤200 (hard cap).
- **Session cap:** 20 min.
- **Depends on:** C1-today-02 (`gastown.today.triage`), C1-today-03 (`TriageCard`), C1-today-09 (realtime wrapper — soft dep; can ship stub-polling then upgrade).
- **Review:** rule-of-three.
- **Renderer-safety:** renderer-only.
- **Post-merge verification:** dogfooding walk — three-card stack renders, j/k advances focus, A acks optimistically with visible undo, O navigates to the right Wave-1 route (`/incidents` / `/rejection-triage` / `/mail`), S opens the duration prompt; screenshot sequence appended.
- **Success = done when:** sort is severity-then-age deterministic; optimistic Ack + rollback on server rejection works; Snooze confirms with toast + Undo; overflow rule from spec-today §7 Q3 is the `+<N> more — open Incidents` link replacing the verdict tail when the stack exceeds visible height (decided locally: overflow link, not scrollable stack).

### C1-today-06: Rigs strip region

- **Title:** `C1 Today #06: Today rigs strip — one typographic row per rig with reason templates`
- **Files:** `apps/desktop/src/renderer/routes/_authenticated/today/components/RigsStrip/RigsStrip.tsx` (create + index + test); `apps/desktop/src/renderer/routes/_authenticated/today/components/RigsStrip/reasonTemplate.ts` (pure).
- **LoC:** ≤160.
- **Session cap:** 15 min.
- **Depends on:** C1-today-02 (data layer provides rigs + per-rig aggregate via `gastown.today.triage` joined with `gt status --json`).
- **Review:** rule-of-three.
- **Renderer-safety:** renderer-only.
- **Post-merge verification:** dogfooding walk — row per rig renders correct dot color (working/stalled/zombie via B4 state-chip palette), reason template fires the right string per rig state (all-quiet / stalled / ready / zombie / offline), no boxes per B4 typography-hierarchy rule; screenshot appended.
- **Success = done when:** all five reason variants covered; no emoji in state chips; `space-3` row height, `space-2` gap; rig count stays typographic even at 10+ rigs (no horizontal scroll, no truncation).

### C1-today-07: Mail pile region

- **Title:** `C1 Today #07: Today mail pile — collapsed row, expand, bulk archive / mark-read`
- **Files:** `apps/desktop/src/renderer/routes/_authenticated/today/components/MailPile/MailPile.tsx` (create + index + test); `apps/desktop/src/renderer/routes/_authenticated/today/components/MailPile/useMailPileKeybindings.ts`.
- **LoC:** ≤180.
- **Session cap:** 20 min.
- **Depends on:** C1-today-02 (query for "unprocessed" = read-but-not-archived subset of current-user inbox); assumes a `mail.archive` + `mail.markRead` procedure exists (the audit flagged `Mark-read hard-disabled` — if still disabled, the bead's precondition fails; see §4).
- **Review:** rule-of-three.
- **Renderer-safety:** renderer-only.
- **Post-merge verification:** dogfooding walk — collapsed row shows correct count, E toggles expand, X bulk-archives with toast + Undo, R marks all read (distinct verb); partial-failure rollback visible per spec-today §5; screenshots appended.
- **Success = done when:** E/X/R shortcuts only active when pile is expanded (guard); bulk ops are optimistic; per-row restore on partial failure with muted `retry`; empty pile collapses the row entirely (row disappears per spec-today §3 — "Mail pile empty: row disappears — not an empty state").

### C1-today-08: Verdict tail

- **Title:** `C1 Today #08: Today verdict tail — all-green / amber-with-plan / red-suppressed`
- **Files:** `apps/desktop/src/renderer/routes/_authenticated/today/components/VerdictTail/VerdictTail.tsx` (create + index + test).
- **LoC:** ≤100.
- **Session cap:** 10 min.
- **Depends on:** C1-today-05 (reads current triage state), C1-today-06 (reads rigs state), C1-today-07 (reads mail pile state — counts as "attended" if 0 unprocessed).
- **Review:** rule-of-three.
- **Renderer-safety:** renderer-only.
- **Post-merge verification:** dogfooding walk — induce all-green, amber-with-plan, and red (unacked HIGH) states; verify the verdict tail renders the correct copy, disappears on red, and its timestamp crossfades `dur-fast` on tick; screenshots appended.
- **Success = done when:** three states mutually exclusive; copy exact per spec-today §3 Verdict tail; centered, `text-subtitle fg-default`, `space-12 top / space-8 bottom`; no box.

### C1-today-09: Realtime wrapper + stale / reconnecting UI

- **Title:** `C1 Today #09: HASHOF_DB polling wrapper + stale chip + reconnecting bar`
- **Files:** `apps/desktop/src/renderer/lib/realtime/useDoltHashPoll.ts` (create); `apps/desktop/src/renderer/routes/_authenticated/today/components/StaleChip.tsx` (create); `apps/desktop/src/renderer/routes/_authenticated/today/components/ReconnectingBar.tsx` (create).
- **LoC:** ≤180.
- **Session cap:** 25 min.
- **Depends on:** C1-today-02 (queries to invalidate); confirm the Phase P4 Dolt HASHOF_DB infrastructure is actually accessible (current-state-audit did not walk the renderer-side polling path — see §4 Out-of-stack surprises).
- **Review:** rule-of-three.
- **Renderer-safety:** renderer-only hook; the HASHOF_DB query itself is already in Electron main per Phase P4.
- **Post-merge verification:** dogfooding walk — induce a mutation server-side (e.g. send a mail), confirm UI reflects within 500ms without reload; induce a stream-tick absence >2s → stale chip appears on masthead; absence >10s → reconnecting bar appears at window bottom (`bg-inset`, height `space-1`); screenshots for each state appended.
- **Success = done when:** poll interval is 500ms; invalidation is query-scoped not global; stale chip uses `accent-warning @ 15%`; reconnecting bar is never a modal; prefers-reduced-motion strips the pulse per B4 §6.

### C1-today-10: Empty states + error treatments + degraded fallbacks

- **Title:** `C1 Today #10: Today empty state + Gas-Town-unreachable / probe-mismatch / Dolt-degraded fallbacks`
- **Files:** `apps/desktop/src/renderer/routes/_authenticated/today/components/TodayEmptyState.tsx`; `apps/desktop/src/renderer/routes/_authenticated/today/components/TodayErrorStates.tsx` (three variants in one file since they share primitives).
- **LoC:** ≤150.
- **Session cap:** 20 min.
- **Depends on:** C1-today-01 (route); C1-today-09 (degraded hooks).
- **Review:** rule-of-three.
- **Renderer-safety:** renderer-only.
- **Post-merge verification:** dogfooding walk — force the three failure modes (stop Gas Town daemon; point probe at a directory with no rigs; hang Dolt) and verify copy + recovery buttons per spec-today §3 Errors; all-clear empty state renders verbatim haiku copy; screenshots appended.
- **Success = done when:** empty state matches `DESIGN-SYSTEM.md §5` template (single haiku line + optional meta subline, no CTA cluster); error treatments use `accent-danger`; Dolt-degraded injects a HIGH incident card at the top of the triage stack per spec-today §5; ack suppresses re-injection for 10 minutes.

## 3. Dependency graph

ASCII tree. Minimum viable Today = path from root to "visible `/today` with data rendering".

```
                          C1-today-02 (data layer)
                          /     |         |        \
                         /      |         |         \
                        v       v         v          v
                   C1-today-04  C1-today-05*  C1-today-06  C1-today-07
                   (masthead)   (triage)      (rigs)       (mail pile)
                                 ^
                                 |
                                 C1-today-03 (TriageCard primitive)
                                 (also blocks C1-today-05)

   C1-today-01 (route + sidebar row)  ─── independent; can ship first as skeleton
                        |
                        v
                   C1-today-08 (verdict)  ─── depends on 05 + 06 + 07 (reads state)
                        ^
                        |
                   C1-today-09 (realtime)  ─── wraps the queries from 02; depended on soft-ly
                        ^                     by 05/06/07 for mid-session freshness
                        |
                   C1-today-10 (empty + errors) ─── depends on 01 + 09
```

**Minimum viable Today =** `01 → 02 → 03 → 04 → 05 → 06 → 07 → 08`, in order. That's eight beads to a working surface. `09` upgrades freshness semantics; `10` covers failure states. Both `09` and `10` are required for "done" but can land last.

**Parallelizable:**

- Once `02` lands, `04`, `05` (once `03` lands), `06`, `07` can go in parallel on four polecats.
- `03` can start the moment `02` has shape defined — its contract is stable from `spec-today §2`.
- `09` is independent of the region components; it consumes the same queries they consume.

**Sequential (must serialize):**

- `02 → 04` (masthead consumes digest).
- `03 → 05` (stack consumes card primitive).
- `05 + 06 + 07 → 08` (verdict reads their states).
- `01 → 10` (empty/error states render inside the route shell).

## 4. Out-of-stack surprises

Spec-today assumes four things that may not exist on `main`. Each is named + its resolution proposed.

**S1 — Incidents and Rejection Triage data sources do not exist as distinct schemas.**
Today's triage stack merges three streams (incidents, rejections, pinned mail). The `/incidents` and `/rejection-triage` surfaces are scheduled for later waves, so their queries don't exist yet. *Resolution:* `gastown.today.triage` (C1-today-02) materializes "incidents" from mail with `type=HIGH|CRITICAL|HELP` and "rejections" from mail with `type=MERGE_FAILED|REWORK_REQUEST` (per `GASTOWN-LESSONS-AND-TIPS.md §10` mail type map, already the source of truth for type urgency). Downstream waves swap in dedicated sources without changing Today's consumer shape. This is a *pre-wave schema decision*, not a new bead.

**S2 — `mail.archive` and `mail.markRead` may still be disabled.**
Audit §"Gas Town Mail" flagged "Mark-read is hard-disabled" with an inline P5-C ship note. Wave 1 Mail pile (C1-today-07) needs both procedures. *Resolution:* if either is disabled on `main` as of sling time, **bud out a pre-wave bead** `C1-today-07a: enable gastown.mail.archive + gastown.mail.markRead` (≤100 LoC) and gate C1-today-07 on it. Overseer D2 (`PRINCIPLES.md Decisions`) makes mark-read a v1 blocker anyway, so this is rolling that decision forward.

**S3 — Dolt HASHOF_DB renderer-side polling is claimed ("already proven") but not walked in the current-state audit.**
`NORTH-STAR.md:27` and `PRINCIPLES.md §4 Pillar 1` cite "0.14ms polling — already proven". The current-state audit did not inspect the renderer consumer of this infrastructure. *Resolution:* C1-today-09 opens with a 15-min spike to locate the existing Phase P4 renderer hook (if any); if present, wrap it; if absent, the bead expands to include the renderer-side poll loop + tRPC subscription. The LoC budget of ≤180 assumes wrap; if "write from scratch", split `C1-today-09` into `09a: poll hook` and `09b: stale/reconnecting UI`.

**S4 — Sidebar Today row shares the sidebar with v1/v2 workspace stacks.**
Audit §1 TL;DR item 2 flagged "two parallel workspace stacks coexist" in the sidebar. Adding a Today row may land in the wrong stack. *Resolution:* C1-today-01 adds the Today row to **the `GastownSidebarSection` component only** (the one that owns agents/convoys/mail today). No workspace-sidebar changes. The full sidebar restructure (IA §2) is a separate, post-Wave-1 wave; this is explicitly out of scope per §1.

**S5 — Overflow behavior when triage stack > visible height.**
Spec-today §7 Open Question 3 left this unresolved. *Resolution (decided locally for Wave 1):* the stack is *not* scrollable; when it exceeds visible height, the verdict tail is replaced by the overflow link `+<N> more — open Incidents`. Rationale: scrollable stacks tempt operators to miss CRITICAL behind a preferred PINNED card, violating the rigs-strip "no user-maintained sort" rule (`spec-today §6 Rejected: drag-to-reorder`). Escalate to Overseer if a B5 reviewer objects.

## 5. Success criteria per bead

Each bead declares its done-gate. Applied in order on every merge request.

| Bead | Success gate (minimum) |
|------|------------------------|
| C1-today-01 | `/today` renders five labeled region placeholders; `/` redirects to `/today`; sidebar has a Today row at position 1; screenshot in `DOGFOODING-TRACKER.md`; build + typecheck + test pass. |
| C1-today-02 | Both procedures return well-formed JSON against a real Gas Town install; zod validators pass; empty-Gas-Town path returns `{ firstLaunch: true }` / `{ cards: [] }` without throwing; no `any` types. |
| C1-today-03 | Three slot variants render; A/O/S focus order verified; optimistic Ack + 6s undo observable in Storybook (or unit test); tokens all from B4. |
| C1-today-04 | Four copy variants from `spec-today §3 Masthead` render in the right conditions; relative-time thresholds verified via test; dogfooding screenshot for each state. |
| C1-today-05 | Severity-then-age sort deterministic; optimistic Ack + server rollback observable; O navigates to the right Wave-1 route; overflow link fires at N+1 cards; screenshot sequence appended. |
| C1-today-06 | All five reason variants covered; presence dot colors match B4 §4 state-chip palette; 10+ rigs still render typographically (no horizontal scroll); screenshot. |
| C1-today-07 | E/X/R shortcuts work when expanded, blocked when collapsed; bulk-archive toast + Undo functional; partial-failure restore visible; empty pile row disappears. |
| C1-today-08 | Three states mutually exclusive; correct copy per spec-today §3; no box; centered; `dur-fast` timestamp crossfade visible. |
| C1-today-09 | 500ms poll observable via devtools; query-scoped invalidation confirmed (no blanket refetch); stale chip at 2s, reconnecting bar at 10s; prefers-reduced-motion honored. |
| C1-today-10 | Three error treatments + all-clear haiku + Dolt-injected HIGH card all reproduced; ack suppresses re-injection for 10min; screenshots for each. |

**Global gate for Wave 1 completion** (maps to `PRINCIPLES.md §6` Success Criterion 1 — "morning-routine collapse"): stopwatch a cold-start on a real Gas Town install; operator answers "what needs me?" in ≤30s without touching the terminal. If ≤30s fails, Wave 1 is NOT done — beads may have passed individually while the surface missed its purpose.

## 6. Open questions for overseer review

Genuine unresolveds that need a decision before Mayor slings Wave 1.

1. **S2 gate-bead.** If `gastown.mail.archive` / `gastown.mail.markRead` are still disabled at sling time, should I file `C1-today-07a` as a blocking pre-wave bead, or collapse it into C1-today-07 (widening LoC to ~280 and breaking the <200 discipline)? Recommendation: pre-wave bead, preserves discipline.

2. **Overflow behavior (S5).** I decided locally for "+<N> more — open Incidents" (not scrollable). This contradicts no B0/B1/B3 source but was an Open Question in `spec-today §7`. Overseer ratify or override?

3. **Triage stream materialization (S1).** Today's triage stack reads from mail-with-severity-filter until Incidents + Rejection Triage surfaces land. Acceptable for Wave 1, or does Overseer want a dedicated `incidents` / `rejections` table-or-view now, even ahead of those surfaces' own waves? Recommendation: materialize from mail now; dedicated sources follow their surfaces.

4. **C1-today-09 spike budget.** If the Phase P4 HASHOF_DB hook doesn't exist for the renderer (S3), C1-today-09 splits into two beads. Does Mayor file both up front (tentative 09a / 09b) or just 09 and split at discovery time? Recommendation: file a single 09 with explicit "spike first, split if needed" clause; Mayor can split on the fly.

5. **Sidebar Today row placement (S4).** Confirm: Wave 1 modifies only `GastownSidebarSection` (gastown namespace), not the workspace sidebar. No cross-sidebar reshuffling. Overseer ratify?

6. **Bead naming scheme.** I used `C1-today-NN` (wave-surface-index). If Mayor prefers `ss-XXX` bead IDs allocated at file time, propose a name-map in the reply. Recommendation: Mayor allocates real IDs on `bd create`; `C1-today-NN` is just placeholder for this plan's legibility.

7. **Dogfooding evidence cadence.** `PRINCIPLES.md §5 Anti-patterns` mandates screenshot-per-done; with 10 beads this is ~10-20 screenshots. Confirm that each bead's post-merge report appends to the single `DOGFOODING-TRACKER.md` (appending not overwriting). Recommendation: append; one header per bead; no separate per-bead files.

8. **Wave 1 gate.** Does passing all 10 per-bead gates count as "Wave 1 done", or does the Wave-1 gate also require the global ≤30s stopwatch test (§5 last paragraph)? Recommendation: global stopwatch is the gate; per-bead gates are necessary-but-not-sufficient.
