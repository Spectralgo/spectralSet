---
phase: B3
doc_id: spec-rejection-triage
version: v0.2
owner: polecat/opal
depends_on: [B0, B1, B4, B2-ug-04-code-review-handoff]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/user-guides/04-code-review-handoff.md
  - ai_docs/spectralset-vision/journeys/04-code-review-handoff.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#1.3
  - ai_docs/spectralset-vision/inspiration.md#1.4
  - ai_docs/spectralset-vision/inspiration.md#2.2
  - ai_docs/spectralset-vision/inspiration.md#2.3
  - ai_docs/spectralset-vision/inspiration.md#3.1
  - ai_docs/spectralset-vision/inspiration.md#4.1
  - ai_docs/spectralset-vision/inspiration.md#4.5
required_sections_present: true
section_count_self_check: 8
overseer_review_requested: 2026-04-20
---

# B3 Interaction Spec — Rejection Triage

> **Surface**: `/rejection-triage` (IA §3 "Rejection Triage", surface #7).
> **Answers**: "which polecat branches just got rejected by the refinery, and why?"
> **Replaces**: the 8-step CLI dance (`journeys/04-code-review-handoff.md:27-69`) —
> `gt mail read → cat refinery log → git fetch → git checkout → bun install →
> bun typecheck → bd create → gt sling` — plus the Law #1 violation temptation
> that every "fix it myself" shortcut encodes (`PRINCIPLES.md:87`).

## 1. Wireframe

ASCII sketch. Three zones: sidebar (existing), surface header, card list. A
rejection **drawer** slides in from the right when a card is focused + opened;
the list stays visible behind it (IA §5: "detail opens as a drawer; list stays
visible").

```
┌─ sidebar ─┬─ /rejection-triage ────────────────────────────────────────┐
│           │                                                            │
│ Today  12 │ Rejection Triage                     [ Group by ▾ ]        │
│ Incidents │ 4 rejections · grouped by root cause                       │
│ Rejection │ ──────────────────────────────────────────────────────     │
│   Triage 4│                                                            │
│ Mail    5 │ stale-imports (3)                  [ Respin all three ]    │
│ Agents    │ ──────────────────────────────────                         │
│ Convoys   │ ┌──────────────────────────────────────────────────────┐  │
│           │ │ polecat/jasper-rebrand-mobile-a82c  ⟳ quarantined    │  │
│ Sections  │ │ ember-on-amber chip: stale-imports                   │  │
│   +       │ │                                                      │  │
│           │ │ packages/mobile/src/foo.ts:42:14                     │  │
│           │ │   Property 'legacyField' does not exist on type      │  │
│           │ │   'RebrandSchema'.                                   │  │
│           │ │     40 | const record = await resolveRecord(id);     │  │
│           │ │     41 | if (!record) return null;                   │  │
│           │ │     42 | return record.legacyField ?? fallback;      │  │
│           │ │        |              ^^^^^^^^^^^                    │  │
│           │ │                                                      │  │
│           │ │ Branch cut 12h ago · 1 of 4 main files conflict ⚠    │  │
│           │ │                                                      │  │
│           │ │ [ Respin fresh polecat ]  [ Self-fix locally ]       │  │
│           │ │   Open full refinery log                             │  │
│           │ └──────────────────────────────────────────────────────┘  │
│           │ ┌ polecat/onyx-rebrand-docs-7f2d  (collapsed) ─────────┐  │
│           │ ┌ polecat/quartz-rebrand-web-b190 (collapsed) ─────────┐  │
│           │                                                            │
│           │ test-regression (1)                                        │
│           │ ──────────────────────────────                             │
│           │ ┌ polecat/obsidian-auth-refactor-c41e (collapsed) ─────┐  │
│           │                                                            │
│           │ Resubmitted (2) ▸                                          │
│           │                                                            │
└───────────┴────────────────────────────────────────────────────────────┘
```

**Empty-state variant** — DESIGN-SYSTEM §5 template, single centered line:
`No rejected branches. Merge queue is flowing.` No CTA.

**Primary vs secondary** — the failing fragment is the most prominent
sub-element; Respin is primary (ember brand); Self-fix is secondary (ghost);
the refinery log link is tertiary (underlined text). Group heading is pure
typography (`text-subtitle`, DESIGN-SYSTEM §1); the chip inside carries the
color. No boxed section dividers.

## 1a. Wireframe — Drawer open

Card focused + `Enter` (or `Open full refinery log` clicked) → rejection
drawer slides in from the right. The card list stays visible behind it
(IA §5). The drawer is a **log-plus** surface: primary payload is the
full refinery log viewer; secondary payloads are this branch's rejection
history and a one-shot respin shortcut. No other affordances — any action
not listed here belongs on the card itself.

```
┌─ sidebar ─┬─ /rejection-triage ──────────────┬─ Drawer ──────────────────┐
│           │                                  │ polecat/jasper-rebrand-…  │
│ Today  12 │ Rejection Triage                 │ ember-on-amber chip       │
│ Incidents │ 4 rejections · by root cause     │ ─────────────────────     │
│ Rejection │ ──────────────────────────────   │                           │
│   Triage 4│ stale-imports (3)                │ Refinery log              │
│ Mail    5 │ ─────────────────────────        │ [ Jump to first error ]   │
│ Agents    │ ┌ jasper-rebrand-mobile  ⟳ ───┐  │                           │
│ Convoys   │ │ stale-imports               │  │ ▌  17:04:12 typecheck     │
│           │ │ packages/mobile/src/foo.ts  │  │ ▌  17:04:12   packages/…  │
│           │ └─────────────────────────────┘  │ ▌  17:04:13   error TS2…  │
│           │ ┌ onyx-rebrand-docs   (colla.) ┐ │ ▌  17:04:13     42 │ ret  │
│           │ ┌ quartz-rebrand-web  (colla.) ┐ │ ▌  17:04:13        │   ^^ │
│           │                                  │ ▌  … (scrollable)         │
│           │ test-regression (1)              │                           │
│           │ ──────────────────               │ History for this branch   │
│           │ ┌ obsidian-auth-ref.  (colla.) ┐ │ · 1st rejection · 2h ago  │
│           │                                  │ · (this)     · now       │
│           │ Resubmitted (2) ▸                │                           │
│           │                                  │ [ Sling fresh polecat ]   │
│           │                                  │                           │
└───────────┴──────────────────────────────────┴───────────────────────────┘
```

Drawer contents, top to bottom:

1. **Header** — branch label + chip (same as card), collapsing on scroll.
2. **Refinery log viewer** — full log, virtualized, monospace, filterable
   by level. `[ Jump to first error ]` button anchors the viewport to the
   first `error`/`FAIL` line (keyboard `G E`). Primary payload.
3. **History for this branch** — compact list of prior rejections of the
   same branch (latest last), each a timestamp + chip + "open" link that
   swaps the drawer to that rejection. No edit affordances.
4. **Sling fresh polecat** — shortcut to the Respin preview (same popover
   as the card's primary action), for operators who arrived via the log
   and don't want to close the drawer first.

The drawer is **log-plus-two-appendages**, not a settings panel. No
editing, no quarantine controls, no mute toggles — those live on the card.

## 2. Component inventory

All primitives compose from shadcn/ui + DESIGN-SYSTEM tokens. Names are
surface nouns; implementation identifiers are deliberately not named here so
B5/C reviewers can pick shared primitives without being boxed in.

| Component | Primitive | Tokens (from DESIGN-SYSTEM) |
|-----------|-----------|-----------------------------|
| Surface header | `<h1>` + meta row | `text-title`, `text-meta`, `fg-muted` |
| Group heading | `<h2>` + inline Diagnosis Chip + count | `text-subtitle` (§1), `space-6` top gap (§2) |
| Group action | Button (secondary) | `accent-brand`, `text-meta` |
| Rejection Card | `Card` (shadcn) | `bg-raised` (§3), `space-4` padding, `dur-medium` open (§6) |
| Branch label | inline `<code>` | `ui-monospace`, `text-meta`, `fg-muted` |
| Diagnosis Chip | `Badge` per DESIGN-SYSTEM §4 | see §4 extensions below |
| Quarantine Pill | `Badge` (muted) | `bg-inset`, `fg-muted`, `text-meta`, rotation glyph ⟳ |
| Code fragment | pre + code block | `ui-monospace`, `text-micro` (§1), `bg-inset` (§3) |
| Stale-since line | single `<p>` | `text-body`, `fg-muted`, inline ⚠ `accent-warning` |
| Primary action | Button (primary) | `accent-brand`, `dur-fast` (§6) |
| Secondary action | Button (ghost) | `fg-default`, outline on focus only |
| Tertiary link | underlined `<a>` | `text-body`, `fg-muted` |
| Drawer | `Sheet` (shadcn) | `bg-raised`, width 480–560, `dur-medium` enter |
| Popover | `Popover` (shadcn) | `bg-overlay` (§3), `dur-fast` (§6) — Respin preview, Nuke confirm |
| Toast | Toast (DESIGN-SYSTEM §5 pattern) | `bg-raised`, `dur-fast` enter, `dur-medium` linger — self-fix editor / resubmit outcomes |
| Row-scoped palette | `Command` overlay (shadcn) | `bg-overlay` (§3), global Cmd-Shift-K |
| Empty state | Empty-state template (DESIGN-SYSTEM §5) | `text-subtitle` + `space-12` |
| Error banner | Banner (danger) | `accent-danger` @ 15% bg |
| Offline banner | Banner (warning) | `accent-warning` @ 15% bg |

**New chip category — `Diagnosis Chip`**. DESIGN-SYSTEM §4 defines
`polecat-working/stalled/zombie` and priority pills. Rejection triage needs a
**sixth** semantic family for failure cause, reusing the accent palette
without inventing new hues:

| Chip | Bg | Fg | Rationale |
|------|----|----|-----------|
| `stale-imports` | `accent-warning` @ 15% | `accent-warning` | recoverable — a rebase fixes it |
| `rebase-conflict` | `accent-warning` @ 15% | `accent-warning` | recoverable — mechanical |
| `test-regression` | `accent-danger` @ 15% | `accent-danger` | implies a real bug |
| `build-error` | `accent-danger` @ 15% | `accent-danger` | implies a real bug |
| `lint` | `bg-inset` | `fg-muted` | cosmetic / auto-fixable |
| `other` | `bg-inset` | `fg-muted` | unclassified — fall back to full log |

No new base hues; this reuses the semantic accent family already defined in
DESIGN-SYSTEM §3 "Semantic accent". Chip shape is `px-1.5 py-0.5 rounded
text-meta font-medium` (DESIGN-SYSTEM §4 "Rendered shape").

## 3. Microcopy

Full catalog. Tone: declarative, verb-forward, no exclamation marks
(DESIGN-SYSTEM §5 "trust the user").

**Surface chrome**

- Title: `Rejection Triage`
- Count meta: `{N} rejection(s) · grouped by root cause` (zero → empty state)
- Group-by toggle: label `Group by`; options `Root cause`, `Rig`, `Age`
- Resubmitted fold: `Resubmitted ({N}) ▸`
- Muted fold: `Muted ({N}) ▸` (collapsed by default; introduced by §5 "Mute")

**Group heading**

- Chip text: §2 keys verbatim (`stale-imports`, `test-regression`, `lint`, `rebase-conflict`, `build-error`, `other`); count in parens, e.g. `stale-imports (3)`.
- Shared-conflict meta line: `All {N} conflict on {file}`
- Group action: `Respin all {N} with auto-rebase context` (drops `with auto-rebase context` when no delta synthesized).

**Rejection card**

- Branch prefix label: `branch` (small caps, `fg-muted`), then the literal branch.
- Quarantine pill: `quarantined`
- Stale-since line: `Branch cut {relativeTime} ago · {N} of {M} main files conflict ⚠` OR `Branch cut {relativeTime} ago · in sync with main`
- Primary: `Respin fresh polecat` · Secondary: `Self-fix locally` · Tertiary: `Open full refinery log`
- Re-rejection meta tag: `2nd rejection`, `3rd rejection`, …
- Stale meta (>48h since branch cut): `stale >48h` chip

**Respin preview** (popover on focus of Respin button)

- Header: `Spawn a fresh polecat with this brief:`
- Auto-title pattern: `Re-do {original-bead-title} ({delta-reason})` — delta-reason examples: `schema updated on main since branch cut`, `typecheck regression after rebase`, `lint rules tightened`.
- Auto-desc lead-in: `Previous attempt failed with {chip}. Focus on:`
- Auto-desc fallback: `Previous attempt failed — see attached refinery log.`
- Confirm: `Sling fresh polecat` · Dismiss: `Cancel`

**Self-fix flow**

- Editor toast: `Opening {path}:{line} in your editor`
- Editor fallback: `Couldn't open your editor. Path copied to clipboard.`
- Button swap after local commit detected: `Push & resubmit`
- Pending chip: `resubmitting` · Success toast: `Merged. {branch} landed.` · Failure toast: `Refinery rejected again — see the new card.`

**Empty state**: `No rejected branches. Merge queue is flowing.`

**Error / offline banners**

- MQ offline: `Merge queue is offline — rejection data may be stale. Push & resubmit and Respin are disabled until it returns.`
- Gas Town unreachable: `Gas Town is unreachable — read-only.` (link: `Open Incidents`)
- Unparseable log: chip falls back to `other`; Respin preview shows `Manual spec — no delta detected. Edit the brief before confirming.`

**Row-scoped palette** (Cmd-Shift-K): `Respin fresh polecat`, `Self-fix locally`, `Open full refinery log`, `Nuke polecat`, `Mute {chip} from this rig`.

**Nuke confirm** (in-panel popover — `N` on a focused card or palette entry `Nuke polecat`; IA modal rule 3: destructive confirms stay in-panel).

- Header: `Nuke {branch}?`
- Body: `This terminates the polecat session and deletes its worktree. The rejection card stays for audit.`
- Confirm button: `Nuke polecat`
- Cancel button: `Keep it`

## 4. Keyboard shortcuts

Direct manipulation > command memorization (PRINCIPLES.md pillar 2, line 59).
Every common verb has a keystroke; no modal dropdowns.

| Shortcut | Context | Verb |
|----------|---------|------|
| `g r` | anywhere | Jump to Rejection Triage (IA §3) |
| `j` / `k` | surface focused | Next / previous card (Linear-style) |
| `Enter` | card focused | Open card's rejection drawer |
| `Esc` | drawer open | Close drawer, restore list focus |
| `R` | card focused | Respin fresh polecat (opens preview; second `R` confirms) |
| `F` | card focused | Self-fix locally (opens editor at failing line) |
| `L` | card focused | Open full refinery log (new system window) |
| `N` | card focused | Nuke polecat (opens in-panel confirm, §IA modal rule 3) |
| `M` | card focused | Mute this chip class from this rig |
| `Shift-R` | group heading focused | Respin all {N} in group |
| `←` / `→` | group heading focused | Collapse / expand group |
| `Cmd-K` | anywhere | Global Command bar (IA §3 overlay) |
| `Cmd-Shift-K` | card focused | Row-scoped action palette |
| `Cmd-Enter` | Respin preview open | Confirm respin (same as primary button click) |
| `Cmd-.` | resubmit pending | Cancel pending resubmit (before refinery accepts) |

Tab order on a card: branch link → chip → failing-fragment region (copy-on-
focus, not enterable) → Respin → Self-fix → Open-log link. Focus ring uses
DESIGN-SYSTEM `accent-brand` per §3.

## 5. Live data behavior

Anchors: PRINCIPLES pillar 1 "Real-time omnipresence" (line 57 — Dolt
`HASHOF_DB` tick as push-not-pull); inspiration §1.4 inline notification.

**Subscription.** One feed: refinery-rejection events for every detected
rig (`gt status --json` rig list, per PRINCIPLES glossary "Probe"). Rigs
multiplexed into a single subscription. Transport: Dolt `HASHOF_DB` tick
on the refinery's rejection table — the same realtime infra Mail and
Incidents use. Tick-driven (sub-second on activity); no poll fallback
under 15s. Connection drop → offline banner (§3) within one failed tick.

**Server-side derived fields.** Diagnosis chip classification is produced
by the refinery log parser and cached on the rejection row — the cockpit
trusts it, does not re-parse. Stale-since timeline (`branch_cut_at`,
`main_files_touched_since[]`, `conflicting_file_overlap[]`) is computed on
rejection emit. Cross-rejection group key is `(chip, canonical_conflict_file)`;
the cockpit groups by the key, does not synthesize correlation client-side.

**Optimistic updates.**

- **Respin confirm** → card → `respinning` (muted + spinner). Bead creation
  and sling are one transaction; on failure, revert + error toast.
- **Push & resubmit** → card → `resubmitting` and slides to `Resubmitted ({N})` fold. On failure, card pops back with a banner.
- **Nuke polecat** → Quarantine Pill morphs to `nuked`. Agents surface
  reflects the change through the shared polecat-state subscription (IA §4),
  not a duplicate write from this surface.

**Self-fix intermediate state.** `Self-fix locally` spawns an editor
(toast: `Opening {path}:{line} in your editor`) and flips the card to an
`editing` state — card stays in its group, gains an inline `editing`
pill (`bg-inset` + `fg-muted`) and retains keyboard focus so `j`/`k`
still navigate. The button swap `Self-fix locally` → `Push & resubmit`
is triggered by a short-lived `git log --oneline {branch}` poll (every
3s while the card is in `editing`; throttled to 30s after five minutes)
rather than a file watcher — the signal we care about is "operator made
a local commit on this branch," not raw file edits, so polling `git log`
is both cheap and correct. Clicking the card (`F` a second time)
re-opens the same editor entry without changing state. **Cleanup rule:**
an `editing` card that has not gained a local commit within 24h auto-
reverts to its original `Self-fix locally` affordance and a toast
(`Self-fix on {branch} timed out. Re-open if you still want to fix locally.`);
it does not pile up as an in-progress self-fix forever.

**Resubmitted ({N}) list state.** The fold is a per-operator, per-rig
preference (key: `(user, rig)`), persisted locally; it auto-decays by
removing a card when that rejection's follow-up MR lands (merge-queue
tick), so the list tends to empty on its own without manual curation.

**Stale / re-rejection.** Card older than `branch_cut_at + 48h` gets a
`stale >48h` meta chip (`fg-subtle`) — informational, not a block.
Re-rejection of the same branch is a **new card** tagged `2nd rejection`;
the prior card slides into Resubmitted fold.

**Mute.** `Mute {chip} from this rig` is a per-operator, per-rig, per-chip
preference (not a server-side state change). Muted rejections file into a
`Muted` collapsed fold at the bottom. No global mute.

**Appearance propagation.** Sidebar Rejection Triage badge (IA §2): red
numeric count per inspiration §4.1 ("unread-vs-mention"), updates every
tick. The rejected polecat's quarantine propagates to every Polecat
appearance (IA §4 — Agents card, Today per-rig strip, Command bar preview)
via the shared polecat subscription.

## 6. Trade-offs and rejected alternatives

1. **Reject: drawer-as-route** (`/rejection-triage/$branchId`). IA §5 rule
   "routes only for top-level surfaces" is absolute. Drawer keeps list
   visible and keyboard in charge (inspiration §5.2). Accepted:
   `?drawer=rejection:<id>` search param for deep-linkability.

2. **Reject: auto-respin without confirm.** Tempting for `stale-imports`
   because it's nearly mechanical. Rejected: PRINCIPLES pillar 2 wants one
   keystroke, not zero; a zero-confirm side-effect (bead creation + sling)
   violates inspiration §2.4 "destructive confirms stay in-panel". `R` to
   preview + `R`/`Enter` to confirm → two keystrokes, reversible.

3. **Reject: full refinery log as primary action.** Journey 04 lines 87-93
   are explicit — 90 seconds of environmental setup before seeing the real
   error is the pain. Inline fragment is the fix; log is tertiary.

4. **Reject: rejections through Mail.** Today's behavior (Journey 04
   friction point 1). IA §4 "Escalation" architectural separation applies:
   rejections are not mail appearances. Own surface, own badge semantics.

5. **Reject: combined "Incidents + Rejections" surface.** Considered for
   nav-count economy. Rejected: rejections have a strict 6-chip taxonomy
   and a mechanical respin/self-fix fork; incidents are free-form escalations
   with runbook actions. Conflating them forces every rejection card to
   carry an incident-style evidence bundle, diluting both.

6. **Reject: per-polecat rejection history panel inside the drawer.**
   Useful for "has jasper failed this way before?" but adds secondary nav
   inside a drawer. Deferred: Command bar query `rejections p:jasper`
   serves the use case at v1.

7. **Reject: respin modes ("fast" vs "thorough") as two buttons.** Doubles
   the decision surface with no evidence of two distinct operator intents.
   The auto-generated delta-spec already adapts to whether a delta was
   detectable.

8. **Reject: inline diff of "what jasper changed vs what landed".**
   Ambitious per Journey 04 friction point 4, but rendering cost conflicts
   with PRINCIPLES pillars 3 and 7. Replaced with the stale-since one-liner
   (`N of M main files conflict`), which conveys the same verdict at
   one-tenth the visual cost. Full diff via log link + Command bar.

## 7. Open questions for B5 review

1. **Refinery parser is a B4/B5 blocker, not a post-launch tuning
   question.** Chip classification (§5 "Server-side derived fields") is
   load-bearing — the card's chip, group key, and the whole respin-vs-
   self-fix fork all read from a `diagnosis_chip` the refinery must emit.
   Rejection Triage is not shippable without that parser work landing in
   B4/B5. B5 reviewers: please treat the refinery log parser as an
   explicit dependency of this surface, not a concern deferred to
   instrumentation. The original "instrument for two weeks, split `other`"
   proposal still holds, but as follow-up tuning — not as the mechanism
   by which chips exist in the first place.

2. **Should `lint` and `other` share the muted treatment?** `lint` is
   auto-fixable and borderline-noise; `other` is unknown. Lumping them
   visually may hide novel failures. Alternative: distinct neutral hue for
   `other`.

3. **Cross-rejection group key reliability.** `(chip, canonical_conflict_file)`
   works when three rejections fail on `schema.ts`. It fails when three
   different files import the same upstream. Should the key include
   "canonical upstream import" from static analysis? Likely v1.1; v1 ships
   with the simpler tuple.

4. **Does `Respin all N` auto-quarantine all N polecats?** Individual
   respin does. Worth verifying the group-level semantics do not skip it.

5. **Re-rejection UX: new card vs stacked history.** Spec says new card +
   prior to Resubmitted fold with `2nd rejection` tag. Alternative: single
   card with inline rejection history stack. Scannability (current) vs.
   continuity (alternative). Leaning current; flagging.

6. **Mute granularity.** Per-rig × per-chip sits between `Mute {chip}`
   global (too coarse) and per-polecat (too granular). Operator feedback
   required.

7. **Editor-URL scheme for Self-fix.** Assumes `cursor://` / `vscode://`
   / `idea://` auto-detect with path-copy fallback. Should Settings expose
   an Editor preference (like a Git client picker), or keep auto-detect
   until complaints arrive?

8. **Offline: render historical fragments or skeleton?** Current proposal:
   cards render read-only with their cached fragment. Risk: a stale
   fragment may mislead if the error was already fixed on main.
   Alternative: skeleton + "fragment unavailable — merge queue offline".
   Info vs. honesty trade-off.

9. **Does `Resubmitted ({N})` ever collapse back to zero?** Spec: fold
   disappears with its last card (empty-is-a-good-state, DESIGN-SYSTEM §5).
   Alternative: keep a "last {N} merges" rolling log as a confidence
   signal — but that belongs in a separate Activity timeline, not here.
