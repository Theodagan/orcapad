import { describe, expect, it, vi } from 'vitest'
// The readout's component half imports react-native, whose package is Flow and cannot be parsed here.
vi.mock('react-native', () => ({
  StyleSheet: { create: <T>(styles: T) => styles },
  Text: 'Text',
  View: 'View'
}))

import {
  latencyPercentiles,
  sampleToFrameLatencies,
  showsWheelLatency,
  WHEEL_LATENCY_WINDOW,
  type WheelLatencyMeasurement
} from './latency-readout'

const measurement = (sampleAt: number, frameAt: number): WheelLatencyMeasurement => ({
  sampleAt,
  frameAt
})

describe('the wheel latency readout', () => {
  it('reads the median and the tail off an unsorted window', () => {
    expect(latencyPercentiles([50, 10, 30, 20, 40])).toEqual({ p50: 30, p95: 50 })
    // Nearest rank on an even window takes the lower of the two middle values.
    expect(latencyPercentiles([7, 9, 11, 13])).toEqual({ p50: 9, p95: 13 })
    expect(latencyPercentiles([16])).toEqual({ p50: 16, p95: 16 })
  })

  it('says nothing until a turn has been measured', () => {
    expect(latencyPercentiles([])).toBeNull()
  })

  it('measures each sample against the frame it was drawn in', () => {
    expect(
      sampleToFrameLatencies([measurement(100, 116), measurement(200, 250), measurement(9, 3)])
    ).toEqual([16, 50, -6])
  })

  it('keeps only the rolling window', () => {
    const many = Array.from({ length: WHEEL_LATENCY_WINDOW + 5 }, (_, index) =>
      measurement(index, index + 20)
    )

    expect(sampleToFrameLatencies(many)).toHaveLength(WHEEL_LATENCY_WINDOW)
    expect(sampleToFrameLatencies(many)[0]).toBe(20)
  })

  it('is off unless the dev setting turns it on', () => {
    expect(showsWheelLatency(false)).toBe(false)
    expect(showsWheelLatency(true)).toBe(true)
  })
})
