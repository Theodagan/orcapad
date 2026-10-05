import { createElement, type ReactNode } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import { useAgentControllerBinding } from './use-agent-controller-binding'
import { useComposerSendBinding } from './use-composer-send-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

const confirm: ControllerIntent = { kind: 'confirm' }

function mount(options: { canSend: boolean; withPendingPermission?: boolean }) {
  const onSend = vi.fn()
  const onRespondPermission = vi.fn()
  let dispatch: (intent: ControllerIntent) => boolean = () => false

  function Chat(): ReactNode {
    useAgentControllerBinding({
      sessionId: 'wt-1',
      canStop: false,
      scrollBy: vi.fn(),
      onRespondPermission,
      permission: options.withPendingPermission === true ? { options: [{ send: 'y' }] } : null
    })
    useComposerSendBinding({ composerKey: 'wt-1', canSend: options.canSend, onSend })
    dispatch = useController().dispatchIntent
    return null
  }

  act(() => {
    create(createElement(ControllerProvider, {}, createElement(Chat)))
  })
  return {
    press: (intent: ControllerIntent) => act(() => void dispatch(intent)),
    onSend,
    onRespondPermission
  }
}

describe('sending a composed message with A', () => {
  it('sends when there is something to send', () => {
    const chat = mount({ canSend: true })

    chat.press(confirm)

    expect(chat.onSend).toHaveBeenCalledTimes(1)
  })

  it('does not take A when a send would be refused', () => {
    const chat = mount({ canSend: false })

    chat.press(confirm)

    expect(chat.onSend).not.toHaveBeenCalled()
  })

  it('lets a waiting permission have A before the draft does', () => {
    const chat = mount({ canSend: true, withPendingPermission: true })

    chat.press(confirm)

    expect(chat.onRespondPermission).toHaveBeenCalledExactlyOnceWith('y')
    expect(chat.onSend).not.toHaveBeenCalled()
  })
})
