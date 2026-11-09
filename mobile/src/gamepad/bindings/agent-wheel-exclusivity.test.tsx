import { createElement, type ReactNode } from 'react'
import { act, create } from 'react-test-renderer'
import { describe, expect, it, vi } from 'vitest'
import { ControllerProvider } from '../controller-provider'
import type { ControllerIntent } from '../controller-input/controller-intent'
import type { ControllerReader } from '../controller-input/controller-reader'
import { neutralSample, type ControllerSample } from '../controller-input/controller-sample'
import { loadPreset } from '../wheel/wheel-preset'
import { createWheelRegistry } from '../wheel/wheel-registry'
import { useWheelController } from '../wheel/use-wheel-controller'
import { useAgentControllerBinding } from './use-agent-controller-binding'

vi.mock('react-native', () => ({
  StyleSheet: { create: <T,>(styles: T) => styles, absoluteFill: {} },
  View: 'View'
}))

/**
 * `003` §5 rule 3: while an intervention is focused, neither `A` nor `B` also commits a wheel
 * action. One press does one thing.
 *
 * The exclusivity is structural rather than a rule anyone enforces — the provider consults the
 * wheel first and stops when it takes the intent (`001` §7 step 1) — so this is the test that
 * the structure actually holds once a real binding is underneath it.
 */

const preset = loadPreset({
  presetId: 'exclusivity',
  label: 'Exclusivity',
  wheel: 1,
  contractual: false,
  trial: {
    trialId: 'exclusivity',
    targetDevice: 'test',
    controller: 'test',
    destructivePolicy: 'excludes-destructive',
    notes: 'Fixture.'
  },
  segments: [{ id: 'only', label: 'Only', centerAngle: 0, halfWidth: 3.2, bindingId: 'wheel.only' }]
})

function mount() {
  const registry = createWheelRegistry()
  const wheelRan = vi.fn()
  registry.register({
    id: 'wheel.only',
    label: 'Only',
    availability: 'available',
    run: wheelRan
  })
  const onRespondPermission = vi.fn()
  const onCancelPrompt = vi.fn()

  // Driven through the reader, not through `dispatchIntent`: the context's dispatch goes straight
  // to the focus registry, so it would skip the very interception this test exists to check.
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

  function Shell({ children }: { readonly children: ReactNode }): ReactNode {
    const wheel = useWheelController({ presets: { 1: preset }, registry, deadZone: 0.15 })
    return createElement(
      ControllerProvider,
      {
        reader,
        resolve: () => queued,
        intercept: wheel.intercept,
        registerWheelAction: registry.register
      },
      children
    )
  }

  function Agent(): ReactNode {
    useAgentControllerBinding({
      sessionId: 'wt-1',
      canStop: false,
      scrollTo: vi.fn(),
      onDetachFromTail: vi.fn(),
      permission: { options: [{ send: '1' }, { send: 'n' }] },
      onRespondPermission,
      onCancelPrompt
    })
    return null
  }

  act(() => {
    create(createElement(Shell, {}, createElement(Agent)))
  })

  return {
    /** Publishes one sample carrying this intent, which is the path production takes. */
    dispatch: (intent: ControllerIntent) => {
      queued = [intent]
      act(() => {
        for (const listener of listeners) {
          listener({ ...neutralSample(0), connected: true })
        }
      })
      queued = []
    },
    wheelRan,
    onRespondPermission,
    onCancelPrompt
  }
}

describe('a prompt and a wheel cannot both take one press', () => {
  it('answers the prompt when no wheel is open', () => {
    const shell = mount()

    shell.dispatch({ kind: 'confirm' })

    expect(shell.onRespondPermission).toHaveBeenCalledWith('1')
    expect(shell.wheelRan).not.toHaveBeenCalled()
  })

  it('commits the wheel and leaves the prompt alone when one is open', () => {
    const shell = mount()

    shell.dispatch({ kind: 'wheel-motion', wheel: 1, x: 0, y: -1 })
    shell.dispatch({ kind: 'confirm' })

    expect(shell.wheelRan).toHaveBeenCalledTimes(1)
    expect(shell.onRespondPermission).not.toHaveBeenCalled()
  })

  it('cancels the wheel with B without also dismissing the prompt', () => {
    const shell = mount()

    shell.dispatch({ kind: 'wheel-motion', wheel: 1, x: 0, y: -1 })
    shell.dispatch({ kind: 'back' })

    expect(shell.onCancelPrompt).not.toHaveBeenCalled()
    expect(shell.wheelRan).not.toHaveBeenCalled()

    // And once the wheel is closed, B reaches the prompt again.
    shell.dispatch({ kind: 'back' })
    expect(shell.onCancelPrompt).toHaveBeenCalledTimes(1)
  })
})
