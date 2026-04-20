---
phase: B3
doc_id: spec-mail
version: v0.1
owner: polecat/marble
depends_on: [B0, B1, B4, B2-01-morning-routine, B2-03-incident-response, B2-04-code-review-handoff]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/DESIGN-SYSTEM.md
  - ai_docs/spectralset-vision/user-guides/01-morning-routine.md
  - ai_docs/spectralset-vision/user-guides/03-incident-response.md
  - ai_docs/spectralset-vision/user-guides/04-code-review-handoff.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#1.4
  - ai_docs/spectralset-vision/inspiration.md#4.1
  - ai_docs/spectralset-vision/inspiration.md#4.3
  - ai_docs/spectralset-vision/inspiration.md#4.4
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

# B3 Interaction Spec — Mail

Operationalizes the **Mail** surface from `INFORMATION-ARCHITECTURE.md §3`. Closes the v1-blocker gaps flagged by `PRINCIPLES.md §Decisions D2` (Mark-read, Reply, Search) and the address-picker gap from `current-state-audit.md §"Gas Town Mail"`. Tone target: Slack-shaped muscle memory (inspiration §4), Things 3 restraint (inspiration §3.1).

## 1. Wireframe

Route: `/mail`. Two-pane layout with drawer. Sidebar group (rendered elsewhere, per `INFORMATION-ARCHITECTURE.md §2`) lists pinned addresses; selecting one navigates here.

```
┌── Sidebar ──┐┌── Mail surface (route `/mail`) ─────────────────────────────┐
│ Today       ││                                                              │
│ Incidents   ││  Inbox list (left, ~420px)         Thread drawer (right)     │
│ Rejection…  ││  ┌──────────────────────────┐      ┌───────────────────────┐│
│ ▼ Mail      ││  │ [Address picker▾] [/] [⛭]│      │ Subject line          ││
│   mayor/    ││  │──────────────────────────│      │ from ▸ to · relative  ││
│   …refinery ││  │ ● HIGH mayor/  2m        │      │ [type] [priority]     ││
│   …witness  ││  │    BLOCKED: dolt latency │      │─────────────────────── ││
│   marble    ││  │    "Need rebuild…"       │      │ Body (prose / mono)   ││
│ Custom      ││  │──────────────────────────│      │  …                    ││
│   pinned ag…││  │ ○ MERGED refinery 8m     │      │ Linked: ss-2xy ▸      ││
└─────────────┘│  │    ss-2xy landed on main │      │ 1 reply ▾             ││
               │  │──────────────────────────│      │─────────────────────── ││
               │  │ · WITNESS_PING 1h        │      │ Reply composer        ││
               │  │    patrol run (muted)    │      │ [Textarea…         ]  ││
               │  │ · … 42 more              │      │ [Send] [Reply all]    ││
               │  └──────────────────────────┘      └───────────────────────┘│
└──────────────┴──────────────────────────────────────────────────────────────┘
```

- **Address picker** replaces today's `AddressPicker.tsx` dropdown; typing searches a live directory (polecats included — closes audit gap).
- **Search field** (`/`) is scoped to the selected address by default; `Cmd-/` widens to all inboxes.
- **Row density**: one line, three columns (status dot + type chip, sender + subject, relative timestamp). Pinned/HIGH mail gets `accent-danger` left border (`DESIGN-SYSTEM.md §4` severity).
- **Thread drawer** opens on row click; list stays visible (inspiration §4.3). `ESC` closes.
- **Linked bead** — if a mail references `ss-XYZ` in body or structured fields, it renders as a clickable chip that opens the Bead drawer (`INFORMATION-ARCHITECTURE.md §4 Bead`). Replaces today's body-only mono `<pre>`.
- **No full-page thread view**. No route change on thread select.

## 2. Component inventory

All primitives compose from `packages/ui/` (shadcn) + Tailwind tokens from `DESIGN-SYSTEM.md`. Generic UI nouns only; do **not** reuse today's `MailPanel.tsx` / `ComposeMailDialog.tsx` / `AddressPicker.tsx` names — they carry the 6-state badge drift (`DESIGN-SYSTEM.md §7 Badge drift`).

