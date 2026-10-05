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

## What the second device session found

The first pass worked overall. The second session's list, answered by round 2 (USE-R14 to USE-R19,
decision `007`): `L2`/`R2` did not scroll an opencode terminal; the text-entry strip costs vertical
space and is wanted only while words are being made; a draft needs a caret, `B` as delete-a-word and
dictation at the caret; the wheel should be steered by `R2`/`L2`, labelled on each side, with no
label in the middle; Open web page goes and a chat/terminal toggle comes; a button that opens a
sheet should hand the pad to it; `X` should reach the host screen's header. The stated goal is that
every surface is reachable by pad, with a redesign for vertical space to follow.

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
- **Hand off is out of scope.** In Orca a hand-off moves a session from one agent
  to another without losing context. Orca Mobile does not expose that, so there is
  nothing for the wheel to reach.

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
| Agent | the agent chat or terminal and its composer | arrow keys in a terminal (USE-R6); scroll, or move the cursor of an open question, in a chat | Enter in a terminal; in a chat, answer a waiting permission, else send the composed message | Escape in a terminal; in a chat, dismiss a waiting prompt |
| Shortcuts | the quick keys and commands under the agent | move across them | press the highlighted one | back to the agent zone |
| Header | back, status, panel buttons, tabs, new tab | move across them | activate the highlighted one | back to the agent zone |
| Panels | the open files, source control or pull request panel | move through its rows | open or toggle the row | close the panel, back to the agent zone |

The agent zone is the default. The zone is remembered while the screen is up, and a
zone that is a row of buttons remembers its cursor, except the header, which starts
from the active tab each time.

Opening a panel with `A` on its header button moves the controller into it, so the
buttons that opened it do not keep driving the header. Closing it returns to the
agent.

### USE-R5 - Focus is always visible

Whatever the D-pad has selected, in any zone, on any screen, is unmistakable at a
glance and on a dark background, without relying on colour alone, and without
moving the layout when it appears. One ring, defined once. Where the platform has
a native focus for the element, the ring and the native focus agree: on Android the
element under the cursor is also given the platform's input focus, so its own focus
highlight, scroll-into-view and screen-reader cursor follow the pad.

The zone itself is bordered in the same accent, slightly, and its name is in the hint
bar. A cursor is drawn only in the zone the pad is pointed at; a ring in a zone the
buttons will not reach would lie about where they go.

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
`Y` with `L1`/`R1` keeps moving between worktrees on the workspace list. It is not
bound inside a session; see "Known gaps".

### USE-R9 - The left wheel

**Back to menu** (the workspace list of the current host) and **Create a new worktree**, and, from a
session, the two view toggles of USE-R20: **Focus mode** (north) and **Shortcuts** (south). The six
placeholder slots are gone. Off a session the two toggles show greyed out, like every session action.

### USE-R10 - The right wheel

Six segments, replacing the canned replies (round 2 removed Open a web page and added the two
toggles, decision `007`; round 3 added Keyboard, decision `009`):

| Segment | Does |
| --- | --- |
| Launch an agent | opens a second wheel of every agent the new-tab drawer offers |
| Chat / terminal | switches the tab between its chat and its terminal, through the tab menu's own toggle; says where it goes |
| Stop the agent | interrupts the running turn: Escape in a terminal, the chat's own stop in a chat |
| Show / hide input | shows or hides the text-entry strip (USE-R16) |
| Close the agent | closes the current agent, through the existing tab-close path |
| Keyboard | raises the soft keyboard on the text entry the session is showing, or lowers it when it is up (USE-R23) |

Hand off was asked for and is out of scope (see the product decision above).

A segment that cannot run where the user is renders disabled and cancels. Stop is
offered by the surface that can stop, so it is available in a terminal and in a chat
that has a turn to stop, and nowhere else. Chat / terminal is available on a terminal tab whose
agent has a chat view, and nowhere else. Close and stop are destructive: the preset says so
(WHEEL-R7), and the decision to ship them is recorded where the promotion gate reads it. They are
never adjacent on the dial: a harmless choice sits between them.

