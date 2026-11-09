# 002 - Context Wheel

## Purpose

Implement the Context Wheel behavior from the PRD while keeping Wheel 1, Wheel
2, segment count, placement, and actions open for experimentation.

## Scope

In scope:

- both wheel state machines;
- angle and segment geometry;
- overlay rendering;
- replaceable segment registration;
- mutable, non-contractual experiment presets;
- device-trial evidence and human acceptance gates.

Out of scope:

- final wheel assignments;
- hardcoded feature-owned segment lists;
- release-to-commit, flick gestures, nested wheels, or radial text entry;
- duplicating an Orca action to make it wheel-accessible.

## Requirements

### WHEEL-R1 - The six PRD rules are exact

1. A wheel opens immediately when its stick leaves the dead zone.
2. It locks the segment indicated by the stick.
3. Stick movement alone never executes an action.
4. `A` commits the currently locked segment.
5. Returning to center or leaving a valid segment before `A` cancels with zero
   side effect.
6. No hold-to-summon delay exists.

### WHEEL-R2 - Commit is the only action boundary

Segment actions can run only from the state machine's commit outcome. Opening,
moving, locking, unlocking, canceling, disconnecting, and unmounting invoke no
segment action.

### WHEEL-R3 - Mechanics do not know contents

Geometry and state know segment ids, positions, labels, and availability. They
do not know pairing, session, agent, terminal, file, or navigation actions.

### WHEEL-R4 - Both wheels are independent but mutually exclusive

Left-stick motion drives Wheel 1 and right-stick motion drives Wheel 2. Only one
wheel may be open; the inactive stick cannot steal its selection or commit.

### WHEEL-R5 - Immediacy is structural

Opening has no hold timer, debounce, or blocking entry animation. Visual polish
must not delay selection or commit.

### WHEEL-R6 - Presets are experiments, not contract

A preset records a proposed layout for a specific trial. It may bind real,
existing Orca actions through `003`, but it does not establish default Wheel 1
or Wheel 2 behavior.

Each preset records:

- trial id and date;
- target device and controller;
- wheel side;
- segment count and geometry;
- action binding ids;
- destructive-action policy;
- observations and disposition.

### WHEEL-R7 - Early trials are safe

Smoke presets use harmless actions. Real-action presets exclude destructive
actions until cancel and commit behavior passes device trials. A disabled action
does not execute and does not disappear during a trial.

### WHEEL-R8 - Existing surfaces keep running

The overlay does not unmount, pause, or replace the focused Orca surface.

## Acceptance criteria

- **WHEEL-AC1** - Each PRD rule has a named state-machine test.
- **WHEEL-AC2** - Every non-commit path produces zero recorded invocations.
- **WHEEL-AC3** - `A` without an open wheel cannot invoke a segment action.
- **WHEEL-AC4** - The inactive stick does not alter the open wheel.
- **WHEEL-AC5** - An empty or all-disabled preset opens and cancels safely.
- **WHEEL-AC6** - A preset can be replaced without changing geometry, state
  machine, or existing surface code.
- **WHEEL-AC7** - No default assignment exists outside experiment preset data.
- **WHEEL-AC8** - A product default cannot be created without a linked device
  trial and recorded human decision.

## Non-goals

- Selecting assignments in this specification.
- Treating a first successful trial as final UX validation.
