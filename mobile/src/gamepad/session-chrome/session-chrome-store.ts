/**
 * Whether focus mode and the shortcut row are on, for the session screen.
 *
 * Both apply only while a pad is attached; the hook returns false for both
 * when nothing is connected (BIND-AC10: touch users see exactly what they saw).
 * State resets when the session screen unmounts and system bars are restored.
 */

export type SessionChromeStore = {
  readonly subscribe: (listener: () => void) => () => void
  readonly focusMode: () => boolean
  readonly shortcutsHidden: () => boolean
  readonly toggleFocusMode: () => void
  readonly toggleShortcuts: () => void
  readonly reset: () => void
}

export function createSessionChromeStore(): SessionChromeStore {
  const listeners = new Set<() => void>()
  let focusMode = false
  let shortcutsHidden = false

  const notify = (): void => {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    focusMode: () => focusMode,
    shortcutsHidden: () => shortcutsHidden,
    toggleFocusMode: () => {
      focusMode = !focusMode
      notify()
    },
    toggleShortcuts: () => {
      shortcutsHidden = !shortcutsHidden
      notify()
    },
    reset: () => {
      const changed = focusMode || shortcutsHidden
      focusMode = false
      shortcutsHidden = false
      if (changed) {
        notify()
      }
    }
  }
}
