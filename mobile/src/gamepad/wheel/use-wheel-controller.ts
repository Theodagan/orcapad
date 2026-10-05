import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { dispatchWheelOutcome } from './wheel-dispatcher'
import {
  LOADING_MENU,
  menuEntryBindingId,
  menuSegments,
  parseMenuKey,
  type MenuView
} from './wheel-menu'
import { resolveSegments, type WheelPresetDefinition } from './wheel-preset'
import { isMenuBinding, type WheelMenuEntry, type WheelRegistry } from './wheel-registry'
import type { WheelId, WheelSegment } from './wheel-segment'
import { CLOSED_WHEEL, reduceWheel, stateAfter, type WheelState } from './wheel-state'

/**
 * Wires controller intents into the pure machine and out to the dispatcher.
 *
 * The authoritative state is a ref, and React state only mirrors it for rendering. That is the
 * point rather than an optimisation: WHEEL-T5 requires that rendering never block a commit, so
 * the path from `A` to an invoked action is synchronous and does not wait for a frame. A slow or
 * suspended render delays the highlight, never the action.
 *
 * While a wheel is open it takes every intent (`005` USE-R11). Nothing underneath is meant to
 * react to a pad that is, for the moment, steering a menu.
 */

export type WheelView = {
  readonly state: WheelState
  readonly segments: readonly WheelSegment[]
  /** The live stick vector, for the needle. Null whenever no wheel is open. */
  readonly vector: { readonly x: number; readonly y: number } | null
  /** What the open wheel is, and what to say when it has nothing to choose from yet. */
  readonly title: string | null
  readonly message: string | null
}

export type WheelController = {
  readonly view: WheelView
  /** True when the wheel took the intent, so the focused surface must not also see it. */
  readonly intercept: (intent: ControllerIntent) => boolean
  /** True while a wheel owns the pad. Read per sample, so it cannot lag the state behind it. */
  readonly isOpen: () => boolean
  /** Cancels an open wheel, for a controller that went away mid-gesture. */
  readonly cancel: () => void
}

export type WheelControllerOptions = {
  /** A wheel with no preset still opens; it simply has nothing to lock (`002` §6). */
  readonly presets: Readonly<Partial<Record<WheelId, WheelPresetDefinition>>>
  readonly registry: WheelRegistry
  readonly deadZone: number
  /** Called when a wheel opens or closes, so the native layer can stop forwarding keys beneath it. */
  readonly onOpenChange?: (open: boolean) => void
}

const CLOSED_VIEW: WheelView = {
  state: CLOSED_WHEEL,
  segments: [],
  vector: null,
  title: null,
  message: null
}

export function useWheelController(options: WheelControllerOptions): WheelController {
  const { presets, registry, deadZone } = options
  const stateRef = useRef<WheelState>(CLOSED_WHEEL)
  const vectorRef = useRef<{ x: number; y: number } | null>(null)
  const menusRef = useRef(new Map<string, MenuView>())
  const onOpenChangeRef = useRef(options.onOpenChange)
  onOpenChangeRef.current = options.onOpenChange
  const [view, setView] = useState<WheelView>(CLOSED_VIEW)

  const segmentsFor = useCallback(
    (wheel: WheelId, path: readonly string[]): readonly WheelSegment[] => {
      const key = path.at(-1)
      if (key === undefined) {
        const preset = presets[wheel]
        return preset === undefined ? [] : resolveSegments(preset, registry)
      }
      return menuSegments(key, menusRef.current.get(parseMenuKey(key).base) ?? LOADING_MENU)
    },
    [presets, registry]
  )

  const preset = useMemo(() => ({ segmentsFor, deadZone }), [segmentsFor, deadZone])

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
    (next: Extract<WheelState, { kind: 'open' }>): Pick<WheelView, 'title' | 'message'> => {
      const key = next.path.at(-1)
      if (key === undefined) {
        return { title: null, message: null }
      }
      const { base } = parseMenuKey(key)
      const menu = menusRef.current.get(base) ?? LOADING_MENU
      const title = registry.lookup(base)?.label ?? null
      return {
        title,
        message: menu.status === 'ready' && menu.entries.length > 0 ? null : menu.message
      }
    },
    [registry]
  )

  // Declared before `apply` uses it, assigned after: opening a menu is async, and its result has
  // to re-enter the same machine so the lock follows a stick that has not moved.
  const applyRef = useRef<(event: Parameters<typeof reduceWheel>[1]) => boolean>(() => false)

  const loadMenu = useCallback(
    (key: string) => {
      const { base, page } = parseMenuKey(key)
      const binding = registry.lookup(base)
      // A later page reuses what the first one loaded.
      if (page > 1 || binding === null || !isMenuBinding(binding)) {
        return
      }
      const settle = (menu: MenuView): void => {
        menusRef.current.set(base, menu)
        const open = stateRef.current
        const vector = vectorRef.current
        if (open.kind === 'open' && open.path.at(-1) === key && vector !== null) {
          // Re-lock from where the stick already is, or the highlight would wait for a nudge.
          applyRef.current({ kind: 'motion', wheel: open.wheel, x: vector.x, y: vector.y })
        }
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
    [registry]
  )

  const apply = useCallback(
    (event: Parameters<typeof reduceWheel>[1]): boolean => {
      const before = stateRef.current
      const outcome = reduceWheel(before, event, preset)
      const next = stateAfter(outcome)
      // Committed before any render is scheduled: the action does not wait for a frame.
      stateRef.current = next
      if (before.kind === 'open') {
        dispatchWheelOutcome(outcome, segmentsFor(before.wheel, before.path), (bindingId) =>
          runBinding(bindingId, before.path)
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

      // Read back rather than trusting `next`: opening a menu may have locked a segment already.
      const current = stateRef.current
      setView(
        current.kind === 'closed'
          ? CLOSED_VIEW
          : {
              state: current,
              segments: segmentsFor(current.wheel, current.path),
              vector: vectorRef.current,
              ...describe(current)
            }
      )
      return before.kind === 'open' || next.kind === 'open'
    },
    [preset, segmentsFor, runBinding, loadMenu, describe]
  )
  applyRef.current = apply

  const intercept = useCallback(
    (intent: ControllerIntent): boolean => {
      if (intent.kind === 'wheel-motion') {
        vectorRef.current = intent.x === 0 && intent.y === 0 ? null : { x: intent.x, y: intent.y }
        // Always the wheel's to handle: no surface has a meaning for raw stick motion.
        apply({ kind: 'motion', wheel: intent.wheel, x: intent.x, y: intent.y })
        return true
      }
      if (stateRef.current.kind !== 'open') {
        // Closed: everything belongs to the focused surface (`001` §7).
        return false
      }
      // Open: `A` and `B` steer the wheel, and every other control is swallowed rather than let
      // through to the screen underneath.
      if (intent.kind === 'confirm') {
        apply({ kind: 'confirm' })
      } else if (intent.kind === 'back') {
        apply({ kind: 'back' })
      }
      return true
    },
    [apply]
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

  return { view, intercept, isOpen, cancel }
}
