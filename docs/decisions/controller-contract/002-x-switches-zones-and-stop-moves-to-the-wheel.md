# X switches zones, and stopping moves to the wheel

**Date:** 2026-10-05
**Status:** applied in `005` USE-T4, pending human ratification
**Supersedes:** the PRD position that `X` stops or interrupts the agent (section 4)

## What the PRD said

> X | Stop / interrupt — kills in-flight agent turn or tool call, any pane

## What forced the change

The first device session found no way to move the controller between the agent, its
shortcut keys and the header: everything that was not the agent needed a finger. The
product owner asked for `X` to switch between those zones, with the current zone always
clear, and said that "L1/R1 are tabs only" and panels should become a zone of their own
rather than part of the tab ring.

`X` cannot be both. A stop on the most reachable face button is also a stop one slip
away, so giving the button up is cheap, provided the stop is still a deliberate gesture.

## What changed

- `X` is `switch-zone`. It cycles agent, shortcuts, header, panels, skipping any that
  does not exist on the screen, and is not offered when there is nothing to switch to.
- Stopping the agent is a segment of the right wheel ("Stop agent"). It needs a lock and
  `A`, and `B` or centring cancels it with no effect, which is a stronger guarantee than a
  button press ever gave.
- `L1`/`R1` cycle tabs only. The files, source control and pull request panels are the
  `panels` zone, reached with `X`.
- The binding row is data (`PRD_CONTROLLER_BINDINGS`), so the change is one row and its
  test, and the hint bar follows by construction.

## What it costs

A stop is now two gestures away from a held pad, where it was one button. For an agent
running something it should not be, that is a real cost. The wheel's stop is
`availability: available` only while the surface in front can stop, so it never offers a
stop that would do nothing.

## Ratification

Applied on the product owner's instruction in the question round that opened `005`. It
earns a human yes on the device: if stopping an agent from the wheel feels too slow while
an agent is misbehaving, this is the decision to revisit, and it is reversible.
