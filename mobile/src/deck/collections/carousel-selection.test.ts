import { describe, expect, it } from 'vitest'
import type { CollectionItem } from './collection-model'
import { moveCarouselSelection, swipeDirection } from './carousel-selection'

const item = (id: string): CollectionItem => ({
  id,
  title: id,
  projectId: null,
  status: 'idle'
})

const items = [item('a'), item('b'), item('c')]

describe('the carousel moves', () => {
  it('carries the selection one item each way', () => {
    expect(moveCarouselSelection(items, 'b', 'next')).toBe('c')
    expect(moveCarouselSelection(items, 'b', 'previous')).toBe('a')
  })

  it('holds at the end of the list instead of wrapping (SD-11)', () => {
    expect(moveCarouselSelection(items, 'c', 'next')).toBe('c')
    expect(moveCarouselSelection(items, 'a', 'previous')).toBe('a')
  })

  it('starts from an end when nothing is selected', () => {
    expect(moveCarouselSelection(items, null, 'next')).toBe('a')
    expect(moveCarouselSelection(items, null, 'previous')).toBe('a')
  })

  it('answers null when there is nothing to move to', () => {
    expect(moveCarouselSelection([], 'a', 'next')).toBeNull()
  })

  // COL-6: the swipe and L1/R1 are one move, so a full travel in either direction agrees.
  it('turns a far enough swipe into the same move L1 and R1 make', () => {
    const left = swipeDirection(-120)
    const right = swipeDirection(120)

    expect(left).toBe('next')
    expect(right).toBe('previous')
    expect(moveCarouselSelection(items, 'b', left ?? 'next')).toBe(
      moveCarouselSelection(items, 'b', 'next')
    )
    expect(moveCarouselSelection(items, 'b', right ?? 'next')).toBe(
      moveCarouselSelection(items, 'b', 'previous')
    )
  })

  it('ignores a drag too short to be a swipe', () => {
    expect(swipeDirection(12)).toBeNull()
    expect(swipeDirection(-12)).toBeNull()
  })
})
