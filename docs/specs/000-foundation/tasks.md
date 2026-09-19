# 000 — Foundation — Tasks

Each task is independently shippable and leaves `pnpm typecheck`, `pnpm test`,
and `oxlint` green in `mobile/`.

- [x] **FND-T1 — Domain types**

  Create `mobile/src/gamepad/domain/`:
  - `connection.ts`, `project.ts`, `workspace.ts`, `session.ts`, `agent.ts`,
    `message.ts`, `task.ts`, `activity.ts`
  - Branded id types per `tech.md` §2. No barrel file.
  - Colocated tests for the invariants that are not expressible in the type
    system (folder workspace has no branch; `staleFromRestore` implies
    `activity === 'unknown'`).

  **Verify:** `pnpm test src/gamepad/domain`

- [x] **FND-T2 — Boundary test**

  Create `mobile/src/gamepad/gamepad-boundary.test.ts`:
  - Walk `src/gamepad/` with the repo's existing source-scan approach (see
    `mobile/src/expo-route-module-boundary.test.ts` for the established pattern
    — reuse it, do not write a second scanner). Resolve relative specifiers and
    the `@/*` alias; count type-only imports, `require`, dynamic `import()` and
    `import('…').T` as coupling.
  - Assert the one rule: nothing under `src/gamepad/` imports outside it, except
    `src/gamepad/adapters/**`, which may reach the roots named in
    `ADAPTER_UPSTREAM_REACH`.
  - Assert the inner rules: `domain` closed over itself (FND-AC1);
    `application/ports` references only `domain` (FND-AC2); nothing but
    `adapters` imports `adapters`; no `react-native` or `expo-*` outside
    `features` and `adapters`.
  - Assert the forbidden-vocabulary rule (FND-AC6) over every slice but
    `adapters`.

  **Verify:** `pnpm test src/gamepad/gamepad-boundary.test.ts`

- [x] **FND-T3 — Port result and subscription primitives**

  Create `mobile/src/gamepad/application/ports/`:
  - `port-result.ts`, `subscription.ts`, `capability.ts` per `tech.md` §3.

  Naming note: these are primitives of the port contract, not a `utils` bucket.
  Any further shared primitive gets its own concept-named file.

  **Verify:** `pnpm typecheck`

- [x] **FND-T4 — Adapter skeleton and composition root**
  - `mobile/src/gamepad/adapters/orca/index.ts` exporting `createOrcaAdapter(deps)`
    returning the full port bundle, with every method initially returning
    `PortFailure{kind:'unsupported'}`.
  - `mobile/src/gamepad/adapters/stub/index.ts` with the same shape, no dependencies.
  - A composition root in `mobile/src/gamepad/application/adapter-registry.ts` that
    features read from; features never import an adapter module.

  **Verify:** `pnpm typecheck`; `pnpm test src/gamepad/gamepad-boundary.test.ts`

- [x] **FND-T5 — Protocol gate and capability map**
  - `src/gamepad/adapters/orca/protocol/host-protocol-gate.ts` — `status.get` descriptor
    and `HostCapabilities` projection.
  - `src/gamepad/adapters/orca/protocol/port-capability-map.ts` — per-method
    `available` / `unavailable` / `unknown`, with the `method not found` cache
    and its reconnect invalidation.
  - Tests covering: current host, host at the minimum compatible version, host
    with absent optional fields, host that refuses.

  **Verify:** `pnpm test src/gamepad/adapters/orca/protocol`

- [ ] **FND-T6 — Transport binding**
  - `src/gamepad/adapters/orca/transport/adapter-client-binding.ts` — acquire the logical
    client for a connection id from the existing host client registry
    (`mobile/src/transport/host-logical-client.ts`,
    `host-client-acquisition-registry.ts`), and surface connect/disconnect as
    `Connection` domain values.
  - No new websocket code. No new reconnect scheduler.

  **Verify:** `pnpm test src/gamepad/adapters/orca/transport`

- [ ] **FND-T7 — Agent reconciliation**
  - `src/gamepad/adapters/orca/mapping/agent-reconciliation.ts` implementing the
    precedence table in `tech.md` §4.6.
  - Tests: `ps`-only row; status-only summary; both present with
    `hostExecutionOwned`; both present without it; `restoredUnconfirmed` row.

  **Verify:** `pnpm test src/gamepad/adapters/orca/mapping/agent-reconciliation.test.ts`

- [ ] **FND-T8 — Remote / local / connection stores**
  - `src/gamepad/state/remote/` — per-entity caches keyed by
    `${connectionId}:${entityId}`, with the invalidation table from `tech.md` §5.
  - `src/gamepad/application/ports/preferences-store.ts` — `PreferencesStorePort`;
    `src/gamepad/adapters/device/preferences-store.ts` implements it over the
    existing `mobile/src/storage/preferences.ts` and `session-view-preferences.ts`.
    `src/gamepad/state/local/` talks to the port, never to storage.
  - `src/gamepad/adapters/orca/connection/host-catalog.ts` — wraps
    `host-store.ts`, `host-metadata-store.ts` and `host-device-token-store.ts`,
    publishing `Connection` values through `ConnectionPort`.
    `src/gamepad/state/connection/` reads the port.
  - Tests: disconnect leaves entries stale and marks `unverifiable`; host identity
    change drops the connection's entries; drafts survive a disconnect.

  **Verify:** `pnpm test src/gamepad/state`

- [ ] **FND-T9 — Compatibility suite at the adapter boundary**
  - `src/gamepad/adapters/orca/protocol/host-compatibility.test.ts` driving the recording
    harness (`mobile/src/test-support/rpc-recording/`) across the three host
    profiles in `tech.md` §8.
  - A fixture per port method, checked in under
    `src/gamepad/adapters/orca/__fixtures__/`.

  **Verify:** `pnpm test src/gamepad/adapters/orca/protocol/host-compatibility.test.ts`

- [ ] **FND-T10 — Extraction-readiness job**
  - `mobile/tsconfig.extraction.json` compiling `src/gamepad/**` with
    `src/gamepad/adapters/orca/**` excluded and the stub bound.
  - A `pnpm typecheck:extraction` script, wired into CI.

  **Verify:** `pnpm typecheck:extraction`

- [ ] **FND-T11 — Raw-port ratchet guard**
  - Confirm no `src/gamepad/` file appears in
    `mobile/src/transport/unvalidated-rpc-request-port-inventory.ts`.
  - If a legacy module is migrated into the adapter during this feature, delete
    its inventory entry in the same commit.

  **Verify:** `pnpm test src/transport/unvalidated-rpc-request-port-boundary.test.ts`

