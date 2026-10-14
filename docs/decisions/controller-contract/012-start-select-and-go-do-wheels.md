# Start stops the agent, Select toggles focus mode, and the wheels split into GO and DO

**Date:** 2026-10-14
**Status:** applied in `006`, pending human ratification
**Amends:** decision 007 (the left and right wheels' contents), decision 008 (where Focus mode and the shortcut row toggle live), decision 009 (the right wheel's six segments)

## What the review found

- Start and Select did nothing. Android sent them, the native tap swallowed them so they would not
  replay as a click or a menu key, and the controller layer had no name for either.
- Stop agent and Focus mode are the two things a user reaches for mid-turn, and both sat on a wheel:
  a stick swing, a lock and `R2` for something a single button could do.
- The left wheel mixed navigation with view toggles (Focus mode, Shortcuts), and the right wheel mixed
  acting on the agent with view toggles (Chat/terminal, Show/hide input). Neither wheel had a theme a
  thumb could learn.
- Every screen ran the same two presets, so most segments were greyed out away from a session, and an
  action had no home angle that held from screen to screen.

## What changed

- **Start → Stop agent, Select → Focus mode.** Both are `run-action` rows in
  `PRD_CONTROLLER_BINDINGS`: on the way down, no chord. The provider looks the id up in the wheel
  registry, the same one the wheels resolve through, and runs it. When the action is absent or
  unavailable it plays the error haptic and shows a short notice ("No agent to stop", "Focus mode
  needs a session"). The hint bar shows `Start Stop` and `Select Focus` only while each can run.
- **L3 and R3 stay unassigned.**
- **Left stick = GO (where you are).** Six fixed 60° slots: N Up, NE New, SE Files, S Changes,
  SW History, W Settings. A screen lists only the slots it has; a missing slot is a gap that holds the
  wheel open with nothing lit, so an action keeps its angle on every screen.

  | slot | home | host list | session | other screens |
  |---|---|---|---|---|
  | Up | – | All hosts | Workspaces | Workspaces (All hosts off a host) |
  | New | Pair desktop | New worktree | New worktree | New worktree |
  | Files | – | – | Files panel | – |
  | Changes | – | – | Source control | – |
  | History | – | – | Agent history, where supported | – |
  | Settings | Settings | Settings | Settings | Settings |

- **Right stick = DO (act on the agent or terminal in front of you), in a session only.** N Launch
  agent ▸, NE Stop agent, SE Keys ▸ (terminal tabs: Ctrl+C, Esc, Tab, Shift+Tab, Enter, Ctrl+D, Ctrl+L,
  and Paste when there is something to paste), S Close tab, SW Keyboard / Hide keyboard, NW View ▸
  (Chat/terminal, Focus mode, Shortcuts row, Show/hide input). Stop and Close are not adjacent.
  Elsewhere the right stick opens nothing.
- **Ids are themed** (`go.*`, `do.*`, `view.*`) in one module, and an unavailable segment can say why
  ("No agent here") in the middle of the wheel.
- **Screens retained under the top one register no wheel actions**, so a hidden screen's action
  cannot shadow the visible one's under the same id.
- The file explorer's wheel actions (preview, reload, collapse all) and the cross-surface trial preset
  are gone. Preview and reload stay on `A`; folding stays on the D-pad.

## What it costs

- The left wheel's contents moved: users of `005`'s Back to menu / New worktree / Focus mode /
  Shortcuts wheel have to relearn it.
- Focus mode and the shortcut row toggle moved under View ▸, one level deeper. Focus mode is also on
  Select, which is why it could move.
- Collapse all in the file explorer has no controller path any more.
- Start and Select do not exist on every pad; on one without them both actions stay on DO.

## Ratification

The GO and DO layouts are still preset data with `contractual: false`. The button rows are contract
once this decision is ratified.
