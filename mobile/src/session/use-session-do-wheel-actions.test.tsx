import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../gamepad/controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../gamepad/controller-input/controller-sample'
import { ControllerProvider, useControllerBinding } from '../gamepad/controller-provider'
import { DO_ACTION_IDS, VIEW_ACTION_IDS } from '../gamepad/bindings/wheel-action-ids'
import {
  createWheelRegistry,
  isMenuBinding,
  type WheelMenuEntry,
  type WheelRegistry
} from '../gamepad/wheel/wheel-registry'
import { useSessionDoWheelActions } from './use-session-do-wheel-actions'
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
  const dismissSoftwareKeyboard = vi.fn()
  const handleAccessoryKey = vi.fn()
  const handlePaste = vi.fn()
  const activeSessionTab: Tab = { id: 't1', type: 'agent-session' }
  const controller = {
    client: { sendRequest },
    worktreeId: 'repo-1::/work/tree',
    connState: 'connected',
    activeSessionTab,
    showNativeChat: false,
    nativeChatTranscriptIsLocalReadable: true,
    toggleTabChatView,
    keyboardLift: 0,
    dismissSoftwareKeyboard,
    handleCloseSessionTab,
    handleCreateTerminal,
    handleAccessoryKey,
    handlePaste,
    canPaste: false,
    ...overrides
  }
  return {
    controller,
    sendRequest,
    handleCloseSessionTab,
    handleCreateTerminal,
    toggleTabChatView,
    dismissSoftwareKeyboard,
    handleAccessoryKey,
    handlePaste
  }
}

/** The entries a DO submenu opens with right now. */
async function menuOf(registry: WheelRegistry, id: string): Promise<readonly WheelMenuEntry[]> {
  const binding = registry.lookup(id)
  return binding !== null && isMenuBinding(binding) ? await binding.menu() : []
}

type FakeController = ReturnType<typeof fakeController>['controller']

