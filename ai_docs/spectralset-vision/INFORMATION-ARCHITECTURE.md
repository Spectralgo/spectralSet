---
phase: B1
doc_id: IA
version: v0.1
owner: crew/worktree_researcher
depends_on: [B0]
seed_inputs:
  - ai_docs/spectralset-vision/PRINCIPLES.md
  - ai_docs/spectralset-vision/current-state-audit.md
  - ai_docs/spectralset-vision/inspiration.md#2.1
  - ai_docs/spectralset-vision/inspiration.md#3.4
  - ai_docs/spectralset-vision/inspiration.md#4.3
  - ai_docs/spectralset-vision/journeys/01-morning-routine.md
  - ai_docs/spectralset-vision/journeys/02-sling-and-monitor.md
  - ai_docs/spectralset-vision/journeys/03-incident-response.md
  - ai_docs/spectralset-vision/journeys/04-code-review-handoff.md
  - ai_docs/spectralset-vision/journeys/05-agent-recovery.md
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-20
---

> **B0 status note**: PRINCIPLES.md (B0) was not yet present on
> `origin/main` when this doc was drafted. Surface set below honors the
> B0-seeded 7 surfaces from `PHASE-B-FRAMEWORK.md`. Any conflict with a
> subsequently-approved B0 goes through §7 — this doc does not silently
> ship a different set.

## 1. Surface inventory

The audit catalogued ~40 routes in `apps/desktop/src/renderer/routes/`
(`current-state-audit.md` §5 file index). Most are legitimate product
surface (settings sub-pages, workspace views, onboarding); only three
are the Gas Town operator surface that this IA is about — `gastown/agents`,
`gastown/convoys`, `gastown/mail` (audit §2). The IA below **adds four
new top-level surfaces** (Today, Command bar, Incidents, Rejection Triage)
and refines the three existing Gas Town panels, while leaving the
workspace / settings / onboarding surfaces untouched.

The 7 future-state top-level surfaces:

| # | Surface | Home of | Survives navigation |
|---|---------|---------|---------------------|
| 1 | **Today** | the "what needs me now" digest | selected rig filter, snooze state |
| 2 | **Command bar** | verbs + cross-type search | last 20 queries, recency rank |
| 3 | **Agents** | polecats, crew, mayor, deacon | sidebar scroll, expanded drawer |
| 4 | **Convoys** | epic/sprint containers | selected convoy, filter |
| 5 | **Mail** | threaded communication | selected address, read/unread |
| 6 | **Incidents** | escalations & outages | open-vs-acked filter |
| 7 | **Rejection Triage** | `MERGE_FAILED` / `REWORK_REQUEST` | grouped-by-cause toggle |

Audit finding that mandated this set (audit §4.10): a new user crosses
**seven route transitions before seeing a working surface**; the current
app has no "what should I do now" landing at all — every entry path
spinners-through to a workspace picker or a redirect
(`current-state-audit.md:44-50, 275-284`).

Non-goals explicitly *not* added to the top-level surface set: Beads
browser, Convoy authoring UI, Rig map, Activity timeline. These appear
as *views inside* the 7 surfaces (see §4), not as separate navigation
entries. Keeping the surface count tight is a principle (founder-scale,
Linear info density) — every new surface costs sidebar slot + mental
model load.

Every surface entry in §3 cites at least one audit section, one journey,
and one inspiration pattern.

## 2. Sidebar grouping

