import { describe, expect, it } from 'vitest'
import type { NativeControllerDevice, NativeControllerSample } from '../../../modules/orca-gamepad'
import { declaredFlat, toControllerSample, triggersAreAnalog } from './native-controller-sample'

function nativeSample(overrides: Partial<NativeControllerSample> = {}): NativeControllerSample {
  return {
    connected: true,
    buttons: { a: 1, lb: 0, 'dpad-up': 1 },
    axes: { 'left-x': 0.5, l2: 0.25 },
    sampledAt: 1_234,
    consumedByViewTree: false,
    focusedView: 'ReactViewGroup',
    ...overrides
  }
}

function device(overrides: Partial<NativeControllerDevice> = {}): NativeControllerDevice {
  return {
    id: 4,
    name: 'Retroid Pocket Flip 2',
    vendorId: 0x2020,
    productId: 0x0111,
    hasAnalogTriggers: true,
    flat: { 'left-x': 0.06, 'left-y': 0.06, l2: 0 },
    ...overrides
  }
}

describe('native controller sample', () => {
  it('carries buttons and axes across as maps', () => {
    const sample = toControllerSample(nativeSample())

    expect(sample.connected).toBe(true)
    expect(sample.buttons.get('a')).toBe(1)
    expect(sample.buttons.get('dpad-up')).toBe(1)
    expect(sample.axes.get('left-x')).toBe(0.5)
    expect(sample.axes.get('l2')).toBe(0.25)
    expect(sample.sampledAt).toBe(1_234)
  })

  it('drops a name this build has no meaning for rather than guessing', () => {
    const sample = toControllerSample(
      nativeSample({ buttons: { a: 1, paddle_left: 1 }, axes: { 'left-x': 0, gyro_pitch: 0.8 } })
    )

    expect([...sample.buttons.keys()]).toEqual(['a'])
    expect([...sample.axes.keys()]).toEqual(['left-x'])
  })

  it('reports a disconnect as a sample rather than an absence', () => {
    const sample = toControllerSample(nativeSample({ connected: false, buttons: {}, axes: {} }))

    expect(sample.connected).toBe(false)
    expect(sample.buttons.size).toBe(0)
  })
})

describe('what the attached pads declare', () => {
  it('takes the widest flat zone so one policy covers a mixed set', () => {
    const flat = declaredFlat([device(), device({ id: 5, flat: { 'left-x': 0.12 } })], 'left-x')

    expect(flat).toBe(0.12)
  })

  it('treats an axis no pad declares as having no flat zone', () => {
    expect(declaredFlat([device()], 'right-x')).toBe(0)
    expect(declaredFlat([], 'left-x')).toBe(0)
  })

  it('is analog only when every pad has a trigger axis', () => {
    expect(triggersAreAnalog([device()])).toBe(true)
    expect(triggersAreAnalog([device(), device({ id: 5, hasAnalogTriggers: false })])).toBe(false)
  })

  it('is not analog with nothing attached, which is not the same as digital hardware', () => {
    expect(triggersAreAnalog([])).toBe(false)
  })
})
