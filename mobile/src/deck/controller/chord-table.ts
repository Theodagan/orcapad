import type { Translate } from '../../i18n/mobile-i18n'

/**
 * One table for every deck binding: control or chord → intent → label → the screens it applies to.
 * The bindings (T26), the hint strip (T33) and the Help diagram (T35) all read this, so a remap is
 * one line here and nothing else can disagree with it.
 *
 * The deck's modifier is **Y** (D2, PAD-9). Orca's old X bindings are ignored, not ported.
 */
export type DeckIntent =
  | 'confirm'
  | 'dismiss'
  | 'back'
  | 'focus-previous-panel'
  | 'focus-next-panel'
  | 'toggle-panel'
  | 'scroll-up'
  | 'scroll-down'
  | 'move-up'
  | 'move-down'
  | 'move-left'
  | 'move-right'
  | 'toggle-dictation'
  | 'open-wheels'
  | 'open-help'
  | 'stage-file'
  | 'unstage-file'

/** Where a binding applies. `root` is the deck itself; `wheel` only while a wheel is open. */
export type DeckScreenScope = 'root' | 'collection' | 'session' | 'wheel'

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
  /** Held with `control`: the deck's modifier, or a second stick press (PAD-5). */
  readonly with?: DeckControl
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

const MODIFIER: DeckControl = 'y'

export const DECK_CHORDS: readonly DeckBinding[] = [
  // PAD-1: A confirms, B dismisses the open layer, and B never switches destination.
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
    chord: { control: 'b', with: MODIFIER, kind: 'chord' },
    intent: 'back',
    labelKey: 'deck.chord.back',
    scope: 'root',
    touchAlternative: 'deck.touch.back'
  },
  // PAD-2/PAD-6: L1/R1 move panel focus; Y + L1/R1 tap toggles, 450 ms hold toggles too.
  {
    chord: { control: 'l1', kind: 'tap' },
    intent: 'focus-previous-panel',
    labelKey: 'deck.chord.focusPreviousPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.panelTab'
  },
  {
    chord: { control: 'r1', kind: 'tap' },
    intent: 'focus-next-panel',
    labelKey: 'deck.chord.focusNextPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.panelTab'
  },
  {
    chord: { control: 'l1', with: MODIFIER, kind: 'hold' },
    intent: 'toggle-panel',
    labelKey: 'deck.chord.toggleLeftPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.panelToggle'
  },
  {
    chord: { control: 'r1', with: MODIFIER, kind: 'hold' },
    intent: 'toggle-panel',
    labelKey: 'deck.chord.toggleRightPanel',
    scope: 'root',
    touchAlternative: 'deck.touch.panelToggle'
  },
  // PAD-3/SCR-11: the triggers scroll everywhere, and mean nothing else outside a wheel.
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
  // Arrows are bound to the focused pane, never to the screen (NAV-6/7/11/12).
  {
    chord: { control: 'dpad', kind: 'tap' },
    intent: 'move-up',
    labelKey: 'deck.chord.move',
    scope: 'root',
    touchAlternative: 'deck.touch.row'
  },
  // PAD-7: Start taps Help; a 650 ms hold toggles dictation.
  {
    chord: { control: 'start', kind: 'tap' },
    intent: 'open-help',
    labelKey: 'deck.chord.help',
    scope: 'root',
    touchAlternative: 'deck.touch.help'
  },
  {
    chord: { control: 'start', kind: 'hold' },
    intent: 'toggle-dictation',
    labelKey: 'deck.chord.dictation',
    scope: 'session',
    touchAlternative: 'deck.touch.mic'
  },
  // PAD-5: L3/R3 alone do nothing; together they open the TUI key wheels.
  {
    chord: { control: 'l3', with: 'r3', kind: 'chord' },
    intent: 'open-wheels',
    labelKey: 'deck.chord.wheels',
    scope: 'session',
    touchAlternative: 'deck.touch.keyWheel'
  },
  // FILE-5/DECK-R30: Y + L2/R2 stage and unstage in source control.
  {
    chord: { control: 'l2', with: MODIFIER, kind: 'chord' },
    intent: 'stage-file',
    labelKey: 'deck.chord.stage',
    scope: 'collection',
    touchAlternative: 'deck.touch.stage'
  },
  {
    chord: { control: 'r2', with: MODIFIER, kind: 'chord' },
    intent: 'unstage-file',
    labelKey: 'deck.chord.unstage',
    scope: 'collection',
    touchAlternative: 'deck.touch.unstage'
  }
]

/**
 * A screen answers for its own scope plus the deck's root bindings. Scopes are parallel, not
 * nested: a wheel opens over a session, and a collection screen is neither.
 */
export function bindingsForScope(scope: DeckScreenScope): readonly DeckBinding[] {
  return DECK_CHORDS.filter((binding) => binding.scope === 'root' || binding.scope === scope)
}

/** The bindings the Y layer adds on a given screen: what the strip shows while Y is held. */
export function modifierBindingsForScope(scope: DeckScreenScope): readonly DeckBinding[] {
  return bindingsForScope(scope).filter((binding) => binding.chord.with === MODIFIER)
}

export function bindingFor(
  control: DeckControl,
  kind: DeckChordKind,
  options: { readonly withModifier?: boolean; readonly withControl?: DeckControl } = {}
): DeckBinding | undefined {
  return DECK_CHORDS.find(
    (binding) =>
      binding.chord.control === control &&
      binding.chord.kind === kind &&
      (options.withModifier === true
        ? binding.chord.with === MODIFIER
        : binding.chord.with === options.withControl)
  )
}

/** A chord's label in the active language. */
export function chordLabel(t: Translate, binding: DeckBinding): string {
  // The key doubles as the fallback: a missing entry shows the key, never an English guess.
  return t(binding.labelKey, binding.labelKey)
}

/** Timed or chorded: a plain tap of one button is not the whole gesture (PAD-8). */
export function isTimedOrChorded(binding: DeckBinding): boolean {
  return binding.chord.kind !== 'tap' || binding.chord.with !== undefined
}
