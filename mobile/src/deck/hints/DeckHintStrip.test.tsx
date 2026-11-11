import { describe, expect, it } from 'vitest'
import { visibleHintCount } from './hint-strip-width'

/**
 * PAD-13/VIS-6: the strip drops hints rather than overflow, so the last chip is never cut in half.
 * That arithmetic is the strip's own behaviour; what it then draws is the chord table's business.
 */
describe('deck hint strip width', () => {
  it('fits whole chips in the width it is given, and none when there is no room', () => {
    expect(visibleHintCount(20, 640)).toBe(6)
    expect(visibleHintCount(20, 200)).toBe(1)
    expect(visibleHintCount(3, 20)).toBe(0)
  })

  it('never claims more chips than the table offers', () => {
    expect(visibleHintCount(2, 640)).toBe(2)
  })
})
