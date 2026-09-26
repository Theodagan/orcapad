/**
 * What it would take to make a preset a product default, and why nothing can do it by accident
 * (WHEEL-AC8).
 *
 * `002` is explicit that this specification does not perform that promotion. So this is not the
 * promotion mechanism — it is the lock on it. A preset becomes contractual only alongside a
 * decision record naming a trial that produced it and a person who accepted it, and the ratchet
 * beside this refuses a contractual preset that has neither.
 *
 * The separation is the point: `candidate` is the best a trial can say on its own, and a machine
 * reading good numbers is not the same as a person deciding to ship them.
 */

export type ProductDefaultDecision = {
  readonly presetId: string
  /** The trial this rests on, which must itself be a `candidate`. */
  readonly trialId: string
  readonly decidedAt: string
  /** Who accepted it. A decision with no name behind it is not a decision. */
  readonly decidedBy: string
  readonly rationale: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validateProductDefaultDecision(decision: unknown): readonly string[] {
  if (decision === null || typeof decision !== 'object') {
    return ['not a decision record']
  }
  const entries: Record<string, unknown> = { ...decision }
  const problems: string[] = []
  for (const field of ['presetId', 'trialId', 'decidedAt', 'decidedBy', 'rationale'] as const) {
    if (!isNonEmptyString(entries[field])) {
      problems.push(`${field} is required`)
    }
  }
  return problems
}

/**
 * The gate itself: which contractual presets are unaccounted for. Takes the ids rather than the
 * presets so it can be run over source text, before any such preset exists to import.
 */
export function unapprovedProductDefaults(
  contractualPresetIds: readonly string[],
  decisions: readonly ProductDefaultDecision[]
): readonly string[] {
  const approved = new Set(
    decisions
      .filter((decision) => validateProductDefaultDecision(decision).length === 0)
      .map((decision) => decision.presetId)
  )
  return contractualPresetIds.filter((id) => !approved.has(id))
}
