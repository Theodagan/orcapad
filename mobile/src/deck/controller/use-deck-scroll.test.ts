import { describe, expect, it } from 'vitest'
import { DECK_CHORDS } from './chord-table'
import { deckScrollRate, deckScrollStep } from './use-deck-scroll'

describe('deck analog scroll', () => {
  it('is silent inside the dead zone and rises monotonically above it', () => {
    expect(deckScrollRate(0)).toBe(0)
    expect(deckScrollRate(0.1)).toBe(0)
    const samples = [0.16, 0.3, 0.5, 0.75, 1].map(deckScrollRate)
    for (let index = 1; index < samples.length; index += 1) {
      expect(samples[index]).toBeGreaterThan(samples[index - 1])
    }
    expect(samples[samples.length - 1]).toBeGreaterThan(100)
  })

  it('moves by speed times time, up negative and down positive', () => {
    const intent = {
      kind: 'scroll',
      direction: 'down',
      velocity: 1,
      elapsedMs: 100,
      begins: false
    } as const
    expect(deckScrollStep(intent)).toBeGreaterThan(0)
    expect(deckScrollStep({ ...intent, direction: 'up' })).toBe(
      -deckScrollStep({ ...intent, direction: 'down' })
    )
    expect(deckScrollStep({ ...intent, velocity: 0.05 })).toBe(0)
  })

  it('gives no trigger any meaning but scrolling outside a wheel and the Y layer', () => {
    const plainTriggers = DECK_CHORDS.filter(
      (binding) =>
        (binding.chord.control === 'l2' || binding.chord.control === 'r2') &&
        binding.chord.modifier !== true
    )
    expect(plainTriggers.map((binding) => binding.intent).sort()).toEqual([
      'scroll-down',
      'scroll-up'
    ])
  })
})
