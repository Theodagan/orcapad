# 003 — Sessions — Technical Specification

## 1. Port

`mobile/src/gamepad/application/ports/session-port.ts`:

```ts
export type SessionMembershipEvent =
  | { readonly kind: 'snapshot'; readonly sessions: readonly Session[] }
  | { readonly kind: 'changed'; readonly sessions: readonly Session[] }
  | { readonly kind: 'ended' }

export type AgentStatusEvent =
  | { readonly kind: 'snapshot'; readonly agents: readonly Agent[] }
  | { readonly kind: 'changed'; readonly agent: Agent }
  | { readonly kind: 'ended' }

export type CreateTerminalSessionRequest = {
  readonly workspaceId: WorkspaceId
  readonly title?: string
  readonly command?: string
}

export type SessionPort = {
  readonly listSessions: (id: ConnectionId, workspaceId: WorkspaceId)
    => Promise<PortResult<readonly Session[]>>
  readonly listAllSessions: (id: ConnectionId)
    => Promise<PortResult<readonly Session[]>>
  readonly observeSessions: (id: ConnectionId, workspaceId: WorkspaceId | null)
    => Subscription<SessionMembershipEvent>
  readonly observeAgentStatus: (id: ConnectionId)
    => Subscription<AgentStatusEvent>
  readonly activateSession: (id: ConnectionId, sessionId: SessionId)
    => Promise<PortResult<void>>
  readonly createTerminalSession: (id: ConnectionId, request: CreateTerminalSessionRequest)
    => Promise<PortResult<Session>>
  readonly closeSession: (id: ConnectionId, sessionId: SessionId)
    => Promise<PortResult<void>>
}
```

`observeSessions` with `workspaceId: null` means connection-wide.

## 2. Orca mapping

| Port method             | Orca RPC |
| ----------------------- | -------- |
| `listSessions`          | `session.tabs.list` `{ worktree }` |
| `listAllSessions`       | `session.tabs.listAll` |
| `observeSessions`       | `session.tabs.subscribe` / `session.tabs.unsubscribe`, or `session.tabs.subscribeAll` / `session.tabs.unsubscribeAll` |
| `observeAgentStatus`    | `agentSession.subscribeStatus` / `agentSession.unsubscribe` |
| `activateSession`       | `session.tabs.activate` `{ worktree, tabId }` |
| `createTerminalSession` | `session.tabs.createTerminal` |
| `closeSession`          | `session.tabs.close` (`session.tabs.closeLifecycle` for lifecycle-owned tabs) |

Not mapped: `session.tabs.move`, `session.tabs.setTabProps`,
`session.tabs.updatePaneLayout` — pane layout is out of scope.

### 2.1 Tab → `Session`

Source: `RuntimeMobileSessionClientTab`
(`src/shared/runtime-mobile-session-tab-contracts.ts`).

| Orca tab type    | `surface`   | Notes |
| ---------------- | ----------- | ----- |
| `terminal`       | `terminal`  | carries `status: 'pending-handle' \| 'ready'` and `terminal: string \| null` |
| `agent-session`  | `agent`     | carries `sessionId`, `agent: 'claude' \| 'codex'` |
| `markdown`       | `document`  | carries `filePath`, `mode`, `isDirty` |
| `file`           | `document`  | carries `filePath` |
| `browser`        | —           | filtered out by the adapter; never reaches core |

Common mapping:

| Domain field      | Source |
| ----------------- | ------ |
| `id`              | `id` |
| `workspaceId`     | the subscription's worktree selector |
| `surface`         | table above |
| `title`           | `title` |
| `isActive`        | `isActive` |
| `agentId`         | `agent-session` → `sessionId`; `terminal` → the `paneKey` of its agent row when one exists; else `null` |
| `executionState`  | §2.2 |
| `updatedAt`       | host clock at delivery, or `turnCompletedAt` when present |

Adapter-side extras retained for other features, keyed by session id and not on
the domain type:

- terminal handle (`terminal`), `ptyId`, `incarnationId`, `terminalTheme`,
  `viewMode`, `parentTabId`, `leafId` → `008-terminal`;
- `sessionId`, `agent`, `replacesSessionId` → `007-agents`;
- `filePath`, `relativePath`, `documentVersion` → `010-files`.

### 2.2 Execution state

```text
terminal tab, status 'ready', pty present, connection connected   → 'live'
terminal tab, status 'pending-handle'                             → 'unverifiable'
tab removed from a snapshot while connected                       → 'exited'
connection not connected                                          → 'unverifiable'
agent tab whose status summary carries hostExecutionOwned         → 'live'
agent tab with a summary but no hostExecutionOwned                → 'unverifiable'
```

A tab disappearing from a snapshot **while connected** is the only evidence
that admits `exited`. Disappearance observed across a reconnect is
`unverifiable`, because the client cannot distinguish "closed while we were
away" from "the host restarted". This is the SSH execution boundary rule
applied locally.

