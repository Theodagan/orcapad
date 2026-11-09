import { createElement, type ReactNode } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider } from '../controller-provider'
import { useNativeFocus } from './native-focus'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

function mount(initialActive: boolean, withRuntime = true) {
  const requestNativeFocus = vi.fn()
  const node = { name: 'the pressable' }
  let setActive: (active: boolean) => void = () => {}

  function Cursor({ active }: { active: boolean }): ReactNode {
    return createElement('View', { ref: useNativeFocus(active) })
  }

  let renderer: ReturnType<typeof create> | null = null
  const render = (active: boolean) =>
    createElement(
      ControllerProvider,
      withRuntime ? { requestNativeFocus } : {},
      createElement(Cursor, { active })
    )
  act(() => {
    renderer = create(render(initialActive), { createNodeMock: () => node })
  })
  setActive = (active) =>
    act(() => {
      renderer?.update(render(active))
    })
  return { requestNativeFocus, node, setActive: (active: boolean) => setActive(active) }
}

describe('following the cursor with Android focus', () => {
  it('asks for native focus on the element when the cursor lands on it', () => {
    const cursor = mount(false)
    expect(cursor.requestNativeFocus).not.toHaveBeenCalled()

    cursor.setActive(true)

    expect(cursor.requestNativeFocus).toHaveBeenCalledExactlyOnceWith(cursor.node)
  })

  it('does not ask again while the cursor stays, nor when it leaves', () => {
    const cursor = mount(true)
    expect(cursor.requestNativeFocus).toHaveBeenCalledTimes(1)

    cursor.setActive(true)
    cursor.setActive(false)

    expect(cursor.requestNativeFocus).toHaveBeenCalledTimes(1)
  })

  it('asks again each time the cursor comes back', () => {
    const cursor = mount(true)

    cursor.setActive(false)
    cursor.setActive(true)

    expect(cursor.requestNativeFocus).toHaveBeenCalledTimes(2)
  })

  it('does nothing without a runtime to ask', () => {
    expect(() => mount(true, false)).not.toThrow()
  })
})
