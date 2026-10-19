/**
 * Where X+L2/R2 lands: the nearest of the user's own messages above or below the row at the top
 * of the view. Past the last one, `next` goes to the newest line instead of nowhere.
 */
export function userMessageJumpTarget(
  rows: readonly { readonly role: string }[],
  /** The row the reader is on: the top visible one, or the last jump's target while it lands. */
  from: number,
  direction: 'previous' | 'next'
): number | 'tail' | null {
  if (direction === 'previous') {
    for (let index = Math.min(from, rows.length) - 1; index >= 0; index -= 1) {
      if (rows[index]?.role === 'user') {
        return index
      }
    }
    return null
  }
  for (let index = Math.max(from + 1, 0); index < rows.length; index += 1) {
    if (rows[index]?.role === 'user') {
      return index
    }
  }
  return 'tail'
}
