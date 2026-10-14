import type {
  ControllerIntent,
  ControllerIntentKind,
  IntentLabels
} from '../controller-input/controller-intent'
import { DECLINED, type FocusTarget } from './focus-target'
import { FOCUS_ZONES, ZONE_AGNOSTIC_INTENTS, type FocusZone } from './focus-zones'

/**
 * What the rest of the app may read about focus without owning any of it: the hint bar and the
 * zone frames subscribe to this, so a press never re-renders the surfaces it is aimed at.
 */
export type FocusSnapshot = {
  readonly zones: readonly FocusZone[]
  readonly focusedZone: FocusZone | null
  /** The next zone in the legacy ordering; directional movement uses the visual layout. */
  readonly nextZone: FocusZone | null
  /** What a press can reach from the focused zone. */
  readonly reachable: ReadonlySet<ControllerIntentKind>
  /** The wording of whichever target would answer each reachable intent. */
  readonly labels: IntentLabels
}

/**
 * The mounted focus targets and who answers an intent (`001` §7, amended by `005` USE-R2).
 *
 * An intent goes down a chain and the first target that accepts it takes it: the focused zone,
 * then the screen's own targets, then the other zones for the intents that mean the same
 * everywhere. Within each, a higher declared priority answers first and the newest mount breaks
 * a tie. Anything unaccepted along the whole chain is a no-op. Steps 1 and 2 of §7, an open
 * wheel and a live microphone, are composed above this, so the registry never learns either.
 */
export type FocusRegistry = {
  /** Returns the unregister function; calling it twice is safe. */
  readonly register: (target: FocusTarget) => () => void
  /** Seats the target first among equals and points the controller at its zone. */
  readonly activate: (id: string) => void
  /** Whoever answers first from the focused zone: the head of the chain. */
  readonly activeTarget: () => FocusTarget | null
  /** True when a target accepted and handled the intent. `switch-zone` is the registry's own. */
  readonly dispatch: (intent: ControllerIntent) => boolean
  readonly focusedZone: () => FocusZone | null
  /** The zones something has declared, in walking order. Cheaper than a snapshot, which also reads every label. */
  readonly zones: () => readonly FocusZone[]
  readonly focusZone: (zone: FocusZone) => void
  readonly cycleZone: () => FocusZone | null
  readonly subscribe: (listener: () => void) => () => void
  /** Referentially stable until something changes, so `useSyncExternalStore` can read it. */
  readonly snapshot: () => FocusSnapshot
}

type Entry = { readonly target: FocusTarget; readonly seat: number }

/** Where each zone sits on screen, in rough columns and rows, for `X`+direction. */
const ZONE_POSITION: Record<FocusZone, readonly [number, number]> = {
  list: [0, 0],
  agent: [0, 0],
  header: [0, -1],
  shortcuts: [0, 1],
  panels: [1, 0]
}

type ZoneDirection = 'up' | 'down' | 'left' | 'right'

/**
 * The nearest zone on the side the direction points to, or null. A half-plane rather than a
 * straight line, so a zone off to one side (the header above a docked panel) is still reachable.
 */
function zoneToward(
  present: readonly FocusZone[],
  current: FocusZone,
  direction: ZoneDirection
): FocusZone | null {
  const [x, y] = ZONE_POSITION[current]
  let best: FocusZone | null = null
  let bestScore = Infinity
  for (const zone of present) {
    const [otherX, otherY] = ZONE_POSITION[zone]
    const along =
      direction === 'left'
        ? x - otherX
        : direction === 'right'
          ? otherX - x
          : direction === 'up'
            ? y - otherY
            : otherY - y
    if (zone === current || along <= 0) {
      continue
    }
    const across = direction === 'left' || direction === 'right' ? otherY - y : otherX - x
    // Straight ahead beats diagonal at the same distance.
    const score = along + Math.abs(across) * 1.5
    if (score < bestScore) {
      best = zone
      bestScore = score
    }
  }
  return best
}

const ZONE_DIRECTIONS: readonly ZoneDirection[] = ['up', 'down', 'left', 'right']

function reaches(target: FocusTarget, kind: ControllerIntentKind, zone: FocusZone | null): boolean {
  return target.zone === undefined || target.zone === zone || ZONE_AGNOSTIC_INTENTS.has(kind)
}

