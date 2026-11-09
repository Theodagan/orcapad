import { DO_ACTION_IDS, GO_ACTION_IDS, VIEW_ACTION_IDS } from '../bindings/wheel-action-ids'
import { loadPreset, type WheelPresetDefinition, type WheelPresetSegment } from './wheel-preset'
import type { WheelId } from './wheel-segment'

/**
 * The wheels each screen runs (`012`). The left stick is GO and the right stick is DO.
 *
 * GO is a dial of four fixed 90° slots and DO of six 60° ones. GO is the same on every screen, so
 * navigation is always there and an action keeps its angle everywhere; a slot that cannot act on a
 * screen says why. DO exists only in a session.
 */

const FULL_TURN = Math.PI * 2
const BOUNDARY_OVERLAP = 0.001
const GO_SLOT_COUNT = 4
const DO_SLOT_COUNT = 6

/** Clockwise from twelve o'clock: slot `index` of `count` evenly spaced slots. */
export function slotAngle(index: number, count: number): number {
  return (index / count) * FULL_TURN
}

/** Half of one slot, a hair wider so neighbouring slots leave no dead seam. */
export function slotHalfWidth(count: number): number {
  return Math.min(Math.PI, FULL_TURN / (2 * count) + BOUNDARY_OVERLAP)
}

export type WheelScreen = 'home' | 'host' | 'session' | 'other'

/**
 * The screen a route is, for choosing its wheels. Read from the route's file segments, not its
 * pathname: the pathname carries the raw workspace id, and Orca's ids hold `/` (`repo::/abs/path`).
 */
export function wheelScreenFor(segments: readonly string[]): WheelScreen {
  const route = segments.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
  if (route.length === 0) {
    return 'home'
  }
  if (route[0] !== 'h' || route[1] !== '[hostId]') {
    return 'other'
  }
  if (route.length === 2) {
    return 'host'
  }
  return route.length === 4 && route[2] === 'session' ? 'session' : 'other'
}

type Slot = {
  readonly index: number
  readonly id: string
  /** Placeholder until a surface registers the binding; the binding's own label wins. */
  readonly label: string
  readonly bindingId: string
  readonly reason?: string
}

function segmentOf(slot: Slot, count: number): WheelPresetSegment {
  return {
    id: slot.id,
    label: slot.label,
    centerAngle: slotAngle(slot.index, count),
    halfWidth: slotHalfWidth(count),
    bindingId: slot.bindingId,
    ...(slot.reason === undefined ? {} : { reason: slot.reason })
  }
}

// Four big slots. Pages ▸ sits right, so its half circle opens toward the middle of the screen;
// Files, Changes, History and Settings live in it, built from their own registered actions.
const GO_SLOTS: readonly Slot[] = [
  {
    index: 0,
    id: 'chat-terminal',
    label: 'Chat ⇄ Terminal',
    bindingId: VIEW_ACTION_IDS.chatTerminal
  },
  { index: 1, id: 'pages', label: 'Pages', bindingId: GO_ACTION_IDS.pages },
  { index: 2, id: 'new', label: 'New worktree', bindingId: GO_ACTION_IDS.new },
  { index: 3, id: 'back', label: 'Back', bindingId: GO_ACTION_IDS.back }
]

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
    segments: GO_SLOTS.map((slot) => segmentOf(slot, GO_SLOT_COUNT))
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
  segments: DO_SLOTS.map((slot) => segmentOf(slot, DO_SLOT_COUNT))
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
