import type { ControllerIntent } from '../controller-input/controller-intent'
import type { FocusTarget } from './focus-target'

/**
 * The mounted focus targets and which one is listening. Steps 3 and 4 of the resolution order
 * in `001` §7 live here: the active target receives intents it accepts, and anything else is a
 * no-op. Steps 1 and 2 — an open wheel, and global `R3` stopping dictation — are composed
 * above this by `002` and `003`, so the registry never learns what a wheel is.
 *
 * Which target is active is provisional: the newest mount wins, and CTRL-T5 replaces that with
 * route-driven selection. The guarantee the registry does make is that an unmounted target
 * never receives an intent.
 */
export type FocusRegistry = {
  /** Returns the unregister function; calling it twice is safe. */
  readonly register: (target: FocusTarget) => () => void
  readonly activate: (id: string) => void
  readonly activeTarget: () => FocusTarget | null
  /** True when a target accepted and handled the intent. */
  readonly dispatch: (intent: ControllerIntent) => boolean
}

export function createFocusRegistry(): FocusRegistry {
  // Insertion-ordered, which is what makes "the newest mount wins" a lookup rather than a clock.
  const targets = new Map<string, FocusTarget>()
  let activeId: string | null = null

  function newestId(): string | null {
    let newest: string | null = null
    for (const id of targets.keys()) {
      newest = id
    }
    return newest
  }

  function register(target: FocusTarget): () => void {
    targets.set(target.id, target)
    if (activeId === null) {
      activeId = target.id
    }
    return () => {
      // A re-render replaces the entry under the same id; only delete the one we registered.
      if (targets.get(target.id) !== target) {
        return
      }
      targets.delete(target.id)
      if (activeId === target.id) {
        activeId = newestId()
      }
    }
  }

  function activate(id: string): void {
    if (targets.has(id)) {
      activeId = id
    }
  }

  function activeTarget(): FocusTarget | null {
    return activeId === null ? null : (targets.get(activeId) ?? null)
  }

  function dispatch(intent: ControllerIntent): boolean {
    const target = activeTarget()
    if (target === null || !target.accepts.has(intent.kind)) {
      return false
    }
    target.handle(intent)
    return true
  }

  return { register, activate, activeTarget, dispatch }
}
