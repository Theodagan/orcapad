# 000 - Foundation and Integration - Technical Specification

## 1. Minimal structure

```text
mobile/src/gamepad/
|- domain/                 # input, intent, focus, wheel data only
|- application/            # pure resolver and wheel state machine
|- input/                  # native-module adapter and absent reader
|- wheel/                  # overlay, registry, experiment presets
|- bindings/               # thin existing-surface registrations
`- controller-provider.tsx # lifecycle and dispatch composition
```

Names may adapt to repository conventions during implementation. The
responsibilities may not expand into replacement Orca application layers.

## 2. Binding contract

The exact type is finalized with `001`, but it must express this behavior:

```ts
type FocusTarget = {
  readonly id: string
  readonly accepts: ReadonlySet<ControllerIntentKind>
  readonly handle: (intent: ControllerIntent) => void
  readonly textTarget?: DictationTextTarget
}
```

The target references identity already owned by its surface when needed. It does
not maintain a second session or workspace record.

## 3. Reuse inventory

The reuse ledger in [`../README.md`](../README.md) is normative. A binding may
import those existing modules directly when composition is appropriate. A
wrapper is justified only for lifecycle adaptation or to present a narrow
callback interface; it must delegate behavior rather than restate it.

## 4. Prohibited duplicate shapes

New controller code must not contain:

- `WebSocket` construction or reconnect schedules;
- pairing payload parsing or direct pairing RPC orchestration;
- notification token acquisition, registration, or catch-up watermarks;
- microphone initialization, chunk queues, or `speech.*` request orchestration;
- terminal stream frame decoding, snapshot assembly, or viewport protocol;
- file listing, preview, search, or compatibility-fallback RPC orchestration;
- another journal, session, workspace, host, or credential store;
- replacement application routes or complete screens for existing surfaces.

## 5. Existing source reconciliation

Before more controller implementation, inspect every file under
`mobile/src/gamepad/` and assign one disposition:

| Disposition | Meaning |
| --- | --- |
| Retain | Directly implements a requirement in `001` or `002` without duplicate Orca state. |
| Simplify | Useful controller mechanism contains speculative architecture that must be removed. |
| Replace | Behavior is needed, but the implementation conflicts with the reuse-first boundary. |
| Remove | Speculative remote model, port, protocol wrapper, or test with no controller-MVP need. |

The current remote domain aggregates, broad adapter registry, protocol gate,
capability map, transport binding, and extraction tsconfig require explicit
review; old completion marks do not decide their outcome.

## 6. Tests and ratchets

Static checks should enforce narrow, durable rules:

- raw button and axis names stay in controller input modules;
- wheel geometry stays in wheel mechanics;
- accepted PRD mappings and provisional mappings are separate data sets;
- experiment presets are marked non-contractual;
- bindings do not import low-level transport/RPC modules when an authoritative
  surface action exists.

Avoid a broad import wall that forces existing UI to be copied.

## 7. Extraction

After device trials, record which modules depend only on controller concepts.
Those modules form the extraction candidate. Orca bindings remain replaceable
edges, but no standalone adapter is built until a standalone backend exists.
