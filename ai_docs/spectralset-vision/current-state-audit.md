# SpectralSet Current-State Audit (DISC-A2 / ss-urc)

**Bead**: ss-urc · **Polecat**: spectralSet/polecats/onyx · **Date**: 2026-04-20
**Scope**: `apps/desktop` — every route reachable from the Electron shell.

## 0. Caveat — static audit, not live dogfood

The original brief called for running SpectralSet and walking every page with
screenshots. The polecat sandbox this audit ran in is headless: no display
server, no Playwright bridge, no agent-browser MCP. Runtime capture was
impossible.

This audit is instead a **rigorous static read of every route file** in
`apps/desktop/src/renderer/routes/**` plus the primary components each route
mounts. Findings cite file paths so an operator can verify any claim. Known
bugs filed as beads (ss-7mt, ss-c4r) are called out where code still shows
the shape of the fix. Screenshots must be captured by an operator with
desktop access — see `screenshots/README.md`.

"What's broken" here means one of: handler is missing, state is hardcoded,
a TODO marker indicates an unfinished path, a disabled control ships with
no enabler, or a consumer expects a field the producer never populates.
"Runtime crash" claims are not made — that would require actually running.

---

## 1. TL;DR for Phase B

1. **The Gas Town panels are the most finished surface** in the app. Agent
   CV, Convoy board, Mail inbox all render real tRPC data with live polling.
   Compose/Nudge dialogs send real commands. Empty states exist.

2. **The workspace routes are split-brain.** Two parallel stacks coexist:
   the legacy `_dashboard/workspace/$workspaceId` (hotkey-heavy,
   Zustand tabs store) and the v2 `_dashboard/v2-workspace/$workspaceId`
   (live queries, `@spectralset/panes` Workspace component). Neither
   supersedes the other yet; routing is gated on the `V2_CLOUD_ACCESS`
   feature flag and `useIsV2CloudEnabled` scattered across settings.

3. **Settings is feature-flag swiss cheese.** Projects/Agents/API Keys/
   Billing all exist and work; Cloud secrets and V2 presets redirect or
   hide based on `FEATURE_FLAGS.CLOUD_ACCESS`. There is no visible
   indication to the user that a section was hidden because of flags.

4. **The landing experience is inconsistent.** `/` redirects to
   `/workspace`, which either restores last workspace or (if none) sends
   to `/welcome`. `/workspace` itself only ever renders a spinner.
   `/settings` redirects to `/settings/account`. `/settings/presets` is a
   legacy redirect to `/settings/terminal`. The user can land on three
   different "empty" states depending on entry path.

5. **Mail "Mark read" is disabled with an inline P5-C ship note.** It's
   the most visible piece of deliberate incompleteness in the app.
   `MailPanel.tsx:251-256`.

---

## 2. Routes

File paths are relative to `apps/desktop/src/renderer/routes/`.

### `/` — root index

- **File**: `page.tsx:1-10`
- **Screenshot**: `screenshots/root-index.png`
- **What works**: `<Navigate to="/workspace" replace />`. No UI of its own.
- **What's broken**: nothing — it's a hop.
- **What's empty**: the route has no loading state because it has no data.
- **What's confusing**: the URL bar flashes `/` then `/workspace` then
  (usually) `/workspace/$workspaceId`. Three redirects deep on cold start.

### `/sign-in` — auth gate

- **File**: `sign-in/page.tsx`
- **Screenshot**: `screenshots/sign-in.png`
- **What works**: GitHub + Google OAuth buttons (`signIn('github')` /
  `signIn('google')`). Session recovery via `useSessionRecovery` — if a
  local token exists, the button subtext becomes "Restoring your session".
  Already-signed-in users redirect to `/workspace`. Dev bypass
  (`env.SKIP_ENV_VALIDATION`) skips the page entirely.
- **What's broken**: nothing detectable statically.
- **What's empty**: no email/password fallback, no SSO, no magic link —
  GitHub and Google are the entire auth surface.
- **What's confusing**: heading says "Welcome to **Superset**" while the
  product is branded "SpectralSet" elsewhere (and the logo component is
  `SpectralSetLogo`). Internal rebrand drift. Filed as follow-up candidate.

### `/create-organization` — post-signup forced step

- **File**: `create-organization/page.tsx`
- **Screenshot**: `screenshots/create-organization.png`
- **What works**: name field → slug auto-derived with live
  `authClient.organization.checkSlug` (500ms debounce), inline
  Available/Taken badge. Form is zod-validated. On submit, creates via
  `apiTrpcClient.organization.create`, sets active org, navigates to `/`.
  Sign-out escape hatch top-right. Unauthenticated users redirect to
  `/sign-in`; users with an active org skip the page.
- **What's broken**: the slug regex chain (`^[a-z0-9-]+$`, `^[a-z0-9]`,
  `[a-z0-9]$`) is correct but surfaces three separate error messages —
  typing `-foo` and then `foo-` shows two different messages back-to-back.
  Minor polish.
- **What's empty**: no "invite teammates" step, no template/starter
  selection — creating an org dead-ends into `/`.
- **What's confusing**: "Create Organization" is the only option for a
  first-time user. Solo users are forced to invent an organization name.
  No "skip / personal account" affordance.

### `/_authenticated/_onboarding/welcome`

- **File**: `_authenticated/_onboarding/welcome/page.tsx` → renders
  `screens/main/components/StartView`. StartView is an `ActionCard` grid.
- **Screenshot**: `screenshots/welcome.png`
- **What works**: rendered when `workspaces/page.tsx` detects zero
  workspaces and redirects here. No sidebar/topbar per the comment in the
  parent route loader.
- **What's broken**: the action cards' underlying `StartView` was not
  re-read line-by-line in this audit pass — the route-level glue is one
  line (`return <StartView />`) so UX content lives elsewhere. Treat as a
  second-pass target.
- **What's empty**: depends on StartView internals.
- **What's confusing**: the fact that this route lives under `_onboarding`
  but is the *default first view* for any user with zero workspaces
  (including returning users who have deleted them all).

### `/_authenticated/_onboarding/new-project`

