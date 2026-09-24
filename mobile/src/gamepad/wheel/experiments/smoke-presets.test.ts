import { describe, expect, it } from 'vitest'
import { dispatchWheelOutcome } from '../wheel-dispatcher'
import { selectSegment } from '../wheel-geometry'
import { resolveSegments, validatePreset, type WheelPresetDefinition } from '../wheel-preset'
import { createWheelRegistry, type WheelRegistry } from '../wheel-registry'
import { CLOSED_WHEEL, reduceWheel, type WheelPreset } from '../wheel-state'
import { ACTIVE_SMOKE_TRIAL } from './active-smoke-trial'
import { createSmokeDiagnostics } from './smoke-diagnostic-bindings'
import { SMOKE_PRESETS } from './smoke-presets'

const DEAD_ZONE = 0.15
const presets = Object.entries(SMOKE_PRESETS)

/** A unit stick vector pointing at an angle, in the wheel's clockwise-from-noon convention. */
function vectorAt(angle: number): { readonly x: number; readonly y: number } {
  return { x: Math.sin(angle), y: -Math.cos(angle) }
}

function machinePreset(definition: WheelPresetDefinition, registry: WheelRegistry): WheelPreset {
  const segments = resolveSegments(definition, registry)
  return {
    segmentsFor: (wheel) => (wheel === definition.wheel ? segments : []),
    deadZone: DEAD_ZONE
  }
}

/** Opens the wheel pointing at one segment's centre, then presses `A`. */
function pointAndConfirm(
  definition: WheelPresetDefinition,
  registry: WheelRegistry,
  segmentId: string
) {
  const preset = machinePreset(definition, registry)
  const segment = resolveSegments(definition, registry).find((entry) => entry.id === segmentId)
  if (segment === undefined) {
    throw new Error(`no segment '${segmentId}' in '${definition.presetId}'`)
  }
  const vector = vectorAt(segment.centerAngle)
  const opened = reduceWheel(
    CLOSED_WHEEL,
    { kind: 'motion', wheel: definition.wheel, ...vector },
    preset
  )
  const outcome = reduceWheel(
    opened.kind === 'state' ? opened.state : CLOSED_WHEEL,
    { kind: 'confirm' },
    preset
  )
  return { outcome, segments: preset.segmentsFor(definition.wheel) }
}

describe('smoke presets', () => {
  it.each(presets)('%s is a valid, non-contractual experiment', (_id, preset) => {
    expect(validatePreset(preset)).toEqual([])
    expect(preset.contractual).toBe(false)
    expect(preset.trial.destructivePolicy).toBe('excludes-destructive')
  })

  // WHEEL-AC7: the presets are the experiment, so none of them may present itself as the answer.
  it('names no product default', () => {
    for (const [id, preset] of presets) {
      expect(id).not.toMatch(/default|recommended/i)
      expect(preset.label).not.toMatch(/default|recommended/i)
    }
  })

  it('offers several segment counts to try', () => {
    const counts = new Set(presets.map(([, preset]) => preset.segments.length))
    expect([...counts].sort((a, b) => a - b)).toEqual([0, 3, 4, 6])
  })

  // The angles are hand-written data, so this is the guard against a mistyped one: every segment
  // answers for its own centre, and no angle anywhere falls into a gap.
  it.each(presets.filter(([, preset]) => preset.segments.length > 0))(
    '%s tiles the dial with no dead arc',
    (_id, preset) => {
      const segments = resolveSegments(preset, createWheelRegistry())
      for (const segment of segments) {
        const centre = vectorAt(segment.centerAngle)
        expect(selectSegment(centre.x, centre.y, segments, DEAD_ZONE).segmentId).toBe(segment.id)
      }
      for (let degree = 0; degree < 360; degree += 1) {
        const vector = vectorAt((degree * 2 * Math.PI) / 360)
        expect(selectSegment(vector.x, vector.y, segments, DEAD_ZONE).segmentId).not.toBeNull()
      }
    }
  )

  // The overlap is the point: a boundary angle must land on a neighbour, not between them.
  it('hands a shared boundary to one of the two segments', () => {
    const segments = resolveSegments(SMOKE_PRESETS['smoke-hex'], createWheelRegistry())
    const boundary = vectorAt(6.283185307179586 / 12)
    expect(['slot-1', 'slot-2']).toContain(
      selectSegment(boundary.x, boundary.y, segments, DEAD_ZONE).segmentId
    )
  })

  // WHEEL-AC5.
  it('opens and cancels an empty preset without incident', () => {
    const preset = SMOKE_PRESETS['smoke-empty']
    const machine = machinePreset(preset, createWheelRegistry())
    const opened = reduceWheel(
      CLOSED_WHEEL,
      { kind: 'motion', wheel: preset.wheel, ...vectorAt(0) },
      machine
    )
    expect(opened).toEqual({
      kind: 'state',
      state: { kind: 'open', wheel: preset.wheel, locked: null }
    })
    expect(
      reduceWheel(
        opened.kind === 'state' ? opened.state : CLOSED_WHEEL,
        { kind: 'confirm' },
        machine
      )
    ).toEqual({ kind: 'cancel' })
  })
})

