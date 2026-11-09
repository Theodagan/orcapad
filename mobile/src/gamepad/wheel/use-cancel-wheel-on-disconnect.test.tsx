import { createElement } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { useCancelWheelOnDisconnect } from './use-cancel-wheel-on-disconnect'

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

function mount() {
  const { reader, publish } = fakeReader()
  const cancel = vi.fn()
  function Shell() {
    useCancelWheelOnDisconnect(reader, cancel)
    return null
  }
  let renderer: ReturnType<typeof create> | null = null
  act(() => {
    renderer = create(createElement(Shell))
  })
  return {
    cancel,
    publish: (connected: boolean) => act(() => publish({ ...neutralSample(0), connected })),
    unmount: () => act(() => renderer?.unmount())
  }
}

describe('cancelling an open wheel when the pad goes away', () => {
  it('cancels when the reader reports the pad gone', () => {
    const shell = mount()

    shell.publish(false)

    expect(shell.cancel).toHaveBeenCalledTimes(1)
  })

  it('leaves a connected pad alone', () => {
    const shell = mount()

    shell.publish(true)

    expect(shell.cancel).not.toHaveBeenCalled()
  })

  it('stops listening when the shell goes', () => {
    const shell = mount()
    shell.unmount()

    shell.publish(false)

    expect(shell.cancel).not.toHaveBeenCalled()
  })
})
