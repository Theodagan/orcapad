import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../gamepad/controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../gamepad/controller-input/controller-sample'
import { ControllerProvider } from '../gamepad/controller-provider'
import { AGENT_WHEEL_ACTION_IDS } from '../gamepad/bindings/agent-wheel-action-ids'
import { NAVIGATION_WHEEL_ACTION_IDS } from '../gamepad/bindings/navigation-wheel-actions'
import { createWheelRegistry, isMenuBinding } from '../gamepad/wheel/wheel-registry'
import { useSessionWheelActions } from './use-session-wheel-actions'
import type { MobileSessionController } from './use-mobile-session-controller'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

const loadOptions = vi.hoisted(() => vi.fn())
vi.mock('./mobile-new-tab-agent-loader', () => ({ loadMobileNewTabAgentOptions: loadOptions }))
vi.mock('./mobile-terminal-tab-agent', () => ({
  resolveMobileTerminalTabAgentId: (tab: { agent?: string }) => tab.agent ?? null
}))
// Chat is on offer for a tab that runs an agent, which is all the toggle's rule needs here.
vi.mock('./mobile-native-chat-eligibility', () => ({
  resolveMobileNativeChat: (tab: { agent?: string }) => (tab.agent ? { agent: tab.agent } : null)
}))

function fakeReader(): { reader: ControllerReader; publish: (sample: ControllerSample) => void } {
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

type Tab = { id: string; type: 'agent-session' | 'terminal' | 'markdown'; agent?: string }

function fakeController(overrides: Record<string, unknown> = {}) {
  const sendRequest = vi.fn()
  const handleCloseSessionTab = vi.fn()
  const handleCreateTerminal = vi.fn()
  const toggleTabChatView = vi.fn()
  const activeSessionTab: Tab = { id: 't1', type: 'agent-session' }
  const controller = {
    client: { sendRequest },
    worktreeId: 'repo-1::/work/tree',
    connState: 'connected',
    activeSessionTab,
    showNativeChat: false,
    nativeChatTranscriptIsLocalReadable: true,
    toggleTabChatView,
    handleCloseSessionTab,
    handleCreateTerminal,
    ...overrides
  }
  return { controller, sendRequest, handleCloseSessionTab, handleCreateTerminal, toggleTabChatView }
}

type FakeController = ReturnType<typeof fakeController>['controller']

describe('session wheel actions', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    loadOptions.mockReset()
  })

  function mount(controller: FakeController, options: { padAttached?: boolean } = {}) {
    const registry = createWheelRegistry()
    const { reader, publish } = fakeReader()
    function Harness(): ReactNode {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the hook reads a handful of fields, all of which the fake supplies.
      useSessionWheelActions(controller as unknown as MobileSessionController)
      return null
    }
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { registerWheelAction: registry.register, reader },
          createElement(Harness)
        )
      )
    })
    if (options.padAttached === true) {
      act(() => publish(neutralSample(1, true)))
    }
    return registry
  }

  describe('close', () => {
    it('is available on an agent tab, and closes exactly that tab through the session’s own close', () => {
      const { controller, handleCloseSessionTab } = fakeController()
      const registry = mount(controller)

      const close = registry.lookup(AGENT_WHEEL_ACTION_IDS.close)
      expect(close?.availability).toBe('available')
      if (close !== null && !isMenuBinding(close)) {
        close.run()
      }

      expect(handleCloseSessionTab).toHaveBeenCalledWith(controller.activeSessionTab)
    })

    it('is available on a terminal that runs an agent, and not on a plain one', () => {
      const agent = mount(
        fakeController({ activeSessionTab: { id: 't', type: 'terminal', agent: 'claude' } })
          .controller
      )
      expect(agent.lookup(AGENT_WHEEL_ACTION_IDS.close)?.availability).toBe('available')
      act(() => renderer?.unmount())

      const plain = mount(
        fakeController({ activeSessionTab: { id: 't', type: 'terminal' } }).controller
      )
      expect(plain.lookup(AGENT_WHEEL_ACTION_IDS.close)?.availability).toBe('unavailable')
    })

    it('is unavailable on a tab that is not an agent, and while disconnected', () => {
      const note = mount(
        fakeController({ activeSessionTab: { id: 'n', type: 'markdown' } }).controller
      )
      expect(note.lookup(AGENT_WHEEL_ACTION_IDS.close)?.availability).toBe('unavailable')
      act(() => renderer?.unmount())

      const offline = mount(fakeController({ connState: 'reconnecting' }).controller)
      expect(offline.lookup(AGENT_WHEEL_ACTION_IDS.close)?.availability).toBe('unavailable')
    })

    it('is unavailable with no tab at all', () => {
      const registry = mount(fakeController({ activeSessionTab: null }).controller)

      expect(registry.lookup(AGENT_WHEEL_ACTION_IDS.close)?.availability).toBe('unavailable')
    })
  })

  describe('launch', () => {
    it('is a menu of the agents the host can launch, built when it is opened', async () => {
      loadOptions.mockResolvedValue([
        { agent: 'claude', label: 'Claude' },
        { agent: 'codex', label: 'Codex' }
      ])
      const { controller, handleCreateTerminal } = fakeController()
      const registry = mount(controller)

      const launch = registry.lookup(AGENT_WHEEL_ACTION_IDS.launch)
      expect(launch !== null && isMenuBinding(launch)).toBe(true)
      expect(loadOptions).not.toHaveBeenCalled()
      const entries = launch !== null && isMenuBinding(launch) ? await launch.menu() : []

      expect(loadOptions).toHaveBeenCalledWith({
        client: controller.client,
        worktreeId: controller.worktreeId
      })
      expect(entries.map((entry) => entry.label)).toEqual(['Claude', 'Codex'])
      entries[1]?.run()
      expect(handleCreateTerminal).toHaveBeenCalledWith('codex')
    })

    it('is unavailable while disconnected', () => {
      const registry = mount(fakeController({ connState: 'disconnected' }).controller)

      expect(registry.lookup(AGENT_WHEEL_ACTION_IDS.launch)?.availability).toBe('unavailable')
    })
  })

  describe('toggle view', () => {
    const chatTab = { id: 'c', type: 'terminal', agent: 'claude' }

    it('switches the tab between chat and terminal through the tab menu’s own toggle', () => {
      const { controller, toggleTabChatView } = fakeController({ activeSessionTab: chatTab })
      const registry = mount(controller)

      const toggle = registry.lookup(AGENT_WHEEL_ACTION_IDS.toggleView)
      expect(toggle?.availability).toBe('available')
      if (toggle !== null && !isMenuBinding(toggle)) {
        toggle.run()
      }

      expect(toggleTabChatView).toHaveBeenCalledWith('c')
    })

    it('names where it goes, not where you are', () => {
      const terminal = mount(fakeController({ activeSessionTab: chatTab }).controller)
      expect(terminal.lookup(AGENT_WHEEL_ACTION_IDS.toggleView)?.label).toBe('Chat view')
      act(() => renderer?.unmount())

      const chat = mount(
        fakeController({ activeSessionTab: chatTab, showNativeChat: true }).controller
      )
      expect(chat.lookup(AGENT_WHEEL_ACTION_IDS.toggleView)?.label).toBe('Terminal view')
    })

    it('is unavailable where there is only one view', () => {
      // A structured agent session is a chat with no terminal behind it.
      const structured = mount(fakeController().controller)
      expect(structured.lookup(AGENT_WHEEL_ACTION_IDS.toggleView)?.availability).toBe('unavailable')
      act(() => renderer?.unmount())

      const plain = mount(
        fakeController({ activeSessionTab: { id: 'p', type: 'terminal' } }).controller
      )
      expect(plain.lookup(AGENT_WHEEL_ACTION_IDS.toggleView)?.availability).toBe('unavailable')
    })
  })

  describe('toggle input', () => {
    it('shows and hides the text-entry strip, and says which it will do', () => {
      const { controller } = fakeController()
      const registry = mount(controller, { padAttached: true })
      const toggle = registry.lookup(AGENT_WHEEL_ACTION_IDS.toggleInput)

      expect(toggle?.availability).toBe('available')
      expect(toggle?.label).toBe('Show input')
      act(() => {
        if (toggle !== null && !isMenuBinding(toggle)) {
          void toggle.run()
        }
      })

      expect(registry.lookup(AGENT_WHEEL_ACTION_IDS.toggleInput)?.label).toBe('Hide input')
    })
  })

  describe('focus mode', () => {
    it('is available and flips focus mode, updating its label', () => {
      const { controller } = fakeController()
      const registry = mount(controller, { padAttached: true })
      const toggle = registry.lookup(NAVIGATION_WHEEL_ACTION_IDS.focusMode)

      expect(toggle?.availability).toBe('available')
      expect(toggle?.label).toBe('Focus mode')
      act(() => {
        if (toggle !== null && !isMenuBinding(toggle)) {
          void toggle.run()
        }
      })

      expect(registry.lookup(NAVIGATION_WHEEL_ACTION_IDS.focusMode)?.label).toBe('Exit focus mode')
    })
  })

  describe('shortcuts', () => {
    it('is available and flips shortcuts hidden, updating its label', () => {
      const { controller } = fakeController()
      const registry = mount(controller, { padAttached: true })
      const toggle = registry.lookup(NAVIGATION_WHEEL_ACTION_IDS.shortcuts)

      expect(toggle?.availability).toBe('available')
      expect(toggle?.label).toBe('Hide shortcuts')
      act(() => {
        if (toggle !== null && !isMenuBinding(toggle)) {
          void toggle.run()
        }
      })

      expect(registry.lookup(NAVIGATION_WHEEL_ACTION_IDS.shortcuts)?.label).toBe('Show shortcuts')
    })
  })

  it('retracts all of it when the session goes', () => {
    const registry = mount(fakeController().controller)
    expect(registry.ids()).toHaveLength(6)

    act(() => renderer?.unmount())
    renderer = null

    expect(registry.ids()).toEqual([])
  })
})
