# An open wheel captures all input

**Date:** 2026-10-05
**Status:** applied in `005` USE-T11, pending human ratification
**Amends:** `002` WHEEL-R8 ("existing surfaces keep running") and `001` §7 (resolution order)

## What the specifications said

> WHEEL-R8: The overlay does not unmount, pause, or replace the focused Orca surface.

and, for resolution order, that an open wheel receives wheel motion and `A`, after which
the active focus target receives the other accepted intents.

## What forced the change

While a wheel was open, the screen underneath still reacted: the other stick's motion, the
triggers, the D-pad and `L1`/`R1` all reached whatever was focused, and Android's own focus
traversal moved beneath the overlay. The product owner's instruction was that while a wheel
is showing, every input is caught by the wheel and none interacts with the Orca UI.

## What changed

- **The surface is still mounted and still running.** WHEEL-R8 stands for state: nothing
  unmounts, pauses or is replaced, and an agent keeps streaming under the wheel. What
  changes is that it receives **no input**.
- **Intents.** The wheel is step 1 and takes every intent kind while open, including the
  other stick, scroll, tabs, zones and `Y`.
- **Held buttons.** The resolver is told the pad is captured. A button pressed under the
  wheel never acts after it closes, and the tap tracker and D-pad repeater drop their holds.
- **Native keys and motion.** The gamepad module's `setInputCaptured` makes the window
  callback report pad events to JavaScript and not forward them to the view tree, so
  Android's focus traversal and a focused WebView cannot react. A release for a key the
  view tree already saw go down is still delivered, or the key would stay pressed.
- **Touch.** The overlay takes the responder, so a finger cannot reach what is beneath.

## What it costs

A wheel that fails to close now traps the pad, and its overlay takes touches too. It is why
`spent`, true-centre release and a cancel on disconnect are part of this change rather than
follow-ups: a controller that drops mid-gesture cancels an open wheel, and the native layer
stops capturing when its device list resets.

## Ratification

The behaviour is proven in tests through the composed provider. The native half needs a
rebuilt APK and a device run: the question to answer there is whether anything can still
move the UI while a wheel is up.
