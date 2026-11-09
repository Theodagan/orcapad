/**
 * What `A` means on a file-explorer row.
 *
 * The rows are not uniform: a directory opens and closes, a file previews, a failed directory
 * retries, and a loading placeholder does nothing at all. Deciding that here keeps the hook next
 * door from growing a `kind` switch, and keeps the decision testable without a renderer.
 */

/** The shape the explorer's rows already have; the binding needs nothing more of them. */
export type ExplorerRow = {
  readonly kind: 'directory' | 'text' | 'binary' | 'loading' | 'error'
}

export type RowAction = 'toggle-directory' | 'preview-file' | 'retry-directory' | 'none'

export function rowAction(row: ExplorerRow | null): RowAction {
  if (row === null) {
    return 'none'
  }
  if (row.kind === 'directory') {
    return 'toggle-directory'
  }
  if (row.kind === 'error') {
    return 'retry-directory'
  }
  // A loading placeholder is a row with nothing behind it yet; pressing it must not guess.
  return row.kind === 'loading' ? 'none' : 'preview-file'
}
