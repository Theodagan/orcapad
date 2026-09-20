# 000 — Foundation

## Purpose

Establish the boundary that makes every other feature in this fork possible:
a controller domain model, a set of capability ports, and one Orca adapter that
implements those ports over the existing mobile transport.

This feature ships no user-visible screen. Its deliverable is that
`005`–`010` can be built, redesigned, and eventually extracted without touching
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
2. **Extraction is blocked.** PRD §9 wants the controller layer lifted out by
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
- Migrating every existing screen. Features `004`–`010` migrate their own
  surface; legacy screens keep working from the raw port until then.
- A second runtime adapter. PRD §8 explicitly defers this.
- Any generic `IBackend` / `IConnection` / `IAgent` abstraction
  (architecture.md §4 forbids these until proven necessary).

## Requirements

### FND-R1 — Domain model

The domain layer defines the controller's own concepts as plain data with no
imports from `mobile/src/transport/`, `src/shared/`, React, or Expo.

The MVP domain is these eleven aggregates. Eight describe the remote
environment — `Project`, `Workspace`, `Session`, `Agent`, `Message`, `Task`,
`Activity`, `Connection`. Three describe how it is operated, and are owned by
`001`–`003`: `InputBinding`, `Pane`, `Wheel`.

Each carries only fields a pane or use case actually reads; PRD-driven, not a
mirror of Orca's data model (architecture.md §3). The interaction aggregates are
domain rather than feature state for the same reason the rest are: PRD §9
extracts the controller UX, and an interaction model that lived in a feature
would not come with it.

### FND-R2 — Capability ports

The application layer declares ports named for capabilities, not for
infrastructure. Each port is a TypeScript type with method signatures over
domain types only.

Ports for MVP:

| Port                    | Owning feature  |
| ----------------------- | --------------- |
| `ConnectionPort`        | 004-pairing     |
| `PairingPort`           | 004-pairing     |
| `ProjectCatalogPort`    | 005-projects    |
| `WorkspacePort`         | 005-projects    |
| `SessionPort`           | 006-sessions    |
| `AgentControlPort`      | 007-agents      |
| `ActivityStreamPort`    | 008-terminal    |
| `FileInspectionPort`    | 010-files       |
| `NotificationPort`      | 009-dashboard   |

A port method never exposes an Orca method name, an RPC envelope, a zod schema,
a `paneKey`, a `worktree` selector string, or a subscription id.

### FND-R3 — The fork is one subtree with one boundary

`mobile/src/gamepad/` is the whole controller product layer. Everything else
under `mobile/src/` is upstream Orca Mobile. One rule holds the line:

> `src/gamepad/**` may not import anything outside `src/gamepad/**`, **except**
> `src/gamepad/adapters/**`, which may reach a named list of upstream modules.

That list is data, not prose: `ADAPTER_UPSTREAM_REACH` in the boundary test.
Today it is `mobile/src/{transport,storage,terminal,navigation}/` and the
desktop repo's `src/shared/`. Extending it is a deliberate, reviewable edit, and
every entry is something extraction has to replace.

Being one subtree is the point. The fork's delta is `git diff -- mobile/src/gamepad`,
a rebase does not touch it, and extraction is a move rather than a tsconfig
excavation. A layout that spread the layer across siblings of ~30 upstream
folders could state none of that, and left the rule blind to those siblings.

Inside the subtree the layering still holds:

```text
app/ (Expo shell)  →  gamepad/features/  →  gamepad/application/  →  gamepad/domain/
                                                    ↑
                                          gamepad/adapters/orca/
```

- `gamepad/domain/**` imports nothing outside itself;
- `gamepad/application/ports/**` references only `gamepad/domain/**`;
- `gamepad/{application,state,features}/**` never import `gamepad/adapters/**` —
  they reach the adapter through `gamepad/application/adapter-registry.ts`;
- `gamepad/{domain,application,state}/**` never import `react-native` or any
  `expo-*` package. `gamepad/features/**` may: it is the UI.

### FND-R4 — The adapter is the only holder of Orca knowledge

`src/gamepad/adapters/orca/` is the sole place in the controller layer that may:

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

`src/gamepad/` must compile with `src/gamepad/adapters/orca/` removed and
replaced by a stub implementing the same ports. `mobile/tsconfig.extraction.json`
proves it — one `include`, one `exclude` — and `pnpm typecheck:extraction` runs
it in CI.

## Acceptance criteria

- **FND-AC1** — `src/gamepad/domain/` has zero imports outside itself and the
  TypeScript standard library. Verified by the boundary test.
- **FND-AC2** — Every port method's parameter and return types resolve to
  domain types or primitives. Verified by the boundary test, which rejects any
  import in `src/gamepad/application/ports/` that leaves `src/gamepad/domain/`.
- **FND-AC3** — Deleting `src/gamepad/adapters/orca/` and pointing the
  composition root at `src/gamepad/adapters/stub/` leaves
  `pnpm typecheck:extraction` green in `mobile/`.
- **FND-AC4** — The adapter contributes zero new entries to
  `UNVALIDATED_RPC_REQUEST_PORT_PENDING`.
- **FND-AC5** — A recorded-fixture suite replays a captured host session
  against the adapter and asserts every port method returns the expected
  domain value, including for a host that answers `method not found`.
- **FND-AC6** — No identifier or string literal outside
  `src/gamepad/adapters/` contains `worktree`, `paneKey` or `snapshotId`, or
  equals an `RpcMethodName`. Comments and `*.test.ts(x)` prose are not scanned —
  they describe the host on purpose — and `'git-worktree'` is exempt as the
  `WorkspaceKind` value tech.md §2 fixes.
- **FND-AC7** — Disconnecting mid-session leaves every affected
  `executionState` at `unverifiable` and no entity at `exited`.

## Non-goals

- Introducing a state-management library the app does not already use.
- Abstracting over "any backend". One adapter, one runtime.
- Moving existing screens. Migration is each feature's own task list.
