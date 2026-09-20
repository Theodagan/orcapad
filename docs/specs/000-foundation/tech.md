# 000 — Foundation — Technical Specification

## 1. Directory layout

Target layout inside `mobile/`, per architecture.md §1:

```text
mobile/
├── app/                              # upstream Expo Router shell — routes only
│
└── src/
    ├── gamepad/                      # the fork: one tree, one boundary
    │   ├── domain/                   # types + invariants, zero dependencies
    │   ├── application/
    │   │   ├── ports/                # capability interfaces
    │   │   ├── use-cases/            # orchestration over ports
    │   │   └── adapter-registry.ts   # composition root
    │   ├── state/
    │   │   └── remote/ local/ connection/
    │   ├── features/
    │   │   ├── dashboard/ projects/ sessions/ agents/ terminal/ files/ pairing/
    │   │   │   ├── components/
    │   │   │   ├── screens/
    │   │   │   ├── hooks/
    │   │   │   └── state/
    │   ├── adapters/
    │   │   ├── orca/
    │   │   │   ├── rpc/              # defineRpcOperation descriptors
    │   │   │   ├── transport/        # client acquisition, lifecycle
    │   │   │   ├── pairing/
    │   │   │   ├── protocol/         # capability negotiation, version gates
    │   │   │   └── mapping/          # Orca payload → domain
    │   │   ├── device/               # preferences, notifications, terminal WebView host
    │   │   └── stub/                 # no-op adapter, extraction proof only
    │   └── gamepad-boundary.test.ts
    │
    └── accounts/ components/ files/ home/ session/ storage/ terminal/
        transport/ worktree/ …        # upstream, untouched
```

There is no `core/` level: once the root is `gamepad/`, it names nothing.

`adapters/device/` is separate from `adapters/orca/` on purpose. Preferences,
push and the terminal WebView are *platform* concerns, not *Orca protocol*
concerns, and FND-AC3 deletes only `adapters/orca/` — a standalone app still
needs to persist a filter.

The Expo shell stays thin: a route file resolves params, renders one feature
screen, and does nothing else (architecture.md §9). Routes stay in `mobile/app/`
because Expo Router requires them there; they re-export a gamepad screen.

## 2. Domain model

