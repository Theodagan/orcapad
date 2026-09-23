import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MEASUREMENT_TARGET_MS,
  PERFORMANCE_MEASUREMENTS,
  percentile95,
  validatePerformanceRecord,
  type PerformanceMeasurement,
  type PerformanceRecord
} from './controller-evidence'

/**
 * CTRL-T8's gate. It fails while a required record is absent or incomplete, which is the point:
 * the measurements in `001` §8 are device facts, and a target with no record behind it is a
 * wish. The task stays open until this passes.
 *
 * A measurement is only required once the thing it measures exists. Wheel-open latency cannot be
 * recorded before `002` ships the overlay, so that record is not demanded until the wheel module
 * is present — otherwise the gate would be red for a feature nobody has started.
 */

const mobileRoot = fileURLToPath(new URL('../../..', import.meta.url))
const repoRoot = join(mobileRoot, '..')
const evidenceRoot = join(repoRoot, 'docs', 'evidence', 'controller-input')
const wheelRoot = join(mobileRoot, 'src', 'gamepad', 'wheel')

function isMeasurementDue(measurement: PerformanceMeasurement): boolean {
  // The overlay is what a dead-zone-to-first-frame measurement times.
  return measurement === 'wheel-open-latency' ? existsSync(wheelRoot) : true
}

function recordedMeasurements(): Map<PerformanceMeasurement, { file: string; raw: unknown }> {
  const found = new Map<PerformanceMeasurement, { file: string; raw: unknown }>()
  if (!existsSync(evidenceRoot)) {
    return found
  }
  for (const entry of readdirSync(evidenceRoot)) {
    if (!entry.endsWith('.json')) {
      continue
    }
    const file = join(evidenceRoot, entry)
    let raw: unknown
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'))
    } catch {
      continue
    }
    const measurement = (raw as { measurement?: unknown }).measurement
    for (const known of PERFORMANCE_MEASUREMENTS) {
      if (measurement === known) {
        found.set(known, { file: entry, raw })
      }
    }
  }
  return found
}

function record(overrides: Partial<PerformanceRecord> = {}): PerformanceRecord {
  const samplesMs = overrides.samplesMs ?? [30, 34, 41, 38, 46]
  return {
    measurement: 'disconnect-notice',
    device: 'Retroid Pocket Flip 2',
    tool: 'adb logcat timestamps',
    build: 'app-release 0.0.50',
    recordedAt: '2026-09-24',
    sampleCount: samplesMs.length,
    samplesMs,
    p95Ms: percentile95(samplesMs),
    conclusion: 'Within the 1s target.',
    ...overrides
  }
}

describe('percentile95', () => {
  it('uses nearest rank, which is what a small hand-collected sample supports', () => {
    expect(percentile95([10, 20, 30, 40, 50])).toBe(50)
    expect(percentile95([5])).toBe(5)
    expect(percentile95([50, 10, 30])).toBe(50)
  })

  it('is not a number when there is nothing to measure', () => {
    expect(percentile95([])).toBeNaN()
  })
})

describe('validatePerformanceRecord', () => {
  it('accepts a complete record', () => {
    expect(validatePerformanceRecord(record())).toEqual([])
  })

  it('refuses a record that says how fast it was but not how it was measured', () => {
    const problems = validatePerformanceRecord({ ...record(), tool: '', build: '  ' })

    expect(problems).toContain('tool is required')
    expect(problems).toContain('build is required')
  })

  it('refuses a p95 the raw samples do not support', () => {
    const problems = validatePerformanceRecord({ ...record(), p95Ms: 12 })

    expect(problems.some((problem) => problem.startsWith('p95Ms 12'))).toBe(true)
  })

  it('refuses a sample count that disagrees with the samples', () => {
    const problems = validatePerformanceRecord({ ...record(), sampleCount: 99 })

    expect(problems.some((problem) => problem.includes('does not match 5 samples'))).toBe(true)
  })

  it('refuses a record with no raw results at all', () => {
    expect(validatePerformanceRecord({ ...record(), samplesMs: [], sampleCount: 0 })).toContain(
      'samplesMs must not be empty — a record with no raw results proves nothing'
    )
  })

  it('refuses an unknown measurement rather than storing it', () => {
    expect(validatePerformanceRecord({ ...record(), measurement: 'vibes' })[0]).toContain(
      'measurement must be one of'
    )
  })

  it('refuses something that is not a record', () => {
    expect(validatePerformanceRecord(null)).toEqual(['record is not an object'])
    expect(validatePerformanceRecord('fast')).toEqual(['record is not an object'])
  })
})

describe('the device records CTRL-T8 requires', () => {
  const recorded = recordedMeasurements()

  for (const measurement of PERFORMANCE_MEASUREMENTS) {
    const due = isMeasurementDue(measurement)

    it.skipIf(!due)(`has a valid ${measurement} record`, () => {
      const entry = recorded.get(measurement)

      expect(
        entry,
        `No ${measurement} record in docs/evidence/controller-input/. ` +
          `CTRL-T8 requires one measured on hardware (target ${MEASUREMENT_TARGET_MS[measurement]}ms).`
      ).toBeDefined()
      expect(validatePerformanceRecord(entry?.raw)).toEqual([])
    })
  }
})
