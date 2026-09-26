/**
 * What a device validation of `003` has to show (BIND-T10).
 *
 * The surfaces below are the binding matrix in `003` §2, and the list is the point: a device
 * report that covered four of them and called itself done is exactly the gap this closes. Each
 * surface is checked twice, by controller and by touch, because BIND-AC10 is a promise that the
 * controller work took nothing away.
 */

export const BOUND_SURFACES = [
  'pairing',
  'home',
  'workspaces',
  'session-tabs',
  'agent',
  'dictation',
  'terminal',
  'files'
] as const

export type BoundSurface = (typeof BOUND_SURFACES)[number]

/** Android only. iOS is deferred until the Retroid trials conclude (`001` tasks preamble). */
export const VALIDATED_PLATFORMS = ['android'] as const

export type ValidatedPlatform = (typeof VALIDATED_PLATFORMS)[number]

export type SurfaceObservation = {
  readonly surface: BoundSurface
  /** What the controller did, in the tester's words. Empty means it was not tried. */
  readonly controller: string
  /** BIND-AC10: the same surface, still operable by touch. */
  readonly touch: string
  readonly worked: boolean
  /** Required whenever `worked` is false — a failure with no description is a shrug. */
  readonly problem?: string
}

export type ControllerBindingEvidence = {
  readonly platform: ValidatedPlatform
  readonly device: string
  readonly controller: string
  readonly build: string
  readonly recordedAt: string
  /** CTRL-T4's open question, finally answered by a device (`003` §7, BIND-T6). */
  readonly terminalWebViewConsumedInput: boolean
  readonly observations: readonly SurfaceObservation[]
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validateObservation(observation: unknown, index: number): string[] {
  if (observation === null || typeof observation !== 'object') {
    return [`observations[${index}] is not an observation`]
  }
  const entry: Record<string, unknown> = { ...observation }
  const problems: string[] = []
  const surface = entry.surface
  if (!BOUND_SURFACES.some((allowed) => allowed === surface)) {
    problems.push(`observations[${index}].surface is not a bound surface`)
  }
  for (const field of ['controller', 'touch'] as const) {
    if (!isNonEmptyString(entry[field])) {
      problems.push(`observations[${index}].${field} is required`)
    }
  }
  if (typeof entry.worked !== 'boolean') {
    problems.push(`observations[${index}].worked is required`)
  }
  if (entry.worked === false && !isNonEmptyString(entry.problem)) {
    problems.push(`observations[${index}].problem is required when it did not work`)
  }
  return problems
}

/** Every reason the evidence cannot be trusted. Empty means it can. */
export function validateControllerBindingEvidence(evidence: unknown): readonly string[] {
  if (evidence === null || typeof evidence !== 'object') {
    return ['not a binding evidence record']
  }
  const entries: Record<string, unknown> = { ...evidence }
  const problems: string[] = []

  if (!VALIDATED_PLATFORMS.some((allowed) => allowed === entries.platform)) {
    problems.push(`platform must be one of ${VALIDATED_PLATFORMS.join(', ')}`)
  }
  for (const field of ['device', 'controller', 'build', 'recordedAt'] as const) {
    if (!isNonEmptyString(entries[field])) {
      problems.push(`${field} is required`)
    }
  }
  if (typeof entries.terminalWebViewConsumedInput !== 'boolean') {
    problems.push('terminalWebViewConsumedInput is required — it is the CTRL-T4 checkpoint')
  }

  const observations = entries.observations
  if (!Array.isArray(observations)) {
    problems.push('observations is required')
    return problems
  }
  observations.forEach((observation, index) => {
    problems.push(...validateObservation(observation, index))
  })

  const covered = new Set(
    observations
      .filter((observation): observation is SurfaceObservation => typeof observation === 'object')
      .map((observation) => observation.surface)
  )
  for (const surface of BOUND_SURFACES) {
    if (!covered.has(surface)) {
      problems.push(`${surface} was not exercised`)
    }
  }
  return problems
}