- **File**: `_authenticated/_onboarding/new-project/page.tsx`
- **Screenshot**: `screenshots/new-project.png`
- **What works**: three-mode picker (Empty / Clone / Template) with icons
  and descriptions. `PathSelector` auto-fills to `~/.spectralset/projects`.
  Each mode swaps in its own tab component. Back button returns to `/`.
  Dismissible inline error banner.
- **What's broken**: nothing visible from the page.tsx itself; depth
  depends on EmptyRepoTab/CloneRepoTab/TemplateTab.
- **What's empty**: no post-creation flow shown here — modes presumably
  navigate away.
- **What's confusing**: parent dir defaults to `~/.spectralset/projects`
  but the label is "Parent directory" not "Where to create". A user
  expecting to clone into `~/code` has to edit the field.

### `/_authenticated/gastown/agents` — Agent CV panel

- **File**: `gastown/agents/page.tsx` + `components/Gastown/AgentCVPanel/{AgentCVPanel,AgentDetailDrawer}.tsx`
- **Screenshot**: `screenshots/gastown-agents.png`
- **What works**:
  - Agent cards for all agents returned by `gastown.agents.list`, grouped
    by Mayor/Deacon/Boot then by rig (polecats/witness/refinery/crew).
    Emoji per kind (`AgentCVPanel.tsx:13-21`), state badges with 5s
    polling (`AgentCVPanel.tsx:101-107`), unread-mail pill per card.
  - Detail drawer on click: kind/role/address/session, current hookBead,
    active MR, branch, cleanup status, last completion time, recent
    history table, raw metadata collapsible, Copy session + Open in
    terminal actions.
  - `townPath` threading per ss-7mt: renderer resolves override ||
    probe.townRoot || undefined before calling `agents.list`
    (`AgentCVPanel.tsx:96-100`).
  - Traffic-light safe area per ss-c4r: drag bar with 88px left padding
    on macOS (`gastown/agents/page.tsx:13-17`).
- **What's broken**: nothing detectable — the known ss-7mt and ss-c4r
  fixes are in code.
- **What's empty**:
  - "Recent completions" on cards never populates unless the backend
    (`gastown.agents.get`) supplies `recentCompletions`. The AgentDetail
    type defines the field; whether `list` returns it was not verified
    in backend code during this audit. The drawer hides the section if
    the array is empty (`AgentDetailDrawer.tsx:91`). If consistently
    empty, the panel looks like a stub.
  - No bulk actions (nuke, peek, send mail) from the panel — only the
    per-card detail drawer has Copy session + Open in terminal.
- **What's confusing**:
  - `STATE_BADGE_CLASS` renders `nuked` with a line-through in muted
    colour — which reads like "dead/failed" even when a polecat landed
    work cleanly before being nuked as part of `gt done`. Mentioned in
    the bead brief as an expected finding.
  - Grouping puts Mayor/Deacon/Boot at top, then rigs alphabetically.
    Inside a rig, polecats are sorted working-first. No way to pin the
    rig the user is actively working in.
  - Session column (`agent.session`) is shown in mono 10px on the card;
    on narrow layouts it truncates with no tooltip.

### `/_authenticated/gastown/convoys` — Convoy board

- **File**: `gastown/convoys/page.tsx` + `components/Gastown/ConvoyBoard/ConvoyBoard.tsx`
- **Screenshot**: `screenshots/gastown-convoys.png`
- **What works**:
  - Two-pane layout: list on left (w-80), detail on right. Switch toggles
    "Show closed" which flips `{ all: showAll }` on
    `gastown.convoys.list`. 10s refetch interval.
  - Per-convoy row: status badge (open/in_progress/closed/blocked),
    title, `completed/total` counter, relative time. Selected state
    highlighted.
  - Detail view: title + status + id + created relative time, progress
    bar, tracked-issues table (ID/Title/Status/Type/Dep + copy-ID button).
  - Empty state: "No open convoys." Error state: "Failed to load convoys.
    Is Gas Town running?" Loading: "Loading…"
- **What's broken**: nothing detectable.
- **What's empty**:
  - No affordance to create/land a convoy. `gt convoy create` and
    `gt convoy land` exist in the CLI but the UI is read-only.
  - Tracked-issues table has no link-out to the bead — ID is copyable but
    clicking it just copies; there's no "open in beads viewer" because
    no such view exists.
- **What's confusing**:
  - `progressCounts` silently falls back from `c.total ?? c.tracked.length`
    and from `c.completed ?? fromTracked`. If backend returns `null` for
    both while `tracked` is populated, the counts are computed client-side
    — fine, but the display jumps if the backend fills them in on a later
    poll.
  - `resolvedSelectedId` falls back to `convoys[0]?.id` when the selected
    convoy is filtered out (e.g. by flipping the Show-closed switch).
    User sees detail view silently shift to a different convoy without a
    selection change.

### `/_authenticated/gastown/mail` — Gas Town Mail

- **File**: `gastown/mail/page.tsx` + `components/Gastown/MailPanel/{MailPanel,ComposeMailDialog,AddressPicker}.tsx`
- **Screenshot**: `screenshots/gastown-mail.png`
- **What works**:
  - Inbox list for the selected address. Compose button opens dialog.
    AddressPicker dropdown populated from probe: `mayor/` plus
    `<rig>/refinery` and `<rig>/witness` for every detected rig
    (`AddressPicker.tsx:23-37`). 15s probe refetch, 10s inbox refetch.
  - Per-message row: unread dot (primary colour) / urgent dot (red),
    from, relative timestamp, priority badge, type, subject preview.
  - Detail pane: subject, from, to, timestamp, priority + type badges,
    Copy body button. Body rendered in a mono `<pre>` with wrap.
  - Compose dialog (`ComposeMailDialog.tsx`): To (autocomplete via
    `<datalist>`), Subject, Body (8-row mono Textarea), Priority (5
    options), Type (4 options), Pinned checkbox with "survives recipient
    session resets" helper. Zod-style regex validation
    (`ADDRESS_PATTERN = /^[^/]+\/[^/]*$/`). Invalidates the inbox query
    on success. Error surfaces inline.
- **What's broken**:
  - **Mark read is hard-disabled** (`MailPanel.tsx:247-256`):
    `disabled title="Mark-as-read ships in P5-C"`. This is the single
    most visible piece of "coming soon" in the product. A user will hit
    this on their first mail read.
