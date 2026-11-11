import type { DeckBinding } from './deck-chords'

/** The deck's bindings: one row per gesture, each naming its intent, label and scope. */
export const DECK_CHORDS: readonly DeckBinding[] = [
  // PAD-1/NAV-12: A confirms, B dismisses the open layer, and B never switches destination.
  {
    chord: { control: 'a', kind: 'tap' },
    intent: 'confirm',
    labelKey: 'deck.chord.confirm',
    scope: 'root',
    touchAlternative: 'deck.touch.row'
  },
  {
    chord: { control: 'b', kind: 'tap' },
    intent: 'dismiss',
    labelKey: 'deck.chord.dismiss',
    scope: 'root',
    touchAlternative: 'deck.touch.close'
  },
  // PAD-11: Y+B is the only back.
  {
    chord: { control: 'b', modifier: true, kind: 'chord' },
    intent: 'back',
    labelKey: 'deck.chord.back',
    scope: 'root',
    touchAlternative: 'deck.touch.back'
  },
  // PAD-2: bare shoulders step through the focused area's items, panels included while they own focus.
  {
    chord: { control: 'l1', kind: 'tap' },
    intent: 'item-previous',
    labelKey: 'deck.chord.itemPrevious',
    scope: 'root',
    touchAlternative: 'deck.touch.previous'
  },
  {
    chord: { control: 'r1', kind: 'tap' },
    intent: 'item-next',
    labelKey: 'deck.chord.itemNext',
    scope: 'root',
    touchAlternative: 'deck.touch.next'
  },
  // PAD-6: Y + a shoulder opens that side on a tap, toggles it on a 450 ms hold, both together on a pair.
  {
    chord: { control: 'l1', modifier: true, kind: 'tap' },
    intent: 'focus-left-panel',
    labelKey: 'deck.chord.focusLeftPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.leftPanel'
  },
  {
    chord: { control: 'r1', modifier: true, kind: 'tap' },
    intent: 'focus-right-panel',
    labelKey: 'deck.chord.focusRightPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.rightPanel'
  },
  {
    chord: { control: 'l1', modifier: true, kind: 'hold' },
    intent: 'toggle-left-panel',
    labelKey: 'deck.chord.toggleLeftPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.panelToggle'
  },
  {
    chord: { control: 'r1', modifier: true, kind: 'hold' },
    intent: 'toggle-right-panel',
    labelKey: 'deck.chord.toggleRightPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.panelToggle'
  },
  {
    chord: { control: 'l1', with: 'r1', modifier: true, kind: 'chord' },
    intent: 'toggle-both-panels',
    labelKey: 'deck.chord.toggleBothPanels',
    scope: 'root',
    touchAlternative: 'deck.touch.panelToggle'
  },
  // PAD-10: Y + left/right resizes the focused side panel; Y + up/down is undefined and does nothing.
  {
    chord: { control: 'dpad', direction: 'right', modifier: true, kind: 'tap' },
    intent: 'resize-wider',
    labelKey: 'deck.chord.resizeWider',
    scope: 'root',
    touchAlternative: 'deck.touch.resize'
  },
  {
    chord: { control: 'dpad', direction: 'left', modifier: true, kind: 'tap' },
    intent: 'resize-narrower',
    labelKey: 'deck.chord.resizeNarrower',
    scope: 'root',
    touchAlternative: 'deck.touch.resize'
  },
  // PAD-3/SCR-11: the triggers scroll the focused pane, and mean nothing else outside a wheel.
  {
    chord: { control: 'l2', kind: 'hold' },
    intent: 'scroll-up',
    labelKey: 'deck.chord.scrollUp',
    scope: 'root',
    touchAlternative: 'deck.touch.scroll'
  },
  {
    chord: { control: 'r2', kind: 'hold' },
    intent: 'scroll-down',
    labelKey: 'deck.chord.scrollDown',
    scope: 'root',
    touchAlternative: 'deck.touch.scroll'
  },
  // Arrows move the focused pane, never the screen (NAV-6/7/11/12).
  {
    chord: { control: 'dpad', kind: 'tap' },
    intent: 'move-up',
    labelKey: 'deck.chord.move',
    scope: 'root',
    touchAlternative: 'deck.touch.row'
  },
  // PAD-7: Start taps the text target's keys (or stops a live microphone); a 650 ms hold dictates.
  {
    chord: { control: 'start', kind: 'tap' },
    intent: 'toggle-text-input',
    labelKey: 'deck.chord.keys',
    scope: 'root',
    touchAlternative: 'deck.touch.keyboard'
  },
  {
    chord: { control: 'start', kind: 'hold' },
    intent: 'toggle-dictation',
    labelKey: 'deck.chord.dictation',
    scope: 'root',
    touchAlternative: 'deck.touch.mic'
  },
  // PAD-5: L3/R3 alone do nothing; together they open the literal-key wheels, in a TUI.
  {
    chord: { control: 'l3', with: 'r3', kind: 'chord' },
    intent: 'open-wheels',
    labelKey: 'deck.chord.wheels',
    scope: 'tui',
    touchAlternative: 'deck.touch.keyWheel'
  },
  // FILE-5/DECK-R30: Y + L2/R2 unstage and stage in source control.
  {
    chord: { control: 'l2', modifier: true, kind: 'chord' },
    intent: 'unstage-file',
    labelKey: 'deck.chord.unstage',
    scope: 'source-control',
    touchAlternative: 'deck.touch.unstage'
  },
  {
    chord: { control: 'r2', modifier: true, kind: 'chord' },
    intent: 'stage-file',
    labelKey: 'deck.chord.stage',
    scope: 'source-control',
    touchAlternative: 'deck.touch.stage'
  },
  // FILE-1/2: in a file or diff the same chords step between hunks (and between notes in File view).
  {
    chord: { control: 'l2', modifier: true, kind: 'chord' },
    intent: 'previous-hunk',
    labelKey: 'deck.chord.previousHunk',
    scope: 'file',
    touchAlternative: 'deck.touch.previousNote'
  },
  {
    chord: { control: 'r2', modifier: true, kind: 'chord' },
    intent: 'next-hunk',
    labelKey: 'deck.chord.nextHunk',
    scope: 'file',
    touchAlternative: 'deck.touch.nextNote'
  },
  // SAFE-1: on a request the modified triggers arm a decision. Arming is not deciding.
  {
    chord: { control: 'l2', modifier: true, kind: 'chord' },
    intent: 'arm-deny',
    labelKey: 'deck.chord.armDeny',
    scope: 'request',
    touchAlternative: 'deck.touch.deny'
  },
  {
    chord: { control: 'r2', modifier: true, kind: 'chord' },
    intent: 'arm-allow',
    labelKey: 'deck.chord.armAllow',
    scope: 'request',
    touchAlternative: 'deck.touch.allowOnce'
  },
  // TUI: the modified triggers are the terminal's own Esc and Enter, sent as literal bytes.
  {
    chord: { control: 'l2', modifier: true, kind: 'chord' },
    intent: 'tui-escape',
    labelKey: 'deck.chord.tuiEscape',
    scope: 'tui',
    touchAlternative: 'deck.touch.escape'
  },
  {
    chord: { control: 'r2', modifier: true, kind: 'chord' },
    intent: 'tui-enter',
    labelKey: 'deck.chord.tuiEnter',
    scope: 'tui',
    touchAlternative: 'deck.touch.enter'
  }
]
