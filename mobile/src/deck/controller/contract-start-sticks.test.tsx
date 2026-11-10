import { describe, expect, it } from 'vitest'
import { createDeckChordMatcher, DICTATION_HOLD_MS } from './deck-chord-input'
import { intentsOver, sampleWith } from './deck-samples'

/** PAD-7 and PAD-5: Start taps Help, a 650 ms hold dictates, and L3/R3 alone are inert. */
describe('Start and the stick presses', () => {
  it('opens Help on a tap and dictates on a 650 ms hold', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['start'], 10), sampleWith([], 120)])
    ).toEqual(['open-help'])
    expect(
      intentsOver(createDeckChordMatcher(), [
        sampleWith(['start'], 10),
        sampleWith(['start'], 10 + DICTATION_HOLD_MS),
        sampleWith([], 700)
      ])
    ).toEqual(['toggle-dictation'])
  })

  it('fires nothing for a press just under the dictation threshold that is let go at once', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [
        sampleWith(['start'], 10),
        sampleWith(['start'], 10 + DICTATION_HOLD_MS - 1),
        sampleWith([], 10 + DICTATION_HOLD_MS + 200)
      ])
    ).toEqual([])
  })

  it('leaves L3 and R3 inert alone', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['l3'], 10), sampleWith([], 70)])
    ).toEqual([])
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['r3'], 10), sampleWith([], 70)])
    ).toEqual([])
  })
})
