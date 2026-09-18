# 001 — Pairing & Connection — Technical Specification

## 1. Ports

`mobile/src/gamepad/application/ports/connection-port.ts`:

```ts
export type PairingOffer = {
  readonly endpoint: string
  readonly hostLabel: string
  readonly mode: 'local-only' | 'anywhere'
  readonly protocolVersion: number | null
}

export type PairingRejection =
  | { readonly kind: 'malformed' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'unsupported-version'; readonly hostVersion: number
      readonly clientMinimum: number }
  | { readonly kind: 'relay-unavailable'; readonly reason: string }

export type PairingPort = {
  readonly parseOffer: (scanned: string) => PairingOffer | PairingRejection
  readonly pair: (offer: PairingOffer) => Promise<PortResult<Connection>>
  readonly pairManually: (endpoint: string, label: string) => Promise<PortResult<Connection>>
  readonly unpair: (id: ConnectionId) => Promise<PortResult<void>>
}

export type ConnectionEvent = {
  readonly connectionId: ConnectionId
  readonly at: number
  readonly level: 'info' | 'warn' | 'error'
  readonly code: string
  readonly message: string
}

export type ConnectionPort = {
  readonly listConnections: () => Promise<PortResult<readonly Connection[]>>
  readonly observeConnections: Subscription<readonly Connection[]>
  readonly connect: (id: ConnectionId) => Promise<PortResult<Connection>>
  readonly disconnect: (id: ConnectionId) => Promise<PortResult<void>>
  readonly retryNow: (id: ConnectionId) => Promise<PortResult<void>>
  readonly observeEvents: (id: ConnectionId) => Subscription<readonly ConnectionEvent[]>
  readonly capabilityOf: (id: ConnectionId, method: string) => Capability
}
```

`parseOffer` is synchronous and pure so the scan screen can validate before it
opens a socket.

## 2. Orca mapping

| Port method                   | Orca RPC / module                                                   |
| ----------------------------- | ------------------------------------------------------------------- |
| `parseOffer`                  | existing QR decode in `mobile/src/transport/` pairing modules; `src/shared/mobile-pairing-connection-mode.ts` for mode resolution |
| `pair`                        | `pairing.getEndpoints`, then `pairing.provisionRelay` when mode is `anywhere` |
| `pairManually`                | endpoint probe (`mobile-direct-endpoint-probe.ts`) then `status.get`  |
| `connect` / `disconnect`      | existing logical client registry (`host-logical-client.ts`, `host-client-acquisition-registry.ts`) |
| `retryNow`                    | `rpc-client-reconnect-schedule.ts` forced attempt                    |
| `capabilityOf`                | `status.get` + the capability map from `000-foundation`               |
| `observeEvents`               | `direct-connection-log.ts` / `connection-log-buffer.ts`               |
| `unpair`                      | `host-removal-lifecycle.ts`, `host-credential-cleanup.ts`, `unpaired-host-credential-deletion.ts` |

### 2.1 Pairing result shapes

`pairing.getEndpoints` returns `PairingGetEndpointsResult`
(`src/shared/mobile-relay-credential-contract.ts`):

```ts
{ v: 1
  relay: { v: 1, directorUrl, cellUrl, assignmentEpoch, relayHostId, e2eeFraming: 2 } | null
  installStatus?: DeviceCredentialInstallStatusResult
  resumeConfirmation?: DeviceResumeConfirmed }
```

`relay: null` means the host has no relay assignment — the adapter maps this to
a local-only `Connection`, and `pair` reports
`PairingRejection{kind:'relay-unavailable'}` when the offer asked for
`anywhere`.

`e2eeFraming: 2` is the only accepted framing. A different value is
`unsupported-version`.

### 2.2 Version gate

`status.get` supplies `appVersion`, `protocolVersion`,
`minCompatibleMobileVersion` (`mobile/src/worktree/host-worktree-rpc-types.ts`,
`DesktopStatus`). The gate:

```text
host.protocolVersion < MIN_COMPATIBLE_RUNTIME_SERVER_VERSION   → host too old
CLIENT_PROTOCOL_VERSION < host.minCompatibleMobileVersion      → app too old
otherwise                                                      → compatible, capabilities derived
```

An absent `protocolVersion` means a host that predates the field: treat as
version 1 for the gate and mark every optional capability `unknown`.

