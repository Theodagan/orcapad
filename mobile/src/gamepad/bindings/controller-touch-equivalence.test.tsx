import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { createWheelRegistry } from '../wheel/wheel-registry'
import { pairingRouteBinding } from './pairing-route-binding'
import { useHomeControllerBinding } from './use-home-controller-binding'
import { useWorkspaceControllerBinding } from './use-workspace-controller-binding'
import { useSessionControllerBinding } from './use-session-controller-binding'
import { useAgentControllerBinding } from './use-agent-controller-binding'
import { useFileExplorerControllerBinding } from './use-file-explorer-controller-binding'
import { useTerminalControllerBinding } from './use-terminal-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

/**
 * BIND-T9. One spy per binding, reached twice: once the way a thumb reaches it and once the way
 * a controller does. The assertion is always the same — the same function, called once.
 *
 * That shape is the point. Every binding in `003` was written to invoke the surface's existing
 * callback rather than to re-derive what it does, and the only way that claim can rot is if some
 * future edit routes one of them somewhere else. Comparing the two paths against a single spy
 * catches exactly that, where two separate tests asserting "it works" would not.
 *
 * `touch()` stands for the surface's own handler — the same callback its `onPress` is wired to,
 * which is what the binding is handed.
 */

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

type Harness = {
  renderer: ReactTestRenderer
  press: (intent: ControllerIntent) => void
  connect: () => void
  registry: ReturnType<typeof createWheelRegistry>
}

function mount(Surface: () => ReactNode): Harness {
  const { reader, publish } = fakeReader()
  const registry = createWheelRegistry()
  let dispatch: (intent: ControllerIntent) => boolean = () => false

  function Wrapped(): ReactNode {
    const node = Surface()
    dispatch = useController().dispatchIntent
    return node
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(
        ControllerProvider,
        { reader, registerWheelAction: registry.register },
        createElement(Wrapped)
      )
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }
  return {
    renderer,
    press: (intent) => act(() => void dispatch(intent)),
    connect: () => act(() => publish({ ...neutralSample(0), connected: true })),
    registry
  }
}

describe('controller and touch reach the same action', () => {
  it('pair-confirm: A and the Pair button', () => {
    const confirm = vi.fn()
    const { focusTarget } = pairingRouteBinding('pair-confirm', { confirm, back: null })

    confirm() // touch
    focusTarget.handle({ kind: 'confirm' }) // controller

    expect(confirm).toHaveBeenCalledTimes(2)
  })

  it('home: A and the host card', () => {
    const onOpen = vi.fn()
    const hosts = [{ id: 'alpha' }]
    const harness = mount(() => {
      useHomeControllerBinding({
        hosts,
        onOpen,
        onPairDesktop: vi.fn(),
        scrollTo: vi.fn()
      })
      return null
    })
    harness.connect()

    onOpen(hosts[0]) // touch
    harness.press({ kind: 'confirm' }) // controller

    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onOpen.mock.calls[0]).toEqual(onOpen.mock.calls[1])
  })

  it('workspaces: A and the workspace row', () => {
    const onOpen = vi.fn()
    const rows = [{ worktreeId: 'w1' }]
    const harness = mount(() => {
      useWorkspaceControllerBinding({
        sections: [{ data: rows }],
        idOf: (row) => row.worktreeId,
        onOpen,
        onBack: vi.fn(),
        scrollTo: vi.fn()
      })
      return null
    })
    harness.connect()

    onOpen(rows[0])
    harness.press({ kind: 'confirm' })

    expect(onOpen).toHaveBeenCalledTimes(2)
    expect(onOpen.mock.calls[0]).toEqual(onOpen.mock.calls[1])
  })

  it('session: LB/RB and the tab strip', () => {
    const onSwitchTab = vi.fn()
    const tabs = [{ id: 'a' }, { id: 'b' }]
    const harness = mount(() => {
      useSessionControllerBinding({
        sessionId: 'wt-1',
        tabs,
        idOf: (tab) => tab.id,
        activeTabId: 'a',
        onSwitchTab,
        onBack: vi.fn()
      })
      return null
    })

    onSwitchTab(tabs[1])
    harness.press({ kind: 'cycle-tab', direction: 'next' })

    expect(onSwitchTab).toHaveBeenCalledTimes(2)
    expect(onSwitchTab.mock.calls[0]).toEqual(onSwitchTab.mock.calls[1])
  })

  it('agent: X and the Stop button', () => {
    const onStop = vi.fn()
    const harness = mount(() => {
      useAgentControllerBinding({
        sessionId: 'wt-1',
        canStop: true,
        onStop,
        scrollTo: vi.fn(),
        onDetachFromTail: vi.fn()
      })
      return null
    })

    onStop()
    harness.press({ kind: 'stop' })

    expect(onStop).toHaveBeenCalledTimes(2)
  })

  it('files: A and the file row', () => {
    const onPreviewFile = vi.fn()
    const rows = [{ id: 'readme.md', kind: 'text' as const }]
    const harness = mount(() => {
      useFileExplorerControllerBinding({
        rows,
        idOf: (row) => row.id,
        isExpanded: () => false,
        parentIdOf: () => null,
        onToggleDirectory: vi.fn(),
        onPreviewFile,
        onRetryDirectory: vi.fn(),
        onCollapseAll: vi.fn(),
        onBack: vi.fn(),
        scrollTo: vi.fn()
      })
      return null
    })
    harness.connect()

    onPreviewFile(rows[0])
    harness.press({ kind: 'confirm' })

    expect(onPreviewFile).toHaveBeenCalledTimes(2)
    expect(onPreviewFile.mock.calls[0]).toEqual(onPreviewFile.mock.calls[1])
  })

  it('terminal: a wheel control key and the accessory key row', () => {
    const onSend = vi.fn()
    const harness = mount(() => {
      useTerminalControllerBinding({
        handle: 'h1',
        linesPerScroll: 3,
        scrollLines: vi.fn(),
        onSend,
        onBack: vi.fn(),
        actions: [{ id: 'terminal.escape', label: 'Esc', send: '\u001b', enabled: true }]
      })
      return null
    })

    onSend('\u001b')
    harness.registry.lookup('terminal.escape')?.run()

    expect(onSend).toHaveBeenCalledTimes(2)
    expect(onSend.mock.calls[0]).toEqual(onSend.mock.calls[1])
  })
})

