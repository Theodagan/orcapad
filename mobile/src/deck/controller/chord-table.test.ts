import { describe, expect, it } from 'vitest'
import { DECK_CHORDS, isTimedOrChorded } from './chord-table'

/**
 * Two rules the table has to keep for the dispatcher to be unambiguous: no two bindings in a scope
 * answer the same gesture, and every gesture that is not a plain tap names a visible control that
 * does the same thing (PAD-8). Everything else about the table is behaviour, tested where it fires.
 */
describe('deck chord table', () => {
  it('has one binding per gesture in each scope', () => {
    const keys = DECK_CHORDS.map((binding) =>
      [
        binding.scope,
        binding.chord.control,
        binding.chord.kind,
        binding.chord.modifier === true ? 'y' : '',
        binding.chord.with ?? '',
        binding.chord.direction ?? ''
      ].join('|')
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('names a visible touch control for every timed or chorded gesture', () => {
    const missing = DECK_CHORDS.filter(isTimedOrChorded)
      .filter((binding) => !binding.touchAlternative.startsWith('deck.touch.'))
      .map((binding) => binding.intent)
    expect(missing).toEqual([])
  })
})
