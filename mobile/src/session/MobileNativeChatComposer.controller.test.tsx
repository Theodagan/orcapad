import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useController } from '../gamepad/controller-provider'
import { MobileNativeChatComposer } from './MobileNativeChatComposer'

/**
 * `005` USE-R6 in a chat: with words in the composer, `A` sends them through the same path the send
 * button takes, so a dictated message goes out without a finger.
 */

vi.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  Keyboard: { dismiss: vi.fn() },
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, hairlineWidth: 1 },
  Text: 'Text',
  TextInput: 'TextInput',
  View: 'View'
}))
vi.mock('lucide-react-native', () => ({
  ArrowUp: 'ArrowUp',
  Check: 'Check',
  ChevronDown: 'ChevronDown',
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  ImagePlus: 'ImagePlus',
  Mic: 'Mic',
  Square: 'Square',
  X: 'X'
}))
vi.mock('../components/BottomDrawer', () => ({ BottomDrawer: () => null }))

describe('sending from a chat composer with A', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(options: { value: string; isAttaching?: boolean; send?: () => Promise<boolean> }) {
    const onSend = vi.fn(options.send ?? (() => Promise.resolve(true)))
    const held: { controller: ReturnType<typeof useController> | null } = { controller: null }
    function Probe(): ReactNode {
      held.controller = useController()
      return null
    }
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          {},
          createElement(Probe),
          createElement(MobileNativeChatComposer, {
            value: options.value,
            onChangeText: () => {},
            onSend,
            sendSurfaceId: 'tab-a',
            getSendCompletionGeneration: () => 0,
            getComposerEditGeneration: () => 0,
            isAttaching: options.isAttaching ?? false
          })
        )
      )
    })
    return {
      onSend,
      confirm: async () => {
        let taken = false
        await act(async () => {
          taken = held.controller?.dispatchIntent({ kind: 'confirm' }) ?? false
        })
        return taken
      }
    }
  }

  it('sends the draft as typed, through the composer’s own send', async () => {
    const chat = mount({ value: ' hello ' })

    expect(await chat.confirm()).toBe(true)

    expect(chat.onSend).toHaveBeenCalledExactlyOnceWith(' hello ')
  })

  it('does not take A when there is nothing to send, so it falls through to whatever else wants it', async () => {
    const chat = mount({ value: '   ' })

    expect(await chat.confirm()).toBe(false)

    expect(chat.onSend).not.toHaveBeenCalled()
  })

  it('does not take A while an attachment is still uploading', async () => {
    const chat = mount({ value: 'look at this', isAttaching: true })

    expect(await chat.confirm()).toBe(false)

    expect(chat.onSend).not.toHaveBeenCalled()
  })

  it('does not send twice while the first send is still in flight', async () => {
    const chat = mount({ value: 'go', send: () => new Promise<boolean>(() => {}) })

    await chat.confirm()
    expect(await chat.confirm()).toBe(false)

    expect(chat.onSend).toHaveBeenCalledTimes(1)
  })
})
