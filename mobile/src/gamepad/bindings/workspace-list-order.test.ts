import { describe, expect, it } from 'vitest'
import {
  flattenListStops,
  flattenSectionOrder,
  nextStopId,
  sectionHeaderId
} from './workspace-list-order'

describe('workspace list order', () => {
  it('reads sections in the order they render', () => {
    const order = flattenSectionOrder([
      { data: [{ worktreeId: 'a' }, { worktreeId: 'b' }] },
      { data: [{ worktreeId: 'c' }] }
    ])

    expect(order.map((item) => item.worktreeId)).toEqual(['a', 'b', 'c'])
  })

  // BIND-AC4: a collapsed group renders no rows, so the controller must not walk through them.
  it('skips a section that is showing nothing', () => {
    const order = flattenSectionOrder([
      { data: [{ worktreeId: 'a' }] },
      { data: [] },
      { data: [{ worktreeId: 'd' }] }
    ])

    expect(order.map((item) => item.worktreeId)).toEqual(['a', 'd'])
  })

  it('has no order at all with no sections', () => {
    expect(flattenSectionOrder([])).toEqual([])
  })

  describe('stops', () => {
    const idOf = (row: { worktreeId: string }): string => row.worktreeId
    const stops = flattenListStops(
      [
        { key: 'a', title: 'Alpha', data: [{ worktreeId: 'one' }] },
        { key: 'b', title: 'Beta', data: [] },
        // No title, no header: the list draws none either.
        { key: 'c', title: '', data: [{ worktreeId: 'two' }] }
      ],
      idOf
    )

    it('puts a header before the rows of every titled section, including one showing no rows', () => {
      expect(stops.map((stop) => stop.id)).toEqual([
        sectionHeaderId('a'),
        'one',
        sectionHeaderId('b'),
        'two'
      ])
    })

    it('calls a header collapsed exactly when no rows are under it', () => {
      const collapsed = stops.flatMap((stop) =>
        stop.kind === 'header' ? [[stop.sectionKey, stop.collapsed]] : []
      )
      expect(collapsed).toEqual([
        ['a', false],
        ['b', true]
      ])
    })

    it('steps over headers when asked for workspaces only, and clamps at the ends', () => {
      expect(nextStopId(stops, 'one', 'down', 'items')).toBe('two')
      expect(nextStopId(stops, 'one', 'down', 'all')).toBe(sectionHeaderId('b'))
      expect(nextStopId(stops, 'two', 'down', 'all')).toBe('two')
      expect(nextStopId(stops, sectionHeaderId('a'), 'up', 'all')).toBe(sectionHeaderId('a'))
    })

    it('starts from the end the move came from when nothing is current', () => {
      expect(nextStopId(stops, null, 'down', 'all')).toBe(sectionHeaderId('a'))
      expect(nextStopId(stops, 'gone', 'up', 'items')).toBe('two')
      expect(nextStopId([], null, 'down', 'all')).toBeNull()
    })
  })
})
