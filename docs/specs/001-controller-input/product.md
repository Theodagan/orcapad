# 001 — Controller input

## Purpose

Make a physical gamepad the way this app is operated.

This feature owns three things no other feature can: reading a controller,
the [`../../PRD.md`](../../PRD.md) §4 mapping as an enforceable contract, and the
focus model that gives "the current pane" a meaning. Every surface in `004`–`010`
is steered through it.

It ships no new screen. Its deliverable is that a Retroid Pocket Flip user can
reach every part of the existing Orca display without touching the glass.

## Problem

Orca Mobile is touch-only. Nothing in `mobile/src/` reads a gamepad, and neither
React Native nor Expo exposes one — iOS needs `GameController.framework`, Android
needs `InputDevice` joystick axes and key events.

PRD §7 makes controller interaction "a first-class design constraint, not an
input accessory". That is the difference between this feature and a settings
toggle: if the controller is added on top of a touch app, every surface built
after it inherits touch assumptions — hit targets sized for fingers, scroll
driven by momentum, no notion of what is focused. Those assumptions are cheap to
adopt and expensive to remove, so the input model has to exist before the
surfaces do.

## Scope

**In scope**

- Controller discovery, connection and disconnection, for Android integrated
  controls and for Bluetooth controllers on iOS and Android.
- Button and analog-axis capture, including a dead zone and analog triggers.
- Chord recognition — `Y` held as a modifier over `LB`/`RB`.
- The §4 mapping expressed as data, plus the d-pad additions this spec records.
- The focus model: which pane holds focus, which item is selected within it, and
  which session that pane belongs to.
- Resolving a raw input to an intent, given the current focus.
- Making controller presence visible, so a disconnected pad is not mistaken for
  a frozen app.

**Out of scope**

- The Context Wheel itself (`002`). This feature reports that a stick left the
  dead zone, where it points, and whether `A` or a cancel followed. What a wheel
  contains and what committing a segment does belongs to `002`.
- Dictation (`003`). `R3` resolves to a toggle intent and stops there.
- A remapping UI. §4 is "the initial controller contract"; it is data so it can
  be changed in one line, but the MVP ships no settings surface for it.
- Replacing touch. Touch keeps working everywhere it works today.
- On-screen virtual controls.

## Requirements

### CTRL-R1 — The mapping is data, not scattered handlers

The §4 table exists once, as a value in `src/gamepad/domain/`. A feature never
listens for a button; it declares the intents it accepts. This is what makes the
contract inspectable, testable without a device, and changeable in one edit.

The mapping, including the d-pad rows this spec adds:

| Input | Intent |
| ----- | ------ |
| L2 (analog) | scroll up — focused pane |
| R2 (analog) | scroll down — focused pane |
| LB / RB | previous / next session tab — current workspace |
| Y + LB/RB (hold) | previous / next workspace or project |
| D-pad ↑ / ↓ | move selection — focused pane |
| D-pad ← / → | move focus between panes (wide layouts only) |
| Left stick (motion) | open Wheel 1 |
| Right stick (motion) | open Wheel 2 |
| A | confirm — commits the held wheel segment, else the focused selection |
| B | reject / back |
| X | stop — cancel the focused session's in-flight turn or tool call |
| R3 | toggle dictation |
| L3 | unassigned |

D-pad rows are an addition to PRD §4, not a reinterpretation of it: §4 assigns
no input to moving a selection, and a file tree cannot be operated without one.

### CTRL-R2 — Focus is explicit and always resolvable

At any moment exactly one pane holds focus, and asking "which pane is focused"
never returns nothing. Focus survives navigation: pushing a route moves focus to
the new content, popping returns it.

The panes are the ones Orca already has — the workspace sidebar and the detail
stack (`app/h/_layout.tsx`). On narrow layouts the sidebar is not mounted, so
focus has one place to be and `D-pad ←/→` does nothing.

### CTRL-R3 — Every intent resolves against focus, never against a screen

`X` means "stop the focused session's turn" whether the user is looking at the
transcript, the file tree or the terminal. `L2`/`R2` scroll whatever is focused.
A feature that is not focused receives nothing.

When the focused pane belongs to no session, `X` is a no-op — silent, with no
side effect. Guessing a target for a destructive action is worse than doing
nothing.

### CTRL-R4 — A chord is modal, and never sticky

`Y` held changes what `LB`/`RB` mean. Releasing `Y` restores them within the
same input frame. `Y` pressed and released without `LB`/`RB` does nothing — it
is a modifier, not a button with its own action.

### CTRL-R5 — Analog inputs stay analog

`L2`/`R2` deflection sets scroll velocity, not a fixed step: a light pull creeps,
a full pull races. Stick position is reported as a continuous vector, because
`002` needs the angle and not merely a direction.

A dead zone is applied once, in this feature. No consumer re-derives it.

### CTRL-R6 — The controller's presence is visible

A disconnected controller is indistinguishable from a frozen app unless the app
says so. Connection and disconnection are observable state, and the app surfaces
disconnection rather than silently ignoring input.

### CTRL-R7 — Capture is replaceable

The device is read behind a port. The mapping, the focus model and every intent
are platform-free and survive the reader being swapped — which PRD §9 requires,
since a standalone product will not carry this one.

### CTRL-R8 — Input has a latency budget

PRD §3 requires the wheel to open "immediately" with "no hold-to-summon delay".
Immediacy is therefore a measured property, not a feeling: from a sample
crossing the dead zone to the intent being published is budgeted, and the budget
is asserted in a test rather than eyeballed on a device.

## Acceptance criteria

- **CTRL-AC1** — The §4 mapping resolves from a table in `src/gamepad/domain/`.
  Searching `src/gamepad/features/` for a raw button or axis name returns no
  hits.
- **CTRL-AC2** — Every input in the CTRL-R1 table resolves to exactly one intent
  under the default focus, proven by a table-driven test with no device attached.
- **CTRL-AC3** — `Y` + `LB` emits a workspace-change intent; `LB` alone emits a
  tab-change intent; `Y` alone emits nothing; releasing `Y` restores `LB`
  immediately.
- **CTRL-AC4** — Asking for the focused pane always returns one, including
  before the first frame, during a route transition, and after a pane unmounts.
- **CTRL-AC5** — `X` with a focused pane that owns no session emits nothing and
  changes no state.
- **CTRL-AC6** — A stick held inside the dead zone publishes no motion; crossing
  it publishes a continuous vector, with the angle preserved to at least one
  degree.
- **CTRL-AC7** — Disconnecting the controller mid-session is observable to the
  app within one second, and reconnecting restores input with no relaunch.
- **CTRL-AC8** — Dead-zone crossing to published intent stays within the budget
  recorded in `tech.md` §6, measured in a test.
- **CTRL-AC9** — Deleting the native module and binding the stub reader leaves
  `pnpm typecheck:extraction` green.

## Non-goals

- Reproducing a desktop keyboard model (no chorded text entry, no modifiers
  beyond `Y`).
- Haptics. Worth exploring later; not part of the interaction contract.
- Multiple simultaneous controllers.
- Gyro, touchpad, or back-button inputs some pads expose.
