# 001 - Controller Input

## Purpose

Make a physical controller the primary way to operate the existing Orca Mobile
experience while touch remains available.

This specification owns physical input capture, the PRD mapping, intent
resolution, and focus registration. It does not own any Orca screen or remote
capability.

## Scope

In scope:

- integrated Android controls and Bluetooth controllers on Android and iOS;
- button, stick, and analog-trigger samples;
- one dead-zone policy;
- the accepted PRD mapping as inspectable data;
- the `Y` modifier over `LB` and `RB`;
- focus registration by existing Orca Mobile surfaces;
- observable controller connection state;
- separately identified D-pad experiments.

Out of scope:

- replacement routes, panes, or navigation state;
- final Context Wheel contents;
- remapping settings;
- on-screen virtual controls;
- multiple simultaneous controllers;
- replacing touch.

## Requirements

### CTRL-R1 - The PRD mapping is the contract

The accepted mapping exists once as data:

| Input | Intent |
| --- | --- |
| L2 analog | Scroll up in the focused surface |
| R2 analog | Scroll down in the focused surface |
| LB / RB | Previous / next tab in the current project or workspace |
| Y + LB/RB held | Previous / next worktree or project |
| Left stick motion | Drive Wheel 1 |
| Right stick motion | Drive Wheel 2 |
| A | Commit a locked wheel segment, otherwise confirm |
| B | Reject or go back |
| X | Stop the focused session's in-flight agent turn or tool call |
| R3 | Toggle dictation for the focused text target |
| L3 | Unassigned |

Existing surfaces receive intents, never raw button or axis names.

### CTRL-R2 - D-pad behavior is experimental

The D-pad is not part of the PRD contract. A separate provisional mapping may be
enabled for trials:

| Input | Candidate behavior |
| --- | --- |
| D-pad up/down | Move selection in the focused surface |
| D-pad left/right | Move focus, collapse/expand a tree node, or navigate hierarchy according to the focused surface |

The provisional mapping has separate tests and configuration. It can be removed
without changing `CTRL-R1` or the intent resolver's contract table.

### CTRL-R3 - Focus resolves existing surface actions

Exactly one mounted focus target is active when controller input is dispatched.
The target is registered by the existing route or component and invokes actions
already owned by its controller or callback props.

If an intent has no valid target, it produces no destructive side effect. In
particular, `X` never guesses a session.

### CTRL-R4 - Chords are non-sticky

Holding `Y` changes `LB` and `RB` to workspace/project cycling. Releasing `Y`
restores tab cycling on the same sample transition. `Y` alone does nothing.

### CTRL-R5 - Analog inputs remain analog

Trigger deflection controls scroll velocity. Stick samples retain their vector
after one normalized dead-zone policy so the wheel receives continuous angle
and magnitude.

### CTRL-R6 - Wheel opening has no input-layer delay

The reader and resolver add no hold timer, debounce, or summon delay between a
stick crossing the dead zone and publishing wheel motion.

### CTRL-R7 - Controller presence is visible

Disconnect and reconnect are observable. A non-blocking notice explains lost
controller input while touch remains usable.

### CTRL-R8 - Hardware-dependent behavior is gated by evidence

Retroid key mapping, trigger behavior, Android event delivery, terminal WebView
interception, disconnect timing, and end-to-end latency are not complete until
recorded on hardware.

## Acceptance criteria

- **CTRL-AC1** - A table-driven test covers every accepted mapping in CTRL-R1;
  provisional D-pad rows are absent from that table.
- **CTRL-AC2** - `Y+LB` cycles workspace/project, `LB` cycles tab, `Y` alone is
  inert, and release restores the unmodified action.
- **CTRL-AC3** - Existing feature and route modules contain no raw controller
  button or axis vocabulary.
- **CTRL-AC4** - A destructive intent with no focused session invokes nothing.
- **CTRL-AC5** - Stick motion inside the dead zone publishes no wheel motion;
  crossing it preserves angle and magnitude.
- **CTRL-AC6** - Disconnect releases held-button state and dismisses the notice
  after a successful reconnect.
- **CTRL-AC7** - The D-pad experiment can be disabled without changing the PRD
  mapping or touch behavior.
- **CTRL-AC8** - Retroid and iOS controller records identify the device, OS,
  control map, trigger form, WebView result, disconnect result, and latency.

## Non-goals

- Desktop keyboard emulation.
- Haptics, gyro, touchpad, or vendor back buttons.
- Treating a provisional D-pad experiment as an accepted contract.
