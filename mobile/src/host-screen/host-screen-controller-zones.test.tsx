import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../gamepad/controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../gamepad/controller-input/controller-sample'
import { ControllerProvider, useController } from '../gamepad/controller-provider'
import { useWorkspaceControllerBinding } from '../gamepad/bindings/use-workspace-controller-binding'
import { ZoneFrame } from '../gamepad/zones/ZoneFrame'
import { HostScreenHeader } from './host-screen-header'
import type { HostScreenController } from './use-host-screen-controller'

/**
 * `005` round 2 on the host screen: `X` walks from the workspace list to the header, so the
 * filter, sort and group buttons can be reached with the pad, and `B` comes back. The header is
 * the one the screen draws; the list is its real controller binding with a stub in place of rows.
 */

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFillObject: {}, absoluteFill: {} },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable'
}))
vi.mock('lucide-react-native', () => {
  const icon = () => null
  return {
    ChevronLeft: icon,
    Filter: icon,
    Layers: icon,
    List: icon,
    PanelLeftClose: icon,
    Plus: icon,
    Search: icon,
    SlidersHorizontal: icon,
    SquareTerminal: icon,
    UserCircle: icon,
    X: icon
  }
})
vi.mock('../components/StatusDot', () => ({ StatusDot: () => null }))
vi.mock('./host-screen-styles', () => ({ hostScreenStyles: new Proxy({}, { get: () => ({}) }) }))

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
    publish: (sample) => listeners.forEach((listener) => listener(sample))
  }
}

function fakeHost() {
  const state = {
    hostName: 'laptop',
    groupMode: 'none',
    showSearch: false,
    setShowFilterModal: vi.fn(),
    setShowSortPicker: vi.fn(),
    setShowGroupPicker: vi.fn(),
    setShowSearch: vi.fn()
  }
  const actions = {
    leaveHost: vi.fn(),
    openFloatingWorkspace: vi.fn(),
    openNewWorktreeModal: vi.fn(),
    navigateFromHostList: vi.fn()
  }
  const controller = {
    actions,
    connState: 'connected',
    embedded: false,
    floatingWorkspaceEnabled: false,
    forceReconnectHost: vi.fn(),
    hostId: 'host-1',
    lastConnectedAt: 0,
    onHideSidebar: undefined,
    reconnectAttempts: 0,
    relayRecovery: {},
    settings: { activeFilterCount: 0, selectedSortLabel: 'Recent' },
    state
  }
  return { controller, state, actions }
}

const sections = [{ key: 'all', data: [{ id: 'wt-1' }, { id: 'wt-2' }] }]
const idOf = (item: { id: string }): string => item.id

function textOf(node: ReactTestInstance | string): string {
  return typeof node === 'string' ? node : node.children.map(textOf).join('')
}

describe('the host screen, driven by a pad', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(options: { padAttached?: boolean } = {}) {
    const { reader, publish } = fakeReader()
    const host = fakeHost()
    const opened = vi.fn()
    const left = vi.fn()
    const held: { controller: ReturnType<typeof useController> | null } = { controller: null }
    const selected: { id: string | null } = { id: null }

    function List(): ReactNode {
      selected.id = useWorkspaceControllerBinding({
        sections,
        idOf,
        onOpen: opened,
        onBack: left,
        scrollBy: vi.fn()
      })
      held.controller = useController()
      return createElement(ZoneFrame, { zone: 'list' })
    }

    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the header reads a fixed list of fields, all of which the fake supplies.
    const controller = host.controller as unknown as HostScreenController
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader },
          createElement(List),
          createElement(HostScreenHeader, { controller })
        ),
        { createNodeMock: (element) => ({ label: element.props.accessibilityLabel }) }
      )
    })
    if (options.padAttached !== false) {
      act(() => publish({ ...neutralSample(0), connected: true }))
    }

    const dispatch = (
      intent: Parameters<ReturnType<typeof useController>['dispatchIntent']>[0]
    ) => {
      let taken = false
      act(() => {
        taken = held.controller?.dispatchIntent(intent) ?? false
      })
      return taken
    }
    const frames = (): string[] =>
      (renderer?.root.findAll((node) => typeof node.props.testID === 'string') ?? []).flatMap(
        (node) => (node.props.testID.startsWith('zone-frame:') ? [node.props.testID] : [])
      )
    const ringed = (): string | null => {
      const ring = renderer?.root.findAll(
        (node) => node.props.testID === 'controller-focus-ring'
      )[0]
      for (let at = ring?.parent ?? null; at !== null; at = at.parent) {
        if (typeof at.props.accessibilityLabel === 'string') {
          return at.props.accessibilityLabel
        }
        if (at.type === 'Pressable') {
          return textOf(at)
        }
      }
      return null
    }
    return { ...host, opened, left, selected, dispatch, frames, ringed }
  }

  it('starts on the list, and X walks to the header and back', () => {
    const screen = mount()
    expect(screen.frames()).toEqual(['zone-frame:list'])
    expect(screen.selected.id).toBe('wt-1')

    screen.dispatch({ kind: 'switch-zone' })
    expect(screen.frames()).toEqual(['zone-frame:header'])
    // The row cursor leaves with the pad.
    expect(screen.selected.id).toBeNull()
    expect(screen.ringed()).toBe('Filter workspaces')

    screen.dispatch({ kind: 'switch-zone' })
    expect(screen.frames()).toEqual(['zone-frame:list'])
    expect(screen.selected.id).toBe('wt-1')
  })

  it('opens the filter on A, from where the header starts', () => {
    const screen = mount()
    screen.dispatch({ kind: 'switch-zone' })

    screen.dispatch({ kind: 'confirm' })

    expect(screen.state.setShowFilterModal).toHaveBeenCalledWith(true)
    expect(screen.opened).not.toHaveBeenCalled()
  })

  it('moves along the toolbar with the D-pad and presses what it is on', () => {
    const screen = mount()
    screen.dispatch({ kind: 'switch-zone' })

    screen.dispatch({ kind: 'move-horizontal', direction: 'right' })
    expect(screen.ringed()).toBe('Sort by Recent')
    screen.dispatch({ kind: 'confirm' })
    expect(screen.state.setShowSortPicker).toHaveBeenCalledWith(true)

    screen.dispatch({ kind: 'move-horizontal', direction: 'right' })
    screen.dispatch({ kind: 'confirm' })
    expect(screen.state.setShowGroupPicker).toHaveBeenCalledWith(true)
  })

  it('reaches the row above the toolbar, and presses Back to hosts', () => {
    const screen = mount()
    screen.dispatch({ kind: 'switch-zone' })

    screen.dispatch({ kind: 'move-selection', direction: 'up' })
    expect(screen.ringed()).toBe('Back to hosts')
    screen.dispatch({ kind: 'confirm' })

    expect(screen.actions.leaveHost).toHaveBeenCalledTimes(1)
  })

  it('B returns to the list instead of leaving the screen', () => {
    const screen = mount()
    screen.dispatch({ kind: 'switch-zone' })

    screen.dispatch({ kind: 'back' })

    expect(screen.frames()).toEqual(['zone-frame:list'])
    expect(screen.left).not.toHaveBeenCalled()
  })

  it('still scrolls and cycles the list from the header', () => {
    const screen = mount()
    screen.dispatch({ kind: 'switch-zone' })

    expect(screen.dispatch({ kind: 'cycle-workspace', direction: 'next' })).toBe(true)
  })

  it('draws no ring and no frame without a pad', () => {
    const screen = mount({ padAttached: false })

    expect(screen.frames()).toEqual([])
    expect(screen.ringed()).toBeNull()
  })
})
