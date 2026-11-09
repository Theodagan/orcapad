import { DO_ACTION_IDS, VIEW_ACTION_IDS } from '../bindings/wheel-action-ids'

/**
 * Why a button's action did not run (`012`). The press is refused with a haptic and a short line,
 * because a button that silently does nothing reads as a broken pad.
 */

const REFUSALS: Readonly<Record<string, string>> = {
  [DO_ACTION_IDS.stop]: 'No agent to stop',
  [VIEW_ACTION_IDS.focusMode]: 'Focus mode needs a session'
}

export function refusalMessageFor(actionId: string): string {
  return REFUSALS[actionId] ?? 'Not available here'
}

export type ActionRefusal = { readonly message: string; readonly seq: number }

export type ActionRefusalStore = {
  readonly show: (message: string) => void
  readonly clear: (seq: number) => void
  readonly current: () => ActionRefusal | null
  readonly subscribe: (listener: () => void) => () => void
}

export function createActionRefusalStore(): ActionRefusalStore {
  let current: ActionRefusal | null = null
  let seq = 0
  const listeners = new Set<() => void>()
  const notify = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    show: (message) => {
      seq += 1
      current = { message, seq }
      notify()
    },
    // Only the refusal still showing: a newer one restarts its own timer.
    clear: (which) => {
      if (current?.seq !== which) {
        return
      }
      current = null
      notify()
    },
    current: () => current,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}