- **What's empty**:
  - No reply action. The user must manually construct a reply via
    Compose, re-typing `to`, `subject`, thread context.
  - No search, no filter beyond `unreadOnly: false` (hardcoded) — the
    prop exists on the `mail.inbox` call but there's no UI toggle.
  - No delete, no archive, no thread view.
  - AddressPicker only lists refinery/witness/mayor. Polecat inboxes
    are not listed — you can't switch to
    `spectralSet/polecats/onyx` inbox from the dropdown. Comment at
    `AddressPicker.tsx:18-22` acknowledges: "`gt mail directory` would
    be richer but this covers the core addresses for P5-B."
- **What's confusing**:
  - The "To" field on compose accepts anything matching
    `^[^/]+\/[^/]*$` — including typos like `mayor//` (empty name half
    passes the regex since `[^/]*` allows zero chars). No validation
    against actually-existing addresses.
  - Inbox defaults to `mayor/` on mount — for a polecat-first user, the
    first view is always Mayor's inbox, not their own.

### `/_authenticated/_dashboard/workspaces` — workspaces list

- **File**: `_authenticated/_dashboard/workspaces/page.tsx` →
  `screens/main/components/WorkspacesListView/WorkspacesListView.tsx`
- **Screenshot**: `screenshots/workspaces-list.png`
- **What works**: route file is a one-liner that delegates to
  `WorkspacesListView`. The route itself mounts cleanly.
- **What's broken**: not inspected in this pass — depth lives in
  `WorkspacesListView.tsx`.
- **What's empty**: n/a at route level.
- **What's confusing**: coexists with `/v2-workspaces` (see below). Two
  list views, same data, different feature gates.

### `/_authenticated/_dashboard/workspace` — workspace index redirector

- **File**: `_authenticated/_dashboard/workspace/page.tsx`
- **Screenshot**: `screenshots/workspace-redirect.png` (spinner only)
- **What works**: fetches `workspaces.getAllGrouped`. If zero workspaces
  redirect to `/welcome`. Otherwise restore `lastViewedWorkspaceId` from
  localStorage, or fall back to first workspace. Always renders
  `<LoadingSpinner />` while the effect runs.
- **What's broken**: if `workspaces` resolves but is empty **and**
  `isLoading=true` transiently during a refetch, the page shows a
  spinner instead of firing the navigate. Harmless but makes QA flaky.
- **What's empty**: the route has no UI — user sees only a spinner.
- **What's confusing**: the entire route exists to pick a destination.
  Every other product uses `/` for this; SpectralSet uses `/workspace` as
  a router-side picker, with `/` doing its own redirect to `/workspace`.

### `/_authenticated/_dashboard/workspace/$workspaceId`

- **File**: `_authenticated/_dashboard/workspace/$workspaceId/page.tsx`
  (large — 579 lines)
- **Screenshot**: `screenshots/workspace-detail.png`
- **What works**:
  - Loader prefetches `workspaces.get` and throws `notFound()` on a
    "not found" error so the 404 page renders.
  - Search params `tabId` / `paneId` drive activation (used for
    notification-click deep-links, `page.tsx:107-123`).
  - Gas Town auto-attach: if workspace has `gastownRig` +
    `gastownPolecatName` and a `tmuxSocket` is present, the page
    auto-attaches a terminal tab once per workspace (ref-guarded,
    page.tsx:134-189, cites ss-spl).
  - Workspace initializing / failed / resumable-after-restart view
    (`WorkspaceInitializingView`) for new or broken worktrees.
  - 20+ hotkeys wired (tabs, panes, splits, focus, PR open, Quick Open,
    Copy path, prev/next workspace).
  - UnsavedChangesDialog flow before closing a dirty tab.
- **What's broken**: nothing statically visible.
- **What's empty**:
  - `WorkspaceLayout` itself is not inspected here; features like
    changes sidebar, presets bar etc. are behind that component.
- **What's confusing**:
  - Two split layouts coexist (via hotkeys `SPLIT_AUTO`, `SPLIT_RIGHT`,
    `SPLIT_DOWN`, `SPLIT_WITH_CHAT`, `SPLIT_WITH_BROWSER`) — the "split
    with chat" path hardcodes `paneType: "chat"`, which suggests the
    chat pane is a first-class pane kind; unclear from the route
    whether every surface is wired for it.
  - `defaultExternalApp` falls back to `"cursor"` hardcoded
    (`page.tsx:354`). Users without Cursor installed still get "Open in
    Cursor" as the default shortcut.

### `/_authenticated/_dashboard/v2-workspaces` — v2 list

