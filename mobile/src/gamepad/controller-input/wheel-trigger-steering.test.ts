import { describe, expect, it } from 'vitest'
import {
  CONTROLLER_AXES,
  CONTROLLER_BUTTONS,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from './controller-sample'
import { createControllerIntentResolver } from './controller-resolver'

function sample(
  at: number,
  buttons: Partial<Record<ControllerButton, number>> = {},
  axes: Partial<Record<ControllerAxis, number>> = {}
): ControllerSample {
  const buttonMap = new Map<ControllerButton, number>()
  for (const button of CONTROLLER_BUTTONS) {
    const value = buttons[button]
    if (value !== undefined) {
      buttonMap.set(button, value)
    }
  }
  const axisMap = new Map<ControllerAxis, number>()
  for (const name of CONTROLLER_AXES) {
    const value = axes[name]
    if (value !== undefined) {
      axisMap.set(name, value)
    }
  }
  return { connected: true, buttons: buttonMap, axes: axisMap, sampledAt: at }
}

const UNDER_WHEEL = { captured: true }
const NO_WHEEL = { captured: false }

describe('the triggers steer an open wheel', () => {
  it('selects on a firm R2 pull and backs out on a firm L2 pull', () => {
    const resolver = createControllerIntentResolver()
    resolver(sample(0), UNDER_WHEEL)

    expect(resolver(sample(16, {}, { r2: 1 }), UNDER_WHEEL)).toEqual([{ kind: 'confirm' }])
    resolver(sample(32), UNDER_WHEEL)
    expect(resolver(sample(48, {}, { l2: 1 }), UNDER_WHEEL)).toEqual([{ kind: 'back' }])
  })

  it('waits for a firm pull, so a graze on the trigger selects nothing', () => {
    const resolver = createControllerIntentResolver()
    resolver(sample(0), UNDER_WHEEL)

    expect(resolver(sample(16, {}, { r2: 0.3 }), UNDER_WHEEL)).toEqual([])
    expect(resolver(sample(32, {}, { r2: 0.7 }), UNDER_WHEEL)).toEqual([{ kind: 'confirm' }])
    // Held, it does not select again.
    expect(resolver(sample(48, {}, { r2: 0.9 }), UNDER_WHEEL)).toEqual([])
  })

  it('does nothing for A or B, which belong to nobody while a wheel is open', () => {
    const resolver = createControllerIntentResolver()
    resolver(sample(0), UNDER_WHEEL)

    expect(resolver(sample(16, { a: 1 }), UNDER_WHEEL)).toEqual([])
    resolver(sample(32), UNDER_WHEEL)
    expect(resolver(sample(48, { b: 1 }), UNDER_WHEEL)).toEqual([])
  })

  it('does not scroll while it is open', () => {
    const resolver = createControllerIntentResolver()
    resolver(sample(0), UNDER_WHEEL)

    expect(resolver(sample(16, {}, { r2: 0.3 }), UNDER_WHEEL)).toEqual([])
  })

  it('ignores a trigger that was already held when the wheel opened', () => {
    const resolver = createControllerIntentResolver()
    resolver(sample(0, {}, { r2: 1 }), NO_WHEEL)

    expect(resolver(sample(16, {}, { r2: 1 }), UNDER_WHEEL)).toEqual([])
  })

  it('keeps a trigger pulled under the wheel from scrolling once the wheel has closed', () => {
    const resolver = createControllerIntentResolver()
    resolver(sample(0), UNDER_WHEEL)
    expect(resolver(sample(16, {}, { r2: 1 }), UNDER_WHEEL)).toEqual([{ kind: 'confirm' }])

    expect(resolver(sample(32, {}, { r2: 1 }), NO_WHEEL)).toEqual([])
    resolver(sample(48), NO_WHEEL)
    expect(resolver(sample(64, {}, { r2: 1 }), NO_WHEEL)).toEqual([
      { kind: 'scroll', direction: 'down', velocity: 1, elapsedMs: 16, begins: true }
    ])
  })

  it('leaves A, B and scroll alone when no wheel is open', () => {
    const resolver = createControllerIntentResolver()
    resolver(sample(0), NO_WHEEL)

    expect(resolver(sample(16, { a: 1 }), NO_WHEEL)).toEqual([{ kind: 'confirm' }])
    resolver(sample(32), NO_WHEEL)
    expect(resolver(sample(48, {}, { l2: 0.4 }), NO_WHEEL)).toEqual([
      { kind: 'scroll', direction: 'up', velocity: 0.4, elapsedMs: 16, begins: true }
    ])
  })
})