### 2.3 Agent status feed

`agentSession.subscribeStatus` emits
`AgentSessionStatusEvent` (`src/shared/agent-session-wire.ts`):

```ts
| { type: 'snapshot'; sessions: AgentSessionStatusSummary[] }
| { type: 'status'; session: AgentSessionStatusSummary }
| { type: 'end' }
```

`AgentSessionStatusSummary` → `Agent`:

| Domain field  | Source |
| ------------- | ------ |
| `id`          | `sessionId` |
| `sessionId`   | the tab whose `sessionId` matches |
| `workspaceId` | `workspaceId` |
| `kind`        | `agent` (provider) |
| `activity`    | `status`: `working`→`working`, `attention`→`needs-input`, `idle`→`settled`, `null`→`unknown` |
| `model`       | `model ?? null` |
| `currentTool` | `toolName ?? null` (only meaningful while `working`) |
| `lastPrompt`  | `latestPrompt` |
| `lastReply`   | `lastAssistantMessage ?? null` |
| `updatedAt`   | `updatedAt` |

`backgroundTasks` (subagent children) is retained adapter-side and surfaced by
`007-agents`; it does not belong in the session list.

A summary is never retracted by the host: an evicted idle session keeps its
last projection. The controller must therefore not treat "summary still
present" as evidence of liveness — `hostExecutionOwned` is the only such
evidence.

### 2.4 Reconciliation with `005`

`005-projects` reads agent rows from `worktree.ps`; this feature reads status
summaries. Both funnel through
`src/gamepad/adapters/orca/mapping/agent-reconciliation.ts` from `000-foundation` §4.6.
There is exactly one `Agent` per `(connectionId, agentId)` in the remote store,
regardless of how many producers described it.

## 3. Feature structure

```text
mobile/src/gamepad/features/sessions/
├── screens/
│   ├── WorkspaceSessionsScreen.tsx
│   └── AllSessionsScreen.tsx
├── components/
│   ├── SessionRow.tsx
│   ├── SessionSurfaceIcon.tsx
│   ├── ExecutionStateBadge.tsx
│   └── CreateTerminalSheet.tsx
├── hooks/
│   ├── use-session-list.ts
│   └── use-agent-status-feed.ts
└── state/
    ├── session-selection.ts
    └── session-ordering.ts
```

Reuse `mobile/src/session/active-session-tab.ts` by moving it into
`src/gamepad/features/sessions/state/` — it is pure logic with one caller.
`mobile/src/navigation/host-stack-navigation.ts` stays upstream and is reached
through `src/gamepad/adapters/device/host-stack-navigation.ts`; no second
navigation helper either way.

## 4. Subscription lifecycle

```text
screen focus      → subscribe (workspace-scoped or connection-wide)
screen blur       → keep the subscription for 30 s, then unsubscribe
app background    → unsubscribe all
app foreground    → resubscribe; treat the first event as a snapshot replace
connection lost   → mark every session unverifiable; do not unsubscribe
connection back   → resubscribe; snapshot replaces
```

One subscription per `(connectionId, scope)`, shared by all consumers via the
existing stream registry. Two screens observing the same scope must not open
two host subscriptions.

## 5. Navigation

Routes stay under the existing host stack
(`mobile/app/h/[hostId]/session/[worktreeId].tsx`). This feature adds:

- `mobile/app/h/[hostId]/sessions.tsx` — connection-wide list.

Back behaviour is derived from the stack, not from a stored "came from" flag,
so a deep link produces a synthetic stack: connection → workspace → session
(SESS-AC8).

## 6. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| `session.tabs.listAll` unsupported | cross-workspace screen fans out per workspace, capped at the visible set |
| `agentSession.subscribeStatus` unsupported | agent activity reads `unknown`; sessions still list |
| Subscription drops without `end` | every session for that connection → `unverifiable`; resubscribe with backoff |
| `createTerminal` succeeds but the tab never appears | after 10 s, show "created, not yet visible" and offer a refresh; do not synthesize a local row |
| Close refused | keep the row, show the host's reason |

## 7. Testing

| Test | Proves |
| ---- | ------ |
| `session-tab-mapping.test.ts` | §2.1 for all five tab types, incl. browser filtering |
| `session-execution-state.test.ts` | §2.2 table, incl. the reconnect-disappearance rule (SESS-AC4) |
| `agent-status-feed-mapping.test.ts` | §2.3 incl. `status: null` |
| `session-subscription-lifecycle.test.ts` | §4, incl. single-subscription sharing |
| `session-ordering.test.ts` | SESS-R11 |
| `session-navigation-stack.test.ts` | SESS-AC8 |
| `pending-handle-session.test.ts` | SESS-AC5 |
