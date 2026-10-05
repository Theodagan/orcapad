import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerIntent } from './controller-input/controller-intent'
import type { ControllerReader } from './controller-input/controller-reader'
import { neutralSample, type ControllerSample } from './controller-input/controller-sample'
import { createActiveDictationRegistry } from './bindings/active-dictation'
import { ControllerProvider, useController } from './controller-provider'
import type { FocusTarget } from './focus/focus-target'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Listener = (sample: ControllerSample) => void

/** A reader whose samples the test publishes by hand. */
function fakeReader(): { reader: ControllerReader; publish: Listener; unsubscribed: () => number } {
  const listeners = new Set<Listener>()
  let unsubscribeCount = 0
  return {
    reader: {
      support: () => 'available',
      current: () => neutralSample(0),
      subscribe: (listener) => {
        listeners.add(listener)
        return () => {
          unsubscribeCount += 1
          listeners.delete(listener)
        }
      }
    },
    publish: (sample) => {
      for (const listener of listeners) {
        listener(sample)
      }
    },
    unsubscribed: () => unsubscribeCount
  }
}

function Surface({ target }: { readonly target: FocusTarget }): ReactNode {
  const { registerFocusTarget } = useController()
  registerFocusTarget(target)
  return null
}

/** Identity-only markers, so a tree assertion names a component instead of a host string. */
function AppContent(): ReactNode {
  return null
}

function WheelContent(): ReactNode {
  return null
}

describe('ControllerProvider', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  it('is inert but mounted when no native reader exists', () => {
    let seen: { support: string; connected: boolean } | null = null
    function Probe(): ReactNode {
      const { support, connected } = useController()
      seen = { support, connected }
      return null
    }

    act(() => {
      renderer = create(createElement(ControllerProvider, null, createElement(Probe)))
    })

    expect(seen).toEqual({ support: 'unavailable', connected: false })
  })

  it('refuses to answer outside a provider', () => {
    function Orphan(): ReactNode {
      useController()
      return null
    }

    expect(() => {
      act(() => {
        create(createElement(Orphan))
      })
    }).toThrow('useController requires a ControllerProvider above it.')
  })

  it('routes a resolved intent to the registered surface', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    const target: FocusTarget = { id: 'session', accepts: new Set(['confirm']), handle }
    const confirm: ControllerIntent = { kind: 'confirm' }

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: () => [confirm] },
          createElement(Surface, { target })
        )
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })

    expect(handle).toHaveBeenCalledWith(confirm)
  })

  it('tracks connection from the reader rather than assuming it', () => {
    const { reader, publish } = fakeReader()
    let connected: boolean | null = null
    function Probe(): ReactNode {
      connected = useController().connected
      return null
    }

    act(() => {
      renderer = create(createElement(ControllerProvider, { reader }, createElement(Probe)))
    })
    expect(connected).toBe(false)

    act(() => {
      publish(neutralSample(1, true))
    })
    expect(connected).toBe(true)
  })

  it('releases the reader on unmount', () => {
    const { reader, unsubscribed } = fakeReader()

    act(() => {
      renderer = create(createElement(ControllerProvider, { reader }))
    })
    act(() => {
      renderer?.unmount()
    })
    renderer = null

    expect(unsubscribed()).toBe(1)
  })

  it('mounts the wheel overlay above the app, passing touches through while it is closed', () => {
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { wheelOverlay: createElement(WheelContent) },
          createElement(AppContent)
        )
      )
    })

    // box-none: the layer itself takes no touch, but an open wheel inside it can claim them.
    const layers = renderer?.root.findAll(
      (node) => node.type === 'View' && node.props.pointerEvents === 'box-none'
    )
    expect(layers).toHaveLength(1)
    expect(layers?.[0].findAllByType(WheelContent)).toHaveLength(1)
    expect(layers?.[0].findAllByType(AppContent)).toHaveLength(0)
  })

  it('mounts no overlay layer until a wheel is supplied', () => {
    act(() => {
      renderer = create(createElement(ControllerProvider, null, createElement(AppContent)))
    })

    expect(renderer?.root.findAll((node) => node.props?.pointerEvents === 'box-none')).toHaveLength(
      0
    )
  })

  it('tells the resolver whether a wheel owns the pad, sample by sample', () => {
    const { reader, publish } = fakeReader()
    const resolve = vi.fn(() => [])
    let captured = false

    act(() => {
      renderer = create(
        createElement(ControllerProvider, { reader, resolve, captured: () => captured })
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })
    captured = true
    act(() => {
      publish(neutralSample(2, true))
    })

    expect(resolve.mock.calls.map(([, context]) => context)).toEqual([
      { captured: false },
      { captured: true }
    ])
  })

  it('lets the wheel take every intent, so nothing reaches the surface beneath', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    const target: FocusTarget = { id: 'session', accepts: new Set(['confirm']), handle }

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: () => [{ kind: 'confirm' }], intercept: () => true },
          createElement(Surface, { target })
        )
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })

    expect(handle).not.toHaveBeenCalled()
  })

  it('answers a toggle from the registered dictation when the session says it can start', () => {
    const { reader, publish } = fakeReader()
    const toggle = vi.fn()
    const onUnavailable = vi.fn()
    const dictation = createActiveDictationRegistry()
    dictation.register({ activity: 'idle', toggle, canStart: true, onUnavailable })
    // Nothing focused accepts dictation: it is the session's, so no surface is asked.
    const surface: FocusTarget = {
      id: 'agent',
      zone: 'agent',
      accepts: new Set(['confirm']),
      handle: vi.fn()
    }

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: () => [{ kind: 'toggle-dictation' }], activeDictation: dictation },
          createElement(Surface, { target: surface })
        )
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })

    expect(toggle).toHaveBeenCalledTimes(1)
    expect(onUnavailable).not.toHaveBeenCalled()
  })

  it('refuses a start with nowhere for the words, out loud, but never refuses a stop', () => {
    const { reader, publish } = fakeReader()
    const toggle = vi.fn()
    const onUnavailable = vi.fn()
    const dictation = createActiveDictationRegistry()
    const unregister = dictation.register({
      activity: 'idle',
      toggle,
      canStart: false,
      onUnavailable
    })

    act(() => {
      renderer = create(
        createElement(ControllerProvider, {
          reader,
          resolve: () => [{ kind: 'toggle-dictation' }],
          activeDictation: dictation
        })
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })
    expect(toggle).not.toHaveBeenCalled()
    expect(onUnavailable).toHaveBeenCalledTimes(1)

    unregister()
    dictation.register({ activity: 'recording', toggle, canStart: false, onUnavailable })
    act(() => {
      publish(neutralSample(2, true))
    })
    expect(toggle).toHaveBeenCalledTimes(1)
    expect(onUnavailable).toHaveBeenCalledTimes(1)
  })
})
