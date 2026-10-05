import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../gamepad/controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../gamepad/controller-input/controller-sample'
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
            caret: 0,
            onCaretChange: () => {},
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

/**
 * `005` round 2: with a pad attached the draft is drawn with a caret, the D-pad moves it, and `B`
 * deletes a word. A touch hands over to the real keyboard input.
 */
describe('editing a chat draft with the pad', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

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

  function mount(options: { value: string; caret: number; padAttached?: boolean }) {
    const onChangeText = vi.fn()
    const onCaretChange = vi.fn()
    const { reader, publish } = fakeReader()
    const held: { controller: ReturnType<typeof useController> | null } = { controller: null }
    function Probe(): ReactNode {
      held.controller = useController()
      return null
    }
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader },
          createElement(Probe),
          createElement(MobileNativeChatComposer, {
            value: options.value,
            onChangeText,
            caret: options.caret,
            onCaretChange,
            onSend: () => Promise.resolve(true),
            sendSurfaceId: 'tab-a',
            getSendCompletionGeneration: () => 0,
            getComposerEditGeneration: () => 0
          })
        )
      )
    })
    if (options.padAttached !== false) {
      act(() => publish(neutralSample(1, true)))
    }
    const press = (
      intent: Parameters<NonNullable<typeof held.controller>['dispatchIntent']>[0]
    ) => {
      let taken = false
      act(() => {
        taken = held.controller?.dispatchIntent(intent) ?? false
      })
      return taken
    }
    return { onChangeText, onCaretChange, press }
  }

  const has = (type: string): boolean => (renderer?.root.findAllByType(type).length ?? 0) > 0

  it('draws a caret field instead of the keyboard input while a pad is attached', () => {
    mount({ value: 'fix the bug', caret: 3 })

    expect(has('TextInput')).toBe(false)
    expect(
      renderer?.root.findAll((node) => node.props.testID === 'native-chat-composer-caret-field')
    ).not.toHaveLength(0)
  })

  it('keeps the plain input when no pad is attached', () => {
    mount({ value: 'fix the bug', caret: 3, padAttached: false })

    expect(has('TextInput')).toBe(true)
  })

  it('moves the caret with the D-pad, by character sideways and by line up and down', () => {
    const chat = mount({ value: 'one\ntwo', caret: 5 })

    expect(chat.press({ kind: 'move-horizontal', direction: 'left' })).toBe(true)
    expect(chat.onCaretChange).toHaveBeenLastCalledWith(4)
    expect(chat.press({ kind: 'move-selection', direction: 'up' })).toBe(true)
    expect(chat.onCaretChange).toHaveBeenLastCalledWith(1)
  })

  it('deletes the word before the caret on B, and leaves the caret where the word began', () => {
    const chat = mount({ value: 'send it now', caret: 11 })

    expect(chat.press({ kind: 'back' })).toBe(true)

    expect(chat.onChangeText).toHaveBeenCalledWith('send it ')
    expect(chat.onCaretChange).toHaveBeenLastCalledWith(8)
  })

  it('lets B through when the caret is at the start, so it can still answer something else', () => {
    const chat = mount({ value: 'send it now', caret: 0 })

    expect(chat.press({ kind: 'back' })).toBe(false)
    expect(chat.onChangeText).not.toHaveBeenCalled()
  })

  it('takes no D-pad while the draft is empty, so the transcript can still scroll', () => {
    const chat = mount({ value: '', caret: 0 })

    expect(chat.press({ kind: 'move-selection', direction: 'down' })).toBe(false)
  })

  it('hands over to the keyboard input on a touch, with the caret where it was', () => {
    mount({ value: 'fix the bug', caret: 3 })
    const field = renderer?.root.findAll(
      (node) => node.props.testID === 'native-chat-composer-caret-field'
    )[0]

    act(() => field?.props.onPress())

    expect(has('TextInput')).toBe(true)
    expect(renderer?.root.findByType('TextInput').props.selection).toEqual({ start: 3, end: 3 })
  })
})
