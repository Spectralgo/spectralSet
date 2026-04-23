---
phase: C1
doc_id: ARCH-gastown-as-pane
version: v0.1
owner: polecat/jade
depends_on:
  - ai_docs/spectralset-vision/IMPLEMENTATION-PLAN.md
  - ai_docs/spectralset-vision/INFORMATION-ARCHITECTURE.md
  - ai_docs/spectralset-vision/interaction-specs/spec-today.md
  - ai_docs/spectralset-vision/interaction-specs/spec-mail.md
  - ai_docs/spectralset-vision/interaction-specs/spec-convoys.md
  - ai_docs/spectralset-vision/interaction-specs/spec-agents.md
seed_inputs:
  - apps/desktop/src/shared/tabs-types.ts
  - apps/desktop/src/renderer/stores/tabs/store.ts
  - apps/desktop/src/renderer/stores/tabs/types.ts
  - apps/desktop/src/renderer/stores/tabs/utils.ts
  - apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/TabView/index.tsx
  - apps/desktop/src/renderer/routes/_authenticated/_dashboard/layout.tsx
  - apps/desktop/src/renderer/routes/_authenticated/gastown/layout.tsx
  - apps/desktop/src/renderer/routes/_authenticated/today/page.tsx
  - apps/desktop/src/renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx
required_sections_present: true
section_count_self_check: 10
overseer_review_requested: 2026-04-23
---

## 1. Summary

Gas Town surfaces (Today, Mail, Convoys, Agents) render today as full-screen routes under `_authenticated/today` and `_authenticated/gastown/*`. Each surface eclipses the workspace sidebar because the sidebar only mounts inside the `_dashboard` pathless layout, which is gated by a URL allow-list (`/workspace`, `/workspaces`, `/tasks`, `/project`, `/pending`, `/v2-workspace`, `/v2-workspaces`) at `apps/desktop/src/renderer/routes/_authenticated/_dashboard/layout.tsx:35-43`. The new target is to make each Gas Town surface a **pane kind** — peer to `terminal`, `chat`, `webview`, `file-viewer`, `devtools` — that lives inside the existing workspace tab-and-mosaic system. Panes keep the workspace chrome (topbar, sidebar, traffic-light drag region) mounted at all times, let a user keep a Today pane open while splitting a Mail pane beside a chat pane, and retire the eclipse class of bugs (ss-tlc, ss-h1z, ss-okp) structurally instead of by route-guard whack-a-mole. Because the pane store already persists per-workspace tab state and uses per-kind add actions (`addChatTab`, `addBrowserTab`, `addFileViewerPane`), the migration is additive: new `PaneType` literals, new `createGastownPane` helpers, new dispatch cases, no breaking store changes.

## 2. Current route shape (before)

| URL                   | Route file                                                           | Top-level component               |
|-----------------------|----------------------------------------------------------------------|-----------------------------------|
| `/today`              | `apps/desktop/src/renderer/routes/_authenticated/today/page.tsx`     | `TodayPage` (355 lines)           |
| `/gastown` (layout)   | `apps/desktop/src/renderer/routes/_authenticated/gastown/layout.tsx` | `GastownLayout` (93 lines)        |
| `/gastown/agents`     | `.../gastown/agents/page.tsx`                                        | `AgentCVPanel`                    |
| `/gastown/convoys`    | `.../gastown/convoys/page.tsx`                                       | `ConvoyBoard`                     |
| `/gastown/mail`       | `.../gastown/mail/page.tsx`                                          | `MailPanel`                       |

Each page is a thin wrapper: `<div className="flex h-full w-full flex-col bg-background">` + one panel component. The `GastownLayout` adds a `GastownTopBar` with its own drag region (`drag h-10 ... pl-[88px]`) because the `_dashboard` topbar is absent at this level. `TodayPage` paints its own drag region (`drag h-8 w-full shrink-0`) for the same reason — `today/page.tsx:97-100`. This duplication is a symptom of the surfaces living outside the dashboard shell.

The `_dashboard` layout itself demonstrates the scoping: it matches the pathless layout in the router tree but early-returns a bare `<Outlet />` when the URL is not in the allow-list (`_dashboard/layout.tsx:45-70`). This was introduced to fix the Today eclipse (see commit `ca2a500`) but treats the symptom — the underlying problem is that Gas Town is a sibling of, not a child of, the workspace shell.

## 3. Proposed pane types

Add four literals to the `PaneType` union at `apps/desktop/src/shared/tabs-types.ts:11-16`:

