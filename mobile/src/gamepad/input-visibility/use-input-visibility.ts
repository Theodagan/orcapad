import { useEffect, useSyncExternalStore } from 'react'
import { useControllerBinding } from '../controller-provider'

export type InputVisibility = {
  /** Always true without a pad attached: a touch user sees the screen exactly as it was. */
  readonly visible: boolean
  readonly toggle: () => void
  /** The keyboard has been asked for and not yet let go: the field in the strip should take focus. */
  readonly typing: boolean
  readonly beginTyping: () => void
  readonly endTyping: () => void
}

/** What a session reads to decide whether to draw its text-entry strip. */
export function useInputVisibility(): InputVisibility {
  const { connected, inputVisibility } = useControllerBinding()
  const shown = useSyncExternalStore(
    inputVisibility.subscribe,
    inputVisibility.visible,
    inputVisibility.visible
  )
  const typing = useSyncExternalStore(
    inputVisibility.subscribe,
    inputVisibility.typing,
    inputVisibility.typing
  )
  return {
    visible: !connected || shown,
    toggle: inputVisibility.toggle,
    typing,
    beginTyping: inputVisibility.beginTyping,
    endTyping: inputVisibility.endTyping
  }
}

/** A strip with something in it says so, so the store can open it unasked and close it after. */
export function useReportInputContent(hasContent: boolean): void {
  const { inputVisibility } = useControllerBinding()
  const { reportContent } = inputVisibility
  useEffect(() => {
    reportContent(hasContent)
  }, [hasContent, reportContent])
  useEffect(() => () => reportContent(false), [reportContent])
}