### USE-R11 - An open wheel captures all input

From the first sample that opens a wheel until it closes, no input reaches the
Orca UI. Every intent is taken by the wheel, including the other stick's, scroll,
tab and zone buttons, the D-pad, and `Y`. The native layer stops forwarding
controller keys to the view tree, so the platform's own focus cannot move
underneath. Touches are swallowed by the overlay. A button pressed while a wheel
is open never acts after it closes. A controller that disconnects mid-gesture cancels
the wheel, so the overlay can never be left holding a screen nothing can reach.

### USE-R12 - Hints tell the truth

The hint bar names what each button does where the controller is now: the zone,
the action ("Enter", "Back"), and, while a wheel is open, what `R2` and `L2` do to
the wheel. It never shows a control name as its own label. It is hidden completely in focus mode
(USE-R20).

### USE-R13 - Touch remains exactly as it was

Unchanged from BIND-AC10. Nothing here removes or degrades a touch path, except
that an open wheel swallows touches for as long as it is open (USE-R11). Everything
added in round 2 that changes what is drawn applies only while a pad is attached.

### USE-R14 - A terminal that asks what the terminal knows still scrolls

A full-screen program that probes the terminal's modes before it switches to the alternate screen
(opencode does) must reach the alternate screen with the mouse on, so `L2`/`R2` scroll it as they
scroll one that does not probe. The engine answers a mode query rather than throwing on it.

### USE-R15 - The wheel is steered by the triggers

While a wheel is open, a firm pull of `R2` selects what is lit (or opens a second wheel) and `L2`
cancels (or steps back a level). `A` and `B` do nothing under a wheel, and neither does scroll. A
trigger held when the wheel opened never fires, and one pulled under a wheel does not scroll when the
wheel closes. The two triggers are named in the bottom corners, each on its own side of the screen:
`L2` "Cancel" (or "Back" in a second wheel) on the left and `R2` "Select" (or "Open") on the right,
the latter dimmed when nothing selectable is lit. The middle of the dial is empty: the highlight says
what is chosen. A second wheel's title sits above the dial; loading, empty and failed menus are said
in the middle, because there is nothing to highlight.

### USE-R16 - Text entry is hidden until wanted

With a pad attached, the terminal's input bar and the chat's composer are not drawn until something
asks for them. The wheel's Show / hide input pins the strip open or shut. A chat composer also opens by
itself while a draft is in it (dictation fills one) and goes again once the draft is sent; a terminal's
buffered command draft does the same. A strip put away with a draft in it stays away until a new draft
begins. A raised keyboard keeps the strip up, because someone is typing into it. The terminal's input
bar is hidden, not unmounted, so its refs and the live input's state are undisturbed. Without a pad
nothing changes.

### USE-R17 - A draft is edited by caret

