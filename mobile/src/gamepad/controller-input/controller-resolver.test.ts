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
  connected = true,
  at = 0
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
  return { connected, buttons: buttonMap, axes: axisMap, sampledAt: at }
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
    expect(resolve(idle, sample({ x: 1 }))).toEqual([{ kind: 'switch-zone' }])
  })

  it('leaves both stick clicks inert (CTRL-R1, 005)', () => {
    expect(resolve(idle, sample({ l3: 1 }))).toEqual([])
    expect(resolve(idle, sample({ r3: 1 }))).toEqual([])
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

    expect(resolve(idle, quarter)).toEqual([
      { kind: 'scroll', direction: 'up', velocity: 0.25, elapsedMs: 16, begins: true }
    ])
    // Still held: scrolling is continuous where a press is not, and no longer a new gesture.
    expect(resolve(quarter, quarter)).toEqual([
      { kind: 'scroll', direction: 'up', velocity: 0.25, elapsedMs: 0, begins: false }
    ])
  })

  it('says how much time each sample stands for, so distance does not depend on sample rate', () => {
    const at = (t: number) => sample({}, { r2: 1 }, true, t)

    // The first sample of a hold is one nominal frame; the rest are the real gap.
    expect(resolve(idle, at(100))).toMatchObject([{ elapsedMs: 16 }])
    expect(resolve(at(100), at(120))).toMatchObject([{ elapsedMs: 20 }])
    // A stalled thread is capped rather than turned into a jump.
    expect(resolve(at(120), at(2000))).toMatchObject([{ elapsedMs: 50 }])
  })

  it('stays silent inside the trigger dead zone', () => {
    expect(resolve(idle, sample({}, { r2: 0.05 }))).toEqual([])
  })

  it('uses full velocity on a pad whose triggers are only buttons', () => {
    expect(resolve(idle, sample({}, { r2: 1 }), { triggersAnalog: false })).toEqual([
      { kind: 'scroll', direction: 'down', velocity: 1, elapsedMs: 16, begins: true }
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

  it('publishes a held stick once, and again only when it moves', () => {
    const held = sample({}, { 'left-x': 0.6, 'left-y': 0 })

    expect(resolve(idle, held)).toHaveLength(1)
    expect(resolve(held, held)).toEqual([])
    expect(resolve(held, sample({}, { 'left-x': 0.7, 'left-y': 0 }))).toHaveLength(1)
  })

  it('publishes the release as a true centre, even inside a wider device dead zone', () => {
    const held = sample({}, { 'left-x': 0.6, 'left-y': 0 })
    const back = sample({}, { 'left-x': 0.1, 'left-y': 0 })

    // The wheel's own dead zone can be narrower than the pad's; without this it never hears the
    // stick come back and stays open.
    expect(resolve(held, back)).toEqual([{ kind: 'wheel-motion', wheel: 1, x: 0, y: 0 }])
    expect(resolve(back, back)).toEqual([])
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

describe('Y: a tap that toggles dictation, and the workspace chord (005 USE-R7)', () => {
  const down = (at: number, buttons: Partial<Record<ControllerButton, number>>) =>
    sample(buttons, {}, true, at)

  it('toggles dictation when Y goes down and up alone, on release and not before', () => {
    const resolver = createControllerIntentResolver()

    expect(resolver(down(0, {}))).toEqual([])
    expect(resolver(down(10, { y: 1 }))).toEqual([])
    expect(resolver(down(120, {}))).toEqual([{ kind: 'toggle-dictation' }])
  })

  it('never toggles once Y has been a chord, and still cycles the workspace', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    resolver(down(10, { y: 1 }))
    expect(resolver(down(40, { y: 1, lb: 1 }))).toEqual([
      { kind: 'cycle-workspace', direction: 'previous' }
    ])
    resolver(down(60, { y: 1 }))
    expect(resolver(down(90, {}))).toEqual([])
  })

  it('is not a tap when another button was already held as Y went down', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, { lb: 1 }))
    resolver(down(10, { lb: 1, y: 1 }))
    resolver(down(20, { lb: 1 }))
    expect(resolver(down(30, {}))).toEqual([])
  })

  it('swallows A and the others while Y is held, as before, and spends the tap', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    resolver(down(10, { y: 1 }))
    expect(resolver(down(20, { y: 1, a: 1 }))).toEqual([])
    resolver(down(30, { y: 1 }))
    expect(resolver(down(40, {}))).toEqual([])
  })

  it('stays inert for a long lone hold', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    resolver(down(10, { y: 1 }))
    expect(resolver(down(10 + 501, {}))).toEqual([])
    resolver(down(700, { y: 1 }))
    expect(resolver(down(700 + 500, {}))).toEqual([{ kind: 'toggle-dictation' }])
  })

  it('counts two quick taps as two toggles', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    resolver(down(10, { y: 1 }))
    expect(resolver(down(60, {}))).toEqual([{ kind: 'toggle-dictation' }])
    resolver(down(100, { y: 1 }))
    expect(resolver(down(150, {}))).toEqual([{ kind: 'toggle-dictation' }])
  })

  it('forgets a hold when the pad disconnects mid-press', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    resolver(down(10, { y: 1 }))
    resolver(sample({}, {}, false, 20))
    expect(resolver(down(30, {}))).toEqual([])
  })

  it('does not fire for a press that began under an open wheel, even after it closes', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    resolver(down(10, { y: 1 }), { captured: true })
    expect(resolver(down(60, {}), { captured: false })).toEqual([])
  })

  it('does not fire for a press released while a wheel is open', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    resolver(down(10, { y: 1 }), { captured: false })
    expect(resolver(down(60, {}), { captured: true })).toEqual([])
  })

  it('leaves R3 inert, not an alias for the tap', () => {
    const resolver = createControllerIntentResolver()

    resolver(down(0, {}))
    expect(resolver(down(10, { r3: 1 }))).toEqual([])
    expect(resolver(down(40, {}))).toEqual([])
  })
})

describe('a held D-pad direction repeats like an arrow key (005)', () => {
  const held = (at: number) => sample({ 'dpad-down': 1 }, {}, true, at)

  it('presses once, waits, then repeats at a steady rate until it is released', () => {
    const resolver = createControllerIntentResolver()
    const down = { kind: 'move-selection', direction: 'down' } as const

    expect(resolver(held(0))).toEqual([down])
    expect(resolver(held(100))).toEqual([])
    expect(resolver(held(349))).toEqual([])
    expect(resolver(held(350))).toEqual([down])
    expect(resolver(held(400))).toEqual([])
    expect(resolver(held(440))).toEqual([down])
    expect(resolver(sample({}, {}, true, 450))).toEqual([])
    expect(resolver(sample({}, {}, true, 600))).toEqual([])
  })

  it('does not repeat while a wheel is open, nor start from a press made under one', () => {
    const resolver = createControllerIntentResolver()

    resolver(held(0), { captured: false })
    expect(resolver(held(400), { captured: true })).toEqual([])
    expect(resolver(held(900), { captured: false })).toEqual([])

    resolver(sample({}, {}, true, 950))
    resolver(held(1000), { captured: true })
    expect(resolver(held(1500), { captured: false })).toEqual([])
  })

  it('stays silent for a pad with no D-pad', () => {
    const resolver = createControllerIntentResolver({
      ...DEFAULT_CONTROLLER_POLICY,
      dpadNavigation: false
    })

    resolver(held(0))
    expect(resolver(held(500))).toEqual([])
  })
})
