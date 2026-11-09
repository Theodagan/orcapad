/**
 * The shape of a device performance record, and what makes one trustworthy.
 *
 * `001` §8 is explicit that these targets are project criteria, not platform guarantees, so a
 * record is only worth anything if it says how it was measured. A number with no tool, build or
 * sample count behind it is an opinion, and the validator refuses it.
 */

export const PERFORMANCE_MEASUREMENTS = ['wheel-open-latency', 'disconnect-notice'] as const

export type PerformanceMeasurement = (typeof PERFORMANCE_MEASUREMENTS)[number]

/** Targets from `001` §8. Exceeding one is a finding to record, not a reason to hide the record. */
export const MEASUREMENT_TARGET_MS: Readonly<Record<PerformanceMeasurement, number>> = {
  'wheel-open-latency': 50,
  'disconnect-notice': 1_000
}

export type PerformanceRecord = {
  readonly measurement: PerformanceMeasurement
  /** The exact configuration measured — an emulator and AVD, or a named handheld. */
  readonly device: string
  readonly tool: string
  readonly build: string
  readonly recordedAt: string
  readonly sampleCount: number
  /** Raw results, so the p95 can be recomputed rather than trusted. */
  readonly samplesMs: readonly number[]
  readonly p95Ms: number
  readonly conclusion: string
}

/** The 95th percentile by nearest-rank, which is what a small hand-collected sample supports. */
export function percentile95(samplesMs: readonly number[]): number {
  if (samplesMs.length === 0) {
    return Number.NaN
  }
  const sorted = [...samplesMs].sort((a, b) => a - b)
  const rank = Math.ceil(0.95 * sorted.length)
  return sorted[Math.max(0, rank - 1)] ?? Number.NaN
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Every reason this record cannot be believed. Empty means it can. */
export function validatePerformanceRecord(raw: unknown): readonly string[] {
  if (typeof raw !== 'object' || raw === null) {
    return ['record is not an object']
  }
  const record: Record<string, unknown> = { ...raw }
  const problems: string[] = []

  const measurement = record.measurement
  if (
    typeof measurement !== 'string' ||
    !PERFORMANCE_MEASUREMENTS.some((known) => known === measurement)
  ) {
    problems.push(`measurement must be one of ${PERFORMANCE_MEASUREMENTS.join(', ')}`)
  }
  for (const field of ['device', 'tool', 'build', 'recordedAt', 'conclusion']) {
    if (!isNonEmptyString(record[field])) {
      problems.push(`${field} is required`)
    }
  }

  const samples = record.samplesMs
  if (!Array.isArray(samples) || samples.some((value) => typeof value !== 'number')) {
    problems.push('samplesMs must be an array of numbers')
    return problems
  }
  if (samples.length === 0) {
    problems.push('samplesMs must not be empty — a record with no raw results proves nothing')
    return problems
  }
  if (record.sampleCount !== samples.length) {
    problems.push(
      `sampleCount ${String(record.sampleCount)} does not match ${samples.length} samples`
    )
  }
  // Recomputed rather than trusted: a stated p95 that the raw data does not support is the one
  // failure mode a schema check can actually catch.
  const expected = percentile95(samples)
  if (record.p95Ms !== expected) {
    problems.push(
      `p95Ms ${String(record.p95Ms)} does not match ${expected} computed from samplesMs`
    )
  }
  return problems
}
