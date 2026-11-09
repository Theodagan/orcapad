import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { dispatchWheelOutcome } from './wheel-dispatcher'
import {
  LOADING_MENU,
  menuEntryBindingId,
  menuSegments,
  type MenuSide,
  parseMenuKey,
  type MenuView
} from './wheel-menu'
import { resolveSegments, type WheelPresetDefinition } from './wheel-preset'
import { isMenuBinding, type WheelMenuEntry, type WheelRegistry } from './wheel-registry'
import type { WheelId, WheelSegment } from './wheel-segment'
import {
  CLOSED_WHEEL,
  reduceWheel,
  stateAfter,
  type WheelEvent,
  type WheelPreset,
  type WheelState
} from './wheel-state'
import {
  CLOSED_VIEW,
  createWheelViewStore,
  type WheelView,
  type WheelViewSource
} from './wheel-view-store'

export type { WheelView, WheelViewSource } from './wheel-view-store'

/**
 * Wires controller intents into the pure machine and out to the dispatcher.
 *
 * The authoritative state is a ref, and an external view store only mirrors it for rendering.
 * That is the point rather than an optimisation: WHEEL-T5 requires that rendering never block a
 * commit, so the path from `R2` to an invoked action is synchronous and does not wait for a frame.
 * The hook itself never re-renders on stick motion; only the store's readers do, on a change.
 *
 * While a wheel is open it takes every intent (`005` USE-R11). Nothing underneath is meant to
 * react to a pad that is, for the moment, steering a menu.
 */

export type WheelController = {
  readonly view: WheelViewSource
  /** True when the wheel took the intent, so the focused surface must not also see it. */
  readonly intercept: (intent: ControllerIntent) => boolean
  /** True while a wheel owns the pad. Read per sample, so it cannot lag the state behind it. */
  readonly isOpen: () => boolean
  /** Cancels an open wheel, for a controller that went away mid-gesture. */
  readonly cancel: () => void
}

export type WheelControllerOptions = {
  /** Follows the screen. A stick whose wheel has no preset here opens nothing. */
  readonly presets: Readonly<Partial<Record<WheelId, WheelPresetDefinition>>>
  readonly registry: WheelRegistry
  readonly deadZone: number
  /** Called when a wheel opens or closes, so the native layer can stop forwarding keys beneath it. */
  readonly onOpenChange?: (open: boolean) => void
}

type SegmentsFor = WheelPreset['segmentsFor']

/** A menu opens on the side its entry sits on the base wheel: twelve to six right, six to twelve left. */
export function menuSideOfAngle(angle: number): MenuSide {
  const turn = Math.PI * 2
  const normal = ((angle % turn) + turn) % turn
  return normal < Math.PI ? 'right' : 'left'
}

/** One resolve per wheel and path for the length of one `apply`. */
function onceEach(segmentsFor: SegmentsFor): SegmentsFor {
  const resolved = new Map<string, readonly WheelSegment[]>()
  return (wheel, path) => {
    const key = `${wheel}\n${path.join('\n')}`
    const hit = resolved.get(key)
    if (hit !== undefined) {
      return hit
    }
    const segments = segmentsFor(wheel, path)
    resolved.set(key, segments)
    return segments
  }
}

