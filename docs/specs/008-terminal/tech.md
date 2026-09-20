# 005 — Terminal & Activity — Technical Specification

## 1. Port

`mobile/src/gamepad/application/ports/activity-stream-port.ts`:

```ts
export type ActivityHandle = string & { readonly __brand: 'ActivityHandle' }

export type ActivityCapabilities = {
  readonly binaryStream: boolean
  readonly outputPause: boolean
  readonly writeAllowed: boolean
  readonly writeUnavailableReason: string | null
}

export type ActivityAttachment = {
  readonly handle: ActivityHandle
  readonly capabilities: ActivityCapabilities
  readonly frames: Subscription<ActivityFrame>
  readonly detach: () => void
}

export type ActivityViewport = {
  readonly cols: number
  readonly rows: number
}

export type ActivityStreamPort = {
  readonly attach: (id: ConnectionId, sessionId: SessionId, viewport: ActivityViewport)
    => Promise<PortResult<ActivityAttachment>>
  readonly readSnapshot: (id: ConnectionId, sessionId: SessionId)
    => Promise<PortResult<Uint8Array>>
  readonly sendInput: (id: ConnectionId, handle: ActivityHandle, bytes: Uint8Array)
    => Promise<PortResult<void>>
  readonly resize: (id: ConnectionId, handle: ActivityHandle, viewport: ActivityViewport)
    => Promise<PortResult<void>>
  readonly restoreHostViewport: (id: ConnectionId, handle: ActivityHandle)
    => Promise<PortResult<void>>
  readonly resolvePath: (id: ConnectionId, workspaceId: WorkspaceId, candidate: string)
    => Promise<PortResult<string | null>>
}
```

Core deals in bytes and framed events. It does not know about opcodes, headers,
or xterm.

## 2. Orca mapping

| Port method           | Orca RPC / protocol |
| --------------------- | ------------------- |
| `attach`              | `terminal.subscribe` (handshake) → binary stream |
| `readSnapshot`        | `terminal.read` |
| `sendInput`           | stream opcode `Input = 7`, or `terminal.send` when the binary stream is unavailable |
| `resize`              | `terminal.resizeForClient` with `mode: 'mobile-fit'`, and `terminal.updateViewport` |
| `restoreHostViewport` | `terminal.resizeForClient` with `mode: 'restore'` |
| `resolvePath`         | `files.resolveTerminalPath` |
| `detach`              | `terminal.unsubscribe` |

The terminal handle comes from `006-sessions`: a terminal tab in
`RuntimeMobileSessionTerminalClientTab` carries `status` and `terminal`
(the handle) — `pending-handle` means no handle yet.

Unmapped: `terminal.split`, `terminal.multiplex`, `terminal.adoptOrphans`,
`terminal.inspectProcess`, `terminal.recoverPane`, `terminal.sleep`,
`terminal.stop`, `terminal.focus`, `terminal.show`, `terminal.rename`,
`terminal.setDisplayMode`, `terminal.clearBuffer`.

### 2.1 Subscribe handshake

`TerminalSubscribe` (`src/shared/rpc-contract/terminal-stream-params.ts`):

```ts
{ terminal,
  client: { id, type: 'mobile' },
  viewport?,
  capabilities?: {
    terminalBinaryStream?: 1,
    desktopViewportClaims?: 1,
    mobileInputLeaseOnly?: 1,
    writeUnavailable?: 1
  } }
```

The controller advertises `terminalBinaryStream: 1` and `writeUnavailable: 1`.
It advertises `mobileInputLeaseOnly: 1` so the host knows the phone is not
claiming the desktop's input ownership, and it does **not** advertise
`desktopViewportClaims` — a phone must not claim the desktop viewport (TERM-R6,
TERM-AC4).

The host echoes the capabilities it accepted on the `subscribed` event. The
client uses only echoed capabilities.

### 2.2 Stream opcodes

`TerminalStreamOpcode` (`src/shared/terminal-stream-protocol.ts`), 16-byte
header, version 1:

| Opcode | Name             | Direction | Controller use |
| ------ | ---------------- | --------- | -------------- |
| 1      | `Output`         | host→client | `ActivityFrame{kind:'output'}` |
| 2/3/4  | `SnapshotStart` / `SnapshotChunk` / `SnapshotEnd` | host→client | assembled into one `ActivityFrame{kind:'snapshot'}` |
| 5      | `Resized`        | host→client | `ActivityFrame{kind:'resized'}` |
| 6      | `Error`          | host→client | `ActivityFrame{kind:'error'}` |
| 7      | `Input`          | client→host | `sendInput` |
| 8      | `Resize`         | client→host | viewport change |
| 9/10   | `Subscribe` / `Unsubscribe` | client→host | attach / detach |
| 11     | `SnapshotRequest`| client→host | re-request on desync |
| 12     | `Metadata`       | host→client | ignored by core |
| 13     | `Ack`            | both      | flow control |
| 14     | `ClaimViewport`  | client→host | **never sent** (TERM-R6) |
| 15     | `OutputSpan`     | host→client | treated as `Output` |
| 16     | `SetOutputPaused`| client→host | backpressure, only if `outputPause` echoed |
| 17     | `WriteUnavailable` | host→client | disables input with the carried reason |

**No new opcode is added.** Opcode numbers are permanent; an unknown opcode is
dropped silently by `decodeTerminalStreamFrame`, so an un-negotiated addition
would hang rather than fail (TERM-R8).

### 2.3 Snapshot assembly

`SnapshotStart` … `SnapshotChunk`* … `SnapshotEnd` is assembled by the adapter
into a single `ActivityFrame{kind:'snapshot'}`. Rules:

- Output frames arriving *during* assembly are buffered and applied after the
  snapshot, in arrival order, so the screen is never a mix of old and new.
- An incomplete snapshot (stream closes before `SnapshotEnd`) is discarded, not
  partially applied; the adapter emits `error` and re-requests on resubscribe.
- Assembly is byte-bounded; a snapshot exceeding the bound is truncated at the
  *top* (oldest content) and flagged.

### 2.4 Backpressure

- The renderer acknowledges consumed bytes (`Ack = 13`).
- If the unconsumed buffer exceeds the bound and `outputPause` was negotiated,
  the adapter sends `SetOutputPaused` and resumes when drained.
- If `outputPause` was not negotiated, the adapter drops the oldest buffered
  output and emits a `notice` so the UI can say output was elided (TERM-R2).

### 2.5 Read-only fallback

When `terminalBinaryStream` is not echoed:

```text
attach → terminal.read (snapshot)
       → poll terminal.read on an interval while focused
       → sendInput via terminal.send
```

The UI labels the surface as polled. This is TERM-AC5.

### 2.6 Viewport

- `resize` uses `terminal.resizeForClient` `{ mode: 'mobile-fit', cols, rows, clientId }`.
- `detach` calls `{ mode: 'restore', clientId }`.
- `clientId` is the stable per-install client id already used by the transport.
- `terminal.updateViewport` reports the visible window for scrollback purposes;
  it does not resize the PTY.

## 3. Rendering

The existing terminal renderer is an xterm engine inside a WebView
(`mobile/src/terminal/terminal-webview-*`, built by
`mobile/scripts/build-terminal-webview-engine.mjs`). **Reuse it.** This feature
changes what feeds the engine, not the engine.

Boundary: `src/gamepad/features/terminal/components/TerminalSurface.tsx` accepts
`ActivityFrame`s and forwards bytes to the WebView through
`src/gamepad/adapters/device/terminal-webview-host.tsx`, a thin pass-through
over the existing `terminal-webview-contract.ts`. The engine is a build
artifact of the upstream tree (`postinstall`), so the feature must not import
it directly — keep the wrapper thin or the boundary starts fighting the
renderer. No protocol knowledge lives in the WebView bridge.

## 4. Feature structure