| Component | Primitive | Tokens (B4) | Purpose |
|-----------|-----------|-------------|---------|
| Inbox row | List + ListItem | `text-body`, `space-2`, `bg-raised` on hover | One mail, one line |
| Mail type chip | Badge | `text-meta`, accent per §3 mapping | MERGE_FAILED / HELP / WITNESS_PING … |
| Priority pill | Badge | `DESIGN-SYSTEM.md §4 Priority pill` | P0..P4 |
| Unread dot | bare span | `accent-info` solid, `fg-muted` outline muted | Read/unread state |
| Pinned marker | small icon | `accent-warning` fill | Pinned addresses only |
| Address picker | Command (shadcn) | `text-body` input, `bg-raised` dropdown | Autocomplete across rigs + polecats |
| Search field | Input + kbd hint | `text-body`, `space-3` | `/` scoped; `Cmd-/` global |
| Thread drawer | Sheet (side=right) | `dur-medium` + `ease-out-standard` | Non-route detail |
| Linked-bead chip | Badge + link | `text-meta`, `accent-info` @ 15% | Inline entity reference |
| Reply composer | Textarea + Button row | `text-body` mono, `space-3` | Inline send |
| Compose dialog | Dialog (shadcn) | `bg-raised`, `dur-medium` | New thread (`c`) |
| Empty-state panel | `DESIGN-SYSTEM.md §5` template | `space-12` vertical | "Inbox clear." |
| Address autocomplete token | Badge (closable) | `accent-info` @ 15% | `@rig/role` rendered as typed chip (inspiration §4.4) |

State chip styling for polecats (when a polecat mail shows a sender state) must consume the `<StateChip />` primitive mandated by `DESIGN-SYSTEM.md §7` — never re-implement the 6-state drift.

## 3. Microcopy

Every visible string. If a string is missing here it will drift in implementation.

### Labels & buttons

| Surface | String |
|---------|--------|
| Surface title (drawer hero) | `Mail` |
| Address picker placeholder | `Switch inbox…` |
| Address picker empty hint | `No address matches. Try a polecat name or rig.` |
| Search placeholder (scoped) | `Search <address>…` |
| Search placeholder (global, Cmd-/) | `Search all inboxes…` |
| Compose button | `Compose` (icon: pencil) |
| Mark read button | `Mark read` |
| Mark unread button | `Mark unread` |
| Reply button | `Reply` |
| Reply-all button | `Reply all` |
| Mute-thread toggle | `Mute thread` / `Unmute thread` |
| Archive row | `Archive` |
| Open linked bead | `Open <bead-id>` |
| Bulk-bar (N selected) | `<N> selected · Mark read · Archive · Mute · Clear` |
| Snooze (`.`) | `Snooze until tomorrow` |

### Metadata strings

- Relative timestamps: `now`, `Nm`, `Nh`, `yesterday`, `Mar 4`. (Match Today-view convention.)
- Type chip labels (short): `MERGE FAILED`, `REWORK`, `HELP`, `POLECAT DONE`, `MERGE READY`, `MERGED`, `HANDOFF`, `WITNESS PING`.
- Sender format: `<rig>/<role>` or `<rig>/polecats/<name>` rendered as a chip (inspiration §4.4); hover shows full address.

### Empty & error states

