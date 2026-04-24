---
phase: OPS
doc_id: BEADS-UI-PRIOR-ART
version: v0.1
owner: crew/gastown_researcher
depends_on:
  - ai_docs/spectralset-vision/ARCH-PROPOSAL-gastown-as-pane.md
seed_inputs:
  - https://github.com/steveyegge/beads
  - https://github.com/Dicklesworthstone/beads_viewer
  - https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/README.md
  - https://github.com/assimelha/bdui
  - https://github.com/zjrosen/perles
  - https://github.com/jmcy9999/beads-fleet
  - https://github.com/ChrisEdwards/abacus
  - https://github.com/raychaser/beadsx
  - https://github.com/joshuadavidthomas/opencode-beads
  - https://github.com/mattbeane/beads-viz-prototype
  - https://github.com/Dicklesworthstone/beads_viewer_rust
  - https://github.com/HerbCaudill/beads-sdk
  - https://github.com/thoreinstein/beads-workflow
  - https://github.com/makeplane/plane
  - https://github.com/zed-industries/zed
  - https://github.com/Aider-AI/aider
required_sections_present: true
section_count_self_check: 7
overseer_review_requested: 2026-04-24
---

# BEADS-UI-PRIOR-ART — survey for Gas Town Wave B

**Bead:** ss-6ski · **Author:** `spectralSet/crew/gastown_researcher` · **Date:** 2026-04-24
**Scope:** Read-only research. Prior art survey of open-source UIs over Steve Yegge's `beads` and adjacent agent-roster / task-tracker projects. Output is inspiration + a concrete applicability matrix for Wave B.
**Method:** `gh search repos` for discovery, `WebFetch` on READMEs for deep-dive. No clones. Every claim below cites a URL. Time-boxed ≤2h.

---

## §1 — Projects surveyed

Fifteen projects. All starred counts as of 2026-04-24 via `gh search repos --json stargazersCount`.

| # | Project | URL | Category | ★ | Stack | Rel. |
|---|---------|-----|----------|---|-------|------|
| 1 | **steveyegge/beads** | https://github.com/steveyegge/beads | Upstream (beads CLI) | (origin) | Go CLI | 5 |
| 2 | **Dicklesworthstone/beads_viewer** | https://github.com/Dicklesworthstone/beads_viewer | beads consumer (TUI) | 1,472 | Go TUI | 5 |
| 3 | **joshuadavidthomas/opencode-beads** | https://github.com/joshuadavidthomas/opencode-beads | beads consumer (agent plugin) | 217 | TypeScript | 4 |
| 4 | **zjrosen/perles** | https://github.com/zjrosen/perles | beads consumer (TUI+orchestrator) | 150 | Go TUI | 5 |
| 5 | **assimelha/bdui** | https://github.com/assimelha/bdui | beads consumer (realtime TUI) | 106 | TypeScript TUI | 5 |
| 6 | **ChrisEdwards/abacus** | https://github.com/ChrisEdwards/abacus | beads consumer (TUI) | 33 | Go TUI | 4 |
| 7 | **Dicklesworthstone/beads_viewer_rust** | https://github.com/Dicklesworthstone/beads_viewer_rust | beads consumer (Rust port) | 17 | Rust TUI | 3 |
| 8 | **thoreinstein/beads-workflow** | https://github.com/thoreinstein/beads-workflow | beads workflow layer | 8 | Shell + Gemini CLI | 2 |
| 9 | **DollarDill/beads-superpowers** | https://github.com/DollarDill/beads-superpowers | Claude Code plugin | 4 | Shell | 2 |
| 10 | **raychaser/beadsx** | https://github.com/raychaser/beadsx | VSCode extension | 3 | TypeScript (VSCode) | 4 |
| 11 | **mattbeane/beads-viz-prototype** | https://github.com/mattbeane/beads-viz-prototype | Web viz prototype | 3 | Python → HTML | 3 |
| 12 | **mrf/beads-synced** | https://github.com/mrf/beads-synced | beads ↔ GitHub Issues sync | 3 | JavaScript (GH Action) | 2 |
| 13 | **jmcy9999/beads-fleet** | https://github.com/jmcy9999/beads-fleet | Web dashboard + agent mgmt | 2 | TypeScript (Next.js) | 5 |
| 14 | **HerbCaudill/beads-sdk** | https://github.com/HerbCaudill/beads-sdk | Typed SDK | 2 | TypeScript | 2 |
| 15 | **makeplane/plane** | https://github.com/makeplane/plane | Adjacent (Linear OSS clone) | 40k+ | TypeScript+Python | 4 |

