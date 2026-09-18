# 006 — Dashboard — Technical Specification

## 1. Ports

The dashboard is mostly a **use case** over ports other features own. It adds
one port of its own.

`mobile/src/gamepad/application/ports/notification-port.ts`:

```ts
export type PushFilter = {
  readonly onlyWhenDesktopAway: boolean
  readonly sound: boolean
}

export type PushRegistrationOutcome =
  | { readonly kind: 'registered'; readonly registrationId: string }
  | { readonly kind: 'refused'; readonly reason: string; readonly retryable: boolean }

export type HostNotification = {
  readonly id: string
  readonly connectionId: ConnectionId
  readonly workspaceId: WorkspaceId | null
  readonly sessionId: SessionId | null
  readonly source: 'agent-task-complete' | 'terminal-bell' | 'plugin'
  readonly title: string
  readonly body: string
  readonly seq: number
  readonly epoch: string
  readonly at: number
}

export type NotificationWatermark = {
  readonly seq: number
  readonly epoch: string | null
}

export type NotificationPort = {
  readonly registerPush: (id: ConnectionId, token: string, filter: PushFilter)
    => Promise<PortResult<PushRegistrationOutcome>>
  readonly unregisterPush: (id: ConnectionId) => Promise<PortResult<void>>
  readonly observeNotifications: (id: ConnectionId) => Subscription<HostNotification>
  readonly catchUp: (id: ConnectionId, watermark: NotificationWatermark)
    => Promise<PortResult<readonly HostNotification[]>>
}
```

The dashboard's own use case:

```ts
// src/gamepad/application/use-cases/build-attention-queue.ts
export type AttentionItem = {
  readonly key: string
  readonly connectionId: ConnectionId
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId | null
  readonly reason: 'question' | 'approval' | 'needs-input' | 'finished'
  readonly label: string
  readonly since: number
}

export type AttentionQueue = {
  readonly items: readonly AttentionItem[]
  readonly unknownConnections: readonly ConnectionId[]
}
```

It composes `WorkspacePort`, `SessionPort`, and `AgentControlPort`. It performs
no RPC of its own and defines no new adapter surface.

## 2. Orca mapping

| Port method             | Orca RPC |
| ----------------------- | -------- |
| `registerPush`          | `notifications.registerPush` |
| `unregisterPush`        | `notifications.unregisterPush` |
| `observeNotifications`  | `notifications.subscribe` / `notifications.unsubscribe` |
| `catchUp`               | `notifications.getMissedSince` |

`notifications.testPush` is used only by a developer-facing troubleshoot
action, not by the dashboard.

### 2.1 Registration

`NotificationRegisterPushParams`
(`src/shared/rpc-contract/notifications-params.ts`) is `.strict()`:

```ts
{ platform: 'ios' | 'android',
  token,
  apnsEnvironment?: 'sandbox' | 'production',   // REQUIRED when platform is 'ios'
  filter: { onlyWhenDesktopAway?, sound? } }
```

- The device identity is added by the host handler. A client-supplied
  `deviceId` is an error, not a dropped key — the adapter must not send one.
- `apnsEnvironment` is mandatory on iOS: an APNs token is routable only against
  the environment it was minted in. The adapter refuses to send an iOS
  registration without it (DASH-AC4), before the request is made.
- `MobilePushRegisterResult` refusal reasons map to retryability:

| Reason                        | `retryable` | UI |
| ----------------------------- | ----------- | -- |
| `gateway_unreachable`         | true        | retry on reconnect |
| `registration_storage_failed` | true        | retry on reconnect |
| `throttled`                   | false       | silent; prior route intact (DASH-AC8) |
| `gateway_rejected`            | false       | show the reason once |
| `not_mobile`                  | false       | show the reason once |

### 2.2 Catch-up

`NotificationGetMissedSinceParams`:

```ts
{ lastSeenSeq,               // highest seq already delivered
  epoch?,                    // the counter lifetime that seq came from
  includeDesktopSuppressed?,
  deliveredPushes?           // up to 256 { notificationId, notificationEpoch, notificationSeq }
}
```

Semantics the client relies on and must not re-implement:

- The host assigns a monotonic `seq` to every dispatched notification, so the
  cut is exact and idempotent: re-requesting with the same watermark cannot
  return an already-delivered event (DASH-AC5).
- `epoch` names the counter lifetime. The host's `seq` restarts at 0 on every
  launch while the client's watermark is persisted; without `epoch` a
  post-restart watermark silently cuts away everything (DASH-AC6). `epoch` is
  optional on the wire for old clients — this client always sends it once it
  has one.
