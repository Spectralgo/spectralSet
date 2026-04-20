# SpectralSet Inspiration Catalog

**Status:** DISC-A4 deliverable (read-only research, ~30 patterns anchored to real panels)
**Author:** polecat jasper (ss-3jt)
**Date:** 2026-04-20

This catalog pulls concrete interaction patterns from six best-in-class control surfaces and anchors each one to a SpectralSet panel that exists today or is clearly on the roadmap. "Anchored" means: if we adopted this pattern, it would ship inside the named panel — not as a generic UX riff.

Existing panels referenced below (from `apps/desktop/src/renderer`):

- `Gastown/AgentCVPanel` — agent grid + detail drawer
- `Gastown/ConvoyBoard` — list + detail view for convoys
- `Gastown/MailPanel` — mail inbox
- `Gastown/GastownSidebarSection` — left sidebar entry point
- `Gastown/PolecatPeekDrawer` — peek into a polecat's state
- `Gastown/NudgeDialog`, `Gastown/NukeConfirmDialog` — modal affordances
- `WorkspaceView/RightSidebar/ChangesView/ReviewPanel` — PR/review surface
- `ResizablePanel` — shared panel chrome

Future panels referenced (implied by the roadmap and the current taxonomy):

- **Command bar** — global Cmd-K palette (does not exist yet)
- **Today view** — first-class "what needs me now" home
- **Activity timeline** — unified feed of MRs / mail / escalations
- **Agent detail drawer** — already partially exists inside AgentCVPanel; deserves its own doc
- **Rig map** — spatial view of town → rig → polecats
- **Quick-capture** — inline `bd create` / `gt mail` from anywhere

---

## 1. Linear

**Why it matters:** Linear is the reference implementation for keyboard-first multi-object workflows. SpectralSet has the same shape — beads, polecats, MRs, convoys — and the same user (someone driving a lot of structured work fast).

### 1.1 Cmd-K command palette with verb-object phrasing

**Pattern.** Pressing `Cmd-K` opens a context-aware palette. The palette resolves phrases like "assign to Sarah," "change status to in progress," "label as bug" against whatever object is focused (selected issue, current view, or none). Results are ranked by recency and current context.

**Why it works.** The palette replaces a dozen menus, buttons, and shortcuts with one entrypoint. "What's focused" is the implicit direct object, so verbs stay short. Keyboard users never context-switch to the mouse for a common action.

**SpectralSet home.** New top-level **Command bar**, invokable from anywhere. Initial verbs: `sling <polecat>`, `peek <polecat>`, `mail <addr>`, `nudge <polecat>`, `create bead`, `open convoy`. Context = currently focused polecat/convoy/bead in AgentCVPanel or ConvoyBoard. This is the single highest-leverage pattern in the catalog.

### 1.2 Status chips with one-letter cycle shortcuts

**Pattern.** Every issue row shows a status chip (backlog/todo/in-progress/done/canceled). Pressing a single letter (`b`, `t`, `i`, `d`, `c`) on a focused row cycles the chip. No dropdown, no modal.

**Why it works.** Status changes are the highest-frequency edit. Reducing them to one keystroke on a focused row makes triaging 30 issues feel like 30 seconds, not 30 clicks.

**SpectralSet home.** `AgentCVPanel` agent cards and a future **Beads panel**. Letters could map to `o` (open), `i` (in_progress), `b` (blocked), `d` (deferred), `c` (closed). Chips already fit our polecat health states (working / stalled / zombie).

### 1.3 Grouped lists with collapsible headings ("by status", "by assignee", "by project")

**Pattern.** A list view can be re-grouped via a single toolbar switch. Each group header shows a count, is collapsible, and supports bulk actions (select all in group).

**Why it works.** The same data answers three questions — "what's blocked?", "what does Sarah have?", "what's in sprint 42?" — without leaving the view. The group header is a handle for coarse operations.

**SpectralSet home.** `ConvoyBoard` (group by state / owner / epic) and a future **Beads panel** (group by rig / status / assignee). Collapse state persists per view, so "my working setup" is sticky.

