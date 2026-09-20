# 001 — Controller input — Technical Specification

## 1. Layout

```text
mobile/
├── modules/orca-gamepad/             # local Expo native module
│   ├── expo-module.config.json
│   ├── ios/OrcaGamepadModule.swift
│   ├── android/.../OrcaGamepadModule.kt
│   └── index.ts
│
└── src/gamepad/
    ├── domain/
    │   ├── input-binding.ts          # buttons, axes, chords, the §4 table
    │   ├── controller-intent.ts      # what an input means
    │   └── pane.ts                   # panes, focus, selection
    ├── application/
    │   ├── ports/controller-input-port.ts
    │   └── use-cases/resolve-controller-intent.ts
    └── adapters/device/
        ├── controller-input.ts       # the native module, behind the port
        └── controller-input-absent.ts # stub reader: never connects
```

The native module lives beside `modules/orca-notification-dismissal/`, which
already establishes the pattern in this repo.

## 2. Domain

```ts
// input-binding.ts
export const CONTROLLER_BUTTONS = [
  'a', 'b', 'x', 'y',
  'lb', 'rb', 'l3', 'r3',
  'dpadUp', 'dpadDown', 'dpadLeft', 'dpadRight'
] as const
export type ControllerButton = (typeof CONTROLLER_BUTTONS)[number]

export const CONTROLLER_AXES = [
  'leftStickX', 'leftStickY', 'rightStickX', 'rightStickY', 'l2', 'r2'
] as const
export type ControllerAxis = (typeof CONTROLLER_AXES)[number]

/** Sticks report a vector because 002 needs the angle, not a direction. */
export type StickVector = {
  readonly x: number
  readonly y: number
  /** 0..1 after the dead zone is removed and the remainder rescaled. */
  readonly magnitude: number
  /** Degrees clockwise from up. Undefined below the dead zone, so it is null there. */
  readonly angleDeg: number | null
}

export const DEAD_ZONE = 0.25
export const TRIGGER_THRESHOLD = 0.05
```

```ts
// pane.ts
export type PaneId = BrandedId<'PaneId'>

/** The panes Orca's shell already has (app/h/_layout.tsx). */
export const PANE_KINDS = ['workspace-sidebar', 'detail'] as const
export type PaneKind = (typeof PANE_KINDS)[number]

export type Pane = {
  readonly id: PaneId
  readonly kind: PaneKind
  /** Null for a pane whose content belongs to no session — a workspace list. */
  readonly sessionId: SessionId | null
  readonly scrollable: boolean
  /** Null when the pane holds no traversable list. */
  readonly itemCount: number | null
}

export type Focus = {
  readonly paneId: PaneId
  /** Null when the focused pane holds no traversable list. */
  readonly selectionIndex: number | null
}
```

`Pane` carries `sessionId` because that is what makes CTRL-R3 expressible: `X`
resolves against the focused pane's session without any feature re-deriving it.

## 3. Intents

```ts
// controller-intent.ts
export type ControllerIntent =
  | { readonly kind: 'scroll'; readonly velocity: number }   // signed: -1..1
  | { readonly kind: 'cycle-tab'; readonly direction: Direction }
  | { readonly kind: 'cycle-workspace'; readonly direction: Direction }
  | { readonly kind: 'move-selection'; readonly direction: Direction }
  | { readonly kind: 'move-focus'; readonly direction: Direction }
  | { readonly kind: 'stick-motion'; readonly stick: StickSide; readonly vector: StickVector | null }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'back' }
  | { readonly kind: 'stop-session'; readonly sessionId: SessionId }
  | { readonly kind: 'toggle-dictation' }
```

`stick-motion` with `vector: null` means the stick returned inside the dead zone.
That is the whole of this feature's knowledge of wheels: `002` builds its state
machine on `stick-motion` plus `confirm`, and this feature never learns that a
wheel exists.

`stop-session` carries the resolved `SessionId`, so it is only ever emitted when
there is a target — CTRL-AC5 falls out of the type rather than out of a check at
the far end.

## 4. Port

```ts
// controller-input-port.ts
export type ControllerConnection = {
  readonly connected: boolean
  /** The pad's reported name, for the disconnection notice. Null when unknown. */
  readonly label: string | null
}

export type ControllerSample = {
  readonly pressed: ReadonlySet<ControllerButton>
  readonly axes: Readonly<Record<ControllerAxis, number>>
  /** Host-free: the device clock at capture, used only for deltas. */
  readonly at: number
}

export type ControllerInputPort = {
  readonly observeConnection: Subscription<ControllerConnection>
  readonly observeSamples: Subscription<ControllerSample>
  readonly support: () => Capability
}
```

The port reports raw device truth. Dead zone, chords and mapping are applied
above it, in the pure resolver — so they are testable without a device and they
survive the reader being replaced (CTRL-R7).

## 5. Native module

