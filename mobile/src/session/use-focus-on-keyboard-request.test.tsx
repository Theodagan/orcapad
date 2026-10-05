import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFocusOnKeyboardRequest } from './use-focus-on-keyboard-request'

describe('focusing the field when the keyboard is asked for', () => {
  let renderer: ReactTestRenderer | null = null
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
    vi.useRealTimers()
  })

  function mount(requested: boolean, focus: () => void) {
    function Field({ on, run }: { readonly on: boolean; readonly run: () => void }): ReactNode {
      useFocusOnKeyboardRequest(on, run)
      return null
    }
    act(() => {
      renderer = create(createElement(Field, { on: requested, run: focus }))
    })
    return (on: boolean, run: () => void) =>
      act(() => renderer?.update(createElement(Field, { on, run })))
  }

  it('waits a beat for the bar to be laid out, then focuses once', () => {
    const focus = vi.fn()
    mount(true, focus)

    expect(focus).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(200))

    expect(focus).toHaveBeenCalledTimes(1)
  })

  it('does nothing without a request, or when the request goes before the beat is up', () => {
    const focus = vi.fn()
    const update = mount(false, focus)
    act(() => vi.advanceTimersByTime(500))
    expect(focus).not.toHaveBeenCalled()

    update(true, focus)
    update(false, focus)
    act(() => vi.advanceTimersByTime(500))
    expect(focus).not.toHaveBeenCalled()
  })

  it('does not ask again when only what focus does has changed', () => {
    const first = vi.fn()
    const second = vi.fn()
    const update = mount(true, first)

    update(true, second)
    act(() => vi.advanceTimersByTime(200))

    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
})
