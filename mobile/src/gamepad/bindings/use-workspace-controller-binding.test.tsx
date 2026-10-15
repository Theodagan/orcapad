import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { useWorkspaceControllerBinding } from './use-workspace-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Row = { readonly worktreeId: string }
const idOf = (row: Row): string => row.worktreeId

type Sections = readonly {
  readonly key?: string
  readonly title?: string
  readonly data: readonly Row[]
}[]

const sections: Sections = [
  { data: [{ worktreeId: 'one' }, { worktreeId: 'two' }] },
  // A collapsed group: present, showing nothing.
  { data: [] },
  { data: [{ worktreeId: 'three' }] }
]

function fakeReader(): {
  reader: ControllerReader
  publish: (sample: ControllerSample) => void
} {
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

function mount(rows: Sections = sections) {
  const { reader, publish } = fakeReader()
  const onOpen = vi.fn()
  const onToggleSection = vi.fn()
  const onBack = vi.fn()
  const scrollBy = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false
  let selected: string | null = null

  function Workspaces(): ReactNode {
    selected = useWorkspaceControllerBinding({
      sections: rows,
      idOf,
      onOpen,
      onToggleSection,
      onBack,
      scrollBy
    })
    dispatch = useController().dispatchIntent
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(ControllerProvider, { reader }, createElement(Workspaces)))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    dispatch: (intent: ControllerIntent) => act(() => void dispatch(intent)),
    answers: (intent: ControllerIntent): boolean => dispatch(intent),
    connect: (connected: boolean) => act(() => publish({ ...neutralSample(0), connected })),
    selected: () => selected,
    onOpen,
    onToggleSection,
    onBack,
    scrollBy
  }
}

describe('workspace controller binding', () => {
  it('starts on the first rendered row once a controller is attached', () => {
    const list = mount()
    expect(list.selected()).toBeNull()

    list.connect(true)
    expect(list.selected()).toBe('one')
  })

  it('opens the selected workspace through the list’s own activation, once', () => {
    const list = mount()
    list.connect(true)

    list.dispatch({ kind: 'confirm' })

    expect(list.onOpen).toHaveBeenCalledTimes(1)
    expect(list.onOpen).toHaveBeenCalledWith({ worktreeId: 'one' })
  })

  // BIND-AC4, and the reason cycling moves rather than opens: a cycle that activated each
  // workspace it passed would fire an activation per step.
  it('cycles across section boundaries without opening anything', () => {
    const list = mount()
    list.connect(true)

    list.dispatch({ kind: 'cycle-workspace', direction: 'next' })
    expect(list.selected()).toBe('two')

    list.dispatch({ kind: 'cycle-workspace', direction: 'next' })
    expect(list.selected()).toBe('three')

    expect(list.onOpen).not.toHaveBeenCalled()
  })

  it('clamps at the last row rather than wrapping', () => {
    const list = mount()
    list.connect(true)

    for (let step = 0; step < 5; step += 1) {
      list.dispatch({ kind: 'cycle-workspace', direction: 'next' })
    }

    expect(list.selected()).toBe('three')
  })

  it('moves the same way on the provisional D-pad', () => {
    const list = mount()
    list.connect(true)

    list.dispatch({ kind: 'move-selection', direction: 'down' })
    expect(list.selected()).toBe('two')

    list.dispatch({ kind: 'move-selection', direction: 'up' })
    expect(list.selected()).toBe('one')
  })

  it('goes back through the route’s own action', () => {
    const list = mount()

    list.dispatch({ kind: 'back' })

    expect(list.onBack).toHaveBeenCalledTimes(1)
  })

  it('opens nothing when every section is empty', () => {
    const list = mount([{ data: [] }])
    list.connect(true)

    list.dispatch({ kind: 'confirm' })
    list.dispatch({ kind: 'cycle-workspace', direction: 'next' })

    expect(list.selected()).toBeNull()
    expect(list.onOpen).not.toHaveBeenCalled()
  })

  it('stops receiving intents once unmounted', () => {
    const list = mount()
    list.connect(true)
    act(() => list.renderer.unmount())

    list.dispatch({ kind: 'confirm' })

    expect(list.onOpen).not.toHaveBeenCalled()
  })

  describe('section headers are stops of their own', () => {
    const projects: Sections = [
      { key: 'a', title: 'Alpha', data: [{ worktreeId: 'one' }, { worktreeId: 'two' }] },
      // Collapsed: its header is drawn and its rows are not.
      { key: 'b', title: 'Beta', data: [] },
      { key: 'c', title: 'Gamma', data: [{ worktreeId: 'three' }] }
    ]
    const down: ControllerIntent = { kind: 'move-selection', direction: 'down' }
    const up: ControllerIntent = { kind: 'move-selection', direction: 'up' }
    const press = (direction: 'left' | 'right'): ControllerIntent => ({
      kind: 'move-horizontal',
      direction
    })

    it('still starts on the first workspace, so A opens something at once', () => {
      const list = mount(projects)
      list.connect(true)

      expect(list.selected()).toBe('one')
    })

    it('reaches a collapsed project instead of skipping it', () => {
      const list = mount(projects)
      list.connect(true)

      list.dispatch(down)
      list.dispatch(down)
      expect(list.selected()).toBe('section-header:b')

      list.dispatch(down)
      expect(list.selected()).toBe('section-header:c')
      list.dispatch(down)
      expect(list.selected()).toBe('three')
    })

    it('opens a collapsed project with A, and does not open a workspace', () => {
      const list = mount(projects)
      list.connect(true)
      list.dispatch(down)
      list.dispatch(down)

      list.dispatch({ kind: 'confirm' })

      expect(list.onToggleSection).toHaveBeenCalledExactlyOnceWith('b')
      expect(list.onOpen).not.toHaveBeenCalled()
    })

    it('opens a collapsed project with right and closes an open one with left, and nothing else', () => {
      const list = mount(projects)
      list.connect(true)
      list.dispatch(down)
      list.dispatch(down)
      expect(list.selected()).toBe('section-header:b')

      list.dispatch(press('right'))
      expect(list.onToggleSection).toHaveBeenLastCalledWith('b')
      // Already collapsed: left has nothing to close.
      list.onToggleSection.mockClear()
      list.dispatch(press('left'))
      expect(list.onToggleSection).not.toHaveBeenCalled()

      list.dispatch(down)
      expect(list.selected()).toBe('section-header:c')
      list.dispatch(press('left'))
      expect(list.onToggleSection).toHaveBeenLastCalledWith('c')
      list.onToggleSection.mockClear()
      list.dispatch(press('right'))
      expect(list.onToggleSection).not.toHaveBeenCalled()
    })

    it('goes up from a workspace to its project with left, so a section can be closed from inside it', () => {
      const list = mount(projects)
      list.connect(true)
      list.dispatch(down)
      expect(list.selected()).toBe('two')

      list.dispatch(press('left'))

      expect(list.selected()).toBe('section-header:a')
      list.dispatch(up)
      expect(list.selected()).toBe('section-header:a')
    })

    it('cycles worktrees without stopping on a header', () => {
      const list = mount(projects)
      list.connect(true)

      list.dispatch({ kind: 'cycle-workspace', direction: 'next' })
      list.dispatch({ kind: 'cycle-workspace', direction: 'next' })

      expect(list.selected()).toBe('three')
    })

    it('leaves left and right to whatever else wants them when a workspace has no project to go up to', () => {
      const list = mount()
      list.connect(true)

      expect(list.answers({ kind: 'move-horizontal', direction: 'left' })).toBe(false)
    })
  })
})
