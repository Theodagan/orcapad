import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import {
  useAgentControllerBinding,
  type AgentControllerBindingOptions
} from './use-agent-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Overrides = Partial<AgentControllerBindingOptions>

function mount(overrides: Overrides = {}) {
  const onStop = vi.fn()
  const scrollTo = vi.fn()
  const onDetachFromTail = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false
  let accepted = false

  function Agent(): ReactNode {
    useAgentControllerBinding({
      sessionId: 'wt-1',
      canStop: true,
      onStop,
      scrollTo,
      onDetachFromTail,
      ...overrides
    })
    const controller = useController()
    dispatch = controller.dispatchIntent
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(ControllerProvider, {}, createElement(Agent)))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    dispatch: (intent: ControllerIntent) => {
      act(() => {
        accepted = dispatch(intent)
      })
      return accepted
    },
    onStop,
    scrollTo,
    onDetachFromTail
  }
}

describe('agent controller binding', () => {
  // BIND-AC5: exactly once, through the existing stop.
  it('stops the focused turn through the view’s own callback', () => {
    const agent = mount()

    agent.dispatch({ kind: 'stop' })

    expect(agent.onStop).toHaveBeenCalledTimes(1)
  })

  // The view already decides when a turn can be stopped; the controller must not out-reach it.
  it('offers no stop when the view says the turn cannot be stopped', () => {
    const agent = mount({ canStop: false })

    expect(agent.dispatch({ kind: 'stop' })).toBe(false)
    expect(agent.onStop).not.toHaveBeenCalled()
  })

  it('scrolls the transcript, releasing tail-follow only on the way up', () => {
    const agent = mount()

    agent.dispatch({ kind: 'scroll', direction: 'up', velocity: 1 })
    expect(agent.onDetachFromTail).toHaveBeenCalledTimes(1)

    agent.dispatch({ kind: 'scroll', direction: 'down', velocity: 1 })
    expect(agent.onDetachFromTail).toHaveBeenCalledTimes(1)
    expect(agent.scrollTo).toHaveBeenCalledTimes(2)
  })

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

  it('still stops the turn while a prompt is on screen', () => {
    const agent = mount({ ask: { questions: [] }, onCancelAsk: vi.fn() })

    agent.dispatch({ kind: 'stop' })

    expect(agent.onStop).toHaveBeenCalledTimes(1)
  })

  it('stops receiving intents once unmounted', () => {
    const agent = mount()
    act(() => agent.renderer.unmount())

    agent.dispatch({ kind: 'stop' })

    expect(agent.onStop).not.toHaveBeenCalled()
  })
})
