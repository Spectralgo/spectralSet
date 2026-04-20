# Screenshots — not captured

The DISC-A2 audit (ss-urc) was executed inside a headless Gas Town polecat
sandbox with no display server, no Playwright, and no agent-browser MCP
binding. Runtime screen capture was not possible from this environment.

The audit deliverable at `../current-state-audit.md` is therefore grounded in
**static source inspection** of `apps/desktop/src/renderer/routes/**` and the
components each route mounts. Per-route findings cite file paths and line
ranges so an operator can verify any claim against the exact code.

## To capture the screenshots

An operator with desktop access should:

1. `bun run dev:desktop` from the repo root (or run the packaged app).
2. Walk every route listed in `current-state-audit.md` §2. Most are
   reachable from the sidebar; a few (`/pending/$pendingId`,
   `/workspace/$workspaceId`) require a live workspace.
3. Save PNGs here as `<route-slug>.png`, e.g. `gastown-agents.png`,
   `settings-integrations.png`, `tasks-detail.png`. Use the route slug
   pattern already referenced inline in the audit.
4. For error/crash states encountered during the walk (router NotFound,
   `gastown.probe` failure, Electric sync stall), capture a second
   screenshot suffixed `-error.png`.

The audit's claims about what exists in the UI can be checked without
screenshots — but the screenshots are what make the doc useful for the
design-phase (Phase B) stakeholders who are not going to read page.tsx.
