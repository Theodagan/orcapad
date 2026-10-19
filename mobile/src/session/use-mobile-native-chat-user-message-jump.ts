import { useCallback, useMemo, useRef, type RefObject } from 'react'
import type { FlatList, ViewToken } from 'react-native'
import { userMessageJumpTarget } from './native-chat-user-message-jump'

/** A second pull this soon steps on from the last target, which the list may not have reached. */
const LANDING_MS = 700
const VIEWABILITY = { itemVisiblePercentThreshold: 10 }

/** X+L2/R2 in the chat: steps between the user's own messages (see `userMessageJumpTarget`). */
export function useMobileNativeChatUserMessageJump<TItem extends { readonly role: string }>(args: {
  readonly listRef: RefObject<FlatList<TItem> | null>
  readonly rows: readonly TItem[]
  readonly leaveTail: () => void
  readonly jumpToTail: () => void
}) {
  const live = useRef(args)
  live.current = args
  const topRef = useRef<number | null>(null)
  const landingRef = useRef<{ index: number; at: number } | null>(null)

  const jump = useCallback((direction: 'previous' | 'next') => {
    const { listRef, rows, leaveTail, jumpToTail } = live.current
    const landing = landingRef.current
    const from =
      landing !== null && Date.now() - landing.at < LANDING_MS
        ? landing.index
        : (topRef.current ?? rows.length)
    const target = userMessageJumpTarget(rows, from, direction)
    if (target === null) {
      return
    }
    if (target === 'tail') {
      landingRef.current = null
      jumpToTail()
      return
    }
    leaveTail()
    landingRef.current = { index: target, at: Date.now() }
    listRef.current?.scrollToIndex({ index: target, viewPosition: 0, animated: true })
  }, [])

  const listProps = useMemo(
    () => ({
      viewabilityConfig: VIEWABILITY,
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken<TItem>[] }) => {
        const indexes = viewableItems.flatMap((token) =>
          token.index === null ? [] : [token.index]
        )
        topRef.current = indexes.length === 0 ? null : Math.min(...indexes)
      },
      // Rows not yet drawn have no offset: get near by the average, then aim again.
      onScrollToIndexFailed: (info: { index: number; averageItemLength: number }) => {
        const list = live.current.listRef.current
        list?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false })
        setTimeout(() => {
          list?.scrollToIndex({ index: info.index, viewPosition: 0, animated: true })
        }, 50)
      }
    }),
    []
  )

  return { jump, listProps }
}
