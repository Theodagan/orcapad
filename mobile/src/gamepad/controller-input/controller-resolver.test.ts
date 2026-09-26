import { describe, expect, it } from 'vitest'
import {
  CONTROLLER_AXES,
  CONTROLLER_BUTTONS,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from './controller-sample'
import {
  createControllerIntentResolver,
  resolveControllerIntents,
  DEFAULT_CONTROLLER_POLICY,
  type ControllerPolicy
} from './controller-resolver'

// Built by walking the vocabulary rather than the literal's keys, so no assertion is needed to
// narrow a string into a member.
function sample(
  buttons: Partial<Record<ControllerButton, number>> = {},
  axes: Partial<Record<ControllerAxis, number>> = {},
  connected = true
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
  return { connected, buttons: buttonMap, axes: axisMap, sampledAt: 0 }
}

const idle = sample()

function resolve(
  previous: ControllerSample,
  next: ControllerSample,
  policy: Partial<ControllerPolicy> = {}
) {
  return resolveControllerIntents(previous, next, { ...DEFAULT_CONTROLLER_POLICY, ...policy })
}

describe('buttons', () => {
  it('fires once on the press, not for every sample it stays held', () => {
    const held = sample({ a: 1 })

    expect(resolve(idle, held)).toEqual([{ kind: 'confirm' }])
    expect(resolve(held, held)).toEqual([])
  })

  it('maps the PRD face buttons to their intents', () => {
    expect(resolve(idle, sample({ a: 1 }))).toEqual([{ kind: 'confirm' }])
    expect(resolve(idle, sample({ b: 1 }))).toEqual([{ kind: 'back' }])
    expect(resolve(idle, sample({ x: 1 }))).toEqual([{ kind: 'stop' }])
    expect(resolve(idle, sample({ r3: 1 }))).toEqual([{ kind: 'toggle-dictation' }])
  })

  it('leaves L3 inert (CTRL-R1)', () => {
    expect(resolve(idle, sample({ l3: 1 }))).toEqual([])
  })

  it('publishes nothing at all while disconnected', () => {
    expect(resolve(idle, sample({ a: 1 }, {}, false))).toEqual([])
  })
})

describe('the Y chord (CTRL-R4, CTRL-AC2)', () => {
  it('cycles tabs on a bare shoulder press', () => {
    expect(resolve(idle, sample({ lb: 1 }))).toEqual([{ kind: 'cycle-tab', direction: 'previous' }])
    expect(resolve(idle, sample({ rb: 1 }))).toEqual([{ kind: 'cycle-tab', direction: 'next' }])
  })

  it('cycles workspaces while Y is held, and only that', () => {
    const chord = sample({ y: 1, lb: 1 })

    expect(resolve(sample({ y: 1 }), chord)).toEqual([
      { kind: 'cycle-workspace', direction: 'previous' }
    ])
  })

  it('is inert when Y is held alone', () => {
    expect(resolve(idle, sample({ y: 1 }))).toEqual([])
  })

  it('restores the unmodified action as soon as Y is released', () => {
    const afterChord = sample({ y: 1 })

    expect(resolve(afterChord, sample({ lb: 1 }))).toEqual([
      { kind: 'cycle-tab', direction: 'previous' }
    ])
  })
})

describe('triggers (CTRL-R5)', () => {
  it('scrolls continuously while held, with the analog value as velocity', () => {
    const quarter = sample({}, { l2: 0.25 })

    expect(resolve(idle, quarter)).toEqual([{ kind: 'scroll', direction: 'up', velocity: 0.25 }])
    // Still held: scrolling is continuous where a press is not.
    expect(resolve(quarter, quarter)).toEqual([{ kind: 'scroll', direction: 'up', velocity: 0.25 }])
  })

  it('stays silent inside the trigger dead zone', () => {
    expect(resolve(idle, sample({}, { r2: 0.05 }))).toEqual([])
  })

  it('uses full velocity on a pad whose triggers are only buttons', () => {
    expect(resolve(idle, sample({}, { r2: 1 }), { triggersAnalog: false })).toEqual([
      { kind: 'scroll', direction: 'down', velocity: 1 }
    ])
  })
})

describe('sticks (CTRL-AC5)', () => {
  it('publishes nothing inside the dead zone', () => {
    expect(resolve(idle, sample({}, { 'left-x': 0.1, 'left-y': 0.05 }))).toEqual([])
  })

  it('preserves angle and magnitude once the dead zone is crossed', () => {
    expect(resolve(idle, sample({}, { 'left-x': 0.6, 'left-y': -0.8 }))).toEqual([
      { kind: 'wheel-motion', wheel: 1, x: 0.6, y: -0.8 }
    ])
  })

  it('drives wheel 2 from the right stick, independently', () => {
    expect(resolve(idle, sample({}, { 'right-x': -0.9, 'right-y': 0.2 }))).toEqual([
      { kind: 'wheel-motion', wheel: 2, x: -0.9, y: 0.2 }
    ])
  })

  it('takes the dead zone from the policy, which the device fills in', () => {
    const drifting = sample({}, { 'left-x': 0.3, 'left-y': 0 })

    expect(resolve(idle, drifting, { stickDeadZone: 0.5 })).toEqual([])
    expect(resolve(idle, drifting, { stickDeadZone: 0.2 })).toHaveLength(1)
  })
})

describe('D-pad navigation (CTRL-AC7, promoted by 004 LOOP-R2)', () => {
  // Was an experiment, defaulting off. `004`'s reachability audit showed that with it off a
  // controller-only user cannot open any host but the first — the product not working, rather
  // than an experiment not proving out. Promoted by a recorded decision.
  it('moves selection by default now', () => {
    expect(DEFAULT_CONTROLLER_POLICY.dpadNavigation).toBe(true)

    expect(resolve(idle, sample({ 'dpad-up': 1 }))).toEqual([
      { kind: 'move-selection', direction: 'up' }
    ])
    expect(resolve(idle, sample({ 'dpad-right': 1 }))).toEqual([
      { kind: 'move-horizontal', direction: 'right' }
    ])
  })

  // Still a flag: a pad without a D-pad exists, and this is how the policy says so.
  it('stays silent for a pad that has no D-pad', () => {
    expect(resolve(idle, sample({ 'dpad-up': 1 }), { dpadNavigation: false })).toEqual([])
  })

  it('does not disturb the accepted mapping either way', () => {
    expect(resolve(idle, sample({ a: 1 }), { dpadNavigation: false })).toEqual([
      { kind: 'confirm' }
    ])
    expect(resolve(idle, sample({ a: 1 }))).toEqual([{ kind: 'confirm' }])
  })
})

describe('the stateful resolver the provider mounts', () => {
  it('remembers only the previous sample, so the first press still registers', () => {
    const resolver = createControllerIntentResolver()

    expect(resolver(sample({ a: 1 }))).toEqual([{ kind: 'confirm' }])
    expect(resolver(sample({ a: 1 }))).toEqual([])
    expect(resolver(sample())).toEqual([])
    expect(resolver(sample({ a: 1 }))).toEqual([{ kind: 'confirm' }])
  })
})
