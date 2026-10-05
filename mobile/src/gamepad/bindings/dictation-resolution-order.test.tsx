import { createElement, type ReactNode } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { useControllerFocus } from '../focus/use-controller-focus'
import { focusTargetFor } from './surface-binding'
import { createActiveDictationRegistry, type DictationActivity } from './active-dictation'
import { useDictationBinding } from './use-dictation-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

/**
 * `001` §7 step 2, driven the way a real press arrives. Dictation sits above the focused surface, so
 * these assertions are about ordering rather than about any one surface's handler.
 */

function mount(options: {
  readonly activity: DictationActivity
  /** Whether the session says a start has somewhere to put the words. */
  readonly canStart: boolean
  /** Stands in for an open wheel, which is step 1. */
  readonly intercept?: (intent: ControllerIntent) => boolean
}) {
  const activeDictation = createActiveDictationRegistry()
  const toggle = vi.fn()
  const surfaceSawToggle = vi.fn()
  const onUnavailable = vi.fn()

  const listeners = new Set<(sample: ControllerSample) => void>()
  let queued: readonly ControllerIntent[] = []
  const reader: ControllerReader = {
    support: () => 'available',
    current: () => neutralSample(0),
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }

  function Surface(): ReactNode {
    useDictationBinding({
      activity: options.activity,
      toggle,
      canStart: options.canStart,
      onUnavailable
    })
    useControllerFocus(focusTargetFor('surface', [['toggle-dictation', surfaceSawToggle]]))
    return null
  }

  act(() => {
    create(
      createElement(
        ControllerProvider,
        { reader, resolve: () => queued, activeDictation, intercept: options.intercept },
        createElement(Surface)
      )
    )
  })

  return {
    press: () => {
      queued = [{ kind: 'toggle-dictation' }]
      act(() => {
        for (const listener of listeners) {
          listener({ ...neutralSample(0), connected: true })
        }
      })
      queued = []
    },
    toggle,
    onUnavailable,
    surfaceSawToggle
  }
}

describe('dictation in the resolution order', () => {
  it('stops a live microphone even where nothing can receive text', () => {
    const shell = mount({ activity: 'recording', canStart: false })

    shell.press()

    expect(shell.toggle).toHaveBeenCalledTimes(1)
    // Step 2 took it, so the focused surface never sees it.
    expect(shell.surfaceSawToggle).not.toHaveBeenCalled()
  })

  it('starts when the session says the words have somewhere to land', () => {
    const shell = mount({ activity: 'idle', canStart: true })

    shell.press()

    expect(shell.toggle).toHaveBeenCalledTimes(1)
  })

  // A microphone with nowhere to put the transcript is one left running for nothing. The press
  // is refused out loud and spent: a pad has no mic icon to look dead, and a surface that knows
  // nothing about dictation has no business answering it.
  it('does not start where the words have nowhere to land, says so, and keeps the press', () => {
    const shell = mount({ activity: 'idle', canStart: false })

    shell.press()

    expect(shell.toggle).not.toHaveBeenCalled()
    expect(shell.onUnavailable).toHaveBeenCalledTimes(1)
    expect(shell.surfaceSawToggle).not.toHaveBeenCalled()
  })

  // `001` §7 once let a microphone be stopped while a wheel was open. `005` USE-R11 changed that:
  // an open wheel takes every input. These two pin the order as it now is.
  it('still stops a microphone when step 1 declines the intent', () => {
    const shell = mount({
      activity: 'recording',
      canStart: false,
      // An open wheel that takes stick motion and A, but has no meaning for dictation.
      intercept: (intent) => intent.kind !== 'toggle-dictation'
    })

    shell.press()

    expect(shell.toggle).toHaveBeenCalledTimes(1)
  })

  it('yields to step 1 when the wheel claims the press', () => {
    const shell = mount({
      activity: 'recording',
      canStart: false,
      intercept: () => true
    })

    shell.press()

    expect(shell.toggle).not.toHaveBeenCalled()
    expect(shell.surfaceSawToggle).not.toHaveBeenCalled()
  })
})
