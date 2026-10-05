import { act, create } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViewToken } from 'react-native'
import { useSelectionReveal } from './use-selection-reveal'

vi.mock('react-native', () => ({}))

type Row = { readonly id: string }
type Reveal = ReturnType<typeof useSelectionReveal<Row>>

function mount(initialSelected: string | null) {
  const scrollToId = vi.fn<(id: string) => void>()
  const scrollToOffset = vi.fn()
  const handled: boolean[] = []
  let reveal: Reveal | null = null
  let setSelected: (id: string | null) => void = () => {}

  function Probe({ selectedId }: { selectedId: string | null }) {
    reveal = useSelectionReveal<Row>({
      selectedId,
      idOf: (row) => row.id,
      scrollToId,
      scrollToOffset
    })
    return null
  }

  let renderer: ReturnType<typeof create> | null = null
  act(() => {
    renderer = create(<Probe selectedId={initialSelected} />)
  })
  setSelected = (id) => {
    act(() => {
      renderer?.update(<Probe selectedId={id} />)
    })
  }

  return {
    scrollToId,
    scrollToOffset,
    select: setSelected,
    report: (...tokens: ViewToken<Row>[]) =>
      act(() => {
        reveal?.onViewableItemsChanged({ changed: tokens })
      }),
    /** The list reports a failed jump from inside the call that asked for it. */
    listCannotPlace: (index: number, averageItemLength: number) =>
      scrollToId.mockImplementation(() => {
        handled.push(reveal?.onScrollToIndexFailed({ index, averageItemLength }) ?? false)
      }),
    listCanPlace: () => scrollToId.mockReset(),
    handled: () => handled,
    failFromElsewhere: (index: number, averageItemLength: number) =>
      reveal?.onScrollToIndexFailed({ index, averageItemLength }) ?? true,
    config: () => reveal?.viewabilityConfig
  }
}

describe('revealing the controller selection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('leaves the list alone while the selection is on screen', () => {
    const list = mount('a')
    list.report(
      { item: { id: 'a' }, key: 'a', index: 0, isViewable: true },
      {
        item: { id: 'b' },
        key: 'b',
        index: 1,
        isViewable: true
      }
    )

    list.select('b')

    expect(list.scrollToId).not.toHaveBeenCalled()
  })

  it('brings a selection that moved off screen back', () => {
    const list = mount('b')
    list.report(
      { item: { id: 'a' }, key: 'a', index: 0, isViewable: true },
      {
        item: { id: 'b' },
        key: 'b',
        index: 1,
        isViewable: true
      }
    )

    list.select('c')

    expect(list.scrollToId).toHaveBeenCalledExactlyOnceWith('c')
  })

  it('forgets rows that scrolled away', () => {
    const list = mount('a')
    list.report({ item: { id: 'a' }, key: 'a', index: 0, isViewable: true })
    list.report(
      { item: { id: 'a' }, key: 'a', index: 0, isViewable: false },
      {
        item: { id: 'z' },
        key: 'z',
        index: 9,
        isViewable: true
      }
    )

    list.select('a')
    list.select(null)
    list.select('a')

    expect(list.scrollToId).toHaveBeenCalledWith('a')
  })

  it('does not scroll blind before the list has reported anything', () => {
    const list = mount(null)

    list.select('a')

    expect(list.scrollToId).not.toHaveBeenCalled()
  })

  it('does not count a section header as a row', () => {
    const list = mount(null)
    list.report({ item: { id: 'section' }, key: 'section', index: null, isViewable: true })

    list.select('section')

    expect(list.scrollToId).not.toHaveBeenCalled()
  })

  it('jumps near an unmeasured row, then retries once the list has measured', () => {
    const list = mount('a')
    list.report({ item: { id: 'a' }, key: 'a', index: 0, isViewable: true })
    list.listCannotPlace(40, 60)

    list.select('far')
    expect(list.scrollToOffset).toHaveBeenCalledExactlyOnceWith(2400)
    expect(list.handled()).toEqual([true])

    list.listCanPlace()
    act(() => {
      vi.advanceTimersByTime(120)
    })
    expect(list.scrollToId).toHaveBeenCalledExactlyOnceWith('far')
  })

  it('does not chase a selection that has moved on while the list measured', () => {
    const list = mount('a')
    list.report({ item: { id: 'a' }, key: 'a', index: 0, isViewable: true })
    list.listCannotPlace(40, 60)
    list.select('far')
    list.scrollToId.mockClear()

    list.select('a')
    act(() => {
      vi.advanceTimersByTime(120)
    })

    expect(list.scrollToId).not.toHaveBeenCalled()
  })

  it('leaves a failed jump it did not ask for to the list’s other handler', () => {
    const list = mount('a')

    expect(list.failFromElsewhere(3, 50)).toBe(false)
    expect(list.scrollToOffset).not.toHaveBeenCalled()
  })

  it('asks the list to call a row viewable only when nearly all of it shows', () => {
    expect(mount(null).config()).toEqual({ itemVisiblePercentThreshold: 95 })
  })
})
