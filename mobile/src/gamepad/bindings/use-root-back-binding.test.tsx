import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useControllerBinding } from '../controller-provider'
import { useControllerFocus } from '../focus/use-controller-focus'
import { useRootBackBinding } from './use-root-back-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

describe('B on a screen with no business for it', () => {
  let renderer: ReactTestRenderer | null = null
  let dispatch: (intent: { kind: 'back' }) => boolean = () => false
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function Root({ goBack }: { readonly goBack: () => boolean }): ReactNode {
    useRootBackBinding({ goBack })
    dispatch = useControllerBinding().dispatchIntent
    return null
  }

  function Screen({ onBack }: { readonly onBack: () => void }): ReactNode {
    useControllerFocus({ id: 'screen', accepts: new Set(['back']), handle: onBack })
    return null
  }

  function mount(goBack: () => boolean, onBack?: () => void) {
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          null,
          createElement(Root, { goBack }),
          onBack === undefined ? null : createElement(Screen, { onBack })
        )
      )
    })
  }

  it('goes back', () => {
    const goBack = vi.fn(() => true)
    mount(goBack)

    expect(dispatch({ kind: 'back' })).toBe(true)
    expect(goBack).toHaveBeenCalledTimes(1)
  })

  it('says it did nothing when there is no screen to go back to', () => {
    mount(() => false)

    expect(dispatch({ kind: 'back' })).toBe(false)
  })

  it('yields to a screen that wants B for itself', () => {
    const goBack = vi.fn(() => true)
    const onBack = vi.fn()
    mount(goBack, onBack)

    expect(dispatch({ kind: 'back' })).toBe(true)
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(goBack).not.toHaveBeenCalled()
  })
})
