# 001 - Controller Input - Technical Specification

## 1. Evidence and uncertainty

The implementation direction is supported by official documentation:

- Expo supports local native modules with Android and iOS implementations:
  <https://docs.expo.dev/modules/get-started/>.
- Apple's `GCController` exposes connected controllers, connect/disconnect
  notifications, extended gamepad profiles, and value-change handlers:
  <https://developer.apple.com/documentation/gamecontroller/gccontroller>.
- Android documents joystick motion and controller key handling:
  <https://developer.android.com/develop/ui/views/touch-and-input/game-controllers/controller-input>.

Official APIs do not prove how the Retroid Pocket Flip reports every control or
whether Orca's focused terminal WebView intercepts events. Those are device
checkpoints.

## 2. Data model

```ts
type ControllerButton =
  | 'a' | 'b' | 'x' | 'y'
  | 'lb' | 'rb' | 'l3' | 'r3'
  | 'dpad-up' | 'dpad-down' | 'dpad-left' | 'dpad-right'

type ControllerAxis =
  | 'left-x' | 'left-y' | 'right-x' | 'right-y'
  | 'l2' | 'r2'

type ControllerSample = {
  readonly connected: boolean
  readonly buttons: ReadonlyMap<ControllerButton, number>
  readonly axes: ReadonlyMap<ControllerAxis, number>
  readonly sampledAt: number
}
```

Sticks normalize to `-1..1`; triggers normalize to `0..1`. Trigger-as-button
devices retain an explicit digital classification rather than pretending to be
analog.

## 3. Contract and experiment mappings

Two independent data sets feed the resolver:

```ts
const PRD_CONTROLLER_BINDINGS = [/* CTRL-R1 only */] as const
const EXPERIMENTAL_DPAD_BINDINGS = [/* CTRL-R2 only */] as const
```

Production behavior may enable the provisional set through one experiment
flag. Tests over `PRD_CONTROLLER_BINDINGS` must not import the provisional set.

## 4. Intents

The initial intent vocabulary is controller-specific and surface-neutral:

```ts
type ControllerIntent =
  | { readonly kind: 'scroll'; readonly direction: 'up' | 'down'; readonly velocity: number }
  | { readonly kind: 'cycle-tab'; readonly direction: 'previous' | 'next' }
  | { readonly kind: 'cycle-workspace'; readonly direction: 'previous' | 'next' }
  | { readonly kind: 'wheel-motion'; readonly wheel: 1 | 2; readonly x: number; readonly y: number }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'back' }
  | { readonly kind: 'stop' }
  | { readonly kind: 'toggle-dictation' }
  | { readonly kind: 'move-selection'; readonly direction: 'up' | 'down' }
  | { readonly kind: 'move-horizontal'; readonly direction: 'left' | 'right' }
```

The last two intents are emitted only by the provisional D-pad set.

## 5. Input port

The native boundary reports device truth and nothing about Orca:

```ts
type ControllerInput = {
  readonly support: () => 'available' | 'unavailable'
  readonly current: () => ControllerSample
  readonly subscribe: (listener: (sample: ControllerSample) => void) => () => void
}
```

Dead zones, chords, mappings, and focus resolution remain in TypeScript so they
are tested without hardware.

## 6. Native module

Use a local Expo module under `mobile/modules/orca-gamepad/`.

### iOS and iPadOS

- discover `GCController` instances;
- observe connect and disconnect notifications;
- read `GCExtendedGamepad` values with change handlers;
- publish a full normalized sample after each change;
- release all held state on disconnect.

### Android

- observe devices through `InputManager.InputDeviceListener`;
- accept joystick `MotionEvent` data and gamepad `KeyEvent` data;
- bind listeners to the current activity lifecycle;
- record the actual Retroid source, axis, and key codes before finalizing its
  translation table;
- determine on hardware whether the terminal WebView consumes events before the
  selected listener location.

If decor-view listeners cannot reliably observe events, implementation pauses
for an architecture decision rather than adding an undocumented workaround.

Native changes require rebuilding the development client. Expo Go is not a
valid verification environment for this local module.

## 7. Focus registry

The shell owns a registry of currently mounted `FocusTarget` entries from
`000`. Route transitions select from registered targets. Existing routes remain
the navigation source of truth.

Resolution order:

1. an open wheel receives wheel motion and `A`;
2. global `R3` may stop active dictation;
3. the active focus target receives accepted intents;
4. unaccepted or targetless intents are no-ops.

Whether `R3` starts dictation while a wheel is open is measured as a wheel
experiment and must not affect its ability to stop an active microphone.

## 8. Performance evidence

Performance targets are project criteria, not platform guarantees:

| Measurement | Target | Evidence |
| --- | --- | --- |
| Pure sample-to-intent resolver | No material frame-budget contribution | benchmark recorded with test runner and environment |
| Dead-zone crossing to first visible wheel frame | 50 ms p95 target | Retroid device trace |
| Controller disconnect notice | within 1 second | Retroid and iOS device trace |

No specification assumes a fixed controller sample rate.

## 9. Failure behavior

| Condition | Behavior |
| --- | --- |
| No controller connected | touch continues; controller state says disconnected |
| Platform reader unavailable | no false disconnected warning; support says unavailable |
| Controller disconnects with buttons held | publish neutral sample and show notice |
| Unmapped input | ignore |
| Second controller connects | keep the first active controller for MVP |
| Digital-only trigger | record digital classification; evaluate fixed scroll velocity in trial |
