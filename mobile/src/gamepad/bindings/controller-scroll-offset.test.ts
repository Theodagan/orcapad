import { describe, expect, it } from 'vitest'
import { SCROLL_PIXELS_AT_FULL_PRESSURE, nextScrollOffset } from './controller-scroll-offset'

describe('controller scroll offset', () => {
  it('moves further the harder the trigger is pressed', () => {
    const light = nextScrollOffset(100, 'down', 0.25)
    const full = nextScrollOffset(100, 'down', 1)

    expect(full - 100).toBe(SCROLL_PIXELS_AT_FULL_PRESSURE)
    expect(light - 100).toBeLessThan(full - 100)
  })

  it('goes both ways', () => {
    expect(nextScrollOffset(100, 'up', 1)).toBe(100 - SCROLL_PIXELS_AT_FULL_PRESSURE)
  })

  it('never scrolls above the top', () => {
    expect(nextScrollOffset(10, 'up', 1)).toBe(0)
    expect(nextScrollOffset(0, 'up', 1)).toBe(0)
  })

  // A trigger resting inside its dead zone still emits nothing; a zero that arrives anyway must
  // not creep the list.
  it('stands still at zero pressure', () => {
    expect(nextScrollOffset(120, 'down', 0)).toBe(120)
  })
})
