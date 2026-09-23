import { createElement, useMemo, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider } from '../controller-provider'
import { useControllerFocus } from './use-controller-focus'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

type Listener = (sample: ControllerSample) => void

function fakeReader(): { reader: ControllerReader; publish: Listener } {
  const listeners = new Set<Listener>()
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

function Surface({
  id,
  handle
}: {
  readonly id: string
  readonly handle: (intent: ControllerIntent) => void
}): ReactNode {
  const target = useMemo(
    () => ({ id, accepts: new Set<ControllerIntent['kind']>(['confirm']), handle }),
    [id, handle]
  )
  useControllerFocus(target)
  return null
}

describe('useControllerFocus', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  it('routes a controller intent to the mounted surface', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    const confirm: ControllerIntent = { kind: 'confirm' }

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve: () => [confirm] },
          createElement(Surface, { id: 'sessions', handle })
        )
      )
    })
    act(() => {
      publish(neutralSample(1, true))
    })

    expect(handle).toHaveBeenCalledWith(confirm)
  })

  it('stops receiving once the surface unmounts, leaving nothing focused', () => {
    const { reader, publish } = fakeReader()
    const handle = vi.fn()
    // Stable identity: the provider re-subscribes when `resolve` changes, and a fresh arrow per
    // render would tear the subscription down mid-test.
    const resolve = () => [{ kind: 'confirm' } as const]

    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          { reader, resolve },
          createElement(Surface, { id: 'sessions', handle })
        )
      )
    })
    // Re-render the same tree without the surface, which is what a route change does.
    act(() => {
      renderer?.update(createElement(ControllerProvider, { reader, resolve }))
    })
    act(() => {
      publish(neutralSample(2, true))
    })

    expect(handle).not.toHaveBeenCalled()
  })

  it('registers nothing when a surface has no controller edge yet', () => {
    function Untargeted(): ReactNode {
      useControllerFocus(null)
      return null
    }

    expect(() => {
      act(() => {
        renderer = create(
          createElement(
            ControllerProvider,
            { reader: fakeReader().reader },
            createElement(Untargeted)
          )
        )
      })
    }).not.toThrow()
  })
})
