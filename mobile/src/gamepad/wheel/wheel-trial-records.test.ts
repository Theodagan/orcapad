import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { REAL_ACTION_PRESETS } from './experiments/real-action-presets'
import { SMOKE_PRESETS } from './experiments/smoke-presets'
import { readString } from './wheel-product-default-gate'
import { validateWheelTrialRecord } from './wheel-trial-records'

const evidenceRoot = fileURLToPath(
  new URL('../../../../docs/evidence/context-wheel/', import.meta.url)
)

const complete = {
  trialId: 'smoke-hex-2026-01-01',
  testedAt: '2026-01-01',
  device: 'Retroid Pocket Flip 2',
  controller: 'built-in',
  presetId: 'smoke-hex',
  sampleCount: 40,
  openLatencyP95Ms: 42,
  accidentalOpenCount: 1,
  wrongCommitCount: 0,
  cancelFailureCount: 0,
  notes: 'Six segments were selectable; the two nearest the thumb rest were easiest.',
  disposition: 'iterate' as const
}

describe('wheel trial record', () => {
  it('accepts a complete record', () => {
    expect(validateWheelTrialRecord(complete)).toEqual([])
  })

  it('refuses a disposition with no trial behind it', () => {
    const { device: _device, sampleCount: _count, ...thin } = complete
    expect(validateWheelTrialRecord(thin)).toEqual(
      expect.arrayContaining(['device is required', 'sampleCount must be a count'])
    )
  })

  it('refuses a trial that observed nothing', () => {
    expect(validateWheelTrialRecord({ ...complete, sampleCount: 0 })).toContain(
      'sampleCount is zero — nothing was observed'
    )
  })

  it('refuses more failures than openings', () => {
    expect(validateWheelTrialRecord({ ...complete, wrongCommitCount: 41 })).toContain(
      'wrongCommitCount exceeds sampleCount'
    )
  })

  // WHEEL-R7: the wheel misfiring is exactly what would make a preset unsafe to promote.
  it('refuses to call a misfiring trial a candidate', () => {
    expect(
      validateWheelTrialRecord({ ...complete, disposition: 'candidate', wrongCommitCount: 2 })
    ).toContain('a trial that saw a wrong commit or a failed cancel cannot be a candidate')

    expect(
      validateWheelTrialRecord({ ...complete, disposition: 'candidate', cancelFailureCount: 1 })
    ).toContain('a trial that saw a wrong commit or a failed cancel cannot be a candidate')
  })

  it('accepts a clean candidate', () => {
    expect(validateWheelTrialRecord({ ...complete, disposition: 'candidate' })).toEqual([])
  })

  it('refuses an unknown disposition rather than storing it', () => {
    expect(validateWheelTrialRecord({ ...complete, disposition: 'shipped' })).toEqual(
      expect.arrayContaining([expect.stringContaining('disposition must be one of')])
    )
  })

  it('refuses something that is not a record', () => {
    expect(validateWheelTrialRecord(null)).toEqual(['not a trial record'])
    expect(validateWheelTrialRecord('candidate')).toEqual(['not a trial record'])
  })
})

/**
 * The gate. WHEEL-T8 needs a controller-capable device and a person to run the presets, so the
 * measurements are outstanding rather than failing — the same position CTRL-T8 takes. Every
 * record that *does* land is validated, and both preset families must eventually be covered.
 *
 * Delete the `skipIf` below to turn this back into a gate once the trials are run.
 */
function recordedTrials(): { file: string; record: unknown }[] {
  if (!existsSync(evidenceRoot)) {
    return []
  }
  return readdirSync(evidenceRoot)
    .filter((name) => name.endsWith('.json'))
    .map((name) => ({
      file: name,
      record: JSON.parse(readFileSync(join(evidenceRoot, name), 'utf8'))
    }))
}

describe('recorded wheel trials', () => {
  const trials = recordedTrials()

  it('validates every record that has been filed', () => {
    for (const { file, record } of trials) {
      expect(validateWheelTrialRecord(record), file).toEqual([])
    }
  })

  it.skipIf(trials.length === 0)('covers a smoke preset and a real-action preset', () => {
    const tested = new Set(trials.map(({ record }) => readString(record, 'presetId') ?? ''))
    const smoke = Object.keys(SMOKE_PRESETS).some((id) => tested.has(id))
    const real = Object.keys(REAL_ACTION_PRESETS).some((id) => tested.has(id))

    expect(smoke, 'no smoke preset trialled').toBe(true)
    expect(real, 'no real-action preset trialled').toBe(true)
  })
})
