import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../gamepad/controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../gamepad/controller-input/controller-sample'
import { ControllerProvider, useController } from '../gamepad/controller-provider'
import { useControllerFocus } from '../gamepad/focus/use-controller-focus'
import { ZoneFrame } from '../gamepad/zones/ZoneFrame'
import { TERMINAL_ACCESSORY_KEY_DEFINITIONS } from '../terminal/terminal-key-definitions'
import { createTerminalLiveAccessoryInput } from '../terminal/terminal-live-accessory-input'
import { MobileSessionAccessoryKeys } from './MobileSessionAccessoryKeys'
import { MobileSessionHeader } from './MobileSessionHeader'
import type { MobileSessionController } from './use-mobile-session-controller'

/**
 * `005` USE-AC3 and USE-AC4 through the real session chrome: the header and the shortcut row as
 * they are drawn, driven by a fake pad over the real provider. A unit test of the zone store can
 * pass while a screen forgets to wrap its buttons; this cannot.
 */

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFillObject: {}, absoluteFill: {} },
  View: 'View',
  Text: 'Text',
  ScrollView: 'ScrollView',
  Pressable: 'Pressable'
}))
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }))
vi.mock('lucide-react-native', () => {
  const icon = () => null
  return {
    ChevronDown: icon,
    ChevronLeft: icon,
    ChevronsRight: icon,
    File: icon,
    FileText: icon,
    Folder: icon,
    GitBranch: icon,
    Globe: icon,
    Keyboard: icon,
    MoreHorizontal: icon,
    Monitor: icon,
    Plus: icon,
    Smartphone: icon,
    SquareChevronRight: icon
  }
})
vi.mock('../platform/haptics', () => ({ triggerMediumImpact: () => {} }))
vi.mock('../components/StatusDot', () => ({ StatusDot: () => null }))
vi.mock('../components/MobileAgentIcon', () => ({ MobileAgentIcon: () => null }))
vi.mock('./mobile-terminal-tab-agent', () => ({
  getMobileSessionTabTitle: (tab: { title: string }) => tab.title,
  resolveMobileTerminalTabAgentId: () => null
}))
vi.mock('./mobile-session-styles', () => ({ styles: new Proxy({}, { get: () => ({}) }) }))

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

const tabs = [
  { id: 't1', type: 'terminal', title: 'claude' },
  { id: 't2', type: 'terminal', title: 'tests' },
  { id: 't3', type: 'terminal', title: 'server' }
]

function fakeHeader() {
  return {
    hostId: 'host-1',
    isFolderWorkspaceRoute: false,
    isFloatingWorkspaceRoute: false,
    connState: 'connected',
    forceReconnectHost: vi.fn(),
    worktreeName: 'feature',
    activePanel: null,
    activeSessionTabId: 't2',
    activeSessionTabIdRef: { current: 't2' },
    tabStripRef: { current: null },
    tabStripOffsetRef: { current: 0 },
    tabStripViewportWidthRef: { current: 0 },
    tabStripContentWidthRef: { current: 0 },
    tabLayoutsRef: { current: new Map() },
    creating: false,
    creatingBrowser: false,
    creatingMarkdown: false,
    setCreateError: vi.fn(),
    setShowCreateTabDrawer: vi.fn(),
    setShowQuickCommands: vi.fn(),
    setShowHeaderMoreActions: vi.fn(),
    quickCommandsSupported: true,
    showToast: vi.fn(),
    requestLeaveSession: vi.fn(),
    scrollActiveTabIntoView: vi.fn(),
    switchSessionTab: vi.fn(),
    openSessionTabActionSheetAfterKeyboardDismiss: vi.fn(),
    visibleTabs: tabs,
    showConnectionRetry: false,
    terminalSummary: '3 terminals',
    handlePanelTap: vi.fn(),
    showHeaderMoreButton: true
  }
}

const [escape] = TERMINAL_ACCESSORY_KEY_DEFINITIONS
const backspace = TERMINAL_ACCESSORY_KEY_DEFINITIONS.find((key) => key.id === 'backspace')
if (backspace?.repeatable !== true) {
  throw new Error('the repeat test needs a key that repeats when held')
}

function fakeDock() {
  return {
    canSend: true,
    canCompose: true,
    activeHandle: 'term-1',
    terminalModes: new Map(),
    liveInputEnabled: false,
    toggleLiveInput: vi.fn(),
    toggleDisplayMode: vi.fn(),
    canPaste: false,
    handlePaste: vi.fn(),
    visibleBuiltInAccessoryKeys: [escape, backspace],
    customKeys: [],
    handleAccessoryKey: vi.fn(),
    startAccessoryRepeat: vi.fn(),
    stopAccessoryRepeat: vi.fn(),
    setDeleteKeyTarget: vi.fn(),
    setShowCustomKeyModal: vi.fn(),
    keyboardLift: 0,
    dismissSoftwareKeyboard: vi.fn()
  }
}

