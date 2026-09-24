import { useEffect, useMemo, useRef, useState } from 'react'
import { useControllerBinding } from '../controller-provider'
import { nextScrollOffset } from './controller-scroll-offset'
import { nextSelectedId, selectedItem } from './list-selection'
import {
  explorerWheelActions,
  rowAction,
  type ExplorerRow,
  type RowAction
} from './file-explorer-row-action'
import { focusTargetFor, type IntentHandlerEntry } from './surface-binding'
import { useSurfaceBinding } from './use-surface-binding'

/**
 * The file explorer's controller edge. Every action is one the panel already owns, so the
 * existing `files.readDir` fallback, caching, preview classification and routing are untouched
 * (BIND-R7, BIND-AC8) — this moves a selection and calls what a tap would call.
 *
 * Hierarchy is on the horizontal provisional axis: right opens a folder, left closes it, and on a
 * file left steps out to its parent. That is conventional tree behaviour and it is the one thing
 * `A` alone cannot express, since `A` on a folder has to mean toggle.
 */

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
  readonly scrollTo: (offset: number) => void
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
    onBack,
    scrollTo
  } = options
  const { connected } = useControllerBinding()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const offsetRef = useRef(0)

  const firstId = rows[0] === undefined ? null : idOf(rows[0])
  useEffect(() => {
    setSelectedId((current) => (connected ? (current ?? firstId) : null))
  }, [connected, firstId])

  const binding = useMemo(() => {
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
          offsetRef.current = nextScrollOffset(offsetRef.current, intent.direction, intent.velocity)
          scrollTo(offsetRef.current)
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
      focusTarget: focusTargetFor('file-explorer', entries),
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
    scrollTo
  ])

  useSurfaceBinding(binding)
  return selectedId
}
