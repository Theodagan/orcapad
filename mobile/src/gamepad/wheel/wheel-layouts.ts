import { DO_ACTION_IDS, GO_ACTION_IDS } from '../bindings/wheel-action-ids'
import { loadPreset, type WheelPresetDefinition, type WheelPresetSegment } from './wheel-preset'
import type { WheelId } from './wheel-segment'

/**
 * The wheels each screen runs (`012`). The left stick is GO and the right stick is DO.
 *
 * Both are dials of six fixed 60° slots. A screen lists only the slots it has, and a missing slot
 * is a gap that holds the wheel open with nothing lit, so an action keeps its angle on every
 * screen and the thumb learns one place for it. DO exists only in a session.
 */

const FULL_TURN = Math.PI * 2
const BOUNDARY_OVERLAP = 0.001
const SLOT_COUNT = 6

/** Clockwise from twelve o'clock: slot `index` of `count` evenly spaced slots. */
export function slotAngle(index: number, count: number): number {
  return (index / count) * FULL_TURN
}

/** Half of one slot, a hair wider so neighbouring slots leave no dead seam. */
export function slotHalfWidth(count: number): number {
  return Math.min(Math.PI, FULL_TURN / (2 * count) + BOUNDARY_OVERLAP)
}

export type WheelScreen = 'home' | 'host' | 'session' | 'other'

/** The screen a pathname is, for choosing its wheels. Pure, so routing rules are testable. */
export function wheelScreenFor(pathname: string): WheelScreen {
  const path = pathname.replace(/\/+$/, '')
  if (path === '') {
    return 'home'
  }
  if (/^\/h\/[^/]+$/.test(path)) {
    return 'host'
  }
  if (/^\/h\/[^/]+\/session\/[^/]+$/.test(path)) {
    return 'session'
  }
  return 'other'
}

type Slot = {
  readonly index: number
  readonly id: string
  /** Placeholder until a surface registers the binding; the binding's own label wins. */
  readonly label: string
  readonly bindingId: string
  readonly reason?: string
}

function segmentOf(slot: Slot): WheelPresetSegment {
  return {
    id: slot.id,
    label: slot.label,
    centerAngle: slotAngle(slot.index, SLOT_COUNT),
    halfWidth: slotHalfWidth(SLOT_COUNT),
    bindingId: slot.bindingId,
    ...(slot.reason === undefined ? {} : { reason: slot.reason })
  }
}

const GO_SLOTS = {
  up: { index: 0, id: 'up', label: 'Workspaces', bindingId: GO_ACTION_IDS.up },
  new: { index: 1, id: 'new', label: 'New worktree', bindingId: GO_ACTION_IDS.new },
  files: { index: 2, id: 'files', label: 'Files', bindingId: GO_ACTION_IDS.files },
  changes: { index: 3, id: 'changes', label: 'Changes', bindingId: GO_ACTION_IDS.changes },
  history: { index: 4, id: 'history', label: 'History', bindingId: GO_ACTION_IDS.history },
  settings: { index: 5, id: 'settings', label: 'Settings', bindingId: GO_ACTION_IDS.settings }
} as const satisfies Record<string, Slot>

const DO_SLOTS: readonly Slot[] = [
  { index: 0, id: 'launch', label: 'Launch agent', bindingId: DO_ACTION_IDS.launch },
  {
    index: 1,
    id: 'stop',
    label: 'Stop agent',
    bindingId: DO_ACTION_IDS.stop,
    reason: 'No agent here'
  },
  {
    index: 2,
    id: 'keys',
    label: 'Keys',
    bindingId: DO_ACTION_IDS.keys,
    reason: 'Keys need a terminal'
  },
  { index: 3, id: 'close', label: 'Close tab', bindingId: DO_ACTION_IDS.close },
  { index: 4, id: 'keyboard', label: 'Keyboard', bindingId: DO_ACTION_IDS.keyboard },
  { index: 5, id: 'view', label: 'View', bindingId: DO_ACTION_IDS.view }
]

const GO_SLOTS_BY_SCREEN: Record<WheelScreen, readonly Slot[]> = {
  home: [GO_SLOTS.new, GO_SLOTS.settings],
  host: [GO_SLOTS.up, GO_SLOTS.new, GO_SLOTS.settings],
  session: [
    GO_SLOTS.up,
    GO_SLOTS.new,
    GO_SLOTS.files,
    GO_SLOTS.changes,
    GO_SLOTS.history,
    GO_SLOTS.settings
  ],
  other: [GO_SLOTS.up, GO_SLOTS.new, GO_SLOTS.settings]
}

const LAYOUT_TRIAL = {
  targetDevice: 'any controller-capable Android device',
  controller: 'any Android gamepad'
} as const

function goPreset(screen: WheelScreen): WheelPresetDefinition {
  return loadPreset({
    presetId: `go-${screen}`,
    label: 'Go',
    wheel: 1,
    contractual: false,
    trial: {
      trialId: 'go-do-wheels',
      ...LAYOUT_TRIAL,
      destructivePolicy: 'excludes-destructive',
      notes: 'Navigation only: every slot opens a screen the app already has.'
    },
    segments: GO_SLOTS_BY_SCREEN[screen].map(segmentOf)
  })
}

const DO_PRESET = loadPreset({
  presetId: 'do-session',
  label: 'Do',
  wheel: 2,
  contractual: false,
  trial: {
    trialId: 'go-do-wheels',
    ...LAYOUT_TRIAL,
    destructivePolicy: 'includes-destructive',
    notes:
      'Stop interrupts the agent and Close ends the tab; they sit apart so one is never a slip from the other.'
  },
  segments: DO_SLOTS.map(segmentOf)
})

export type WheelLayouts = Readonly<Partial<Record<WheelId, WheelPresetDefinition>>>

// Built once, so a screen's layouts keep their identity across renders.
const LAYOUTS: Record<WheelScreen, WheelLayouts> = {
  home: { 1: goPreset('home') },
  host: { 1: goPreset('host') },
  session: { 1: goPreset('session'), 2: DO_PRESET },
  other: { 1: goPreset('other') }
}

export function wheelLayoutsFor(screen: WheelScreen): WheelLayouts {
  return LAYOUTS[screen]
}
