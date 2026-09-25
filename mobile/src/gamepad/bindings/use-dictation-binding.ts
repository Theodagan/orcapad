import { useEffect, useMemo } from 'react'
import { useControllerBinding } from '../controller-provider'
import type { ActiveDictation, DictationActivity } from './active-dictation'

/**
 * Hands the session's existing dictation to the controller layer for as long as it is mounted.
 *
 * It registers rather than being dispatched to, because `R3` is step 2 of `001` §7 — above the
 * focused surface — so a live microphone can be stopped from anywhere, including a screen that
 * knows nothing about dictation. The toggle is the one the mic button calls, so `R3` and a tap
 * cannot drift apart (BIND-AC3, BIND-AC6).
 */
export function useDictationBinding(options: {
  readonly activity: DictationActivity
  readonly toggle: () => void
}): void {
  const { activity, toggle } = options
  const { registerActiveDictation } = useControllerBinding()

  const dictation = useMemo<ActiveDictation>(() => ({ activity, toggle }), [activity, toggle])

  useEffect(() => registerActiveDictation(dictation), [registerActiveDictation, dictation])
}
