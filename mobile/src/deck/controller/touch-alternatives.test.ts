import { describe, expect, it } from 'vitest'
import { DECK_CHORDS, isTimedOrChorded, type DeckIntent } from './chord-table'

/**
 * DECK-R13/PAD-8: every timed or chorded input has a visible touch alternative. The chord table
 * names one per binding; this fails the moment a new chord arrives without one.
 */
describe('touch alternatives', () => {
  it('names a touch control for every timed or chorded intent', () => {
    const missing = DECK_CHORDS.filter(isTimedOrChorded)
      .filter((binding) => !/^deck\.touch\./.test(binding.touchAlternative))
      .map((binding) => binding.intent)
    expect(missing).toEqual([])
  })

  it('covers every intent the deck can fire', () => {
    const intents: DeckIntent[] = DECK_CHORDS.map((binding) => binding.intent)
    const timed = DECK_CHORDS.filter(isTimedOrChorded).map((binding) => binding.intent)
    for (const intent of new Set(intents)) {
      // A plain tap may share its alternative with the row it presses; a timed intent may not be alone.
      expect(timed.includes(intent) || DECK_CHORDS.some((b) => b.intent === intent)).toBe(true)
    }
  })

  it('gives a hold and the tap of the same control different alternatives where they differ', () => {
    const startTap = DECK_CHORDS.find(
      (binding) => binding.chord.control === 'start' && binding.chord.kind === 'tap'
    )
    const startHold = DECK_CHORDS.find(
      (binding) => binding.chord.control === 'start' && binding.chord.kind === 'hold'
    )
    expect(startTap?.touchAlternative).not.toBe(startHold?.touchAlternative)
  })
})
