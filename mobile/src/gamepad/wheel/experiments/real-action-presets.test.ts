import { describe, expect, it, vi } from 'vitest'
import {
  EXPLORER_WHEEL_ACTION_IDS,
  explorerWheelActions
} from '../../bindings/file-explorer-row-action'
import { HOME_WHEEL_ACTION_IDS, homeWheelActions } from '../../bindings/home-wheel-actions'
import { AGENT_WHEEL_ACTION_IDS } from '../../bindings/agent-wheel-action-ids'
import {
  NAVIGATION_WHEEL_ACTION_IDS,
  navigationWheelActions
} from '../../bindings/navigation-wheel-actions'
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
  ...Object.values(AGENT_WHEEL_ACTION_IDS),
  ...Object.values(NAVIGATION_WHEEL_ACTION_IDS)
])

const DESTRUCTIVE = /stop|close|forget|delete|remove|archive/i

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

  // WHEEL-R7: a preset that can reach a destructive action says so before it runs, and one that
  // does not say so cannot reach one.
  it.each(presets)('%s says whether it can reach a destructive action', (_id, preset) => {
    const reaches = preset.segments.some((segment) => DESTRUCTIVE.test(segment.bindingId))

    expect(preset.trial.destructivePolicy).toBe(
      reaches ? 'includes-destructive' : 'excludes-destructive'
    )
  })

  // The point of a real-action preset: every id is one a surface actually registers, so a commit
  // reaches an existing action rather than a name nobody answers to.
  it.each(presets)('%s names only ids a surface registers', (_id, preset) => {
    for (const segment of preset.segments) {
      expect(REGISTERED_IDS.has(segment.bindingId), segment.bindingId).toBe(true)
    }
  })

  // A pair of segments leaves arcs to rest the stick in on purpose; three or more tile the dial.
  it.each(presets.filter(([, preset]) => preset.segments.length >= 3))(
    '%s tiles the dial with no dead arc',
    (_id, preset) => {
      const segments = resolveSegments(preset, createWheelRegistry())
      for (let degree = 0; degree < 360; degree += 1) {
        const vector = vectorAt((degree * 2 * Math.PI) / 360)
        expect(selectSegment(vector.x, vector.y, segments, DEAD_ZONE).segmentId).not.toBeNull()
      }
    }
  )

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
    expect(outcome).toMatchObject({ kind: 'cancel' })
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

    expect(outcome).toMatchObject({ kind: 'cancel' })
    expect(explorer.previewSelected).not.toHaveBeenCalled()
  })
})

