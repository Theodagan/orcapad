import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from './controller-reader'
import { DEFAULT_CONTROLLER_POLICY } from './controller-resolver'
import {
  CONTROLLER_AXES,
  CONTROLLER_BUTTONS,
  type ControllerAxis,
  type ControllerButton,
  type ControllerSample
} from './controller-sample'
import { isInputHeld, withHeldInputRepeat } from './held-input-repeat'

function sample(
  axes: Partial<Record<ControllerAxis, number>> = {},
  buttons: Partial<Record<ControllerButton, number>> = {},
  at = 0,
  connected = true
): ControllerSample {
  const axisMap = new Map<ControllerAxis, number>()
  for (const name of CONTROLLER_AXES) {
    const value = axes[name]
    if (value !== undefined) {
      axisMap.set(name, value)
    }
  }
  const buttonMap = new Map<ControllerButton, number>()
  for (const name of CONTROLLER_BUTTONS) {
    const value = buttons[name]
    if (value !== undefined) {
      buttonMap.set(name, value)
    }
  }
  return { connected, buttons: buttonMap, axes: axisMap, sampledAt: at }
}

/** A device whose true state the test moves, and whose published samples it controls separately. */
function device() {
  let live = sample()
  let listener: ((s: ControllerSample) => void) | null = null
  let unsubscribed = 0
  const reader: ControllerReader = {
    support: () => 'available',
    current: () => live,
    subscribe: (next) => {
      listener = next
      return () => {
        unsubscribed += 1
        listener = null
      }
    }
  }
  return {
    reader,
    /** The device changed, and said so. */
    publish: (next: ControllerSample) => {
      live = next
      listener?.(next)
    },
    /** The device changed and the native pacing swallowed the event. */
    changeSilently: (next: ControllerSample) => {
      live = next
    },
    unsubscribed: () => unsubscribed
  }
}

function repeating(pad: ReturnType<typeof device>, options: { active?: () => boolean } = {}) {
  const received: ControllerSample[] = []
  const reader = withHeldInputRepeat(pad.reader, {
    policy: () => DEFAULT_CONTROLLER_POLICY,
    ...(options.active === undefined ? {} : { isActive: options.active })
  })
  const unsubscribe = reader.subscribe((s) => received.push(s))
  return { received, unsubscribe }
}

describe('what counts as held', () => {
  it('is a trigger or stick past its dead zone, or a D-pad direction', () => {
    expect(isInputHeld(sample({ r2: 0.5 }), DEFAULT_CONTROLLER_POLICY)).toBe(true)
    expect(isInputHeld(sample({ 'left-x': 0.9 }), DEFAULT_CONTROLLER_POLICY)).toBe(true)
    expect(isInputHeld(sample({}, { 'dpad-down': 1 }), DEFAULT_CONTROLLER_POLICY)).toBe(true)
  })

  it('is not an idle pad, a stick inside its dead zone, or a face button', () => {
    expect(isInputHeld(sample(), DEFAULT_CONTROLLER_POLICY)).toBe(false)
    expect(isInputHeld(sample({ 'left-x': 0.1 }), DEFAULT_CONTROLLER_POLICY)).toBe(false)
    expect(isInputHeld(sample({}, { a: 1, y: 1 }), DEFAULT_CONTROLLER_POLICY)).toBe(false)
  })

  it('is nothing while disconnected', () => {
    expect(isInputHeld(sample({ r2: 1 }, {}, 0, false), DEFAULT_CONTROLLER_POLICY)).toBe(false)
  })
})

