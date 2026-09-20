# 003 — Dictation — Technical Specification

## 1. Layout

```text
src/gamepad/
├── domain/
│   └── dictation.ts                  # DictationState, DictationTarget
├── application/
│   ├── ports/dictation-port.ts
│   └── use-cases/toggle-dictation.ts
├── adapters/orca/
│   ├── rpc/dictation-operations.ts   # speech.dictation.* descriptors
│   └── dictation-adapter.ts          # port over the RPCs + audio capture
└── features/dictation/
    └── components/ListeningIndicator.tsx
```

## 2. What already exists

Dictation is a streaming exchange, not a single call. The phone captures audio
and pushes it to the host, which transcribes:

| Host method | Role |
| ----------- | ---- |
| `speech.dictation.setup` | configure before a session |
| `speech.dictation.start` | open a session, returns a `dictationId` |
| `speech.dictation.chunk` | push captured audio |
| `speech.dictation.finish` | close and flush |
| `speech.dictation.cancel` | abandon |
| `speech.models.list` / `.download` / `.delete` | model management |

Reused rather than rebuilt:

- `@orca/expo-two-way-audio` (`mobile/packages/`) — microphone capture.
- `mobile/src/dictation/mobile-dictation-setup.ts` — maps
  `voice_dictation_disabled` and `voice_model_not_selected` to a setup-required
  state, and detects a host too old for `speech.models.list`. DICT-R3 and DICT-R4
  are this module's existing behaviour, promoted to a port contract.
- `mobile/src/settings/voice-settings-screen.tsx` — model management, unchanged.

**`ADAPTER_UPSTREAM_REACH` gains `mobile/src/dictation`.** That is a deliberate,
reviewable edit to the boundary test, and the only new upstream root this
feature needs — audio arrives as a package import, not a path.

## 3. Domain

```ts
// dictation.ts
export const DICTATION_STATES = [
  'idle',
  'listening',
  'setup-required',   // host configured but disabled, or no model selected
  'unavailable'       // host predates dictation, or platform cannot capture
] as const
export type DictationState = (typeof DICTATION_STATES)[number]

/** Where a transcript lands. Resolved from focus, never chosen by the user. */
export type DictationTarget = {
  readonly paneId: PaneId
  readonly sessionId: SessionId | null
}
```

`setup-required` is a state beside `listening`, not an error beside a result —
DICT-R3 in the type system. A feature cannot render it as a failure without
going out of its way.

## 4. Port

```ts
// dictation-port.ts
export type DictationTranscript = {
  readonly text: string
  /** False while the host is still refining this span. */
  readonly final: boolean
}

export type DictationPort = {
  readonly support: (id: ConnectionId) => Capability
  readonly start: (id: ConnectionId) => Promise<PortResult<DictationSessionId>>
  readonly stop: (id: ConnectionId, session: DictationSessionId) => Promise<PortResult<void>>
  readonly cancel: (id: ConnectionId, session: DictationSessionId) => Promise<PortResult<void>>
  readonly observeTranscript: (id: ConnectionId, session: DictationSessionId) => Subscription<DictationTranscript>
  readonly observeState: (id: ConnectionId) => Subscription<DictationState>
}
```

Audio capture is not on the port. It is an implementation detail of the Orca
adapter, because the chunk protocol is Orca's — a different backend might accept
a whole utterance, or transcribe on device. The port says "dictate into this
connection" and returns text.

## 5. Toggle and routing

```ts
// toggle-dictation.ts
export function toggleDictation(
  state: DictationState,
  target: DictationTarget | null
): DictationCommand
```

| State | Target | Command |
| ----- | ------ | ------- |
| `idle` | text target present | start |
| `idle` | none | notice, no state change (DICT-AC3) |
| `listening` | any | stop |
| `setup-required` | any | open voice settings |
| `unavailable` | any | notice; no request is sent (DICT-AC5) |

The target comes from `001`'s focus model. A pane declares whether it accepts
text when it mounts; the terminal and the agent composer do, a file tree does
not.

Transcript delivery reuses the existing routing shape:
`terminal-live-dictation-routing.ts` already places text into terminal live
input, and the agent composer is the second target `007` wires up.

## 6. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| Host predates `speech.*` | `support()` is `unavailable`; `R3` inert; existing upgrade guidance shown |
| `voice_dictation_disabled` / `voice_model_not_selected` | `setup-required`; `R3` opens voice settings |
| Microphone permission denied | `unavailable` with the platform's permission path; not a host failure |
| Connection drops mid-session | state → `idle`, indicator clears within 1 s, delivered text retained (DICT-R6) |
| `finish` reply lost | treat as delivered — text already streamed is on screen; do not re-send audio |
| Focused pane unmounts while listening | dictation stops; text already delivered stays where it landed |

## 7. Testing

| Level | Location | What it proves |
| ----- | -------- | -------------- |
| Toggle | `application/use-cases/toggle-dictation.test.ts` | §5's table, including the no-target notice |
| Adapter | `adapters/orca/dictation-adapter.test.ts` | setup errors → `setup-required`; `method_not_found` → `unavailable`; disconnect → `idle` |
| RPC | `adapters/orca/rpc/dictation-operations.test.ts` | start / chunk / finish / cancel descriptors against recorded replies |
| Boundary | `gamepad-boundary.test.ts` | DICT-AC1 — no `speech.` literal outside `adapters/orca/` |

## 8. Open questions

1. **Partial transcripts on a terminal.** Live input already shows text as it
   arrives; whether non-final spans should render differently from final ones is
   a feel question for hardware testing.
2. **`R3` while a wheel is open.** DICT-R5 requires stopping to stay reachable.
   Whether `R3` should also be able to *start* dictation with a wheel open, or
   only stop it, is unresolved — it depends on whether a wheel segment ends up
   owning a dictation action.