- **File**: `_authenticated/_dashboard/v2-workspaces/page.tsx`
- **Screenshot**: `screenshots/v2-workspaces-list.png`
- **What works**: resets filter store on every mount (noted:
  "otherwise zustand singleton would carry over a stale search/device
  filter"). Splits results into `pinned` / `others`. Header + list
  components delegate layout.
- **What's broken**: not visible at route level; depth in
  `V2WorkspacesList`.
- **What's empty**: `hasAnyAccessible` empty state handled in list
  component.
- **What's confusing**: presence of both `/workspaces` and
  `/v2-workspaces` with no user-facing toggle. Which one appears in the
  sidebar depends on `useIsV2CloudEnabled` feature flag.

### `/_authenticated/_dashboard/v2-workspace/$workspaceId`

- **File**: `_authenticated/_dashboard/v2-workspace/$workspaceId/page.tsx`
  (451 lines)
- **Screenshot**: `screenshots/v2-workspace-detail.png`
- **What works**:
  - Live-queries the workspace row from a local `@tanstack/react-db`
    collection; falls back to `WorkspaceNotFoundState` on absence.
  - Pane system via `@spectralset/panes`: file / diff / terminal / chat /
    browser / comment pane kinds, pane actions (split, close), context
    menu.
  - Presets bar (`V2PresetsBar`), quick-open palette, recently-viewed
    files. `onBeforeCloseTab` wires a full Save-All / Don't-Save / Cancel
    alert for dirty files.
  - Right sidebar (`WorkspaceSidebar`) toggle via
    `localWorkspaceState.rightSidebarOpen`.
- **What's broken**: static read does not reveal runtime issues.
- **What's empty**: n/a at route level.
- **What's confusing**: user has to understand this is the "v2" page —
  the route path `v2-workspace` leaks the implementation generation into
  the URL.

### `/_authenticated/_dashboard/pending/$pendingId`

- **File**: `_authenticated/_dashboard/pending/$pendingId/page.tsx`
  (542 lines) + helpers `buildForkAgentLaunch.ts`, `buildIntentPayload.ts`,
  `buildSetupPaneLayout.ts`, `dispatchForkLaunch.ts`.
- **Screenshot**: `screenshots/pending-workspace.png`
- **What works**:
  - Dispatch hub for three workspace-create intents (fork / checkout /
    adopt) plus a fourth `pr-checkout` variant. Single fire-once effect
    on mount; retry on failure. Polls `workspaceCreation.getProgress`
    every 500ms for fork + checkout; adopt shows a generic spinner.
  - Stalled-create detection at 2min → "This is taking longer than
    expected…" amber label.
  - Sync-timeout fallback at 10s after success (`syncTimedOut`): offers
    Keep waiting / Open anyway / Dismiss. Covers the adopt fast-path
    race with Electric sync.
  - Failed state shows error text (select-text, cursor-text — i.e.
    copy-friendly) with Retry and Dismiss buttons.
  - Per-row attachment cleanup (`clearAttachments(pendingId)`) on
    success, dismiss, and retry handling.
- **What's broken**:
  - Progress steps for `adopt` are intentionally omitted
    (`intentHasProgress` is false for adopt). User sees only a pulsing
    dot — no indication of what phase adopt is in. Acceptable if adopt
    is always fast; if not, user has no signal.
- **What's empty**:
  - No per-step elapsed time. Stale threshold is blanket 2 minutes for
    all three intents.
- **What's confusing**:
  - Success state immediately starts a 1-second timer to delete the
    pending row (`page.tsx:340-342`). If Electric sync takes longer
    than a second to land the workspace row, the row disappears while
    the page is still showing "Workspace ready — opening…" on some
    setups. The 10s sync timeout handles the other direction but the
    deletion countdown is eager.

### `/_authenticated/_dashboard/tasks` + `/$taskId`

- **Files**: `tasks/page.tsx` (delegates to `TasksView`), `tasks/$taskId/page.tsx`
- **Screenshot**: `screenshots/tasks-list.png` + `screenshots/tasks-detail.png`
- **What works** (detail):
  - Live-query task + status + assignee + creator from collections.
    Accepts both UUID and slug in the `$taskId` param
    (`page.tsx:41-44` regex check).
  - Fallback `useQuery` on `task.byId` or `task.bySlug` if local live
    query misses (cloud sync lag). "Syncing task..." vs "Loading
    task..." vs "Task not found" depending on state.
  - Editable title + markdown description, activity section, properties
    sidebar, delete-then-navigate flow.
  - Escape key back-navigates to `/tasks` preserving tab/assignee/search
    query params (`useEscapeToNavigate`).
- **What's broken**:
  - `task.creator` / `task.assignee` are coerced through a
    `typeof task.assignee?.id === "string"` guard — if the join
    produces a partial object (as left joins can), the code silently
    drops the assignee. No error surfaced to the user.
- **What's empty**:
  - Activity section only shows a creation entry — `ActivitySection` is
    given only `createdAt / creatorName / creatorAvatarUrl`. No status
    changes, comments, assignments, or mentions surface here despite
    there being an `ActivitySection` component.
- **What's confusing**:
  - List route delegates entirely to `TasksView` without declaring a
    layout route — the search-param wiring lives in an adjacent
    `layout.tsx`. Not audited in this pass.

### `/_authenticated/_dashboard/project/$projectId` — new-workspace wizard

- **File**: `project/$projectId/page.tsx` (728 lines)
- **Screenshot**: `screenshots/project-new-workspace.png`
- **What works**:
  - Two-step wizard: (1) task title + branch name + base-branch advanced
    options, (2) setup script (checklist or custom mode) + optional
    teardown.
  - Branch name auto-derives from title via `sanitizeSegment` and
    `authorPrefix` from `projects.getGitAuthor`.
  - Setup "checklist" mode renders suggested actions from
    `config.getSetupOnboardingDefaults`; "custom" mode is a textarea
    with the variables (`$SPECTRALSET_ROOT_PATH`, `$SPECTRALSET_WORKSPACE_PATH`,
    `$SPECTRALSET_WORKSPACE_NAME`) documented inline.
  - Gas Town reconcile side effect: on mount, if `probe.townRoot ===
    project.mainRepoPath` and there are rigs, the page fires
    `gastown.reconcile` for each rig once per project
    (`page.tsx:173-198`).
  - `ExternalWorktreesBanner` warns if other tools are using the project.
- **What's broken**:
  - `parseConfigContent` silently swallows JSON parse errors
    (`page.tsx:102-117`). If config is corrupt, the wizard shows the
    checklist defaults — user has no idea their customizations are lost.
  - The default-branch ribbon only shows for the *currently selected*
    branch; when the popover opens, the default branch pill only
    appears on the default row. If user picks a non-default, the pill
    vanishes from the trigger.
- **What's empty**:
  - Checklist with zero detected actions shows a fallback "Couldn't
    detect a package manager or environment config" card with Add
    commands / Skip buttons. Good.
- **What's confusing**:
  - "Workspace" here is the git-worktree-backed sandbox, but elsewhere
    "workspace" refers to either the v2 workspace or the legacy panel
    layout. The noun is overloaded three ways.

### `/not-found`

- **File**: `not-found.tsx` (not read in this pass — referenced by
  `__root.tsx`).
- **Screenshot**: `screenshots/not-found.png`
- **What works**: wired as the `notFoundComponent` on the root route and
  on the workspace detail loader.
- **What's broken**: content not audited.
- **What's empty**: n/a.
- **What's confusing**: n/a.

---

## 3. Settings

All settings route files follow the same ~20-line pattern: read
`useSettingsSearchQuery`, compute `visibleItems`, render a single
`<XxxSettings>` component. Only the last section ("Keyboard shortcuts")
breaks this pattern — the route itself owns the UI.

### `/settings` (index)

- `settings/page.tsx` → `<Navigate to="/settings/account" replace />`. Hop.

### `/settings/account`

- **File**: `settings/account/components/AccountSettings/AccountSettings.tsx`
- **Screenshot**: `screenshots/settings-account.png`
- **What works**: name input, avatar upload via `window.selectImageFile`
  → `apiTrpcClient.user.uploadAvatar`, sign-out button, profile skeleton.
- **What's empty**: no password, no delete-account, no session list
  (see `/settings/terminal` Sessions section for per-terminal sessions
  but none for auth).
- **What's confusing**: `nameValue` and `avatarPreview` are seeded from
  user data via useEffect but not obviously persisted on blur — needs
  depth read of `AccountSettings.tsx` (only top 80 lines audited).

### `/settings/agents`

- **File**: `settings/agents/components/AgentsSettings/AgentsSettings.tsx`
- **Screenshot**: `screenshots/settings-agents.png`
- **What works**: list of `AgentCard` rendered from
  `settings.getAgentPresets`. Each card surfaces "enabled", "commands",
  "task prompts" (all gated on the settings search filter via
  `isItemVisible`).
- **What's empty**: empty-state text is just "Loading agent settings..."
  while `isLoading`; no explicit "no agents configured" state. If
  `presets` is an empty array the page shows an empty `<div>` + title.
- **What's confusing**: "Agents" here means chat-agent presets (Claude /
  Gemini / Codex preset launch configs), not Gas Town agents. Naming
  collides with the Gas Town panel at `/gastown/agents`.

