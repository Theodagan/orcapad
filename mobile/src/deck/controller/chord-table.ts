import type { Translate } from '../../i18n/mobile-i18n'
import { DECK_CHORDS } from './deck-chord-bindings'
import type { DeckBinding, DeckChordKind, DeckControl, DeckScreenScope } from './deck-chords'

export { DECK_CHORDS } from './deck-chord-bindings'
export {
  DECK_CONTROLS,
  type DeckBinding,
  type DeckChord,
  type DeckChordKind,
  type DeckControl,
  type DeckIntent,
  type DeckScreenScope
} from './deck-chords'

/** A screen answers for its own scope plus the deck's root bindings. */
export function bindingsForScope(scope: DeckScreenScope): readonly DeckBinding[] {
  return DECK_CHORDS.filter((binding) => binding.scope === 'root' || binding.scope === scope)
}

/** The bindings the Y layer adds on a given screen: what the strip shows while Y is held. */
export function modifierBindingsForScope(scope: DeckScreenScope): readonly DeckBinding[] {
  return bindingsForScope(scope).filter((binding) => binding.chord.modifier === true)
}

/** The binding for one control's gesture, in a scope. Undefined means the chord is not defined. */
export function bindingFor(
  control: DeckControl,
  kind: DeckChordKind,
  options: {
    readonly scope?: DeckScreenScope
    readonly modifier?: boolean
    readonly withControl?: DeckControl
    readonly direction?: 'up' | 'down' | 'left' | 'right'
  } = {}
): DeckBinding | undefined {
  const scope = options.scope ?? 'root'
  return bindingsForScope(scope).find(
    (binding) =>
      binding.chord.control === control &&
      binding.chord.kind === kind &&
      (binding.chord.modifier === true) === (options.modifier === true) &&
      binding.chord.with === options.withControl &&
      (options.direction === undefined || binding.chord.direction === options.direction)
  )
}

/** A chord's label in the active language. */
export function chordLabel(t: Translate, binding: DeckBinding): string {
  // The key doubles as the fallback: a missing entry shows the key, never an English guess.
  return t(binding.labelKey, binding.labelKey)
}

/** Timed or chorded: a plain tap of one button is not the whole gesture (PAD-8). */
export function isTimedOrChorded(binding: DeckBinding): boolean {
  return (
    binding.chord.kind !== 'tap' ||
    binding.chord.with !== undefined ||
    binding.chord.modifier === true
  )
}