export function useWheelController(options: WheelControllerOptions): WheelController {
  const { registry, deadZone } = options
  // Read per event, so a screen change swaps layouts without rebuilding `intercept`.
  const presetsRef = useRef(options.presets)
  presetsRef.current = options.presets
  const stateRef = useRef<WheelState>(CLOSED_WHEEL)
  const vectorRef = useRef<{ x: number; y: number } | null>(null)
  const menusRef = useRef(new Map<string, MenuView>())
  // Only the latest load of a menu may settle it: an older one finishing late would overwrite it.
  const loadTokensRef = useRef(new Map<string, number>())
  const onOpenChangeRef = useRef(options.onOpenChange)
  onOpenChangeRef.current = options.onOpenChange
  const [viewStore] = useState(createWheelViewStore)

  // Every page of a menu, and anything opened inside it, keeps the side of the base wheel's entry.
  const sideFor = useCallback(
    (wheel: WheelId, path: readonly string[]): MenuSide => {
      const preset = presetsRef.current[wheel]
      const entry =
        preset === undefined
          ? undefined
          : resolveSegments(preset, registry).find((segment) => segment.bindingId === path[0])
      return entry === undefined ? 'right' : menuSideOfAngle(entry.centerAngle)
    },
    [registry]
  )

  const segmentsFor = useCallback<SegmentsFor>(
    (wheel, path) => {
      const key = path.at(-1)
      if (key === undefined) {
        const preset = presetsRef.current[wheel]
        return preset === undefined ? [] : resolveSegments(preset, registry)
      }
      return menuSegments(
        key,
        menusRef.current.get(parseMenuKey(key).base) ?? LOADING_MENU,
        sideFor(wheel, path)
      )
    },
    [registry, sideFor]
  )

  const isLoading = useCallback((_wheel: WheelId, path: readonly string[]): boolean => {
    const key = path.at(-1)
    return (
      key !== undefined &&
      (menusRef.current.get(parseMenuKey(key).base) ?? LOADING_MENU).status === 'loading'
    )
  }, [])

  const runBinding = useCallback(
    (bindingId: string, path: readonly string[]) => {
      const key = path.at(-1)
      if (key !== undefined) {
        const entry = menusRef.current
          .get(parseMenuKey(key).base)
          ?.entries.find((candidate) => menuEntryBindingId(candidate.id) === bindingId)
        void entry?.run()
        return
      }
      const binding = registry.lookup(bindingId)
      if (binding !== null && !isMenuBinding(binding)) {
        void binding.run()
      }
    },
    [registry]
  )

  const describe = useCallback(
    (
      next: Extract<WheelState, { kind: 'open' }>,
      segments: readonly WheelSegment[]
    ): Pick<WheelView, 'title' | 'message'> => {
      const locked = segments.find((segment) => segment.id === next.locked)
      const reason = locked?.availability === 'unavailable' ? (locked.reason ?? null) : null
      const key = next.path.at(-1)
      if (key === undefined) {
        return { title: null, message: reason }
      }
      const { base } = parseMenuKey(key)
      const menu = menusRef.current.get(base) ?? LOADING_MENU
      const title = registry.lookup(base)?.label ?? null
      return {
        title,
        message: menu.status === 'ready' && menu.entries.length > 0 ? reason : menu.message
      }
    },
    [registry]
  )

  const publish = useCallback(
    (resolve: SegmentsFor) => {
      const current = stateRef.current
      if (current.kind === 'closed') {
        viewStore.publish(CLOSED_VIEW)
        return
      }
      const segments = resolve(current.wheel, current.path)
      const opened = current.path.at(-1)
      const parent =
        opened === undefined
          ? null
          : {
              segments: resolve(current.wheel, current.path.slice(0, -1)),
              openedBindingId: opened,
              side: sideFor(current.wheel, current.path)
            }
      viewStore.publish({ state: current, segments, parent, ...describe(current, segments) })
    },
    [viewStore, describe, sideFor]
  )

  // Declared before `apply` uses it, assigned after: opening a menu is async, and its result has
  // to re-enter the same machine so the lock follows a stick that has not moved.
  const applyRef = useRef<(event: WheelEvent) => boolean>(() => false)

  const loadMenu = useCallback(
    (key: string) => {
      const { base, page } = parseMenuKey(key)
      const binding = registry.lookup(base)
      // A later page reuses what the first one loaded.
      if (page > 1 || binding === null || !isMenuBinding(binding)) {
        return
      }
      const token = (loadTokensRef.current.get(base) ?? 0) + 1
      loadTokensRef.current.set(base, token)
      const settle = (menu: MenuView): void => {
        if (loadTokensRef.current.get(base) !== token) {
          return
        }
        menusRef.current.set(base, menu)
        const open = stateRef.current
        const vector = vectorRef.current
        if (open.kind !== 'open' || open.path.at(-1) !== key) {
          return
        }
        if (vector === null) {
          publish(segmentsFor)
          return
        }
        // Re-lock from where the stick already is, or the highlight would wait for a nudge.
        applyRef.current({ kind: 'motion', wheel: open.wheel, x: vector.x, y: vector.y })
        publish(segmentsFor)
      }
      const ready = (entries: readonly WheelMenuEntry[]): MenuView => ({
        status: 'ready',
        entries,
        message: entries.length === 0 ? 'Nothing here' : null
      })
      menusRef.current.set(base, LOADING_MENU)
      try {
        const result = binding.menu()
        if ('then' in result) {
          result.then(
            (entries) => settle(ready(entries)),
            () => settle({ status: 'error', entries: [], message: 'Could not load' })
          )
        } else {
          settle(ready(result))
        }
      } catch {
        settle({ status: 'error', entries: [], message: 'Could not load' })
      }
    },
    [registry, publish, segmentsFor]
  )

  const apply = useCallback(
    (event: WheelEvent): boolean => {
      const resolve = onceEach(segmentsFor)
      const before = stateRef.current
      const outcome = reduceWheel(before, event, { segmentsFor: resolve, deadZone, isLoading })
      const next = stateAfter(outcome)
      // Committed before any render is scheduled: the action does not wait for a frame.
      stateRef.current = next
      if (next === before) {
        // The same state draws the same view: a steady stick costs no publish at all.
        return before.kind === 'open'
      }
      if (before.kind === 'open') {
        dispatchWheelOutcome(
          outcome,
          () => resolve(before.wheel, before.path),
          (bindingId) => runBinding(bindingId, before.path)
        )
      }
      if (outcome.kind === 'descend') {
        const key = outcome.path.at(-1)
        if (key !== undefined) {
          loadMenu(key)
        }
      }
      if ((before.kind === 'open') !== (next.kind === 'open')) {
        onOpenChangeRef.current?.(next.kind === 'open')
      }
      // Reads `stateRef` back rather than trusting `next`: opening a menu may have locked already.
      publish(resolve)
      return before.kind === 'open' || next.kind === 'open'
    },
    [segmentsFor, deadZone, isLoading, runBinding, loadMenu, publish]
  )
  applyRef.current = apply

  // A binding that mounts, unmounts or changes availability under an open wheel redraws it.
  useEffect(
    () =>
      registry.subscribe(() => {
        if (stateRef.current.kind === 'open') {
          publish(segmentsFor)
        }
      }),
    [registry, publish, segmentsFor]
  )

  const intercept = useCallback(
    (intent: ControllerIntent): boolean => {
      if (intent.kind === 'wheel-motion') {
        const closed = stateRef.current
        if (
          closed.kind === 'closed' &&
          presetsRef.current[intent.wheel] === undefined &&
          !closed.spent.has(intent.wheel) &&
          Math.hypot(intent.x, intent.y) > deadZone
        ) {
          // No wheel on this screen for that stick: swallowed, and nothing opens.
          return true
        }
        vectorRef.current = intent.x === 0 && intent.y === 0 ? null : { x: intent.x, y: intent.y }
        // Always the wheel's to handle: no surface has a meaning for raw stick motion.
        apply({ kind: 'motion', wheel: intent.wheel, x: intent.x, y: intent.y })
        return true
      }
      if (stateRef.current.kind !== 'open') {
        // Closed: everything belongs to the focused surface (`001` §7).
        return false
      }
      // Open: `R2` and `L2` steer the wheel (decision 007), arriving here as `confirm` and `back`;
      // every other control is swallowed rather than let through to the screen underneath.
      if (intent.kind === 'confirm') {
        apply({ kind: 'confirm' })
      } else if (intent.kind === 'back') {
        apply({ kind: 'back' })
      }
      return true
    },
    [apply, deadZone]
  )

  const isOpen = useCallback((): boolean => stateRef.current.kind === 'open', [])

  const cancel = useCallback(() => {
    if (stateRef.current.kind === 'open') {
      apply({ kind: 'disconnect' })
    }
  }, [apply])

  useEffect(
    () => () => {
      // A wheel left open by an unmount must not leave the native layer swallowing the pad.
      if (stateRef.current.kind === 'open') {
        onOpenChangeRef.current?.(false)
      }
    },
    []
  )

  return useMemo(
    () => ({ view: viewStore, intercept, isOpen, cancel }),
    [viewStore, intercept, isOpen, cancel]
  )
}
