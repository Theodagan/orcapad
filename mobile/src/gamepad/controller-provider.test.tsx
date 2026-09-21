import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerIntent } from './controller-input/controller-intent'
import type { ControllerReader } from './controller-input/controller-reader'
import { neutralSample, type ControllerSample } from './controller-input/controller-sample'
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
      renderer = create(createElement(ControllerProvider, { children: createElement(Probe) }))
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
    const target: FocusTarget = { id: 'session', accepts: new Set(['stop']), handle }
    const stop: ControllerIntent = { kind: 'stop' }

    act(() => {
      renderer = create(
        createElement(ControllerProvider, {
          reader,
          resolve: () => [stop],
          children: createElement(Surface, { target })
        })
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })

    expect(handle).toHaveBeenCalledWith(stop)
  })

  it('tracks connection from the reader rather than assuming it', () => {
    const { reader, publish } = fakeReader()
    let connected: boolean | null = null
    function Probe(): ReactNode {
      connected = useController().connected
      return null
    }

    act(() => {
      renderer = create(
        createElement(ControllerProvider, { reader, children: createElement(Probe) })
      )
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
      renderer = create(createElement(ControllerProvider, { reader, children: null }))
    })
    act(() => {
      renderer?.unmount()
    })
    renderer = null

    expect(unsubscribed()).toBe(1)
  })

  it('mounts the wheel overlay above the app and out of its touch path', () => {
    act(() => {
      renderer = create(
        createElement(ControllerProvider, {
          children: createElement('Text' as never, { key: 'app' }, 'app'),
          wheelOverlay: createElement('Text' as never, { key: 'wheel' }, 'wheel')
        })
      )
    })

    const overlay = renderer?.root.findAll(
      (node) => node.type === 'View' && node.props.pointerEvents === 'none'
    )
    expect(overlay).toHaveLength(1)
    expect(overlay?.[0].findByType('Text' as never).children).toEqual(['wheel'])
  })

  it('mounts no overlay layer until a wheel is supplied', () => {
    act(() => {
      renderer = create(createElement(ControllerProvider, { children: null }))
    })

    expect(renderer?.root.findAll((node) => node.props?.pointerEvents === 'none')).toHaveLength(0)
  })
})
