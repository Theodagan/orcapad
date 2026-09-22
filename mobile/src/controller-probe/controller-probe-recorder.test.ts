import { describe, expect, it, vi } from 'vitest'
import type { ProbeDevice, ProbeKeyEvent } from '../../modules/orca-gamepad-probe'
import { createControllerProbeRecorder, scrubRecording } from './controller-probe-recorder'

function key(eventTime: number, focusedView = 'ReactViewGroup'): ProbeKeyEvent {
  return {
    kind: 'key',
    action: 'down',
    keyCode: 96,
    keyCodeName: 'KEYCODE_BUTTON_A',
    scanCode: 304,
    repeatCount: 0,
    deviceId: 4,
    source: 1_281,
    sourceNames: ['gamepad', 'keyboard'],
    eventTime,
    consumedByViewTree: false,
    focusedView
  }
}

function device(overrides: Partial<ProbeDevice> = {}): ProbeDevice {
  return {
    id: 4,
    name: 'Retroid Pocket Flip Gamepad',
    vendorId: 1_234,
    productId: 5_678,
    sources: 1_281,
    sourceNames: ['gamepad', 'keyboard'],
    isVirtual: false,
    controllerNumber: 1,
    isGameController: true,
    triggerForm: 'analog',
    motionRanges: [],
    ...overrides
  }
}

describe('controller probe recorder', () => {
  it('keeps a stable snapshot between writes', () => {
    const recorder = createControllerProbeRecorder(10)
    const before = recorder.snapshot()

    expect(recorder.snapshot()).toBe(before)

    recorder.record(key(1))
    expect(recorder.snapshot()).not.toBe(before)
  })

  it('notifies subscribers and stops after unsubscribe', () => {
    const recorder = createControllerProbeRecorder(10)
    const listener = vi.fn()
    const unsubscribe = recorder.subscribe(listener)

    recorder.record(key(1))
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    recorder.record(key(2))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('gives every event a stable identity the native payload does not carry', () => {
    const recorder = createControllerProbeRecorder(10)
    recorder.record(key(1))
    recorder.record(key(1))

    expect(recorder.snapshot().events.map((event) => event.seq)).toEqual([0, 1])
  })

  it('counts what the ring buffer discarded rather than silently truncating', () => {
    const recorder = createControllerProbeRecorder(2)

    recorder.record(key(1))
    recorder.record(key(2))
    recorder.record(key(3))

    const snapshot = recorder.snapshot()
    expect(snapshot.events.map((event) => event.eventTime)).toEqual([2, 3])
    expect(snapshot.droppedEvents).toBe(1)
  })

  it('takes the device list from a disconnect report', () => {
    const recorder = createControllerProbeRecorder(10)
    recorder.setDevices([device()])

    recorder.recordDeviceChange({ change: 'removed', deviceId: 4, devices: [] })

    expect(recorder.snapshot().devices).toEqual([])
    expect(recorder.snapshot().deviceChanges).toHaveLength(1)
  })

  it('clears everything on reset', () => {
    const recorder = createControllerProbeRecorder(2)
    recorder.record(key(1))
    recorder.record(key(2))
    recorder.record(key(3))

    recorder.reset(500)

    expect(recorder.snapshot()).toEqual({
      startedAt: 500,
      devices: [],
      events: [],
      deviceChanges: [],
      droppedEvents: 0
    })
  })
})

describe('scrubbing a recording for git', () => {
  it('keeps the controller model but drops a name the user could have chosen', () => {
    const recorder = createControllerProbeRecorder(10)
    recorder.setDevices([
      device(),
      device({ id: 9, name: "someone's phone keyboard", isGameController: false })
    ])

    const scrubbed = scrubRecording(recorder.snapshot())

    expect(scrubbed.devices[0]?.name).toBe('Retroid Pocket Flip Gamepad')
    expect(scrubbed.devices[1]?.name).toBe('redacted-non-controller')
  })

  it('rebases event times so device uptime never reaches git', () => {
    const recorder = createControllerProbeRecorder(10)
    recorder.record(key(910_000))
    recorder.record(key(910_120))

    const scrubbed = scrubRecording(recorder.snapshot())

    expect(scrubbed.events.map((event) => event.eventTime)).toEqual([0, 120])
    expect(scrubbed.startedAt).toBe(0)
  })

  it('leaves the focused view intact, which is the WebView answer', () => {
    const recorder = createControllerProbeRecorder(10)
    recorder.record(key(1, 'RNCWebView'))

    expect(scrubRecording(recorder.snapshot()).events[0]?.focusedView).toBe('RNCWebView')
  })
})
