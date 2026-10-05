import { describe, expect, it } from 'vitest'
import { LOADING_MENU, menuPageKey, menuSegments, parseMenuKey, type MenuView } from './wheel-menu'
import type { WheelMenuEntry } from './wheel-registry'

const entry = (id: string, availability: WheelMenuEntry['availability'] = 'available') => ({
  id,
  label: id.toUpperCase(),
  availability,
  run: () => {}
})
const ready = (count: number): MenuView => ({
  status: 'ready',
  entries: Array.from({ length: count }, (_, index) => entry(`e${index}`)),
  message: null
})

describe('menu keys', () => {
  it('names the first page as the menu itself and later ones with a suffix', () => {
    expect(menuPageKey('agent.launch', 1)).toBe('agent.launch')
    expect(menuPageKey('agent.launch', 2)).toBe('agent.launch#2')
    expect(parseMenuKey('agent.launch')).toEqual({ base: 'agent.launch', page: 1 })
    expect(parseMenuKey('agent.launch#3')).toEqual({ base: 'agent.launch', page: 3 })
  })

  it('reads a key that merely contains a hash as a menu with no page', () => {
    expect(parseMenuKey('weird#name')).toEqual({ base: 'weird#name', page: 1 })
  })
})

describe('menu segments', () => {
  it('has nothing to lock while loading, failed or empty', () => {
    expect(menuSegments('m', LOADING_MENU)).toEqual([])
    expect(menuSegments('m', { status: 'error', entries: [], message: 'x' })).toEqual([])
    expect(menuSegments('m', ready(0))).toEqual([])
  })

  it('spreads entries evenly round the dial, starting at twelve o’clock', () => {
    const segments = menuSegments('m', ready(4))

    expect(segments.map((segment) => segment.id)).toEqual(['e0', 'e1', 'e2', 'e3'])
    expect(segments.map((segment) => segment.centerAngle / (Math.PI / 2))).toEqual([0, 1, 2, 3])
  })

  it('gives each segment its own slice, with a hair of overlap so no angle is dead', () => {
    const segments = menuSegments('m', ready(5))

    for (const segment of segments) {
      expect(segment.halfWidth).toBeGreaterThan(Math.PI / 5)
      expect(segment.halfWidth).toBeLessThan(Math.PI / 5 + 0.01)
    }
  })

  it('lets one entry take the whole dial, because anywhere is that entry', () => {
    const [only] = menuSegments('m', ready(1))

    expect(only?.halfWidth).toBe(Math.PI)
  })

  it('carries each entry’s availability, so a disabled one renders and cancels', () => {
    const view: MenuView = {
      status: 'ready',
      entries: [entry('a'), entry('b', 'unavailable')],
      message: null
    }

    expect(menuSegments('m', view).map((segment) => segment.availability)).toEqual([
      'available',
      'unavailable'
    ])
  })

  it('never opens anything itself except More', () => {
    expect(menuSegments('m', ready(6)).some((segment) => segment.opens === true)).toBe(false)
  })
})

describe('menu paging', () => {
  it('keeps eight on one page', () => {
    const segments = menuSegments('m', ready(8))

    expect(segments).toHaveLength(8)
    expect(segments.some((segment) => segment.id === '__more')).toBe(false)
  })

  it('shows seven and a More that opens the next page, past eight', () => {
    const segments = menuSegments('m', ready(12))

    expect(segments).toHaveLength(8)
    expect(segments.slice(0, 7).map((segment) => segment.id)).toEqual([
      'e0',
      'e1',
      'e2',
      'e3',
      'e4',
      'e5',
      'e6'
    ])
    expect(segments[7]).toMatchObject({ id: '__more', opens: true, bindingId: 'm#2' })
  })

  it('shows the rest on the last page, with no More', () => {
    const segments = menuSegments('m#2', ready(12))

    expect(segments.map((segment) => segment.id)).toEqual(['e7', 'e8', 'e9', 'e10', 'e11'])
  })

  it('chains pages for very long lists', () => {
    const view = ready(20)

    expect(menuSegments('m#2', view)[7]).toMatchObject({ bindingId: 'm#3' })
    expect(menuSegments('m#3', view).map((segment) => segment.id)).toEqual([
      'e14',
      'e15',
      'e16',
      'e17',
      'e18',
      'e19'
    ])
  })
})
