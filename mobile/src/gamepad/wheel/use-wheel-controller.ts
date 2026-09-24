import { useCallback, useMemo, useRef, useState } from 'react'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { dispatchWheelOutcome } from './wheel-dispatcher'
import { resolveSegments, type WheelPresetDefinition } from './wheel-preset'
import type { WheelRegistry } from './wheel-registry'
import type { WheelId, WheelSegment } from './wheel-segment'
import { CLOSED_WHEEL, reduceWheel, stateAfter, type WheelState } from './wheel-state'

/**
 * Wires controller intents into the pure machine and out to the dispatcher.
 *
 * The authoritative state is a ref, and React state only mirrors it for rendering. That is the
 * point rather than an optimisation: WHEEL-T5 requires that rendering never block a commit, so
 * the path from `A` to an invoked action is synchronous and does not wait for a frame. A slow or
 * suspended render delays the highlight, never the action.
 */

export type WheelView = {
  readonly state: WheelState
  readonly segments: readonly WheelSegment[]
  /** The live stick vector, for the needle. Null whenever no wheel is open. */
  readonly vector: { readonly x: number; readonly y: number } | null
}

export type WheelController = {
  readonly view: WheelView
  /** True when the wheel took the intent, so the focused surface must not also see it. */
  readonly intercept: (intent: ControllerIntent) => boolean
  /** Cancels an open wheel, for a controller that went away mid-gesture. */
  readonly cancel: () => void
}

export type WheelControllerOptions = {
  /** A wheel with no preset still opens; it simply has nothing to lock (`002` §6). */
  readonly presets: Readonly<Partial<Record<WheelId, WheelPresetDefinition>>>
  readonly registry: WheelRegistry
  readonly deadZone: number
}

const CLOSED_VIEW: WheelView = { state: CLOSED_WHEEL, segments: [], vector: null }

export function useWheelController(options: WheelControllerOptions): WheelController {
  const { presets, registry, deadZone } = options
  const stateRef = useRef<WheelState>(CLOSED_WHEEL)
  const [view, setView] = useState<WheelView>(CLOSED_VIEW)

  const segmentsFor = useCallback(
    (wheel: WheelId): readonly WheelSegment[] => {
      const preset = presets[wheel]
      return preset === undefined ? [] : resolveSegments(preset, registry)
    },
    [presets, registry]
  )

  const preset = useMemo(() => ({ segmentsFor, deadZone }), [segmentsFor, deadZone])

  const apply = useCallback(
    (event: Parameters<typeof reduceWheel>[1], vector: WheelView['vector']): boolean => {
      const before = stateRef.current
      const outcome = reduceWheel(before, event, preset)
      const next = stateAfter(outcome)
      // Committed before any render is scheduled: the action does not wait for a frame.
      stateRef.current = next
      const wheel = next.kind === 'open' ? next.wheel : before.kind === 'open' ? before.wheel : 1
      dispatchWheelOutcome(outcome, segmentsFor(wheel), (bindingId) => {
        void registry.lookup(bindingId)?.run()
      })

      setView(
        next.kind === 'closed'
          ? CLOSED_VIEW
          : { state: next, segments: segmentsFor(next.wheel), vector }
      )
      return before.kind === 'open' || next.kind === 'open'
    },
    [preset, registry, segmentsFor]
  )

  const intercept = useCallback(
    (intent: ControllerIntent): boolean => {
      if (intent.kind === 'wheel-motion') {
        // Always the wheel's to handle: no surface has a meaning for raw stick motion.
        apply(
          { kind: 'motion', wheel: intent.wheel, x: intent.x, y: intent.y },
          {
            x: intent.x,
            y: intent.y
          }
        )
        return true
      }
      if (stateRef.current.kind !== 'open') {
        // Closed: `A` and `B` belong to the focused surface (`001` §7).
        return false
      }
      if (intent.kind === 'confirm') {
        return apply({ kind: 'confirm' }, null)
      }
      if (intent.kind === 'back') {
        return apply({ kind: 'back' }, null)
      }
      return false
    },
    [apply]
  )

  const cancel = useCallback(() => {
    if (stateRef.current.kind === 'open') {
      apply({ kind: 'disconnect' }, null)
    }
  }, [apply])

  return { view, intercept, cancel }
}
