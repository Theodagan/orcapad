import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveDictation } from '../gamepad/bindings/active-dictation'
import { MobileDictationStatusPill } from './MobileDictationStatusPill'

let dictation: ActiveDictation | null = null
vi.mock('../gamepad/controller-provider', () => ({ useActiveDictation: () => dictation }))
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 24 }) }))
vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: { create: <T,>(styles: T) => styles }
}))

function render(): ReactTestRenderer {
  let screen: ReactTestRenderer | null = null
  act(() => {
    screen = create(createElement(MobileDictationStatusPill))
  })
  if (screen === null) {
    throw new Error('Pill did not mount')
  }
  return screen
}

describe('dictation status pill', () => {
  it('is absent when idle and no hint is present', () => {
    dictation = { activity: 'idle', canStart: true, toggle: vi.fn(), onUnavailable: vi.fn() }
    expect(render().toJSON()).toBeNull()
  })

  it('shows recording with a direct Stop action', () => {
    const stop = vi.fn()
    dictation = {
      activity: 'recording',
      canStart: false,
      toggle: vi.fn(),
      onUnavailable: vi.fn(),
      stop
    }
    const screen = render()
    expect(screen.root.findAllByType('Text').map((text) => text.props.children)).toEqual([
      'Recording',
      'Stop'
    ])
    act(() => screen.root.findByType('Pressable').props.onPress())
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('offers Cancel while starting and a setup action on the brief hint', () => {
    const cancel = vi.fn()
    dictation = {
      activity: 'starting',
      canStart: false,
      toggle: vi.fn(),
      onUnavailable: vi.fn(),
      cancel
    }
    const screen = render()
    expect(screen.root.findByType('Pressable').props.accessibilityLabel).toBe('Cancel dictation')
    act(() => screen.root.findByType('Pressable').props.onPress())
    expect(cancel).toHaveBeenCalledTimes(1)

    const onNoticeAction = vi.fn()
    dictation = {
      activity: 'idle',
      notice: 'Dictation needs setup',
      onNoticeAction,
      canStart: false,
      toggle: vi.fn(),
      onUnavailable: vi.fn()
    }
    act(() => screen.update(createElement(MobileDictationStatusPill)))
    expect(screen.root.findAllByType('Text').map((text) => text.props.children)).toEqual([
      'Dictation needs setup',
      'Set up'
    ])
    act(() => screen.root.findByType('Pressable').props.onPress())
    expect(onNoticeAction).toHaveBeenCalledTimes(1)
  })
})
