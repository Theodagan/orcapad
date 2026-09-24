import { describe, expect, it } from 'vitest'
import { nextSelectedId, selectedItem } from './list-selection'

const hosts = [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma' }]
const byId = (host: { id: string }): string => host.id

describe('list selection', () => {
  it('resolves a selection against the live list', () => {
    expect(selectedItem(hosts, byId, 'beta')).toEqual({ id: 'beta' })
    expect(selectedItem(hosts, byId, null)).toBeNull()
  })

  // BIND-R1: the id is all we hold, so a host that goes away takes its selection with it rather
  // than leaving a stale row selected.
  it('drops a selection whose host has left the catalog', () => {
    expect(selectedItem(hosts, byId, 'removed')).toBeNull()
    expect(nextSelectedId(hosts, byId, 'removed', 'down')).toBe('alpha')
    expect(nextSelectedId(hosts, byId, 'removed', 'up')).toBe('gamma')
  })

  it('moves one step at a time', () => {
    expect(nextSelectedId(hosts, byId, 'alpha', 'down')).toBe('beta')
    expect(nextSelectedId(hosts, byId, 'beta', 'up')).toBe('alpha')
  })

  it('clamps at both ends rather than wrapping', () => {
    expect(nextSelectedId(hosts, byId, 'gamma', 'down')).toBe('gamma')
    expect(nextSelectedId(hosts, byId, 'alpha', 'up')).toBe('alpha')
  })

  it('has nothing to select in an empty catalog', () => {
    expect(nextSelectedId([], byId, null, 'down')).toBeNull()
    expect(selectedItem([], byId, 'alpha')).toBeNull()
  })
})