While the strip is up the agent zone edits text. In a chat the draft is drawn with a block caret over
the character it sits before, `D-pad` left/right moves it by character, up/down by line (a draft with
no line breaks goes to its start or end), `B` deletes the word before it (Ctrl+W's rule), and `A`
sends. Dictation lands at the caret, spaced from its neighbours, and leaves the caret after it. `D-pad`
and `B` take the draft only while it has words, and `B` steps aside when the caret has nothing before
it, so a permission prompt waiting for a "no" still gets it. A pending permission or question keeps
the D-pad. In a terminal, the arrows are the prompt's arrows as before, dictation is typed at the
prompt's caret by the terminal, and `B` sends Ctrl+W instead of Escape while the strip is up. A touch
on a chat draft hands over to the keyboard input, with the caret where it was.

### USE-R18 - A sheet takes the pad

Opening a sheet (the filter, sort and group pickers, the action sheets, the new-tab sheet, quick
commands, confirmations) focuses the first control in it. The D-pad then moves between its controls,
`A` presses the one it is on, and `B` closes it. The focused control has a ring in the controller
accent. The backdrop is not a focus stop.

### USE-R19 - The host screen has a header zone, and B leaves any screen

On the host screen `X` walks from the workspace list to the header and back; the header's filter,
sort, group, accounts, tasks and search buttons (and back, reconnect and, where shown, floating
workspace, hide sidebar and new workspace) are its stops. `B` in the header returns to the list. The
list's cursor leaves with the pad. Where no binding claims `B`, it goes back one screen.

### USE-R20 - Focus mode and a hideable shortcut row

For a session whose agent draws its own prompt and footer (opencode's sits at the bottom of its
screen and cannot be scrolled away), the app's own chrome is the space it can give back. Two toggles
on the left wheel, both only while a pad is attached and only in a session, both reset when the
session ends:

- **Focus mode** hides the Android status and gesture bars, makes the header one line (back, title with
  its connection dot, the tab chips scrolling and kept in view, then the new-tab, quick-commands, files,
  source-control and more buttons), and hides the hint bar completely, with a wheel open or not. The
  header zone still works: `X` walks into it and the D-pad walks the one row in the order it is drawn.
- **Shortcuts** hides the shortcut key row and, with it, the shortcuts zone, so `X` goes from the agent to
  the header. Escape, Enter and the arrows remain on `B`, `A` and the D-pad. A raised keyboard keeps the
  row, because its dismiss button is the way out of the keyboard.

Each says where it goes ("Focus mode" / "Exit focus mode", "Hide shortcuts" / "Show shortcuts"). The
terminal re-fits through the existing frame layout, so the TUI gains the rows. Without a pad nothing
changes.

### USE-R21 - Every project on the host list can be reached and opened

A project group is a stop of its own on the workspace list, collapsed or not. The D-pad walks every
header and every row in the order they are drawn, so a collapsed project is no longer skipped. On a
header `A` toggles the group; right opens a collapsed one and left closes an open one; on a row, left
goes up to its project, so a group can be closed from inside it. The list still opens on its first
workspace, so `A` opens something at once, and `L1`/`R1` (worktree cycling) still step over rows only.
The header draws the same ring as a row.

### USE-R22 - `B` deletes a word in any text field

Where a text field has the pad's focus and is on screen, `B` deletes the word before the caret and
does not go back: the chat composer with the keyboard up, the terminal's input bar, and the fields of a
sheet. It is the same rule as Ctrl+W (a selection is deleted whole). A terminal reads `B` as Ctrl+W
while its input strip is shown or the keyboard is up, and as Escape otherwise (USE-R16).

### USE-R23 - A Keyboard action on the right wheel

For text the pad cannot make (a path, a flag, a password), the right wheel can raise the soft keyboard
on the session's text entry: the terminal's input bar or the chat composer. It is not the platform's
fullscreen keyboard: the text fields opt out of Android's extract UI, so the session stays visible above
the keyboard. The segment says "Hide keyboard" while the keyboard is up. It is offered in a terminal and
in a chat, and nowhere else. If the keyboard never rises the request lapses, so the strip does not stay
open on its own.

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
- **USE-AC8** - The left wheel has exactly its four segments; the right wheel has
  exactly its six; committing each reaches the intended existing path.
- **USE-AC9** - The second-level wheel lists the live agents, shows
  loading, empty and error states, and cancels with no side effect.
- **USE-AC10** - With a wheel open, a property test over every intent kind shows
  no focus target receives any; the native layer swallows controller keys; a
  touch on the overlay reaches nothing beneath it; a button pressed during the
  wheel does nothing after it closes.
- **USE-AC11** - No hint renders a control name as its own label, and the hint
  bar reflects the wheel while one is open.
- **USE-AC12** - Every touch entry point `003` listed still reaches its action.
- **USE-AC13** - The reachability audit of `004` is updated to the new contract
  and still fails when a step becomes unreachable.
- **USE-AC14** - The generated engine answers a mode query and still applies the mode switches
  that follow it in the same write, run against the engine itself and against a real opencode
  transcript in a browser engine.
- **USE-AC15** - With a wheel open, `R2` selects, `L2` cancels or steps back, `A`, `B` and scroll do
  nothing, and a trigger pulled under the wheel does not scroll after it closes.
- **USE-AC16** - With a pad attached, a session's text-entry strip is absent until the wheel shows it
  or a draft is in it; without a pad it is always there.
- **USE-AC17** - In a chat, the D-pad moves the caret, `B` deletes a word, dictation lands at the
  caret, and the transcript still scrolls when there is no draft.
- **USE-AC18** - Opening a sheet puts native focus on a control inside it, with a pad attached and not
  otherwise; the D-pad moves it, `A` presses and `B` closes (run on the emulator).
- **USE-AC19** - `X` reaches the host screen's header, each button in it can be pressed with `A`, and
  `B` returns to the list.
- **USE-AC20** - In focus mode with a pad attached the system bars are hidden, the header is one row
  whose stops are walked left to right, and the hint bar renders nothing; with Shortcuts hidden the row
  and its zone are gone; ending the session, the toggle or the pad restores all of it; without a pad
  nothing is drawn differently.

- **USE-AC21** - A collapsed project is reached by the D-pad and opened by `A` or right, an open one
  is closed by left, and the worktree cycle steps over rows only (composed test; run on the emulator).
- **USE-AC22** - With the pad's focus in a text field (the composer with the keyboard up, a sheet's
  field), `B` deletes the word before the caret, does not leave the screen, and is not reported as a
  press (run on the emulator).
