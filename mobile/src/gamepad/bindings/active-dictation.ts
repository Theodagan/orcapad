/**
 * `R3`, and why it is not an ordinary intent.
 *
 * `001` §7 puts it at step 2, above the active focus target: a live microphone must be stoppable
 * whatever is focused, including while a wheel is open, because "I am still recording" is a state
 * the user needs a way out of that does not depend on where they navigated to.
 *
 * Starting is not global. Dictation with nowhere to put the words is a microphone left running
 * for nothing, so a start needs a focused text target — which is what `FocusTarget.textTarget`
 * has been for since CTRL-T5.
 *
 * Nothing here touches the microphone. The existing `useMobileDictation` owns permission,
 * initialization, audio, the chunk budget, host start/finish/cancel, keep-awake and error state
 * (BIND-R6); this decides only whether to call the toggle the mic button already calls.
 */

export type DictationActivity = 'idle' | 'starting' | 'recording' | 'processing'

/** The mounted session's dictation, as the controller layer needs to see it. */
export type ActiveDictation = {
  readonly activity: DictationActivity
  /** The existing toggle behind the mic button, so `R3` and a tap do the same thing. */
  readonly toggle: () => void
}

export type ActiveDictationRegistry = {
  /** Returns the unregister function; the session calls it on unmount. */
  readonly register: (dictation: ActiveDictation) => () => void
  readonly current: () => ActiveDictation | null
}

export function createActiveDictationRegistry(): ActiveDictationRegistry {
  let active: ActiveDictation | null = null
  return {
    register: (dictation) => {
      active = dictation
      return () => {
        // A re-render replaces the entry; only retract the one registered here, or a stale
        // cleanup would drop the dictation that just replaced it.
        if (active === dictation) {
          active = null
        }
      }
    },
    current: () => active
  }
}

/** True once a microphone is live or on its way to being live. */
export function isDictationActive(activity: DictationActivity): boolean {
  return activity !== 'idle'
}

/**
 * Whether `R3` should reach the existing toggle. Separated from the provider so the rule is
 * readable on its own, and so "stop always works" is a test rather than a claim.
 */
export function shouldToggleDictation(
  activity: DictationActivity,
  hasFocusedTextTarget: boolean
): boolean {
  // Stopping, cancelling a stuck start, or discarding a processing clip: always reachable.
  return isDictationActive(activity) ? true : hasFocusedTextTarget
}
