import { useSyncExternalStore } from 'react'
import type { WheelSegment } from './wheel-segment'
import { CLOSED_WHEEL, type WheelState } from './wheel-state'

/**
 * What the overlay draws, held outside React so stick motion never re-renders the tree that owns
 * the wheel. Readers subscribe; a publish that would draw the same thing is dropped.
 */

export type WheelView = {
  /** As last published: `spent` and `held` may lag, since nothing draws them. */
  readonly state: WheelState
  readonly segments: readonly WheelSegment[]
  /** Inside a menu: the wheel it opened from, drawn as the inner ring, and which slot opened it. */
  readonly parent?: {
    readonly segments: readonly WheelSegment[]
    readonly openedBindingId: string
  } | null
  /** What the open wheel is, and what to say when it has nothing to choose from yet. */
  readonly title: string | null
  readonly message: string | null
}

export type WheelViewSource = {
  readonly read: () => WheelView
  readonly subscribe: (listener: () => void) => () => void
}

export type WheelViewStore = WheelViewSource & {
  readonly publish: (view: WheelView) => void
}

export const CLOSED_VIEW: WheelView = {
  state: CLOSED_WHEEL,
  segments: [],
  title: null,
  message: null
}

function sameSegment(a: WheelSegment, b: WheelSegment): boolean {
  return (
    a.id === b.id &&
    a.label === b.label &&
    a.availability === b.availability &&
    a.opens === b.opens &&
    a.centerAngle === b.centerAngle
  )
}

export function sameWheelView(a: WheelView, b: WheelView): boolean {
  if (a.state.kind === 'closed' || b.state.kind === 'closed') {
    return a.state.kind === b.state.kind
  }
  const left = a.state
  const right = b.state
  return (
    left.wheel === right.wheel &&
    left.locked === right.locked &&
    left.path.length === right.path.length &&
    left.path.every((key, index) => key === right.path[index]) &&
    a.title === b.title &&
    a.message === b.message &&
    a.segments.length === b.segments.length &&
    a.segments.every((segment, index) => {
      const other = b.segments[index]
      return other !== undefined && sameSegment(segment, other)
    })
  )
}

export function createWheelViewStore(): WheelViewStore {
  let current = CLOSED_VIEW
  const listeners = new Set<() => void>()
  return {
    read: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    publish: (view) => {
      if (sameWheelView(current, view)) {
        return
      }
      current = view
      for (const listener of listeners) {
        listener()
      }
    }
  }
}

export function useWheelView(source: WheelViewSource): WheelView {
  return useSyncExternalStore(source.subscribe, source.read)
}

const NO_SOURCE: WheelViewSource = { read: () => CLOSED_VIEW, subscribe: () => () => {} }

/** Re-renders only when a wheel opens or closes, not as it is steered. */
export function useWheelOpen(source: WheelViewSource | undefined): boolean {
  const { subscribe, read } = source ?? NO_SOURCE
  return useSyncExternalStore(subscribe, () => read().state.kind === 'open')
}
