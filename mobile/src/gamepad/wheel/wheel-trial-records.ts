/**
 * The shape of a Context Wheel device trial, and what makes one trustworthy (`002` §5).
 *
 * A trial is the only thing that can turn a preset from a guess into a candidate, so the record
 * has to say what was run, on what, and how much of it. A disposition with no preset id, no
 * device and no sample count behind it is an opinion — the validator refuses it, the same way
 * `controller-evidence.ts` refuses an unmeasured latency.
 *
 * Counting the failures matters more than the successes here. `accidentalOpenCount`,
 * `wrongCommitCount` and `cancelFailureCount` are the three ways the PRD's wheel rules can be
 * broken in the hand, and a trial that does not report them has not looked for them.
 */

export const TRIAL_DISPOSITIONS = ['reject', 'iterate', 'candidate'] as const

export type TrialDisposition = (typeof TRIAL_DISPOSITIONS)[number]

export type WheelTrialRecord = {
  readonly trialId: string
  /** ISO date; a trial is evidence about a build at a moment, not a standing fact. */
  readonly testedAt: string
  readonly device: string
  readonly controller: string
  readonly presetId: string
  readonly sampleCount: number
  readonly openLatencyP95Ms: number
  readonly accidentalOpenCount: number
  readonly wrongCommitCount: number
  readonly cancelFailureCount: number
  readonly notes: string
  /** `candidate` is a trial result, never a product decision — that is WHEEL-T9's. */
  readonly disposition: TrialDisposition
}

const REQUIRED_TEXT = ['trialId', 'testedAt', 'device', 'controller', 'presetId', 'notes'] as const

const REQUIRED_COUNTS = [
  'sampleCount',
  'openLatencyP95Ms',
  'accidentalOpenCount',
  'wrongCommitCount',
  'cancelFailureCount'
] as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** Every reason a record cannot be trusted. Empty means it can. */
export function validateWheelTrialRecord(record: unknown): readonly string[] {
  if (record === null || typeof record !== 'object') {
    return ['not a trial record']
  }
  const entries: Record<string, unknown> = { ...record }
  const problems: string[] = []

  for (const field of REQUIRED_TEXT) {
    if (!isNonEmptyString(entries[field])) {
      problems.push(`${field} is required`)
    }
  }
  for (const field of REQUIRED_COUNTS) {
    if (!isCount(entries[field])) {
      problems.push(`${field} must be a count`)
    }
  }
  const disposition = entries.disposition
  if (!TRIAL_DISPOSITIONS.some((allowed) => allowed === disposition)) {
    problems.push(`disposition must be one of ${TRIAL_DISPOSITIONS.join(', ')}`)
  }
  // A trial with no samples measured nothing, whatever its counts say.
  if (isCount(entries.sampleCount) && entries.sampleCount === 0) {
    problems.push('sampleCount is zero — nothing was observed')
  }
  // A failure cannot have happened more often than the wheel was opened.
  if (isCount(entries.sampleCount)) {
    for (const field of ['wrongCommitCount', 'cancelFailureCount'] as const) {
      const value = entries[field]
      if (isCount(value) && value > entries.sampleCount) {
        problems.push(`${field} exceeds sampleCount`)
      }
    }
  }
  // WHEEL-R7 and `002` §5: a trial that saw the wheel misfire is not a candidate.
  if (
    disposition === 'candidate' &&
    isCount(entries.wrongCommitCount) &&
    isCount(entries.cancelFailureCount) &&
    entries.wrongCommitCount + entries.cancelFailureCount > 0
  ) {
    problems.push('a trial that saw a wrong commit or a failed cancel cannot be a candidate')
  }
  return problems
}
