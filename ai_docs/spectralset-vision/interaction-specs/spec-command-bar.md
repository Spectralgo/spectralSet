---
phase: B3
doc_id: spec-command-bar
version: v0.1
owner: crew/gastown_researcher
depends_on: [B0, B1, B4, B2-02-sling-and-monitor, B2-01-morning-routine]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/user-guides/02-sling-and-monitor.md
  - ai_docs/spectralset-vision/user-guides/01-morning-routine.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#1.1
  - ai_docs/spectralset-vision/inspiration.md#2.1
  - ai_docs/spectralset-vision/inspiration.md#2.2
  - ai_docs/spectralset-vision/inspiration.md#2.3
  - ai_docs/spectralset-vision/inspiration.md#5.5
  - ai_docs/spectralset-vision/inspiration.md#6.3
  - ai_docs/spectralset-vision/cli-pain-inventory.md
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

# spec-command-bar — Cmd-K Command Bar

**Surface type:** overlay (not a route; `INFORMATION-ARCHITECTURE.md §3` "Command bar" + `§5` rule 4).
**Invoked from:** any surface, any focus state, including from inside a drawer.
**Positioning:** B0 pillar 2 (direct manipulation > command memorization) and pillar 4 (one-click everything daily) name Cmd-K as the cockpit's single highest-leverage primitive. `inspiration.md §"Pattern priority list"` rank 1 — "four of six best-in-class apps converge here". This spec operationalizes that commitment.

## 1. Wireframe

Two modes: **global** (default, `Cmd-K`) and **row-scoped** (`Cmd-Shift-K`). Both render the same shell — a centered overlay with an input, a ranked result list, and a preview lane.

### Global mode (default)

```
  ┌────────────────────────────────────────────────────────────────────────────┐
  │  ┌──────────────────────────────────────────────────────────────────────┐  │  ← bg-overlay scrim
  │  │  🔍  Type a verb, an ID, or a search…                           ⏎   │  │  ← Input (text-subtitle, space-4 inner)
  │  │ ────────────────────────────────────────────────────────────── esc  │  │
  │  │  Recent                                                              │  │  ← section header (text-meta fg-muted)
  │  │  ▸  peek  spectralSet/jasper         ⋯ sling                         │  │
  │  │  ▸  sling ss-zzu  → spectralSet      ⋯ mail mayor/                   │  │
  │  │                                                                      │  │
  │  │  ▾  Verbs                            ▾  Objects                      │  │  ← type-grouped results (inspiration §2.1)
  │  │     peek <polecat>                      ss-u72 (Rebrand followup)    │  │
  │  │     sling <bead> <target>               jasper (spectralSet, working)│  │
  │  │     nudge <agent>                       hq-cv-0a7 (Phase B convoy)   │  │
  │  │     mail <address>                      mayor/ inbox                 │  │
  │  │     nuke <polecat>                                                   │  │
  │  │                                                                      │  │
  │  │ ┌──────────────────────────────────────────────────────────────────┐ │  ← Preview lane (appears on hover/keyfocus)
  │  │ │  ss-u72 · P2 · open ·  spectralSet                               │ │     (inspiration §2.3 "inline rich results")
  │  │ │  Rebrand followup: @superset/mobile → @spectralset/mobile        │ │
  │  │ │  Assignee: — · Blocked by: —                                     │ │
  │  │ │  Enter = open drawer · Shift-Enter = Sling…                      │ │
  │  │ └──────────────────────────────────────────────────────────────────┘ │
  │  │  ⏎ open  · ⇧⏎ primary action · ⌃. more actions · esc cancel         │  │  ← hint footer (text-meta fg-muted)
  │  └──────────────────────────────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────────────────────────────┘
```

Size: 640px wide × content-height up to 560px, centered, `bg-raised` card on `bg-overlay` scrim. Preview lane shows for the focused row when it's an Object (bead, polecat, convoy, mail thread). Verbs that require arguments expand inline with typed-token prompts (inspiration §2.5).

### Row-scoped mode (`Cmd-Shift-K` on a focused row)

Identical shell, but the input pre-fills with the object's type token (`polecat:jasper` / `bead:ss-u72` / `convoy:hq-cv-0a7`) and the result list narrows to **verbs that apply to that object**. Used when the operator already has the object selected and wants "what can I do with this?" — inspiration §2.2.

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │   polecat:jasper  [spectralSet · Working]                       ⏎     │
  │  ──────────────────────────────────────────────────────────── esc    │
  │   Actions on jasper                                                    │
  │   ▸  peek                              (Enter)                         │
  │   ▸  nudge …                           (n)                             │
  │   ▸  mail spectralSet/jasper …                                         │
  │   ▸  check recovery                                                    │
  │   ▸  open agent drawer                 (o)                             │
  │   ▸  nuke …                    ⚠ destructive — confirm in-panel        │
  └────────────────────────────────────────────────────────────────────────┘
