import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { createWheelRegistry } from '../wheel/wheel-registry'
import { AGENT_WHEEL_ACTION_IDS } from './agent-wheel-action-ids'
import {
  useAgentControllerBinding,
  type AgentControllerBindingOptions
} from './use-agent-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Overrides = Partial<AgentControllerBindingOptions>

const scroll = (
  direction: 'up' | 'down',
  velocity: number,
  elapsedMs = 16,
  begins = false
): ControllerIntent => ({ kind: 'scroll', direction, velocity, elapsedMs, begins })

function mount(overrides: Overrides = {}) {
  const registry = createWheelRegistry()
  const onStop = vi.fn()
  const scrollBy = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false
  let accepted = false
  let snapshot: () => {
    focusedZone: string | null
    labels: Record<string, string | undefined>
  } = () => ({ focusedZone: null, labels: {} })

  function Agent(): ReactNode {
    useAgentControllerBinding({
      sessionId: 'wt-1',
      canStop: true,
      onStop,
      scrollBy,
      ...overrides
    })
    const controller = useController()
    dispatch = controller.dispatchIntent
    snapshot = controller.focus.snapshot
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(
      createElement(
        ControllerProvider,
        { registerWheelAction: registry.register },
        createElement(Agent)
      )
    )
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    registry,
    snapshot: () => snapshot(),
    dispatch: (intent: ControllerIntent) => {
      act(() => {
        accepted = dispatch(intent)
      })
      return accepted
    },
    onStop,
    scrollBy
  }
}

describe('agent controller binding', () => {
  describe('stopping (moved from X to the wheel in 005)', () => {
    // BIND-AC5: exactly once, through the existing stop.
    it('stops the focused turn through the view’s own callback, from the wheel', () => {
      const agent = mount()

      agent.registry.lookup(AGENT_WHEEL_ACTION_IDS.stop)?.run()

      expect(agent.onStop).toHaveBeenCalledTimes(1)
    })

    // The view already decides when a turn can be stopped; the wheel must not out-reach it.
    it('offers the stop unavailable when the view says the turn cannot be stopped', () => {
      const agent = mount({ canStop: false })

      expect(agent.registry.lookup(AGENT_WHEEL_ACTION_IDS.stop)?.availability).toBe('unavailable')
    })

    it('no longer answers a stop intent at all, because no control sends one', () => {
      const agent = mount()

      // The intent vocabulary has no `stop`; X is the zone switch.
      expect(agent.dispatch({ kind: 'switch-zone' })).toBe(false)
      expect(agent.onStop).not.toHaveBeenCalled()
    })
  })

  describe('scroll', () => {
    it('moves the transcript from where it is, by a distance from pressure and time', () => {
      const agent = mount()

      for (let at = 0; at < 1000; at += 16) {
        agent.dispatch(scroll('down', 1, 16, at === 0))
      }

      const total = agent.scrollBy.mock.calls.reduce((sum, [delta]) => sum + delta, 0)
      expect(total).toBeGreaterThan(850)
      expect(total).toBeLessThan(950)
    })

    it('scrolls up with a negative distance', () => {
      const agent = mount()

      agent.dispatch(scroll('up', 1, 16, true))

      expect(agent.scrollBy.mock.calls[0]?.[0]).toBeLessThan(0)
    })

    it('steps by about three lines on a D-pad press, like an arrow key in a reader', () => {
      const agent = mount()

      agent.dispatch({ kind: 'move-selection', direction: 'down' })
      agent.dispatch({ kind: 'move-selection', direction: 'up' })

      expect(agent.scrollBy.mock.calls.map(([delta]) => delta)).toEqual([72, -72])
    })
  })

  describe('interventions', () => {
    // `001` §7 step 4: with no prompt on screen the agent view does not take A or B at all.
    it('accepts neither confirm nor back with no intervention on screen', () => {
      const agent = mount()

      expect(agent.dispatch({ kind: 'confirm' })).toBe(false)
      expect(agent.dispatch({ kind: 'back' })).toBe(false)
    })

    it('answers a permission with A and dismisses it with B', () => {
      const onRespondPermission = vi.fn()
      const onCancelPrompt = vi.fn()
      const agent = mount({
        permission: { options: [{ send: '1' }, { send: 'n' }], prompt: undefined },
        onRespondPermission,
        onCancelPrompt
      })

      expect(agent.dispatch({ kind: 'confirm' })).toBe(true)
      expect(onRespondPermission).toHaveBeenCalledWith('1')

      expect(agent.dispatch({ kind: 'back' })).toBe(true)
      expect(onCancelPrompt).toHaveBeenCalledTimes(1)
    })

    it('takes B but not A while an ask is up, because an ask has no default', () => {
      const onCancelAsk = vi.fn()
      const agent = mount({ ask: { questions: [] }, onCancelAsk })

      expect(agent.dispatch({ kind: 'confirm' })).toBe(false)
      expect(agent.dispatch({ kind: 'back' })).toBe(true)
      expect(onCancelAsk).toHaveBeenCalledTimes(1)
    })

    it('still offers the stop on the wheel while a prompt is on screen', () => {
      const agent = mount({ ask: { questions: [] }, onCancelAsk: vi.fn() })

      expect(agent.registry.lookup(AGENT_WHEEL_ACTION_IDS.stop)?.availability).toBe('available')
    })
  })

  it('lives in the agent zone, and describes itself in the words the hint bar shows', () => {
    const agent = mount()

    expect(agent.snapshot().focusedZone).toBe('agent')
    expect(agent.snapshot().labels).toMatchObject({ scroll: 'Scroll', 'move-selection': 'Scroll' })
  })

  it('stops receiving intents, and retracts the stop, once unmounted', () => {
    const agent = mount()
    act(() => agent.renderer.unmount())

    expect(agent.dispatch(scroll('down', 1, 16, true))).toBe(false)
    expect(agent.registry.lookup(AGENT_WHEEL_ACTION_IDS.stop)).toBeNull()
  })
})