### 1.4 Inline notification design with mute-per-thread

**Pattern.** Notifications are a list of one-line cards; each card has a "mute this thread" and "snooze" affordance inline. Read/unread is visual, not modal. Clicking a card navigates to the object; archiving happens on dismiss.

**Why it works.** The inbox is not a separate app — it's a view of the same objects you already know. Mute-per-thread respects the fact that notification fatigue is the #1 reason people abandon tools.

**SpectralSet home.** `MailPanel` and a future **Activity timeline**. We already have hook-attached mail and nudges; a row-level "mute this conversation with polecat X" would stop the "polecat X keeps pinging me about a dead bead" spiral.

### 1.5 Cycle/sprint visualization as a time-bounded scope

**Pattern.** Linear's "cycle" is a named, time-bounded container. The UI shows progress (X of Y done, burn-down), cycle drift (what moved in/out), and a cycle review view.

**Why it works.** Work has a natural cadence. Giving it a container with a start, an end, and a dashboard makes "are we going to ship?" legible without a meeting.

**SpectralSet home.** Future **Epic/convoy dashboard** — `ConvoyBoard` already groups MRs; adding a start/target date + burn-down turns a convoy into a shippable unit.

---

## 2. Raycast

**Why it matters:** Raycast proves that a launcher can be a primary app surface. SpectralSet lives on keyboard-driven operators who already `Cmd-Space` constantly. The question isn't "should we copy Raycast?" — it's "which Raycast patterns become native inside SpectralSet?"

### 2.1 Omnibox search that resolves across object types

**Pattern.** One input field searches apps, files, clipboard history, snippets, calculator, and extensions simultaneously. Results are typed (each row shows its type icon). Enter acts on the top result; Cmd-Enter acts on the selected row.

**Why it works.** The user doesn't pre-decide "am I looking for a bead or a polecat or a mail?" — they just type. Type-aware results preserve ambiguity until the moment of action.

**SpectralSet home.** The **Command bar** (§1.1) with a search mode. `j:e586` jumps to MR, `p:jasper` to polecat, `m:` to mail thread, bare query searches all.

### 2.2 Quick actions on the focused row

**Pattern.** With a row selected, `Cmd-K` opens a secondary palette of actions that apply to that row specifically (copy path, open in Finder, show metadata, run a custom extension). The palette is context-scoped, not global.

**Why it works.** The hierarchy is clear: global verbs live on naked `Cmd-K`; row verbs live on row-focused `Cmd-K`. The user never wonders "does this action exist?" — they ask the object.

**SpectralSet home.** `AgentCVPanel` agent card, `ConvoyBoard` row, `MailPanel` message. Actions: peek, nudge, escalate, mail, nuke, rerun. Replaces the scatter of right-click menus and drawer buttons.

### 2.3 Inline results render rich, not text-only

**Pattern.** A calculator query renders the answer inline. A GitHub issue query renders the issue card inline. A Jira ticket renders status, assignee, labels inline. Results are *previews*, not just links.

**Why it works.** The launcher is often the destination, not a stepping stone. If 70% of the answer is "what's the status of ss-3jt?", showing the bead card in the dropdown saves a navigation.

**SpectralSet home.** **Command bar** results. Typing `ss-3jt` shows the bead card inline with status, assignee, attached molecule. Typing `peek jasper` shows a mini PolecatPeek preview in the dropdown.

### 2.4 Confirmation modals that don't steal focus

**Pattern.** Destructive actions open a compact, centered confirm panel that *stays inside the launcher* — you don't alt-tab to a system dialog. The confirm accepts Enter immediately; Escape cancels; focus returns to the prior state.

**Why it works.** System modals are a tax. Keeping destructive confirms inside the app preserves flow and keeps the keyboard in charge.

**SpectralSet home.** `NukeConfirmDialog` today is adequate; the pattern generalizes to a lightweight in-panel confirm we can reuse for "merge this MR", "nuke polecat", "cancel escalation", "close bead with no-changes". Principle: never leave the current panel.