| Pane kind              | Component path (new)                                                      | Source content migrates from                                                    | Per-pane props (stored on `Pane`)       |
|------------------------|---------------------------------------------------------------------------|----------------------------------------------------------------------------------|-----------------------------------------|
| `gastown-today`        | `renderer/components/Gastown/TodayPane/TodayPane.tsx`                     | `routes/_authenticated/today/page.tsx` (body from line 92 downward)             | none                                    |
| `gastown-mail`         | `renderer/components/Gastown/MailPane/MailPane.tsx`                       | `routes/_authenticated/gastown/mail/page.tsx` → `components/Gastown/MailPanel`  | `gastownMail?: { initialFilter? }`     |
| `gastown-convoys`      | `renderer/components/Gastown/ConvoysPane/ConvoysPane.tsx`                 | `routes/_authenticated/gastown/convoys/page.tsx` → `components/Gastown/ConvoyBoard` | `gastownConvoys?: { selectedConvoyId? }` |
| `gastown-agents`       | `renderer/components/Gastown/AgentsPane/AgentsPane.tsx`                   | `routes/_authenticated/gastown/agents/page.tsx` → `components/Gastown/AgentCVPanel` | `gastownAgents?: { rigFilter? }`     |

Opening triggers (all four):

1. Sidebar click in `GastownSidebarSection` — swap `navigate({ to: ... })` for `addGastownPane(activeWorkspaceId, { kind: "gastown-today" })` etc. (`GastownSidebarSection.tsx:193-230`).
2. Keyboard shortcuts — register four hotkeys (`OPEN_TODAY_PANE`, `OPEN_MAIL_PANE`, `OPEN_CONVOYS_PANE`, `OPEN_AGENTS_PANE`) following the existing `useHotkey` pattern in `_dashboard/layout.tsx:102-112`.
3. Command palette entries — one command per surface, dispatched via the same `addGastownPane` action.

Each pane component is plain React; it reads from tRPC the same way the route version does today. No new IPC is required for Wave A.

## 4. Store changes

All changes are additive. File: `apps/desktop/src/renderer/stores/tabs/store.ts` (2284 lines) and siblings.

