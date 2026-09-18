# 000 — Foundation

## Purpose

Establish the boundary that makes every other feature in this fork possible:
a controller domain model, a set of capability ports, and one Orca adapter that
implements those ports over the existing mobile transport.

This feature ships no user-visible screen. Its deliverable is that
`002`–`007` can be built, redesigned, and eventually extracted without touching
protocol code.

## Problem

`mobile/src/` today is organised by *thing* (`transport/`, `session/`,
`terminal/`, `worktree/`, `files/`, `tasks/`, `home/`, …) with screens in
`mobile/app/` reaching directly for RPC. Roughly 150 call sites still use the
raw request port (`mobile/src/transport/unvalidated-rpc-request-port-inventory.ts`).
Two consequences:

1. **UX experiments are expensive.** Redesigning the session surface means
   touching modules that also own protocol decoding, so a UX revert is a
   protocol revert.
2. **Extraction is blocked.** PRD §7 wants the controller layer lifted out by
   replacing the Orca adapter. Today there is no adapter to replace.

## Scope

**In scope**

- The controller domain model (`Project`, `Workspace`, `Session`, `Agent`,
  `Message`, `Task`, `Activity`, `Connection`).
- Application-layer capability ports and their result/error types.
- One `OrcaAdapter` implementing those ports over the existing transport.
- The three-way state split: remote / local UI / connection.
- The directory layout and the lint rules that keep the dependency direction
  honest.
- A protocol-compatibility test suite that lives at the adapter boundary.

**Out of scope**

- Rewriting `mobile/src/transport/`. The adapter consumes it.
- Migrating every existing screen. Features `001`–`007` migrate their own
  surface; legacy screens keep working from the raw port until then.
- A second runtime adapter. PRD §3 explicitly defers this.
- Any generic `IBackend` / `IConnection` / `IAgent` abstraction
  (architecture.md §4 forbids these until proven necessary).

## Requirements

### FND-R1 — Domain model

The domain layer defines the controller's own concepts as plain data with no
imports from `mobile/src/transport/`, `src/shared/`, React, or Expo.

The MVP domain is exactly these eight aggregates. Each carries only fields a
controller screen or use case actually reads; PRD-driven, not a mirror of
Orca's data model (architecture.md §3).

### FND-R2 — Capability ports

The application layer declares ports named for capabilities, not for
infrastructure. Each port is a TypeScript type with method signatures over
domain types only.

Ports for MVP:

| Port                    | Owning feature  |
| ----------------------- | --------------- |
| `ConnectionPort`        | 001-pairing     |
| `PairingPort`           | 001-pairing     |
| `ProjectCatalogPort`    | 002-projects    |
| `WorkspacePort`         | 002-projects    |
| `SessionPort`           | 003-sessions    |
| `AgentControlPort`      | 004-agents      |
| `ActivityStreamPort`    | 005-terminal    |
| `FileInspectionPort`    | 007-files       |
| `NotificationPort`      | 006-dashboard   |

A port method never exposes an Orca method name, an RPC envelope, a zod schema,
a `paneKey`, a `worktree` selector string, or a subscription id.

### FND-R3 — Dependency direction is enforced, not documented

```text
app/ (Expo shell)  →  src/features/  →  src/core/application/  →  src/core/domain/
                                                    ↑
                                          src/adapters/orca/
```

A lint rule fails the build on:

- `src/core/**` importing `src/adapters/**` or `src/features/**`;
- `src/features/**` importing `src/adapters/**`;
- `src/core/**` or `src/features/**` importing `../../src/shared/**`, the Orca
  host contracts;
- `src/core/**` importing `react-native` or any `expo-*` package.

### FND-R4 — The adapter is the only holder of Orca knowledge

`src/adapters/orca/` is the sole place in the controller layer that may:

- name an Orca RPC method;
- import from the desktop repo's `src/shared/`;
- decode an Orca payload shape;
- know about `paneKey`, `worktreeId`, `snapshotId`, journal cursors, or
  terminal stream opcodes.

### FND-R5 — Typed RPC only

Every adapter call goes through `defineRpcOperation`
(`mobile/src/transport/rpc-operation.ts`), which fixes the method, the
acceptance policy, and the interpretation barrier at definition time. The
adapter adds no file to
`UNVALIDATED_RPC_REQUEST_PORT_PENDING`; that list only shrinks, and its
boundary test fails on an unlisted file that reaches the raw port.

### FND-R6 — State separation

Three stores, never merged:

| Store        | Holds                                                             | Survives reconnect | Persisted |
| ------------ | ----------------------------------------------------------------- | ------------------ | --------- |
| Remote       | projects, workspaces, sessions, agents, activity                   | re-fetched         | no        |
| Local UI     | navigation, selections, expanded nodes, filters, drafts           | yes                | yes       |
| Connection   | host catalog, pairing, transport lifecycle, capability negotiation | yes                | credentials only |

Remote state is keyed by `(connectionId, entityId)` so two paired hosts never
collide. A draft message the user typed is local UI state and must survive a
disconnect.

### FND-R7 — Capability degradation is explicit

A host older than the client will not answer some methods. The adapter reports
capability per port method as `available` / `unavailable` / `unknown`, and a
feature renders the degraded state rather than an error. `status.get` supplies
`protocolVersion` and `minCompatibleMobileVersion`; absence of a field means
"host predates it", never "false".

### FND-R8 — Execution-state vocabulary

Any domain field describing whether remote work is running uses exactly
`live` / `unverifiable` / `exited`. No synonyms, no boolean `isRunning`. A
dropped connection maps to `unverifiable`, never `exited`
([`../../reference/ssh-execution-boundary.md`](../../reference/ssh-execution-boundary.md)).

### FND-R9 — Extraction readiness

`src/core/` and `src/features/` must compile with `src/adapters/orca/` removed
and replaced by a stub implementing the same ports. A CI job proves it by
type-checking against a generated no-op adapter.

## Acceptance criteria

- **FND-AC1** — `src/core/domain/` has zero imports outside itself and the
  TypeScript standard library. Verified by the layering test.
- **FND-AC2** — Every port method's parameter and return types resolve to
  domain types or primitives. Verified by the layering test, which rejects a
  port signature referencing a module outside `src/core/`.
- **FND-AC3** — Deleting `src/adapters/orca/` and pointing the composition root
  at `src/adapters/stub/` leaves `pnpm typecheck` green in `mobile/`.
- **FND-AC4** — The adapter contributes zero new entries to
  `UNVALIDATED_RPC_REQUEST_PORT_PENDING`.
- **FND-AC5** — A recorded-fixture suite replays a captured host session
  against the adapter and asserts every port method returns the expected
  domain value, including for a host that answers `method not found`.
- **FND-AC6** — Searching `src/core/` and `src/features/` for the string
  `worktree`, `paneKey`, `snapshotId`, or any `RpcMethodName` literal returns
  no hits.
- **FND-AC7** — Disconnecting mid-session leaves every affected
  `executionState` at `unverifiable` and no entity at `exited`.

## Non-goals

- Introducing a state-management library the app does not already use.
- Abstracting over "any backend". One adapter, one runtime.
- Moving existing screens. Migration is each feature's own task list.
