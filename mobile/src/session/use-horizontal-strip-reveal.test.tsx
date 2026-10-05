import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create } from 'react-test-renderer'

vi.mock('react-native', () => ({}))

const { useHorizontalStripReveal } = await import('./use-horizontal-strip-reveal')

type Strip = ReturnType<typeof useHorizontalStripReveal>

function mountStrip(): { strip: () => Strip; scrollTo: ReturnType<typeof vi.fn> } {
  const scrollTo = vi.fn()
  const mounted: { strip: Strip | null } = { strip: null }
  function Probe() {
    const strip = useHorizontalStripReveal()
    mounted.strip = strip
    // The scroll view the strip scrolls: a host node whose ref the test answers.
    return createElement('ScrollView', { ref: strip.scrollRef })
  }
  act(() => {
    create(createElement(Probe), { createNodeMock: () => ({ scrollTo }) })
  })
  return {
    strip: () => {
      if (mounted.strip === null) {
        throw new Error('not mounted')
      }
      return mounted.strip
    },
    scrollTo
  }
}

const layout = (x: number, width: number) => ({ nativeEvent: { layout: { x, width } } })
const viewportOf = (width: number) => layout(0, width)

describe('useHorizontalStripReveal', () => {
  it('scrolls a key hidden past the right edge just far enough to show it with a margin', () => {
    const { strip, scrollTo } = mountStrip()
    strip().scrollProps.onLayout(viewportOf(300))
    strip().scrollProps.onContentSizeChange(900)
    strip().frameProps('key:esc').onLayout(layout(500, 60))

    strip().reveal('key:esc')

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ x: 272, animated: true })
  })

  it('does not nudge a key that is already in view', () => {
    const { strip, scrollTo } = mountStrip()
    strip().scrollProps.onLayout(viewportOf(300))
    strip().scrollProps.onContentSizeChange(900)
    strip().frameProps('key:tab').onLayout(layout(100, 60))

    strip().reveal('key:tab')

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('follows the real offset, so a key the user scrolled past is brought back', () => {
    const { strip, scrollTo } = mountStrip()
    strip().scrollProps.onLayout(viewportOf(300))
    strip().scrollProps.onContentSizeChange(900)
    strip().scrollProps.onScroll({ nativeEvent: { contentOffset: { x: 400 } } })
    strip().frameProps('paste').onLayout(layout(20, 50))

    strip().reveal('paste')

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ x: 8, animated: true })
  })

  it('ignores a key it has not measured yet', () => {
    const { strip, scrollTo } = mountStrip()
    strip().scrollProps.onLayout(viewportOf(300))

    strip().reveal('never-laid-out')

    expect(scrollTo).not.toHaveBeenCalled()
  })
})