- `deliveredPushes` lets the client name pushes the OS already delivered so the
  host does not re-send them. Capped at 256; the client sends the most recent.

Watermark persistence: `{ seq, epoch }` per connection, in local UI state.
On an epoch mismatch the client resets `seq` to 0 for the new epoch and
re-reads, rather than dropping the window.

### 2.3 Notification → attention item

A `HostNotification` with `source: 'agent-task-complete'` and the host's agent
state (`needs-input` | `finished`, `MOBILE_PUSH_AGENT_STATES`) becomes an
attention item of reason `needs-input` or `finished`. `terminal-bell` and
`plugin` notify but do not enter the attention queue — they are not blocked on
a decision.

## 3. Attention queue assembly

```text
inputs:
  WorkspacePort snapshots   → workspaces with attention 'needs-input' | 'done'
  SessionPort agent feed    → agents with activity 'needs-input'
  AgentControlPort tasks    → pending approvals and questions per open session
  HostNotification stream   → items for sessions not currently observed
```

Dedup key: `${connectionId}:${sessionId ?? workspaceId}:${reason}`. A pending
task and a `needs-input` agent for the same session collapse into one item,
keeping the task (it is more specific).

Ordering (DASH-R2):

```text
1. reason 'question'     asc by since
2. reason 'approval'     asc by since
3. reason 'needs-input'  asc by since
4. reason 'finished'     desc by since
```

`unknownConnections` lists connections that are not `connected`; the UI renders
their contribution as unknown rather than omitting them (DASH-AC3).

The queue never derives attention from raw agent rows — it consumes the
projections from `002` and `003`, which come from the one reconciliation in
`000-foundation` §4.6.

## 4. Feature structure

```text
mobile/src/gamepad/features/dashboard/
├── screens/
│   └── DashboardScreen.tsx
├── components/
│   ├── AttentionQueueList.tsx
│   ├── AttentionItemRow.tsx
│   ├── WorkingSummaryStrip.tsx
│   ├── ConnectionStrip.tsx
│   └── RecentsRow.tsx
├── hooks/
│   ├── use-attention-queue.ts
│   └── use-push-registration.ts
└── state/
    ├── recents-store.ts
    └── notification-watermark.ts
```

Reuse: `mobile/src/home/*` already implements a home screen with host lists and
resume cards; migrate its list mechanics into
`src/gamepad/features/dashboard/` rather than writing new ones.
`mobile/src/notifications/` owns the Expo notification plumbing and the
`orca-notification-dismissal` native module — that stays upstream and is reached
through `src/gamepad/adapters/device/`, which is also where `NotificationPort`'s
device half is implemented. Add `mobile/src/notifications` to
`ADAPTER_UPSTREAM_REACH` when this lands.

## 5. Deep links

A notification payload carries connection, workspace, and session identity. The
handler:

```text
cold start  → build stack: connection → workspace → session
warm start  → push session onto the existing stack if the workspace matches,
              else rebuild
```

Reuse `mobile/src/navigation/host-stack-navigation.ts` through the same
`src/gamepad/adapters/device/` wrapper `003-sessions` introduces. Deep-link handling must
be resilient to a workspace that no longer exists: land on the workspace list
with a "that session is gone" notice, never a blank screen.

## 6. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| Push unsupported by host | one-time notice; dashboard polls (DASH-R12) |
| Registration `throttled` | silent, keep previous registration |
| OS push permission denied | dashboard works; a banner offers to open settings, shown at most once per install |
| Catch-up returns more than the UI can hold | keep the newest, count the rest, and say so |
| Epoch mismatch | reset `seq` for the new epoch, re-read |
| Notification for an unpaired host | drop it and clear its watermark |

## 7. Testing

| Test | Proves |
| ---- | ------ |
| `attention-queue-ordering.test.ts` | §3 ordering (DASH-AC1) |
| `attention-queue-dedup.test.ts` | §3 dedup key |
| `attention-queue-unknown.test.ts` | DASH-AC3 |
| `push-registration-params.test.ts` | §2.1 incl. iOS environment refusal (DASH-AC4) and no `deviceId` |
| `push-registration-retry.test.ts` | §2.1 retryability table (DASH-AC8) |
| `notification-catch-up.test.ts` | §2.2 idempotence (DASH-AC5) and epoch reset (DASH-AC6) |
| `notification-deep-link.test.ts` | DASH-AC7 incl. the missing-workspace path |
| `recents-store.test.ts` | DASH-AC9 |