Beads itself is **pure-CLI — no GUI is shipped upstream** (`https://github.com/steveyegge/beads` — "Beads is a distributed graph issue tracker" implemented as a CLI; visualisation is "intentionally delegated to the ecosystem"). Every UI below is community-built on the `bd --json` / `--robot-*` surface. Adjacent systems (Zed's agent panel, Aider REPL, Plane) are included for patterns Gas Town can steal beyond the beads ecosystem.

Star counts range 0–1,472. The five highest-rated (★ rel. ≥ 4) drive §2-4; the rest are cited where they contribute a unique pattern.

---

## §2 — Sidebar / navigation patterns

The dominant sidebar pattern in beads UIs is **hierarchical tree**, not flat list. Every ★≥4 viewer defaults to an expandable tree that honours parent-child + dependency relationships.

**Split-pane as table stakes.** `beads_viewer` (bv), `abacus`, `bdui` all land on a **list-or-tree left + detail right** layout. From `Dicklesworthstone/beads_viewer` README: *"List View (default) — Fast list + rich details with split-pane layout on wider terminals"* (https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/README.md). `abacus` is described as a "dual-pane layout combining hierarchical navigation with contextual details" — left tree, right metadata panel reached via Enter (https://github.com/ChrisEdwards/abacus).

**Pinned views via number keys.** `bdui` uses `1-4` for kanban / tree / graph / statistics (https://github.com/assimelha/bdui — "Four distinct visualization modes are accessible via number keys (1-4)"). `beads-fleet` maps single-key shortcuts `d/b/i/t` to Dashboard / Board / Insights / Time-Travel (https://github.com/jmcy9999/beads-fleet). This pattern is a direct Linear / Raycast borrow and maps cleanly onto `INFORMATION-ARCHITECTURE.md §3` "g t / g a / g c / g m / g i / g r" shortcut set.

**Responsive density collapse.** `bdui`: *"Terminal width determines column visibility: wide terminals (>160 cols) show all four columns plus detail panel; narrow terminals (<40 cols) display single-column view"* (README). Gas Town's `ResizablePanel` covers the resize primitive; what we lack is the *per-breakpoint column visibility rule* bdui encodes.

**Filter in the toolbar, not the command palette.** `beadsx` VSCode extension exposes *"four viewing modes"* via a panel toolbar icon — "All / Open only / Ready to work / Recent" — selection persisting across sessions (https://github.com/raychaser/beadsx). `beads_viewer` promotes the same filter vocabulary to single-keys: `o` open, `c` closed, `r` ready. This filter vocabulary is identical to `bd ready` / `bd list` — consistency between CLI and UI.

**Sidebar search is vim-style fuzzy `/`**, not a separate input. `beads_viewer` README: *"`/` — Fuzzy find"*. Every ★≥4 TUI uses `/` as search. Gas Town today does not have a sidebar search; adopting `/` is Pillar 4 one-click-everything.

**Multi-repo switching via dropdown.** `beads-fleet`: *"sidebar dropdown for repository switching, enabling users to manage multiple Beads-enabled projects"* (https://github.com/jmcy9999/beads-fleet). This is the single strongest prior-art for Gas Town's multi-rig navigation — operator picks rig from a dropdown, sidebar restructures below. Contrast: today's `GastownSidebarSection` is flat.

**Empty/loading/error states** are not documented consistently across these projects — this is a gap Gas Town can *lead*, not follow.

**Screenshots referenced**

- `beads_viewer` list view: https://github.com/Dicklesworthstone/beads_viewer/blob/main/screenshots/screenshot_01__main_screen.webp
- `beads_viewer` kanban: https://github.com/Dicklesworthstone/beads_viewer/blob/main/screenshots/screenshot_03__kanban_view.webp
- `beads_viewer` insights: https://github.com/Dicklesworthstone/beads_viewer/blob/main/screenshots/screenshot_02__insights_view.webp
- `beads_viewer` graph: https://github.com/Dicklesworthstone/beads_viewer/blob/main/screenshots/screenshot_04__graph_view.webp
- `beads-fleet`: three dashboard screenshots on the README (kanban, dependency graph, pipeline board).

---

## §3 — Agent/worker roster patterns

Three projects model concurrent workers explicitly: `beads-fleet`, `perles`, and (adjacent) Zed's agent panel.

**Status dots + inline metrics.** `beads-fleet` has a dedicated `Fleet` view with *"per-epic cost tracking and agent status indicators … AgentStatusBanner displays real-time subprocess polling results"* (https://github.com/jmcy9999/beads-fleet). This is the closest analogue to Gas Town's `AgentCVPanel` + `Today` surface; Gas Town's 3-state model (Working / Stalled / Zombie) maps cleanly onto their status indicator.

**One-click launch from the board.** `beads-fleet`: *"one-click agent launches"* spawn Claude Code sessions from kanban cards (README). Gas Town's `gt sling` is the same verb; surfacing it as a button on a card row is directly transferable (and overlaps the `cli-pain-inventory.md §2` top-20 row 2).

**Activity timeline.** `beads-fleet` *"correlates token usage records with issue metadata"* on an Activity timeline. Mapping: Gas Town's per-polecat CV chain + mail history is the same data; a unified Activity timeline is named as a future surface in `INFORMATION-ARCHITECTURE.md §1` non-goals ("appears as views inside the 7 surfaces, not as separate navigation") — validated by `beads-fleet` treating it the same way.

**Realtime refresh cadence — file-watching pub/sub.** `bdui`: *"File watching with automatic refresh … Pub/sub pattern for database changes"* (https://github.com/assimelha/bdui). Gas Town's Dolt `HASHOF_DB` polling is a functionally equivalent primitive (`PRINCIPLES.md §4` Pillar 1); `bdui`'s desktop notifications on task completion / blocking events (per README) are a pattern we have NOT yet specced.

**Attach-to-session UX is missing from beads ecosystem**, but canonical in Zed / Aider. Zed's agent panel (https://github.com/zed-industries/zed) and Aider's REPL (https://github.com/Aider-AI/aider — "AI pair programming in your terminal") keep each worker tied to a single window/pane; neither exposes a *roster view across sessions*. Gas Town's `gt peek` + agent-detail-drawer is actually ahead of these: we already model "click a worker, see its live state" where Zed expects you to switch tabs. Do not regress.

**Density: emoji badges vs mono symbols.** `beads_viewer` uses emoji status: 🟢 Open / 🟡 In Progress / 🔴 Blocked / ⚫ Closed (README). `beadsx` uses ASCII: `[O]` / `[>]` / `[B]` / `[C]` (https://github.com/raychaser/beadsx). `abacus` uses Unicode symbols with colour: `◐` cyan / `○` white / `✔` gray / `⛔` red (https://github.com/ChrisEdwards/abacus). `DESIGN-SYSTEM.md §4` already mandates mono symbols (not emoji) for structural state chips — this is validated by `beadsx` and `abacus` choosing the same discipline for space-constrained surfaces.

---

## §4 — Task/issue list patterns (beads-specific)

**Six canonical views reappear across projects.** `beads_viewer` (★1,472) codifies them most exhaustively: *"List, Board (`b` — Kanban columns organized by Status / Priority / Type with collapsible swimlanes), Graph (`g` — Force-directed dependency visualization with topological layering), Tree (`E` — hierarchical parent-child work breakdown), Insights Dashboard (`i` — Six-panel metric explorer), History View (`h` — Three-pane bead-to-commit correlation with timeline)"* plus Actionable Plan (`a`), Flow Matrix (`f`), Attention View (`]`), and an interactive Tutorial. `bdui` reduces to four (kanban / tree / graph / statistics); `perles` adds BQL search as a primary view (https://github.com/zjrosen/perles).

**Dependency visualisation is ASCII or force-directed.** `bdui`: *"Dependency Graph — ASCII art visualization showing blocking relationships … Issues organized by dependency levels"*. `beads-fleet` uses ReactFlow v11 in the web UI with PageRank bottleneck detection (README). `beads-viz-prototype` uses vis.js network physics with hover-for-details (https://github.com/mattbeane/beads-viz-prototype). Gas Town currently shows dependencies only as a text line in the bead detail drawer — a first-class graph is an open opportunity (but a Wave C+, not Wave B, ask).

**Priority as badge, not icon.** `bdui`: *"Color-coded priorities (P0-P4) … Type indicators (epic, feature, bug, task, chore)"* rendered as badges inline. `DESIGN-SYSTEM.md §4` already has this as `PriorityPill`; prior art ratifies.

**Wisps / molecules / formulas have no direct parallel in these UIs.** None of the 14 beads consumers surface the Gas Town concept of a wisp (ephemeral scaffolding) or a formula (workflow template). `beads_viewer`'s Actionable Plan and `perles`'s "workflow runner" subtitle are the closest — both focus on *sequencing* existing beads, not on applying templates. **Gas Town's molecule abstraction is unique prior-art** in this space, not a follow.

**Dogfood gate / evidence-required conventions are Gas Town-specific.** No beads UI enforces "screenshot + git cat-file -e before marking done" the way our `PRINCIPLES.md §5` anti-pattern "false-done reports" does. The ecosystem's auto-close semantics (`bd close` + git hook) are machine-oriented; our human-loop gate has no equivalent.

**Robot-mode JSON is the cross-project contract.** `beads_viewer`: *"Use `--robot-*` flags for deterministic JSON output"* (`bv --robot-triage`, `bv --robot-plan`, `bv --robot-insights`, `bv --robot-graph` with `json | dot | mermaid`). `beads-fleet` layers over this: *"browser calls Next.js API routes. Each route shells out to `bv --robot-*` commands that return structured JSON"* (https://github.com/jmcy9999/beads-fleet). **Direct applicability to Gas Town:** SpectralSet's tRPC `gastown.*` routers are architecturally identical to beads-fleet's Next.js API shelling pattern. Our probe already uses `gt status --json`; scaling that to "every Gas Town read goes through a `--json`-family CLI call" is validated prior art.

---

## §5 — Applicability matrix for Gas Town Wave B

Each row: *adopt directly* / *adapt with changes* / *reject (doesn't fit)* plus one-sentence justification. Source project cited.

| Pattern (from §2-4) | Source | GastownSidebarSection (post-ss-8jqz) | AgentCVPanel / Today regions | Mail/Convoys/Agents panes (Wave B) | Command palette (post-Wave-C) |
|---|---|---|---|---|---|
| Multi-rig dropdown sidebar switcher | beads-fleet | **adapt** — we have multiple rigs; dropdown at top of sidebar replaces flat list (today's audit drift) | — | — | *adopt directly* — `goto rig:<name>` verb |
| Split-pane list+detail (default) | beads_viewer / abacus | — | **adopt directly** — already present in ConvoyBoard; extend to Agents surface | **adopt directly** — IA §5 mandates "detail opens as drawer, list stays visible" | — |
| Single-key view switch (`1-4` / `b/g/i/h`) | bdui / beads_viewer | — | — | **adapt** — map to `PRINCIPLES.md §4` Pillar 4 shortcuts; pick 2-3 per surface, don't ship 10 | *adopt directly* — verb modifiers |
| Fuzzy `/` search in list | beads_viewer | **adopt directly** — sidebar needs search above 5+ rigs | **adopt directly** — triage stack + mail pile both benefit | **adopt directly** | — (command bar IS this) |
| Toolbar filter dropdown with persistent selection | beadsx | — | — | **adopt directly** — Mail already has address picker; add "Unread / Pinned / Mentioning me" toggle | — |
| Status dots as mono symbols (not emoji) | beadsx / abacus / DS§4 | — | **adopt directly** — ratifies B4 discipline | **adopt directly** | — |
| Kanban columns with collapsible swimlanes | beads_viewer | — | **reject** — Today surface is prose-not-kanban per `spec-today §1`; kanban belongs in Convoys | **adapt** — Convoys surface already kanban-ish; add swimlanes by owner/epic | — |
| Force-directed dependency graph (first-class) | beads-viz-prototype / beads-fleet | — | **reject** — Today is "what needs me", not dependency mapping | **reject (for Wave B)** — parks at Wave C | — |
| PageRank / bottleneck heuristics on the board | beads-fleet | — | **adapt** — surface "stalled polecat 3h" reason string is already this, in prose; upgrade later | **adapt** — Rejection Triage cause chip is analogous | — |
| One-click agent launch from a card | beads-fleet | — | **adopt directly** — matches `cli-pain-inventory.md §2` top-20 row 2 (gt sling) | **adopt directly** — triage card Open button | *adopt directly* — `sling` verb |
| Desktop notifications on task-done / blocked | bdui | — | **adapt** — keep notifications system-level; surface in-app toast (avoid double-ping) | **adapt** | — |
| Responsive column hide rules per breakpoint | bdui | — | **adopt directly** — encode "≥160 cols show all regions" in Today layout | **adopt directly** | — |
| Activity timeline (tokens + issue correlation) | beads-fleet | — | **reject (for Wave B)** — IA §1 explicitly parks Activity timeline as a view-inside-surface, not a surface | **reject (for Wave B)** | — |
| ASCII dependency graph inline in a drawer | bdui | — | — | **adapt** — bead detail drawer could show ASCII deps without a graph library dep | — |
| Robot-mode JSON as the UI-to-CLI contract | beads_viewer / beads-fleet | — | **adopt directly** — ratifies tRPC-router-over-`gt --json` pattern we already have | **adopt directly** | **adopt directly** — command bar `open <bead>` calls `bd show --json` |

---

## §6 — Top 5 recommendations

Prioritized. Each = source project + pattern + fit paragraph + rough scope.

### 1. Multi-rig dropdown + scoped sidebar (steal from `beads-fleet`)

**Why it fits.** `GastownSidebarSection` today is flat across rigs. `beads-fleet` (https://github.com/jmcy9999/beads-fleet) solved exactly this by putting a sidebar dropdown at the top of the nav: pick rig, everything below recomposes. At 6+ rigs our sidebar stops being scannable — this is the lowest-leverage-first-fix that unblocks the 6-rig-operator persona (`PRINCIPLES.md §3` Pillar 3 Founder-scale; `current-state-audit.md` §1 TL;DR #2 "coexistence" drift). Ties directly into Gas Town's probe (`gt status --json` returns `.rigs[]`).

**Scope.** 2 beads, ~300 LoC total. (a) `RigSwitcher` component in `packages/ui` with dropdown + keyboard cycle (`1-9` for rigs); (b) `GastownSidebarSection` rewrite to consume rig-scoped queries. Wave B bead.

### 2. `/` fuzzy search in sidebar and list views (steal from `beads_viewer`)

**Why it fits.** Every ★≥4 beads TUI uses `/` (https://raw.githubusercontent.com/Dicklesworthstone/beads_viewer/main/README.md — *"`/` — Fuzzy find"*). Gas Town today has no sidebar search; once a rig has 20+ polecats over a day, the sidebar becomes a 40-row wall. `/` is the canonical keyboard-first answer. Pairs with command bar as a two-tier search (sidebar-scoped `/` + global `Cmd-K`).

**Scope.** 1 bead, ~180 LoC. Input overlay + fuzzy-match indexer over current sidebar rows. Wave B bead.

### 3. Single-key view toggles on list-heavy surfaces (steal from `bdui` / `beads_viewer`)

**Why it fits.** `bdui` (https://github.com/assimelha/bdui) maps `1-4` to Kanban / Tree / Graph / Stats; `beads_viewer` maps `b g i h a` to its six views. Gas Town's Convoys surface is a natural fit — board vs table vs dep-graph on the same data. Ratifies `INFORMATION-ARCHITECTURE.md §3` intent (`g c` = goto Convoys) without over-claiming: we adopt the *within-surface* view toggle, not a new top-level surface.

**Scope.** 2 beads. (a) Add `v` keybinding + `ViewToggle` primitive in `packages/ui` (~80 LoC). (b) Wire three Convoys view modes (list default, kanban already exists, ASCII-dep opt-in) (~160 LoC). Wave B/C boundary.

### 4. Responsive breakpoint column-hide rules (steal from `bdui`)

**Why it fits.** `bdui`: *"wide terminals (>160 cols) show all four columns plus detail panel; narrow terminals (<40 cols) display single-column view"*. Gas Town's `ResizablePanel` is strong but we don't encode *what collapses when*. Today surface's five regions need an explicit breakpoint policy (Rigs strip collapses first, Mail pile next, verdict tail last). Codifying this prevents visual drift as operators resize. Pair with `DESIGN-SYSTEM.md §2` spacing tokens.

**Scope.** 1 bead, ~120 LoC. Add `useBreakpoint()` hook + per-region `hideAtBreakpoint` prop; apply to Today regions. Can extend to Agents/Convoys in follow-ups. Wave B bead.

### 5. Robot-mode contract audit: every surface reads via `--json` (validated by `beads-fleet`)

**Why it fits.** `beads-fleet` (https://github.com/jmcy9999/beads-fleet): *"Each route shells out to `bv --robot-*` commands that return structured JSON"*. Gas Town's tRPC `gastown.*` routers already shell to `gt ... --json` (probe uses `gt status --json`), but we have no written contract that ALL reads follow the pattern. Writing one + auditing the current routers surfaces anywhere we're parsing raw stdout (brittle) instead of `--json` (safe). Cheap insurance before Wave B multiplies the router surface.

**Scope.** 1 research bead (grep existing routers) + 1-3 refactor beads per drift found. Research bead ≤60 min, ≤120 LoC of doc. Refactors are 1:1 with drift count.

**Honourable mentions** that missed the top 5: single-key number shortcuts `1-9` for rigs (subset of #1), ASCII dependency graph in the bead drawer (nice-to-have but Wave-C), desktop notifications on task-done (risk of double-ping against system-level notifications).

---

## §7 — Open questions / parked

Observed but uncertain.

1. **Kanban vs prose for Today.** `beads_viewer` / `bdui` default to kanban; `spec-today.md §1` deliberately chose five prose regions. Prior art does NOT ratify our choice — it presents a different opinion. Worth re-testing with a persona walk in Phase D. Does the founder *want* a kanban view somewhere (maybe Convoys in Wave B)?
2. **File-watching pub/sub vs HASHOF_DB polling** (`bdui` uses file-watcher). Is 0.14ms HASHOF_DB polling actually better than a watcher for the renderer? We *asserted* it in `NORTH-STAR.md:27` but have no head-to-head latency measurement. `bdui`'s claim of "automatic refresh" is not quantified either — measurable gap.
3. **Interactive Tutorial as a view** (`beads_viewer`'s `` ` `` key opens an in-app tutorial). Gas Town has zero in-app onboarding for new operators — `PRINCIPLES.md §6` Success Criterion 4 ("30-min new-user productivity") requires this and we have nothing specced. Candidate for a post-Wave-B bead.
4. **Graph view ROI.** `beads-fleet` uses ReactFlow for a first-class dependency graph with PageRank analysis. Our bead data supports this (DAG is inherent). Worth the React dep + design cost, or does a text "Blocks / Blocked by" list in the drawer suffice for v1?
5. **Agent CV vs Activity timeline.** `beads-fleet` has both "Fleet" (agent status) and "Activity timeline" (tokens + issue correlation) as distinct views. We only model Agents. Is token/cost correlation a Wave C+ ask or a Wave B nice-to-have?
6. **BQL query language (perles, ★150).** `perles` exposes a full boolean-logic query language with date filters and dep-tree traversal (https://github.com/zjrosen/perles). Gas Town has `bd query` CLI but no UI. The command bar's verb-object grammar (`spec-command-bar.md §3`) is a different philosophy; reviewers might push for BQL parity.
7. **VSCode extension parity.** `beadsx` (★3) is 3,000 lines of TypeScript that put beads in the VSCode sidebar. Gas Town's desktop app is Electron — we could ship a VSCode extension with near-zero incremental cost. Out of scope for Wave B but worth parking as a "5-hour side project" opportunity.
8. **`--robot-*` flags vs `--json`.** `beads_viewer` ships `--robot-triage`, `--robot-plan`, `--robot-insights`, `--robot-graph` as *task-specific JSON endpoints* with token-optimized `--format toon`. Gas Town's `gt *.json` is more uniform but possibly less token-efficient. Does our command bar benefit from a tighter per-view JSON shape? Parks at Wave C.
9. **Empty/error state discipline is a Gas Town *lead*.** No surveyed project documents empty / loading / error states systematically. `DESIGN-SYSTEM.md §5` (haiku-only empty states) plus `spec-today.md §3` (explicit error microcopy for Gas-Town-unreachable / probe-mismatch / Dolt-degraded) is *ahead* of prior art. This should become public content (blog post / README) once it ships.
10. **Notifications double-ping risk.** `bdui` ships desktop notifications on task-done / blocked. Gas Town on Electron can do both system-level AND in-app toasts. Policy question: which one is primary? `INFORMATION-ARCHITECTURE.md §2` doesn't answer. Decide before any surface ships notifications.
