# Wave 1 Today — Dogfooding Tracker

Append one section per landed bead. Each section follows the template:

```
## <bead-id> — <short title>

- Landed: <commit-sha on origin/main>
- Dogfooded on: <YYYY-MM-DD> (<operator>)
- Screenshot: ai_docs/spectralset-vision/screenshots/<bead-id>-<slug>.png
- Notes: <what was exercised, any surprises, follow-ups filed as beads>
```

Screenshots live under `ai_docs/spectralset-vision/screenshots/`. Never inline
base64 in this file — this tracker must stay readable as plain markdown.

---

## ss-fa4 — C1 Today #01: `/today` route + sidebar row + route-guard

- Landed: _pending refinery merge_
- Dogfooded on: _post-merge — polecat worktree cannot run Electron interactively_
- Screenshot: _to be captured post-merge by Witness / next operator_
- Notes:
  - Route `/today` scaffolds the five region placeholders (breadcrumb masthead
    + Triage / Rigs / Mail / Verdict sections). Data layer lands in `ss-c1-today-02`.
  - Root `/` now redirects to `/today` (previously redirected to `/workspace`).
  - Sidebar: Gas Town section gained a Today row at position 1 with a `—`
    count-badge placeholder (wired in `ss-c1-today-02`).
  - **Route-guard (trap fix, ss-tw0 / ss-trap-router):** on `gastownEnabled=false`,
    probe error, `probe.installed=false`, or `probe.townRoot=null`, the page
    redirects (`replace: true`) to `/workspace` — which itself bounces to
    `/welcome` when no workspaces exist. This replaces the previous failure
    mode where `/today` would render "Failed to load" with no escape.
  - Quality gates: `bun run lint:fix` clean, `bun run typecheck` clean,
    `bun test` — 1882 pass / 1 fail; the single failure
    (`captureHotkeyFromEvent — Bug 2`) reproduces on unchanged `main` and is
    unrelated to this bead.

---

## ss-2fkq — Wave A #06: dogfood verification (Today as pane)

- Landed: f3265b1 (origin/main — captures all Wave A deps: ss-ain5 persist v10,
  ss-lmlv TabView dispatch, ss-xblb sidebar+hotkey wiring)
- Dogfooded on: _2026-04-24 (code-level structural verification only —
  polecat worktree cannot run Electron interactively; interactive screenshots
  require operator hand-off)_
- Screenshot: _to be captured by Witness / next operator — see "Pending operator
  evidence" below_
- Notes:
  - **Structural verification (code level, all 12 walk steps):**
    1. Build preconditions: all deps on `origin/main` — `ss-xblb` (sidebar
       wiring) is the latest sidebar/pane commit at `0b4eb70`, bundled into
       the tip at `f3265b1`.
    2. Sidebar Gas Town section renders when `gastownEnabled === true`
       (`GastownSidebarSection.tsx:45-49`); returns `null` when disabled.
    3. **Sidebar → Today click** calls `addGastownPane(activeWorkspaceId,
       { kind: "gastown-today" })` with no `navigate()` call
       (`GastownSidebarSection.tsx:201-216`). URL remains at the current
       `/workspace/<id>` — no route change, so no route eclipse.
       **TabView dispatch** routes `gastown-today` panes through `<TodayPane />`
       (`TabView/index.tsx:235-239`); TodayPane renders Masthead + TriageStack
       + RigsStrip + MailPile + VerdictTail (`TodayPane.tsx:49-62`).
    4. **Split view**: `addGastownPane` creates a tab + single pane and does
       not alter any sibling terminal tab. Standard `splitPaneAuto` /
       `splitPaneHorizontal` / `splitPaneVertical` remain available via the
       tab's pane-level split handlers (`TabView/index.tsx:264-266`), so
       opening a terminal pane beside Today uses existing split plumbing —
       not a new code path.
    5. **Close**: Today tab is a normal `Tab` with one pane; Cmd+W / tab-X
       close goes through the existing tab-removal path in the store. No
       gastown-specific teardown is needed.
    6. **Re-open**: each click calls `addGastownPane` which always allocates a
       new `tabId` (`store.ts:302`), so the button is re-openable.
    7. **Auto-naming**: `addGastownPane` counts existing panes of the same
       kind within the workspace and names new ones `"Today 2"`, `"Today 3"`,
       etc. (`store.ts:290-308`, `utils.ts:33-38`). First Today is plain
       `"Today"`.
    8. Focus cycle: Today tabs are standard tabs; `setActiveTab` /
       `focusedPaneIds` bookkeeping is identical to other tabs
       (`store.ts:310-318`). No custom focus traps in TodayPane.
    9. **Persist v10** stamps the storage version at `10`
       (`store.ts:2217`) and documents v9→v10 as "no schema changes; records
       the crossover point where gastown-* pane kinds became valid"
       (`store.ts:2261-2263`). Any persisted `gastown-today` panes are
       rehydrated via the normal `merge` path.
   10. **Hotkey**: `OPEN_TODAY_PANE` bound to `meta+shift+y` (Mac) /
       `ctrl+shift+y` (Win/Linux) at `registry.ts:560-569`; handler calls the
       same `addGastownPane(..., { kind: "gastown-today" })` from the
       dashboard layout (`layout.tsx:147-153`). `useHotkey` wraps
       `react-hotkeys-hook` with `enableOnFormTags: true` and
       `enableOnContentEditable: true` (`useHotkey.ts:17-22`), so the hidden
       xterm textarea does not block it at the hook level. *Whether xterm
       calls `stopPropagation()` on the specific Meta+Shift+Y chord is not
       verifiable without a running Electron instance — flagged below for
       interactive confirmation.*
   11. **`gastownEnabled === false` gating**: sidebar section returns `null`
       (`GastownSidebarSection.tsx:47`) and the hotkey registers with
       `enabled: !!currentWorkspaceId && gastownEnabledQuery.data?.enabled
       === true` (`layout.tsx:144-146`), so pressing the chord is a no-op
       when disabled.
   12. **Probe fail → empty state inside pane**: when `probeQuery.isError`
       or `probe.installed === false`, `TodayPane` renders
       `<TodayGastownUnreachable />` via the `TodayShell` wrapper
       (`TodayPane.tsx:44-46, 103-124`). This is rendered in-pane — no
       redirect, no full-screen route-guard bounce. This is the structural
       win of Wave A.
  - **No code changes in this bead** — verification only.
  - **Pending operator evidence (interactive only):**
    - Stopwatch: click → first paint < 500ms (visual timing — CDP-scripted
      measurement possible but not in polecat scope).
    - Screenshots: sidebar→Today / split-with-terminal / two Today panes
      auto-named / post-relaunch restored / hotkey-from-xterm / probe-fail
      empty state.
    - Live hotkey bubbling test while xterm holds focus (Meta+Shift+Y chord
      vs. xterm's hidden textarea). If xterm swallows the chord in practice,
      the fix is a higher-priority `keydown` listener with
      `stopPropagation()` ahead of xterm — file a follow-up bead.
    - Visual-flicker / state-loss observation across focus cycles.
  - **No anomalies found at the code level.** All structural acceptance
    gates (no route eclipse, sidebar always mounted, probe-fail in-pane, v10
    persistence) are satisfied by the merged code. Interactive confirmation
    is the only remaining blocker to calling Wave A shipped.