### `/settings/api-keys`

- **File**: `settings/api-keys/components/ApiKeysSettings/ApiKeysSettings.tsx`
- **Screenshot**: `screenshots/settings-api-keys.png`
- **What works**: list of API keys (live-queried from collection),
  generate dialog, "new key" dialog that shows the raw key once with a
  copy button, delete with confirm. Empty state not audited (bottom
  portion not read).
- **What's empty**: bulk regenerate / rotate buttons absent by my read
  of the top 80 lines.
- **What's confusing**: Gas Town has no API key surface — these keys
  are for the cloud API only. User has to know which surface they're
  configuring.

### `/settings/appearance`

- **File**: `settings/appearance/components/AppearanceSettings/AppearanceSettings.tsx`
- **Screenshot**: `screenshots/settings-appearance.png`
- **What works**: four sections with auto-separators — Theme (light/dark
  + custom), Markdown style, Editor font, Terminal font. Each section is
  its own component owning its own queries.
- **What's empty**: no UI density / scaling control. No icon-pack
  options.
- **What's confusing**: heading subtitle is "Customize how **Superset**
  looks on your device." Rebrand drift.

### `/settings/behavior`

- **File**: `settings/behavior/components/BehaviorSettings/BehaviorSettings.tsx`
- **Screenshot**: `screenshots/settings-behavior.png`
- **What works**: Confirm-on-quit toggle, Telemetry toggle (marked
  `TODO: remove telemetry query/mutation/handler once telemetry
  procedures are removed`, line 69), File open mode select, Resource
  monitor toggle, Open-links-in-app toggle. Each mutation is optimistic
  with rollback on error.
- **What's broken**:
  - Telemetry section carries a `TODO` to remove — it's already been
    decided to remove but not removed (`BehaviorSettings.tsx:69`,
    `console.log("[settings/telemetry] Toggling to:", enabled)` still
    shipping).
- **What's empty**: default new-window behaviour, default workspace
  sort order, and similar "workflow preferences" do not live here — the
  section is five toggles plus a select.
- **What's confusing**: a settings page named "Behavior" vs one named
  "Appearance" vs "Terminal" — the split of what goes where is not
  obvious (e.g. "Link behavior" lives under Terminal, not Behavior).

### `/settings/billing` + `/settings/billing/plans`

- **Files**: `settings/billing/components/BillingOverview/BillingOverview.tsx`
  and `settings/billing/plans/page.tsx`
- **Screenshot**: `screenshots/settings-billing.png` + `screenshots/settings-billing-plans.png`
- **What works**:
  - Billing overview: current plan card (derived from
    `subscriptions` collection, not session — comment notes session can
    be stale), BillingDetails, RecentInvoices, UpgradeCard. Upgrade
    opens Stripe in a new window via `disableRedirect: true +
    ctx.data.url`.
  - Plans page: three-column comparison (Free / Pro / Enterprise) with
    feature matrix hardcoded in `COMPARISON_SECTIONS`. Yearly/monthly
    toggle, current-plan detection, downgrade + restore flows.
    Enterprise CTA opens `mailto:founders@superset.sh`.
- **What's broken**:
  - `currentlyYearly` detection uses `differenceInDays(periodEnd,
    periodStart) > 60` — a 30-day trial of an annual plan would
    misclassify as monthly for 30 days.
- **What's empty**:
  - "Cloud workspaces" and "Mobile app" listed under Pro with "Coming
    Soon" pill. Shipping placeholder content.
  - No seat-level billing detail (memberCount is computed but only
    shown to the upgrade call).
- **What's confusing**:
  - "Price per user/month" is the same string for monthly and yearly
    Pro (`"per user/month"`). Only the number (`$20` vs `$15`) differs.
    A user doesn't see that yearly is billed annually up-front — that
    lives in the "Billed yearly" sublabel.

### `/settings/git`

- **File**: `settings/git/components/GitSettings/GitSettings.tsx`
- **Screenshot**: `screenshots/settings-git.png`
- **What works**: Delete-local-branch toggle (optimistic mutation),
  Branch prefix select (modes + custom), Worktree location picker.
- **What's empty**: no SSH key / signing / identity settings here — git
  author probably surfaces via the project settings wizard instead.
  No way to set a default commit message template.
- **What's confusing**: "Branch prefix" custom mode writes to a mutation
  that takes `customPrefix: customPrefixInput || null` — passing empty
  string as `null` works but is implicit.

### `/settings/integrations`

- **File**: `settings/integrations/components/IntegrationsSettings/IntegrationsSettings.tsx`
  + `GastownCard/GastownCard.tsx`
