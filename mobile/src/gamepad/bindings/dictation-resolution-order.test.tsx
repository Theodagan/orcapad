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
 * `001` §7 step 2, driven the way a real press arrives. `R3` sits above the focused surface, so
 * these assertions are about ordering rather than about any one surface's handler.
 */

function mount(options: {
  readonly activity: DictationActivity
  /** Whether the focused surface can receive dictated text. */
  readonly withTextTarget: boolean
  /** Stands in for an open wheel, which is step 1. */
  readonly intercept?: (intent: ControllerIntent) => boolean
}) {
  const activeDictation = createActiveDictationRegistry()
  const toggle = vi.fn()
  const surfaceSawToggle = vi.fn()
  const onTranscript = vi.fn()

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
    useDictationBinding({ activity: options.activity, toggle })
    useControllerFocus(
      focusTargetFor(
        'surface',
        [['toggle-dictation', surfaceSawToggle]],
        options.withTextTarget ? { onTranscript } : undefined
      )
    )
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
    surfaceSawToggle
  }
}

describe('R3 in the resolution order', () => {
  it('stops a live microphone even where nothing can receive text', () => {
    const shell = mount({ activity: 'recording', withTextTarget: false })

    shell.press()

    expect(shell.toggle).toHaveBeenCalledTimes(1)
    // Step 2 took it, so the focused surface never sees it.
    expect(shell.surfaceSawToggle).not.toHaveBeenCalled()
  })

  it('starts when the focused surface can take the words', () => {
    const shell = mount({ activity: 'idle', withTextTarget: true })

    shell.press()

    expect(shell.toggle).toHaveBeenCalledTimes(1)
  })

  // A microphone with nowhere to put the transcript is one left running for nothing. R3 then
  // falls through, and the surface may do what it likes with it.
  it('does not start where there is no text target, and lets the surface have it', () => {
    const shell = mount({ activity: 'idle', withTextTarget: false })

    shell.press()

    expect(shell.toggle).not.toHaveBeenCalled()
    expect(shell.surfaceSawToggle).toHaveBeenCalledTimes(1)
  })

  // `001` §7: "Whether R3 starts dictation while a wheel is open is measured as a wheel
  // experiment and must not affect its ability to stop an active microphone."
  it('still stops a microphone when step 1 declines the intent', () => {
    const shell = mount({
      activity: 'recording',
      withTextTarget: false,
      // An open wheel that takes stick motion and A, but has no meaning for R3.
      intercept: (intent) => intent.kind !== 'toggle-dictation'
    })

    shell.press()

    expect(shell.toggle).toHaveBeenCalledTimes(1)
  })

  it('yields to step 1 when the wheel claims the press', () => {
    const shell = mount({
      activity: 'recording',
      withTextTarget: false,
      intercept: () => true
    })

    shell.press()

    expect(shell.toggle).not.toHaveBeenCalled()
    expect(shell.surfaceSawToggle).not.toHaveBeenCalled()
  })
})