describe('the navigation wheel (005 USE-R9)', () => {
  const preset = REAL_ACTION_PRESETS.navigation

  it('is the left wheel, with four choices and no placeholders', () => {
    expect(preset.wheel).toBe(1)
    expect(preset.segments.map((segment) => segment.label)).toEqual([
      'Focus mode',
      'New worktree',
      'Shortcuts',
      'Back to menu'
    ])
    expect(preset.segments.map((segment) => segment.bindingId)).toEqual([
      NAVIGATION_WHEEL_ACTION_IDS.focusMode,
      NAVIGATION_WHEEL_ACTION_IDS.newWorktree,
      NAVIGATION_WHEEL_ACTION_IDS.shortcuts,
      NAVIGATION_WHEEL_ACTION_IDS.backToMenu
    ])
  })

  it('puts focus mode north, new worktree east, shortcuts south, back to menu west', () => {
    const segments = resolveSegments(preset, createWheelRegistry())
    const at = (degree: number) =>
      selectSegment(
        vectorAt((degree * Math.PI) / 180).x,
        vectorAt((degree * Math.PI) / 180).y,
        segments,
        DEAD_ZONE
      ).segmentId

    expect(at(0)).toBe('focus-mode')
    expect(at(90)).toBe('new-worktree')
    expect(at(180)).toBe('shortcuts')
    expect(at(270)).toBe('back-to-menu')
  })

  it('cancels on focus mode and shortcuts off a session where they are not registered', () => {
    const registry = createWheelRegistry()
    for (const action of navigationWheelActions({
      hostId: 'h1',
      atWorkspaceList: false,
      onBackToMenu: vi.fn(),
      onNewWorktree: vi.fn()
    })) {
      registry.register(action)
    }

    expect(commitSegment(preset, registry, 'focus-mode').outcome).toMatchObject({
      kind: 'cancel'
    })
    expect(commitSegment(preset, registry, 'shortcuts').outcome).toMatchObject({
      kind: 'cancel'
    })
  })

  it('reaches the navigation the app already has, once each', () => {
    const registry = createWheelRegistry()
    const onBackToMenu = vi.fn()
    const onNewWorktree = vi.fn()
    for (const action of navigationWheelActions({
      hostId: 'h1',
      atWorkspaceList: false,
      onBackToMenu,
      onNewWorktree
    })) {
      registry.register(action)
    }

    for (const id of ['back-to-menu', 'new-worktree']) {
      const { outcome, segments } = commitSegment(preset, registry, id)
      expect(outcome.kind).toBe('commit')
      dispatchWheelOutcome(outcome, segments, (binding) => void registry.lookup(binding)?.run())
    }

    expect(onBackToMenu).toHaveBeenCalledTimes(1)
    expect(onNewWorktree).toHaveBeenCalledTimes(1)
  })

  it('greys out what has no host to act on, and what would go nowhere', () => {
    const registry = createWheelRegistry()
    for (const action of navigationWheelActions({
      hostId: null,
      atWorkspaceList: false,
      onBackToMenu: vi.fn(),
      onNewWorktree: vi.fn()
    })) {
      registry.register(action)
    }
    expect(commitSegment(preset, registry, 'back-to-menu').outcome).toMatchObject({
      kind: 'cancel'
    })
    expect(commitSegment(preset, registry, 'new-worktree').outcome).toMatchObject({
      kind: 'cancel'
    })

    const onList = createWheelRegistry()
    for (const action of navigationWheelActions({
      hostId: 'h1',
      atWorkspaceList: true,
      onBackToMenu: vi.fn(),
      onNewWorktree: vi.fn()
    })) {
      onList.register(action)
    }
    expect(commitSegment(preset, onList, 'back-to-menu').outcome).toMatchObject({ kind: 'cancel' })
    expect(commitSegment(preset, onList, 'new-worktree').outcome.kind).toBe('commit')
  })
})

describe('the agent wheel (005 USE-R10)', () => {
  const preset = REAL_ACTION_PRESETS['agent-actions']

  it('is the right wheel: launch, the two toggles, stop and close, with no handoff or web page', () => {
    expect(preset.wheel).toBe(2)
    expect(preset.segments.map((segment) => segment.label)).toEqual([
      'Launch agent',
      'Chat / terminal',
      'Stop agent',
      'Show / hide input',
      'Close agent'
    ])
    expect(Object.keys(REAL_ACTION_PRESETS)).not.toContain('agent-replies')
  })

  it('declares that it can stop and close, so a trial knows before it runs (WHEEL-R7)', () => {
    expect(preset.trial.destructivePolicy).toBe('includes-destructive')
  })

  it('keeps the two destructive choices from touching each other', () => {
    const angle = (id: string) => preset.segments.find((segment) => segment.id === id)?.centerAngle
    const turnBetween = Math.abs((angle('stop') ?? 0) - (angle('close') ?? 0))
    const fifth = (Math.PI * 2) / preset.segments.length

    // A harmless choice sits between them, whichever way round the dial you go.
    expect(Math.min(turnBetween, Math.PI * 2 - turnBetween)).toBeGreaterThanOrEqual(
      fifth * 2 - 1e-9
    )
  })

  it('cancels on every segment off a session, where nothing is mounted to answer', () => {
    const registry = createWheelRegistry()

    for (const segment of preset.segments) {
      expect(commitSegment(preset, registry, segment.id).outcome, segment.id).toMatchObject({
        kind: 'cancel'
      })
    }
  })

  it('commits the stop through the binding the session registers', () => {
    const registry = createWheelRegistry()
    const run = vi.fn()
    registry.register({
      id: AGENT_WHEEL_ACTION_IDS.stop,
      label: 'Stop agent',
      availability: 'available',
      run
    })

    const { outcome, segments } = commitSegment(preset, registry, 'stop')

    expect(outcome.kind).toBe('commit')
    dispatchWheelOutcome(outcome, segments, (id) => {
      const binding = registry.lookup(id)
      if (binding !== null && 'run' in binding) {
        void binding.run()
      }
    })
    expect(run).toHaveBeenCalledTimes(1)
  })
})
