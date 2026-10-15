import { describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from './controller-reader'
import { neutralSample, type ControllerSample } from './controller-sample'
import { multicastControllerReader } from './multicast-controller-reader'

function upstreamReader() {
  const listeners = new Set<(sample: ControllerSample) => void>()
  const start = vi.fn()
  const stop = vi.fn()
  const reader: ControllerReader = {
    support: () => 'available',
    current: () => neutralSample(0, true),
    subscribe: (listener) => {
      start()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        stop()
      }
    }
  }
  const publish = (sample: ControllerSample): void => {
    for (const listener of listeners) {
      listener(sample)
    }
  }
  return { reader, start, stop, publish, listeners }
}

describe('a multicast controller reader', () => {
  it('subscribes upstream once, and stops it only when the last listener leaves', () => {
    const upstream = upstreamReader()
    const shared = multicastControllerReader(upstream.reader)
    const first = vi.fn()
    const second = vi.fn()

    const leaveFirst = shared.subscribe(first)
    const leaveSecond = shared.subscribe(second)
    upstream.publish(neutralSample(1, true))

    expect(upstream.start).toHaveBeenCalledTimes(1)
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    leaveFirst()
    leaveFirst()
    expect(upstream.stop).not.toHaveBeenCalled()
    upstream.publish(neutralSample(2, true))
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(2)

    leaveSecond()
    expect(upstream.stop).toHaveBeenCalledTimes(1)
    expect(upstream.listeners.size).toBe(0)
  })

  it('restarts upstream for a subscriber that arrives after everyone left', () => {
    const upstream = upstreamReader()
    const shared = multicastControllerReader(upstream.reader)

    shared.subscribe(() => {})()
    shared.subscribe(() => {})

    expect(upstream.start).toHaveBeenCalledTimes(2)
    expect(upstream.stop).toHaveBeenCalledTimes(1)
  })

  it('still delivers to every listener when one throws, then reports the failure', () => {
    const upstream = upstreamReader()
    const shared = multicastControllerReader(upstream.reader)
    const after = vi.fn()
    shared.subscribe(() => {
      throw new Error('listener broke')
    })
    shared.subscribe(after)

    expect(() => upstream.publish(neutralSample(1, true))).toThrow('listener broke')
    expect(after).toHaveBeenCalledTimes(1)
  })
})
