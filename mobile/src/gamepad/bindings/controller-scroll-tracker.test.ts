import { describe, expect, it, vi } from 'vitest'
import { createScrollTracker } from './controller-scroll-tracker'

function tracker(now = { at: 0 }) {
  const scrollTo = vi.fn()
  const scroller = createScrollTracker(scrollTo, () => now.at)
  scroller.record({ offset: 0, contentHeight: 1000, viewportHeight: 400 })
  return { scroller, scrollTo, now }
}

describe('scroll tracker', () => {
  it('moves relative to where the list really is, not from a remembered zero', () => {
    const { scroller, scrollTo } = tracker()
    // Pinned to the newest message: the list is at its bottom, 600 down.
    scroller.record({ offset: 600 })

    scroller.by(-48)

    expect(scrollTo).toHaveBeenCalledWith(552)
  })

  it('stops at both ends instead of asking the list to leave its content', () => {
    const { scroller, scrollTo } = tracker()

    expect(scroller.by(-100)).toEqual({ offset: 0, moved: false, atEnd: false })
    expect(scrollTo).not.toHaveBeenCalled()

    scroller.record({ offset: 590 })
    expect(scroller.by(50)).toEqual({ offset: 600, moved: true, atEnd: true })
    expect(scroller.by(50)).toEqual({ offset: 600, moved: false, atEnd: true })
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('accumulates steps taken faster than the list reports back', () => {
    const { scroller, scrollTo } = tracker()

    scroller.by(40)
    scroller.by(40)
    scroller.by(40)

    expect(scrollTo.mock.calls.map(([offset]) => offset)).toEqual([40, 80, 120])
  })

  it('ignores a stale event already in flight, then trusts the list again', () => {
    const now = { at: 1000 }
    const { scroller } = tracker(now)

    scroller.by(100)
    // An event from before our step arrives: it must not rewind us.
    now.at = 1050
    scroller.record({ offset: 40 })
    expect(scroller.metrics().offset).toBe(100)

    // Later, a finger moved the list: that is news.
    now.at = 1300
    scroller.record({ offset: 300 })
    expect(scroller.metrics().offset).toBe(300)
  })

  it('knows its size changed, and clamps to the new end', () => {
    const { scroller } = tracker()
    scroller.record({ offset: 600 })

    scroller.record({ contentHeight: 700 })

    expect(scroller.by(100)).toEqual({ offset: 300, moved: true, atEnd: true })
  })

  it('does nothing before the list has said how big it is', () => {
    const scrollTo = vi.fn()
    const scroller = createScrollTracker(scrollTo)

    expect(scroller.by(100).moved).toBe(false)
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
