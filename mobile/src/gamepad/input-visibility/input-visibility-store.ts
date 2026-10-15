/**
 * Whether the text-entry strip of a session (the terminal's live input, the chat's composer) is on
 * screen. With a pad in hand it is hidden until wanted, because it costs a strip of height the
 * transcript could use and a pad has no use for it until words are being made (`005` round 2).
 *
 * Three modes rather than a flag, because two things can reveal it and one thing can put it away:
 * the wheel pins it open or shut, and having something in it opens it by itself. Hiding it with a
 * draft in it is the user's say, and holds until a new draft begins.
 *
 * Asking for the keyboard is a third reason, and the strongest: a field has to be on screen to take
 * focus, so the strip is up for as long as the keyboard is wanted and goes when it is not.
 */

export type InputVisibilityMode = 'auto' | 'shown' | 'hidden'

export type InputVisibilityStore = {
  readonly subscribe: (listener: () => void) => () => void
  /** Referentially a boolean, so `useSyncExternalStore` can read it directly. */
  readonly visible: () => boolean
  /** Flips what is on screen now: a shown strip is put away, a hidden one is pinned open. */
  readonly toggle: () => void
  /**
   * Each strip tells the store whether it holds anything, which is what opens it unasked. Keyed by
   * reporter, so one strip emptying or unmounting cannot clear another's draft.
   */
  readonly reportContent: (reporter: object, hasContent: boolean) => void
  /** True from a request for the keyboard until it is let go: the field in the strip should take focus. */
  readonly typing: () => boolean
  readonly beginTyping: () => void
  readonly endTyping: () => void
  /** Forgets the wheel's say and any keyboard request: they belong to the session that ended. */
  readonly reset: () => void
}

export function createInputVisibilityStore(): InputVisibilityStore {
  const listeners = new Set<() => void>()
  let mode: InputVisibilityMode = 'auto'
  const reporters = new Set<object>()
  let typing = false

  const hasContent = (): boolean => reporters.size > 0
  const resolve = (): boolean => typing || mode === 'shown' || (mode === 'auto' && hasContent())
  const notify = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }
  const notifyIfChanged = (before: boolean): void => {
    if (resolve() !== before) {
      notify()
    }
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    visible: resolve,
    toggle: () => {
      const before = resolve()
      mode = before ? 'hidden' : 'shown'
      notifyIfChanged(before)
    },
    typing: () => typing,
    // Every change of the request is told, even when the strip was up already: the field must focus.
    beginTyping: () => {
      if (!typing) {
        typing = true
        notify()
      }
    },
    endTyping: () => {
      if (typing) {
        typing = false
        notify()
      }
    },
    reportContent: (reporter, next) => {
      const before = resolve()
      // A new draft is a reason to look again, even if the last one was put away.
      if (next && !hasContent() && mode === 'hidden') {
        mode = 'auto'
      }
      if (next) {
        reporters.add(reporter)
      } else {
        reporters.delete(reporter)
      }
      notifyIfChanged(before)
    },
    reset: () => {
      const before = resolve()
      const wasTyping = typing
      mode = 'auto'
      typing = false
      if (wasTyping) {
        notify()
      } else {
        notifyIfChanged(before)
      }
    }
  }
}
