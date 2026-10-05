import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useControllerBinding } from '../controller-provider'
import {
  createScrollIntegrator,
  LIST_SCROLL_MINIMUM_FIRST_STEP_POINTS,
  LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE
} from './controller-scroll-rate'
import { nextSelectedId, selectedItem } from './list-selection'
import {
  explorerWheelActions,
  rowAction,
  type ExplorerRow,
  type RowAction
} from './file-explorer-row-action'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { useZoneFocused } from '../zones/use-zone-focused'
import { focusTargetFor, type IntentHandlerEntry, type SurfaceBinding } from './surface-binding'
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
  readonly onCollapseAll: () => void
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
    onCollapseAll,
    onBack
  } = options
  const scrollByRef = useRef(options.scrollBy)
  useLayoutEffect(() => {
    scrollByRef.current = options.scrollBy
  })
  const integrator = useMemo(
    () =>
      createScrollIntegrator({
        unitsPerSecond: LIST_SCROLL_POINTS_PER_SECOND_AT_FULL_PRESSURE,
        minimumFirstStep: LIST_SCROLL_MINIMUM_FIRST_STEP_POINTS
      }),
    []
  )
  const { connected, activateFocusTarget } = useControllerBinding()
  const zoneFocused = useZoneFocused('panels')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const firstId = rows[0] === undefined ? null : idOf(rows[0])
  useEffect(() => {
    setSelectedId((current) => (connected ? (current ?? firstId) : null))
  }, [connected, firstId])

  const binding = useMemo<SurfaceBinding>(() => {
    const current = (): T | null => selectedItem(rows, idOf, selectedId)

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
      [
        'scroll',
        (intent) => {
          if (intent.kind !== 'scroll') {
            return
          }
          const delta = integrator.step(intent)
          if (delta !== 0) {
            scrollByRef.current(delta)
          }
        }
      ],
      [
        'move-selection',
        (intent) => {
          if (intent.kind === 'move-selection') {
            setSelectedId((held) => nextSelectedId(rows, idOf, held, intent.direction))
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
            setSelectedId(parent)
          }
        }
      ]
    ]

    return {
      // A docked panel is a zone of the session screen; as a full-screen route it is the only one.
      focusTarget: {
        ...focusTargetFor(FILE_EXPLORER_TARGET_ID, entries),
        zone: 'panels',
        priority: FOCUS_PRIORITY.surface,
        labels: {
          confirm: 'Open',
          back: 'Close',
          'move-selection': 'Move',
          'move-horizontal': 'Fold / Unfold'
        }
      },
      wheelActions: explorerWheelActions({
        hasSelection: current() !== null,
        previewSelected: () => {
          const row = current()
          if (row !== null && rowAction(row) === 'preview-file') {
            onPreviewFile(row)
          }
        },
        collapseAll: onCollapseAll,
        reloadSelected: () => {
          const row = current()
          if (row !== null) {
            onRetryDirectory(row)
          }
        }
      })
    }
  }, [
    rows,
    idOf,
    isExpanded,
    parentIdOf,
    selectedId,
    onToggleDirectory,
    onPreviewFile,
    onRetryDirectory,
    onCollapseAll,
    onBack,
    integrator
  ])

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
