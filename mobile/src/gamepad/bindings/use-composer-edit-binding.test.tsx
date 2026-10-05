import { createElement, type ReactNode } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControllerProvider, useControllerBinding } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import {
  useComposerEditBinding,
  type ComposerEditBindingOptions
} from './use-composer-edit-binding'
import { useSurfaceBinding } from './use-surface-binding'
import { FOCUS_PRIORITY } from '../focus/focus-zones'
import { focusTargetFor } from './surface-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

function Harness({ options }: { readonly options: ComposerEditBindingOptions }): ReactNode {
  useComposerEditBinding(options)
  return null
}

/** What the transcript's own D-pad scroll does when nothing above it takes the intent. */
function Transcript({ onScroll }: { readonly onScroll: () => void }): ReactNode {
  useSurfaceBinding({
    focusTarget: {
      ...focusTargetFor('agent:transcript', [['move-selection', onScroll]]),
      zone: 'agent',
      priority: FOCUS_PRIORITY.surface
    },
    wheelActions: []
  })
  return null
}

const move = (direction: 'up' | 'down'): ControllerIntent => ({ kind: 'move-selection', direction })

describe('editing a draft with the pad', () => {
  let renderer: ReactTestRenderer | null = null
  let dispatch: (intent: ControllerIntent) => boolean = () => false

  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  function Probe(): ReactNode {
    dispatch = useControllerBinding().dispatchIntent
    return null
  }

  function mount(options: Partial<ComposerEditBindingOptions>, onScroll = vi.fn()) {
    const full: ComposerEditBindingOptions = {
      composerKey: 'c1',
      active: true,
      onMoveHorizontal: vi.fn(),
      onMoveVertical: vi.fn(),
      onDeleteWord: vi.fn(() => true),
      ...options
    }
    act(() => {
      renderer = create(
        createElement(
          ControllerProvider,
          null,
          createElement(Probe),
          createElement(Transcript, { onScroll }),
          createElement(Harness, { options: full })
        )
      )
    })
    return { full, onScroll }
  }

  it('moves the caret with the D-pad, ahead of the transcript scrolling', () => {
    const { full, onScroll } = mount({})

    act(() => void dispatch({ kind: 'move-horizontal', direction: 'left' }))
    act(() => void dispatch(move('up')))

    expect(full.onMoveHorizontal).toHaveBeenCalledWith('left')
    expect(full.onMoveVertical).toHaveBeenCalledWith('up')
    expect(onScroll).not.toHaveBeenCalled()
  })

  it('deletes a word on B', () => {
    const { full } = mount({})

    expect(dispatch({ kind: 'back' })).toBe(true)
    expect(full.onDeleteWord).toHaveBeenCalledTimes(1)
  })

  it('lets B fall through when there is no word to delete', () => {
    const { full } = mount({ onDeleteWord: vi.fn(() => false) })

    expect(dispatch({ kind: 'back' })).toBe(false)
    expect(full.onDeleteWord).toHaveBeenCalledTimes(1)
  })

  it('leaves the D-pad to the transcript while there is no draft to edit', () => {
    const { full, onScroll } = mount({ active: false })

    act(() => void dispatch(move('down')))

    expect(onScroll).toHaveBeenCalledTimes(1)
    expect(full.onMoveVertical).not.toHaveBeenCalled()
  })
})
