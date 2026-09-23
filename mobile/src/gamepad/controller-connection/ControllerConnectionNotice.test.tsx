import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { ControllerProvider } from '../controller-provider'
import { ControllerConnectionNotice } from './ControllerConnectionNotice'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  Text: 'Text',
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

function noticeCount(renderer: ReactTestRenderer | null): number {
  return renderer?.root.findAll((node) => node.type === 'Text').length ?? 0
}

describe('ControllerConnectionNotice', () => {
  let renderer: ReactTestRenderer | null = null

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function mount(reader: ControllerReader): ReactNode {
    return createElement(ControllerProvider, { reader }, createElement(ControllerConnectionNotice))
  }

  it('shows nothing on a phone that never had a controller', () => {
    const { reader } = fakeReader()

    act(() => {
      renderer = create(mount(reader))
    })

    expect(noticeCount(renderer)).toBe(0)
  })

  it('appears after a controller is lost and clears when it returns', () => {
    const { reader, publish } = fakeReader()

    act(() => {
      renderer = create(mount(reader))
    })
    act(() => {
      publish(neutralSample(1, true))
    })
    expect(noticeCount(renderer)).toBe(0)

    act(() => {
      publish(neutralSample(2, false))
    })
    expect(noticeCount(renderer)).toBe(1)

    act(() => {
      publish(neutralSample(3, true))
    })
    expect(noticeCount(renderer)).toBe(0)
  })

  it('never takes a touch, so every control underneath stays reachable', () => {
    const { reader, publish } = fakeReader()

    act(() => {
      renderer = create(mount(reader))
    })
    act(() => {
      publish(neutralSample(1, true))
    })
    act(() => {
      publish(neutralSample(2, false))
    })

    const blocking = renderer?.root.findAll(
      (node) => node.type === 'View' && node.props.pointerEvents !== 'none'
    )
    // The provider's own root View is the only one, and it is not part of the notice.
    expect(blocking?.some((node) => node.props.style?.position === 'absolute')).toBe(false)
  })
})
