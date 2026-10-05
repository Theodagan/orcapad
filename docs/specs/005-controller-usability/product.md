# 005 - Controller Usability Pass

## Purpose

`004` closed the loop on paper: every step of the agentic cycle had a passing
reachability test. The first device session then found it "nowhere near a usable
experience". Scrolling did nothing, dictation did nothing, the focused element
was hard to see, and the buttons did not mean what a person holding the pad
expected them to.

This specification is the correction. It takes the device feedback as the
requirements and holds itself to the standard `004` missed: a behaviour counts
as working only when it is proven through the **composed** screen, with the real
bindings mounted in their real nesting and a pad driving them over time, not
through a unit test of one binding in isolation.

Source: the device feedback recorded in the session that opened this work
(`feedback.md`, kept out of version control), plus the product decisions below.

## What the device found

| Area | Finding |
| --- | --- |
| Scroll | `L2`/`R2` did not scroll the chat or the terminal |
| Focus | The element under the D-pad cursor was not clearly visible, and only a few screens drew one at all |
| Dictation | Dictation did not work |
| Tabs | `L1`/`R1` did not reliably move between the tabs of a project |
| Zones | There was no way to move the controller between the agent, its shortcuts and the header |
| Agent | The D-pad, `A` and `B` did not drive an agent that is waiting on a menu |
| Wheels | The left wheel held six placeholders; the right wheel held canned replies |
| Wheel capture | An open wheel did not stop the screen underneath from reacting |

## Product decisions

Taken in the question round that opened this work. Each changes a position the
PRD or an earlier specification took, and is recorded under
`docs/decisions/controller-contract/`.

- **Dictation is `Y`**, a tap that toggles the existing dictation. `R3` becomes
  unassigned. `Y` held with `L1`/`R1` is still the worktree chord.
- **`L1`/`R1` cycle tabs only.** Panels (files, source control, pull request) are
  not part of the ring. They are a zone of their own, reached with `X`.
- **`X` switches zone** and no longer stops anything. Stopping an agent moves to
  the right wheel.
- **"Back to menu"** is the workspace list of the current host.
- **The active zone** is shown by one accent: a slightly highlighted border on
  that zone, and its name in the hint bar. Zones do not get their own colours.
- **An open wheel captures all input.** Nothing reaches the Orca UI while a wheel
  is showing: not an intent, not a native key, not a touch.

## Scope

In scope:

- held inputs that keep acting, and the right surface answering them;
- scroll on chat, terminal and every other surface the controller can focus;
- zones, and the D-pad, `A` and `B` meanings inside each;
- one focus ring, used by every focusable thing, plus the platform's native
  focus where it can be reused;
- the agent zone sending arrows, Enter and Escape to an agent;
- dictation on `Y`;
- the two wheels, a second-level wheel, and wheel capture;
- hints that say what the buttons actually do now;
- polish found along the way, listed in `tasks.md` as it is found.

Out of scope:

- an on-screen keyboard for arbitrary text (dictation remains the answer);
- redesigning any touch surface;
- promoting any wheel preset to a product default (`002` WHEEL-T9 still owns
  that gate);
- iOS.

## Requirements

### USE-R1 - A held input keeps acting

A trigger held for a second scrolls for a second, and a stick held out keeps its
wheel open and tracking. Nothing in the controller layer may assume the device
resends an unchanged value.

### USE-R2 - The surface on screen is the surface that answers

An intent reaches the most specific mounted surface that accepts it, and falls
through to the next one when that surface does not. A surface that is not on
screen (an inactive terminal, a covered pane) never takes an intent. A parent can
no longer win focus away from the screen it contains.

### USE-R3 - Scroll works wherever the controller can see content

`L2`/`R2` scroll the agent chat and the terminal, and every other scrollable
surface the controller can focus, from the current position rather than from a
remembered one, and stop at both ends.

### USE-R4 - Zones

`X` moves the controller between zones, in this order: agent, shortcuts, header,
panels. A zone that does not exist on the current screen is skipped. With one
zone, `X` does nothing and no hint is offered.

| Zone | Contains | D-pad | `A` | `B` |
| --- | --- | --- | --- | --- |
| Agent | the agent chat or terminal and its composer | arrow keys (USE-R6) | Enter | Escape |
| Shortcuts | the quick keys and commands under the agent | move across them | press the highlighted one | back to the agent zone |
| Header | back, status, panel buttons, tabs, new tab | move across them | activate the highlighted one | back to the agent zone |
| Panels | the open files, source control or pull request panel | move through its rows | open or toggle the row | close the panel, back to the agent zone |

The agent zone is the default. The zone is remembered while the screen is up.

### USE-R5 - Focus is always visible

