import { describe, expect, it } from 'vitest'
import { createDeckChordMatcher } from './deck-chord-input'
import { intentsOver, sampleWith } from './deck-samples'

/**
 * PAD-9 with D2: Y is the deck's modifier and nothing else. A Y press, a Y hold and a Y release
 * fire no intent on their own; while it is held the Y layer is what the other buttons mean.
 */
describe('the Y modifier', () => {
  it('fires nothing for a Y tap, hold or release', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [
        sampleWith(['y'], 10),
        sampleWith(['y'], 900),
        sampleWith([], 1200)
      ])
    ).toEqual([])
  })

  it('turns the same shoulder into a different intent while held', () => {
    const withoutModifier = intentsOver(createDeckChordMatcher(), [
      sampleWith(['rb'], 10),
      sampleWith([], 80)
    ])
    const withModifier = intentsOver(createDeckChordMatcher(), [
      sampleWith(['y'], 0),
      sampleWith(['y', 'rb'], 10),
      sampleWith(['y', 'rb'], 600),
      sampleWith([], 700)
    ])
    expect(withoutModifier).toEqual(['focus-next-panel'])
    expect(withModifier).toEqual(['toggle-panel'])
  })

  it('does not give Y a meaning from Orca’s old X layer', () => {
    // Orca's table made a Y tap toggle dictation; the deck's does not.
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['y'], 10), sampleWith([], 60)])
    ).not.toContain('toggle-dictation')
  })
})
