import { useSyncExternalStore } from 'react'
import { useControllerBinding } from '../controller-provider'

export type SessionChrome = {
  /** Always false without a pad: touch users see exactly what they saw before (BIND-AC10). */
  readonly focusMode: boolean
  /** Always false without a pad. */
  readonly shortcutsHidden: boolean
  readonly toggleFocusMode: () => void
  readonly toggleShortcuts: () => void
  /** Puts both back, for the session that owns them to call when it ends. */
  readonly reset: () => void
}

/** Effective session chrome state: both flags are false when no pad is attached. */
export function useSessionChrome(): SessionChrome {
  const { connected, sessionChrome } = useControllerBinding()
  const focusModeRaw = useSyncExternalStore(
    sessionChrome.subscribe,
    sessionChrome.focusMode,
    sessionChrome.focusMode
  )
  const shortcutsHiddenRaw = useSyncExternalStore(
    sessionChrome.subscribe,
    sessionChrome.shortcutsHidden,
    sessionChrome.shortcutsHidden
  )
  return {
    focusMode: connected && focusModeRaw,
    shortcutsHidden: connected && shortcutsHiddenRaw,
    toggleFocusMode: sessionChrome.toggleFocusMode,
    toggleShortcuts: sessionChrome.toggleShortcuts,
    reset: sessionChrome.reset
  }
}
