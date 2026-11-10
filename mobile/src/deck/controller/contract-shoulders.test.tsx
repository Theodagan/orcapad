import { describe, expect, it } from 'vitest'
import { createDeckChordMatcher, PANEL_TOGGLE_HOLD_MS } from './deck-chord-input'
import { intentsOver, sampleWith } from './deck-samples'

/**
 * PAD-2 and PAD-6: a shoulder tap moves panel focus; Y + the shoulder held for 450 ms toggles that
 * panel, and the toggle fires once per hold, never twice.
 */
describe('shoulders', () => {
  it('moves panel focus on a tap, without a modifier', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['lb'], 10), sampleWith([], 90)])
    ).toEqual(['focus-previous-panel'])
    expect(
      intentsOver(createDeckChordMatcher(), [sampleWith(['rb'], 10), sampleWith([], 90)])
    ).toEqual(['focus-next-panel'])
  })

  it('toggles the panel once when the hold passes 450 ms', () => {
    const matcher = createDeckChordMatcher()
    const intents = intentsOver(matcher, [
      sampleWith(['y'], 0),
      sampleWith(['y', 'rb'], 10),
      sampleWith(['y', 'rb'], 10 + PANEL_TOGGLE_HOLD_MS - 1),
      sampleWith(['y', 'rb'], 10 + PANEL_TOGGLE_HOLD_MS),
      sampleWith(['y', 'rb'], 10 + PANEL_TOGGLE_HOLD_MS * 2),
      sampleWith(['y'], 900),
      sampleWith([], 910)
    ])
    expect(intents).toEqual(['toggle-panel'])
  })

  it('does not move focus from a Y + shoulder press', () => {
    expect(
      intentsOver(createDeckChordMatcher(), [
        sampleWith(['y'], 0),
        sampleWith(['y', 'lb'], 10),
        sampleWith(['y'], 80),
        sampleWith([], 90)
      ])
    ).toEqual([])
  })
})
