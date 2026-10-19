import { describe, expect, it } from 'vitest'
import {
  halfCircleAngle,
  LOADING_MENU,
  menuPageKey,
  menuSegments,
  parseMenuKey,
  type MenuView
} from './wheel-menu'
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

  it('spreads entries top to bottom over the right half circle, never straight up or down', () => {
    const segments = menuSegments('m', ready(4))

    expect(segments.map((segment) => segment.id)).toEqual(['e0', 'e1', 'e2', 'e3'])
    expect(segments.map((segment) => segment.centerAngle / (Math.PI / 8))).toEqual([1, 3, 5, 7])
  })

  it('mirrors onto the left half for the right stick, still top to bottom', () => {
    const angles = menuSegments('m', ready(2), 'left').map((segment) => segment.centerAngle)

    expect(angles[0]).toBeCloseTo((7 * Math.PI) / 4)
    expect(angles[1]).toBeCloseTo((5 * Math.PI) / 4)
    expect(halfCircleAngle(0, 1, 'left')).toBeCloseTo((3 * Math.PI) / 2)
  })

  it('gives each segment its own slice of the half, with a hair of overlap', () => {
    const segments = menuSegments('m', ready(5))

    for (const segment of segments) {
      expect(segment.halfWidth).toBeGreaterThan(Math.PI / 10)
      expect(segment.halfWidth).toBeLessThan(Math.PI / 10 + 0.01)
    }
  })

  it('lets one entry take its whole half', () => {
    const [only] = menuSegments('m', ready(1))

    expect(only?.centerAngle).toBeCloseTo(Math.PI / 2)
    expect(only?.halfWidth).toBeGreaterThan(Math.PI / 2)
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
  it('keeps six on one page', () => {
    const segments = menuSegments('m', ready(6))

    expect(segments).toHaveLength(6)
    expect(segments.some((segment) => segment.id === '__more')).toBe(false)
  })

  it('shows five and a More that opens the next page, past six', () => {
    const segments = menuSegments('m', ready(12))

    expect(segments).toHaveLength(6)
    expect(segments.slice(0, 5).map((segment) => segment.id)).toEqual([
      'e0',
      'e1',
      'e2',
      'e3',
      'e4'
    ])
    expect(segments[5]).toMatchObject({ id: '__more', opens: true, bindingId: 'm#2' })
  })

  it('shows the rest on the last page, with no More', () => {
    const segments = menuSegments('m#3', ready(12))

    expect(segments.map((segment) => segment.id)).toEqual(['e10', 'e11'])
  })

  it('chains pages for very long lists', () => {
    const view = ready(20)

    expect(menuSegments('m#2', view)[5]).toMatchObject({ bindingId: 'm#3' })
    expect(menuSegments('m#4', view).map((segment) => segment.id)).toEqual([
      'e15',
      'e16',
      'e17',
      'e18',
      'e19'
    ])
  })
})
