# 003 — Sessions

## Purpose

Show what is *running* inside a workspace and let the user move between those
running things. PRD §5: "tabs/sessions" and "agent/tool activity and state".
§4 gives sessions their own input: `LB`/`RB` cycle tabs within a workspace.

## Domain framing

Orca's desktop model is tabs inside a workspace: terminal panes, agent
sessions, open files, markdown previews, browser tabs. The controller flattens
that to one concept — a **Session** — with a `surface` discriminator:

| Controller surface | Orca tab type              | Owned by |
| ------------------ | -------------------------- | -------- |
| `agent`            | `agent-session`            | `007-agents` |
| `terminal`         | `terminal`                 | `008-terminal` |
| `document`         | `markdown`, `file`         | `010-files` |
| — (not surfaced)   | `browser`                  | out of scope |

This feature owns the *list*, the *status*, and the *navigation*. It does not
own the content of any surface.

## Scope

**In scope**

- List sessions for a workspace, and across all workspaces on a connection.
- Session status: which agent is attached, what it is doing, whether it is
  running.
- Live subscription to session membership and to agent status.
- Session activation (make it the active tab on the host).
- Creating a terminal session in a workspace.
- Closing a session.
- Navigation: workspace → session → surface, with back behaviour that matches
  how the user arrived.

**Out of scope**

- Rendering agent conversations (`007`), terminal output (`008`), or file
  content (`010`).
- Pane layout and splits. The controller shows leaves, not a split tree.
- Browser tabs.
- Session handoff between TUI and native chat (`agentSession.requestHandoff`),
  deferred until the controller UX for it is designed.

## Controller surface

Operated entirely through `001`'s intents; this feature owns no input of its own
and never reads the controller port. Wheel segments are contributed to `002`'s
registry with an `availability`, so the ring's shape stays stable.

| Pane | Accepts | Notes |
| ---- | ------- | ----- |
| Session list | `move-selection`, `confirm`, `scroll` | |
| Any session pane | `cycle-tab` | `LB`/`RB`, the one input that is always a session's |

`cycle-tab` wraps at the ends rather than stopping: on a controller a dead
button reads as a broken one, and there is no scrollbar to show you are at the
edge.

Wheel segments: new terminal, close tab, switch terminal/chat view.

Every pane this feature mounts declares its `sessionId`, which is what makes
`X` resolvable from anywhere inside a session (`001` CTRL-R3).

## Requirements

### SESS-R1 — Session list per workspace

For a selected workspace, list its sessions with: title, surface, active
marker, attached agent (when any), agent activity, and execution state.

### SESS-R2 — Cross-workspace session list

A connection-wide list of sessions is available, so a user can go straight to
"the three agents that need input" without first picking a workspace. Backed by
`session.tabs.listAll`; when the host does not support it, the feature degrades
to per-workspace lists without an error.

### SESS-R3 — Live membership

Session membership updates without a manual refresh: a session opened or closed
on the desktop appears or disappears on the phone. Backed by
`session.tabs.subscribe` / `subscribeAll`.

### SESS-R4 — Live agent status

Agent activity on a session updates live, from the host's own status feed.
The controller never infers activity from output, timing, or titles.

### SESS-R5 — Execution state, not liveness booleans

Each session carries `live` / `unverifiable` / `exited`. A session whose PTY
exited reads `exited`; a session on a connection that dropped reads
`unverifiable`. These are different states and must render differently.

### SESS-R6 — Terminal handle readiness

A terminal session may exist before its handle is ready
(`status: 'pending-handle'`). The controller shows the session and disables
input until the handle arrives, rather than hiding the session or showing an
error.

### SESS-R7 — Activation

Activating a session makes it active on the host and selects it locally. A
failed activation leaves local selection unchanged and reports the reason.

### SESS-R8 — Create a terminal session

The user can create a terminal session in a workspace, optionally with a quick
command. Creation reports the new session and navigates to it.

### SESS-R9 — Close a session

Closing is confirmed, names the session, and reports the outcome. A close that
the host refuses does not remove the row locally.

### SESS-R10 — Navigation contract

- Entering a session from the workspace list returns to the workspace list.
- Entering from a cross-workspace list returns to that list.
- A push notification deep-links straight to the session, and back goes to the
  workspace that owns it.
- Navigation state survives backgrounding.

### SESS-R11 — Ordering

Default order: needs-input agents first, then working, then the active session,
then the rest by recency. Pinned sessions stay at the top of their band.

## Acceptance criteria

- **SESS-AC1** — Opening a terminal tab on the desktop makes it appear in the
  phone's session list within one subscription round trip, with no manual
  refresh.
- **SESS-AC2** — Closing a tab on the desktop removes it from the phone list.
- **SESS-AC3** — An agent starting a turn on the desktop flips that session's
  activity to `working` on the phone from the status feed alone.
- **SESS-AC4** — A session whose PTY exits reads `exited`; killing the
  connection instead leaves it `unverifiable`. Two distinct renderings.
- **SESS-AC5** — A `pending-handle` terminal session is listed, is selectable,
  and has input disabled with a stated reason.
- **SESS-AC6** — `session.tabs.listAll` unsupported degrades to per-workspace
  listing with no error surface.
- **SESS-AC7** — Creating a terminal session navigates to it and it appears in
  the list exactly once.
- **SESS-AC8** — Back navigation from a notification deep link lands on the
  owning workspace, not on an empty stack.
- **SESS-AC9** — Two sessions with the same title in one workspace are
  distinguishable and independently addressable.
- **SESS-AC10** — Rotating the device or backgrounding for five minutes
  preserves the selected session and scroll position.

## Non-goals

- A tab bar that mirrors the desktop.
- Pane splitting or layout editing from the phone.
