import { useCallback, type RefObject } from 'react'
import type { FlatList } from 'react-native'
import { useAgentControllerBinding } from '../gamepad/bindings/use-agent-controller-binding'
import type { InterventionSurface } from '../gamepad/bindings/agent-intervention'

/**
 * The agent view's controller edge: the same intervention callbacks, stop and transcript the
 * buttons use (BIND-R5). Joins the chat's own list ref and prompt callbacks to the binding.
 * It lives here rather than in the view so the view keeps its size budget, and rather than in
 * `gamepad/` so the binding layer never learns what a `FlatList` is.
 */
export type NativeChatControllerBindingOptions<T> = InterventionSurface & {
  readonly sessionId: string
  /** The view's own prop: absent means the turn cannot be stopped. */
  readonly canStop?: boolean
  readonly onStop?: () => void
  readonly listRef: RefObject<FlatList<T> | null>
  readonly detachFromTail: () => void
}

export function useNativeChatControllerBinding<T>(
  options: NativeChatControllerBindingOptions<T>
): void {
  const { listRef, detachFromTail, ...rest } = options

  const scrollTo = useCallback(
    (offset: number) => {
      listRef.current?.scrollToOffset({ offset, animated: false })
    },
    [listRef]
  )

  useAgentControllerBinding({
    ...rest,
    canStop: rest.canStop === true,
    scrollTo,
    onDetachFromTail: detachFromTail
  })
}