### 2.5 Extensions with discoverable input schemas

**Pattern.** Raycast extensions declare arguments (`--watch`, `--in-folder`) that appear as typed tokens in the omnibox. The launcher prompts for missing args inline with placeholders.

**Why it works.** Extensibility without documentation. The UI *is* the man page.

**SpectralSet home.** **Command bar** verbs. `sling` without a target prompts for `bead`, then `polecat`. `mail` prompts for `address`, then `subject`. Any `bd`/`gt` command can be wrapped this way without a UI redesign.

---

## 3. Things 3

**Why it matters:** Things gets the *feel* of a calm personal tool. SpectralSet is, for most operators, their primary "what do I need to do today" surface. Borrowing Things' restraint would differentiate us from the dense issue-tracker aesthetic.

### 3.1 Empty states that read like haiku, not like errors

**Pattern.** "No tasks today. Enjoy your day." in generous whitespace with a single tasteful illustration. No "Get started" CTA cluster.

**Why it works.** Empty is a good state. Treating it like a success reinforces the calm-tool positioning instead of pushing users to synthesize work.

**SpectralSet home.** `MailPanel` ("Inbox clear."), `ConvoyBoard` when no convoys are active ("No convoys landing today."), future **Today view** ("All polecats self-sufficient."). Small font, centered, honest.

### 3.2 Deferred-until as a first-class field

**Pattern.** Any task can be scheduled for a future date; until that date, it vanishes from the main list and reappears automatically on the chosen day. No "snoozed" folder; just trust.

**Why it works.** Decoupling "I've decided what to do" from "I need to think about this now" collapses the mental tax of maintaining a backlog. The user trusts the system to surface it back.

**SpectralSet home.** Beads already have `deferred` status — but no *date*. Adding `deferred_until` + a **Today view** filter would let a polecat owner say "this bead needs human review Tuesday" and stop seeing it until Tuesday. MailPanel benefits similarly ("remind me tomorrow").

### 3.3 Heading typography that builds hierarchy without boxes

**Pattern.** Section headers are pure type — weight and size do the work; no dividers, no background fills, no chrome. The result is a document, not a dashboard.

**Why it works.** Chrome is noise. A list of polecats with a typographic "Working / Stalled / Zombie" header reads faster than the same list with three colored boxes.

**SpectralSet home.** `AgentCVPanel` grid section headers, `ConvoyBoard` state dividers. Replace boxed containers with heading type + generous top margin. Pair with §1.3 collapsible groups for functional compression.

### 3.4 "Today" as the only view that matters in the morning

**Pattern.** Things' "Today" is the first-class home. Everything else — projects, areas, upcoming — is a click away but not the default. The app opens to "what should I do right now?"

**Why it works.** A default view is a prescription. Making "today" the default reinforces daily use; making "all projects" the default reinforces stress.

**SpectralSet home.** New **Today view** as the desktop app's default landing: "Polecats needing you", "MRs awaiting decision", "Mail marked pinned", "Escalations open". Compact, readable-in-5-seconds.

### 3.5 Natural-language quick-add ("pay rent tomorrow @home")

**Pattern.** One input accepts `"Fix login bug tomorrow 3pm @sarah"` and parses due date, time, and assignee from the same string. No fields, no modal.

**Why it works.** Capture friction is the #1 killer of any tracking tool. Reducing "add a thing" to a single line removes the gap between thought and record.

**SpectralSet home.** Future **Quick-capture** bar in the app header. `"bd new Refactor bridge model P2 @jasper #discovery"` parses title, priority, assignee, label. Wraps `bd create` but feels like a sentence, not a form.

---

## 4. Slack

**Why it matters:** Slack is where our operators already live mentally. The interactions they expect from a "messaging-ish" surface — mail, nudges, escalations — are Slack-shaped. Fighting that muscle memory is a tax; leaning into it is free usability.

### 4.1 Unread badges that distinguish "any" from "mention"

**Pattern.** Channels show a subtle unread dot; channels with an @-mention show a bold red numeric badge. The user scans the sidebar once and knows where attention is required vs. merely available.

