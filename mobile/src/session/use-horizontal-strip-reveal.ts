import { useMemo, useRef, type RefObject } from 'react'
import type { ScrollView } from 'react-native'
import { useControllerBinding } from '../gamepad/controller-provider'
import { resolveTabStripScrollOffset } from './tab-strip-scroll'

type StripFrame = { readonly x: number; readonly width: number }
/** Only what the hook reads of the events a `ScrollView` and its children emit. */
type LayoutEvent = { readonly nativeEvent: { readonly layout: StripFrame } }
type OffsetEvent = { readonly nativeEvent: { readonly contentOffset: { readonly x: number } } }

/**
 * Brings one item of a horizontally scrolling row into view when the controller's cursor lands on
 * it (`005` USE-R5), over the same offset rule the tab strip uses. Spread `scrollProps` on the
 * `ScrollView`, `frameProps(id)` on each item, and call `reveal(id)` from the item's `onReveal`.
 * Items must be direct children of the strip, so their layout is relative to its content.
 * Per-frame scroll events only flow while a pad is attached; touch-only use reads the offset once
 * a gesture settles.
 */
export function useHorizontalStripReveal(): {
  readonly scrollRef: RefObject<ScrollView | null>
  readonly scrollProps: {
    readonly onScroll: ((event: OffsetEvent) => void) | undefined
    readonly onScrollEndDrag: (event: OffsetEvent) => void
    readonly onMomentumScrollEnd: (event: OffsetEvent) => void
    readonly onLayout: (event: LayoutEvent) => void
    readonly onContentSizeChange: (width: number) => void
    readonly scrollEventThrottle: number | undefined
  }
  readonly frameProps: (id: string) => { readonly onLayout: (event: LayoutEvent) => void }
  readonly reveal: (id: string) => void
} {
  const scrollRef = useRef<ScrollView | null>(null)
  const { connected: padAttached } = useControllerBinding()
  const measuredRef = useRef({ offset: 0, viewport: 0, content: 0 })
  const framesRef = useRef(new Map<string, StripFrame>())

  return useMemo(() => {
    const measured = measuredRef.current
    const frames = framesRef.current
    const trackOffset = (event: OffsetEvent): void => {
      measured.offset = event.nativeEvent.contentOffset.x
    }

    return {
      scrollRef,
      scrollProps: {
        onScroll: padAttached ? trackOffset : undefined,
        onScrollEndDrag: trackOffset,
        onMomentumScrollEnd: trackOffset,
        onLayout: (event) => {
          measured.viewport = event.nativeEvent.layout.width
        },
        onContentSizeChange: (width) => {
          measured.content = width
        },
        scrollEventThrottle: padAttached ? 16 : undefined
      },
      frameProps: (id) => ({
        onLayout: (event) => {
          const { x, width } = event.nativeEvent.layout
          frames.set(id, { x, width })
        }
      }),
      reveal: (id) => {
        const frame = frames.get(id)
        if (frame === undefined) {
          return
        }
        const next = resolveTabStripScrollOffset({
          tabX: frame.x,
          tabWidth: frame.width,
          viewportWidth: measured.viewport,
          contentWidth: measured.content,
          currentOffset: measured.offset
        })
        if (next !== measured.offset) {
          measured.offset = next
          scrollRef.current?.scrollTo({ x: next, animated: true })
        }
      }
    }
  }, [padAttached])
}
