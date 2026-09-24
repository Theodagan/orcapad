import type { WheelActionBindingId, WheelRegistry } from './wheel-registry'
import type { WheelId, WheelSegment } from './wheel-segment'

/**
 * A preset is a proposed layout for one trial, never a default (WHEEL-R6). The `contractual`
 * field is literal `false` rather than optional or derived, so making one contractual is a
 * visible edit that the boundary ratchet fails — promoting a layout has to be a decision someone
 * takes, not a value that drifts.
 *
 * Layout lives here and actions live in the registry. A preset names binding ids it does not
 * own, which is what lets a layout be rearranged without touching a surface, and a surface be
 * unmounted without editing a layout.
 */

/** Everything WHEEL-R6 says a preset must record about the trial it belongs to. */
export type PresetTrialMetadata = {
  readonly trialId: string
  readonly targetDevice: string
  readonly controller: string
  /** WHEEL-R7: a preset that can reach a destructive action must say so before it is run. */
  readonly destructivePolicy: 'excludes-destructive' | 'includes-destructive'
  readonly notes: string
}

export type WheelPresetSegment = {
  readonly id: string
  readonly label: string
  /** Radians, clockwise from twelve o'clock. */
  readonly centerAngle: number
  readonly halfWidth: number
  readonly bindingId: WheelActionBindingId
}

export type WheelPresetDefinition = {
  readonly presetId: string
  readonly label: string
  readonly wheel: WheelId
  /** Literal `false`. A preset is an experiment until a product decision says otherwise. */
  readonly contractual: false
  readonly trial: PresetTrialMetadata
  readonly segments: readonly WheelPresetSegment[]
}

/**
 * Frozen on load, deeply. A preset is the record of what a trial actually ran, so a later edit
 * that quietly changed it would invalidate the trial it belongs to rather than update it.
 */
export function loadPreset(definition: WheelPresetDefinition): WheelPresetDefinition {
  return Object.freeze({
    ...definition,
    trial: Object.freeze({ ...definition.trial }),
    segments: Object.freeze(definition.segments.map((segment) => Object.freeze({ ...segment })))
  })
}

/**
 * The preset's layout, with availability answered by the registry at the moment of asking.
 *
 * A segment whose binding is not registered resolves to `unavailable` rather than disappearing:
 * `002` §3 keeps the preset inspectable, and dropping the segment would shift every other one
 * under the user's thumb mid-gesture.
 */
export function resolveSegments(
  preset: WheelPresetDefinition,
  registry: WheelRegistry
): readonly WheelSegment[] {
  return preset.segments.map((segment) => {
    const binding = registry.lookup(segment.bindingId)
    return {
      id: segment.id,
      // The binding's own label wins when it is mounted: it knows the live wording, and the
      // preset's is a placeholder written before the surface existed.
      label: binding?.label ?? segment.label,
      centerAngle: segment.centerAngle,
      halfWidth: segment.halfWidth,
      availability: binding?.availability ?? 'unavailable',
      bindingId: segment.bindingId
    }
  })
}

/**
 * What the validator is handed: a preset whose `contractual` is merely a boolean. A preset can
 * arrive from JSON, where the literal type proves nothing, so the check has to be a runtime one
 * and the parameter has to admit the value it exists to reject.
 */
export type UnvalidatedPreset = Omit<WheelPresetDefinition, 'contractual'> & {
  readonly contractual: boolean
}

/** Every reason a preset cannot be trusted as a trial record. Empty means it can. */
export function validatePreset(preset: UnvalidatedPreset): readonly string[] {
  const problems: string[] = []
  if (preset.contractual !== false) {
    problems.push('contractual must be literal false — a preset is an experiment (WHEEL-R6)')
  }
  for (const [field, value] of [
    ['presetId', preset.presetId],
    ['trial.trialId', preset.trial.trialId],
    ['trial.targetDevice', preset.trial.targetDevice],
    ['trial.controller', preset.trial.controller]
  ] as const) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      problems.push(`${field} is required`)
    }
  }
  const ids = new Set<string>()
  for (const segment of preset.segments) {
    if (ids.has(segment.id)) {
      problems.push(`duplicate segment id '${segment.id}' — a lock would be ambiguous`)
    }
    ids.add(segment.id)
    if (segment.halfWidth <= 0) {
      problems.push(`segment '${segment.id}' has no width, so it can never be selected`)
    }
  }
  return problems
}
