import { describe, expect, it } from 'vitest'
import { gridRows, moveInGrid, type GridItem } from './zone-grid'

const item = (id: string, row: number, order: number): GridItem => ({ id, row, order })

/** The header: a row of four buttons over a row of three tabs and a plus. */
const header = [
  item('back', 0, 0),
  item('files', 0, 1),
  item('git', 0, 2),
  item('more', 0, 3),
  item('tab-a', 1, 0),
  item('tab-b', 1, 1),
  item('tab-c', 1, 2),
  item('plus', 1, 3)
]

describe('grid rows', () => {
  it('sorts rows top to bottom and items along each row, whatever order they registered in', () => {
    expect(gridRows([item('b', 1, 1), item('a', 1, 0), item('top', 0, 0)])).toEqual([
      ['top'],
      ['a', 'b']
    ])
  })

  it('is empty for no items', () => {
    expect(gridRows([])).toEqual([])
  })
})

describe('moving along a row', () => {
  it('steps right and left', () => {
    expect(moveInGrid(header, 'files', 'right', false)).toBe('git')
    expect(moveInGrid(header, 'files', 'left', false)).toBe('back')
  })

  it('stops at the ends of a row that does not wrap', () => {
    expect(moveInGrid(header, 'back', 'left', false)).toBe('back')
    expect(moveInGrid(header, 'more', 'right', false)).toBe('more')
  })

  it('wraps round a row that does', () => {
    expect(moveInGrid(header, 'more', 'right', true)).toBe('back')
    expect(moveInGrid(header, 'back', 'left', true)).toBe('more')
  })

  it('stays put on a row of one, wrapping or not', () => {
    const lone = [item('only', 0, 0)]

    expect(moveInGrid(lone, 'only', 'right', true)).toBe('only')
    expect(moveInGrid(lone, 'only', 'left', false)).toBe('only')
  })
})

describe('moving between rows', () => {
  it('keeps the column going down and up', () => {
    expect(moveInGrid(header, 'git', 'down', false)).toBe('tab-c')
    expect(moveInGrid(header, 'tab-b', 'up', false)).toBe('files')
  })

  it('lands on the last item of a shorter row, rather than off the end', () => {
    const uneven = [item('a', 0, 0), item('b', 0, 1), item('c', 0, 2), item('x', 1, 0)]

    expect(moveInGrid(uneven, 'c', 'down', false)).toBe('x')
  })

  it('stays on the edge row instead of wrapping vertically', () => {
    expect(moveInGrid(header, 'back', 'up', false)).toBe('back')
    expect(moveInGrid(header, 'plus', 'down', false)).toBe('plus')
  })
})

describe('entering from nothing', () => {
  it('enters from the edge it is moving away from', () => {
    expect(moveInGrid(header, null, 'right', false)).toBe('back')
    expect(moveInGrid(header, null, 'down', false)).toBe('back')
    expect(moveInGrid(header, null, 'left', false)).toBe('plus')
    expect(moveInGrid(header, null, 'up', false)).toBe('plus')
  })

  it('enters from the edge when the selection is no longer there', () => {
    expect(moveInGrid(header, 'gone', 'right', false)).toBe('back')
  })

  it('goes nowhere with nothing to go to', () => {
    expect(moveInGrid([], null, 'right', false)).toBeNull()
  })
})