describe('session DO wheel actions', () => {
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
      useSessionDoWheelActions(controller as unknown as MobileSessionController)
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
    it('closes exactly the tab in front of you through the session’s own close', () => {
      const { controller, handleCloseSessionTab } = fakeController()
      const registry = mount(controller)

      const close = registry.lookup(DO_ACTION_IDS.close)
      expect(close?.label).toBe('Close tab')
      expect(close?.availability).toBe('available')
      if (close !== null && !isMenuBinding(close)) {
        close.run()
      }

      expect(handleCloseSessionTab).toHaveBeenCalledWith(controller.activeSessionTab)
    })

    it('closes any kind of tab, not only an agent', () => {
      const plain = mount(
        fakeController({ activeSessionTab: { id: 't', type: 'terminal' } }).controller
      )
      expect(plain.lookup(DO_ACTION_IDS.close)?.availability).toBe('available')
      act(() => renderer?.unmount())

      const note = mount(
        fakeController({ activeSessionTab: { id: 'n', type: 'markdown' } }).controller
      )
      expect(note.lookup(DO_ACTION_IDS.close)?.availability).toBe('available')
    })

    it('is unavailable while disconnected, and with no tab at all', () => {
      const offline = mount(fakeController({ connState: 'reconnecting' }).controller)
      expect(offline.lookup(DO_ACTION_IDS.close)?.availability).toBe('unavailable')
      act(() => renderer?.unmount())

      const empty = mount(fakeController({ activeSessionTab: null }).controller)
      expect(empty.lookup(DO_ACTION_IDS.close)?.availability).toBe('unavailable')
    })
  })

  describe('keys', () => {
    const terminalTab = { id: 't', type: 'terminal' }

    it('sends the shortcut row’s keys through the accessory key path', async () => {
      const { controller, handleAccessoryKey } = fakeController({ activeSessionTab: terminalTab })
      const registry = mount(controller)

      expect(registry.lookup(DO_ACTION_IDS.keys)?.availability).toBe('available')
      const entries = await menuOf(registry, DO_ACTION_IDS.keys)
      expect(entries.map((entry) => entry.label)).toEqual([
        'Ctrl+C',
        'Esc',
        'Tab',
        'Shift+Tab',
        'Enter',
        'Ctrl+D',
        'Ctrl+L'
      ])
      entries[0]?.run()
      expect(handleAccessoryKey).toHaveBeenCalledWith({ bytes: '\x03' })
    })

    it('offers Paste only when there is something to paste', async () => {
      const { controller, handlePaste } = fakeController({
        activeSessionTab: terminalTab,
        canPaste: true
      })
      const registry = mount(controller)

      const entries = await menuOf(registry, DO_ACTION_IDS.keys)
      expect(entries.at(-1)?.label).toBe('Paste')
      entries.at(-1)?.run()
      expect(handlePaste).toHaveBeenCalledTimes(1)
    })

    it('is unavailable off a terminal, and says why', () => {
      const registry = mount(fakeController().controller)

      expect(registry.lookup(DO_ACTION_IDS.keys)?.availability).toBe('unavailable')
      expect(registry.lookup(DO_ACTION_IDS.keys)?.reason).toBe('Keys need a terminal')
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

      const launch = registry.lookup(DO_ACTION_IDS.launch)
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

      expect(registry.lookup(DO_ACTION_IDS.launch)?.availability).toBe('unavailable')
    })
  })

  describe('view', () => {
    const chatTab = { id: 'c', type: 'terminal', agent: 'claude' }
    const entryOf = async (registry: WheelRegistry, id: string) =>
      (await menuOf(registry, DO_ACTION_IDS.view)).find((entry) => entry.id === id)

    it('opens chat/terminal, focus mode, shortcuts and input, in that order', async () => {
      const registry = mount(fakeController({ activeSessionTab: chatTab }).controller)

      const entries = await menuOf(registry, DO_ACTION_IDS.view)
      expect(entries.map((entry) => entry.id)).toEqual([
        VIEW_ACTION_IDS.chatTerminal,
        VIEW_ACTION_IDS.focusMode,
        VIEW_ACTION_IDS.shortcuts,
        VIEW_ACTION_IDS.input
      ])
    })

    it('switches the tab between chat and terminal through the tab menu’s own toggle', async () => {
      const { controller, toggleTabChatView } = fakeController({ activeSessionTab: chatTab })
      const registry = mount(controller)

      const toggle = await entryOf(registry, VIEW_ACTION_IDS.chatTerminal)
      expect(toggle?.availability).toBe('available')
      expect(toggle?.label).toBe('Chat view')
      toggle?.run()

      expect(toggleTabChatView).toHaveBeenCalledWith('c')
    })

    it('offers chat/terminal only where there are two views', async () => {
      // A structured agent session is a chat with no terminal behind it.
      const structured = mount(fakeController().controller)
      expect((await entryOf(structured, VIEW_ACTION_IDS.chatTerminal))?.availability).toBe(
        'unavailable'
      )
    })

    it('shows and hides the text-entry strip, and says which it will do', async () => {
      const registry = mount(fakeController().controller, { padAttached: true })
      const toggle = await entryOf(registry, VIEW_ACTION_IDS.input)
      expect(toggle?.label).toBe('Show input')

      act(() => void toggle?.run())

      expect((await entryOf(registry, VIEW_ACTION_IDS.input))?.label).toBe('Hide input')
    })

    it('hides and shows the shortcut row', async () => {
      const registry = mount(fakeController().controller, { padAttached: true })
      const toggle = await entryOf(registry, VIEW_ACTION_IDS.shortcuts)
      expect(toggle?.label).toBe('Hide shortcuts')

      act(() => void toggle?.run())

      expect((await entryOf(registry, VIEW_ACTION_IDS.shortcuts))?.label).toBe('Show shortcuts')
    })
  })

  describe('focus mode', () => {
    it('is registered on its own for Select, and flips focus mode, updating its label', () => {
      const { controller } = fakeController()
      const registry = mount(controller, { padAttached: true })
      const toggle = registry.lookup(VIEW_ACTION_IDS.focusMode)

      expect(toggle?.availability).toBe('available')
      expect(toggle?.label).toBe('Focus mode')
      act(() => {
        if (toggle !== null && !isMenuBinding(toggle)) {
          void toggle.run()
        }
      })

      expect(registry.lookup(VIEW_ACTION_IDS.focusMode)?.label).toBe('Exit focus mode')
    })
  })

  describe('keyboard', () => {
    function mountWithStore(overrides: Record<string, unknown>) {
      const { controller, dismissSoftwareKeyboard } = fakeController(overrides)
      const registry = createWheelRegistry()
      const { reader, publish } = fakeReader()
      const held: { input: ReturnType<typeof useControllerBinding>['inputVisibility'] | null } = {
        input: null
      }
      function Probe(): ReactNode {
        held.input = useControllerBinding().inputVisibility
        return null
      }
      function Session(): ReactNode {
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the hook reads a handful of fields, all of which the fake supplies.
        useSessionDoWheelActions(controller as unknown as MobileSessionController)
        return null
      }
      // A fresh element each time, or React sees nothing changed and skips the render.
      const tree = () =>
        createElement(
          ControllerProvider,
          { registerWheelAction: registry.register, reader },
          createElement(Probe),
          createElement(Session)
        )
      act(() => {
        renderer = create(tree())
      })
      act(() => publish(neutralSample(1, true)))
      const press = (): void => {
        const binding = registry.lookup(DO_ACTION_IDS.keyboard)
        act(() => {
          if (binding !== null && !isMenuBinding(binding)) {
            void binding.run()
          }
        })
      }
      return {
        controller,
        registry,
        press,
        dismissSoftwareKeyboard,
        input: () => held.input,
        rerender: () => act(() => renderer?.update(tree()))
      }
    }

    it('is offered where there is a field to type in, and not on a page or a file', () => {
      const terminal = mountWithStore({ activeSessionTab: { id: 't', type: 'terminal' } })
      expect(terminal.registry.lookup(DO_ACTION_IDS.keyboard)?.availability).toBe('available')
      act(() => renderer?.unmount())

      const chat = mountWithStore({})
      expect(chat.registry.lookup(DO_ACTION_IDS.keyboard)?.availability).toBe('available')
      act(() => renderer?.unmount())

      const note = mountWithStore({ activeSessionTab: { id: 'n', type: 'markdown' } })
      expect(note.registry.lookup(DO_ACTION_IDS.keyboard)?.availability).toBe('unavailable')
    })

    it('asks for the keyboard, which puts the strip up for the field to focus', () => {
      const session = mountWithStore({})
      expect(session.registry.lookup(DO_ACTION_IDS.keyboard)?.label).toBe('Keyboard')

      session.press()

      expect(session.input()?.typing()).toBe(true)
      expect(session.input()?.visible()).toBe(true)
    })

    it('says Hide keyboard while it is up, and hides it', () => {
      const session = mountWithStore({ keyboardLift: 300 })
      expect(session.registry.lookup(DO_ACTION_IDS.keyboard)?.label).toBe('Hide keyboard')

      session.press()

      expect(session.dismissSoftwareKeyboard).toHaveBeenCalledTimes(1)
      expect(session.input()?.typing()).toBe(false)
    })

    it('lets the strip go once the keyboard has come up and gone again', () => {
      const session = mountWithStore({})
      session.press()

      session.controller.keyboardLift = 300
      session.rerender()
      expect(session.input()?.typing()).toBe(true)

      session.controller.keyboardLift = 0
      session.rerender()
      expect(session.input()?.typing()).toBe(false)
    })
  })

  describe('when the session ends', () => {
    it('puts focus mode and the hidden shortcuts back, since they belong to the session', () => {
      const { controller } = fakeController()
      const registry = createWheelRegistry()
      const { reader, publish } = fakeReader()
      const held: { chrome: ReturnType<typeof useControllerBinding>['sessionChrome'] | null } = {
        chrome: null
      }
      function Probe(): ReactNode {
        held.chrome = useControllerBinding().sessionChrome
        return null
      }
      function Session(): ReactNode {
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the hook reads a handful of fields, all of which the fake supplies.
        useSessionDoWheelActions(controller as unknown as MobileSessionController)
        return null
      }
      const tree = (inSession: boolean) =>
        createElement(
          ControllerProvider,
          { registerWheelAction: registry.register, reader },
          createElement(Probe),
          inSession ? createElement(Session) : null
        )
      act(() => {
        renderer = create(tree(true))
      })
      act(() => publish(neutralSample(1, true)))
      act(() => {
        held.chrome?.toggleFocusMode()
        held.chrome?.toggleShortcuts()
      })
      expect(held.chrome?.focusMode()).toBe(true)

      act(() => renderer?.update(tree(false)))

      expect(held.chrome?.focusMode()).toBe(false)
      expect(held.chrome?.shortcutsHidden()).toBe(false)
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