- **Screenshot**: `screenshots/settings-integrations.png`
- **What works**:
  - Gastown card (always first, even for no-org users): install probe,
    enabled Switch, Town path override input (auto-fills from probe
    once per session, guarded by `autoFilledRef`), install instructions
    link when CLI missing, `GastownRigList` when enabled + installed.
  - Linear / GitHub / Slack cards: connected badge from collection or
    `apiTrpcClient.integration.github.getInstallation` query. Manage
    button opens `/integrations/<provider>` in the web app. Slack is
    gated behind `FEATURE_FLAGS.SLACK_INTEGRATION_ACCESS` AND the
    settings-search visibility — invisible until both are true.
- **What's broken**:
  - GitHub installation suspension renders as "Not Connected" even
    though the install still exists (`isGithubConnected = !!installation
    && !suspended`). User who suspended the install sees "Connect"
    again — re-installing is the only remediation, with no hint that
    their existing install is merely paused.
- **What's empty**:
  - No inline connect flow — every non-Gastown provider redirects to
    the web app. Desktop app can't complete the connection itself.
- **What's confusing**:
  - No-org user sees the Gastown card + a "Join or create an
    organization…" paragraph. Gastown is local-first so this is
    correct, but the layout (Gastown card floating above an org-nag
    line) is jarring.

### `/settings/keyboard`

- **File**: `settings/keyboard/page.tsx` (route owns UI directly, 310 lines)
- **Screenshot**: `screenshots/settings-keyboard.png`
- **What works**: categorized hotkey table (Navigation / Workspace /
  Terminal / Layout / Window / Help), click-to-record rows, conflict
  dialog offering reassign, "Reset all" button. Search bar filters by
  label. Reserved-chord warnings via `useRecordHotkeys.onReserved`.
- **What's empty**: no export/import of keybindings, no
  presets/profiles.
- **What's confusing**: empty "Command" column header is actually "what
  the hotkey does" — elsewhere "command" refers to terminal commands or
  the command palette.

### `/settings/models`

- **File**: `settings/models/components/ModelsSettings/ModelsSettings.tsx`
- **Screenshot**: `screenshots/settings-models.png`
- **What works** (top 100 lines read): Anthropic + OpenAI provider
  sections with OAuth dialogs, API key inputs, env config, diagnostic
  statuses from `modelProviders.getStatuses`. Two collapsibles (API
  keys, Override). Settings visibility filters hide each provider
  independently.
- **What's empty**: Google / Vertex / Azure / local model providers
  have no surface. Anthropic + OpenAI are the entire model layer.
- **What's confusing**: two forms of Anthropic config (API key and env
  config). Docs for when each applies are not on the page.

### `/settings/organization`

- **File**: `settings/organization/components/OrganizationSettings/OrganizationSettings.tsx`
  (462 lines; top 80 read)
- **Screenshot**: `screenshots/settings-organization.png`
- **What works**: org logo + name + slug dialog, member table via
  `@tanstack/react-db` live query, member actions (owner-gated), pending
  invitations section.
- **What's empty**: top read does not cover quota / usage / limits. Not
  evaluated whether audit-log / deletion flows exist.
- **What's confusing**: `isOwner` is derived from
  `activeOrg.members.find(m => m.userId === currentUserId)?.role ===
  "owner"` — admin-role users have no visible UI differentiation from
  viewer-role.

### `/settings/permissions`

- **File**: `settings/permissions/components/PermissionsSettings/PermissionsSettings.tsx`
- **Screenshot**: `screenshots/settings-permissions.png`
- **What works**: five macOS permissions (Full Disk Access, Accessibility,
  Microphone, Automation/Apple Events, Local Network). Status polls
  every 2s. "Granted" pill when true; always-enabled "Edit in System
  Settings" button as the remediation path.
- **What's broken**:
  - Automation and Local Network have `granted={undefined}` hardcoded
    (`PermissionsSettings.tsx:121-134`) — i.e. the UI never shows
    "Granted" for those two even if they are. The underlying
    `permissions.getStatus` likely doesn't return them; either the
    backend is missing those checks or the UI gave up wiring them.
- **What's empty**: no per-permission "why does this matter" expander
  beyond the one-line description.
- **What's confusing**: "Edit in System Settings" always opens the same
  macOS pane — mutations call different procedures (`requestFDA`,
  `requestA11y`, etc.) that presumably open pre-scoped panes, but the
  button label is the same for all.

### `/settings/presets` — redirect

- **File**: `settings/presets/page.tsx` → `<Navigate to="/settings/terminal"
  search={{ editPresetId: editPresetId ?? presetId }} replace />`.
- **Screenshot**: n/a (redirect)
- **What works**: legacy URL support.
- **What's empty**: the entire "Presets" concept now lives under
  Terminal — no sidebar entry for it any more.
- **What's confusing**: product docs / hotkeys mentioning "Presets" may
  still link here. Tolerable but discoverability bug if users link-share.

### `/settings/project/$projectId` + `/general` + `/cloud` + `/cloud/secrets`

- **Files**: `settings/project/$projectId/page.tsx` (redirect to general),
  `general/page.tsx`, `cloud/page.tsx`, `cloud/secrets/page.tsx`.
- **Screenshot**: `screenshots/settings-project-general.png`,
  `settings-project-cloud-secrets.png`.
- **What works**:
  - `/project/$projectId` redirects to `/general`.
  - `/general` loads via route loader (preloads both project and
    config), renders `ProjectSettings` component.
  - `/cloud` checks `FEATURE_FLAGS.CLOUD_ACCESS` — redirects to
    `/general` if off, `/cloud/secrets` if on.
- **What's broken**: the cloud gate is a `<Navigate replace />` —
  users who don't have cloud access, clicking the "Cloud" sidebar item,
  land silently back on "General" with no explanation.
- **What's empty**: project sidebar item for "Cloud" likely only
  renders when the flag is on, but route-level redirect exists as a
  deep-link safety net.
- **What's confusing**: user with partial cloud access could see
  "secrets" but not other cloud subpages — depth not audited here.

### `/settings/projects`

- **File**: `settings/projects/page.tsx`
- **Screenshot**: `screenshots/settings-projects.png`
- **What works**: list via `workspaces.getAllGrouped`, each row is a
  button into `/settings/project/$projectId/general`. Shows color dot,
  name, `mainRepoPath`.
- **What's empty**: empty-state text "No projects yet. Import a
  repository to get started." — but no import button on the page. User
  has to navigate to `/new-project` via some other entry.