**Why it works.** Not all unreads are equal. Separating "there's activity" from "you're needed" makes the sidebar itself the triage surface.

**SpectralSet home.** `GastownSidebarSection` and `MailPanel` entries. Plain mail = dot. `gt escalate` or `--pinned` mail = red badge with count. Reframes the sidebar from a list of things into a triage queue.

### 4.2 Channel groups / sections (Slack's "custom sections")

**Pattern.** Users can group channels into named collapsible sections ("Incidents", "Team", "Social"). Sections have muting, priority, and drag-to-reorder.

**Why it works.** The sidebar scales with the user's mental model, not the org's. A channel list sorted by org politics is hostile; one sorted by the user's priorities is a home.

**SpectralSet home.** `GastownSidebarSection` — let users create custom groups like "Active Rigs", "Watching", "Archive". Currently the sidebar is flat; as town size grows this will become unusable without grouping.

### 4.3 Thread expansion as an in-place drawer

**Pattern.** Clicking "3 replies" expands the thread inline as a right-side drawer without leaving the channel. The main channel stays visible on the left.

**Why it works.** Context is preserved. The user never loses the surrounding conversation while diving into a sub-conversation.

**SpectralSet home.** `MailPanel` — a mail thread with replies should open as a right-side drawer alongside the inbox, not as a full-page navigation. Same pattern applies to `ConvoyBoard` → MR detail: detail opens as drawer, list stays visible.

### 4.4 @ mentions with autocomplete and confirmation

**Pattern.** Typing `@` in any input surfaces a live-filtered list of people/channels/groups. Tab confirms the selection as a styled token. The sender sees a preview of who will be notified before send.

**Why it works.** Mentions are high-stakes — they interrupt someone. Making the target visible and typed-as-a-token (not raw string) makes intentionality the default.

**SpectralSet home.** Any mail/nudge compose affordance. Typing `@spectralSet/witness` should autocomplete and render as a typed address chip. Extends naturally to `@rig:spectralSet` (fan-out) and `@role:polecats` (broadcast) — today these are raw strings in command-line flags.

### 4.5 Presence indicators with "active / away / dnd" states

**Pattern.** Each user avatar has a colored dot indicating presence: active (green), away (hollow), snoozed (moon), focused/dnd (red). Presence is passive; no one has to update it.

**Why it works.** Presence answers the most common pre-message question ("are they around?") without asking. Passive inference beats explicit "I'm online" toggles.

**SpectralSet home.** `AgentCVPanel` cards and `PolecatRow`. We already compute polecat state — expose it as a presence dot on every avatar: working (green), idle (hollow), stalled (amber), zombie (red). Makes "who should I nudge?" a glance, not a `gt peek`.

---

## 5. Cron (Notion Calendar)

**Why it matters:** Cron's thesis — aggregate many calendars, respect keyboard, make "today" beautiful — maps directly to "aggregate many rigs, respect keyboard, make the operator's day legible."

### 5.1 Multi-source aggregation with per-source color

**Pattern.** Google, iCloud, Outlook calendars render in one view, with per-source color and per-source toggles. Conflicts across sources are surfaced visually (overlapping blocks).

**Why it works.** The user's *day* is one thing even when their *accounts* are many. Making aggregation the default (not opt-in) respects the reality.

**SpectralSet home.** Future unified **Activity timeline**: MRs (refinery color), mail (mayor color), escalations (red), nudges (muted). Per-source toggles let users turn off mail noise while watching the MQ. The ConvoyBoard is already a rough draft of this for one source.

### 5.2 Inline event detail on click (not navigation)

**Pattern.** Clicking an event opens a popover anchored to the event with full details, join links, guest list, and edit controls. No modal, no navigation — the calendar is still visible.

**Why it works.** Calendars are visual. A modal that obscures tomorrow defeats the point of the week view. Anchored popovers preserve spatial context.

**SpectralSet home.** `ConvoyBoard` row detail and `AgentCVPanel` card. Clicking a card today opens a drawer (good); an inline anchored popover for *compact* details (next action, last mail, current molecule) with "open full" to expand to drawer would be faster.

