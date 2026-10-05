import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider } from '../controller-provider'
import { useModalNativeFocus } from './modal-native-focus'

vi.mock('react-native', () => ({
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

describe('a sheet taking the pad when it opens', () => {
  let renderer: ReactTestRenderer | null = null
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    vi.useRealTimers()
  })

  function mount(active: boolean, padAttached: boolean) {
    const requestNativeFocus = vi.fn()
    const { reader, publish } = fakeReader()
    function Sheet({ on }: { readonly on: boolean }): ReactNode {
      const ref = useModalNativeFocus(on)
      return createElement('View', { ref })
    }
    const tree = (on: boolean) =>
      createElement(
        ControllerProvider,
        { reader, requestNativeFocus },
        createElement(Sheet, { on })
      )
    act(() => {
      renderer = create(tree(active))
    })
    if (padAttached) {
      act(() => publish(neutralSample(1, true)))
    }
    return { requestNativeFocus, rerender: (on: boolean) => act(() => renderer?.update(tree(on))) }
  }

  it('asks Android to focus the sheet once it has had a moment to appear', () => {
    const sheet = mount(true, true)

    expect(sheet.requestNativeFocus).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(200))

    expect(sheet.requestNativeFocus).toHaveBeenCalledTimes(1)
    // Into the sheet, not onto its container.
    expect(sheet.requestNativeFocus.mock.calls[0]?.[1]).toBe(true)
  })

  it('does nothing without a pad attached', () => {
    const sheet = mount(true, false)

    act(() => vi.advanceTimersByTime(500))

    expect(sheet.requestNativeFocus).not.toHaveBeenCalled()
  })

  it('does nothing for a sheet that is not showing, and never after it has closed', () => {
    const sheet = mount(false, true)
    act(() => vi.advanceTimersByTime(500))
    expect(sheet.requestNativeFocus).not.toHaveBeenCalled()

    sheet.rerender(true)
    sheet.rerender(false)
    act(() => vi.advanceTimersByTime(500))
    expect(sheet.requestNativeFocus).not.toHaveBeenCalled()
  })
})
