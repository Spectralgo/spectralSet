# Convoy Sprint UI Design

## Goal

Make the Convoys surface read like a sprint planning board in Linear or Jira:
convoys are sprints, tracked beads are issues, and the main screen should help
users scan sprint health, issue state, and remaining work without switching
routes.

## Product Model

- Convoy = sprint.
- Tracked bead = issue.
- `dependency_type` becomes the issue relationship tag.
- `issue_type` becomes the issue type tag.
- Convoy `status`, `completed`, `total`, and tracked bead status are the sprint
  health inputs.

## Screen Design

The default Convoys screen is a two-pane sprint workspace:

- Left rail: compact sprint list with status, progress, issue count, and age.
- Right pane: selected sprint header with title, ID, status, progress, and simple
  metrics.
- Issue workspace: board columns grouped by issue status, followed by a dense
  issue table for Linear/Jira-style scanning.

The right pane keeps the current selected-sprint behavior and existing data
queries. The board is read-only for now because the current APIs only expose
convoy status and bead lists; status-changing behavior remains outside this PR.

## States

- Loading list: show compact loading copy in the sprint rail.
- Empty list: say there are no active sprints.
- List error: show a Gas Town-specific load failure.
- No selected sprint: show a neutral prompt.
- Sprint loading/error/not-found: keep the right pane stable and scoped to the
  selected sprint.
- No issues in sprint: show an empty issue board/table message.

## Validation

Tests should assert the new product language and layout landmarks:

- empty state says no active sprints
- list renders "Sprint" terminology
- selected detail renders "Sprint summary"
- tracked beads render as issues in board columns and the issue table
- progress still derives from closed tracked issues when aggregate fields are
  absent