## 3. Feature structure

```text
mobile/src/gamepad/features/pairing/
├── screens/
│   ├── HostCatalogScreen.tsx
│   ├── PairScanScreen.tsx
│   ├── PairConfirmScreen.tsx
│   ├── ManualEndpointScreen.tsx
│   └── ConnectionLogScreen.tsx
├── components/
│   ├── ConnectionStatusChip.tsx
│   ├── HostCatalogRow.tsx
│   └── PairingModeSelector.tsx
├── hooks/
│   ├── use-connection-catalog.ts
│   └── use-pairing-flow.ts
└── state/
    └── pairing-flow-state.ts
```

Existing routes `mobile/app/pair.tsx`, `pair-scan.tsx`, `pair-confirm.tsx`,
`connection-log.tsx`, `troubleshoot.tsx` become thin wrappers that render these
screens. The route files keep their paths so deep links and the existing
onboarding flow do not break.

## 4. State

- **Connection store** owns: catalog, per-host `Connection`, per-host event
  ring buffer, per-host capability record.
- **Local UI** owns: selected host id, pairing wizard step, manual-entry draft.
- **Remote state** is dropped for a connection id on unpair and on host
  identity change; see `000-foundation` `tech.md` §5.

Reconnect ownership stays with the transport. The feature subscribes; it does
not schedule.

## 5. UX rules

- The connection chip uses semantic status tokens from
  [`../../STYLEGUIDE.md`](../../STYLEGUIDE.md). No raw palette colors.
- Status text is the vocabulary from PAIR-R5 verbatim. "Offline", "lost",
  "dead", and "stopped" are forbidden strings for connection state — enforced
  by a copy test.
- The scan screen must state which mode the QR encodes *before* pairing
  completes, so PAIR-AC2 is visible at the decision point.
- Retry affordance appears only when `reachability === 'unreachable'`.

## 6. Security

- Credentials stay in `expo-secure-store` via the existing
  `host-device-token-store.ts`. This feature adds no new secret storage.
- `ConnectionEvent.message` is produced by a redacting serializer. The
  redaction list covers device tokens, relay credentials, E2EE public keys,
  and any `Authorization` header value. Tested by PAIR-AC9.
- Unpair deletes: device token, relay credential, cached host metadata,
  remote-state entries. It does not delete user preferences that are not
  host-specific.

## 7. Cross-platform

- QR scanning uses `expo-camera`; the manual path must remain fully functional
  where camera permission is denied (PAIR-R2 is not a fallback, it is a
  supported path).
- Endpoint validation accepts IPv4, IPv6 (bracketed), and hostnames. The
  emulator loopback `10.0.2.2` must validate.
- Foreground-resume handling differs by platform; reuse
  `connection-revival-triggers.ts` rather than adding platform branches in the
  feature.

## 8. Failure modes

| Condition                        | Behaviour |
| -------------------------------- | --------- |
| QR decodes but endpoint unreachable | host is saved, row shows `unreachable`, retry available |
| Relay provisioning fails          | pairing completes as local-only with an explicit notice; `mobile-relay-mint-failure.ts` supplies the reason |
| Auth rejected on reconnect        | row shows `unreachable` with an "unpair and pair again" action; credentials are not auto-deleted |
| Host answers with a different identity than stored | drop the connection's remote state, keep the credential, warn the user |
| Airplane mode                     | one transition to `unreachable`; the schedule pauses rather than burning its attempt limit |

## 9. Testing

| Test | Proves |
| ---- | ------ |
| `parse-pairing-offer.test.ts` | every `PairingRejection` variant from a crafted payload |
| `pairing-mode-resolution.test.ts` | PAIR-AC2 against `effectiveMobilePairingConnectionMode` |
| `connection-version-gate.test.ts` | PAIR-AC6, AC7, and the absent-field rule |
| `connection-event-redaction.test.ts` | PAIR-AC9 |
| `connection-loss-verdict.test.ts` | PAIR-AC4 / PAIR-R7 — no path produces `exited` from a transport event |
| `host-catalog-independence.test.ts` | PAIR-AC3 |
| connection-log copy test | forbidden connection-state strings absent from UI copy |

Device-level checks (camera, background resume) are manual for MVP and listed
in the task file.