`src/gamepad/domain/`. One file per aggregate; no barrel file that re-exports
everything (it defeats the layering test's per-file import checks).

```ts
// connection.ts
export type ConnectionId = string & { readonly __brand: 'ConnectionId' }

export type ConnectionReachability = 'connected' | 'connecting' | 'unreachable'

export type Connection = {
  readonly id: ConnectionId
  readonly label: string
  readonly reachability: ConnectionReachability
  readonly path: 'local' | 'relay' | 'unknown'
  readonly hostVersion: string | null
  /** Null when the host never answered a version probe. */
  readonly protocolVersion: number | null
  readonly lastContactAt: number | null
}
```

```ts
// project.ts
export type ProjectId = string & { readonly __brand: 'ProjectId' }

export type Project = {
  readonly id: ProjectId
  readonly connectionId: ConnectionId
  readonly name: string
  readonly accentColor: string | null
  readonly workspaceCount: number
}
```

```ts
// workspace.ts
export type WorkspaceId = string & { readonly __brand: 'WorkspaceId' }

/** A git worktree or a folder workspace. The controller must not assume git. */
export type WorkspaceKind = 'git-worktree' | 'folder'

export type WorkspaceAttention =
  | 'idle'        // nothing running, nothing waiting
  | 'working'     // an agent is mid-turn
  | 'needs-input' // an agent is blocked on the user
  | 'done'        // a turn finished and has not been acknowledged
  | 'unknown'

export type Workspace = {
  readonly id: WorkspaceId
  readonly projectId: ProjectId
  readonly connectionId: ConnectionId
  readonly kind: WorkspaceKind
  readonly name: string
  readonly branch: string | null      // null for a folder workspace
  readonly attention: WorkspaceAttention
  readonly isArchived: boolean
  readonly isPinned: boolean
  readonly unread: boolean
  readonly lastActivityAt: number | null
  readonly preview: string
  readonly parentId: WorkspaceId | null
  readonly childIds: readonly WorkspaceId[]
  readonly review: WorkspaceReviewLink | null
}

export type WorkspaceReviewLink = {
  readonly kind: 'pull-request' | 'merge-request' | 'issue'
  readonly reference: string
  readonly state: string
}
```

```ts
// session.ts
export type SessionId = string & { readonly __brand: 'SessionId' }

export type SessionSurface = 'agent' | 'terminal' | 'document'

/** Per FND-R8. Never a boolean. */
export type ExecutionState = 'live' | 'unverifiable' | 'exited'

export type Session = {
  readonly id: SessionId
  readonly workspaceId: WorkspaceId
  readonly connectionId: ConnectionId
  readonly surface: SessionSurface
  readonly title: string
  readonly isActive: boolean
  readonly executionState: ExecutionState
  readonly agentId: AgentId | null
  readonly updatedAt: number
}
```

```ts
// agent.ts
export type AgentId = string & { readonly __brand: 'AgentId' }

export type AgentActivity = 'working' | 'needs-input' | 'settled' | 'unknown'

export type Agent = {
  readonly id: AgentId
  readonly sessionId: SessionId | null
  readonly workspaceId: WorkspaceId
  readonly kind: string            // 'claude' | 'codex' | … | custom, open set
  readonly activity: AgentActivity
  readonly model: string | null
  readonly currentTool: string | null
  readonly lastPrompt: string
  readonly lastReply: string | null
  readonly parentId: AgentId | null   // subagent lineage
  readonly activitySince: number
  readonly updatedAt: number
  /** Restored from disk on host start and not yet reconfirmed by a live report. */
  readonly staleFromRestore: boolean
}
```

```ts
// message.ts
export type MessageId = string & { readonly __brand: 'MessageId' }

export type MessageBody =
  | { readonly kind: 'user'; readonly text: string }
  | { readonly kind: 'assistant'; readonly text: string }
  | { readonly kind: 'tool'; readonly name: string; readonly input: string | null
      readonly state: 'running' | 'completed' | 'failed' }
  | { readonly kind: 'diff'; readonly path: string; readonly added: number
      readonly removed: number }
  | { readonly kind: 'notice'; readonly text: string }

export type Message = {
  readonly id: MessageId
  readonly sessionId: SessionId
  readonly body: MessageBody
  readonly createdAt: number
}
```

```ts
// task.ts
/** Something the agent needs the user to decide. PRD §5 "task steering and
 *  intervention" — this is the intervention surface. */
export type TaskId = string & { readonly __brand: 'TaskId' }

export type TaskPrompt =
  | { readonly kind: 'approval'; readonly summary: string }
  | { readonly kind: 'question'; readonly question: string }

export type TaskOption = {
  readonly id: string
  readonly label: string
  readonly isDefault: boolean
}

export type Task = {
  readonly id: TaskId
  readonly sessionId: SessionId
  readonly prompt: TaskPrompt
  readonly options: readonly TaskOption[]
  readonly resolution: 'pending' | 'resolved' | 'cancelled'
  readonly createdAt: number
}
```

```ts
// activity.ts
/** Terminal / process output. Opaque bytes plus framing, never parsed by core. */
export type ActivityFrame =
  | { readonly kind: 'snapshot'; readonly bytes: Uint8Array }
  | { readonly kind: 'output'; readonly bytes: Uint8Array }
  | { readonly kind: 'resized'; readonly cols: number; readonly rows: number }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'write-unavailable'; readonly reason: string }
```

### 2.1 Mapping honesty

The domain is *not* a rename of Orca's model. The relationships that differ:

| Domain      | Orca source                                                   | Note |
| ----------- | ------------------------------------------------------------- | ---- |
| `Project`   | `Repo` (`repo.list`)                                          | 1:1 |
| `Workspace` | `RuntimeWorktreePsSummary` / `RuntimeWorktreeRecord`          | 1:1; covers both `workspaceKind: 'git'` and `'folder-workspace'` |
| `Session`   | a session tab (`session.tabs.*`) **or** a structured agent session | many Orca concepts collapse into one controller concept |
| `Agent`     | `RuntimeWorktreeAgentRow` (keyed by `paneKey`) **or** `AgentSessionStatusSummary` (keyed by `sessionId`) | two producers, one domain entity; the adapter reconciles |
| `Message`   | `AgentJournalRenderItem` bodies (`message`, `toolCall`, `diff`) | subset; `turn` and `status` items become `Session`/`Agent` fields, not messages |
| `Task`      | `AgentJournalApprovalItem` / `AgentJournalQuestionItem`       | 1:1 |
| `Activity`  | terminal binary stream frames                                 | 1:1 with the opcodes core cares about |

## 3. Application ports

`src/gamepad/application/ports/`. Ports are types, not classes. Each lives in a
file named for the capability.

```ts
// subscription.ts — shared primitive, not a "util"
export type Unsubscribe = () => void

export type Subscription<T> = (listener: (value: T) => void) => Unsubscribe
```

```ts
// capability.ts
export type Capability = 'available' | 'unavailable' | 'unknown'
```

Per-feature port definitions live in that feature's `tech.md`. The foundation
defines only the shared result envelope:

```ts
// port-result.ts
export type PortFailureKind =
  | 'disconnected'       // no transport
  | 'unsupported'        // host does not implement the capability
  | 'refused'            // host answered with a refusal
  | 'timeout'
  | 'invalid-response'   // reply did not decode

export type PortFailure = {
  readonly kind: PortFailureKind
  readonly message: string
  /** True when a retry on reconnect is expected to succeed. */
  readonly retryable: boolean
}

export type PortResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: PortFailure }
```

A port method returns `PortResult`, never throws for an expected failure. It
throws only for a programmer error (a violated precondition).

## 4. Orca adapter

### 4.1 What it wraps

The adapter is a capability layer over the transport that already exists. It
does **not** reimplement any of:

| Existing module                                          | Responsibility the adapter reuses |
| -------------------------------------------------------- | --------------------------------- |
| `mobile/src/transport/direct-rpc-client.ts`              | LAN websocket RPC, reconnect, liveness |
| `mobile/src/transport/mobile-relay-physical-client.ts`   | relay transport |
| `mobile/src/transport/stable-logical-rpc-client.ts`      | logical client across physical cutover |
| `mobile/src/transport/rpc-operation.ts`                  | typed method + acceptance policy + reader |
| `mobile/src/transport/rpc-client-stream-registry.ts`     | subscription fan-out |
| `mobile/src/transport/terminal-stream-protocol.ts`       | binary terminal framing |
| `mobile/src/transport/mobile-e2ee-v2-client-session.ts`  | end-to-end encryption |
| `mobile/src/transport/host-store.ts`, `host-catalog-*`   | paired host catalog and credentials |

### 4.2 RPC descriptors

Every call is a descriptor in `src/gamepad/adapters/orca/rpc/`, one file per method
family:

```ts
// src/gamepad/adapters/orca/rpc/worktree-ps-operation.ts
export const worktreePsOperation = defineRpcOperation({
  method: 'worktree.ps',
  acceptance: 'require-result-or-throw',
  barrier: 'on-settle',
  read: readWorktreePsResult      // RpcCompatibleReader → variant + value
})
```

The reader returns a declared variant so a mixed-version reply is a *variant*,
not a decode failure:

```ts
type WorktreePsVariant = 'snapshot' | 'unchanged'
```

### 4.3 Method inventory by port

Full mapping (verified against
`src/shared/rpc-contract/rpc-params-catalog.generated.ts`):

| Port method                        | Orca RPC                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `ConnectionPort.probeHost`         | `status.get`                                                                |
| `PairingPort.getEndpoints`         | `pairing.getEndpoints`                                                      |
| `PairingPort.provisionRelay`       | `pairing.provisionRelay`                                                    |
| `ProjectCatalogPort.listProjects`  | `repo.list`                                                                 |
| `ProjectCatalogPort.getProject`    | `repo.show`                                                                 |
| `WorkspacePort.listWorkspaces`     | `worktree.ps` (conditional snapshot), `worktree.list` for full records      |
| `WorkspacePort.getWorkspace`       | `worktree.show`                                                             |
| `WorkspacePort.activateWorkspace`  | `worktree.activate`                                                         |
| `SessionPort.listSessions`         | `session.tabs.listAll`, `session.tabs.list`                                 |
| `SessionPort.subscribeToSessions`  | `session.tabs.subscribeAll` / `session.tabs.subscribe` (+ `…unsubscribe*`)  |
| `SessionPort.subscribeToAgentStatus` | `agentSession.subscribeStatus`                                            |
| `SessionPort.activateSession`      | `session.tabs.activate`                                                     |
| `AgentControlPort.getHistory`      | `agentSession.history`                                                      |
| `AgentControlPort.subscribeToSession` | `agentSession.subscribe` / `agentSession.unsubscribe`                    |
| `AgentControlPort.sendMessage`     | `agentSession.send`                                                         |
| `AgentControlPort.cancelTurn`      | `agentSession.cancel`                                                       |
| `AgentControlPort.respondToTask`   | `agentSession.respondToApproval`, `agentSession.respondToQuestion`          |
| `AgentControlPort.listCommands`    | `agentSession.commands`                                                     |
| `AgentControlPort.getOptions`      | `agentSession.options`, `agentSession.setOption`                            |
| `ActivityStreamPort.open`          | `terminal.subscribe` (binary frames) / `terminal.unsubscribe`               |
| `ActivityStreamPort.readSnapshot`  | `terminal.read`                                                             |
| `ActivityStreamPort.sendInput`     | `terminal.send` or stream opcode `Input = 7`                                |
| `ActivityStreamPort.resize`        | `terminal.resizeForClient`, `terminal.updateViewport`                       |
| `ActivityStreamPort.listActivity`  | `terminal.list`                                                             |
| `FileInspectionPort.readDirectory` | `files.readDir`                                                             |
| `FileInspectionPort.readPreview`   | `files.readPreview`, `files.readChunk`                                      |
| `FileInspectionPort.search`        | `files.search`, `files.searchPaths`                                         |
| `FileInspectionPort.stat`          | `files.stat`                                                                |
| `NotificationPort.register`        | `notifications.registerPush`                                                |
| `NotificationPort.subscribe`       | `notifications.subscribe` / `notifications.unsubscribe`                     |
| `NotificationPort.missedSince`     | `notifications.getMissedSince`                                              |

Methods deliberately **not** mapped for MVP: everything under `browser.*`,
`automation.*`, `orchestration.*`, `aiVault.*`, `artifacts.*`, `git.*`,
`github.*`, `gitlab.*`, `linear.*`, `jira.*`, `accounts.*`. They are reachable
from legacy screens but are not part of the controller port surface until a
PRD-driven requirement asks for them.

### 4.4 Capability negotiation

`src/gamepad/adapters/orca/protocol/` holds:

- `host-protocol-gate.ts` — reads `status.get` (`protocolVersion`,
  `minCompatibleMobileVersion`, `appVersion`) and produces a
  `HostCapabilities` record.
- `port-capability-map.ts` — maps each port method to `available` /
  `unavailable` / `unknown` from that record plus observed
  `method not found` refusals.

Rules:

- An absent field means "host predates it". Never coerce absence to `false`
  when `false` has meaning.
- A `method not found` refusal caches `unavailable` for the connection's
  lifetime and is cleared on reconnect to a different host version.
- `RUNTIME_PROTOCOL_VERSION` is 3 and `MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION`
  is 2 at time of writing (`src/shared/protocol-version.ts`). The adapter reads
  them; it does not hardcode them.

### 4.5 Streams

Three stream shapes reach the adapter, and each maps to a domain subscription:

| Orca stream                     | Frames                                                        | Domain subscription |
| ------------------------------- | ------------------------------------------------------------- | ------------------- |
| `agentSession.subscribe`        | `snapshot` \| `batch` \| `reset` \| `end`, with a `fence`      | `Message[]` + `Task[]` deltas |
| `agentSession.subscribeStatus`  | `snapshot` \| `status` \| `end`                                | `Agent` updates |
| `terminal.subscribe`            | binary frames, opcodes in `TerminalStreamOpcode`               | `ActivityFrame` |

Handling rules:

- A `reset` frame discards the client-side journal for that session and
  reseeds from the page it carries. Core must not attempt to merge across a
  reset.
- The `fence` is an ownership generation. A batch whose fence is lower than the
  last seen fence is dropped by the adapter, not surfaced.
- A binary frame with an unknown opcode is dropped silently by
  `decodeTerminalStreamFrame`. Therefore **no new opcode may be introduced by
  this fork without capability negotiation**
  ([`../../reference/remote-wire-compatibility.md`](../../reference/remote-wire-compatibility.md)
  Rule 2). The MVP introduces none.
- A stream that ends without an `end` frame (socket close) sets every affected
  `executionState` to `unverifiable`.

### 4.6 Agent reconciliation

Two producers describe the same agent:

- `worktree.ps` → `RuntimeWorktreeAgentRow`, keyed by `paneKey`, states
  `working | blocked | waiting | done`;
- `agentSession.subscribeStatus` → `AgentSessionStatusSummary`, keyed by
  `sessionId`, states `working | attention | idle`.

`src/gamepad/adapters/orca/mapping/agent-reconciliation.ts` owns the single join and
the single projection to `AgentActivity`:

| Source state                                       | `AgentActivity` |
| -------------------------------------------------- | --------------- |
| `working` (either producer)                        | `working`       |
| `blocked`, `waiting`, `attention`                  | `needs-input`   |
| `done`, `idle`                                     | `settled`       |
| row with `restoredUnconfirmed: true` and no live report | `unknown` + `staleFromRestore: true` |

Precedence: a summary carrying `hostExecutionOwned` wins over a `ps` row of any
age; otherwise the more recent `updatedAt` wins. This is decided once, in the
adapter. Features never re-adjudicate
([`../../reference/agent-status-store.md`](../../reference/agent-status-store.md)).

## 5. State

`src/gamepad/state/`.

### Remote state

One cache per entity kind, keyed `${connectionId}:${entityId}`. Invalidation
rules:

| Trigger                       | Effect                                                   |
| ----------------------------- | -------------------------------------------------------- |
| Connection lost               | entries kept, marked stale; `executionState` → `unverifiable` |
| Connection restored           | re-fetch; snapshot replaces, never merges                 |
| Host identity changed on reconnect | drop every entry for that connection id                |
| Stream `reset`                | drop that session's messages and tasks                    |

### Local UI state

Holds: selected connection, selected workspace, expanded tree nodes, filters,
sort order, per-session composer drafts.

Persistence is a port, not a direct reach. `PreferencesStorePort` lives in
`src/gamepad/application/ports/preferences-store.ts`;
`src/gamepad/adapters/device/preferences-store.ts` implements it over the
existing `mobile/src/storage/preferences.ts` and `session-view-preferences.ts`
— extend those, do not add a second persistence path. The port is what keeps
FND-R9 true: a standalone app swaps the device adapter and the state layer does
not notice.

### Connection state

The paired-host catalog and its credentials stay in the existing stores
(`mobile/src/transport/host-store.ts`, `host-metadata-store.ts`,
`host-device-token-store.ts`). `src/gamepad/adapters/orca/connection/host-catalog.ts`
wraps them and publishes `Connection` domain values through `ConnectionPort`.
Connection state re-persists nothing, and no module outside
`src/gamepad/adapters/` names a host store.

## 6. Failure modes

| Condition                              | Adapter behaviour                                | Feature behaviour |
| -------------------------------------- | ------------------------------------------------ | ----------------- |
| No transport                           | `PortFailure{kind:'disconnected', retryable:true}` | offline banner, cached data stays visible, mutations disabled |
| Host predates a method                 | `kind:'unsupported', retryable:false`             | hide or disable the affordance; never an error toast |
| Reply fails to decode                  | `kind:'invalid-response'`; log the dropped paths via the reader's salvage report | show a recoverable error with retry |
| Socket closes mid-stream               | emit a terminal `unverifiable` marker, then attempt resubscribe | show "connection lost, state unknown" — never "stopped" |
| Mutation reply ambiguous (sent, no ack) | surface the ambiguity; reuse `rpc-delivery-ambiguity.ts` | show "may have been delivered", do not auto-retry a send |

Mutating agent calls carry the `AgentSessionMutationEnvelope` (operation id +
fingerprint); the adapter must replay the same operation id on retry so the
host replays the recorded outcome instead of applying a second effect.

## 7. Cross-platform and remote constraints

- No `path` module outside `src/gamepad/adapters/`. A remote host may be Windows while the
  phone is Android; path separators arrive from the host and are rendered
  verbatim. Path joining belongs to the host, never the controller.
- `RuntimeWorktreePsSummary.terminalPlatform` tells the controller which
  platform a workspace's terminals run on; the terminal feature uses it for key
  labels, not `navigator.userAgent`.
- Every duration shown is computed from host-supplied epoch millis against a
  host-clock offset the adapter maintains (`AgentSessionHostClockField`), not
  from the phone clock.

## 8. Testing

| Level | Location | What it proves |
| ----- | -------- | -------------- |
| Boundary | `mobile/src/gamepad/gamepad-boundary.test.ts` | FND-R3, FND-AC1, AC2, AC6 — by static import analysis over `src/gamepad/` |
| Domain | colocated `*.test.ts` | invariants (e.g. a `Workspace` of kind `folder` has `branch === null`) |
| Mapping | `src/gamepad/adapters/orca/mapping/*.test.ts` | each Orca payload → domain value, with fixtures from `src/shared/__fixtures__` where they exist |
| Compatibility | `src/gamepad/adapters/orca/protocol/host-compatibility.test.ts` | every port method against: current host, a host at `MIN_COMPATIBLE_RUNTIME_CLIENT_VERSION`, and a host that refuses with `method not found` |
| Recording | reuse `mobile/src/test-support/rpc-recording/` | replays a scripted transport through the real operation layer |
| Extraction | `mobile/tsconfig.extraction.json` via `pnpm typecheck:extraction` | FND-AC3 |

Run with `pnpm test` from `mobile/`; typecheck with `pnpm typecheck` and
`pnpm typecheck:extraction`.

Three upstream ratchets already scan `mobile/{app,src}` and so cover the
adapter for free: `rpc-params-contract-type-only-boundary.test.ts` (host
contracts stay type-only), `unvalidated-rpc-request-port-boundary.test.ts`
(FND-AC4), and `rpc-operation-cast-fence.test.ts`.

Import depth is worth stating once: from `src/gamepad/adapters/orca/x.ts` the
desktop repo's shared tree is five levels up (`../../../../../src/shared/…`).
A wrong depth fails *open* in the type-only ratchet — it silently stops
covering the file — so get it right rather than relying on that test.

## 9. Open questions

1. **Session identity.** Orca has session tabs (`session.tabs.*`) *and*
   structured agent sessions (`agentSession.*`) with different ids. MVP treats
   the tab as the `Session` and carries the agent session id inside `Agent`.
   Revisit if a workspace can hold two agent sessions on one tab.
2. **Workspace list source.** `worktree.ps` carries agents, PR links, and
   previews in one conditional snapshot and is the cheaper subscription;
   `worktree.list` returns full records. MVP reads `ps` for lists and `show`
   for detail. Confirm `ps` truncation limits are acceptable at large repo
   counts (`RuntimeWorktreePsResult.truncated`).
3. **Push registration ownership.** Push is a host-level concern but is
   specified under `009-dashboard`. If a second feature needs it, promote
   `NotificationPort` to the foundation.
