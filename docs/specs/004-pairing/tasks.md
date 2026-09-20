# 001 — Pairing & Connection — Tasks

- [ ] **PAIR-T1 — Ports**

  Add `connection-port.ts` and `pairing-port.ts` under
  `mobile/src/gamepad/application/ports/` per `tech.md` §1.

  **Verify:** `pnpm typecheck`; layering test stays green.

- [ ] **PAIR-T2 — Offer parsing**

  `src/gamepad/adapters/orca/pairing/parse-pairing-offer.ts` — pure decode of a scanned
  payload into `PairingOffer | PairingRejection`, reusing the existing QR payload
  decode and `src/shared/mobile-pairing-connection-mode.ts`.

  **Verify:** `pnpm test src/gamepad/adapters/orca/pairing/parse-pairing-offer.test.ts`

- [ ] **PAIR-T3 — Pairing adapter**

  `src/gamepad/adapters/orca/pairing/pairing-adapter.ts` implementing `PairingPort` over
  `pairing.getEndpoints` and `pairing.provisionRelay`, with descriptors in
  `src/gamepad/adapters/orca/rpc/pairing-operations.ts`.

  Covers: relay-null degradation, `e2eeFraming` check, install-status and
  resume-confirmation passthrough.

  **Verify:** `pnpm test src/gamepad/adapters/orca/pairing`

- [ ] **PAIR-T4 — Connection adapter**

  `src/gamepad/adapters/orca/transport/connection-adapter.ts` implementing
  `ConnectionPort` over the existing logical client registry and reconnect
  schedule. No new socket, scheduler, or watchdog.

  **Verify:** `pnpm test src/gamepad/adapters/orca/transport/connection-adapter.test.ts`

- [ ] **PAIR-T5 — Version gate**

  `src/gamepad/adapters/orca/protocol/connection-version-gate.ts` implementing
  `tech.md` §2.2 on top of the `000-foundation` protocol gate.

  **Verify:** `pnpm test src/gamepad/adapters/orca/protocol/connection-version-gate.test.ts`

- [ ] **PAIR-T6 — Event redaction**

  `src/gamepad/adapters/orca/transport/connection-event-redaction.ts` wrapping the
  existing connection log, with the redaction list from `tech.md` §6.

  **Verify:** `pnpm test …/connection-event-redaction.test.ts` (PAIR-AC9)

- [ ] **PAIR-T7 — Loss-of-contact verdict**

  Wire transport close into `executionState: 'unverifiable'` across the remote
  store, and add `connection-loss-verdict.test.ts` asserting no code path yields
  `exited` from a transport signal.

  **Verify:** `pnpm test src/gamepad/state/remote`

- [ ] **PAIR-T8 — Host catalog screen**

  `src/gamepad/features/pairing/screens/HostCatalogScreen.tsx` plus
  `HostCatalogRow`, `ConnectionStatusChip`. Repoint `mobile/app/pair.tsx` at it.

  Design-system gate applies: no raw palette colors, no computed `className`,
  no restyled `components/ui/` primitive.

  **Verify:** `pnpm run check:code-quality:changed`; `pnpm lint`

- [ ] **PAIR-T9 — Pairing flow screens**

  `PairScanScreen`, `PairConfirmScreen`, `ManualEndpointScreen`,
  `PairingModeSelector`. Repoint `mobile/app/pair-scan.tsx`,
  `mobile/app/pair-confirm.tsx`.

  Mode must be shown before confirmation (PAIR-AC2).

  **Verify:** `pnpm test src/gamepad/features/pairing`

- [ ] **PAIR-T10 — Connection log screen**

  `ConnectionLogScreen` over `observeEvents`, with copy-to-clipboard running
  through the redacting serializer. Repoint `mobile/app/connection-log.tsx`.

  **Verify:** `pnpm test src/gamepad/features/pairing/screens`

- [ ] **PAIR-T11 — Unpair**

  Confirmation sheet naming exactly what is deleted; wire to
  `host-removal-lifecycle.ts` and remote-state eviction.

  **Verify:** `pnpm test …/unpair-lifecycle.test.ts` (PAIR-AC8)

- [ ] **PAIR-T12 — Copy rules test**

  A test asserting the forbidden connection-state strings ("offline", "lost",
  "dead", "stopped") do not appear in pairing feature copy.

  **Verify:** `pnpm test src/gamepad/features/pairing/pairing-copy-rules.test.ts`

- [ ] **PAIR-T13 — Manual device checks**

  Run and record, per `AGENTS.md` (background launch, no focus steal):

    1. QR pair, iOS device + Android device.
    2. Camera permission denied → manual endpoint path.
    3. Android emulator via `ws://10.0.2.2:6768`.
    4. Background five minutes, foreground, confirm reconnect + list refresh (PAIR-AC5).
    5. Airplane-mode toggle (PAIR-AC10).
    6. Host at minimum protocol version (PAIR-AC6) and below it (PAIR-AC7).
