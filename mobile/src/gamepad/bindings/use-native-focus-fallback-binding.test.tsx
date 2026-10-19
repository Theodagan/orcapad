import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { createControllerIntentResolver } from '../controller-input/controller-resolver'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider } from '../controller-provider'
import { useControllerFocus } from '../focus/use-controller-focus'
import { useNativeFocusFallbackBinding } from './use-native-focus-fallback-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {}, hairlineWidth: 1 },
  Text: 'Text',
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

const fallback = { move: vi.fn(), activate: vi.fn(), scroll: vi.fn() }

function Fallback(): null {
  useNativeFocusFallbackBinding(fallback)
  return null
}

const ownListScrolled = vi.fn()

function ScrollingList(): ReactNode {
  // In a zone without focus, so the fallback is asked first and must give way.
  useControllerFocus({
    id: 'own-list',
    zone: 'header',
    accepts: new Set(['scroll']),
    handle: ownListScrolled
  })
  return null
}

function ZonedList(): ReactNode {
  useControllerFocus({ id: 'list', zone: 'list', accepts: new Set(['back']), handle: () => {} })
  return null
}

describe('useNativeFocusFallbackBinding', () => {
  let renderer: ReactTestRenderer | null = null
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    fallback.move.mockClear()
    fallback.activate.mockClear()
    fallback.scroll.mockClear()
  })

  function pull(children: ReactNode[], axis: 'l2' | 'r2') {
    const { reader, publish } = fakeReader()
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: createControllerIntentResolver() },
          ...children
        )
      )
    })
    act(() => publish(neutralSample(1, true)))
    act(() => publish({ ...neutralSample(20, true), axes: new Map([[axis, 1]]) }))
  }

  function press(children: ReactNode[], buttons: [string, number][]) {
    const { reader, publish } = fakeReader()
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: createControllerIntentResolver() },
          ...children
        )
      )
    })
    act(() => publish(neutralSample(1, true)))
    act(() => publish({ ...neutralSample(2, true), buttons: new Map(buttons) }))
  }

  it('moves and presses Android focus on a screen with no pad zones', () => {
    press([createElement(Fallback)], [['dpad-down', 1]])
    expect(fallback.move).toHaveBeenCalledWith('down')

    act(() => renderer?.unmount())
    press([createElement(Fallback)], [['a', 1]])
    expect(fallback.activate).toHaveBeenCalledTimes(1)
  })

  it('stands down where the screen owns a zoned cursor', () => {
    press([createElement(Fallback), createElement(ZonedList)], [['dpad-down', 1]])
    expect(fallback.move).not.toHaveBeenCalled()

    act(() => renderer?.unmount())
    press([createElement(Fallback), createElement(ZonedList)], [['a', 1]])
    expect(fallback.activate).not.toHaveBeenCalled()
  })

  it('scrolls natively on a screen nothing else scrolls, zoned or not', () => {
    pull([createElement(Fallback), createElement(ZonedList)], 'r2')
    expect(fallback.scroll).toHaveBeenCalled()
    expect(fallback.scroll.mock.calls[0]?.[0]).toBeGreaterThan(0)

    act(() => renderer?.unmount())
    fallback.scroll.mockClear()
    pull([createElement(Fallback)], 'l2')
    expect(fallback.scroll.mock.calls[0]?.[0]).toBeLessThan(0)
  })

  it('leaves L2/R2 to a list that scrolls itself', () => {
    pull([createElement(Fallback), createElement(ZonedList), createElement(ScrollingList)], 'r2')
    expect(fallback.scroll).not.toHaveBeenCalled()
    expect(ownListScrolled).toHaveBeenCalled()
  })
})
