import { describe, expect, it } from 'vitest'
import { flattenSectionOrder } from './workspace-list-order'

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
})
