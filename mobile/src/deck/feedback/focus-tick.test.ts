import { describe, expect, it, vi } from 'vitest'
import { createFocusTick, shouldTick } from './focus-tick'

function tickWith(enabled: () => boolean) {
  const sinks = { click: vi.fn(), haptic: vi.fn() }
  return { tick: createFocusTick(enabled, sinks), sinks }
}

describe('focus tick', () => {
  it('plays once per controller focus move', () => {
    const { tick, sinks } = tickWith(() => true)
    tick({ previous: 'a', next: 'b', source: 'pad' })
    expect(sinks.click).toHaveBeenCalledTimes(1)
    expect(sinks.haptic).toHaveBeenCalledTimes(1)
  })

  it('stays silent for a touch, for a focus that did not move, and for no focus at all', () => {
    const { tick, sinks } = tickWith(() => true)
    tick({ previous: 'a', next: 'b', source: 'touch' })
    tick({ previous: 'a', next: 'a', source: 'pad' })
    tick({ previous: 'a', next: null, source: 'pad' })
    expect(sinks.click).not.toHaveBeenCalled()
    expect(sinks.haptic).not.toHaveBeenCalled()
  })

  it('can be switched off', () => {
    let enabled = true
    const { tick, sinks } = tickWith(() => enabled)
    tick({ previous: null, next: 'a', source: 'pad' })
    enabled = false
    expect(shouldTick({ previous: 'a', next: 'b', source: 'pad' }, enabled)).toBe(false)
    tick({ previous: 'a', next: 'b', source: 'pad' })
    expect(sinks.click).toHaveBeenCalledTimes(1)
  })
})
