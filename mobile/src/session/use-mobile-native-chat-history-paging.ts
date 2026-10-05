import { useCallback } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

/** Near the top of the transcript, page in older history. */
const EARLIER_HISTORY_TRIGGER_OFFSET = 60

export function useMobileNativeChatHistoryPaging(args: {
  hasMore?: boolean
  loadingEarlier?: boolean
  onLoadEarlier?: () => void
  detachFromTail: () => void
  recordScrollMetrics: (event: NativeScrollEvent) => void
}): {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  loadEarlier: () => void
} {
  const { hasMore, loadingEarlier, onLoadEarlier, detachFromTail, recordScrollMetrics } = args
  const loadEarlier = useCallback(() => {
    detachFromTail()
    onLoadEarlier?.()
  }, [detachFromTail, onLoadEarlier])

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      recordScrollMetrics(e.nativeEvent)
      if (
        e.nativeEvent.contentOffset.y < EARLIER_HISTORY_TRIGGER_OFFSET &&
        hasMore &&
        !loadingEarlier
      ) {
        loadEarlier()
      }
    },
    [hasMore, loadingEarlier, loadEarlier, recordScrollMetrics]
  )
  return { onScroll, loadEarlier }
}