```

## 2. Component inventory

Generic UI primitives only — surface nouns, not renderer identifiers. Implementation in `packages/ui` (shadcn/Tailwind v4 base).

| Role | Primitive | Tokens / style |
|------|-----------|----------------|
| Overlay scrim | Dialog overlay | `bg-overlay`, `dur-fast` fade |
| Container | Card | `bg-raised`, `space-4` inner, `rounded-md`, elevation shadow |
| Input | TextField (autofocus) | `text-subtitle`, `space-3` height, no border (divider below), left icon slot |
| Row | List item | `space-2 space-3` padding, `text-body`, `bg-raised` default / `accent-brand @ 8%` focused |
| Icon | Icon (lucide 16px) | `fg-muted` default; `accent-info` on focused row |
| Chip | Badge (type) | `text-meta`, `space-1` inner, `rounded-sm` — "Verb" / "Bead" / "Polecat" / "Convoy" / "Mail" / "Search" |
| State chip (polecat) | StateChip | Canonical from `DESIGN-SYSTEM.md §4` — Working / Stalled / Zombie. No "idle", no "done" row state |
| Priority pill (bead) | PriorityPill | `DESIGN-SYSTEM.md §4` P0–P4 scale |
| Preview lane | Card (nested) | `bg-inset`, `space-4` inner, `text-body` body + `text-meta` meta |
| Hint footer | Toolbar | `space-3` horizontal, `text-meta fg-muted`, kbd-style chips for shortcuts |
| Divider | Separator | `fg-subtle` 1px |
| Typed-token argument | Chip input | `accent-brand` border when awaiting; converts to filled chip on confirm |
| Section header | Label | `text-meta fg-muted uppercase tracking-wide` |
| Destructive confirm | Dialog (inline) | Inspiration §2.4 "confirm panels that don't steal focus" — rendered *inside* the command bar card, not as a separate modal |

The surface does **not** introduce new tokens. Everything composes from `DESIGN-SYSTEM.md §1–§6`. If the spec needs a token that does not exist, it is routed back to B4 as a gap, not invented here.

## 3. Microcopy

All user-visible strings, in one place so implementation cannot drift.

### Input placeholder (global)

- Default: `Type a verb, an ID, or a search…`
- When input has focus but bar is empty and there is no recent history: `Try 'peek jasper', 'sling ss-u72', or 'mail mayor/'.`

### Section headers

- `Recent` — shown only when history has ≥1 item.
- `Verbs` — shown when results include invocable commands.
- `Objects` — shown when results include beads, polecats, convoys, mail threads.
- `No matches` — empty-results header (see empty states).

### Verb catalog (initial — seeded from `cli-pain-inventory.md §2` top-20)

| Verb | Argument shape | Description (shown as row meta) |
|------|----------------|----------------------------------|
| `peek <polecat>` | typed-token: polecat | Open a live transcript of the polecat's session |
| `sling <bead> <target>` | typed-tokens: bead, target | Dispatch the bead to the target agent or rig |
| `nudge <agent>` | typed-token: agent | Send a nudge message; second field opens inline |
| `mail <address>` | typed-token: address | Open the inbox for this address or start composing |
| `open <bead|convoy|thread>` | typed-token | Open the object in its home surface drawer |
| `nuke <polecat>` | typed-token: polecat | Destructive — see in-panel confirm |
| `check recovery <polecat>` | typed-token | Run the recovery probe; surface the verdict inline |
| `escalate <agent> <severity>` | two tokens | Fire an escalation; severity chip inline |
| `new bead <title>` | free text after token | Quick-capture (`inspiration.md §3.5` natural-language parse) |
| `goto <surface>` | typed-token | Jump to a top-level surface (today / agents / convoys / mail / incidents / rejection-triage) |

Exactly 10 verbs in v1. The B0 decision rubric §8 applies — additions must cite a journey anchor before the verb earns a slot.

### Empty states

- No history, no query typed: shows the placeholder — *no* "Get started" CTA cluster (`DESIGN-SYSTEM.md §5` rule — "trust the user").
- Query entered, no matches: `Nothing matches '<query>'. Try a bead ID or a polecat name.` Centered, `text-body fg-muted`, `space-6` vertical.
- Backend unreachable: `Can't reach Gas Town. Last seen <relative time>.` — uses `accent-danger` dot, no command results until reconnect.

