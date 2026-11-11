/**
 * The deck's binding vocabulary and the table itself: control or chord → intent → label → scope.
 * The dispatcher (T25/T26), the hint strip (T33) and the Help diagram (T35) all read this, so a
 * remap is one line here and nothing else can disagree with it.
 *
 * The deck's modifier is **Y** (D2, PAD-9). Y is a modifier only: it has no binding of its own, and
 * a chord the table does not define does nothing rather than falling through to the bare button.
 */
export type DeckIntent =
  | 'confirm'
  | 'dismiss'
  | 'back'
  /** Bare L1/R1: the previous/next item of whatever area holds focus (PAD-2). */
  | 'item-previous'
  | 'item-next'
  | 'focus-left-panel'
  | 'focus-right-panel'
  | 'toggle-left-panel'
  | 'toggle-right-panel'
  | 'toggle-both-panels'
  | 'resize-wider'
  | 'resize-narrower'
  | 'scroll-up'
  | 'scroll-down'
  | 'move-up'
  | 'move-down'
  | 'move-left'
  | 'move-right'
  /** Start: keys for the current text target, or a stop for a live microphone (PAD-7). */
  | 'toggle-text-input'
  | 'toggle-dictation'
  | 'open-wheels'
  | 'stage-file'
  | 'unstage-file'
  | 'previous-hunk'
  | 'next-hunk'
  | 'arm-deny'
  | 'arm-allow'
  | 'tui-escape'
  | 'tui-enter'

/**
 * Where a binding applies. `root` is the deck itself; the rest are screens that bind the modified
 * triggers differently (PAD-3/4, FILE-1, SAFE-1, TUI keys). Scopes are parallel, not nested.
 */
export type DeckScreenScope =
  | 'root'
  | 'collection'
  | 'session'
  | 'source-control'
  | 'file'
  | 'request'
  | 'tui'
  | 'wheel'

export type DeckControl =
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'l1'
  | 'r1'
  | 'l2'
  | 'r2'
  | 'l3'
  | 'r3'
  | 'start'
  | 'select'
  | 'dpad'

export type DeckChordKind = 'tap' | 'hold' | 'chord'

export type DeckChord = {
  readonly control: DeckControl
  /** A second control held with `control`: a shoulder pair or a stick pair (PAD-5). */
  readonly with?: DeckControl
  /** The deck's modifier (Y) held with `control`. */
  readonly modifier?: boolean
  /** Which D-pad arrow, where one arrow and its opposite mean different things (the resize chord). */
  readonly direction?: 'up' | 'down' | 'left' | 'right'
  readonly kind: DeckChordKind
}

/** A chord is timed or chorded when a single tap of one button is not the whole gesture. */
export type DeckBinding = {
  readonly chord: DeckChord
  readonly intent: DeckIntent
  /** The catalog key, in the hint bar's words. The English lives in `locales/en.json`. */
  readonly labelKey: string
  readonly scope: DeckScreenScope
  /** DECK-R13/PAD-8: the on-screen control that does the same thing without a controller. */
  readonly touchAlternative: string
}

/** Every control the deck can name, in the order a controller drawing lists them. */
export const DECK_CONTROLS: readonly DeckControl[] = [
  'a',
  'b',
  'x',
  'y',
  'start',
  'select',
  'dpad',
  'l1',
  'r1',
  'l2',
  'r2',
  'l3',
  'r3'
]