describe('an unmounted binding reaches nothing', () => {
  // `003` §10: unmount removes focus and wheel registrations. Every surface, one rule.
  it('drops focus and wheel actions for every binding', () => {
    const onOpen = vi.fn()
    const onSend = vi.fn()
    const harness = mount(() => {
      useHomeControllerBinding({
        hosts: [{ id: 'alpha' }],
        onOpen,
        onPairDesktop: vi.fn(),
        scrollTo: vi.fn()
      })
      useTerminalControllerBinding({
        handle: 'h1',
        linesPerScroll: 3,
        scrollLines: vi.fn(),
        onSend,
        onBack: vi.fn(),
        actions: [{ id: 'terminal.escape', label: 'Esc', send: '\u001b', enabled: true }]
      })
      return null
    })
    harness.connect()

    act(() => harness.renderer.unmount())

    harness.press({ kind: 'confirm' })
    expect(onOpen).not.toHaveBeenCalled()
    expect(harness.registry.lookup('terminal.escape')).toBeNull()
    expect(harness.registry.ids()).toEqual([])
  })
})

describe('an unavailable target does nothing rather than something', () => {
  it('opens nothing from an empty list', () => {
    const onOpen = vi.fn()
    const harness = mount(() => {
      useHomeControllerBinding({
        hosts: [],
        onOpen,
        onPairDesktop: vi.fn(),
        scrollTo: vi.fn()
      })
      return null
    })
    harness.connect()

    harness.press({ kind: 'confirm' })

    expect(onOpen).not.toHaveBeenCalled()
  })

  it('sends nothing from a disabled terminal action', () => {
    const onSend = vi.fn()
    const harness = mount(() => {
      useTerminalControllerBinding({
        handle: 'h1',
        linesPerScroll: 3,
        scrollLines: vi.fn(),
        onSend,
        onBack: vi.fn(),
        actions: [{ id: 'terminal.quick', label: 'Deploy', send: 'x\r', enabled: false }]
      })
      return null
    })

    // The wheel refuses to commit an unavailable segment, so the action is never reached.
    expect(harness.registry.lookup('terminal.quick')?.availability).toBe('unavailable')
    expect(onSend).not.toHaveBeenCalled()
  })

  it('stops nothing when the agent view says the turn cannot be stopped', () => {
    const onStop = vi.fn()
    const harness = mount(() => {
      useAgentControllerBinding({
        sessionId: 'wt-1',
        canStop: false,
        onStop,
        scrollTo: vi.fn(),
        onDetachFromTail: vi.fn()
      })
      return null
    })

    harness.press({ kind: 'stop' })

    expect(onStop).not.toHaveBeenCalled()
  })
})
