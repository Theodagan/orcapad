import { describe, expect, it } from 'vitest'
import { createDeckChordMatcher } from './deck-chord-input'
import { intentsOver, sampleWith } from './deck-samples'

/**
 * PAD-1 and PAD-11: A confirms, B dismisses the layer that is open, B never switches destination,
 * and Y+B is the only back. Driven through the deck's own matcher, so the assertion is about what
 * a press does, not about a table entry.
 */
describe('face buttons', () => {
  it('dismisses on B and does nothing else at root', () => {
    const intents = intentsOver(createDeckChordMatcher(), [
      sampleWith(['b'], 10),
      sampleWith([], 80)
    ])
    expect(intents).toEqual(['dismiss'])
  })

  it('pops history on Y+B and never on B alone', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [
        sampleWith(['y'], 10),
        sampleWith(['y', 'b'], 40),
        sampleWith([], 70)
      ])
    ).toEqual(['back'])
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['b'], 10), sampleWith([], 70)])
    ).not.toContain('back')
  })

  it('confirms on A', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['a'], 10), sampleWith([], 60)])
    ).toEqual(['confirm'])
  })

  it('leaves X unbound in the deck: it is not the deck modifier', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['x'], 10), sampleWith([], 60)])
    ).toEqual([])
  })
})
