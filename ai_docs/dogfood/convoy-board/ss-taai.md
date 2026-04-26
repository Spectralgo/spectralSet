# ss-taai — Convoy board routing + URL state restoration

## Route

`apps/desktop/src/renderer/routes/_authenticated/convoys/$convoyId/board/page.tsx`
→ generated id `/_authenticated/convoys/$convoyId/board/`
→ url `/convoys/$convoyId/board`

## Search params (validated, persisted in URL)

| key  | type                  | default  |
|------|-----------------------|----------|
| mode | `"kanban" \| "stream"` | `kanban` |
| bead | `string \| undefined`  | `undefined` |

`validateSearch` coerces unknown values back to defaults so a stale or malformed
URL still resolves cleanly on app reload.

## Acceptance verification (routing layer only)

- URL pattern routed: confirmed in `routeTree.gen.ts` after `tsr generate`
  (`/_authenticated/convoys/$convoyId/board/`).
- Mode toggle persists in URL: `setMode` calls `navigate({ search, replace: true })`
  so the param is always reflected, but reload-history doesn't accumulate noise.
- Selected bead persists in URL: search holds `bead`; downstream board components
  (ss-cvb-1..7) call `navigate({ search: (p) => ({ ...p, bead: id }) })`.
- Browser back/forward: native to TanStack Router history — no extra wiring.
- Deep link round-trip: opening `/convoys/<id>/board?mode=stream&bead=ss-xxx`
  rehydrates `mode` and `bead` via `Route.useSearch()` before first render.

## Out of scope for this bead

The visible kanban columns, swarm-stream table, DAG overlay, and bead drag/drop
land in ss-cvb-1..7. This bead is the URL/route contract those components plug
into; until they land, the page renders a minimal header with the mode toggle
and a "Mode: … · Selected: …" debug line.
