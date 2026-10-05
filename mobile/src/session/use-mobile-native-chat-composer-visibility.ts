import {
  useInputVisibility,
  useReportInputContent
} from '../gamepad/input-visibility/use-input-visibility'

/**
 * Whether the chat composer is on screen. With a pad attached it stays away until the wheel asks
 * for it or a draft is in it (dictation fills one), and goes again once the draft is sent; a raised
 * keyboard keeps it, because someone is typing into it.
 */
export function useMobileNativeChatComposerVisibility(args: {
  hasDraft: boolean
  keyboardInset: number
}): boolean {
  const inputVisibility = useInputVisibility()
  useReportInputContent(args.hasDraft)
  return inputVisibility.visible || args.keyboardInset > 0
}
