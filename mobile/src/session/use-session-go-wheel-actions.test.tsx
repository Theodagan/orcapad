import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControllerProvider } from '../gamepad/controller-provider'
import { GO_ACTION_IDS } from '../gamepad/bindings/wheel-action-ids'
import { createWheelRegistry, isRunnableAction } from '../gamepad/wheel/wheel-registry'
import { useSessionGoWheelActions } from './use-session-go-wheel-actions'
import type { MobileSessionController } from './use-mobile-session-controller'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

function fakeController(showAgentSessionHistoryAction: boolean) {
  return {
    showAgentSessionHistoryAction,
    handlePanelTap: vi.fn(),
    openAgentSessionHistory: vi.fn()
  }
}

describe('session GO wheel actions', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(controller: ReturnType<typeof fakeController>) {
    const registry = createWheelRegistry()
    function Harness(): ReactNode {
      // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the hook reads three fields, all of which the fake supplies.
      useSessionGoWheelActions(controller as unknown as MobileSessionController)
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

  it('opens Files and Changes through the header’s own panel taps', () => {
    const controller = fakeController(true)
    const registry = mount(controller)

    const files = registry.lookup(GO_ACTION_IDS.files)
    const changes = registry.lookup(GO_ACTION_IDS.changes)
    if (isRunnableAction(files) && isRunnableAction(changes)) {
      void files.run()
      void changes.run()
    }

    expect(controller.handlePanelTap.mock.calls).toEqual([['files'], ['sourceControl']])
  })

  it('opens agent history where the session supports it', () => {
    const controller = fakeController(true)
    const registry = mount(controller)

    const history = registry.lookup(GO_ACTION_IDS.history)
    if (isRunnableAction(history)) {
      void history.run()
    }

    expect(controller.openAgentSessionHistory).toHaveBeenCalledTimes(1)
  })

  it('leaves History unavailable, with a reason, where there is none', () => {
    const registry = mount(fakeController(false))

    expect(registry.lookup(GO_ACTION_IDS.history)?.availability).toBe('unavailable')
    expect(registry.lookup(GO_ACTION_IDS.history)?.reason).toBe('No agent history here')
  })

  it('retracts all three when the session goes', () => {
    const registry = mount(fakeController(true))
    expect(registry.ids()).toHaveLength(3)

    act(() => renderer?.unmount())
    renderer = null

    expect(registry.ids()).toEqual([])
  })
})
