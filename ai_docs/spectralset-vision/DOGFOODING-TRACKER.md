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