### Hint footer (always visible)

- `⏎ open  ·  ⇧⏎ primary action  ·  ⌃. more actions  ·  esc cancel`
- When input is empty: `⏎ open  ·  ⌘⇧K for actions on selected row  ·  esc cancel`

### Errors

- Verb parse error: `Can't parse '<token>' as a <type>. Example: peek spectralSet/jasper.` Inline under the input, `accent-warning`, does not clear the query.
- Command failed (after execution): returns a toast via the surface that owns the verb (e.g. `sling` failures surface on the Agents surface). The command bar itself closes on successful dispatch; on failure, the bar stays open with the error inline.
- Unknown flag (as observed in A3 live session — `gt mail inbox --pinned`): the bar *does not accept* flag strings the backend rejects; typed-token prompts make this unreachable.

### Destructive-verb confirmation (inline)

For `nuke`, `escalate ... CRITICAL`, and `new bead --pin`: the action row shows the verb inline, then tab-stops to an in-panel confirm:

```
  ⚠  This will nuke spectralSet/jasper. Any unsaved scratch is lost.
      Safety checks: ✓ branch pushed  ✓ no open MR  ✓ no hooked work
      [ Nuke  ⏎ ]   [ Cancel  esc ]
```

Inspiration §2.4: confirm stays inside the bar; no system modal. The three safety checks come from `cli-pain-inventory.md §2` row 10 (`gt polecat nuke` behavior).

## 4. Keyboard shortcuts

Every verb has a keystroke or a Cmd-K path. Listed in priority order; numbers behind the key are row-focus shortcuts.

| Shortcut | Scope | Verb |
|----------|-------|------|
| `Cmd-K` | Global | Open command bar (global mode) |
| `Cmd-Shift-K` | Focused row | Open command bar (row-scoped mode) on the focused object |
| `Esc` | Bar open | Close, restore prior focus (inspiration §5.5 — "overlay restores prior focus") |
| `⏎` | Bar open, row focused | Open the object OR run the verb |
| `Shift-⏎` | Bar open, row focused | Run the row's *primary action* (Sling for a bead, Peek for a polecat, Open for a mail thread) |
| `Ctrl-.` | Bar open, row focused | Open the row's secondary-action list (inspiration §2.2) |
| `↑ / ↓` | Bar open | Move focus between rows |
| `Tab` / `Shift-Tab` | Bar open, typed-token | Move to next / previous argument slot |
| `Cmd-.` | Anywhere | Force-close bar without restoring prior focus (for wedged states) |
| `g t / g a / g c / g m / g i / g r` | Global | Jump to top-level surfaces; bar does NOT open (per `INFORMATION-ARCHITECTURE.md §3` — Linear-style double-press). Listed here because the bar advertises them in the "Verbs → goto" section. |
| `?` | Bar open | Toggle keyboard-shortcut cheat sheet (inline, not a separate dialog) |
| `1..9` | Bar open, query empty | Jump to the Nth row in Recent |

**Focus contract.** When the bar opens, browser/app focus transfers to the input. When the bar closes, focus returns to the element that held it before open — drawer scroll position included (inspiration §5.5). Drawer + command bar can coexist: opening Cmd-K from inside a drawer *does not* close the drawer.

**Disallowed shortcuts.** `Cmd-Enter`, `Cmd-S`, `Cmd-Z` are not rebound — platform expectations (save, undo, new-in-current-app) override cockpit shortcuts. `Cmd-P` is reserved for browser-print on the web shell; we do not reuse it for "palette".

## 5. Live data behavior

Real-time omnipresence (B0 pillar 1) governs this surface more than any other: the bar is the operator's fastest path to *current* state.

### Query backend

- The bar queries tRPC routers: `gastown.agents.list`, `gastown.convoys.list`, `gastown.mail.inbox`, `gastown.beads.search` (the last one may not yet exist — see §7 open questions).
- All queries are **live-subscribed**, not polled on each keystroke: the Dolt `HASHOF_DB` realtime infrastructure (0.14ms polling budget, already shipped per `NORTH-STAR.md:27`) means query caches update *in the bar* while it is open. A polecat transitioning from `working` → `stalled` while the operator is typing reflects mid-session.
- Input debounce: **80 ms** (within `dur-instant` of `DESIGN-SYSTEM.md §6`). Smaller debounce → noisy; larger → feels laggy.

