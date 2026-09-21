# 000 - FND-T1 - Existing source reconciliation

Disposition of every file under `mobile/src/gamepad/`, plus the two files
outside it that exist only to serve that subtree. This table is the body of the
implementation PR description (FND-T1) and is the classification FND-AC5
requires.

Dispositions are defined in [`tech.md`](./tech.md) section 5. The evidence is
the source as of `40f8883d1`; old completion marks from the superseded
specification carry no weight (FND-R6).

## Summary

| Disposition | Files |
| --- | --- |
| Retain | 0 |
| Simplify | 1 (`mobile/package.json`) |
| Replace | 1 (`gamepad-boundary.test.ts`) |
| Remove | 29 (the 28 files under `mobile/src/gamepad/` other than the boundary test, plus `mobile/tsconfig.extraction.json`) |

No file is retained. Nothing currently under `mobile/src/gamepad/` implements a
requirement in `001` or `002`: the whole subtree is the port/adapter/remote-domain
skeleton, and none of the controller vocabulary FND-R2 admits — normalized input
samples, bindings, intents, focus targets, wheel state, wheel segments,
experiment presets — exists yet. The retained-code column of FND-T1 is therefore
empty by evidence rather than by omission, and FND-AC5 is satisfied vacuously.

## `domain/` — remote-domain copies

Every model here is a second copy of state Orca Mobile already owns. `product.md`
lists "replacement models for projects, workspaces, sessions, agents, messages,
tasks, activity, connections" as out of scope, and FND-R2 limits the initial
controller vocabulary to controller mechanics. Nothing in `001` or `002` reads
any of them.

| File | Disposition | Reason | Authoritative existing implementation |
| --- | --- | --- | --- |
| `domain/project.ts` | Remove | Replacement project model (FND-R1, FND-R2) | `mobile/src/home/use-mobile-home-data.ts`, `mobile/src/home/home-host-connection-projection.ts` |
| `domain/workspace.ts` | Remove | Replacement workspace model, incl. `checkWorkspaceRules` invariants (FND-R1, FND-R2) | `mobile/src/host-screen/use-host-worktree-catalog.ts`, `mobile/src/host-screen/use-host-screen-state.ts` |
| `domain/session.ts` | Remove | Replacement session model; the `live`/`unverifiable`/`exited` vocabulary it restates is owned upstream, not by the controller layer (FND-R1) | `mobile/src/session/use-mobile-session-controller.ts` |
| `domain/agent.ts` | Remove | Replacement agent model and `checkAgentRules` (FND-R1, FND-R2) | `mobile/src/session/MobileNativeChatView.tsx` and the `mobile-native-chat-*` modules |
| `domain/message.ts` | Remove | Replacement transcript model (FND-R1) | existing `mobile-native-chat-*` modules |
| `domain/task.ts` | Remove | Replacement intervention/approval model (FND-R1) | `mobile/src/tasks/` |
| `domain/connection.ts` | Remove | Replacement connection model; reachability and path are transport state the store already holds (FND-R1, FND-R3) | `mobile/src/transport/client-context.tsx`, `mobile/src/transport/connection-health.ts` |
| `domain/activity.ts` | Remove | Terminal frame vocabulary — `tech.md` §4 prohibits terminal stream framing under `mobile/src/gamepad/` (FND-R3) | `mobile/src/terminal/`, `mobile/src/session/TerminalPaneView.tsx` |
| `domain/domain-rule.ts` | Remove | Exists only to carry violations from `checkAgentRules`/`checkWorkspaceRules`, both removed above | — |
| `domain/branded-id.ts` | Remove | Brands only the removed ids; `tech.md` §2 types `FocusTarget.id` as a plain `string`, so no controller concept needs a brand | — |
| `domain/branded-id.test.ts` | Remove | Covers removed constructors | — |
| `domain/workspace.test.ts` | Remove | Covers removed `checkWorkspaceRules` | — |
| `domain/agent.test.ts` | Remove | Covers removed `checkAgentRules` | — |

## `application/` — broad ports and the adapter registry

`product.md` puts "generic backend ports created only for architectural
symmetry" out of scope. Every port here is unconsumed: `gamepad-adapter.ts`
carries no port at all, and its own comment defers each one to a feature that
the current specification set no longer contains.

| File | Disposition | Reason | Authoritative existing implementation |
| --- | --- | --- | --- |
| `application/ports/gamepad-adapter.ts` | Remove | Empty adapter bundle; the `orca`/`stub` swap it exists for is the deferred extraction proof (FND-R5) | — |
| `application/ports/port-result.ts` | Remove | Result envelope for ports that do not exist (FND-R2) | — |
| `application/ports/unsupported.ts` | Remove | Failure constructor for the same absent ports | — |
| `application/ports/capability.ts` | Remove | Three-state capability vocabulary consumed only by the removed capability map | `mobile/src/tasks/worktree-create-capability.ts` |
| `application/ports/subscription.ts` | Remove | Push-side handle for absent ports | — |
| `application/adapter-registry.ts` | Remove | Module-level composition root; FND-T5 states the provider replaces it — "do not add a remote state store or adapter registry" | FND-T5 controller provider |
| `application/adapter-registry.test.ts` | Remove | Covers the removed registry | — |

