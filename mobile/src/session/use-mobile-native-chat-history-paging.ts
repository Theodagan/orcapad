import { useCallback } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

/** Near the top of the transcript, page in older history. */
const EARLIER_HISTORY_TRIGGER_OFFSET = 60

export function useMobileNativeChatHistoryPaging(args: {
  hasMore?: boolean
  loadingEarlier?: boolean
  onLoadEarlier?: () => void
  readerIsScrolling: () => boolean
  recordScrollMetrics: (event: NativeScrollEvent) => void
}): {
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  loadEarlier: () => void
} {
  const { hasMore, loadingEarlier, onLoadEarlier, readerIsScrolling, recordScrollMetrics } = args
  const loadEarlier = useCallback(() => onLoadEarlier?.(), [onLoadEarlier])

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      recordScrollMetrics(e.nativeEvent)
      // Only the reader's scroll: a pin reports offsets too.
      if (
        e.nativeEvent.contentOffset.y < EARLIER_HISTORY_TRIGGER_OFFSET &&
        hasMore &&
        !loadingEarlier &&
        readerIsScrolling()
      ) {
        loadEarlier()
      }
    },
    [hasMore, loadingEarlier, loadEarlier, readerIsScrolling, recordScrollMetrics]
  )
  return { onScroll, loadEarlier }
}
