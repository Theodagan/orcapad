import { describe, expect, it, vi } from 'vitest'
import {
  EXPLORER_WHEEL_ACTION_IDS,
  explorerWheelActions
} from '../../bindings/file-explorer-row-action'
import { HOME_WHEEL_ACTION_IDS, homeWheelActions } from '../../bindings/home-wheel-actions'
import { AGENT_REPLY_IDS, agentReplyActions } from './agent-reply-actions'
import { dispatchWheelOutcome } from '../wheel-dispatcher'
import { selectSegment } from '../wheel-geometry'
import { resolveSegments, validatePreset, type WheelPresetDefinition } from '../wheel-preset'
import { createWheelRegistry, type WheelRegistry } from '../wheel-registry'
import { CLOSED_WHEEL, reduceWheel, type WheelPreset } from '../wheel-state'
import { REAL_ACTION_PRESETS } from './real-action-presets'

const DEAD_ZONE = 0.15
const presets = Object.entries(REAL_ACTION_PRESETS)

/** Every id any surface in `003` registers. A preset may name these and nothing else. */
const REGISTERED_IDS = new Set<string>([
  ...Object.values(EXPLORER_WHEEL_ACTION_IDS),
  ...Object.values(HOME_WHEEL_ACTION_IDS),
  ...Object.values(AGENT_REPLY_IDS)
])

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

function commitSegment(
  definition: WheelPresetDefinition,
  registry: WheelRegistry,
  segmentId: string
) {
  const preset = machinePreset(definition, registry)
  const segments = preset.segmentsFor(definition.wheel)
  const segment = segments.find((entry) => entry.id === segmentId)
  if (segment === undefined) {
    throw new Error(`no segment '${segmentId}' in '${definition.presetId}'`)
  }
  const opened = reduceWheel(
    CLOSED_WHEEL,
    { kind: 'motion', wheel: definition.wheel, ...vectorAt(segment.centerAngle) },
    preset
  )
  const outcome = reduceWheel(
    opened.kind === 'state' ? opened.state : CLOSED_WHEEL,
    { kind: 'confirm' },
    preset
  )
  return { outcome, segments }
}

/** The explorer panel, mounted with a file selected. */
function explorerMounted() {
  const registry = createWheelRegistry()
  const previewSelected = vi.fn()
  const collapseAll = vi.fn()
  const reloadSelected = vi.fn()
  for (const action of explorerWheelActions({
    previewSelected,
    collapseAll,
    reloadSelected,
    hasSelection: true
  })) {
    registry.register(action)
  }
  return { registry, previewSelected, collapseAll, reloadSelected }
}

describe('real-action presets', () => {
  it.each(presets)('%s is a valid, non-contractual experiment', (_id, preset) => {
    expect(validatePreset(preset)).toEqual([])
    expect(preset.contractual).toBe(false)
  })

  // WHEEL-R7: no stop, close, forget or delete until cancel and commit pass device trials.
  it.each(presets)('%s excludes destructive actions', (_id, preset) => {
    expect(preset.trial.destructivePolicy).toBe('excludes-destructive')
    for (const segment of preset.segments) {
      expect(segment.bindingId).not.toMatch(/stop|close|forget|delete|remove|archive/i)
    }
  })

  // The point of a real-action preset: every id is one a surface actually registers, so a commit
  // reaches an existing action rather than a name nobody answers to.
  it.each(presets)('%s names only ids a surface registers', (_id, preset) => {
    for (const segment of preset.segments) {
      expect(REGISTERED_IDS.has(segment.bindingId), segment.bindingId).toBe(true)
    }
  })

  it.each(presets)('%s tiles the dial with no dead arc', (_id, preset) => {
    const segments = resolveSegments(preset, createWheelRegistry())
    for (let degree = 0; degree < 360; degree += 1) {
      const vector = vectorAt((degree * 2 * Math.PI) / 360)
      expect(selectSegment(vector.x, vector.y, segments, DEAD_ZONE).segmentId).not.toBeNull()
    }
  })

  it('names no product default', () => {
    for (const [id, preset] of presets) {
      expect(id).not.toMatch(/default|recommended/i)
      expect(preset.label).not.toMatch(/default|recommended/i)
    }
  })
})

