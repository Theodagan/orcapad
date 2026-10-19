/**
 * Every wheel action id, grouped by the wheel that shows it (`012`). The left stick is GO: where
 * you are. The right stick is DO: what you do to the agent or terminal in front of you, with VIEW
 * as its View ▸ submenu. Names only: a surface that can do the thing registers under the id, and
 * `wheel/wheel-layouts.ts` decides where it sits, so neither has to know about the other.
 */

export const GO_ACTION_IDS = {
  back: 'go.back',
  new: 'go.new',
  files: 'go.files',
  changes: 'go.changes',
  history: 'go.history',
  settings: 'go.settings'
} as const

export const DO_ACTION_IDS = {
  launch: 'do.launch',
  stop: 'do.stop',
  keys: 'do.keys',
  close: 'do.close',
  keyboard: 'do.keyboard',
  view: 'do.view'
} as const

export const VIEW_ACTION_IDS = {
  chatTerminal: 'view.chat-terminal',
  focusMode: 'view.focus-mode',
  shortcuts: 'view.shortcuts',
  input: 'view.input',
  question: 'view.question'
} as const