### Ranking

Per inspiration §2.1 omnibox behavior: "results are typed (each row shows its type icon). Enter acts on the top result; Cmd-Enter acts on the selected row." Our ranking:

1. **Exact ID match** (`ss-u72`, `hq-cv-0a7`, `jasper`) — one row, always top.
2. **Recency** — verbs the operator has invoked in the last 20 bar sessions, weighted by recency.
3. **Verb prefix match** — `sl` → `sling`.
4. **Object prefix match** within type — `jas` → `jasper` within polecats.
5. **Substring match** in object titles — `rebrand` → `ss-u72 Rebrand followup`.

Ranking runs client-side against an in-memory index hydrated from the realtime query cache; no round trip per keystroke.

### Optimistic updates

- Verb invocations return a toast-confirmation (outside the bar) and the bar closes on success. No optimistic mutation in the bar itself.
- Object appearances (bead, polecat rows) update live from their subscribed query caches — the bar is a consumer, not a publisher.

### Stale handling

Inspiration §1.4 ("inline notification design"): stale data is indicated, not hidden.

- If the Gas Town daemon is unreachable, the bar stays open, renders a one-line `accent-danger` banner at top (`Can't reach Gas Town. Last seen <relative>.`), and *disables the Verbs section* until reconnect. Objects still show from the local cache with a `stale` chip on each row.
- If a verb execution times out (>5 s), the bar shows an inline `dur-pulse` indicator on the hint footer: `Still running…` — and keeps the bar open until resolution. The bar never silently hangs.

### Realtime subscriptions (surface-specific)

| Source | Reason | Update trigger |
|--------|--------|----------------|
| `gastown.agents` | Polecat state chips in rows must be honest | Dolt HASHOF_DB diff on agent events |
| `gastown.convoys` | Convoy rows must reflect landing state | `gt convoy list` cache invalidation |
| `gastown.mail.inbox` | Mail thread rows must reflect unread state; inspiration §4.1 unread-vs-mention split | Mail cache invalidation on new arrival / mark-read |
| `gastown.beads.search` | Bead ID / title search | On-demand; bead mutations invalidate the index |
| Bead priority / state edits | Must reflect in preview lane immediately | Subscribed |

Prefers-reduced-motion (`DESIGN-SYSTEM.md §6`): pulse indicators disable; state transitions crossfade with opacity only.

## 6. Trade-offs and rejected alternatives

These were considered and dropped. Keeping them documented so a B5 reviewer can push back without re-doing the exploration.

### T1 — Command bar as a route vs overlay

**Considered:** giving the command bar its own route (`/command`) the way Linear has "My Issues".
**Rejected.** `INFORMATION-ARCHITECTURE.md §3` ("Command bar … overlay, not a route") and `§5` rule 4 are explicit: the bar opens *over* any surface and restores prior focus on close. A route would force the operator to navigate *into* the bar and back out, destroying the "invoke from anywhere, return to where you were" property that makes Cmd-K worth having. Inspiration §5.5 mandates the same.

### T2 — Natural-language-only input vs verb-object phrasing

**Considered:** Things-3-style natural language parsing (`inspiration.md §3.5`): "sling ss-u72 to jasper tomorrow" as the primary input mode.
**Rejected (deferred).** The verb-object grammar is simpler to rank and to audit in v1. Natural-language capture lives inside the `new bead <title>` verb as a focused scope. A future v2 can layer parsing over the whole input once the verb vocabulary is stable.

### T3 — Two separate palettes (command palette and search)

**Considered:** Raycast-style split — one palette for verbs, one for search.
**Rejected.** Inspiration §2.1 closing note: "the user doesn't pre-decide 'am I looking for a bead or a polecat or a mail?' — they just type." Type-aware ranked results preserve ambiguity until action. Two palettes would add a pre-decision the operator shouldn't have to make.

### T4 — Executing destructive verbs in-bar vs escalating to a surface-owned confirm

**Considered:** letting `nuke` route to the Agents surface's existing in-panel confirm dialog, closing the bar along the way.
**Rejected.** Inspiration §2.4 ("confirmation modals that don't steal focus") + journey 05 friction point 2 (`gt nuke` vs `gt polecat nuke` CLI confusion) — the operator wants "decide without leaving the keyboard-driven flow". The bar hosts the confirm inline (`§3` microcopy). Closing and reopening a different dialog breaks focus.

### T5 — Showing ALL verbs on empty input vs Recent-only