| State | Copy |
|-------|------|
| Empty inbox (address is current user's) | `Inbox clear.` |
| Empty inbox (other address) | `No mail in <address> yet.` |
| Empty search | `Nothing matches "<query>".` |
| Muted-only view | `All conversations here are muted.` |
| Probe offline | `Mail is offline. Is Gas Town running?` |
| Send failure | `Send failed: <reason>. Your draft is saved.` |
| Mark-read race | `Already marked read elsewhere.` (toast, `dur-fast`) |

### Compose / Reply

- To field placeholder: `Who? (e.g. spectralSet/witness)`
- Subject placeholder: `One-line subject`
- Body placeholder: `Write your message. Markdown renders on send.`
- Type selector label: `Type` (defaults to the thread's type on reply; `POLECAT_DONE` for new threads from a polecat context; required for Compose).
- Priority selector label: `Priority` (defaults `normal`).
- Pinned checkbox: `Pin — survives recipient session resets`.
- Validation inline: `<address>` needs the shape `rig/role` or `rig/polecats/name`.
- Success toast: `Sent to <address>.`

## 4. Keyboard shortcuts

Every common verb has a keystroke (pillar 2 — direct manipulation). Scope is the focused row or the focused thread.

| Key | Scope | Verb |
|-----|-------|------|
| `g m` | global | Open Mail surface |
| `j` / `k` | list | Next / previous row |
| `Enter` | focused row | Open thread drawer |
| `ESC` | drawer | Close thread (focus returns to row) |
| `e` | row or drawer | Mark read (toggle) |
| `u` | row or drawer | Mark unread |
| `m` | row or drawer | Mute / unmute thread (inspiration §1.4) |
| `r` | drawer | Reply (focus composer) |
| `R` | drawer | Reply all |
| `c` | global in Mail | Compose new thread |
| `/` | surface | Focus search (scoped to address) |
| `Cmd-/` | surface | Focus search (all inboxes) |
| `.` | row | Snooze until tomorrow |
| `a` | row or drawer | Archive |
| `x` | row | Toggle multi-select |
| `Shift-j/k` | list | Extend multi-select |
| `o` | drawer | Open linked bead drawer (if present) |
| `p` | row | Toggle pinned flag (if user owns the thread) |
| `Cmd-Enter` | composer | Send |
| `Cmd-K` | anywhere | Command bar (row-scoped verbs: `peek <sender>`, `nudge <sender>`, `open bead`) |

No shortcut opens a modal that hides the list. No shortcut triggers a navigation away from `/mail`.

## 5. Live data behavior

Source of truth: Dolt-backed bead store. `PRINCIPLES.md §pillar 1` commits us to real-time omnipresence via `HASHOF_DB` polling (≈0.14ms) — treat mail as push, not pull.

### Subscriptions

| Query | Today | Target |
|-------|-------|--------|
| `mail.inbox(address)` | 10s refetch (`MailPanel.tsx` line-note, `current-state-audit.md:222`) | Hash-subscribed: refetch only when the address inbox hash advances |
| `mail.directory()` | 15s probe refetch | Hash-subscribed via `gt status --json` probe contract |
| `mail.thread(id)` | not implemented | Hash-subscribed per thread; new reply appears in-place |
| `mail.counts()` (sidebar badges) | derived from inbox query | Server-aggregated count delta pushed to sidebar |

Fallback: if the Dolt subscription fails, the surface degrades to 10s polling with a subtle `Reconnecting…` footer note (`text-meta`, `fg-muted`). Never a toast. Never blocks interaction.

### Optimistic updates

- **Mark read / unread**: write fires immediately; row opacity unchanged; unread dot flips; rollback on error with toast `Mark-read failed`. No spinner.
- **Mute / unmute**: same pattern; mute badge flips, count badge on sidebar recomputes from the still-subscribed hash — no refetch needed.
- **Archive**: row animates out (`dur-fast` + `ease-out-standard`); restored on error.
- **Send (Compose or Reply)**: the new thread/reply appears in the list/drawer with a `sending…` meta string in `fg-subtle`; replaces with confirmed state on server ack. Send failure keeps the draft and surfaces the send-failure empty-state copy.

### Read/mute semantics

Read state is **per-user**; mute state is **per-user per thread** (per IA §4 Mail thread state sync). Visible everywhere — marking a thread read in the drawer updates the sidebar count, the Today pinned-mail card, and the inbox row in one render tick.

### Freshness & reconciliation

Each row carries its server-known hash. On subscription re-connect, the client requests `inbox(address, since=<hash>)` and patches; it does not bulk-refetch. Stale rows older than their current hash get a `dur-instant` re-render only.

## 6. Trade-offs and rejected alternatives

- **Drawer vs. full-page thread.** Rejected full-page: `INFORMATION-ARCHITECTURE.md §5` forbids routes for object detail; inspiration §4.3 shows drawer preserves context. Accepted: right-side Sheet.
- **Gmail conversation merging vs. Slack-style thread-per-subject.** Rejected Gmail: subjects are generated (`hq-wisp-XXX`) so subject-merge would collapse unrelated conversations; Journey 01 already calls subjects "information-free". Accepted: one thread = one root mail + its explicit replies.
- **Escalation rendering inside Mail.** Rejected: `INFORMATION-ARCHITECTURE.md §3 Incidents` (NEW surface) and `PRINCIPLES.md §surface set` separate these deliberately — escalations in Mail are the exact anti-pattern from Journey 03 ("fire-and-forget mail, visually indistinguishable from MERGED notifications"). Escalations are **not** an appearance in Mail (IA §4 Escalation).
- **Polling vs. Dolt push.** Rejected 10s polling as the steady state: Pillar 1 real-time omnipresence, and P4 Dolt infrastructure already ships. Kept polling as the degraded fallback only.
- **Tabs for each address vs. single address picker.** Rejected tabs: 15+ addresses per founder-scale operator (pillar 3), tab chrome collapses. Accepted: single picker + pinned-address list in the sidebar.
- **Search: client-side filter vs. server-side query.** Rejected client-side: operator has thousands of mails across polecat inboxes; client filter is O(n) on load. Accepted: server query with the same hash-subscription pattern.
- **Reply as modal (today's Compose shape) vs. inline composer in the drawer.** Rejected modal: inspiration §2.4 "never leave the current panel"; modal reply breaks context. Accepted: inline composer at the drawer footer. Compose-new-thread keeps its modal — it has no anchor context.
- **Hiding WITNESS_PING by default.** Rejected: operator asked for it in Journey 03 ("mute-per-thread, not hide-by-type"). Accepted: render dim (`fg-muted` + dot-only, no filled chip, per `DESIGN-SYSTEM.md §4`), user can mute per-thread to suppress further.
- **Dedicated `/mail/<address>` route.** Rejected: pushes back to the 40-route shape `current-state-audit.md §4.10` called out. The address is a `?inbox=<address>` search param on `/mail`, mirroring the convoy-drawer pattern from `INFORMATION-ARCHITECTURE.md §5.5`.
- **Single "Mark all as read" sledgehammer.** Rejected as the default affordance but kept as a bulk action: must select rows first (`x` or shift-click), then bulk-bar exposes `Mark read`. Matches Journey 01 ("Bulk archive + Mark-read as distinct buttons with distinct intentions").

## 7. Open questions for B5 review

1. **Address-picker scope.** Should polecat inboxes auto-populate (every probed polecat) or be opt-in (user types a name, then it pins)? Auto-populate risks 40+ noisy addresses at founder-scale; opt-in risks "where's my polecat's inbox?" on day one. Current default: opt-in, with a `+ All polecats for <rig>` toggle.
2. **Mute granularity.** Per-thread is clear. Per-sender ("mute everything from `spectralSet/witness`") is tempting for WITNESS_PING noise. Decision deferred — would introduce an ambient "muted sender" state that Journey 03 may want as `snooze type=WITNESS_PING` instead.
3. **Search defaults.** Should `/` default to current-address search or global? Today's Journey 01 only uses scoped searches. Global feels more powerful but doubles index cost. Current default: scoped.
4. **Reply composer: type/priority mirroring.** Should reply default to the parent thread's type + priority, or always to `HANDOFF` + `normal`? Mirroring feels right for `HELP` ↔ resolution but wrong for `WITNESS_PING` (no one replies to those). Current default: mirror type, reset priority to `normal`.
5. **`@mention` autocomplete source.** `gt mail directory` exists but is incomplete. Should the composer call the same probe-backed query as the address picker, or a richer server query that fans out per rig? Audit §`AddressPicker.tsx:18-22` noted the directory gap.
6. **Thread-view for non-threaded mail.** Most Gas Town mail is single-message (WITNESS_PING, MERGED). Opening the drawer shows one message and a composer — same shape as a thread. Is the drawer overkill for single-message mail, or is the uniformity worth it? Current choice: uniform drawer.
7. **Pinned flag vs. priority.** Today a mail can be `pinned=true` AND `priority=urgent`. Are these redundant? Pinned = "survives session resets"; priority = "how loud is it in the inbox". The spec treats them as orthogonal but a B5 reviewer may want one collapsed into the other.
8. **Linked-bead detection.** Should the client parse `ss-XYZ` patterns from body text, or require a structured `linked_beads` field on the mail payload? Parsing is brittle across rigs; structured field requires an API change. Current default: parse opportunistically, prefer structured when present.
9. **Send-queue behavior when Dolt is degraded.** A send fails — do we retry in-background, or surface the failure immediately and keep the draft? Current default: fail-fast with draft preserved. A retry queue would hide real outages.
10. **Does Mail show the sender's polecat state chip?** Polecat state is per-IA a cross-surface appearance. Showing it on every sender chip is expensive (N polecats = N subscriptions). Current default: show only in the thread drawer header, not on inbox rows.