function textOf(node: ReactTestInstance | string): string {
  return typeof node === 'string' ? node : node.children.map(textOf).join('')
}

type Press = 'switch-zone' | 'confirm' | 'back'

describe('the session chrome, driven by a pad', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount() {
    const { reader, publish } = fakeReader()
    const header = fakeHeader()
    const dock = fakeDock()
    const agentConfirmed = vi.fn()
    const requestNativeFocus = vi.fn()
    const held: { controller: ReturnType<typeof useController> | null } = { controller: null }

    function Agent(): ReactNode {
      useControllerFocus({
        id: 'agent',
        zone: 'agent',
        accepts: new Set(['confirm']),
        handle: agentConfirmed
      })
      held.controller = useController()
      return createElement(ZoneFrame, { zone: 'agent' })
    }

    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the chrome reads a fixed list of fields, all of which the fake supplies.
    const headerController = header as unknown as MobileSessionController
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the shortcut row reads a fixed list of fields, all of which the fake supplies.
    const dockController = dock as unknown as MobileSessionController

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, requestNativeFocus },
          createElement(Agent),
          createElement(MobileSessionHeader, { controller: headerController }),
          createElement(MobileSessionAccessoryKeys, { controller: dockController })
        ),
        { createNodeMock: (element) => ({ label: element.props.accessibilityLabel }) }
      )
    })

    const dispatch = (intent: Parameters<ReturnType<typeof useController>['dispatchIntent']>[0]) =>
      act(() => void held.controller?.dispatchIntent(intent))
    const rings = (): ReactTestInstance[] =>
      renderer?.root.findAll((node) => node.props.testID === 'controller-focus-ring') ?? []
    const frames = (): string[] =>
      (renderer?.root.findAll((node) => typeof node.props.testID === 'string') ?? []).flatMap(
        (node) => (node.props.testID.startsWith('zone-frame:') ? [node.props.testID] : [])
      )
    /** What the ringed element says it is: its accessibility label, else the words on it. */
    const ringed = (): string | null => {
      const [ring] = rings()
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

    return {
      header,
      dock,
      agentConfirmed,
      requestNativeFocus,
      connect: () => act(() => publish({ ...neutralSample(0), connected: true })),
      toggleFocusMode: () => act(() => held.controller?.sessionChrome.toggleFocusMode()),
      toggleShortcuts: () => act(() => held.controller?.sessionChrome.toggleShortcuts()),
      hasShortcutRow: (): boolean =>
        (
          renderer?.root.findAll(
            (node) => node.props.accessibilityLabel === 'Switch to desktop mode'
          ) ?? []
        ).length > 0,
      press: (kind: Press) => dispatch({ kind }),
      move: (direction: 'left' | 'right') => dispatch({ kind: 'move-horizontal', direction }),
      moveVertically: (direction: 'up' | 'down') => dispatch({ kind: 'move-selection', direction }),
      rings,
      frames,
      ringed
    }
  }

  it('starts in the agent zone with nothing ringed, and walks to the shortcuts and the header', () => {
    const screen = mount()
    screen.connect()
    expect(screen.frames()).toEqual(['zone-frame:agent'])
    expect(screen.rings()).toHaveLength(0)

    screen.press('switch-zone')
    expect(screen.frames()).toEqual(['zone-frame:shortcuts'])
    expect(screen.rings()).toHaveLength(1)
    expect(screen.ringed()).toBe('Switch to desktop mode')

    screen.press('switch-zone')
    expect(screen.frames()).toEqual(['zone-frame:header'])
    expect(screen.rings()).toHaveLength(1)
    expect(screen.ringed()).toBe('tests')

    screen.press('switch-zone')
    expect(screen.frames()).toEqual(['zone-frame:agent'])
    expect(screen.rings()).toHaveLength(0)
  })

  it('draws no ring and no frame for a user with no pad', () => {
    const screen = mount()

    screen.press('switch-zone')

    expect(screen.rings()).toHaveLength(0)
    expect(screen.frames()).toEqual([])
  })

  it('moves along the shortcut keys and presses the one under the cursor as a tap would', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')

    screen.move('right')
    screen.move('right')
    expect(screen.ringed()).toBe('Escape')

    screen.press('confirm')
    expect(screen.dock.handleAccessoryKey).toHaveBeenCalledExactlyOnceWith(
      createTerminalLiveAccessoryInput(escape)
    )
    expect(screen.agentConfirmed).not.toHaveBeenCalled()
  })

  it('sends a key that repeats when held exactly once for A, because a held A would never release', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')
    screen.move('right')
    screen.move('right')
    screen.move('right')
    expect(screen.ringed()).toBe('Backspace')

    screen.press('confirm')

    expect(screen.dock.handleAccessoryKey).toHaveBeenCalledExactlyOnceWith(
      createTerminalLiveAccessoryInput(backspace)
    )
    expect(screen.dock.startAccessoryRepeat).not.toHaveBeenCalled()
  })

  it('wraps from the last shortcut back to the first', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')

    screen.move('left')

    expect(screen.ringed()).toBe('Add custom shortcut')
    screen.move('right')
    expect(screen.ringed()).toBe('Switch to desktop mode')
  })

  it('starts the header on the active tab and switches tabs with A on another', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')
    screen.press('switch-zone')
    expect(screen.ringed()).toBe('tests')

    screen.move('right')
    expect(screen.ringed()).toBe('server')
    screen.press('confirm')

    expect(screen.header.switchSessionTab).toHaveBeenCalledExactlyOnceWith(tabs[2])
  })

  it('moves between the buttons above the tabs and the tabs themselves', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')
    screen.press('switch-zone')

    screen.moveVertically('up')
    expect(screen.ringed()).toBe('Open file explorer')
    screen.press('confirm')
    expect(screen.header.handlePanelTap).toHaveBeenCalledExactlyOnceWith('files')

    screen.moveVertically('down')
    expect(screen.ringed()).toBe('tests')
  })

  it('skips the reconnect control while there is nothing to reconnect', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')
    screen.press('switch-zone')
    screen.moveVertically('up')

    screen.move('left')

    expect(screen.ringed()).toBe('Back to worktrees')
    screen.move('right')
    expect(screen.ringed()).toBe('Open file explorer')
  })

  it('goes back to the agent zone with B, and leaves A to the agent from there', () => {
    const screen = mount()
    screen.connect()
    screen.press('switch-zone')
    screen.press('switch-zone')

    screen.press('back')
    expect(screen.frames()).toEqual(['zone-frame:agent'])

    screen.press('confirm')
    expect(screen.agentConfirmed).toHaveBeenCalledTimes(1)
  })

  it('gives Android the focus of whatever the cursor lands on', () => {
    const screen = mount()
    screen.connect()

    screen.press('switch-zone')
    expect(screen.requestNativeFocus).toHaveBeenLastCalledWith({ label: 'Switch to desktop mode' })

    screen.move('right')
    expect(screen.requestNativeFocus).toHaveBeenLastCalledWith({
      label: 'Switch to live terminal input'
    })
  })

  it('is one row in focus mode: the tabs and the icons are walked in the order they are drawn', () => {
    const screen = mount()
    screen.connect()
    screen.toggleFocusMode()
    screen.press('switch-zone')
    screen.press('switch-zone')
    expect(screen.frames()).toEqual(['zone-frame:header'])
    expect(screen.ringed()).toBe('tests')

    const walked: (string | null)[] = []
    for (let step = 0; step < 6; step += 1) {
      screen.move('right')
      walked.push(screen.ringed())
    }

    expect(walked).toEqual([
      'server',
      'New tab',
      expect.any(String),
      'Open file explorer',
      'Open source control',
      'More session actions'
    ])
    // One row: up and down have nowhere to go.
    screen.moveVertically('up')
    expect(screen.ringed()).toBe('More session actions')
    screen.moveVertically('down')
    expect(screen.ringed()).toBe('More session actions')
  })

  it('walks left from the first tab to the back button in focus mode', () => {
    const screen = mount()
    screen.connect()
    screen.toggleFocusMode()
    screen.press('switch-zone')
    screen.press('switch-zone')

    screen.move('left')
    screen.move('left')

    expect(screen.ringed()).toBe('Back to worktrees')
  })

  it('draws nothing different for a user with no pad, whatever was toggled', () => {
    const screen = mount()
    screen.toggleFocusMode()
    screen.toggleShortcuts()

    expect(screen.hasShortcutRow()).toBe(true)
    expect(screen.frames()).toEqual([])
  })

  it('hides the shortcut row and takes its zone with it: X goes from the agent to the header', () => {
    const screen = mount()
    screen.connect()
    expect(screen.hasShortcutRow()).toBe(true)

    screen.toggleShortcuts()
    expect(screen.hasShortcutRow()).toBe(false)

    screen.press('switch-zone')
    expect(screen.frames()).toEqual(['zone-frame:header'])
    screen.press('switch-zone')
    expect(screen.frames()).toEqual(['zone-frame:agent'])

    screen.toggleShortcuts()
    expect(screen.hasShortcutRow()).toBe(true)
  })

  it('keeps the row while the keyboard is up, because its dismiss button is the way out', () => {
    const screen = mount()
    screen.connect()
    screen.dock.keyboardLift = 300

    screen.toggleShortcuts()

    expect(screen.hasShortcutRow()).toBe(true)
  })
})
