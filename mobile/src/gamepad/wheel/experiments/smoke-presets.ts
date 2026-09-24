import { loadPreset, type WheelPresetDefinition } from '../wheel-preset'

/**
 * Layouts to try, bound only to the local diagnostics next door. WHEEL-R6 makes every one of
 * these an experiment: each carries `contractual: false` as literal data, none is named a
 * default, and replacing one is an edit to this file alone — no geometry, no state machine, no
 * surface (WHEEL-AC6, WHEEL-AC7).
 *
 * Three segment counts, deliberately. A four-segment wheel is the easy case; three puts a
 * boundary where no thumb rests naturally, and six makes each segment narrow enough that the
 * trial can say whether the geometry or the hand is the limit. Picking between them is what the
 * device trials are for, so this file offers them rather than choosing.
 *
 * Angles are data here, not computation: positions are written as fractions of the dial, and
 * turning a vector into a segment stays in the wheel mechanics.
 */

const FULL_TURN = 6.283185307179586

/** Every trial these presets can be run in says the same thing, so it is said once. */
const SMOKE_TRIAL = {
  targetDevice: 'any controller-capable Android device',
  controller: 'any Android gamepad',
  /** WHEEL-R7: a smoke binding cannot reach anything destructive, by construction. */
  destructivePolicy: 'excludes-destructive',
  notes: 'Local diagnostics only; a commit records a run and relabels its own segment.'
} as const

/**
 * A hair wider than half the pitch. Segments that abut exactly leave a gap the width of a
 * rounding error at every boundary, and a stick held on one would select nothing; overlapping
 * them hands that angle to the nearer centre, which is what the geometry already does.
 */
const BOUNDARY_OVERLAP = 0.001

const QUAD_HALF_WIDTH = FULL_TURN / 8 + BOUNDARY_OVERLAP
const TRIAD_HALF_WIDTH = FULL_TURN / 6 + BOUNDARY_OVERLAP
const HEX_HALF_WIDTH = FULL_TURN / 12 + BOUNDARY_OVERLAP

export const SMOKE_PRESETS: Readonly<Record<string, WheelPresetDefinition>> = {
  'smoke-quad': loadPreset({
    presetId: 'smoke-quad',
    label: 'Four segments',
    wheel: 1,
    contractual: false,
    trial: { trialId: 'smoke-quad', ...SMOKE_TRIAL },
    segments: [
      {
        id: 'slot-1',
        label: 'Slot 1',
        centerAngle: 0,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.slot-1'
      },
      {
        id: 'slot-2',
        label: 'Slot 2',
        centerAngle: FULL_TURN / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.slot-2'
      },
      {
        id: 'slot-3',
        label: 'Slot 3',
        centerAngle: FULL_TURN / 2,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.slot-3'
      },
      {
        id: 'slot-4',
        label: 'Slot 4',
        centerAngle: (FULL_TURN * 3) / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.slot-4'
      }
    ]
  }),

  'smoke-triad': loadPreset({
    presetId: 'smoke-triad',
    label: 'Three segments',
    wheel: 2,
    contractual: false,
    trial: { trialId: 'smoke-triad', ...SMOKE_TRIAL },
    segments: [
      {
        id: 'slot-1',
        label: 'Slot 1',
        centerAngle: 0,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: 'smoke.slot-1'
      },
      {
        id: 'slot-2',
        label: 'Slot 2',
        centerAngle: FULL_TURN / 3,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: 'smoke.slot-2'
      },
      {
        id: 'slot-3',
        label: 'Slot 3',
        centerAngle: (FULL_TURN * 2) / 3,
        halfWidth: TRIAD_HALF_WIDTH,
        bindingId: 'smoke.slot-3'
      }
    ]
  }),

  'smoke-hex': loadPreset({
    presetId: 'smoke-hex',
    label: 'Six segments',
    wheel: 1,
    contractual: false,
    trial: { trialId: 'smoke-hex', ...SMOKE_TRIAL },
    segments: [
      {
        id: 'slot-1',
        label: 'Slot 1',
        centerAngle: 0,
        halfWidth: HEX_HALF_WIDTH,
        bindingId: 'smoke.slot-1'
      },
      {
        id: 'slot-2',
        label: 'Slot 2',
        centerAngle: FULL_TURN / 6,
        halfWidth: HEX_HALF_WIDTH,
        bindingId: 'smoke.slot-2'
      },
      {
        id: 'slot-3',
        label: 'Slot 3',
        centerAngle: FULL_TURN / 3,
        halfWidth: HEX_HALF_WIDTH,
        bindingId: 'smoke.slot-3'
      },
      {
        id: 'slot-4',
        label: 'Slot 4',
        centerAngle: FULL_TURN / 2,
        halfWidth: HEX_HALF_WIDTH,
        bindingId: 'smoke.slot-4'
      },
      {
        id: 'slot-5',
        label: 'Slot 5',
        centerAngle: (FULL_TURN * 2) / 3,
        halfWidth: HEX_HALF_WIDTH,
        bindingId: 'smoke.slot-5'
      },
      {
        id: 'slot-6',
        label: 'Slot 6',
        centerAngle: (FULL_TURN * 5) / 6,
        halfWidth: HEX_HALF_WIDTH,
        bindingId: 'smoke.slot-6'
      }
    ]
  }),

  /**
   * The awkward states, side by side with working ones: a refused binding that must stay put and
   * cancel, and an unproven one that must commit anyway (`002` §6). Putting them in a preset is
   * the only way a device trial ever sees them.
   */
  'smoke-mixed': loadPreset({
    presetId: 'smoke-mixed',
    label: 'Mixed availability',
    wheel: 2,
    contractual: false,
    trial: { trialId: 'smoke-mixed', ...SMOKE_TRIAL },
    segments: [
      {
        id: 'slot-1',
        label: 'Slot 1',
        centerAngle: 0,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.slot-1'
      },
      {
        id: 'refused',
        label: 'Refused',
        centerAngle: FULL_TURN / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.refused'
      },
      {
        id: 'unproven',
        label: 'Unproven',
        centerAngle: FULL_TURN / 2,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.unproven'
      },
      {
        id: 'absent',
        label: 'Absent',
        centerAngle: (FULL_TURN * 3) / 4,
        halfWidth: QUAD_HALF_WIDTH,
        bindingId: 'smoke.never-registered'
      }
    ]
  }),

  /** WHEEL-AC5: it must open and cancel without incident, so something has to be able to run it. */
  'smoke-empty': loadPreset({
    presetId: 'smoke-empty',
    label: 'No segments',
    wheel: 2,
    contractual: false,
    trial: { trialId: 'smoke-empty', ...SMOKE_TRIAL },
    segments: []
  })
}
