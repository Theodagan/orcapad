import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider, useControllerBinding } from '../controller-provider'
import { useSessionChrome, type SessionChrome } from './use-session-chrome'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

function fakeReader(): { reader: ControllerReader; publish: (s: ControllerSample) => void } {
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

describe('useSessionChrome', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount() {
    const { reader, publish } = fakeReader()
    const chromeRef: { current: SessionChrome | null } = { current: null }
    const resetRef: { current: (() => void) | null } = { current: null }

    function Harness(): ReactNode {
      chromeRef.current = useSessionChrome()
      const { sessionChrome } = useControllerBinding()
      resetRef.current = sessionChrome.reset
      return null
    }

    act(() => {
      renderer = create(createElement(ControllerProvider, { reader }, createElement(Harness)))
    })

    return {
      get chrome() {
        if (!chromeRef.current) {
          throw new Error('Harness not mounted')
        }
        return chromeRef.current
      },
      reset: () => resetRef.current?.(),
      connect: (connected: boolean) => act(() => publish(neutralSample(1, connected)))
    }
  }

  it('reports false for both flags when no pad is attached, even if toggled', () => {
    const harness = mount()
    expect(harness.chrome.focusMode).toBe(false)
    expect(harness.chrome.shortcutsHidden).toBe(false)

    act(() => harness.chrome.toggleFocusMode())
    act(() => harness.chrome.toggleShortcuts())

    // Without a pad attached, effective values remain false (BIND-AC10)
    expect(harness.chrome.focusMode).toBe(false)
    expect(harness.chrome.shortcutsHidden).toBe(false)
  })

  it('reflects toggles when pad is connected', () => {
    const harness = mount()
    harness.connect(true)

    expect(harness.chrome.focusMode).toBe(false)
    expect(harness.chrome.shortcutsHidden).toBe(false)

    act(() => harness.chrome.toggleFocusMode())
    expect(harness.chrome.focusMode).toBe(true)
    expect(harness.chrome.shortcutsHidden).toBe(false)

    act(() => harness.chrome.toggleShortcuts())
    expect(harness.chrome.focusMode).toBe(true)
    expect(harness.chrome.shortcutsHidden).toBe(true)
  })

  it('hides both flags immediately when pad disconnects', () => {
    const harness = mount()
    harness.connect(true)

    act(() => harness.chrome.toggleFocusMode())
    act(() => harness.chrome.toggleShortcuts())
    expect(harness.chrome.focusMode).toBe(true)
    expect(harness.chrome.shortcutsHidden).toBe(true)

    harness.connect(false)
    expect(harness.chrome.focusMode).toBe(false)
    expect(harness.chrome.shortcutsHidden).toBe(false)
  })

  it('restores flags when reset is called', () => {
    const harness = mount()
    harness.connect(true)

    act(() => harness.chrome.toggleFocusMode())
    act(() => harness.chrome.toggleShortcuts())
    expect(harness.chrome.focusMode).toBe(true)
    expect(harness.chrome.shortcutsHidden).toBe(true)

    act(() => harness.reset())
    expect(harness.chrome.focusMode).toBe(false)
    expect(harness.chrome.shortcutsHidden).toBe(false)
  })
})