| Platform | Mechanism |
| -------- | --------- |
| iOS / iPadOS | `GCController`, `GCControllerDidConnect`/`DidDisconnect` notifications, `GCExtendedGamepad.valueChangedHandler` — push-based |
| Android | `InputManager.InputDeviceListener` for connect/disconnect; a generic-motion and key listener installed on the activity's decor view for axes and buttons |

The Android half is the implementation risk. Gamepad axes arrive as
`MotionEvent` with `SOURCE_JOYSTICK` and buttons as `KeyEvent`, both dispatched
to the activity. An Expo module cannot override `Activity.dispatchGenericMotionEvent`,
so the module attaches `setOnGenericMotionListener` and `setOnKeyListener` to the
decor view of `appContext.currentActivity`, and re-attaches when the activity is
recreated. If a focused `WebView` — the terminal engine — swallows key events,
the listener must be installed at the decor view rather than on a child, and
that interaction is the first thing CTRL-T3 tests on a device.

Axis normalisation happens in native code so both platforms publish the same
ranges: sticks `-1..1` with Y positive up, triggers `0..1`.

## 6. Latency budget

Two budgets, because only one of them is honestly testable in CI:

| Path | Budget | How it is held |
| ---- | ------ | -------------- |
| Sample → intents (the pure resolver) | ≤ 1 ms for a 60 Hz sample on the test runner | asserted in `resolve-controller-intent.test.ts` |
| Dead-zone crossing → first wheel frame, on device | ≤ 50 ms p95 | measured on a Retroid Pocket Flip and recorded; not a CI gate |

The second is deliberately not a CI gate: this repo has no device in CI, and a
budget that cannot be measured where it is asserted rots into a comment. It is
the number that decides whether the native module is fast enough, so it gets
recorded on a real device before `002` tunes the wheel's feel.

## 7. Focus against Orca's shell

Focus is derived from the shell that already exists, not from a parallel tree:

| Shell state | Focused pane |
| ----------- | ------------ |
| Narrow layout (sidebar not mounted) | `detail`, always |
| Wide layout, detail route open | `detail` on entry; `D-pad ←` moves to `workspace-sidebar` |
| Wide layout, base host route | `workspace-sidebar` — the detail pane is a placeholder |

`useResponsiveLayout().isWideLayout` is the existing predicate and is not
changed by this feature: on a Retroid Pocket Flip its short side is below the
600 dp threshold, so the sidebar never mounts and focus has one home.

`Pane.sessionId` is populated by whichever feature mounts the pane — `006` for a
session route, `null` for the workspace list.

## 8. Failure modes

| Condition | Behaviour |
| --------- | --------- |
| No controller ever connects | `support()` is `available` but `connected` is false; touch continues to work; no error surface |
| Platform cannot report gamepads | `support()` is `unavailable`; the app never claims a pad is missing when it simply cannot look |
| Controller disconnects mid-session | connection state flips within 1 s; the app says so; in-flight held buttons are released rather than latched |
| An unmapped button is pressed | ignored, silently |
| Two controllers connect | the first is used; the second is ignored (non-goal) |

Releasing held buttons on disconnect matters: a pad that vanishes while `Y` is
held must not leave the app permanently in the workspace-cycling chord.

## 9. Testing

| Level | Location | What it proves |
| ----- | -------- | -------------- |
| Mapping | `domain/input-binding.test.ts` | every CTRL-R1 row resolves to one intent, table-driven, no device |
| Resolver | `application/use-cases/resolve-controller-intent.test.ts` | chords, dead zone, focus-dependent intents, CTRL-AC5's silent no-op, the 1 ms budget |
| Focus | `domain/pane.test.ts` | focus is always resolvable; §7's table |
| Adapter | `adapters/device/controller-input.test.ts` | sample normalisation and disconnect-releases-buttons, against a fake native module |
| Extraction | `pnpm typecheck:extraction` | CTRL-AC9 — the stub reader compiles with the native module gone |

Device-dependent behaviour (CTRL-AC7's one-second disconnect, the §6 on-device
budget, and the WebView key-event interaction) is verified on hardware and
recorded, not simulated in CI.

## 10. Open questions

1. **Retroid Pocket Flip button map.** Android gamepad key codes vary by vendor;
   the Flip's integrated controls need their mapping confirmed against
   `KEYCODE_BUTTON_*` on the device before `input-binding.ts` is called done.
2. **Terminal WebView key capture.** Whether a focused terminal WebView consumes
   `KeyEvent`s before the decor-view listener sees them. If it does, the terminal
   pane needs an explicit pass-through rather than a workaround in this feature.
3. **Trigger-as-button on some pads.** A few controllers report `L2`/`R2` only as
   digital buttons. Analog scroll then degrades to a fixed velocity; whether that
   is acceptable or the pad is unsupported is a product call deferred to hardware
   testing.
