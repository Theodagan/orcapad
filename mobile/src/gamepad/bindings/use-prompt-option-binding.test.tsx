import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { useAgentControllerBinding } from './use-agent-controller-binding'
import { usePromptOptionBinding } from './use-prompt-option-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

function mount(optionCount = 3, withAgentBeneath = false) {
  const onMove = vi.fn()
  const onChoose = vi.fn()
  const onAdvance = vi.fn()
  const onRetreat = vi.fn()
  const onCancel = vi.fn()
  const agentStop = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false

  function Chat(): ReactNode {
    if (withAgentBeneath) {
      // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed for the life of the mount.
      useAgentControllerBinding({
        sessionId: 'wt-1',
        canStop: true,
        onStop: agentStop,
        scrollTo: vi.fn(),
        onDetachFromTail: vi.fn()
      })
    }
    return createElement(Card)
  }

  function Card(): ReactNode {
    usePromptOptionBinding({
      promptKey: 'ask:0',
      optionCount,
      onMove,
      onChoose,
      onAdvance,
      onRetreat,
      onCancel
    })
    dispatch = useController().dispatchIntent
    return null
  }

  let renderer: ReactTestRenderer | null = null
  act(() => {
    renderer = create(createElement(ControllerProvider, {}, createElement(Chat)))
  })
  if (renderer === null) {
    throw new Error('renderer did not mount')
  }

  return {
    renderer,
    press: (intent: ControllerIntent) => act(() => void dispatch(intent)),
    onMove,
    onChoose,
    onAdvance,
    onRetreat,
    onCancel,
    agentStop
  }
}

describe('answering an agent prompt with a controller', () => {
  it('moves the cursor and chooses with A', () => {
    const card = mount()

    card.press({ kind: 'move-selection', direction: 'down' })
    expect(card.onMove).toHaveBeenCalledWith('down')

    card.press({ kind: 'confirm' })
    expect(card.onChoose).toHaveBeenCalledTimes(1)
  })

  it('advances and retreats on the horizontal axis', () => {
    const card = mount()

    card.press({ kind: 'move-horizontal', direction: 'right' })
    expect(card.onAdvance).toHaveBeenCalledTimes(1)

    card.press({ kind: 'move-horizontal', direction: 'left' })
    expect(card.onRetreat).toHaveBeenCalledTimes(1)
  })

  it('dismisses with B', () => {
    const card = mount()

    card.press({ kind: 'back' })

    expect(card.onCancel).toHaveBeenCalledTimes(1)
  })

  // BIND-T4's refusal still stands: A must not pretend to choose from an empty list.
  it('chooses nothing when there are no options', () => {
    const card = mount(0)

    card.press({ kind: 'confirm' })
    card.press({ kind: 'move-selection', direction: 'down' })

    expect(card.onChoose).not.toHaveBeenCalled()
    expect(card.onMove).not.toHaveBeenCalled()
  })

  // The card mounts inside the chat, so it takes the buttons while it is up — and gives them
  // back when it closes, which is what the focus registry's newest-mount rule is for.
  it('takes confirm from the agent view beneath it, and returns it', () => {
    const card = mount(3, true)

    card.press({ kind: 'confirm' })
    expect(card.onChoose).toHaveBeenCalledTimes(1)

    act(() => card.renderer.unmount())
    expect(card.agentStop).not.toHaveBeenCalled()
  })
})