- **What's confusing**: uses `workspaces.getAllGrouped` (not
  `projects.list`) to derive the projects. Projects with zero
  workspaces may still appear via `group.project`, but if the
  grouping collapses the project when empty, those projects are
  invisible. Not verified in this pass.

### `/settings/ringtones`

- **File**: `settings/ringtones/components/RingtonesSettings/RingtonesSettings.tsx`
- **Screenshot**: `screenshots/settings-ringtones.png`
- **What works** (top 80 lines read): `RingtoneCard` grid with emoji
  preview, duration badge, play/stop button, select-on-click. Custom
  ringtone ID is handled separately (`CUSTOM_RINGTONE_ID`).
- **What's empty**: custom ringtone upload / recording path not evaluated.
- **What's confusing**: this section exists at all as a top-level settings
  page (between "Models" and "Security" in most sidebar orderings) is
  a priority hint about what the app considers important.

### `/settings/security`

- **File**: `settings/security/components/SecuritySettings/SecuritySettings.tsx`
- **Screenshot**: `screenshots/settings-security.png`
- **What works**: single toggle — "Allow remote workspaces to access
  this device via relay". Confirm dialog before enabling. Optimistic
  update. Toast with restart count ("Restarted N host services" or
  "Setting saved").
- **What's empty**: **one toggle, one input, no validation, no save
  indicator.** (Well, one toggle and no input.) That's the entire
  security settings page. No 2FA, SSH key management, session
  revocation, or audit history here. These presumably live elsewhere or
  nowhere.
- **What's confusing**: the whole page is called "Security" but scopes
  to a single relay toggle.

### `/settings/terminal`

- **File**: `settings/terminal/components/TerminalSettings/TerminalSettings.tsx`
- **Screenshot**: `screenshots/settings-terminal.png`
- **What works**: Presets section (legacy vs V2 via
  `isV2CloudEnabled`), Link behaviour setting, Sessions section. Query
  params `editPresetId` / `pendingCreateProjectId` propagate through
  props for deep-linking.
- **What's empty**: shell / default command / env var config doesn't
  live here. No custom prompt/theme picker beyond appearance.
- **What's confusing**: "Presets" means terminal-tab presets — same
  word also means agent chat presets (under `/settings/agents`). Two
  unrelated things with the same name.

---

## 4. Cross-page gaps and seams

### 4.1 Navigation & landing

- **Four entry points redirect.** `/`, `/workspace` (when empty),
  `/workspace` (when restoring), `/settings`. Each has a different
  spinner / layout during the hop. A cold-launch user sees up to three
  layouts in <500ms.
- **No global breadcrumb.** Settings subpages rely on page titles alone
  (`Organization`, `Projects`, `Project > General`). Nested project
  settings (`/settings/project/$id/cloud/secrets`) have no crumb trail.
- **Sidebar drives most navigation but the routes are deep-linkable.** A
  user who bookmarks `/settings/project/<id>/cloud/secrets` and later
  loses cloud access gets silently redirected with no message.

### 4.2 State badges and terminology consistency

- **Agent state colours are fine, labels aren't.** "Nuked" on a polecat
  that landed work is technically correct and visually reads as
  failure. The bead brief flagged this; the fix is a label + colour
  rule, not a state change.
- **Status badges** across Convoys (`open/in_progress/closed/blocked`)
  and Mail (`urgent/high/normal/low/backlog`) both use
  `STATUS_CLASS` / `priorityBadgeClass` but the palettes are slightly
  different — e.g. `open` on convoys is emerald; mail has no "open".
  No shared design token.
- **"Agent" means three things**: Gas Town agent (mayor/polecat/etc.),
  chat agent preset (Claude/Codex/Gemini launch config),
  `agents.list` backend surface. Settings page name collides with the
  Gas Town sidebar item.

### 4.3 Feature flags and hidden surfaces

- `useIsV2CloudEnabled`, `FEATURE_FLAGS.CLOUD_ACCESS`,
  `FEATURE_FLAGS.SLACK_INTEGRATION_ACCESS` all hide UI. None of these
  surface any "your admin has restricted this" message — they just
  remove elements. Users without the flag never know a feature exists.
- Two workspace implementations (`/workspace/$id` vs `/v2-workspace/$id`)
  coexist with no user-visible toggle. Sidebar chooses one; URL reveals
  which.

### 4.4 Empty states

- Some empty states are specific ("No open convoys.", "Inbox is empty.",
  "No agents."). Others are generic or missing:
  - `/workspace` empty = spinner forever, then redirect to `/welcome`.
  - Tasks detail when not found = "Task not found" (no retry / report).
  - `/settings/projects` empty = paragraph but no CTA.
  - Compose dialog: no "recently used addresses" — every compose is
    cold.

### 4.5 Disabled controls with ship notes

- `MailPanel` "Mark read" button is disabled with
  `title="Mark-as-read ships in P5-C"`. This is the single inline
  ship-tracker leak in the app. Any user will see it within the first
  mail they read.
- Ringtones, Welcome screen, StartView all have depth not examined —
  more of this may exist inside.

### 4.6 Keyboard / accessibility

- Hotkeys are exhaustively wired on the legacy workspace page (20+).
  The v2 workspace page uses `useWorkspaceHotkeys` which may cover
  fewer — not compared line-by-line here.
- Gas Town panels (agents/convoys/mail) have no keyboard navigation
  patterns beyond tab order. No shortcuts to focus inbox, jump to
  Convoys, etc.
- `useHotkey("SHOW_HOTKEYS")` suggests there's a "show all hotkeys"
  overlay — not exercised in this audit.

### 4.7 Error surfaces

- Gastown tRPC failures render "Failed to load X. Is Gas Town
  running?" consistently — good.
- Cloud / Electric sync failures on the pending-workspace page have a
  dedicated amber/stall treatment with recovery buttons — exemplary.
- Other routes have generic toast-on-error or silent fallback (e.g.
  `parseConfigContent` swallowing JSON errors on the new-workspace
  wizard).

### 4.8 Rebrand drift (SpectralSet ↔ Superset)

The product is branded "SpectralSet" in the repo but user-facing copy
says "Superset" in several places:

- `sign-in/page.tsx:57` — "Welcome to Superset"
- `settings/appearance/.../AppearanceSettings.tsx:63` — "Customize how
  Superset looks on your device"
