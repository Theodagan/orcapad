/**
 * Moving a cursor over the items of a zone. Items sit in rows, in order along each row: the header
 * is a row of buttons over a row of tabs, the shortcuts are one row of keys. Pure, so the rules a
 * thumb depends on (where up from a short row lands, whether the end wraps) are tested rather than
 * remembered.
 */

export type GridItem = {
  readonly id: string
  readonly row: number
  readonly order: number
}

export type GridDirection = 'left' | 'right' | 'up' | 'down'

export function gridRows(items: readonly GridItem[]): readonly (readonly string[])[] {
  const rows = new Map<number, GridItem[]>()
  for (const item of items) {
    rows.set(item.row, [...(rows.get(item.row) ?? []), item])
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, row]) => [...row].sort((a, b) => a.order - b.order).map((item) => item.id))
}

/**
 * Where the cursor goes next, or null when there are no items. Left and right walk the row and
 * either stop at its ends or wrap; up and down change row and keep the column as far as the new
 * row reaches. A cursor that is on nothing yet enters from the edge it is moving away from.
 */
export function moveInGrid(
  items: readonly GridItem[],
  selected: string | null,
  direction: GridDirection,
  wrap: boolean
): string | null {
  const rows = gridRows(items)
  if (rows.length === 0) {
    return null
  }
  const backwards = direction === 'left' || direction === 'up'
  const at = rows.findIndex((row) => selected !== null && row.includes(selected))
  if (at === -1) {
    const edge = backwards ? rows[rows.length - 1] : rows[0]
    return (backwards ? edge?.[edge.length - 1] : edge?.[0]) ?? null
  }
  const row = rows[at] ?? []
  const column = selected === null ? 0 : row.indexOf(selected)
  if (direction === 'left' || direction === 'right') {
    const next = column + (direction === 'right' ? 1 : -1)
    const landed = wrap
      ? (next + row.length) % row.length
      : Math.min(Math.max(next, 0), row.length - 1)
    return row[landed] ?? null
  }
  const target = rows[Math.min(Math.max(at + (direction === 'down' ? 1 : -1), 0), rows.length - 1)]
  return target?.[Math.min(column, target.length - 1)] ?? null
}