## `adapters/` — protocol, capability, and transport wrappers

FND-R3 makes bindings thin: no remote truth, no transport lifecycle, no protocol
decode. Each module below does one of those three, and each duplicates a gate
Orca Mobile already ships.

| File | Disposition | Reason | Authoritative existing implementation |
| --- | --- | --- | --- |
| `adapters/orca/index.ts` | Remove | Shell for the removed adapter bundle; returns `{ kind: 'orca' }` and nothing else | — |
| `adapters/stub/index.ts` | Remove | Extraction proof only; `product.md` non-goal — "proving that every Orca-independent UI element can already ship standalone" (FND-R5) | — |
| `adapters/orca/protocol/host-protocol-gate.ts` | Remove | Second `status.get` compatibility gate under `mobile/src/gamepad/` (FND-R1, FND-R3) | `mobile/src/transport/host-status-gates.ts`, `mobile/src/transport/protocol-compat.ts`, `mobile/src/components/ProtocolBlockScreen.tsx` |
| `adapters/orca/protocol/host-protocol-gate.test.ts` | Remove | Covers the removed gate; upstream equivalent is `mobile/src/components/HostProtocolGate.test.ts` | — |
| `adapters/orca/protocol/port-capability-map.ts` | Remove | Per-port-method capability cache for ports that no longer exist (FND-R2) | `mobile/src/tasks/worktree-create-capability.ts` |
| `adapters/orca/protocol/port-capability-map.test.ts` | Remove | Covers the removed map, against fixture requirements only | — |
| `adapters/orca/transport/adapter-client-binding.ts` | Remove | Transport lifecycle wrapper — acquire/release/reconnect/disconnect plus a connection projection — which FND-R3 puts outside a binding | `mobile/src/transport/client-context.tsx` (`RpcClientProvider`), `mobile/src/transport/host-client-acquisition-registry.ts` |
| `adapters/orca/transport/adapter-client-binding.test.ts` | Remove | Covers the removed wrapper | — |

The three modules in this section are the ones `tech.md` §5 singles out for
explicit review. They are competently written and each holds a real invariant —
`unknown` never collapsing into `unavailable`, a refusal cache pinned to a host
generation, `auth-failed` projecting to `unreachable`. None of those invariants
is a controller mechanic, and each already has a home upstream, so the code is
removed rather than simplified: keeping it would be the second Orca Mobile that
FND-R1 exists to prevent. The bindings in `003` reach their surfaces through the
existing controllers and hooks, which hold their own clients.

## `gamepad-boundary.test.ts`

| File | Disposition | Reason |
| --- | --- | --- |
| `gamepad-boundary.test.ts` | Replace | Behavior is needed; the implementation conflicts with the reuse-first boundary |

The ratchet is wanted — FND-T3 and FND-T4 both land in this file — but its
central rule is `gamepad/** may not import outside gamepad/**, except
gamepad/adapters/**`. That is exactly the broad import wall `tech.md` §6 says to
avoid, and it is the mechanism that forced the remote-domain copies above: a
binding cannot call `use-mobile-session-controller.ts` without either failing the
test or being relabelled an adapter. Its slice model (`domain`, `application/ports`,
`state`, `features`, `adapters`) also names directories that this reconciliation
deletes, and the `FORBIDDEN_WORDS` vocabulary check bans `worktree` outside
`adapters/`, which FND-R1 makes the wrong default now that bindings compose with
existing Orca Mobile code.

Reusable as-is when FND-T3 rewrites the file: `sourceFiles`, `parse`, `within`,
`resolveSpecifier`, and `moduleSpecifiers` (`gamepad-boundary.test.ts:80-142`) —
AST-level specifier extraction that catches type-only, `require`, dynamic, and
`import()`-type couplings. The narrow rules of `tech.md` §6 and the
duplicate-infrastructure checks of FND-T4 can be written against those helpers.

## Outside the subtree

| File | Disposition | Reason |
| --- | --- | --- |
| `mobile/tsconfig.extraction.json` | Remove | Extraction-only scaffolding, named in FND-T2. It compiles `src/gamepad/` with `adapters/orca/**` excluded, which is the isolated-compile proof FND-R5 defers — "existing Orca Mobile behavior is not duplicated merely to make the entire current subtree compile in isolation". Extraction candidates are recorded after device trials (`tech.md` §7), not enforced by a tsconfig now. |
| `mobile/package.json` | Simplify | Drop the `typecheck:extraction` script (`mobile/package.json:14`), which is the only reference to the removed tsconfig. No dependency changes; every other script is untouched. |

`mobile/tsconfig.extraction.json` is the only reference to `mobile/src/gamepad/`
anywhere outside the subtree, so the removals in FND-T2 break no upstream
import and require no upstream edit.

## Verification

FND-T1 changes no source. `git diff -- mobile/src/gamepad mobile/tsconfig.extraction.json mobile/package.json` is empty at this commit; the dispositions above are carried out by FND-T2, FND-T3, and FND-T4.
