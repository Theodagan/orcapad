# Collapsed projects are stops, `B` deletes in text fields, and the wheel can raise a keyboard

**Date:** 2026-10-05
**Status:** applied in `005` USE-T23, pending human ratification
**Amends:** decision 007 (the right wheel's contents; `B` in a draft), decision 001 (what the D-pad walks on the host list)

## What the third device session found

- The host list's D-pad walked workspace rows only, so a collapsed project, which has no rows, was
  skipped and could not be opened with the pad.
- `B` did not delete in text fields: with the keyboard up it left the session, because Android's view
  tree took the key before the app's binding and an unconsumed `B` becomes a synthetic back.
- The caret and dictation editing the product owner called the "live cursor" did not work in the
  touch-keyboard case.
- The pad had no way to make text it cannot dictate.

## What changed

- **Project headers are stops.** `A` or right opens one, left closes one, and left on a row climbs to its
  header. The list still opens on its first workspace.
- **`B` deletes a word** in a focused, visible text field, decided in the native tap for the activity
  window and by a key listener for dialogs. A terminal reads it as Ctrl+W while its strip is shown or the
  keyboard is up.
- **A sixth right-wheel segment, Keyboard**, raises the soft keyboard on the session's text entry with
  Android's fullscreen UI turned off, so the session stays visible. The product owner asked for this and
  asked that it not take the whole screen.

## What it costs

- The keyboard is Android's own, not a pad-navigable on-screen keyboard. Making one would be a
  feature of its own.
- In a TUI with the strip hidden and no keyboard, `B` stays Escape, because the app cannot know there is
  a word to delete. Shadow-tracking the TUI's line was considered and not built.
- "Live cursor" was read as caret, `B` and dictation editing; if something else was meant it is not
  addressed here.

## Ratification

The right wheel is still an experiment preset (`contractual: false`).
