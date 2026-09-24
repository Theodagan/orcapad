import type { SegmentAvailability } from './wheel-segment'

/**
 * What a surface contributes to the wheel: an id, how to label it, whether it can run right now,
 * and the action itself. No position and no wheel assignment — a surface says what it can do, and
 * a preset decides where that sits (`003` §1).
 *
 * The registry is a lifetime, not a table: a binding lives exactly as long as the surface that
 * registered it. When that surface unmounts the binding goes, the preset stays inspectable, and
 * the segment it named becomes unavailable (`002` §3).
 */

export type WheelActionBindingId = string

export type WheelActionBinding = {
  readonly id: WheelActionBindingId
  readonly label: string
  readonly availability: SegmentAvailability
  readonly run: () => void | Promise<void>
}

export type WheelRegistry = {
  /** Returns the unregister function; a surface calls it on unmount. */
  readonly register: (binding: WheelActionBinding) => () => void
  readonly lookup: (id: WheelActionBindingId) => WheelActionBinding | null
  readonly ids: () => readonly WheelActionBindingId[]
  readonly subscribe: (listener: () => void) => () => void
}

export function createWheelRegistry(): WheelRegistry {
  const bindings = new Map<WheelActionBindingId, WheelActionBinding>()
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    register: (binding) => {
      bindings.set(binding.id, binding)
      notify()
      return () => {
        // A re-render replaces the entry under the same id, so only retract the one registered
        // here. Otherwise a stale cleanup would unregister the binding that just replaced it.
        if (bindings.get(binding.id) !== binding) {
          return
        }
        bindings.delete(binding.id)
        notify()
      }
    },
    lookup: (id) => bindings.get(id) ?? null,
    ids: () => [...bindings.keys()],
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