```text
mobile/src/gamepad/features/terminal/
├── screens/
│   └── TerminalSessionScreen.tsx
├── components/
│   ├── TerminalSurface.tsx
│   ├── AccessoryKeyRow.tsx
│   ├── QuickCommandBar.tsx
│   └── OutputElidedNotice.tsx
├── hooks/
│   ├── use-activity-stream.ts
│   └── use-terminal-viewport.ts
└── state/
    ├── terminal-input-gate.ts
    └── accessory-key-layout.ts
```

Reuse from today's tree: `terminal-accessory-keys.ts`,
`terminal-accessory-layout.ts`, `terminal-accessory-repeat.ts`,
`terminal-key-definitions.ts`, `quick-commands.ts`,
`terminal-keyboard-avoidance-*`, `terminal-viewport-refit*`,
`terminal-file-url-tap.ts`, `terminal-path-tap.ts`,
`terminal-input-connection-gate.ts`. Migrate; do not fork.

## 5. Host-platform key labelling

`RuntimeWorktreePsSummary.terminalPlatform` (a `NodeJS.Platform`) is retained
adapter-side by `005-projects` and supplied to this feature as
`hostPlatform: 'mac' | 'windows' | 'linux' | 'unknown'`.

```text
hostPlatform 'mac'      → ⌃ / ⌥ / ⌘ labels
hostPlatform 'windows'  → Ctrl / Alt
hostPlatform 'linux'    → Ctrl / Alt
hostPlatform 'unknown'  → Ctrl / Alt   (the safe default for a shell)
```

`navigator.userAgent` must not appear in this feature. The phone's platform
governs only phone-side gestures and keyboard avoidance.

## 6. Input gating

Input is enabled only when all hold:

```text
session.executionState === 'live'
connection.reachability === 'connected'
capabilities.writeAllowed === true
terminal handle present (not 'pending-handle')
```

Otherwise input is disabled and the reason is shown, in that precedence order.
`WriteUnavailable` (opcode 17) flips `writeAllowed` to false and carries the
reason string (TERM-AC6).

## 7. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| Stream closes without `end` | `unverifiable`; "connection lost, output may be incomplete"; resubscribe with backoff and a fresh snapshot (TERM-AC9) |
| Snapshot incomplete | discard, re-request |
| `terminal.subscribe` refused | fall back to read-only polling (§2.5) |
| Handle not yet ready | show the session, disable input, poll for readiness from the session subscription — do not poll the terminal |
| Scrollback cap reached | drop oldest, mark the top of the buffer |
| Path resolution fails | show "could not resolve this path"; never open a guessed path |
| Host sends an unknown opcode | dropped by the decoder; the adapter counts it and logs once per stream |

## 8. Testing

| Test | Proves |
| ---- | ------ |
| `terminal-capability-handshake.test.ts` | §2.1 — advertises the right set, never `desktopViewportClaims`, uses only echoed capabilities |
| `snapshot-assembly.test.ts` | §2.3 incl. interleaved output and incomplete snapshots (TERM-AC1) |
| `terminal-backpressure.test.ts` | §2.4 with and without `outputPause` (TERM-AC2) |
| `terminal-read-only-fallback.test.ts` | §2.5 (TERM-AC5) |
| `terminal-viewport-mode.test.ts` | §2.6 — never `ClaimViewport`, restore on detach (TERM-AC4) |
| `accessory-key-host-platform.test.ts` | §5 (TERM-AC7) |
| `terminal-input-gate.test.ts` | §6 precedence (TERM-AC6) |
| `terminal-stream-loss.test.ts` | TERM-AC9 — no path yields `exited` |
| `terminal-path-tap.test.ts` | TERM-AC10 |

A recorded PTY transcript is required for any rule that reads what an agent
paints on screen — capture it per
[`../../reference/agent-pty-transcript-capture.md`](../../reference/agent-pty-transcript-capture.md),
never from memory. MVP adds no such rule; this note stands for anyone who
later wants one.
