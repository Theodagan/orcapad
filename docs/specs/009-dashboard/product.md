# 006 — Dashboard

## Purpose

The controller's front door: one screen that answers "does anything need me
right now?" across every paired host, and one notification path that brings the
user back when something does. PRD §5: "basic session/project navigation".

## Product principle applied

*Controller first.* The dashboard is not a home screen with shortcuts. It is an
attention queue. Its ordering question is "what is blocked on a human?", and
everything else — recents, projects, stats — is secondary to that.

## Scope

**In scope**

- An attention queue: everything across all connections that is waiting on the
  user, most urgent first.
- Working summary: what is running right now, and where.
- Recents: the workspaces and sessions the user actually returns to.
- Connection strip: at-a-glance health of each paired host.
- Push notifications: registration, filtering, and reconnect catch-up.
- Deep links from a notification to the exact session.
- The missed-notification catch-up on reconnect.

**Out of scope**

- Analytics, usage charts, or cost dashboards.
- A customisable widget system.
- In-app notification preferences beyond the two the host filter supports
  (desktop-away-only, sound).

## Requirements

### DASH-R1 — Attention queue

One list, across all connections, of items waiting on the user:

1. pending approvals and questions (`007`);
2. agents in `needs-input`;
3. finished turns not yet acknowledged.

Each item names its host, project, workspace, and session, and opens directly
to the place where the user can act.

### DASH-R2 — Ordering is by urgency, then age

Within the queue: blocked-on-a-question first, oldest first inside each band —
because the oldest blocked agent has been idle longest.

### DASH-R3 — Working summary

A compact, always-honest count of what is running, per connection. When a
connection is down, its contribution reads unknown rather than zero.

### DASH-R4 — Recents

Recently visited workspaces and sessions, persisted locally, deduplicated, and
capped. Tapping one returns to exactly where the user was.

### DASH-R5 — Connection strip

Each paired host with its state from `004`, tappable to the host's detail.
A host that needs attention (auth failed, version incompatible) is visually
distinct from one that is merely disconnected.

### DASH-R6 — Push registration

The app registers for push with each paired host. iOS registration always
carries its APNs environment — a missing environment must fail loudly, not
default. Registration failures are surfaced with the host's reason, and
registration is retried on the failure kinds that warrant it.

### DASH-R7 — Push filtering

The user can choose: notify only when the desktop is away, and whether
notifications play a sound. These are host-side filters, set at registration.

### DASH-R8 — Reconnect catch-up is exact

On reconnect the app asks for notifications it missed, using a persisted
watermark and the host's counter epoch. Re-asking with the same watermark never
produces a duplicate local notification.

### DASH-R9 — Epoch awareness

The host's notification sequence restarts when it relaunches. The client sends
the epoch it recorded with its watermark so a post-restart catch-up does not
silently discard everything.

### DASH-R10 — Notification deep links

Tapping a notification opens the session it refers to, building a back stack
that lands on the owning workspace.

### DASH-R11 — Notifications are truthful

A notification's text reflects a host-reported event
(`agent-task-complete`, `terminal-bell`, `plugin`). The client does not
synthesize notifications from inference or timers.

### DASH-R12 — Degradation

A host that does not support push shows the reason once, and the dashboard
still functions from polling. Push is an enhancement, not a dependency.

## Acceptance criteria

- **DASH-AC1** — With two hosts, one having a pending approval and the other a
  finished turn, the approval sorts first.
- **DASH-AC2** — Answering an approval from the dashboard removes it from the
  queue without a manual refresh.
- **DASH-AC3** — A disconnected host contributes `unknown` to the working
  summary, never `0`.
- **DASH-AC4** — iOS registration without an APNs environment is rejected
  client-side with a clear error; it never reaches the host.
- **DASH-AC5** — Reconnecting twice with the same watermark delivers each
  missed notification exactly once.
- **DASH-AC6** — After a host restart, catch-up with a stale epoch does not
  drop notifications; the client recovers with the host's new epoch.
- **DASH-AC7** — Tapping a notification while the app is cold-started lands on
  the session, and back goes to the workspace.
- **DASH-AC8** — A host that refuses `notifications.registerPush` with
  `throttled` leaves the previous registration intact and does not show a
  failure.
- **DASH-AC9** — Recents survive relaunch and never contain a workspace that
  has been unpaired.
- **DASH-AC10** — The dashboard renders within the app's normal budget with
  five connections and 50 attention items.

## Non-goals

- Replacing the workspace list as the browsing surface.
- A second source of truth for agent status.
