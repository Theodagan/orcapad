# Focus mode and a hideable shortcut row

**Date:** 2026-10-05
**Status:** applied in `005` USE-T22, pending human ratification
**Amends:** decision 007 (the hint bar is always on while a pad is attached)

## What the second device session found

opencode, the user's main surface, draws its prompt box and footer at the bottom of its own screen. The
app cannot scroll them away, and opencode has no chat view in the app (that exists for claude, codex,
grok and omp), so the way to give the transcript room is to give back the app's own chrome.

## What changed

- **Two toggles on the left wheel**, available only in a session and only with a pad attached: Focus mode
  hides the system bars, makes the header one line and hides the hint bar; Shortcuts hides the shortcut row
  and its zone. They are independent, both end with the session, and neither is persisted.
- **The hint bar is hidden completely in focus mode**, the product owner's choice over a one-row version.
  The zone frames still draw, and the wheel's own R2/L2 cues still show while a wheel is open.
- **The left wheel has four segments** (Focus mode north, New worktree east, Shortcuts south, Back to menu
  west), so the two toggles live with the navigation actions rather than among the agent's.

## What it costs

- With the hint bar gone, nothing on screen says what A, B or X do in focus mode; the user knows them or
  leaves focus mode. The zone frame is the only indication of where the pad is pointed.
- Hiding the shortcut row removes its zone: its buttons (display mode, live input, paste, custom keys) are
  reachable by touch only until it is shown again. Escape, Enter and the arrows stay on B, A and the D-pad.
- The bars are restored by an effect's cleanup, so a crash that skips cleanup would leave them hidden until
  the app is reopened.

## Ratification

Both wheels are still experiment presets (`contractual: false`).
