import { useCallback } from 'react'
import { useAgentControllerBinding } from '../gamepad/bindings/use-agent-controller-binding'
import type { InterventionSurface } from '../gamepad/bindings/agent-intervention'

/**
 * The agent view's controller edge: the same intervention callbacks, stop and transcript the
 * buttons use (BIND-R5). Joins the chat's own scroll and prompt callbacks to the binding.
 * It lives here rather than in the view so the view keeps its size budget, and rather than in
 * `gamepad/` so the binding layer never learns what a `FlatList` is.
 */
export type NativeChatControllerBindingOptions = InterventionSurface & {
  readonly sessionId: string
  /** The view's own prop: absent means the turn cannot be stopped. */
  readonly canStop?: boolean
  readonly onStop?: () => void
  /** The view's own tail-following scroll, which knows where the transcript really is. */
  readonly scrollBy: (delta: number) => void
  /** The chat's existing send; a canned reply goes out the same way a typed one does. */
  readonly onSend?: (text: string) => Promise<boolean>
  readonly canSend?: boolean
}

export function useNativeChatControllerBinding(options: NativeChatControllerBindingOptions): void {
  const { onSend, ...rest } = options

  const sendText = useCallback(
    (text: string) => {
      void onSend?.(text)
    },
    [onSend]
  )

  useAgentControllerBinding({
    ...rest,
    canStop: rest.canStop === true,
    onSendText: onSend === undefined ? undefined : sendText
  })
}