- **New helper** `createGastownPane(tabId, kind, options?)` in `stores/tabs/utils.ts` alongside `createPane`, `createFileViewerPane`, `createChatPane` (utils.ts:166-181, 207-243, 245+). Returns a `Pane` with `type: kind` and a default `name` based on kind (`"Today"`, `"Mail"`, `"Convoys"`, `"Agents"`).
- **New action** `addGastownPane(workspaceId, options: { kind: GastownPaneKind; /* per-kind props */ })` on `TabsStore`. Mirrors `addChatTab` (store.ts:246-284): create tab, create pane, wire active tab + history stack, emit `panel_opened` posthog event with `panel_type: kind`.
- **Optional pane props** — extend `Pane` in `shared/tabs-types.ts:129-150` with the three optional bag fields listed in section 3 (`gastownMail`, `gastownConvoys`, `gastownAgents`). Each defaults to `undefined` so existing panes persist unchanged.
- **Persistence** — no schema bump is strictly required because a pane with `type: "gastown-today"` is ignorable by older clients (they'd fall through to the "Pane not found" branch in the dispatch). For safety, bump `version` from 9 to 10 at `store.ts:2149` with an empty migrate block so the runtime records the crossover.
- **Per-workspace semantics are inherited for free.** `activeTabIds: Record<workspaceId, string | null>` and `tabHistoryStacks: Record<workspaceId, string[]>` already scope all tab state per workspace (`shared/tabs-types.ts:241-243`), so a user can have a Today pane open in workspace A and a Mail pane in workspace B without cross-talk.

What we do **not** change: `addTab`, `addChatTab`, `addBrowserTab`, `addFileViewerPane`, the Mosaic layout engine, drag-drop logic, or the closed-tabs stack.

## 5. Dispatch changes (diff sketch, not actual diff)

Target file: `renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/TabView/index.tsx:161-281`. The `renderPane` switch currently handles `file-viewer`, `chat`, `webview`, `devtools`, defaulting to `TabPane` (terminal). Add four branches before the terminal default:

```
if (paneInfo.type === "gastown-today") {
  return <TodayPane paneId={paneId} path={path} tabId={tab.id}
                    workspaceId={tab.workspaceId}
                    splitPaneAuto={...} removePane={...}
                    setFocusedPane={...} />;
}
if (paneInfo.type === "gastown-mail")    { return <MailPane .../>; }
if (paneInfo.type === "gastown-convoys") { return <ConvoysPane .../>; }
if (paneInfo.type === "gastown-agents")  { return <AgentsPane .../>; }
```

Each Gas Town pane wraps `BasePaneWindow` (same chrome as `TabPane.tsx:95-157`) so it automatically gets: pane title, close button, split controls, context menu, focus management, and status indicator. The pane body is just `<TodayBody />` / `<MailPanel />` / `<ConvoyBoard />` / `<AgentCVPanel />` — the existing panel components move unchanged; only their outer-shell wrapper changes from route page to pane window.

`tabPanes` at `TabView/index.tsx:68-88` already preserves the `type` field generically; no changes needed there.

## 6. Route layer cleanup

Post-migration, in Wave C:

- **Delete** `routes/_authenticated/today/page.tsx`, `routes/_authenticated/gastown/layout.tsx`, `routes/_authenticated/gastown/agents/page.tsx`, `routes/_authenticated/gastown/convoys/page.tsx`, `routes/_authenticated/gastown/mail/page.tsx`.
- **Remove** the route-guard redirect logic at `gastown/layout.tsx:40-56` — no longer needed because there is no full-screen route to trap.
- **Redirect legacy URLs** — add a tiny redirect route at `_authenticated/today/page.tsx` and `_authenticated/gastown/$surface/page.tsx` whose only job is: resolve the active workspace, call `addGastownPane`, then `navigate({ to: "/workspace/$workspaceId" })`. If no active workspace exists, navigate to `/workspaces` and surface a toast: "Open a workspace to view Gas Town." This preserves deep links from external notifications (`gt` CLI, Slack, email) that still point at `/today`.
- **Drop** `DASHBOARD_URL_PREFIXES` specialness for Gas Town URLs — they no longer exist as sibling routes, so the allow-list shrinks back to its core.
- **Eclipse class resolved for free** — the bugs tracked in ss-tlc, ss-h1z, ss-okp exist because the sidebar only mounts under `_dashboard`. With Gas Town as panes, every Gas Town surface is rendered *inside* `_dashboard` via the workspace route, so the sidebar is always present and the class of "sidebar disappeared when I clicked X" bugs is gone structurally.

## 7. Sidebar integration

Target: `renderer/components/Gastown/GastownSidebarSection/GastownSidebarSection.tsx:172-257`.

The four navigate buttons (`HiOutlineSun`/Today, `HiOutlineEnvelope`/Mail, `HiOutlineTruck`/Convoys, `HiOutlineUserGroup`/Agents) each call `navigate({ to: "/today" })` etc. today. They become:

```
onClick={() => {
  if (!activeWorkspaceId) {
    toast.error("Open a workspace first — Gas Town panes are workspace-scoped.");
    return;
  }
  const { tabId } = addGastownPane(activeWorkspaceId, { kind: "gastown-today" });
  setActiveTab(activeWorkspaceId, tabId);
}}
```

The `useParams({ strict: false })` hook at `GastownSidebarSection.tsx:95-97` already surfaces `activeWorkspaceId`; no new plumbing. The onAttach flow at line 105-170 already mirrors this pattern for terminal panes, so the code shape is familiar.

Because the sidebar is mounted inside `_dashboard`, the existing user flow ("Open Today from anywhere") is preserved: a click in the sidebar opens the pane in the currently-focused workspace's tab strip, rather than eclipsing the workspace with a full-screen route.

## 8. Migration plan (ordered waves)

### Wave A — one pane kind end-to-end (Today first)

Rationale: Today is the highest-traffic Gas Town surface (it is the default landing per spec-today), has the richest composition (five child regions), and is already under active development (ss-5d0, ss-dnv, ss-h1z lands it into the *current* route). Nailing Today proves the pattern for Mail/Convoys/Agents.

Bead stubs:
- **ss-TBD-01** — Extend `PaneType` union with `"gastown-today"` and add optional pane-state bag.
- **ss-TBD-02** — Create `TodayPane` wrapper component (wraps `BasePaneWindow`, renders TodayBody extracted from `today/page.tsx`).
- **ss-TBD-03** — Add `addGastownPane` store action + `createGastownPane` helper; bump persist version to 10.
- **ss-TBD-04** — Add `gastown-today` branch to `TabView/index.tsx` dispatch.
- **ss-TBD-05** — Swap sidebar "Today" button from `navigate` to `addGastownPane`; register `OPEN_TODAY_PANE` hotkey.
- **ss-TBD-06** — Dogfood loop: launch Electron, verify open/close/split/re-open, sidebar stays mounted throughout.

### Wave B — migrate Mail + Convoys + Agents

Repeat Wave A for each of the three remaining surfaces in parallel. Each surface is one bead (component extraction + dispatch branch + sidebar swap + per-pane props). Estimated 3 beads total (not 3×5, because the store action and union extension already landed in Wave A).

- **ss-TBD-07** — `gastown-mail` pane kind.
- **ss-TBD-08** — `gastown-convoys` pane kind.
- **ss-TBD-09** — `gastown-agents` pane kind.

### Wave C — retire legacy routes

- **ss-TBD-10** — Convert `/today` and `/gastown/$surface/` to redirect-to-pane routes; drop the full-screen components.
- **ss-TBD-11** — Delete `gastown/layout.tsx` (redirect logic + GastownTopBar no longer needed).
- **ss-TBD-12** — Shrink `DASHBOARD_URL_PREFIXES` back to its core; remove the Today eclipse comment and the BareOutlet branch if no other sibling needs it.
- **ss-TBD-13** — Update docs that reference full-screen Gas Town navigation (spec-today §sidebar, interaction-specs/spec-mail §entry).

## 9. Risks + open questions

1. **Persistence schema compatibility** — a user downgrading to a pre-v10 build after opening a `gastown-today` pane would see a "Pane not found" placeholder. The bump to v10 is nominal; no destructive migration, but we should confirm downgrade-safety isn't a product requirement.
2. **Cross-workspace vs per-workspace Gas Town panes** — the proposal inherits per-workspace scoping. Open question: should Today be *workspace-agnostic* (one Today for the whole app)? If yes, we'd need a new "global pane" concept that the current store doesn't model. Recommendation: keep per-workspace for C1; a global-pane feature is a separate design doc.
3. **Keyboard focus traps** — `TriageStack` has j/k/A/O/S bindings (ss-5d0). When the pane isn't focused, those bindings must not fire globally. `BasePaneWindow` focus tracking via `setFocusedPane` should be sufficient but needs a smoke test.
4. **Command palette integration** — adding four commands to the palette is trivial; open question is whether they should appear only when `gastownEnabled` is true (probe check mirrors `GastownSidebarSection.tsx:39-47`).
5. **Deep links from external notifications** — the `gt` CLI, Slack hooks, and email notifications point at `/today` URLs today. The redirect shim in Wave C covers this, but we should inventory emitter sites (escalation mail templates, witness nudges) to confirm no hard-coded paths miss the shim.
6. **Tab auto-naming collisions** — if a user opens two Today panes in the same workspace, `deriveTabName` (`store.ts:130-140` utility area) should produce "Today", "Today 2". Needs a targeted test.
7. **Mosaic drag-drop of Gas Town panes** — `BasePaneWindow` already supports drag-to-split. Open question: do we want a Today pane to be splittable-with-a-chat-pane? Recommendation: yes, it's free from the platform and users love it; flag for review.
8. **Size floor** — `TriageStack` and `MailPile` assume a reasonable minimum width. Panes in a 3-way split could be ~200px wide. Need min-width CSS or an overflow-gracefully layout in each Gas Town pane component.
9. **Route-guard semantics** — `gastown/layout.tsx:47-56` redirects to `/today` when Gas Town is disabled or the probe fails. The pane opener must replicate this: show an empty state in the pane if `gastownEnabled === false` rather than refusing to open.
10. **tRPC subscription lifetimes** — some Gas Town panels open long-lived subscriptions (digest tick, mail stream). Opening two instances of the same pane kind should not double-subscribe; we rely on React Query dedupe today. Verify behavior when two MailPanes coexist in the same workspace.

## 10. Rejected alternatives

**A. "Just fix the eclipse" (keep routes, harden the allow-list).** This is what we have been doing (ss-tlc, ss-okp, ss-h1z, and the BareOutlet branch at `_dashboard/layout.tsx:65-68`). It treats the symptom: the sidebar only mounts conditionally, and every new Gas Town surface is a new allow-list entry. The approach does not compose — two Gas Town surfaces at once is impossible without a full-screen split component we don't have. It also forces duplicate drag-region code in every sibling layout (`today/page.tsx:97-100`, `gastown/layout.tsx:112-116`). Low short-term cost, high long-term cost; we chose to stop paying it.

**B. "Dedicated right-side panel outside the pane system" (a la a Slack sidebar, always open on the right).** This moves the problem rather than solves it: Gas Town surfaces are first-class UI, not secondary panels. A Today flow that forces the user to look at a narrow right rail undersells the TodayMasthead + RigsStrip + TriageStack + MailPile + VerdictTail composition. It also introduces a second layout engine (panel + mosaic) which has to split focus, keyboard, and drag-drop rules with the existing pane system. Rejected on complexity + information-density grounds.

**C. "Modal overlay" (open Today/Mail/Convoys/Agents as a dialog on top of the workspace).** Modals steal focus, block the workspace, and cannot coexist with a chat or terminal pane. This explicitly fights the user flow in the spec-today journeys (watch Today while an agent works in a terminal beside it). Modal overlays also can't host the keyboard shortcuts in TriageStack/MailPile without global hotkey conflicts. Rejected.

Panes win because they (1) inherit all existing pane infrastructure — layout, focus, drag-drop, context menu, status indicators, persistence — for free; (2) compose with every other pane kind the user already knows; (3) retire the eclipse class of bugs structurally; (4) shrink the route tree; (5) match the steady-state mental model already in use for terminal + chat.
