import { describe, expect, it } from 'vitest'
import { nextSelectedHostId, selectedHost } from './host-list-selection'

const hosts = [{ id: 'alpha' }, { id: 'beta' }, { id: 'gamma' }]

describe('host list selection', () => {
  it('resolves a selection against the live list', () => {
    expect(selectedHost(hosts, 'beta')).toEqual({ id: 'beta' })
    expect(selectedHost(hosts, null)).toBeNull()
  })

  // BIND-R1: the id is all we hold, so a host that goes away takes its selection with it rather
  // than leaving a stale row selected.
  it('drops a selection whose host has left the catalog', () => {
    expect(selectedHost(hosts, 'removed')).toBeNull()
    expect(nextSelectedHostId(hosts, 'removed', 'down')).toBe('alpha')
    expect(nextSelectedHostId(hosts, 'removed', 'up')).toBe('gamma')
  })

  it('moves one step at a time', () => {
    expect(nextSelectedHostId(hosts, 'alpha', 'down')).toBe('beta')
    expect(nextSelectedHostId(hosts, 'beta', 'up')).toBe('alpha')
  })

  it('clamps at both ends rather than wrapping', () => {
    expect(nextSelectedHostId(hosts, 'gamma', 'down')).toBe('gamma')
    expect(nextSelectedHostId(hosts, 'alpha', 'up')).toBe('alpha')
  })

  it('has nothing to select in an empty catalog', () => {
    expect(nextSelectedHostId([], null, 'down')).toBeNull()
    expect(selectedHost([], 'alpha')).toBeNull()
  })
})
