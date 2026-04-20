---
phase: B3
doc_id: spec-incidents
version: v0.1
owner: polecat/amber
depends_on: [B0, B1, B4, B2-ug-03-incident-response]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/user-guides/03-incident-response.md
  - ai_docs/spectralset-vision/journeys/03-incident-response.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#1.4
  - ai_docs/spectralset-vision/inspiration.md#2.2
  - ai_docs/spectralset-vision/inspiration.md#2.3
  - ai_docs/spectralset-vision/inspiration.md#2.4
  - ai_docs/spectralset-vision/inspiration.md#3.1
  - ai_docs/spectralset-vision/inspiration.md#4.1
  - ai_docs/spectralset-vision/inspiration.md#4.5
  - ai_docs/spectralset-vision/inspiration.md#5.2
  - ai_docs/spectralset-vision/inspiration.md#5.5
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

# B3 Interaction Spec — Incidents

> **Surface**: `/incidents` (IA §3 "Incidents", surface #6).
> **Answers**: "what is broken *right now*, what has been acked, what is resolving?"
> **Replaces**: the 7-command CLI dance (`journeys/03-incident-response.md:25-60`) —
> `gt mail inbox → gt mail read → gt dolt status → ls ~/gt/.dolt-data/ → gt peek
> refinery → gt peek witness → gt escalate ack` — plus the `gt nuke` vs
> `gt polecat nuke` help-grep footgun (`journeys/03-incident-response.md:105-115`).

## 1. Wireframe

ASCII sketch. Global red banner pins above every surface when any open.
Surface layout: header, open list grouped by severity, acked fold, resolved
fold. Detail **drawer** slides in from the right when a card is opened; the
list stays visible behind it (IA §5: "detail opens as a drawer; list stays
visible"). Destructive runbook actions use in-panel confirms (inspiration
§2.4), not system modals.

```
┌─ red banner (only when N_open ≥ 1, every surface) ─────────────────────┐
│  1 open incident — Dolt: server found stopped during refinery patrol   │
└────────────────────────────────────────────────────────────────────────┘
┌─ sidebar ─┬─ /incidents ───────────────────────────────────────────────┐
│ Today   12│                                                            │
│ Incidents▇│ Incidents                        [ Group by ▾ ] [ Mute ▾ ] │
│         1 │ 1 open · 2 acked · 3 auto-resolved today                   │
│ Rejection │ ──────────────────────────────────────────────────────     │
│   Triage 4│                                                            │
│ Mail    5 │ HIGH (1)                                                   │
│ Agents    │ ──────────────────                                         │
│ Convoys   │ ┌──────────────────────────────────────────────────────┐  │
│           │ │ ■ HIGH  Dolt: server found stopped during refinery   │  │
│ Sections  │ │         patrol                                       │  │
│   +       │ │ reported 9 min ago by refinery · 3 reporters         │  │
│           │ │                                                      │  │
│           │ │ Reported 02:14   ●  Dolt stopped — PID 53066 gone    │  │
│           │ │ Now              ●  Dolt running — PID 61002,        │  │
│           │ │                     7 conn, latency 0.8ms            │  │
│           │ │                                                      │  │
│           │ │ ▸ Evidence bundle (4 items)                          │  │
│           │ │                                                      │  │
│           │ │ Runbook — Dolt                                       │  │
│           │ │ [ Restart Dolt ]  [ Capture dump ]  [ Dashboard ]    │  │
│           │ │                                                      │  │
│           │ │ [ Ack ]                      ▸ Timeline · Split · …  │  │
│           │ └──────────────────────────────────────────────────────┘  │
│           │                                                            │
│           │ Acked (2) ▸                                                │
│           │ Resolved today (3) ▸                                       │
└───────────┴────────────────────────────────────────────────────────────┘
```

**Empty-state variant** — DESIGN-SYSTEM §5 template, single centered line:
`All quiet across town. Last escalation resolved 4h ago.` No CTA.

**Primary vs secondary** — the `Now` status row is the card's most load-bearing
element (it answers "is this still happening?"). Severity chip + title sit
visually above but carry less decision weight post-probe. Runbook buttons are
primary-coloured (ember brand) one per row; `Ack` is ghost-secondary; the
kebab (`Split`, `Mute`, `Copy incident ID`, `Open source mail`) is tertiary.
Group heading is pure typography (`text-subtitle`, DESIGN-SYSTEM §1, anchor
§3.3). No boxed section dividers.

## 2. Component inventory

All primitives compose from shadcn/ui + DESIGN-SYSTEM tokens. Names are
surface nouns; implementation identifiers are deliberately not named here.

| Component | Primitive | Tokens (from DESIGN-SYSTEM) |
|-----------|-----------|-----------------------------|
| Global red banner | Banner (danger) | `accent-danger` @ 15% bg, `text-body`, `dur-fast` slide-down |
| Surface header | `<h1>` + meta row | `text-title`, `text-meta`, `fg-muted` |
| Group heading | `<h2>` + count | `text-subtitle` (§1), `space-6` top gap (§2) |
| Severity Chip | `Badge` per DESIGN-SYSTEM §4 | see §4 extensions below |
| Incident Card | `Card` (shadcn) | `bg-raised` (§3), `space-4` padding, `dur-medium` open (§6) |
| Two-state status row | paired `<div>` rows | `text-body`, dot glyph in `accent-success`/`warning`/`danger` |
| Evidence disclosure | `Collapsible` (shadcn) | `bg-inset` (§3) on expand, `dur-medium` open |
| Evidence item | nested `Collapsible` | `ui-monospace` for transcripts, `text-micro` (§1) |
| Runbook button row | horizontal `ButtonGroup` | primary = `accent-brand`, declined = ghost + tooltip |
| Ack button | Button (ghost) | `fg-default`, outline on focus |
| Ack chip (post-ack) | `Badge` (muted) | `bg-inset`, `fg-muted`, `text-meta` |
| Reporter cluster chip | `Badge` (muted) | `bg-inset`, `fg-muted`, `text-meta`, people glyph |
| Timeline disclosure | `Collapsible` | `text-meta`, dot-timeline gutter in `fg-subtle` |
| Kebab menu | `DropdownMenu` (shadcn) | row-scoped; `bg-raised` popover |
| Drawer | `Sheet` (shadcn) | `bg-raised`, width 480–560, `dur-medium` enter |
| In-panel confirm | `Popover` (shadcn) anchored to action | `bg-raised`, Cmd-Enter confirm |
| Empty state | Empty-state template (DESIGN-SYSTEM §5) | `text-subtitle` + `space-12` |
| Offline banner | Banner (warning) | `accent-warning` @ 15% bg |
| Snooze glow (CRITICAL) | ring pulse on card | `dur-pulse` (§6), `accent-danger` |

**New chip category — `Severity Chip`**. DESIGN-SYSTEM §4 defines escalation
severity as `HIGH = accent-danger solid`, `CRITICAL = accent-danger solid +
pulse`. The full severity set this surface uses:

| Chip | Bg | Fg | Motion | Rationale |
|------|----|----|--------|-----------|
| `CRITICAL` | `accent-danger` @ 20% | `accent-danger` | `dur-pulse` ring | total outage, wake-the-operator |
| `HIGH` | `accent-danger` @ 15% | `accent-danger` | none | action needed, recoverable |
| `MEDIUM` | `accent-warning` @ 15% | `accent-warning` | none | degraded, monitor |
| `LOW` | `bg-inset` | `fg-muted` | none | informational; default-muted |

Rendered shape: `px-1.5 py-0.5 rounded text-meta font-medium` (DESIGN-SYSTEM
§4 "Rendered shape"). Reuses the semantic accent family — no new base hues.

## 3. Microcopy

Full catalog. Tone: declarative, no exclamation marks (DESIGN-SYSTEM §5
"trust the user"). Zero is a good state (PRINCIPLES pillar 7).

**Global red banner**

- `{N} open incident — {title of highest-severity open card}`
- `{N} open incidents · top: {title}` (when N ≥ 2)
- Banner click target: full-width; dismiss via `a` (ack top card) or `Esc`.

**Surface chrome**

- Title: `Incidents`
- Count meta: `{N} open · {M} acked · {K} auto-resolved today` (zero → empty state)
- Group-by toggle: label `Group by`; options `Severity` (default), `Source agent`, `Age`.
- Mute menu: label `Mute`; items `Mute WITNESS_PING from this rig`, `Mute {type} for 1h`, `Manage muted types…`.
- Acked fold: `Acked ({N}) ▸`
- Resolved fold: `Resolved today ({N}) ▸`
- While-you-were-asleep strip (only when ≥1 auto-resolved since last visit): `{N} incidents fired and auto-resolved between {t1} and {t2}.`

**Incident card**

- Title: verbatim escalation subject (server-side).
- Reporter line: `reported {relativeTime} by {agent}` OR `reported {relativeTime} · {N} reporters` when coalesced.
- Reporter cluster (on hover/focus of chip): `{N} reporters: {comma-sep list of agents}`.
- Reported-row label: `Reported {HH:MM}` · Now-row label: `Now`.
- Now-row states (per source): Dolt → `Dolt running — PID {pid}, {conn} conn, latency {lat}ms` | `Dolt stopped — last PID {pid}` | `status unknown (probe {k}/{n} failed)`. Polecat → `{state} — {molecule_step}` | `session dead` | `status unknown`. Refinery → `MQ flowing — {N} in flight` | `MQ wedged — stuck on {branch}` | `status unknown`.
- Evidence disclosure closed: `▸ Evidence bundle ({N} items)` · open: `▾ Evidence bundle ({N} items)`.
- Evidence item labels: `Goroutine dump ({size})` · `Dolt status snapshot` · `Vitals snapshot` · `Peek: {agent} (last {N} lines)` · `Source mail`.
- Evidence empty state (capture failed): `Evidence capture failed — see raw escalation mail.` + link `Open source mail`.
- Runbook section heading: `Runbook — {type}` (e.g. `Runbook — Dolt`, `Runbook — Polecat`).
- Runbook button tooltips (declined/muted state): `Not needed — {reason}. Run anyway?` e.g. `Not needed — Dolt is currently running. Restart anyway?`
- Primary runbook set per incident type (v1):
  - **Dolt**: `Restart Dolt`, `Capture dump`, `Open dashboard`
  - **Polecat stale**: `Peek`, `Nudge`, `Check Recovery`, `Nuke`
  - **Refinery wedged**: `Peek refinery`, `Restart refinery`, `Open MQ`
  - **Unknown type**: (no buttons; `Open source mail` only)
- Runbook action result inline: success → green chip `Ran — exit 0 · {HH:MM}` · failure → red chip `Failed — exit {code}` + collapsed stderr tail (≤10 lines) + `Retry` `Copy command`.
- Ack button: `Ack` · Post-ack chip: `acked · {HH:MM} by you` (or `acked · {HH:MM} via CLI`).
- Ack in-panel confirm: `Ack this incident? It will drop out of the triage stack but remain on the Incidents surface until resolved.` Confirm button `Ack`, dismiss `Cancel`.
- Kebab menu items: `Split coalesced reporters`, `Mute this type from {rig}`, `Copy incident ID`, `Open source mail`, `Mark resolved manually`.
- Timeline disclosure closed: `▸ Timeline` · open: `▾ Timeline` — rows: `fired {HH:MM:SS}` · `first viewed {HH:MM:SS}` · `acked {HH:MM:SS} by {actor}` · `resolved {HH:MM:SS} ({reason})`.
- Resolution-reason values: `underlying condition cleared`, `manual`, `source agent recovered`, `superseded by newer incident`.

**Optimistic-ack toast (on write failure)**

- `Ack pending retry — click to resend.` (persistent until resolved)

**Empty state**: `All quiet across town. Last escalation resolved {relative} ago.` If no escalations ever: `All quiet across town.` (no second line).

**Error / offline banners**

- Gas Town unreachable: `Gas Town is unreachable — showing last known state at {HH:MM}.` Runbook buttons remain clickable; failures surface inline.
- Dolt unreachable: `Dolt is unreachable — incidents feed may be stale. Ack and Mute are disabled until it returns.`
- Stale feed (no tick in >60s): `Feed may be stale — last update {HH:MM}.` Amber banner, not red.

**Row-scoped palette** (Cmd-Shift-K on focused card): `Ack`, `Run {primary-runbook}`, `Open source mail`, `Split reporters`, `Mute type`, `Copy incident ID`.

## 4. Keyboard shortcuts

Direct manipulation > command memorization (PRINCIPLES pillar 2, line 59).
Every common verb has a keystroke; destructive confirms stay in-panel
(inspiration §2.4).

| Shortcut | Context | Verb |
|----------|---------|------|
| `g i` | anywhere | Jump to Incidents (IA §3) |
| `j` / `k` | surface focused | Next / previous card (Linear-style) |
| `Enter` | card focused | Open card's detail drawer |
| `Esc` | drawer open | Close drawer, restore list focus |
| `a` | card focused | Ack (opens in-panel confirm; Enter confirms) |
| `1` | card focused | Run first runbook button (e.g. `Restart Dolt`) |
| `2` | card focused | Run second runbook button (e.g. `Capture dump`) |
| `3` | card focused | Run third runbook button |
| `4` | card focused | Run fourth runbook button (polecat runbook has four) |
| `e` | card focused | Toggle Evidence bundle disclosure |
| `t` | card focused | Toggle Timeline disclosure |
| `m` | card focused | Open mute menu for this incident type |
| `s` | card focused | Split coalesced reporters |
| `o` | card focused | Open source mail in Mail surface (side-opens drawer) |
| `←` / `→` | group heading focused | Collapse / expand group |
| `Cmd-K` | anywhere | Global Command bar (IA §3 overlay) |
| `Cmd-Shift-K` | card focused | Row-scoped action palette |
| `Cmd-Enter` | in-panel confirm open | Confirm (same as primary button) |
| `Cmd-.` | runbook action pending | Cancel pending action (before exec returns) |

Tab order on a card: severity chip → title → reporter chip → reported row
→ now row (live-region) → evidence toggle → runbook buttons → Ack → kebab
→ timeline toggle. Focus ring uses DESIGN-SYSTEM `accent-brand` per §3. The
`Now` row is a polite ARIA live-region so screen readers hear auto-resolve
transitions without interrupting other reads.

Runbook digit shortcuts (`1`..`4`) map to visual button order so muscle
memory transfers across incident types with the same position ("restart is
always `1` on Dolt"). Where a runbook has fewer buttons, higher digits are
no-ops, not errors — silent-ignore is the pillar-7-friendly default.

## 5. Live data behavior

Anchors: PRINCIPLES pillar 1 "Real-time omnipresence" (line 57 — Dolt
`HASHOF_DB` tick as push-not-pull); inspiration §1.4 inline notification;
§5.2 inline detail on click.

**Subscription.** One feed: escalation events across every detected rig
(`gt status --json` rig list, per PRINCIPLES glossary "Probe"). Rigs
multiplexed into a single subscription. Transport: Dolt `HASHOF_DB` tick
on the escalations table — the same realtime infra Mail and Rejection
Triage use. Tick-driven (sub-second on activity); no poll fallback under
15s. Connection drop → offline banner (§3) within one failed tick.

**Per-card `Now` probe.** Independent from the subscription. Each incident
type declares a probe (Dolt → `gt dolt status`; Polecat → agent state
query; Refinery → MQ health). Probe runs at card mount and every 10s while
the card is visible; paused when the surface is backgrounded (visibility
API). Probe result caches on the client per incident-id for 2s to prevent
thundering-herd across multiple appearances. Three consecutive probe
failures → `status unknown (probe 3/3 failed)` with an amber dot — the
operator reads this as "don't trust auto-resolution" (ug-03 §"Failure
modes").

**Reporter coalescence.** Server-side, not client-side (the spec consumes
the key, does not synthesize it). Key = `(incident_type, canonical_target,
60s_bucket_since_first_fire)`. Three agents reporting the same Dolt outage
inside the bucket collapse to one row with `3 reporters`. `Split` kebab
action breaks the cluster back to N cards — the coalescence is a
convenience, never a prison (ug-03 §"Failure modes"). Coalescence rule and
bucket length are server knobs; this spec exposes the UI treatment only.

**Evidence bundle capture timing.** Evidence is captured by the agent that
fires `gt escalate` (witness / refinery / polecat / deacon) at escalate
time, not at render time. The cockpit trusts the bundle as authoritative
and never retries capture. If capture failed entirely → render the empty
state with `Open source mail` fallback (ug-03 §"Failure modes"). No
client-side "try to fetch a goroutine dump now" button — that would shift
the cost to the operator's moment of highest stress.

**Optimistic updates.**

- **Ack** → chip flips to `acked · HH:MM`, card slides out of the open list
  into `Acked` fold, global banner count decrements. On write failure, a
  persistent toast `Ack pending retry — click to resend` appears and the
  card returns to the open list with an `ack-failed` meta chip.
- **Runbook action** → button enters pending state (spinner + disabled),
  result surfaces inline (success chip or failure+stderr). The card does
  not optimistically flip the `Now` row — the next probe does. This is
  deliberate: runbook actions sometimes succeed-and-do-nothing (restart
  returns 0 but Dolt still crashes); trusting the probe keeps the card
  honest.
- **Mute** → `{type}` filed into muted bucket; existing cards of that type
  gray out with `muted` meta; new events don't raise the banner. Mute is
  per-operator, per-rig, per-type — never global (ug-03 §"Failure modes"
  line 178 informs the granularity).

**Appearance propagation.** Sidebar Incidents badge (IA §2): red numeric
count when open, dot when only acked, absent when empty (inspiration §4.1
"unread-vs-mention"). The global red banner is a derivation of the same
count. Today's triage stack surfaces the top-severity open card as a row
(IA §4 "Escalation" appearances). All four appearances subscribe to the
same query; invalidation flows from the home (Incidents) surface.

**While-you-were-asleep replay.** If the operator's last-visit timestamp
(per-user field, stored client-side in IndexedDB) is older than the most
recent auto-resolved incident, the strip renders at the top of the Open
list: `{N} incidents fired and auto-resolved between {t1} and {t2}.`
Clicking expands into the `Resolved today` fold. Suppresses itself after
the operator dismisses via `x` on the strip (persisted per-user). No inbox
of identical-looking mails (journey 03 §"Friction points" item 7).

**CLI/cockpit sync.** `gt escalate ack` from a terminal fires the same
Dolt write; the card updates via the shared subscription. No reload.
Pillar 1 enforced.

## 6. Trade-offs and rejected alternatives

1. **Reject: drawer-as-route** (`/incidents/$incidentId`). IA §5 rule
   "routes only for top-level surfaces" is absolute. Drawer keeps list
   visible and keyboard in charge (inspiration §5.2). Accepted:
   `?drawer=incident:<id>` search param for deep-linkability.

2. **Reject: incidents as a mail filter.** Today's behavior (journey 03
   §"Friction points" item 1). PRINCIPLES surface-set §"Incidents" (line
   85) makes the separation architectural: escalations are NOT an
   appearance in Mail (IA §4 "Escalation"). Own surface, own badge, own
   runbook verbs.

3. **Reject: auto-ack on auto-resolve.** Tempting: if the `Now` probe
   says the condition cleared, silently ack. Rejected because (a) ug-03
   §"Step-by-step ideal flow" mandates an explicit operator ack as part
   of the capability ledger (who saw it, when), and (b) silent auto-ack
   violates inspiration §2.4 ("never leave the current panel" implies
   never act without the operator). The card does auto-slide the `Now`
   row to green, but Ack stays manual.

4. **Reject: runbook actions without inline output.** Considered for a
   "fire-and-forget" button that just runs the command. Rejected: runbook
   actions can fail (Dolt refuses to restart; polecat nuke hangs). The
   operator *needs* exit codes and stderr inline, especially because the
   CLI fallback path must be one copy-click away (ug-03 §"Failure modes"
   line 173).

5. **Reject: system-modal ack confirm.** Inspiration §2.4 forbids it.
   Popover anchored to the Ack button stays in-panel, keyboard in charge.
   Enter confirms, Esc cancels, focus returns to the card.

6. **Reject: incident-type-specific card layouts.** Considered per-type
   custom layouts (Dolt-shaped card, polecat-shaped card). Rejected:
   explodes the visual vocabulary; pillar 3 (founder-scale density) wants
   one scan-shape. The two-state status row + evidence bundle + runbook
   button row is type-agnostic by construction; type only changes copy
   inside the same slots.

7. **Reject: global mute of a type.** Per-operator × per-rig × per-type
   only. Global mute would silence a WITNESS_PING across the whole town
   for everyone — a tripwire for the next operator. Mute is per-operator
   by spec; propagation to other operators is never.

8. **Reject: long-tail severities (P0–P4).** Priority pills are a beads
   concept; incidents are escalations. Four severities (CRITICAL / HIGH /
   MEDIUM / LOW) match `GASTOWN-LESSONS-AND-TIPS.md §10` mail-type
   urgency mapping and fit four visual treatments (pulse / solid / amber
   / muted). More is noise.

9. **Reject: evidence bundle as link-out.** Inspiration §2.3 "inline
   results render rich" — the bundle is a document, not a link. Each
   item is a nested disclosure that renders its own preview; the
   operator never navigates away from the card to read the goroutine
   dump.

10. **Reject: "Resolved today" fold includes all time.** Considered a
    single `Resolved` fold. Rejected: the fold would grow unbounded;
    yesterday's resolved Dolt is archaeology, not ops. Today-scoped is
    the pillar-3 density compromise; older resolved incidents are
    reachable via Command bar `incidents resolved last-week`.

## 7. Open questions for B5 review

1. **Probe cadence (10s) too eager?** A 10s probe per visible card
   could pressure the probe target (Dolt, refinery) at scale if the
   operator leaves the surface open with 40 cards. Visibility-API pause
   mitigates but doesn't eliminate. Alternative: single multiplexed
   probe per source-type (one Dolt probe shared across all Dolt
   incidents). Likely correct; flagging for B5 to confirm cost model.

2. **Global banner scope — every surface or only non-ops surfaces?**
   Spec says every surface. Counter: when operator is *already* on
   Incidents, the banner duplicates the list. Alternative: banner auto-
   hides on `/incidents`. Leaning hide-on-self; flagging for a pillar-7
   calm-vs-redundancy judgment.

3. **CRITICAL pulse — ring, glow, or border?** DESIGN-SYSTEM §6 mandates
   `dur-pulse` 1.4s opacity loop; unspecified whether ring or glow.
   Ring is cheaper to render and respects prefers-reduced-motion more
   gracefully (reduces to solid ring). Proposal: ring. Alternative
   visual studies worthwhile if B5 has a designer in the loop.

4. **Per-incident-type runbook registry — where does it live?** Spec
   consumes a registry; does not define storage. Options: rig-local
   `.gt/runbooks.yaml`, town-level override, built-in defaults with
   registry pattern matching `GASTOWN-LESSONS-AND-TIPS.md` structure.
   Probably a separate infra spec (Phase C or a C-prep bead).

5. **Runbook digit shortcuts (`1`..`4`) conflict with group-collapse or
   priority-filter shortcuts elsewhere?** No conflict in IA §5 shortcut
   table today, but the convention for numerics across the cockpit
   needs locking. Flag to IA v0.2.

6. **While-you-were-asleep — last-visit in IndexedDB vs server-side per-
   user field?** Client-side wins for privacy + speed but loses cross-
   device sync (operator on laptop vs desktop). Spec proposes client.
   Server-side per-user preferences are a bigger infra question.

7. **Reporter coalescence bucket length (60s) — configurable?** A Dolt
   outage sometimes fires three reporters in 90s, not 60s. Hardcoded 60s
   would leave one in its own card. Server-side knob or adaptive
   (coalesce if `incident_type + target` match within 5min)? Leaning
   adaptive; flagging.

8. **Do LOW-severity incidents belong on the Incidents surface at all,
   or in a "Notices" fold inside Today?** LOW is default-muted — if
   everything LOW is muted, does the fold earn its slot? Counter: `LOW`
   lets operators *unmute* a specific type (e.g. for a release watch)
   without inventing a new severity. Leaning keep; flagging.

9. **`Split` kebab action — does it reverse downstream effects (e.g.
   `Runbook ran once for the cluster`)?** Proposal: splitting preserves
   runbook-ran state on the original, creates N-1 new open cards without
   runbook history. Reversibility bounded. Flag to B5 for semantics.
