# 002 — Context Wheel

## Purpose

Build the Context Wheel as a mechanism, and leave what it contains open.

[`../../PRD.md`](../../PRD.md) §2 names the wheel as the thing the MVP exists to
validate, and §8 says not to finalize it before experimentation. Those two pull
in one direction: the wheel's *behaviour* must be pinned down hard enough to be
tested, while its *contents* stay data that a feature contributes and anyone can
change in one line.

## Problem

A gamepad has no pointer and few buttons. §4 spends its buttons on the actions
that must always be reachable — confirm, back, stop, dictation — which leaves no
room for the dozens of contextual actions a coding environment needs: approve a
tool call, switch worktree, open the file tree, retry, rewind, close a tab.

A wheel is the bet: a stick already reports a direction continuously, so an
eight-way menu costs no buttons and no travel. Whether that is actually good to
use is exactly what the MVP is meant to find out — which is why this feature
ships the mechanism and a registry, not a menu.

## Scope

**In scope**

- The wheel state machine implementing §3's six rules.
- Segment geometry: mapping a stick angle to a segment, including directions
  that have no segment.
- A typed registry a feature contributes segments to, and the availability of a
  segment that cannot currently act.
- Rendering: the wheel overlay, the needle, the locked segment.
- Both wheels — left stick opens Wheel 1, right stick opens Wheel 2.

**Out of scope**

- Which segments exist. `004`–`010` contribute their own; this feature ships an
  empty registry and the tests that prove an empty wheel behaves.
- Reading the stick (`001`).
- Touch equivalents for wheel actions. A wheel action must also be reachable
  some other way, but that is each feature's obligation, not this one's.

## Requirements

### WHEEL-R1 — The six rules are the contract

PRD §3's list is this feature's state machine, restated as behaviour:

1. Leaving the dead zone opens the wheel. Nothing else opens it.
2. The wheel locks onto the segment the stick points at.
3. Motion alone never runs anything.
4. `A` commits the locked segment.
5. Returning to centre, or pointing where no segment is, cancels.
6. There is no summon delay — no hold, no timer, no animation the user waits on.

### WHEEL-R2 — Cancel has zero side effect

A cancelled wheel leaves nothing behind: no state change, no request, no
optimistic update, no analytics event that implies intent. This is what makes
the wheel safe to open by accident, and accidental opens are guaranteed on a
stick with no detent.

The only way a segment's action runs is `A` while that segment is locked.

### WHEEL-R3 — Segments are contributed, never hardcoded

A wheel's contents come from a registry that features write into. This feature
knows a segment has an id, a label, an angle and an availability; it never knows
what any particular segment does.

The MVP ships with both wheels empty. That is deliberate — an empty wheel is a
state the machine must handle, and shipping assignments here would make them
this feature's to change.

### WHEEL-R4 — One wheel at a time

Opening Wheel 1 while Wheel 2 is open is not a state. While a wheel is open the
other stick is ignored, and it cannot steal the commit.

### WHEEL-R5 — A segment that cannot act says so

Segment availability is the `Capability` vocabulary the foundation already
defines: `available`, `unavailable`, `unknown`. An `unavailable` segment renders
visibly disabled and refuses the commit; an `unknown` one renders normally,
because unknown is not a refusal.

This matters on a wheel more than in a menu: the ring's shape is how a user
builds muscle memory, so segments must not appear and disappear with host
capability. They stay in place and change state.

### WHEEL-R6 — Immediacy is structural, not tuned

The wheel opens on the input frame that crosses the dead zone. Nothing about the
implementation may introduce a wait — no hold timer, no debounce, no entry
animation the commit has to queue behind. A user may open, lock and commit
faster than any animation completes, and that must work.

### WHEEL-R7 — The wheel never blocks what is underneath

While open, the wheel is an overlay. The session underneath keeps streaming,
scrolling continues to arrive, and nothing is paused because a menu is up.

## Acceptance criteria

- **WHEEL-AC1** — Each of §3's six rules has a named test asserting it, and the
  test names cite the rule number.
- **WHEEL-AC2** — A full open → lock → return-to-centre cycle over a registry
  whose segments all record invocations leaves every record empty.
- **WHEEL-AC3** — `A` outside an open wheel never commits a segment; `A` inside
  an open wheel with no locked segment cancels rather than committing.
- **WHEEL-AC4** — With both wheels registered, moving the right stick while
  Wheel 1 is open changes nothing, and `A` still commits Wheel 1's segment.
- **WHEEL-AC5** — An empty wheel opens, locks nothing, and cancels on `A` —
  without throwing.
- **WHEEL-AC6** — Committing an `unavailable` segment runs nothing and leaves
  the wheel open; committing an `unknown` segment runs its action.
- **WHEEL-AC7** — From the dead-zone crossing sample to the wheel's open state
  there is no intervening timer, asserted by driving the machine with fake
  timers and never advancing them.
- **WHEEL-AC8** — Searching `src/gamepad/features/` for wheel segment geometry
  (angles, arc widths) returns no hits: geometry lives in this feature.

## Non-goals

- Nested or multi-level wheels.
- Radial text entry.
- Gesture flicks, or committing by releasing the stick instead of pressing `A` —
  §3 rule 3 forbids it, and it is the rule most likely to be "improved" away.
- Per-user segment customisation.