describe('held-input repeat (005 USE-R1)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts no timer while idle, and none once everything is released', () => {
    const pad = device()
    repeating(pad)

    pad.publish(sample())
    expect(vi.getTimerCount()).toBe(0)

    pad.publish(sample({ r2: 1 }, {}, 10))
    expect(vi.getTimerCount()).toBe(1)
    pad.publish(sample({}, {}, 20))
    vi.advanceTimersByTime(100)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('republishes a held trigger on every tick, which is what makes a hold last', () => {
    const pad = device()
    const { received } = repeating(pad)

    pad.publish(sample({ r2: 1 }, {}, 0))
    vi.advanceTimersByTime(160)

    // One real sample, then ten ticks of 16 ms.
    expect(received).toHaveLength(11)
    expect(received.every((s) => s.axes.get('r2') === 1)).toBe(true)
  })

  it('reads the axes from the device on each tick rather than replaying the last sample', () => {
    const pad = device()
    const { received } = repeating(pad)

    pad.publish(sample({ r2: 1 }, {}, 0))
    pad.changeSilently(sample({ r2: 0.4 }, {}, 20))
    vi.advanceTimersByTime(16)

    expect(received.at(-1)?.axes.get('r2')).toBe(0.4)
  })

  it('sees a release the native pacing dropped, publishes it once, and stops', () => {
    const pad = device()
    const { received } = repeating(pad)

    pad.publish(sample({ r2: 1 }, {}, 0))
    pad.changeSilently(sample({}, {}, 30))
    vi.advanceTimersByTime(16)
    const settled = received.length
    vi.advanceTimersByTime(200)

    expect(received.at(-1)?.axes.get('r2') ?? 0).toBe(0)
    expect(received).toHaveLength(settled)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('never invents a button edge: buttons come from the last published sample, not the device', () => {
    const pad = device()
    const { received } = repeating(pad)

    pad.publish(sample({ r2: 1 }, { y: 0 }, 0))
    pad.changeSilently(sample({ r2: 1 }, { y: 1 }, 10))
    vi.advanceTimersByTime(16)

    expect(received.at(-1)?.buttons.get('y')).toBe(0)
  })

  it('repeats a held D-pad direction, so the resolver can see how long it has been down', () => {
    const pad = device()
    const { received } = repeating(pad)

    pad.publish(sample({}, { 'dpad-down': 1 }, 0))
    vi.advanceTimersByTime(48)

    expect(received.length).toBeGreaterThan(2)
    expect(received.every((s) => s.buttons.get('dpad-down') === 1)).toBe(true)
  })

  it('stops on disconnect, and publishes the disconnect', () => {
    const pad = device()
    const { received } = repeating(pad)

    pad.publish(sample({ r2: 1 }, {}, 0))
    pad.changeSilently(sample({}, {}, 20, false))
    vi.advanceTimersByTime(16)

    expect(received.at(-1)?.connected).toBe(false)
    vi.advanceTimersByTime(200)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears its pending tick when unsubscribed', () => {
    const pad = device()
    const { unsubscribe } = repeating(pad)

    pad.publish(sample({ r2: 1 }, {}, 0))
    unsubscribe()

    expect(vi.getTimerCount()).toBe(0)
    expect(pad.unsubscribed()).toBe(1)
  })

  it('keeps ticking when a listener throws, so a held trigger does not freeze mid-scroll', () => {
    const pad = device()
    const calls: number[] = []
    const reader = withHeldInputRepeat(pad.reader, { policy: () => DEFAULT_CONTROLLER_POLICY })
    reader.subscribe(() => {
      calls.push(calls.length)
      if (calls.length === 2) {
        throw new Error('boom')
      }
    })

    pad.publish(sample({ r2: 1 }, {}, 0))
    expect(() => vi.advanceTimersByTime(16)).toThrow('boom')
    vi.advanceTimersByTime(32)

    expect(calls.length).toBeGreaterThan(3)
  })

  it('stays quiet while the app is in the background, even though the pad still reads held', () => {
    const pad = device()
    let active = true
    const { received } = repeating(pad, { active: () => active })

    pad.publish(sample({ r2: 1 }, {}, 0))
    active = false
    vi.advanceTimersByTime(16)
    const quiet = received.length
    vi.advanceTimersByTime(200)

    expect(received).toHaveLength(quiet)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('passes support and the current sample straight through', () => {
    const pad = device()
    const reader = withHeldInputRepeat(pad.reader, { policy: () => DEFAULT_CONTROLLER_POLICY })

    expect(reader.support()).toBe('available')
    expect(reader.current()).toEqual(pad.reader.current())
  })
})