- `settings/permissions/.../PermissionsSettings.tsx:73` — "...for
  Superset"
- Docs URL literals: `docs.superset.sh`, mailto `founders@superset.sh`.

An operator hitting both surfaces within the same session will be
confused about the product name. Filed as a rebrand-sweep candidate.

### 4.9 Coexistence of v1/v2

- `/workspaces` + `/v2-workspaces`
- `/workspace/$id` + `/v2-workspace/$id`
- `PresetsSection` + `V2PresetsSection`

Each pair has a clear successor but no migration UI. Until the v1
surface is removed, the product has two codebases' worth of workspace
UX that users can silently be routed to.

### 4.10 "First 60 seconds" for a new user

Path: sign in → forced `/create-organization` → `/` → `/workspace` (no
workspaces) → `/welcome` → start view → choose new project →
`/new-project` → pick mode → tab-specific flow → create project →
`/settings/project/$id/general` or redirect to project page →
two-step workspace wizard → workspace.

Seven route transitions before a user sees working surface. Each is
justified, but the count is the finding.

---

## 5. Appendix — file index of routes audited

Every route has a `page.tsx` at the listed path. The audit depth was
the route file itself and, where the route mounts a single heavy
component, that component's top 80–120 lines.

| Route | File |
| --- | --- |
| `/` | `routes/page.tsx` |
| `/sign-in` | `routes/sign-in/page.tsx` |
| `/create-organization` | `routes/create-organization/page.tsx` |
| `/_authenticated/_onboarding/welcome` | `routes/_authenticated/_onboarding/welcome/page.tsx` |
| `/_authenticated/_onboarding/new-project` | `routes/_authenticated/_onboarding/new-project/page.tsx` |
| `/_authenticated/gastown/agents` | `routes/_authenticated/gastown/agents/page.tsx` |
| `/_authenticated/gastown/convoys` | `routes/_authenticated/gastown/convoys/page.tsx` |
| `/_authenticated/gastown/mail` | `routes/_authenticated/gastown/mail/page.tsx` |
| `/_authenticated/_dashboard/workspaces` | `routes/_authenticated/_dashboard/workspaces/page.tsx` |
| `/_authenticated/_dashboard/workspace` | `routes/_authenticated/_dashboard/workspace/page.tsx` |
| `/_authenticated/_dashboard/workspace/$workspaceId` | `routes/_authenticated/_dashboard/workspace/$workspaceId/page.tsx` |
| `/_authenticated/_dashboard/v2-workspaces` | `routes/_authenticated/_dashboard/v2-workspaces/page.tsx` |
| `/_authenticated/_dashboard/v2-workspace/$workspaceId` | `routes/_authenticated/_dashboard/v2-workspace/$workspaceId/page.tsx` |
| `/_authenticated/_dashboard/tasks` | `routes/_authenticated/_dashboard/tasks/page.tsx` |
| `/_authenticated/_dashboard/tasks/$taskId` | `routes/_authenticated/_dashboard/tasks/$taskId/page.tsx` |
| `/_authenticated/_dashboard/project/$projectId` | `routes/_authenticated/_dashboard/project/$projectId/page.tsx` |
| `/_authenticated/_dashboard/pending/$pendingId` | `routes/_authenticated/_dashboard/pending/$pendingId/page.tsx` |
| `/_authenticated/settings` (index) | `routes/_authenticated/settings/page.tsx` |
| `/_authenticated/settings/account` | `.../account/page.tsx` |
| `/_authenticated/settings/agents` | `.../agents/page.tsx` |
| `/_authenticated/settings/api-keys` | `.../api-keys/page.tsx` |
| `/_authenticated/settings/appearance` | `.../appearance/page.tsx` |
| `/_authenticated/settings/behavior` | `.../behavior/page.tsx` |
| `/_authenticated/settings/billing` | `.../billing/page.tsx` |
| `/_authenticated/settings/billing/plans` | `.../billing/plans/page.tsx` |
| `/_authenticated/settings/git` | `.../git/page.tsx` |
| `/_authenticated/settings/integrations` | `.../integrations/page.tsx` |
| `/_authenticated/settings/keyboard` | `.../keyboard/page.tsx` |
| `/_authenticated/settings/models` | `.../models/page.tsx` |
| `/_authenticated/settings/organization` | `.../organization/page.tsx` |
| `/_authenticated/settings/permissions` | `.../permissions/page.tsx` |
| `/_authenticated/settings/presets` (→ terminal) | `.../presets/page.tsx` |
| `/_authenticated/settings/project/$projectId` | `.../project/$projectId/page.tsx` |
| `/_authenticated/settings/project/$projectId/general` | `.../project/$projectId/general/page.tsx` |
| `/_authenticated/settings/project/$projectId/cloud` | `.../project/$projectId/cloud/page.tsx` |
| `/_authenticated/settings/project/$projectId/cloud/secrets` | `.../project/$projectId/cloud/secrets/page.tsx` |
| `/_authenticated/settings/projects` | `.../projects/page.tsx` |
| `/_authenticated/settings/ringtones` | `.../ringtones/page.tsx` |
| `/_authenticated/settings/security` | `.../security/page.tsx` |
| `/_authenticated/settings/terminal` | `.../terminal/page.tsx` |

---

## 6. Not audited in this pass (known follow-ups)

- `screens/main/components/StartView/*` — the ActionCard content the
  `/welcome` route actually shows.
- `screens/main/components/WorkspacesListView/*` — the row + delete
  flows.
- Every `page.tsx`-delegated Settings component beyond the top ~80–120
  lines (AccountSettings, ApiKeysSettings, ModelsSettings full 583
  lines, OrganizationSettings full 462 lines, RingtonesSettings full
  341 lines).
- `NudgeDialog`, `NukeConfirmDialog`, `PolecatPeekDrawer`,
  `PolecatRow`, `AgentRow` beyond structural skim.
- `tasks/components/TasksView.tsx` + layout search-param plumbing.
- `WorkspaceLayout`, `V2PresetExecution`, pane registry internals.
- Runtime behaviour — the whole point of the caveat at §0.

An operator with runtime access should spend the bulk of Phase B
screenshot time on the gaps above; the per-route findings in this doc
are the static prior.