describe('smoke bindings under the wheel', () => {
  function armed() {
    const registry = createWheelRegistry()
    const diagnostics = createSmokeDiagnostics()
    diagnostics.register(registry)
    return { registry, diagnostics, preset: SMOKE_PRESETS['smoke-mixed'] }
  }

  it('records a run when a commit reaches an available binding', () => {
    const { registry, diagnostics, preset } = armed()
    const { outcome, segments } = pointAndConfirm(preset, registry, 'slot-1')
    expect(outcome.kind).toBe('commit')
    dispatchWheelOutcome(outcome, segments, (id) => void registry.lookup(id)?.run())
    expect(diagnostics.runs().map((run) => run.bindingId)).toEqual(['smoke.slot-1'])
  })

  // WHEEL-R7: a disabled action neither executes nor disappears during a trial.
  it('cancels on a refused binding and leaves it on the wheel', () => {
    const { registry, diagnostics, preset } = armed()
    const { outcome, segments } = pointAndConfirm(preset, registry, 'refused')
    expect(outcome).toEqual({ kind: 'cancel' })
    dispatchWheelOutcome(outcome, segments, (id) => void registry.lookup(id)?.run())
    expect(diagnostics.runs()).toEqual([])
    expect(segments.map((segment) => segment.id)).toContain('refused')
  })

  // `002` §6: an unproven affordance is still offered, and the action reports its own result.
  it('commits an unknown binding', () => {
    const { registry, diagnostics, preset } = armed()
    const { outcome, segments } = pointAndConfirm(preset, registry, 'unproven')
    expect(outcome.kind).toBe('commit')
    dispatchWheelOutcome(outcome, segments, (id) => void registry.lookup(id)?.run())
    expect(diagnostics.runs().map((run) => run.bindingId)).toEqual(['smoke.unproven'])
  })

  it('keeps a segment whose binding was never registered, and cancels on it', () => {
    const { registry, diagnostics, preset } = armed()
    const { outcome, segments } = pointAndConfirm(preset, registry, 'absent')
    expect(segments.find((segment) => segment.id === 'absent')?.availability).toBe('unavailable')
    expect(outcome).toEqual({ kind: 'cancel' })
    expect(diagnostics.runs()).toEqual([])
  })
})

describe('active smoke trial', () => {
  it('runs presets that agree about which stick they are on', () => {
    for (const [side, preset] of Object.entries(ACTIVE_SMOKE_TRIAL)) {
      expect(preset).toBeDefined()
      expect(preset?.wheel).toBe(Number(side))
      expect(preset === undefined ? null : SMOKE_PRESETS[preset.presetId]).toBe(preset)
    }
  })
})