### 5.3 Keyboard navigation across a 2D surface

**Pattern.** Arrow keys move between events by time and day. `t` jumps to today. `1/2/3/4` switches between day/week/month/4-day views. Creating an event is `c`; editing is `e`.

**Why it works.** Spatial data needs spatial keyboard shortcuts. Linear's "j/k" works for lists; calendars need 2D equivalents. Cron treats this as a solved problem.

**SpectralSet home.** `AgentCVPanel` grid — arrow keys move between cards (currently they don't). `t` jumps to "today's active polecats". View-switch shortcuts become `1` = grid, `2` = list, `3` = drawer-focused.

### 5.4 Quick-add with natural-language time parsing

**Pattern.** Pressing `c` or clicking an empty slot opens a one-line input: `"Lunch with Sarah tomorrow 12:30"`. Parsed inline; Enter creates.

**Why it works.** Same thesis as Things §3.5 — collapse thought-to-record. The calendar knows what tomorrow means; the user shouldn't have to click through fields.

**SpectralSet home.** **Quick-capture** (§3.5) generalized. `"escalate polecat jasper stuck on migration in 30min"` parses into a scheduled escalation. Most of our commands have implicit time fields (defer, snooze, schedule) we can expose this way.

### 5.5 Command bar overlay with global search + navigation

**Pattern.** `Cmd-K` opens a search overlay that finds events, people, and settings across all accounts. It's the same pattern as Linear/Raycast — but Cron's version is *the* navigation model, not a power-user feature.

**Why it works.** In a tool with many accounts/views, "where is the thing I need" beats "click through the nav". Universalizing search makes the app navigable without a sidebar.

**SpectralSet home.** Reinforces §1.1/§2.1 — **Command bar** is the through-line across all six apps. Cron's lesson specifically: treat it as primary navigation, not an accessory.

---

## 6. Arc

**Why it matters:** Arc rethinks sidebar-first navigation in a domain (browsing) where everyone had settled. SpectralSet has the same opportunity — to rearrange town/rig/polecat navigation around how operators actually work.

### 6.1 Sidebar-first layout with collapsible left nav

**Pattern.** Arc puts tabs in a left sidebar, not a top bar. Tabs are grouped into "spaces" (work / personal / project-specific). The top chrome is almost nothing — the sidebar does the work.

**Why it works.** Horizontal space is precious on 13" MacBooks; vertical space for 15–30 tabs is cheap. Leaning on the sidebar inverts the traditional chrome budget.

**SpectralSet home.** `GastownSidebarSection` is already the primary nav — extend it. The top of the desktop app should be *almost empty*; the sidebar carries rigs → polecats → current focus. `ResizablePanel` means the user can set their own budget.

### 6.2 Spaces as a user-defined workspace partition

**Pattern.** An Arc space is a named container with its own tabs, pinned items, theme, and bookmarks. Switching spaces feels like switching desktops.

**Why it works.** Context is expensive. Giving users a coarse toggle between "war room for incident" and "normal work" lets them park state instead of closing/reopening it.

**SpectralSet home.** Future **Workspaces** (spectralSet already has a workspace concept in its web app) — but specifically, saved operator layouts. "Triage mode" = MailPanel + PolecatPeekDrawer. "Ship mode" = ConvoyBoard + ReviewPanel. One keystroke swaps.

### 6.3 Command bar invoked with Cmd-T — the tab/command duality

**Pattern.** `Cmd-T` in Arc opens a command bar; typing a URL navigates, typing a query searches, typing a command runs (like "Archive this tab"). One keystroke, many intents.

**Why it works.** Collapses "new tab" / "search" / "command" into one primitive. The user types; the bar infers intent.

**SpectralSet home.** **Command bar** (yes, again — three of six apps converge here). Arc's lesson: let the bar accept URLs/IDs directly (`ss-3jt` → open bead), queries (`convoys needing me`), and verbs (`sling jasper ss-xyz`) through one entry.

### 6.4 Preview-on-hover for tab/link cards

**Pattern.** Hovering a tab or bookmark reveals a small preview (title, favicon, recent URL, screenshot thumb). The preview is passive; clicking still navigates.

**Why it works.** Identifiers (URLs, tab titles) are lossy. A preview recovers enough information to decide without committing. Hover is the cheapest possible interaction.

**SpectralSet home.** `AgentCVPanel` card hover → mini PolecatPeek tooltip showing current molecule step, last commit subject, last mail subject. `ConvoyBoard` row hover → MR summary. Answers "which one was this?" without a click.

### 6.5 Automatic tab archiving after a TTL

**Pattern.** Tabs older than N days (default 12h–7d, user-settable) auto-archive out of the sidebar into a searchable "Archive". The sidebar stays small without the user having to curate it.

**Why it works.** Curation is a tax. Making the system do it — with a visible, reversible archive — means the user's attention stays on active work.

**SpectralSet home.** `MailPanel` already has the shape; extend it: unread + pinned = sticky, read + unpinned = auto-archive after 48h with a visible archive view. Analogous for `ConvoyBoard`: landed convoys archive automatically; current convoys stay. Removes the "too full" failure mode.

---

## Pattern priority list (top 10 for SpectralSet)

Ranked by leverage — "how much operator pain does this remove per engineering week spent" — with the caveat that some are cheap and some are big.

1. **Cmd-K command bar with verb-object phrasing (Linear §1.1 / Raycast §2.1 / Cron §5.5 / Arc §6.3).** Four of six apps converge here. Replaces a forest of buttons with one entrypoint and cements the keyboard-first identity. Single most leverage in the catalog.

2. **Row-level quick actions on focused object (Raycast §2.2 / Linear §1.2).** Secondary `Cmd-K` scoped to the focused row — peek / nudge / mail / nuke — turns AgentCVPanel and ConvoyBoard from browsers into operator consoles.

3. **Today view as the default landing (Things §3.4).** Opening the app to "polecats needing you + MRs awaiting decision + pinned mail" is a free product moment. Requires only composing existing data.

4. **Presence indicators on every agent avatar (Slack §4.5).** We already compute polecat state; exposing it as a glance-level dot across AgentCVPanel / PolecatRow / sidebar is low-effort, high-value.

5. **Unread-vs-mention badge split (Slack §4.1).** Distinguishes "activity happened" from "you're needed" on MailPanel and GastownSidebarSection. Dot vs. red number. Removes the #1 triage question.

6. **Quick-capture with natural-language parsing (Things §3.5 / Cron §5.4).** One-line `bd create` / `gt mail` / `escalate` bar that parses `@assignee`, `#label`, `P2`, time tokens. Collapses capture friction to zero.

7. **Inline thread drawer on MailPanel + detail drawer on ConvoyBoard (Slack §4.3 / Cron §5.2).** List-plus-drawer (not list-then-modal) preserves context. ConvoyBoard already does this; extending the pattern to MailPanel and AgentCVPanel standardizes it.

8. **Custom sidebar sections / workspaces (Slack §4.2 / Arc §6.2).** Let users group rigs and save operator layouts ("triage mode", "ship mode"). Scales the sidebar past 5 rigs without redesign.

9. **Empty states that feel like haiku (Things §3.1).** A single afternoon of copy + layout work across MailPanel, ConvoyBoard, AgentCVPanel. Sets the calm-tool tone that differentiates us from the JIRA aesthetic.

10. **Auto-archive with visible archive view (Arc §6.5).** MailPanel auto-archives read + unpinned mail after 48h; ConvoyBoard archives landed convoys. Removes the "too full to scan" failure mode that emerges at ~2 weeks of real use.

**Honorable mentions** that barely missed the top 10: grouped collapsible lists (Linear §1.3), deferred-until on beads (Things §3.2), hover-preview for agent cards (Arc §6.4), typography-only section headers (Things §3.3).

---

*End of DISC-A4 inspiration catalog. Next step: Phase B selects 3–4 of the top-10 patterns and produces design specs.*
