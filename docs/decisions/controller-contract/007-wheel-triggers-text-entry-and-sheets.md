# The wheel answers to the triggers, text entry is hidden until wanted, and a sheet takes the pad

**Date:** 2026-10-05
**Status:** applied in `005` round 2 (USE-T16 to USE-T21), pending human ratification
**Amends:** decision 004 (`A` and `B` steer an open wheel), decision 006 (the right wheel's contents)

## What the specifications said

An open wheel was steered by `A` (select) and `B` (cancel), the right wheel had four segments
including Open web page, the session's text-entry strip (the terminal's input bar and the chat's
composer) was always on screen, a chat draft had no caret, and a sheet opened over the app was a
dead end for the pad.

## What the second device session found

The first pass worked overall. The product owner's list:

- `L2`/`R2` did not scroll an opencode terminal, though they scrolled Antigravity's.
- The text-entry strip eats vertical space the transcript needs, and is wanted only while words are
  being made.
- A chat draft needs a caret the D-pad moves, `B` as delete-a-word, and dictation landing at the
  caret, as a terminal's prompt already has.
- The wheel should be steered by `R2`/`L2`, named on each side of the screen, with no label in the
  middle; Open web page goes; a chat/terminal toggle and an input toggle come.
- A button that opens a sheet should hand the pad to the sheet, and `B` should close it.
- `X` should reach the header of the host screen, for the filters.

## What changed

- **opencode's scroll was a bug in the engine build, not in the binding.** esbuild 0.25 lowers
  `x ||= {}` for the `chrome74` target, and with syntax minification it dropped the declaration of
  `x` in xterm's `requestMode`. Every DECRQM (`CSI ? Ps $ p`) threw `i is not defined`. opencode asks
  which modes the terminal knows in the same write that switches to the alternate screen and turns
  the mouse on, so the whole write was lost and the pane never learned it was in a mouse-tracking
  TUI. Antigravity sends no DECRQM, which is why only opencode failed. The build no longer minifies
  syntax, and a test runs the engine itself against a DECRQM followed by the mode switches.
- **A trigger steers an open wheel.** A firm pull (half travel) of `R2` selects what is lit and `L2`
  backs out, one level at a time. `A` and `B` do nothing under a wheel. A trigger held when the wheel
  opened never fires, and one pulled under a wheel does not scroll when the wheel closes. The two are
  named in the bottom corners of the screen, dimmed rather than hidden when nothing selectable is lit,
  and the middle of the dial is empty because the highlight says what is chosen.
- **Open web page is gone**, with the port scan behind it. The right wheel is Launch agent, Chat /
  terminal, Stop agent, Show / hide input, Close agent: stop and close are never adjacent.
- **Text entry is hidden until wanted, while a pad is attached.** The wheel pins it open or shut; a
  draft in it opens it by itself (dictation fills one in a chat) and it goes again when the draft is
  sent. Without a pad nothing changes (BIND-AC10).
- **Editing by caret.** In a chat the draft is drawn with a block caret, `D-pad` moves it (by
  character sideways, by line up and down), `B` deletes the word before it, and dictation lands at it.
  In a terminal, `B` deletes a word (Ctrl+W) while the strip is up and sends Escape otherwise. A touch
  on a chat draft hands over to the real keyboard input.
- **A sheet takes the pad.** Every sheet is a React Native `Modal`, its own Android window, so the
  controller layer hears nothing while one is up. Opening one now focuses the first control in it,
  after which Android's own focus walks it: the D-pad moves, `A` presses, `B` closes. A ring in the
  controller accent is drawn for focus inside a sheet.
- **The host screen has a header zone.** The workspace list is the new `list` zone and the header's
  buttons are its stops; `B` from the header returns to the list. A root fallback makes `B` go back on
  every screen no binding claims, because the pad's own fallback to the system Back key is suppressed.

## What it costs

- `A` and `B` no longer mean anything to a wheel, so a thumb used to `A` for select will press `A` and
  nothing will happen until the habit changes. The cues are on screen to teach it.
- A terminal user who dictates and wants to fix a word must show the input strip first, because that
  is what tells `B` to delete rather than escape.
- Screens other than the host list, the session and the sheets still have no controller bindings.
  `B` leaves them and Android's own focus moves between their buttons, but nothing draws the cursor
  there, and `A` does not press what it is on.

## Ratification

Both wheels are still experiment presets (`contractual: false`). The device run in
`docs/evidence/manual-validation-plan.md` is what ratifies the rest.