**Considered:** empty-input mode shows the whole verb catalogue (10 rows).
**Rejected.** Empty-input shows Recent only; typing even one character surfaces the verb catalogue. Reason: a blank bar acts as a recent-commands dashboard, which is what the operator most often wants ("do that thing I just did"). Inspiration §1.1 ranking-by-recency is the anchor.

### T6 — Row-scoped invocation via right-click vs `Cmd-Shift-K`

**Considered:** right-click as the row-scoped trigger.
**Rejected.** Pillar 2 (direct manipulation > command memorization) ≠ "mouse primacy". The keyboard-first identity is worth more than a familiar right-click. Right-click is *additionally* supported (mirrors the row-scoped verbs) but `Cmd-Shift-K` is the canonical invocation.

### T7 — Client-side ranking index vs per-keystroke server round trip

**Considered:** issuing a search tRPC query on every keystroke.
**Rejected.** An 80 ms debounce against a realtime-hydrated in-memory index is strictly cheaper and faster than a server round trip per keystroke. `NORTH-STAR.md:27` (0.14ms Dolt polling) means the in-memory index can stay fresh without the operator noticing. Inspiration §2.1 "Enter acts on the top result" requires deterministic ranking — easier client-side.

### T8 — Inline typed-token prompts vs free-form argument parsing

**Considered:** accepting `sling ss-u72 to jasper --merge mr` as a free-form string.
**Rejected (for v1).** Typed-token prompts (inspiration §2.5) make argument types visible and the common shape unambiguous. Free-form parsing re-introduces the `--pinned` footgun (`cli-pain-inventory.md §5` quote 9 — `gt mail inbox --pinned` → `unknown flag`). Revisit in v2 once the verb vocabulary stabilises.

## 7. Open questions for B5 review

1. **Does `gastown.beads.search` exist?** `current-state-audit.md §"Gas Town Mail"` confirms the mail surface wraps a tRPC search but does not enumerate one for beads. If absent, `open <bead>` by ID still works (direct lookup), but prefix-match search on bead *titles* requires a new backend. If it doesn't exist, B1/B3 have to decide whether command-bar v1 ships without title search (ID-only) or blocks on backend.
2. **Verb catalogue size — is 10 too many or too few?** Pillar 3 (founder-scale — Linear info density, not Slack noise) says fewer is better; the 20-command must-be-a-button list in `cli-pain-inventory.md §2` is twice that. I picked the 10 that come up every hour, not every day. Reviewers: should `gt handoff -c`, `gt prime`, or `gt doctor --fix` displace something in the 10?
3. **Row-scoped mode — which selection state counts as "focused"?** When the user has a polecat highlighted in the Agents grid but a drawer is open showing a different polecat, which one does `Cmd-Shift-K` scope to? Proposed: whichever element holds DOM focus. This should be explicit so B5 reviewers can audit against the journeys.
4. **In-bar confirm for `nuke` — does it replace the surface-level nuke-confirm dialog, or shadow it?** If both exist, we risk drift. Proposed: single source of truth as a generic destructive-confirm primitive in the shared UI package, consumed by both the command bar and the Agents surface.
5. **Natural-language capture for `new bead`.** Verb allows `new bead Refactor bridge model P2 @jasper #discovery` — but parsing `@jasper` as assignee vs label, and `P2` as priority vs text, is ambiguous. Does v1 ship a strict token grammar (requiring `new bead --assignee=jasper --priority=P2 ...`), or a best-effort parser with a confirm step? Inspiration §3.5 is the ideal; a confirm step is the pragmatic v1.
6. **Ranking tunables — are the five criteria (§5) the right ones and the right order?** Linear weights recency heavily; Raycast weights frequency. Our ordering matches Linear's. A reviewer with personalisation experience may have priors.
7. **Do we expose CLI-only commands via a hidden "expert" verb mode?** `gt sling` has 20+ flags (`--account`, `--agent`, `--ralph`, `--hook-raw-bead`). None of them belong in v1 verbs, but a `>` prefix that drops to a raw `bd`/`gt` line (inspiration §6.3 Arc's tab/command duality) could serve power users without polluting the default surface. Risk: re-introduces command-memorization as a first-class flow, which Pillar 2 opposes. My default: defer to v2.
8. **Accessibility — keyboard-only flow is covered; screen-reader semantics for the typed-token input are not.** Proposed: treat each typed-token as an ARIA `combobox` with `listbox` suggestions. But "ten verbs × N-token argument shapes" is a non-trivial ARIA surface. A B5 reviewer with a11y focus should audit this explicitly; I am not confident the proposal is sufficient.
