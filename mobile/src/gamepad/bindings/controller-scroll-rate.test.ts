import { describe, expect, it } from 'vitest'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { createScrollIntegrator } from './controller-scroll-rate'

type ScrollIntent = Extract<ControllerIntent, { kind: 'scroll' }>

const press = (
  direction: 'up' | 'down',
  velocity: number,
  elapsedMs: number,
  begins = false
): ScrollIntent => ({ kind: 'scroll', direction, velocity, elapsedMs, begins })

/** Holds a trigger at a pressure for a duration, sampled every `tickMs`, and totals the scroll. */
function hold(
  integrator: ReturnType<typeof createScrollIntegrator>,
  direction: 'up' | 'down',
  velocity: number,
  durationMs: number,
  tickMs: number
): number {
  let total = 0
  for (let at = 0; at < durationMs; at += tickMs) {
    total += integrator.step(press(direction, velocity, at === 0 ? 16 : tickMs, at === 0))
  }
  return total
}

describe('scroll rate', () => {
  it('moves a distance that depends on pressure and time, not on how chatty the pad is', () => {
    const totals = [8, 16, 33].map((tick) =>
      hold(createScrollIntegrator({ unitsPerSecond: 40 }), 'down', 1, 1000, tick)
    )

    for (const total of totals) {
      expect(total).toBeGreaterThanOrEqual(38)
      expect(total).toBeLessThanOrEqual(42)
    }
  })

  it('creeps on a light squeeze and runs on a full one', () => {
    const light = hold(createScrollIntegrator({ unitsPerSecond: 40 }), 'down', 0.2, 1000, 16)
    const half = hold(createScrollIntegrator({ unitsPerSecond: 40 }), 'down', 0.5, 1000, 16)

    expect(light).toBeGreaterThan(0)
    expect(light).toBeLessThan(4)
    expect(half).toBeGreaterThan(8)
    expect(half).toBeLessThan(12)
  })

  it('scrolls up with a negative sign', () => {
    const total = hold(createScrollIntegrator({ unitsPerSecond: 40 }), 'up', 1, 500, 16)

    expect(total).toBeLessThan(-15)
  })

  it('always moves a first step when asked to, so a tap is felt', () => {
    const integrator = createScrollIntegrator({ unitsPerSecond: 40, minimumFirstStep: 1 })

    expect(integrator.step(press('down', 0.3, 16, true))).toBe(1)
    expect(createScrollIntegrator({ unitsPerSecond: 40 }).step(press('down', 0.3, 16, true))).toBe(
      0
    )
  })

  it('never returns negative zero, so a test or a scroller never sees a phantom up', () => {
    const integrator = createScrollIntegrator({ unitsPerSecond: 40 })

    expect(Object.is(integrator.step(press('up', 0.1, 16, true)), 0)).toBe(true)
  })

  it('drops the carry when the direction flips or a new hold begins', () => {
    const integrator = createScrollIntegrator({ unitsPerSecond: 40 })

    // 0.9 of a line is carried, then thrown away rather than spent in the other direction.
    integrator.step(press('down', 1, 22, true))
    expect(integrator.step(press('up', 1, 5))).toBe(0)
    integrator.step(press('down', 1, 22, true))
    expect(integrator.step(press('down', 1, 8, true))).toBe(0)
  })

  it('is safe against nonsense pressure', () => {
    const integrator = createScrollIntegrator({ unitsPerSecond: 40 })

    expect(integrator.step(press('down', Number.NaN, 100, true))).toBe(0)
    expect(integrator.step(press('down', -1, 100))).toBe(0)
    // Above 1 is clamped to full pressure.
    expect(integrator.step(press('down', 5, 1000))).toBe(40)
  })
})