export function createFocusRegistry(): FocusRegistry {
  const entries = new Map<string, Entry>()
  // React unregisters then registers a re-rendered target under one id; keeping its seat is what
  // stops that reading as a new mount and taking focus from whoever mounted later.
  const seats = new Map<string, number>()
  const listeners = new Set<() => void>()
  let nextSeat = 0
  let chosen: FocusZone | null = null
  let version = 0
  let cached: { readonly version: number; readonly snapshot: FocusSnapshot } | null = null
  // Recomputed only when the entries change, since every dispatch and snapshot reads it.
  let present: readonly FocusZone[] = []

  function changed(): void {
    version += 1
    for (const listener of listeners) {
      listener()
    }
  }

  function syncPresentZones(): void {
    const declared = new Set<FocusZone>()
    for (const { target } of entries.values()) {
      if (target.zone !== undefined) {
        declared.add(target.zone)
      }
    }
    present = FOCUS_ZONES.filter((zone) => declared.has(zone))
  }

  function presentZones(): readonly FocusZone[] {
    return present
  }

  function focusedZone(): FocusZone | null {
    const present = presentZones()
    // The choice outlives its zone briefly (a tab switch remounts it); the agent leads otherwise.
    return chosen !== null && present.includes(chosen) ? chosen : (present[0] ?? null)
  }

  function nextOf(present: readonly FocusZone[], current: FocusZone | null): FocusZone | null {
    if (present.length < 2 || current === null) {
      return null
    }
    return present[(present.indexOf(current) + 1) % present.length] ?? null
  }

  function ranked(zone: FocusZone | null): readonly FocusTarget[] {
    const rankOf = (target: FocusTarget): number =>
      target.zone === undefined ? 1 : target.zone === zone ? 0 : 2
    const orderOf = (target: FocusTarget): number =>
      target.zone === undefined ? -1 : FOCUS_ZONES.indexOf(target.zone)
    return [...entries.values()]
      .sort(
        (a, b) =>
          rankOf(a.target) - rankOf(b.target) ||
          (b.target.priority ?? 0) - (a.target.priority ?? 0) ||
          orderOf(a.target) - orderOf(b.target) ||
          b.seat - a.seat
      )
      .map((entry) => entry.target)
  }

  function compute(): FocusSnapshot {
    const zone = focusedZone()
    const reachable = new Set<ControllerIntentKind>()
    const labels: Partial<Record<ControllerIntentKind, string>> = {}
    for (const target of ranked(zone)) {
      for (const kind of target.accepts) {
        if (reachable.has(kind) || !reaches(target, kind, zone)) {
          continue
        }
        reachable.add(kind)
        const label = target.labels?.[kind]
        if (label !== undefined) {
          labels[kind] = label
        }
      }
    }
    const nextZone = nextOf(present, zone)
    if (
      zone !== null &&
      ZONE_DIRECTIONS.some((direction) => zoneToward(present, zone, direction) !== null)
    ) {
      reachable.add('switch-zone')
    }
    return { zones: present, focusedZone: zone, nextZone, reachable, labels }
  }

  function focusZone(zone: FocusZone): void {
    if (presentZones().includes(zone) && chosen !== zone) {
      chosen = zone
      changed()
    }
  }

  function cycleZone(): FocusZone | null {
    const next = nextOf(presentZones(), focusedZone())
    if (next === null) {
      return null
    }
    chosen = next
    changed()
    return next
  }

  function moveZone(direction: ZoneDirection): boolean {
    const current = focusedZone()
    if (current === null) {
      return false
    }
    const next = zoneToward(presentZones(), current, direction)
    if (next === null) {
      return false
    }
    focusZone(next)
    return true
  }

  function register(target: FocusTarget): () => void {
    const seat = seats.get(target.id) ?? ++nextSeat
    seats.set(target.id, seat)
    entries.set(target.id, { target, seat })
    syncPresentZones()
    changed()
    return () => {
      // A re-render replaces the entry under the same id; only delete the one we registered.
      if (entries.get(target.id)?.target !== target) {
        return
      }
      entries.delete(target.id)
      syncPresentZones()
      if (presentZones().length === 0) {
        chosen = null
      }
      // The replacement registers within this same flush; a seat nobody reclaims is released.
      queueMicrotask(() => {
        if (!entries.has(target.id)) {
          seats.delete(target.id)
        }
      })
      changed()
    }
  }

  function activate(id: string): void {
    const entry = entries.get(id)
    if (entry === undefined) {
      return
    }
    const seat = ++nextSeat
    seats.set(id, seat)
    entries.set(id, { target: entry.target, seat })
    chosen = entry.target.zone ?? chosen
    changed()
  }

  function dispatch(intent: ControllerIntent): boolean {
    if (intent.kind === 'switch-zone') {
      return intent.direction === undefined ? cycleZone() !== null : moveZone(intent.direction)
    }
    const zone = focusedZone()
    for (const target of ranked(zone)) {
      if (target.accepts.has(intent.kind) && reaches(target, intent.kind, zone)) {
        if (target.handle(intent) === DECLINED) {
          continue
        }
        return true
      }
    }
    return false
  }

  return {
    register,
    activate,
    activeTarget: () => ranked(focusedZone())[0] ?? null,
    dispatch,
    focusedZone,
    zones: presentZones,
    focusZone,
    cycleZone,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    snapshot: () => {
      if (cached === null || cached.version !== version) {
        cached = { version, snapshot: compute() }
      }
      return cached.snapshot
    }
  }
}
