import type { IntentLabels } from '../controller-input/controller-intent'
import type { FocusRegistry } from '../focus/focus-registry'
import { DECLINED, type FocusTarget } from '../focus/focus-target'
import { FOCUS_PRIORITY, type FocusZone } from '../focus/focus-zones'
import { moveInGrid, type GridItem } from './zone-grid'

/**
 * The items of the zones that are rows of buttons (`005` USE-R4): the header and the shortcut keys.
 * A surface says what its items are and what pressing one does; this keeps where the cursor is,
 * turns the D-pad into moving it, `A` into pressing, and `B` into going back to the agent.
 *
 * It registers one navigator with the focus registry per zone that has something to navigate, and
 * withdraws it when the last item leaves, so a zone with nothing in it does not exist for `X`.
 */

export type ZoneItemRegistration = GridItem & {
  readonly zone: FocusZone
  /** Disabled items are drawn and skipped: the cursor never lands on what cannot be pressed. */
  readonly disabled: boolean
  /** Where the cursor starts when the zone is entered afresh, e.g. the active tab. */
  readonly home: boolean
  /** What pressing it does: the same function its touch handler calls. */
  readonly activate: () => void
  /** Called when the cursor lands on it, so a strip can scroll it into view. */
  readonly reveal: () => void
}

type ZonePolicy = {
  /** `home` forgets the cursor each time the zone is entered; `last` keeps it. */
  readonly entry: 'home' | 'last'
  /** Whether the end of a row continues at the other end. */
  readonly wrap: boolean
  readonly labels: IntentLabels
}

const NAVIGATION_LABELS = { 'move-selection': 'Move', 'move-horizontal': 'Move', back: 'Agent' }

const ZONE_POLICY: Record<FocusZone, ZonePolicy> = {
  agent: { entry: 'last', wrap: false, labels: {} },
  shortcuts: { entry: 'last', wrap: true, labels: { ...NAVIGATION_LABELS, confirm: 'Press' } },
  header: { entry: 'home', wrap: false, labels: { ...NAVIGATION_LABELS, confirm: 'Open' } },
  panels: { entry: 'last', wrap: false, labels: { ...NAVIGATION_LABELS, confirm: 'Open' } }
}

export type ZoneItemStore = {
  readonly register: (item: ZoneItemRegistration) => () => void
  /** True when the pad is pointed at this zone and the cursor is on this item. */
  readonly isFocused: (zone: FocusZone, id: string) => boolean
  readonly selectedId: (zone: FocusZone) => string | null
  readonly subscribe: (listener: () => void) => () => void
}

export function createZoneItemStore(registry: FocusRegistry): ZoneItemStore {
  const items = new Map<FocusZone, Map<string, ZoneItemRegistration>>()
  const selection = new Map<FocusZone, string>()
  const navigators = new Map<FocusZone, () => void>()
  const listeners = new Set<() => void>()
  let lastFocused: FocusZone | null = null

  const enabled = (zone: FocusZone): ZoneItemRegistration[] =>
    [...(items.get(zone)?.values() ?? [])].filter((item) => !item.disabled)

  function selectedId(zone: FocusZone): string | null {
    const candidates = enabled(zone)
    const current = selection.get(zone)
    if (current !== undefined && candidates.some((item) => item.id === current)) {
      return current
    }
    const home = candidates.find((item) => item.home)
    if (home !== undefined) {
      return home.id
    }
    // No home: the first by position, which is the top-left of the zone.
    return moveInGrid(candidates, null, 'right', false)
  }

  function notify(): void {
    for (const listener of listeners) {
      listener()
    }
  }

  function navigatorFor(zone: FocusZone): FocusTarget {
    const policy = ZONE_POLICY[zone]
    const current = (): ZoneItemRegistration | undefined =>
      enabled(zone).find((item) => item.id === selectedId(zone))

    function move(direction: 'left' | 'right' | 'up' | 'down'): void {
      const next = moveInGrid(enabled(zone), selectedId(zone), direction, policy.wrap)
      if (next !== null && next !== selectedId(zone)) {
        selection.set(zone, next)
        items.get(zone)?.get(next)?.reveal()
        notify()
      }
    }

    return {
      id: `zone:${zone}`,
      zone,
      priority: FOCUS_PRIORITY.surface,
      accepts: new Set(['move-selection', 'move-horizontal', 'confirm', 'back']),
      labels: policy.labels,
      handle: (intent) => {
        if (intent.kind === 'confirm') {
          current()?.activate()
        } else if (intent.kind === 'move-selection') {
          move(intent.direction)
        } else if (intent.kind === 'move-horizontal') {
          move(intent.direction)
        } else if (intent.kind === 'back') {
          // B leaves a row of buttons for the thing they belong to. With no agent to go back to it
          // is not this zone's to answer, and falls through to leaving the screen.
          if (!registry.snapshot().zones.includes('agent')) {
            return DECLINED
          }
          registry.focusZone('agent')
        }
        return undefined
      }
    }
  }

  function syncNavigator(zone: FocusZone): void {
    const wanted = enabled(zone).length > 0
    const present = navigators.has(zone)
    if (wanted && !present) {
      navigators.set(zone, registry.register(navigatorFor(zone)))
    } else if (!wanted && present) {
      navigators.get(zone)?.()
      navigators.delete(zone)
    }
  }

  registry.subscribe(() => {
    const focused = registry.focusedZone()
    if (focused === lastFocused) {
      return
    }
    lastFocused = focused
    // A zone that starts from home starts there every time it is entered.
    if (focused !== null && ZONE_POLICY[focused].entry === 'home') {
      selection.delete(focused)
    }
    notify()
  })

  return {
    register(item) {
      const zoneItems = items.get(item.zone) ?? new Map<string, ZoneItemRegistration>()
      items.set(item.zone, zoneItems)
      zoneItems.set(item.id, item)
      syncNavigator(item.zone)
      notify()
      return () => {
        // A re-render replaces the entry under the same id; only drop the one registered here.
        if (zoneItems.get(item.id) !== item) {
          return
        }
        zoneItems.delete(item.id)
        syncNavigator(item.zone)
        notify()
      }
    },
    isFocused: (zone, id) => registry.focusedZone() === zone && selectedId(zone) === id,
    selectedId,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
