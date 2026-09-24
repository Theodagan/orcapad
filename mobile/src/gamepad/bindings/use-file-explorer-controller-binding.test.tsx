import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { createWheelRegistry } from '../wheel/wheel-registry'
import { EXPLORER_WHEEL_ACTION_IDS } from './file-explorer-row-action'
import { useFileExplorerControllerBinding } from './use-file-explorer-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Row = {
  readonly id: string
  readonly kind: 'directory' | 'text' | 'binary' | 'loading' | 'error'
  readonly parent: string | null
}

/** src/ open, with one file inside it, then a sibling file at the root. */
const rows: readonly Row[] = [
  { id: 'src', kind: 'directory', parent: null },
  { id: 'src/main.ts', kind: 'text', parent: 'src' },
  { id: 'readme.md', kind: 'text', parent: null }
]

function fakeReader(): { reader: ControllerReader; publish: (s: ControllerSample) => void } {
  const listeners = new Set<(sample: ControllerSample) => void>()
  return {
    reader: {
      support: () => 'available',
      current: () => neutralSample(0),
      subscribe: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
    },
    publish: (sample) => {
      for (const listener of listeners) {
        listener(sample)
      }
    }
  }
}

function mount(expandedIds: readonly string[] = ['src'], list: readonly Row[] = rows) {
  const { reader, publish } = fakeReader()
  const registry = createWheelRegistry()
  const onToggleDirectory = vi.fn()
  const onPreviewFile = vi.fn()
  const onRetryDirectory = vi.fn()
  const onCollapseAll = vi.fn()
  const onBack = vi.fn()
  const scrollTo = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false
  let selected: string | null = null

  function Explorer(): ReactNode {
    selected = useFileExplorerControllerBinding({
      rows: list,
      idOf: (row) => row.id,
      isExpanded: (row) => expandedIds.includes(row.id),
      parentIdOf: (row) => row.parent,
      onToggleDirectory,
      onPreviewFile,
      onRetryDirectory,
      onCollapseAll,
      onBack,
      scrollTo
    })
    dispatch = useController().dispatchIntent
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(
        ControllerProvider,
        { reader, registerWheelAction: registry.register },
        createElement(Explorer)
      )
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    registry,
    dispatch: (intent: ControllerIntent) => act(() => void dispatch(intent)),
    connect: (connected: boolean) => act(() => publish({ ...neutralSample(0), connected })),
    selected: () => selected,
    onToggleDirectory,
    onPreviewFile,
    onRetryDirectory,
    onCollapseAll,
    onBack
  }
}

describe('file explorer controller binding', () => {
  it('confirms a folder by toggling it and a file by previewing it', () => {
    const explorer = mount()
    explorer.connect(true)

    explorer.dispatch({ kind: 'confirm' })
    expect(explorer.onToggleDirectory).toHaveBeenCalledWith(rows[0])
    expect(explorer.onPreviewFile).not.toHaveBeenCalled()

    explorer.dispatch({ kind: 'move-selection', direction: 'down' })
    explorer.dispatch({ kind: 'confirm' })
    expect(explorer.onPreviewFile).toHaveBeenCalledWith(rows[1])
  })

  it('opens a closed folder on right and closes an open one on left', () => {
    const open = mount(['src'])
    open.connect(true)
    open.dispatch({ kind: 'move-horizontal', direction: 'left' })
    expect(open.onToggleDirectory).toHaveBeenCalledWith(rows[0])

    const closed = mount([])
    closed.connect(true)
    closed.dispatch({ kind: 'move-horizontal', direction: 'right' })
    expect(closed.onToggleDirectory).toHaveBeenCalledWith(rows[0])
  })

  it('does not re-open a folder that is already open', () => {
    const explorer = mount(['src'])
    explorer.connect(true)

    explorer.dispatch({ kind: 'move-horizontal', direction: 'right' })

    expect(explorer.onToggleDirectory).not.toHaveBeenCalled()
  })

  it('steps out to the parent when left has no folder to close', () => {
    const explorer = mount()
    explorer.connect(true)
    explorer.dispatch({ kind: 'move-selection', direction: 'down' })
    expect(explorer.selected()).toBe('src/main.ts')

    explorer.dispatch({ kind: 'move-horizontal', direction: 'left' })

    expect(explorer.selected()).toBe('src')
    expect(explorer.onToggleDirectory).not.toHaveBeenCalled()
  })

  it('leaves a top-level row where it is when there is no parent', () => {
    const explorer = mount([], [{ id: 'readme.md', kind: 'text', parent: null }])
    explorer.connect(true)

    explorer.dispatch({ kind: 'move-horizontal', direction: 'left' })

    expect(explorer.selected()).toBe('readme.md')
  })

  it('retries a failed folder rather than previewing it', () => {
    const explorer = mount([], [{ id: 'broken', kind: 'error', parent: null }])
    explorer.connect(true)

    explorer.dispatch({ kind: 'confirm' })

    expect(explorer.onRetryDirectory).toHaveBeenCalledTimes(1)
    expect(explorer.onPreviewFile).not.toHaveBeenCalled()
  })

  it('presses nothing on a loading placeholder', () => {
    const explorer = mount([], [{ id: 'pending', kind: 'loading', parent: null }])
    explorer.connect(true)

    explorer.dispatch({ kind: 'confirm' })

    expect(explorer.onPreviewFile).not.toHaveBeenCalled()
    expect(explorer.onToggleDirectory).not.toHaveBeenCalled()
    expect(explorer.onRetryDirectory).not.toHaveBeenCalled()
  })

  // BIND-R10: the ids WHEEL-T7 references, alive exactly while the panel is.
  it('registers its wheel actions while mounted and retracts them on unmount', () => {
    const explorer = mount()
    explorer.connect(true)

    expect(explorer.registry.lookup(EXPLORER_WHEEL_ACTION_IDS.collapseAll)).not.toBeNull()
    explorer.registry.lookup(EXPLORER_WHEEL_ACTION_IDS.collapseAll)?.run()
    expect(explorer.onCollapseAll).toHaveBeenCalledTimes(1)

    act(() => explorer.renderer.unmount())
    expect(explorer.registry.lookup(EXPLORER_WHEEL_ACTION_IDS.collapseAll)).toBeNull()
  })

  // A wheel commit must not preview a folder just because something was selected.
  it('previews from the wheel only when the selection is a file', () => {
    const explorer = mount()
    explorer.connect(true)

    explorer.registry.lookup(EXPLORER_WHEEL_ACTION_IDS.preview)?.run()
    expect(explorer.onPreviewFile).not.toHaveBeenCalled()

    explorer.dispatch({ kind: 'move-selection', direction: 'down' })
    explorer.registry.lookup(EXPLORER_WHEEL_ACTION_IDS.preview)?.run()
    expect(explorer.onPreviewFile).toHaveBeenCalledWith(rows[1])
  })

  it('goes back through the panel’s own close', () => {
    const explorer = mount()

    explorer.dispatch({ kind: 'back' })

    expect(explorer.onBack).toHaveBeenCalledTimes(1)
  })
})
