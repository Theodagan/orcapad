/**
 * Dictation (a tap of `Y` since `005`), and why it is not an ordinary intent.
 *
 * `001` §7 puts it at step 2, above the focused surface: a live microphone must be stoppable
 * whatever is focused, because "I am still recording" is a state the user needs a way out of that
 * does not depend on where they navigated to. (An open wheel now takes it first: `005` USE-R11.)
 *
 * Starting is not global. Dictation with nowhere to put the words is a microphone left running
 * for nothing, so the session says whether a start can land, and says so out loud when it cannot.
 * The session knows: it owns the tabs, the composer and the connection. The focus registry never
 * did, which is why a start used to depend on whichever surface happened to be focused.
 *
 * Nothing here touches the microphone. The existing `useMobileDictation` owns permission,
 * initialization, audio, the chunk budget, host start/finish/cancel, keep-awake and error state
 * (BIND-R6); this decides only whether to call the toggle the mic button already calls.
 */

export type DictationActivity = 'idle' | 'starting' | 'recording' | 'processing'

/** The mounted session's dictation, as the controller layer needs to see it. */
export type ActiveDictation = {
  readonly activity: DictationActivity
  /** The existing toggle behind the mic button, so the controller and a tap do the same thing. */
  readonly toggle: () => void
  /** Whether a start has somewhere to put the words. A stop never needs one. */
  readonly canStart: boolean
  /** Called when a start is refused, so a controller user is told why instead of left guessing. */
  readonly onUnavailable: () => void
}

export type ActiveDictationRegistry = {
  /** Returns the unregister function; the session calls it on unmount. */
  readonly register: (dictation: ActiveDictation) => () => void
  readonly current: () => ActiveDictation | null
  /** For the hint bar, which has to say "Stop" while the microphone is live. */
  readonly subscribe: (listener: () => void) => () => void
}

export function createActiveDictationRegistry(): ActiveDictationRegistry {
  let active: ActiveDictation | null = null
  const listeners = new Set<() => void>()
  const notify = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }
  return {
    register: (dictation) => {
      active = dictation
      notify()
      return () => {
        // A re-render replaces the entry; only retract the one registered here, or a stale
        // cleanup would drop the dictation that just replaced it.
        if (active === dictation) {
          active = null
          notify()
        }
      }
    },
    current: () => active,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }
  }
}

/** True once a microphone is live or on its way to being live. */
export function isDictationActive(activity: DictationActivity): boolean {
  return activity !== 'idle'
}

/**
 * Whether a press should reach the existing toggle. Separated from the provider so the rule is
 * readable on its own, and so "stop always works" is a test rather than a claim.
 */
export function shouldToggleDictation(activity: DictationActivity, canStart: boolean): boolean {
  // Stopping, cancelling a stuck start, or discarding a processing clip: always reachable.
  return isDictationActive(activity) ? true : canStart
}