- **USE-AC23** - Keyboard on the right wheel raises the soft keyboard on the session's text entry
  without Android's fullscreen UI, reads "Hide keyboard" while it is up, and ends its request when the
  keyboard goes or never comes.

## Known gaps

Stated here rather than discovered later.

- **Nothing in this pass has been run on a device.** Every behaviour is proven by
  composed tests; the Retroid run in `docs/evidence/manual-validation-plan.md` is what
  ratifies it. The native changes (capture, native focus) compile under Gradle
  (`:orca-gamepad:compileDebugKotlin`) but need a rebuilt APK and have not run on a device.
- **Trigger input is unverified on the Retroid.** Whether `L2`/`R2` arrive as an
  analog axis or as digital buttons is read from the device; both are handled, and
  neither has been seen.
- **`Y` with `L1`/`R1` is not bound inside a session.** It moves between worktrees
  on the workspace list only.
- **Source control and pull request panels have no controller bindings.** They open
  docked from the header, and are driven by touch.
- **Most other screens are still touch-only.** Home's settings gear and its cards, settings,
  accounts, tasks, host edit, source control and the file previews have no zones. `B` leaves them and
  Android's focus moves between their buttons, but nothing draws a cursor there and `A` does not
  press what it is on. A generic header and list zone is the next step.
- **Round 2 has been seen on the emulator only for sheets and the host header.** The wheel's triggers
  and labels, the caret and `B` as delete-a-word, the hidden strip and the chat toggle are proven by
  composed tests, not on a pad.
- **A sheet's text inputs take focus first.** A sheet whose first control is a text field focuses it,
  which can raise the keyboard.
- **Native focus can still wander in the agent zone.** Android moves its own focus on
  an unconsumed D-pad press. The cursor in the header, shortcut and panel zones and
  in every list pulls it back; in the agent zone nothing does.

## Non-goals

- Treating a passing suite as proof the experience is good. The device run is
  still what ratifies this, and `docs/evidence/manual-validation-plan.md` gains a
  section for it.
- Finalizing wheel contents. Both wheels are still experiment presets.
