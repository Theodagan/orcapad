import { useEffect, useMemo } from 'react'
import { useControllerBinding } from '../controller-provider'
import { LIST_SCROLL_RATE } from './controller-scroll-rate'
import { nextSelectedId, selectedItem } from './list-selection'
import { rowAction, type ExplorerRow, type RowAction } from './file-explorer-row-action'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { useZoneFocused } from '../zones/use-zone-focused'
import { focusTargetFor, type IntentHandlerEntry, type SurfaceBinding } from './surface-binding'
import { useControllerListSelection } from './use-controller-list-selection'
import { useScrollIntentEntry } from './use-scroll-intent-entry'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The file explorer's controller edge. Every action is one the panel already owns, so the
 * existing `files.readDir` fallback, caching, preview classification and routing are untouched
 * (BIND-R7, BIND-AC8) — this moves a selection and calls what a tap would call.
 *
 * Hierarchy is on the horizontal provisional axis: right opens a folder, left closes it, and on a
 * file left steps out to its parent. That is conventional tree behaviour and it is the one thing
 * `A` alone cannot express, since `A` on a folder has to mean toggle.
 *
 * Returns the id the pad's cursor is on while the pad is pointed at the panel, else null.
 */

const FILE_EXPLORER_TARGET_ID = 'file-explorer'

export type FileExplorerControllerBindingOptions<T extends ExplorerRow> = {
  /** The flattened rows the list renders, so selection follows what is expanded (BIND-R7). */
  readonly rows: readonly T[]
  readonly idOf: (row: T) => string
  readonly isExpanded: (row: T) => boolean
  readonly parentIdOf: (row: T) => string | null
  readonly onToggleDirectory: (row: T) => void
  readonly onPreviewFile: (row: T) => void
  readonly onRetryDirectory: (row: T) => void
  readonly onBack: () => void
  /** Moves the list from where it really is; the panel wires it to the list's own offset. */
  readonly scrollBy: (delta: number) => void
}

export function useFileExplorerControllerBinding<T extends ExplorerRow>(
  options: FileExplorerControllerBindingOptions<T>
): string | null {
  const {
    rows,
    idOf,
    isExpanded,
    parentIdOf,
    onToggleDirectory,
    onPreviewFile,
    onRetryDirectory,
    onBack
  } = options
  const scrollEntry = useScrollIntentEntry(LIST_SCROLL_RATE, options.scrollBy)
  const { connected, activateFocusTarget } = useControllerBinding()
  const zoneFocused = useZoneFocused('panels')
  const { selectedId, current: currentId, select } = useControllerListSelection(rows, idOf)

  const focusTarget = useMemo(() => {
    const current = (): T | null => selectedItem(rows, idOf, currentId())

    const activate = (row: T | null): void => {
      if (row === null) {
        return
      }
      const action: RowAction = rowAction(row)
      if (action === 'toggle-directory') {
        onToggleDirectory(row)
      } else if (action === 'preview-file') {
        onPreviewFile(row)
      } else if (action === 'retry-directory') {
        onRetryDirectory(row)
      }
    }

    const entries: IntentHandlerEntry[] = [
      ['confirm', () => activate(current())],
      ['back', onBack],
      scrollEntry,
      [
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection') {
            select(nextSelectedId(rows, idOf, currentId(), intent.direction))
          }
        }
      ],
      [
        'move-horizontal',
        (intent) => {
          if (intent.kind !== 'move-horizontal') {
            return
          }
          const row = current()
          if (row === null) {
            return
          }
          const open = rowAction(row) === 'toggle-directory' && isExpanded(row)
          if (intent.direction === 'right') {
            // Right opens a closed folder and does nothing else; stepping into the first child is
            // what the next `move-selection` is for.
            if (rowAction(row) === 'toggle-directory' && !open) {
              onToggleDirectory(row)
            }
            return
          }
          if (open) {
            onToggleDirectory(row)
            return
          }
          // Already closed, or not a folder at all: left means "out one level".
          const parent = parentIdOf(row)
          if (parent !== null) {
            select(parent)
          }
        }
      ]
    ]

    // A docked panel is a zone of the session screen; as a full-screen route it is the only one.
    return {
      ...focusTargetFor(FILE_EXPLORER_TARGET_ID, entries),
      zone: 'panels' as const,
      priority: FOCUS_PRIORITY.surface,
      labels: {
        confirm: 'Open',
        back: 'Close',
        'move-selection': 'Move',
        'move-horizontal': 'Fold / Unfold'
      }
    }
  }, [
    rows,
    idOf,
    isExpanded,
    parentIdOf,
    currentId,
    select,
    onToggleDirectory,
    onPreviewFile,
    onRetryDirectory,
    onBack,
    scrollEntry
  ])

  // No wheel actions: preview, reload and fold stay on `A` and the D-pad (`012`).
  const binding = useMemo<SurfaceBinding>(() => ({ focusTarget, wheelActions: [] }), [focusTarget])

  useSurfaceBinding(binding)

  // Opening the panel is how the pad gets here, so it arrives with the pad rather than leaving
  // the buttons on the header it was opened from. Declared after the registration it activates.
  useEffect(() => {
    if (connected) {
      activateFocusTarget(FILE_EXPLORER_TARGET_ID)
    }
  }, [connected, activateFocusTarget])

  // The cursor is drawn only while the pad is pointed here; elsewhere a ring would lie.
  return zoneFocused ? selectedId : null
}
