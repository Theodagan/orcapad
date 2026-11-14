import type { CollectionItem } from './collection-model'

/**
 * COL-6/SD-6: one move, two ways in. `L1`/`R1` and a swipe both answer with the same call, so the
 * pad and the finger can never disagree about which item comes next.
 */
export type CarouselDirection = 'previous' | 'next'

/** A horizontal drag has to travel this far before it counts as a swipe, not a stray thumb. */
export const CAROUSEL_SWIPE_PX = 32

export function swipeDirection(dx: number): CarouselDirection | null {
  if (dx <= -CAROUSEL_SWIPE_PX) {
    return 'next'
  }
  return dx >= CAROUSEL_SWIPE_PX ? 'previous' : null
}

/**
 * The id the selection lands on, or null when there is nothing to land on. Selection does not wrap:
 * SD-11 keeps the end of a list visible rather than jumping back to its other end.
 */
export function moveCarouselSelection(
  items: readonly CollectionItem[],
  selectedId: string | null,
  direction: CarouselDirection
): string | null {
  if (items.length === 0) {
    return null
  }
  const current = items.findIndex((item) => item.id === selectedId)
  const step = direction === 'next' ? 1 : -1
  const from = current === -1 ? (direction === 'next' ? -1 : 0) : current
  const next = items[Math.min(Math.max(from + step, 0), items.length - 1)]
  return next?.id ?? null
}