Sidebar is the primary nav (Arc §6.1 — "top chrome almost empty, the
sidebar does the work"). It has two zones:

**Fixed groups (non-removable, always in this order)**:

1. **Today** — single row, no children. Top slot. Home badge = count of
   unacked items (Slack §4.1 unread-vs-mention — dot for normal,
   red-number for escalations/pinned).
2. **Incidents** — single row. Red count badge when any open.
3. **Rejection Triage** — single row. Red count badge when any open.
4. **Mail** — expandable. Children = pinned addresses
   (`mayor/` + current rig's `refinery` / `witness` + polecat inboxes the
   user opened this session). Matches today's AddressPicker behavior
   (audit §2 `gastown/mail` notes: `AddressPicker.tsx:23-37`, 15s probe
   refetch).

**User-customizable sections (drag to reorder; default ships empty)**:

Rules from Slack §4.2 "custom sections":

- User can create, rename, reorder, and delete sections.
- A section is a bucket for rows; rows are pinned agents, pinned convoys,
  pinned beads, or saved searches. Mixed types allowed.
- Mute-per-section hides count badges without removing rows. "Muted" is
  visual-only; the system still tracks unreads underneath.
- Drag-to-reorder uses row-anchored handles; collapse state persists.

**Agents and Convoys do NOT appear as sidebar groups.** They are reachable
via (a) their top-level route in the fixed groups, (b) the command bar,
(c) the sidebar's custom sections if the user explicitly pins them. This
breaks with today's app, where `GastownSidebarSection` exposes a flat
list including agents and convoys — which does not scale past ~5 rigs
(audit §4.9 "coexistence" and `inspiration.md` §4.2 closing note:
"currently the sidebar is flat; as town size grows this will become
unusable without grouping").

## 3. Top-level surfaces

Seven surfaces, in sidebar/route order. Route patterns deliberately
shorter than today's (`current-state-audit.md` §4.10 critique: seven
redirects before working surface).

### Today (`/today`)

**Answers:** what needs me right now?
**Default sub-view:** triage stack (escalations + rejections + pinned
mail) + per-rig health strip + "go drink coffee" verdict line.
**Breadcrumb:** `Today` only.
**Shortcut:** `g t` (Linear-style double-press).
**Cites:** audit §4.10 (missing landing), Journey 01 §"What
'delightful' looks like" (Morning Dashboard, triage stack, go-drink-coffee
badge), inspiration §3.4 (Things 3 "Today as the only view that matters
in the morning").

### Command bar (`Cmd-K` — overlay, not a route)

**Answers:** any verb, any object, any search.
**Default sub-view:** recency-ranked list; typing filters.
**Breadcrumb:** none — overlay restores prior focus on dismiss.
**Shortcut:** `Cmd-K` from anywhere; `Cmd-Shift-K` for row-scoped (Raycast
§2.2).
**Cites:** audit finding that the app has no global palette (none of the
40 routes implements one — §5 index), Journey 02 §"Friction points"
(three-identifier tax on `ss-u72` → `quartz` → `polecat/quartz-…`),
inspiration §1.1 + §2.1 + §5.5 + §6.3 ("four of six apps converge here —
single highest-leverage pattern in the catalog", `inspiration.md:311`).
Command bar is explicitly *not a route* — inspiration §5.5 mandates it
as *the* navigation model, invokable from any other surface without
leaving it.

### Agents (`/agents`)

**Answers:** who is working, who is stalled, who is a zombie?
**Default sub-view:** grouped grid (Mayor/Deacon/Boot, then rigs
alphabetically, then polecats by state).
**Breadcrumb:** `Agents / <rig> / <polecat>` when a drawer is open;
drawer does not push a route (see §5).
**Shortcut:** `g a`.
**Cites:** audit §2 `gastown/agents` (existing AgentCVPanel — "most
finished surface in the app", §1 TL;DR item 1), Journey 05 §"Friction
points" (three-state model invisible today), inspiration §4.5 (Slack
presence indicators: working/idle/stalled/zombie as colored dot — low
effort, high value, inspiration top-10 rank #4).

### Convoys (`/convoys`)

**Answers:** which sprints/epics are in-flight, where are they blocked?
**Default sub-view:** list-plus-drawer (today's ConvoyBoard pattern —
keep it). List left, detail right.
**Breadcrumb:** `Convoys / <convoy title>`.
**Shortcut:** `g c`.
**Cites:** audit §2 `gastown/convoys` (list + detail, 10s refetch, no
link-out to beads yet — "Tracked-issues table has no link-out to the
bead"), Journey 02 §"Friction points" (merge queue is poll-only — reload
loop), inspiration §1.3 (grouped lists: by state / owner / epic —
inspiration honorable mention at §"Honorable mentions").

### Mail (`/mail`)

**Answers:** what's waiting for me, what do I owe a reply?
**Default sub-view:** inbox list left, thread drawer right. Inbox
defaults to current user's own address, NOT `mayor/` (audit §2 flagged
`gastown/mail` confusion: "Inbox defaults to mayor/ on mount — for a
polecat-first user, the first view is always Mayor's inbox, not their
own").
**Breadcrumb:** `Mail / <address> / <thread>`.
**Shortcut:** `g m`.
**Cites:** audit §2 `gastown/mail` (Mark-read disabled, no reply, no
archive, no thread view — `MailPanel.tsx:247-256`), Journey 01
§"Friction points" item 2 ("5 unread + 12 read-but-unprocessed" — IDs
are information-free), inspiration §4.1 + §4.3 (unread-vs-mention +
thread expansion as in-place drawer — top-10 ranks #5 and #7).

### Incidents (`/incidents`) — NEW

**Answers:** what is broken *right now*, what has been acked, what is
resolving?
**Default sub-view:** open-incident list, sorted by severity then age.
**Breadcrumb:** `Incidents / <incident title>`.
**Shortcut:** `g i`.
**Cites:** audit §5 index (no such surface exists — `gt escalate` today
only writes mail, visually indistinguishable from routine notifications
per `GASTOWN-LESSONS-AND-TIPS.md:196-211`), Journey 03 §"Friction points"
(escalation is fire-and-forget mail, evidence not attached, "no
incident channel — just inbox"), inspiration §1.4 (mute-per-thread,
inline cards) + §3.1 (empty as haiku — "All quiet across town.").

### Rejection Triage (`/rejection-triage`) — NEW

**Answers:** which polecat branches just got rejected by the refinery,
and why?
**Default sub-view:** rejection card list, grouped by root-cause chip
(stale-imports / test-regression / lint / rebase-conflict / build-error /
other).
**Breadcrumb:** `Rejection Triage / <branch>`.
**Shortcut:** `g r`.
**Cites:** audit §5 (no surface exists — today, MERGE_FAILED lands in
inbox as one mail row, operator must `gt mail read → git fetch → git
checkout → bun install → bun typecheck` to see the failure — 90s
environmental setup), Journey 04 §"Current CLI steps" (the 8-step
rejection dance and the "fix-it-myself" temptation that breaks Law #1),
inspiration §1.3 (grouped lists — group by root cause).

## 4. Cross-surface objects

Four object types appear on multiple surfaces. Each has exactly one
**home surface** (canonical detail view) and N **appearances** (compact
representations elsewhere). State sync rule: the home surface is
authoritative; appearances subscribe to the same query; optimistic
writes are allowed only from the home surface.

### Bead

- **Home surface:** Convoys detail drawer (when bead belongs to a
  convoy) OR a lightweight **Bead drawer** opened from any appearance
  (not a route — see §5). Audit §2 `gastown/convoys` flagged: "Tracked-
  issues table has no link-out to the bead" — the drawer is the link-out.
- **Appearances:** Today (bead card in triage stack), Convoys (row in
  tracked-issues table), Command bar (inline preview on `ss-XYZ`), Mail
  (linked bead in a dispatch mail body), Rejection Triage (the bead the
  failed polecat was assigned).
- **State sync:** home drawer owns edits; appearances re-render on query
  invalidation; no local Zustand for bead state (avoids the "two stacks
  coexist" problem from audit §1 TL;DR item 2).

### Polecat (agent)

- **Home surface:** Agents detail drawer (today's
  `AgentDetailDrawer.tsx`).
- **Appearances:** Today (row in per-rig health strip), Agents grid card,
  Command bar (inline mini-peek on `peek jasper` — inspiration §2.3
  "inline results render rich"), Incidents (source agent on a
  stale-polecat escalation), Rejection Triage (the polecat whose branch
  failed).
- **State sync:** state chip (working/stalled/zombie) is computed
  server-side; every appearance subscribes. Journey 05 §"Friction points"
  item 1 mandates: state chip is authoritative, not re-derived per view.

### Mail thread

- **Home surface:** Mail thread drawer.
- **Appearances:** Today (pinned-mail card), sidebar Mail group (row),
  Incidents (linked discussion on an incident), Command bar (`m:<subject>`
  query result).
- **State sync:** read/unread is a *per-user* field; mute-per-thread
  (inspiration §1.4) is a per-user field too. Visible-everywhere read
  state — marking read in one appearance flips all of them.

### Escalation

- **Home surface:** Incidents detail drawer.
- **Appearances:** Today (top of triage stack), sidebar Incidents group
  (count badge), Agents drawer (if escalation fired against a polecat),
  Command bar (`escalation:open`). **Escalations are NOT an appearance
  in Mail** — this is the key architectural separation from today's
  behavior, where `gt escalate` writes a mail that visually looks like
  a routine notification (Journey 03 §"Friction points" item 3).
- **State sync:** ack state writes to the home surface; Today and
  sidebar re-render on invalidation; an acked escalation falls out of
  the triage stack automatically but stays in `Incidents` with an
  `acked` chip until resolved.

## 5. Navigation model

One hard rule from inspiration §4.3 and §5.2:

> **Detail opens as a drawer. The list stays visible.**

```
          routes                        drawers                   overlays
          ──────                        ───────                   ────────
    /today  /agents  /convoys           Bead drawer               Command bar (Cmd-K)
    /mail   /incidents                  Polecat drawer            Compose dialog
    /rejection-triage                   Thread drawer             NukeConfirm
                                        Incident drawer           Nudge dialog
                                        Rejection drawer
  top-level surfaces only              opens over a list          stacks on top,
  (never an object detail)             list remains visible       restores focus on close
  URL = breadcrumb root                ESC closes                 ESC closes
  browser back = go up one             no URL change              no URL change
```

**Rules:**

1. **Routes only for top-level surfaces.** Never for object detail. This
   inverts today's app (audit §2 `tasks/$taskId`, `project/$projectId`,
   `settings/project/$projectId/general` are all routes — breadcrumbs
   deep, back-button unpredictable).
2. **Drawers for object detail** on every cross-surface object (§4).
   Drawer opens anchored to a list; list stays scrollable behind it.
   `ESC` closes.
3. **Modals only for destructive confirmations.** NukeConfirm, delete-
   bead confirm, cancel-escalation confirm. Inspiration §2.4: "never
   leave the current panel." NukeConfirmDialog today is the template
   (`inspiration.md` §2.4 closing note).
4. **Command bar is an overlay**, not a route. Invokable from any surface
   including from inside a drawer; closing restores prior focus
   including drawer scroll position (inspiration §5.5).
5. **No deep routes inside top-level surfaces.** `/convoys` is the only
   route for convoys; a specific convoy's detail is a drawer, keyed by
   `?drawer=convoy:<id>` as a search param (back-button restores prior
   drawer, not prior route).

This collapses today's 40-route tree toward ~12 routes (7 surfaces + 5
settings/onboarding that we leave alone). Every user-visible object
detail comes from a drawer.

## 6. Empty states map

Inspiration §3.1 rule (Things 3): **empty is a good state. No CTA
cluster.** Audit §1 TL;DR item 4 mandated single-treatment: "The user
can land on three different 'empty' states depending on entry path." IA
collapses to one canonical template per surface.

Shape per surface (prose, centered, generous whitespace, optional
tasteful illustration, zero buttons unless the user genuinely needs to
create something):

| Surface | Empty-state microcopy (seed — refine in B3) |
|---------|---------------------------------------------|
| Today | "All polecats self-sufficient. Nothing needs you right now." |
| Command bar (no query) | Recent commands list — no empty state, just history. |
| Command bar (no results) | "Nothing matches `<query>`. Try a bead ID or a polecat name." |
| Agents (no polecats in rig) | "No polecats in `<rig>` yet. Sling one with `gt sling`." |
| Convoys (no convoys) | "No convoys landing today." (inspiration §3.1 verbatim tone) |
| Convoys (no convoys ever) | "Convoys group related beads for merge. Create one with `gt convoy create`." |
| Mail (inbox clear) | "Inbox clear." |
| Incidents (all clear) | "All quiet across town. Last escalation resolved `<relative time>`." |
| Rejection Triage (all clear) | "No rejected branches. Merge queue is flowing." |

Rules:

- **Never a CTA cluster.** At most one action, only when the user
  genuinely cannot proceed (e.g., "no polecats yet" has a command hint,
  not a button).
- **Loading is not empty.** Loading renders a subtle spinner; empty is
  a different, calmer state shown only after data has loaded.
- **Error is not empty.** Errors get their own treatment (audit §2
  `gastown/convoys` template: "Failed to load convoys. Is Gas Town
  running?" is the right shape — copy the pattern).
- **Feature-flag-hidden is not empty.** Audit §1 TL;DR item 3
  ("Settings is feature-flag swiss cheese") — if a surface is hidden by
  a flag, the surface is *absent from the sidebar*, not an empty pane.

## 7. PROPOSED SURFACE CHANGE

No proposed changes.

The 7 surfaces seeded by B0 (Today, Command bar, Agents, Convoys, Mail,
Incidents, Rejection Triage) cover every journey friction point cited
in §3 and every cross-surface object in §4. Adding a Beads surface or an
Activity timeline would duplicate what Command bar + Today already
provide at lower nav cost; removing Incidents or Rejection Triage would
re-fold them into Mail, which Journey 03 and Journey 04 both identify
as the root problem. The set holds.

If B0 (once approved) adjusts the set, this doc is the authoritative
place to revisit; §3 sub-headers make additions/removals a surgical
edit. Until then: the 7 above.