describe('a real-action commit', () => {
  it('reaches the explorer’s own action, once', () => {
    const explorer = explorerMounted()
    const { outcome, segments } = commitSegment(
      REAL_ACTION_PRESETS['explorer-actions'],
      explorer.registry,
      'collapse'
    )

    expect(outcome.kind).toBe('commit')
    dispatchWheelOutcome(outcome, segments, (id) => void explorer.registry.lookup(id)?.run())

    expect(explorer.collapseAll).toHaveBeenCalledTimes(1)
    expect(explorer.previewSelected).not.toHaveBeenCalled()
  })

  // `002` §6, and the reason the cross-surface preset exists: off the surface that owns an
  // action, its segment stays on the wheel, renders disabled, and cancels instead of firing.
  it('cancels on a segment whose surface is not mounted', () => {
    const explorer = explorerMounted()
    const { outcome, segments } = commitSegment(
      REAL_ACTION_PRESETS['cross-surface'],
      explorer.registry,
      'pair'
    )

    expect(segments.find((segment) => segment.id === 'pair')?.availability).toBe('unavailable')
    expect(outcome).toEqual({ kind: 'cancel' })
  })

  it('keeps every segment on the wheel when only one surface is mounted', () => {
    const explorer = explorerMounted()
    const segments = resolveSegments(REAL_ACTION_PRESETS['cross-surface'], explorer.registry)

    expect(segments.map((segment) => segment.id)).toEqual(['pair', 'preview', 'collapse'])
  })

  it('reaches the home action once that surface is the mounted one', () => {
    const registry = createWheelRegistry()
    const onPairDesktop = vi.fn()
    for (const action of homeWheelActions(onPairDesktop)) {
      registry.register(action)
    }

    const { outcome, segments } = commitSegment(
      REAL_ACTION_PRESETS['cross-surface'],
      registry,
      'pair'
    )

    expect(outcome.kind).toBe('commit')
    dispatchWheelOutcome(outcome, segments, (id) => void registry.lookup(id)?.run())
    expect(onPairDesktop).toHaveBeenCalledTimes(1)
  })

  // WHEEL-R7 again, from the other side: a surface that unmounts mid-gesture takes its action
  // with it, and the lock cancels rather than invoking a binding with no owner.
  it('cancels when the surface leaves while the wheel is open', () => {
    const explorer = explorerMounted()
    const preset = REAL_ACTION_PRESETS['explorer-actions']
    const live = machinePreset(preset, explorer.registry)
    const opened = reduceWheel(
      CLOSED_WHEEL,
      { kind: 'motion', wheel: preset.wheel, ...vectorAt(0) },
      live
    )

    // The panel unmounts: a fresh registry is what the wheel now resolves against.
    const gone = machinePreset(preset, createWheelRegistry())
    const outcome = reduceWheel(
      opened.kind === 'state' ? opened.state : CLOSED_WHEEL,
      { kind: 'confirm' },
      gone
    )

    expect(outcome).toEqual({ kind: 'cancel' })
    expect(explorer.previewSelected).not.toHaveBeenCalled()
  })
})

describe('the replies preset', () => {
  // `004` LOOP-R3: this is the preset a controller-only session leans on when dictation is not
  // available, so it has to reach the chat's own send and nothing else.
  it('commits a reply through the agent view\u2019s send', () => {
    const registry = createWheelRegistry()
    const send = vi.fn()
    for (const action of agentReplyActions(send, true)) {
      registry.register(action)
    }

    const { outcome, segments } = commitSegment(
      REAL_ACTION_PRESETS['agent-replies'],
      registry,
      'continue'
    )

    expect(outcome.kind).toBe('commit')
    dispatchWheelOutcome(outcome, segments, (id) => void registry.lookup(id)?.run())
    expect(send).toHaveBeenCalledWith('Continue.')
  })

  it('cancels while the composer cannot send', () => {
    const registry = createWheelRegistry()
    for (const action of agentReplyActions(vi.fn(), false)) {
      registry.register(action)
    }

    const { outcome } = commitSegment(REAL_ACTION_PRESETS['agent-replies'], registry, 'continue')

    expect(outcome).toEqual({ kind: 'cancel' })
  })
})
