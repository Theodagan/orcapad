# 002 — Projects & Workspaces

## Purpose

Answer "what work exists on this host, and what is it doing?" — the controller's
primary inventory. PRD §5: "projects and workspaces".

## Domain framing

Orca calls them repos and worktrees. The controller calls them **projects** and
**workspaces**, because a workspace is not always a git worktree: a folder
workspace has no branch and no lineage, and the controller must not imply one.

A project holds workspaces. A workspace holds sessions (`003`), agents (`004`),
terminals (`005`), and files (`007`).

## Scope

**In scope**

- List projects for a connection, with workspace counts.
- List workspaces, filtered and sorted, across one or all projects.
- Workspace detail: branch, kind, attention state, lineage, review link,
  last activity, preview of the newest output.
- Workspace grouping: by project, by attention, by recency.
- Cross-host listing: workspaces from several connections in one list, clearly
  attributed.
- Activating a workspace on the host (bring it to front on desktop).
- Archived and pinned workspaces.

**Out of scope for MVP**

- Creating, deleting, or archiving a workspace from the phone.
- Git operations (stage, commit, push, branch). `git.*` is unmapped.
- Repo management (add, clone, reorder). `repo.add` / `repo.clone` unmapped.
- Review and PR workflows — a workspace shows its review *link*, not a review UI.

Creation is deliberately deferred: PRD §4 says "observing, steering and
managing remote work", and creation is the one operation where a mistake on a
phone is expensive and hard to undo.

## Requirements

### PROJ-R1 — Project list

For each connection, list projects with: name, accent color, workspace count,
and how many workspaces currently need input. Reflects `repo.list`.

### PROJ-R2 — Workspace list

A single list showing, per workspace: name, project, kind (git worktree /
folder), branch when it has one, attention state, unread marker, last activity
time, and a one-line preview of recent output.

The list must remain readable at 200+ workspaces: virtualized, with the
truncation flag from the host surfaced rather than silently hidden.

### PROJ-R3 — Attention is the primary sort

Default ordering: needs-input first, then working, then done-unacknowledged,
then idle; within a band, most recent activity first. The user can switch to
manual order (the host's `sortOrder` / `manualOrder`) or pure recency.

### PROJ-R4 — Filters

Filter by: project, connection, attention state, archived, pinned, unread,
has-review-link. Filters are local UI state and persist across launches.

### PROJ-R5 — Folder workspaces are first-class

A folder workspace renders without branch, lineage, or review affordances, and
never shows an empty branch field or a placeholder dash where a branch would be.

### PROJ-R6 — Lineage

Parent and child workspaces are shown as a relationship, so a user can see that
a child worktree came from a parent. Depth is capped in the UI at the levels the
host reports; no client-side lineage inference.

### PROJ-R7 — Efficient refresh

The workspace list uses the host's conditional snapshot: send the last
`snapshotId`, accept an `unchanged` reply without rebuilding the list. Polling
interval is bounded and pauses when the app is backgrounded.

### PROJ-R8 — Cross-host lists are attributed

When a list spans connections, every row names its host. Two workspaces with the
same name on different hosts are never merged.

### PROJ-R9 — Activation

Selecting "open on desktop" activates the workspace on the host
(`worktree.activate`). The result is reported; a failure does not change local
selection.

### PROJ-R10 — Stale data is labelled, not hidden

When the connection is down, the last known list stays visible with an explicit
staleness marker and a timestamp. Attention states shown from stale data are
presented as last-known, and any execution-derived state reads `unverifiable`.

## Acceptance criteria

- **PROJ-AC1** — The project list matches `repo.list` for the connected host,
  including projects with zero workspaces.
- **PROJ-AC2** — A host reporting `truncated: true` shows a "showing N of M"
  affordance; the number is the host's `totalCount`.
- **PROJ-AC3** — Default sort places every needs-input workspace above every
  working workspace, and every working above every idle.
- **PROJ-AC4** — A folder workspace shows no branch UI at all — not an empty
  one. Asserted by a component test against a `workspaceKind: 'folder-workspace'`
  fixture.
- **PROJ-AC5** — A second `worktree.ps` with an unchanged `snapshotId` performs
  no list re-render and no re-sort.
- **PROJ-AC6** — Filters survive app restart.
- **PROJ-AC7** — With two connections holding identically named workspaces, both
  rows appear, each attributed to its host.
- **PROJ-AC8** — Disconnecting shows the stale marker within one refresh
  interval and leaves rows readable.
- **PROJ-AC9** — A list of 250 workspaces scrolls without dropping frames on the
  slowest supported device profile, measured with the app's existing
  performance harness.
- **PROJ-AC10** — `worktree.activate` failing surfaces the host's reason and
  leaves the local selection unchanged.

## Non-goals

- Reproducing the desktop sidebar.
- Any write to repository contents.
