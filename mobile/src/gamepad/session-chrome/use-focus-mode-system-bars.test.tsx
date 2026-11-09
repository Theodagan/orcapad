import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider, useControllerBinding } from '../controller-provider'
import { useFocusModeSystemBars } from './use-focus-mode-system-bars'

const appState = vi.hoisted(() => {
  const listeners = new Map<string, Set<(state?: string) => void>>()
  return {
    listeners,
    emit: (type: string, state?: string) => listeners.get(type)?.forEach((fn) => fn(state))
  }
})

vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (type: string, listener: (state?: string) => void) => {
      const set = appState.listeners.get(type) ?? new Set()
      set.add(listener)
      appState.listeners.set(type, set)
      return { remove: () => set.delete(listener) }
    }
  },
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

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

describe('the system bars in focus mode', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount() {
    const setImmersive = vi.fn()
    const { reader, publish } = fakeReader()
    const held: { toggle: (() => void) | null } = { toggle: null }
    function Bars(): ReactNode {
      useFocusModeSystemBars(setImmersive)
      held.toggle = useControllerBinding().sessionChrome.toggleFocusMode
      return null
    }
    act(() => {
      renderer = create(createElement(ControllerProvider, { reader }, createElement(Bars)))
    })
    act(() => publish(neutralSample(1, true)))
    return {
      setImmersive,
      toggle: () => act(() => held.toggle?.()),
      disconnect: () => act(() => publish(neutralSample(2, false)))
    }
  }

  it('shows the bars once at boot, then leaves them alone until focus mode is on', () => {
    const bars = mount()

    expect(bars.setImmersive).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('hides them again when the app resumes or regains focus in focus mode', () => {
    const bars = mount()
    bars.toggle()
    bars.setImmersive.mockClear()

    act(() => appState.emit('change', 'background'))
    expect(bars.setImmersive).not.toHaveBeenCalled()
    act(() => appState.emit('change', 'active'))
    expect(bars.setImmersive).toHaveBeenLastCalledWith(true)
    act(() => appState.emit('focus'))
    expect(bars.setImmersive).toHaveBeenCalledTimes(2)

    bars.toggle()
    bars.setImmersive.mockClear()
    act(() => appState.emit('change', 'active'))
    expect(bars.setImmersive).not.toHaveBeenCalled()
  })

  it('hides them in focus mode and brings them back when it ends', () => {
    const bars = mount()

    bars.toggle()
    expect(bars.setImmersive).toHaveBeenLastCalledWith(true)

    bars.toggle()
    expect(bars.setImmersive).toHaveBeenLastCalledWith(false)
  })

  it('brings them back when the pad goes away, since focus mode only counts with one', () => {
    const bars = mount()
    bars.toggle()

    bars.disconnect()

    expect(bars.setImmersive).toHaveBeenLastCalledWith(false)
  })

  it('brings them back when the screen goes', () => {
    const bars = mount()
    bars.toggle()

    act(() => renderer?.unmount())
    renderer = null

    expect(bars.setImmersive).toHaveBeenLastCalledWith(false)
  })
})