Whatever the D-pad has selected, in any zone, on any screen, is unmistakable at a
glance and on a dark background, without relying on colour alone, and without
moving the layout when it appears. One ring, defined once. Where the platform has
a native focus for the element, the ring and the native focus agree.

### USE-R6 - The agent zone speaks keys

In the agent zone the D-pad sends the arrow keys, `A` sends Enter and `B` sends
Escape, so an agent waiting on a menu can be driven. An agent card that already
owns a selection (a question, a permission) keeps answering the same buttons the
same way. `L2`/`R2` keep scrolling.

### USE-R7 - Dictation on Y

A tap of `Y`, pressed and released with no `L1`/`R1` pressed in between, toggles
the existing dictation exactly as the mic button does. It starts only where the
words have somewhere to land, and it always stops a live microphone. Missing
setup or permission is reported where the controller user can see it.

### USE-R8 - Tabs from everywhere

`L1`/`R1` cycle the tabs of the current workspace from every zone and every
surface of the session screen, wrapping, and doing nothing with a single tab.
`Y` with `L1`/`R1` still moves between worktrees.

### USE-R9 - The left wheel

Two segments: **Back to menu** (the workspace list of the current host) and
**Create a new worktree**. The six placeholder slots are gone.

### USE-R10 - The right wheel

Five segments, replacing the canned replies:

| Segment | Does |
| --- | --- |
| Close the agent | closes the current agent, through the existing close path |
| Stop the agent | interrupts it immediately, through the existing stop path |
| Hand off | hands the session to another agent, through the host's handoff |
| Launch an agent | opens a second wheel of every available agent |
| Open a web page | opens a second wheel of the project's open ports, plus "Enter a URL" |

A segment that cannot run where the user is renders disabled and cancels.
Close and stop are destructive: the preset says so (WHEEL-R7) and the product
decision above is recorded where the gate reads it.

### USE-R11 - An open wheel captures all input

From the first sample that opens a wheel until it closes, no input reaches the
Orca UI. Every intent is taken by the wheel, including the other stick's, scroll,
tab and zone buttons, the D-pad, and `Y`. The native layer stops forwarding
controller keys to the view tree, so the platform's own focus cannot move
underneath. Touches are swallowed by the overlay. A button pressed while a wheel
is open never acts after it closes.

### USE-R12 - Hints tell the truth

The hint bar names what each button does where the controller is now: the zone,
the action ("Enter", "Back"), and, while a wheel is open, what `A` and `B` do to
the wheel. It never shows a control name as its own label.

### USE-R13 - Touch remains exactly as it was

Unchanged from BIND-AC10. Nothing here removes or degrades a touch path, except
that an open wheel swallows touches for as long as it is open (USE-R11).

## Acceptance criteria

- **USE-AC1** - A trigger held for one second produces scroll continuously for
  that second, on the chat and on the terminal, through the composed session
  screen.
- **USE-AC2** - With several terminals mounted, scroll and key presses reach the
  visible one only. With a parent and a child both mounted, the child answers
  what it accepts and the parent answers the rest.
- **USE-AC3** - `X` walks the zones in order, skips absent ones, and the active
  zone and its name are visible in the rendered tree.
- **USE-AC4** - Every focusable thing in the header, shortcuts and panels zones
  shows the focus ring when selected, and the ring does not change layout.
- **USE-AC5** - In the agent zone, each D-pad direction, `A` and `B` produce the
  right bytes for a terminal agent, honouring application cursor mode.
- **USE-AC6** - `Y` tapped toggles dictation; `Y` held with `L1`/`R1` cycles
  worktrees and never toggles dictation; `R3` does nothing.
- **USE-AC7** - `L1`/`R1` cycle tabs with focus in each zone.
- **USE-AC8** - The left wheel has exactly its two segments; the right wheel has
  exactly its five; committing each reaches the intended existing path.
- **USE-AC9** - The second-level wheels list the live agents and ports, show
  loading, empty and error states, and cancel with no side effect.
- **USE-AC10** - With a wheel open, a property test over every intent kind shows
  no focus target receives any; the native layer swallows controller keys; a
  touch on the overlay reaches nothing beneath it; a button pressed during the
  wheel does nothing after it closes.
- **USE-AC11** - No hint renders a control name as its own label, and the hint
  bar reflects the wheel while one is open.
- **USE-AC12** - Every touch entry point `003` listed still reaches its action.
- **USE-AC13** - The reachability audit of `004` is updated to the new contract
  and still fails when a step becomes unreachable.

## Non-goals

- Treating a passing suite as proof the experience is good. The device run is
  still what ratifies this, and `docs/evidence/manual-validation-plan.md` gains a
  section for it.
- Finalizing wheel contents. Both wheels are still experiment presets.
