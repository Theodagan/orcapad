import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControllerProvider } from '../gamepad/controller-provider'
import { AGENT_WHEEL_ACTION_IDS } from '../gamepad/bindings/agent-wheel-action-ids'
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

type Tab = { id: string; type: 'agent-session' | 'terminal' | 'markdown'; agent?: string }

function fakeController(overrides: Record<string, unknown> = {}) {
  const sendRequest = vi.fn()
  const handleCloseSessionTab = vi.fn()
  const handleCreateTerminal = vi.fn()
  const handleCreateBrowser = vi.fn()
  const controller = {
    client: { sendRequest },
    worktreeId: 'repo-1::/work/tree',
    connState: 'connected',
    activeSessionTab: { id: 't1', type: 'agent-session' } as Tab,
    handleCloseSessionTab,
    handleCreateTerminal,
    handleCreateBrowser,
    ...overrides
  }
  return {
    controller,
    sendRequest,
    handleCloseSessionTab,
    handleCreateTerminal,
    handleCreateBrowser
  }
}

describe('session wheel actions', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    loadOptions.mockReset()
  })

  function mount(controller: object) {
    const registry = createWheelRegistry()
    function Harness(): ReactNode {
      // SAFETY: the hook reads a handful of fields, all of which the fake supplies.
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: see above.
      useSessionWheelActions(controller as MobileSessionController)
      return null
    }
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { registerWheelAction: registry.register },
          createElement(Harness)
        )
      )
    })
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

  describe('web', () => {
    const scanResult = {
      platform: 'darwin',
      scannedAt: 0,
      ports: [
        {
          id: 'p',
          kind: 'workspace',
          bindHost: '0.0.0.0',
          connectHost: 'localhost',
          port: 5173,
          processName: 'vite',
          protocol: 'http',
          owner: {
            worktreeId: 'repo-1::/work/tree',
            repoId: 'repo-1',
            displayName: 'w',
            path: '/w',
            confidence: 'cwd'
          }
        }
      ]
    }

    it('scans the repo and offers its open ports, then a way to enter an address', async () => {
      const { controller, sendRequest, handleCreateBrowser } = fakeController()
      sendRequest.mockResolvedValue({ ok: true, result: scanResult })
      const registry = mount(controller)

      const web = registry.lookup(AGENT_WHEEL_ACTION_IDS.web)
      const entries = web !== null && isMenuBinding(web) ? await web.menu() : []

      expect(sendRequest).toHaveBeenCalledWith('workspacePorts.scan', { repoId: 'repo-1' })
      expect(entries.map((entry) => entry.label)).toEqual([':5173 vite', 'Enter URL…'])
      entries[0]?.run()
      expect(handleCreateBrowser).toHaveBeenCalledWith('http://localhost:5173')
    })

    it('still offers the address entry when the scan fails', async () => {
      const { controller, sendRequest } = fakeController()
      sendRequest.mockResolvedValue({ ok: false, error: { message: 'no' } })
      const registry = mount(controller)

      const web = registry.lookup(AGENT_WHEEL_ACTION_IDS.web)
      const entries = web !== null && isMenuBinding(web) ? await web.menu() : []

      expect(entries.map((entry) => entry.label)).toEqual(['Enter URL…'])
    })
  })

  it('retracts all of it when the session goes', () => {
    const registry = mount(fakeController().controller)
    expect(registry.ids()).toHaveLength(3)

    act(() => renderer?.unmount())
    renderer = null

    expect(registry.ids()).toEqual([])
  })
})
