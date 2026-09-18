# Orca Controller — Software Architecture Design

## 1. Architecture

Use **feature-oriented modular architecture with hexagonal boundaries**, held
in **one fork-owned subtree**.

This is a fork of Orca Mobile. The product layer therefore lives under a single
root, `mobile/src/gamepad/`, rather than as folders interleaved with upstream's.
That is what makes the fork's delta a `git diff` of one path, keeps a rebase
from touching it, and turns extraction into a move.

```text
mobile/
├── app/                         # upstream Expo Router / platform shell
│
└── src/
    ├── gamepad/                 # the fork
    │   ├── domain/
    │   ├── application/         # ports/, use-cases/, adapter-registry.ts
    │   ├── state/               # remote/, local/, connection/
    │   ├── features/
    │   │   ├── dashboard/ projects/ sessions/ agents/ terminal/ files/ pairing/
    │   └── adapters/
    │       ├── orca/            # rpc/, transport/, pairing/, protocol/, mapping/
    │       ├── device/          # preferences, push, terminal WebView host
    │       └── stub/
    │
    └── transport/ session/ terminal/ storage/ …   # upstream, untouched
```

There is no `core/` level: once the root is `gamepad/`, it names nothing.

## 2. Dependency direction

```text
UI / Features
      ↓
Application use cases
      ↓
Domain
      ↑
Orca adapters
```

One rule enforces it, checked by `mobile/src/gamepad/gamepad-boundary.test.ts`:

> `src/gamepad/**` may not import anything outside `src/gamepad/**`, except
> `src/gamepad/adapters/**`, which may reach a named list of upstream modules.

Nothing but the adapter imports Orca-specific code — and nothing but the adapter
imports upstream Orca Mobile at all.

The Orca adapter implements ports defined by the application layer.

## 3. Domain

Contains product concepts independent of transport or UI.

Examples:

```text
Project
Session
Agent
Task
Message
Activity
Connection
Workspace
```

Keep these models minimal and driven by actual product requirements.

Do not duplicate the entire Orca data model merely for architectural purity.

## 4. Application layer

Contains user-facing capabilities/use cases and their ports.

Examples:

```text
listProjects()
listSessions()
getSession()
sendMessage()
subscribeToSession()
getTerminalOutput()
inspectFiles()
pairDevice()
```

Ports describe **capabilities**, not generic infrastructure.

Avoid broad abstractions such as:

```text
IBackend
IConnection
IAgent
```

unless they become genuinely necessary.

## 5. Orca adapter

The Orca adapter translates between the application's capability model and Orca's actual protocol/runtime.

```text
Orca protocol
     ↓
transport / RPC
     ↓
Orca adapter
     ↓
application ports
```

Responsibilities:

* WebSocket/RPC communication
* Orca protocol/version handling
* pairing
* serialization/deserialization
* mapping Orca state into application/domain models
* translating application commands into Orca operations

No controller UX logic belongs here.

## 6. Features

Features own the controller UX.

Each feature should contain only what it needs:

```text
sessions/
├── components/
├── screens/
├── hooks/
└── state/
```

Features consume application use cases rather than Orca APIs directly.

This allows the UX to be redesigned without touching protocol compatibility.

## 7. State

Separate:

* **remote state** — sessions, projects, agents, activity
* **local UI state** — navigation, selections, expanded nodes, filters
* **connection state** — pairing/transport lifecycle

Avoid coupling global state directly to the Orca protocol.

## 8. Upstream compatibility strategy

Treat Orca as an external implementation contract.

```text
                ┌───────────────┐
                │ Controller UX │
                └───────┬───────┘
                        │
                Application ports
                        │
                ┌───────▼───────┐
                │  Orca Adapter │
                └───────┬───────┘
                        │
                Orca protocol/API
```

When upstream changes:

```text
Orca change
    ↓
adapter adjustment
    ↓
gamepad/ remains stable
```

Protocol compatibility tests should live around the adapter boundary.

## 9. Standalone extraction

The architecture deliberately permits:

```text
Current:

Controller
   ↓
Application
   ↓
Orca Adapter
   ↓
Orca
```

Later:

```text
Standalone Controller
   ↓
Application
   ↓
Standalone Adapter
   ↓
New runtime/backend
```

`src/gamepad/` minus `src/gamepad/adapters/orca/` is therefore the reusable product layer — not "most of" it, the whole of it. `mobile/tsconfig.extraction.json` is the proof.

The Expo application shell should remain thin so that a future standalone app can reuse the same modules rather than requiring a second implementation.

## 10. MVP architectural rule

**Do not build the future standalone architecture twice.**

Build the smallest clean boundary around Orca now, then let real UX requirements determine what becomes genuinely reusable.
