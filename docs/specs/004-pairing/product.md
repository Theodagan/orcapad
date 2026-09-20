# 001 — Pairing & Connection

## Purpose

Get a phone talking to one or more Orca hosts, keep it talking, and make the
state of that link legible. PRD §6 makes Orca the backend the fork reuses;
nothing in §5 is reachable until this link exists.

For a controller, the connection *is* a first-class object. A mobile IDE can
treat the network as plumbing; a controller cannot — when the link is down, the
honest answer about remote work is "unknown", and the user needs to see why.

## Scope

**In scope**

- Pairing a device with a host by QR scan, and by manual endpoint entry.
- Choosing the connection path: local-only (LAN) or anywhere (relay).
- A host catalog: several paired hosts, one selected, each with independent
  connection state.
- Connection lifecycle: connect, reconnect, foreground resume, disconnect.
- Connection legibility: current path, host version, last contact, and a
  connection log the user can read and share.
- Unpairing and credential removal.

**Out of scope**

- Changing the pairing protocol, the QR payload, or the E2EE handshake. This
  feature consumes `mobile/src/transport/` as-is.
- Desktop-side pairing UI.
- Account sign-in (relay requires a signed-in desktop; the phone does not sign in).

## Controller surface

Operated entirely through `001`'s intents; this feature owns no input of its own
and never reads the controller port. Wheel segments are contributed to `002`'s
registry with an `availability`, so the ring's shape stays stable.

| Pane | Accepts | Notes |
| ---- | ------- | ----- |
| Host catalog | `move-selection`, `confirm`, `scroll` | `confirm` connects to the selected host |
| Manual endpoint | text target | the one place a controller user must type; `R3` dictation is the intended path |
| Connection log | `scroll` | read-only |

Wheel segments: reconnect now, forget host, open connection log.

`confirm` on an already-connected host opens it rather than reconnecting —
reconnecting a healthy link is a wheel action, not the default.

## Requirements

### PAIR-R1 — Pair by QR

The user scans a QR displayed by Orca desktop (Settings → Mobile). On success
the host appears in the catalog with a label, an endpoint, and a stored device
credential. A scanned code that is malformed, expired, or for an unsupported
protocol version produces a specific message — not "pairing failed".

### PAIR-R2 — Pair by manual endpoint

The user can enter `ws://<host>:<port>` directly. This covers the Android
emulator (`ws://10.0.2.2:6768`) and LAN addresses where a camera is
unavailable. Validation happens before a connection attempt.

### PAIR-R3 — Connection path choice

Two paths, per `src/shared/mobile-pairing-connection-mode.ts`:

- **Anywhere** (`automatic`) — relay; requires a signed-in desktop at QR time.
- **Local only** (`local-only`) — LAN direct.

The default is Anywhere. When the desktop is signed out, the offer degrades to
local-only and the UI says so at mint time rather than failing silently later.

### PAIR-R4 — Multiple hosts

The catalog holds N hosts. Each has its own connection state, credentials, and
capability record. Selecting a host does not disconnect the others; the
controller may hold background connections where the platform allows.

### PAIR-R5 — Connection state is visible and named

Every host row shows exactly one of: `connected`, `connecting`, `unreachable`.
The selected host additionally shows: path in use (`local` / `relay`), host app
version, protocol version, and time since last contact.

### PAIR-R6 — Reconnect is automatic and observable

The app reconnects on: transport loss, app foreground, and network change. The
user sees that a retry is in progress and can force one. Retry backoff and the
attempt limit come from the existing
`mobile/src/transport/rpc-client-reconnect-schedule.ts`; this feature does not
introduce a second scheduler.

### PAIR-R7 — Loss of contact never asserts process death

When a connection drops, the controller shows remote work as *unknown*, not
stopped. No screen may render "agent stopped" or "session ended" purely from a
transport event.

### PAIR-R8 — Version incompatibility is explained

If the host is older than `MIN_COMPATIBLE_RUNTIME_SERVER_VERSION`, or the host
requires a client newer than this build, the user gets a message naming which
side needs updating and the two version numbers. The host stays in the catalog.

### PAIR-R9 — Connection log

A per-host log of connection events (attempt, open, close with code, auth
failure, retry scheduled) that the user can open and copy. Backed by the
existing `direct-connection-log.ts` / `connection-log-buffer.ts`.

### PAIR-R10 — Unpair

Removing a host deletes its device credential and any cached remote state for
that connection id, and stops its reconnect schedule. The action is
confirmed, and the confirmation names what is deleted.

### PAIR-R11 — No secret leaves the device un-prompted

Device tokens, relay credentials, and the E2EE key material are never included
in a copied connection log, a shared diagnostic, or an error report.

## Acceptance criteria

- **PAIR-AC1** — A valid QR pairs and reaches `connected` without any manual
  step beyond confirming the host label.
- **PAIR-AC2** — A QR minted for `automatic` on a signed-out desktop is shown
  in the app as a local-only pairing, with the reason stated.
- **PAIR-AC3** — Three paired hosts each display an independent state; taking
  one host offline changes only that row.
- **PAIR-AC4** — Killing the host mid-session moves the connection to
  `unreachable` within the liveness watchdog interval, and every session for
  that connection reads `unverifiable`. No session reads `exited`.
- **PAIR-AC5** — Backgrounding the app for five minutes and returning
  reconnects without user action, and refreshes the workspace list.
- **PAIR-AC6** — Pairing against a host at the minimum compatible protocol
  version succeeds, and capabilities the host lacks are reported as
  `unavailable` rather than producing errors.
- **PAIR-AC7** — Pairing against a host below the minimum shows the version
  message from PAIR-R8.
- **PAIR-AC8** — Unpairing removes the credential from secure storage; a
  subsequent connect attempt to the same endpoint requires a new pairing.
- **PAIR-AC9** — A copied connection log contains no token, key, or credential
  substring. Asserted by a test over the log serializer.
- **PAIR-AC10** — Airplane-mode toggle produces at most one visible state
  transition per host and no duplicate reconnect loops.

## Non-goals

- A network diagnostics suite beyond the existing troubleshoot screen.
- Changing default ports or the discovery mechanism.
