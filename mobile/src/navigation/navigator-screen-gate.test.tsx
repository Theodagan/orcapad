import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useControllerScreenActive } from '../gamepad/focus/screen-focus-gate'
import { NavigatorScreenGate } from './navigator-screen-gate'

function fakeNavigation(initiallyFocused: boolean) {
  const listeners = new Map<'focus' | 'blur', Set<() => void>>()
  let focused = initiallyFocused
  return {
    navigation: {
      isFocused: () => focused,
      addListener: (event: 'focus' | 'blur', listener: () => void) => {
        const set = listeners.get(event) ?? new Set()
        set.add(listener)
        listeners.set(event, set)
        return () => set.delete(listener)
      }
    },
    emit: (event: 'focus' | 'blur') => {
      focused = event === 'focus'
      listeners.get(event)?.forEach((listener) => listener())
    },
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0)
  }
}

describe('NavigatorScreenGate', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(pad: ReturnType<typeof fakeNavigation>) {
    const seen: boolean[] = []
    function Probe(): ReactNode {
      seen.push(useControllerScreenActive())
      return null
    }
    act(() => {
      renderer = create(
        createElement(NavigatorScreenGate, { navigation: pad.navigation }, createElement(Probe))
      )
    })
    return seen
  }

  it('starts from whether the screen is focused', () => {
    expect(mount(fakeNavigation(true)).at(-1)).toBe(true)
    act(() => renderer?.unmount())
    expect(mount(fakeNavigation(false)).at(-1)).toBe(false)
  })

  it('follows the screen as it loses and regains focus', () => {
    const pad = fakeNavigation(true)
    const seen = mount(pad)

    act(() => pad.emit('blur'))
    expect(seen.at(-1)).toBe(false)
    act(() => pad.emit('focus'))
    expect(seen.at(-1)).toBe(true)
  })

  it('stops listening when it unmounts', () => {
    const pad = fakeNavigation(true)
    mount(pad)
    expect(pad.listenerCount()).toBe(2)

    act(() => renderer?.unmount())
    renderer = null

    expect(pad.listenerCount()).toBe(0)
    expect(vi.isMockFunction(pad.emit)).toBe(false)
  })
})
