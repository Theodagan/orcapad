import type { WheelActionBinding } from '../wheel/wheel-registry'

/**
 * What `A` means on a file-explorer row, and the ids a wheel preset may name.
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

/**
 * Stable ids for the explorer's non-destructive actions, which is what a wheel preset references
 * (BIND-R10). Not prefixed `files.` on purpose: that prefix is reserved for the file RPC layer
 * this must never become, and the boundary ratchet enforces it.
 *
 * Every one of these is reversible and reaches an action the panel already owns, which is what
 * WHEEL-R7 requires of anything a trial can commit.
 */
export const EXPLORER_WHEEL_ACTION_IDS = {
  preview: 'explorer.preview-selected',
  collapseAll: 'explorer.collapse-all',
  reload: 'explorer.reload-selected'
} as const

export type ExplorerWheelActionCallbacks = {
  readonly previewSelected: () => void
  readonly collapseAll: () => void
  readonly reloadSelected: () => void
  /** False while nothing is selected, so a wheel segment reads disabled instead of misfiring. */
  readonly hasSelection: boolean
}

export function explorerWheelActions(
  callbacks: ExplorerWheelActionCallbacks
): readonly WheelActionBinding[] {
  const whenSelected = callbacks.hasSelection ? 'available' : 'unavailable'
  return [
    {
      id: EXPLORER_WHEEL_ACTION_IDS.preview,
      label: 'Preview file',
      availability: whenSelected,
      run: callbacks.previewSelected
    },
    {
      id: EXPLORER_WHEEL_ACTION_IDS.collapseAll,
      label: 'Collapse all',
      availability: 'available',
      run: callbacks.collapseAll
    },
    {
      id: EXPLORER_WHEEL_ACTION_IDS.reload,
      label: 'Reload folder',
      availability: whenSelected,
      run: callbacks.reloadSelected
    }
  ]
}
