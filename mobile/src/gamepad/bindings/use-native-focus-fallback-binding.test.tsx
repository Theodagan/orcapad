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

const fallback = { move: vi.fn(), activate: vi.fn() }

function Fallback(): null {
  useNativeFocusFallbackBinding(fallback)
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
  })

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
})
